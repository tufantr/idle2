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
    if (pool) await pool.query('DROP TABLE IF EXISTS users, clans, clan_members, clan_bosses, clan_attacks, rewards, weekly_snapshots');
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server.close(); Date.now = realNow; if (pool) await pool.end(); });

const post = (p, body, token) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const get = (p, token) => fetch(base + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

async function register(username) {
    const res = await post('/register', { username, password: 'correct horse' });
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

test('implausible uploads are kept but flagged', async () => {
    const token = await register('speedy');
    assert.equal((await post('/save', { state: heroSave({ playtimeMs: 1000, bestStage: 50, tokens: 100 }) }, token)).status, 200);
    clock += 60 * 1000;
    const res = await (await post('/save', { state: heroSave({ playtimeMs: 5 * 3600 * 1000, bestStage: 40, tokens: 50 }) }, token)).json();
    assert.equal(res.flagged, true);
    const flags = (await peek.flags('speedy')).map(f => f.reason);
    assert.ok(flags.includes('playtime grew faster than real time'));
    assert.ok(flags.includes('best stage went down'));
    assert.ok(flags.includes('prestige tokens went down'));
    const loaded = await (await get('/load', token)).json();
    assert.equal(loaded.state.combat.bestStage, 40, 'the save itself is accepted');

    const { plausibilityFlags } = app;
    assert.deepEqual(plausibilityFlags(heroSave({ playtimeMs: 0 }), heroSave({ playtimeMs: 3600 * 1000 }), 3600 * 1000), []);
    assert.ok(plausibilityFlags(heroSave(), heroSave({ xp: 1e12 }), 3600 * 1000).length);
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
