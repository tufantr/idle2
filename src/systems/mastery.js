// Mastery levels per action (see data/mastery.js for the rules and numbers).

import { MASTERY_MAX_LEVEL, MASTERY_XP_DIVISOR, MASTERY_PER_LEVEL, MASTERY_MILESTONES, masteryActions } from '../data/mastery.js';
import { SKILLS } from '../data/skills.js';
import { levelForXp, levelProgress, xpForLevel } from '../core/xp.js';
import { log, bumpStat } from './progress.js';

const MAX_MASTERY_XP = xpForLevel(MASTERY_MAX_LEVEL) / MASTERY_XP_DIVISOR;

export function masteryXp(state, skillId, key) {
    return state.mastery?.[skillId]?.[key] || 0;
}

export function masteryLevel(state, skillId, key) {
    return levelForXp(masteryXp(state, skillId, key) * MASTERY_XP_DIVISOR);
}

/** { level, fraction, xpInto, xpNeeded } in mastery XP (seconds of action). */
export function masteryProgress(state, skillId, key) {
    const p = levelProgress(masteryXp(state, skillId, key) * MASTERY_XP_DIVISOR);
    return { level: p.level, fraction: p.fraction, xpInto: p.xpInto / MASTERY_XP_DIVISOR, xpNeeded: p.xpNeeded / MASTERY_XP_DIVISOR };
}

/**
 * What a mastery level gives an action. `produces` (resources come out) and `hasInputs` pick which
 * bonuses apply; see data/mastery.js.
 */
export function masteryBonus(level, { produces = true, hasInputs = false } = {}) {
    const steps = Math.max(0, Math.min(MASTERY_MAX_LEVEL, level) - 1);
    return {
        speed: steps * MASTERY_PER_LEVEL.speed,
        double: produces ? steps * MASTERY_PER_LEVEL.double : 0,
        preserve: hasInputs ? steps * MASTERY_PER_LEVEL.preserve : 0
    };
}

/** The mastery block resolveAction attaches to an action definition. */
export function masteryFor(state, skillId, key, def) {
    const level = masteryLevel(state, skillId, key);
    const hasInputs = Object.keys(def.consumes || {}).length > 0 || !!def.fuel;
    const produces = def.kind !== 'smith' && def.kind !== 'craft';
    return { key, level, ...masteryBonus(level, { produces, hasInputs }) };
}

/** Add mastery XP for one action. Returns the new level if it went up, else 0. */
export function addMasteryXp(game, skillId, key, amount) {
    const state = game.state;
    if (!state.mastery[skillId]) state.mastery[skillId] = {};
    const before = masteryLevel(state, skillId, key);
    state.mastery[skillId][key] = Math.min(MAX_MASTERY_XP, masteryXp(state, skillId, key) + amount);
    const after = masteryLevel(state, skillId, key);
    if (after <= before) return 0;
    bumpStat(game, 'masteryLevels', after - before);
    state.stats.masteryBest = Math.max(state.stats.masteryBest || 0, after);
    if (after >= MASTERY_MAX_LEVEL) bumpStat(game, 'masteries99');
    const action = masteryActions(skillId).find(a => a.key === key);
    for (const m of MASTERY_MILESTONES) {
        if (before < m && after >= m) log(game, `${SKILLS[skillId].icon} ${action?.name || key}: mastery ${m}!`, m >= MASTERY_MAX_LEVEL ? 'achievement' : 'level');
    }
    game.emit({ type: 'masteryLevel', skill: skillId, key, name: action?.name || key, level: after, from: before });
    game.markDirty();
    return after;
}

/** A skill's mastery at a glance: { levels, max, actions, maxed }, where levels count above 1. */
export function skillMastery(state, skillId) {
    const actions = masteryActions(skillId);
    let levels = 0;
    let maxed = 0;
    for (const a of actions) {
        const level = masteryLevel(state, skillId, a.key);
        levels += level - 1;
        if (level >= MASTERY_MAX_LEVEL) maxed++;
    }
    return { levels, max: actions.length * (MASTERY_MAX_LEVEL - 1), actions: actions.length, maxed };
}
