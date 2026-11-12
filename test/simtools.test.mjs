// The balance simulator's own rules (tools/simlib.mjs, the pieces of tools/simulate.mjs a test can import): its bot fights
// the Titan when the dungeons tab's badge says he can win (research-loop 040 §2).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { renderNav } from '../src/ui/render.js';
import { TITAN_UNLOCK_STAGE } from '../src/data/dungeons.js';
import { titanBeatable } from '../tools/simlib.mjs';

const T0 = 1_700_000_000_000;

function hero({ tokens = 0, stage = TITAN_UNLOCK_STAGE } = {}) {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = stage;
    s.combat.maxStage = stage;
    s.prestige.tokens = tokens;
    s.unlocks.dungeons = true;
    game.recompute();
    game.drainEvents();
    return game;
}
const badge = game => renderNav(game, { tab: 'combat' }).includes('The Titan is awake, and you can beat him');

test('the bot fights a Titan when the dungeons tab says he can beat it, and only then', () => {
    let seen = { yes: 0, no: 0 };
    for (const tokens of [0, 50, 200, 1000, 3000, 10000, 20000, 100000]) {
        const game = hero({ tokens });
        assert.equal(game.titanReady(), true);
        assert.equal(titanBeatable(game), badge(game), `${tokens} tokens: the bot and the badge agree`);
        seen[titanBeatable(game) ? 'yes' : 'no']++;
    }
    assert.ok(seen.yes && seen.no, 'some heroes can, some cannot');
    assert.equal(titanBeatable(hero()), false, 'a new hero at the Titan\'s stage cannot');
    // the next Titan is stronger: one the hero beats may be followed by one he can't
    const strong = hero({ tokens: 20000 });
    assert.equal(titanBeatable(strong), true);
    strong.state.titan.kills = 40;
    assert.equal(titanBeatable(strong), badge(strong));
});
