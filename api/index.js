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
// Whether the online side works, for the owner and the deploy check: the database answers (and has
// its tables), the signing secret is set, and the game's stat code loads in the function. Booleans
// only, nothing secret; it answers before the schema gate below so it can say which part is missing.
app.get('/api/health', async (req, res) => {
    const ok = fn => fn().then(() => true, err => { console.error('health:', err && err.message); return false; });
    // the database asked every time (the schema is made once per instance, and said yes ever after)
    const [db, game] = await Promise.all([ok(() => ensureSchema().then(() => store.ping())), ok(engine)]);
    const secret = !!JWT_SECRET;
    res.set('Cache-Control', 'no-store');
    res.status(db && secret && game ? 200 : 503).json({ ok: db && secret && game, db, secret, game, region: process.env.VERCEL_REGION || null });
});

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

// A token names an account by id and name; the name must still be that id's (a database made anew under
// the same secret would otherwise hand an old token whoever has that id now). Kept a while per instance.
const NAME_CHECK_MS = 10 * 60 * 1000;
const namesSeen = new Map();
async function tokenStillValid(user) {
    const seen = namesSeen.get(user.id);
    if (seen && Date.now() - seen.at < NAME_CHECK_MS) return seen.name === user.username;
    const name = await store.userNameOf(user.id);
    namesSeen.set(user.id, { name, at: Date.now() });
    return name !== null && name === user.username;
}

const authenticateToken = (req, res, next) => {
    if (!requireSecret(res)) return;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, user) => {
        if (err || !user || !Number.isInteger(user.id)) return res.sendStatus(403);
        tokenStillValid(user).then(valid => {
            if (!valid) return res.sendStatus(401);
            req.user = user;
            next();
        }, error => {
            console.error('token check failed', error);
            res.status(503).json({ error: 'Database unavailable' });
        });
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
const dayNumber = ms => Math.floor(ms / DAY);   // UTC days since 1970: clan attacks come with each new one
/** Milliseconds until the next Monday 00:00 UTC. */
/** Time left until the next UTC midnight (a new day: attacks come, and a felled boss comes back). */
const msToDayEnd = ms => (Math.floor(ms / DAY) + 1) * DAY - ms;

function msToWeekEnd(ms) {
    const d = new Date(ms);
    const dayNum = (d.getUTCDay() + 6) % 7;
    const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayNum);
    return monday + 7 * DAY - ms;
}

// ---------- accounts and saves ----------

// Rate limits: password guessing stops after a few tries per name from one address, and a looser limit
// per name from everywhere and per address; one address cannot make accounts by the hundred. Each try is
// counted before the password is checked, in one statement (counted after, a burst of parallel tries all
// got in). Ten wrong tries from anywhere no longer lock a player out: from their own address they still
// get in. A name with no account still costs a bcrypt check, so the time a wrong guess takes doesn't tell
// whether the name exists.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const MAX_NAME_FAILURES = 10;    // per name, from one address
const MAX_NAME_TOTAL = 100;      // per name, from every address
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
        // every registration counts, before any work is done
        if (await store.takeAttempt(`register:${clientIp(req)}`.slice(0, 120), Date.now(), REGISTER_WINDOW_MS) > MAX_REGISTRATIONS) return res.status(429).json(TOO_MANY);
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
    const name = username.toLowerCase().slice(0, 64);
    const ip = clientIp(req);
    const keys = { nameIp: `login:name:${name}:${ip}`.slice(0, 120), name: `login:name:${name}`, ip: `login:ip:${ip}`.slice(0, 120) };
    const counts = {};
    for (const [k, key] of Object.entries(keys)) counts[k] = await store.takeAttempt(key, now, AUTH_WINDOW_MS);
    if (counts.nameIp > MAX_NAME_FAILURES || counts.name > MAX_NAME_TOTAL || counts.ip > MAX_IP_FAILURES) return res.status(429).json(TOO_MANY);
    const user = await store.findUserByName(username);
    const validPassword = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    // the right password: the tries from here are forgotten, and this one is given back to the others
    await store.clearAuthFailures(keys.nameIp);
    await store.refundAttempt(keys.name);
    await store.refundAttempt(keys.ip);
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
    // The cloud save the game had seen (`base`, its last_saved): an upload made over another device's
    // newer one is refused, and the game asks the player which to keep (src/main.js). A page from before
    // this sends none, and its upload is stored as before.
    const base = Number.isSafeInteger(req.body.base) && req.body.base >= 0 ? req.body.base : null;
    const savedAt = Date.now();
    const current = await store.getSave(req.user.id);
    if (base !== null && current && (current.lastSaved || 0) !== base) return res.status(409).json({ error: 'Another device saved since this game last looked.', lastSaved: current.lastSaved || 0 });
    // The numbers other players see (boards, clan damage) are computed here, once per upload.
    const eng = await engine();
    const previous = parseMetrics(current && current.metrics);
    let metrics = null;
    try { metrics = eng.powerSummary(state, savedAt); } catch (err) { console.error('metrics failed', err); }
    let newFlags = [];
    if (metrics) {
        const checked = plausibilityFlags(previous?.peaks, metrics, savedAt, eng.plausibleAttackDamage, eng.honestClimb);
        newFlags = checked.flags;
        metrics.peaks = checked.peaks;
        // the hero's attack at its best this past week: the clan boss is sized from it, so a weak save
        // uploaded just before Monday doesn't make the week's boss small (an Ascension's dip lasts a week)
        const was = previous?.attackPeak;
        const attack = safeDamage(metrics.attackDamage);
        metrics.attackPeak = was && Number.isFinite(was.v) && was.v > attack && savedAt - num(was.at) < 7 * DAY ? was : { v: attack, at: savedAt };
    } else if (previous) {
        // a save the server can't read keeps the numbers (and the highs) it had: wiping them let the next
        // forged save skip the growth checks
        metrics = previous;
        newFlags.push('a save the server could not read');
    }
    // The developer switches (every place open, a weekend event forced on) only work on a local host;
    // a save that carries them was not played by the rules the boards compare.
    const settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    if (settings.devUnlockAll === true || (typeof settings.forceEvent === 'string' && settings.forceEvent)) newFlags.push('developer switches on');
    let flags = [];
    try { flags = JSON.parse((current && current.flags) || '[]'); } catch { flags = []; }
    if (!Array.isArray(flags)) flags = [];
    if (newFlags.length) flags = [...flags, ...newFlags.map(reason => ({ at: savedAt, reason }))].slice(-20);
    const stored = await store.putSave(req.user.id, JSON.stringify(state), savedAt, JSON.stringify(flags), metrics ? JSON.stringify(metrics) : null, base);
    if (!stored) return res.status(409).json({ error: 'Another device saved since this game last looked.' });   // a parallel upload got there first
    // "This week" leaderboards count from where the player stood when the week began: the numbers stored
    // before this upload (the first upload of the week, an empty one say, made the whole week's gain).
    if (metrics && current && current.optIn) await store.putSnapshotIfMissing(req.user.id, isoWeek(savedAt), JSON.stringify(previous || metrics));
    res.json({ success: true, timestamp: savedAt, flagged: newFlags.length > 0, gifts: await store.unclaimedGiftCount(req.user.id) });
}));

app.get('/api/load', authenticateToken, route('load', async (req, res) => {
    const current = await store.getSave(req.user.id);
    const gifts = await store.unclaimedGiftCount(req.user.id);   // waiting gifts: the game claims them next
    // serverNow lets the client measure time away on the server's clock, not its own.
    if (!current || !current.state) return res.json({ state: null, serverNow: Date.now(), gifts });
    res.json({ state: JSON.parse(current.state), lastSaved: current.lastSaved, serverNow: Date.now(), optIn: current.optIn, gifts });
}));

// ---------- clans ----------
// A clan fights one shared boss a week. An attack is a short fight against it in the game
// (CLAN_ATTACK_SECONDS, src/systems/clanfight.js): the page sends only when the player struck, and the
// damage is reckoned here from the member's stored save and those strikes (src/core/power.js
// clanAttackFromSave), never sent by the client. Three attacks come each day and wait, up to six. The
// boss's health is sized from the members' power when the week's boss appears. When it falls, it comes back
// at the next UTC midnight as the next level, twice as strong (BOSS_LEVEL_GROWTH), until Monday brings a
// new boss at level 1: at most one kill a day, so at most seven a week.

const CLAN_NAME_RE = /^[A-Za-z0-9 '_-]{3,32}$/;
const CLAN_TAG_RE = /^[A-Za-z0-9]{2,5}$/;
const MAX_MEMBERS = 20;
const BOSS_ATTACKS_TO_KILL = 12;   // the boss holds about four days of everyone attacking every time
const BOSS_LEVEL_GROWTH = 2;       // each level back after a kill: twice the last
const ACTIVE_WITHIN = 7 * DAY;    // a member counts toward Monday's boss only if they played (uploaded) this past week
// An account whose saves showed impossible numbers (recentlyFlagged) deals at most this share of the boss's
// health an attack: a forged save once felled a boss with one attack of the 100T ceiling. Everyone else
// deals what their hero does (a cap of a seventh for all came first, and hid honest players' real damage).
const FLAGGED_ATTACK_SHARE = 0.01;
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

/**
 * The kill's rewards (everyone who fought that level, and the last hit), paid once the kill is marked.
 * Each reward has its own dedupe key, so paying again pays nothing twice: a payout that failed half way
 * is finished by the next look at the clan (kill_paid says it is done). Level 1 keeps the keys from before
 * levels, so a week felled then is never paid twice.
 */
async function payKill(clanId, boss, now) {
    const level = boss.level || 1;
    const tag = level > 1 ? `:L${level}` : '';
    const named = text => (level > 1 ? `${text} (level ${level})` : text);
    for (const userId of await store.levelFighters(clanId, boss.week, level)) {
        await store.addReward(userId, 'kill', JSON.stringify({ ...REWARDS.kill, text: named(REWARDS.kill.text), week: boss.week, level }), now, `kill:${userId}:${boss.week}${tag}`);
    }
    if (boss.lastHitUser) await store.addReward(boss.lastHitUser, 'lastHit', JSON.stringify({ ...REWARDS.lastHit, text: named(REWARDS.lastHit.text), week: boss.week, level }), now, `lastHit:${boss.lastHitUser}:${boss.week}${tag}`);
    await store.markKillPaid(clanId, boss.week);
}

/**
 * Pay the weekly rewards (participation, top three) of any finished week of this clan, then mark it
 * settled: paid first (the dedupe keys pay each once), so a failure half way leaves it to be finished.
 */
async function settleOldWeeks(clanId, now) {
    for (const boss of await store.unsettledBosses(clanId, isoWeek(now))) {
        if (boss.killedAt > 0 && !boss.killPaid) await payKill(clanId, boss, now);
        const board = await store.weeklyDamage(clanId, boss.week);
        for (const [i, row] of board.entries()) {
            // Once per player per week, even if they fought for several clans that week.
            await store.addReward(row.userId, 'participation', JSON.stringify({ ...REWARDS.participation, week: boss.week }), now, `participation:${row.userId}:${boss.week}`);
            if (i < REWARDS.top.length) {
                await store.addReward(row.userId, 'top', JSON.stringify({ ...REWARDS.top[i], text: `Clan boss: #${i + 1} damage in ${boss.week}`, week: boss.week }), now, `top:${row.userId}:${boss.week}`);
            }
        }
        await store.claimSettlement(clanId, boss.week);
    }
}

/** A member's part of a boss: their attack at its best this week, never more than their best stage allows. */
function shareOf(m, plausibleAttackDamage) {
    const metrics = parseMetrics(m.metrics);
    const attack = Math.max(safeDamage(metrics?.attackDamage), safeDamage(metrics?.attackPeak?.v));
    const damage = Math.min(attack, safeDamage(plausibleAttackDamage(metrics?.bestStage)));
    return Math.min(MAX_BOSS_HP, damage * BOSS_ATTACKS_TO_KILL);
}

/**
 * The week's boss made the size of the clan as it is now: the parts of those in it, and of those who left
 * no more than the damage they dealt. Leaving no longer takes a part that coming back doesn't return
 * (leave and come back, each member in turn, and the boss had 1 health), and a stranger who joins, hits it
 * once and leaves takes their whole part with them.
 */
async function resizeBoss(clanId, now) {
    const week = isoWeek(now);
    const boss = await store.getBoss(clanId, week);
    if (!boss || boss.hp <= 0) return;
    const [shares, members, board] = await Promise.all([store.bossShares(clanId, week), store.clanMembers(clanId), store.weeklyDamage(clanId, week)]);
    if (!shares.length) return;
    const here = new Set(members.map(m => m.userId));
    const dealt = new Map(board.map(r => [r.userId, r.damage]));
    const total = shares.reduce((sum, sh) => sum + (here.has(sh.userId) ? sh.share : Math.min(sh.share, dealt.get(sh.userId) || 0)), 0);
    const doublings = BOSS_LEVEL_GROWTH ** ((boss.level || 1) - 1);   // the shares size level 1
    await store.resizeBoss(clanId, week, Math.min(MAX_BOSS_HP, Math.max(MIN_BOSS_HP, total) * doublings));
}

/**
 * The player's clan, if it still exists: a member left in a clan deleted under them (its last member
 * left as they joined) is taken out of it, so they can make or join another.
 */
async function clanOf(userId) {
    const membership = await store.membershipOf(userId);
    if (!membership) return null;
    const clan = await store.getClan(membership.clanId);
    if (clan) return { membership, clan };
    await store.removeMember(userId);
    return null;
}
const validId = id => Number.isInteger(id) && id > 0 && id < 2 ** 31;   // a Postgres integer (a bigger one was a 500)

async function currentBoss(clanId, now) {
    const week = isoWeek(now);
    let boss = await store.getBoss(clanId, week);
    if (!boss) {
        // Flagged members don't count, nor members who haven't played this past week (one away shouldn't make
        // it bigger for the rest), and no member counts for more than their best stage allows, so one
        // implausible save can't make the boss unbeatable. Each share is kept: a member who leaves (or is
        // removed) before fighting takes theirs away again.
        const { plausibleAttackDamage } = await engine();
        const members = (await store.clanMembers(clanId)).filter(m => !recentlyFlagged(m.flags, now) && now - (m.lastSaved || 0) < ACTIVE_WITHIN);
        const shares = members.map(m => ({ userId: m.userId, share: shareOf(m, plausibleAttackDamage) })).filter(sh => sh.share > 0);
        const total = shares.reduce((sum, s) => sum + s.share, 0);
        boss = await store.createBoss(clanId, week, Math.min(MAX_BOSS_HP, Math.max(MIN_BOSS_HP, total)), shares);
    }
    // Felled on an earlier day of this week: it is back as the next level, twice as strong (its kill paid
    // first, so a payout half done is never lost; the store moves it once, whoever asks at the same time).
    if (boss.killedAt > 0 && dayNumber(now) > dayNumber(boss.killedAt)) {
        if (!boss.killPaid) await payKill(clanId, boss, now);
        await store.nextLevel(clanId, week, boss.level, boss.killedAt, Math.min(MAX_BOSS_HP, boss.maxHp * BOSS_LEVEL_GROWTH));
        boss = await store.getBoss(clanId, week);
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
    if (await clanOf(req.user.id)) return res.status(400).json({ error: 'Leave your clan first.' });
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
    const clan = validId(clanId) ? await store.getClan(clanId) : null;
    if (!clan) return res.status(404).json({ error: 'No such clan.' });
    if (await clanOf(req.user.id)) return res.status(400).json({ error: 'Leave your clan first.' });
    let joined;
    try { joined = await store.addMember(clanId, req.user.id, Date.now(), MAX_MEMBERS); } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Leave your clan first.' });
        throw err;
    }
    if (!joined) return res.status(400).json({ error: 'That clan is full.' });
    // its last member may have left it as this one joined: then it is gone, and so is the membership
    if (!(await store.getClan(clanId))) { await store.removeMember(req.user.id); return res.status(404).json({ error: 'No such clan.' }); }
    await resizeBoss(clanId, Date.now());   // back in the clan the same week: their part of its boss comes back
    res.json({ clanId });
}));

// The owner can remove a member (a griefer, or someone long gone). Their damage stays on the board.
app.post('/api/clan/kick', authenticateToken, route('kick', async (req, res) => {
    const mine = await clanOf(req.user.id);
    if (!mine) return res.status(400).json({ error: 'You are not in a clan.' });
    const { membership, clan } = mine;
    // 409, not 403: the client reads 401 and 403 as a lost session and would log the player out.
    if (clan.ownerId !== req.user.id) return res.status(409).json({ error: 'Only the clan owner can remove members.' });
    const username = String((req.body || {}).username || '');
    const target = (await store.clanMembers(membership.clanId)).find(m => m.username === username);
    if (!target) return res.status(404).json({ error: 'No such member.' });
    if (target.userId === req.user.id) return res.status(400).json({ error: 'Leave the clan instead.' });
    await store.removeMember(target.userId);
    await resizeBoss(membership.clanId, Date.now());   // their part of this week's boss goes with them, but what they dealt
    res.json({ removed: username });
}));

app.post('/api/clans/leave', authenticateToken, route('leave clan', async (req, res) => {
    const mine = await clanOf(req.user.id);
    if (!mine) return res.status(400).json({ error: 'You are not in a clan.' });
    const { membership, clan } = mine;
    await store.removeMember(req.user.id);
    const rest = await store.clanMembers(membership.clanId);
    if (!rest.length) await store.deleteClan(membership.clanId);
    else {
        if (clan.ownerId === req.user.id) await store.setClanOwner(membership.clanId, rest[0].userId); // the longest-serving member
        await resizeBoss(membership.clanId, Date.now());   // their part of this week's boss goes with them, but what they dealt
    }
    res.json({ left: true });
}));

app.get('/api/clan', authenticateToken, route('clan', async (req, res) => {
    const now = Date.now();
    const mine = await clanOf(req.user.id);
    if (!mine) return res.json({ clan: null });
    const { clan } = mine;
    const clanId = clan.id;
    await settleOldWeeks(clanId, now);
    const [rawMembers, boss] = await Promise.all([store.clanMembers(clanId), currentBoss(clanId, now)]);
    if (boss.killedAt > 0 && !boss.killPaid) await payKill(clanId, boss, now);   // a payout that failed half way
    const members = rawMembers.map(m => ({ ...m, power: parseMetrics(m.metrics) }));
    const board = await store.weeklyDamage(clanId, boss.week);
    const { CLAN_ATTACKS_PER_DAY: perDay, CLAN_ATTACK_BANK: bank, CLAN_ATTACK_SECONDS: seconds } = await engine();
    const attacksLeft = await store.chargesNow(req.user.id, dayNumber(now), perDay, bank);
    const lastHit = boss.lastHitUser ? members.find(m => m.userId === boss.lastHitUser) : null;
    res.json({
        clan: { ...clan, isOwner: clan.ownerId === req.user.id },
        members: members.map(m => ({ username: m.username, owner: m.userId === clan.ownerId, you: m.userId === req.user.id, bestStage: num(m.power?.bestStage), totalLevel: num(m.power?.totalLevel), attackDamage: safeDamage(m.power?.attackDamage) })),
        boss: { week: boss.week, level: boss.level, maxHp: boss.maxHp, hp: boss.hp, killed: boss.killedAt > 0, lastHit: lastHit ? lastHit.username : null, endsInMs: msToWeekEnd(now), nextInMs: msToDayEnd(now) },
        board: board.map(r => ({ username: r.username, damage: r.damage, attacks: r.attacks, you: r.userId === req.user.id })),
        attacksLeft,
        attacksPerDay: perDay,
        attackBank: bank,
        fightSeconds: seconds,
        maxMembers: MAX_MEMBERS
    });
}));

app.post('/api/clan/attack', authenticateToken, route('clan attack', async (req, res) => {
    const now = Date.now();
    const eng = await engine();
    const { CLAN_ATTACKS_PER_DAY: perDay, CLAN_ATTACK_BANK: bank } = eng;
    const mine = await clanOf(req.user.id);
    if (!mine) return res.status(400).json({ error: 'Join a clan first.' });
    const clanId = mine.clan.id;
    const body = req.body || {};
    // The fight's own mark (when it ended, in the game): sent again after an answer was lost, it is the
    // attack already made, answered again as it was, and no second attack is spent.
    const fightAt = Number.isSafeInteger(body.fightAt) && body.fightAt > 0 ? body.fightAt : null;
    const answerAgain = async earlier => {
        const boss = await store.getBoss(earlier.clanId, earlier.week);
        const board = await store.weeklyDamage(earlier.clanId, earlier.week);
        return res.json({
            damage: earlier.damage, strikes: 0, hp: boss ? boss.hp : 0, maxHp: boss ? boss.maxHp : 0,
            killed: !!boss && boss.killedAt === earlier.at && boss.lastHitUser === req.user.id,
            attacksLeft: await store.chargesNow(req.user.id, dayNumber(now), perDay, bank),
            rank: board.findIndex(r => r.userId === req.user.id) + 1, of: board.length, week: earlier.week, again: true
        });
    };
    if (fightAt) { const earlier = await store.attackByFight(req.user.id, fightAt); if (earlier) return answerAgain(earlier); }
    const save = await store.getSave(req.user.id);
    if (!save || !save.state) return res.status(400).json({ error: 'Save to the cloud first: the attack uses your stored hero.' });
    const boss = await currentBoss(clanId, now);
    const defeated = () => res.status(400).json({ error: 'The boss is down: it comes back at midnight UTC, twice as strong.' });
    if (boss.hp <= 0) return defeated();
    // The fight as the player fought it: when they struck, and how long it lasted (a page from before
    // the fight sends neither: a whole fight without a strike). The damage is reckoned here, from the
    // stored hero; no save can deal more than twice what its best stage allows, and an account flagged for
    // impossible numbers no more than a sliver of the boss (FLAGGED_ATTACK_SHARE).
    let fight = null;
    try { fight = eng.clanAttackFromSave(JSON.parse(save.state), body.strikes, body.ms, now); } catch (err) { console.error('clan fight failed', err); }
    const cap = safeDamage(eng.plausibleAttackDamage(parseMetrics(save.metrics)?.bestStage) * 2) || MAX_ATTACK_DAMAGE;
    const reckoned = Math.max(1, Math.min(safeDamage(fight?.damage), cap));
    const damage = recentlyFlagged(save.flags, now) ? Math.min(reckoned, Math.max(1, Math.ceil(boss.maxHp * FLAGGED_ATTACK_SHARE))) : reckoned;
    const left = await store.spendCharge(req.user.id, dayNumber(now), perDay, bank);
    if (left === null) return res.status(400).json({ error: `No attacks waiting: ${perDay} more come each day (midnight UTC), up to ${bank}.` });
    const day = dayId(now);
    let slot;
    try {
        slot = await store.recordAttack({ clanId, userId: req.user.id, week: boss.week, day, damage, now, fightAt, level: boss.level });
    } catch (err) {
        await store.refundCharge(req.user.id, bank);   // not recorded: the attack waits again
        if (err.code === '23505' && err.constraint === 'clan_attacks_fight') {   // the same fight, sent twice at once
            const earlier = await store.attackByFight(req.user.id, fightAt);
            if (earlier) return answerAgain(earlier);
        }
        throw err;
    }
    const after = await store.damageBoss(clanId, boss.week, damage);
    if (!after) { await store.deleteAttack(req.user.id, day, slot); await store.refundCharge(req.user.id, bank); return defeated(); } // it fell to a parallel hit
    const killed = after.hp <= 0 && await store.markBossKilled(clanId, boss.week, req.user.id, now);
    if (killed) await payKill(clanId, { ...after, killedAt: now, lastHitUser: req.user.id }, now);
    const board = await store.weeklyDamage(clanId, boss.week);
    res.json({
        damage, capped: damage < reckoned, strikes: fight?.guarded || 0, hp: after.hp, maxHp: boss.maxHp, level: boss.level, killed, attacksLeft: left,
        rank: board.findIndex(r => r.userId === req.user.id) + 1, of: board.length, week: boss.week
    });
}));

// ---------- rewards ----------

app.get('/api/rewards', authenticateToken, route('rewards', async (req, res) => {
    const rows = await store.unclaimedRewards(req.user.id);
    res.json({ rewards: rows.map(r => ({ id: r.id, kind: r.kind, ...JSON.parse(r.payload) })) });
}));

// Gifts from the owner (README "The API"), claimed all at once by the game when a save or load says some
// wait. A payload that isn't JSON claims as an empty gift rather than failing after the claim.
app.post('/api/gifts/claim', authenticateToken, route('claim gifts', async (req, res) => {
    const claimed = await store.claimGifts(req.user.id, Date.now());
    const parse = text => { try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
    res.json({ gifts: claimed.map(r => ({ ...parse(r.payload), id: r.id, kind: r.kind })) });
}));

app.post('/api/rewards/claim', authenticateToken, route('claim rewards', async (req, res) => {
    const ids = Array.isArray((req.body || {}).ids) ? req.body.ids.map(n => parseInt(n, 10)).filter(validId).slice(0, 100) : [];
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

// A body that isn't JSON (or is too big) is the sender's mistake: a JSON answer saying so, not Express's
// own HTML page (which shows its stack outside production, and which the game reads as "no cloud here").
app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'That request was not valid JSON.' });
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'That save is too large.' });
    console.error('request failed', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

// VERY IMPORTANT FOR VERCEL
module.exports = app;
module.exports.plausibilityFlags = plausibilityFlags;
module.exports.isoWeek = isoWeek;
