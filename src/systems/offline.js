// Offline progress: replay the active action (or combat) for the time away, up to the cap.
// Uses the same code paths as online play so food, materials and deaths behave identically.

import { resolveAction, completeAction, canComplete, intervalFor } from './skilling.js';
import { tickCombat } from './combat.js';
import { tickAutoPrestige } from './prestige.js';
import { masteryLevel } from './mastery.js';
import { isFocused, bonfireLit } from '../core/modifiers.js';
import { RESOURCES } from '../data/resources.js';
import { SKILLS } from '../data/skills.js';
import { levelForXp } from '../core/xp.js';
import { DUNGEONS } from '../data/dungeons.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { checkAchievements } from './progress.js';
import { expireMinigames } from './minigame.js';
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
        salvaged: state.stats.itemsSalvaged || 0,
        deaths: state.stats.deaths,
        dungeons: Object.fromEntries(DUNGEONS.map(d => [d.id, { ...state.dungeons[d.id] }])),
        pets: { ...state.pets },
        uniques: state.stats.uniquesFound || 0,
        prestiges: state.prestige.count,
        tokens: state.prestige.tokens,
        gilded: state.stats.gildedKills || 0,
        stars: state.stats.bestiaryStars || 0,
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
        salvaged: (state.stats.itemsSalvaged || 0) - before.salvaged, // auto-salvages count here too
        died: state.stats.deaths > before.deaths,
        deaths: state.stats.deaths - before.deaths,
        dungeonClears: DUNGEONS.map(d => ({ id: d.id, name: d.name, clears: state.dungeons[d.id].clears - before.dungeons[d.id].clears, fragments: state.dungeons[d.id].fragments - before.dungeons[d.id].fragments }))
            .filter(d => d.clears > 0),
        pets: PETS.filter(p => state.pets[p.id] && !before.pets[p.id]).map(p => `${p.icon} ${p.name}`),
        petIds: PETS.filter(p => state.pets[p.id] && !before.pets[p.id]).map(p => p.id),
        uniques: (state.stats.uniquesFound || 0) - before.uniques,
        prestiges: state.prestige.count - before.prestiges,   // by the auto-prestige
        tokens: state.prestige.tokens - before.tokens,
        gilded: (state.stats.gildedKills || 0) - before.gilded,        // gilded monsters defeated
        stars: (state.stats.bestiaryStars || 0) - before.stars,        // bestiary stars earned
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
    const medalsBefore = new Set(Object.keys(state.achievements || {}).filter(id => state.achievements[id]));

    let def = resolveAction(state);
    let mastery = null;
    if (def) {
        mode = 'skill';
        if (def.mastery) mastery = { name: def.label, from: def.mastery.level };
        // Replay on the clock: each action happens when it would have, so the bonfire burns out, Focus
        // starts and a weekend event begins or ends at the right moment (and tokens land on the right day).
        const savedNow = game.now;
        game.now = now - simulated;
        game.recompute();
        let interval = intervalFor(def, game.derived);
        let remaining = simulated + (state.action?.progress || 0);   // the action under way when the game left off goes on
        let guard = 0;
        while (remaining >= interval && guard++ < 200000) {
            if (!canComplete(state, def).ok) { stalledReason = `ran out of materials for ${def.label}`; break; }
            game.now += interval;
            if (!completeAction(game, def, { offline: true })) break;
            remaining -= interval;
            if (!state.action) { stalledReason = 'the tool was finished'; break; } // one-off actions (tools)
            expireMinigames(game);    // a mini-game boost lasts its own time, not the whole absence
            checkAchievements(game);  // and a medal earned on the way counts from then on, as it would online
            // A mastery level, Focus, the bonfire or an event changing makes the next action different;
            // so does anything that marked the game dirty (a level-up, say 99 with its cape, or a pet).
            const stale = game.dirty || (def.mastery && masteryLevel(state, def.skill, def.mastery.key) !== def.mastery.level)
                || isFocused(state, game.now) !== game.derived.focused || bonfireLit(state, game.now) !== game.derived.bonfire
                || game.eventId(game.now) !== game.derived.event;
            if (stale) { game.recompute(); def = resolveAction(state); interval = intervalFor(def, game.derived); }
        }
        game.now = savedNow;
        game.recompute();
        // What was left over is progress toward the next action, as it would be online.
        if (state.action) state.action.progress = !stalledReason && remaining < interval ? Math.max(0, remaining) : 0;
        if (mastery) mastery.to = masteryLevel(state, def.skill, def.mastery.key);
    } else if (state.combat.active || state.combat.recovering) {
        mode = 'combat';
        // Replay in 1 s steps: tickCombat resolves every attack inside a step in time order, so bigger
        // steps give the same fight with a tenth of the work. A fall is not the end: the hero rests to
        // full health and fights on (combat stops only if something else ends it).
        const step = 1000;
        let remaining = simulated;
        const savedNow = game.now;
        game.now = now - simulated;
        while (remaining > 0 && (state.combat.active || state.combat.recovering)) {
            const dt = Math.min(step, remaining);
            tickCombat(game, dt);
            remaining -= dt;
            game.now += dt;
            tickAutoPrestige(game);   // a stalled run is prestiged while away too, if the switch is on
            checkAchievements(game);  // a medal earned on the way counts from then on
            if (game.dirty) game.recompute(); // level-ups, medals and potion charges take effect mid-replay
        }
        game.now = savedNow;
        if (!state.combat.active && !state.combat.recovering) stalledReason = 'combat stopped';
    }
    game.silent = wasSilent;
    // Medals earned while away took effect as they came; their cards show now.
    for (const ach of ACHIEVEMENTS) {
        if (state.achievements?.[ach.id] && !medalsBefore.has(ach.id)) game.emit({ type: 'achievement', id: ach.id, name: ach.name, reward: ach.reward, secret: !!ach.secret });
    }

    const summary = { elapsed, simulated, capped: elapsed > cap, mode, stalledReason, ...diff(before, state) };
    if (mastery && mastery.to > mastery.from) summary.mastery = mastery;
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
    if (summary.mode === 'rest') lines.push('Your hero rested at camp the whole time: nothing was under way when you left.');
    if (summary.mode === 'skill') lines.push(summary.stalledReason ? `Work stopped early: ${summary.stalledReason}.` : 'Your hero kept working the whole time.');
    if (summary.mode === 'combat') {
        const fell = summary.deaths ? ` — ${summary.startedInDungeon ? 'a dungeon run failed, ' : ''}you fell ${summary.deaths === 1 ? 'once' : `${summary.deaths} times`} and got up again` : '';
        lines.push(`${summary.kills.toLocaleString()} monsters defeated${summary.stages > 0 && !summary.prestiges ? `, ${summary.stages} stage${summary.stages === 1 ? '' : 's'} gained` : ''}${fell}.`);
        if (summary.prestiges > 0) lines.push(`✨ Your hero prestiged ${summary.prestiges === 1 ? 'once' : `${summary.prestiges} times`} on his own: +${summary.tokens.toLocaleString()} tokens.`);
        for (const d of summary.dungeonClears || []) lines.push(`${d.clears.toLocaleString()} ${d.name} clear${d.clears > 1 ? 's' : ''} (+${d.fragments} fragment${d.fragments === 1 ? '' : 's'})`);
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
    if (summary.items > 0) lines.push(`+${summary.items} ${summary.items === 1 ? 'item' : 'items'} ${summary.mode === 'combat' ? 'found' : 'made'}${summary.salvaged > 0 ? ` (${summary.salvaged} more salvaged)` : ''}`);
    else if (summary.salvaged > 0) lines.push(`${summary.salvaged} item${summary.salvaged === 1 ? '' : 's'} salvaged for essence and bars`);
    for (const [id, s] of Object.entries(summary.skills)) {
        lines.push(`+${s.xp.toLocaleString()} ${SKILLS[id]?.name || id} XP${s.to > s.from ? ` (level ${s.from} → ${s.to})` : ''}`);
    }
    if (summary.mastery) lines.push(`${summary.mastery.name} mastery ${summary.mastery.from} → ${summary.mastery.to}`);
    return lines;
}
