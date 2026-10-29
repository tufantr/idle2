// A newer version of the game out. An idle game's tab stays open for days, and a player who doesn't read the
// Discord never learns that a fix came (a player's ask, 29 October 2026). deploy/vps/activate.sh writes the commit
// it ships into src/version.js (the copy this page runs) and version.json (the one live now). The page asks for
// version.json when it comes back into view and every UPDATE_CHECK_MS while it stays in view, never while hidden:
// one tiny file from the web server, no work for the API or the database. A look that fails (offline) says nothing
// and the next tries again; once a newer version is found the looking stops, and the header's pill offers the
// reload (src/main.js). The page never reloads by itself.

export const UPDATE_CHECK_MS = 15 * 60000;   // while the page stays in view
export const UPDATE_BACK_MS = 60000;         // back into view: a look, unless one went this recently

/**
 * `own`: this copy's version (empty on a local host: no looks). `found(version)`: called once, with the newer one.
 * `fetcher`: fetch (the tests pass their own).
 */
export function createUpdateCheck({ own, found, now = Date.now(), fetcher = (url, init) => fetch(url, init) }) {
    let lastAt = now;
    let looking = false;
    let live = null;
    async function look(at) {
        if (!own || live || looking) return;
        lastAt = at;
        looking = true;
        try {
            // (a new address each time: no cache on the way, the browser's or Cloudflare's, answers for the server)
            const res = await fetcher(`version.json?t=${at}`, { cache: 'no-store' });
            const version = res.ok ? String((await res.json())?.version || '') : '';
            if (version && version !== own) {
                live = version;
                found(version);
            }
        } catch { /* offline, or not the file it should be: the next look tries again */ }
        finally { looking = false; }
    }
    const due = (at, gap) => {
        if (at < lastAt) lastAt = at;   // the clock turned back: the wait starts again from now
        return at - lastAt >= gap;
    };
    return {
        /** The game's tick, while the page is in view. */
        tick(at) { return due(at, UPDATE_CHECK_MS) ? look(at) : undefined; },
        /** The page back in view. */
        back(at) { return due(at, UPDATE_BACK_MS) ? look(at) : undefined; },
        get live() { return live; }
    };
}
