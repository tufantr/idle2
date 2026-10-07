// Ascension (DESIGN §3.27): from best stage 300, a prestige that gives the tokens up for Stars; each Star
// makes every later prestige pay 25% more tokens. Everything else stays.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { tokensForStage } from '../src/core/formulas.js';
import { ASCEND_FROM, STAR_TOKEN_GAIN, starsFor, starGain } from '../src/data/ascension.js';
import { ascensionOpen } from '../src/systems/ascension.js';
import { seen } from '../src/systems/disclosure.js';

rng.setSource(seededRandom(9));
const T0 = 1_700_000_000_000;
const MIN = 60_000;

/** A hero at the wall of stage 300: 100,000 tokens, an hour into a run at stage 290. */
function veteran({ best = 305, tokens = 100_000 } = {}) {
    const game = new Game(null, T0);
    const s = game.state;
    Object.assign(s.combat, { bestStage: best, stage: 290, maxStage: 290 });
    Object.assign(s.prestige, { count: 300, tokens, firstAt: T0 - 20 * 86_400_000, runStartedAt: T0 - 60 * MIN });
    s.equipped.Weapon = { id: 800, type: 'Weapon', tier: 7, atk: 5000, def: 0, affixes: [], upgrade: 0 };
    s.perks.knight = 3;
    game.recompute();
    return game;
}

test('the Stars: ten for every tenfold of tokens past a thousand, each +25% tokens from every prestige', () => {
    assert.equal(starsFor(999), 0);
    assert.equal(starsFor(10_000), 10);
    assert.equal(starsFor(100_000), 20);
    assert.equal(starsFor(1_000_000), 30);
    assert.equal(starsFor(150_000), 21);
    assert.equal(starGain(0), 1);
    assert.equal(starGain(20), 1 + 20 * STAR_TOKEN_GAIN);
});

test('Ascension opens at best stage 300, and stays open once made', () => {
    const game = veteran({ best: ASCEND_FROM - 1 });
    assert.equal(ascensionOpen(game.state), false);
    assert.equal(game.ascendPreview().allowed, false);
    assert.equal(game.ascend(), false);
    game.state.combat.bestStage = ASCEND_FROM;
    game.tick(T0 + 1000);
    assert.equal(ascensionOpen(game.state), true);
    assert.equal(seen(game.state, 'ascension'), true);
    assert.equal(seen(game.state, 'stars'), false, 'the Stars chip waits for the first Star');
});

test('ascending: the prestige as ever, the tokens (with the run\'s) given up for Stars, the rest kept', () => {
    const game = veteran();
    const s = game.state;
    game.enterCombat();
    const p = game.ascendPreview();
    assert.equal(p.allowed, true);
    assert.equal(p.tokens, 100_000 + game.prestigePreview().tokens);
    assert.equal(p.stars, starsFor(p.tokens));
    const before = { count: s.prestige.count, sp: s.prestige.skillPoints, best: s.combat.bestStage, perks: { ...s.perks }, weapon: s.equipped.Weapon.id, records: game.derived.records.count };
    game.drainEvents();
    assert.equal(game.ascend(), true);
    assert.equal(s.prestige.tokens, 0);
    assert.equal(s.ascension.stars, p.stars);
    assert.equal(s.ascension.count, 1);
    assert.equal(s.ascension.firstAt, T0);
    assert.equal(s.prestige.count, before.count + 1, 'it is a prestige too');
    assert.ok(s.prestige.skillPoints >= before.sp);
    assert.equal(s.combat.bestStage, before.best);
    assert.deepEqual(s.perks, before.perks);
    assert.equal(s.equipped.Weapon.id, before.weapon);
    assert.equal(game.derived.records.count, before.records, 'the records stay');
    assert.equal(s.combat.active, true, 'he was fighting: he walks into the next run');
    const events = game.drainEvents();
    assert.equal(events.find(e => e.type === 'prestige')?.ascend, true, 'the prestige knows it is an Ascension (one card, not two)');
    const asc = events.find(e => e.type === 'ascend');
    assert.deepEqual([asc.count, asc.stars, asc.starsAfter, asc.tokensGiven], [1, p.stars, p.stars, p.tokens]);
    // every prestige now pays more
    assert.ok(Math.abs(game.derived.tokenMult - starGain(p.stars)) < 1e-9);
    s.combat.maxStage = 200;
    assert.equal(game.prestigePreview().tokens, tokensForStage(200, game.derived.tokenMult));
});

test('Stars add up over Ascensions; each pays for the tokens of its own cycle', () => {
    const game = veteran();
    const s = game.state;
    assert.equal(game.ascend(), true);
    const first = s.ascension.stars;
    game.now += 24 * 3600 * 1000;   // a day's rest
    s.prestige.tokens = 1_000_000;
    s.prestige.runStartedAt = game.now - 60 * MIN;
    s.combat.maxStage = 290;
    const p = game.ascendPreview();
    assert.equal(game.ascend(), true);
    assert.equal(s.ascension.count, 2);
    assert.equal(s.ascension.stars, first + p.stars);
    assert.ok(p.stars >= 30);
});

test('what stops an Ascension: a run too young, a Titan fight, no tokens to give', () => {
    const game = veteran();
    const s = game.state;
    s.prestige.runStartedAt = T0 - 5 * MIN;
    assert.equal(game.ascend(), false);
    s.prestige.runStartedAt = T0 - 60 * MIN;
    s.prestige.tokens = 0;
    s.combat.maxStage = 10;   // a run worth a handful of tokens: under a thousand, no Stars
    assert.equal(game.ascendPreview().stars, 0);
    assert.equal(game.ascend(), false);
    assert.equal(s.ascension.count, 0);
});

test('after an Ascension it rests a day: the reset can\'t be farmed for Stars', () => {
    const game = veteran();
    const s = game.state;
    assert.equal(game.ascend(), true);
    assert.equal(s.ascension.lastAt, T0);
    // a day of rest, whatever the tokens
    game.now = T0 + 23 * 3600 * 1000;
    s.prestige.tokens = 50_000;
    s.prestige.runStartedAt = game.now - 60 * MIN;
    s.combat.maxStage = 290;
    const p = game.ascendPreview();
    assert.equal(p.allowed, false);
    assert.equal(p.restMs, 3600 * 1000);
    assert.equal(game.ascend(), false);
    game.now = T0 + 24 * 3600 * 1000;
    assert.equal(game.ascendPreview().restMs, 0);
    assert.equal(game.ascend(), true);
    assert.equal(s.ascension.count, 2);
    // a rest set in the future (a clock turned back) comes back in reach on load
    const save = JSON.parse(game.serialize(game.now));
    save.ascension.lastAt = game.now + 30 * 86_400_000;
    assert.equal(migrateState(save, game.now).ascension.lastAt, game.now);
});

test('an Ascension ends a Trial, like any prestige', () => {
    const game = veteran();
    game.state.trials.active = 'brutes';
    assert.equal(game.ascend(), true);
    assert.equal(game.state.trials.active, null);
});

test('saves keep the Ascensions and Stars; odd values come back whole and in range', () => {
    const game = veteran();
    game.ascend();
    const back = migrateState(JSON.parse(game.serialize(T0)), T0);
    assert.deepEqual(back.ascension, game.state.ascension);
    const odd = JSON.parse(game.serialize(T0));
    odd.ascension = { count: -2, stars: '12.9', firstAt: 'x', lastAt: -5 };
    assert.deepEqual(migrateState(odd, T0).ascension, { count: 0, stars: 12, firstAt: 0, lastAt: 0 });
    for (const raw of [null, 5, 'x', []]) {
        const save = JSON.parse(game.serialize(T0));
        save.ascension = raw;
        assert.deepEqual(migrateState(save, T0).ascension, { count: 0, stars: 0, firstAt: 0, lastAt: 0 });
    }
    const old = JSON.parse(game.serialize(T0));
    delete old.ascension;
    assert.deepEqual(migrateState(old, T0).ascension, { count: 0, stars: 0, firstAt: 0, lastAt: 0 });
});
