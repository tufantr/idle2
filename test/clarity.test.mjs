// The words and numbers players read (docs/research_notes/research-loop/PROPOSALS.md, the final ranking's small fixes):
// big numbers written as the game writes them, words that say what the code does, and the small marks that say a rule
// where it bites.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { fmt } from '../src/ui/format.js';
import { renderCombat, renderShop } from '../src/ui/render.js';

const T0 = 1_760_000_000_000;
const literal = text => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/** A deep hero whose prestige pays millions of tokens: its numbers must read 1.23M, never as long digits. */
function deepHero() {
    const game = new Game(null, T0);
    const s = game.state;
    Object.assign(s.unlocks, { prestige: true, shop: true });
    s.combat.bestStage = 2100;
    s.combat.maxStage = 2000;
    s.combat.stage = 2000;
    s.ascension.stars = 800;   // every prestige pays ×201 tokens
    game.recompute();
    return game;
}

test('prestige tokens are written as the game writes big numbers, and the Shop says it is this run\'s highest stage', () => {
    const game = deepHero();
    const p = game.prestigePreview();
    assert.ok(p.tokens >= 1e6 && p.nextZoneTokens >= 1e6, `${p.tokens} and ${p.nextZoneTokens} tokens`);
    const raw = new RegExp(`${p.tokens}|${p.nextZoneTokens}`);
    const shop = renderShop(game, {});
    assert.doesNotMatch(shop, raw, 'the Shop: no long digits');
    assert.match(shop, literal(`+${fmt(p.tokens)}</b>`));
    assert.match(shop, literal(`Prestige for +${fmt(p.tokens)} tokens`));
    assert.match(shop, /highest stage this run: 2,000/);
    assert.doesNotMatch(shop, /best stage/, 'maxStage is the run\'s highest, not the best stage');
    const strip = renderCombat(game, { tab: 'combat' });   // the fight at rest: the Combat tab's prestige strip
    assert.doesNotMatch(strip, raw, 'the strip');
    assert.match(strip, literal(`+${fmt(p.tokens)}</b> tokens if you prestige now`));
    assert.match(strip, literal(`pays ${fmt(p.nextZoneTokens)}`));
    game.enterCombat();
    const dock = renderCombat(game, { tab: 'combat' });   // the fight filling the screen: its dock's Prestige
    assert.match(dock, /dock-prestige/);
    assert.doesNotMatch(dock, raw, 'the dock');
    assert.match(dock, literal(`would pay ${fmt(p.nextZoneTokens)}.`));
    assert.equal(game.prestige(), true);
    const line = game.state.log.at(-1).text;
    assert.match(line, literal(`+${fmt(p.tokens)} tokens`), line);
    assert.doesNotMatch(line, raw, 'the battle log');
});
