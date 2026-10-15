// The single state object: creation, validation and migration of older saves.
// Everything persisted lives here; derived values (stats, modifiers) are recomputed, never saved.

import { RESOURCES } from '../data/resources.js';
import { POTION_MINUTES, potionsForSlot } from '../data/potions.js';
import { SKILL_IDS, NON_COMBAT_SKILLS } from '../data/skills.js';
import { EQUIP_SLOTS, TYPE_SLOTS, TYPE_ICONS, RARITIES, AFFIXES, MAX_UPGRADE, MAX_GEAR_TIER, codexKey, isCodexKey, GEAR_TIERS, CRAFTING_TYPES, JEWEL_POWER, PITY_MARKS, BAG_UPGRADE, SMITHING_TYPES } from '../data/items.js';
import { generateEquipment, BALANCE } from './formulas.js';
import { PERKS } from '../data/perks.js';
import { CAMP_UPGRADES } from '../data/camp.js';
import { TRIALS, TRIAL_TIERS, trialById, trialTarget, trialTiersCleared } from '../data/trials.js';
import { xpForLevel, levelForXp, MAX_LEVEL } from './xp.js';
import { DAILY_INTERVAL_MS, DAILY_MAX_BANKED } from '../systems/daily.js';
import { DUNGEONS, UNIQUES, DUNGEON_CHOICE_MS, TITAN_COOLDOWN_MS } from '../data/dungeons.js';
import { TOOLS, FORGE_MAX } from '../data/workshop.js';
import { FARMING_PLOTS, cropById } from '../data/farming.js';
import { AGILITY_SLOTS, MAX_OBSTACLE_LEVEL } from '../data/agility.js';
import { MASTERY_SKILLS, MASTERY_XP_DIVISOR, MASTERY_MAX_LEVEL, masteryActions } from '../data/mastery.js';
import { BESTIARY_NAMES, bestiaryStars } from '../data/bestiary.js';
import { heroName } from './text.js';
import { DEFAULT_LOOK, lookById, lookOpen } from '../data/looks.js';
import { capeEarned, festivalCloak, FESTIVAL_CLOAKS } from '../data/capes.js';
import { PLAYTEST_KINDS, PLAYTEST_MAX } from '../systems/playtest.js';
import { CHRONICLE_KINDS, CHRONICLE_MAX } from '../systems/chronicle.js';
import { CLAN_FIGHT_MS } from '../data/social.js';

// The perk reset (the owner, 15 October 2026, after the perks deepened and their prices rose): every save from
// before it gets each perk level back as skill points, once, to spend at today's prices. What a level cost was
// never kept, so the points are the more of the two counts: the levels owned and the points left (a level cost
// one point until 13 October), or all the prestiges and the best stage have paid.
export const PERK_RESET = '2026-10-15';

// The rarity rescale (the owner, 15 October 2026: every piece of gear must matter, a legendary most of all): the
// rarities' qualities grew from 1.00-1.40 to 1.00-2.80 (data/items.js RARITIES). Gear from before it has its attack,
// defence and price raised once by as much as its rarity's quality grew. The mark is kept in `meta`, which a page
// still running the older game keeps as it is, so no piece is ever raised twice.
export const RARITY_RESCALE = '2026-10-15';
const OLD_QUALITY = { common: 1, uncommon: 1.08, rare: 1.16, epic: 1.25, legendary: 1.4 };

// The forge (the endless climb, October 2026; data/workshop.js): the anvil's levels belong to the slots, in
// `forge` ({ level, tier } a slot, the tier the best it has held). A piece from before carries its own levels
// (`upgrade`); on every load the best of each kind, worn or in the bag, gives its levels to the slot and comes
// off plain (the others keep theirs, and their bars come back when salvaged). The levels are copied into
// `meta.forge` too: a page still running the older game deletes `forge`, which it doesn't know, but keeps
// `meta` as it is, so they are read back from there.
const emptyForge = () => Object.fromEntries(SMITHING_TYPES.map(type => [type, { level: 0, tier: 1 }]));

export const SAVE_VERSION = 3;

export function createDefaultState(now = Date.now()) {
    const state = {
        version: SAVE_VERSION,
        meta: { createdAt: now, savedAt: now, playtimeMs: 0, attendedMs: 0, lastActiveAt: now, lastInputAt: now, lastPlaceAt: 0, rarityRescale: RARITY_RESCALE },   // attendedMs: time played with the page in view; lastPlaceAt: attended time when the last place opened (data/unlocks.js)
        gold: 0,
        resources: {},
        inventory: [],
        workPotion: { id: 'none', ms: 0 },   // the skill potion and what is left of its dose, in ms of work
        bagUpgrades: 0,        // +BAG_UPGRADE.slots each, bought with gold
        equipped: {},
        tools: {},
        skills: {},
        mastery: {},           // skill -> action key -> mastery XP (seconds of practice)
        action: null,
        combat: {
            active: false,
            stage: 1,
            maxStage: 1,       // best stage this run (drives prestige tokens)
            bestStage: 1,      // best stage ever (drives start stage after prestige)
            hp: 100,
            enemy: null,
            playerTimer: 0,
            enemyTimer: 0,
            autoEat: 'auto',
            potion: 'none',
            potionMs: 0,       // what is left of the combat potion's dose, in ms of fighting (data/potions.js)
            dungeonPotion: 'none',   // the dungeon run's pick: a dungeon potion, or a combat potion at half its strength
            dungeonPotionMs: 0,      // what is left of its dose, in ms of a run's fighting
            lifestealRoom: 0,  // how much lifesteal may still heal now, under its ceiling (BASE.lifestealPerSecond)
            combo: 0,
            lastComboAt: 0,
            farmMode: false,
            bossTimeLeft: 0,   // ms of fighting left before the current boss escapes
            regroupLeft: 0,    // ms left farming the previous stage after a boss escaped
            mode: 'stages',    // 'stages' | 'dungeon' | 'titan'
            dungeon: null,     // { id, index } while in a dungeon run
            recovering: false, // fallen: resting to full health, then back into the fight by himself
            pity: 0,           // bosses at the frontier without an upgrade since the last (data/items.js PITY_MARKS)
            frontierDrop: false,   // this run's piece from the best stage's depth is found (data/items.js FRONTIER_DROP)
            stallMs: 0,        // time climbing the ladder since this run's last new best stage (the Auto switch waits on it)
            pack: null         // { stage, killed }: the monsters beaten of a pack on new ground (systems/combat.js packSize)
        },
        dungeons: {},          // id -> { clears, fragments }
        titan: { kills: 0, readyAt: 0, attempts: 0, bestPct: 0, before: null },   // before: what the hero was doing when a fight with it began (systems/dungeon.js)
        clanFight: null,       // the clan boss fight under way (systems/clanfight.js): { week, hp, maxHp, strikes, before }
        clanResult: null,      // a clan attack fought and not yet sent to the server: { week, strikes, ms, at }
        pets: {},
        bonfire: { until: 0 },             // wall-clock time the bonfire burns out
        farming: { plots: [] },            // [{ crop, plantedAt, readyAt }] one per plot
        agility: { built: [], levels: [] }, // obstacle id per course slot (or null) and its level
        events: { tokens: 0, day: '', earnedToday: 0, progress: 0, instance: null, instanceEarned: 0, milestones: [], cloaks: {} },   // cloaks: the festival cloaks bought (data/capes.js)
        prestige: { tokens: 0, skillPoints: 0, count: 0, spClaimedStage: 0, runStartedAt: now, firstAt: 0, perkReset: PERK_RESET },   // firstAt: when the first prestige was
        camp: { whetstone: 0, armory: 0, hearth: 0 },
        forge: emptyForge(),
        perks: {},
        achievements: {},
        codex: {},             // "<type>/<tier>" -> true: the gear codex (data/items.js), pages filled
        chronicle: [{ t: now, kind: 'start', id: '' }],   // the hero's firsts, with their dates (systems/chronicle.js)
        unlocks: {},
        seen: {},              // pieces of the interface that have opened (systems/disclosure.js)
        hero: { name: '', look: DEFAULT_LOOK, pet: '', cape: '' },    // the name the player gave the hero ('' is "You"), the look (data/looks.js), the pet at their side ('' for the default), the skill cape worn ('' for the rank's cloak)
        stats: {
            kills: 0, bossKills: 0, bossEscapes: 0, deaths: 0, maxStage: 1, goldEarned: 0, itemsCrafted: 0, barsSmelted: 0,
            minigameWins: 0, gemsFound: 0, legendariesEquipped: 0, skills99: 0, prestiges: 0, essenceFound: 0,
            itemsDropped: 0, itemsSalvaged: 0, itemsAutoSalvaged: 0, reforges: 0, reinforced: 0, barsWorked: 0, pityDrops: 0, mythicsFound: 0,
            dungeonClears: 0, titanKills: 0, petsFound: 0, uniquesFound: 0, uniquesAssembled: 0, potionFragments: 0,
            fishCaught: 0, baitUsed: 0, logsBurnt: 0, cropsHarvested: 0, obstaclesBuilt: 0, obstacleUpgrades: 0, courseRuns: 0, goldSpent: 0,
            clanRewards: 0, clanLastHits: 0,
            masteryLevels: 0, masteryBest: 1, masteries99: 0, ingredientsSaved: 0, campLevels: 0,
            actionsBySkill: {},
            killsByMonster: {}, bestiaryStars: 0,  // the bestiary (data/bestiary.js): defeats per kind, and its stars
            gildedKills: 0,
            petPats: 0, greatCrates: 0, recoveries: 0, // for the secret medals: pats for the pet, great crates opened, falls got up from
            strikes: 0,            // the player's own strikes on monsters (systems/guide.js)
            codexFound: 0,         // pages of the gear codex filled
            // the Trials' and the Ascension's counts (medals read them: a count without a default here was
            // dropped on every load, so Trial Master asked for twenty tiers in one sitting)
            trialTiers: 0, trialsStarted: 0, laurels: 0, ascensions: 0, masteryCheckpoints: 0,
            bossFalls: 0           // bosses beaten at the stages for their full payout (the first leaves armour: systems/combat.js)
        },
        minigame: {},
        daily: { banked: 1, nextAt: now + DAILY_INTERVAL_MS, claimed: 0 },
        log: [],
        settings: { devUnlockAll: false, numberFormat: 'short', reducedMotion: false, sound: true, volume: 1, cloudSync: true, autoSalvage: 'common', forceEvent: null, autoPrestige: false, playtestLog: false },
        playtest: [],          // the playtest log, when the player turns it on (systems/playtest.js)
        trials: { active: null, cleared: {}, best: {}, laurels: 0, weekly: null },   // the run's Trial, tiers cleared, best stage in each, the week's laurel (data/trials.js)
        ascension: { count: 0, stars: 0, firstAt: 0, lastAt: 0 },   // Ascensions made, the Stars they paid, the first and the last (data/ascension.js)
        idCounter: 1
    };
    for (const id of Object.keys(RESOURCES)) state.resources[id] = 0;
    for (const slot of EQUIP_SLOTS) state.equipped[slot] = null;
    for (const id of SKILL_IDS) state.skills[id] = { xp: 0 };
    for (const id of SKILL_IDS) state.stats.actionsBySkill[id] = 0;
    for (const id of MASTERY_SKILLS) state.mastery[id] = {};
    for (const perk of PERKS) state.perks[perk.id] = 0;
    for (const d of DUNGEONS) state.dungeons[d.id] = { clears: 0, fragments: 0 };
    for (const toolId of Object.keys(TOOLS)) state.tools[toolId] = 0;
    state.farming.plots = FARMING_PLOTS.map(() => ({ crop: null, plantedAt: 0, readyAt: 0 }));
    state.agility.built = AGILITY_SLOTS.map(() => null);
    state.agility.levels = AGILITY_SLOTS.map(() => 0);
    // gainId/gainQty/gainXp: what the skill made while the boost ran, so its end can say what the boost added
    for (const id of NON_COMBAT_SKILLS) state.minigame[id] = { boostUntil: 0, mult: 0, streak: 0, challenge: null, nextOpportunityAt: 0, opportunityUntil: 0, gainId: '', gainQty: 0, gainXp: 0 };
    return state;
}

/**
 * Bring any loaded object up to the current version and make sure every expected key exists.
 * Returns a fresh state object; never mutates the input.
 */
export function migrateState(raw, now = Date.now()) {
    if (!raw || typeof raw !== 'object') return createDefaultState(now);
    let data = cleanCopy(raw);
    // Each old shape is known by its own marks, not by a version number a damaged save may have lost
    // (a v3 save with no version used to be read as the prototype, and lost nearly everything).
    if (isPrototypeSave(data)) data = migrateV1(data, now);
    else if (Number(data.version) === 2 || (isPlainObject(data.daily) && 'lastClaim' in data.daily && !('nextAt' in data.daily))) data = migrateV2(data, now);
    return normalise(data, now);
}

// Keys a save may never carry. An own "toString" or "valueOf" that isn't a function (all a JSON text can
// hold) makes the value throw wherever the game reads it as a number or as text: a save edited by hand,
// or pushed to the server, could then stop the game loading, or wipe the server's record of the
// hero's highs. The others would reach an object's prototype.
const POISON_KEYS = new Set(['toString', 'valueOf', 'toLocaleString', '__proto__', 'constructor', 'prototype']);

/** A deep copy of a loaded save without those keys (and as plain data: what JSON can hold). */
function cleanCopy(raw) {
    return JSON.parse(JSON.stringify(raw, (key, value) => (POISON_KEYS.has(key) ? undefined : value)));
}

/**
 * The original single-file game's save: per-skill levels, its flags, or its own resource ids (gold
 * among the resources, "copper", "normal_wood"), and none of this game's meta.
 */
function isPrototypeSave(data) {
    if (isPlainObject(data.meta) || Number(data.version) >= 2) return false;
    const skills = isPlainObject(data.skills) ? Object.values(data.skills) : [];
    const oldIds = isPlainObject(data.resources) && Object.keys(data.resources).some(id => id === 'gold' || (Object.hasOwn(V1_RESOURCE_MAP, id) && !Object.hasOwn(RESOURCES, id)));
    return isPlainObject(data.flags) || skills.some(s => isPlainObject(s) && 'level' in s) || oldIds || Number(data.version) === 1;
}

// v2 -> v3: the daily reward became a bank of up to three crates.
function migrateV2(data, now) {
    const last = Number(data.daily?.lastClaim) || 0;
    // v2 held at most one waiting crate: carry that one over, and start the clock for the next now.
    const waiting = last && now - last >= DAILY_INTERVAL_MS;
    const daily = last
        ? { banked: waiting ? 1 : 0, nextAt: waiting ? now + DAILY_INTERVAL_MS : last + DAILY_INTERVAL_MS, claimed: 0 }
        : { banked: 1, nextAt: now + DAILY_INTERVAL_MS, claimed: 0 };
    // The player left at savedAt, so offline progress on this first v3 load counts as idle (focus).
    const meta = { ...(data.meta || {}), lastInputAt: data.meta?.savedAt ?? now };
    return { ...data, version: 3, daily, meta };
}

// v1 = the original single-file game (localStorage key "fantasyIdleSaveLocal").
// Levels were stored per-level with a 1.5x curve and resources had other ids. Its forged and crafted
// gear is made again here (by type, metal or gem, and rarity, read from the name).
const V1_RESOURCE_MAP = {
    copper: 'copper_ore', iron: 'iron_ore', coal: 'coal', silver_ore: 'silver_ore', gold_ore: 'gold_ore',
    mithril: 'mithril_ore', adamant: 'adamant_ore', runite: 'runite_ore',
    copper_bar: 'copper_bar', iron_bar: 'iron_bar', silver_bar: 'silver_bar', gold_bar: 'gold_bar',
    mithril_bar: 'mithril_bar', adamant_bar: 'adamant_bar', runite_bar: 'runite_bar',
    amethyst: 'amethyst', topaz: 'topaz', sapphire: 'sapphire', emerald: 'emerald', ruby: 'ruby', diamond: 'diamond',
    normal_wood: 'normal_log', oak_wood: 'oak_log', willow_wood: 'willow_log', maple_wood: 'maple_log', yew_wood: 'yew_log', magic_wood: 'magic_log',
    raw_rabbit: 'raw_rabbit', raw_fox: 'raw_fox', raw_boar: 'raw_boar', raw_deer: 'raw_deer', raw_bear: 'raw_bear', raw_drake: 'raw_drake', raw_dragon: 'raw_dragon',
    cooked_rabbit: 'cooked_rabbit', cooked_fox: 'cooked_fox', cooked_boar: 'cooked_boar', cooked_deer: 'cooked_deer', cooked_bear: 'cooked_bear', cooked_drake: 'cooked_drake', cooked_dragon: 'cooked_dragon',
    guam_leaf: 'guam_leaf', marrentill_leaf: 'marrentill_leaf', tarromin_leaf: 'tarromin_leaf', harralander_leaf: 'harralander_leaf',
    accuracy_potion: 'combat_potion_1', defense_potion: 'combat_potion_2', evasion_potion: 'combat_potion_3', health_potion: 'combat_potion_4'
};

function migrateV1(old, now) {
    const state = createDefaultState(now);
    const res = old.resources || {};
    for (const [oldId, newId] of Object.entries(V1_RESOURCE_MAP)) {
        const qty = Number(res[oldId]);
        if (qty > 0 && state.resources[newId] !== undefined) state.resources[newId] += Math.floor(qty);
    }
    state.gold = Math.max(0, Math.floor(Number(res.gold) || 0));
    for (const id of NON_COMBAT_SKILLS) {
        const level = Number(old.skills?.[id]?.level) || 1;
        state.skills[id].xp = xpForLevel(level);
    }
    for (const id of ['smithing', 'crafting']) {
        const level = Number(old.skills?.[id]?.level) || 1;
        state.skills[id].xp = xpForLevel(level);
    }
    const combat = old.combat || {};
    state.combat.maxStage = Math.max(1, Math.floor(Number(combat.maxStage) || 1));
    state.combat.bestStage = Math.max(state.combat.maxStage, Math.floor(Number(combat.highestPrestigeStage) || 1));
    state.combat.stage = Math.min(state.combat.maxStage, Math.max(1, Math.floor(Number(combat.stage) || 1)));
    state.prestige.tokens = Math.max(0, Math.floor(Number(combat.tokens) || 0));
    state.prestige.skillPoints = Math.max(0, Math.floor(Number(combat.skillPoints) || 0));
    state.prestige.count = Math.max(0, Math.floor(Number(old.flags?.prestigeCount) || 0));
    state.stats.prestiges = state.prestige.count;
    state.stats.maxStage = state.combat.bestStage;
    const oldSkills = old.shop?.skills || {};
    for (const id of ['knight', 'warlord', 'rogue']) state.perks[id] = Math.max(0, Math.floor(Number(oldSkills[id]) || 0));
    if (Array.isArray(old.achievements)) {
        const map = { slayer1: 'slayer_1', miner1: 'excavator', prestige1: 'eternity' };
        for (const id of old.achievements) if (map[id]) state.achievements[map[id]] = true;
    }
    // The prototype's gear: "[Rare] Runite Sword (Lv 9)" becomes a rare Runite Sword of this game, worn where it was.
    const remake = it => {
        if (!isPlainObject(it) || !TYPE_SLOTS[it.type]) return null;
        const name = String(it.name || '');
        const rarity = RARITIES.find(r => name.toLowerCase().includes(`[${r.name.toLowerCase()}]`)) || RARITIES[0];
        const jewel = CRAFTING_TYPES.includes(it.type);
        const tier = GEAR_TIERS.find(t => new RegExp(`\\b${jewel ? t.jewel : t.name}\\b`, 'i').test(name))?.tier || 1;
        const g = GEAR_TIERS[tier - 1];
        return generateEquipment({ type: it.type, tier, power: jewel ? g.power * JEWEL_POWER : g.power, materialName: jewel ? null : g.name, gemName: jewel ? g.jewel : null, rarity, source: 'crafted' }, state.idCounter++);
    };
    for (const slot of EQUIP_SLOTS) {
        const item = remake(old.equipped?.[slot]);
        if (item && TYPE_SLOTS[item.type].includes(slot)) state.equipped[slot] = item;
    }
    state.inventory = (Array.isArray(old.inventory) ? old.inventory : []).map(remake).filter(Boolean);
    state.meta.savedAt = Number(old.flags?.lastSaveTime) || now;
    state.meta.createdAt = state.meta.savedAt;
    state.log.push({ t: now, type: 'system', text: 'Save migrated from the original prototype. Your resources, skill levels, gear, tokens and best stage carried over.' });
    return state;
}

const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));
const ITEM_ID_CAP = 2 ** 31;

/**
 * Timers that point further ahead than they ever can, put back in reach of `now`: a save made with the
 * clock set ahead, a device whose clock disagrees, or the clock turned back while playing. Without
 * this the crate, the Titan, a planted crop and a strike could wait weeks.
 */
export function clampTimers(state, now) {
    const upTo = (v, max) => (Number.isFinite(v) ? Math.min(v, max) : v);
    if (isPlainObject(state.daily)) state.daily.nextAt = upTo(state.daily.nextAt, now + DAILY_INTERVAL_MS);
    if (isPlainObject(state.titan)) state.titan.readyAt = upTo(state.titan.readyAt, now + TITAN_COOLDOWN_MS);
    for (const plot of state.farming?.plots || []) {
        if (!isPlainObject(plot) || !plot.crop) continue;
        plot.plantedAt = upTo(plot.plantedAt, now);
        plot.readyAt = upTo(plot.readyAt, now + (cropById(plot.crop)?.growMs || 0));
    }
    if (isPlainObject(state.bonfire)) state.bonfire.until = upTo(state.bonfire.until, now + 60 * 60 * 1000);   // BASE.bonfireMaxMs
    if (isPlainObject(state.ascension)) state.ascension.lastAt = upTo(state.ascension.lastAt, now);   // the Ascension's day of rest from it
    if (isPlainObject(state.prestige)) {   // the run's ten minutes and the Auto switch's two days count from these
        state.prestige.runStartedAt = upTo(state.prestige.runStartedAt, now);
        state.prestige.firstAt = upTo(state.prestige.firstAt, now);
    }
    if (isPlainObject(state.combat)) {
        state.combat.lastClickAt = upTo(state.combat.lastClickAt, now);
        state.combat.lastComboAt = upTo(state.combat.lastComboAt, now);
    }
    const mgMax = BALANCE.minigame;
    for (const mg of Object.values(state.minigame || {})) {
        if (!isPlainObject(mg)) continue;
        mg.nextOpportunityAt = upTo(mg.nextOpportunityAt, now + mgMax.opportunityEveryMs[1]);
        mg.opportunityUntil = upTo(mg.opportunityUntil, now + mgMax.opportunityWindowMs);
        mg.boostUntil = upTo(mg.boostUntil, now + (mgMax.boostMs + 4 * mgMax.streakMs) * 2);
        if (mg.challenge && !(mg.challenge.expiresAt <= now + 10000)) mg.challenge = null;
    }
    if (isPlainObject(state.meta)) {
        state.meta.lastInputAt = upTo(state.meta.lastInputAt, now);
        state.meta.lastActiveAt = upTo(state.meta.lastActiveAt, now);
        state.meta.attendedMs = Math.max(0, finite(state.meta.attendedMs));
        state.meta.lastPlaceAt = Math.max(0, Math.min(state.meta.attendedMs, finite(state.meta.lastPlaceAt)));
    }
    return state;
}
const UNIQUE_COLOR = '#f97316';
// Every stat an item's affix may name: the random affixes and the uniques' fixed ones.
const AFFIX_STATS = new Set([...AFFIXES.map(a => a.stat), ...Object.values(UNIQUES).flatMap(u => u.affixes.map(a => a.stat))]);
// No affix rolls above about +35% (a unique's best); +100% is far beyond any, and keeps a hand-made one sane.
const AFFIX_MAX = 1;
const finite = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const intIn = (v, lo, hi, fallback) => Math.max(lo, Math.min(hi, Math.floor(finite(v, fallback))));
// A time a Date can hold (±8.64e15 ms): a bigger one throws when it is written out as a date.
const isDateTime = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 8.64e15;
// Text from a save: a string as it is, a number as its digits, anything else as nothing.
const text = v => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
// The deepest stage a save may hold: past about 10,000 a monster's health is more than a number holds,
// and the fight would never end (core/formulas.js enemyForStage). No hero comes near it.
export const MAX_STAGE = 10000;
// Titans beaten: the next one stands at titanStage(kills + 1), which must stay below MAX_STAGE.
const MAX_TITAN_KILLS = 1900;

/**
 * A piece of gear from a save, rebuilt from what the game knows: its type, tier, rarity, colour and
 * icon come from the tables, numbers must be numbers, and anything else is dropped. Returns null
 * for something that isn't an item. `ids` keeps ids unique (the UI finds items by id).
 */
function sanitizeItem(raw, ids, nextId) {
    if (!isPlainObject(raw) || typeof raw.type !== 'string' || !Object.hasOwn(TYPE_SLOTS, raw.type)) return null;
    let id = raw.id;
    if (!Number.isSafeInteger(id) || id <= 0 || id > ITEM_ID_CAP || ids.has(id)) id = nextId();
    ids.add(id);
    const rarity = (typeof raw.rarity === 'string' && Object.hasOwn(RARITY_BY_ID, raw.rarity) && RARITY_BY_ID[raw.rarity]) || RARITIES[0];
    const uniqueId = typeof raw.uniqueId === 'string' && Object.hasOwn(UNIQUES, raw.uniqueId) ? raw.uniqueId : undefined;
    const source = ['crafted', 'drop', 'unique'].includes(raw.source) ? raw.source : 'drop';
    // an affix's value as big as any piece can roll (a bigger one, or one below nothing, is hand-made)
    const affixes = (Array.isArray(raw.affixes) ? raw.affixes : [])
        .filter(a => isPlainObject(a) && AFFIX_STATS.has(a.stat) && Number.isFinite(a.value))
        .slice(0, 6)
        .map(a => ({ id: (text(a.id) || a.stat).slice(0, 32), name: (text(a.name) || a.stat).slice(0, 40), stat: a.stat, value: Math.max(0, Math.min(AFFIX_MAX, a.value)), format: 'pct' }));
    let materials = null;
    if (isPlainObject(raw.materials)) {
        materials = {};
        for (const [resId, qty] of Object.entries(raw.materials)) if (Object.hasOwn(RESOURCES, resId) && finite(qty) > 0) materials[resId] = finite(qty);
    }
    const item = {
        id, type: raw.type, tier: intIn(raw.tier, 1, MAX_GEAR_TIER, 1),
        name: text(raw.name).slice(0, 80),
        rarity: rarity.id, color: uniqueId ? UNIQUE_COLOR : rarity.color, icon: TYPE_ICONS[raw.type],
        atk: Math.max(0, finite(raw.atk)), def: Math.max(0, finite(raw.def)),
        affixes, upgrade: intIn(raw.upgrade, 0, MAX_UPGRADE, 0), reforges: intIn(raw.reforges, 0, 1e6, 0),
        locked: raw.locked === true, value: Math.max(0, finite(raw.value)), source, materials
    };
    if (uniqueId) item.uniqueId = uniqueId;
    const barsIn = Math.floor(finite(raw.barsIn));   // bars of its own metal spent reinforcing it at the anvil (systems/anvil.js)
    if (barsIn > 0) item.barsIn = Math.min(barsIn, 1e7);
    // other metals' bars a refit brought to it, and the essence the anvil took (data/workshop.js carryAnvilWork)
    if (isPlainObject(raw.barsCarried)) {
        const carried = {};
        for (const [bar, qty] of Object.entries(raw.barsCarried)) if (RESOURCES[bar]?.category === 'bar' && finite(qty) >= 1) carried[bar] = Math.min(Math.floor(qty), 1e7);
        if (Object.keys(carried).length) item.barsCarried = carried;
    }
    if (finite(raw.essenceIn, -1) >= 0) item.essenceIn = Math.min(Math.floor(raw.essenceIn), 1e9);
    if (Number.isSafeInteger(raw.depth) && raw.depth > 0) item.depth = raw.depth;
    return item;
}

/** The work under way, from a save: what it names as plain values, its progress in ms, or null. */
function cleanAction(raw) {
    if (!isPlainObject(raw) || typeof raw.kind !== 'string') return null;
    const action = {};
    for (const [key, value] of Object.entries(raw)) if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) action[key] = value;
    action.progress = Math.max(0, finite(raw.progress));   // a progress that wasn't a number never finished
    action.stalled = raw.stalled === true;
    return action;
}

const LOG_TYPES = new Set(['info', 'system', 'level', 'achievement', 'unlock', 'loot', 'craft', 'death', 'prestige', 'boss', 'combat', 'daily', 'minigame']);

/** Fill any missing keys from the default state and clamp obviously broken numbers. */
/**
 * Fishing joined Hunting (October 2026, the owner: the two were mirror images, seven spots each at the same
 * levels). A save from before keeps the higher of the two levels, both skills' mastery and counts, the
 * better of its bow and rod (the bow serves the river now), its cape, and an action at a fishing spot goes
 * on at Hunting's river; Fishing's tab, unlock and mini-game clock go with it.
 */
function foldFishingIntoHunting(state) {
    const fish = state.skills?.fishing;
    if (isPlainObject(fish)) {
        const xp = Math.max(finite(Number(fish.xp)), finite(Number(state.skills.hunting?.xp)));
        state.skills.hunting = { ...(isPlainObject(state.skills.hunting) ? state.skills.hunting : {}), xp };
    }
    if (isPlainObject(state.mastery?.fishing)) state.mastery.hunting = { ...(isPlainObject(state.mastery.hunting) ? state.mastery.hunting : {}), ...state.mastery.fishing };
    const by = state.stats?.actionsBySkill;
    if (isPlainObject(by) && 'fishing' in by) { by.hunting = finite(Number(by.hunting)) + finite(Number(by.fishing)); delete by.fishing; }
    if (isPlainObject(state.tools) && 'rod' in state.tools) state.tools.bow = Math.max(finite(Number(state.tools.bow)), finite(Number(state.tools.rod)));
    if (isPlainObject(state.action) && state.action.skill === 'fishing') state.action.skill = 'hunting';
    if (isPlainObject(state.hero) && state.hero.cape === 'fishing') state.hero.cape = 'hunting';
    if (isPlainObject(state.unlocks) && state.unlocks.fishing === true) {   // Fishing was open: so is the river
        if (isPlainObject(state.seen)) state.seen.river = true;
        delete state.unlocks.fishing;
    }
}

// The seven potions before the three kinds that grow (October 2026), each as the tier of its herb (data/potions.js).
const OLD_POTIONS = {
    accuracy_potion: 'combat_potion_1', defense_potion: 'combat_potion_2', evasion_potion: 'combat_potion_3', health_potion: 'combat_potion_4',
    fortune_draught: 'dungeon_potion_3', gatherers_draught: 'skill_potion_1', scholars_tonic: 'skill_potion_2'
};

/** A save's bottles of the old potions become the new ones, and so do its picks (the Fortune Draught: the dungeon's). */
function convertOldPotions(state) {
    const r = state.resources;
    if (isPlainObject(r)) {
        for (const [old, now] of Object.entries(OLD_POTIONS)) {
            const n = Math.floor(finite(Number(r[old])));
            if (n > 0) r[now] = Math.floor(finite(Number(r[now]))) + n;
            delete r[old];
        }
    }
    const c = state.combat;
    if (isPlainObject(c) && Object.hasOwn(OLD_POTIONS, c.potion)) {
        const now = OLD_POTIONS[c.potion];
        if (now.startsWith('dungeon')) { c.dungeonPotion = now; c.dungeonPotionMs = finite(Number(c.potionMs)); c.potion = 'none'; c.potionMs = 0; }
        else c.potion = now;
    }
    if (isPlainObject(state.workPotion) && Object.hasOwn(OLD_POTIONS, state.workPotion.id)) state.workPotion.id = OLD_POTIONS[state.workPotion.id];
}

function resetPerks(state, now) {
    const pr = state.prestige;
    const levels = PERKS.reduce((n, p) => n + (state.perks[p.id] || 0), 0);
    if (levels > 0) {
        const paid = pr.count * BALANCE.prestige.spPerPrestige + Math.floor(pr.spClaimedStage / BALANCE.prestige.spStageStep);
        const back = Math.max(pr.skillPoints + levels, paid) - pr.skillPoints;
        pr.skillPoints += back;
        for (const p of PERKS) state.perks[p.id] = 0;
        state.log.push({ t: now, type: 'system', text: `Perks reset: every level is back as skill points (+${back}), to spend at today's prices.` });
    }
    pr.perkReset = PERK_RESET;
}

/** The forge's slots as whole numbers in range, the levels kept in `meta.forge` read back, and old pieces' levels folded in (above). */
function sanitizeForge(state, data, now) {
    const saved = isPlainObject(data?.forge) ? data.forge : {};
    const mirror = isPlainObject(data?.meta?.forge) ? data.meta.forge : {};
    state.forge = emptyForge();
    let moved = 0;
    for (const type of SMITHING_TYPES) {
        const f = state.forge[type];
        const s = isPlainObject(saved[type]) ? saved[type] : {};
        f.level = Math.max(intIn(s.level, 0, FORGE_MAX, 0), intIn(mirror[type], 0, FORGE_MAX, 0));
        f.tier = intIn(s.tier, 1, MAX_GEAR_TIER, 1);
        const worn = state.equipped[type];
        if (worn) f.tier = Math.max(f.tier, worn.tier);
        const best = [worn, ...state.inventory.filter(i => i.type === type)].filter(i => i && i.upgrade > 0).sort((a, b) => b.upgrade - a.upgrade)[0];
        if (!best) continue;
        if (best.upgrade > f.level) { f.level = best.upgrade; f.tier = Math.max(f.tier, best.tier); }
        best.upgrade = 0;
        delete best.barsIn;
        delete best.barsCarried;
        delete best.essenceIn;
        moved++;
    }
    if (moved) state.log.push({ t: now, type: 'system', text: 'The anvil\'s levels belong to the slots now, with no top: every weapon and piece of armour you wear has its slot\'s levels.' });
    state.meta.forge = Object.fromEntries(SMITHING_TYPES.map(type => [type, state.forge[type].level]));
}

function rescaleRarity(state, now) {
    let raised = 0;
    for (const item of [...Object.values(state.equipped), ...state.inventory]) {
        const k = item && OLD_QUALITY[item.rarity] ? RARITY_BY_ID[item.rarity].quality / OLD_QUALITY[item.rarity] : 1;   // (nothing above legendary was from before)
        if (k === 1) continue;
        item.atk = Math.round(item.atk * k);
        item.def = Math.round(item.def * k);
        item.value = Math.round(item.value * k);
        raised++;
    }
    if (raised) state.log.push({ t: now, type: 'system', text: `Rarity counts for more now: a legendary piece has ${RARITY_BY_ID.legendary.quality} times a common one's stats (it was ${OLD_QUALITY.legendary}). ${raised} of your pieces grew.` });
    state.meta.rarityRescale = RARITY_RESCALE;
}

function normalise(data, now) {
    const base = createDefaultState(now);
    const state = mergeInto(base, data);
    foldFishingIntoHunting(state);   // before Fishing's own keys are dropped with the unknown ones
    convertOldPotions(state);        // and the old potions' ids with the unknown resources
    state.version = SAVE_VERSION;
    // Attended time began with the paced places: a save from before it counts all its play as attended
    // (the default 0 is merged in first, so this reads the save itself).
    const attended = data?.meta?.attendedMs;
    if (!(typeof attended === 'number' && Number.isFinite(attended) && attended >= 0)) state.meta.attendedMs = Math.max(0, finite(state.meta.playtimeMs));
    // Top-level keys and counts the game doesn't know (an older version's, or anything added by hand) are dropped.
    const known = createDefaultState(now);
    for (const key of Object.keys(state)) if (!Object.hasOwn(known, key)) delete state[key];
    for (const key of Object.keys(state.stats)) if (!Object.hasOwn(known.stats, key)) delete state.stats[key];
    // every count is a number of things done: never below nothing
    for (const [key, value] of Object.entries(known.stats)) if (typeof value === 'number') state.stats[key] = Math.max(0, finite(state.stats[key]));
    // a save from before the bosses' falls were counted: its boss kills stand for them (its first armour came)
    if (typeof data?.stats?.bossFalls !== 'number') state.stats.bossFalls = state.stats.bossKills;
    for (const id of Object.keys(RESOURCES)) {
        const v = Number(state.resources[id]);
        state.resources[id] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    }
    for (const id of SKILL_IDS) {
        if (!state.skills[id] || !Number.isFinite(Number(state.skills[id].xp))) state.skills[id] = { xp: 0 };
        state.skills[id].xp = Math.max(0, Number(state.skills[id].xp));
    }
    // Mastery: keep known actions only, and make the mastery stats match it.
    const savedMastery = state.mastery && typeof state.mastery === 'object' ? state.mastery : {};
    state.mastery = {};
    let masteryLevels = 0, masteryBest = 1, masteries99 = 0;
    for (const skillId of MASTERY_SKILLS) {
        state.mastery[skillId] = {};
        for (const a of masteryActions(skillId)) {
            const v = Number(savedMastery[skillId]?.[a.key]);
            if (!(Number.isFinite(v) && v > 0)) continue;
            state.mastery[skillId][a.key] = v;
            const level = levelForXp(v * MASTERY_XP_DIVISOR);
            masteryLevels += level - 1;
            masteryBest = Math.max(masteryBest, level);
            if (level >= MASTERY_MAX_LEVEL) masteries99++;
        }
    }
    Object.assign(state.stats, { masteryLevels, masteryBest, masteries99 });
    // Gear: rebuilt item by item (worn items first, so they keep their ids).
    // Ids stay far below where a double stops counting (at 2^53 the loop below used to spin forever).
    state.idCounter = intIn(state.idCounter, 1, ITEM_ID_CAP, 1);
    const ids = new Set();
    const nextId = () => {
        for (;;) {
            if (state.idCounter > ITEM_ID_CAP) state.idCounter = 1;   // round again: a bag never holds two billion items
            if (!ids.has(state.idCounter)) return state.idCounter++;
            state.idCounter++;
        }
    };
    for (const slot of EQUIP_SLOTS) {
        const item = sanitizeItem(state.equipped[slot], ids, nextId);
        state.equipped[slot] = item && TYPE_SLOTS[item.type].includes(slot) ? item : null;
    }
    state.inventory = (Array.isArray(state.inventory) ? state.inventory : []).map(i => sanitizeItem(i, ids, nextId)).filter(Boolean);
    if (data?.meta?.rarityRescale !== RARITY_RESCALE) rescaleRarity(state, now);   // (read from the save itself: the default is the new mark)
    sanitizeForge(state, data, now);
    state.bagUpgrades = Math.max(0, Math.min(BAG_UPGRADE.max, Math.floor(finite(state.bagUpgrades))));
    for (const id of ids) if (id >= state.idCounter) state.idCounter = id + 1;
    state.log = (Array.isArray(state.log) ? state.log : [])
        .filter(e => isPlainObject(e) && typeof e.text === 'string')
        .slice(-60)
        .map(e => ({ t: isDateTime(e.t) ? e.t : now, type: LOG_TYPES.has(e.type) ? e.type : 'info', text: e.text.slice(0, 300) }));
    for (const key of Object.keys(state.stats.actionsBySkill)) if (!SKILL_IDS.includes(key)) delete state.stats.actionsBySkill[key];
    for (const id of SKILL_IDS) state.stats.actionsBySkill[id] = Math.max(0, finite(state.stats.actionsBySkill[id]));
    // The bestiary: known kinds only, whole numbers; its stars follow from the counts.
    const kills = isPlainObject(state.stats.killsByMonster) ? state.stats.killsByMonster : {};
    state.stats.killsByMonster = {};
    for (const [name, n] of Object.entries(kills)) {
        const v = Math.floor(finite(n));
        if (BESTIARY_NAMES.has(name) && v > 0) state.stats.killsByMonster[name] = v;
    }
    state.stats.bestiaryStars = bestiaryStars(state.stats.killsByMonster);
    for (const group of ['resources', 'skills', 'perks', 'tools', 'camp', 'dungeons', 'minigame']) {
        for (const key of Object.keys(state[group])) if (!Object.hasOwn(known[group], key)) delete state[group][key];
    }
    for (const group of ['achievements', 'unlocks', 'pets', 'seen']) {
        const saved = state[group];
        state[group] = {};
        for (const [key, value] of Object.entries(saved)) if (value === true && /^[a-z0-9_]{1,40}$/.test(key)) state[group][key] = true;
    }
    // The chronicle: known kinds, with times a date can hold; a save from before it begins at the save's creation.
    const story = Array.isArray(data?.chronicle) ? data.chronicle : [{ t: finite(state.meta.createdAt, now), kind: 'start', id: '' }];
    state.chronicle = story.filter(e => isPlainObject(e) && CHRONICLE_KINDS.has(e.kind) && isDateTime(e.t))
        .slice(-CHRONICLE_MAX).map(e => ({ t: e.t, kind: e.kind, id: text(e.id).slice(0, 40) }));
    // The gear codex: known pages only, and every piece worn or carried counts (saves from before it).
    const pages = isPlainObject(state.codex) ? state.codex : {};
    state.codex = {};
    for (const [key, value] of Object.entries(pages)) if (value === true && isCodexKey(key)) state.codex[key] = true;
    for (const item of [...state.inventory, ...Object.values(state.equipped)]) if (item?.type && isCodexKey(codexKey(item))) state.codex[codexKey(item)] = true;
    state.stats.codexFound = Object.keys(state.codex).length;
    if (!['auto', 'none'].includes(state.combat.autoEat) && !(RESOURCES[state.combat.autoEat]?.heal > 0)) state.combat.autoEat = 'auto';
    // each pick holds what its place takes (data/potions.js potionsForSlot), or none
    const fits = (slot, id) => id === 'none' || potionsForSlot(slot).includes(id);
    if (!fits('combat', state.combat.potion)) state.combat.potion = 'none';
    if (!fits('dungeon', state.combat.dungeonPotion)) state.combat.dungeonPotion = 'none';
    if (!isPlainObject(state.workPotion)) state.workPotion = { id: 'none', ms: 0 };
    if (!fits('skill', state.workPotion.id)) state.workPotion.id = 'none';
    // a dose is never longer than the longest there is (the Alchemist medal's included); a save from the
    // potions that counted attacks starts with none working, and drinks the next as it fights
    const maxDose = POTION_MINUTES * 60000 * 2;
    state.workPotion.ms = Math.max(0, Math.min(maxDose, finite(state.workPotion.ms)));
    state.action = cleanAction(state.action);
    if (typeof state.settings.forceEvent !== 'string') state.settings.forceEvent = null;
    const volume = Number(state.settings.volume);
    state.settings.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
    const hero = isPlainObject(state.hero) ? state.hero : {};
    const look = lookById(hero.look);
    state.hero = { name: heroName(hero.name || ''), look: lookOpen(state, look) ? look.id : DEFAULT_LOOK, pet: typeof hero.pet === 'string' && state.pets[hero.pet] ? hero.pet : '',
        cape: typeof hero.cape === 'string' && capeEarned(state, hero.cape) ? hero.cape : '' };   // a skill's cape worn (data/capes.js), '' for the rank's cloak
    if (!Array.isArray(state.log)) state.log = [];
    state.gold = Math.max(0, Number(state.gold) || 0);
    state.combat.enemy = null; // always respawned on load
    state.combat.hp = Math.max(1, Number(state.combat.hp) || 100);
    state.combat.stage = intIn(state.combat.stage, 1, MAX_STAGE, 1);
    state.combat.maxStage = Math.max(state.combat.stage, intIn(state.combat.maxStage, 1, MAX_STAGE, 1));
    state.combat.bestStage = Math.max(state.combat.maxStage, intIn(state.combat.bestStage, 1, MAX_STAGE, 1));
    state.stats.maxStage = Math.min(MAX_STAGE, Math.max(1, state.stats.maxStage));
    state.combat.combo = 0;
    // the fight's clocks within what they can be: a boss's time, the minute of regrouping, the swings
    state.combat.bossTimeLeft = Math.max(0, Math.min(BALANCE.combat.bossTimeMs, finite(state.combat.bossTimeLeft)));
    state.combat.regroupLeft = Math.max(0, Math.min(BALANCE.combat.regroupMs, finite(state.combat.regroupLeft)));
    state.combat.playerTimer = Math.max(0, finite(state.combat.playerTimer));
    state.combat.enemyTimer = Math.max(0, finite(state.combat.enemyTimer));
    state.combat.potionMs = Math.max(0, Math.min(POTION_MINUTES * 60000 * 2, finite(state.combat.potionMs)));
    state.combat.dungeonPotionMs = Math.max(0, Math.min(POTION_MINUTES * 60000 * 2, finite(state.combat.dungeonPotionMs)));
    state.combat.lifestealRoom = Math.max(0, finite(state.combat.lifestealRoom));   // (a second's worth at most; refilled as he fights)
    delete state.combat.potionCharges;
    // work and a fight are never both under way (a save with both ran them at once): the fight goes on
    if (state.action && state.combat.active) state.action = null;
    state.combat.pity = intIn(state.combat.pity, 0, PITY_MARKS - 1, 0);
    state.combat.frontierDrop = state.combat.frontierDrop === true;
    state.combat.stallMs = Math.max(0, finite(state.combat.stallMs));
    const pack = state.combat.pack;
    state.combat.pack = isPlainObject(pack) && Math.floor(Number(pack.stage)) === state.combat.stage && Number(pack.killed) >= 1
        ? { stage: state.combat.stage, killed: Math.min(9, Math.floor(Number(pack.killed))) } : null;
    delete state.combat.lastRiseAt;   // a clock on the wall, before the stall clock counted only climbing
    state.settings.autoPrestige = state.settings.autoPrestige === true;
    state.settings.playtestLog = state.settings.playtestLog === true;
    // Ascension: whole, non-negative counts
    const asc = isPlainObject(data?.ascension) ? data.ascension : {};
    state.ascension = {
        count: Math.min(1e6, Math.max(0, Math.floor(Number(asc.count) || 0))),
        stars: Math.min(1e7, Math.max(0, Math.floor(Number(asc.stars) || 0))),
        firstAt: Math.max(0, Number(asc.firstAt) || 0),
        lastAt: Math.max(0, Number(asc.lastAt) || 0)
    };
    // Trials: a known one active, and whole tiers in range for each
    const trials = isPlainObject(data?.trials) ? data.trials : {};
    // (a laurel comes once a week: 5,000 is a century of them, and keeps the records' power a number)
    state.trials = { active: trialById(trials.active) ? trials.active : null, cleared: {}, best: {}, laurels: Math.min(5000, Math.max(0, Math.floor(Number(trials.laurels) || 0))), weekly: null };
    for (const t of TRIALS) {
        const n = Math.floor(Number(trials.cleared?.[t.id]) || 0);
        if (n > 0) state.trials.cleared[t.id] = Math.min(TRIAL_TIERS, n);
        // the best stage reached in it: at least what its tiers cleared ask (saves from before the weekly Trial)
        const best = Math.max(Math.floor(Number(trials.best?.[t.id]) || 0), n > 0 ? trialTarget(t, Math.min(TRIAL_TIERS, n)) : 0);
        if (best > 0) state.trials.best[t.id] = Math.min(1e6, best);
    }
    const w = trials.weekly;
    if (isPlainObject(w) && trialById(w.id) && Number.isFinite(Number(w.start))) {
        const stage = v => Math.min(1e6, Math.max(0, Math.floor(Number(v) || 0)));
        state.trials.weekly = { start: Number(w.start), id: w.id, bar: stage(w.bar), won: w.won === true, best: stage(w.best) };
    }
    // The counts the medals read, at least what the save holds (Trial Master's and Ascendant's were
    // dropped on every load before they had defaults); skills at 99 counted again for the same reason.
    state.stats.trialTiers = Math.max(state.stats.trialTiers, trialTiersCleared(state));
    state.stats.ascensions = Math.max(state.stats.ascensions, state.ascension.count);
    state.stats.laurels = Math.max(state.stats.laurels, state.trials.laurels);
    state.stats.skills99 = SKILL_IDS.filter(id => levelForXp(state.skills[id].xp) >= MAX_LEVEL).length;
    state.playtest = (Array.isArray(data?.playtest) ? data.playtest : [])
        .filter(e => isPlainObject(e) && PLAYTEST_KINDS.has(e.kind) && isDateTime(e.t))
        .slice(-PLAYTEST_MAX).map(e => ({ t: e.t, kind: e.kind, what: text(e.what).slice(0, 60), cls: ['major', 'medium', 'minor'].includes(e.cls) ? e.cls : 'minor' }));
    state.combat.recovering = state.combat.recovering === true && !state.combat.active && !state.action;
    // When the first prestige was (the Auto switch comes two days after it at the latest); a save from
    // before it was kept starts the two days now.
    state.prestige.firstAt = Math.max(0, Math.min(now, finite(state.prestige.firstAt)));
    if (state.prestige.count >= 1 && !state.prestige.firstAt) state.prestige.firstAt = now;
    // Saves from before the ten-minute run rule may prestige at once; a start time can't be in the future.
    if (!Number.isFinite(data?.prestige?.runStartedAt)) state.prestige.runStartedAt = 0;
    state.prestige.runStartedAt = Math.min(state.prestige.runStartedAt, now);
    // Whole counts, none below nothing: tokens below nothing took the hero's health below nothing, and a
    // negative stage claimed skill points twice over.
    const p = state.prestige;
    p.tokens = Math.min(1e15, Math.max(0, Math.floor(p.tokens)));
    p.skillPoints = Math.min(1e9, Math.max(0, Math.floor(p.skillPoints)));
    p.count = Math.min(1e7, Math.max(0, Math.floor(p.count)));
    p.spClaimedStage = Math.max(0, Math.min(state.combat.bestStage, Math.floor(p.spClaimedStage)));
    // A Titan or clan boss fight never survives a reload (a clan attack not finished is not spent): the
    // hero is back at what he was doing when it began (a save from before titan.before fights on at the
    // stages). A dungeon run does survive, if it still makes sense.
    const mode = state.combat.mode;
    const kept = mode === 'titan' ? state.titan?.before : mode === 'clan' ? state.clanFight?.before : null;
    const before = isPlainObject(kept) ? kept : null;
    if ((mode === 'titan' || mode === 'clan') && before && before.doing !== 'fight') {
        const work = before.doing === 'work' ? cleanAction(before.action) : null;
        state.combat.active = false;
        state.combat.recovering = before.doing === 'recover';
        if (work) state.action = { ...work, stalled: false };
    }
    if (isPlainObject(state.titan)) state.titan.before = null;
    state.clanFight = null;
    // a clan attack fought and not yet sent waits to be sent (the server cleans its strikes again)
    const sent = state.clanResult;
    state.clanResult = isPlainObject(sent) && typeof sent.week === 'string' && Array.isArray(sent.strikes)
        ? { week: sent.week.slice(0, 10), strikes: sent.strikes.slice(0, 200).map(Number).filter(Number.isFinite), ms: Math.max(0, Math.min(CLAN_FIGHT_MS, finite(sent.ms))), at: finite(sent.at) }
        : null;
    const run = state.combat.dungeon;
    const runDungeon = run ? DUNGEONS.find(d => d.id === run.id) : null;
    if (state.combat.mode !== 'dungeon' || !runDungeon) {
        state.combat.mode = 'stages';
        state.combat.dungeon = null;
    } else {
        // the room reached; whether the player chose to keep going; the wait at the chest after a clear
        const choiceLeft = Math.max(0, Math.min(DUNGEON_CHOICE_MS, finite(Number(run.choiceLeft), 0)));
        const index = choiceLeft > 0 ? runDungeon.monsters.length + 1 : Math.max(0, Math.min(runDungeon.monsters.length, Math.floor(Number(run.index) || 0)));
        state.combat.dungeon = { id: run.id, index, repeat: run.repeat === true, choiceLeft };
        if (choiceLeft > 0) state.combat.enemy = null;
    }
    delete state.combat.autoRepeat;   // the old switch for every visit: now each visit asks after its first clear
    if (!state.dungeons || typeof state.dungeons !== 'object') state.dungeons = {};
    for (const d of DUNGEONS) {
        if (!state.dungeons[d.id] || typeof state.dungeons[d.id] !== 'object') state.dungeons[d.id] = { clears: 0, fragments: 0 };
        const record = state.dungeons[d.id];
        record.clears = Math.max(0, Math.floor(Number(record.clears) || 0));
        record.fragments = Math.max(0, Math.floor(Number(record.fragments) || 0));
    }
    for (const [toolId, tool] of Object.entries(TOOLS)) {
        state.tools[toolId] = Math.max(0, Math.min(tool.tiers.length, Math.floor(Number(state.tools[toolId]) || 0)));
    }
    if (!state.bonfire || !Number.isFinite(Number(state.bonfire.until))) state.bonfire = { until: 0 };
    // Arrays merge as a whole, so rebuild plots and the course slot by slot from whatever was saved.
    const savedPlots = Array.isArray(state.farming?.plots) ? state.farming.plots : [];
    state.farming = {
        plots: FARMING_PLOTS.map((_, i) => {
            const plot = savedPlots[i];
            if (!plot || !cropById(plot.crop)) return { crop: null, plantedAt: 0, readyAt: 0 };
            return { crop: plot.crop, plantedAt: Number(plot.plantedAt) || 0, readyAt: Number(plot.readyAt) || 0 };
        })
    };
    const savedCourse = Array.isArray(state.agility?.built) ? state.agility.built : [];
    const savedLevels = Array.isArray(state.agility?.levels) ? state.agility.levels : [];
    const built = AGILITY_SLOTS.map((slot, i) => (slot.obstacles.some(o => o.id === savedCourse[i]) ? savedCourse[i] : null));
    state.agility = { built, levels: built.map((id, i) => (id ? Math.max(1, Math.min(MAX_OBSTACLE_LEVEL, Math.floor(Number(savedLevels[i]) || 1))) : 0)) };
    if (!state.titan || typeof state.titan !== 'object') state.titan = { kills: 0, readyAt: 0, attempts: 0, bestPct: 0, before: null };
    const ev = state.events;
    for (const key of ['tokens', 'earnedToday', 'progress', 'instanceEarned']) ev[key] = Math.max(0, Math.floor(Number(ev[key]) || 0));
    // the event's milestones paid (token counts) and which weekend they belong to
    ev.milestones = (Array.isArray(ev.milestones) ? ev.milestones : []).filter(m => Number.isFinite(m)).slice(0, 100);
    if (typeof ev.instance !== 'string') ev.instance = null;
    // festival cloaks bought (data/capes.js): only the known events', and none worn that is not owned
    const cloaks = isPlainObject(ev.cloaks) ? ev.cloaks : {};
    ev.cloaks = {};
    for (const c of FESTIVAL_CLOAKS) if (cloaks[c.event] === true) ev.cloaks[c.event] = true;
    if (festivalCloak(state.hero.cape) && !capeEarned(state, state.hero.cape)) state.hero.cape = '';
    if (!state.pets || typeof state.pets !== 'object') state.pets = {};
    state.titan.kills = intIn(state.titan.kills, 0, MAX_TITAN_KILLS, 0);
    state.titan.attempts = Math.max(0, Math.floor(finite(state.titan.attempts)));
    state.titan.bestPct = Math.max(0, Math.min(1, finite(state.titan.bestPct)));
    if (!Number.isFinite(Number(state.titan.readyAt))) state.titan.readyAt = 0;
    state.daily.banked = Math.max(0, Math.min(DAILY_MAX_BANKED, Math.floor(Number(state.daily.banked) || 0)));
    state.daily.claimed = Math.max(0, Math.floor(finite(state.daily.claimed)));   // every so many crates is a great one
    if (!Number.isFinite(Number(state.daily.nextAt))) state.daily.nextAt = now + DAILY_INTERVAL_MS;
    for (const perk of PERKS) state.perks[perk.id] = Math.min(perk.max, Math.max(0, Math.floor(Number(state.perks[perk.id]) || 0)));
    if (data?.prestige?.perkReset !== PERK_RESET) resetPerks(state, now);   // (read from the save itself: the default is the new mark)
    // camp levels as whole numbers in range: a negative one multiplied the hero's health to nothing
    for (const u of CAMP_UPGRADES) state.camp[u.id] = Math.min(u.max, Math.max(0, Math.floor(Number(state.camp[u.id]) || 0)));
    // Mini-game challenges never survive a reload: one left open counts as missed (it ends the streak, and
    // the next chance comes in the usual minutes; a reload used to give a fresh chance at once).
    const mgRules = BALANCE.minigame;
    for (const id of NON_COMBAT_SKILLS) {
        const mg = state.minigame[id];
        if (mg.challenge) {
            mg.streak = 0;
            mg.opportunityUntil = 0;
            mg.nextOpportunityAt = now + mgRules.opportunityEveryMs[0];
        }
        mg.challenge = null;
        mg.streak = intIn(mg.streak, 0, 5, 0);
        // a boost from before the ×2 (it stored +35% in `bonus`) runs out as a ×2
        mg.mult = Math.max(1, Math.min(mgRules.speedMult, finite(mg.mult) || mgRules.speedMult));
        delete mg.bonus;
        mg.gainId = RESOURCES[mg.gainId] ? mg.gainId : '';
        mg.gainQty = Math.max(0, Math.floor(finite(mg.gainQty)));
        mg.gainXp = Math.max(0, finite(mg.gainXp));
        if (mg.boostUntil < now) { mg.boostUntil = 0; mg.mult = 0; mg.gainId = ''; mg.gainQty = 0; mg.gainXp = 0; }
    }
    return clampTimers(state, now);
}

// Keys a save may never write: assigning them would change an object's prototype, or with
// "__proto__" reach Object.prototype itself (a shared save string or a stored cloud save could then
// change every object in the page, or on the server).
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Copy a loaded save over the defaults, key by key. Only the save's own keys are read, and a value
 * must have the default's type: where the default is an object, a list, a number, a flag or a text
 * and the save holds something else, the default stays. So one broken section loads as defaults
 * instead of sinking the whole save, and a crafted save can't put markup where the UI shows a number.
 */
function mergeInto(target, source) {
    for (const key of Object.keys(source)) {
        if (UNSAFE_KEYS.has(key)) continue;
        const value = source[key];
        const current = Object.prototype.hasOwnProperty.call(target, key) ? target[key] : undefined;
        if (isPlainObject(current)) {
            if (isPlainObject(value)) mergeInto(current, value);
        } else if (Array.isArray(current)) {
            if (Array.isArray(value)) target[key] = value;
        } else if (typeof current === 'number') {
            const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
            if (typeof n === 'number' && Number.isFinite(n)) target[key] = n;
        } else if (typeof current === 'boolean') {
            if (typeof value === 'boolean') target[key] = value;
        } else if (typeof current === 'string') {
            if (typeof value === 'string') target[key] = value;
        } else {
            target[key] = value; // defaults of null: objects the game fills in (items, the action), checked below
        }
    }
    return target;
}
