// Mastery: a level per action, earned by doing it; faster, luckier and thriftier with every level.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { resolveAction, intervalFor } from '../src/systems/skilling.js';
import { masteryBonus, masteryLevel, skillMastery, addMasteryXp } from '../src/systems/mastery.js';
import { MASTERY_XP_DIVISOR, MASTERY_SKILLS, MASTERY_CHECKPOINTS, MASTERY_MAX_LEVEL, masteryActions, masteryShare, checkpointsAt, jewelKey, forgeKey } from '../src/data/mastery.js';
import { RESOURCES } from '../src/data/resources.js';
import { generateDrop } from '../src/core/formulas.js';
import { reinforceCost } from '../src/data/workshop.js';
import { anvilCost } from '../src/systems/anvil.js';
import { renderSmithing } from '../src/ui/render.js';

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
    s.skills.crafting.xp = xpForLevel(99);
    for (const [skill, key] of [['mining', 'copper_ore'], ['smithing', 'iron_bar'], ['crafting', jewelKey('amethyst')]]) s.mastery[skill][key] = practiceFor(99);
    const ore = resolveAction(s, { kind: 'node', skill: 'mining', id: 'copper_ore' });
    assert.ok(ore.mastery.double > 0.24 && ore.mastery.preserve === 0, 'gathering has nothing to keep');
    const bar = resolveAction(s, { kind: 'smelt', id: 'iron_bar' });
    assert.ok(bar.mastery.double > 0.24 && bar.mastery.preserve > 0.19);
    const ring = resolveAction(s, { kind: 'craft', type: 'Ring', bar: 'silver_bar', gem: 'amethyst' });
    const amulet = resolveAction(s, { kind: 'craft', type: 'Neck', bar: 'silver_bar', gem: 'amethyst' });
    assert.equal(ring.mastery.key, amulet.mastery.key, 'one mastery per gem');
    assert.ok(ring.mastery.double === 0 && ring.mastery.preserve > 0.19, 'no double gear, but the bar and gem are kept');
    assert.ok(intervalFor(ore, game.derived) < intervalFor({ ...ore, mastery: null }, game.derived), 'faster with mastery');
});

test('preservation keeps the ingredients and the log; doubling adds output', () => {
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
    // mastery 99 doubles 24.5% of the dishes, and cooking 99's cape 10% more (data/capes.js)
    assert.ok(extra / cooks > 0.28 && extra / cooks < 0.41, `doubled ${extra} of ${cooks}`);
});

test('jewellery mastery is shared by every piece of a gem; nothing is forged, and tools are bought', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.crafting = true;
    s.skills.crafting.xp = xpForLevel(10);
    s.resources.silver_bar = 500; s.resources.amethyst = 500;
    game.startCrafting('Ring', 'silver_bar', 'amethyst');
    run(game, 30_000);
    assert.ok(resolveAction(s, { kind: 'craft', type: 'Ear', bar: 'silver_bar', gem: 'amethyst' }).mastery.level > 1, 'the earring shares the ring\'s mastery');
    assert.equal(resolveAction(s, { kind: 'smith', type: 'Head', bar: 'copper_bar' }), null, 'no forging (the owner, October 2026)');
    assert.equal(resolveAction(s, { kind: 'tool', tool: 'pickaxe', tier: 1 }), null, 'tools are bought, not made (systems/tools.js)');
});

test('a metal past copper is practised at the anvil, and its mastery takes bars off the work', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(40);
    s.resources.iron_bar = 500;
    s.resources.essence = 500;
    s.equipped.Body = generateDrop(2, true, s.idCounter++, 0, [{ type: 'Body', weight: 1 }], { tier: 2 });
    const fresh = anvilCost(s, s.equipped.Body).bars;
    assert.ok(game.reinforceItem(s.equipped.Body.id));
    assert.equal(s.mastery.smithing[forgeKey('iron_bar')], fresh, 'a second of practice a bar');
    s.mastery.smithing[forgeKey('iron_bar')] = practiceFor(99);
    s.forge.Body.level = 6;
    const practised = anvilCost(s, s.equipped.Body).bars;
    assert.ok(practised < reinforceCost('Body', 6, 2).bars * 0.85, `${practised} bars at mastery 99`);
});

test('the anvil lists the metals open at this Smithing level, each with its mastery and the bars it saves, once mastery has opened', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(40);
    s.seen.anvil = true;
    s.equipped.Body = generateDrop(2, true, s.idCounter++, 0, [{ type: 'Body', weight: 1 }], { tier: 2 });
    const anvil = () => renderSmithing(game, { smithView: 'anvil' });
    assert.ok(!anvil().includes('anvil-metals'), 'not before mastery opens');
    s.seen.mastery = true;
    s.mastery.smithing[forgeKey('iron_bar')] = practiceFor(99);
    const html = anvil();
    assert.match(html, /Iron at the anvil: mastery 99/);
    assert.match(html, /−19\.6% bars/, 'said on the strip, for phones have no tooltips');
    assert.match(html, /Copper at the anvil: mastery 1\b/);
    assert.match(html, /Mithril at the anvil/);
    assert.ok(!html.includes('Adamant at the anvil'), 'a metal past the level stays out');
    assert.match(html, /7 bars to smelt and 5 metals at the anvil/, "the header's tip says where Smithing's actions are");
    s.equipped.Body = null;
    assert.ok(!anvil().includes('anvil-metals'), 'and nothing to work, no strip');
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
    // a gem's jewellery, or the plain pieces (the setting alone, data/workshop.js PLAIN)
    for (const a of masteryActions('crafting')) assert.ok(RESOURCES[a.key.replace('jewel_', '')] || a.key === 'jewel_plain', a.key);
});

test('checkpoints: at 10, 25, 50 and 95% of a skill\'s whole mastery its actions get faster, for good', () => {
    const game = new Game(null, T0);
    const s = game.state;
    const actions = masteryActions('woodcutting');
    const most = actions.length * (MASTERY_MAX_LEVEL - 1);
    assert.equal(masteryShare(s, 'woodcutting'), 0);
    const base = game.derived.skillSpeed.woodcutting || 0;
    // levels spread over the actions up to just under 10%: no checkpoint yet
    const below = Math.floor(0.10 * most) - 1;
    let left = below;
    for (const a of actions) { const lv = Math.min(MASTERY_MAX_LEVEL - 1, left); s.mastery.woodcutting[a.key] = practiceFor(lv + 1); left -= lv; if (!left) break; }
    game.recompute();
    assert.ok(masteryShare(s, 'woodcutting') < 0.10);
    assert.equal(game.derived.skillSpeed.woodcutting, base);
    // the level that crosses it: a card, a line in the log, and the speed at once
    game.drainEvents();
    const key = actions.find(a => masteryLevel(s, 'woodcutting', a.key) < MASTERY_MAX_LEVEL).key;
    const level = masteryLevel(s, 'woodcutting', key);
    addMasteryXp(game, 'woodcutting', key, practiceFor(level + 2) - s.mastery.woodcutting[key]);
    const cp = game.drainEvents().filter(e => e.type === 'masteryCheckpoint');
    assert.deepEqual(cp.map(e => [e.skill, e.at, e.speed]), [['woodcutting', 0.10, MASTERY_CHECKPOINTS[0].speed]]);
    assert.ok(Math.abs(game.derived.skillSpeed.woodcutting - base - MASTERY_CHECKPOINTS[0].speed) < 1e-9);
    assert.equal(s.stats.masteryCheckpoints, 1);
    // everything mastered: all four, and only the woodcutting's own actions are faster
    for (const a of actions) s.mastery.woodcutting[a.key] = practiceFor(MASTERY_MAX_LEVEL);
    game.recompute();
    assert.equal(masteryShare(s, 'woodcutting'), 1);
    assert.equal(checkpointsAt(1).length, MASTERY_CHECKPOINTS.length);
    const all = MASTERY_CHECKPOINTS.reduce((sum, c) => sum + c.speed, 0);
    assert.ok(Math.abs(game.derived.skillSpeed.woodcutting - base - all) < 1e-9);
    assert.equal(game.derived.skillSpeed.mining || 0, new Game(null, T0).derived.skillSpeed.mining || 0);
    // a save keeps them: they come from the levels, with nothing to store
    const back = new Game(JSON.parse(game.serialize(T0)), T0);
    assert.ok(Math.abs(back.derived.skillSpeed.woodcutting - game.derived.skillSpeed.woodcutting) < 1e-9);
    assert.equal(back.drainEvents().filter(e => e.type === 'masteryCheckpoint').length, 0, 'no cards on load');
});

test('two checkpoints passed at once are both announced', () => {
    const game = new Game(null, T0);
    const s = game.state;
    // woodcutting has six actions: one taken from 1 to 99 is a sixth of its mastery, from under 10% past 25%
    const actions = masteryActions('woodcutting');
    s.mastery.woodcutting[actions[0].key] = practiceFor(50);
    game.recompute();
    assert.ok(masteryShare(s, 'woodcutting') < 0.10);
    game.drainEvents();
    addMasteryXp(game, 'woodcutting', actions[1].key, practiceFor(MASTERY_MAX_LEVEL));
    assert.deepEqual(game.drainEvents().filter(e => e.type === 'masteryCheckpoint').map(e => e.at), [0.10, 0.25]);
});

test('Practise works a metal\'s bars for its mastery alone, a second a bar as the anvil\'s jobs pay, to its next level a tap', async () => {
    const { practise, practiseCost } = await import('../src/systems/anvil.js');
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(40);
    s.resources.copper_bar = 5000;
    s.resources.essence = 100;
    const key = forgeKey('copper_bar');
    const smithing = s.skills.smithing.xp;
    const forge = JSON.stringify(s.forge);
    let taps = 0;
    while (masteryLevel(s, 'smithing', key) < 40) {
        const before = { bars: s.resources.copper_bar, xp: s.mastery.smithing[key] || 0, level: masteryLevel(s, 'smithing', key) };
        const cost = practiseCost(s, 'copper_bar');
        assert.ok(cost.ok);
        assert.equal(game.practise('copper_bar'), true);
        taps++;
        assert.equal(before.bars - s.resources.copper_bar, cost.bars);
        assert.ok(Math.abs((s.mastery.smithing[key] - before.xp) - cost.bars) < 1e-9, 'a second of practice a bar');
        assert.equal(masteryLevel(s, 'smithing', key), before.level + 1, 'a level a tap');
    }
    assert.equal(taps, 39);
    assert.equal(s.skills.smithing.xp, smithing, 'no Smithing XP');
    assert.equal(JSON.stringify(s.forge), forge, 'no slot\'s levels');
    assert.equal(s.resources.essence, 100, 'no essence');
    // no faster than working the metal on a slot today: its mastery's 99 takes as many bars as the jobs' (a reroll's bars too)
    assert.equal(Math.round(practiceFor(MASTERY_MAX_LEVEL)), 181034);
    s.equipped.Body = generateDrop(1, true, s.idCounter++, 0, [{ type: 'Body', weight: 1 }], { tier: 1, rarity: 'rare' });
    const rerollXp = s.mastery.smithing[key];
    const bars = s.resources.copper_bar;
    assert.ok(game.rerollItem(s.equipped.Body.id));
    assert.equal(s.mastery.smithing[key] - rerollXp, bars - s.resources.copper_bar, 'a reroll pays the same, a second a bar');
    // a tap takes what is held when it is less than the next level asks; none held, none to take
    s.resources.copper_bar = 3;
    const short = practiseCost(s, 'copper_bar');
    assert.ok(short.need > 3 && short.bars === 3);
    assert.equal(game.practise('copper_bar'), true);
    assert.equal(s.resources.copper_bar, 0);
    assert.equal(practiseCost(s, 'copper_bar').why, 'short');
    assert.equal(game.practise('copper_bar'), false);
    // a metal Smithing hasn't reached; a metal mastered
    s.resources.adamant_bar = 10;
    assert.equal(practiseCost(s, 'adamant_bar').why, 'level');
    s.mastery.smithing[forgeKey('iron_bar')] = practiceFor(99);
    s.resources.iron_bar = 10;
    assert.equal(practiseCost(s, 'iron_bar').why, 'max');
    assert.equal(practise(game, 'gold_bar'), false, 'gold is a setting, not a metal the anvil works');
});

test('the anvil\'s mastery strip offers Practise for each open metal held, the bars a tap takes on it', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(40);
    s.seen.anvil = s.seen.mastery = true;
    s.equipped.Body = generateDrop(2, true, s.idCounter++, 0, [{ type: 'Body', weight: 1 }], { tier: 2 });
    s.resources.copper_bar = 700;
    const html = renderSmithing(game, { smithView: 'anvil' });
    assert.match(html, /FI\.practise\('copper_bar'\)/);
    assert.match(html, /class="anvil-practise ready"[^>]*aria-label="Practise Copper: 2 bars"/, 'level 1 to 2 asks two bars');
    assert.match(html, /aria-label="Practise Iron: \d+ bars"/, 'one with none held says what the next level asks');
    assert.ok(!html.includes("FI.practise('adamant_bar')"), 'not past the Smithing level');
});
