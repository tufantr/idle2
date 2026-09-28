// API tests against an in-memory stand-in for Vercel Postgres.
//   node --test test/
// The real `api/database.js` is replaced in the require cache before the app loads.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const users = [];
function fakeSql(strings, ...values) {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    if (text.startsWith('INSERT INTO users')) {
        const [username, hash] = values;
        if (users.some(u => u.username === username)) { const err = new Error('duplicate'); err.code = '23505'; return Promise.reject(err); }
        const row = { id: users.length + 1, username, password_hash: hash, game_state: null, last_saved: 0 };
        users.push(row);
        return Promise.resolve({ rows: [{ id: row.id }] });
    }
    if (text.startsWith('SELECT id, username, password_hash FROM users')) {
        return Promise.resolve({ rows: users.filter(u => u.username === values[0]) });
    }
    if (text.startsWith('UPDATE users SET game_state')) {
        const [state, savedAt, id] = values;
        const user = users.find(u => u.id === id);
        if (user) { user.game_state = state; user.last_saved = String(savedAt); }
        return Promise.resolve({ rows: [] });
    }
    if (text.startsWith('SELECT game_state, last_saved FROM users')) {
        return Promise.resolve({ rows: users.filter(u => u.id === values[0]) });
    }
    return Promise.reject(new Error(`unexpected query: ${text}`));
}

const dbPath = require.resolve(path.join(__dirname, '..', 'api', 'database.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { sql: fakeSql } };
process.env.JWT_SECRET = 'test-secret';
const app = require('../api/index.js');

let server;
let base;
before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const post = (p, body, token) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

test('register validates username and password', async () => {
    assert.equal((await post('/register', { username: 'ab', password: 'longenough' })).status, 400);
    assert.equal((await post('/register', { username: 'bad name!', password: 'longenough' })).status, 400);
    assert.equal((await post('/register', { username: 'hero', password: 'short' })).status, 400);
});

test('register, login, save and load round-trip', async () => {
    const reg = await post('/register', { username: 'hero_1', password: 'correct horse' });
    assert.equal(reg.status, 200);
    const { token } = await reg.json();
    assert.ok(token);

    assert.equal((await post('/register', { username: 'hero_1', password: 'correct horse' })).status, 400, 'duplicate username');
    assert.equal((await post('/login', { username: 'hero_1', password: 'wrong password' })).status, 400);
    const login = await post('/login', { username: 'hero_1', password: 'correct horse' });
    assert.equal(login.status, 200);

    assert.equal((await post('/save', { state: { gold: 1 } }, token)).status, 400, 'save without version rejected');
    assert.equal((await post('/save', { state: { version: 99 } }, token)).status, 400, 'future version rejected');
    const save = await post('/save', { state: { version: 2, gold: 1234 } }, token);
    assert.equal(save.status, 200);

    const load = await fetch(base + '/load', { headers: { Authorization: `Bearer ${token}` } });
    const data = await load.json();
    assert.equal(data.state.gold, 1234);
    assert.ok(data.lastSaved > 0);
});

test('protected routes reject missing and forged tokens', async () => {
    assert.equal((await fetch(base + '/load')).status, 401);
    const jwt = require('../api/node_modules/jsonwebtoken');
    const forged = jwt.sign({ id: 1, username: 'hero_1' }, 'super_secret_fantasy_key_123');
    assert.equal((await fetch(base + '/load', { headers: { Authorization: `Bearer ${forged}` } })).status, 403);
});
