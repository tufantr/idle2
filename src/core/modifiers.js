// The modifier pipeline. Every bonus source (gear, combat level, prestige tokens, perks,
// achievements, skill capes, potions, tools, mini-game boosts) is folded into one object, and the
// derived combat numbers are computed from it. Nothing else in the game should apply a
// bonus by hand — if it isn't here, it isn't real (the old game's achievement rewards).
//
// Stacking rule: percentages from "content" sources add together inside a layer; layers
// multiply. Prestige tokens are their own layer so prestige stays exponential.

import { EQUIP_SLOTS, UPGRADE_STEP } from '../data/items.js';
import { PERKS } from '../data/perks.js';
import { ACHIEVEMENTS, ACHIEVEMENT_GLOBAL_BONUS } from '../data/achievements.js';
import { NON_COMBAT_SKILLS, SPEED_SKILLS } from '../data/skills.js';
import { TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER } from '../data/workshop.js';
import { RESOURCES } from '../data/resources.js';
import { CAMP_UPGRADES, campMultiplier } from '../data/camp.js';
import { PETS } from '../data/pets.js';
import { DUNGEONS, DUNGEON_MILESTONES, TITAN_BONUS, titanBonusUnits } from '../data/dungeons.js';
import { trialBite, trialTiersCleared } from '../data/trials.js';
import { obstacleById } from '../data/agility.js';
import { capesEarned } from '../data/capes.js';
import { MASTERY_SKILLS, masteryShare, checkpointsAt } from '../data/mastery.js';
import { starGain } from '../data/ascension.js';
import { eventStatus } from '../systems/events.js';
import { levelForXp } from './xp.js';

export const BASE = {
    unarmedAtk: 5,
    baseHp: 100,
    hpPerCombatLevel: 12,
    // Armour also adds health, one point for every 20 defence it carries (before the health bonuses
    // multiply it). Gear is the one source of power that grows with depth, so without this a deep
    // hero's health stood still while the monsters' attack grew x2.06 a depth: past stage ~170 every
    // hit killed, and food, defence and lifesteal stopped mattering (docs/research_notes/incremental-math.md §8.4).
    hpPerDef: 0.05,
    atkPerCombatLevel: 0.012,   // +1.2% ATK per combat level (x2.18 at 99)
    defPerCombatLevel: 0.012,
    baseAttackInterval: 1500,
    minAttackInterval: 500,
    baseCritChance: 0.05,
    baseCritDmg: 1.5,
    tokenAtk: 0.004,            // per held prestige token (0.5% until the records multiplied them)
    tokenDef: 0.004,
    tokenHp: 0.002,
    // Records make every token stronger (docs/research_notes/incremental-math.md A1.3): each 25 stages of
    // all-time best, and each dungeon unique held, multiply the token effect by 1.05, so a late record
    // lifts the whole stock where one more run adds a few percent.
    recordStages: 25,
    recordMult: 1.05,
    baseOfflineHours: 24,       // a day: a player who comes back once a day loses nothing (12 until the check-in research)
    baseAutoEatThreshold: 0.5,
    basePotionCharges: 15,
    // Focus: after a minute without input the hero settles in (Clicker Heroes' idle ancients).
    // It also applies to offline progress, so idle play is never strictly worse than clicking.
    focusAfterMs: 60000,
    focusSkillSpeed: 0.15,
    focusAttackSpeed: 0.15,
    // Bonfire: every log burnt adds time; while it burns, all skills (combat too) earn more XP.
    bonfireXp: 0.05,            // at firemaking level 1 ...
    bonfireXpAt99: 0.10,        // ... rising to this at 99
    bonfireSecondsPerLogTier: 15,
    bonfireMaxMs: 60 * 60 * 1000,
    caps: { critChance: 0.75, dodge: 0.6, lifesteal: 0.3, attackSpeed: 1.0 }
};

/** XP bonus of a burning bonfire at this firemaking level. */
export function bonfireBonus(level) {
    return BASE.bonfireXp + (BASE.bonfireXpAt99 - BASE.bonfireXp) * Math.min(99, Math.max(1, level)) / 99;
}

export function bonfireLit(state, now = state.meta.lastActiveAt || Date.now()) {
    return (state.bonfire?.until || 0) > now;
}

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
    for (const id of SPEED_SKILLS) { skillSpeed[id] = 0; doubleChance[id] = 0; }
    return {
        gearAtk: 0, gearDef: 0,
        atkMult: 0, defMult: 0, hpMult: 0,
        critChance: 0, critDmg: 0, attackSpeed: 0, dodge: 0, lifesteal: 0,
        goldMult: 0, dropMult: 0, combatXpMult: 0, xpMult: 0,
        skillSpeed, doubleChance,
        foodMult: 0, autoEatThreshold: 0, potionCharges: 0, offlineHours: 0,
        boostDuration: 0, craftQuality: 0, tokenMult: 0, farmYield: 0, gildedChance: 0, petChance: 0
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

    // Equipment: base stats scaled by upgrade level, plus affixes (all of it times a Trial's `gear`,
    // nothing in Rusted Gear: data/trials.js).
    const gearShare = trialBite(state).gear ?? 1;
    for (const slot of EQUIP_SLOTS) {
        const item = state.equipped[slot];
        if (!item || !gearShare) continue;
        const upgradeMult = (1 + UPGRADE_STEP * (item.upgrade || 0)) * gearShare;
        mods.gearAtk += (item.atk || 0) * upgradeMult;
        mods.gearDef += (item.def || 0) * upgradeMult;
        for (const affix of item.affixes || []) addMods(mods, { [affix.stat]: affix.value * gearShare });
    }

    // Mastery checkpoints: a skill's actions faster for good at 10, 25, 50 and 95% of its whole mastery.
    for (const id of MASTERY_SKILLS) for (const c of checkpointsAt(masteryShare(state, id))) mods.skillSpeed[id] = (mods.skillSpeed[id] || 0) + c.speed;

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
        for (const id of SPEED_SKILLS) mods.skillSpeed[id] += ACHIEVEMENT_GLOBAL_BONUS * unlockedCount;
    }

    // Pets (permanent, one per skill).
    for (const pet of PETS) if (state.pets?.[pet.id]) addMods(mods, pet.mods);

    // Skill capes (level 99, permanent, whichever one is worn).
    for (const cape of capesEarned(state)) addMods(mods, cape.mods);

    // Dungeon clear milestones and Titans defeated (permanent).
    for (const d of DUNGEONS) {
        const clears = state.dungeons?.[d.id]?.clears || 0;
        for (const m of DUNGEON_MILESTONES) if (clears >= m.clears) addMods(mods, m.mods);
    }
    addMods(mods, TITAN_BONUS, titanBonusUnits(state.titan?.kills || 0));

    // Agility obstacles (permanent, one per course slot); an upgraded obstacle counts once per level.
    (state.agility?.built || []).forEach((id, slot) => {
        if (id) addMods(mods, obstacleById(id)?.mods, Math.max(1, state.agility.levels?.[slot] || 1));
    });

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

    // The bonfire.
    if (bonfireLit(state, now)) mods.xpMult += bonfireBonus(skillLevel(state, 'firemaking'));

    // A running weekend event.
    const ev = eventStatus(state, now);
    mods.event = ev.active ? ev.event.id : null;
    if (ev.active) addMods(mods, ev.event.mods);

    // Focus (idle bonus). Not farming: plots are planted with a click, so focus could never apply.
    mods.focused = isFocused(state, now);
    if (mods.focused) {
        for (const id of Object.keys(mods.skillSpeed)) if (id !== 'farming') mods.skillSpeed[id] += BASE.focusSkillSpeed;
        mods.attackSpeed += BASE.focusAttackSpeed;
    }

    return mods;
}

/** The hero's records: { stages, uniques, count, mult } — 25-stage steps of the best stage, dungeon uniques held. */
export function recordsOf(state) {
    const stages = Math.floor((state.combat?.bestStage || 1) / BASE.recordStages);
    const held = new Set();
    for (const item of [...(state.inventory || []), ...Object.values(state.equipped || {})]) if (item?.uniqueId) held.add(item.uniqueId);
    const trials = trialTiersCleared(state);   // each Trial tier cleared (data/trials.js)
    const count = stages + held.size + trials;
    return { stages, uniques: held.size, trials, count, mult: Math.pow(BASE.recordMult, count) };
}

/** Turn the modifier object into the numbers the combat system uses. */
export function deriveStats(state, mods = collectModifiers(state)) {
    const combatLevel = skillLevel(state, 'combat');
    const records = recordsOf(state);
    const bite = trialBite(state);   // the run's Trial, if any (data/trials.js)
    // what the tokens are worth, records counted (nothing in the Faithless Trial)
    const tokens = bite.noTokens ? 0 : (state.prestige.tokens || 0) * records.mult;
    const tokenLayerAtk = 1 + BASE.tokenAtk * tokens;
    const tokenLayerDef = 1 + BASE.tokenDef * tokens;
    const tokenLayerHp = 1 + BASE.tokenHp * tokens;

    // Camp upgrades: the run-scoped layer (reset on prestige).
    const camp = { atk: 1, def: 1, hp: 1 };
    if (!bite.noCamp) for (const upgrade of CAMP_UPGRADES) camp[upgrade.stat] *= campMultiplier(upgrade, state.camp?.[upgrade.id] || 0);

    const atk = (BASE.unarmedAtk + mods.gearAtk) * (1 + mods.atkMult) * tokenLayerAtk * camp.atk;
    const def = mods.gearDef * (1 + mods.defMult) * tokenLayerDef * camp.def;
    const maxHp = (BASE.baseHp + BASE.hpPerCombatLevel * (combatLevel - 1) + BASE.hpPerDef * mods.gearDef) * (1 + mods.hpMult) * tokenLayerHp * camp.hp * (bite.heroHp ?? 1);
    const attackSpeed = Math.min(BASE.caps.attackSpeed, mods.attackSpeed);

    return {
        combatLevel,
        atk: Math.round(atk),   // rounded, not cut: a new hero's first +5% (10 -> 10.5) shows as 11
        def: Math.round(def),
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
        tokenMult: (1 + mods.tokenMult) * starGain(state.ascension?.stars),   // Stars: every prestige pays more (data/ascension.js)
        stars: state.ascension?.stars || 0,
        farmYield: 1 + mods.farmYield,
        gildedMult: 1 + mods.gildedChance,   // how much more often gilded monsters come
        petMult: 1 + mods.petChance,         // how much likelier a pet is to find the hero
        skillSpeed: mods.skillSpeed,
        doubleChance: mods.doubleChance,
        tokenPowerPct: Math.round(BASE.tokenAtk * tokens * 100),
        records,
        campMult: camp,
        focused: !!mods.focused,
        bonfire: bonfireLit(state),
        event: mods.event || null
    };
}

/** Effective interval (ms) for an action of a skill; `extraSpeed` is the action's own (mastery). */
export function actionInterval(baseInterval, derived, skillId, extraSpeed = 0) {
    const speed = (derived.skillSpeed[skillId] || 0) + extraSpeed;
    return Math.max(250, Math.round(baseInterval / (1 + speed)));
}

export function potionInfo(id) {
    const res = RESOURCES[id];
    return res ? { id, name: res.name, desc: res.desc } : null;
}
