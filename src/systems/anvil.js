// The anvil (Smithing): the weapons and armour the hero wears, reinforced and their bonuses rerolled with
// bars of their own metal and essence. Reinforcing works the slot, not the piece (data/workshop.js forge):
// its levels have no top and every piece worn there has them. Forging makes copper gear only; every
// stronger piece drops in the fight (DESIGN §3.25). The work pays the bars' smithing XP and practice in the
// metal's mastery, whose levels take bars off the price. Jewellery is upgraded and reforged with essence and
// gold instead (systems/inventory.js).

import { SMITHING_TYPES } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { reinforceCost, rerollCost, forgeMult, FORGE_MAX, METALS, ANVIL_LEVEL_PER_UPGRADE } from '../data/workshop.js';
import { forgeKey, MASTERY_MAX_LEVEL, MASTERY_XP_DIVISOR } from '../data/mastery.js';
import { xpForLevel } from '../core/xp.js';
import { skillLevel } from '../core/modifiers.js';
import { rerollAffixes } from '../core/formulas.js';
import { masteryLevel, masteryBonus, masteryXp, addMasteryXp } from './mastery.js';
import { grantXp, bumpStat } from './progress.js';
import { findGear } from './inventory.js';

/** A slot's forge: { level, tier } (core/state.js), the tier the best the slot has held. */
export const forgeOf = (state, slot) => state.forge?.[slot] || { level: 0, tier: 1 };
/** The slot's forge level (0 for jewellery's slots: their pieces are upgraded one by one). */
export const forgeLevel = (state, slot) => (SMITHING_TYPES.includes(slot) ? forgeOf(state, slot).level || 0 : 0);
/** The tier a slot's next level is priced at: the best it has held, or the piece worn there if better. */
export const forgeTier = (state, slot) => Math.max(forgeOf(state, slot).tier || 1, state.equipped?.[slot]?.tier || 1);
/** What the next level of a slot adds to its piece's base stats, as a share (0.05 is +5%). */
export const forgeStepGain = level => forgeMult(level + 1) / forgeMult(level) - 1;

/** True for gear the anvil works: weapons and armour. */
export const onAnvil = item => !!item && SMITHING_TYPES.includes(item.type);

/**
 * What a piece of work costs (`kind` 'reinforce' or 'reroll'), the metal's mastery taking bars off:
 * { bar, bars, essence, level, xp, ok, why } where `why` is '' (it can be done), 'max', 'none' (no
 * bonuses to reroll), 'level' (Smithing too low) or 'short' (not enough bars or essence). Reinforcing
 * works the slot of the piece (its type).
 */
export function anvilCost(state, item, kind = 'reinforce') {
    const level = forgeLevel(state, item.type);
    const base = kind === 'reroll' ? rerollCost(item) : reinforceCost(item.type, level, forgeTier(state, item.type));
    const mastery = masteryBonus(masteryLevel(state, 'smithing', forgeKey(base.bar)), { produces: false, hasInputs: true });
    const bars = Math.max(1, Math.ceil(base.bars * (1 - mastery.preserve)));
    let why = '';
    if (kind === 'reinforce' && level >= FORGE_MAX) why = 'max';
    else if (kind === 'reroll' && (!item.affixes?.length || item.uniqueId)) why = 'none';
    else if (skillLevel(state, 'smithing') < base.level) why = 'level';
    else if ((state.resources[base.bar] || 0) < bars || (state.resources.essence || 0) < base.essence) why = 'short';
    const { metal, ...rest } = base;
    return { ...rest, bars, ok: !why, why };
}

function refuse(game, item, cost) {
    const text = {
        max: 'That slot is as strong as the forge makes it.',
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

/** Reinforce the slot of a worn weapon or piece of armour one level: every piece worn there has it. */
export function reinforceItem(game, id) {
    const state = game.state;
    const item = findGear(state, id);
    if (!onAnvil(item)) return false;
    const slot = item.type;
    if (state.equipped[slot]?.id !== item.id) { game.emit({ type: 'error', text: 'Put it on first: the anvil works the slot it is worn in.' }); return false; }
    const cost = anvilCost(state, item, 'reinforce');
    if (!cost.ok) return refuse(game, item, cost);
    pay(game, cost);
    const forge = state.forge[slot] ||= { level: 0, tier: 1 };
    forge.tier = forgeTier(state, slot);
    forge.level = (forge.level || 0) + 1;
    (state.meta.forge ||= {})[slot] = forge.level;   // (kept in `meta` too: core/state.js sanitizeForge)
    bumpStat(game, 'reinforced');
    game.emit({ type: 'upgrade', item, anvil: true, slot, level: forge.level });
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

/**
 * Practise (the research loop's P-058, the owner's decision): a metal's bars worked for that metal's mastery alone. A slot
 * works only the best metal it has held, so a lower metal trained only by rerolling a worn piece of it (36,207 rerolls of
 * a copper chest piece for mastery 99). It pays what the anvil's jobs pay in mastery, a second of practice a bar paid, and
 * no faster: no mastery takes bars off it, and it gives no Smithing XP, no slot's levels and costs no essence. A tap takes
 * the bars to the metal's next mastery level, or as many as are held. { bar, bars, need, level, ok, why }: `bars` the
 * tap's, `need` to the next level, `why` '' (it can be done), 'level' (Smithing below the metal's), 'max' (mastery 99) or
 * 'short' (no bars of it).
 */
export function practiseCost(state, bar) {
    const metal = METALS.find(m => m.bar === bar);
    if (!metal) return null;
    const key = forgeKey(bar);
    const level = masteryLevel(state, 'smithing', key);
    const need = level >= MASTERY_MAX_LEVEL ? 0 : Math.max(1, Math.ceil(xpForLevel(level + 1) / MASTERY_XP_DIVISOR - masteryXp(state, 'smithing', key)));
    const held = Math.floor(state.resources[bar] || 0);
    let why = '';
    if (skillLevel(state, 'smithing') < Math.max(ANVIL_LEVEL_PER_UPGRADE, metal.levelReq)) why = 'level';
    else if (level >= MASTERY_MAX_LEVEL) why = 'max';
    else if (held < 1) why = 'short';
    return { bar, bars: Math.min(held, need), need, level, ok: !why, why };
}

/** Practise with a metal's bars (practiseCost): its mastery only, a second of practice a bar. */
export function practise(game, bar) {
    const state = game.state;
    const cost = practiseCost(state, bar);
    if (!cost) return false;
    if (!cost.ok) {
        const name = METALS.find(m => m.bar === bar).name;
        game.emit({ type: 'error', text: { level: `Smithing ${Math.max(ANVIL_LEVEL_PER_UPGRADE, METALS.find(m => m.bar === bar).levelReq)} is needed to work ${name.toLowerCase()}.`, max: `${name} is mastered.`, short: `No ${RESOURCES[bar].name.toLowerCase()}s to practise with.` }[cost.why] });
        return false;
    }
    state.resources[bar] -= cost.bars;
    addMasteryXp(game, 'smithing', forgeKey(bar), cost.bars);   // a second of practice a bar, as the jobs give
    bumpStat(game, 'barsWorked', cost.bars);
    game.emit({ type: 'practise', bar, bars: cost.bars, level: masteryLevel(state, 'smithing', forgeKey(bar)) });
    game.markDirty();
    return true;
}
