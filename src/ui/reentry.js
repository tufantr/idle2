// Coming back to the game (DESIGN §3.16): the bar the time away is replayed behind (main.js catchUp), the hero at
// its top as on the welcome-back report that takes its place. Presentation only: main.js puts it on the page.

import { fmt } from './format.js';
import { sprite, resIcon, heroSprite } from './sprites.js';
import { FEATURES, paintStyle } from './features.js';
import { resolveAction } from '../systems/skilling.js';
import { levelForXp } from '../core/xp.js';

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
