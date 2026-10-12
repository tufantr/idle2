// Persistence tests with an in-memory localStorage.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
    constructor() { this.map = new Map(); }
    getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
    setItem(k, v) { this.map.set(k, String(v)); }
    removeItem(k) { this.map.delete(k); }
    clear() { this.map.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const { loadLocal, saveLocal, clearLocal, rotateBackup, writeBackup, listBackups, readBackup, restoreBackup, CloudClient, syncChoice, aheadOf, LOCAL_KEY, LEGACY_KEY, TOKEN_KEY } = await import('../src/core/save.js');
const { Game } = await import('../src/game.js');
const { createDefaultState } = await import('../src/core/state.js');

beforeEach(() => localStorage.clear());

test('regression: hard reset clears the real save key and the legacy key', () => {
    saveLocal(new Game(null, 1).serialize());
    localStorage.setItem(LEGACY_KEY, '{"resources":{"gold":5}}');
    clearLocal();
    assert.equal(localStorage.getItem(LOCAL_KEY), null);
    assert.equal(localStorage.getItem(LEGACY_KEY), null);
    assert.equal(loadLocal(), null);
});

test('regression: logging out never touches the local save', () => {
    const game = new Game(null, 1);
    game.state.gold = 12345;
    saveLocal(game.serialize());
    localStorage.setItem(TOKEN_KEY, 'x.eyJ1c2VybmFtZSI6ImEifQ.y');
    const cloud = new CloudClient('/api');
    cloud.logout();
    assert.equal(localStorage.getItem(TOKEN_KEY), null);
    assert.equal(loadLocal().gold, 12345);
});

test('loadLocal prefers the v2 save and falls back to migrating the prototype save', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ resources: { gold: 50, copper: 3 } }));
    assert.equal(loadLocal().resources.copper_ore, 3);
    const game = new Game(null, 1);
    game.state.gold = 9;
    saveLocal(game.serialize());
    assert.equal(loadLocal().gold, 9);
});

test('a corrupted save is kept under a backup key instead of being overwritten', () => {
    localStorage.setItem(LOCAL_KEY, '{not json');
    assert.equal(loadLocal(42), null);
    assert.equal(localStorage.getItem(`${LOCAL_KEY}.corrupt.42`), '{not json');
});

test("signed in, the server's save is the game: this device's is kept only when it is that one carried on", () => {
    const server = createDefaultState(1);
    server.stats.kills = 50; server.meta.playtimeMs = 3_600_000; server.combat.bestStage = 20;
    const here = structuredClone(server);   // the same game, played on
    here.stats.kills = 60; here.meta.playtimeMs = 3_700_000;
    assert.equal(syncChoice(here, null, 0, null), 'local', 'no server save yet: this game is the account\'s first');
    assert.equal(syncChoice(createDefaultState(1), server, 500, 500), 'cloud', 'nothing played here: the server\'s');
    assert.equal(syncChoice(here, server, 500, 500), 'local', 'the server unchanged since this device saw it: this game goes up');
    // regression (the owner's report, "Two saves found"): the page uploaded as it closed, a second after its
    // last local save, and the next load asked which to keep. Both hold the same play: no question, nothing lost.
    const closing = structuredClone(here);
    closing.meta.savedAt += 1000;
    assert.equal(syncChoice(here, closing, 900, 500), 'local');
    // another device played on: the server's save, whatever this one has, more play time included
    const elsewhere = structuredClone(server);
    elsewhere.stats.kills = 70; elsewhere.combat.bestStage = 25;
    assert.equal(syncChoice(here, elsewhere, 900, 500), 'cloud');
    here.meta.playtimeMs = 9_000_000;
    assert.equal(syncChoice(here, elsewhere, 900, 500), 'cloud');
    // a guest's game meeting an account's save (another game): the account's, even with nothing changed there
    const guest = createDefaultState(2);
    guest.stats.kills = 999;
    assert.equal(syncChoice(guest, server, 500, 500), 'cloud');
    assert.equal(syncChoice(guest, server, 500, null), 'cloud');
    // a device that never saw this account's save, holding all of it and more of the same game: kept
    assert.equal(syncChoice(here, server, 500, null), 'local');
    assert.equal(aheadOf(here, server), true);
    assert.equal(aheadOf(server, here), false);
});

test('backups rotate through three slots and can be restored', () => {
    for (let i = 1; i <= 5; i++) {
        const game = new Game(null, 1);
        game.state.gold = i;
        rotateBackup(game.serialize(), i * 1000);
    }
    const autos = listBackups().filter(b => b.slot.startsWith('auto'));
    assert.equal(autos.length, 3);
    assert.deepEqual(autos.map(b => JSON.parse(readBackup(b.slot).json).gold), [5, 4, 3], 'newest first, oldest overwritten');
    assert.equal(restoreBackup(autos[0].slot).gold, 5);
});

test('hard reset clears backups except the one written just before it', () => {
    const game = new Game(null, 1);
    rotateBackup(game.serialize(), 10);
    writeBackup(game.serialize(), 'reset', 'Before hard reset', 20);
    clearLocal();
    assert.deepEqual(listBackups().map(b => b.slot), ['reset']);
});

test("a gift from the owner adds gold to this run, uncounted as earned; nonsense amounts add nothing", () => {
    const game = new Game(null, 1);
    const earned = game.state.stats.goldEarned;
    const rewards = game.state.stats.clanRewards || 0;
    const text = game.applyReward({ id: 7, kind: 'gift', gold: 12000000, text: 'A gift from tufan' });
    assert.equal(game.state.gold, 12000000);
    assert.equal(text, 'A gift from tufan: +12,000,000 gold');
    assert.equal(game.state.stats.goldEarned, earned, 'a gift is not gold earned (the Capitalist medal)');
    assert.equal(game.state.stats.clanRewards || 0, rewards, 'nor a clan reward');
    const before = { gold: game.state.gold, essence: game.state.resources.essence };
    assert.equal(game.applyReward({ kind: 'gift', gold: Infinity, essence: -5, diamond: 'lots' }), 'A gift: nothing');
    assert.deepEqual({ gold: game.state.gold, essence: game.state.resources.essence }, before);
    assert.equal(game.applyReward({ kind: 'participation', essence: 3, text: 'Clan reward' }), 'Clan reward: +3 essence');
    assert.equal(game.state.stats.clanRewards, rewards + 1);
});

test('cloud uploads ask the page to outlive the request only when the body fits; the load answer carries the gifts waiting', async () => {
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        calls.push({ url, init });
        const body = url.endsWith('/load') ? { state: null, serverNow: 5, gifts: 2 } : { success: true, gifts: 0 };
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    try {
        const cloud = new CloudClient('/api');
        cloud.setToken('a.eyJ1c2VybmFtZSI6InR1ZmFuIn0.b');
        await cloud.push({ version: 3, note: 'small' }, { keepalive: true });
        assert.equal(calls.at(-1).init.keepalive, true);
        await cloud.push({ version: 3, note: 'x'.repeat(70000) }, { keepalive: true });
        assert.equal(calls.at(-1).init.keepalive, false, 'over the 64 KB a closing page may send: a plain request');
        await cloud.push({ version: 3 });
        assert.equal(calls.at(-1).init.keepalive, false);
        assert.equal((await cloud.pull(10)).gifts, 2);
        await cloud.claimGifts();
        assert.equal(calls.at(-1).url, '/api/gifts/claim');
        assert.equal(calls.at(-1).init.method, 'POST');
    } finally {
        globalThis.fetch = realFetch;
    }
});
