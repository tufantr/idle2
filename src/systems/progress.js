// XP, level-ups, achievements, unlocks, stats and the event log.

import { SKILLS } from '../data/skills.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { evaluateUnlocks } from '../data/unlocks.js';
import { evaluateDisclosures } from './disclosure.js';
import { levelForXp, MAX_LEVEL, XP_FOR_MAX_LEVEL } from '../core/xp.js';
import { petForSkill, petChance } from '../data/pets.js';
import { rng } from '../core/rng.js';

const LOG_LIMIT = 60;

export function log(game, text, type = 'info') {
    const entry = { t: game.now, type, text };
    game.state.log.push(entry);
    if (game.state.log.length > LOG_LIMIT) game.state.log.splice(0, game.state.log.length - LOG_LIMIT);
    return entry;
}

/** Add raw XP to a skill (the caller applies multipliers). Emits level-up events. */
export function grantXp(game, skillId, amount) {
    const skill = game.state.skills[skillId];
    if (!skill || !(amount > 0)) return 0;
    const before = levelForXp(skill.xp);
    skill.xp = Math.min(XP_FOR_MAX_LEVEL * 2, skill.xp + amount);
    const after = levelForXp(skill.xp);
    if (after > before) {
        game.emit({ type: 'levelUp', skill: skillId, level: after, from: before });
        log(game, `${SKILLS[skillId].icon} ${SKILLS[skillId].name} level ${after}!`, 'level');
        if (after >= MAX_LEVEL) {
            game.state.stats.skills99 = Object.values(game.state.skills).filter(s => levelForXp(s.xp) >= MAX_LEVEL).length;
        }
        game.markDirty();
    }
    return after - before;
}

/** How far along an achievement's requirement is: { have, need }. */
export function achievementProgress(state, req) {
    if (req.type === 'stat') return { have: state.stats[req.key] || 0, need: req.value };
    if (req.type === 'skillLevel') return { have: levelForXp(state.skills[req.skill]?.xp || 0), need: req.level };
    return { have: 0, need: 1 };
}

function meetsRequirement(state, req) {
    if (req.type === 'stat') return (state.stats[req.key] || 0) >= req.value;
    if (req.type === 'skillLevel') return levelForXp(state.skills[req.skill]?.xp || 0) >= req.level;
    return false;
}

export function checkAchievements(game) {
    const state = game.state;
    let unlocked = 0;
    for (const ach of ACHIEVEMENTS) {
        if (state.achievements[ach.id]) continue;
        if (meetsRequirement(state, ach.req)) {
            state.achievements[ach.id] = true;
            unlocked++;
            game.emit({ type: 'achievement', id: ach.id, name: ach.name, reward: ach.reward, secret: !!ach.secret });
            log(game, `🏆 Achievement: ${ach.name} — ${ach.reward}`, 'achievement');
        }
    }
    if (unlocked) game.markDirty();
    return unlocked;
}

export function checkUnlocks(game) {
    const newly = evaluateUnlocks(game.state);
    for (const id of newly) {
        game.emit({ type: 'unlock', id });
        log(game, `🔓 Unlocked: ${id.charAt(0).toUpperCase() + id.slice(1)}`, 'unlock');
    }
    return newly;
}

/** Open the pieces of the interface the player has now met (systems/disclosure.js). */
export function checkDisclosures(game) {
    const newly = evaluateDisclosures(game.state);
    for (const id of newly) game.emit({ type: 'reveal', id });
    return newly;
}

export function bumpStat(game, key, amount = 1) {
    game.state.stats[key] = (game.state.stats[key] || 0) + amount;
}

/** Roll for the skill's pet after an action (Melvor's formula; see data/pets.js). */
export function rollPet(game, skill, actionMs) {
    const pet = petForSkill(skill);
    if (!pet || game.state.pets[pet.id]) return null;
    const level = levelForXp(game.state.skills[skill]?.xp || 0);
    if (!rng.chance(petChance(actionMs, level))) return null;
    game.state.pets[pet.id] = true;
    bumpStat(game, 'petsFound');
    log(game, `🐾 A pet found you: ${pet.icon} ${pet.name} (${pet.desc}).`, 'achievement');
    game.emit({ type: 'pet', pet });
    game.markDirty();
    return pet;
}
