// Regressions from the code review: time handling, combat exploits, prestige rules, prices.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { generateEquipment, goldPerKillAtStage, BALANCE } from '../src/core/formulas.js';
import { resolveAction } from '../src/systems/skilling.js';
import { eventStatus } from '../src/systems/events.js';
import { RESOURCES } from '../src/data/resources.js';
import { JEWEL_POWER } from '../src/data/items.js';

rng.setSource(seededRandom(2024));
const T0 = 1_700_000_000_000;
const MIN = 60 * 1000;

function play(game, ms, step) {
    let now = game.now;
    const end = now + ms;
    while (now < end) { now = Math.min(end, now + step); game.tick(now); }
}

function strongHero(now = T0) {
    const game = new Game(null, now);
    game.state.skills.combat.xp = xpForLevel(60);
    game.state.inventory.push(generateEquipment({ type: 'Weapon', tier: 5, power: 23.4, materialName: 'Runite', source: 'crafted' }, 900));
    game.equipItem(900);
    game.state.resources.cooked_bear = 1000;
    return game;
}

test('a background tab that ticks every 30 s loses nothing', () => {
    const results = [100, 5000, 30_000, 59_000].map(step => {
        const game = new Game(null, T0);
        game.startNodeAction('mining', 'copper_ore');
        play(game, 20 * MIN, step);
        return game.state.stats.actionsBySkill.mining;
    });
    for (const r of results) assert.ok(Math.abs(r - results[0]) <= 1, `actions by tick size: ${results.join(', ')}`);
});

test('a kill hands the rest of the step to the next monster, so step size doesn\'t change the kill rate', () => {
    const kills = [100, 1000, 5000].map(step => {
        rng.setSource(seededRandom(7));
        const game = strongHero();
        game.setFarmMode(true);
        game.enterCombat();
        play(game, 30 * MIN, step);
        return game.state.stats.kills;
    });
    rng.setSource(seededRandom(2024));
    for (const k of kills) assert.ok(Math.abs(k - kills[0]) / kills[0] < 0.03, `kills by step size: ${kills.join(', ')}`);
});

test('a click after an idle stretch simulates it first', () => {
    const game = new Game(null, T0);
    game.state.meta.lastInputAt = T0 - 10 * MIN; // idle: focused
    game.startNodeAction('mining', 'copper_ore');
    game.noteInput(T0 + 10 * MIN);
    assert.ok(game.state.stats.actionsBySkill.mining > 150, `${game.state.stats.actionsBySkill.mining} ores`);
    assert.equal(game.derived.focused, false);
});

test('beating the boss during a regroup moves you on and pays its first-fall bonus once', () => {
    const game = strongHero();
    const c = game.state.combat;
    c.stage = 10; c.maxStage = 10;
    game.enterCombat();
    c.regroupLeft = 50_000; // as if the boss had just escaped
    const kills = game.state.stats.bossKills;
    for (let i = 0; i < 400 && game.state.stats.bossKills === kills; i++) game.tick(game.now + 100);
    assert.equal(game.state.stats.bossKills, kills + 1);
    assert.equal(c.stage, 11, 'the kill moves you on instead of respawning the boss for another full payout');
    assert.equal(c.regroupLeft, 0);
});

test('prestige needs ten minutes of run; the skill point needs a real run', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 200; s.combat.maxStage = 200; s.combat.stage = 200;
    game.now = T0 + 10 * MIN;
    assert.ok(game.prestige());
    const tokens = s.prestige.tokens;
    const sp = s.prestige.skillPoints;
    assert.equal(s.combat.maxStage, 20);
    for (let i = 0; i < 100; i++) game.prestige();
    assert.equal(s.prestige.tokens, tokens, 'no instant repeat prestiges');
    game.now += 10 * MIN;
    const preview = game.prestigePreview();
    assert.equal(preview.fullRun, false);
    assert.ok(game.prestige());
    assert.equal(s.prestige.skillPoints, sp, 'a 20-stage run pays no skill point');
});

test('prices at a boss stage follow its regular monsters', () => {
    const at = stage => goldPerKillAtStage(stage);
    assert.ok(at(10) > at(9) && at(10) < at(11), `${at(9)} < ${at(10)} < ${at(11)}`);
    assert.ok(at(50) < 2 * at(49));
});

test('a dungeon on repeat starts every run rested', () => {
    const game = strongHero();
    game.state.combat.bestStage = 30;
    assert.ok(game.enterDungeon('goblin_warren'));
    const c = game.state.combat;
    let restarts = 0;
    let lastIndex = c.dungeon.index;
    for (let i = 0; i < 3000 && restarts < 2; i++) {
        game.tick(game.now + 100);
        if (c.dungeon && c.dungeon.index < lastIndex) {
            restarts++;
            assert.equal(c.hp, game.derived.maxHp, 'full health at the start of the next run');
        }
        lastIndex = c.dungeon ? c.dungeon.index : 0;
    }
    assert.ok(restarts >= 1);
});

test('Chieftain Slayer needs the stage 10 boss beaten, not just reached', () => {
    const game = new Game(null, T0);
    game.state.stats.maxStage = 10;
    game.tick(T0 + 100);
    assert.ok(!game.state.achievements.boss_1);
    game.state.stats.maxStage = 11;
    game.tick(T0 + 200);
    assert.ok(game.state.achievements.boss_1);
});

test('offline skilling happens on the clock: the bonfire goes out and events start on time', () => {
    // Burn logs, leave for 12 hours: the bonfire burnt out long before the return.
    const game = new Game(null, T0);
    game.state.skills.firemaking.xp = xpForLevel(30);
    game.state.resources.normal_log = 200;
    game.startNodeAction('firemaking', 'burn_normal_log');
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 12 * 3600 * 1000;
    const back = new Game(saved, later);
    back.resumeFromSave(later);
    assert.ok(back.state.bonfire.until < later - 3600 * 1000, 'the fire went out hours ago');
    assert.equal(back.derived.bonfire, false);

    // Leave on a Thursday afternoon (UTC), return half an hour into the weekend event.
    const friday = Date.UTC(2026, 9, 2);
    const leave = friday - 12 * 3600 * 1000;
    const miner = new Game(null, leave);
    miner.startNodeAction('mining', 'copper_ore');
    const snap = JSON.parse(miner.serialize(leave));
    const ret = friday + 30 * MIN;
    const g2 = new Game(snap, ret);
    g2.resumeFromSave(ret);
    assert.ok(eventStatus(g2.state, ret).active);
    // Half an hour of mining is at most ~40 tokens even with the event's speed; the whole 12 hours would hit the cap of 60.
    assert.ok(g2.state.events.tokens > 0 && g2.state.events.tokens <= 45, `tokens only for the event's first half hour: ${g2.state.events.tokens}`);
});

test('the welcome-back summary counts each salvaged item once', () => {
    const game = new Game(null, T0);
    game.state.skills.smithing.xp = xpForLevel(30);
    game.state.resources.copper_bar = 5000;
    game.state.settings.autoSalvage = 'off';
    game.startSmithing('Boots', 'copper_bar');
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 3600 * 1000;
    const back = new Game(saved, later);
    const before = back.state.stats.itemsSalvaged;
    const summary = back.resumeFromSave(later);
    assert.equal(summary.salvaged, back.state.stats.itemsSalvaged - before);
});

test('jewellery power follows the gem: a gold setting adds a fifth', () => {
    const state = new Game(null, T0).state;
    const ring = gem => resolveAction(state, { kind: 'craft', type: 'Ring', bar: 'gold_bar', gem }).item;
    assert.ok(Math.abs(ring('amethyst').power - RESOURCES.amethyst.power * JEWEL_POWER * 1.2) < 1e-9);
    assert.ok(ring('amethyst').power < RESOURCES.mithril_bar.power, 'a tier-1 ring no longer outclasses mithril');
    assert.ok(ring('diamond').power > ring('ruby').power);
    assert.equal(BALANCE.prestige.minRunMs, 10 * MIN);
});
