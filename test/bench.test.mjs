// The jeweller's bench (systems/bench.js; the owner, October 2026: "do jewellery bench"): the jewellery the hero wears,
// upgraded (+5% base stats a level, to +10) and its bonuses rerolled with gems of its tier and essence, for Crafting XP
// and the gem's mastery; no gold. What it took comes back in part on salvage.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { generateEquipment } from '../src/core/formulas.js';
import { RARITIES, GEAR_TIERS, JEWEL_POWER, MAX_UPGRADE, MAX_REFORGE_MULT } from '../src/data/items.js';
import { GEM_TIERS, benchGem, benchUpgradeCost, benchRerollCost, BENCH_LEVEL_PER_UPGRADE, BENCH_XP_SHARE, ANVIL_REFUND } from '../src/data/workshop.js';
import { jewelKey } from '../src/data/mastery.js';
import { benchCost } from '../src/systems/bench.js';
import { salvagePreview } from '../src/systems/inventory.js';
import { evaluateDisclosures } from '../src/systems/disclosure.js';

const T0 = 1_760_000_000_000;
const rarity = id => RARITIES.find(r => r.id === id);
const jewel = (game, type, tier, rar = 'rare') => generateEquipment({ type, tier, power: GEAR_TIERS[tier - 1].power * JEWEL_POWER, gemName: GEAR_TIERS[tier - 1].jewel, source: 'drop', rarity: rarity(rar) }, game.state.idCounter++);

/** A jeweller at Crafting `level`, combat 99, wearing `item` in `slot`, with plenty of every gem and essence. */
function jeweller(level = 50) {
    rng.setSource(seededRandom(8));
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.crafting = true;
    s.skills.crafting.xp = xpForLevel(level);
    s.skills.combat.xp = xpForLevel(99);
    for (const g of GEM_TIERS) s.resources[g.gem] = 10_000;
    s.resources.essence = 1e6;
    game.recompute();
    return game;
}
const wear = (game, item, slot) => { game.state.equipped[slot] = item; game.recompute(); return item; };

test('the price: gems of the piece\'s tier, half as many again each level, an amulet twice; the anvil\'s essence; 5 Crafting a level; half the gems\' XP', () => {
    assert.equal(BENCH_XP_SHARE, 0.5);
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(t => benchGem(t).gem), ['amethyst', 'topaz', 'sapphire', 'emerald', 'ruby', 'diamond', 'diamond']);
    assert.deepEqual([1, 6, 7].map(t => benchGem(t).mult), [1, 1, 2], 'tier 7: twice the diamonds (no voidstone price)');
    const ring = Array.from({ length: MAX_UPGRADE }, (_, i) => benchUpgradeCost('Ring', i, 1).gems);
    assert.deepEqual(ring, [1, 2, 3, 4, 6, 8, 12, 18, 26, 39]);
    assert.deepEqual(Array.from({ length: MAX_UPGRADE }, (_, i) => benchUpgradeCost('Ear', i, 1).gems), ring, 'an earring as a ring');
    assert.equal(benchUpgradeCost('Neck', 0, 1).gems, 2);
    for (let i = 0; i < MAX_UPGRADE; i++) {
        const c = benchUpgradeCost('Neck', i, 4);
        assert.equal(c.gem, 'emerald');
        assert.equal(c.essence, Math.ceil(2 * (i + 1) * 4), 'the anvil\'s essence');
        assert.equal(c.level, BENCH_LEVEL_PER_UPGRADE * (i + 1));
        assert.equal(c.xp, Math.round(BENCH_XP_SHARE * c.gems * GEM_TIERS.find(g => g.gem === 'emerald').xp), 'half the gems\' XP');
    }
    assert.equal(benchUpgradeCost('Ring', 0, 7).gems, 2 * benchUpgradeCost('Ring', 0, 6).gems);
    const reroll = n => benchRerollCost({ type: 'Neck', tier: 3, reforges: n });
    assert.equal(reroll(0).gems, 2);
    assert.equal(reroll(0).essence, 9);
    assert.ok(reroll(1).essence > reroll(0).essence);
    assert.equal(reroll(100).essence, 3 * 3 * MAX_REFORGE_MULT, 'capped');
});

test('an upgrade: the worn piece +1, its gems and essence spent, no gold, Crafting XP, the gem\'s mastery; the hero stronger', () => {
    const game = jeweller(50);
    const s = game.state;
    const amulet = wear(game, jewel(game, 'Neck', 3), 'Neck');
    const atk = game.derived.atk;
    const gold = s.gold;
    const xp = s.skills.crafting.xp;
    const cost = benchCost(s, amulet);
    assert.ok(cost.ok && cost.gem === 'sapphire', JSON.stringify(cost));
    assert.ok(game.upgradeJewel(amulet.id));
    assert.equal(amulet.upgrade, 1);
    assert.equal(s.resources.sapphire, 10_000 - cost.gems);
    assert.equal(s.resources.essence, 1e6 - cost.essence);
    assert.equal(s.gold, gold);
    assert.ok(s.skills.crafting.xp > xp);
    assert.ok(s.mastery.crafting[jewelKey('sapphire')] > 0);
    assert.equal(amulet.gemsIn, cost.gems);
    assert.ok(game.derived.atk > atk, `${game.derived.atk} > ${atk}`);
    assert.equal(s.stats.jewelsUpgraded, 1);
    for (let i = 1; i < MAX_UPGRADE; i++) assert.ok(game.upgradeJewel(amulet.id), `+${i + 1}`);
    assert.equal(amulet.upgrade, MAX_UPGRADE);
    assert.equal(benchCost(s, amulet).why, 'max');
    assert.equal(game.upgradeJewel(amulet.id), false);
});

test('a reroll: new bonuses, a piece\'s worth of gems, rising essence; never a common\'s or a unique\'s', () => {
    const game = jeweller(20);
    const s = game.state;
    const ring = wear(game, jewel(game, 'Ring', 2, 'legendary'), 'Ring1');
    const before = JSON.stringify(ring.affixes);
    let changed = false;
    for (let i = 0; i < 5; i++) { assert.ok(game.rerollJewel(ring.id)); changed ||= JSON.stringify(ring.affixes) !== before; }
    assert.ok(changed, 'its bonuses rolled again');
    assert.equal(ring.affixes.length, 4, 'as many as its rarity has');
    assert.equal(ring.reforges, 5);
    assert.equal(s.resources.topaz, 10_000 - 5);
    const common = wear(game, jewel(game, 'Ring', 2, 'common'), 'Ring2');
    assert.equal(benchCost(s, common, 'reroll').why, 'none');
    assert.equal(game.rerollJewel(common.id), false);
    const unique = wear(game, Object.assign(jewel(game, 'Ear', 2, 'legendary'), { uniqueId: 'starless_band' }), 'Ear1');
    assert.equal(game.rerollJewel(unique.id), false);
});

test('it works only worn jewellery, waits on Crafting, and says what is short', () => {
    const game = jeweller(9);
    const s = game.state;
    const bagged = jewel(game, 'Ring', 1);
    s.inventory.push(bagged);
    assert.equal(game.upgradeJewel(bagged.id), false, 'in the bag: put it on first');
    const ring = wear(game, jewel(game, 'Ring', 1), 'Ring1');
    assert.ok(game.upgradeJewel(ring.id), '+1 at Crafting 5');
    assert.equal(benchCost(s, ring).why, 'level', '+2 waits for Crafting 10');
    assert.equal(benchCost(s, ring).level, 10);
    s.skills.crafting.xp = xpForLevel(10);
    s.resources.amethyst = 0;
    assert.equal(benchCost(s, ring).why, 'short');
    assert.equal(game.upgradeJewel(ring.id), false);
    const events = game.drainEvents().filter(e => e.type === 'error').map(e => e.text);
    assert.ok(events.some(t => /Put it on first/.test(t)) && events.some(t => /2 Amethyst and \d+ essence/.test(t)), events.join(' | '));
    const sword = wear(game, generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper', source: 'drop', rarity: rarity('rare') }, s.idCounter++), 'Weapon');
    assert.equal(game.upgradeJewel(sword.id), false, 'weapons and armour are the anvil\'s');
});

test('the gem\'s mastery takes gems off the price', () => {
    const game = jeweller(50);
    const s = game.state;
    const amulet = wear(game, jewel(game, 'Neck', 1), 'Neck');
    amulet.upgrade = 9;
    const plain = benchCost(s, amulet).gems;
    s.mastery.crafting[jewelKey('amethyst')] = 1e6;   // mastery 99
    const mastered = benchCost(s, amulet).gems;
    assert.ok(mastered < plain, `${mastered} < ${plain}`);
});

test('salvaged, a piece gives back three quarters of the gems the bench put in, and half the essence', () => {
    const game = jeweller(50);
    const amulet = wear(game, jewel(game, 'Neck', 5), 'Neck');
    for (let i = 0; i < 4; i++) game.upgradeJewel(amulet.id);
    const preview = salvagePreview(amulet);
    assert.equal(preview.materials.ruby, Math.floor(ANVIL_REFUND * amulet.gemsIn));
    assert.ok(preview.essence >= Math.floor(0.5 * 5 * 4 * 5), `${preview.essence} essence`);
});

test('a save from before the bench keeps its jewellery\'s upgrades, and the bench goes on from them; it opens at Crafting 5', () => {
    const game = jeweller(30);
    const old = wear(game, jewel(game, 'Ring', 3), 'Ring1');
    old.upgrade = 4;   // bought with gold and essence in the Inventory
    const raw = JSON.parse(game.serialize(T0));
    raw.equipped.Ring1.gemsIn = 'lots';   // nonsense in a save is dropped
    const state = migrateState(raw, T0);
    assert.equal(state.equipped.Ring1.upgrade, 4);
    assert.equal(state.equipped.Ring1.gemsIn, undefined);
    const again = new Game(state, T0);
    again.recompute();
    assert.equal(benchCost(again.state, again.state.equipped.Ring1).level, 25, '+5 waits for Crafting 25');
    // the bench opens at Crafting 5, or for a piece upgraded before it
    const fresh = new Game(null, T0);
    evaluateDisclosures(fresh.state);
    assert.equal(!!fresh.state.seen.bench, false);
    fresh.state.skills.crafting.xp = xpForLevel(5);
    evaluateDisclosures(fresh.state);
    assert.equal(fresh.state.seen.bench, true);
    const upgraded = new Game(null, T0);
    upgraded.state.inventory.push(Object.assign(jewel(upgraded, 'Ear', 1), { upgrade: 2 }));
    evaluateDisclosures(upgraded.state);
    assert.equal(upgraded.state.seen.bench, true);
});
