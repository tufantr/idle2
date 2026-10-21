// Tools (the owner, October 2026: tools are purchases, not skill work). Bought in the Shop, once it is open, with the
// bars and logs they always took (data/workshop.js TOOLS), each tier once the skill it serves reaches its level: a
// tier makes that skill TOOL_SPEED_PER_TIER faster with TOOL_DOUBLE_PER_TIER more doubles (core/modifiers.js). They
// were made in Smithing, and the bow in Crafting, at those levels of the maker's skill, for a sliver of its XP.

import { TOOLS } from '../data/workshop.js';
import { RESOURCES } from '../data/resources.js';
import { SKILLS } from '../data/skills.js';
import { skillLevel } from '../core/modifiers.js';
import { isUnlocked } from '../data/unlocks.js';
import { withArticle } from '../core/text.js';
import { log } from './progress.js';

/** The tier a tool would go to next, or null at its best. */
export function nextToolTier(state, toolId) {
    const tool = Object.hasOwn(TOOLS, toolId) ? TOOLS[toolId] : null;
    return tool ? tool.tiers.find(t => t.tier === (state.tools[toolId] || 0) + 1) || null : null;
}

/** The tools the Shop shows: each whose skill has opened, or that is already owned. */
export function toolsOnOffer(state) {
    return Object.keys(TOOLS).filter(id => isUnlocked(state, TOOLS[id].skill) || (state.tools[id] || 0) > 0);
}

/** Whether the next tier of a tool can be bought now: { ok, next, why: 'best' | 'level' | 'materials' }. */
export function toolPurchase(state, toolId) {
    const next = nextToolTier(state, toolId);
    if (!next) return { ok: false, next: null, why: 'best' };
    if (skillLevel(state, TOOLS[toolId].skill) < next.levelReq) return { ok: false, next, why: 'level' };
    if (Object.entries(next.consumes).some(([id, qty]) => (state.resources[id] || 0) < qty)) return { ok: false, next, why: 'materials' };
    return { ok: true, next, why: '' };
}

/** A better tool can be bought now (the Shop's badge in the sidebar). */
export function toolReady(state) {
    return isUnlocked(state, 'shop') && toolsOnOffer(state).some(id => toolPurchase(state, id).ok);
}

/** Buy the next tier of a tool: its bars and logs go, the tier is his at once. */
export function buyTool(game, toolId) {
    const state = game.state;
    if (!Object.hasOwn(TOOLS, toolId)) return false;
    if (!isUnlocked(state, 'shop')) { game.emit({ type: 'error', text: 'Tools are sold in the Shop, once it opens.' }); return false; }
    const buy = toolPurchase(state, toolId);
    if (!buy.ok) {
        const tool = TOOLS[toolId];
        const text = buy.why === 'best' ? `That is the best ${tool.name.toLowerCase()} there is.`
            : buy.why === 'level' ? `${buy.next.name} needs ${SKILLS[tool.skill].name} ${buy.next.levelReq}.`
            : `${buy.next.name} takes ${Object.entries(buy.next.consumes).map(([id, qty]) => `${qty} ${RESOURCES[id]?.name || id}`).join(' and ')}.`;
        game.emit({ type: 'error', text });
        return false;
    }
    for (const [id, qty] of Object.entries(buy.next.consumes)) state.resources[id] -= qty;
    state.tools[toolId] = buy.next.tier;
    log(game, `${TOOLS[toolId].icon} Bought ${withArticle(buy.next.name)}!`, 'craft');
    game.emit({ type: 'toolMade', tool: toolId, tier: buy.next.tier });
    game.markDirty();   // its speed and doubles count from now
    return true;
}
