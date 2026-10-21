// The jeweller's bench (Crafting): the rings, earrings and amulet the hero wears, upgraded and their bonuses rerolled
// with gems of their tier and essence (data/workshop.js benchUpgradeCost, benchRerollCost), as the anvil works weapons
// and armour with bars (systems/anvil.js). The work pays the gems' Crafting XP and practice in their jewellery's
// mastery, whose levels take gems off the price. A piece's upgrades are its own (the Inventory sold them for gold and
// essence before the bench); the gems they took come back three quarters on salvage (systems/inventory.js).

import { CRAFTING_TYPES, EQUIP_SLOTS, MAX_UPGRADE } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { benchUpgradeCost, benchRerollCost } from '../data/workshop.js';
import { jewelKey } from '../data/mastery.js';
import { skillLevel } from '../core/modifiers.js';
import { rerollAffixes } from '../core/formulas.js';
import { masteryLevel, masteryBonus, addMasteryXp } from './mastery.js';
import { grantXp, bumpStat } from './progress.js';
import { findGear } from './inventory.js';

/** True for gear the bench works: jewellery. */
export const onBench = item => !!item && CRAFTING_TYPES.includes(item.type);

const worn = (state, item) => EQUIP_SLOTS.some(slot => state.equipped[slot]?.id === item.id);

/**
 * What a piece of work costs (`kind` 'upgrade' or 'reroll'), the gem's mastery taking gems off:
 * { gem, gems, essence, level, xp, ok, why } where `why` is '' (it can be done), 'max', 'none' (no bonuses to
 * reroll), 'level' (Crafting too low) or 'short' (not enough gems or essence).
 */
export function benchCost(state, item, kind = 'upgrade') {
    const base = kind === 'reroll' ? benchRerollCost(item) : benchUpgradeCost(item.type, item.upgrade || 0, item.tier || 1);
    const mastery = masteryBonus(masteryLevel(state, 'crafting', jewelKey(base.gem)), { produces: false, hasInputs: true });
    const gems = Math.max(1, Math.ceil(base.gems * (1 - mastery.preserve)));
    let why = '';
    if (kind === 'upgrade' && (item.upgrade || 0) >= MAX_UPGRADE) why = 'max';
    else if (kind === 'reroll' && (!item.affixes?.length || item.uniqueId)) why = 'none';
    else if (skillLevel(state, 'crafting') < base.level) why = 'level';
    else if ((state.resources[base.gem] || 0) < gems || (state.resources.essence || 0) < base.essence) why = 'short';
    return { ...base, gems, ok: !why, why };
}

function refuse(game, item, cost) {
    const text = {
        max: 'That piece is fully upgraded.',
        none: item.uniqueId ? 'Unique items have fixed bonuses.' : 'Common pieces have no bonuses to reroll.',
        level: `Crafting ${cost.level} is needed for that.`,
        short: `That takes ${cost.gems} ${RESOURCES[cost.gem].name} and ${cost.essence} essence.`
    }[cost.why];
    game.emit({ type: 'error', text });
    return false;
}

/** The piece, if the bench may work it: jewellery the hero wears. */
function piece(game, id) {
    const item = findGear(game.state, id);
    if (!onBench(item)) return null;
    if (!worn(game.state, item)) { game.emit({ type: 'error', text: 'Put it on first: the bench works what the hero wears.' }); return null; }
    return item;
}

function pay(game, cost) {
    const state = game.state;
    state.resources[cost.gem] -= cost.gems;
    state.resources.essence -= cost.essence;
    grantXp(game, 'crafting', cost.xp * game.derived.xpMult);
    addMasteryXp(game, 'crafting', jewelKey(cost.gem), cost.gems);   // a second of practice a gem
    bumpStat(game, 'gemsWorked', cost.gems);
}

/** Upgrade a worn piece of jewellery one level (+UPGRADE_STEP of its base stats), up to MAX_UPGRADE. */
export function upgradeJewel(game, id) {
    const item = piece(game, id);
    if (!item) return false;
    const cost = benchCost(game.state, item, 'upgrade');
    if (!cost.ok) return refuse(game, item, cost);
    pay(game, cost);
    item.upgrade = (item.upgrade || 0) + 1;
    item.gemsIn = (item.gemsIn || 0) + cost.gems;
    bumpStat(game, 'jewelsUpgraded');
    game.emit({ type: 'upgrade', item, bench: true });
    game.markDirty();
    return true;
}

/** Reroll a worn piece of jewellery's bonuses (not its rarity or base stats). */
export function rerollJewel(game, id) {
    const item = piece(game, id);
    if (!item) return false;
    const cost = benchCost(game.state, item, 'reroll');
    if (!cost.ok) return refuse(game, item, cost);
    pay(game, cost);
    rerollAffixes(item);
    item.reforges = (item.reforges || 0) + 1;
    bumpStat(game, 'reforges');
    game.emit({ type: 'reforge', item, bench: true });
    game.markDirty();
    return true;
}
