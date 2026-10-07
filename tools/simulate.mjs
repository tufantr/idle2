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
import { FORGE_METALS, SMELTING_RECIPES, TOOLS, GEM_TIERS, JEWEL_BARS, smithLevelReq, anvilMetal } from '../src/data/workshop.js';
import { anvilCost } from '../src/systems/anvil.js';
import { SMITHING_BAR_COST, SMITHING_TYPES, TYPE_SLOTS, EQUIP_SLOTS } from '../src/data/items.js';
import { RESOURCES, orderedByTier } from '../src/data/resources.js';
import { skillLevel } from '../src/core/modifiers.js';
import { PERKS, GOLD_SHOP } from '../src/data/perks.js';
import { MAX_UPGRADE } from '../src/data/items.js';
import { CAMP_UPGRADES, campCost } from '../src/data/camp.js';
import { itemUpgradeCost, itemScore, goldShopPrice } from '../src/systems/inventory.js';
import { generateEquipment } from '../src/core/formulas.js';
import { RARITIES } from '../src/data/items.js';
import { resolveAction } from '../src/systems/skilling.js';
import { DUNGEONS, FRAGMENTS_PER_UNIQUE, DUNGEON_BOSS_TIME_MS } from '../src/data/dungeons.js';
import { dungeonPreview, dungeonUnlocked, fightPreview } from '../src/systems/dungeon.js';
import { AGILITY_SLOTS } from '../src/data/agility.js';
import { canBuild, obstacleCost, upgradeInfo } from '../src/systems/agility.js';
import { plotUnlocked, plotReady, bestCrop, seedCost } from '../src/systems/farming.js';
import { enemyForStage } from '../src/core/formulas.js';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));
const HOURS = Number(args.hours || 100);
const SEED = Number(args.seed || 1);
const STEP = Number(args.step || 500);
const SNAPSHOT_HOURS = Number(args.snapshot || 10);
const VERBOSE = !!args.verbose;
const NO_DUNGEONS = !!args['no-dungeons'];
// Controls for dungeon balance: spend the dungeon half hours on the ladder instead.
//   --farm-ladder       farm the highest comfortable stage of the run (farm mode)
//   --farm-ladder=push  keep pushing at the wall (an AFK player who leaves combat running)
const FARM_LADDER = args['farm-ladder'] ? (args['farm-ladder'] === 'push' ? 'push' : 'farm') : null;
const NO_TITAN = !!args['no-titan'];

rng.setSource(seededRandom(SEED));
let now = 0;
const game = new Game(null, now);
const S = game.state;

// Where the gold goes: wrap every gold sink and record the gold it removed.
const spentOn = {};
for (const [method, label] of [['buyCampUpgrade', 'camp'], ['upgradeItem', 'upgrades'], ['reforgeItem', 'reforges'], ['buyGoldShopItem', 'supplies'], ['plant', 'seeds'], ['harvestAll', 'seeds'], ['buildObstacle', 'agility']]) {
    const original = game[method].bind(game);
    game[method] = (...a) => { const before = S.gold; const r = original(...a); spentOn[label] = (spentOn[label] || 0) + Math.max(0, before - S.gold); return r; };
}
const H = ms => (ms / 3600000);
const lvl = id => levelForXp(S.skills[id].xp);
const fmtH = ms => `${H(ms).toFixed(1)}h`;

// ---------- policy helpers ----------
const ARMOUR_PRIORITY = ['Weapon', 'Body', 'Shield', 'Legs', 'Head', 'Gloves', 'Boots'];

// The anvil's next job worth gathering for: the first worn piece (weapon first) whose next
// reinforcing the Smithing level allows, with the essence for it. { item, cost } or null.
function anvilJob() {
    for (const slot of ARMOUR_PRIORITY) {
        const item = S.equipped[slot];
        if (!item) continue;
        const cost = anvilCost(S, item);
        if ((cost.ok || cost.why === 'short') && S.resources.essence >= cost.essence) return { item, cost };
    }
    return null;
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
    game.salvageAll('common');   // bars of their metal for the anvil, and essence
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
        // Bars for the anvil's next job first, if we can smelt them (the reinforcing itself happens in
        // spendPoints; bars we can't smelt yet only come from salvage).
        const job = anvilJob();
        const smeltable = job && lvl('smithing') >= SMELTING_RECIPES.find(r => r.produces === job.cost.bar).levelReq;
        if (smeltable) { const t = obtain(job.cost.bar, job.cost.bars); if (t) return t; }
        // Then forge copper if bars are on hand, otherwise smelt the best bar we can source ore for.
        const metal = [...FORGE_METALS].reverse().find(m => lvl('smithing') >= m.levelReq && S.resources[m.bar] >= 5);
        if (metal) {
            const piece = SMITHING_TYPES.filter(t => lvl('smithing') >= smithLevelReq(metal, t)).sort((a, b) => SMITHING_BAR_COST[b] - SMITHING_BAR_COST[a])[0];
            return { kind: 'smith', type: piece, bar: metal.bar, until: () => now >= end || S.resources[metal.bar] < SMITHING_BAR_COST[piece], why: `train smithing (forge ${metal.name} ${piece})` };
        }
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

// A forged piece's expected score (common quality), to compare with what is worn: an upgraded or
// rare piece of a lower metal can beat a fresh common one, and forging it anyway loops forever.
function forgedScore(metal, type) {
    const probe = generateEquipment({ type, tier: metal.tier, power: RESOURCES[metal.bar].power, materialName: metal.name, rarity: RARITIES[0] }, -1);
    return itemScore(probe);
}
const forgeAttempts = {};
function gearTask() {
    for (const type of ARMOUR_PRIORITY) {
        // The best metal this piece can be forged in at the current smithing level (copper: the rest drops).
        const metal = [...FORGE_METALS].reverse().find(m => lvl('smithing') >= smithLevelReq(m, type));
        if (!metal || equippedTier(type) >= metal.tier) continue;
        const worn = Math.min(...TYPE_SLOTS[type].map(slot => itemScore(S.equipped[slot])));
        if (worn >= forgedScore(metal, type)) continue;
        const key = `${metal.bar}:${type}`;
        if ((forgeAttempts[key] || 0) >= 5) continue; // it keeps rolling worse than what we wear; move on
        const cost = SMITHING_BAR_COST[type];
        const t = obtain(metal.bar, cost);
        if (t) return t;
        const made = S.stats.itemsCrafted;
        forgeAttempts[key] = (forgeAttempts[key] || 0) + 1;
        return { kind: 'smith', type, bar: metal.bar, until: () => S.stats.itemsCrafted > made, why: `forge ${metal.name} ${type}` };
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
    // The bot cooks hunted meat (fish and farm dishes are left to real players).
    const best = [...orderedByTier('food')].reverse().find(f => {
        const n = nodeFor('cooking', f.id);
        const hunt = n && nodeFor('hunting', Object.keys(n.consumes)[0]);
        return hunt && lvl('cooking') >= n.levelReq && lvl('hunting') >= hunt.levelReq;
    });
    if (!best) return null;
    const stock = orderedByTier('food').reduce((sum, f) => sum + (S.resources[f.id] || 0) * f.heals, 0);
    const target = 60 * best.heals;
    if (stock >= target) return null;
    return obtain(best.id, (S.resources[best.id] || 0) + Math.ceil((target - stock) / best.heals));
}

function jewelTask() {
    if (lvl('mining') < 30) return null;
    if (!S.unlocks.crafting) return lvl('smithing') >= 20 ? obtain('silver_bar', 1) : null;   // the first silver bar opens Crafting
    const bar = [...JEWEL_BARS].reverse().find(b => lvl('crafting') >= b.levelReq && lvl('smithing') >= SMELTING_RECIPES.find(r => r.produces === b.bar).levelReq);
    if (!bar) return null;
    const gemTier = [...GEM_TIERS].reverse().find(g => lvl('crafting') >= g.levelReq && S.resources[g.gem] > 0);
    if (!gemTier) return null;
    const gemRes = RESOURCES[gemTier.gem];
    for (const type of ['Neck', 'Ring', 'Ear']) {
        if (equippedTier(type) >= gemRes.tier) continue;
        const recipe = resolveAction(S, { kind: 'craft', type, bar: bar.bar, gem: gemTier.gem });
        if (lvl('crafting') < recipe.levelReq) continue;
        const t = obtain(bar.bar, 1);
        if (t) return t;
        const made = S.stats.itemsCrafted;
        return { kind: 'craft', type, bar: bar.bar, gem: gemTier.gem, until: () => S.stats.itemsCrafted > made, why: `craft ${gemRes.name} ${type}` };
    }
    return null;
}

function spendPoints() {
    const order = ['knight', 'warlord', 'forager', 'scholar', 'rogue', 'fortune', 'gourmet', 'endurance', 'paragon'];
    let guard = 0;
    while (S.prestige.skillPoints > 0 && guard++ < 100) {
        const perk = order.map(id => PERKS.find(p => p.id === id)).find(p => S.perks[p.id] < p.max);
        if (!perk || !game.buyPerk(perk.id)) break;
    }
    // Spare gold buys essence (after the camp, and never the gold saved for the next obstacle).
    const reserve = nextSlot() >= 0 ? obstacleCost(S, nextSlot()).gold : 0;
    for (let guard = 0; guard < 50 && S.resources.essence < 3000; guard++) {
        const price = goldShopPrice(game, GOLD_SHOP.find(i => i.id === 'buy_essence'));
        if (S.gold - price < reserve + 20 * price || !game.buyGoldShopItem('buy_essence')) break;
    }
    // Bars and essence into the worn weapon and armour at the anvil, weapon first.
    for (const slot of ARMOUR_PRIORITY) {
        const item = S.equipped[slot];
        for (let g = 0; item && g < MAX_UPGRADE && anvilCost(S, item).ok; g++) game.reinforceItem(item.id);
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

// Dungeons: when the stage push stalls, farm the deepest dungeon the hero clears comfortably
// for half an hour (chests, fragments, clear milestones), then go back to the ladder.
function dungeonTask() {
    const limit = DUNGEON_BOSS_TIME_MS / 1000;
    const ready = DUNGEONS.filter(d => dungeonUnlocked(S, d)).filter(d => {
        const p = dungeonPreview(game.derived, d);
        return p.bossFight.killSeconds <= 0.7 * Math.min(limit, p.bossFight.surviveSeconds)
            && p.eliteFight.killSeconds <= 0.5 * p.eliteFight.surviveSeconds;
    });
    const pick = ready[ready.length - 1];
    if (!pick) return null;
    // Only worth it while the dungeon still pays: its unique isn't assembled yet, or its chests can
    // still hold gear better than the weapon we wear (a chest of the top tier would otherwise keep a
    // hero who already wears that tier farming it forever instead of pushing).
    const hasUnique = [...S.inventory, ...Object.values(S.equipped)].some(i => i && i.uniqueId === pick.unique);
    if (hasUnique && pick.chestTier <= (S.equipped.Weapon?.tier || 0)) return null;
    const end = now + 30 * 60000;
    return {
        kind: 'dungeon', id: pick.id, why: `run ${pick.name}`,
        // When time is up, stop repeating, let the current run finish, and end the dungeon at its chest.
        until: () => {
            if (now >= end) {
                game.setDungeonRepeat(false);
                if (S.combat.dungeon?.choiceLeft > 0) game.dungeonEnd();
            }
            return S.combat.mode !== 'dungeon';
        }
    };
}

// Control for dungeon balance: spend the same half hour farming the highest stage of this run the
// hero clears comfortably (same readiness rule as dungeonTask), so the comparison isolates what
// dungeons add over plain farming.
function ladderFarmTask() {
    if (FARM_LADDER === 'push') {
        const end = now + 30 * 60000;
        return { kind: 'farm', stage: null, why: `keep fighting at stage ${S.combat.stage}`, until: () => now >= end };
    }
    let target = 1;
    for (let st = S.combat.maxStage; st >= 1; st--) {
        if (st % 10 === 0) continue; // boss stages are not farm spots
        const f = fightPreview(game.derived, enemyForStage(st));
        if (f.killSeconds <= 0.5 * f.surviveSeconds) { target = st; break; }
    }
    const end = now + 30 * 60000;
    return {
        kind: 'farm', stage: target, why: `farm stage ${target}`,
        until: () => { if (now >= end || !S.combat.active) { game.setFarmMode(false); return true; } return false; }
    };
}

let lastStallWasDungeon = false;
let agilityMs = 0; // time spent training agility for the next slot
function stallTask() {
    if (!needTraining) return null;
    if (!lastStallWasDungeon && FARM_LADDER) { lastStallWasDungeon = true; needTraining = false; return ladderFarmTask(); }
    if (!lastStallWasDungeon && !NO_DUNGEONS) {
        // No dungeon worth farming (none cleared comfortably, or all outgrown): keep fighting at the
        // wall for a while instead, where the late gear drops come from.
        const t = dungeonTask() || { kind: 'farm', stage: null, why: `keep fighting at stage ${S.combat.stage}`, until: (end => () => now >= end)(now + 30 * 60000) };
        lastStallWasDungeon = true; needTraining = false; return t;
    }
    lastStallWasDungeon = false;
    return trainWeakest();
}

let lastStageGainAt = 0;
let lastTrainedSkill = null;
function combatTask() {
    return { kind: 'combat', why: `fight at stage ${S.combat.stage}`, until: () => !S.combat.active || now - lastStageGainAt > 15 * 60000 };
}

// Farming: harvest what is ready and keep every open plot planted with the best crop we can afford.
function tendFarm() {
    if (!S.unlocks.farming) return;
    S.farming.plots.forEach((plot, i) => {
        if (plotReady(plot, now)) game.harvest(i);
        if (!plot.crop && plotUnlocked(S, i)) {
            const crop = bestCrop(S, c => seedCost(S, c) <= S.gold * 0.2);
            if (crop) game.plant(i, crop.id);
        }
    });
}

// Agility: the bot's pick per slot (combat first), built as soon as gold and materials allow; spare
// gold then upgrades the cheapest obstacle, keeping enough back for the next build.
const AGILITY_PICKS = ['rope_swing', 'cargo_net', 'pipe_crawl', 'hurdles', 'waterfall', 'sky_bridge'];
function nextSlot() {
    return S.unlocks.agility ? S.agility.built.findIndex(b => !b) : -1;
}
function buildObstacles() {
    const slot = nextSlot();
    if (slot >= 0 && canBuild(S, AGILITY_PICKS[slot]).ok && game.buildObstacle(AGILITY_PICKS[slot])) milestone('obstacle', slot + 1);
    const reserve = nextSlot() >= 0 ? obstacleCost(S, nextSlot()).gold : 0;
    for (let guard = 0; guard < 10; guard++) {
        const pick = S.agility.built.map((id, i) => ({ i, info: id ? upgradeInfo(S, i) : null }))
            .filter(o => o.info && lvl('agility') >= o.info.levelReq)
            .sort((a, b) => a.info.gold - b.info.gold)[0];
        if (!pick || S.gold - pick.info.gold < reserve || !game.upgradeObstacle(pick.i)) break;
        milestone('obstacle upgrades', S.stats.obstacleUpgrades);
    }
}
// When the next obstacle's gold is within reach: train agility for its slot, then gather materials.
function agilityTask() {
    const slot = nextSlot();
    if (slot < 0) {
        // Course complete: train agility when an upgrade we can afford is waiting on the level.
        if (!S.unlocks.agility || agilityMs > 0.25 * now) return null;
        const waiting = S.agility.built.map((id, i) => (id ? upgradeInfo(S, i) : null)).filter(Boolean)
            .find(info => S.gold >= info.gold && lvl('agility') < info.levelReq);
        if (!waiting) return null;
        const start = now;
        const end = now + 30 * 60000;
        return { kind: 'agility', why: `train agility toward ${waiting.levelReq}`, until: () => { if (now >= end || lvl('agility') >= waiting.levelReq) { agilityMs += now - start; return true; } return false; } };
    }
    const cost = obstacleCost(S, slot);
    if (S.gold < cost.gold * 0.5) return null;
    const target = AGILITY_SLOTS[slot].levelReq;
    if (lvl('agility') < target) {
        // A real player interleaves: at most a quarter of the time on the course, half an hour at a go.
        if (!S.agility.built.some(Boolean) || agilityMs > 0.25 * now) return null;
        const start = now;
        const end = now + 30 * 60000;
        return { kind: 'agility', why: `train agility toward ${target}`, until: () => { if (now >= end || lvl('agility') >= target) { agilityMs += now - start; return true; } return false; } };
    }
    for (const [id, qty] of Object.entries(cost.materials)) {
        if (RESOURCES[id].category === 'gem') continue; // gems come from mining luck; wait for them
        const t = obtain(id, qty);
        if (t) return t;
    }
    return null;
}

function decide() {
    equipBest();
    spendPoints();
    tendFarm();
    buildObstacles();
    // Prestige when the run's tokens are a meaningful addition.
    if (game.canPrestige() && now - lastStageGainAt > 20 * 60000) {
        const p = game.prestigePreview();
        // Worth it when the run adds a decent share of what we hold; the share asked for shrinks as
        // tokens pile up (15% early, ~2% at 7,000), since a late run can only add a few percent.
        const share = 0.15 * Math.sqrt(100 / (100 + S.prestige.tokens));
        // A player stuck at the wall for an hour prestiges anyway: it is the only progress left.
        const longStall = now - lastStageGainAt > 60 * 60000;
        if (p.tokens >= Math.max(2, share * S.prestige.tokens) || (longStall && p.tokens >= 2)) {
            runLog.push({ run: S.prestige.count + 1, hours: H(now - runStartedAt), reached: S.combat.maxStage, tokens: p.tokens });
            game.prestige(); runStartedAt = now; milestone('prestige', S.prestige.count);
        }
    }
    for (const d of DUNGEONS) if (S.dungeons[d.id].fragments >= FRAGMENTS_PER_UNIQUE && game.assembleUnique(d.id)) milestone('unique', d.unique);
    return gearTask() || agilityTask() || toolTask() || foodTask() || jewelTask() || stallTask() || combatTask();
}

// After combat stalls (no stage gain), work toward the next gear tier: the skill gating the next
// metal (smithing, or mining for its ore), then tools and food; fall back to the weakest skill.
let needTraining = false;
function trainWeakest() {
    if (!needTraining) return null;
    needTraining = false;
    // The metal the anvil needs for the weapon worn, while Mining or Smithing doesn't reach it yet.
    const weapon = S.equipped.Weapon;
    const target = weapon && (weapon.upgrade || 0) < MAX_UPGRADE ? anvilMetal(weapon.tier) : null;
    if (target) {
        const recipe = SMELTING_RECIPES.find(r => r.produces === target.bar);
        const oreId = Object.keys(recipe.consumes).find(id => RESOURCES[id].category === 'ore' && id !== 'coal');
        const oreNode = nodeFor('mining', oreId);
        if (lvl('mining') < oreNode.levelReq && lastTrainedSkill !== 'mining') { lastTrainedSkill = 'mining'; return train('mining', 60); }
        if (lvl('smithing') < target.levelReq && lastTrainedSkill !== 'smithing') { lastTrainedSkill = 'smithing'; return train('smithing', 60); }
    }
    const candidates = ['mining', 'smithing', 'woodcutting', 'hunting', 'cooking', 'crafting', 'agility'].filter(id => (S.unlocks[id] || ['mining', 'smithing'].includes(id)) && (id !== 'agility' || S.agility.built.some(Boolean)));
    candidates.sort((a, b) => lvl(a) - lvl(b));
    const pick = candidates.find(c => c !== lastTrainedSkill) || candidates[0];
    lastTrainedSkill = pick;
    if (pick === 'crafting') return craftTraining();
    if (pick === 'agility') { const end = now + 45 * 60000; return { kind: 'agility', why: 'run the agility course', until: () => now >= end }; }
    return train(pick, 45);
}

// Gems come from rocks of about their tier, so look for them in the richest rock whose gems we can
// already use (the best rock only turns up gems a low crafting level can't work).
function mineForGems(minutes) {
    const usable = Math.max(...GEM_TIERS.filter(g => lvl('crafting') >= g.levelReq).map(g => RESOURCES[g.gem].tier));
    const node = [...SKILLS.mining.nodes].reverse().find(n => lvl('mining') >= n.levelReq && RESOURCES[n.produces].tier <= usable) || SKILLS.mining.nodes[0];
    const end = now + minutes * 60000;
    return { kind: 'node', skill: 'mining', node: node.id, until: () => now >= end, why: `mine ${node.name} for gems` };
}

function craftTraining() {
    const bar = JEWEL_BARS.find(b => lvl('crafting') >= b.levelReq && lvl('smithing') >= SMELTING_RECIPES.find(r => r.produces === b.bar).levelReq);
    const gemTier = [...GEM_TIERS].reverse().find(g => lvl('crafting') >= g.levelReq && S.resources[g.gem] >= 5);
    if (!bar || !gemTier) return mineForGems(30);
    const t = obtain(bar.bar, 5);
    if (t) return t;
    return { kind: 'craft', type: 'Ring', bar: bar.bar, gem: gemTier.gem, why: `train crafting (${gemTier.gem} rings)` };
}

// Starts a task; returns the task actually running. Anything that fails to start (level too low,
// a recipe the policy got wrong) falls back to combat, so the bot can never spin on a dead task.
function apply(task) {
    if (S.action && task.kind !== 'combat') game.stopAction();
    let ok = true;
    if (task.kind === 'node') ok = game.startNodeAction(task.skill, task.node);
    else if (task.kind === 'smelt') ok = game.startSmelting(task.recipe);
    else if (task.kind === 'smith') ok = game.startSmithing(task.type, task.bar);
    else if (task.kind === 'craft') ok = game.startCrafting(task.type, task.bar, task.gem);
    else if (task.kind === 'tool') ok = game.startToolCraft(task.tool, task.tier);
    else if (task.kind === 'agility') ok = game.startAgility();
    else if (task.kind === 'dungeon') { ok = game.enterDungeon(task.id); if (ok) { game.setDungeonRepeat(true); lastStageGainAt = now; } }   // the player keeps going, decided up front
    else if (task.kind === 'farm') {
        game.enterCombat();
        if (task.stage) { game.setStage(task.stage); game.setFarmMode(true); }
        lastStageGainAt = now;
    }
    if ((task.kind === 'dungeon' || task.kind === 'farm') && ok) return task;
    if (task.kind === 'combat' || !ok) {
        if (!ok && VERBOSE) console.log(`  [${fmtH(now)}] could not start: ${task.why}`);
        lastStageGainAt = now;
        game.enterCombat();
        return ok ? task : combatTask();
    }
    return task;
}

function taskDone(task) {
    if (!['combat', 'dungeon', 'farm'].includes(task.kind) && (!S.action || S.action.stalled)) return true;
    if (task.until) return task.until();
    return false;
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
const LEVEL_MARKS = [25, 50, 60, 75, 90, 99];

// ---------- main loop ----------
let task = apply(decide());
let lastDecision = now;
let lastSnapshot = 0;
let lastMaxStage = S.combat.maxStage;
const totalMs = HOURS * 3600000;
const t0 = Date.now();

const deathStages = { boss: 0, regular: 0 };
let steady = null; // gold earned/spent at the halfway mark, for the steady-state sink ratio
let dungeonFails = 0;
let titanTries = 0;
while (now < totalMs) {
    now += STEP;
    game.tick(now);
    for (const ev of game.drainEvents()) {
        if (ev.type === 'death' && ev.mode === 'stages') deathStages[ev.stage % 10 === 0 ? 'boss' : 'regular']++;
        if (ev.type === 'dungeonClear') { milestone(`${ev.dungeon} clears`, 1); if (ev.clears === 10 || ev.clears === 50) milestone(`${ev.dungeon} clears`, ev.clears); }
        if (ev.type === 'dungeonFail') dungeonFails++;
        if (ev.type === 'titan') { titanTries++; if (ev.won) milestone('titan kill', S.titan.kills); }
    }
    if (S.combat.bestStage > lastMaxStage) { lastMaxStage = S.combat.bestStage; lastStageGainAt = now; }
    if (task.kind === 'combat' && !S.combat.active && S.combat.hp <= game.derived.maxHp * 0.5) needTraining = true;
    if (task.kind === 'combat' && now - lastStageGainAt > 15 * 60000) needTraining = true;

    if (now % (5 * 60000) < STEP) { tendFarm(); buildObstacles(); }
    if (now >= totalMs / 2 && !steady) steady = { earned: S.stats.goldEarned, spent: S.stats.goldSpent };
    if (task.kind === 'combat' && now % 60000 < STEP) buyCamp();
    if (task.kind === 'farm' && !task.stage && !S.combat.active && S.combat.hp >= game.derived.maxHp * 0.9) game.enterCombat();
    if (task.kind === 'farm' && now % 60000 < STEP) buyCamp();
    // The Titan: a sensible player tries it whenever it is awake (it only costs a minute).
    if (!NO_TITAN && game.titanReady() && S.combat.mode === 'stages') {
        game.challengeTitan();
        // Leaving a ladder farm for the Titan ends the farm too (or the hero farms that stage for good).
        if (task.kind === 'farm' && task.stage) game.setFarmMode(false);
        if (task.kind !== 'combat') task = combatTask();
    }
    if (S.combat.mode === 'titan') continue;
    if (taskDone(task) || (task.kind !== 'dungeon' && task.kind !== 'farm' && now - lastDecision > 10 * 60000)) {
        task = apply(decide());
        lastDecision = now;
        if (VERBOSE) console.log(`  [${fmtH(now)}] -> ${task.why}`);
    }
    for (const m of STAGE_MARKS) if (S.combat.bestStage >= m) milestone('stage', m);
    for (const d of DUNGEONS) if (S.combat.bestStage >= d.unlockStage) milestone('dungeon opens', d.id);
    if (S.equipped.Weapon) milestone('weapon tier', S.equipped.Weapon.tier);
    for (const id of ['mining', 'smithing', 'woodcutting', 'hunting', 'cooking', 'combat', 'farming', 'agility']) for (const m of LEVEL_MARKS) if (lvl(id) >= m) milestone(`${id} lv`, m);
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
console.log(`Dungeons: ${DUNGEONS.map(d => `${d.name} ${S.dungeons[d.id].clears} clears/${S.dungeons[d.id].fragments} frags`).join('; ')}; ${dungeonFails} failed runs. Titan: ${S.titan.kills} kills in ${titanTries} tries. Pets: ${Object.keys(S.pets).join(', ') || 'none'}`);
const spentRatio = (e, sp) => (e > 0 ? `${Math.round(100 * sp / e)}%` : 'n/a');
const lostToPrestige = S.stats.goldEarned - S.stats.goldSpent - S.gold;
console.log(`Gold spent by sink: ${Object.entries(spentOn).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${spentRatio(S.stats.goldEarned, v)}`).join(', ')}; left at prestige ${spentRatio(S.stats.goldEarned, lostToPrestige)}.`);
console.log(`Gold sinks: ${spentRatio(S.stats.goldEarned, S.stats.goldSpent)} of all gold earned was spent; second half: ${steady ? spentRatio(S.stats.goldEarned - steady.earned, S.stats.goldSpent - steady.spent) : 'n/a'}. Agility: ${S.agility.built.filter(Boolean).length}/6 obstacles, level ${lvl('agility')}. Farming level ${lvl('farming')}, ${S.stats.cropsHarvested} crops.`);
if (VERBOSE) for (const d of DUNGEONS) {
    const p = dungeonPreview(game.derived, d);
    console.log(`  ${d.name}: boss ${p.bossFight.killSeconds.toFixed(1)} s to kill / ${p.bossFight.surviveSeconds.toFixed(1)} s to survive; last elite ${p.eliteFight.killSeconds.toFixed(1)} / ${p.eliteFight.surviveSeconds.toFixed(1)} s`);
}
console.log(`\nFinal: best stage ${S.combat.bestStage}, ${S.prestige.count} prestiges, ${S.prestige.tokens} tokens (+${game.derived.tokenPowerPct}% power), kills ${S.stats.kills}, deaths ${S.stats.deaths}, gold earned ${Math.round(S.stats.goldEarned).toLocaleString()}`);
console.log(`Gear: ${EQUIP_SLOTS.map(s => S.equipped[s] ? `${s}:${S.equipped[s].name}${S.equipped[s].upgrade ? '+' + S.equipped[s].upgrade : ''}` : null).filter(Boolean).join(', ')}`);
console.log(`Achievements: ${Object.keys(S.achievements).length}; perks: ${Object.entries(S.perks).filter(([, v]) => v).map(([k, v]) => `${k}${v}`).join(' ')}`);
