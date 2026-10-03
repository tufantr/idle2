// Core game tests. Run with: node --test test/
// Each "regression" test pins a bug the audit verified in the original prototype.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel, levelForXp } from '../src/core/xp.js';
import { createDefaultState, migrateState, SAVE_VERSION } from '../src/core/state.js';
import { actionInterval } from '../src/core/modifiers.js';
import { advise, adviceLimit } from '../src/systems/advisor.js';
import { DAILY_INTERVAL_MS, DAILY_MAX_BANKED } from '../src/systems/daily.js';
import { generateEquipment, enemyForStage, tokensForStage, enemyDamage } from '../src/core/formulas.js';
import { RESOURCES, sellValue } from '../src/data/resources.js';
import { GOLD_SHOP } from '../src/data/perks.js';
import { goldShopPrice } from '../src/systems/inventory.js';
import { masteryBonus } from '../src/systems/mastery.js';
import { MASTERY_XP_DIVISOR } from '../src/data/mastery.js';

rng.setSource(seededRandom(1234));
const T0 = 1_700_000_000_000;

function run(game, ms, step = 100) {
    let now = game.now;
    const end = now + ms;
    while (now < end) { now += step; game.tick(now); }
    return now;
}

test('XP table matches the RuneScape/Melvor curve', () => {
    assert.equal(xpForLevel(1), 0);
    assert.equal(xpForLevel(2), 83);
    assert.equal(xpForLevel(10), 1154);
    assert.equal(xpForLevel(50), 101333);
    assert.equal(xpForLevel(92), 6517253);
    assert.equal(xpForLevel(99), 13034431);
    for (const level of [1, 2, 10, 37, 98, 99]) assert.equal(levelForXp(xpForLevel(level)), level);
    assert.equal(levelForXp(xpForLevel(50) - 1), 49);
});

test('regression: smithing creates an item and consumes bars (getRandomRarity used to throw)', () => {
    const game = new Game(null, T0);
    game.state.resources.copper_bar = 10;
    assert.ok(game.startSmithing('Weapon', 'copper_bar'));
    run(game, 3100);
    assert.equal(game.state.inventory.length, 1);
    assert.equal(game.state.resources.copper_bar, 7);
    assert.ok(game.state.skills.smithing.xp > 0);
    assert.ok(game.state.inventory[0].atk > 0);
});

test('regression: rarity is a bounded quality bonus — a legendary copper sword never beats a common runite one', () => {
    let bestCopper = 0;
    let worstRunite = Infinity;
    for (let i = 0; i < 400; i++) {
        bestCopper = Math.max(bestCopper, generateEquipment({ type: 'Weapon', tier: 1, power: RESOURCES.copper_bar.power, materialName: 'Copper' }, i).atk);
        worstRunite = Math.min(worstRunite, generateEquipment({ type: 'Weapon', tier: 5, power: RESOURCES.runite_bar.power, materialName: 'Runite' }, i).atk);
    }
    assert.ok(bestCopper < worstRunite / 5, `copper ${bestCopper} vs runite ${worstRunite}`);
});

test('regression: offline progress with a workshop action does not throw and makes items', () => {
    const game = new Game(null, T0);
    game.state.resources.copper_bar = 30;
    assert.ok(game.startSmithing('Weapon', 'copper_bar'));
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 10 * 60 * 1000;
    const g2 = new Game(saved, later);
    const summary = g2.resumeFromSave(later);
    assert.equal(summary.mode, 'skill');
    assert.equal(summary.items, 10, 'three bars per sword, 30 bars');
    assert.equal(g2.state.resources.copper_bar, 0);
    assert.match(summary.stalledReason || '', /ran out of materials/);
});

test('offline progress is capped (12h base) and speeds up with mastery as it goes', () => {
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 30 * 24 * 3600 * 1000;
    const g2 = new Game(saved, later);
    // The player was away, so focus (+15%) applies. Achievements earned during the replay only take
    // effect afterwards, so read the speed first.
    assert.ok(g2.derived.focused);
    const derived = g2.derived;
    const summary = g2.resumeFromSave(later);
    assert.equal(summary.simulated, 12 * 3600 * 1000);
    assert.ok(summary.capped);
    // Replay the timeline by hand: each ore takes the interval of the mastery level it starts at.
    let t = 0, actions = 0, practice = 0;
    for (;;) {
        const interval = actionInterval(3000, derived, 'mining', masteryBonus(levelForXp(practice * MASTERY_XP_DIVISOR)).speed);
        if (t + interval > summary.simulated) break;
        t += interval; actions++; practice += 3;
    }
    assert.ok(Math.abs(g2.state.stats.actionsBySkill.mining - actions) <= 1, `${g2.state.stats.actionsBySkill.mining} vs ${actions}`);
    assert.ok(actions > Math.floor(summary.simulated / actionInterval(3000, derived, 'mining')), 'mastery made it faster');
    const ore = g2.state.resources.copper_ore;
    assert.ok(ore > actions * 1.1 && ore < actions * 1.3, `mastery doubles some ore: ${ore} from ${actions}`);
});

test('achievements apply real bonuses through the modifier pipeline', () => {
    const game = new Game(null, T0);
    const before = game.derived.maxHp;
    game.state.stats.kills = 10; // "First Blood": +5% max HP, plus the +1% global bonus
    game.tick(T0 + 100);
    assert.ok(game.state.achievements.first_blood);
    assert.ok(game.derived.maxHp > before, `${game.derived.maxHp} > ${before}`);
});

test('combat: kills pay gold and combat XP and advance the stage', () => {
    const game = new Game(null, T0);
    game.state.resources.copper_bar = 3;
    game.state.inventory.push(generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper' }, 999));
    game.equipItem(999);
    game.enterCombat();
    run(game, 60_000);
    assert.ok(game.state.stats.kills >= 3);
    assert.ok(game.state.gold > 0);
    assert.ok(game.state.skills.combat.xp > 0);
    assert.ok(game.state.combat.maxStage > 1);
});

test('combat: death retreats to the start of the zone and stops combat', () => {
    const game = new Game(null, T0);
    game.state.combat.stage = 20;
    game.state.combat.maxStage = 20;
    game.enterCombat();
    run(game, 120_000);
    assert.equal(game.state.combat.active, false);
    assert.equal(game.state.stats.deaths, 1);
    assert.equal(game.state.combat.stage, 11);
});

test('defence is rating-based: equal DEF halves damage and mitigation caps at 90%', () => {
    assert.equal(enemyDamage(100, 0), 100);
    assert.equal(enemyDamage(100, 100), 50);
    assert.equal(enemyDamage(100, 1e9), 10);
    assert.equal(enemyDamage(3, 1e9), 1);
});

test('HP regenerates quickly out of combat and slowly in it', () => {
    const game = new Game(null, T0);
    game.state.combat.hp = 10;
    run(game, 10_000);
    assert.ok(game.state.combat.hp > 29, `rested hp ${game.state.combat.hp}`);
});

test('enemy HP roughly doubles per zone inside the authored stages', () => {
    const ratio = enemyForStage(21).maxHp / enemyForStage(11).maxHp;
    assert.ok(ratio > 1.9 && ratio < 2.2, `ratio ${ratio}`);
    assert.ok(enemyForStage(10).boss && !enemyForStage(11).boss);
});

test('prestige converts the run into tokens and skill points, resetting only run-scoped progress', () => {
    const game = new Game(null, T0);
    game.state.combat.stage = 40;
    game.state.combat.maxStage = 40;
    game.state.combat.bestStage = 40;
    game.state.gold = 5000;
    game.state.camp.whetstone = 5;
    game.state.skills.mining.xp = xpForLevel(30);
    game.state.resources.iron_bar = 12;
    const atkBefore = game.derived.atk;
    const expected = tokensForStage(40, game.derived.tokenMult);
    assert.equal(game.prestige(), false, 'a run lasts at least ten minutes');
    game.now = T0 + 10 * 60 * 1000;
    assert.ok(game.prestige());
    assert.equal(game.state.prestige.tokens, expected);
    assert.ok(game.state.prestige.skillPoints >= 2);
    assert.equal(game.state.combat.stage, 4);
    assert.equal(game.state.gold, 0);
    assert.equal(game.state.camp.whetstone, 0);
    assert.equal(levelForXp(game.state.skills.mining.xp), 30);
    assert.equal(game.state.resources.iron_bar, 12);
    assert.ok(game.derived.tokenPowerPct > 0);
    assert.ok(atkBefore > 0);
});

test('prestige tokens grow with stage and are zero below stage 10', () => {
    assert.equal(tokensForStage(9), 0);
    let previous = 0;
    for (const stage of [10, 20, 50, 100, 150]) {
        const tokens = tokensForStage(stage);
        assert.ok(tokens > previous);
        previous = tokens;
    }
});

test('gold shop has no buy-low/sell-high loop (the old Coal Wagon printed gold)', () => {
    const game = new Game(null, T0);
    for (const stage of [1, 25, 60, 100]) {
        game.state.combat.bestStage = stage;
        for (const entry of GOLD_SHOP) {
            const resale = Object.entries(entry.gives).reduce((sum, [id, qty]) => sum + sellValue(id) * qty, 0);
            assert.ok(goldShopPrice(game, entry) > resale, `${entry.id} at stage ${stage}`);
        }
    }
});

test('mini-games only start on an opportunity, and a win boosts skill speed', () => {
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    assert.equal(game.startMinigame('mining'), false, 'no opportunity yet');
    const mg = game.state.minigame.mining;
    let now = game.now;
    while (!(mg.opportunityUntil > now) && now < T0 + 120_000) { now += 100; game.tick(now); }
    assert.ok(mg.opportunityUntil > now, 'first opportunity appears within 90 s of training');
    assert.ok(game.startMinigame('mining'));
    mg.challenge.zoneStart = 0; // widen the target zone so the tap is guaranteed to land
    mg.challenge.zoneWidth = 1;
    const speedBefore = game.derived.skillSpeed.mining;
    assert.ok(game.resolveMinigame('mining'));
    assert.ok(game.derived.skillSpeed.mining > speedBefore);
});

test('daily crate is available on a fresh save and then waits 20 hours', () => {
    const game = new Game(null, T0);
    assert.ok(game.dailyReady());
    const reward = game.claimDaily();
    assert.ok(reward.gold > 0);
    assert.equal(game.dailyReady(), false);
    game.now = T0 + 20 * 3600 * 1000 + 1;
    assert.ok(game.dailyReady());
});

test('smithing unlocks armour piece by piece', () => {
    const game = new Game(null, T0);
    game.state.resources.copper_bar = 10;
    assert.ok(game.startSmithing('Weapon', 'copper_bar'), 'swords at level 1');
    game.stopAction();
    assert.equal(game.startSmithing('Body', 'copper_bar'), false, 'plate bodies need level 10');
    game.state.skills.smithing.xp = xpForLevel(10);
    assert.ok(game.startSmithing('Body', 'copper_bar'));
});

test('a boss that survives 30 s of fighting escapes; the player regroups one stage back', () => {
    const game = new Game(null, T0);
    game.state.combat.stage = 10;
    game.state.combat.maxStage = 10;
    // Unarmed, the player cannot kill the stage-10 boss within 30 s; plenty of food keeps them alive.
    game.state.resources.cooked_dragon = 500;
    game.setStage(10);
    game.enterCombat();
    run(game, 31_000);
    assert.equal(game.state.stats.bossEscapes, 1);
    assert.equal(game.state.combat.stage, 9);
    assert.ok(game.state.combat.regroupLeft > 0);
    run(game, 61_000);
    assert.equal(game.state.combat.regroupLeft, 0, 'the regroup window ends');
});

test('unlocks follow the player instead of a forced script', () => {
    const game = new Game(null, T0);
    assert.ok(!game.state.unlocks.smithing);
    game.startNodeAction('mining', 'copper_ore');
    run(game, 16_000);
    assert.ok(game.state.unlocks.smithing, 'mining a few ores unlocks smithing');
});

test('migration: an original prototype save keeps resources, levels, stage and tokens', () => {
    const legacy = {
        resources: { gold: 321, copper: 40, normal_wood: 5, iron_bar: 2 },
        skills: { mining: { level: 15 }, woodcutting: { level: 3 } },
        combat: { maxStage: 25, highestPrestigeStage: 31, tokens: 7, skillPoints: 1, stage: 20 },
        shop: { skills: { knight: 2, warlord: 1, rogue: 0 } },
        achievements: ['slayer1', 'miner1'],
        flags: { lastSaveTime: T0 - 1000, prestigeCount: 3 },
        action: { type: 'smithing', id: 'Weapon', barId: 'copper_bar' }
    };
    const state = migrateState(legacy, T0);
    assert.equal(state.version, SAVE_VERSION);
    assert.equal(state.gold, 321);
    assert.equal(state.resources.copper_ore, 40);
    assert.equal(state.resources.normal_log, 5);
    assert.equal(levelForXp(state.skills.mining.xp), 15);
    assert.equal(state.combat.maxStage, 25);
    assert.equal(state.combat.bestStage, 31);
    assert.equal(state.prestige.tokens, 7);
    assert.equal(state.perks.knight, 2);
    assert.ok(state.achievements.slayer_1 && state.achievements.excavator);
    assert.equal(state.action, null, 'the broken v1 workshop action is dropped');
    // and the migrated state actually runs
    const game = new Game(state, T0);
    game.tick(T0 + 100);
});

test('state survives a serialize/load round trip', () => {
    const game = new Game(null, T0);
    game.state.gold = 77;
    game.state.resources.coal = 9;
    const copy = new Game(JSON.parse(game.serialize()), T0);
    assert.equal(copy.state.gold, 77);
    assert.equal(copy.state.resources.coal, 9);
    assert.deepEqual(Object.keys(copy.state).sort(), Object.keys(createDefaultState(T0)).sort());
});

test('focus: a minute without input adds skill and attack speed; input ends it', () => {
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    const base = game.derived.skillSpeed.mining;
    run(game, 61_000);
    assert.ok(game.derived.focused);
    assert.ok(Math.abs(game.derived.skillSpeed.mining - base - 0.15) < 1e-9);
    game.noteInput(game.now);
    assert.equal(game.derived.focused, false);
    assert.ok(Math.abs(game.derived.skillSpeed.mining - base) < 1e-9);
});

test('daily crates ripen every 20 h and bank up to three', () => {
    const game = new Game(null, T0);
    assert.equal(game.state.daily.banked, 1);
    assert.ok(game.claimDaily());
    assert.equal(game.dailyReady(), false);
    game.now = T0 + DAILY_INTERVAL_MS + 1;
    assert.ok(game.dailyReady());
    game.now = T0 + 10 * DAILY_INTERVAL_MS;
    assert.ok(game.dailyReady());
    assert.equal(game.state.daily.banked, DAILY_MAX_BANKED);
    for (let i = 0; i < DAILY_MAX_BANKED; i++) assert.ok(game.claimDaily());
    assert.equal(game.claimDaily(), null);
});

test('migration v2 -> v3 turns the old daily timestamp into banked crates', () => {
    const v2 = { ...createDefaultState(T0), version: 2, daily: { lastClaim: T0 - 30 * 3600 * 1000 } };
    delete v2.daily.banked;
    const state = migrateState(v2, T0);
    assert.equal(state.version, SAVE_VERSION);
    assert.equal(state.daily.banked, 1);
    const fresh = migrateState({ ...createDefaultState(T0), version: 2, daily: { lastClaim: T0 - 1000 } }, T0);
    assert.equal(fresh.daily.banked, 0);
    // v2 held one waiting crate at most: after 41 hours there is still just the one.
    const old = new Game({ ...createDefaultState(T0), version: 2, daily: { lastClaim: T0 - 41 * 3600 * 1000 } }, T0);
    old.tick(T0 + 1000);
    assert.equal(old.state.daily.banked, 1);
});

test('a save cannot reach Object.prototype, and a broken section loads as defaults', () => {
    migrateState(JSON.parse('{"version":3,"__proto__":{"polluted":1},"meta":{"__proto__":{"polluted":1}},"combat":{"constructor":{"prototype":{"polluted":1}}}}'), T0);
    assert.equal(({}).polluted, undefined);
    const base = JSON.parse(JSON.stringify(createDefaultState(T0)));
    for (const section of Object.keys(base)) {
        for (const bad of [null, 'x', [], 1e308]) {
            const game = new Game({ ...base, [section]: bad }, T0);
            game.resumeFromSave(T0 + 3600_000);
            game.tick(T0 + 3600_100);
            assert.ok(game.serialize().length > 0, `${section} = ${JSON.stringify(bad)}`);
        }
    }
});

test('a hostile save string is rebuilt from the game\'s own tables', () => {
    const X = '<img src=x onerror=alert(1)>';
    const s = JSON.parse(JSON.stringify(createDefaultState(T0)));
    s.prestige.skillPoints = X; s.camp.whetstone = X; s.stats.kills = X; s.gold = X; s.combat.potion = X;
    s.equipped.Weapon = { id: '1)"><b>', type: 'Weapon', tier: X, name: X, rarity: X, color: 'red" onmouseover="x', icon: X, atk: X, def: 5, affixes: [{ stat: '__proto__', value: 1 }], upgrade: X };
    s.inventory = [{ id: 7, type: X }, { id: 8, type: 'Ring', name: 'Ring', rarity: 'epic', atk: 3, def: 1 }, 'junk'];
    s.log = [{ t: 1, type: 'x" onclick="y', text: X }];
    const st = new Game(s, T0).state;
    const w = st.equipped.Weapon;
    assert.ok(Number.isSafeInteger(w.id) && w.tier === 1 && w.rarity === 'common' && w.atk === 0 && w.affixes.length === 0);
    assert.match(w.color, /^#[0-9a-f]{6}$/);
    assert.equal(w.name, X, 'text stays text: the UI escapes it');
    assert.deepEqual(st.inventory.map(i => i.type), ['Ring']);
    assert.equal(st.log[0].type, 'info');
    assert.equal(st.prestige.skillPoints, 0);
    assert.equal(st.gold, 0);
    assert.equal(st.combat.potion, 'none');
    const ids = [w.id, ...st.inventory.map(i => i.id)];
    assert.equal(new Set(ids).size, ids.length, 'item ids stay unique');
});

test('offline replay gives the same result as playing online for the same time', () => {
    const online = new Game(null, T0);
    online.state.meta.lastInputAt = T0 - 3600_000; // idle in both runs, so focus applies to both
    online.state.pets.pebble = true;                 // no pet roll mid-run to make the two runs diverge
    online.startNodeAction('mining', 'copper_ore');
    const saved = JSON.parse(online.serialize(T0));
    run(online, 10 * 60_000, 100);
    const offline = new Game(saved, T0 + 10 * 60_000);
    offline.resumeFromSave(T0 + 10 * 60_000);
    // Actions, XP and mastery are deterministic; the ore count differs only by lucky doubles.
    const [a, b] = [online, offline].map(g => g.state.stats.actionsBySkill.mining);
    assert.ok(Math.abs(a - b) <= 1, `online ${a} vs offline ${b} actions`);
    assert.ok(Math.abs(online.state.skills.mining.xp - offline.state.skills.mining.xp) <= 8);
    assert.ok(Math.abs(online.state.mastery.mining.copper_ore - offline.state.mastery.mining.copper_ore) <= 3);
    assert.ok(Math.abs(online.state.resources.copper_ore - offline.state.resources.copper_ore) <= 0.1 * a,
        `online ${online.state.resources.copper_ore} vs offline ${offline.state.resources.copper_ore} ore`);
});

test('a 12 h offline combat replay is silent and fast', () => {
    const game = new Game(null, T0);
    game.state.inventory.push(generateEquipment({ type: 'Weapon', tier: 3, power: 4.8, materialName: 'Mithril' }, 900));
    game.state.skills.combat.xp = xpForLevel(30);
    game.equipItem(900);
    game.state.resources.cooked_boar = 5000;
    game.setFarmMode(true); // stay on stage 1 so the fight lasts the whole 12 hours
    game.enterCombat();
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 12 * 3600 * 1000;
    const g2 = new Game(saved, later);
    const started = Date.now();
    const summary = g2.resumeFromSave(later);
    assert.ok(Date.now() - started < 5000, `replay took ${Date.now() - started} ms`);
    assert.equal(summary.mode, 'combat');
    assert.equal(summary.died, false);
    assert.ok(summary.kills > 20000, `kills ${summary.kills}`);
    const leaked = g2.events.filter(e => ['hit', 'enemyHit', 'kill', 'levelUp', 'actionComplete'].includes(e.type));
    assert.equal(leaked.length, 0, 'per-hit and per-kill events stay out of a silent replay');
});

test('the advisor points a new player at the next step', () => {
    const game = new Game(null, T0);
    const first = advise(game);
    assert.equal(first.length, 1, 'a new player gets one note');
    assert.match(first[0].text, /Mine 5 ore/);
    assert.equal(first[0].goal, 'smithing');
    assert.equal(first[0].tab, 'mining', 'the note leads to where the work is');
    assert.equal(first[0].progress, 0);
    assert.doesNotMatch(first.map(t => t.text).join(' | '), /crate/, 'the daily crate has its own button and is not said twice');
    game.state.stats.actionsBySkill.mining = 2;
    assert.equal(advise(game)[0].progress, 0.4, 'the goal carries how far along it is');
    game.state.unlocks.smithing = true;
    game.state.resources.copper_bar = 3;
    const forge = advise(game);
    assert.equal(forge[0].goal, 'woodcutting', 'the next unlock leads the list');
    assert.match(forge[1].text, /Forge a Copper Sword/);
    assert.equal(forge[1].view, 'forge', 'and names the step of Smithing to open');
    game.state.inventory.push(generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper' }, 77));
    const equip = advise(game);
    assert.equal(equip.length, 2, 'two notes while the first zone is still ahead');
    assert.match(equip[1].text, /Equip Copper Sword/);
    assert.equal(advise(game, 1).length, 1, 'a list of one is the goal alone');
    assert.equal(advise(game, 1)[0].goal, 'woodcutting');
    assert.equal(adviceLimit(game.state), 2);
    game.state.combat.bestStage = 12;
    assert.equal(adviceLimit(game.state), 3, 'room for three notes after the first boss');
});

test('names get the article that fits them', () => {
    const game = new Game(null, T0);
    game.state.unlocks.smithing = true;
    game.state.unlocks.woodcutting = true;
    game.state.skills.smithing.xp = xpForLevel(15);
    game.state.equipped.Weapon = generateEquipment({ type: 'Weapon', tier: 1, power: 1, materialName: 'Copper' }, 78);
    game.state.resources.iron_bar = 3;
    assert.match(advise(game, 6).map(t => t.text).join(' | '), /Forge an Iron Sword/);
    game.state.resources.iron_bar = 0;
    assert.match(advise(game, 6).map(t => t.text).join(' | '), /for an Iron Sword/);
});
