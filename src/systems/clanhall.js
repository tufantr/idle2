// The Clan Hall in the game (DESIGN §3.35, data/clanhall.js). The server keeps the hall; the game keeps a copy of what it
// last said (state.clanHall): each room's level for the bonuses it gives (core/modifiers.js), the stage, the banner's
// colour and emblem, and whether the hero wears the clan's cloak (data/capes.js). A gift leaves the bank when the server
// says it was given (`hallGifts` in its answers, numbered for the player): each is taken once, by its number.

import { HALL_ROOMS, HALL_STAGES, BANNER_COLOURS, BANNER_EMBLEMS, roomLevel } from '../data/clanhall.js';
import { RESOURCES } from '../data/resources.js';
import { CLAN_CLOAK } from '../data/capes.js';

const noRooms = () => Object.fromEntries(HALL_ROOMS.map(r => [r.id, 0]));

/** The hall as the game keeps it: nothing built, outside a clan. */
export const emptyHall = (lastGift = 0) => ({ clan: 0, rooms: noRooms(), stage: 0, colour: '', emblem: '', cloak: false, lastGift });

/**
 * The server's word on the clan's hall (hallOf in api/index.js), or null outside a clan: the bonuses follow it. A room
 * that rose, a new stage and the cloak are told once (events), while the hero stays in the same clan: joining one whose
 * hall stands already is not a rise. The first time the cloak is his, the hero puts it on, as a new skill cape is.
 */
export function setClanHall(game, hall) {
    const state = game.state;
    const was = state.clanHall || emptyHall();
    const next = hall && typeof hall === 'object' ? {
        clan: Math.max(0, Math.floor(Number(hall.clan) || 0)),
        rooms: Object.fromEntries(HALL_ROOMS.map(r => [r.id, roomLevel(hall.rooms?.[r.id])])),
        stage: Math.max(0, Math.min(HALL_STAGES.length - 1, Math.floor(Number(hall.stage) || 0))),
        colour: BANNER_COLOURS.some(c => c.id === hall.colour) ? hall.colour : '',
        emblem: BANNER_EMBLEMS.some(e => e.id === hall.emblem) ? hall.emblem : '',
        cloak: hall.cloak === true
    } : emptyHall();
    next.lastGift = was.lastGift || 0;
    const same = HALL_ROOMS.every(r => next.rooms[r.id] === was.rooms?.[r.id]) && ['clan', 'stage', 'colour', 'emblem', 'cloak'].every(k => next[k] === was[k]);
    if (same) return false;
    state.clanHall = next;
    if (next.clan && next.clan === was.clan) {
        for (const room of HALL_ROOMS) if (next.rooms[room.id] > (was.rooms?.[room.id] || 0)) game.emit({ type: 'hallRoom', room: room.id, level: next.rooms[room.id] });
        if (next.stage > was.stage) game.emit({ type: 'hallStage', stage: next.stage });
        if (next.cloak && !was.cloak) {
            if (state.hero) state.hero.cape = CLAN_CLOAK.skill;
            game.emit({ type: 'hallCloak', colour: next.colour });
        }
    }
    game.markDirty();
    return true;
}

/**
 * Take the hall's gifts the server says were given (`gifts`: [{ seq, resource, qty }]) out of the bank, each once: those
 * numbered past the last taken (state.clanHall.lastGift). A thing used since the upload it was given from is not there to
 * take, and the bank stops at nothing. Returns what was taken.
 */
export function applyHallGifts(game, gifts) {
    const state = game.state;
    const taken = [];
    const list = (Array.isArray(gifts) ? gifts : []).map(g => ({ seq: Math.floor(Number(g?.seq)), resource: String(g?.resource || ''), qty: Math.max(0, Math.floor(Number(g?.qty) || 0)) }))
        .filter(g => Number.isSafeInteger(g.seq)).sort((a, b) => a.seq - b.seq);
    for (const g of list) {
        if (g.seq <= state.clanHall.lastGift) continue;
        state.clanHall.lastGift = g.seq;
        if (!RESOURCES[g.resource] || !g.qty) continue;
        state.resources[g.resource] = Math.max(0, (state.resources[g.resource] || 0) - g.qty);
        taken.push({ resource: g.resource, qty: g.qty });
    }
    state.meta.hallGift = state.clanHall.lastGift;   // (kept where an older page keeps it: core/state.js)
    if (list.some(g => g.seq > 0)) game.markDirty();
    return taken;
}
