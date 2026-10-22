// The link preview (assets/og-image.jpg, 1200x630, named in index.html's og:image): the game's own fight, a knight in
// runite before the Ember Volcano facing its demon, with the title over the sky. Discord, Reddit and the like show it
// beside a link to the game. Rerun when the hero's sprites, the volcano's painting or the title's look change:
//
//     node tools/preview.mjs            # needs Playwright (see tools/shots.mjs) and the network, for the fonts
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = 62;   // the Ember Volcano, a stage short of its boss: no victory banner over the fight
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const server = createServer(async (req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
// 1. the scene, mid-fight
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
await page.goto(`http://127.0.0.1:${port}/?dev=1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
if (new URL(page.url()).port !== String(port)) throw new Error('wrong page');
await page.addStyleTag({ content: '#celebrate, #toast-area, .guide-hand, .battle-top, .fighter-name, .fighter-meta, .fbar-text, .attack-bar { display: none !important; }' });
await page.evaluate(async stage => {
    FI.closeModal();
    const { generateEquipment } = await import('/src/core/formulas.js');
    const { GEAR_TIERS, RARITIES } = await import('/src/data/items.js');
    const { xpForLevel } = await import('/src/core/xp.js');
    const g = FI.game(); const s = g.state;
    s.skills.combat.xp = xpForLevel(70);
    for (const type of ['Weapon', 'Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves']) s.equipped[type] = generateEquipment({ type, tier: 5, power: GEAR_TIERS[4].power * 0.6, materialName: 'Runite', rarity: RARITIES[3], source: 'drop' }, s.idCounter++);
    s.combat.bestStage = stage + 3; s.combat.maxStage = stage + 3;
    g.markDirty(); g.recompute(); g.setStage(stage);
    FI.switchTab('combat');
    if (!s.combat.active) FI.toggleCombat();
}, STAGE);
await page.waitForTimeout(700);
await page.evaluate(() => { const g = FI.game(); g.state.combat.hp = g.derived.maxHp; });   // at full health: a fight just begun
await page.waitForTimeout(400);
const scene = await (await page.$('.battle')).screenshot({ type: 'png' });
// 2. the card
const card = await (await browser.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
await card.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Outfit:wght@400;600&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #0d0a07; }
  .bg { position: absolute; inset: 0; background: url(data:image/png;base64,${scene.toString('base64')}) center 62% / cover no-repeat; }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8, 5, 3, 0.78) 0%, rgba(8, 5, 3, 0.35) 34%, rgba(8, 5, 3, 0) 52%, rgba(8, 5, 3, 0) 80%, rgba(8, 5, 3, 0.55) 100%); }
  .title { position: absolute; top: 38px; left: 0; right: 0; text-align: center; font-family: Cinzel, serif; font-weight: 800; font-size: 104px; letter-spacing: 0.04em; line-height: 1;
           background: linear-gradient(180deg, #fff3cf 0%, #f2c86a 52%, #b8862f 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
           filter: drop-shadow(0 4px 0 #2a1806) drop-shadow(0 10px 18px rgba(0, 0, 0, 0.75)); }
  .tag { position: absolute; top: 162px; left: 0; right: 0; text-align: center; font-family: Outfit, sans-serif; font-weight: 600; font-size: 34px; color: #f6ead2; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9); }
  .free { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; font-family: Outfit, sans-serif; font-weight: 400; font-size: 24px; color: #e9dcc1; letter-spacing: 0.06em; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95); }
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="title">Fantasy Idle</div><div class="tag">An idle RPG in your browser</div><div class="free">FREE &middot; NO ADS &middot; NOTHING TO BUY</div></body></html>`);
await card.evaluate(() => document.fonts.ready);
await card.waitForTimeout(600);
await card.screenshot({ path: join(ROOT, 'assets', 'og-image.jpg'), type: 'jpeg', quality: 86 });
await browser.close(); server.close();
console.log('assets/og-image.jpg');
