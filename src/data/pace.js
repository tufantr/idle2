// Melvor pace: how long the late game of each skill takes (the owner's choice: 99 in a skill takes
// hundreds of hours, as in Melvor Idle). The XP in the data files is each action's base XP; an action
// that opens late in its skill gives less, applied once as each data list loads (so cards, pops, the
// pacing tool and the simulator all see the same numbers). An action opening at PACE_FROM or below
// keeps its XP, so the first levels come as quickly as ever; one opening at PACE_TO or above gives
// its XP divided by its skill's factor; in between, the division grows evenly. A newer action never
// pays less XP per hour than an older one of its kind (it would make the old one the better choice),
// so where the division would do that, the newer one is raised to match. Combat is paced by the
// hero's combat level instead (BALANCE.rewards.xpPace in core/formulas.js).
// Old saves keep their levels: only the XP still to come changes. `node tools/pacing.mjs` shows the
// result; DESIGN §5 has the numbers.

import { RESOURCES } from './resources.js';

export const PACE_FROM = 20;
export const PACE_TO = 75;
export const PACE = {
    mining: 2.1, woodcutting: 2.0, fishing: 2.15, hunting: 2.05,
    cooking: 3.2, firemaking: 3.4, alchemy: 1.1,
    smithing: 2.3, crafting: 4,
    farming: 1, agility: 1.2
};

/** How much an action opening at `levelReq` in `skill` is slowed (1 = not at all). */
export function paceDivisor(skill, levelReq) {
    const slow = PACE[skill] ?? 1;
    const t = Math.max(0, Math.min(1, (levelReq - PACE_FROM) / (PACE_TO - PACE_FROM)));
    return 1 + (slow - 1) * t;
}

/** An action's XP at Melvor pace: a whole number, at least 1. */
export const pacedXp = (skill, xp, levelReq) => Math.max(1, Math.round(xp / paceDivisor(skill, levelReq)));

// The kind of an action, for comparing XP per hour: what it works on (the first input's category:
// raw meat and fish, crops, herbs, ore...), or gathering when it takes nothing.
const kindOf = a => {
    const first = a.consumes && Object.keys(a.consumes)[0];
    return first ? RESOURCES[first]?.category || first : 'gather';
};
// How long one action takes, to turn its XP into XP per hour (1 for lists priced per piece or per bar).
const timeOf = a => a.interval || a.growMs || 1;

/**
 * Pace a list of actions in place, keeping each one's base XP as `baseXp` (`key` names the XP field,
 * `levelOf` the level an action opens at).
 */
export function paceList(skill, list, { key = 'xp', levelOf = a => a.levelReq } = {}) {
    for (const a of list) {
        const base = a.baseXp ?? a[key];
        a.baseXp = base;
        a[key] = pacedXp(skill, base, levelOf(a));
    }
    if ((PACE[skill] ?? 1) === 1) return list;   // not slowed, so nothing to put back in order (farming's XP also comes per crop, not per hour)
    // Each kind in level order: an action pays at least the best XP per hour of those opening before it.
    const best = {};
    const byLevel = [...list].sort((x, y) => levelOf(x) - levelOf(y));
    for (let i = 0; i < byLevel.length;) {
        const level = levelOf(byLevel[i]);
        const same = [];
        while (i < byLevel.length && levelOf(byLevel[i]) === level) same.push(byLevel[i++]);
        for (const a of same) {
            const floor = best[kindOf(a)];
            if (floor) a[key] = Math.max(a[key], Math.ceil(floor * timeOf(a)));
        }
        for (const a of same) best[kindOf(a)] = Math.max(best[kindOf(a)] || 0, a[key] / timeOf(a));
    }
    return list;
}
