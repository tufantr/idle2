// Equipment and resource management: the bag, equip/unequip, sell, salvage, upgrade, reforge, lock.

import {
    TYPE_SLOTS, EQUIP_SLOTS, MAX_UPGRADE, upgradeCost, TIER_WEAR_LEVEL, RARITIES, UPGRADE_STEP,
    BAG_SIZE, salvageEssence, upgradeEssenceRefund, SALVAGE_MATERIAL_RETURN, reforgeCost
} from '../data/items.js';
import { RESOURCES, sellValue } from '../data/resources.js';
import { GOLD_SHOP } from '../data/perks.js';
import { itemSellValue, goldPerKillAtStage, rerollAffixes } from '../core/formulas.js';
import { skillLevel } from '../core/modifiers.js';
import { rng } from '../core/rng.js';
import { log, bumpStat } from './progress.js';

const RARITY_ORDER = RARITIES.map(r => r.id);
const rarityIndex = id => Math.max(0, RARITY_ORDER.indexOf(id));

export function findItem(state, id) {
    const index = state.inventory.findIndex(item => item.id === id);
    return index === -1 ? null : { item: state.inventory[index], index };
}

function findAnywhere(state, id) {
    return findItem(state, id)?.item || EQUIP_SLOTS.map(s => state.equipped[s]).find(i => i && i.id === id) || null;
}

export function canWear(state, item) {
    return skillLevel(state, 'combat') >= (TIER_WEAR_LEVEL[item.tier] || 1);
}

/** Rough power of an item for comparisons (upgrades and affixes count). */
export function itemScore(item) {
    if (!item) return -1;
    return ((item.atk || 0) + (item.def || 0)) * (1 + UPGRADE_STEP * (item.upgrade || 0)) + 5 * (item.affixes?.length || 0);
}

/** True if the item beats what is worn in the weakest slot it fits (empty slots count as beaten). */
export function isUpgrade(state, item) {
    const slots = TYPE_SLOTS[item.type] || [];
    return slots.some(slot => itemScore(item) > itemScore(state.equipped[slot]));
}

export function bagSize() {
    return BAG_SIZE;
}

// ---------- adding items: the bag rules ----------

/**
 * Put a new item in the bag. Drops at or below the auto-salvage rarity are salvaged straight away
 * unless they would be an upgrade. If the bag is full, the weakest unlocked item — possibly the new
 * one — is salvaged, so nothing is ever silently thrown away. Returns { kept, salvaged }.
 */
export function addItem(game, item) {
    const state = game.state;
    const filter = state.settings.autoSalvage || 'off';
    if (item.source !== 'crafted' && filter !== 'off' && rarityIndex(item.rarity) <= rarityIndex(filter) && !isUpgrade(state, item)) {
        const gained = salvageObject(game, item, { auto: true });
        return { kept: false, salvaged: item, gained };
    }
    state.inventory.push(item);
    if (state.inventory.length <= bagSize()) return { kept: true, salvaged: null };

    const candidates = state.inventory.filter(i => !i.locked && !isUpgrade(state, i));
    const pool = candidates.length ? candidates : state.inventory.filter(i => !i.locked);
    if (!pool.length) return { kept: true, salvaged: null }; // everything is locked: allow the overflow
    const worst = pool.reduce((a, b) => (itemScore(b) < itemScore(a) ? b : a));
    state.inventory.splice(state.inventory.indexOf(worst), 1);
    const gained = salvageObject(game, worst, { auto: true });
    return { kept: worst !== item, salvaged: worst, gained };
}

// ---------- salvage ----------

/** What salvaging an item would give: essence for drops, part of the materials back for crafted gear. */
export function salvagePreview(item) {
    if (item.source === 'crafted' && item.materials) {
        const materials = {};
        for (const [id, qty] of Object.entries(item.materials)) materials[id] = qty * SALVAGE_MATERIAL_RETURN;
        return { essence: upgradeEssenceRefund(item), materials };
    }
    return { essence: salvageEssence(item), materials: {} };
}

function salvageObject(game, item, { auto = false } = {}) {
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
    if (!auto || rarityIndex(item.rarity) >= 2) {
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

/** Salvage every unlocked item in the bag at or below a rarity. */
export function salvageAll(game, maxRarity = 'common') {
    const state = game.state;
    const limit = rarityIndex(maxRarity);
    const doomed = state.inventory.filter(i => !i.locked && rarityIndex(i.rarity) <= limit);
    let essence = 0;
    for (const item of doomed) {
        state.inventory.splice(state.inventory.indexOf(item), 1);
        essence += salvageObject(game, item, { auto: true }).essence;
    }
    if (doomed.length) log(game, `♻️ Salvaged ${doomed.length} items (+${essence} essence).`, 'loot');
    return { count: doomed.length, essence };
}

// ---------- equip ----------

/** Equip an inventory item into a slot (auto-picks an empty matching slot if none given). */
function gearLocked(game) {
    const c = game.state.combat;
    if (c.active && c.mode === 'dungeon') { game.emit({ type: 'error', text: 'Gear is locked inside a dungeon.' }); return true; }
    return false;
}

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
    state.equipped[slot] = item;
    state.inventory.splice(index, 1);
    if (previous) state.inventory.push(previous);
    if (item.rarity === 'legendary') bumpStat(game, 'legendariesEquipped');
    game.emit({ type: 'equip', item, slot });
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
    if (count) { log(game, `Sold ${count} items for ${gold} gold.`, 'info'); game.markDirty(); }
    return { count, gold };
}

// ---------- upgrade, reforge, lock ----------

export function itemUpgradeCost(game, item) {
    return upgradeCost(item, goldPerKillAtStage(game.state.combat.bestStage));
}

/** Upgrade an item (equipped or in the bag) with essence + gold. */
export function upgradeItem(game, id) {
    const state = game.state;
    const item = findAnywhere(state, id);
    if (!item) return false;
    if ((item.upgrade || 0) >= MAX_UPGRADE) { game.emit({ type: 'error', text: 'That item is fully upgraded.' }); return false; }
    const cost = itemUpgradeCost(game, item);
    if (state.resources.essence < cost.essence || state.gold < cost.gold) {
        game.emit({ type: 'error', text: `Upgrade needs ${cost.essence} essence and ${cost.gold} gold.` });
        return false;
    }
    state.resources.essence -= cost.essence;
    state.gold -= cost.gold;
    bumpStat(game, 'goldSpent', cost.gold);
    item.upgrade = (item.upgrade || 0) + 1;
    game.emit({ type: 'upgrade', item });
    game.markDirty();
    return true;
}

export function itemReforgeCost(game, item) {
    return reforgeCost(item, goldPerKillAtStage(game.state.combat.bestStage));
}

/** Reroll an item's affixes (not its rarity or base stats). Cost grows with each reforge, capped. */
export function reforgeItem(game, id) {
    const state = game.state;
    const item = findAnywhere(state, id);
    if (!item) return false;
    if (!item.affixes?.length) { game.emit({ type: 'error', text: 'Common items have no affixes to reforge.' }); return false; }
    if (item.uniqueId) { game.emit({ type: 'error', text: 'Unique items have fixed bonuses and cannot be reforged.' }); return false; }
    const cost = itemReforgeCost(game, item);
    if (state.resources.essence < cost.essence || state.gold < cost.gold) {
        game.emit({ type: 'error', text: `Reforging needs ${cost.essence} essence and ${cost.gold} gold.` });
        return false;
    }
    state.resources.essence -= cost.essence;
    state.gold -= cost.gold;
    bumpStat(game, 'goldSpent', cost.gold);
    rerollAffixes(item);
    item.reforges = (item.reforges || 0) + 1;
    bumpStat(game, 'reforges');
    game.emit({ type: 'reforge', item });
    game.markDirty();
    return true;
}

export function toggleLock(game, id) {
    const item = findAnywhere(game.state, id);
    if (!item) return false;
    item.locked = !item.locked;
    game.markDirty();
    return item.locked;
}

export function setAutoSalvage(game, rarity) {
    game.state.settings.autoSalvage = rarity;
    game.markDirty();
}

// ---------- resources and the supply shop ----------

export function sellResource(game, id, amount = 1) {
    const state = game.state;
    if (!RESOURCES[id] || id === 'essence') return 0;
    const qty = Math.min(Math.floor(amount), Math.floor(state.resources[id] || 0));
    if (qty <= 0) return 0;
    const gold = sellValue(id) * qty;
    state.resources[id] -= qty;
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    game.markDirty();
    return gold;
}

/** Current gold price of a gold-shop entry: `costKills` kills' worth of gold at the best stage. */
export function goldShopPrice(game, entry) {
    return Math.ceil(entry.costKills * goldPerKillAtStage(game.state.combat.bestStage));
}

export function buyGoldShopItem(game, id) {
    const state = game.state;
    const entry = GOLD_SHOP.find(e => e.id === id);
    if (!entry) return false;
    const price = goldShopPrice(game, entry);
    if (state.gold < price) { game.emit({ type: 'error', text: 'Not enough gold.' }); return false; }
    state.gold -= price;
    bumpStat(game, 'goldSpent', price);
    for (const [res, qty] of Object.entries(entry.gives)) state.resources[res] += qty;
    game.markDirty();
    return true;
}
