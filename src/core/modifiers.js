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
import { POTIONS, potionStrength } from '../data/potions.js';
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
    baseOfflineHours: 24,       // a day: a player who comes back once a day loses nothing (12 until the check-in research)
    // eat below a quarter of max health: a dish heals a share of it, and a line at half ate through a stock in
    // minutes for little (the simulator: a quarter makes food worth its cooking, half doesn't)
    baseAutoEatThreshold: 0.25,
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
 * What the potions working now do (data/potions.js): multipliers (atk, def, hp, fortune, speed, xp) and a
 * dodge chance. The fight potion only while its dose lasts, and never in the clan boss's fight; the work
 * potion likewise. Their strength grows with Alchemy.
 */
export function potionEffects(state, clanFight = state.combat?.mode === 'clan') {
    const e = { atk: 1, def: 1, hp: 1, fortune: 1, speed: 1, xp: 1, dodge: 0 };
    const alchemy = skillLevel(state, 'alchemy');
    const apply = id => {
        const p = POTIONS[id];
        const s = potionStrength(id, alchemy);
        if (p.effect === 'dodge') e.dodge += s; else e[p.effect] *= 1 + s;
    };
    const fight = state.combat?.potion;
    if (!clanFight && POTIONS[fight]?.use === 'fight' && state.combat.potionMs > 0) apply(fight);
    const work = state.workPotion?.id;
    if (POTIONS[work]?.use === 'work' && state.workPotion.ms > 0) apply(work);
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
    const clanFight = state.combat.mode === 'clan';

    // Potions (data/potions.js): they multiply, after every other bonus (deriveStats); the work potion's speed here.
    mods.potions = potionEffects(state, clanFight);

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
        if (!clanFight) mods.attackSpeed += BASE.focusAttackSpeed;
    }

    return mods;
}

const RECORDS_CAP = 2000;

/** The hero's records: { stages, uniques, count, mult } — 25-stage steps of the best stage, dungeon uniques held. */
export function recordsOf(state) {
    const stages = Math.floor((state.combat?.bestStage || 1) / BASE.recordStages);
    const held = new Set();
    for (const item of [...(state.inventory || []), ...Object.values(state.equipped || {})]) if (item?.uniqueId) held.add(item.uniqueId);
    const trials = trialTiersCleared(state);   // each Trial tier cleared (data/trials.js)
    const laurels = laurelsOf(state);          // and each week's Trial beaten
    const count = stages + held.size + trials + laurels;
    // (counted up to RECORDS_CAP for the power: far past any hero's, and short of where 1.05^count stops being a number)
    return { stages, uniques: held.size, trials, laurels, count, mult: Math.pow(BASE.recordMult, Math.min(count, RECORDS_CAP)) };
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
    const atk = (BASE.unarmedAtk + mods.gearAtk) * (1 + mods.atkMult) * tokenLayerAtk * camp.atk * brew.atk;
    const def = mods.gearDef * (1 + mods.defMult) * tokenLayerDef * camp.def * brew.def;
    const maxHp = (BASE.baseHp + BASE.hpPerCombatLevel * (combatLevel - 1) + BASE.hpPerDef * mods.gearDef) * (1 + mods.hpMult) * tokenLayerHp * camp.hp * brew.hp * (bite.heroHp ?? 1);
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
        dodge: Math.min(BASE.caps.dodge, mods.dodge + brew.dodge),
        lifesteal: Math.min(BASE.caps.lifesteal, mods.lifesteal),
        goldMult: (1 + mods.goldMult) * brew.fortune,
        dropMult: (1 + mods.dropMult) * brew.fortune,
        skillXpMult: brew.xp,   // a work potion's: skill XP only (systems/skilling.js)
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

