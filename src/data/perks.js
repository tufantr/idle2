// Skill-point perks (bought with SP earned from prestige) and the gold shop.
// Prestige Tokens are never spent: each held token is a permanent +0.5% ATK/DEF, +0.25% HP.

import { NON_COMBAT_SKILLS } from './skills.js';

const GATHERING_AND_PRODUCTION = value => Object.fromEntries(NON_COMBAT_SKILLS.map(id => [id, value]));

export const PERKS = [
    { id: 'knight',    name: 'Knight',    icon: '⚔️', desc: '+4% ATK per level',                    max: 25, mods: { atkMult: 0.04 } },
    { id: 'warlord',   name: 'Warlord',   icon: '🛡️', desc: '+4% Max HP per level',                 max: 25, mods: { hpMult: 0.04 } },
    { id: 'rogue',     name: 'Rogue',     icon: '💨', desc: '+3% attack speed per level',           max: 15, mods: { attackSpeed: 0.03 } },
    { id: 'forager',   name: 'Forager',   icon: '🌾', desc: '+3% gathering & production speed',     max: 15, mods: { skillSpeed: GATHERING_AND_PRODUCTION(0.03) } },
    { id: 'scholar',   name: 'Scholar',   icon: '📖', desc: '+3% XP from all skills',               max: 15, mods: { xpMult: 0.03 } },
    { id: 'endurance', name: 'Endurance', icon: '🌙', desc: '+2 hours of offline progress',         max: 6,  mods: { offlineHours: 2 } },
    { id: 'gourmet',   name: 'Gourmet',   icon: '🍖', desc: '+5% auto-eat threshold, +5% food healing', max: 6, mods: { autoEatThreshold: 0.05, foodMult: 0.05 } },
    { id: 'fortune',   name: 'Fortune',   icon: '🍀', desc: '+5% gold and drop chance from combat', max: 10, mods: { goldMult: 0.05, dropMult: 0.05 } },
    // For the long tail: every skill point has somewhere to go once the other perks are full.
    { id: 'paragon',   name: 'Paragon',   icon: '👑', desc: '+1% ATK, DEF and Max HP per level',    max: 200, mods: { atkMult: 0.01, defMult: 0.01, hpMult: 0.01 } }
];

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
    { id: 'buy_bait',    name: 'Bait Tin',         desc: '25 fishing bait.',               gives: { fishing_bait: 25 }, costKills: 30 },
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
