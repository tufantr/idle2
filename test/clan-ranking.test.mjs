// The week's clan ranking (data/social.js ENDLESS, CLAN_DIVISIONS; DESIGN §3.18): divisions by the levels felled, the
// Endless Hydra's depth, a clan's score from its best members, and the fight against it in the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { ENDLESS, CLAN_DIVISIONS, CLAN_FIGHT_MS, divisionOf, endlessDepth, endlessDamageAt, clanDepthScore } from '../src/data/social.js';

rng.setSource(seededRandom(7));
const T0 = 1_760_000_000_000;

test("a clan's division comes from the levels of the week's boss it felled", () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(k => divisionOf(k).id), ['bronze', 'bronze', 'bronze', 'silver', 'silver', 'gold', 'gold', 'champion']);
    assert.equal(CLAN_DIVISIONS[0].id, 'champion', 'the top division first');
});

test("depth: a new hero's whole fight reaches its first level; a thousandfold hero goes about 38 levels deeper, not a thousand times as far", () => {
    assert.equal(endlessDepth(0), 0);
    assert.equal(endlessDepth(-5), 0);
    assert.equal(endlessDepth(NaN), 0);
    assert.equal(endlessDepth(Infinity), 0);
    assert.ok(Math.abs(endlessDepth(ENDLESS.base) - 1) < 1e-9, "its first level: a new hero's fight");
    for (const d of [1e6, 1e9, 1e15]) {   // (a hero past his first fights: below, the first levels are shallower)
        const gap = endlessDepth(d * 1000) - endlessDepth(d);
        assert.ok(gap > 37 && gap < 38.5, `${d}: +${gap.toFixed(2)} levels`);
        assert.ok(Math.abs(endlessDamageAt(endlessDepth(d)) / d - 1) < 1e-9, 'the damage a depth takes, the other way round');
    }
    let last = 0;
    for (let d = 1; d < 1e25; d *= 3.7) { const depth = endlessDepth(d); assert.ok(depth > last); last = depth; }
});

test("a clan's depth is its best members' together, at most ENDLESS.counted of them", () => {
    assert.deepEqual(clanDepthScore([]), { score: 0, counted: 0 });
    assert.deepEqual(clanDepthScore([10.04, 20.03, 0, -1, NaN]), { score: 30.1, counted: 2 });
    const many = Array.from({ length: ENDLESS.counted + 5 }, (_, i) => i + 1);
    const top = many.slice(-ENDLESS.counted).reduce((a, b) => a + b, 0);
    assert.deepEqual(clanDepthScore(many), { score: top, counted: ENDLESS.counted }, 'the five shallowest left out');
});

test('the Endless Hydra in the game: it never falls, what the hero deals adds up, and the attack waits to be sent as one at it', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    assert.equal(game.startClanFight({ week: '2026-W44', endless: true, scale: 3 }), true);
    const c = game.state.combat;
    assert.equal(c.mode, 'clan');
    assert.deepEqual([c.enemy.endless, c.enemy.name], [true, ENDLESS.name]);
    game.drainEvents();
    for (let t = T0 + 1000; t <= T0 + CLAN_FIGHT_MS + 2000; t += 1000) game.tick(t);
    assert.equal(c.mode, 'stages', 'over when its clock ran out');
    const [over] = game.drainEvents().filter(e => e.type === 'clanFight');
    assert.deepEqual([over.reason, over.endless], ['time', true], 'it never fell');
    assert.ok(over.dealt > 0, 'what the hero dealt added up');
    assert.equal(game.state.clanResult.endless, true);
    const reloaded = new Game(JSON.parse(game.serialize()), game.now);
    assert.equal(reloaded.state.clanResult.endless, true, 'kept across a reload as an attack at the Hydra');
    // a regular attack's result says nothing of the Hydra
    game.clearClanResult();
    game.startClanFight({ week: '2026-W44', hp: 1e12, maxHp: 1e12 });
    const start = game.now;
    for (let t = start + 1000; t <= start + CLAN_FIGHT_MS + 2000; t += 1000) game.tick(t);
    assert.equal(game.state.clanResult.endless, undefined);
});
