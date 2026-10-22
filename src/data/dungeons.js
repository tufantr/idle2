// Dungeons, their unique items, and the Titan.
//
// A dungeon is an authored gauntlet: a fixed list of elite monsters and a boss, fought in one go
// with the gear you walked in with. Dying (or letting the boss outlast its timer) ends the run
// with nothing; clearing it opens a guaranteed chest. Clear counts unlock permanent milestones,
// and every chest holds a fragment towards the dungeon's unique item (visible pity).
//
// Placement: each dungeon sits about where a typical player reaches its unique's gear tier by
// crafting (see tools/simulate.mjs), so a unique rewards farming a little early instead of
// skipping tiers. `stage` is the first monster's stage-equivalent; `chestTier` is the gear tier of
// the chest (the zone's gearTier there); essence and gems follow the zone's richness tier.

import { MAX_GEAR_TIER, GEAR_TIERS } from './items.js';
import { roman } from './strata.js';

export const DUNGEON_BOSS_TIME_MS = 60000;
// After the first clear of a visit the hero waits at the chest while the player chooses to keep going
// (the run repeats until the hero leaves) or to end the dungeon. With no answer in this time (or with
// nobody there, while away) the hero keeps going, so idle time is never lost.
export const DUNGEON_CHOICE_MS = 30000;
export const ELITE_HP_MULT = 1.4;
export const ELITE_ATK_MULT = 1.15;
export const DUNGEON_BOSS_HP_MULT = 1.5;   // on top of the normal boss multipliers
export const FRAGMENTS_PER_UNIQUE = 50;
export const DIRECT_UNIQUE_CHANCE = 0.002;  // a chest can also hold the unique outright

// The chest. Dungeon monsters pay like ladder monsters of the same health (the boss too), so the
// chest is the whole bonus: tuned so farming a dungeon earns about twice the gear and a little more
// of everything else than farming the same stages would, plus the fragment. A strong hero clears a
// run in well under a minute, so a chest must never be a jackpot.
export const CHEST_GEAR_CHANCE = 0.04;      // boss-quality gear of the chest tier
export const CHEST_ESSENCE_PER_TIER = 0.5;   // x the zone's richness tier
export const CHEST_MATERIAL_ROLLS = 3;      // picks from the zone's loot table
export const CHEST_GEM_CHANCE = 0.5;        // a gem of the chest tier

// Per-dungeon milestones: permanent bonuses at clear counts.
export const DUNGEON_MILESTONES = [
    { clears: 25,  desc: '+2% ATK and DEF',           mods: { atkMult: 0.02, defMult: 0.02 } },
    { clears: 100, desc: '+3% gold and drop chance',  mods: { goldMult: 0.03, dropMult: 0.03 } },
    { clears: 250, desc: '+3% max HP',                mods: { hpMult: 0.03 } }
];

export const DUNGEONS = [
    {
        id: 'goblin_warren', name: 'Goblin Warren', icon: '🕳️', unlockStage: 20, stage: 25, chestTier: 2,
        monsters: [
            { name: 'Goblin Sneak', icon: '👺' }, { name: 'Goblin Brute', icon: '👹' }, { name: 'Goblin Archer', icon: '🏹' },
            { name: 'Goblin Shaman', icon: '🧙' }, { name: 'Goblin Brute', icon: '👹' }, { name: 'Goblin Guard', icon: '🛡️' }
        ],
        boss: { name: 'Goblin King', icon: '👑' },
        unique: 'goblin_crown'
    },
    {
        id: 'crystal_depths', name: 'Crystal Depths', icon: '💎', unlockStage: 50, stage: 55, chestTier: 3,
        monsters: [
            { name: 'Shard Bat', icon: '🦇' }, { name: 'Crystal Crawler', icon: '🦂' }, { name: 'Gem Golem', icon: '🗿' },
            { name: 'Prism Wisp', icon: '💫' }, { name: 'Shard Bat', icon: '🦇' }, { name: 'Crystal Knight', icon: '⚔️' },
            { name: 'Gem Golem', icon: '🗿' }
        ],
        boss: { name: 'Crystal Wyrm', icon: '🐲' },
        unique: 'crystal_heart'
    },
    {
        id: 'orc_stronghold', name: 'Orc Stronghold', icon: '🏰', unlockStage: 80, stage: 85, chestTier: 4,
        monsters: [
            { name: 'Orc Grunt', icon: '👹' }, { name: 'Orc Archer', icon: '🏹' }, { name: 'Warg Rider', icon: '🐺' },
            { name: 'Orc Grunt', icon: '👹' }, { name: 'Orc Shaman', icon: '🧙' }, { name: 'Troll Bruiser', icon: '🧌' },
            { name: 'Warg Rider', icon: '🐺' }, { name: 'Orc Champion', icon: '⚔️' }
        ],
        boss: { name: 'Orc Overlord', icon: '👑' },
        unique: 'warlord_cleaver'
    },
    {
        id: 'dragons_lair', name: "Dragon's Lair", icon: '🌋', unlockStage: 120, stage: 125, chestTier: 6,
        monsters: [
            { name: 'Drake Whelp', icon: '🦎' }, { name: 'Kobold Zealot', icon: '🗡️' }, { name: 'Fire Drake', icon: '🐉' },
            { name: 'Wyvern', icon: '🐲' }, { name: 'Drake Whelp', icon: '🦎' }, { name: 'Dragonkin Mage', icon: '🧙' },
            { name: 'Fire Drake', icon: '🐉' }, { name: 'Dragonkin Knight', icon: '⚔️' }, { name: 'Wyvern', icon: '🐲' },
            { name: 'Dragon Priest', icon: '🔥' }
        ],
        boss: { name: 'Elder Dragon', icon: '🐉' },
        unique: 'dragonheart_plate'
    },
    {
        // The late game's dungeon: a fortress adrift in the void, deep in the Abyss.
        id: 'void_citadel', name: 'Void Citadel', icon: '🌌', unlockStage: 160, stage: 165, chestTier: 7,
        monsters: [
            { name: 'Void Acolyte', icon: '🧙' }, { name: 'Starcursed Mass', icon: '🌑' }, { name: 'Rift Crab', icon: '🦀' },
            { name: 'Wretched Star', icon: '⭐' }, { name: 'Void Acolyte', icon: '🧙' }, { name: 'Soul Reaper', icon: '💀' },
            { name: 'Tormentor', icon: '👹' }, { name: 'Starcursed Mass', icon: '🌑' }, { name: 'Citadel Sentinel', icon: '🗿' },
            { name: 'Soul Eater', icon: '👻' }
        ],
        boss: { name: 'Void King', icon: '👑' },
        unique: 'void_aegis'
    },
    {
        // The deepest: a cavern like an open maw at the bottom of the Abyss, for the long game (stage
        // 210 comes about 83 hours in at Melvor pace, tools/simulate.mjs). Its unique is worth its
        // affixes, not its power, since gear dropped this deep is far stronger than any tier's base.
        id: 'abyssal_maw', name: 'Abyssal Maw', icon: '🕳️', unlockStage: 210, stage: 215, chestTier: 7,
        monsters: [
            { name: 'Starspawn', icon: '🦑' }, { name: 'Thrashing Horror', icon: '👾' }, { name: 'Ancient Zyme', icon: '🦠' },
            { name: 'Executioner', icon: '🌀' }, { name: 'Starspawn', icon: '🦑' }, { name: 'Green Death', icon: '☠️' },
            { name: 'Worldbinder', icon: '🌀' }, { name: 'Thrashing Horror', icon: '👾' }, { name: 'Star Skull', icon: '💀' },
            { name: 'Executioner', icon: '🌀' }, { name: 'Green Death', icon: '☠️' }, { name: 'Worldbinder', icon: '🌀' }
        ],
        boss: { name: 'Devourer', icon: '🐙' },
        unique: 'starless_band'
    },
    {
        // Two more for the long climb past the Maw (robust-and-fun/B_longterm_motivation.md §8.2 item 2):
        // a drowned city of the dead in the Starless Sea's reaches, and a forge of the damned below it.
        // Each unique is a record too (core/modifiers.js recordsOf).
        id: 'sunken_necropolis', name: 'Sunken Necropolis', icon: '⚰️', unlockStage: 240, stage: 245, chestTier: 7,
        monsters: [
            { name: 'Poltergeist', icon: '👻' }, { name: 'Grave Hopper', icon: '🧟' }, { name: 'Marsh Ghast', icon: '💀' },
            { name: 'Soul Wisp', icon: '💫' }, { name: 'Poltergeist', icon: '👻' }, { name: 'Mind Gaunt', icon: '🧠' },
            { name: 'Tomb Vampire', icon: '🧛' }, { name: 'Grave Hopper', icon: '🧟' }, { name: 'Marsh Ghast', icon: '💀' },
            { name: 'Mind Gaunt', icon: '🧠' }, { name: 'Soul Wisp', icon: '💫' }, { name: 'Tomb Vampire', icon: '🧛' }
        ],
        boss: { name: 'Sunken King', icon: '👑' },
        unique: 'drowned_greaves'
    },
    {
        id: 'hellforge', name: 'The Hellforge', icon: '⚒️', unlockStage: 275, stage: 280, chestTier: 7,
        monsters: [
            { name: 'Clockwork Bee', icon: '🐝' }, { name: 'Rusted Inspector', icon: '🤖' }, { name: 'Thermic Dynamo', icon: '⚙️' },
            { name: 'Sawblade', icon: '🪚' }, { name: 'Clockwork Bee', icon: '🐝' }, { name: 'Walking Alembic', icon: '⚗️' },
            { name: 'Firespitter', icon: '🔥' }, { name: 'Thermic Dynamo', icon: '⚙️' }, { name: 'Hellfire Mortar', icon: '💥' },
            { name: 'Sawblade', icon: '🪚' }, { name: 'Rusted Inspector', icon: '🤖' }, { name: 'Hellfire Mortar', icon: '💥' }
        ],
        boss: { name: 'Obsidian Colossus', icon: '🗿' },
        unique: 'hellforged_gauntlets'
    }
];

// Unique items: fixed affixes, legendary quality, base power 10% above the tier's gear (GEAR_TIERS),
// so a unique is the best piece of its tier rather than a way to skip tiers.
export const UNIQUES = {
    goblin_crown: {
        id: 'goblin_crown', name: "Goblin King's Crown", type: 'Head', tier: 2, power: 2.4,
        affixes: [ { stat: 'goldMult', name: 'Gold Find', value: 0.15 }, { stat: 'critChance', name: 'Crit Chance', value: 0.04 }, { stat: 'hpMult', name: 'Max HP', value: 0.05 } ]
    },
    crystal_heart: {
        id: 'crystal_heart', name: 'Crystal Heart', type: 'Neck', tier: 3, power: 5.3,
        affixes: [ { stat: 'attackSpeed', name: 'Attack Speed', value: 0.06 }, { stat: 'hpMult', name: 'Max HP', value: 0.08 }, { stat: 'critDmg', name: 'Crit Damage', value: 0.2 } ]
    },
    warlord_cleaver: {
        id: 'warlord_cleaver', name: "Warlord's Cleaver", type: 'Weapon', tier: 4, power: 11.7,
        affixes: [ { stat: 'critDmg', name: 'Crit Damage', value: 0.25 }, { stat: 'critChance', name: 'Crit Chance', value: 0.05 }, { stat: 'attackSpeed', name: 'Attack Speed', value: 0.06 } ]
    },
    void_aegis: {
        id: 'void_aegis', name: "Void King's Aegis", type: 'Shield', tier: 7, power: 123,
        affixes: [ { stat: 'hpMult', name: 'Max HP', value: 0.12 }, { stat: 'dodge', name: 'Dodge', value: 0.06 }, { stat: 'lifesteal', name: 'Lifesteal', value: 0.04 }, { stat: 'attackSpeed', name: 'Attack Speed', value: 0.06 } ]
    },
    starless_band: {
        id: 'starless_band', name: 'Starless Band', type: 'Ring', tier: 7, power: 123,
        affixes: [ { stat: 'tokenMult', name: 'Token Gain', value: 0.08 }, { stat: 'combatXpMult', name: 'Combat XP', value: 0.15 }, { stat: 'dropMult', name: 'Drop Chance', value: 0.1 }, { stat: 'critDmg', name: 'Crit Damage', value: 0.3 } ]
    },
    dragonheart_plate: {
        id: 'dragonheart_plate', name: 'Dragonheart Plate', type: 'Body', tier: 6, power: 56,
        affixes: [ { stat: 'hpMult', name: 'Max HP', value: 0.1 }, { stat: 'dodge', name: 'Dodge', value: 0.05 }, { stat: 'lifesteal', name: 'Lifesteal', value: 0.03 }, { stat: 'combatXpMult', name: 'Combat XP', value: 0.1 } ]
    },
    drowned_greaves: {
        id: 'drowned_greaves', name: "Drowned King's Greaves", type: 'Legs', tier: 7, power: 123,
        affixes: [ { stat: 'hpMult', name: 'Max HP', value: 0.12 }, { stat: 'lifesteal', name: 'Lifesteal', value: 0.04 }, { stat: 'dodge', name: 'Dodge', value: 0.05 }, { stat: 'goldMult', name: 'Gold Find', value: 0.15 } ]
    },
    hellforged_gauntlets: {
        id: 'hellforged_gauntlets', name: 'Hellforged Gauntlets', type: 'Gloves', tier: 7, power: 123,
        affixes: [ { stat: 'critChance', name: 'Crit Chance', value: 0.06 }, { stat: 'critDmg', name: 'Crit Damage', value: 0.35 }, { stat: 'attackSpeed', name: 'Attack Speed', value: 0.06 }, { stat: 'dropMult', name: 'Drop Chance', value: 0.1 } ]
    }
};

export function dungeonById(id) {
    return DUNGEONS.find(d => d.id === id) || null;
}

// ---------- tiers ----------
// The owner, 22 October 2026: "Dungeons end too early. All 8 of them 250 rounds, a player can do around stage 300 while
// the game goes into thousands." When each of the eight has DUNGEON_TIER_CLEARS clears at the open tier (its last
// milestone) and the hero holds that tier's eight uniques, they are handed in for a Seal (systems/dungeon.js
// sealDungeons): it takes no bag slot and is worth SEAL_RECORDS records (core/modifiers.js recordsOf). The next tier
// opens: the same eight DUNGEON_TIER_STAGES stages deeper, their gates too, with a numeral (Goblin Warren II), the
// painting in new hues, one rule for its monsters (DUNGEON_RULES, in turn), a chest of the deepest gear, uniques of
// its own at its depth, and the milestones to earn again (a sealed tier's count in full). Each of the eight uniques is
// a record once found, at any tier, kept or not (state.uniques), so none has to sit in the bag; a deeper tier's are
// gear and the next Seal's price, not more records (as more records they made the simulated climb 6% faster again).
// Sized with the simulator (12 seeds, 150 h): 2 records a Seal (4 measured the same within noise).
export const DUNGEON_TIER_STAGES = 300;
export const DUNGEON_TIER_CLEARS = 250;
export const SEAL_RECORDS = 2;
export const UNIQUE_POWER_OVER_TIER = 1.1;   // a unique past the first tier: Abyssal, a tenth above the tier's gear, at its depth
export const DUNGEON_RULES = [
    { id: 'swift', name: 'Swift', desc: 'Its monsters attack a quarter faster', interval: 0.8 },
    { id: 'stout', name: 'Stout', desc: 'Its monsters have half again the health', hp: 1.5 },
    { id: 'savage', name: 'Savage', desc: 'Its monsters hit a third harder', atk: 4 / 3 },
    { id: 'relentless', name: 'Relentless', desc: 'Its bosses must fall in 40 seconds', bossTime: 40000 }
];

/** Tier `tier`'s look and rule: { tier, numeral ('' for the first), hue (degrees its paintings turn), rule (null for the first) }. */
export function dungeonTierInfo(tier) {
    const t = Math.max(1, Math.floor(Number(tier)) || 1);
    return { tier: t, numeral: t > 1 ? roman(t) : '', hue: t > 1 ? ((t - 1) * 83) % 360 : 0, rule: t > 1 ? DUNGEON_RULES[(t - 2) % DUNGEON_RULES.length] : null };
}

/** Dungeon `d` (or its id) at `tier`: its stages, its gate and its name moved down, its chest of the deepest gear past the first. */
export function dungeonAt(d, tier = 1) {
    const base = dungeonById(typeof d === 'string' ? d : d?.id);
    if (!base) return null;
    const { tier: t, numeral } = dungeonTierInfo(tier);
    if (t === 1) return { ...base, tier: 1 };
    const deeper = (t - 1) * DUNGEON_TIER_STAGES;
    return { ...base, tier: t, name: `${base.name} ${numeral}`, stage: base.stage + deeper, unlockStage: base.unlockStage + deeper, chestTier: MAX_GEAR_TIER };
}

/** How long a dungeon boss of `tier` stands before the run is lost (the Relentless rule shortens it). */
export const dungeonBossTime = tier => dungeonTierInfo(tier).rule?.bossTime || DUNGEON_BOSS_TIME_MS;

/** The stage of dungeon `d`'s boss at `tier` (where its unique is cut). */
export const dungeonBossStage = (d, tier = 1) => { const at = dungeonAt(d, tier); return at.stage + at.monsters.length; };

/** A unique's key among those found: its id, with the tier past the first ('goblin_crown@2'). */
export const uniqueKey = (id, tier = 1) => (tier > 1 ? `${id}@${tier}` : id);
/** The id and tier a key names, or null. */
export function parseUniqueKey(key) {
    const m = /^([a-z_]+)(?:@(\d{1,4}))?$/.exec(String(key || ''));
    if (!m || !UNIQUES[m[1]]) return null;
    const tier = m[2] ? Number(m[2]) : 1;
    return tier >= 1 && (tier > 1 || !m[2]) ? { id: m[1], tier } : null;
}

/**
 * Unique `id` of `tier`, without its depth's strength: the first tier's as authored; past it its name takes the tier's
 * numeral and it is Abyssal, UNIQUE_POWER_OVER_TIER above the tier's gear (systems/dungeon.js grows it with the depth of
 * its dungeon's boss, like the gear dropped there), its bonuses its own.
 */
export function uniqueAt(id, tier = 1) {
    const u = UNIQUES[id];
    if (!u) return null;
    const { tier: t, numeral } = dungeonTierInfo(tier);
    if (t === 1) return { ...u, dungeonTier: 1 };
    return { ...u, dungeonTier: t, name: `${u.name} ${numeral}`, tier: MAX_GEAR_TIER, power: GEAR_TIERS[MAX_GEAR_TIER - 1].power * UNIQUE_POWER_OVER_TIER };
}

// ---------- the Titan ----------
// Once an hour you may challenge the Titan: a 60-second damage race against a huge health pool.
// Each Titan defeated is gone for good and leaves a permanent bonus; the next one is stronger.

export const TITAN_COOLDOWN_MS = 60 * 60 * 1000;
export const TITAN_TIME_MS = 60000;
export const TITAN_UNLOCK_STAGE = 20;
export const TITAN_HP_MULT = 10;
export const TITAN_ATK_MULT = 1.2;
export const TITAN_BONUS = { atkMult: 0.02, hpMult: 0.02 }; // per Titan defeated (half from the TITAN_LATE_FROM-th on)
// The Titan line: level N stands at stage 10(N+1) for the first TITAN_LATE_FROM, then 5 stages apart, so
// late Titans fall twice as often (the long-term research found one in 30–220 hours late in the game,
// robust-and-fun/B §7.3) for the same power per stage: each late one leaves half the bonus. Unused
// attempts bank, up to TITAN_BANK (one an hour), for a player who comes back after a few hours.
export const TITAN_LATE_FROM = 20;
export const TITAN_BANK = 3;
/** The stage a Titan of `level` stands at. */
export function titanStage(level) {
    return level <= TITAN_LATE_FROM ? 10 * (level + 1) : 10 * (TITAN_LATE_FROM + 1) + 5 * (level - TITAN_LATE_FROM);
}
/** Titans defeated, as counts of the full bonus (a late one counts half). */
export function titanBonusUnits(kills) {
    return Math.min(kills, TITAN_LATE_FROM) + 0.5 * Math.max(0, kills - TITAN_LATE_FROM);
}
export const TITAN_NAMES = ['Stone', 'Iron', 'Storm', 'Flame', 'Frost', 'Tide', 'Thorn', 'Night', 'Sun', 'Void'];
