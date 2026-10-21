// The chain over the fight (21 October 2026) is gone: a save from its day loads without it, and the fight goes on.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { migrateState } from '../src/core/state.js';

const T0 = 1_760_000_000_000;

test('a save with a chain, its clock and a rally in it loads without them, and the fight goes on', () => {
    const game = new Game(null, T0);
    game.toggleCombat();
    game.tick(T0 + 1000);
    const raw = JSON.parse(game.serialize(T0 + 1000));
    Object.assign(raw.combat, { chain: { points: [{ x: 0.2, y: 0.3 }], next: 0, startedAt: T0, endsAt: T0 + 4000 }, chainAt: T0 + 9000, rallyUntil: T0 + 15000 });
    const state = migrateState(raw, T0 + 1000);
    for (const key of ['chain', 'chainAt', 'rallyUntil']) assert.equal(key in state.combat, false, key);
    const again = new Game(state, T0 + 1000);
    const kills = again.state.stats.kills;
    for (let t = 1000; t <= 60000; t += 250) again.tick(T0 + t);
    assert.ok(again.state.stats.kills > kills, 'still fighting');
    assert.equal(again.clickAttack(), true, 'a strike lands');
});
