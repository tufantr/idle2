// Every balance formula in one place. tools/simulate.mjs exercises these headlessly;
// change a constant here and re-run the simulator to see the pacing move.

import { AUTHORED_STAGES, zoneForStage, isBossStage, isLordStage, STAGES_PER_ZONE } from '../data/zones.js';
import { RARITIES, AFFIXES, SLOT_STATS, STAT_UNIT, TYPE_NAMES, TYPE_ICONS, CRAFTING_TYPES, GEAR_TIERS, MAX_GEAR_TIER, DROP_TIER_OFFSETS, DROP_TYPE_WEIGHTS, DROP_RARITY_WEIGHTS, DROP_HIGH_RARITY_PER_TIER, JEWEL_POWER, JEWEL_DROP_MIN_RANK, MYTHIC, PRIMAL } from '../data/items.js';
import { rng } from './rng.js';

export const BALANCE = {
    enemy: {
        baseHp: 25,
        hpGrowth: 1.075,        // per stage inside the authored 100 stages (x2.06 per zone)
        abyssHpGrowth: 1.085,   // per stage beyond stage 100
        baseAtk: 5,
        atkGrowth: 1.065,
        abyssAtkGrowth: 1.075,
        // The deep Abyss (the owner's choice, docs/DESIGN.md §5.6): past stage `deepFrom` the monsters grow
        // more slowly, so the late climb keeps moving (1.6 times as fast from hour 400 on in the simulator;
        // a player with Auto gets there at about hour 150, one without later). The gap to the drops
        // (BALANCE.abyss.dropGrowth a depth of ten stages) and the records stays near 0.024 a stage:
        // nearer 0.02 the climb runs away (test/balance.test.mjs).
        deepFrom: 400,
        deepHpGrowth: 1.065,
        deepAtkGrowth: 1.057,
        // The endless climb (the owner, October 2026: thousands of stages, each new upgrade a push;
        // docs/research_notes/endless-late-game.md): from `deepFrom` a stage's growth eases evenly (in its
        // logarithm) to denseHpGrowth and denseAtkGrowth by stage `denseFrom`, and stays there. The drops ease
        // with it (BALANCE.abyss.denseDropGrowth), so the gap to them narrows from 0.026 a stage to 0.014: every
        // doubling of power is worth about twice the stages it was, and the stages come closer together.
        denseFrom: 700,
        denseHpGrowth: 1.035,
        denseAtkGrowth: 1.03,
        bossHpMult: 3,
        bossAtkMult: 1.6,
        // Stage bosses test the weapon (the owner, October 2026: every piece of gear must matter, and a legendary
        // weapon must push the hero on): from stage `from` a boss of the ladder grows evenly to `hp` times its
        // monsters' health by stage `to` and comes down to hitting as hard as they do (`atk`), so the wall at a
        // boss is felling it within the 30 s (BALANCE.combat.bossTimeMs), which takes attack, and no longer
        // surviving its first blow, which took only armour. Its gold and loot keep bossHpMult (`worth`); the
        // dungeons' bosses and the Titan keep bossHpMult and bossAtkMult.
        stageBoss: { from: 60, to: 150, hp: 7, atk: 1 },
        baseInterval: 2200,     // ms between enemy attacks at stage 1
        intervalPerStage: 8,    // ms faster per stage
        minInterval: 1300,
        // A gentle start (docs/research_notes/first-session.md): on the first stages the monsters hit at
        // `atk` and have `hp` of their figures at stage 1, rising evenly to the full figures after stage
        // `to`. A new hero, unarmed at level 1, wins his first fights while the player only watches,
        // meets the first boss within the first minute and beats it. Gold is paid on the full figures.
        ease: { to: 30, atk: 0.3, hp: 0.6 },
        // Supplies (the owner, October 2026: food and potions should be crucial throughout the game): from stage
        // `from` the monsters' health and attack grow to `mult` times their figures by stage `to`, and the potions
        // grew by as much (data/potions.js), so a hero who drinks one is as strong against them as before, and
        // one who doesn't is that much weaker. Gold and prices keep the old figures (`worth`, enemyBaseStats).
        supply: { from: 60, to: 150, mult: 1.6 }
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
        autoStallMs: 10 * 60 * 1000,
        // Until Auto is earned the dock's Prestige glows once a run has gone this long without a new best
        // stage (an early run's stages come in seconds: three minutes is a wall); after, when Auto would go.
        readyStallMs: 3 * 60 * 1000
    },
    // Deep in the Abyss drops keep pace with the monsters: past `dropScalingFrom`, every depth makes
    // dropped gear `dropGrowth` times stronger (an item level). Monsters grow ~2.26x per depth, so the
    // climb slows but never stops. 1.8 until armour gave health (BASE.hpPerDef): with the hero no longer
    // killed by any hit past stage ~170, 1.6 held stage 200 at ~48 h; 1.45 since the anvil and the records
    // made a deep hero stronger (with tokens at 0.4%: tools/simulate.mjs, DESIGN §5.2).
    abyss: {
        dropScalingFrom: 5,
        dropGrowth: 1.45,
        // from the depth of BALANCE.enemy.deepFrom a depth's growth eases evenly to this by the depth of denseFrom
        denseDropGrowth: 1.225
    },
    // The chain (systems/chain.js; the owner, October 2026): five numbered points over the fight, struck in order before
    // its clock runs out, for a little gold, and a quick one rallies the hero. Small by the owner's word: the strikes are
    // what matters in a fight, the chain only a bonus for the player who watches, and it never gets in their way: its
    // points keep off the monster, and its clicks have their own clock. Struck at random the points almost never fall
    // in order (the chain counts a click every clickGapMs at most), so an auto-clicker gets nothing from it.
    chain: {
        points: 5,
        ms: 4000,                  // to strike all five
        everyMs: [20000, 30000],   // between chains, while the fight is on screen
        firstMs: 8000,             // the first chain of a fight that has had none
        clickGapMs: 250,           // one click in the fight counted this often, wherever it lands (the monster's are strikes)
        spacing: 0.3,              // points at least this far apart (in the layer's heights)
        goldKills: 2,              // a finished chain pays this many kills' gold at the stage
        fastMs: 2000,              // finished this fast, it rallies the hero too:
        rallyMs: 15000             // BASE.rallyAttackSpeed more attack speed this long (core/modifiers.js)
    },
    combat: {
        regenInCombat: 0.001,   // fraction of max HP per second while fighting (Melvor: 1% per 10 s)
        regenResting: 0.02,     // fraction of max HP per second out of combat (full in under a minute)
        // A strike: a tenth of an attack, at most one every `strikeGapMs`, and the combo it builds adds up to
        // comboMax × comboDmgPerStack to every hit (+10%). It was half an attack, then a fifth, at up to eight a
        // second, with a combo of +90% and, from 10, 20 and 30 stacks, +10% crit, 15% lifesteal and echo strikes:
        // fast clicking dealt nearly seven times an idle hero's damage and healed him, so the owner's hero reached
        // stage 100 without a prestige, food or a potion, and cleared dungeons in seconds that the Dungeons tab
        // said were out of reach. The game has no anti-cheat, so an auto-clicker is assumed: every interval
        // between clicks from 1 ms to 2 s was measured, and the best now deals about 1.5 times an idle hero's
        // damage (one at twice a second about 1.2 times, once a second about 1.1), with no healing.
        manualHitMult: 0.1,
        strikeGapMs: 250,
        comboDmgPerStack: 0.01,
        comboMax: 10,
        comboDecayAfterMs: 1500,
        deathHpFraction: 0.5,
        // Auto-eat eats for a blow that would fell the hero only while the run climbs: on the ladder, within this
        // long of its last new best stage (combat.stallMs; dungeons and the Titan always). Held at a wall, he
        // keeps the food for the next push (the simulator's bot that ate there spent a quarter of its time cooking).
        foodPushMs: 3 * 60000,
        retreatStages: 1,
        bossTimeMs: 30000,      // a boss must fall within 30 s of fighting (Clicker Heroes / Tap Titans rule)
        // The first trip through the first places (the owner, October 2026; docs/DESIGN.md §3.24): a stage
        // never cleared in stages `from`–`to` holds a pack of `size` monsters (a boss stands alone), so a
        // place lasts long enough to be met; a stage already cleared is one fight, as ever. The meadow
        // stays one monster a stage, so the first boss still comes within the first minute.
        firstPack: { from: 11, to: 50, size: 3 },
        regroupMs: 60000        // after a boss escapes: farm the previous stage for a minute, then retry
    },
    minigame: {
        opportunityEveryMs: [180000, 360000], // a chance appears every 3-6 minutes of active skilling
        // ... and waits a minute (it was 20 s: a player on another tab missed it; Cookie Clicker's upgrades take its
        // golden cookie from 13 s to 52 s, and RuneScape's Forestry counts anyone who chopped in the last 3 minutes)
        opportunityWindowMs: 60000,
        // A win: the skill works twice as fast for a short while, each win of a streak 5 s longer (the owner's
        // ask, October 2026: +35% for 90 s, added to the other speed bonuses and costing Focus, came to about
        // 12% more work, and was hardly seen). Once in 3-6 minutes, ~15% more work for a player who plays
        // every chance: the active-to-idle target of about 1.5x holds.
        speedMult: 2,
        boostMs: 45000,
        streakMs: 5000,
        // A Perfect (the zone's centre, or a held game that never slipped once in) adds this to the boost and always
        // brings a find; an ordinary win brings one this often. A find is about findSeconds of the skill's work (a gem
        // when mining; a nest holds a gem this often; a river spot gives a tin of bait), on top of the speed, which
        // stays the guaranteed part: a modest extra now and then pleases more than a fixed reward or a swingy one.
        perfectMs: 15000,
        findChance: 1 / 3,
        findSeconds: 20,
        nestGemChance: 0.25,
        baitFind: 10
    }
};

// ---------- Enemies ----------

/**
 * The logarithm of `n` steps of a growth that eases evenly (in its logarithm) from `from` to `to` over
 * `over` steps and stays at `to` after: the deep Abyss's monsters by stage, its drops by depth.
 */
export function easedGrowthLog(n, from, to, over) {
    if (!(n > 0)) return 0;
    const a = Math.log(from);
    const b = Math.log(to);
    if (!(over > 0)) return n * b;
    const m = Math.min(n, over);
    return m * a + (b - a) * m * (m + 1) / (2 * over) + Math.max(0, n - over) * b;
}

/** HP, ATK and attack interval of a regular (non-boss) enemy at `stage`. Dungeons and the Titan build on it. */
export function enemyBaseStats(stage) {
    const e = BALANCE.enemy;
    let hp;
    let atk;
    if (stage <= AUTHORED_STAGES) {
        hp = e.baseHp * Math.pow(e.hpGrowth, stage - 1);
        atk = e.baseAtk * Math.pow(e.atkGrowth, stage - 1);
    } else {
        const extra = Math.min(stage, e.deepFrom) - AUTHORED_STAGES;
        const deep = Math.max(0, stage - e.deepFrom);
        const over = e.denseFrom - e.deepFrom;
        hp = e.baseHp * Math.pow(e.hpGrowth, AUTHORED_STAGES - 1) * Math.pow(e.abyssHpGrowth, extra) * Math.exp(easedGrowthLog(deep, e.deepHpGrowth, e.denseHpGrowth, over));
        atk = e.baseAtk * Math.pow(e.atkGrowth, AUTHORED_STAGES - 1) * Math.pow(e.abyssAtkGrowth, extra) * Math.exp(easedGrowthLog(deep, e.deepAtkGrowth, e.denseAtkGrowth, over));
    }
    return { hp, atk, interval: Math.max(e.minInterval, e.baseInterval - e.intervalPerStage * Math.min(stage, 120)) };
}

/** How much tougher the monsters of `stage` are for the supplies (BALANCE.enemy.supply): 1 before `from`, `mult` from `to`. */
export function supplyMult(stage) {
    const s = BALANCE.enemy.supply;
    return 1 + (s.mult - 1) * Math.min(1, Math.max(0, (stage - s.from) / (s.to - s.from)));
}

/** A boss of the ladder's health and attack, as multiples of its stage's monsters' (BALANCE.enemy.stageBoss). */
export function stageBossMults(stage) {
    const e = BALANCE.enemy;
    const b = e.stageBoss;
    const t = Math.min(1, Math.max(0, (stage - b.from) / (b.to - b.from)));
    return { hp: e.bossHpMult + (b.hp - e.bossHpMult) * t, atk: e.bossAtkMult + (b.atk - e.bossAtkMult) * t };
}

export function enemyForStage(stage) {
    const zone = zoneForStage(stage);
    const boss = isBossStage(stage);
    const e = BALANCE.enemy;
    let { hp, atk, interval } = enemyBaseStats(stage);
    const worth = Math.floor(boss ? hp * e.bossHpMult : hp);   // what it pays for (gold, a farmed boss's loot): its full health, a boss's as of old
    if (boss) {
        const m = stageBossMults(stage);
        hp *= m.hp;
        atk *= m.atk;
    }
    const supply = supplyMult(stage);
    hp *= supply;
    atk *= supply;
    const t = Math.min(1, (stage - 1) / e.ease.to);
    hp *= e.ease.hp + (1 - e.ease.hp) * t;
    atk *= e.ease.atk + (1 - e.ease.atk) * t;
    const name = boss ? zone.boss : zone.monsters[(stage - 1) % zone.monsters.length];
    const lord = boss && isLordStage(stage);   // every 100th from 200 (data/zones.js LORDS): its first defeat leaves a sure piece
    return {
        name: lord ? `${name} (Lord)` : boss ? `${name} (Boss)` : name,
        ...(lord ? { lord } : {}),
        baseName: name,
        icon: zone.icons[name] || '👾',
        zoneName: zone.name,
        zoneTier: zone.tier,
        stage,
        boss,
        hp: Math.floor(hp),
        maxHp: Math.floor(hp),
        ...(worth !== Math.floor(hp) ? { worth } : {}),   // (eased, tougher for the supplies or a boss past stage 60, it pays its old figure)
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
        let weight = (weights ? weights[i] : r.weight) || 0;   // (Mythic and Primal are never rolled: generateDrop raises a legendary)
        weight *= i === 0 ? Math.max(0.2, 1 - qualityBonus * 4) : 1 + qualityBonus * 4;
        return { ...r, weight: i > maxIndex ? 0 : weight };
    });
    return rng.weighted(entries);
}

function rollAffixes(count, tier, perfect = false) {
    const pool = [...AFFIXES];
    const affixes = [];
    for (let i = 0; i < count && pool.length; i++) {
        const idx = Math.floor(rng.random() * pool.length);
        const [affix] = pool.splice(idx, 1);
        const tierScale = 1 + 0.08 * (tier - 1);
        const value = (perfect ? affix.max : rng.float(affix.min, affix.max)) * tierScale;   // (Primal: as high as it goes)
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
    const variance = rarity.perfect ? 1.05 : rng.float(0.95, 1.05);
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
        affixes: rollAffixes(rarity.affixes, opts.tier, !!rarity.perfect),
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
    if (!(depth > a.dropScalingFrom)) return 1;
    const e = BALANCE.enemy;
    const deepDepth = (e.deepFrom - AUTHORED_STAGES) / STAGES_PER_ZONE;   // the depth whose last stage is deepFrom (30)
    const over = (e.denseFrom - e.deepFrom) / STAGES_PER_ZONE;
    return Math.pow(a.dropGrowth, Math.min(depth, deepDepth) - a.dropScalingFrom) * Math.exp(easedGrowthLog(depth - deepDepth, a.dropGrowth, a.denseDropGrowth, over));
}

/**
 * Gear dropped where the gear tier is `zoneTier` (a zone's gearTier or a chest's tier): mostly of
 * that tier, sometimes one below, rarely one above (`tier` fixes it). `types` weighs the kinds
 * (systems/inventory.js dropTypesFor tilts them toward what the hero lacks); a ring, amulet or
 * earring only comes epic or legendary. `depth` (the Abyss depth) scales its power past depth 5.
 */
export function generateDrop(zoneTier, boss, nextId, depth = 0, types = DROP_TYPE_WEIGHTS, { tier: fixedTier = null, frontier = null, rarity: fixedRarity = null } = {}) {
    const tier = fixedTier ?? Math.max(1, Math.min(MAX_GEAR_TIER, zoneTier + rng.weighted(DROP_TIER_OFFSETS).offset));
    const gearTier = GEAR_TIERS[tier - 1];
    const scale = 1 + DROP_HIGH_RARITY_PER_TIER * (zoneTier - 1);
    const weights = (boss ? DROP_RARITY_WEIGHTS.boss : DROP_RARITY_WEIGHTS.regular).map((w, i) => (i >= 3 ? w * scale : w));
    let rarity = fixedRarity ? RARITIES.find(r => r.id === fixedRarity) : rollRarity({ weights });   // (a Lord's sure piece names its own)
    // a ladder boss's piece near the best stage (`frontier`: { stage, best }) may be above legendary (data/items.js MYTHIC)
    if (!fixedRarity && boss && frontier && frontier.stage >= MYTHIC.from && frontier.stage >= frontier.best - MYTHIC.near && rng.chance(MYTHIC.chance)) {
        const above = frontier.stage >= PRIMAL.from && rng.chance(1 / PRIMAL.odds) ? 'primal' : 'mythic';
        rarity = RARITIES.find(r => r.id === above);
    }
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
    item.affixes = rollAffixes(rarity.affixes, item.tier || 1, !!rarity.perfect);
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
