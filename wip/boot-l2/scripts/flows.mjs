// The return's flows in Chromium, against a folder of the game: a guest back after a day (the bar, then the report), a
// signed-in player whose server answers fast, slowly, or with another device's game, and a tab that was hidden for a gap.
// node flows.mjs <game folder> <save.json>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
const [rootArg, savePath] = process.argv.slice(2);
const root = resolve(rootArg);
const { chromium } = createRequire(resolve('wt-boot-l2/x.js'))('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
    const file = join(root, path || 'index.html');
    try { res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;
const raw = JSON.parse(await readFile(savePath, 'utf8'));
function aged(save, hours) {
    const s = structuredClone(save);
    const delta = Date.now() - hours * 3600000 - s.meta.savedAt;
    const walk = o => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v); else if (typeof v === 'number' && v > 0 && (/(At|Until)$/.test(k) || k === 'until' || k === 't')) o[k] = v + delta; } };
    walk(s);
    return s;
}
const FAKE_TOKEN = `x.${Buffer.from(JSON.stringify({ id: 1, username: 'Tester' })).toString('base64url')}.x`;
const browser = await chromium.launch();
const results = [];
const note = (name, ok, detail = '') => { results.push([name, ok]); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

/** A page with the save in storage (and signed in, with `api` answering /api), at Chrome's CPU throttle `rate`. */
async function open({ save, api = null, rate = 1 }) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([text, token]) => {
        localStorage.setItem('fantasyIdle.save.v2', text);
        if (token) localStorage.setItem('fantasyIdle.jwt', token);
        window.__seen = { bars: 0, reports: 0, waiting: 0 };
        new MutationObserver(() => {
            if (document.querySelector('.cu-bar') && !window.__barUp) { window.__barUp = true; window.__seen.bars++; }
            if (!document.querySelector('.cu-bar')) window.__barUp = false;
            if (document.querySelector('.cu-bar.waiting')) window.__seen.waiting = 1;
            if (document.querySelector('.welcome-back') && !window.__reportUp) { window.__reportUp = true; window.__seen.reports++; window.__seen.story = document.querySelector('.wb-story')?.textContent; }
            if (!document.querySelector('.welcome-back')) window.__reportUp = false;
        }).observe(document, { subtree: true, childList: true, attributes: true });
    }, [JSON.stringify(save), api ? FAKE_TOKEN : null]);
    const calls = [];
    if (api) await ctx.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        calls.push(path);
        const answer = await api(path, route.request());
        if (!answer) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        if (answer.delay) await new Promise(r => setTimeout(r, answer.delay));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer.body) });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('fonts')) errors.push(m.text()); });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    return { page, ctx, calls, errors };
}
const seen = page => page.evaluate(() => ({ ...window.__seen, report: !!document.querySelector('.welcome-back'), bar: !!document.querySelector('.cu-bar'), modal: document.querySelector('#modal-root .modal-overlay:last-child .modal-header')?.textContent || '' }));
const waitReport = page => page.waitForSelector('.welcome-back', { timeout: 90000 }).then(() => true).catch(() => false);

// 1. A guest back after a day, at 4×: the bar comes, the report takes its place, the game is drawn
{
    const { page, ctx, errors } = await open({ save: aged(raw, 24), rate: 4 });
    const bar = await page.waitForSelector('.cu-bar:not(.waiting)', { timeout: 20000 }).then(() => true).catch(() => false);
    const mid = await page.evaluate(() => ({ text: document.querySelector('.cu-time')?.textContent, facts: document.querySelector('.cu-facts')?.textContent, inert: document.getElementById('app').inert, modal: true }));
    const got = await waitReport(page);
    const after = await seen(page);
    const drawn = await page.evaluate(() => document.querySelector('#nav')?.children.length > 0 && !document.getElementById('app').inert);
    note('a guest a day away: the bar shows mid-replay', bar && /of 24h 0m/.test(mid.text || '') && /Stage/.test(mid.facts || '') && mid.inert, JSON.stringify(mid));
    note('then the report in its place, once, and the game drawn', got && after.reports === 1 && !after.bar && drawn, JSON.stringify(after));
    note('no page errors (guest)', errors.length === 0, errors.join(' | '));
    await ctx.close();
}

// 2. Signed in, the server answers in a second with no save of its own: this copy is replayed once, then uploaded
{
    const uploads = [];
    const api = async (path, req) => {
        if (path === '/load') return { delay: 1000, body: { state: null, serverNow: Date.now(), gifts: 0, banner: null, hall: null, hallGifts: [] } };
        if (path === '/save') { uploads.push(JSON.parse(req.postData() || '{}')); return { body: { success: true, timestamp: Date.now(), gifts: 0, banner: null, hall: null, hallGifts: [] } }; }
        return { body: {} };
    };
    const { page, ctx, errors } = await open({ save: aged(raw, 24), api });
    const got = await waitReport(page);
    await page.waitForTimeout(1500);
    const s = await seen(page);
    const savedAt = uploads[0]?.state?.meta?.savedAt;
    note('signed in, server answers: waits, replays once, reports once', got && s.reports === 1 && s.bars <= 1 && s.waiting === 1, JSON.stringify(s));
    note('and the upload after the replay carries the time away replayed', uploads.length >= 1 && Math.abs(Date.now() - savedAt) < 60000, `uploads ${uploads.length}, savedAt ${savedAt ? Math.round((Date.now() - savedAt) / 1000) : '?'} s ago`);
    note('no page errors (signed in)', errors.length === 0, errors.join(' | '));
    await ctx.close();
}

// 3. Signed in, the server slow (6 s): after 4 s this copy plays; the late answer is looked at after its replay
{
    const uploads = [];
    const api = async (path, req) => {
        if (path === '/load') return { delay: 6000, body: { state: null, serverNow: Date.now(), gifts: 0, banner: null, hall: null, hallGifts: [] } };
        if (path === '/save') { uploads.push(1); return { body: { success: true, timestamp: Date.now(), gifts: 0 } }; }
        return { body: {} };
    };
    const t0 = Date.now();
    const { page, ctx, errors } = await open({ save: aged(raw, 24), api });
    const got = await waitReport(page);
    const at = Date.now() - t0;
    await page.waitForTimeout(4000);
    const s = await seen(page);
    note('signed in, server slow: this copy plays after the wait, one report', got && s.reports === 1 && at >= 4000, `report after ${at} ms, ${JSON.stringify(s)}`);
    note('and the late answer still ends in an upload', uploads.length >= 1, `uploads ${uploads.length}`);
    note('no page errors (slow server)', errors.length === 0, errors.join(' | '));
    await ctx.close();
}

// 4. Signed in, another device played: the server's game wins, and only it is replayed (its own 3 hours away)
{
    const remote = aged(raw, 3);
    remote.stats.kills += 100000; remote.combat.bestStage += 5;   // played further on another device
    const lastSaved = Date.now() - 3 * 3600000;
    const api = async path => {
        if (path === '/load') return { delay: 800, body: { state: remote, lastSaved, serverNow: Date.now(), gifts: 0, banner: null, hall: null, hallGifts: [] } };
        if (path === '/save') return { body: { success: true, timestamp: Date.now(), gifts: 0 } };
        return { body: {} };
    };
    const { page, ctx, errors } = await open({ save: aged(raw, 24), api });
    const got = await waitReport(page);
    await page.waitForTimeout(1000);
    const s = await seen(page);
    const away = await page.evaluate(() => document.querySelector('.wb-away')?.textContent || '');
    note("another device's game: one replay, of the server's 3 hours", got && s.reports === 1 && /3h/.test(away), `${away}; ${JSON.stringify(s)}`);
    note('no page errors (cloud wins)', errors.length === 0, errors.join(' | '));
    await ctx.close();
}

// 5. A tab hidden while its game was paused 37 minutes: no report; once in view, a toast says what it did
// 6. The same for 2 hours: the report once in view; 7. a page in view through the gap (the machine slept): the report
for (const [name, minutes, hidden] of [['a hidden tab paused 37 minutes', 37, true], ['a hidden tab paused 2 hours', 120, true], ['a page in view, the machine asleep 37 minutes', 37, false]]) {
    const { page, ctx, errors } = await open({ save: aged(raw, 0) });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { document.querySelector('#modal-root .modal-btn.btn-confirm')?.click(); });
    await page.evaluate(([mins, hide]) => {
        const real = Date.now.bind(Date);
        window.__shift = 0;
        Date.now = () => real() + window.__shift;
        if (hide) { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }
        window.__shift = mins * 60000;   // the browser paused the page (or the machine slept): the next tick finds the gap
    }, [minutes, hidden]);
    await page.waitForTimeout(6000);
    const whileHidden = await seen(page);
    if (hidden) await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(600);
    const toast = await page.evaluate(() => [...document.querySelectorAll('#toast-area .toast')].map(t => t.textContent).join(' | '));
    const s = await seen(page);
    if (hidden && minutes < 60) note(`${name}: no report hidden, a toast in view`, !whileHidden.report && !s.report && /in the background/.test(toast), `toast "${toast}"; ${JSON.stringify(s)}`);
    else if (hidden) note(`${name}: no report hidden, the report in view`, !whileHidden.report && s.report, JSON.stringify({ whileHidden, s }));
    else note(`${name}: the report`, s.report && !/in the background/.test(toast), JSON.stringify(s));
    note(`no page errors (${name})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
}

await browser.close(); server.close();
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed ? `${failed} FAILED` : 'all ok');
