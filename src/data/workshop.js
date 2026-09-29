// Smithing and crafting recipes, and the tool ladder that ties gathering to production.

// Smelting: ore (+ coal) -> bar. Coal demand rises with tier so early rocks stay useful.
export const SMELTING_RECIPES = [
    { id: 'copper_bar',  name: 'Copper Bar',  levelReq: 1,  interval: 2000, xp: 10,  consumes: { copper_ore: 1 },                 produces: 'copper_bar' },
    { id: 'iron_bar',    name: 'Iron Bar',    levelReq: 10, interval: 2000, xp: 18,  consumes: { iron_ore: 1, coal: 1 },          produces: 'iron_bar' },
    // coal is mined from level 15 (see data/skills.js), so iron gear follows copper within the first hour
    { id: 'silver_bar',  name: 'Silver Bar',  levelReq: 20, interval: 2000, xp: 22,  consumes: { silver_ore: 1 },                 produces: 'silver_bar' },
    { id: 'mithril_bar', name: 'Mithril Bar', levelReq: 35, interval: 2200, xp: 35,  consumes: { mithril_ore: 1, coal: 2 },       produces: 'mithril_bar' },
    { id: 'gold_bar',    name: 'Gold Bar',    levelReq: 45, interval: 2200, xp: 45,  consumes: { gold_ore: 1 },                   produces: 'gold_bar' },
    { id: 'adamant_bar', name: 'Adamant Bar', levelReq: 55, interval: 2400, xp: 60,  consumes: { adamant_ore: 1, coal: 2 },       produces: 'adamant_bar' },
    { id: 'runite_bar',  name: 'Runite Bar',  levelReq: 75, interval: 2600, xp: 90,  consumes: { runite_ore: 1, coal: 3 },        produces: 'runite_bar' }
];

// Armour/weapon metals in ladder order. Smithing level to forge each tier; XP per bar used.
// XP per bar was raised 1.5x after tools/pacing.mjs showed a self-sufficient smith (mine -> smelt -> forge)
// needed ~48 h for level 75; it is now ~34 h, with 99 at ~275 h.
export const METALS = [
    { bar: 'copper_bar',  name: 'Copper',  tier: 1, levelReq: 1,  xpPerBar: 18 },
    { bar: 'iron_bar',    name: 'Iron',    tier: 2, levelReq: 10, xpPerBar: 30 },
    { bar: 'mithril_bar', name: 'Mithril', tier: 3, levelReq: 35, xpPerBar: 57 },
    { bar: 'adamant_bar', name: 'Adamant', tier: 4, levelReq: 55, xpPerBar: 90 },
    { bar: 'runite_bar',  name: 'Runite',  tier: 5, levelReq: 75, xpPerBar: 135 }
];
export const SMITH_INTERVAL = 3000;

// Extra smithing levels per armour type on top of the metal's level (OSRS-style "tier base + slot
// offset"), so each metal unlocks piece by piece and smithing gives something new most levels.
export const SMITH_SLOT_OFFSET = { Weapon: 0, Boots: 1, Gloves: 2, Head: 3, Shield: 5, Legs: 7, Body: 9 };
// Same idea for jewellery: rings first, amulets last.
export const CRAFT_SLOT_OFFSET = { Ring: 0, Ear: 2, Neck: 4 };

export function smithLevelReq(metal, type) {
    return Math.min(99, metal.levelReq + (SMITH_SLOT_OFFSET[type] || 0));
}

// Jewellery: precious bar + gem. Crafting level gate comes from the gem; gold bars need level 30.
export const JEWEL_BARS = [
    { bar: 'silver_bar', name: 'Silver', levelReq: 1 },
    { bar: 'gold_bar',   name: 'Gold',   levelReq: 30 }
];
export const GEM_TIERS = [
    { gem: 'amethyst', levelReq: 1,  xp: 20 },
    { gem: 'topaz',    levelReq: 10, xp: 35 },
    { gem: 'sapphire', levelReq: 25, xp: 55 },
    { gem: 'emerald',  levelReq: 40, xp: 85 },
    { gem: 'ruby',     levelReq: 55, xp: 130 },
    { gem: 'diamond',  levelReq: 70, xp: 200 }
];
export const CRAFT_INTERVAL = 3000;

// Tools. Each tier: -TOOL_SPEED_PER_TIER interval and +TOOL_DOUBLE_PER_TIER chance of a double yield.
// Pickaxes and axes are smithed from bars + a log handle; bows are crafted from logs + a bar.
export const TOOL_SPEED_PER_TIER = 0.05;
export const TOOL_DOUBLE_PER_TIER = 0.05;
export const TOOLS = {
    pickaxe: {
        name: 'Pickaxe', icon: '⛏️', skill: 'mining', madeBy: 'smithing',
        tiers: [
            { tier: 1, name: 'Copper Pickaxe',  levelReq: 5,  consumes: { copper_bar: 2, normal_log: 1 }, xp: 40 },
            { tier: 2, name: 'Iron Pickaxe',    levelReq: 15, consumes: { iron_bar: 2, oak_log: 1 },      xp: 80 },
            { tier: 3, name: 'Mithril Pickaxe', levelReq: 40, consumes: { mithril_bar: 2, willow_log: 1 }, xp: 160 },
            { tier: 4, name: 'Adamant Pickaxe', levelReq: 60, consumes: { adamant_bar: 2, maple_log: 1 }, xp: 260 },
            { tier: 5, name: 'Runite Pickaxe',  levelReq: 80, consumes: { runite_bar: 2, yew_log: 1 },    xp: 400 }
        ]
    },
    axe: {
        name: 'Axe', icon: '🪓', skill: 'woodcutting', madeBy: 'smithing',
        tiers: [
            { tier: 1, name: 'Copper Axe',  levelReq: 5,  consumes: { copper_bar: 2, normal_log: 1 }, xp: 40 },
            { tier: 2, name: 'Iron Axe',    levelReq: 15, consumes: { iron_bar: 2, oak_log: 1 },      xp: 80 },
            { tier: 3, name: 'Mithril Axe', levelReq: 40, consumes: { mithril_bar: 2, willow_log: 1 }, xp: 160 },
            { tier: 4, name: 'Adamant Axe', levelReq: 60, consumes: { adamant_bar: 2, maple_log: 1 }, xp: 260 },
            { tier: 5, name: 'Runite Axe',  levelReq: 80, consumes: { runite_bar: 2, yew_log: 1 },    xp: 400 }
        ]
    },
    bow: {
        name: 'Bow', icon: '🏹', skill: 'hunting', madeBy: 'crafting',
        tiers: [
            { tier: 1, name: 'Shortbow',    levelReq: 5,  consumes: { normal_log: 3, copper_bar: 1 }, xp: 40 },
            { tier: 2, name: 'Oak Bow',     levelReq: 15, consumes: { oak_log: 3, iron_bar: 1 },      xp: 80 },
            { tier: 3, name: 'Willow Bow',  levelReq: 30, consumes: { willow_log: 3, iron_bar: 1 },   xp: 130 },
            { tier: 4, name: 'Maple Bow',   levelReq: 45, consumes: { maple_log: 3, mithril_bar: 1 }, xp: 200 },
            { tier: 5, name: 'Yew Bow',     levelReq: 60, consumes: { yew_log: 3, adamant_bar: 1 },   xp: 300 },
            { tier: 6, name: 'Magic Bow',   levelReq: 75, consumes: { magic_log: 3, runite_bar: 1 },  xp: 450 }
        ]
    }
};
export const TOOL_INTERVAL = 4000;

export function toolTierDef(toolId, tier) {
    const tool = TOOLS[toolId];
    if (!tool) return null;
    return tool.tiers.find(t => t.tier === tier) || null;
}
