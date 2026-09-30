// Every query the API makes, in one place. Routes in index.js call these functions; the tests swap
// this module for an in-memory implementation with the same interface (test/helpers/memory-store.cjs),
// or run these exact queries against a real Postgres when API_TEST_DATABASE_URL is set.

const { sql } = require('./database');

const int = v => (v === null || v === undefined ? 0 : parseInt(v, 10));

// ---------- schema ----------

async function ensureSchema() {
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            game_state TEXT,
            last_saved BIGINT DEFAULT 0
        );
    `;
    // Columns added after the first release; IF NOT EXISTS keeps boot idempotent.
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS flags TEXT DEFAULT '[]'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN DEFAULT FALSE`;
    // Leaderboard and clan numbers, computed by the server from the save when it is stored.
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS metrics TEXT`;
    await sql`
        CREATE TABLE IF NOT EXISTS clans (
            id SERIAL PRIMARY KEY,
            name VARCHAR(32) UNIQUE NOT NULL,
            tag VARCHAR(5) NOT NULL,
            description VARCHAR(200) DEFAULT '',
            looking_for VARCHAR(100) DEFAULT '',
            owner_id INTEGER NOT NULL,
            created_at BIGINT NOT NULL
        );
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS clan_members (
            user_id INTEGER PRIMARY KEY,
            clan_id INTEGER NOT NULL,
            joined_at BIGINT NOT NULL
        );
    `;
    // A member holds one of the clan's numbered places, unique per clan, so parallel joins can't
    // take a clan past its size.
    await sql`ALTER TABLE clan_members ADD COLUMN IF NOT EXISTS slot SMALLINT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS clan_members_slot ON clan_members (clan_id, slot)`;
    await sql`
        CREATE TABLE IF NOT EXISTS clan_bosses (
            clan_id INTEGER NOT NULL,
            week VARCHAR(10) NOT NULL,
            max_hp BIGINT NOT NULL,
            hp BIGINT NOT NULL,
            killed_at BIGINT DEFAULT 0,
            last_hit_user INTEGER,
            settled BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (clan_id, week)
        );
    `;
    // One row per attack; (user, day, slot) is unique, so a player gets three a day even with
    // parallel requests or by switching clans.
    await sql`
        CREATE TABLE IF NOT EXISTS clan_attacks (
            id SERIAL PRIMARY KEY,
            clan_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            week VARCHAR(10) NOT NULL,
            day VARCHAR(10) NOT NULL,
            slot SMALLINT NOT NULL,
            damage BIGINT NOT NULL,
            at BIGINT NOT NULL,
            UNIQUE (user_id, day, slot)
        );
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS rewards (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            kind VARCHAR(20) NOT NULL,
            payload TEXT NOT NULL,
            created_at BIGINT NOT NULL,
            claimed_at BIGINT DEFAULT 0
        );
    `;
    // Rewards that may be paid once per player per week (whatever clans they were in) carry a key.
    await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS dedupe VARCHAR(80)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS rewards_dedupe ON rewards (dedupe)`;
    await sql`
        CREATE TABLE IF NOT EXISTS weekly_snapshots (
            user_id INTEGER NOT NULL,
            week VARCHAR(10) NOT NULL,
            metrics TEXT NOT NULL,
            PRIMARY KEY (user_id, week)
        );
    `;
}

// ---------- users and saves ----------

async function createUser(username, hash) {
    const { rows } = await sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${hash}) RETURNING id`;
    return rows[0].id;
}

async function findUserByName(username) {
    const { rows } = await sql`SELECT id, username, password_hash FROM users WHERE username = ${username}`;
    return rows[0] || null;
}

async function getSave(userId) {
    const { rows } = await sql`SELECT game_state, last_saved, flags, leaderboard_opt_in, metrics FROM users WHERE id = ${userId}`;
    const row = rows[0];
    if (!row) return null;
    return { state: row.game_state || null, lastSaved: int(row.last_saved), flags: row.flags || '[]', optIn: !!row.leaderboard_opt_in, metrics: row.metrics || null };
}

async function putSave(userId, stateJson, savedAt, flagsJson, metricsJson) {
    await sql`UPDATE users SET game_state = ${stateJson}, last_saved = ${savedAt}, flags = ${flagsJson}, metrics = ${metricsJson} WHERE id = ${userId}`;
}

async function setOptIn(userId, optIn) {
    await sql`UPDATE users SET leaderboard_opt_in = ${!!optIn} WHERE id = ${userId}`;
}

/** Every opted-in player's stored numbers, with this week's snapshot if there is one (one query). */
async function leaderboardRows(week) {
    const { rows } = await sql`
        SELECT u.id, u.username, u.flags, u.metrics, s.metrics AS week_metrics
        FROM users u LEFT JOIN weekly_snapshots s ON s.user_id = u.id AND s.week = ${week}
        WHERE u.leaderboard_opt_in = TRUE AND u.metrics IS NOT NULL
    `;
    return rows.map(r => ({ userId: r.id, username: r.username, flags: r.flags || '[]', metrics: r.metrics, weekMetrics: r.week_metrics || null }));
}

// ---------- weekly snapshots (for "this week" boards) ----------

async function getSnapshot(userId, week) {
    const { rows } = await sql`SELECT metrics FROM weekly_snapshots WHERE user_id = ${userId} AND week = ${week}`;
    return rows[0] ? rows[0].metrics : null;
}

async function putSnapshotIfMissing(userId, week, metricsJson) {
    await sql`INSERT INTO weekly_snapshots (user_id, week, metrics) VALUES (${userId}, ${week}, ${metricsJson}) ON CONFLICT (user_id, week) DO NOTHING`;
}

// ---------- clans ----------

async function listClans(search, limit) {
    const pattern = `%${search || ''}%`;
    const { rows } = await sql`
        SELECT c.id, c.name, c.tag, c.description, c.looking_for, COUNT(m.user_id) AS members
        FROM clans c LEFT JOIN clan_members m ON m.clan_id = c.id
        WHERE c.name ILIKE ${pattern} OR c.tag ILIKE ${pattern}
        GROUP BY c.id ORDER BY COUNT(m.user_id) DESC, c.id ASC LIMIT ${limit}
    `;
    return rows.map(r => ({ id: r.id, name: r.name, tag: r.tag, description: r.description, lookingFor: r.looking_for, members: int(r.members) }));
}

async function createClan({ name, tag, description, lookingFor, ownerId, now }) {
    const { rows } = await sql`
        INSERT INTO clans (name, tag, description, looking_for, owner_id, created_at)
        VALUES (${name}, ${tag}, ${description}, ${lookingFor}, ${ownerId}, ${now}) RETURNING id
    `;
    return rows[0].id;
}

async function getClan(clanId) {
    const { rows } = await sql`SELECT id, name, tag, description, looking_for, owner_id, created_at FROM clans WHERE id = ${clanId}`;
    const r = rows[0];
    return r ? { id: r.id, name: r.name, tag: r.tag, description: r.description, lookingFor: r.looking_for, ownerId: r.owner_id, createdAt: int(r.created_at) } : null;
}

async function setClanOwner(clanId, ownerId) {
    await sql`UPDATE clans SET owner_id = ${ownerId} WHERE id = ${clanId}`;
}

async function deleteClan(clanId) {
    await sql`DELETE FROM clan_bosses WHERE clan_id = ${clanId}`;
    await sql`DELETE FROM clan_attacks WHERE clan_id = ${clanId}`;
    await sql`DELETE FROM clans WHERE id = ${clanId}`;
}

async function membershipOf(userId) {
    const { rows } = await sql`SELECT clan_id, joined_at FROM clan_members WHERE user_id = ${userId}`;
    return rows[0] ? { clanId: rows[0].clan_id, joinedAt: int(rows[0].joined_at) } : null;
}

/**
 * Take the lowest free place in the clan. Returns false if the clan is full. Throws a unique
 * violation (23505) if the player is already in a clan; a parallel join that took the same place
 * is retried.
 */
async function addMember(clanId, userId, now, maxMembers) {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const { rows } = await sql`
                INSERT INTO clan_members (user_id, clan_id, joined_at, slot)
                SELECT ${userId}::int, ${clanId}::int, ${now}::bigint, s FROM generate_series(1, ${maxMembers}::int) AS s
                WHERE s NOT IN (SELECT slot FROM clan_members WHERE clan_id = ${clanId}::int AND slot IS NOT NULL)
                  AND (SELECT COUNT(*) FROM clan_members WHERE clan_id = ${clanId}::int) < ${maxMembers}::int
                ORDER BY s LIMIT 1
                RETURNING slot
            `;
            return rows.length > 0;
        } catch (err) {
            if (err.code === '23505' && err.constraint === 'clan_members_slot') continue;
            throw err;
        }
    }
    return false;
}

async function removeMember(userId) {
    await sql`DELETE FROM clan_members WHERE user_id = ${userId}`;
}

/** Members with their stored numbers, oldest member first. */
async function clanMembers(clanId) {
    const { rows } = await sql`
        SELECT u.id, u.username, u.metrics, u.flags, m.joined_at
        FROM clan_members m JOIN users u ON u.id = m.user_id
        WHERE m.clan_id = ${clanId} ORDER BY m.joined_at ASC, u.id ASC
    `;
    return rows.map(r => ({ userId: r.id, username: r.username, metrics: r.metrics || null, flags: r.flags || '[]', joinedAt: int(r.joined_at) }));
}

// ---------- the weekly clan boss ----------

function bossRow(r) {
    return r ? { clanId: r.clan_id, week: r.week, maxHp: int(r.max_hp), hp: int(r.hp), killedAt: int(r.killed_at), lastHitUser: r.last_hit_user || null, settled: !!r.settled } : null;
}

async function getBoss(clanId, week) {
    const { rows } = await sql`SELECT clan_id, week, max_hp, hp, killed_at, last_hit_user, settled FROM clan_bosses WHERE clan_id = ${clanId} AND week = ${week}`;
    return bossRow(rows[0]);
}

async function createBoss(clanId, week, maxHp) {
    await sql`INSERT INTO clan_bosses (clan_id, week, max_hp, hp) VALUES (${clanId}, ${week}, ${maxHp}, ${maxHp}) ON CONFLICT (clan_id, week) DO NOTHING`;
    return getBoss(clanId, week);
}

/** Apply damage atomically; returns the boss after the hit. */
async function damageBoss(clanId, week, damage) {
    const { rows } = await sql`
        UPDATE clan_bosses SET hp = GREATEST(0, hp - ${damage})
        WHERE clan_id = ${clanId} AND week = ${week} AND hp > 0
        RETURNING clan_id, week, max_hp, hp, killed_at, last_hit_user, settled
    `;
    return bossRow(rows[0]);
}

/** Returns true for the one caller that marks the kill (so kill rewards are paid once). */
async function markBossKilled(clanId, week, userId, now) {
    const { rows } = await sql`
        UPDATE clan_bosses SET killed_at = ${now}, last_hit_user = ${userId}
        WHERE clan_id = ${clanId} AND week = ${week} AND killed_at = 0 AND hp = 0
        RETURNING clan_id
    `;
    return rows.length > 0;
}

/** Earlier weeks of this clan that have not paid out their weekly rewards yet. */
async function unsettledBosses(clanId, beforeWeek) {
    const { rows } = await sql`SELECT clan_id, week, max_hp, hp, killed_at, last_hit_user, settled FROM clan_bosses WHERE clan_id = ${clanId} AND week < ${beforeWeek} AND settled = FALSE`;
    return rows.map(bossRow);
}

/** Returns true for the one caller that settles this week (so its rewards are paid at most once). */
async function claimSettlement(clanId, week) {
    const { rows } = await sql`
        UPDATE clan_bosses SET settled = TRUE
        WHERE clan_id = ${clanId} AND week = ${week} AND settled = FALSE
        RETURNING clan_id
    `;
    return rows.length > 0;
}

/** Throws a unique violation (code 23505) if that attack slot is already used today. */
async function recordAttack({ clanId, userId, week, day, slot, damage, now }) {
    await sql`INSERT INTO clan_attacks (clan_id, user_id, week, day, slot, damage, at) VALUES (${clanId}, ${userId}, ${week}, ${day}, ${slot}, ${damage}, ${now})`;
}

/** Give an attack slot back (the boss was already down when the attack landed). */
async function deleteAttack(userId, day, slot) {
    await sql`DELETE FROM clan_attacks WHERE user_id = ${userId} AND day = ${day} AND slot = ${slot}`;
}

async function attacksToday(userId, day) {
    const { rows } = await sql`SELECT COUNT(*) AS n FROM clan_attacks WHERE user_id = ${userId} AND day = ${day}`;
    return int(rows[0] && rows[0].n);
}

/** Total damage per user for a clan's week, highest first. */
async function weeklyDamage(clanId, week) {
    const { rows } = await sql`
        SELECT a.user_id, u.username, SUM(a.damage) AS damage, COUNT(*) AS attacks
        FROM clan_attacks a JOIN users u ON u.id = a.user_id
        WHERE a.clan_id = ${clanId} AND a.week = ${week}
        GROUP BY a.user_id, u.username ORDER BY SUM(a.damage) DESC
    `;
    return rows.map(r => ({ userId: r.user_id, username: r.username, damage: int(r.damage), attacks: int(r.attacks) }));
}

// ---------- rewards ----------

/** Add a reward; with a `dedupe` key, a second reward with the same key is silently skipped. */
async function addReward(userId, kind, payloadJson, now, dedupe = null) {
    await sql`INSERT INTO rewards (user_id, kind, payload, created_at, dedupe) VALUES (${userId}, ${kind}, ${payloadJson}, ${now}, ${dedupe}) ON CONFLICT (dedupe) DO NOTHING`;
}

async function unclaimedRewards(userId) {
    const { rows } = await sql`SELECT id, kind, payload, created_at FROM rewards WHERE user_id = ${userId} AND claimed_at = 0 ORDER BY id ASC`;
    return rows.map(r => ({ id: r.id, kind: r.kind, payload: r.payload, createdAt: int(r.created_at) }));
}

/** Mark rewards claimed; returns only the ones this call claimed (so a double claim pays once). */
async function claimRewards(userId, ids, now) {
    const claimed = [];
    for (const id of ids) {
        const { rows } = await sql`
            UPDATE rewards SET claimed_at = ${now}
            WHERE id = ${id} AND user_id = ${userId} AND claimed_at = 0
            RETURNING id, kind, payload
        `;
        if (rows[0]) claimed.push({ id: rows[0].id, kind: rows[0].kind, payload: rows[0].payload });
    }
    return claimed;
}

module.exports = {
    ensureSchema,
    createUser, findUserByName, getSave, putSave, setOptIn, leaderboardRows,
    getSnapshot, putSnapshotIfMissing,
    listClans, createClan, getClan, setClanOwner, deleteClan, membershipOf, addMember, removeMember, clanMembers,
    getBoss, createBoss, damageBoss, markBossKilled, unsettledBosses, claimSettlement, recordAttack, deleteAttack, attacksToday, weeklyDamage,
    addReward, unclaimedRewards, claimRewards
};
