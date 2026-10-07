// Skill capes (Melvor's skillcapes): level 99 in a skill earns its cape, for good. Each brings a small
// bonus to its own skill, kept whichever cape is worn, and the hero puts the new one on as it is earned
// (a cloak in its own cloth with a gold hem: hero/capes/<skill>, tools/resource_art.py). In Settings any
// earned cape, or the rank's cloak (data/ranks.js), can be worn instead: what is worn is only a look.
// Capes are worked out from the levels, so nothing about them is saved but the one worn (hero.cape).

import { levelForXp, MAX_LEVEL } from '../core/xp.js';
import { SPEED_SKILLS } from './skills.js';
import { EVENTS } from './events.js';

const everySkill = value => Object.fromEntries(SPEED_SKILLS.map(id => [id, value]));

export const CAPES = [
    { skill: 'combat',      perk: '+5% attack and defence',            mods: { atkMult: 0.05, defMult: 0.05 } },
    { skill: 'mining',      perk: 'A second ore 10% more often',       mods: { doubleChance: { mining: 0.10 } } },
    { skill: 'woodcutting', perk: 'A second log 10% more often',       mods: { doubleChance: { woodcutting: 0.10 } } },
    { skill: 'fishing',     perk: 'A second fish 10% more often',      mods: { doubleChance: { fishing: 0.10 } } },
    { skill: 'hunting',     perk: 'A second catch 10% more often',     mods: { doubleChance: { hunting: 0.10 } } },
    { skill: 'cooking',     perk: 'A second dish 10% more often',      mods: { doubleChance: { cooking: 0.10 } } },
    { skill: 'firemaking',  perk: 'A log burns twice 10% more often',  mods: { doubleChance: { firemaking: 0.10 } } },
    { skill: 'alchemy',     perk: 'A second herb or potion 10% more often', mods: { doubleChance: { alchemy: 0.10 } } },
    { skill: 'farming',     perk: '+10% crops at each harvest',        mods: { farmYield: 0.10 } },
    { skill: 'agility',     perk: '+3% speed in every skill',          mods: { skillSpeed: everySkill(0.03) } },
    { skill: 'smithing',    perk: 'A second bar 10% more often',       mods: { doubleChance: { smithing: 0.10 } } },
    { skill: 'crafting',    perk: 'Better rolls on everything made (+10% quality)', mods: { craftQuality: 0.10 } }
];

// Festival cloaks: one for each weekend event (data/events.js `cloak`), bought in its shop while it runs,
// owned for good (state.events.cloaks). A look only, worn like a cape: its key is `fest_<event id>` (the
// sprite hero/capes/fest_<event id>, a silver hem where a skill cape's is gold).
export const FESTIVAL_CLOAKS = EVENTS.filter(e => e.cloak).map(e => ({ skill: `fest_${e.id}`, event: e.id, name: `${e.name} cloak`, perk: '' }));
export const festivalCloak = key => FESTIVAL_CLOAKS.find(c => c.skill === key) || null;
/** Festival cloaks this hero owns. */
export const festivalCloaksOwned = state => FESTIVAL_CLOAKS.filter(c => !!state?.events?.cloaks?.[c.event]);

export const capeFor = skill => CAPES.find(c => c.skill === skill) || festivalCloak(skill);

/** Has this hero earned the cape of `skill` (level 99 in it), or bought the festival cloak `skill`? */
export const capeEarned = (state, skill) => {
    const fest = festivalCloak(skill);
    if (fest) return !!state?.events?.cloaks?.[fest.event];
    return !!CAPES.find(c => c.skill === skill) && levelForXp(state?.skills?.[skill]?.xp || 0) >= MAX_LEVEL;
};

/** Every cape this hero has earned. */
export const capesEarned = state => CAPES.filter(c => capeEarned(state, c.skill));

/** The cape the hero wears, or null for the rank's cloak (one not earned, as in an edited save, is not worn). */
export const capeWorn = state => (capeEarned(state, state?.hero?.cape) ? capeFor(state.hero.cape) : null);
