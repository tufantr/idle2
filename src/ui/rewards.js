// Reward moments: a celebration card for the big steps (milestone levels, new tabs, pets, uniques,
// prestige), the daily crate opened like a chest, and what each level brings. Presentation only:
// main.js calls these from its event handler, and nothing here changes the game.

import { SKILLS } from '../data/skills.js';
import { RESOURCES } from '../data/resources.js';
import { SMELTING_RECIPES, METALS, JEWEL_BARS, GEM_TIERS, TOOLS } from '../data/workshop.js';
import { CROPS } from '../data/farming.js';
import { AGILITY_SLOTS } from '../data/agility.js';
import { fmt, escapeHtml as esc } from './format.js';
import { resIcon } from './sprites.js';

const SHOW_MS = 2800;
const MAX_QUEUE = 4;
const CONFETTI = 26;
const CONFETTI_COLORS = ['#fcd34d', '#f59e0b', '#fde68a', '#f472b6', '#60a5fa', '#34d399', '#c084fc'];

// One line on what a newly opened tab is for (skills use their own description).
const TAB_BLURBS = {
    shop: 'Spend gold on supplies and skill points on perks.',
    prestige: 'Trade a run for permanent power: tokens and skill points.',
    achievements: 'Goals with rewards that last forever.',
    dungeons: 'Elite monsters, a chest at the end and fragments of unique gear.',
    events: 'Weekend events with their own tokens and shop.',
    clan: 'Join a clan and fight a weekly boss together.'
};

/** What reaching `level` in `skill` opens up: nodes, recipes, metals, gems, crops, tools and obstacle slots. */
export function unlocksAtLevel(skill, level) {
    const found = [];
    const add = (icon, name) => found.push({ icon, name });
    for (const n of SKILLS[skill]?.nodes || []) if (n.levelReq === level) add(n.produces ? resIcon(n.produces) : SKILLS[skill].icon, n.name);
    if (skill === 'smithing') {
        for (const r of SMELTING_RECIPES) if (r.levelReq === level) add(resIcon(r.produces), r.name);
        for (const m of METALS) if (m.levelReq === level) add('⚒️', `${m.name} gear`);
    }
    if (skill === 'crafting') {
        for (const g of GEM_TIERS) if (g.levelReq === level) add(resIcon(g.gem), `${RESOURCES[g.gem]?.name || g.gem} jewellery`);
        for (const b of JEWEL_BARS) if (b.levelReq === level) add(resIcon(b.bar), `${b.name} settings`);
    }
    for (const tool of Object.values(TOOLS)) {
        if (tool.madeBy !== skill) continue;
        for (const t of tool.tiers) if (t.levelReq === level) add(tool.icon, t.name);
    }
    if (skill === 'farming') for (const c of CROPS) if (c.levelReq === level) add(resIcon(c.produces), c.name);
    if (skill === 'agility') AGILITY_SLOTS.forEach((slot, i) => { if (slot.levelReq === level) add('🧱', `Obstacle slot ${i + 1}`); });
    return found;
}

/**
 * A level-up worth a celebration: a milestone (every tenth level, and 99) or one that opens something.
 * Returns the card, or null for an ordinary level (a toast is enough).
 */
export function levelCelebration(ev) {
    const skill = SKILLS[ev.skill];
    if (!skill) return null;
    const from = Number.isFinite(ev.from) ? ev.from : ev.level - 1;
    const opened = [];
    for (let level = from + 1; level <= ev.level; level++) opened.push(...unlocksAtLevel(ev.skill, level));
    const milestone = ev.level >= 99 || Math.floor(ev.level / 10) > Math.floor(from / 10);
    if (!milestone && !opened.length) return null;
    return {
        key: `level:${ev.skill}`,
        kind: ev.level >= 99 ? 'legend' : 'level',
        icon: skill.icon,
        kicker: ev.level >= 99 ? 'Mastered' : 'Level up',
        title: `${skill.name} ${ev.level}`,
        lines: opened.slice(0, 4).map(o => `${o.icon} ${esc(o.name)}`)
    };
}

export function unlockCelebration(id, tabs) {
    const tab = tabs.find(t => t.id === id);
    const name = tab?.name || id.charAt(0).toUpperCase() + id.slice(1);
    return { key: `unlock:${id}`, kind: 'unlock', icon: tab?.icon || '🔓', kicker: 'Unlocked', title: name, note: SKILLS[id]?.desc || TAB_BLURBS[id] || '' };
}

/** The daily crate, opened: the loot comes out one piece at a time. `banked` crates are still waiting. */
export function renderCrateModal(result, banked) {
    const loot = [
        { icon: '🪙', text: `+${fmt(result.gold)} gold`, cls: 'gold' },
        { icon: '✨', text: `+${fmt(result.essence)} essence`, cls: 'essence' },
        ...Object.entries(result.materials).map(([id, qty]) => ({ icon: resIcon(id, { scale: 0.75 }), text: `${fmt(qty)}× ${esc(RESOURCES[id]?.name || id)}`, cls: RESOURCES[id]?.category === 'gem' ? 'gem' : '' }))
    ];
    return `<div class="modal-content narrow crate-modal">
        <div class="crate-stage" aria-hidden="true"><span class="crate-rays"></span><span class="crate-box">📦</span></div>
        <div class="modal-header">Daily crate</div>
        <ul class="crate-loot">${loot.map((l, i) => `<li class="${l.cls}" style="--i:${i}"><span>${l.icon}</span>${l.text}</li>`).join('')}</ul>
        <div class="modal-footer">
            ${banked > 0 ? `<button class="modal-btn btn-cancel" onclick="FI.claimDaily()">Next crate (${banked})</button>` : ''}
            <button class="modal-btn btn-confirm" onclick="FI.closeModal()">Collect</button>
        </div>
    </div>`;
}

/**
 * The celebration layer in `root`: one card at a time, a short queue, confetti. While `blocked()`
 * (a dialog is open) cards wait in the queue; `resume()` shows them once it closes.
 */
export function createRewards(root, { blocked = () => false } = {}) {
    const queue = [];
    let showing = null;
    let timer = 0;
    const reduced = () => document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function confetti(x, y) {
        if (reduced() || !document.body.animate) return;
        for (let i = 0; i < CONFETTI; i++) {
            const bit = document.createElement('i');
            bit.className = 'confetti';
            bit.style.left = `${x}px`;
            bit.style.top = `${y}px`;
            bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
            root.appendChild(bit);
            const angle = (i / CONFETTI) * Math.PI * 2 + Math.random() * 0.4;
            const speed = 120 + Math.random() * 150;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed * 0.7 - 60;
            const spin = (Math.random() - 0.5) * 900;
            const anim = bit.animate([
                { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
                { transform: `translate(${dx * 1.25}px, ${dy + 190}px) rotate(${spin}deg)`, opacity: 0 }
            ], { duration: 1300 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' });
            anim.onfinish = () => bit.remove();
            anim.oncancel = () => bit.remove();
        }
    }

    function show(card) {
        showing = card;
        clearTimeout(timer);
        root.querySelector('.celebration')?.remove();
        const node = document.createElement('div');
        node.className = `celebration ${card.kind || ''}`;
        node.setAttribute('role', 'status');
        node.innerHTML = `<span class="cel-rays" aria-hidden="true"></span>
            <span class="cel-icon" aria-hidden="true">${card.icon}</span>
            <span class="cel-kicker">${esc(card.kicker)}</span>
            <strong class="cel-title">${esc(card.title)}</strong>
            ${card.lines?.length ? `<span class="cel-lines">${card.lines.map(l => `<span>${l}</span>`).join('')}</span>` : ''}
            ${card.note ? `<span class="cel-note">${esc(card.note)}</span>` : ''}`;
        root.appendChild(node);
        requestAnimationFrame(() => {
            const box = node.getBoundingClientRect();
            confetti(box.left + box.width / 2, box.top + box.height * 0.35);
        });
        timer = setTimeout(next, card.ms || SHOW_MS);
    }

    function next() {
        if (blocked()) { // a dialog came up: let the current card go, keep the rest for later
            showing = null;
            const node = root.querySelector('.celebration');
            if (node) { node.classList.add('leaving'); setTimeout(() => node.remove(), 400); }
            return;
        }
        const card = queue.shift();
        if (card) { show(card); return; }
        showing = null;
        const node = root.querySelector('.celebration');
        if (!node) return;
        node.classList.add('leaving');
        setTimeout(() => node.remove(), 400);
    }

    return {
        /** Queue a card: { key?, kind, icon, kicker, title, lines?: [html pills], note?: text, ms? }. A card with the same key replaces the queued one. */
        celebrate(card) {
            if (document.hidden) return; // nobody is watching; the toast and the log keep the record
            if (showing && card.key && showing.key === card.key) { show(card); return; }
            const same = card.key ? queue.findIndex(q => q.key === card.key) : -1;
            if (same >= 0) queue[same] = card; else queue.push(card);
            while (queue.length > MAX_QUEUE) queue.shift();
            if (!showing && !blocked()) next();
        },
        /** The dialog that held the cards back has closed. */
        resume() {
            if (!showing && queue.length && !blocked()) next();
        }
    };
}
