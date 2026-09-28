// The single state object: creation, validation and migration of older saves.
// Everything persisted lives here; derived values (stats, modifiers) are recomputed, never saved.

import { RESOURCES } from '../data/resources.js';
import { SKILL_IDS, NON_COMBAT_SKILLS } from '../data/skills.js';
import { EQUIP_SLOTS } from '../data/items.js';
import { PERKS } from '../data/perks.js';
import { xpForLevel } from './xp.js';

export const SAVE_VERSION = 2;

export function createDefaultState(now = Date.now()) {
    const state = {
        version: SAVE_VERSION,
        meta: { createdAt: now, savedAt: now, playtimeMs: 0, lastActiveAt: now },
        gold: 0,
        resources: {},
        inventory: [],
        equipped: {},
        tools: { pickaxe: 0, axe: 0, bow: 0 },
        skills: {},
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
            autoRetreat: true
        },
        prestige: { tokens: 0, skillPoints: 0, count: 0, spClaimedStage: 0 },
        camp: { whetstone: 0, armory: 0, hearth: 0 },
        perks: {},
        achievements: {},
        unlocks: {},
        stats: {
            kills: 0, bossKills: 0, deaths: 0, maxStage: 1, goldEarned: 0, itemsCrafted: 0, barsSmelted: 0,
            minigameWins: 0, gemsFound: 0, legendariesEquipped: 0, skills99: 0, prestiges: 0, essenceFound: 0,
            actionsBySkill: {}
        },
        minigame: {},
        daily: { lastClaim: 0 },
        log: [],
        settings: { devUnlockAll: false, numberFormat: 'short', reducedMotion: false, cloudSync: true },
        idCounter: 1
    };
    for (const id of Object.keys(RESOURCES)) state.resources[id] = 0;
    for (const slot of EQUIP_SLOTS) state.equipped[slot] = null;
    for (const id of SKILL_IDS) state.skills[id] = { xp: 0 };
    for (const id of SKILL_IDS) state.stats.actionsBySkill[id] = 0;
    for (const perk of PERKS) state.perks[perk.id] = 0;
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
    return normalise(data, now);
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
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!Array.isArray(state.log)) state.log = [];
    state.gold = Math.max(0, Number(state.gold) || 0);
    state.combat.enemy = null; // always respawned on load
    state.combat.hp = Math.max(1, Number(state.combat.hp) || 100);
    state.combat.stage = Math.max(1, Math.floor(Number(state.combat.stage) || 1));
    state.combat.maxStage = Math.max(state.combat.stage, Math.floor(Number(state.combat.maxStage) || 1));
    state.combat.bestStage = Math.max(state.combat.maxStage, Math.floor(Number(state.combat.bestStage) || 1));
    state.combat.combo = 0;
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
