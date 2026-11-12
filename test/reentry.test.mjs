// The welcome-back report's re-entry strip (systems/reentry.js, ui/reentry.js): after a day or more away, what the world
// did meanwhile, a line each and only for what the player has met; short after a month; one line when nothing waits.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { reentryFacts, REENTRY_AFTER_MS } from '../src/systems/reentry.js';
import { seen, evaluateDisclosures } from '../src/systems/disclosure.js';
import { eventStatus } from '../src/systems/events.js';
import { weeklyTrialAt } from '../src/data/trials.js';
import { isoWeek, CLAN_BANNER } from '../src/data/social.js';
import { renderReentry, backgroundLine } from '../src/ui/reentry.js';

rng.setSource(seededRandom(21));
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const SATURDAY = Date.UTC(2026, 10, 14, 12);    // a weekend event runs (Friday 00:00 to Monday 00:00 UTC)
const WEDNESDAY = Date.UTC(2026, 10, 18, 12);   // none does

/** A hero who has met the world: the clan and the events open, the Trials past their stage. */
function veteran(now, { clan = true, trials = true } = {}) {
    const game = new Game(null, now - 3 * DAY);
    const s = game.state;
    s.unlocks.events = true;
    if (clan) { s.unlocks.clan = true; s.clanHall.clan = 7; s.clanBanner = { week: isoWeek(now), kills: 3 }; }
    if (trials) s.combat.bestStage = 260;
    evaluateDisclosures(s);
    game.now = now;
    return game;
}
const away = (ms, extra = {}) => ({ elapsed: ms, simulated: Math.min(ms, DAY), festival: 0, ...extra });

test('no strip under a day away, nor before any of the world is met', () => {
    const game = veteran(SATURDAY);
    assert.equal(reentryFacts(game.state, SATURDAY, away(REENTRY_AFTER_MS - 60000)), null, 'under a day: the report alone');
    assert.ok(Array.isArray(reentryFacts(game.state, SATURDAY, away(REENTRY_AFTER_MS))), 'a day: the strip');
    const fresh = new Game(null, SATURDAY - DAY);
    assert.equal(seen(fresh.state, 'reentry'), false);
    assert.equal(reentryFacts(fresh.state, SATURDAY, away(3 * DAY)), null, 'a new player has met none of it');
    assert.equal(reentryFacts(game.state, SATURDAY, null), null);
});

test("the clan's week: levels felled and the banner, in a clan, as the server said it this week", () => {
    const game = veteran(SATURDAY);
    const clan = reentryFacts(game.state, SATURDAY, away(2 * DAY)).find(f => f.kind === 'clan');
    assert.deepEqual(clan, { kind: 'clan', kills: 3, levels: 7, mult: CLAN_BANNER[3] });
    game.state.clanBanner = { week: isoWeek(SATURDAY - 7 * DAY), kills: 5 };   // last week's word: not this week's
    assert.equal(reentryFacts(game.state, SATURDAY, away(2 * DAY)).find(f => f.kind === 'clan'), undefined);
    const guest = veteran(SATURDAY, { clan: false });
    guest.state.unlocks.clan = true;   // the tab open, but in no clan
    assert.equal(reentryFacts(guest.state, SATURDAY, away(2 * DAY)).find(f => f.kind === 'clan'), undefined);
});

test('the weekend event: running now, or ran while away; one line however long the absence', () => {
    const game = veteran(SATURDAY);
    const running = reentryFacts(game.state, SATURDAY, away(2 * DAY, { festival: 34 })).find(f => f.kind === 'event');
    assert.equal(running.running, true);
    assert.equal(running.tokens, 34);
    assert.equal(running.endsAt, eventStatus(game.state, SATURDAY).endsAt);
    // back on Wednesday: left on Saturday, the event ended while away; left on Tuesday, it was over before
    const later = veteran(WEDNESDAY);
    const ran = reentryFacts(later.state, WEDNESDAY, away(WEDNESDAY - SATURDAY)).filter(f => f.kind === 'event');
    assert.equal(ran.length, 1);
    assert.equal(ran[0].running, false);
    assert.equal(ran[0].name, eventStatus(later.state, SATURDAY).event.name);
    assert.equal(reentryFacts(later.state, WEDNESDAY, away(DAY)).find(f => f.kind === 'event'), undefined, 'over before the player left');
    // a month away: the latest event alone, and the strip stays four lines at most
    const month = reentryFacts(later.state, WEDNESDAY, away(30 * DAY), { changes: ['a', 'b', 'c', 'd', 'e'] });
    assert.equal(month.filter(f => f.kind === 'event').length, 1);
    assert.ok(month.length <= 4, `${month.length} lines`);
    assert.deepEqual(month.find(f => f.kind === 'changes').lines, ['a', 'b', 'c'], "the new version's news, capped");
});

test("the week's Trial: open once the Trials are met, its laurel to win or won", () => {
    const game = veteran(WEDNESDAY);
    const trial = reentryFacts(game.state, WEDNESDAY, away(2 * DAY)).find(f => f.kind === 'trial');
    assert.equal(trial.id, weeklyTrialAt(WEDNESDAY).trial.id);
    assert.equal(trial.won, false);
    assert.ok(trial.target > 0);
    game.state.trials.weekly = { start: weeklyTrialAt(WEDNESDAY).start, id: trial.id, bar: 0, won: 1, best: 300 };
    assert.equal(reentryFacts(game.state, WEDNESDAY, away(2 * DAY)).find(f => f.kind === 'trial').won, true);
    const early = veteran(WEDNESDAY, { trials: false });
    assert.equal(reentryFacts(early.state, WEDNESDAY, away(2 * DAY)).find(f => f.kind === 'trial'), undefined, 'not before the Trials are met');
});

test('the strip in words: a line each; one line when nothing waits, and none when the report has taps', () => {
    const game = veteran(SATURDAY);
    const facts = reentryFacts(game.state, SATURDAY, away(2 * DAY, { festival: 12 }));
    const html = renderReentry(facts, { ready: 0, now: SATURDAY });
    assert.match(html, /Your clan felled <b>3 of 7<\/b> levels/);
    assert.match(html, /runs for .* more: <b>\+12 Festival Tokens<\/b> while away/);
    assert.match(html, /This week's Trial, <b>/);
    assert.match(html, /FI\.switchTab\('clan'\)/, "the clan's line goes to the Clan tab");
    assert.doesNotMatch(html, /Nothing is waiting/);
    assert.match(renderReentry([], { ready: 0 }), /Nothing is waiting for you/);
    assert.equal(renderReentry([], { ready: 2 }), '', 'the taps on the report are what waits');
    assert.equal(renderReentry(null), '', 'no strip');
    assert.doesNotMatch(renderReentry([{ kind: 'changes', lines: ['<b>x</b>'] }]), /<b>x<\/b>/, 'news is text, not markup');
});

test("the strip sits under the report's haul, and a hidden tab's toast names the time and the haul", async () => {
    const { renderWelcomeBack } = await import('../src/ui/render.js');
    const game = veteran(SATURDAY);
    game.state.combat.active = true;
    const summary = { elapsed: 2 * DAY, simulated: DAY, capped: true, mode: 'combat', kills: 1200, stages: 3, prestiges: 2, tokens: 40, gold: 5000,
        resources: { copper_ore: 30 }, skills: {}, items: 0, salvaged: 0, deaths: 0, dungeonClears: [], pets: [], petIds: [], uniques: 0, gilded: 0, stars: 0, festival: 12 };
    const facts = reentryFacts(game.state, SATURDAY, summary);
    const html = renderWelcomeBack(summary, game, { strip: ready => renderReentry(facts, { ready, now: SATURDAY }) });
    const at = html.indexOf('wb-world');
    assert.ok(at > html.indexOf('wb-tiles') && at < html.indexOf('modal-footer'), 'after the haul, before Collect');
    assert.equal(renderWelcomeBack(summary, game).includes('wb-world'), false, 'none without one');
    assert.equal(backgroundLine({ mode: 'combat', simulated: 37 * 60000, kills: 354, prestiges: 2, skills: {} }), '37m in the background: 354 monsters, 2 prestiges');
    assert.equal(backgroundLine({ mode: 'skill', simulated: 80 * 60000, skills: { mining: { xp: 1500 } } }), '1h 20m in the background: +1,500 Mining XP');
});

test('a day away fighting through a weekend event: the report counts its Festival Tokens', () => {
    rng.setSource(seededRandom(22));
    const start = SATURDAY - DAY;   // Friday noon: the event is on the whole day away
    const game = new Game(null, start);
    game.state.combat.bestStage = 30; game.state.prestige.tokens = 200;
    game.recompute();
    game.enterCombat();
    const raw = JSON.parse(game.serialize(start));
    const back = new Game(raw, SATURDAY);
    const summary = back.resumeFromSave(SATURDAY);
    assert.ok(summary.festival > 0, `${summary.festival} tokens`);
    assert.equal(summary.festival, back.state.events.tokens - raw.events.tokens);
});
