// The robustness suite (docs/research_notes/robust-and-fun/D_robustness_methods.md §5–6, experiment E3):
// the fight replayed offline matches the fight played online; mangled saves load and run without
// throwing or turning numbers into NaN; nothing the shop sells can be sold back for more than it cost.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { xpForLevel } from '../src/core/xp.js';
import { generateEquipment, goldPerKillAtStage } from '../src/core/formulas.js';
import { GEAR_TIERS, RARITIES } from '../src/data/items.js';
import { GOLD_SHOP } from '../src/data/perks.js';
import { sellValue } from '../src/data/resources.js';

const T0 = 1_700_000_000_000;
const HOUR = 3600_000;

/** A hero part-way through the game: levels, mithril gear, a run at stage 55 of a best of 60. */
function midGame() {
    rng.setSource(seededRandom(31));
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = xpForLevel(45);
    for (const type of ['Weapon', 'Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves']) {
        s.equipped[type] = generateEquipment({ type, tier: 3, power: GEAR_TIERS[2].power, materialName: 'Mithril', rarity: RARITIES[1], source: 'drop' }, s.idCounter++);
    }
    Object.assign(s.combat, { stage: 51, maxStage: 55, bestStage: 60 });
    s.prestige.tokens = 300;
    s.prestige.count = 3;
    s.meta.lastInputAt = T0 - HOUR;   // idle in both runs, so Focus applies to both
    s.pets = { fang: true, sprout: true, pebble: true, scout: true };   // no pet roll to make the runs diverge
    s.combat.enemy = null;
    game.recompute();
    game.enterCombat();
    return game;
}

test('two hours of fighting replayed offline match the same two hours played online', () => {
    const online = midGame();
    const saved = JSON.parse(online.serialize(T0));
    let now = T0;
    for (let i = 0; i < 2 * 3600; i++) { now += 1000; online.tick(now); }
    rng.setSource(seededRandom(32));
    const offline = new Game(saved, T0 + 2 * HOUR);
    offline.resumeFromSave(T0 + 2 * HOUR);
    const a = online.state;
    const b = offline.state;
    assert.ok(a.stats.kills > 500 && b.stats.kills > 500, `real fighting: ${a.stats.kills} and ${b.stats.kills} kills`);
    const near = (x, y, tol, what) => assert.ok(Math.abs(x - y) <= tol * Math.max(x, y), `${what}: online ${x}, offline ${y}`);
    near(a.stats.kills, b.stats.kills, 0.1, 'kills');
    near(a.skills.combat.xp - xpForLevel(45), b.skills.combat.xp - xpForLevel(45), 0.12, 'combat XP');
    near(a.stats.goldEarned, b.stats.goldEarned, 0.15, 'gold');
    assert.ok(Math.abs(a.combat.bestStage - b.combat.bestStage) <= 3, `best stage: online ${a.combat.bestStage}, offline ${b.combat.bestStage}`);
});

/** A copy of `value` with one random part mangled: wrong types, NaN, negatives, huge numbers, holes. */
function mangle(value, r) {
    const bad = [null, undefined, NaN, -1, -1e300, 1e300, Infinity, '12', 'abc', true, [], {}, [1, 'x'], { a: 1 }];
    const pick = list => list[Math.floor(r() * list.length)];
    const walk = (node, depth) => {
        if (node === null || typeof node !== 'object') return node;
        const keys = Object.keys(node);
        if (!keys.length) return node;
        const key = pick(keys);
        if (depth > 3 || r() < 0.35) {
            if (r() < 0.2) delete node[key]; else node[key] = pick(bad);
        } else node[key] = walk(node[key], depth + 1);
        return node;
    };
    let copy = JSON.parse(JSON.stringify(value));
    for (let i = 0; i < 1 + Math.floor(r() * 4); i++) copy = walk(copy, 0);
    return copy;
}

test('three hundred mangled saves load, run and keep their numbers finite', () => {
    const base = midGame();
    let now = T0;
    for (let i = 0; i < 120; i++) { now += 1000; base.tick(now); }
    base.claimDaily();
    const save = JSON.parse(base.serialize(now));
    const r = seededRandom(77);
    for (let i = 0; i < 300; i++) {
        const raw = mangle(save, r);
        let game;
        try {
            game = new Game(raw, now);
            game.resumeFromSave(now + 60_000);
            for (let t = 1; t <= 20; t++) game.tick(now + 60_000 + t * 500);
        } catch (err) {
            assert.fail(`mangled save #${i} threw: ${err.stack}\n${JSON.stringify(raw).slice(0, 400)}`);
        }
        const s = game.state;
        const d = game.derived;
        for (const [what, v] of [['gold', s.gold], ['hp', s.combat.hp], ['best stage', s.combat.bestStage], ['tokens', s.prestige.tokens], ['attack', d.atk], ['defence', d.def], ['max hp', d.maxHp], ['essence', s.resources.essence]]) {
            assert.ok(Number.isFinite(v), `mangled save #${i}: ${what} is ${v}`);
        }
        assert.ok(s.combat.hp > 0 && s.combat.hp <= d.maxHp, `mangled save #${i}: hp ${s.combat.hp} of ${d.maxHp}`);
        assert.doesNotThrow(() => JSON.stringify(migrateState(JSON.parse(game.serialize(now)), now)), `mangled save #${i} saves again`);
    }
});

test('nothing the shop sells is worth more sold back than it cost, at any best stage', () => {
    for (const best of [1, 10, 30, 60, 100, 150, 200, 300, 400]) {
        for (const entry of GOLD_SHOP) {
            const price = Math.ceil(entry.costKills * goldPerKillAtStage(best));
            const back = Object.entries(entry.gives).reduce((sum, [id, qty]) => sum + (id === 'essence' ? 0 : sellValue(id) * qty), 0);
            assert.ok(back < price, `${entry.id} at stage ${best}: costs ${price}, sells back for ${back}`);
        }
    }
});
