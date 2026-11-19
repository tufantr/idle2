// The accounts the rehearsal is tried on (deploy/vps/rehearse.mjs --fixtures): one JSON file an account, shaped as its row in
// the users table, with saves made by the game's own code: new heroes, deep heroes, heroes in a Trial, a dungeon, a Titan's or
// a clan boss's fight, saves of every older shape, and hand-damaged ones. Every name in here is made up; `identitiesOf` lists
// what the rehearsal's report must never contain (test/rehearse.test.mjs).
//
//   node test/helpers/rehearse-fixtures.mjs <folder>    # writes them (nothing is read from anywhere)

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Game } from '../../src/game.js';
import { rng, seededRandom } from '../../src/core/rng.js';
import { createDefaultState } from '../../src/core/state.js';
import { powerSummary, plausibleAttackDamage, honestClimb } from '../../src/core/power.js';
import { generateEquipment } from '../../src/core/formulas.js';
import { xpForLevel, xpForCombatLevel } from '../../src/core/xp.js';
import { EQUIP_SLOTS, TYPE_SLOTS, RARITIES, GEAR_TIERS, CRAFTING_TYPES } from '../../src/data/items.js';
import { RESOURCES } from '../../src/data/resources.js';
import { SKILL_IDS } from '../../src/data/skills.js';
import { PERKS } from '../../src/data/perks.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { PETS } from '../../src/data/pets.js';
import { UNIQUES, DUNGEONS } from '../../src/data/dungeons.js';
import { TRIALS, TRIAL_TIERS, weeklyTrialAt } from '../../src/data/trials.js';
import { CHARMS } from '../../src/data/charms.js';
import { BESTIARY_NAMES } from '../../src/data/bestiary.js';
import { HALL_ROOMS } from '../../src/data/clanhall.js';
import { AGILITY_SLOTS } from '../../src/data/agility.js';
import { CROPS } from '../../src/data/farming.js';
import { MASTERY_SKILLS, masteryActions } from '../../src/data/mastery.js';
import { TOOLS } from '../../src/data/workshop.js';

const require = createRequire(import.meta.url);
const server = require('../../api/index.js');   // (the growth check, as an upload runs it)

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** The rehearsal's clock in fixture mode: the fixtures are made for this moment (a Thursday). */
export const FIXTURE_NOW = Date.UTC(2026, 10, 19, 12, 0, 0);

const rarity = id => RARITIES.find(r => r.id === id);
const slotType = slot => Object.keys(TYPE_SLOTS).find(type => TYPE_SLOTS[type].includes(slot));

function piece(type, tier, rarityId, id, extra = {}) {
    const g = GEAR_TIERS[tier - 1];
    const jewel = CRAFTING_TYPES.includes(type);
    return { ...generateEquipment({ type, tier, power: g.power * (jewel ? 0.8 : 1), materialName: jewel ? null : g.name, gemName: jewel ? g.jewel : null, rarity: rarity(rarityId), source: 'drop' }, id), ...extra };
}

/** A save as the game writes it, after a tick. */
const written = (state, now) => {
    const game = new Game(state, now);
    game.tick(now + 1000);
    return JSON.parse(game.serialize(now + 1000));
};

/** A new hero: a few minutes of the opening, played. */
function newHero(now, name) {
    const started = now - 10 * 60 * 1000;
    const game = new Game(null, started);
    game.state.hero.name = name;
    game.enterCombat();
    let t = started;
    for (let i = 0; i < 400; i++) { t += 250; game.tick(t); }
    game.leaveCombat();
    game.startNodeAction('mining', 'copper_ore');
    for (let i = 0; i < 80; i++) { t += 250; game.tick(t); }
    return JSON.parse(game.serialize(t));
}

/** A hero some days in: gear, skills, a camp, prestiges, at work. */
function midHero(now, name) {
    const s = createDefaultState(now - 9 * DAY);
    s.hero.name = name;
    s.meta.playtimeMs = 40 * HOUR; s.meta.attendedMs = 16 * HOUR;
    Object.assign(s.combat, { bestStage: 142, maxStage: 96, stage: 95 });
    Object.assign(s.prestige, { tokens: 8400, skillPoints: 6, count: 21, spClaimedStage: 140, runStartedAt: now - 3 * HOUR, firstAt: now - 8 * DAY });
    s.gold = 8.25e7;
    for (const id of SKILL_IDS) s.skills[id].xp = xpForLevel(id === 'combat' ? 71 : 38);
    for (const id of Object.keys(RESOURCES).slice(0, 30)) s.resources[id] = 120;
    EQUIP_SLOTS.slice(0, 6).forEach((slot, i) => { s.equipped[slot] = piece(slotType(slot), 4, ['rare', 'epic', 'uncommon'][i % 3], s.idCounter++); s.forge[slot] && (s.forge[slot].level = 3 + i); });
    for (let i = 0; i < 5; i++) s.inventory.push(piece('Ring', 3, 'rare', s.idCounter++, { locked: i === 0 }));
    Object.assign(s.camp, { whetstone: 12, armory: 9, hearth: 7 });
    s.perks[PERKS[0].id] = 4;
    s.settings.autoSalvage = 'uncommon';
    s.action = { kind: 'node', skill: 'woodcutting', node: 'oak_log', progress: 900, stalled: false };
    return written(s, now);
}

/** A hero far along: every part of the game has something of his. `opts` moves him deeper or shallower. */
function deepHero(now, name, { bestStage = 1800, days = 150, tokens = 3.2e8, stars = 40, trialTiers = 7, active = null } = {}) {
    const s = createDefaultState(now - days * DAY);
    s.hero.name = name;
    s.meta.playtimeMs = days * 9 * HOUR; s.meta.attendedMs = days * 2.5 * HOUR;
    s.meta.lastInputAt = now - 2 * HOUR;
    Object.assign(s.combat, { bestStage, maxStage: Math.floor(bestStage * 0.7), stage: Math.floor(bestStage * 0.7) - 3, pity: 2, lordsBeaten: Math.floor(bestStage / 100) * 100, stallMs: 40000, bossTimeLeft: 9000 });
    Object.assign(s.prestige, { tokens, skillPoints: 40, count: 640, spClaimedStage: bestStage, runStartedAt: now - 5 * HOUR, firstAt: now - (days - 3) * DAY });
    s.ascension = { count: 4, stars, firstAt: now - 40 * DAY, lastAt: now - 6 * DAY };
    s.gold = 4.75e18;
    s.bagUpgrades = 12;
    for (const id of SKILL_IDS) s.skills[id].xp = id === 'combat' ? xpForCombatLevel(131) : xpForLevel(99) + 123456;
    Object.keys(RESOURCES).forEach((id, i) => { s.resources[id] = 2000 + i * 37; });
    s.resources.essence = 9.1e6;
    for (const skill of MASTERY_SKILLS) masteryActions(skill).slice(0, 5).forEach((a, i) => { s.mastery[skill][a.key] = 1500 * (i + 1); });
    for (const id of Object.keys(TOOLS)) s.tools[id] = TOOLS[id].tiers.length;
    EQUIP_SLOTS.forEach((slot, i) => {
        s.equipped[slot] = piece(slotType(slot), 7, i % 4 === 0 ? 'mythic' : 'legendary', s.idCounter++, { depth: bestStage - 40 - i });
        if (s.forge[slot]) { s.forge[slot].level = 180 + i * 3; s.forge[slot].tier = 7; }
        if (s.bench[slot]) { s.bench[slot].level = 90 + i; s.bench[slot].tier = 7; }
    });
    for (let i = 0; i < 40; i++) s.inventory.push(piece(Object.keys(TYPE_SLOTS)[i % 10], 5 + (i % 3), ['epic', 'legendary', 'rare'][i % 3], s.idCounter++, { locked: i % 7 === 0, value: 1000 + i, depth: i % 2 ? bestStage - i : undefined }));
    const uniques = Object.keys(UNIQUES);
    uniques.slice(0, 5).forEach(id => { s.uniques[id] = true; });
    s.inventory.push({ ...piece(UNIQUES[uniques[0]].type, UNIQUES[uniques[0]].tier, 'legendary', s.idCounter++), uniqueId: uniques[0], name: UNIQUES[uniques[0]].name, source: 'unique', uniqueTier: 2 });
    s.dungeonTier = 2;
    for (const d of DUNGEONS) s.dungeons[d.id] = { clears: 300, fragments: 17 };
    s.titan = { kills: 42, readyAt: now + HOUR, attempts: 57, bestPct: 0.93, before: null };
    Object.assign(s.camp, { whetstone: 62, armory: 55, hearth: 47 });
    for (const p of PERKS) s.perks[p.id] = Math.min(p.max, 8);
    for (const a of ACHIEVEMENTS.slice(0, 38)) s.achievements[a.id] = true;
    for (const p of PETS.slice(0, 7)) s.pets[p.id] = true;
    s.talents = { ranks: { sharpened_edge: 5, keen_eye: 5, opening_blow: 3, precision: 5 }, respecs: 2 };
    s.charms = Object.fromEntries(CHARMS.map(c => [c.id, Math.floor(c.charges * 2.5)]));
    s.trials = { active, cleared: Object.fromEntries(TRIALS.map((t, i) => [t.id, trialTiers - (i % 3)])), best: Object.fromEntries(TRIALS.map(t => [t.id, Math.floor(bestStage * 0.55)])), laurels: 9, weekly: { start: weeklyTrialAt(now).start, id: weeklyTrialAt(now).trial.id, bar: 300, won: 1, best: 402 } };
    s.stats = { ...s.stats, kills: 8.4e6, bossKills: 91000, bossEscapes: 4100, deaths: 1300, maxStage: bestStage, goldEarned: 1e19, itemsCrafted: 1200, barsSmelted: 88000, prestiges: 640, dungeonClears: 2700, titanKills: 42, trialTiers: trialTiers * TRIALS.length, trialsStarted: 90, laurels: 9, ascensions: 4, clanRewards: 12, clanLastHits: 3, killsByMonster: Object.fromEntries([...BESTIARY_NAMES].slice(0, 60).map((n, i) => [n, 900 + i * 40])) };
    s.events = { ...s.events, tokens: 340, milestones: [10, 25], cloaks: {} };
    s.farming.plots = s.farming.plots.map((p, i) => (i < 3 ? { crop: CROPS[i].id, plantedAt: now - HOUR, readyAt: now + HOUR } : p));
    s.agility.built = AGILITY_SLOTS.map((slot, i) => (i < 4 ? slot.obstacles[0].id : null));
    s.agility.levels = AGILITY_SLOTS.map((_, i) => (i < 4 ? 3 : 0));
    s.clanHall = { clan: 7, rooms: Object.fromEntries(HALL_ROOMS.map((r, i) => [r.id, i % 3])), stage: 1, colour: '', emblem: '', cloak: false, lastGift: 37 };
    s.clanBanner = { week: '2026-W47', kills: 2 };
    s.clanResult = { week: '2026-W47', strikes: [2100, 2400, 7300], ms: 30000, at: now - 60000 };
    s.seen = { talents: true, world_map: true, trials: true };
    return written(s, now);
}

/** Fishing and Hunting apart, potions of the old kinds, levels on the pieces, no marks of the later rescales: a save from before. */
function oldShapes(now, name) {
    const s = JSON.parse(new Game(deepHero(now, name, { bestStage: 620, days: 90, tokens: 4.1e6, stars: 0, trialTiers: 5 }), now).serialize(now));
    delete s.chronicle; delete s.forge; delete s.bench; delete s.ascension; delete s.talents; delete s.charms; delete s.clanHall; delete s.clanBanner; delete s.clanResult;
    delete s.dungeonTier; delete s.uniques; delete s.codex; delete s.playtest; delete s.workPotion;
    for (const key of ['attendedMs', 'lastPlaceAt', 'rarityRescale', 'forge', 'bench', 'talents', 'charms', 'hallGift', 'dungeonTier', 'uniques']) delete s.meta[key];
    delete s.prestige.perkReset; delete s.prestige.firstAt; delete s.prestige.runStartedAt;
    delete s.combat.lordsBeaten; delete s.stats.bossFalls;
    s.trials = { active: 'brutes', cleared: { brutes: 3, glass: 1 }, laurels: 2 };
    s.skills.fishing = { xp: xpForLevel(70) };
    s.mastery.fishing = { salmon: 900 };
    s.tools.rod = 3;
    s.stats.actionsBySkill.fishing = 4000;
    s.unlocks.fishing = true;
    s.resources.accuracy_potion = 12; s.resources.fortune_draught = 4; s.resources.scholars_tonic = 2;
    s.combat.potion = 'fortune_draught'; s.combat.potionMs = 60000; s.combat.potionCharges = 9; s.combat.autoRepeat = true;
    s.perks[PERKS[1].id] = 5;
    [...s.inventory.slice(0, 6), ...Object.values(s.equipped)].forEach((item, i) => { if (item) item.upgrade = 1 + (i % 9); });
    return s;
}

/** A save a page of the older game kept writing: what it doesn't know is gone from the top, the copies in `meta` are not. */
function keptByOlderPage(now, name) {
    const s = deepHero(now, name, { bestStage: 900, days: 60, tokens: 9e6, stars: 10, trialTiers: 5 });
    for (const key of ['forge', 'bench', 'talents', 'charms', 'clanHall', 'uniques', 'dungeonTier']) delete s[key];
    return s;
}

/** The original single-file game's save. */
const prototypeSave = (now, name) => ({
    version: 1,
    playerName: name,
    resources: { gold: 54321, copper: 40, iron: 12, normal_wood: 300, oak_wood: 44, raw_rabbit: 9, cooked_rabbit: 7, guam_leaf: 3, accuracy_potion: 2 },
    skills: { mining: { level: 31 }, smithing: { level: 18 }, woodcutting: { level: 12 }, crafting: { level: 4 } },
    combat: { stage: 22, maxStage: 41, highestPrestigeStage: 57, tokens: 63, skillPoints: 2 },
    flags: { prestigeCount: 3, lastSaveTime: now - 400 * DAY },
    shop: { skills: { knight: 2, rogue: 1 } },
    achievements: ['slayer1', 'miner1', 'unknown_one'],
    equipped: { Weapon: { type: 'Weapon', name: '[Rare] Runite Sword (Lv 9)' }, Head: { type: 'Head', name: '[Common] Iron Helm' } },
    inventory: [{ type: 'Ring', name: '[Epic] Sapphire Ring' }, { type: 'Nothing', name: 'a stone' }]
});

/** The save format before the daily crates banked (version 2). */
function versionTwo(now, name) {
    const s = JSON.parse(new Game(null, now - 200 * DAY).serialize(now - 150 * DAY));
    s.version = 2;
    s.hero.name = name;
    s.gold = 77777;
    s.combat.bestStage = 66; s.combat.maxStage = 60; s.combat.stage = 58;
    s.prestige.tokens = 512; s.prestige.count = 6;
    s.skills.cooking.xp = xpForLevel(30);
    s.daily = { lastClaim: now - 151 * DAY };
    return s;
}

/** A save someone edited by hand, badly: sections of the wrong kind, numbers that aren't, keys that must never be read. */
function damagedFields(now, name) {
    const s = midHero(now, name);
    s.skills = 'all of them';
    s.resources = { coal: 'many', copper_ore: -5, iron_ore: 12.75, not_a_resource: 3 };
    s.inventory = [null, 7, { type: 'Nothing' }, s.inventory[0], s.inventory[0]];
    s.equipped = { Weapon: { type: 'Ring' }, Head: 'a hat', Neck: s.equipped.Weapon };
    s.combat = { bestStage: 'deep', stage: -4, maxStage: 1e12, hp: null };
    s.prestige = { tokens: -100, count: 2.5, skillPoints: 'x' };
    s.trials = 'none'; s.stats = []; s.meta = 12; s.daily = null; s.log = 'nothing';
    return s;
}

const POISONED = (now, name) => `{"version":3,"gold":123,"hero":{"name":${JSON.stringify(name)}},"toString":"x","valueOf":{"y":1},"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"meta":{"createdAt":${now - DAY},"savedAt":${now - HOUR},"toLocaleString":"z"},"combat":{"bestStage":12,"valueOf":3},"resources":{"coal":5,"__proto__":{"polluted":true}}}`;

// ---------- the accounts ----------

let serial = 0;
const person = key => ({ id: 904100 + ++serial, username: `fixture_${key}_qzx`, email: `${key}.qzx@fixture.invalid`, token: `eyJfixture.${key}.qzxtoken`, hero: `Hero Qzx ${key}`, clan: `Clan Qzx ${key}` });

/** The numbers the server keeps for an upload (api/index.js POST /api/save): the save's, and the highs measured from `peaks`. */
function uploaded(state, at, peaks) {
    const metrics = powerSummary(state, at);
    metrics.peaks = server.plausibilityFlags(peaks, metrics, at, plausibleAttackDamage, honestClimb).peaks;
    return metrics;
}

/** A row of the users table, for a save uploaded `ago` before `now`, its highs from an upload a month before that. */
function account(p, state, now, { ago = 2 * HOUR, flags = [], optIn = true, climbedFrom = null, text = null } = {}) {
    const lastSaved = now - ago;
    const verifiedAt = lastSaved - 60 * DAY;
    const row = { id: p.id, username: p.username, email: p.email, token: p.token, hero: p.hero, clan: p.clan,
        game_state: text ?? (state === null ? null : JSON.stringify(state)), last_saved: state === null && text === null ? 0 : lastSaved, flags: JSON.stringify(flags),
        leaderboard_opt_in: optIn, metrics: null, email_verified_at: verifiedAt };
    if (state && typeof state === 'object' && text === null) {
        const before = climbedFrom ? { ...powerSummary(state, lastSaved - HOUR), ...climbedFrom } : powerSummary(state, lastSaved - 30 * DAY);
        const first = { ...before, peaks: server.plausibilityFlags(null, before, climbedFrom ? lastSaved - HOUR : lastSaved - 30 * DAY, plausibleAttackDamage, honestClimb).peaks };
        row.metrics = JSON.stringify(uploaded(state, lastSaved, first.peaks));
    }
    return row;
}

/**
 * Every account, as rows. `impossible` adds one whose save the new check flags where the old one passed it (total XP between
 * the two ceilings: the check must catch that); `seed` keeps the dice of the fights and the gear the same from run to run.
 */
export function makeAccounts(now = FIXTURE_NOW, { impossible = false, seed = 20261119 } = {}) {
    rng.setSource(seededRandom(seed));
    serial = 0;
    const p = key => person(key);
    const rows = [];
    const add = (who, make, opts) => rows.push(account(who, typeof make === 'function' ? make(now, who.hero) : make, now, opts));

    // the new and the ordinary
    add(p('newbie'), newHero);
    add(p('midgame'), midHero, { ago: 40 * 60 * 1000 });
    add(p('quiet'), midHero, { ago: 45 * DAY, optIn: false });
    add(p('nosave'), null);

    // the deep, ascended and not
    add(p('deep'), deepHero, { ago: 10 * 60 * 1000 });
    add(p('deeper'), (t, n) => deepHero(t, n, { bestStage: 2600, days: 210, tokens: 8.8e8, stars: 90, trialTiers: 9 }), { ago: 3 * HOUR });
    add(p('deep_noasc'), (t, n) => { const s = deepHero(t, n, { bestStage: 760, days: 70, tokens: 3e7, stars: 0, trialTiers: 6 }); s.ascension = { count: 0, stars: 0, firstAt: 0, lastAt: 0 }; s.stats.ascensions = 0; return s; }, { ago: 26 * HOUR });

    // in the middle of something
    add(p('trial_one'), (t, n) => deepHero(t, n, { bestStage: 480, days: 40, tokens: 2e6, stars: 0, trialTiers: 4, active: ['brutes'] }));
    add(p('trial_pact'), (t, n) => deepHero(t, n, { bestStage: 1250, days: 100, tokens: 6e7, stars: 20, trialTiers: 7, active: ['glass', 'fasting', 'no_camp'] }));
    add(p('in_dungeon'), (t, n) => {
        const s = deepHero(t, n, { bestStage: 700, days: 55, tokens: 8e6, stars: 0, trialTiers: 5 });
        Object.assign(s.combat, { active: true, mode: 'dungeon', dungeon: { id: DUNGEONS[1].id, index: 2, repeat: true, choiceLeft: 0, tier: 1 } });
        return s;
    });
    add(p('at_titan'), (t, n) => {
        const s = deepHero(t, n, { bestStage: 1000, days: 80, tokens: 2e7, stars: 10, trialTiers: 6 });
        Object.assign(s.combat, { active: true, mode: 'titan', enemy: { name: 'Titan', hp: 1e15, maxHp: 4e15 } });
        s.titan.before = { doing: 'work', action: { kind: 'node', skill: 'mining', node: 'copper_ore', progress: 500 } };
        return s;
    });
    add(p('at_clan_boss'), (t, n) => {
        const s = deepHero(t, n, { bestStage: 800, days: 60, tokens: 1e7, stars: 5, trialTiers: 5 });
        Object.assign(s.combat, { active: true, mode: 'clan' });
        s.clanFight = { week: '2026-W47', hp: 4000, maxHp: 9000, strikes: [1000, 1500], before: { doing: 'fight' } };
        return s;
    });

    // saves from before
    add(p('prototype'), prototypeSave, { ago: 300 * DAY, optIn: false });
    add(p('version2'), versionTwo, { ago: 150 * DAY, optIn: false });
    add(p('old_shapes'), oldShapes, { ago: 33 * DAY });
    add(p('older_page'), keptByOlderPage, { ago: 5 * HOUR });

    // damaged by hand
    add(p('damaged'), damagedFields, { ago: 12 * DAY });
    add(p('emptied'), {}, { ago: 20 * DAY, optIn: false });
    { const who = p('poisoned'); rows.push(account(who, null, now, { ago: 8 * DAY, text: POISONED(now, who.hero) })); }
    { const who = p('cut_off'); rows.push(account(who, null, now, { ago: 8 * DAY, text: JSON.stringify(midHero(now, who.hero)).slice(0, 4000) })); }

    // stored flags: of the check before versions (they lapse), the owner's, this version's, one long past, and a broken list
    const flagged = (key, flags) => { const who = p(key); rows.push(account(who, midHero(now, who.hero), now, { flags })); };
    flagged('flag_old', [{ at: now - 3 * DAY, reason: 'best stage grew faster than any play could' }, { at: now - 2 * DAY, reason: 'total XP grew faster than any play could' }]);
    flagged('flag_owner', [{ at: now - 5 * DAY, reason: 'flagged by the owner after review', by: 'owner' }]);
    flagged('flag_now', [{ at: now - DAY, reason: 'total XP beyond any possible save', check: 2 }]);
    flagged('flag_past', [{ at: now - 50 * DAY, reason: 'best stage grew faster than any play could' }]);
    { const who = p('flag_broken'); const row = account(who, midHero(now, who.hero), now); row.flags = 'not a list'; rows.push(row); }

    // climbed far past what an hour allows: on the owner's review list, not flagged
    add(p('fast_climber'), (t, n) => deepHero(t, n, { bestStage: 1500, days: 30, tokens: 4e6, stars: 0, trialTiers: 5 }), { ago: 3 * HOUR, climbedFrom: { bestStage: 200 } });

    if (impossible) {   // past the new ceiling for total XP (eleven skills' worth), under the old one (thirteen's)
        const who = p('over_ceiling');
        add(who, (t, n) => {
            const s = deepHero(t, n, { bestStage: 1100, days: 120, tokens: 9e7, stars: 10, trialTiers: 5 });
            for (const id of SKILL_IDS) s.skills[id].xp = 26_068_862 + 3e6;   // (a skill's XP may hold more than the check counts toward its ceiling)
            return s;
        });
    }
    rng.setSource(Math.random);
    return rows;
}

/** What the report may never hold: every name, address, token and id in the rows, each hero's name and each clan's. */
export const identitiesOf = rows => rows.flatMap(r => [r.username, r.email, r.token, r.hero, r.clan, String(r.id)]);

/** The accounts as a folder of JSON files. Returns the rows. */
export function writeFixtures(dir, now = FIXTURE_NOW, opts = {}) {
    mkdirSync(dir, { recursive: true });
    const rows = makeAccounts(now, opts);
    rows.forEach((row, i) => writeFileSync(join(dir, `${String(i + 1).padStart(3, '0')}.json`), JSON.stringify(row)));
    writeFileSync(join(dir, 'now.txt'), String(now));   // (the moment they were made for: the rehearsal's clock)
    return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const dir = process.argv[2];
    if (!dir) { console.error('usage: node test/helpers/rehearse-fixtures.mjs <folder>'); process.exit(2); }
    console.log(`${writeFixtures(dir).length} accounts in ${dir}`);
    process.exit(0);   // (the API's module leaves nothing running, but says so plainly)
}
