#!/usr/bin/env node
// The top bar must not change height while the game is played (docs/DESIGN.md §3.23). This sweeps the window's width and
// plays what happens under a player's hand at each one: the bonfire's countdown through its forms, the buff and the Focus
// pill coming and going, the gold (and the other figures) gaining a digit, the crate ripening, work starting and stopping.
// It fails if the bar's height changes, if the buff or the Focus pill is cut off, or if the page scrolls sideways. Three
// heroes (all six coins and a crate, four coins, a new hero's gold), on a tab and in the fight that fills the screen.
//
//   node tools/topbar.mjs                                     # Chromium, Firefox and WebKit, 700 to 2,000 px
//   node tools/topbar.mjs --browsers=firefox --step=1         # one browser, every width
//   node tools/topbar.mjs --from=1200 --to=1300 --step=1 --heroes=late --views=fight
//   node tools/topbar.mjs --root=<a copy of the game>         # another copy (an older one should fail)
//
// Needs Playwright with its browsers (see tools/shots.mjs). Firefox is the installed one (channel moz-firefox), then
// Playwright's own: that one doesn't start on every Mac.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = join(dirname(fileURLToPath(import.meta.url)), '..');
const option = (name, fallback) => process.argv.slice(2).find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const ROOT = resolve(option('root', HERE));
const FROM = Number(option('from', 700));
const TO = Number(option('to', 2000));
const STEP = Math.max(1, Number(option('step', 4)));
const BROWSERS = option('browsers', 'chromium,firefox,webkit').split(',');
const HEROES = option('heroes', 'late,mid,new').split(',');
const VIEWS = option('views', 'page,fight').split(',');
const HEIGHT = 900;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

let playwright;
try { playwright = createRequire(join(HERE, 'tools', 'shots.mjs'))('playwright'); } catch {
    console.error('Playwright is missing. Once: npm i --no-save playwright && npx playwright install chromium firefox webkit');
    process.exit(2);
}

// The game is ES modules, which need HTTP and the right content types: a small static server.
const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname)).replace(/^[/\\]+/, '');
    const file = join(ROOT, path || 'index.html');
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
    try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;

/** In the page: the game stood still, and what the sweep does at each width (`__bar`). */
function install() {
    const g = FI.game();
    const s = g.state;
    FI.closeModal();
    g.tick = () => null;                  // nothing moves but what the sweep moves
    s.settings.reducedMotion = true;      // the purse shows a new figure at once
    s.settings.devUnlockAll = false;      // the purse is the hero's own
    s.unlocks.events = true;
    const COINS = ['essence', 'tokens', 'stars', 'skill_points', 'talents'];
    const HEROES = {
        late: { coins: COINS, crate: 1 },
        mid: { coins: ['essence', 'tokens', 'skill_points'], crate: 0 },
        new: { coins: [], crate: 0 }
    };
    const FORMS = [[3660, '1h 1m'], [3599, '59m 59s'], [3111, '51m 51s'], [600, '10m 0s'], [599, '9m 59s'], [111, '1m 51s'], [59, '59s'], [9, '9s']];
    const GOLD = [9, 10, 99, 100, 999, 1000, 9999, 10000, 99999, 100000, 999999, 1e6, 9.99e6, 1e7, 1e8, 1e9, 1e12, 1e15];
    const bar = document.getElementById('header');
    const draw = () => FI.battleFull(true);   // (draws the whole page, at once)
    const fire = seconds => { s.bonfire.until = seconds ? g.now + seconds * 1000 : 0; g.recompute(); };
    const focus = on => { s.meta.lastInputAt = on ? g.now - 600000 : g.now; g.recompute(); };
    const fighting = () => s.combat.active;
    let hero = HEROES.late;

    /** The window has reached `width` and the bar is laid out for it (ui/topbar.js waits for the page to settle). */
    async function settle(width) {
        for (let i = 0; i < 600; i++) {
            await new Promise(requestAnimationFrame);
            if (innerWidth !== width) continue;
            draw();
            const shape = `${innerWidth}|${document.body.classList.contains('battle-full')}|${bar.querySelectorAll('.chip').length}`;
            if (bar.dataset.heldFor === shape) return true;
            if (i > 3 && !bar.dataset.fold) return true;   // (a copy of the game from before the hold)
        }
        return false;
    }

    window.__bar = {
        hero(name) {
            hero = HEROES[name];
            for (const id of COINS) s.seen[id] = hero.coins.includes(id);
            s.resources.essence = 3200; s.prestige.tokens = 420; s.prestige.skillPoints = 2; s.ascension.stars = 12;
            s.daily.banked = hero.crate; s.gold = 0;
            s.bonfire.until = 0;
            g.stopAction();
            s.settings.forceEvent = '';
            g.recompute();
        },
        view(name) {
            if (name === 'fight') { FI.switchTab('combat'); if (!fighting()) FI.toggleCombat(); FI.battleFull(true); }
            else { if (fighting()) FI.toggleCombat(); FI.switchTab('inventory'); }
        },
        settle,
        /** Everything at this width: returns the bar's height, what moved it, what cut a pill off. */
        run() {
            const result = { height: 0, moved: [], cut: [], sideways: 0, pills: 0, misread: [] };
            const height = () => bar.getBoundingClientRect().height;
            const slot = () => bar.querySelector('.pills');
            const isCut = pill => {
                const p = pill.getBoundingClientRect();
                const room = slot().getBoundingClientRect();
                const edge = bar.getBoundingClientRect();
                return p.right > Math.min(room.right, edge.right) + 0.5 || p.left < room.left - 0.5 || pill.scrollWidth > pill.clientWidth + 1;
            };
            const look = what => {
                draw();
                const now = height();
                if (Math.abs(now - result.height) > 0.25) result.moved.push(`${what}: ${result.height.toFixed(1)} to ${now.toFixed(1)}`);
                for (const pill of bar.querySelectorAll('.bonfire-pill, .focus-pill')) {
                    if (!pill.getClientRects().length) continue;
                    result.pills++;
                    if (isCut(pill)) result.cut.push(`${pill.className} at ${what}`);
                }
                result.sideways = Math.max(result.sideways, document.documentElement.scrollWidth - innerWidth);
            };
            // at rest: a new run, nothing lit
            fire(0); focus(false); s.gold = 0;
            draw();
            result.height = height();

            for (const [seconds, reads] of FORMS) {
                fire(seconds);
                look(`bonfire ${reads}`);
                if (!bar.querySelector('.bonfire-pill')?.textContent.trim().endsWith(reads)) result.misread.push(`the bonfire pill didn't read ${reads}`);
            }
            focus(true); look('Focus beside the buff');
            fire(0); look('the buff gone, Focus on');
            focus(false); look('both gone');
            focus(true); look('Focus on'); focus(false); look('Focus gone');
            fire(3111); look('the buff back'); fire(0); look('the buff gone');

            fire(3111);
            for (const gold of GOLD) { s.gold = gold; look(`gold ${gold}`); }
            s.gold = 0; look('gold back to nothing');
            fire(0);
            for (const gold of GOLD) { s.gold = gold; look(`gold ${gold}, no buff`); }
            s.gold = 0; look('gold back to nothing, no buff');

            // each other figure gaining a digit (one at a time, as they do)
            const grow = (what, get, set) => { const was = get(); set(was * 10); g.recompute(); look(`${what} a digit longer`); set(was); g.recompute(); };
            grow('essence', () => s.resources.essence, v => { s.resources.essence = v; });
            grow('tokens', () => s.prestige.tokens, v => { s.prestige.tokens = v; });
            grow('skill points', () => s.prestige.skillPoints, v => { s.prestige.skillPoints = v; });

            // the crate ripening and taken
            s.daily.banked = hero.crate ? 0 : 1; look('the crate changing');
            s.daily.banked = hero.crate; look('the crate back');

            // work on another tab, and everything at once
            const free = !fighting();
            if (free) { g.startNodeAction('mining', 'copper_ore'); look('at work'); }
            s.settings.forceEvent = 'guild_fair'; fire(3111); focus(true); g.recompute();
            look('every pill at once');
            s.settings.forceEvent = ''; fire(0); focus(false); g.recompute();
            if (free) { g.stopAction(); look('work done'); }
            draw();
            return result;
        }
    };
}

const failures = [];
const launchOptions = name => (name === 'firefox' ? [{ channel: 'moz-firefox', headless: true, timeout: 150000 }, {}] : [{}]);
async function launch(name) {
    let last;
    for (const options of launchOptions(name)) {
        try { return await playwright[name].launch(options); } catch (err) { last = err; }
    }
    throw last;
}

for (const name of BROWSERS) {
    let browser;
    try { browser = await launch(name); } catch (err) {
        failures.push(`${name}: did not start (${String(err.message).split('\n')[0]})`);
        console.log(`${name}: did not start`);
        continue;
    }
    const started = Date.now();
    const context = await browser.newContext({ viewport: { width: 1280, height: HEIGHT } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    page.on('pageerror', e => failures.push(`${name}: page error: ${e.message}`));
    await page.goto(`${base}?dev=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.FI?.game);
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.addStyleTag({ content: '#celebrate, #toast-area { display: none !important; }' });
    await page.evaluate(install);
    console.log(`${name} ${browser.version()}`);
    const tally = new Map();   // for each view and hero: the heights seen, the widths, the pills looked at, what went wrong
    for (let width = FROM; width <= TO; width += STEP) {
        await page.setViewportSize({ width, height: HEIGHT });   // (the slow part in Firefox: once a width)
        for (const view of VIEWS) for (const hero of HEROES) {
            const key = `${view.padEnd(5)} ${hero.padEnd(4)}`;
            if (!tally.has(key)) tally.set(key, { heights: new Map(), widths: 0, pills: 0, wrong: 0, view, hero });
            const t = tally.get(key);
            const say = line => { if (t.wrong++ < 8) console.log(`    ${view}/${hero} ${line}`); };
            const fail = what => { failures.push(`${name} ${view}/${hero} at ${width}px: ${what}`); say(`${width}px: ${what}`); };
            await page.evaluate(([h, v]) => { __bar.hero(h); __bar.view(v); }, [hero, view]);
            if (!await page.evaluate(w => __bar.settle(w), width)) fail('the window or the bar never settled');
            const r = await page.evaluate(() => __bar.run());
            t.widths++;
            t.pills += r.pills;
            const tall = r.height.toFixed(1);
            t.heights.set(tall, (t.heights.get(tall) || 0) + 1);
            if (r.moved.length) fail(`the bar moved: ${r.moved.slice(0, 3).join('; ')}${r.moved.length > 3 ? `; ${r.moved.length - 3} more` : ''}`);
            if (r.cut.length) fail(`cut off: ${r.cut.slice(0, 2).join('; ')}`);
            if (r.sideways > 0) fail(`the page scrolls sideways by ${r.sideways}px`);
            for (const m of r.misread) fail(m);
        }
    }
    for (const [key, t] of tally) {
        if (!t.pills) failures.push(`${name} ${t.view}/${t.hero}: no pill was ever on screen, so nothing was checked`);
        const shown = [...t.heights].sort((a, b) => a[0] - b[0]).map(([h, n]) => `${h}px ×${n}`).join(', ');
        console.log(`  ${key} ${t.widths} widths: ${t.wrong ? `${t.wrong} FAILED` : 'held'} (${shown})`);
    }
    console.log(`  ${Math.round((Date.now() - started) / 1000)} s`);
    await browser.close();
}

server.close();
if (failures.length) {
    console.log(`\nFAILED: ${failures.length}`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
    process.exit(1);
}
console.log(`\nok · the bar held from ${FROM} to ${TO} px in ${BROWSERS.join(', ')}`);
