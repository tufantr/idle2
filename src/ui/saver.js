// The battery saver: a page left alone draws less. In view the cost of the game is its frame (research loop 040: 60 a second,
// each with a layout and a style recalculation, a seventh of a core and half of one on a slow phone's CPU), so once nobody has
// touched it for a while the frames come ten a second, one for each step of the game, the tab is drawn again once a second, and
// what loops for ever (the glows, the drifting paintings, the motes, the hero's breathing) stands still. The fight itself goes on
// on screen: blows, numbers and bars. The first touch ends it. On by default on phones, kept per device (like the keys' switch, in
// the browser and not the save), and never a pop-up: a mode that nags draws bad reviews (043).

export const SAVER_KEY = 'fantasyIdle.saver';
export const REST_AFTER_MS = 30000;   // untouched this long: the page is left alone
export const REST_FRAME_MS = 100;     // the game moves ten times a second: a frame for each
export const REST_RENDER_MS = 1000;   // and the tab drawn again once a second at most

/** Is the saver on? The player's choice on this device ('1', '0'), or by default on a phone. */
export const saverOn = (stored, phone) => (stored === '1' ? true : stored === '0' ? false : !!phone);

/** Is the page at rest? `busy`: something is being played that wants every frame (a mini-game, a fight on the clock). */
export const atRest = ({ on, now, touchedAt, busy = false }) => !!on && !busy && now - touchedAt >= REST_AFTER_MS;

// The CSS animations that never end. What ends by itself (a number rising, a card coming in) is left to finish.
const loops = root => (root.getAnimations?.() || []).filter(a => a instanceof CSSAnimation && a.effect?.getComputedTiming().iterations === Infinity);
/** They stand still where they are (a glow stays lit); called again as the page is drawn anew. */
export function stillLoops(root = document) { for (const a of loops(root)) if (a.playState === 'running') a.pause(); }
export function wakeLoops(root = document) { for (const a of loops(root)) if (a.playState === 'paused') a.play(); }
