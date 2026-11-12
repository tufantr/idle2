// The door (src/core/door.js, DESIGN §3.17): the bare address keeps the sign-in first; a guest's link and a frame start as
// a guest at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { playLink, startsAsGuest } from '../src/core/door.js';

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
