// The world map: the ten zones as pins on one painting (assets/paint/map.webp), opened from the
// zone's name on the battle scene or the Map button under it. A pin shows the zone's boss; tapping
// it puts that zone under the map (its stages, what drops there, its gear) with a way to travel.
// Zones not reached this run stay as silhouettes. The dungeons stand on the same painting as arched
// gates, once the Dungeons tab has opened: the open ones and the next (a silhouette), each with a
// way in.

import { ZONES, STAGES_PER_ZONE } from '../data/zones.js';
import { RESOURCES } from '../data/resources.js';
import { DUNGEONS, dungeonById, FRAGMENTS_PER_UNIQUE, UNIQUES } from '../data/dungeons.js';
import { isUnlocked } from '../data/unlocks.js';
import { dungeonUnlocked, ownsUnique } from '../systems/dungeon.js';
import { seen } from '../systems/disclosure.js';
import { BESTIARY, KILL_STARS, starsFor } from '../data/bestiary.js';
import { sprite, resIcon, heroSprite } from './sprites.js';
import { dungeonVerdict } from './render.js';
import { escapeHtml as esc } from './format.js';

// Where each zone sits on the painting, in % of its width and height (set by eye from the picture;
// tools/paint.py --sheet shows it). Change these when the map is painted again.
export const ZONE_PINS = {
    meadow: [10, 53], forest: [25, 27], caves: [30, 63], marsh: [42, 77], highland: [47, 41],
    ruins: [60, 77], volcano: [67, 47], frost: [84, 71], skyreach: [79, 35], abyss: [91, 29]
};

// And each dungeon's gate, by its home on the painting: the Warren in the deep woods, the Depths in
// the crystal mountain, the Stronghold on the storm tower, the Lair in the volcano's mouth, the
// Citadel at the edge of the rift, the Maw in the rift's eye.
export const DUNGEON_PINS = {
    goblin_warren: [37, 21], crystal_depths: [37, 47], orc_stronghold: [51, 23], dragons_lair: [66, 26], void_citadel: [83, 9],
    abyssal_maw: [93, 13]   // the rift holds three pins (with the Abyss's): spaced so none covers another, on a phone too
};

/**
 * The road through the zones, in order, as a smooth path (Catmull-Rom through the pins, in % of the
 * painting), inked: dashes as far as this run has reached, dots beyond.
 */
function routeSvg(state) {
    const points = ZONES.map(z => ZONE_PINS[z.id] || [50, 50]);
    const reached = ZONES.reduce((n, z, i) => (i * STAGES_PER_ZONE + 1 <= state.combat.maxStage ? i : n), 0);
    const seg = (a, b) => {   // the curve from point a to point b, shaped by their neighbours
        const p0 = points[Math.max(0, a - 1)], p1 = points[a], p2 = points[b], p3 = points[Math.min(points.length - 1, b + 1)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        return `C${c1.map(v => v.toFixed(2)).join(' ')} ${c2.map(v => v.toFixed(2)).join(' ')} ${p2.join(' ')}`;
    };
    const path = (from, to) => (to > from ? `M${points[from].join(' ')}${Array.from({ length: to - from }, (_, k) => seg(from + k, from + k + 1)).join('')}` : '');
    return `<svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="route-ahead" d="${path(reached, points.length - 1)}"/>
        <path class="route-done" d="${path(0, reached)}"/>
    </svg>`;
}

/** What the player can do with zone `index` right now. */
function zoneView(state, index) {
    const c = state.combat;
    const zone = ZONES[index];
    const here = Math.floor((c.stage - 1) / STAGES_PER_ZONE);
    const abyss = index === ZONES.length - 1;
    const first = index * STAGES_PER_ZONE + 1;
    const last = first + STAGES_PER_ZONE - 1;
    // in a dungeon or before the Titan, the hero is not on the ladder
    const current = c.mode === 'stages' && (abyss ? here >= index : here === index);
    const open = first <= c.maxStage;
    const cleared = !abyss && c.maxStage > last;
    // The Abyss goes on forever: travelling there means its deepest depth reached this run.
    const target = abyss && open ? Math.floor((c.maxStage - 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE + 1 : first;
    const range = abyss ? (here > index ? `depth ${here - index}` : `${first}+`) : `${first}–${last}`;
    return { zone, first, last, abyss, current, open, cleared, target, range };
}

/** The dungeons on the map: the open ones and the next to open (a ladder shows its next rung). */
function mapDungeons(state) {
    if (!isUnlocked(state, 'dungeons')) return [];
    const next = DUNGEONS.find(d => !dungeonUnlocked(state, d));
    return DUNGEONS.filter(d => dungeonUnlocked(state, d) || d === next);
}

const inDungeon = (state, id) => state.combat.mode === 'dungeon' && state.combat.dungeon?.id === id;

/** A place's bestiary stars, as a pill (once the Hall is open): earned of all there are to earn. */
function starsPill(state, id) {
    const group = BESTIARY.find(g => g.id === id);
    if (!group || !isUnlocked(state, 'achievements')) return '';
    const kills = state.stats.killsByMonster || {};
    const earned = group.monsters.reduce((sum, m) => sum + starsFor(kills[m.name] || 0), 0);
    return `<span class="map-stars" title="Bestiary stars here: one for 10, 100 and 1,000 of each kind">★ ${earned}/${group.monsters.length * KILL_STARS.length}</span>`;
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
            <b class="zone-card-name">${esc(v.zone.name)}${v.open ? starsPill(state, v.zone.id) : ''}</b>
            <span class="muted small">Stages ${v.range}${v.open ? ` · ruled by the ${esc(v.zone.boss)}` : ''}</span>
            ${v.open ? `<span class="zone-facts"><span class="muted small">Drops</span>${loot}${seen(state, 'gear') ? `<span class="muted small">· gear tier <b>${v.zone.gearTier}</b></span>` : ''}</span>` : ''}
        </div>
        ${action}
    </div>`;
}

/** A dungeon under the map: its boss, how a run would go, the unique's fragments, and the way in. */
export function renderDungeonInfo(game, id) {
    const state = game.state;
    const d = dungeonById(id);
    if (!d) return '';
    const open = dungeonUnlocked(state, d);
    const record = state.dungeons[d.id] || { fragments: 0 };
    const unique = UNIQUES[d.unique];
    const verdict = open ? dungeonVerdict(game, d) : null;
    const action = inDungeon(state, d.id) ? '<span class="status-pill fighting">You are here</span>'
        : open ? `<button class="prestige-btn war" onclick="FI.mapDungeon('${d.id}')">Enter</button>`
        : `<span class="muted small">Opens at stage ${d.unlockStage}</span>`;
    return `<div class="zone-card">
        <span class="dungeon-gate${open ? '' : ' locked'}">${sprite(`mon/${d.boss.name}`, { scale: 1.5, cls: open ? '' : 'silhouette', fallback: esc(d.icon) })}</span>
        <div class="zone-card-text">
            <b class="zone-card-name">${esc(d.name)}${open ? starsPill(state, d.id) : ''}</b>
            <span class="muted small">${d.monsters.length} elites, then the ${esc(d.boss.name)}</span>
            ${open ? `<span class="small ${verdict.cls}">${verdict.text}</span>
            <span class="frag-row" title="${record.fragments} of ${FRAGMENTS_PER_UNIQUE} fragments of ${esc(unique.name)}">${sprite(`uniq/${unique.id}`, { scale: 0.75, cls: `soft${ownsUnique(state, d.unique) ? '' : ' silhouette'}`, fallback: '🌟' })}
                <span class="frag-bar"><i style="--p:${Math.min(100, record.fragments / FRAGMENTS_PER_UNIQUE * 100).toFixed(1)}%"></i></span><span class="small">${record.fragments}/${FRAGMENTS_PER_UNIQUE}</span></span>` : ''}
        </div>
        ${action}
    </div>`;
}

export function renderWorldMapModal(game) {
    const state = game.state;
    const c = state.combat;
    const here = Math.min(ZONES.length - 1, Math.floor((c.stage - 1) / STAGES_PER_ZONE));
    // what the map opens on: the dungeon the hero is in, else his zone
    const picked = c.mode === 'dungeon' && dungeonById(c.dungeon?.id) ? c.dungeon.id : here;
    const pins = ZONES.map((zone, i) => {
        const v = zoneView(state, i);
        const [x, y] = ZONE_PINS[zone.id] || [50, 50];
        const cls = v.current ? 'here' : v.cleared ? 'done' : v.open ? 'open' : 'locked';
        const label = `${zone.name}, stages ${v.range}${v.current ? ', you are here' : v.open ? '' : ', not reached this run'}`;
        return `<button type="button" class="map-pin ${cls}${i === picked ? ' picked' : ''}" data-pick="${i}" style="left:${x}%;top:${y}%" onclick="FI.mapSelect(${i})" aria-label="${esc(label)}" title="${esc(zone.name)}">
            <span class="zone-emblem">${sprite(`mon/${zone.boss}`, { scale: 1, cls: v.open ? '' : 'silhouette', fallback: '⚔️' })}</span>
            <span class="map-pin-name">${esc(zone.name)}</span>
        </button>`;
    });
    const gates = mapDungeons(state).map(d => {
        const [x, y] = DUNGEON_PINS[d.id] || [50, 50];
        const open = dungeonUnlocked(state, d);
        const current = inDungeon(state, d.id);
        const cls = current ? 'here' : open ? 'open' : 'locked';
        const label = `${d.name}, a dungeon${current ? ', you are here' : open ? '' : `, opens at stage ${d.unlockStage}`}`;
        return `<button type="button" class="map-pin gate ${cls}${d.id === picked ? ' picked' : ''}" data-pick="${d.id}" style="left:${x}%;top:${y}%" onclick="FI.mapSelect('${d.id}')" aria-label="${esc(label)}" title="${esc(d.name)}">
            <span class="dungeon-gate">${sprite(`mon/${d.boss.name}`, { scale: 1, cls: open ? '' : 'silhouette', fallback: esc(d.icon) })}</span>
            <span class="map-pin-name">${esc(d.name)}</span>
        </button>`;
    });
    const info = typeof picked === 'string' ? renderDungeonInfo(game, picked) : renderZoneInfo(game, picked);
    // the hero himself stands beside the pin of where he is (nowhere, while he faces the Titan)
    const spot = c.mode === 'dungeon' ? DUNGEON_PINS[c.dungeon?.id] : c.mode === 'stages' ? ZONE_PINS[ZONES[here].id] : null;
    const hero = spot ? `<span class="map-hero" style="left:${spot[0]}%;top:${spot[1]}%" aria-hidden="true">${heroSprite(state, { scale: 1 })}</span>` : '';
    return `<div class="modal-content map-modal">
        <div class="modal-header">The world</div>
        <div class="map-board" role="group" aria-label="World map">${routeSvg(state)}${pins.join('')}${gates.join('')}${hero}</div>
        <div class="map-info" aria-live="polite">${info}</div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" data-autofocus onclick="FI.closeModal()">Close</button></div>
    </div>`;
}
