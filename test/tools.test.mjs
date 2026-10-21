// Tools in the Shop (systems/tools.js; the owner, October 2026): bought with the bars and logs they always took, each
// tier once the skill it serves reaches its level, once the Shop is open; no longer made in Smithing or Crafting.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { xpForLevel } from '../src/core/xp.js';
import { TOOLS, TOOL_SPEED_PER_TIER } from '../src/data/workshop.js';
import { toolsOnOffer, toolPurchase, toolReady, nextToolTier } from '../src/systems/tools.js';
import { renderShop, renderSmithing, renderCrafting } from '../src/ui/render.js';

const T0 = 1_760_000_000_000;

function shopper() {
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.shop = true;
    game.drainEvents();
    return game;
}

test('a tool is bought with its bars and logs, at the level of the skill it serves, and counts at once', () => {
    const game = shopper();
    const s = game.state;
    s.resources.copper_bar = 5; s.resources.normal_log = 5;
    assert.equal(toolPurchase(s, 'pickaxe').why, 'level', 'Mining 1: the Copper Pickaxe waits for Mining 5');
    assert.equal(game.buyTool('pickaxe'), false);
    assert.match(game.drainEvents().find(e => e.type === 'error').text, /Mining 5/);
    s.skills.mining.xp = xpForLevel(5);
    game.recompute();
    const speed = game.derived.skillSpeed.mining;
    assert.equal(toolPurchase(s, 'pickaxe').ok, true);
    assert.equal(toolReady(s), true, 'the Shop shows a badge');
    assert.equal(game.buyTool('pickaxe'), true);
    assert.equal(s.tools.pickaxe, 1);
    assert.deepEqual([s.resources.copper_bar, s.resources.normal_log], [3, 4], 'two bars and a log');
    assert.ok(Math.abs(game.derived.skillSpeed.mining - speed - TOOL_SPEED_PER_TIER) < 1e-9, 'faster at once');
    assert.ok(game.drainEvents().some(e => e.type === 'toolMade' && e.tool === 'pickaxe' && e.tier === 1));
    assert.equal(s.skills.smithing.xp, 0, 'no Smithing XP: it is bought, not made');
    // the next tier: Mining 15 and iron
    assert.equal(nextToolTier(s, 'pickaxe').name, 'Iron Pickaxe');
    s.skills.mining.xp = xpForLevel(15);
    assert.equal(toolPurchase(s, 'pickaxe').why, 'materials');
    assert.equal(game.buyTool('pickaxe'), false);
    assert.match(game.drainEvents().find(e => e.type === 'error').text, /Iron Bar/);
});

test('the Shop sells them only once it is open, and each only once its skill has opened', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.mining.xp = xpForLevel(10);
    s.resources.copper_bar = 5; s.resources.normal_log = 5;
    assert.equal(game.buyTool('pickaxe'), false, 'no Shop yet');
    assert.equal(toolReady(s), false);
    s.unlocks.shop = true;
    assert.deepEqual(toolsOnOffer(s), ['pickaxe'], 'only Mining has opened');
    s.unlocks.woodcutting = true; s.unlocks.hunting = true;
    assert.deepEqual(toolsOnOffer(s).sort(), ['axe', 'bow', 'pickaxe']);
    assert.equal(game.buyTool('toString'), false, 'no such tool');
});

test('at its best a tool is said so; every tier of every tool can be bought in turn', () => {
    const game = shopper();
    const s = game.state;
    for (const [id, tool] of Object.entries(TOOLS)) {
        s.unlocks[tool.skill] = true;
        s.skills[tool.skill].xp = xpForLevel(99);
        for (const t of tool.tiers) {
            for (const [res, qty] of Object.entries(t.consumes)) s.resources[res] = (s.resources[res] || 0) + qty;
            assert.equal(game.buyTool(id), true, t.name);
        }
        assert.equal(s.tools[id], tool.tiers.length);
        assert.equal(toolPurchase(s, id).why, 'best');
    }
});

test('the tools are on the Shop, and gone from Smithing and Crafting; an old order to make one is dropped', () => {
    const game = shopper();
    const s = game.state;
    s.unlocks.woodcutting = true; s.unlocks.hunting = true; s.unlocks.smithing = true; s.unlocks.crafting = true;
    const ui = { smithView: 'tools' };
    const shop = renderShop(game, ui);
    assert.match(shop, /<h2>Tools<\/h2>/);
    for (const name of ['Copper Pickaxe', 'Copper Axe', 'Shortbow']) assert.ok(shop.includes(name), name);
    assert.ok(shop.includes("FI.buyTool('pickaxe')"));
    const smithing = renderSmithing(game, ui);
    assert.ok(!/Copper Pickaxe|FI\.makeTool/.test(smithing), 'no tools in Smithing');
    assert.ok(!/>Tools</.test(smithing), 'no Tools step');
    assert.ok(!/Shortbow|Bows and rods/.test(renderCrafting(game, {})), 'no bows in Crafting');
    const raw = JSON.parse(game.serialize(T0));
    raw.action = { kind: 'tool', tool: 'pickaxe', tier: 1 };
    assert.equal(new Game(raw, T0).state.action, null);
});
