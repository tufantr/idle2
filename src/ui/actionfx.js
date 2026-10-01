// Work you can see: each finished action pops what it made (and its XP) off the card that made it,
// and the card's medallion takes the hit. Drawn in a fixed layer above the page, so the tab's
// re-renders (about once a second while working) never cut it short. Presentation only.

import { RESOURCES } from '../data/resources.js';
import { fmt, escapeHtml as esc } from './format.js';

const MAX_FLOATING = 12;
const POP_MS = 1150;

export function createActionFx(layer) {
    let floating = 0;
    const reduced = () => document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function pop(html, x, y, cls = '', delay = 0, color = '') {
        if (floating >= MAX_FLOATING) return;
        floating++;
        const node = document.createElement('div');
        node.className = `work-pop ${cls}`;
        node.innerHTML = html;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        if (delay) node.style.animationDelay = `${delay}ms`;
        if (color) node.style.setProperty('--c', color);
        layer.appendChild(node);
        setTimeout(() => { node.remove(); floating--; }, POP_MS + delay);
    }

    return {
        /** A finished action (the actionComplete event), shown when its skill's tab is open. */
        actionComplete(ev, tab, anchor = null) {
            if (tab !== ev.skill || document.hidden || reduced()) return;
            // After this tick's re-render, so the pop starts from the stage's target (or the card) as drawn now.
            requestAnimationFrame(() => {
                const card = document.querySelector('#tab .node-card.active');
                const art = anchor || card?.querySelector('.skill-action-art') || card;
                if (!art) return;
                const box = art.getBoundingClientRect();
                if (!box.width) return;
                const x = box.left + box.width / 2;
                const y = box.top - 6;
                art.animate?.([{ transform: 'none' }, { transform: 'scale(1.16) rotate(-7deg)', offset: 0.3 }, { transform: 'none' }], { duration: 280, easing: 'ease-out' });
                const made = ev.made || {};
                if (made.id) pop(`+${fmt(made.qty)} ${RESOURCES[made.id]?.icon || ''}`, x, y, made.qty > 1 ? 'double' : '');
                if (made.burnt) pop(`🔥${made.qty > 1 ? ' ×2' : ''}`, x, y, made.qty > 1 ? 'double' : '');
                if (made.gem) pop(`${RESOURCES[made.gem]?.icon || '💎'} ${esc(RESOURCES[made.gem]?.name || 'Gem')}!`, x, y - 8, 'gem', 160);
                if (made.item) pop(`${esc(made.item.icon)} ${esc(made.item.name)}`, x, y, 'item', 0, made.item.color || '');
                if (ev.xp) pop(`+${fmt(ev.xp)} XP`, x + 30, y + 16, 'xp', 110);
            });
        }
    };
}
