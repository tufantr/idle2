#!/usr/bin/env node
// Headless balance simulator. Plays the game through the same Game API the UI uses, with a
// simple "sensible player" policy, and reports how long milestones take.
//
//   node tools/simulate.mjs --hours=100 --seed=1 [--step=500] [--verbose] [--snapshot=10]
//
// Nothing here touches the DOM. Change a constant in src/core/formulas.js or the data tables,
// re-run, and compare the milestone table against the targets in docs/DESIGN.md §7.

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { levelForXp } from '../src/core/xp.js';
import { SKILLS } from '../src/data/skills.js';
import { METALS, SMELTING_RECIPES, TOOLS, GEM_TIERS, JEWEL_BARS } from '../src/data/workshop.js';
import { SMITHING_BAR_COST, TYPE_SLOTS, EQUIP_SLOTS } from '../src/data/items.js';
import { RESOURCES, orderedByTier } from '../src/data/resources.js';
import { skillLevel } from '../src/core/modifiers.js';
import { PERKS } from '../src/data/perks.js';
import { MAX_UPGRADE } from '../src/data/items.js';
import { CAMP_UPGRADES, campCost } from '../src/data/camp.js';
import { itemUpgradeCost } from '../src/systems/inventory.js';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));
const HOURS = Number(args.hours || 100);
const SEED = Number(args.seed || 1);
const STEP = Number(args.step || 500);
const SNAPSHOT_HOURS = Number(args.snapshot || 10);
const VERBOSE = !!args.verbose;

rng.setSource(seededRandom(SEED));
let now = 0;
const game = new Game(null, now);
const S = game.state;
const H = ms => (ms / 3600000);
const lvl = id => levelForXp(S.skills[id].xp);
const fmtH = ms => `${H(ms).toFixed(1)}h`;

// ---------- policy helpers ----------
const ARMOUR_PRIORITY = ['Weapon', 'Body', 'Shield', 'Legs', 'Head', 'Gloves', 'Boots'];

function bestMetal() {
    const sl = lvl('smithing');
    return [...METALS].reverse().find(m => sl >= m.levelReq) || METALS[0];
}
function bestNode(skillId) {
    const l = lvl(skillId);
    return [...SKILLS[skillId].nodes].reverse().find(n => l >= n.levelReq) || SKILLS[skillId].nodes[0];
}
function nodeFor(skillId, produces) {
    return SKILLS[skillId].nodes.find(n => n.produces === produces) || null;
}
function equippedTier(type) {
    const slots = TYPE_SLOTS[type];
    return Math.min(...slots.map(s => S.equipped[s]?.tier || 0));
}
function equipBest() {
    // Equip anything in the inventory that beats what is worn (by atk+def).
    for (const item of [...S.inventory]) {
        const slots = TYPE_SLOTS[item.type] || [];
        for (const slot of slots) {
            const current = S.equipped[slot];
            const score = it => (it ? it.atk + it.def : -1);
            if (score(item) > score(current)) { if (game.equipItem(item.id, slot)) break; }
        }
    }
    game.sellAllItems('common');
}

// Returns a gathering task to obtain `qty` of resource `id`, or null if impossible right now.
function obtain(id, qty) {
    if ((S.resources[id] || 0) >= qty) return null;
    const res = RESOURCES[id];
    if (res.category === 'ore') {
        const node = nodeFor('mining', id);
        if (!node || lvl('mining') < node.levelReq) return train('mining');
        return { kind: 'node', skill: 'mining', node: node.id, until: () => S.resources[id] >= qty, why: `mine ${qty} ${res.name}` };
    }
    if (res.category === 'log') {
        const node = nodeFor('woodcutting', id);
        if (!node || lvl('woodcutting') < node.levelReq) return train('woodcutting');
        return { kind: 'node', skill: 'woodcutting', node: node.id, until: () => S.resources[id] >= qty, why: `cut ${qty} ${res.name}` };
    }
    if (res.category === 'raw') {
        const node = nodeFor('hunting', id);
        if (!node || lvl('hunting') < node.levelReq) return train('hunting');
        return { kind: 'node', skill: 'hunting', node: node.id, until: () => S.resources[id] >= qty, why: `hunt ${qty} ${res.name}` };
    }
    if (res.category === 'bar') {
        const recipe = SMELTING_RECIPES.find(r => r.produces === id);
        if (lvl('smithing') < recipe.levelReq) return train('smithing');
        const need = qty - (S.resources[id] || 0);
        for (const [inId, inQty] of Object.entries(recipe.consumes)) {
            const t = obtain(inId, inQty * need);
            if (t) return t;
        }
        return { kind: 'smelt', recipe: recipe.id, until: () => S.resources[id] >= qty, why: `smelt ${qty} ${res.name}` };
    }
    if (res.category === 'food') {
        const node = nodeFor('cooking', id);
        if (!node || lvl('cooking') < node.levelReq) return train('cooking');
        const need = qty - (S.resources[id] || 0);
        const raw = Object.keys(node.consumes)[0];
        const t = obtain(raw, need);
        if (t) return t;
        const logs = orderedByTier('log').reduce((sum, l) => sum + (S.resources[l.id] || 0), 0);
        if (logs < need) return obtain('normal_log', need - logs + (S.resources.normal_log || 0));
        return { kind: 'node', skill: 'cooking', node: node.id, until: () => S.resources[id] >= qty, why: `cook ${qty} ${res.name}` };
    }
    if (res.category === 'gem') return { kind: 'node', skill: 'mining', node: bestNode('mining').id, until: () => S.resources[id] >= qty, why: `mine for ${res.name}` };
    return null;
}

// Train a skill with its best available node (or best smelting for smithing).
function train(skillId, minutes = 20) {
    const end = now + minutes * 60000;
    if (skillId === 'smithing') {
        // Smelt the best bar we can source ore for.
        for (const recipe of [...SMELTING_RECIPES].reverse()) {
            if (lvl('smithing') < recipe.levelReq) continue;
            const ins = Object.entries(recipe.consumes);
            const missing = ins.find(([id, q]) => (S.resources[id] || 0) < q * 20);
            if (missing) { const t = obtain(missing[0], missing[1] * 20); if (t) return t; }
            return { kind: 'smelt', recipe: recipe.id, until: () => now >= end || Object.entries(recipe.consumes).some(([id, q]) => S.resources[id] < q), why: `train smithing (${recipe.name})` };
        }
        return obtain('copper_ore', 20);
    }
    if (skillId === 'cooking') {
        const node = bestNode('cooking');
        const raw = Object.keys(node.consumes)[0];
        const t = obtain(raw, 20) || obtain('normal_log', 20);
        if (t) return t;
        return { kind: 'node', skill: 'cooking', node: node.id, until: () => now >= end || S.resources[raw] < 1, why: 'train cooking' };
    }
    const node = bestNode(skillId);
    return { kind: 'node', skill: skillId, node: node.id, until: () => now >= end, why: `train ${skillId} (${node.name})` };
}

function gearTask() {
    const metal = bestMetal();
    for (const type of ARMOUR_PRIORITY) {
        if (equippedTier(type) >= metal.tier) continue;
        const cost = SMITHING_BAR_COST[type];
        const t = obtain(metal.bar, cost);
        if (t) return t;
        return { kind: 'smith', type, bar: metal.bar, why: `forge ${metal.name} ${type}` };
    }
    return null;
}

function toolTask() {
    for (const toolId of ['pickaxe', 'axe', 'bow']) {
        const tool = TOOLS[toolId];
        const next = tool.tiers.find(t => t.tier === (S.tools[toolId] || 0) + 1);
        if (!next) continue;
        if (lvl(tool.madeBy) < next.levelReq) continue;
        for (const [id, qty] of Object.entries(next.consumes)) { const t = obtain(id, qty); if (t) return t; }
        return { kind: 'tool', tool: toolId, tier: next.tier, why: `make ${next.name}` };
    }
    return null;
}

function foodTask() {
    if (!S.unlocks.hunting) return null;
    const best = [...orderedByTier('food')].reverse().find(f => { const n = nodeFor('cooking', f.id); return n && lvl('cooking') >= n.levelReq && lvl('hunting') >= nodeFor('hunting', Object.keys(n.consumes)[0]).levelReq; });
    if (!best) return null;
    const stock = orderedByTier('food').reduce((sum, f) => sum + (S.resources[f.id] || 0) * f.heals, 0);
    const target = 60 * best.heals;
    if (stock >= target) return null;
    return obtain(best.id, (S.resources[best.id] || 0) + Math.ceil((target - stock) / best.heals));
}

function jewelTask() {
    if (!S.unlocks.crafting || lvl('mining') < 30) return null;
    const bar = [...JEWEL_BARS].reverse().find(b => lvl('crafting') >= b.levelReq && lvl('smithing') >= SMELTING_RECIPES.find(r => r.produces === b.bar).levelReq);
    if (!bar) return null;
    const gemTier = [...GEM_TIERS].reverse().find(g => lvl('crafting') >= g.levelReq && S.resources[g.gem] > 0);
    if (!gemTier) return null;
    const gemRes = RESOURCES[gemTier.gem];
    for (const type of ['Neck', 'Ring', 'Ear']) {
        if (equippedTier(type) >= gemRes.tier) continue;
        const t = obtain(bar.bar, 1);
        if (t) return t;
        return { kind: 'craft', type, bar: bar.bar, gem: gemTier.gem, why: `craft ${gemRes.name} ${type}` };
    }
    return null;
}

function spendPoints() {
    const order = ['knight', 'warlord', 'forager', 'scholar', 'rogue', 'fortune', 'gourmet', 'endurance'];
    let guard = 0;
    while (S.prestige.skillPoints > 0 && guard++ < 100) {
        const perk = order.map(id => PERKS.find(p => p.id === id)).find(p => S.perks[p.id] < p.max);
        if (!perk || !game.buyPerk(perk.id)) break;
    }
    // Essence into the weapon, then body.
    for (const slot of ['Weapon', 'Body', 'Shield']) {
        const item = S.equipped[slot];
        if (!item) continue;
        let g = 0;
        while ((item.upgrade || 0) < MAX_UPGRADE && g++ < 20) {
            const cost = itemUpgradeCost(game, item);
            if (S.resources.essence < cost.essence || S.gold < cost.gold) break;
            game.upgradeItem(item.id);
        }
    }
    buyCamp();
}
const runLog = [];
let runStartedAt = 0;

// Spend gold on camp upgrades, cheapest-first, keeping a small reserve.
function buyCamp() {
    let guard = 0;
    while (guard++ < 500) {
        const options = CAMP_UPGRADES.map(u => ({ u, cost: (S.camp[u.id] || 0) < u.max ? campCost(u, S.camp[u.id] || 0) : Infinity }))
            .sort((a, b) => a.cost - b.cost);
        const pick = options[0];
        if (!pick || pick.cost === Infinity || S.gold - pick.cost < 200) break;
        if (!game.buyCampUpgrade(pick.u.id, 1)) break;
    }
}

let lastStageGainAt = 0;
let lastTrainedSkill = null;
function combatTask() {
    return { kind: 'combat', why: `fight at stage ${S.combat.stage}`, until: () => !S.combat.active || now - lastStageGainAt > 15 * 60000 };
}

function decide() {
    equipBest();
    spendPoints();
    // Prestige when the run's tokens are a meaningful addition.
    if (game.canPrestige() && now - lastStageGainAt > 20 * 60000) {
        const p = game.prestigePreview();
        if (p.tokens >= Math.max(2, 0.15 * S.prestige.tokens)) {
            runLog.push({ run: S.prestige.count + 1, hours: H(now - runStartedAt), reached: S.combat.maxStage, tokens: p.tokens });
            game.prestige(); runStartedAt = now; milestone('prestige', S.prestige.count);
        }
    }
    return gearTask() || toolTask() || foodTask() || jewelTask() || trainWeakest() || combatTask();
}

// After combat stalls (no stage gain), work toward the next gear tier: the skill gating the next
// metal (smithing, or mining for its ore), then tools and food; fall back to the weakest skill.
let needTraining = false;
function trainWeakest() {
    if (!needTraining) return null;
    needTraining = false;
    const nextMetal = METALS.find(m => m.tier === bestMetal().tier + 1);
    if (nextMetal) {
        const recipe = SMELTING_RECIPES.find(r => r.produces === nextMetal.bar);
        const oreId = Object.keys(recipe.consumes).find(id => RESOURCES[id].category === 'ore' && id !== 'coal');
        const oreNode = nodeFor('mining', oreId);
        if (lvl('mining') < oreNode.levelReq && lastTrainedSkill !== 'mining') { lastTrainedSkill = 'mining'; return train('mining', 60); }
        if (lvl('smithing') < nextMetal.levelReq && lastTrainedSkill !== 'smithing') { lastTrainedSkill = 'smithing'; return train('smithing', 60); }
    }
    const candidates = ['mining', 'smithing', 'woodcutting', 'hunting', 'cooking', 'crafting'].filter(id => S.unlocks[id] || ['mining', 'smithing'].includes(id));
    candidates.sort((a, b) => lvl(a) - lvl(b));
    const pick = candidates.find(c => c !== lastTrainedSkill) || candidates[0];
    lastTrainedSkill = pick;
    if (pick === 'crafting') return craftTraining();
    return train(pick, 45);
}

function craftTraining() {
    const bar = JEWEL_BARS.find(b => lvl('crafting') >= b.levelReq && lvl('smithing') >= SMELTING_RECIPES.find(r => r.produces === b.bar).levelReq);
    const gemTier = [...GEM_TIERS].reverse().find(g => lvl('crafting') >= g.levelReq && S.resources[g.gem] >= 5);
    if (!bar || !gemTier) return train('mining', 30);
    const t = obtain(bar.bar, 5);
    if (t) return t;
    return { kind: 'craft', type: 'Ring', bar: bar.bar, gem: gemTier.gem, why: `train crafting (${gemTier.gem} rings)` };
}

function apply(task) {
    if (task.kind === 'node') game.startNodeAction(task.skill, task.node);
    else if (task.kind === 'smelt') game.startSmelting(task.recipe);
    else if (task.kind === 'smith') game.startSmithing(task.type, task.bar);
    else if (task.kind === 'craft') game.startCrafting(task.type, task.bar, task.gem);
    else if (task.kind === 'tool') game.startToolCraft(task.tool, task.tier);
    else if (task.kind === 'combat') { lastStageGainAt = now; game.enterCombat(); }
}

function taskDone(task) {
    if (task.kind === 'smith' || task.kind === 'craft' || task.kind === 'tool') return !S.action;
    if (task.until) return task.until();
    return !S.action;
}

// ---------- milestones ----------
const milestones = [];
const seen = new Set();
function milestone(key, value) {
    const id = `${key}:${value}`;
    if (seen.has(id)) return;
    seen.add(id);
    milestones.push({ key, value, at: now });
    if (VERBOSE) console.log(`  [${fmtH(now)}] ${key} ${value}`);
}
const STAGE_MARKS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200];
const LEVEL_MARKS = [25, 50, 75, 99];

// ---------- main loop ----------
let task = decide();
apply(task);
let lastDecision = now;
let lastSnapshot = 0;
let lastMaxStage = S.combat.maxStage;
const totalMs = HOURS * 3600000;
const t0 = Date.now();

const deathStages = { boss: 0, regular: 0 };
while (now < totalMs) {
    now += STEP;
    game.tick(now);
    for (const ev of game.drainEvents()) if (ev.type === 'death') deathStages[ev.stage % 10 === 0 ? 'boss' : 'regular']++;
    if (S.combat.bestStage > lastMaxStage) { lastMaxStage = S.combat.bestStage; lastStageGainAt = now; }
    if (task.kind === 'combat' && !S.combat.active && S.combat.hp <= game.derived.maxHp * 0.5) needTraining = true;
    if (task.kind === 'combat' && now - lastStageGainAt > 15 * 60000) needTraining = true;

    if (task.kind === 'combat' && now % 60000 < STEP) buyCamp();
    if (taskDone(task) || now - lastDecision > 10 * 60000) {
        task = decide();
        apply(task);
        lastDecision = now;
        if (VERBOSE && now % (3600000) < STEP * 2) console.log(`  [${fmtH(now)}] -> ${task.why}`);
    }
    for (const m of STAGE_MARKS) if (S.combat.bestStage >= m) milestone('stage', m);
    if (S.equipped.Weapon) milestone('weapon tier', S.equipped.Weapon.tier);
    for (const id of ['mining', 'smithing', 'woodcutting', 'hunting', 'cooking', 'combat']) for (const m of LEVEL_MARKS) if (lvl(id) >= m) milestone(`${id} lv`, m);
    if (H(now) - lastSnapshot >= SNAPSHOT_HOURS) {
        lastSnapshot = H(now);
        console.log(`t=${fmtH(now).padStart(7)} | stage ${String(S.combat.stage).padStart(4)} best ${String(S.combat.bestStage).padStart(4)} | tokens ${String(S.prestige.tokens).padStart(6)} (P${S.prestige.count}) camp ${S.camp.whetstone}/${S.camp.armory}/${S.camp.hearth} | atk ${String(game.derived.atk).padStart(6)} def ${String(game.derived.def).padStart(6)} hp ${String(game.derived.maxHp).padStart(6)} | ` +
            `min ${lvl('mining')} smi ${lvl('smithing')} wc ${lvl('woodcutting')} hun ${lvl('hunting')} cook ${lvl('cooking')} cra ${lvl('crafting')} cmb ${lvl('combat')} | gold ${Math.round(S.gold).toLocaleString()} | tools ${S.tools.pickaxe}/${S.tools.axe}/${S.tools.bow} | ${task.why}`);
    }
}

console.log(`\nSimulated ${HOURS}h in ${((Date.now() - t0) / 1000).toFixed(1)}s (seed ${SEED}).`);
console.log('\nMilestones:');
const byKey = {};
for (const m of milestones) (byKey[m.key] ||= []).push(`${m.value}@${fmtH(m.at)}`);
for (const [key, list] of Object.entries(byKey)) console.log(`  ${key.padEnd(16)} ${list.join('  ')}`);
console.log(`\nRuns: ${runLog.map(r => `#${r.run} ${r.hours.toFixed(1)}h→stage ${r.reached} (+${r.tokens})`).join('; ') || 'none'}`);
console.log(`Deaths: ${deathStages.boss} on boss stages, ${deathStages.regular} on regular stages (${Math.round(100 * deathStages.regular / Math.max(1, deathStages.boss + deathStages.regular))}% of walls are not bosses)`);
console.log(`\nFinal: best stage ${S.combat.bestStage}, ${S.prestige.count} prestiges, ${S.prestige.tokens} tokens (+${game.derived.tokenPowerPct}% power), kills ${S.stats.kills}, deaths ${S.stats.deaths}, gold earned ${Math.round(S.stats.goldEarned).toLocaleString()}`);
console.log(`Gear: ${EQUIP_SLOTS.map(s => S.equipped[s] ? `${s}:${S.equipped[s].name}${S.equipped[s].upgrade ? '+' + S.equipped[s].upgrade : ''}` : null).filter(Boolean).join(', ')}`);
console.log(`Achievements: ${Object.keys(S.achievements).length}; perks: ${Object.entries(S.perks).filter(([, v]) => v).map(([k, v]) => `${k}${v}`).join(' ')}`);
