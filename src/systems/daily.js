// Daily supply crates: one ripens every 20 hours and up to three wait for you, so a skipped day
// costs nothing. No streaks. Each crate is worth ~40 kills of gold at your best stage plus
// materials, essence and a gem from that zone.

import { goldPerKillAtStage } from '../core/formulas.js';
import { zoneForStage, GEM_DROP_TABLE } from '../data/zones.js';
import { RESOURCES } from '../data/resources.js';
import { rng } from '../core/rng.js';
import { log, bumpStat } from './progress.js';

export const DAILY_INTERVAL_MS = 20 * 3600 * 1000;
export const DAILY_MAX_BANKED = 3;

/** Ripen crates for the time that has passed. A full bank keeps the clock cycling, never adding a fourth. */
export function accrueDaily(state, now) {
    const d = state.daily;
    while (d.banked < DAILY_MAX_BANKED && now >= d.nextAt) {
        d.banked++;
        d.nextAt += DAILY_INTERVAL_MS;
    }
    if (d.banked >= DAILY_MAX_BANKED && d.nextAt <= now) d.nextAt = now + DAILY_INTERVAL_MS;
}

export function dailyReady(state, now) {
    accrueDaily(state, now);
    return state.daily.banked > 0;
}

export function claimDaily(game) {
    const state = game.state;
    accrueDaily(state, game.now);
    if (state.daily.banked < 1) return null;
    state.daily.banked--;

    const stage = Math.max(1, state.combat.bestStage);
    const zone = zoneForStage(stage);
    const gold = 40 * goldPerKillAtStage(stage, game.derived.goldMult);
    const materials = {};
    for (let i = 0; i < 6; i++) {
        const pick = rng.weighted(zone.loot);
        materials[pick.id] = (materials[pick.id] || 0) + 2;
    }
    const essence = 3 * zone.tier;
    const gem = [...GEM_DROP_TABLE].reverse().find(g => g.tier <= zone.tier) || GEM_DROP_TABLE[0];
    materials[gem.id] = (materials[gem.id] || 0) + 1;

    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    state.resources.essence += essence;
    for (const [id, qty] of Object.entries(materials)) state.resources[id] += qty;
    state.daily.claimed = (state.daily.claimed || 0) + 1;

    const summary = Object.entries(materials).map(([id, qty]) => `${qty}× ${RESOURCES[id].name}`).join(', ');
    log(game, `📦 Daily crate: +${gold.toLocaleString()} gold, +${essence} essence, ${summary}.`, 'daily');
    game.markDirty();
    return { gold, essence, materials };
}
