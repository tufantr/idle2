// The choices in Settings that change how the game looks, sounds and reads, never how it plays (docs/DESIGN.md §3.36).
// Each is optional in the save: a save without it is today's game, and an older game passes over it.

// The effects that turn off one by one, under Reduce motion (which stills them all). `met`: its row shows in Settings once the
// player has seen it (systems/disclosure.js). settings.effects holds only the ones turned off.
export const EFFECTS = [
    { id: 'numbers', name: 'Floating numbers', met: 'fx_numbers' },
    { id: 'coins', name: 'Coins flying to the purse', met: 'fx_coins' },
    { id: 'confetti', name: 'Confetti', met: 'fx_confetti' },
    { id: 'shake', name: "A boss's shake", met: 'fx_shake' }
];

/** What the game knows of these choices, kept; anything else in a loaded save dropped (core/state.js, game.js setOption). */
export function cleanOptions(settings) {
    if (typeof settings.vibration !== 'boolean') delete settings.vibration;
    if (settings.blows !== 'big') delete settings.blows;
    const fx = settings.effects;
    const off = fx && typeof fx === 'object' ? EFFECTS.filter(e => fx[e.id] === false) : [];
    if (off.length) settings.effects = Object.fromEntries(off.map(e => [e.id, false]));
    else delete settings.effects;
    return settings;
}

/** Is this effect wanted? (Reduce motion stills them all besides: the scene's own check.) */
export const effectOn = (settings, id) => settings?.effects?.[id] !== false;

/** Vibration: its own switch once used; until then it goes with the sound, as when one switch held both. */
export const vibrationOn = settings => (typeof settings?.vibration === 'boolean' ? settings.vibration : settings?.sound !== false);

// Blows in the fight: every one heard (and felt), today's way, or only the big ones: settings.blows 'big'. A watched fight made
// 83-92 sounds a minute, nearly all of them plain blows. The player's own strikes always answer, and a kill is always heard.
/** The sound of one of the hero's own blows: a big one's, a plain one's, or none. */
export function blowSound(settings, ev) {
    if (ev.crit || ev.deathblow || ev.opening || ev.executed) return 'crit';
    return settings?.blows === 'big' ? null : 'hit';
}
/** Is the monster's blow on him heard? */
export const hurtHeard = settings => settings?.blows !== 'big';
