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
import { itemSellValue, goldPerKillAtStage, rerollAffixes, abyssDropMult, enemyBaseStats } from '../core/formulas.js';
import { skillLevel, deriveStats } from '../core/modifiers.js';
import { isUnlocked } from '../data/unlocks.js';
import { rng } from '../core/rng.js';
import { log, bumpStat } from './progress.js';

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
export function laggingSlot(state, zone) {
    const power = GEAR_TIERS[Math.max(1, Math.min(GEAR_TIERS.length, zone.gearTier)) - 1].power * abyssDropMult(zone.depth || 0);
    let worst = null;
    for (const type of SMITHING_TYPES) {
        const slot = SLOT_STATS[type];
        const place = STAT_UNIT * power * (slot.atk + slot.def);
        const ratio = state.equipped[type] ? itemScore(state.equipped[type]) / place : 0;
        if (!worst || ratio < worst.ratio) worst = { type, ratio };
    }
    return worst;
}


export function canWear(state, item) {
    return skillLevel(state, 'combat') >= (TIER_WEAR_LEVEL[item.tier] || 1);
}

/**
 * Rough power of an item for comparisons (affixes count; the anvil's and the bench's levels belong to the slots,
 * data/workshop.js, so any piece worn there has them).
 */
export function itemScore(item) {
    if (!item) return -1;
    return (item.atk || 0) + (item.def || 0) + 5 * (item.affixes?.length || 0);
}

/** True if the item beats what is worn in the weakest slot it fits (empty slots count as beaten). */
export function isUpgrade(state, item) {
    const slots = TYPE_SLOTS[item.type] || [];
    return slots.some(slot => itemScore(item) > itemScore(state.equipped[slot]));
}

/** The weakest equipped slot an item could go into (empty slots first). */
function weakestSlotFor(state, type) {
    const slots = TYPE_SLOTS[type] || [];
    return slots.reduce((worst, slot) => (itemScore(state.equipped[slot]) < itemScore(state.equipped[worst]) ? slot : worst), slots[0]);
}

/**
 * What wearing `item` does to the hero, all bonuses counted: his attack, defence and max health after, as
 * ratios to before (0.38 is +38%; Infinity where he had none), in the slot equipItem would choose (with its
 * forge levels). The fight's Equip, the bag and the equip itself say it, so a better piece is seen to make
 * him stronger (the owner, October 2026: a legendary should be felt).
 */
export function equipGain(state, item, slot = weakestSlotFor(state, item.type)) {
    const before = deriveStats(state);
    const after = deriveStats({ ...state, equipped: { ...state.equipped, [slot]: item } });
    const ratio = (a, b) => (b > 0 ? a / b - 1 : a > 0 ? Infinity : 0);
    return { atk: ratio(after.atk, before.atk), def: ratio(after.def, before.def), hp: ratio(after.maxHp, before.maxHp) };
}

/**
 * About how many stages a change in the hero's attack, defence and health (`gain`, as equipGain gives it) is worth
 * at his best stage: attack where a boss must fall in time (its health grows a stage's growth), defence and health
 * together where he must live through a blow (its attack grows likewise), whichever moves more (the exchange rate of
 * docs/research_notes/endless-late-game.md §1.1). Null when it can't be said (a slot that was empty).
 */
export function gainStages(state, gain) {
    if (!gain || ![gain.atk, gain.def, gain.hp].every(Number.isFinite)) return null;
    const best = Math.max(1, state.combat?.bestStage || 1);
    const here = enemyBaseStats(best);
    const next = enemyBaseStats(best + 1);
    const ln = v => Math.log(1 + Math.max(-0.99, v));
    const boss = ln(gain.atk) / Math.log(next.hp / here.hp);
    const blow = (ln(gain.def) + ln(gain.hp)) / (2 * Math.log(next.atk / here.atk));
    return Math.abs(boss) >= Math.abs(blow) ? boss : blow;
}

/** The best wearable upgrade in the bag, if any: { item, slot, gain } (the fight's one-tap Equip). */
export function findUpgrade(state) {
    let best = null;
    for (const item of state.inventory) {
        if (!canWear(state, item)) continue;
        const slot = weakestSlotFor(state, item.type);
        const gain = itemScore(item) - itemScore(state.equipped[slot]);
        if (gain > 0 && (!best || gain > best.gain)) best = { item, slot, gain };
    }
    return best;
}

/** Bag items worth equipping: the best of their type in the bag (one per slot) that beat what is worn. */
function neededInBag(state) {
    const needed = new Set();
    const byType = {};
    for (const item of state.inventory) (byType[item.type] ||= []).push(item);
    for (const [type, items] of Object.entries(byType)) {
        const best = items.sort((a, b) => itemScore(b) - itemScore(a)).slice(0, (TYPE_SLOTS[type] || []).length);
        for (const item of best) if (isUpgrade(state, item)) needed.add(item);
    }
    return needed;
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
    // 'weaker': whatever its rarity, a drop that wouldn't improve what is worn (never a dungeon's unique: it is a record)
    const caught = filter === 'weaker' ? !item.uniqueId : rarityIndex(item.rarity) <= rarityIndex(filter);
    if (item.source !== 'crafted' && filter !== 'off' && caught && !isUpgrade(state, item)) {
        const gained = salvageObject(game, item, { auto: true });
        return { kept: false, salvaged: item, gained };
    }
    state.inventory.push(item);
    if (state.inventory.length <= bagSize(state)) return { kept: true, salvaged: null };

    // Any unlocked item can go except the ones worth equipping. If nothing can (the bag is all locked
    // items and upgrades), allow the overflow: an upgrade is never salvaged behind your back.
    const needed = neededInBag(state);
    const candidates = state.inventory.filter(i => !i.locked && !needed.has(i));
    if (!candidates.length) return { kept: true, salvaged: null };
    const worst = candidates.reduce((a, b) => (itemScore(b) < itemScore(a) ? b : a));
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
    if (!quiet || rarityIndex(item.rarity) >= 2) {
        const parts = [gained.essence ? `${gained.essence} essence` : '', ...Object.entries(gained.materials).map(([id, q]) => `${q}× ${RESOURCES[id].name}`)].filter(Boolean);
        log(game, `♻️ Salvaged ${item.name}${parts.length ? ` for ${parts.join(', ')}` : ''}.`, 'loot');
    }
    game.markDirty();
    return gained;
}

export function salvageItem(game, id) {
    const state = game.state;
    const found = findItem(state, id);
    if (!found) return null;
    if (found.item.locked) { game.emit({ type: 'error', text: 'Unlock the item first.' }); return null; }
    state.inventory.splice(found.index, 1);
    return salvageObject(game, found.item);
}

/**
 * Salvage every unlocked item in the bag that wouldn't improve what is worn (the bag's own button; crafted
 * gear too, since it was asked for), never a dungeon's unique: it is a record.
 */
export function salvageWeaker(game) {
    const state = game.state;
    const needed = neededInBag(state);
    const doomed = state.inventory.filter(i => !i.locked && !i.uniqueId && !needed.has(i) && !isUpgrade(state, i));
    let essence = 0;
    for (const item of doomed) {
        state.inventory.splice(state.inventory.indexOf(item), 1);
        essence += salvageObject(game, item, { quiet: true }).essence;
    }
    if (doomed.length) log(game, `♻️ Salvaged ${doomed.length} item${doomed.length === 1 ? '' : 's'} weaker than what you wear (+${essence} essence).`, 'loot');
    return { count: doomed.length, essence };
}

/** Salvage every unlocked item in the bag at or below a rarity. */
export function salvageAll(game, maxRarity = 'common') {
    const state = game.state;
    const limit = rarityIndex(maxRarity);
    const doomed = state.inventory.filter(i => !i.locked && rarityIndex(i.rarity) <= limit);
    let essence = 0;
    for (const item of doomed) {
        state.inventory.splice(state.inventory.indexOf(item), 1);
        essence += salvageObject(game, item, { quiet: true }).essence;   // one line for them all; not automatic
    }
    if (doomed.length) log(game, `♻️ Salvaged ${doomed.length} item${doomed.length === 1 ? '' : 's'} (+${essence} essence).`, 'loot');
    return { count: doomed.length, essence };
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
    if (!slot) slot = slots.find(s => !state.equipped[s]) || slots.reduce((w, s) => (itemScore(state.equipped[s]) < itemScore(state.equipped[w]) ? s : w), slots[0]);

    const previous = state.equipped[slot];
    const gain = equipGain(state, item, slot);   // (before the swap: what it does to him, for the screen)
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
    const firstForge = forge > 0 && previous && !state.seen.forge_slots;
    if (firstForge) state.seen.forge_slots = true;
    game.emit({ type: 'equip', item, slot, gain, forge, firstForge });
    game.markDirty();
    return true;
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
    state.inventory = state.inventory.filter(item => {
        if (!item.locked && rarityIndex(item.rarity) <= limit) { gold += itemSellValue(item); count++; return false; }
        return true;
    });
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    if (count) { log(game, `Sold ${count} item${count === 1 ? '' : 's'} for ${gold} gold.`, 'info'); game.markDirty(); }
    return { count, gold };
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
