// The wiki's building blocks: the game's own sprites (src/ui/sprites.js draws them as on screen), numbers
// as the game writes them, tables, infoboxes, callouts and links by the wiki's path conventions. Links are
// written by convention and checked once the whole site is built (wiki/lib/site.mjs checkLinks).

import { sprite, resIcon, toolIcon, heroSprite, spriteStyle, hasSprite } from '../../src/ui/sprites.js';
import { RESOURCES } from '../../src/data/resources.js';
import { slugify } from './md.mjs';

export { sprite, resIcon, toolIcon, heroSprite, spriteStyle, hasSprite, slugify };

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A whole number with separators, or a short form past a million (1.25M, 3.4B). */
export function fmt(n, { short = true } = {}) {
    if (n === null || n === undefined || Number.isNaN(n)) return '–';
    const abs = Math.abs(n);
    if (short && abs >= 1e6) {
        const units = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M']];
        const [div, u] = units.find(([d]) => abs >= d);
        const v = n / div;
        return `${v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/\.?0+$/, '')}${u}`;
    }
    if (!Number.isInteger(n)) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return n.toLocaleString('en-US');
}

/** A share as a percentage: pct(0.035) -> "3.5%". */
export function pct(x, digits = 1) {
    const v = x * 100;
    const s = v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return `${s}%`;
}

/** A duration: 2.5 s, 45 s, 10 min, 1 h 30 min, 2 days. */
export function time(ms) {
    if (!(ms >= 0)) return '–';
    const s = ms / 1000;
    if (s < 60) return `${Number.isInteger(s) ? s : s.toFixed(1).replace(/\.0$/, '')} s`;
    const min = s / 60;
    if (min < 60) return `${Math.round(min * 10) / 10} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min - h * 60);
    if (h < 48) return m ? `${h} h ${m} min` : `${h} h`;
    const d = h / 24;
    return `${Number.isInteger(d) ? d : d.toFixed(1)} days`;
}

/** A sprite, or nothing when the atlas has no such cell (never a broken picture). */
export function icon(key, scale = 1, cls = '') {
    return key && hasSprite(key) ? sprite(key, { scale, cls }) : '';
}

// ---------- paths (the wiki's URL scheme) ----------

export const path = {
    item: id => `/items/${id.replace(/_/g, '-')}`,
    skill: id => `/skills/${id}`,
    monster: name => `/monsters/${slugify(name)}`,
    zone: id => `/zones/${id}`,
    dungeon: id => `/dungeons/${id.replace(/_/g, '-')}`,
    unique: id => `/uniques/${id.replace(/_/g, '-')}`,
    tier: name => `/equipment/${slugify(name)}`
};

/** A resource as its icon and linked name ("12× Coal" with qty). */
export function res(id, { qty = null, name = true, scale = 0.625 } = {}) {
    const r = RESOURCES[id];
    if (!r) return esc(id);
    const label = `${qty !== null ? `${fmt(qty)}× ` : ''}${name ? esc(r.name) : ''}`;
    return `<a class="res" href="${path.item(id)}" title="${esc(r.name)}">${resIcon(id, { scale })}${label ? `<span>${label}</span>` : ''}</a>`;
}

/** A list of resources and quantities: { coal: 2, iron_ore: 1 } -> "1× Iron Ore, 2× Coal". */
export function resList(map, sep = ' ') {
    return Object.entries(map || {}).map(([id, qty]) => res(id, { qty })).join(sep);
}

/** An internal link with an optional sprite. */
export function link(href, text, iconKey = null, scale = 0.625) {
    const pic = iconKey ? icon(iconKey, scale, scale < 1 ? 'soft res-spr' : '') : '';
    return `<a href="${href}">${pic}${pic ? ' ' : ''}${text}</a>`;
}

// ---------- blocks ----------

/**
 * A table. `head` is a list of column titles (a title ending in "#" is a number column); `rows` lists of
 * cells (HTML). Sortable by clicking a column title (wiki.js), unless `sort` is false.
 */
export function table(head, rows, { sort = true, cls = '', caption = '' } = {}) {
    if (!rows.length) return '';
    const cols = head.map(h => ({ num: /#$/.test(h), title: h.replace(/\s*#$/, '') }));
    const th = cols.map(c => `<th${c.num ? ' class="num"' : ''}>${c.title}</th>`).join('');
    const body = rows.map(r => `<tr>${r.map((cell, i) => `<td${cols[i]?.num ? ' class="num"' : ''}>${cell ?? ''}</td>`).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table class="wt${sort ? ' sortable' : ''}${cls ? ` ${cls}` : ''}">${caption ? `<caption>${caption}</caption>` : ''}<thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** The infobox beside a page's text: a title, a picture, and rows of label and value. */
export function infobox({ title, image = '', caption = '', rows = [], art = '' }) {
    const lines = rows.filter(r => r && r[1] !== undefined && r[1] !== null && r[1] !== '').map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
    return `<aside class="infobox">
        <div class="ib-title">${title}</div>
        ${image ? `<div class="ib-image"${art ? ` style="${art}"` : ''}>${image}</div>` : ''}
        ${caption ? `<div class="ib-caption">${caption}</div>` : ''}
        ${lines ? `<table>${lines}</table>` : ''}
    </aside>`;
}

/** A painting as a banner: assets/paint/<name>.webp. */
export function paintStyle(name, focus = 'center 60%') {
    return `--art:url(/assets/paint/${name}.webp);--art-at:${focus}`;
}

/** A callout: kind is tip, note or warning. */
export function callout(kind, html) {
    return `<aside class="callout ${kind}"><strong>${kind[0].toUpperCase()}${kind.slice(1)}:</strong> ${html}</aside>`;
}

/** A section with a heading (h2 by default, with an id to link to). */
export function section(title, html, { level = 2, id = slugify(title.replace(/<[^>]+>/g, '')) } = {}) {
    if (!html) return '';
    return `<h${level} id="${id}">${title}</h${level}>\n${html}`;
}

/** A grid of linked tiles, each with a picture: [{ href, title, pic, note }]. */
export function tiles(list, cls = '') {
    return `<div class="tiles${cls ? ` ${cls}` : ''}">${list.map(t => `<a class="tile" href="${t.href}"${t.art ? ` style="${t.art}"` : ''}>${t.pic ? `<span class="tile-pic">${t.pic}</span>` : ''}<span class="tile-name">${t.title}</span>${t.note ? `<span class="tile-note">${t.note}</span>` : ''}</a>`).join('')}</div>`;
}

/** A box of links at the foot of a page: the rest of its family. */
export function navbox(title, links) {
    if (!links.length) return '';
    return `<nav class="navbox"><div class="nb-title">${title}</div><div class="nb-links">${links.join('')}</div></nav>`;
}

/** Pills: small labelled values in a row. */
export function pills(list) {
    return `<span class="pills">${list.filter(Boolean).map(p => `<span class="pill">${p}</span>`).join('')}</span>`;
}

/** The hero as drawn in the game, for a state-like object (the default look, nothing worn). */
export function hero(scale = 2, extra = {}) {
    return heroSprite({ equipped: {}, prestige: { count: 0 }, hero: {}, ...extra }, { scale });
}
