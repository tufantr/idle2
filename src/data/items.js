// Equipment: slots, base-stat multipliers, rarity (quality), affixes and upgrade costs.
// Rule from the itemisation research: the material tier decides an item's power band;
// rarity is a bounded quality bonus plus extra affixes, never a raw multiplier that lets
// a lucky copper sword beat honest runite.

export const EQUIP_SLOTS = ['Weapon', 'Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves', 'Ring1', 'Ring2', 'Neck', 'Ear1', 'Ear2'];

// Item types map to slots; rings and earrings have two slots each.
export const TYPE_SLOTS = {
    Weapon: ['Weapon'], Shield: ['Shield'], Head: ['Head'], Body: ['Body'], Legs: ['Legs'],
    Boots: ['Boots'], Gloves: ['Gloves'], Ring: ['Ring1', 'Ring2'], Neck: ['Neck'], Ear: ['Ear1', 'Ear2']
};

export const SMITHING_TYPES = ['Weapon', 'Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves'];
export const CRAFTING_TYPES = ['Ring', 'Neck', 'Ear'];

// Base stats = STAT_UNIT * material power * slot multiplier. A copper (power 1) weapon is 20 ATK.
export const STAT_UNIT = 5;
export const SLOT_STATS = {
    Weapon: { atk: 4.0, def: 0 },  Shield: { atk: 0, def: 3.0 },
    Head:   { atk: 0, def: 1.5 },  Body:   { atk: 0, def: 3.0 },
    Legs:   { atk: 0, def: 2.0 },  Boots:  { atk: 0.3, def: 1.0 },
    Gloves: { atk: 0.7, def: 0.7 }, Ring:  { atk: 0.8, def: 0.8 },
    Neck:   { atk: 1.2, def: 1.0 }, Ear:   { atk: 0.6, def: 0.6 }
};

// Bars needed to smith each armour type (OSRS-style: a body is five bars, boots one).
export const SMITHING_BAR_COST = { Weapon: 3, Shield: 3, Head: 2, Body: 5, Legs: 4, Boots: 1, Gloves: 1 };

export const TYPE_NAMES = {
    Weapon: 'Sword', Shield: 'Shield', Head: 'Helm', Body: 'Plate',
    Legs: 'Greaves', Boots: 'Boots', Gloves: 'Gauntlets',
    Ring: 'Ring', Neck: 'Amulet', Ear: 'Earring'
};

export const TYPE_ICONS = {
    Weapon: '🗡️', Shield: '🛡️', Head: '⛑️', Body: '🦺', Legs: '👖',
    Boots: '🥾', Gloves: '🧤', Ring: '💍', Neck: '📿', Ear: '✨'
};

// Rarity = quality multiplier on base stats + number of affixes. `weight` is the crafting roll,
// which stops at Rare: epic and legendary quality only comes from combat (see DROP_RARITY_WEIGHTS).
export const CRAFT_MAX_RARITY = 'rare';
export const RARITIES = [
    { id: 'common',    name: 'Common',    quality: 1.00, affixes: 0, weight: 100, color: '#e2e8f0' },
    { id: 'uncommon',  name: 'Uncommon',  quality: 1.08, affixes: 1, weight: 40,  color: '#22c55e' },
    { id: 'rare',      name: 'Rare',      quality: 1.16, affixes: 2, weight: 14,  color: '#3b82f6' },
    { id: 'epic',      name: 'Epic',      quality: 1.25, affixes: 3, weight: 4,   color: '#a855f7' },
    { id: 'legendary', name: 'Legendary', quality: 1.40, affixes: 4, weight: 1,   color: '#f59e0b' }
];

// Affix pool. Values are per-item; the modifier pipeline caps the totals (see core/modifiers.js).
// `min`/`max` are rolled once at creation and scale mildly with material tier.
export const AFFIXES = [
    { id: 'critChance',  name: 'Crit Chance',  stat: 'critChance',      min: 0.01, max: 0.03, format: 'pct' },
    { id: 'critDmg',     name: 'Crit Damage',  stat: 'critDmg',         min: 0.05, max: 0.15, format: 'pct' },
    { id: 'attackSpeed', name: 'Attack Speed', stat: 'attackSpeed',     min: 0.02, max: 0.06, format: 'pct' },
    { id: 'dodge',       name: 'Dodge',        stat: 'dodge',           min: 0.01, max: 0.03, format: 'pct' },
    { id: 'lifesteal',   name: 'Lifesteal',    stat: 'lifesteal',       min: 0.01, max: 0.03, format: 'pct' },
    { id: 'goldFind',    name: 'Gold Find',    stat: 'goldMult',        min: 0.03, max: 0.08, format: 'pct' },
    { id: 'combatXp',    name: 'Combat XP',    stat: 'combatXpMult',    min: 0.02, max: 0.05, format: 'pct' },
    { id: 'maxHp',       name: 'Max HP',       stat: 'hpMult',          min: 0.02, max: 0.05, format: 'pct' }
];

// Upgrades: +UPGRADE_STEP base stats per level, up to MAX_UPGRADE. Paid in essence (combat drop) and
// gold priced in "kills at your best stage" so the cost keeps pace with gold inflation.
export const MAX_UPGRADE = 10;
export const UPGRADE_STEP = 0.05;
export function upgradeCost(item, goldPerKill = 10) {
    const next = (item.upgrade || 0) + 1;
    const tier = item.tier || 1;
    return {
        essence: Math.ceil(2 * next * tier),
        gold: Math.ceil(goldPerKill * 4 * next)
    };
}

/** Item level requirement to wear: combat level by material tier (1, 10, 25, 40, 60). */
export const TIER_WEAR_LEVEL = { 1: 1, 2: 10, 3: 25, 4: 40, 5: 60, 6: 75, 7: 90 };

// ---------- Drops ----------

// Every gear tier. Tiers 6-7 cannot be smithed: they only drop deep in the Abyss and from the
// last dungeon (Melvor's drop-only band above the craftable ceiling). Power keeps the x2.2 ladder.
export const GEAR_TIERS = [
    { tier: 1, name: 'Copper',     power: 1.0,  jewel: 'Amethyst' },
    { tier: 2, name: 'Iron',       power: 2.2,  jewel: 'Topaz' },
    { tier: 3, name: 'Mithril',    power: 4.8,  jewel: 'Sapphire' },
    { tier: 4, name: 'Adamant',    power: 10.6, jewel: 'Emerald' },
    { tier: 5, name: 'Runite',     power: 23.4, jewel: 'Ruby' },
    { tier: 6, name: 'Dragonbone', power: 51,   jewel: 'Diamond', dropOnly: true },
    { tier: 7, name: 'Abyssal',    power: 112,  jewel: 'Voidstone', dropOnly: true }
];
export const MAX_GEAR_TIER = GEAR_TIERS.length;

// Chance that a kill drops a piece of gear, and how its tier relates to the zone's gear tier.
// Regular kills are a treat (an AFK fighter sees a few an hour, most of them salvage); a boss's
// first fall in a run is a coin flip.
export const GEAR_DROP_CHANCE = { regular: 0.002, boss: 0.5 };
export const DROP_TIER_OFFSETS = [ { offset: -1, weight: 60 }, { offset: 0, weight: 35 }, { offset: 1, weight: 5 } ];
export const DROP_TYPE_WEIGHTS = [
    { type: 'Weapon', weight: 12 }, { type: 'Shield', weight: 10 }, { type: 'Head', weight: 10 }, { type: 'Body', weight: 10 },
    { type: 'Legs', weight: 10 }, { type: 'Boots', weight: 10 }, { type: 'Gloves', weight: 10 },
    { type: 'Ring', weight: 10 }, { type: 'Neck', weight: 8 }, { type: 'Ear', weight: 10 }
];
// Rarity weights for drops (common → legendary). Epic and legendary also scale with the zone tier.
export const DROP_RARITY_WEIGHTS = {
    regular: [50, 35, 12, 2.5, 0.5],
    boss:    [20, 40, 28, 9, 3]
};
export const DROP_HIGH_RARITY_PER_TIER = 0.15; // epic/legendary weight x(1 + 0.15 x (zone tier - 1))

// ---------- Bag, salvage, reforge ----------

export const BAG_SIZE = 40;
export const AUTO_SALVAGE_OPTIONS = ['off', 'common', 'uncommon', 'rare'];

/** Half of the essence spent upgrading an item comes back when it is salvaged. */
export function upgradeEssenceRefund(item) {
    const upgrade = item.upgrade || 0;
    return Math.floor(0.5 * (item.tier || 1) * upgrade * (upgrade + 1));
}

/** Essence from salvaging a dropped item: grows with tier and rarity, plus the upgrade refund. */
export function salvageEssence(item) {
    const rarityIndex = Math.max(0, RARITIES.findIndex(r => r.id === item.rarity));
    return Math.ceil((item.tier || 1) * (1 + rarityIndex) * 0.8) + upgradeEssenceRefund(item);
}
// Crafted items give back part of their materials instead (so smithing can't farm essence).
export const SALVAGE_MATERIAL_RETURN = 0.4;

export const MAX_REFORGE_MULT = 10;
export function reforgeCost(item, goldPerKill = 10) {
    const times = Math.min(MAX_REFORGE_MULT, 1 + (item.reforges || 0));
    return { essence: 3 * (item.tier || 1) * times, gold: Math.ceil(10 * goldPerKill) };
}
