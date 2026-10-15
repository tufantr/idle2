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
import { NON_COMBAT_SKILLS, SPEED_SKILLS, SKILL_IDS } from '../data/skills.js';
import { TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER } from '../data/workshop.js';
import { RESOURCES } from '../data/resources.js';
import { POTIONS, POTION_KINDS, potionPower } from '../data/potions.js';
import { CAMP_UPGRADES, campMultiplier } from '../data/camp.js';
import { PETS } from '../data/pets.js';
import { DUNGEONS, DUNGEON_MILESTONES, TITAN_BONUS, titanBonusUnits } from '../data/dungeons.js';
import { trialBite, trialTiersCleared, laurelsOf } from '../data/trials.js';
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
    // ... and so does every 50 levels in the skills together (all but Combat): every level a skill gains makes
    // the hero stronger, through every prestige (the owner, October 2026: players fought and never trained, as
    // nothing a skill's level did reached the fight; with lifesteal's ceiling below, the simulator's skilling
    // player keeps his pace and one who never trains falls behind)
    recordSkillLevels: 50,
    // Legacy (the endless climb, docs/research_notes/endless-late-game.md §5): every prestige ever made multiplies
    // attack, defence and health by 1 + this, for good (an Ascension keeps it). A layer of its own, so a late
    // prestige adds as much as an early one did, where a token adds less as the stock grows.
    legacyPerPrestige: 0.002,
    baseOfflineHours: 24,       // a day: a player who comes back once a day loses nothing (12 until the check-in research)
    // eat below a quarter of max health: a dish heals a share of it, and a line at half ate through a stock in
    // minutes for little (the simulator: a quarter makes food worth its cooking, half doesn't)
    baseAutoEatThreshold: 0.25,
    // Focus: after a minute without input the hero settles in (Clicker Heroes' idle ancients).
    // It also applies to offline progress, so idle play is never strictly worse than clicking.
    focusAfterMs: 60000,
    focusSkillSpeed: 0.15,
    focusAttackSpeed: 0.15,
    // Bonfire: every log burnt adds time; while it burns, all skills (combat too) earn more XP, and every
    // gathering and production action may make two (the owner, October 2026: XP alone went unnoticed).
    bonfireXp: 0.05,            // at firemaking level 1 ...
    bonfireXpAt99: 0.10,        // ... rising to this at 99
    bonfireDouble: 0.05,        // the chance of a second of what an action makes, at firemaking level 1 ...
    bonfireDoubleAt99: 0.20,    // ... rising to this at 99
    bonfireSecondsPerLogTier: 15,
    bonfireMaxMs: 60 * 60 * 1000,
    // Lifesteal heals at most this share of max health a second, all of it together (and only from damage a
    // monster really took). Monsters have about twenty times the hero's health, so with no ceiling 5% of
    // lifesteal healed 1.4 times what a stage-140 hero took and food was never eaten (the owner, October
    // 2026: lifesteal left no need for food or potions). Easy fights still heal themselves; at the frontier,
    // where monsters take 10-17% of his health a second, food and potions carry him.
    lifestealPerSecond: 0.03,
    caps: { critChance: 0.75, dodge: 0.6, lifesteal: 0.3, attackSpeed: 1.0 }
};

/** XP bonus of a burning bonfire at this firemaking level. */
export function bonfireBonus(level) {
    return BASE.bonfireXp + (BASE.bonfireXpAt99 - BASE.bonfireXp) * Math.min(99, Math.max(1, level)) / 99;
}

/** A burning bonfire's chance of a double, at this firemaking level, in every skill whose actions make something. */
export function bonfireDouble(level) {
    return BASE.bonfireDouble + (BASE.bonfireDoubleAt99 - BASE.bonfireDouble) * Math.min(99, Math.max(1, level)) / 99;
}
const BONFIRE_DOUBLES = SPEED_SKILLS.filter(id => !['firemaking', 'farming', 'agility'].includes(id));   // (its own logs, the plots and the course aside)

export function bonfireLit(state, now = state.meta.lastActiveAt || Date.now()) {
    return (state.bonfire?.until || 0) > now;
}

/** True once the player has left the game alone for `focusAfterMs`. */
export function isFocused(state, now = state.meta.lastActiveAt || Date.now()) {
    const lastInput = state.meta.lastInputAt ?? now;
    return now - lastInput >= BASE.focusAfterMs;
}


function emptyMods() {
    const skillSpeed = {};
    const doubleChance = {};
    for (const id of SPEED_SKILLS) { skillSpeed[id] = 0; doubleChance[id] = 0; }
    return {
        skillMult: {},   // per skill, multiplying its speed after every bonus (a mini-game's ×2)
        gearAtk: 0, gearDef: 0,
        atkMult: 0, defMult: 0, hpMult: 0,
        critChance: 0, critDmg: 0, attackSpeed: 0, dodge: 0, lifesteal: 0,
        goldMult: 0, dropMult: 0, combatXpMult: 0, xpMult: 0,
        skillSpeed, doubleChance,
        foodMult: 0, autoEatThreshold: 0, potionDuration: 0, offlineHours: 0,
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

/**
 * What the potions working now do (data/potions.js): multipliers (atk, def, hp, speed, xp). The fight's is the
 * pick of the place he fights in, while its dose lasts: the dungeon potion in a run, the combat potion on the
 * stages, against the Titan and against the clan boss (the server, reckoning a clan attack from the stored hero,
 * counts one picked with a bottle left, as the fight drinks it at its start: core/power.js). The skill potion
 * likewise while he works.
 */
export function potionEffects(state) {
    const e = { atk: 1, def: 1, hp: 1, speed: 1, xp: 1 };
    const c = state.combat || {};
    const inRun = c.mode === 'dungeon';
    const id = inRun ? c.dungeonPotion : c.potion;
    const running = (inRun ? c.dungeonPotionMs : c.potionMs) > 0 || (c.mode === 'clan' && state.resources?.[id] > 0);
    const power = running ? potionPower(id, inRun ? 'dungeon' : 'combat') : 0;
    if (power > 0) e.atk = e.def = e.hp = 1 + power;
    const work = state.workPotion?.id;
    if (POTIONS[work]?.kind === 'skill' && state.workPotion.ms > 0) {
        const t = POTIONS[work].tier - 1;
        e.speed = 1 + POTION_KINDS.skill.speed[t];
        e.xp = 1 + POTION_KINDS.skill.xp[t];
    }
    return e;
}

/** Collect every bonus source into a flat modifier object. */
export function collectModifiers(state) {
    const mods = emptyMods();

    // Equipment: base stats scaled by upgrade level, plus affixes (all of it times a Trial's `gear`,
    // nothing in Rusted Gear: data/trials.js). Not in the clan boss fight, which leaves the Trial out.
    const gearShare = state.combat.mode === 'clan' ? 1 : trialBite(state).gear ?? 1;
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

    // The clan boss fight is fought by the hero the server reckons it with (core/power.js stableState): no
    // potion, no Focus, no Trial's rule. With them the boss could fall on screen and stand on the server.
    // Potions (data/potions.js): they multiply, after every other bonus (deriveStats); the skill potion's speed here.
    mods.potions = potionEffects(state);

    // Tools.
    for (const [toolId, tool] of Object.entries(TOOLS)) {
        const tier = state.tools[toolId] || 0;
        if (!tier) continue;
        mods.skillSpeed[tool.skill] += TOOL_SPEED_PER_TIER * tier;
        mods.doubleChance[tool.skill] += TOOL_DOUBLE_PER_TIER * tier;
    }

    // Mini-game boosts (timed, per skill) and the work potion: they multiply a skill's speed, after every
    // other bonus, in every skill but Farming (its plots grow on the clock).
    const now = state.meta.lastActiveAt || Date.now();
    for (const id of SPEED_SKILLS) {
        if (id === 'farming') continue;
        const mg = state.minigame[id];
        const boost = mg && mg.boostUntil > now ? Math.max(1, mg.mult || 1) : 1;
        const m = boost * mods.potions.speed;
        if (m !== 1) mods.skillMult[id] = m;
    }

    // The bonfire: more XP everywhere, and doubles where actions make something.
    if (bonfireLit(state, now)) {
        const fm = skillLevel(state, 'firemaking');
        mods.xpMult += bonfireBonus(fm);
        for (const id of BONFIRE_DOUBLES) mods.doubleChance[id] += bonfireDouble(fm);
    }

    // A running weekend event.
    const ev = eventStatus(state, now);
    mods.event = ev.active ? ev.event.id : null;
    if (ev.active) addMods(mods, ev.event.mods);

    // Focus (idle bonus). Not farming: plots are planted with a click, so focus could never apply.
    mods.focused = isFocused(state, now);
    if (mods.focused) {
        for (const id of Object.keys(mods.skillSpeed)) if (id !== 'farming') mods.skillSpeed[id] += BASE.focusSkillSpeed;
        if (state.combat.mode !== 'clan') mods.attackSpeed += BASE.focusAttackSpeed;   // (the clan fight is watched, and the server counts no Focus)
    }

    return mods;
}

const RECORDS_CAP = 2000;

const TRAINED_SKILLS = SKILL_IDS.filter(id => id !== 'combat');

/** The levels of every skill but Combat, added up (each BASE.recordSkillLevels of them is a record). */
export function skillLevelsTotal(state) {
    return TRAINED_SKILLS.reduce((n, id) => n + skillLevel(state, id), 0);
}

/** The hero's records: { stages, uniques, skills, count, mult } — 25-stage steps of the best stage, dungeon uniques held, 50-level steps of the skills. */
export function recordsOf(state) {
    const stages = Math.floor((state.combat?.bestStage || 1) / BASE.recordStages);
    const skills = Math.floor(skillLevelsTotal(state) / BASE.recordSkillLevels);
    const held = new Set();
    for (const item of [...(state.inventory || []), ...Object.values(state.equipped || {})]) if (item?.uniqueId) held.add(item.uniqueId);
    const trials = trialTiersCleared(state);   // each Trial tier cleared (data/trials.js)
    const laurels = laurelsOf(state);          // and each week's Trial beaten
    const count = stages + held.size + trials + laurels + skills;
    // (counted up to RECORDS_CAP for the power: far past any hero's, and short of where 1.05^count stops being a number)
    return { stages, uniques: held.size, trials, laurels, skills, count, mult: Math.pow(BASE.recordMult, Math.min(count, RECORDS_CAP)) };
}

/** What the hero's Legacy multiplies attack, defence and health by: every prestige ever made (BASE.legacyPerPrestige). */
export function legacyMult(state) {
    return Math.pow(1 + BASE.legacyPerPrestige, Math.max(0, state.prestige?.count || 0));
}

/** Turn the modifier object into the numbers the combat system uses. */
export function deriveStats(state, mods = collectModifiers(state)) {
    const combatLevel = skillLevel(state, 'combat');
    const records = recordsOf(state);
    const bite = state.combat.mode === 'clan' ? {} : trialBite(state);   // the run's Trial, if any (data/trials.js); not in the clan fight
    // what the tokens are worth, records counted (nothing in the Faithless Trial)
    const held = state.prestige.tokens || 0;
    const tokens = bite.noTokens || !(held > 0) ? 0 : held * records.mult;
    const tokenLayerAtk = 1 + BASE.tokenAtk * tokens;
    const tokenLayerDef = 1 + BASE.tokenDef * tokens;
    const tokenLayerHp = 1 + BASE.tokenHp * tokens;

    // Camp upgrades: the run-scoped layer (reset on prestige).
    const camp = { atk: 1, def: 1, hp: 1 };
    if (!bite.noCamp) for (const upgrade of CAMP_UPGRADES) camp[upgrade.stat] *= campMultiplier(upgrade, state.camp?.[upgrade.id] || 0);

    const brew = mods.potions || potionEffects(state);
    const legacy = legacyMult(state);
    const atk = (BASE.unarmedAtk + mods.gearAtk) * (1 + mods.atkMult) * tokenLayerAtk * camp.atk * brew.atk * legacy;
    const def = mods.gearDef * (1 + mods.defMult) * tokenLayerDef * camp.def * brew.def * legacy;
    const maxHp = (BASE.baseHp + BASE.hpPerCombatLevel * (combatLevel - 1) + BASE.hpPerDef * mods.gearDef) * (1 + mods.hpMult) * tokenLayerHp * camp.hp * brew.hp * (bite.heroHp ?? 1) * legacy;
    // nothing makes the hero slower than his base (a hand-made affix below nothing made him never swing, or swing at the cap)
    const attackSpeed = Math.max(0, Math.min(BASE.caps.attackSpeed, mods.attackSpeed));

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
        skillXpMult: brew.xp,   // a skill potion's: skill XP only (systems/skilling.js)
        combatXpMult: 1 + mods.combatXpMult + mods.xpMult,
        xpMult: 1 + mods.xpMult,
        foodMult: 1 + mods.foodMult,
        autoEatThreshold: Math.min(0.9, BASE.baseAutoEatThreshold + mods.autoEatThreshold),
        potionDuration: 1 + mods.potionDuration,   // how long a dose lasts, as a share of POTION_MINUTES (the Alchemist medal: longer)
        offlineMs: (BASE.baseOfflineHours + mods.offlineHours) * 3600 * 1000,
        boostDurationMult: 1 + mods.boostDuration,
        craftQuality: mods.craftQuality,
        tokenMult: (1 + mods.tokenMult) * starGain(state.ascension?.stars),   // Stars: every prestige pays more (data/ascension.js)
        stars: state.ascension?.stars || 0,
        farmYield: 1 + mods.farmYield,
        gildedMult: 1 + mods.gildedChance,   // how much more often gilded monsters come
        petMult: 1 + mods.petChance,         // how much likelier a pet is to find the hero
        skillSpeed: mods.skillSpeed,
        skillMult: mods.skillMult,
        doubleChance: mods.doubleChance,
        tokenPowerPct: Math.round(BASE.tokenAtk * tokens * 100),
        records,
        legacy,
        campMult: camp,
        focused: !!mods.focused,
        bonfire: bonfireLit(state),
        event: mods.event || null
    };
}

/** Effective interval (ms) for an action of a skill; `extraSpeed` is the action's own (mastery). */
export function actionInterval(baseInterval, derived, skillId, extraSpeed = 0) {
    const speed = Math.max(0, (derived.skillSpeed[skillId] || 0) + extraSpeed);   // never slower than the base
    return Math.max(250, Math.round(baseInterval / ((1 + speed) * (derived.skillMult?.[skillId] || 1))));
}

