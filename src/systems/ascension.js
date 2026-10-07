// Ascension (data/ascension.js): from best stage ASCEND_FROM, a prestige that also gives the tokens up
// for Stars. The prestige itself is systems/prestige.js doPrestige (the run's tokens join the stock
// first, so they count toward the Stars); this takes the stock and pays.

import { ASCEND_FROM, ASCEND_REST_MS, starsFor, starGain } from '../data/ascension.js';
import { doPrestige, prestigePreview } from './prestige.js';
import { enterCombat } from './combat.js';
import { log, bumpStat } from './progress.js';

/** Ascension is on offer once the best stage reaches ASCEND_FROM (and stays, once a hero has ascended). */
export const ascensionOpen = state => (state.combat.bestStage || 0) >= ASCEND_FROM || (state.ascension?.count || 0) > 0 || !!state.settings?.devUnlockAll;

/** Milliseconds until Ascension has rested from the last one (0 when it may, and before the first). */
export const ascendRestMs = (state, now) => ((state.ascension?.count || 0) > 0 ? Math.max(0, (state.ascension.lastAt || 0) + ASCEND_REST_MS - now) : 0);

/**
 * What an Ascension now would give: the tokens it gives up (those held and this run's), the Stars for
 * them, what every prestige would pay before and after (as a multiplier of its tokens), and how long
 * Ascension still rests from the last one.
 */
export function ascendPreview(game) {
    const state = game.state;
    const p = prestigePreview(game);
    const tokens = (state.prestige.tokens || 0) + p.tokens;
    const stars = starsFor(tokens);
    const held = state.ascension?.stars || 0;
    const restMs = ascendRestMs(state, game.now);
    return {
        allowed: p.allowed && ascensionOpen(state) && stars > 0 && restMs === 0,
        restMs,
        waitMs: p.waitMs,
        blockedBy: p.blockedBy,
        tokens,
        stars,
        starsAfter: held + stars,
        gainNow: starGain(held),
        gainAfter: starGain(held + stars),
        skillPoints: p.skillPoints,
        startStage: p.startStage
    };
}

/** Ascend: the prestige, then the tokens for Stars. A hero who was fighting walks into the next run. */
export function doAscend(game) {
    const state = game.state;
    const preview = ascendPreview(game);
    if (!preview.allowed) return false;
    const fighting = state.combat.active || state.combat.recovering;
    if (!doPrestige(game, { ascend: true })) return false;
    const given = state.prestige.tokens;
    const stars = starsFor(given);
    state.prestige.tokens = 0;
    state.ascension.stars += stars;
    state.ascension.count += 1;
    if (!state.ascension.firstAt) state.ascension.firstAt = game.now;
    state.ascension.lastAt = game.now;
    bumpStat(game, 'ascensions');
    game.recompute();
    state.combat.hp = game.derived.maxHp;
    if (fighting) enterCombat(game);
    log(game, `🌟 Ascension ${state.ascension.count}: ${given.toLocaleString('en-US')} tokens became ${stars} Stars. Every prestige now pays ×${starGain(state.ascension.stars).toFixed(2)} tokens.`, 'prestige');
    game.emit({ type: 'ascend', count: state.ascension.count, stars, starsAfter: state.ascension.stars, tokensGiven: given, gain: starGain(state.ascension.stars), gainBefore: preview.gainNow });
    game.markDirty();
    return true;
}
