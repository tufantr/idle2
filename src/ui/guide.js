// The guide's hand (src/systems/guide.js says what to point at): a white glove pointing at the one
// thing to do in a new hero's first minutes, pressing it gently, a ring opening where it presses. No
// words. It never takes a click (the thing under it does), waits a few seconds before it comes (a
// player who would do the thing anyway never sees it), and hides under dialogs and celebration cards. On the monster
// it gives up after a while if the player would rather watch, and comes back for the first boss,
// where a strike counts most.

import { sprite } from './sprites.js';
import { guideStep } from '../systems/guide.js';

const SCALE = 3;
const TIP = { x: 14, y: 6 };            // the fingertip in the hand's 32 px cell (tools/resource_art.py TAP_HAND)
const CELL = 32;
// A step holds this long before the hand comes: long enough that a player who would do it anyway never
// sees it (hints are for those who need them), short enough that one who doesn't is not left waiting.
const SHOW_AFTER_MS = { strike: 3000, equip: 1200, camp: 4000, retry: 1500, vein: 2500 };
const STRIKE_PATIENCE_MS = 15000;       // on the monster: then the player is left to watch, until the first boss

// Where each step points: the element, and the spot on it (fractions of its box).
const TARGETS = {
    strike: () => [document.querySelector('#scene .foe .fighter-stand'), 0.5, 0.6],
    equip: () => [document.querySelector('.dock-equip'), 0.5, 0.75],
    vein: () => [document.querySelector('#tab .node-card'), 0.5, 0.45],
    retry: () => [document.querySelector('#scene .stage-path li.boss button'), 0.5, 0.8],
    camp: id => [document.querySelector(`.camp-token[data-camp="${id}"] .camp-buy`), 0.5, 0.75]
};

export function createGuide(parent) {
    const hand = document.createElement('div');
    hand.className = 'guide-hand';
    hand.setAttribute('aria-hidden', 'true');
    hand.innerHTML = `<i class="guide-ring"></i><span class="guide-glove">${sprite('icon/tap', { scale: SCALE })}</span>`;
    hand.style.setProperty('--tip-x', `${TIP.x * SCALE}px`);
    hand.hidden = true;
    parent.appendChild(hand);
    let step = null;
    let since = 0;
    let lastFrame = 0;
    let strikeShown = 0;      // how long the hand has stood on the monster
    let bossBefore = false;

    function hide() { if (!hand.hidden) hand.hidden = true; }

    return {
        /** After each render: what to point at now (`view`: { battle, tab }). */
        sync(game, view) {
            const next = guideStep(game.state, game.derived, view);
            if (next !== step) { step = next; since = performance.now(); }
            const boss = !!game.state.combat.enemy?.boss;
            if (boss && !bossBefore) strikeShown = 0;   // a boss: worth pointing at the strike again
            bossBefore = boss;
        },

        /** Every animation frame: keep the hand on its target (`blocked` while a dialog or a card is up). */
        frame(blocked) {
            const now = performance.now();
            const dt = Math.min(250, now - (lastFrame || now));
            lastFrame = now;
            if (!step || blocked || now - since < (SHOW_AFTER_MS[step.split(':')[0]] ?? 1000)) return hide();
            if (step === 'strike') {
                if (strikeShown > STRIKE_PATIENCE_MS) return hide();
                strikeShown += dt;
            }
            const [kind, arg] = step.split(':');
            const [el, fx, fy] = TARGETS[kind]?.(arg) || [];
            const box = el?.getBoundingClientRect();
            if (!box || !box.width || box.bottom < 0 || box.top > window.innerHeight) return hide();
            // under the spot, finger up; where there is no room below (the dock at the foot of the
            // screen), above it, finger down
            const px = box.left + box.width * fx;
            let py = box.top + box.height * fy;
            const down = py + (CELL - TIP.y) * SCALE > window.innerHeight - 4;
            if (down) py = box.top + box.height * (1 - fy);
            const x = px - TIP.x * SCALE;
            const y = down ? py - (CELL - TIP.y) * SCALE : py - TIP.y * SCALE;
            hand.classList.toggle('down', down);
            hand.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
            if (hand.hidden) hand.hidden = false;
        }
    };
}
