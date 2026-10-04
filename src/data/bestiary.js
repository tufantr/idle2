// The bestiary: every kind of monster the hero can meet, grouped by where it is met (the ten zones,
// then the dungeons), and the stars a kind earns as it falls: one at 10 defeats, two at 100, three at
// 1,000. A name is listed once, where it is first met (the Wyvern of Skyreach is not listed again
// under the Dragon's Lair). The Titans are left out: each of them falls only once.

import { ZONES, STAGES_PER_ZONE } from './zones.js';
import { DUNGEONS } from './dungeons.js';

export const KILL_STARS = [10, 100, 1000];

/** Stars earned by `kills` defeats of one kind: 0 to 3. */
export function starsFor(kills) {
    return KILL_STARS.filter(t => kills >= t).length;
}

/** The defeats a kind needs for its next star, or null when it has all three. */
export function nextStarAt(kills) {
    return KILL_STARS.find(t => kills < t) ?? null;
}

// `at` (zones only): the stage of its zone where a kind is first met. The zone's four kinds come in
// turn from its first stage, and its boss waits on the tenth.
function group(id, kind, name, names, boss, extra = {}) {
    const monsters = [];
    names.forEach((n, i) => {
        if (LISTED.has(n)) return;
        LISTED.add(n);
        monsters.push({ name: n, boss: n === boss, ...(kind === 'zone' ? { at: n === boss ? STAGES_PER_ZONE : i + 1 } : {}) });
    });
    return { id, kind, name, monsters, ...extra };
}

const LISTED = new Set();

/** [{ id, kind: 'zone' | 'dungeon', name, index?, monsters: [{ name, boss, at? }] }], in the order they are met. */
export const BESTIARY = [
    ...ZONES.map((z, index) => group(z.id, 'zone', z.name, [...z.monsters, z.boss], z.boss, { index })),
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
