#!/usr/bin/env node
// The Fantasy Idle wiki: a static site built from the game's own data (src/), so every number, table and
// picture is the game's. Written pages (wiki/content/**/*.md) carry the explanations; the page builders
// (wiki/pages/*.mjs) make the tables, infoboxes and cross-links from the data. It deploys as its own
// Vercel project (README.md "The wiki").
//
//   node wiki/build.mjs                 # builds into wiki/dist (git-ignored)
//   node wiki/build.mjs --out <dir>     # somewhere else
//   node wiki/build.mjs --serve [port]  # builds, then serves it at http://localhost:8010 with clean URLs
//
// Fails (exit 1) when a link lands nowhere, a {{ }} expression breaks, or a page shows undefined or NaN.

import { readFile, writeFile, mkdir, readdir, copyFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { createSite } from './lib/site.mjs';
import { renderMarkdown, frontMatter } from './lib/md.mjs';
import { evaluate } from './lib/scope.mjs';
import { ATLAS } from '../src/data/sprites.js';

import home from './pages/home.mjs';
import skills from './pages/skills.mjs';
import items from './pages/items.mjs';
import equipment from './pages/equipment.mjs';
import world from './pages/world.mjs';
import progression from './pages/progression.mjs';
import systems from './pages/systems.mjs';
import { NAV } from './pages/nav.mjs';
import { navbox, link, esc } from './lib/ui.mjs';

const WIKI = dirname(fileURLToPath(import.meta.url));
const ROOT = join(WIKI, '..');
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const OUT = typeof opt('--out') === 'string' ? opt('--out') : join(WIKI, 'dist');
const GAME_URL = process.env.WIKI_GAME_URL || 'https://fantasy-idle.vercel.app';
const SITE_URL = process.env.WIKI_URL || 'https://fantasy-idle-wiki.vercel.app';

function gitVersion() {
    if (process.env.WIKI_VERSION) return process.env.WIKI_VERSION;
    try { return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}

async function walk(dir) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...await walk(p));
        else out.push(p);
    }
    return out;
}

export async function build({ out = OUT, quiet = false, assets = true } = {}) {
    const version = gitVersion();
    const builtAt = new Date().toUTCString().slice(5, 16);
    const site = createSite({ gameUrl: GAME_URL, siteUrl: SITE_URL, version, builtAt });

    // 1. the written pages: their front matter registers pages that have no builder
    const content = new Map();   // path -> { meta, body, file }
    for (const file of (await walk(join(WIKI, 'content'))).filter(f => f.endsWith('.md')).sort()) {
        const { meta, body } = frontMatter(await readFile(file, 'utf8'));
        const where = relative(ROOT, file);
        if (!meta.path) throw new Error(`${where}: no path in its front matter`);
        if (content.has(meta.path)) throw new Error(`${where}: a second page for ${meta.path}`);
        content.set(meta.path, { meta, body, file: where });
    }

    // 2. every page, registered before any body is made, so a link can name any of them
    const builders = [home, skills, items, equipment, world, progression, systems].flatMap(m => m.pages());
    const built = new Set(builders.map(b => b.path));
    for (const b of builders) {
        const written = content.get(b.path)?.meta;
        const words = list => (list || '').split(',').map(s => s.trim()).filter(Boolean);
        site.add({ ...b, keywords: [...(b.keywords || []), ...words(written?.keywords)], aliases: [...(b.aliases || []), ...words(written?.aliases)] });
    }
    for (const [path, { meta }] of content) {
        if (built.has(path)) continue;
        site.add({
            path, title: meta.title || path, section: meta.section || 'Guides', sectionPath: meta.sectionPath || '/guides',
            icon: meta.icon || '', art: meta.art || '', focus: meta.focus || '', summary: meta.summary || '',
            keywords: (meta.keywords || '').split(',').map(s => s.trim()).filter(Boolean), aliases: (meta.aliases || '').split(',').map(s => s.trim()).filter(Boolean),
            guide: true, order: Number(meta.order || 50)
        });
    }

    // 3. the written text, rendered (its [[links]] resolved against every page)
    const ctx = { evaluate, link: site.link };
    const prose = new Map();
    for (const [path, c] of content) prose.set(path, renderMarkdown(c.body, ctx, c.file));
    const help = { site, prose: path => prose.get(path) || '', pages: () => [...site.pages.values()] };

    // 4. the bodies
    for (const b of builders) {
        const page = site.pages.get(b.path);
        const made = b.build ? b.build(help) : {};
        Object.assign(page, made);
        if (!made.body) page.body = help.prose(b.path);
    }
    for (const [path] of content) if (!built.has(path)) site.pages.get(path).body = prose.get(path);

    // 5. write the site
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    const assetsVersion = version || String(Date.now());
    const nav = NAV(site);
    // a page without a box of its own family at its foot gets its menu group's
    for (const page of site.pages.values()) {
        if (page.navbox || page.path === '/' || page.hidden) continue;
        const group = nav.find(g => g.links.some(l => l.path === page.path));
        if (group) page.navbox = navbox(group.title, group.links.filter(l => l.path !== page.path).map(l => link(l.path, esc(l.title), l.icon)));
    }
    const html = new Map();
    for (const page of site.pages.values()) html.set(page.path, site.render(page, nav, assetsVersion));
    site.checkLinks(html);
    for (const [path, h] of html) {
        const file = path === '/' ? join(out, 'index.html') : join(out, `${path.slice(1)}.html`);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, h);
    }
    await writeFile(join(out, 'search.json'), JSON.stringify(site.searchIndex()));
    const listed = [...site.pages.values()].filter(p => !p.hidden);
    await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map(p => `<url><loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
    await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
    const atlas = `:root { --atlas: url(/assets/sprites.png?v=${ATLAS.url.split('v=')[1] || assetsVersion}); --atlas-w: ${ATLAS.cell * ATLAS.cols}px; --atlas-h: ${ATLAS.cell * ATLAS.rows}px; }\n`;
    await writeFile(join(out, 'wiki.css'), atlas + await readFile(join(WIKI, 'static', 'wiki.css'), 'utf8'));
    await copyFile(join(WIKI, 'static', 'wiki.js'), join(out, 'wiki.js'));
    await copyFile(join(WIKI, 'static', 'vercel.json'), join(out, 'vercel.json'));
    // the game's pictures: the sprite sheet, the paintings, the app icons
    if (assets) await copyAssets(out);

    if (!quiet) console.log(`${site.pages.size} pages written to ${relative(process.cwd(), out) || '.'}`);
    if (site.problems.length) {
        for (const p of site.problems) console.error(`problem  ${p}`);
        throw new Error(`${site.problems.length} problem(s) in the wiki`);
    }
    return { pages: site.pages.size, out, html };
}

async function copyAssets(out) {
    await mkdir(join(out, 'assets', 'paint', 'cards'), { recursive: true });
    await mkdir(join(out, 'assets', 'icons'), { recursive: true });
    await copyFile(join(ROOT, 'assets', 'sprites.png'), join(out, 'assets', 'sprites.png'));
    for (const dir of ['paint', 'paint/cards', 'icons']) {
        for (const f of await readdir(join(ROOT, 'assets', dir))) {
            if (!/\.(webp|png)$/.test(f)) continue;
            await copyFile(join(ROOT, 'assets', dir, f), join(out, 'assets', dir, f));
        }
    }
}

/** A static server with the same clean URLs as Vercel (/items/coal serves items/coal.html). */
function serve(dir, port) {
    const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
    createServer(async (req, res) => {
        let p = decodeURIComponent(new URL(req.url, 'http://local').pathname);
        if (p.includes('..')) { res.writeHead(400).end(); return; }
        const candidates = p === '/' ? ['index.html'] : [p.slice(1), `${p.slice(1)}.html`];
        for (const c of candidates) {
            try {
                const f = join(dir, c);
                if (!(await stat(f)).isFile()) continue;
                res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }).end(await readFile(f));
                return;
            } catch { /* next */ }
        }
        res.writeHead(404, { 'content-type': TYPES['.html'] }).end(await readFile(join(dir, '404.html')).catch(() => 'Not found'));
    }).listen(port, () => console.log(`wiki at http://localhost:${port}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const { out } = await build();
        if (opt('--serve')) serve(out, Number(opt('--serve')) || 8010);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
