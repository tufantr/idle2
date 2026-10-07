// The bestiary: every kind of monster the hero can meet, grouped by where it is met (the ten zones,
// the Abyss's strata, then the dungeons), and the stars a kind earns as it falls: one at 10 defeats,
// two at 100, three at 1,000. A name is listed once, where it is first met (the Wyvern of Skyreach is
// not listed again under the Dragon's Lair). The Titans are left out: each of them falls only once.

import { ZONES, STAGES_PER_ZONE } from './zones.js';
import { STRATA, STRATA_FROM, STRATUM_STAGES } from './strata.js';
import { DUNGEONS } from './dungeons.js';
import { enemyForStage } from '../core/formulas.js';

export const KILL_STARS = [10, 100, 1000];

/** Stars earned by `kills` defeats of one kind: 0 to 3. */
export function starsFor(kills) {
    return KILL_STARS.filter(t => kills >= t).length;
}

/** The defeats a kind needs for its next star, or null when it has all three. */
export function nextStarAt(kills) {
    return KILL_STARS.find(t => kills < t) ?? null;
}

function group(id, kind, name, names, boss, extra = {}, firstAt = null) {
    const monsters = [];
    names.forEach(n => {
        if (LISTED.has(n)) return;
        LISTED.add(n);
        monsters.push({ name: n, boss: n === boss, ...(firstAt ? { at: firstAt(n) } : {}) });
    });
    return { id, kind, name, monsters, ...extra };
}

/** The first stage from `from` to `to` where a monster named `name` stands (the stage ladder's own pick). */
const firstStage = (from, to) => name => {
    for (let stage = from; stage <= to; stage++) if (enemyForStage(stage).baseName === name) return stage;
    return to;
};

const LISTED = new Set();

/**
 * [{ id, kind: 'zone' | 'stratum' | 'dungeon', name, from?, monsters: [{ name, boss, at? }] }], places
 * before dungeons. A place's `from` is its first stage and a kind's `at` the first stage it stands on.
 */
export const BESTIARY = [
    ...ZONES.map((z, index) => {
        const from = index * STAGES_PER_ZONE + 1;
        return group(z.id, 'zone', z.name, [...z.monsters, z.boss], z.boss, { index, from }, firstStage(from, from + STAGES_PER_ZONE - 1));
    }),
    ...STRATA.slice(1).map((s, i) => {
        const from = STRATA_FROM + (i + 1) * STRATUM_STAGES;
        return group(s.id, 'stratum', s.name, [...s.monsters, s.boss], s.boss, { from }, firstStage(from, from + STRATUM_STAGES - 1));
    }),
    ...DUNGEONS.map(d => group(d.id, 'dungeon', d.name, [...d.monsters.map(m => m.name), d.boss.name], d.boss.name))
];

export const BESTIARY_NAMES = new Set(LISTED);
export const BESTIARY_SIZE = BESTIARY_NAMES.size;
export const BESTIARY_MAX_STARS = BESTIARY_SIZE * KILL_STARS.length;

/** Total stars across a `killsByMonster` table. */
export function bestiaryStars(killsByMonster) {
    let stars = 0;
    for (const [name, kills] of Object.entries(killsByMonster || {})) if (BESTIARY_NAMES.has(name)) stars += starsFor(kills);
    return stars;
}
