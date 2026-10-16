// The skill mini-games after the owner's go-ahead (October 2026, DESIGN §3.15): every game can be lost but is easy,
// each zone has a Perfect centre (15 s more and always a find), an ordinary win brings a find now and then, better
// resources play harder while levels make them easier, and a chance waits a minute.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { BASE } from '../src/core/modifiers.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { RESOURCES } from '../src/data/resources.js';
import { SKILLS } from '../src/data/skills.js';
import { CHALLENGE_MS, HOLD_MS, bandAt, buildChallenge, minigameDifficulty, perfectZone, giveFind, hasOpportunity } from '../src/systems/minigame.js';

const T0 = Date.UTC(2026, 9, 17, 12);
const b = BALANCE.minigame;
const node = (skill, id) => SKILLS[skill].nodes.find(n => n.id === id);

/** A game working `skill` at `id`, with a chance open at once (the developer switch opens one any time). */
function working(skill, id, level = 99) {
    const game = new Game(null, T0);
    game.state.settings.devUnlockAll = true;
    game.state.skills[skill].xp = xpForLevel(level);
    for (const r of Object.keys(RESOURCES)) game.state.resources[r] = 1000;
    game.recompute();
    assert.ok(game.startNodeAction(skill, id), `working ${skill} ${id}`);
    game.drainEvents();
    return game;
}

/** Put a timing game's marker at `pos` (0-1 along the track) now. */
function markerAt(game, skill, pos) {
    const ch = game.state.minigame[skill].challenge;
    ch.startedAt = game.now - pos * ch.cycleMs;
    return ch;
}

test('a tap in the gold centre is Perfect: 15 s more, and always a find; at the edge an ordinary win; outside, a miss', () => {
    const game = working('mining', 'mithril_ore');
    const mg = game.state.minigame.mining;
    rng.setSource(() => 0.99);   // no find by chance: only the Perfect brings one
    assert.ok(game.startMinigame('mining'));
    const ch = markerAt(game, 'mining', 0);
    const p = perfectZone(ch);
    markerAt(game, 'mining', (p.lo + p.hi) / 2);
    const gems = Object.keys(RESOURCES).filter(r => RESOURCES[r].category === 'gem').reduce((n, r) => n + game.state.resources[r], 0);
    assert.equal(game.resolveMinigame('mining'), true);
    const win = game.drainEvents().find(e => e.type === 'minigameWin');
    assert.equal(win.perfect, true);
    assert.equal(win.ms, b.boostMs + b.perfectMs);
    assert.equal(mg.boostUntil - game.now, b.boostMs + b.perfectMs);
    assert.equal(win.find.kind, 'gem');
    const after = Object.keys(RESOURCES).filter(r => RESOURCES[r].category === 'gem').reduce((n, r) => n + game.state.resources[r], 0);
    assert.equal(after, gems + 1, 'a gem in the bag');
    assert.ok(Math.abs(RESOURCES[win.find.id].tier - RESOURCES.mithril_ore.tier) <= 1, 'of the vein\'s tier, or one either side');
    assert.equal(game.state.stats.minigamePerfects, 1);

    // the zone's edge: a win, not Perfect, and (the dice say no) no find; the streak makes it 5 s longer
    game.startMinigame('mining');
    const edge = markerAt(game, 'mining', 0);
    markerAt(game, 'mining', edge.zoneStart + edge.zoneWidth * 0.05);
    assert.equal(game.resolveMinigame('mining'), true);
    const plain = game.drainEvents().find(e => e.type === 'minigameWin');
    assert.equal(plain.perfect, false);
    assert.equal(plain.find, null);
    assert.equal(plain.ms, b.boostMs + b.streakMs);

    // ... and when the dice say yes, an ordinary win brings a find too
    rng.setSource(() => 0.01);
    game.startMinigame('mining');
    const edge2 = markerAt(game, 'mining', 0);
    markerAt(game, 'mining', edge2.zoneStart + edge2.zoneWidth * 0.05);
    game.resolveMinigame('mining');
    assert.equal(game.drainEvents().find(e => e.type === 'minigameWin').find.kind, 'gem');

    // outside the zone: a miss, and the streak starts again
    game.startMinigame('mining');
    const out = markerAt(game, 'mining', 0);
    markerAt(game, 'mining', Math.max(0, out.zoneStart - 0.1));
    assert.equal(game.resolveMinigame('mining'), false);
    assert.equal(mg.streak, 0);
    rng.setSource(Math.random);
});

/** Play a held game for up to its time: `steer(ch, band)` runs each 100 ms tick. Returns the win event, or null. */
function hold(game, skill, steer) {
    const ch = game.state.minigame[skill].challenge;
    let now = game.now;
    for (let t = 0; t < CHALLENGE_MS + 500; t += 100) {
        if (!game.state.minigame[skill].challenge) break;
        steer(ch, bandAt(ch, now));
        game.tick(now += 100);
    }
    return game.drainEvents().find(e => e.type === 'minigameWin') || null;
}

test('the heat and the brew are held in a moving band until done: steady is Perfect, a slip is a plain win, idle is lost', () => {
    rng.setSource(seededRandom(3));
    // the cook who taps whenever the heat falls under the band's middle: done, and never slipped
    const cook = working('cooking', 'cooked_rabbit');
    assert.ok(cook.startMinigame('cooking'));
    assert.equal(cook.state.minigame.cooking.challenge.type, 'heat');
    assert.equal(cook.resolveMinigame('cooking'), false, 'a tap is no way to win a held game');
    let won = hold(cook, 'cooking', (ch, band) => { while (ch.heat < (band.lo + band.hi) / 2 - 0.02) cook.pumpHeat('cooking'); });
    assert.ok(won, 'the dish is done');
    assert.equal(won.perfect, true);
    assert.ok(won.find, 'a Perfect always finds something');

    // one who lets it slip out once it was in: still done, but not Perfect
    cook.startMinigame('cooking');
    let slipped = false;
    won = hold(cook, 'cooking', (ch, band) => {
        if (!slipped && ch.progress > 0.3) { ch.heat = 0; slipped = true; return; }
        while (ch.heat < (band.lo + band.hi) / 2 - 0.02) cook.pumpHeat('cooking');
    });
    assert.ok(won && won.perfect === false, JSON.stringify(won));

    // one who never taps: the heat only falls, and the chance is lost
    cook.startMinigame('cooking');
    won = hold(cook, 'cooking', () => {});
    assert.equal(won, null);
    assert.equal(cook.state.minigame.cooking.challenge, null);
    assert.equal(cook.state.minigame.cooking.streak, 0);

    // the brew: the stabiliser kept in the drifting channel
    const alch = working('alchemy', 'combat_potion_1');
    assert.ok(alch.startMinigame('alchemy'));
    won = hold(alch, 'alchemy', (ch, band) => alch.setDragValue('alchemy', (band.lo + band.hi) / 2));
    assert.ok(won && won.perfect, 'held in the channel: Perfect');
    alch.startMinigame('alchemy');
    won = hold(alch, 'alchemy', () => alch.setDragValue('alchemy', 0));
    assert.equal(won, null, 'left at the side: lost');
    rng.setSource(Math.random);
});

test('a held game left alone in a background tab is never won by itself', () => {
    const cook = working('cooking', 'cooked_rabbit');
    cook.startMinigame('cooking');
    const ch = cook.state.minigame.cooking.challenge;
    const band = bandAt(ch, cook.now);
    ch.heat = (band.lo + band.hi) / 2;
    cook.tick(cook.now + 60_000);   // one tick a minute, as a hidden tab gets
    assert.equal(cook.state.minigame.cooking.challenge, null);
    assert.equal(cook.drainEvents().some(e => e.type === 'minigameWin'), false);
    assert.ok(HOLD_MS > 1000);
});

test('a better resource plays faster and narrower; the levels above it widen it again', () => {
    const at = (skill, id, level) => minigameDifficulty(working(skill, id, level).state, skill);
    assert.deepEqual(at('mining', 'copper_ore', 1), { d: 0, ease: 0 });
    const runite75 = at('mining', 'runite_ore', 75);
    const runite99 = at('mining', 'runite_ore', 99);
    assert.ok(runite75.d > 0.7 && runite75.ease === 0);
    assert.ok(runite99.ease > 0.4);
    rng.setSource(() => 0.5);
    const copper = buildChallenge('timing', T0, { d: 0, ease: 0 });
    const hard = buildChallenge('timing', T0, runite75);
    const easier = buildChallenge('timing', T0, runite99);
    assert.ok(hard.zoneWidth < copper.zoneWidth && hard.cycleMs < copper.cycleMs, 'runite: narrower and faster than copper');
    assert.ok(easier.zoneWidth > hard.zoneWidth && easier.cycleMs > hard.cycleMs, 'and wider and slower at 99');
    const heat = buildChallenge('heat', T0, runite75);
    const mild = buildChallenge('heat', T0, { d: 0, ease: 0 });
    assert.ok(heat.bandWidth < mild.bandWidth && heat.decay > mild.decay && heat.drift > mild.drift);
    rng.setSource(Math.random);
});

test('the finds: things each skill already makes, about 20 seconds of its work, with nothing spent', () => {
    rng.setSource(() => 0.01);   // every nest holds a gem
    const qty = (skill, id) => Math.max(1, Math.round((b.findSeconds * 1000) / node(skill, id).interval));
    const wood = working('woodcutting', 'oak_log');
    const logs = wood.state.resources.oak_log;
    const nest = giveFind(wood, 'woodcutting');
    assert.equal(nest.kind, 'nest');
    assert.equal(wood.state.resources.oak_log - logs, qty('woodcutting', 'oak_log'));
    assert.ok(nest.gem && RESOURCES[nest.gem].category === 'gem');

    const hunt = working('hunting', 'raw_boar');
    const boar = hunt.state.resources.raw_boar;
    assert.equal(giveFind(hunt, 'hunting').kind, 'game');
    assert.equal(hunt.state.resources.raw_boar - boar, qty('hunting', 'raw_boar'));
    const river = working('hunting', 'raw_trout');
    const bait = river.state.resources.fishing_bait;
    assert.deepEqual(giveFind(river, 'hunting'), { kind: 'bait', id: 'fishing_bait', qty: b.baitFind });
    assert.equal(river.state.resources.fishing_bait - bait, b.baitFind);

    const cook = working('cooking', 'cooked_boar');
    const before = { dish: cook.state.resources.cooked_boar, raw: cook.state.resources.raw_boar, log: cook.state.resources.willow_log };
    giveFind(cook, 'cooking');
    assert.equal(cook.state.resources.cooked_boar - before.dish, qty('cooking', 'cooked_boar'));
    assert.equal(cook.state.resources.raw_boar, before.raw, 'no raw meat spent');
    assert.equal(cook.state.resources.willow_log, before.log, 'nor logs');

    const alch = working('alchemy', 'combat_potion_1');
    const potions = alch.state.resources.combat_potion_1;
    giveFind(alch, 'alchemy');
    assert.equal(alch.state.resources.combat_potion_1 - potions, qty('alchemy', 'combat_potion_1'));

    const fire = working('firemaking', 'burn_oak_log');
    fire.state.bonfire.until = 0;
    const lit = giveFind(fire, 'firemaking');
    assert.equal(lit.kind, 'bonfire');
    assert.equal(lit.bonfireMs, qty('firemaking', 'burn_oak_log') * BASE.bonfireSecondsPerLogTier * 1000 * RESOURCES.oak_log.tier);
    assert.equal(fire.state.bonfire.until, fire.now + lit.bonfireMs);
    rng.setSource(Math.random);
});

test('a chance waits a minute; the chime is on unless turned off, and a save keeps the choice', () => {
    assert.equal(b.opportunityWindowMs, 60_000);
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    let now = T0;
    while (!hasOpportunity(game.state, 'mining', now) && now < T0 + 5 * 60_000) game.tick(now += 1000);
    const opened = now;
    while (hasOpportunity(game.state, 'mining', now)) game.tick(now += 1000);
    assert.ok(now - opened >= 59_000 && now - opened <= 61_000, `open for ${(now - opened) / 1000} s`);
    assert.equal(game.state.settings.minigameChime, true);
    const saved = JSON.parse(game.serialize(now));
    saved.settings.minigameChime = false;
    assert.equal(migrateState(saved, now).settings.minigameChime, false);
    delete saved.settings.minigameChime;
    assert.equal(migrateState(saved, now).settings.minigameChime, true, 'an old save: on');
});
