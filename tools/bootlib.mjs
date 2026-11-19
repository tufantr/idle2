// What tools/bootbench.mjs and tools/bootcheck.mjs share: Playwright's Chromium, a static server for a folder of the game
// (with room to change what it serves), and a hero's save with its clocks moved.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { createRequire } from 'node:module';

/** A browser of Playwright's (Chromium unless another is named), or the way to get it. */
export function chromiumOrExit(name = 'chromium') {
    try { return createRequire(import.meta.url)('playwright')[name]; } catch {
        console.error('Playwright is missing. Once: npm i --no-save playwright && npx playwright install chromium');
        process.exit(2);
    }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

/** Serve `root` on a free port. `patch(path, text)` may return another text for a .js file (only tools/bootcheck.mjs does). */
export function serve(root, patch = null) {
    const server = createServer(async (req, res) => {
        const path = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname)).replace(/^[/\\]+/, '') || 'index.html';
        const file = join(root, path);
        if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
        try {
            let body = await readFile(file);
            if (patch && file.endsWith('.js')) body = patch(path, body.toString()) ?? body;
            res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
        } catch { res.writeHead(404).end(); }
    });
    return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ server, root, url: `http://127.0.0.1:${server.address().port}/` })));
}

/** A hero's save with every clock in it moved by the same amount, so that it was saved at `savedAt`. */
export function shifted(raw, savedAt, { auto } = {}) {
    const s = structuredClone(raw);
    const delta = savedAt - s.meta.savedAt;
    const walk = o => {
        for (const [k, v] of Object.entries(o)) {
            if (v && typeof v === 'object') walk(v);
            else if (typeof v === 'number' && v > 0 && (/(At|Until)$/.test(k) || k === 'until' || k === 't')) o[k] = v + delta;
        }
    };
    walk(s);
    if (auto !== undefined) s.settings.autoPrestige = auto;
    return s;
}
