// Charms (data/charms.js): bought with essence, a charge spent each time one bites (systems/skilling.js for the gloves and
// the bellows, systems/farming.js for the compost). The charges are mirrored into `meta.charms`, as the forge's levels
// are (core/state.js): a page still running the older game drops a field it doesn't know, and the essence paid with it.

import { CHARMS, charmById, charmCharges, chargesMax } from '../data/charms.js';
import { skillLevel } from '../core/modifiers.js';
import { log } from './progress.js';

export { charmCharges };

/** Has this charm opened in the Shop (its skill met the bottleneck it eases), or is any of it held? */
export const charmOpen = (state, charm) => !!state.settings?.devUnlockAll || charmCharges(state, charm.id) > 0 || charm.opens(state, id => skillLevel(state, id));

/** The charms the Shop offers now, in their order. */
export const charmsOnOffer = state => CHARMS.filter(c => charmOpen(state, c));

const mirror = state => { state.meta.charms = { ...state.charms }; };

/** Can one more purchase of this charm be carried? (Says why not.) */
export function charmRoom(game, charm) {
    if (charmCharges(game.state, charm.id) + charm.charges <= chargesMax(charm)) return true;
    game.emit({ type: 'error', text: `You carry as many ${charm.name} as you can.` });
    return false;
}

/** One purchase's charges added (they stack on any left), however paid for. */
export function addCharges(game, charm, paid) {
    const state = game.state;
    state.charms[charm.id] = charmCharges(state, charm.id) + charm.charges;
    mirror(state);
    log(game, `✨ ${charm.name}: +${charm.charges} charges, for ${paid}.`, 'info');
    game.emit({ type: 'charm', id: charm.id, charges: state.charms[charm.id] });
    game.markDirty();
}

/** Buy one charm's charges with essence. True if bought. */
export function buyCharm(game, id) {
    const state = game.state;
    const charm = charmById(id);
    if (!charm || !charmOpen(state, charm) || !charmRoom(game, charm)) return false;
    if ((state.resources.essence || 0) < charm.essence) { game.emit({ type: 'error', text: `${charm.name} costs ${charm.essence.toLocaleString('en-US')} essence.` }); return false; }
    state.resources.essence -= charm.essence;
    addCharges(game, charm, `${charm.essence.toLocaleString('en-US')} essence`);
    return true;
}

/** Spend a charge of a charm on the work it eases: true if there was one. The last one says so. */
export function useCharm(game, id) {
    const state = game.state;
    const left = charmCharges(state, id);
    if (!left) return false;
    state.charms[id] = left - 1;
    mirror(state);
    if (left === 1) {
        const charm = charmById(id);
        log(game, `✨ ${charm.name}: the last charge used.`, 'info');
        game.emit({ type: 'charmEmpty', id });
    }
    return true;
}
