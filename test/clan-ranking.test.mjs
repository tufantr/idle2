// The week's clan ranking (data/social.js ENDLESS, CLAN_DIVISIONS; DESIGN §3.18): divisions by the levels felled, the
// Endless Hydra's depth, a clan's score from its best members, and the fight against it in the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { ENDLESS, CLAN_DIVISIONS, CLAN_FIGHT_MS, CLAN_TABLE, divisionOf, endlessDepth, endlessDamageAt, clanDepthScore, clanTable, clanTableDay, clanTableWeek, isoWeek, rankedAsTable } from '../src/data/social.js';
import { FEATURES } from '../src/ui/features.js';
import { renderClan } from '../src/ui/render.js';

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

test('the date of the one table is a Monday, set in one place, and a week goes by its own id', () => {
    assert.match(CLAN_TABLE.from, /^\d{4}-\d{2}-\d{2}$/);
    const monday = Date.parse(`${CLAN_TABLE.from}T00:00:00Z`);
    assert.equal(new Date(monday).getUTCDay(), 1, 'weeks begin on Monday 00:00 UTC: any other day would rewrite the week under way');
    const first = clanTableWeek();
    assert.equal(first, isoWeek(monday));
    assert.equal(isoWeek(monday - 1), isoWeek(monday - 6 * 86400000), 'the Sunday before is the last week of divisions');
    assert.equal(rankedAsTable(isoWeek(monday - 1)), false);
    assert.equal(rankedAsTable(first), true);
    assert.equal(rankedAsTable(isoWeek(monday + 400 * 86400000)), true, 'into the next year too');
    assert.equal(rankedAsTable(isoWeek(monday - 400 * 86400000)), false);
    const set = CLAN_TABLE.from;
    try {
        CLAN_TABLE.from = '2026-11-30';
        assert.deepEqual([clanTableWeek(), clanTableDay()], ['2026-W49', '30 November 2026']);
    } finally { CLAN_TABLE.from = set; }
});

test('the one table: most levels felled, then depth, then the name; each clan its place', () => {
    const c = (name, kills, score) => ({ name, kills, score });
    const rows = [c('Depth only', 0, 900), c('Zeta', 3, 50), c('Alpha', 3, 50), c('Most felled', 7, 1), c('Deeper', 3, 80)];
    assert.deepEqual(clanTable(rows).map(r => [r.place, r.name]), [[1, 'Most felled'], [2, 'Deeper'], [3, 'Alpha'], [4, 'Zeta'], [5, 'Depth only']]);
    assert.equal(rows[0].place, undefined, 'the rows given are left alone');
    assert.deepEqual(clanTable([]), []);
});

test("the Clan tab: one table with crowns for its first three, last week's three, and the crown a clan wears", () => {
    const game = new Game(null, T0);
    const row = (rank, name, you = false) => ({ rank, name, tag: `C${rank}`, kills: 8 - rank, score: 100 - rank, counted: 3, you });
    const ranking = { week: '2026-W50', table: [1, 2, 3, 4, 5].map(i => row(i, `Clan ${i}`, i === 4)), divisions: [{ id: 'bronze', name: 'Bronze', clans: [row(1, 'Clan 5')] }],
        last: { week: '2026-W49', table: [1, 2, 3].map(i => row(i, `Old ${i}`)), divisions: [{ id: 'gold', name: 'Gold', clans: [row(1, 'Old 9')] }] } };
    const social = { loaded: true, clan: { id: 7, name: 'Wolves', tag: 'WLF', crown: { rank: 1, division: 'bronze' }, crowned: { rank: 2, week: '2026-W49' } }, members: [], ranking, boss: { week: '2026-W50', level: 1, hp: 5, maxHp: 10, kills: 0, levels: 7 },
        standing: { division: 'bronze', divisionName: 'Bronze', rank: 1, of: 1, score: 96, counted: 3, table: { rank: 4, of: 5 } }, endless: { open: false, opensInMs: 1000, endsInMs: 5000, attacks: 2, attacksLeft: 2, best: 0, eligible: true } };
    const html = renderClan(game, { social }, { loggedIn: true });
    for (const [rank, place] of [[1, '1st'], [2, '2nd'], [3, '3rd']]) {
        assert.ok(html.includes(`<span class="clan-crown rank-${rank}" data-tip-title="${place}" data-tip="of all clans this week"`), `this week's ${place}`);
        assert.ok(html.includes(`<span class="clan-crown rank-${rank}" data-tip-title="${place}" data-tip="of all clans last week"`), `last week's ${place}`);
    }
    assert.doesNotMatch(html, /clan-crown rank-[45]/, 'three crowns, no more');
    assert.doesNotMatch(html, /division-row|clan-division|Old 9|division (this|last) week/, 'no divisions in sight, though the old fields came too');
    assert.match(html, /<b>#4<\/b> of 5/, "the clan's place in the table");
    // a page from this version against a server from before it: what it sent is shown, as ever
    const { crowned, ...older } = social.clan;
    assert.equal(crowned.rank, 2);
    const old = renderClan(game, { social: { ...social, clan: older, standing: { ...social.standing, table: undefined }, ranking: { ...ranking, table: undefined, last: { ...ranking.last, table: undefined } } } }, { loggedIn: true });
    assert.ok(old.includes('data-tip="in the Bronze division last week"'));
    assert.match(old, /class="clan-division div-gold"/);
    // the first table week: last week's crowns are still the divisions'
    const first = renderClan(game, { social: { ...social, clan: { ...social.clan, crowned: { rank: 1, division: 'gold', week: '2026-W48' } }, ranking: { ...ranking, last: { week: '2026-W48', divisions: ranking.last.divisions } } } }, { loggedIn: true });
    assert.match(first, /class="clan-division div-gold"/);
    assert.ok(first.includes('data-tip="in the Gold division last week"'));
    // a crown from a table week on the clan list; a clan the table did not crown shows none
    const list = renderClan(game, { social: { loaded: true, clan: null, clans: [{ id: 3, name: 'Hawks', tag: 'HWK', members: 4, crown: null, crowned: { rank: 3, week: 'x' } }, { id: 4, name: 'Owls', tag: 'OWL', members: 4, crown: { rank: 1, division: 'bronze' }, crowned: null }] } }, { loggedIn: true });
    assert.ok(list.includes('<span class="clan-crown rank-3" data-tip-title="3rd" data-tip="of all clans last week"'));
    assert.doesNotMatch(list, /clan-crown rank-1/);
});

test('the Clan card says the rule of the week being played, and until the table begins says when it does', () => {
    const set = CLAN_TABLE.from;
    const rules = () => FEATURES.clan.points.join(' ');
    try {
        CLAN_TABLE.from = '2999-12-30';
        assert.match(rules(), /Champion from 7/);
        assert.match(rules(), /top three of each division wear a crown/);
        assert.match(rules(), /From 30 December 2999 all clans stand in one table/);
        CLAN_TABLE.from = '2020-01-06';
        assert.match(rules(), /ranked in one table: most levels felled first/);
        assert.match(rules(), /1st, 2nd and 3rd of the table wear a crown/);
        assert.doesNotMatch(rules(), /division/);
    } finally { CLAN_TABLE.from = set; }
});
