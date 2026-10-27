// Experience curve: the Old School RuneScape / Melvor Idle table.
//   XP(L) = floor( (1/4) * sum_{l=1}^{L-1} floor(l + 300 * 2^(l/7)) )
// Doubles roughly every 7 levels: level 92 is the halfway point to 99.
// See docs/DESIGN.md §3.1 for why this curve was chosen.

import { TALENT_POINTS_MAX } from '../data/talents.js';

export const MAX_LEVEL = 99;

// Combat's levels go on past 99, along the same table, for the War Tree (data/talents.js): each one past 99 is a talent
// point, to the level that fills every talent. They count for nothing else: the skills' levels, and Combat's in every
// formula, stop at 99 (levelForXp).
export const MAX_COMBAT_LEVEL = MAX_LEVEL + TALENT_POINTS_MAX;

const XP_TABLE = (() => {
    const table = [0, 0]; // index = level; level 1 needs 0 XP
    let sum = 0;
    for (let level = 1; level < MAX_COMBAT_LEVEL; level++) {
        sum += Math.floor(level + 300 * Math.pow(2, level / 7));
        table.push(Math.floor(sum / 4));
    }
    return table; // table[L] = total XP required to be level L (L = 1..MAX_COMBAT_LEVEL)
})();

export const XP_FOR_MAX_LEVEL = XP_TABLE[MAX_LEVEL];
/** Where Combat's XP stops: the level that fills the War Tree. (Every other skill's stops at twice level 99's.) */
export const COMBAT_XP_CAP = XP_TABLE[MAX_COMBAT_LEVEL];

/** Total XP required to reach `level` (1..99). */
export function xpForLevel(level) {
    const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
    return XP_TABLE[clamped];
}

/** Level (1..99) for a given amount of total XP. */
export function levelForXp(xp) {
    if (!(xp > 0)) return 1;
    // Binary search the table; 99 entries, so this is trivially fast.
    let lo = 1;
    let hi = MAX_LEVEL;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (XP_TABLE[mid] <= xp) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/** Combat's level past 99 too (1..MAX_COMBAT_LEVEL): the War Tree's points are the levels above 99. */
export function combatLevelForXp(xp) {
    if (!(xp > 0)) return 1;
    let lo = 1;
    let hi = MAX_COMBAT_LEVEL;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (XP_TABLE[mid] <= xp) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/** Total XP for Combat's `level` (1..MAX_COMBAT_LEVEL). */
export const xpForCombatLevel = level => XP_TABLE[Math.max(1, Math.min(MAX_COMBAT_LEVEL, Math.floor(level)))];

/** Progress inside Combat's level past 99 too: { level, xpInto, xpNeeded, fraction } (fraction 1 at the last). */
export function combatProgress(xp) {
    const level = combatLevelForXp(xp);
    if (level >= MAX_COMBAT_LEVEL) return { level, xpInto: xp - XP_TABLE[level], xpNeeded: 0, fraction: 1 };
    const start = XP_TABLE[level];
    const next = XP_TABLE[level + 1];
    return { level, xpInto: xp - start, xpNeeded: next - start, fraction: (xp - start) / (next - start) };
}

/** Progress inside the current level as { level, xpInto, xpNeeded, fraction }. */
export function levelProgress(xp) {
    const level = levelForXp(xp);
    if (level >= MAX_LEVEL) {
        return { level, xpInto: xp - XP_TABLE[MAX_LEVEL], xpNeeded: 0, fraction: 1 };
    }
    const start = XP_TABLE[level];
    const next = XP_TABLE[level + 1];
    return { level, xpInto: xp - start, xpNeeded: next - start, fraction: (xp - start) / (next - start) };
}
