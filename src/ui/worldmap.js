// The world map: the ten zones as pins on one painting (assets/paint/map.webp), opened from the
// zone's name on the battle scene or the Map button under it. A pin shows the zone's boss; tapping
// it puts that zone under the map (its stages, what drops there, its gear) with a way to travel.
// Zones not reached this run stay as silhouettes.

import { ZONES, STAGES_PER_ZONE } from '../data/zones.js';
import { RESOURCES } from '../data/resources.js';
import { seen } from '../systems/disclosure.js';
import { sprite, resIcon } from './sprites.js';
import { escapeHtml as esc } from './format.js';

// Where each zone sits on the painting, in % of its width and height (set by eye from the picture;
// tools/paint.py --sheet shows it). Change these when the map is painted again.
export const ZONE_PINS = {
    meadow: [10, 53], forest: [25, 27], caves: [30, 63], marsh: [42, 77], highland: [47, 41],
    ruins: [60, 77], volcano: [67, 47], frost: [84, 71], skyreach: [79, 35], abyss: [91, 29]
};

/** What the player can do with zone `index` right now. */
function zoneView(state, index) {
    const c = state.combat;
    const zone = ZONES[index];
    const here = Math.floor((c.stage - 1) / STAGES_PER_ZONE);
    const abyss = index === ZONES.length - 1;
    const first = index * STAGES_PER_ZONE + 1;
    const last = first + STAGES_PER_ZONE - 1;
    const current = abyss ? here >= index : here === index;
    const open = first <= c.maxStage;
    const cleared = !abyss && c.maxStage > last;
    // The Abyss goes on forever: travelling there means its deepest depth reached this run.
    const target = abyss && open ? Math.floor((c.maxStage - 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE + 1 : first;
    const range = abyss ? (here > index ? `depth ${here - index}` : `${first}+`) : `${first}–${last}`;
    return { zone, first, last, abyss, current, open, cleared, target, range };
}

/** The zone under the map: who rules it, its stages, its loot, and the way there. */
export function renderZoneInfo(game, index) {
    const state = game.state;
    const v = zoneView(state, index);
    const boss = sprite(`mon/${v.zone.boss}`, { scale: 1.5, cls: v.open ? '' : 'silhouette', fallback: '⚔️' });
    const loot = v.zone.loot.map(l => `<span class="fact" title="${esc(RESOURCES[l.id].name)}">${resIcon(l.id, { scale: 0.75 })}</span>`).join('');
    const action = v.current ? '<span class="status-pill fighting">You are here</span>'
        : v.open ? `<button class="prestige-btn war" onclick="FI.mapTravel(${v.target})">Travel</button>`
        : `<span class="muted small">Beat the boss of stage ${v.first - 1} to get here</span>`;
    return `<div class="zone-card">
        <span class="zone-emblem${v.open ? '' : ' locked'}">${boss}</span>
        <div class="zone-card-text">
            <b class="zone-card-name">${esc(v.zone.name)}</b>
            <span class="muted small">Stages ${v.range}${v.open ? ` · ruled by the ${esc(v.zone.boss)}` : ''}</span>
            ${v.open ? `<span class="zone-facts"><span class="muted small">Drops</span>${loot}${seen(state, 'gear') ? `<span class="muted small">· gear tier <b>${v.zone.gearTier}</b></span>` : ''}</span>` : ''}
        </div>
        ${action}
    </div>`;
}

export function renderWorldMapModal(game) {
    const state = game.state;
    const here = Math.min(ZONES.length - 1, Math.floor((state.combat.stage - 1) / STAGES_PER_ZONE));
    const pins = ZONES.map((zone, i) => {
        const v = zoneView(state, i);
        const [x, y] = ZONE_PINS[zone.id] || [50, 50];
        const cls = v.current ? 'here' : v.cleared ? 'done' : v.open ? 'open' : 'locked';
        const label = `${zone.name}, stages ${v.range}${v.current ? ', you are here' : v.open ? '' : ', not reached this run'}`;
        return `<button type="button" class="map-pin ${cls}${i === here ? ' picked' : ''}" data-zone="${i}" style="left:${x}%;top:${y}%" onclick="FI.mapSelect(${i})" aria-label="${esc(label)}" title="${esc(zone.name)}">
            <span class="zone-emblem">${sprite(`mon/${zone.boss}`, { scale: 1, cls: v.open ? '' : 'silhouette', fallback: '⚔️' })}</span>
            <span class="map-pin-name">${esc(zone.name)}</span>
        </button>`;
    }).join('');
    return `<div class="modal-content map-modal">
        <div class="modal-header">The world</div>
        <div class="map-board" role="group" aria-label="World map">${pins}</div>
        <div class="map-info" aria-live="polite">${renderZoneInfo(game, here)}</div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" data-autofocus onclick="FI.closeModal()">Close</button></div>
    </div>`;
}
