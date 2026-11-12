// The accessibility pass (R10, docs/research_notes/research-loop/021-accessibility.md): what the screens say to a
// screen reader beside what they show, and the rules behind the switches and the quieter fight.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { renderNav, renderHotbar, renderInventory, renderPerksModal } from '../src/ui/render.js';
import { generateEquipment } from '../src/core/formulas.js';
import { GEAR_TIERS, RARITIES } from '../src/data/items.js';
import { xpForCombatLevel } from '../src/core/xp.js';

const T0 = 1_760_000_000_000;

test("a badge says in words what its glyph shows: the sidebar's, the level's and the hotbar's", () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.farming = true;
    s.farming.plots[0] = { crop: 'potato', plantedAt: T0 - 2e6, readyAt: T0 - 1 };
    s.daily.banked = 2;
    game.recompute();
    const nav = renderNav(game, { tab: 'combat', fresh: new Set() });
    const farm = nav.match(/id="nav-farming"[^]*?<\/button>/)?.[0] || '';
    assert.match(farm, /<span class="nav-ready [^"]*"[^>]*><span aria-hidden="true">1<\/span><span class="sr-only">, 1 plot ready to harvest<\/span><\/span>/);
    assert.match(nav, /<span class="sr-only">, level <\/span>\d+<\/span>/, 'a level badge is a level');
    const hot = renderHotbar(game, { tab: 'combat' });
    assert.match(hot, /<b class="hot-badge"><span aria-hidden="true">2<\/span><span class="sr-only">, 2 waiting<\/span><\/b>/);
    assert.doesNotMatch(hot, /<b[^>]*aria-label/, 'no name on an element without a role');
});

test('a tile tells its rarity twice: its colour, and a pip for each step above Common (its bonuses)', () => {
    const game = new Game(null, T0);
    const s = game.state;
    RARITIES.forEach((rarity, i) => s.inventory.push(generateEquipment({ type: 'Body', tier: 2, power: GEAR_TIERS[1].power, materialName: 'Iron', rarity, source: 'drop' }, s.idCounter++)));
    game.recompute();
    const html = renderInventory(game, { invFilter: 'all' });
    for (const [i, rarity] of RARITIES.entries()) {
        const tile = [...html.matchAll(/<button class="tile r-([a-z]+)[^]*?<\/button>/g)].find(m => m[1] === rarity.id)?.[0] || '';
        assert.ok(tile, rarity.id);
        const pips = Number(tile.match(/class="tile-pips" style="--pips:(\d+)"/)?.[1] || 0);
        assert.equal(pips, i, `${rarity.name}: ${i} pips`);
        assert.equal(pips, rarity.affixes, 'as many as its bonuses');
    }
});

test("the War Tree marks a talent a point can go to with a +, as well as its green frame", () => {
    const game = new Game(null, T0);
    game.state.skills.combat.xp = xpForCombatLevel(106);
    game.state.seen.talents = true;
    game.recompute();
    const html = renderPerksModal(game, { view: 'talents' });
    const ready = [...html.matchAll(/<button class="talent ready[^]*?<\/button>/g)].map(m => m[0]);
    assert.ok(ready.length > 0, 'some talents take a point');
    for (const t of ready) {
        assert.match(t, /<i class="talent-plus" aria-hidden="true">\+<\/i>/);
        assert.match(t, /aria-label="[^"]*, a point can go here"/);
    }
    assert.doesNotMatch(html.replace(/<button class="talent ready[^]*?<\/button>/g, ''), /talent-plus/, 'and no other');
});
