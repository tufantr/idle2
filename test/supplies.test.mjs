// Supplies (the owner, October 2026: "food and potion should be crucial", after a run with both reached the
// same best stage as one without): auto-eat also eats before a blow that would fell the hero, while the run
// climbs; the monsters grow tougher from the mid-game and the fight potions grew with them.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { RESOURCES, foodHeal } from '../src/data/resources.js';
import { BALANCE, enemyForStage, enemyBaseStats, enemyDamage, goldForKill, supplyMult } from '../src/core/formulas.js';
import { tryEat, bossCanFall } from '../src/systems/combat.js';
import { dungeonEnemy, titanEnemy } from '../src/systems/dungeon.js';
import { DUNGEONS } from '../src/data/dungeons.js';

const T0 = 1_760_000_000_000;
const MIN = 60_000;

/** A hero in the fight against a monster whose blow takes `share` of his health. */
function facing(share, { boss = false } = {}) {
    const g = new Game(null, T0);
    g.state.prestige.tokens = 300;
    g.state.combat.bestStage = 40;
    g.state.combat.maxStage = 40;
    g.recompute();
    g.state.resources.cooked_shark = 20;
    g.enterCombat();
    const d = g.derived;
    // the attack whose blow (enemyDamage) is `share` of max health
    let lo = 1, hi = 1e12;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (enemyDamage(mid, d.def) < share * d.maxHp) lo = mid; else hi = mid; }
    g.state.combat.enemy = { ...g.state.combat.enemy, atk: hi, hp: 1e9, maxHp: 1e9, boss, ...(boss ? { timeLimit: 30_000 } : {}) };
    if (boss) g.state.combat.bossTimeLeft = 30_000;
    g.state.combat.stallMs = 0;
    return g;
}

test('the hero eats before a blow that would fell him, though he stands above the line', () => {
    const g = facing(0.5);
    const c = g.state.combat;
    const d = g.derived;
    const blow = enemyDamage(c.enemy.atk, d.def);
    c.enemy.hp = 1000;   // a monster he can bring down
    c.hp = Math.floor(d.maxHp * 0.4);   // above the 25% line, below the coming blow
    assert.equal(tryEat(g), 0, 'below the line only: nothing to eat at 40%');
    assert.ok(tryEat(g, { blow: true }) >= 1, 'before the blow he eats');
    assert.ok(c.hp > blow, 'and stands above it');
    const events = g.drainEvents().filter(e => e.type === 'eat');
    assert.equal(events.length, 1);
    assert.equal(events[0].food, 'cooked_shark');
    assert.ok(events[0].heal > 0 && events[0].heal <= foodHeal(RESOURCES.cooked_shark, d) * events[0].count);
});

test('no food goes on a blow bigger than his whole health, nor once the run has stopped climbing', () => {
    const big = facing(1.2);
    big.state.combat.enemy.hp = 1000;
    big.state.combat.hp = Math.floor(big.derived.maxHp * 0.9);
    assert.equal(tryEat(big, { blow: true }), 0, 'a blow past his whole health fells him whatever he eats');
    assert.equal(big.state.resources.cooked_shark, 20);

    const held = facing(0.5);
    held.state.combat.enemy.hp = 1000;
    held.state.combat.hp = Math.floor(held.derived.maxHp * 0.4);
    held.state.combat.stallMs = BALANCE.combat.foodPushMs;
    assert.equal(tryEat(held, { blow: true }), 0, 'held at a wall, the food is kept for the next push');
    held.state.combat.hp = Math.floor(held.derived.maxHp * 0.2);
    assert.equal(tryEat(held, { blow: true }), 1, 'below the line he still eats, as ever');
});

test("no food goes on a boss that can't fall before its time runs out; the Titan's fight is always fought", () => {
    const g = facing(0.5, { boss: true });
    const c = g.state.combat;
    c.hp = Math.floor(g.derived.maxHp * 0.4);
    assert.equal(bossCanFall(g.state, g.derived), false, 'a billion health in thirty seconds');
    assert.equal(tryEat(g, { blow: true }), 0);
    c.enemy.hp = g.derived.atk * 3;   // three swings' worth: it can fall
    assert.equal(bossCanFall(g.state, g.derived), true);
    assert.ok(tryEat(g, { blow: true }) >= 1);
    // the Titan is scored by the damage dealt: he eats to stay in it
    c.hp = Math.floor(g.derived.maxHp * 0.4);
    c.enemy.hp = 1e12;
    c.mode = 'titan';
    assert.equal(bossCanFall(g.state, g.derived), true);
    assert.ok(tryEat(g, { blow: true }) >= 1);
});

test('in the fight he eats at once when a blow takes him under the line, not at his next swing', () => {
    rng.setSource(seededRandom(3));
    const g = facing(0.3);
    const c = g.state.combat;
    const d = g.derived;
    c.enemy.hp = 1e12;
    c.hp = Math.floor(d.maxHp * 0.45);   // the blow leaves him at 15%: under the line, alive
    c.playerTimer = 0;
    c.enemyTimer = c.enemy.interval - 50;   // its blow lands in 50 ms, his swing much later
    const food = g.state.resources.cooked_shark;
    g.tick(g.now + 100);
    assert.ok(g.state.resources.cooked_shark < food, 'eaten in the same moment');
    assert.ok(c.hp >= d.maxHp * d.autoEatThreshold);
});

test('from stage 60 the monsters grow tougher, to the full figure by stage 150; gold and loot keep the old figures', () => {
    const s = BALANCE.enemy.supply;
    assert.equal(supplyMult(1), 1);
    assert.equal(supplyMult(s.from), 1);
    assert.ok(Math.abs(supplyMult(s.to) - s.mult) < 1e-9);
    assert.ok(Math.abs(supplyMult(400) - s.mult) < 1e-9);
    for (let st = s.from; st < s.to; st += 7) assert.ok(supplyMult(st + 7) >= supplyMult(st));
    for (const stage of [99, 151, 251]) {   // (regular monsters: a boss has its own multiples on top)
        const e = enemyForStage(stage);
        const base = enemyBaseStats(stage);
        const mult = supplyMult(stage);
        assert.ok(Math.abs(e.maxHp / (base.hp * mult) - 1) < 1e-4, `stage ${stage}: health × ${mult.toFixed(2)}`);
        assert.equal(goldForKill(e), goldForKill({ maxHp: Math.floor(base.hp), boss: false }), `stage ${stage}: the gold of its old figure`);
    }
    // the dungeons and the Titan by the same measure
    const lair = DUNGEONS.find(d => d.stage >= 150) || DUNGEONS[DUNGEONS.length - 1];
    const boss = dungeonEnemy({ id: lair.id, index: lair.monsters.length });
    assert.ok(boss.maxHp > boss.worth, 'a deep dungeon boss is tougher, and pays for what it was');
    const g = new Game(null, T0);
    g.state.titan.kills = 30;
    const titan = titanEnemy(g.state);
    assert.ok(Math.abs(titan.maxHp / titan.worth - supplyMult(titan.stage)) < 1e-3);
});
