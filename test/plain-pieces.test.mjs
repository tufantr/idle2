// Plain pieces (the owner, October 2026: Crafting levelled far slower than any other skill, for want of gems): a ring,
// earring or amulet from the setting alone, a bar and no gem, as weak as an amethyst piece, teaching PLAIN_XP_SHARE of
// what a piece of the best gem the jeweller can set teaches; and Crafting's late XP paced at 2 instead of 4.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { resolveAction } from '../src/systems/skilling.js';
import { JEWEL_BARS, GEM_TIERS, PLAIN, PLAIN_XP_SHARE, plainXp } from '../src/data/workshop.js';
import { CRAFTING_TYPES } from '../src/data/items.js';
import { PACE } from '../src/data/pace.js';
import { masteryActions, jewelKey } from '../src/data/mastery.js';

const T0 = 1_760_000_000_000;
const [SILVER, GOLD] = JEWEL_BARS;
const plain = (state, type = 'Ring', bar = 'silver_bar') => resolveAction(state, { kind: 'craft', type, bar, gem: PLAIN });
const gemPiece = (state, gem, type = 'Ring', bar = 'silver_bar') => resolveAction(state, { kind: 'craft', type, bar, gem });

/** A jeweller at Crafting `level`. */
function jeweller(level = 1) {
    rng.setSource(seededRandom(4));
    const game = new Game(null, T0);
    game.state.unlocks.crafting = true;
    game.state.skills.crafting.xp = xpForLevel(level);
    game.recompute();
    return game;
}

test('a plain piece takes a bar and no gem, at the setting\'s level', () => {
    const s = jeweller(1).state;
    const ring = plain(s);
    assert.deepEqual(ring.consumes, { silver_bar: 1 });
    assert.equal(ring.levelReq, 1);
    assert.equal(plain(s, 'Ear').levelReq, 3);
    assert.equal(plain(s, 'Neck').levelReq, 5);
    assert.equal(plain(s, 'Ring', 'gold_bar').levelReq, GOLD.levelReq);
    assert.equal(ring.item.gemName, null);
    assert.equal(ring.item.tier, 1, 'as weak as an amethyst piece');
    assert.equal(ring.mastery.key, jewelKey(PLAIN));
    assert.equal(resolveAction(s, { kind: 'craft', type: 'Ring', bar: 'copper_bar', gem: PLAIN }), null, 'jewellery bars only');
    assert.equal(resolveAction(s, { kind: 'craft', type: 'Weapon', bar: 'silver_bar', gem: PLAIN }), null, 'jewellery only');
});

test('it teaches 70% of the best gem the jeweller can set, a gold setting a fifth more; a gem piece always pays more', () => {
    assert.equal(PLAIN_XP_SHARE, 0.7);
    for (let level = 1; level <= 99; level++) {
        const s = jeweller(level).state;
        const best = [...GEM_TIERS].reverse().find(g => g.gem !== 'voidstone' && level >= g.levelReq);
        assert.equal(plain(s).xp, Math.round(best.xp * 0.7), `level ${level}`);
        assert.equal(plain(s).xp, plainXp(level, SILVER));
        if (level >= GOLD.levelReq) assert.equal(plain(s, 'Ring', 'gold_bar').xp, Math.round(best.xp * 0.7 * GOLD.powerMult), `level ${level}, gold`);
        assert.ok(gemPiece(s, best.gem).xp > plain(s).xp, `level ${level}: a ${best.gem} piece pays more`);
    }
    assert.equal(plainXp(99, SILVER), plainXp(70, SILVER), 'the Voidstone sets no pace for it');
});

test('making one: a bar goes, no gem, a plain Silver Ring comes, with Crafting XP and its own mastery', () => {
    const game = jeweller(10);
    const s = game.state;
    s.resources.silver_bar = 3;
    for (const g of GEM_TIERS) s.resources[g.gem] = 4;
    const xp0 = s.skills.crafting.xp;
    assert.ok(game.startCrafting('Ring', 'silver_bar', PLAIN));
    let now = T0;
    while (s.stats.itemsCrafted < 1 && now < T0 + 30_000) game.tick(now += 250);
    assert.equal(s.stats.itemsCrafted, 1);
    assert.equal(s.resources.silver_bar, 2);
    for (const g of GEM_TIERS) assert.equal(s.resources[g.gem], 4, `no ${g.gem} used`);
    const ring = s.inventory.find(i => i.source === 'crafted');
    assert.equal(ring.name, 'Silver Ring');
    assert.equal(ring.type, 'Ring');
    assert.equal(ring.tier, 1);
    assert.deepEqual(ring.materials, { silver_bar: 1 });
    assert.ok(s.skills.crafting.xp > xp0);
    assert.ok(s.mastery.crafting[jewelKey(PLAIN)] > 0, 'its mastery grows');
    // weak, like an amethyst piece: a plain gold amulet is no match for a sapphire one
    const s2 = jeweller(40).state;
    assert.ok(plain(s2, 'Neck', 'gold_bar').item.power < gemPiece(s2, 'sapphire', 'Neck').item.power);
});

test('a save from before loads: plain jewellery joins the mastery list, and an order for a plain piece keeps', () => {
    const keys = masteryActions('crafting').map(a => a.key);
    assert.deepEqual(keys, [jewelKey(PLAIN), ...GEM_TIERS.map(g => jewelKey(g.gem))]);
    const game = jeweller(30);
    const raw = JSON.parse(game.serialize(T0));
    delete raw.mastery.crafting[jewelKey(PLAIN)];
    raw.mastery.crafting[jewelKey('amethyst')] = 500;
    const loaded = migrateState(raw, T0);
    assert.equal(loaded.mastery.crafting[jewelKey(PLAIN)] || 0, 0, 'none yet (a save keeps only mastery above nothing)');
    assert.equal(loaded.mastery.crafting[jewelKey('amethyst')], 500);
    game.state.resources.gold_bar = 5;
    assert.ok(game.startCrafting('Ring', 'gold_bar', PLAIN));
    const again = migrateState(JSON.parse(game.serialize(T0)), T0);
    assert.equal(resolveAction(again)?.id, `gold_bar:${PLAIN}:Ring`);
});

test('Crafting\'s late gems are paced at 2: a diamond piece pays more than half its base XP', () => {
    assert.equal(PACE.crafting, 2);
    const diamond = GEM_TIERS.find(g => g.gem === 'diamond');
    assert.ok(diamond.xp > diamond.baseXp / 2, `${diamond.xp} of ${diamond.baseXp}`);
    for (const type of CRAFTING_TYPES) assert.ok(plain(jeweller(99).state, type).xp >= 70, type);
});
