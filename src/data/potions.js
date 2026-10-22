// Potions (Alchemy): three kinds, each in six tiers brewed from the six herbs (the owner, October 2026:
// fewer potions, each growing stronger, simply named; tiers V and VI for the late levels, 22 October). A Combat Potion is for the fight on the stages, against
// the Titan and against the clan boss; a Dungeon Potion is for a dungeon run, stronger there, with a chance of
// a second fragment from each chest; a Skill Potion is for work at a skill, faster and with more XP. Each place
// has its own pick: the Combat and Clan tabs and the fight's dock take a combat potion, the Dungeons tab and a
// run's dock a dungeon potion (or a combat potion, which works there at half its strength: OUT_OF_PLACE), and
// a skill's tab a skill potion.
// A dose lasts POTION_MINUTES of its work, and the next is drunk at once while there are more; what it raises
// it multiplies, after every other bonus. systems/potions.js keeps them going; core/modifiers.js applies them.
// A dose was five minutes until 22 October 2026 (the owner: "a player makes 1k combat potion in 30 minutes and
// that's pretty much enough for him for the entire game": an hour of brewing lasted 135-250 hours of fighting);
// now it is one, and from tier IV a brew takes two herbs and about five seconds (data/skills.js), so an hour at
// the cauldron lasts some ten to twenty hours of use.
// The seven potions before them (accuracy, defence, evasion, health, the Fortune Draught, the Gatherer's
// Draught and the Scholar's Tonic) became these by their herb's tier (core/state.js OLD_POTIONS).

import { SKILLS } from './skills.js';

export const POTION_MINUTES = 1;
/** A dose's length in words: "a minute", "5 minutes". */
export const doseWords = (minutes = POTION_MINUTES) => (minutes === 1 ? 'a minute' : `${+minutes.toFixed(2)} minutes`);
export const TIERS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

// Supplies (the owner, October 2026: food and potions should be crucial throughout the game): the monsters grow
// tougher from stage 60 to 1.6 times by stage 150 (BALANCE.enemy.supply), and the fight potions grew with them,
// so a hero who drinks one fares as before and one who doesn't is that much weaker (they were ×1.4-2 and
// ×1.5-2.5 in a run). Sized with the simulator (tools/batch.mjs, --without=potions for a player who brews none),
// the time spent brewing counted.
export const POTION_KINDS = {
    combat:  { name: 'Combat Potion',  slot: 'combat',  power: [0.8, 1.4, 2.0, 2.6, 3.2, 3.8] },                                       // × attack, defence and health
    dungeon: { name: 'Dungeon Potion', slot: 'dungeon', power: [1.0, 1.75, 2.5, 3.5, 4.25, 5.0], fragment: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] },   // in a run: × attack, defence and health, a second fragment
    skill:   { name: 'Skill Potion',   slot: 'skill',   speed: [0.15, 0.25, 0.35, 0.5, 0.6, 0.7], xp: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] }    // × work speed and skill XP
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
