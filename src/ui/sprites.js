// Sprites from the atlas (assets/sprites.png, see tools/atlas.py): which cell stands for a monster,
// an item or a layer of the hero. Everything draws as a 32x32 cell scaled up crisp (CSS .spr).

import { ATLAS, SPRITES } from '../data/sprites.js';
import { TITAN_NAMES } from '../data/dungeons.js';
import { RESOURCES } from '../data/resources.js';
import { TOOLS } from '../data/workshop.js';
import { rankFor } from '../data/ranks.js';
import { escapeHtml as esc } from './format.js';

const TIERS = 7;
const clampTier = tier => Math.max(1, Math.min(TIERS, Math.round(Number(tier) || 1)));

export function hasSprite(key) {
    return Object.hasOwn(SPRITES, key);
}

/** The inline style that shows cell `key`; null when the atlas has no such sprite. */
export function spriteStyle(key) {
    const cell = SPRITES[key];
    if (!cell) return null;
    return `--sx:${cell[0]};--sy:${cell[1]}`;
}

/** An element showing sprite `key` at `scale` (integer, crisp), or `fallback` HTML (an emoji) when unknown. */
export function sprite(key, { scale = 2, cls = '', fallback = '', title = '' } = {}) {
    const style = spriteStyle(key);
    if (!style) return fallback ? `<span class="sp-fallback ${cls}" style="--k:${scale}" ${title ? `title="${esc(title)}"` : ''}>${fallback}</span>` : '';
    return `<i class="spr ${cls}" style="${style};--k:${scale}" ${title ? `title="${esc(title)}"` : ''} aria-hidden="true"></i>`;
}

/**
 * A resource's icon (tools/resource_art.py): inline beside text by default (20px), bigger in a
 * medallion. Below 1x it is scaled smooth rather than crisp; the emoji stands in if the cell is missing.
 */
export function resIcon(id, { scale = 0.625, cls = '', title = '' } = {}) {
    const classes = ['res-spr', scale < 1 ? 'soft' : '', cls].filter(Boolean).join(' ');
    return sprite(`res/${id}`, { scale, cls: classes, fallback: esc(RESOURCES[id]?.icon || '📦'), title });
}

/** A tool's icon (pickaxe, axe, bow, rod, tinderbox, hoe), sized like resIcon. */
export function toolIcon(id, { scale = 0.625, cls = '' } = {}) {
    const classes = ['res-spr', scale < 1 ? 'soft' : '', cls].filter(Boolean).join(' ');
    return sprite(`tool/${id}`, { scale, cls: classes, fallback: esc(TOOLS[id]?.icon || '🛠️') });
}

export function monsterSpriteKey(enemy) {
    if (!enemy) return null;
    if (enemy.titan) {
        const face = TITAN_NAMES.indexOf(String(enemy.baseName || enemy.name).replace(/^Titan of /, '').replace(/ \d+$/, ''));
        return `titan/${((face < 0 ? 0 : face) % 5)}`;
    }
    const key = `mon/${enemy.baseName || String(enemy.name).replace(' (Boss)', '')}`;
    return hasSprite(key) ? key : null;
}

export function itemSpriteKey(item) {
    if (!item) return null;
    if (item.uniqueId && hasSprite(`uniq/${item.uniqueId}`)) return `uniq/${item.uniqueId}`;
    const key = `item/${item.type}/${clampTier(item.tier)}`;
    return hasSprite(key) ? key : null;
}

/** Sprite for an equipment type with nothing in it (the empty slot's ghost): the tier-1 piece. */
export function slotSpriteKey(type) {
    const key = `item/${type}/1`;
    return hasSprite(key) ? key : null;
}

/**
 * The hero, as atlas keys from the back layer to the front, dressed in what is equipped; his cloak
 * is his rank's colour (data/ranks.js).
 * `tool` (a skill id) puts that skill's tool in the hand instead of the weapon; `bare` leaves both
 * hands empty (on the agility course).
 */
export function heroLayers(state, { tool = null, bare = false } = {}) {
    const eq = state.equipped || {};
    const tierOf = slot => (eq[slot] ? clampTier(eq[slot].tier) : 0);
    const cloak = `hero/cloaks/${rankFor(state.prestige?.count || 0).cloak}`;
    const layers = [hasSprite(cloak) ? cloak : 'hero/cloak', 'hero/base'];
    const boots = tierOf('Boots');
    if (boots) layers.push(`hero/boots/${boots}`);
    const legs = tierOf('Legs');
    layers.push(legs ? `hero/legs/${legs}` : 'hero/legs_none');
    // a unique worn shows as itself where the atlas has a layer for it (hero/<layer>_unique/<id>)
    const uniq = (slot, layer) => (eq[slot]?.uniqueId && hasSprite(`hero/${layer}_unique/${eq[slot].uniqueId}`) ? `hero/${layer}_unique/${eq[slot].uniqueId}` : null);
    const body = tierOf('Body');
    layers.push(uniq('Body', 'body') || (body ? `hero/body/${body}` : 'hero/body_none'));
    const gloves = tierOf('Gloves');
    if (gloves) layers.push(`hero/gloves/${gloves}`);
    const head = tierOf('Head');
    if (head) layers.push(uniq('Head', 'head') || `hero/head/${head}`); else layers.push('hero/hair');
    if (bare) return layers.filter(hasSprite);
    if (tool && hasSprite(`hero/tool/${tool}`)) layers.push(`hero/tool/${tool}`);
    else if (eq.Weapon) layers.push(eq.Weapon.uniqueId && hasSprite(`hero/weapon_unique/${eq.Weapon.uniqueId}`) ? `hero/weapon_unique/${eq.Weapon.uniqueId}` : `hero/weapon/${clampTier(eq.Weapon.tier)}`);
    if (!tool && eq.Shield) layers.push(uniq('Shield', 'shield') || `hero/shield/${tierOf('Shield')}`);
    return layers.filter(hasSprite);
}

/** The hero drawn from his layers, at `scale`. */
export function heroSprite(state, { scale = 3, tool = null, bare = false, cls = '' } = {}) {
    return `<span class="hero-doll ${cls}" style="--k:${scale}" aria-hidden="true">${heroLayers(state, { tool, bare }).map(key => `<i class="spr" style="${spriteStyle(key)}"></i>`).join('')}</span>`;
}

export { ATLAS };
