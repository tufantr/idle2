// A newer version of the game out: what a deploy writes, when an open page looks, and the header's pill
// (src/ui/update.js, deploy/vps/activate.sh; a player's ask, 29 October 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import { createUpdateCheck, UPDATE_CHECK_MS, UPDATE_BACK_MS } from '../src/ui/update.js';
import { VERSION } from '../src/version.js';
import { Game } from '../src/game.js';

/** A page running `own`, the server answering `live` (or failing). */
function page({ own = 'aaa1111', live = 'bbb2222', ok = true, fail = false } = {}) {
    const asked = [];
    const found = [];
    const fetcher = async (url, init) => {
        asked.push({ url, init });
        if (fail) throw new TypeError('Failed to fetch');
        return { ok, json: async () => ({ version: live }) };
    };
    return { check: createUpdateCheck({ own, now: 0, fetcher, found: version => found.push(version) }), asked, found };
}

test('a deploy writes its commit as the page\'s own version and as the live one, in forms the page reads', () => {
    const script = readFileSync(new URL('../deploy/vps/activate.sh', import.meta.url), 'utf8');
    const lines = script.split('\n').filter(line => /^printf .*version/.test(line));
    assert.equal(lines.length, 2, 'src/version.js and version.json');
    const dir = mkdtempSync(join(tmpdir(), 'fi-version-'));
    try {
        mkdirSync(join(dir, 'public', 'src'), { recursive: true });
        execFileSync('bash', ['-c', `set -e; SHA=abc1234; ${lines.join('; ')}`], { cwd: dir });
        assert.equal(readFileSync(join(dir, 'public/src/version.js'), 'utf8'), "export const VERSION = 'abc1234';\n");
        assert.deepEqual(JSON.parse(readFileSync(join(dir, 'public/version.json'), 'utf8')), { version: 'abc1234' });
    } finally { rmSync(dir, { recursive: true, force: true }); }
    assert.equal(VERSION, '', 'the repository\'s copy has none: a local host never looks');
});

test('an open page looks every 15 minutes while in view, and stops once it has found a newer version', async () => {
    const { check, asked, found } = page();
    await check.tick(UPDATE_CHECK_MS - 1);
    assert.equal(asked.length, 0, 'the page is the newest when it loads');
    await check.tick(UPDATE_CHECK_MS);
    assert.equal(asked.length, 1);
    assert.match(asked[0].url, /^version\.json\?t=\d+$/, 'a new address each time, so no cache answers');
    assert.equal(asked[0].init.cache, 'no-store');
    assert.deepEqual(found, ['bbb2222']);
    assert.equal(check.live, 'bbb2222');
    await check.tick(5 * UPDATE_CHECK_MS);
    await check.back(5 * UPDATE_CHECK_MS);
    assert.equal(asked.length, 1, 'found: no more looks');
    assert.deepEqual(found, ['bbb2222'], 'and told once');
});

test('the same version says nothing, and the next look waits its turn', async () => {
    const { check, asked, found } = page({ live: 'aaa1111' });
    await check.tick(UPDATE_CHECK_MS);
    await check.tick(UPDATE_CHECK_MS + 60000);
    assert.equal(asked.length, 1);
    await check.tick(2 * UPDATE_CHECK_MS);
    assert.equal(asked.length, 2);
    assert.deepEqual(found, []);
});

test('back in view the page looks at once, unless it looked within the minute', async () => {
    const { check, asked } = page({ live: 'aaa1111' });
    await check.back(UPDATE_BACK_MS - 1);
    assert.equal(asked.length, 0);
    await check.back(UPDATE_BACK_MS);
    assert.equal(asked.length, 1);
    await check.back(UPDATE_BACK_MS + 30000);
    assert.equal(asked.length, 1, 'flicking between tabs sends no stream of looks');
    await check.back(2 * UPDATE_BACK_MS);
    assert.equal(asked.length, 2);
});

test('a local copy never looks, and a look that fails says nothing and leaves the next to try', async () => {
    const local = page({ own: '' });
    await local.check.tick(10 * UPDATE_CHECK_MS);
    await local.check.back(10 * UPDATE_CHECK_MS);
    assert.equal(local.asked.length, 0);
    for (const trouble of [{ fail: true }, { ok: false }, { live: '' }, { live: null }]) {
        const { check, asked, found } = page(trouble);
        await assert.doesNotReject(check.tick(UPDATE_CHECK_MS));
        assert.deepEqual(found, [], JSON.stringify(trouble));
        await check.tick(2 * UPDATE_CHECK_MS);
        assert.equal(asked.length, 2, JSON.stringify(trouble));
    }
});

test('one look at a time, and a clock turned back starts the wait again instead of stopping the looks', async () => {
    let answer;
    const asked = [];
    const check = createUpdateCheck({ own: 'aaa1111', now: 0, found: () => {}, fetcher: url => { asked.push(url); return new Promise(resolve => { answer = resolve; }); } });
    const first = check.tick(UPDATE_CHECK_MS);
    check.tick(UPDATE_CHECK_MS + 100);
    check.back(UPDATE_CHECK_MS + UPDATE_BACK_MS + 100);
    assert.equal(asked.length, 1, 'a slow server gets one request, not one a tick');
    answer({ ok: true, json: async () => ({ version: 'aaa1111' }) });
    await first;

    const { check: turned, asked: looks } = page({ live: 'aaa1111' });
    await turned.tick(UPDATE_CHECK_MS);
    await turned.tick(1000);   // the clock went back 14 minutes
    await turned.tick(1000 + UPDATE_CHECK_MS - 1);
    assert.equal(looks.length, 1);
    await turned.tick(1000 + UPDATE_CHECK_MS);
    assert.equal(looks.length, 2);
});

test('the header offers the new version as a pill that saves and reloads, and says so while it saves', async () => {
    const { renderHeader } = await import('../src/ui/render.js');
    const game = new Game(null, Date.now());
    const ui = { tab: 'combat', fresh: new Set() };
    assert.doesNotMatch(renderHeader(game, ui, null), /update-pill/, 'nothing while this is the newest');
    const pill = renderHeader(game, { ...ui, newVersion: 'bbb2222' }, null).match(/<button class="update-pill[^]*?<\/button>/)?.[0] || '';
    assert.match(pill, /onclick="FI\.reloadForUpdate\(\)"/);
    assert.match(pill, />New version</);
    assert.doesNotMatch(pill, /disabled/);
    const saving = renderHeader(game, { ...ui, newVersion: 'bbb2222', reloading: true }, null).match(/<button class="update-pill[^]*?<\/button>/)?.[0] || '';
    assert.match(saving, /class="update-pill busy"/);
    assert.match(saving, /disabled/);
    assert.match(saving, />Saving…</);
});
