#!/usr/bin/env node
// Pure skill pacing: hours of continuous training (best node at each level) to reach milestones.
//   node tools/pacing.mjs
// Two columns per skill: without tools, and with the tool tier a player would have at that level.
import { SKILLS, GATHERING_SKILLS } from '../src/data/skills.js';
import { SMELTING_RECIPES, TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER } from '../src/data/workshop.js';
import { xpForLevel, levelForXp } from '../src/core/xp.js';

const MILESTONES = [10, 20, 30, 50, 75, 90, 99];

function pace(nodes, { toolFor = null } = {}) {
    let xp = 0, seconds = 0;
    const out = {};
    let level = 1;
    while (level < 99) {
        const node = [...nodes].reverse().find(n => n.levelReq <= level);
        const tier = toolFor ? toolFor(level) : 0;
        const interval = node.interval / 1000 / (1 + TOOL_SPEED_PER_TIER * tier);
        const perAction = node.xp;                       // doubles add items, not XP
        const target = xpForLevel(level + 1);
        const actions = Math.ceil((target - xp) / perAction);
        xp += actions * perAction;
        seconds += actions * interval;
        level = levelForXp(xp);
        for (const m of MILESTONES) if (level >= m && out[m] === undefined) out[m] = seconds / 3600;
    }
    return out;
}

const toolTierAt = toolId => level => TOOLS[toolId].tiers.filter(t => t.levelReq <= level).length;
const rows = [];
for (const id of ['mining', 'woodcutting', 'hunting', 'cooking', 'alchemy']) {
    const nodes = SKILLS[id].nodes.filter(n => !n.consumes || id === 'cooking');
    const tool = SKILLS[id].tool;
    rows.push([id, pace(nodes), tool ? pace(nodes, { toolFor: toolTierAt(tool) }) : null]);
}
rows.push(['smithing (smelting)', pace(SMELTING_RECIPES.map(r => ({ ...r }))), null]);

const f = h => (h === undefined ? '—' : h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(h < 10 ? 1 : 0)}h`);
console.log(`| Skill | ${MILESTONES.map(m => `Lv ${m}`).join(' | ')} |`);
console.log(`|---|${MILESTONES.map(() => '---').join('|')}|`);
for (const [id, bare, tooled] of rows) {
    console.log(`| ${id} | ${MILESTONES.map(m => f(bare[m])).join(' | ')} |`);
    if (tooled) console.log(`| ${id} + tools | ${MILESTONES.map(m => f(tooled[m])).join(' | ')} |`);
}
console.log('\nHours of continuous training with the best available node; ignores input supply for cooking/smelting, mini-game boosts, perks and achievements.');
