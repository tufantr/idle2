// Progressive disclosure. Each feature has a predicate over the state and a hint shown as the
// next goal. Nothing blocks; the player just sees more of the sidebar as they go.

export const UNLOCKS = [
    { id: 'combat',       always: true },
    { id: 'mining',       always: true },
    { id: 'inventory',    always: true },
    { id: 'smithing',     hint: 'Mine 5 ore to unlock Smithing',                    requires: s => (s.stats.actionsBySkill.mining || 0) >= 5 || heldOre(s) >= 5 },
    { id: 'woodcutting',  hint: 'Smelt your first bar to unlock Woodcutting',       requires: s => s.stats.barsSmelted >= 1 },
    { id: 'hunting',      hint: 'Reach Stage 5 to unlock Hunting',                  requires: s => s.combat.maxStage >= 5 },
    { id: 'cooking',      hint: 'Hunt your first animal to unlock Cooking',         requires: s => s.stats.actionsBySkill.hunting >= 1 },
    { id: 'alchemy',      hint: 'Defeat the Stage 10 boss to unlock Alchemy',       requires: s => s.combat.maxStage >= 10 },
    { id: 'crafting',     hint: 'Reach Mining 20 or find a gem to unlock Crafting', requires: s => s.skills.mining.xp >= 4470 || (s.stats.gemsFound || 0) >= 1 || heldGems(s) >= 1 },
    { id: 'shop',         hint: 'Defeat the Stage 10 boss to unlock the Shop',      requires: s => s.combat.maxStage >= 10 },
    { id: 'prestige',     hint: 'Reach Stage 10 to unlock Prestige',                requires: s => s.combat.maxStage >= 10 },
    { id: 'achievements', hint: 'Reach Stage 10 to unlock Achievements',            requires: s => s.combat.maxStage >= 10 },
    { id: 'clan',         hint: 'Clans are planned — see the roadmap',              requires: () => false, comingSoon: true }
];

// Held counts let migrated prototype saves (which have no action stats) unlock straight away.
function heldOre(state) {
    return ['copper_ore', 'iron_ore', 'coal'].reduce((sum, id) => sum + (state.resources[id] || 0), 0);
}
function heldGems(state) {
    return ['amethyst', 'topaz', 'sapphire', 'emerald', 'ruby', 'diamond'].reduce((sum, id) => sum + (state.resources[id] || 0), 0);
}

export function isUnlocked(state, id) {
    if (state.settings.devUnlockAll) return true;
    if (state.unlocks[id]) return true;
    const def = UNLOCKS.find(u => u.id === id);
    if (!def) return false;
    if (def.always) return true;
    return false;
}

/** Evaluate predicates; returns ids newly unlocked this call. */
export function evaluateUnlocks(state) {
    const newly = [];
    for (const def of UNLOCKS) {
        if (def.always || state.unlocks[def.id]) continue;
        if (def.requires && def.requires(state)) {
            state.unlocks[def.id] = true;
            newly.push(def.id);
        }
    }
    return newly;
}

/** The next locked features, in order, with their hints. */
export function nextGoals(state, limit = 2) {
    return UNLOCKS.filter(u => !u.always && !u.comingSoon && !state.unlocks[u.id] && !state.settings.devUnlockAll).slice(0, limit);
}
