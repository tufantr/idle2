#!/usr/bin/env node
// Coming back, checked in Chromium (DESIGN §3.16): what a unit test can't reach of the replay of time away (src/main.js
// catchUp) and of what follows it. A guest back after a day; a signed-in player whose server answers fast, late, or with another
// device's game; a page reloaded in the middle of the replay; a tab hidden for a gap; the report's strip of the world. Each
// check prints ok or FAIL, and the tool exits 1 on any FAIL.
//
//   node tools/bootcheck.mjs runs/hero-1300.json [--against=<an older game folder>] [--only=guest,slow,...] [--rate=4]
//
// The hero comes from tools/simulate.mjs --save-at: deep, with Auto prestige, so that his replay lasts. The flows: guest, fast,
// firsttap, slow, server, lateserver, reload, hidden, strip, and with --against, same: the four ways back (a guest's boot, a gap in a running tab, signed
// in with this copy kept or with the server's game) in both folders from one save, one clock and one seed, the games they
// end in compared field by field. The dice are seeded as each replay begins, so a replay made first and thrown away
// (the older boot's, signed in) changes nothing. Needs Playwright, as tools/shots.mjs does.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromiumOrExit, serve, shifted } from './bootlib.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [savePath] = args.filter(a => !a.startsWith('--')).map(p => resolve(p));
if (!savePath) { console.error('Usage: node tools/bootcheck.mjs <save.json> [--against=<older game folder>] [--only=guest,fast,...] [--rate=4]'); process.exit(2); }
const RATE = Number(opt.rate || 4);
const only = opt.only ? new Set(String(opt.only).split(',')) : null;
const wanted = name => !only || only.has(name);
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
const chromium = chromiumOrExit();
const browser = await chromium.launch();
const mine = await serve(ROOT, patch);
const older = opt.against ? await serve(resolve(String(opt.against)), patch) : null;

let failed = 0;
function note(name, ok, detail = '') {
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
}

/** A page of `server`, the save in its storage (once: a reload finds what the game left there), signed in when `api` answers. */
async function open(server, { save, api = null, rate = 1, clock = null }) {
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
    }, [JSON.stringify(save), api ? TOKEN : null, clock]);
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
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(server.url, { waitUntil: 'commit' });
    return { page, ctx, calls, errors, cdp };
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
    },

    /** A tab hidden while the browser paused it: nothing opens unseen; once in view a line, or from an hour on the report. */
    async hidden() {
        const setHidden = (page, on) => page.evaluate(v => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => v }); document.dispatchEvent(new Event('visibilitychange')); }, on);
        const toasts = page => page.evaluate(() => [...document.querySelectorAll('#toast-area .toast')].map(t => t.textContent).join(' | '));
        for (const [name, minutes, hide, told] of [['a hidden tab paused 37 minutes', 37, true, 'toast'], ['a hidden tab paused 2 hours', 120, true, 'report'],
            ['a page in view, the machine asleep 37 minutes', 37, false, 'report']]) {
            const T = Date.now();
            const { page, ctx, errors } = await open(mine, { save: shifted(raw, T), clock: T });
            await page.waitForFunction(() => window.FI?.game && document.querySelector('#nav')?.children.length > 0, null, { timeout: WAIT_MS, polling: 200 });
            if (hide) await setHidden(page, true);
            await page.evaluate(ms => window.__clock.add(ms), minutes * 60000);
            await page.waitForFunction(() => (window.__replays || []).some(r => r.done), null, { timeout: WAIT_MS, polling: 200 });
            await page.waitForTimeout(800);
            const unseen = await seen(page);
            if (hide) {
                note(`${name}: nothing opens while it is hidden`, !unseen.report && !(await toasts(page)).includes('in the background'), JSON.stringify({ report: unseen.report }));
                await setHidden(page, false);
                await page.waitForTimeout(700);
            }
            const s = await seen(page);
            const line = await toasts(page);
            if (told === 'toast') note(`${name}: a line in view, no report`, !s.report && /in the background/.test(line), line);
            else note(`${name}: the report`, s.report && s.reports === 1 && !/in the background/.test(line), JSON.stringify({ reports: s.reports, away: s.away }));
            note(`${name}: one replay`, s.replays.length === 1);
            noErrors(name, errors);
            await ctx.close();
        }
    },

    /** The report after a day: the strip names the clan's week, what else the hero has met; a tap on the clan's goes there. */
    async strip() {
        const { isoWeek } = await import(pathToFileURL(join(ROOT, 'src/data/social.js')));
        const save = aged(24);
        Object.assign(save.unlocks, { clan: true, events: true });
        const api = async path => {
            if (path === '/load') return { delay: 300, body: { state: null, lastSaved: 0, serverNow: Date.now(), gifts: 0, banner: { week: isoWeek(Date.now()), kills: 3 },
                hall: { clan: 7, rooms: { forge: 30500 }, stage: 1, colour: 'forest', emblem: 'troll', cloak: false }, hallGifts: [] } };
            if (path === '/save') return { body: { success: true, timestamp: Date.now(), gifts: 0 } };
            if (path === '/leaderboard') return { body: { entries: [], optIn: false, label: 'Best stage', period: 'all' } };
            if (path === '/rewards') return { body: { rewards: [] } };
            return { body: { clan: null, clans: [] } };
        };
        const { page, ctx, errors } = await open(mine, { save, api });
        const got = await reportUp(page);
        await page.waitForTimeout(600);
        const lines = await page.evaluate(() => [...document.querySelectorAll('.welcome-back .wb-world-line')].map(l => l.textContent.replace(/\s+/g, ' ').trim()));
        note('the strip: under the report, the clan\'s week as the server says it', got && lines.some(l => /Your clan felled 3 of 7 levels/.test(l)), lines.join(' / '));
        note('the strip: the week\'s Trial, the hero having met the Trials', lines.some(l => /This week's Trial/.test(l)));
        const order = await page.evaluate(() => { const b = document.querySelector('.welcome-back'); return { world: !!b.querySelector('.wb-world'), last: b.querySelector('.modal-footer')?.previousElementSibling?.className || '' }; });
        note('the strip: last before Collect', order.world && /wb-world/.test(order.last), order.last);
        await page.evaluate(() => [...document.querySelectorAll('.welcome-back button.wb-world-line')].find(b => /clan/i.test(b.textContent))?.click());
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => ({ report: !!document.querySelector('.welcome-back'), active: document.querySelector('#nav .nav-btn.active')?.textContent || '' }));
        note('the strip: a tap on the clan\'s line goes to the Clan tab', !after.report && /clan/i.test(after.active), JSON.stringify(after));
        noErrors('the strip', errors);
        await ctx.close();
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
            delete a.save.seen?.reentry; delete b.save.seen?.reentry;   // (the strip's own disclosure, new here)
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
