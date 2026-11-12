// The boot of a guest back after a day, in Chromium (047's method): the hero's save in localStorage with every clock moved
// so it was saved `away` hours before, Google Fonts left out, a fresh context each run, plain and at Chrome's 4× CPU throttle.
// node bootbench.mjs <save.json> <rootA> [<rootB> ...] [--runs=3] [--rates=1,4] [--away=24] [--auto=on|off|keep]
// From navigation, in ms: first paint; modules in (the last /src/ module fetched); the bar (the catch-up's dialog first drawn,
// when there is one); the game drawn (the first frame after the sidebar fills); interactive (the first of the mouse moves sent
// every 50 ms after that the page handled within 50 ms); the longest task and the long tasks over 50 ms; frames drawn before
// the game was and the longest gap between two of them.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep, resolve } from 'node:path';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [savePath, ...roots] = args.filter(a => !a.startsWith('--')).map(p => resolve(p));
const RUNS = Number(opt.runs || 3);
const RATES = String(opt.rates || '1,4').split(',').map(Number);
const AWAY_H = Number(opt.away || 24);
// Playwright from the worktree's node_modules (--pw=<dir that holds it>, else the first tree's)
const { chromium } = createRequire(join(resolve(opt.pw || roots[0]), 'x.js'))('playwright');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
function serve(root) {
    const server = createServer(async (req, res) => {
        const path = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname)).replace(/^[/\\]+/, '');
        const file = join(root, path || 'index.html');
        if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
        try { res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file)); }
        catch { res.writeHead(404).end(); }
    });
    return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

/** Every clock in the save moved by the same amount, so that it was saved at `savedAt`. */
function shifted(raw, savedAt) {
    const s = structuredClone(raw);
    const delta = savedAt - s.meta.savedAt;
    const walk = o => {
        for (const [k, v] of Object.entries(o)) {
            if (v && typeof v === 'object') walk(v);
            else if (typeof v === 'number' && v > 0 && (/(At|Until)$/.test(k) || k === 'until' || k === 't')) o[k] = v + delta;
        }
    };
    walk(s);
    if (opt.auto === 'on') s.settings.autoPrestige = true;
    if (opt.auto === 'off') s.settings.autoPrestige = false;
    return s;
}

const raw = JSON.parse(await readFile(savePath, 'utf8'));
const servers = await Promise.all(roots.map(serve));
const browser = await chromium.launch();

async function run(url, rate) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    const save = JSON.stringify(shifted(raw, Date.now() - AWAY_H * 3600000));
    await ctx.addInitScript(([text]) => {
        try { localStorage.setItem('fantasyIdle.save.v2', text); localStorage.setItem('fantasyIdle.introSeen', '1'); } catch { /* */ }
        const m = (window.__bench = { frames: [], moves: [], longTasks: [], drawn: null, bar: null });
        try { new PerformanceObserver(list => { for (const e of list.getEntries()) m.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch { /* */ }
        const tick = t => {
            if (m.drawn === null) {
                m.frames.push(Math.round(t));
                if (m.bar === null && document.querySelector('.cu-bar')) m.bar = Math.round(t);
                if (document.querySelector('#nav')?.children.length) m.drawn = Math.round(t);
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        addEventListener('mousemove', e => m.moves.push([Math.round(e.timeStamp), Math.round(performance.now())]), true);
    }, [save]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    let moving = true;
    const mover = (async () => { let x = 10; while (moving) { await page.mouse.move(100 + (x++ % 50), 300).catch(() => {}); await new Promise(r => setTimeout(r, 50)); } })();
    await page.goto(url, { waitUntil: 'commit' });
    const until = Date.now() + 120000;
    let m = null;
    while (Date.now() < until) {
        m = await page.evaluate(() => {
            const b = window.__bench;
            const paint = performance.getEntriesByType('paint').find(e => e.name === 'first-paint');
            const mods = performance.getEntriesByType('resource').filter(e => e.name.includes('/src/')).map(e => e.responseEnd);
            const report = document.querySelector('.welcome-back');
            return { ...b, firstPaint: paint ? Math.round(paint.startTime) : null, modulesIn: mods.length ? Math.round(Math.max(...mods)) : null, report: !!report,
                away: report?.querySelector('.wb-away')?.textContent || '', story: report?.querySelector('.wb-story')?.textContent || '' };
        }).catch(() => null);
        if (m && m.drawn !== null && m.moves.some(([at, seen]) => at > m.drawn && seen - at < 50)) break;
        await new Promise(r => setTimeout(r, 200));
    }
    moving = false;
    await mover;
    await ctx.close();
    const interactive = m.moves.find(([at, seen]) => at > m.drawn && seen - at < 50)?.[1] ?? null;
    const longest = m.longTasks.reduce((a, [, d]) => Math.max(a, d), 0);
    const gaps = m.frames.slice(1).map((t, i) => t - m.frames[i]);
    return { firstPaint: m.firstPaint, modulesIn: m.modulesIn, bar: m.bar, drawn: m.drawn, interactive, longestTask: longest, longTasks: m.longTasks.length,
        framesBefore: m.frames.length, longestFrameGap: gaps.length ? Math.max(...gaps) : null, report: m.report, away: m.away, story: m.story, errors };
}

const results = [];
for (const rate of RATES) {
    for (let i = 0; i < RUNS; i++) {
        for (let r = 0; r < roots.length; r++) {   // the trees in turn, so the machine's load falls on each alike
            const out = await run(servers[r].url, rate);
            out.root = roots[r].split('/').pop(); out.rate = rate; out.run = i + 1;
            results.push(out);
            console.log(JSON.stringify(out));
        }
    }
}
await browser.close();
for (const s of servers) s.server.close();
const med = xs => { const v = xs.filter(x => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
for (const rate of RATES) for (const root of roots.map(r => r.split('/').pop())) {
    const rs = results.filter(x => x.rate === rate && x.root === root);
    const cell = k => `${med(rs.map(x => x[k]))} (${Math.min(...rs.map(x => x[k] ?? Infinity))}–${Math.max(...rs.map(x => x[k] ?? -Infinity))})`;
    console.log(`${rate}× ${root}: first paint ${cell('firstPaint')} · modules ${cell('modulesIn')} · bar ${cell('bar')} · longest task ${cell('longestTask')} · long tasks ${cell('longTasks')} · drawn ${cell('drawn')} · interactive ${cell('interactive')} · frames before ${cell('framesBefore')} · longest frame gap ${cell('longestFrameGap')}`);
}
