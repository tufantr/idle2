// Phase 4 skills (fishing, firemaking, farming, agility), the resource-consumer scan, and a check
// that every bonus source in the data actually reaches the modifier pipeline.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { collectModifiers, deriveStats, BASE, bonfireBonus } from '../src/core/modifiers.js';
import { SKILLS, NON_COMBAT_SKILLS } from '../src/data/skills.js';
import { RESOURCES, foodsByHealing } from '../src/data/resources.js';
import { SMELTING_RECIPES, METALS, JEWEL_BARS, GEM_TIERS, TOOLS } from '../src/data/workshop.js';
import { PERKS, GOLD_SHOP } from '../src/data/perks.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { PETS } from '../src/data/pets.js';
import { DUNGEON_MILESTONES, TITAN_BONUS, UNIQUES } from '../src/data/dungeons.js';
import { AFFIXES } from '../src/data/items.js';
import { AGILITY_SLOTS, obstacleById } from '../src/data/agility.js';
import { CROPS, FARMING_PLOTS, cropById } from '../src/data/farming.js';
import { seedCost } from '../src/systems/farming.js';
import { obstacleCost } from '../src/systems/agility.js';

rng.setSource(seededRandom(404));
const T0 = 1_700_000_000_000;

function newGame(levels = {}) {
    const game = new Game(null, T0);
    for (const [skill, level] of Object.entries(levels)) game.state.skills[skill].xp = xpForLevel(level);
    game.recompute();
    return game;
}
function run(game, ms, step = 100) {
    const end = game.now + ms;
    let now = game.now;
    while (now < end) { now += step; game.tick(now); }
}
const differs = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

// ---------- honesty ----------

test('every bonus in the data is well-formed, so it reaches the modifier pipeline', () => {
    const known = collectModifiers(new Game(null, T0).state);
    const speedSkills = Object.keys(known.skillSpeed);
    const check = (where, mods) => {
        assert.ok(mods && Object.keys(mods).length, `${where}: no bonus`);
        for (const [key, value] of Object.entries(mods)) {
            assert.ok(key in known && key !== 'focused', `${where}: unknown modifier ${key}`);
            if (key === 'skillSpeed' || key === 'doubleChance') {
                assert.equal(typeof value, 'object', `${where}: ${key} must name its skills`);
                for (const [skill, v] of Object.entries(value)) {
                    assert.ok(speedSkills.includes(skill), `${where}: unknown skill ${skill}`);
                    assert.ok(v > 0, `${where}: ${skill}`);
                }
            } else {
                assert.ok(typeof value === 'number' && value !== 0, `${where}: ${key}`);
            }
        }
    };
    for (const perk of PERKS) check(`perk ${perk.id}`, perk.mods);
    for (const ach of ACHIEVEMENTS) check(`achievement ${ach.id}`, ach.mods);
    for (const pet of PETS) check(`pet ${pet.id}`, pet.mods);
    for (const slot of AGILITY_SLOTS) for (const o of slot.obstacles) check(`obstacle ${o.id}`, o.mods);
    for (const m of DUNGEON_MILESTONES) check(`milestone ${m.clears}`, m.mods);
    check('titan', TITAN_BONUS);
    for (const u of Object.values(UNIQUES)) for (const a of u.affixes) check(`unique ${u.id}`, { [a.stat]: a.value });
    for (const a of AFFIXES) check(`affix ${a.id}`, { [a.stat]: a.min });

    // And a built obstacle / found pet / bought perk really moves the numbers.
    const base = collectModifiers(new Game(null, T0).state);
    for (const perk of PERKS) {
        const g = new Game(null, T0);
        g.state.perks[perk.id] = 1;
        assert.ok(differs(collectModifiers(g.state), base), `perk ${perk.id} does nothing`);
    }
    for (const [i, slot] of AGILITY_SLOTS.entries()) for (const o of slot.obstacles) {
        const g = new Game(null, T0);
        g.state.agility.built[i] = o.id;
        assert.ok(differs(collectModifiers(g.state), base), `obstacle ${o.id} does nothing`);
    }
});

test('the Forager perk speeds up every gathering and production skill (it used to do nothing)', () => {
    const g = new Game(null, T0);
    const before = collectModifiers(g.state).skillSpeed;
    g.state.perks.forager = 5;
    const after = collectModifiers(g.state).skillSpeed;
    for (const id of NON_COMBAT_SKILLS) assert.ok(Math.abs(after[id] - before[id] - 0.15) < 1e-9, id);
});

// ---------- the data interlocks ----------

test('every resource has at least one consumer', () => {
    const consumed = new Set();
    const eat = obj => Object.keys(obj || {}).forEach(id => consumed.add(id));
    for (const skill of Object.values(SKILLS)) for (const node of skill.nodes) eat(node.consumes);
    for (const r of SMELTING_RECIPES) eat(r.consumes);
    for (const m of METALS) consumed.add(m.bar);                 // forging
    for (const b of JEWEL_BARS) consumed.add(b.bar);             // jewellery
    for (const g of GEM_TIERS) consumed.add(g.gem);              // jewellery
    for (const tool of Object.values(TOOLS)) for (const t of tool.tiers) eat(t.consumes);
    for (const slot of AGILITY_SLOTS) eat(slot.materials);
    consumed.add('essence');                                     // upgrades and reforges
    consumed.add('fishing_bait');                                // used by each catch
    for (const [id, res] of Object.entries(RESOURCES)) {
        if (res.category === 'food' || res.category === 'potion') consumed.add(id); // eaten / drunk in combat
    }
    const unused = Object.keys(RESOURCES).filter(id => !consumed.has(id));
    assert.deepEqual(unused, []);
    // ...and every shop supply and crop output is a real resource.
    for (const item of GOLD_SHOP) for (const id of Object.keys(item.gives)) assert.ok(RESOURCES[id], id);
    for (const crop of CROPS) assert.ok(RESOURCES[crop.produces], crop.id);
});

test('auto-eat considers every food by healing, whichever line it comes from', () => {
    const foods = foodsByHealing();
    for (let i = 1; i < foods.length; i++) assert.ok(foods[i].heals >= foods[i - 1].heals);
    assert.ok(foods.some(f => f.id === 'cooked_shark') && foods.some(f => f.id === 'pumpkin_pie'));
});

// ---------- fishing ----------

test('fishing: bait is used one per catch and often doubles it', () => {
    const plain = newGame({ fishing: 1 });
    plain.startNodeAction('fishing', 'raw_shrimp');
    run(plain, 10 * 60000);
    const withBait = newGame({ fishing: 1 });
    withBait.state.resources.fishing_bait = 1000;
    withBait.startNodeAction('fishing', 'raw_shrimp');
    run(withBait, 10 * 60000);
    const catches = withBait.state.stats.actionsBySkill.fishing;
    assert.equal(withBait.state.stats.baitUsed, catches);
    assert.equal(withBait.state.resources.fishing_bait, 1000 - catches);
    assert.ok(withBait.state.resources.raw_shrimp > plain.state.resources.raw_shrimp * 1.3, 'bait adds ~50% more fish');
    assert.equal(withBait.state.stats.fishCaught, withBait.state.resources.raw_shrimp);
});

test('fish and crops cook into food', () => {
    const game = newGame({ cooking: 70 });
    Object.assign(game.state.resources, { raw_trout: 5, starfruit: 4, normal_log: 20 });
    game.startNodeAction('cooking', 'cooked_trout');
    run(game, 20000);
    assert.equal(game.state.resources.cooked_trout, 5);
    game.startNodeAction('cooking', 'starfruit_tart');
    run(game, 20000);
    assert.equal(game.state.resources.starfruit_tart, 2);
    assert.equal(game.state.resources.starfruit, 0);
});

// ---------- firemaking ----------

test('firemaking: logs feed the bonfire by tier, capped, and it boosts XP until it burns out', () => {
    const game = newGame({ firemaking: 30 });
    game.state.resources.willow_log = 10;
    game.startNodeAction('firemaking', 'burn_willow_log');
    run(game, 3000);
    const burnt = game.state.stats.logsBurnt;
    assert.ok(burnt >= 1);
    const left = game.state.bonfire.until - game.now;
    assert.ok(left > 0 && left <= burnt * 2 * BASE.bonfireSecondsPerLogTier * 3 * 1000, `bonfire ${left} ms`);
    assert.equal(game.derived.bonfire, true);
    assert.ok(Math.abs(game.derived.xpMult - 1 - bonfireBonus(30)) < 0.02 + 1e-9);

    game.state.resources.willow_log = 100000;
    run(game, 60 * 60000, 1000);
    assert.ok(game.state.bonfire.until - game.now <= BASE.bonfireMaxMs, 'capped at an hour');
    game.stopAction();
    run(game, BASE.bonfireMaxMs + 1000, 5000);
    assert.equal(game.derived.bonfire, false, 'burns out');
    assert.equal(game.derived.xpMult, 1);
});

// ---------- farming ----------

test('farming: plant with gold, grows on the clock, harvest for crops and XP, replant', () => {
    const game = newGame({ farming: 1 });
    const potato = cropById('potato');
    assert.equal(game.plant(0, 'potato'), false, 'seeds cost gold');
    game.state.gold = 10000;
    const cost = seedCost(game.state, potato);
    assert.equal(game.plant(0, 'potato'), true);
    assert.equal(game.state.gold, 10000 - cost);
    assert.equal(game.state.stats.goldSpent, cost);
    assert.equal(game.plant(2, 'potato'), false, 'plot 3 opens at level 15');
    assert.equal(game.plant(0, 'guam'), false, 'occupied');
    assert.equal(game.harvest(0), 0, 'not ready yet');
    run(game, potato.growMs + 1000, 5000);
    const xp = game.state.skills.farming.xp;
    const got = game.harvest(0);
    assert.ok(got >= potato.yield[0] && got <= potato.yield[1] * 2);
    assert.equal(game.state.resources.potato, got);
    assert.ok(game.state.skills.farming.xp > xp);
    assert.equal(game.state.farming.plots[0].crop, null);

    game.plant(0, 'potato');
    game.plant(1, 'potato');
    run(game, potato.growMs + 1000, 5000);
    const r = game.harvestAll({ replant: true });
    assert.deepEqual(r, { harvested: 2, replanted: 2 });
    assert.ok(game.state.farming.plots.slice(0, 2).every(p => p.crop === 'potato'));
});

test('farming: plant every open plot at once, while the gold lasts', () => {
    const game = newGame({ farming: 15 });               // three plots open
    const potato = cropById('potato');
    const cost = seedCost(game.state, potato);
    game.state.gold = cost * 2;
    assert.equal(game.plantAll('potato'), 2, 'gold for two plots');
    assert.deepEqual(game.state.farming.plots.slice(0, 4).map(p => p.crop), ['potato', 'potato', null, null], 'the fourth plot is not open');
    assert.ok(game.drainEvents().some(e => e.type === 'error' && /Not enough gold for 1 more plot/.test(e.text)));
    game.state.gold = cost;
    assert.equal(game.plantAll('potato'), 1);
    assert.equal(game.plantAll('potato'), 0, 'nothing left to plant');
    assert.equal(game.state.gold, 0);
    assert.equal(game.plantAll('starfruit'), 0, 'a crop above the farming level plants nowhere');
});

test('farming: plots keep growing while the game is closed, and the hoe speeds them up', () => {
    const game = newGame({ farming: 20 });
    game.state.gold = 1e6;
    game.plant(0, 'marrentill');
    const json = game.serialize(game.now);
    const later = game.now + 2 * 3600 * 1000;
    const back = new Game(JSON.parse(json), later);
    back.resumeFromSave(later);
    assert.ok(back.harvest(0) > 0);
    assert.ok(back.state.resources.marrentill_leaf > 0);

    const slow = newGame({ farming: 20 });
    const fast = newGame({ farming: 20 });
    fast.state.tools.hoe = 5;
    fast.recompute();
    for (const g of [slow, fast]) { g.state.gold = 1e6; g.plant(0, 'marrentill'); }
    const growSlow = slow.state.farming.plots[0].readyAt - slow.now;
    const growFast = fast.state.farming.plots[0].readyAt - fast.now;
    assert.ok(growFast < growSlow * 0.85, `${growFast} vs ${growSlow}`);
    assert.equal(FARMING_PLOTS.length, fast.state.farming.plots.length);
});

// ---------- agility ----------

test('agility: build with gold and materials, permanent bonuses, run the course for XP', () => {
    const game = newGame({ agility: 10 });
    const first = AGILITY_SLOTS[0].obstacles[0];
    assert.equal(game.buildObstacle(first.id), false, 'needs gold and materials');
    const cost = obstacleCost(game.state, 0);
    game.state.gold = cost.gold * 3;
    Object.assign(game.state.resources, { normal_log: 100, copper_bar: 100, oak_log: 100, iron_bar: 100 });
    const atkBefore = collectModifiers(game.state).atkMult;
    assert.equal(game.buildObstacle(first.id), true);
    assert.equal(game.state.resources.normal_log, 100 - cost.materials.normal_log);
    assert.equal(game.state.stats.goldSpent, cost.gold);
    assert.ok(collectModifiers(game.state).skillSpeed.mining > 0);
    assert.equal(game.buildObstacle(AGILITY_SLOTS[5].obstacles[0].id), false, 'slot 6 opens at level 70');

    game.state.gold = 1e9;
    assert.equal(game.buildObstacle('cargo_net'), true);
    assert.ok(collectModifiers(game.state).atkMult > atkBefore);
    assert.equal(game.buildObstacle('monkey_bars'), true, 'replace');
    assert.equal(game.state.agility.built[1], 'monkey_bars');
    assert.equal(collectModifiers(game.state).atkMult, atkBefore, 'the replaced obstacle no longer counts');

    const xp = game.state.skills.agility.xp;
    assert.equal(game.startAgility(), true);
    run(game, 20000);
    assert.ok(game.state.stats.courseRuns >= 2);
    assert.ok(game.state.skills.agility.xp > xp);

    game.state.combat.maxStage = 30;
    game.state.prestige.runStartedAt = 0;
    assert.ok(game.prestige());
    assert.deepEqual(game.state.agility.built.slice(0, 2), ['rope_swing', 'monkey_bars'], 'the course survives prestige');
    assert.equal(obstacleById('monkey_bars').slot, 1);
});

test('agility: obstacles upgrade to level 5, each level adding the bonus again, for doubling gold', () => {
    const game = newGame({ agility: 99 });
    game.state.gold = 1e15;
    Object.assign(game.state.resources, { oak_log: 100, iron_bar: 100 });
    game.buildObstacle('cargo_net');
    const base = collectModifiers(new Game(null, T0).state).atkMult;
    const one = collectModifiers(game.state).atkMult - base;
    const costs = [];
    for (let i = 0; i < 4; i++) {
        const gold = game.state.gold;
        assert.equal(game.upgradeObstacle(1), true);
        costs.push(gold - game.state.gold);
    }
    assert.equal(game.upgradeObstacle(1), false, 'level 5 is the top');
    assert.ok(Math.abs(collectModifiers(game.state).atkMult - base - 5 * one) < 1e-9);
    for (let i = 1; i < costs.length; i++) assert.ok(Math.abs(costs[i] / costs[i - 1] - 2) < 0.01);

    const low = newGame({ agility: 10 });
    low.state.gold = 1e15;
    Object.assign(low.state.resources, { oak_log: 100, iron_bar: 100 });
    low.buildObstacle('cargo_net');
    assert.equal(low.upgradeObstacle(1), false, 'level 2 needs Agility 17');
    game.buildObstacle('tightrope');
    assert.equal(game.state.agility.levels[1], 1, 'a replacement starts at level 1');
});

test('broken farming and agility records load safely', () => {
    const game = newGame();
    const raw = JSON.parse(game.serialize());
    raw.farming = { plots: [{ crop: 'mandrake', plantedAt: 1, readyAt: 2 }, null, 'x'] };
    raw.agility = { built: ['cargo_net', 'nope', 'pipe_crawl'], levels: [3, 2, 9] };
    raw.tools.hoe = 99;
    const fixed = new Game(raw, T0);
    assert.equal(fixed.state.farming.plots.length, FARMING_PLOTS.length);
    assert.ok(fixed.state.farming.plots.every(p => p.crop === null));
    assert.deepEqual(fixed.state.agility.built, [null, null, 'pipe_crawl', null, null, null]);
    assert.deepEqual(fixed.state.agility.levels, [0, 0, 5, 0, 0, 0]);
    assert.equal(fixed.state.tools.hoe, 5);
});

test('new skills unlock from play', () => {
    const game = newGame();
    const s = game.state;
    s.stats.actionsBySkill.cooking = 5;
    s.stats.actionsBySkill.woodcutting = 20;
    s.combat.bestStage = 35;   // agility's stage
    for (const id of ['shop', 'achievements', 'dungeons', 'alchemy', 'prestige', 'smithing', 'woodcutting']) s.unlocks[id] = true;   // the places before it on the road
    s.gold = 20_000;   // agility waits for half the first obstacle's gold
    let now = T0;
    const play = minutes => { for (let i = 0; i < minutes; i++) { now += 60_000; game.tick(now); } };   // places open one at a time (data/unlocks.js)
    play(40);
    for (const id of ['fishing', 'firemaking', 'agility']) assert.ok(s.unlocks[id], id);
    assert.ok(!s.unlocks.farming);
    s.stats.actionsBySkill.alchemy = 10;
    play(1);
    assert.ok(s.unlocks.farming);
});

test('offline: fishing uses bait and firemaking lights the bonfire', () => {
    const game = newGame({ fishing: 1, firemaking: 1 });
    game.state.resources.fishing_bait = 50;
    game.startNodeAction('fishing', 'raw_shrimp');
    const later = T0 + 3600 * 1000;
    const back = new Game(JSON.parse(game.serialize(T0)), later);
    back.resumeFromSave(later);
    assert.equal(back.state.resources.fishing_bait, 0);
    assert.ok(back.state.resources.raw_shrimp > 900);

    const fm = newGame({ firemaking: 1 });
    fm.state.resources.normal_log = 500;
    fm.startNodeAction('firemaking', 'burn_normal_log');
    const fmBack = new Game(JSON.parse(fm.serialize(T0)), later);
    fmBack.resumeFromSave(later);
    assert.ok(fmBack.state.stats.logsBurnt > 400);
    assert.ok(fmBack.derived.bonfire, 'lit on return');
    assert.ok(deriveStats(fmBack.state).xpMult > 1);
});
