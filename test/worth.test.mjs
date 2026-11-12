// One measure for gear and the camp (the research loop's P-075, 12 November 2026; systems/worth.js): what a change is
// worth in stages at the wall that binds, counting defence only below the 90% cap and health only while a boss's blow
// still threatens. Deep heroes are built from the game's own drops (generateDrop) and checked against what research
// loop 047 measured a deep drop is worth: ln(damage a second with it ÷ without) over ln(the boss's health growth a stage).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { deriveStats, collectModifiers } from '../src/core/modifiers.js';
import { generateDrop, enemyForStage, enemyBaseStats, enemyDamage, goldPerKillAtStage } from '../src/core/formulas.js';
import { zoneForStage } from '../src/data/zones.js';
import { EQUIP_SLOTS, TYPE_SLOTS, SMITHING_TYPES } from '../src/data/items.js';
import { CAMP_GOLD } from '../src/data/camp.js';
import { expectedDps } from '../src/core/power.js';
import { migrateState } from '../src/core/state.js';
import { wallJudge, judgeOf, wallStage, wallCampLevels, THREAT_SHARE } from '../src/systems/worth.js';
import { equipGain, gainStages, findUpgrade, isUpgrade, weakerInBag, bagByWorth, addItem, itemScore } from '../src/systems/inventory.js';

const T0 = 1_760_000_000_000;
const KINDS = Object.keys(TYPE_SLOTS);
const NO_ATTACK = ['Shield', 'Head', 'Body', 'Legs'];   // 40 of the drop table's 100 weights carry no attack
const typeOf = slot => KINDS.find(t => TYPE_SLOTS[t].includes(slot));

/**
 * A hero at his wall at `best`: legendary drops from 60 stages back in every slot, forge and bench levels, the camp a
 * run near its best buys (as tools/ledger.mjs sets it), Combat Potion III running, Knight, Warlord and Rogue, and the
 * tokens that make the wall's boss fall in about 28 of its 30 seconds: the clock is his wall.
 */
function deepHero(best, seed = 1) {
    rng.setSource(seededRandom(seed));
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = s.combat.maxStage = s.combat.stage = best;
    s.skills.combat.xp = xpForLevel(99);
    s.settings.autoSalvage = 'off';
    const z = zoneForStage(best - 60);
    for (const slot of EQUIP_SLOTS) s.equipped[slot] = generateDrop(z.gearTier, true, s.idCounter++, z.depth, [{ type: typeOf(slot), weight: 1 }], { rarity: 'legendary', tier: z.gearTier });
    const level = Math.round(best / 40);
    for (const t of SMITHING_TYPES) s.forge[t] = { level, tier: 7 };
    for (const slot of ['Neck', 'Ring1', 'Ring2', 'Ear1', 'Ear2']) s.bench[slot] = { level, tier: 7 };
    const past = Math.max(0, Math.floor(Math.log(Math.max(1, 100 * goldPerKillAtStage(best) / CAMP_GOLD.base)) / Math.log(CAMP_GOLD.growth)));
    s.camp = { whetstone: CAMP_GOLD.from + past, armory: CAMP_GOLD.from + past, hearth: CAMP_GOLD.from + past };
    s.resources.combat_potion_3 = 500;
    s.combat.potion = 'combat_potion_3';
    s.combat.potionMs = 60000;
    Object.assign(s.perks, { knight: 25, warlord: 25, rogue: 15 });
    s.prestige.count = 200;
    const boss = enemyForStage(wallStage(best));
    let lo = 1, hi = 1e15;
    for (let i = 0; i < 70; i++) {
        s.prestige.tokens = Math.sqrt(lo * hi);
        game.recompute();
        if (boss.hp / expectedDps(game.derived) > 28) lo = s.prestige.tokens; else hi = s.prestige.tokens;
    }
    game.recompute();
    return game;
}

/** 047's worth of a piece: ln(damage a second with it ÷ without), over ln(the boss's health growth a stage). */
function measuredWorth(game, item, slot) {
    const s = game.state;
    const judge = wallJudge(s, game);
    const before = expectedDps(deriveStats(s));
    const after = expectedDps(deriveStats({ ...s, equipped: { ...s.equipped, [slot]: item } }));
    return Math.log(after / before) / Math.log(judge.wall.gHp);
}

/** What the Equip card said before the measure (gainStages until 12 November 2026): no cap, no threat. */
function oldCard(state, gain) {
    const best = state.combat.bestStage;
    const here = enemyBaseStats(best);
    const next = enemyBaseStats(best + 1);
    const ln = v => Math.log(1 + Math.max(-0.99, v));
    const boss = ln(gain.atk) / Math.log(next.hp / here.hp);
    const blow = (ln(gain.def) + ln(gain.hp)) / (2 * Math.log(next.atk / here.atk));
    return Math.abs(boss) >= Math.abs(blow) ? boss : blow;
}

const frontier = (game, type, rarity, id) => {
    const z = zoneForStage(game.state.combat.bestStage);
    return generateDrop(z.gearTier, true, id, z.depth, [{ type, weight: 1 }], { rarity, tier: z.gearTier });
};

for (const best of [700, 1300, 2000]) {
    test(`at stage ${best} the Equip card says what a frontier piece is worth: armour without attack next to nothing, the weapon most`, () => {
        const game = deepHero(best);
        const s = game.state;
        const judge = judgeOf(game);
        assert.ok(judge.wall.threat < THREAT_SHARE, `a boss's blow is ${(100 * judge.wall.threat).toFixed(2)}% of his health: it doesn't threaten him`);
        assert.equal(judge.wall.survival, false);
        // (and he really stands at the clock: the boss falls in about its 30 s)
        const kill = enemyForStage(judge.wall.stage).hp / expectedDps(game.derived);
        assert.ok(kill > 25 && kill < 30, `${kill.toFixed(1)} s`);
        rng.setSource(seededRandom(best));
        for (const rarity of ['legendary', 'mythic']) {
            for (const type of KINDS) {
                const rolls = Array.from({ length: 8 }, (_, i) => frontier(game, type, rarity, 50000 + i));
                let card = 0, measured = 0, old = 0;
                for (const item of rolls) {
                    const { slot, stages } = judge.place(item);
                    const worth = measuredWorth(game, item, slot);
                    assert.ok(Math.abs(stages - worth) <= 2, `${rarity} ${type}: the card says ${stages.toFixed(1)}, it is worth ${worth.toFixed(1)}`);
                    card += stages / rolls.length;
                    measured += worth / rolls.length;
                    old += oldCard(s, equipGain(s, item, slot)) / rolls.length;
                }
                if (NO_ATTACK.includes(type)) {
                    assert.ok(Math.abs(card) <= 2, `${rarity} ${type}: ${card.toFixed(1)} stages, all of it from its bonuses`);
                    assert.ok(old >= 5, `${rarity} ${type}: the old card said ${old.toFixed(1)}`);
                }
                if (type === 'Weapon') assert.ok(card >= 15, `${rarity} weapon: ${card.toFixed(1)} stages`);
                if (['Gloves', 'Ring', 'Neck', 'Ear'].includes(type)) assert.ok(card >= 2, `${rarity} ${type}: ${card.toFixed(1)} stages`);
            }
        }
    });
}

test('deep, the dock offers the sword before the plate, the ▲ and Weaker take the plate for what it is, and the bag is in that order', () => {
    const game = deepHero(1300);
    const s = game.state;
    rng.setSource(seededRandom(5));
    const plate = frontier(game, 'Body', 'mythic', 60001);
    plate.affixes = plate.affixes.filter(a => !['critChance', 'critDmg', 'attackSpeed'].includes(a.stat));   // nothing for the clock
    const sword = frontier(game, 'Weapon', 'legendary', 60002);
    s.inventory.push(plate, sword);
    const judge = judgeOf(game);
    assert.ok(itemScore(plate) - itemScore(s.equipped.Body) > itemScore(sword) - itemScore(s.equipped.Weapon), 'by score the plate gains more');
    assert.equal(findUpgrade(s, judge).item, sword, 'the dock offers the sword');
    assert.ok(isUpgrade(s, sword, judge));
    assert.equal(isUpgrade(s, plate, judge), judge.worth(plate) > 0, 'the ▲ is the measure');
    assert.deepEqual(bagByWorth(s, judge).map(e => e.item.id), [60002, 60001], 'the sword first');
    // a plate whose bonuses give the clock less than the one worn: no ▲, and Weaker takes it as it lands
    const worn = s.equipped.Body;
    worn.affixes = [{ id: 'critDmg', name: 'Crit Damage', stat: 'critDmg', value: 0.2, format: 'pct' }];
    game.recompute();
    const now = judgeOf(game);
    assert.ok(now.worth(plate) < 0, `${now.worth(plate).toFixed(2)} stages`);
    assert.equal(isUpgrade(s, plate, now), false);
    assert.ok(weakerInBag(s, now).includes(plate), 'Salvage weaker takes it');
    s.inventory = [];
    s.settings.autoSalvage = 'weaker';
    assert.equal(addItem(game, plate).kept, false, 'the Weaker auto-salvage takes it as it lands');
    assert.equal(addItem(game, sword).kept, true, 'and keeps the sword');
});

test('where a boss\'s blow threatens, defence and health still count, and defence only below the 90% cap', () => {
    const game = deepHero(300);
    const s = game.state;
    const judge = judgeOf(game);
    assert.ok(judge.wall.threat >= THREAT_SHARE, `a blow is ${(100 * judge.wall.threat).toFixed(0)}% of his health`);
    rng.setSource(seededRandom(9));
    const plate = frontier(game, 'Body', 'legendary', 61001);
    plate.affixes = s.equipped.Body.affixes.map(a => ({ ...a }));   // the worn plate's bonuses: only its defence differs
    const gain = judge.gain(plate);
    assert.ok(gain.def > 0.05 && Math.abs(gain.dps) < 1e-12, 'a plate: defence and health, nothing for the clock');
    assert.ok(judge.worth(plate) > 5, `${judge.worth(plate).toFixed(1)} stages at the blow`);
    // defence past the cap is only a number, health still counts: a hero with nine times the boss's attack and more
    const atk = enemyForStage(judge.wall.stage).atk;
    const capped = wallJudge(s, { mods: game.mods, derived: { ...game.derived, def: 1000 * atk, maxHp: atk / 2 } });
    assert.ok(capped.wall.survival, 'his blow is a fifth of his health even at the cap');
    assert.ok(Math.abs(capped.stagesOf({ atk: 0, def: 1, hp: 0 })) < 1e-9, 'twice the defence: nothing');
    assert.ok(capped.stagesOf({ atk: 0, def: 0, hp: 1 }) > 5, 'twice the health: stages');
    assert.equal(enemyDamage(atk, 1000 * atk), enemyDamage(atk, 2000 * atk), '(the fight agrees: the blow is the same)');
    // Glass Hero: the first blow that lands fells him, whatever his defence and health
    s.trials.active = ['glass'];
    game.recompute();
    const glass = judgeOf(game);
    assert.equal(glass.wall.survival, false);
    assert.ok(Math.abs(glass.worth(plate) - Math.log(1 + glass.gain(plate).dps) / Math.log(glass.wall.gHp)) < 1e-9, 'a plate is worth what it does for the clock');
    s.trials.active = null;
});

test('the old ratios still read: gainStages counts the wall that binds', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 900;
    assert.ok(Math.abs(gainStages(s, { atk: 1, def: 0, hp: 0 }) - Math.log(2) / Math.log(1.035)) < 0.01, 'twice the attack');
    assert.equal(gainStages(s, { atk: Infinity, def: 0, hp: 0 }), null);
    const deep = deepHero(1300);
    assert.ok(Math.abs(gainStages(deep.state, { atk: 0, def: 0.5, hp: 0.5 })) < 1e-9, 'deep, half as much defence and health again is worth nothing');
});

test('gear is judged on the camp the hero has at his wall, not on a run that has just begun; the camp\'s levels on the run\'s', () => {
    const game = deepHero(1300);
    const s = game.state;
    s.meta.wallCamp = { ...s.camp };
    const atWall = judgeOf(game).wall;
    s.camp = { whetstone: 0, armory: 0, hearth: 0 };   // a new run
    game.recompute();
    const judge = judgeOf(game);
    assert.deepEqual(wallCampLevels(s), s.meta.wallCamp);
    assert.ok(Math.abs(judge.wall.threat / atWall.threat - 1) < 1e-6, 'the same wall');
    assert.equal(judge.wall.survival, false);
    const run = wallJudge(s, game, { camp: 'run' });
    assert.ok(run.wall.threat > judge.wall.threat * 100, 'the run itself, with no camp yet, is far from his wall');
});

test('a new best stage notes the camp that pushed it; a save keeps it, one from before has its run\'s when at its wall', async () => {
    const { onEnemyDeath, spawnEnemy } = await import('../src/systems/combat.js');
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.stage = s.combat.maxStage = s.combat.bestStage = 61;
    s.camp = { whetstone: 7, armory: 3, hearth: 5 };
    s.combat.active = true;
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.equal(s.combat.bestStage, 62);
    assert.deepEqual(s.meta.wallCamp, { whetstone: 7, armory: 3, hearth: 5 });
    const saved = JSON.parse(game.serialize(T0));
    assert.deepEqual(migrateState(saved, T0).meta.wallCamp, { whetstone: 7, armory: 3, hearth: 5 });
    saved.meta.wallCamp = { whetstone: -4, armory: 'x', hearth: 1e9 };
    assert.deepEqual(migrateState(saved, T0).meta.wallCamp, { whetstone: 0, armory: 0, hearth: 2500 }, 'whole levels in range');
    delete saved.meta.wallCamp;
    assert.deepEqual(migrateState(saved, T0).meta.wallCamp, { whetstone: 7, armory: 3, hearth: 5 }, 'at its wall: this run\'s');
    saved.combat.maxStage = 10;
    saved.combat.stage = 10;
    assert.equal(migrateState(saved, T0).meta.wallCamp, undefined, 'climbing back: none yet');
});

test('the game\'s judge is the one worked out afresh: the stats as they are, with the wall\'s camp, potion and Focus put in', () => {
    const game = deepHero(700);
    const s = game.state;
    s.meta.wallCamp = { ...s.camp };
    s.camp = { whetstone: 40, armory: 10, hearth: 20 };   // less than at the wall
    s.combat.potionMs = 0;                               // a bottle left, none running now
    s.meta.lastInputAt = T0;                             // and the player at the keys: no Focus
    game.now = T0;
    game.recompute();
    assert.equal(game.mods.focused, false);
    rng.setSource(seededRandom(3));
    const items = KINDS.flatMap((type, i) => [frontier(game, type, 'legendary', 70000 + i), frontier(game, type, 'mythic', 70100 + i)]);
    for (const mode of ['stages', 'dungeon', 'titan']) {
        s.combat.mode = mode;
        game.recompute();
        const fast = wallJudge(s, game);
        const fresh = wallJudge(s);
        for (const key of ['threat', 'def', 'hp', 'gHp', 'gAtk', 'stage']) assert.ok(Math.abs(fast.wall[key] / fresh.wall[key] - 1) < 1e-6, `${mode}: ${key}`);
        for (const item of items) assert.ok(Math.abs(fast.worth(item) - fresh.worth(item)) < 1e-6, `${mode}: ${item.type}`);
    }
    s.combat.mode = 'stages';
});

test('the measure only reads: the fight goes exactly as it would, and the state is untouched', () => {
    const run = ask => {
        rng.setSource(seededRandom(11));
        const game = new Game(null, T0);
        const s = game.state;
        s.skills.combat.xp = xpForLevel(40);
        s.combat.stage = s.combat.maxStage = s.combat.bestStage = 35;
        s.settings.autoSalvage = 'weaker';
        const z = zoneForStage(35);
        for (const type of ['Weapon', 'Shield', 'Body', 'Head']) s.equipped[type] = generateDrop(z.gearTier, true, s.idCounter++, 0, [{ type, weight: 1 }], { rarity: 'rare' });
        game.recompute();
        game.enterCombat();
        for (let t = 1; t <= 900; t++) {
            if (ask) {
                const before = JSON.stringify(s);
                const judge = judgeOf(game);
                findUpgrade(s, judge);
                bagByWorth(s, judge);
                weakerInBag(s, judge);
                for (const item of s.inventory) isUpgrade(s, item, judge);
                wallJudge(s).worth(s.inventory[0] || s.equipped.Weapon || { type: 'Weapon', atk: 1, def: 0, affixes: [] });
                assert.equal(JSON.stringify(s), before);
            }
            game.tick(T0 + t * 1000);
        }
        return { stats: deriveStats(s, collectModifiers(s)), state: JSON.parse(JSON.stringify(s)) };
    };
    const plain = run(false);
    const asked = run(true);
    assert.deepEqual(asked.stats, plain.stats);
    assert.deepEqual(asked.state, plain.state);
    assert.ok(plain.state.stats.kills > 50 && plain.state.stats.itemsDropped > 0, `${plain.state.stats.kills} kills, ${plain.state.stats.itemsDropped} drops`);
});
