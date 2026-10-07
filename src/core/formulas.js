// Every balance formula in one place. tools/simulate.mjs exercises these headlessly;
// change a constant here and re-run the simulator to see the pacing move.

import { AUTHORED_STAGES, zoneForStage, isBossStage, STAGES_PER_ZONE } from '../data/zones.js';
import { RARITIES, AFFIXES, SLOT_STATS, STAT_UNIT, TYPE_NAMES, TYPE_ICONS, CRAFTING_TYPES, GEAR_TIERS, MAX_GEAR_TIER, DROP_TIER_OFFSETS, DROP_TYPE_WEIGHTS, DROP_RARITY_WEIGHTS, DROP_HIGH_RARITY_PER_TIER, JEWEL_POWER, JEWEL_DROP_MIN_RANK } from '../data/items.js';
import { rng } from './rng.js';

export const BALANCE = {
    enemy: {
        baseHp: 25,
        hpGrowth: 1.075,        // per stage inside the authored 100 stages (x2.06 per zone)
        abyssHpGrowth: 1.085,   // per stage beyond stage 100
        baseAtk: 5,
        atkGrowth: 1.065,
        abyssAtkGrowth: 1.075,
        bossHpMult: 3,
        bossAtkMult: 1.6,
        baseInterval: 2200,     // ms between enemy attacks at stage 1
        intervalPerStage: 8,    // ms faster per stage
        minInterval: 1300,
        // A gentle start (docs/research_notes/first-session.md): on the first stages the monsters hit at
        // `atk` and have `hp` of their figures at stage 1, rising evenly to the full figures after stage
        // `to`. A new hero, unarmed at level 1, wins his first fights while the player only watches,
        // meets the first boss within the first minute and beats it. Gold is paid on the full figures.
        ease: { to: 30, atk: 0.3, hp: 0.6 }
    },
    rewards: {
        goldPerHp: 0.25,        // gold per kill = enemy max HP * this (Clicker Heroes uses HP/15 on a steeper curve)
        bossGoldMult: 3,
        xpBase: 3,              // combat XP per kill = xpBase * stage^xpExp
        xpExp: 1.05,
        bossXpMult: 5,
        // The first combat levels come quickly: a kill's XP is tripled at level 1, the bonus shrinking
        // evenly to none at level `below` (a level-up every 10-20 s in the first minutes).
        fastStart: { below: 10, extra: 2 },
        // Melvor pace for Combat: up to combat level `from` a kill gives its full XP, from level `to`
        // on its XP divided by `slow`, evenly in between. By the hero's level, not the monster's
        // stage, so a deeper stage always pays more (paced by stage, stage 30 paid the most per kill),
        // and the levels that open tier 5 gear (60) come as quickly as ever. The skills are paced
        // by their actions instead (data/pace.js).
        xpPace: { from: 60, to: 95, slow: 25 },
        materialDropChance: 0.35,
        gemDropChance: 0.03,
        essenceDropChance: 0.10,
        bossEssence: [3, 6],
        // Gilded monsters (a variable reward, docs/research_notes/game-feel.md §2): now and then a
        // regular monster of the stage ladder comes gilded. The same fight, for five times the gold,
        // twice the XP, and a gem and some essence for certain.
        gildedChance: 1 / 150,
        gildedGoldMult: 5,
        gildedXpMult: 2,
        gildedEssence: [3, 6]
    },
    prestige: {
        minStage: 10,
        // tokens = floor(((maxStage - tokenOffset) / tokenDivisor) ^ tokenExp). Polynomial on purpose:
        // a currency that grows as fast as enemy HP compounds into a runaway (verified with the simulator).
        tokenOffset: 5,
        tokenDivisor: 5,
        tokenExp: 1.5,
        startStageFraction: 0.10,
        minRunMs: 10 * 60 * 1000,   // a run lasts at least this long before it can be prestiged
        fullRunFraction: 0.5,       // the per-prestige skill point needs a run this share of your best
        spPerPrestige: 1,
        spStageStep: 25,        // +1 SP for every 25 stages of all-time best, claimed once
        // The earned auto-prestige: after `autoAfter` prestiges, or `autoAfterMs` after the first one
        // (whichever comes first), a switch in the fight's dock prestiges a run that has spent
        // `autoStallMs` climbing without a new best stage (systems/prestige.js). It took 20 prestiges
        // until the check-in research found that a player who visits three times a day earned it only
        // on day 8, his runs sitting at their wall for 86-97% of his time away, and one who visits once a
        // day never (robust-and-fun/C_sessions_players.md §6).
        autoAfter: 5,
        autoAfterMs: 48 * 3600 * 1000,
        autoStallMs: 10 * 60 * 1000
    },
    // Deep in the Abyss drops keep pace with the monsters: past `dropScalingFrom`, every depth makes
    // dropped gear `dropGrowth` times stronger (an item level). Monsters grow ~2.26x per depth, so the
    // climb slows but never stops. 1.8 until armour gave health (BASE.hpPerDef): with the hero no longer
    // killed by any hit past stage ~170, 1.6 held stage 200 at ~48 h; 1.45 since the anvil and the records
    // made a deep hero stronger (with tokens at 0.4%: tools/simulate.mjs, DESIGN §5.2).
    abyss: {
        dropScalingFrom: 5,
        dropGrowth: 1.45
    },
    combat: {
        regenInCombat: 0.001,   // fraction of max HP per second while fighting (Melvor: 1% per 10 s)
        regenResting: 0.02,     // fraction of max HP per second out of combat (full in under a minute)
        manualHitMult: 0.5,
        comboDmgPerStack: 0.03,
        comboMax: 30,
        comboDecayAfterMs: 1500,
        deathHpFraction: 0.5,
        retreatStages: 1,
        bossTimeMs: 30000,      // a boss must fall within 30 s of fighting (Clicker Heroes / Tap Titans rule)
        regroupMs: 60000        // after a boss escapes: farm the previous stage for a minute, then retry
    },
    minigame: {
        opportunityEveryMs: [180000, 360000], // a chance appears every 3-6 minutes of active skilling
        opportunityWindowMs: 20000,
        boostMs: 90000,
        baseBonus: 0.35,
        streakBonus: 0.05,
        maxBonus: 0.55         // reached on a 5-win streak
    }
};

// ---------- Enemies ----------

/** HP, ATK and attack interval of a regular (non-boss) enemy at `stage`. Dungeons and the Titan build on it. */
export function enemyBaseStats(stage) {
    const e = BALANCE.enemy;
    let hp;
    let atk;
    if (stage <= AUTHORED_STAGES) {
        hp = e.baseHp * Math.pow(e.hpGrowth, stage - 1);
        atk = e.baseAtk * Math.pow(e.atkGrowth, stage - 1);
    } else {
        const extra = stage - AUTHORED_STAGES;
        hp = e.baseHp * Math.pow(e.hpGrowth, AUTHORED_STAGES - 1) * Math.pow(e.abyssHpGrowth, extra);
        atk = e.baseAtk * Math.pow(e.atkGrowth, AUTHORED_STAGES - 1) * Math.pow(e.abyssAtkGrowth, extra);
    }
    return { hp, atk, interval: Math.max(e.minInterval, e.baseInterval - e.intervalPerStage * Math.min(stage, 120)) };
}

export function enemyForStage(stage) {
    const zone = zoneForStage(stage);
    const boss = isBossStage(stage);
    const e = BALANCE.enemy;
    let { hp, atk, interval } = enemyBaseStats(stage);
    if (boss) { hp *= e.bossHpMult; atk *= e.bossAtkMult; }
    const worth = Math.floor(hp);   // what it pays for (gold, a farmed boss's loot): its full health
    const t = Math.min(1, (stage - 1) / e.ease.to);
    hp *= e.ease.hp + (1 - e.ease.hp) * t;
    atk *= e.ease.atk + (1 - e.ease.atk) * t;
    const name = boss ? zone.boss : zone.monsters[(stage - 1) % zone.monsters.length];
    return {
        name: boss ? `${name} (Boss)` : name,
        baseName: name,
        icon: zone.icons[name] || '👾',
        zoneName: zone.name,
        zoneTier: zone.tier,
        stage,
        boss,
        hp: Math.floor(hp),
        maxHp: Math.floor(hp),
        ...(worth > Math.floor(hp) ? { worth } : {}),
        atk: Math.max(1, Math.floor(atk)),
        interval
    };
}

/**
 * Damage an enemy attack deals after the player's defence. Rating-based: DEF equal to enemy ATK
 * halves it, and mitigation is capped at 90% so bosses stay dangerous (Melvor caps at 95%).
 */
export const MAX_MITIGATION = 0.9;
export function enemyDamage(enemyAtk, playerDef) {
    if (enemyAtk <= 0) return 0;
    const mitigated = enemyAtk * enemyAtk / (enemyAtk + Math.max(0, playerDef));
    return Math.max(1, Math.round(Math.max(mitigated, enemyAtk * (1 - MAX_MITIGATION))));
}

// ---------- Rewards ----------

export function goldForKill(enemy, goldMult = 1) {
    const r = BALANCE.rewards;
    const base = (enemy.worth || enemy.maxHp) * r.goldPerHp * (enemy.boss ? r.bossGoldMult : 1);
    return Math.max(1, Math.round(base * goldMult));
}

/** How much combat XP is divided at combat level `level` (Melvor pace; 1 = not at all). */
export function combatXpPace(level) {
    const p = BALANCE.rewards.xpPace;
    return 1 + (p.slow - 1) * Math.max(0, Math.min(1, (level - p.from) / (p.to - p.from)));
}

/** Combat XP for defeating `enemy`, for a hero of combat level `level`. */
export function combatXpForKill(enemy, xpMult = 1, level = 1) {
    const r = BALANCE.rewards;
    const base = r.xpBase * Math.pow(enemy.stage, r.xpExp) * (enemy.boss ? r.bossXpMult : 1);
    const fast = 1 + r.fastStart.extra * Math.max(0, r.fastStart.below - level) / (r.fastStart.below - 1);
    return Math.max(1, Math.round(base * xpMult * fast / combatXpPace(level)));
}

// ---------- Prestige ----------

export function tokensForStage(maxStage, tokenMult = 1) {
    const p = BALANCE.prestige;
    if (maxStage < p.minStage) return 0;
    return Math.floor(Math.pow((maxStage - p.tokenOffset) / p.tokenDivisor, p.tokenExp) * tokenMult);
}

/** Gold earned by one kill at the player's best stage: the unit for gold prices that must keep pace with inflation. */
/**
 * Gold for a regular kill at `stage`: the yardstick for prices and payouts. A boss stage prices like
 * its regular monsters (a boss's 3x health and 3x gold made everything ~9x dearer while you were
 * stuck at one).
 */
export function goldPerKillAtStage(stage, goldMult = 1) {
    return goldForKill({ maxHp: Math.floor(enemyBaseStats(Math.max(1, stage)).hp), boss: false }, goldMult);
}

export function prestigeStartStage(bestStage) {
    return Math.max(1, Math.floor(bestStage * BALANCE.prestige.startStageFraction));
}

/** Skill points owed for reaching `bestStage` given the last stage SP was claimed for. */
export function skillPointsForStages(bestStage, claimedStage) {
    const step = BALANCE.prestige.spStageStep;
    return Math.max(0, Math.floor(bestStage / step) - Math.floor(claimedStage / step));
}

// ---------- Equipment generation ----------

/**
 * Roll a rarity. `weights` (common..legendary) overrides the crafting weights; `maxRarity` caps the
 * result; `qualityBonus` (Master Smith etc.) shifts weight from common toward the rest.
 */
export function rollRarity({ qualityBonus = 0, weights = null, maxRarity = null } = {}) {
    const maxIndex = maxRarity ? RARITIES.findIndex(r => r.id === maxRarity) : RARITIES.length - 1;
    const entries = RARITIES.map((r, i) => {
        let weight = weights ? weights[i] : r.weight;
        weight *= i === 0 ? Math.max(0.2, 1 - qualityBonus * 4) : 1 + qualityBonus * 4;
        return { ...r, weight: i > maxIndex ? 0 : weight };
    });
    return rng.weighted(entries);
}

function rollAffixes(count, tier) {
    const pool = [...AFFIXES];
    const affixes = [];
    for (let i = 0; i < count && pool.length; i++) {
        const idx = Math.floor(rng.random() * pool.length);
        const [affix] = pool.splice(idx, 1);
        const tierScale = 1 + 0.08 * (tier - 1);
        const value = rng.float(affix.min, affix.max) * tierScale;
        affixes.push({ id: affix.id, name: affix.name, stat: affix.stat, value: Math.round(value * 1000) / 1000, format: affix.format });
    }
    return affixes;
}

/**
 * Create an equipment item.
 * @param {object} opts { type, tier, power, materialName, gemName?, qualityBonus?, rarityWeights?,
 *                        maxRarity?, rarity?, source, materials? }
 */
export function generateEquipment(opts, nextId) {
    const rarity = opts.rarity || rollRarity({ qualityBonus: opts.qualityBonus || 0, weights: opts.rarityWeights, maxRarity: opts.maxRarity });
    const slot = SLOT_STATS[opts.type];
    const variance = rng.float(0.95, 1.05);
    const base = STAT_UNIT * opts.power * rarity.quality * variance;
    const atk = Math.round(base * slot.atk);
    const def = Math.round(base * slot.def);
    const value = Math.round(STAT_UNIT * opts.power * 8 * rarity.quality);
    const nameParts = [opts.gemName || opts.materialName, TYPE_NAMES[opts.type]].filter(Boolean);
    return {
        id: nextId,
        type: opts.type,
        tier: opts.tier,
        name: nameParts.join(' '),
        rarity: rarity.id,
        color: rarity.color,
        icon: TYPE_ICONS[opts.type],
        atk, def,
        affixes: rollAffixes(rarity.affixes, opts.tier),
        upgrade: 0,
        reforges: 0,
        locked: false,
        value,
        source: opts.source || 'crafted',
        materials: opts.materials || null
    };
}

/** How much stronger gear dropped at this Abyss depth is than its tier's base (1 above ground). */
export function abyssDropMult(depth = 0) {
    const a = BALANCE.abyss;
    return depth > a.dropScalingFrom ? Math.pow(a.dropGrowth, depth - a.dropScalingFrom) : 1;
}

/**
 * Gear dropped where the gear tier is `zoneTier` (a zone's gearTier or a chest's tier): mostly of
 * that tier, sometimes one below, rarely one above (`tier` fixes it). `types` weighs the kinds
 * (systems/inventory.js dropTypesFor tilts them toward what the hero lacks); a ring, amulet or
 * earring only comes epic or legendary. `depth` (the Abyss depth) scales its power past depth 5.
 */
export function generateDrop(zoneTier, boss, nextId, depth = 0, types = DROP_TYPE_WEIGHTS, { tier: fixedTier = null } = {}) {
    const tier = fixedTier ?? Math.max(1, Math.min(MAX_GEAR_TIER, zoneTier + rng.weighted(DROP_TIER_OFFSETS).offset));
    const gearTier = GEAR_TIERS[tier - 1];
    const scale = 1 + DROP_HIGH_RARITY_PER_TIER * (zoneTier - 1);
    const weights = (boss ? DROP_RARITY_WEIGHTS.boss : DROP_RARITY_WEIGHTS.regular).map((w, i) => (i >= 3 ? w * scale : w));
    const rarity = rollRarity({ weights });
    const kinds = RARITIES.findIndex(r => r.id === rarity.id) >= JEWEL_DROP_MIN_RANK ? types : types.filter(t => !CRAFTING_TYPES.includes(t.type));
    const type = rng.weighted(kinds.length ? kinds : types).type;
    const jewel = CRAFTING_TYPES.includes(type);
    const mult = abyssDropMult(depth);
    const item = generateEquipment({
        type, tier, rarity,
        power: (jewel ? gearTier.power * JEWEL_POWER : gearTier.power) * mult,
        materialName: jewel ? null : gearTier.name,
        gemName: jewel ? gearTier.jewel : null,
        source: 'drop'
    }, nextId);
    if (mult > 1) item.depth = depth;
    return item;
}

/** New affixes for an item (same count as its rarity). */
export function rerollAffixes(item) {
    const rarity = RARITIES.find(r => r.id === item.rarity) || RARITIES[0];
    item.affixes = rollAffixes(rarity.affixes, item.tier || 1);
    return item;
}

/** Sell value including upgrade investment. */
export function itemSellValue(item) {
    return Math.round((item.value || 0) * (1 + 0.1 * (item.upgrade || 0)));
}

export function describeAffix(affix) {
    const pct = `${affix.value >= 0 ? '+' : ''}${(affix.value * 100).toFixed(1)}%`;
    return `${pct} ${affix.name}`;
}
