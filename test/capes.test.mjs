// Skill capes: level 99 earns the skill's cape for good; its bonus counts whichever cape is worn; the
// hero puts the new one on; any earned cape (or the rank's cloak) can be worn; saves keep only a cape
// that was earned.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { SKILL_IDS } from '../src/data/skills.js';
import { CAPES, capeFor, capeEarned, capesEarned, capeWorn } from '../src/data/capes.js';
import { collectModifiers } from '../src/core/modifiers.js';
import { grantXp } from '../src/systems/progress.js';
import { heroLayers } from '../src/ui/sprites.js';
import { SPRITES } from '../src/data/sprites.js';
import { migrateState } from '../src/core/state.js';

rng.setSource(seededRandom(3));
const T0 = 1_700_000_000_000;

test('every skill has one cape, and each has its picture in the atlas', () => {
    assert.deepEqual(CAPES.map(c => c.skill).sort(), [...SKILL_IDS].sort());
    for (const c of CAPES) assert.ok(SPRITES[`hero/capes/${c.skill}`], `hero/capes/${c.skill}`);
});

test('a cape is earned at 99, and its bonus counts for good, whichever cape is worn', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.mining.xp = xpForLevel(98);
    assert.equal(capeEarned(s, 'mining'), false);
    const before = collectModifiers(s).doubleChance.mining;
    s.skills.mining.xp = xpForLevel(99);
    assert.equal(capeEarned(s, 'mining'), true);
    assert.equal(+(collectModifiers(s).doubleChance.mining - before).toFixed(6), 0.1);
    s.hero.cape = '';   // the rank's cloak worn: the bonus stays
    assert.equal(+(collectModifiers(s).doubleChance.mining - before).toFixed(6), 0.1);
    const atk = collectModifiers(s).atkMult;
    s.skills.combat.xp = xpForLevel(99);
    assert.equal(+(collectModifiers(s).atkMult - atk).toFixed(6), +(0.05 + 0.012 * 98).toFixed(6), 'combat 99: its levels and its cape');
});

test('reaching 99 puts the new cape on; the worn cape shows on the hero', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.fishing.xp = xpForLevel(99) - 5;
    assert.equal(capeWorn(s), null);
    assert.ok(heroLayers(s).some(k => k.startsWith('hero/cloaks/')), "the rank's cloak at first");
    grantXp(game, 'fishing', 10);
    assert.equal(s.hero.cape, 'fishing');
    assert.equal(capeWorn(s), capeFor('fishing'));
    assert.ok(heroLayers(s).includes('hero/capes/fishing'));
    assert.ok(!heroLayers(s).some(k => k.startsWith('hero/cloaks/')));
    grantXp(game, 'fishing', 1000);   // past 99 already: nothing changes
    s.hero.cape = '';
    grantXp(game, 'fishing', 1000);
    assert.equal(s.hero.cape, '', 'only the first time a skill reaches 99');
});

test('the hero can wear any earned cape or the rank\'s cloak, never one not earned', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.cooking.xp = xpForLevel(99);
    s.skills.agility.xp = xpForLevel(99);
    assert.deepEqual(capesEarned(s).map(c => c.skill).sort(), ['agility', 'cooking']);
    assert.equal(game.setHeroCape('mining'), false);
    assert.equal(game.setHeroCape('cooking'), true);
    assert.equal(s.hero.cape, 'cooking');
    assert.equal(game.setHeroCape('agility'), true);
    assert.equal(game.setHeroCape(''), true);
    assert.equal(s.hero.cape, '');
    assert.equal(capeWorn(s), null);
});

test('a save keeps the cape worn only if it was earned; old saves wear the rank\'s cloak', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.hunting.xp = xpForLevel(99);
    const kept = migrateState(JSON.parse(JSON.stringify({ ...s, hero: { ...s.hero, cape: 'hunting' } })), T0);
    assert.equal(kept.hero.cape, 'hunting');
    const edited = migrateState(JSON.parse(JSON.stringify({ ...s, hero: { ...s.hero, cape: 'mining' } })), T0);
    assert.equal(edited.hero.cape, '');
    const old = JSON.parse(JSON.stringify(s));
    delete old.hero.cape;
    assert.equal(migrateState(old, T0).hero.cape, '');
});
