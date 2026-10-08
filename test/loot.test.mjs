// Loot: drops, crafted rarity cap, salvage, bag cap, auto-salvage, reforge and locks.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { generateDrop, generateEquipment } from '../src/core/formulas.js';
import { BAG_SIZE, CRAFT_MAX_RARITY, RARITIES, craftMaxRarity } from '../src/data/items.js';
import { abyssDropMult } from '../src/core/formulas.js';
import { resolveAction } from '../src/systems/skilling.js';
import { onEnemyDeath, spawnEnemy } from '../src/systems/combat.js';
import { GEM_TIERS, VOIDSTONE_DEPTH } from '../src/data/workshop.js';
import { GOLD_SHOP } from '../src/data/perks.js';
import { RESOURCES } from '../src/data/resources.js';
import { goldShopOpen } from '../src/systems/inventory.js';
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

test('forged gear never rolls above Rare', () => {
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

test('a bag full of locked items overflows rather than salvage an upgrade', () => {
    const game = new Game(null, T0);
    game.state.settings.autoSalvage = 'off';
    game.state.equipped.Boots = generateEquipment({ type: 'Boots', tier: 3, power: 4.8, materialName: 'Mithril', source: 'crafted' }, 4200);
    for (let i = 0; i < BAG_SIZE; i++) { const b = copperBoots(4000 + i); b.locked = true; game.state.inventory.push(b); }
    const strong = generateEquipment({ type: 'Weapon', tier: 5, power: 23.4, materialName: 'Runite', source: 'drop' }, 4100);
    assert.equal(addItem(game, strong).kept, true);
    assert.equal(game.state.inventory.length, BAG_SIZE + 1, 'the upgrade waits in an overfull bag');
    const junk = addItem(game, copperBoots(4101));
    assert.equal(junk.kept, false, 'junk still goes');
    assert.equal(game.state.inventory.length, BAG_SIZE + 1);
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

test('crafted jewellery rolls higher with Crafting: epic from level 75, legendary at 99', () => {
    assert.equal(craftMaxRarity(74), 'rare');
    assert.equal(craftMaxRarity(75), 'epic');
    assert.equal(craftMaxRarity(98), 'epic');
    assert.equal(craftMaxRarity(99), 'legendary');
    /** Crafts n rings of ruby in silver at a Crafting level; the rarities made. */
    const craft = (level, n) => {
        const game = new Game(null, T0);
        game.state.skills.crafting.xp = xpForLevel(level);
        game.state.unlocks.crafting = true;
        game.state.resources.silver_bar = n;
        game.state.resources.ruby = n;
        game.state.settings.autoSalvage = 'off';
        game.startCrafting('Ring', 'silver_bar', 'ruby');
        let now = T0;
        while (game.state.resources.ruby > 0 && now < T0 + n * 10_000) { now += 250; game.tick(now); }
        const all = [...game.state.inventory, ...Object.values(game.state.equipped).filter(Boolean)].filter(i => i.source === 'crafted');
        return new Set(all.map(i => i.rarity));
    };
    rng.setSource(seededRandom(5));
    assert.ok(!craft(60, 120).has('epic'), 'below 75 no epic');
    rng.setSource(seededRandom(5));
    assert.ok(craft(80, 120).has('epic'), 'from 75 an epic now and then');
});

test('the Voidstone: only deep bosses leave it, and its pieces are cut to the hero\'s deepest depth', () => {
    rng.setSource(seededRandom(7));
    /** Beats n bosses at a stage; the Voidstones found. */
    const bosses = (stage, n) => {
        const game = new Game(null, T0);
        const c = game.state.combat;
        game.enterCombat();
        let found = 0;
        for (let i = 0; i < n; i++) {
            c.stage = c.maxStage = c.bestStage = stage;
            game.state.stats.bossKills = 5;   // not the first boss ever
            spawnEnemy(game);
            assert.ok(c.enemy.boss);
            const before = game.state.resources.voidstone;
            c.enemy.hp = 0;
            onEnemyDeath(game);
            found += game.state.resources.voidstone - before;
        }
        return found;
    };
    const shallow = (VOIDSTONE_DEPTH + 9) * 10;   // the boss of depth VOIDSTONE_DEPTH - 1
    assert.equal(zoneForStage(shallow).depth, VOIDSTONE_DEPTH - 1);
    assert.equal(bosses(shallow, 60), 0, 'none above its depth');
    const deep = (VOIDSTONE_DEPTH + 11) * 10;
    assert.ok(zoneForStage(deep).depth >= VOIDSTONE_DEPTH);
    assert.ok(bosses(deep, 60) >= 5, 'a deep boss leaves one now and then');
    // the recipe opens late, and is cut to the deepest depth reached
    const game = new Game(null, T0);
    const s = game.state;
    assert.equal(GEM_TIERS.at(-1).gem, 'voidstone');
    s.combat.bestStage = 300;
    const recipe = resolveAction(s, { kind: 'craft', type: 'Ring', bar: 'gold_bar', gem: 'voidstone' });
    assert.ok(recipe.levelReq >= 85, 'Crafting 85');
    const depth = zoneForStage(300).depth;
    assert.equal(recipe.item.depth, depth);
    const plain = resolveAction({ ...s, combat: { ...s.combat, bestStage: 1 } }, { kind: 'craft', type: 'Ring', bar: 'gold_bar', gem: 'voidstone' });
    assert.ok(Math.abs(recipe.item.power / plain.item.power - abyssDropMult(depth)) < 1e-9, 'as strong as what drops there');
});

test('the shop sells the low gems for Crafting: once it is open, the pouch for the hero\'s level, never a high gem', () => {
    const game = new Game(null, T0);
    const s = game.state;
    const pouches = () => GOLD_SHOP.filter(e => e.craft && goldShopOpen(s, e)).map(e => e.id);
    assert.deepEqual(pouches(), [], 'nothing before Crafting is open');
    s.unlocks.crafting = true;
    assert.deepEqual(pouches(), ['buy_amethyst']);
    s.skills.crafting.xp = xpForLevel(12);
    assert.deepEqual(pouches(), ['buy_topaz']);
    s.skills.crafting.xp = xpForLevel(60);
    assert.deepEqual(pouches(), ['buy_sapphire'], 'sapphires from 25 on, a bridge to the emeralds a hero already holds');
    s.gold = 1e15;
    s.combat.bestStage = 100;
    assert.equal(game.buyGoldShopItem('buy_amethyst'), false, 'not the pouch of another level');
    const before = s.resources.sapphire;
    assert.equal(game.buyGoldShopItem('buy_sapphire'), true);
    assert.equal(s.resources.sapphire, before + 10);
    for (const e of GOLD_SHOP) for (const id of Object.keys(e.gives)) if (RESOURCES[id].category === 'gem') assert.ok(RESOURCES[id].tier <= 3, `${id}: the high gems stay the fight's and the mine's`);
});
