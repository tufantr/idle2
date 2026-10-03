// Camp upgrades: run-scoped combat power bought with gold. They reset on prestige — this is the
// layer that makes a new run a climb instead of a formality, the way heroes reset in Clicker
// Heroes. Each level multiplies (1 + bonus); cost grows geometrically so power tracks gold income.

// Fully upgraded camp ≈ x3.4 ATK/DEF and x2.7 HP — about two zones of headroom, deliberately a fraction
// of what the five gear tiers give, so gear and skills stay the main progression. `short` is what the
// camp card says and `art` the sprite on it; `desc` is the full rule (the card's tooltip).
export const CAMP_UPGRADES = [
    { id: 'whetstone', name: 'Whetstone',      icon: '🗡️', art: 'item/Weapon/2',    short: '+5% attack',  desc: '+5% ATK per level (multiplicative)',    stat: 'atk', bonus: 0.05, baseCost: 60, growth: 1.30, max: 25 },
    { id: 'armory',    name: 'Armour Rack',    icon: '🛡️', art: 'item/Body/3',      short: '+5% defence', desc: '+5% DEF per level (multiplicative)',    stat: 'def', bonus: 0.05, baseCost: 60, growth: 1.30, max: 25 },
    { id: 'hearth',    name: 'Hearth',         icon: '🔥', art: 'mon/Magma Slime',  short: '+4% health',  desc: '+4% Max HP per level (multiplicative)',  stat: 'hp',  bonus: 0.04, baseCost: 50, growth: 1.30, max: 25 }
];

export function campUpgradeById(id) {
    return CAMP_UPGRADES.find(u => u.id === id) || null;
}

export function campCost(upgrade, level) {
    return Math.ceil(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

/** Multiplier contributed by `level` levels of an upgrade. */
export function campMultiplier(upgrade, level) {
    return Math.pow(1 + upgrade.bonus, level || 0);
}
