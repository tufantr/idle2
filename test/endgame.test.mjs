// Endgame: dungeons (runs, chests, failure, gear lock, milestones), unique items, the Titan and pets.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { DUNGEONS, dungeonById, FRAGMENTS_PER_UNIQUE, UNIQUES, TITAN_COOLDOWN_MS, TITAN_UNLOCK_STAGE, TITAN_TIME_MS, TITAN_BONUS, DUNGEON_MILESTONES, CHEST_ESSENCE_PER_TIER, DUNGEON_CHOICE_MS } from '../src/data/dungeons.js';
import { migrateState } from '../src/core/state.js';
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
    const first = game.drainEvents();
    assert.equal(first.filter(e => e.type === 'dungeonClear').length, 1);
    // The first clear of a visit: the hero waits at the open chest while the player chooses.
    assert.equal(first.filter(e => e.type === 'dungeonChoice').length, 1);
    assert.equal(c.mode, 'dungeon');
    assert.ok(c.dungeon.choiceLeft > 0);
    assert.equal(c.enemy, null, 'no monster while waiting');
    assert.equal(game.clickAttack(), false, 'nothing to strike');

    // Keep going: the run starts again, and runs on without asking again.
    assert.ok(game.dungeonKeepGoing());
    assert.equal(c.dungeon.index, 0);
    assert.equal(c.dungeon.choiceLeft, 0);
    assert.ok(c.enemy);
    runUntil(game, () => record.clears >= 40, 60 * 60 * 1000);
    assert.equal(record.clears, 40);
    assert.ok(record.fragments >= 40);
    assert.ok(game.state.stats.itemsDropped >= 3, `gear from 40 chests: ${game.state.stats.itemsDropped}`);
    assert.equal(game.drainEvents().filter(e => e.type === 'dungeonChoice').length, 0, 'asked once a visit');
});

test('after the first clear: end the dungeon, back to the stages fighting on; or no answer keeps going', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    game.state.combat.stage = 14;
    game.enterDungeon(warren.id);
    const c = game.state.combat;
    runUntil(game, () => c.dungeon?.choiceLeft > 0);
    assert.equal(game.dungeonEnd(), true);
    assert.equal(c.mode, 'stages');
    assert.equal(c.dungeon, null);
    assert.equal(c.active, true, 'fighting on');
    assert.equal(c.stage, 14, 'where the hero was');
    assert.equal(game.drainEvents().filter(e => e.type === 'dungeonFail').length, 0, 'ending a won dungeon is no failure');
    assert.equal(game.dungeonEnd(), false, 'nothing to end now');

    // the next visit asks again; with no answer for 30 s the hero keeps going
    game.enterDungeon(warren.id);
    runUntil(game, () => c.dungeon?.choiceLeft > 0);
    const clears = game.state.dungeons[warren.id].clears;
    game.drainEvents();
    runUntil(game, () => !(c.dungeon?.choiceLeft > 0), DUNGEON_CHOICE_MS + 1000);
    assert.equal(c.mode, 'dungeon');
    assert.equal(c.dungeon.repeat, true);
    assert.deepEqual(game.drainEvents().filter(e => e.type === 'dungeonChosen').map(e => [e.keep, e.auto]), [[true, true]]);
    runUntil(game, () => game.state.dungeons[warren.id].clears > clears);
    assert.equal(c.mode, 'dungeon', 'and runs on');
});

test('leaving while waiting at the chest ends the dungeon without a failure; a save keeps the wait', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    game.enterDungeon(warren.id);
    const c = game.state.combat;
    runUntil(game, () => c.dungeon?.choiceLeft > 0);
    const saved = JSON.parse(game.serialize(T0));
    const loaded = migrateState(saved, T0);
    assert.ok(loaded.combat.dungeon.choiceLeft > 0, 'still waiting after a reload');
    assert.equal(loaded.combat.enemy, null);
    assert.equal(loaded.combat.dungeon.index, warren.monsters.length + 1);
    saved.combat.autoRepeat = false;                // the old switch, from before the choice
    assert.equal(migrateState(saved, T0).combat.autoRepeat, undefined);

    game.drainEvents();
    game.toggleCombat();                            // Retreat, while waiting
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, false);
    const ev = game.drainEvents();
    assert.equal(ev.filter(e => e.type === 'dungeonFail').length, 0);
    assert.equal(ev.filter(e => e.type === 'dungeonChosen' && !e.keep).length, 1);
});

test('a clear tells what the chest held, and the 25th clear brings its lasting bonus', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    const record = game.state.dungeons[warren.id];
    record.clears = DUNGEON_MILESTONES[0].clears - 1;
    game.enterDungeon(warren.id);
    game.drainEvents();
    const before = { ...game.state.resources };
    runUntil(game, () => record.clears >= DUNGEON_MILESTONES[0].clears);
    const all = game.drainEvents();
    const clear = all.find(e => e.type === 'dungeonClear');
    assert.ok(clear.loot.fragments >= 1);
    assert.ok(clear.loot.essence > 0 && game.state.resources.essence - before.essence >= clear.loot.essence, 'the elites drop some too');
    for (const [id, qty] of Object.entries(clear.loot.materials)) assert.ok(qty > 0 && game.state.resources[id] >= before[id] + qty, id);
    const milestones = all.filter(e => e.type === 'dungeonMilestone');
    assert.equal(milestones.length, 1);
    assert.deepEqual(milestones[0], { type: 'dungeonMilestone', dungeon: warren.id, clears: DUNGEON_MILESTONES[0].clears, desc: DUNGEON_MILESTONES[0].desc });
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
    const fails = events(game, 'dungeonFail');
    assert.equal(fails.length, 1);
    assert.equal(fails[0].lost, true, 'a fall loses the run');
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
    assert.equal(fails[0].lost, true, 'so does the timer');
});

test('gear is locked inside a dungeon; leaving abandons the run', () => {
    const game = newGame({ bestStage: 20, tokens: 20000 });
    const sword = generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper', source: 'drop' }, 9001);
    game.state.inventory.push(sword);
    game.enterDungeon(warren.id);
    assert.equal(game.equipItem(9001), false);
    assert.ok(game.drainEvents().some(e => e.type === 'error' && /locked/.test(e.text)));
    game.drainEvents();
    game.leaveDungeon();
    const c = game.state.combat;
    assert.equal(game.drainEvents().find(e => e.type === 'dungeonFail')?.lost, false, 'leaving is not a loss to report');
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

test("the map's Travel leaves a dungeon run for the ladder, but waits for the Titan", () => {
    const game = newGame({ bestStage: 60, tokens: 20000 });
    game.state.combat.stage = 12;
    game.enterDungeon('goblin_warren');
    assert.equal(game.travel(41), true);
    const c = game.state.combat;
    assert.equal(c.mode, 'stages');
    assert.equal(c.dungeon, null);
    assert.equal(c.stage, 41);
    assert.equal(c.enemy.stage, 41);
    assert.equal(c.active, true, 'still fighting, now on the ladder');
    assert.equal(events(game, 'dungeonFail').length, 1, 'the run was given up');

    assert.equal(game.travel(500), true);
    assert.equal(c.stage, 60, 'no further than reached this run');

    game.challengeTitan();
    game.drainEvents();
    assert.equal(game.travel(5), false);
    assert.equal(c.mode, 'titan');
    assert.equal(c.stage, 60);
    assert.equal(events(game, 'error').length, 1);
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
    game.state.prestige.runStartedAt = 0;
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

test('deep in the Abyss, drops keep getting stronger with depth', async () => {
    const { abyssDropMult, generateDrop, BALANCE } = await import('../src/core/formulas.js');
    const { itemScore } = await import('../src/systems/inventory.js');
    const from = BALANCE.abyss.dropScalingFrom;
    assert.equal(abyssDropMult(0), 1);
    assert.equal(abyssDropMult(from), 1);
    assert.ok(Math.abs(abyssDropMult(from + 3) - BALANCE.abyss.dropGrowth ** 3) < 1e-9);
    // Same luck, deeper depth: a stronger item that remembers where it came from.
    rng.setSource(seededRandom(11));
    const shallow = generateDrop(7, true, 1, from);
    rng.setSource(seededRandom(11));
    const deep = generateDrop(7, true, 2, from + 4);
    assert.equal(shallow.depth, undefined);
    assert.equal(deep.depth, from + 4);
    assert.equal(deep.type, shallow.type);
    assert.ok(itemScore(deep) > 5 * itemScore(shallow), `${itemScore(deep)} vs ${itemScore(shallow)}`);
});

test('the pet at the hero\'s side: the one picked, among those found; else Fang, else the first found', async () => {
    const { companionPet } = await import('../src/data/pets.js');
    const { migrateState } = await import('../src/core/state.js');
    const game = newGame();
    assert.equal(companionPet(game.state), '');
    game.state.pets.pebble = true;
    assert.equal(companionPet(game.state), 'pebble');
    game.state.pets.fang = true;
    assert.equal(companionPet(game.state), 'fang', 'Fang, the fighting pet, by default');
    assert.equal(game.setCompanion('ember'), false, 'not a pet not found');
    assert.ok(game.setCompanion('pebble'));
    assert.equal(companionPet(game.state), 'pebble');
    const saved = JSON.parse(game.serialize(T0));
    assert.equal(migrateState(saved, T0).hero.pet, 'pebble');
    saved.hero.pet = 'ember';
    assert.equal(migrateState(saved, T0).hero.pet, '', 'a pet not found is not kept');
    assert.ok(game.setCompanion(''));
    assert.equal(companionPet(game.state), 'fang');
});
