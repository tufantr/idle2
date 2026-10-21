// The chain (systems/chain.js; the owner, October 2026): five numbered points over the fight, struck in order before
// its clock runs out, for a little gold, and a quick one rallies the hero. A click elsewhere or out of turn does
// nothing; the chain counts a click every clickGapMs at most; a random clicker almost never finishes one. Strikes on
// the monster are as they were, and the chain never gets in their way: its points keep off the monster, its clicks
// keep a clock of their own, and striking its points keeps the combo.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE, goldPerKillAtStage } from '../src/core/formulas.js';
import { chainReady, placePoints } from '../src/systems/chain.js';
import { BASE } from '../src/core/modifiers.js';
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

test('struck in order: a little gold; struck fast, a rally of attack speed for a few seconds', () => {
    const game = fighter();
    at(game, b.firstMs + 1000);
    const c = game.state.combat;
    const speed = game.derived.attackInterval;
    // a slow chain: gold only
    game.startChain(2);
    let t = b.firstMs + 1000;
    const goldBefore = game.state.gold;
    for (let i = 0; i < b.points; i++) { t += 700; at(game, t); game.chainClick(i); }
    let done = game.drainEvents().find(e => e.type === 'chainDone');
    assert.ok(done && !done.fast, `${done?.ms} ms`);
    assert.equal(done.gold, goldPerKillAtStage(c.stage, game.derived.goldMult) * b.goldKills, 'a couple of kills\' gold at the stage');
    assert.ok(game.state.gold >= goldBefore + done.gold);
    assert.equal(game.derived.rally, false);
    assert.equal(c.combo, 0, 'no combo from a chain: strikes build it');
    // a fast one: the rally, a little more attack speed, for its seconds
    c.chainAt = game.now;
    game.startChain(2);
    for (let i = 0; i < b.points; i++) { t += 300; at(game, t); game.chainClick(i); }
    done = game.drainEvents().find(e => e.type === 'chainDone');
    assert.ok(done.fast && done.rallyMs === b.rallyMs);
    assert.equal(game.derived.rally, true);
    assert.ok(game.derived.attackInterval < speed, `faster: ${game.derived.attackInterval} < ${speed}`);
    assert.equal(game.state.stats.chainsFast, 1);
    at(game, t + b.rallyMs + 100);
    assert.equal(game.derived.rally, false, 'over after its seconds');
    assert.ok(Math.abs(game.derived.attackInterval - speed) < 1e-6);
    assert.ok(BASE.rallyAttackSpeed > 0 && BASE.rallyAttackSpeed <= 0.25, 'small');
});

test('a click out of turn, elsewhere, or too soon after the chain\'s last does nothing, and costs nothing', () => {
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
    assert.equal(game.chainClick(0), false, 'within a quarter second of its last click: not counted');
    assert.equal(c.chain.next, 0);
    t += 200; at(game, t);
    assert.equal(game.chainClick(0), true, 'counted now');
    for (let i = 1; i < b.points; i++) { t += 300; at(game, t); assert.equal(game.chainClick(i), true); }
    assert.equal(c.chain, null, 'finished, whatever came between');
    assert.ok(chain);
});

test('a strike and a point never wait on each other: each keeps its own quarter second', () => {
    const game = fighter();
    let t = b.firstMs + 500;
    at(game, t);
    game.startChain(2);
    const c = game.state.combat;
    t += 300; at(game, t);
    assert.equal(game.clickAttack(), true, 'a strike');
    t += 10; at(game, t);
    assert.equal(game.chainClick(0), true, 'the 1, a hundredth of a second after the strike: counted');
    t += BALANCE.combat.strikeGapMs - 10; at(game, t);
    assert.equal(game.clickAttack(), true, 'a strike a quarter second after the last strike, whatever came between');
    t += 5; at(game, t);
    assert.equal(game.chainClick(1), false, 'the 2 within a quarter second of the 1: not counted');
    t += 10; at(game, t);
    assert.equal(game.chainClick(1), true, 'the 2, a quarter second after the 1');
    assert.equal(c.chain.next, 2);
    assert.equal(game.state.stats.strikes, 2);
    assert.equal(b.clickGapMs, BALANCE.combat.strikeGapMs, 'the same pace: four a second each');
});

test('striking the points keeps the combo from fading; the chain builds none itself', () => {
    const run = playChain => {
        const game = fighter();
        let t = 1000;
        for (let i = 0; i < 12; i++) { t += 260; at(game, t); game.clickAttack(); }
        const c = game.state.combat;
        const built = c.combo;
        c.chainAt = game.now;
        game.startChain(2);
        for (let i = 0; i < b.points; i++) { t += 700; at(game, t); if (playChain) game.chainClick(i); }
        return { built, after: c.combo, chains: game.state.stats.chains };
    };
    const played = run(true);
    assert.ok(played.built > 5, `combo ${played.built}`);
    assert.equal(played.chains, 1);
    assert.ok(Math.abs(played.after - played.built) < 1e-9, `held: ${played.built} -> ${played.after}`);
    const watched = run(false);
    assert.ok(watched.after < watched.built - 1, `3.5 s without a strike or a point fades it: ${watched.built} -> ${watched.after}`);
});

test('the points keep off the monster: none in its box, on a phone or a wide screen', () => {
    rng.setSource(seededRandom(11));
    // the monster's box, widened by half a point, in fractions of the fight (measured in a browser: ui/scene.js keepClear)
    const cases = [
        { aspect: 390 / 292, box: { x0: 0.48, y0: 0.02, x1: 0.95, y1: 0.93 } },    // a phone
        { aspect: 1100 / 449, box: { x0: 0.56, y0: 0.0, x1: 0.78, y1: 0.86 } }      // a desktop
    ];
    for (const { aspect, box } of cases) {
        for (let n = 0; n < 500; n++) {
            const pts = placePoints(b.points, aspect, b.spacing, [box]);
            assert.equal(pts.length, b.points);
            for (const p of pts) {
                assert.ok(p.x <= box.x0 || p.x >= box.x1 || p.y <= box.y0 || p.y >= box.y1, `aspect ${aspect.toFixed(2)}: ${JSON.stringify(p)} in the box`);
                assert.ok(p.x >= 0.1 && p.x <= 0.9 && p.y >= 0.16 && p.y <= 0.84, JSON.stringify(p));
            }
            for (let i = 0; i < pts.length; i++) for (let j = 0; j < i; j++) {
                const d = Math.hypot((pts[i].x - pts[j].x) * aspect, pts[i].y - pts[j].y);
                assert.ok(d >= 0.12, `aspect ${aspect.toFixed(2)}: two points ${d.toFixed(3)} apart`);
            }
        }
    }
    // a box over all but a strip: the points still find room outside it; over everything: a row, as before
    const strip = placePoints(b.points, 2, b.spacing, [{ x0: 0.3, y0: 0, x1: 1, y1: 1 }]);
    assert.ok(strip.every(p => p.x <= 0.3), JSON.stringify(strip));
    assert.equal(new Set(strip.map(p => `${p.x},${p.y}`)).size, b.points, 'five different spots');
    assert.equal(placePoints(b.points, 2, b.spacing, [{ x0: 0, y0: 0, x1: 1, y1: 1 }]).length, b.points);
    // what the page sends is checked: odd boxes are left out
    assert.equal(placePoints(b.points, 2, b.spacing, [null, { x0: 'a' }, { x0: 0.5, y0: 0.5, x1: 0.4, y1: 0.6 }]).length, b.points);
});

test('the fighters\' bars and names give way where there is no room, the monster never, and points never overlap', () => {
    rng.setSource(seededRandom(12));
    const inside = (p, b) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1;
    const cases = [
        // a phone: the monster (hard) takes the right half, the bars and the names (soft) the top and bottom bands
        { aspect: 390 / 292, minGap: 64 / 292, roomy: false,
          boxes: [{ x0: 0.48, y0: 0.02, x1: 0.95, y1: 0.93 }, { x0: 0, y0: 0, x1: 1, y1: 0.3, soft: true }, { x0: 0, y0: 0.75, x1: 1, y1: 1, soft: true }] },
        // a wide screen: room for all of them
        { aspect: 1100 / 449, minGap: 64 / 449, roomy: true,
          boxes: [{ x0: 0.56, y0: 0.0, x1: 0.78, y1: 0.86 }, { x0: 0.1, y0: 0, x1: 0.95, y1: 0.12, soft: true }, { x0: 0.1, y0: 0.86, x1: 0.95, y1: 1, soft: true }] }
    ];
    for (const { aspect, minGap, roomy, boxes } of cases) {
        let gaveWay = 0;
        for (let n = 0; n < 300; n++) {
            const pts = placePoints(b.points, aspect, b.spacing, boxes, minGap);
            assert.equal(pts.length, b.points);
            for (const p of pts) assert.ok(!inside(p, boxes[0]), `aspect ${aspect.toFixed(2)}: ${JSON.stringify(p)} on the monster`);
            if (pts.some(p => boxes.slice(1).some(x => inside(p, x)))) gaveWay++;
            for (let i = 0; i < pts.length; i++) for (let j = 0; j < i; j++) {
                const d = Math.hypot((pts[i].x - pts[j].x) * aspect, pts[i].y - pts[j].y);
                assert.ok(d >= minGap - 0.002, `aspect ${aspect.toFixed(2)}: two points ${d.toFixed(3)} apart, under ${minGap.toFixed(3)}`);
            }
        }
        if (roomy) assert.equal(gaveWay, 0, 'with room, the bars and names are left clear');
        else assert.ok(gaveWay > 0, 'with none, they give way');
    }
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
        // as fast as the chain counts clicks (one a quarter second), for its whole four seconds
        for (let k = 0; k * b.clickGapMs <= b.ms; k++) {
            t += b.clickGapMs; at(game, t);
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

test('clicking the monster strikes as it did; no chain in the clan fight', () => {
    const game = fighter();
    at(game, 1000);
    assert.equal(game.clickAttack(), true, 'a strike: a tenth of an attack, and combo');
    assert.equal(game.state.stats.strikes, 1);
    assert.ok(game.state.combat.combo > 0);
    game.state.combat.mode = 'clan';
    game.state.combat.chainAt = T0;
    assert.equal(chainReady(game.state, T0 + 5000), false, 'the clan boss has its openings, not a chain');
});

test('a rally is never in a clan attack or on the boards (the server\'s reckoning leaves it out)', async () => {
    const { powerSummary } = await import('../src/core/power.js');
    const game = fighter();
    at(game, 1000);
    const plain = powerSummary(JSON.parse(game.serialize(game.now)), game.now).dps;
    game.state.combat.rallyUntil = game.now + b.rallyMs;
    game.recompute();
    assert.equal(game.derived.rally, true);
    assert.equal(powerSummary(JSON.parse(game.serialize(game.now)), game.now).dps, plain);
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
