// The owner's October 2026 asks (docs/ROADMAP.md, Phase 9): food that heals a share of the hero's health,
// potions that last minutes and multiply, work potions; perks that cost more as they climb; a bigger bag for
// gold and a "weaker than worn" salvage; lifesteal under a ceiling, so food and potions keep their job.
// Kept here so they stay as asked.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { RESOURCES, foodHeal } from '../src/data/resources.js';
import { POTION_KINDS, POTION_MINUTES, OUT_OF_PLACE, potionsFor, potionPower, potionName } from '../src/data/potions.js';
import { clanAttackFromSave } from '../src/core/power.js';
import { perkLevelCost, perkCost, PERKS } from '../src/data/perks.js';
import { BAG_SIZE, BAG_UPGRADE, RARITIES, GEAR_TIERS } from '../src/data/items.js';
import { bagSize, bagUpgradePrice, bagUpgradeEssence } from '../src/systems/inventory.js';
import { actionInterval } from '../src/core/modifiers.js';
import { generateEquipment } from '../src/core/formulas.js';
import { migrateState, PERK_RESET } from '../src/core/state.js';
import { tryEat, playerAttack } from '../src/systems/combat.js';
import { BASE, bonfireDouble } from '../src/core/modifiers.js';
import { BALANCE } from '../src/core/formulas.js';
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

// ---------- lifesteal ----------

const vampire = () => {
    const g = hero({ bestStage: 30, tokens: 400 });
    g.state.equipped.Weapon = { id: 7001, type: 'Weapon', tier: 7, atk: 50000, def: 0, upgrade: 0, rarity: 'legendary', affixes: [{ stat: 'lifesteal', name: 'Lifesteal', value: BASE.caps.lifesteal }] };
    g.recompute();
    return g;
};

test('lifesteal heals at most its ceiling a second, however hard the hero hits', () => {
    rng.setSource(seededRandom(21));
    const g = vampire();
    const c = g.state.combat;
    assert.equal(g.derived.lifesteal, BASE.caps.lifesteal);
    g.enterCombat();
    c.enemy.hp = c.enemy.maxHp = 1e15;   // a wall of a monster that never falls...
    c.enemy.atk = 0;                       // ...and never hurts
    c.hp = 1;
    const max = g.derived.maxHp;
    run(g, 10_000, 100);
    const healed = c.hp - 1;
    const regen = max * BALANCE.combat.regenInCombat * 10;
    assert.ok(healed <= max * BASE.lifestealPerSecond * 11 + regen + 1, `${healed} of ${max} in 10 s`);
    assert.ok(healed >= max * BASE.lifestealPerSecond * 8, 'and it does heal, up to the ceiling');
});

test("lifesteal heals from what the monster really lost: a killing blow's excess heals nothing", () => {
    rng.setSource(seededRandom(22));
    const g = vampire();
    const c = g.state.combat;
    g.enterCombat();
    c.enemy.hp = 10;
    c.hp = 1;
    c.lifestealRoom = g.derived.maxHp;   // room enough: only the damage dealt limits it
    const dmg = playerAttack(g);
    assert.ok(dmg > 1000);
    assert.equal(c.hp, 1 + Math.round(10 * BASE.caps.lifesteal), 'a share of the 10 it had left');
    // out of the fight the room doesn't fill: a pause banks no heal
    g.leaveCombat();
    c.lifestealRoom = 0;
    run(g, 30_000);
    assert.equal(c.lifestealRoom, 0);
});

// ---------- potions ----------

test('a combat potion lasts minutes of fighting and multiplies attack, defence and health by its tier', () => {
    rng.setSource(seededRandom(9));
    const g = hero({ bestStage: 20, tokens: 300 });
    g.state.combat.farmMode = true;
    g.state.resources.combat_potion_2 = 2;
    const plain = { atk: g.derived.atk, def: g.derived.def, hp: g.derived.maxHp };
    g.setPotion('combat_potion_2');
    g.enterCombat();
    g.tick(g.now + 100);
    g.recompute();
    assert.equal(g.state.resources.combat_potion_2, 1, 'one drunk as the fight started');
    const x = 1 + POTION_KINDS.combat.power[1];
    // (the plain figures are rounded, so the potion's figures may be off by up to its multiple)
    assert.ok(Math.abs(g.derived.atk - plain.atk * x) <= x, `${plain.atk} -> ${g.derived.atk}`);
    assert.ok(Math.abs(g.derived.def - plain.def * x) <= x);
    assert.ok(Math.abs(g.derived.maxHp - plain.hp * x) <= x);
    // a dose is POTION_MINUTES of fighting: after it, the second; after that, none
    run(g, POTION_MINUTES * MIN - 5000);
    assert.equal(g.state.resources.combat_potion_2, 1, 'still the first bottle');
    run(g, 10_000);
    assert.equal(g.state.resources.combat_potion_2, 0, 'the second follows at once');
    run(g, POTION_MINUTES * MIN);
    assert.equal(g.state.combat.potionMs, 0);
    assert.equal(potionEffects(g.state).atk, 1, 'and the bonus ends with the last');
    // each tier stronger than the last, the fourth the strongest
    const tiers = potionsFor('combat').map(id => potionPower(id, 'combat'));
    assert.deepEqual([...tiers].sort((a, b) => a - b), tiers);
    assert.equal(potionName('combat_potion_4'), 'Combat Potion IV');
    // the combat pick takes combat potions only
    g.state.resources.dungeon_potion_1 = 1;
    g.setPotion('dungeon_potion_1');
    assert.equal(g.state.combat.potion, 'combat_potion_2');
});

test("a combat potion's clock stops out of the fight, and it works against the clan boss, the server counting it", () => {
    const g = hero({ bestStage: 20, tokens: 300 });
    g.state.resources.combat_potion_4 = 3;
    g.setPotion('combat_potion_4');
    g.enterCombat();
    g.tick(g.now + 1000);
    const left = g.state.combat.potionMs;
    assert.ok(left > 0);
    g.leaveCombat();
    run(g, 3 * MIN);
    assert.equal(g.state.combat.potionMs, left, 'resting keeps the dose');
    // the clan fight: the same potion, and the server's reckoning of a clan attack counts it too
    g.state.combat.mode = 'clan';
    g.recompute();
    const plainHp = hero({ bestStage: 20, tokens: 300 }).derived.maxHp;
    assert.ok(Math.abs(g.derived.maxHp - plainHp * (1 + POTION_KINDS.combat.power[3])) <= 1 + POTION_KINDS.combat.power[3], 'against the clan boss too');
    g.state.combat.mode = 'stages';
    const raw = JSON.parse(g.serialize(g.now));
    const bare = JSON.parse(g.serialize(g.now));
    bare.combat.potion = 'none';
    const brewed = clanAttackFromSave(raw, [], undefined, g.now).damage;
    const plain = clanAttackFromSave(bare, [], undefined, g.now).damage;
    assert.ok(brewed > plain * 1.6, `${plain} -> ${brewed}`);
});

test('a dungeon potion works in runs only, stronger there, with a second fragment now and then; a combat potion there at half', () => {
    rng.setSource(seededRandom(31));
    const g = hero({ bestStage: 60, tokens: 300 });
    const plainAtk = g.derived.atk;
    g.state.resources.dungeon_potion_4 = 50;
    g.setDungeonPotion('dungeon_potion_4');
    // on the stages it does nothing (and the combat pick can't hold it)
    g.enterCombat();
    g.tick(g.now + 1000);
    g.recompute();
    assert.equal(g.derived.atk, plainAtk, 'not on the stages');
    assert.equal(g.state.resources.dungeon_potion_4, 50, 'nor drunk there');
    g.leaveCombat();
    g.enterDungeon('goblin_warren');
    g.setDungeonRepeat?.(true);
    g.tick(g.now + 100);
    g.recompute();
    assert.ok(Math.abs(g.derived.atk - plainAtk * (1 + POTION_KINDS.dungeon.power[3])) <= 1 + POTION_KINDS.dungeon.power[3], 'in the run');
    assert.equal(g.state.resources.dungeon_potion_4, 49);
    // a combat potion picked for the run works at half its strength
    g.state.resources.combat_potion_4 = 2;
    g.setDungeonPotion('combat_potion_4');
    g.tick(g.now + 100);
    g.recompute();
    assert.ok(Math.abs(g.derived.atk - plainAtk * (1 + POTION_KINDS.combat.power[3] * OUT_OF_PLACE)) <= 1 + POTION_KINDS.combat.power[3] * OUT_OF_PLACE, 'half, in a run');
    // the dungeon potion's second fragment: over many clears, about its chance more than without
    const clears = (pick, n) => {
        const h = hero({ bestStage: 400, tokens: 5000 });
        h.state.resources.dungeon_potion_4 = 1000;
        h.setDungeonPotion(pick);
        h.enterDungeon('goblin_warren');
        h.state.combat.dungeon.repeat = true;
        const c0 = h.state.dungeons.goblin_warren.clears;
        while (h.state.dungeons.goblin_warren.clears - c0 < n) run(h, 10_000, 250);
        const d = h.state.dungeons.goblin_warren;
        return (d.fragments) / (d.clears - c0);
    };
    rng.setSource(seededRandom(32));
    const without = clears('none', 150);
    rng.setSource(seededRandom(32));
    const withIt = clears('dungeon_potion_4', 150);
    assert.ok(withIt - without > POTION_KINDS.dungeon.fragment[3] * 0.6, `${without.toFixed(2)} -> ${withIt.toFixed(2)} fragments a clear`);
});

test('a skill potion runs while the hero works, online and while away: faster, and more skill XP', () => {
    const g = hero({ alchemy: 99 });
    g.state.resources.skill_potion_4 = 2;
    g.startNodeAction('mining', 'copper_ore');
    const base = actionInterval(3000, g.derived, 'mining');
    g.setWorkPotion('skill_potion_4');
    g.tick(g.now + 100);
    g.recompute();
    assert.equal(g.state.resources.skill_potion_4, 1);
    const speed = 1 + POTION_KINDS.skill.speed[3];
    assert.ok(Math.abs(g.derived.skillMult.mining - speed) < 1e-9, 'faster');
    assert.ok(actionInterval(3000, g.derived, 'mining') < base / (speed - 0.1));
    assert.ok(Math.abs(g.derived.skillMult.smithing - speed) < 1e-9, 'every skill with work, the workshop too');
    assert.equal(g.derived.skillMult.farming, undefined, 'not Farming: its plots grow on the clock');
    assert.ok(Math.abs(g.derived.skillXpMult - (1 + POTION_KINDS.skill.xp[3])) < 1e-9, 'and more XP');
    // the offline replay spends it too: two doses' worth of work away, and both are gone
    const saved = JSON.parse(g.serialize(g.now));
    const back = new Game(saved, saved.meta.savedAt);
    back.resumeFromSave(saved.meta.savedAt + 2 * POTION_MINUTES * MIN + 3 * MIN);
    assert.equal(back.state.resources.skill_potion_4, 0);
    assert.equal(back.state.workPotion.ms, 0, 'run out while away');
    assert.deepEqual(potionsFor('skill'), ['skill_potion_1', 'skill_potion_2', 'skill_potion_3', 'skill_potion_4', 'skill_potion_5', 'skill_potion_6']);
});

test('a save from before the three kinds turns its bottles and picks into them, by their herb', () => {
    const g = hero();
    const raw = JSON.parse(g.serialize(T0));
    Object.assign(raw.resources, { accuracy_potion: 4, defense_potion: 3, evasion_potion: 2, health_potion: 1, fortune_draught: 5, gatherers_draught: 6, scholars_tonic: 7 });
    raw.combat.potion = 'fortune_draught';
    raw.combat.potionMs = 60_000;
    raw.workPotion = { id: 'scholars_tonic', ms: 30_000 };
    const state = migrateState(raw, T0);
    assert.deepEqual(['combat_potion_1', 'combat_potion_2', 'combat_potion_3', 'combat_potion_4', 'dungeon_potion_3', 'skill_potion_1', 'skill_potion_2'].map(id => state.resources[id]), [4, 3, 2, 1, 5, 6, 7]);
    assert.equal(state.resources.accuracy_potion, undefined);
    assert.equal(state.combat.potion, 'none', 'the Fortune Draught was a fight pick: now the dungeon one');
    assert.equal(state.combat.dungeonPotion, 'dungeon_potion_3');
    assert.equal(state.combat.dungeonPotionMs, 60_000);
    assert.deepEqual(state.workPotion, { id: 'skill_potion_2', ms: 30_000 });
    // and one that counted attacks loads with none at work
    const older = JSON.parse(g.serialize(T0));
    older.combat.potion = 'accuracy_potion';
    older.combat.potionCharges = 12;
    delete older.combat.potionMs;
    const s2 = migrateState(older, T0);
    assert.equal(s2.combat.potion, 'combat_potion_1');
    assert.equal(s2.combat.potionMs, 0);
    assert.equal(s2.combat.potionCharges, undefined);
});

// ---------- perks ----------

test('a perk level costs more as the perk climbs: 1 for levels 1-5, 2 for 6-10, up to 10; Paragon without end', () => {
    assert.deepEqual([1, 5, 6, 10, 11, 16, 21, 25, 46, 50, 200].map(level => perkLevelCost(level)), [1, 1, 2, 2, 3, 4, 5, 5, 10, 10, 10]);
    const knight = PERKS.find(p => p.id === 'knight');
    const paragon = PERKS.find(p => p.id === 'paragon');
    assert.equal(knight.max, 50);
    assert.equal(perkCost(knight), 275, 'a 50-level perk: 275 points');
    assert.equal(perkCost(knight, 25), 75, 'its first 25 cost what a whole one did before');
    assert.equal(perkLevelCost(200, paragon), 40, "Paragon's price keeps rising");
    assert.equal(perkCost(paragon), 4100);
    // with Auto on, the simulator's player earns 60-80 points a day: the perks but Paragon take about two weeks
    assert.equal(PERKS.filter(p => p.id !== 'paragon').reduce((n, p) => n + perkCost(p), 0), 874);
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

test('the perk reset gives every level back as skill points, once, and a new game has nothing to reset', () => {
    const g = hero();
    const save = JSON.parse(g.serialize(g.now));
    delete save.prestige.perkReset;   // a save from before the reset
    Object.assign(save.prestige, { skillPoints: 4, count: 10, spClaimedStage: 0 });
    Object.assign(save.perks, { knight: 25, warlord: 3, rogue: 15, paragon: 15 });
    const s = migrateState(save, g.now);
    assert.equal(Object.values(s.perks).reduce((a, b) => a + b, 0), 0, 'every level gone');
    assert.equal(s.prestige.skillPoints, 4 + 58, 'and back as points: one a level (their price before 13 October), the more of the two counts');
    assert.equal(s.prestige.perkReset, PERK_RESET);
    assert.match(s.log.at(-1).text, /Perks reset/);
    // what the prestiges paid wins when the levels cost more than one point each
    const dear = JSON.parse(g.serialize(g.now));
    delete dear.prestige.perkReset;
    Object.assign(dear.prestige, { skillPoints: 0, count: 190, spClaimedStage: 239 });
    dear.combat.bestStage = 239;
    Object.assign(dear.perks, { knight: 25, warlord: 25, rogue: 15, paragon: 129 });
    assert.equal(migrateState(dear, g.now).prestige.skillPoints, 199);
    // once: a reset save, levels bought again, loads as it is
    s.perks.knight = 5;
    s.prestige.skillPoints -= 5;
    const again = migrateState(JSON.parse(JSON.stringify(s)), g.now);
    assert.equal(again.perks.knight, 5);
    assert.equal(again.prestige.skillPoints, s.prestige.skillPoints);
    assert.equal(hero().state.prestige.perkReset, PERK_RESET, 'a new game is past it');
});

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

test('or for essence: 2,000 for the first, half as much again each time, the gold left alone (a deep run\'s gold goes to the camp)', () => {
    const g = hero({ bestStage: 1000 });
    assert.equal(bagUpgradeEssence(g.state), BAG_UPGRADE.essence);
    g.state.resources.essence = BAG_UPGRADE.essence - 1;
    g.state.gold = 0;
    assert.equal(g.buyBagUpgrade('essence'), false, 'not enough essence');
    g.state.resources.essence = 10 * BAG_UPGRADE.essence;
    assert.ok(g.buyBagUpgrade('essence'));
    assert.equal(g.state.resources.essence, 9 * BAG_UPGRADE.essence);
    assert.equal(g.state.gold, 0, 'no gold taken');
    assert.equal(bagSize(g.state), BAG_SIZE + BAG_UPGRADE.slots);
    assert.equal(bagUpgradeEssence(g.state), Math.ceil(BAG_UPGRADE.essence * BAG_UPGRADE.growth));
    // all twelve come to about half a million: a stage-1,000 hero in the simulator holds 378,000 and gains ~4,400 an hour
    const all = Array.from({ length: BAG_UPGRADE.max }, (_, i) => Math.ceil(BAG_UPGRADE.essence * BAG_UPGRADE.growth ** i)).reduce((a, b) => a + b, 0);
    assert.ok(all > 400000 && all < 600000, `${all}`);
    g.state.bagUpgrades = BAG_UPGRADE.max;
    assert.equal(bagUpgradeEssence(g.state), null);
    assert.equal(g.buyBagUpgrade('essence'), false, 'as big as it gets');
});

test('"weaker" salvages any drop that would not improve what is worn, a spare unique too, never an upgrade or the Seal\'s copy', () => {
    rng.setSource(seededRandom(4));
    const g = hero({ bestStage: 60 });
    const worn = sword(5, 'common', 9001);
    g.state.equipped.Weapon = worn;
    g.state.settings.autoSalvage = 'weaker';
    g.recompute();
    const weak = sword(1, 'legendary', 9002);
    const better = sword(7, 'common', 9003);
    const unique = { ...sword(1, 'legendary', 9004), uniqueId: 'goblin_crown' };   // a spare, the bag's only copy: the Seal's
    const spare = { ...sword(1, 'legendary', 9006), uniqueId: 'goblin_crown' };    // a second spare
    const first = { ...sword(1, 'legendary', 9007), uniqueId: 'crystal_heart', locked: true };   // a first copy arrives locked
    for (const item of [weak, better, unique, spare, first]) addItem(g, item);
    const kept = g.state.inventory.map(i => i.id);
    assert.ok(!kept.includes(9002), 'a weaker legendary goes');
    assert.ok(kept.includes(9003) && kept.includes(9004) && kept.includes(9007), 'an upgrade, the Seal\'s copy and a first copy stay');
    assert.ok(!kept.includes(9006), 'a second spare goes');
    // the bag's button does the same for what is already in it
    g.state.settings.autoSalvage = 'off';
    addItem(g, sword(2, 'rare', 9005));
    addItem(g, { ...sword(1, 'legendary', 9008), uniqueId: 'goblin_crown' });
    const r = g.salvageWeaker();
    assert.equal(r.count, 2);
    assert.deepEqual(g.state.inventory.map(i => i.id).sort(), [9003, 9004, 9007]);
});

// ---------- the bonfire ----------

test('a burning bonfire doubles now and then in every skill that makes something, more with Firemaking', () => {
    const g = hero();
    const plain = g.derived.doubleChance.mining;
    g.state.bonfire.until = g.now + 10 * MIN;
    g.recompute();
    assert.ok(Math.abs(g.derived.doubleChance.mining - plain - bonfireDouble(1)) < 1e-9, 'mining');
    assert.ok(g.derived.doubleChance.cooking >= bonfireDouble(1) - 1e-9, 'cooking');
    assert.ok(g.derived.doubleChance.smithing >= bonfireDouble(1) - 1e-9, 'smelting');
    assert.equal(g.derived.doubleChance.firemaking, 0, 'not its own logs');
    assert.equal(bonfireDouble(99), BASE.bonfireDoubleAt99);
    g.state.bonfire.until = g.now - 1;
    g.tick(g.now + 100);
    assert.equal(g.derived.doubleChance.mining, plain, 'out: as it was');
});
