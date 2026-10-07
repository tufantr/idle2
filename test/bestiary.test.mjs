// The bestiary (data/bestiary.js): every kind of monster listed once, defeats counted per kind, a star
// at 10, 100 and 1,000, saves that keep the counts (and drop what they don't know), and the medals.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { BESTIARY, BESTIARY_NAMES, BESTIARY_SIZE, KILL_STARS, starsFor, nextStarAt, bestiaryStars } from '../src/data/bestiary.js';
import { ZONES } from '../src/data/zones.js';
import { STRATA } from '../src/data/strata.js';
import { DUNGEONS } from '../src/data/dungeons.js';
import { onEnemyDeath } from '../src/systems/combat.js';
import { checkAchievements } from '../src/systems/progress.js';

rng.setSource(seededRandom(77));
const T0 = 1_700_000_000_000;

test('every monster of every zone, stratum and dungeon is in the bestiary, once', () => {
    const all = new Set([...ZONES.flatMap(z => [...z.monsters, z.boss]), ...STRATA.flatMap(s => [...s.monsters, s.boss]), ...DUNGEONS.flatMap(d => [...d.monsters.map(m => m.name), d.boss.name])]);
    assert.equal(BESTIARY_SIZE, all.size);
    for (const name of all) assert.ok(BESTIARY_NAMES.has(name), name);
    const listed = BESTIARY.flatMap(g => g.monsters.map(m => m.name));
    assert.equal(listed.length, new Set(listed).size, 'a name is listed once');
    assert.equal(BESTIARY.filter(g => g.kind === 'zone').length, ZONES.length);
    assert.equal(BESTIARY.filter(g => g.kind === 'stratum').length, STRATA.length - 1, 'the first stratum is the Abyss zone\'s own');
    // every place's kinds stand on a stage of that place
    for (const g of BESTIARY.filter(x => x.kind !== 'dungeon')) for (const m of g.monsters) assert.ok(m.at >= g.from, `${m.name} at ${m.at}`);
});

test('stars come at 10, 100 and 1,000 defeats', () => {
    assert.deepEqual(KILL_STARS, [10, 100, 1000]);
    assert.deepEqual([0, 9, 10, 99, 100, 999, 1000, 5000].map(starsFor), [0, 0, 1, 1, 2, 2, 3, 3]);
    assert.deepEqual([0, 10, 150, 1000].map(nextStarAt), [10, 100, 1000, null]);
    assert.equal(bestiaryStars({ Slime: 120, Rat: 10, 'Not a monster': 5000 }), 3);
});

test('a defeat counts toward its kind, and the tenth earns a star', () => {
    const game = new Game(null, T0);
    game.enterCombat();
    const enemy = game.state.combat.enemy;
    const events = [];
    for (let i = 0; i < 10; i++) {
        game.state.combat.enemy = { ...enemy, hp: 0 };
        game.state.combat.farmMode = true;           // stay on the stage: the same kind each time
        onEnemyDeath(game);
        events.push(...game.drainEvents().filter(e => e.type === 'bestiaryStar'));
    }
    assert.equal(game.state.stats.killsByMonster[enemy.baseName], 10);
    assert.equal(game.state.stats.bestiaryStars, 1);
    assert.equal(events.length, 1);
    assert.deepEqual({ name: events[0].name, stars: events[0].stars, kills: events[0].kills }, { name: enemy.baseName, stars: 1, kills: 10 });
});

test('a save keeps the counts, recounts the stars and drops unknown names', () => {
    const game = new Game(null, T0);
    game.state.stats.killsByMonster = { Slime: 150, Wolf: 12 };
    const saved = JSON.parse(game.serialize(T0));
    saved.stats.killsByMonster['Not a monster'] = 99;
    saved.stats.killsByMonster.Rat = 'lots';
    saved.stats.bestiaryStars = 999;
    const state = migrateState(saved, T0);
    assert.deepEqual(state.stats.killsByMonster, { Slime: 150, Wolf: 12 });
    assert.equal(state.stats.bestiaryStars, 3);
});

test('an old save without a bestiary loads with an empty one', () => {
    const game = new Game(null, T0);
    const saved = JSON.parse(game.serialize(T0));
    delete saved.stats.killsByMonster;
    delete saved.stats.bestiaryStars;
    const state = migrateState(saved, T0);
    assert.deepEqual(state.stats.killsByMonster, {});
    assert.equal(state.stats.bestiaryStars, 0);
});

test('25 stars earn the Naturalist medal', () => {
    const game = new Game(null, T0);
    game.state.stats.bestiaryStars = 24;
    checkAchievements(game);
    assert.ok(!game.state.achievements.naturalist);
    game.state.stats.bestiaryStars = 25;
    checkAchievements(game);
    assert.ok(game.state.achievements.naturalist);
});

test('the welcome-back report counts the bestiary stars earned while away', () => {
    const game = new Game(null, T0);
    game.state.prestige.tokens = 500;      // strong enough not to fall
    game.state.combat.farmMode = true;     // and staying on stage 1: one kind, falling again and again
    game.recompute();
    game.enterCombat();
    const saved = JSON.parse(game.serialize(T0));
    const later = T0 + 2 * 3600 * 1000;
    const back = new Game(saved, later);
    const summary = back.resumeFromSave(later);
    assert.ok(summary.kills > 20, `${summary.kills} kills`);
    assert.ok(summary.stars >= 1);
    assert.equal(summary.stars, back.state.stats.bestiaryStars);
    assert.equal(summary.gilded, back.state.stats.gildedKills);
});
