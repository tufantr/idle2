// Pets: rare finds while training, kept forever (through prestige). Melvor's formula: the chance per
// action is (action seconds x skill level) / 25,000,000, so the expected wait is 25,000,000 / level
// seconds of training — about 70 hours at level 99 — whatever the action's speed.

export const PET_BASE = 25_000_000;
export const COMBAT_PET_SECONDS = 4; // combat rolls once per kill, as if each kill took 4 s
// Farming rolls once per harvest, as if the plot's growing time were the action.

export const PETS = [
    { id: 'pebble',  skill: 'mining',      name: 'Pebble',  icon: '🪨', desc: '+3% Mining speed',      mods: { skillSpeed: { mining: 0.03 } } },
    { id: 'twig',    skill: 'woodcutting', name: 'Twig',    icon: '🌱', desc: '+3% Woodcutting speed', mods: { skillSpeed: { woodcutting: 0.03 } } },
    { id: 'scout',   skill: 'hunting',     name: 'Scout',   icon: '🦊', desc: '+3% Hunting speed',     mods: { skillSpeed: { hunting: 0.03 } } },
    { id: 'crumb',   skill: 'cooking',     name: 'Crumb',   icon: '🐭', desc: '+3% Cooking speed',     mods: { skillSpeed: { cooking: 0.03 } } },
    { id: 'bubbles', skill: 'alchemy',     name: 'Bubbles', icon: '🐸', desc: '+3% Alchemy speed',     mods: { skillSpeed: { alchemy: 0.03 } } },
    { id: 'ember',   skill: 'smithing',    name: 'Ember',   icon: '🦎', desc: '+3% Smithing speed',    mods: { skillSpeed: { smithing: 0.03 } } },
    { id: 'glimmer', skill: 'crafting',    name: 'Glimmer', icon: '🦋', desc: '+3% Crafting speed',    mods: { skillSpeed: { crafting: 0.03 } } },
    { id: 'fang',    skill: 'combat',      name: 'Fang',    icon: '🐺', desc: '+3% ATK and DEF',       mods: { atkMult: 0.03, defMult: 0.03 } },
    { id: 'finn',    skill: 'fishing',     name: 'Finn',    icon: '🐟', desc: '+3% Fishing speed',     mods: { skillSpeed: { fishing: 0.03 } } },
    { id: 'cinder',  skill: 'firemaking',  name: 'Cinder',  icon: '🦔', desc: '+3% Firemaking speed',  mods: { skillSpeed: { firemaking: 0.03 } } },
    { id: 'sprout',  skill: 'farming',     name: 'Sprout',  icon: '🐛', desc: '+3% crop growth speed', mods: { skillSpeed: { farming: 0.03 } } },
    { id: 'hopper',  skill: 'agility',     name: 'Hopper',  icon: '🐇', desc: '+3% Agility speed',     mods: { skillSpeed: { agility: 0.03 } } }
];

/** The pet at the hero's side in the fight: the one picked in the Collection, else Fang, else the first found. */
export function companionPet(state) {
    const picked = state.hero?.pet;
    if (picked && state.pets?.[picked]) return picked;
    return state.pets?.fang ? 'fang' : PETS.find(p => state.pets?.[p.id])?.id || '';
}

export function petForSkill(skill) {
    return PETS.find(p => p.skill === skill) || null;
}

export function petChance(actionMs, level) {
    return (actionMs / 1000) * level / PET_BASE;
}
