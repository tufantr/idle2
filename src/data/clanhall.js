// The Clan Hall (DESIGN §3.35; the owner's go, 27 October 2026): a hall the clan builds together from what its members
// make. Six rooms of five levels each take a kind of goods (the Forge bars, the Stores ores, logs and raw meat and fish,
// the Kitchen food, the Apothecary herbs and potions, the Garden crops, the Library essence and gems), and each level gives
// every member a small bonus to skilling or supplies, for good while they stay in the clan: nothing to attack, defence or
// health, so the boards and the clan boss stay as they were. As rooms are built the hall itself grows, Camp to Citadel,
// each stage its own painting behind the Clan tab and more colours and emblems for the clan's banner; from the Great Hall
// a member who has given HALL.cloakHours wears the clan's cloak if they like.
//
// A gift counts in work: the seconds the thing takes to make at base speed, its inputs' too (a copper bar 5 s, a runite
// bar 16 s, a cooked shark 13 s), so a new member's copper counts for as much per hour of work as a veteran's runite.
// Crops count their plot's growing time over a harvest (six plots), gems ten seconds a tier (the fight drops them by the
// thousand), essence a second each. Each member gives at most HALL.weeklyHours of work a week (the clan boss's week, any
// clan): a deep bank holds hundreds of hours (the simulated stage-1,000 hero 1,800, mostly gems), and the allowance makes
// every member count the same, a stockpile build no citadel in a day, and a forged save give little. Nothing decays and
// nothing is owed: RuneScape cut its citadels' weekly upkeep by four fifths in 2017 after clans found it a chore. The
// server keeps the hall (api/index.js); the game keeps a copy of what it says (state.clanHall) for the bonuses.

import { SKILLS } from './skills.js';
import { SMELTING_RECIPES } from './workshop.js';
import { CROPS, FARMING_PLOTS } from './farming.js';
import { RESOURCES } from './resources.js';

export const HALL = {
    weeklyHours: 3,                  // work a member may give a week
    levelHours: [2, 6, 15, 30, 60],  // work each level of a room takes (113 hours a room, 678 the six)
    cloakHours: 10                   // work given to the clan for its cloak (from the Great Hall)
};
export const HALL_LEVELS = HALL.levelHours.length;
export const WEEKLY_SECONDS = HALL.weeklyHours * 3600;

/** The work (seconds) a room has had when it reaches each level: 2 h, 8 h, 23 h, 53 h, 113 h. */
export const LEVEL_AT = HALL.levelHours.reduce((list, h) => [...list, (list.at(-1) || 0) + h * 3600], []);
export const ROOM_SECONDS = LEVEL_AT.at(-1);

/** A room's level for the work it has had (0 to HALL_LEVELS). */
export const roomLevel = seconds => LEVEL_AT.filter(at => (Number(seconds) || 0) >= at).length;

// Each room: what it takes (resource categories, or ids), its painting (assets/paint), and its bonus a level, as modifier
// pieces (core/modifiers.js collectModifiers adds `mods` times the level).
export const HALL_ROOMS = [
    { id: 'forge', name: 'Forge', art: 'forge', icon: 'res/runite_bar', takes: ['bar'], takesText: 'bars',
        mods: { skillSpeed: { smithing: 0.02, crafting: 0.02 } }, text: l => `+${2 * l}% Smithing and Crafting speed` },
    { id: 'stores', name: 'Stores', art: 'storeroom', icon: 'res/iron_ore', takes: ['ore', 'log', 'raw'], takesText: 'ores, logs, raw meat and fish',
        mods: { skillSpeed: { mining: 0.02, woodcutting: 0.02, hunting: 0.02 } }, text: l => `+${2 * l}% Mining, Woodcutting and Hunting speed` },
    { id: 'kitchen', name: 'Kitchen', art: 'supplies', icon: 'res/cooked_shark', takes: ['food'], takesText: 'cooked food',
        mods: { foodMult: 0.04 }, text: l => `food heals ${4 * l}% more` },
    { id: 'apothecary', name: 'Apothecary', art: 'lab', icon: 'res/combat_potion_4', takes: ['herb', 'potion'], takesText: 'herbs and potions',
        mods: { potionDuration: 0.05 }, text: l => `potion doses last ${5 * l}% longer` },
    { id: 'garden', name: 'Garden', art: 'farm', icon: 'res/pumpkin', takes: ['crop'], takesText: 'crops',
        mods: { farmYield: 0.03 }, text: l => `harvests ${3 * l}% bigger` },
    { id: 'library', name: 'Library', art: 'library', icon: 'res/essence', takes: ['gem', 'essence'], takesText: 'gems and essence',
        mods: { skillXp: 0.02 }, text: l => `+${2 * l}% XP in every skill but Combat` }
];
export const hallRoom = id => HALL_ROOMS.find(r => r.id === id) || null;

// The hall's stages, by the room levels built (all six rooms' together), each with its painting (assets/paint/clan<id>.webp:
// the same clearing, the hall grown on it).
export const HALL_STAGES = [
    { id: 'camp', name: 'Camp', levels: 0 },
    { id: 'longhouse', name: 'Longhouse', levels: 6 },
    { id: 'greathall', name: 'Great Hall', levels: 12 },
    { id: 'keep', name: 'Keep', levels: 20 },
    { id: 'citadel', name: 'Citadel', levels: HALL_ROOMS.length * HALL_LEVELS }
].map(s => ({ ...s, art: `clan${s.id}` }));
/** The stage (index) the hall stands at with `levels` room levels built. */
export const hallStage = levels => HALL_STAGES.reduce((at, s, i) => ((Number(levels) || 0) >= s.levels ? i : at), 0);
/** The stage from which a member who has given enough wears the clan's cloak (data/capes.js). */
export const CLOAK_STAGE = HALL_STAGES.findIndex(s => s.id === 'greathall');

// The banner's colours and emblems (the clan's owner picks: api/index.js), more of each at every stage. The colour is the
// cloak's too.
export const BANNER_COLOURS = [
    { id: 'crimson', hex: '#b91c1c', stage: 0 }, { id: 'azure', hex: '#1d4ed8', stage: 0 },
    { id: 'forest', hex: '#15803d', stage: 1 }, { id: 'gold', hex: '#b88a1a', stage: 1 },
    { id: 'violet', hex: '#6d28d9', stage: 2 }, { id: 'ivory', hex: '#d6d3c4', stage: 2 },
    { id: 'onyx', hex: '#27272a', stage: 3 }, { id: 'teal', hex: '#0f766e', stage: 4 }
];
export const BANNER_EMBLEMS = [
    { id: 'sword', icon: 'item/Weapon/6', stage: 0 }, { id: 'shield', icon: 'item/Shield/6', stage: 0 },
    { id: 'crown', icon: 'crown', stage: 1 }, { id: 'troll', icon: 'mon/Mountain Troll', stage: 1 },
    { id: 'griffin', icon: 'mon/Griffin', stage: 2 }, { id: 'roc', icon: 'mon/Thunder Roc', stage: 3 },
    { id: 'hydra', icon: 'mon/Marsh Hydra', stage: 3 }, { id: 'dragon', icon: 'mon/Ember Drake', stage: 4 }
];
export const bannerColour = id => BANNER_COLOURS.find(c => c.id === id) || BANNER_COLOURS[0];
export const bannerEmblem = id => BANNER_EMBLEMS.find(e => e.id === id) || BANNER_EMBLEMS[0];

// ---------- what a gift is worth ----------

const ways = {};
const way = (id, secs, consumes = {}) => (ways[id] ||= []).push({ secs, consumes });
for (const skill of Object.values(SKILLS)) for (const n of skill.nodes || []) if (n.produces) way(n.produces, n.interval / 1000, n.consumes || {});
for (const r of SMELTING_RECIPES) way(r.produces, r.interval / 1000, r.consumes);
for (const c of CROPS) way(c.produces, c.growMs / 1000 / ((c.yield[0] + c.yield[1]) / 2) / FARMING_PLOTS.length);
const memo = {};
function made(id, depth = 0) {
    if (id in memo) return memo[id];
    if (!ways[id] || depth > 8) return 0;
    let best = Infinity;
    for (const w of ways[id]) best = Math.min(best, w.secs + Object.entries(w.consumes).reduce((t, [inId, q]) => t + made(inId, depth + 1) * q, 0));
    return (memo[id] = Number.isFinite(best) ? best : 0);
}

/** Seconds of work one of `id` counts for in the hall (0: not taken). */
export function giftWorth(id) {
    const res = RESOURCES[id];
    if (!res) return 0;
    if (id === 'essence') return 1;
    if (res.category === 'gem') return res.tier >= 7 ? 120 : 10 * res.tier;
    return Math.round(made(id) * 10) / 10;
}

/** Does `room` take `id`? (By its category; essence by its own id.) */
export const roomTakes = (room, id) => !!RESOURCES[id] && giftWorth(id) > 0 && (room.takes.includes(id) || room.takes.includes(RESOURCES[id].category));

/** The room levels a hall's rooms add up to (`rooms`: work by room id). */
export const hallLevels = rooms => HALL_ROOMS.reduce((n, r) => n + roomLevel(rooms?.[r.id]), 0);
