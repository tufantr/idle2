#!/usr/bin/env node
// Screenshots of the game at a desktop and a phone width, with the two checks a layout change most
// often breaks: nothing may scroll sideways, and the page may not throw or log an error. Tabs are
// shot in a late-game save so that every one of them has something in it.
//
//   node tools/shots.mjs                          # the default tabs
//   node tools/shots.mjs combat,mining,inventory  # just these (any tab id: farming, events, settings...;
//                                                 # 'battle' is the fight filling the screen; 'map' and
//                                                 # 'prestige' are those dialogs over the game; 'anvil'
//                                                 # is Smithing's anvil step; 'trials' is the prestige
//                                                 # dialog with Trials cleared and one picked, and
//                                                 # 'trialfight' a fight in a Trial)
//   node tools/shots.mjs --fresh                  # a brand-new player's first minutes: the title card, the first
//                                                 # fight, the first skill at work, the first place to open
//
// Writes shots/<name>-<width>.png (git-ignored) and exits 1 on overflow or errors.
// Needs Playwright, once:  npm i --no-save playwright && npx playwright install chromium

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
// 'battle' is not a tab: it is the combat tab with the fight on, which fills the screen.
const DEFAULT_TABS = ['combat', 'battle', 'mining', 'smithing', 'anvil', 'cooking', 'farming', 'inventory', 'shop', 'achievements', 'dungeons', 'map'];
// A step inside a tab, shot like a tab.
const STEPS = {
    anvil: () => { FI.switchTab('smithing'); FI.smithView('anvil'); },
    trialfight: () => { const g = FI.game(); g.state.trials.active = 'no_camp'; g.recompute(); FI.switchTab('combat'); if (!g.state.combat.active) FI.toggleCombat(); }
};
// Dialogs over the game, shot like tabs.
const DIALOGS = {
    map: () => { FI.switchTab('combat'); FI.openMap(); },
    prestige: () => { FI.game().state.prestige.runStartedAt = 0; FI.openPrestige(); },
    trials: () => {
        const g = FI.game(); const s = g.state;
        s.prestige.runStartedAt = 0; s.trials.cleared = { brutes: 2, faithless: 5, glass: 1 }; s.trials.active = 'fasting'; s.combat.bestStage = Math.max(s.combat.bestStage, 236);
        g.recompute(); FI.openPrestige();
        const pick = document.querySelector('.prestige-modal input[value="swift_bosses"]');
        if (pick) { pick.checked = true; FI.pickTrial(pick); }
        document.querySelector('.pg-trials')?.scrollIntoView({ block: 'start' });   // the Trials, and the buttons over them
    }
};

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch {
    console.error('Playwright is missing. Once: npm i --no-save playwright && npx playwright install chromium');
    process.exit(2);
}

const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const tabs = (args.find(a => !a.startsWith('--')) || DEFAULT_TABS.join(',')).split(',').filter(Boolean);

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
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const problems = [];

/** A page that records errors; requests the static server can't answer (the API, web fonts offline) don't count. */
async function open(viewport, url) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${viewport.width}px: ${e.message}`));
    page.on('console', m => {
        const where = m.location()?.url || '';
        if (m.type() === 'error' && !where.includes('/api/') && !where.includes('fonts.g')) errors.push(`${viewport.width}px: ${m.text()}`);
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    return page;
}

/** Celebrations and toasts come and go; keep them out of the pictures. */
const quiet = page => page.addStyleTag({ content: '#celebrate, #toast-area { display: none !important; }' });

async function shoot(page, name, width) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(OUT, `${name}-${width}.png`) });
    console.log(`${String(width).padStart(4)}px  ${name.padEnd(14)} overflow ${overflow}`);
    if (overflow > 0) problems.push(`${name} at ${width}px scrolls sideways by ${overflow}px`);
}

/** A save well into the game: levels in the 40s and 60s, gear, a full bag, materials, mining under way. */
const lateGame = page => page.evaluate(async () => {
    FI.closeModal();
    const { generateDrop, generateEquipment } = await import('/src/core/formulas.js');
    const { xpForLevel } = await import('/src/core/xp.js');
    const g = FI.game(); const s = g.state;
    for (const id of Object.keys(s.skills)) s.skills[id].xp = xpForLevel(id === 'combat' ? 62 : 48);
    s.combat.bestStage = 64; s.combat.maxStage = 58; s.combat.stage = 56;
    s.prestige.tokens = 420; s.prestige.count = 24; s.prestige.skillPoints = 2; s.settings.autoPrestige = true;   // a veteran: the dock's Auto switch is on
    for (const r of Object.keys(s.resources)) s.resources[r] = 240;
    s.resources.essence = 3200; s.gold = 4.8e6;
    const { GEAR_TIERS, RARITIES } = await import('/src/data/items.js');
    ['Weapon', 'Shield', 'Head', 'Body', 'Legs'].forEach((type, i) => { s.equipped[type] = generateEquipment({ type, tier: 3, power: GEAR_TIERS[2].power, materialName: 'Mithril', rarity: RARITIES[i % 4], source: 'drop' }, s.idCounter++); s.equipped[type].upgrade = [4, 0, 2, 7, 10][i]; });
    s.combat.pity = 3;
    for (let i = 0; i < 12; i++) s.inventory.push(generateDrop(2 + (i % 3), i % 4 === 0, s.idCounter++));
    s.daily.banked = 1;
    g.markDirty(); g.recompute(); g.setStage(56);
    g.startNodeAction('mining', 'mithril_ore');
});

/** A new player two minutes in: mining under way, four ores up, so the fifth opens Smithing on camera. */
const firstSkill = page => page.evaluate(() => {
    const g = FI.game();
    FI.switchTab('mining');
    FI.startNode('mining', 'copper_ore');
    g.state.stats.actionsBySkill.mining = 4;
    g.state.resources.copper_ore = 4;
    g.state.meta.attendedMs = Math.max(g.state.meta.attendedMs, 120000);   // two minutes in: past the minute and a half a place earned by work waits
    g.markDirty();
});

for (const viewport of VIEWPORTS) {
    if (fresh) {
        const page = await open(viewport, base);
        await quiet(page);
        await shoot(page, 'title', viewport.width);
        if (await page.$('.intro-go')) {
            await page.click('.intro-go');
            await page.waitForTimeout(2500);
            await shoot(page, 'first-fight', viewport.width);
            await firstSkill(page);
            await page.waitForTimeout(1500);
            await shoot(page, 'first-skill', viewport.width);
            await page.addStyleTag({ content: '#celebrate { display: block !important; }' }); // this picture is of the card
            await page.waitForTimeout(2600);
            if (!(await page.$('.celebration'))) problems.push(`no card for the first unlock at ${viewport.width}px`);
            await shoot(page, 'first-unlock', viewport.width);
        } else problems.push(`no title card for a new player at ${viewport.width}px`);
        await page.context().close();
        continue;
    }
    const page = await open(viewport, `${base}?dev=1`);
    await lateGame(page);
    await quiet(page);
    await page.waitForTimeout(1600); // everything this save has earned opens at once and glows: let that pass
    for (const tab of tabs) {
        if (DIALOGS[tab]) {
            await page.evaluate(DIALOGS[tab]);
            await page.waitForTimeout(700);
            if (!(await page.$('#modal-root .modal-content'))) problems.push(`the ${tab} dialog did not open at ${viewport.width}px`);
            await shoot(page, tab, viewport.width);
            await page.evaluate(() => FI.closeModal());
            continue;
        }
        if (STEPS[tab]) {
            await page.evaluate(STEPS[tab]);
            await page.waitForTimeout(700);
            await shoot(page, tab, viewport.width);
            continue;
        }
        await page.evaluate(t => {
            const fighting = FI.game().state.combat.active;
            FI.switchTab(t === 'battle' ? 'combat' : t);
            if ((t === 'battle') !== fighting && (t === 'battle' || t === 'combat')) FI.toggleCombat(); // 'combat' shows the tab at rest
        }, tab);
        await page.waitForTimeout(700);
        await shoot(page, tab, viewport.width);
    }
    await page.context().close();
}

await browser.close();
server.close();
for (const e of errors) console.log(`error  ${e}`);
for (const p of problems) console.log(`problem  ${p}`);
console.log(`\n${errors.length || problems.length ? 'FAILED' : 'ok'} · pictures in shots/`);
process.exit(errors.length || problems.length ? 1 : 0);
