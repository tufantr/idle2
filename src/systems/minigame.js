// Skill mini-games as timed opportunities: while you train a skill, a chance to play appears
// every few minutes; success makes the skill work twice as fast for a short while, and its end says
// what that added. Cadence-limited so that a fully active player earns roughly 1.5x an idle one, not
// 2x forever (see research notes).

import { NON_COMBAT_SKILLS, SKILLS } from '../data/skills.js';
import { BALANCE } from '../core/formulas.js';
import { rng } from '../core/rng.js';
import { bumpStat, log } from './progress.js';

export const CHALLENGE_MS = 10000;   // how long a challenge lasts once started

export const MINIGAME_CONFIG = {
    mining:      { icon: '⛏️', label: 'Ore Vein Pulse', desc: 'Tap while the pulse sweeps through the ore seam.', type: 'timing', accent: '#34d399', actionText: 'Pulse the Vein', marker: 'tool/pickaxe' },
    woodcutting: { icon: '🌳', label: 'Perfect Chop',   desc: 'Catch the axe rhythm at the heartwood ring.',     type: 'timing', accent: '#22c55e', actionText: 'Catch the Rhythm', marker: 'tool/axe' },
    hunting:     { icon: '🏹', label: 'Snap Shot',      desc: 'Fire when the prey crosses the kill zone.',       type: 'moving-target', accent: '#f59e0b', actionText: 'Loose an Arrow', marker: 'pet/scout', button: 'Loose arrow' },
    cooking:     { icon: '🍳', label: 'Heat Ride',      desc: 'Tap the flame to keep the pan in the perfect band.', type: 'heat', accent: '#fb923c', actionText: 'Ride the Heat' },
    alchemy:     { icon: '🧪', label: 'Catalyst Drag',  desc: 'Drag the stabiliser into the glowing channel.',   type: 'drag', accent: '#10b981', actionText: 'Stabilise the Mix' },
    // Hunting at a river spot plays the angler's game (Fishing's, before it joined Hunting): not a skill of its own
    river:       { icon: '🎣', label: 'Strike!',        desc: 'Strike when the float dips into the ring.',       type: 'moving-target', accent: '#38bdf8', actionText: 'Strike', marker: 'res/raw_trout', button: 'Strike' },
    firemaking:  { icon: '🔥', label: 'Stoke the Fire', desc: 'Tap to keep the flame in the perfect band.',      type: 'heat', accent: '#f97316', actionText: 'Stoke' }
};

/** A skill's mini-game: Hunting at a river spot plays the angler's (MINIGAME_CONFIG.river). */
export function minigameConfig(state, skillId) {
    const a = state?.action;
    if (skillId === 'hunting' && a?.kind === 'node' && a.skill === 'hunting' && SKILLS.hunting.nodes.find(n => n.id === a.id)?.fish) return MINIGAME_CONFIG.river;
    return MINIGAME_CONFIG[skillId];
}

function scheduleNext(game, skillId, now) {
    const [min, max] = BALANCE.minigame.opportunityEveryMs;
    const mg = game.state.minigame[skillId];
    mg.nextOpportunityAt = now + rng.int(min, max);
    mg.opportunityUntil = 0;
    holdChances(game.state, mg.nextOpportunityAt);
}

/**
 * One clock for every skill's chances: none comes before `at`. With a clock per skill, a player who
 * switched skills found a chance waiting in each and kept a boost up nearly all the time; now a chance
 * comes every few minutes of work, whichever skill it is.
 */
function holdChances(state, at) {
    for (const id of NON_COMBAT_SKILLS) {
        const mg = state.minigame[id];
        if (mg) mg.nextOpportunityAt = Math.max(mg.nextOpportunityAt || 0, at);
    }
}

/** Called each tick for the skill currently being trained. */
export function tickMinigame(game, skillId) {
    if (!NON_COMBAT_SKILLS.includes(skillId)) return;
    const mg = game.state.minigame[skillId];
    const now = game.now;
    if (mg.boostUntil && mg.boostUntil <= now) endBoost(game, skillId, mg);
    if (mg.challenge) {
        if (mg.challenge.expiresAt <= now) { failMinigame(game, skillId, { silent: true }); }
        return;
    }
    if (!mg.nextOpportunityAt) { mg.nextOpportunityAt = now + rng.int(45000, 90000); return; } // first chance comes quickly
    if (mg.opportunityUntil && mg.opportunityUntil <= now) { scheduleNext(game, skillId, now); return; }
    if (!mg.opportunityUntil && now >= mg.nextOpportunityAt) {
        mg.opportunityUntil = now + BALANCE.minigame.opportunityWindowMs;
        holdChances(game.state, now + BALANCE.minigame.opportunityEveryMs[0]);   // the other skills wait their turn
        game.emit({ type: 'minigameReady', skill: skillId });
    }
}

/**
 * Every skill's mini-game on the clock, whatever is being trained (the game's tick and the offline
 * replay): a boost that has run out ends, and a challenge left open past its time is lost.
 */
export function expireMinigames(game) {
    const now = game.now;
    for (const id of NON_COMBAT_SKILLS) {
        const mg = game.state.minigame[id];
        if (!mg) continue;
        if (mg.boostUntil && mg.boostUntil <= now) endBoost(game, id, mg);
        if (mg.challenge && mg.challenge.expiresAt <= now) failMinigame(game, id, { silent: true });
    }
}

/** A boost has run out: say what it added (twice as fast, so half of what was made meanwhile), and clear it. */
function endBoost(game, skillId, mg) {
    const qty = Math.floor((mg.gainQty || 0) / 2);
    const xp = Math.floor((mg.gainXp || 0) / 2);
    if (qty > 0 || xp > 0) game.emit({ type: 'minigameBoostOver', skill: skillId, id: mg.gainId || '', qty, xp });
    mg.boostUntil = 0;
    mg.mult = 0;
    mg.gainId = '';
    mg.gainQty = 0;
    mg.gainXp = 0;
    game.markDirty();
}

/** What a skill action made while its boost ran (systems/skilling.js): the main thing made, and the XP. */
export function noteBoostGain(game, skillId, made, xp) {
    const mg = game.state.minigame[skillId];
    if (!mg || !(mg.boostUntil > game.now)) return;
    if (made?.id && made.qty > 0) {
        if (mg.gainId !== made.id) { mg.gainId = made.id; mg.gainQty = 0; }   // another node: count the new one
        mg.gainQty += made.qty;
    }
    mg.gainXp += Math.max(0, xp || 0);
}

export function hasOpportunity(state, skillId, now) {
    const mg = state.minigame[skillId];
    return !!mg && mg.opportunityUntil > now && !mg.challenge;
}

export function buildChallenge(skillId, now) {
    const conf = MINIGAME_CONFIG[skillId];
    const expiresAt = now + CHALLENGE_MS;
    if (conf.type === 'timing') return { type: 'timing', zoneStart: +(0.18 + rng.random() * 0.44).toFixed(2), zoneWidth: 0.16, cycleMs: 900 + rng.int(0, 500), startedAt: now, expiresAt };
    if (conf.type === 'moving-target') return { type: 'moving-target', zoneStart: +(0.38 + rng.random() * 0.18).toFixed(2), zoneWidth: 0.14, cycleMs: 1000 + rng.int(0, 500), startedAt: now, expiresAt };
    if (conf.type === 'heat') return { type: 'heat', heat: 0.35, targetStart: +(0.42 + rng.random() * 0.12).toFixed(2), targetWidth: 0.18, expiresAt };
    return { type: 'drag', dragValue: 0.15 + rng.random() * 0.2, targetStart: +(0.48 + rng.random() * 0.16).toFixed(2), targetWidth: 0.16, expiresAt };
}

export function startMinigame(game, skillId) {
    const state = game.state;
    if (!hasOpportunity(state, skillId, game.now) && !state.settings.devUnlockAll) return false;
    const mg = state.minigame[skillId];
    mg.challenge = buildChallenge(skillId, game.now);
    mg.opportunityUntil = 0;
    return true;
}

export function animatedPosition(challenge, now) {
    const elapsed = now - challenge.startedAt;
    const cycle = challenge.cycleMs || 1200;
    const raw = (elapsed % (cycle * 2)) / cycle;
    return raw <= 1 ? raw : 2 - raw;
}

export function pumpHeat(game, skillId) {
    const ch = game.state.minigame[skillId]?.challenge;
    if (!ch || ch.type !== 'heat') return;
    ch.heat = Math.min(1, ch.heat + 0.12);
}

export function decayHeat(game, skillId, dt) {
    const ch = game.state.minigame[skillId]?.challenge;
    if (!ch || ch.type !== 'heat') return;
    ch.heat = Math.max(0, ch.heat - dt * 0.00008);
}

export function setDragValue(game, skillId, value) {
    const ch = game.state.minigame[skillId]?.challenge;
    if (!ch || ch.type !== 'drag') return;
    ch.dragValue = Number(value);
}

export function resolveMinigame(game, skillId) {
    const mg = game.state.minigame[skillId];
    const ch = mg?.challenge;
    if (!ch) return false;
    if (ch.expiresAt <= game.now) { failMinigame(game, skillId); return false; }   // too late: it can't be won at leisure
    let success = false;
    if (ch.type === 'timing' || ch.type === 'moving-target') {
        const pos = animatedPosition(ch, game.now);
        success = pos >= ch.zoneStart && pos <= ch.zoneStart + ch.zoneWidth;
    } else if (ch.type === 'heat') {
        success = ch.heat >= ch.targetStart && ch.heat <= ch.targetStart + ch.targetWidth;
    } else if (ch.type === 'drag') {
        success = ch.dragValue >= ch.targetStart && ch.dragValue <= ch.targetStart + ch.targetWidth;
    }
    if (success) rewardMinigame(game, skillId); else failMinigame(game, skillId);
    return success;
}

function rewardMinigame(game, skillId) {
    const b = BALANCE.minigame;
    const mg = game.state.minigame[skillId];
    mg.streak = Math.min(5, mg.streak + 1);
    mg.mult = b.speedMult;
    const boostMs = Math.round((b.boostMs + (mg.streak - 1) * b.streakMs) * game.derived.boostDurationMult);
    if (!(mg.boostUntil > game.now)) { mg.gainId = ''; mg.gainQty = 0; mg.gainXp = 0; }   // a fresh boost counts from nothing
    mg.boostUntil = game.now + boostMs;
    mg.challenge = null;
    bumpStat(game, 'minigameWins');
    scheduleNext(game, skillId, game.now);
    log(game, `${minigameConfig(game.state, skillId).icon} Perfect! ${skillId} works ×${mg.mult} as fast for ${Math.round(boostMs / 1000)}s.`, 'minigame');
    game.emit({ type: 'minigameWin', skill: skillId, mult: mg.mult, ms: boostMs });
    game.markDirty();
}

export function failMinigame(game, skillId, { silent = false } = {}) {
    const mg = game.state.minigame[skillId];
    if (!mg) return;
    mg.challenge = null;
    mg.streak = 0;
    scheduleNext(game, skillId, game.now);
    if (!silent) game.emit({ type: 'minigameFail', skill: skillId });
}
