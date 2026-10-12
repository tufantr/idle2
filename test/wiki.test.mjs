// The wiki (wiki/build.mjs) is built from the game's data: it must keep building as the game changes, with
// every link and picture landing, no page showing a number gone wrong, numbers written as the game writes
// them, and every page in the search box's index.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../wiki/build.mjs';
import { fmt } from '../wiki/lib/ui.mjs';
import { fmt as gameFmt } from '../src/ui/format.js';
import { RESOURCES } from '../src/data/resources.js';
import { BESTIARY } from '../src/data/bestiary.js';
import { CROPS } from '../src/data/farming.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let out = null;
let site = null;   // the site, built once for the tests below: { pages, out, html }
before(async () => {
    out = await mkdtemp(join(tmpdir(), 'wiki-'));
    site = await build({ out, quiet: true, assets: false });
});
after(() => rm(out, { recursive: true, force: true }));

test('the wiki builds from the game data, every link lands and every number is a number', () => {
    const { pages, html } = site;
    assert.ok(pages > 300, `${pages} pages`);
    for (const id of Object.keys(RESOURCES)) assert.ok(html.has(`/items/${id.replace(/_/g, '-')}`), `a page for ${id}`);
    const monsters = BESTIARY.flatMap(g => g.monsters).length;
    assert.ok([...html.keys()].filter(p => p.startsWith('/monsters/')).length === monsters, 'a page for every monster');
    assert.match(html.get('/items/coal'), /Coal Seam/, 'the coal page names the vein it comes from');
});

test('every picture a page names is one of the game\'s: its links, and the banners, tiles and card thumbs in its styles', () => {
    const missing = new Set();
    for (const [p, h] of site.html) {
        for (const m of h.matchAll(/(?:href|src)="(\/assets\/[^"#?]+)|url\((\/assets\/[^)"'#?]+)/g)) {
            const pic = m[1] || m[2];
            if (!existsSync(join(ROOT, decodeURIComponent(pic)))) missing.add(`${p}: ${pic}`);
        }
    }
    assert.deepEqual([...missing], []);
});

test('numbers from a million on are written as the game writes them, and a number gone wrong as itself', () => {
    for (const n of [1e6, 1_234_567, 999_700_000, -2.5e9, 7.3e12, 1.26e15, 2.23e18, 4.8e24, 3.3e31, 1e40]) assert.equal(fmt(n), gameFmt(n), `${n}`);
    // the build stops on a page that shows these (wiki/lib/site.mjs)
    assert.equal(fmt(Infinity), 'Infinity');
    assert.equal(fmt(NaN), 'NaN');
    assert.equal(fmt(null), '–', 'nothing at all is a dash');
});

test('a crop\'s XP an hour on the Farming page is a plot\'s: the crop\'s XP × the mean harvest × harvests an hour', () => {
    const h = site.html.get('/skills/farming');
    for (const c of CROPS) {
        const row = new RegExp(`id="crop-${c.id}"[\\s\\S]*?</tr>`).exec(h)?.[0] || '';
        const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        assert.equal(cells.at(-1), fmt(Math.round(c.xp * (c.yield[0] + c.yield[1]) / 2 * 3600000 / c.growMs)), c.name);
    }
});

test('every page is in the search box\'s index, once', async () => {
    const listed = JSON.parse(await readFile(join(out, 'search.json'), 'utf8')).map(e => e.u);
    assert.equal(new Set(listed).size, listed.length, 'no page twice');
    // all but the page for a link that lands nowhere
    const missing = [...site.html.keys()].filter(p => p !== '/404' && !listed.includes(p));
    assert.deepEqual(missing, []);
});
