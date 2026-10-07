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
    { id: 'hunting',      pace: true, hint: 'Reach Stage 5 to unlock Hunting', task: 'Reach stage 5', tab: 'combat', requires: s => s.combat.maxStage >= 5, progress: s => s.combat.maxStage / 5 },
    { id: 'cooking',      hint: 'Hunt your first animal to unlock Cooking', task: 'Hunt an animal', tab: 'hunting', requires: s => s.stats.actionsBySkill.hunting >= 1, progress: s => (s.stats.actionsBySkill.hunting || 0) / 1 },
    { id: 'fishing',      hint: 'Cook 5 dishes to unlock Fishing', task: 'Cook 5 dishes', tab: 'cooking', requires: s => (s.stats.actionsBySkill.cooking || 0) >= 5, progress: s => (s.stats.actionsBySkill.cooking || 0) / 5 },
    { id: 'firemaking',   hint: 'Cut 20 logs to unlock Firemaking', task: 'Cut 20 logs', tab: 'woodcutting', requires: s => (s.stats.actionsBySkill.woodcutting || 0) >= 20, progress: s => (s.stats.actionsBySkill.woodcutting || 0) / 20 },
    // Jewellery is a silver (or gold) bar and a gem, and nothing else in Crafting can be made before the
    // first piece (its bows and rods want Crafting 5): it opens once both are in hand, not hours before.
    { id: 'crafting',     hint: 'Smelt a silver bar, with a gem found, to unlock Crafting', task: 'Smelt a silver bar', tab: 'smithing',
      requires: s => heldPreciousBars(s) >= 1 && ((s.stats.gemsFound || 0) >= 1 || heldGems(s) >= 1),
      progress: s => (heldPreciousBars(s) >= 1 ? 0.95 : Math.min(0.9, s.skills.smithing.xp / 4470)) },   // Smithing 20 smelts silver
    // Places reached by climbing (`pace`) open one at a time, a breather apart (PLACE_GAPS_MS): a player
    // who taps to stage 30 in half a minute no longer opens eight places at once. Listed in the order
    // they come when several are waiting: the fight's own places first, the clan and the weekend events
    // only after the first prestige, once the loop is learned (docs/research_notes/first-session.md,
    // patterns 11 and 21).
    { id: 'shop',         pace: true, hint: 'Beat the Stage 10 boss to unlock the Shop', task: 'Beat the stage 10 boss', tab: 'combat', requires: s => s.combat.bestStage >= 11, progress: s => s.combat.bestStage / 11 },
    { id: 'achievements', pace: true, hint: 'Beat the Stage 10 boss to unlock Achievements', task: 'Beat the stage 10 boss', tab: 'combat', requires: s => s.combat.bestStage >= 11, progress: s => s.combat.bestStage / 11 },
    { id: 'dungeons',     pace: true, hint: 'Reach Stage 20 to find the first dungeon', task: 'Reach stage 20', tab: 'combat', requires: s => s.combat.bestStage >= 20, progress: s => s.combat.bestStage / 20 },
    { id: 'alchemy',      pace: true, hint: 'Reach Stage 15 to unlock Alchemy', task: 'Reach stage 15', tab: 'combat', requires: s => s.combat.bestStage >= 15, progress: s => s.combat.bestStage / 15 },
    { id: 'prestige',     pace: true, hint: 'Reach Stage 30 to unlock Prestige', task: 'Reach stage 30', tab: 'combat', requires: s => s.combat.bestStage >= 30, progress: s => s.combat.bestStage / 30 },
    { id: 'farming',      hint: 'Use Alchemy 10 times or reach Cooking 15 to unlock Farming', task: 'Brew 10 times, or Cooking 15', tab: 'alchemy', requires: s => (s.stats.actionsBySkill.alchemy || 0) >= 10 || s.skills.cooking.xp >= 2411,
      progress: s => Math.max((s.stats.actionsBySkill.alchemy || 0) / 10, s.skills.cooking.xp / 2411) },
    { id: 'agility',      pace: true, hint: 'Reach Stage 35 to unlock Agility', task: 'Reach stage 35', tab: 'combat', requires: s => s.combat.bestStage >= 35, progress: s => s.combat.bestStage / 35 },
    { id: 'events',       pace: true, hint: 'Prestige once to join the weekend events', task: 'Prestige once', tab: 'combat', requires: s => s.prestige.count >= 1 && s.combat.bestStage >= 18, progress: s => Math.min(1, s.prestige.count) },
    { id: 'clan',         pace: true, hint: 'Prestige once to join a clan', task: 'Prestige once', tab: 'combat', requires: s => s.prestige.count >= 1 && s.combat.bestStage >= 25, progress: s => Math.min(1, s.prestige.count) }
];

// The breather between places, in time played (the game open, offline time not counted): the first
// place reached by climbing a minute and a half in, then 2.5, 3.5, 4.5 and from then on 5 minutes
// apart, so a first session of 10 to 20 minutes meets three to five of them. A place earned by work
// in a skill (Smithing after mining, say) answers that work within WORK_GAP_MS, never closer than that
// to another place, and starts the next breather.
export const PLACE_GAPS_MS = [90, 150, 210, 270, 300].map(s => s * 1000);
export const WORK_GAP_MS = 30 * 1000;

const opened = state => UNLOCKS.filter(u => !u.always && state.unlocks[u.id]).length;
const sinceLastPlace = state => (state.meta.playtimeMs || 0) - (state.meta.lastPlaceAt || 0);

/** Milliseconds of play before the next place reached by climbing may open (0: now). */
export function placeWaitMs(state) {
    const gap = PLACE_GAPS_MS[Math.min(opened(state), PLACE_GAPS_MS.length - 1)];
    return Math.max(0, gap - sinceLastPlace(state));
}

/** The places whose goal is met but which wait for their turn, in the order they will come. */
export function waitingPlaces(state) {
    if (state.settings.devUnlockAll) return [];
    return UNLOCKS.filter(u => u.pace && !state.unlocks[u.id] && u.requires(state));
}

/** How far along a goal is, 0..1 (goals without a measure read as 0); a place on its way fills with the breather. */
export function goalProgress(state, unlock) {
    if (!unlock?.progress) return 0;
    if (unlock.pace && !state.unlocks[unlock.id] && unlock.requires(state)) {
        const gap = PLACE_GAPS_MS[Math.min(opened(state), PLACE_GAPS_MS.length - 1)];
        return 1 - placeWaitMs(state) / gap;
    }
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

/**
 * Evaluate predicates; returns the id newly unlocked this call (one at most). A place earned by work
 * opens once WORK_GAP_MS has passed since the last place; one reached by climbing when its breather
 * (PLACE_GAPS_MS) is over.
 */
export function evaluateUnlocks(state) {
    const newly = [];
    const open = def => {
        state.unlocks[def.id] = true;
        state.meta.lastPlaceAt = state.meta.playtimeMs || 0;
        newly.push(def.id);
    };
    if (sinceLastPlace(state) < WORK_GAP_MS) return newly;
    const earned = UNLOCKS.find(def => !def.always && !def.pace && !state.unlocks[def.id] && def.requires?.(state));
    if (earned) open(earned);
    else if (placeWaitMs(state) === 0) {
        const [next] = waitingPlaces(state);
        if (next) open(next);
    }
    return newly;
}

/** The next places to open, in order, with their hints: one on its way first, then the goals to reach. */
export function nextGoals(state, limit = 2) {
    if (state.settings.devUnlockAll) return [];
    const waiting = waitingPlaces(state);
    const rest = UNLOCKS.filter(u => !u.always && !u.comingSoon && !state.unlocks[u.id] && !waiting.includes(u));
    return [...waiting, ...rest].slice(0, limit);
}
