// Camp upgrades: run-scoped combat power bought with gold. They reset on prestige — this is the
// layer that makes a new run a climb instead of a formality, the way heroes reset in Clicker
// Heroes. Each level multiplies (1 + bonus); cost grows geometrically so power tracks gold income.

// Fully upgraded camp ≈ x3.4 ATK/DEF and x2.7 HP — about two zones of headroom, deliberately a fraction
// of what the five gear tiers give, so gear and skills stay the main progression. `short` is what the
// camp card says and `art` the sprite on it; `desc` is the full rule (the card's tooltip). The first
// levels are cheap (a new player buys one within half a minute) and the last cost what they used to
// (60 and 50 gold growing x1.30 became 20 and 15 growing x1.36).
export const CAMP_UPGRADES = [
    { id: 'whetstone', name: 'Whetstone',      icon: '🗡️', art: 'item/Weapon/2',    short: '+5% attack',  desc: '+5% ATK per level (multiplicative)',    stat: 'atk', bonus: 0.05, baseCost: 20, growth: 1.36, max: 25 },
    { id: 'armory',    name: 'Armour Rack',    icon: '🛡️', art: 'item/Body/3',      short: '+5% defence', desc: '+5% DEF per level (multiplicative)',    stat: 'def', bonus: 0.05, baseCost: 20, growth: 1.36, max: 25 },
    { id: 'hearth',    name: 'Hearth',         icon: '🔥', art: 'mon/Magma Slime',  short: '+4% health',  desc: '+4% Max HP per level (multiplicative)',  stat: 'hp',  bonus: 0.04, baseCost: 15, growth: 1.36, max: 25 }
];

export function campUpgradeById(id) {
    return CAMP_UPGRADES.find(u => u.id === id) || null;
}

// Prices follow the best stage (the owner's choice 3a, DESIGN §3.8): a level costs its base price or,
// once that is higher, CAMP_PRICE_KILLS kills' worth of gold at the hero's best stage, growing the same
// x1.36 a level (a whole upgrade: about 50 kills at the best). Below about stage 85 the base price is
// the higher, so a new player's camp is as it was; past it, each run buys its camp again as it nears its
// best, and gold has a job late in the game (half of all gold is spent, against 1% before; 0.016 spent
// 80% but slowed the runs, tools/simulate.mjs).
export const CAMP_PRICE_KILLS = 0.008;

/** Gold for the next level of an upgrade at `level`; `goldAtBest` is a kill's gold at the best stage (0: the base price). */
export function campCost(upgrade, level, goldAtBest = 0) {
    return Math.ceil(Math.max(upgrade.baseCost, CAMP_PRICE_KILLS * goldAtBest) * Math.pow(upgrade.growth, level));
}

/** Multiplier contributed by `level` levels of an upgrade. */
export function campMultiplier(upgrade, level) {
    return Math.pow(1 + upgrade.bonus, level || 0);
}
