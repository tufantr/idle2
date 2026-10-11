// Deterministic combat power from a save, shared by the game and the server. The server computes
// clan-boss damage and leaderboard numbers with this from the save it stores, so a client never
// submits a number another player sees.

import { migrateState } from './state.js';
import { deriveStats, BASE } from './modifiers.js';
import { levelForXp } from './xp.js';
import { enemyBaseStats, BALANCE } from './formulas.js';
import { TRIALS, WEEK_MS, trialTarget, trialTier, laurelsOf, weeklyTrialAt } from '../data/trials.js';
import { CLAN_ATTACK_SECONDS, CLAN_FIGHT_MS, CLAN_GUARD, CLAN_ATTACKS_PER_DAY, CLAN_ATTACK_BANK } from '../data/social.js';

export { CLAN_ATTACK_SECONDS, CLAN_FIGHT_MS, CLAN_GUARD, CLAN_ATTACKS_PER_DAY, CLAN_ATTACK_BANK };   // the server reads them here

/** The start of the week holding `now`, as the week's Trial counts weeks (for the server's board). */
export const trialWeekStart = now => weeklyTrialAt(now).start;

/** Expected damage per second: attack × crit expectation ÷ interval. No dice. */
export function expectedDps(derived) {
    const critMult = 1 + derived.critChance * (derived.critDmg - 1);
    return derived.atk * critMult / (derived.attackInterval / 1000);
}

/** The hero of a stored save as the server judges it: no Focus, timed boosts, potion or Trial, so numbers are stable. */
function stableState(rawState, now) {
    const state = migrateState(rawState, now);
    state.meta.lastInputAt = now;
    state.meta.lastActiveAt = now;
    for (const mg of Object.values(state.minigame)) mg.boostUntil = 0;
    state.bonfire.until = 0;
    state.combat.potion = 'none';
    state.trials.active = null;   // a Trial's rule handicaps a run, not the hero the boards compare
    return state;
}

/** Is the clan boss's guard down `ms` into a fight? */
export function clanGuardDown(ms) {
    const t = ms - CLAN_GUARD.first;
    return t >= 0 && t % CLAN_GUARD.every < CLAN_GUARD.open;
}

/**
 * The strikes a fight of `ms` could really hold, from what a page sent: numbers inside the fight, in
 * time order, at most one per BALANCE.combat.strikeGapMs (the game's own rule). The rest are dropped,
 * so a forged list deals no more than a perfect player's.
 */
export function cleanStrikes(raw, ms = CLAN_FIGHT_MS) {
    if (!Array.isArray(raw)) return [];
    const gap = BALANCE.combat.strikeGapMs;
    const times = raw.slice(0, 2000).filter(t => typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= ms).sort((a, b) => a - b);
    const kept = [];
    for (const t of times) if (!kept.length || t - kept[kept.length - 1] >= gap) kept.push(Math.round(t));
    return kept;
}

/**
 * Damage of a clan fight of `ms` milliseconds for the hero `derived`, with its strikes (ms into the
 * fight, cleaned). Expected values, no dice: the hero attacks every attackInterval from the start; a
 * strike while the guard is down is CLAN_GUARD.mult × BALANCE.combat.manualHitMult of an attack and
 * builds the combo, which raises every hit as it does in a fight (systems/combat.js); one at another
 * time glances off.
 */
export function clanFightDamage(derived, strikes, ms = CLAN_FIGHT_MS) {
    const b = BALANCE.combat;
    const hit = derived.atk * (1 + Math.min(BASE.caps.critChance, derived.critChance) * (derived.critDmg - 1));
    const interval = Math.max(1, derived.attackInterval);
    const step = 50;
    let combo = 0, lastStrike = -Infinity, nextAttack = interval, s = 0;
    let base = 0, struck = 0, guarded = 0;
    for (let t = 0; t <= ms; t += step) {
        if (combo > 0 && t - lastStrike > b.comboDecayAfterMs) combo = Math.max(0, combo - (0.05 + combo / 100));
        for (; s < strikes.length && strikes[s] < t + step; s++) {
            if (!clanGuardDown(strikes[s])) continue;   // it glances off the guard
            combo = Math.min(b.comboMax, combo + 1 / (1 + combo / 40));
            lastStrike = strikes[s];
            guarded++;
            struck += hit * b.manualHitMult * CLAN_GUARD.mult * (1 + Math.min(b.comboMax, combo) * b.comboDmgPerStack);
        }
        for (; nextAttack < t + step && nextAttack <= ms; nextAttack += interval) base += hit * (1 + Math.min(b.comboMax, combo) * b.comboDmgPerStack);
    }
    return { damage: Math.floor(base + struck), base: Math.floor(base), struck: Math.floor(struck), strikes: strikes.length, guarded };
}

/** A clan attack from a stored save (the server's reckoning): `strikes` and `ms` as the page sent them. */
export function clanAttackFromSave(rawState, strikes, ms = CLAN_FIGHT_MS, now = Date.now()) {
    const fightMs = Math.max(0, Math.min(CLAN_FIGHT_MS, Number.isFinite(Number(ms)) ? Number(ms) : CLAN_FIGHT_MS));
    return clanFightDamage(deriveStats(stableState(rawState, now)), cleanStrikes(strikes, fightMs), fightMs);
}

/** Summary of a stored save for social features. Accepts any raw save object. */
export function powerSummary(rawState, now = Date.now()) {
    const state = stableState(rawState, now);
    const derived = deriveStats(state);
    const totalLevel = Object.values(state.skills).reduce((sum, s) => sum + levelForXp(s.xp), 0);
    return {
        dps: expectedDps(derived),
        attackDamage: clanFightDamage(derived, []).damage,   // a clan fight without a strike (sizes the boss)
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
        trialTiersBeyondBest: TRIALS.reduce((n, t) => n + Array.from({ length: trialTier(state, t.id) }, (_, i) => trialTarget(t, i + 1)).filter(stage => stage > state.combat.bestStage).length, 0),
        // the best stage this week in the week's Trial, and the week it belongs to (the week's board)
        weeklyTrial: state.trials.weekly?.start === weeklyTrialAt(now).start ? state.trials.weekly.best || 0 : 0,
        weeklyTrialWeek: weeklyTrialAt(now).start,
        // laurels past one a week since the save began (the week's Trial: data/trials.js)
        laurelsBeyondWeeks: Math.max(0, laurelsOf(state) - (Math.floor(Math.max(0, now - (Number(state.meta.createdAt) || 0)) / WEEK_MS) + 1))
    };
}

// The fastest honest climb of the best stage, by depth: the most stages the simulator's players gained
// from each depth in an hour, four hours and a day fit `burst + perHour × hours`, from these rows
// ([stage, burst, perHour], straight lines between them; docs/DESIGN.md §3.17). First fitted to 166 runs
// of 150 to 400 hours; from stage 200 refitted in October 2026 to 378 runs of 150 to 1,000 hours on the
// balance since (Auto, Ascension, the records, the deep Abyss's easing past 400): a hero now gains up to
// 20 stages in an hour and 70 in a day around stage 250, 10 and 50 past 400, and 20 a day past 500.
const CLIMB = [[0, 60, 10], [50, 35, 6], [100, 25, 4], [150, 20, 2.5], [200, 20, 2.5], [300, 22, 2], [350, 22, 2], [400, 16, 1.5], [450, 16, 1.5], [500, 10, 0.9]];
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
