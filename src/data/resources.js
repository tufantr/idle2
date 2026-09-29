// Every stackable thing the player can own, except gold (state.gold) and equipment (state.inventory).
// `tier` drives sell value, loot tables and tool/recipe requirements. `category` drives icons and filters.

const R = (id, name, category, tier, icon, color, extra = {}) => ({ id, name, category, tier, icon, color, ...extra });

export const RESOURCES = {
    // Ores (mining)
    copper_ore:  R('copper_ore',  'Copper Ore',    'ore', 1, '🪨', '#b87333'),
    iron_ore:    R('iron_ore',    'Iron Ore',      'ore', 2, '⛓️', '#cbd5e1'),
    coal:        R('coal',        'Coal',          'ore', 2, '⚫', '#64748b'),
    silver_ore:  R('silver_ore',  'Silver Ore',    'ore', 3, '🥈', '#e2e8f0'),
    mithril_ore: R('mithril_ore', 'Mithril Ore',   'ore', 3, '💠', '#3b82f6'),
    gold_ore:    R('gold_ore',    'Gold Ore',      'ore', 4, '🥇', '#fbbf24'),
    adamant_ore: R('adamant_ore', 'Adamantite Ore','ore', 4, '🟩', '#10b981'),
    runite_ore:  R('runite_ore',  'Runite Ore',    'ore', 5, '🔷', '#06b6d4'),

    // Bars (smithing). `metalTier` is the armour/weapon ladder; silver and gold are jewellery metals.
    copper_bar:  R('copper_bar',  'Copper Bar',  'bar', 1, '🧱', '#b87333', { metalTier: 1, power: 1.0 }),
    iron_bar:    R('iron_bar',    'Iron Bar',    'bar', 2, '🔩', '#cbd5e1', { metalTier: 2, power: 2.2 }),
    silver_bar:  R('silver_bar',  'Silver Bar',  'bar', 3, '🥈', '#e2e8f0', { jewel: true, power: 2.2 }),
    mithril_bar: R('mithril_bar', 'Mithril Bar', 'bar', 3, '💠', '#3b82f6', { metalTier: 3, power: 4.8 }),
    gold_bar:    R('gold_bar',    'Gold Bar',    'bar', 4, '🥇', '#fbbf24', { jewel: true, power: 10.6 }),
    adamant_bar: R('adamant_bar', 'Adamant Bar', 'bar', 4, '🟩', '#10b981', { metalTier: 4, power: 10.6 }),
    runite_bar:  R('runite_bar',  'Runite Bar',  'bar', 5, '🔷', '#06b6d4', { metalTier: 5, power: 23.4 }),

    // Gems (bonus drops while mining; crafting)
    amethyst: R('amethyst', 'Amethyst', 'gem', 1, '🟣', '#a855f7', { power: 1.0 }),
    topaz:    R('topaz',    'Topaz',    'gem', 2, '🟨', '#facc15', { power: 2.2 }),
    sapphire: R('sapphire', 'Sapphire', 'gem', 3, '🔵', '#3b82f6', { power: 4.8 }),
    emerald:  R('emerald',  'Emerald',  'gem', 4, '🟢', '#10b981', { power: 10.6 }),
    ruby:     R('ruby',     'Ruby',     'gem', 5, '🔴', '#ef4444', { power: 23.4 }),
    diamond:  R('diamond',  'Diamond',  'gem', 6, '💎', '#e2e8f0', { power: 51.0 }),

    // Logs (woodcutting): cooking fuel, tool handles, bows
    normal_log: R('normal_log', 'Logs',        'log', 1, '🪵', '#a16207'),
    oak_log:    R('oak_log',    'Oak Logs',    'log', 2, '🪵', '#ca8a04'),
    willow_log: R('willow_log', 'Willow Logs', 'log', 3, '🪵', '#84cc16'),
    maple_log:  R('maple_log',  'Maple Logs',  'log', 4, '🪵', '#f97316'),
    yew_log:    R('yew_log',    'Yew Logs',    'log', 5, '🪵', '#22c55e'),
    magic_log:  R('magic_log',  'Magic Logs',  'log', 6, '🪵', '#a855f7'),

    // Raw meat (hunting) and cooked food (cooking). `heals` is HP restored when eaten.
    raw_rabbit: R('raw_rabbit', 'Raw Rabbit', 'raw', 1, '🥩', '#fb923c'),
    raw_fox:    R('raw_fox',    'Raw Fox',    'raw', 2, '🥩', '#fb923c'),
    raw_boar:   R('raw_boar',   'Raw Boar',   'raw', 3, '🥩', '#fb923c'),
    raw_deer:   R('raw_deer',   'Raw Venison','raw', 4, '🥩', '#fb923c'),
    raw_bear:   R('raw_bear',   'Raw Bear',   'raw', 5, '🥩', '#fb923c'),
    raw_drake:  R('raw_drake',  'Raw Drake',  'raw', 6, '🥩', '#fb923c'),
    raw_dragon: R('raw_dragon', 'Raw Dragon', 'raw', 7, '🥩', '#fb923c'),
    cooked_rabbit: R('cooked_rabbit', 'Roast Rabbit',  'food', 1, '🍖', '#f59e0b', { heals: 40 }),
    cooked_fox:    R('cooked_fox',    'Roast Fox',     'food', 2, '🍖', '#f59e0b', { heals: 80 }),
    cooked_boar:   R('cooked_boar',   'Roast Boar',    'food', 3, '🍖', '#f59e0b', { heals: 150 }),
    cooked_deer:   R('cooked_deer',   'Roast Venison', 'food', 4, '🍖', '#f59e0b', { heals: 260 }),
    cooked_bear:   R('cooked_bear',   'Roast Bear',    'food', 5, '🍖', '#f59e0b', { heals: 420 }),
    cooked_drake:  R('cooked_drake',  'Roast Drake',   'food', 6, '🍖', '#f59e0b', { heals: 650 }),
    cooked_dragon: R('cooked_dragon', 'Roast Dragon',  'food', 7, '🍖', '#f59e0b', { heals: 1000 }),

    // Raw fish (fishing) and cooked fish: a little more healing than meat of the same level.
    raw_shrimp:    R('raw_shrimp',    'Raw Shrimp',    'raw', 1, '🦐', '#fda4af'),
    raw_trout:     R('raw_trout',     'Raw Trout',     'raw', 2, '🐟', '#93c5fd'),
    raw_salmon:    R('raw_salmon',    'Raw Salmon',    'raw', 3, '🐟', '#fb7185'),
    raw_lobster:   R('raw_lobster',   'Raw Lobster',   'raw', 4, '🦞', '#ef4444'),
    raw_swordfish: R('raw_swordfish', 'Raw Swordfish', 'raw', 5, '🐡', '#60a5fa'),
    raw_shark:     R('raw_shark',     'Raw Shark',     'raw', 6, '🦈', '#94a3b8'),
    raw_leviathan: R('raw_leviathan', 'Raw Leviathan', 'raw', 7, '🐋', '#6366f1'),
    cooked_shrimp:    R('cooked_shrimp',    'Grilled Shrimp',  'food', 1, '🍤', '#fb923c', { heals: 45 }),
    cooked_trout:     R('cooked_trout',     'Grilled Trout',   'food', 2, '🍣', '#fb923c', { heals: 90 }),
    cooked_salmon:    R('cooked_salmon',    'Grilled Salmon',  'food', 3, '🍣', '#fb923c', { heals: 165 }),
    cooked_lobster:   R('cooked_lobster',   'Boiled Lobster',  'food', 4, '🦞', '#fb923c', { heals: 285 }),
    cooked_swordfish: R('cooked_swordfish', 'Swordfish Steak', 'food', 5, '🍱', '#fb923c', { heals: 460 }),
    cooked_shark:     R('cooked_shark',     'Shark Fillet',    'food', 6, '🍱', '#fb923c', { heals: 715 }),
    cooked_leviathan: R('cooked_leviathan', 'Leviathan Feast', 'food', 7, '🍲', '#fb923c', { heals: 1100 }),

    // Crops (farming) and the dishes they make. Dishes take two crops (one potato).
    potato:    R('potato',    'Potato',    'crop', 1, '🥔', '#d6a55f'),
    cabbage:   R('cabbage',   'Cabbage',   'crop', 2, '🥬', '#4ade80'),
    pumpkin:   R('pumpkin',   'Pumpkin',   'crop', 4, '🎃', '#f97316'),
    starfruit: R('starfruit', 'Starfruit', 'crop', 5, '⭐', '#facc15'),
    baked_potato:   R('baked_potato',   'Baked Potato',   'food', 1, '🥔', '#f59e0b', { heals: 55 }),
    cabbage_soup:   R('cabbage_soup',   'Cabbage Soup',   'food', 3, '🥣', '#f59e0b', { heals: 170 }),
    pumpkin_pie:    R('pumpkin_pie',    'Pumpkin Pie',    'food', 4, '🥧', '#f59e0b', { heals: 330 }),
    starfruit_tart: R('starfruit_tart', 'Starfruit Tart', 'food', 5, '🥮', '#f59e0b', { heals: 600 }),

    // Herbs (alchemy foraging) and potions (alchemy brewing). Potions hold `charges` combat actions.
    guam_leaf:        R('guam_leaf',        'Guam Leaf',        'herb', 1, '🌿', '#10b981'),
    marrentill_leaf:  R('marrentill_leaf',  'Marrentill Root',  'herb', 2, '🌿', '#10b981'),
    tarromin_leaf:    R('tarromin_leaf',    'Tarromin Spore',   'herb', 3, '🌿', '#10b981'),
    harralander_leaf: R('harralander_leaf', 'Harralander Lotus','herb', 4, '🌿', '#10b981'),
    accuracy_potion: R('accuracy_potion', 'Accuracy Potion', 'potion', 1, '🧪', '#f87171', { effect: 'atk',   desc: '+20% ATK' }),
    defense_potion:  R('defense_potion',  'Defense Potion',  'potion', 2, '🧪', '#60a5fa', { effect: 'def',   desc: '+20% DEF' }),
    evasion_potion:  R('evasion_potion',  'Evasion Potion',  'potion', 3, '🧪', '#34d399', { effect: 'dodge', desc: '+15% Dodge' }),
    health_potion:   R('health_potion',   'Health Potion',   'potion', 4, '🧪', '#f472b6', { effect: 'hp',    desc: '+25% Max HP' }),

    // Combat-only materials. Essence fuels equipment upgrades — the one thing crafting cannot make.
    // Bait drops in the wetter zones: each catch uses one, if you have it, for a likely second fish.
    essence: R('essence', 'Monster Essence', 'material', 1, '✨', '#c084fc'),
    fishing_bait: R('fishing_bait', 'Fishing Bait', 'material', 1, '🪱', '#fca5a5')
};

export const RESOURCE_IDS = Object.keys(RESOURCES);

export function resourceById(id) {
    return RESOURCES[id] || null;
}

export function resourcesOfCategory(category) {
    return RESOURCE_IDS.filter(id => RESOURCES[id].category === category).map(id => RESOURCES[id]);
}

// Vendor prices per unit. Combat gold (see formulas.js) is meant to dwarf these
// by the mid game, so selling raw materials is a bootstrap, not the economy.
const SELL_BASE = { ore: 3, bar: 8, gem: 25, log: 2, raw: 3, food: 6, herb: 4, crop: 3, potion: 30, material: 0 };
export function sellValue(id) {
    const res = RESOURCES[id];
    if (!res) return 0;
    const base = SELL_BASE[res.category] || 0;
    return Math.round(base * Math.pow(1.6, res.tier - 1));
}

/** Resources of a category ordered by tier (used for "best food" style pickers). */
export function orderedByTier(category) {
    return resourcesOfCategory(category).sort((a, b) => a.tier - b.tier);
}

/** Every food, smallest heal first (auto-eat picks the smallest that fills the gap). */
export function foodsByHealing() {
    return resourcesOfCategory('food').sort((a, b) => a.heals - b.heals);
}
