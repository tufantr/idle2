// Sources of power (systems/powerledger.js, DESIGN §3.36): each source's part in the hero's strength, reckoned once for
// tools/ledger.mjs and for the panel in the game, so the two say the same of the same hero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BASE, deriveStats, legacyMult } from '../src/core/modifiers.js';
import { generateEquipment } from '../src/core/formulas.js';
import { xpForLevel, xpForCombatLevel } from '../src/core/xp.js';
import { GEAR_TIERS, RARITIES, EQUIP_SLOTS } from '../src/data/items.js';
import { CAMP_UPGRADES, campMultiplier } from '../src/data/camp.js';
import { CLAN_BANNER, isoWeek } from '../src/data/social.js';
import { AGILITY_SLOTS } from '../src/data/agility.js';
import { DUNGEONS } from '../src/data/dungeons.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { seen } from '../src/systems/disclosure.js';
import { POWER_SOURCES, powerLedger, powerShares, withoutSource } from '../src/systems/powerledger.js';
import { renderInventory, renderPowerModal } from '../src/ui/render.js';
import { FEATURES, wikiUrl } from '../src/ui/features.js';

rng.setSource(seededRandom(5));
const T0 = 1_780_000_000_000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'tools/ledger.mjs');

/** A hero with every source of power at work on him. */
function veteran() {
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = xpForCombatLevel(104);
    s.combat.bestStage = 260;
    s.prestige.tokens = 8200; s.prestige.count = 37;
    EQUIP_SLOTS.forEach((slot, i) => {
        const type = /^Ring/.test(slot) ? 'Ring' : /^Ear/.test(slot) ? 'Ear' : slot;
        s.equipped[slot] = generateEquipment({ type, tier: 5, power: GEAR_TIERS[4].power, materialName: 'Rune', rarity: RARITIES[i % 4], source: 'drop' }, s.idCounter++);
    });
    s.forge.Weapon.level = 9;
    for (const u of CAMP_UPGRADES) s.camp[u.id] = 14;
    s.perks.knight = 12; s.perks.warlord = 7; s.perks.paragon = 3;
    s.talents.ranks = { sharpened_edge: 5, thick_skin: 5, iron_hide: 3 };
    for (const a of ACHIEVEMENTS.slice(0, 12)) s.achievements[a.id] = true;
    s.pets.fang = true;
    s.titan.kills = 9;
    s.dungeonTier = 2;
    s.dungeons[DUNGEONS[0].id].clears = 30;
    const course = AGILITY_SLOTS.findIndex(slot => slot.obstacles.some(o => o.mods?.atkMult));
    s.agility.built[course] = AGILITY_SLOTS[course].obstacles.find(o => o.mods?.atkMult).id;
    s.agility.levels[course] = 3;
    s.resources.combat_potion_2 = 4; s.combat.potion = 'combat_potion_2'; s.combat.potionMs = 90_000;
    s.clanBanner = { week: isoWeek(T0), kills: 3 };
    game.recompute();
    game.drainEvents();
    return game;
}
const part = (ledger, id) => ledger.parts.find(p => p.id === id);
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)), `${a} vs ${b}`);

test('every source of attack, defence and health is in the ledger: with all of them gone the hero has his bare hands', () => {
    const { state } = veteran();
    const bare = POWER_SOURCES.reduce((s, id) => withoutSource(s, id), state);
    const d = deriveStats(bare);
    assert.deepEqual([d.atk, d.def, d.maxHp], [BASE.unarmedAtk, 0, BASE.baseHp]);
    const ledger = powerLedger(state);
    for (const id of POWER_SOURCES) assert.ok(part(ledger, id).stages > 0, `${id} is worth something to this hero`);
});

test('the shares are of the sources together: they add up to the whole, and a part of a source is not counted twice', () => {
    const ledger = powerLedger(veteran().state);
    near(ledger.parts.filter(p => !p.of).reduce((sum, p) => sum + p.share, 0), 1);
    assert.deepEqual(ledger.parts.filter(p => p.of).map(p => p.id), ['weapon', 'armour', 'jewellery', 'levels', 'records']);
    assert.ok(ledger.parts.filter(p => p.of).every(p => part(ledger, p.of)));
    const listed = powerShares(ledger);
    assert.deepEqual(listed.map(p => p.share), listed.map(p => p.share).sort((a, b) => b - a), 'biggest first');
    assert.ok(listed.every(p => !p.of));
});

test("a source's numbers are what taking it away costs, and its stages follow the monsters' growth where he stands", () => {
    const { state } = veteran();
    const ledger = powerLedger(state);
    const camp = part(ledger, 'camp');
    const mult = stat => CAMP_UPGRADES.filter(u => u.stat === stat).reduce((m, u) => m * campMultiplier(u, 14), 1);
    near(camp.atk, mult('atk'), 1e-3);   // (his attack is a rounded number)
    near(camp.hp, mult('hp'), 1e-3);
    near(part(ledger, 'legacy').def, legacyMult(state), 1e-3);
    near(part(ledger, 'banner').atk, CLAN_BANNER[3], 1e-3);
    near(camp.boss, Math.log(camp.atk) / Math.log(ledger.gHp));
    near(camp.blow, Math.log(camp.def * camp.hp) / (2 * Math.log(ledger.gAtk)));
    near(camp.stages, camp.boss + camp.blow);
});

test('only what works on him now gets a share: no potion running, no camp, nothing in a Trial that takes it away', () => {
    const game = veteran();
    const s = game.state;
    s.combat.potionMs = 0;
    s.camp = {};
    s.clanBanner = { week: '2020-W01', kills: 7 };
    const ids = powerShares(powerLedger(s)).map(p => p.id);
    for (const id of ['potion', 'camp', 'banner']) assert.ok(!ids.includes(id), id);
    s.trials.active = ['faithless'];
    const faithless = powerLedger(s);
    assert.equal(part(faithless, 'tokens').share, 0, 'Faithless: his tokens do nothing');
    assert.equal(part(faithless, 'records').share, 0);
    assert.equal(faithless.tokens, 8200, 'he still holds them');
});

test('the ledger only reads: the hero is the same after it, and a new hero has nothing to list', () => {
    const game = veteran();
    const before = JSON.stringify(game.state);
    powerLedger(game.state);
    renderPowerModal(game);
    assert.equal(JSON.stringify(game.state), before);
    const fresh = new Game(null, T0);
    assert.deepEqual(powerShares(powerLedger(fresh.state)), []);
    assert.match(renderPowerModal(fresh), /own two hands/);
    fresh.state.combat.bestStage = 1;
    for (const p of powerLedger(fresh.state).parts) for (const k of ['atk', 'def', 'hp', 'boss', 'blow', 'share']) assert.ok(Number.isFinite(p[k]), `${p.id} ${k}`);
});

test('the panel opens by a tap from the hero\'s numbers, once there has been a prestige, on a painting, with its rules behind a "?"', () => {
    const game = new Game(null, T0);
    game.tick(T0 + 100);
    assert.doesNotMatch(renderInventory(game, {}), /FI\.openPower\(\)/, 'a new player has no such button');
    game.state.prestige.count = 1;
    game.tick(T0 + 200);
    assert.ok(seen(game.state, 'power_sources'));
    assert.match(renderInventory(game, {}), /onclick="FI\.openPower\(\)"/);
    const html = renderPowerModal(veteran());
    assert.match(html, /class="modal-content narrow power-modal painted" style="--art:url\(assets\/paint\/armory\.webp\)/);
    assert.match(html, /FI\.about\('power'\)/);
    assert.ok(FEATURES.power.points.length, 'the card says the rules');
    assert.ok(wikiUrl('power').endsWith('/combat#sources-of-power'));
    for (const row of html.match(/<li class="power-row"[^>]*>/g)) assert.match(row, /data-tip-title="[^"]+" data-tip="[^"]+"/, 'each row names what it does in a tip a tap opens');
    assert.match(html, /data-tip-title="Gear" data-tip="×[\d.,]+\w* attack, all of your defence, ×[\d.]+ health\. About [\d,]+ stages at a boss&#39;s clock and [\d,]+ at its blow\."/);
});

/** The shares the panel shows, in its order: { name: percent }. */
const shown = html => [...html.matchAll(/<span class="power-name">([^<]+)<\/span><b class="power-share">([^<]+)<\/b>/g)].map(m => [m[1], m[2]]);
const asShown = p => (p.share < 0.01 ? '&lt;1%' : `${Math.round(p.share * 100)}%`);

/** What tools/ledger.mjs says of a saved hero, and what the game's panel shows of the same save. */
function bothOf(file) {
    const run = spawnSync(process.execPath, [LEDGER, file, '--now', '--json'], { encoding: 'utf8', maxBuffer: 1e8 });
    assert.equal(run.status, 0, run.stderr);
    const tool = JSON.parse(run.stdout);
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const game = new Game(raw, raw.meta.lastActiveAt);
    return { tool, game, html: renderPowerModal(game) };
}

function assertAgree({ tool, game, html }) {
    const mine = powerLedger(game.state);
    assert.deepEqual(tool.parts.map(p => [p.id, p.share, p.atk, p.def, p.hp, p.boss, p.blow]), mine.parts.map(p => [p.id, p.share, p.atk, p.def, p.hp, p.boss, p.blow]), 'every number the same');
    const list = tool.parts.filter(p => !p.of && p.share > 0).sort((a, b) => b.share - a.share);
    assert.deepEqual(shown(html), list.map(p => [p.id === 'potion' ? p.note : p.name, asShown(p)]), "the panel's rows are the tool's");
}

test('the panel and tools/ledger.mjs say the same of a hero with everything', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    try {
        const game = veteran();
        const file = join(dir, 'hero.json');
        writeFileSync(file, game.serialize(T0));
        assertAgree(bothOf(file));
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the panel and tools/ledger.mjs say the same of a hero the simulator played', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    try {
        const prefix = join(dir, 'hero');
        const sim = spawnSync(process.execPath, [join(ROOT, 'tools/simulate.mjs'), '--hours=2', '--seed=2', '--save-at=20', `--save=${prefix}`], { encoding: 'utf8', maxBuffer: 1e8 });
        assert.equal(sim.status, 0, sim.stderr);
        const [saved] = readdirSync(dir).filter(f => f.endsWith('.json'));
        assert.ok(saved, 'the bot reached stage 20 in its two hours');
        const both = bothOf(join(dir, saved));
        assertAgree(both);
        assert.ok(shown(both.html).length >= 2, 'more than one source');
        // the tool's other view, the fresh run at the wall, is reckoned by the same code
        const atWall = spawnSync(process.execPath, [LEDGER, join(dir, saved), '--json'], { encoding: 'utf8', maxBuffer: 1e8 });
        assert.equal(atWall.status, 0, atWall.stderr);
        near(JSON.parse(atWall.stdout).parts.filter(p => !p.of).reduce((sum, p) => sum + p.share, 0), 1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
