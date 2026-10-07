// Ascension: the outer reset (docs/research_notes/robust-and-fun/B_longterm_motivation.md §8.2 item 5,
// incremental-math.md §2.6). Late in the game a prestige adds well under 1% to the tokens held, so late
// resets turn into a routine; an outer layer pays big again. From best stage ASCEND_FROM, the prestige
// dialog offers to ascend: a prestige that also takes the tokens back to nothing, and pays Stars, a
// log of the tokens given up (STARS_PER_DECADE for every tenfold past STAR_BASE). Stars are kept
// forever, and each makes every later prestige pay STAR_TOKEN_GAIN more tokens: the first Ascension of
// a hero with ~100,000 tokens pays 20 Stars, so prestiges pay ×6 and the old stock comes back within a
// day or two of play, then grows past it. Later Ascensions add less each (a log of a stock that grows
// with the gain itself), as the research advises: about +60%, then +40%, then less.
//
// Everything else stays: the best stage and its records, skills, gear, perks, mastery, the Trials,
// the collections. The run, its gold and the camp start over as in any prestige.
//
// After an Ascension it rests ASCEND_REST_MS. Stars are a log of the tokens given up, and a log pays
// small amounts better than big ones: without the rest, ascending every second run would pay about 2.8
// Stars a run against some 20 a day for one who waits. With it, ascending each day is about the best
// there is, and it multiplies the tokens about fivefold, no runaway (DESIGN §3.27).

export const ASCEND_FROM = 300;
export const STAR_BASE = 1000;
export const STARS_PER_DECADE = 10;
export const STAR_TOKEN_GAIN = 0.25;
export const ASCEND_REST_MS = 24 * 3600 * 1000;

/** The Stars an Ascension pays for giving up `tokens` (0 below STAR_BASE). */
export const starsFor = tokens => (tokens > STAR_BASE ? Math.floor(STARS_PER_DECADE * Math.log10(tokens / STAR_BASE)) : 0);

/** What `stars` multiply every prestige's tokens by. */
export const starGain = stars => 1 + STAR_TOKEN_GAIN * Math.max(0, stars || 0);
