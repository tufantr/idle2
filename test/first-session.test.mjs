// A new player's first minutes (docs/research_notes/first-session.md): the first monster leaves a
// sword, the first stages are gentle, the first boss falls to a hero the player only watches, levels
// and the Hearth heal, and the guide's hand points at one thing at a time.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { enemyForStage, enemyBaseStats, goldForKill, combatXpForKill, BALANCE } from '../src/core/formulas.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { findUpgrade } from '../src/systems/inventory.js';
import { guideStep, campOnOffer, GUIDE_STRIKES } from '../src/systems/guide.js';
import { seen } from '../src/systems/disclosure.js';
import { spawnEnemy } from '../src/systems/combat.js';
import { xpForLevel } from '../src/core/xp.js';

const T0 = 1_700_000_000_000;

/** A new player who never strikes but takes what the screen offers: the sword, the camp. */
function watch(seed, seconds, onTick = () => {}) {
    rng.setSource(seededRandom(seed));
    const game = new Game(null, T0);
    game.enterCombat();
    const log = { firstKill: null, sword: null, firstBoss: null, deathAt: null, campAt: null };
    let now = T0;
    while (now < T0 + seconds * 1000) {
        now += 100;
        game.tick(now);
        const up = findUpgrade(game.state);
        if (up) game.equipItem(up.item.id);
        if (seen(game.state, 'camp')) for (const u of CAMP_UPGRADES) if (game.state.gold >= campPrice(game.state, u) && game.buyCampUpgrade(u.id, 1)) log.campAt ??= now - T0;
        for (const ev of game.drainEvents()) {
            if (ev.type === 'kill') { log.firstKill ??= now - T0; if (ev.enemy.boss) log.firstBoss ??= now - T0; }
            if (ev.type === 'itemDropped' && ev.item.type === 'Weapon') log.sword ??= ev.item;
            if (ev.type === 'death') log.deathAt ??= now - T0;
        }
        onTick(game, now);
    }
    return { game, log };
}

test('the first monster leaves a sword, and wearing it doubles a new hero\'s attack', () => {
    const { game, log } = watch(1, 10);
    assert.ok(log.firstKill <= 6000, `first kill at ${log.firstKill} ms`);
    assert.equal(log.sword?.name, 'Rusty Sword');
    assert.equal(log.sword.rarity, 'common');
    assert.equal(game.state.equipped.Weapon?.name, 'Rusty Sword');
    assert.equal(game.derived.atk, 10);
    // only the first: a hero who already has a weapon, or a prestiged one, gets none
    const second = watch(2, 40).game;
    assert.equal([...second.state.inventory, ...Object.values(second.state.equipped)].filter(i => i?.name === 'Rusty Sword').length, 1);
});

test('a player who only watches meets the first boss within a minute, beats it, and does not fall before it', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
        const { log } = watch(seed, 120);
        assert.ok(log.campAt && log.campAt <= 30000, `seed ${seed}: the first camp upgrade at ${log.campAt} ms`);
        assert.ok(log.firstBoss && log.firstBoss <= 75000, `seed ${seed}: the first boss fell at ${log.firstBoss} ms`);
        assert.ok(log.deathAt === null || log.deathAt > log.firstBoss + 30000, `seed ${seed}: a fall at ${log.deathAt} ms`);
    }
});

test('the first boss leaves a piece of gear', () => {
    let dropped = false;
    watch(3, 90, game => { for (const i of [...game.state.inventory, ...Object.values(game.state.equipped)]) if (i && i.name !== 'Rusty Sword') dropped = true; });
    assert.ok(dropped);
});

test('the first stages are gentle, and pay their full gold', () => {
    const first = enemyForStage(1);
    const base = enemyBaseStats(1);
    assert.equal(first.atk, Math.max(1, Math.floor(base.atk * BALANCE.enemy.ease.atk)));
    assert.equal(first.maxHp, Math.floor(base.hp * BALANCE.enemy.ease.hp));
    assert.equal(goldForKill(first), goldForKill({ maxHp: Math.floor(base.hp), boss: false }));
    // from stage `to` + 1 on, nothing changes
    const late = enemyForStage(BALANCE.enemy.ease.to + 1);
    const lateBase = enemyBaseStats(BALANCE.enemy.ease.to + 1);
    assert.equal(late.maxHp, Math.floor(lateBase.hp));
    assert.equal(late.atk, Math.floor(lateBase.atk));
    assert.equal(late.worth, undefined);
    // the first combat levels come quickly, the later ones as before
    const kill = enemyForStage(5);
    assert.ok(Math.abs(combatXpForKill(kill, 1, 1) - 3 * combatXpForKill(kill, 1, 10)) <= 2, 'three times the XP at level 1');
});

test('a combat level-up restores the hero\'s health, and a Hearth adds its health at once', () => {
    const game = new Game(null, T0);
    game.enterCombat();
    game.state.combat.hp = 20;
    game.state.skills.combat.xp = xpForLevel(2) - 1;
    game.recompute();
    game.state.combat.hp = 20;
    // kill something worth a level
    game.state.combat.enemy.hp = 1;
    let now = T0;
    while (game.state.stats.kills === 0) { now += 100; game.tick(now); }
    assert.equal(game.state.combat.hp, game.derived.maxHp, 'full after the level-up');
    game.state.combat.hp = 50;
    game.state.gold = 1000;
    const before = game.derived.maxHp;
    assert.equal(game.buyCampUpgrade('hearth', 1), 1);
    assert.equal(game.state.combat.hp, 50 + (game.derived.maxHp - before));
});

test('the guide points at one thing at a time, and never for a veteran', () => {
    const game = new Game(null, T0);
    game.enterCombat();
    const view = { battle: true };
    assert.equal(guideStep(game.state, game.derived, view), 'strike');
    assert.equal(guideStep(game.state, game.derived, { battle: false, tab: 'combat' }), null, 'only where the fight is in sight');
    // the sword lands: wear it
    rng.setSource(seededRandom(1));
    let now = T0;
    while (!game.state.inventory.length) { now += 100; game.tick(now); }
    assert.equal(guideStep(game.state, game.derived, view), 'equip');
    game.equipItem(game.state.inventory[0].id);
    // gold for the camp: the cheapest upgrade on offer (no Armour Rack while there is no defence)
    game.state.gold = 100;
    game.state.seen.camp = true;
    assert.ok(!campOnOffer(game.state, game.derived).some(u => u.stat === 'def'));
    assert.equal(guideStep(game.state, game.derived, view), 'camp:hearth');
    game.buyCampUpgrade('hearth', 1);
    assert.equal(guideStep(game.state, game.derived, view), 'strike');
    for (let i = 0; i < GUIDE_STRIKES; i++) { now += 200; game.tick(now); game.clickAttack(); }
    assert.equal(guideStep(game.state, game.derived, view), null);
    // the first vein, on the Mining tab, before any skill has been worked
    assert.equal(guideStep(game.state, game.derived, { tab: 'mining' }), 'vein');
    game.startNodeAction('mining', 'copper_ore');
    assert.equal(guideStep(game.state, game.derived, { tab: 'mining' }), null);
    // a veteran
    const old = new Game(null, T0);
    old.state.prestige.count = 1;
    old.enterCombat();
    assert.equal(guideStep(old.state, old.derived, view), null);
});

test('a new hero meets his first gilded monster at stage 7, and only once', () => {
    rng.setSource(() => 0.999999);   // no luck at all: only the rule
    const game = new Game(null, T0);
    Object.assign(game.state.combat, { stage: 7, maxStage: 7, bestStage: 7 });
    game.state.combat.enemy = null;
    game.enterCombat();
    assert.equal(game.state.combat.enemy.gilded, true);
    game.state.stats.gildedKills = 1;
    spawnEnemy(game);
    assert.ok(!game.state.combat.enemy.gilded);
    rng.setSource(seededRandom(1));
});

test('while the hero regroups after a boss held out, the hand points at the boss to fight it again', () => {
    const game = new Game(null, T0);
    const c = game.state.combat;
    Object.assign(c, { stage: 9, maxStage: 10, bestStage: 10 });
    game.state.stats.strikes = GUIDE_STRIKES;
    c.enemy = null;
    game.enterCombat();
    assert.equal(guideStep(game.state, game.derived, { battle: true }), null);
    c.regroupLeft = 30000;
    assert.equal(guideStep(game.state, game.derived, { battle: true }), 'retry');
    game.setStage(10);   // the boss again, at once
    assert.equal(c.enemy.boss, true);
    assert.equal(guideStep(game.state, game.derived, { battle: true }), null);
});
