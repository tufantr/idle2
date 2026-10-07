// The guide: in a new hero's first minutes a hand points at the one thing to do next, on the thing
// itself, and moves on once it is done. A strike on the monster, the sword the first monster left,
// the first camp upgrade, the boss's skull on the stage path while the hero regroups after it held out
// (a tap fights it again at once), and (on the Mining tab, before any skill has been worked) the first vein.
// No words: what is pointed at says what to do (docs/research_notes/first-session.md). Pure: it reads
// the stats the game keeps anyway, so it has nothing of its own to save; src/ui/guide.js draws it.

import { findUpgrade, gearIsLocked } from './inventory.js';
import { CAMP_UPGRADES } from '../data/camp.js';
import { campPrice } from './camp.js';
import { seen } from './disclosure.js';

/** Strikes on a monster before the hand leaves it. */
export const GUIDE_STRIKES = 3;

/** A hero still in his first minutes: no prestige yet, in the first three zones. */
export const newHero = state => !state.prestige?.count && (state.combat?.bestStage || 1) <= 30;

/** The camp upgrades on offer: the Armour Rack once the hero has defence for it to raise. */
export function campOnOffer(state, derived) {
    return CAMP_UPGRADES.filter(u => u.stat !== 'def' || (state.camp?.[u.id] || 0) > 0 || (derived?.def || 0) > 0);
}

/**
 * What the hand points at now, or null: 'equip' (the dock's Equip), 'camp:<id>' (that camp upgrade),
 * 'retry' (the boss on the stage path, while regrouping), 'strike' (the monster) or 'vein' (the first
 * card on the Mining tab). `view` says what the screen shows: `battle` when the fight is in sight,
 * `tab` the tab open.
 */
export function guideStep(state, derived, { battle = false, tab = null } = {}) {
    if (!newHero(state) || state.settings?.devUnlockAll) return null;
    const c = state.combat;
    if (battle && c.active && c.mode === 'stages' && c.enemy) {
        // the first piece of gear: nothing worn yet, and something in the bag to wear
        if (!Object.values(state.equipped).some(Boolean) && !gearIsLocked(state) && findUpgrade(state)) return 'equip';
        // the first camp upgrade, as soon as one is affordable (the cheapest)
        if (!state.stats.campLevels && seen(state, 'camp')) {
            const offer = campOnOffer(state, derived)
                .map(u => ({ u, cost: campPrice(state, u) }))
                .filter(o => state.gold >= o.cost)
                .sort((a, b) => a.cost - b.cost)[0];
            if (offer) return `camp:${offer.u.id}`;
        }
        if (c.regroupLeft > 0 && !c.farmMode && !c.enemy.boss) return 'retry';
        if ((state.stats.strikes || 0) < GUIDE_STRIKES) return 'strike';
    }
    if (tab === 'mining' && !state.action && !Object.values(state.stats.actionsBySkill || {}).some(n => n > 0)) return 'vein';
    return null;
}
