// Potions on the clock (data/potions.js), one pick for each place: the combat potion (`combat.potion`) while
// the hero fights on the stages, against the Titan or against the clan boss; the dungeon potion
// (`combat.dungeonPotion`) while he fights a dungeon run (systems/combat.js); the skill potion (`workPotion`)
// while he works at a skill (game.js, and the offline replay of work in systems/offline.js). A dose lasts
// POTION_MINUTES of its own work and its clock stops while he does something else; when one runs out the next
// is drunk at once, while there are more. A potion starting or running out changes the hero's numbers, so the
// game is marked dirty.

import { POTIONS, POTION_MINUTES, potionsForSlot } from '../data/potions.js';
import { trialBite } from '../data/trials.js';

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

/** `ms` of fighting: the dungeon potion in a run, the combat potion everywhere else (the clan boss too). */
export function spendFightPotion(game, ms) {
    const c = game.state.combat;
    if (c.mode !== 'clan' && trialBite(game.state).noPotion) return;   // Fasting: no potion is drunk in the Trial's run
    if (c.mode === 'dungeon') spend(game, c.dungeonPotion, () => c.dungeonPotionMs || 0, v => { c.dungeonPotionMs = v; }, ms);
    else spend(game, c.potion, () => c.potionMs || 0, v => { c.potionMs = v; }, ms);
}

/** The skill potion: `ms` of work at a skill. */
export function spendWorkPotion(game, ms) {
    const w = game.state.workPotion;
    if (!w) return;
    spend(game, w.id, () => w.ms || 0, v => { w.ms = v; }, ms);
}

/** Can this slot ('combat', 'dungeon' or 'skill') hold this potion? ('none' empties it.) */
export const fitsSlot = (slot, id) => id === 'none' || potionsForSlot(slot).includes(id);

/** Pick the combat potion (or 'none'): a dose of another potion stops working. */
export function setPotion(game, id) {
    const c = game.state.combat;
    if (!fitsSlot('combat', id) || c.potion === id) return;
    c.potion = id;
    c.potionMs = 0;
    game.markDirty();
}

/** Pick the dungeon potion (or 'none'): a dungeon potion, or a combat potion at half its strength. */
export function setDungeonPotion(game, id) {
    const c = game.state.combat;
    if (!fitsSlot('dungeon', id) || c.dungeonPotion === id) return;
    c.dungeonPotion = id;
    c.dungeonPotionMs = 0;
    game.markDirty();
}

/** Pick the skill potion (or 'none'). */
export function setWorkPotion(game, id) {
    const state = game.state;
    if (!fitsSlot('skill', id) || state.workPotion.id === id) return;
    state.workPotion = { id, ms: 0 };
    game.markDirty();
}
