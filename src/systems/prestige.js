// Prestige: convert this run's best stage into permanent tokens and skill points.

import { tokensForStage, prestigeStartStage, skillPointsForStages, BALANCE } from '../core/formulas.js';
import { PERKS } from '../data/perks.js';
import { spawnEnemy, leaveCombat, enterCombat } from './combat.js';
import { resetCamp } from './camp.js';
import { log, bumpStat } from './progress.js';

/** Milliseconds until this run may be prestiged (0 when it may). */
export function prestigeWaitMs(state, now) {
    return Math.max(0, (state.prestige.runStartedAt || 0) + BALANCE.prestige.minRunMs - now);
}

/** What a prestige would end, so it waits: the Titan fight (the hour's attempt would be lost) or a dungeon run. */
export const prestigeBlockedBy = state => (state.combat.mode === 'titan' || state.combat.mode === 'dungeon' ? state.combat.mode : null);

// A run must reach stage 10 and last ten minutes. Without the time rule a run that starts past
// stage 10 (anyone whose best is 100+) could be prestiged again at once, for tokens and a skill point
// each time, forever.
export function canPrestige(state, now) {
    return state.combat.maxStage >= BALANCE.prestige.minStage && prestigeWaitMs(state, now) === 0 && !prestigeBlockedBy(state);
}

/** The per-prestige skill point is for a real run: one that got at least halfway to your best. */
export function fullRun(state) {
    return state.combat.maxStage >= BALANCE.prestige.fullRunFraction * state.combat.bestStage;
}

export function prestigePreview(game) {
    const state = game.state;
    const tokens = tokensForStage(state.combat.maxStage, game.derived.tokenMult);
    const sp = (fullRun(state) ? BALANCE.prestige.spPerPrestige : 0) + skillPointsForStages(state.combat.bestStage, state.prestige.spClaimedStage);
    return {
        allowed: canPrestige(state, game.now),
        waitMs: prestigeWaitMs(state, game.now),
        blockedBy: prestigeBlockedBy(state),   // 'titan' or 'dungeon' while one is under way
        fullRun: fullRun(state),
        tokens,
        skillPoints: sp,
        startStage: prestigeStartStage(state.combat.bestStage),
        tokensAfter: state.prestige.tokens + tokens,
        nextZoneTokens: tokensForStage(Math.ceil((state.combat.maxStage + 1) / 10) * 10, game.derived.tokenMult)
    };
}

export function doPrestige(game, { auto = false, trial = null, ascend = false } = {}) {
    const state = game.state;
    if (!canPrestige(state, game.now)) return false;
    const preview = prestigePreview(game);
    const reached = state.combat.maxStage;
    leaveCombat(game);
    state.prestige.tokens += preview.tokens;
    state.prestige.skillPoints += preview.skillPoints;
    state.prestige.spClaimedStage = Math.max(state.prestige.spClaimedStage, state.combat.bestStage);
    state.prestige.count += 1;
    if (!state.prestige.firstAt) state.prestige.firstAt = game.now;   // the Auto switch comes two days on, at the latest
    state.prestige.runStartedAt = game.now;
    bumpStat(game, 'prestiges');
    state.combat.stage = preview.startStage;
    state.combat.maxStage = preview.startStage;
    state.combat.combo = 0;
    state.combat.regroupLeft = 0;
    state.combat.farmMode = false;   // "stay on this stage" was for the old run: the new one climbs
    state.combat.stallMs = 0;
    if (state.trials) state.trials.active = trial;   // a prestige ends a Trial, or begins one (systems/trials.js startTrial)
    state.gold = 0;          // combat gold is run-scoped, like the camp it buys
    resetCamp(state);
    game.recompute();
    state.combat.hp = game.derived.maxHp;
    spawnEnemy(game);
    log(game, `✨ Prestige ${state.prestige.count}: +${preview.tokens} tokens, +${preview.skillPoints} skill point${preview.skillPoints === 1 ? '' : 's'}. Starting at stage ${preview.startStage}.`, 'prestige');
    game.emit({ type: 'prestige', ...preview, auto, reached, trial, ascend });   // (an Ascension has its own card: systems/ascension.js)
    game.markDirty();
    return true;
}

export function buyPerk(game, perkId) {
    const state = game.state;
    const perk = PERKS.find(p => p.id === perkId);
    if (!perk) return false;
    if (state.prestige.skillPoints < 1) { game.emit({ type: 'error', text: 'No skill points. Prestige to earn more.' }); return false; }
    if ((state.perks[perkId] || 0) >= perk.max) { game.emit({ type: 'error', text: `${perk.name} is maxed out.` }); return false; }
    state.prestige.skillPoints -= 1;
    state.perks[perkId] = (state.perks[perkId] || 0) + 1;
    game.markDirty();
    return true;
}

/** Has the hero earned the auto-prestige switch? autoAfter prestiges, or autoAfterMs since the first. */
export function autoPrestigeEarned(state, now = state.meta?.lastActiveAt || 0) {
    const p = state.prestige;
    return p.count >= BALANCE.prestige.autoAfter || (p.count >= 1 && p.firstAt > 0 && now - p.firstAt >= BALANCE.prestige.autoAfterMs);
}

/**
 * Milliseconds until the auto-prestige would fire for this run, or null while it can't: the switch is
 * off (or not earned), the hero isn't climbing the stages (working, staying on a stage, in a dungeon
 * or at the Titan), or the run hasn't reached the prestige stage. A run that has spent `autoStallMs`
 * climbing without a new best stage (`combat.stallMs`, which only runs while he fights or rests to
 * fight on), and has lasted its ten minutes, goes at once.
 */
export function autoPrestigeIn(state, now) {
    const c = state.combat;
    if (!state.settings.autoPrestige || !autoPrestigeEarned(state, now)) return null;
    if (!(c.active || c.recovering) || c.mode !== 'stages' || c.farmMode || c.maxStage < BALANCE.prestige.minStage) return null;
    return Math.max(0, BALANCE.prestige.autoStallMs - (c.stallMs || 0), prestigeWaitMs(state, now));
}

/** The auto-prestige, checked as the fight goes on (online and in the offline replay): true if it went. */
export function tickAutoPrestige(game) {
    if (autoPrestigeIn(game.state, game.now) !== 0) return false;
    if (!doPrestige(game, { auto: true })) return false;
    enterCombat(game);   // the next run's first fight, as a prestige from the dock does (rested or not)
    return true;
}

export function setAutoPrestige(game, on) {
    if (on && !autoPrestigeEarned(game.state, game.now)) return false;
    game.state.settings.autoPrestige = !!on;
    game.markDirty();
    return true;
}
