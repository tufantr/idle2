// The hero's rank (data/ranks.js): a title and a cloak earned by prestiging, worn on every sprite of the
// hero; and the hero's own name and look.
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

test('the hero has a look: saved, checked on load, and drawn from its own body and hair', async () => {
    const { LOOKS, DEFAULT_LOOK, nextLook } = await import('../src/data/looks.js');
    const { heroLayers, hasSprite } = await import('../src/ui/sprites.js');
    const { Game } = await import('../src/game.js');
    const { migrateState } = await import('../src/core/state.js');
    const T0 = 1_700_000_000_000;
    const game = new Game(null, T0);
    assert.equal(game.state.hero.look, DEFAULT_LOOK);
    assert.ok(game.setHeroLook('raven'));
    const saved = JSON.parse(game.serialize(T0));
    assert.equal(migrateState(saved, T0).hero.look, 'raven');
    saved.hero.look = 'goblin';
    assert.equal(migrateState(saved, T0).hero.look, DEFAULT_LOOK, 'an unknown look is the first');
    delete saved.hero.look;
    assert.equal(migrateState(saved, T0).hero.look, DEFAULT_LOOK, 'an old save has the first look');
    // the arrows go round the looks open to everyone
    const lastOpen = LOOKS.filter(l => !l.medal).at(-1).id;
    assert.equal(nextLook(lastOpen, 1), LOOKS[0].id);
    assert.equal(nextLook(LOOKS[0].id, -1), lastOpen);
    // every look is in the atlas, and the hero is drawn from it (a helmet hides the hair)
    for (const l of LOOKS) {
        assert.ok(hasSprite(`hero/look/${l.id}/base`), l.id);
        if (l.hair) assert.ok(hasSprite(`hero/look/${l.id}/hair`), l.id);
    }
    const layers = heroLayers(game.state);
    assert.ok(layers.includes('hero/look/raven/base') && layers.includes('hero/look/raven/hair'));
    game.state.equipped.Head = { type: 'Head', tier: 2 };
    assert.ok(!heroLayers(game.state).includes('hero/look/raven/hair'));
});

test('the volume setting is kept between 0 and 1, and old saves are at full volume', async () => {
    const { Game } = await import('../src/game.js');
    const { migrateState } = await import('../src/core/state.js');
    const T0 = 1_700_000_000_000;
    const saved = JSON.parse(new Game(null, T0).serialize(T0));
    assert.equal(migrateState(saved, T0).settings.volume, 1);
    saved.settings.volume = 0.35;
    assert.equal(migrateState(saved, T0).settings.volume, 0.35);
    saved.settings.volume = 7;
    assert.equal(migrateState(saved, T0).settings.volume, 1);
    saved.settings.volume = 'loud';
    assert.equal(migrateState(saved, T0).settings.volume, 1);
    delete saved.settings.volume;
    assert.equal(migrateState(saved, T0).settings.volume, 1);
});

test('some looks are earned with a medal: closed until it is won, then worn like any other', async () => {
    const { LOOKS, lookOpen, lookForMedal, nextLook, DEFAULT_LOOK } = await import('../src/data/looks.js');
    const { ACHIEVEMENTS } = await import('../src/data/achievements.js');
    const { hasSprite } = await import('../src/ui/sprites.js');
    const { Game } = await import('../src/game.js');
    const { migrateState } = await import('../src/core/state.js');
    const T0 = 1_700_000_000_000;
    const earned = LOOKS.filter(l => l.medal);
    assert.equal(earned.length, 6);
    for (const l of earned) {
        assert.ok(ACHIEVEMENTS.some(a => a.id === l.medal), `${l.id}: its medal exists`);
        assert.ok(l.name, `${l.id}: it has a name for its card`);
        assert.ok(hasSprite(`hero/look/${l.id}/base`), `${l.id}: in the atlas`);
        assert.equal(lookForMedal(l.medal), l);
    }
    const game = new Game(null, T0);
    assert.equal(game.setHeroLook('demon'), false, 'not before Abyss Walker');
    assert.notEqual(game.state.hero.look, 'demon');
    assert.ok(!LOOKS.filter(l => lookOpen(game.state, l)).some(l => l.medal), 'a new hero has only the open looks');
    assert.equal(nextLook('dwarf', 1, game.state), LOOKS[0].id, 'the arrows go round the open looks only');

    game.state.achievements.boss_10 = true;
    assert.ok(game.setHeroLook('demon'));
    assert.equal(game.state.hero.look, 'demon');
    const saved = JSON.parse(game.serialize(T0));
    assert.equal(migrateState(saved, T0).hero.look, 'demon');
    delete saved.achievements.boss_10;                 // a save that claims the look without the medal
    assert.equal(migrateState(saved, T0).hero.look, DEFAULT_LOOK);
});
