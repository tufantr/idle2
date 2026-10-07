// Records make tokens stronger, and an earned switch prestiges a stalled run by itself (DESIGN §3.9):
// every 25 stages of all-time best and every dungeon unique held multiply the token effect by 1.05;
// after 20 prestiges the dock's Auto prestiges a run that has gone ten minutes without a new best.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { BASE, recordsOf, deriveStats } from '../src/core/modifiers.js';
import { BALANCE } from '../src/core/formulas.js';
import { UNIQUES } from '../src/data/dungeons.js';
import { autoPrestigeIn } from '../src/systems/prestige.js';

rng.setSource(seededRandom(11));
const T0 = 1_700_000_000_000;
const MIN = 60_000;

test('each 25 stages of the best ever, and each unique held, multiply what tokens give', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.prestige.tokens = 1000;
    s.equipped.Weapon = { id: 800, type: 'Weapon', tier: 7, atk: 5000, def: 0, affixes: [], upgrade: 0 };
    s.combat.bestStage = 24;
    assert.deepEqual(recordsOf(s), { stages: 0, uniques: 0, trials: 0, count: 0, mult: 1 });
    const plain = deriveStats(s);
    s.combat.bestStage = 100;
    const four = deriveStats(s);
    assert.equal(four.records.count, 4);
    assert.ok(Math.abs(four.records.mult - BASE.recordMult ** 4) < 1e-12);
    // the token layer itself grows: 1 + 0.005 × 1000 × 1.05^4
    const layer = r => 1 + BASE.tokenAtk * 1000 * r;
    assert.ok(Math.abs(four.atk / plain.atk - layer(BASE.recordMult ** 4) / layer(1)) < 0.001);
    assert.equal(four.tokenPowerPct, Math.round(BASE.tokenAtk * 1000 * BASE.recordMult ** 4 * 100));
    // a unique held is a record; two copies of one count once
    const id = Object.keys(UNIQUES)[0];
    s.inventory.push({ id: 900, type: UNIQUES[id].type, tier: UNIQUES[id].tier, uniqueId: id, atk: 0, def: 0, affixes: [] });
    s.inventory.push({ id: 901, type: UNIQUES[id].type, tier: UNIQUES[id].tier, uniqueId: id, atk: 0, def: 0, affixes: [] });
    assert.equal(recordsOf(s).count, 5);
});

test('a new record is announced as the stage is reached', () => {
    const game = new Game(null, T0);
    const c = game.state.combat;
    Object.assign(c, { stage: 49, maxStage: 49, bestStage: 49 });
    c.enemy = null;
    game.enterCombat();
    c.enemy.hp = 1;
    let now = T0;
    while (c.bestStage < 50) { now += 100; game.tick(now); }
    const record = game.drainEvents().find(e => e.type === 'record');
    assert.equal(record?.stage, 50);
    assert.equal(record.records.count, 2);
});

/** A veteran fighting at the wall of a run that has lasted `runMin` minutes, its last new best `stallMin` ago. */
function veteran({ count = BALANCE.prestige.autoAfter, runMin = 30, stallMin = 11, auto = true } = {}) {
    const game = new Game(null, T0);
    const s = game.state;
    s.prestige.count = count;
    s.settings.autoPrestige = auto;
    s.prestige.runStartedAt = T0 - runMin * MIN;
    Object.assign(s.combat, { stage: 40, maxStage: 40, bestStage: 60, stallMs: stallMin * MIN });
    s.combat.enemy = null;
    game.enterCombat();
    return game;
}

test('the Auto switch is earned with the fifth prestige, or two days after the first', () => {
    const early = veteran({ count: BALANCE.prestige.autoAfter - 1, auto: false });
    assert.equal(early.setAutoPrestige(true), false);
    assert.equal(early.state.settings.autoPrestige, false);
    const earned = veteran({ auto: false });
    assert.equal(earned.setAutoPrestige(true), true);
    assert.equal(earned.state.settings.autoPrestige, true);
    // two days after a first prestige, whatever the count
    const slow = veteran({ count: 1, auto: false });
    slow.state.prestige.firstAt = T0 - 47 * 3600_000;
    assert.equal(slow.setAutoPrestige(true), false, 'not yet at 47 hours');
    slow.state.prestige.firstAt = T0 - 49 * 3600_000;
    assert.equal(slow.setAutoPrestige(true), true, 'earned at 48');
    // a first prestige notes when it was
    const fresh = new Game(null, T0);
    Object.assign(fresh.state.combat, { maxStage: 30, bestStage: 30 });
    fresh.state.prestige.runStartedAt = T0 - 3600_000;
    assert.ok(fresh.prestige());
    assert.equal(fresh.state.prestige.firstAt, T0);
    // saved, and a save from before has it off
    assert.equal(migrateState(JSON.parse(earned.serialize(T0)), T0).settings.autoPrestige, true);
    const raw = JSON.parse(earned.serialize(T0));
    delete raw.settings.autoPrestige;
    assert.equal(migrateState(raw, T0).settings.autoPrestige, false);
});

test('Auto prestiges a run that has stalled, and the hero fights on in the next', () => {
    const game = veteran();
    const tokens = game.state.prestige.tokens;
    game.tick(T0 + 100);
    const s = game.state;
    assert.equal(s.prestige.count, BALANCE.prestige.autoAfter + 1);
    assert.ok(s.prestige.tokens > tokens);
    assert.ok(s.combat.active, 'straight into the next run\'s first fight');
    assert.ok(s.combat.stage < 40);
    assert.ok(game.drainEvents().some(e => e.type === 'prestige' && e.auto));
    // the new run waits for its prestige stage, its ten minutes and a stall of its own
    assert.notEqual(autoPrestigeIn(s, game.now), 0);
    s.combat.maxStage = 30;
    assert.ok(autoPrestigeIn(s, game.now) >= BALANCE.prestige.autoStallMs - 1000);
});

test('Auto waits while the run still climbs, and never while staying on a stage, off, or unearned', () => {
    const climbing = veteran({ stallMin: 4 });
    climbing.tick(T0 + 100);
    assert.equal(climbing.state.prestige.count, BALANCE.prestige.autoAfter);
    assert.ok(Math.abs(climbing.autoPrestigeIn() - 6 * MIN) < 1000, 'six minutes to go');
    const young = veteran({ runMin: 5 });
    young.tick(T0 + 100);
    assert.equal(young.state.prestige.count, BALANCE.prestige.autoAfter, 'a run lasts its ten minutes first');
    const staying = veteran();
    staying.setFarmMode(true);
    staying.tick(T0 + 100);
    assert.equal(staying.state.prestige.count, BALANCE.prestige.autoAfter);
    const off = veteran({ auto: false });
    off.tick(T0 + 100);
    assert.equal(off.state.prestige.count, BALANCE.prestige.autoAfter);
    const unearned = veteran({ count: 3 });
    unearned.tick(T0 + 100);
    assert.equal(unearned.state.prestige.count, 3);
});

test('Auto counts only time spent climbing: work between fights does not stall a run', () => {
    const game = veteran({ stallMin: 2 });
    const s = game.state;
    game.startNodeAction('mining', 'copper_ore');
    let now = T0;
    for (let i = 0; i < 15 * 60; i++) { now += 1000; game.tick(now); }   // a quarter of an hour in the mine
    assert.ok(Math.abs(s.combat.stallMs - 2 * MIN) < 1000, `${s.combat.stallMs} ms of stall`);
    game.enterCombat();
    now += 100;
    game.tick(now);
    assert.equal(s.prestige.count, BALANCE.prestige.autoAfter, 'back from the mine, the run goes on');
    assert.ok(Math.abs(game.autoPrestigeIn() - 8 * MIN) < 2000);
});

test('away from the game, Auto goes on prestiging stalled runs, and the summary says so', () => {
    const game = veteran({ stallMin: 0 });
    game.drainEvents();
    game.tick(T0 + 3 * 60 * MIN);   // three hours away: replayed as offline progress
    const summary = game.drainEvents().find(e => e.type === 'offline')?.summary;
    assert.ok(summary, 'an offline summary');
    assert.ok(summary.prestiges >= 1, `${summary.prestiges} prestiges while away`);
    assert.equal(game.state.prestige.count, BALANCE.prestige.autoAfter + summary.prestiges);
    assert.ok(summary.tokens > 0);
});
