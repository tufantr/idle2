// Trials (DESIGN §3.26): from best stage 200 the prestige dialog offers runs under one rule; reaching a
// tier's stage in the Trial clears it for good, and each tier cleared is a record (tokens ×1.05). Past the
// five tiers each ladder goes on, a rung at stage 500 and one every 250 after; from best stage 500 a run may
// take up to three Trials at once (a Pact). The rules bite where they say, the tiers clear as the run climbs,
// a prestige ends the Trial, saves keep it, and the boards compare the hero, not the Trial.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState, MAX_STAGE } from '../src/core/state.js';
import { BASE, collectModifiers, deriveStats, recordsOf, potionEffects } from '../src/core/modifiers.js';
import { BALANCE } from '../src/core/formulas.js';
import { TRIALS, TRIALS_FROM, TRIAL_TIERS, TRIAL_STEP, TRIAL_LADDER, TRIAL_MAX_TIER, PACT_MAX, PACTS_FROM, WEEK_MS, trialById, trialBite, trialTarget, trialTiersCleared, weeklyTrialAt } from '../src/data/trials.js';
import { trialsOpen, trialBoard, nextTrialTarget, weeklyGoal, syncWeekly, pactsOpen, pactSize, activeTrials } from '../src/systems/trials.js';
import { spawnEnemy, onEnemyDeath, tryEat, tickCombat, enemyAttack } from '../src/systems/combat.js';
import { spendFightPotion } from '../src/systems/potions.js';
import { seen } from '../src/systems/disclosure.js';
import { powerSummary } from '../src/core/power.js';

rng.setSource(seededRandom(7));
const T0 = 1_700_000_000_000;
const MIN = 60_000;

/** A hero at the Trials' door: best stage 210, thirty minutes into a run at stage 120, tokens, gear, a camp. */
function veteran() {
    const game = new Game(null, T0);
    const s = game.state;
    Object.assign(s.combat, { bestStage: 210, stage: 120, maxStage: 120 });
    Object.assign(s.prestige, { count: 30, tokens: 5000, firstAt: T0 - 10 * 86_400_000, runStartedAt: T0 - 30 * MIN });
    s.equipped.Weapon = { id: 800, type: 'Weapon', tier: 7, atk: 5000, def: 0, affixes: [{ stat: 'critChance', value: 0.04 }], upgrade: 2 };
    s.equipped.Body = { id: 801, type: 'Body', tier: 7, atk: 0, def: 3000, affixes: [], upgrade: 0 };
    s.equipped.Ring1 = { id: 802, type: 'Ring', tier: 7, atk: 400, def: 400, affixes: [], upgrade: 0 };
    Object.assign(s.camp, { whetstone: 10, armory: 10, hearth: 10 });
    s.resources.cooked_rabbit = 50;
    game.recompute();
    return game;
}

/** The run's Trials as the state holds them: a list, or null. */
const rules = rule => (rule ? [].concat(rule) : null);

/** The hero's stats and modifiers with `rule` (one Trial or a Pact's list) as the run's. */
function under(game, rule) {
    game.state.trials.active = rules(rule);
    const d = deriveStats(game.state);
    const mods = collectModifiers(game.state);
    game.state.trials.active = null;
    return { d, mods };
}

test('the Trials open at best stage 200, in the dialog and as a piece of the screen', () => {
    const game = veteran();
    game.state.combat.bestStage = TRIALS_FROM - 1;
    assert.equal(trialsOpen(game.state), false);
    assert.equal(game.startTrial('brutes'), false);
    game.state.combat.bestStage = TRIALS_FROM;
    assert.equal(trialsOpen(game.state), true);
    game.tick(T0 + 1000);
    assert.equal(seen(game.state, 'trials'), true);
    const board = trialBoard(game.state, T0);
    assert.equal(board.length, TRIALS.length);
    for (const row of board) assert.equal(row.target, row.trial.first);
});

test('the hero-side rules: health, gear, tokens and the camp', () => {
    const game = veteran();
    const plain = under(game, null);
    // Glass Hero: his health is his own (a blow that lands fells him whatever it is: the sharper rules, below)
    assert.equal(under(game, 'glass').d.maxHp, plain.d.maxHp);
    // Rusted Gear: everything the gear gives, at a quarter (stats and affixes alike)
    const rusted = under(game, 'rusted').mods;
    assert.ok(Math.abs(rusted.gearAtk - plain.mods.gearAtk / 4) < 1e-6);
    assert.ok(Math.abs(rusted.gearDef - plain.mods.gearDef / 4) < 1e-6);
    assert.ok(Math.abs(rusted.critChance - (plain.mods.critChance - 0.04 * 0.75)) < 1e-9);
    // Faithless: the tokens give nothing, as if there were none
    const faithless = under(game, 'faithless').d;
    const tokens = game.state.prestige.tokens;
    game.state.prestige.tokens = 0;
    const none = deriveStats(game.state);
    game.state.prestige.tokens = tokens;
    assert.equal(faithless.atk, none.atk);
    assert.equal(faithless.maxHp, none.maxHp);
    // No Camp: the camp's levels count for nothing, and nothing can be bought for it
    game.state.trials.active = ['no_camp'];
    const noCamp = deriveStats(game.state);
    const levels = { ...game.state.camp };
    for (const id of Object.keys(levels)) game.state.camp[id] = 0;
    const packed = deriveStats(game.state);
    Object.assign(game.state.camp, levels);
    assert.equal(noCamp.atk, packed.atk);
    game.state.gold = 1e12;
    assert.equal(game.buyCampUpgrade('whetstone', 1), 0);
    assert.equal(game.state.camp.whetstone, 10);
    assert.ok(game.drainEvents().some(e => e.type === 'error'));
});

test('the monster-side rules: Brutes, Thick Hides and Swift Bosses, each paying as ever', () => {
    const game = veteran();
    const c = game.state.combat;
    const spawn = (stage, rule) => { game.state.trials.active = rules(rule); c.stage = stage; spawnEnemy(game); game.state.trials.active = null; return c.enemy; };
    const plain = spawn(121, null);
    const brute = spawn(121, 'brutes');
    assert.equal(brute.atk, plain.atk * 4);
    assert.equal(brute.maxHp, plain.maxHp);
    const hide = spawn(121, 'thick_hides');
    assert.equal(hide.maxHp, Math.floor(plain.maxHp * 10));
    assert.equal(hide.hp, hide.maxHp);
    assert.equal(hide.atk, plain.atk);
    // a tougher monster pays as the plain one does: its worth is its health before the Trial
    const r = BALANCE.rewards;
    const goldOf = e => (e.worth || e.maxHp) * r.goldPerHp * (e.boss ? r.bossGoldMult : 1);
    assert.equal(goldOf(hide), goldOf(plain));
    // Swift Bosses: a tenth of a boss's time, on its own clock (which the scene reads)
    const boss = spawn(130, null);
    assert.equal(boss.boss, true);
    assert.equal(c.bossTimeLeft, BALANCE.combat.bossTimeMs);
    const swift = spawn(130, 'swift_bosses');
    assert.equal(swift.timeLimit, BALANCE.combat.bossTimeMs / 10);
    assert.equal(c.bossTimeLeft, BALANCE.combat.bossTimeMs / 10);
    assert.equal(spawn(131, 'swift_bosses').timeLimit, undefined, 'a monster has no clock');
});

test('Fasting: no food, no health back while fighting, no lifesteal; rest still heals', () => {
    const game = veteran();
    const s = game.state;
    const c = s.combat;
    s.trials.active = ['fasting'];
    game.recompute();
    c.hp = game.derived.maxHp * 0.1;
    assert.equal(tryEat(game), 0);
    assert.equal(s.resources.cooked_rabbit, 50);
    // fighting: nothing comes back
    c.active = true; c.stage = 121; spawnEnemy(game);
    c.enemy.atk = 0; c.enemy.interval = 1e9;   // a monster that never strikes, so only healing moves the health
    c.playerTimer = -1e9;                      // and a hero who doesn't strike either
    const hp = c.hp;
    tickCombat(game, 5000);
    assert.equal(c.hp, hp);
    // resting: health comes back as ever
    c.active = false; c.recovering = true;
    tickCombat(game, 5000);
    assert.ok(c.hp > hp);
    // outside the Trial, food and the fight's regeneration are back
    s.trials.active = null;
    game.recompute();
    c.hp = game.derived.maxHp * 0.1;
    assert.ok(tryEat(game) > 0);
});

test("the sharper rules: a blow that lands fells a Glass Hero, a Brute's staggers him, and Fasting drinks no potion", () => {
    const game = veteran();
    const s = game.state;
    const c = s.combat;
    /** A fight at stage 121 under `rule`: the hero at full health, his next swing 300 ms along, a monster whose blows land and barely hurt. */
    const fight = rule => {
        s.trials.active = rules(rule);
        game.recompute();
        Object.assign(c, { active: true, recovering: false, mode: 'stages', stage: 121, maxStage: 121, hp: game.derived.maxHp });
        spawnEnemy(game);
        c.playerTimer = 300;
        c.enemy.atk = 1;
        game.derived.dodge = 0;
        game.drainEvents();
    };
    // Glass Hero: the feeblest blow that lands fells him at full health, and no food is eaten to save him
    fight('glass');
    assert.equal(tryEat(game, { blow: true }), 0);
    enemyAttack(game);
    assert.ok(game.drainEvents().some(e => e.type === 'death'));
    // a dodged blow does not land
    fight('glass');
    game.derived.dodge = 1;
    assert.equal(enemyAttack(game), 0);
    assert.equal(c.hp, game.derived.maxHp);
    // Brutes: each blow that lands puts his next swing back a second, two swings' worth at most
    fight('brutes');
    enemyAttack(game);
    assert.equal(c.playerTimer, 300 - 1000);
    for (let i = 0; i < 20; i++) { enemyAttack(game); c.hp = game.derived.maxHp; }
    assert.equal(c.playerTimer, -2 * game.derived.attackInterval);
    fight(null);
    enemyAttack(game);
    assert.equal(c.playerTimer, 300, 'outside the Trial, a blow staggers no one');
    // Fasting: a potion neither works nor runs down in the Trial's run
    fight('fasting');
    Object.assign(c, { potion: 'combat_potion_3', potionMs: 30_000 });
    s.resources.combat_potion_3 = 5;
    assert.equal(potionEffects(s).atk, 1);
    spendFightPotion(game, 1000);
    assert.equal(c.potionMs, 30_000);
    // against the clan boss (no Trial's fight) it works, and outside the Trial it works and runs down
    c.mode = 'clan';
    assert.ok(potionEffects(s).atk > 1);
    fight(null);
    Object.assign(c, { potion: 'combat_potion_3', potionMs: 30_000 });
    assert.ok(potionEffects(s).atk > 1);
    spendFightPotion(game, 1000);
    assert.equal(c.potionMs, 29_000);
});

test('prestiging into a Trial: the prestige as ever, and the new run under the rule from its first monster', () => {
    const game = veteran();
    const s = game.state;
    game.enterCombat();
    s.prestige.runStartedAt = T0 - 5 * MIN;   // too soon: no prestige, no Trial
    assert.equal(game.startTrial('brutes'), false);
    assert.equal(s.trials.active, null);
    s.prestige.runStartedAt = T0 - 30 * MIN;
    game.drainEvents();
    const tokens = s.prestige.tokens;
    assert.equal(game.startTrial('nonsense'), false);
    assert.equal(game.startTrial('brutes'), true);
    assert.equal(s.prestige.count, 31);
    assert.ok(s.prestige.tokens > tokens);
    assert.deepEqual(s.trials.active, ['brutes']);
    assert.equal(s.combat.active, true);   // he was fighting: he walks into the new run's first fight
    const events = game.drainEvents();
    assert.deepEqual(events.find(e => e.type === 'prestige')?.trial, ['brutes']);
    assert.ok(events.some(e => e.type === 'trialStart' && e.target === trialById('brutes').first));
    // the first monster is already a brute
    const atk = s.combat.enemy.atk;
    s.trials.active = null;
    spawnEnemy(game);
    assert.equal(s.combat.enemy.atk * 4, atk);
});

test('tiers clear as the run climbs, several at once if it must, then the ladder\'s rungs to the stages\' end, each a record', () => {
    const game = veteran();
    const s = game.state;
    const trial = trialById('brutes');
    s.trials.active = ['brutes'];
    game.recompute();
    const before = recordsOf(s);
    const c = s.combat;
    // one stage short of the first tier, then the kill that reaches it
    Object.assign(c, { stage: trial.first - 1, maxStage: trial.first - 1, mode: 'stages', farmMode: false, regroupLeft: 0 });
    spawnEnemy(game);
    game.drainEvents();
    onEnemyDeath(game);
    assert.equal(s.trials.cleared.brutes, 1);
    let tiers = game.drainEvents().filter(e => e.type === 'trialTier');
    assert.deepEqual(tiers.map(e => [e.id, e.tier, e.last]), [['brutes', 1, false]]);
    assert.equal(game.derived.records.count, before.count + 1, 'the record counts at once');
    assert.equal(game.derived.records.trials, 1);
    assert.equal(nextTrialTarget(s, trial), trial.first + TRIAL_STEP);
    // a run that is already past the next two targets clears both at its next new best
    Object.assign(c, { stage: trialTarget(trial, 3) + 4, maxStage: trialTarget(trial, 3) + 4 });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.equal(s.trials.cleared.brutes, 3);
    tiers = game.drainEvents().filter(e => e.type === 'trialTier');
    assert.deepEqual(tiers.map(e => e.tier), [2, 3]);
    // the fifth tier ends the first ladder
    Object.assign(c, { stage: trialTarget(trial, TRIAL_TIERS) + 50, maxStage: trialTarget(trial, TRIAL_TIERS) + 50 });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.equal(s.trials.cleared.brutes, TRIAL_TIERS);
    assert.ok(game.drainEvents().find(e => e.type === 'trialTier' && e.tier === TRIAL_TIERS)?.last);
    // five tiers: five records beside the stage records (the run passed the old best on the way), the tokens ×1.05 each
    s.trials.active = null;
    const withTiers = recordsOf(s);
    assert.equal(withTiers.trials, TRIAL_TIERS);
    assert.equal(withTiers.count, withTiers.stages + withTiers.uniques + TRIAL_TIERS);
    assert.ok(Math.abs(withTiers.mult - BASE.recordMult ** withTiers.count) < 1e-9);
    // the ladder goes on: a rung at stage 500, then one every 250, each a record as a tier is
    assert.equal(nextTrialTarget(s, trial), TRIAL_LADDER.from);
    s.trials.active = ['brutes'];
    Object.assign(c, { stage: TRIAL_LADDER.from + TRIAL_LADDER.step + 9, maxStage: TRIAL_LADDER.from + TRIAL_LADDER.step + 9 });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.equal(s.trials.cleared.brutes, TRIAL_TIERS + 2);
    tiers = game.drainEvents().filter(e => e.type === 'trialTier');
    assert.deepEqual(tiers.map(e => [e.tier, e.last]), [[TRIAL_TIERS + 1, false], [TRIAL_TIERS + 2, false]]);
    assert.equal(nextTrialTarget(s, trial), TRIAL_LADDER.from + 2 * TRIAL_LADDER.step);
    assert.equal(recordsOf(s).trials, TRIAL_TIERS + 2);
    // to the stages' end, and no further
    s.trials.cleared.brutes = TRIAL_MAX_TIER - 1;
    Object.assign(c, { stage: MAX_STAGE - 1, maxStage: MAX_STAGE - 1 });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.equal(s.trials.cleared.brutes, TRIAL_MAX_TIER);
    assert.equal(nextTrialTarget(s, trial), null);
    s.trials.active = null;
    // a Trial cleared to the top is not offered again
    s.prestige.runStartedAt = T0 - 30 * MIN;
    assert.equal(game.startTrial('brutes'), false);
    assert.equal(trialBoard(s, game.now).find(r => r.trial.id === 'brutes').target, null);
});

test('a run outside a Trial clears nothing, and a prestige ends the Trial', () => {
    const game = veteran();
    const s = game.state;
    const c = s.combat;
    Object.assign(c, { stage: 199, maxStage: 199, mode: 'stages' });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.deepEqual(s.trials.cleared, {});
    s.trials.active = ['glass'];
    game.recompute();
    assert.equal(game.prestige(), true);
    assert.equal(s.trials.active, null);
    assert.ok(Math.abs(game.derived.maxHp - deriveStats(s).maxHp) < 1);
});

test('saves keep the Trial and its tiers, and odd values come back in range', () => {
    const game = veteran();
    // a save from before Pacts held one Trial's id; the best stage in each Trial is at least what its cleared tiers
    // and rungs asked (saves from before it was kept)
    game.state.trials = { active: 'fasting', cleared: { glass: 2, brutes: 7 } };
    const back = migrateState(JSON.parse(game.serialize(T0)), T0);
    assert.deepEqual(back.trials, { active: ['fasting'], cleared: { glass: 2, brutes: 7 }, best: { glass: 195, brutes: 750 }, laurels: 0, weekly: null });
    const odd = JSON.parse(game.serialize(T0));
    odd.trials = {
        active: ['nonsense', 'glass', 'glass', 'brutes', 'fasting', 'rusted'],
        cleared: { glass: -3, brutes: 99, fasting: '2.7', toString: 4, no_camp: 'x' },
        weekly: { start: T0, id: 'brutes', bar: 10, won: 7, best: 12 }
    };
    const fixed = migrateState(odd, T0);
    assert.deepEqual(fixed.trials, {
        active: ['glass', 'brutes', 'fasting'], cleared: { brutes: TRIAL_MAX_TIER, fasting: 2 }, best: { brutes: MAX_STAGE, fasting: 195 },
        laurels: 0, weekly: { start: T0, id: 'brutes', bar: 10, won: PACT_MAX, best: 12 }
    });
    assert.equal(trialTiersCleared(fixed), TRIAL_MAX_TIER + 2);
    // a week's laurel from before Pacts was won or not: one, or none
    odd.trials.weekly.won = true;
    assert.equal(migrateState(odd, T0).trials.weekly.won, 1);
    odd.trials.weekly.won = false;
    assert.equal(migrateState(odd, T0).trials.weekly.won, 0);
    for (const raw of [null, 7, 'x', [], { cleared: [1, 2] }, { active: [] }, { active: ['x', 3, null] }, { active: 'nonsense' }]) {
        const save = JSON.parse(game.serialize(T0));
        save.trials = raw;
        const s = migrateState(save, T0);
        assert.equal(s.trials.active, null);
        assert.deepEqual(s.trials.cleared, {});
    }
    // an old save, from before the Trials
    const old = JSON.parse(game.serialize(T0));
    delete old.trials;
    assert.deepEqual(migrateState(old, T0).trials, { active: null, cleared: {}, best: {}, laurels: 0, weekly: null });
});

test('the boards compare the hero, not the Trial a run is in, and see tiers no best stage allows', () => {
    const game = veteran();
    const save = () => JSON.parse(game.serialize(T0));
    const plain = powerSummary(save(), T0);
    game.state.trials.active = ['rusted', 'brutes'];
    assert.equal(powerSummary(save(), T0).dps, plain.dps);
    assert.equal(plain.trialTiersBeyondBest, 0);
    game.state.trials.cleared = { brutes: 2, faithless: 4 };   // 175 and 200; 125 to 200: all within best 210
    assert.equal(powerSummary(save(), T0).trialTiersBeyondBest, 0);
    game.state.trials.cleared = { brutes: 5 };                 // 225, 250 and 275 are past it
    assert.equal(powerSummary(save(), T0).trialTiersBeyondBest, 3);
    game.state.trials.cleared = { brutes: 6 };                 // and the first rung's 500
    assert.equal(powerSummary(save(), T0).trialTiersBeyondBest, 4);
    // three laurels a week at most (a Pact holding the week's Trial), since the save began: four weeks begun
    game.state.meta.createdAt = T0 - 3 * WEEK_MS;
    game.state.trials.laurels = 4 * PACT_MAX;
    assert.equal(powerSummary(save(), T0).laurelsBeyondWeeks, 0);
    game.state.trials.laurels = 4 * PACT_MAX + 5;
    assert.equal(powerSummary(save(), T0).laurelsBeyondWeeks, 5);
});

test('the Trials data hangs together', () => {
    const ids = new Set();
    for (const t of TRIALS) {
        assert.ok(!ids.has(t.id)); ids.add(t.id);
        assert.match(t.id, /^[a-z_]+$/);
        assert.ok(t.first >= 50 && trialTarget(t, TRIAL_TIERS) <= 400, t.id);
        // the ladder's rungs: the first past every Trial's fifth tier, the last on the stages' end
        assert.ok(trialTarget(t, TRIAL_TIERS + 1) === TRIAL_LADDER.from && TRIAL_LADDER.from > trialTarget(t, TRIAL_TIERS), t.id);
        assert.ok(trialTarget(t, TRIAL_MAX_TIER) <= MAX_STAGE && trialTarget(t, TRIAL_MAX_TIER + 1) > MAX_STAGE, t.id);
        assert.ok(t.rule.endsWith('.') && t.name && t.art && t.icon, t.id);
        assert.ok(Number.isInteger(t.heat) && t.heat >= 1, t.id);
        assert.ok(Object.keys(t.bite).length > 0, t.id);
        for (const [key, value] of Object.entries(t.bite)) {
            assert.ok(['enemyAtk', 'enemyHp', 'bossTime', 'heroHp', 'gear', 'noTokens', 'noCamp', 'noFood', 'noRegen', 'noPotion', 'oneBlow', 'stagger'].includes(key), `${t.id}.${key}`);
            assert.ok(value === true || (typeof value === 'number' && value >= 0), `${t.id}.${key}`);
        }
    }
    assert.ok(PACT_MAX >= 2 && PACT_MAX <= TRIALS.length && PACTS_FROM >= TRIALS_FROM);
});

test("the week's Trial: one each Monday, all eight in turn, the same all week", () => {
    const monday = Date.UTC(2026, 9, 5);
    const met = new Set();
    for (let w = 0; w < TRIALS.length; w++) {
        const at = weeklyTrialAt(monday + w * WEEK_MS + 3_600_000);
        assert.equal(at.start, monday + w * WEEK_MS);
        assert.equal(new Date(at.start).getUTCDay(), 1, 'a Monday');
        assert.equal(weeklyTrialAt(at.end - 1).trial.id, at.trial.id);
        met.add(at.trial.id);
    }
    assert.equal(met.size, TRIALS.length);
});

test("the week's Trial stays open when cleared, and beating your best in it wins one laurel a week", () => {
    const game = veteran();
    const s = game.state;
    const week = weeklyTrialAt(game.now);
    const trial = week.trial;
    s.combat.bestStage = 320;                   // (deep enough that the climbs below make no stage record)
    s.trials.cleared[trial.id] = TRIAL_TIERS;   // its five tiers cleared
    s.trials.best[trial.id] = 290;              // its best so far (past its fifth tier's stage)
    game.tick(game.now + 1000);                 // the week's first tick notes what the laurel asks
    assert.deepEqual([s.trials.weekly.id, s.trials.weekly.bar, s.trials.weekly.won], [trial.id, 290, 0]);
    const goal = weeklyGoal(s, game.now);
    assert.equal(goal.target, 291);
    // a Trial cleared to the stages' end is not offered; the week's is, even then
    const other = TRIALS.find(t => t.id !== trial.id);
    s.trials.cleared[other.id] = TRIAL_MAX_TIER;
    s.trials.cleared[trial.id] = TRIAL_MAX_TIER;
    s.prestige.runStartedAt = game.now - 30 * MIN;
    assert.equal(game.startTrial(other.id), false);
    assert.equal(game.startTrial(trial.id), true);
    s.trials.cleared[trial.id] = TRIAL_TIERS;
    assert.equal(trialBoard(s, game.now).find(r => r.trial.id === trial.id).weekly.target, goal.target);
    // the run climbs past its best: one laurel, a record, at once
    const before = recordsOf(s);
    const c = s.combat;
    const climb = stage => { Object.assign(c, { stage: stage - 1, maxStage: stage - 1, mode: 'stages', farmMode: false, regroupLeft: 0 }); spawnEnemy(game); game.drainEvents(); onEnemyDeath(game); return game.drainEvents(); };
    assert.deepEqual(climb(goal.target - 1).filter(e => e.type === 'laurel'), [], 'not short of it');
    const won = climb(goal.target).filter(e => e.type === 'laurel');
    assert.deepEqual(won.map(e => [e.id, e.stage, e.laurels]), [[trial.id, goal.target, 1]]);
    assert.equal(s.trials.weekly.won, 1);
    assert.equal(weeklyGoal(s, game.now).won, true, 'alone, one a week');
    assert.equal(game.derived.records.laurels, 1);
    assert.equal(game.derived.records.count, before.count + 1);
    // another new best that week: the best moves on, no second laurel
    assert.deepEqual(climb(goal.target + 4).filter(e => e.type === 'laurel'), []);
    assert.equal(s.trials.laurels, 1);
    assert.equal(s.trials.best[trial.id], goal.target + 4);
    // the next week: its own Trial, its own bar, a laurel to win again
    const next = syncWeekly(s, week.end + 1000);
    assert.notEqual(next.id, trial.id);
    assert.deepEqual([next.bar, next.won], [s.trials.best[next.id] || 0, 0]);
    // saves keep it all
    const back = migrateState(JSON.parse(game.serialize(game.now)), game.now);
    assert.deepEqual(back.trials.weekly, s.trials.weekly);
    assert.equal(back.trials.laurels, 1);
    assert.equal(back.trials.best[trial.id], goal.target + 4);
});

test('a Pact: from best stage 500, up to three Trials in one run, their rules together, the stage counting on each ladder', () => {
    const game = veteran();
    const s = game.state;
    const [a, b] = ['brutes', 'rusted'];
    assert.ok(![a, b].includes(weeklyTrialAt(game.now).trial.id), "neither is the week's Trial (its laurels have their own test)");
    // one Trial at a time below the first rung's stage
    assert.equal(pactsOpen(s), false);
    assert.equal(pactSize(s), 1);
    assert.equal(game.startTrial([a, b]), false);
    assert.ok(game.drainEvents().some(e => e.type === 'error'));
    s.combat.bestStage = PACTS_FROM;
    assert.equal(pactSize(s), PACT_MAX);
    assert.equal(game.startTrial(['brutes', 'rusted', 'glass', 'fasting']), false, 'four is one too many');
    // their rules together: the monsters' and the hero's alike
    s.trials.active = ['glass', 'fasting', 'brutes'];
    assert.deepEqual({ ...trialBite(s) }, { oneBlow: true, noFood: true, noRegen: true, noPotion: true, enemyAtk: 4, stagger: 1000 });
    const plain = under(game, null).mods;
    assert.ok(Math.abs(under(game, [a, b]).mods.gearAtk - plain.gearAtk / 4) < 1e-6);
    // a Pact begins as a Trial does (a Trial named twice counts once)
    game.drainEvents();
    assert.equal(game.startTrial([a, b, a]), true);
    assert.deepEqual(s.trials.active, [a, b]);
    assert.deepEqual(activeTrials(s).map(t => t.id), [a, b]);
    const events = game.drainEvents();
    assert.deepEqual(events.find(e => e.type === 'prestige')?.trial, [a, b]);
    assert.deepEqual(events.find(e => e.type === 'trialStart')?.ids, [a, b]);
    const brute = s.combat.enemy.atk;
    s.trials.active = null;
    spawnEnemy(game);
    assert.equal(s.combat.enemy.atk * 4, brute, 'the first monster is already a brute');
    s.trials.active = [a, b];
    // the run's stage counts on both ladders: 175 and 200 on each, four records
    const c = s.combat;
    Object.assign(c, { stage: 199, maxStage: 199, mode: 'stages', farmMode: false, regroupLeft: 0 });
    spawnEnemy(game);
    game.drainEvents();
    onEnemyDeath(game);
    assert.deepEqual([s.trials.cleared[a], s.trials.cleared[b]], [2, 2]);
    assert.deepEqual(game.drainEvents().filter(e => e.type === 'trialTier').map(e => [e.id, e.tier]), [[a, 1], [a, 2], [b, 1], [b, 2]]);
    assert.equal(game.derived.records.trials, 4);
    // saves keep the Pact, and a prestige ends it
    assert.deepEqual(migrateState(JSON.parse(game.serialize(game.now)), game.now).trials.active, [a, b]);
    s.prestige.runStartedAt = game.now - 30 * MIN;
    assert.equal(game.prestige(), true);
    assert.equal(s.trials.active, null);
});

test("the week's stake: a Pact holding the week's Trial wins a laurel for each Trial in it, three a week at most", () => {
    const game = veteran();
    const s = game.state;
    const trial = weeklyTrialAt(game.now).trial;
    const [x, y] = TRIALS.filter(t => t.id !== trial.id && !t.bite.noTokens).map(t => t.id);
    s.combat.bestStage = 320;                   // (no stage records below; Pacts not yet open)
    s.trials.best[trial.id] = 290;
    game.tick(game.now + 1000);
    const goal = weeklyGoal(s, game.now);
    const c = s.combat;
    const climb = stage => { Object.assign(c, { stage: stage - 1, maxStage: stage - 1, mode: 'stages', farmMode: false, regroupLeft: 0 }); spawnEnemy(game); game.drainEvents(); onEnemyDeath(game); return game.drainEvents().filter(e => e.type === 'laurel'); };
    // before Pacts open, a run holding several (an odd save) still wins one: one a week
    s.trials.active = [trial.id, x, y];
    assert.deepEqual(climb(goal.target).map(e => e.count), [1]);
    assert.equal(weeklyGoal(s, game.now).won, true);
    // once they open, the week has two more to give, at the same bar: a Pact of two with it wins one more
    s.combat.bestStage = PACTS_FROM;
    assert.equal(weeklyGoal(s, game.now).won, false);
    s.trials.active = [trial.id];
    assert.deepEqual(climb(goal.target + 5), [], 'alone again: its one is won');
    s.trials.active = [x, y];
    assert.deepEqual(climb(goal.target + 6), [], "a Pact without the week's Trial stakes nothing");
    s.trials.active = [trial.id, x];
    assert.deepEqual(climb(goal.target).map(e => [e.count, e.laurels]), [[1, 2]]);
    // and a Pact of three the last one; then none, however deep
    s.trials.active = [trial.id, x, y];
    assert.deepEqual(climb(goal.target - 1), [], 'not short of the bar');
    assert.deepEqual(climb(goal.target).map(e => [e.count, e.laurels]), [[1, 3]]);
    assert.deepEqual(climb(goal.target + 40), []);
    assert.equal(s.trials.weekly.won, PACT_MAX);
    assert.equal(s.trials.laurels, PACT_MAX);
    assert.equal(game.derived.records.laurels, PACT_MAX);
    // a fresh week: three at once for a Pact of three that beats the bar
    const next = syncWeekly(s, weeklyTrialAt(game.now).end + 1000);
    game.now = next.start + 1000;
    const nextTrial = trialById(next.id);
    const [p, q] = TRIALS.filter(t => t.id !== nextTrial.id && !t.bite.noTokens).map(t => t.id);
    s.trials.active = [nextTrial.id, p, q];
    const target = weeklyGoal(s, game.now).target;
    assert.deepEqual(climb(target).map(e => [e.id, e.count, e.laurels]), [[nextTrial.id, PACT_MAX, 2 * PACT_MAX]]);
});
