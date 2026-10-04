// A fall is not the end of the fight: the hero rests to full health and goes back in by himself, from
// where he retreated. Work, or being told to stay at camp, calls that off. The time away is replayed the
// same way, so a hero who falls early still fights through the absence.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { onPlayerDeath } from '../src/systems/combat.js';

rng.setSource(seededRandom(5));
const T0 = 1_700_000_000_000;

function fighter(stage = 15) {
    const game = new Game(null, T0);
    game.enterCombat();
    Object.assign(game.state.combat, { stage, maxStage: stage, bestStage: stage });
    game.state.combat.enemy = null;
    game.tick(T0 + 100);
    game.drainEvents();
    return game;
}

function fall(game) {
    game.state.combat.hp = 0;
    onPlayerDeath(game);
    return game.drainEvents();
}

/** Tick in 1 s steps until `done()` or `maxS` seconds pass; returns the seconds taken. */
function waitFor(game, done, maxS = 120) {
    for (let s = 1; s <= maxS; s++) {
        game.tick(game.now + 1000);
        if (done()) return s;
    }
    return Infinity;
}

test('after a fall the hero rests to full health, then fights on from where he retreated', () => {
    const game = fighter(15);
    const c = game.state.combat;
    const events = fall(game);
    assert.ok(events.some(e => e.type === 'death'));
    assert.equal(c.active, false);
    assert.equal(c.recovering, true);
    assert.equal(c.stage, 11, 'back to the start of the zone');
    const seconds = waitFor(game, () => c.active);
    assert.ok(seconds <= 30, `back in ${seconds} s (half health at ${100 * game.state.combat.hp / game.derived.maxHp}%)`);
    assert.equal(c.recovering, false);
    assert.equal(c.stage, 11);
    assert.ok(game.drainEvents().some(e => e.type === 'recovered'));
});

test('being told to stay at camp, or given work, calls it off', () => {
    const camp = fighter(15);
    fall(camp);
    camp.leaveCombat();                       // "Stay at camp"
    assert.equal(camp.state.combat.recovering, false);
    assert.equal(waitFor(camp, () => camp.state.combat.active, 90), Infinity, 'he stays out');

    const work = fighter(15);
    fall(work);
    assert.ok(work.startNodeAction('woodcutting', 'normal_log'));
    assert.equal(work.state.combat.recovering, false);
    work.stopAction();
    assert.equal(waitFor(work, () => work.state.combat.active, 90), Infinity, 'the end of the work is not a call to arms');
});

test('entering the fight at once (Enter combat) ends the rest early', () => {
    const game = fighter(15);
    fall(game);
    game.enterCombat();
    assert.equal(game.state.combat.active, true);
    assert.equal(game.state.combat.recovering, false);
});

test('a save keeps a hero resting after a fall, and an old save loads without the flag', () => {
    const game = fighter(15);
    fall(game);
    const saved = JSON.parse(game.serialize(T0));
    assert.equal(migrateState(saved, T0).combat.recovering, true);
    delete saved.combat.recovering;
    assert.equal(migrateState(saved, T0).combat.recovering, false);
    saved.combat.recovering = 'yes';
    assert.equal(migrateState(saved, T0).combat.recovering, false, 'only a real true counts');
});

test('a hero who falls early while away fights on through the absence', () => {
    // a fresh hero far beyond his strength: he falls again and again, but each time he gets up
    const game = fighter(1);
    Object.assign(game.state.combat, { stage: 28, maxStage: 28, bestStage: 28 });
    game.state.combat.enemy = null;
    game.tick(T0 + 200);
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 3 * 3600 * 1000;
    const back = new Game(saved, later);
    const summary = back.resumeFromSave(later);
    assert.equal(summary.mode, 'combat');
    assert.ok(summary.deaths >= 1, `${summary.deaths} falls`);
    assert.ok(summary.kills > 50, `${summary.kills} monsters defeated in three hours`);
    assert.equal(summary.stalledReason, null);
    assert.ok(back.state.combat.active || back.state.combat.recovering, 'still at it on return');
});
