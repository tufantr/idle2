// The world: the first step ever into a zone is announced once (not again after a prestige, not
// for the Abyss's deeper depths, not while away); and every seventh daily crate is a great one.
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

test('every seventh crate opened is a great crate, whenever it is opened', async () => {
    const { GREAT_CRATE_EVERY, cratesTowardGreat } = await import('../src/systems/daily.js');
    const game = new Game(null, T0);
    game.state.combat.bestStage = 25;
    const crates = [];
    for (let i = 0; i < 2 * GREAT_CRATE_EVERY; i++) {
        game.state.daily.banked = 1;          // ripe, however long it took
        crates.push(game.claimDaily());
    }
    const great = crates.map(c => c.great);
    assert.deepEqual(great.map((g, i) => (g ? i + 1 : 0)).filter(Boolean), [GREAT_CRATE_EVERY, 2 * GREAT_CRATE_EVERY]);
    const plain = crates[0], big = crates[GREAT_CRATE_EVERY - 1];
    assert.equal(big.gold, plain.gold * 3);
    assert.equal(big.essence, plain.essence * 2);
    const gems = c => Object.keys(c.materials).filter(id => ['amethyst', 'topaz', 'sapphire', 'emerald', 'ruby', 'diamond'].includes(id));
    assert.equal(gems(plain).length, 1);
    assert.equal(gems(big).length, 2, 'and a gem of the next tier');
    assert.equal(cratesTowardGreat(game.state), 0);
});
