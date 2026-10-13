// Potions (Alchemy): three kinds, each in four tiers brewed from the four herbs (the owner, October 2026:
// fewer potions, each growing stronger, simply named). A Combat Potion is for the fight on the stages, against
// the Titan and against the clan boss; a Dungeon Potion is for a dungeon run, stronger there, with a chance of
// a second fragment from each chest; a Skill Potion is for work at a skill, faster and with more XP. Each place
// has its own pick: the Combat and Clan tabs and the fight's dock take a combat potion, the Dungeons tab and a
// run's dock a dungeon potion (or a combat potion, which works there at half its strength: OUT_OF_PLACE), and
// a skill's tab a skill potion.
// A dose lasts POTION_MINUTES of its work, and the next is drunk at once while there are more; what it raises
// it multiplies, after every other bonus. systems/potions.js keeps them going; core/modifiers.js applies them.
// The seven potions before them (accuracy, defence, evasion, health, the Fortune Draught, the Gatherer's
// Draught and the Scholar's Tonic) became these by their herb's tier (core/state.js OLD_POTIONS).

import { SKILLS } from './skills.js';

export const POTION_MINUTES = 5;
export const TIERS = ['I', 'II', 'III', 'IV'];

export const POTION_KINDS = {
    combat:  { name: 'Combat Potion',  slot: 'combat',  power: [0.15, 0.3, 0.5, 0.75] },                             // × attack, defence and health
    dungeon: { name: 'Dungeon Potion', slot: 'dungeon', power: [0.25, 0.5, 0.8, 1.2], fragment: [0.1, 0.2, 0.3, 0.4] },   // in a run: × attack, defence and health, a second fragment
    skill:   { name: 'Skill Potion',   slot: 'skill',   speed: [0.1, 0.2, 0.35, 0.5], xp: [0.1, 0.2, 0.3, 0.4] }      // × work speed and skill XP
};

/** A combat potion picked for a dungeon run works there at this share of its strength (the owner: "it should, just worse"). */
export const OUT_OF_PLACE = 0.5;

export const POTIONS = Object.fromEntries(Object.keys(POTION_KINDS).flatMap(kind => TIERS.map((_, i) => [`${kind}_potion_${i + 1}`, { kind, tier: i + 1 }])));

/** A potion's name, "Combat Potion II". */
export const potionName = id => (POTIONS[id] ? `${POTION_KINDS[POTIONS[id].kind].name} ${TIERS[POTIONS[id].tier - 1]}` : '');

/** The potions of a kind ('combat', 'dungeon', 'skill'), weakest first. */
export function potionsFor(kind) {
    return Object.keys(POTIONS).filter(id => POTIONS[id].kind === kind);
}

/** What a slot can hold: the dungeon slot takes a combat potion too (at half its strength), the others their own kind. */
export function potionsForSlot(slot) {
    return slot === 'dungeon' ? [...potionsFor('dungeon'), ...potionsFor('combat')] : potionsFor(slot);
}

/** The Alchemy level a potion is brewed from. */
export function potionLevel(id) {
    return SKILLS.alchemy.nodes.find(n => n.produces === id)?.levelReq || 1;
}

/**
 * How much a fight potion raises attack, defence and health where it is drunk ('combat' for the stages, the
 * Titan and the clan boss; 'dungeon' for a run): its tier's power, or OUT_OF_PLACE of it away from its place,
 * and nothing where it does not work (a dungeon potion outside a run).
 */
export function potionPower(id, place) {
    const p = POTIONS[id];
    if (!p || p.kind === 'skill') return 0;
    const power = POTION_KINDS[p.kind].power[p.tier - 1];
    if (p.kind === place) return power;
    return p.kind === 'combat' && place === 'dungeon' ? power * OUT_OF_PLACE : 0;
}

/** A dungeon potion's chance of a second fragment from a cleared run's chest. */
export const potionFragmentChance = id => (POTIONS[id]?.kind === 'dungeon' ? POTION_KINDS.dungeon.fragment[POTIONS[id].tier - 1] : 0);

const times = s => `×${(1 + s).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}`;
/** What a potion does in a few words, where it is drunk: "×1.3 attack, defence and health". */
export function potionEffectText(id, place = POTIONS[id]?.kind) {
    const p = POTIONS[id];
    if (!p) return '';
    if (p.kind === 'skill') return `${times(POTION_KINDS.skill.speed[p.tier - 1])} work speed, +${Math.round(POTION_KINDS.skill.xp[p.tier - 1] * 100)}% skill XP`;
    const power = potionPower(id, place);
    if (!power) return 'only in dungeon runs';
    const stats = `${times(power)} attack, defence and health`;
    if (p.kind === 'dungeon') return `${stats}, ${Math.round(potionFragmentChance(id) * 100)}% second fragment`;
    return place === 'dungeon' ? `${stats} (half, in a run)` : stats;
}
