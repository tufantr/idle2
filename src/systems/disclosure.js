// Progressive disclosure inside the screens. Unlocks (data/unlocks.js) open whole tabs; the rules
// here open the pieces within them: a currency in the purse, the camp, the world map, the mastery
// bars. Each piece opens the first time it means something to the player and then stays open
// (state.seen), so a new player's screen holds only what they have met so far, and nothing they have
// met ever disappears again. Pure: the UI only asks `seen(state, id)`.

import { CAMP_UPGRADES } from '../data/camp.js';
import { RESOURCES } from '../data/resources.js';
import { NON_COMBAT_SKILLS } from '../data/skills.js';
import { STAGES_PER_ZONE } from '../data/zones.js';

const CHEAPEST_CAMP = Math.min(...CAMP_UPGRADES.map(u => u.baseCost));
const JEWELLERY = new Set(['Ring', 'Neck', 'Ear']);
const owns = (state, category) => Object.keys(RESOURCES).some(id => RESOURCES[id].category === category && state.resources[id] > 0);
const gear = state => [...state.inventory, ...Object.values(state.equipped)].filter(Boolean);

// id -> when it opens. Ids are plain words (a-z, 0-9, _): they are saved.
export const DISCLOSURES = [
    // the purse: a currency shows once you hold some
    { id: 'essence',      when: s => s.resources.essence > 0 },
    { id: 'tokens',       when: s => s.prestige.tokens > 0 || s.prestige.count > 0 },
    { id: 'skill_points', when: s => s.prestige.skillPoints > 0 || s.prestige.count > 0 || Object.values(s.perks).some(level => level > 0) },
    // the combat tab
    { id: 'camp',         when: s => s.gold >= CHEAPEST_CAMP || Object.values(s.camp).some(level => level > 0) || s.prestige.count > 0 },
    { id: 'stage_nav',    when: s => s.stats.deaths > 0 || s.stats.bossEscapes > 0 || s.combat.bestStage > STAGES_PER_ZONE },  // going back means something after a setback
    { id: 'world_map',    when: s => s.combat.bestStage > STAGES_PER_ZONE },                                                     // a second zone to travel to
    { id: 'food',         when: s => !!s.unlocks.cooking || owns(s, 'food') },
    { id: 'potions',      when: s => !!s.unlocks.alchemy || owns(s, 'potion') },
    { id: 'gear',         when: s => s.stats.itemsDropped > 0 || s.stats.itemsCrafted > 0 || gear(s).length > 0 },
    // the armory
    { id: 'jewellery',    when: s => !!s.unlocks.crafting || gear(s).some(item => JEWELLERY.has(item.type)) },
    { id: 'bag_tools',    when: s => s.stats.itemsDropped + s.stats.itemsCrafted >= 5 },
    { id: 'auto_salvage', when: s => s.stats.itemsDropped >= 10 },
    // the skill tabs
    { id: 'mastery',      when: s => s.stats.masteryLevels >= 20 },
    { id: 'minigames',    when: s => s.stats.minigameWins > 0 || NON_COMBAT_SKILLS.some(id => s.minigame[id]?.opportunityUntil > 0 || !!s.minigame[id]?.challenge) }
];

/** Has this piece of the interface opened for the player? (Developer mode opens everything.) */
export function seen(state, id) {
    return !!state.seen?.[id] || !!state.settings?.devUnlockAll;
}

/** Open whatever the state has earned; returns the ids opened by this call. */
export function evaluateDisclosures(state) {
    const newly = [];
    for (const rule of DISCLOSURES) {
        if (state.seen[rule.id]) continue;
        if (rule.when(state)) {
            state.seen[rule.id] = true;
            newly.push(rule.id);
        }
    }
    return newly;
}
