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
import { BESTIARY_MAX_STARS, bestiaryStars } from '../data/bestiary.js';
import { CODEX_SIZE } from '../data/items.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PETS } from '../data/pets.js';
import { UNIQUES, TITAN_LATE_FROM } from '../data/dungeons.js';
import { TRIALS, TRIAL_TIERS, trialTiersCleared } from '../data/trials.js';
import { AGILITY_SLOTS } from '../data/agility.js';
import { FESTIVAL_CLOAKS, festivalCloaksOwned } from '../data/capes.js';

const held = state => new Set([...(state.inventory || []), ...Object.values(state.equipped || {})].filter(i => i?.uniqueId).map(i => i.uniqueId));

/** Every part: { id, name, art, have, of, share }, and the whole as a share (0 to 1). */
export function completion(state) {
    const masteryMost = MASTERY_SKILLS.reduce((n, id) => n + masteryActions(id).length * (MASTERY_MAX_LEVEL - 1), 0);
    const masteryHave = MASTERY_SKILLS.reduce((n, id) => n + Math.round(masteryShare(state, id) * masteryActions(id).length * (MASTERY_MAX_LEVEL - 1)), 0);
    const parts = [
        { id: 'skills', name: 'Skill levels', art: 'perk/scholar', have: SKILL_IDS.reduce((n, id) => n + Math.min(MAX_LEVEL, levelForXp(state.skills[id]?.xp || 0)), 0), of: SKILL_IDS.length * MAX_LEVEL },
        { id: 'mastery', name: 'Mastery', art: 'res/diamond', have: masteryHave, of: masteryMost },
        { id: 'bestiary', name: 'Bestiary stars', art: 'mon/Griffin', have: bestiaryStars(state.stats?.killsByMonster || {}), of: BESTIARY_MAX_STARS },
        { id: 'codex', name: 'Codex', art: 'item/Head/5', have: Object.keys(state.codex || {}).length, of: CODEX_SIZE },
        { id: 'medals', name: 'Medals', art: 'crown', have: ACHIEVEMENTS.filter(a => state.achievements?.[a.id]).length, of: ACHIEVEMENTS.length },
        { id: 'pets', name: 'Pets', art: 'pet/scout', have: PETS.filter(p => state.pets?.[p.id]).length, of: PETS.length },
        { id: 'uniques', name: 'Uniques', art: 'uniq/goblin_crown', have: [...held(state)].filter(id => UNIQUES[id]).length, of: Object.keys(UNIQUES).length },
        { id: 'titans', name: 'Titans', art: 'titan/0', have: Math.min(TITAN_LATE_FROM, state.titan?.kills || 0), of: TITAN_LATE_FROM },
        { id: 'trials', name: 'Trials', art: 'mon/Mountain Troll', have: trialTiersCleared(state), of: TRIALS.length * TRIAL_TIERS },
        { id: 'course', name: 'The course', art: 'obstacle/rope_swing', have: (state.agility?.built || []).filter(Boolean).length, of: AGILITY_SLOTS.length },
        { id: 'cloaks', name: 'Festival cloaks', art: `hero/capes/${FESTIVAL_CLOAKS[0].skill}`, have: festivalCloaksOwned(state).length, of: FESTIVAL_CLOAKS.length }
    ].map(p => ({ ...p, have: Math.min(p.have, p.of), share: p.of ? Math.min(1, p.have / p.of) : 0 }));
    return { parts, share: parts.reduce((sum, p) => sum + p.share, 0) / parts.length };
}
