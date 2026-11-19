#!/usr/bin/env node
// Coming back, checked in Chromium (DESIGN §3.16): what a unit test can't reach of the replay of time away (src/main.js
// catchUp). A guest back after a day; a signed-in player whose server answers fast, late, or with another device's game; a
// page reloaded in the middle of the replay. Each check prints ok or FAIL, and the tool exits 1 on any FAIL.
//
//   node tools/bootcheck.mjs runs/hero-1300.json [--against=<an older game folder>] [--only=guest,slow,...] [--rate=4] [--browser=firefox]
//
// (--browser=firefox or webkit: no CPU throttle there, and no sign-in flow, which needs Chromium's host mapping.)
//
// The hero comes from tools/simulate.mjs --save-at: deep, with Auto prestige, so that his replay lasts. The flows: guest, fast,
// firsttap, signin, slow, server, lateserver, reload, and with --against, same: the four ways back (a guest's boot, a gap in a running tab, signed
// in with this copy kept or with the server's game) in both folders from one save, one clock and one seed, the games they
// end in compared field by field. The dice are seeded as each replay begins, so a replay made first and thrown away
// (the older boot's, signed in) changes nothing. Needs Playwright, as tools/shots.mjs does.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumOrExit, serve, shifted } from './bootlib.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [savePath] = args.filter(a => !a.startsWith('--')).map(p => resolve(p));
if (!savePath) { console.error('Usage: node tools/bootcheck.mjs <save.json> [--against=<older game folder>] [--only=guest,fast,...] [--rate=4]'); process.exit(2); }
const ENGINE = String(opt.browser || 'chromium');
const THROTTLES = ENGINE === 'chromium';   // (Chrome's CPU throttle, and its mapping of a host name)
const RATE = THROTTLES ? Number(opt.rate || 4) : 1;
const only = opt.only ? new Set(String(opt.only).split(',')) : null;
const wanted = name => (!only || only.has(name)) && (THROTTLES || name !== 'signin');
const HOUR = 3600000;
const SEED = 20261119;
const WAIT_MS = 180000;      // the slowest thing waited for: a deep hero's replay on a loaded machine, throttled
const TOKEN = `x.${Buffer.from(JSON.stringify({ id: 1, username: 'Tester' })).toString('base64url')}.x`;

// What the served game is given, for these checks only: a replay's dice seeded as it begins, and a note of each replay.
const PROBE = `
import { rng as __rng, seededRandom as __seeded } from '../core/rng.js';
function __begin(game, now, options) {
    if (now - (game.state.meta.savedAt || now) < (options?.minMs ?? 60000)) return { };
    __rng.setSource(__seeded(${SEED}));
    const note = { savedAt: game.state.meta.savedAt, now, kills: game.state.stats.kills, done: false };
    (globalThis.__replays ||= []).push(note);
    return note;
}
`;
function patch(path, text) {
    if (path !== 'src/systems/offline.js') return null;
    if (text.includes('export function* offlineReplay(')) {   // sliced
        return PROBE + text.replace('export function* offlineReplay(game, now, {',
            'export function* offlineReplay(game, now, options) { const note = __begin(game, now, options); const out = yield* __replayed(game, now, options); note.done = true; return out; }\nfunction* __replayed(game, now, {');
    }
    return PROBE + text.replace('export function applyOffline(game, now, {',   // in one go
        'export function applyOffline(game, now, options) { const note = __begin(game, now, options); const out = __applied(game, now, options); note.done = true; return out; }\nfunction __applied(game, now, {');
}

const raw = JSON.parse(await readFile(savePath, 'utf8'));
const aged = (hours, base = Date.now()) => shifted(raw, base - hours * HOUR);
const HOST = 'play.example';   // (a host that is no local one: the sign-in stands in front of the game there)
const browser = await chromiumOrExit(ENGINE).launch(THROTTLES ? { args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`] } : {});
const mine = await serve(ROOT, patch);
const older = opt.against ? await serve(resolve(String(opt.against)), patch) : null;

let failed = 0;
function note(name, ok, detail = '') {
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
}

/** A page of `server`, the save in its storage (once: a reload finds what the game left there), signed in when `api` answers. */
async function open(server, { save, api = null, rate = 1, clock = null, host = null, token = !!api }) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([text, token, at]) => {
        if (!sessionStorage.getItem('bootcheck')) {
            sessionStorage.setItem('bootcheck', '1');
            localStorage.setItem('fantasyIdle.save.v2', text);
            localStorage.setItem('fantasyIdle.introSeen', '1');
            if (token) localStorage.setItem('fantasyIdle.jwt', token);
        }
        if (at !== null) { let t = at; Date.now = () => t; window.__clock = { add: ms => { t += ms; return t; }, now: () => t }; }
        const seen = (window.__seen = { bars: 0, reports: 0, waiting: 0, values: [], away: '' });
        let barUp = false, reportUp = false;
        new MutationObserver(() => {
            const bar = document.querySelector('.cu-bar');
            if (bar && !barUp) seen.bars++;
            barUp = !!bar;
            if (bar?.classList.contains('waiting')) seen.waiting = 1;
            else if (bar) { const v = Number(bar.getAttribute('aria-valuenow')); if (v !== seen.values[seen.values.length - 1]) seen.values.push(v); }
            const report = document.querySelector('.welcome-back');
            if (report && !reportUp) { seen.reports++; seen.away = report.querySelector('.wb-away')?.textContent || ''; }
            reportUp = !!report;
        }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-valuenow', 'class'] });
    }, [JSON.stringify(save), token ? TOKEN : null, clock]);
    const calls = [];
    if (api) await ctx.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        calls.push(path);
        const answer = await api(path, route.request());
        if (answer?.delay) await new Promise(r => setTimeout(r, answer.delay));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer?.body ?? {}) }).catch(() => {});
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    if (THROTTLES) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(host ? server.url.replace('127.0.0.1', host) : server.url, { waitUntil: 'commit' });
    return { page, ctx, calls, errors };
}
const seen = page => page.evaluate(() => ({ ...window.__seen, values: window.__seen.values.length, last: window.__seen.values.at(-1) ?? null,
    replays: window.__replays || [], report: !!document.querySelector('.welcome-back'), bar: !!document.querySelector('.cu-bar') }));
const reportUp = page => page.waitForSelector('.welcome-back', { timeout: WAIT_MS }).then(() => true).catch(() => false);
/** The bar at `percent` or past it (it may be slow to come: the page is throttled and the machine shared). */
const barAt = (page, percent) => page.waitForFunction(p => (window.__seen?.values.at(-1) ?? -1) >= p, percent, { timeout: WAIT_MS, polling: 100 }).then(() => true).catch(() => false);
/** The game on the page: its sidebar drawn, nothing between the player and it. */
const gameDrawn = page => page.evaluate(() => document.querySelector('#nav')?.children.length > 0 && !document.getElementById('app').hasAttribute('inert') && !document.querySelector('#modal-root .modal-overlay'));
const collect = page => page.evaluate(() => { document.querySelector('.welcome-back .btn-confirm')?.click(); });
/** The game keeps playing: its kills or its clock go on after the report is gone. */
async function plays(page) {
    const at = () => page.evaluate(() => ({ now: FI.game().now, kills: FI.game().state.stats.kills }));
    const before = await at();
    await page.waitForTimeout(3000);
    const after = await at();
    return after.now > before.now && (after.kills >= before.kills);
}
const noErrors = (name, errors) => note(`${name}: no page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));

/** The server's answers: no save of its own, or `remote`, after `delay` ms. `uploads` collects what goes up. */
function serverApi({ remote = null, delay = 0, lastSaved = 0, now = () => Date.now(), uploads = [] }) {
    return async (path, req) => {
        if (path === '/load') return { delay, body: { state: remote, lastSaved, serverNow: now(), gifts: 0, banner: null, hall: null, hallGifts: [] } };
        if (path === '/save') { uploads.push(JSON.parse(req.postData() || '{}')); return { body: { success: true, timestamp: now(), gifts: 0, banner: null, hall: null, hallGifts: [] } }; }
        return { body: {} };
    };
}
/** The hero as another device left him: further on (so the server's save wins), `hours` before `base`. */
function played(hours, base = Date.now()) {
    const s = aged(hours, base);
    s.stats.kills += 100000;
    s.combat.bestStage += 5;
    return s;
}

// ---------- the flows ----------

const FLOWS = {
    /** A guest back after a day: the bar moves, nothing behind it can be reached, the report takes its place. */
    async guest() {
        const { page, ctx, errors } = await open(mine, { save: aged(24), rate: RATE });
        const moved = await barAt(page, 5);
        const mid = await page.evaluate(() => ({ time: document.querySelector('.cu-time')?.textContent || '', facts: document.querySelector('.cu-facts')?.textContent || '',
            pageHeld: document.getElementById('app').hasAttribute('inert') && document.getElementById('hotbar').hasAttribute('inert'),
            modal: !!document.querySelector('#modal-root .catch-up-overlay'), name: document.querySelector('.catch-up-overlay')?.getAttribute('aria-label') }));
        note('guest: the bar shows mid-replay, with the time and the stage', moved && /of 24h 0m/.test(mid.time) && /Stage/.test(mid.facts) && mid.name === 'Catching up', JSON.stringify(mid));
        note('guest: the page behind it is held', mid.pageHeld && mid.modal);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Escape');
        const kept = await page.evaluate(() => ({ focus: !!document.activeElement?.closest('.catch-up-overlay'), bar: !!document.querySelector('.cu-bar') }));
        note('guest: Tab stays in it, Escape leaves it up', kept.focus && kept.bar, JSON.stringify(kept));
        const got = await reportUp(page);
        await page.waitForTimeout(300);
        const s = await seen(page);
        note('guest: the bar moved on and the report took its place, once', got && s.values >= 3 && s.reports === 1 && s.bars === 1 && !s.bar, JSON.stringify({ ...s, replays: s.replays.length }));
        note('guest: one replay', s.replays.length === 1 && s.replays[0].done);
        await collect(page);
        await page.waitForTimeout(400);
        note('guest: Collect, and the game is there', await gameDrawn(page));
        note('guest: and it plays', await plays(page));
        noErrors('guest', errors);
        await ctx.close();
    },

    /** A gap found by the first tap after it: the tap does not act on the game, and the replay stays in slices. */
    async firsttap() {
        const T = Date.now();
        const { page, ctx, errors } = await open(mine, { save: shifted(raw, T), clock: T, rate: RATE });
        await page.waitForFunction(() => window.FI?.game && document.querySelector('#nav')?.children.length > 0, null, { timeout: WAIT_MS, polling: 200 });
        await page.waitForTimeout(500);
        const box = await page.locator('.menu-btn:visible, #nav .nav-btn:visible').first().boundingBox();   // (in a fight filling the screen, its Menu)
        await page.evaluate(() => window.__clock.add(24 * 3600000));
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        const held = await page.evaluate(() => ({ catching: !!FI.game().catchingUp, inert: document.getElementById('app').hasAttribute('inert'), report: !!document.querySelector('.welcome-back'), replays: (window.__replays || []).map(r => r.done) }));
        note('the first tap after a gap: the replay stays in slices, the page held', held.catching && held.inert, JSON.stringify(held));
        const folded = await page.evaluate(() => !!document.querySelector('body.battle-full'));
        note('the first tap after a gap: it did not act on the game', folded);
        const got = await reportUp(page);
        const s = await seen(page);
        note('the first tap after a gap: the report, once', got && s.reports === 1 && s.replays.length === 1, JSON.stringify({ reports: s.reports, replays: s.replays.length }));
        noErrors('the first tap', errors);
        await ctx.close();
    },

    /** Behind the sign-in (a host that is no local one): the game stands as it was left, and nothing is replayed before the choice. */
    async signin() {
        const atSignIn = async page => {
            await page.waitForSelector('#auth-user', { timeout: WAIT_MS });
            await page.waitForFunction(() => document.querySelector('#nav')?.children.length > 0, null, { timeout: WAIT_MS, polling: 200 });
            return seen(page);
        };
        {   // played as a guest
            const { page, ctx, errors } = await open(mine, { save: aged(24), host: HOST, rate: RATE });
            const s = await atSignIn(page);
            note('behind the sign-in: the game is drawn, nothing replayed yet', s.replays.length === 0 && !s.bar && !s.report, JSON.stringify({ replays: s.replays.length }));
            await page.evaluate(() => [...document.querySelectorAll('#modal-root .modal-footer button')].find(b => /guest/i.test(b.textContent))?.click());
            const moved = await barAt(page, 5);
            const got = await reportUp(page);
            const after = await seen(page);
            note('play as guest: then the bar, one replay, the report', moved && got && after.reports === 1 && after.replays.length === 1 && after.replays[0].done, JSON.stringify({ ...after, replays: after.replays.length }));
            noErrors('play as guest', errors);
            await ctx.close();
        }
        {   // an account, whose game is not the one in this browser: only its own is replayed
            const remote = played(3);
            const answers = serverApi({ remote, lastSaved: Date.now() - 3 * HOUR, delay: 300 });
            const api = async (path, req) => (path === '/login' ? { body: { token: TOKEN } } : answers(path, req));
            const { page, ctx, errors } = await open(mine, { save: aged(24), host: HOST, api, token: false });
            await atSignIn(page);
            await page.fill('#auth-user', 'Tester');
            await page.fill('#auth-pass', 'not-a-password');
            await page.press('#auth-pass', 'Enter');
            const got = await reportUp(page);
            await page.waitForTimeout(500);
            const s = await seen(page);
            note("signing in: only the account's game is replayed, once", got && s.replays.length === 1 && s.replays[0].kills === remote.stats.kills && s.reports === 1 && /3h/.test(s.away), JSON.stringify({ replays: s.replays, reports: s.reports, away: s.away }));
            noErrors('signing in', errors);
            await ctx.close();
        }
    },

    /** Signed in, the server answers in a second and has no save: this copy is replayed once, then goes up. */
    async fast() {
        const uploads = [];
        const { page, ctx, errors } = await open(mine, { save: aged(24), api: serverApi({ delay: 1000, uploads }) });
        const got = await reportUp(page);
        await page.waitForTimeout(1500);
        const s = await seen(page);
        note('signed in, the server answers: it waits, replays once, reports once', got && s.waiting === 1 && s.reports === 1 && s.bars === 1 && s.replays.length === 1 && s.replays[0].done, JSON.stringify({ ...s, replays: s.replays.length }));
        const savedAt = uploads[0]?.state?.meta?.savedAt;
        note('signed in: the upload carries the time away replayed', uploads.length >= 1 && Math.abs(Date.now() - savedAt) < 120000, `${uploads.length} uploads`);
        noErrors('signed in', errors);
        await ctx.close();
    },

    /** Signed in, the server takes 6 s and has no save: after the 4 s wait this copy plays; the late answer ends in its upload. */
    async slow() {
        const uploads = [];
        const started = Date.now();
        const { page, ctx, errors } = await open(mine, { save: aged(24), api: serverApi({ delay: 6000, uploads }), rate: RATE });
        const moving = await barAt(page, 1);
        const at = Date.now() - started;
        const got = await reportUp(page);
        await page.waitForTimeout(3000);
        const s = await seen(page);
        note('a slow server: this copy is replayed after the wait, once', moving && at >= 3500 && got && s.reports === 1 && s.replays.length === 1, `bar moving after ${at} ms; ${JSON.stringify({ ...s, replays: s.replays.length })}`);
        note('a slow server: its answer still ends in an upload', uploads.length >= 1, `${uploads.length} uploads`);
        noErrors('a slow server', errors);
        await ctx.close();
    },

    /** Signed in, another device played: the server's game is replayed, only it, once. */
    async server() {
        const remote = played(3);
        const lastSaved = Date.now() - 3 * HOUR;
        const { page, ctx, errors } = await open(mine, { save: aged(24), api: serverApi({ remote, lastSaved, delay: 800 }) });
        const got = await reportUp(page);
        await page.waitForTimeout(1000);
        const s = await seen(page);
        const kills = await page.evaluate(() => FI.game().state.stats.kills);
        note("the server's save wins: one replay, of the server's three hours", got && s.replays.length === 1 && s.replays[0].done && s.replays[0].kills === remote.stats.kills && s.reports === 1 && /3h/.test(s.away), JSON.stringify({ ...s, replays: s.replays }));
        note("the server's save wins: its game is the one played", kills >= remote.stats.kills, `${kills} kills`);
        noErrors("the server's save wins", errors);
        await ctx.close();
    },

    /** The same with a server that answers after the wait: this copy's replay, under way, is dropped when the answer comes. */
    async lateserver() {
        const remote = played(3);
        const lastSaved = Date.now() - 3 * HOUR;
        const { page, ctx, errors } = await open(mine, { save: aged(24), api: serverApi({ remote, lastSaved, delay: 5500 }), rate: RATE });
        const got = await reportUp(page);
        await page.waitForTimeout(1000);
        const s = await seen(page);
        const finished = s.replays.filter(r => r.done);
        note("a late answer, the server's save wins: only the server's game is replayed to the end", got && finished.length === 1 && finished[0].kills === remote.stats.kills && s.reports === 1 && /3h/.test(s.away), JSON.stringify({ ...s, replays: s.replays }));
        noErrors('a late answer', errors);
        await ctx.close();
    },

    /** A reload in the middle of the replay: the save is as it was, the replay starts again, the game plays and keeps it. */
    async reload() {
        const save = aged(24);
        const { page, ctx, errors } = await open(mine, { save, rate: RATE });
        const text = JSON.stringify(save);
        const mid = await barAt(page, 20);
        const during = await page.evaluate(() => localStorage.getItem('fantasyIdle.save.v2'));
        note('reload: mid-replay the save on the disk is untouched', mid && during === text);
        await page.reload({ waitUntil: 'commit' });
        const again = await barAt(page, 5);
        const after = await page.evaluate(() => localStorage.getItem('fantasyIdle.save.v2'));
        note('reload: the new page replays the time away from the same save', again && after === text);
        await page.reload({ waitUntil: 'commit' });   // and once more, sooner
        const got = await reportUp(page);
        const s = await seen(page);
        note('reload: the report comes, of the whole time away', got && s.reports === 1 && /24h/.test(s.away), JSON.stringify({ reports: s.reports, away: s.away }));
        await collect(page);
        await page.waitForTimeout(400);
        note('reload: the game is there and plays', (await gameDrawn(page)) && (await plays(page)));
        const kills = await page.evaluate(() => FI.game().state.stats.kills);
        await page.reload({ waitUntil: 'commit' });
        await page.waitForFunction(() => window.FI?.game && document.querySelector('#nav')?.children.length > 0, null, { timeout: WAIT_MS, polling: 200 });
        await page.waitForTimeout(500);
        const back = await page.evaluate(() => ({ kills: FI.game().state.stats.kills, report: !!document.querySelector('.welcome-back'), bar: !!document.querySelector('.cu-bar') }));
        note('reload: once over, a reload keeps the game and replays nothing', back.kills >= kills && !back.report && !back.bar, JSON.stringify(back));
        noErrors('reload', errors);
        await ctx.close();
        {   // signed in: nothing goes up from a replay cut short; the whole time away goes up once it is over
            const uploads = [];
            const signedIn = await open(mine, { save: aged(24), api: serverApi({ delay: 200, uploads }), rate: RATE });
            const cut = await barAt(signedIn.page, 20);
            const early = uploads.length;
            await signedIn.page.reload({ waitUntil: 'commit' });
            const done = await reportUp(signedIn.page);
            await signedIn.page.waitForTimeout(1500);
            const savedAt = uploads[0]?.state?.meta?.savedAt;
            note('reload, signed in: nothing went up mid-replay, the whole time away after it', cut && early === 0 && done && uploads.length >= 1 && Math.abs(Date.now() - savedAt) < 120000, `${early} uploads mid-replay, ${uploads.length} after`);
            noErrors('reload, signed in', signedIn.errors);
            await signedIn.ctx.close();
        }
    },

    /** Both folders, the four ways back: the same save, clock and dice end in the same game, field by field. */
    async same() {
        if (!older) { console.log('skip same: no --against folder'); return; }
        const T = Date.UTC(2026, 10, 18, 12);
        const ways = {
            'a guest back after a day': { save: () => shifted(raw, T - 24 * HOUR), report: true },
            'a gap of 2 hours in a running tab': { save: () => shifted(raw, T), gap: 2 * HOUR, report: true },
            'signed in, this copy kept': { save: () => shifted(raw, T - 24 * HOUR), report: true,
                api: () => serverApi({ remote: shifted(raw, T - 30 * HOUR), lastSaved: T - 30 * HOUR, delay: 300, now: () => T }) },
            "signed in, the server's game": { save: () => shifted(raw, T - 24 * HOUR), report: true,
                api: () => serverApi({ remote: played(3, T), lastSaved: T - 3 * HOUR, delay: 300, now: () => T }) }
        };
        const end = async (server, way) => {
            const { page, ctx, errors } = await open(server, { save: way.save(), clock: T, api: way.api?.() });
            let now = T;
            if (way.gap) {
                await page.waitForFunction(() => window.FI?.game && document.querySelector('#nav')?.children.length > 0, null, { timeout: WAIT_MS, polling: 200 });
                await page.evaluate(() => FI.closeModal());
                now = await page.evaluate(ms => window.__clock.add(ms), way.gap);
            }
            if (!(await reportUp(page))) errors.push('no report');
            await page.waitForTimeout(800);   // (a sync's upload goes out, nothing more is coming)
            const out = await page.evaluate(at => {
                const box = document.querySelector('.welcome-back')?.cloneNode(true);
                box?.querySelector('.wb-world')?.remove();   // (the strip after a day is new)
                return { save: FI.game().serialize(at), report: box?.textContent.replace(/\s+/g, ' ').trim(), replays: (window.__replays || []).filter(r => r.done).length };
            }, now);
            await ctx.close();
            return { ...out, save: JSON.parse(out.save), errors };
        };
        for (const [name, way] of Object.entries(ways)) {
            const a = await end(older, way);
            const b = await end(mine, way);
            const { fields, diffs } = compareFields(a.save, b.save);
            note(`same game, ${name}: ${fields} fields compared`, !diffs.length, diffs.slice(0, 5).join(' · '));
            note(`same report, ${name}`, a.report && a.report === b.report, a.report === b.report ? '' : `${a.report?.slice(0, 120)} // ${b.report?.slice(0, 120)}`);
            note(`one replay here (the older folder made ${a.replays}), ${name}`, b.replays === 1);
            noErrors(`same, ${name}`, [...a.errors, ...b.errors]);
        }
    }
};

/** Every leaf of two parsed saves, side by side: how many, and the paths that differ. */
function compareFields(a, b, path = '', out = { fields: 0, diffs: [] }) {
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compareFields(a[key], b[key], `${path}/${key}`, out);
        return out;
    }
    out.fields++;
    if (!Object.is(a, b)) out.diffs.push(`${path}: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
    return out;
}

for (const [name, flow] of Object.entries(FLOWS)) {
    if (!wanted(name)) continue;
    const t = Date.now();
    try { await flow(); } catch (err) { note(`${name}: it ran through`, false, err.message.split('\n')[0]); }
    console.log(`     (${name}: ${Math.round((Date.now() - t) / 1000)} s)`);
}
await browser.close();
mine.server.close();
older?.server.close();
console.log(failed ? `${failed} FAILED` : 'all ok');
process.exit(failed ? 1 : 0);
