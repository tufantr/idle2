const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const store = require('./store');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// No hard-coded fallback in production: a known secret would let anyone forge tokens.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret');
const TOKEN_TTL = '30d';
const USERNAME_RE = /^[A-Za-z0-9_-]{3,24}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt only uses the first 72 bytes
const MAX_SAVE_VERSION = 3;

// The game's own stat code (ES modules), loaded once per instance: the server computes every number
// that other players see from the save it stores, never from a number a client sends.
let enginePromise = null;
const engine = () => (enginePromise ||= import('../src/core/power.js'));

// The schema is created on the first request of each instance (idempotent).
let schemaPromise = null;
function ensureSchema() {
    if (!schemaPromise) schemaPromise = store.ensureSchema().catch(err => { schemaPromise = null; throw err; });
    return schemaPromise;
}
app.use('/api', async (req, res, next) => {
    try { await ensureSchema(); next(); } catch (err) {
        console.error('schema failed', err);
        res.status(503).json({ error: 'Database unavailable' });
    }
});

function requireSecret(res) {
    if (JWT_SECRET) return true;
    res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set.' });
    return false;
}

function signToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function validateCredentials(body) {
    const { username, password } = body || {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) return 'Username must be 3-24 letters, numbers, _ or -.';
    if (typeof password !== 'string' || password.length < MIN_PASSWORD || Buffer.byteLength(password) > MAX_PASSWORD) {
        return `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters.`;
    }
    return null;
}

const authenticateToken = (req, res, next) => {
    if (!requireSecret(res)) return;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

/** Wrap an async route so a thrown error becomes a 500 with a log line. */
const route = (label, fn) => async (req, res) => {
    try { await fn(req, res); } catch (err) {
        console.error(`${label} failed`, err);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
};

// ---------- time ----------

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** ISO-8601 week id in UTC, e.g. "2026-W40" (sorts correctly as a string). */
function isoWeek(ms) {
    const d = new Date(ms);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Monday = 0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday of this week
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((date - firstThursday) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
const dayId = ms => new Date(ms).toISOString().slice(0, 10);
/** Milliseconds until the next Monday 00:00 UTC. */
function msToWeekEnd(ms) {
    const d = new Date(ms);
    const dayNum = (d.getUTCDay() + 6) % 7;
    const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayNum);
    return monday + 7 * DAY - ms;
}

// ---------- accounts and saves ----------

app.post('/api/register', async (req, res) => {
    if (!requireSecret(res)) return;
    const invalid = validateCredentials(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { username, password } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);
        const id = await store.createUser(username, hash);
        res.json({ token: signToken({ id, username }), message: 'Registration successful' });
    } catch (err) {
        if (err.code === '23505') { // Postgres unique violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('register failed', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', route('login', async (req, res) => {
    if (!requireSecret(res)) return;
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Invalid credentials' });
    const user = await store.findUserByName(username);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    res.json({ token: signToken(user), message: 'Login successful' });
}));

// Uploads are never rejected for looking odd — the save is the player's — but implausible jumps are
// flagged on the account, and flagged accounts are left out of leaderboards.
const OFFLINE_ALLOWANCE_MS = 25 * HOUR;       // the longest offline replay (24 h) plus slack
const XP_PER_HOUR_CEILING = 3_000_000;        // far above any skill's real rate, summed over skills
const PLAYTIME_SLACK_MS = 10 * 60 * 1000;
const FLAG_MEMORY_MS = 30 * DAY;

function totalXp(state) {
    return Object.values(state.skills || {}).reduce((sum, s) => sum + (Number(s && s.xp) || 0), 0);
}

/** Reasons a new save looks impossible next to the previous one (empty when it looks fine). */
function plausibilityFlags(prev, next, elapsedMs) {
    const flags = [];
    if (!prev) return flags;
    const playDelta = (Number(next.meta?.playtimeMs) || 0) - (Number(prev.meta?.playtimeMs) || 0);
    if (playDelta > elapsedMs + PLAYTIME_SLACK_MS) flags.push('playtime grew faster than real time');
    const xpDelta = totalXp(next) - totalXp(prev);
    if (xpDelta > XP_PER_HOUR_CEILING * (elapsedMs + OFFLINE_ALLOWANCE_MS) / HOUR) flags.push('XP grew faster than any play could');
    if ((Number(next.combat?.bestStage) || 0) < (Number(prev.combat?.bestStage) || 0)) flags.push('best stage went down');
    if ((Number(next.prestige?.tokens) || 0) < (Number(prev.prestige?.tokens) || 0)) flags.push('prestige tokens went down');
    return flags;
}

function recentlyFlagged(flagsJson, now) {
    try { return JSON.parse(flagsJson || '[]').some(f => now - f.at < FLAG_MEMORY_MS); } catch { return false; }
}

app.post('/api/save', authenticateToken, route('save', async (req, res) => {
    const state = req.body && req.body.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'No state provided' });
    if (!Number.isInteger(state.version) || state.version < 1 || state.version > MAX_SAVE_VERSION) {
        return res.status(400).json({ error: 'Unsupported save version' });
    }
    const savedAt = Date.now();
    const current = await store.getSave(req.user.id);
    let prev = null;
    try { prev = current && current.state ? JSON.parse(current.state) : null; } catch { prev = null; }
    const newFlags = plausibilityFlags(prev, state, savedAt - ((current && current.lastSaved) || savedAt));
    let flags = [];
    try { flags = JSON.parse((current && current.flags) || '[]'); } catch { flags = []; }
    if (newFlags.length) flags = [...flags, ...newFlags.map(reason => ({ at: savedAt, reason }))].slice(-20);
    await store.putSave(req.user.id, JSON.stringify(state), savedAt, JSON.stringify(flags));
    // "This week" leaderboards count from each player's first save of the week.
    if (current && current.optIn) {
        const { powerSummary } = await engine();
        await store.putSnapshotIfMissing(req.user.id, isoWeek(savedAt), JSON.stringify(powerSummary(state, savedAt)));
    }
    res.json({ success: true, timestamp: savedAt, flagged: newFlags.length > 0 });
}));

app.get('/api/load', authenticateToken, route('load', async (req, res) => {
    const current = await store.getSave(req.user.id);
    // serverNow lets the client measure time away on the server's clock, not its own.
    if (!current || !current.state) return res.json({ state: null, serverNow: Date.now() });
    res.json({ state: JSON.parse(current.state), lastSaved: current.lastSaved, serverNow: Date.now(), optIn: current.optIn });
}));

// ---------- clans ----------
// A clan fights one shared boss a week. Each member may attack three times a day; an attack deals
// the damage the member's stored save would do in 60 seconds (computed here, not sent by the
// client). The boss's health is sized from the members' power when the week's boss appears.

const CLAN_NAME_RE = /^[A-Za-z0-9 '_-]{3,32}$/;
const CLAN_TAG_RE = /^[A-Za-z0-9]{2,5}$/;
const MAX_MEMBERS = 20;
const ATTACKS_PER_DAY = 3;
const BOSS_ATTACKS_TO_KILL = 12;   // the boss holds about four days of everyone attacking every time
const MIN_BOSS_HP = 1000;
const REWARDS = {
    participation: { essence: 50, text: 'Clan boss: you fought this week' },
    top: [{ essence: 100, diamond: 1 }, { essence: 60, diamond: 1 }, { essence: 30, diamond: 1 }],
    kill: { essence: 100, diamond: 2, text: 'Clan boss defeated' },
    lastHit: { essence: 50, diamond: 1, text: 'Clan boss: the last hit' }
};

const cleanText = (value, max) => String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

async function memberPower(members, now) {
    const { powerSummary } = await engine();
    return members.map(m => {
        let summary = null;
        try { summary = m.state ? powerSummary(JSON.parse(m.state), now) : null; } catch { summary = null; }
        return { ...m, power: summary };
    });
}

/** Pay the weekly rewards (participation, top three) of any finished week of this clan. */
async function settleOldWeeks(clanId, now) {
    for (const boss of await store.unsettledBosses(clanId, isoWeek(now))) {
        const board = await store.weeklyDamage(clanId, boss.week);
        for (const [i, row] of board.entries()) {
            await store.addReward(row.userId, 'participation', JSON.stringify({ ...REWARDS.participation, week: boss.week }), now);
            if (i < REWARDS.top.length) {
                await store.addReward(row.userId, 'top', JSON.stringify({ ...REWARDS.top[i], text: `Clan boss: #${i + 1} damage in ${boss.week}`, week: boss.week }), now);
            }
        }
        await store.markSettled(clanId, boss.week);
    }
}

async function currentBoss(clanId, now) {
    const week = isoWeek(now);
    let boss = await store.getBoss(clanId, week);
    if (!boss) {
        const members = await memberPower(await store.clanMembers(clanId), now);
        const total = members.reduce((sum, m) => sum + (m.power ? m.power.attackDamage : 0), 0);
        boss = await store.createBoss(clanId, week, Math.max(MIN_BOSS_HP, total * BOSS_ATTACKS_TO_KILL));
    }
    return boss;
}

app.get('/api/clans', authenticateToken, route('clans', async (req, res) => {
    const search = cleanText(req.query.search, 32);
    res.json({ clans: await store.listClans(search, 50), maxMembers: MAX_MEMBERS });
}));

app.post('/api/clans', authenticateToken, route('create clan', async (req, res) => {
    const body = req.body || {};
    const name = cleanText(body.name, 32);
    const tag = cleanText(body.tag, 5).toUpperCase();
    if (!CLAN_NAME_RE.test(name)) return res.status(400).json({ error: 'Clan names are 3-32 letters, numbers, spaces, \' _ or -.' });
    if (!CLAN_TAG_RE.test(tag)) return res.status(400).json({ error: 'Tags are 2-5 letters or numbers.' });
    if (await store.membershipOf(req.user.id)) return res.status(400).json({ error: 'Leave your clan first.' });
    const now = Date.now();
    try {
        const clanId = await store.createClan({ name, tag, description: cleanText(body.description, 200), lookingFor: cleanText(body.lookingFor, 100), ownerId: req.user.id, now });
        await store.addMember(clanId, req.user.id, now);
        res.json({ clanId });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'That clan name is taken.' });
        throw err;
    }
}));

app.post('/api/clans/join', authenticateToken, route('join clan', async (req, res) => {
    const clanId = parseInt((req.body || {}).clanId, 10);
    const clan = Number.isInteger(clanId) ? await store.getClan(clanId) : null;
    if (!clan) return res.status(404).json({ error: 'No such clan.' });
    if (await store.membershipOf(req.user.id)) return res.status(400).json({ error: 'Leave your clan first.' });
    if ((await store.clanMembers(clanId)).length >= MAX_MEMBERS) return res.status(400).json({ error: 'That clan is full.' });
    await store.addMember(clanId, req.user.id, Date.now());
    res.json({ clanId });
}));

app.post('/api/clans/leave', authenticateToken, route('leave clan', async (req, res) => {
    const membership = await store.membershipOf(req.user.id);
    if (!membership) return res.status(400).json({ error: 'You are not in a clan.' });
    const clan = await store.getClan(membership.clanId);
    await store.removeMember(req.user.id);
    const rest = await store.clanMembers(membership.clanId);
    if (!rest.length) await store.deleteClan(membership.clanId);
    else if (clan && clan.ownerId === req.user.id) await store.setClanOwner(membership.clanId, rest[0].userId); // the longest-serving member
    res.json({ left: true });
}));

app.get('/api/clan', authenticateToken, route('clan', async (req, res) => {
    const now = Date.now();
    const membership = await store.membershipOf(req.user.id);
    if (!membership) return res.json({ clan: null });
    const clanId = membership.clanId;
    await settleOldWeeks(clanId, now);
    const [clan, members, boss] = await Promise.all([store.getClan(clanId), store.clanMembers(clanId).then(m => memberPower(m, now)), currentBoss(clanId, now)]);
    const board = await store.weeklyDamage(clanId, boss.week);
    const used = await store.attacksToday(req.user.id, dayId(now));
    const lastHit = boss.lastHitUser ? members.find(m => m.userId === boss.lastHitUser) : null;
    res.json({
        clan: { ...clan, isOwner: clan.ownerId === req.user.id },
        members: members.map(m => ({ username: m.username, owner: m.userId === clan.ownerId, you: m.userId === req.user.id, bestStage: m.power ? m.power.bestStage : 0, totalLevel: m.power ? m.power.totalLevel : 0, attackDamage: m.power ? m.power.attackDamage : 0 })),
        boss: { week: boss.week, maxHp: boss.maxHp, hp: boss.hp, killed: boss.killedAt > 0, lastHit: lastHit ? lastHit.username : null, endsInMs: msToWeekEnd(now) },
        board: board.map(r => ({ username: r.username, damage: r.damage, attacks: r.attacks, you: r.userId === req.user.id })),
        attacksLeft: Math.max(0, ATTACKS_PER_DAY - used),
        attacksPerDay: ATTACKS_PER_DAY,
        maxMembers: MAX_MEMBERS
    });
}));

app.post('/api/clan/attack', authenticateToken, route('clan attack', async (req, res) => {
    const now = Date.now();
    const membership = await store.membershipOf(req.user.id);
    if (!membership) return res.status(400).json({ error: 'Join a clan first.' });
    const clanId = membership.clanId;
    const day = dayId(now);
    const used = await store.attacksToday(req.user.id, day);
    const noneLeft = () => res.status(400).json({ error: 'No attacks left today — they refresh at midnight UTC.' });
    if (used >= ATTACKS_PER_DAY) return noneLeft();
    const save = await store.getSave(req.user.id);
    if (!save || !save.state) return res.status(400).json({ error: 'Save to the cloud first: the attack uses your stored hero.' });
    const boss = await currentBoss(clanId, now);
    if (boss.hp <= 0) return res.status(400).json({ error: 'This week\'s boss is already defeated.' });
    const { powerSummary } = await engine();
    const damage = Math.max(1, powerSummary(JSON.parse(save.state), now).attackDamage);
    try {
        await store.recordAttack({ clanId, userId: req.user.id, week: boss.week, day, slot: used + 1, damage, now });
    } catch (err) {
        if (err.code === '23505') return noneLeft(); // a parallel request took this slot
        throw err;
    }
    const after = await store.damageBoss(clanId, boss.week, damage);
    const killed = !!after && after.hp <= 0 && await store.markBossKilled(clanId, boss.week, req.user.id, now);
    if (killed) {
        for (const row of await store.weeklyDamage(clanId, boss.week)) {
            await store.addReward(row.userId, 'kill', JSON.stringify({ ...REWARDS.kill, week: boss.week }), now);
        }
        await store.addReward(req.user.id, 'lastHit', JSON.stringify({ ...REWARDS.lastHit, week: boss.week }), now);
    }
    res.json({ damage, hp: after ? after.hp : 0, maxHp: boss.maxHp, killed, attacksLeft: ATTACKS_PER_DAY - used - 1 });
}));

// ---------- rewards ----------

app.get('/api/rewards', authenticateToken, route('rewards', async (req, res) => {
    const rows = await store.unclaimedRewards(req.user.id);
    res.json({ rewards: rows.map(r => ({ id: r.id, kind: r.kind, ...JSON.parse(r.payload) })) });
}));

app.post('/api/rewards/claim', authenticateToken, route('claim rewards', async (req, res) => {
    const ids = Array.isArray((req.body || {}).ids) ? req.body.ids.map(n => parseInt(n, 10)).filter(Number.isInteger).slice(0, 100) : [];
    const claimed = await store.claimRewards(req.user.id, ids, Date.now());
    res.json({ rewards: claimed.map(r => ({ id: r.id, kind: r.kind, ...JSON.parse(r.payload) })) });
}));

// ---------- leaderboards (opt-in) ----------
// Only players who opted in are listed, only by username, only with numbers the server computed
// from their stored save; accounts flagged in the last 30 days are left out.

const METRICS = { bestStage: 'Best stage', totalLevel: 'Total level', titanKills: 'Titans defeated', dungeonClears: 'Dungeon clears' };
const BOARD_CACHE_MS = 60 * 1000;
const boardCache = new Map();

app.post('/api/leaderboard/consent', authenticateToken, route('consent', async (req, res) => {
    const optIn = !!(req.body || {}).optIn;
    await store.setOptIn(req.user.id, optIn);
    boardCache.clear();
    res.json({ optIn });
}));

app.get('/api/leaderboard', authenticateToken, route('leaderboard', async (req, res) => {
    const metric = METRICS[req.query.metric] ? req.query.metric : 'bestStage';
    const period = req.query.period === 'week' ? 'week' : 'all';
    const now = Date.now();
    const week = isoWeek(now);
    const key = `${metric}:${period}:${week}`;
    let rows = boardCache.get(key);
    if (!rows || now - rows.at > BOARD_CACHE_MS) {
        const { powerSummary } = await engine();
        const entries = [];
        for (const s of await store.optedInSaves()) {
            if (recentlyFlagged(s.flags, now)) continue;
            let value;
            try { value = powerSummary(JSON.parse(s.state), now)[metric]; } catch { continue; }
            if (period === 'week') {
                const snap = await store.getSnapshot(s.userId, week);
                if (!snap) continue;
                value -= JSON.parse(snap)[metric] || 0;
            }
            entries.push({ userId: s.userId, username: s.username, value });
        }
        entries.sort((a, b) => b.value - a.value || a.username.localeCompare(b.username));
        rows = { at: now, entries };
        boardCache.set(key, rows);
    }
    const mine = rows.entries.findIndex(e => e.userId === req.user.id);
    res.json({
        metric, label: METRICS[metric], period, week,
        entries: rows.entries.slice(0, 50).map((e, i) => ({ rank: i + 1, username: e.username, value: e.value, you: e.userId === req.user.id })),
        me: mine >= 0 ? { rank: mine + 1, value: rows.entries[mine].value } : null
    });
}));

// VERY IMPORTANT FOR VERCEL
module.exports = app;
module.exports.plausibilityFlags = plausibilityFlags;
module.exports.isoWeek = isoWeek;
