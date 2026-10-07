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
//
// Checkpoints (Melvor's mastery-pool checkpoints, without the pool; docs/research_notes/robust-and-fun/
// B_longterm_motivation.md §8.2): at 10, 25, 50 and 95% of a skill's whole mastery (the levels gained
// over all its actions, out of their most), every action of that skill is faster for good. Spread over
// its actions, a skill's first checkpoint comes in an hour or two, the second in a working day, the
// third in a few days and the last after hundreds of hours: the long tail as an event now and then.

import { SKILLS } from './skills.js';
import { levelForXp } from '../core/xp.js';
import { SMELTING_RECIPES, METALS, GEM_TIERS } from './workshop.js';
import { RESOURCES } from './resources.js';

export const MASTERY_MAX_LEVEL = 99;
// Mastery XP is the action's base time in seconds; levels use the skill XP table divided by this.
export const MASTERY_XP_DIVISOR = 72;
export const MASTERY_PER_LEVEL = { speed: 0.001, double: 0.0025, preserve: 0.002 };
// Mastery levels worth a line in the log (and a toast at 99).
export const MASTERY_MILESTONES = [25, 50, 75, 99];
// A skill's checkpoints: the share of its whole mastery, and the speed every action of it gains.
export const MASTERY_CHECKPOINTS = [{ at: 0.10, speed: 0.02 }, { at: 0.25, speed: 0.03 }, { at: 0.50, speed: 0.05 }, { at: 0.95, speed: 0.10 }];

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

/** The share (0 to 1) of a skill's whole mastery gained: levels above 1 over all its actions, out of their most. */
export function masteryShare(state, skillId) {
    const actions = masteryActions(skillId);
    if (!actions.length) return 0;
    let levels = 0;
    for (const a of actions) levels += Math.min(MASTERY_MAX_LEVEL, levelForXp((state.mastery?.[skillId]?.[a.key] || 0) * MASTERY_XP_DIVISOR)) - 1;
    return levels / (actions.length * (MASTERY_MAX_LEVEL - 1));
}

/** The skill's checkpoints reached, from its share of mastery. */
export const checkpointsAt = share => MASTERY_CHECKPOINTS.filter(c => share >= c.at);
