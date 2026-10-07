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
import { CRAFTING_TYPES, SMITHING_TYPES, PITY_MARKS, DROP_TYPE_WEIGHTS, RARITIES, GEAR_TIERS } from '../src/data/items.js';
import { reinforceCost, rerollCost, salvageBars, ANVIL_REFUND } from '../src/data/workshop.js';
import { dropTypesFor, salvagePreview } from '../src/systems/inventory.js';
import { anvilCost } from '../src/systems/anvil.js';
import { spawnEnemy } from '../src/systems/combat.js';

const T0 = 1_700_000_000_000;
/** A dropped piece of gear of a kind, tier and rarity (common unless `rarity` is given). */
const piece = (game, type, tier, { rarity = 'common', ...extra } = {}) => Object.assign(generateEquipment({
    type, tier, power: GEAR_TIERS[tier - 1].power, materialName: GEAR_TIERS[tier - 1].name, rarity: RARITIES.find(r => r.id === rarity), source: 'drop'
}, game.state.idCounter++), extra);

test('forging makes copper gear only; an old order for iron stops by itself', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(60);
    s.resources.iron_bar = 50;
    s.resources.copper_bar = 50;
    assert.equal(game.startSmithing('Weapon', 'iron_bar'), false);
    assert.equal(game.startSmithing('Weapon', 'copper_bar'), true);
    // a save from before, caught forging iron
    s.action = { kind: 'smith', type: 'Weapon', bar: 'iron_bar', progress: 0 };
    const loaded = new Game(migrateState(JSON.parse(game.serialize(T0)), T0), T0);
    loaded.tick(T0 + 1000);
    assert.equal(loaded.state.action, null);
    assert.equal(loaded.state.resources.iron_bar, 50, 'no bars lost');
});

test('drops are mostly of the place\'s own tier, and ordinary jewellery is left to Crafting', () => {
    rng.setSource(seededRandom(7));
    const tiers = { 2: 0, 3: 0, 4: 0 };
    let jewels = 0;
    for (let i = 0; i < 4000; i++) {
        const drop = generateDrop(3, i % 2 === 0, i);
        tiers[drop.tier]++;
        if (CRAFTING_TYPES.includes(drop.type)) {
            jewels++;
            assert.ok(RARITIES.findIndex(r => r.id === drop.rarity) >= 3, `a ${drop.rarity} ${drop.type} dropped`);
        }
    }
    assert.ok(tiers[3] / 4000 > 0.6 && tiers[2] / 4000 < 0.3 && tiers[4] / 4000 < 0.13, JSON.stringify(tiers));
    assert.ok(jewels > 0, 'epic and legendary jewellery still drops');
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
    let now = game.now;
    const kills = game.state.stats.bossKills;
    while (game.state.stats.bossKills === kills) { now += 100; game.tick(now); }
    rng.setSource(seededRandom(1));
}

test('a dry run of bosses at the frontier ends in a sure piece for the weakest slot', () => {
    const game = new Game(null, T0);
    const s = game.state;
    game.enterCombat();
    s.stats.bossKills = 5;   // past the first boss's armour
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
    const cost = reinforceCost(sword);
    assert.equal(cost.bar, 'mithril_bar');
    assert.ok(game.reinforceItem(sword.id));
    assert.equal(sword.upgrade, 1);
    assert.equal(sword.barsIn, cost.bars);
    assert.equal(s.resources.mithril_bar, 1000 - cost.bars);
    assert.equal(s.resources.essence, 1000 - cost.essence);
    assert.ok(s.skills.smithing.xp - xp >= cost.xp);
    // each step takes more bars, and higher steps more Smithing
    for (let n = 1; n < 10; n++) assert.ok(reinforceCost({ ...sword, upgrade: n }).bars > reinforceCost({ ...sword, upgrade: n - 1 }).bars);
    assert.equal(reinforceCost({ ...sword, upgrade: 1 }).level, 10);
    assert.equal(reinforceCost({ ...sword, upgrade: 9 }).level, 50);
    s.skills.smithing.xp = xpForLevel(10);
    // Dragonbone and Abyssal gear takes runite, more of it
    assert.equal(reinforceCost({ type: 'Weapon', tier: 7, upgrade: 0 }).bar, 'runite_bar');
    assert.equal(reinforceCost({ type: 'Weapon', tier: 7, upgrade: 0 }).bars, 3 * reinforceCost({ type: 'Weapon', tier: 5, upgrade: 0 }).bars);
    // rerolling its bonuses takes bars too, and no gold
    const gold = s.gold;
    const reroll = rerollCost(sword);
    assert.ok(game.rerollItem(sword.id));
    assert.equal(sword.reforges, 1);
    assert.equal(s.resources.mithril_bar, 1000 - cost.bars - reroll.bars);
    assert.equal(s.gold, gold);
    // the old essence-and-gold upgrade is for jewellery only
    assert.equal(game.upgradeItem(sword.id), false);
    assert.equal(game.reforgeItem(sword.id), false);
    const ring = piece(game, 'Ring', 3, { rarity: 'epic' });
    s.equipped.Ring1 = ring;
    s.gold = 1e9;
    assert.ok(game.upgradeItem(ring.id));
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

test('old saves keep their gear; bars spent at the anvil are cleaned and kept', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.equipped.Weapon = piece(game, 'Weapon', 2, { upgrade: 4 });
    s.inventory.push(piece(game, 'Body', 3, { barsIn: 40 }), piece(game, 'Head', 3, { barsIn: -5 }), piece(game, 'Legs', 3, { barsIn: 'lots' }));
    const raw = JSON.parse(game.serialize(T0));
    delete raw.combat.pity;
    const loaded = migrateState(raw, T0);
    assert.equal(loaded.equipped.Weapon.upgrade, 4);
    assert.equal(loaded.equipped.Weapon.barsIn, undefined);
    assert.deepEqual(loaded.inventory.map(i => i.barsIn), [40, undefined, undefined]);
    assert.equal(loaded.combat.pity, 0);
});
