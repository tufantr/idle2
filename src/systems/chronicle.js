// The hero's chronicle: the firsts of a life, each with its date (shown in the Hall's Records). Noted
// from the game's own events as they happen, also while away (the game notes them before deciding
// whether anyone is watching): a new land, a pet, a unique, a dungeon's first clear, the first Titan,
// the first prestige and each rank after, a skill at 99. Each first once; the oldest go past 200.

import { rankFor } from '../data/ranks.js';

export const CHRONICLE_MAX = 200;
export const CHRONICLE_KINDS = new Set(['start', 'zone', 'pet', 'unique', 'dungeon', 'titan', 'prestige', 'rank', 'skill99']);

/** The chronicle entry an event makes ({ kind, id }), or null. Reads the state as it is after the event. */
export function chronicleEntry(state, ev) {
    switch (ev.type) {
        case 'zoneReached': return { kind: 'zone', id: ev.zone };
        case 'pet': return ev.pet?.id ? { kind: 'pet', id: ev.pet.id } : null;
        case 'unique': return ev.item?.locked ? { kind: 'unique', id: ev.item.uniqueId } : null;   // the first copy, not a spare
        case 'dungeonClear': return ev.clears === 1 ? { kind: 'dungeon', id: ev.dungeon } : null;
        case 'titan': return ev.won && state.titan?.kills === 1 ? { kind: 'titan', id: String(ev.level) } : null;
        case 'prestige': {
            const n = state.prestige?.count || 0;
            if (n === 1) return { kind: 'prestige', id: '1' };
            const rank = rankFor(n);
            return rank !== rankFor(n - 1) ? { kind: 'rank', id: rank.name } : null;
        }
        case 'levelUp': return ev.level >= 99 && ev.from < 99 ? { kind: 'skill99', id: ev.skill } : null;
        default: return null;
    }
}

/** Note what event `ev` means for the chronicle, at time `now` (a first not yet in it). */
export function noteChronicle(state, ev, now) {
    if (!Array.isArray(state?.chronicle)) return;
    const entry = chronicleEntry(state, ev);
    if (!entry || state.chronicle.some(e => e.kind === entry.kind && e.id === entry.id)) return;
    state.chronicle.push({ t: now, kind: entry.kind, id: String(entry.id) });
    if (state.chronicle.length > CHRONICLE_MAX) state.chronicle.splice(0, state.chronicle.length - CHRONICLE_MAX);
}
