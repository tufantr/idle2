// Balance rules from the research pass (docs/research_notes/incremental-math.md, DESIGN §5): armour
// carries health, so a deep hero is not killed by every hit; the deep Abyss's drops keep pace below
// the monsters' growth; camp prices follow the best stage, so gold has a job late.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { BASE } from '../src/core/modifiers.js';
import { BALANCE, generateEquipment } from '../src/core/formulas.js';
import { RARITIES } from '../src/data/items.js';
import { CAMP_UPGRADES, CAMP_PRICE_KILLS, campCost } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { goldPerKillAtStage } from '../src/core/formulas.js';

const T0 = 1_700_000_000_000;

test('armour adds one health for every 20 defence, raised by the health bonuses like the rest', () => {
    const game = new Game(null, T0);
    game.state.skills.combat.xp = 1e9;   // level 99: any tier can be worn
    game.recompute();
    const bare = game.derived.maxHp;
    const plate = generateEquipment({ type: 'Body', tier: 5, power: 23.4, materialName: 'Runite', rarity: RARITIES[0] }, 900);
    game.state.inventory.push(plate);
    game.equipItem(plate.id);
    assert.ok(plate.def > 300);
    assert.equal(game.derived.maxHp, Math.floor(bare + BASE.hpPerDef * plate.def));
    // a health bonus multiplies it too
    game.state.camp.hearth = 5;
    game.recompute();
    assert.ok(game.derived.maxHp > Math.floor((bare + BASE.hpPerDef * plate.def) * 1.2));
});

test('deep in the Abyss health grows with the depth the armour came from, and drops stay below the monsters', () => {
    // the same hero in armour from depth 10 and from depth 15: his health follows the armour's growth
    const dressed = depth => {
        const game = new Game(null, T0);
        game.state.skills.combat.xp = 1e9;
        const mult = Math.pow(BALANCE.abyss.dropGrowth, depth - BALANCE.abyss.dropScalingFrom);
        let id = 1000;
        for (const type of ['Body', 'Legs', 'Head', 'Shield', 'Boots', 'Gloves']) {
            const item = generateEquipment({ type, tier: 7, power: 112 * mult, materialName: 'Abyssal', rarity: RARITIES[0] }, id++);
            game.state.inventory.push(item);
            game.equipItem(item.id);
        }
        game.recompute();
        return game.derived.maxHp;
    };
    const grew = dressed(15) / dressed(10);
    // (it stood still before armour gave health; the health from levels dilutes it a little)
    assert.ok(grew > Math.pow(BALANCE.abyss.dropGrowth, 5) / 2, `health x${grew.toFixed(1)} over five depths`);
    assert.ok(BALANCE.abyss.dropGrowth < Math.pow(BALANCE.enemy.abyssHpGrowth, 10), 'drops stay below the monsters, or the climb runs away');
});

test('camp prices are the old ones for a new player, and follow the best stage later', () => {
    const game = new Game(null, T0);
    const s = game.state;
    const [whetstone] = CAMP_UPGRADES;
    for (const best of [1, 30, 60]) {
        s.combat.bestStage = best;
        for (const level of [0, 10, 24]) assert.equal(campPrice(s, whetstone, level), campCost(whetstone, level), `stage ${best}, level ${level}`);
    }
    s.combat.bestStage = 200;
    const first = campPrice(s, whetstone, 0);
    assert.equal(first, Math.ceil(CAMP_PRICE_KILLS * goldPerKillAtStage(200)));
    assert.ok(Math.abs(campPrice(s, whetstone, 5) / first - whetstone.growth ** 5) < 0.01);
    // buying pays that price, and a prestige packs the camp up as before
    s.gold = first * 3;
    assert.equal(game.buyCampUpgrade('whetstone', 1), 1);
    assert.equal(s.gold, first * 2);
});
