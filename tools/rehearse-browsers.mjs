#!/usr/bin/env node
// The rehearsal's part that needs real browsers (deploy/vps/rehearse.sh is the server's part), run on the owner's Mac against
// staging through its private link (the file below, never printed, nor the cookie it gives, nor anything that holds them):
//
//   node tools/rehearse-browsers.mjs                       # Chromium, WebKit and the installed Firefox, at 1280 and 390 px
//   node tools/rehearse-browsers.mjs --browsers chromium   # some of them
//   node tools/rehearse-browsers.mjs --no-browsers         # the headers and the API's origins only
//   node tools/rehearse-browsers.mjs --local               # against a stand-in for staging on this machine: the game's files, its
//                                                          # gate and headers (deploy/vps/nginx-staging.conf), the API on its
//                                                          # in-memory store. For trying this tool without touching staging.
//
// It reads back the HSTS and frame headers, sees that the gate shuts out a browser without its cookie and that the API won't
// answer another site's page, then in each browser and width it starts as a guest (`?play`), plays a few seconds, and fails on
// a page error or sideways scroll. Exit 0 all well, 1 a check failed, 2 it could not run.
// Needs Playwright, once: npm i --no-save playwright && npx playwright install chromium webkit  (Firefox: the installed one).

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const LINK_FILE = join(homedir(), '.config', 'fantasyidle', 'staging-link.txt');
const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
const FOREIGN_ORIGIN = 'https://stranger.example';
const HSTS_AT_LEAST = 31536000;   // a year (deploy/vps/nginx-staging.conf)

const options = () => parseArgs({ options: { browsers: { type: 'string', default: 'chromium,webkit,firefox' }, 'no-browsers': { type: 'boolean' },
    local: { type: 'boolean' }, 'link-file': { type: 'string' }, seconds: { type: 'string', default: '6' } } }).values;

// ---------- what is printed never holds the link or the cookie ----------

let secrets = [];
const scrub = text => secrets.reduce((t, s) => t.split(s).join('<private>'), String(text));
const say = line => console.log(scrub(line));
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; say(`${ok ? 'ok  ' : 'FAIL'} ${what}`); return ok; };

// ---------- staging, or the stand-in for it ----------

/** The Content-Security-Policy deploy/vps/nginx-staging.conf sends: what the header must read. */
function policy() {
    const conf = readFileSync(join(ROOT, 'deploy/vps/nginx-staging.conf'), 'utf8');
    return /Content-Security-Policy "([^"]+)"/.exec(conf)[1].replace(/\s+/g, ' ').trim();
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };

/** A stand-in for staging on this machine, as its nginx answers: the gate, its cookie, the headers, the files and the API. */
export async function startStandIn(gate) {
    process.env.JWT_SECRET ||= 'stand-in-only';
    const { createMemoryStore } = require('../test/helpers/memory-store.cjs');
    const storePath = require.resolve('../api/store.js');
    require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, exports: createMemoryStore() };
    const api = require('../api/index.js');
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, 'http://stand-in');
        if (url.pathname === `/__staging/${gate}`) {
            res.writeHead(302, { 'set-cookie': `fi_staging=${gate}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`, location: '/' });
            return res.end();
        }
        if (!(req.headers.cookie || '').split(/;\s*/).includes(`fi_staging=${gate}`)) { res.writeHead(404); return res.end(); }
        res.setHeader('Strict-Transport-Security', `max-age=${HSTS_AT_LEAST}`);
        res.setHeader('Content-Security-Policy', policy());
        if (url.pathname.startsWith('/api/')) return api(req, res);
        const path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '') || 'index.html';
        const file = join(ROOT, path);
        if (!file.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
        try {
            const body = await readFile(file);
            res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return { server, link: `http://127.0.0.1:${server.address().port}/__staging/${gate}` };
}

// ---------- headers and origins, without a browser ----------

const hstsAge = value => Number(/max-age=(\d+)/i.exec(value || '')?.[1] || 0);

/** The gate's cookie, from opening the link the way a browser does (no redirect followed): 'name=value', or null. */
async function openGate(link) {
    const res = await fetch(link, { redirect: 'manual' });
    const cookie = (res.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).find(c => c.startsWith('fi_staging='));
    return res.status >= 300 && res.status < 400 && cookie ? cookie : null;
}

async function checkHeaders(origin, cookie) {
    const get = (path, headers = {}, method = 'GET') => fetch(origin + path, { method, redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...headers } });
    check((await fetch(origin + '/', { redirect: 'manual' })).status === 404, 'without the private link, staging answers nothing');
    for (const [label, path] of [['the game', '/'], ['the API', '/api/health']]) {
        const res = await get(path);
        check(res.ok, `${label} answers (${res.status})`);
        check(hstsAge(res.headers.get('strict-transport-security')) >= HSTS_AT_LEAST, `${label}: HSTS for at least a year`);
        check((res.headers.get('content-security-policy') || '').replace(/\s+/g, ' ').trim() === policy(), `${label}: the frame rules are nginx-staging.conf's`);
        check(!res.headers.get('x-frame-options'), `${label}: no X-Frame-Options to overrule them`);
    }
    const allowed = async o => (await get('/api/health', { origin: o })).headers.get('access-control-allow-origin');
    check(await allowed(origin) === origin, 'the API answers the game\'s own origin');
    check(await allowed(FOREIGN_ORIGIN) === null, 'the API gives another site no access');
    const preflight = await get('/api/save', { origin: FOREIGN_ORIGIN, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' }, 'OPTIONS');
    check(preflight.headers.get('access-control-allow-origin') === null, 'an upload from another site is never sent');
}

// ---------- the browsers ----------

const ENGINES = {
    chromium: e => e.chromium.launch({ timeout: 150000 }),
    webkit: e => e.webkit.launch({ timeout: 150000 }),
    firefox: e => e.firefox.launch({ channel: 'moz-firefox', headless: true, timeout: 150000 })   // the installed one (Playwright's own doesn't start on this Mac)
};

async function playAsGuest(browser, cookie, origin, viewport, seconds) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    // (the gate's cookie as the link gives it; the link itself would open the game once, and a new player's title card with it)
    const [name, ...value] = cookie.split('=');
    await context.addCookies([{ name, value: value.join('='), url: `${origin}/`, httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'Lax' }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !(m.location()?.url || '').includes('/api/')) errors.push(m.text()); });
    try {
        await page.goto(`${origin}/?play`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.intro-go', { timeout: 45000 });
        const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        let over = await sideways();
        await page.click('.intro-go');
        await page.waitForTimeout(seconds * 1000);
        over = Math.max(over, await sideways());
        const hero = await page.evaluate(() => { const s = window.FI?.game?.()?.state; return s ? { fighting: !!s.combat?.active, kills: s.stats?.kills || 0 } : null; });
        return { errors, over, hero };
    } finally { await context.close().catch(() => {}); }
}

async function runBrowsers(cookie, origin, names, seconds) {
    let playwright;
    try { playwright = require('playwright'); } catch { check(false, 'Playwright is missing: npm i --no-save playwright && npx playwright install chromium webkit'); return; }
    for (const name of names) {
        if (!ENGINES[name]) { check(false, `${name}: not a browser this knows`); continue; }
        let browser;
        try { browser = await ENGINES[name](playwright); } catch (err) { check(false, `${name} did not start: ${err.name}`); continue; }
        for (const viewport of VIEWPORTS) {
            const label = `${name} at ${viewport.width} px`;
            try {
                const { errors, over, hero } = await playAsGuest(browser, cookie, origin, viewport, seconds);
                check(!!hero?.fighting, `${label}: a guest's fight is on${hero ? ` (${hero.kills} ${hero.kills === 1 ? 'kill' : 'kills'} in ${seconds} s)` : ''}`);
                check(over <= 0, `${label}: no sideways scroll${over > 0 ? ` (${over} px over)` : ''}`);
                check(!errors.length, `${label}: no page errors${errors.length ? `: ${errors.length}, the first: ${errors[0].slice(0, 200)}` : ''}`);
            } catch (err) { check(false, `${label}: the game did not play (${err.name})`); }
        }
        await browser.close().catch(() => {});
    }
}

// ---------- the run ----------

async function main() {
    const args = options();
    const gate = process.env.REHEARSE_STAND_IN_GATE || randomBytes(16).toString('hex');
    const standIn = args.local ? await startStandIn(gate) : null;
    const link = standIn ? standIn.link : readFileSync(args['link-file'] || LINK_FILE, 'utf8').trim();
    const url = new URL(link);
    secrets = [link, url.pathname.split('/').filter(Boolean).pop(), url.pathname].filter(s => s && s.length >= 6);
    const origin = url.origin;
    say(standIn ? 'against the stand-in for staging on this machine' : 'against staging');
    const cookie = await openGate(link);
    if (!check(!!cookie, 'the private link opens staging')) return 1;
    secrets.push(cookie, cookie.split('=')[1]);
    await checkHeaders(origin, cookie);
    if (!args['no-browsers']) await runBrowsers(cookie, origin, args.browsers.split(',').filter(Boolean), Number(args.seconds) || 6);
    standIn?.server.close();
    say(failures ? `${failures} failed` : 'all well');
    return failures ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().then(code => process.exit(code), err => { say(`could not run: ${err?.name || 'Error'}`); process.exit(2); });
}
