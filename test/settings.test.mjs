// Settings' options (docs/DESIGN.md §3.36): what each choice does, that a save without them is today's game, and that the
// panel stays easy to read.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { renderSettings } from '../src/ui/render.js';

const T0 = 1_760_000_000_000;
const groupsOf = html => [...html.matchAll(/<fieldset class="opt-group"><legend>([^<]+)<\/legend>([^]*?)<\/fieldset>/g)].map(m => ({ name: m[1], body: m[2] }));

test("Settings' options stand in groups, and every switch is still there", () => {
    const game = new Game(null, T0);
    const groups = groupsOf(renderSettings(game, {}, null));
    assert.deepEqual(groups.map(g => g.name), ['Sound', 'Motion', 'Keys and log']);
    const body = name => groups.find(g => g.name === name).body;
    assert.match(body('Sound'), /FI\.setSetting\('sound', this\.checked\)/);
    assert.match(body('Sound'), /FI\.setVolume/);
    assert.match(body('Motion'), /Reduce motion/);
    assert.match(body('Keys and log'), /FI\.setShortcuts/);
    assert.match(body('Keys and log'), /FI\.setPlaytestLog/);
    assert.doesNotMatch(body('Sound'), /Chime/, 'the chime waits until a mini-game has been met');
    game.state.seen.minigames = true;
    assert.match(groupsOf(renderSettings(game, {}, null)).find(g => g.name === 'Sound').body, /Chime when a mini-game chance appears/);
});
