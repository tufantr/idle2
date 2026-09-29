// Auto-battler: player and enemy attack on their own timers; food, potions, loot, death, clicks.

import { enemyForStage, enemyDamage, goldForKill, combatXpForKill, BALANCE } from '../core/formulas.js';
import { zoneForStage, GEM_DROP_TABLE, STAGES_PER_ZONE } from '../data/zones.js';
import { RESOURCES, orderedByTier } from '../data/resources.js';
import { rng } from '../core/rng.js';
import { grantXp, log, bumpStat } from './progress.js';

export function spawnEnemy(game) {
    const c = game.state.combat;
    c.enemy = enemyForStage(c.stage);
    c.playerTimer = 0;
    c.enemyTimer = 0;
    c.bossTimeLeft = c.enemy.boss ? BALANCE.combat.bossTimeMs : 0;
}

export function enterCombat(game) {
    const state = game.state;
    if (state.combat.active) return;
    if (state.action) { state.action = null; game.emit({ type: 'actionStop' }); }
    state.combat.active = true;
    state.combat.combo = 0;
    if (state.combat.hp <= 0) state.combat.hp = game.derived.maxHp;
    if (!state.combat.enemy || state.combat.enemy.stage !== state.combat.stage) spawnEnemy(game);
    game.markDirty();
}

export function leaveCombat(game) {
    const state = game.state;
    if (!state.combat.active) return;
    state.combat.active = false;
    state.combat.combo = 0;
    game.markDirty();
}

export function setStage(game, stage) {
    const state = game.state;
    const target = Math.max(1, Math.min(state.combat.maxStage, Math.floor(stage)));
    if (target === state.combat.stage) return;
    state.combat.stage = target;
    spawnEnemy(game);
    game.markDirty();
}

function chooseFood(state, missing, foodMult) {
    const rule = state.combat.autoEat;
    if (rule === 'none') return null;
    if (rule !== 'auto') return state.resources[rule] > 0 ? rule : null;
    // 'auto': the smallest food that covers what is missing, else the biggest we have.
    let best = null;
    for (const res of orderedByTier('food')) {
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
    let critChance = d.critChance + (combo >= 10 ? 0.10 : 0);
    const isCrit = rng.chance(critChance);
    let dmg = d.atk * (isCrit ? d.critDmg : 1) * comboMultiplier(combo) * (manual ? BALANCE.combat.manualHitMult : 1);
    dmg = Math.max(1, Math.round(dmg * rng.float(0.9, 1.1)));
    enemy.hp -= dmg;

    const lifesteal = d.lifesteal + (combo >= 20 ? 0.15 : 0);
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

function rollLoot(game, enemy) {
    const state = game.state;
    const d = game.derived;
    const r = BALANCE.rewards;
    const zone = zoneForStage(enemy.stage);
    const drops = [];
    const material = () => {
        const pick = rng.weighted(zone.loot);
        const qty = 1 + Math.floor(zone.tier / 3);
        state.resources[pick.id] += qty;
        drops.push({ id: pick.id, qty });
    };
    if (enemy.boss || rng.chance(r.materialDropChance * d.dropMult)) material();
    if (rng.chance(r.gemDropChance * d.dropMult * (enemy.boss ? 10 : 1))) {
        const candidates = GEM_DROP_TABLE.filter(g => Math.abs(g.tier - zone.tier) <= 1).map(g => ({ ...g, weight: g.tier <= zone.tier ? 3 : 1 }));
        const gem = rng.weighted(candidates);
        state.resources[gem.id] += 1;
        bumpStat(game, 'gemsFound');
        drops.push({ id: gem.id, qty: 1 });
    }
    let essence = 0;
    if (enemy.boss) essence = rng.int(r.bossEssence[0], r.bossEssence[1]) * Math.max(1, Math.round(zone.tier / 2));
    else if (rng.chance(r.essenceDropChance * d.dropMult)) essence = rng.int(1, 2);
    if (essence) { state.resources.essence += essence; bumpStat(game, 'essenceFound', essence); drops.push({ id: 'essence', qty: essence }); }
    return drops;
}

export function onEnemyDeath(game) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const enemy = c.enemy;

    const gold = goldForKill(enemy, d.goldMult);
    const xp = combatXpForKill(enemy, d.combatXpMult);
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    bumpStat(game, 'kills');
    if (enemy.boss) bumpStat(game, 'bossKills');
    grantXp(game, 'combat', xp);
    const drops = rollLoot(game, enemy);

    game.emit({ type: 'kill', enemy, gold, xp, drops });
    if (enemy.boss || drops.some(dr => dr.id === 'essence' || RESOURCES[dr.id].category === 'gem')) {
        const dropText = drops.map(dr => `${dr.qty}× ${RESOURCES[dr.id].name}`).join(', ');
        log(game, `${enemy.icon} ${enemy.name} defeated${dropText ? ` — ${dropText}` : ''}`, 'combat');
    }

    if (!c.farmMode && !(c.regroupLeft > 0)) {
        c.stage += 1;
        if (c.stage > c.maxStage) c.maxStage = c.stage;
        if (c.stage > c.bestStage) c.bestStage = c.stage;
        if (c.bestStage > state.stats.maxStage) state.stats.maxStage = c.bestStage;
    }
    spawnEnemy(game);
    game.markDirty();
}

export function onPlayerDeath(game) {
    const state = game.state;
    const c = state.combat;
    bumpStat(game, 'deaths');
    // Retreat to the start of the current zone: bosses are meant to be prepared for, not crawled past.
    const zoneStart = Math.floor((c.stage - 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE + 1;
    const retreatTo = Math.max(1, Math.min(zoneStart, c.stage - BALANCE.combat.retreatStages));
    log(game, `💀 You were defeated at stage ${c.stage}. Retreated to stage ${retreatTo}.`, 'death');
    game.emit({ type: 'death', stage: c.stage });
    c.stage = retreatTo;
    c.hp = Math.max(1, Math.floor(game.derived.maxHp * BALANCE.combat.deathHpFraction));
    c.combo = 0;
    c.active = false;
    spawnEnemy(game);
    game.markDirty();
}

/** The boss outlasted its timer: step back one stage and farm there for a minute before retrying. */
export function onBossTimeout(game) {
    const c = game.state.combat;
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
        return;
    }
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
            playerAttack(game);
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
