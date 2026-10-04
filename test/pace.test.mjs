// Melvor pace (the owner's choice): late actions give less XP than their base, the first levels are
// as quick as ever, a newer action never pays less per hour than an older one of its kind, and
// combat slows with the hero's level, never making a shallower stage the better place to train.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { SKILLS } from '../src/data/skills.js';
import { SMELTING_RECIPES, METALS, GEM_TIERS } from '../src/data/workshop.js';
import { CROPS } from '../src/data/farming.js';
import { RESOURCES } from '../src/data/resources.js';
import { PACE_FROM, paceDivisor, paceList } from '../src/data/pace.js';
import { BALANCE, combatXpForKill, combatXpPace, enemyForStage } from '../src/core/formulas.js';
import { onEnemyDeath } from '../src/systems/combat.js';

rng.setSource(seededRandom(5));
const T0 = 1_700_000_000_000;

const kind = a => (a.consumes ? RESOURCES[Object.keys(a.consumes)[0]].category : 'gather');
const perHour = a => a.xp / ((a.interval || a.growMs || 1) / 3600000);

test('actions opening by level 20 keep their base XP; later ones give less, never below 1', () => {
    for (const [id, skill] of Object.entries(SKILLS)) {
        for (const node of skill.nodes || []) {
            assert.equal(typeof node.baseXp, 'number', `${id}/${node.id} keeps its base XP`);
            if (node.levelReq <= PACE_FROM) assert.equal(node.xp, node.baseXp, `${id}/${node.id}`);
            else assert.ok(node.xp >= 1 && node.xp <= node.baseXp, `${id}/${node.id}`);
        }
    }
    const runite = SKILLS.mining.nodes.find(n => n.levelReq >= 75);
    assert.ok(runite.xp < runite.baseXp / 1.5, 'the last rock is paced');
    assert.equal(paceDivisor('mining', 1), 1);
    assert.equal(paceDivisor('farming', 99), 1, 'a skill without a factor is not slowed');
});

test('a newer action never pays less XP per hour than an older one of its kind', () => {
    const lists = [
        ...Object.entries(SKILLS).map(([id, s]) => [id, s.nodes || []]),
        ['smelting', SMELTING_RECIPES], ['jewellery', GEM_TIERS],
        ['crops', CROPS.map(c => ({ ...c, xp: c.xp * (c.yield[0] + c.yield[1]) / 2 }))],   // farming pays its XP per crop harvested
        ['forging', METALS.map(m => ({ ...m, xp: m.xpPerBar }))]
    ];
    for (const [name, list] of lists) {
        const best = {};
        for (const a of [...list].sort((x, y) => x.levelReq - y.levelReq)) {
            const k = kind(a);
            const lower = Object.entries(best[k] || {}).filter(([lv]) => Number(lv) < a.levelReq).map(([, v]) => v);
            if (lower.length) assert.ok(perHour(a) >= Math.max(...lower) - 1e-9, `${name}: ${a.name || a.id || a.gem} pays less than an older one`);
            (best[k] ||= {})[a.levelReq] = Math.max(best[k]?.[a.levelReq] || 0, perHour(a));
        }
    }
});

test('paceList keeps the base, so pacing twice changes nothing', () => {
    const list = [{ levelReq: 1, interval: 1000, xp: 10 }, { levelReq: 80, interval: 1000, xp: 100 }];
    paceList('crafting', list);
    const once = list.map(a => a.xp);
    paceList('crafting', list);
    assert.deepEqual(list.map(a => a.xp), once);
    assert.equal(list[1].baseXp, 100);
});

test('combat XP slows with the hero\'s level, and a deeper stage always pays more', () => {
    const p = BALANCE.rewards.xpPace;
    assert.equal(combatXpPace(1), 1);
    assert.equal(combatXpPace(p.from), 1, 'the levels that open tier 5 gear are not slowed');
    assert.equal(combatXpPace(99), p.slow);
    for (const level of [1, 60, 75, 90, 99]) {
        let last = 0;
        for (let stage = 1; stage <= 400; stage++) {
            if (stage % 10 === 0) continue;   // bosses pay their own multiple
            const xp = combatXpForKill(enemyForStage(stage), 1, level);
            assert.ok(xp >= last, `level ${level}: stage ${stage} pays less than the one before`);
            last = xp;
        }
    }
    const deep = enemyForStage(150);
    assert.ok(combatXpForKill(deep, 1, 95) < combatXpForKill(deep, 1, 50) / 20);
});

test('a kill pays the hero\'s paced combat XP; an old save keeps its level', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = xpForLevel(90);
    game.enterCombat();
    const enemy = s.combat.enemy;
    const before = s.skills.combat.xp;
    enemy.hp = 0;
    onEnemyDeath(game);
    const gained = s.skills.combat.xp - before;
    const full = combatXpForKill(enemy, game.derived.combatXpMult, 1);
    assert.ok(gained > 0 && gained < full, `paced (${gained} of ${full})`);
    assert.equal(game.derived.combatLevel, 90);
});
