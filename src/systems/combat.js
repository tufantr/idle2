// Auto-battler: player and enemy attack on their own timers; food, potions, loot, death, clicks.

import { enemyForStage, enemyBaseStats, enemyDamage, goldForKill, combatXpForKill, generateDrop, generateEquipment, BALANCE } from '../core/formulas.js';
import { BASE, skillLevel } from '../core/modifiers.js';
import { GEAR_DROP_CHANCE, RARITIES, SMITHING_TYPES, PITY_MARKS, FRONTIER_DROP, MYTHIC, PRIMAL } from '../data/items.js';
import { addItem, dropTypesFor, isUpgrade, laggingSlot, PITY_LAG } from './inventory.js';
import { ZONES, zoneForStage, GEM_DROP_TABLE, STAGES_PER_ZONE, isBossStage } from '../data/zones.js';
import { RESOURCES, foodsByHealing, foodHeal } from '../data/resources.js';
import { spendFightPotion } from './potions.js';
import { rng } from '../core/rng.js';
import { grantXp, log, bumpStat, rollPet } from './progress.js';
import { dungeonEnemy, titanEnemy, onDungeonKill, failDungeon, endTitan, choosingAfterClear, tickDungeonChoice } from './dungeon.js';
import { COMBAT_PET_SECONDS } from '../data/pets.js';
import { VOIDSTONE_DEPTH, VOIDSTONE_CHANCE } from '../data/workshop.js';
import { eventProgress } from './events.js';
import { BESTIARY_NAMES, starsFor } from '../data/bestiary.js';
import { trialBite } from '../data/trials.js';
import { stratumStartingAt } from '../data/strata.js';
import { checkTrial } from './trials.js';
import { clanBossEnemy, endClanFight, noteClanStrike, clanGuardOpen } from './clanfight.js';
import { CLAN_GUARD } from '../data/social.js';

const FIRST_GILDED_STAGE = 7;

/** Spawn the next enemy for the current mode: the stage ladder, a dungeon run, or the Titan. */
/**
 * How many monsters stand on a stage of the ladder (BALANCE.combat.firstPack): a pack on the first trip
 * through the first places, where the stage was never cleared (it is the best stage), else one. Never in
 * a Trial, a stay-on-stage farm, a dungeon or before the Titan; a boss stands alone.
 */
export function packSize(state, stage = state.combat.stage) {
    const c = state.combat;
    const p = BALANCE.combat.firstPack;
    if (c.mode !== 'stages' || c.farmMode || state.trials?.active || stage < p.from || stage > p.to || isBossStage(stage) || stage < c.bestStage) return 1;
    return Math.max(1, Math.floor(p.size));
}

export function spawnEnemy(game) {
    const state = game.state;
    const c = state.combat;
    // Waiting at the chest after a clear there is no monster (a reload used to bring the boss back for another clear).
    if (choosingAfterClear(state)) { c.enemy = null; return; }
    if (c.mode === 'dungeon' && c.dungeon) c.enemy = dungeonEnemy(c.dungeon);
    else if (c.mode === 'titan') c.enemy = titanEnemy(state);
    else if (c.mode === 'clan') c.enemy = clanBossEnemy(state);
    else {
        c.mode = 'stages';
        c.enemy = enemyForStage(c.stage);
        // a Trial's monsters (data/trials.js): harder hitting, tougher, or bosses with less time; each
        // pays as ever (its worth is its health before the Trial)
        const bite = trialBite(state);
        if (bite.enemyAtk || bite.enemyHp) {
            const hp = Math.floor(c.enemy.maxHp * (bite.enemyHp || 1));
            c.enemy = { ...c.enemy, worth: c.enemy.worth || c.enemy.maxHp, atk: c.enemy.atk * (bite.enemyAtk || 1), hp, maxHp: hp };
        }
        if (bite.bossTime && c.enemy.boss) c.enemy = { ...c.enemy, timeLimit: (c.enemy.timeLimit || BALANCE.combat.bossTimeMs) * bite.bossTime };
        // Now and then a regular monster comes gilded: the same fight, a far better payout. A new hero
        // meets his first at stage 7 (one in 150 is too rare for the first minutes).
        const firstGilded = c.stage === FIRST_GILDED_STAGE && c.stage === c.maxStage && !c.farmMode && !state.stats.gildedKills && !state.prestige.count;
        if (!c.enemy.boss && (firstGilded || rng.chance(BALANCE.rewards.gildedChance * (game.derived?.gildedMult || 1)))) {
            c.enemy = { ...c.enemy, gilded: true, name: `Gilded ${c.enemy.name}` };
            game.emit({ type: 'gilded', enemy: c.enemy });
        }
    }
    c.playerTimer = 0;
    c.enemyTimer = 0;
    c.bossTimeLeft = c.enemy.boss ? (c.enemy.timeLimit || BALANCE.combat.bossTimeMs) : 0;
    c.enemyAt = game.now;   // it drops in first (droppingIn)
}

/**
 * Is the monster in front of him still dropping in (BALANCE.combat.dropInMs, its entrance on screen)? No strike reaches it
 * until it has landed; his own swings, 750 ms apart at the quickest, never wait for it. On the stages and in a dungeon
 * only: the Titan and the clan's boss are one fight each. A time before it came (the clock turned back) has it landed.
 */
export function droppingIn(state, now) {
    const c = state.combat;
    const since = now - (c.enemyAt || 0);
    return (c.mode === 'stages' || c.mode === 'dungeon') && !!c.enemy && since >= 0 && since < BALANCE.combat.dropInMs;
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
    else if (c.mode === 'stages' && c.enemy && c.enemy.hp < c.enemy.maxHp) catchBreath(game);   // left hurt some other way (a save from before)
    game.markDirty();
}

/**
 * Stop fighting. Leaving mid-dungeon abandons the run; leaving the Titan ends the attempt (its Give up
 * is dungeon.js giveUpTitan, which goes back to what he was doing; this stops him, for new work). Leaving
 * the stages (Retreat, work, a prestige), the monster gets its breath back (catchBreath).
 */
export function leaveCombat(game) {
    const c = game.state.combat;
    c.recovering = false;
    if (!c.active) return;
    if (c.mode === 'dungeon') failDungeon(game, 'you left');
    else if (c.mode === 'titan') endTitan(game, false, 'left');
    else if (c.mode === 'clan') endClanFight(game, 'left');
    else catchBreath(game);
    c.active = false;
    c.recovering = false;   // the Titan's end may have sent him back to a rest that ends in the fight
    c.combo = 0;
    game.markDirty();
}

/**
 * The hero left a fight at the stages: the monster he leaves is whole again when he comes back, a boss with its
 * clock started over, and a pack starts whole, as after a fall (the owner, October 2026: resting at camp healed the
 * hero but not the boss, so retreating, resting and coming back beat bosses he couldn't beat in one go). The same
 * monster, not a new one: leaving and coming back doesn't roll a gilded one again.
 */
function catchBreath(game) {
    const c = game.state.combat;
    const e = c.enemy;
    c.pack = null;
    if (!e) return;
    if (e.boss && e.hp < e.maxHp) log(game, `🏕️ ${e.name} catches its breath: whole again, its clock started over.`, 'combat');
    e.hp = e.maxHp;
    c.playerTimer = 0;
    c.enemyTimer = 0;
    c.bossTimeLeft = e.boss ? (e.timeLimit || BALANCE.combat.bossTimeMs) : 0;
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
    if (c.mode === 'titan' || c.mode === 'clan') { game.emit({ type: 'error', text: `Finish the ${c.mode === 'clan' ? 'clan' : 'Titan'} fight first.` }); return false; }
    if (c.mode === 'dungeon') failDungeon(game, 'you left for the stages');
    setStage(game, stage);
    return true;
}

function chooseFood(state, missing, derived) {
    const rule = state.combat.autoEat;
    if (rule === 'none') return null;
    if (rule !== 'auto') return state.resources[rule] > 0 ? rule : null;
    // 'auto': the smallest food that covers what is missing, else the biggest we have.
    let best = null;
    for (const res of foodsByHealing()) {
        if (!(state.resources[res.id] > 0)) continue;
        best = res.id;
        if (foodHeal(res, derived) >= missing) return res.id;
    }
    return best;
}

/**
 * Can the boss on the clock still fall before its time runs out, at the hero's usual damage (crits counted,
 * strikes and the combo not)? Food that keeps him standing against one that can't is wasted: it holds out
 * anyway. (Never asked of the Titan, whose fight is scored by the damage dealt.)
 */
export function bossCanFall(state, d) {
    const c = state.combat;
    const e = c.enemy;
    if (!e?.boss || c.mode === 'titan' || !(c.bossTimeLeft > 0)) return true;
    const perSwing = d.atk * (1 + Math.min(BASE.caps.critChance, d.critChance) * (d.critDmg - 1));
    return e.hp <= perSwing * Math.floor((c.bossTimeLeft + Math.max(0, c.playerTimer)) / d.attackInterval);
}

/**
 * Auto-eat. Below the line (autoEatThreshold) the hero eats back over it; with `blow`, just before the
 * monster swings, he also eats when its blow would fell him (a monster hits as hard every time, so this is
 * known), unless the blow is bigger than his whole health, the boss can't fall in time anyway, or the run has
 * stopped climbing (BALANCE.combat.foodPushMs). Until 2026-10 he ate only below the line: at the wall a blow
 * took a third of his health or more, so he fell from above the line with food in the bag (the owner: food and
 * a potion left the best stage where it was). Five dishes at most a time. Returns the number eaten; an 'eat'
 * event tells the scene.
 */
export function tryEat(game, { blow = false } = {}) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const bite = trialBite(state);
    if (bite.noFood || bite.oneBlow) return 0;   // Fasting: nothing is eaten; Glass Hero: a blow that lands fells him whatever his health
    const e = c.enemy;
    const coming = blow && e && e.hp > 0 ? enemyDamage(e.atk, d.def) : 0;
    const climbing = c.mode !== 'stages' || (!c.farmMode && (c.stallMs || 0) < BALANCE.combat.foodPushMs);
    const guard = coming > 0 && coming < d.maxHp && climbing && bossCanFall(state, d) ? coming : 0;   // he must stand above this
    let eaten = 0;
    let healed = 0;
    let last = null;
    while (c.hp > 0 && (c.hp < d.maxHp * d.autoEatThreshold || c.hp <= guard) && eaten < 5) {
        const food = chooseFood(state, d.maxHp - c.hp, d);
        if (!food) break;
        state.resources[food] -= 1;
        const before = c.hp;
        c.hp = Math.min(d.maxHp, c.hp + foodHeal(RESOURCES[food], d));
        healed += c.hp - before;
        last = food;
        eaten++;
    }
    if (eaten) game.emit({ type: 'eat', food: last, count: eaten, heal: Math.round(healed) });
    return eaten;
}

export function setAutoEat(game, rule) {
    if (rule !== 'auto' && rule !== 'none' && !(RESOURCES[rule]?.heal > 0)) return;   // only food is eaten
    game.state.combat.autoEat = rule;
}

function comboMultiplier(combo) {
    return 1 + Math.min(BALANCE.combat.comboMax, combo) * BALANCE.combat.comboDmgPerStack;
}

/** One player attack. `manual`: a strike, a tenth of an attack (BALANCE.combat.manualHitMult). The combo raises every hit. */
export function playerAttack(game, { manual = false } = {}) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const enemy = c.enemy;
    if (!enemy || enemy.hp <= 0) return 0;

    const clan = c.mode === 'clan';   // the clan boss: strikes land harder in its openings, and every hit at the hero's best of the week (systems/clanfight.js)
    const combo = c.combo || 0;
    const critChance = Math.min(BASE.caps.critChance, d.critChance);
    const isCrit = rng.chance(critChance);
    let dmg = d.atk * (isCrit ? d.critDmg : 1) * comboMultiplier(combo) * (manual ? BALANCE.combat.manualHitMult * (clan ? CLAN_GUARD.mult : 1) : 1) * (clan ? state.clanFight?.scale || 1 : 1);
    dmg = Math.max(1, Math.round(dmg * rng.float(0.9, 1.1)));
    const endless = clan && enemy.endless;   // the Endless Hydra never falls: what it took adds up instead (systems/clanfight.js)
    const dealt = endless ? dmg : Math.min(dmg, Math.max(0, enemy.hp));   // what the monster really lost (a killing blow's excess heals nothing)
    if (endless) state.clanFight.dealt = (state.clanFight.dealt || 0) + dmg;
    else enemy.hp -= dmg;

    // lifesteal: a share of the damage dealt, out of the ceiling's room (BASE.lifestealPerSecond, refilled by
    // the second in tickCombat); none in Fasting
    const lifesteal = trialBite(game.state).noRegen ? 0 : Math.min(BASE.caps.lifesteal, d.lifesteal);
    if (lifesteal > 0 && c.hp > 0) {
        const heal = Math.min(Math.round(dealt * lifesteal), Math.max(0, d.maxHp - c.hp), Math.max(0, Math.floor(c.lifestealRoom || 0)));
        c.hp += heal;
        c.lifestealRoom = (c.lifestealRoom || 0) - heal;
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
    // a Trial's rules (data/trials.js): Glass Hero's blow fells him, Brutes' staggers him (his next swing comes later)
    const bite = c.mode === 'clan' ? {} : trialBite(state);
    const dmg = bite.oneBlow ? Math.max(1, c.hp) : enemyDamage(enemy.atk, d.def);
    c.hp -= dmg;
    if (bite.stagger) c.playerTimer = Math.max(-2 * d.attackInterval, (c.playerTimer || 0) - bite.stagger);
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
    const rolls = enemy.boss && !full ? Math.max(1, Math.round((enemy.worth || enemy.maxHp) / Math.max(1, enemyBaseStats(enemy.stage).hp))) : 1;
    return { full, rolls };
}

const STARTER_SWORD_POWER = 0.25;   // a quarter of a Copper Sword: +5 attack, doubling a new hero's
const FIRST_ARMOUR = [{ type: 'Head', weight: 1 }, { type: 'Body', weight: 1 }, { type: 'Shield', weight: 1 }];   // the first boss's piece: one the hero is seen to wear

function rollLoot(game, enemy, payout) {
    const state = game.state;
    const d = game.derived;
    const r = BALANCE.rewards;
    const zone = zoneForStage(enemy.stage);
    const boss = payout.full;
    const ladder = boss && !enemy.titan && state.combat.mode === 'stages';   // a boss of the stage ladder, on its first fall in the run
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
        // Crafting's deepest gem: only the Abyss's bosses leave it, from depth VOIDSTONE_DEPTH (data/workshop.js)
        if (boss && enemy.boss && zone.depth >= VOIDSTONE_DEPTH && rng.chance(VOIDSTONE_CHANCE * d.dropMult)) {
            add('voidstone', 1);
            bumpStat(game, 'gemsFound');
        }
        let essence = 0;
        if (boss) essence = rng.int(r.bossEssence[0], r.bossEssence[1]) * Math.max(1, Math.round(zone.tier / 2));
        else if (rng.chance(r.essenceDropChance * d.dropMult)) essence = rng.int(1, 2);
        if (essence) { add('essence', essence); bumpStat(game, 'essenceFound', essence); }

        // Gear: rare from regular monsters, a coin flip from a boss's first fall; tier follows the zone,
        // and the kind leans toward what the hero lacks. The first boss a hero ever beats always leaves
        // a piece (his first armour, as a rule).
        const firstBoss = boss && !enemy.titan && state.combat.mode === 'stages' && state.stats.bossFalls === 1 && roll === 0;
        const gearChance = firstBoss ? 1 : (boss ? GEAR_DROP_CHANCE.boss : GEAR_DROP_CHANCE.regular) * d.dropMult;
        if (rng.chance(gearChance)) {
            const item = generateDrop(zone.gearTier, boss, state.idCounter++, zone.depth, firstBoss ? FIRST_ARMOUR : dropTypesFor(state, zone.gearTier), { frontier: ladder ? { stage: enemy.stage, best: state.combat.bestStage } : null });
            const result = addItem(game, item);
            bumpStat(game, 'itemsDropped');
            if (item.rarity === 'mythic' || item.rarity === 'primal') bumpStat(game, 'mythicsFound');
            drops.push({ item, kept: result.kept });
            const rank = RARITIES.findIndex(rr => rr.id === item.rarity);
            if (result.kept && rank >= 2) log(game, `${item.icon} ${RARITIES[rank].name} ${item.name} dropped!`, 'loot');
            if (result.kept) game.emit({ type: 'itemDropped', item });
        }
    }
    if (ladder) frontierPiece(game, enemy, drops);
    if (ladder && enemy.lord) lordsDue(game, enemy, drops);
    if (ladder) pityMark(game, zone, drops, enemy.stage);
    // A new hero fights with his fists: the first monster he ever beats leaves him a sword.
    if (state.stats.kills === 1 && !state.prestige.count && !state.equipped.Weapon && !state.inventory.some(i => i.type === 'Weapon')) {
        const item = generateEquipment({ type: 'Weapon', tier: 1, power: STARTER_SWORD_POWER, materialName: 'Rusty', rarity: RARITIES[0], source: 'drop' }, state.idCounter++);
        const result = addItem(game, item);
        bumpStat(game, 'itemsDropped');
        if (item.rarity === 'mythic' || item.rarity === 'primal') bumpStat(game, 'mythicsFound');
        drops.push({ item, kept: result.kept });
        if (result.kept) game.emit({ type: 'itemDropped', item, first: true });
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

/**
 * The frontier's piece (data/items.js FRONTIER_DROP): once a run, the first ladder boss beaten at nine tenths of the
 * best stage or deeper leaves a sure piece from the best stage's depth, at a boss's odds (Mythic included).
 */
function frontierPiece(game, enemy, drops) {
    const state = game.state;
    const c = state.combat;
    const best = c.bestStage || 0;
    if (c.frontierDrop || best < FRONTIER_DROP.from || enemy.stage < Math.floor(FRONTIER_DROP.share * best)) return;
    c.frontierDrop = true;
    const deep = zoneForStage(best);
    const item = generateDrop(deep.gearTier, true, state.idCounter++, deep.depth, dropTypesFor(state, deep.gearTier), { frontier: { stage: best, best } });
    const result = addItem(game, item);
    bumpStat(game, 'itemsDropped');
    if (item.rarity === 'mythic' || item.rarity === 'primal') bumpStat(game, 'mythicsFound');
    drops.push({ item, kept: result.kept });
    if (result.kept) {
        log(game, `${item.icon} ${item.name}: this run's piece from the frontier.`, 'loot');
        game.emit({ type: 'itemDropped', item, frontier: true });
    }
}

/**
 * A Lord's due (data/zones.js LORDS): its first defeat ever leaves a sure piece from its depth, legendary, and from
 * stage 500 Mythic (Primal one time in twenty from 1,000), for the weapon or armour slot that lags furthest behind
 * (a ring or an earring was a poor due). After that it is a boss like the others.
 */
function lordsDue(game, enemy, drops) {
    const state = game.state;
    const c = state.combat;
    if (enemy.stage <= (c.lordsBeaten || 0)) return;
    c.lordsBeaten = enemy.stage;
    const zone = zoneForStage(enemy.stage);
    const top = enemy.stage < MYTHIC.from ? 'legendary' : enemy.stage >= PRIMAL.from && rng.chance(1 / PRIMAL.odds) ? 'primal' : 'mythic';
    const lag = laggingSlot(state, zone);
    const item = generateDrop(zone.gearTier, true, state.idCounter++, zone.depth, [{ type: lag.type, weight: 1 }], { rarity: top, tier: zone.gearTier });
    const result = addItem(game, item);
    bumpStat(game, 'itemsDropped');
    if (item.rarity === 'mythic' || item.rarity === 'primal') bumpStat(game, 'mythicsFound');
    drops.push({ item, kept: result.kept });
    log(game, `${item.icon} ${enemy.name.replace(' (Lord)', '')}, Lord of ${zone.name.replace(/^The /, 'the ')}, leaves its due: ${RARITIES.find(r => r.id === item.rarity).name} ${item.name}.`, 'loot');
    if (result.kept) game.emit({ type: 'itemDropped', item, lord: true });
}

/**
 * The pity count: a boss's first fall where the place's drops could still beat something the hero wears
 * (a common piece of its tier, at its depth, outscores his most lagging weapon or armour: laggingSlot)
 * marks one when it leaves no upgrade, and the PITY_MARKS-th mark leaves a sure piece of the place's own
 * tier, at its depth, for that slot. An upgrade wipes the marks. A re-climb through places whose gear
 * the hero has outgrown (shallower Abyss depths are all tier 7, but far weaker) marks nothing.
 */
function pityMark(game, zone, drops, stage) {
    const state = game.state;
    const c = state.combat;
    if (drops.some(dr => dr.item && dr.kept && SMITHING_TYPES.includes(dr.item.type) && isUpgrade(state, dr.item))) { c.pity = 0; return; }
    const lag = laggingSlot(state, zone);
    if (!lag || lag.ratio >= PITY_LAG) return;   // nothing this place drops could beat what the hero wears
    c.pity = (c.pity || 0) + 1;
    if (c.pity < PITY_MARKS) return;
    c.pity = 0;
    const item = generateDrop(zone.gearTier, true, state.idCounter++, zone.depth, [{ type: lag.type, weight: 1 }], { tier: zone.gearTier, frontier: { stage, best: state.combat.bestStage } });
    const result = addItem(game, item);
    bumpStat(game, 'itemsDropped');
    if (item.rarity === 'mythic' || item.rarity === 'primal') bumpStat(game, 'mythicsFound');
    bumpStat(game, 'pityDrops');
    drops.push({ item, kept: result.kept });
    if (result.kept) {
        log(game, `${item.icon} ${item.name}: the bosses' due, at last.`, 'loot');
        game.emit({ type: 'itemDropped', item, pity: true });
    }
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
    if (c.mode === 'clan') { endClanFight(game, 'felled'); game.markDirty(); return; }   // the clan's boss: the server reckons the attack, nothing drops here
    const d = game.derived;
    const enemy = c.enemy;

    const payout = killPayout(state, enemy);
    const paidAs = payout.full ? enemy : { ...enemy, boss: false };
    const r = BALANCE.rewards;
    const gold = goldForKill(paidAs, d.goldMult) * (enemy.gilded ? r.gildedGoldMult : 1);
    const xp = combatXpForKill(paidAs, d.combatXpMult, skillLevel(state, 'combat')) * payout.rolls * (enemy.gilded ? r.gildedXpMult : 1);
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    bumpStat(game, 'kills');
    if (enemy.boss) bumpStat(game, 'bossKills');
    // a boss's fall that moves the hero on (its full payout): the first one ever leaves his first armour
    if (payout.full && !enemy.titan && c.mode === 'stages') bumpStat(game, 'bossFalls');
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
        // a pack on new ground (packSize): its next monster steps up, and the stage holds
        const killed = (c.pack?.stage === c.stage ? c.pack.killed : 0) + 1;
        if (killed < packSize(state)) {
            c.pack = { stage: c.stage, killed };
            spawnEnemy(game);
            game.markDirty();
            return;
        }
        c.pack = null;
        c.stage += 1;
        if (c.stage > c.maxStage) { c.maxStage = c.stage; c.stallMs = 0; checkTrial(game); }
        if (c.stage > c.bestStage) {
            c.bestStage = c.stage;
            // a record: every 25 stages of all-time best make the tokens stronger (core/modifiers.js recordsOf)
            if (c.bestStage % BASE.recordStages === 0) { game.recompute(); game.emit({ type: 'record', stage: c.bestStage, records: game.derived.records }); }
            // the first step ever into a zone (the Abyss once, at its first depth)
            const zone = Math.floor((c.stage - 1) / STAGES_PER_ZONE);
            if ((c.stage - 1) % STAGES_PER_ZONE === 0 && zone >= 1 && zone < ZONES.length) game.emit({ type: 'zoneReached', zone: ZONES[zone].id, stage: c.stage });
            // and into each stratum of the Abyss below its first (data/strata.js)
            const stratum = stratumStartingAt(c.stage);
            if (stratum && stratum.index > 0) game.emit({ type: 'zoneReached', zone: stratum.id, stratum: true, stage: c.stage });
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
        // a lost run rests, then fights on at the stages; after the Titan, only if he was fighting before it
        let fightsOn = true;
        if (mode === 'dungeon') failDungeon(game, 'you were defeated', { lost: true });
        else if (mode === 'clan') fightsOn = endClanFight(game, 'left');   // the clan boss doesn't hit back; this is for safety
        else fightsOn = endTitan(game, false, 'fell');
        game.emit({ type: 'death', stage: c.stage, mode });
        c.hp = Math.max(1, Math.floor(game.derived.maxHp * BALANCE.combat.deathHpFraction));
        c.combo = 0;
        c.active = false;
        if (fightsOn) c.recovering = true;
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
    c.pack = null;   // a pack faced again starts whole
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
    if (c.mode === 'dungeon') { failDungeon(game, `${c.enemy.name} outlasted the ${Math.round((c.enemy.timeLimit || 0) / 1000)} s timer`, { lost: true }); return; }
    if (c.mode === 'titan') { endTitan(game, false, 'time'); return; }
    if (c.mode === 'clan') { endClanFight(game, 'time'); return; }
    bumpStat(game, 'bossEscapes');
    const back = Math.max(1, c.stage - 1);
    log(game, `⏳ ${c.enemy.name} held out for ${(c.enemy.timeLimit || BALANCE.combat.bossTimeMs) / 1000}s. Regrouping at stage ${back}; the boss will be retried in ${BALANCE.combat.regroupMs / 1000}s.`, 'death');
    game.emit({ type: 'bossTimeout', stage: c.stage });
    c.stage = back;
    c.regroupLeft = BALANCE.combat.regroupMs;
    spawnEnemy(game);
    game.markDirty();
}

/** A strike on the enemy (a click, a tap or Space): a tenth of an attack, and a stack of the combo. */
export function clickAttack(game) {
    const state = game.state;
    const c = state.combat;
    if (!c.active || !c.enemy || choosingAfterClear(state)) return false;
    if (game.now - (c.lastClickAt || 0) < BALANCE.combat.strikeGapMs) return false;   // faster clicking (or an auto-clicker) adds nothing
    if (droppingIn(state, game.now)) return false;   // still dropping in: out of reach, and the quarter second isn't spent
    c.lastClickAt = game.now;
    bumpStat(game, 'strikes');   // the player's own strikes (the guide's hand leaves the monster after three)
    if (c.mode === 'clan') {   // the clan boss: every strike's time is kept; one lands only while its guard is down
        noteClanStrike(state);
        if (!clanGuardOpen(state)) { game.emit({ type: 'glance' }); return true; }
    }
    c.combo = Math.min(BALANCE.combat.comboMax, (c.combo || 0) + 1 / (1 + (c.combo || 0) / 40));
    c.lastComboAt = game.now;
    playerAttack(game, { manual: true });
    return true;
}

/** Advance combat by dt ms (may resolve several attacks if dt is large). */
export function tickCombat(game, dt) {
    const state = game.state;
    const c = state.combat;
    // A boss's clock running out inside a long step (a background tab, the offline replay): fight up to
    // the deadline, let it run out there, then fight on, so the step size never changes the result.
    if (c.active && c.enemy?.boss && c.bossTimeLeft > 0 && dt > c.bossTimeLeft && !choosingAfterClear(state)) {
        const first = c.bossTimeLeft;
        tickCombat(game, first);
        tickCombat(game, dt - first);
        return;
    }
    const d = game.derived;
    // The run's stall clock: time spent climbing the stage ladder (fighting, or resting to fight on)
    // since its last new best stage. The Auto switch waits on it (systems/prestige.js).
    if ((c.active || c.recovering) && c.mode === 'stages' && !c.farmMode) c.stallMs = (c.stallMs || 0) + dt;
    const regen = c.active ? (trialBite(state).noRegen ? 0 : BALANCE.combat.regenInCombat) : BALANCE.combat.regenResting;   // none while fighting in Fasting
    if (c.hp > 0 && c.hp < d.maxHp) c.hp = Math.min(d.maxHp, c.hp + d.maxHp * regen * dt / 1000);
    // lifesteal's room fills at its ceiling's pace while he fights, and never holds more than a swing's worth
    // (a second at least, or this step's in a long one), so a pause can't bank a big heal
    if (c.active) {
        const pace = d.maxHp * BASE.lifestealPerSecond / 1000;
        c.lifestealRoom = Math.min(pace * Math.max(1000, d.attackInterval, dt), (c.lifestealRoom || 0) + pace * dt);
    }
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
    spendFightPotion(game, dt);   // the fight potion's dose runs while he fights (systems/potions.js)
    if (!c.enemy) spawnEnemy(game);

    if (c.combo > 0 && game.now - (c.lastComboAt || 0) > BALANCE.combat.comboDecayAfterMs) {
        c.combo = Math.max(0, c.combo - (0.05 + c.combo / 100) * (dt / 50));
    }
    // The regroup's minute ends at a moment in this step (ms from its start): each attack sees what is left
    // of it at its own moment, so a kill early in a long step doesn't move the hero on to the boss early.
    let regroupEnd = c.regroupLeft > 0 ? c.regroupLeft : 0;

    const bossAtStart = c.enemy.boss ? c.enemy : null;
    c.playerTimer += dt;
    c.enemyTimer += dt;
    let guard = 0;
    while (c.active && guard++ < 400) {
        // How long before the step's end each side's next attack falls (below 0: not in this step).
        const pOver = c.playerTimer - d.attackInterval;
        const eOver = c.enemyTimer - c.enemy.interval;
        // A boss that came on during this step has its deadline inside it (a bossTimeLeft below 0 is that
        // long before the step's end). With no attack before the deadline, it escapes there, and the rest
        // of the step goes on (a 3-s Swift boss used to get the rest of a 5-s step and the whole next one).
        if (c.enemy.boss && c.enemy !== bossAtStart && c.bossTimeLeft < 0 && Math.max(pOver, eOver) <= -c.bossTimeLeft) {
            const rest = -c.bossTimeLeft;
            onBossTimeout(game);
            if (c.regroupLeft > 0) regroupEnd = dt - rest + c.regroupLeft;
            if (!c.active || !c.enemy) break;
            c.playerTimer = rest;
            c.enemyTimer = rest;
            continue;
        }
        const pReady = pOver >= 0;
        const eReady = eOver >= 0;
        if (!pReady && !eReady) break;
        // Resolve whichever attack comes first in time order.
        const at = dt - Math.max(pReady ? pOver : -Infinity, eReady ? eOver : -Infinity);   // its moment in the step
        const regroupBefore = regroupEnd > 0 ? (c.regroupLeft = Math.max(0, regroupEnd - at)) : 0;
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
            tryEat(game, { blow: true });
            enemyAttack(game);
            if (c.active && c.hp > 0) tryEat(game);   // below the line: at once, not at the next swing
        }
        // the fight's own rules changed the regroup at this moment: a boss beaten ends it, a new one starts it
        if (regroupBefore > 0 && !(c.regroupLeft > 0)) regroupEnd = 0;
        else if (c.regroupLeft > regroupBefore) regroupEnd = at + c.regroupLeft;
    }
    if (regroupEnd > 0) c.regroupLeft = Math.max(0, regroupEnd - dt);

    // Boss timer counts fighting time only, so it behaves the same offline and online.
    if (bossAtStart && c.active && c.enemy === bossAtStart) {
        c.bossTimeLeft -= dt;
        if (c.bossTimeLeft <= 0) onBossTimeout(game);
    }
}
