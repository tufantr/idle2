// The single state object: creation, validation and migration of older saves.
// Everything persisted lives here; derived values (stats, modifiers) are recomputed, never saved.

import { RESOURCES } from '../data/resources.js';
import { SKILL_IDS, NON_COMBAT_SKILLS } from '../data/skills.js';
import { EQUIP_SLOTS } from '../data/items.js';
import { PERKS } from '../data/perks.js';
import { xpForLevel, levelForXp } from './xp.js';
import { DAILY_INTERVAL_MS, DAILY_MAX_BANKED } from '../systems/daily.js';
import { DUNGEONS } from '../data/dungeons.js';
import { TOOLS } from '../data/workshop.js';
import { FARMING_PLOTS, cropById } from '../data/farming.js';
import { AGILITY_SLOTS, MAX_OBSTACLE_LEVEL } from '../data/agility.js';
import { MASTERY_SKILLS, MASTERY_XP_DIVISOR, MASTERY_MAX_LEVEL, masteryActions } from '../data/mastery.js';

export const SAVE_VERSION = 3;

export function createDefaultState(now = Date.now()) {
    const state = {
        version: SAVE_VERSION,
        meta: { createdAt: now, savedAt: now, playtimeMs: 0, lastActiveAt: now, lastInputAt: now },
        gold: 0,
        resources: {},
        inventory: [],
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
            potionCharges: 0,
            combo: 0,
            lastComboAt: 0,
            farmMode: false,
            bossTimeLeft: 0,   // ms of fighting left before the current boss escapes
            regroupLeft: 0,    // ms left farming the previous stage after a boss escaped
            lastSetbackAt: 0,  // last death or boss escape (the advisor uses it)
            mode: 'stages',    // 'stages' | 'dungeon' | 'titan'
            dungeon: null,     // { id, index } while in a dungeon run
            autoRepeat: true   // start the dungeon again after each clear
        },
        dungeons: {},          // id -> { clears, fragments }
        titan: { kills: 0, readyAt: 0, attempts: 0, bestPct: 0 },
        pets: {},
        bonfire: { until: 0 },             // wall-clock time the bonfire burns out
        farming: { plots: [] },            // [{ crop, plantedAt, readyAt }] one per plot
        agility: { built: [], levels: [] }, // obstacle id per course slot (or null) and its level
        events: { tokens: 0, day: '', earnedToday: 0, progress: 0, instance: null, instanceEarned: 0, milestones: [] },
        prestige: { tokens: 0, skillPoints: 0, count: 0, spClaimedStage: 0 },
        camp: { whetstone: 0, armory: 0, hearth: 0 },
        perks: {},
        achievements: {},
        unlocks: {},
        stats: {
            kills: 0, bossKills: 0, bossEscapes: 0, deaths: 0, maxStage: 1, goldEarned: 0, itemsCrafted: 0, barsSmelted: 0,
            minigameWins: 0, gemsFound: 0, legendariesEquipped: 0, skills99: 0, prestiges: 0, essenceFound: 0,
            itemsDropped: 0, itemsSalvaged: 0, itemsAutoSalvaged: 0, reforges: 0,
            dungeonClears: 0, titanKills: 0, petsFound: 0, uniquesFound: 0, uniquesAssembled: 0,
            fishCaught: 0, baitUsed: 0, logsBurnt: 0, cropsHarvested: 0, obstaclesBuilt: 0, obstacleUpgrades: 0, courseRuns: 0, goldSpent: 0,
            clanRewards: 0, clanLastHits: 0,
            masteryLevels: 0, masteryBest: 1, masteries99: 0, ingredientsSaved: 0,
            actionsBySkill: {}
        },
        minigame: {},
        daily: { banked: 1, nextAt: now + DAILY_INTERVAL_MS, claimed: 0 },
        log: [],
        settings: { devUnlockAll: false, numberFormat: 'short', reducedMotion: false, cloudSync: true, autoSalvage: 'common', forceEvent: null },
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
    for (const id of NON_COMBAT_SKILLS) state.minigame[id] = { boostUntil: 0, bonus: 0, streak: 0, challenge: null, nextOpportunityAt: 0, opportunityUntil: 0 };
    return state;
}

/**
 * Bring any loaded object up to the current version and make sure every expected key exists.
 * Returns a fresh state object; never mutates the input.
 */
export function migrateState(raw, now = Date.now()) {
    if (!raw || typeof raw !== 'object') return createDefaultState(now);
    let data = raw;
    if (!data.version || data.version < 2) data = migrateV1(data, now);
    if (data.version < 3) data = migrateV2(data, now);
    return normalise(data, now);
}

// v2 -> v3: the daily reward became a bank of up to three crates.
function migrateV2(data, now) {
    const last = Number(data.daily?.lastClaim) || 0;
    const daily = last
        ? { banked: now - last >= DAILY_INTERVAL_MS ? 1 : 0, nextAt: last + DAILY_INTERVAL_MS, claimed: 0 }
        : { banked: 1, nextAt: now + DAILY_INTERVAL_MS, claimed: 0 };
    // The player left at savedAt, so offline progress on this first v3 load counts as idle (focus).
    const meta = { ...(data.meta || {}), lastInputAt: data.meta?.savedAt ?? now };
    return { ...data, version: 3, daily, meta };
}

// v1 = the original single-file game (localStorage key "fantasyIdleSaveLocal").
// Levels were stored per-level with a 1.5x curve; resources had different ids; no items could exist.
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
    accuracy_potion: 'accuracy_potion', defense_potion: 'defense_potion', evasion_potion: 'evasion_potion', health_potion: 'health_potion'
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
    state.meta.savedAt = Number(old.flags?.lastSaveTime) || now;
    state.meta.createdAt = state.meta.savedAt;
    state.log.push({ t: now, type: 'system', text: 'Save migrated from the original prototype. Your resources, skill levels, tokens and best stage carried over.' });
    return state;
}

/** Fill any missing keys from the default state and clamp obviously broken numbers. */
function normalise(data, now) {
    const base = createDefaultState(now);
    const state = mergeInto(base, data);
    state.version = SAVE_VERSION;
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
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!Array.isArray(state.log)) state.log = [];
    state.gold = Math.max(0, Number(state.gold) || 0);
    state.combat.enemy = null; // always respawned on load
    state.combat.hp = Math.max(1, Number(state.combat.hp) || 100);
    state.combat.stage = Math.max(1, Math.floor(Number(state.combat.stage) || 1));
    state.combat.maxStage = Math.max(state.combat.stage, Math.floor(Number(state.combat.maxStage) || 1));
    state.combat.bestStage = Math.max(state.combat.maxStage, Math.floor(Number(state.combat.bestStage) || 1));
    state.combat.combo = 0;
    // A titan fight never survives a reload; a dungeon run does (if it still makes sense).
    const run = state.combat.dungeon;
    const runDungeon = run ? DUNGEONS.find(d => d.id === run.id) : null;
    if (state.combat.mode !== 'dungeon' || !runDungeon) {
        state.combat.mode = 'stages';
        state.combat.dungeon = null;
    } else {
        run.index = Math.max(0, Math.min(runDungeon.monsters.length, Math.floor(Number(run.index) || 0)));
    }
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
    if (!state.titan || typeof state.titan !== 'object') state.titan = { kills: 0, readyAt: 0, attempts: 0, bestPct: 0 };
    const ev = state.events;
    for (const key of ['tokens', 'earnedToday', 'progress', 'instanceEarned']) ev[key] = Math.max(0, Math.floor(Number(ev[key]) || 0));
    if (!Array.isArray(ev.milestones)) ev.milestones = [];
    if (!state.pets || typeof state.pets !== 'object') state.pets = {};
    state.titan.kills = Math.max(0, Math.floor(Number(state.titan.kills) || 0));
    if (!Number.isFinite(Number(state.titan.readyAt))) state.titan.readyAt = 0;
    state.daily.banked = Math.max(0, Math.min(DAILY_MAX_BANKED, Math.floor(Number(state.daily.banked) || 0)));
    if (!Number.isFinite(Number(state.daily.nextAt))) state.daily.nextAt = now + DAILY_INTERVAL_MS;
    for (const perk of PERKS) state.perks[perk.id] = Math.min(perk.max, Math.max(0, Math.floor(Number(state.perks[perk.id]) || 0)));
    // Mini-game challenges never survive a reload.
    for (const id of NON_COMBAT_SKILLS) {
        const mg = state.minigame[id];
        mg.challenge = null;
        if (mg.boostUntil < now) { mg.boostUntil = 0; mg.bonus = 0; }
    }
    return state;
}

function mergeInto(target, source) {
    for (const key of Object.keys(source)) {
        const value = source[key];
        if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
            mergeInto(target[key], value);
        } else {
            target[key] = value;
        }
    }
    return target;
}
