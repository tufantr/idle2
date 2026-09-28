// Skill definitions and their action nodes.
// Intervals are milliseconds at level 1 with no tool; XP is per completed action.
// XP per hour roughly doubles every ~15 levels through new nodes and tools (see docs/DESIGN.md §3.2).

export const SKILL_IDS = ['mining', 'woodcutting', 'hunting', 'cooking', 'alchemy', 'smithing', 'crafting', 'combat'];
export const GATHERING_SKILLS = ['mining', 'woodcutting', 'hunting'];
export const PRODUCTION_SKILLS = ['cooking', 'alchemy'];
export const WORKSHOP_SKILLS = ['smithing', 'crafting'];
export const NON_COMBAT_SKILLS = [...GATHERING_SKILLS, ...PRODUCTION_SKILLS];

export const SKILLS = {
    mining: {
        id: 'mining', name: 'Mining', icon: '⛏️', color: '#34d399', tool: 'pickaxe',
        desc: 'Ore for smithing. Gems turn up while you dig.',
        nodes: [
            { id: 'copper_ore',  name: 'Copper Vein',      levelReq: 1,  interval: 3000, xp: 8,   produces: 'copper_ore' },
            { id: 'iron_ore',    name: 'Iron Vein',        levelReq: 10, interval: 3000, xp: 14,  produces: 'iron_ore' },
            { id: 'coal',        name: 'Coal Seam',        levelReq: 20, interval: 3000, xp: 22,  produces: 'coal' },
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
    hunting: {
        id: 'hunting', name: 'Hunting', icon: '🏹', color: '#f59e0b', tool: 'bow',
        desc: 'Raw meat for the kitchen. Better bows mean faster kills.',
        nodes: [
            { id: 'raw_rabbit', name: 'Rabbit', levelReq: 1,  interval: 4000, xp: 12,  produces: 'raw_rabbit' },
            { id: 'raw_fox',    name: 'Fox',    levelReq: 15, interval: 4000, xp: 22,  produces: 'raw_fox' },
            { id: 'raw_boar',   name: 'Boar',   levelReq: 30, interval: 4200, xp: 36,  produces: 'raw_boar' },
            { id: 'raw_deer',   name: 'Deer',   levelReq: 45, interval: 4400, xp: 58,  produces: 'raw_deer' },
            { id: 'raw_bear',   name: 'Bear',   levelReq: 60, interval: 4800, xp: 90,  produces: 'raw_bear' },
            { id: 'raw_drake',  name: 'Drake',  levelReq: 75, interval: 5200, xp: 135, produces: 'raw_drake' },
            { id: 'raw_dragon', name: 'Dragon', levelReq: 90, interval: 6000, xp: 210, produces: 'raw_dragon' }
        ]
    },
    cooking: {
        id: 'cooking', name: 'Cooking', icon: '🍳', color: '#fb923c',
        desc: 'Turns raw meat into food that keeps you alive in combat. Every dish burns one log.',
        nodes: [
            { id: 'cooked_rabbit', name: 'Roast Rabbit',  levelReq: 1,  interval: 2500, xp: 15,  produces: 'cooked_rabbit', consumes: { raw_rabbit: 1 }, fuel: 1 },
            { id: 'cooked_fox',    name: 'Roast Fox',     levelReq: 15, interval: 2500, xp: 26,  produces: 'cooked_fox',    consumes: { raw_fox: 1 },    fuel: 1 },
            { id: 'cooked_boar',   name: 'Roast Boar',    levelReq: 30, interval: 2800, xp: 42,  produces: 'cooked_boar',   consumes: { raw_boar: 1 },   fuel: 1 },
            { id: 'cooked_deer',   name: 'Roast Venison', levelReq: 45, interval: 3000, xp: 68,  produces: 'cooked_deer',   consumes: { raw_deer: 1 },   fuel: 1 },
            { id: 'cooked_bear',   name: 'Roast Bear',    levelReq: 60, interval: 3300, xp: 105, produces: 'cooked_bear',   consumes: { raw_bear: 1 },   fuel: 1 },
            { id: 'cooked_drake',  name: 'Roast Drake',   levelReq: 75, interval: 3600, xp: 160, produces: 'cooked_drake',  consumes: { raw_drake: 1 },  fuel: 1 },
            { id: 'cooked_dragon', name: 'Roast Dragon',  levelReq: 90, interval: 4000, xp: 240, produces: 'cooked_dragon', consumes: { raw_dragon: 1 }, fuel: 1 }
        ]
    },
    alchemy: {
        id: 'alchemy', name: 'Alchemy', icon: '🧪', color: '#10b981',
        desc: 'Forage herbs, then brew them with a secondary ingredient into combat potions.',
        nodes: [
            { id: 'guam_leaf',        name: 'Forage Guam',        levelReq: 1,  interval: 3500, xp: 10,  produces: 'guam_leaf' },
            { id: 'accuracy_potion',  name: 'Accuracy Potion',    levelReq: 5,  interval: 2500, xp: 30,  produces: 'accuracy_potion', consumes: { guam_leaf: 1, copper_ore: 1 } },
            { id: 'marrentill_leaf',  name: 'Forage Marrentill',  levelReq: 15, interval: 3800, xp: 24,  produces: 'marrentill_leaf' },
            { id: 'defense_potion',   name: 'Defense Potion',     levelReq: 20, interval: 2600, xp: 55,  produces: 'defense_potion',  consumes: { marrentill_leaf: 1, oak_log: 1 } },
            { id: 'tarromin_leaf',    name: 'Forage Tarromin',    levelReq: 35, interval: 4200, xp: 45,  produces: 'tarromin_leaf' },
            { id: 'evasion_potion',   name: 'Evasion Potion',     levelReq: 40, interval: 2800, xp: 95,  produces: 'evasion_potion',  consumes: { tarromin_leaf: 1, raw_fox: 1 } },
            { id: 'harralander_leaf', name: 'Forage Harralander', levelReq: 55, interval: 4600, xp: 75,  produces: 'harralander_leaf' },
            { id: 'health_potion',    name: 'Health Potion',      levelReq: 60, interval: 3000, xp: 150, produces: 'health_potion',   consumes: { harralander_leaf: 1, cooked_boar: 1 } }
        ]
    },
    smithing: {
        id: 'smithing', name: 'Smithing', icon: '⚒️', color: '#f8fafc',
        desc: 'Smelt ore into bars, then forge bars into armour, weapons and tools.',
        nodes: [] // recipes live in data/workshop.js
    },
    crafting: {
        id: 'crafting', name: 'Crafting', icon: '💍', color: '#e879f9',
        desc: 'Jewellery from precious bars and gems; bows from logs.',
        nodes: []
    },
    combat: {
        id: 'combat', name: 'Combat', icon: '⚔️', color: '#ef4444',
        desc: 'Every level adds attack, defence and hitpoints.',
        nodes: []
    }
};

export function skillNode(skillId, nodeId) {
    const skill = SKILLS[skillId];
    if (!skill) return null;
    return skill.nodes.find(node => node.id === nodeId) || null;
}
