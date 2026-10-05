// Gilded monsters (BALANCE.rewards.gilded*): now and then a regular monster of the stage ladder comes
// gilded, for five times the gold, twice the XP and a sure gem and essence. Bosses never do, and the
// Gold Rush medal makes them come more often.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { RESOURCES } from '../src/data/resources.js';
import { onEnemyDeath } from '../src/systems/combat.js';
import { checkAchievements } from '../src/systems/progress.js';

const T0 = 1_700_000_000_000;
const always = () => 0;          // every roll succeeds
const never = () => 0.999999;    // every roll fails

/** A hero fighting at `stage` (not his first fight: the first monster ever leaves a sword), its monster spawned with every roll coming from `source`. */
function fight(stage, source) {
    const game = new Game(null, T0);
    game.state.stats.kills = 10;
    Object.assign(game.state.combat, { stage, maxStage: stage, bestStage: stage });
    rng.setSource(source);
    game.enterCombat();
    rng.setSource(seededRandom(9));
    return game;
}

function kill(game) {
    const before = game.state.gold;
    game.drainEvents();
    game.state.combat.enemy.hp = 0;
    onEnemyDeath(game);
    return { gold: game.state.gold - before, ev: game.drainEvents().find(e => e.type === 'kill') };
}

test('now and then a regular monster comes gilded, and a boss never does', () => {
    const game = fight(3, always);
    const enemy = game.state.combat.enemy;
    assert.equal(enemy.gilded, true);
    assert.match(enemy.name, /^Gilded /);
    assert.equal(enemy.baseName, enemy.name.replace('Gilded ', ''), 'it counts as its kind in the bestiary');
    assert.ok(game.drainEvents().some(e => e.type === 'gilded'));
    assert.ok(!fight(3, never).state.combat.enemy.gilded);
    assert.ok(!fight(10, always).state.combat.enemy.gilded, 'the boss of stage 10');
});

test('a gilded monster pays five times the gold, twice the XP, and a gem and essence for certain', () => {
    const plain = fight(5, never);
    const gilded = fight(5, always);
    rng.setSource(never);            // no luck on top: only what a gilded monster always leaves
    const a = kill(plain);
    const b = kill(gilded);
    rng.setSource(seededRandom(9));
    assert.equal(b.gold, a.gold * BALANCE.rewards.gildedGoldMult);
    assert.equal(b.ev.xp, a.ev.xp * BALANCE.rewards.gildedXpMult);
    assert.deepEqual(a.ev.drops, []);
    assert.ok(b.ev.drops.some(d => d.id === 'essence' && d.qty >= BALANCE.rewards.gildedEssence[0]));
    assert.ok(b.ev.drops.some(d => RESOURCES[d.id]?.category === 'gem'));
    assert.equal(gilded.state.stats.gildedKills, 1);
    assert.equal(plain.state.stats.gildedKills, 0);
});

test('the Gold Rush medal makes gilded monsters come half as often again', () => {
    const game = new Game(null, T0);
    assert.equal(game.derived.gildedMult, 1);
    game.state.stats.gildedKills = 25;
    checkAchievements(game);
    game.recompute();
    assert.ok(game.state.achievements.gold_rush);
    assert.equal(game.derived.gildedMult, 1.5);
});
