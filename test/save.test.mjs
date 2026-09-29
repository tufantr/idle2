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

const { loadLocal, saveLocal, clearLocal, exportString, importString, exportStringCompressed, importStringAsync, rotateBackup, writeBackup, listBackups, restoreBackup, CloudClient, chooseSave, LOCAL_KEY, LEGACY_KEY, TOKEN_KEY } = await import('../src/core/save.js');
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

test('compressed export strings round-trip and are smaller', async () => {
    const game = new Game(null, 1);
    game.state.gold = 999;
    const json = game.serialize();
    const text = await exportStringCompressed(json);
    assert.ok(text.startsWith('FI3:'));
    assert.ok(text.length < exportString(json).length / 2, `${text.length} vs ${exportString(json).length}`);
    assert.equal((await importStringAsync(text)).gold, 999);
    assert.equal((await importStringAsync(exportString(json))).gold, 999, 'old FI2 strings still import');
});

test('backups rotate through three slots and can be restored', () => {
    for (let i = 1; i <= 5; i++) {
        const game = new Game(null, 1);
        game.state.gold = i;
        rotateBackup(game.serialize(), i * 1000);
    }
    const autos = listBackups().filter(b => b.slot.startsWith('auto'));
    assert.equal(autos.length, 3);
    assert.deepEqual(autos.map(b => JSON.parse(b.json).gold), [5, 4, 3], 'newest first, oldest overwritten');
    assert.equal(restoreBackup(autos[0].slot).gold, 5);
});

test('hard reset clears backups except the one written just before it', () => {
    const game = new Game(null, 1);
    rotateBackup(game.serialize(), 10);
    writeBackup(game.serialize(), 'reset', 'Before hard reset', 20);
    clearLocal();
    assert.deepEqual(listBackups().map(b => b.slot), ['reset']);
});
