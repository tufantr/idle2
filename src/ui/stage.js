// The skill stage: a strip of scenery above each skill tab where the hero does the work. He stands
// with the skill's tool facing the thing he is working on; his swing follows the real action
// progress (so a speed boost swings faster, and a stall stops him), and the work lands on the
// beat. Built once, like the battle scene; the tab's re-renders never touch it.

import { SKILLS, NON_COMBAT_SKILLS, WORKSHOP_SKILLS } from '../data/skills.js';
import { RESOURCES } from '../data/resources.js';
import { TYPE_ICONS } from '../data/items.js';
import { TOOLS } from '../data/workshop.js';
import { resolveAction, intervalFor } from '../systems/skilling.js';
import { fmt, seconds, escapeHtml as esc } from './format.js';
import { heroSprite, heroLayers, sprite, resIcon } from './sprites.js';

export const STAGE_SKILLS = [...NON_COMBAT_SKILLS, ...WORKSHOP_SKILLS];

// What the hero faces when idle on each skill's tab, and the hint under it.
const IDLE = {
    mining: ['⛰️', 'Pick a vein below to start mining'], woodcutting: ['🌳', 'Pick a tree below to start cutting'],
    fishing: ['🌊', 'Pick a spot below to start fishing'], hunting: ['🌾', 'Pick a quarry below to start hunting'],
    cooking: ['🍳', 'Pick a dish below to start cooking'], firemaking: ['🪵', 'Pick logs below to light the fire'],
    alchemy: ['⚗️', 'Pick a potion below to start brewing'], smithing: ['🔥', 'Pick a bar or a piece below to start smithing'],
    crafting: ['🧵', 'Pick a piece below to start crafting']
};
const RING = 2 * Math.PI * 34; // the progress ring's circumference (r = 34)

export function createStage(root) {
    root.innerHTML = `
    <section class="stage" data-skill="mining">
        <div class="stage-sky"></div><div class="stage-far"></div><div class="stage-ground"></div>
        <div class="stage-particles" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--x:${(i * 61 + 9) % 100}%;--y:${(i * 29 + 7) % 80}%;--d:${((i * 0.83) % 6).toFixed(2)}s;--s:${(0.6 + ((i * 5) % 5) / 5).toFixed(2)};--t:${(0.8 + ((i * 3) % 5) / 10).toFixed(2)}"></i>`).join('')}</div>
        <div class="stage-field">
            <div class="stage-hero"><span class="stage-figure"></span></div>
            <div class="stage-target">
                <svg class="stage-ring" viewBox="0 0 76 76" aria-hidden="true"><circle class="ring-track" cx="38" cy="38" r="34"/><circle class="ring-fill" cx="38" cy="38" r="34"/></svg>
                <span class="stage-icon"></span>
            </div>
            <div class="stage-text"><b class="stage-title"></b><span class="stage-sub"></span></div>
        </div>
    </section>`;
    const $ = sel => root.querySelector(sel);
    const el = { stage: $('.stage'), hero: $('.stage-hero'), figure: $('.stage-figure'), target: $('.stage-target'), icon: $('.stage-icon'), ring: $('.ring-fill'), title: $('.stage-title'), sub: $('.stage-sub') };
    el.ring.style.strokeDasharray = `${RING}`;
    let shownSkill = null;
    let heroKey = '';
    let targetKey = '';
    let lastStruck = -1;
    const reduced = () => document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };

    /** The thing being worked on (as HTML): a resource, a piece of gear, a tool or the fire. */
    function targetFor(action, skill) {
        if (!action) return { icon: IDLE[skill]?.[0] || '✨', title: 'Resting', sub: IDLE[skill]?.[1] || 'Pick a job below' };
        const scale = window.matchMedia?.('(max-width: 600px)').matches ? 1.25 : 1.5;
        if (action.kind === 'tool') { const t = TOOLS[action.tool]; return { icon: t?.icon || '🛠️', title: action.label, sub: 'A new tool' }; }
        if (action.kind === 'smith' || action.kind === 'craft') {
            const it = action.item || {};
            return { icon: sprite(`item/${it.type}/${it.tier}`, { scale, fallback: TYPE_ICONS[it.type] || '⚒️' }), title: action.label, sub: '' };
        }
        if (action.bonfireLog) return { icon: '🔥', title: action.label, sub: '' };
        const res = RESOURCES[action.output];
        return { icon: res ? resIcon(action.output, { scale }) : '✨', title: action.label, sub: '', color: res?.color };
    }

    return {
        element: root,
        /** After each render: which skill's stage shows, who stands in it, what he works on. */
        sync(game, ui) {
            const skill = STAGE_SKILLS.includes(ui.tab) ? ui.tab : null;
            root.hidden = !skill;
            if (!skill) return;
            const state = game.state;
            const action = resolveAction(state);
            const working = !!action && action.skill === skill;
            if (shownSkill !== skill) { shownSkill = skill; el.stage.dataset.skill = skill; }
            const hk = `${skill}|${heroLayers(state, { tool: skill }).join(',')}`;
            if (hk !== heroKey) { heroKey = hk; el.figure.innerHTML = heroSprite(state, { scale: window.matchMedia?.('(max-width: 600px)').matches ? 3 : 4, tool: skill }); }
            const t = targetFor(working ? action : null, skill);
            const tk = `${t.icon}|${t.title}`;
            if (tk !== targetKey) { targetKey = tk; el.icon.innerHTML = t.icon; el.target.style.setProperty('--c', t.color || SKILLS[skill].color); }
            setText(el.title, t.title);
            setText(el.sub, working ? `${seconds(intervalFor(action, game.derived))} per action · +${fmt(Math.round((action.xp || 0) * game.derived.xpMult))} XP${state.action?.stalled ? ' · waiting for materials' : ''}` : t.sub);
            el.stage.classList.toggle('working', working);
            el.stage.classList.toggle('stalled', working && !!state.action?.stalled);
        },
        /** Every frame: the ring fills with the action, and the hero winds up and strikes on the beat. */
        frame(game) {
            if (root.hidden) return;
            const state = game.state;
            const action = resolveAction(state);
            const working = !!action && action.skill === shownSkill && state.action;
            if (!working) { el.ring.style.strokeDashoffset = `${RING}`; el.hero.style.transform = ''; return; }
            const p = Math.max(0, Math.min(1, state.action.progress / intervalFor(action, game.derived)));
            el.ring.style.strokeDashoffset = `${RING * (1 - p)}`;
            if (reduced()) return;
            // The swing: a slow wind-up through the action, a snap in the last tenth.
            let rot = 0, dx = 0;
            if (p < 0.78) { rot = -2 - p * 8; dx = -p * 4; }
            else if (p < 0.9) { const q = (p - 0.78) / 0.12; rot = -8 - q * 10; dx = -3 - q * 5; }
            else { const q = (p - 0.9) / 0.1; rot = -18 + q * 36; dx = -8 + q * 26; }
            el.hero.style.transform = `translateX(${dx.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
            // the strike lands: the target takes the hit once per action
            const beat = Math.floor((state.stats.actionsBySkill[shownSkill] || 0));
            if (p > 0.9 && beat !== lastStruck) { lastStruck = beat; el.target.animate?.([{ transform: 'none' }, { transform: 'scale(0.9) rotate(-4deg)', offset: 0.3 }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'none' }], { duration: 320, easing: 'ease-out' }); }
        },
        /** The spot the work pops from (for src/ui/actionfx.js), when this stage is showing. */
        anchor() { return root.hidden ? null : el.target; }
    };
}
