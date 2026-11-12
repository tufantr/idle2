// The words and numbers players read (docs/research_notes/research-loop/PROPOSALS.md, the final ranking's small fixes):
// big numbers written as the game writes them, words that say what the code does, and the small marks that say a rule
// where it bites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Game } from '../src/game.js';
import { fmt } from '../src/ui/format.js';
import { renderCombat, renderShop, renderInventory, renderIntroModal, renderSkill, renderSmithing, renderWelcomeBack } from '../src/ui/render.js';
import { actionXp } from '../src/systems/skilling.js';
import { SKILLS, SKILL_IDS } from '../src/data/skills.js';
import { SMELTING_RECIPES } from '../src/data/workshop.js';
import { DUNGEONS } from '../src/data/dungeons.js';
import { ZONES } from '../src/data/zones.js';

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

test('nothing promises forging, which is gone (DESIGN §3.25): the empty bag, the title card, the wiki\'s front page', () => {
    const game = new Game(null, T0);
    const bag = renderInventory(game, {});
    assert.match(bag, /No spare gear yet\. Monsters drop it, bosses most often\./);
    assert.doesNotMatch(bag, /forge/i);
    const title = renderIntroModal(game.state);
    assert.match(title, /Fight monsters, gather, upgrade your gear\./);
    assert.doesNotMatch(title, /forge/i);
    const home = readFileSync(new URL('../wiki/pages/home.mjs', import.meta.url), 'utf8');
    assert.match(home, /Fight monsters, gather, upgrade your gear\./);
    assert.doesNotMatch(home, /forge your gear/i);
});

test('a card says the XP an action pays: under a skill potion, the potion\'s XP too', () => {
    const game = new Game(null, T0);
    const s = game.state;
    Object.assign(s.unlocks, { smithing: true });
    s.resources.skill_potion_4 = 3;
    s.resources.copper_ore = 50;
    game.startNodeAction('mining', 'copper_ore');
    game.setWorkPotion('skill_potion_4');
    game.tick(T0 + 100);   // the first bottle is drunk as the work starts
    const d = game.derived;
    assert.ok(d.skillXpMult > 1, 'a skill potion at work');
    const copper = SKILLS.mining.nodes.find(n => n.id === 'copper_ore');
    const shown = Math.round(actionXp(copper.xp, d));
    assert.ok(shown > Math.round(copper.xp * d.xpMult), `${shown} XP with the potion against ${Math.round(copper.xp * d.xpMult)} without`);
    assert.match(renderSkill(game, {}, 'mining'), literal(`+${shown} XP`));
    // and it is what one ore pays
    const before = s.skills.mining.xp;
    let now = T0 + 100;
    while (s.skills.mining.xp === before) game.tick(now += 100);
    assert.equal(Math.round(s.skills.mining.xp - before), shown);
    // the smelter's card too
    const bar = SMELTING_RECIPES.find(r => r.id === 'copper_bar');
    assert.match(renderSmithing(game, {}), literal(`+${Math.round(actionXp(bar.xp, game.derived))} XP`));
});

test('the README\'s opening counts what the game has, and points Play at the live game', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const opening = readme.slice(0, readme.indexOf('**Docs:**'));
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];
    const count = what => words.indexOf(new RegExp(`(\\w+) ${what}`).exec(opening)?.[1]);
    assert.equal(count('skills'), SKILL_IDS.length, 'skills');
    assert.equal(count('dungeons'), DUNGEONS.length, 'dungeons');
    assert.equal(count('zones'), ZONES.length, 'zones');
    assert.doesNotMatch(opening, /forge/i);
    assert.match(opening, /\*\*Play:\*\* \[fantasyidle\.com\]\(https:\/\/fantasyidle\.com\)/);
    assert.doesNotMatch(opening, /vercel/i);
});

test('back after more than the cap, the report says the hours away and the hours counted (P-093)', () => {
    const game = new Game(null, T0);
    game.startNodeAction('mining', 'copper_ore');
    const saved = JSON.parse(game.serialize(T0));
    const HOUR = 3600 * 1000;
    const back = (ms) => { const g = new Game(structuredClone(saved), T0 + ms); return [g, g.resumeFromSave(T0 + ms)]; };
    const [g30, s30] = back(30 * HOUR);
    assert.equal(s30.elapsed, 30 * HOUR);
    assert.equal(s30.simulated, 24 * HOUR);
    assert.ok(s30.capped);
    const report = renderWelcomeBack(s30, g30);
    assert.match(report, /<p class="wb-away"><b>30h<\/b> away, <b [^>]*>24h<\/b> counted<\/p>/);
    assert.match(report, /data-tip="Your hero keeps at it for up to 24h while you are away"/, 'the cap, in a tip a phone can open');
    // three days away: in days
    const [g72, s72] = back(75 * HOUR + 20 * 60000);
    assert.match(renderWelcomeBack(s72, g72), /<b>3d 3h<\/b> away, <b [^>]*>24h<\/b> counted/);
    // inside the cap, one figure as before
    const [g5, s5] = back(5 * HOUR + 12 * 60000);
    assert.equal(s5.capped, false);
    const short = renderWelcomeBack(s5, g5);
    assert.match(short, /<p class="wb-away">You were away <b>5h 12m<\/b><\/p>/);
    assert.doesNotMatch(short, /counted/);
});
