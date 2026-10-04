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

export const DUNGEON_BOSS_TIME_MS = 60000;
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
    dragonheart_plate: {
        id: 'dragonheart_plate', name: 'Dragonheart Plate', type: 'Body', tier: 6, power: 56,
        affixes: [ { stat: 'hpMult', name: 'Max HP', value: 0.1 }, { stat: 'dodge', name: 'Dodge', value: 0.05 }, { stat: 'lifesteal', name: 'Lifesteal', value: 0.03 }, { stat: 'combatXpMult', name: 'Combat XP', value: 0.1 } ]
    }
};

export function dungeonById(id) {
    return DUNGEONS.find(d => d.id === id) || null;
}

// ---------- the Titan ----------
// Once an hour you may challenge the Titan: a 60-second damage race against a huge health pool.
// Each Titan defeated is gone for good and leaves a permanent bonus; the next one is stronger.

export const TITAN_COOLDOWN_MS = 60 * 60 * 1000;
export const TITAN_TIME_MS = 60000;
export const TITAN_UNLOCK_STAGE = 20;
export const TITAN_HP_MULT = 10;
export const TITAN_ATK_MULT = 1.2;
export const TITAN_BONUS = { atkMult: 0.02, hpMult: 0.02 }; // per Titan defeated
export const TITAN_NAMES = ['Stone', 'Iron', 'Storm', 'Flame', 'Frost', 'Tide', 'Thorn', 'Night', 'Sun', 'Void'];
