// The words and numbers players read (docs/research_notes/research-loop/PROPOSALS.md, the final ranking's small fixes):
// big numbers written as the game writes them, words that say what the code does, and the small marks that say a rule
// where it bites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Game } from '../src/game.js';
import { fmt } from '../src/ui/format.js';
import { renderCombat, renderShop, renderInventory, renderIntroModal, renderSkill, renderSmithing, renderWelcomeBack, renderSettings, renderItemDetail, renderPrestigeModal, renderClan } from '../src/ui/render.js';
import { renderAboutCard, WIKI_PAGES, FEATURES } from '../src/ui/features.js';
import { DISCORD_INVITE, WIKI_URL, CLAN_BOSS, CLAN_FIGHT_MS, clanBossHealth, BOARD_WEEK_MIN, boardOpensOn } from '../src/data/social.js';
import { strikeWorth, clanAttackFromSave, clanGuardDown } from '../src/core/power.js';
import { actionXp } from '../src/systems/skilling.js';
import { SKILLS, SKILL_IDS } from '../src/data/skills.js';
import { SMELTING_RECIPES } from '../src/data/workshop.js';
import { DUNGEONS } from '../src/data/dungeons.js';
import { ZONES } from '../src/data/zones.js';
import { GEAR_TIERS, RARITIES } from '../src/data/items.js';
import { BASE } from '../src/core/modifiers.js';
import { trialById } from '../src/data/trials.js';
import { BALANCE, generateEquipment } from '../src/core/formulas.js';

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
    // seconds past the cap cut nothing worth a word: one figure
    const [g24, s24] = back(24 * HOUR + 20_000);
    assert.ok(s24.capped);
    assert.match(renderWelcomeBack(s24, g24), /<p class="wb-away">You were away <b>24h<\/b><\/p>/);
    // inside the cap, one figure as before
    const [g5, s5] = back(5 * HOUR + 12 * 60000);
    assert.equal(s5.capped, false);
    const short = renderWelcomeBack(s5, g5);
    assert.match(short, /<p class="wb-away">You were away <b>5h 12m<\/b><\/p>/);
    assert.doesNotMatch(short, /counted/);
});

test('the game links its wiki: in Settings beside the Discord, and at the foot of every "?" card with a page there (P-074)', () => {
    assert.equal(WIKI_URL, 'https://wiki.fantasyidle.com');
    const settings = renderSettings(new Game(null, T0), {}, null);
    const row = /<div class="btn-row">(<a [^>]*>Join the Discord<\/a>[\s\S]*?)<\/div>/.exec(settings)?.[1] || '';
    assert.match(row, literal(`href="${DISCORD_INVITE}"`));
    assert.match(row, literal(`<a class="btn-link" href="${WIKI_URL}" target="_blank" rel="noopener">Read the wiki</a>`), 'beside the Discord');
    // every place with a "?" has its page; Settings, which has none, has no link
    for (const id of Object.keys(FEATURES).filter(id => FEATURES[id].points?.length)) {
        assert.ok(WIKI_PAGES[id], `${id} has a wiki page`);
        assert.match(renderAboutCard(id), literal(`<a href="${WIKI_URL}${WIKI_PAGES[id]}" target="_blank" rel="noopener">More on the wiki</a>`), id);
    }
    assert.equal(WIKI_PAGES.mining, '/skills/mining');
    assert.equal(WIKI_PAGES.achievements, '/medals');
    assert.doesNotMatch(renderAboutCard('settings'), /More on the wiki/);
});

test('attack speed at its cap: a quiet mark on the hero\'s swing, and on a piece whose speed adds nothing (P-074)', () => {
    const game = new Game(null, T0);
    const s = game.state;
    const piece = (type, id, speed) => Object.assign(generateEquipment({ type, tier: 1, power: GEAR_TIERS[0].power, materialName: GEAR_TIERS[0].name, rarity: RARITIES[0], source: 'drop' }, id),
        { affixes: [{ stat: 'attackSpeed', name: 'Attack Speed', value: speed }] });
    s.inventory.push(piece('Weapon', 901, 0.6), piece('Gloves', 902, 0.25));
    game.equipItem(901);
    game.equipItem(902);
    assert.ok(Math.abs(game.derived.attackSpeedBonus - 0.85) < 1e-9, 'every bonus together');
    assert.doesNotMatch(renderInventory(game, {}), /cap-mark/, 'under the cap: no mark');
    s.inventory.push(piece('Boots', 903, 0.3), piece('Boots', 904, 0.2));
    game.equipItem(903);
    const d = game.derived;
    assert.ok(Math.abs(d.attackSpeedBonus - 1.15) < 1e-9, `+115%: ${d.attackSpeedBonus}`);
    assert.equal(d.attackInterval, Math.round(BASE.baseAttackInterval / (1 + BASE.caps.attackSpeed)), 'the swing stops at the cap');
    assert.match(renderInventory(game, {}), literal('<i class="cap-mark" data-tip-title="At the cap" data-tip="Attack speed stops at +100%, and yours comes to +115%: more adds nothing."'));
    // without any one of the three he is under the cap: each one's speed counts, so no piece is marked
    for (const id of [901, 902, 903]) assert.doesNotMatch(renderItemDetail(game, id), /cap-mark/, `${id}`);
    s.perks.rogue = 10;   // +30% more: +145%
    game.recompute();
    assert.doesNotMatch(renderItemDetail(game, 901), /cap-mark/, 'without the weapon\'s +60% he has +85%: it still counts');
    const boots = renderItemDetail(game, 903);
    assert.match(boots, /<li>\+30\.0% Attack Speed<i class="cap-mark"/, 'without the boots\' +30% he has +115%: theirs adds nothing');
    assert.match(boots, literal('data-tip="Without this piece&#39;s speed, yours is already at the cap of +100%: it adds nothing."'));
    assert.match(renderItemDetail(game, 902), /class="cap-mark"/, 'the gloves\' too');
    // a pair in the bag is judged in place of the pair worn: +115% without them, so theirs adds nothing either
    assert.match(renderItemDetail(game, 904), /class="cap-mark"/);
});

test('Faithless\'s card says its tokens count again from the next prestige, and they do (P-007)', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.unlocks.prestige = true;
    s.seen.trials = true;
    Object.assign(s.combat, { bestStage: 250, maxStage: 30, stage: 30 });
    Object.assign(s.prestige, { tokens: 5000, count: 3, runStartedAt: T0 - 3600_000 });
    game.recompute();
    const rule = trialById('faithless').rule;
    assert.equal(rule, 'Your tokens give nothing this run; they count again from the next prestige.');
    assert.match(renderPrestigeModal(game), literal(`<small class="trial-rule">${rule}</small>`));
    const power = game.derived.tokenPowerPct;
    assert.ok(power > 0);
    assert.equal(game.startTrial('faithless'), true);
    assert.equal(game.derived.tokenPowerPct, 0, 'nothing in the Trial\'s run');
    assert.ok(s.prestige.tokens >= 5000, 'the tokens are kept');
    assert.match(s.log.at(-1).text, literal(rule), 'the log says it as the run begins');
    // the next prestige ends the Trial: they count again, with the run's own
    game.tick(T0 + BALANCE.prestige.minRunMs + 1000);
    s.combat.maxStage = Math.max(s.combat.maxStage, 30);
    assert.equal(game.prestige(), true);
    assert.ok(game.derived.tokenPowerPct >= power, `${game.derived.tokenPowerPct}% against ${power}%`);
});

test('the clan boss\'s "?" gives each level\'s attacks and what striking makes an attack worth (P-006)', () => {
    const card = renderAboutCard('clan');
    const levels = Array.from({ length: CLAN_BOSS.levels }, (_, i) => Math.round(clanBossHealth(i + 1) / 1000));
    assert.equal(levels[0], CLAN_BOSS.first);
    assert.match(card, literal(`its levels take about ${levels.slice(0, -1).join(', ')} and ${levels.at(-1)} attacks of an average member`));
    assert.match(card, /only then do strikes land, 2\.5 times as hard/, 'the strike\'s own ×2.5 stays');
    const atCap = BASE.baseAttackInterval / (1 + BASE.caps.attackSpeed);
    assert.equal(strikeWorth(atCap).toFixed(2), '1.33');
    assert.match(card, /makes an attack worth about ×1\.33 one you only watch \(at full attack speed; more for a hero who swings slower\)/);
    assert.ok(strikeWorth(BASE.baseAttackInterval) > strikeWorth(atCap) + 0.2, 'more for a hero who swings slower');
    // the figure is the server's own reckoning for a saved hero at the cap, striking fast through every opening
    const game = new Game(null, T0);
    game.state.perks.rogue = 20;
    game.state.agility.built = [];
    game.state.inventory.push(Object.assign(generateEquipment({ type: 'Weapon', tier: 1, power: GEAR_TIERS[0].power, materialName: GEAR_TIERS[0].name, rarity: RARITIES[0], source: 'drop' }, 950),
        { affixes: [{ stat: 'attackSpeed', name: 'Attack Speed', value: 0.5 }] }));
    game.equipItem(950);
    const save = JSON.parse(game.serialize(T0));
    const openings = Array.from({ length: CLAN_FIGHT_MS / 250 + 1 }, (_, i) => i * 250).filter(clanGuardDown);
    const worth = clanAttackFromSave(save, openings, CLAN_FIGHT_MS, T0).damage / clanAttackFromSave(save, [], CLAN_FIGHT_MS, T0).damage;
    assert.ok(Math.abs(worth - strikeWorth(atCap)) < 0.01, `the server: ×${worth.toFixed(3)}`);
});

test('the crowns read 1st, 2nd and 3rd: gold, silver and bronze, the place in a tip a phone can open (P-001)', () => {
    const game = new Game(null, T0);
    const clans = (prefix, n) => Array.from({ length: n }, (_, i) => ({ rank: i + 1, name: `${prefix} ${i + 1}`, tag: `C${i + 1}`, kills: 5, score: 40 - i, you: i === 1 }));
    const ranking = { week: '2026-W46', divisions: [{ id: 'gold', name: 'Gold', clans: clans('Clan', 4) }], last: { week: '2026-W45', divisions: [{ id: 'silver', name: 'Silver', clans: clans('Old', 3) }] } };
    const social = { loaded: true, clan: { id: 7, name: 'Wolves', tag: 'WLF', crown: { rank: 1, division: 'gold' } }, members: [], ranking };
    const html = renderClan(game, { social }, { loggedIn: true });
    assert.match(html, literal('<span class="clan-crown rank-1" data-tip-title="1st" data-tip="in the Gold division last week"'), 'the clan\'s own crown');
    for (const [rank, place] of [[1, '1st'], [2, '2nd'], [3, '3rd']]) {
        assert.match(html, literal(`<span class="clan-crown rank-${rank}" data-tip-title="${place}" data-tip="in the Gold division this week"`), `this week's ${place}`);
        assert.match(html, literal(`<span class="clan-crown rank-${rank}" data-tip-title="${place}" data-tip="in the Silver division last week"`), `last week's ${place}`);
    }
    assert.doesNotMatch(html, /clan-crown rank-4/, 'the top three only');
    const list = renderClan(game, { social: { loaded: true, clan: null, clans: [{ id: 3, name: 'Hawks', tag: 'HWK', members: 4, crown: { rank: 3, division: 'bronze' } }] } }, { loggedIn: true });
    assert.match(list, literal('<span class="clan-crown rank-3" data-tip-title="3rd" data-tip="in the Bronze division last week"'), 'on the clan list');
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    for (const [rank, metal] of [[1, 'gold'], [2, 'silver'], [3, 'bronze']]) assert.match(css, new RegExp(`\\.clan-crown\\.rank-${rank} \\.spr \\{ filter: [^}]+\\}\\s+/\\* ${metal} \\*/`), metal);
});

test('the boards open on This week, and on All time while the week\'s board holds fewer than five names (P-129)', () => {
    const names = n => ({ entries: Array.from({ length: n }, (_, i) => ({ rank: i + 1, username: `p${i}`, value: 10 - i })) });
    assert.equal(BOARD_WEEK_MIN, 5);
    assert.equal(boardOpensOn(names(5)), 'week');
    assert.equal(boardOpensOn(names(12)), 'week');
    assert.equal(boardOpensOn(names(4)), 'all');
    assert.equal(boardOpensOn(names(0)), 'all');
    assert.equal(boardOpensOn(null), 'all', 'no answer: All time');
    // the game asks for this week's first (main.js freshSocial; openingBoard falls back once, a tap on the period chooses)
    const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    assert.match(main, /metric: 'bestStage', period: 'week', periodSet: false/);
    assert.match(main, /boardPeriod\(period\) \{ ui\.social\.period = period; ui\.social\.periodSet = true;/);
    // and the board says which it is: This week on the period's switch, "(this week)" over its column
    const board = { ...names(6), label: 'Best stage', period: 'week', optIn: true };
    const html = renderClan(new Game(null, T0), { social: { loaded: true, clan: null, clans: [], leaderboard: board, metric: 'bestStage', period: 'week', optIn: true } }, { loggedIn: true });
    assert.match(html, /onclick="FI\.boardPeriod\('all'\)">This week<\/button>/);
    assert.match(html, /Best stage \(this week\)/);
});
