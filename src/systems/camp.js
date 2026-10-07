// Buying camp upgrades with gold.

import { CAMP_UPGRADES, campCost } from '../data/camp.js';
import { goldPerKillAtStage } from '../core/formulas.js';
import { trialBite } from '../data/trials.js';
import { bumpStat } from './progress.js';

/** The price of the next level of `upgrade` from `level`, for this hero (it follows the best stage: data/camp.js). */
export function campPrice(state, upgrade, level = state.camp[upgrade.id] || 0) {
    return campCost(upgrade, level, goldPerKillAtStage(state.combat.bestStage));
}

/** Buy `count` levels (or 'max' = as many as affordable). Returns levels bought. */
export function buyCampUpgrade(game, id, count = 1) {
    const state = game.state;
    const upgrade = CAMP_UPGRADES.find(u => u.id === id);
    if (!upgrade) return 0;
    if (trialBite(state).noCamp) { game.emit({ type: 'error', text: 'The camp stays packed in this Trial.' }); return 0; }
    const maxHpBefore = game.derived?.maxHp || 0;
    let bought = 0;
    const wanted = count === 'max' ? Infinity : Math.max(1, Math.floor(count));
    while (bought < wanted) {
        const level = state.camp[id] || 0;
        if (level >= upgrade.max) break;
        const cost = campPrice(state, upgrade, level);
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
    return level >= upgrade.max ? null : campPrice(state, upgrade, level);
}
