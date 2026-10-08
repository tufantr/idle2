// The Abyss's strata (docs/research_notes/robust-and-fun/B_longterm_motivation.md §8.2 item 1): past the
// ten authored zones the Abyss went on as one place, the same four monsters and boss for hundreds of
// stages. It is now a stack of named layers, STRATUM_STAGES deep each, from stage 101: each with its own
// four monsters and a boss (new bestiary pages, DCSS tiles packed by tools/atlas.py), a card when first
// reached, and its own light. The scaling, loot and gear depth are the Abyss's as before (data/zones.js
// zoneForStage); past the last stratum it goes on as the last.
//
// Each has its own painting, assets/paint/<id>.webp (the first is the Abyss's; docs/art/gemini.md), behind
// its fight and on its card. `line` is the one line its card says.

export const STRATUM_STAGES = 25;
export const STRATA_FROM = 101;

export const STRATA = [
    { id: 'abyss', name: 'The Abyss', line: 'The edge of the world, falling forever into the dark.',
      monsters: ['Void Stalker', 'Demon', 'Nightmare', 'Abyssal Knight'], boss: 'Abyss Warlord' },
    { id: 'weeping', name: 'The Weeping Dark', line: 'The lost come here to mourn, and never leave.',
      monsters: ['Weeping Skull', 'Lost Soul', 'Drowned Soul', 'Flayed Ghost'], boss: 'Dread Lich' },
    { id: 'bone', name: 'The Bone Reaches', line: 'A plain of bones, and something still walks it.',
      monsters: ['Curse Skull', 'Revenant', 'Wight', 'Ancient Champion'], boss: 'Bone Dragon' },
    { id: 'ember', name: 'The Ember Pits', line: 'The rock runs red, and the demons bathe in it.',
      monsters: ['Hell Hound', 'Hell Hog', 'Sun Demon', 'Smoke Demon'], boss: 'Flame Tyrant' },
    { id: 'frozen', name: 'The Frozen Void', line: 'Cold enough to freeze a scream mid-air.',
      monsters: ['Frost Imp', 'Rime Drake', 'Shard Shrike', 'Frostbound Tome'], boss: 'Ice Dragon' },
    { id: 'writhing', name: 'The Writhing Maze', line: 'The walls are alive, and hungry.',
      monsters: ['Twisted Spawn', 'Flesh Cage', 'Unseen Horror', 'Nameless Horror'], boss: 'Tentacled Monstrosity' },
    { id: 'shadow', name: 'The Shadow Court', line: 'Pale nobles hold court where no light reaches.',
      monsters: ['Shadow Imp', 'Shadow Puppet', 'Vampire Knight', 'Vampire Mage'], boss: 'Blood Prince' },
    { id: 'storm', name: 'The Storm Wastes', line: 'Lightning that never stops falling.',
      monsters: ['Ball Lightning', 'Spark Wasp', 'Sky Beast', 'Twister'], boss: 'Storm Dragon' },
    { id: 'starless', name: 'The Starless Sea', line: 'Black water with no shore, and teeth beneath.',
      monsters: ['Electric Eel', 'Abyssal Jellyfish', 'Sludgefish', 'Marrowcuda'], boss: 'Abyssal Hydra' },
    { id: 'iron', name: 'The Iron Halls', line: 'Forges older than the gods, still burning.',
      monsters: ['Iron Mechanist', 'Thunderhulk', 'War Gargoyle', 'Living Armour'], boss: 'Iron Dragon' },
    { id: 'hollow', name: 'The Hollow Throne', line: 'A crown waits on an empty throne.',
      monsters: ['Ancient Lich', 'Eidolon', 'Bone Warlock', 'Tomb Crawler'], boss: 'Hollow King' },
    { id: 'choir', name: 'The Burning Choir', line: 'A thousand demons singing one long note.',
      monsters: ['Cinder Demon', 'Shrieker Demon', 'Chaos Spawn', 'Bell Demon'], boss: 'Choirmaster' },
    { id: 'glass', name: 'The Glass Garden', line: 'Every stone an eye, and every eye awake.',
      monsters: ['Glass Eye', 'Golden Eye', 'Shining Eye', 'Eye of Devastation'], boss: 'Great Orb of Eyes' },
    { id: 'rot', name: 'The Rotting Deep', line: 'Where the drowned dead go to soften.',
      monsters: ['Bloated Husk', 'Bog Body', 'Cursed Cob', 'Death Scarab'], boss: 'Stoker' },
    { id: 'rift', name: 'The Spatial Rift', line: 'Here the world comes apart at its seams.',
      monsters: ['Spatial Vortex', 'Planar Tesseract', 'Orb of Entropy', 'Globe of Annihilation'], boss: 'Entropy Weaver' },
    { id: 'pandemonium', name: 'Pandemonium', line: 'The bottom of everything, and its lords.',
      monsters: ['Rust Devil', 'Sin Beast', 'Spark Demon', 'Night Hag'], boss: 'Pandemonium Lord' }
];

/** The stratum a stage of the Abyss lies in (the last one goes on below it), or null above the Abyss. */
export function stratumForStage(stage) {
    if (stage < STRATA_FROM) return null;
    const i = Math.min(STRATA.length - 1, Math.floor((stage - STRATA_FROM) / STRATUM_STAGES));
    return { ...STRATA[i], index: i, from: STRATA_FROM + i * STRATUM_STAGES };
}

/** The stratum whose first stage is `stage`, or null (the first step into it is a card). */
export function stratumStartingAt(stage) {
    if (stage < STRATA_FROM || (stage - STRATA_FROM) % STRATUM_STAGES !== 0) return null;
    const i = (stage - STRATA_FROM) / STRATUM_STAGES;
    return i < STRATA.length ? { ...STRATA[i], index: i, from: stage } : null;
}
