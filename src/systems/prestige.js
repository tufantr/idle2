// Prestige: convert this run's best stage into permanent tokens and skill points.

import { tokensForStage, prestigeStartStage, skillPointsForStages, BALANCE } from '../core/formulas.js';
import { PERKS } from '../data/perks.js';
import { spawnEnemy, leaveCombat } from './combat.js';
import { resetCamp } from './camp.js';
import { log, bumpStat } from './progress.js';

/** Milliseconds until this run may be prestiged (0 when it may). */
export function prestigeWaitMs(state, now) {
    return Math.max(0, (state.prestige.runStartedAt || 0) + BALANCE.prestige.minRunMs - now);
}

// A run must reach stage 10 and last ten minutes. Without the time rule a run that starts past
// stage 10 (anyone whose best is 100+) could be prestiged again at once, for tokens and a skill point
// each time, forever.
export function canPrestige(state, now) {
    return state.combat.maxStage >= BALANCE.prestige.minStage && prestigeWaitMs(state, now) === 0;
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
        fullRun: fullRun(state),
        tokens,
        skillPoints: sp,
        startStage: prestigeStartStage(state.combat.bestStage),
        tokensAfter: state.prestige.tokens + tokens,
        nextZoneTokens: tokensForStage(Math.ceil((state.combat.maxStage + 1) / 10) * 10, game.derived.tokenMult)
    };
}

export function doPrestige(game) {
    const state = game.state;
    if (!canPrestige(state, game.now)) return false;
    const preview = prestigePreview(game);
    leaveCombat(game);
    state.prestige.tokens += preview.tokens;
    state.prestige.skillPoints += preview.skillPoints;
    state.prestige.spClaimedStage = Math.max(state.prestige.spClaimedStage, state.combat.bestStage);
    state.prestige.count += 1;
    state.prestige.runStartedAt = game.now;
    bumpStat(game, 'prestiges');
    state.combat.stage = preview.startStage;
    state.combat.maxStage = preview.startStage;
    state.combat.combo = 0;
    state.combat.regroupLeft = 0;
    state.gold = 0;          // combat gold is run-scoped, like the camp it buys
    resetCamp(state);
    game.recompute();
    state.combat.hp = game.derived.maxHp;
    spawnEnemy(game);
    log(game, `✨ Prestige ${state.prestige.count}: +${preview.tokens} tokens, +${preview.skillPoints} skill points. Starting at stage ${preview.startStage}.`, 'prestige');
    game.emit({ type: 'prestige', ...preview });
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
