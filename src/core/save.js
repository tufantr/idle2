// Persistence: local saves (namespaced, versioned), export/import strings, and the cloud API client.
// The cloud layer is optional: with no backend reachable the game runs as a local/guest save.

import { migrateState, SAVE_VERSION } from './state.js';

export const LOCAL_KEY = 'fantasyIdle.save.v2';
export const LEGACY_KEY = 'fantasyIdleSaveLocal';
export const TOKEN_KEY = 'fantasyIdle.jwt';
export const EXPORT_PREFIX = 'FI2:';          // base64 JSON
export const COMPRESSED_PREFIX = 'FI3:';      // base64 deflate(JSON)
export const BACKUP_PREFIX = 'fantasyIdle.backup.';
// Three rotating snapshots taken every 10 minutes, plus one taken on load and one before each prestige.
export const AUTO_BACKUP_SLOTS = ['auto0', 'auto1', 'auto2'];
export const BACKUP_INTERVAL_MS = 10 * 60 * 1000;

function storage() {
    try { return globalThis.localStorage || null; } catch { return null; }
}

/** Load the best available local save (current format first, then the original prototype's). Returns a migrated state or null. */
export function loadLocal(now = Date.now()) {
    const store = storage();
    if (!store) return null;
    for (const key of [LOCAL_KEY, LEGACY_KEY]) {
        const raw = store.getItem(key);
        if (!raw) continue;
        try {
            return migrateState(JSON.parse(raw), now);
        } catch (err) {
            // Keep the unreadable save instead of letting the next autosave overwrite it.
            console.error(`Save in ${key} is unreadable; kept a copy`, err);
            try { store.setItem(`${key}.corrupt.${now}`, raw); } catch { /* storage full */ }
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
    store.removeItem(LOCAL_KEY);
    store.removeItem(LEGACY_KEY);
    // Every backup goes except the one written just before a hard reset, so a reset can be undone.
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

export function listBackups() {
    return [...AUTO_BACKUP_SLOTS, 'load', 'prestige', 'reset']
        .map(slot => ({ slot, ...readBackup(slot) }))
        .filter(b => b.at)
        .sort((a, b) => b.at - a.at);
}

export function restoreBackup(slot, now = Date.now()) {
    const backup = readBackup(slot);
    if (!backup) throw new Error('That backup no longer exists.');
    return migrateState(JSON.parse(backup.json), now);
}

// ---------- export / import ----------

function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}
function fromBase64(text) {
    const binary = atob(text);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export function exportString(json) {
    return EXPORT_PREFIX + toBase64(new TextEncoder().encode(json));
}

/** Compressed export (deflate). Falls back to the plain format where CompressionStream is missing. */
export async function exportStringCompressed(json) {
    if (typeof CompressionStream === 'undefined') return exportString(json);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return COMPRESSED_PREFIX + toBase64(bytes);
}

function checkVersion(parsed, now) {
    if (parsed.version > SAVE_VERSION) throw new Error('This save comes from a newer version of the game.');
    return migrateState(parsed, now);
}

export function importString(text, now = Date.now()) {
    const trimmed = String(text || '').trim();
    if (!trimmed.startsWith(EXPORT_PREFIX)) throw new Error('Not a Fantasy Idle save string.');
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64(trimmed.slice(EXPORT_PREFIX.length))));
    return checkVersion(parsed, now);
}

/** Accepts both the plain (FI2:) and compressed (FI3:) formats. */
export async function importStringAsync(text, now = Date.now()) {
    const trimmed = String(text || '').trim();
    if (!trimmed.startsWith(COMPRESSED_PREFIX)) return importString(trimmed, now);
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed saves.');
    const stream = new Blob([fromBase64(trimmed.slice(COMPRESSED_PREFIX.length))]).stream().pipeThrough(new DecompressionStream('deflate'));
    const parsed = JSON.parse(await new Response(stream).text());
    return checkVersion(parsed, now);
}

// ---------- cloud ----------

export class CloudClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.token = storage()?.getItem(TOKEN_KEY) || null;
        this.username = this.token ? decodeUsername(this.token) : null;
        this.available = null; // unknown until the first request
    }

    get loggedIn() { return !!this.token; }

    async request(path, { method = 'GET', body = null, auth = true } = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
        let res;
        try {
            res = await fetch(`${this.baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        return data;
    }

    setToken(token) {
        this.token = token;
        this.username = token ? decodeUsername(token) : null;
        const store = storage();
        if (!store) return;
        if (token) store.setItem(TOKEN_KEY, token); else store.removeItem(TOKEN_KEY);
    }

    async login(username, password) {
        const data = await this.request('/login', { method: 'POST', body: { username, password }, auth: false });
        this.setToken(data.token);
        return data;
    }

    async register(username, password) {
        const data = await this.request('/register', { method: 'POST', body: { username, password }, auth: false });
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
        return { state, lastSaved: data.lastSaved || 0, optIn: !!data.optIn };
    }

    async push(stateObject) {
        return this.request('/save', { method: 'POST', body: { state: stateObject } });
    }

    // ----- social (clans, rewards, leaderboards) -----
    clans(search = '') { return this.request(`/clans?search=${encodeURIComponent(search)}`); }
    createClan(fields) { return this.request('/clans', { method: 'POST', body: fields }); }
    joinClan(clanId) { return this.request('/clans/join', { method: 'POST', body: { clanId } }); }
    leaveClan() { return this.request('/clans/leave', { method: 'POST', body: {} }); }
    myClan() { return this.request('/clan'); }
    clanAttack() { return this.request('/clan/attack', { method: 'POST', body: {} }); }
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

/**
 * Decide which of two saves to keep. Playtime is the primary signal (it only grows), the save
 * timestamp the tiebreaker; `conflict` is true when the signals disagree so the UI can ask.
 */
export function chooseSave(local, cloud) {
    if (!local) return { pick: 'cloud', conflict: false };
    if (!cloud) return { pick: 'local', conflict: false };
    const byPlaytime = (cloud.meta.playtimeMs || 0) > (local.meta.playtimeMs || 0) ? 'cloud' : 'local';
    const byTime = (cloud.meta.savedAt || 0) > (local.meta.savedAt || 0) ? 'cloud' : 'local';
    // Two different games (a guest save meeting an account's save) are never merged silently.
    const sameGame = (cloud.meta.createdAt || 0) === (local.meta.createdAt || 0);
    return { pick: byPlaytime, conflict: byPlaytime !== byTime || !sameGame };
}
