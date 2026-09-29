// Offline progress: replay the active action (or combat) for the time away, up to the cap.
// Uses the same code paths as online play so food, materials and deaths behave identically.

import { resolveAction, completeAction, canComplete } from './skilling.js';
import { tickCombat } from './combat.js';
import { actionInterval } from '../core/modifiers.js';
import { RESOURCES } from '../data/resources.js';
import { SKILLS } from '../data/skills.js';
import { levelForXp } from '../core/xp.js';
import { DUNGEONS } from '../data/dungeons.js';
import { PETS } from '../data/pets.js';

export const OFFLINE_MIN_MS = 60 * 1000;

function snapshot(state) {
    return {
        resources: { ...state.resources },
        gold: state.gold,
        skills: Object.fromEntries(Object.entries(state.skills).map(([k, v]) => [k, v.xp])),
        stage: state.combat.stage,
        kills: state.stats.kills,
        items: state.inventory.length,
        salvaged: (state.stats.itemsSalvaged || 0) + (state.stats.itemsAutoSalvaged || 0),
        deaths: state.stats.deaths,
        dungeons: Object.fromEntries(DUNGEONS.map(d => [d.id, { ...state.dungeons[d.id] }])),
        pets: { ...state.pets },
        uniques: state.stats.uniquesFound || 0,
        combatMode: state.combat.mode
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
        salvaged: (state.stats.itemsSalvaged || 0) + (state.stats.itemsAutoSalvaged || 0) - before.salvaged,
        died: state.stats.deaths > before.deaths,
        dungeonClears: DUNGEONS.map(d => ({ id: d.id, name: d.name, clears: state.dungeons[d.id].clears - before.dungeons[d.id].clears, fragments: state.dungeons[d.id].fragments - before.dungeons[d.id].fragments }))
            .filter(d => d.clears > 0),
        pets: PETS.filter(p => state.pets[p.id] && !before.pets[p.id]).map(p => `${p.icon} ${p.name}`),
        uniques: (state.stats.uniquesFound || 0) - before.uniques,
        startedInDungeon: before.combatMode === 'dungeon'
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
    // Replay silently: hours of per-hit events would only be thrown away; the summary reports instead.
    const wasSilent = game.silent;
    game.silent = true;

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
        // Replay in 1 s steps: tickCombat resolves every attack inside a step in time order, so bigger
        // steps give the same fight with a tenth of the work. Combat stops on its own if the player dies.
        const step = 1000;
        let remaining = simulated;
        const savedNow = game.now;
        game.now = now - simulated;
        while (remaining > 0 && state.combat.active) {
            const dt = Math.min(step, remaining);
            tickCombat(game, dt);
            remaining -= dt;
            game.now += dt;
            if (game.dirty) game.recompute(); // level-ups and potion charges take effect mid-replay
        }
        game.now = savedNow;
        if (!state.combat.active) stalledReason = state.stats.deaths > before.deaths ? 'you were defeated' : 'combat stopped';
    }
    game.silent = wasSilent;

    const summary = { elapsed, simulated, capped: elapsed > cap, mode, stalledReason, ...diff(before, state) };
    summary.plotsReady = (state.farming?.plots || []).filter(p => p.crop && now >= p.readyAt).length;
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
    if (summary.mode === 'combat') {
        const fell = summary.died ? (summary.startedInDungeon ? ' — then a dungeon run failed and you left the fight' : ' — then you were defeated and retreated') : '';
        lines.push(`${summary.kills.toLocaleString()} monsters defeated${summary.stages > 0 ? `, ${summary.stages} stages gained` : ''}${fell}.`);
        for (const d of summary.dungeonClears || []) lines.push(`${d.clears.toLocaleString()} ${d.name} clear${d.clears > 1 ? 's' : ''} (+${d.fragments} fragments)`);
    }
    if (summary.plotsReady) lines.push(`🌾 ${summary.plotsReady} farming plot${summary.plotsReady > 1 ? 's are' : ' is'} ready to harvest.`);
    for (const pet of summary.pets || []) lines.push(`🐾 A pet found you: ${pet}!`);
    if (summary.uniques > 0) lines.push(`🌟 ${summary.uniques} unique item${summary.uniques > 1 ? 's' : ''} found!`);
    for (const [id, delta] of Object.entries(summary.resources)) {
        if (delta > 0) lines.push(`+${delta.toLocaleString()} ${RESOURCES[id]?.name || id}`);
    }
    for (const [id, delta] of Object.entries(summary.resources)) {
        if (delta < 0) lines.push(`−${(-delta).toLocaleString()} ${RESOURCES[id]?.name || id} used`);
    }
    if (summary.gold > 0) lines.push(`+${summary.gold.toLocaleString()} gold`);
    if (summary.items > 0) lines.push(`+${summary.items} ${summary.mode === 'combat' ? 'items found' : 'items made'}${summary.salvaged > 0 ? ` (${summary.salvaged} more salvaged)` : ''}`);
    else if (summary.salvaged > 0) lines.push(`${summary.salvaged} items salvaged for essence and bars`);
    for (const [id, s] of Object.entries(summary.skills)) {
        lines.push(`+${s.xp.toLocaleString()} ${SKILLS[id]?.name || id} XP${s.to > s.from ? ` (level ${s.from} → ${s.to})` : ''}`);
    }
    return lines;
}
