// Coming back to the game (DESIGN §3.16): the bar the time away is replayed behind (main.js catchUp), the hero at
// its top as on the welcome-back report that takes its place, and the report's strip of what the world did meanwhile
// (systems/reentry.js). Presentation only: main.js puts them on the page.

import { fmt, escapeHtml as esc, duration } from './format.js';
import { sprite, resIcon, heroSprite, glyph } from './sprites.js';
import { FEATURES, EVENT_ART, paintStyle } from './features.js';
import { resolveAction } from '../systems/skilling.js';
import { levelForXp } from '../core/xp.js';
import { SKILLS } from '../data/skills.js';

/** Hours and minutes, as the welcome-back report writes the time away ("6h 10m", "40m"). */
const hm = ms => {
    const mins = Math.floor(Math.max(0, ms) / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

/**
 * The catch-up's dialog: the hero, a bar of the time away replayed and, beside it, what climbs as it fills
 * (paintCatchUp keeps it current). `waiting`: the save is still on its way from the server.
 */
export function renderCatchUp(state, { waiting = false } = {}) {
    return `<div class="modal-content catch-up painted" style="${paintStyle('guildhall', 'center 45%')}">
        <div class="wb-hero" aria-hidden="true">${heroSprite(state, { scale: 2 })}</div>
        <div class="modal-header">Catching up</div>
        <div class="cu-bar${waiting ? ' waiting' : ''}" role="progressbar" aria-label="Time away replayed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
        <p class="cu-facts"></p>
        <p class="cu-time">${waiting ? 'Loading your save' : ''}</p>
    </div>`;
}

/**
 * Bring the dialog (`box`, holding renderCatchUp's) up to where the replay stands (`where`: systems/offline.js
 * offlineReplay's { from, to, at, mode }): the bar's share, the stage and gold in a fight, the skill's level and
 * what it makes at work, and the time replayed of the time counted.
 */
export function paintCatchUp(box, state, where) {
    const bar = box.querySelector('.cu-bar');
    if (!bar || !where) return;
    const share = Math.max(0, Math.min(1, (where.at - where.from) / Math.max(1, where.to - where.from)));
    bar.classList.remove('waiting');
    bar.style.setProperty('--p', `${(share * 100).toFixed(1)}%`);
    bar.setAttribute('aria-valuenow', String(Math.round(share * 100)));
    let facts = '';
    if (where.mode === 'combat') {
        facts = `<span>${sprite(FEATURES.combat.icon, { scale: 0.75, cls: 'soft' })}Stage <b>${fmt(state.combat.maxStage)}</b></span>`
            + `<span>${sprite('gold', { scale: 0.75, cls: 'soft' })}<b>${fmt(state.gold)}</b></span>`;
    } else if (where.mode === 'skill') {
        const def = resolveAction(state);
        if (def) {
            facts = `<span>${sprite(FEATURES[def.skill]?.icon || '', { scale: 0.75, cls: 'soft' })}Lv <b>${levelForXp(state.skills[def.skill]?.xp || 0)}</b></span>`
                + (def.output ? `<span>${resIcon(def.output, { scale: 1 })}<b>${fmt(state.resources[def.output] || 0)}</b></span>` : '');
        }
    }
    const factsEl = box.querySelector('.cu-facts');
    if (factsEl && factsEl.__html !== facts) { factsEl.innerHTML = facts; factsEl.__html = facts; }
    const time = box.querySelector('.cu-time');
    if (time) time.textContent = `${hm(where.at - where.from)} of ${hm(where.to - where.from)}`;
}

const small = key => sprite(key, { scale: 0.75, cls: 'soft' });
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

/** A line of the strip: art first, the fact in a few words; the clan's and the event's go to their tab. */
function reentryLine(fact, now) {
    const tap = (tab, body) => `<button class="wb-world-line" onclick="FI.collectOffline(); FI.switchTab('${tab}')">${body}</button>`;
    switch (fact.kind) {
        case 'changes':
            return `<p class="wb-world-line">${glyph('spark', { scale: 0.75 })}<span>New in this version: ${fact.lines.map(esc).join('; ')}</span></p>`;
        case 'clan':
            return tap('clan', `${small(FEATURES.clan.icon)}<span>${fact.kills > 0
                ? `Your clan felled <b>${fact.kills} of ${fact.levels}</b> levels of this week's boss: its banner <b>×${fact.mult}</b>`
                : `Your clan has felled no level of this week's boss yet`}</span>`);
        case 'event': {
            const won = fact.tokens > 0 ? `: <b>+${plural(fact.tokens, 'Festival Token')}</b>` : '';
            return tap('events', `${sprite(EVENT_ART[fact.id] || 'res/starfruit', { scale: 0.75, cls: 'soft' })}<span>${fact.running
                ? `<b>${esc(fact.name)}</b> runs for ${duration(fact.endsAt - now)} more${won ? `${won} while away` : ''}`
                : `<b>${esc(fact.name)}</b> ran while you were away${won}`}</span>`);
        }
        case 'trial':
            return `<p class="wb-world-line">${small(fact.icon)}<span>This week's Trial, <b>${esc(fact.name)}</b>: ${fact.won
                ? `its laurel${fact.of > 1 ? 's' : ''} won`
                : `its laurel at stage <b>${fmt(fact.target)}</b>${fact.laurels > 0 ? ` (${fact.laurels} of ${fact.of} won)` : ''}`}</span></p>`;
        default: return '';
    }
}

/**
 * The welcome-back report's strip under its haul (systems/reentry.js reentryFacts): a line for each fact; with none, and
 * nothing ready on the report either (`ready`: its taps), one line says nothing waits. '' when the report has no strip.
 */
export function renderReentry(facts, { ready = 0, now = 0 } = {}) {
    if (!facts) return '';
    const lines = facts.map(fact => reentryLine(fact, now)).filter(Boolean);
    if (!lines.length && ready > 0) return '';
    return `<div class="wb-world">${lines.length ? lines.join('') : `<p class="wb-world-line none">Nothing is waiting for you</p>`}</div>`;
}

/** A hidden tab's catch-up told in a toast (main.js showHeldGap): the time it replayed and what came of it, in a few words. */
export function backgroundLine(summary) {
    const what = summary.mode === 'combat'
        ? [summary.kills ? plural(summary.kills, 'monster') : '', summary.prestiges ? (summary.prestiges === 1 ? 'a prestige' : `${fmt(summary.prestiges)} prestiges`) : '']
        : Object.entries(summary.skills || {}).filter(([id]) => id !== 'combat').map(([id, s]) => `+${fmt(s.xp)} ${SKILLS[id]?.name || id} XP`);
    const told = what.filter(Boolean).slice(0, 2).join(', ');
    return `${hm(summary.simulated)} in the background${told ? `: ${told}` : ''}`;
}
