// The accessibility pass (R10, docs/research_notes/research-loop/021-accessibility.md): what the screens say to a
// screen reader beside what they show, and the rules behind the switches and the quieter fight.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { renderNav, renderHotbar } from '../src/ui/render.js';

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
