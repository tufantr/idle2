// The advisor: a short, prioritised list of "what to do next" for the current state. Pure function
// of the game, so it is testable and the UI just renders what it returns (the guide under the scene).
// The next unlock leads the list, with how far along it is; the daily crate is not in it, because it
// has a button of its own in the header and the hotbar.

import { SKILLS } from '../data/skills.js';
import { METALS, SMELTING_RECIPES, TOOLS, smithLevelReq } from '../data/workshop.js';
import { TYPE_SLOTS, TYPE_NAMES, SMITHING_BAR_COST } from '../data/items.js';
import { orderedByTier, RESOURCES } from '../data/resources.js';
import { CAMP_UPGRADES, campCost } from '../data/camp.js';
import { nextGoals, goalProgress, isUnlocked } from '../data/unlocks.js';
import { skillLevel } from '../core/modifiers.js';
import { withArticle } from '../core/text.js';
import { tokensForStage } from '../core/formulas.js';
import { canWear, itemScore } from './inventory.js';
import { titanReady, dungeonUnlocked } from './dungeon.js';
import { DUNGEONS, FRAGMENTS_PER_UNIQUE, UNIQUES } from '../data/dungeons.js';
import { AGILITY_SLOTS } from '../data/agility.js';
import { plotReady, plotUnlocked } from './farming.js';
import { canBuild } from './agility.js';

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
        if ((state.resources[metal.bar] || 0) >= cost) return { text: `Forge ${withArticle(name)} — you have the bars`, view: 'forge' };
        const recipe = SMELTING_RECIPES.find(r => r.produces === metal.bar);
        const missing = cost - (state.resources[metal.bar] || 0);
        const inputs = Object.entries(recipe.consumes).map(([id, qty]) => `${qty * missing} ${RESOURCES[id].name.toLowerCase()}`).join(' + ');
        return { text: `Smelt ${missing} ${metal.name.toLowerCase()} bar${missing > 1 ? 's' : ''} (${inputs}) for ${withArticle(name)}`, view: 'smelt' };
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

/** How many notes fit the player: two while the first zone is still ahead of them, three after. */
export function adviceLimit(state) {
    return state.combat.bestStage < 10 ? 2 : 3;
}

/**
 * Up to `limit` suggestions: { icon, text, tab?, view?, goal?, progress? }. `tab` is where to go and
 * `view` the part of that tab (Smithing's steps). The next unlock comes first, as { goal: id,
 * progress: 0..1 }, so the list always holds it; the rest follow in order of urgency.
 */
export function advise(game, limit = adviceLimit(game.state)) {
    const state = game.state;
    const out = [];
    const add = (icon, text, tab = null, extra = {}) => out.push({ icon, text, tab, ...extra });

    if (titanReady(state, game.now) && state.combat.mode === 'stages') add('🗿', 'The Titan is awake — challenge it for a permanent bonus', 'dungeons');
    for (const d of DUNGEONS) {
        if ((state.dungeons[d.id]?.fragments || 0) >= FRAGMENTS_PER_UNIQUE) { add('🌟', `Assemble ${UNIQUES[d.unique].name} from your fragments`, 'dungeons'); break; }
    }
    if (state.prestige.skillPoints > 0) add('🌟', `Spend ${state.prestige.skillPoints} skill point${state.prestige.skillPoints > 1 ? 's' : ''} on perks`, 'shop');

    if (isUnlocked(state, 'farming')) {
        const ready = state.farming.plots.filter(p => plotReady(p, game.now)).length;
        const empty = state.farming.plots.filter((p, i) => !p.crop && plotUnlocked(state, i)).length;
        if (ready) add('🌾', `${ready} farming plot${ready > 1 ? 's are' : ' is'} ready to harvest`, 'farming');
        else if (empty) add('🌱', `Plant your ${empty} empty plot${empty > 1 ? 's' : ''} — they grow while you do anything else`, 'farming');
    }
    if (isUnlocked(state, 'agility')) {
        const affordable = AGILITY_SLOTS.flatMap((slot, i) => (state.agility.built[i] ? [] : slot.obstacles)).find(o => canBuild(state, o.id).ok);
        if (affordable) add(affordable.icon, `Build the ${affordable.name} — ${affordable.desc}, permanently`, 'agility');
    }

    const upgrade = findUpgrade(state);
    if (upgrade) add('🎒', `Equip ${upgrade.item.name} — it beats what you're wearing`, 'inventory');

    if (isUnlocked(state, 'smithing')) {
        const forge = nextForge(state);
        if (forge) add('⚒️', forge.text, 'smithing', { view: forge.view });
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
            add(tool.icon, `Make ${withArticle(next.name)} for faster ${SKILLS[tool.skill].name.toLowerCase()}`, tool.madeBy, { view: 'tools' });
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
        if (hint) add('🧱', hint, 'smithing', { view: 'forge' });
    }

    const newDungeon = DUNGEONS.find(d => dungeonUnlocked(state, d) && !(state.dungeons[d.id]?.clears));
    if (newDungeon && state.combat.mode === 'stages') add(newDungeon.icon, `${newDungeon.name} is open — clear it for a chest and a unique fragment`, 'dungeons');

    const [goal] = nextGoals(state, 1);
    const lead = goal ? [{ icon: '🎯', text: goal.hint, tab: goal.tab || null, goal: goal.id, progress: goalProgress(state, goal) }] : [];
    return [...lead, ...out].slice(0, Math.max(1, limit));
}
