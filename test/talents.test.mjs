// The War Tree (DESIGN §3.33): Combat's levels go on past 99, each a talent point; three trees of seven rows, a row
// opening with five more points in its tree, an arrow's talent once the one above is full; unlearning for essence, more
// each time. The talents' stats reach the hero as a perk's do, their rules bite in the fight (never the clan boss's),
// and saves keep only a tree a hero could have learned.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { BALANCE, enemyDamage, enemyForStage, goldForKill } from '../src/core/formulas.js';
import { BASE, isFocused } from '../src/core/modifiers.js';
import { levelForXp, combatLevelForXp, xpForCombatLevel, COMBAT_XP_CAP, XP_FOR_MAX_LEVEL, MAX_COMBAT_LEVEL } from '../src/core/xp.js';
import { TREES, TALENTS, ROWS, ROW_POINTS, RESPEC, RELENTLESS, SECOND_WIND_MS, TALENT_POINTS_MAX, WAR_XP_SHARE, talentById, rowOpensAt, talentFx, respecPrice } from '../src/data/talents.js';
import { warLevel, talentPoints, talentsOpen } from '../src/systems/talents.js';
import { grantXp } from '../src/systems/progress.js';
import { spawnEnemy, playerAttack, enemyAttack, onEnemyDeath, onBossTimeout, tickCombat } from '../src/systems/combat.js';
import { seen } from '../src/systems/disclosure.js';
import { SPRITES } from '../src/data/sprites.js';

const T0 = 1_760_000_000_000;

/** A hero at combat level `level` (past 99 for points), with gear, fighting at stage 121. */
function hero(level = 106) {
    rng.setSource(seededRandom(3));
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = xpForCombatLevel(level);
    s.equipped.Weapon = { id: 900, type: 'Weapon', tier: 7, atk: 5000, def: 0, affixes: [], upgrade: 0 };
    s.equipped.Body = { id: 901, type: 'Body', tier: 7, atk: 0, def: 3000, affixes: [], upgrade: 0 };
    Object.assign(s.combat, { bestStage: 400, maxStage: 121, stage: 121, mode: 'stages' });
    game.recompute();
    return game;
}

/** The hero with these talents learned (straight into the save, as if learned in order). */
function withTalents(game, ranks) {
    game.state.talents.ranks = { ...ranks };
    game.recompute();
    return game;
}

/** rng fixed at `v`: no randomness in a swing (float(0.9, 1.1) is 1 at 0.5), and chance(p) is v < p. */
const fixed = v => rng.setSource(() => v);

test('Combat goes on past 99 on the same table, a talent point each level; the other skills stop as before', () => {
    const game = hero(99);
    const s = game.state;
    assert.equal(warLevel(s), 0);
    assert.equal(talentsOpen(s), false);
    game.drainEvents();
    // past 99 a share of the XP counts (WAR_XP_SHARE): the same table, at the pace the owner was shown
    const from = s.skills.combat.xp;
    grantXp(game, 'combat', 1000);
    assert.equal(s.skills.combat.xp, from + 1000 * WAR_XP_SHARE);
    grantXp(game, 'combat', (xpForCombatLevel(101) - s.skills.combat.xp) / WAR_XP_SHARE + 5);
    const points = game.drainEvents().filter(e => e.type === 'talentPoint');
    assert.deepEqual(points.map(e => [e.level, e.points]), [[101, 2]]);
    assert.equal(warLevel(s), 2);
    assert.equal(levelForXp(s.skills.combat.xp), 99, 'every formula still sees 99');
    assert.equal(game.derived.combatLevel, 99);
    // the old cap is level 106: seven points at once for a capped hero
    assert.equal(combatLevelForXp(2 * XP_FOR_MAX_LEVEL), 106);
    // the climb goes on to the level that fills the tree, no further
    grantXp(game, 'combat', 1e15);
    assert.equal(s.skills.combat.xp, COMBAT_XP_CAP);
    assert.equal(combatLevelForXp(COMBAT_XP_CAP), MAX_COMBAT_LEVEL);
    assert.equal(warLevel(s), TALENT_POINTS_MAX);
    grantXp(game, 'mining', 1e15);
    assert.equal(s.skills.mining.xp, 2 * XP_FOR_MAX_LEVEL);
    // and the tree opens as a piece of the screen once Combat passes 99
    game.tick(T0 + 1000);
    assert.equal(seen(s, 'talents'), true);
    assert.equal(seen(hero(99).state, 'talents'), false);
});

test('learning: a point a rank, rows open five points at a time, an arrow once the talent above is full', () => {
    const game = hero(106);
    const s = game.state;
    assert.equal(talentPoints(s), 7);
    const atk = game.derived.atk;
    assert.equal(game.learnTalent('sharpened_edge'), true);
    assert.ok(Math.abs(game.derived.atk / atk - 1.01) < 0.002, 'its stat at once');
    assert.equal(game.learnTalent('opening_blow'), false, 'row 2 waits for five in Blade');
    assert.match(game.drainEvents().find(e => e.type === 'error').text, /row/);
    for (let i = 0; i < 4; i++) game.learnTalent('sharpened_edge');
    assert.equal(game.learnTalent('sharpened_edge'), false, 'full');
    assert.equal(game.learnTalent('opening_blow'), true);
    assert.equal(game.learnTalent('opening_blow'), true);
    assert.equal(talentPoints(s), 0);
    assert.equal(game.learnTalent('precision'), false, 'no points');
    // Execute's arrow comes from Opening Blow: it waits for it to be full (and its row for ten points)
    s.skills.combat.xp = xpForCombatLevel(120);
    assert.equal(talentPoints(s), 14);
    for (let i = 0; i < 3; i++) game.learnTalent('precision');
    assert.equal(game.learnTalent('execute'), false);
    assert.match(game.drainEvents().filter(e => e.type === 'error').pop().text, /arrow/);
    game.learnTalent('opening_blow');
    assert.equal(game.learnTalent('execute'), true);
    assert.equal(game.derived.talents.execute, 0.02);
    assert.equal(game.derived.talents.openingBlow, 3);
    assert.equal(game.learnTalent('nonsense'), false);
});

test('unlearning gives every point back, for essence, more each time', () => {
    const game = withTalents(hero(106), { patient_hunter: 5, scavenger: 2 });
    const s = game.state;
    assert.equal(respecPrice(s), RESPEC.essence);
    s.resources.essence = RESPEC.essence - 1;
    assert.equal(game.unlearnTalents(), false);
    assert.equal(s.talents.ranks.patient_hunter, 5);
    s.resources.essence = 1e6;
    assert.equal(game.unlearnTalents(), true);
    assert.deepEqual(s.talents.ranks, {});
    assert.equal(talentPoints(s), 7);
    assert.equal(s.resources.essence, 1e6 - RESPEC.essence);
    assert.equal(respecPrice(s), Math.round(RESPEC.essence * RESPEC.growth));
    assert.equal(game.unlearnTalents(), false, 'nothing to unlearn');
    assert.equal(game.derived.talents.patientMs, undefined);
});

test('saves keep a tree a hero could have learned, and only as many points as his levels past 99', () => {
    const game = hero(106);
    const save = () => JSON.parse(game.serialize(T0));
    const raw = save();
    raw.talents = { ranks: { patient_hunter: 5, scavenger: 9, nonsense: 2, treasure_sense: '1.8' }, respecs: '3' };
    const s = migrateState(raw, T0);
    // scavenger at its most (5): 11 points spent, 7 earned: all unlearned
    assert.deepEqual(s.talents, { ranks: {}, respecs: 3 });
    raw.talents = { ranks: { patient_hunter: 5, scavenger: 1, treasure_sense: '1.8' } };
    assert.deepEqual(migrateState(raw, T0).talents, { ranks: { patient_hunter: 5, scavenger: 1, treasure_sense: 1 }, respecs: 0 });
    // a row before its points, or an arrow before its talent is full: unlearned
    raw.skills.combat.xp = xpForCombatLevel(150);
    raw.talents = { ranks: { patient_hunter: 5, second_chance: 1 } };
    assert.deepEqual(migrateState(raw, T0).talents.ranks, {});
    raw.talents = { ranks: { patient_hunter: 4, scavenger: 5, treasure_sense: 1, second_chance: 1 } };
    assert.deepEqual(migrateState(raw, T0).talents.ranks, {});
    raw.talents = { ranks: { patient_hunter: 5, scavenger: 5, second_chance: 2 } };
    assert.deepEqual(migrateState(raw, T0).talents.ranks, { patient_hunter: 5, scavenger: 5, second_chance: 2 });
    // XP past the top comes down to it; odd values and old saves
    raw.skills.combat.xp = 1e300;
    assert.equal(migrateState(raw, T0).skills.combat.xp, COMBAT_XP_CAP);
    for (const t of [null, 7, 'x', [], { ranks: [1, 2] }]) {
        const r = save();
        r.talents = t;
        assert.deepEqual(migrateState(r, T0).talents, { ranks: {}, respecs: 0 });
    }
    const old = save();
    delete old.talents;
    assert.deepEqual(migrateState(old, T0).talents, { ranks: {}, respecs: 0 });
    // the fight's own counters come back in range
    const fight = save();
    Object.assign(fight.combat, { swings: 77, vengeance: 'yes', cleaveCarry: 1e9, secondWindAt: T0 + 1e9, relentless: { stage: 130, ms: 1e9 } });
    const c = migrateState(fight, T0).combat;
    assert.deepEqual([c.swings, c.vengeance, c.cleaveCarry, c.secondWindAt, c.relentless], [9, false, 0, T0, { stage: 130, ms: RELENTLESS.maxMs }]);
});

test("Blade's rules: Opening Blow, Giant Slayer and Weak Spot on a boss, Execute, Deathblow, Cleave, Flurry and Berserker", () => {
    const game = withTalents(hero(150), { opening_blow: 3, execute: 3, giant_slayer: 5, deathblow: 1, cleave: 3, berserker: 2 });
    const s = game.state;
    const c = s.combat;
    fixed(0.5);   // no crits, no spread
    const d = game.derived;
    // a boss: the first swing ×3, every swing +10% (Giant Slayer)
    Object.assign(c, { stage: 130, active: true, hp: d.maxHp });
    spawnEnemy(game);
    c.enemy.hp = c.enemy.maxHp = 1e15;
    const first = playerAttack(game);
    const second = playerAttack(game);
    assert.equal(first, Math.round(d.atk * 3 * 1.1));
    assert.equal(second, Math.round(d.atk * 1.1));
    // Deathblow: the tenth swing (two were above) deals double
    const swings = [];
    for (let i = 0; i < 8; i++) swings.push(playerAttack(game));
    assert.deepEqual(swings.map(x => x === second * 2), [false, false, false, false, false, false, false, true]);
    // Execute: a boss left at 6% of its health or less falls
    game.drainEvents();
    c.enemy.hp = Math.round(c.enemy.maxHp * 0.06) + Math.round(d.atk * 1.1) - 10;
    playerAttack(game);
    const hit = game.drainEvents().find(e => e.type === 'hit');
    assert.equal(hit.executed, true);
    assert.equal(c.stage, 131, 'the boss fell: he moved on');
    // Cleave: a killing blow's spare damage lands on the next monster, never felling it
    spawnEnemy(game);
    c.enemy.hp = 100;
    const next = c.enemy;
    playerAttack(game);
    assert.notEqual(c.enemy, next);
    const fresh = c.enemy.maxHp;
    assert.equal(c.enemy.hp, Math.max(1, fresh - Math.floor((Math.round(d.atk) - 100) * 0.6)));
    // Berserker: under half his health, +20%
    spawnEnemy(game);
    c.enemy.hp = c.enemy.maxHp = 1e15;
    c.hp = d.maxHp * 0.4;
    c.swings = 0;
    assert.equal(playerAttack(game), Math.round(d.atk * 1.2));
    // Flurry and Weak Spot: a critical swing readies the next one sooner, and on a boss hits harder
    withTalents(game, { keen_eye: 5, precision: 5, flurry: 3, weak_spot: 3, sharpened_edge: 5 });
    fixed(0);   // every chance comes true: a critical hit
    Object.assign(c, { stage: 130, hp: game.derived.maxHp });
    spawnEnemy(game);
    c.enemy.opened = true;
    c.enemy.hp = c.enemy.maxHp = 1e15;
    c.playerTimer = 0;
    const crit = playerAttack(game);
    assert.equal(crit, Math.round(game.derived.atk * game.derived.critDmg * 1.12 * 0.9));   // (the swing's spread at its low end)
    assert.equal(c.playerTimer, 0.25 * game.derived.attackInterval);
});

test("Bulwark's rules: Fortress, Brace and Unbreakable lessen a blow, Second Wind keeps him up once a minute, Riposte and Vengeance answer a dodge", () => {
    const game = withTalents(hero(150), { light_feet: 5, fortress: 5, brace: 3, unbreakable: 1, second_wind: 1, riposte: 3, vengeance: 2, hamstring: 3, rally: 3 });
    const s = game.state;
    const c = s.combat;
    const d = game.derived;
    fixed(0.5);   // nothing is dodged (5%), no spread
    Object.assign(c, { stage: 121, active: true, hp: d.maxHp });
    spawnEnemy(game);
    // a blow of 40% of his health: -15% (Fortress), then -20% (Brace: still over 30% of his health)
    const big = d.maxHp * 0.4;
    const hit = n => { c.hp = d.maxHp; c.enemy.atk = n; return enemyAttack(game); };
    // (find the attack that deals half his health through his defence: enemyDamage is monotone)
    let lo = 1, hi = 1e15;
    while (hi - lo > 1) { const mid = (lo + hi) / 2; if (enemyDamage(mid, d.def) < big) lo = mid; else hi = mid; }
    const raw = enemyDamage(hi, d.def);
    assert.equal(hit(hi), Math.max(1, Math.round(raw * 0.85 * 0.8)));
    // a blow of three times his health: no more than a third of it (Unbreakable)
    lo = 1; hi = 1e18;
    while (hi - lo > 1) { const mid = (lo + hi) / 2; if (enemyDamage(mid, d.def) < d.maxHp * 3) lo = mid; else hi = mid; }
    assert.equal(hit(hi), Math.round(d.maxHp / 3));
    // Second Wind: a felling blow leaves him standing at 1, once a minute
    game.drainEvents();
    c.hp = 10;
    c.enemy.atk = hi;
    enemyAttack(game);
    assert.equal(game.drainEvents().some(e => e.type === 'secondWind'), true);
    assert.ok(c.hp >= 1 && c.active);
    c.hp = 10;
    enemyAttack(game);
    assert.equal(game.drainEvents().some(e => e.type === 'death'), true, 'not twice in a minute');
    game.now += SECOND_WIND_MS;
    Object.assign(c, { active: true, recovering: false, hp: 10 });
    spawnEnemy(game);
    c.enemy.atk = hi;
    enemyAttack(game);
    assert.equal(game.drainEvents().some(e => e.type === 'secondWind'), true, 'a minute later, again');
    // Hamstring: a boss swings 15% slower
    c.stage = 130;
    spawnEnemy(game);
    assert.equal(c.enemy.interval, Math.round(enemyForStage(130).interval * 1.15));
    // a dodge: Riposte strikes back with a whole swing, and Vengeance readies the next for +50%
    fixed(0);   // every chance comes true: a dodge (and a crit, which a riposte never is)
    c.enemy.hp = c.enemy.maxHp = 1e15;
    game.drainEvents();
    enemyAttack(game);
    const riposte = game.drainEvents().find(e => e.type === 'hit' && e.riposte);
    assert.equal(riposte.dmg, Math.round(d.atk * 0.9));   // (the spread at its low end)
    assert.equal(c.vengeance, true);
    fixed(0.5);
    c.enemy.opened = true;
    assert.equal(playerAttack(game), Math.round(d.atk * 1.5));
    assert.equal(c.vengeance, false);
    // Rally: a kill heals 3% of his health (not in Fasting)
    c.stage = 121;
    spawnEnemy(game);
    c.hp = d.maxHp / 2;
    onEnemyDeath(game);
    assert.equal(c.hp, d.maxHp / 2 + d.maxHp * 0.03);
    s.trials.active = ['fasting'];
    game.recompute();
    c.hp = game.derived.maxHp / 2;
    onEnemyDeath(game);
    assert.equal(c.hp, game.derived.maxHp / 2);
});

test('Glass Hero still falls to the first blow: no Second Wind, Fortress or Unbreakable under it', () => {
    const game = withTalents(hero(150), { fortress: 5, brace: 3, unbreakable: 1, second_wind: 1 });
    const c = game.state.combat;
    game.state.trials.active = ['glass'];
    game.recompute();
    fixed(0.99);
    Object.assign(c, { stage: 121, active: true, hp: game.derived.maxHp });
    spawnEnemy(game);
    c.enemy.atk = 1;
    game.drainEvents();
    enemyAttack(game);
    assert.equal(game.drainEvents().some(e => e.type === 'death'), true);
});

test("Hunt's rules: the boss's clock, the regroup, Relentless, Bounty, Essence Drinker and Lord's Due", () => {
    const game = withTalents(hero(160), { patient_hunter: 5, second_chance: 2, scavenger: 5, treasure_sense: 5, essence_drinker: 3, gilded_eye: 3, long_draught: 3, lords_due: 3, bounty: 5, relentless: 1 });
    const s = game.state;
    const c = s.combat;
    fixed(0.99);
    // Patient Hunter: +5 s on a stage boss's clock; a Trial's share of it after (Swift Bosses: a tenth)
    Object.assign(c, { stage: 130, active: true, farmMode: false });
    spawnEnemy(game);
    assert.equal(c.bossTimeLeft, BALANCE.combat.bossTimeMs + 5000);
    s.trials.active = ['swift_bosses'];
    game.recompute();
    spawnEnemy(game);
    assert.equal(c.bossTimeLeft, (BALANCE.combat.bossTimeMs + 5000) * 0.1);
    s.trials.active = null;
    game.recompute();
    // a boss holds out: no regroup with Second Chance's both ranks, and Relentless gives its next try 2 s more, up to 10
    spawnEnemy(game);
    onBossTimeout(game);
    assert.equal(c.regroupLeft, 0);
    assert.equal(c.stage, 129);
    c.stage = 130;
    spawnEnemy(game);
    assert.equal(c.bossTimeLeft, BALANCE.combat.bossTimeMs + 5000 + RELENTLESS.stepMs);
    for (let i = 0; i < 9; i++) { onBossTimeout(game); c.stage = 130; spawnEnemy(game); }
    assert.equal(c.bossTimeLeft, BALANCE.combat.bossTimeMs + 5000 + RELENTLESS.maxMs);
    // Bounty: the boss's first fall pays +100% gold (and XP); its fall ends Relentless's extra
    const gold = s.gold;
    c.maxStage = 130;
    onEnemyDeath(game);
    assert.equal(s.gold - gold, goldForKill(enemyForStage(130), game.derived.goldMult) * 2);
    assert.equal(c.relentless, null);
    // the stats: gold, drops, gilded monsters, the potion's dose
    assert.ok(Math.abs(game.derived.goldMult - (1 + 0.25)) < 1e-9 || game.derived.goldMult >= 1.25);
    assert.equal(talentFx(s).essence, 0.45);
    // Lord's Due: a Lord's first fall leaves a second piece (at rank 3, half the time)
    fixed(0.4);
    Object.assign(c, { stage: 200, maxStage: 200, lordsBeaten: 0 });
    spawnEnemy(game);
    assert.equal(c.enemy.lord, true);
    game.drainEvents();
    onEnemyDeath(game);
    const lordPieces = game.drainEvents().filter(e => e.type === 'itemDropped' && e.lord);
    assert.equal(lordPieces.length, 2);
});

test("Veteran's Focus brings Focus sooner, and Lifeblood raises lifesteal's ceiling", () => {
    const game = withTalents(hero(160), { patient_hunter: 5, scavenger: 5, treasure_sense: 5, gilded_eye: 3, long_draught: 3, lords_due: 3, veterans_focus: 3, thick_skin: 5, iron_hide: 5, lifeblood: 2 });
    const s = game.state;
    s.meta.lastInputAt = T0;
    assert.equal(isFocused(s, T0 + 15000), true);
    assert.equal(isFocused(withTalents(hero(160), {}).state, T0 + 59000), false);
    // a second of fighting fills lifesteal's room at 4% of his health, not 3%
    const c = s.combat;
    Object.assign(c, { stage: 121, active: true, hp: game.derived.maxHp, lifestealRoom: 0 });
    spawnEnemy(game);
    c.enemy.atk = 0; c.enemy.interval = 1e9; c.playerTimer = -1e9;
    tickCombat(game, 1000);
    assert.ok(Math.abs(c.lifestealRoom - game.derived.maxHp * (BASE.lifestealPerSecond + 0.01)) < 1);
});

test("the clan boss's fight leaves the talents' rules out, as the server reckons it", () => {
    const game = withTalents(hero(150), { opening_blow: 3, sharpened_edge: 5, deathblow: 1, savage_blows: 5, giant_slayer: 5 });
    game.state.combat.mode = 'clan';
    game.recompute();
    assert.deepEqual(game.derived.talents, {});
    game.state.combat.mode = 'stages';
    game.recompute();
    assert.equal(game.derived.talents.openingBlow, 3);
});

test('the War Tree data hangs together: three trees of seven rows, every row reachable, arrows straight down, a capstone each', () => {
    const ids = new Set();
    for (const tree of TREES) {
        const ts = TALENTS.filter(t => t.tree === tree.id);
        const cells = new Set();
        for (const t of ts) {
            assert.ok(!ids.has(t.id), t.id); ids.add(t.id);
            assert.match(t.id, /^[a-z_]+$/);
            assert.ok(t.row >= 1 && t.row <= ROWS && t.col >= 1 && t.col <= 3 && t.max >= 1 && t.max <= 5, t.id);
            assert.ok(!cells.has(`${t.row}:${t.col}`), `${t.id} shares its cell`); cells.add(`${t.row}:${t.col}`);
            assert.ok(SPRITES[t.icon], `${t.id}: ${t.icon}`);
            for (let r = 1; r <= t.max; r++) assert.ok(typeof t.text(r) === 'string' && t.text(r).length > 5, `${t.id} ${r}`);
            for (const values of Object.values(t.fx || {})) assert.equal(values.length, t.max, t.id);
            if (t.needs) {
                const from = talentById(t.needs);
                assert.ok(from && from.tree === t.tree && from.col === t.col && from.row < t.row, `${t.id}'s arrow`);
                assert.ok(!ts.some(o => o.col === t.col && o.row > from.row && o.row < t.row), `${t.id}'s arrow crosses a talent`);
            }
        }
        for (let row = 2; row <= ROWS; row++) {
            const below = ts.filter(t => t.row < row).reduce((n, t) => n + t.max, 0);
            assert.ok(below >= rowOpensAt(row), `${tree.id} row ${row}`);
        }
        const caps = ts.filter(t => t.row === ROWS);
        assert.equal(caps.length, 1, tree.id);
        assert.equal(caps[0].max, 1);
        assert.equal(rowOpensAt(ROWS) + 1, ROW_POINTS * 6 + 1);
    }
    assert.equal(TALENT_POINTS_MAX, TALENTS.reduce((n, t) => n + t.max, 0));
    assert.equal(MAX_COMBAT_LEVEL, 99 + TALENT_POINTS_MAX);
});
