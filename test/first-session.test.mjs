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
import { PLACE_GAPS_MS, WORK_GAP_MS, nextGoals, goalProgress, waitingPlaces } from '../src/data/unlocks.js';

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

test('places reached by climbing open one at a time, a breather apart, however fast the climb', () => {
    const game = new Game(null, T0);
    const s = game.state;
    Object.assign(s.combat, { stage: 40, maxStage: 40, bestStage: 40 });   // a tapper half a minute in
    const opened = [];
    let now = T0;
    for (let i = 0; i < 40 * 60; i++) {   // forty minutes of play, a second at a time
        now += 1000;
        game.tick(now);
        for (const ev of game.drainEvents()) if (ev.type === 'unlock') opened.push({ id: ev.id, at: (now - T0) / 1000 });
    }
    assert.deepEqual(opened.map(o => o.id), ['hunting', 'shop', 'achievements', 'dungeons', 'alchemy', 'prestige', 'agility']);
    assert.ok(opened[0].at >= PLACE_GAPS_MS[0] / 1000, `the first place at ${opened[0].at} s`);
    for (let i = 1; i < opened.length; i++) assert.ok(opened[i].at - opened[i - 1].at >= PLACE_GAPS_MS[Math.min(i, PLACE_GAPS_MS.length - 1)] / 1000, `${opened[i].id} came ${opened[i].at - opened[i - 1].at} s after ${opened[i - 1].id}`);
    assert.ok(opened.filter(o => o.at <= 600).length <= 3, 'three places at most in the first ten minutes');
    // the clan and the weekend events wait for the first prestige
    assert.ok(!s.unlocks.clan && !s.unlocks.events);
    s.prestige.count = 1;
    for (let i = 0; i < 12 * 60; i++) { now += 1000; game.tick(now); }
    assert.ok(s.unlocks.events && s.unlocks.clan, 'then they come, one after the other');
});

test('a place earned by work answers it within half a minute; time away does not open a flood', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.stats.actionsBySkill.mining = 5;
    let now = T0;
    while (!s.unlocks.smithing) { now += 1000; game.tick(now); }
    assert.ok(now - T0 <= WORK_GAP_MS + 1000, `Smithing after ${(now - T0) / 1000} s`);
    // earned while away: the places wait for time played, and come one at a time
    Object.assign(s.combat, { stage: 40, maxStage: 40, bestStage: 40 });
    const back = new Game(JSON.parse(game.serialize(now)), now + 6 * 3600 * 1000);
    back.resumeFromSave(now + 6 * 3600 * 1000);
    back.tick(now + 6 * 3600 * 1000 + 1000);
    const open = ['hunting', 'shop', 'achievements', 'dungeons', 'alchemy', 'prestige', 'agility'].filter(id => back.state.unlocks[id]);
    assert.ok(open.length <= 1, `${open.join(', ')} opened at once`);
    // the Next card shows the place on its way first, its bar filling with the breather
    const [goal] = nextGoals(back.state, 1);
    assert.equal(goal.id, waitingPlaces(back.state)[0].id);
    const p = goalProgress(back.state, goal);
    assert.ok(p >= 0 && p < 1, `on its way: ${p}`);
});
