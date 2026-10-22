// The jeweller's bench (systems/bench.js; the owner, October 2026: "do jewellery bench", and the next day, asked whether
// its levels being the piece's while the anvil's are the slot's was meant: they are the slot's now, as the anvil's).
// The jewellery the hero wears: its slot upgraded (+5% base stats a level to +10, then ×1.05 a level, no top) and the
// piece's bonuses rerolled, with gems of the slot's best tier and essence, for half the gems' Crafting XP and the gem's
// mastery; no gold.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { generateEquipment } from '../src/core/formulas.js';
import { RARITIES, GEAR_TIERS, JEWEL_POWER, MAX_UPGRADE, MAX_REFORGE_MULT } from '../src/data/items.js';
import { GEM_TIERS, benchGem, benchUpgradeCost, benchRerollCost, BENCH_LEVEL_PER_UPGRADE, BENCH_XP_SHARE, BENCH_SLOTS, FORGE_BAR_GROWTH, forgeMult } from '../src/data/workshop.js';
import { jewelKey } from '../src/data/mastery.js';
import { benchCost, benchLevel } from '../src/systems/bench.js';
import { salvagePreview } from '../src/systems/inventory.js';
import { evaluateDisclosures } from '../src/systems/disclosure.js';

const T0 = 1_760_000_000_000;
const rarity = id => RARITIES.find(r => r.id === id);
const jewel = (game, type, tier, rar = 'rare') => generateEquipment({ type, tier, power: GEAR_TIERS[tier - 1].power * JEWEL_POWER, gemName: GEAR_TIERS[tier - 1].jewel, source: 'drop', rarity: rarity(rar) }, game.state.idCounter++);

/** A jeweller at Crafting `level`, combat 99, with plenty of every gem and essence. */
function jeweller(level = 50) {
    rng.setSource(seededRandom(8));
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.crafting = true;
    s.skills.crafting.xp = xpForLevel(level);
    s.skills.combat.xp = xpForLevel(99);
    for (const g of GEM_TIERS) s.resources[g.gem] = 100_000;
    s.resources.essence = 1e7;
    game.recompute();
    return game;
}
const wear = (game, item, slot) => { game.state.inventory.push(item); assert.ok(game.equipItem(item.id, slot)); return item; };

test('the price: gems of the slot\'s best tier, half as many again each level to +10, the anvil\'s growth past it; the anvil\'s essence and Crafting levels; half the gems\' XP', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(t => benchGem(t).gem), ['amethyst', 'topaz', 'sapphire', 'emerald', 'ruby', 'diamond', 'diamond']);
    assert.deepEqual([1, 6, 7].map(t => benchGem(t).mult), [1, 1, 2], 'tier 7: twice the diamonds (no voidstone price)');
    assert.deepEqual(Array.from({ length: MAX_UPGRADE }, (_, i) => benchUpgradeCost('Ring', i, 1).gems), [1, 2, 3, 4, 6, 8, 12, 18, 26, 39]);
    assert.equal(benchUpgradeCost('Neck', 0, 1).gems, 2, 'an amulet twice');
    // past +10 the anvil's rules: ×FORGE_BAR_GROWTH the gems a level, a Crafting level a level up to 99, the XP the +10 level's
    const ten = benchUpgradeCost('Ring', MAX_UPGRADE - 1, 1);
    const eleven = benchUpgradeCost('Ring', MAX_UPGRADE, 1);
    assert.equal(eleven.gems, Math.ceil(Math.pow(1.5, MAX_UPGRADE - 1) * FORGE_BAR_GROWTH));
    assert.deepEqual([ten.level, eleven.level, benchUpgradeCost('Ring', 60, 1).level, benchUpgradeCost('Ring', 500, 1).level], [50, 51, 99, 99]);
    assert.equal(eleven.xp, ten.xp, 'past +10 the XP stays the +10 level\'s');
    for (let i = 0; i < MAX_UPGRADE; i++) {
        const c = benchUpgradeCost('Neck', i, 4);
        assert.equal(c.gem, 'emerald');
        assert.equal(c.essence, Math.ceil(2 * (i + 1) * 4), 'the anvil\'s essence');
        assert.equal(c.level, BENCH_LEVEL_PER_UPGRADE * (i + 1));
        assert.equal(c.xp, Math.round(BENCH_XP_SHARE * c.gems * GEM_TIERS.find(g => g.gem === 'emerald').xp), 'half the gems\' XP');
    }
    const reroll = n => benchRerollCost({ type: 'Neck', tier: 3, reforges: n });
    assert.equal(reroll(0).gems, 2);
    assert.equal(reroll(0).essence, 9);
    assert.equal(reroll(100).essence, 3 * 3 * MAX_REFORGE_MULT, 'capped');
});

test('an upgrade is the slot\'s: every amulet worn there has it, a better one keeps it, and it has no top', () => {
    const game = jeweller(60);
    const s = game.state;
    const amulet = wear(game, jewel(game, 'Neck', 3), 'Neck');
    const atk = game.derived.atk;
    const gold = s.gold;
    const cost = benchCost(s, amulet);
    assert.ok(cost.ok && cost.gem === 'sapphire', JSON.stringify(cost));
    assert.ok(game.upgradeJewel(amulet.id));
    assert.equal(benchLevel(s, 'Neck'), 1);
    assert.equal(amulet.upgrade, 0, 'not the piece\'s');
    assert.equal(s.meta.bench.Neck, 1, 'kept in meta too');
    assert.equal(s.resources.sapphire, 100_000 - cost.gems);
    assert.equal(s.gold, gold, 'no gold');
    assert.ok(s.mastery.crafting[jewelKey('sapphire')] > 0);
    assert.ok(game.derived.atk > atk);
    for (let i = 1; i < 20; i++) assert.ok(game.upgradeJewel(amulet.id), `+${i + 1}`);
    assert.equal(benchLevel(s, 'Neck'), 20, 'past +10: no top');
    // a better amulet in the slot: the slot's +20 is its at once, priced from now at its tier
    const better = jewel(game, 'Neck', 5, 'epic');
    s.inventory.push(better);
    game.equipItem(better.id, 'Neck');
    assert.equal(benchLevel(s, 'Neck'), 20);
    assert.equal(s.bench.Neck.tier, 5);
    assert.equal(benchCost(s, better).gem, 'ruby');
    const own = (better.atk || 0) * forgeMult(20);
    assert.ok(game.derived.atk >= own, 'its stats ×forgeMult(20)');
    // the old one, back in the bag, has nothing of the slot's
    assert.equal(amulet.upgrade, 0);
    assert.equal(game.upgradeJewel(amulet.id), false, 'in the bag: nothing to work');
});

test('a reroll is the piece\'s: new bonuses, a piece\'s worth of gems, rising essence; never a common\'s or a unique\'s', () => {
    const game = jeweller(20);
    const s = game.state;
    const ring = wear(game, jewel(game, 'Ring', 2, 'legendary'), 'Ring1');
    const before = JSON.stringify(ring.affixes);
    let changed = false;
    for (let i = 0; i < 5; i++) { assert.ok(game.rerollJewel(ring.id)); changed ||= JSON.stringify(ring.affixes) !== before; }
    assert.ok(changed, 'its bonuses rolled again');
    assert.equal(ring.affixes.length, 4);
    assert.equal(s.resources.topaz, 100_000 - 5);
    const common = wear(game, jewel(game, 'Ring', 2, 'common'), 'Ring2');
    assert.equal(benchCost(s, common, 'reroll').why, 'none');
    const unique = wear(game, Object.assign(jewel(game, 'Ear', 2, 'legendary'), { uniqueId: 'starless_band' }), 'Ear1');
    assert.equal(game.rerollJewel(unique.id), false);
});

test('it works only worn jewellery, waits on Crafting, says what is short; the gem\'s mastery takes gems off', () => {
    const game = jeweller(9);
    const s = game.state;
    const bagged = jewel(game, 'Ring', 1);
    s.inventory.push(bagged);
    assert.equal(game.upgradeJewel(bagged.id), false, 'in the bag: put it on first');
    const ring = wear(game, jewel(game, 'Ring', 1), 'Ring1');
    assert.ok(game.upgradeJewel(ring.id), '+1 at Crafting 5');
    assert.equal(benchCost(s, ring).why, 'level', '+2 waits for Crafting 10');
    s.skills.crafting.xp = xpForLevel(10);
    s.resources.amethyst = 0;
    assert.equal(benchCost(s, ring).why, 'short');
    const errors = game.drainEvents().filter(e => e.type === 'error').map(e => e.text);
    assert.ok(errors.some(t => /Put it on first/.test(t)), errors.join(' | '));
    const sword = wear(game, generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper', source: 'drop', rarity: rarity('rare') }, s.idCounter++), 'Weapon');
    assert.equal(game.upgradeJewel(sword.id), false, 'weapons and armour are the anvil\'s');
    // mastery
    const g2 = jeweller(60);
    const amulet = wear(g2, jewel(g2, 'Neck', 1), 'Neck');
    g2.state.bench.Neck.level = 9;
    const plain = benchCost(g2.state, amulet).gems;
    g2.state.mastery.crafting[jewelKey('amethyst')] = 1e7;
    assert.ok(benchCost(g2.state, amulet).gems < plain);
});

test('salvaging a piece gives nothing of the slot\'s work back: it stays with the slot', () => {
    const game = jeweller(50);
    const s = game.state;
    const amulet = wear(game, jewel(game, 'Neck', 5), 'Neck');
    for (let i = 0; i < 4; i++) game.upgradeJewel(amulet.id);
    game.unequipItem('Neck');
    assert.equal(salvagePreview(amulet).materials.ruby, undefined);
    assert.equal(benchLevel(s, 'Neck'), 4, 'the empty slot keeps its +4 for the next amulet');
});

test('a save from before: each piece\'s own levels go to the slots of its kind, worn to its slot, the bag\'s best to the lower; the bench opens', () => {
    const game = jeweller(30);
    const s = game.state;
    const worn = wear(game, jewel(game, 'Ring', 3), 'Ring1');
    const bagRing = jewel(game, 'Ring', 4);
    const bagEar = jewel(game, 'Ear', 2);
    s.inventory.push(bagRing, bagEar);
    const raw = JSON.parse(game.serialize(T0));
    const item = id => [...raw.inventory, ...Object.values(raw.equipped)].find(i => i?.id === id);
    item(worn.id).upgrade = 4;    // upgraded on the bench's first day, or with gold in the Inventory before it
    item(bagRing.id).upgrade = 6;
    item(bagEar.id).upgrade = 2;
    delete raw.bench; delete raw.meta.bench;
    const state = migrateState(raw, T0);
    assert.deepEqual(BENCH_SLOTS.map(slot => state.bench[slot].level), [0, 4, 6, 2, 0], 'Neck, Ring1 (the worn ring\'s), Ring2 (the bag\'s), Ear1, Ear2');
    assert.equal(state.bench.Ring2.tier, 4, 'priced at the bag ring\'s tier');
    for (const i of [...state.inventory, ...Object.values(state.equipped)].filter(Boolean)) assert.equal(i.upgrade, 0, `${i.name} came off plain`);
    // an older page that dropped `bench` but kept `meta`: read back
    const older = JSON.parse(JSON.stringify(raw));
    older.meta.bench = { Ring1: 7 };
    assert.equal(migrateState(older, T0).bench.Ring1.level, 7);
    // the bench opens at Crafting 5, or with a slot's levels
    const fresh = new Game(null, T0);
    evaluateDisclosures(fresh.state);
    assert.equal(!!fresh.state.seen.bench, false);
    fresh.state.bench.Ear2.level = 1;
    evaluateDisclosures(fresh.state);
    assert.equal(fresh.state.seen.bench, true);
});
