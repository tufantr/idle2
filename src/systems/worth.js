// What a change to the hero is worth, in stages at the wall that binds (the research loop's P-075 and P-091, 12 November
// 2026: past about stage 700 the Equip card credited armour with stages it doesn't give, a legendary plate +19 said and 0
// got at stage 1,000, and the dock offered it before a sword). One measure for every place a piece of gear or a camp
// level is judged: the Equip card and the dock's pick, the ▲ on a tile, Weaker, the bag's keep list and its order, the
// camp's tokens. Pure: it reads the state and the stats the game has worked out, and changes nothing.
//
// The hero stands at his wall: the boss of his best stage, with the camp he had when he last pushed it (`meta.wallCamp`,
// systems/combat.js) or this run's if it is more, the combat potion he picked running if he has one to drink, and Focus
// settled in, as a fight left to itself is. A change is worth
//  - at the boss's clock: ln(damage a second after ÷ before) over ln(the boss's health growth a stage), the damage
//    counting crits (Weak Spot's on a boss) and swing time (Flurry's sooner swings), as bossCanFall reckons a swing;
//  - at its blow, while the blow threatens (THREAT_SHARE of his health or more): how much harder the boss could hit for
//    the same share of his health, over ln(its attack growth a stage), defence counting only below the 90% cap
//    (core/formulas.js enemyDamage), health while it threatens;
// whichever moves more. Once a boss's blow is under a tenth of his health only the clock counts: deep, defence and health
// are numbers there and nothing more (research loop 047: from stage 1,300 no food, no defence ×0.1 to ×10 and no health
// ×0.5 to ×2 changed a stage reached). In Glass Hero, where the first blow that lands fells him, they count for nothing.

import { collectModifiers, deriveStats, potionEffects, BASE } from '../core/modifiers.js';
import { enemyForStage, MAX_MITIGATION } from '../core/formulas.js';
import { CAMP_UPGRADES, campMultiplier } from '../data/camp.js';
import { SMITHING_TYPES, TYPE_SLOTS } from '../data/items.js';
import { forgeMult } from '../data/workshop.js';
import { trialBite } from '../data/trials.js';
import { STAGES_PER_ZONE } from '../data/zones.js';

/** A boss's blow under this share of the hero's health doesn't threaten him: defence and health count for nothing there. */
export const THREAT_SHARE = 0.1;

/** The boss at the wall for a best stage: the first stage boss at or past it (bosses stand every STAGES_PER_ZONE stages). */
export const wallStage = best => Math.ceil(Math.max(1, Math.floor(Number(best) || 1)) / STAGES_PER_ZONE) * STAGES_PER_ZONE;

/**
 * The camp levels the hero has at his wall: each upgrade's levels when he last set a new best stage (`meta.wallCamp`), or
 * this run's, whichever is more. A save from before the mark has this run's.
 */
export function wallCampLevels(state) {
    const kept = state.meta?.wallCamp;
    return Object.fromEntries(CAMP_UPGRADES.map(u => [u.id, Math.max(Math.floor(Number(state.camp?.[u.id])) || 0, Math.floor(Number(kept?.[u.id])) || 0)]));
}

/** The hero as he fights at the wall: the camp `camp`, at the stages, the combat potion he picked running if he has one, settled into Focus. */
function atTheWall(state, camp) {
    const c = state.combat;
    const drinks = !!c.potion && c.potion !== 'none' && ((c.potionMs || 0) > 0 || (state.resources?.[c.potion] || 0) > 0);
    return {
        ...state,
        camp,
        combat: { ...c, mode: 'stages', potionMs: drinks ? Math.max(1, c.potionMs || 0) : 0 },
        meta: { ...state.meta, lastInputAt: -Infinity }
    };
}

/** What the camp multiplies attack, defence and health by, at these levels (nothing in the No Camp Trial). */
function campStats(state, levels) {
    const m = { atk: 1, def: 1, hp: 1 };
    if (trialBite(state).noCamp) return m;
    for (const u of CAMP_UPGRADES) m[u.stat] *= campMultiplier(u, levels[u.id] || 0);
    return m;
}

/** The bonuses on gear the measure reads: those that move the boss's clock or his health (dodge and lifesteal only keep him up, gold and XP pay). */
const FIGHT_BONUSES = new Set(['critChance', 'critDmg', 'attackSpeed', 'hpMult']);

/** A boss's blow, before the hero's own rules (Fortress): core/formulas.js enemyDamage, unrounded. */
const blowOf = (atk, def) => Math.max(atk * atk / (atk + Math.max(0, def)), atk * (1 - MAX_MITIGATION));

/**
 * The attack a boss would need to land `blow` on defence `def` (blowOf turned round): under the cap the root of
 * a² − blow·a − blow·def = 0, past it blow ÷ (1 − the cap).
 */
function attackFor(blow, def) {
    if (!(blow > 0)) return 0;
    if (!Number.isFinite(def)) return blow / (1 - MAX_MITIGATION);
    const edge = (1 - MAX_MITIGATION) ** 2 * Math.max(0, def) / MAX_MITIGATION;   // the blow where the cap starts to bind
    if (blow <= edge) return blow / (1 - MAX_MITIGATION);
    return (blow + Math.sqrt(blow * blow + 4 * blow * Math.max(0, def))) / 2;
}

/**
 * The judge of changes at the hero's wall. `given` is { mods, derived } for the state as it is (a Game: what its
 * recompute worked out), so nothing heavy is worked out again; the wall's camp, potion and Focus go in by ratio. Without
 * them, or in a clan fight (whose figures leave out a Trial, the banner and the talents), it works them out afresh, on
 * the first question asked: a judge nobody asks costs nothing. `camp`: 'wall' (gear, kept through every run: judged on
 * the camp the hero has at his wall) or 'run' (a camp level, this run's: judged on the camp bought so far).
 */
export function wallJudge(state, given = {}, { camp = 'wall' } = {}) {
    let base = null;
    const at = () => (base ||= wallBase(state, given, camp));
    const judge = {
        /** The wall's figures: { stage, best, gHp, gAtk, threat, survival, def, hp }. */
        get wall() { const b = at(); return { stage: b.stage, best: b.best, gHp: b.gHp, gAtk: b.gAtk, threat: b.threat, survival: b.survival, def: b.def, hp: b.hp }; },
        /** Stages a change is worth, from its ratios (a camp level's, or equipGain's). */
        stagesOf: r => at().stagesOf(r),
        /** What wearing `item` in `slot` does to him: { atk, def, hp, dps } as ratios (Infinity where he had none). */
        gain(item, slot = judge.place(item).slot) { return at().ratiosOf(at().delta(item, slot)); },
        /** Stages `item` is worth in `slot` (where an Equip puts it if none is named): Infinity for an empty slot. */
        worth(item, slot = null) {
            if (!slot) return judge.place(item).stages;
            if (!state.equipped?.[slot]) return Infinity;
            const b = at();
            return b.stagesOf(b.ratiosOf(b.delta(item, slot)));
        },
        /** Where an Equip puts `item`, and what it is worth there: { slot, stages }, an empty slot first (Infinity), else the slot where it is worth the most. */
        place(item) {
            const slots = TYPE_SLOTS[item?.type] || [];
            const empty = slots.find(s => !state.equipped?.[s]);
            if (empty) return { slot: empty, stages: Infinity };
            let pick = { slot: slots[0] || null, stages: -Infinity };
            for (const s of slots) {
                const w = judge.worth(item, s);
                if (w > pick.stages) pick = { slot: s, stages: w };
            }
            return pick;
        }
    };
    return judge;
}

/** The figures a judge works from (wallJudge): the hero's sums and stats at his wall, the boss there, and the measure. */
function wallBase(state, given, camp) {
    const c = state.combat;
    const levels = camp === 'run' ? Object.fromEntries(CAMP_UPGRADES.map(u => [u.id, state.camp?.[u.id] || 0])) : wallCampLevels(state);
    const wall = atTheWall(state, levels);
    let mods = given?.mods;
    let d = given?.derived;
    let def;
    let hp;
    let speed;
    if (mods && d && c.mode !== 'clan') {
        // the stats as they are, the wall put in: its camp and potion multiply defence and health, Focus adds swing speed
        const campNow = campStats(state, state.camp || {});
        const campWall = campStats(state, levels);
        const brewNow = mods.potions || potionEffects(state);
        const brewWall = potionEffects(wall);
        def = d.def * (campWall.def / campNow.def) * (brewWall.def / brewNow.def);
        hp = d.maxHp * (campWall.hp / campNow.hp) * (brewWall.hp / brewNow.hp);
        speed = mods.attackSpeed + (mods.focused ? 0 : BASE.focusAttackSpeed);
    } else {
        mods = collectModifiers(wall);
        d = deriveStats(wall, mods);
        def = d.def;
        hp = d.maxHp;
        speed = mods.attackSpeed;
    }
    const fx = d.talents || {};
    const bite = trialBite(state);
    const share = bite.gear ?? 1;   // Rusted Gear: a quarter of what gear gives (collectModifiers)
    const best = Math.max(1, c.bestStage || 1);
    const stage = wallStage(best);
    const boss = enemyForStage(stage);
    const next = enemyForStage(stage + STAGES_PER_ZONE);
    const gHp = Math.pow(next.hp / boss.hp, 1 / STAGES_PER_ZONE);     // the boss's health a stage further on
    const gAtk = Math.pow(next.atk / boss.atk, 1 / STAGES_PER_ZONE);   // and its attack
    const bossAtk = boss.atk * (bite.enemyAtk || 1);
    const soften = 1 - (fx.fortress || 0);
    const threat = bite.oneBlow ? 0 : blowOf(bossAtk, def) * soften / Math.max(1, hp);
    const survival = !bite.oneBlow && threat >= THREAT_SHARE;
    const hpBase = BASE.baseHp + BASE.hpPerCombatLevel * ((d.combatLevel || 1) - 1);
    const atk0 = BASE.unarmedAtk + mods.gearAtk;

    /** A swing's worth a second at the boss, for these bonuses (the shares the pipeline adds up: core/modifiers.js). */
    const rate = (critChance, critDmg, attackSpeed) => {
        const cc = Math.min(BASE.caps.critChance, BASE.baseCritChance + critChance);
        const cd = (BASE.baseCritDmg + critDmg) * (1 + (fx.weakSpot || 0));
        const interval = Math.max(BASE.minAttackInterval, Math.round(BASE.baseAttackInterval / (1 + Math.max(0, Math.min(BASE.caps.attackSpeed, attackSpeed)))));
        return (1 + cc * (cd - 1)) / (interval * (1 - cc * (fx.flurry || 0)));
    };
    const rate0 = rate(mods.critChance, mods.critDmg, speed);

    /** Stages a change is worth, from its ratios (`r`: 0.38 is +38%, as equipGain gives them; `dps` the damage a second, else `atk`). */
    const stagesOf = r => {
        const rDps = 1 + (r.dps ?? r.atk ?? 0);
        const clock = Math.log(Math.max(1e-12, rDps)) / Math.log(gHp);
        if (!survival) return clock;
        const h1 = hp * (1 + (r.hp || 0));
        const d1 = def * (1 + (r.def || 0));
        // the blow he could take at the same share of his health, and the boss's attack that would land it
        const blow = blowOf(bossAtk, def) * h1 / hp;
        const blowStages = Math.log(Math.max(1e-12, attackFor(blow, d1) / bossAtk)) / Math.log(gAtk);
        return Math.abs(clock) >= Math.abs(blowStages) ? clock : blowStages;
    };

    /** What `item` in `slot` changes in the pipeline's sums (its attack and defence with the slot's levels, its bonuses). */
    const delta = (item, slot) => {
        const worn = state.equipped?.[slot] || null;
        const out = { atk: 0, def: 0, critChance: 0, critDmg: 0, attackSpeed: 0, hpMult: 0 };
        if (!share) return out;
        const m = forgeMult((SMITHING_TYPES.includes(slot) ? state.forge : state.bench)?.[slot]?.level) * share;
        out.atk = ((item?.atk || 0) - (worn?.atk || 0)) * m;
        out.def = ((item?.def || 0) - (worn?.def || 0)) * m;
        for (const a of item?.affixes || []) if (FIGHT_BONUSES.has(a.stat)) out[a.stat] += a.value * share;
        for (const a of worn?.affixes || []) if (FIGHT_BONUSES.has(a.stat)) out[a.stat] -= a.value * share;
        return out;
    };

    /** The ratios a change of the sums makes (as equipGain's: atk, def, hp, and dps, the damage a second). */
    const ratiosOf = x => {
        const atk = (atk0 + x.atk) / atk0;
        const defR = mods.gearDef > 0 ? (mods.gearDef + x.def) / mods.gearDef : x.def > 0 ? Infinity : 1;
        const hpR = ((hpBase + BASE.hpPerDef * (mods.gearDef + x.def)) * (1 + mods.hpMult + x.hpMult)) / ((hpBase + BASE.hpPerDef * mods.gearDef) * (1 + mods.hpMult));
        const dps = atk * rate(mods.critChance + x.critChance, mods.critDmg + x.critDmg, speed + x.attackSpeed) / rate0;
        return { atk: atk - 1, def: defR - 1, hp: hpR - 1, dps: dps - 1 };
    };

    return { stage, best, gHp, gAtk, threat, survival, def, hp, stagesOf, delta, ratiosOf };
}

// The judge of a Game's state, kept until its stats are worked out again (Game.recompute makes a new `derived`) or the
// wall's own inputs move: the screens ask it many times a frame, and of the bag's every piece.
const kept = new WeakMap();
const wallKey = state => {
    const c = state.combat;
    return [c.bestStage, c.mode, c.potion, c.potionMs > 0, state.resources?.[c.potion] > 0, (state.trials?.active || []).join('+'),
        ...CAMP_UPGRADES.map(u => `${state.camp?.[u.id] || 0}/${state.meta?.wallCamp?.[u.id] || 0}`),
        ...Object.values(state.equipped || {}).map(i => i?.id ?? '')].join('|');
};

/** The wall's judge for a Game (or anything with `state`, `mods` and `derived`), the same one while nothing it reads has moved. */
export function judgeOf(game) {
    const d = game?.derived;
    if (!d || !game.mods) return wallJudge(game.state);
    const key = wallKey(game.state);
    const hit = kept.get(d);
    if (hit && hit.key === key && hit.state === game.state) return hit.judge;
    const judge = wallJudge(game.state, game);
    kept.set(d, { key, state: game.state, judge });
    return judge;
}

/** Note the camp that pushed the wall: on each new best stage (systems/combat.js), but not in No Camp, whose camp stays packed. */
export function noteWallCamp(state) {
    if (trialBite(state).noCamp) return;
    state.meta.wallCamp = Object.fromEntries(CAMP_UPGRADES.map(u => [u.id, state.camp?.[u.id] || 0]));
}
