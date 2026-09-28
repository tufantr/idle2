// Daily supply crate: a bankable reward worth about twenty kills at your best stage plus a
// material pack from your current zone. No streaks, nothing lost by missing a day.

import { enemyForStage, goldForKill } from '../core/formulas.js';
import { zoneForStage } from '../data/zones.js';
import { rng } from '../core/rng.js';
import { log, bumpStat } from './progress.js';

export const DAILY_INTERVAL_MS = 20 * 3600 * 1000;

export function dailyReady(state, now) {
    return now - (state.daily.lastClaim || 0) >= DAILY_INTERVAL_MS;
}

export function claimDaily(game) {
    const state = game.state;
    if (!dailyReady(state, game.now)) return null;
    const stage = Math.max(1, state.combat.bestStage);
    const gold = 20 * goldForKill(enemyForStage(stage), game.derived.goldMult);
    const zone = zoneForStage(stage);
    const materials = {};
    for (let i = 0; i < 6; i++) {
        const pick = rng.weighted(zone.loot);
        materials[pick.id] = (materials[pick.id] || 0) + 2;
    }
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    for (const [id, qty] of Object.entries(materials)) state.resources[id] += qty;
    state.daily.lastClaim = game.now;
    log(game, `📦 Daily crate: +${gold.toLocaleString()} gold and materials from ${zone.name}.`, 'daily');
    game.markDirty();
    return { gold, materials };
}
