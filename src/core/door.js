// The door (P-065 in the research loop; DESIGN §3.17): who meets the sign-in first on the live site. The bare address
// puts it before a new player (the owner's call, October 2026: the server's save is the game). Inside another site's
// frame, and from a guest's link (`?play`, for posts and listings), a new player is a guest at once: the title card's
// Begin goes straight into the fight, and the account is one click away (the Guest pill). Pure: src/main.js asks it.

/** A guest's link: `play` among the address's parameters (`?play`, `?play=1`, `?src=reddit&play`). */
export function playLink(search = '') {
    try { return new URLSearchParams(String(search || '')).has('play'); } catch { return false; }
}

/**
 * Does this page start as a guest? Framed (`embedded`), a guest's game chosen before in this browser (`chosen`), or a
 * guest's link while no account is signed in here (a signed-in player's link plays the account's game).
 */
export function startsAsGuest({ search = '', embedded = false, chosen = false, signedIn = false } = {}) {
    return !!embedded || !!chosen || (!signedIn && playLink(search));
}
