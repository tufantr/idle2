// Deterministic combat power from a save, shared by the game and the server. The server computes
// clan-boss damage and leaderboard numbers with this from the save it stores, so a client never
// submits a number another player sees.

import { migrateState } from './state.js';
import { deriveStats } from './modifiers.js';
import { levelForXp } from './xp.js';

export const CLAN_ATTACK_SECONDS = 60;

/** Expected damage per second: attack × crit expectation ÷ interval. No dice. */
export function expectedDps(derived) {
    const critMult = 1 + derived.critChance * (derived.critDmg - 1);
    return derived.atk * critMult / (derived.attackInterval / 1000);
}

/** Summary of a stored save for social features. Accepts any raw save object. */
export function powerSummary(rawState, now = Date.now()) {
    const state = migrateState(rawState, now);
    // Focus and timed boosts depend on when the save was made; leave them out so numbers are stable.
    state.meta.lastInputAt = now;
    state.meta.lastActiveAt = now;
    for (const mg of Object.values(state.minigame)) mg.boostUntil = 0;
    state.bonfire.until = 0;
    state.combat.potion = 'none';
    const derived = deriveStats(state);
    const totalLevel = Object.values(state.skills).reduce((sum, s) => sum + levelForXp(s.xp), 0);
    return {
        dps: expectedDps(derived),
        attackDamage: Math.floor(expectedDps(derived) * CLAN_ATTACK_SECONDS),
        bestStage: state.combat.bestStage,
        totalLevel,
        combatLevel: derived.combatLevel,
        titanKills: state.titan.kills,
        dungeonClears: state.stats.dungeonClears || 0,
        prestiges: state.prestige.count
    };
}
