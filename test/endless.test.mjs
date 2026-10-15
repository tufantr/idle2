// The endless climb (the owner, October 2026: thousands of stages, each new upgrade a push;
// docs/research_notes/endless-late-game.md): the deep Abyss's stages ease toward a denser growth, the drops
// ease with them, every prestige adds to a Legacy, and the camp's levels go on past 25 at a price in plain gold.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { BASE, legacyMult } from '../src/core/modifiers.js';
import { BALANCE, enemyBaseStats, abyssDropMult, easedGrowthLog } from '../src/core/formulas.js';
import { AUTHORED_STAGES, STAGES_PER_ZONE } from '../src/data/zones.js';
import { CAMP_UPGRADES, CAMP_GOLD, campCost } from '../src/data/camp.js';
import { campPrice, nextCampCost } from '../src/systems/camp.js';
import { goldPerKillAtStage } from '../src/core/formulas.js';
import { fmt } from '../src/ui/format.js';
import { migrateState as loadState } from '../src/core/state.js';

const T0 = 1_700_000_000_000;
const e = BALANCE.enemy;
const growth = (stage, key = 'hp') => enemyBaseStats(stage + 1)[key] / enemyBaseStats(stage)[key];

test('the eased growth is the sum of its steps, and stays at its end', () => {
    for (const [n, over] of [[1, 300], [7, 300], [300, 300], [301, 300], [1000, 300], [5, 1], [12, 0]]) {
        let sum = 0;
        for (let k = 1; k <= n; k++) sum += over > 0 ? Math.log(1.065) + (Math.log(1.035) - Math.log(1.065)) * Math.min(1, k / over) : Math.log(1.035);
        assert.ok(Math.abs(easedGrowthLog(n, 1.065, 1.035, over) - sum) < 1e-9, `n ${n}, over ${over}`);
    }
    assert.equal(easedGrowthLog(0, 1.065, 1.035, 300), 0);
    assert.equal(easedGrowthLog(-3, 1.065, 1.035, 300), 0);
});

test('nothing changes up to stage 400; past it a stage grows less and less, to the dense growth by denseFrom', () => {
    assert.ok(e.deepFrom >= 400, 'the climb a player has today is untouched');
    assert.ok(Math.abs(growth(e.deepFrom - 1) - e.abyssHpGrowth) < 1e-9);
    let last = growth(e.deepFrom);
    assert.ok(last <= e.deepHpGrowth + 1e-9 && last > e.denseHpGrowth);
    for (let s = e.deepFrom + 1; s < e.denseFrom; s += 7) {
        const g = growth(s);
        assert.ok(g <= last + 1e-12, `stage ${s} grows no more than the stage before it`);
        last = g;
    }
    for (const s of [e.denseFrom, e.denseFrom + 1, 2000, 9000]) {
        assert.ok(Math.abs(growth(s) - e.denseHpGrowth) < 1e-9, `stage ${s}: health ×${e.denseHpGrowth}`);
        assert.ok(Math.abs(growth(s, 'atk') - e.denseAtkGrowth) < 1e-9, `stage ${s}: attack ×${e.denseAtkGrowth}`);
    }
    // health stays a number to the last stage
    assert.ok(Number.isFinite(enemyBaseStats(10000).hp) && enemyBaseStats(10000).hp < 1e200);
});

test('the drops ease with the monsters, depth by depth, and stay below them', () => {
    const deepDepth = (e.deepFrom - AUTHORED_STAGES) / STAGES_PER_ZONE;
    const denseDepth = (e.denseFrom - AUTHORED_STAGES) / STAGES_PER_ZONE;
    const step = d => abyssDropMult(d + 1) / abyssDropMult(d);
    for (let d = BALANCE.abyss.dropScalingFrom; d < deepDepth; d++) assert.ok(Math.abs(step(d) - BALANCE.abyss.dropGrowth) < 1e-9, `depth ${d}: as before`);
    for (let d = deepDepth; d < denseDepth - 1; d++) assert.ok(step(d) < BALANCE.abyss.dropGrowth && step(d) > BALANCE.abyss.denseDropGrowth, `depth ${d}: easing`);
    for (const d of [denseDepth - 1, denseDepth, denseDepth + 1, 500]) assert.ok(Math.abs(step(d) - BALANCE.abyss.denseDropGrowth) < 1e-9, `depth ${d}`);
    // a depth of drops never keeps up with a depth of monsters: everything that grows with the stage
    // (the drops, a record each 25 stages, the camp's gold levels) stays behind, or the climb runs away
    for (const d of [deepDepth, deepDepth + 10, denseDepth, 300]) {
        const first = AUTHORED_STAGES + d * STAGES_PER_ZONE;
        const monsters = Math.log(enemyBaseStats(first + STAGES_PER_ZONE).hp / enemyBaseStats(first).hp);
        const campLevels = monsters / Math.log(CAMP_GOLD.growth);   // the more gold a kill pays, the more gold-priced levels a run buys
        const stageBound = Math.log(step(d)) + STAGES_PER_ZONE * Math.log(BASE.recordMult) / BASE.recordStages + campLevels * Math.log(1.05);
        assert.ok(monsters - stageBound > 0.05, `depth ${d}: the monsters grow ${monsters.toFixed(3)} a depth, the rest ${stageBound.toFixed(3)}`);
    }
});

test('every prestige ever made adds to the Legacy, for good, and an Ascension keeps it', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.equipped.Weapon = null;
    game.recompute();
    const before = { ...game.derived };
    assert.equal(legacyMult(s), 1);
    s.prestige.count = 100;
    game.recompute();
    const mult = (1 + BASE.legacyPerPrestige) ** 100;
    assert.ok(Math.abs(legacyMult(s) - mult) < 1e-12);
    assert.ok(Math.abs(game.derived.legacy - mult) < 1e-12);
    assert.ok(game.derived.maxHp >= Math.floor(before.maxHp * mult) - 1 && game.derived.maxHp <= Math.ceil(before.maxHp * mult) + 1, 'health × the Legacy');
    // an old save keeps its prestiges, so it comes with its Legacy
    const loaded = loadState(JSON.parse(JSON.stringify({ ...s, prestige: { ...s.prestige, count: 250 } })), T0);
    assert.equal(legacyMult(loaded), (1 + BASE.legacyPerPrestige) ** 250);
});

test('the camp goes on past level 25, at a price in plain gold that a deeper hero affords more of', () => {
    const [whetstone, , hearth] = CAMP_UPGRADES;
    for (const u of CAMP_UPGRADES) assert.equal(u.max, Infinity);
    // levels below CAMP_GOLD.from as before; from it, plain gold at any depth
    assert.equal(campCost(whetstone, CAMP_GOLD.from), Math.ceil(CAMP_GOLD.base));
    assert.equal(campCost(whetstone, CAMP_GOLD.from + 3, goldPerKillAtStage(900)), Math.ceil(CAMP_GOLD.base * CAMP_GOLD.growth ** 3));
    assert.equal(campCost(hearth, CAMP_GOLD.from + 3), campCost(whetstone, CAMP_GOLD.from + 3));
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 600;
    s.camp.whetstone = CAMP_GOLD.from;
    assert.equal(nextCampCost(s, 'whetstone'), campPrice(s, whetstone, CAMP_GOLD.from));
    // a run's gold at stage 600 buys dozens of levels past 25 with Max
    s.gold = 100 * goldPerKillAtStage(600);
    const bought = game.buyCampUpgrade('whetstone', 'max');
    assert.ok(bought > 30, `${bought} levels`);
    assert.equal(s.camp.whetstone, CAMP_GOLD.from + bought);
    // and a save keeps them
    const loaded = loadState(JSON.parse(JSON.stringify(s)), T0);
    assert.equal(loaded.camp.whetstone, CAMP_GOLD.from + bought);
});

test('numbers past a nonillion keep their names, to the end of what a number holds', () => {
    assert.equal(fmt(1e30), '1.00No');
    assert.equal(fmt(4.12e33), '4.12Dc');
    assert.equal(fmt(1e36), '1.00UDc');
    assert.equal(fmt(2.5e64), '25.0Vg');
    assert.equal(fmt(1e303), '1.00Ce');
    assert.ok(!/e\+/.test(fmt(1.7e308)));
    assert.ok(!/e\+|NaN|undefined/.test(fmt(enemyBaseStats(10000).hp)));
});
