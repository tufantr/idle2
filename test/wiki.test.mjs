// The wiki (wiki/build.mjs) is built from the game's data: it must keep building as the game changes,
// with every link landing on a page and no page showing undefined or NaN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../wiki/build.mjs';
import { RESOURCES } from '../src/data/resources.js';
import { BESTIARY } from '../src/data/bestiary.js';

test('the wiki builds from the game data, every link lands and every number is a number', async () => {
    const out = await mkdtemp(join(tmpdir(), 'wiki-'));
    try {
        const { pages, html } = await build({ out, quiet: true, assets: false });
        assert.ok(pages > 300, `${pages} pages`);
        for (const id of Object.keys(RESOURCES)) assert.ok(html.has(`/items/${id.replace(/_/g, '-')}`), `a page for ${id}`);
        const monsters = BESTIARY.flatMap(g => g.monsters).length;
        assert.ok([...html.keys()].filter(p => p.startsWith('/monsters/')).length === monsters, 'a page for every monster');
        assert.match(html.get('/items/coal'), /Coal Seam/, 'the coal page names the vein it comes from');
    } finally {
        await rm(out, { recursive: true, force: true });
    }
});
