// The jeweller's bench (Crafting): the jewellery the hero wears, worked with gems and essence (data/workshop.js
// benchUpgradeCost, benchRerollCost), as the anvil works weapons and armour with bars (systems/anvil.js), and by its
// rules: upgrading works the slot, not the piece, so its levels have no top and every ring, earring or amulet worn there
// has them; rerolling works the piece's own bonuses. The work pays half the gems' Crafting XP and practice in their
// jewellery's mastery, whose levels take gems off the price.

import { CRAFTING_TYPES } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { BENCH_SLOTS, FORGE_MAX, benchUpgradeCost, benchRerollCost } from '../data/workshop.js';
import { jewelKey } from '../data/mastery.js';
import { skillLevel } from '../core/modifiers.js';
import { rerollAffixes } from '../core/formulas.js';
import { masteryLevel, masteryBonus, addMasteryXp } from './mastery.js';
import { grantXp, bumpStat } from './progress.js';
import { findGear } from './inventory.js';

/** True for gear the bench works: jewellery. */
export const onBench = item => !!item && CRAFTING_TYPES.includes(item.type);
/** The jewellery slot a piece is worn in, or null. */
export const benchSlotOf = (state, item) => BENCH_SLOTS.find(slot => item && state.equipped?.[slot]?.id === item.id) || null;
/** A jewellery slot's bench levels (0 for any other slot: weapons' and armour's are the forge's). */
export const benchLevel = (state, slot) => (BENCH_SLOTS.includes(slot) ? state.bench?.[slot]?.level || 0 : 0);
/** The tier a slot's next level is priced at: the best it has held, or the piece worn there if better. */
export const benchTier = (state, slot) => Math.max(state.bench?.[slot]?.tier || 1, state.equipped?.[slot]?.tier || 1);

/**
 * What a piece of work costs (`kind` 'upgrade' or 'reroll'), the gem's mastery taking gems off:
 * { gem, gems, essence, level, xp, ok, why } where `why` is '' (it can be done), 'max', 'none' (no bonuses to
 * reroll), 'level' (Crafting too low) or 'short' (not enough gems or essence). Upgrading works the slot of the piece.
 */
export function benchCost(state, item, kind = 'upgrade') {
    const slot = benchSlotOf(state, item);
    const level = benchLevel(state, slot);
    const base = kind === 'reroll' ? benchRerollCost(item) : benchUpgradeCost(item.type, level, slot ? benchTier(state, slot) : item.tier || 1);
    const mastery = masteryBonus(masteryLevel(state, 'crafting', jewelKey(base.gem)), { produces: false, hasInputs: true });
    const gems = Math.max(1, Math.ceil(base.gems * (1 - mastery.preserve)));
    let why = '';
    if (kind === 'upgrade' && level >= FORGE_MAX) why = 'max';
    else if (kind === 'reroll' && (!item.affixes?.length || item.uniqueId)) why = 'none';
    else if (skillLevel(state, 'crafting') < base.level) why = 'level';
    else if ((state.resources[base.gem] || 0) < gems || (state.resources.essence || 0) < base.essence) why = 'short';
    return { ...base, gems, ok: !why, why };
}

function refuse(game, item, cost) {
    const text = {
        max: 'That slot is as strong as the bench makes it.',
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
    if (!benchSlotOf(game.state, item)) { game.emit({ type: 'error', text: 'Put it on first: the bench works what the hero wears.' }); return null; }
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

/** Upgrade the slot of a worn piece of jewellery one level: every piece worn there has it. */
export function upgradeJewel(game, id) {
    const state = game.state;
    const item = piece(game, id);
    if (!item) return false;
    const slot = benchSlotOf(state, item);
    const cost = benchCost(state, item, 'upgrade');
    if (!cost.ok) return refuse(game, item, cost);
    pay(game, cost);
    const levels = (state.bench ||= {})[slot] ||= { level: 0, tier: 1 };
    levels.tier = benchTier(state, slot);
    levels.level = (levels.level || 0) + 1;
    (state.meta.bench ||= {})[slot] = levels.level;   // (kept in `meta` too: core/state.js sanitizeBench)
    bumpStat(game, 'jewelsUpgraded');
    game.emit({ type: 'upgrade', item, bench: true, slot, level: levels.level });
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
