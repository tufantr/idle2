// The Abyss's strata (DESIGN §3.7): named layers of 25 stages from stage 101, each with its own monsters,
// a card when first reached and its own painting; the scaling, loot and gear depth stay the Abyss's.
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { STRATA, STRATA_FROM, STRATUM_STAGES, stratumForStage, stratumStartingAt } from '../src/data/strata.js';
import { ZONES, zoneForStage, abyssGearTier } from '../src/data/zones.js';
import { enemyForStage } from '../src/core/formulas.js';
import { SPRITES } from '../src/data/sprites.js';
import { spawnEnemy, onEnemyDeath } from '../src/systems/combat.js';

rng.setSource(seededRandom(5));
const T0 = 1_700_000_000_000;

test('the strata stack from stage 101, 25 stages each, the last going on below', () => {
    assert.equal(stratumForStage(100), null);
    assert.equal(stratumForStage(STRATA_FROM).id, 'abyss');
    assert.equal(stratumForStage(125).id, 'abyss');
    assert.equal(stratumForStage(126).id, STRATA[1].id);
    const lastFrom = STRATA_FROM + (STRATA.length - 1) * STRATUM_STAGES;
    assert.equal(stratumForStage(lastFrom).id, STRATA.at(-1).id);
    assert.equal(stratumForStage(lastFrom + 5000).id, STRATA.at(-1).id);
    assert.equal(stratumStartingAt(126).id, STRATA[1].id);
    assert.equal(stratumStartingAt(127), null);
    assert.equal(stratumStartingAt(lastFrom + STRATUM_STAGES), null, 'no card below the last');
});

test('a stratum is the Abyss with its own name and monsters: the same scaling, loot and gear depth', () => {
    const stage = 137;
    const z = zoneForStage(stage);
    const s = stratumForStage(stage);
    assert.equal(z.id, 'abyss');
    assert.equal(z.stratum, s.id);
    assert.equal(z.name, s.name);
    assert.deepEqual(z.monsters, s.monsters);
    assert.equal(z.depth, Math.floor((stage - 1) / 10) - ZONES.length + 1);
    assert.equal(z.gearTier, abyssGearTier(z.depth));
    assert.deepEqual(z.loot, ZONES.at(-1).loot);
    // its boss stands on the tenth stages, its four kinds between
    assert.equal(enemyForStage(140).baseName, s.boss);
    assert.ok(s.monsters.includes(enemyForStage(141).baseName));
});

test('every stratum has a name, a line, four kinds and a boss of its own, each with a sprite', () => {
    const names = new Set(ZONES.flatMap(z => [...z.monsters, z.boss]));
    for (const [i, s] of STRATA.entries()) {
        assert.ok(s.name && s.line && s.monsters.length === 4 && s.boss, s.id);
        assert.ok(existsSync(new URL(`../assets/paint/${s.id}.webp`, import.meta.url)), `a painting for ${s.id}`);
        if (i === 0) continue;   // the first is the Abyss zone's own
        for (const m of [...s.monsters, s.boss]) {
            assert.ok(!names.has(m), `${m} is met once`);
            names.add(m);
            assert.ok(SPRITES[`mon/${m}`], `a sprite for ${m}`);
        }
    }
});

test('the first step ever into a stratum is a card; a return is not', () => {
    const game = new Game(null, T0);
    const c = game.state.combat;
    const reach = stage => {
        Object.assign(c, { stage: stage - 1, maxStage: stage - 1, bestStage: Math.max(c.bestStage, stage - 1), mode: 'stages', farmMode: false, regroupLeft: 0 });
        spawnEnemy(game);
        game.drainEvents();
        onEnemyDeath(game);
        return game.drainEvents().filter(e => e.type === 'zoneReached');
    };
    assert.deepEqual(reach(STRATA_FROM).map(e => e.zone), [], 'stage 101 is still the Abyss, met at 91');
    assert.deepEqual(reach(126).map(e => [e.zone, e.stratum]), [[STRATA[1].id, true]]);
    c.bestStage = 200;
    assert.deepEqual(reach(126), [], 'not twice');
});
