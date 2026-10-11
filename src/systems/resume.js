// A fight that interrupts the hero (the Titan's, the clan boss's) remembers what he was doing and gives
// it back when it ends: a fight goes on at the stages, work picks up where it stopped, a rest stays a
// rest (after a fall at the stages, the rest that ends in the fight).

import { resolveAction } from './skilling.js';

/** What the hero is doing now: { doing: 'fight' | 'work' | 'recover' | 'rest', action? }. */
export function doingNow(state) {
    const c = state.combat;
    if (c.active) return { doing: 'fight' };
    if (state.action) return { doing: 'work', action: { ...state.action } };
    return { doing: c.recovering ? 'recover' : 'rest' };
}

/**
 * Back to `before` (from doingNow), once the interrupting fight has returned to the stages. Returns
 * whether he fights on; with no `before` (a save from before it was kept) he fights on, as he did.
 */
export function resumeDoing(game, before) {
    const state = game.state;
    const c = state.combat;
    if (!before || before.doing === 'fight') return true;
    c.active = false;
    c.combo = 0;
    c.recovering = before.doing === 'recover';
    if (before.doing === 'work' && before.action) {
        state.action = { ...before.action, stalled: false };
        const def = resolveAction(state);
        if (def) game.emit({ type: 'actionStart', label: def.label, skill: def.skill });
    }
    game.markDirty();
    return false;
}

