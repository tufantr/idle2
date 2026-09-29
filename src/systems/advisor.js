// The advisor: a short, prioritised list of "what to do next" for the current state. Pure function
// of the game, so it is testable and the UI just renders what it returns.

import { SKILLS } from '../data/skills.js';
import { METALS, SMELTING_RECIPES, TOOLS, smithLevelReq } from '../data/workshop.js';
import { TYPE_SLOTS, TYPE_NAMES, SMITHING_BAR_COST } from '../data/items.js';
import { orderedByTier, RESOURCES } from '../data/resources.js';
import { CAMP_UPGRADES, campCost } from '../data/camp.js';
import { nextGoals, isUnlocked } from '../data/unlocks.js';
import { skillLevel } from '../core/modifiers.js';
import { tokensForStage } from '../core/formulas.js';
import { canWear, itemScore } from './inventory.js';
import { dailyReady } from './daily.js';

const FORGE_PRIORITY = ['Weapon', 'Body', 'Shield', 'Legs', 'Head', 'Gloves', 'Boots'];
const SETBACK_WINDOW_MS = 10 * 60 * 1000;

/** The weakest equipped slot an item could go into (empty slots first). */
function weakestSlotFor(state, type) {
    const slots = TYPE_SLOTS[type] || [];
    return slots.reduce((worst, slot) => (itemScore(state.equipped[slot]) < itemScore(state.equipped[worst]) ? slot : worst), slots[0]);
}

/** Best wearable upgrade sitting in the bag, if any. */
export function findUpgrade(state) {
    let best = null;
    for (const item of state.inventory) {
        if (!canWear(state, item)) continue;
        const slot = weakestSlotFor(state, item.type);
        const gain = itemScore(item) - itemScore(state.equipped[slot]);
        if (gain > 0 && (!best || gain > best.gain)) best = { item, slot, gain };
    }
    return best;
}

function nextForge(state) {
    const level = skillLevel(state, 'smithing');
    for (const type of FORGE_PRIORITY) {
        const metal = [...METALS].reverse().find(m => level >= smithLevelReq(m, type));
        if (!metal) continue;
        const worn = Math.min(...TYPE_SLOTS[type].map(slot => state.equipped[slot]?.tier || 0));
        const owned = state.inventory.some(i => i.type === type && i.tier >= metal.tier);
        if (worn >= metal.tier || owned) continue;
        const cost = SMITHING_BAR_COST[type];
        const name = `${metal.name} ${TYPE_NAMES[type]}`;
        if ((state.resources[metal.bar] || 0) >= cost) return `Forge a ${name} — you have the bars`;
        const recipe = SMELTING_RECIPES.find(r => r.produces === metal.bar);
        const missing = cost - (state.resources[metal.bar] || 0);
        const inputs = Object.entries(recipe.consumes).map(([id, qty]) => `${qty * missing} ${RESOURCES[id].name.toLowerCase()}`).join(' + ');
        return `Smelt ${missing} ${metal.name.toLowerCase()} bar${missing > 1 ? 's' : ''} (${inputs}) for a ${name}`;
    }
    return null;
}

function nextMetalHint(state) {
    const worn = state.equipped.Weapon?.tier || 0;
    const next = METALS.find(m => m.tier > worn);
    if (!next) return null;
    const recipe = SMELTING_RECIPES.find(r => r.produces === next.bar);
    const smith = skillLevel(state, 'smithing');
    const ore = Object.keys(recipe.consumes).find(id => RESOURCES[id].category === 'ore' && id !== 'coal');
    const oreNode = SKILLS.mining.nodes.find(n => n.produces === ore);
    const mining = skillLevel(state, 'mining');
    if (mining < oreNode.levelReq) return `Stuck? ${next.name} gear needs ${RESOURCES[ore].name.toLowerCase()} — Mining ${oreNode.levelReq} (you're ${mining})`;
    if (smith < next.levelReq) return `Stuck? ${next.name} gear needs Smithing ${next.levelReq} (you're ${smith})`;
    return `Stuck? Forge ${next.name} gear, buy camp upgrades, or prestige for tokens`;
}

/**
 * Up to `limit` suggestions: { icon, text, tab?, action? }. `tab` is where to go, `action` a one-click
 * handler name the UI knows (only 'claimDaily' so far).
 */
export function advise(game, limit = 4) {
    const state = game.state;
    const out = [];
    const add = (icon, text, tab = null, action = null) => out.push({ icon, text, tab, action });

    if (dailyReady(state, game.now)) add('📦', `Claim your daily crate (${state.daily.banked} waiting)`, null, 'claimDaily');
    if (state.prestige.skillPoints > 0) add('🌟', `Spend ${state.prestige.skillPoints} skill point${state.prestige.skillPoints > 1 ? 's' : ''} on perks`, 'shop');

    const upgrade = findUpgrade(state);
    if (upgrade) add('🎒', `Equip ${upgrade.item.name} — it beats what you're wearing`, 'inventory');

    if (isUnlocked(state, 'smithing')) {
        const forge = nextForge(state);
        if (forge) add('⚒️', forge, 'smithing');
    }

    const foodHp = orderedByTier('food').reduce((sum, f) => sum + (state.resources[f.id] || 0) * f.heals, 0);
    if (isUnlocked(state, 'cooking') && foodHp < game.derived.maxHp * 3 && (state.stats.deaths > 0 || state.combat.bestStage >= 10)) {
        add('🍳', 'Cook some food — auto-eat keeps you alive in long fights', 'cooking');
    }

    const cheapestCamp = Math.min(...CAMP_UPGRADES.map(u => ((state.camp[u.id] || 0) < u.max ? campCost(u, state.camp[u.id] || 0) : Infinity)));
    if (state.gold >= cheapestCamp) add('🏕️', 'You can afford a camp upgrade', 'combat');

    for (const [toolId, tool] of Object.entries(TOOLS)) {
        const next = tool.tiers.find(t => t.tier === (state.tools[toolId] || 0) + 1);
        if (!next || !isUnlocked(state, tool.madeBy) || !isUnlocked(state, tool.skill)) continue;
        if (skillLevel(state, tool.madeBy) >= next.levelReq) {
            add(tool.icon, `Make a ${next.name} for faster ${SKILLS[tool.skill].name.toLowerCase()}`, tool.madeBy);
            break;
        }
    }

    if (isUnlocked(state, 'prestige') && state.combat.maxStage >= 10) {
        const tokens = tokensForStage(state.combat.maxStage, game.derived.tokenMult);
        const recentSetback = game.now - (state.combat.lastSetbackAt || 0) < SETBACK_WINDOW_MS;
        if (tokens >= Math.max(5, state.prestige.tokens * 0.25) && recentSetback) add('✨', `Prestige for +${tokens} tokens (+${Math.round(tokens * 0.5)}% ATK/DEF)`, 'shop');
    }

    if (game.now - (state.combat.lastSetbackAt || 0) < SETBACK_WINDOW_MS) {
        const hint = nextMetalHint(state);
        if (hint) add('🧱', hint, 'smithing');
    }

    for (const goal of nextGoals(state, 1)) add('🎯', goal.hint);

    return out.slice(0, limit);
}
