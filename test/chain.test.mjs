// The chain (systems/chain.js; the owner, October 2026): five numbered points over the fight, struck in order before
// its clock runs out, for a flurry and combo. A click elsewhere or out of turn does nothing; a click counts every
// strikeGapMs at most; a random clicker almost never finishes one; clicking the monster strikes only the clan boss.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { chainReady, placePoints, giveChainFind } from '../src/systems/chain.js';
import { migrateState } from '../src/core/state.js';

const T0 = 1_760_000_000_000;
const b = BALANCE.chain;

/** A hero in a fight at stage `stage`, ticked to `ms` into it. */
function fighter(stage = 3, seed = 7) {
    rng.setSource(seededRandom(seed));
    const game = new Game(null, T0);
    const s = game.state;
    s.prestige.tokens = 2000;   // he outlasts the monsters, and his hits are big enough to measure
    s.combat.bestStage = stage; s.combat.maxStage = stage;
    game.recompute();
    game.setStage(stage);
    game.toggleCombat();
    game.tick(T0 + 100);   // the fight's first tick sets its first chain, firstMs on
    game.drainEvents();
    return game;
}
const at = (game, ms) => { game.tick(T0 + ms); };

test('the first chain comes 8 s into a fight; the next 20–30 s after one ends', () => {
    const game = fighter();
    at(game, 1000);
    const first = game.state.combat.chainAt;
    assert.equal(first, T0 + 100 + b.firstMs, 'set at the fight\'s first tick');
    at(game, first - T0 - 10);
    assert.equal(chainReady(game.state, game.now), false);
    assert.equal(game.startChain(2), null, 'not before its time');
    at(game, first - T0);
    assert.equal(chainReady(game.state, game.now), true);
    const chain = game.startChain(2);
    assert.equal(chain.points.length, b.points);
    for (const p of chain.points) assert.ok(p.x >= 0.1 && p.x <= 0.9 && p.y >= 0.16 && p.y <= 0.84, JSON.stringify(p));
    assert.equal(game.startChain(2), null, 'one at a time');
    // all five, a point every 300 ms
    let t = first - T0;
    for (let i = 0; i < b.points; i++) { t += 300; at(game, t); assert.equal(game.chainClick(i), true, `point ${i + 1}`); }
    const c = game.state.combat;
    assert.equal(c.chain, null);
    assert.ok(c.chainAt >= game.now + b.everyMs[0] && c.chainAt <= game.now + b.everyMs[1], 'the next in 20–30 s');
    assert.equal(game.state.stats.chains, 1);
});

test('struck in order: a flurry of three attacks and five combo; fast, a find always', () => {
    const game = fighter();
    at(game, b.firstMs + 1000);
    const c = game.state.combat;
    const atk = game.derived.atk;
    game.startChain(2);
    game.drainEvents();
    let t = b.firstMs + 1000;
    for (let i = 0; i < b.points; i++) { t += 260; at(game, t); game.chainClick(i); }
    const events = game.drainEvents();
    const done = events.find(e => e.type === 'chainDone');
    assert.ok(done, 'finished');
    assert.equal(done.fast, true, `${done.ms} ms`);
    assert.ok(done.find, 'a fast chain always finds something');
    const flurry = events.find(e => e.type === 'hit' && e.flurry);
    const comboMult = 1 + Math.min(BALANCE.combat.comboMax, c.combo) * BALANCE.combat.comboDmgPerStack;
    const plain = flurry.dmg / (flurry.crit ? game.derived.critDmg : 1) / comboMult / atk;
    assert.ok(plain > b.flurry * 0.88 && plain < b.flurry * 1.12, `a flurry of ${plain.toFixed(2)} attacks`);
    assert.ok(c.combo >= b.combo - 0.1 && c.combo <= b.combo, `combo ${c.combo}`);
    assert.equal(events.filter(e => e.type === 'chainHit').length, b.points);
    assert.equal(game.state.stats.chainsFast, 1);
});

test('a click out of turn, elsewhere, or too soon after the last does nothing, and costs nothing', () => {
    const game = fighter();
    let t = b.firstMs + 500;
    at(game, t);
    const chain = game.startChain(2);
    const c = game.state.combat;
    t += 300; at(game, t);
    assert.equal(game.chainClick(2), false, 'the 3 before the 1');
    assert.equal(c.chain.next, 0);
    t += 300; at(game, t);
    assert.equal(game.chainClick(null), false, 'the monster, the ground');
    t += 100; at(game, t);
    assert.equal(game.chainClick(0), false, 'within a quarter second of the last click: not counted');
    assert.equal(c.chain.next, 0);
    t += 200; at(game, t);
    assert.equal(game.chainClick(0), true, 'counted now');
    for (let i = 1; i < b.points; i++) { t += 300; at(game, t); assert.equal(game.chainClick(i), true); }
    assert.equal(c.chain, null, 'finished, whatever came between');
    assert.ok(chain);
});

test('its clock runs out: the chain goes, nothing is lost, the next is set', () => {
    const game = fighter();
    let t = b.firstMs + 500;
    at(game, t);
    game.startChain(2);
    t += 300; at(game, t); game.chainClick(0);
    const combo = game.state.combat.combo;
    game.drainEvents();
    t += b.ms; at(game, t);
    const c = game.state.combat;
    assert.equal(c.chain, null);
    assert.ok(game.drainEvents().some(e => e.type === 'chainMissed'));
    assert.ok(c.combo <= combo, 'no combo from it');
    assert.ok(c.chainAt >= game.now + b.everyMs[0] - 100 && c.chainAt <= game.now + b.everyMs[1]);
    assert.equal(game.chainClick(1), false, 'gone');
});

test('a random clicker almost never finishes a chain; one who aims finishes every one', () => {
    rng.setSource(seededRandom(3));
    // where a random click lands: each point covers about 5% of the fight, the rest is ground
    const share = 0.05;
    const randomClicker = game => {
        const r = Math.random();
        return r < share * b.points ? Math.floor(r / share) : null;
    };
    let finished = 0;
    const runs = 3000;
    for (let n = 0; n < runs; n++) {
        const game = fighter(3, n + 1);
        let t = b.firstMs + 100;
        at(game, t);
        if (!game.startChain(2)) continue;
        // as fast as the game counts clicks (one a quarter second), for the chain's whole four seconds
        for (let k = 0; k * BALANCE.combat.strikeGapMs <= b.ms; k++) {
            t += BALANCE.combat.strikeGapMs; at(game, t);
            game.chainClick(randomClicker(game));
            if (!game.state.combat.chain) break;
        }
        if (game.state.stats.chains > 0) finished++;
    }
    assert.ok(finished / runs < 0.005, `a random clicker finished ${finished} of ${runs}`);
    // one who sees them: the first after a quarter second, then one every 0.6 s, in order
    let aimed = 0;
    for (let n = 0; n < 50; n++) {
        const game = fighter(3, n + 100);
        let t = b.firstMs + 100;
        at(game, t);
        game.startChain(2);
        t += 250;
        for (let i = 0; i < b.points; i++) { t += 600; at(game, t); game.chainClick(i); }
        if (game.state.stats.chains === 1) aimed++;
    }
    assert.equal(aimed, 50);
});

test('the points fall anywhere inside the margins, apart from one another, on wide and narrow fights', () => {
    rng.setSource(seededRandom(9));
    for (const aspect of [0.8, 1.3, 2, 3.4]) {
        for (let n = 0; n < 200; n++) {
            const pts = placePoints(b.points, aspect);
            assert.equal(pts.length, b.points);
            for (let i = 0; i < pts.length; i++) for (let j = 0; j < i; j++) {
                const d = Math.hypot((pts[i].x - pts[j].x) * aspect, pts[i].y - pts[j].y);
                assert.ok(d >= b.spacing * 0.85 ** 5 - 1e-9, `aspect ${aspect}: ${d}`);
            }
        }
    }
    // no grid: over many chains the points land on hundreds of different spots
    const spots = new Set();
    for (let n = 0; n < 200; n++) for (const p of placePoints(b.points, 2)) spots.add(`${Math.round(p.x * 50)},${Math.round(p.y * 50)}`);
    assert.ok(spots.size > 500, `${spots.size} spots`);
});

test('clicking the monster strikes only the clan boss; no chain in the clan fight', () => {
    const game = fighter();
    at(game, 1000);
    assert.equal(game.clickAttack(), false, 'the stages: a click strikes no more');
    assert.equal(game.state.stats.strikes, 0);
    game.state.combat.mode = 'clan';
    game.state.combat.chainAt = T0;
    assert.equal(chainReady(game.state, T0 + 5000), false, 'the clan boss has its openings, not a chain');
});

test('the combo fades evenly, a full one over 30 s, outside the clan fight', () => {
    const game = fighter();
    at(game, 1000);
    const c = game.state.combat;
    c.combo = BALANCE.combat.comboMax;
    c.chainAt = T0 + 10 * 60000;   // no chain meanwhile
    at(game, 1000 + b.comboFadeMs / 2);
    assert.ok(Math.abs(c.combo - BALANCE.combat.comboMax / 2) < 0.3, `half gone at 15 s: ${c.combo}`);
    at(game, 1000 + b.comboFadeMs + 1000);
    assert.equal(c.combo, 0);
});

test('a find: gold most often, essence once it has turned up, a bottle of the picked potion, the best dish', () => {
    const game = fighter(20);
    at(game, 1000);
    const s = game.state;
    const tally = () => { const t = {}; for (let n = 0; n < 400; n++) { const f = giveChainFind(game); t[f.kind] = (t[f.kind] || 0) + 1; } return t; };
    const goldBefore = s.gold;
    assert.deepEqual(Object.keys(tally()), ['gold'], 'nothing else to find yet');
    assert.ok(s.gold > goldBefore);
    s.resources.essence = 1;
    s.resources.cooked_shrimp = 3;
    s.resources.combat_potion_1 = 1;
    s.combat.potion = 'combat_potion_1';
    const t = tally();
    assert.ok(t.gold > t.essence && t.essence > 0 && t.potion > 0 && t.food > 0, JSON.stringify(t));
    assert.ok(s.resources.cooked_shrimp >= 3 + 2 * t.food - 1);
});

test('a chain never outlasts its fight or a reload, and nothing is lost', () => {
    const game = fighter();
    at(game, b.firstMs + 500);
    game.startChain(2);
    assert.ok(game.state.combat.chain);
    const loaded = migrateState(JSON.parse(game.serialize(game.now)), game.now);
    assert.equal(loaded.combat.chain, null);
    game.toggleCombat();   // he leaves the fight
    at(game, b.firstMs + 700);
    assert.equal(game.state.combat.chain, null);
});
