// The modifier pipeline. Every bonus source (gear, combat level, prestige tokens, perks,
// achievements, potions, tools, mini-game boosts) is folded into one object, and the
// derived combat numbers are computed from it. Nothing else in the game should apply a
// bonus by hand — if it isn't here, it isn't real (the old game's achievement rewards).
//
// Stacking rule: percentages from "content" sources add together inside a layer; layers
// multiply. Prestige tokens are their own layer so prestige stays exponential.

import { EQUIP_SLOTS, UPGRADE_STEP } from '../data/items.js';
import { PERKS } from '../data/perks.js';
import { ACHIEVEMENTS, ACHIEVEMENT_GLOBAL_BONUS } from '../data/achievements.js';
import { NON_COMBAT_SKILLS, WORKSHOP_SKILLS } from '../data/skills.js';
import { TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER } from '../data/workshop.js';
import { RESOURCES } from '../data/resources.js';
import { CAMP_UPGRADES, campMultiplier } from '../data/camp.js';
import { PETS } from '../data/pets.js';
import { DUNGEONS, DUNGEON_MILESTONES, TITAN_BONUS } from '../data/dungeons.js';
import { levelForXp } from './xp.js';

export const BASE = {
    unarmedAtk: 5,
    baseHp: 100,
    hpPerCombatLevel: 12,
    atkPerCombatLevel: 0.012,   // +1.2% ATK per combat level (x2.18 at 99)
    defPerCombatLevel: 0.012,
    baseAttackInterval: 1500,
    minAttackInterval: 500,
    baseCritChance: 0.05,
    baseCritDmg: 1.5,
    tokenAtk: 0.005,            // per held prestige token
    tokenDef: 0.005,
    tokenHp: 0.0025,
    baseOfflineHours: 12,
    baseAutoEatThreshold: 0.5,
    basePotionCharges: 15,
    // Focus: after a minute without input the hero settles in (Clicker Heroes' idle ancients).
    // It also applies to offline progress, so idle play is never strictly worse than clicking.
    focusAfterMs: 60000,
    focusSkillSpeed: 0.15,
    focusAttackSpeed: 0.15,
    caps: { critChance: 0.75, dodge: 0.6, lifesteal: 0.3, attackSpeed: 1.0 }
};

/** True once the player has left the game alone for `focusAfterMs`. */
export function isFocused(state, now = state.meta.lastActiveAt || Date.now()) {
    const lastInput = state.meta.lastInputAt ?? now;
    return now - lastInput >= BASE.focusAfterMs;
}

const POTION_EFFECTS = {
    accuracy_potion: { atkMult: 0.20 },
    defense_potion:  { defMult: 0.20 },
    evasion_potion:  { dodge: 0.15 },
    health_potion:   { hpMult: 0.25 }
};

function emptyMods() {
    const skillSpeed = {};
    const doubleChance = {};
    for (const id of [...NON_COMBAT_SKILLS, ...WORKSHOP_SKILLS]) { skillSpeed[id] = 0; doubleChance[id] = 0; }
    return {
        gearAtk: 0, gearDef: 0,
        atkMult: 0, defMult: 0, hpMult: 0,
        critChance: 0, critDmg: 0, attackSpeed: 0, dodge: 0, lifesteal: 0,
        goldMult: 0, dropMult: 0, combatXpMult: 0, xpMult: 0,
        skillSpeed, doubleChance,
        foodMult: 0, autoEatThreshold: 0, potionCharges: 0, offlineHours: 0,
        boostDuration: 0, craftQuality: 0, tokenMult: 0
    };
}

function addMods(target, mods, scale = 1) {
    if (!mods) return;
    for (const [key, value] of Object.entries(mods)) {
        if (key === 'skillSpeed' || key === 'doubleChance') {
            for (const [skill, v] of Object.entries(value)) target[key][skill] = (target[key][skill] || 0) + v * scale;
        } else if (typeof value === 'number') {
            target[key] = (target[key] || 0) + value * scale;
        }
    }
}

export function skillLevel(state, skillId) {
    return levelForXp(state.skills[skillId]?.xp || 0);
}

/** Collect every bonus source into a flat modifier object. */
export function collectModifiers(state) {
    const mods = emptyMods();

    // Equipment: base stats scaled by upgrade level, plus affixes.
    for (const slot of EQUIP_SLOTS) {
        const item = state.equipped[slot];
        if (!item) continue;
        const upgradeMult = 1 + UPGRADE_STEP * (item.upgrade || 0);
        mods.gearAtk += (item.atk || 0) * upgradeMult;
        mods.gearDef += (item.def || 0) * upgradeMult;
        for (const affix of item.affixes || []) addMods(mods, { [affix.stat]: affix.value });
    }

    // Combat level.
    const combatLevel = skillLevel(state, 'combat');
    mods.atkMult += BASE.atkPerCombatLevel * (combatLevel - 1);
    mods.defMult += BASE.defPerCombatLevel * (combatLevel - 1);

    // Perks bought with skill points.
    for (const perk of PERKS) addMods(mods, perk.mods, state.perks[perk.id] || 0);

    // Achievements: their own reward plus the small global bonus each.
    let unlockedCount = 0;
    for (const ach of ACHIEVEMENTS) {
        if (!state.achievements[ach.id]) continue;
        unlockedCount++;
        addMods(mods, ach.mods);
    }
    if (unlockedCount) {
        mods.atkMult += ACHIEVEMENT_GLOBAL_BONUS * unlockedCount;
        mods.defMult += ACHIEVEMENT_GLOBAL_BONUS * unlockedCount;
        for (const id of NON_COMBAT_SKILLS) mods.skillSpeed[id] += ACHIEVEMENT_GLOBAL_BONUS * unlockedCount;
    }

    // Pets (permanent, one per skill).
    for (const pet of PETS) if (state.pets?.[pet.id]) addMods(mods, pet.mods);

    // Dungeon clear milestones and Titans defeated (permanent).
    for (const d of DUNGEONS) {
        const clears = state.dungeons?.[d.id]?.clears || 0;
        for (const m of DUNGEON_MILESTONES) if (clears >= m.clears) addMods(mods, m.mods);
    }
    addMods(mods, TITAN_BONUS, state.titan?.kills || 0);

    // Active potion (only while it has charges).
    if (state.combat.potion !== 'none' && state.combat.potionCharges > 0) addMods(mods, POTION_EFFECTS[state.combat.potion]);

    // Tools.
    for (const [toolId, tool] of Object.entries(TOOLS)) {
        const tier = state.tools[toolId] || 0;
        if (!tier) continue;
        mods.skillSpeed[tool.skill] += TOOL_SPEED_PER_TIER * tier;
        mods.doubleChance[tool.skill] += TOOL_DOUBLE_PER_TIER * tier;
    }

    // Mini-game boosts (timed, per skill).
    const now = state.meta.lastActiveAt || Date.now();
    for (const id of NON_COMBAT_SKILLS) {
        const mg = state.minigame[id];
        if (mg && mg.boostUntil > now) mods.skillSpeed[id] += mg.bonus;
    }

    // Focus (idle bonus).
    mods.focused = isFocused(state, now);
    if (mods.focused) {
        for (const id of Object.keys(mods.skillSpeed)) mods.skillSpeed[id] += BASE.focusSkillSpeed;
        mods.attackSpeed += BASE.focusAttackSpeed;
    }

    return mods;
}

/** Turn the modifier object into the numbers the combat system uses. */
export function deriveStats(state, mods = collectModifiers(state)) {
    const combatLevel = skillLevel(state, 'combat');
    const tokens = state.prestige.tokens || 0;
    const tokenLayerAtk = 1 + BASE.tokenAtk * tokens;
    const tokenLayerDef = 1 + BASE.tokenDef * tokens;
    const tokenLayerHp = 1 + BASE.tokenHp * tokens;

    // Camp upgrades: the run-scoped layer (reset on prestige).
    const camp = { atk: 1, def: 1, hp: 1 };
    for (const upgrade of CAMP_UPGRADES) camp[upgrade.stat] *= campMultiplier(upgrade, state.camp?.[upgrade.id] || 0);

    const atk = (BASE.unarmedAtk + mods.gearAtk) * (1 + mods.atkMult) * tokenLayerAtk * camp.atk;
    const def = mods.gearDef * (1 + mods.defMult) * tokenLayerDef * camp.def;
    const maxHp = (BASE.baseHp + BASE.hpPerCombatLevel * (combatLevel - 1)) * (1 + mods.hpMult) * tokenLayerHp * camp.hp;
    const attackSpeed = Math.min(BASE.caps.attackSpeed, mods.attackSpeed);

    return {
        combatLevel,
        atk: Math.floor(atk),
        def: Math.floor(def),
        maxHp: Math.floor(maxHp),
        critChance: Math.min(BASE.caps.critChance, BASE.baseCritChance + mods.critChance),
        critDmg: BASE.baseCritDmg + mods.critDmg,
        attackInterval: Math.max(BASE.minAttackInterval, Math.round(BASE.baseAttackInterval / (1 + attackSpeed))),
        dodge: Math.min(BASE.caps.dodge, mods.dodge),
        lifesteal: Math.min(BASE.caps.lifesteal, mods.lifesteal),
        goldMult: 1 + mods.goldMult,
        dropMult: 1 + mods.dropMult,
        combatXpMult: 1 + mods.combatXpMult + mods.xpMult,
        xpMult: 1 + mods.xpMult,
        foodMult: 1 + mods.foodMult,
        autoEatThreshold: Math.min(0.9, BASE.baseAutoEatThreshold + mods.autoEatThreshold),
        potionCharges: Math.round(BASE.basePotionCharges * (1 + mods.potionCharges)),
        offlineMs: (BASE.baseOfflineHours + mods.offlineHours) * 3600 * 1000,
        boostDurationMult: 1 + mods.boostDuration,
        craftQuality: mods.craftQuality,
        tokenMult: 1 + mods.tokenMult,
        skillSpeed: mods.skillSpeed,
        doubleChance: mods.doubleChance,
        tokenPowerPct: Math.round(BASE.tokenAtk * tokens * 100),
        campMult: camp,
        focused: !!mods.focused
    };
}

/** Effective interval (ms) for an action of a skill. */
export function actionInterval(baseInterval, derived, skillId) {
    const speed = derived.skillSpeed[skillId] || 0;
    return Math.max(250, Math.round(baseInterval / (1 + speed)));
}

export function potionInfo(id) {
    const res = RESOURCES[id];
    return res ? { id, name: res.name, desc: res.desc } : null;
}
