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

test('above legendary: from stage 500 a frontier boss\'s piece is Mythic one time in fifty, and from 1,000 a Mythic Primal one in twenty', async () => {
    const { generateDrop } = await import('../src/core/formulas.js');
    const { rng, seededRandom } = await import('../src/core/rng.js');
    const { MYTHIC, PRIMAL } = await import('../src/data/items.js');
    rng.setSource(seededRandom(77));
    const count = (frontier, n = 40000) => {
        const tally = {};
        for (let i = 0; i < n; i++) { const r = generateDrop(7, true, i + 1, 60, undefined, { frontier }).rarity; tally[r] = (tally[r] || 0) + 1; }
        return tally;
    };
    const shallow = count({ stage: 450, best: 460 });
    assert.ok(!shallow.mythic && !shallow.primal, 'nothing above legendary before stage 500');
    const far = count({ stage: 700, best: 900 });
    assert.ok(!far.mythic, 'nor from a boss far behind the best stage');
    const near = count({ stage: 880, best: 900 });
    assert.ok(Math.abs(near.mythic / 40000 - MYTHIC.chance) < 0.004, `a Mythic is ${(near.mythic / 400).toFixed(2)}% of the pieces`);
    assert.ok(!near.primal, 'and no Primal before stage 1,000');
    assert.equal(count({ stage: 880, best: 900 }, 2000) && generateDrop(7, false, 1, 60, undefined, { frontier: { stage: 880, best: 900 } }).rarity === 'mythic', false, 'never from an ordinary monster');
    const deep = count({ stage: 1200, best: 1210 }, 100000);
    assert.ok(deep.primal > 0 && deep.primal < deep.mythic / 8, `${deep.primal} Primal to ${deep.mythic} Mythic`);
    // a Primal is rolled as high as it goes: the top of the ±5%, every bonus at its most
    let primal = null;
    for (let i = 0; !primal && i < 2e6; i++) { const it = generateDrop(7, true, i + 1, 60, [{ type: 'Weapon', weight: 1 }], { frontier: { stage: 1500, best: 1500 } }); if (it.rarity === 'primal') primal = it; }
    assert.equal(primal.affixes.length, 6);
    rng.setSource(seededRandom(2026));
    assert.ok(MYTHIC.from === 500 && PRIMAL.from === 1000);
});

test('once a run, the first ladder boss at nine tenths of the best stage leaves a piece from the best stage\'s depth', async () => {
    const { spawnEnemy } = await import('../src/systems/combat.js');
    const { rng, seededRandom } = await import('../src/core/rng.js');
    const { zoneForStage } = await import('../src/data/zones.js');
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = 1e10;
    game.enterCombat();
    s.stats.bossKills = s.stats.bossFalls = 5;
    s.settings.autoSalvage = 'off';
    const beat = stage => {   // a boss's first fall in the run, through the game's own fight (rolls high: no ordinary gear)
        const c = s.combat;
        Object.assign(c, { stage, maxStage: stage, mode: 'stages', farmMode: false, regroupLeft: 0 });
        rng.setSource(() => 0.9999);
        spawnEnemy(game);
        c.enemy.hp = 1;
        c.enemy.atk = 0;   // (a bare hero this deep would fall to its first blow)
        game.recompute();
        c.hp = game.derived.maxHp;
        c.playerTimer = game.derived.attackInterval;
        let now = game.now;
        const kills = s.stats.bossKills;
        for (let guard = 0; s.stats.bossKills === kills && guard < 600; guard++) { now += 100; game.tick(now); }
        assert.equal(s.stats.bossKills, kills + 1, `the boss of stage ${stage} fell`);
        rng.setSource(seededRandom(1));
        return game.drainEvents().filter(e => e.type === 'itemDropped' && e.frontier);
    };
    s.combat.bestStage = 800;
    assert.equal(beat(700).length, 0, 'not yet near the best');
    const [found] = beat(720);
    assert.ok(found, 'at nine tenths of the best stage');
    assert.equal(found.item.depth, zoneForStage(800).depth, 'from the best stage\'s depth');
    assert.equal(s.combat.frontierDrop, true);
    assert.equal(beat(730).length, 0, 'once a run');
    s.prestige.runStartedAt = T0 - 3600e3;
    s.combat.maxStage = 730;
    assert.ok(game.prestige());
    assert.equal(s.combat.frontierDrop, false, 'and again the next run');
    game.enterCombat();
    assert.equal(beat(750).length, 1);
});

test('a piece says about how many stages it is worth where the hero climbs', async () => {
    const { gainStages } = await import('../src/systems/inventory.js');
    const { stagesWords } = await import('../src/ui/format.js');
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 900;   // the dense deep: health ×1.035 a stage
    const doubled = gainStages(s, { atk: 1, def: 0, hp: 0 });
    assert.ok(Math.abs(doubled - Math.log(2) / Math.log(BALANCE.enemy.denseHpGrowth)) < 0.01, `twice the attack: ${doubled.toFixed(1)} stages`);
    assert.ok(gainStages(s, { atk: 0, def: 0.5, hp: 0.5 }) > 10, 'armour counts at the blow he must live through');
    assert.equal(gainStages(s, { atk: Infinity, def: 0, hp: 0 }), null, 'nothing to say for a slot that was empty');
    assert.equal(stagesWords(20.2), '+20 stages');
    assert.equal(stagesWords(-1.2), '−1 stage');
    assert.equal(stagesWords(0.4), '');
});
