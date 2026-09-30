// Mastery: a level per action, earned by doing it; faster, luckier and thriftier with every level.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { resolveAction, intervalFor } from '../src/systems/skilling.js';
import { masteryBonus, masteryLevel, skillMastery } from '../src/systems/mastery.js';
import { MASTERY_XP_DIVISOR, MASTERY_SKILLS, masteryActions, forgeKey } from '../src/data/mastery.js';
import { RESOURCES } from '../src/data/resources.js';

rng.setSource(seededRandom(4242));
const T0 = 1_700_000_000_000;
const practiceFor = level => xpForLevel(level) / MASTERY_XP_DIVISOR;

function run(game, ms, step = 100) {
    let now = game.now;
    const end = now + ms;
    while (now < end) { now += step; game.tick(now); }
}

test('every action earns its base time in mastery XP; 99 takes about 50 hours', () => {
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    run(game, 60_000);
    const actions = game.state.stats.actionsBySkill.mining;
    assert.ok(actions >= 19, `${actions} ores`);
    assert.equal(game.state.mastery.mining.copper_ore, actions * 3);
    assert.ok(masteryLevel(game.state, 'mining', 'copper_ore') > 10, 'the first levels come in a minute');
    const hoursTo99 = practiceFor(99) / 3600;
    assert.ok(hoursTo99 > 45 && hoursTo99 < 55, `${hoursTo99.toFixed(1)} h`);
});

test('the bonuses: speed for all, doubling for resources, preservation for ingredients', () => {
    const top = masteryBonus(99, { produces: true, hasInputs: true });
    assert.ok(Math.abs(top.speed - 0.098) < 1e-9 && Math.abs(top.double - 0.245) < 1e-9 && Math.abs(top.preserve - 0.196) < 1e-9);
    assert.deepEqual(masteryBonus(1, { produces: true, hasInputs: true }), { speed: 0, double: 0, preserve: 0 });

    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(99);
    s.skills.mining.xp = xpForLevel(99);
    for (const [skill, key] of [['mining', 'copper_ore'], ['smithing', 'iron_bar'], ['smithing', forgeKey('iron_bar')]]) s.mastery[skill][key] = practiceFor(99);
    const ore = resolveAction(s, { kind: 'node', skill: 'mining', id: 'copper_ore' });
    assert.ok(ore.mastery.double > 0.24 && ore.mastery.preserve === 0, 'gathering has nothing to keep');
    const bar = resolveAction(s, { kind: 'smelt', id: 'iron_bar' });
    assert.ok(bar.mastery.double > 0.24 && bar.mastery.preserve > 0.19);
    const sword = resolveAction(s, { kind: 'smith', type: 'Weapon', bar: 'iron_bar' });
    const body = resolveAction(s, { kind: 'smith', type: 'Body', bar: 'iron_bar' });
    assert.equal(sword.mastery.key, body.mastery.key, 'one mastery per metal');
    assert.ok(sword.mastery.double === 0 && sword.mastery.preserve > 0.19, 'no double gear, but bars are kept');
    assert.ok(intervalFor(ore, game.derived) < intervalFor({ ...ore, mastery: null }, game.derived), 'faster with mastery');
});

test('preservation keeps ingredients and fuel; doubling adds output', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.cooking.xp = xpForLevel(99);
    s.mastery.cooking.cooked_rabbit = practiceFor(99);
    s.resources.raw_rabbit = 5000;
    s.resources.normal_log = 5000;
    game.startNodeAction('cooking', 'cooked_rabbit');
    run(game, 20 * 60_000, 200);
    const cooks = s.stats.actionsBySkill.cooking;
    const used = 5000 - s.resources.raw_rabbit;
    const saved = s.stats.ingredientsSaved;
    assert.equal(used + saved, cooks, 'every action either used or kept its rabbit');
    assert.equal(5000 - s.resources.normal_log, used, 'the log is kept with the rabbit');
    assert.ok(saved / cooks > 0.15 && saved / cooks < 0.25, `kept ${saved} of ${cooks}`);
    const extra = s.resources.cooked_rabbit - cooks;
    assert.ok(extra / cooks > 0.18 && extra / cooks < 0.31, `doubled ${extra} of ${cooks}`);
});

test('forging mastery is shared by every piece of a metal; jewellery by gem', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(40);
    s.resources.iron_bar = 500;
    game.startSmithing('Weapon', 'iron_bar');
    run(game, 30_000);
    const practice = s.mastery.smithing[forgeKey('iron_bar')];
    assert.ok(practice > 0);
    assert.ok(resolveAction(s, { kind: 'smith', type: 'Head', bar: 'iron_bar' }).mastery.level > 1);
    assert.equal(resolveAction(s, { kind: 'smith', type: 'Head', bar: 'copper_bar' }).mastery.level, 1);
    assert.equal(resolveAction(s, { kind: 'tool', tool: 'pickaxe', tier: 1 }).mastery, undefined, 'tools have none');
});

test('level-ups count toward stats and achievements; milestones are logged', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.mastery.mining.copper_ore = practiceFor(49) + 1;
    game.startNodeAction('mining', 'copper_ore');
    const before = s.stats.masteryLevels;
    run(game, 10 * 60_000);
    assert.ok(masteryLevel(s, 'mining', 'copper_ore') >= 50);
    assert.ok(s.log.some(e => /Copper Vein: mastery 50/.test(e.text)), 'mastery 50 is logged');
    assert.ok(s.stats.masteryLevels > before);
    assert.equal(s.stats.masteryBest, masteryLevel(s, 'mining', 'copper_ore'));

    s.stats.masteryLevels = 500;
    game.tick(game.now + 100);
    assert.ok(s.achievements.practised, 'Well Practised at 500 levels');
});

test('saves: unknown actions are dropped, bad numbers cleaned, stats rebuilt; prestige keeps mastery', () => {
    const game = new Game(null, T0);
    const raw = JSON.parse(game.serialize(T0));
    raw.mastery = { mining: { copper_ore: practiceFor(99), bogus: 5, iron_ore: 'x' }, nonsense: { a: 1 } };
    raw.stats.masteryLevels = 999999;
    const state = migrateState(raw, T0);
    assert.deepEqual(Object.keys(state.mastery.mining), ['copper_ore']);
    assert.equal(state.mastery.nonsense, undefined);
    assert.equal(state.stats.masteryLevels, 98);
    assert.equal(state.stats.masteries99, 1);
    for (const skill of MASTERY_SKILLS) assert.ok(state.mastery[skill], skill);

    const g = new Game(state, T0);
    g.state.combat.maxStage = 30;
    g.state.combat.bestStage = 30;
    g.state.prestige.runStartedAt = 0;
    assert.ok(g.prestige());
    assert.equal(masteryLevel(g.state, 'mining', 'copper_ore'), 99);
    assert.equal(skillMastery(g.state, 'mining').maxed, 1);
});

test('every mastery action is real and every key is unique within its skill', () => {
    let total = 0;
    for (const skill of MASTERY_SKILLS) {
        const keys = masteryActions(skill).map(a => a.key);
        assert.equal(new Set(keys).size, keys.length, skill);
        total += keys.length;
    }
    assert.ok(total >= 70, `${total} actions with a mastery`);
    for (const a of masteryActions('crafting')) assert.ok(RESOURCES[a.key.replace('jewel_', '')], a.key);
});
