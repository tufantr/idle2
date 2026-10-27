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
    // Each member's part of the week's boss, as it was sized: taken back if they leave before fighting.
    await sql`
        CREATE TABLE IF NOT EXISTS clan_boss_shares (
            clan_id INTEGER NOT NULL,
            week VARCHAR(10) NOT NULL,
            user_id INTEGER NOT NULL,
            share BIGINT NOT NULL,
            PRIMARY KEY (clan_id, week, user_id)
        );
    `;
    // Failed logins and registrations per name or address, in a window (rate limiting).
    await sql`
        CREATE TABLE IF NOT EXISTS auth_attempts (
            key VARCHAR(120) PRIMARY KEY,
            count INTEGER NOT NULL,
            since BIGINT NOT NULL
        );
    `;
    // One row per attack, numbered per player and day (slot). How many a player may make is
    // clan_charges, spent atomically, so parallel requests or a switch of clans give no more.
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
    // Clan attacks waiting (banked): a day's worth comes each day, up to a cap (api/index.js).
    await sql`
        CREATE TABLE IF NOT EXISTS clan_charges (
            user_id INTEGER PRIMARY KEY,
            charges SMALLINT NOT NULL,
            day INTEGER NOT NULL
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
    // A clan fight's own mark (the time it ended, from the game): sent again after a lost answer, it is
    // the same attack, never a second one. Older attacks have none (NULLs never collide).
    await sql`ALTER TABLE clan_attacks ADD COLUMN IF NOT EXISTS fight_at BIGINT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS clan_attacks_fight ON clan_attacks (user_id, fight_at)`;
    // The kill's rewards paid (they are paid after the kill is marked, and paid again if that failed).
    await sql`ALTER TABLE clan_bosses ADD COLUMN IF NOT EXISTS kill_paid BOOLEAN DEFAULT FALSE`;
    // A felled boss comes back the next day (UTC) twice as strong, until the week ends (api/index.js): its
    // level, and each attack's, so a kill pays those who fought that level. Older rows are level 1.
    await sql`ALTER TABLE clan_bosses ADD COLUMN IF NOT EXISTS level SMALLINT DEFAULT 1`;
    // The boss counted in the clan's attacks (the clan banner, October 2026; api/index.js): its health in thousandths
    // of the members' average plain attack, `unit` that attack. 0: a row from before, counted in damage.
    await sql`ALTER TABLE clan_bosses ADD COLUMN IF NOT EXISTS unit DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE clan_attacks ADD COLUMN IF NOT EXISTS level SMALLINT DEFAULT 1`;
    // The boss sized again each day from the members' best attacks (api/index.js currentBoss): the day it was last
    // sized (UTC days since 1970). An attack's damage as it was shown, so the week's board keeps it when the boss is
    // sized again (NULL: an attack from before, shown in the boss's unit now).
    await sql`ALTER TABLE clan_bosses ADD COLUMN IF NOT EXISTS unit_day INTEGER DEFAULT 0`;
    await sql`ALTER TABLE clan_attacks ADD COLUMN IF NOT EXISTS dealt DOUBLE PRECISION`;
    // Names are one account whatever their case ("Tufan" and "tufan"). Made only if the names already
    // there allow it: a failure here must not stop the API (createUser checks as well).
    try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (lower(username))`; } catch (err) {
        console.error('users_username_lower not made (names that differ only in case?)', err && err.message);
    }
    // Sign-up by email (October 2026, on the fantasyidle.com server): an account's address, confirmed by a code
    // (email_verified_at), one account an address whatever its case; and the codes themselves, kept only as a
    // keyed hash (api/index.js), each for one purpose ('verify', 'reset'), with its tries counted.
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT DEFAULT 0`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email))`;
    await sql`
        CREATE TABLE IF NOT EXISTS email_codes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            purpose TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at BIGINT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at BIGINT NOT NULL
        )
    `;
    await sql`CREATE INDEX IF NOT EXISTS email_codes_user ON email_codes (user_id, purpose)`;
    // The week's clan ranking (October 2026, api/index.js): attacks at the Endless Hydra, ENDLESS.attacks a member a week
    // (`slot`), each with its damage and how deep it reached; and each finished week's standings, kept once so the
    // crowns they give stay as they were (the clan's name and tag with them, should it be renamed or closed).
    await sql`
        CREATE TABLE IF NOT EXISTS clan_endless (
            user_id INTEGER NOT NULL,
            week VARCHAR(10) NOT NULL,
            slot SMALLINT NOT NULL,
            clan_id INTEGER NOT NULL,
            damage DOUBLE PRECISION NOT NULL,
            depth DOUBLE PRECISION NOT NULL,
            at BIGINT NOT NULL,
            fight_at BIGINT,
            PRIMARY KEY (user_id, week, slot)
        )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS clan_endless_fight ON clan_endless (user_id, fight_at)`;
    await sql`CREATE INDEX IF NOT EXISTS clan_endless_week ON clan_endless (week, clan_id)`;
    await sql`
        CREATE TABLE IF NOT EXISTS clan_rankings (
            week VARCHAR(10) NOT NULL,
            clan_id INTEGER NOT NULL,
            name VARCHAR(32) NOT NULL,
            tag VARCHAR(5) NOT NULL,
            division VARCHAR(10) NOT NULL,
            rank SMALLINT NOT NULL,
            kills SMALLINT NOT NULL,
            score DOUBLE PRECISION NOT NULL,
            counted SMALLINT NOT NULL,
            PRIMARY KEY (week, clan_id)
        )
    `;
    // The Clan Hall (October 2026, src/data/clanhall.js): the work each room has had, in tenths of a second, and every gift
    // a member made, numbered for each player (`seq`, unique: two gifts sent at once can't both pass the week's allowance;
    // a save says how many of them its bank has given: api/index.js). The banner's colour and emblem are the clan's.
    await sql`
        CREATE TABLE IF NOT EXISTS clan_hall (
            clan_id INTEGER NOT NULL,
            room VARCHAR(16) NOT NULL,
            given BIGINT NOT NULL DEFAULT 0,
            PRIMARY KEY (clan_id, room)
        )
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS clan_gifts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            clan_id INTEGER NOT NULL,
            week VARCHAR(10) NOT NULL,
            room VARCHAR(16) NOT NULL,
            resource VARCHAR(40) NOT NULL,
            qty BIGINT NOT NULL,
            work BIGINT NOT NULL,
            at BIGINT NOT NULL
        )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS clan_gifts_seq ON clan_gifts (user_id, seq)`;
    await sql`CREATE INDEX IF NOT EXISTS clan_gifts_clan ON clan_gifts (clan_id, id)`;
    await sql`ALTER TABLE clans ADD COLUMN IF NOT EXISTS banner_colour VARCHAR(16)`;
    await sql`ALTER TABLE clans ADD COLUMN IF NOT EXISTS banner_emblem VARCHAR(16)`;
}

/** The database answers (the health check asks it every time, not once per instance). */
async function ping() {
    await sql`SELECT 1`;
}

// ---------- users and saves ----------

/** Throws a unique violation (23505) for a name taken in any case. */
/** A new account; `email` (lowercase) is checked for confirmation afterwards. A name or an address taken: a 23505, its `constraint` saying which. */
async function createUser(username, hash, email = null) {
    const { rows: taken } = await sql`SELECT 1 FROM users WHERE lower(username) = lower(${username}) LIMIT 1`;
    if (taken.length) throw Object.assign(new Error('Username already exists'), { code: '23505', constraint: 'users_username_lower' });
    if (email) {
        const { rows: used } = await sql`SELECT 1 FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
        if (used.length) throw Object.assign(new Error('Email already used'), { code: '23505', constraint: 'users_email_lower' });
    }
    const { rows } = await sql`INSERT INTO users (username, password_hash, email) VALUES (${username}, ${hash}, ${email}) RETURNING id`;
    return rows[0].id;
}

const accountRow = r => (r ? { id: r.id, username: r.username, password_hash: r.password_hash, email: r.email || null, emailVerifiedAt: int(r.email_verified_at) } : null);

/** The account of a name, whatever its case (the one spelled exactly so first, where two older ones differ only in case). */
async function findUserByName(username) {
    const { rows } = await sql`
        SELECT id, username, password_hash, email, email_verified_at FROM users WHERE lower(username) = lower(${username})
        ORDER BY (username = ${username}) DESC, id ASC LIMIT 1
    `;
    return accountRow(rows[0]);
}

/** The account of an email address, whatever its case. */
async function findUserByEmail(email) {
    const { rows } = await sql`SELECT id, username, password_hash, email, email_verified_at FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
    return accountRow(rows[0]);
}

async function setEmailVerified(userId, now) {
    await sql`UPDATE users SET email_verified_at = ${now}::bigint WHERE id = ${userId}`;
}

async function setPassword(userId, hash) {
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
}

/** A new code for an account and a purpose, in place of any before it. */
async function putEmailCode(userId, purpose, codeHash, expiresAt, now) {
    await sql`DELETE FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose}`;
    await sql`INSERT INTO email_codes (user_id, purpose, code_hash, expires_at, created_at) VALUES (${userId}, ${purpose}, ${codeHash}, ${expiresAt}::bigint, ${now}::bigint)`;
}

async function getEmailCode(userId, purpose) {
    const { rows } = await sql`SELECT id, code_hash, expires_at, attempts, created_at FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose} ORDER BY id DESC LIMIT 1`;
    const r = rows[0];
    return r ? { id: r.id, codeHash: r.code_hash, expiresAt: int(r.expires_at), attempts: int(r.attempts), createdAt: int(r.created_at) } : null;
}

/** One more try at a code; its tries so far. */
async function bumpEmailCodeAttempts(id) {
    const { rows } = await sql`UPDATE email_codes SET attempts = attempts + 1 WHERE id = ${id} RETURNING attempts`;
    return rows[0] ? int(rows[0].attempts) : Infinity;
}

/** A code used up by its tries: it can no longer be right, and its time still counts toward the next one's minute. */
async function expireEmailCode(id) {
    await sql`UPDATE email_codes SET expires_at = 0 WHERE id = ${id}`;
}

async function deleteEmailCodes(userId, purpose) {
    await sql`DELETE FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose}`;
}

/** The name an account id has now (a token is checked against it), or null. */
async function userNameOf(userId) {
    const { rows } = await sql`SELECT username FROM users WHERE id = ${userId}`;
    return rows[0] ? rows[0].username : null;
}

async function getSave(userId) {
    const { rows } = await sql`SELECT game_state, last_saved, flags, leaderboard_opt_in, metrics, email_verified_at FROM users WHERE id = ${userId}`;
    const row = rows[0];
    if (!row) return null;
    return { state: row.game_state || null, lastSaved: int(row.last_saved), flags: row.flags || '[]', optIn: !!row.leaderboard_opt_in, metrics: row.metrics || null, verifiedAt: int(row.email_verified_at) };
}

/**
 * Store a save. With `base` (the last_saved the uploading game had seen), only over that save: another
 * device's upload since then makes it refuse (returns false), so a stale game never replaces a newer one.
 */
async function putSave(userId, stateJson, savedAt, flagsJson, metricsJson, base = null) {
    if (base === null) {
        await sql`UPDATE users SET game_state = ${stateJson}, last_saved = ${savedAt}, flags = ${flagsJson}, metrics = ${metricsJson} WHERE id = ${userId}`;
        return true;
    }
    const { rows } = await sql`
        UPDATE users SET game_state = ${stateJson}, last_saved = ${savedAt}, flags = ${flagsJson}, metrics = ${metricsJson}
        WHERE id = ${userId} AND COALESCE(last_saved, 0) = ${base}::bigint
        RETURNING id
    `;
    return rows.length > 0;
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

/** Clans by name or tag, the biggest first, each with its hall's rooms ({ room → work }: the stage its list shows). */
async function listClans(search, limit) {
    const pattern = `%${String(search || '').replace(/[\\%_]/g, '\\$&')}%`;   // a % or _ typed is a letter, not a wildcard
    const { rows } = await sql`
        SELECT c.id, c.name, c.tag, c.description, c.looking_for, COUNT(m.user_id) AS members,
            (SELECT json_object_agg(h.room, h.given) FROM clan_hall h WHERE h.clan_id = c.id) AS hall
        FROM clans c LEFT JOIN clan_members m ON m.clan_id = c.id
        WHERE c.name ILIKE ${pattern} OR c.tag ILIKE ${pattern}
        GROUP BY c.id ORDER BY COUNT(m.user_id) DESC, c.id ASC LIMIT ${limit}
    `;
    return rows.map(r => ({ id: r.id, name: r.name, tag: r.tag, description: r.description, lookingFor: r.looking_for, members: int(r.members), hall: workOf(r.hall) }));
}

/** A hall's rooms as stored ({ room → work }), as plain numbers. */
const workOf = rooms => Object.fromEntries(Object.entries(rooms && typeof rooms === 'object' ? rooms : {}).map(([room, work]) => [room, int(work)]));

async function createClan({ name, tag, description, lookingFor, ownerId, now }) {
    const { rows } = await sql`
        INSERT INTO clans (name, tag, description, looking_for, owner_id, created_at)
        VALUES (${name}, ${tag}, ${description}, ${lookingFor}, ${ownerId}, ${now}) RETURNING id
    `;
    return rows[0].id;
}

async function getClan(clanId) {
    const { rows } = await sql`SELECT id, name, tag, description, looking_for, owner_id, created_at, banner_colour, banner_emblem FROM clans WHERE id = ${clanId}`;
    const r = rows[0];
    return r ? { id: r.id, name: r.name, tag: r.tag, description: r.description, lookingFor: r.looking_for, ownerId: r.owner_id, createdAt: int(r.created_at), colour: r.banner_colour || null, emblem: r.banner_emblem || null } : null;
}

async function setClanOwner(clanId, ownerId) {
    await sql`UPDATE clans SET owner_id = ${ownerId} WHERE id = ${clanId}`;
}

async function deleteClan(clanId) {
    await sql`DELETE FROM clan_bosses WHERE clan_id = ${clanId}`;
    await sql`DELETE FROM clan_boss_shares WHERE clan_id = ${clanId}`;
    await sql`DELETE FROM clan_hall WHERE clan_id = ${clanId}`;   // its gifts stay: they count each giver's week
    // The attacks stay: they are what counts a player's three a day (deleting them gave fresh ones).
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
        SELECT u.id, u.username, u.metrics, u.flags, u.last_saved, m.joined_at
        FROM clan_members m JOIN users u ON u.id = m.user_id
        WHERE m.clan_id = ${clanId} ORDER BY m.joined_at ASC, u.id ASC
    `;
    return rows.map(r => ({ userId: r.id, username: r.username, metrics: r.metrics || null, flags: r.flags || '[]', lastSaved: int(r.last_saved), joinedAt: int(r.joined_at) }));
}

// ---------- the weekly clan boss ----------

function bossRow(r) {
    return r ? { clanId: r.clan_id, week: r.week, level: int(r.level) || 1, maxHp: int(r.max_hp), hp: int(r.hp), killedAt: int(r.killed_at), lastHitUser: r.last_hit_user || null, settled: !!r.settled, killPaid: !!r.kill_paid, unit: Number(r.unit) || 0, unitDay: int(r.unit_day) } : null;
}

async function getBoss(clanId, week) {
    const { rows } = await sql`SELECT clan_id, week, level, max_hp, hp, killed_at, last_hit_user, settled, kill_paid, unit, unit_day FROM clan_bosses WHERE clan_id = ${clanId} AND week = ${week}`;
    return bossRow(rows[0]);
}

/** Create the week's boss (once): its health, each member's share of it ([{ userId, share }]), the unit it is counted in and the day that was. */
async function createBoss(clanId, week, maxHp, shares = [], unit = 0, day = 0) {
    const { rows } = await sql`INSERT INTO clan_bosses (clan_id, week, max_hp, hp, unit, unit_day) VALUES (${clanId}, ${week}, ${maxHp}, ${maxHp}, ${unit}::double precision, ${day}::int) ON CONFLICT (clan_id, week) DO NOTHING RETURNING clan_id`;
    if (rows.length) {
        for (const s of shares) await sql`INSERT INTO clan_boss_shares (clan_id, week, user_id, share) VALUES (${clanId}, ${week}, ${s.userId}, ${s.share}) ON CONFLICT DO NOTHING`;
    }
    return getBoss(clanId, week);
}

/** Each member's part of the week's boss as it was sized: [{ userId, share }] (kept all week, whoever leaves). */
async function bossShares(clanId, week) {
    const { rows } = await sql`SELECT user_id, share FROM clan_boss_shares WHERE clan_id = ${clanId} AND week = ${week}`;
    return rows.map(r => ({ userId: r.user_id, share: int(r.share) }));
}

/**
 * Give the week's boss a new full health (api/index.js works it out from the shares of those in the
 * clan now), moving its health by as much, never to nothing: a boss already felled stays as it is.
 */
async function resizeBoss(clanId, week, maxHp) {
    await sql`
        UPDATE clan_bosses SET hp = GREATEST(1::bigint, hp + (${maxHp}::bigint - max_hp)), max_hp = ${maxHp}::bigint
        WHERE clan_id = ${clanId} AND week = ${week} AND hp > 0
    `;
}

/**
 * The week's boss at a new size for its level (`maxHp`, from `fromMaxHp`: src/data/social.js CLAN_BOSS changed): the
 * same share of its health left, a felled one still felled, and its attacks this week scaled with it, so the board's
 * shares and the bar agree. Once: true for the caller who moves it.
 */
async function rescaleBoss(clanId, week, fromMaxHp, maxHp) {
    const factor = maxHp / Math.max(1, fromMaxHp);
    const { rows } = await sql`
        UPDATE clan_bosses SET max_hp = ${maxHp}::bigint,
            hp = CASE WHEN hp > 0 THEN GREATEST(1, ROUND(hp * ${factor}::double precision))::bigint ELSE 0 END
        WHERE clan_id = ${clanId} AND week = ${week} AND max_hp = ${fromMaxHp}::bigint
        RETURNING clan_id
    `;
    if (!rows.length) return false;
    await sql`UPDATE clan_attacks SET damage = GREATEST(1, ROUND(damage * ${factor}::double precision))::bigint WHERE clan_id = ${clanId} AND week = ${week}`;   // (a bare parameter beside a bigint is read as one)
    return true;
}

/** Apply damage atomically; returns the boss after the hit. */
async function damageBoss(clanId, week, damage) {
    const { rows } = await sql`
        UPDATE clan_bosses SET hp = GREATEST(0, hp - ${damage})
        WHERE clan_id = ${clanId} AND week = ${week} AND hp > 0
        RETURNING clan_id, week, level, max_hp, hp, killed_at, last_hit_user, settled, kill_paid, unit, unit_day
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

/**
 * The felled boss back as the next level, at `maxHp` and full health: once (the caller who moves it gets
 * true), and only after its kill was paid (a payout half done is finished first, by the caller).
 */
async function nextLevel(clanId, week, level, killedAt, maxHp) {
    const { rows } = await sql`
        UPDATE clan_bosses SET level = ${level + 1}, max_hp = ${maxHp}::bigint, hp = ${maxHp}::bigint, killed_at = 0, last_hit_user = NULL, kill_paid = FALSE
        WHERE clan_id = ${clanId} AND week = ${week} AND level = ${level} AND killed_at = ${killedAt}::bigint AND kill_paid = TRUE
        RETURNING clan_id
    `;
    return rows.length > 0;
}

/** The kill's rewards are paid (each with its own dedupe key, so paying them again paid nothing twice). */
async function markKillPaid(clanId, week) {
    await sql`UPDATE clan_bosses SET kill_paid = TRUE WHERE clan_id = ${clanId} AND week = ${week}`;
}

/** Earlier weeks of this clan that have not paid out their weekly rewards yet. */
async function unsettledBosses(clanId, beforeWeek) {
    const { rows } = await sql`SELECT clan_id, week, level, max_hp, hp, killed_at, last_hit_user, settled, kill_paid, unit, unit_day FROM clan_bosses WHERE clan_id = ${clanId} AND week < ${beforeWeek} AND settled = FALSE`;
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

/**
 * Record an attack in the player's next slot of the day (slots are unique per player and day; the
 * attacks waiting, clan_charges, say how many may be made). A parallel attack taking the same slot
 * means a try at the next. Returns the slot. With `fightAt` (the fight's own mark), the same fight
 * recorded already throws a unique violation on the constraint clan_attacks_fight.
 */
async function recordAttack({ clanId, userId, week, day, damage, dealt = null, now, fightAt = null, level = 1 }) {
    for (let tries = 0; ; tries++) {
        try {
            const { rows } = await sql`
                INSERT INTO clan_attacks (clan_id, user_id, week, day, slot, damage, dealt, at, fight_at, level)
                SELECT ${clanId}::int, ${userId}::int, ${week}::varchar, ${day}::varchar, COALESCE(MAX(slot), 0) + 1, ${damage}::bigint, ${dealt}::double precision, ${now}::bigint, ${fightAt}::bigint, ${level}::smallint
                FROM clan_attacks WHERE user_id = ${userId}::int AND day = ${day}::varchar
                RETURNING slot
            `;
            return int(rows[0].slot);
        } catch (err) {
            if (err.code !== '23505' || err.constraint === 'clan_attacks_fight' || tries >= 3) throw err;
        }
    }
}

/** The attack recorded for a fight (its mark), or null: { clanId, week, damage, at }. */
async function attackByFight(userId, fightAt) {
    const { rows } = await sql`SELECT clan_id, week, damage, dealt, at FROM clan_attacks WHERE user_id = ${userId} AND fight_at = ${fightAt}::bigint`;
    return rows[0] ? { clanId: rows[0].clan_id, week: rows[0].week, damage: int(rows[0].damage), dealt: rows[0].dealt === null ? null : Number(rows[0].dealt), at: int(rows[0].at) } : null;
}

/** Give an attack slot back (the boss was already down when the attack landed). */
async function deleteAttack(userId, day, slot) {
    await sql`DELETE FROM clan_attacks WHERE user_id = ${userId} AND day = ${day} AND slot = ${slot}`;
}

async function attacksToday(userId, day) {
    const { rows } = await sql`SELECT COUNT(*) AS n FROM clan_attacks WHERE user_id = ${userId} AND day = ${day}`;
    return int(rows[0] && rows[0].n);
}

// ---------- clan attacks waiting ----------
// One row per player: the attacks waiting, as of `day` (UTC days since 1970). Each new day adds `perDay`,
// up to `bank`; a player without a row has a day's worth.

/** Attacks waiting for a player on `day`, without spending one. */
async function chargesNow(userId, day, perDay, bank) {
    const { rows } = await sql`SELECT charges, day FROM clan_charges WHERE user_id = ${userId}`;
    if (!rows[0]) return perDay;
    return Math.min(bank, int(rows[0].charges) + perDay * Math.max(0, day - int(rows[0].day)));
}

/** Spend one attack (atomically: parallel requests can't spend the same one). Returns those left, or null if none waited. */
async function spendCharge(userId, day, perDay, bank) {
    await sql`INSERT INTO clan_charges (user_id, charges, day) VALUES (${userId}, ${perDay}, ${day}) ON CONFLICT (user_id) DO NOTHING`;
    const { rows } = await sql`
        UPDATE clan_charges
        SET charges = LEAST(${bank}::int, charges + ${perDay}::int * GREATEST(0, ${day}::int - day)) - 1, day = GREATEST(day, ${day}::int)
        WHERE user_id = ${userId} AND LEAST(${bank}::int, charges + ${perDay}::int * GREATEST(0, ${day}::int - day)) > 0
        RETURNING charges
    `;
    return rows[0] ? int(rows[0].charges) : null;
}

/** Give a spent attack back (the boss was already down when it landed). */
async function refundCharge(userId, bank) {
    await sql`UPDATE clan_charges SET charges = LEAST(${bank}::int, charges + 1) WHERE user_id = ${userId}`;
}

/** Who fought a level of a clan's week (its kill pays them). */
async function levelFighters(clanId, week, level) {
    const { rows } = await sql`SELECT DISTINCT user_id FROM clan_attacks WHERE clan_id = ${clanId} AND week = ${week} AND level = ${level}`;
    return rows.map(r => r.user_id);
}

/**
 * Total damage per user for a clan's week, highest first: in the clan's attacks (`damage`), and as it was shown
 * (`dealt`, with `undealt` the attacks' from before that was kept, in the clan's attacks).
 */
async function weeklyDamage(clanId, week) {
    const { rows } = await sql`
        SELECT a.user_id, u.username, SUM(a.damage) AS damage, COUNT(*) AS attacks,
               COALESCE(SUM(a.dealt), 0) AS dealt, COALESCE(SUM(CASE WHEN a.dealt IS NULL THEN a.damage ELSE 0 END), 0) AS undealt
        FROM clan_attacks a JOIN users u ON u.id = a.user_id
        WHERE a.clan_id = ${clanId} AND a.week = ${week}
        GROUP BY a.user_id, u.username ORDER BY SUM(a.damage) DESC
    `;
    return rows.map(r => ({ userId: r.user_id, username: r.username, damage: int(r.damage), attacks: int(r.attacks), dealt: Number(r.dealt) || 0, undealt: int(r.undealt) }));
}

// ---------- the week's clan ranking ----------

/**
 * Record an attack at the Endless Hydra in the player's next of `max` places this week; null when all are taken. A
 * parallel attack that took the same place means a try at the next. With `fightAt` (the fight's own mark), the same
 * fight recorded already throws a unique violation on clan_endless_fight.
 */
async function recordEndless({ userId, week, clanId, damage, depth, now, fightAt = null, max }) {
    for (let tries = 0; ; tries++) {
        try {
            const { rows } = await sql`
                INSERT INTO clan_endless (user_id, week, slot, clan_id, damage, depth, at, fight_at)
                SELECT ${userId}::int, ${week}::varchar, COALESCE(MAX(slot), 0) + 1, ${clanId}::int, ${damage}::double precision, ${depth}::double precision, ${now}::bigint, ${fightAt}::bigint
                FROM clan_endless WHERE user_id = ${userId}::int AND week = ${week}::varchar
                HAVING COUNT(*) < ${max}::int
                RETURNING slot
            `;
            return rows[0] ? int(rows[0].slot) : null;
        } catch (err) {
            if (err.code !== '23505' || err.constraint === 'clan_endless_fight' || tries >= 3) throw err;
        }
    }
}

/** The attack at the Endless Hydra recorded for a fight (its mark), or null: { clanId, week, damage, depth, at }. */
async function endlessByFight(userId, fightAt) {
    const { rows } = await sql`SELECT clan_id, week, damage, depth, at FROM clan_endless WHERE user_id = ${userId} AND fight_at = ${fightAt}::bigint`;
    const r = rows[0];
    return r ? { clanId: r.clan_id, week: r.week, damage: Number(r.damage) || 0, depth: Number(r.depth) || 0, at: int(r.at) } : null;
}

/** A player's attacks at the Endless Hydra in a week: how many, and the deepest. */
async function endlessOf(userId, week) {
    const { rows } = await sql`SELECT COUNT(*) AS used, COALESCE(MAX(depth), 0) AS best FROM clan_endless WHERE user_id = ${userId} AND week = ${week}`;
    return { used: int(rows[0] && rows[0].used), best: Number(rows[0] && rows[0].best) || 0 };
}

/** Each player's deepest attack of a week at the Endless Hydra, for each clan they made one for, with their flags. */
async function endlessWeek(week) {
    const { rows } = await sql`
        SELECT e.clan_id, e.user_id, MAX(e.depth) AS depth, u.flags
        FROM clan_endless e JOIN users u ON u.id = e.user_id
        WHERE e.week = ${week}
        GROUP BY e.clan_id, e.user_id, u.flags
    `;
    return rows.map(r => ({ clanId: r.clan_id, userId: r.user_id, depth: Number(r.depth) || 0, flags: r.flags || '[]' }));
}

/** Every clan's boss of a week (the levels it felled make its division). */
async function weekBosses(week) {
    const { rows } = await sql`SELECT clan_id, week, level, max_hp, hp, killed_at, last_hit_user, settled, kill_paid, unit, unit_day FROM clan_bosses WHERE week = ${week}`;
    return rows.map(bossRow);
}

/** Every clan's name and tag. */
async function allClans() {
    const { rows } = await sql`SELECT id, name, tag FROM clans`;
    return rows.map(r => ({ id: r.id, name: r.name, tag: r.tag }));
}

/** A finished week's ranking as it was kept: [{ clanId, name, tag, division, rank, kills, score, counted }]. */
async function getRanking(week) {
    const { rows } = await sql`SELECT clan_id, name, tag, division, rank, kills, score, counted FROM clan_rankings WHERE week = ${week} ORDER BY division, rank`;
    return rows.map(r => ({ clanId: r.clan_id, name: r.name, tag: r.tag, division: r.division, rank: int(r.rank), kills: int(r.kills), score: Number(r.score) || 0, counted: int(r.counted) }));
}

/** Keep a finished week's ranking (once: rows kept already stay as they are). */
async function putRanking(week, rows) {
    for (const r of rows) {
        await sql`
            INSERT INTO clan_rankings (week, clan_id, name, tag, division, rank, kills, score, counted)
            VALUES (${week}, ${r.clanId}::int, ${r.name}, ${r.tag}, ${r.division}, ${r.rank}::smallint, ${r.kills}::smallint, ${r.score}::double precision, ${r.counted}::smallint)
            ON CONFLICT (week, clan_id) DO NOTHING
        `;
    }
}

/** A clan's best score in a finished week (its record), 0 if none. */
async function clanBestScore(clanId) {
    const { rows } = await sql`SELECT COALESCE(MAX(score), 0) AS best FROM clan_rankings WHERE clan_id = ${clanId}`;
    return Number(rows[0] && rows[0].best) || 0;
}

// ---------- the clan hall ----------

/** The work (tenths of a second) each room of a clan's hall has had: { room → work }. */
async function hallRooms(clanId) {
    const { rows } = await sql`SELECT room, given FROM clan_hall WHERE clan_id = ${clanId}`;
    return Object.fromEntries(rows.map(r => [r.room, int(r.given)]));
}

/**
 * Record a gift as the player's gift number `seq` (their last plus one) and add its work to the room, at most `cap` there,
 * in one statement. A parallel gift that took the same number throws a unique violation (clan_gifts_seq): the caller
 * looks again and retries. Returns the room's work after it.
 */
async function addGift({ userId, seq, clanId, week, room, resource, qty, work, now, cap }) {
    const { rows } = await sql`
        WITH g AS (
            INSERT INTO clan_gifts (user_id, seq, clan_id, week, room, resource, qty, work, at)
            VALUES (${userId}::int, ${seq}::int, ${clanId}::int, ${week}, ${room}, ${resource}, ${qty}::bigint, ${work}::bigint, ${now}::bigint)
            RETURNING clan_id, room, work
        )
        INSERT INTO clan_hall (clan_id, room, given) SELECT clan_id, room, LEAST(work, ${cap}::bigint) FROM g
        ON CONFLICT (clan_id, room) DO UPDATE SET given = LEAST(clan_hall.given + EXCLUDED.given, ${cap}::bigint)
        RETURNING given
    `;
    return int(rows[0] && rows[0].given);
}

/** A player's gifts: the number of their last, the work they gave this week (to any clan), and to this clan in all. */
async function giftTotals(userId, clanId, week) {
    const { rows } = await sql`
        SELECT COALESCE(MAX(seq), 0) AS last,
            COALESCE(SUM(work) FILTER (WHERE week = ${week}), 0) AS week,
            COALESCE(SUM(work) FILTER (WHERE clan_id = ${clanId}::int), 0) AS clan
        FROM clan_gifts WHERE user_id = ${userId}
    `;
    const r = rows[0] || {};
    return { last: int(r.last), week: int(r.week), clan: int(r.clan) };
}

/** A player's gifts after their number `after` (those a save that has given up to `after` has yet to take from its bank). */
async function giftsAfter(userId, after) {
    const { rows } = await sql`SELECT seq, resource, qty FROM clan_gifts WHERE user_id = ${userId} AND seq > ${after}::int ORDER BY seq LIMIT 500`;
    return rows.map(r => ({ seq: int(r.seq), resource: r.resource, qty: int(r.qty) }));
}

/** What each giver gave a clan's hall, by room: [{ userId, room, total, week }] (work, this week's of it too). */
async function hallBuilders(clanId, week) {
    const { rows } = await sql`
        SELECT user_id, room, SUM(work) AS total, COALESCE(SUM(work) FILTER (WHERE week = ${week}), 0) AS week
        FROM clan_gifts WHERE clan_id = ${clanId} GROUP BY user_id, room
    `;
    return rows.map(r => ({ userId: r.user_id, room: r.room, total: int(r.total), week: int(r.week) }));
}

/** A clan's latest gifts, newest first, with their givers' names. */
async function recentGifts(clanId, limit) {
    const { rows } = await sql`
        SELECT u.username, g.room, g.resource, g.qty, g.at FROM clan_gifts g JOIN users u ON u.id = g.user_id
        WHERE g.clan_id = ${clanId} ORDER BY g.id DESC LIMIT ${limit}
    `;
    return rows.map(r => ({ username: r.username, room: r.room, resource: r.resource, qty: int(r.qty), at: int(r.at) }));
}

async function setClanBanner(clanId, colour, emblem) {
    await sql`UPDATE clans SET banner_colour = ${colour}, banner_emblem = ${emblem} WHERE id = ${clanId}`;
}

// ---------- rate limiting ----------

/**
 * Count one more try under `key` and return the count in its window, in one statement: checked before
 * the password is (the count read first and added after the check let a burst of parallel tries all in).
 */
async function takeAttempt(key, now, windowMs) {
    const { rows } = await sql`
        INSERT INTO auth_attempts (key, count, since) VALUES (${key}, 1, ${now})
        ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN ${now}::bigint - auth_attempts.since >= ${windowMs}::bigint THEN 1 ELSE auth_attempts.count + 1 END,
            since = CASE WHEN ${now}::bigint - auth_attempts.since >= ${windowMs}::bigint THEN ${now}::bigint ELSE auth_attempts.since END
        RETURNING count
    `;
    return int(rows[0] && rows[0].count);
}

/** A try that turned out right gives its count back. */
async function refundAttempt(key) {
    await sql`UPDATE auth_attempts SET count = GREATEST(0, count - 1) WHERE key = ${key}`;
}

/** Failures counted under `key` within the window (0 once it has passed). */
async function authFailures(key, now, windowMs) {
    const { rows } = await sql`SELECT count, since FROM auth_attempts WHERE key = ${key}`;
    return rows[0] && now - int(rows[0].since) < windowMs ? int(rows[0].count) : 0;
}

/** Count one more failure under `key` (a window that has passed starts again at one). */
async function noteAuthFailure(key, now, windowMs) {
    await sql`
        INSERT INTO auth_attempts (key, count, since) VALUES (${key}, 1, ${now})
        ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN ${now}::bigint - auth_attempts.since >= ${windowMs}::bigint THEN 1 ELSE auth_attempts.count + 1 END,
            since = CASE WHEN ${now}::bigint - auth_attempts.since >= ${windowMs}::bigint THEN ${now}::bigint ELSE auth_attempts.since END
    `;
}

async function clearAuthFailures(key) {
    await sql`DELETE FROM auth_attempts WHERE key = ${key}`;
}

// ---------- rewards ----------

/** Add a reward; with a `dedupe` key, a second reward with the same key is silently skipped. */
async function addReward(userId, kind, payloadJson, now, dedupe = null) {
    await sql`INSERT INTO rewards (user_id, kind, payload, created_at, dedupe) VALUES (${userId}, ${kind}, ${payloadJson}, ${now}, ${dedupe}) ON CONFLICT (dedupe) DO NOTHING`;
}

// A gift (kind 'gift') is the owner's: one line of SQL adds it (README "The API"). The game claims it by
// itself through claimGifts, never from the clan's list below, so a page still running older code (which
// knows no gifts) can't claim one and drop it.
async function unclaimedRewards(userId) {
    const { rows } = await sql`SELECT id, kind, payload, created_at FROM rewards WHERE user_id = ${userId} AND claimed_at = 0 AND kind <> 'gift' ORDER BY id ASC`;
    return rows.map(r => ({ id: r.id, kind: r.kind, payload: r.payload, createdAt: int(r.created_at) }));
}

/** Mark rewards claimed; returns only the ones this call claimed (so a double claim pays once). */
async function claimRewards(userId, ids, now) {
    const claimed = [];
    for (const id of ids) {
        const { rows } = await sql`
            UPDATE rewards SET claimed_at = ${now}
            WHERE id = ${id} AND user_id = ${userId} AND claimed_at = 0 AND kind <> 'gift'
            RETURNING id, kind, payload
        `;
        if (rows[0]) claimed.push({ id: rows[0].id, kind: rows[0].kind, payload: rows[0].payload });
    }
    return claimed;
}

/** Gifts waiting for this player (the save and load answers carry the count). */
async function unclaimedGiftCount(userId) {
    const { rows } = await sql`SELECT count(*)::int AS n FROM rewards WHERE user_id = ${userId} AND kind = 'gift' AND claimed_at = 0`;
    return int(rows[0] && rows[0].n);
}

/** Claim every gift waiting for this player; returns only the ones this call claimed (a double claim pays once). */
async function claimGifts(userId, now) {
    const { rows } = await sql`
        UPDATE rewards SET claimed_at = ${now}
        WHERE user_id = ${userId} AND kind = 'gift' AND claimed_at = 0
        RETURNING id, kind, payload
    `;
    return rows.map(r => ({ id: r.id, kind: r.kind, payload: r.payload }));
}

module.exports = {
    ensureSchema, ping,
    createUser, findUserByName, findUserByEmail, setEmailVerified, setPassword, putEmailCode, getEmailCode, bumpEmailCodeAttempts, expireEmailCode, deleteEmailCodes,
    userNameOf, getSave, putSave, setOptIn, leaderboardRows,
    getSnapshot, putSnapshotIfMissing,
    listClans, createClan, getClan, setClanOwner, deleteClan, membershipOf, addMember, removeMember, clanMembers,
    getBoss, createBoss, bossShares, resizeBoss, rescaleBoss, damageBoss, markBossKilled, nextLevel, markKillPaid, unsettledBosses, claimSettlement,
    recordAttack, attackByFight, deleteAttack, attacksToday, levelFighters, weeklyDamage,
    recordEndless, endlessByFight, endlessOf, endlessWeek, weekBosses, allClans, getRanking, putRanking, clanBestScore,
    hallRooms, addGift, giftTotals, giftsAfter, hallBuilders, recentGifts, setClanBanner,
    chargesNow, spendCharge, refundCharge,
    takeAttempt, refundAttempt, authFailures, noteAuthFailure, clearAuthFailures,
    addReward, unclaimedRewards, claimRewards, unclaimedGiftCount, claimGifts
};
