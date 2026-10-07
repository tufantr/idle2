// Trials (DESIGN §3.26): from best stage 200 the prestige dialog offers runs under one rule; reaching a
// tier's stage in the Trial clears it for good, and each tier cleared is a record (tokens ×1.05). The
// rules bite where they say, the tiers clear as the run climbs, a prestige ends the Trial, saves keep it,
// and the boards compare the hero, not the Trial.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { BASE, collectModifiers, deriveStats, recordsOf } from '../src/core/modifiers.js';
import { BALANCE } from '../src/core/formulas.js';
import { TRIALS, TRIALS_FROM, TRIAL_TIERS, TRIAL_STEP, trialById, trialTarget, trialTiersCleared } from '../src/data/trials.js';
import { trialsOpen, trialBoard, nextTrialTarget } from '../src/systems/trials.js';
import { spawnEnemy, onEnemyDeath, tryEat, tickCombat } from '../src/systems/combat.js';
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

/** The hero's stats and modifiers with `rule` as the run's Trial. */
function under(game, rule) {
    game.state.trials.active = rule;
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
    const board = trialBoard(game.state);
    assert.equal(board.length, TRIALS.length);
    for (const row of board) assert.equal(row.target, row.trial.first);
});

test('the hero-side rules: health, gear, tokens and the camp', () => {
    const game = veteran();
    const plain = under(game, null);
    // Glass Hero: a tenth of the health
    assert.ok(Math.abs(under(game, 'glass').d.maxHp / plain.d.maxHp - 0.1) < 0.001);
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
    game.state.trials.active = 'no_camp';
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
    const spawn = (stage, rule) => { game.state.trials.active = rule; c.stage = stage; spawnEnemy(game); game.state.trials.active = null; return c.enemy; };
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
    s.trials.active = 'fasting';
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
    assert.equal(s.trials.active, 'brutes');
    assert.equal(s.combat.active, true);   // he was fighting: he walks into the new run's first fight
    const events = game.drainEvents();
    assert.equal(events.find(e => e.type === 'prestige')?.trial, 'brutes');
    assert.ok(events.some(e => e.type === 'trialStart' && e.target === trialById('brutes').first));
    // the first monster is already a brute
    const atk = s.combat.enemy.atk;
    s.trials.active = null;
    spawnEnemy(game);
    assert.equal(s.combat.enemy.atk * 4, atk);
});

test('tiers clear as the run climbs, several at once if it must, and each is a record', () => {
    const game = veteran();
    const s = game.state;
    const trial = trialById('brutes');
    s.trials.active = 'brutes';
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
    // to the top, and no further
    Object.assign(c, { stage: trialTarget(trial, TRIAL_TIERS) + 50, maxStage: trialTarget(trial, TRIAL_TIERS) + 50 });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.equal(s.trials.cleared.brutes, TRIAL_TIERS);
    assert.ok(game.drainEvents().find(e => e.type === 'trialTier' && e.tier === TRIAL_TIERS)?.last);
    assert.equal(nextTrialTarget(s, trial), null);
    // five tiers: five records beside the stage records (the run passed the old best on the way), the tokens ×1.05 each
    s.trials.active = null;
    const withTiers = recordsOf(s);
    assert.equal(withTiers.trials, TRIAL_TIERS);
    assert.equal(withTiers.count, withTiers.stages + withTiers.uniques + TRIAL_TIERS);
    assert.ok(Math.abs(withTiers.mult - BASE.recordMult ** withTiers.count) < 1e-9);
    // a Trial cleared to the top is not offered again
    s.prestige.runStartedAt = T0 - 30 * MIN;
    assert.equal(game.startTrial('brutes'), false);
    assert.equal(trialBoard(s).find(r => r.trial.id === 'brutes').target, null);
});

test('a run outside a Trial clears nothing, and a prestige ends the Trial', () => {
    const game = veteran();
    const s = game.state;
    const c = s.combat;
    Object.assign(c, { stage: 199, maxStage: 199, mode: 'stages' });
    spawnEnemy(game);
    onEnemyDeath(game);
    assert.deepEqual(s.trials.cleared, {});
    s.trials.active = 'glass';
    game.recompute();
    assert.equal(game.prestige(), true);
    assert.equal(s.trials.active, null);
    assert.ok(Math.abs(game.derived.maxHp - deriveStats(s).maxHp) < 1);
});

test('saves keep the Trial and its tiers, and odd values come back in range', () => {
    const game = veteran();
    game.state.trials = { active: 'fasting', cleared: { glass: 2, brutes: 5 } };
    const back = migrateState(JSON.parse(game.serialize(T0)), T0);
    assert.deepEqual(back.trials, { active: 'fasting', cleared: { glass: 2, brutes: 5 } });
    const odd = JSON.parse(game.serialize(T0));
    odd.trials = { active: 'nonsense', cleared: { glass: -3, brutes: 99, fasting: '2.7', toString: 4, no_camp: 'x' } };
    const fixed = migrateState(odd, T0);
    assert.deepEqual(fixed.trials, { active: null, cleared: { brutes: TRIAL_TIERS, fasting: 2 } });
    assert.equal(trialTiersCleared(fixed), TRIAL_TIERS + 2);
    for (const raw of [null, 7, 'x', [], { cleared: [1, 2] }]) {
        const save = JSON.parse(game.serialize(T0));
        save.trials = raw;
        const s = migrateState(save, T0);
        assert.equal(s.trials.active, null);
        assert.deepEqual(s.trials.cleared, {});
    }
    // an old save, from before the Trials
    const old = JSON.parse(game.serialize(T0));
    delete old.trials;
    assert.deepEqual(migrateState(old, T0).trials, { active: null, cleared: {} });
});

test('the boards compare the hero, not the Trial a run is in, and see tiers no best stage allows', () => {
    const game = veteran();
    const save = () => JSON.parse(game.serialize(T0));
    const plain = powerSummary(save(), T0);
    game.state.trials.active = 'rusted';
    assert.equal(powerSummary(save(), T0).dps, plain.dps);
    assert.equal(plain.trialTiersBeyondBest, 0);
    game.state.trials.cleared = { brutes: 2, faithless: 4 };   // 175 and 200; 125 to 200: all within best 210
    assert.equal(powerSummary(save(), T0).trialTiersBeyondBest, 0);
    game.state.trials.cleared = { brutes: 5 };                 // 225, 250 and 275 are past it
    assert.equal(powerSummary(save(), T0).trialTiersBeyondBest, 3);
});

test('the Trials data hangs together', () => {
    const ids = new Set();
    for (const t of TRIALS) {
        assert.ok(!ids.has(t.id)); ids.add(t.id);
        assert.match(t.id, /^[a-z_]+$/);
        assert.ok(t.first >= 50 && trialTarget(t, TRIAL_TIERS) <= 400, t.id);
        assert.ok(t.rule.endsWith('.') && t.name && t.art && t.icon, t.id);
        assert.ok(Object.keys(t.bite).length > 0, t.id);
        for (const [key, value] of Object.entries(t.bite)) {
            assert.ok(['enemyAtk', 'enemyHp', 'bossTime', 'heroHp', 'gear', 'noTokens', 'noCamp', 'noFood', 'noRegen'].includes(key), `${t.id}.${key}`);
            assert.ok(value === true || (typeof value === 'number' && value >= 0), `${t.id}.${key}`);
        }
    }
});
