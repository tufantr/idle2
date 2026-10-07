const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const store = require('./store');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// A known secret would let anyone forge tokens, so the fallback exists only for local development
// (`vercel dev` sets NODE_ENV=development); anywhere else the API refuses to sign in without one.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-only-insecure-secret' : null);
const JWT_ALGORITHM = 'HS256';
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
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL, algorithm: JWT_ALGORITHM });
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

    jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, user) => {
        if (err || !user || !Number.isInteger(user.id)) return res.sendStatus(403);
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

// Rate limits: password guessing stops after a few tries per name and per address, and one address
// cannot make accounts by the hundred. A name with no account still costs a bcrypt check, so the time
// a wrong guess takes doesn't tell whether the name exists.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const MAX_NAME_FAILURES = 10;
const MAX_IP_FAILURES = 50;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS = 10;
const DUMMY_HASH = '$2b$10$ZMk5iy8eHTrQrJ0rEb/AOeTQMn3zrYOomc0x/UMLwi242hMY5Ytoe';
const clientIp = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
const TOO_MANY = { error: 'Too many attempts. Try again in a few minutes.' };

app.post('/api/register', async (req, res) => {
    if (!requireSecret(res)) return;
    const invalid = validateCredentials(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { username, password } = req.body;

    try {
        const regKey = `register:${clientIp(req)}`;
        if (await store.authFailures(regKey, Date.now(), REGISTER_WINDOW_MS) >= MAX_REGISTRATIONS) return res.status(429).json(TOO_MANY);
        await store.noteAuthFailure(regKey, Date.now(), REGISTER_WINDOW_MS);   // every registration counts
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
    const now = Date.now();
    const nameKey = `login:name:${username.toLowerCase().slice(0, 64)}`;
    const ipKey = `login:ip:${clientIp(req)}`;
    if (await store.authFailures(nameKey, now, AUTH_WINDOW_MS) >= MAX_NAME_FAILURES || await store.authFailures(ipKey, now, AUTH_WINDOW_MS) >= MAX_IP_FAILURES) {
        return res.status(429).json(TOO_MANY);
    }
    const user = await store.findUserByName(username);
    const validPassword = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !validPassword) {
        await store.noteAuthFailure(nameKey, now, AUTH_WINDOW_MS);
        await store.noteAuthFailure(ipKey, now, AUTH_WINDOW_MS);
        return res.status(400).json({ error: 'Invalid credentials' });
    }
    await store.clearAuthFailures(nameKey);
    res.json({ token: signToken(user), message: 'Login successful' });
}));

// Uploads are never rejected for looking odd (the save is the player's), but implausible numbers are
// flagged on the account. Flagged accounts are left out of leaderboards and don't size clan bosses.
// Offline progress happens inside the real time between two uploads, so that time is the allowance.
const XP_PER_HOUR_CEILING = 3_000_000;        // far above any skill's real rate, summed over skills
const SLACK_MS = 30 * 60 * 1000;              // clock drift and upload delays
const FLAG_MEMORY_MS = 30 * DAY;

function totalXp(state) {
    return Object.values(state.skills || {}).reduce((sum, s) => sum + (Number(s && s.xp) || 0), 0);
}
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
// Tokens one prestige can pay at a stage (BALANCE.prestige in src/core/formulas.js).
const tokensPerRun = stage => Math.pow(Math.max(0, (stage - 5) / 5), 1.5);

// Ranked numbers, read from the server's own reading of the save (powerSummary on the migrated save,
// the numbers the boards show; a raw field can't be dressed up): how fast each can honestly grow per
// hour of real time (plus a flat allowance; the best stage by its depth, `honestClimb` in
// src/core/power.js), and a ceiling no save reaches at all, checked on every upload including the first. Growth is measured from each number's highest value so far and when it
// was reached, so restoring a backup and coming forward again is never flagged.
const RANKED = [
    { key: 'bestStage', label: 'best stage', perHour: 60, flat: 30, ceiling: 3000, byDepth: true },   // (perHour, flat: only without honestClimb)
    { key: 'titanKills', label: 'Titans defeated', perHour: 1, flat: 2, ceiling: 20000 },
    { key: 'dungeonClears', label: 'dungeon clears', perHour: 3600, flat: 200, ceiling: 1e8 },
    { key: 'totalXp', label: 'total XP', perHour: XP_PER_HOUR_CEILING, flat: 0, ceiling: 13 * 2 * 13_034_431 },
    { key: 'tokens', label: 'prestige tokens', perHour: null, flat: 0, ceiling: 1e9 },
    // Stars come only with an Ascension (data/ascension.js): ten for each tenfold of tokens, at most a few a day
    { key: 'stars', label: 'Stars', perHour: 3, flat: 40, ceiling: 2000 }
];

/** Reasons a save's numbers look impossible next to their highest so far, and the new highs. */
function plausibilityFlags(peaks, metrics, now, plausibleAttackDamage, honestClimb = null) {
    const flags = [];
    const next = {};
    for (const r of RANKED) {
        const value = num(metrics[r.key]);
        const peak = peaks && peaks[r.key];
        if (value > r.ceiling) { flags.push(`${r.label} beyond any possible save`); if (peak) next[r.key] = peak; continue; }
        if (peak && Number.isFinite(peak.v)) {
            const hours = (Math.max(0, now - num(peak.at)) + SLACK_MS) / HOUR;
            // Tokens: at most one prestige every 10 minutes, each paying for the best stage reached, times
            // what the save's Stars and medals make a prestige pay (tokenGain, at least 1).
            const perHour = r.perHour ?? 6 * 2 * tokensPerRun(Math.max(10, num(metrics.bestStage))) * Math.max(1, num(metrics.tokenGain));
            const allowed = r.byDepth && honestClimb ? honestClimb(peak.v, hours) : r.flat + perHour * hours;
            if (value - peak.v > allowed) flags.push(`${r.label} grew faster than any play could`);
        }
        next[r.key] = peak && peak.v >= value ? peak : { v: value, at: now };
    }
    if (num(metrics.attackDamage) > plausibleAttackDamage(metrics.bestStage)) flags.push('attack beyond what its best stage allows');
    if (num(metrics.trialTiersBeyondBest) > 0) flags.push('Trial tiers beyond its best stage');
    if (num(metrics.laurelsBeyondWeeks) > 0) flags.push('more laurels than weeks played');
    if (num(metrics.weeklyTrial) > num(metrics.bestStage)) flags.push("the week's Trial past the best stage");
    return { flags, peaks: next };
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
    // The numbers other players see (boards, clan damage) are computed here, once per upload.
    const eng = await engine();
    let metrics = null;
    try { metrics = eng.powerSummary(state, savedAt); } catch (err) { console.error('metrics failed', err); }
    let newFlags = [];
    if (metrics) {
        const checked = plausibilityFlags(parseMetrics(current && current.metrics)?.peaks, metrics, savedAt, eng.plausibleAttackDamage, eng.honestClimb);
        newFlags = checked.flags;
        metrics.peaks = checked.peaks;
    }
    // The developer switches (every place open, a weekend event forced on) only work on a local host;
    // a save that carries them was not played by the rules the boards compare.
    const settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    if (settings.devUnlockAll === true || (typeof settings.forceEvent === 'string' && settings.forceEvent)) newFlags.push('developer switches on');
    let flags = [];
    try { flags = JSON.parse((current && current.flags) || '[]'); } catch { flags = []; }
    if (!Array.isArray(flags)) flags = [];
    if (newFlags.length) flags = [...flags, ...newFlags.map(reason => ({ at: savedAt, reason }))].slice(-20);
    await store.putSave(req.user.id, JSON.stringify(state), savedAt, JSON.stringify(flags), metrics ? JSON.stringify(metrics) : null);
    // "This week" leaderboards count from each player's first save of the week.
    if (metrics && current && current.optIn) await store.putSnapshotIfMissing(req.user.id, isoWeek(savedAt), JSON.stringify(metrics));
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
// Damage and boss health stay exact integers in JavaScript and fit Postgres BIGINT, whatever a save says.
const MAX_ATTACK_DAMAGE = 1e14;
const MAX_BOSS_HP = 4e15;
const safeDamage = v => (Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), MAX_ATTACK_DAMAGE) : 0);
const REWARDS = {
    participation: { essence: 50, text: 'Clan boss: you fought this week' },
    top: [{ essence: 100, diamond: 1 }, { essence: 60, diamond: 1 }, { essence: 30, diamond: 1 }],
    kill: { essence: 100, diamond: 2, text: 'Clan boss defeated' },
    lastHit: { essence: 50, diamond: 1, text: 'Clan boss: the last hit' }
};

const cleanText = (value, max) => String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

/** A member's stored numbers (computed when they last saved), or null. */
function parseMetrics(json) {
    try { const m = json ? JSON.parse(json) : null; return m && typeof m === 'object' ? m : null; } catch { return null; }
}

/** Pay the weekly rewards (participation, top three) of any finished week of this clan, at most once. */
async function settleOldWeeks(clanId, now) {
    for (const boss of await store.unsettledBosses(clanId, isoWeek(now))) {
        if (!(await store.claimSettlement(clanId, boss.week))) continue; // a parallel request is paying it
        const board = await store.weeklyDamage(clanId, boss.week);
        for (const [i, row] of board.entries()) {
            // Once per player per week, even if they fought for several clans that week.
            await store.addReward(row.userId, 'participation', JSON.stringify({ ...REWARDS.participation, week: boss.week }), now, `participation:${row.userId}:${boss.week}`);
            if (i < REWARDS.top.length) {
                await store.addReward(row.userId, 'top', JSON.stringify({ ...REWARDS.top[i], text: `Clan boss: #${i + 1} damage in ${boss.week}`, week: boss.week }), now, `top:${row.userId}:${boss.week}`);
            }
        }
    }
}

async function currentBoss(clanId, now) {
    const week = isoWeek(now);
    let boss = await store.getBoss(clanId, week);
    if (!boss) {
        // Flagged members don't count, and no member counts for more than their best stage allows, so
        // one implausible save can't make the boss unbeatable. Each share is kept: a member who leaves
        // (or is removed) before fighting takes theirs away again.
        const { plausibleAttackDamage } = await engine();
        const members = (await store.clanMembers(clanId)).filter(m => !recentlyFlagged(m.flags, now));
        const shares = members.map(m => {
            const metrics = parseMetrics(m.metrics);
            const damage = Math.min(safeDamage(metrics?.attackDamage), safeDamage(plausibleAttackDamage(metrics?.bestStage)));
            return { userId: m.userId, share: Math.min(MAX_BOSS_HP, damage * BOSS_ATTACKS_TO_KILL) };
        }).filter(s => s.share > 0);
        const total = shares.reduce((sum, s) => sum + s.share, 0);
        boss = await store.createBoss(clanId, week, Math.min(MAX_BOSS_HP, Math.max(MIN_BOSS_HP, total)), shares);
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
    let clanId;
    try {
        clanId = await store.createClan({ name, tag, description: cleanText(body.description, 200), lookingFor: cleanText(body.lookingFor, 100), ownerId: req.user.id, now });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'That clan name is taken.' });
        throw err;
    }
    try {
        await store.addMember(clanId, req.user.id, now, MAX_MEMBERS);
    } catch (err) {
        await store.deleteClan(clanId); // a parallel request put this player in another clan: no empty clans
        if (err.code === '23505') return res.status(400).json({ error: 'Leave your clan first.' });
        throw err;
    }
    res.json({ clanId });
}));

app.post('/api/clans/join', authenticateToken, route('join clan', async (req, res) => {
    const clanId = parseInt((req.body || {}).clanId, 10);
    const clan = Number.isInteger(clanId) ? await store.getClan(clanId) : null;
    if (!clan) return res.status(404).json({ error: 'No such clan.' });
    if (await store.membershipOf(req.user.id)) return res.status(400).json({ error: 'Leave your clan first.' });
    let joined;
    try { joined = await store.addMember(clanId, req.user.id, Date.now(), MAX_MEMBERS); } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Leave your clan first.' });
        throw err;
    }
    if (!joined) return res.status(400).json({ error: 'That clan is full.' });
    res.json({ clanId });
}));

// The owner can remove a member (a griefer, or someone long gone). Their damage stays on the board.
app.post('/api/clan/kick', authenticateToken, route('kick', async (req, res) => {
    const membership = await store.membershipOf(req.user.id);
    if (!membership) return res.status(400).json({ error: 'You are not in a clan.' });
    const clan = await store.getClan(membership.clanId);
    // 409, not 403: the client reads 401 and 403 as a lost session and would log the player out.
    if (!clan || clan.ownerId !== req.user.id) return res.status(409).json({ error: 'Only the clan owner can remove members.' });
    const username = String((req.body || {}).username || '');
    const target = (await store.clanMembers(membership.clanId)).find(m => m.username === username);
    if (!target) return res.status(404).json({ error: 'No such member.' });
    if (target.userId === req.user.id) return res.status(400).json({ error: 'Leave the clan instead.' });
    await store.removeShare(membership.clanId, isoWeek(Date.now()), target.userId, MIN_BOSS_HP);   // their part of this week's boss goes with them, if they never fought it
    await store.removeMember(target.userId);
    res.json({ removed: username });
}));

app.post('/api/clans/leave', authenticateToken, route('leave clan', async (req, res) => {
    const membership = await store.membershipOf(req.user.id);
    if (!membership) return res.status(400).json({ error: 'You are not in a clan.' });
    const clan = await store.getClan(membership.clanId);
    await store.removeShare(membership.clanId, isoWeek(Date.now()), req.user.id, MIN_BOSS_HP);   // their part of this week's boss goes with them, if they never fought it
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
    const [clan, rawMembers, boss] = await Promise.all([store.getClan(clanId), store.clanMembers(clanId), currentBoss(clanId, now)]);
    const members = rawMembers.map(m => ({ ...m, power: parseMetrics(m.metrics) }));
    const board = await store.weeklyDamage(clanId, boss.week);
    const used = await store.attacksToday(req.user.id, dayId(now));
    const lastHit = boss.lastHitUser ? members.find(m => m.userId === boss.lastHitUser) : null;
    res.json({
        clan: { ...clan, isOwner: clan.ownerId === req.user.id },
        members: members.map(m => ({ username: m.username, owner: m.userId === clan.ownerId, you: m.userId === req.user.id, bestStage: num(m.power?.bestStage), totalLevel: num(m.power?.totalLevel), attackDamage: safeDamage(m.power?.attackDamage) })),
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
    const defeated = () => res.status(400).json({ error: 'This week\'s boss is already defeated.' });
    if (boss.hp <= 0) return defeated();
    const damage = Math.max(1, safeDamage(parseMetrics(save.metrics)?.attackDamage));
    const slot = used + 1;
    try {
        await store.recordAttack({ clanId, userId: req.user.id, week: boss.week, day, slot, damage, now });
    } catch (err) {
        if (err.code === '23505') return noneLeft(); // a parallel request took this slot
        throw err;
    }
    const after = await store.damageBoss(clanId, boss.week, damage);
    if (!after) { await store.deleteAttack(req.user.id, day, slot); return defeated(); } // it fell to a parallel hit
    const killed = after.hp <= 0 && await store.markBossKilled(clanId, boss.week, req.user.id, now);
    if (killed) {
        for (const row of await store.weeklyDamage(clanId, boss.week)) {
            await store.addReward(row.userId, 'kill', JSON.stringify({ ...REWARDS.kill, week: boss.week }), now, `kill:${row.userId}:${boss.week}`);
        }
        await store.addReward(req.user.id, 'lastHit', JSON.stringify({ ...REWARDS.lastHit, week: boss.week }), now, `lastHit:${req.user.id}:${boss.week}`);
    }
    res.json({ damage, hp: after.hp, maxHp: boss.maxHp, killed, attacksLeft: ATTACKS_PER_DAY - used - 1 });
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

const METRICS = { bestStage: 'Best stage', totalLevel: 'Total level', titanKills: 'Titans defeated', dungeonClears: 'Dungeon clears', weeklyTrial: "This week's Trial" };
// The week's Trial (src/data/trials.js) is a weekly number already: only this week's saves count on its board.
const BOARD_CACHE_MS = 60 * 1000;
const boardCache = new Map();

app.post('/api/leaderboard/consent', authenticateToken, route('consent', async (req, res) => {
    const optIn = !!(req.body || {}).optIn;
    await store.setOptIn(req.user.id, optIn);
    boardCache.clear();
    res.json({ optIn });
}));

app.get('/api/leaderboard', authenticateToken, route('leaderboard', async (req, res) => {
    const metric = Object.hasOwn(METRICS, req.query.metric) ? req.query.metric : 'bestStage';
    const period = req.query.period === 'week' && metric !== 'weeklyTrial' ? 'week' : 'all';
    const now = Date.now();
    const week = isoWeek(now);
    const trialWeek = metric === 'weeklyTrial' ? (await engine()).trialWeekStart(now) : 0;
    const key = `${metric}:${period}:${week}:${trialWeek}`;
    let rows = boardCache.get(key);
    if (!rows || now - rows.at > BOARD_CACHE_MS) {
        const entries = [];
        for (const r of await store.leaderboardRows(week)) {
            if (recentlyFlagged(r.flags, now)) continue;
            const metrics = parseMetrics(r.metrics);
            let value = num(metrics?.[metric]);
            if (metric === 'weeklyTrial' && (num(metrics?.weeklyTrialWeek) !== trialWeek || value <= 0)) continue;   // last week's, or none
            if (period === 'week') {
                const snap = parseMetrics(r.weekMetrics);
                if (!snap) continue;
                value -= num(snap[metric]);
            }
            entries.push({ userId: r.userId, username: r.username, value });
        }
        entries.sort((a, b) => b.value - a.value || a.username.localeCompare(b.username));
        rows = { at: now, entries };
        boardCache.set(key, rows);
    }
    const mine = rows.entries.findIndex(e => e.userId === req.user.id);
    res.json({
        metric, label: METRICS[metric], period, week, optIn: !!(await store.getSave(req.user.id))?.optIn,
        entries: rows.entries.slice(0, 50).map((e, i) => ({ rank: i + 1, username: e.username, value: e.value, you: e.userId === req.user.id })),
        me: mine >= 0 ? { rank: mine + 1, value: rows.entries[mine].value } : null
    });
}));

// VERY IMPORTANT FOR VERCEL
module.exports = app;
module.exports.plausibilityFlags = plausibilityFlags;
module.exports.isoWeek = isoWeek;
