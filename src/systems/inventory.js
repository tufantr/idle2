// Equipment and resource management: equip, unequip, sell, upgrade, buy.

import { TYPE_SLOTS, EQUIP_SLOTS, MAX_UPGRADE, upgradeCost, TIER_WEAR_LEVEL } from '../data/items.js';
import { RESOURCES, sellValue } from '../data/resources.js';
import { GOLD_SHOP } from '../data/perks.js';
import { itemSellValue, goldPerKillAtStage } from '../core/formulas.js';
import { skillLevel } from '../core/modifiers.js';
import { log, bumpStat } from './progress.js';

export function findItem(state, id) {
    const index = state.inventory.findIndex(item => item.id === id);
    return index === -1 ? null : { item: state.inventory[index], index };
}

export function canWear(state, item) {
    return skillLevel(state, 'combat') >= (TIER_WEAR_LEVEL[item.tier] || 1);
}

/** Equip an inventory item into a slot (auto-picks an empty matching slot if none given). */
export function equipItem(game, id, requestedSlot = null) {
    const state = game.state;
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
    if (!slot) slot = slots.find(s => !state.equipped[s]) || slots[0];

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
    const item = state.equipped[slot];
    if (!item) return false;
    state.equipped[slot] = null;
    state.inventory.push(item);
    game.markDirty();
    return true;
}

export function sellItem(game, id) {
    const state = game.state;
    const found = findItem(state, id);
    if (!found) return false;
    const value = itemSellValue(found.item);
    state.inventory.splice(found.index, 1);
    state.gold += value;
    bumpStat(game, 'goldEarned', value);
    game.emit({ type: 'sold', item: found.item, gold: value });
    game.markDirty();
    return true;
}

/** Sell every unequipped item at or below a rarity ('common' by default). */
export function sellAllItems(game, maxRarity = 'common') {
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const limit = order.indexOf(maxRarity);
    const state = game.state;
    let gold = 0;
    let count = 0;
    state.inventory = state.inventory.filter(item => {
        if (order.indexOf(item.rarity) <= limit) { gold += itemSellValue(item); count++; return false; }
        return true;
    });
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    if (count) { log(game, `Sold ${count} items for ${gold} gold.`, 'info'); game.markDirty(); }
    return { count, gold };
}

/** Upgrade an item (equipped or in inventory) with essence + gold. */
export function upgradeItem(game, id) {
    const state = game.state;
    let item = findItem(state, id)?.item;
    if (!item) item = EQUIP_SLOTS.map(s => state.equipped[s]).find(i => i && i.id === id);
    if (!item) return false;
    if ((item.upgrade || 0) >= MAX_UPGRADE) { game.emit({ type: 'error', text: 'That item is fully upgraded.' }); return false; }
    const cost = itemUpgradeCost(game, item);
    if (state.resources.essence < cost.essence || state.gold < cost.gold) {
        game.emit({ type: 'error', text: `Upgrade needs ${cost.essence} essence and ${cost.gold} gold.` });
        return false;
    }
    state.resources.essence -= cost.essence;
    state.gold -= cost.gold;
    item.upgrade = (item.upgrade || 0) + 1;
    game.emit({ type: 'upgrade', item });
    game.markDirty();
    return true;
}

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

export function itemUpgradeCost(game, item) {
    return upgradeCost(item, goldPerKillAtStage(game.state.combat.bestStage));
}

export function buyGoldShopItem(game, id) {
    const state = game.state;
    const entry = GOLD_SHOP.find(e => e.id === id);
    if (!entry) return false;
    const price = goldShopPrice(game, entry);
    if (state.gold < price) { game.emit({ type: 'error', text: 'Not enough gold.' }); return false; }
    state.gold -= price;
    for (const [res, qty] of Object.entries(entry.gives)) state.resources[res] += qty;
    game.markDirty();
    return true;
}
