// Trials (data/trials.js): prestige into a run under a rule, or up to PACT_MAX of them (a Pact); reaching a tier's
// stage clears it for good, on every ladder the run plays. The rules themselves are read where they bite
// (core/modifiers.js, systems/combat.js, systems/camp.js, systems/potions.js); this module starts a Trial, notes the
// tiers cleared and the week's laurels, and says what is on offer.

import { TRIALS, TRIALS_FROM, TRIAL_TIERS, TRIAL_MAX_TIER, PACT_MAX, PACTS_FROM, trialById, trialIds, trialTarget, trialRule, trialTier, trialBite, weeklyTrialAt } from '../data/trials.js';

export { trialRule, trialTier, trialBite, weeklyTrialAt, trialIds };
import { canPrestige, doPrestige } from './prestige.js';
import { enterCombat } from './combat.js';
import { log, bumpStat } from './progress.js';

/** The Trials are open once the best stage reaches TRIALS_FROM. */
export const trialsOpen = state => (state.combat.bestStage || 0) >= TRIALS_FROM || !!state.settings?.devUnlockAll;

/** The Trials this run plays under (a Pact's several), as objects. */
export const activeTrials = state => trialIds(state).map(trialById);

/** The Trial this run plays under (a Pact's first), or null. */
export const activeTrial = state => activeTrials(state)[0] || null;

/** Pacts are open once the best stage reaches the ladder's first rung (data/trials.js PACTS_FROM). */
export const pactsOpen = state => (state.combat.bestStage || 0) >= PACTS_FROM || !!state.settings?.devUnlockAll;

/** How many Trials a run may take now: one, or PACT_MAX once Pacts are open. */
export const pactSize = state => (pactsOpen(state) ? PACT_MAX : 1);

/** The stage the next tier (or rung) of a Trial asks for, or null at the stages' end. */
export function nextTrialTarget(state, trial) {
    const tier = trialTier(state, trial.id);
    return tier >= TRIAL_MAX_TIER ? null : trialTarget(trial, tier + 1);
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
    // laurels won this week (a Pact with the week's Trial in it wins one for each Trial it holds), and whether
    // no more can be: one a week alone, PACT_MAX once Pacts are open
    const laurels = Math.max(0, Math.floor(Number(noted?.won) || 0));
    return { ...w, target: Math.max(bar + 1, w.trial.first), laurels, won: laurels >= pactSize(state) };
}

/** A new week: note what its Trial's laurel asks to beat (the best in it so far). Returns the week's state. */
export function syncWeekly(state, now) {
    const w = weeklyTrialAt(now);
    if (state.trials.weekly?.start === w.start) return state.trials.weekly;
    state.trials.weekly = { start: w.start, id: w.trial.id, bar: state.trials.best[w.trial.id] || 0, won: 0, best: 0 };
    return state.trials.weekly;
}

/** Every Trial with its tier and next target, and the week's with its laurel: what the prestige dialog lays out. */
export function trialBoard(state, now) {
    const week = weeklyGoal(state, now);
    const active = trialIds(state);
    return TRIALS.map(t => ({
        trial: t, tier: trialTier(state, t.id), target: nextTrialTarget(state, t), active: active.includes(t.id),
        weekly: week.trial.id === t.id ? week : null
    }));
}

/**
 * Prestige into a Trial, or a Pact of up to PACT_MAX (`ids`: one id or a list): the prestige as ever (tokens for this
 * run, the camp packed), then the next run under all their rules. A hero who was fighting walks into the new run's
 * first fight.
 */
export function startTrial(game, ids) {
    const state = game.state;
    const list = [...new Set(Array.isArray(ids) ? ids : [ids])];
    const trials = list.map(trialById);
    if (!trials.length || trials.some(t => !t) || !trialsOpen(state)) return false;
    if (trials.length > pactSize(state)) { game.emit({ type: 'error', text: pactsOpen(state) ? `A Pact holds ${PACT_MAX} Trials at most.` : 'One Trial at a time.' }); return false; }
    const week = weeklyTrialAt(game.now).trial.id;   // the week's Trial is open even when cleared
    const closed = trials.find(t => nextTrialTarget(state, t) === null && t.id !== week);
    if (closed) { game.emit({ type: 'error', text: `${closed.name} is cleared to the top.` }); return false; }
    if (!canPrestige(state, game.now)) return false;
    const fighting = state.combat.active || state.combat.recovering;
    if (!doPrestige(game, { trial: trials.map(t => t.id) })) return false;
    if (fighting) enterCombat(game);
    bumpStat(game, 'trialsStarted');
    const weekly = trials.some(t => t.id === week);
    const goal = weekly ? weeklyGoal(state, game.now) : null;
    const aims = trials.map(t => nextTrialTarget(state, t) ?? goal?.target).filter(Boolean);
    const aim = aims.length ? Math.min(...aims) : null;
    const names = trials.map(t => t.name).join(', ');
    log(game, `⚖️ ${trials.length > 1 ? 'A Pact' : 'Trial'}: ${names}${weekly ? ", with this week's" : ''}. ${trials.map(t => t.rule).join(' ')}${aim ? ` Reach stage ${aim}.` : ''}`, 'prestige');
    game.emit({ type: 'trialStart', id: trials[0].id, ids: trials.map(t => t.id), target: aim, weekly });
    game.markDirty();
    return true;
}

/**
 * A new best stage in this run: the best in the Trial, the week's laurel when it is beaten, and the
 * tiers it reaches, each with its card.
 */
export function checkTrial(game) {
    const state = game.state;
    const trials = activeTrials(state);
    if (!trials.length) return;
    const stage = state.combat.maxStage;
    // the week first: a new week's bar is the best from before it (an offline replay crossing Monday
    // used to set it after this stage was counted, one stage too high)
    const week = syncWeekly(state, game.now);
    let records = 0;
    for (const trial of trials) if (stage > (state.trials.best[trial.id] || 0)) state.trials.best[trial.id] = stage;
    const weekly = trials.find(t => t.id === week.id);
    if (weekly) {
        if (stage > (week.best || 0)) week.best = stage;   // this week's best in it: the week's board (api)
        // past the bar: a laurel for each Trial the run holds (a Pact with the week's in it stakes more), as many as the
        // week has left (one alone, PACT_MAX once Pacts are open)
        const owed = Math.min(trials.length, pactSize(state)) - (Math.floor(Number(week.won) || 0));
        if (owed > 0 && stage >= Math.max(week.bar + 1, weekly.first)) {
            week.won = (Math.floor(Number(week.won) || 0)) + owed;
            state.trials.laurels = (state.trials.laurels || 0) + owed;
            records += owed;
            bumpStat(game, 'laurels', owed);
            log(game, `🌿 ${weekly.name}, this week's Trial: stage ${stage}, past your best. ${owed > 1 ? `${owed} laurels: ${owed} records` : 'A laurel: a record'}, for good.`, 'achievement');
            game.emit({ type: 'laurel', id: weekly.id, stage, laurels: state.trials.laurels, count: owed });
        }
    }
    for (const trial of trials) {
        let target = nextTrialTarget(state, trial);
        while (target !== null && stage >= target) {
            state.trials.cleared[trial.id] = trialTier(state, trial.id) + 1;
            bumpStat(game, 'trialTiers');
            const tier = state.trials.cleared[trial.id];
            records++;
            log(game, `⚖️ ${trial.name}, tier ${tier} cleared: a record, for good.`, 'achievement');
            game.emit({ type: 'trialTier', id: trial.id, tier, last: tier === TRIAL_TIERS });   // (the fifth ends the first ladder; the rungs go on)
            target = nextTrialTarget(state, trial);
        }
    }
    if (records) game.recompute();   // the records count at once
    game.markDirty();
}

