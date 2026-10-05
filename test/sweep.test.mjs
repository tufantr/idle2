// Regressions from the October 2026 bug sweep: a reload at a dungeon's chest, medals and boosts while
// away, potions between two, a prestige's farm mode, boss clocks and the step size, the Titan's best
// try, what auto-eat accepts, a background tab's minute ticks, mini-games left open, tools and salvage.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { dungeonById } from '../src/data/dungeons.js';
import { choosingAfterClear } from '../src/systems/dungeon.js';
import { migrateState } from '../src/core/state.js';
import { MASTERY_XP_DIVISOR } from '../src/data/mastery.js';
import { generateEquipment } from '../src/core/formulas.js';
import { RARITIES } from '../src/data/items.js';
import { spawnEnemy } from '../src/systems/combat.js';

const T0 = 1_700_000_000_000;
const strong = ({ bestStage = 40, tokens = 20000 } = {}) => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = bestStage;
    game.state.combat.maxStage = bestStage;
    game.state.prestige.tokens = tokens;
    game.state.settings.autoSalvage = 'off';
    game.recompute();
    return game;
};
const tickUntil = (game, done, maxMs = 10 * 60 * 1000, step = 100) => {
    let now = game.now;
    const end = now + maxMs;
    while (now < end && !done()) { now += step; game.tick(now); }
    return now;
};

test('a reload while the hero waits at the chest does not bring the boss back for another clear', () => {
    rng.setSource(seededRandom(7));
    const game = strong();
    const warren = dungeonById('goblin_warren');
    game.enterDungeon(warren.id);
    const now = tickUntil(game, () => game.state.combat.dungeon?.choiceLeft > 0);
    const back = new Game(JSON.parse(game.serialize(now)), now + 1000);
    back.resumeFromSave(now + 1000);
    assert.equal(choosingAfterClear(back.state), true);
    assert.equal(back.state.combat.enemy, null, 'no monster at the chest');
    const clears = back.state.dungeons[warren.id].clears;
    const fragments = back.state.dungeons[warren.id].fragments;
    back.tick(back.now + 200);
    assert.equal(back.clickAttack(), false);
    assert.equal(back.state.dungeons[warren.id].clears, clears);
    assert.equal(back.state.dungeons[warren.id].fragments, fragments);
});

test('a medal earned while away counts from then on, and its card shows when the player is back', () => {
    // Mining copper for 6 hours away, a little short of Mining 25 (The Excavator: +10% speed).
    const away = shortOf25 => {
        rng.setSource(seededRandom(9));
        const game = new Game(null, T0);
        game.state.skills.mining.xp = xpForLevel(25) - shortOf25;
        if (!shortOf25) game.state.achievements.excavator = true;   // already earned
        game.state.mastery.mining.copper_ore = Math.ceil(xpForLevel(98) / MASTERY_XP_DIVISOR) + 1;   // no mastery level-ups on the way
        game.startNodeAction('mining', 'copper_ore');
        const later = T0 + 6 * 3600 * 1000;
        const back = new Game(JSON.parse(game.serialize(T0)), later);
        const ore = back.state.resources.copper_ore;
        back.resumeFromSave(later);
        return { ore: back.state.resources.copper_ore - ore, medal: back.drainEvents().some(e => e.type === 'achievement' && e.id === 'excavator') };
    };
    const had = away(0);
    const soon = away(60);
    assert.ok(soon.ore > had.ore * 0.97, `${soon.ore} ore against ${had.ore} for a hero who already had the medal`);
    assert.equal(soon.medal, true, 'the medal earned while away is announced');
});

test('a Health Potion follows the last one at once: no health is lost between two', () => {
    rng.setSource(seededRandom(3));
    const game = strong({ bestStage: 10, tokens: 0 });
    game.state.resources.health_potion = 6;
    game.setPotion('health_potion');
    game.enterCombat();
    game.setFarmMode(true);
    tickUntil(game, () => game.state.combat.potionCharges > 0, 60000);
    game.tick(game.now + 100);
    const boosted = game.derived.maxHp;
    assert.ok(boosted > 0 && game.state.combat.potionCharges > 0);
    let lowest = boosted;
    let now = game.now;
    for (let i = 0; i < 1200 && game.state.resources.health_potion > 1; i++) { now += 100; game.tick(now); lowest = Math.min(lowest, game.derived.maxHp); }
    assert.ok(game.state.resources.health_potion <= 1, 'several potions were drunk');
    assert.equal(lowest, boosted, 'max health never fell back between potions');
});

test('a prestige ends "stay on this stage": the new run climbs', () => {
    rng.setSource(seededRandom(4));
    const game = strong({ bestStage: 60, tokens: 20000 });
    game.state.prestige.runStartedAt = T0 - 3600 * 1000;
    game.state.combat.stage = 60;
    game.setFarmMode(true);
    assert.equal(game.prestige(), true);
    assert.equal(game.state.combat.farmMode, false);
});

test('a boss clock gives the same result whatever the size of the steps', () => {
    // A deterministic boss (no crits, no spread, no damage to the hero) that would fall 1.5 s after its clock.
    const fight = (step, first) => {
        rng.setSource(() => 0.5);
        const game = new Game(null, T0);
        const c = game.state.combat;
        c.stage = 10; c.maxStage = 10;
        game.state.meta.lastInputAt = T0 + 1e12;   // never focused: no speed change mid-fight
        game.recompute();
        spawnEnemy(game);
        c.enemy.hp = c.enemy.maxHp = game.derived.atk * 21;
        c.enemy.atk = 0;
        game.enterCombat();
        const boss = c.enemy;
        let now = game.now;
        for (let next = first; now < T0 + 40000 && c.enemy === boss; next = step) { now += next; game.tick(now); }
        return { killed: game.state.stats.bossKills || 0, escaped: game.state.stats.bossEscapes || 0 };
    };
    const fine = fight(100, 100);
    assert.equal(fine.escaped, 1, 'the clock wins by a second and a half');
    assert.deepEqual(fight(5000, 2000), fine, 'in a background tab too');
    assert.deepEqual(fight(1000, 500), fine, 'and in the offline replay');
});

test('a Titan beaten leaves no best try against the next', () => {
    rng.setSource(seededRandom(5));
    const game = strong({ bestStage: 30, tokens: 200000 });
    game.state.titan.bestPct = 0.4;
    game.state.titan.readyAt = 0;
    assert.ok(game.challengeTitan());
    tickUntil(game, () => game.state.combat.mode !== 'titan', 120000);
    assert.equal(game.state.titan.kills, 1);
    assert.equal(game.state.titan.bestPct, 0);
});

test('only food is eaten and only potions are drunk, from the dock or from a save', () => {
    const game = strong();
    game.setAutoEat('copper_ore');
    assert.equal(game.state.combat.autoEat, 'auto');
    game.setAutoEat('cooked_shrimp');
    assert.equal(game.state.combat.autoEat, 'cooked_shrimp');
    game.setPotion('copper_ore');
    assert.equal(game.state.combat.potion, 'none');
    const saved = JSON.parse(game.serialize(T0));
    saved.combat.autoEat = 'copper_ore';
    saved.combat.potion = 'normal_log';
    const loaded = migrateState(saved, T0);
    assert.equal(loaded.combat.autoEat, 'auto');
    assert.equal(loaded.combat.potion, 'none');
});

test("a background tab's minute ticks are ordinary play, and a replay keeps the action's progress", () => {
    const run = every => {
        rng.setSource(seededRandom(6));
        const game = new Game(null, T0);
        game.state.unlocks.hunting = true;
        game.startNodeAction('hunting', 'raw_rabbit');
        let welcomes = 0;
        for (let now = T0 + every; now <= T0 + 3600 * 1000; now += every) if (game.tick(now)) welcomes++;
        return { done: game.state.stats.actionsBySkill.hunting, welcomes };
    };
    const a = run(59995);
    const b = run(60005);
    assert.equal(b.welcomes, 0, 'no welcome-back for a minute');
    assert.ok(Math.abs(a.done - b.done) <= a.done * 0.02, `${a.done} and ${b.done}`);
    // A long absence: the action under way goes on, and what is left over is kept.
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    game.tick(T0 + 1500);
    const saved = JSON.parse(game.serialize(T0 + 1500));
    assert.ok(saved.action.progress > 0);
    const back = new Game(saved, T0 + 1500 + 3600 * 1000);
    back.resumeFromSave(T0 + 1500 + 3600 * 1000);
    assert.ok(back.state.action.progress > 0, 'the leftover is progress toward the next action');
});

test('a mini-game boost lasts its own time while away, and a challenge left open cannot be won later', () => {
    const away = win => {
        rng.setSource(seededRandom(8));
        const game = new Game(null, T0);
        game.state.settings.devUnlockAll = true;
        game.startNodeAction('mining', 'copper_ore');
        if (win) {
            const mg = game.state.minigame.mining;
            mg.bonus = 0.35; mg.boostUntil = T0 + 90000; game.markDirty(); game.recompute();
        }
        const later = T0 + 4 * 3600 * 1000;
        const back = new Game(JSON.parse(game.serialize(T0)), later);
        const ore = back.state.resources.copper_ore;
        back.resumeFromSave(later);
        return back.state.resources.copper_ore - ore;
    };
    const plain = away(false);
    const boosted = away(true);
    assert.ok(boosted < plain * 1.03, `${boosted} ore with a 90 s boost against ${plain} without`);
    const game = new Game(null, T0);
    game.state.settings.devUnlockAll = true;
    game.startNodeAction('cooking', 'cooked_rabbit');
    assert.ok(game.startMinigame('cooking'));
    game.state.minigame.cooking.challenge.heat = game.state.minigame.cooking.challenge.targetStart + 0.01;
    game.stopAction();
    game.tick(T0 + 5 * 60000);
    assert.equal(game.state.minigame.cooking.challenge, null, 'it ran out');
    assert.equal(game.resolveMinigame('cooking'), false);
});

test('a tool made counts at once, and "Salvage commons" is not counted as automatic', () => {
    const game = new Game(null, T0);
    game.state.skills.smithing.xp = xpForLevel(30);   // the smithy makes hoes
    game.state.unlocks.farming = true;
    game.state.resources.copper_bar = 10; game.state.resources.normal_log = 10;
    const speed = game.derived.skillSpeed.farming;
    game.startToolCraft('hoe', 1);
    tickUntil(game, () => game.state.tools.hoe >= 1, 60000, 500);
    assert.equal(game.state.tools.hoe, 1);
    assert.ok(game.derived.skillSpeed.farming > speed, 'the hoe speeds the crops straight away');
    const rarity = RARITIES.find(r => r.id === 'common');
    for (let i = 0; i < 3; i++) game.state.inventory.push(generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper', rarity }, 900 + i));
    const before = game.state.stats.itemsAutoSalvaged || 0;
    game.salvageAll('common');
    assert.equal(game.state.stats.itemsAutoSalvaged || 0, before);
});

test('a prestige waits for the end of a Titan fight or a dungeon run, and wastes neither', () => {
    rng.setSource(seededRandom(10));
    const game = strong({ bestStage: 40, tokens: 20000 });
    game.state.prestige.runStartedAt = T0 - 3600 * 1000;
    game.state.combat.maxStage = 40;
    game.state.titan.readyAt = 0;
    assert.ok(game.canPrestige());
    assert.ok(game.challengeTitan());
    assert.equal(game.canPrestige(), false);
    assert.equal(game.prestigePreview().blockedBy, 'titan');
    assert.equal(game.prestige(), false);
    assert.equal(game.state.combat.mode, 'titan', 'the Titan fight goes on');
    tickUntil(game, () => game.state.combat.mode !== 'titan', 120000);
    assert.ok(game.canPrestige(), 'after the fight it may');
    game.enterDungeon('goblin_warren');
    assert.equal(game.prestige(), false);
    assert.equal(game.state.combat.mode, 'dungeon');
});
