// Gear that matters (the owner, October 2026: "all gear must be significant", and a legendary weapon should make
// the hero stronger at once and push him further): rarity is a real step (a legendary 2.8 times a common), the
// ladder's bosses test the hero's attack, and the game says what each piece does to him. Kept here so it stays so.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE, enemyForStage, enemyBaseStats, generateEquipment, goldForKill, stageBossMults, supplyMult } from '../src/core/formulas.js';
import { RARITIES, GEAR_TIERS } from '../src/data/items.js';
import { migrateState, RARITY_RESCALE } from '../src/core/state.js';
import { equipGain } from '../src/systems/inventory.js';
import { killPayout } from '../src/systems/combat.js';
import { dungeonEnemy } from '../src/systems/dungeon.js';
import { DUNGEONS, DUNGEON_BOSS_HP_MULT } from '../src/data/dungeons.js';
import { gainWords } from '../src/ui/format.js';

const T0 = 1_760_000_000_000;
const quality = id => RARITIES.find(r => r.id === id).quality;
const piece = (type, rarity, { tier = 5, id = 1 } = {}) =>
    generateEquipment({ type, tier, power: GEAR_TIERS[tier - 1].power, materialName: GEAR_TIERS[tier - 1].name, rarity: RARITIES.find(r => r.id === rarity), source: 'drop' }, id);

test('each rarity is a clear step, a legendary 2.8 times a common, and never worth two tiers', () => {
    for (let i = 1; i < RARITIES.length; i++) assert.ok(RARITIES[i].quality >= RARITIES[i - 1].quality * 1.2, `${RARITIES[i].id} a step above ${RARITIES[i - 1].id}`);
    assert.equal(quality('legendary'), 2.8);
    assert.ok(quality('legendary') / quality('rare') > 1.8, 'a legendary nearly doubles a rare');
    // a lucky piece may beat the next tier's common, never the tier after it (copper never beats runite)
    for (let t = 0; t + 2 < GEAR_TIERS.length; t++) assert.ok(GEAR_TIERS[t].power * quality('legendary') < GEAR_TIERS[t + 2].power);
    // and in the Abyss it is worth nearly three depths of the drops' growth
    assert.ok(Math.log(quality('legendary')) / Math.log(BALANCE.abyss.dropGrowth) > 2.5);
});

test('gear from before the rescale grows once, by as much as its rarity grew; a new game is past it', () => {
    rng.setSource(seededRandom(3));
    const g = new Game(null, T0);
    const save = JSON.parse(g.serialize(T0));
    delete save.meta.rarityRescale;   // a save from before
    const old = { common: 1, uncommon: 1.08, rare: 1.16, epic: 1.25, legendary: 1.4 };
    save.equipped.Weapon = { ...piece('Weapon', 'legendary', { id: 11 }), atk: 1400, value: 700 };
    save.equipped.Body = { ...piece('Body', 'rare', { id: 12 }), def: 1160 };
    save.inventory = [{ ...piece('Head', 'common', { id: 13 }), def: 500 }, { ...piece('Ring', 'epic', { id: 14 }), atk: 125, def: 125 }];
    const s = migrateState(save, T0);
    assert.equal(s.equipped.Weapon.atk, Math.round(1400 * quality('legendary') / old.legendary));
    assert.equal(s.equipped.Weapon.atk, 2800, 'a legendary sword of 1,400 is one of 2,800');
    assert.equal(s.equipped.Weapon.value, 1400, 'and sells for as much more');
    assert.equal(s.equipped.Body.def, 1500);
    assert.equal(s.inventory.find(i => i.id === 13).def, 500, 'a common piece stays as it was');
    assert.deepEqual([s.inventory.find(i => i.id === 14).atk, s.inventory.find(i => i.id === 14).def], [200, 200]);
    assert.equal(s.meta.rarityRescale, RARITY_RESCALE);
    assert.match(s.log.at(-1).text, /3 of your pieces grew/);
    // once: loaded again, nothing grows
    const again = migrateState(JSON.parse(JSON.stringify(s)), T0);
    assert.equal(again.equipped.Weapon.atk, 2800);
    assert.equal(again.equipped.Body.def, 1500);
    assert.equal(new Game(null, T0).state.meta.rarityRescale, RARITY_RESCALE, 'a new game has nothing to rescale');
});

test("from stage 60 the ladder's bosses grow to seven times their monsters' health and hit as hard as they do; gold as before", () => {
    const b = BALANCE.enemy.stageBoss;
    const e = BALANCE.enemy;
    assert.deepEqual(stageBossMults(50), { hp: e.bossHpMult, atk: e.bossAtkMult }, 'the early bosses are as they were');
    assert.deepEqual(stageBossMults(b.to), { hp: b.hp, atk: b.atk });
    assert.deepEqual(stageBossMults(400), { hp: 7, atk: 1 });
    for (let st = b.from; st < b.to; st += 10) {
        assert.ok(stageBossMults(st + 10).hp > stageBossMults(st).hp);
        assert.ok(stageBossMults(st + 10).atk < stageBossMults(st).atk);
    }
    for (const stage of [200, 300]) {
        const boss = enemyForStage(stage);
        const before = enemyForStage(stage - 1);
        const base = enemyBaseStats(stage);
        assert.ok(boss.boss && !before.boss);
        assert.ok(Math.abs(boss.maxHp / (base.hp * 7 * supplyMult(stage)) - 1) < 1e-6, `stage ${stage}: seven times the health`);
        assert.ok(Math.abs(boss.atk / (base.atk * supplyMult(stage)) - 1) < 1e-6, `stage ${stage}: its monsters' blow`);
        assert.equal(boss.worth, Math.floor(base.hp * e.bossHpMult), 'it pays for three times the health, as before');
        assert.equal(goldForKill(boss), goldForKill({ maxHp: Math.floor(base.hp * e.bossHpMult), boss: true }));
        const g = new Game(null, T0);
        g.state.combat.maxStage = stage + 5;   // farmed: its loot rolls as the monsters its old health is worth
        assert.equal(killPayout(g.state, boss).rolls, Math.round(e.bossHpMult));
    }
    // the dungeons' bosses keep their multiples
    const lair = DUNGEONS[DUNGEONS.length - 1];
    const dboss = dungeonEnemy({ id: lair.id, index: lair.monsters.length });
    const at = lair.stage + lair.monsters.length;
    assert.equal(dboss.maxHp, Math.floor(enemyBaseStats(at).hp * e.bossHpMult * DUNGEON_BOSS_HP_MULT * supplyMult(at)));
    assert.equal(dboss.atk, Math.floor(enemyBaseStats(at).atk * e.bossAtkMult * supplyMult(at)));
});

test('a legendary sword for a rare one: the hero is seen to grow stronger, by the whole of what it does', () => {
    rng.setSource(seededRandom(5));
    const g = new Game(null, T0);
    g.state.skills.combat.xp = 1e7;   // he can wear runite
    g.state.settings.autoSalvage = 'off';
    const rare = piece('Weapon', 'rare', { id: 21 });
    const legendary = { ...piece('Weapon', 'legendary', { id: 22 }), atk: Math.round(rare.atk * quality('legendary') / quality('rare')), affixes: [] };
    g.state.equipped.Weapon = { ...rare, affixes: [] };
    g.state.inventory.push(legendary);
    g.recompute();
    const gain = equipGain(g.state, legendary);
    const atkBefore = g.derived.atk;
    assert.ok(gain.atk > 0.7, `+${Math.round(gain.atk * 100)}% attack`);
    assert.equal(gain.def, 0);
    g.drainEvents();
    assert.notEqual(g.equipItem(legendary.id), false);
    g.recompute();
    assert.ok(Math.abs(g.derived.atk / atkBefore - 1 - gain.atk) < 1e-9, 'what it said is what it did');
    const ev = g.drainEvents().find(e => e.type === 'equip');
    assert.ok(ev && Math.abs(ev.gain.atk - gain.atk) < 1e-12, 'the equip tells the scene');
    assert.match(gainWords(ev.gain), /^\+\d+% attack$/);
    // a hero with no armour: a first piece is said as defence gained, not as an endless percentage
    const helm = piece('Head', 'common', { id: 23 });
    assert.equal(gainWords(equipGain(g.state, helm)).split(', ')[0], '+defence');
    assert.equal(gainWords({ atk: 0.002, def: 0, hp: 0 }), '', 'a change too small to see says nothing');
    assert.equal(gainWords({ atk: -0.25, def: 0.031, hp: 0 }), '−25% attack, +3.1% defence');
});
