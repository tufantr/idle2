// Progressive disclosure. Each feature has a predicate over the state and a hint shown as the
// next goal. Nothing blocks; the player just sees more of the sidebar as they go. `task` is the
// goal in a few words (the sidebar's "next" slot) and `tab` is where the work for it happens.
// The pieces inside a screen open by the rules in systems/disclosure.js.

export const UNLOCKS = [
    { id: 'combat',       always: true },
    { id: 'mining',       always: true },
    { id: 'inventory',    always: true },
    { id: 'smithing',     hint: 'Mine 5 ore to unlock Smithing', task: 'Mine 5 ore', tab: 'mining', requires: s => (s.stats.actionsBySkill.mining || 0) >= 5 || heldOre(s) >= 5,
      progress: s => Math.max((s.stats.actionsBySkill.mining || 0), heldOre(s)) / 5 },
    { id: 'woodcutting',  hint: 'Smelt your first bar to unlock Woodcutting', task: 'Smelt a bar', tab: 'smithing', requires: s => s.stats.barsSmelted >= 1, progress: s => s.stats.barsSmelted / 1 },
    { id: 'hunting',      hint: 'Reach Stage 5 to unlock Hunting', task: 'Reach stage 5', tab: 'combat', requires: s => s.combat.maxStage >= 5, progress: s => s.combat.maxStage / 5 },
    { id: 'cooking',      hint: 'Hunt your first animal to unlock Cooking', task: 'Hunt an animal', tab: 'hunting', requires: s => s.stats.actionsBySkill.hunting >= 1, progress: s => (s.stats.actionsBySkill.hunting || 0) / 1 },
    { id: 'fishing',      hint: 'Cook 5 dishes to unlock Fishing', task: 'Cook 5 dishes', tab: 'cooking', requires: s => (s.stats.actionsBySkill.cooking || 0) >= 5, progress: s => (s.stats.actionsBySkill.cooking || 0) / 5 },
    { id: 'firemaking',   hint: 'Cut 20 logs to unlock Firemaking', task: 'Cut 20 logs', tab: 'woodcutting', requires: s => (s.stats.actionsBySkill.woodcutting || 0) >= 20, progress: s => (s.stats.actionsBySkill.woodcutting || 0) / 20 },
    { id: 'alchemy',      hint: 'Reach Stage 15 to unlock Alchemy', task: 'Reach stage 15', tab: 'combat', requires: s => s.combat.bestStage >= 15, progress: s => s.combat.bestStage / 15 },
    // Jewellery is a silver (or gold) bar and a gem, and nothing else in Crafting can be made before the
    // first piece (its bows and rods want Crafting 5): it opens once both are in hand, not hours before.
    { id: 'crafting',     hint: 'Smelt a silver bar, with a gem found, to unlock Crafting', task: 'Smelt a silver bar', tab: 'smithing',
      requires: s => heldPreciousBars(s) >= 1 && ((s.stats.gemsFound || 0) >= 1 || heldGems(s) >= 1),
      progress: s => (heldPreciousBars(s) >= 1 ? 0.95 : Math.min(0.9, s.skills.smithing.xp / 4470)) },   // Smithing 20 smelts silver
    // Places open one beat at a time through the first minutes (docs/research_notes/first-session.md):
    // none as the first boss appears (its fight is the moment), two when it falls, then one every few
    // stages, the clan on its own, prestige when the climb first gets hard.
    { id: 'shop',         hint: 'Beat the Stage 10 boss to unlock the Shop', task: 'Beat the stage 10 boss', tab: 'combat', requires: s => s.combat.bestStage >= 11, progress: s => s.combat.bestStage / 11 },
    { id: 'prestige',     hint: 'Reach Stage 30 to unlock Prestige', task: 'Reach stage 30', tab: 'combat', requires: s => s.combat.bestStage >= 30, progress: s => s.combat.bestStage / 30 },
    { id: 'achievements', hint: 'Beat the Stage 10 boss to unlock Achievements', task: 'Beat the stage 10 boss', tab: 'combat', requires: s => s.combat.bestStage >= 11, progress: s => s.combat.bestStage / 11 },
    { id: 'dungeons',     hint: 'Reach Stage 20 to find the first dungeon', task: 'Reach stage 20', tab: 'combat', requires: s => s.combat.bestStage >= 20, progress: s => s.combat.bestStage / 20 },
    { id: 'events',       hint: 'Reach Stage 18 to join weekend events', task: 'Reach stage 18', tab: 'combat', requires: s => s.combat.bestStage >= 18, progress: s => s.combat.bestStage / 18 },
    { id: 'farming',      hint: 'Use Alchemy 10 times or reach Cooking 15 to unlock Farming', task: 'Brew 10 times, or Cooking 15', tab: 'alchemy', requires: s => (s.stats.actionsBySkill.alchemy || 0) >= 10 || s.skills.cooking.xp >= 2411,
      progress: s => Math.max((s.stats.actionsBySkill.alchemy || 0) / 10, s.skills.cooking.xp / 2411) },
    { id: 'agility',      hint: 'Reach Stage 35 to unlock Agility', task: 'Reach stage 35', tab: 'combat', requires: s => s.combat.bestStage >= 35, progress: s => s.combat.bestStage / 35 },
    { id: 'clan',         hint: 'Reach Stage 25 to join a clan', task: 'Reach stage 25', tab: 'combat', requires: s => s.combat.bestStage >= 25, progress: s => s.combat.bestStage / 25 }
];

/** How far along a goal is, 0..1 (goals without a measure read as 0). */
export function goalProgress(state, unlock) {
    if (!unlock?.progress) return 0;
    const p = Number(unlock.progress(state));
    return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
}

// Held counts let migrated prototype saves (which have no action stats) unlock straight away.
function heldOre(state) {
    return ['copper_ore', 'iron_ore', 'coal'].reduce((sum, id) => sum + (state.resources[id] || 0), 0);
}
function heldGems(state) {
    return ['amethyst', 'topaz', 'sapphire', 'emerald', 'ruby', 'diamond'].reduce((sum, id) => sum + (state.resources[id] || 0), 0);
}
function heldPreciousBars(state) {
    return (state.resources.silver_bar || 0) + (state.resources.gold_bar || 0);
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
