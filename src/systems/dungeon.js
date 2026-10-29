// Dungeons (authored gauntlets with a chest) and the Titan (an hourly damage race).
// Both reuse the combat loop through `state.combat.mode`: 'stages' | 'dungeon' | 'titan'.

import {
    DUNGEONS, dungeonById, UNIQUES, DUNGEON_MILESTONES, FRAGMENTS_PER_UNIQUE, DIRECT_UNIQUE_CHANCE,
    CHEST_GEAR_CHANCE, CHEST_ESSENCE_PER_TIER, CHEST_MATERIAL_ROLLS, CHEST_GEM_CHANCE,
    ELITE_HP_MULT, ELITE_ATK_MULT, DUNGEON_BOSS_HP_MULT, DUNGEON_CHOICE_MS,
    DUNGEON_TIER_CLEARS, dungeonAt, dungeonTierInfo, dungeonBossTime, dungeonBossStage, uniqueAt, uniqueKey,
    TITAN_COOLDOWN_MS, TITAN_TIME_MS, TITAN_UNLOCK_STAGE, TITAN_HP_MULT, TITAN_ATK_MULT, TITAN_NAMES, titanStage, TITAN_BANK, TITAN_BONUS, titanBonusUnits } from '../data/dungeons.js';
import { enemyBaseStats, enemyDamage, generateDrop, generateEquipment, goldForKill, goldPerKillAtStage, enemyForStage, supplyMult, abyssDropMult, BALANCE } from '../core/formulas.js';
import { zoneForStage, GEM_DROP_TABLE } from '../data/zones.js';
import { RARITIES, TYPE_SLOTS } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { rng } from '../core/rng.js';
import { potionFragmentChance } from '../data/potions.js';
import { addItem, dropTypesFor } from './inventory.js';
import { spawnEnemy, enterCombat } from './combat.js';
import { doingNow, resumeDoing } from './resume.js';
import { log, bumpStat } from './progress.js';

// ---------- tiers ----------

/** The dungeons' open tier (data/dungeons.js: each Seal opens the next). */
export const dungeonTier = state => Math.max(1, Math.floor(Number(state?.dungeonTier)) || 1);
/** Seals made: one for each tier sealed. */
export const sealsOf = state => dungeonTier(state) - 1;
/** Dungeon `d` (or its id) as it stands at the open tier. */
export const dungeonNow = (state, d) => dungeonAt(d, dungeonTier(state));

// ---------- enemies ----------

/** The monster in room `run.index` of a run (the boss after the last elite), at the run's tier and by its rule. */
export function dungeonEnemy(run) {
    const d = dungeonAt(run.id, run.tier || 1);
    const rule = dungeonTierInfo(d.tier).rule || {};
    const e = BALANCE.enemy;
    const swift = rule.interval || 1;
    if (run.index < d.monsters.length) {
        const m = d.monsters[run.index];
        const stage = d.stage + run.index;
        const base = enemyBaseStats(stage);
        const supply = supplyMult(stage);   // (tougher with the supplies, as on the stages)
        const hp = Math.floor(base.hp * ELITE_HP_MULT * supply * (rule.hp || 1));
        return {
            name: m.name, baseName: m.name, icon: m.icon, zoneName: d.name, zoneTier: d.chestTier, stage, boss: false, elite: true,
            hp, maxHp: hp, worth: Math.floor(base.hp * ELITE_HP_MULT), atk: Math.floor(base.atk * ELITE_ATK_MULT * supply * (rule.atk || 1)), interval: Math.round(base.interval * swift)
        };
    }
    const stage = d.stage + d.monsters.length;
    const base = enemyBaseStats(stage);
    const supply = supplyMult(stage);
    const hp = Math.floor(base.hp * e.bossHpMult * DUNGEON_BOSS_HP_MULT * supply * (rule.hp || 1));
    return {
        name: `${d.boss.name} (Boss)`, baseName: d.boss.name, icon: d.boss.icon, zoneName: d.name, zoneTier: d.chestTier, stage, boss: true,
        hp, maxHp: hp, worth: Math.floor(base.hp * e.bossHpMult * DUNGEON_BOSS_HP_MULT), atk: Math.floor(base.atk * e.bossAtkMult * supply * (rule.atk || 1)), interval: Math.round(base.interval * swift), timeLimit: dungeonBossTime(d.tier)
    };
}

export function titanLevel(state) {
    return (state.titan.kills || 0) + 1;
}

export function titanEnemy(state) {
    const level = titanLevel(state);
    const stage = titanStage(level);
    const base = enemyBaseStats(stage);
    const e = BALANCE.enemy;
    const supply = supplyMult(stage);
    const hp = Math.floor(base.hp * e.bossHpMult * TITAN_HP_MULT * supply);
    const name = `Titan of ${TITAN_NAMES[(level - 1) % TITAN_NAMES.length]}${level > TITAN_NAMES.length ? ` ${Math.ceil(level / TITAN_NAMES.length)}` : ''}`;
    return {
        name, baseName: name, icon: '🗿', zoneName: 'Titan challenge', zoneTier: Math.min(7, 1 + Math.floor(level / 2)), stage, boss: true, titan: true,
        hp, maxHp: hp, worth: Math.floor(base.hp * e.bossHpMult * TITAN_HP_MULT), atk: Math.floor(base.atk * e.bossAtkMult * TITAN_ATK_MULT * supply), interval: base.interval, timeLimit: TITAN_TIME_MS
    };
}

/**
 * Rough readiness check for a fight, ignoring food, regen, lifesteal and combo: how long the
 * enemy takes to kill, and how long you last against it. Shown on the Dungeons tab.
 */
export function fightPreview(derived, enemy) {
    const critMult = 1 + derived.critChance * (derived.critDmg - 1);
    const dps = derived.atk * critMult / (derived.attackInterval / 1000);
    const enemyDps = enemyDamage(enemy.atk, derived.def) * (1 - derived.dodge) / (enemy.interval / 1000);
    return {
        dps,
        killSeconds: enemy.maxHp / Math.max(1e-9, dps),
        surviveSeconds: derived.maxHp / Math.max(1e-9, enemyDps)
    };
}

/** Preview of a dungeon's hardest elite and its boss, at `dungeon.tier` (dungeonNow gives the open tier's). */
export function dungeonPreview(derived, dungeon) {
    const elite = dungeonEnemy({ id: dungeon.id, index: dungeon.monsters.length - 1, tier: dungeon.tier || 1 });
    const boss = dungeonEnemy({ id: dungeon.id, index: dungeon.monsters.length, tier: dungeon.tier || 1 });
    return { elite, boss, eliteFight: fightPreview(derived, elite), bossFight: fightPreview(derived, boss) };
}

// ---------- dungeons ----------

/** True if dungeon `dungeon`'s gate is open at the open tier (its stage reached). */
export function dungeonUnlocked(state, dungeon) {
    return state.combat.bestStage >= dungeonNow(state, dungeon).unlockStage || !!state.settings.devUnlockAll;
}

export function enterDungeon(game, id) {
    const state = game.state;
    const d = dungeonById(id) && dungeonNow(state, id);
    if (!d) return false;
    if (!dungeonUnlocked(state, d)) { game.emit({ type: 'error', text: `Reach stage ${d.unlockStage} to open ${d.name}.` }); return false; }
    const c = state.combat;
    if (c.mode === 'titan' || c.mode === 'clan') { game.emit({ type: 'error', text: `Finish the ${c.mode === 'clan' ? 'clan' : 'Titan'} fight first.` }); return false; }
    if (c.mode === 'dungeon') {
        if (c.dungeon?.id === id) return true;
        failDungeon(game, `you left for ${d.name}`);
    }
    c.mode = 'dungeon';
    c.dungeon = { id, index: 0, repeat: false, choiceLeft: 0, tier: d.tier };   // the first clear asks whether to keep going
    c.regroupLeft = 0;
    spawnEnemy(game);
    enterCombat(game);
    c.hp = game.derived.maxHp; // a run starts rested
    log(game, `${d.icon} Entered ${d.name}.`, 'combat');
    game.markDirty();
    return true;
}

/** Back to the stage ladder. Called when leaving, dying, failing, or after a titan fight. */
export function returnToStages(game) {
    const c = game.state.combat;
    c.mode = 'stages';
    c.dungeon = null;
    spawnEnemy(game);
    game.markDirty();
}

/** Is the hero waiting at the chest after a clear, for the player to keep going or end the dungeon? */
export function choosingAfterClear(state) {
    const c = state.combat;
    return c.mode === 'dungeon' && !!c.dungeon && (c.dungeon.choiceLeft || 0) > 0;
}

/** A run from its first room, rested. */
function startRun(game) {
    const c = game.state.combat;
    c.dungeon.index = 0;
    c.dungeon.choiceLeft = 0;
    c.hp = game.derived.maxHp;
    spawnEnemy(game);
    game.markDirty();
}

/** Whether this visit runs the dungeon again after each clear (for the simulator and the tests; players choose after the first clear). */
export function setDungeonRepeat(game, on) {
    const c = game.state.combat;
    if (c.mode === 'dungeon' && c.dungeon) c.dungeon.repeat = !!on;
}

/** After a clear: run the dungeon again and again, until the hero leaves. */
export function keepGoing(game) {
    const c = game.state.combat;
    if (c.mode !== 'dungeon' || !c.dungeon) return false;
    c.dungeon.repeat = true;
    if (c.dungeon.choiceLeft > 0) {
        startRun(game);
        game.emit({ type: 'dungeonChosen', keep: true });
    }
    return true;
}

/** After a clear: the dungeon is done, and the hero goes back to the stages, fighting on. */
export function endDungeon(game) {
    const state = game.state;
    if (!choosingAfterClear(state)) return false;
    const d = dungeonAt(state.combat.dungeon.id, state.combat.dungeon.tier);
    log(game, `${d.icon} Left ${d.name}, cleared (${state.dungeons[d.id].clears} clear${state.dungeons[d.id].clears === 1 ? '' : 's'} in all).`, 'combat');
    returnToStages(game);
    game.emit({ type: 'dungeonChosen', keep: false });
    return true;
}

/** The hero waits at the chest; no answer in time means keep going. */
export function tickDungeonChoice(game, dt) {
    const c = game.state.combat;
    c.dungeon.choiceLeft = Math.max(0, c.dungeon.choiceLeft - dt);
    if (c.dungeon.choiceLeft > 0) return;
    c.dungeon.repeat = true;
    startRun(game);
    game.emit({ type: 'dungeonChosen', keep: true, auto: true });
}

/** The dungeon tier a unique piece was cut at (1 for the first's). */
export const uniqueTierOf = item => Math.max(1, Math.floor(Number(item?.uniqueTier)) || 1);
/** True if a copy of this unique (of `tier`) is worn or in the bag. */
export function ownsUnique(state, uniqueId, tier = 1) {
    return [...state.inventory, ...Object.values(state.equipped)].some(i => i && i.uniqueId === uniqueId && uniqueTierOf(i) === tier);
}
/** True if this unique (of `tier`) was ever found, kept or not (core/modifiers.js recordsOf counts each of the eight once). */
export const foundUnique = (state, uniqueId, tier = 1) => !!state.uniques?.[uniqueKey(uniqueId, tier)];
/** True if this unique was ever found at any tier: then it is a record already. */
const foundAtAnyTier = (state, uniqueId) => Object.keys(state.uniques || {}).some(key => key === uniqueId || key.startsWith(`${uniqueId}@`));

/** Unique `uniqueId` of dungeon tier `tier`, as a piece of gear: past the first tier as strong as its dungeon's boss's depth drops. */
export function makeUnique(state, uniqueId, tier = 1) {
    const u = uniqueAt(uniqueId, tier);
    const d = DUNGEONS.find(x => x.unique === uniqueId);
    const depth = tier > 1 && d ? zoneForStage(dungeonBossStage(d, tier)).depth : 0;
    const mult = abyssDropMult(depth);
    const legendary = RARITIES.find(r => r.id === 'legendary');
    const item = generateEquipment({ type: u.type, tier: u.tier, power: u.power * mult, materialName: u.name, rarity: legendary, source: 'unique' }, state.idCounter++);
    item.name = u.name;
    item.uniqueId = u.id;
    if (tier > 1) item.uniqueTier = tier;
    if (mult > 1) item.depth = depth;
    item.color = '#f97316';
    item.affixes = u.affixes.map(a => ({ id: a.stat, name: a.name, stat: a.stat, value: a.value, format: 'pct' }));
    return item;
}

/** Note a unique as found: a record from now on, whatever becomes of the piece (kept in `meta` too, as the forge's levels). */
export function noteUnique(state, uniqueId, tier = 1) {
    const key = uniqueKey(uniqueId, tier);
    if (state.uniques?.[key]) return false;
    (state.uniques ||= {})[key] = true;
    state.meta.uniques = Object.keys(state.uniques);
    return true;
}

function grantUnique(game, uniqueId, tier = 1) {
    const state = game.state;
    const item = makeUnique(state, uniqueId, tier);
    // The first copy starts protected. A spare stays unlocked, so a full bag can salvage it for essence
    // instead of filling up with locked duplicates.
    const spare = ownsUnique(state, uniqueId, tier);
    item.locked = !spare;
    const record = !foundAtAnyTier(state, uniqueId);   // the first of this unique at any tier: a record
    const fresh = noteUnique(state, uniqueId, tier);   // the first of this tier's: a line in the chronicle
    const { kept } = addItem(game, item);   // (a spare may be salvaged as it lands: the Weaker auto-salvage, a full bag)
    bumpStat(game, 'uniquesFound');
    log(game, spare ? `🌟 Another ${item.name} — a spare, unlocked so it can be salvaged for essence.` : `🌟 Unique item: ${item.name}!`, 'loot');
    game.emit({ type: 'unique', item, fresh, record, kept });
    return item;
}

/** Called by combat when a dungeon monster dies. */
export function onDungeonKill(game) {
    const state = game.state;
    const c = state.combat;
    const d = dungeonAt(c.dungeon.id, c.dungeon.tier);
    c.dungeon.index += 1;
    if (c.dungeon.index > d.monsters.length) {
        completeDungeon(game, d);
        if (c.dungeon.repeat) { startRun(game); return; }   // kept going: every run starts rested
        // the first clear of this visit: the hero waits at the open chest for the player's choice
        c.dungeon.choiceLeft = DUNGEON_CHOICE_MS;
        c.enemy = null;
        game.emit({ type: 'dungeonChoice', dungeon: d.id, clears: state.dungeons[d.id].clears, waitMs: DUNGEON_CHOICE_MS });
        game.markDirty();
        return;
    }
    spawnEnemy(game);
}

function completeDungeon(game, d) {
    const state = game.state;
    const dropMult = game.derived.dropMult;
    const record = state.dungeons[d.id];
    record.clears += 1;
    bumpStat(game, 'dungeonClears');

    const parts = [];
    let kept = null;
    const zone = zoneForStage(d.stage);   // (the run's tier's: dungeonAt)
    if (rng.chance(CHEST_GEAR_CHANCE * dropMult)) {
        // of the chest's own tier (not a tier either side, as a monster's drop), as strong as the dungeon's
        // depth in the Abyss, like its monsters' drops
        const item = generateDrop(d.chestTier, true, state.idCounter++, zone.depth, dropTypesFor(state, d.chestTier), { tier: d.chestTier });
        bumpStat(game, 'itemsDropped');
        const result = addItem(game, item);
        if (result.kept) kept = item;
        parts.push(result.kept ? item.name : `${item.name} (salvaged)`);
    }
    // a dungeon potion at work: a chance of one more (data/potions.js)
    const c = state.combat;
    const brewed = c.dungeonPotionMs > 0 && rng.chance(potionFragmentChance(c.dungeonPotion)) ? 1 : 0;
    const fragments = (rng.chance(0.03) ? 3 : 1) + brewed;
    record.fragments += fragments;
    if (brewed) bumpStat(game, 'potionFragments');
    parts.push(`${fragments} fragment${fragments > 1 ? 's' : ''}`);
    const essence = Math.round(CHEST_ESSENCE_PER_TIER * zone.tier);
    state.resources.essence += essence;
    bumpStat(game, 'essenceFound', essence);
    parts.push(`${essence} essence`);
    const materials = {};
    for (let i = 0; i < CHEST_MATERIAL_ROLLS; i++) {
        const pick = rng.weighted(zone.loot);
        materials[pick.id] = (materials[pick.id] || 0) + 1 + Math.floor(zone.tier / 3);
    }
    if (rng.chance(CHEST_GEM_CHANCE * dropMult)) {
        const gem = [...GEM_DROP_TABLE].reverse().find(g => g.tier <= zone.tier) || GEM_DROP_TABLE[0];
        materials[gem.id] = (materials[gem.id] || 0) + 1;
        bumpStat(game, 'gemsFound');
    }
    for (const [id, qty] of Object.entries(materials)) {
        state.resources[id] += qty;
        parts.push(`${qty}× ${RESOURCES[id].name}`);
    }
    if (rng.chance(DIRECT_UNIQUE_CHANCE)) grantUnique(game, d.unique, d.tier);

    log(game, `🎁 ${d.name} cleared (${record.clears}): ${parts.join(', ')}.`, 'loot');
    for (const m of DUNGEON_MILESTONES) {
        if (record.clears !== m.clears) continue;
        log(game, `🏅 ${d.name}: ${m.clears} clears — ${m.desc} (permanent).`, 'achievement');
        game.emit({ type: 'dungeonMilestone', dungeon: d.id, clears: m.clears, desc: m.desc, tier: d.tier });
    }
    // what the chest held, for the scene to show (the gear kept, if any, is `item`)
    game.emit({ type: 'dungeonClear', dungeon: d.id, tier: d.tier, clears: record.clears, item: kept, loot: { fragments, essence, materials } });
    game.markDirty();
}

export function assembleUnique(game, dungeonId) {
    const state = game.state;
    const d = dungeonById(dungeonId);
    const record = state.dungeons[dungeonId];
    if (!d || !record || record.fragments < FRAGMENTS_PER_UNIQUE) {
        game.emit({ type: 'error', text: `You need ${FRAGMENTS_PER_UNIQUE} fragments.` });
        return null;
    }
    record.fragments -= FRAGMENTS_PER_UNIQUE;
    bumpStat(game, 'uniquesAssembled');
    const item = grantUnique(game, d.unique, dungeonTier(state));   // the open tier's
    game.markDirty();
    return item;
}

// ---------- the Seal ----------

/**
 * How near the open tier's Seal is: { tier, cleared (dungeons with the tier's clears), held (its uniques in hand),
 * ready } (data/dungeons.js DUNGEON_TIER_CLEARS).
 */
export function sealProgress(state) {
    const tier = dungeonTier(state);
    const cleared = DUNGEONS.filter(d => (state.dungeons[d.id]?.clears || 0) >= DUNGEON_TIER_CLEARS).length;
    const held = DUNGEONS.filter(d => ownsUnique(state, d.unique, tier)).length;
    return { tier, cleared, held, of: DUNGEONS.length, ready: cleared === DUNGEONS.length && held === DUNGEONS.length };
}

/**
 * Hand in the open tier's eight uniques for its Seal (a spare in the bag before a worn one, whose slot is left empty)
 * and open the next tier: the dungeons go deeper, their clears and fragments start again, and the found uniques stay
 * records. (Fragments carried over made the next tier's eight at once, each as strong as gear 200 stages past the
 * hero: the simulated one leapt from stage 330 to 490 in two hours.) Not during a run.
 */
export function sealDungeons(game) {
    const state = game.state;
    const progress = sealProgress(state);
    if (!progress.ready) {
        game.emit({ type: 'error', text: progress.cleared < progress.of ? `Every dungeon needs ${DUNGEON_TIER_CLEARS} clears first.` : 'The Seal takes one of each of the eight uniques.' });
        return false;
    }
    if (state.combat.mode === 'dungeon' && !choosingAfterClear(state)) { game.emit({ type: 'error', text: 'Finish the run first.' }); return false; }
    if (choosingAfterClear(state)) endDungeon(game);
    const tier = progress.tier;
    for (const d of DUNGEONS) {
        const match = i => i && i.uniqueId === d.unique && uniqueTierOf(i) === tier;
        noteUnique(state, d.unique, tier);   // (found already: a record it stays)
        const spare = state.inventory.findIndex(match);
        if (spare >= 0) { state.inventory.splice(spare, 1); continue; }
        const slot = (TYPE_SLOTS[UNIQUES[d.unique].type] || []).find(s => match(state.equipped[s]));
        if (slot) state.equipped[slot] = null;
    }
    state.dungeonTier = tier + 1;
    state.meta.dungeonTier = state.dungeonTier;   // (kept in `meta` too: core/state.js)
    for (const d of DUNGEONS) state.dungeons[d.id] = { clears: 0, fragments: 0 };
    const next = dungeonTierInfo(tier + 1);
    log(game, `🔱 The Seal of tier ${dungeonTierInfo(tier).numeral || 'I'}: the dungeons go ${next.rule ? `deeper, and ${next.rule.name.toLowerCase()}` : 'deeper'}.`, 'achievement');
    game.emit({ type: 'dungeonSeal', tier, next: tier + 1 });
    game.markDirty();
    return true;
}

/**
 * A run ends unfinished: the hero fell or the boss outlasted its timer (`lost`), or the hero left
 * (`lost` false: for a stage, another dungeon, the Titan, a prestige, work, or by Leave dungeon).
 */
export function failDungeon(game, reason, { lost = false } = {}) {
    const c = game.state.combat;
    if (choosingAfterClear(game.state)) {   // the run is already won: leaving now loses nothing
        endDungeon(game);
        return;
    }
    const d = c.dungeon?.id ? dungeonAt(c.dungeon.id, c.dungeon.tier) : null;
    log(game, `${d?.icon || '🕳️'} ${d?.name || 'Dungeon'} run failed: ${reason}. Progress in the run is lost.`, 'death');
    game.emit({ type: 'dungeonFail', dungeon: d?.id, reason, lost });
    returnToStages(game);
}

// ---------- the Titan ----------

export function titanUnlocked(state) {
    return state.combat.bestStage >= TITAN_UNLOCK_STAGE || !!state.settings.devUnlockAll;
}

/** Attempts waiting: one an hour, banked up to TITAN_BANK. */
export function titanCharges(state, now) {
    const readyAt = state.titan.readyAt || 0;
    if (!titanUnlocked(state) || now < readyAt) return 0;
    return Math.min(TITAN_BANK, 1 + Math.floor((now - readyAt) / TITAN_COOLDOWN_MS));
}

export function titanReady(state, now) {
    return titanCharges(state, now) > 0;
}

export function challengeTitan(game) {
    const state = game.state;
    if (!titanReady(state, game.now)) {
        game.emit({ type: 'error', text: titanUnlocked(state) ? 'The Titan is resting.' : `Reach stage ${TITAN_UNLOCK_STAGE} to face the Titan.` });
        return false;
    }
    const c = state.combat;
    if (c.mode === 'titan') return false;
    if (c.mode === 'clan') { game.emit({ type: 'error', text: 'Finish the clan fight first.' }); return false; }
    state.titan.before = doingNow(state);   // what he was doing: when the fight is over he goes back to it
    if (c.mode === 'dungeon') failDungeon(game, 'you left to face the Titan');
    // one attempt used: the bank keeps the others (readyAt never lags more than the bank's hours behind)
    state.titan.readyAt = Math.max(state.titan.readyAt || 0, game.now - (TITAN_BANK - 1) * TITAN_COOLDOWN_MS) + TITAN_COOLDOWN_MS;
    state.titan.attempts = (state.titan.attempts || 0) + 1;
    c.mode = 'titan';
    c.dungeon = null;
    c.regroupLeft = 0;
    spawnEnemy(game);
    enterCombat(game);
    c.hp = game.derived.maxHp; // start the race at full health
    log(game, `🗿 ${c.enemy.name} awakens — you have ${TITAN_TIME_MS / 1000} seconds.`, 'combat');
    game.markDirty();
    return true;
}

/**
 * End a titan fight. `won` = the titan fell in time; else `reason` says how it ended: 'time', 'fell'
 * (the hero did) or 'left' (Give up, or other work). The hero goes back to what he was doing when it
 * began; returns whether that is fighting (on at the stages).
 */
export function endTitan(game, won, reason = won ? 'won' : 'time') {
    const state = game.state;
    const c = state.combat;
    const enemy = c.enemy;
    const level = titanLevel(state);
    const dealt = Math.max(0, Math.min(1, 1 - Math.max(0, enemy.hp) / enemy.maxHp));
    if (won) {
        state.titan.kills += 1;
        state.titan.bestPct = 0;   // the next Titan is stronger: no best try against it yet
        bumpStat(game, 'titanKills');
        const essence = 8 * level;
        const gold = 30 * goldPerKillAtStage(state.combat.bestStage, game.derived.goldMult);
        state.resources.essence += essence;
        state.gold += gold;
        bumpStat(game, 'goldEarned', gold);
        const gem = [...GEM_DROP_TABLE].reverse().find(g => g.tier <= Math.min(6, 1 + Math.floor(level / 2))) || GEM_DROP_TABLE[0];
        state.resources[gem.id] += 2;
        const bonus = TITAN_BONUS.atkMult * (titanBonusUnits(state.titan.kills) - titanBonusUnits(state.titan.kills - 1));   // half from the TITAN_LATE_FROM + 1st on
        log(game, `🗿 ${enemy.name} defeated! +${essence} essence, +${gold.toLocaleString()} gold, 2× ${RESOURCES[gem.id].name}; permanent +${+(bonus * 100).toFixed(1)}% ATK and HP.`, 'achievement');
        game.emit({ type: 'titan', won: true, reason, level, bonus });
    } else {
        const essence = Math.floor(dealt * 4 * level);
        state.resources.essence += essence;
        state.titan.bestPct = Math.max(state.titan.bestPct || 0, dealt);
        log(game, `🗿 ${enemy.name} survived with ${Math.round((1 - dealt) * 100)}% health. +${essence} essence for the damage dealt.`, 'combat');
        game.emit({ type: 'titan', won: false, reason, level, dealt });
    }
    returnToStages(game);
    // back to what the hero was doing when it began (titan.before; a save from before it fights on)
    const before = state.titan.before;
    state.titan.before = null;
    return resumeDoing(game, before);
}

/**
 * A Titan fight the page closed on (a reload): its attempt was spent when it began, so it is scored as a
 * Give up, by the damage the saved Titan had taken (`enemy`, the save's), quietly. The fight itself does
 * not come back (core/state.js).
 */
export function scoreTitanCutShort(game, enemy) {
    const state = game.state;
    if (!enemy || typeof enemy !== 'object' || !(Number(enemy.maxHp) > 0)) return;
    const dealt = Math.max(0, Math.min(1, 1 - Math.max(0, Number(enemy.hp) || 0) / Number(enemy.maxHp)));
    if (!(dealt > 0) || dealt >= 1) return;   // nothing done, or a fall the fight didn't live to count
    const essence = Math.floor(dealt * 4 * titanLevel(state));
    state.resources.essence += essence;
    state.titan.bestPct = Math.max(state.titan.bestPct || 0, dealt);
    log(game, `🗿 The Titan fight ended when the game closed: ${Math.round(dealt * 100)}% of its health taken. +${essence} essence.`, 'combat');
    game.markDirty();
}

/** Give up a Titan fight: it ends as a loss, scored by the damage dealt, and he goes back to what he was doing. */
export function giveUpTitan(game) {
    const c = game.state.combat;
    if (c.mode !== 'titan' || !c.active) return false;
    endTitan(game, false, 'left');
    game.markDirty();
    return true;
}

export { DUNGEONS };
