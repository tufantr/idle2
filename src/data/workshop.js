// Smithing and crafting recipes, and the tool ladder that ties gathering to production.

import { paceList } from './pace.js';
import { SMITHING_BAR_COST, SMITHING_TYPES, MAX_REFORGE_MULT, RARITIES, MAX_UPGRADE, UPGRADE_STEP } from './items.js';

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
// needed ~48 h for level 75 (then ~34 h). At Melvor pace (data/pace.js) it takes ~55 h, and ~600 h to 99.
export const METALS = [
    { bar: 'copper_bar',  name: 'Copper',  tier: 1, levelReq: 1,  xpPerBar: 18 },
    { bar: 'iron_bar',    name: 'Iron',    tier: 2, levelReq: 10, xpPerBar: 30 },
    { bar: 'mithril_bar', name: 'Mithril', tier: 3, levelReq: 35, xpPerBar: 57 },
    { bar: 'adamant_bar', name: 'Adamant', tier: 4, levelReq: 55, xpPerBar: 90 },
    { bar: 'runite_bar',  name: 'Runite',  tier: 5, levelReq: 75, xpPerBar: 135 }
];
export const SMITH_INTERVAL = 3000;

// Forging makes copper gear only: every stronger weapon and piece of armour drops in the fight
// (DESIGN §3.25). The smith's work on them is the anvil: reinforcing what the hero wears and rerolling
// its bonuses, with bars of its own metal. Dragonbone and Abyssal gear takes runite, two and three times
// as many. The anvil opens at Smithing 5; each step of reinforcing up to +10 takes half as many bars again
// as the last, needs 5 more levels, and pays the bars' forging XP. The bars are the real gate: smelting
// each metal needs its level, or they come from salvaging gear of that metal.
export const FORGE_METALS = METALS.filter(m => m.tier === 1);
export const ANVIL_LEVEL_PER_UPGRADE = 5;
export const ANVIL_BAR_GROWTH = 1.5;
// The forge without a top (the endless climb, October 2026; DESIGN §3.31): reinforcing belongs to the slot, not
// the piece, so every weapon or piece of armour worn there has the slot's levels and a better drop never loses
// them (a refit lost one). Up to +10 a level adds 5% of the piece's base stats (×1.5 at +10, as before); each
// level past +10 multiplies them by FORGE_STEP (+5% of all they had). Past +10 the bars grow FORGE_BAR_GROWTH a
// level instead of ×1.5, the essence as before, and each level asks one Smithing level more, up to 99 (five a level
// held every simulated hero at +15). A level is priced in the
// metal of the best tier the slot has held (state.forge), so a copper sword can't buy cheap levels for an
// Abyssal one. Bars and essence don't grow with depth, so the forge climbs with time spent, not with the
// stage (the camp is the one sink priced in plain gold: two would run away, endless-late-game.md §5.2).
export const FORGE_STEP = 1.05;
export const FORGE_BAR_GROWTH = 1.15;
export const FORGE_MAX = 10000;   // (a bound for a save: far past what any hero's bars buy)
/** What a slot's forge levels multiply a piece's base attack and defence by. */
export function forgeMult(level) {
    const l = Math.max(0, Math.floor(Number(level) || 0));
    return (1 + UPGRADE_STEP * Math.min(l, MAX_UPGRADE)) * Math.pow(FORGE_STEP, Math.max(0, l - MAX_UPGRADE));
}
/** The metal whose bars work gear of a tier at the anvil. */
export function anvilMetal(tier) {
    return METALS[Math.max(1, Math.min(METALS.length, Math.round(tier) || 1)) - 1];
}
/** Bars past runite: Dragonbone takes twice as many runite bars, Abyssal three times. */
export function anvilBarMult(tier) {
    return Math.max(1, (Math.round(tier) || 1) - METALS.length + 1);
}
/**
 * Reinforcing a slot of `type` from `level` to the next, priced at `tier`: { bar, bars, essence, level, xp, metal }.
 * The XP is the bars' up to +10; past it the price keeps climbing but the XP stays the +10 level's (the owner, 16
 * October 2026: it grew with the price, a click at +40 paid 2.25M XP, several Smithing levels).
 */
export function reinforceCost(type, level = 0, tier = 1) {
    const next = Math.max(0, Math.floor(level) || 0) + 1;
    const metal = anvilMetal(tier);
    const barsAt = growth => Math.ceil((SMITHING_BAR_COST[type] || 1) * growth) * anvilBarMult(tier);
    const upTo10 = Math.pow(ANVIL_BAR_GROWTH, Math.min(next, MAX_UPGRADE) - 1);
    const bars = barsAt(upTo10 * Math.pow(FORGE_BAR_GROWTH, Math.max(0, next - MAX_UPGRADE)));
    const smithing = next <= MAX_UPGRADE ? ANVIL_LEVEL_PER_UPGRADE * next : Math.min(99, ANVIL_LEVEL_PER_UPGRADE * MAX_UPGRADE + next - MAX_UPGRADE);   // (past +10 a Smithing level a forge level)
    return { bar: metal.bar, bars, essence: Math.ceil(2 * next * tier), level: smithing, xp: barsAt(upTo10) * metal.xpPerBar, metal };
}
/** Rerolling the bonuses: a piece's worth of bars, and essence that grows with each reroll (capped). */
export function rerollCost(item) {
    const tier = item.tier || 1;
    const metal = anvilMetal(tier);
    const bars = (SMITHING_BAR_COST[item.type] || 1) * anvilBarMult(tier);
    const times = Math.min(MAX_REFORGE_MULT, 1 + (item.reforges || 0));
    return { bar: metal.bar, bars, essence: 3 * tier * times, level: ANVIL_LEVEL_PER_UPGRADE, xp: bars * metal.xpPerBar, metal };
}
/**
 * The essence the anvil took to reinforce a piece from before the forge (core/state.js forgeSlots): as kept
 * (item.essenceIn), or what its levels cost at its own tier.
 */
export function anvilEssenceSpent(item) {
    if (Number.isFinite(item.essenceIn)) return item.essenceIn;
    let essence = 0;
    for (let level = 1; level <= (item.upgrade || 0); level++) essence += reinforceCost(item.type, level - 1, item.tier).essence;
    return essence;
}

// Salvaging a weapon or a piece of armour gives bars of its metal back: one for a common piece, five
// for a legendary (more past runite). The forge's work stays with the slot; a piece from before it that kept
// its own reinforcing (core/state.js sanitizeForge) gives three quarters of those bars back.
export const ANVIL_REFUND = 0.75;
/** { bar, qty } for a weapon or armour (forged copper gives its own materials back instead), else null. */
export function salvageBars(item) {
    if (!SMITHING_TYPES.includes(item.type)) return null;
    const tier = item.tier || 1;
    const rank = Math.max(0, RARITIES.findIndex(r => r.id === item.rarity));
    const found = item.source === 'crafted' && item.materials ? 0 : (1 + rank) * anvilBarMult(tier);
    const qty = found + Math.floor(ANVIL_REFUND * (item.barsIn || 0));
    return qty > 0 ? { bar: anvilMetal(tier).bar, qty } : null;
}

// Extra smithing levels per armour type on top of the metal's level (OSRS-style "tier base + slot
// offset"), so each metal unlocks piece by piece and smithing gives something new most levels.
export const SMITH_SLOT_OFFSET = { Weapon: 0, Boots: 1, Gloves: 2, Head: 3, Shield: 5, Legs: 7, Body: 9 };
// Same idea for jewellery: rings first, amulets last.
export const CRAFT_SLOT_OFFSET = { Ring: 0, Ear: 2, Neck: 4 };

export function smithLevelReq(metal, type) {
    return Math.min(99, metal.levelReq + (SMITH_SLOT_OFFSET[type] || 0));
}

// Jewellery: precious bar + gem. Crafting level gate comes from the gem; gold bars need level 30.
// The gem sets a piece's tier and power (like dropped jewellery of that tier); a gold setting adds 20%.
export const JEWEL_BARS = [
    { bar: 'silver_bar', name: 'Silver', levelReq: 1,  powerMult: 1.0 },
    { bar: 'gold_bar',   name: 'Gold',   levelReq: 30, powerMult: 1.2 }
];
export const GEM_TIERS = [
    { gem: 'amethyst', levelReq: 1,  xp: 20 },
    { gem: 'topaz',    levelReq: 10, xp: 35 },
    { gem: 'sapphire', levelReq: 25, xp: 55 },
    { gem: 'emerald',  levelReq: 40, xp: 85 },
    { gem: 'ruby',     levelReq: 55, xp: 130 },
    { gem: 'diamond',  levelReq: 70, xp: 200 },
    // Crafting's late job (DESIGN §5.7): no mine holds it; the Abyss's bosses leave one now and then from
    // depth VOIDSTONE_DEPTH, and a Voidstone piece is cut to the hero's deepest depth (systems/skilling.js),
    // so it keeps pace with what drops there.
    { gem: 'voidstone', levelReq: 85, xp: 300 }
];
export const VOIDSTONE_DEPTH = 5;
export const VOIDSTONE_CHANCE = 0.25;   // a boss's first fall
export const CRAFT_INTERVAL = 3000;

// Tools. Each tier: -TOOL_SPEED_PER_TIER interval and +TOOL_DOUBLE_PER_TIER chance of a double yield.
// Bought in the Shop (systems/tools.js; the owner, October 2026: tools are purchases, not skill work) with the bars and
// logs they always took, each tier once the skill it serves reaches `levelReq` (they were made in Smithing, and the bow
// in Crafting, at those levels of the maker's skill).
export const TOOL_SPEED_PER_TIER = 0.05;
export const TOOL_DOUBLE_PER_TIER = 0.05;
export const TOOLS = {
    pickaxe: {
        name: 'Pickaxe', icon: '⛏️', skill: 'mining',
        tiers: [
            { tier: 1, name: 'Copper Pickaxe',  levelReq: 5,  consumes: { copper_bar: 2, normal_log: 1 } },
            { tier: 2, name: 'Iron Pickaxe',    levelReq: 15, consumes: { iron_bar: 2, oak_log: 1 } },
            { tier: 3, name: 'Mithril Pickaxe', levelReq: 40, consumes: { mithril_bar: 2, willow_log: 1 } },
            { tier: 4, name: 'Adamant Pickaxe', levelReq: 60, consumes: { adamant_bar: 2, maple_log: 1 } },
            { tier: 5, name: 'Runite Pickaxe',  levelReq: 80, consumes: { runite_bar: 2, yew_log: 1 } }
        ]
    },
    axe: {
        name: 'Axe', icon: '🪓', skill: 'woodcutting',
        tiers: [
            { tier: 1, name: 'Copper Axe',  levelReq: 5,  consumes: { copper_bar: 2, normal_log: 1 } },
            { tier: 2, name: 'Iron Axe',    levelReq: 15, consumes: { iron_bar: 2, oak_log: 1 } },
            { tier: 3, name: 'Mithril Axe', levelReq: 40, consumes: { mithril_bar: 2, willow_log: 1 } },
            { tier: 4, name: 'Adamant Axe', levelReq: 60, consumes: { adamant_bar: 2, maple_log: 1 } },
            { tier: 5, name: 'Runite Axe',  levelReq: 80, consumes: { runite_bar: 2, yew_log: 1 } }
        ]
    },
    bow: {
        name: 'Bow', icon: '🏹', skill: 'hunting',   // the whole of Hunting, river spots too (the rod went with Fishing)
        tiers: [
            { tier: 1, name: 'Shortbow',    levelReq: 5,  consumes: { normal_log: 3, copper_bar: 1 } },
            { tier: 2, name: 'Oak Bow',     levelReq: 15, consumes: { oak_log: 3, iron_bar: 1 } },
            { tier: 3, name: 'Willow Bow',  levelReq: 30, consumes: { willow_log: 3, iron_bar: 1 } },
            { tier: 4, name: 'Maple Bow',   levelReq: 45, consumes: { maple_log: 3, mithril_bar: 1 } },
            { tier: 5, name: 'Yew Bow',     levelReq: 60, consumes: { yew_log: 3, adamant_bar: 1 } },
            { tier: 6, name: 'Magic Bow',   levelReq: 75, consumes: { magic_log: 3, runite_bar: 1 } }
        ]
    },
    tinderbox: {
        name: 'Tinderbox', icon: '🧰', skill: 'firemaking',
        tiers: [
            { tier: 1, name: 'Copper Tinderbox',  levelReq: 5,  consumes: { copper_bar: 1, normal_log: 1 } },
            { tier: 2, name: 'Iron Tinderbox',    levelReq: 15, consumes: { iron_bar: 1, oak_log: 1 } },
            { tier: 3, name: 'Mithril Tinderbox', levelReq: 40, consumes: { mithril_bar: 1, willow_log: 1 } },
            { tier: 4, name: 'Adamant Tinderbox', levelReq: 60, consumes: { adamant_bar: 1, maple_log: 1 } },
            { tier: 5, name: 'Runite Tinderbox',  levelReq: 80, consumes: { runite_bar: 1, yew_log: 1 } }
        ]
    },
    hoe: {
        name: 'Hoe', icon: '🪏', skill: 'farming',
        tiers: [
            { tier: 1, name: 'Copper Hoe',  levelReq: 5,  consumes: { copper_bar: 2, normal_log: 1 } },
            { tier: 2, name: 'Iron Hoe',    levelReq: 15, consumes: { iron_bar: 2, oak_log: 1 } },
            { tier: 3, name: 'Mithril Hoe', levelReq: 40, consumes: { mithril_bar: 2, willow_log: 1 } },
            { tier: 4, name: 'Adamant Hoe', levelReq: 60, consumes: { adamant_bar: 2, maple_log: 1 } },
            { tier: 5, name: 'Runite Hoe',  levelReq: 80, consumes: { runite_bar: 2, yew_log: 1 } }
        ]
    }
};

// Melvor pace: smelting, forging and jewellery that open late give less than their base XP (data/pace.js).
paceList('smithing', SMELTING_RECIPES);
paceList('smithing', METALS, { key: 'xpPerBar' });
paceList('crafting', GEM_TIERS);

export function toolTierDef(toolId, tier) {
    const tool = TOOLS[toolId];
    if (!tool) return null;
    return tool.tiers.find(t => t.tier === tier) || null;
}
