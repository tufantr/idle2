// Weekend events: schedule, rotation, Festival Tokens with a daily cap, milestones, shop, modifiers.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { eventStatus, eventProgress } from '../src/systems/events.js';
import { EVENTS, EVENT_ACTIONS_PER_TOKEN, EVENT_DAILY_CAP, EVENT_MILESTONES, EVENT_SHOP } from '../src/data/events.js';
import { collectModifiers } from '../src/core/modifiers.js';

rng.setSource(seededRandom(77));
const H = 3600 * 1000;
const FRIDAY = Date.UTC(2026, 9, 2);   // Friday 2 Oct 2026, 00:00 UTC
const TUESDAY = Date.UTC(2026, 8, 29, 12);

test('an event runs from Friday to Monday (UTC), and the four rotate week by week', () => {
    const state = new Game(null, TUESDAY).state;
    const before = eventStatus(state, TUESDAY);
    assert.equal(before.active, false);
    assert.equal(before.startsAt, FRIDAY);
    const during = eventStatus(state, FRIDAY + 30 * H);
    assert.equal(during.active, true);
    assert.equal(during.endsAt, FRIDAY + 72 * H);
    assert.equal(during.event.id, before.event.id, 'the next event is the one that starts');
    assert.equal(eventStatus(state, FRIDAY + 72 * H).active, false, 'over on Monday');
    const seen = new Set();
    for (let w = 0; w < EVENTS.length; w++) seen.add(eventStatus(state, FRIDAY + w * 7 * 24 * H + H).event.id);
    assert.equal(seen.size, EVENTS.length, 'as many weekends as events, each once');
});

test('Festival Tokens: one per 20 actions, capped per day, milestones once per event', () => {
    const game = new Game(null, FRIDAY + H);
    assert.equal(eventProgress(game, EVENT_ACTIONS_PER_TOKEN * 10), 10);
    assert.equal(game.state.events.tokens, 10);
    const essence = game.state.resources.essence;
    eventProgress(game, EVENT_ACTIONS_PER_TOKEN * 1000);
    assert.equal(game.state.events.earnedToday, EVENT_DAILY_CAP);
    assert.equal(game.state.events.tokens, EVENT_DAILY_CAP);
    assert.equal(eventProgress(game, 1000), 0, 'capped for today');
    assert.equal(game.state.resources.essence, essence + EVENT_MILESTONES[0].reward.essence, 'the 50-token milestone paid');

    game.now = FRIDAY + 25 * H; // the next day
    eventProgress(game, EVENT_ACTIONS_PER_TOKEN * 1000);
    assert.equal(game.state.events.tokens, 2 * EVENT_DAILY_CAP);
    assert.deepEqual(game.state.events.milestones, [50, 100]);
    game.now = FRIDAY + 49 * H;
    eventProgress(game, EVENT_ACTIONS_PER_TOKEN * 1000);
    assert.deepEqual(game.state.events.milestones, [50, 100, 150]);

    // Next weekend is a new event: milestones start over, tokens carry on.
    game.now = FRIDAY + 7 * 24 * H + H;
    eventProgress(game, EVENT_ACTIONS_PER_TOKEN);
    assert.deepEqual(game.state.events.milestones, []);
    assert.equal(game.state.events.tokens, 3 * EVENT_DAILY_CAP + 1);

    const quiet = new Game(null, TUESDAY);
    assert.equal(eventProgress(quiet, 10000), 0, 'nothing between events');
});

test('kills, skill actions and harvests all count', () => {
    const game = new Game(null, FRIDAY + H);
    game.startNodeAction('mining', 'copper_ore');
    let now = game.now;
    for (let i = 0; i < 3000; i++) { now += 100; game.tick(now); }
    assert.ok(game.state.events.tokens >= 4, `tokens from ${game.state.stats.actionsBySkill.mining} ores: ${game.state.events.tokens}`);
});

test('the shop is open only during an event and takes tokens', () => {
    const game = new Game(null, FRIDAY + H);
    const item = EVENT_SHOP.find(i => i.id === 'ev_diamond');
    game.state.events.tokens = item.cost;
    assert.equal(game.buyEventItem('ev_diamond'), true);
    assert.equal(game.state.resources.diamond, 1);
    assert.equal(game.state.events.tokens, 0);
    assert.equal(game.buyEventItem('ev_diamond'), false, 'no tokens left');
    const closed = new Game(null, TUESDAY);
    closed.state.events.tokens = 999;
    assert.equal(closed.buyEventItem('ev_essence'), false);
});

test('event bonuses apply only while it runs', () => {
    const game = new Game(null, FRIDAY + H);
    const event = eventStatus(game.state, game.now).event;
    assert.equal(game.derived.event, event.id);
    const during = collectModifiers(game.state);
    game.now = FRIDAY + 80 * H;
    game.tick(game.now + 100);
    assert.equal(game.derived.event, null, 'recomputed when it ends');
    const after = collectModifiers(game.state);
    assert.notDeepEqual(during, after);
});

test('Lucky Paws joins the rotation without moving a weekend already run, and makes pets three times as likely', () => {
    const state = new Game(null, TUESDAY).state;
    const WEEK = 7 * 24 * H;
    const before = t => EVENTS[(((Math.floor((t - Date.UTC(2024, 0, 5)) / WEEK)) % 5) + 5) % 5].id;   // the rotation of five
    for (let t = Date.UTC(2024, 0, 5) + H; t < Date.UTC(2026, 9, 16); t += WEEK) assert.equal(eventStatus(state, t).event.id, before(t), new Date(t).toISOString());
    const from = Date.UTC(2026, 9, 16) + H;
    assert.equal(eventStatus(state, from).event.id, 'lucky_paws');
    const six = new Set();
    for (let w = 0; w < 6; w++) six.add(eventStatus(state, from + w * WEEK).event.id);
    assert.equal(six.size, 6, 'then all six, each once in six weekends');

    const game = new Game(null, from);
    game.recompute();
    assert.equal(game.derived.petMult, 3);
    const quiet = new Game(null, from + 4 * 24 * H);   // Tuesday: no event
    quiet.recompute();
    assert.equal(quiet.derived.petMult, 1);
});
