// The Hall's Records keeps what the runs were (systems/prestige.js doPrestige, core/state.js): the last ones with when, how
// far, what they paid, how long they took and their Trials, and each tried Trial's best stage.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { migrateState, createDefaultState, RUN_LOG_MAX } from '../src/core/state.js';
import { TRIALS, PACT_MAX } from '../src/data/trials.js';
import { BALANCE } from '../src/core/formulas.js';
import { renderHall } from '../src/ui/render.js';

const T0 = 1_760_000_000_000;
const MIN = 60_000;

/** A hero with a run behind him, ready to prestige `minutes` after it began. */
function ready(minutes = 30, stage = 40) {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = s.combat.maxStage = s.combat.stage = stage;
    s.prestige.count = 1;
    game.recompute();
    game.tick(T0 + minutes * MIN);
    return game;
}
const nextRun = (game, minutes = 15, stage = 40) => {
    game.state.combat.maxStage = stage;
    game.tick(game.now + minutes * MIN);
};
const records = game => renderHall(game, { hallView: 'records' });

test('a prestige notes the run: when, how far, what it paid and how long it took', () => {
    const game = ready(30, 40);
    assert.deepEqual(game.state.prestige.runs, [], 'nothing before the first');
    const tokens = game.prestigePreview().tokens;
    assert.ok(tokens > 0);
    const at = game.now;
    assert.equal(game.prestige(), true);
    assert.deepEqual(game.state.prestige.runs, [{ at, stage: 40, tokens, ms: 30 * MIN }]);
    assert.equal(game.state.prestige.runs[0].trials, undefined, 'no Trial, no list');
    // kept in the save
    const back = new Game(JSON.parse(game.serialize(game.now)), game.now);
    assert.deepEqual(back.state.prestige.runs, game.state.prestige.runs);
});

test('a refused prestige notes nothing, and a run from a save with no start time has no length', () => {
    const game = ready(30, 40);
    game.state.combat.maxStage = BALANCE.prestige.minStage - 1;
    assert.equal(game.prestige(), false);
    assert.deepEqual(game.state.prestige.runs, []);
    game.state.combat.maxStage = 40;
    game.state.prestige.runStartedAt = 0;
    assert.equal(game.prestige(), true);
    assert.equal(game.state.prestige.runs[0].ms, 0);
});

test('the run that was in a Trial or a Pact says so; the next one, not', () => {
    const game = ready(30, 600);   // deep enough for Pacts
    assert.equal(game.startTrial('glass'), true);
    assert.equal(game.state.prestige.runs[0].trials, undefined, 'the run before the Trial was a plain one');
    nextRun(game, 15, 550);
    assert.equal(game.startTrial(['glass', 'fasting']), true);
    assert.deepEqual(game.state.prestige.runs[1].trials, ['glass']);
    nextRun(game, 15, 520);
    assert.equal(game.prestige(), true);
    assert.deepEqual(game.state.prestige.runs[2].trials, ['glass', 'fasting']);
    nextRun(game, 15, 500);
    assert.equal(game.prestige(), true);
    assert.equal(game.state.prestige.runs[3].trials, undefined);
    assert.deepEqual(game.state.prestige.runs.map(r => r.stage), [600, 550, 520, 500]);
});

test(`only the last ${RUN_LOG_MAX} runs are kept, the oldest going first`, () => {
    const game = ready(30, 40);
    for (let i = 0; i < RUN_LOG_MAX + 5; i++) {
        nextRun(game, 15, 40 + i);
        assert.equal(game.prestige(), true);
    }
    const { runs } = game.state.prestige;
    assert.equal(runs.length, RUN_LOG_MAX);
    assert.equal(runs.at(-1).stage, 40 + RUN_LOG_MAX + 4, 'the newest is last');
    assert.equal(runs[0].stage, 45, 'the first five are gone');
    assert.ok(runs.every((r, i) => !i || r.at > runs[i - 1].at));
});

test('an old save has no runs, and keeps everything else', () => {
    const old = createDefaultState(T0);
    delete old.prestige.runs;
    old.prestige.tokens = 321;
    old.prestige.count = 7;
    const state = migrateState(JSON.parse(JSON.stringify(old)), T0 + MIN);
    assert.deepEqual(state.prestige.runs, []);
    assert.equal(state.prestige.tokens, 321);
    assert.equal(state.prestige.count, 7);
    assert.equal(state.version, old.version, 'the save version stays');
});

test('a bad list or a bad entry in a save is dropped, what is good stays, and it is capped', () => {
    for (const bad of ['many', 7, null, { 0: { at: T0, stage: 5 } }, true]) {
        const raw = createDefaultState(T0);
        raw.prestige.runs = bad;
        assert.deepEqual(migrateState(JSON.parse(JSON.stringify(raw)), T0).prestige.runs, [], `runs: ${JSON.stringify(bad)}`);
    }
    const raw = createDefaultState(T0);
    raw.prestige.runs = [
        null, 'x', 5, [], {}, { at: 'yesterday', stage: 5 }, { at: T0, stage: 'far' }, { at: T0, stage: 0 }, { at: T0 },
        { at: T0 - 1000, stage: 12.9, tokens: -5, ms: 'long', trials: ['nonsense', 'glass', 'glass', 7, 'fasting', 'brutes', 'rusted'] },
        { at: T0 + 9e9, stage: 1e9, tokens: 'lots', ms: -1, trials: 'glass' }
    ];
    const { runs } = migrateState(JSON.parse(JSON.stringify(raw)), T0).prestige;
    assert.deepEqual(runs[0], { at: T0 - 1000, stage: 12, tokens: 0, ms: 0, trials: ['glass', 'fasting', 'brutes'].slice(0, PACT_MAX) });
    assert.equal(runs[1].at, T0, 'never in the future');
    assert.equal(runs[1].stage, 10000, 'within the stages');
    assert.equal(runs[1].trials, undefined);
    assert.equal(runs.length, 2);
    raw.prestige.runs = Array.from({ length: 50 }, (_, i) => ({ at: T0 - 50 + i, stage: i + 1, tokens: 1, ms: 1 }));
    const kept = migrateState(JSON.parse(JSON.stringify(raw)), T0).prestige.runs;
    assert.equal(kept.length, RUN_LOG_MAX);
    assert.equal(kept.at(-1).stage, 50, 'the newest stay');
});

test('Records shows nothing of Trials or runs before the hero has met them', () => {
    const game = new Game(null, T0);
    const html = records(game);
    assert.ok(html.includes('record-grid'), 'the records themselves are there');
    assert.ok(!html.includes('Last runs') && !html.includes('run-log'));
    assert.ok(!html.includes('Best stage in each'));
});

test('Records shows each tried Trial with its best stage, and the runs newest first with their Trials', () => {
    const game = ready(30, 40);
    game.state.trials.best = { glass: 214, rusted: 1234 };
    game.state.prestige.runs = [
        { at: T0 - 86400000 * 40, stage: 41, tokens: 900, ms: 45 * MIN },
        { at: T0, stage: 214, tokens: 1500, ms: 2 * 60 * MIN, trials: ['glass'] },
        { at: T0 + MIN, stage: 180, tokens: 2_000_000, ms: 0, trials: ['glass', 'rusted'] }
    ];
    const html = records(game);
    assert.ok(html.includes('Best stage in each'));
    for (const t of TRIALS) assert.equal(html.includes(`<span class="record-label">${t.name}</span>`), !!game.state.trials.best[t.id], t.name);
    assert.ok(html.includes('1,234'), 'its best stage');
    const start = html.indexOf('class="run-log"');
    const log = html.slice(start, html.indexOf('</ol>', start));
    assert.deepEqual([...log.matchAll(/Stage <b>([\d,]+)<\/b>/g)].map(m => m[1]), ['180', '214', '41'], 'newest first');
    assert.ok(log.includes('Pact: Glass Hero, Rusted Gear'));
    assert.ok(log.includes('Trial: Glass Hero'));
    assert.ok(log.includes('+2.00M'));
    assert.ok(log.includes('2h 0m'));
    assert.equal(log.split('<li>').length - 1, 3);
    assert.equal(log.split('run-rule').length - 1, 2, 'a plain run names no Trial');
});
