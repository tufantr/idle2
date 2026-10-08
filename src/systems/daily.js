// Daily supply crates: one ripens every 20 hours and up to three wait for you, so a skipped day
// costs nothing. No streaks. Each crate is worth ~40 kills of gold at your best stage plus
// materials, essence and a gem from that zone. Every seventh crate opened (counted, not consecutive
// days) is a great crate: three times the gold, twice the rest, and a gem of the next tier besides.

import { goldPerKillAtStage } from '../core/formulas.js';
import { zoneForStage, GEM_DROP_TABLE } from '../data/zones.js';
import { RESOURCES } from '../data/resources.js';
import { rng } from '../core/rng.js';
import { log, bumpStat } from './progress.js';

export const DAILY_INTERVAL_MS = 20 * 3600 * 1000;
export const DAILY_MAX_BANKED = 3;
export const GREAT_CRATE_EVERY = 7;
// What a crate holds (the wiki reads these too): gold of this many kills at the best stage, this many picks
// of the best stage's land's materials (each this many), essence of this many times the land's tier.
export const CRATE_GOLD_KILLS = 40;
export const CRATE_PICKS = 6;
export const CRATE_PICK_QTY = 2;
export const CRATE_ESSENCE_PER_TIER = 3;
export const GREAT_CRATE_GOLD_MULT = 3;
export const GREAT_CRATE_REST_MULT = 2;

/** How many crates have been opened since the last great one (0 to 6): the seventh is great. */
export const cratesTowardGreat = state => (state.daily.claimed || 0) % GREAT_CRATE_EVERY;

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
    const great = cratesTowardGreat(state) === GREAT_CRATE_EVERY - 1;
    const more = great ? GREAT_CRATE_REST_MULT : 1;

    const stage = Math.max(1, state.combat.bestStage);
    const zone = zoneForStage(stage);
    const gold = CRATE_GOLD_KILLS * goldPerKillAtStage(stage, game.derived.goldMult) * (great ? GREAT_CRATE_GOLD_MULT : 1);
    const materials = {};
    for (let i = 0; i < CRATE_PICKS; i++) {
        const pick = rng.weighted(zone.loot);
        materials[pick.id] = (materials[pick.id] || 0) + CRATE_PICK_QTY * more;
    }
    const essence = CRATE_ESSENCE_PER_TIER * zone.tier * more;
    const gem = [...GEM_DROP_TABLE].reverse().find(g => g.tier <= zone.tier) || GEM_DROP_TABLE[0];
    materials[gem.id] = (materials[gem.id] || 0) + 1;
    if (great) {   // and a gem of the next tier (the best there is, at the top)
        const better = GEM_DROP_TABLE.find(g => g.tier > gem.tier) || gem;
        materials[better.id] = (materials[better.id] || 0) + 1;
    }

    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    state.resources.essence += essence;
    for (const [id, qty] of Object.entries(materials)) state.resources[id] += qty;
    state.daily.claimed = (state.daily.claimed || 0) + 1;
    if (great) bumpStat(game, 'greatCrates');

    const summary = Object.entries(materials).map(([id, qty]) => `${qty}× ${RESOURCES[id].name}`).join(', ');
    log(game, `📦 ${great ? 'A great crate' : 'Daily crate'}: +${gold.toLocaleString()} gold, +${essence} essence, ${summary}.`, 'daily');
    game.markDirty();
    return { gold, essence, materials, great };
}
