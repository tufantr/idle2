// Potions (Alchemy): what each does, and for how long. A dose lasts POTION_MINUTES of the work it is for,
// a fight potion while the hero fights and a work potion while he works at a skill, and the next is drunk
// at once while there are more. Its strength grows with Alchemy: `base` at the level it is brewed from,
// `top` at 99. A fight potion multiplies what it raises, after every other bonus (the owner's ask, October
// 2026: +20% added to the other bonuses for 15 attacks, about 17 seconds, did nothing anyone could see).
// Sized with the simulator over 30 seeds (tools/batch.mjs, and --without=consumables for a player who makes
// neither): with an attack potion drunk and food eaten, a player reaches stage 100 about 30% sooner than one
// who makes and uses none, stage 120 about 20% and stage 150 about 12%, the time spent brewing and cooking
// counted; without them the game is about where it was before.
// systems/potions.js keeps them going; core/modifiers.js applies them.

import { SKILLS } from './skills.js';

export const POTION_MINUTES = 5;

export const POTIONS = {
    accuracy_potion:   { use: 'fight', effect: 'atk',     base: 0.25, top: 1.5 },
    defense_potion:    { use: 'fight', effect: 'def',     base: 0.25, top: 1.5 },
    evasion_potion:    { use: 'fight', effect: 'dodge',   base: 0.15, top: 0.3 },
    health_potion:     { use: 'fight', effect: 'hp',      base: 0.25, top: 1.5 },
    fortune_draught:   { use: 'fight', effect: 'fortune', base: 0.25, top: 0.5 },
    gatherers_draught: { use: 'work',  effect: 'speed',   base: 0.25, top: 0.5 },
    scholars_tonic:    { use: 'work',  effect: 'xp',      base: 0.25, top: 0.5 }
};

/** The fight's potions or the work potions, in the order Alchemy brews them. */
export function potionsFor(use) {
    return SKILLS.alchemy.nodes.filter(n => POTIONS[n.produces]?.use === use).map(n => n.produces);
}

/** The Alchemy level a potion is brewed from. */
export function potionLevel(id) {
    return SKILLS.alchemy.nodes.find(n => n.produces === id)?.levelReq || 1;
}

/** How strong a potion is for a hero with this Alchemy level: base at its brewing level, top at 99. */
export function potionStrength(id, alchemyLevel) {
    const p = POTIONS[id];
    if (!p) return 0;
    const from = potionLevel(id);
    const share = Math.max(0, Math.min(1, (alchemyLevel - from) / Math.max(1, 99 - from)));
    return p.base + (p.top - p.base) * share;
}

const times = s => `×${(1 + s).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}`;
/** What a potion does at this strength, in a few words: "×1.32 attack". */
export function potionEffectText(id, strength) {
    const p = POTIONS[id];
    if (!p) return '';
    switch (p.effect) {
        case 'atk': return `${times(strength)} attack`;
        case 'def': return `${times(strength)} defence`;
        case 'hp': return `${times(strength)} max health`;
        case 'dodge': return `+${Math.round(strength * 100)}% dodge`;
        case 'fortune': return `${times(strength)} gold and drops`;
        case 'speed': return `${times(strength)} work speed`;
        case 'xp': return `${times(strength)} skill XP`;
        default: return '';
    }
}
