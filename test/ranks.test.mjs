// The hero's rank (data/ranks.js): a title and a cloak earned by prestiging, worn on every sprite of him.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RANKS, rankFor, nextRank } from '../src/data/ranks.js';
import { SPRITES } from '../src/data/sprites.js';

test('ranks climb with prestiges, from the Recruit up', () => {
    assert.equal(rankFor(0).name, 'Recruit');
    assert.equal(rankFor(1).name, 'Adventurer');
    assert.equal(rankFor(4).name, 'Adventurer');
    assert.equal(rankFor(5).name, 'Veteran');
    assert.equal(rankFor(10_000).name, RANKS[RANKS.length - 1].name);
    assert.equal(nextRank(0).name, 'Adventurer');
    assert.equal(nextRank(5).prestiges, 15);
    assert.equal(nextRank(RANKS[RANKS.length - 1].prestiges), null);
    for (let i = 1; i < RANKS.length; i++) assert.ok(RANKS[i].prestiges > RANKS[i - 1].prestiges, 'in order');
});

test('every rank has its cloak in the atlas', () => {
    for (const r of RANKS) assert.ok(SPRITES[`hero/cloaks/${r.cloak}`], r.cloak);
    assert.equal(new Set(RANKS.map(r => r.cloak)).size, RANKS.length, 'each rank its own colour');
});

test('the hero can be named: one short line of plain text, kept in the save', async () => {
    const { Game } = await import('../src/game.js');
    const { migrateState } = await import('../src/core/state.js');
    const { heroName } = await import('../src/core/text.js');
    assert.equal(heroName('  Sir   Aldric\nthe Bold  '), 'Sir Aldric the Bold');
    assert.equal(heroName('<script>x</script>'), 'scriptx/script');
    assert.equal(heroName('A'.repeat(40)).length, 20);
    assert.equal(heroName(42), '');
    const T0 = 1_700_000_000_000;
    const game = new Game(null, T0);
    assert.equal(game.state.hero.name, '');
    game.setHeroName('  Aldric ');
    assert.equal(game.state.hero.name, 'Aldric');
    const saved = JSON.parse(game.serialize(T0));
    assert.equal(migrateState(saved, T0).hero.name, 'Aldric');
    delete saved.hero;
    assert.equal(migrateState(saved, T0).hero.name, '', 'an old save loads with no name');
    saved.hero = { name: { evil: true } };
    assert.equal(migrateState(saved, T0).hero.name, '');
});
