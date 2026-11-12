// Completion: how much of the game the hero has done, as one percentage in the Hall
// (docs/research_notes/robust-and-fun/B_longterm_motivation.md §8.2 item 8: Melvor's completion, built
// from what exists, so a late session always shows movement). Eleven parts of equal weight, each its
// share done: skill levels to 99, mastery to 99 on every action, the bestiary's stars, the codex, the
// medals, the pets, the dungeons' uniques, the first TITAN_LATE_FROM Titans, the Trials' tiers, the agility
// course's slots and the weekend events' festival cloaks. The whole counts every part from the start (so
// it only ever rises); the Hall lists the parts the player has met. Pure: the UI only reads it.

import { SKILL_IDS } from '../data/skills.js';
import { levelForXp, MAX_LEVEL } from '../core/xp.js';
import { MASTERY_SKILLS, MASTERY_MAX_LEVEL, masteryActions, masteryShare } from '../data/mastery.js';
import { bestiaryStars } from '../data/bestiary.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PETS } from '../data/pets.js';
import { UNIQUES, TITAN_LATE_FROM } from '../data/dungeons.js';
import { TRIALS, TRIAL_TIERS, trialTier } from '../data/trials.js';
import { FESTIVAL_CLOAKS, festivalCloaksOwned } from '../data/capes.js';

/**
 * Each part's whole, fixed at what the game held on 12 November 2026 (the owner: 100% means everything in the game today,
 * and new content never lowers it). While each part divided by its own content, a seventh festival took about 1.3 points
 * from a hero who had everything, and a new medal, pet or unique did the same. Now new things fill a part, the count
 * capped at its whole, without raising it. Each part's content must stay at least its whole, so 100% stays within reach
 * (test/completion.test.mjs).
 */
export const COMPLETION_WHOLE = Object.freeze({
    skills: 11 * 99,       // the eleven skills, each to level 99
    mastery: 96 * 98,      // the 96 actions with mastery, each from level 1 to 99
    bestiary: 183 * 3,     // the 183 kinds of monster, three stars each
    codex: 10 * 7,         // the gear codex: ten kinds of gear in seven tiers
    medals: 51,            // every medal but the three secret ones: never needed, though one held counts (capped)
    pets: 12,
    uniques: 8,            // the eight dungeons' uniques of the first tier
    titans: 20,            // the first TITAN_LATE_FROM Titans
    trials: 8 * 5,         // the eight Trials' five tiers each: the rungs past them are records, not more to complete
    course: 6,             // the agility course's six slots
    cloaks: 6              // the six weekend festivals' cloaks
});

// the eight uniques of the dungeons' first tier, each once found (kept or not: state.uniques; a deeper tier's are records too, not more to collect)
const held = state => new Set([...Object.keys(state.uniques || {}), ...[...(state.inventory || []), ...Object.values(state.equipped || {})].filter(i => i?.uniqueId && !(i.uniqueTier > 1)).map(i => i.uniqueId)]);

/** The Trials' tiers cleared, each Trial's five at most (its ladder's rungs past them don't fill a part). */
const trialTiersDone = state => TRIALS.reduce((n, t) => n + Math.min(TRIAL_TIERS, Math.max(0, Math.floor(trialTier(state, t.id)) || 0)), 0);

/** Every part: { id, name, art, have, of, share }, and the whole as a share (0 to 1). */
export function completion(state) {
    const W = COMPLETION_WHOLE;
    const masteryHave = MASTERY_SKILLS.reduce((n, id) => n + Math.round(masteryShare(state, id) * masteryActions(id).length * (MASTERY_MAX_LEVEL - 1)), 0);
    const parts = [
        { id: 'skills', name: 'Skill levels', art: 'perk/scholar', have: SKILL_IDS.reduce((n, id) => n + Math.min(MAX_LEVEL, levelForXp(state.skills[id]?.xp || 0)), 0), of: W.skills },
        { id: 'mastery', name: 'Mastery', art: 'res/diamond', have: masteryHave, of: W.mastery },
        { id: 'bestiary', name: 'Bestiary stars', art: 'mon/Griffin', have: bestiaryStars(state.stats?.killsByMonster || {}), of: W.bestiary },
        { id: 'codex', name: 'Codex', art: 'item/Head/5', have: Object.keys(state.codex || {}).length, of: W.codex },
        { id: 'medals', name: 'Medals', art: 'crown', have: ACHIEVEMENTS.filter(a => state.achievements?.[a.id]).length, of: W.medals },
        { id: 'pets', name: 'Pets', art: 'pet/scout', have: PETS.filter(p => state.pets?.[p.id]).length, of: W.pets },
        { id: 'uniques', name: 'Uniques', art: 'uniq/goblin_crown', have: [...held(state)].filter(id => UNIQUES[id]).length, of: W.uniques },
        { id: 'titans', name: 'Titans', art: 'titan/0', have: Math.min(TITAN_LATE_FROM, state.titan?.kills || 0), of: W.titans },
        { id: 'trials', name: 'Trials', art: 'mon/Mountain Troll', have: trialTiersDone(state), of: W.trials },
        { id: 'course', name: 'The course', art: 'obstacle/rope_swing', have: (state.agility?.built || []).filter(Boolean).length, of: W.course },
        { id: 'cloaks', name: 'Festival cloaks', art: `hero/capes/${FESTIVAL_CLOAKS[0].skill}`, have: festivalCloaksOwned(state).length, of: W.cloaks }
    ].map(p => ({ ...p, have: Math.min(p.have, p.of), share: p.of ? Math.min(1, p.have / p.of) : 0 }));
    return { parts, share: parts.reduce((sum, p) => sum + p.share, 0) / parts.length };
}
