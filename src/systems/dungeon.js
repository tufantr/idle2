// Dungeons (authored gauntlets with a chest) and the Titan (an hourly damage race).
// Both reuse the combat loop through `state.combat.mode`: 'stages' | 'dungeon' | 'titan'.

import {
    DUNGEONS, dungeonById, UNIQUES, DUNGEON_MILESTONES, FRAGMENTS_PER_UNIQUE, DIRECT_UNIQUE_CHANCE,
    CHEST_GEAR_CHANCE, CHEST_ESSENCE_PER_TIER, CHEST_MATERIAL_ROLLS, CHEST_GEM_CHANCE,
    ELITE_HP_MULT, ELITE_ATK_MULT, DUNGEON_BOSS_HP_MULT, DUNGEON_BOSS_TIME_MS, DUNGEON_CHOICE_MS,
    TITAN_COOLDOWN_MS, TITAN_TIME_MS, TITAN_UNLOCK_STAGE, TITAN_HP_MULT, TITAN_ATK_MULT, TITAN_NAMES
} from '../data/dungeons.js';
import { enemyBaseStats, enemyDamage, generateDrop, generateEquipment, goldForKill, goldPerKillAtStage, enemyForStage, BALANCE } from '../core/formulas.js';
import { zoneForStage, GEM_DROP_TABLE } from '../data/zones.js';
import { RARITIES } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { rng } from '../core/rng.js';
import { addItem, dropTypesFor } from './inventory.js';
import { spawnEnemy, enterCombat } from './combat.js';
import { log, bumpStat } from './progress.js';

// ---------- enemies ----------

export function dungeonEnemy(run) {
    const d = dungeonById(run.id);
    const e = BALANCE.enemy;
    if (run.index < d.monsters.length) {
        const m = d.monsters[run.index];
        const stage = d.stage + run.index;
        const base = enemyBaseStats(stage);
        const hp = Math.floor(base.hp * ELITE_HP_MULT);
        return {
            name: m.name, baseName: m.name, icon: m.icon, zoneName: d.name, zoneTier: d.chestTier, stage, boss: false, elite: true,
            hp, maxHp: hp, atk: Math.floor(base.atk * ELITE_ATK_MULT), interval: base.interval
        };
    }
    const stage = d.stage + d.monsters.length;
    const base = enemyBaseStats(stage);
    const hp = Math.floor(base.hp * e.bossHpMult * DUNGEON_BOSS_HP_MULT);
    return {
        name: `${d.boss.name} (Boss)`, baseName: d.boss.name, icon: d.boss.icon, zoneName: d.name, zoneTier: d.chestTier, stage, boss: true,
        hp, maxHp: hp, atk: Math.floor(base.atk * e.bossAtkMult), interval: base.interval, timeLimit: DUNGEON_BOSS_TIME_MS
    };
}

export function titanLevel(state) {
    return (state.titan.kills || 0) + 1;
}

export function titanEnemy(state) {
    const level = titanLevel(state);
    const stage = 10 * (level + 1);
    const base = enemyBaseStats(stage);
    const e = BALANCE.enemy;
    const hp = Math.floor(base.hp * e.bossHpMult * TITAN_HP_MULT);
    const name = `Titan of ${TITAN_NAMES[(level - 1) % TITAN_NAMES.length]}${level > TITAN_NAMES.length ? ` ${Math.ceil(level / TITAN_NAMES.length)}` : ''}`;
    return {
        name, baseName: name, icon: '🗿', zoneName: 'Titan challenge', zoneTier: Math.min(7, 1 + Math.floor(level / 2)), stage, boss: true, titan: true,
        hp, maxHp: hp, atk: Math.floor(base.atk * e.bossAtkMult * TITAN_ATK_MULT), interval: base.interval, timeLimit: TITAN_TIME_MS
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

/** Preview of a dungeon's hardest elite and its boss. */
export function dungeonPreview(derived, dungeon) {
    const elite = dungeonEnemy({ id: dungeon.id, index: dungeon.monsters.length - 1 });
    const boss = dungeonEnemy({ id: dungeon.id, index: dungeon.monsters.length });
    return { elite, boss, eliteFight: fightPreview(derived, elite), bossFight: fightPreview(derived, boss) };
}

// ---------- dungeons ----------

export function dungeonUnlocked(state, dungeon) {
    return state.combat.bestStage >= dungeon.unlockStage || !!state.settings.devUnlockAll;
}

export function enterDungeon(game, id) {
    const state = game.state;
    const d = dungeonById(id);
    if (!d) return false;
    if (!dungeonUnlocked(state, d)) { game.emit({ type: 'error', text: `Reach stage ${d.unlockStage} to open ${d.name}.` }); return false; }
    const c = state.combat;
    if (c.mode === 'titan') { game.emit({ type: 'error', text: 'Finish the Titan fight first.' }); return false; }
    if (c.mode === 'dungeon') {
        if (c.dungeon?.id === id) return true;
        failDungeon(game, `you left for ${d.name}`);
    }
    c.mode = 'dungeon';
    c.dungeon = { id, index: 0, repeat: false, choiceLeft: 0 };   // the first clear asks whether to keep going
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
    const d = dungeonById(state.combat.dungeon.id);
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

/** True if a copy of this unique is worn or in the bag. */
export function ownsUnique(state, uniqueId) {
    return [...state.inventory, ...Object.values(state.equipped)].some(i => i && i.uniqueId === uniqueId);
}

function grantUnique(game, uniqueId) {
    const state = game.state;
    const u = UNIQUES[uniqueId];
    const legendary = RARITIES.find(r => r.id === 'legendary');
    const item = generateEquipment({ type: u.type, tier: u.tier, power: u.power, materialName: u.name, rarity: legendary, source: 'unique' }, state.idCounter++);
    item.name = u.name;
    item.uniqueId = u.id;
    item.color = '#f97316';
    item.affixes = u.affixes.map(a => ({ id: a.stat, name: a.name, stat: a.stat, value: a.value, format: 'pct' }));
    // The first copy starts protected. A spare stays unlocked, so a full bag can salvage it for essence
    // instead of filling up with locked duplicates.
    const spare = ownsUnique(state, u.id);
    item.locked = !spare;
    addItem(game, item);
    bumpStat(game, 'uniquesFound');
    log(game, spare ? `🌟 Another ${u.name} — a spare, unlocked so it can be salvaged for essence.` : `🌟 Unique item: ${u.name}!`, 'loot');
    game.emit({ type: 'unique', item });
    return item;
}

/** Called by combat when a dungeon monster dies. */
export function onDungeonKill(game) {
    const state = game.state;
    const c = state.combat;
    const d = dungeonById(c.dungeon.id);
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
    const zone = zoneForStage(d.stage);
    if (rng.chance(CHEST_GEAR_CHANCE * dropMult)) {
        const item = generateDrop(d.chestTier, true, state.idCounter++, zone.depth, dropTypesFor(state, d.chestTier));   // as strong as the dungeon's depth in the Abyss, like its monsters' drops
        bumpStat(game, 'itemsDropped');
        const result = addItem(game, item);
        if (result.kept) kept = item;
        parts.push(result.kept ? item.name : `${item.name} (salvaged)`);
    }
    const fragments = rng.chance(0.03) ? 3 : 1;
    record.fragments += fragments;
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
    if (rng.chance(DIRECT_UNIQUE_CHANCE)) grantUnique(game, d.unique);

    log(game, `🎁 ${d.name} cleared (${record.clears}): ${parts.join(', ')}.`, 'loot');
    for (const m of DUNGEON_MILESTONES) {
        if (record.clears !== m.clears) continue;
        log(game, `🏅 ${d.name}: ${m.clears} clears — ${m.desc} (permanent).`, 'achievement');
        game.emit({ type: 'dungeonMilestone', dungeon: d.id, clears: m.clears, desc: m.desc });
    }
    // what the chest held, for the scene to show (the gear kept, if any, is `item`)
    game.emit({ type: 'dungeonClear', dungeon: d.id, clears: record.clears, item: kept, loot: { fragments, essence, materials } });
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
    const item = grantUnique(game, d.unique);
    game.markDirty();
    return item;
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
    const d = dungeonById(c.dungeon?.id);
    log(game, `${d?.icon || '🕳️'} ${d?.name || 'Dungeon'} run failed: ${reason}. Progress in the run is lost.`, 'death');
    game.emit({ type: 'dungeonFail', dungeon: d?.id, reason, lost });
    returnToStages(game);
}

// ---------- the Titan ----------

export function titanUnlocked(state) {
    return state.combat.bestStage >= TITAN_UNLOCK_STAGE || !!state.settings.devUnlockAll;
}

export function titanReady(state, now) {
    return titanUnlocked(state) && now >= (state.titan.readyAt || 0);
}

export function challengeTitan(game) {
    const state = game.state;
    if (!titanReady(state, game.now)) {
        game.emit({ type: 'error', text: titanUnlocked(state) ? 'The Titan is resting.' : `Reach stage ${TITAN_UNLOCK_STAGE} to face the Titan.` });
        return false;
    }
    const c = state.combat;
    if (c.mode === 'titan') return false;
    if (c.mode === 'dungeon') failDungeon(game, 'you left to face the Titan');
    state.titan.readyAt = game.now + TITAN_COOLDOWN_MS;
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

/** End a titan fight. `won` = the titan fell in time. */
export function endTitan(game, won) {
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
        log(game, `🗿 ${enemy.name} defeated! +${essence} essence, +${gold.toLocaleString()} gold, 2× ${RESOURCES[gem.id].name}; permanent +2% ATK and HP.`, 'achievement');
        game.emit({ type: 'titan', won: true, level });
    } else {
        const essence = Math.floor(dealt * 4 * level);
        state.resources.essence += essence;
        state.titan.bestPct = Math.max(state.titan.bestPct || 0, dealt);
        log(game, `🗿 ${enemy.name} survived with ${Math.round((1 - dealt) * 100)}% health. +${essence} essence for the damage dealt.`, 'combat');
        game.emit({ type: 'titan', won: false, level, dealt });
    }
    returnToStages(game);
}

export { DUNGEONS };
