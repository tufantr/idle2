// The skill stage: a strip of scenery above each skill tab where the hero does the work. He stands
// with the skill's tool facing the thing he is working on; his swing follows the real action
// progress (so a speed boost swings faster, and a stall stops him), and the work lands on the
// beat. On the farm he hoes while the crops grow (they grow on the clock, not by his strokes), and on
// the agility course he runs empty-handed, leaping at the end of each lap. Built once, like the battle
// scene; the tab's re-renders never touch it.

import { SKILLS, NON_COMBAT_SKILLS, WORKSHOP_SKILLS } from '../data/skills.js';
import { RESOURCES } from '../data/resources.js';
import { TYPE_ICONS } from '../data/items.js';
import { cropById } from '../data/farming.js';
import { petForSkill } from '../data/pets.js';
import { resolveAction, intervalFor } from '../systems/skilling.js';
import { plotReady } from '../systems/farming.js';
import { courseDef } from '../systems/agility.js';
import { fmt, seconds, duration } from './format.js';
import { heroSprite, heroLayers, sprite, resIcon } from './sprites.js';
import { FEATURES } from './features.js';

export const STAGE_SKILLS = [...NON_COMBAT_SKILLS, ...WORKSHOP_SKILLS, 'farming', 'agility'];

// The hint under the resting hero (he faces the place's own picture, dimmed).
const IDLE = {
    mining: 'Pick a vein below to start mining', woodcutting: 'Pick a tree below to start cutting',
    fishing: 'Pick a spot below to start fishing', hunting: 'Pick a quarry below to start hunting',
    cooking: 'Pick a dish below to start cooking', firemaking: 'Pick logs below to light the fire',
    alchemy: 'Pick a potion below to start brewing', smithing: 'Pick a bar or a piece below to start smithing',
    crafting: 'Pick a piece below to start crafting', farming: 'Plant seeds below: they grow while you do something else',
    agility: 'Build an obstacle below, then run the course'
};
const RING = 2 * Math.PI * 34; // the progress ring's circumference (r = 34)
const HOE_MS = 2600;           // one stroke of the hoe while the crops grow
const STRIDE_MS = 360;         // one stride on the course
const clamp01 = x => Math.max(0, Math.min(1, x));

/** The work swing: a slow wind-up through the action, a snap in the last tenth (`k` scales it). */
function swing(p, k = 1) {
    let rot = 0, dx = 0;
    if (p < 0.78) { rot = -2 - p * 8; dx = -p * 4; }
    else if (p < 0.9) { const q = (p - 0.78) / 0.12; rot = -8 - q * 10; dx = -3 - q * 5; }
    else { const q = (p - 0.9) / 0.1; rot = -18 + q * 36; dx = -8 + q * 26; }
    return `translateX(${(dx * k).toFixed(1)}px) rotate(${(rot * k).toFixed(1)}deg)`;
}

/** Running: a bounce every stride, leaning into it; the end of the lap is a leap (the last obstacle). */
function stride(p, t) {
    const s = (t % STRIDE_MS) / STRIDE_MS;
    let y = -Math.abs(Math.sin(s * Math.PI)) * 5;
    let rot = 5 + Math.sin(s * 2 * Math.PI) * 2;
    if (p > 0.82) { const q = (p - 0.82) / 0.18; y = -Math.sin(q * Math.PI) * 26; rot = 10 - q * 14; }
    return `translateX(${(Math.sin(t / 900) * 6).toFixed(1)}px) translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
}

export function createStage(root) {
    root.innerHTML = `
    <section class="stage" data-skill="mining">
        <div class="stage-sky"></div><div class="stage-far"></div><div class="stage-ground"></div>
        <div class="stage-particles" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--x:${(i * 61 + 9) % 100}%;--y:${(i * 29 + 7) % 80}%;--d:${((i * 0.83) % 6).toFixed(2)}s;--s:${(0.6 + ((i * 5) % 5) / 5).toFixed(2)};--t:${(0.8 + ((i * 3) % 5) / 10).toFixed(2)}"></i>`).join('')}</div>
        <div class="stage-field">
            <div class="stage-hero"><span class="stage-figure"></span></div>
            <span class="stage-pet" aria-hidden="true"></span>
            <div class="stage-target">
                <svg class="stage-ring" viewBox="0 0 76 76" aria-hidden="true"><circle class="ring-track" cx="38" cy="38" r="34"/><circle class="ring-fill" cx="38" cy="38" r="34"/></svg>
                <span class="stage-icon"></span>
            </div>
            <div class="stage-text"><b class="stage-title"></b><span class="stage-sub"></span></div>
        </div>
    </section>`;
    const $ = sel => root.querySelector(sel);
    const el = { stage: $('.stage'), hero: $('.stage-hero'), figure: $('.stage-figure'), pet: $('.stage-pet'), target: $('.stage-target'), icon: $('.stage-icon'), ring: $('.ring-fill'), title: $('.stage-title'), sub: $('.stage-sub') };
    el.ring.style.strokeDasharray = `${RING}`;
    let shownSkill = null;
    let heroKey = '';
    let targetKey = '';
    let lastStruck = -1;
    let farm = null; // what the farm shows (farmView), kept for the frames between renders
    const reduced = () => document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const phone = () => !!window.matchMedia?.('(max-width: 600px)').matches;
    const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const fill = p => { el.ring.style.strokeDashoffset = `${RING * (1 - p)}`; };

    /** The thing being worked on (as HTML): a resource, a piece of gear, a tool, the fire or the course. */
    function targetFor(action, skill) {
        const scale = phone() ? 1.25 : 1.5;
        if (!action) return { icon: sprite(FEATURES[skill]?.icon, { scale, cls: 'resting', fallback: '✨' }), title: 'Resting', sub: IDLE[skill] || 'Pick a job below' };
        if (action.kind === 'agility') return { icon: sprite(FEATURES.agility.icon, { scale }), title: 'Running the course', sub: '' };
        if (action.kind === 'tool') return { icon: sprite(`tool/${action.tool}`, { scale, fallback: '🛠️' }), title: action.label, sub: 'A new tool' };
        if (action.kind === 'smith' || action.kind === 'craft') {
            const it = action.item || {};
            return { icon: sprite(`item/${it.type}/${it.tier}`, { scale, fallback: TYPE_ICONS[it.type] || '⚒️' }), title: action.label, sub: '' };
        }
        if (action.bonfireLog) return { icon: sprite(FEATURES.firemaking.icon, { scale, fallback: '🔥' }), title: action.label, sub: '' };
        const res = RESOURCES[action.output];
        return { icon: res ? resIcon(action.output, { scale }) : '✨', title: action.label, sub: '', color: res?.color };
    }

    /** The farm: what waits to be harvested, or the crop nearest to ready. The hero hoes while anything grows. */
    function farmView(game) {
        const scale = phone() ? 1.25 : 1.5;
        const plots = game.state.farming.plots.filter(p => p.crop);
        const ready = plots.filter(p => plotReady(p, game.now));
        const growing = plots.filter(p => !plotReady(p, game.now)).sort((a, b) => a.readyAt - b.readyAt);
        const show = plot => { const crop = cropById(plot.crop); return { crop, icon: resIcon(crop.produces, { scale }), color: RESOURCES[crop.produces]?.color }; };
        if (ready.length) {
            const { crop, icon, color } = show(ready[0]);
            return { icon, color, working: growing.length > 0, full: true, title: ready.length > 1 ? `${ready.length} plots to harvest` : `${crop.name} to harvest`, sub: ready.length > 1 ? 'Harvest them below' : 'Harvest it below' };
        }
        if (growing.length) {
            const { crop, icon, color } = show(growing[0]);
            return { icon, color, working: true, plot: growing[0], title: growing.length > 1 ? `${growing.length} plots growing` : `${crop.name} growing`, sub: `${crop.name} ready in ${duration(growing[0].readyAt - game.now)}` };
        }
        return { ...targetFor(null, 'farming'), working: false };
    }

    return {
        element: root,
        /** After each render: which skill's stage shows, who stands in it, what he works on. */
        sync(game, ui) {
            const skill = STAGE_SKILLS.includes(ui.tab) ? ui.tab : null;
            root.hidden = !skill;
            if (!skill) return;
            const state = game.state;
            if (shownSkill !== skill) { shownSkill = skill; el.stage.dataset.skill = skill; }
            const look = skill === 'agility' ? { bare: true } : { tool: skill };
            const hk = `${skill}|${heroLayers(state, look).join(',')}`;
            if (hk !== heroKey) { heroKey = hk; el.figure.innerHTML = heroSprite(state, { scale: phone() ? 3 : 4, ...look }); }
            // the skill's own pet, once found, keeps him company at work
            const pet = petForSkill(skill);
            const petKey = pet && state.pets?.[pet.id] ? `${pet.id}|${phone()}` : '';
            if (petKey !== el.pet.dataset.key) { el.pet.dataset.key = petKey; el.pet.innerHTML = petKey ? sprite(`pet/${pet.id}`, { scale: phone() ? 1 : 2 }) : ''; }
            let view;
            if (skill === 'farming') view = farmView(game);
            else {
                const action = resolveAction(state);
                const working = !!action && action.skill === skill;
                view = { ...targetFor(working ? action : null, skill), working };
                if (working) view.sub = `${seconds(intervalFor(action, game.derived))} ${skill === 'agility' ? 'a run' : 'per action'} · +${fmt(Math.round((action.xp || 0) * game.derived.xpMult))} XP${state.action?.stalled ? ' · waiting for materials' : ''}`;
                else if (skill === 'agility' && courseDef(state)) view.sub = 'Press Run below to go round your course';
            }
            farm = skill === 'farming' ? view : null;
            const tk = `${view.icon}|${view.title}`;
            if (tk !== targetKey) { targetKey = tk; el.icon.innerHTML = view.icon; el.target.style.setProperty('--c', view.color || SKILLS[skill].color); }
            setText(el.title, view.title);
            setText(el.sub, view.sub);
            el.stage.classList.toggle('working', view.working);
            el.stage.classList.toggle('stalled', view.working && !farm && !!state.action?.stalled);
        },
        /** Every frame: the ring fills with the work, and the hero winds up and strikes on the beat. */
        frame(game) {
            if (root.hidden) return;
            const state = game.state;
            const t = performance.now();
            if (farm) {
                // the ring is the nearest crop's growth; the hoe keeps its own time
                fill(farm.full ? 1 : farm.plot ? clamp01((game.now - farm.plot.plantedAt) / Math.max(1, farm.plot.readyAt - farm.plot.plantedAt)) : 0);
                el.hero.style.transform = farm.working && !reduced() ? swing((t % HOE_MS) / HOE_MS, 0.7) : '';
                return;
            }
            const action = resolveAction(state);
            const working = !!action && action.skill === shownSkill && state.action;
            if (!working) { fill(0); el.hero.style.transform = ''; return; }
            const p = clamp01(state.action.progress / intervalFor(action, game.derived));
            fill(p);
            if (reduced()) return;
            el.hero.style.transform = shownSkill === 'agility' ? stride(p, t) : swing(p);
            // the strike lands (on the course, the leap): the target takes the hit once per action
            const beat = Math.floor((state.stats.actionsBySkill[shownSkill] || 0));
            if (p > 0.9 && beat !== lastStruck) { lastStruck = beat; el.target.animate?.([{ transform: 'none' }, { transform: 'scale(0.9) rotate(-4deg)', offset: 0.3 }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'none' }], { duration: 320, easing: 'ease-out' }); }
        },
        /** The spot the work pops from (for src/ui/actionfx.js), when this stage is showing. */
        anchor() { return root.hidden ? null : el.target; }
    };
}
