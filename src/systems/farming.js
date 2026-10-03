// Farming plots grow on the wall clock, alongside whatever else the hero is doing and while the game
// is closed — nothing to replay offline, just timestamps. Planting buys the seed (a flat price).

import { FARMING_PLOTS, CROPS, cropById } from '../data/farming.js';
import { RESOURCES } from '../data/resources.js';
import { skillLevel } from '../core/modifiers.js';
import { rng } from '../core/rng.js';
import { grantXp, log, bumpStat, rollPet } from './progress.js';
import { eventProgress } from './events.js';

export function plotUnlocked(state, index) {
    return index < FARMING_PLOTS.length && skillLevel(state, 'farming') >= FARMING_PLOTS[index];
}

export function seedCost(state, crop) {
    return crop.seedGold;
}

/** Growing time with the current farming speed (hoe, pet, perks, agility...). */
export function growTime(derived, crop) {
    return Math.round(crop.growMs / (1 + (derived.skillSpeed.farming || 0)));
}

export function plotReady(plot, now) {
    return !!plot.crop && now >= plot.readyAt;
}

export function plant(game, index, cropId) {
    const state = game.state;
    const crop = cropById(cropId);
    const plot = state.farming.plots[index];
    if (!crop || !plot) return false;
    if (!plotUnlocked(state, index)) { game.emit({ type: 'error', text: `Farming level ${FARMING_PLOTS[index]} opens this plot.` }); return false; }
    if (plot.crop) { game.emit({ type: 'error', text: 'That plot is already planted.' }); return false; }
    if (skillLevel(state, 'farming') < crop.levelReq) { game.emit({ type: 'error', text: `Farming level ${crop.levelReq} required.` }); return false; }
    const cost = seedCost(state, crop);
    if (state.gold < cost) { game.emit({ type: 'error', text: `Seeds cost ${cost.toLocaleString()} gold.` }); return false; }
    state.gold -= cost;
    bumpStat(game, 'goldSpent', cost);
    plot.crop = crop.id;
    plot.plantedAt = game.now;
    plot.readyAt = game.now + growTime(game.derived, crop);
    game.markDirty();
    return true;
}

/** Harvest a ready plot. Returns the amount harvested, or 0. */
export function harvest(game, index) {
    const state = game.state;
    const plot = state.farming.plots[index];
    if (!plot || !plotReady(plot, game.now)) return 0;
    const crop = cropById(plot.crop);
    const d = game.derived;
    let amount = Math.round(rng.int(crop.yield[0], crop.yield[1]) * d.farmYield);
    if (rng.chance(d.doubleChance.farming || 0)) amount *= 2;
    state.resources[crop.produces] += amount;
    bumpStat(game, 'cropsHarvested', amount);
    plot.crop = null;
    plot.plantedAt = 0;
    plot.readyAt = 0;
    grantXp(game, 'farming', crop.xp * amount * d.xpMult);
    rollPet(game, 'farming', crop.growMs);
    eventProgress(game, 5);
    log(game, `${crop.icon} Harvested ${amount}× ${RESOURCES[crop.produces].name}.`, 'loot');
    game.emit({ type: 'harvest', crop: crop.id, amount });
    game.markDirty();
    return amount;
}

/** Harvest every ready plot and, if asked, plant the same crop again where the gold allows. */
export function harvestAll(game, { replant = true } = {}) {
    const state = game.state;
    let harvested = 0;
    let replanted = 0;
    let short = 0;
    state.farming.plots.forEach((plot, index) => {
        if (!plotReady(plot, game.now)) return;
        const crop = cropById(plot.crop);
        if (harvest(game, index) > 0) harvested++;
        if (!replant) return;
        if (state.gold < seedCost(state, crop)) { short++; return; }
        if (plant(game, index, crop.id)) replanted++;
    });
    if (short) game.emit({ type: 'error', text: `Not enough gold to replant ${short} plot${short > 1 ? 's' : ''}.` });
    return { harvested, replanted };
}

/** Plant one crop in every empty plot that is open, while the gold lasts. Returns how many were planted. */
export function plantAll(game, cropId) {
    const state = game.state;
    const crop = cropById(cropId);
    if (!crop) return 0;
    if (skillLevel(state, 'farming') < crop.levelReq) { game.emit({ type: 'error', text: `Farming level ${crop.levelReq} required.` }); return 0; }
    let planted = 0;
    let short = 0;
    state.farming.plots.forEach((plot, index) => {
        if (plot.crop || !plotUnlocked(state, index)) return;
        if (state.gold < seedCost(state, crop)) { short++; return; }
        if (plant(game, index, crop.id)) planted++;
    });
    if (short) game.emit({ type: 'error', text: `Not enough gold for ${short} more plot${short > 1 ? 's' : ''}.` });
    return planted;
}

/** The best crop you can plant now (highest level), for quick buttons and the simulator. */
export function bestCrop(state, filter = () => true) {
    const level = skillLevel(state, 'farming');
    return [...CROPS].reverse().find(c => c.levelReq <= level && filter(c)) || null;
}
