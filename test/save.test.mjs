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

const { loadLocal, saveLocal, clearLocal, exportString, importString, CloudClient, chooseSave, LOCAL_KEY, LEGACY_KEY, TOKEN_KEY } = await import('../src/core/save.js');
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

test('export strings round-trip and reject garbage and future versions', () => {
    const game = new Game(null, 1);
    game.state.gold = 4242;
    const text = exportString(game.serialize());
    assert.ok(text.startsWith('FI2:'));
    assert.equal(importString(text).gold, 4242);
    assert.throws(() => importString('hello'));
    const future = { ...createDefaultState(1), version: 999 };
    assert.throws(() => importString(exportString(JSON.stringify(future))), /newer version/);
});

test('cloud conflict choice uses playtime first and flags disagreement', () => {
    const a = createDefaultState(1); a.meta.playtimeMs = 10; a.meta.savedAt = 100;
    const b = createDefaultState(1); b.meta.playtimeMs = 20; b.meta.savedAt = 200;
    assert.deepEqual(chooseSave(a, b), { pick: 'cloud', conflict: false });
    b.meta.savedAt = 50;
    assert.deepEqual(chooseSave(a, b), { pick: 'cloud', conflict: true });
    assert.deepEqual(chooseSave(null, b), { pick: 'cloud', conflict: false });
    assert.deepEqual(chooseSave(a, null), { pick: 'local', conflict: false });
});
