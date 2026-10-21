// Skill definitions and their action nodes.
// Intervals are milliseconds at level 1 with no tool; XP is per completed action.
// XP per hour roughly doubles every ~15 levels through new nodes and tools (see docs/DESIGN.md §3.2).

import { paceList } from './pace.js';

export const SKILL_IDS = ['mining', 'woodcutting', 'hunting', 'cooking', 'firemaking', 'alchemy', 'farming', 'agility', 'smithing', 'crafting', 'combat'];
export const GATHERING_SKILLS = ['mining', 'woodcutting', 'hunting'];
export const PRODUCTION_SKILLS = ['cooking', 'firemaking', 'alchemy'];
export const WORKSHOP_SKILLS = ['smithing', 'crafting'];
// Skills with a mini-game and the Forager perk: gathering and production.
export const NON_COMBAT_SKILLS = [...GATHERING_SKILLS, ...PRODUCTION_SKILLS];
// Every skill with a speed modifier. Farming's "speed" is how fast plots grow (set when planting),
// agility's is how fast you run the course.
export const SPEED_SKILLS = [...NON_COMBAT_SKILLS, ...WORKSHOP_SKILLS, 'farming', 'agility'];

export const SKILLS = {
    mining: {
        id: 'mining', name: 'Mining', icon: '⛏️', color: '#34d399', tool: 'pickaxe',
        desc: 'Ore for smithing. Gems turn up while you dig.',
        nodes: [
            { id: 'copper_ore',  name: 'Copper Vein',      levelReq: 1,  interval: 3000, xp: 8,   produces: 'copper_ore' },
            { id: 'iron_ore',    name: 'Iron Vein',        levelReq: 10, interval: 3000, xp: 14,  produces: 'iron_ore' },
            { id: 'coal',        name: 'Coal Seam',        levelReq: 15, interval: 3000, xp: 18,  produces: 'coal' },
            { id: 'silver_ore',  name: 'Silver Vein',      levelReq: 30, interval: 3200, xp: 32,  produces: 'silver_ore' },
            { id: 'mithril_ore', name: 'Mithril Deposit',  levelReq: 40, interval: 3400, xp: 48,  produces: 'mithril_ore' },
            { id: 'gold_ore',    name: 'Gold Vein',        levelReq: 50, interval: 3600, xp: 65,  produces: 'gold_ore' },
            { id: 'adamant_ore', name: 'Adamantite Rock',  levelReq: 60, interval: 3800, xp: 88,  produces: 'adamant_ore' },
            { id: 'runite_ore',  name: 'Runite Spire',     levelReq: 75, interval: 4200, xp: 130, produces: 'runite_ore' }
        ]
    },
    woodcutting: {
        id: 'woodcutting', name: 'Woodcutting', icon: '🌳', color: '#22c55e', tool: 'axe',
        desc: 'Logs fuel cooking, handle tools and become bows.',
        nodes: [
            { id: 'normal_log', name: 'Tree',        levelReq: 1,  interval: 3000, xp: 10,  produces: 'normal_log' },
            { id: 'oak_log',    name: 'Oak Tree',    levelReq: 15, interval: 3000, xp: 18,  produces: 'oak_log' },
            { id: 'willow_log', name: 'Willow Tree', levelReq: 30, interval: 3200, xp: 30,  produces: 'willow_log' },
            { id: 'maple_log',  name: 'Maple Tree',  levelReq: 45, interval: 3400, xp: 50,  produces: 'maple_log' },
            { id: 'yew_log',    name: 'Yew Tree',    levelReq: 60, interval: 3800, xp: 82,  produces: 'yew_log' },
            { id: 'magic_log',  name: 'Magic Tree',  levelReq: 75, interval: 4200, xp: 125, produces: 'magic_log' }
        ]
    },
    // Hunting: game in the forest and, since October 2026, fish in the river (Fishing was its mirror, seven
    // spots at the same levels and dishes a point apart: the owner made them one skill). A river spot
    // (`fish`) uses bait for a likely second catch, and shows the river and the rod on the skill's stage.
    hunting: {
        id: 'hunting', name: 'Hunting', icon: '🏹', color: '#f59e0b', tool: 'bow',
        desc: 'Game in the forest and fish in the river, for the kitchen: fish cook into food a little better than meat of their level. Better bows mean faster catches, and bait makes a second fish likely.',
        nodes: [
            { id: 'raw_rabbit', name: 'Rabbit', levelReq: 1,  interval: 4000, xp: 12,  produces: 'raw_rabbit' },
            { id: 'raw_fox',    name: 'Fox',    levelReq: 15, interval: 4000, xp: 22,  produces: 'raw_fox' },
            { id: 'raw_boar',   name: 'Boar',   levelReq: 30, interval: 4200, xp: 36,  produces: 'raw_boar' },
            { id: 'raw_deer',   name: 'Deer',   levelReq: 45, interval: 4400, xp: 58,  produces: 'raw_deer' },
            { id: 'raw_bear',   name: 'Bear',   levelReq: 60, interval: 4800, xp: 90,  produces: 'raw_bear' },
            { id: 'raw_drake',  name: 'Drake',  levelReq: 75, interval: 5200, xp: 135, produces: 'raw_drake' },
            { id: 'raw_dragon', name: 'Dragon', levelReq: 90, interval: 6000, xp: 210, produces: 'raw_dragon' },
            { id: 'raw_shrimp',     name: 'Shrimp Shallows', levelReq: 1,  interval: 3600, xp: 11,  fish: true, produces: 'raw_shrimp' },
            { id: 'raw_trout',      name: 'Trout Stream',    levelReq: 15, interval: 3600, xp: 21,  fish: true, produces: 'raw_trout' },
            { id: 'raw_salmon',     name: 'Salmon Run',      levelReq: 30, interval: 3800, xp: 34,  fish: true, produces: 'raw_salmon' },
            { id: 'raw_lobster',    name: 'Lobster Pots',    levelReq: 45, interval: 4000, xp: 55,  fish: true, produces: 'raw_lobster' },
            { id: 'raw_swordfish',  name: 'Swordfish Banks', levelReq: 60, interval: 4400, xp: 86,  fish: true, produces: 'raw_swordfish' },
            { id: 'raw_shark',      name: 'Shark Waters',    levelReq: 75, interval: 4800, xp: 130, fish: true, produces: 'raw_shark' },
            { id: 'raw_leviathan',  name: 'Leviathan Deep',  levelReq: 90, interval: 5500, xp: 200, fish: true, produces: 'raw_leviathan' }
        ]
    },
    cooking: {
        id: 'cooking', name: 'Cooking', icon: '🍳', color: '#fb923c',
        desc: 'Turns raw meat and fish into food that keeps you alive in combat. Every dish burns a log, the better the dish the better the log.',
        nodes: [
            { id: 'cooked_rabbit', name: 'Roast Rabbit',  levelReq: 1,  interval: 2500, xp: 15,  produces: 'cooked_rabbit', consumes: { raw_rabbit: 1, normal_log: 1 } },
            { id: 'cooked_fox',    name: 'Roast Fox',     levelReq: 15, interval: 2500, xp: 26,  produces: 'cooked_fox',    consumes: { raw_fox: 1, oak_log: 1 } },
            { id: 'cooked_boar',   name: 'Roast Boar',    levelReq: 30, interval: 2800, xp: 42,  produces: 'cooked_boar',   consumes: { raw_boar: 1, willow_log: 1 } },
            { id: 'cooked_deer',   name: 'Roast Venison', levelReq: 45, interval: 3000, xp: 68,  produces: 'cooked_deer',   consumes: { raw_deer: 1, maple_log: 1 } },
            { id: 'cooked_bear',   name: 'Roast Bear',    levelReq: 60, interval: 3300, xp: 105, produces: 'cooked_bear',   consumes: { raw_bear: 1, yew_log: 1 } },
            { id: 'cooked_drake',  name: 'Roast Drake',   levelReq: 75, interval: 3600, xp: 160, produces: 'cooked_drake',  consumes: { raw_drake: 1, magic_log: 1 } },
            { id: 'cooked_dragon', name: 'Roast Dragon',  levelReq: 90, interval: 4000, xp: 240, produces: 'cooked_dragon', consumes: { raw_dragon: 1, magic_log: 1 } },
            { id: 'cooked_shrimp',    name: 'Grilled Shrimp',    levelReq: 1,  interval: 2500, xp: 14,  produces: 'cooked_shrimp',    consumes: { raw_shrimp: 1, normal_log: 1 } },
            { id: 'cooked_trout',     name: 'Grilled Trout',     levelReq: 15, interval: 2500, xp: 25,  produces: 'cooked_trout',     consumes: { raw_trout: 1, oak_log: 1 } },
            { id: 'cooked_salmon',    name: 'Grilled Salmon',    levelReq: 30, interval: 2800, xp: 40,  produces: 'cooked_salmon',    consumes: { raw_salmon: 1, willow_log: 1 } },
            { id: 'cooked_lobster',   name: 'Boiled Lobster',    levelReq: 45, interval: 3000, xp: 65,  produces: 'cooked_lobster',   consumes: { raw_lobster: 1, maple_log: 1 } },
            { id: 'cooked_swordfish', name: 'Swordfish Steak',   levelReq: 60, interval: 3300, xp: 100, produces: 'cooked_swordfish', consumes: { raw_swordfish: 1, yew_log: 1 } },
            { id: 'cooked_shark',     name: 'Shark Fillet',      levelReq: 75, interval: 3600, xp: 155, produces: 'cooked_shark',     consumes: { raw_shark: 1, magic_log: 1 } },
            { id: 'cooked_leviathan', name: 'Leviathan Feast',   levelReq: 90, interval: 4000, xp: 235, produces: 'cooked_leviathan', consumes: { raw_leviathan: 1, magic_log: 1 } },
            { id: 'baked_potato',     name: 'Baked Potato',      levelReq: 5,  interval: 2200, xp: 12,  produces: 'baked_potato',     consumes: { potato: 1, normal_log: 1 } },
            { id: 'cabbage_soup',     name: 'Cabbage Soup',      levelReq: 25, interval: 2600, xp: 38,  produces: 'cabbage_soup',     consumes: { cabbage: 2, oak_log: 1 } },
            { id: 'pumpkin_pie',      name: 'Pumpkin Pie',       levelReq: 50, interval: 3000, xp: 80,  produces: 'pumpkin_pie',      consumes: { pumpkin: 2, maple_log: 1 } },
            { id: 'starfruit_tart',   name: 'Starfruit Tart',    levelReq: 70, interval: 3400, xp: 140, produces: 'starfruit_tart',   consumes: { starfruit: 2, yew_log: 1 } }
        ]
    },
    firemaking: {
        id: 'firemaking', name: 'Firemaking', icon: '🔥', color: '#f97316', tool: 'tinderbox',
        desc: 'Burn logs for XP. Every log feeds the bonfire: while it burns, every skill earns more XP, and every skill that makes something may make two.',
        nodes: [
            { id: 'burn_normal_log', name: 'Burn Logs',        levelReq: 1,  interval: 2000, xp: 16,  consumes: { normal_log: 1 }, bonfireLog: 'normal_log' },
            { id: 'burn_oak_log',    name: 'Burn Oak Logs',    levelReq: 15, interval: 2000, xp: 28,  consumes: { oak_log: 1 },    bonfireLog: 'oak_log' },
            { id: 'burn_willow_log', name: 'Burn Willow Logs', levelReq: 30, interval: 2200, xp: 46,  consumes: { willow_log: 1 }, bonfireLog: 'willow_log' },
            { id: 'burn_maple_log',  name: 'Burn Maple Logs',  levelReq: 45, interval: 2400, xp: 76,  consumes: { maple_log: 1 },  bonfireLog: 'maple_log' },
            { id: 'burn_yew_log',    name: 'Burn Yew Logs',    levelReq: 60, interval: 2600, xp: 120, consumes: { yew_log: 1 },    bonfireLog: 'yew_log' },
            { id: 'burn_magic_log',  name: 'Burn Magic Logs',  levelReq: 75, interval: 2800, xp: 185, consumes: { magic_log: 1 },  bonfireLog: 'magic_log' }
        ]
    },
    alchemy: {
        id: 'alchemy', name: 'Alchemy', icon: '🧪', color: '#10b981',
        desc: 'Forage herbs, then brew them into potions: combat potions for the fight, dungeon potions for dungeon runs and skill potions for work, each stronger with a better herb.',
        // (each tier's herb with one thing from another skill: ore for the fight, a cooked dish for the dungeons, logs for work)
        nodes: [
            { id: 'guam_leaf',        name: 'Forage Guam',        levelReq: 1,  interval: 3500, xp: 10,  produces: 'guam_leaf' },
            { id: 'combat_potion_1',  name: 'Combat Potion I',    levelReq: 5,  interval: 2500, xp: 30,  produces: 'combat_potion_1',  consumes: { guam_leaf: 1, copper_ore: 1 } },
            { id: 'skill_potion_1',   name: 'Skill Potion I',     levelReq: 8,  interval: 2500, xp: 33,  produces: 'skill_potion_1',   consumes: { guam_leaf: 1, normal_log: 1 } },
            { id: 'dungeon_potion_1', name: 'Dungeon Potion I',   levelReq: 11, interval: 2600, xp: 38,  produces: 'dungeon_potion_1', consumes: { guam_leaf: 1, cooked_rabbit: 1 } },
            { id: 'marrentill_leaf',  name: 'Forage Marrentill',  levelReq: 15, interval: 3800, xp: 24,  produces: 'marrentill_leaf' },
            { id: 'combat_potion_2',  name: 'Combat Potion II',   levelReq: 20, interval: 2600, xp: 55,  produces: 'combat_potion_2',  consumes: { marrentill_leaf: 1, iron_ore: 1 } },
            { id: 'skill_potion_2',   name: 'Skill Potion II',    levelReq: 24, interval: 2700, xp: 60,  produces: 'skill_potion_2',   consumes: { marrentill_leaf: 1, oak_log: 1 } },
            { id: 'dungeon_potion_2', name: 'Dungeon Potion II',  levelReq: 28, interval: 2700, xp: 66,  produces: 'dungeon_potion_2', consumes: { marrentill_leaf: 1, cooked_fox: 1 } },
            { id: 'tarromin_leaf',    name: 'Forage Tarromin',    levelReq: 35, interval: 4200, xp: 45,  produces: 'tarromin_leaf' },
            { id: 'combat_potion_3',  name: 'Combat Potion III',  levelReq: 40, interval: 2800, xp: 95,  produces: 'combat_potion_3',  consumes: { tarromin_leaf: 1, mithril_ore: 1 } },
            { id: 'skill_potion_3',   name: 'Skill Potion III',   levelReq: 44, interval: 2900, xp: 102, produces: 'skill_potion_3',   consumes: { tarromin_leaf: 1, willow_log: 1 } },
            { id: 'dungeon_potion_3', name: 'Dungeon Potion III', levelReq: 48, interval: 2900, xp: 110, produces: 'dungeon_potion_3', consumes: { tarromin_leaf: 1, cooked_boar: 1 } },
            { id: 'harralander_leaf', name: 'Forage Harralander', levelReq: 55, interval: 4600, xp: 75,  produces: 'harralander_leaf' },
            { id: 'combat_potion_4',  name: 'Combat Potion IV',   levelReq: 60, interval: 3000, xp: 150, produces: 'combat_potion_4',  consumes: { harralander_leaf: 1, adamant_ore: 1 } },
            { id: 'skill_potion_4',   name: 'Skill Potion IV',    levelReq: 64, interval: 3100, xp: 160, produces: 'skill_potion_4',   consumes: { harralander_leaf: 1, maple_log: 1 } },
            { id: 'dungeon_potion_4', name: 'Dungeon Potion IV',  levelReq: 68, interval: 3100, xp: 172, produces: 'dungeon_potion_4', consumes: { harralander_leaf: 1, cooked_deer: 1 } }
        ]
    },
    farming: {
        id: 'farming', name: 'Farming', icon: '🌾', color: '#84cc16', tool: 'hoe',
        desc: 'Plots grow on the clock while you do something else. Herbs for alchemy, crops for the kitchen.',
        nodes: [] // crops live in data/farming.js
    },
    agility: {
        id: 'agility', name: 'Agility', icon: '🤸', color: '#e11d48',
        desc: 'Build an obstacle course: every obstacle is a permanent bonus. Run the course to train.',
        nodes: [] // obstacles live in data/agility.js
    },
    smithing: {
        id: 'smithing', name: 'Smithing', icon: '⚒️', color: '#f8fafc',
        desc: 'Smelt ore into bars, and work the gear you find at the anvil.',
        nodes: [] // recipes live in data/workshop.js
    },
    crafting: {
        id: 'crafting', name: 'Crafting', icon: '💍', color: '#e879f9',
        desc: 'Jewellery from precious bars, set with a gem or plain.',
        nodes: []
    },
    combat: {
        id: 'combat', name: 'Combat', icon: '⚔️', color: '#ef4444',
        desc: 'Every level adds attack, defence and hitpoints.',
        nodes: []
    }
};

// Melvor pace: nodes that open late give less than their base XP above (data/pace.js).
for (const [id, skill] of Object.entries(SKILLS)) paceList(id, skill.nodes);

export function skillNode(skillId, nodeId) {
    const skill = Object.hasOwn(SKILLS, skillId) ? SKILLS[skillId] : null;   // not 'constructor', from a save
    if (!skill) return null;
    return skill.nodes.find(node => node.id === nodeId) || null;
}
