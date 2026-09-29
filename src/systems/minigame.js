// Skill mini-games as timed opportunities: while you train a skill, a chance to play appears
// every few minutes; success grants a large speed boost for a while. Cadence-limited so that
// a fully active player earns roughly 1.5x an idle one, not 2x forever (see research notes).

import { NON_COMBAT_SKILLS } from '../data/skills.js';
import { BALANCE } from '../core/formulas.js';
import { rng } from '../core/rng.js';
import { bumpStat, log } from './progress.js';

export const MINIGAME_CONFIG = {
    mining:      { icon: '⛏️', label: 'Ore Vein Pulse', desc: 'Tap while the pulse sweeps through the ore seam.', type: 'timing', accent: '#34d399', actionText: 'Pulse the Vein' },
    woodcutting: { icon: '🌳', label: 'Perfect Chop',   desc: 'Catch the axe rhythm at the heartwood ring.',     type: 'timing', accent: '#22c55e', actionText: 'Catch the Rhythm' },
    hunting:     { icon: '🏹', label: 'Snap Shot',      desc: 'Fire when the prey crosses the kill zone.',       type: 'moving-target', accent: '#f59e0b', actionText: 'Loose an Arrow' },
    cooking:     { icon: '🍳', label: 'Heat Ride',      desc: 'Tap the flame to keep the pan in the perfect band.', type: 'heat', accent: '#fb923c', actionText: 'Ride the Heat' },
    alchemy:     { icon: '🧪', label: 'Catalyst Drag',  desc: 'Drag the stabiliser into the glowing channel.',   type: 'drag', accent: '#10b981', actionText: 'Stabilise the Mix' },
    fishing:     { icon: '🎣', label: 'Strike!',        desc: 'Strike when the float dips into the ring.',       type: 'moving-target', accent: '#38bdf8', actionText: 'Strike' },
    firemaking:  { icon: '🔥', label: 'Stoke the Fire', desc: 'Tap to keep the flame in the perfect band.',      type: 'heat', accent: '#f97316', actionText: 'Stoke' }
};

function scheduleNext(mg, now) {
    const [min, max] = BALANCE.minigame.opportunityEveryMs;
    mg.nextOpportunityAt = now + rng.int(min, max);
    mg.opportunityUntil = 0;
}

/** Called each tick for the skill currently being trained. */
export function tickMinigame(game, skillId) {
    if (!NON_COMBAT_SKILLS.includes(skillId)) return;
    const mg = game.state.minigame[skillId];
    const now = game.now;
    if (mg.boostUntil && mg.boostUntil <= now) { mg.boostUntil = 0; mg.bonus = 0; game.markDirty(); }
    if (mg.challenge) {
        if (mg.challenge.expiresAt <= now) { failMinigame(game, skillId, { silent: true }); }
        return;
    }
    if (!mg.nextOpportunityAt) { mg.nextOpportunityAt = now + rng.int(45000, 90000); return; } // first chance comes quickly
    if (mg.opportunityUntil && mg.opportunityUntil <= now) { scheduleNext(mg, now); return; }
    if (!mg.opportunityUntil && now >= mg.nextOpportunityAt) {
        mg.opportunityUntil = now + BALANCE.minigame.opportunityWindowMs;
        game.emit({ type: 'minigameReady', skill: skillId });
    }
}

export function hasOpportunity(state, skillId, now) {
    const mg = state.minigame[skillId];
    return !!mg && mg.opportunityUntil > now && !mg.challenge;
}

export function buildChallenge(skillId, now) {
    const conf = MINIGAME_CONFIG[skillId];
    const expiresAt = now + 10000;
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
    mg.bonus = Math.min(b.maxBonus, b.baseBonus + (mg.streak - 1) * b.streakBonus);
    mg.boostUntil = game.now + Math.round(b.boostMs * game.derived.boostDurationMult);
    mg.challenge = null;
    bumpStat(game, 'minigameWins');
    scheduleNext(mg, game.now);
    log(game, `${MINIGAME_CONFIG[skillId].icon} Perfect! +${Math.round(mg.bonus * 100)}% ${skillId} speed for ${Math.round(b.boostMs / 1000)}s.`, 'minigame');
    game.emit({ type: 'minigameWin', skill: skillId, bonus: mg.bonus });
    game.markDirty();
}

export function failMinigame(game, skillId, { silent = false } = {}) {
    const mg = game.state.minigame[skillId];
    if (!mg) return;
    mg.challenge = null;
    mg.streak = 0;
    scheduleNext(mg, game.now);
    if (!silent) game.emit({ type: 'minigameFail', skill: skillId });
}
