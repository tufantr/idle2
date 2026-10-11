// The clan boss fight (systems/clanfight.js, core/power.js): a short fight on screen, reckoned on the
// server from the stored hero and the strike times, so a forged list deals no more than a perfect player.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { clanFightDamage, cleanStrikes, clanGuardDown, clanAttackFromSave, expectedDps } from '../src/core/power.js';
import { CLAN_FIGHT_MS, CLAN_GUARD, clanBossFor } from '../src/data/social.js';
import { BALANCE } from '../src/core/formulas.js';

rng.setSource(seededRandom(11));
const T0 = 1_760_000_000_000;
const hero = interval => ({ atk: 100, critChance: 0.1, critDmg: 2, attackInterval: interval });
const everyQuarter = Array.from({ length: CLAN_FIGHT_MS / 250 + 1 }, (_, i) => i * 250);

test('a fight without a strike deals what the hero deals in it; strikes land only in the openings', () => {
    const d = hero(1500);
    const idle = clanFightDamage(d, []);
    assert.equal(idle.damage, Math.floor(expectedDps(d) * CLAN_FIGHT_MS / 1000), 'twenty attacks in thirty seconds');
    const shut = clanFightDamage(d, cleanStrikes(everyQuarter.filter(t => !clanGuardDown(t))));
    assert.equal(shut.damage, idle.damage, 'strikes against its guard add nothing');
    assert.equal(shut.guarded, 0);
    const open = clanFightDamage(d, cleanStrikes(everyQuarter.filter(clanGuardDown)));
    assert.ok(open.damage > idle.damage);
    assert.equal(open.guarded, open.strikes);
    // the openings: CLAN_GUARD.open ms every CLAN_GUARD.every ms from CLAN_GUARD.first
    assert.equal(clanGuardDown(CLAN_GUARD.first - 1), false);
    assert.equal(clanGuardDown(CLAN_GUARD.first), true);
    assert.equal(clanGuardDown(CLAN_GUARD.first + CLAN_GUARD.open), false);
    assert.equal(clanGuardDown(CLAN_GUARD.first + CLAN_GUARD.every), true);
});

test('an auto-clicker gets no more than a fast player in the openings, about 1.3 to 2 times a hero who watches', () => {
    for (const interval of [600, 1000, 1500, 2400]) {
        const d = hero(interval);
        const idle = clanFightDamage(d, []).damage;
        const bot = clanFightDamage(d, cleanStrikes(everyQuarter)).damage;
        const player = clanFightDamage(d, cleanStrikes(everyQuarter.filter(clanGuardDown))).damage;
        assert.equal(player, bot, `interval ${interval}: clicking only in the openings is all it takes`);
        assert.ok(bot / idle >= 1.2 && bot / idle <= 2, `interval ${interval}: ×${(bot / idle).toFixed(2)}`);
    }
});

test('a forged strike list is cleaned: too fast, outside the fight, not numbers, too many', () => {
    const d = hero(1500);
    const perfect = clanFightDamage(d, cleanStrikes(everyQuarter)).damage;
    const forged = Array.from({ length: 5000 }, (_, i) => i * 6);   // every 6 ms
    assert.ok(clanFightDamage(d, cleanStrikes(forged)).damage <= perfect);
    const cleaned = cleanStrikes([5000, 'x', null, -3, CLAN_FIGHT_MS + 1, 4000, 4100, NaN, Infinity, 4400, 4400]);
    assert.deepEqual(cleaned, [4000, 4400, 5000], 'in order, a quarter second apart, inside the fight');
    assert.deepEqual(cleanStrikes('not a list'), []);
    // a shorter fight (Give up) deals less, and no fight longer than the clock
    const short = clanFightDamage(d, [], 10_000).damage;
    assert.ok(short < clanFightDamage(d, []).damage);
});

test('the server reckons a fight from a stored save, whatever the page claims', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    const save = JSON.parse(game.serialize(T0));
    const plain = clanAttackFromSave(save, undefined, undefined, T0);
    assert.ok(plain.damage > 0);
    assert.equal(clanAttackFromSave(save, [], 'lots', T0).damage, plain.damage, 'a nonsense length is the whole fight');
    assert.ok(clanAttackFromSave(save, [], 999_999, T0).damage === plain.damage, 'no fight is longer than the clock');
    assert.ok(clanAttackFromSave(save, everyQuarter, CLAN_FIGHT_MS, T0).damage > plain.damage);
});

test('the clan fight in the game: the week\'s boss, strikes kept and landing in the openings, back to work after', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    game.startNodeAction('mining', 'copper_ore');
    assert.equal(game.startClanFight({ week: '2026-W41', hp: 1e12, maxHp: 1e12 }), true);
    const c = game.state.combat;
    assert.equal(c.mode, 'clan');
    assert.equal(c.enemy.name, clanBossFor('2026-W41').name);
    assert.equal(game.state.action, null, 'no work while it lasts');
    // blocked meanwhile: another clan fight, the Titan, a dungeon, travel, prestige
    assert.equal(game.startClanFight({ week: '2026-W41', hp: 5, maxHp: 5 }), false);
    game.state.combat.bestStage = 60;
    assert.equal(game.challengeTitan(), false);
    assert.equal(game.enterDungeon('goblin_warren'), false);
    assert.equal(game.travel(5), false);
    assert.equal(game.canPrestige(), false);
    game.drainEvents();

    let now = game.now;
    const hpAtStart = c.hp;
    const strikeAt = ms => { now = T0 + ms; game.tick(now); return game.clickAttack(); };
    strikeAt(1000);   // guard up: it glances off
    const glances = game.drainEvents().filter(e => e.type === 'glance').length;
    assert.equal(glances, 1);
    assert.equal(c.combo, 0, 'a strike off its guard builds no combo');
    strikeAt(CLAN_GUARD.first + 500);   // guard down: it lands
    const landed = game.drainEvents().filter(e => e.type === 'hit' && e.manual);
    assert.equal(landed.length, 1);
    assert.ok(landed[0].dmg >= Math.floor(game.derived.atk * BALANCE.combat.manualHitMult * CLAN_GUARD.mult * 0.9 - 1), 'a strike lands harder in the opening');
    assert.deepEqual(game.state.clanFight.strikes, [1000, CLAN_GUARD.first + 500]);

    for (let t = now + 1000; t <= T0 + CLAN_FIGHT_MS + 2000; t += 1000) game.tick(t);
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, false);
    assert.equal(game.state.action?.id, 'copper_ore', 'back at the copper');
    assert.equal(c.hp >= hpAtStart, true, 'the clan boss never hit back');
    assert.deepEqual(game.state.clanResult.strikes, [1000, CLAN_GUARD.first + 500]);
    assert.equal(game.state.clanResult.ms, CLAN_FIGHT_MS);
    const [over] = game.drainEvents().filter(e => e.type === 'clanFight');
    assert.equal(over.reason, 'time');

    // what was fought waits to be sent, even across a reload; once sent it is forgotten
    const reloaded = new Game(JSON.parse(game.serialize()), game.now);
    assert.deepEqual(reloaded.state.clanResult.strikes, [1000, CLAN_GUARD.first + 500]);
    assert.equal(game.startClanFight({ week: '2026-W41', hp: 5, maxHp: 5 }), false, 'not before the last one is sent');
    assert.equal(game.clearClanResult(), true);
    assert.equal(game.state.clanResult, null);
});

test('felling the clan boss here ends the fight, pays nothing here, and counts as the whole fight for the server', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    game.toggleCombat();   // fighting at the stages
    const gold = game.state.gold;
    const kills = game.state.stats.kills;
    // regression (the owner's report): a boss nearly down fell to the first swing, and the fight was sent
    // as the time before that swing, so the server counted no hit and took 1 health off
    const save = JSON.parse(game.serialize(game.now));
    game.startClanFight({ week: '2026-W42', hp: 2, maxHp: 1000 });
    for (let t = 100; t <= 5000; t += 100) game.tick(T0 + t);   // the step the swing lands in, as in play
    const c = game.state.combat;
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, true, 'he was fighting: he fights on at the stages');
    assert.equal(game.state.gold, gold, 'no gold from the clan boss');
    assert.equal(game.state.stats.kills, kills, 'nor a kill');
    assert.equal(game.state.clanResult.ms, CLAN_FIGHT_MS, 'the whole fight');
    assert.equal(game.drainEvents().find(e => e.type === 'clanFight').reason, 'felled');
    const reckoned = clanAttackFromSave(save, game.state.clanResult.strikes, game.state.clanResult.ms, game.now);
    assert.ok(reckoned.damage > 2 * 10, `the server's reckoning fells it too, many times over (${reckoned.damage})`);
});

test('a reload in the middle of a clan fight: the fight is gone, nothing is spent, he is back at his work', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    game.startNodeAction('woodcutting', 'normal_log');
    game.startClanFight({ week: '2026-W41', hp: 1e12, maxHp: 1e12 });
    game.tick(game.now + 3000);
    const back = new Game(JSON.parse(game.serialize()), game.now);
    assert.equal(back.state.combat.mode, 'stages');
    assert.equal(back.state.combat.active, false);
    assert.equal(back.state.action?.id, 'normal_log');
    assert.equal(back.state.clanFight, null);
    assert.equal(back.state.clanResult, null, 'an attack not finished is not spent');
});

test('Give up ends the clan fight with what was done; a tab put to sleep mid-fight ends it and keeps the result', () => {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    game.startClanFight({ week: '2026-W41', hp: 1e12, maxHp: 1e12 });
    game.tick(game.now + 8000);
    game.toggleCombat();   // Give up
    assert.equal(game.state.combat.mode, 'stages');
    assert.ok(game.state.clanResult.ms >= 7000 && game.state.clanResult.ms <= 9000, `${game.state.clanResult.ms}`);
    game.clearClanResult();

    game.startNodeAction('mining', 'copper_ore');
    game.startClanFight({ week: '2026-W41', hp: 1e12, maxHp: 1e12 });
    const ore = game.state.resources.copper_ore;
    game.tick(game.now + 20 * 60 * 1000);   // a long gap: replayed as time away
    assert.equal(game.state.combat.mode, 'stages');
    assert.equal(game.state.clanResult.ms, CLAN_FIGHT_MS);
    assert.equal(game.state.action?.id, 'copper_ore');
    assert.ok(game.state.resources.copper_ore > ore, 'and his work filled the rest of the time');
});
