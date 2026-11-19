#!/usr/bin/env node
// Which pages may show the game in a frame, under the Content-Security-Policy that deploy/vps/nginx.conf really sends. Every
// address is answered here (nothing goes out), so the browsers judge the real names, itch.io's frame inside its frame among
// them. Run it in Chromium, Firefox and WebKit:   node tools/framecheck.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium, firefox, webkit } = createRequire(import.meta.url)('playwright');
const csp = /Content-Security-Policy "([^"]+)"/.exec(readFileSync(join(ROOT, 'deploy/vps/nginx.conf'), 'utf8'))[1];
const GAME = 'https://fantasyidle.com/';
const CASES = [
    { name: 'the game on its own', chain: [GAME], allowed: true },
    { name: 'itch.io (its page, its player, the game)', chain: ['https://impotentrage.itch.io/fantasy-idle', 'https://html-classic.itch.zone/html/1/index.html', GAME], allowed: true },
    { name: 'galaxy.click, sandboxed as it does', chain: ['https://galaxy.click/play/1', GAME], sandbox: 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups', allowed: true },
    { name: 'a stranger\'s page', chain: ['https://stranger.example/', GAME], allowed: false },
    { name: 'a stranger around itch.io\'s player', chain: ['https://stranger.example/', 'https://html-classic.itch.zone/html/1/index.html', GAME], allowed: false }
];
let bad = 0;
// (Firefox: the one installed on this computer, through WebDriver BiDi; Playwright's own build doesn't start on current macOS)
for (const [label, engine, options] of [['Chromium', chromium], ['Firefox', firefox, { channel: 'moz-firefox', timeout: 150000 }], ['WebKit', webkit]]) {
    const browser = await engine.launch(options);
    for (const c of CASES) {
        const context = await browser.newContext();
        await context.route('**/*', route => {
            const url = route.request().url().split('#')[0].split('?')[0];
            const at = c.chain.indexOf(url);
            if (at < 0) return route.fulfill({ status: 404, body: '' });
            const next = c.chain[at + 1];
            const body = next ? `<!doctype html><iframe src="${next}" ${c.sandbox ? `sandbox="${c.sandbox}"` : ''}></iframe><script>addEventListener('message', e => { if (e.data === 'game') { window.got = true; if (parent !== window) parent.postMessage('game', '*'); } });</script>`
                : `<!doctype html><title>game</title><script>window.got = true; if (parent !== window) parent.postMessage('game', '*');</script>`;
            return route.fulfill({ status: 200, contentType: 'text/html', headers: url === GAME ? { 'content-security-policy': csp } : {}, body });
        });
        const page = await context.newPage();
        await page.goto(c.chain[0], { waitUntil: 'load' }).catch(() => {});
        await page.waitForTimeout(500);
        const shown = await page.evaluate(() => !!window.got).catch(() => false);
        const ok = shown === c.allowed;
        if (!ok) bad++;
        console.log(`${ok ? 'ok ' : 'BAD'} ${label.padEnd(9)} ${c.name}: ${shown ? 'shown' : 'refused'}`);
        await context.close();
    }
    await browser.close();
}
process.exit(bad ? 1 : 0);
