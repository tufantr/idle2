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
        stars: state.ascension.stars,                // Ascension's Stars (data/ascension.js)
        tokenGain: derived.tokenMult,                // what every prestige's tokens are multiplied by (Stars, medals, uniques)
        // Trial tiers whose stage is past the best stage ever reached: none in a save that was played
        trialTiersBeyondBest: TRIALS.reduce((n, t) => n + Array.from({ length: trialTier(state, t.id) }, (_, i) => trialTarget(t, i + 1)).filter(stage => stage > state.combat.bestStage).length, 0)
    };
}

// The fastest honest climb of the best stage, by depth: the most stages the simulator's players gained
// from each depth in an hour, four hours and a day (166 runs of 150 to 400 hours, five play styles,
// with and without Trials; docs/DESIGN.md §3.17) fit `burst + perHour × hours`, from these rows
// ([stage, burst, perHour], straight lines between them). Early stages fall fast, late ones slowly:
// about 13 stages in an hour and 50 in a day around stage 200, 10 and 22 past 300.
const CLIMB = [[0, 60, 10], [50, 35, 6], [100, 25, 4], [150, 20, 2.5], [200, 15, 1.6], [250, 12, 1.2], [300, 10, 0.8]];
export const CLIMB_MARGIN = 3;   // what the server allows over it: players who tap, and better plans than the bot's

/** The most a best stage of `fromStage` can honestly grow in `hours`, times CLIMB_MARGIN. */
export function honestClimb(fromStage, hours) {
    const s = Math.max(0, Number(fromStage) || 0);
    const next = CLIMB.findIndex(([at]) => at > s);
    let burst, perHour;
    if (next === -1) [, burst, perHour] = CLIMB[CLIMB.length - 1];
    else if (next === 0) [, burst, perHour] = CLIMB[0];
    else {
        const [a, b0, r0] = CLIMB[next - 1];
        const [b, b1, r1] = CLIMB[next];
        const f = (s - a) / (b - a);
        burst = b0 + (b1 - b0) * f;
        perHour = r0 + (r1 - r0) * f;
    }
    return CLIMB_MARGIN * (burst + perHour * Math.max(0, Number(hours) || 0));
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
