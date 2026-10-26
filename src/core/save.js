// Persistence: local saves (namespaced, versioned), backups, and the cloud API client. Signed in, the
// server's save is the game (syncChoice); a guest's game lives in this browser, with its backups, and never
// goes up to an account (startsOver).

import { migrateState } from './state.js';

export const LOCAL_KEY = 'fantasyIdle.save.v2';
export const LEGACY_KEY = 'fantasyIdleSaveLocal';
export const TOKEN_KEY = 'fantasyIdle.jwt';
// The cloud save this device last saw (its server time), whose, and which game (its createdAt): an upload
// names it, and the server refuses one made over a save it hasn't seen (another device's).
export const CLOUD_BASE_KEY = 'fantasyIdle.cloudBase';
export const BACKUP_PREFIX = 'fantasyIdle.backup.';
// Three rotating snapshots taken every 10 minutes, plus one taken on load and one before each prestige.
export const AUTO_BACKUP_SLOTS = ['auto0', 'auto1', 'auto2'];
export const BACKUP_INTERVAL_MS = 10 * 60 * 1000;

function storage() {
    try { return globalThis.localStorage || null; } catch { return null; }
}

let loadProblem = null;
/** The key of the local save the last loadLocal couldn't read, or null (main.js offers the backups). */
export function localLoadProblem() { return loadProblem; }

/** Load the best available local save (current format first, then the original prototype's). Returns a migrated state or null. */
export function loadLocal(now = Date.now()) {
    const store = storage();
    if (!store) return null;
    loadProblem = null;
    for (const key of [LOCAL_KEY, LEGACY_KEY]) {
        const raw = store.getItem(key);
        if (!raw) continue;
        try {
            return migrateState(JSON.parse(raw), now);
        } catch (err) {
            // Keep the unreadable save instead of letting the next autosave overwrite it.
            console.error(`Save in ${key} is unreadable; kept a copy`, err);
            try { store.setItem(`${key}.corrupt.${now}`, raw); } catch { /* storage full */ }
            // and never fall back to the prototype's save behind it: that was migrated long ago, and the
            // game would autosave a years-old hero over this one
            loadProblem = key;
            return null;
        }
    }
    return null;
}

export function saveLocal(json) {
    const store = storage();
    if (!store) return false;
    try { store.setItem(LOCAL_KEY, json); return true; } catch (err) { console.error('Save failed', err); return false; }
}

export function clearLocal() {
    const store = storage();
    if (!store) return;
    backupsListed = null;
    store.removeItem(LOCAL_KEY);
    store.removeItem(LEGACY_KEY);
    // Every backup goes except the one written just before a hard reset, so a reset can be undone, and the
    // guest's game put aside when an account signed in (startsOver).
    for (const slot of [...AUTO_BACKUP_SLOTS, 'load', 'prestige']) store.removeItem(BACKUP_PREFIX + slot);
}

// ---------- backups ----------

/** A short description of a save for the backup list. */
function describeState(state) {
    return { bestStage: state.combat?.bestStage || 1, playtimeMs: state.meta?.playtimeMs || 0, prestiges: state.prestige?.count || 0 };
}

export function writeBackup(json, slot, label, now = Date.now()) {
    const store = storage();
    if (!store) return false;
    try {
        const summary = describeState(JSON.parse(json));
        store.setItem(BACKUP_PREFIX + slot, JSON.stringify({ at: now, label, summary, json }));
        backupsListed = null;
        return true;
    } catch (err) { console.error('Backup failed', err); return false; }
}

export function readBackup(slot) {
    const store = storage();
    try { return JSON.parse(store?.getItem(BACKUP_PREFIX + slot) || 'null'); } catch { return null; }
}

/** Write into the oldest of the rotating slots. */
export function rotateBackup(json, now = Date.now()) {
    const oldest = AUTO_BACKUP_SLOTS.map(slot => ({ slot, at: readBackup(slot)?.at || 0 })).sort((a, b) => a.at - b.at)[0];
    return writeBackup(json, oldest.slot, 'Automatic', now);
}

// The list as last read, until a backup is written: each read parsed six whole saves, and Settings
// read it every time it was drawn.
let backupsListed = null;
/** The backups, newest first: { slot, at, label, summary } (restoreBackup reads the save itself). */
export function listBackups() {
    backupsListed ||= [...AUTO_BACKUP_SLOTS, 'load', 'prestige', 'reset', 'guest']
        .map(slot => { const b = readBackup(slot); return b ? { slot, at: b.at, label: b.label, summary: b.summary } : { slot }; })
        .filter(b => b.at)
        .sort((a, b) => b.at - a.at);
    return backupsListed;
}

export function restoreBackup(slot, now = Date.now()) {
    const backup = readBackup(slot);
    if (!backup) throw new Error('That backup no longer exists.');
    return migrateState(JSON.parse(backup.json), now);
}

// ---------- cloud ----------

export class CloudClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.token = storage()?.getItem(TOKEN_KEY) || null;
        this.username = this.token ? decodeUsername(this.token) : null;
        this.available = null; // unknown until the first request
        this.base = null;      // the cloud save this page has seen (pull or push), as the server's lastSaved
    }

    /** The cloud save this device saw last time, for this account ({ at, savedAt, game } or null). */
    knownBase() {
        try {
            const known = JSON.parse(storage()?.getItem(CLOUD_BASE_KEY) || 'null');
            return known && known.user === this.username && Number.isFinite(known.at) ? known : null;
        } catch { return null; }
    }
    noteBase(at, savedAt = null, game = null) {
        this.base = at;
        try { storage()?.setItem(CLOUD_BASE_KEY, JSON.stringify({ user: this.username, at, savedAt, game })); } catch { /* storage full */ }
    }
    /** Is `state` this account's own game, the one this device last saw on its server (a sign-in after the session ran out)? */
    ownsGame(state) {
        const game = this.knownBase()?.game;
        return game != null && game === state?.meta?.createdAt;
    }

    get loggedIn() { return !!this.token; }

    /** `keepalive`: the request outlives the page (an upload as it closes; browsers allow 64 KB that way). */
    async request(path, { method = 'GET', body = null, auth = true, keepalive = false } = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
        const text = body ? JSON.stringify(body) : undefined;
        let res;
        try {
            res = await fetch(`${this.baseUrl}${path}`, { method, headers, body: text, keepalive: keepalive && (text?.length || 0) < 60000 });
        } catch (err) {
            this.available = false;
            throw new Error('Cloud server unreachable — playing locally.');
        }
        // A static host without the API answers with HTML (404/405/501), not JSON.
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (!isJson && res.status !== 401 && res.status !== 403) {
            this.available = false;
            throw new Error('Cloud saves are not available on this server — playing locally.');
        }
        this.available = true;
        if (res.status === 401 || res.status === 403) {
            this.setToken(null);
            throw new Error('Session expired — please log in again.');
        }
        let data = {};
        try { data = await res.json(); } catch { /* empty body */ }
        if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, data });   // (the answer too: a sign-in waiting for its code says so)
        return data;
    }

    setToken(token) {
        this.token = token;
        this.username = token ? decodeUsername(token) : null;
        this.base = null;   // another account (or none): nothing seen of its cloud yet
        const store = storage();
        if (!store) return;
        if (token) store.setItem(TOKEN_KEY, token); else store.removeItem(TOKEN_KEY);
    }

    async login(username, password) {
        const data = await this.request('/login', { method: 'POST', body: { username, password }, auth: false });
        this.setToken(data.token);
        return data;
    }

    /** An account with an email: the server mails a code, and the account plays once it is given (verify). */
    async register(username, password, email) {
        const data = await this.request('/register', { method: 'POST', body: { username, password, email }, auth: false });
        if (data.token) this.setToken(data.token);   // (a server from before codes signs in at once)
        return data;
    }

    async verify(username, code) {
        const data = await this.request('/verify', { method: 'POST', body: { username, code }, auth: false });
        this.setToken(data.token);
        return data;
    }

    resendCode(username) { return this.request('/verify/resend', { method: 'POST', body: { username }, auth: false }); }

    forgotPassword(email) { return this.request('/password/forgot', { method: 'POST', body: { email }, auth: false }); }

    async resetPassword(email, code, password) {
        const data = await this.request('/password/reset', { method: 'POST', body: { email, code, password }, auth: false });
        this.setToken(data.token);
        return data;
    }

    logout() { this.setToken(null); }

    /**
     * Returns { state, lastSaved } (state may be null for a fresh account). Time away is measured on
     * the server's clock: the save's timestamp is moved so that now − savedAt equals the time the
     * server saw pass since the upload, whatever this device's clock says.
     */
    async pull(now = Date.now()) {
        const data = await this.request('/load');
        const state = data.state ? migrateState(data.state, now) : null;
        if (state && data.lastSaved > 0 && data.serverNow > 0) {
            const away = Math.max(0, data.serverNow - data.lastSaved);
            state.meta.savedAt = now - away;
            state.meta.lastInputAt = Math.min(state.meta.lastInputAt ?? state.meta.savedAt, state.meta.savedAt);
        }
        this.noteBase(data.lastSaved || 0, state?.meta.savedAt ?? null, state?.meta.createdAt ?? null);
        return { state, lastSaved: data.lastSaved || 0, optIn: !!data.optIn, gifts: Number(data.gifts) || 0, banner: data.banner ?? null };
    }

    /**
     * Upload the save over the cloud save this page has seen (`base`): if another device has uploaded
     * since, the server refuses it (an error with status 409) and the game looks at the server again
     * (syncChoice). The answer says how many gifts wait for this player ({ gifts }).
     */
    async push(stateObject, { keepalive = false } = {}) {
        const answer = await this.request('/save', { method: 'POST', body: { state: stateObject, ...(this.base === null ? {} : { base: this.base }) }, keepalive });
        if (Number.isFinite(answer?.timestamp)) this.noteBase(answer.timestamp, stateObject?.meta?.savedAt ?? null, stateObject?.meta?.createdAt ?? null);
        return answer;
    }

    /** Claim the gifts waiting on the server: [{ id, kind, gold?, essence?, diamond?, text? }]. */
    claimGifts() { return this.request('/gifts/claim', { method: 'POST', body: {} }); }

    // ----- social (clans, rewards, leaderboards) -----
    clans(search = '') { return this.request(`/clans?search=${encodeURIComponent(search)}`); }
    createClan(fields) { return this.request('/clans', { method: 'POST', body: fields }); }
    joinClan(clanId) { return this.request('/clans/join', { method: 'POST', body: { clanId } }); }
    leaveClan() { return this.request('/clans/leave', { method: 'POST', body: {} }); }
    kickMember(username) { return this.request('/clan/kick', { method: 'POST', body: { username } }); }
    myClan() { return this.request('/clan'); }
    /** A clan attack as it was fought: when the player struck (ms into the fight) and how long it lasted. */
    clanAttack({ strikes = [], ms, at, endless = false } = {}) { return this.request('/clan/attack', { method: 'POST', body: { strikes, ms, fightAt: at, ...(endless ? { endless: true } : {}) } }); }   // `at`: the fight's own mark, so a resend is never a second attack; `endless`: at the Endless Hydra
    /** The week's clan ranking: every clan in its division, and last week's crowns. */
    clanRanking() { return this.request('/clans/ranking'); }
    rewards() { return this.request('/rewards'); }
    claimRewards(ids) { return this.request('/rewards/claim', { method: 'POST', body: { ids } }); }
    leaderboard(metric, period) { return this.request(`/leaderboard?metric=${encodeURIComponent(metric)}&period=${encodeURIComponent(period)}`); }
    setLeaderboardConsent(optIn) { return this.request('/leaderboard/consent', { method: 'POST', body: { optIn } }); }
}

function decodeUsername(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.username || null;
    } catch { return null; }
}

/** Has this game been played (a kill, or a minute in it)? An untouched one gives way to the server's. */
export function played(state) {
    return !!(state?.stats?.kills || state?.meta?.playtimeMs > 60000);
}

/** Has anything been done in this game (a kill, a point of XP)? */
export function progressed(state) {
    return !!(state?.stats?.kills || Object.values(state?.skills || {}).some(skill => Number(skill?.xp) > 0));
}

/**
 * Signing in with a game on the page: does the account start over instead of taking it? An account plays its own
 * game, never one played without it (the owner's call, October 2026: a guest's progress stays in the guest's
 * browser). Kept: the account's own game (`own`: signed in again after the session ran out) and a new hero with
 * nothing done yet (named on the title card while the account was made). A guest's game (`guest`: the player chose
 * to play as one) starts over however little was played.
 */
export function startsOver(live, { guest = false, own = false } = {}) {
    return !own && (guest || progressed(live));
}

/** Does `live` hold everything the server's `remote` has (the same game, as far in every count), so keeping it loses nothing? */
export function aheadOf(live, remote) {
    const xp = s => Object.values(s.skills || {}).reduce((n, k) => n + (Number(k?.xp) || 0), 0);
    const counts = s => [s.combat?.bestStage || 0, s.prestige?.count || 0, s.ascension?.count || 0, s.stats?.kills || 0, xp(s)];
    const mine = counts(live);
    return live.meta?.createdAt === remote.meta?.createdAt && counts(remote).every((v, i) => v <= mine[i]);
}

/**
 * The game a signed-in player plays after looking at the server: the server's save is the game, as in any
 * online game, and nobody is asked. This device's game is kept (and uploaded) only when it is the server's
 * carried on: the server's save unchanged since this device last saw it (`known`, its lastSaved then) and
 * the same game, or this game already holding all the server's has (the upload this page sent as it closed,
 * or one whose answer was lost). Returns 'local' or 'cloud'. No server save: this game is the account's first.
 */
export function syncChoice(live, remote, lastSaved, known = null) {
    if (!remote) return 'local';
    if (!played(live)) return 'cloud';
    if (known !== null && known === lastSaved && live.meta?.createdAt === remote.meta?.createdAt) return 'local';
    return aheadOf(live, remote) ? 'local' : 'cloud';
}
