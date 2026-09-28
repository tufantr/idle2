// Experience curve: the Old School RuneScape / Melvor Idle table.
//   XP(L) = floor( (1/4) * sum_{l=1}^{L-1} floor(l + 300 * 2^(l/7)) )
// Doubles roughly every 7 levels: level 92 is the halfway point to 99.
// See docs/DESIGN.md §3.1 for why this curve was chosen.

export const MAX_LEVEL = 99;

const XP_TABLE = (() => {
    const table = [0, 0]; // index = level; level 1 needs 0 XP
    let sum = 0;
    for (let level = 1; level < MAX_LEVEL; level++) {
        sum += Math.floor(level + 300 * Math.pow(2, level / 7));
        table.push(Math.floor(sum / 4));
    }
    return table; // table[L] = total XP required to be level L (L = 1..99)
})();

export const XP_FOR_MAX_LEVEL = XP_TABLE[MAX_LEVEL];

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
