// The time away replayed a slice at a time (systems/offline.js offlineReplay, Game.beginResume and beginGap), as the
// page does behind its bar (main.js catchUp): it must end exactly where the replay in one go ends, for every kind of
// hero and absence, and nothing may act on a game mid-replay.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { generateEquipment } from '../src/core/formulas.js';
import { REPLAY_SLICE_MS } from '../src/systems/offline.js';

const T0 = 1_700_000_000_000;
const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** A hero part-way in, fighting at the stages with Auto prestige earned (and on, with `auto`), saved three minutes in. */
function fighter({ auto }) {
    rng.setSource(seededRandom(11));
    const game = new Game(null, T0);
    const s = game.state;
    s.inventory.push(generateEquipment({ type: 'Weapon', tier: 3, power: 4.8, materialName: 'Mithril' }, 900));
    s.prestige.tokens = 300; s.prestige.count = 6; s.prestige.firstAt = T0 - 5 * DAY;
    s.combat.bestStage = 45;
    s.skills.combat.xp = xpForLevel(30);
    s.resources.cooked_boar = 400;
    s.settings.autoPrestige = auto;
    game.recompute();
    game.equipItem(900);
    game.enterCombat();
    for (let t = T0 + 1000; t <= T0 + 3 * MIN; t += 1000) game.tick(t);
    return JSON.parse(game.serialize(game.now));
}

/** A hero mining, saved a minute in. */
function miner() {
    rng.setSource(seededRandom(12));
    const game = new Game(null, T0);
    game.state.skills.mining.xp = xpForLevel(20);
    game.recompute();
    game.startNodeAction('mining', 'copper_ore');
    for (let t = T0 + 1000; t <= T0 + MIN; t += 1000) game.tick(t);
    return JSON.parse(game.serialize(game.now));
}

/** Everything a replay leaves: the save, the report, and the events waiting for the page. */
function outcome(game, run, now) {
    return { save: JSON.parse(game.serialize(now)), summary: run?.summary ?? null, events: game.drainEvents() };
}

/** Back after `away` ms: the boot's replay, in one go or a slice at a time (what the page reads between slices too). */
function resume(raw, away, sliced, seed = 5) {
    rng.setSource(seededRandom(seed));
    const now = raw.meta.savedAt + away;
    const game = new Game(structuredClone(raw), now);
    const run = game.beginResume(now);
    let slices = 0;
    const seenAt = [];
    if (sliced) {
        while (!run.step(() => true)) {
            slices++;
            seenAt.push(run.where.at);
            assert.ok(game.catchingUp === run, 'the game knows a replay is under way');
            void game.state.combat.maxStage; void game.state.gold;   // the bar's figures
        }
    } else run.finish();
    assert.equal(game.catchingUp, null);
    return { ...outcome(game, run, now), slices, seenAt };
}

for (const [name, raw, aways] of [
    ['a fighter with Auto prestige on', () => fighter({ auto: true }), [HOUR, DAY]],
    ['a fighter with Auto off', () => fighter({ auto: false }), [HOUR, 30 * HOUR]],
    ['a hero mining', miner, [HOUR, 30 * HOUR]]
]) {
    test(`the replay a slice at a time ends exactly as in one go: ${name}`, () => {
        const save = raw();
        for (const away of aways) {
            const one = resume(save, away, false);
            const sliced = resume(save, away, true);
            const what = `${away / HOUR} h away`;
            assert.deepEqual(sliced.save, one.save, `${what}: the same save`);
            assert.deepEqual(sliced.summary, one.summary, `${what}: the same report`);
            assert.deepEqual(sliced.events, one.events, `${what}: the same events, in the same order`);
            // about a game minute a slice, the clock always forward
            if (one.summary.mode === 'combat') assert.ok(Math.abs(sliced.slices - one.summary.simulated / REPLAY_SLICE_MS) <= 2, `${what}: ${sliced.slices} slices`);
            else assert.ok(sliced.slices > 0, `${what}: ${sliced.slices} slices of work`);
            assert.ok(sliced.seenAt.every((at, i) => i === 0 || at > sliced.seenAt[i - 1]), `${what}: the replay's clock runs forward`);
            if (away > DAY) assert.ok(one.summary.capped && one.summary.simulated < away, `${what}: past the cap, the cap counts`);
            // (the replays compared did what they are here for)
            if (raw === miner) assert.equal(one.summary.mode, 'skill');
            else {
                assert.equal(one.summary.mode, 'combat');
                assert.ok(one.summary.kills > 100, `${what}: ${one.summary.kills} kills`);
                if (away >= DAY) assert.equal(one.summary.prestiges > 0, name.endsWith('on'), `${what}: ${one.summary.prestiges} prestiges`);
            }
        }
    });
}

/** A hero online, then a gap (the machine slept, a background tab paused): tick over it in one go, or the gap a slice at a time. */
function gap(raw, away, sliced) {
    rng.setSource(seededRandom(6));
    const start = raw.meta.savedAt;
    const game = new Game(structuredClone(raw), start);
    game.resumeFromSave(start);
    for (let t = start + 1000; t <= start + 5000; t += 1000) game.tick(t);
    game.drainEvents();
    const now = game.now + away;
    assert.ok(game.gapAt(now));
    let run = null;
    if (sliced) {
        run = game.beginGap(now);
        while (!run.step(() => true)) void run.where;
    } else game.tick(now);
    return outcome(game, run, now);
}

test('a tab back from sleep: the gap a slice at a time ends as one tick over it', () => {
    const save = fighter({ auto: true });
    for (const away of [2 * HOUR]) {
        const one = gap(save, away, false);
        const sliced = gap(save, away, true);
        assert.deepEqual(sliced.save, one.save, `${away / HOUR} h: the same save`);
        assert.deepEqual(sliced.events, one.events, `${away / HOUR} h: the same events`);
        const report = one.events.find(e => e.type === 'offline')?.summary;
        assert.ok(report && report.mode === 'combat', 'the tick reported the gap');
        assert.deepEqual(sliced.summary, report, 'and the slices the same report');
    }
});

test('a gap that ends a Titan fight and sends the hero back to work replays alike in slices', () => {
    // (made afresh each time: a save loaded mid-Titan scores the fight as given up)
    const replay = sliced => {
        rng.setSource(seededRandom(13));
        const game = new Game(null, T0);
        const s = game.state;
        s.combat.bestStage = 40; s.prestige.tokens = 200; s.skills.mining.xp = xpForLevel(10);
        game.recompute();
        game.startNodeAction('mining', 'copper_ore');
        game.tick(T0 + 1000);
        assert.ok(game.challengeTitan(), 'the Titan is fought from the mine');
        game.tick(T0 + 2000);
        game.drainEvents();
        const now = game.now + 3 * HOUR;
        let run = null;
        if (sliced) { run = game.beginGap(now); while (!run.step(() => true)); } else game.tick(now);
        return { ...outcome(game, run, now), mining: game.state.action?.skill };
    };
    const one = replay(false);
    const sliced = replay(true);
    assert.equal(one.mining, 'mining', 'the hero went back to the mine');
    assert.equal(one.events.find(e => e.type === 'offline')?.summary.mode, 'skill', 'and the rest of the gap was his work');
    assert.deepEqual(sliced.save, one.save);
    assert.deepEqual(sliced.events, one.events);
});

test('anything that acts on a game mid-replay finishes the replay first', () => {
    const save = fighter({ auto: true });
    const one = resume(save, HOUR, false);
    const acts = [
        ['a save', (game, now) => game.serialize(now)],
        ['a tick', (game, now) => game.tick(now)],
        ['a tap', game => game.setAutoEat('auto')],
        ['the page coming into view', game => game.setAttending(true)]
    ];
    for (const [what, act] of acts) {
        rng.setSource(seededRandom(5));
        const now = save.meta.savedAt + HOUR;
        const game = new Game(structuredClone(save), now);
        const run = game.beginResume(now);
        for (let i = 0; i < 20; i++) run.step(() => true);
        assert.ok(!run.done && game.catchingUp === run, `${what}: still mid-replay`);
        act(game, now);
        assert.ok(run.done && game.catchingUp === null, `${what}: the replay is over`);
        assert.deepEqual(run.summary, one.summary, `${what}: with the report of the replay in one go`);
        assert.deepEqual(JSON.parse(game.serialize(now)), one.save, `${what}: and its save`);
    }
});

test('no replay to make: under a minute away, and a clock that is no number', () => {
    const save = fighter({ auto: false });
    const game = new Game(structuredClone(save), save.meta.savedAt + 30000);
    const run = game.beginResume(save.meta.savedAt + 30000);
    assert.equal(run.step(() => true), true, 'over at the first step');
    assert.equal(run.summary, null);
    assert.equal(game.beginResume(NaN), null);
    assert.equal(game.beginGap(game.now + 1000), null, 'a second is no gap');
    assert.equal(game.gapAt(game.now + 6 * MIN), true);
});
