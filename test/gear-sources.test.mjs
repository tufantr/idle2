// Weapons and armour come from the fight (DESIGN §3.25): forging makes copper gear only, drops lean
// toward the place's own tier and the hero's empty slots, a pity count promises a piece after a dry
// run of bosses, and the smith's anvil reinforces and rerolls what the hero wears with bars.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { generateDrop, generateEquipment } from '../src/core/formulas.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { CRAFTING_TYPES, SMITHING_TYPES, PITY_MARKS, DROP_TYPE_WEIGHTS, RARITIES, GEAR_TIERS, MAX_UPGRADE } from '../src/data/items.js';
import { reinforceCost, rerollCost, salvageBars, ANVIL_REFUND, forgeMult, METALS } from '../src/data/workshop.js';
import { dropTypesFor, salvagePreview } from '../src/systems/inventory.js';
import { anvilCost, forgeLevel } from '../src/systems/anvil.js';
import { spawnEnemy } from '../src/systems/combat.js';
import { zoneForStage } from '../src/data/zones.js';

const T0 = 1_700_000_000_000;
/** A dropped piece of gear of a kind, tier and rarity (common unless `rarity` is given). */
const piece = (game, type, tier, { rarity = 'common', ...extra } = {}) => Object.assign(generateEquipment({
    type, tier, power: GEAR_TIERS[tier - 1].power, materialName: GEAR_TIERS[tier - 1].name, rarity: RARITIES.find(r => r.id === rarity), source: 'drop'
}, game.state.idCounter++), extra);

test('nothing is forged (the owner, October 2026); an old order to forge stops by itself', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(60);
    s.resources.iron_bar = 50;
    assert.equal(game.startSmithing, undefined, 'no forging to start');
    // a save from before, caught forging iron
    s.action = { kind: 'smith', type: 'Weapon', bar: 'iron_bar', progress: 0 };
    const loaded = new Game(migrateState(JSON.parse(game.serialize(T0)), T0), T0);
    loaded.tick(T0 + 1000);
    assert.equal(loaded.state.action, null);
    assert.equal(loaded.state.resources.iron_bar, 50, 'no bars lost');
});

test('drops are mostly of the place\'s own tier, and jewellery comes at every rarity', () => {
    rng.setSource(seededRandom(7));
    const tiers = { 2: 0, 3: 0, 4: 0 };
    const jewelRarities = new Set();
    let jewels = 0;
    for (let i = 0; i < 4000; i++) {
        const drop = generateDrop(3, i % 2 === 0, i);
        tiers[drop.tier]++;
        if (CRAFTING_TYPES.includes(drop.type)) { jewels++; jewelRarities.add(drop.rarity); }
    }
    assert.ok(tiers[3] / 4000 > 0.6 && tiers[2] / 4000 < 0.3 && tiers[4] / 4000 < 0.13, JSON.stringify(tiers));
    // its share of the table (rings, amulets, earrings), at every rarity
    const share = DROP_TYPE_WEIGHTS.filter(e => CRAFTING_TYPES.includes(e.type)).reduce((a, e) => a + e.weight, 0) / DROP_TYPE_WEIGHTS.reduce((a, e) => a + e.weight, 0);
    assert.ok(Math.abs(jewels / 4000 - share) < 0.03, `${jewels} pieces of jewellery in 4000`);
    for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary']) assert.ok(jewelRarities.has(r), `${r} jewellery drops`);
});

test('what drops leans toward the slots the hero lacks', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.equipped.Weapon = piece(game, 'Weapon', 3);
    s.equipped.Body = piece(game, 'Body', 2);
    const weights = Object.fromEntries(dropTypesFor(s, 3).map(e => [e.type, e.weight]));
    const base = Object.fromEntries(DROP_TYPE_WEIGHTS.map(e => [e.type, e.weight]));
    assert.equal(weights.Weapon, base.Weapon, 'a weapon of the place\'s tier: as it was');
    assert.equal(weights.Body, base.Body * 2, 'a body of a lower tier: twice');
    assert.equal(weights.Head, base.Head * 4, 'an empty head: four times');
    assert.equal(weights.Ring, base.Ring, 'an empty ring slot: its plain share (jewellery takes no tilt for an empty slot)');
    assert.equal(weights.Neck, base.Neck);
    rng.setSource(seededRandom(3));
    let heads = 0;
    let weapons = 0;
    for (let i = 0; i < 3000; i++) {
        const type = generateDrop(3, true, i, 0, dropTypesFor(s, 3)).type;
        if (type === 'Head') heads++;
        if (type === 'Weapon') weapons++;
    }
    assert.ok(heads > 2.5 * weapons, `${heads} helms against ${weapons} weapons`);
});

/** Beat the boss of `stage` as the run's frontier, with every die rolled at `roll` (0.9999 = no luck). */
function beatBoss(game, stage, roll) {
    const c = game.state.combat;
    Object.assign(c, { stage, maxStage: stage, bestStage: Math.max(c.bestStage, stage), mode: 'stages', farmMode: false, regroupLeft: 0 });
    rng.setSource(() => roll);
    spawnEnemy(game);
    assert.ok(c.enemy.boss);
    c.enemy.hp = 1;
    // rested and swinging first: the boss falls to the first blow (with lifesteal's ceiling a fall here would
    // not be won back, BASE.lifestealPerSecond)
    game.recompute();
    c.hp = game.derived.maxHp;
    c.playerTimer = game.derived.attackInterval;
    let now = game.now;
    const kills = game.state.stats.bossKills;
    while (game.state.stats.bossKills === kills) { now += 100; game.tick(now); }
    rng.setSource(seededRandom(1));
}

test('a dry run of bosses at the frontier ends in a sure piece for the weakest slot', () => {
    const game = new Game(null, T0);
    const s = game.state;
    game.enterCombat();
    s.stats.bossKills = s.stats.bossFalls = 5;   // past the first boss's armour
    for (const type of SMITHING_TYPES) s.equipped[type] = piece(game, type, 2, { rarity: 'legendary', upgrade: 10 });
    s.equipped.Gloves = piece(game, 'Gloves', 1);   // the weakest slot
    s.combat.pity = 0;
    for (let i = 1; i < PITY_MARKS; i++) {
        beatBoss(game, 30, 0.9999);   // the Glimmering Caves: tier 2 gear, the hero's frontier
        assert.equal(s.combat.pity, i);
    }
    const bag = s.inventory.length;
    beatBoss(game, 30, 0.9999);
    assert.equal(s.combat.pity, 0);
    const sure = s.inventory.at(-1);
    assert.equal(s.inventory.length, bag + 1);
    assert.equal(sure.type, 'Gloves');
    assert.equal(sure.tier, 2, 'of the place\'s own tier');
    assert.ok(game.drainEvents().some(e => e.type === 'itemDropped' && e.pity));
    // a place whose gear the hero has outgrown does not count
    s.equipped.Gloves = piece(game, 'Gloves', 3);
    for (const type of SMITHING_TYPES) s.equipped[type].tier = 3;
    beatBoss(game, 30, 0.9999);
    assert.equal(s.combat.pity, 0);
    // an upgrade wipes the marks
    s.combat.pity = 5;
    s.equipped.Weapon = null;
    beatBoss(game, 60, 0);   // every die at its lowest: a drop, the first kind (a weapon), into the empty hand
    assert.equal(s.inventory.at(-1).type, 'Weapon');
    assert.equal(s.combat.pity, 0);
    // the count survives a save and a prestige
    s.combat.pity = 3;
    const loaded = new Game(migrateState(JSON.parse(game.serialize(T0)), T0), T0);
    assert.equal(loaded.state.combat.pity, 3);
    assert.equal(migrateState({ ...JSON.parse(game.serialize(T0)), combat: { ...s.combat, enemy: null, pity: 99 } }, T0).combat.pity, PITY_MARKS - 1);
});

test('deep in the Abyss, a boss whose drops the hero has outgrown marks nothing', () => {
    const game = new Game(null, T0);
    const s = game.state;
    game.enterCombat();
    s.stats.bossKills = s.stats.bossFalls = 5;
    // gear from depth 18, re-climbing past depth 6 (both tier 7: only the depth tells them apart)
    for (const type of SMITHING_TYPES) s.equipped[type] = generateDrop(7, true, s.idCounter++, 18, [{ type, weight: 1 }], { tier: 7 });
    const shallow = Array.from({ length: 400 }, (_, i) => i + 1).find(st => st % 10 === 0 && zoneForStage(st).depth === 6);
    const deep = Array.from({ length: 400 }, (_, i) => i + 1).find(st => st % 10 === 0 && zoneForStage(st).depth === 19);
    s.combat.pity = 0;
    beatBoss(game, shallow, 0.9999);
    assert.equal(s.combat.pity, 0, 'a depth-6 boss cannot upgrade depth-18 gear');
    beatBoss(game, deep, 0.9999);
    assert.equal(s.combat.pity, 1, 'one past the hero\'s gear can');
});

test('the anvil reinforces with bars of the piece\'s metal and essence, for Smithing XP', () => {
    const game = new Game(null, T0);
    const s = game.state;
    const sword = piece(game, 'Weapon', 3, { rarity: 'rare' });
    s.equipped.Weapon = sword;
    s.resources.mithril_bar = 1000;
    s.resources.essence = 1000;
    s.skills.smithing.xp = xpForLevel(4);
    assert.equal(anvilCost(s, sword).why, 'level', 'the anvil opens at Smithing 5');
    assert.equal(game.reinforceItem(sword.id), false);
    s.skills.smithing.xp = xpForLevel(5);
    const xp = s.skills.smithing.xp;
    const cost = reinforceCost('Weapon', 0, 3);
    assert.equal(cost.bar, 'mithril_bar');
    assert.ok(game.reinforceItem(sword.id));
    assert.equal(s.forge.Weapon.level, 1, 'the slot is reinforced, not the piece');
    assert.equal(sword.upgrade, 0);
    assert.equal(s.resources.mithril_bar, 1000 - cost.bars);
    assert.equal(s.resources.essence, 1000 - cost.essence);
    assert.ok(s.skills.smithing.xp - xp >= cost.xp);
    // each step takes more bars, and higher steps more Smithing, up to 99
    for (let n = 1; n < 40; n++) assert.ok(reinforceCost('Weapon', n, 3).bars > reinforceCost('Weapon', n - 1, 3).bars);
    assert.equal(reinforceCost('Weapon', 1, 3).level, 10);
    assert.equal(reinforceCost('Weapon', 9, 3).level, 50);
    assert.equal(reinforceCost('Weapon', 10, 3).level, 51, 'past +10 a Smithing level a forge level');
    assert.equal(reinforceCost('Weapon', 30, 3).level, 71);
    assert.equal(reinforceCost('Weapon', 80, 3).level, 99);
    // the XP is the bars' up to +10, and stays the +10 level's past it while the price climbs (the owner, October 2026)
    for (let n = 0; n < MAX_UPGRADE; n++) assert.equal(reinforceCost('Body', n, 5).xp, reinforceCost('Body', n, 5).bars * METALS[4].xpPerBar);
    for (const n of [10, 20, 40, 80]) {
        assert.equal(reinforceCost('Body', n, 7).xp, reinforceCost('Body', MAX_UPGRADE - 1, 7).xp, `+${n + 1} pays what +10 did`);
        assert.ok(reinforceCost('Body', n, 7).bars > reinforceCost('Body', MAX_UPGRADE - 1, 7).bars);
    }
    s.skills.smithing.xp = xpForLevel(10);
    // Dragonbone and Abyssal gear takes runite, more of it
    assert.equal(reinforceCost('Weapon', 0, 7).bar, 'runite_bar');
    assert.equal(reinforceCost('Weapon', 0, 7).bars, 3 * reinforceCost('Weapon', 0, 5).bars);
    // rerolling its bonuses takes bars too, and no gold
    const gold = s.gold;
    const reroll = rerollCost(sword);
    assert.ok(game.rerollItem(sword.id));
    assert.equal(sword.reforges, 1);
    assert.equal(s.resources.mithril_bar, 1000 - cost.bars - reroll.bars);
    assert.equal(s.gold, gold);
    // the bench is jewellery's, the anvil weapons' and armour's
    assert.equal(game.upgradeJewel(sword.id), false);
    assert.equal(game.rerollJewel(sword.id), false);
    const ring = piece(game, 'Ring', 3, { rarity: 'epic' });
    s.equipped.Ring1 = ring;
    assert.equal(game.rerollItem(ring.id), false);
    s.skills.crafting.xp = xpForLevel(10);
    s.resources.sapphire = 10;
    assert.ok(game.upgradeJewel(ring.id));
    assert.equal(s.gold, gold, 'no gold');
});

test('salvaging a weapon or armour gives bars back: more for rarer pieces, and most of the reinforcing', () => {
    const game = new Game(null, T0);
    const common = piece(game, 'Body', 4, { rarity: 'common' });
    const legendary = piece(game, 'Body', 4, { rarity: 'legendary', barsIn: 100 });
    assert.deepEqual(salvageBars(common), { bar: 'adamant_bar', qty: 1 });
    assert.deepEqual(salvageBars(legendary), { bar: 'adamant_bar', qty: 5 + Math.floor(ANVIL_REFUND * 100) });
    assert.equal(salvageBars(piece(game, 'Ring', 4, { rarity: 'epic' })), null, 'jewellery gives essence only');
    const s = game.state;
    s.inventory.push(legendary);
    const before = s.resources.adamant_bar;
    game.salvageItem(legendary.id);
    assert.equal(s.resources.adamant_bar - before, salvagePreview(legendary).materials.adamant_bar);
});

test('old saves keep their gear: the best reinforced piece of a kind gives its levels to the slot', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.equipped.Weapon = piece(game, 'Weapon', 2, { upgrade: 4, barsIn: 30 });
    s.inventory.push(piece(game, 'Weapon', 2, { upgrade: 6, barsIn: 50 }), piece(game, 'Body', 3, { barsIn: 40 }), piece(game, 'Head', 3, { barsIn: -5 }), piece(game, 'Legs', 3, { barsIn: 'lots' }));
    const raw = JSON.parse(game.serialize(T0));
    delete raw.combat.pity;
    delete raw.forge;
    delete raw.meta.forge;
    const loaded = migrateState(raw, T0);
    assert.deepEqual(loaded.forge.Weapon, { level: 6, tier: 2 }, 'the best of the kind, worn or not');
    assert.equal(loaded.inventory[0].upgrade, 0);
    assert.equal(loaded.inventory[0].barsIn, undefined, 'its work is the slot\'s now');
    assert.deepEqual([loaded.equipped.Weapon.upgrade, loaded.equipped.Weapon.barsIn], [4, 30], 'the other keeps its own, to give its bars back');
    assert.deepEqual(loaded.inventory.slice(1).map(i => i.barsIn), [40, undefined, undefined]);
    assert.equal(loaded.combat.pity, 0);
    assert.ok(loaded.log.some(e => /belong to the slots/.test(e.text)));
    // loading it again moves nothing more, and the levels are kept in meta as well
    const again = migrateState(JSON.parse(JSON.stringify(loaded)), T0);
    assert.equal(again.forge.Weapon.level, 6);
    assert.equal(again.meta.forge.Weapon, 6);
    // a page still running the older game drops `forge`, which it doesn't know: the levels come back from meta
    const stale = JSON.parse(JSON.stringify(loaded));
    delete stale.forge;
    assert.equal(migrateState(stale, T0).forge.Weapon.level, 6);
});

test('the forge\'s levels belong to the slot: a new piece has them at once, and nothing is lost in a swap', async () => {
    const { findUpgrade, isUpgrade } = await import('../src/systems/inventory.js');
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = 1e9;   // can wear anything
    const sword = (id, tier, atk, extra = {}) => ({ id, type: 'Weapon', tier, name: `Sword ${id}`, rarity: 'common', atk, def: 0, affixes: [], upgrade: 0, ...extra });
    s.equipped.Weapon = sword(1, 5, 100);
    s.forge.Weapon = { level: 14, tier: 5 };
    game.recompute();
    const atk = game.derived.atk;
    s.inventory.push(sword(2, 6, 140));
    assert.ok(isUpgrade(s, s.inventory[0]), 'more base attack wins: both would have the slot\'s +14');
    assert.equal(findUpgrade(s)?.item.id, 2);
    game.drainEvents();
    assert.equal(game.equipItem(2), true);
    assert.ok(game.derived.atk > atk * 1.3, 'the new sword has the +14 at once');
    const equip = game.drainEvents().find(e => e.type === 'equip');
    assert.deepEqual([equip.forge, equip.firstForge], [14, true], 'the first such equip says how the forge works, once');
    assert.equal(s.forge.Weapon.tier, 6, 'the slot\'s price follows the best tier it has held');
    // swapping back and forth loses nothing
    assert.equal(game.equipItem(1), true);
    assert.equal(game.equipItem(2), true);
    assert.equal(s.forge.Weapon.level, 14);
    assert.equal(game.drainEvents().find(e => e.type === 'equip').firstForge, false);
    // past +10 each level is ×1.05; up to +10 as before (+5% of base a level)
    assert.ok(Math.abs(forgeMult(10) - 1.5) < 1e-12);
    assert.ok(Math.abs(forgeMult(14) - 1.5 * 1.05 ** 4) < 1e-12);
    assert.ok(Math.abs(forgeMult(3) - 1.15) < 1e-12);
    // a copper sword worn in the slot is priced at the slot's best tier: no cheap levels for an Abyssal one
    s.equipped.Weapon = sword(3, 1, 20);
    s.skills.smithing.xp = 1e9;
    assert.equal(anvilCost(s, s.equipped.Weapon).bar, 'runite_bar');
    // jewellery is upgraded piece by piece, as before
    const ring = { id: 9, type: 'Ring', tier: 5, name: 'Ring', rarity: 'common', atk: 10, def: 0, affixes: [], upgrade: 5 };
    s.equipped.Ring1 = ring;
    game.recompute();
    assert.equal(forgeLevel(s, 'Ring1'), 0);
});

