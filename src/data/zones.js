// Combat zones: ten stages each. The first ten zones are authored; beyond that the
// Abyss repeats with harder scaling (see formulas.js). Loot tables name the materials
// each zone feeds back into the skills, so combat is never a dead end.
//
// Two tiers per zone. `tier` is the zone's richness: material quantities, gems and boss essence.
// `gearTier` is the tier of the gear that drops there. It follows the crafting spine rather than
// the ladder: prestige carries players through the early zones far faster than they can smith
// (stage 60 in ~1.5 h, mithril in ~4 h), so each zone drops about the tier a typical player crafts
// when they first get there (tools/simulate.mjs), and a drop one tier up is the lucky case. The
// drop-only tiers live in the Abyss: Dragonbone from depth 3, Abyssal from depth 5.

export const STAGES_PER_ZONE = 10;

export const ZONES = [
    { id: 'meadow',   name: 'Sunlit Meadow',   tier: 1, gearTier: 1, monsters: ['Slime', 'Rat', 'Rabbit Bandit', 'Goblin Scout'], boss: 'Goblin Chieftain',
      icons: { Slime: '🟢', Rat: '🐀', 'Rabbit Bandit': '🐰', 'Goblin Scout': '👺', 'Goblin Chieftain': '👹' },
      loot: [ { id: 'copper_ore', weight: 30 }, { id: 'normal_log', weight: 30 }, { id: 'raw_rabbit', weight: 30 }, { id: 'guam_leaf', weight: 10 } ] },
    { id: 'forest',   name: 'Whispering Forest', tier: 2, gearTier: 1, monsters: ['Wolf', 'Spider', 'Bandit', 'Wisp'], boss: 'Elder Treant',
      icons: { Wolf: '🐺', Spider: '🕷️', Bandit: '🗡️', Wisp: '💫', 'Elder Treant': '🌳' },
      loot: [ { id: 'iron_ore', weight: 25 }, { id: 'coal', weight: 15 }, { id: 'oak_log', weight: 30 }, { id: 'raw_fox', weight: 25 }, { id: 'marrentill_leaf', weight: 5 } ] },
    { id: 'caves',    name: 'Glimmering Caves', tier: 3, gearTier: 2, monsters: ['Bat', 'Skeleton', 'Cave Crawler', 'Kobold Miner'], boss: 'Crystal Golem',
      icons: { Bat: '🦇', Skeleton: '💀', 'Cave Crawler': '🐛', 'Kobold Miner': '⛏️', 'Crystal Golem': '🗿' },
      loot: [ { id: 'silver_ore', weight: 20 }, { id: 'mithril_ore', weight: 20 }, { id: 'coal', weight: 25 }, { id: 'willow_log', weight: 15 }, { id: 'raw_boar', weight: 20 } ] },
    { id: 'marsh',    name: 'Fever Marsh',     tier: 3, gearTier: 2, monsters: ['Leech', 'Bog Witch', 'Toad Warrior', 'Ghoul'], boss: 'Marsh Hydra',
      icons: { Leech: '🪱', 'Bog Witch': '🧙', 'Toad Warrior': '🐸', Ghoul: '🧟', 'Marsh Hydra': '🐍' },
      loot: [ { id: 'tarromin_leaf', weight: 25 }, { id: 'willow_log', weight: 25 }, { id: 'raw_boar', weight: 25 }, { id: 'mithril_ore', weight: 25 } ] },
    { id: 'highland', name: 'Stormy Highlands', tier: 4, gearTier: 2, monsters: ['Harpy', 'Orc Raider', 'Mountain Troll', 'Griffin'], boss: 'Orc Warlord',
      icons: { Harpy: '🦅', 'Orc Raider': '👹', 'Mountain Troll': '🧌', Griffin: '🦁', 'Orc Warlord': '👑' },
      loot: [ { id: 'gold_ore', weight: 20 }, { id: 'adamant_ore', weight: 20 }, { id: 'maple_log', weight: 25 }, { id: 'raw_deer', weight: 30 }, { id: 'coal', weight: 5 } ] },
    { id: 'ruins',    name: 'Drowned Ruins',   tier: 4, gearTier: 3, monsters: ['Sea Wraith', 'Cursed Knight', 'Siren', 'Kraken Spawn'], boss: 'Lich of the Deep',
      icons: { 'Sea Wraith': '👻', 'Cursed Knight': '⚔️', Siren: '🧜', 'Kraken Spawn': '🦑', 'Lich of the Deep': '☠️' },
      loot: [ { id: 'adamant_ore', weight: 25 }, { id: 'harralander_leaf', weight: 20 }, { id: 'maple_log', weight: 20 }, { id: 'raw_deer', weight: 25 }, { id: 'gold_ore', weight: 10 } ] },
    { id: 'volcano',  name: 'Ember Volcano',   tier: 5, gearTier: 3, monsters: ['Magma Slime', 'Fire Imp', 'Salamander', 'Ash Golem'], boss: 'Ember Drake',
      icons: { 'Magma Slime': '🔥', 'Fire Imp': '😈', Salamander: '🦎', 'Ash Golem': '🗿', 'Ember Drake': '🐉' },
      loot: [ { id: 'runite_ore', weight: 20 }, { id: 'coal', weight: 20 }, { id: 'yew_log', weight: 25 }, { id: 'raw_bear', weight: 35 } ] },
    { id: 'frost',    name: 'Frozen Wastes',   tier: 5, gearTier: 3, monsters: ['Ice Wolf', 'Yeti', 'Frost Wraith', 'Mammoth'], boss: 'Ice Titan',
      icons: { 'Ice Wolf': '🐺', Yeti: '❄️', 'Frost Wraith': '👻', Mammoth: '🦣', 'Ice Titan': '🧊' },
      loot: [ { id: 'runite_ore', weight: 25 }, { id: 'yew_log', weight: 25 }, { id: 'raw_bear', weight: 25 }, { id: 'raw_drake', weight: 20 }, { id: 'harralander_leaf', weight: 5 } ] },
    { id: 'skyreach', name: 'Skyreach Spire',  tier: 6, gearTier: 4, monsters: ['Cloud Serpent', 'Storm Elemental', 'Wyvern', 'Sky Knight'], boss: 'Thunder Roc',
      icons: { 'Cloud Serpent': '🐍', 'Storm Elemental': '⚡', Wyvern: '🐲', 'Sky Knight': '🛡️', 'Thunder Roc': '🦅' },
      loot: [ { id: 'magic_log', weight: 30 }, { id: 'raw_drake', weight: 35 }, { id: 'runite_ore', weight: 25 }, { id: 'diamond', weight: 10 } ] },
    { id: 'abyss',    name: 'The Abyss',       tier: 7, gearTier: 4, monsters: ['Void Stalker', 'Demon', 'Nightmare', 'Abyssal Knight'], boss: 'Abyss Warlord',
      icons: { 'Void Stalker': '👁️', Demon: '👿', Nightmare: '🌑', 'Abyssal Knight': '⚔️', 'Abyss Warlord': '💀' },
      loot: [ { id: 'raw_dragon', weight: 35 }, { id: 'magic_log', weight: 25 }, { id: 'runite_ore', weight: 25 }, { id: 'diamond', weight: 15 } ] }
];

export const AUTHORED_STAGES = ZONES.length * STAGES_PER_ZONE; // 100

/** Zone definition for a stage. Stages past the authored content loop through the Abyss with a depth counter. */
export function zoneForStage(stage) {
    const index = Math.floor((stage - 1) / STAGES_PER_ZONE);
    if (index < ZONES.length) return { ...ZONES[index], depth: 0, index };
    const depth = index - ZONES.length + 1;
    const abyss = ZONES[ZONES.length - 1];
    return { ...abyss, name: `The Abyss — Depth ${depth}`, depth, index, gearTier: abyssGearTier(depth) };
}

/** Runite at depths 1–2, Dragonbone at 3–4, Abyssal from 5. */
export function abyssGearTier(depth) {
    return depth >= 5 ? 7 : depth >= 3 ? 6 : 5;
}

export function isBossStage(stage) {
    return stage % STAGES_PER_ZONE === 0;
}

// Gems that can drop from any zone (weighted toward the zone tier).
export const GEM_DROP_TABLE = [
    { id: 'amethyst', tier: 1 }, { id: 'topaz', tier: 2 }, { id: 'sapphire', tier: 3 },
    { id: 'emerald', tier: 4 }, { id: 'ruby', tier: 5 }, { id: 'diamond', tier: 6 }
];
