// API tests against an in-memory stand-in for the data layer (test/helpers/memory-store.cjs).
// The real `api/store.js` is replaced in the require cache before the app loads; with
// API_TEST_DATABASE_URL set (below), the same tests run the real SQL against a Postgres instead.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMemoryStore } = require('./helpers/memory-store.cjs');

// By default the data layer is the in-memory store. With API_TEST_DATABASE_URL set (and the `pg`
// package resolvable), the same tests run the real api/store.js SQL against that Postgres instead:
//   API_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5499/idle2test NODE_PATH=... node --test test/api.test.cjs
const realDb = process.env.API_TEST_DATABASE_URL || null;
let memory = null;
let pool = null;
if (realDb) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: realDb });
    // The same tagged-template shape as @vercel/postgres: sql`...${value}...` -> { rows }.
    const sql = (strings, ...values) => pool.query(strings.reduce((text, part, i) => text + '$' + i + part), values);
    const dbPath = require.resolve(path.join(__dirname, '..', 'api', 'database.js'));
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { sql } };
} else {
    memory = createMemoryStore();
    const storePath = require.resolve(path.join(__dirname, '..', 'api', 'store.js'));
    require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, exports: memory };
}
process.env.JWT_SECRET = 'test-secret';
const app = require('../api/index.js');

// Mail goes to this box instead of Resend (api/mail.js); `mailDown` makes the service fail.
const mailbox = [];
let mailDown = false;
require('../api/mail.js').setMailer(async message => { if (mailDown) throw new Error('the mail service is down (test)'); mailbox.push(message); });
/** The 6-digit code in the last mail to `to`, or null. */
const codeFor = to => { const m = [...mailbox].reverse().find(x => x.to === to); return m ? (m.text.match(/\b(\d{6})\b/) || [])[1] || null : null; };
const mailsTo = to => mailbox.filter(x => x.to === to).length;

// Two things the tests reach into the data for, in both modes.
const peek = {
    async flags(username) {
        if (memory) return JSON.parse(memory.db.users.find(u => u.username === username).flags);
        const { rows } = await pool.query('SELECT flags FROM users WHERE username = $1', [username]);
        return JSON.parse(rows[0].flags);
    },
    async bossHpToOne() {
        if (memory) { memory.db.bosses.forEach(boss => { if (boss.hp > 0) boss.hp = 1; }); return; }
        await pool.query('UPDATE clan_bosses SET hp = 1 WHERE hp > 0');
    },
    /** A player's stored numbers, as an older server left them. */
    async setMetrics(username, metrics) {
        if (memory) { memory.db.users.find(u => u.username === username).metrics = JSON.stringify(metrics); return; }
        await pool.query('UPDATE users SET metrics = $1 WHERE username = $2', [JSON.stringify(metrics), username]);
    },
    /** When an account began to play (its address confirmed): the tests' players began a month before their first save. */
    async verifiedAt(username, at) {
        if (memory) { memory.db.users.find(u => u.username === username).email_verified_at = at; return; }
        await pool.query('UPDATE users SET email_verified_at = $1 WHERE username = $2', [at, username]);
    },
    async metrics(username) {
        if (memory) return JSON.parse(memory.db.users.find(u => u.username === username).metrics);
        const { rows } = await pool.query('SELECT metrics FROM users WHERE username = $1', [username]);
        return JSON.parse(rows[0].metrics);
    },
    /** A clan's boss and attacks this week as if the boss had been made `factor` times its size (before CLAN_BOSS changed). */
    async bossBigger(username, factor) {
        if (memory) {
            const user = memory.db.users.find(u => u.username === username);
            const clanId = memory.db.members.find(m => m.userId === user.id).clanId;
            const boss = memory.db.bosses.find(b => b.clanId === clanId);
            Object.assign(boss, { maxHp: Math.round(boss.maxHp * factor), hp: Math.round(boss.hp * factor) });
            memory.db.attacks.filter(a => a.clanId === clanId).forEach(a => { a.damage = Math.round(a.damage * factor); });
            return;
        }
        const clan = '(SELECT clan_id FROM clan_members WHERE user_id = (SELECT id FROM users WHERE username = $2))';
        await pool.query(`UPDATE clan_bosses SET max_hp = ROUND(max_hp * $1::double precision), hp = ROUND(hp * $1::double precision) WHERE clan_id = ${clan}`, [factor, username]);
        await pool.query(`UPDATE clan_attacks SET damage = ROUND(damage * $1::double precision) WHERE clan_id = ${clan}`, [factor, username]);
    }
};
/** Two figures alike to a part in a thousand (the boss is kept in thousandths of an attack). */
const near = (a, b, why = '') => assert.ok(Math.abs(a - b) <= 1e-3 * Math.max(Math.abs(a), Math.abs(b), 1), `${a} vs ${b} ${why}`);

// The server reads Date.now(); tests move the clock to cross days and weeks.
const realNow = Date.now;
let clock = Date.UTC(2026, 8, 29, 12, 0, 0); // Tuesday of ISO week 2026-W40
Date.now = () => clock;

let server;
let base;
before(async () => {
    if (pool) await pool.query('DROP TABLE IF EXISTS users, clans, clan_members, clan_bosses, clan_boss_shares, clan_attacks, rewards, weekly_snapshots, auth_attempts, email_codes, clan_endless, clan_rankings');
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server.close(); Date.now = realNow; if (pool) await pool.end(); });

const post = (p, body, token, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) });
const get = (p, token) => fetch(base + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

// Each test player registers from an address of their own, as real players do (one address may only
// make a few accounts a day), with an email of their own, and enters the code mailed there. Their saves arrive
// part-way through a game, so they began to play a month ago (an account's first upload is measured from then),
// unless `fresh`: a player who has only just made the account.
let addresses = 0;
const emailOf = username => `${username.toLowerCase()}@example.test`;
async function register(username, { fresh = false } = {}) {
    const from = { 'X-Forwarded-For': `10.0.${Math.floor(++addresses / 250)}.${addresses % 250}` };
    const res = await post('/register', { username, password: 'correct horse', email: emailOf(username) }, null, from);
    assert.equal(res.status, 200, `register ${username}`);
    const confirmed = await post('/verify', { username, code: codeFor(emailOf(username)) }, null, from);
    assert.equal(confirmed.status, 200, `confirm ${username}'s email`);
    if (!fresh) await peek.verifiedAt(username, clock - 30 * 24 * 3600 * 1000);
    return (await confirmed.json()).token;
}

/** A small but valid save: the server migrates whatever it gets, so a partial state is enough. `camp`: its levels (a run's end). */
function heroSave({ tokens = 0, bestStage = 1, playtimeMs = 0, xp = 0, camp = null } = {}) {
    return { version: 3, meta: { playtimeMs, savedAt: clock }, prestige: { tokens }, combat: { bestStage, maxStage: bestStage }, skills: { combat: { xp } }, ...(camp ? { camp } : {}) };
}

test('register validates username and password', async () => {
    assert.equal((await post('/register', { username: 'ab', password: 'longenough' })).status, 400);
    assert.equal((await post('/register', { username: 'bad name!', password: 'longenough' })).status, 400);
    assert.equal((await post('/register', { username: 'hero', password: 'short' })).status, 400);
});

test('register, login, save and load round-trip, with the server clock', async () => {
    const token = await register('hero_1');
    const again = await post('/register', { username: 'hero_1', password: 'correct horse', email: 'someone.else@example.test' });
    assert.equal(again.status, 400, 'duplicate username');
    assert.match((await again.json()).error, /Username already exists/);
    assert.equal((await post('/login', { username: 'hero_1', password: 'wrong password' })).status, 400);
    assert.equal((await post('/login', { username: 'hero_1', password: 'correct horse' })).status, 200);

    assert.equal((await post('/save', { state: { gold: 1 } }, token)).status, 400, 'save without version rejected');
    assert.equal((await post('/save', { state: { version: 99 } }, token)).status, 400, 'future version rejected');
    const save = await post('/save', { state: { version: 3, gold: 1234 } }, token);
    assert.equal(save.status, 200);

    clock += 3 * 3600 * 1000;
    const data = await (await get('/load', token)).json();
    assert.equal(data.state.gold, 1234);
    assert.equal(data.serverNow - data.lastSaved, 3 * 3600 * 1000, 'time away is measured on the server');
});

test('protected routes reject missing and forged tokens', async () => {
    assert.equal((await get('/load')).status, 401);
    const jwt = require('../api/node_modules/jsonwebtoken');
    const forged = jwt.sign({ id: 1, username: 'hero_1' }, 'not-the-secret');
    assert.equal((await get('/load', forged)).status, 403);
});

test('implausible uploads are kept but flagged; honest ones are not', async () => {
    const token = await register('speedy');
    assert.equal((await post('/save', { state: heroSave({ playtimeMs: 1000, bestStage: 50, tokens: 100 }) }, token)).status, 200);
    clock += 1000;
    // Uploads a second apart can't carry 99 in every skill or 950 new stages.
    const res = await (await post('/save', { state: heroSave({ bestStage: 1000, xp: 13_034_431 * 3 }) }, token)).json();
    assert.equal(res.flagged, true);
    const flags = (await peek.flags('speedy')).map(f => f.reason);
    assert.ok(flags.includes('best stage grew faster than any play could'));
    assert.ok(flags.includes('total XP grew faster than any play could'));
    const loaded = await (await get('/load', token)).json();
    assert.equal(loaded.state.combat.bestStage, 1000, 'the save itself is accepted');

    // A first upload is checked against what no save can reach.
    const fresh = await register('fresh_cheat');
    assert.equal((await (await post('/save', { state: heroSave({ bestStage: 1e9 }) }, fresh)).json()).flagged, true);

    // A save played with the developer switches on (they only work on a local host) is flagged.
    const dev = await register('dev_switches');
    assert.equal((await (await post('/save', { state: { ...heroSave(), settings: { devUnlockAll: true } } }, dev)).json()).flagged, true);
    const event = await register('forced_event');
    assert.equal((await (await post('/save', { state: { ...heroSave(), settings: { forceEvent: 'gold_fever' } } }, event)).json()).flagged, true);
    assert.equal((await (await post('/save', { state: { ...heroSave(), settings: { devUnlockAll: false, forceEvent: null } } }, await register('honest_settings'))).json()).flagged, false);

    // Trial tiers the best stage could not have cleared are flagged; earned ones are not.
    const trialsAt = (bestStage, cleared) => ({ ...heroSave({ bestStage }), trials: { active: null, cleared } });
    assert.equal((await (await post('/save', { state: trialsAt(120, { brutes: 5 }) }, await register('forged_trials'))).json()).flagged, true);
    assert.equal((await (await post('/save', { state: trialsAt(280, { brutes: 5 }) }, await register('earned_trials'))).json()).flagged, false);

    // The numbers checked are the server's own reading of the save: a raw field can't be dressed up.
    const sneaky = await register('sneaky_stage');
    const sneakySave = { ...heroSave(), combat: { stage: 999999, bestStage: 1, maxStage: 1 } };
    assert.equal((await (await post('/save', { state: sneakySave }, sneaky)).json()).flagged, true, 'a far stage under a modest best stage');

    // Growth is measured from each number's highest value and when it was reached.
    const { plausibilityFlags } = app;
    const { plausibleAttackDamage, honestClimb } = await import('../src/core/power.js');
    const hour = 3600 * 1000;
    const t0 = clock;
    const m = (o = {}) => ({ bestStage: 1, titanKills: 0, dungeonClears: 0, totalXp: 0, tokens: 0, attackDamage: 0, ...o });
    const run = (peaks, metrics, at) => plausibilityFlags(peaks, metrics, at, plausibleAttackDamage, honestClimb);
    const highs = metrics => run(null, metrics, t0).peaks;
    assert.deepEqual(run(highs(m({ bestStage: 40 })), m({ bestStage: 90, totalXp: 2e6 }), t0 + hour).flags, [], 'a good hour is fine');
    const today = m({ bestStage: 90, tokens: 900, titanKills: 10, totalXp: 9e6 });
    const restored = run(highs(today), m({ bestStage: 60, tokens: 10, titanKills: 4, totalXp: 5e6 }), t0 + 2 * 60 * 1000);
    assert.deepEqual(restored.flags, [], 'going back (a restored backup) is not cheating');
    assert.deepEqual(run(restored.peaks, today, t0 + 4 * 60 * 1000).flags, [], 'nor is coming forward to the newer save again');
    assert.deepEqual(run(highs(m()), m({ totalXp: 30e6 }), t0 + 12 * hour).flags, [], 'a long absence allows a long replay');
    assert.ok(run(highs(m()), m({ totalXp: 30e6 }), t0 + 60 * 1000).flags.length, 'but not a minute later');
    assert.ok(run(null, m({ bestStage: 5, attackDamage: 1e12 }), t0).flags.includes('attack beyond what its best stage allows'), 'a weapon no play could make');
    // Stars come with Ascensions only: a few a day, and none past what any save could hold.
    assert.ok(run(null, m({ stars: 5000 }), t0).flags.includes('Stars beyond any possible save'));
    assert.deepEqual(run(highs(m({ stars: 20 })), m({ stars: 50 }), t0 + 24 * hour).flags, [], 'an Ascension a day');
    assert.ok(run(highs(m({ stars: 20 })), m({ stars: 400 }), t0 + hour).flags.includes('Stars grew faster than any play could'));
    // A prestige pays more with Stars, so the tokens may grow as much faster.
    const tokensIn = (gain, tokens) => run(highs(m({ bestStage: 300, tokens: 0 })), m({ bestStage: 300, tokens, tokenGain: gain }), t0 + hour).flags.includes('prestige tokens grew faster than any play could');
    assert.equal(tokensIn(1, 30_000), true);
    assert.equal(tokensIn(11, 30_000), false);
    // The best stage may grow by what its depth allows: fast early, slowly late.
    const climbed = (from, to, hours) => run(highs(m({ bestStage: from })), m({ bestStage: to }), t0 + hours * hour).flags.includes('best stage grew faster than any play could');
    assert.equal(climbed(1, 120, 2), false, 'a new player\'s first hours');
    assert.equal(climbed(250, 300, 24), false, 'a good day late in the game');
    assert.equal(climbed(300, 400, 168), false, 'a week late in the game');
    assert.equal(climbed(250, 900, 24), true, 'six hundred and fifty stages in a day, late');
    assert.equal(climbed(300, 450, 1), true, 'a hundred and fifty stages in an hour, late');
    assert.equal(climbed(400, 450, 24), false, 'fifty in a day past 400, where the monsters grow more slowly');
    assert.equal(climbed(600, 750, 1), false, 'a hundred and fifty in an hour past 600, a run fresh from a prestige in the dense deep');
    assert.equal(climbed(600, 1500, 24), true, 'nine hundred in a day past 600');
    assert.equal(climbed(2000, 2400, 24), true, 'four hundred in a day past 2,000');
});

test('a made-up climb is caught: bursts chained a minute apart, and a new account whose first save arrives far along', async () => {
    const { plausibilityFlags } = app;
    const { plausibleAttackDamage, honestClimb } = await import('../src/core/power.js');
    const minute = 60 * 1000;
    const t0 = clock;
    const m = (o = {}) => ({ bestStage: 1, titanKills: 0, dungeonClears: 0, totalXp: 0, tokens: 0, attackDamage: 0, ...o });
    const run = (peaks, metrics, at) => plausibilityFlags(peaks, metrics, at, plausibleAttackDamage, honestClimb);
    // each upload as far as the one before allows: from stage 300 the second is caught, the day's window counting the burst once
    let { peaks } = run(null, m({ bestStage: 300 }), t0);
    let stage = 300, caught = 0;
    for (let i = 1; i <= 30 && !caught; i++) {
        stage += Math.floor(honestClimb(stage, (minute + 30 * minute) / (60 * minute))) - 1;
        const r = run(peaks, m({ bestStage: stage }), t0 + i * minute);
        if (r.flags.includes('best stage grew faster than any play could')) caught = i;
        peaks = r.peaks;
    }
    assert.ok(caught > 0 && caught <= 3, `caught at upload ${caught}`);
    // an honest day is never caught: from stage 300, a hundred stages over a day's uploads, an hour apart
    ({ peaks } = run(null, m({ bestStage: 300 }), t0));
    for (let h = 1; h <= 48; h++) {
        const r = run(peaks, m({ bestStage: 300 + Math.round(100 * Math.min(1, h / 24)) }), t0 + h * 60 * minute);
        assert.deepEqual(r.flags, [], `hour ${h}`);
        peaks = r.peaks;
    }
    // highs kept before the windows: no flag, and a window begins
    const old = { bestStage: { v: 300, at: t0 } };
    const begun = run(old, m({ bestStage: 310 }), t0 + 60 * minute);
    assert.deepEqual(begun.flags, []);
    assert.equal(begun.peaks.bestStage.day.v, 310);

    // A new account's first save is measured from when it began to play: one that arrives far along is flagged.
    const forger = await register('fresh_forger', { fresh: true });
    const forged = await (await post('/save', { state: heroSave({ bestStage: 2000, tokens: 1e6 }) }, forger)).json();
    assert.equal(forged.flagged, true);
    assert.ok((await peek.flags('fresh_forger')).some(f => f.reason === 'best stage grew faster than any play could'));
    const newcomer = await register('fresh_newcomer', { fresh: true });
    assert.equal((await (await post('/save', { state: heroSave({ bestStage: 3, playtimeMs: 60000 }) }, newcomer)).json()).flagged, false, 'a real first minute');
    clock += 2 * 60 * 60 * 1000;
    assert.equal((await (await post('/save', { state: heroSave({ bestStage: 60, playtimeMs: 2 * 3600000 }) }, newcomer)).json()).flagged, false, 'and a good first two hours');
});

test('a save cannot reach the server\'s own objects', async () => {
    const villain = await register('proto_villain');
    const bystander = await register('bystander');
    await post('/save', { state: heroSave() }, bystander);
    const body = '{"state":{"version":3,"__proto__":{"toString":1,"ignoreExpiration":true,"polluted":"yes"},"combat":{"constructor":{"prototype":{"polluted":"yes"}}}}}';
    const res = await fetch(base + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${villain}` }, body });
    assert.equal(res.status, 200);
    await post('/leaderboard/consent', { optIn: true }, villain);
    await get('/leaderboard', villain);
    assert.equal(({}).polluted, undefined);
    assert.equal((await get('/load', bystander)).status, 200, 'everyone else still gets in');
});

test('clans: create, list, join, the member cap, leaving hands the clan on', async () => {
    const owner = await register('owner_1');
    const friend = await register('friend_1');
    assert.equal((await post('/clans', { name: 'x', tag: 'AB' }, owner)).status, 400, 'name too short');
    assert.equal((await post('/clans', { name: 'Iron Wolves', tag: 'A' }, owner)).status, 400, 'tag too short');
    const created = await post('/clans', { name: 'Iron Wolves', tag: 'iwf', description: 'Casual <b>fun</b>', lookingFor: 'anyone' }, owner);
    assert.equal(created.status, 200);
    const { clanId } = await created.json();
    assert.equal((await post('/clans', { name: 'Iron Wolves', tag: 'IW' }, friend)).status, 400, 'name taken');
    assert.equal((await post('/clans', { name: 'Second', tag: 'SEC' }, owner)).status, 400, 'already in a clan');

    const list = await (await get('/clans?search=wolves', friend)).json();
    assert.equal(list.clans.length, 1);
    assert.equal(list.clans[0].tag, 'IWF');
    assert.equal(list.clans[0].description, 'Casual bfun/b', 'markup stripped');

    assert.equal((await post('/clans/join', { clanId }, friend)).status, 200);
    const mine = await (await get('/clan', friend)).json();
    assert.equal(mine.members.length, 2);
    assert.equal(mine.clan.isOwner, false);

    // Owner leaves: the longest-serving member takes over; the last one out closes the clan.
    assert.equal((await post('/clans/leave', {}, owner)).status, 200);
    assert.equal((await (await get('/clan', friend)).json()).clan.isOwner, true);
    assert.equal((await post('/clans/leave', {}, friend)).status, 200);
    assert.equal((await (await get('/clans?search=wolves', friend)).json()).clans.length, 0);

    // The cap.
    const big = await register('captain');
    const { clanId: bigId } = await (await post('/clans', { name: 'Big Guild', tag: 'BIG' }, big)).json();
    for (let i = 0; i < 19; i++) assert.equal((await post('/clans/join', { clanId: bigId }, await register(`member_${i}`))).status, 200);
    assert.equal((await post('/clans/join', { clanId: bigId }, await register('one_too_many'))).status, 400, 'full at 20');
});

test("the boss is the clan's, counted in its attacks: level 1 is CLAN_BOSS.first attacks of an average member, each seeing it in their own hits", async () => {
    const { CLAN_BOSS, clanPowerOf } = await import('../src/core/power.js');
    const solo = await register('lone_wolf');
    const { clanId } = await (await post('/clans', { name: 'Lone Wolves', tag: 'LONE' }, solo)).json();
    assert.ok(clanId);
    await post('/save', { state: heroSave({ tokens: 3000, bestStage: 200, playtimeMs: 200 * 3600 * 1000 }) }, solo);
    const view = await (await get('/clan', solo)).json();
    near(view.boss.maxHp, CLAN_BOSS.first * view.members[0].attackDamage, 'alone: that many of their own attacks');
    // a second member: the same attacks for the clan (not twice as many), each member seeing them in their own hits,
    // fewer of the deeper one's (their clan power is above one) and more of the other's
    const pal = await register('wolf_pal');
    await post('/save', { state: heroSave({ tokens: 300, bestStage: 120 }) }, pal);
    await post('/clans/join', { clanId }, pal);
    assert.deepEqual([await peek.flags('lone_wolf'), await peek.flags('wolf_pal')], [[], []]);
    const mine = await (await get('/clan', solo)).json();
    const theirs = await (await get('/clan', pal)).json();
    const attackOf = (v, name) => v.members.find(m => m.username === name).attackDamage;
    const stages = [200, 120];
    assert.ok(clanPowerOf(200, stages) > 1 && clanPowerOf(120, stages) < 1);
    near(mine.boss.maxHp, CLAN_BOSS.first * attackOf(mine, 'lone_wolf') / clanPowerOf(200, stages));
    near(theirs.boss.maxHp, CLAN_BOSS.first * attackOf(theirs, 'wolf_pal') / clanPowerOf(120, stages));
    assert.deepEqual([mine.boss.kills, mine.boss.levels, mine.banner.kills], [0, CLAN_BOSS.levels, 0]);
});

test('two members far apart share the boss by how deep they are, not by their damage, and fell it as fast together', async () => {
    // the owner's report (October 2026): heroes a million times apart, and only the strongest member's attacks moved it
    const { CLAN_BOSS, clanPowerOf } = await import('../src/core/power.js');
    const deep = await register('deep_one');
    const shallow = await register('shallow_one');
    await post('/save', { state: heroSave({ tokens: 1e6, bestStage: 480, playtimeMs: 400 * 3600 * 1000 }) }, deep);
    await post('/save', { state: heroSave({ tokens: 20, bestStage: 30 }) }, shallow);
    assert.deepEqual([await peek.flags('deep_one'), await peek.flags('shallow_one')], [[], []]);
    const { clanId } = await (await post('/clans', { name: 'Far Apart', tag: 'FAR' }, deep)).json();
    await post('/clans/join', { clanId }, shallow);
    const view = await (await get('/clan', deep)).json();
    const attackOf = name => view.members.find(m => m.username === name).attackDamage;
    assert.ok(attackOf('deep_one') > 1000 * attackOf('shallow_one'), 'their damage is thousands of times apart');
    const a = await (await post('/clan/attack', { strikes: [], ms: 30000 }, deep)).json();
    const b = await (await post('/clan/attack', { strikes: [], ms: 30000 }, shallow)).json();
    const [strong, weak] = [clanPowerOf(480, [480, 30]), clanPowerOf(30, [480, 30])];
    near(strong / weak, 4, 'sixteen times as deep: four times as much');
    near(1 - a.hp / a.maxHp, strong / CLAN_BOSS.first, 'the deeper one: their power\'s share of one attack');
    near(1 - b.hp / b.maxHp, (strong + weak) / CLAN_BOSS.first, 'together, two attacks: as fast as two average members');
    near(a.damage, attackOf('deep_one'), 'each sees their own damage');
    near(b.damage, attackOf('shallow_one'));
    const board = (await (await get('/clan', shallow)).json()).board;
    assert.deepEqual(board.map(r => r.username), ['deep_one', 'shallow_one']);
    near(board[0].share, 0.8);
    near(board[1].share, 0.2);
});

test('the clan boss: damage comes from the stored save, three attacks a day, and a kill raises the banner of every member, fought or not', async () => {
    const a = await register('striker_a');
    const b = await register('striker_b');
    const { clanId } = await (await post('/clans', { name: 'Boss Hunters', tag: 'BH' }, a)).json();
    await post('/clans/join', { clanId }, b);

    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'no stored save yet');
    await post('/save', { state: heroSave({ tokens: 400, bestStage: 60 }) }, a);
    const quiet = await (await post('/save', { state: heroSave({ tokens: 0, bestStage: 1 }) }, b)).json();
    assert.deepEqual(quiet.banner, { week: '2026-W40', kills: 0 }, 'every save says the clan\'s banner');

    const view = await (await get('/clan', a)).json();
    assert.equal(view.attacksLeft, 3);
    const strong = view.members.find(m => m.username === 'striker_a').attackDamage;
    const weak = view.members.find(m => m.username === 'striker_b').attackDamage;
    assert.ok(strong > weak, 'tokens show up in the server-computed damage');
    const { CLAN_BOSS, clanPowerOf } = await import('../src/core/power.js');
    near(view.boss.maxHp, CLAN_BOSS.first * strong / clanPowerOf(60, [60, 1]), 'in the striker\'s own hits');

    const hit = await (await post('/clan/attack', { damage: 1e15 }, a)).json();
    near(hit.damage, strong, 'a damage number sent by the client is ignored');
    await post('/clan/attack', {}, a);
    await post('/clan/attack', {}, a);
    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'three a day');

    // next day: the boss falls to a
    await peek.bossHpToOne();
    clock += 24 * 3600 * 1000;
    const kill = await (await post('/clan/attack', {}, a)).json();
    assert.equal(kill.killed, true);
    assert.deepEqual(kill.banner, { week: '2026-W40', kills: 1 });
    // b never fought: the banner is theirs as well, in every save and load
    assert.equal((await (await post('/save', { state: heroSave({ tokens: 0, bestStage: 1 }) }, b)).json()).banner.kills, 1);
    assert.equal((await (await get('/load', b)).json()).banner.kills, 1);
    // and that is the whole reward: nothing to claim
    assert.equal((await (await get('/rewards', a)).json()).rewards.length, 0);
    assert.equal((await (await get('/rewards', b)).json()).rewards.length, 0);
    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'no attacking a dead boss');
});

test('the banner is the week\'s: a new week starts it from nothing, and pays nothing at its end', async () => {
    const leader = await register('weekly_a');
    const helper = await register('weekly_b');
    const { clanId } = await (await post('/clans', { name: 'Weeklies', tag: 'WK' }, leader)).json();
    await post('/clans/join', { clanId }, helper);
    await post('/save', { state: heroSave({ tokens: 200 }) }, leader);
    await post('/save', { state: heroSave({ tokens: 10 }) }, helper);
    await get('/clan', leader);   // (the week's boss is made on the clan's first look)
    await peek.bossHpToOne();
    await post('/clan/attack', {}, leader);
    const week = (await (await get('/clan', leader)).json()).banner;
    assert.equal(week.kills, 1);
    clock += 8 * 24 * 3600 * 1000; // next week
    const next = (await (await post('/save', { state: heroSave({ tokens: 10 }) }, helper)).json()).banner;
    assert.notEqual(next.week, week.week);
    assert.equal(next.kills, 0);
    await get('/clan', leader);
    assert.equal((await (await get('/rewards', leader)).json()).rewards.length, 0, 'no participation or top-three rewards');
    assert.equal((await (await get('/rewards', helper)).json()).rewards.length, 0);
});

test('leaderboards: opt-in only, server-computed, flagged accounts left out, a weekly view', async () => {
    const shy = await register('shy_one');
    const proud = await register('proud_one');
    const cheat = await register('cheater');
    await post('/save', { state: heroSave({ bestStage: 90 }) }, shy);
    await post('/save', { state: heroSave({ bestStage: 70 }) }, proud);
    await post('/save', { state: heroSave({ bestStage: 50, playtimeMs: 0 }) }, cheat);
    clock += 1000;
    await post('/save', { state: heroSave({ bestStage: 500, playtimeMs: 50 * 3600 * 1000 }) }, cheat);

    await post('/leaderboard/consent', { optIn: true }, proud);
    await post('/leaderboard/consent', { optIn: true }, cheat);
    const board = await (await get('/leaderboard?metric=bestStage', proud)).json();
    const names = board.entries.map(e => e.username);
    assert.ok(names.includes('proud_one'));
    assert.ok(!names.includes('shy_one'), 'not opted in');
    assert.ok(!names.includes('cheater'), 'recently flagged');
    assert.equal(board.me.value, 70);

    // Weekly: counts from the first save of the week.
    await post('/save', { state: heroSave({ bestStage: 70 }) }, proud);
    clock += 3600 * 1000;
    await post('/save', { state: heroSave({ bestStage: 85, playtimeMs: 3600 * 1000 }) }, proud);
    clock += 61 * 1000; // past the board cache
    const weekly = await (await get('/leaderboard?metric=bestStage&period=week', proud)).json();
    assert.equal(weekly.me.value, 15);

    await post('/leaderboard/consent', { optIn: false }, proud);
    const after = await (await get('/leaderboard?metric=bestStage', proud)).json();
    assert.equal(after.me, null, 'opting out removes you at once');
});

test('parallel attacks fell a level once: the banner counts it once', async () => {
    const a = await register('race_a');
    const b = await register('race_b');
    await post('/save', { state: heroSave({ tokens: 50 }) }, a);
    await post('/save', { state: heroSave({ tokens: 50 }) }, b);
    const { clanId } = await (await post('/clans', { name: 'Racers One', tag: 'RC1' }, a)).json();
    await post('/clans/join', { clanId }, b);
    await get('/clan', a);
    await peek.bossHpToOne();
    const answers = await Promise.all([a, a, b, b].map(t => post('/clan/attack', {}, t).then(r => r.json())));
    assert.equal(answers.filter(r => r.killed).length, 1, 'one kill');
    assert.equal((await (await get('/clan', b)).json()).banner.kills, 1);
});

test('an absurd save cannot break its clan', async () => {
    const owner = await register('giant_owner');
    const giant = await register('giant');
    const { clanId } = await (await post('/clans', { name: 'Giants', tag: 'GNT' }, owner)).json();
    await post('/clans/join', { clanId }, giant);
    await post('/save', { state: heroSave({ tokens: 10 }) }, owner);
    await post('/save', { state: heroSave({ tokens: 1e19, bestStage: 1 }) }, giant);
    const view = await get('/clan', owner);
    assert.equal(view.status, 200);
    const data = await view.json();
    assert.ok(Number.isFinite(data.boss.maxHp) && data.boss.maxHp > 0, `boss HP ${data.boss.maxHp}`);
    const hit = await post('/clan/attack', {}, giant);
    assert.equal(hit.status, 200);
    const answer = await hit.json();
    assert.ok(Number.isFinite(answer.damage) && answer.damage <= answer.maxHp * 0.011, 'flagged: a sliver of the boss');
    const seen = (await (await get('/clan', owner)).json()).boss;
    assert.ok(data.boss.hp - seen.hp <= data.boss.maxHp * 0.011, 'and the owner sees no more of it gone');
    // The owner can remove them.
    assert.equal((await post('/clan/kick', { username: 'giant_owner' }, giant)).status, 409, 'only the owner removes members (409: a 403 would log the player out)');
    assert.equal((await post('/clan/kick', { username: 'giant' }, owner)).status, 200);
    assert.equal((await (await get('/clan', owner)).json()).members.length, 1);
    assert.equal((await (await get('/clan', giant)).json()).clan, null);
});

test('clan races: parallel creates leave no empty clan, parallel joins respect the cap', async () => {
    const solo = await register('double_founder');
    const results = await Promise.all([
        post('/clans', { name: 'Twin One', tag: 'TW1' }, solo),
        post('/clans', { name: 'Twin Two', tag: 'TW2' }, solo)
    ]);
    assert.equal(results.filter(r => r.status === 200).length, 1);
    const twins = (await (await get('/clans?search=twin', solo)).json()).clans;
    assert.equal(twins.length, 1, 'the losing clan is removed');
    assert.equal(twins[0].members, 1);

    const host = await register('crowded_host');
    const { clanId } = await (await post('/clans', { name: 'Crowded', tag: 'CRWD' }, host)).json();
    const joiners = [];
    for (let i = 0; i < 25; i++) joiners.push(await register(`crowd_${i}`));
    await Promise.all(joiners.map(t => post('/clans/join', { clanId }, t)));
    const view = await (await get('/clan', host)).json();
    assert.equal(view.members.length, 20, 'never past 20');
});

test("the week's Trial has a board of this week's runs only, and a stage past the best is flagged", async () => {
    const { trialWeekStart } = await import('../src/core/power.js');
    const { weeklyTrialAt } = await import('../src/data/trials.js');
    const week = weeklyTrialAt(clock);
    const trialSave = (bestStage, weekly) => ({ ...heroSave({ bestStage }), trials: { active: null, cleared: {}, best: { [week.trial.id]: weekly?.best || 0 }, laurels: 0, weekly } });
    const now = { start: week.start, id: week.trial.id, bar: 0, won: false, best: 240 };
    const stale = { ...now, start: week.start - 7 * 24 * 3600 * 1000, best: 270 };
    const keen = await register('keen_trialist');
    const old = await register('last_week');
    await post('/save', { state: trialSave(260, now) }, keen);
    await post('/save', { state: trialSave(280, stale) }, old);
    await post('/leaderboard/consent', { optIn: true }, keen);
    await post('/leaderboard/consent', { optIn: true }, old);
    clock += 61 * 1000;   // past the board cache
    const board = await (await get('/leaderboard?metric=weeklyTrial&period=week', keen)).json();
    assert.equal(board.metric, 'weeklyTrial');
    assert.equal(board.period, 'all', "the week's Trial is a weekly number already");
    assert.equal(board.me.value, 240);
    near(board.me.share, 240 / 260, 'shown as a share of the hero\'s own best stage');
    assert.ok(!board.entries.some(e => e.username === 'last_week'), "last week's run is not on this week's board");
    assert.equal(trialWeekStart(clock), week.start);
    // ranked by that share (the owner's go, 27 October 2026): a newer hero's good run tops a deeper hero's
    const deep = await register('deep_trialist');
    const fresh = await register('fresh_trialist');
    await post('/save', { state: trialSave(1260, { ...now, best: 1150 }) }, deep);
    await post('/save', { state: trialSave(400, { ...now, best: 390 }) }, fresh);
    await post('/leaderboard/consent', { optIn: true }, deep);
    await post('/leaderboard/consent', { optIn: true }, fresh);
    clock += 61 * 1000;
    const ranked = (await (await get('/leaderboard?metric=weeklyTrial', deep)).json()).entries.map(e => e.username);
    // 390 of 400 (98%), then 240 of 260 (92%), then 1,150 of 1,260 (91%)
    assert.deepEqual(['fresh_trialist', 'keen_trialist', 'deep_trialist'].map(n => ranked.indexOf(n)).sort((a, b) => a - b), ['fresh_trialist', 'keen_trialist', 'deep_trialist'].map(n => ranked.indexOf(n)), ranked.join(','));
    // a run in the week's Trial past the hero's best stage is impossible
    const forger = await register('trial_forger');
    assert.equal((await (await post('/save', { state: trialSave(100, { ...now, best: 400 }) }, forger)).json()).flagged, true);
});

test('leaderboards ignore inherited metric names', async () => {
    const t = await register('curious');
    const res = await (await get('/leaderboard?metric=constructor', t)).json();
    assert.equal(res.metric, 'bestStage');
});

test('password guessing stops after ten tries per name, and one address makes only three accounts a day', async () => {
    await register('guarded_hero');
    const from = { 'X-Forwarded-For': '203.0.113.7' };
    for (let i = 0; i < 10; i++) assert.equal((await post('/login', { username: 'guarded_hero', password: `wrong ${i}` }, null, from)).status, 400);
    assert.equal((await post('/login', { username: 'guarded_hero', password: 'correct horse' }, null, from)).status, 429, 'even the right password waits');
    clock += 16 * 60 * 1000;
    assert.equal((await post('/login', { username: 'guarded_hero', password: 'correct horse' }, null, from)).status, 200, 'after the window it works again');
    const farm = { 'X-Forwarded-For': '198.51.100.9' };
    for (let i = 0; i < 3; i++) assert.equal((await post('/register', { username: `farm_${i}`, password: 'correct horse', email: `farm_${i}@example.test` }, null, farm)).status, 200);
    const fourth = await post('/register', { username: 'farm_3', password: 'correct horse', email: 'farm_3@example.test' }, null, farm);
    assert.equal(fourth.status, 429);
    assert.match((await fourth.json()).error, /enough accounts for today/);
    clock += 25 * 60 * 60 * 1000;
    assert.equal((await post('/register', { username: 'farm_4', password: 'correct horse', email: 'farm_4@example.test' }, null, farm)).status, 200, 'the next day, another');
});

test("a member who leaves changes the clan's power, not the boss's health in attacks", async () => {
    const { CLAN_BOSS } = await import('../src/core/power.js');
    const owner = await register('honest_owner');
    const strong = await register('drive_by');
    await post('/save', { state: heroSave({ tokens: 50, bestStage: 30 }) }, owner);
    await post('/save', { state: heroSave({ tokens: 900, bestStage: 120 }) }, strong);
    const { clanId } = await (await post('/clans', { name: 'Honest Folk', tag: 'HF' }, owner)).json();
    await post('/clans/join', { clanId }, strong);
    const sized = (await (await get('/clan', owner)).json()).boss;
    await post('/clans/leave', {}, strong);
    const after = (await (await get('/clan', owner)).json());
    const own = after.members.find(m => m.username === 'honest_owner').attackDamage;
    assert.ok(after.boss.maxHp < sized.maxHp, `alone, the owner counts as an average member again: ${after.boss.maxHp} < ${sized.maxHp}`);
    near(after.boss.maxHp, CLAN_BOSS.first * own, 'that many attacks of the one who stayed');
    near(after.boss.hp / after.boss.maxHp, sized.hp / sized.maxHp);
});

test('a deleted clan does not hand out fresh attacks, and a huge item id cannot freeze the server', async () => {
    const solo = await register('solo_striker');
    await post('/save', { state: heroSave({ tokens: 10, bestStage: 20 }) }, solo);
    let landed = 0;
    for (let round = 0; round < 2; round++) {
        await post('/clans', { name: `Solo Band ${round}`, tag: `SB${round}` }, solo);
        for (let i = 0; i < 3; i++) if ((await post('/clan/attack', {}, solo)).status === 200) landed++;
        await post('/clans/leave', {}, solo);   // the last member: the clan is deleted
    }
    assert.equal(landed, 3, 'three a day, clan or no clan');
    const started = realNow();
    const res = await post('/save', { state: { version: 3, idCounter: Number.MAX_SAFE_INTEGER, inventory: [{ type: 'Ring' }, { type: 'Ring' }, { type: 'Ring' }] } }, solo);
    assert.equal(res.status, 200);
    assert.ok(realNow() - started < 5000, 'answered at once');
});

test('the health check says the database, the secret and the game code are all there', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.json();
    assert.deepEqual({ ok: body.ok, db: body.db, secret: body.secret, game: body.game }, { ok: true, db: true, secret: true, game: true });
});

test('with no database the connection fails on first use, not when the API loads; DATABASE_URL counts too, a Neon address or our own', { skip: !!realDb && 'the real-database run replaces this module' }, async () => {
    const saved = { POSTGRES_URL: process.env.POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL };
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    try {
        const { sql } = require('../api/database.js');   // loads with nothing set
        await assert.rejects(async () => sql`SELECT 1`, /DATABASE_URL/);
        // the Neon integration's own name for it is read too (this one is unpooled, so it is refused, unused)
        process.env.DATABASE_URL = 'postgresql://player:not-a-password@ep-quiet-sky-123456.eu-central-1.aws.neon.tech/game';
        await assert.rejects(async () => sql`SELECT 1`, /pooled connection string/);
        // any other address is a Postgres of our own (the fantasyidle.com server's, by its socket), through `pg`:
        // it fails when first asked, here for want of a server at all
        process.env.DATABASE_URL = 'postgresql://fantasyidle@/fantasyidle?host=/nonexistent-socket-dir';
        await assert.rejects(async () => sql`SELECT 1`, /ENOENT|connect/);
    } finally {
        for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
});

/** The owner's gift (README "The API"): one row in rewards, as the SQL there adds it. */
async function giveGift(username, payload, dedupe = null) {
    if (memory) {
        const user = memory.db.users.find(u => u.username === username);
        return memory.addReward(user.id, 'gift', payload, clock, dedupe);
    }
    await pool.query('INSERT INTO rewards (user_id, kind, payload, created_at, dedupe) SELECT id, $2, $3, $4, $5 FROM users WHERE username = $1 ON CONFLICT (dedupe) DO NOTHING',
        [username, 'gift', payload, clock, dedupe]);
}

test("the owner's gifts: counted on save and load, claimed once by the game, never through the clan's list", async () => {
    const token = await register('gift_taker');
    assert.equal((await (await post('/save', { state: heroSave({ bestStage: 30 }) }, token)).json()).gifts, 0);
    await giveGift('gift_taker', JSON.stringify({ gold: 12000000, text: 'A gift from tufan' }), 'gift:test:first-gold');
    await giveGift('gift_taker', JSON.stringify({ gold: 12000000 }), 'gift:test:first-gold');   // the same key again: nothing
    const saved = await (await post('/save', { state: heroSave({ bestStage: 30 }) }, token)).json();
    assert.equal(saved.gifts, 1, 'the save answer says one waits');
    assert.equal((await (await get('/load', token)).json()).gifts, 1, 'so does the load answer');

    // a page running older code sees only the clan's rewards and cannot claim a gift by its id
    const listed = await (await get('/rewards', token)).json();
    assert.equal(listed.rewards.length, 0);
    const giftId = memory ? memory.db.rewards.find(r => r.kind === 'gift').id : (await pool.query("SELECT id FROM rewards WHERE kind = 'gift'")).rows[0].id;
    assert.equal((await (await post('/rewards/claim', { ids: [giftId] }, token)).json()).rewards.length, 0);

    const first = await (await post('/gifts/claim', {}, token)).json();
    assert.equal(first.gifts.length, 1);
    assert.equal(first.gifts[0].kind, 'gift');
    assert.equal(first.gifts[0].gold, 12000000);
    assert.equal(first.gifts[0].text, 'A gift from tufan');
    assert.equal((await (await post('/gifts/claim', {}, token)).json()).gifts.length, 0, 'paid once');
    assert.equal((await (await get('/load', token)).json()).gifts, 0);

    // a payload that isn't JSON claims as an empty gift, and can't rename itself
    await giveGift('gift_taker', 'not json', 'gift:test:broken');
    await giveGift('gift_taker', JSON.stringify({ kind: 'lastHit', id: 1, essence: 5 }), 'gift:test:renamed');
    const odd = (await (await post('/gifts/claim', {}, token)).json()).gifts;
    assert.equal(odd.length, 2);
    assert.ok(odd.every(g => g.kind === 'gift'));
    assert.equal(odd.find(g => g.essence).essence, 5);
    assert.equal((await post('/gifts/claim', {})).status, 401, 'a token is needed');
});

test('a clan attack is a fight: strikes in the openings add, a forged list no more than a perfect one, attacks wait up to six', async () => {
    const a = await register('guard_breaker');
    await post('/clans', { name: 'Guard Breakers', tag: 'GB' }, a);
    await post('/save', { state: heroSave({ tokens: 400, bestStage: 60 }) }, a);
    const view = await (await get('/clan', a)).json();
    assert.equal(view.attacksLeft, 3);
    assert.equal(view.attackBank, 6);
    assert.equal(view.fightSeconds, 30);
    const plain = view.members[0].attackDamage;
    const quarters = Array.from({ length: 121 }, (_, i) => i * 250);
    const openings = quarters.filter(t => t >= 4000 && (t - 4000) % 6000 < 2000);

    const fought = await (await post('/clan/attack', { strikes: openings, ms: 30000 }, a)).json();
    assert.ok(fought.damage > plain, `strikes in the openings add (${fought.damage} > ${plain})`);
    assert.equal(fought.strikes, openings.length, 'every strike in an opening landed');
    assert.deepEqual([fought.rank, fought.of, fought.attacksLeft], [1, 1, 2]);
    const forged = await (await post('/clan/attack', { strikes: Array.from({ length: 5000 }, (_, i) => i * 6), ms: 30000, damage: 1e15 }, a)).json();
    assert.ok(forged.damage <= fought.damage, 'a forged list deals no more than a perfect player');
    const early = await (await post('/clan/attack', { strikes: [], ms: 5000 }, a)).json();
    assert.ok(early.damage < plain, 'a fight given up early deals less');
    const none = await post('/clan/attack', {}, a);
    assert.equal(none.status, 400);
    assert.match((await none.json()).error, /3 more come each day/);

    // two quiet days: six wait, and not more
    clock += 2 * 24 * 3600 * 1000;
    assert.equal((await (await get('/clan', a)).json()).attacksLeft, 6);
    clock += 3 * 24 * 3600 * 1000;
    assert.equal((await (await get('/clan', a)).json()).attacksLeft, 6, 'the bank holds six');
    for (let i = 0; i < 6; i++) assert.equal((await post('/clan/attack', {}, a)).status, 200, `attack ${i + 1} of the six waiting`);
    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'then none');
    clock += 24 * 3600 * 1000;
    assert.equal((await (await get('/clan', a)).json()).attacksLeft, 3, 'a new day brings three');
});

test('attacks given back by hand still land: each attack takes the next free slot of the day', async () => {
    // regression (the owner's report): slots were the attacks waiting plus ten, so two attacks given back
    // by hand collided with the morning's slots and every send was refused ("Sending…" for good)
    const t = await register('given_back');
    await post('/clans', { name: 'Second Wind', tag: 'SW' }, t);
    await post('/save', { state: heroSave({ tokens: 50, bestStage: 30 }) }, t);
    for (let i = 0; i < 3; i++) assert.equal((await post('/clan/attack', {}, t)).status, 200);
    assert.equal((await post('/clan/attack', {}, t)).status, 400);
    if (memory) memory.db.charges.get(memory.db.users.find(u => u.username === 'given_back').id).charges += 2;
    else await pool.query("UPDATE clan_charges SET charges = charges + 2 WHERE user_id = (SELECT id FROM users WHERE username = 'given_back')");
    assert.equal((await post('/clan/attack', {}, t)).status, 200, 'the first given back');
    assert.equal((await post('/clan/attack', {}, t)).status, 200, 'and the second');
    assert.equal((await post('/clan/attack', {}, t)).status, 400, 'then none');
});

const WEEK_MS = 7 * 24 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;
/** Move the test clock to the next Monday, `hours` into it (UTC). */
function toMonday(hours = 1) {
    const monday = Date.UTC(2026, 8, 28);
    clock = monday + Math.ceil((clock + 1 - monday) / WEEK_MS) * WEEK_MS + hours * 3600 * 1000;
}

test('honest attacks deal their full damage; an account flagged for impossible numbers deals at most 1% of the boss', async () => {
    // regression (the owner's report): a forged save joined after the boss appeared and felled it with one
    // attack of 100T, the most any attack could deal. A cap of a seventh for everyone hid honest players' real
    // damage, so only a flagged account is held back now.
    toMonday();
    const host = await register('full_host');
    const { clanId } = await (await post('/clans', { name: 'Full Swings', tag: 'FUL' }, host)).json();
    await post('/save', { state: heroSave({ tokens: 400, bestStage: 60 }) }, host);
    const forger = await register('flagged_giant');
    await post('/save', { state: heroSave({ tokens: 1e19, bestStage: 400 }) }, forger);   // tokens beyond any possible save
    await post('/clans/join', { clanId }, forger);
    const { maxHp } = (await (await get('/clan', host)).json()).boss;
    for (let i = 0; i < 3; i++) {
        const hit = await (await post('/clan/attack', { strikes: [], ms: 30000 }, forger)).json();
        near(hit.damage, hit.maxHp * 0.01, `attack ${i + 1}: 1% of ${hit.maxHp}`);
        assert.equal(hit.capped, true);
    }
    // the host's perfect fight: its full damage, whatever share of the boss that is
    const quarters = Array.from({ length: 121 }, (_, i) => i * 250);
    const best = await (await post('/clan/attack', { strikes: quarters, ms: 30000 }, host)).json();
    assert.equal(best.capped, false, `${best.damage} of ${maxHp}`);
    assert.ok(best.damage > maxHp * 0.01);
});

test('a felled boss comes back the next day a level stronger (x1.2), one kill a day; each kill raises the banner; Monday starts over', async () => {
    toMonday();
    const host = await register('level_host');
    const sleeper = await register('level_sleeper');
    const { clanId } = await (await post('/clans', { name: 'Level Climbers', tag: 'LVL' }, host)).json();
    await post('/save', { state: heroSave({ tokens: 2000, bestStage: 90 }) }, sleeper);
    await post('/clans/join', { clanId }, sleeper);
    toMonday();   // a week on: the sleeper hasn't played since
    await post('/save', { state: heroSave({ tokens: 400, bestStage: 60 }) }, host);
    const first = (await (await get('/clan', host)).json());
    const hostAttack = first.members.find(m => m.username === 'level_host').attackDamage;
    assert.equal(first.boss.level, 1);
    const { CLAN_BOSS } = await import('../src/core/power.js');
    near(first.boss.maxHp, CLAN_BOSS.first * hostAttack, 'Monday\'s boss: the host is the clan\'s average, the only one who played this week');

    // felled on Monday: down until midnight UTC
    await peek.bossHpToOne();
    assert.equal((await (await post('/clan/attack', {}, host)).json()).killed, true);
    const refused = await post('/clan/attack', {}, host);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, /midnight UTC/);
    const down = (await (await get('/clan', host)).json());
    assert.deepEqual([down.boss.killed, down.boss.level, down.banner.kills], [true, 1, 1]);
    assert.ok(down.boss.nextInMs > 0 && down.boss.nextInMs <= DAY_MS && down.boss.nextInMs < down.boss.endsInMs);

    // Tuesday: level 2, a fifth more health, full; the sleeper has the banner too
    clock += DAY_MS;
    const tuesday = (await (await get('/clan', host)).json()).boss;
    assert.deepEqual([tuesday.level, tuesday.killed], [2, false]);
    near(tuesday.maxHp, first.boss.maxHp * 1.2);
    near(tuesday.hp, tuesday.maxHp);
    assert.equal((await (await get('/load', sleeper)).json()).banner.kills, 1, 'every member, fought or not');

    // level 2 felled: two levels on the banner
    await post('/clan/attack', {}, host);
    await peek.bossHpToOne();
    const second = await (await post('/clan/attack', {}, host)).json();
    assert.deepEqual([second.killed, second.banner.kills], [true, 2]);

    // Wednesday: level 3 (x1.44). Not felled: Thursday keeps it as it is, damage and all
    clock += DAY_MS;
    const wednesday = (await (await get('/clan', host)).json()).boss;
    assert.equal(wednesday.level, 3);
    near(wednesday.maxHp, first.boss.maxHp * 1.44);
    const hit = await (await post('/clan/attack', {}, host)).json();
    assert.equal(hit.killed, false);
    clock += DAY_MS;
    const thursday = (await (await get('/clan', host)).json());
    assert.equal(thursday.boss.level, 3);
    near(thursday.boss.hp, wednesday.maxHp - hit.damage);
    assert.equal(thursday.banner.kills, 2);

    // Monday: a new boss at level 1, and the banner starts again
    toMonday();
    const next = (await (await get('/clan', host)).json());
    assert.equal(next.boss.level, 1);
    assert.notEqual(next.boss.week, first.boss.week);
    assert.equal(next.banner.kills, 0);
});

test('an upload made over a cloud save the game had not seen is refused (409), and one over the right one is stored', async () => {
    const t = await register('two_devices');
    const first = await (await post('/save', { state: heroSave({ bestStage: 40 }) }, t)).json();
    const laptop = (await (await get('/load', t)).json()).lastSaved;
    clock += 60 * 1000;
    // the phone saves on top of what it saw
    const phone = await post('/save', { state: heroSave({ bestStage: 80 }), base: laptop }, t);
    assert.equal(phone.status, 200);
    clock += 60 * 1000;
    // the laptop, left open, uploads its older game over the cloud save it last saw: refused
    const stale = await post('/save', { state: heroSave({ bestStage: 40 }), base: laptop }, t);
    assert.equal(stale.status, 409);
    assert.equal((await (await get('/load', t)).json()).state.combat.bestStage, 80, 'the newer game stays');
    // after looking again (load), its upload goes over the save it now has seen
    const seen = (await (await get('/load', t)).json()).lastSaved;
    assert.equal((await post('/save', { state: heroSave({ bestStage: 81 }), base: seen }, t)).status, 200);
    // a page from before the check sends no base, and is stored as ever
    assert.equal((await post('/save', { state: heroSave({ bestStage: 82 }) }, t)).status, 200);
    // two uploads over the same save at once: one is stored, the other refused
    const now = (await (await get('/load', t)).json()).lastSaved;
    clock += 1000;
    const both = await Promise.all([post('/save', { state: heroSave({ bestStage: 90 }), base: now }, t), post('/save', { state: heroSave({ bestStage: 91 }), base: now }, t)]);
    assert.deepEqual(both.map(r => r.status).sort(), [200, 409]);
    assert.ok(first.success);
});

test('password guesses sent all at once are counted before they are checked: ten get an answer, the rest wait', async () => {
    await register('rushed_hero');
    const from = { 'X-Forwarded-For': '192.0.2.44' };
    const answers = await Promise.all(Array.from({ length: 30 }, (_, i) => post('/login', { username: 'rushed_hero', password: `guess ${i}` }, null, from)));
    assert.ok(answers.filter(r => r.status === 400).length <= 10, `${answers.filter(r => r.status === 400).length} checked`);
    assert.ok(answers.filter(r => r.status === 429).length >= 20);
    // the player, from their own address, still gets in: ten wrong guesses elsewhere don't lock them out
    assert.equal((await post('/login', { username: 'rushed_hero', password: 'correct horse' }, null, { 'X-Forwarded-For': '198.51.100.200' })).status, 200);
    // and accounts made all at once from one address are counted the same way
    const farm = { 'X-Forwarded-For': '203.0.113.99' };
    const made = await Promise.all(Array.from({ length: 25 }, (_, i) => post('/register', { username: `rush_farm_${i}`, password: 'correct horse', email: `rush_farm_${i}@example.test` }, null, farm)));
    assert.ok(made.filter(r => r.status === 200).length <= 3, `${made.filter(r => r.status === 200).length} accounts`);
    clock += 25 * 60 * 60 * 1000;
});

test("leaving and coming back leaves the week's boss as it was; a strong stranger's hits count, and leaving takes nothing back", async () => {
    const owner = await register('steady_owner');
    const friend = await register('steady_friend');
    await post('/save', { state: heroSave({ tokens: 300, bestStage: 60 }) }, owner);
    await post('/save', { state: heroSave({ tokens: 300, bestStage: 60 }) }, friend);
    const { clanId } = await (await post('/clans', { name: 'Steady Hands', tag: 'STDY' }, owner)).json();
    await post('/clans/join', { clanId }, friend);
    const sized = (await (await get('/clan', owner)).json()).boss;
    await post('/clans/leave', {}, friend);
    await post('/clans/join', { clanId }, friend);
    const again = (await (await get('/clan', owner)).json()).boss;
    near(again.maxHp, sized.maxHp, 'the same boss as before');

    const host = await register('wary_host');
    const stranger = await register('drive_by_two');
    await post('/save', { state: heroSave({ tokens: 50, bestStage: 30 }) }, host);
    await post('/save', { state: heroSave({ tokens: 900, bestStage: 120 }) }, stranger);
    const wary = (await (await post('/clans', { name: 'Wary Folk', tag: 'WARY' }, host)).json()).clanId;
    await post('/clans/join', { clanId: wary }, stranger);
    const hit = await (await post('/clan/attack', { strikes: [], ms: 0 }, stranger)).json();   // given up at once: the least damage
    await post('/clans/leave', {}, stranger);
    const after = (await (await get('/clan', host)).json());
    const own = after.members.find(m => m.username === 'wary_host').attackDamage;
    // in the clan's attacks the boss is as it was, less the stranger's hit, in the host's own hits now
    const { CLAN_BOSS } = await import('../src/core/power.js');
    near(after.boss.maxHp, CLAN_BOSS.first * own);
    near(after.boss.hp / after.boss.maxHp, hit.hp / hit.maxHp, 'the hit stays dealt');
});

test('a clan fight sent twice (its answer lost) is one attack: answered again, one attack spent', async () => {
    const t = await register('twice_sent');
    await post('/save', { state: heroSave({ tokens: 50, bestStage: 30 }) }, t);
    await post('/clans', { name: 'Once Only', tag: 'ONCE' }, t);
    const fight = { strikes: [4100, 4400], ms: 30000, fightAt: clock - 1000 };
    const first = await post('/clan/attack', fight, t);
    assert.equal(first.status, 200);
    const one = await first.json();
    const again = await post('/clan/attack', fight, t);
    assert.equal(again.status, 200);
    const two = await again.json();
    assert.equal(two.damage, one.damage);
    assert.equal(two.attacksLeft, one.attacksLeft, 'no second attack spent');
    assert.equal((await (await get('/clan', t)).json()).board[0].attacks, 1);
    // both at once: still one
    const other = { ...fight, fightAt: clock - 500 };
    const pair = await Promise.all([post('/clan/attack', other, t), post('/clan/attack', other, t)]);
    assert.deepEqual(pair.map(r => r.status), [200, 200]);
    assert.equal((await (await get('/clan', t)).json()).board[0].attacks, 2);
});

test('a name is one account whatever its case', async () => {
    await register('CaseHero');
    assert.equal((await post('/register', { username: 'casehero', password: 'correct horse', email: 'case.other@example.test' })).status, 400);
    const res = await post('/login', { username: 'CASEHERO', password: 'correct horse' });
    assert.equal(res.status, 200);
});

test('a member left in a clan deleted under them is let out of it', async () => {
    const t = await register('left_behind');
    const { clanId } = await (await post('/clans', { name: 'Vanished', tag: 'VAN' }, t)).json();
    // its last member left as this one joined: the clan is gone, the membership not (made by hand here)
    if (memory) memory.db.clans = memory.db.clans.filter(c => c.id !== clanId);
    else await pool.query('DELETE FROM clans WHERE id = $1', [clanId]);
    const view = await get('/clan', t);
    assert.equal(view.status, 200);
    assert.equal((await view.json()).clan, null);
    assert.equal((await post('/clans', { name: 'Found Again', tag: 'FND' }, t)).status, 200, 'free to start another');
});

test("a boss made at another size for its level moves to its size once: the same share of its health left, its attacks scaled with it", async () => {
    const { CLAN_BOSS } = await import('../src/core/power.js');
    const t = await register('patient_slayer');
    await post('/save', { state: heroSave({ tokens: 50, bestStage: 30 }) }, t);
    await post('/clans', { name: 'Patient Ones', tag: 'PAT' }, t);
    const hit = await (await post('/clan/attack', { strikes: [], ms: 30000 }, t)).json();
    await peek.bossBigger('patient_slayer', 1.5);   // as a level 1 of thirty attacks was, before 26 October 2026
    const moved = await (await get('/clan', t)).json();
    near(moved.boss.maxHp, CLAN_BOSS.first * moved.members[0].attackDamage, 'its size now');
    near(moved.boss.hp / moved.boss.maxHp, hit.hp / hit.maxHp, 'as far down as it was');
    near(moved.board[0].damage, hit.damage, 'the attack scaled with it');
    const again = (await (await get('/clan', t)).json()).boss;
    near(again.hp, moved.boss.hp, 'once');
});

test('a token whose name is no longer its account\'s is refused', async () => {
    const t = await register('renamed_one');
    assert.equal((await get('/load', t)).status, 200);
    if (memory) memory.db.users.find(u => u.username === 'renamed_one').username = 'someone_else';
    else await pool.query("UPDATE users SET username = 'someone_else' WHERE username = 'renamed_one'");
    clock += 11 * 60 * 1000;   // past the instance's memory of names
    assert.equal((await get('/load', t)).status, 401);
});

test('the health check asks the database every time, and a body that is not JSON gets a JSON answer', async () => {
    if (memory) {
        const ping = memory.ping;
        memory.ping = async () => { throw new Error('down'); };
        const res = await get('/health');
        assert.equal(res.status, 503);
        assert.equal((await res.json()).db, false);
        memory.ping = ping;
    }
    const t = await register('broken_json');
    const res = await fetch(`${base}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: '{"state": {' });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /json/);
});

test("this week's board counts from where the player stood when the week began, not from the week's first upload", async () => {
    const t = await register('weekly_honest');
    await post('/leaderboard/consent', { optIn: true }, t);
    await post('/save', { state: heroSave({ bestStage: 200 }) }, t);
    clock += 7 * 24 * 3600 * 1000;   // a new week
    await post('/save', { state: heroSave({ bestStage: 1 }) }, t);    // an empty save first
    await post('/save', { state: heroSave({ bestStage: 205 }) }, t);
    clock += 61 * 1000;
    const board = await (await get('/leaderboard?metric=bestStage&period=week', t)).json();
    assert.equal(board.me.value, 5, 'five stages this week, not 204');
});

test("the boss is shown in the member's attack at its best this week (a weak save just before Monday doesn't shrink it)", async () => {
    const t = await register('sly_sizer');
    await post('/save', { state: heroSave({ tokens: 900, bestStage: 120 }) }, t);
    const { plainAttack } = await import('../src/core/power.js');
    const strong = plainAttack(heroSave({ tokens: 900, bestStage: 120 }), clock);
    await post('/save', { state: heroSave({ tokens: 0, bestStage: 120 }) }, t);   // weak, just before the boss is made
    await post('/clans', { name: 'Sly Ones', tag: 'SLY' }, t);
    const view = await (await get('/clan', t)).json();
    near(view.members[0].attackDamage, strong, 'the member\'s attack is their best of the week');
    const { CLAN_BOSS } = await import('../src/core/power.js');
    near(view.boss.maxHp, CLAN_BOSS.first * strong);
});

test("a clan attack is the hero's best of the past week, wherever in a run it is made (the owner's report: a run's end hit 7x harder)", async () => {
    toMonday(2);
    const { plainAttack } = await import('../src/core/power.js');
    const hero = await register('run_ender');
    await post('/clans', { name: 'Run Enders', tag: 'END' }, hero);
    // at a run's end: forty whetstone levels; then a prestige packs the camp up
    await post('/save', { state: heroSave({ tokens: 500, bestStage: 120, camp: { whetstone: 40 } }) }, hero);
    const atBest = (await (await get('/clan', hero)).json()).members[0].attackDamage;
    await post('/save', { state: heroSave({ tokens: 500, bestStage: 120 }) }, hero);
    const view = await (await get('/clan', hero)).json();
    assert.equal(view.members[0].attackDamage, atBest, 'the Clan tab shows the attack that counts');
    const now = plainAttack(heroSave({ tokens: 500, bestStage: 120 }), clock);
    near(view.attackScale, atBest / now, 'the fight on screen hits as hard');
    assert.ok(view.attackScale > 6, `x${view.attackScale}`);
    const hit = await (await post('/clan/attack', { strikes: [], ms: 30000 }, hero)).json();
    near(hit.damage, atBest, 'just after a prestige, the attack is the one at the run\'s end');
    const half = await (await post('/clan/attack', { strikes: [], ms: 15000 }, hero)).json();
    assert.ok(half.damage > atBest * 0.4 && half.damage < atBest * 0.6, `half a fight: ${half.damage} of ${atBest}`);
    // that best is kept a week, then the attack is the hero as he is
    clock += 8 * DAY_MS;
    await post('/save', { state: heroSave({ tokens: 500, bestStage: 120 }) }, hero);
    const later = await (await get('/clan', hero)).json();
    near(later.members[0].attackDamage, now);
    assert.equal(later.attackScale, 1);
});

test("an attack counts the fight, not how far the hero grew that day: the boss follows the hero's figures, the board keeps shares", async () => {
    // until 26 October 2026 the boss was sized at the day's first look, and a hero who grew through the day felled a level in one attack
    toMonday(3);
    const { CLAN_BOSS } = await import('../src/core/power.js');
    const grower = await register('fast_grower');
    await post('/clans', { name: 'Fast Growers', tag: 'GROW' }, grower);
    await post('/save', { state: heroSave({ tokens: 200, bestStage: 100 }) }, grower);
    const monday = await (await get('/clan', grower)).json();
    const weak = monday.members[0].attackDamage;
    near(monday.boss.maxHp, CLAN_BOSS.first * weak);
    const hit = await (await post('/clan/attack', { strikes: [], ms: 30000 }, grower)).json();
    near(hit.damage, weak);
    near(hit.hp / hit.maxHp, 1 - 1 / CLAN_BOSS.first, 'a whole fight without a strike or a potion: one of its attacks');
    // stronger the same day (a run's end): the boss is as far down, in the bigger figures of the hero he is now
    await post('/save', { state: heroSave({ tokens: 200, bestStage: 100, camp: { whetstone: 30 } }) }, grower);
    const evening = await (await get('/clan', grower)).json();
    const strong = evening.members[0].attackDamage;
    assert.ok(strong > 3 * weak, `${strong} vs ${weak}`);
    near(evening.boss.maxHp, CLAN_BOSS.first * strong);
    near(evening.boss.hp / evening.boss.maxHp, hit.hp / hit.maxHp, 'what was dealt stays dealt');
    const second = await (await post('/clan/attack', { strikes: [], ms: 30000 }, grower)).json();
    near(second.damage, strong, 'it hits as the stronger hero');
    near(second.hp / second.maxHp, 1 - 2 / CLAN_BOSS.first, 'and counts one attack, as the first did');
    clock += DAY_MS;
    const board = (await (await get('/clan', grower)).json()).board;
    assert.deepEqual([board[0].share, board[0].attacks], [1, 2]);
});

test("a save flagged for impossible numbers adds nothing to the hero's best of the week", async () => {
    toMonday(6);
    const sly = await register('one_big_save');
    await post('/clans', { name: 'Big Savers', tag: 'BIG' }, sly);
    await post('/save', { state: heroSave({ tokens: 100, bestStage: 60 }) }, sly);
    const honest = (await (await get('/clan', sly)).json()).members[0].attackDamage;
    const forged = await (await post('/save', { state: heroSave({ tokens: 1e19, bestStage: 60 }) }, sly)).json();
    assert.equal(forged.flagged, true);
    await post('/save', { state: heroSave({ tokens: 100, bestStage: 60 }) }, sly);
    near((await (await get('/clan', sly)).json()).members[0].attackDamage, honest, 'the forged save left no best behind');
});

test("numbers stored before the days' bests were kept: their one high still counts, and joins the days", async () => {
    toMonday(4);
    const old = await register('old_timer');
    await post('/clans', { name: 'Old Timers', tag: 'OLD' }, old);
    await post('/save', { state: heroSave({ tokens: 100, bestStage: 80 }) }, old);
    const { attackDamage, bestStage } = await peek.metrics('old_timer');
    const high = attackDamage * 5;
    await peek.setMetrics('old_timer', { attackDamage, bestStage, attackPeak: { v: high, at: clock - 2 * DAY_MS } });
    clock += DAY_MS;
    near((await (await get('/clan', old)).json()).members[0].attackDamage, high, 'read as it was');
    await post('/save', { state: heroSave({ tokens: 100, bestStage: 80 }) }, old);
    const kept = await peek.metrics('old_timer');
    assert.equal(Object.values(kept.attackDays).length, 2, 'its day and today');
    near((await (await get('/clan', old)).json()).members[0].attackDamage, high);
});

// ---------- sign-up by email (the owner, October 2026; README "The API") ----------

test('sign-up needs an email, and the account plays once the code mailed there is entered', async () => {
    const from = { 'X-Forwarded-For': '192.0.2.10' };
    assert.equal((await post('/register', { username: 'mail_hero', password: 'correct horse' }, null, from)).status, 400, 'no email');
    assert.equal((await post('/register', { username: 'mail_hero', password: 'correct horse', email: 'not an address' }, null, from)).status, 400);
    const made = await post('/register', { username: 'mail_hero', password: 'correct horse', email: '  Mail.Hero@Example.TEST ' }, null, from);
    assert.equal(made.status, 200);
    const body = await made.json();
    assert.equal(body.pending, true);
    assert.equal(body.token, undefined, 'no token before the code');
    assert.equal(body.email, 'ma***@example.test', 'the address shown in part, lowercase');
    const code = codeFor('mail.hero@example.test');
    assert.match(code, /^\d{6}$/);
    assert.match(mailbox.at(-1).subject, new RegExp(code));
    assert.match(mailbox.at(-1).html, new RegExp(code));
    // the right password, but not confirmed: the code first (409, which the game doesn't take for a lost session)
    const early = await post('/login', { username: 'mail_hero', password: 'correct horse' }, null, from);
    assert.equal(early.status, 409);
    assert.equal((await early.json()).pending, true);
    assert.equal((await post('/verify', { username: 'mail_hero', code: code === '000000' ? '000001' : '000000' }, null, from)).status, 400, 'a wrong code');
    const confirmed = await post('/verify', { username: 'mail_hero', code }, null, from);
    assert.equal(confirmed.status, 200);
    assert.ok((await confirmed.json()).token);
    assert.equal((await post('/login', { username: 'mail_hero', password: 'correct horse' }, null, from)).status, 200);
    assert.equal((await post('/verify', { username: 'mail_hero', code }, null, from)).status, 400, 'confirmed already');
    // one account an address, whatever its case
    const twice = await post('/register', { username: 'mail_twin', password: 'correct horse', email: 'MAIL.hero@example.test' }, null, from);
    assert.equal(twice.status, 400);
    assert.match((await twice.json()).error, /already has an account/);
});

test('a code takes five tries and lives fifteen minutes; a new one goes once a minute, five an hour', async () => {
    const from = { 'X-Forwarded-For': '192.0.2.11' };
    const email = 'tries@example.test';
    assert.equal((await post('/register', { username: 'try_hero', password: 'correct horse', email }, null, from)).status, 200);
    const code = codeFor(email);
    const wrong = code === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) assert.match((await (await post('/verify', { username: 'try_hero', code: wrong }, null, from)).json()).error, /wrong/);
    assert.match((await (await post('/verify', { username: 'try_hero', code }, null, from)).json()).error, /Too many tries/, 'even the right one, after five');
    // a new one: not within a minute of the last
    const soon = await post('/verify/resend', { username: 'try_hero' }, null, from);
    assert.equal(soon.status, 429);
    clock += 61 * 1000;
    assert.equal((await post('/verify/resend', { username: 'try_hero' }, null, from)).status, 200);
    const second = codeFor(email);
    // it runs out after fifteen minutes
    clock += 16 * 60 * 1000;
    assert.match((await (await post('/verify', { username: 'try_hero', code: second }, null, from)).json()).error, /run out/);
    // five mails an hour to an account: the sign-up's, then four more
    const sent = mailsTo(email);
    for (let i = 0; i < 3; i++) { clock += 61 * 1000; assert.equal((await post('/verify/resend', { username: 'try_hero' }, null, from)).status, 200); }
    clock += 61 * 1000;
    assert.equal((await post('/verify/resend', { username: 'try_hero' }, null, from)).status, 429, 'the sixth in the hour');
    assert.equal(mailsTo(email), sent + 3);
    clock += 61 * 60 * 1000;
    assert.equal((await post('/verify/resend', { username: 'try_hero' }, null, from)).status, 200, 'an hour on');
    assert.equal((await post('/verify', { username: 'try_hero', code: codeFor(email) }, null, from)).status, 200);
});

test('a forgotten password: a code to the address, then a new password; the same answer for an address nobody has', async () => {
    const from = { 'X-Forwarded-For': '192.0.2.12' };
    await register('forgetful');
    const before = mailbox.length;
    const nobody = await post('/password/forgot', { email: 'nobody.here@example.test' }, null, from);
    assert.equal(nobody.status, 200);
    assert.equal((await nobody.json()).sent, true);
    assert.equal(mailbox.length, before, 'no mail for an address no account has');
    assert.equal((await post('/password/forgot', { email: emailOf('forgetful') }, null, from)).status, 200);
    const code = codeFor(emailOf('forgetful'));
    assert.match(mailbox.at(-1).subject, /password/);
    assert.equal((await post('/password/reset', { email: emailOf('forgetful'), code, password: 'short' }, null, from)).status, 400, 'a password too short');
    assert.equal((await post('/password/reset', { email: emailOf('forgetful'), code: code === '333333' ? '444444' : '333333', password: 'a brand new one' }, null, from)).status, 400);
    const reset = await post('/password/reset', { email: emailOf('forgetful'), code, password: 'a brand new one' }, null, from);
    assert.equal(reset.status, 200);
    assert.ok((await reset.json()).token);
    assert.equal((await post('/login', { username: 'forgetful', password: 'correct horse' }, null, from)).status, 400, 'the old password is gone');
    assert.equal((await post('/login', { username: 'forgetful', password: 'a brand new one' }, null, from)).status, 200);
    // an account whose address was never confirmed: the reset code reached it, so it is confirmed now
    assert.equal((await post('/register', { username: 'never_confirmed', password: 'correct horse', email: 'never@example.test' }, null, from)).status, 200);
    clock += 61 * 1000;
    await post('/password/forgot', { email: 'never@example.test' }, null, from);
    assert.equal((await post('/password/reset', { email: 'never@example.test', code: codeFor('never@example.test'), password: 'another new one' }, null, from)).status, 200);
    assert.equal((await post('/login', { username: 'never_confirmed', password: 'another new one' }, null, from)).status, 200);
});

test('when the mail service fails the account waits, and a new code can be asked for at once', async () => {
    const from = { 'X-Forwarded-For': '192.0.2.13' };
    mailDown = true;
    const made = await post('/register', { username: 'unlucky', password: 'correct horse', email: 'unlucky@example.test' }, null, from);
    mailDown = false;
    assert.equal(made.status, 502);
    assert.equal((await made.json()).pending, true);
    assert.equal(mailsTo('unlucky@example.test'), 0);
    assert.equal((await post('/verify/resend', { username: 'unlucky' }, null, from)).status, 200, 'the failed one holds nothing back');
    assert.equal((await post('/verify', { username: 'unlucky', code: codeFor('unlucky@example.test') }, null, from)).status, 200);
});

test("no answer another player sees carries anyone's email", async () => {
    const a = await register('private_one');
    const b = await register('private_two');
    await post('/save', { state: heroSave({ bestStage: 20 }) }, a);
    await post('/save', { state: heroSave({ bestStage: 20 }) }, b);
    await post('/leaderboard/consent', { optIn: true }, a);
    const { clanId } = await (await post('/clans', { name: 'Quiet Ones', tag: 'QUI' }, a)).json();
    await post('/clans/join', { clanId }, b);
    for (const answer of [await get('/clan', b), await get('/clans', b), await get('/leaderboard?metric=bestStage', b), await get('/load', b)]) {
        const text = await answer.text();
        assert.ok(!/@example\.test/.test(text), `an address in ${answer.url}`);
    }
});

test("the week's ranking: divisions by the levels felled, the Endless Hydra at the weekend, two fights and the deepest counting, crowns the next week", async () => {
    toMonday();
    const a1 = await register('rank_a1');
    const a2 = await register('rank_a2');
    const b1 = await register('rank_b1');
    const flag = await register('rank_flag');
    const { clanId: clanA } = await (await post('/clans', { name: 'Deep Divers', tag: 'DEEP' }, a1)).json();
    const { clanId: clanB } = await (await post('/clans', { name: 'Hydra Hunters', tag: 'HYD' }, b1)).json();
    await post('/clans/join', { clanId: clanA }, a2);
    await post('/clans/join', { clanId: clanB }, flag);
    const saves = [[a1, { tokens: 400, bestStage: 60 }], [a2, { tokens: 50, bestStage: 30 }], [b1, { tokens: 400, bestStage: 60 }], [flag, { tokens: 1e19, bestStage: 400 }]];
    toMonday();   // a new week: all four were in their clans when it began
    for (const [token, hero] of saves) await post('/save', { state: heroSave(hero) }, token);

    // before the weekend the Hydra sleeps
    const asleep = (await (await get('/clan', a1)).json()).endless;
    assert.deepEqual([asleep.open, asleep.eligible, asleep.attacksLeft, asleep.attacks], [false, true, 2, 2]);
    assert.ok(asleep.opensInMs > 4 * DAY_MS && asleep.opensInMs <= 5 * DAY_MS, `wakes in ${asleep.opensInMs} ms`);
    const early = await post('/clan/attack', { endless: true, strikes: [], ms: 30000 }, a1);
    assert.equal(early.status, 400);
    assert.match((await early.json()).error, /Saturday/);

    // the week's boss: clan B fells three levels (Monday to Wednesday), clan A one
    await get('/clan', b1);
    await peek.bossHpToOne();
    assert.equal((await (await post('/clan/attack', {}, a1)).json()).killed, true);
    assert.equal((await (await post('/clan/attack', {}, b1)).json()).killed, true);
    for (let day = 2; day <= 3; day++) {
        clock += DAY_MS;
        await get('/clan', b1);
        await peek.bossHpToOne();
        assert.equal((await (await post('/clan/attack', {}, b1)).json()).killed, true, `clan B's level ${day}`);
    }

    // Saturday: awake. One who joined this week isn't counted
    clock += 3 * DAY_MS;
    const awake = (await (await get('/clan', a1)).json()).endless;
    assert.deepEqual([awake.open, awake.attacksLeft], [true, 2]);
    const late = await register('rank_late');
    await post('/save', { state: heroSave({ tokens: 400, bestStage: 60 }) }, late);
    await post('/clans/join', { clanId: clanA }, late);
    assert.equal((await (await get('/clan', late)).json()).endless.eligible, false);
    const refused = await post('/clan/attack', { endless: true }, late);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, /when the week began/);

    // two fights each, and the deepest counts; the same fight sent again is the same attack
    const quarters = Array.from({ length: 121 }, (_, i) => i * 250);
    const deep = await (await post('/clan/attack', { endless: true, strikes: quarters, ms: 30000, fightAt: clock }, a1)).json();
    assert.equal(deep.endless, true);
    assert.ok(deep.depth > 1, `depth ${deep.depth}`);
    assert.equal(deep.attacksLeft, 1);
    const again = await (await post('/clan/attack', { endless: true, strikes: quarters, ms: 30000, fightAt: clock }, a1)).json();
    assert.deepEqual([again.again, again.depth, again.attacksLeft], [true, deep.depth, 1]);
    clock += 1000;
    const shallow = await (await post('/clan/attack', { endless: true, strikes: [], ms: 5000 }, a1)).json();
    assert.ok(shallow.depth < deep.depth, `${shallow.depth} < ${deep.depth}`);
    assert.deepEqual([shallow.best, shallow.attacksLeft], [deep.depth, 0], 'the deepest counts');
    const third = await post('/clan/attack', { endless: true }, a1);
    assert.equal(third.status, 400);
    assert.match((await third.json()).error, /2 attacks/);
    const a2hit = await (await post('/clan/attack', { endless: true, strikes: [], ms: 30000 }, a2)).json();
    const b1hit = await (await post('/clan/attack', { endless: true, strikes: [], ms: 30000 }, b1)).json();
    const flagged = await (await post('/clan/attack', { endless: true, strikes: [], ms: 30000 }, flag)).json();
    assert.equal(flagged.counted, false, 'an account flagged for impossible numbers is left out');

    // the standings: B in Silver (three levels), A in Bronze (one), each clan's depth its members' deepest together
    const ranking = await (await get('/clans/ranking', a1)).json();
    const division = id => ranking.divisions.find(d => d.id === id).clans;
    assert.deepEqual(division('silver').map(c => [c.name, c.kills, c.rank, c.you]), [['Hydra Hunters', 3, 1, false]]);
    assert.deepEqual(division('bronze').map(c => [c.name, c.kills, c.rank, c.you]), [['Deep Divers', 1, 1, true]]);
    assert.equal(division('bronze')[0].score, Math.round((deep.depth + a2hit.depth) * 10) / 10);
    assert.equal(division('silver')[0].score, Math.round(b1hit.depth * 10) / 10, 'the flagged member left out');
    assert.deepEqual([division('silver')[0].counted, division('gold').length, division('champion').length], [1, 0, 0]);
    const standing = (await (await get('/clan', a1)).json()).standing;
    assert.deepEqual([standing.division, standing.rank, standing.of], ['bronze', 1, 1]);

    // the next week: last week's top three of each division wear a crown, its best week is the clan's record, and the
    // Hydra sleeps again
    toMonday();
    const listed = (await (await get('/clans?search=', a1)).json()).clans;
    const crownOf = name => { const c = listed.find(x => x.name === name).crown; return c && [c.division, c.rank]; };
    assert.deepEqual([crownOf('Deep Divers'), crownOf('Hydra Hunters')], [['bronze', 1], ['silver', 1]]);
    const next = await (await get('/clan', a1)).json();
    assert.deepEqual([next.clan.crown.division, next.clan.crown.rank], ['bronze', 1]);
    assert.equal(next.standing.record, division('bronze')[0].score, "its best week kept");
    assert.equal(next.endless.open, false);
    const last = (await (await get('/clans/ranking', a1)).json()).last;
    assert.deepEqual(last.divisions.map(d => [d.id, d.clans.map(c => c.name)]), [['silver', ['Hydra Hunters']], ['bronze', ['Deep Divers']]]);
});
