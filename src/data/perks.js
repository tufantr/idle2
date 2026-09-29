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
    { id: 'fortune',   name: 'Fortune',   icon: '🍀', desc: '+5% gold and drop chance from combat', max: 10, mods: { goldMult: 0.05, dropMult: 0.05 } }
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
    { id: 'buy_bait',    name: 'Bait Tin',         desc: '25 fishing bait.',               gives: { fishing_bait: 25 }, costKills: 30 }
];
