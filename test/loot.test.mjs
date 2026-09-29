// Loot: drops, crafted rarity cap, salvage, bag cap, auto-salvage, reforge and locks.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { generateDrop, generateEquipment } from '../src/core/formulas.js';
import { BAG_SIZE, CRAFT_MAX_RARITY, RARITIES } from '../src/data/items.js';
import { addItem, itemScore } from '../src/systems/inventory.js';
import { xpForLevel } from '../src/core/xp.js';
import { zoneForStage } from '../src/data/zones.js';

rng.setSource(seededRandom(99));
const T0 = 1_700_000_000_000;
const RANK = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));

const copperBoots = (id, rarity = null) => generateEquipment({ type: 'Boots', tier: 1, power: 1, materialName: 'Copper', source: 'drop', ...(rarity ? { rarity: RARITIES.find(r => r.id === rarity) } : {}) }, id);

test('drops follow the zone tier (one below to one above) and drop-only tiers stay in the late zones', () => {
    const tiersByZone = {};
    for (const zoneTier of [1, 3, 5, 6, 7]) {
        const tiers = new Set();
        for (let i = 0; i < 400; i++) tiers.add(generateDrop(zoneTier, false, i).tier);
        tiersByZone[zoneTier] = [...tiers].sort();
        for (const t of tiers) assert.ok(t >= Math.max(1, zoneTier - 1) && t <= Math.min(7, zoneTier + 1), `zone ${zoneTier} dropped tier ${t}`);
    }
    assert.ok(!tiersByZone[3].includes(6), 'no Dragonbone gear from the Caves');
    assert.ok(tiersByZone[6].includes(6) && tiersByZone[7].includes(7));
    assert.match(generateDrop(7, true, 1).source, /drop/);
});

test('bosses drop better rarities than regular monsters', () => {
    const avg = boss => { let sum = 0; for (let i = 0; i < 2000; i++) sum += RANK[generateDrop(4, boss, i).rarity]; return sum / 2000; };
    assert.ok(avg(true) > avg(false) + 0.4);
});

test('crafted gear never rolls above Rare', () => {
    const game = new Game(null, T0);
    game.state.resources.copper_bar = 3 * 300;
    game.state.settings.autoSalvage = 'off';
    game.startSmithing('Weapon', 'copper_bar');
    let now = T0;
    for (let i = 0; i < 300 * 32; i++) { now += 100; game.tick(now); }
    const made = game.state.stats.itemsCrafted;
    assert.ok(made >= 250, `made ${made}`);
    const all = [...game.state.inventory, ...Object.values(game.state.equipped).filter(Boolean)];
    assert.ok(all.every(i => RANK[i.rarity] <= RANK[CRAFT_MAX_RARITY]));
    assert.ok(game.state.inventory.length <= BAG_SIZE, 'the bag never grows past its size');
    assert.ok(game.state.stats.itemsSalvaged > 0, 'overflow was salvaged, not thrown away');
});

test('salvage: drops become essence, crafted gear returns part of its bars, locked items are safe', () => {
    const game = new Game(null, T0);
    const drop = generateDrop(5, true, 501);
    game.state.inventory.push(drop);
    const before = game.state.resources.essence;
    const gained = game.salvageItem(501);
    assert.ok(gained.essence > 0 && game.state.resources.essence === before + gained.essence);

    let bars = 0;
    for (let i = 0; i < 50; i++) {
        game.state.inventory.push(generateEquipment({ type: 'Body', tier: 1, power: 1, materialName: 'Copper', materials: { copper_bar: 5 }, source: 'crafted' }, 600 + i));
        bars += game.salvageItem(600 + i).materials.copper_bar || 0;
    }
    assert.ok(bars >= 80 && bars <= 120, `~2 of 5 bars back on average, got ${bars} from 50`);

    const locked = copperBoots(700);
    game.state.inventory.push(locked);
    game.toggleLock(700);
    assert.equal(game.salvageItem(700), null);
    assert.equal(game.sellItem(700), false);
    game.salvageAll('legendary');
    game.sellAllItems('legendary');
    assert.ok(game.state.inventory.some(i => i.id === 700), 'locked items survive bulk salvage and sell');
});

test('a full bag salvages its weakest item and keeps upgrades', () => {
    const game = new Game(null, T0);
    game.state.settings.autoSalvage = 'off';
    for (let i = 0; i < BAG_SIZE; i++) game.state.inventory.push(copperBoots(1000 + i));
    const weakest = game.state.inventory.reduce((a, b) => (itemScore(b) < itemScore(a) ? b : a));
    const strong = generateEquipment({ type: 'Weapon', tier: 5, power: 23.4, materialName: 'Runite', source: 'drop' }, 2000);
    const result = addItem(game, strong);
    assert.equal(result.kept, true);
    assert.equal(game.state.inventory.length, BAG_SIZE);
    assert.ok(game.state.inventory.some(i => i.id === 2000));
    assert.ok(!game.state.inventory.some(i => i.id === weakest.id), 'the weakest item was salvaged');
});

test('auto-salvage takes junk drops but never an upgrade', () => {
    const game = new Game(null, T0);
    game.state.settings.autoSalvage = 'common';
    game.state.equipped.Boots = generateEquipment({ type: 'Boots', tier: 3, power: 4.8, materialName: 'Mithril', source: 'crafted' }, 3000);
    const junk = addItem(game, copperBoots(3001, 'common'));
    assert.equal(junk.kept, false);
    assert.ok(junk.gained.essence > 0);
    game.state.equipped.Boots = null;
    const upgrade = addItem(game, copperBoots(3002, 'common'));
    assert.equal(upgrade.kept, true, 'a common that beats an empty slot is kept');
});

test('reforge rerolls affixes with a rising, capped cost; commons cannot be reforged', () => {
    const game = new Game(null, T0);
    game.state.resources.essence = 10_000;
    game.state.gold = 1e9;
    const epic = generateEquipment({ type: 'Ring', tier: 4, power: 10, gemName: 'Emerald', source: 'drop', rarity: RARITIES.find(r => r.id === 'epic') }, 4000);
    game.state.inventory.push(epic);
    const costs = [];
    for (let i = 0; i < 12; i++) {
        const essenceBefore = game.state.resources.essence;
        assert.ok(game.reforgeItem(4000));
        costs.push(essenceBefore - game.state.resources.essence);
    }
    assert.equal(epic.affixes.length, 3);
    assert.ok(costs[1] > costs[0] && costs[11] === costs[10], `costs ${costs.join(',')}`);
    game.state.inventory.push(copperBoots(4001, 'common'));
    assert.equal(game.reforgeItem(4001), false);
});

test('bosses really drop gear in play, and drops reach the bag', () => {
    const game = new Game(null, T0);
    game.state.settings.autoSalvage = 'off';
    game.state.skills.combat.xp = xpForLevel(40);
    game.state.inventory.push(generateEquipment({ type: 'Weapon', tier: 4, power: 10.6, materialName: 'Adamant', source: 'crafted' }, 5000));
    game.equipItem(5000);
    game.state.resources.cooked_bear = 1000;
    game.enterCombat();
    let now = T0;
    for (let i = 0; i < 20 * 60 * 10; i++) { now += 100; game.tick(now); if (!game.state.combat.active) game.enterCombat(); }
    assert.ok(game.state.stats.bossKills >= 3, `boss kills ${game.state.stats.bossKills}`);
    assert.ok(game.state.stats.itemsDropped >= 1, `drops ${game.state.stats.itemsDropped}`);
    assert.ok(game.state.inventory.some(i => i.source === 'drop'));
});

test('zone gear tiers follow the crafting timeline: never falling, drop-only tiers only deep in the Abyss', () => {
    let last = 0;
    for (let stage = 1; stage <= 200; stage++) {
        const zone = zoneForStage(stage);
        assert.ok(zone.gearTier >= last, `gear tier falls at stage ${stage}`);
        last = zone.gearTier;
        if (zone.gearTier >= 6) assert.ok(zone.depth >= 3, `drop-only tier at stage ${stage}`);
    }
    assert.equal(zoneForStage(100).gearTier, 4);
    assert.equal(zoneForStage(125).gearTier, 6);
    assert.equal(zoneForStage(145).gearTier, 7);
});
