// Offline progress: replay the active action (or combat) for the time away, up to the cap.
// Uses the same code paths as online play so food, materials and deaths behave identically.

import { resolveAction, completeAction, canComplete } from './skilling.js';
import { tickCombat } from './combat.js';
import { actionInterval } from '../core/modifiers.js';
import { RESOURCES } from '../data/resources.js';
import { SKILLS } from '../data/skills.js';
import { levelForXp } from '../core/xp.js';

export const OFFLINE_MIN_MS = 60 * 1000;

function snapshot(state) {
    return {
        resources: { ...state.resources },
        gold: state.gold,
        skills: Object.fromEntries(Object.entries(state.skills).map(([k, v]) => [k, v.xp])),
        stage: state.combat.stage,
        kills: state.stats.kills,
        items: state.inventory.length,
        deaths: state.stats.deaths
    };
}

function diff(before, state) {
    const resources = {};
    for (const id of Object.keys(state.resources)) {
        const delta = state.resources[id] - before.resources[id];
        if (delta !== 0) resources[id] = delta;
    }
    const skills = {};
    for (const [id, xp] of Object.entries(before.skills)) {
        const delta = state.skills[id].xp - xp;
        if (delta > 0) skills[id] = { xp: Math.round(delta), from: levelForXp(xp), to: levelForXp(state.skills[id].xp) };
    }
    return {
        resources, skills,
        gold: state.gold - before.gold,
        stages: state.combat.stage - before.stage,
        kills: state.stats.kills - before.kills,
        items: state.inventory.length - before.items,
        died: state.stats.deaths > before.deaths
    };
}

/**
 * Apply progress for the time between the last save and now.
 * Returns a summary for the "welcome back" modal, or null if under a minute passed.
 */
export function applyOffline(game, now, { minMs = OFFLINE_MIN_MS } = {}) {
    const state = game.state;
    const elapsed = now - (state.meta.savedAt || now);
    if (elapsed < minMs) return null;
    const cap = game.derived.offlineMs;
    const simulated = Math.min(elapsed, cap);
    const before = snapshot(state);
    let mode = 'rest';
    let stalledReason = null;

    const def = resolveAction(state);
    if (def) {
        mode = 'skill';
        const interval = actionInterval(def.interval, game.derived, def.skill);
        let remaining = simulated;
        let guard = 0;
        while (remaining >= interval && guard++ < 200000) {
            if (!canComplete(state, def).ok) { stalledReason = `ran out of materials for ${def.label}`; break; }
            if (!completeAction(game, def, { offline: true })) break;
            remaining -= interval;
            if (!state.action) break; // one-off actions (tools)
        }
        if (state.action) state.action.progress = 0;
    } else if (state.combat.active) {
        mode = 'combat';
        // Replay in 100 ms steps; combat stops on its own if the player dies.
        const step = 100;
        let remaining = simulated;
        const savedNow = game.now;
        game.now = now - simulated;
        while (remaining > 0 && state.combat.active) {
            tickCombat(game, step);
            remaining -= step;
            game.now += step;
        }
        game.now = savedNow;
        if (!state.combat.active) stalledReason = 'you were defeated and retreated';
    }

    const summary = { elapsed, simulated, capped: elapsed > cap, mode, stalledReason, ...diff(before, state) };
    game.emit({ type: 'offline', summary });
    return summary;
}

/** Human-readable lines for the offline summary. */
export function describeOffline(summary) {
    const lines = [];
    const mins = Math.floor(summary.simulated / 60000);
    const hours = Math.floor(mins / 60);
    lines.push(`You were away for ${hours ? `${hours}h ${mins % 60}m` : `${mins}m`}${summary.capped ? ' (offline progress is capped — Endurance perks extend it)' : ''}.`);
    if (summary.mode === 'rest') lines.push('Your hero rested at camp. Start a skill or enter combat before leaving to keep progressing.');
    if (summary.mode === 'skill') lines.push(summary.stalledReason ? `Work stopped early: ${summary.stalledReason}.` : 'Your hero kept working the whole time.');
    if (summary.mode === 'combat') lines.push(`${summary.kills} monsters defeated${summary.stages > 0 ? `, ${summary.stages} stages gained` : ''}${summary.died ? ' — then you were defeated and retreated' : ''}.`);
    for (const [id, delta] of Object.entries(summary.resources)) {
        if (delta > 0) lines.push(`+${delta.toLocaleString()} ${RESOURCES[id]?.name || id}`);
    }
    for (const [id, delta] of Object.entries(summary.resources)) {
        if (delta < 0) lines.push(`−${(-delta).toLocaleString()} ${RESOURCES[id]?.name || id} used`);
    }
    if (summary.gold > 0) lines.push(`+${summary.gold.toLocaleString()} gold`);
    if (summary.items > 0) lines.push(`+${summary.items} items made`);
    for (const [id, s] of Object.entries(summary.skills)) {
        lines.push(`+${s.xp.toLocaleString()} ${SKILLS[id]?.name || id} XP${s.to > s.from ? ` (level ${s.from} → ${s.to})` : ''}`);
    }
    return lines;
}
