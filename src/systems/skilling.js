// One action at a time: gathering/production nodes, smelting, smithing, crafting and tools.
// The same `completeAction` runs online (from the tick loop) and offline (in a loop).

import { SKILLS, skillNode } from '../data/skills.js';
import { SMELTING_RECIPES, METALS, JEWEL_BARS, GEM_TIERS, TOOLS, SMITH_INTERVAL, CRAFT_INTERVAL, TOOL_INTERVAL, CRAFT_SLOT_OFFSET, smithLevelReq } from '../data/workshop.js';
import { SMITHING_BAR_COST, SMITHING_TYPES, CRAFTING_TYPES, TYPE_NAMES, CRAFT_MAX_RARITY } from '../data/items.js';
import { RESOURCES, orderedByTier } from '../data/resources.js';
import { GEM_DROP_TABLE } from '../data/zones.js';
import { actionInterval, skillLevel } from '../core/modifiers.js';
import { generateEquipment } from '../core/formulas.js';
import { rng } from '../core/rng.js';
import { grantXp, log, bumpStat } from './progress.js';
import { leaveCombat } from './combat.js';
import { addItem } from './inventory.js';

const GEM_FIND_CHANCE = 0.02;

/** Resolve the current action into a full definition, or null if the action is invalid. */
export function resolveAction(state, action = state.action) {
    if (!action) return null;
    switch (action.kind) {
        case 'node': {
            const node = skillNode(action.skill, action.id);
            if (!node) return null;
            return { ...node, kind: 'node', skill: action.skill, label: node.name, output: node.produces };
        }
        case 'smelt': {
            const recipe = SMELTING_RECIPES.find(r => r.id === action.id);
            if (!recipe) return null;
            return { ...recipe, kind: 'smelt', skill: 'smithing', label: `Smelt ${recipe.name}`, output: recipe.produces };
        }
        case 'smith': {
            const metal = METALS.find(m => m.bar === action.bar);
            if (!metal || !SMITHING_TYPES.includes(action.type)) return null;
            const cost = SMITHING_BAR_COST[action.type];
            return {
                kind: 'smith', skill: 'smithing', id: `${action.bar}:${action.type}`, label: `Forge ${metal.name} ${TYPE_NAMES[action.type]}`,
                levelReq: smithLevelReq(metal, action.type), interval: SMITH_INTERVAL, xp: metal.xpPerBar * cost,
                consumes: { [action.bar]: cost }, item: { type: action.type, tier: metal.tier, power: RESOURCES[action.bar].power, materialName: metal.name }
            };
        }
        case 'craft': {
            const jewelBar = JEWEL_BARS.find(b => b.bar === action.bar);
            const gemTier = GEM_TIERS.find(g => g.gem === action.gem);
            if (!jewelBar || !gemTier || !CRAFTING_TYPES.includes(action.type)) return null;
            const gem = RESOURCES[action.gem];
            const bar = RESOURCES[action.bar];
            return {
                kind: 'craft', skill: 'crafting', id: `${action.bar}:${action.gem}:${action.type}`, label: `Craft ${gem.name} ${TYPE_NAMES[action.type]}`,
                levelReq: Math.min(99, Math.max(jewelBar.levelReq, gemTier.levelReq) + (CRAFT_SLOT_OFFSET[action.type] || 0)), interval: CRAFT_INTERVAL, xp: gemTier.xp,
                consumes: { [action.bar]: 1, [action.gem]: 1 },
                item: { type: action.type, tier: gem.tier, power: (bar.power + gem.power) / 2, materialName: jewelBar.name, gemName: gem.name }
            };
        }
        case 'tool': {
            const tool = TOOLS[action.tool];
            const tierDef = tool?.tiers.find(t => t.tier === action.tier);
            if (!tierDef) return null;
            return {
                kind: 'tool', skill: tool.madeBy, id: `${action.tool}:${action.tier}`, label: `Make ${tierDef.name}`,
                levelReq: tierDef.levelReq, interval: TOOL_INTERVAL, xp: tierDef.xp, consumes: tierDef.consumes,
                tool: action.tool, tier: action.tier, once: true
            };
        }
        default:
            return null;
    }
}

/** Which log will be burnt as fuel (lowest tier available), or null. */
export function fuelLog(state) {
    for (const res of orderedByTier('log')) if (state.resources[res.id] > 0) return res.id;
    return null;
}

/** Returns { ok, missing } for the consumption list of an action definition. */
export function canComplete(state, def) {
    const missing = [];
    for (const [id, qty] of Object.entries(def.consumes || {})) {
        if ((state.resources[id] || 0) < qty) missing.push({ id, need: qty, have: state.resources[id] || 0 });
    }
    if (def.fuel && !fuelLog(state)) missing.push({ id: 'normal_log', need: def.fuel, have: 0, anyLog: true });
    return { ok: missing.length === 0, missing };
}

function setAction(game, action, def) {
    const state = game.state;
    if (skillLevel(state, def.skill) < (def.levelReq || 1)) {
        game.emit({ type: 'error', text: `${SKILLS[def.skill].name} level ${def.levelReq} required.` });
        return false;
    }
    // Toggle off when the same action is clicked again.
    if (state.action && state.action.kind === action.kind && resolveAction(state)?.id === def.id) {
        stopAction(game);
        return true;
    }
    if (state.combat.active) leaveCombat(game);
    state.action = { ...action, progress: 0, stalled: false };
    game.emit({ type: 'actionStart', label: def.label, skill: def.skill });
    game.markDirty();
    return true;
}

export function startNodeAction(game, skillId, nodeId) {
    const def = resolveAction(game.state, { kind: 'node', skill: skillId, id: nodeId });
    return def ? setAction(game, { kind: 'node', skill: skillId, id: nodeId }, def) : false;
}
export function startSmelting(game, recipeId) {
    const action = { kind: 'smelt', id: recipeId };
    const def = resolveAction(game.state, action);
    return def ? setAction(game, action, def) : false;
}
export function startSmithing(game, type, bar) {
    const action = { kind: 'smith', type, bar };
    const def = resolveAction(game.state, action);
    return def ? setAction(game, action, def) : false;
}
export function startCrafting(game, type, bar, gem) {
    const action = { kind: 'craft', type, bar, gem };
    const def = resolveAction(game.state, action);
    return def ? setAction(game, action, def) : false;
}
export function startToolCraft(game, toolId, tier) {
    const state = game.state;
    if ((state.tools[toolId] || 0) >= tier) { game.emit({ type: 'error', text: 'You already own that tool tier.' }); return false; }
    if (tier !== (state.tools[toolId] || 0) + 1) { game.emit({ type: 'error', text: 'Make the previous tier first.' }); return false; }
    const action = { kind: 'tool', tool: toolId, tier };
    const def = resolveAction(state, action);
    return def ? setAction(game, action, def) : false;
}

export function stopAction(game) {
    if (!game.state.action) return;
    game.state.action = null;
    game.emit({ type: 'actionStop' });
    game.markDirty();
}

/** Advance the current action by dt ms; may complete several times if dt is large. Returns completions. */
export function tickAction(game, dt) {
    const state = game.state;
    const def = resolveAction(state);
    if (!def) { if (state.action) stopAction(game); return 0; }
    const interval = actionInterval(def.interval, game.derived, def.skill);
    const check = canComplete(state, def);
    if (!check.ok) {
        state.action.stalled = true;
        state.action.progress = 0;
        return 0;
    }
    state.action.stalled = false;
    state.action.progress += dt;
    let completions = 0;
    while (state.action && state.action.progress >= interval) {
        state.action.progress -= interval;
        if (!completeAction(game, def)) break;
        completions++;
        if (completions > 50) { state.action.progress = 0; break; }
    }
    return completions;
}

/** Consume inputs, produce outputs, grant XP. Returns false if the action could not complete. */
export function completeAction(game, def, { offline = false } = {}) {
    const state = game.state;
    const check = canComplete(state, def);
    if (!check.ok) { if (state.action) state.action.stalled = true; return false; }

    for (const [id, qty] of Object.entries(def.consumes || {})) state.resources[id] -= qty;
    if (def.fuel) state.resources[fuelLog(state)] -= def.fuel;

    const derived = game.derived;
    const skill = def.skill;
    state.stats.actionsBySkill[skill] = (state.stats.actionsBySkill[skill] || 0) + 1;

    if (def.kind === 'node' || def.kind === 'smelt') {
        let amount = 1;
        if (rng.chance(derived.doubleChance[skill] || 0)) amount = 2;
        state.resources[def.output] += amount;
        if (def.kind === 'smelt') bumpStat(game, 'barsSmelted', amount);
        if (skill === 'mining' && rng.chance(GEM_FIND_CHANCE)) {
            const rockTier = RESOURCES[def.output].tier;
            const candidates = GEM_DROP_TABLE.filter(g => Math.abs(g.tier - rockTier) <= 1).map(g => ({ ...g, weight: g.tier <= rockTier ? 3 : 1 }));
            const gem = rng.weighted(candidates);
            state.resources[gem.id] += 1;
            bumpStat(game, 'gemsFound');
            if (!offline) log(game, `💎 Found a ${RESOURCES[gem.id].name} while mining!`, 'loot');
        }
        if (!offline && amount === 2) game.emit({ type: 'doubleDrop', resource: def.output });
    } else if (def.kind === 'smith' || def.kind === 'craft') {
        const item = generateEquipment({ ...def.item, qualityBonus: derived.craftQuality, maxRarity: CRAFT_MAX_RARITY, materials: def.consumes, source: 'crafted' }, state.idCounter++);
        addItem(game, item);
        bumpStat(game, 'itemsCrafted');
        game.emit({ type: 'itemCrafted', item });
        if (!offline || item.rarity !== 'common') log(game, `${item.icon} Made ${item.rarity === 'common' ? '' : item.rarity + ' '}${item.name}`, 'craft');
    } else if (def.kind === 'tool') {
        state.tools[def.tool] = def.tier;
        log(game, `${TOOLS[def.tool].icon} Made a ${TOOLS[def.tool].tiers.find(t => t.tier === def.tier).name}!`, 'craft');
        game.emit({ type: 'toolMade', tool: def.tool, tier: def.tier });
        state.action = null; // one-off
    }

    grantXp(game, skill, def.xp * derived.xpMult);
    game.emit({ type: 'actionComplete', skill });
    return true;
}
