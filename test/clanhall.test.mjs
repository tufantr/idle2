// The Clan Hall (the owner, 27 October 2026; DESIGN §3.35): members give what they make to six rooms, counted in work and
// at most three hours a member a week (the server's: test/api.test.cjs); each room's level gives every member a small bonus
// to skilling or supplies; the hall grows through five stages; from the Great Hall a member who has given ten hours wears the
// clan's cloak. Here: the data, the bonuses, the game's copy of the server's word, the gifts leaving the bank, and the cloak.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { HALL, HALL_ROOMS, HALL_STAGES, HALL_LEVELS, LEVEL_AT, ROOM_SECONDS, CLOAK_STAGE, BANNER_COLOURS, BANNER_EMBLEMS, roomLevel, hallLevels, hallStage, giftWorth, roomTakes, hallRoom } from '../src/data/clanhall.js';
import { RESOURCES } from '../src/data/resources.js';
import { SPRITES } from '../src/data/sprites.js';
import { collectModifiers, deriveStats } from '../src/core/modifiers.js';
import { powerSummary } from '../src/core/power.js';
import { migrateState } from '../src/core/state.js';
import { capeEarned, capeWorn, CLAN_CLOAK } from '../src/data/capes.js';
import { heroLayers, hasSprite, spriteStyle, sprite, tintDefs } from '../src/ui/sprites.js';
import { existsSync } from 'node:fs';

const T0 = Date.UTC(2026, 9, 27, 12);
const levelsAt = level => Object.fromEntries(HALL_ROOMS.map(r => [r.id, level ? LEVEL_AT[level - 1] : 0]));

test('six rooms of five levels: 2, 6, 15, 30 and 60 hours of work, 113 a room; five stages, the cloak from the Great Hall', () => {
    assert.deepEqual(LEVEL_AT.map(s => s / 3600), [2, 8, 23, 53, 113]);
    assert.equal(ROOM_SECONDS, 113 * 3600);
    assert.deepEqual([0, 7199, 7200, 28800, ROOM_SECONDS, 1e12].map(roomLevel), [0, 0, 1, 2, 5, 5]);
    assert.equal(HALL_ROOMS.length * HALL_LEVELS, 30);
    assert.deepEqual(HALL_STAGES.map(s => [s.name, s.levels]), [['Camp', 0], ['Longhouse', 6], ['Great Hall', 12], ['Keep', 20], ['Citadel', 30]]);
    assert.deepEqual([0, 5, 6, 11, 12, 19, 20, 29, 30].map(hallStage), [0, 0, 1, 1, 2, 2, 3, 3, 4]);
    assert.equal(HALL_STAGES[CLOAK_STAGE].name, 'Great Hall');
    assert.equal(hallLevels(levelsAt(2)), 12);
    // every room's picture and goods, every stage's painting, every colour and emblem from some stage
    for (const r of HALL_ROOMS) {
        assert.ok(SPRITES[r.icon], r.icon);
        assert.ok(existsSync(new URL(`../assets/paint/${r.art}.webp`, import.meta.url)), r.art);
        assert.ok(Object.keys(RESOURCES).some(id => roomTakes(r, id)), `${r.name} takes something`);
    }
    for (const s of HALL_STAGES) assert.ok(existsSync(new URL(`../assets/paint/${s.art}.webp`, import.meta.url)), s.art);
    for (const e of BANNER_EMBLEMS) assert.ok(SPRITES[e.icon], e.icon);
    assert.deepEqual([...new Set([...BANNER_COLOURS, ...BANNER_EMBLEMS].map(x => x.stage))].sort(), [0, 1, 2, 3, 4]);
});

test("a gift counts its work: the time it takes to make, its inputs' too; gems by tier, essence a second", () => {
    assert.equal(giftWorth('copper_bar'), 5);   // an ore mined and a bar smelted
    assert.equal(Math.round(giftWorth('runite_bar')), 16);
    assert.ok(giftWorth('cooked_shark') > giftWorth('raw_shark'), 'a dish counts its catch too');
    assert.equal(giftWorth('essence'), 1);
    assert.equal(giftWorth('diamond') > giftWorth('amethyst'), true);
    assert.equal(giftWorth('not_a_thing'), 0);
    // each kind of goods goes to one room, and every gift is worth something
    const forge = hallRoom('forge');
    assert.ok(roomTakes(forge, 'runite_bar'));
    assert.ok(!roomTakes(forge, 'runite_ore') && roomTakes(hallRoom('stores'), 'runite_ore'));
    assert.ok(roomTakes(hallRoom('library'), 'essence') && roomTakes(hallRoom('library'), 'diamond'));
    assert.ok(!roomTakes(hallRoom('kitchen'), 'raw_shark'));
    for (const id of Object.keys(RESOURCES)) {
        const rooms = HALL_ROOMS.filter(r => roomTakes(r, id));
        assert.ok(rooms.length <= 1, `${id} goes to one room at most`);
        if (rooms.length) assert.ok(giftWorth(id) > 0, id);
    }
});

test("each level is every member's bonus: skill speed, food, potions, harvests and skill XP, nothing to the fight", () => {
    const game = new Game(null, T0);
    const s = game.state;
    const bare = collectModifiers(s);
    const bareStats = deriveStats(s, bare);
    s.clanHall.rooms = { forge: 5, stores: 3, kitchen: 2, apothecary: 4, garden: 1, library: 5 };
    const mods = collectModifiers(s);
    const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-9, `${why}: ${a} vs ${b}`);
    near(mods.skillSpeed.smithing - bare.skillSpeed.smithing, 0.10, 'Forge 5: smithing');
    near(mods.skillSpeed.crafting - bare.skillSpeed.crafting, 0.10, 'Forge 5: crafting');
    near(mods.skillSpeed.mining - bare.skillSpeed.mining, 0.06, 'Stores 3: mining');
    near(mods.skillSpeed.hunting - bare.skillSpeed.hunting, 0.06, 'Stores 3: hunting');
    near(mods.foodMult - bare.foodMult, 0.08, 'Kitchen 2');
    near(mods.potionDuration - bare.potionDuration, 0.20, 'Apothecary 4');
    near(mods.farmYield - bare.farmYield, 0.03, 'Garden 1');
    const stats = deriveStats(s, mods);
    near(stats.xpMult - bareStats.xpMult, 0.10, 'Library 5: the skills\' XP');
    assert.equal(stats.combatXpMult, bareStats.combatXpMult, "not Combat's");
    for (const k of ['atk', 'def', 'maxHp', 'attackInterval', 'critChance']) assert.equal(stats[k], bareStats[k], `${k} stays`);
    // the boards and the clan boss leave the hall out as they do every bonus to skilling
    s.clanHall.rooms = levelsAt(5);
    const withHall = powerSummary(JSON.parse(game.serialize(T0)), T0);
    s.clanHall.rooms = levelsAt(0);
    const without = powerSummary(JSON.parse(game.serialize(T0)), T0);
    assert.equal(withHall.attackDamage, without.attackDamage);
});

test("the server's word on the hall: kept in the save, rises told once in the same clan, joining a built hall is no rise", () => {
    const game = new Game(null, T0);
    const s = game.state;
    game.drainEvents();
    // joining a clan whose hall stands: its levels and banner, no cards
    assert.equal(game.setClanHall({ clan: 7, rooms: { forge: LEVEL_AT[1], library: LEVEL_AT[0] }, stage: 1, colour: 'forest', emblem: 'troll', cloak: false }), true);
    assert.deepEqual([s.clanHall.rooms.forge, s.clanHall.rooms.library, s.clanHall.stage, s.clanHall.colour, s.clanHall.emblem], [2, 1, 1, 'forest', 'troll']);
    assert.deepEqual(game.drainEvents().filter(e => e.type.startsWith('hall')), []);
    assert.equal(game.setClanHall({ clan: 7, rooms: { forge: LEVEL_AT[1] + 100, library: LEVEL_AT[0] }, stage: 1, colour: 'forest', emblem: 'troll' }), false, 'the same levels: nothing changes');
    // a clanmate's gift raises the Forge; the hall reaches the Great Hall; ten hours given put the cloak on
    s.hero.cape = '';
    game.setClanHall({ clan: 7, rooms: { ...levelsAt(2), forge: LEVEL_AT[2] }, stage: 2, colour: 'forest', emblem: 'troll', cloak: true });
    const told = game.drainEvents().filter(e => e.type.startsWith('hall'));
    assert.deepEqual(told.filter(e => e.type === 'hallRoom').map(e => [e.room, e.level]).sort(), [['apothecary', 2], ['forge', 3], ['garden', 2], ['kitchen', 2], ['library', 2], ['stores', 2]]);
    assert.deepEqual(told.filter(e => e.type !== 'hallRoom').map(e => e.type), ['hallStage', 'hallCloak']);
    assert.equal(s.hero.cape, CLAN_CLOAK.skill, 'the hero puts the cloak on');
    assert.equal(capeWorn(s)?.skill, 'clan');
    // a save keeps it all; another clan's hall is no rise; leaving takes the bonuses and the cloak off
    const kept = migrateState(JSON.parse(game.serialize(T0)), T0);
    assert.deepEqual(kept.clanHall, s.clanHall);
    assert.equal(kept.hero.cape, 'clan');
    game.setClanHall({ clan: 9, rooms: levelsAt(5), stage: 4, colour: 'teal', emblem: 'dragon', cloak: false });
    assert.deepEqual(game.drainEvents().filter(e => e.type.startsWith('hall')), []);
    game.setClanHall(null);
    assert.deepEqual([hallLevels(Object.fromEntries(Object.entries(s.clanHall.rooms).map(([id, l]) => [id, l ? LEVEL_AT[l - 1] : 0]))), s.clanHall.stage, s.clanHall.cloak], [0, 0, false]);
    assert.equal(capeWorn(s), null, 'the rank\'s cloak again');
    const after = migrateState(JSON.parse(game.serialize(T0)), T0);
    assert.equal(after.hero.cape, '', 'a save does not keep a clan cloak no longer earned');
});

test('gifts leave the bank once each, by their number, and the bank stops at nothing', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.resources.runite_bar = 50;
    s.resources.essence = 30;
    assert.deepEqual(game.applyHallGifts([{ seq: 2, resource: 'essence', qty: 10 }, { seq: 1, resource: 'runite_bar', qty: 40 }]), [{ resource: 'runite_bar', qty: 40 }, { resource: 'essence', qty: 10 }]);
    assert.deepEqual([s.resources.runite_bar, s.resources.essence, s.clanHall.lastGift], [10, 20, 2]);
    assert.deepEqual(game.applyHallGifts([{ seq: 1, resource: 'runite_bar', qty: 40 }, { seq: 2, resource: 'essence', qty: 10 }]), [], 'the same gifts again: taken already');
    game.applyHallGifts([{ seq: 3, resource: 'runite_bar', qty: 99 }, { seq: 4, resource: 'nonsense', qty: 5 }, { seq: 'x', resource: 'essence', qty: 1 }]);
    assert.deepEqual([s.resources.runite_bar, s.resources.essence, s.clanHall.lastGift], [0, 20, 4], 'used since it was given: nothing below nought');
    assert.equal(migrateState(JSON.parse(game.serialize(T0)), T0).clanHall.lastGift, 4, 'the save keeps the number');
    // a page running the older game drops `clanHall` but keeps `meta`: the number comes back, and nothing is taken twice
    const older = JSON.parse(game.serialize(T0));
    delete older.clanHall;
    const back = new Game(older, T0);
    assert.equal(back.state.clanHall.lastGift, 4);
    assert.deepEqual(back.applyHallGifts([{ seq: 3, resource: 'essence', qty: 5 }, { seq: 4, resource: 'essence', qty: 5 }]), []);
    game.setClanHall(null);
    assert.equal(s.clanHall.lastGift, 4, 'leaving the clan keeps it');
});

test("a save's hall is cleaned: known rooms at their levels, known colours, a number for the last gift", () => {
    const s = migrateState({ version: 3, clanHall: { clan: '7', rooms: { forge: 9, stores: '2', attic: 3 }, stage: 99, colour: 'plaid', emblem: 'griffin', cloak: 'yes', lastGift: -4 } }, T0);
    assert.deepEqual(s.clanHall, { clan: 7, rooms: { forge: 5, stores: 2, kitchen: 0, apothecary: 0, garden: 0, library: 0 }, stage: HALL_STAGES.length - 1, colour: '', emblem: 'griffin', cloak: false, lastGift: 0 });
    assert.deepEqual(migrateState({ version: 3 }, T0).clanHall.rooms, levelsAt(0));
});

test("the clan's cloak is the white cloak in the banner's colour, through a filter the page holds once", () => {
    const game = new Game(null, T0);
    const s = game.state;
    assert.equal(capeEarned(s, 'clan'), false);
    s.clanHall = { ...s.clanHall, cloak: true, colour: 'azure' };
    s.hero.cape = 'clan';
    const cloak = heroLayers(s)[0];
    assert.equal(cloak, 'tint/azure/hero/cloaks/white');
    assert.ok(hasSprite(cloak));
    assert.equal(spriteStyle(cloak), `${spriteStyle('hero/cloaks/white')};--tint:url(#tint-azure)`);
    assert.match(sprite(cloak), /class="spr  tinted"/);
    s.clanHall.colour = '';
    assert.equal(heroLayers(s)[0], 'tint/crimson/hero/cloaks/white', 'no colour picked: the first');
    const defs = tintDefs();
    for (const c of BANNER_COLOURS) assert.ok(defs.includes(`id="tint-${c.id}"`), c.id);
    assert.ok(defs.includes('values="0.114 0 0 0 0 0 0.306 0 0 0 0 0 0.847 0 0 0 0 0 1 0"'), 'azure #1d4ed8, channel by channel');
    s.clanHall.cloak = false;
    assert.equal(heroLayers(s)[0].startsWith('hero/cloaks/'), true, "not earned: the rank's cloak");
    assert.equal(HALL.cloakHours, 10);
});

test('the give dialog starts at one and says on its button what goes; a week given says so instead of a grey slider', async () => {
    const { renderHallGive } = await import('../src/ui/render.js');
    const game = new Game(null, T0);
    game.state.resources.runite_bar = 900;
    const hall = { clan: 7, rooms: {}, stage: 0, given: { week: 0, total: 0 }, weekly: HALL.weeklyHours * 3600, endsInMs: 5 * 864e5, at: Date.now() };
    const ui = { social: { hall }, hallGive: { room: 'forge', resource: 'runite_bar', qty: null } };
    let html = renderHallGive(game, ui);
    assert.match(html, /id="give-qty"[^>]*min="1" max="684" value="1"/, 'the whole week at most (its last bar a little over), one to begin with');
    assert.match(html, /Give<span id="give-label"> 1 · 16 s<\/span>/);
    // nine seconds left (the owner's first gift): one more bar, no slider for one
    hall.given.week = HALL.weeklyHours * 3600 - 9;
    html = renderHallGive(game, ui);
    assert.match(html, /<input type="hidden" id="give-qty"[^>]*value="1">/);
    assert.match(html, /Give<span id="give-label"> 1 · 16 s/);
    // the week given: said plainly, nothing to slide, Give off
    hall.given.week = HALL.weeklyHours * 3600;
    html = renderHallGive(game, ui);
    assert.doesNotMatch(html, /id="give-qty"/);
    assert.match(html, /This week's 3 hours of work are given\. More on Monday, in \d+d \d+h\./);
    assert.match(html, /btn-confirm" onclick="FI\.hallGive\(\)" disabled>/);
});
