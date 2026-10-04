// The world: the first step ever into a zone is announced once (not again after a prestige, not
// for the Abyss's deeper depths, not while away); every seventh daily crate is a great one; and the
// secret medals.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { ZONES, STAGES_PER_ZONE } from '../src/data/zones.js';
import { onEnemyDeath, onPlayerDeath } from '../src/systems/combat.js';

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

test('secret medals: hidden until earned, for patting the pet, a great crate and getting back up', async () => {
    const { ACHIEVEMENTS, medalShown } = await import('../src/data/achievements.js');
    const { checkAchievements } = await import('../src/systems/progress.js');
    const game = new Game(null, T0);
    const secret = ACHIEVEMENTS.filter(a => a.secret);
    assert.deepEqual(secret.map(a => a.id), ['companion', 'great_crate', 'unbroken']);
    for (const a of secret) assert.equal(medalShown(game.state, a), false);

    assert.equal(game.patPet(), false, 'no pet, no pat');
    game.state.pets.fang = true;
    for (let i = 0; i < 25; i++) game.patPet();
    assert.equal(game.state.stats.petPats, 25);

    game.state.daily.claimed = 6;
    game.state.daily.banked = 1;
    assert.ok(game.claimDaily().great);
    assert.equal(game.state.stats.greatCrates, 1);

    game.state.stats.recoveries = 99;
    game.enterCombat();
    game.state.combat.hp = 0;
    onPlayerDeath(game);   // a fall, staged
    game.state.combat.hp = game.derived.maxHp;
    game.tick(game.now + 1000);
    assert.equal(game.state.stats.recoveries, 100);

    checkAchievements(game);
    const events = game.drainEvents().filter(e => e.type === 'achievement' && e.secret).map(e => e.id).sort();
    assert.deepEqual(events, ['companion', 'great_crate', 'unbroken']);
    for (const a of secret) assert.equal(medalShown(game.state, a), true);
});

test('the gear codex fills a page for each kind and tier found, kept or salvaged, and old saves count what they carry', async () => {
    const { CODEX_SIZE, CODEX_TYPES, RARITIES } = await import('../src/data/items.js');
    const rarity = id => RARITIES.find(r => r.id === id);
    const { generateEquipment } = await import('../src/core/formulas.js');
    const { addItem } = await import('../src/systems/inventory.js');
    const { migrateState } = await import('../src/core/state.js');
    assert.equal(CODEX_TYPES.length, 10);
    assert.equal(CODEX_SIZE, 70);
    const game = new Game(null, T0);
    assert.deepEqual(game.state.codex, {});
    game.state.settings.autoSalvage = 'common';
    game.state.equipped.Weapon = generateEquipment({ type: 'Weapon', tier: 4, power: 1, materialName: 'Adamant', source: 'drop', rarity: rarity('rare') }, 500);
    const sword = generateEquipment({ type: 'Weapon', tier: 2, power: 1, materialName: 'Iron', source: 'drop', rarity: rarity('common') }, 501);
    const kept = addItem(game, sword);
    assert.equal(kept.kept, false, 'a common drop is salvaged as it lands');
    assert.equal(game.state.codex['Weapon/2'], true, 'but it was found');
    addItem(game, generateEquipment({ type: 'Ring', tier: 5, power: 1, materialName: 'Ruby', source: 'crafted', rarity: rarity('rare') }, 502));
    assert.equal(game.state.stats.codexFound, 2, 'the worn sword was never added, so it is not a page yet');

    const saved = JSON.parse(game.serialize(T0));
    delete saved.codex;                                  // a save from before the codex
    saved.equipped.Head = generateEquipment({ type: 'Head', tier: 3, power: 1, materialName: 'Mithril', source: 'drop', rarity: rarity('common') }, 503);
    let state = migrateState(saved, T0);
    assert.deepEqual(Object.keys(state.codex).sort(), ['Head/3', 'Ring/5', 'Weapon/4'], 'what it carries and wears counts');
    saved.codex = { 'Weapon/2': true, 'Wand/1': true, 'Weapon/9': true, 'Head/3': 'yes' };
    state = migrateState(saved, T0);
    assert.deepEqual(Object.keys(state.codex).sort(), ['Head/3', 'Ring/5', 'Weapon/2', 'Weapon/4']);
    assert.equal(state.stats.codexFound, 4);
});
