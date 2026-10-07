// Trials (data/trials.js): prestige into a run under one rule; reaching a tier's stage clears it for good.
// The rules themselves are read where they bite (core/modifiers.js, systems/combat.js, systems/camp.js);
// this module starts a Trial, notes the tiers cleared, and says what is on offer.

import { TRIALS, TRIALS_FROM, TRIAL_TIERS, trialById, trialTarget, trialRule, trialTier, trialBite, weeklyTrialAt } from '../data/trials.js';

export { trialRule, trialTier, trialBite, weeklyTrialAt };
import { canPrestige, doPrestige } from './prestige.js';
import { enterCombat } from './combat.js';
import { log, bumpStat } from './progress.js';

/** The Trials are open once the best stage reaches TRIALS_FROM. */
export const trialsOpen = state => (state.combat.bestStage || 0) >= TRIALS_FROM || !!state.settings?.devUnlockAll;

/** The Trial this run plays under, or null. */
export const activeTrial = state => trialById(state.trials?.active) || null;

/** The stage the next tier of a Trial asks for, or null when it is cleared to the top. */
export function nextTrialTarget(state, trial) {
    const tier = trialTier(state, trial.id);
    return tier >= TRIAL_TIERS ? null : trialTarget(trial, tier + 1);
}

/**
 * The week's Trial and its laurel: { trial, start, end, target, won }. The stage to reach is one past the
 * best in that Trial from before the week began (noted at the week's first tick, systems/trials.js
 * syncWeekly), or its first tier's stage if that is higher. Pure: until the week is noted, the best now
 * stands for it.
 */
export function weeklyGoal(state, now) {
    const w = weeklyTrialAt(now);
    const noted = state.trials?.weekly?.start === w.start ? state.trials.weekly : null;
    const bar = noted ? noted.bar : (state.trials?.best?.[w.trial.id] || 0);
    return { ...w, target: Math.max(bar + 1, w.trial.first), won: !!noted?.won };
}

/** A new week: note what its Trial's laurel asks to beat (the best in it so far). Returns the week's state. */
export function syncWeekly(state, now) {
    const w = weeklyTrialAt(now);
    if (state.trials.weekly?.start === w.start) return state.trials.weekly;
    state.trials.weekly = { start: w.start, id: w.trial.id, bar: state.trials.best[w.trial.id] || 0, won: false, best: 0 };
    return state.trials.weekly;
}

/** Every Trial with its tier and next target, and the week's with its laurel: what the prestige dialog lays out. */
export function trialBoard(state, now) {
    const week = weeklyGoal(state, now);
    return TRIALS.map(t => ({
        trial: t, tier: trialTier(state, t.id), target: nextTrialTarget(state, t), active: state.trials?.active === t.id,
        weekly: week.trial.id === t.id ? week : null
    }));
}

/**
 * Prestige into a Trial: the prestige as ever (tokens for this run, the camp packed), then the next run
 * under the Trial's rule. A hero who was fighting walks into the new run's first fight.
 */
export function startTrial(game, id) {
    const state = game.state;
    const trial = trialById(id);
    if (!trial || !trialsOpen(state)) return false;
    const weekly = weeklyTrialAt(game.now).trial.id === id;   // the week's Trial is open even when cleared
    if (nextTrialTarget(state, trial) === null && !weekly) { game.emit({ type: 'error', text: `${trial.name} is cleared to the top.` }); return false; }
    if (!canPrestige(state, game.now)) return false;
    const fighting = state.combat.active || state.combat.recovering;
    if (!doPrestige(game, { trial: id })) return false;
    if (fighting) enterCombat(game);
    bumpStat(game, 'trialsStarted');
    const goal = weekly ? weeklyGoal(state, game.now) : null;
    const aim = nextTrialTarget(state, trial) ?? goal?.target;
    log(game, `⚖️ Trial: ${trial.name}${weekly ? ", this week's" : ''}. ${trial.rule} Reach stage ${aim}.`, 'prestige');
    game.emit({ type: 'trialStart', id, target: aim, weekly });
    game.markDirty();
    return true;
}

/**
 * A new best stage in this run: the best in the Trial, the week's laurel when it is beaten, and the
 * tiers it reaches, each with its card.
 */
export function checkTrial(game) {
    const state = game.state;
    const trial = activeTrial(state);
    if (!trial) return;
    const stage = state.combat.maxStage;
    if (stage > (state.trials.best[trial.id] || 0)) state.trials.best[trial.id] = stage;
    let records = 0;
    const week = syncWeekly(state, game.now);
    if (week.id === trial.id && stage > (week.best || 0)) week.best = stage;   // this week's best in it: the week's board (api)
    if (week.id === trial.id && !week.won && stage >= Math.max(week.bar + 1, trial.first)) {
        week.won = true;
        state.trials.laurels = (state.trials.laurels || 0) + 1;
        records++;
        bumpStat(game, 'laurels');
        log(game, `🌿 ${trial.name}, this week's Trial: stage ${stage}, past your best. A laurel: a record, for good.`, 'achievement');
        game.emit({ type: 'laurel', id: trial.id, stage, laurels: state.trials.laurels });
    }
    let target = nextTrialTarget(state, trial);
    while (target !== null && stage >= target) {
        state.trials.cleared[trial.id] = trialTier(state, trial.id) + 1;
        bumpStat(game, 'trialTiers');
        const tier = state.trials.cleared[trial.id];
        records++;
        log(game, `⚖️ ${trial.name}, tier ${tier} cleared: a record, for good.`, 'achievement');
        game.emit({ type: 'trialTier', id: trial.id, tier, last: tier >= TRIAL_TIERS });
        target = nextTrialTarget(state, trial);
    }
    if (records) game.recompute();   // the records count at once
    game.markDirty();
}
