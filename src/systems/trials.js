// Trials (data/trials.js): prestige into a run under one rule; reaching a tier's stage clears it for good.
// The rules themselves are read where they bite (core/modifiers.js, systems/combat.js, systems/camp.js);
// this module starts a Trial, notes the tiers cleared, and says what is on offer.

import { TRIALS, TRIALS_FROM, TRIAL_TIERS, trialById, trialTarget, trialRule, trialTier, trialBite } from '../data/trials.js';

export { trialRule, trialTier, trialBite };
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

/** Every Trial with its tier and next target: what the prestige dialog lays out. */
export function trialBoard(state) {
    return TRIALS.map(t => ({ trial: t, tier: trialTier(state, t.id), target: nextTrialTarget(state, t), active: state.trials?.active === t.id }));
}

/**
 * Prestige into a Trial: the prestige as ever (tokens for this run, the camp packed), then the next run
 * under the Trial's rule. A hero who was fighting walks into the new run's first fight.
 */
export function startTrial(game, id) {
    const state = game.state;
    const trial = trialById(id);
    if (!trial || !trialsOpen(state)) return false;
    if (nextTrialTarget(state, trial) === null) { game.emit({ type: 'error', text: `${trial.name} is cleared to the top.` }); return false; }
    if (!canPrestige(state, game.now)) return false;
    const fighting = state.combat.active || state.combat.recovering;
    if (!doPrestige(game, { trial: id })) return false;
    if (fighting) enterCombat(game);
    bumpStat(game, 'trialsStarted');
    log(game, `⚖️ Trial: ${trial.name}. ${trial.rule} Reach stage ${nextTrialTarget(state, trial)}.`, 'prestige');
    game.emit({ type: 'trialStart', id, target: nextTrialTarget(state, trial) });
    game.markDirty();
    return true;
}

/** A new best stage in this run: the Trial's tiers it reaches are cleared, each with its card. */
export function checkTrial(game) {
    const state = game.state;
    const trial = activeTrial(state);
    if (!trial) return;
    let target = nextTrialTarget(state, trial);
    if (target === null || state.combat.maxStage < target) return;
    while (target !== null && state.combat.maxStage >= target) {
        state.trials.cleared[trial.id] = trialTier(state, trial.id) + 1;
        bumpStat(game, 'trialTiers');
        const tier = state.trials.cleared[trial.id];
        log(game, `⚖️ ${trial.name}, tier ${tier} cleared: a record, for good.`, 'achievement');
        game.emit({ type: 'trialTier', id: trial.id, tier, last: tier >= TRIAL_TIERS });
        target = nextTrialTarget(state, trial);
    }
    game.recompute();   // the reward counts at once
    game.markDirty();
}
