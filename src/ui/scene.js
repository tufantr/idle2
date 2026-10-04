// The battle scene: a living stage above the combat tab. It is built once and animated from game
// events (hits, kills, deaths), so the tab's re-renders never interrupt an animation. Everything
// here is presentation: the game state is only read, and the player's clicks go out through
// the `actions` callbacks.

import { zoneForStage, STAGES_PER_ZONE, isBossStage } from '../data/zones.js';
import { dungeonById } from '../data/dungeons.js';
import { RARITIES } from '../data/items.js';
import { RESOURCES, foodsByHealing } from '../data/resources.js';
import { BALANCE, enemyForStage, goldForKill } from '../core/formulas.js';
import { killPayout } from '../systems/combat.js';
import { titanLevel } from '../systems/dungeon.js';
import { seen } from '../systems/disclosure.js';
import { fmt, seconds, escapeHtml as esc } from './format.js';
import { sprite, heroSprite, heroLayers, monsterSpriteKey, itemSpriteKey, resIcon } from './sprites.js';
import { DUNGEON_ART } from './features.js';

// Backdrop per place: zone ids, each dungeon's own painting (DUNGEON_ART) and the Titan (see style.css, .battle[data-scene]).
const PARTICLES = { meadow: 'motes', forest: 'fireflies', caves: 'sparkles', marsh: 'bubbles', highland: 'rain', ruins: 'bubbles', volcano: 'embers', frost: 'snow', skyreach: 'motes', abyss: 'void', dungeon: 'embers', titan: 'rain',
    warren: 'embers', depths: 'sparkles', stronghold: 'embers', lair: 'embers', citadel: 'void' };
const PARTICLE_COUNT = 18;
const ATLAS_CELL = 32;        // a sprite is 32 px before scaling
const MAX_FX_PER_FRAME = 8;   // a background tab catching up can deliver hundreds of hits at once
const MAX_COINS_IN_FLIGHT = 14;

// One-shot motions, played with the Web Animations API so they layer over the idle loops in
// style.css (which run on an inner element) instead of replacing them. A higher `rank` isn't
// interrupted by a lower one: a monster's entrance isn't cut short by the first hit on it.
const MOVES = {
    lunge:     { ms: 260, rank: 1, frames: [{ transform: 'none' }, { transform: 'translateX(26px) rotate(7deg)', offset: 0.35 }, { transform: 'none' }] },
    lungeLeft: { ms: 260, rank: 1, frames: [{ transform: 'none' }, { transform: 'translateX(-26px) rotate(-7deg)', offset: 0.35 }, { transform: 'none' }] },
    hurt:      { ms: 240, rank: 1, frames: [{ transform: 'none', filter: 'none' }, { transform: 'translateX(9px) scale(0.96)', filter: 'brightness(2.4) saturate(0.3)', offset: 0.2 }, { transform: 'none', filter: 'none' }] },
    crit:      { ms: 360, rank: 1, frames: [{ transform: 'none', filter: 'none' }, { transform: 'translateX(16px) rotate(8deg) scale(0.9)', filter: 'brightness(3) saturate(0)', offset: 0.18 }, { transform: 'translateX(-4px) rotate(-3deg)', offset: 0.55 }, { transform: 'none', filter: 'none' }] },
    heroHurt:  { ms: 280, rank: 1, frames: [{ transform: 'none', filter: 'none' }, { transform: 'translateX(-9px)', filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.95)) brightness(1.3)', offset: 0.2 }, { transform: 'none', filter: 'none' }] },
    dodge:     { ms: 340, rank: 1, frames: [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-22px) skewX(-8deg)', opacity: 0.5, offset: 0.4 }, { transform: 'none', opacity: 1 }] },
    cheer:     { ms: 700, rank: 2, frames: [{ transform: 'none', filter: 'none' }, { transform: 'translateY(-14px) scale(1.06)', filter: 'drop-shadow(0 0 14px rgba(125, 255, 178, 0.9))', offset: 0.35 }, { transform: 'none', filter: 'none' }] },
    spawn:     { ms: 420, rank: 2, easing: 'cubic-bezier(.3,1.4,.6,1)', frames: [{ transform: 'translateY(-28px) scale(0.5)', opacity: 0 }, { transform: 'translateY(3px) scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }] },
    bossSpawn: { ms: 900, rank: 2, frames: [{ transform: 'scale(0.2)', opacity: 0, filter: 'brightness(4)' }, { transform: 'scale(1.2)', opacity: 1, filter: 'brightness(1.6)', offset: 0.55 }, { transform: 'none', opacity: 1, filter: 'none' }] },
    // Falls back onto the ground: lifted by the half of the body that would otherwise swing below the feet.
    fallen:    { ms: 1800, rank: 3, frames: [{ transform: 'none' }, { transform: 'translate(-6px, -40%) rotate(-80deg)', offset: 0.18 }, { transform: 'translate(-6px, -40%) rotate(-80deg)', offset: 0.72 }, { transform: 'none' }] },
    shake:     { ms: 380, rank: 1, easing: 'linear', frames: [{ transform: 'none' }, { transform: 'translate(-5px, 2px)' }, { transform: 'translate(5px, -2px)' }, { transform: 'translate(-4px, -1px)' }, { transform: 'translate(3px, 2px)' }, { transform: 'none' }] },
    wounded:   { ms: 700, rank: 1, frames: [{ boxShadow: 'inset 0 0 0 rgba(220, 38, 38, 0)' }, { boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.75)', offset: 0.2 }, { boxShadow: 'inset 0 0 0 rgba(220, 38, 38, 0)' }] }
};


// Deterministic scatter for the ambient particles (positions, delays, sizes), so the markup is stable.
const PARTICLE_HTML = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
    `<i style="--x:${(i * 53 + 7) % 100}%;--y:${(i * 37 + 11) % 90}%;--d:${((i * 0.73) % 7).toFixed(2)}s;--s:${(0.6 + ((i * 7) % 5) / 5).toFixed(2)};--t:${(0.8 + ((i * 3) % 5) / 10).toFixed(2)}"></i>`
).join('');

/**
 * Builds the scene into `root` and returns its controls.
 * `actions`: { strike() -> bool (a click on the monster; true if it landed), toggle() (enter or leave combat), stage(n) (go to stage n), map() (open the world map) }.
 */
export function createScene(root, actions) {
    root.innerHTML = `
    <section class="battle" data-scene="meadow" data-particles="motes">
        <div class="battle-sky"></div>
        <div class="battle-far"></div>
        <div class="battle-near"></div>
        <div class="battle-particles" aria-hidden="true">${PARTICLE_HTML}</div>
        <header class="battle-top">
            <div class="battle-title">
                <button type="button" class="battle-zone" disabled></button>
                <span class="battle-sub"><span class="battle-stage"></span><span class="battle-regroup" hidden></span></span>
            </div>
            <ol class="stage-path" aria-label="Stages in this zone"></ol>
        </header>
        <div class="battle-field">
            <div class="fighter hero">
                <div class="fighter-bars"><span class="fbar-text"></span><div class="fbar"><i class="trail"></i><i class="fill"></i></div></div>
                <div class="fighter-stand"><span class="campfire" aria-hidden="true">${sprite('campfire', { scale: 1, fallback: '🔥' })}</span><div class="fighter-sprite"><span class="hero-figure"></span></div></div>
                <div class="fighter-name"></div>
                <div class="fighter-meta"></div>
                <div class="attack-bar" aria-hidden="true"><i></i></div>
            </div>
            <div class="fighter foe" role="button" tabindex="0">
                <div class="fighter-bars"><span class="fbar-text"></span><div class="fbar"><i class="trail"></i><i class="fill"></i></div></div>
                <div class="fighter-stand"><div class="fighter-sprite"><span class="foe-aura"></span><span class="foe-icon"></span></div></div>
                <div class="fighter-name"></div>
                <div class="fighter-meta"></div>
                <div class="attack-bar" aria-hidden="true"><i></i></div>
                <div class="boss-clock" hidden><i></i><span></span></div>
            </div>
            <div class="fx-layer" aria-hidden="true"></div>
        </div>
        <div class="battle-banner" aria-live="polite"></div>
        <div class="battle-combo" hidden><b></b><span>Combo</span><em></em></div>
        <button class="battle-cta" type="button" hidden>${sprite('item/Weapon/3', { scale: 0.75, cls: 'soft' })} Enter combat</button>
    </section>`;

    const $ = sel => root.querySelector(sel);
    const el = {
        battle: $('.battle'), zone: $('.battle-zone'), stage: $('.battle-stage'), regroup: $('.battle-regroup'), path: $('.stage-path'),
        hero: $('.hero'), heroStand: $('.hero .fighter-stand'), heroSprite: $('.hero .fighter-sprite'), heroFigure: $('.hero-figure'), heroBar: $('.hero .fill'), heroTrail: $('.hero .trail'), heroText: $('.hero .fbar-text'),
        heroName: $('.hero .fighter-name'), heroMeta: $('.hero .fighter-meta'), heroAtk: $('.hero .attack-bar i'),
        foe: $('.foe'), foeStand: $('.foe .fighter-stand'), foeSprite: $('.foe .fighter-sprite'), foeBar: $('.foe .fill'), foeTrail: $('.foe .trail'), foeText: $('.foe .fbar-text'),
        foeName: $('.foe .fighter-name'), foeMeta: $('.foe .fighter-meta'), foeIcon: $('.foe-icon'), foeAtkBar: $('.foe .attack-bar'), foeAtk: $('.foe .attack-bar i'),
        clock: $('.boss-clock'), clockBar: $('.boss-clock i'), clockText: $('.boss-clock span'),
        fx: $('.fx-layer'), banner: $('.battle-banner'), combo: $('.battle-combo'), comboN: $('.battle-combo b'), comboBuffs: $('.battle-combo em'), cta: $('.battle-cta')
    };
    let lastEnemy = null;
    let preview = null;       // the monster waiting on this stage before the first fight
    let quiet = true;         // the next monster appears without an entrance (first frame, back from another tab)
    let lastPathKey = '';
    let lastHeroLayers = '';  // the hero is redrawn only when his gear (or the size of the stage) changes
    let lastFoeScale = 0;     // the monster is redrawn when the stage changes size
    let bannerTimer = 0;
    let fxBudget = MAX_FX_PER_FRAME;
    let coinsInFlight = 0;
    let anchors = null;       // where the fighters stand in the effects layer, measured once per frame when needed
    // The pale "damage trail" behind each health bar: it holds for a moment after a hit, then slides down.
    const trails = { hero: { shown: 100, last: 100, holdUntil: 0 }, foe: { shown: 100, last: 100, holdUntil: 0 } };
    let lastFrameAt = 0;
    const running = new WeakMap();
    const reduced = () => document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const quietNow = () => document.hidden || reduced();

    // Text and markup writes only when something changed, so a frame costs next to nothing.
    const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const setMarkup = (node, html) => { if (node.__html !== html) { node.innerHTML = html; node.__html = html; } };

    function move(node, name) {
        if (!node?.animate || quietNow()) return;
        const m = MOVES[name];
        const current = running.get(node);
        if (current && current.anim.playState === 'running') {
            if (current.rank > m.rank) return;
            current.anim.cancel();
        }
        running.set(node, { anim: node.animate(m.frames, { duration: m.ms, easing: m.easing || 'ease-out' }), rank: m.rank });
    }

    /** The fighters' spots in % of the effects layer: x (centre), top (head room), mid and bottom (feet). */
    function anchor() {
        if (anchors) return anchors;
        const f = el.fx.getBoundingClientRect();
        const at = node => {
            const b = node.getBoundingClientRect();
            return { x: (b.left + b.width / 2 - f.left) / f.width * 100, top: (b.top - f.top) / f.height * 100, mid: (b.top + b.height / 2 - f.top) / f.height * 100, bottom: (b.bottom - f.top) / f.height * 100 };
        };
        anchors = f.width && f.height
            ? { hero: at(el.heroStand), foe: at(el.foeStand) }
            : { hero: { x: 25, top: 25, mid: 50, bottom: 80 }, foe: { x: 75, top: 25, mid: 50, bottom: 80 } };
        return anchors;
    }
    const jitter = spread => (Math.random() - 0.5) * spread;

    /**
     * How big the fighters are drawn, in whole pixels per sprite pixel: 4 on a desktop and 3 on a
     * phone in the page; while the fight fills the screen (body.battle-full) they grow with it.
     */
    function fighterScale() {
        const phone = !!window.matchMedia?.('(max-width: 600px)').matches;
        if (!document.body.classList.contains('battle-full')) return phone ? 3 : 4;
        // The stand's height follows the scene's (style.css); a boss is one size up and must fit it too.
        const fit = Math.floor((el.foeStand.clientHeight || 0) / ATLAS_CELL) - 1;
        return Math.max(phone ? 3 : 4, Math.min(phone ? 4 : 6, fit));
    }

    function trailFor(t, pct, now, dt) {
        if (pct < t.last - 0.01) t.holdUntil = now + 320;
        t.last = pct;
        if (pct >= t.shown) t.shown = pct;
        else if (now >= t.holdUntil) t.shown = Math.max(pct, t.shown - dt * 0.09);
        return t.shown;
    }
    function resetTrail(t, pct) { t.shown = t.last = pct; t.holdUntil = 0; }

    function spawnFx(className, html, x, y, ms = 900) {
        if (quietNow() || fxBudget <= 0) return null;
        fxBudget--;
        const node = document.createElement('div');
        node.className = className;
        node.innerHTML = html;
        node.style.left = `${x}%`;
        node.style.top = `${y}%`;
        el.fx.appendChild(node);
        setTimeout(() => node.remove(), ms);
        return node;
    }

    function banner(html, kind = '', ms = 1800) {
        el.banner.innerHTML = html;
        el.banner.className = `battle-banner ${kind}`;
        void el.banner.offsetWidth; // restart the entrance when a banner replaces another
        el.banner.classList.add('show');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => el.banner.classList.remove('show'), ms);
    }

    /** Coins from the monster to the gold counter in the header. */
    function coinBurst(count) {
        if (quietNow()) return;
        const target = document.querySelector('.chip.gold b');
        if (!target) return;
        const from = el.foeSprite.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        if (!from.width || !to.width) return;
        for (let i = 0; i < count && coinsInFlight < MAX_COINS_IN_FLIGHT; i++) {
            coinsInFlight++;
            const coin = document.createElement('div');
            coin.className = 'flying-coin';
            coin.innerHTML = sprite('gold', { scale: 1, fallback: '🪙' });
            const x0 = from.left + from.width / 2 + (Math.random() - 0.5) * 40;
            const y0 = from.top + from.height / 2 + (Math.random() - 0.5) * 30;
            coin.style.left = `${x0}px`;
            coin.style.top = `${y0}px`;
            document.body.appendChild(coin);
            const dx = to.left + to.width / 2 - x0;
            const dy = to.top + to.height / 2 - y0;
            const anim = coin.animate([
                { transform: 'translate(0, 0) scale(0.6)', opacity: 0 },
                { transform: `translate(${(Math.random() - 0.5) * 70}px, -50px) scale(1.15)`, opacity: 1, offset: 0.3 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0.9 }
            ], { duration: 700 + i * 80, easing: 'cubic-bezier(.45,0,.35,1)' });
            const done = () => {
                coinsInFlight--;
                coin.remove();
                const chip = target.closest('.chip');
                chip?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', boxShadow: '0 0 18px rgba(251, 191, 36, 0.6)' }, { transform: 'scale(1)' }], { duration: 260 });
            };
            anim.onfinish = done;
            anim.oncancel = done;
        }
    }

    function sceneFor(state) {
        const c = state.combat;
        if (c.mode === 'titan') return 'titan';
        if (c.mode === 'dungeon') return DUNGEON_ART[c.dungeon?.id] || 'dungeon';
        const zone = zoneForStage(c.stage);
        return zone.depth > 0 ? 'abyss' : zone.id;
    }

    function currentEnemy(state) {
        const c = state.combat;
        if (c.enemy && (c.mode !== 'stages' || c.enemy.stage === c.stage)) return c.enemy;
        if (!preview || preview.stage !== c.stage) preview = enemyForStage(c.stage);
        return preview;
    }

    function renderPath(state) {
        const c = state.combat;
        let nodes;
        if (c.mode === 'dungeon') {
            const d = dungeonById(c.dungeon?.id);
            const total = d ? d.monsters.length + 1 : 1;
            const at = c.dungeon?.index || 0;
            nodes = Array.from({ length: total }, (_, i) => ({ label: i + 1, state: i < at ? 'done' : i === at ? 'now' : 'next', boss: i === total - 1, title: i === total - 1 ? 'Dungeon boss' : `Room ${i + 1}` }));
        } else if (c.mode === 'titan') {
            nodes = [{ label: 'T', state: 'now', boss: true, title: 'The Titan' }];
        } else {
            const start = Math.floor((c.stage - 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE + 1;
            nodes = Array.from({ length: STAGES_PER_ZONE }, (_, i) => {
                const s = start + i;
                const boss = isBossStage(s);
                return { label: s, state: s === c.stage ? 'now' : s <= c.maxStage ? 'done' : 'next', boss, go: s !== c.stage && s <= c.maxStage, title: `${boss ? 'Boss · ' : ''}Stage ${s}` };
            });
        }
        const key = JSON.stringify(nodes);
        if (key === lastPathKey) return;
        lastPathKey = key;
        el.path.innerHTML = nodes.map(n => {
            const face = n.boss ? '💀' : `<span>${n.label}</span>`;
            return `<li class="${n.state}${n.boss ? ' boss' : ''}">${n.go
                ? `<button type="button" data-stage="${n.label}" title="Go to ${n.title}" aria-label="Go to ${n.title}">${face}</button>`
                : `<b title="${n.title}${n.state === 'now' ? ' (here)' : n.state === 'next' ? ' (not reached yet)' : ''}">${face}</b>`}</li>`;
        }).join('');
    }

    function heroKit(state) {
        const c = state.combat;
        const parts = [];
        if (c.autoEat !== 'none' && seen(state, 'food')) { // before food exists for the player, there is nothing to warn about
            const foods = foodsByHealing().filter(f => (c.autoEat === 'auto' || f.id === c.autoEat) && state.resources[f.id] > 0);
            const count = foods.reduce((n, f) => n + state.resources[f.id], 0);
            parts.push(count > 0
                ? `<span title="Food for auto-eat">${resIcon(foods[foods.length - 1].id)} ${fmt(count)}</span>`
                : `<span class="warn" title="Nothing to eat: cook some food">${resIcon('cooked_rabbit')} no food</span>`);
        }
        if (c.potion !== 'none') {
            const p = RESOURCES[c.potion];
            const left = c.potionCharges > 0 ? `${c.potionCharges} charges` : `×${fmt(state.resources[c.potion] || 0)}`;
            parts.push(`<span title="${esc(p?.name || 'Potion')}">${resIcon(c.potion)} ${left}</span>`);
        }
        return parts.join('');
    }

    function foeMeta(state, d, enemy) {
        const payout = killPayout(state, enemy);
        const gold = goldForKill(payout.full ? enemy : { ...enemy, boss: false }, d.goldMult) * (enemy.gilded ? BALANCE.rewards.gildedGoldMult : 1);
        return `⚔️ ${fmt(enemy.atk)} · ⏱ ${seconds(enemy.interval)} · 🪙 ${fmt(gold)}`;
    }

    function showEnemy(game, enemy, silent) {
        const c = game.state.combat;
        lastFoeScale = fighterScale();
        el.foeIcon.innerHTML = sprite(monsterSpriteKey(enemy), { scale: lastFoeScale + (enemy.boss ? 1 : 0), fallback: esc(enemy.icon || '👾') });
        setText(el.foeName, enemy.name.replace(' (Boss)', ''));
        el.foe.classList.toggle('boss', !!enemy.boss);
        el.foe.classList.toggle('elite', !!enemy.elite);
        el.foe.classList.toggle('gilded', !!enemy.gilded);
        el.foe.setAttribute('aria-label', `Strike ${enemy.name}: half damage, builds your combo`);
        el.foe.title = `Click to strike ${enemy.name}: half damage, builds your combo`;
        setText(el.foeMeta, foeMeta(game.state, game.derived, enemy));
        resetTrail(trails.foe, Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100))); // a fresh monster has no damage trail
        if (silent) return;
        move(el.foeSprite, enemy.boss ? 'bossSpawn' : 'spawn');
        if (enemy.gilded && c.active) {   // a rare sight: say so, once, as it arrives
            banner(`<small>A rare sight</small><strong>${esc(enemy.name)}</strong><span>Five times the gold, and a gem</span>`, 'gilded', 1600);
            actions.sound?.('rare');
        }
        if (enemy.boss && c.active) {
            const label = enemy.titan ? `Titan · level ${titanLevel(game.state)}` : c.mode === 'dungeon' ? 'Dungeon boss' : `Boss · stage ${c.stage}`;
            banner(`<small>${label}</small><strong>${esc(enemy.name.replace(' (Boss)', ''))}</strong>`, 'boss', 2200);
            move(el.battle, 'shake');
            actions.sound?.('boss');
        }
    }

    // ---------- the player's hands ----------

    el.foe.addEventListener('click', event => {
        if (!actions.strike()) return;
        move(el.foeSprite, 'hurt');
        if (event.clientX === undefined || (event.clientX === 0 && event.clientY === 0)) return; // keyboard
        const box = el.fx.getBoundingClientRect();
        fxBudget = Math.max(fxBudget, 1);
        spawnFx('click-spark', '✦', (event.clientX - box.left) / box.width * 100, (event.clientY - box.top) / box.height * 100, 450);
    });
    el.cta.addEventListener('click', () => actions.toggle());
    el.zone.addEventListener('click', () => actions.map?.());
    el.path.addEventListener('click', event => {
        const node = event.target.closest?.('button[data-stage]');
        if (node) actions.stage(Number(node.dataset.stage));
    });

    return {
        element: root,

        /** After each render: visibility, place, path, names and kit. Cheap when nothing changed. */
        sync(game, ui) {
            const onCombat = ui.tab === 'combat';
            if (root.hidden && onCombat) quiet = true;
            root.hidden = !onCombat;
            if (!onCombat) return;
            const state = game.state;
            const c = state.combat;
            const d = game.derived;
            const scene = sceneFor(state);
            if (el.battle.dataset.scene !== scene) {
                el.battle.dataset.scene = scene;
                el.battle.dataset.particles = PARTICLES[scene] || 'motes';
            }
            if (c.mode === 'dungeon') {
                const dg = dungeonById(c.dungeon?.id);
                setText(el.zone, dg ? dg.name : 'Dungeon');
                setText(el.stage, dg ? `Room ${Math.min((c.dungeon?.index || 0) + 1, dg.monsters.length + 1)} of ${dg.monsters.length + 1}` : '');
            } else if (c.mode === 'titan') {
                setText(el.zone, '🗿 Titan challenge');
                setText(el.stage, `Level ${titanLevel(state)}`);
            } else {
                setText(el.zone, zoneForStage(c.stage).name);
                setText(el.stage, `Stage ${c.stage}${c.maxStage > c.stage ? ` · best ${c.maxStage}` : ''}`);
            }
            // The zone's name opens the world map, once there is a second zone to travel to.
            const mapped = c.mode === 'stages' && seen(state, 'world_map');
            el.zone.disabled = !mapped;
            el.zone.title = mapped ? 'Open the world map' : '';
            renderPath(state);
            setText(el.heroName, `You · Combat Lv ${d.combatLevel}`);
            setMarkup(el.heroMeta, heroKit(state));
            const enemy = currentEnemy(state);
            if (enemy === lastEnemy) setText(el.foeMeta, foeMeta(state, d, enemy)); // payouts change with farm mode
            const scale = fighterScale();
            const layers = `${scale}|${heroLayers(state).join(',')}`;
            if (layers !== lastHeroLayers) {
                lastHeroLayers = layers;
                el.heroFigure.innerHTML = heroSprite(state, { scale });
            }
            if (lastEnemy && scale !== lastFoeScale) showEnemy(game, lastEnemy, true); // the stage changed size: redraw the monster to match
            el.battle.classList.toggle('idle', !c.active);
            el.cta.hidden = c.active;
        },

        /** Every animation frame: bars, timers, combo and a newly arrived monster. */
        frame(game) {
            if (root.hidden) return;
            fxBudget = MAX_FX_PER_FRAME;
            anchors = null;
            const now = performance.now();
            const dt = Math.min(100, now - (lastFrameAt || now));
            lastFrameAt = now;
            const state = game.state;
            const c = state.combat;
            const d = game.derived;
            const enemy = currentEnemy(state);
            const heroPct = Math.max(0, Math.min(100, c.hp / d.maxHp * 100));
            if (quiet) resetTrail(trails.hero, heroPct);
            if (enemy !== lastEnemy) { lastEnemy = enemy; showEnemy(game, enemy, quiet); }
            quiet = false;

            el.heroBar.style.width = `${heroPct}%`;
            el.heroTrail.style.width = `${trailFor(trails.hero, heroPct, now, dt)}%`;
            setText(el.heroText, `${fmt(Math.max(0, c.hp))} / ${fmt(d.maxHp)}`);
            el.hero.classList.toggle('low', heroPct < 30);
            el.battle.classList.toggle('danger', c.active && heroPct < 30);
            el.heroAtk.style.width = c.active ? `${Math.min(100, c.playerTimer / d.attackInterval * 100)}%` : '0%';

            const foePct = Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100));
            el.foeBar.style.width = `${foePct}%`;
            el.foeTrail.style.width = `${trailFor(trails.foe, foePct, now, dt)}%`;
            setText(el.foeText, `${fmt(Math.max(0, enemy.hp))} / ${fmt(enemy.maxHp)}`);
            el.foeAtk.style.width = c.active && enemy === c.enemy ? `${Math.min(100, c.enemyTimer / enemy.interval * 100)}%` : '0%';

            const timed = enemy.boss && c.active && enemy === c.enemy;
            el.clock.hidden = !timed;
            el.foeAtkBar.hidden = timed; // the boss clock takes its place, so nothing below moves
            if (timed) {
                const limit = enemy.timeLimit || BALANCE.combat.bossTimeMs;
                el.clockBar.style.width = `${Math.max(0, c.bossTimeLeft / limit * 100)}%`;
                setText(el.clockText, `⏳ ${Math.ceil(Math.max(0, c.bossTimeLeft) / 1000)}s`);
                el.clock.classList.toggle('urgent', c.bossTimeLeft < 8000);
            }

            const regroup = c.mode === 'stages' && c.regroupLeft > 0;
            el.battle.classList.toggle('regroup', regroup);
            el.regroup.hidden = !regroup;
            if (regroup) setText(el.regroup, `⛺ Regrouping · boss in ${Math.ceil(c.regroupLeft / 1000)}s`);

            const combo = Math.floor(c.combo || 0);
            el.combo.hidden = combo <= 0;
            if (combo > 0) {
                setText(el.comboN, `${combo}×`);
                setText(el.comboBuffs, combo >= 30 ? 'crit · lifesteal · echo' : combo >= 20 ? 'crit · lifesteal' : combo >= 10 ? '+10% crit' : '');
                el.combo.dataset.tier = combo >= 30 ? 3 : combo >= 20 ? 2 : combo >= 10 ? 1 : 0;
            }
        },

        /** One game event (from the tick's event list). */
        event(ev, game) {
            if (root.hidden) return;
            switch (ev.type) {
                case 'hit': {
                    const { foe } = anchor();
                    if (ev.manual) {
                        spawnFx('dmg manual', fmt(ev.dmg), foe.x + jitter(30), foe.top + 6 + Math.random() * 16, 800);
                        break;
                    }
                    move(el.heroSprite, 'lunge');
                    move(el.foeSprite, ev.crit ? 'crit' : 'hurt');
                    spawnFx(`dmg${ev.crit ? ' crit' : ''}`, ev.crit ? `${fmt(ev.dmg)}!` : fmt(ev.dmg), foe.x + jitter(22), foe.top + Math.random() * 12, ev.crit ? 1100 : 900);
                    spawnFx('slash', '', foe.x, foe.mid + 6, 320);
                    break;
                }
                case 'enemyHit': {
                    const { hero } = anchor();
                    move(el.foeSprite, 'lungeLeft');
                    move(el.heroSprite, 'heroHurt');
                    spawnFx('dmg taken', `−${fmt(ev.dmg)}`, hero.x + jitter(24), hero.top + Math.random() * 12);
                    break;
                }
                case 'dodge': {
                    const { hero } = anchor();
                    move(el.heroSprite, 'dodge');
                    spawnFx('dmg dodge', 'Dodge!', hero.x, hero.top + 4);
                    break;
                }
                case 'kill': {
                    const { foe } = anchor();
                    const body = foe.bottom - (foe.bottom - foe.top) * 0.35;
                    const corpse = spawnFx(`corpse${ev.enemy.boss ? ' boss' : ''}${ev.enemy.gilded ? ' gilded' : ''}`, sprite(monsterSpriteKey(ev.enemy), { scale: fighterScale() + (ev.enemy.boss ? 1 : 0), fallback: esc(ev.enemy.icon || '👾') }), foe.x, body, 700);
                    if (corpse) spawnFx('puff', '', foe.x, body, 650);
                    coinBurst(ev.enemy.boss ? 7 : ev.enemy.gilded ? 6 : 1);
                    if (ev.enemy.gilded) spawnFx('dmg gilded-gold', `+${fmt(ev.gold)}`, foe.x, foe.top - 6, 1400);
                    ev.drops.filter(dr => !dr.item).slice(0, 3).forEach((dr, i) => spawnFx('drop-pop', `+${fmt(dr.qty)} ${resIcon(dr.id)}`, foe.x - 14 + i * 14, foe.bottom - 4, 1200));
                    if (ev.enemy.boss && !ev.enemy.titan && game.state.combat.mode === 'stages') {
                        banner(`<small>Victory</small><strong>${esc(ev.enemy.name.replace(' (Boss)', ''))} falls</strong><span>+${fmt(ev.gold)} gold</span>`, 'victory', 1800);
                    }
                    break;
                }
                case 'itemDropped': {
                    const rarity = RARITIES.find(r => r.id === ev.item.rarity);
                    if (!rarity || RARITIES.indexOf(rarity) < 2) break;
                    const { foe } = anchor();
                    const beam = spawnFx(`loot-beam r-${rarity.id}`, `<span>${sprite(itemSpriteKey(ev.item), { scale: 1, fallback: esc(ev.item.icon) })}</span>`, foe.x + jitter(16), Math.max(0, foe.bottom - 64), 2400);
                    if (beam) beam.style.setProperty('--beam', rarity.color);
                    break;
                }
                case 'levelUp': {
                    if (ev.skill !== 'combat') break;
                    const { hero } = anchor();
                    move(el.heroSprite, 'cheer');
                    spawnFx('dmg levelup', `Level ${ev.level}!`, hero.x, hero.top - 2, 1500);
                    break;
                }
                case 'death':
                    move(el.heroSprite, 'fallen');
                    move(el.battle, 'wounded');
                    banner(ev.mode === 'stages'
                        ? `<small>Defeated at stage ${ev.stage}</small><strong>You fall back</strong><span>Rest, then fight on</span>`
                        : `<small>Defeated</small><strong>${ev.mode === 'titan' ? 'The Titan stands' : 'The run is lost'}</strong>`, 'defeat', 2400);
                    break;
                case 'bossTimeout':
                    banner('<small>Out of time</small><strong>The boss holds out</strong><span>Regroup, then try again</span>', 'defeat', 2200);
                    break;
                case 'titan':
                    if (ev.won) banner('<small>Titan defeated</small><strong>+2% ATK and HP, forever</strong>', 'victory', 2400);
                    break;
                case 'dungeonClear':
                    banner(`<small>Dungeon cleared${ev.clears > 1 ? ` · ${ev.clears}×` : ''}</small><strong>${sprite('crate', { scale: 0.75, cls: 'soft' })} The chest is yours</strong>${ev.item ? `<span>${esc(ev.item.name)}</span>` : ''}`, 'victory', 2200);
                    break;
                case 'prestige':
                    banner(`<small>Prestige</small><strong>+${fmt(ev.tokens)} tokens</strong>`, 'victory', 2400);
                    break;
                default:
                    break;
            }
        }
    };
}
