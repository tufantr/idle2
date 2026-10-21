// Equipment: slots, base-stat multipliers, rarity (quality), affixes and upgrade costs.
// Rule from the itemisation research: the material tier (and in the Abyss the depth) decides an
// item's power band; rarity is a bounded quality multiplier plus extra affixes, never enough that
// a lucky copper sword beats honest runite.

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
// which stops at Rare for forging; jewellery's rises with Crafting (CRAFT_RARITY_LEVELS): epic from
// level 75, legendary at 99, at the roll's own odds (about 3% and under 1%, more with the quality bonuses).
// The fight's jewellery comes at every rarity, as weapons and armour do (it came epic or legendary only, while Crafting
// was to make the ordinary pieces; the owner, October 2026, chose the drop and the jeweller's bench, systems/bench.js).
// A legendary is 2.8 times a common (the owner, October 2026: a legendary drop must make the hero
// stronger at once; it was 1.4, less than one Abyss depth's 1.45, so a common from one depth deeper
// beat it): worth a tier up (x2.2), or nearly three depths. Saves from before have their gear
// rescaled once (core/state.js RARITY_RESCALE).
export const CRAFT_MAX_RARITY = 'rare';
export const CRAFT_RARITY_LEVELS = [[99, 'legendary'], [75, 'epic']];
/** The best rarity a piece of jewellery can roll at this Crafting level. */
export const craftMaxRarity = level => CRAFT_RARITY_LEVELS.find(([at]) => level >= at)?.[1] || CRAFT_MAX_RARITY;
export const RARITIES = [
    { id: 'common',    name: 'Common',    quality: 1.00, affixes: 0, weight: 100, color: '#e2e8f0' },
    { id: 'uncommon',  name: 'Uncommon',  quality: 1.20, affixes: 1, weight: 40,  color: '#22c55e' },
    { id: 'rare',      name: 'Rare',      quality: 1.50, affixes: 2, weight: 14,  color: '#3b82f6' },
    { id: 'epic',      name: 'Epic',      quality: 2.00, affixes: 3, weight: 4,   color: '#a855f7' },
    { id: 'legendary', name: 'Legendary', quality: 2.80, affixes: 4, weight: 1,   color: '#f59e0b' },
    // above legendary (the endless climb, October 2026; DESIGN §3.31): never crafted, only a frontier boss's (MYTHIC)
    { id: 'mythic',    name: 'Mythic',    quality: 4.00, affixes: 5, weight: 0,   color: '#f43f5e' },
    { id: 'primal',    name: 'Primal',    quality: 4.00, affixes: 6, weight: 0,   color: '#5eead4', perfect: true }
];

// Above legendary: from stage MYTHIC.from, a piece left by a boss of the stage ladder within MYTHIC.near stages of the
// best stage, and the frontier's piece (below), is Mythic MYTHIC.chance of the time (×4 a common, five bonuses), and from
// stage PRIMAL.from a Mythic is Primal one time in PRIMAL.odds: its stats and bonuses rolled as high as they go, and a
// sixth bonus. With Auto a Mythic comes about once a day of play past stage 500 (tools/simulate.mjs: at 2% one in 70
// hours, as a run meets few bosses that near its best; one legendary in twenty, the first plan, one in 500 hours);
// a Primal a few times a year.
export const MYTHIC = { from: 500, near: 100, chance: 0.05 };
export const PRIMAL = { from: 1000, odds: 20 };
// The frontier's piece (Tap Titans 2 seeds frontier drops on every prestige run): once a run, the first boss of the
// ladder beaten at FRONTIER_DROP.share of the best stage or deeper (from a best of FRONTIER_DROP.from) leaves a sure
// piece from the best stage's depth, at a boss's odds, so every run has a real chance at an upgrade.
export const FRONTIER_DROP = { from: 100, share: 0.9 };

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

// Upgrades: +UPGRADE_STEP base stats per level, up to MAX_UPGRADE: a weapon's or armour's slot at the anvil (with no
// top there, data/workshop.js forgeMult), a piece of jewellery at the jeweller's bench (systems/bench.js).
export const MAX_UPGRADE = 10;
// Jewellery carries less raw power than armour of its tier (it brings the affixes instead).
export const JEWEL_POWER = 0.8;
export const UPGRADE_STEP = 0.05;

/**
 * The combat level to wear each tier. At Melvor pace the top two came down (from 75 and 90), so
 * drop-only gear waits hours, not days: Dragonbone is worn a few hours after the first one drops,
 * Abyssal about a day and a half of play after (tools/simulate.mjs; DESIGN §5.3).
 */
export const TIER_WEAR_LEVEL = { 1: 1, 2: 10, 3: 25, 4: 40, 5: 60, 6: 70, 7: 80 };

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

// The gear codex: every kind of gear at every tier (10 kinds x 7 tiers), a silhouette until one has
// been found, forged or crafted. Keys are "<type>/<tier>" and are saved.
export const CODEX_TYPES = Object.keys(TYPE_SLOTS);
export const CODEX_SIZE = CODEX_TYPES.length * GEAR_TIERS.length;
export const codexKey = item => `${item.type}/${Math.max(1, Math.min(MAX_GEAR_TIER, Math.round(Number(item.tier) || 1)))}`;
export const isCodexKey = key => /^(\w+)\/(\d+)$/.test(key) && CODEX_TYPES.includes(key.split('/')[0]) && Number(key.split('/')[1]) >= 1 && Number(key.split('/')[1]) <= MAX_GEAR_TIER;

// Chance that a kill drops a piece of gear, and how its tier relates to the zone's gear tier.
// Regular kills are a treat (an AFK fighter sees a few an hour, most of them salvage); a boss's
// first fall in a run is a coin flip. Weapons and armour past copper only drop (DESIGN §3.25), so a
// drop is mostly of the place's own tier.
export const GEAR_DROP_CHANCE = { regular: 0.002, boss: 0.5 };
export const DROP_TIER_OFFSETS = [ { offset: -1, weight: 25 }, { offset: 0, weight: 65 }, { offset: 1, weight: 10 } ];
// What the hero wears tilts what drops: a kind with an empty slot is four times as likely, one whose
// piece is of a lower tier than the place's gear twice.
export const DROP_EMPTY_SLOT_MULT = 4;
export const DROP_BEHIND_SLOT_MULT = 2;
// The pity count: a boss's first fall at the hero's frontier that leaves no upgrade marks one; the
// eighth mark brings a sure piece of the place's tier for the weakest slot (DESIGN §3.25).
export const PITY_MARKS = 8;
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
// More room for gold (the owner's ask, October 2026; gold piles up, and this is a sink for it): each
// purchase adds `slots`, up to `max` purchases (a bag of 100), priced like the gold shop in kills' worth of
// gold at the best stage, each `growth` times the last (systems/inventory.js bagUpgradePrice).
export const BAG_UPGRADE = { slots: 5, max: 12, kills: 150, growth: 1.5 };
// 'weaker': any drop that wouldn't be an upgrade for what is worn, whatever its rarity (never a unique).
export const AUTO_SALVAGE_OPTIONS = ['off', 'common', 'uncommon', 'rare', 'weaker'];

/**
 * Half of the essence spent upgrading an item comes back when it is salvaged: what the anvil kept count
 * of (item.essenceIn, data/workshop.js), else what its levels cost at its tier.
 */
export function upgradeEssenceRefund(item) {
    if (Number.isFinite(item.essenceIn)) return Math.floor(item.essenceIn / 2);
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

// A reroll's essence grows with each one before it, up to this many times the first (the anvil's and the bench's).
export const MAX_REFORGE_MULT = 10;
