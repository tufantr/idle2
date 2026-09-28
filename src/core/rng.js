// Random helpers. Everything that rolls dice goes through `rng` so the
// simulator (tools/simulate.mjs) can swap in a seeded generator and reproduce a run.

let source = Math.random;

export const rng = {
    /** Replace the underlying generator (used by tests and the simulator). */
    setSource(fn) { source = fn; },
    random() { return source(); },
    chance(p) { return source() < p; },
    int(min, max) { return min + Math.floor(source() * (max - min + 1)); },
    float(min, max) { return min + source() * (max - min); },
    pick(array) { return array[Math.floor(source() * array.length)]; },
    /** Weighted pick from [{ weight, ...}] entries. */
    weighted(entries) {
        const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = source() * total;
        for (const entry of entries) {
            roll -= entry.weight;
            if (roll < 0) return entry;
        }
        return entries[entries.length - 1];
    }
};

/** Small deterministic PRNG (mulberry32) for reproducible simulations. */
export function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
