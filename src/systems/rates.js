// The skill screens' readouts (P-002; DESIGN §3.37): XP an hour, the time to the next level and how long the materials
// last, for the work under way, from the same numbers the work itself runs on (systems/skilling.js). Pure: it reads the
// state, and every answer is null where there is nothing true to say: no work in that skill, work stalled, a skill with no
// steady pace (Farming grows on the clock, the anvil and the bench go by the click).

import { levelProgress, XP_FOR_MAX_LEVEL } from '../core/xp.js';
import { resolveAction, intervalFor, actionXp, canComplete, consumesOf } from './skilling.js';
import { charmCharges } from './charms.js';

const HOUR = 3600000;

/**
 * The hero's numbers without a mini-game's burst on this skill: it lasts seconds, so it is no pace to reckon an hour by. Every
 * other bonus at work now counts (a potion, the bonfire, Focus), as the work itself feels them.
 */
function steady(state, derived, skill) {
    const mg = state.minigame?.[skill];
    const boost = mg && mg.boostUntil > (state.meta.lastActiveAt || Date.now()) ? Math.max(1, mg.mult || 1) : 1;
    return boost === 1 ? derived : { ...derived, skillMult: { ...derived.skillMult, [skill]: (derived.skillMult?.[skill] || 1) / boost } };
}

/** One action's pace: { interval (ms), xpEach, perHour }. A log burnt twice pays twice (systems/skilling.js completeAction). */
export function actionPace(state, derived, def) {
    const d = steady(state, derived, def.skill);
    const interval = intervalFor(def, d);
    const twice = def.bonfireLog ? Math.min(1, (d.doubleChance?.[def.skill] || 0) + (def.mastery?.double || 0)) : 0;
    const xpEach = actionXp(def.xp, d) * (1 + twice);
    return { interval, xpEach, perHour: xpEach * HOUR / interval };
}

/**
 * How long what the hero holds keeps this action going, about: { ms, first }, `first` the material that runs out first, or
 * null for work that takes nothing or can't go on. `progress` is what the action under way has done of its time. Mastery may
 * keep the ingredients, and the Furnace Bellows' charges spare the coal (systems/skilling.js).
 */
export function materialsLast(state, derived, def, progress = 0) {
    const needs = Object.entries(def.consumes || {});
    if (!needs.length || !canComplete(state, def).ok) return null;
    const takes = consumesOf(state, def);
    const spared = def.kind === 'smelt' && !takes.coal ? charmCharges(state, 'furnace_bellows') : 0;
    let runs = Infinity;
    let first = null;
    for (const [id, qty] of needs) {
        const these = Math.floor((state.resources[id] || 0) / qty) + (id === 'coal' ? spared : 0);
        if (these < runs) { runs = these; first = id; }
    }
    const paid = 1 - Math.min(0.95, def.mastery?.preserve || 0);   // the actions that really take something
    return { ms: Math.max(0, runs / paid * actionPace(state, derived, def).interval - progress), first };
}

/**
 * The work going on in `skill`, for its header: { perHour, nextLevel, toNextMs, def } (`nextLevel` and `toNextMs` null at the top
 * level), or null when the hero isn't at steady work there.
 */
export function skillPace(state, derived, skill) {
    const action = state.action;
    if (!action || action.stalled) return null;
    const def = resolveAction(state);
    if (!def || def.skill !== skill || !canComplete(state, def).ok) return null;
    const xp = state.skills[skill]?.xp || 0;
    if (xp >= XP_FOR_MAX_LEVEL * 2) return null;   // (past this a skill's XP stops: progress.js grantXp)
    const { perHour } = actionPace(state, derived, def);
    if (!(perHour > 0)) return null;
    const p = levelProgress(xp);
    return { def, perHour, nextLevel: p.xpNeeded > 0 ? p.level + 1 : null, toNextMs: p.xpNeeded > 0 ? (p.xpNeeded - p.xpInto) / perHour * HOUR : null };
}
