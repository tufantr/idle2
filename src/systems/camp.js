// Buying camp upgrades with gold.

import { CAMP_UPGRADES, campCost } from '../data/camp.js';
import { bumpStat } from './progress.js';

/** Buy `count` levels (or 'max' = as many as affordable). Returns levels bought. */
export function buyCampUpgrade(game, id, count = 1) {
    const state = game.state;
    const upgrade = CAMP_UPGRADES.find(u => u.id === id);
    if (!upgrade) return 0;
    const maxHpBefore = game.derived?.maxHp || 0;
    let bought = 0;
    const wanted = count === 'max' ? Infinity : Math.max(1, Math.floor(count));
    while (bought < wanted) {
        const level = state.camp[id] || 0;
        if (level >= upgrade.max) break;
        const cost = campCost(upgrade, level);
        if (state.gold < cost) break;
        state.gold -= cost;
        state.stats.goldSpent = (state.stats.goldSpent || 0) + cost;
        state.camp[id] = level + 1;
        bought++;
    }
    if (bought) {
        bumpStat(game, 'campLevels', bought);
        game.markDirty();
        // the health a Hearth adds is health the hero has, at once (not only room to heal into)
        if (upgrade.stat === 'hp' && game.recompute && state.combat.hp > 0) { game.recompute(); state.combat.hp = Math.min(game.derived.maxHp, state.combat.hp + Math.max(0, game.derived.maxHp - maxHpBefore)); }
    }
    else game.emit({ type: 'error', text: 'Not enough gold for that upgrade.' });
    return bought;
}

export function resetCamp(state) {
    for (const upgrade of CAMP_UPGRADES) state.camp[upgrade.id] = 0;
}

/** Cost of the next level, or null when maxed. */
export function nextCampCost(state, id) {
    const upgrade = CAMP_UPGRADES.find(u => u.id === id);
    const level = state.camp[id] || 0;
    return level >= upgrade.max ? null : campCost(upgrade, level);
}
