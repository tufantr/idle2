// Skill-point perks (bought with SP earned from prestige) and the gold shop.
// Prestige Tokens are never spent: each held token is a permanent +0.4% ATK/DEF, +0.2% HP (BASE.tokenAtk/tokenDef/tokenHp), more with records.

import { NON_COMBAT_SKILLS } from './skills.js';

const GATHERING_AND_PRODUCTION = value => Object.fromEntries(NON_COMBAT_SKILLS.map(id => [id, value]));

export const PERKS = [
    // Knight, Warlord and Paragon multiply (`mult`, a level each: core/modifiers.js atkLog), so a level late is worth
    // what it was early (in the shared pool of percents a Knight level fell to under 1% by stage 600). ×1.04, the
    // percent they added, took the simulator's heroes to stage 560 by hour 100 (470 before); ×1.025 to 490.
    { id: 'knight',    name: 'Knight',    icon: '⚔️', desc: '×1.025 ATK per level',                 max: 50, mult: { atk: 1.025 } },
    { id: 'warlord',   name: 'Warlord',   icon: '🛡️', desc: '×1.025 Max HP per level',              max: 50, mult: { hp: 1.025 } },
    { id: 'rogue',     name: 'Rogue',     icon: '💨', desc: '+3% attack speed per level',           max: 20, mods: { attackSpeed: 0.03 } },
    { id: 'forager',   name: 'Forager',   icon: '🌾', desc: '+3% gathering & production speed',     max: 30, mods: { skillSpeed: GATHERING_AND_PRODUCTION(0.03) } },
    { id: 'scholar',   name: 'Scholar',   icon: '📖', desc: '+3% XP from all skills',               max: 30, mods: { xpMult: 0.03 } },
    { id: 'endurance', name: 'Endurance', icon: '🌙', desc: '+2 hours of offline progress',         max: 6,  mods: { offlineHours: 2 } },
    { id: 'gourmet',   name: 'Gourmet',   icon: '🍖', desc: '+5% auto-eat threshold, +5% food healing', max: 6, mods: { autoEatThreshold: 0.05, foodMult: 0.05 } },
    { id: 'fortune',   name: 'Fortune',   icon: '🍀', desc: '+5% gold and drop chance from combat', max: 20, mods: { goldMult: 0.05, dropMult: 0.05 } },
    // For the long tail: every skill point has somewhere to go once the other perks are full, its price
    // rising without end (costCap), so it stays a goal for months.
    { id: 'paragon',   name: 'Paragon',   icon: '👑', desc: '×1.01 ATK, DEF and Max HP per level',  max: 200, costCap: Infinity, mult: { atk: 1.01, def: 1.01, hp: 1.01 } }
];

// A level costs more as a perk climbs (the owner's ask, October 2026: at one point a level, every perk
// was soon full): levels 1-5 cost 1 point, 6-10 cost 2, and so on, never more than PERK_COST_MAX, and
// Paragon's never stops rising. Levels bought before this kept what they cost. On 15 October the main perks
// went deeper and the cap rose from 5 to 10 (the owner: with Auto on, a player earns 60-80 points a day in
// the simulator, and filled every perk but Paragon within five days; now about two weeks, Paragon months).
export const PERK_COST_STEP = 5;
export const PERK_COST_MAX = 10;
/** Skill points for the `level`-th level (1-based) of `perk` (its own costCap, else PERK_COST_MAX). */
export function perkLevelCost(level, perk = null) {
    return Math.min(perk?.costCap ?? PERK_COST_MAX, Math.max(1, Math.ceil(level / PERK_COST_STEP)));
}

/** Skill points for all of a perk's levels from `from` + 1 to `to`. */
export function perkCost(perk, to = perk.max, from = 0) {
    let sum = 0;
    for (let level = from + 1; level <= to; level++) sum += perkLevelCost(level, perk);
    return sum;
}

export function perkById(id) {
    return PERKS.find(p => p.id === id) || null;
}

// Gold shop: convenience materials priced in "kills at your best stage" (costKills), so combat gold
// can never make gathering pointless and there is no buy-low/sell-high loop.
export const GOLD_SHOP = [
    { id: 'buy_coal',    name: 'Coal Wagon',       desc: '25 coal for the furnace.',      gives: { coal: 25 },        costKills: 40 },
    { id: 'buy_logs',    name: 'Firewood Bundle',  desc: '25 logs for the kitchen.',       gives: { normal_log: 25 },  costKills: 25 },
    { id: 'buy_guam',    name: 'Herb Pouch',       desc: '10 guam leaves.',                gives: { guam_leaf: 10 },   costKills: 30 },
    { id: 'buy_rabbit',  name: 'Hunter\'s Cache',  desc: '10 raw rabbits.',                gives: { raw_rabbit: 10 },  costKills: 25 },
    { id: 'buy_bait',    name: 'Bait Tin',         desc: '25 bait for the river.',               gives: { fishing_bait: 25 }, costKills: 30 },
    // The open-ended sink: essence at about the rate combat drops it, for upgrades and reforges.
    { id: 'buy_essence', name: 'Essence Cache',    desc: '10 monster essence for upgrades and reforges.', gives: { essence: 10 }, costKills: 80 },
    // Gems for Crafting (docs/research_notes/crafting-gems.md): the three low ones, for gold, so Crafting
    // can be trained from level 1 at any point of the game, however deep the fight's gems have gone. Melvor
    // sells Crafting's first material (leather) the same way; the higher gems stay the fight's and the mine's.
    // Each shows once Crafting is open, for the Crafting levels in `craft` (systems/inventory.js goldShopOpen).
    { id: 'buy_amethyst', name: 'Amethyst Pouch',  desc: '10 amethysts for Crafting.',     gives: { amethyst: 10 }, costKills: 50,  craft: [1, 9] },
    { id: 'buy_topaz',    name: 'Topaz Pouch',     desc: '10 topaz for Crafting.',         gives: { topaz: 10 },    costKills: 80,  craft: [10, 24] },
    { id: 'buy_sapphire', name: 'Sapphire Pouch',  desc: '10 sapphires for Crafting.',     gives: { sapphire: 10 }, costKills: 120, craft: [25, 99] }
];
