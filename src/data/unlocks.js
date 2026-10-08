// Progressive disclosure. Each feature has a predicate over the state and a hint shown as the
// next goal. Nothing blocks; the player just sees more of the sidebar as they go. `task` is the
// goal in a few words (the sidebar's "next" slot) and `tab` is where the work for it happens.
// The pieces inside a screen open by the rules in systems/disclosure.js.

import { EVENT_START_DAY, EVENT_LENGTH_HOURS } from './events.js';
import { AGILITY_SLOTS } from './agility.js';

const DAY = 24 * 3600 * 1000;

/** Is a weekend festival on, or due within a day? (The rotation itself is in systems/events.js.) */
function festivalNear(now) {
    const d = new Date(now);
    const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const start = midnight - ((d.getUTCDay() - EVENT_START_DAY + 7) % 7) * DAY;
    return now < start + EVENT_LENGTH_HOURS * 3600 * 1000 || now >= start + 7 * DAY - DAY;
}

export const UNLOCKS = [
    { id: 'combat',       always: true },
    { id: 'mining',       always: true },
    { id: 'inventory',    always: true },
    // Smithing answers mining (ore that monsters drop doesn't open it for a hero who only fights);
    // a migrated prototype save, with no action stats and no kills, opens it with the ore it holds.
    { id: 'smithing',     hint: 'Mine 5 ore to unlock Smithing', task: 'Mine 5 ore', tab: 'mining', requires: s => (s.stats.actionsBySkill.mining || 0) >= 5 || (heldOre(s) >= 5 && !s.stats.kills),
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
    // Places reached by climbing (`pace`) open one at a time, a breather apart (PLACE_GAPS_MS), each when
    // it is of use (docs/research_notes/robust-and-fun/A_onboarding_pacing.md §5.4), and in this order
    // when several are waiting: the loop itself (Prestige, which a first run meets early to learn it),
    // what breaks the wall in front of the hero (Dungeons, Alchemy), the conveniences (the Shop, the
    // Hall), the social and weekly places, and the long-horizon one (Agility). The clan and the weekend
    // events come after the first prestige.
    // The first prestige teaches (the owner: a few minutes in, not fourteen): Prestige opens once the
    // stage-20 boss has fallen, and that first one needs no ten-minute run (systems/prestige.js).
    { id: 'prestige',     pace: true, hint: 'Beat the Stage 20 boss to unlock Prestige', task: 'Beat the stage 20 boss', tab: 'combat',
      requires: s => s.combat.bestStage >= 21, progress: s => s.combat.bestStage / 21 },
    { id: 'dungeons',     pace: true, hint: 'Reach Stage 20 to find the first dungeon', task: 'Reach stage 20', tab: 'combat', requires: s => s.combat.bestStage >= 20, progress: s => s.combat.bestStage / 20 },
    { id: 'alchemy',      pace: true, hint: 'Reach Stage 15 to unlock Alchemy', task: 'Reach stage 15', tab: 'combat', requires: s => s.combat.bestStage >= 15, progress: s => s.combat.bestStage / 15 },
    { id: 'shop',         pace: true, hint: 'Beat the Stage 10 boss to unlock the Shop', task: 'Beat the stage 10 boss', tab: 'combat', requires: s => s.combat.bestStage >= 11, progress: s => s.combat.bestStage / 11 },
    { id: 'achievements', pace: true, hint: 'Earn five medals to open the Hall', task: 'Earn five medals', tab: 'combat', requires: s => Object.keys(s.achievements || {}).length >= 5, progress: s => Object.keys(s.achievements || {}).length / 5 },
    { id: 'farming',      hint: 'Use Alchemy 10 times or reach Cooking 15 to unlock Farming', task: 'Brew 10 times, or Cooking 15', tab: 'alchemy', requires: s => (s.stats.actionsBySkill.alchemy || 0) >= 10 || s.skills.cooking.xp >= 2411,
      progress: s => Math.max((s.stats.actionsBySkill.alchemy || 0) / 10, s.skills.cooking.xp / 2411) },
    { id: 'clan',         pace: true, hint: 'Prestige once to join a clan', task: 'Prestige once', tab: 'combat', requires: s => s.prestige.count >= 1 && s.combat.bestStage >= 25, progress: s => Math.min(1, s.prestige.count) },
    { id: 'events',       pace: true, hint: 'After a first prestige, the weekend festival opens when one is on or near', task: 'A festival, after a prestige', tab: 'combat',
      requires: s => s.prestige.count >= 1 && s.combat.bestStage >= 18 && festivalNear(s.meta.lastActiveAt || 0), progress: s => (s.prestige.count >= 1 ? 0.5 : 0) },
    { id: 'agility',      pace: true, hint: 'Reach Stage 35 with Woodcutting and Smithing open, and half the gold for a first obstacle in hand', task: 'Stage 35 and 10,000 gold', tab: 'combat',
      requires: s => s.combat.bestStage >= 35 && !!s.unlocks.woodcutting && !!s.unlocks.smithing && s.gold >= AGILITY_SLOTS[0].costGold / 2,
      progress: s => Math.min(s.combat.bestStage / 35, s.gold / (AGILITY_SLOTS[0].costGold / 2), s.unlocks.woodcutting && s.unlocks.smithing ? 1 : 0.9) }
];

// The breather between places, in attended time (`meta.attendedMs`: the page in view, or an input in
// the last three minutes; time away and a tab left in the background do not count). The first place
// reached by climbing comes a minute and a half in, and the gaps keep growing (1.5, 3, 4, 5, 7, 10,
// 15, 20, then 30 minutes; A_onboarding_pacing.md §5.2), so a first session of 10 to 20 minutes meets
// three or four places and the rest come over the first hours. A place earned by work in a skill
// (Smithing after mining, say) answers that work within WORK_GAP_MS, never closer than that to another
// place, and starts the next breather. A place still waiting when the player leaves opens when he comes
// back (openWaitingPlace, one per return). No place opens during a boss fight.
export const PLACE_GAPS_MS = [90, 180, 240, 300, 420, 600, 900, 1200, 1800].map(s => s * 1000);
export const WORK_GAP_MS = 90 * 1000;

const opened = state => UNLOCKS.filter(u => !u.always && state.unlocks[u.id]).length;
const sinceLastPlace = state => (state.meta.attendedMs || 0) - (state.meta.lastPlaceAt || 0);

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
        state.meta.lastPlaceAt = state.meta.attendedMs || 0;
        newly.push(def.id);
    };
    if (state.combat.active && state.combat.enemy?.boss) return newly;   // the boss fight is the moment
    if (sinceLastPlace(state) < WORK_GAP_MS) return newly;
    const earned = UNLOCKS.find(def => !def.always && !def.pace && !state.unlocks[def.id] && def.requires?.(state));
    if (earned) open(earned);
    else if (placeWaitMs(state) === 0) {
        const [next] = waitingPlaces(state);
        if (next) open(next);
    }
    return newly;
}

/** A player back from time away: the first place earned and waiting opens now (one per return). Its id, or null. */
export function openWaitingPlace(state) {
    if (state.settings.devUnlockAll) return null;
    const def = UNLOCKS.find(u => !u.always && !u.pace && !state.unlocks[u.id] && u.requires?.(state)) || waitingPlaces(state)[0];
    if (!def) return null;
    state.unlocks[def.id] = true;
    state.meta.lastPlaceAt = state.meta.attendedMs || 0;
    return def.id;
}

/** The next places to open, in order, with their hints: one on its way first, then the goals to reach. */
export function nextGoals(state, limit = 2) {
    if (state.settings.devUnlockAll) return [];
    const waiting = waitingPlaces(state);
    const rest = UNLOCKS.filter(u => !u.always && !u.comingSoon && !state.unlocks[u.id] && !waiting.includes(u));
    return [...waiting, ...rest].slice(0, limit);
}
