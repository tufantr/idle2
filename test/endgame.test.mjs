// Endgame: dungeons (runs, chests, failure, gear lock, milestones), unique items, the Titan and pets.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { DUNGEONS, dungeonById, FRAGMENTS_PER_UNIQUE, UNIQUES, TITAN_COOLDOWN_MS, TITAN_UNLOCK_STAGE, TITAN_TIME_MS, TITAN_BONUS, DUNGEON_MILESTONES, CHEST_ESSENCE_PER_TIER } from '../src/data/dungeons.js';
import { GEAR_TIERS } from '../src/data/items.js';
import { BALANCE, enemyForStage, goldForKill } from '../src/core/formulas.js';
import { killPayout, onEnemyDeath, spawnEnemy } from '../src/systems/combat.js';
import { describeOffline } from '../src/systems/offline.js';
import { PETS, petChance, PET_BASE } from '../src/data/pets.js';
import { generateEquipment } from '../src/core/formulas.js';
import { rollPet } from '../src/systems/progress.js';
import { collectModifiers } from '../src/core/modifiers.js';
import { xpForLevel } from '../src/core/xp.js';

rng.setSource(seededRandom(7));
const T0 = 1_700_000_000_000;
const warren = dungeonById('goblin_warren');

function newGame({ bestStage = 1, tokens = 0 } = {}) {
    const game = new Game(null, T0);
    game.state.combat.bestStage = bestStage;
    game.state.combat.maxStage = bestStage;
    game.state.prestige.tokens = tokens;
    game.state.settings.autoSalvage = 'off';
    game.recompute();
    return game;
}

/** Tick in 100 ms steps until `done()` or the time runs out. Returns the time advanced. */
function runUntil(game, done, maxMs = 10 * 60 * 1000) {
    let now = game.now;
    const end = now + maxMs;
    while (now < end && !done()) { now += 100; game.tick(now); }
    return now;
}

const events = (game, type) => game.drainEvents().filter(e => e.type === type);

test('dungeons open at their stage and a strong hero clears one for a chest and a fragment', () => {
    const game = newGame({ bestStage: 5, tokens: 20000 });
    assert.equal(game.enterDungeon(warren.id), false, 'locked below its unlock stage');
    assert.equal(events(game, 'error').length, 1);

    game.state.combat.bestStage = warren.unlockStage;
    assert.equal(game.enterDungeon(warren.id), true);
    const c = game.state.combat;
    assert.equal(c.mode, 'dungeon');
    assert.equal(c.active, true);
    assert.equal(c.enemy.elite, true);
    assert.equal(c.enemy.name, warren.monsters[0].name);

    const essenceBefore = game.state.resources.essence;
    runUntil(game, () => game.state.dungeons[warren.id].clears >= 1);
    const record = game.state.dungeons[warren.id];
    assert.equal(record.clears, 1);
    assert.ok(record.fragments >= 1);
    assert.equal(game.state.stats.dungeonClears, 1);
    assert.ok(game.state.resources.essence >= essenceBefore + Math.round(CHEST_ESSENCE_PER_TIER * warren.chestTier), 'the chest holds essence');
    assert.equal(events(game, 'dungeonClear').length, 1);
    // Repeat is on by default: the run starts again.
    assert.equal(c.mode, 'dungeon');
    assert.equal(c.dungeon.index, 0);

    // Over many clears the chest sometimes holds gear, and every clear holds a fragment.
    runUntil(game, () => record.clears >= 40, 60 * 60 * 1000);
    assert.equal(record.clears, 40);
    assert.ok(record.fragments >= 40);
    assert.ok(game.state.stats.itemsDropped >= 3, `gear from 40 chests: ${game.state.stats.itemsDropped}`);

    game.setDungeonRepeat(false);
    runUntil(game, () => record.clears >= 41);
    assert.equal(c.mode, 'stages', 'with repeat off the hero returns to the stage ladder');
    assert.equal(c.dungeon, null);
    assert.equal(c.active, true);
});

test('dying in a dungeon ends the run with nothing and returns to the stage ladder', () => {
    const game = newGame({ bestStage: 200 });
    const lair = dungeonById('dragons_lair');
    assert.equal(game.enterDungeon(lair.id), true);
    runUntil(game, () => game.state.combat.mode !== 'dungeon');
    const c = game.state.combat;
    assert.equal(c.mode, 'stages');
    assert.equal(c.dungeon, null);
    assert.equal(c.active, false);
    assert.equal(game.state.stats.deaths, 1);
    assert.equal(game.state.dungeons[lair.id].clears, 0);
    assert.equal(game.state.combat.stage, 1, 'a dungeon death does not move you on the ladder');
    assert.equal(events(game, 'dungeonFail').length, 1);
});

test('a dungeon boss that outlasts its timer fails the run, but combat carries on', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    game.enterDungeon(warren.id);
    const c = game.state.combat;
    c.dungeon.index = warren.monsters.length; // skip to the boss
    game.state.combat.enemy = null;
    game.tick(game.now + 100);
    assert.equal(c.enemy.boss, true);
    c.enemy.hp = c.enemy.maxHp = 1e15;
    runUntil(game, () => c.mode !== 'dungeon', 2 * 60 * 1000);
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, true, 'a timeout is not a death');
    const fails = events(game, 'dungeonFail');
    assert.equal(fails.length, 1);
    assert.match(fails[0].reason, /timer/);
});

test('gear is locked inside a dungeon; leaving abandons the run', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    const sword = generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper', source: 'drop' }, 9001);
    game.state.inventory.push(sword);
    game.enterDungeon(warren.id);
    assert.equal(game.equipItem(9001), false);
    assert.ok(game.drainEvents().some(e => e.type === 'error' && /locked/.test(e.text)));
    game.leaveDungeon();
    const c = game.state.combat;
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, false);
    assert.equal(game.equipItem(9001), true, 'gear can be changed again outside');
});

test('switching activities fails the current run cleanly; the Titan fight blocks dungeon entry', () => {
    const game = newGame({ bestStage: 60, tokens: 20000 });
    game.enterDungeon('goblin_warren');
    game.enterDungeon('crystal_depths');
    assert.equal(game.state.combat.dungeon.id, 'crystal_depths');
    assert.equal(events(game, 'dungeonFail').length, 1, 'the first run was abandoned');

    assert.equal(game.challengeTitan(), true);
    assert.equal(game.state.combat.mode, 'titan');
    assert.equal(events(game, 'dungeonFail').length, 1, 'facing the Titan abandons the run');
    assert.equal(game.enterDungeon('goblin_warren'), false);
    assert.equal(game.state.combat.mode, 'titan');
});

test('fragments assemble the unique; uniques are legendary, locked and cannot be reforged; spares are unlocked', () => {
    const game = newGame({ bestStage: 20 });
    const record = game.state.dungeons[warren.id];
    record.fragments = FRAGMENTS_PER_UNIQUE - 1;
    assert.equal(game.assembleUnique(warren.id), null);
    record.fragments = FRAGMENTS_PER_UNIQUE + 2;
    const item = game.assembleUnique(warren.id);
    assert.ok(item);
    assert.equal(item.uniqueId, warren.unique);
    assert.equal(item.name, UNIQUES[warren.unique].name);
    assert.equal(item.rarity, 'legendary');
    assert.equal(item.locked, true);
    assert.deepEqual(item.affixes.map(a => a.stat), UNIQUES[warren.unique].affixes.map(a => a.stat));
    assert.equal(record.fragments, 2);
    assert.equal(game.state.stats.uniquesFound, 1);
    assert.equal(game.state.stats.uniquesAssembled, 1);
    assert.ok(game.state.inventory.includes(item));

    game.state.resources.essence = 1e6;
    game.state.gold = 1e9;
    assert.equal(game.reforgeItem(item.id), false);
    assert.deepEqual(item.affixes.map(a => a.stat), UNIQUES[warren.unique].affixes.map(a => a.stat));

    // A second copy is a spare: unlocked, so the bag rules can salvage it for essence.
    record.fragments = FRAGMENTS_PER_UNIQUE;
    const spare = game.assembleUnique(warren.id);
    assert.equal(spare.locked, false);
    assert.equal(item.locked, true, 'the first copy stays protected');
    const essence = game.state.resources.essence;
    assert.ok(game.salvageItem(spare.id));
    assert.ok(game.state.resources.essence > essence);
});

test('dungeon clear milestones are permanent bonuses', () => {
    const game = newGame({ bestStage: 20 });
    const before = collectModifiers(game.state);
    game.state.dungeons[warren.id].clears = DUNGEON_MILESTONES[0].clears;
    const after = collectModifiers(game.state);
    assert.ok(Math.abs(after.atkMult - before.atkMult - DUNGEON_MILESTONES[0].mods.atkMult) < 1e-9);
    game.state.dungeons[warren.id].clears = DUNGEON_MILESTONES[DUNGEON_MILESTONES.length - 1].clears;
    const all = collectModifiers(game.state);
    assert.ok(all.goldMult > after.goldMult && all.hpMult > after.hpMult);
});

test('the Titan: unlock, hourly cooldown, a loss pays for damage dealt, a win is a permanent bonus', () => {
    const weak = newGame({ bestStage: TITAN_UNLOCK_STAGE - 1 });
    assert.equal(weak.titanReady(), false);
    assert.equal(weak.challengeTitan(), false);

    weak.state.combat.bestStage = TITAN_UNLOCK_STAGE;
    assert.equal(weak.titanReady(), true);
    assert.equal(weak.challengeTitan(), true);
    assert.equal(weak.state.combat.hp, weak.derived.maxHp, 'the race starts at full health');
    assert.equal(weak.state.titan.readyAt, T0 + TITAN_COOLDOWN_MS);
    runUntil(weak, () => weak.state.combat.mode !== 'titan', TITAN_TIME_MS + 5000);
    assert.equal(weak.state.titan.kills, 0);
    assert.equal(weak.state.combat.mode, 'stages');
    const [loss] = events(weak, 'titan');
    assert.equal(loss.won, false);
    assert.equal(weak.titanReady(), false, 'resting for an hour');
    weak.tick(T0 + TITAN_COOLDOWN_MS + 1);
    assert.equal(weak.titanReady(), true);

    const strong = newGame({ bestStage: 50, tokens: 20000 });
    const atkMultBefore = strong.mods.atkMult;
    const essence = strong.state.resources.essence;
    strong.challengeTitan();
    runUntil(strong, () => strong.state.combat.mode !== 'titan', TITAN_TIME_MS + 5000);
    assert.equal(strong.state.titan.kills, 1);
    assert.equal(strong.state.stats.titanKills, 1);
    assert.ok(strong.state.resources.essence >= essence + 8);
    assert.ok(strong.mods.atkMult - atkMultBefore >= TITAN_BONUS.atkMult - 1e-9);
    assert.equal(strong.state.combat.active, true, 'back on the stage ladder, still fighting');
});

test('a Titan fight never survives a reload; a dungeon run does', () => {
    const game = newGame({ bestStage: 50, tokens: 20000 });
    game.challengeTitan();
    const reloaded = new Game(JSON.parse(game.serialize()), game.now);
    assert.equal(reloaded.state.combat.mode, 'stages');

    const run = newGame({ bestStage: 50, tokens: 20000 });
    run.enterDungeon(warren.id);
    run.state.combat.dungeon.index = 3;
    const back = new Game(JSON.parse(run.serialize()), run.now);
    assert.equal(back.state.combat.mode, 'dungeon');
    assert.equal(back.state.combat.dungeon.index, 3);
    assert.equal(back.state.combat.enemy.name, warren.monsters[3].name);

    const broken = JSON.parse(run.serialize());
    broken.combat.dungeon = { id: 'no_such_place', index: 2 };
    broken.dungeons.goblin_warren = null;
    broken.titan = null;
    const fixed = new Game(broken, run.now);
    assert.equal(fixed.state.combat.mode, 'stages');
    assert.equal(fixed.state.combat.dungeon, null);
    assert.deepEqual(fixed.state.dungeons.goblin_warren, { clears: 0, fragments: 0 });
    assert.equal(fixed.state.titan.kills, 0);
});

test('pets: Melvor chance per action, found once, a permanent bonus that survives prestige', () => {
    assert.equal(petChance(3000, 99), 3 * 99 / PET_BASE);
    // The expected wait is the same whatever the action's speed.
    assert.ok(Math.abs(1 / petChance(1000, 50) * 1 - 1 / petChance(4000, 50) * 4) < 1e-6);

    const game = newGame({ bestStage: 30 });
    game.state.skills.mining.xp = xpForLevel(50);
    const speedBefore = collectModifiers(game.state).skillSpeed.mining;
    rng.setSource(() => 0);
    try {
        const pet = rollPet(game, 'mining', 3000);
        assert.equal(pet.id, 'pebble');
        assert.equal(rollPet(game, 'mining', 3000), null, 'each pet is found once');
    } finally {
        rng.setSource(seededRandom(8));
    }
    assert.equal(game.state.stats.petsFound, 1);
    assert.ok(Math.abs(collectModifiers(game.state).skillSpeed.mining - speedBefore - PETS[0].mods.skillSpeed.mining) < 1e-9);
    game.state.combat.maxStage = 30;
    assert.equal(game.prestige(), true);
    assert.equal(game.state.pets.pebble, true);
    game.tick(game.now + 100);
    assert.ok(game.state.achievements.pet_friend, 'finding a pet unlocks Best Friends');
});

test('every dungeon points at a unique; deeper dungeons are harder; uniques never skip a tier', () => {
    let lastStage = 0;
    for (const d of DUNGEONS) {
        const u = UNIQUES[d.unique];
        assert.ok(u, `${d.id} unique`);
        assert.ok(d.stage > lastStage && d.unlockStage <= d.stage);
        lastStage = d.stage;
        const tierPower = GEAR_TIERS.find(t => t.tier === u.tier).power;
        const nextPower = GEAR_TIERS.find(t => t.tier === u.tier + 1)?.power ?? Infinity;
        assert.ok(u.power >= tierPower && u.power * 1.4 < nextPower * 1.16, `${u.id} stays below a rare piece of the next tier`);
    }
});

test('a boss pays its bonus the first time it falls in a run; farming it afterwards pays by health', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    const c = game.state.combat;
    c.stage = 10; c.maxStage = 10;
    game.state.combat.enemy = null;
    game.enterCombat();
    const boss = c.enemy;
    assert.equal(boss.boss, true);
    assert.deepEqual(killPayout(game.state, boss), { full: true, rolls: 1 });
    c.farmMode = true;
    const farmed = killPayout(game.state, boss);
    assert.equal(farmed.full, false);
    assert.equal(farmed.rolls, Math.round(BALANCE.enemy.bossHpMult));
    c.farmMode = false;
    c.maxStage = 12; // already beaten this run
    assert.equal(killPayout(game.state, boss).full, false);

    // Farming the beaten boss: gold in proportion to its health, no boss bonus.
    const byHealth = Math.round(boss.maxHp * BALANCE.rewards.goldPerHp * game.derived.goldMult);
    let gold = game.state.gold;
    onEnemyDeath(game);
    assert.equal(game.state.gold - gold, byHealth);
    // Its first fall in a run pays the boss bonus on top.
    c.stage = 10; c.maxStage = 10;
    spawnEnemy(game);
    gold = game.state.gold;
    onEnemyDeath(game);
    assert.equal(game.state.gold - gold, goldForKill(boss, game.derived.goldMult));
    assert.ok(goldForKill(boss, game.derived.goldMult) > 2.5 * byHealth);
    assert.equal(c.stage, 11, 'and moves you on');
    assert.ok(enemyForStage(10).boss);
});

test('a dungeon run on repeat continues offline and the summary reports the clears', () => {
    const game = newGame({ bestStage: 40, tokens: 20000 });
    game.enterDungeon(warren.id);
    const json = game.serialize(T0);
    const later = T0 + 2 * 3600 * 1000;
    const back = new Game(JSON.parse(json), later);
    const summary = back.resumeFromSave(later);
    assert.equal(summary.mode, 'combat');
    const run = summary.dungeonClears.find(d => d.id === warren.id);
    assert.ok(run && run.clears > 20, `clears offline: ${run?.clears}`);
    assert.equal(back.state.combat.mode, 'dungeon', 'still in the run');
    const text = describeOffline(summary).join('\n');
    assert.match(text, /Goblin Warren clears \(\+\d+ fragments\)/);
    assert.doesNotMatch(text, /items made/);
});
