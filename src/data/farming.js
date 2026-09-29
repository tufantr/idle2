// Farming: the first parallel skill. Plots grow on the wall clock while any other action runs
// (and while you're away); planting and harvesting are instant clicks. Seeds are bought when you
// plant for a flat price: farming is for everyone, not only for players who fight at their best stage.
//
// XP per plot-hour roughly doubles every ~15 levels, like the other skills' nodes. A plot is worth
// about an eighth of an active skill's XP per hour, which suits a skill you only check on.

// Plots open with farming level.
export const FARMING_PLOTS = [1, 1, 15, 30, 50, 70];

export const CROPS = [
    { id: 'potato',      name: 'Potatoes',    icon: '🥔', levelReq: 1,  growMs: 10 * 60000, yield: [6, 10], produces: 'potato',           xp: 21,   seedGold: 25 },
    { id: 'guam',        name: 'Guam',        icon: '🌿', levelReq: 5,  growMs: 15 * 60000, yield: [4, 8],  produces: 'guam_leaf',        xp: 50,   seedGold: 50 },
    { id: 'cabbage',     name: 'Cabbages',    icon: '🥬', levelReq: 15, growMs: 20 * 60000, yield: [6, 10], produces: 'cabbage',          xp: 71,   seedGold: 100 },
    { id: 'marrentill',  name: 'Marrentill',  icon: '🌿', levelReq: 20, growMs: 25 * 60000, yield: [4, 8],  produces: 'marrentill_leaf',  xp: 139,  seedGold: 200 },
    { id: 'tarromin',    name: 'Tarromin',    icon: '🌿', levelReq: 35, growMs: 40 * 60000, yield: [4, 8],  produces: 'tarromin_leaf',    xp: 367,  seedGold: 500 },
    { id: 'pumpkin',     name: 'Pumpkins',    icon: '🎃', levelReq: 40, growMs: 45 * 60000, yield: [5, 9],  produces: 'pumpkin',          xp: 407,  seedGold: 800 },
    { id: 'harralander', name: 'Harralander', icon: '🌿', levelReq: 55, growMs: 60 * 60000, yield: [4, 8],  produces: 'harralander_leaf', xp: 1000, seedGold: 2000 },
    { id: 'starfruit',   name: 'Starfruit',   icon: '⭐', levelReq: 65, growMs: 90 * 60000, yield: [5, 9],  produces: 'starfruit',        xp: 1714, seedGold: 4000 }
];

export function cropById(id) {
    return CROPS.find(c => c.id === id) || null;
}
