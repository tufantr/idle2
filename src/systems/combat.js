// Auto-battler: player and enemy attack on their own timers; food, potions, loot, death, clicks.

import { enemyForStage, enemyBaseStats, enemyDamage, goldForKill, combatXpForKill, generateDrop, BALANCE } from '../core/formulas.js';
import { BASE } from '../core/modifiers.js';
import { GEAR_DROP_CHANCE, RARITIES } from '../data/items.js';
import { addItem } from './inventory.js';
import { ZONES, zoneForStage, GEM_DROP_TABLE, STAGES_PER_ZONE, isBossStage } from '../data/zones.js';
import { RESOURCES, foodsByHealing } from '../data/resources.js';
import { rng } from '../core/rng.js';
import { grantXp, log, bumpStat, rollPet } from './progress.js';
import { dungeonEnemy, titanEnemy, onDungeonKill, failDungeon, endTitan, choosingAfterClear, tickDungeonChoice } from './dungeon.js';
import { COMBAT_PET_SECONDS } from '../data/pets.js';
import { eventProgress } from './events.js';
import { BESTIARY_NAMES, starsFor } from '../data/bestiary.js';

/** Spawn the next enemy for the current mode: the stage ladder, a dungeon run, or the Titan. */
export function spawnEnemy(game) {
    const state = game.state;
    const c = state.combat;
    if (c.mode === 'dungeon' && c.dungeon) c.enemy = dungeonEnemy(c.dungeon);
    else if (c.mode === 'titan') c.enemy = titanEnemy(state);
    else {
        c.mode = 'stages';
        c.enemy = enemyForStage(c.stage);
        // Now and then a regular monster comes gilded: the same fight, a far better payout.
        if (!c.enemy.boss && rng.chance(BALANCE.rewards.gildedChance * (game.derived?.gildedMult || 1))) {
            c.enemy = { ...c.enemy, gilded: true, name: `Gilded ${c.enemy.name}` };
            game.emit({ type: 'gilded', enemy: c.enemy });
        }
    }
    c.playerTimer = 0;
    c.enemyTimer = 0;
    c.bossTimeLeft = c.enemy.boss ? (c.enemy.timeLimit || BALANCE.combat.bossTimeMs) : 0;
}

export function enterCombat(game) {
    const state = game.state;
    const c = state.combat;
    if (c.active) return;
    if (state.action) { state.action = null; game.emit({ type: 'actionStop' }); }
    c.active = true;
    c.recovering = false;
    c.combo = 0;
    if (c.hp <= 0) c.hp = game.derived.maxHp;
    if ((!c.enemy && !choosingAfterClear(state)) || (c.mode === 'stages' && c.enemy?.stage !== c.stage)) spawnEnemy(game);
    game.markDirty();
}

/** Stop fighting. Leaving mid-dungeon abandons the run; leaving the Titan ends the attempt. */
export function leaveCombat(game) {
    const c = game.state.combat;
    c.recovering = false;
    if (!c.active) return;
    if (c.mode === 'dungeon') failDungeon(game, 'you left');
    else if (c.mode === 'titan') endTitan(game, false);
    c.active = false;
    c.combo = 0;
    game.markDirty();
}

export function setStage(game, stage) {
    const state = game.state;
    if (state.combat.mode !== 'stages') return;
    const target = Math.max(1, Math.min(state.combat.maxStage, Math.floor(stage)));
    if (target === state.combat.stage) return;
    state.combat.stage = target;
    spawnEnemy(game);
    game.markDirty();
}

/**
 * The world map's Travel: to `stage` on the ladder. A dungeon run under way is given up on the way
 * out (as leaving it would); the Titan fight has to end first.
 */
export function travelTo(game, stage) {
    const c = game.state.combat;
    if (c.mode === 'titan') { game.emit({ type: 'error', text: 'Finish the Titan fight first.' }); return false; }
    if (c.mode === 'dungeon') failDungeon(game, 'you left for the stages');
    setStage(game, stage);
    return true;
}

function chooseFood(state, missing, foodMult) {
    const rule = state.combat.autoEat;
    if (rule === 'none') return null;
    if (rule !== 'auto') return state.resources[rule] > 0 ? rule : null;
    // 'auto': the smallest food that covers what is missing, else the biggest we have.
    let best = null;
    for (const res of foodsByHealing()) {
        if (!(state.resources[res.id] > 0)) continue;
        best = res.id;
        if (res.heals * foodMult >= missing) return res.id;
    }
    return best;
}

/** Eat until above the auto-eat threshold. Returns number of items eaten. */
export function tryEat(game) {
    const state = game.state;
    const d = game.derived;
    let eaten = 0;
    while (state.combat.hp > 0 && state.combat.hp < d.maxHp * d.autoEatThreshold && eaten < 5) {
        const food = chooseFood(state, d.maxHp - state.combat.hp, d.foodMult);
        if (!food) break;
        state.resources[food] -= 1;
        state.combat.hp = Math.min(d.maxHp, state.combat.hp + Math.round(RESOURCES[food].heals * d.foodMult));
        eaten++;
    }
    return eaten;
}

/** Keep the selected potion charged; returns true if a potion effect is active. */
export function ensurePotion(game) {
    const state = game.state;
    const c = state.combat;
    if (c.potion === 'none') { c.potionCharges = 0; return false; }
    if (c.potionCharges > 0) return true;
    if (state.resources[c.potion] > 0) {
        state.resources[c.potion] -= 1;
        c.potionCharges = game.derived.potionCharges;
        game.markDirty();
        return true;
    }
    return false;
}

export function setPotion(game, id) {
    const state = game.state;
    if (id !== 'none' && !RESOURCES[id]) return;
    if (state.combat.potion !== id) {
        state.combat.potion = id;
        state.combat.potionCharges = 0;
        game.markDirty();
    }
}

export function setAutoEat(game, rule) {
    game.state.combat.autoEat = rule;
}

function comboMultiplier(combo) {
    return 1 + Math.min(BALANCE.combat.comboMax, combo) * BALANCE.combat.comboDmgPerStack;
}

/** One player attack. `manual` clicks hit for half damage and build the combo. */
export function playerAttack(game, { manual = false } = {}) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const enemy = c.enemy;
    if (!enemy || enemy.hp <= 0) return 0;

    const potionActive = ensurePotion(game);
    const combo = c.combo || 0;
    const critChance = Math.min(BASE.caps.critChance, d.critChance + (combo >= 10 ? 0.10 : 0));
    const isCrit = rng.chance(critChance);
    let dmg = d.atk * (isCrit ? d.critDmg : 1) * comboMultiplier(combo) * (manual ? BALANCE.combat.manualHitMult : 1);
    dmg = Math.max(1, Math.round(dmg * rng.float(0.9, 1.1)));
    enemy.hp -= dmg;

    const lifesteal = Math.min(BASE.caps.lifesteal, d.lifesteal + (combo >= 20 ? 0.15 : 0));
    if (lifesteal > 0) c.hp = Math.min(d.maxHp, c.hp + Math.round(dmg * lifesteal));

    if (potionActive && !manual) {
        c.potionCharges -= 1;
        if (c.potionCharges <= 0) { c.potionCharges = 0; game.markDirty(); }
    }

    game.emit({ type: 'hit', dmg, crit: isCrit, manual });
    if (enemy.hp <= 0) onEnemyDeath(game);
    return dmg;
}

export function enemyAttack(game) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const enemy = c.enemy;
    if (!enemy || enemy.hp <= 0) return 0;
    if (rng.chance(d.dodge)) { game.emit({ type: 'dodge' }); return 0; }
    const dmg = enemyDamage(enemy.atk, d.def);
    c.hp -= dmg;
    game.emit({ type: 'enemyHit', dmg });
    if (c.hp <= 0) onPlayerDeath(game);
    return dmg;
}

/**
 * How a kill pays out. A boss pays its full bonus (gold x3, XP x5, its loot table) when beating it
 * moves you on — the first time it falls in a run — and the Titan always does. A boss you farm after
 * beating it, or a dungeon boss (whose reward is the chest), pays like the regular monsters its
 * health is worth, so parking on a boss is never the best way to farm.
 */
export function killPayout(state, enemy) {
    const c = state.combat;
    const full = !!enemy.boss && (!!enemy.titan || (c.mode === 'stages' && !c.farmMode && enemy.stage === c.maxStage));
    const rolls = enemy.boss && !full ? Math.max(1, Math.round(enemy.maxHp / Math.max(1, enemyBaseStats(enemy.stage).hp))) : 1;
    return { full, rolls };
}

function rollLoot(game, enemy, payout) {
    const state = game.state;
    const d = game.derived;
    const r = BALANCE.rewards;
    const zone = zoneForStage(enemy.stage);
    const boss = payout.full;
    const drops = [];
    const add = (id, qty) => {
        state.resources[id] += qty;
        const entry = drops.find(dr => dr.id === id);
        if (entry) entry.qty += qty; else drops.push({ id, qty });
    };
    for (let roll = 0; roll < payout.rolls; roll++) {
        if (boss || rng.chance(r.materialDropChance * d.dropMult)) add(rng.weighted(zone.loot).id, 1 + Math.floor(zone.tier / 3));
        if (rng.chance(r.gemDropChance * d.dropMult * (boss ? 10 : 1))) {
            add(pickGem(zone), 1);
            bumpStat(game, 'gemsFound');
        }
        let essence = 0;
        if (boss) essence = rng.int(r.bossEssence[0], r.bossEssence[1]) * Math.max(1, Math.round(zone.tier / 2));
        else if (rng.chance(r.essenceDropChance * d.dropMult)) essence = rng.int(1, 2);
        if (essence) { add('essence', essence); bumpStat(game, 'essenceFound', essence); }

        // Gear: rare from regular monsters, a coin flip from a boss's first fall; tier follows the zone.
        const gearChance = (boss ? GEAR_DROP_CHANCE.boss : GEAR_DROP_CHANCE.regular) * d.dropMult;
        if (rng.chance(gearChance)) {
            const item = generateDrop(zone.gearTier, boss, state.idCounter++, zone.depth);
            const result = addItem(game, item);
            bumpStat(game, 'itemsDropped');
            drops.push({ item, kept: result.kept });
            const rank = RARITIES.findIndex(rr => rr.id === item.rarity);
            if (result.kept && rank >= 2) log(game, `${item.icon} ${RARITIES[rank].name} ${item.name} dropped!`, 'loot');
            if (result.kept) game.emit({ type: 'itemDropped', item });
        }
    }
    if (enemy.gilded) {   // a gilded monster always leaves a gem and some essence
        add(pickGem(zone), 1);
        bumpStat(game, 'gemsFound');
        const essence = rng.int(r.gildedEssence[0], r.gildedEssence[1]) * Math.max(1, Math.round(zone.tier / 2));
        add('essence', essence);
        bumpStat(game, 'essenceFound', essence);
    }
    return drops;
}

/** A gem of about the zone's tier (one either side, the lower ones three times as likely). */
function pickGem(zone) {
    const candidates = GEM_DROP_TABLE.filter(g => Math.abs(g.tier - zone.tier) <= 1).map(g => ({ ...g, weight: g.tier <= zone.tier ? 3 : 1 }));
    return rng.weighted(candidates).id;
}

/** The bestiary: one more of this kind defeated, and a star when it reaches 10, 100 or 1,000. */
function countKind(game, enemy) {
    if (enemy.titan || !BESTIARY_NAMES.has(enemy.baseName)) return;
    const stats = game.state.stats;
    const before = stats.killsByMonster[enemy.baseName] || 0;
    stats.killsByMonster[enemy.baseName] = before + 1;
    const stars = starsFor(before + 1);
    if (stars > starsFor(before)) {
        stats.bestiaryStars += 1;
        game.emit({ type: 'bestiaryStar', name: enemy.baseName, stars, kills: before + 1 });
    }
}

export function onEnemyDeath(game) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const enemy = c.enemy;

    const payout = killPayout(state, enemy);
    const paidAs = payout.full ? enemy : { ...enemy, boss: false };
    const r = BALANCE.rewards;
    const gold = goldForKill(paidAs, d.goldMult) * (enemy.gilded ? r.gildedGoldMult : 1);
    const xp = combatXpForKill(paidAs, d.combatXpMult) * payout.rolls * (enemy.gilded ? r.gildedXpMult : 1);
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    bumpStat(game, 'kills');
    if (enemy.boss) bumpStat(game, 'bossKills');
    if (enemy.gilded) bumpStat(game, 'gildedKills');
    countKind(game, enemy);
    grantXp(game, 'combat', xp);
    const drops = rollLoot(game, enemy, payout);

    game.emit({ type: 'kill', enemy, gold, xp, drops });
    if ((enemy.boss && !enemy.titan) || drops.some(dr => dr.id === 'essence' || RESOURCES[dr.id]?.category === 'gem')) {
        const dropText = drops.map(dr => (dr.item ? dr.item.name : `${dr.qty}× ${RESOURCES[dr.id].name}`)).join(', ');
        log(game, `${enemy.icon} ${enemy.name} defeated${dropText ? ` — ${dropText}` : ''}`, 'combat');
    }
    rollPet(game, 'combat', COMBAT_PET_SECONDS * 1000);
    eventProgress(game, 1);

    if (c.mode === 'dungeon') { onDungeonKill(game); game.markDirty(); return; }
    if (c.mode === 'titan') { endTitan(game, true); game.markDirty(); return; }
    // Beating the boss ends a regroup: you move on (otherwise it could be farmed at its first-fall payout).
    if (enemy.boss) c.regroupLeft = 0;
    if (!c.farmMode && !(c.regroupLeft > 0)) {
        c.stage += 1;
        if (c.stage > c.maxStage) c.maxStage = c.stage;
        if (c.stage > c.bestStage) {
            c.bestStage = c.stage;
            // the first step ever into a zone (the Abyss once, at its first depth)
            const zone = Math.floor((c.stage - 1) / STAGES_PER_ZONE);
            if ((c.stage - 1) % STAGES_PER_ZONE === 0 && zone >= 1 && zone < ZONES.length) game.emit({ type: 'zoneReached', zone: ZONES[zone].id, stage: c.stage });
        }
        if (c.bestStage > state.stats.maxStage) state.stats.maxStage = c.bestStage;
    }
    spawnEnemy(game);
    game.markDirty();
}

export function onPlayerDeath(game) {
    const state = game.state;
    const c = state.combat;
    bumpStat(game, 'deaths');
    const mode = c.mode;
    if (mode !== 'stages') {
        if (mode === 'dungeon') failDungeon(game, 'you were defeated');
        else endTitan(game, false);
        game.emit({ type: 'death', stage: c.stage, mode });
        c.hp = Math.max(1, Math.floor(game.derived.maxHp * BALANCE.combat.deathHpFraction));
        c.combo = 0;
        c.active = false;
        c.recovering = true;
        game.markDirty();
        return;
    }
    // Retreat to the start of the current zone: bosses are meant to be prepared for, not crawled past.
    // Dying on a zone's first stage steps back one more, but never onto the previous zone's boss.
    const zoneStart = Math.floor((c.stage - 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE + 1;
    let retreatTo = Math.max(1, Math.min(zoneStart, c.stage - BALANCE.combat.retreatStages));
    if (retreatTo > 1 && isBossStage(retreatTo)) retreatTo -= 1;
    log(game, `💀 You were defeated at stage ${c.stage}. Retreated to stage ${retreatTo}.`, 'death');
    game.emit({ type: 'death', stage: c.stage, mode });
    c.stage = retreatTo;
    c.regroupLeft = 0;
    c.hp = Math.max(1, Math.floor(game.derived.maxHp * BALANCE.combat.deathHpFraction));
    c.combo = 0;
    c.active = false;
    c.recovering = true;   // he rests to full health, then fights on from here by himself
    spawnEnemy(game);
    game.markDirty();
}

/** The boss outlasted its timer: step back one stage and farm there for a minute before retrying. */
export function onBossTimeout(game) {
    const c = game.state.combat;
    if (c.mode === 'dungeon') { failDungeon(game, `${c.enemy.name} outlasted the ${Math.round((c.enemy.timeLimit || 0) / 1000)} s timer`); return; }
    if (c.mode === 'titan') { endTitan(game, false); return; }
    bumpStat(game, 'bossEscapes');
    const back = Math.max(1, c.stage - 1);
    log(game, `⏳ ${c.enemy.name} held out for ${BALANCE.combat.bossTimeMs / 1000}s. Regrouping at stage ${back}; the boss will be retried in ${BALANCE.combat.regroupMs / 1000}s.`, 'death');
    game.emit({ type: 'bossTimeout', stage: c.stage });
    c.stage = back;
    c.regroupLeft = BALANCE.combat.regroupMs;
    spawnEnemy(game);
    game.markDirty();
}

/** Manual click on the enemy: builds combo and lands a half-damage hit. */
export function clickAttack(game) {
    const state = game.state;
    const c = state.combat;
    if (!c.active || !c.enemy) return false;
    if (game.now - (c.lastClickAt || 0) < 120) return false; // no benefit from auto-clickers
    c.lastClickAt = game.now;
    c.combo = Math.min(BALANCE.combat.comboMax, (c.combo || 0) + 1 / (1 + (c.combo || 0) / 40));
    c.lastComboAt = game.now;
    playerAttack(game, { manual: true });
    // Echo strike at full combo.
    if (c.combo >= 30 && c.enemy && c.enemy.hp > 0 && rng.chance(0.2)) playerAttack(game, { manual: true });
    return true;
}

/** Advance combat by dt ms (may resolve several attacks if dt is large). */
export function tickCombat(game, dt) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const regen = c.active ? BALANCE.combat.regenInCombat : BALANCE.combat.regenResting;
    if (c.hp > 0 && c.hp < d.maxHp) c.hp = Math.min(d.maxHp, c.hp + d.maxHp * regen * dt / 1000);
    if (!c.active) {
        if (c.combo > 0) c.combo = 0;
        // Fallen and rested: back on his feet and into the fight, unless he was given work meanwhile.
        if (c.recovering && !state.action && c.hp >= d.maxHp) {
            enterCombat(game);
            bumpStat(game, 'recoveries');
            game.emit({ type: 'recovered', stage: c.stage });
        }
        return;
    }
    if (choosingAfterClear(state)) { tickDungeonChoice(game, dt); return; }   // waiting at the chest after a clear
    if (!c.enemy) spawnEnemy(game);

    if (c.combo > 0 && game.now - (c.lastComboAt || 0) > BALANCE.combat.comboDecayAfterMs) {
        c.combo = Math.max(0, c.combo - (0.05 + c.combo / 100) * (dt / 50));
    }
    if (c.regroupLeft > 0) c.regroupLeft = Math.max(0, c.regroupLeft - dt);

    const bossAtStart = c.enemy.boss ? c.enemy : null;
    c.playerTimer += dt;
    c.enemyTimer += dt;
    let guard = 0;
    while (c.active && guard++ < 400) {
        const pReady = c.playerTimer >= d.attackInterval;
        const eReady = c.enemyTimer >= c.enemy.interval;
        if (!pReady && !eReady) break;
        // Resolve whichever attack comes first in time order.
        const pOver = c.playerTimer - d.attackInterval;
        const eOver = c.enemyTimer - c.enemy.interval;
        if (pReady && (!eReady || pOver >= eOver)) {
            c.playerTimer -= d.attackInterval;
            tryEat(game);
            const target = c.enemy;
            const leftover = c.playerTimer;
            playerAttack(game);
            if (choosingAfterClear(state)) break;   // the run is won: no monster now, the hero waits at the chest
            // A kill spawns the next enemy with fresh timers; it has been there for the rest of this step.
            if (c.active && c.enemy !== target) {
                c.playerTimer = leftover;
                c.enemyTimer = leftover;
                if (c.enemy.boss) c.bossTimeLeft -= leftover;
            }
        } else {
            c.enemyTimer -= c.enemy.interval;
            tryEat(game);
            enemyAttack(game);
        }
    }

    // Boss timer counts fighting time only, so it behaves the same offline and online.
    if (bossAtStart && c.active && c.enemy === bossAtStart) {
        c.bossTimeLeft -= dt;
        if (c.bossTimeLeft <= 0) onBossTimeout(game);
    }
}
