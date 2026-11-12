// One boot, with its timeline dumped: long tasks, frames, the /src/ modules, for the folder given.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep, resolve } from 'node:path';
const [savePath, rootArg, rate = '1'] = process.argv.slice(2);
const root = resolve(rootArg);
const { chromium } = createRequire(resolve('wt-boot-l2/x.js'))('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
    const file = join(root, path || 'index.html');
    try { res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const raw = JSON.parse(await readFile(savePath, 'utf8'));
const delta = Date.now() - 24 * 3600000 - raw.meta.savedAt;
const walk = o => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v); else if (typeof v === 'number' && v > 0 && (/(At|Until)$/.test(k) || k === 'until' || k === 't')) o[k] = v + delta; } };
walk(raw);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await ctx.addInitScript(([text]) => {
    localStorage.setItem('fantasyIdle.save.v2', text);
    const m = (window.__p = { frames: [], lt: [], nav: null, mainStart: null });
    new PerformanceObserver(l => { for (const e of l.getEntries()) m.lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true });
    const tick = t => { m.frames.push(Math.round(t)); if (m.nav === null && document.querySelector('#nav')?.children.length) m.nav = Math.round(t); if (m.frames.length < 2000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
}, [JSON.stringify(raw)]);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__p?.nav !== null, null, { timeout: 120000, polling: 250 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
    const p = window.__p;
    const res = performance.getEntriesByType('resource').filter(e => e.name.includes('/src/')).map(e => [e.name.split('/src/')[1], Math.round(e.startTime), Math.round(e.responseEnd)]).sort((a, b) => a[2] - b[2]);
    const gaps = p.frames.slice(1).map((t, i) => [p.frames[i], t - p.frames[i]]).filter(([, g]) => g > 60);
    return { nav: p.nav, lt: p.lt, gaps, firstFrames: p.frames.slice(0, 5), frames: p.frames.length, lastModules: res.slice(-4), modules: res.length, fcp: performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)]) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
