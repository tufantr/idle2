// Camp upgrades: run-scoped combat power bought with gold. They reset on prestige — this is the
// layer that makes a new run a climb instead of a formality, the way heroes reset in Clicker
// Heroes. Each level multiplies (1 + bonus); cost grows geometrically so power tracks gold income.

// Fully upgraded camp ≈ x3.4 ATK/DEF and x2.7 HP — about two zones of headroom, deliberately a fraction
// of what the five gear tiers give, so gear and skills stay the main progression. `short` is what the
// camp card says and `art` the sprite on it; `desc` is the full rule (the card's tooltip). The first
// levels are cheap (a new player buys one within half a minute) and the last cost what they used to
// (60 and 50 gold growing x1.30 became 20 and 15 growing x1.36).
// Besides those 25 (CAMP_GOLD.from) the levels go on without end, priced in plain gold (below).
export const CAMP_UPGRADES = [
    { id: 'whetstone', name: 'Whetstone',      icon: '🗡️', art: 'item/Weapon/2',    short: '+5% attack',  desc: '+5% ATK per level (multiplicative)',    stat: 'atk', bonus: 0.05, baseCost: 20, growth: 1.36, max: Infinity },
    { id: 'armory',    name: 'Armour Rack',    icon: '🛡️', art: 'item/Body/3',      short: '+5% defence', desc: '+5% DEF per level (multiplicative)',    stat: 'def', bonus: 0.05, baseCost: 20, growth: 1.36, max: Infinity },
    { id: 'hearth',    name: 'Hearth',         icon: '🔥', art: 'mon/Magma Slime',  short: '+4% health',  desc: '+4% Max HP per level (multiplicative)',  stat: 'hp',  bonus: 0.04, baseCost: 15, growth: 1.36, max: Infinity }
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

// Besides its `from` levels priced by the best stage (the old top, 25), an upgrade has endless ones in plain gold:
// `base` growing `growth` a level, the same at any depth (the endless climb, docs/research_notes/endless-late-game.md
// §5). A deeper hero's gold buys more of them, about one more level of each for every 13 stages of the dense deep
// Abyss, so the camp keeps up with a climb that never ends.
export const CAMP_GOLD = { from: 25, base: 1e6, growth: 1.6 };

/**
 * Gold for the next level of an upgrade at `level`; `goldAtBest` is a kill's gold at the best stage (0: the base price).
 * Every level gives the same, so the hero buys the cheaper of the two lists' next levels: `level` levels are the
 * cheapest `level` of both, and a price never drops from one level to the next. (Taken in turn, the 25 best-stage
 * levels first, level 25 cost a deep hero less than level 24: the owner's report, October 2026.) A new player's camp
 * is as it was, since all 25 cost less than the first plain-gold level until best stage 128; deep down the
 * plain-gold levels come first, and a run that buys all 25 ends with the same camp as before, only sooner (DESIGN §3.30).
 */
export function campCost(upgrade, level, goldAtBest = 0) {
    const first = Math.max(upgrade.baseCost, CAMP_PRICE_KILLS * goldAtBest);
    const byBest = i => first * Math.pow(upgrade.growth, i);
    const plain = j => CAMP_GOLD.base * Math.pow(CAMP_GOLD.growth, j);
    // how many of the `level` cheapest are best-stage levels: the most whose last costs no more than the plain one it displaces
    let taken = Math.min(CAMP_GOLD.from, level);
    while (taken > 0 && byBest(taken - 1) > plain(level - taken)) taken--;
    return Math.ceil(Math.min(taken < CAMP_GOLD.from ? byBest(taken) : Infinity, plain(level - taken)));
}

/** Multiplier contributed by `level` levels of an upgrade. */
export function campMultiplier(upgrade, level) {
    return Math.pow(1 + upgrade.bonus, level || 0);
}
