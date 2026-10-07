// API tests against an in-memory stand-in for the data layer (test/helpers/memory-store.cjs).
// The real `api/store.js` is replaced in the require cache before the app loads; the real SQL is
// checked against Postgres by tools/api-postgres-check.cjs.

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
    }
};

// The server reads Date.now(); tests move the clock to cross days and weeks.
const realNow = Date.now;
let clock = Date.UTC(2026, 8, 29, 12, 0, 0); // Tuesday of ISO week 2026-W40
Date.now = () => clock;

let server;
let base;
before(async () => {
    if (pool) await pool.query('DROP TABLE IF EXISTS users, clans, clan_members, clan_bosses, clan_boss_shares, clan_attacks, rewards, weekly_snapshots, auth_attempts');
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server.close(); Date.now = realNow; if (pool) await pool.end(); });

const post = (p, body, token, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) });
const get = (p, token) => fetch(base + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

// Each test player registers from an address of their own, as real players do (one address may only
// make a few accounts an hour).
let addresses = 0;
async function register(username) {
    const res = await post('/register', { username, password: 'correct horse' }, null, { 'X-Forwarded-For': `10.0.${Math.floor(++addresses / 250)}.${addresses % 250}` });
    assert.equal(res.status, 200, `register ${username}`);
    return (await res.json()).token;
}

/** A small but valid save: the server migrates whatever it gets, so a partial state is enough. */
function heroSave({ tokens = 0, bestStage = 1, playtimeMs = 0, xp = 0 } = {}) {
    return { version: 3, meta: { playtimeMs, savedAt: clock }, prestige: { tokens }, combat: { bestStage, maxStage: bestStage }, skills: { combat: { xp } } };
}

test('register validates username and password', async () => {
    assert.equal((await post('/register', { username: 'ab', password: 'longenough' })).status, 400);
    assert.equal((await post('/register', { username: 'bad name!', password: 'longenough' })).status, 400);
    assert.equal((await post('/register', { username: 'hero', password: 'short' })).status, 400);
});

test('register, login, save and load round-trip, with the server clock', async () => {
    const token = await register('hero_1');
    assert.equal((await post('/register', { username: 'hero_1', password: 'correct horse' })).status, 400, 'duplicate username');
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

    // The numbers checked are the server's own reading of the save: a raw field can't be dressed up.
    const sneaky = await register('sneaky_stage');
    const sneakySave = { ...heroSave(), combat: { stage: 999999, bestStage: 1, maxStage: 1 } };
    assert.equal((await (await post('/save', { state: sneakySave }, sneaky)).json()).flagged, true, 'a far stage under a modest best stage');

    // Growth is measured from each number's highest value and when it was reached.
    const { plausibilityFlags } = app;
    const { plausibleAttackDamage } = await import('../src/core/power.js');
    const hour = 3600 * 1000;
    const t0 = clock;
    const m = (o = {}) => ({ bestStage: 1, titanKills: 0, dungeonClears: 0, totalXp: 0, tokens: 0, attackDamage: 0, ...o });
    const run = (peaks, metrics, at) => plausibilityFlags(peaks, metrics, at, plausibleAttackDamage);
    const highs = metrics => run(null, metrics, t0).peaks;
    assert.deepEqual(run(highs(m({ bestStage: 40 })), m({ bestStage: 90, totalXp: 2e6 }), t0 + hour).flags, [], 'a good hour is fine');
    const today = m({ bestStage: 90, tokens: 900, titanKills: 10, totalXp: 9e6 });
    const restored = run(highs(today), m({ bestStage: 60, tokens: 10, titanKills: 4, totalXp: 5e6 }), t0 + 2 * 60 * 1000);
    assert.deepEqual(restored.flags, [], 'going back (a restored backup) is not cheating');
    assert.deepEqual(run(restored.peaks, today, t0 + 4 * 60 * 1000).flags, [], 'nor is coming forward to the newer save again');
    assert.deepEqual(run(highs(m()), m({ totalXp: 30e6 }), t0 + 12 * hour).flags, [], 'a long absence allows a long replay');
    assert.ok(run(highs(m()), m({ totalXp: 30e6 }), t0 + 60 * 1000).flags.length, 'but not a minute later');
    assert.ok(run(null, m({ bestStage: 5, attackDamage: 1e12 }), t0).flags.includes('attack beyond what its best stage allows'), 'a weapon no play could make');
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

test('the clan boss: damage comes from the stored save, three attacks a day, the kill pays once', async () => {
    const a = await register('striker_a');
    const b = await register('striker_b');
    const { clanId } = await (await post('/clans', { name: 'Boss Hunters', tag: 'BH' }, a)).json();
    await post('/clans/join', { clanId }, b);

    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'no stored save yet');
    await post('/save', { state: heroSave({ tokens: 400, bestStage: 60 }) }, a);
    await post('/save', { state: heroSave({ tokens: 0, bestStage: 1 }) }, b);

    const view = await (await get('/clan', a)).json();
    assert.equal(view.attacksLeft, 3);
    const strong = view.members.find(m => m.username === 'striker_a').attackDamage;
    const weak = view.members.find(m => m.username === 'striker_b').attackDamage;
    assert.ok(strong > weak, 'tokens show up in the server-computed damage');
    assert.equal(view.boss.maxHp, Math.max(1000, (strong + weak) * 12));

    const hit = await (await post('/clan/attack', { damage: 1e15 }, a)).json();
    assert.equal(hit.damage, strong, 'a damage number sent by the client is ignored');
    await post('/clan/attack', {}, a);
    await post('/clan/attack', {}, a);
    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'three a day');

    // Next day: more attacks; wear the boss down until it falls.
    let killed = false;
    for (let day = 1; day <= 30 && !killed; day++) {
        clock += 24 * 3600 * 1000;
        if ((await (await get('/clan', a)).json()).boss.week !== view.boss.week) break;
        for (let i = 0; i < 3 && !killed; i++) {
            const r = await (await post('/clan/attack', {}, a)).json();
            killed = !!r.killed;
        }
    }
    if (!killed) {
        // The boss outlived the week at this strength; make it quick and check the kill instead.
        await peek.bossHpToOne();
        clock += 24 * 3600 * 1000;
        killed = !!(await (await post('/clan/attack', {}, a)).json()).killed;
    }
    assert.ok(killed);
    const rewards = (await (await get('/rewards', a)).json()).rewards;
    assert.equal(rewards.filter(r => r.kind === 'kill').length, 1);
    assert.equal(rewards.filter(r => r.kind === 'lastHit').length, 1);
    assert.equal((await post('/clan/attack', {}, a)).status, 400, 'no attacking a dead boss');

    const claimed = (await (await post('/rewards/claim', { ids: rewards.map(r => r.id) }, a)).json()).rewards;
    assert.equal(claimed.length, rewards.length);
    assert.equal((await (await post('/rewards/claim', { ids: rewards.map(r => r.id) }, a)).json()).rewards.length, 0, 'claiming twice pays once');
    assert.equal((await (await post('/rewards/claim', { ids: rewards.map(r => r.id) }, b)).json()).rewards.length, 0, 'not your rewards');
});

test('a finished week pays participation and top-three rewards when the clan is next opened', async () => {
    const leader = await register('weekly_a');
    const helper = await register('weekly_b');
    const { clanId } = await (await post('/clans', { name: 'Weeklies', tag: 'WK' }, leader)).json();
    await post('/clans/join', { clanId }, helper);
    await post('/save', { state: heroSave({ tokens: 200 }) }, leader);
    await post('/save', { state: heroSave({ tokens: 10 }) }, helper);
    await post('/clan/attack', {}, leader);
    await post('/clan/attack', {}, helper);
    clock += 8 * 24 * 3600 * 1000; // next week
    await get('/clan', leader);
    const mine = (await (await get('/rewards', leader)).json()).rewards;
    assert.ok(mine.some(r => r.kind === 'participation'));
    assert.ok(mine.some(r => r.kind === 'top' && /#1/.test(r.text)));
    const theirs = (await (await get('/rewards', helper)).json()).rewards;
    assert.ok(theirs.some(r => r.kind === 'top' && /#2/.test(r.text)));
    await get('/clan', helper);
    assert.equal((await (await get('/rewards', helper)).json()).rewards.length, theirs.length, 'a week settles once');
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

test('parallel requests pay a finished week once, and once per player across clans', async () => {
    const a = await register('race_a');
    const b = await register('race_b');
    await post('/save', { state: heroSave({ tokens: 50 }) }, a);
    await post('/save', { state: heroSave({ tokens: 50 }) }, b);
    const { clanId: first } = await (await post('/clans', { name: 'Racers One', tag: 'RC1' }, a)).json();
    await post('/clan/attack', {}, a);
    // Same week, a second clan: attack there too.
    await post('/clans/leave', {}, a);
    const { clanId: second } = await (await post('/clans', { name: 'Racers Two', tag: 'RC2' }, a)).json();
    await post('/clans/join', { clanId: second }, b);
    clock += 24 * 3600 * 1000;
    await post('/clan/attack', {}, a);
    await post('/clan/attack', {}, b);
    assert.ok(first !== second);
    clock += 8 * 24 * 3600 * 1000; // the week is over
    await Promise.all(Array.from({ length: 8 }, () => get('/clan', b)));
    const rewards = (await (await get('/rewards', a)).json()).rewards;
    assert.equal(rewards.filter(r => r.kind === 'participation').length, 1, 'one participation reward for the week');
    assert.ok(rewards.filter(r => r.kind === 'top').length <= 1, 'at most one top-three reward for the week');
    const theirs = (await (await get('/rewards', b)).json()).rewards;
    assert.equal(theirs.filter(r => r.kind === 'participation').length, 1);
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
    assert.ok(Number.isSafeInteger(data.boss.maxHp), `boss HP ${data.boss.maxHp}`);
    const hit = await post('/clan/attack', {}, giant);
    assert.equal(hit.status, 200);
    assert.ok(Number.isSafeInteger((await hit.json()).damage));
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

test('leaderboards ignore inherited metric names', async () => {
    const t = await register('curious');
    const res = await (await get('/leaderboard?metric=constructor', t)).json();
    assert.equal(res.metric, 'bestStage');
});

test('password guessing stops after ten tries per name, and one address makes only a few accounts an hour', async () => {
    await register('guarded_hero');
    const from = { 'X-Forwarded-For': '203.0.113.7' };
    for (let i = 0; i < 10; i++) assert.equal((await post('/login', { username: 'guarded_hero', password: `wrong ${i}` }, null, from)).status, 400);
    assert.equal((await post('/login', { username: 'guarded_hero', password: 'correct horse' }, null, from)).status, 429, 'even the right password waits');
    clock += 16 * 60 * 1000;
    assert.equal((await post('/login', { username: 'guarded_hero', password: 'correct horse' }, null, from)).status, 200, 'after the window it works again');
    const farm = { 'X-Forwarded-For': '198.51.100.9' };
    for (let i = 0; i < 10; i++) assert.equal((await post('/register', { username: `farm_${i}`, password: 'correct horse' }, null, farm)).status, 200);
    assert.equal((await post('/register', { username: 'farm_10', password: 'correct horse' }, null, farm)).status, 429);
});

test("a member who leaves before fighting takes their part of the week's boss with them", async () => {
    const owner = await register('honest_owner');
    const griefer = await register('drive_by');
    await post('/save', { state: heroSave({ tokens: 50, bestStage: 30 }) }, owner);
    await post('/save', { state: heroSave({ tokens: 900, bestStage: 120 }) }, griefer);
    const { clanId } = await (await post('/clans', { name: 'Honest Folk', tag: 'HF' }, owner)).json();
    await post('/clans/join', { clanId }, griefer);
    const sized = (await (await get('/clan', owner)).json()).boss.maxHp;
    await post('/clans/leave', {}, griefer);
    const after = (await (await get('/clan', owner)).json());
    const ownerShare = after.members.find(m => m.username === 'honest_owner').attackDamage * 12;
    assert.ok(after.boss.maxHp < sized, `${after.boss.maxHp} < ${sized}`);
    assert.equal(after.boss.maxHp, Math.max(1000, ownerShare), 'the boss is sized for the ones who stayed');
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
