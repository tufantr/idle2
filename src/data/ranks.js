// The hero's rank: a title earned by prestiging, worn as the colour of his cloak (the sprite layer
// hero/cloaks/<cloak>, tools/resource_art.py). Purely a mark of how far he has come: no bonus. The
// colours follow the gear's rarities (green, blue, purple, gold), then go past them. The thresholds
// sit at about 1, 5, 12, 30, 60 and 150 hours of play in the simulator.

export const RANKS = [
    { prestiges: 0,   name: 'Recruit',    cloak: 'red' },
    { prestiges: 1,   name: 'Adventurer', cloak: 'green' },
    { prestiges: 5,   name: 'Veteran',    cloak: 'blue' },
    { prestiges: 15,  name: 'Champion',   cloak: 'purple' },
    { prestiges: 40,  name: 'Hero',       cloak: 'gold' },
    { prestiges: 100, name: 'Legend',     cloak: 'white' },
    { prestiges: 250, name: 'Mythic',     cloak: 'black' }
];

/** The rank of a hero with `prestiges` prestiges behind him. */
export function rankFor(prestiges) {
    let rank = RANKS[0];
    for (const r of RANKS) if (prestiges >= r.prestiges) rank = r;
    return rank;
}

/** The next rank to earn, or null at the top. */
export function nextRank(prestiges) {
    return RANKS.find(r => r.prestiges > prestiges) || null;
}
