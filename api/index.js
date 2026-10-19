const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const store = require('./store');
const crypto = require('node:crypto');
const { sendMail, codeMail } = require('./mail');

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

// ---------- sign-up by email ----------
// An account is made with an email address and plays once a 6-digit code sent there is entered (the owner,
// October 2026, on the fantasyidle.com server; a code, not a link: on a phone a link opens in another browser than
// the game's). The same kind of code sets a new password. A code lives 15 minutes and takes 5 tries, and is kept only
// as a hash keyed with the server's secret; a new one can go once a minute, 5 an hour to an account and 20 an hour
// from an address. One account an email, whatever its case; no address is ever shown to another player.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_MS = 15 * 60 * 1000;
const CODE_TRIES = 5;
const RESEND_GAP_MS = 60 * 1000;
const MAIL_WINDOW_MS = 60 * 60 * 1000;
const MAX_MAILS_PER_ACCOUNT = 5;
const MAX_MAILS_PER_IP = 20;
const MAX_FORGOT_PER_IP = 10;

const cleanEmail = v => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const validEmail = e => e.length > 0 && e.length <= 254 && EMAIL_RE.test(e);
/** An address as the player is shown it: enough to know it, not all of it. */
const maskEmail = e => { const [local = '', domain = ''] = String(e).split('@'); return `${local.slice(0, 2)}${local.length > 2 ? '***' : ''}@${domain}`; };
const codeHash = (userId, purpose, code) => crypto.createHmac('sha256', JWT_SECRET).update(`${userId}:${purpose}:${code}`).digest('hex');
const CODE_WORDS = { wrong: 'That code is wrong.', expired: 'That code has run out: ask for a new one.', tries: 'Too many tries: ask for a new code.' };

/** Mail a new code ('verify' or 'reset') to an account: { sent }, or { wait } (seconds) under a minute after the last, or { tooMany }. */
async function mailCode(user, email, purpose, ip, now) {
    const last = await store.getEmailCode(user.id, purpose);
    if (last && now - last.createdAt < RESEND_GAP_MS) return { wait: Math.ceil((RESEND_GAP_MS - (now - last.createdAt)) / 1000) };
    if (await store.takeAttempt(`mail:user:${user.id}`, now, MAIL_WINDOW_MS) > MAX_MAILS_PER_ACCOUNT) return { tooMany: true };
    if (await store.takeAttempt(`mail:ip:${ip}`.slice(0, 120), now, MAIL_WINDOW_MS) > MAX_MAILS_PER_IP) return { tooMany: true };
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await store.putEmailCode(user.id, purpose, codeHash(user.id, purpose, code), now + CODE_MS, now);
    try { await sendMail({ to: email, ...codeMail({ username: user.username, code, purpose, minutes: CODE_MS / 60000 }) }); } catch (err) {
        await store.deleteEmailCodes(user.id, purpose);   // never delivered: it mustn't hold the next one back a minute
        throw err;
    }
    return { sent: true };
}

/** A code given for an account and a purpose: 'ok' (and spent), or 'wrong', 'expired', 'tries'. */
async function checkCode(user, purpose, code, now) {
    const c = await store.getEmailCode(user.id, purpose);
    if (!c || c.expiresAt <= now) return 'expired';
    const tries = await store.bumpEmailCodeAttempts(c.id);
    if (tries > CODE_TRIES) { await store.expireEmailCode(c.id); return 'tries'; }   // (kept, run out: the next one still waits its minute)
    const given = typeof code === 'string' || typeof code === 'number' ? String(code).replace(/\D/g, '') : '';
    if (given.length !== 6 || !crypto.timingSafeEqual(Buffer.from(codeHash(user.id, purpose, given)), Buffer.from(c.codeHash))) return 'wrong';
    await store.deleteEmailCodes(user.id, purpose);
    return 'ok';
}

app.post('/api/register', async (req, res) => {
    if (!requireSecret(res)) return;
    const invalid = validateCredentials(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { username, password } = req.body;
    const email = cleanEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ error: 'An email address is needed: the game sends a code there.' });
    const ip = clientIp(req);

    try {
        // every registration counts, before any work is done
        if (await store.takeAttempt(`register:${ip}`.slice(0, 120), Date.now(), REGISTER_WINDOW_MS) > MAX_REGISTRATIONS) return res.status(429).json(TOO_MANY);
        const hash = await bcrypt.hash(password, 10);
        const id = await store.createUser(username, hash, email);
        const pending = { pending: true, username, email: maskEmail(email) };
        try { await mailCode({ id, username }, email, 'verify', ip, Date.now()); } catch (err) {
            console.error('sign-up mail failed', err && err.message);
            return res.status(502).json({ ...pending, error: "The account is made, but its code couldn't be sent: ask for a new one in a moment." });
        }
        res.json({ ...pending, message: 'Check your email for the code' });
    } catch (err) {
        if (err.code === '23505') { // Postgres unique violation
            return res.status(400).json({ error: err.constraint === 'users_email_lower' ? 'That email already has an account: log in, or reset its password.' : 'Username already exists' });
        }
        console.error('register failed', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/** The code from the sign-up mail: the address is confirmed and the account plays (a token, as a login gives). */
app.post('/api/verify', route('verify', async (req, res) => {
    if (!requireSecret(res)) return;
    const { username, code } = req.body || {};
    const user = typeof username === 'string' ? await store.findUserByName(username) : null;
    if (!user || !user.email) return res.status(400).json({ error: CODE_WORDS.wrong });
    if (user.emailVerifiedAt) return res.status(400).json({ error: 'This email is confirmed already: log in.' });
    const now = Date.now();
    const result = await checkCode(user, 'verify', code, now);
    if (result !== 'ok') return res.status(400).json({ error: CODE_WORDS[result] });
    await store.setEmailVerified(user.id, now);
    res.json({ token: signToken(user), message: 'Email confirmed' });
}));

/** Another sign-up code, for an account not confirmed yet. */
app.post('/api/verify/resend', route('resend code', async (req, res) => {
    if (!requireSecret(res)) return;
    const { username } = req.body || {};
    const user = typeof username === 'string' ? await store.findUserByName(username) : null;
    if (!user || !user.email || user.emailVerifiedAt) return res.status(400).json({ error: 'There is no code to send for that account.' });
    let sent;
    try { sent = await mailCode(user, user.email, 'verify', clientIp(req), Date.now()); } catch (err) {
        console.error('resend mail failed', err && err.message);
        return res.status(502).json({ error: "The code couldn't be sent: try again in a moment." });
    }
    if (sent.wait) return res.status(429).json({ error: `A new code can go in ${sent.wait} s.` });
    if (sent.tooMany) return res.status(429).json(TOO_MANY);
    res.json({ sent: true, email: maskEmail(user.email) });
}));

/** A code to set a new password, mailed to the account with this address. The same answer whether one has it or not. */
app.post('/api/password/forgot', route('forgot password', async (req, res) => {
    if (!requireSecret(res)) return;
    const email = cleanEmail((req.body || {}).email);
    if (!validEmail(email)) return res.status(400).json({ error: 'Which email address?' });
    const now = Date.now();
    const ip = clientIp(req);
    if (await store.takeAttempt(`forgot:ip:${ip}`.slice(0, 120), now, MAIL_WINDOW_MS) > MAX_FORGOT_PER_IP) return res.status(429).json(TOO_MANY);
    const user = await store.findUserByEmail(email);
    if (user) { try { await mailCode(user, email, 'reset', ip, now); } catch (err) { console.error('reset mail failed', err && err.message); } }
    res.json({ sent: true, email: maskEmail(email) });
}));

/** The reset code and a new password: set, and the account plays (an unconfirmed address is confirmed: the code reached it). */
app.post('/api/password/reset', route('reset password', async (req, res) => {
    if (!requireSecret(res)) return;
    const { code, password } = req.body || {};
    if (typeof password !== 'string' || password.length < MIN_PASSWORD || Buffer.byteLength(password) > MAX_PASSWORD) {
        return res.status(400).json({ error: `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters.` });
    }
    const email = cleanEmail((req.body || {}).email);
    const user = validEmail(email) ? await store.findUserByEmail(email) : null;
    const now = Date.now();
    const result = user ? await checkCode(user, 'reset', code, now) : 'wrong';
    if (result !== 'ok') return res.status(400).json({ error: CODE_WORDS[result] });
    await store.setPassword(user.id, await bcrypt.hash(password, 10));
    if (!user.emailVerifiedAt) await store.setEmailVerified(user.id, now);
    res.json({ token: signToken(user), message: 'Password changed' });
}));

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
    // an address not confirmed yet: the code first (409, not 403: a 403 is the game's word for a session gone)
    if (user.email && !user.emailVerifiedAt) {
        return res.status(409).json({ error: 'Confirm your email first: enter the code we sent.', pending: true, username: user.username, email: maskEmail(user.email) });
    }
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
    // (perHour, flat: only without honestClimb; the ceiling far past any hero's: 2,000 after 1,200 simulated hours of the endless climb)
    { key: 'bestStage', label: 'best stage', perHour: 60, flat: 30, ceiling: 6000, byDepth: true },
    { key: 'titanKills', label: 'Titans defeated', perHour: 1, flat: 2, ceiling: 20000 },
    { key: 'dungeonClears', label: 'dungeon clears', perHour: 3600, flat: 200, ceiling: 1e8 },
    { key: 'totalXp', label: 'total XP', perHour: XP_PER_HOUR_CEILING, flat: 0, ceiling: 13 * 2 * 13_034_431 },
    { key: 'tokens', label: 'prestige tokens', perHour: null, flat: 0, ceiling: 1e12 },   // (a few hundred million after 1,200 simulated hours)
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
    // the hero's plain attack at its best, day by day this past week: a clan attack is the best of them and the clan's
    // boss is sized from them, so neither depends on how far into a run he is, nor on a weak save just before Monday
    // (an Ascension's dip lasts a week). A save flagged for impossible numbers adds nothing to them.
    if (metrics && metrics !== previous) metrics.attackDays = attackDays(previous, newFlags.length ? 0 : metrics.attackDamage, savedAt);
    let flags = [];
    try { flags = JSON.parse((current && current.flags) || '[]'); } catch { flags = []; }
    if (!Array.isArray(flags)) flags = [];
    if (newFlags.length) flags = [...flags, ...newFlags.map(reason => ({ at: savedAt, reason }))].slice(-20);
    const stored = await store.putSave(req.user.id, JSON.stringify(state), savedAt, JSON.stringify(flags), metrics ? JSON.stringify(metrics) : null, base);
    if (!stored) return res.status(409).json({ error: 'Another device saved since this game last looked.' });   // a parallel upload got there first
    // "This week" leaderboards count from where the player stood when the week began: the numbers stored
    // before this upload (the first upload of the week, an empty one say, made the whole week's gain).
    if (metrics && current && current.optIn) await store.putSnapshotIfMissing(req.user.id, isoWeek(savedAt), JSON.stringify(previous || metrics));
    res.json({ success: true, timestamp: savedAt, flagged: newFlags.length > 0, gifts: await store.unclaimedGiftCount(req.user.id), banner: await bannerOf(req.user.id, savedAt) });
}));

app.get('/api/load', authenticateToken, route('load', async (req, res) => {
    const current = await store.getSave(req.user.id);
    const gifts = await store.unclaimedGiftCount(req.user.id);   // waiting gifts: the game claims them next
    // serverNow lets the client measure time away on the server's clock, not its own.
    const banner = await bannerOf(req.user.id, Date.now());   // the clan's banner this week (src/data/social.js CLAN_BANNER)
    if (!current || !current.state) return res.json({ state: null, serverNow: Date.now(), gifts, banner });
    res.json({ state: JSON.parse(current.state), lastSaved: current.lastSaved, serverNow: Date.now(), optIn: current.optIn, gifts, banner });
}));

// ---------- clans ----------
// A clan fights one shared boss a week. An attack is a short fight against it in the game
// (CLAN_ATTACK_SECONDS, src/systems/clanfight.js): the page sends only when the player struck, and the
// damage is reckoned here (src/core/power.js clanAttackFromSave) from the hero at his best of the past week
// (bestAttack), never sent by the client. Three attacks come each day and wait, up to six. The boss is the
// clan's, counted in its attacks (the owner, October 2026): level 1 takes CLAN_BOSS.first plain attacks of the
// members' average strength (the unit: their best 30-s fight of the week without a strike or a potion, measured
// again each day), each level CLAN_BOSS.growth times the last, its health kept in thousandths of that unit, so
// no hero is too strong for its numbers. A member's attack counts by their strength against the
// average, so a full clan that fights fells all seven and a player alone one at most. When it falls it comes
// back at the next UTC midnight as the next level, until Monday brings a new boss: one kill a day. Each kill
// raises the clan's banner (src/data/social.js CLAN_BANNER) for every member until the week ends: that is the
// whole reward (no crate, essence or diamonds since).

const CLAN_NAME_RE = /^[A-Za-z0-9 '_-]{3,32}$/;
const CLAN_TAG_RE = /^[A-Za-z0-9]{2,5}$/;
const MAX_MEMBERS = 20;
const ACTIVE_WITHIN = 7 * DAY;    // a member counts toward the boss's unit only if they played (uploaded) this past week
// An account whose saves showed impossible numbers (recentlyFlagged) deals at most this share of the boss's
// health an attack: a forged save once felled a boss with one attack of the 100T ceiling. Everyone else
// deals what their hero does (a cap of a seventh for all came first, and hid honest players' real damage).
const FLAGGED_ATTACK_SHARE = 0.01;
// A damage figure from a save, as a plain number (deep heroes deal past 10^20: the boss is counted in units, not damage).
const safeDamage = v => (Number.isFinite(v) && v > 0 ? v : 0);

const cleanText = (value, max) => String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

/** A member's stored numbers (computed when they last saved), or null. */
function parseMetrics(json) {
    try { const m = json ? JSON.parse(json) : null; return m && typeof m === 'object' ? m : null; } catch { return null; }
}

// A hero's plain attack at its best, kept for each of the past BEST_DAYS days (UTC) with his stored numbers. A clan
// attack is his best of them (core/power.js clanAttackScale): the camp is packed up at every prestige and grows
// through a run, and the same hero once hit seven times harder at a run's end than after a prestige (the owner,
// October 2026). The boss is sized from them too, each day (currentBoss).
const BEST_DAYS = 7;

/** The days' bests to store with a save's numbers: those of the past week, this save's plain attack in today's. */
function attackDays(previous, attack, savedAt) {
    const today = dayNumber(savedAt);
    const days = {};
    const keep = (day, value) => { if (day <= today && today - day < BEST_DAYS && safeDamage(value) > 0) days[day] = Math.max(days[day] || 0, safeDamage(value)); };
    if (previous?.attackDays && typeof previous.attackDays === 'object') for (const [day, value] of Object.entries(previous.attackDays)) keep(Number(day), value);
    else if (previous?.attackPeak) keep(dayNumber(num(previous.attackPeak.at)), previous.attackPeak.v);   // numbers stored before: their one high
    keep(today, attack);
    return days;
}

/** A hero's best plain attack of the past week, from his stored numbers (his plain attack now, if none was kept). */
function bestAttack(metrics, now) {
    const today = dayNumber(now);
    let best = safeDamage(metrics?.attackDamage);
    if (metrics?.attackDays && typeof metrics.attackDays === 'object') {
        for (const [day, value] of Object.entries(metrics.attackDays)) if (today - Number(day) < BEST_DAYS) best = Math.max(best, safeDamage(value));
    } else if (metrics?.attackPeak && now - num(metrics.attackPeak.at) < BEST_DAYS * DAY) best = Math.max(best, safeDamage(metrics.attackPeak.v));
    return best;
}

/** A member's attack: at its best this past week, never more than their best stage allows (one forged save can't size the boss). */
function attackOf(m, plausibleAttackDamage, now) {
    const metrics = parseMetrics(m.metrics);
    return Math.min(bestAttack(metrics, now), safeDamage(plausibleAttackDamage(metrics?.bestStage)));
}

/** The week's board as the screen shows it: each member's damage as it was dealt (attacks from before that was kept, in the boss's unit now), highest first. */
function boardOf(rows, unit) {
    return rows.map(r => ({ ...r, shown: (r.dealt || 0) + asDamage(r.undealt ?? r.damage, unit) })).sort((a, b) => b.shown - a.shown);
}

/**
 * The unit the clan's boss is counted in: the average plain attack of the members who count now (flagged
 * members don't, nor those who haven't played this past week), 0 when none does.
 */
async function clanUnit(clanId, now) {
    const { plausibleAttackDamage } = await engine();
    const counted = (await store.clanMembers(clanId)).filter(m => !recentlyFlagged(m.flags, now) && now - (m.lastSaved || 0) < ACTIVE_WITHIN);
    const attacks = counted.map(m => attackOf(m, plausibleAttackDamage, now)).filter(a => a > 0);
    return attacks.length ? attacks.reduce((a, b) => a + b, 0) / attacks.length : 0;
}

/** The boss's health (thousandths of the unit) as damage, for the screen: the figures the hero's own hits are in. */
const asDamage = (milli, unit) => (unit > 0 ? (milli / 1000) * unit : milli);

/** Levels of the week's boss the clan has felled (its banner: src/data/social.js CLAN_BANNER). */
const killsOf = (boss, levels) => (boss ? Math.min(levels, (boss.level || 1) - 1 + (boss.killedAt > 0 ? 1 : 0)) : 0);

/** A member joined, left or was removed: the boss is counted in the clan's average as it is now. */
async function resizeBoss(clanId, now) {
    const week = isoWeek(now);
    if (!(await store.getBoss(clanId, week))) return;
    const unit = await clanUnit(clanId, now);
    if (unit > 0) await store.setBossUnit(clanId, week, unit, dayNumber(now));
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

/** This week's boss of a clan: made the first time it is looked at, moved to its next level the day after a kill. */
async function currentBoss(clanId, now) {
    const week = isoWeek(now);
    const { clanBossHealth } = await engine();
    let boss = await store.getBoss(clanId, week);
    if (!boss) {
        boss = await store.createBoss(clanId, week, clanBossHealth(1), [], await clanUnit(clanId, now), dayNumber(now));
    } else if (!(boss.unit > 0)) {
        // a boss from before the clan's attacks counted it: the same share of its health left, in the new figures,
        // and its attacks this week moved with it (once, whoever asks first)
        const unit = await clanUnit(clanId, now);
        const maxHp = clanBossHealth(boss.level);
        const hp = boss.hp <= 0 ? 0 : Math.max(1, Math.round(maxHp * boss.hp / Math.max(1, boss.maxHp)));
        if (unit > 0) await store.convertBoss(clanId, week, unit, maxHp, hp, maxHp / Math.max(1, boss.maxHp));
        boss = await store.getBoss(clanId, week);
    }
    // Felled on an earlier day of this week: it is back as the next level (the store moves it once, whoever asks
    // at the same time; the kill's mark, which once waited for its rewards, is set first).
    if (boss.killedAt > 0 && dayNumber(now) > dayNumber(boss.killedAt)) {
        if (!boss.killPaid) await store.markKillPaid(clanId, week);
        await store.nextLevel(clanId, week, boss.level, boss.killedAt, clanBossHealth(boss.level + 1));
        boss = await store.getBoss(clanId, week);
    }
    // Sized again each day (UTC) from the members as they are: their best attacks grow through the week, and a boss
    // sized on Monday morning fell to one attack that evening (the owner, October 2026). Its health stays counted in
    // their attacks, so a boss half down stays half down.
    if (boss.unitDay !== dayNumber(now)) {
        const unit = await clanUnit(clanId, now);
        await store.setBossUnit(clanId, week, unit > 0 ? unit : boss.unit, dayNumber(now));
        boss = await store.getBoss(clanId, week);
    }
    return boss;
}

/** The player's clan banner this week ({ week, kills }), or null outside a clan: every save and load says it. */
async function bannerOf(userId, now) {
    const mine = await clanOf(userId);
    if (!mine) return null;
    const week = isoWeek(now);
    const { CLAN_BOSS } = await engine();
    return { week, kills: killsOf(await store.getBoss(mine.clan.id, week), CLAN_BOSS.levels) };
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
    const [rawMembers, boss] = await Promise.all([store.clanMembers(clanId), currentBoss(clanId, now)]);
    const members = rawMembers.map(m => ({ ...m, power: parseMetrics(m.metrics) }));
    const board = boardOf(await store.weeklyDamage(clanId, boss.week), boss.unit);
    const { CLAN_ATTACKS_PER_DAY: perDay, CLAN_ATTACK_BANK: bank, CLAN_ATTACK_SECONDS: seconds, CLAN_BOSS, clanAttackScale } = await engine();
    const me = members.find(m => m.userId === req.user.id);
    const kills = killsOf(boss, CLAN_BOSS.levels);
    const attacksLeft = await store.chargesNow(req.user.id, dayNumber(now), perDay, bank);
    const lastHit = boss.lastHitUser ? members.find(m => m.userId === boss.lastHitUser) : null;
    res.json({
        clan: { ...clan, isOwner: clan.ownerId === req.user.id },
        // a member's attack: their best of the past week (what an attack deals before its strikes and potion)
        members: members.map(m => ({ username: m.username, owner: m.userId === clan.ownerId, you: m.userId === req.user.id, bestStage: num(m.power?.bestStage), totalLevel: num(m.power?.totalLevel), attackDamage: bestAttack(m.power, now) })),
        // health and damage as damage (the screen's figures); the server keeps them in the clan's attacks
        boss: { week: boss.week, level: boss.level, maxHp: asDamage(boss.maxHp, boss.unit), hp: asDamage(boss.hp, boss.unit), killed: boss.killedAt > 0, lastHit: lastHit ? lastHit.username : null, endsInMs: msToWeekEnd(now), nextInMs: msToDayEnd(now), kills, levels: CLAN_BOSS.levels },
        banner: { week: boss.week, kills },
        board: board.map(r => ({ username: r.username, damage: r.shown, attacks: r.attacks, you: r.userId === req.user.id })),
        // how much harder than the hero is now your attack lands (your best of the week): the fight on screen hits so
        attackScale: me ? clanAttackScale(bestAttack(me.power, now), safeDamage(me.power?.attackDamage)) : 1,
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
        const unit = boss?.unit || 0;
        const board = boardOf(await store.weeklyDamage(earlier.clanId, earlier.week), unit);
        return res.json({
            damage: earlier.dealt ?? asDamage(earlier.damage, unit), strikes: 0, hp: boss ? asDamage(boss.hp, unit) : 0, maxHp: boss ? asDamage(boss.maxHp, unit) : 0,
            killed: !!boss && boss.killedAt === earlier.at && boss.lastHitUser === req.user.id, kills: killsOf(boss, eng.CLAN_BOSS.levels),
            attacksLeft: await store.chargesNow(req.user.id, dayNumber(now), perDay, bank),
            rank: board.findIndex(r => r.userId === req.user.id) + 1, of: board.length, week: earlier.week, again: true
        });
    };
    if (fightAt) { const earlier = await store.attackByFight(req.user.id, fightAt); if (earlier) return answerAgain(earlier); }
    const save = await store.getSave(req.user.id);
    if (!save || !save.state) return res.status(400).json({ error: 'Save to the cloud first: the attack uses your stored hero.' });
    const boss = await currentBoss(clanId, now);
    const defeated = () => res.status(400).json({ error: 'The boss is down: it comes back at midnight UTC, a level stronger.' });
    if (boss.hp <= 0) return defeated();
    // The fight as the player fought it: when they struck, and how long it lasted (a page from before
    // the fight sends neither: a whole fight without a strike). The damage is reckoned here, from the
    // stored hero raised to his best of the past week (bestAttack); no save can deal more than twice what its
    // best stage allows, and an account flagged for impossible numbers no more than a sliver of the boss
    // (FLAGGED_ATTACK_SHARE).
    const metrics = parseMetrics(save.metrics);
    let fight = null;
    try { fight = eng.clanAttackFromSave(JSON.parse(save.state), body.strikes, body.ms, now, bestAttack(metrics, now)); } catch (err) { console.error('clan fight failed', err); }
    const cap = safeDamage(eng.plausibleAttackDamage(metrics?.bestStage) * 2) || Infinity;
    const dealt = Math.min(safeDamage(fight?.damage), cap);
    // in the clan's attacks: thousandths of its average plain attack (the player's own, if none counted yet)
    const unit = boss.unit > 0 ? boss.unit : safeDamage(metrics?.attackDamage) || 1;
    const reckoned = Math.max(1, Math.min(boss.maxHp, Math.round((dealt / unit) * 1000)));   // no attack counts for more than the whole boss
    const damage = recentlyFlagged(save.flags, now) ? Math.min(reckoned, Math.max(1, Math.ceil(boss.maxHp * FLAGGED_ATTACK_SHARE))) : reckoned;
    const left = await store.spendCharge(req.user.id, dayNumber(now), perDay, bank);
    if (left === null) return res.status(400).json({ error: `No attacks waiting: ${perDay} more come each day (midnight UTC), up to ${bank}.` });
    const day = dayId(now);
    let slot;
    try {
        slot = await store.recordAttack({ clanId, userId: req.user.id, week: boss.week, day, damage, dealt: asDamage(damage, unit), now, fightAt, level: boss.level });
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
    const board = boardOf(await store.weeklyDamage(clanId, boss.week), unit);
    const levels = eng.CLAN_BOSS.levels;
    res.json({
        damage: asDamage(damage, unit), capped: damage < reckoned, strikes: fight?.guarded || 0, hp: asDamage(after.hp, unit), maxHp: asDamage(boss.maxHp, unit), level: boss.level, killed, attacksLeft: left,
        kills: killsOf(killed ? { ...after, killedAt: now } : after, levels), banner: { week: boss.week, kills: killsOf(killed ? { ...after, killedAt: now } : after, levels) },
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
