// Persistence: local saves (namespaced, versioned), export/import strings, and the cloud API client.
// The cloud layer is optional: with no backend reachable the game runs as a local/guest save.

import { migrateState, SAVE_VERSION } from './state.js';

export const LOCAL_KEY = 'fantasyIdle.save.v2';
export const LEGACY_KEY = 'fantasyIdleSaveLocal';
export const TOKEN_KEY = 'fantasyIdle.jwt';
export const EXPORT_PREFIX = 'FI2:';

function storage() {
    try { return globalThis.localStorage || null; } catch { return null; }
}

/** Load the best available local save (current format first, then the original prototype's). Returns a migrated state or null. */
export function loadLocal(now = Date.now()) {
    const store = storage();
    if (!store) return null;
    try {
        const raw = store.getItem(LOCAL_KEY);
        if (raw) return migrateState(JSON.parse(raw), now);
    } catch (err) { console.error('Local save unreadable', err); }
    try {
        const legacy = store.getItem(LEGACY_KEY);
        if (legacy) {
            const state = migrateState(JSON.parse(legacy), now);
            return state;
        }
    } catch (err) { console.error('Legacy save unreadable', err); }
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
}

export function exportString(json) {
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return EXPORT_PREFIX + btoa(binary);
}

export function importString(text, now = Date.now()) {
    const trimmed = String(text || '').trim();
    if (!trimmed.startsWith(EXPORT_PREFIX)) throw new Error('Not a Fantasy Idle save string.');
    const binary = atob(trimmed.slice(EXPORT_PREFIX.length));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (parsed.version > SAVE_VERSION) throw new Error('This save comes from a newer version of the game.');
    return migrateState(parsed, now);
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

    /** Returns { state, lastSaved } (state may be null for a fresh account). */
    async pull(now = Date.now()) {
        const data = await this.request('/load');
        return { state: data.state ? migrateState(data.state, now) : null, lastSaved: data.lastSaved || 0 };
    }

    async push(stateObject) {
        return this.request('/save', { method: 'POST', body: { state: stateObject } });
    }
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
    return { pick: byPlaytime, conflict: byPlaytime !== byTime };
}
