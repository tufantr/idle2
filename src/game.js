// The Game facade: owns the state, drives the tick, and exposes every player action.
// It never touches the DOM, so tools/simulate.mjs and the tests drive it the same way the UI does.

import { createDefaultState, migrateState } from './core/state.js';
import { collectModifiers, deriveStats, isFocused, bonfireLit } from './core/modifiers.js';
import { tickAction, startNodeAction, startSmelting, startSmithing, startCrafting, startToolCraft, startAgility, stopAction, resolveAction } from './systems/skilling.js';
import { tickCombat, enterCombat, leaveCombat, clickAttack, setPotion, setAutoEat, setStage, spawnEnemy } from './systems/combat.js';
import { equipItem, unequipItem, sellItem, sellAllItems, upgradeItem, sellResource, buyGoldShopItem, salvageItem, salvageAll, reforgeItem, toggleLock, setAutoSalvage } from './systems/inventory.js';
import { doPrestige, prestigePreview, buyPerk, canPrestige } from './systems/prestige.js';
import { checkAchievements, checkUnlocks } from './systems/progress.js';
import { tickMinigame, startMinigame, resolveMinigame, failMinigame, pumpHeat, decayHeat, setDragValue } from './systems/minigame.js';
import { applyOffline } from './systems/offline.js';
import { claimDaily, dailyReady, accrueDaily } from './systems/daily.js';
import { buyCampUpgrade } from './systems/camp.js';
import { enterDungeon, returnToStages, setDungeonRepeat, assembleUnique, challengeTitan, titanReady } from './systems/dungeon.js';
import { plant, harvest, harvestAll } from './systems/farming.js';
import { buildObstacle, upgradeObstacle } from './systems/agility.js';
import { applyReward } from './systems/social.js';

const MAX_TICK_MS = 5000;        // longer gaps are handled as offline progress
const OFFLINE_GAP_MS = 60000;
// Events that happen many times a second in combat; they don't warrant re-rendering a tab.
const QUIET_EVENTS = new Set(['hit', 'enemyHit', 'dodge']);

export class Game {
    constructor(state = null, now = Date.now()) {
        this.state = state ? migrateState(state, now) : createDefaultState(now);
        this.now = now;
        this.events = [];
        this.revision = 0;     // bumps whenever something visible changes; the UI re-renders on change
        this.silent = false;   // offline replay runs silently and reports a summary instead
        this.dirty = true;
        this.derived = null;
        this.mods = null;
        this.recompute();
        if (!this.state.combat.enemy) spawnEnemy(this);
    }

    // ----- infrastructure -----
    emit(event) {
        if (this.silent) return;
        this.events.push(event);
        if (!QUIET_EVENTS.has(event.type)) this.revision++;
    }
    drainEvents() { const e = this.events; this.events = []; return e; }
    markDirty() { this.dirty = true; this.revision++; }

    /** Any click or key press: ends focus (the idle bonus) until the player leaves the game alone again. */
    noteInput(now = Date.now()) {
        this.state.meta.lastInputAt = now;
        if (this.derived?.focused) { this.now = Math.max(this.now, now); this.recompute(); this.revision++; }
    }
    recompute() {
        this.state.meta.lastActiveAt = this.now;
        this.mods = collectModifiers(this.state);
        this.derived = deriveStats(this.state, this.mods);
        if (this.state.combat.hp > this.derived.maxHp) this.state.combat.hp = this.derived.maxHp;
        this.dirty = false;
    }

    /** Advance the simulation to `now`. Returns the offline summary if a long gap was replayed. */
    tick(now) {
        let offlineSummary = null;
        let dt = now - this.now;
        if (dt <= 0) return null;
        if (dt > OFFLINE_GAP_MS) {
            // Tab was suspended or the machine slept: replay as offline progress from the last active moment.
            this.state.meta.savedAt = this.now;
            this.now = now;
            this.recompute();
            offlineSummary = applyOffline(this, now, { minMs: OFFLINE_GAP_MS });
            dt = 0;
        }
        this.now = now;
        this.state.meta.playtimeMs += Math.min(dt, MAX_TICK_MS);
        if (this.dirty || isFocused(this.state, now) !== this.derived.focused || bonfireLit(this.state, now) !== this.derived.bonfire) this.recompute();
        this.state.meta.lastActiveAt = now;
        accrueDaily(this.state, now);

        if (dt > 0) {
            const step = Math.min(dt, MAX_TICK_MS);
            const action = resolveAction(this.state);
            if (action) {
                tickAction(this, step);
                tickMinigame(this, action.skill);
                decayHeat(this, action.skill, step);
            }
            tickCombat(this, step);
        }

        if (this.dirty) this.recompute();
        checkAchievements(this);
        checkUnlocks(this);
        if (this.dirty) this.recompute();
        return offlineSummary;
    }

    /** Apply offline progress from the saved timestamp (call once after loading). */
    resumeFromSave(now) {
        this.now = now;
        this.recompute();
        const summary = applyOffline(this, now);
        checkAchievements(this);
        checkUnlocks(this);
        if (this.dirty) this.recompute();
        this.state.meta.savedAt = now;
        return summary;
    }

    // ----- player actions (thin wrappers so the UI has one import) -----
    // Each action recomputes derived stats immediately, so callers can read game.derived right after.
    _act(fn) { const result = fn(); if (this.dirty) this.recompute(); return result; }

    startNodeAction(skill, node) { return this._act(() => startNodeAction(this, skill, node)); }
    startSmelting(recipe) { return this._act(() => startSmelting(this, recipe)); }
    startSmithing(type, bar) { return this._act(() => startSmithing(this, type, bar)); }
    startCrafting(type, bar, gem) { return this._act(() => startCrafting(this, type, bar, gem)); }
    startToolCraft(tool, tier) { return this._act(() => startToolCraft(this, tool, tier)); }
    startAgility() { return this._act(() => startAgility(this)); }
    stopAction() { return this._act(() => stopAction(this)); }
    currentAction() { return resolveAction(this.state); }

    enterCombat() { return this._act(() => enterCombat(this)); }
    leaveCombat() { return this._act(() => leaveCombat(this)); }
    toggleCombat() { return this._act(() => (this.state.combat.active ? leaveCombat(this) : enterCombat(this))); }
    clickAttack() { return this._act(() => clickAttack(this)); }
    setPotion(id) { return this._act(() => setPotion(this, id)); }
    setAutoEat(rule) { return this._act(() => setAutoEat(this, rule)); }
    setStage(stage) { return this._act(() => setStage(this, stage)); }
    setFarmMode(on) { this.state.combat.farmMode = !!on; }

    equipItem(id, slot) { return this._act(() => equipItem(this, id, slot)); }
    unequipItem(slot) { return this._act(() => unequipItem(this, slot)); }
    sellItem(id) { return this._act(() => sellItem(this, id)); }
    sellAllItems(rarity) { return this._act(() => sellAllItems(this, rarity)); }
    upgradeItem(id) { return this._act(() => upgradeItem(this, id)); }
    sellResource(id, amount) { return this._act(() => sellResource(this, id, amount)); }
    buyGoldShopItem(id) { return this._act(() => buyGoldShopItem(this, id)); }
    salvageItem(id) { return this._act(() => salvageItem(this, id)); }
    salvageAll(rarity) { return this._act(() => salvageAll(this, rarity)); }
    reforgeItem(id) { return this._act(() => reforgeItem(this, id)); }
    toggleLock(id) { return this._act(() => toggleLock(this, id)); }
    setAutoSalvage(rarity) { return this._act(() => setAutoSalvage(this, rarity)); }

    buyCampUpgrade(id, count) { return this._act(() => buyCampUpgrade(this, id, count)); }

    plant(plot, crop) { return this._act(() => plant(this, plot, crop)); }
    harvest(plot) { return this._act(() => harvest(this, plot)); }
    harvestAll(opts) { return this._act(() => harvestAll(this, opts)); }
    buildObstacle(id) { return this._act(() => buildObstacle(this, id)); }
    upgradeObstacle(slot) { return this._act(() => upgradeObstacle(this, slot)); }
    applyReward(reward) { return this._act(() => applyReward(this, reward)); }

    enterDungeon(id) { return this._act(() => enterDungeon(this, id)); }
    leaveDungeon() { return this._act(() => { if (this.state.combat.mode === 'dungeon') { leaveCombat(this); } }); }
    setDungeonRepeat(on) { return setDungeonRepeat(this, on); }
    assembleUnique(id) { return this._act(() => assembleUnique(this, id)); }
    titanReady() { return titanReady(this.state, this.now); }
    challengeTitan() { return this._act(() => challengeTitan(this)); }

    canPrestige() { return canPrestige(this.state); }
    prestigePreview() { return prestigePreview(this); }
    prestige() { return this._act(() => doPrestige(this)); }
    buyPerk(id) { return this._act(() => buyPerk(this, id)); }

    startMinigame(skill) { return this._act(() => startMinigame(this, skill)); }
    resolveMinigame(skill) { return this._act(() => resolveMinigame(this, skill)); }
    failMinigame(skill) { return this._act(() => failMinigame(this, skill)); }
    pumpHeat(skill) { return pumpHeat(this, skill); }
    setDragValue(skill, value) { return setDragValue(this, skill, value); }

    dailyReady() { return dailyReady(this.state, this.now); }
    claimDaily() { return this._act(() => claimDaily(this)); }

    /** Serialisable snapshot for saving. */
    serialize(now = this.now) {
        this.state.meta.savedAt = now;
        return JSON.stringify(this.state);
    }
}
