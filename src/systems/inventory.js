// Equipment and resource management: the bag, equip/unequip, sell, salvage, lock. (Weapons and armour are worked at the
// anvil, systems/anvil.js; jewellery at the jeweller's bench, systems/bench.js.)

import {
    TYPE_SLOTS, EQUIP_SLOTS, MAX_UPGRADE, TIER_WEAR_LEVEL, RARITIES,
    BAG_SIZE, BAG_UPGRADE, salvageEssence, upgradeEssenceRefund, SALVAGE_MATERIAL_RETURN, codexKey,
    SMITHING_TYPES, AUTO_SALVAGE_OPTIONS, DROP_TYPE_WEIGHTS, DROP_EMPTY_SLOT_MULT, DROP_BEHIND_SLOT_MULT, SLOT_STATS, STAT_UNIT, GEAR_TIERS
} from '../data/items.js';
import { salvageBars, ANVIL_REFUND } from '../data/workshop.js';
import { RESOURCES, sellValue } from '../data/resources.js';
import { GOLD_SHOP } from '../data/perks.js';
import { itemSellValue, goldPerKillAtStage, rerollAffixes, abyssDropMult, BALANCE } from '../core/formulas.js';
import { skillLevel, deriveStats } from '../core/modifiers.js';
import { isUnlocked } from '../data/unlocks.js';
import { rng } from '../core/rng.js';
import { log, bumpStat } from './progress.js';
import { dungeonTier, uniqueTierOf } from './dungeon.js';
import { wallJudge, judgeOf } from './worth.js';

const RARITY_ORDER = RARITIES.map(r => r.id);
const rarityIndex = id => Math.max(0, RARITY_ORDER.indexOf(id));

export function findItem(state, id) {
    const index = state.inventory.findIndex(item => item.id === id);
    return index === -1 ? null : { item: state.inventory[index], index };
}

/** An item by id, in the bag or worn. */
export function findGear(state, id) {
    return findItem(state, id)?.item || EQUIP_SLOTS.map(s => state.equipped[s]).find(i => i && i.id === id) || null;
}

/**
 * The drop table's kinds, weighted for this hero where the gear tier is `zoneTier`: a weapon or armour kind with an
 * empty slot is DROP_EMPTY_SLOT_MULT times as likely, a kind whose worn piece is of a lower tier
 * DROP_BEHIND_SLOT_MULT times (core/formulas.js generateDrop).
 */
export function dropTypesFor(state, zoneTier) {
    return DROP_TYPE_WEIGHTS.map(entry => {
        const worn = (TYPE_SLOTS[entry.type] || []).map(slot => state.equipped[slot]);
        // (jewellery takes its plain share for an empty slot: since it drops at every rarity, five empty slots ×4 made
        // nearly a third of a new hero's drops rings and amulets in place of the armour he needs first)
        const empty = worn.some(i => !i) ? (SMITHING_TYPES.includes(entry.type) ? DROP_EMPTY_SLOT_MULT : 1) : null;
        const mult = empty ?? (Math.min(...worn.map(i => i.tier || 1)) < zoneTier ? DROP_BEHIND_SLOT_MULT : 1);
        return { type: entry.type, weight: entry.weight * mult };
    });
}


/**
 * The worn weapon or armour that lags furthest behind what a place drops: { type, ratio }, where ratio is
 * the worn piece's score against a common piece of that kind from the place (its tier, at its Abyss
 * depth); 0 for an empty slot. The pity count only runs where this is below PITY_LAG (combat.js): a
 * boss whose drops could not beat anything worn (a re-climb through shallower depths) marks nothing.
 */
export const PITY_LAG = 0.95;
export function laggingSlot(state, zone, skip = []) {
    const power = GEAR_TIERS[Math.max(1, Math.min(GEAR_TIERS.length, zone.gearTier)) - 1].power * abyssDropMult(zone.depth || 0);
    let worst = null;
    for (const type of SMITHING_TYPES) {
        if (skip.includes(type)) continue;
        const slot = SLOT_STATS[type];
        const place = STAT_UNIT * power * (slot.atk + slot.def);
        const ratio = state.equipped[type] ? itemScore(state.equipped[type]) / place : 0;
        if (!worst || ratio < worst.ratio) worst = { type, ratio };
    }
    return worst;
}


/**
 * The slot a sure piece goes to ({ type, ratio }: a Lord's due, the bosses' due, systems/combat.js): the weapon or armour
 * that lags furthest by score (laggingSlot), or, with BALANCE.rewards.dueByWorth, the one where a piece of the place's
 * tier at its depth (of `rarity`, its bonuses taken as those worn there) would add the most stages at the hero's wall
 * (systems/worth.js); an empty slot first, and the laggard again if no slot would gain. `ratio` stays the laggard's, for
 * the pity count's gate.
 */
export function dueSlot(state, zone, skip = [], { rarity = 'rare', judge = null } = {}) {
    const lag = laggingSlot(state, zone, skip);
    if (!BALANCE.rewards.dueByWorth || !lag) return lag;
    const j = judge || wallJudge(state);
    const power = GEAR_TIERS[Math.max(1, Math.min(GEAR_TIERS.length, zone.gearTier)) - 1].power * abyssDropMult(zone.depth || 0);
    const quality = (RARITIES.find(r => r.id === rarity) || RARITIES[2]).quality;
    let best = null;
    for (const type of SMITHING_TYPES) {
        if (skip.includes(type)) continue;
        const base = STAT_UNIT * power * quality;
        const piece = { type, atk: Math.round(base * SLOT_STATS[type].atk), def: Math.round(base * SLOT_STATS[type].def), affixes: state.equipped[type]?.affixes || [] };
        const stages = j.worth(piece, type);
        if (!best || stages > best.stages) best = { type, stages };
    }
    return best && best.stages > UPGRADE_EPS ? { type: best.type, ratio: lag.ratio } : lag;
}

export function canWear(state, item) {
    return skillLevel(state, 'combat') >= (TIER_WEAR_LEVEL[item.tier] || 1);
}

/**
 * Rough power of an item (affixes count; the anvil's and the bench's levels belong to the slots, data/workshop.js, so
 * any piece worn there has them). Pieces are judged by what they are worth at the wall (systems/worth.js); this breaks
 * ties, and the bosses' due still counts by it (outscores).
 */
export function itemScore(item) {
    if (!item) return -1;
    return (item.atk || 0) + (item.def || 0) + 5 * (item.affixes?.length || 0);
}

/**
 * True if the item outscores what is worn in a slot it fits (empty slots count as beaten): the old test, by itemScore.
 * The bosses' due reads it (systems/combat.js pityMark: an upgrade wipes its marks), so the drops come as they did.
 */
export function outscores(state, item) {
    const slots = TYPE_SLOTS[item.type] || [];
    return slots.some(slot => itemScore(item) > itemScore(state.equipped[slot]));
}

/** Less than this many stages better is the same (rounding in the sums). */
const UPGRADE_EPS = 1e-9;

/**
 * True if wearing the item makes the hero stronger at his wall: an empty slot it fits, or more stages there than the piece
 * worn (systems/worth.js). `judge` is the wall's (judgeOf for a Game); without one it is made for this state on first need.
 */
export function isUpgrade(state, item, judge = wallJudge(state)) {
    return judge.place(item).stages > UPGRADE_EPS;
}

/** The slot an Equip puts an item in: its kind's one, or an empty one, else where it is worth the most (systems/worth.js). */
function slotFor(state, item) {
    const slots = TYPE_SLOTS[item.type] || [];
    return slots.length < 2 ? slots[0] : wallJudge(state).place(item).slot;
}

/**
 * What wearing `item` does to the hero, all bonuses counted: his attack, defence and max health after, as
 * ratios to before (0.38 is +38%; Infinity where he had none), and his damage a second at a boss (`dps`, crits
 * and swing time counted), in the slot equipItem would choose (with its forge levels). The fight's Equip, the
 * bag and the equip itself say it, so a better piece is seen to make him stronger (the owner, October 2026: a
 * legendary should be felt).
 */
export function equipGain(state, item, slot = slotFor(state, item)) {
    const before = deriveStats(state);
    const after = deriveStats({ ...state, equipped: { ...state.equipped, [slot]: item } });
    const ratio = (a, b) => (b > 0 ? a / b - 1 : a > 0 ? Infinity : 0);
    const dps = s => s.atk * (1 + s.critChance * (s.critDmg - 1)) / s.attackInterval;
    return { atk: ratio(after.atk, before.atk), def: ratio(after.def, before.def), hp: ratio(after.maxHp, before.maxHp), dps: ratio(dps(after), dps(before)) };
}

/**
 * About how many stages a change in the hero's attack, defence and health (`gain`, as equipGain gives it) is worth
 * at his wall, the one measure of systems/worth.js: the damage a second where the boss must fall in time, defence
 * (below its 90% cap) and health where his blow still threatens, whichever moves more. Null when it can't be said (a
 * slot that was empty). `judge`: the wall's, if one is at hand.
 */
export function gainStages(state, gain, judge = wallJudge(state)) {
    if (!gain || ![gain.atk, gain.def, gain.hp].every(Number.isFinite)) return null;
    return judge.stagesOf(gain);
}

/**
 * The best wearable upgrade in the bag, if any: { item, slot, stages } (the fight's one-tap Equip), the one that takes
 * the hero furthest at his wall (systems/worth.js; a piece for an empty slot first).
 */
export function findUpgrade(state, judge = wallJudge(state)) {
    let best = null;
    for (const item of state.inventory) {
        if (!canWear(state, item)) continue;
        const { slot, stages } = judge.place(item);
        if (!(stages > UPGRADE_EPS)) continue;
        if (!best || stages > best.stages || (stages === best.stages && itemScore(item) > itemScore(best.item))) best = { item, slot, stages };
    }
    return best;
}

/**
 * The bag's pieces by what they add where an Equip would put them, best first ({ item, stages }; an empty slot's at the
 * top, ties by itemScore): the bag's order, and what the keep list and the full bag read.
 */
export function bagByWorth(state, judge = wallJudge(state), items = state.inventory) {
    return items.map(item => ({ item, stages: judge.place(item).stages }))
        .sort((a, b) => (b.stages - a.stages) || (itemScore(b.item) - itemScore(a.item)) || 0);
}

/** Bag items worth equipping: the best of their type in the bag (one per slot) that beat what is worn. */
function neededInBag(state, judge = wallJudge(state)) {
    const needed = new Set();
    const byType = {};
    for (const entry of bagByWorth(state, judge)) (byType[entry.item.type] ||= []).push(entry);
    for (const [type, entries] of Object.entries(byType)) {
        for (const { item, stages } of entries.slice(0, (TYPE_SLOTS[type] || []).length)) if (stages > UPGRADE_EPS) needed.add(item);
    }
    return needed;
}

/**
 * The spare uniques the bag keeps for the Seal: one copy of each of the open tier's (a locked one if it holds one), since
 * the Seal hands in a copy from the bag before a worn one (systems/dungeon.js sealDungeons). `items` is the bag to look
 * in (with a piece about to land, addItem). Every other spare can go, to the bag's Salvage weaker too (a player's ask,
 * 29 October 2026: the first copy arrives locked, and a spare is fragments' worth).
 */
function keptForSeal(state, items = state.inventory) {
    const tier = dungeonTier(state);
    const kept = new Map();
    for (const item of items) {
        if (!item.uniqueId || uniqueTierOf(item) !== tier) continue;
        const held = kept.get(item.uniqueId);
        if (!held || (item.locked && !held.locked)) kept.set(item.uniqueId, item);
    }
    return new Set(kept.values());
}

/**
 * What the bag's Salvage weaker takes: every unlocked piece that wouldn't improve what is worn (crafted gear too, since
 * it was asked for), and a dungeon's spare uniques but the ones kept for the Seal.
 */
export function weakerInBag(state, judge = wallJudge(state)) {
    const needed = neededInBag(state, judge);
    const seal = keptForSeal(state);
    return state.inventory.filter(i => !i.locked && !needed.has(i) && !seal.has(i) && !isUpgrade(state, i, judge));
}

/** The bag's room: BAG_SIZE, and BAG_UPGRADE.slots more for each upgrade bought. */
export function bagSize(state) {
    return BAG_SIZE + BAG_UPGRADE.slots * Math.max(0, Math.min(BAG_UPGRADE.max, state?.bagUpgrades || 0));
}

/** Gold for the next bag upgrade (kills' worth of gold at the best stage, rising each time), or null at the most. */
export function bagUpgradePrice(game) {
    const bought = game.state.bagUpgrades || 0;
    if (bought >= BAG_UPGRADE.max) return null;
    return Math.ceil(BAG_UPGRADE.kills * Math.pow(BAG_UPGRADE.growth, bought) * goldPerKillAtStage(game.state.combat.bestStage));
}

/** Essence for the next bag upgrade instead (BAG_UPGRADE.essence, rising each time as the gold does), or null at the most. */
export function bagUpgradeEssence(state) {
    const bought = state.bagUpgrades || 0;
    return bought >= BAG_UPGRADE.max ? null : Math.ceil(BAG_UPGRADE.essence * Math.pow(BAG_UPGRADE.growth, bought));
}

/** The next bag upgrade, for gold (`currency` 'gold') or for essence ('essence'). */
export function buyBagUpgrade(game, currency = 'gold') {
    const state = game.state;
    const essence = currency === 'essence';
    const price = essence ? bagUpgradeEssence(state) : bagUpgradePrice(game);
    if (price === null) { game.emit({ type: 'error', text: 'The bag is as big as it gets.' }); return false; }
    if (essence) {
        if ((state.resources.essence || 0) < price) { game.emit({ type: 'error', text: 'Not enough essence.' }); return false; }
        state.resources.essence -= price;
    } else {
        if (state.gold < price) { game.emit({ type: 'error', text: 'Not enough gold.' }); return false; }
        state.gold -= price;
        bumpStat(game, 'goldSpent', price);
    }
    state.bagUpgrades = (state.bagUpgrades || 0) + 1;
    log(game, `🎒 The bag holds ${bagSize(state)} now.`, 'info');
    game.markDirty();
    return true;
}

// ---------- adding items: the bag rules ----------

/**
 * Put a new item in the bag. Drops at or below the auto-salvage rarity are salvaged straight away
 * unless they would be an upgrade. If the bag is full, the weakest unlocked item — possibly the new
 * one — is salvaged (never the best upgrade for a slot), so nothing is ever silently thrown away.
 * Returns { kept, salvaged }.
 */
/** Note a piece of gear in the codex (data/items.js): the first of its kind and tier fills a page. */
export function markCodex(state, item) {
    if (!item?.type || !TYPE_SLOTS[item.type]) return false;
    const key = codexKey(item);
    if (state.codex[key]) return false;
    state.codex[key] = true;
    state.stats.codexFound = Object.keys(state.codex).length;
    return true;
}

export function addItem(game, item) {
    const state = game.state;
    markCodex(state, item);   // found, even if it is salvaged as it lands
    const filter = state.settings.autoSalvage || 'off';
    const judge = judgeOf(game);   // (what a piece is worth at the wall: systems/worth.js)
    // 'weaker': whatever its rarity, a drop that wouldn't improve what is worn, a dungeon's spare unique too, but never the
    // copy the bag keeps for the Seal, nor a first copy, which arrives locked
    const caught = !item.locked && (filter === 'weaker'
        ? !(item.uniqueId && keptForSeal(state, [...state.inventory, item]).has(item))
        : rarityIndex(item.rarity) <= rarityIndex(filter));
    if (item.source !== 'crafted' && filter !== 'off' && caught && !isUpgrade(state, item, judge)) {
        const gained = salvageObject(game, item, { auto: true });
        return { kept: false, salvaged: item, gained };
    }
    state.inventory.push(item);
    if (state.inventory.length <= bagSize(state)) return { kept: true, salvaged: null };

    // Any unlocked item can go except the ones worth equipping and the spare uniques kept for the Seal: the one worth
    // least where it would be worn. If nothing can (the bag is all locked items and upgrades), allow the overflow: an
    // upgrade is never salvaged behind your back.
    const needed = neededInBag(state, judge);
    const seal = keptForSeal(state);
    const candidates = state.inventory.filter(i => !i.locked && !needed.has(i) && !seal.has(i));
    if (!candidates.length) return { kept: true, salvaged: null };
    let low = null;   // (the first of the least worth: ties go by itemScore, then by the bag's order, as before)
    for (const item of candidates) {
        const stages = judge.place(item).stages;
        if (!low || stages < low.stages || (stages === low.stages && itemScore(item) < itemScore(low.item))) low = { item, stages };
    }
    const worst = low.item;
    state.inventory.splice(state.inventory.indexOf(worst), 1);
    const gained = salvageObject(game, worst, { auto: true });
    return { kept: worst !== item, salvaged: worst, gained };
}

// ---------- salvage ----------

/**
 * What salvaging an item would give: essence for drops, part of the materials back for crafted gear,
 * and for weapons and armour bars of their metal (data/workshop.js salvageBars). (The anvil's and the bench's work
 * stays with the slots.)
 */
export function salvagePreview(item) {
    const materials = {};
    let essence = salvageEssence(item);
    if (item.source === 'crafted' && item.materials) {
        for (const [id, qty] of Object.entries(item.materials)) materials[id] = qty * SALVAGE_MATERIAL_RETURN;
        essence = upgradeEssenceRefund(item);
    }
    const bars = salvageBars(item);
    if (bars) materials[bars.bar] = (materials[bars.bar] || 0) + bars.qty;
    // and the share of the other metals a refit brought to it, each as itself
    for (const [bar, qty] of Object.entries(item.barsCarried || {})) {
        const back = Math.floor(ANVIL_REFUND * qty);
        if (back > 0) materials[bar] = (materials[bar] || 0) + back;
    }
    return { essence, materials };
}

/** What a salvage gave, shortly: '12 essence, 3× Diamond' ('' for nothing: a crafted piece's share can come to none). */
export function gainedText(gained) {
    return [gained.essence ? `${gained.essence} essence` : '', ...Object.entries(gained.materials || {}).map(([id, q]) => `${q}× ${RESOURCES[id].name}`)].filter(Boolean).join(', ');
}

function salvageObject(game, item, { auto = false, quiet = auto } = {}) {
    const state = game.state;
    const preview = salvagePreview(item);
    const gained = { essence: preview.essence, materials: {} };
    for (const [id, expected] of Object.entries(preview.materials)) {
        // 0.4 of 3 bars = 1 bar plus a 20% chance of a second: fair on average, whole bars always.
        const qty = Math.floor(expected) + (rng.chance(expected - Math.floor(expected)) ? 1 : 0);
        if (qty > 0) { state.resources[id] += qty; gained.materials[id] = qty; }
    }
    state.resources.essence += gained.essence;
    bumpStat(game, 'itemsSalvaged');
    if (auto) bumpStat(game, 'itemsAutoSalvaged');
    if (!quiet) {
        const text = gainedText(gained);
        log(game, `♻️ Salvaged ${item.name}${text ? ` for ${text}` : ''}.`, 'loot');
    } else if (auto && rarityIndex(item.rarity) >= 2) tallyAutoSalvage(game, item, gained);   // (a line a minute: flushSalvageLine)
    game.markDirty();
    return gained;
}

/**
 * Automatic salvage's line in the log, gathered (the research loop's P-077: a line for each rare or better piece the bag
 * or Weaker salvaged came to about twenty an hour): the pieces of a minute go into one line, kept in `meta.salvageTally`
 * until it is written, at the next such salvage or the tick after a minute (Game.tick).
 */
export const SALVAGE_LINE_MS = 60000;

function tallyAutoSalvage(game, item, gained) {
    const meta = game.state.meta;
    flushSalvageLine(game);
    const t = meta.salvageTally ||= { since: game.now, count: 0, essence: 0, materials: {}, rarities: {} };
    t.count += 1;
    t.essence += gained.essence || 0;
    for (const [id, qty] of Object.entries(gained.materials || {})) t.materials[id] = (t.materials[id] || 0) + qty;
    t.rarities[item.rarity] = (t.rarities[item.rarity] || 0) + 1;
}

/** Write the gathered line once its minute is up (`force`: now): "Salvaged 5 pieces as they came (2 epic, 3 rare) for …". */
export function flushSalvageLine(game, force = false) {
    const t = game.state.meta.salvageTally;
    if (!t || (!force && game.now - t.since < SALVAGE_LINE_MS)) return false;
    delete game.state.meta.salvageTally;
    const kinds = [...RARITY_ORDER].reverse().filter(r => t.rarities[r] > 0).map(r => `${t.rarities[r]} ${RARITIES.find(x => x.id === r).name.toLowerCase()}`).join(', ');
    const text = gainedText(t);
    log(game, `♻️ Salvaged ${t.count} piece${t.count === 1 ? '' : 's'} as they came (${kinds})${text ? ` for ${text}` : ''}.`, 'loot');
    return true;
}

export function salvageItem(game, id) {
    const state = game.state;
    const found = findItem(state, id);
    if (!found) return null;
    if (found.item.locked) { game.emit({ type: 'error', text: 'Unlock the item first.' }); return null; }
    state.inventory.splice(found.index, 1);
    const gained = salvageObject(game, found.item);
    noteUndo(game, 'salvage', [found.item], gained);
    return gained;
}

/**
 * Salvage `doomed` from the bag with one line for them all (`what` says which), naming everything that came back: a
 * crafted piece gives its bars and gems, not essence, and "+0 essence" read as nothing (a player, 29 October 2026).
 * Returns { count, essence, materials }.
 */
function salvageBatch(game, doomed, what = '') {
    const state = game.state;
    const total = { essence: 0, materials: {} };
    for (const item of doomed) {
        state.inventory.splice(state.inventory.indexOf(item), 1);
        const gained = salvageObject(game, item, { quiet: true });   // not automatic
        total.essence += gained.essence;
        for (const [id, qty] of Object.entries(gained.materials)) total.materials[id] = (total.materials[id] || 0) + qty;
    }
    const text = gainedText(total);
    if (doomed.length) log(game, `♻️ Salvaged ${doomed.length} item${doomed.length === 1 ? '' : 's'}${what}${text ? ` for ${text}` : ''}.`, 'loot');
    noteUndo(game, 'salvage', doomed, total);
    return { count: doomed.length, ...total };
}

/** Salvage what the bag's Salvage weaker takes (weakerInBag). */
export function salvageWeaker(game) {
    return salvageBatch(game, weakerInBag(game.state), ' weaker than what you wear');
}

/** Salvage every unlocked item in the bag at or below a rarity. */
export function salvageAll(game, maxRarity = 'common') {
    const limit = rarityIndex(maxRarity);
    return salvageBatch(game, game.state.inventory.filter(i => !i.locked && rarityIndex(i.rarity) <= limit));
}

// ---------- equip ----------

/** Gear can't be changed during a dungeon run. */
export const gearIsLocked = state => !!(state.combat.active && state.combat.mode === 'dungeon');

function gearLocked(game) {
    if (gearIsLocked(game.state)) { game.emit({ type: 'error', text: 'Gear is locked inside a dungeon.' }); return true; }
    return false;
}

/** Equip an inventory item into a slot (auto-picks an empty matching slot if none given). */

export function equipItem(game, id, requestedSlot = null) {
    const state = game.state;
    if (gearLocked(game)) return false;
    const found = findItem(state, id);
    if (!found) return false;
    const { item, index } = found;
    if (!canWear(state, item)) {
        game.emit({ type: 'error', text: `Combat level ${TIER_WEAR_LEVEL[item.tier]} required to wear ${item.name}.` });
        return false;
    }
    const slots = TYPE_SLOTS[item.type] || [];
    let slot = requestedSlot;
    if (slot && !slots.includes(slot)) return false;
    if (!slot) slot = judgeOf(game).place(item).slot;   // an empty slot, else where it is worth the most (systems/worth.js)
    if (!slot) return false;

    const gain = equipGain(state, item, slot);   // (before the swap: what it does to him, for the screen)
    const { forge, firstForge } = wear(game, item, index, slot);
    const swept = sweepWeaker(game, [item.type]);
    game.emit({ type: 'equip', item, slot, gain, forge, firstForge, ...(swept ? { swept } : {}) });
    game.markDirty();
    return true;
}

/**
 * Weaker that stays (the research loop's P-077): with the Weaker auto-salvage on, an Equip also takes the bag's pieces of
 * the kinds it put on that no longer improve what is worn, the one taken off among them, as Salvage weaker would; never
 * a locked piece, the Seal's copy, nor one the hero made (as the auto-salvage never takes those). One line in the log;
 * returns { count, essence, materials, items } or null.
 */
function sweepWeaker(game, types) {
    const state = game.state;
    if (state.settings.autoSalvage !== 'weaker') return null;
    game.recompute();   // (judged on what is worn now)
    const kinds = new Set(types);
    const doomed = weakerInBag(state, judgeOf(game)).filter(i => kinds.has(i.type) && i.source !== 'crafted');
    if (!doomed.length) return null;
    return { ...salvageBatch(game, doomed, ' made weaker by what you put on'), items: doomed };
}

/**
 * Put the bag's `item` (at `index`) on in `slot`, the piece there back into the bag: { previous, forge, firstForge }, the
 * slot's levels it has now and whether it is the first piece ever to take a slot's levels.
 */
function wear(game, item, index, slot) {
    const state = game.state;
    const previous = state.equipped[slot];
    state.equipped[slot] = item;
    state.inventory.splice(index, 1);
    if (previous) state.inventory.push(previous);
    if (item.rarity === 'legendary') bumpStat(game, 'legendariesEquipped');
    // the slot's levels (the anvil's forge, the jeweller's bench: data/workshop.js): its price follows the best tier it
    // has held, and its levels are the piece's now
    let forge = 0;
    const levels = (SMITHING_TYPES.includes(slot) ? state.forge : state.bench)?.[slot];
    if (levels) {
        levels.tier = Math.max(levels.tier || 1, item.tier || 1);
        forge = levels.level || 0;
    }
    // the first time a piece takes a slot's levels, a card says how the forge works (main.js), once
    const firstForge = forge > 0 && !!previous && !state.seen.forge_slots;
    if (firstForge) state.seen.forge_slots = true;
    return { previous, forge, firstForge };
}

/**
 * The upgrades waiting in the bag, a slot each: what Equip all puts on, best first ([{ item, slot, stages }]). Each slot
 * takes the bag's piece worth the most there (systems/worth.js), a piece one slot: two rings, the best two. `skip`: ids
 * of pieces to leave out.
 */
export function upgradesWaiting(state, judge = wallJudge(state), skip = null) {
    const offers = [];
    for (const item of state.inventory) {
        if (!canWear(state, item) || skip?.has(item.id)) continue;
        for (const slot of TYPE_SLOTS[item.type] || []) {
            const stages = judge.worth(item, slot);
            if (stages > UPGRADE_EPS) offers.push({ item, slot, stages });
        }
    }
    offers.sort((a, b) => (b.stages - a.stages) || (itemScore(b.item) - itemScore(a.item)) || 0);
    const items = new Set();
    const slots = new Set();
    return offers.filter(o => !items.has(o.item) && !slots.has(o.slot) && items.add(o.item) && slots.add(o.slot));
}

/**
 * Equip all (the research loop's P-076: about six kinds of upgrade wait at nearly every return): the best waiting piece
 * for every slot, one at a time, each judged again on what is worn by then; a piece this takes off never goes back on in
 * the same tap. One 'equip' event says what it all did to the hero, with the pieces (`items`). Returns how many went on.
 */
export function equipAll(game) {
    const state = game.state;
    if (gearLocked(game)) return 0;
    const before = deriveStats(state);
    const put = [];
    const off = new Set();
    let first = null;
    for (let guard = 0; guard < EQUIP_SLOTS.length * 2; guard++) {
        game.recompute();   // (the stats with what is on now: the next piece is judged on them)
        const [next] = upgradesWaiting(state, judgeOf(game), off);
        if (!next) break;
        const done = wear(game, next.item, state.inventory.indexOf(next.item), next.slot);
        if (done.previous) off.add(done.previous.id);
        if (done.firstForge) first = { ...next, forge: done.forge };
        put.push(next);
    }
    if (!put.length) return 0;
    const after = deriveStats(state);
    const ratio = (a, b) => (b > 0 ? a / b - 1 : a > 0 ? Infinity : 0);
    const gain = { atk: ratio(after.atk, before.atk), def: ratio(after.def, before.def), hp: ratio(after.maxHp, before.maxHp) };
    const lead = first || put[0];
    const swept = sweepWeaker(game, put.map(p => p.item.type));
    game.emit({ type: 'equip', item: lead.item, slot: lead.slot, gain, forge: first ? first.forge : 0, firstForge: !!first, count: put.length, items: put.map(p => p.item), ...(swept ? { swept } : {}) });
    game.markDirty();
    return put.length;
}

export function unequipItem(game, slot) {
    const state = game.state;
    if (gearLocked(game)) return false;
    const item = state.equipped[slot];
    if (!item) return false;
    state.equipped[slot] = null;
    state.inventory.push(item);
    game.markDirty();
    return true;
}

// ---------- sell ----------

export function sellItem(game, id) {
    const state = game.state;
    const found = findItem(state, id);
    if (!found) return false;
    if (found.item.locked) { game.emit({ type: 'error', text: 'Unlock the item first.' }); return false; }
    const value = itemSellValue(found.item);
    state.inventory.splice(found.index, 1);
    state.gold += value;
    bumpStat(game, 'goldEarned', value);
    noteUndo(game, 'sale', [found.item], { gold: value });
    game.emit({ type: 'sold', item: found.item, gold: value });
    game.markDirty();
    return true;
}

/** Sell every unlocked item in the bag at or below a rarity ('common' by default). */
export function sellAllItems(game, maxRarity = 'common') {
    const limit = rarityIndex(maxRarity);
    const state = game.state;
    let gold = 0;
    let count = 0;
    const sold = [];
    state.inventory = state.inventory.filter(item => {
        if (!item.locked && rarityIndex(item.rarity) <= limit) { gold += itemSellValue(item); count++; sold.push(item); return false; }
        return true;
    });
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    if (count) { log(game, `Sold ${count} item${count === 1 ? '' : 's'} for ${gold} gold.`, 'info'); game.markDirty(); }
    noteUndo(game, 'sale', sold, { gold });
    return { count, gold };
}

// ---------- undo ----------

/**
 * How long the last sale or salvage can be taken back (the research loop's P-078: Melvor's Undo Sell mod has 29,579
 * subscribers, and its sequel's players asked for a buy-back): a few seconds, on its toast. One at a time, the latest:
 * a sale, a salvage, a batch button's, or what an Equip with Weaker on took with it.
 */
export const UNDO_MS = 8000;
let undoSerial = 0;

/** Keep what a sale or salvage took and exactly what it gave (a salvage rolls its bars), on the game, not in the save. */
function noteUndo(game, kind, items, { gold = 0, essence = 0, materials = {} } = {}) {
    if (!items.length) return;
    game.undo = { id: ++undoSerial, kind, items: [...items], gold, essence, materials: { ...materials }, at: game.now };
}

/** The last sale or salvage while it can still be taken back ({ id, kind, items, gold, essence, materials, at }), else null. */
export function lastUndo(game, id = null) {
    const u = game.undo;
    return u && (id === null || u.id === id) && game.now - u.at <= UNDO_MS ? u : null;
}

/**
 * Take back the last sale or salvage (`id`: that one): the pieces back in the bag, and exactly the gold, essence and bars
 * it gave out of the purse and the bank, its counts too. Refused once it is too late, another came after it, or what it
 * gave is spent.
 */
export function undoLast(game, id = null) {
    const state = game.state;
    const u = lastUndo(game, id);
    if (!u) { game.emit({ type: 'error', text: 'Too late to take that back.' }); return false; }
    const short = state.gold < u.gold ? 'gold' : (state.resources.essence || 0) < u.essence ? 'essence'
        : Object.entries(u.materials).find(([m, q]) => (state.resources[m] || 0) < q)?.[0];
    if (short) { game.emit({ type: 'error', text: `The ${RESOURCES[short]?.name.toLowerCase() || short} it gave is spent already.` }); return false; }
    state.gold -= u.gold;
    state.resources.essence -= u.essence;
    for (const [m, q] of Object.entries(u.materials)) state.resources[m] -= q;
    if (u.kind === 'sale') state.stats.goldEarned = Math.max(0, (state.stats.goldEarned || 0) - u.gold);
    else state.stats.itemsSalvaged = Math.max(0, (state.stats.itemsSalvaged || 0) - u.items.length);
    state.inventory.push(...u.items);
    game.undo = null;
    log(game, `↩️ Taken back: ${u.items.length === 1 ? u.items[0].name : `${u.items.length} items`}, in the bag again.`, 'info');
    game.emit({ type: 'undo', kind: u.kind, count: u.items.length, items: u.items });
    game.markDirty();
    return true;
}

// ---------- upgrade, reforge, lock ----------

export function toggleLock(game, id) {
    const item = findGear(game.state, id);
    if (!item) return false;
    item.locked = !item.locked;
    game.markDirty();
    return item.locked;
}

export function setAutoSalvage(game, rarity) {
    if (!AUTO_SALVAGE_OPTIONS.includes(rarity)) return;
    game.state.settings.autoSalvage = rarity;
    game.markDirty();
}

// ---------- resources and the supply shop ----------

export function sellResource(game, id, amount = 1) {
    const state = game.state;
    if (!RESOURCES[id] || id === 'essence') return 0;
    if (!(sellValue(id) > 0)) return 0;   // nothing pays for it (bait, say): selling would only throw it away
    const qty = Math.min(Math.floor(amount), Math.floor(state.resources[id] || 0));
    if (qty <= 0) return 0;
    const gold = sellValue(id) * qty;
    state.resources[id] -= qty;
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    game.markDirty();
    return gold;
}

/** A supply's price never falls below what it sells back for, and a quarter more: no buying low and selling high. */
export const SUPPLY_RESALE_MARGIN = 1.25;

/** A gold-shop entry's price for a run that has reached `stage`: `costKills` kills' worth of gold there, above its resale. */
export function supplyPrice(entry, stage) {
    const resale = Object.entries(entry.gives).reduce((sum, [id, qty]) => sum + sellValue(id) * qty, 0);
    return Math.max(Math.ceil(entry.costKills * goldPerKillAtStage(stage)), Math.ceil(resale * SUPPLY_RESALE_MARGIN));
}

/** Current gold price of a gold-shop entry: at the furthest stage this run has reached (the stage its kills pay at). */
export function goldShopPrice(game, entry) {
    return supplyPrice(entry, game.state.combat.maxStage);
}

/** Whether the shop offers an entry now: a gem pouch once Crafting is open, at the levels it serves. */
export function goldShopOpen(state, entry) {
    if (!entry?.craft) return !!entry;
    const level = skillLevel(state, 'crafting');
    return isUnlocked(state, 'crafting') && level >= entry.craft[0] && level <= entry.craft[1];
}

export function buyGoldShopItem(game, id) {
    const state = game.state;
    const entry = GOLD_SHOP.find(e => e.id === id);
    if (!entry || !goldShopOpen(state, entry)) return false;
    const price = goldShopPrice(game, entry);
    if (state.gold < price) { game.emit({ type: 'error', text: 'Not enough gold.' }); return false; }
    state.gold -= price;
    bumpStat(game, 'goldSpent', price);
    for (const [res, qty] of Object.entries(entry.gives)) state.resources[res] += qty;
    game.markDirty();
    return true;
}
