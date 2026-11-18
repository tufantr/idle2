// The choices in Settings that change how the game looks, sounds and reads, never how it plays (docs/DESIGN.md §3.36).
// Each is optional in the save: a save without it is today's game, and an older game passes over it.

/** What the game knows of these choices, kept; anything else in a loaded save dropped (core/state.js, game.js setOption). */
export function cleanOptions(settings) {
    if (typeof settings.vibration !== 'boolean') delete settings.vibration;
    return settings;
}

/** Vibration: its own switch once used; until then it goes with the sound, as when one switch held both. */
export const vibrationOn = settings => (typeof settings?.vibration === 'boolean' ? settings.vibration : settings?.sound !== false);
