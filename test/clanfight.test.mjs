// The clan boss fight (systems/clanfight.js, core/power.js): a short fight on screen, reckoned on the
// server from the stored hero and the strike times, so a forged list deals no more than a perfect player.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { clanFightDamage, cleanStrikes, clanGuardDown, clanAttackFromSave, clanAttackScale, plainAttack, expectedDps } from '../src/core/power.js';
import { CLAN_FIGHT_MS, CLAN_GUARD, clanBossFor } from '../src/data/social.js';
import { BALANCE } from '../src/core/formulas.js';
import { tickCombat } from '../src/systems/combat.js';
import { clanFightFells } from '../src/systems/clanfight.js';
import { fightTab } from '../src/ui/features.js';
import { battleMode } from '../src/ui/render.js';

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

test('a clan attack is the hero at his best of the week: the fight from the stored save, raised to that best', () => {
    // the owner, October 2026: the same hero hit seven times harder at a run's end (the camp full) than just after a prestige
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    const save = JSON.parse(game.serialize(T0));
    const plain = plainAttack(save, T0);
    const fight = clanAttackFromSave(save, everyQuarter, CLAN_FIGHT_MS, T0);
    assert.equal(fight.damage, clanAttackFromSave(save, everyQuarter, CLAN_FIGHT_MS, T0, plain / 2).damage, 'a best below the hero now changes nothing');
    const best = clanAttackFromSave(save, everyQuarter, CLAN_FIGHT_MS, T0, plain * 3);
    assert.ok(Math.abs(best.damage - fight.damage * 3) <= 3, `${best.damage} = 3 × ${fight.damage}`);
    assert.equal(best.scale, 3);
    assert.equal(best.guarded, fight.guarded, 'the strikes are this fight\'s');
    // half a fight is half of it, at the best as well
    const half = clanAttackFromSave(save, [], CLAN_FIGHT_MS / 2, T0, plain * 3).damage;
    assert.ok(half > plain * 3 * 0.4 && half < plain * 3 * 0.6, `${half} of ${plain * 3}`);
    for (const [b, p] of [[0, 10], [NaN, 10], [-5, 10], [10, 0], [Infinity, 10], [5, 10]]) assert.equal(clanAttackScale(b, p), 1, `${b} over ${p}`);
    assert.equal(clanAttackScale(30, 10), 3);
});

test('the clan fight in the game hits at the hero\'s best of the week, as the server will count it', () => {
    const hitsAt = scale => {
        rng.setSource(seededRandom(5));
        const game = new Game(null, T0);
        game.state.combat.bestStage = 40;
        game.state.prestige.tokens = 20000;   // hits big enough that rounding them to whole numbers is nothing
        game.recompute();
        game.startClanFight({ week: '2026-W41', hp: 1e15, maxHp: 1e15, scale });
        game.drainEvents();
        for (let t = T0 + 1000; t <= T0 + 10000; t += 1000) game.tick(t);
        return game.drainEvents().filter(e => e.type === 'hit').reduce((sum, e) => sum + e.dmg, 0);
    };
    const own = hitsAt(undefined);
    assert.ok(own > 0);
    assert.equal(hitsAt(1), own);
    assert.equal(hitsAt('lots'), own, 'a scale that is not a number is none');
    const four = hitsAt(4);
    assert.ok(Math.abs(four / own - 4) < 0.05, `x${(four / own).toFixed(3)}`);
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

test('the clan boss is fought on the Clan tab, which shows the clan again after it, even when the hero fights on at the stages', () => {
    // the owner, October 2026: after an attack the screen went on to the stages instead of back to the Clan tab
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.recompute();
    game.toggleCombat();   // at the stages before the attack
    const c = game.state.combat;
    assert.equal(c.active, true);
    const ui = { tab: 'clan', battleFull: true };
    assert.equal(fightTab(game, ui), 'combat');
    assert.equal(game.startClanFight({ week: '2026-W41', hp: 1e12, maxHp: 1e12 }), true);
    assert.equal(fightTab(game, ui), 'clan', 'fought where it is begun');
    assert.equal(battleMode(game, ui), true, 'filling the screen there');
    for (let t = T0 + 1000; t <= T0 + CLAN_FIGHT_MS + 2000; t += 1000) game.tick(t);
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, true, 'back at the stages, as before the attack');
    assert.equal(fightTab(game, ui), 'combat', 'the stages are fought under Combat');
    assert.equal(battleMode(game, ui), false, 'the Clan tab shows the clan');
    // its end held on screen a moment (main.js), then the clan
    ui.clanHoldUntil = ui.battleHoldUntil = game.now + 2400;
    assert.equal(fightTab(game, ui), 'clan');
    assert.equal(battleMode(game, ui), true);
    game.tick(game.now + 3000);
    assert.equal(battleMode(game, ui), false);
    // Give up: the same, at once
    game.clearClanResult();
    assert.equal(game.startClanFight({ week: '2026-W41', hp: 1e12, maxHp: 1e12 }), true);
    game.toggleCombat();
    assert.equal(c.mode, 'stages');
    assert.equal(c.active, true);
    assert.equal(fightTab(game, {}), 'combat');
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

// ----- the boss falls on screen when the server's own sum says so (the fight rolls dice, the server counts expected values) -----

const WEEK = '2026-W41';
/** A hero strong enough for whole numbers to be nothing, and his save as it went up to the server. */
function clanHero() {
    const game = new Game(null, T0);
    game.state.combat.bestStage = 40;
    game.state.prestige.tokens = 3000;
    game.recompute();
    return { game, save: JSON.parse(game.serialize(T0)) };
}
const inOpenings = [...everyQuarter].filter(clanGuardDown);
/** Play the clan fight on in the fight's own steps (quicker than whole game ticks), striking at `strikes` (ms into it), until `until` or its end. */
function fight(game, strikes = [], until = Infinity) {
    const c = game.state.combat;
    const start = game.now - (CLAN_FIGHT_MS - c.bossTimeLeft);
    while (c.mode === 'clan' && game.now - start < until) {
        game.now += 50;
        tickCombat(game, 50);
        for (const t of strikes) if (c.mode === 'clan' && t === game.now - start) game.clickAttack();
    }
}
/** How the fight ended, what it sent, and whether the server's sum over what it sent fells a boss of `hp`. */
function outcome(game, save, hp, best = 0) {
    const reason = game.drainEvents().find(e => e.type === 'clanFight')?.reason;
    const sent = game.state.clanResult;
    game.clearClanResult();
    return { reason, sent, fells: clanAttackFromSave(save, sent.strikes, sent.ms, game.now, best).damage >= hp };
}

test('near the edge, the boss falls on screen exactly when the server\'s sum over the attack fells it', () => {
    const { game, save } = clanHero();
    const sums = new Map();   // (most fights send the same strikes: the server's sum once for each list keeps this quick)
    const serverSum = sent => {
        const key = sent.strikes.join();
        if (!sums.has(key)) sums.set(key, clanAttackFromSave(save, sent.strikes, sent.ms, game.now).damage);
        return sums.get(key);
    };
    const tally = { felled: 0, stood: 0, early: 0, atTheClock: 0, held: 0 };
    for (let seed = 1; seed <= 4; seed++) {
        rng.setSource(seededRandom(seed * 101));
        for (const strikes of [[], inOpenings.filter((_, i) => (i + seed) % 3)]) {
            const whole = clanAttackFromSave(save, strikes, CLAN_FIGHT_MS, T0).damage;
            for (let share = 0.92; share < 1.081; share += 0.02) {
                const hp = Math.floor(whole * share);
                const began = game.now;
                assert.equal(game.startClanFight({ week: WEEK, hp, maxHp: hp }), true);
                game.drainEvents();
                const boss = game.state.combat.enemy;
                let held = false;
                for (let t = 1000; game.state.combat.mode === 'clan'; t += 1000) { fight(game, strikes, t); held ||= boss.hp === 1; }
                const { reason } = game.drainEvents().find(e => e.type === 'clanFight');
                const sent = game.state.clanResult;
                game.clearClanResult();
                const fells = serverSum(sent) >= hp;
                assert.equal(reason, fells ? 'felled' : 'time', `seed ${seed}, ${strikes.length} strikes, ${share.toFixed(2)} of a whole fight: the server's sum ${serverSum(sent)} against ${hp}`);
                assert.equal(sent.ms, CLAN_FIGHT_MS);
                tally[fells ? 'felled' : 'stood']++;
                if (fells) tally[game.now - began < CLAN_FIGHT_MS ? 'early' : 'atTheClock']++;
                if (held) tally.held++;
            }
        }
    }
    for (const [what, n] of Object.entries(tally)) assert.ok(n > 0, `the fights above should hold some of each: ${JSON.stringify(tally)} (${what})`);
});

test('to the last point, however the hero stands: a boss of the server\'s sum falls, one more stands', () => {
    const { game } = clanHero();
    const s = game.state;
    // all that the fight or the server leaves out: a Trial, the clan's banner, Focus, the bonfire, a skill's boost; and the potion, which counts
    s.trials.active = ['rusted'];
    s.clanBanner = { week: WEEK, kills: 3 };
    s.bonfire.until = T0 + 3600000;
    s.meta.lastInputAt = T0 - 600000;
    s.minigame.mining.boostUntil = T0 + 3600000;
    s.combat.potion = 'combat_potion_1';
    s.resources.combat_potion_1 = 50;
    game.recompute();
    const save = JSON.parse(game.serialize(T0));
    const best = plainAttack(save, T0) * 2.5;
    for (const scale of [undefined, best / plainAttack(save, T0)]) for (const strikes of [[], inOpenings.slice(0, 9)]) {
        const whole = clanAttackFromSave(save, strikes, CLAN_FIGHT_MS, T0, scale ? best : 0).damage;
        assert.ok(whole > 1000);
        for (const [hp, ends] of [[whole, 'felled'], [whole + 1, 'time']]) {
            rng.setSource(seededRandom(hp % 1000));
            game.startClanFight({ week: WEEK, hp, maxHp: hp, scale });
            game.drainEvents();
            fight(game, strikes);
            const { reason, fells } = outcome(game, save, hp, scale ? best : 0);
            assert.equal(reason, ends, `a boss of ${hp}, its sum ${whole}, scale ${scale}, ${strikes.length} strikes`);
            assert.equal(fells, ends === 'felled');
        }
    }
});

test('a boss whose bar runs out first holds on at 1, keeps fighting, and a strike that takes the sum past it finishes it', () => {
    const { game, save } = clanHero();
    rng.setSource(() => 0);   // every hit a critical one: the bar runs out long before the sum does
    const hp = clanAttackFromSave(save, [], CLAN_FIGHT_MS, T0).damage + 1;
    game.startClanFight({ week: WEEK, hp, maxHp: hp });
    game.drainEvents();
    const c = game.state.combat;
    const boss = c.enemy;
    const opening = inOpenings.filter(t => (t - CLAN_GUARD.first) % CLAN_GUARD.every === 0).at(-1);   // the fight's last opening
    fight(game, [], opening);
    assert.equal(c.mode, 'clan', 'the fight goes on');
    assert.equal(boss.hp, 1, 'at its last sliver');
    assert.equal(clanFightFells(game), false);
    const hits = game.drainEvents().filter(e => e.type === 'hit').length;
    assert.ok(hits >= 3, `the hero still swings at it (${hits})`);
    assert.equal(game.clickAttack(), true);
    assert.equal(c.mode, 'stages', 'the strike finished it');
    const { reason, sent, fells } = outcome(game, save, hp);
    assert.equal(reason, 'felled');
    assert.deepEqual(sent.strikes, [opening]);
    assert.equal(sent.ms, CLAN_FIGHT_MS);
    assert.equal(fells, true);
    // without that strike it outlasts the clock, at its sliver
    game.startClanFight({ week: WEEK, hp, maxHp: hp });
    game.drainEvents();
    fight(game);
    assert.equal(outcome(game, save, hp).reason, 'time');
    rng.setSource(seededRandom(11));
});

test('a boss the sum fells falls when the clock ends, though its bar still shows health', () => {
    const { game, save } = clanHero();
    const low = game.derived.critChance + 0.001;   // no critical hit, and the lowest rolls: the bar outlasts the fight
    rng.setSource(() => low);
    const hp = clanAttackFromSave(save, [], CLAN_FIGHT_MS, T0).damage;
    game.startClanFight({ week: WEEK, hp, maxHp: hp });
    game.drainEvents();
    const boss = game.state.combat.enemy;
    fight(game, [], CLAN_FIGHT_MS - 50);
    assert.equal(game.state.combat.mode, 'clan');
    assert.ok(boss.hp > hp * 0.02, `health left on the bar (${boss.hp} of ${hp})`);
    fight(game);
    const { reason, fells } = outcome(game, save, hp);
    assert.equal(reason, 'felled');
    assert.equal(fells, true);
    rng.setSource(seededRandom(11));
});

test('the sum is of the hero who went up to the server: what he gains or drinks up during the fight is not in it', () => {
    const { game, save } = clanHero();
    rng.setSource(seededRandom(7));
    const hp = clanAttackFromSave(save, [], CLAN_FIGHT_MS, T0).damage + 1;
    game.startClanFight({ week: WEEK, hp, maxHp: hp });
    game.drainEvents();
    game.state.prestige.tokens *= 50;   // far stronger on screen from here on; the stored hero is not
    game.recompute();
    fight(game);
    const gained = outcome(game, save, hp);
    assert.equal(gained.fells, false);
    assert.equal(gained.reason, 'time');

    // his last dose runs out ten seconds in: it was running in the save the server holds
    const late = clanHero();
    late.game.state.combat.potion = 'combat_potion_1';
    late.game.state.combat.potionMs = 10000;
    late.game.recompute();
    const dosed = JSON.parse(late.game.serialize(T0));
    const tough = clanAttackFromSave(dosed, [], CLAN_FIGHT_MS, T0).damage;
    assert.ok(tough > clanAttackFromSave(late.save, [], CLAN_FIGHT_MS, T0).damage, 'the potion counts');
    late.game.startClanFight({ week: WEEK, hp: tough, maxHp: tough });
    late.game.drainEvents();
    const atk = late.game.derived.atk;
    for (let t = T0 + 250; late.game.state.combat.mode === 'clan'; t += 250) { late.game.tick(t); if (t === T0 + 15000) assert.ok(late.game.derived.atk < atk, 'drunk up on screen'); }
    const drunk = outcome(late.game, dosed, tough);
    assert.equal(drunk.fells, true);
    assert.equal(drunk.reason, 'felled');
    rng.setSource(seededRandom(11));
});

test('the Endless Hydra is as it was: it never falls, what the hero deals adds up, and its fight ends with the clock', () => {
    const { game } = clanHero();
    rng.setSource(seededRandom(3));
    game.startClanFight({ week: WEEK, endless: true });
    game.drainEvents();
    const c = game.state.combat;
    const hydra = c.enemy;
    fight(game, inOpenings, CLAN_FIGHT_MS - 100);
    assert.equal(c.mode, 'clan');
    assert.equal(hydra.hp, 1, 'its health never moves');
    assert.equal(clanFightFells(game), false);
    const dealt = game.state.clanFight.dealt;
    assert.equal(dealt, game.drainEvents().filter(e => e.type === 'hit').reduce((sum, e) => sum + e.dmg, 0));
    assert.ok(dealt > 0);
    fight(game);
    const [over] = game.drainEvents().filter(e => e.type === 'clanFight');
    assert.equal(over.reason, 'time');
    assert.equal(over.endless, true);
    assert.ok(over.dealt >= dealt);
    assert.equal(game.state.clanResult.endless, true);
    assert.equal(game.state.clanResult.ms, CLAN_FIGHT_MS);
    rng.setSource(seededRandom(11));
});
