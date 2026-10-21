// The October 2026 bug sweep: each test here is a defect the sweep found, as a scenario that went wrong
// before its fix (docs/ROADMAP.md, Phase 9: "The bug sweep"). Saves and their loading first, then the
// rules they feed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState, MAX_STAGE } from '../src/core/state.js';
import { loadLocal, localLoadProblem, LOCAL_KEY, LEGACY_KEY } from '../src/core/save.js';
import { xpForLevel } from '../src/core/xp.js';
import { BALANCE } from '../src/core/formulas.js';
import { BASE } from '../src/core/modifiers.js';
import { powerSummary, expectedDps as expectedDpsOf, clanFightDamage, clanAttackFromSave } from '../src/core/power.js';
import * as ACH from '../src/data/achievements.js';
import { TRIALS, TRIAL_TIERS, WEEK_MS, weeklyTrialAt } from '../src/data/trials.js';
import { prestigeWaitMs } from '../src/systems/prestige.js';
import { checkTrial } from '../src/systems/trials.js';
import { hasOpportunity } from '../src/systems/minigame.js';
import { grantXp } from '../src/systems/progress.js';
import { enemyForStage, generateEquipment } from '../src/core/formulas.js';
import { GEAR_TIERS, RARITIES, BAG_SIZE, salvageEssence } from '../src/data/items.js';
import { salvageBars, anvilMetal, ANVIL_REFUND } from '../src/data/workshop.js';
import { masteryActions, MASTERY_XP_DIVISOR, MASTERY_MAX_LEVEL } from '../src/data/mastery.js';
import { addMasteryXp, masteryLevel } from '../src/systems/mastery.js';
import { dungeonById } from '../src/data/dungeons.js';
import { onDungeonKill } from '../src/systems/dungeon.js';

rng.setSource(seededRandom(2026));
const T0 = 1_760_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const save = game => JSON.parse(game.serialize());
const reload = (game, now = game.now) => new Game(save(game), now);
const finiteStats = d => ['atk', 'def', 'maxHp', 'attackInterval'].every(k => Number.isFinite(d[k]) && d[k] >= 0);

test('the counts the medals read survive a reload: Trial Master comes at twenty tiers over many sittings', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 260;
    // a save from before the fix: twenty tiers cleared, and its count dropped on load
    for (const t of TRIALS.slice(0, 20 / TRIAL_TIERS)) s.trials.cleared[t.id] = TRIAL_TIERS;
    s.ascension.count = 2;
    const raw = save(game);
    delete raw.stats.trialTiers;
    delete raw.stats.ascensions;
    const back = new Game(raw, T0);
    assert.equal(back.state.stats.trialTiers, 20, 'counted again from the tiers the save holds');
    assert.equal(back.state.stats.ascensions, 2);
    back.tick(T0 + 1000);
    assert.equal(back.state.achievements.trial_master, true);
    assert.equal(back.state.achievements.ascendant, true);
    // and a count made in play is kept through a reload
    back.state.stats.trialsStarted = 3;
    assert.equal(reload(back).state.stats.trialsStarted, 3);
});

test('skills at 99 are counted on load (a save from before the count earns Completionist\'s progress)', () => {
    const game = new Game(null, T0);
    game.state.skills.mining.xp = xpForLevel(99);
    const raw = save(game);
    raw.stats.skills99 = 0;
    assert.equal(new Game(raw, T0).state.stats.skills99, 1);
});

test('numbers no save can hold are put back in range: tokens, stages, laurels, affixes, Titans', () => {
    const game = new Game(null, T0);
    const raw = save(game);
    raw.prestige.tokens = -1000;
    raw.prestige.spClaimedStage = -500;
    let s = new Game(raw, T0);
    assert.equal(s.state.prestige.tokens, 0);
    assert.equal(s.state.prestige.spClaimedStage, 0);
    assert.ok(s.derived.maxHp > 0 && finiteStats(s.derived));

    raw.prestige.tokens = 1.5e308;
    raw.trials = { laurels: 20000 };
    raw.combat.bestStage = 400000;
    raw.titan.kills = 1e9;
    raw.equipped.Weapon = { id: 5, type: 'Weapon', tier: 1, atk: 10, def: 0, affixes: [{ stat: 'attackSpeed', value: -3 }] };
    s = new Game(raw, T0);
    assert.ok(s.state.combat.bestStage <= MAX_STAGE);
    assert.ok(s.state.trials.laurels <= 5000);
    assert.ok(finiteStats(s.derived), JSON.stringify(s.derived));
    assert.ok(s.derived.attackInterval >= Math.round(BASE.baseAttackInterval / (1 + BASE.caps.attackSpeed)), 'never faster than the cap');
    assert.ok(Number.isFinite(enemyForStage(s.state.combat.bestStage).hp), 'the deepest stage a save holds is still a fight');
    s.enterCombat();
    s.tick(T0 + 10_000);
    assert.ok(Number.isFinite(s.state.combat.hp) && Number.isFinite(s.state.combat.enemy.hp));
    // an affix below nothing makes the hero no slower than his base
    raw.equipped.Weapon.affixes = [{ stat: 'attackSpeed', value: -1 }];
    s = new Game(raw, T0);
    assert.equal(s.derived.attackInterval, BASE.baseAttackInterval);
});

test('a save whose values throw when read as text or a number loads (and the server can still read it)', () => {
    const game = new Game(null, T0);
    const raw = save(game);
    const poison = { toString: 'x', valueOf: 'x' };
    raw.inventory = [{ id: 9, type: poison, rarity: poison }, { id: 10, type: 'Weapon', tier: 1, rarity: poison, name: poison, affixes: [{ id: poison, stat: 'critChance', value: 0.02 }] }];
    raw.chronicle = [{ t: T0, kind: 'start', id: poison }];
    raw.combat.pack = { stage: poison, killed: poison };
    raw.combat.dungeon = { id: 'goblin_warren', index: poison, choiceLeft: poison };
    raw.ascension = { count: poison };
    raw.trials = { laurels: poison, cleared: { brutes: poison }, weekly: { id: 'brutes', start: poison } };
    raw.playtest = [{ t: T0, kind: 'start', what: poison }];
    raw.mastery = { mining: { copper_ore: poison } };
    raw.action = { kind: 'node', skill: poison, id: 'copper_ore' };
    let back;
    assert.doesNotThrow(() => { back = new Game(raw, T0); });
    assert.equal(back.state.inventory.length, 1, 'the piece with no type is dropped, the other kept');
    assert.equal(back.state.action, null);
    assert.doesNotThrow(() => powerSummary(raw, T0));
});

test('work from a save that names something no game has, or whose progress is not a number, is dropped or reset', () => {
    const game = new Game(null, T0);
    const raw = save(game);
    raw.action = { kind: 'tool', tool: 'toString', tier: 1 };
    assert.equal(new Game(raw, T0).state.action, null);
    raw.action = { kind: 'node', skill: 'constructor', id: 'x' };
    assert.equal(new Game(raw, T0).state.action, null);
    raw.action = { kind: 'node', skill: 'mining', id: 'copper_ore', progress: 'x1000' };
    const g = new Game(raw, T0);
    assert.equal(g.state.action.progress, 0);
    g.tick(T0 + 60_000);
    assert.ok(g.state.resources.copper_ore > 0, 'and the work goes on');
    // work and a fight both under way (a hand-made save): the fight goes on alone
    raw.combat.active = true;
    assert.equal(new Game(raw, T0).state.action, null);
});

test('a chronicle date no calendar holds is dropped, not left to break the Records', () => {
    const game = new Game(null, T0);
    const raw = save(game);
    raw.chronicle = [{ t: 9e15, kind: 'start', id: '' }, { t: T0, kind: 'start', id: '' }];
    raw.log = [{ t: 9e15, type: 'info', text: 'far future' }];
    const s = new Game(raw, T0).state;
    assert.equal(s.chronicle.length, 1);
    assert.doesNotThrow(() => new Date(s.log[0].t).toISOString());
});

test('a save from before attended time counts its play as attended (the next place does not wait a whole breather)', () => {
    const game = new Game(null, T0);
    const raw = save(game);
    raw.meta.playtimeMs = 1.8 * HOUR;
    delete raw.meta.attendedMs;
    assert.equal(new Game(raw, T0).state.meta.attendedMs, 1.8 * HOUR);
});

test('back after a day away: the crates that ripened are waiting before the welcome-back is written', () => {
    const game = new Game(null, T0);
    game.state.daily.banked = 0;
    game.state.daily.nextAt = T0 + HOUR;
    const back = new Game(save(game), T0);
    back.resumeFromSave(T0 + 30 * HOUR);
    assert.ok(back.state.daily.banked >= 1);
});

test('an unreadable save is kept and reported, never replaced by the prototype\'s save behind it', () => {
    const store = new Map();
    const before = globalThis.localStorage;
    globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    try {
        store.set(LOCAL_KEY, '{"version":3,"meta":{"crea');   // cut off
        store.set(LEGACY_KEY, JSON.stringify({ version: 1, flags: { prestigeCount: 1 }, combat: { maxStage: 4 } }));
        assert.equal(loadLocal(T0), null);
        assert.equal(localLoadProblem(), LOCAL_KEY);
        assert.ok([...store.keys()].some(k => k.startsWith(`${LOCAL_KEY}.corrupt.`)), 'a copy is kept');
        store.delete(LOCAL_KEY);
        assert.ok(loadLocal(T0), 'with no save of its own, the prototype\'s is still migrated');
        assert.equal(localLoadProblem(), null);
    } finally {
        globalThis.localStorage = before;
    }
});

test('a Titan fight the page closed on is scored as a Give up: essence for the damage, the best try kept', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 60;
    game.recompute();
    assert.equal(game.challengeTitan(), true);
    for (let t = 1; t <= 6; t++) game.tick(T0 + t * 1000);
    const enemy = game.state.combat.enemy;
    assert.ok(enemy.hp < enemy.maxHp, 'he has hit it');
    enemy.hp = enemy.maxHp / 2;   // half its health taken (a new hero's few seconds are worth no essence yet)
    const essence = game.state.resources.essence;
    const back = reload(game);
    assert.equal(back.state.combat.mode, 'stages');
    assert.ok(back.state.resources.essence > essence);
    assert.ok(back.state.titan.bestPct > 0);
});

test('mini-games: one clock for every skill (switching skills finds no chance waiting), and a reload is a miss', () => {
    const game = new Game(null, T0);
    game.state.skills.woodcutting.xp = xpForLevel(10);
    game.startNodeAction('mining', 'copper_ore');
    let now = T0;
    while (!hasOpportunity(game.state, 'mining', now) && now < T0 + 5 * MIN) game.tick(now += 1000);
    assert.ok(hasOpportunity(game.state, 'mining', now), 'mining\'s first chance');
    const mg = game.state.minigame;
    assert.ok(mg.woodcutting.nextOpportunityAt >= now + BALANCE.minigame.opportunityEveryMs[0], 'the other skills wait their turn');
    // played and missed: the next chance, in any skill, is minutes away
    game.startMinigame('mining');
    game.failMinigame('mining');
    game.startNodeAction('woodcutting', 'normal_log');
    for (let i = 0; i < 60; i++) game.tick(now += 1000);
    assert.equal(hasOpportunity(game.state, 'woodcutting', now), false);
    assert.ok(mg.woodcutting.nextOpportunityAt >= mg.mining.nextOpportunityAt);

    // a challenge open at a reload counts as missed: the streak ends and the next chance is minutes away
    mg.woodcutting.streak = 3;
    mg.woodcutting.challenge = { type: 'timing', zoneStart: 0.3, zoneWidth: 0.16, cycleMs: 1000, startedAt: now, expiresAt: now + 10_000 };
    const back = reload(game, now);
    const w = back.state.minigame.woodcutting;
    assert.equal(w.challenge, null);
    assert.equal(w.streak, 0);
    assert.ok(w.nextOpportunityAt >= now + BALANCE.minigame.opportunityEveryMs[0]);
});

test('Fasting: a combat level-up in the fight brings no health back', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.trials.active = 'fasting';
    game.recompute();
    game.enterCombat();
    s.combat.hp = Math.floor(game.derived.maxHp * 0.3);
    const hp = s.combat.hp;
    grantXp(game, 'combat', xpForLevel(5));
    assert.equal(s.combat.hp, hp);
    // out of the Trial a level-up heals as ever
    s.trials.active = null;
    game.recompute();
    s.combat.hp = 5;
    grantXp(game, 'combat', xpForLevel(10));
    assert.equal(s.combat.hp, game.derived.maxHp);
});

test('the week\'s laurel asks for one stage past the best from before the week, even when a replay crosses Monday', () => {
    const now = T0;
    const { start, trial } = weeklyTrialAt(now);
    const game = new Game(null, now);
    const s = game.state;
    s.trials.active = trial.id;
    s.trials.best[trial.id] = 240;
    s.trials.weekly = { start: start - WEEK_MS, id: trial.id, bar: 200, won: true, best: 240 };
    s.combat.maxStage = 241;
    checkTrial(game);
    assert.equal(s.trials.weekly.bar, 240, 'the bar is the best before this week');
    assert.equal(s.trials.weekly.won, true, 'and stage 241 wins its laurel');
});

test('the clock turned back in play: the run\'s ten minutes count from the new time, not a day away', () => {
    const game = new Game(null, T0);
    const s = game.state;
    Object.assign(s.combat, { bestStage: 60, maxStage: 60, stage: 60 });
    Object.assign(s.prestige, { count: 3, firstAt: T0 - 86_400_000, runStartedAt: T0 });
    game.tick(T0 + 30 * MIN);
    game.tick(T0 + 30 * MIN - 86_400_000);   // the clock goes back a day
    assert.ok(prestigeWaitMs(s, game.now) <= 10 * MIN, `${prestigeWaitMs(s, game.now)} ms`);
});

test('the game\'s doors refuse what is not a number: the clock, a stage, an amount', () => {
    const game = new Game(null, T0);
    const now = game.now;
    assert.equal(game.tick(NaN), null);
    game.noteInput(NaN);
    assert.equal(game.now, now);
    assert.ok(Number.isFinite(game.state.meta.playtimeMs) && Number.isFinite(game.state.meta.lastInputAt));
    assert.equal(game.setStage(NaN), false);
    assert.equal(game.travel(undefined), false);
    assert.equal(game.state.combat.stage, 1);
    game.state.resources.copper_ore = 5;
    assert.equal(game.sellResource('copper_ore', NaN), 0);
    assert.ok(Number.isFinite(game.state.gold));
    assert.doesNotThrow(() => game.prestige(null));
    assert.equal(game.applyReward(null), null);
    assert.doesNotThrow(() => game.harvestAll(null));
});

test('a Swift boss that comes on mid-step escapes on its own 3-s clock, whatever the step (a hidden tab\'s 5 s)', () => {
    const { ACHIEVEMENTS } = ACH;
    const outcome = step => {
        rng.setSource(() => 0.5);   // no crits, dodges or gilded monsters: each hit deals exactly ATK
        const g = new Game(null, T0);
        const s = g.state;
        s.meta.lastInputAt = T0 + 1e12;   // no Focus
        for (const a of ACHIEVEMENTS) if (a.req.key !== 'maxStage' || a.req.value <= 250) s.achievements[a.id] = true;   // (every medal a hero at 250 can hold)
        s.skills.combat.xp = 2e8;
        Object.assign(s.combat, { bestStage: 250, maxStage: 19, stage: 19, autoEat: 'none' });
        s.trials.active = 'swift_bosses';
        s.equipped.Weapon = { id: 99, type: 'Weapon', tier: 1, atk: 10, def: 0, affixes: [{ stat: 'attackSpeed', value: 0.5 }] };
        g.recompute();
        g.enterCombat();
        s.combat.enemy.hp = 1;   // the stage-19 monster falls to the first swing, 1 s into the step
        for (let now = T0; now < T0 + 15_000;) g.tick(now = Math.min(T0 + 15_000, now + step));
        rng.setSource(seededRandom(2026));
        return { escapes: s.stats.bossEscapes, bossKills: s.stats.bossKills, stage: s.combat.stage };
    };
    const fine = outcome(100);
    assert.equal(fine.escapes, 1, 'the boss outlasts its 3 s');
    assert.deepEqual(outcome(5000), fine);
    assert.deepEqual(outcome(1000), fine);
});

test('the first boss\'s armour comes with its first real fall, even after a fall farmed on "stay on this stage"', () => {
    rng.setSource(seededRandom(5));
    const g = new Game(null, T0);
    const s = g.state;
    Object.assign(s.combat, { stage: 10, maxStage: 10, bestStage: 10 });
    s.stats.kills = 9;
    s.stats.bossEscapes = 1;
    s.skills.combat.xp = 2000;
    g.recompute();
    g.enterCombat();
    g.setFarmMode(true);
    let now = T0;
    while (s.stats.bossKills < 1 && now < T0 + 120_000) { g.tick(now += 100); if (s.combat.stage !== 10 && s.stats.bossKills < 1) g.setStage(10); }
    assert.equal(s.stats.bossKills, 1);
    assert.equal(s.stats.bossFalls, 0, 'a farmed boss pays as its monsters: no fall');
    g.setFarmMode(false);
    while (s.stats.bossFalls < 1 && now < T0 + 400_000) { g.tick(now += 100); if (s.combat.stage < 10) g.setStage(10); }
    const armour = [...s.inventory, ...Object.values(s.equipped)].filter(i => i && ['Head', 'Body', 'Shield'].includes(i.type));
    assert.equal(armour.length, 1);
    // a save from before the falls were counted: its boss kills stand for them
    const raw = save(g);
    delete raw.stats.bossFalls;
    raw.stats.bossKills = 4;
    assert.equal(new Game(raw, now).state.stats.bossFalls, 4);
    rng.setSource(seededRandom(2026));
});

test('the clan boss fight on screen is the hero the server reckons: its combat potion, but no Focus or Trial rule', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 210;
    s.equipped.Weapon = { id: 7, type: 'Weapon', tier: 6, atk: 2000, def: 0, affixes: [] };
    s.trials.active = 'rusted';
    s.resources.combat_potion_3 = 5;
    s.meta.lastInputAt = T0 - HOUR;   // idle: Focus
    game.recompute();
    game.setPotion('combat_potion_3');
    const before = save(game);   // what the server holds as the fight begins (the page saves first)
    game.startClanFight({ week: '2026-W42', hp: 1e12, maxHp: 1e12 });
    game.tick(game.now + 100);   // the fight drinks the potion at its start
    assert.ok(s.combat.potionMs > 0, 'the combat potion works against the clan boss (the owner, October 2026)');
    assert.equal(clanFightDamage(game.derived, []).damage, clanAttackFromSave(before, [], undefined, game.now).damage, 'the same damage');
    // and without a potion, the same as the boards' stable hero
    const plain = new Game(null, T0);
    Object.assign(plain.state.combat, { bestStage: 210 });
    plain.state.equipped.Weapon = { id: 8, type: 'Weapon', tier: 6, atk: 2000, def: 0, affixes: [] };
    plain.state.meta.lastInputAt = T0 - HOUR;
    plain.recompute();
    plain.startClanFight({ week: '2026-W42', hp: 1e12, maxHp: 1e12 });
    assert.equal(Math.round(expectedDpsOf(plain.derived)), Math.round(powerSummary(save(plain), plain.now).dps), 'the same damage a second');
});

test('the forge keeps its work in the slot: a piece salvaged gives back only what it is made of', () => {
    rng.setSource(seededRandom(9));
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.smithing.xp = xpForLevel(50);
    s.skills.combat.xp = xpForLevel(99);
    s.resources.copper_bar = 5000;
    s.resources.essence = 5000;
    const top = GEAR_TIERS.length;
    const sword = generateEquipment({ type: 'Weapon', tier: 1, power: GEAR_TIERS[0].power, materialName: GEAR_TIERS[0].name, rarity: RARITIES[0], source: 'drop' }, s.idCounter++);
    s.inventory.push(sword);
    game.equipItem(sword.id, 'Weapon');
    for (let i = 0; i < 10; i++) assert.equal(game.reinforceItem(sword.id), true);
    assert.equal(s.forge.Weapon.level, 10);
    const plain = generateEquipment({ type: 'Weapon', tier: top, power: GEAR_TIERS[top - 1].power, materialName: GEAR_TIERS[top - 1].name, rarity: RARITIES[0], source: 'drop' }, s.idCounter++);
    s.inventory.push(plain);
    game.equipItem(plain.id, 'Weapon');
    assert.equal(s.equipped.Weapon.id, plain.id);
    assert.equal(reload(game).state.forge.Weapon.level, 10, 'the levels stay with the slot, across a reload');
    const before = { ...s.resources };
    game.salvageItem(sword.id);
    assert.equal(s.resources.copper_bar - before.copper_bar, salvageBars(sword).qty, 'the copper sword gives back what it is made of');
    assert.equal(s.resources.essence - before.essence, salvageEssence(sword));
    assert.equal(s.forge.Weapon.level, 10, 'and the slot keeps its levels');
    rng.setSource(seededRandom(2026));
});

test('a piece crafted into a full bag that is salvaged at once says so, with no "made" card', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.crafting = true;
    for (let i = 0; i < BAG_SIZE; i++) s.inventory.push({ ...generateEquipment({ type: 'Ring', tier: 3, power: GEAR_TIERS[2].power, gemName: 'Sapphire', rarity: RARITIES[3], source: 'drop' }, s.idCounter++), locked: false });
    s.equipped.Weapon = generateEquipment({ type: 'Weapon', tier: 3, power: GEAR_TIERS[2].power, materialName: GEAR_TIERS[2].name, rarity: RARITIES[3], source: 'drop' }, s.idCounter++);
    s.resources.silver_bar = 100; s.resources.amethyst = 100;
    game.startCrafting('Ring', 'silver_bar', 'amethyst');
    game.drainEvents();
    let now = T0;
    while (s.stats.itemsCrafted < 1 && now < T0 + 60_000) game.tick(now += 500);
    assert.equal(s.stats.itemsCrafted, 1);
    const events = game.drainEvents();
    assert.equal(s.inventory.some(i => i.source === 'crafted'), false, 'the weakest piece, the new ring, made room');
    assert.equal(events.some(e => e.type === 'itemCrafted'), false);
    assert.ok(s.log.some(l => /salvaged it at once: the bag is full/.test(l.text)));
});

test('a material nothing pays for (bait) is not sold away for nothing', () => {
    const game = new Game(null, T0);
    game.state.resources.fishing_bait = 125;
    assert.equal(game.sellResource('fishing_bait', 1e9), 0);
    assert.equal(game.state.resources.fishing_bait, 125);
});

test('a skill\'s mastery checkpoint is reached once, not again on the next level', () => {
    const game = new Game(null, T0);
    const acts = masteryActions('woodcutting');
    const total = acts.length * (MASTERY_MAX_LEVEL - 1);
    // one level short of half the skill's mastery
    let left = total / 2 - 1;
    for (const a of acts) {
        const lv = Math.min(MASTERY_MAX_LEVEL - 1, left);
        game.state.mastery.woodcutting[a.key] = xpForLevel(lv + 1) / MASTERY_XP_DIVISOR;
        left -= lv;
    }
    assert.equal(left, 0);
    const fired = [];
    const emit = game.emit.bind(game);
    game.emit = ev => { if (ev.type === 'masteryCheckpoint') fired.push(ev.at); emit(ev); };
    const up = key => {
        const level = masteryLevel(game.state, 'woodcutting', key);
        addMasteryXp(game, 'woodcutting', key, xpForLevel(level + 1) / MASTERY_XP_DIVISOR - game.state.mastery.woodcutting[key] + 1e-9);
    };
    const open = acts.find(a => masteryLevel(game.state, 'woodcutting', a.key) < MASTERY_MAX_LEVEL - 1);
    up(open.key);
    up(open.key);
    assert.deepEqual(fired, [0.5]);
});

test('a dungeon chest\'s gear is of the chest\'s tier, never a tier either side as a monster\'s drop', () => {
    const warren = dungeonById('goblin_warren');
    const tiers = [];
    // the chest's gear roll comes up; the rolls after it read, as a monster drop's tier offset, -1, 0 and +1
    for (const roll of [0, 0.5, 0.99]) {
        const game = new Game(null, T0);
        const c = game.state.combat;
        c.mode = 'dungeon';
        c.dungeon = { id: warren.id, index: warren.monsters.length, repeat: true, choiceLeft: 0 };   // the boss falls
        let first = true;
        rng.setSource(() => (first ? (first = false, 0) : roll));
        try {
            onDungeonKill(game);
        } finally {
            rng.setSource(seededRandom(2026));
        }
        tiers.push(game.drainEvents().find(e => e.type === 'dungeonClear')?.item?.tier);
    }
    assert.deepEqual(tiers, [warren.chestTier, warren.chestTier, warren.chestTier], `Goblin Warren's chest gear is ${GEAR_TIERS[warren.chestTier - 1].name}`);
});
