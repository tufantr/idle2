// The world: the first step ever into a zone is announced once (not again after a prestige, not
// for the Abyss's deeper depths, not while away).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { ZONES, STAGES_PER_ZONE } from '../src/data/zones.js';
import { onEnemyDeath } from '../src/systems/combat.js';

rng.setSource(seededRandom(11));
const T0 = 1_700_000_000_000;

/** Beat the monster in front of the hero, as combat would. */
function beat(game) {
    game.state.combat.enemy.hp = 0;
    onEnemyDeath(game);
    return game.drainEvents().filter(e => e.type === 'zoneReached');
}

function heroAt(stage, best = stage) {
    const game = new Game(null, T0);
    game.enterCombat();
    Object.assign(game.state.combat, { stage, maxStage: stage, bestStage: best });
    game.state.combat.enemy = null;
    game.tick(T0 + 100);
    game.drainEvents();
    return game;
}

test('beating the last stage of a zone for the first time ever announces the next land', () => {
    const game = heroAt(STAGES_PER_ZONE);
    assert.deepEqual(beat(game).map(e => [e.zone, e.stage]), [[ZONES[1].id, STAGES_PER_ZONE + 1]]);
    assert.deepEqual(beat(game), [], 'the second stage of the zone is not news');
});

test('a land already reached, in this run or an earlier one, is not announced again', () => {
    const game = heroAt(STAGES_PER_ZONE, 3 * STAGES_PER_ZONE);   // best stage 30 from an earlier run
    assert.deepEqual(beat(game), []);
    assert.equal(game.state.combat.stage, STAGES_PER_ZONE + 1);
});

test('the Abyss is announced once, at its first depth', () => {
    const first = (ZONES.length - 1) * STAGES_PER_ZONE;
    const game = heroAt(first);
    game.state.prestige.tokens = 1e6;
    assert.deepEqual(beat(game).map(e => e.zone), [ZONES[ZONES.length - 1].id]);
    const deeper = heroAt(first + STAGES_PER_ZONE);
    assert.deepEqual(beat(deeper), [], 'a deeper depth is the same land');
});
