#!/usr/bin/env node
// Pure skill pacing: hours of continuous training (best node at each level) to reach milestones.
//   node tools/pacing.mjs
// Gathering skills get two rows: without tools, and with the tool tier a player would have at that
// level. The smithing "pipeline" row models a dedicated smith who mines their own ore and coal,
// smelts it, and forges the most bar-efficient piece they can — the realistic smithing pace.
import { SKILLS } from '../src/data/skills.js';
import { SMELTING_RECIPES, METALS, TOOLS, TOOL_SPEED_PER_TIER, SMITH_INTERVAL, smithLevelReq } from '../src/data/workshop.js';
import { SMITHING_TYPES, SMITHING_BAR_COST } from '../src/data/items.js';
import { xpForLevel, levelForXp } from '../src/core/xp.js';
import { FARMING_PLOTS, CROPS } from '../src/data/farming.js';
import { AGILITY_SLOTS } from '../src/data/agility.js';

const MILESTONES = [10, 20, 30, 50, 75, 90, 99];

function pace(nodes, { toolFor = null } = {}) {
    let xp = 0, seconds = 0;
    const out = {};
    let level = 1;
    while (level < 99) {
        // The unlocked node with the best XP per second (cooking has several lines of dishes).
        const node = nodes.filter(n => n.levelReq <= level).sort((a, b) => b.xp / b.interval - a.xp / a.interval)[0];
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

// Mine → smelt → forge, one bar at a time, choosing the best metal both skills allow.
function smithingPipeline() {
    const mining = SKILLS.mining.nodes;
    const nodeFor = id => mining.find(n => n.produces === id);
    let smithXp = 0, mineXp = 0, seconds = 0;
    const out = {};
    const mineLevels = {};
    while (levelForXp(smithXp) < 99 && seconds < 1e8) {
        const sl = levelForXp(smithXp);
        const ml = levelForXp(mineXp);
        const usable = METALS.filter(m => {
            const recipe = SMELTING_RECIPES.find(r => r.produces === m.bar);
            return sl >= recipe.levelReq && Object.keys(recipe.consumes).every(id => ml >= nodeFor(id).levelReq);
        });
        const metal = usable[usable.length - 1];
        const recipe = SMELTING_RECIPES.find(r => r.produces === metal.bar);
        // Mining one bar's worth of ore and coal.
        for (const [id, qty] of Object.entries(recipe.consumes)) {
            const node = nodeFor(id);
            seconds += qty * node.interval / 1000;
            mineXp += qty * node.xp;
        }
        // Smelting the bar.
        seconds += recipe.interval / 1000;
        smithXp += recipe.xp;
        // Forging: the piece with the most bars per action that this level allows is the fastest XP per bar.
        const piece = SMITHING_TYPES.filter(t => sl >= smithLevelReq(metal, t)).sort((a, b) => SMITHING_BAR_COST[b] - SMITHING_BAR_COST[a])[0];
        seconds += SMITH_INTERVAL / 1000 / SMITHING_BAR_COST[piece];
        smithXp += metal.xpPerBar;
        const level = levelForXp(smithXp);
        for (const m of MILESTONES) if (level >= m && out[m] === undefined) { out[m] = seconds / 3600; mineLevels[m] = levelForXp(mineXp); }
    }
    return { out, mineLevels };
}

// Farming: every open plot planted with the best crop and harvested the moment it is ready.
function farmingPace() {
    let xp = 0, seconds = 0, level = 1;
    const out = {};
    while (level < 99) {
        const plots = FARMING_PLOTS.filter(req => req <= level).length;
        const crop = [...CROPS].reverse().find(c => c.levelReq <= level);
        const perSecond = plots * crop.xp * (crop.yield[0] + crop.yield[1]) / 2 / (crop.growMs / 1000);
        const target = xpForLevel(level + 1);
        seconds += (target - xp) / perSecond;
        xp = target;
        level = levelForXp(xp);
        for (const m of MILESTONES) if (level >= m && out[m] === undefined) out[m] = seconds / 3600;
    }
    return out;
}

// Agility: running a course with an obstacle in every slot the level allows (all at level 1).
function agilityPace() {
    const courseAt = level => {
        const open = AGILITY_SLOTS.filter(s => s.levelReq <= level).map(s => s.obstacles[0]);
        return { id: `course${open.length}`, levelReq: 1, interval: open.reduce((a, o) => a + o.interval, 0), xp: open.reduce((a, o) => a + o.xp, 0) };
    };
    let xp = 0, seconds = 0, level = 1;
    const out = {};
    while (level < 99) {
        const course = courseAt(level);
        const target = xpForLevel(level + 1);
        const runs = Math.ceil((target - xp) / course.xp);
        xp += runs * course.xp;
        seconds += runs * course.interval / 1000;
        level = levelForXp(xp);
        for (const m of MILESTONES) if (level >= m && out[m] === undefined) out[m] = seconds / 3600;
    }
    return out;
}

const toolTierAt = toolId => level => TOOLS[toolId].tiers.filter(t => t.levelReq <= level).length;
const rows = [];
for (const id of ['mining', 'woodcutting', 'fishing', 'hunting', 'cooking', 'firemaking', 'alchemy']) {
    const nodes = SKILLS[id].nodes.filter(n => !n.consumes || id === 'cooking' || id === 'firemaking');
    const tool = SKILLS[id].tool;
    rows.push([id, pace(nodes), tool ? pace(nodes, { toolFor: toolTierAt(tool) }) : null]);
}
rows.push(['smithing (smelting only)', pace(SMELTING_RECIPES.map(r => ({ ...r }))), null]);
rows.push(['farming (every plot, harvested on time)', farmingPace(), null]);
rows.push(['agility (a full course at each level)', agilityPace(), null]);
const pipeline = smithingPipeline();

const f = h => (h === undefined ? '—' : h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(h < 10 ? 1 : 0)}h`);
console.log(`| Skill | ${MILESTONES.map(m => `Lv ${m}`).join(' | ')} |`);
console.log(`|---|${MILESTONES.map(() => '---').join('|')}|`);
for (const [id, bare, tooled] of rows) {
    console.log(`| ${id} | ${MILESTONES.map(m => f(bare[m])).join(' | ')} |`);
    if (tooled) console.log(`| ${id} + tools | ${MILESTONES.map(m => f(tooled[m])).join(' | ')} |`);
}
console.log(`| smithing (mine → smelt → forge) | ${MILESTONES.map(m => f(pipeline.out[m])).join(' | ')} |`);
console.log(`| … mining level at that point | ${MILESTONES.map(m => pipeline.mineLevels[m] ?? '—').join(' | ')} |`);
console.log('\nHours of continuous training with the best available node; ignores mini-game boosts, perks and achievements.');
console.log('Rows other than the pipeline assume inputs are already in the bank.');
