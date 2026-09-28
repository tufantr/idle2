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

// Rarity = quality multiplier on base stats + number of affixes. Weights are the base roll;
// higher-tier zones and essence rerolls (roadmap) shift the odds later.
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
