// Potions on the clock (data/potions.js): a dose lasts POTION_MINUTES of its work, the fight potion's while
// the hero fights (systems/combat.js) and the work potion's while he works at a skill (game.js, and the
// offline replay of work in systems/offline.js); when one runs out the next is drunk at once, while there
// are more. A potion starting or running out changes the hero's numbers, so the game is marked dirty.

import { POTIONS, POTION_MINUTES } from '../data/potions.js';

/** A dose's length for this hero, in ms (the Alchemist medal makes it longer). */
export function doseMs(derived) {
    return Math.round(POTION_MINUTES * 60000 * (derived?.potionDuration || 1));
}

/** Spend `ms` of the dose of `id` (its time left read and written through getMs/setMs), drinking as it runs out. */
function spend(game, id, getMs, setMs, ms) {
    const state = game.state;
    if (!POTIONS[id]) { if (getMs() > 0) { setMs(0); game.markDirty(); } return; }
    let left = getMs();
    // none working: drink one as the work starts, so its first moment counts
    if (left <= 0) {
        if (!(state.resources[id] > 0)) return;
        state.resources[id] -= 1;
        left = doseMs(game.derived);
        game.markDirty();
    }
    left -= ms;
    while (left <= 0) {
        if (!(state.resources[id] > 0)) { left = 0; game.markDirty(); break; }   // the last one ran out
        state.resources[id] -= 1;
        left += doseMs(game.derived);
    }
    setMs(left);
}

/** The fight potion: `ms` of fighting (never in the clan boss's fight, which takes none). */
export function spendFightPotion(game, ms) {
    const c = game.state.combat;
    if (c.mode === 'clan') return;
    spend(game, c.potion, () => c.potionMs || 0, v => { c.potionMs = v; }, ms);
}

/** The work potion: `ms` of work at a skill. */
export function spendWorkPotion(game, ms) {
    const w = game.state.workPotion;
    if (!w) return;
    spend(game, w.id, () => w.ms || 0, v => { w.ms = v; }, ms);
}

/** Pick the fight potion (or 'none'): a dose of another potion stops working. */
export function setPotion(game, id) {
    const state = game.state;
    if (id !== 'none' && POTIONS[id]?.use !== 'fight') return;
    if (state.combat.potion !== id) {
        state.combat.potion = id;
        state.combat.potionMs = 0;
        game.markDirty();
    }
}

/** Pick the work potion (or 'none'). */
export function setWorkPotion(game, id) {
    const state = game.state;
    if (id !== 'none' && POTIONS[id]?.use !== 'work') return;
    if (state.workPotion.id !== id) {
        state.workPotion = { id, ms: 0 };
        game.markDirty();
    }
}

