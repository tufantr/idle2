#!/usr/bin/env node
// The boot of a guest back after a day, in Chromium (docs/research_notes/research-loop/047 §3's method): a hero's save in
// localStorage with every clock in it moved so that it was saved `--away` hours before, Google Fonts left out, a fresh
// context each run, plain and at Chrome's 4× CPU throttle (CDP Emulation.setCPUThrottlingRate). Heroes come from
// tools/simulate.mjs --save-at. Several game folders (this one by default, a copy of an older commit beside it) are served
// and run in turn, so the machine's load falls on each alike.
//
//   node tools/bootbench.mjs runs/hero-1300.json [<game folder> ...] [--runs=3] [--rates=1,4] [--away=24] [--auto=on|off]
//
// Each run, in ms from navigation: first paint; modules in (the last /src/ module fetched); the bar (the catch-up's dialog
// first drawn, src/main.js catchUp), how many times it moved and the longest it stood still while up; the game drawn (the
// first frame after the sidebar fills); interactive (the first of the mouse moves sent every 50 ms after that which the page
// handled within 50 ms); the longest task and the count over 50 ms; the frames drawn before the game was, and the longest
// gap between two of them. Then the medians and ranges. Needs Playwright, as tools/shots.mjs does.
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumOrExit, serve, shifted } from './bootlib.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [savePath, ...given] = args.filter(a => !a.startsWith('--')).map(p => resolve(p));
const roots = given.length ? given : [ROOT];
if (!savePath) { console.error('Usage: node tools/bootbench.mjs <save.json> [<game folder> ...] [--runs=3] [--rates=1,4] [--away=24] [--auto=on|off]'); process.exit(2); }
const RUNS = Number(opt.runs || 3);
const RATES = String(opt.rates || '1,4').split(',').map(Number);
const AWAY_H = Number(opt.away || 24);
const chromium = chromiumOrExit();
const auto = opt.auto === 'on' ? true : opt.auto === 'off' ? false : undefined;

const raw = JSON.parse(await readFile(savePath, 'utf8'));
const servers = await Promise.all(roots.map(root => serve(root)));
const browser = await chromium.launch();

async function run(url, rate) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    const save = JSON.stringify(shifted(raw, Date.now() - AWAY_H * 3600000, { auto }));
    await ctx.addInitScript(([text]) => {
        try { localStorage.setItem('fantasyIdle.save.v2', text); localStorage.setItem('fantasyIdle.introSeen', '1'); } catch { /* */ }
        const m = (window.__bench = { frames: [], moves: [], longTasks: [], drawn: null, bar: null, barMoves: [], slices: 0, sliceMs: 0 });
        // the catch-up's slices (src/main.js pump, on a MessageChannel): how many, and the time spent in them
        const port = Object.getOwnPropertyDescriptor(MessagePort.prototype, 'onmessage');
        Object.defineProperty(MessagePort.prototype, 'onmessage', {
            configurable: true, get() { return port.get.call(this); },
            set(fn) { port.set.call(this, function (e) { const t = performance.now(); try { return fn.call(this, e); } finally { m.slices++; m.sliceMs += performance.now() - t; } }); }
        });
        try { new PerformanceObserver(list => { for (const e of list.getEntries()) m.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch { /* */ }
        // (the clock as each frame's callback runs: a frame held up by a long task is handed the time it was due)
        const tick = () => {
            const t = Math.round(performance.now());
            if (m.drawn === null) {
                m.frames.push(t);
                const bar = document.querySelector('.cu-bar');
                if (m.bar === null && bar) m.bar = t;
                const shown = bar && !bar.classList.contains('waiting') ? Number(bar.getAttribute('aria-valuenow')) : null;
                if (shown !== null && shown !== m.barMoves[m.barMoves.length - 1]?.[1]) m.barMoves.push([t, shown]);   // [when, its percent]
                if (document.querySelector('#nav')?.children.length) m.drawn = t;
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
    if (!m || m.drawn === null) return { error: 'the game was not drawn within two minutes', errors };
    const interactive = m.moves.find(([at, seen]) => at > m.drawn && seen - at < 50)?.[1] ?? null;
    const longest = m.longTasks.reduce((a, [, d]) => Math.max(a, d), 0);
    const gaps = m.frames.slice(1).map((t, i) => t - m.frames[i]);
    const stills = m.barMoves.slice(1).map(([t], i) => t - m.barMoves[i][0]);
    return { firstPaint: m.firstPaint, modulesIn: m.modulesIn, bar: m.bar, barMoves: m.barMoves.length, barStill: stills.length ? Math.max(...stills) : null,
        barEnd: m.barMoves.length ? m.barMoves[m.barMoves.length - 1][1] : null, drawn: m.drawn, interactive, longestTask: longest, longTasks: m.longTasks.length,
        slices: m.slices, sliceMs: Math.round(m.sliceMs),
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
    console.log(`${rate}× ${root}: first paint ${cell('firstPaint')} · modules ${cell('modulesIn')} · bar ${cell('bar')}, moved ${cell('barMoves')} times, still at most ${cell('barStill')} · longest task ${cell('longestTask')} · long tasks ${cell('longTasks')} · drawn ${cell('drawn')} · interactive ${cell('interactive')} · frames before ${cell('framesBefore')} · longest frame gap ${cell('longestFrameGap')} · slices ${cell('slices')} in ${cell('sliceMs')}`);
}
