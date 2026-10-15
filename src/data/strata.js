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

// Past Pandemonium (stage 500) the strata go on without end (the endless climb, October 2026; DESIGN §3.32): the
// others below the Abyss's own again in turn, each round with a numeral (The Weeping Dark II) and its own cast of
// light (`cycle`: the scene turns its painting's hues, `paint` is the painting). Its id is the first's with the
// round (`weeping-2`), so each is a place of its own: a card when first reached, a line in the chronicle.
const ROUND = STRATA.length - 1;
const ROMAN = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
const roman = n => ROMAN.reduce((out, [r, v]) => { while (n >= v) { out += r; n -= v; } return out; }, '');

/** The `i`-th stratum below the Abyss's first (0: the Abyss itself), its rounds past Pandemonium included. */
export function stratumAt(i) {
    if (i < STRATA.length) return { ...STRATA[i], index: i, cycle: 0, paint: STRATA[i].id };
    const k = i - STRATA.length;
    const base = STRATA[1 + (k % ROUND)];
    const cycle = 2 + Math.floor(k / ROUND);
    return { ...base, id: `${base.id}-${cycle}`, name: `${base.name} ${roman(cycle)}`, index: i, cycle, paint: base.id };
}

/** A stratum by its id, a round's (`weeping-2`) included, or null. */
export function stratumById(id) {
    const m = /^([a-z]+)(?:-(\d+))?$/.exec(String(id || ''));
    if (!m) return null;
    const at = STRATA.findIndex(s => s.id === m[1]);
    if (at < 0) return null;
    if (!m[2]) return stratumAt(at);
    const cycle = Number(m[2]);
    if (at === 0 || at >= STRATA.length || cycle < 2 || cycle > 1000) return null;
    return stratumAt(STRATA.length + (cycle - 2) * ROUND + at - 1);
}

/** The stratum a stage of the Abyss lies in, or null above the Abyss. */
export function stratumForStage(stage) {
    if (stage < STRATA_FROM) return null;
    const i = Math.floor((stage - STRATA_FROM) / STRATUM_STAGES);
    return { ...stratumAt(i), from: STRATA_FROM + i * STRATUM_STAGES };
}

/** The stratum whose first stage is `stage`, or null (the first step into it is a card). */
export function stratumStartingAt(stage) {
    if (stage < STRATA_FROM || (stage - STRATA_FROM) % STRATUM_STAGES !== 0) return null;
    const i = (stage - STRATA_FROM) / STRATUM_STAGES;
    return { ...stratumAt(i), from: stage };
}
