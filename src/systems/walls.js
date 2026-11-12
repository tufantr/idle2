// A wall that repeats goes quiet (P-081 in the research loop; DESIGN §3.21). At a wall a hero falls about twice a
// minute (a hero saved on first reaching stage 300 fell 57 times in 30 minutes), or a boss holds out every 90 seconds,
// and each came with the defeat jingle, the banner and the red edge: a routine sounded as a big moment. The first fall
// or timeout at a wall keeps all three; for WALL_QUIET_MS after it, the next ones there play a soft cue and are counted
// in one toast. Then the next is loud again, and a new count begins.
//
// A wall is a kind (a fall, a boss that held out) in a zone of ten stages: a fall sends the hero back to the zone's
// start, so the falls that follow land a stage or two either side of the first, and the zone's boss is its end. Only
// the stage ladder has walls: a fall in a dungeon, at the Titan or the clan boss ends that fight, and stays loud.
// Pure: the memo is the screen's (src/main.js), never the save.

import { STAGES_PER_ZONE } from '../data/zones.js';

export const WALL_QUIET_MS = 10 * 60000;

/** The wall an event meets (`death:29`, `bossTimeout:29`), or null when it is no wall. */
export function wallOf(ev) {
    if (!ev || !(Number(ev.stage) >= 1)) return null;
    if (ev.type === 'death' && ev.mode === 'stages') return `death:${Math.floor((ev.stage - 1) / STAGES_PER_ZONE)}`;
    if (ev.type === 'bossTimeout') return `bossTimeout:${Math.floor((ev.stage - 1) / STAGES_PER_ZONE)}`;
    return null;
}

/**
 * Note a fall or a timeout at `now` in `memo` (a plain object the screen keeps). Null for an event that meets no wall;
 * `{ loud: true }` for the first at its wall in WALL_QUIET_MS; `{ loud: false, again }` for a repeat, `again` counting
 * the repeats since that first one (1, 2, 3...).
 */
export function noteWall(memo, ev, now) {
    const key = wallOf(ev);
    if (!key || !memo || !Number.isFinite(now)) return null;
    for (const k of Object.keys(memo)) if (!(now - memo[k].since < WALL_QUIET_MS) || now < memo[k].since) delete memo[k];   // gone quiet long enough
    const wall = memo[key];
    if (!wall) { memo[key] = { since: now, again: 0 }; return { loud: true }; }
    wall.again++;
    return { loud: false, again: wall.again };
}
