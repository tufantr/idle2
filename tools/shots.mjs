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
//                                                 # dialog with Trials cleared and one picked, 'pact'
//                                                 # the same deep, rungs cleared and a Pact of two
//                                                 # with the week's picked, and 'trialfight' a fight
//                                                 # in a Pact; 'ascend' the
//                                                 # dialog's Ascend row; 'refit' a new piece in the
//                                                 # bag compared with the reinforced one it would replace;
//                                                 # 'banner' the fight under a clan banner of ×2;
//                                                 # 'clanhall' the Clan tab signed in, its hall at the
//                                                 # Longhouse, 'hallgive' a gift to its Forge picked
//                                                 # and 'bannerpick' its banner picker: the API is
//                                                 # answered by the tool, CLAN_API below)
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
    records: () => { FI.switchTab('achievements'); FI.hallView('records'); },
    bestiary: () => { const c = FI.game().state.combat; c.bestStage = Math.max(c.bestStage, 190); FI.switchTab('achievements'); FI.hallView('bestiary'); },
    stratum: () => { const g = FI.game(); const c = g.state.combat; c.bestStage = Math.max(c.bestStage, 190); c.maxStage = 187; g.setStage(187); g.state.trials.active = null; g.recompute(); FI.switchTab('combat'); if (!c.active) FI.toggleCombat(); },
    // a hero past 99 back in the fight: the purse's talent points, the dock's Perks card and his level past 99
    warfight: async () => {
        const { xpForCombatLevel } = await import('/src/core/xp.js');
        const g = FI.game(); const s = g.state;
        s.skills.combat.xp = xpForCombatLevel(112) + 1000; s.seen.talents = true; g.recompute();
        FI.switchTab('combat'); if (!s.combat.active) FI.toggleCombat();
    },
    // the Shop's Charms (data/charms.js), some held, and Mining's header with its gloves' charges
    charms: () => {
        const g = FI.game(); const s = g.state;
        s.charms = { gem_gloves: 432, compost_sack: 4 }; s.resources.essence = Math.max(s.resources.essence, 2500); g.recompute();
        FI.switchTab('shop');
        document.querySelector('.charms-panel')?.scrollIntoView({ block: 'center' });
    },
    // the event shop during an event: the charms opened, for tokens
    eventcharms: () => { const g = FI.game(); g.state.settings.forceEvent = 'guild_fair'; g.state.events.tokens = 60; g.recompute(); FI.switchTab('events'); document.querySelector('.token-btn[onclick*="buyEventCharm"]')?.scrollIntoView({ block: 'center' }); },
    gemgloves: () => { const g = FI.game(); g.state.charms = { gem_gloves: 432 }; g.recompute(); FI.switchTab('mining'); },
    trialfight: () => { const g = FI.game(); g.state.trials.active = ['no_camp', 'brutes']; g.recompute(); FI.switchTab('combat'); if (!g.state.combat.active) FI.toggleCombat(); },
    banner: async () => {   // three levels of this week's clan boss felled: the chip under the hero says ×2
        const { isoWeek } = await import('/src/data/social.js');
        const g = FI.game();
        g.setClanBanner({ week: isoWeek(Date.now()), kills: 3 });
        FI.switchTab('combat'); if (!g.state.combat.active) FI.toggleCombat();
    },
    refit: async () => {   // a better body armour in the bag than the worn one at +7: its detail compares it refitted
        const { generateEquipment } = await import('/src/core/formulas.js');
        const { GEAR_TIERS, RARITIES } = await import('/src/data/items.js');
        const g = FI.game(); const s = g.state;
        const piece = generateEquipment({ type: 'Body', tier: 4, power: GEAR_TIERS[3].power, materialName: 'Adamant', rarity: RARITIES[1], source: 'drop' }, s.idCounter++);
        s.inventory.push(piece); g.markDirty();
        FI.switchTab('inventory'); FI.selectItem(piece.id);
    }
};
// Dialogs over the game, shot like tabs.
const DIALOGS = {
    map: () => { FI.switchTab('combat'); FI.openMap(); },
    prestige: () => { FI.game().state.prestige.runStartedAt = 0; FI.openPrestige(); },
    ascend: () => {
        const g = FI.game(); const s = g.state;
        s.combat.bestStage = Math.max(s.combat.bestStage, 312); s.prestige.tokens = 104000; s.ascension.stars = 20; s.prestige.runStartedAt = 0;
        g.recompute(); FI.openPrestige();
        document.querySelector('.pg-ascend')?.scrollIntoView({ block: 'center' });
    },
    trials: () => {
        const g = FI.game(); const s = g.state;
        s.prestige.runStartedAt = 0; s.trials.cleared = { brutes: 2, faithless: 5, glass: 1 }; s.trials.active = ['fasting']; s.combat.bestStage = 236;
        s.settings.devUnlockAll = false; s.unlocks.prestige = true; s.seen.trials = true;   // (as a player at 236 sees it: no Pacts yet)
        g.recompute(); FI.openPrestige(); s.settings.devUnlockAll = true;
        const pick = document.querySelector('.prestige-modal input[value="swift_bosses"]');
        if (pick) { pick.checked = true; FI.pickTrial(pick); }
        document.querySelector('.pg-trials')?.scrollIntoView({ block: 'start' });   // the Trials, and the buttons over them
    },
    // the War Tree (data/talents.js): a hero at combat level 131, a Hunt capstone build under way, Execute picked
    talents: async () => {
        const { xpForCombatLevel } = await import('/src/core/xp.js');
        const g = FI.game(); const s = g.state;
        s.skills.combat.xp = xpForCombatLevel(131) + 1000;
        s.talents.ranks = { patient_hunter: 5, scavenger: 5, treasure_sense: 5, essence_drinker: 3, second_chance: 2, gilded_eye: 1, long_draught: 3, lords_due: 2, sharpened_edge: 3 };
        g.recompute(); FI.openTalents(); FI.pickTalent('execute');
    },
    pact: () => {
        const g = FI.game(); const s = g.state;
        s.prestige.runStartedAt = 0; s.combat.bestStage = Math.max(s.combat.bestStage, 820);
        s.trials.cleared = { brutes: 7, thick_hides: 6, glass: 6, rusted: 7, swift_bosses: 6, no_camp: 5, fasting: 6, faithless: 5 }; s.trials.active = ['glass', 'fasting'];
        s.trials.best = { brutes: 790, thick_hides: 640, glass: 610, rusted: 805, swift_bosses: 700, no_camp: 560, fasting: 655, faithless: 420 }; s.trials.weekly = null;
        g.recompute(); FI.openPrestige();
        const week = document.querySelector('.prestige-modal .trial-card.weekly input');
        const other = [...document.querySelectorAll('.prestige-modal input[name="trial"]')].find(i => i !== week && i.value !== 'faithless');
        for (const pick of [week, other]) if (pick) { pick.checked = true; FI.pickTrial(pick); }
        document.querySelector('.pg-trials')?.scrollIntoView({ block: 'start' });
    }
};

// The Clan tab needs an account and the API: those shots sign in with a made-up token, and the tool answers the API with a
// clan of four whose hall stands at the Longhouse (api/index.js's answers, in their shape). A gift and a new banner change
// the hall as the server would.
const CLAN_SHOTS = {
    clanhall: null,
    clanmembers: () => document.querySelector('.clan-members')?.scrollIntoView({ block: 'center' }),
    hallgive: () => { FI.openHallGive('forge'); FI.hallGivePick('runite_bar'); },
    bannerpick: () => { FI.openBannerPicker(); FI.bannerPick('colour', 'gold'); },
    // the hall at the Great Hall and the clan's cloak earned: the hero wears it, azure, in Settings' cloaks and in the fight
    clancloak: () => {
        FI.game().setClanHall({ clan: 7, rooms: { forge: 82800, stores: 82800, kitchen: 28800, apothecary: 28800, garden: 7200, library: 82800 }, stage: 2, colour: 'azure', emblem: 'griffin', cloak: true });
        FI.switchTab('settings');
        document.querySelector('.cape-picks')?.scrollIntoView({ block: 'center' });
    },
    clanfight: () => {
        FI.game().setClanHall({ clan: 7, rooms: { forge: 82800 }, stage: 2, colour: 'azure', emblem: 'griffin', cloak: true });
        FI.switchTab('combat'); if (!FI.game().state.combat.active) FI.toggleCombat();
    },
    // the week's whole work given to the Forge at once, then Give again: the dialog says the week is given, and when more comes
    hallweek: async () => {
        for (const [room, resource] of [['forge', 'runite_bar'], ['library', 'essence']]) {
            FI.openHallGive(room); FI.hallGivePick(resource);
            const slider = document.getElementById('give-qty');
            slider.value = slider.max; FI.hallGiveQty(slider.max, slider.dataset.worth);
            FI.hallGive();
            await new Promise(resolve => setTimeout(resolve, 900));
        }
        FI.openHallGive('stores');
    },
    // the Forge given 100 runite bars (the tool's server takes them): the bank holds 100 fewer, the Forge's bar has grown
    hallgiven: async () => {
        const before = FI.game().state.resources.runite_bar;
        FI.openHallGive('forge'); FI.hallGivePick('runite_bar'); FI.hallGiveQty(100, 15.8);
        document.getElementById('give-qty').value = 100;
        FI.hallGive();
        await new Promise(resolve => setTimeout(resolve, 900));
        document.querySelector('.hall-panel')?.scrollIntoView({ block: 'start' });
        if (FI.game().state.resources.runite_bar !== before - 100) throw new Error(`the gift left ${FI.game().state.resources.runite_bar} runite bars of ${before}`);
    }
};
const FAKE_TOKEN = `x.${Buffer.from(JSON.stringify({ id: 1, username: 'Tufan' })).toString('base64url')}.x`;
function clanApi() {
    const week = '2026-W44';
    const hall = { clan: 7, rooms: { forge: 30500, stores: 12000, kitchen: 7400, apothecary: 2100, garden: 0, library: 41000 }, stage: 1, colour: 'forest', emblem: 'troll',
        given: { week: 4200, total: 26000 }, weekly: 10800, endsInMs: 3 * 864e5, cloak: false };
    let seq = 0;
    const members = [['Tufan', true, 412, 1180, 26000, 4200], ['Yarraksalih', false, 388, 1104, 31000, 10800], ['Shadeofnight', false, 251, 870, 9800, 0], ['Brightmoor', false, 96, 512, 0, 0]];
    const answer = () => ({
        clan: { id: 7, name: 'Iron Wolves', tag: 'IWF', description: 'Casual, EU evenings', lookingFor: 'anyone past stage 50', isOwner: true, crown: null },
        members: members.map(([username, owner, bestStage, totalLevel, total, w]) => ({ username, owner, you: owner, bestStage, totalLevel, attackDamage: 1e6, built: { total, week: w } })),
        hall: { ...hall, builders: { forge: [{ username: 'Yarraksalih', work: 18000 }, { username: 'Tufan', work: 12500 }], library: [{ username: 'Tufan', work: 41000 }] },
            feed: [{ username: 'Yarraksalih', room: 'forge', resource: 'runite_bar', qty: 240, at: Date.now() - 36e5 }, { username: 'Tufan', room: 'library', resource: 'essence', qty: 4200, at: Date.now() - 72e5 },
                { username: 'Shadeofnight', room: 'kitchen', resource: 'cooked_shark', qty: 180, at: Date.now() - 864e5 }] },
        boss: { week, level: 2, maxHp: 9.6e8, hp: 4.1e8, killed: false, lastHit: null, endsInMs: 3 * 864e5, nextInMs: 5e7, kills: 1, levels: 7 },
        banner: { week, kills: 1 }, board: [{ username: 'Yarraksalih', share: 0.46, damage: 4.4e8, attacks: 5, you: false }, { username: 'Tufan', share: 0.38, damage: 3.6e8, attacks: 4, you: true }],
        attackScale: 1, attacksLeft: 2, attacksPerDay: 3, attackBank: 6, fightSeconds: 30, maxMembers: 20,
        standing: { division: 'bronze', divisionName: 'Bronze', rank: 3, of: 9, score: 0, counted: 0, kills: 1, record: 14.2 },
        endless: { open: false, opensInMs: 2 * 864e5, endsInMs: 3 * 864e5, attacks: 2, attacksLeft: 2, best: 0, eligible: true }
    });
    return async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace(/^\/api/, '');
        const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        const news = () => ({ banner: { week, kills: 1 }, hall: { ...hall }, hallGifts: [] });
        if (path === '/load') return json({ state: null, serverNow: Date.now(), gifts: 0, ...news() });
        if (path === '/save') return json({ success: true, timestamp: Date.now(), flagged: false, gifts: 0, ...news() });
        if (path === '/clan') return json(answer());
        if (path === '/rewards') return json({ rewards: [] });
        if (path === '/leaderboard') return json({ entries: [], optIn: false, label: 'Best stage', period: 'all' });
        if (path === '/clans/ranking') return json({ week, divisions: [], last: { week, divisions: [] } });
        if (path === '/clan/hall/give') {
            const { room, resource, qty } = JSON.parse(request.postData() || '{}');
            const { giftWorth } = await import('../src/data/clanhall.js');
            const work = qty * giftWorth(resource);
            hall.rooms[room] = (hall.rooms[room] || 0) + work;
            hall.given = { week: hall.given.week + work, total: hall.given.total + work };
            const { hallLevels, hallStage } = await import('../src/data/clanhall.js');
            hall.stage = hallStage(hallLevels(hall.rooms));
            return json({ gift: { seq: ++seq, room, resource, qty, work }, hall: { ...hall }, hallGifts: [{ seq, resource, qty }] });
        }
        if (path === '/clan/banner') { Object.assign(hall, JSON.parse(request.postData() || '{}')); return json({ hall: { ...hall } }); }
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not answered by the shots"}' });
    };
}

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
async function open(viewport, url, { clan = false } = {}) {
    const ctx = await browser.newContext({ viewport });
    if (clan) {   // signed in, the API answered here (CLAN_SHOTS)
        await ctx.addInitScript(token => localStorage.setItem('fantasyIdle.jwt', token), FAKE_TOKEN);
        await ctx.route('**/api/**', clanApi());
    }
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
    ['Weapon', 'Shield', 'Head', 'Body', 'Legs'].forEach((type, i) => { s.equipped[type] = generateEquipment({ type, tier: 3, power: GEAR_TIERS[2].power, materialName: 'Mithril', rarity: RARITIES[i % 4], source: 'drop' }, s.idCounter++); s.forge[type].level = [4, 0, 2, 7, 14][i]; });
    s.combat.pity = 3;
    for (let i = 0; i < 12; i++) s.inventory.push(generateDrop(2 + (i % 3), i % 4 === 0, s.idCounter++));
    s.daily.banked = 1;
    const { masteryActions, MASTERY_XP_DIVISOR } = await import('/src/data/mastery.js');
    masteryActions('mining').forEach((a, i) => { s.mastery.mining[a.key] = xpForLevel([90, 70, 55, 30, 12, 1, 1, 1][i] || 1) / MASTERY_XP_DIVISOR; });   // a sixth of Mining mastered: one checkpoint passed
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
    const clanTabs = tabs.filter(t => t in CLAN_SHOTS);
    if (clanTabs.length) {   // a page of its own, signed in
        const page = await open(viewport, `${base}?dev=1`, { clan: true });
        await lateGame(page);
        await quiet(page);
        await page.waitForTimeout(1600);
        for (const tab of clanTabs) {
            await page.evaluate(() => { FI.closeModal(); FI.switchTab('clan'); });
            await page.waitForTimeout(900);
            if (CLAN_SHOTS[tab]) { await page.evaluate(CLAN_SHOTS[tab]); await page.waitForTimeout(700); }
            else await page.evaluate(() => { document.querySelector('.hall-panel')?.scrollIntoView({ block: 'start' }); if (innerWidth < 900) window.scrollBy(0, -(document.querySelector('#sidebar')?.offsetHeight || 0) - 8); });
            if (!['clancloak', 'clanfight'].includes(tab) && !(await page.$('.hall-panel'))) problems.push(`no hall on the Clan tab at ${viewport.width}px`);
            await shoot(page, tab, viewport.width);
        }
        await page.context().close();
    }
    if (!tabs.some(t => !(t in CLAN_SHOTS))) continue;
    const page = await open(viewport, `${base}?dev=1`);
    await lateGame(page);
    await quiet(page);
    await page.waitForTimeout(1600); // everything this save has earned opens at once and glows: let that pass
    for (const tab of tabs) {
        if (tab in CLAN_SHOTS) continue;
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
