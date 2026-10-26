// A new monster drops in (BALANCE.combat.dropInMs; the owner, October 2026): no strike reaches it until it has landed, so on
// a stage where a strike fells a monster the clicks no longer set the pace (an auto-clicker farmed easy stages and
// dungeons four to five times as fast as an idle hero), while the hero's own swings never wait for it.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { BALANCE } from '../src/core/formulas.js';
import { clampTimers } from '../src/core/state.js';
import { droppingIn } from '../src/systems/combat.js';
import { rng, seededRandom } from '../src/core/rng.js';

const T0 = 1_760_000_000_000;
const DROP = BALANCE.combat.dropInMs;

/** A hero who fells anything on the first stages with a strike, fighting on stage 1, left alone an hour (Focus on). */
function strongHero() {
    const game = new Game(null, T0);
    game.state.equipped.Weapon = { id: 901, type: 'Weapon', tier: 7, name: 'Sword', rarity: 'common', atk: 1e6, def: 0, affixes: [], upgrade: 0 };
    game.state.meta.lastInputAt = T0 - 3600_000;
    game.recompute();
    game.setFarmMode(true);
    game.enterCombat();
    return game;
}

/** Kills in a minute of farming, clicking every `every` ms (0: never). */
function minute(every, seed = 1) {
    rng.setSource(seededRandom(seed));
    const game = strongHero();
    const kills = game.state.stats.kills || 0;
    let next = T0 + 1000;
    for (let t = T0 + 50; t <= T0 + 60000; t += 50) {
        game.tick(t);
        if (every && t >= next) { game.noteInput(t); game.clickAttack(); next += every; }
    }
    return game.state.stats.kills - kills;
}

test('a monster still dropping in is out of reach: the click does nothing and spends no quarter second; once it has landed, a strike lands', () => {
    const game = strongHero();
    const c = game.state.combat;
    const came = c.enemyAt;
    assert.equal(came, T0, 'the monster came as the fight began');
    game.tick(came + DROP - 100);
    const hp = c.enemy.hp;
    assert.equal(droppingIn(game.state, game.now), true);
    assert.equal(game.clickAttack(), false, 'out of reach');
    assert.deepEqual([c.enemy.hp, game.state.stats.strikes || 0, c.lastClickAt || 0, c.combo], [hp, 0, 0, 0]);
    game.tick(came + DROP);
    assert.equal(droppingIn(game.state, game.now), false);
    assert.equal(game.clickAttack(), true, 'landed: the strike lands');
    assert.equal(game.state.stats.strikes, 1);
});

test("his own swings never wait for it: idle, he fells a monster with every swing as before", () => {
    rng.setSource(seededRandom(2));
    const game = strongHero();
    const swing = game.derived.attackInterval;
    assert.ok(swing > DROP, `a swing (${swing} ms) comes after the drop-in`);
    assert.ok(BALANCE.combat.dropInMs < 1500 / 2, 'and so does the quickest swing there can be (attack speed +100%)');
    const kills = game.state.stats.kills || 0;
    for (let t = T0 + 50; t <= T0 + 60000; t += 50) game.tick(t);
    assert.equal(game.state.stats.kills - kills, Math.floor(60000 / swing), 'one a swing');
});

test('on an easy stage a hand at two clicks a second fells about as many as an auto-clicker, and neither runs away from an idle hero', () => {
    const idle = minute(0), hand = minute(500), auto = minute(50), slow = minute(1000);
    // an auto-clicker felled a monster with each strike, four a second: five times this idle hero's pace before
    assert.ok(auto <= 3 * idle, `auto-clicker ${auto} against idle ${idle}`);
    assert.ok(auto >= 1.5 * idle, `clicking still helps: ${auto} against ${idle}`);
    assert.ok(hand >= 0.88 * auto, `two clicks a second ${hand}, auto-clicker ${auto}`);
    assert.ok(slow >= idle * 0.9, `a click a second ${slow}, idle ${idle}`);
});

test('the Titan and the clan boss stand there from the start, and a clock turned back leaves no monster out of reach', () => {
    const game = strongHero();
    const s = game.state;
    s.combat.enemyAt = T0;
    assert.equal(droppingIn(s, T0 + 100), true, 'on the stages');
    s.combat.mode = 'dungeon';
    assert.equal(droppingIn(s, T0 + 100), true, 'in a dungeon');
    for (const mode of ['titan', 'clan']) {
        s.combat.mode = mode;
        assert.equal(droppingIn(s, T0 + 100), false, mode);
    }
    s.combat.mode = 'stages';
    s.combat.enemyAt = T0 + 3600_000;   // came "an hour from now": the clock was turned back
    assert.equal(droppingIn(s, T0), false);
    clampTimers(s, T0);
    assert.equal(s.combat.enemyAt, T0);
});
