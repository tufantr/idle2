// Mastery: every repeatable action has its own level from 1 to 99, earned by doing that action.
// It is the long tail of skilling (Melvor's mastery, without the pool): early levels come in minutes,
// 99 takes about 50 hours on one action at base speed. Each level above 1 adds a little, so every
// level counts:
//   speed     +0.1%  (+9.8% at 99)   every action
//   double    +0.25% (+24.5% at 99)  actions that produce resources: gathering, cooking, alchemy,
//                                    smelting, and a log burning twice in firemaking
//   preserve  +0.2%  (+19.6% at 99)  actions with ingredients: the ingredients (and fuel) are kept
// Forging and jewellery have one mastery per metal and per gem, shared by every piece made from it.
// A metal's mastery grows with the work on its gear at the anvil too (a second of practice a bar),
// and takes bars off that work instead of saving ingredients (systems/anvil.js).
// Mastery is permanent (prestige keeps it). Tools, agility and farming have none.

import { SKILLS } from './skills.js';
import { SMELTING_RECIPES, METALS, GEM_TIERS } from './workshop.js';
import { RESOURCES } from './resources.js';

export const MASTERY_MAX_LEVEL = 99;
// Mastery XP is the action's base time in seconds; levels use the skill XP table divided by this.
export const MASTERY_XP_DIVISOR = 72;
export const MASTERY_PER_LEVEL = { speed: 0.001, double: 0.0025, preserve: 0.002 };
// Mastery levels worth a line in the log (and a toast at 99).
export const MASTERY_MILESTONES = [25, 50, 75, 99];

export const forgeKey = bar => `forge_${bar}`;
export const jewelKey = gem => `jewel_${gem}`;

/** Every action with a mastery in a skill: [{ key, name, icon, levelReq }], in unlock order. */
export function masteryActions(skillId) {
    if (skillId === 'smithing') {
        return [
            ...SMELTING_RECIPES.map(r => ({ key: r.id, name: `Smelt ${r.name}`, icon: RESOURCES[r.produces].icon, levelReq: r.levelReq })),
            ...METALS.map(m => ({ key: forgeKey(m.bar), name: m.tier === 1 ? `Forge ${m.name}` : `${m.name} at the anvil`, icon: '⚒️', levelReq: m.levelReq }))
        ];
    }
    if (skillId === 'crafting') {
        return GEM_TIERS.map(g => ({ key: jewelKey(g.gem), name: `${RESOURCES[g.gem].name} jewellery`, icon: RESOURCES[g.gem].icon, levelReq: g.levelReq }));
    }
    return (SKILLS[skillId]?.nodes || []).map(n => ({ key: n.id, name: n.name, icon: RESOURCES[n.produces || n.bonfireLog]?.icon || '•', levelReq: n.levelReq }));
}

export const MASTERY_SKILLS = Object.keys(SKILLS).filter(id => masteryActions(id).length > 0);
