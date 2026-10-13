// The owner's October 2026 asks (docs/ROADMAP.md, Phase 9): food that heals a share of the hero's health,
// potions that last minutes and multiply, work potions; perks that cost more as they climb; a bigger bag for
// gold and a "weaker than worn" salvage. Kept here so they stay as asked.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { RESOURCES, foodHeal } from '../src/data/resources.js';
import { POTIONS, POTION_MINUTES, potionStrength, potionLevel, potionsFor } from '../src/data/potions.js';
import { perkLevelCost, PERKS } from '../src/data/perks.js';
import { BAG_SIZE, BAG_UPGRADE, RARITIES, GEAR_TIERS } from '../src/data/items.js';
import { bagSize, bagUpgradePrice } from '../src/systems/inventory.js';
import { actionInterval } from '../src/core/modifiers.js';
import { generateEquipment } from '../src/core/formulas.js';
import { migrateState } from '../src/core/state.js';
import { tryEat } from '../src/systems/combat.js';
import { addItem } from '../src/systems/inventory.js';
import { potionEffects } from '../src/core/modifiers.js';

const T0 = 1_760_000_000_000;
const MIN = 60_000;
const hero = ({ bestStage = 30, tokens = 0, alchemy = 1 } = {}) => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = bestStage;
    game.state.combat.maxStage = bestStage;
    game.state.prestige.tokens = tokens;
    game.state.skills.alchemy.xp = xpForLevel(alchemy);
    game.state.settings.autoSalvage = 'off';
    game.recompute();
    return game;
};
const sword = (tier, rarity, id) => generateEquipment({ type: 'Weapon', tier, power: GEAR_TIERS[tier - 1].power, materialName: GEAR_TIERS[tier - 1].name, rarity: RARITIES.find(r => r.id === rarity), source: 'drop' }, id);
const run = (game, ms, step = 1000) => { let now = game.now; const end = now + ms; while (now < end) { now += step; game.tick(now); } };

// ---------- food ----------

test('food heals a share of max health, so it keeps up with the hero', () => {
    const weak = hero();
    const strongOne = hero({ tokens: 5000 });
    const shark = RESOURCES.cooked_shark;
    assert.ok(strongOne.derived.maxHp > weak.derived.maxHp * 5);
    assert.equal(foodHeal(shark, weak.derived), Math.round(weak.derived.maxHp * shark.heal));
    assert.equal(foodHeal(shark, strongOne.derived), Math.round(strongOne.derived.maxHp * shark.heal), 'the same share, however strong');
    // the hero eats below the line and comes back up by the food's share
    rng.setSource(seededRandom(5));
    const g = hero({ tokens: 200 });
    g.state.resources.cooked_rabbit = 1;
    g.state.combat.hp = Math.floor(g.derived.maxHp * 0.2);
    const before = g.state.combat.hp;
    assert.equal(tryEat(g), 1);
    assert.equal(g.state.resources.cooked_rabbit, 0, 'eaten below the auto-eat line');
    assert.equal(g.state.combat.hp, before + foodHeal(RESOURCES.cooked_rabbit, g.derived));
});

// ---------- potions ----------

test('a fight potion lasts minutes of fighting, multiplies what it raises, and grows with Alchemy', () => {
    rng.setSource(seededRandom(9));
    const g = hero({ bestStage: 20, tokens: 300, alchemy: 5 });
    g.state.combat.farmMode = true;
    g.state.resources.accuracy_potion = 2;
    const plain = g.derived.atk;
    g.setPotion('accuracy_potion');
    g.enterCombat();
    g.tick(g.now + 100);
    g.recompute();
    assert.equal(g.state.resources.accuracy_potion, 1, 'one drunk as the fight started');
    assert.ok(Math.abs(g.derived.atk - plain * (1 + POTIONS.accuracy_potion.base)) <= 1, `${plain} -> ${g.derived.atk}`);
    // a dose is POTION_MINUTES of fighting: after it, the second; after that, none
    run(g, POTION_MINUTES * MIN - 5000);
    assert.equal(g.state.resources.accuracy_potion, 1, 'still the first bottle');
    run(g, 10_000);
    assert.equal(g.state.resources.accuracy_potion, 0, 'the second follows at once');
    run(g, POTION_MINUTES * MIN);
    assert.equal(g.state.combat.potionMs, 0);
    assert.equal(potionEffects(g.state).atk, 1, 'and the bonus ends with the last');
    // stronger with Alchemy: the brewing level's strength, up to `top` at 99
    assert.equal(potionStrength('accuracy_potion', potionLevel('accuracy_potion')), POTIONS.accuracy_potion.base);
    assert.equal(potionStrength('accuracy_potion', 99), POTIONS.accuracy_potion.top);
    assert.ok(potionStrength('accuracy_potion', 50) > POTIONS.accuracy_potion.base);
});

test("a fight potion's clock stops out of the fight, and no potion works against the clan boss", () => {
    const g = hero({ bestStage: 20, tokens: 300 });
    g.state.resources.health_potion = 3;
    g.setPotion('health_potion');
    g.enterCombat();
    g.tick(g.now + 1000);
    const left = g.state.combat.potionMs;
    assert.ok(left > 0);
    g.leaveCombat();
    run(g, 3 * MIN);
    assert.equal(g.state.combat.potionMs, left, 'resting keeps the dose');
    g.state.combat.mode = 'clan';
    g.recompute();
    assert.equal(g.derived.maxHp, hero({ bestStage: 20, tokens: 300 }).derived.maxHp, 'the clan fight is fought without it');
});

test('a work potion runs while the hero works, online and while away: speed or skill XP', () => {
    const g = hero({ alchemy: 99 });
    g.state.resources.gatherers_draught = 2;
    g.state.resources.scholars_tonic = 0;
    g.startNodeAction('mining', 'copper_ore');
    const base = actionInterval(3000, g.derived, 'mining');
    g.setWorkPotion('gatherers_draught');
    g.tick(g.now + 100);
    g.recompute();
    assert.equal(g.state.resources.gatherers_draught, 1);
    assert.ok(Math.abs(g.derived.skillMult.mining - (1 + POTIONS.gatherers_draught.top)) < 1e-9, 'faster, by the potion at Alchemy 99');
    assert.ok(actionInterval(3000, g.derived, 'mining') < base / 1.35);
    assert.ok(Math.abs(g.derived.skillMult.smithing - (1 + POTIONS.gatherers_draught.top)) < 1e-9, 'every skill with work, the workshop too');
    assert.equal(g.derived.skillMult.farming, undefined, 'not Farming: its plots grow on the clock');
    // the offline replay spends it too: two doses' worth of work away, and both are gone
    const saved = JSON.parse(g.serialize(g.now));
    const back = new Game(saved, saved.meta.savedAt);
    back.resumeFromSave(saved.meta.savedAt + 2 * POTION_MINUTES * MIN + 3 * MIN);
    assert.equal(back.state.resources.gatherers_draught, 0);
    assert.equal(back.state.workPotion.ms, 0, 'run out while away');
    // Scholar's Tonic: more skill XP an action
    const s = hero({ alchemy: 28 });
    s.state.resources.scholars_tonic = 1;
    s.startNodeAction('mining', 'copper_ore');
    const xp0 = s.state.skills.mining.xp;
    run(s, 20_000, 100);
    const plainXp = s.state.skills.mining.xp - xp0;
    s.setWorkPotion('scholars_tonic');
    const xp1 = s.state.skills.mining.xp;
    run(s, 20_000, 100);
    const brewedXp = s.state.skills.mining.xp - xp1;
    assert.ok(brewedXp > plainXp * 1.1, `${plainXp} -> ${brewedXp}`);
    assert.deepEqual(potionsFor('work'), ['gatherers_draught', 'scholars_tonic']);
});

test('a save from the potions that counted attacks loads with none at work', () => {
    const g = hero();
    const raw = JSON.parse(g.serialize(T0));
    raw.combat.potion = 'accuracy_potion';
    raw.combat.potionCharges = 12;
    delete raw.combat.potionMs;
    delete raw.workPotion;
    const state = migrateState(raw, T0);
    assert.equal(state.combat.potionMs, 0);
    assert.equal(state.combat.potionCharges, undefined);
    assert.deepEqual(state.workPotion, { id: 'none', ms: 0 });
    assert.equal(state.combat.potion, 'accuracy_potion');
});

// ---------- perks ----------

test('a perk level costs more as the perk climbs: 1 for levels 1-5, 2 for 6-10, up to 5', () => {
    assert.deepEqual([1, 5, 6, 10, 11, 16, 21, 25, 200].map(perkLevelCost), [1, 1, 2, 2, 3, 4, 5, 5, 5]);
    const knight = PERKS.find(p => p.id === 'knight');
    const all = Array.from({ length: knight.max }, (_, i) => perkLevelCost(i + 1)).reduce((a, b) => a + b, 0);
    assert.equal(all, 75, 'a 25-level perk: 75 points');
    const g = hero();
    g.state.prestige.skillPoints = 6;
    for (let i = 0; i < 5; i++) assert.ok(g.buyPerk('knight'));
    assert.equal(g.state.prestige.skillPoints, 1);
    assert.equal(g.buyPerk('knight'), false, 'the sixth costs two');
    g.state.prestige.skillPoints = 2;
    assert.ok(g.buyPerk('knight'));
    assert.equal(g.state.perks.knight, 6);
    assert.equal(g.state.prestige.skillPoints, 0);
});

// ---------- the bag ----------

test('the bag grows five slots a purchase, for gold that rises each time', () => {
    const g = hero({ bestStage: 60 });
    assert.equal(bagSize(g.state), BAG_SIZE);
    const first = bagUpgradePrice(g);
    g.state.gold = first - 1;
    assert.equal(g.buyBagUpgrade(), false, 'not enough gold');
    g.state.gold = first * 10;
    assert.ok(g.buyBagUpgrade());
    assert.equal(bagSize(g.state), BAG_SIZE + BAG_UPGRADE.slots);
    const second = bagUpgradePrice(g);
    assert.equal(second, Math.ceil(first * BAG_UPGRADE.growth) - (Math.ceil(first * BAG_UPGRADE.growth) - second), 'rising');
    assert.ok(second > first);
    g.state.bagUpgrades = BAG_UPGRADE.max;
    assert.equal(bagUpgradePrice(g), null);
    assert.equal(g.buyBagUpgrade(), false, 'as big as it gets');
    assert.equal(bagSize(g.state), BAG_SIZE + BAG_UPGRADE.slots * BAG_UPGRADE.max);
});

test('"weaker" salvages any drop that would not improve what is worn, never an upgrade or a unique', () => {
    rng.setSource(seededRandom(4));
    const g = hero({ bestStage: 60 });
    const worn = sword(5, 'common', 9001);
    g.state.equipped.Weapon = worn;
    g.state.settings.autoSalvage = 'weaker';
    g.recompute();
    const weak = sword(1, 'legendary', 9002);
    const better = sword(7, 'common', 9003);
    const unique = { ...sword(1, 'legendary', 9004), uniqueId: 'goblin_crown' };
    for (const item of [weak, better, unique]) addItem(g, item);
    const kept = g.state.inventory.map(i => i.id);
    assert.ok(!kept.includes(9002), 'a weaker legendary goes');
    assert.ok(kept.includes(9003) && kept.includes(9004), 'an upgrade and a unique stay');
    // the bag's button does the same for what is already in it
    g.state.settings.autoSalvage = 'off';
    const weak2 = sword(2, 'rare', 9005);
    addItem(g, weak2);
    const r = g.salvageWeaker();
    assert.equal(r.count, 1);
    assert.deepEqual(g.state.inventory.map(i => i.id).sort(), [9003, 9004]);
});
