// The anvil (Smithing): the weapons and armour the hero wears, reinforced (+1 to +10) and their
// bonuses rerolled with bars of their own metal and essence. Forging makes copper gear only; every
// stronger piece drops in the fight (DESIGN §3.25). The work pays the bars' smithing XP and practice
// in the metal's mastery, whose levels take bars off the price. Jewellery is upgraded and reforged
// with essence and gold instead (systems/inventory.js).

import { SMITHING_TYPES, MAX_UPGRADE } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { reinforceCost, rerollCost } from '../data/workshop.js';
import { forgeKey } from '../data/mastery.js';
import { skillLevel } from '../core/modifiers.js';
import { rerollAffixes } from '../core/formulas.js';
import { masteryLevel, masteryBonus, addMasteryXp } from './mastery.js';
import { grantXp, bumpStat } from './progress.js';
import { findGear } from './inventory.js';

/** True for gear the anvil works: weapons and armour. */
export const onAnvil = item => !!item && SMITHING_TYPES.includes(item.type);

/**
 * What a piece of work costs (`kind` 'reinforce' or 'reroll'), the metal's mastery taking bars off:
 * { bar, bars, essence, level, xp, ok, why } where `why` is '' (it can be done), 'max', 'none' (no
 * bonuses to reroll), 'level' (Smithing too low) or 'short' (not enough bars or essence).
 */
export function anvilCost(state, item, kind = 'reinforce') {
    const base = kind === 'reroll' ? rerollCost(item) : reinforceCost(item);
    const mastery = masteryBonus(masteryLevel(state, 'smithing', forgeKey(base.bar)), { produces: false, hasInputs: true });
    const bars = Math.max(1, Math.ceil(base.bars * (1 - mastery.preserve)));
    let why = '';
    if (kind === 'reinforce' && (item.upgrade || 0) >= MAX_UPGRADE) why = 'max';
    else if (kind === 'reroll' && (!item.affixes?.length || item.uniqueId)) why = 'none';
    else if (skillLevel(state, 'smithing') < base.level) why = 'level';
    else if ((state.resources[base.bar] || 0) < bars || (state.resources.essence || 0) < base.essence) why = 'short';
    const { metal, ...rest } = base;
    return { ...rest, bars, ok: !why, why };
}

function refuse(game, item, cost) {
    const text = {
        max: 'That piece is fully reinforced.',
        none: item.uniqueId ? 'Unique items have fixed bonuses.' : 'Common pieces have no bonuses to reroll.',
        level: `Smithing ${cost.level} is needed for that.`,
        short: `That takes ${cost.bars} ${RESOURCES[cost.bar].name}${cost.bars === 1 ? '' : 's'} and ${cost.essence} essence.`
    }[cost.why];
    game.emit({ type: 'error', text });
    return false;
}

function pay(game, cost) {
    const state = game.state;
    state.resources[cost.bar] -= cost.bars;
    state.resources.essence -= cost.essence;
    grantXp(game, 'smithing', cost.xp * game.derived.xpMult);
    addMasteryXp(game, 'smithing', forgeKey(cost.bar), cost.bars);   // a second of practice a bar
    bumpStat(game, 'barsWorked', cost.bars);
}

/** Reinforce a weapon or piece of armour one level (+5% base stats). */
export function reinforceItem(game, id) {
    const item = findGear(game.state, id);
    if (!onAnvil(item)) return false;
    const cost = anvilCost(game.state, item, 'reinforce');
    if (!cost.ok) return refuse(game, item, cost);
    pay(game, cost);
    item.upgrade = (item.upgrade || 0) + 1;
    item.barsIn = (item.barsIn || 0) + cost.bars;
    bumpStat(game, 'reinforced');
    game.emit({ type: 'upgrade', item, anvil: true });
    game.markDirty();
    return true;
}

/** Reroll a weapon's or armour's bonuses (not its rarity or base stats). */
export function rerollItem(game, id) {
    const item = findGear(game.state, id);
    if (!onAnvil(item)) return false;
    const cost = anvilCost(game.state, item, 'reroll');
    if (!cost.ok) return refuse(game, item, cost);
    pay(game, cost);
    rerollAffixes(item);
    item.reforges = (item.reforges || 0) + 1;
    bumpStat(game, 'reforges');
    game.emit({ type: 'reforge', item, anvil: true });
    game.markDirty();
    return true;
}
