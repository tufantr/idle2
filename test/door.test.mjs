// The door (src/core/door.js, DESIGN §3.17): the bare address keeps the sign-in first; a guest's link and a frame start as
// a guest at once; and Settings says how the game was made (P-020).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { playLink, startsAsGuest } from '../src/core/door.js';
import { renderSettings, renderAuthModal, PAINTINGS } from '../src/ui/render.js';
import { Game } from '../src/game.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('a guest\'s link is `play` among the address\'s parameters, whatever else stands beside it', () => {
    for (const search of ['?play', '?play=1', '?play=', '?src=reddit&play', '?play&src=galaxy', 'play']) assert.equal(playLink(search), true, search);
    for (const search of ['', '?', '?player=1', '?dev=1', '?replay', '?src=play', '#play', null, undefined]) assert.equal(playLink(search), false, String(search));
});

test('the bare address keeps the sign-in first; the link, a frame or a guest\'s game chosen before start as a guest', () => {
    assert.equal(startsAsGuest({ search: '' }), false, 'the bare address');
    assert.equal(startsAsGuest({ search: '?src=reddit' }), false, 'a tagged link alone');
    assert.equal(startsAsGuest({ search: '?play' }), true, "a guest's link");
    assert.equal(startsAsGuest({ search: '?play&src=reddit' }), true, 'tagged too');
    assert.equal(startsAsGuest({ embedded: true }), true, "another site's frame");
    assert.equal(startsAsGuest({ chosen: true }), true, 'Play as guest, chosen before in this browser');
    assert.equal(startsAsGuest({ search: '?play', signedIn: true }), false, 'signed in, the link plays the account\'s game');
    assert.equal(startsAsGuest(), false);
});

test('Settings says how the game was made, and its count of paintings is the files under assets/paint/', () => {
    const count = dir => readdirSync(join(ROOT, dir), { withFileTypes: true }).filter(e => e.isFile() && /\.(webp|png|jpe?g)$/.test(e.name)).length;
    assert.equal(PAINTINGS, count('assets/paint') + count('assets/paint/cards'), 'a painting added or taken away: say so in Settings');
    const html = renderSettings(new Game(null, 1_760_000_000_000), {}, null);
    const foot = html.slice(html.lastIndexOf('<section'));
    assert.match(foot, /How it was made/, 'at the foot of Settings');
    for (const words of [`The ${PAINTINGS} paintings were made with Google Gemini, an AI`, 'Dungeon Crawl Stone Soup', 'CC0', 'drawn by the game\'s code', 'made by the game\'s code as you play', 'written with an AI, Claude', 'SIL Open Font License']) {
        assert.ok(foot.replace(/&#39;/g, "'").includes(words), words);
    }
});

test("on an iPhone or iPad the sign-in that offers a guest's game says Safari clears it after seven days away", () => {
    const note = /class="muted small auth-keep">On an iPhone or iPad, Safari clears a guest's game after seven days away, unless the game is on your Home Screen\.</;
    assert.match(renderAuthModal('', { required: true, keep: true }), note, 'the sign-in the game waits behind');
    assert.match(renderAuthModal('', { required: true, register: true, keep: true }), note, 'its account step');
    assert.match(renderAuthModal('', { keep: true }), note, 'and the one the Guest pill opens');
    assert.doesNotMatch(renderAuthModal('', { required: true }), /auth-keep/, 'elsewhere, not said');
    for (const mode of ['verify', 'forgot', 'reset']) assert.doesNotMatch(renderAuthModal('', { mode, keep: true }), /auth-keep/, mode);
});
