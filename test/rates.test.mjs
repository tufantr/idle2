// The skill screens' readouts (systems/rates.js, DESIGN §3.37): XP an hour, the time to the next level and how long the
// materials last, measured against the game itself; nothing at all where there is no true figure to show.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel, XP_FOR_MAX_LEVEL, levelProgress } from '../src/core/xp.js';
import { resolveAction, actionXp, intervalFor } from '../src/systems/skilling.js';
import { actionPace, materialsLast, skillPace } from '../src/systems/rates.js';
import { MASTERY_XP_DIVISOR } from '../src/data/mastery.js';
import { AGILITY_SLOTS } from '../src/data/agility.js';
import { renderSkill, renderSmithing, renderAgility, renderFarming } from '../src/ui/render.js';

const T0 = 1_780_000_000_000;

function newGame(seed = 3) {
    rng.setSource(seededRandom(seed));
    const game = new Game(null, T0);
    for (const id of Object.keys(game.state.skills)) if (id !== 'combat') game.state.skills[id].xp = xpForLevel(60);
    game.recompute();
    return game;
}
/** Plays `ms`, a second at a time. */
function play(game, ms) { for (const end = game.now + ms; game.now < end;) game.tick(Math.min(end, game.now + 1000)); }
/** Near to within `tol` of the larger. */
const near = (a, b, tol, what = '') => assert.ok(Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b)), `${what} ${a} vs ${b}`);

test('XP an hour is what the work pays: ten minutes of mining earn a sixth of it', () => {
    const game = newGame();
    game.startNodeAction('mining', 'copper_ore');
    play(game, 61_000);   // past the minute that brings Focus: the pace as it will stay
    const s = game.state;
    const pace = skillPace(s, game.derived, 'mining');
    const def = resolveAction(s);
    assert.equal(pace.perHour, actionXp(def.xp, game.derived) * 3600_000 / intervalFor(def, game.derived));
    const before = s.skills.mining.xp;
    play(game, 600_000);
    near(s.skills.mining.xp - before, pace.perHour / 6, 0.015, 'XP in ten minutes');
});

test('a log burnt twice pays twice, and the pace counts it', () => {
    const game = newGame(9);
    const s = game.state;
    s.tools.tinderbox = 5;
    s.resources.normal_log = 5000;
    s.mastery.firemaking.burn_normal_log = xpForLevel(99) / MASTERY_XP_DIVISOR;   // (mastered: no faster as it goes)
    game.recompute();
    game.startNodeAction('firemaking', 'burn_normal_log');
    play(game, 61_000);
    const def = resolveAction(s);
    const twice = game.derived.doubleChance.firemaking + (def.mastery?.double || 0);
    assert.ok(twice > 0.1);
    const pace = actionPace(s, game.derived, def);
    near(pace.xpEach, actionXp(def.xp, game.derived) * (1 + twice), 1e-12);
    const before = s.skills.firemaking.xp;
    play(game, 1_200_000);
    near(s.skills.firemaking.xp - before, pace.perHour / 3, 0.04, 'XP in twenty minutes');
});

test('the time to the next level is when the level comes', () => {
    const game = newGame();
    const s = game.state;
    game.startNodeAction('mining', 'copper_ore');
    play(game, 61_000);
    const { perHour } = skillPace(s, game.derived, 'mining');
    const { level, xpNeeded, xpInto } = levelProgress(s.skills.mining.xp);
    s.skills.mining.xp += xpNeeded - xpInto - perHour / 12;   // five minutes short of it
    const pace = skillPace(s, game.derived, 'mining');
    assert.equal(pace.nextLevel, level + 1);
    near(pace.toNextMs, 300_000, 1e-9);
    const start = game.now;
    while (levelProgress(s.skills.mining.xp).level === level) play(game, 1000);
    near(game.now - start, pace.toNextMs, 0.02, 'when the level came');
});

test("a mini-game's seconds-long burst is no pace; a potion and the bonfire, while they work, are", () => {
    const game = newGame();
    const s = game.state;
    game.startNodeAction('mining', 'copper_ore');
    const plain = skillPace(s, game.derived, 'mining').perHour;
    s.minigame.mining.boostUntil = game.now + 30_000;
    s.minigame.mining.mult = 2;
    game.recompute();
    assert.equal(game.derived.skillMult.mining, 2, 'the work itself goes at double speed');
    assert.equal(skillPace(s, game.derived, 'mining').perHour, plain);
    s.minigame.mining.boostUntil = 0;
    s.bonfire.until = game.now + 600_000;
    game.recompute();
    near(skillPace(s, game.derived, 'mining').perHour / plain, game.derived.xpMult, 1e-9);
});

test('how long the materials last is when the work stops', () => {
    const game = newGame(4);
    const s = game.state;
    s.resources.copper_ore = 120;
    game.startSmelting('copper_bar');
    play(game, 61_000);
    const left = materialsLast(s, game.derived, resolveAction(s), s.action.progress);
    assert.equal(left.first, 'copper_ore');
    const start = game.now;
    while (!s.action.stalled) play(game, 1000);
    near(game.now - start, left.ms, 0.06, 'when the ore ran out');
});

test('mastery keeping the ingredients makes them last longer, and the Bellows spare the coal', () => {
    const game = newGame(6);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(60);
    s.mastery.smithing.iron_bar = xpForLevel(70) / MASTERY_XP_DIVISOR;
    Object.assign(s.resources, { iron_ore: 300, coal: 80 });
    game.startSmelting('iron_bar');
    game.recompute();
    const def = resolveAction(s);
    const kept = def.mastery.preserve;
    assert.ok(kept > 0.05, `keeps ${kept}`);
    const interval = actionPace(s, game.derived, def).interval;
    const short = materialsLast(s, game.derived, def);
    assert.equal(short.first, 'coal');
    near(short.ms, 80 / (1 - kept) * interval, 1e-9);
    s.charms = { furnace_bellows: 100 };
    const spared = materialsLast(s, game.derived, def);
    assert.equal(spared.first, 'coal');
    near(spared.ms, 180 / (1 - kept) * interval, 1e-9, 'a hundred bars without coal');
    s.charms = { furnace_bellows: 1000 };
    assert.equal(materialsLast(s, game.derived, def).first, 'iron_ore', 'the ore runs out first now');
    delete s.charms.furnace_bellows;
    s.mastery.smithing.iron_bar = 0;
    s.resources.coal = 3;
    assert.equal(Math.round(materialsLast(s, game.derived, resolveAction(s)).ms / actionPace(s, game.derived, resolveAction(s)).interval), 3, 'three bars of coal left');
});

test('no figure is made up: no work, other work, stalled work, no materials, Farming, or XP that has stopped', () => {
    const game = newGame();
    const s = game.state;
    assert.equal(skillPace(s, game.derived, 'mining'), null, 'nothing under way');
    game.startNodeAction('mining', 'copper_ore');
    assert.ok(skillPace(s, game.derived, 'mining'));
    assert.equal(skillPace(s, game.derived, 'smithing'), null, "another skill's screen");
    assert.equal(skillPace(s, game.derived, 'farming'), null);
    assert.equal(materialsLast(s, game.derived, resolveAction(s)), null, 'gathering takes nothing');
    s.skills.mining.xp = XP_FOR_MAX_LEVEL;
    const top = skillPace(s, game.derived, 'mining');
    assert.ok(top.perHour > 0);
    assert.deepEqual([top.nextLevel, top.toNextMs], [null, null], 'no next level at the top');
    s.skills.mining.xp = XP_FOR_MAX_LEVEL * 2;
    assert.equal(skillPace(s, game.derived, 'mining'), null, 'its XP has stopped');
    game.stopAction();
    s.resources.copper_ore = 0;
    game.startSmelting('copper_bar');
    game.tick(game.now + 1000);
    assert.equal(s.action.stalled, true);
    assert.equal(skillPace(s, game.derived, 'smithing'), null, 'waiting for ore');
    assert.equal(materialsLast(s, game.derived, resolveAction(s)), null);
});

test('the readouts only read: reckoning and drawing them changes nothing in the game', () => {
    const game = newGame();
    const s = game.state;
    s.resources.copper_ore = 50;
    game.startSmelting('copper_bar');
    game.tick(game.now + 1000);
    const before = JSON.stringify(s);
    skillPace(s, game.derived, 'smithing');
    materialsLast(s, game.derived, resolveAction(s), s.action.progress);
    renderSmithing(game, {});
    assert.equal(JSON.stringify(s), before);
});

test('the course has a pace and no materials', () => {
    const game = newGame();
    const s = game.state;
    s.agility.built[0] = AGILITY_SLOTS[0].obstacles[0].id;
    s.agility.levels[0] = 1;
    game.startAgility();
    const pace = skillPace(s, game.derived, 'agility');
    assert.ok(pace.perHour > 0);
    assert.equal(materialsLast(s, game.derived, pace.def), null);
    assert.match(renderAgility(game, {}), /class="skill-pace"/);
});

test('the screens show them only for the work under way, each with a tip a tap opens', () => {
    const game = newGame();
    const s = game.state;
    const pace = html => html.match(/<span class="skill-pace">.*?<\/span><\/span>/)?.[0] || '';
    assert.equal(pace(renderSkill(game, {}, 'mining')), '', 'at rest: nothing');
    s.resources.copper_ore = 50;
    game.startSmelting('copper_bar');
    game.tick(game.now + 1000);
    assert.equal(pace(renderSkill(game, {}, 'mining')), '', 'at work elsewhere: nothing here');
    const header = pace(renderSmithing(game, {}));
    assert.match(header, /data-tip-title="XP an hour"/);
    assert.match(header, /data-tip-title="Level 61"/);
    assert.match(renderSmithing(game, {}), /data-tip-title="Materials" data-tip="Copper Ore runs out first/);
    assert.doesNotMatch(renderSmithing(game, {}).replace(/id="card-copper-bar".*?<\/div>\s*<\/div>/s, ''), /data-tip-title="Materials"/, 'on the card being worked only');
    assert.equal(pace(renderFarming(game, {})), '', 'Farming grows on the clock');
});
