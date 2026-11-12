// The balance simulator's own rules (tools/simlib.mjs, the pieces of tools/simulate.mjs a test can import): its bot fights
// the Titan when the dungeons tab's badge says he can win (research-loop 040 §2), and its pool check (P-114) books essence,
// bars and gems without changing the game, and finds the pools and what sits past a cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { renderNav } from '../src/ui/render.js';
import { TITAN_UNLOCK_STAGE } from '../src/data/dungeons.js';
import { enemyForStage, enemyDamage } from '../src/core/formulas.js';
import { titanBeatable, createPoolBook, watchPools, poolTotals, poolFlags, pastCaps, createCapLog, POOL_IDS } from '../tools/simlib.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIMULATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'simulate.mjs');

const T0 = 1_700_000_000_000;

function hero({ tokens = 0, stage = TITAN_UNLOCK_STAGE } = {}) {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.bestStage = stage;
    s.combat.maxStage = stage;
    s.prestige.tokens = tokens;
    s.unlocks.dungeons = true;
    game.recompute();
    game.drainEvents();
    return game;
}
const badge = game => renderNav(game, { tab: 'combat' }).includes('The Titan is awake, and you can beat him');

test('the bot fights a Titan when the dungeons tab says he can beat it, and only then', () => {
    let seen = { yes: 0, no: 0 };
    for (const tokens of [0, 50, 200, 1000, 3000, 10000, 20000, 100000]) {
        const game = hero({ tokens });
        assert.equal(game.titanReady(), true);
        assert.equal(titanBeatable(game), badge(game), `${tokens} tokens: the bot and the badge agree`);
        seen[titanBeatable(game) ? 'yes' : 'no']++;
    }
    assert.ok(seen.yes && seen.no, 'some heroes can, some cannot');
    assert.equal(titanBeatable(hero()), false, 'a new hero at the Titan\'s stage cannot');
    // the next Titan is stronger: one the hero beats may be followed by one he can't
    const strong = hero({ tokens: 20000 });
    assert.equal(titanBeatable(strong), true);
    strong.state.titan.kills = 40;
    assert.equal(titanBeatable(strong), badge(strong));
});

// ---------- the pool check (P-114) ----------

test('a band that spends under a tenth of its income is a pool; a trickle under ten is not', () => {
    const book = createPoolBook(50);
    book.note('essence', 1000, 'salvage', 10);
    book.note('essence', -50, 'anvil', 20);          // hours 0-50: 5% spent
    book.note('essence', 1000, 'dungeons', 60);
    book.note('essence', -400, 'anvil', 70);
    book.note('essence', -100, 'bench', 99);         // hours 50-100: half
    book.note('diamond', 5, 'mining', 10);           // too little to count
    book.note('runite_bar', 100, 'smelting', 120);   // hours 100-130, nothing spent
    book.note('essence', 0, 'nothing', 30);
    const flags = poolFlags(book, { hours: 130 });
    assert.deepEqual(flags.map(f => [f.id, f.band, f.share]), [['essence', '0-50', 0.05], ['runite_bar', '100-130', 0]]);
    assert.deepEqual(book.res.essence.bands, [[1000, 50], [1000, 500]]);
    assert.deepEqual(book.res.essence.bySink, { anvil: 450, bench: 100 });
    assert.deepEqual(book.res.essence.bySource, { salvage: 1000, dungeons: 1000 });
    const totals = poolTotals(book);
    assert.deepEqual(Object.keys(totals).sort(), ['bars', 'essence', 'gems']);
    assert.equal(totals.essence.spent, 550);
    assert.deepEqual([totals.gems.got, totals.bars.got, totals.bars.spent], [5, 100, 0]);
    assert.ok(POOL_IDS.includes('essence') && POOL_IDS.includes('diamond') && POOL_IDS.includes('copper_bar') && !POOL_IDS.includes('copper_ore'));
    // a run's last moment is its last band's, not a band of its own
    const run = createPoolBook(50, 100);
    run.note('essence', 10, 'fight', 100);
    assert.equal(run.res.essence.bands.length, 2);
});

/** Ten minutes at the stages, a bag bought with essence and the bag salvaged, the same way each time. */
function play(watch) {
    rng.setSource(seededRandom(11));
    const game = new Game(null, T0);
    const s = game.state;
    let label = 'play';
    const book = createPoolBook();
    if (watch) watchPools(s, book, () => label, () => (game.now - T0) / 3600000);
    s.resources.essence = 5000;
    label = 'bag';
    assert.equal(game.buyBagUpgrade('essence'), true);
    label = 'fight';
    game.enterCombat();
    for (let t = 1; t <= 600; t++) game.tick(T0 + t * 1000);
    label = 'salvage';
    game.salvageAll('legendary');
    return { save: game.serialize(T0 + 600000), book, essence: s.resources.essence };
}

test('watching the pools changes nothing the game does, and books each change to its sink or source', () => {
    const plain = play(false);
    const watched = play(true);
    assert.equal(watched.save, plain.save, 'the same game, watched or not');
    const e = watched.book.res.essence;
    assert.ok(e.bySink.bag > 0, 'the bag bought with essence');
    assert.equal(e.bands.length, 1);
    assert.equal(e.got - e.spent, watched.essence, 'what is held is what came in less what went out (from none)');
});

test('past its cap: the Armour Rack levels the mitigation cap leaves unused, the worn affixes a capped stat does without', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.combat.maxStage = s.combat.bestStage = 50;
    // armour worth a quarter of the defence the cap asks against the boss at the wall (stage 50: nine times its attack)
    const wall = enemyForStage(50);
    s.equipped.Body = { id: 'b', type: 'Body', tier: 7, atk: 0, def: Math.round(9 * wall.atk / 4), affixes: [{ stat: 'attackSpeed', value: 0.25 }, { stat: 'critChance', value: 0.3 }] };
    s.equipped.Legs = { id: 'l', type: 'Legs', tier: 7, atk: 0, def: 0, affixes: [{ stat: 'attackSpeed', value: 0.25 }, { stat: 'critChance', value: 0.3 }] };
    s.equipped.Head = { id: 'h', type: 'Head', tier: 7, atk: 0, def: 0, affixes: [{ stat: 'attackSpeed', value: 0.5 }] };
    s.equipped.Boots = { id: 'o', type: 'Boots', tier: 7, atk: 0, def: 0, affixes: [{ stat: 'attackSpeed', value: 0.5 }] };
    game.recompute();
    let caps = pastCaps(game);
    assert.equal(caps.rack, 0);
    assert.equal(caps.rackPast, 0, 'no rack, nothing past');
    assert.equal(caps.affixes, 6);
    // attack speed +150% (or more with Focus) against the +100% cap: the two +25% could come off, neither +50%; crit 65% stays under 75%
    assert.deepEqual([caps.affixesPast, caps.byStat], [2, { attackSpeed: 2 }]);
    s.camp.armory = 60;
    game.recompute();
    caps = pastCaps(game);
    assert.equal(caps.rack, 60);
    assert.ok(caps.rackPast > 0 && caps.rackPast < 60, `${caps.rackPast} of 60 past the cap`);
    // the levels kept bring the wall's boss to the cap's least, one fewer would not
    const least = enemyDamage(wall.atk, Infinity);
    const defWith = levels => game.derived.def * Math.pow(1.05, levels - 60);
    assert.equal(enemyDamage(wall.atk, defWith(60 - caps.rackPast)), least);
    assert.ok(enemyDamage(wall.atk, defWith(60 - caps.rackPast - 1)) > least);
    // the log keeps each band's most
    const log = createCapLog(50);
    log.sample(game, 10);
    s.camp.armory = 30;
    game.recompute();
    log.sample(game, 20);
    log.sample(game, 75);
    const bands = log.bands(80);
    assert.deepEqual(bands.map(b => [b.band, b.samples, b.rack, b.rackPast === caps.rackPast]), [['0-50', 2, 60, true], ['50-80', 1, 30, false]]);
});

test('the simulator plays an hour, and its report and JSON carry the switches, the Titan attempts and the pool check', () => {
    const dir = mkdtempSync(join(tmpdir(), 'simtools-'));
    try {
        const file = join(dir, 'run.json');
        const run = spawnSync(process.execPath, [SIMULATE, '--hours=1', '--seed=1', '--snapshot=1000', `--json=${file}`], { encoding: 'utf8' });
        assert.equal(run.status, 0, run.stderr);
        for (const line of [/^Essence, bars and gems \(got: the share spent, by sink\): essence /m, /^Pools \(a 50-hour band spending under 10% of its income\): /m, /^Past a cap, the most at a sample/m, /Titan: \d+ kills in \d+ tries \(\d+ begun/]) assert.match(run.stdout, line);
        const out = JSON.parse(readFileSync(file, 'utf8'));
        assert.deepEqual([out.policy.stallFix, out.policy.titanFix], [1, 1], 'the fixes are the default');
        assert.equal(typeof out.final.titanAttempts, 'number');
        assert.ok(out.pools.resources.essence.got > 0, 'essence came in');
        const essence = out.pools.resources.essence;
        assert.ok(Math.abs(essence.got - essence.spent - essence.held) <= 1, 'held: what came in less what went out (rounded)');
        assert.deepEqual(out.pools.caps.map(c => [c.band, c.samples]), [['0-1', 6]], 'a sample every 10 minutes');
        assert.ok(Array.isArray(out.pools.flags));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
