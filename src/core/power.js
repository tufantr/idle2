// Deterministic combat power from a save, shared by the game and the server. The server computes
// clan-boss damage and leaderboard numbers with this from the save it stores, so a client never
// submits a number another player sees.

import { migrateState } from './state.js';
import { deriveStats } from './modifiers.js';
import { levelForXp } from './xp.js';
import { enemyBaseStats, BALANCE } from './formulas.js';
import { TRIALS, trialTarget, trialTier } from '../data/trials.js';

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
    state.trials.active = null;   // a Trial's rule handicaps a run, not the hero the boards compare
    const derived = deriveStats(state);
    const totalLevel = Object.values(state.skills).reduce((sum, s) => sum + levelForXp(s.xp), 0);
    return {
        dps: expectedDps(derived),
        attackDamage: Math.floor(expectedDps(derived) * CLAN_ATTACK_SECONDS),
        bestStage: state.combat.bestStage,
        totalLevel,
        totalXp: Object.values(state.skills).reduce((sum, s) => sum + (s.xp || 0), 0),
        tokens: state.prestige.tokens,
        combatLevel: derived.combatLevel,
        titanKills: state.titan.kills,
        dungeonClears: state.stats.dungeonClears || 0,
        prestiges: state.prestige.count,
        // Trial tiers whose stage is past the best stage ever reached: none in a save that was played
        trialTiersBeyondBest: TRIALS.reduce((n, t) => n + Array.from({ length: trialTier(state, t.id) }, (_, i) => trialTarget(t, i + 1)).filter(stage => stage > state.combat.bestStage).length, 0)
    };
}

/**
 * The most damage a clan attack can plausibly deal for a hero whose best stage is `bestStage`: felling
 * a boss 40 stages beyond it in 5 seconds, for the whole minute. Honest heroes stay far below it (at
 * most ~12% of it over 150 simulated hours), so only a save whose gear no play could have made goes
 * past it. The server flags such saves and never sizes a clan boss beyond it.
 */
export function plausibleAttackDamage(bestStage) {
    const stage = Math.max(1, Math.min(3000, Math.floor(Number(bestStage) || 1))) + 40;
    const bossHp = enemyBaseStats(stage).hp * BALANCE.enemy.bossHpMult;
    return Math.floor(bossHp / 5 * CLAN_ATTACK_SECONDS);
}
