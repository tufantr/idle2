// Dungeon tiers (the owner, 22 October 2026: "Dungeons end too early"): uniques as records once found, the Seal for the
// eight, and the next tier deeper (data/dungeons.js, systems/dungeon.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import {
    DUNGEONS, dungeonById, UNIQUES, DUNGEON_MILESTONES, FRAGMENTS_PER_UNIQUE, DUNGEON_TIER_CLEARS, DUNGEON_TIER_STAGES, SEAL_RECORDS,
    DUNGEON_RULES, DUNGEON_BOSS_TIME_MS, dungeonAt, dungeonTierInfo, dungeonBossTime, uniqueKey, parseUniqueKey, uniqueAt
} from '../src/data/dungeons.js';
import { dungeonEnemy, makeUnique, noteUnique, sealProgress, ownsUnique, foundUnique, dungeonTier } from '../src/systems/dungeon.js';
import { enemyBaseStats, supplyMult, abyssDropMult } from '../src/core/formulas.js';
import { zoneForStage } from '../src/data/zones.js';
import { recordsOf, collectModifiers } from '../src/core/modifiers.js';
import { migrateState } from '../src/core/state.js';
import { salvageItem } from '../src/systems/inventory.js';
import { evaluateDisclosures } from '../src/systems/disclosure.js';
import { xpForLevel } from '../src/core/xp.js';

rng.setSource(seededRandom(5));
const T0 = 1_700_000_000_000;

function newGame({ bestStage = 1, tokens = 0 } = {}) {
    const game = new Game(null, T0);
    game.state.combat.bestStage = bestStage;
    game.state.combat.maxStage = bestStage;
    game.state.prestige.tokens = tokens;
    game.state.settings.autoSalvage = 'off';
    game.state.bagUpgrades = 12;
    game.state.skills.combat.xp = xpForLevel(99);   // (to wear the deep uniques)
    game.recompute();
    return game;
}

/** Every dungeon at the tier's clears, and one of each unique of `tier` in the bag. */
function readyForSeal(game, tier = dungeonTier(game.state)) {
    const s = game.state;
    for (const d of DUNGEONS) {
        s.dungeons[d.id].clears = DUNGEON_TIER_CLEARS;
        s.inventory.push(makeUnique(s, d.unique, tier));
    }
}

test('a tier sets the dungeons 300 stages deeper, with a numeral, new hues and a rule in turn', () => {
    const hell = dungeonById('hellforge');
    assert.equal(dungeonAt(hell, 1).stage, hell.stage);
    const two = dungeonAt('hellforge', 2);
    assert.equal(two.name, 'The Hellforge II');
    assert.equal(two.stage, hell.stage + DUNGEON_TIER_STAGES);
    assert.equal(two.unlockStage, hell.unlockStage + DUNGEON_TIER_STAGES);
    assert.equal(two.chestTier, 7);
    assert.equal(dungeonAt('goblin_warren', 4).stage, 25 + 3 * DUNGEON_TIER_STAGES);
    assert.equal(dungeonTierInfo(1).rule, null);
    assert.equal(dungeonTierInfo(1).hue, 0);
    const rules = [2, 3, 4, 5, 6].map(t => dungeonTierInfo(t).rule.id);
    assert.deepEqual(rules, [...DUNGEON_RULES.map(r => r.id), DUNGEON_RULES[0].id], 'one rule a tier, in turn');
    assert.notEqual(dungeonTierInfo(2).hue, dungeonTierInfo(3).hue);
    assert.equal(dungeonBossTime(1), DUNGEON_BOSS_TIME_MS);
    assert.ok(DUNGEON_RULES.some(r => r.bossTime && dungeonBossTime(2 + DUNGEON_RULES.indexOf(r)) === r.bossTime));
});

test('a tier\'s monsters stand at its stages, by its rule', () => {
    const warren = dungeonById('goblin_warren');
    for (const tier of [2, 3, 4]) {
        const rule = dungeonTierInfo(tier).rule;
        const d = dungeonAt(warren, tier);
        const elite = dungeonEnemy({ id: warren.id, index: 0, tier });
        const stage = d.stage;
        assert.equal(elite.stage, stage);
        const plain = Math.floor(enemyBaseStats(stage).hp * 1.4 * supplyMult(stage));
        assert.ok(Math.abs(elite.hp - Math.floor(enemyBaseStats(stage).hp * 1.4 * supplyMult(stage) * (rule.hp || 1))) <= 1, `${rule.id} hp`);
        if (rule.hp) assert.ok(elite.hp > plain * 1.4);
        assert.equal(elite.interval, Math.round(enemyBaseStats(stage).interval * (rule.interval || 1)));
        const boss = dungeonEnemy({ id: warren.id, index: warren.monsters.length, tier });
        assert.equal(boss.boss, true);
        assert.equal(boss.timeLimit, dungeonBossTime(tier));
        assert.equal(boss.zoneName, d.name);
    }
    // a run from before the tiers is the first's
    assert.equal(dungeonEnemy({ id: warren.id, index: 0 }).stage, warren.stage);
});

test('a unique is a record once found, kept or not, once whatever its tier', () => {
    const game = newGame({ bestStage: 30 });
    const s = game.state;
    s.dungeons.goblin_warren.fragments = FRAGMENTS_PER_UNIQUE * 2;
    const crown = game.assembleUnique('goblin_warren');
    assert.ok(crown && crown.uniqueId === 'goblin_crown' && !crown.uniqueTier);
    assert.equal(recordsOf(s).uniques, 1);
    assert.ok(foundUnique(s, 'goblin_crown'));
    let ev = game.drainEvents().find(e => e.type === 'unique');
    assert.deepEqual([ev.fresh, ev.record], [true, true], 'the first find is a record');
    // a spare is no new record
    game.assembleUnique('goblin_warren');
    ev = game.drainEvents().find(e => e.type === 'unique');
    assert.deepEqual([ev.fresh, ev.record], [false, false]);
    assert.equal(recordsOf(s).uniques, 1);
    // salvaged, both copies: still a record, and the bag is free
    for (const item of s.inventory.filter(i => i.uniqueId)) { item.locked = false; salvageItem(game, item.id); }
    assert.equal(s.inventory.filter(i => i.uniqueId).length, 0);
    assert.equal(recordsOf(s).uniques, 1, 'found once, a record for good');
    // the same unique of the second tier is found too, but no second record: each of the eight counts once
    s.dungeonTier = 2;
    s.dungeons.goblin_warren.fragments = FRAGMENTS_PER_UNIQUE;
    game.assembleUnique('goblin_warren');
    ev = game.drainEvents().find(e => e.type === 'unique');
    assert.deepEqual([ev.fresh, ev.record], [true, false]);
    assert.ok(foundUnique(s, 'goblin_crown', 2));
    assert.equal(recordsOf(s).uniques, 1);
    s.uniques.crystal_heart = true;
    assert.equal(recordsOf(s).uniques, 2);
    assert.deepEqual(parseUniqueKey(uniqueKey('goblin_crown', 2)), { id: 'goblin_crown', tier: 2 });
    assert.equal(parseUniqueKey('goblin_crown@1'), null);
    assert.equal(parseUniqueKey('nothing@2'), null);
});

test('a unique past the first tier is Abyssal and as strong as its dungeon boss\'s depth drops, its bonuses its own', () => {
    const game = newGame({ bestStage: 700 });
    const s = game.state;
    const band = makeUnique(s, 'starless_band', 2);
    assert.equal(band.uniqueTier, 2);
    assert.equal(band.tier, 7);
    assert.equal(band.name, 'Starless Band II');
    const maw = dungeonById('abyssal_maw');
    const depth = zoneForStage(maw.stage + DUNGEON_TIER_STAGES + maw.monsters.length).depth;
    assert.equal(band.depth, depth);
    const first = makeUnique(s, 'starless_band', 1);
    const ratio = (band.atk + band.def) / (first.atk + first.def);
    assert.ok(Math.abs(ratio / abyssDropMult(depth) - 1) < 0.12, `about ×${abyssDropMult(depth).toExponential(2)}: ${ratio.toExponential(2)}`);
    assert.deepEqual(band.affixes.map(a => a.stat), UNIQUES.starless_band.affixes.map(a => a.stat));
    assert.equal(uniqueAt('goblin_crown', 3).name, "Goblin King's Crown III");
});

test('the Seal: every dungeon at its clears and the eight in hand; it takes them, opens the next tier, and counts', () => {
    const game = newGame({ bestStage: 300, tokens: 1000 });
    const s = game.state;
    assert.equal(game.sealDungeons(), false, 'not yet');
    assert.match(game.drainEvents().find(e => e.type === 'error').text, /clears/);
    readyForSeal(game);
    // one unique worn, the others in the bag; a spare of the worn one too
    const worn = s.inventory.find(i => i.uniqueId === 'void_aegis');
    game.equipItem(worn.id, 'Shield');
    assert.equal(s.equipped.Shield?.uniqueId, 'void_aegis');
    s.dungeons.goblin_warren.clears = DUNGEON_TIER_CLEARS - 1;
    assert.equal(sealProgress(s).ready, false);
    assert.equal(sealProgress(s).cleared, DUNGEONS.length - 1);
    s.dungeons.goblin_warren.clears = DUNGEON_TIER_CLEARS;
    s.dungeons.goblin_warren.fragments = 37;
    assert.deepEqual(sealProgress(s), { tier: 1, cleared: 8, held: 8, of: 8, ready: true });
    const recordsBefore = recordsOf(s).count;
    const atkBefore = collectModifiers(s).atkMult;
    game.drainEvents();
    assert.equal(game.sealDungeons(), true);
    const seal = game.drainEvents().find(e => e.type === 'dungeonSeal');
    assert.deepEqual([seal.tier, seal.next], [1, 2]);
    assert.equal(dungeonTier(s), 2);
    assert.equal(s.inventory.filter(i => i.uniqueId).length, 0, 'the eight are handed in');
    assert.equal(s.equipped.Shield, null, 'the worn one too, with no spare');
    for (const d of DUNGEONS) assert.deepEqual(s.dungeons[d.id], { clears: 0, fragments: 0 }, 'the clears and fragments start again');
    assert.equal(recordsOf(s).count, recordsBefore + SEAL_RECORDS, 'the uniques stay records; the Seal adds its own');
    assert.equal(recordsOf(s).seals, SEAL_RECORDS);
    // the sealed tier's milestones count in full, and the new tier's are earned again
    assert.ok(Math.abs(collectModifiers(s).atkMult - atkBefore) < 1e-9);
    s.dungeons.goblin_warren.clears = DUNGEON_MILESTONES[0].clears;
    assert.ok(Math.abs(collectModifiers(s).atkMult - atkBefore - DUNGEON_MILESTONES[0].mods.atkMult) < 1e-9);
    // the gates moved down: the warren of tier II waits for stage 320
    assert.equal(game.enterDungeon('goblin_warren'), false);
    s.combat.bestStage = 25 + DUNGEON_TIER_STAGES;
    assert.equal(game.enterDungeon('goblin_warren'), true);
    assert.equal(s.combat.dungeon.tier, 2);
    assert.equal(s.combat.enemy.stage, 25 + DUNGEON_TIER_STAGES);
    // the next Seal takes the second tier's uniques, not the first's
    s.combat.mode = 'stages'; s.combat.dungeon = null;
    for (const d of DUNGEONS) { s.dungeons[d.id].clears = DUNGEON_TIER_CLEARS; s.inventory.push(makeUnique(s, d.unique, 1)); }
    assert.equal(sealProgress(s).held, 0);
    assert.equal(game.sealDungeons(), false);
});

test('a spare in the bag goes before the piece worn; a run must end first', () => {
    const game = newGame({ bestStage: 300 });
    const s = game.state;
    readyForSeal(game);
    const worn = s.inventory.find(i => i.uniqueId === 'warlord_cleaver');
    game.equipItem(worn.id, 'Weapon');
    s.inventory.push(makeUnique(s, 'warlord_cleaver', 1));
    assert.equal(game.enterDungeon('goblin_warren'), true);
    assert.equal(game.sealDungeons(), false, 'mid-run');
    game.leaveDungeon();
    assert.equal(game.sealDungeons(), true);
    assert.equal(s.equipped.Weapon?.uniqueId, 'warlord_cleaver', 'the worn one stays');
});

test('a tier-two chest and fragments give the second tier\'s unique', () => {
    const game = newGame({ bestStage: 700, tokens: 50000 });
    const s = game.state;
    s.dungeonTier = 2;
    s.dungeons.goblin_warren.fragments = FRAGMENTS_PER_UNIQUE;
    const crown = game.assembleUnique('goblin_warren');
    assert.equal(crown.uniqueTier, 2);
    assert.equal(crown.name, "Goblin King's Crown II");
    assert.ok(ownsUnique(s, 'goblin_crown', 2));
    assert.equal(ownsUnique(s, 'goblin_crown', 1), false);
    assert.ok(foundUnique(s, 'goblin_crown', 2));
});

test('a save keeps the tier and the uniques found, reads them back from meta, and counts uniques carried before', () => {
    const game = newGame({ bestStage: 400 });
    const s = game.state;
    s.dungeonTier = 3;
    s.uniques = { goblin_crown: true, 'void_aegis@2': true };
    s.meta.dungeonTier = 3;
    s.meta.uniques = Object.keys(s.uniques);
    s.inventory.push(makeUnique(s, 'starless_band', 3));
    noteUnique(s, 'starless_band', 3);   // (as a find does)
    const back = migrateState(JSON.parse(JSON.stringify(s)), T0);
    assert.equal(back.dungeonTier, 3);
    assert.deepEqual(Object.keys(back.uniques).sort(), ['goblin_crown', 'starless_band@3', 'void_aegis@2']);
    assert.equal(back.inventory.find(i => i.uniqueId === 'starless_band').uniqueTier, 3);
    // a page running the older game dropped the tier and the found list, but kept meta
    const raw = JSON.parse(JSON.stringify(s));
    delete raw.dungeonTier; delete raw.uniques;
    raw.inventory = [];
    const kept = migrateState(raw, T0);
    assert.equal(kept.dungeonTier, 3);
    assert.ok(kept.uniques['void_aegis@2'] && kept.uniques.goblin_crown && kept.uniques['starless_band@3']);
    // a save from before: the uniques carried are found; nothing hand-made beyond the tier
    const old = JSON.parse(JSON.stringify(newGame().state));
    delete old.dungeonTier; delete old.uniques; delete old.meta.uniques; delete old.meta.dungeonTier;
    old.inventory = [{ id: 77, type: 'Head', tier: 2, uniqueId: 'goblin_crown', rarity: 'legendary', atk: 5, def: 5, affixes: [], source: 'unique' }];
    old.uniques = { 'hellforged_gauntlets@9': true };
    const before = migrateState(old, T0);
    assert.equal(before.dungeonTier, 1);
    assert.deepEqual(Object.keys(before.uniques), ['goblin_crown']);
    // a run saved mid-tier keeps its tier
    const g2 = newGame({ bestStage: 400 });
    g2.state.dungeonTier = 2;
    g2.enterDungeon('goblin_warren');
    const run = migrateState(JSON.parse(JSON.stringify(g2.state)), T0);
    assert.equal(run.combat.dungeon.tier, 2);
});

test('the Seal row opens once a dungeon has its tier\'s clears', () => {
    const game = newGame({ bestStage: 300 });
    const s = game.state;
    evaluateDisclosures(s);
    assert.ok(!s.seen.dungeon_seal);
    s.dungeons.crystal_depths.clears = DUNGEON_TIER_CLEARS;
    evaluateDisclosures(s);
    assert.ok(s.seen.dungeon_seal);
});
