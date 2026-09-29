// The agility course: build obstacles (gold + materials, permanent bonuses) and run the course.

import { AGILITY_SLOTS, obstacleById, MAX_OBSTACLE_LEVEL, obstacleUpgradeGold, obstacleUpgradeLevelReq } from '../data/agility.js';
import { RESOURCES } from '../data/resources.js';
import { skillLevel } from '../core/modifiers.js';
import { log, bumpStat } from './progress.js';

/** Gold and materials to build an obstacle in `slot`. */
export function obstacleCost(state, slot) {
    const def = AGILITY_SLOTS[slot];
    return { gold: def.costGold, materials: def.materials };
}

export function canBuild(state, obstacleId) {
    const obstacle = obstacleById(obstacleId);
    if (!obstacle) return { ok: false, reason: 'Unknown obstacle.' };
    const slotDef = AGILITY_SLOTS[obstacle.slot];
    if (skillLevel(state, 'agility') < slotDef.levelReq) return { ok: false, reason: `Agility level ${slotDef.levelReq} required.` };
    if (state.agility.built[obstacle.slot] === obstacleId) return { ok: false, reason: 'Already built.' };
    const cost = obstacleCost(state, obstacle.slot);
    if (state.gold < cost.gold) return { ok: false, reason: `Needs ${cost.gold.toLocaleString()} gold.` };
    const missing = Object.entries(cost.materials).find(([id, qty]) => (state.resources[id] || 0) < qty);
    if (missing) return { ok: false, reason: `Needs ${missing[1]}× ${RESOURCES[missing[0]].name}.` };
    return { ok: true, cost };
}

/** Build (or replace) the obstacle in its slot. Replacing tears the old one down without a refund. */
export function buildObstacle(game, obstacleId) {
    const state = game.state;
    const check = canBuild(state, obstacleId);
    if (!check.ok) { game.emit({ type: 'error', text: check.reason }); return false; }
    const obstacle = obstacleById(obstacleId);
    state.gold -= check.cost.gold;
    bumpStat(game, 'goldSpent', check.cost.gold);
    for (const [id, qty] of Object.entries(check.cost.materials)) state.resources[id] -= qty;
    const replaced = state.agility.built[obstacle.slot];
    state.agility.built[obstacle.slot] = obstacleId;
    state.agility.levels[obstacle.slot] = 1;
    state.stats.obstaclesBuilt = state.agility.built.filter(Boolean).length;
    log(game, `${obstacle.icon} Built the ${obstacle.name}${replaced ? ` (replacing the ${obstacleById(replaced).name})` : ''}: ${obstacle.desc}, permanently.`, 'achievement');
    game.emit({ type: 'obstacleBuilt', obstacle });
    game.markDirty();
    return true;
}

export function obstacleLevel(state, slot) {
    return state.agility.built[slot] ? Math.max(1, state.agility.levels?.[slot] || 1) : 0;
}

/** What upgrading the obstacle in `slot` costs and needs, or null when it can't go higher. */
export function upgradeInfo(state, slot) {
    const level = obstacleLevel(state, slot);
    if (!level || level >= MAX_OBSTACLE_LEVEL) return null;
    return {
        toLevel: level + 1,
        gold: obstacleUpgradeGold(slot, level),
        levelReq: obstacleUpgradeLevelReq(slot, level + 1)
    };
}

export function upgradeObstacle(game, slot) {
    const state = game.state;
    const info = upgradeInfo(state, slot);
    if (!info) { game.emit({ type: 'error', text: 'Nothing to upgrade there.' }); return false; }
    if (skillLevel(state, 'agility') < info.levelReq) { game.emit({ type: 'error', text: `Agility level ${info.levelReq} required.` }); return false; }
    if (state.gold < info.gold) { game.emit({ type: 'error', text: `Needs ${info.gold.toLocaleString()} gold.` }); return false; }
    state.gold -= info.gold;
    bumpStat(game, 'goldSpent', info.gold);
    state.agility.levels[slot] = info.toLevel;
    bumpStat(game, 'obstacleUpgrades');
    const obstacle = obstacleById(state.agility.built[slot]);
    log(game, `${obstacle.icon} ${obstacle.name} upgraded to level ${info.toLevel}.`, 'achievement');
    game.markDirty();
    return true;
}

/** The course as an action definition: as long as its obstacles together, paying all their XP. */
export function courseDef(state) {
    const built = (state.agility?.built || []).map((id, slot) => (id ? { ...obstacleById(id), level: obstacleLevel(state, slot) } : null)).filter(Boolean);
    if (!built.length) return null;
    return {
        kind: 'agility', skill: 'agility', id: 'course', label: `Run the course (${built.length} obstacle${built.length > 1 ? 's' : ''})`,
        levelReq: 1, interval: built.reduce((sum, o) => sum + o.interval, 0),
        xp: Math.round(built.reduce((sum, o) => sum + o.xp * (1 + 0.25 * (o.level - 1)), 0))
    };
}
