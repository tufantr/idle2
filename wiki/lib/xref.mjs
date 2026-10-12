// Where every item comes from and what it is for, worked out from the data once: the skill actions that
// make or gather it, the recipes that take it, the lands and chests that drop it, the shops that sell it.
// Each entry is a row for a table on the item's page.

import { RESOURCES } from '../../src/data/resources.js';
import { SKILLS } from '../../src/data/skills.js';
import { SMELTING_RECIPES, TOOLS, METALS, GEM_TIERS, JEWEL_BARS, VOIDSTONE_DEPTH, VOIDSTONE_CHANCE } from '../../src/data/workshop.js';
import { ZONES, STAGES_PER_ZONE, GEM_DROP_TABLE, abyssGearTier } from '../../src/data/zones.js';
import { DUNGEONS } from '../../src/data/dungeons.js';
import { CROPS } from '../../src/data/farming.js';
import { AGILITY_SLOTS } from '../../src/data/agility.js';
import { GOLD_SHOP } from '../../src/data/perks.js';
import { EVENT_SHOP, EVENT_MILESTONES } from '../../src/data/events.js';
import { GEAR_TIERS, MAX_GEAR_TIER, DROP_TIER_OFFSETS } from '../../src/data/items.js';
import { BALANCE, goldPerKillAtStage } from '../../src/core/formulas.js';
import { zoneForStage } from '../../src/data/zones.js';
import { GEM_FIND_CHANCE } from '../../src/systems/skilling.js';
import { titanEnemy, endTitan } from '../../src/systems/dungeon.js';
import { Game } from '../../src/game.js';
import { path, pct, time, fmt, res, resList, link, esc } from './ui.mjs';
import { skillIcon } from '../pages/nav.mjs';

const skillLink = (id, anchor = '') => link(`${path.skill(id)}${anchor ? `#${anchor}` : ''}`, esc(SKILLS[id].name), skillIcon(id));
export const actionAnchor = id => `action-${id.replace(/_/g, '-')}`;

/** The XP an average harvest of a crop pays: every crop harvested pays the crop's XP (systems/farming.js). */
export const harvestXp = c => c.xp * (c.yield[0] + c.yield[1]) / 2;

// ---------- gear: which tier drops where ----------

/**
 * The share of a place's gear drops that is of `tier`, where the place's gear tier is `gearTier`: a drop is
 * of the place's tier moved by an offset, and kept within the tiers (core/formulas.js generateDrop).
 */
export function tierShare(gearTier, tier) {
    const total = DROP_TIER_OFFSETS.reduce((s, o) => s + o.weight, 0);
    return DROP_TIER_OFFSETS.filter(o => Math.max(1, Math.min(MAX_GEAR_TIER, gearTier + o.offset)) === tier).reduce((s, o) => s + o.weight, 0) / total;
}

/** The tiers a place of gear tier `gearTier` drops, with their shares: [{ tier, share }], the lowest first. */
export const tierShares = gearTier => GEAR_TIERS.map(t => ({ tier: t.tier, share: tierShare(gearTier, t.tier) })).filter(x => x.share > 0);

/** Stages `from` to `to` in runs of one gear tier (the Abyss's rises with its depth): [{ from, to, gearTier }]. */
export function gearBands(from, to) {
    const bands = [];
    for (let stage = from; stage <= to; stage++) {
        const gearTier = zoneForStage(stage).gearTier;
        const last = bands[bands.length - 1];
        if (last && last.gearTier === gearTier) last.to = stage;
        else bands.push({ from: stage, to: stage, gearTier });
    }
    return bands;
}

/** The Abyss's depths in runs of one gear tier: [{ from, to (null: on for ever), gearTier }], depth 1 first. */
export const ABYSS_BANDS = (() => {
    const bands = [];
    for (let depth = 1; depth <= 20; depth++) {
        const gearTier = abyssGearTier(depth);
        const last = bands[bands.length - 1];
        if (last && last.gearTier === gearTier) last.to = depth;
        else bands.push({ from: depth, to: depth, gearTier });
    }
    bands[bands.length - 1].to = null;   // the last tier goes on for ever
    return bands;
})();

// ---------- the Titan ----------

export const TITANS_SHOWN = 30;
const titanCache = new Map();
/**
 * What felling Titan `level` leaves besides its lasting bonus, worked out by the game itself (systems/
 * dungeon.js endTitan, for a hero whose best stage is 1): { essence, gems: [[id, qty]], goldKills }. Its
 * kill also pays as a boss's first fall (gold, XP and loot), not counted here.
 */
export function titanLeaves(level) {
    if (titanCache.has(level)) return titanCache.get(level);
    const game = new Game(null, Date.UTC(2026, 0, 6));
    const s = game.state;
    s.titan.kills = level - 1;
    s.combat.mode = 'titan';
    s.combat.enemy = { ...titanEnemy(s), hp: 0 };
    const before = { ...s.resources, gold: s.gold };
    endTitan(game, true);
    const gained = id => (s.resources[id] || 0) - (before[id] || 0);
    const out = {
        essence: gained('essence'),
        gems: Object.keys(s.resources).filter(id => RESOURCES[id]?.category === 'gem' && gained(id) > 0).map(id => [id, gained(id)]),
        goldKills: Math.round((s.gold - before.gold) / goldPerKillAtStage(s.combat.bestStage, game.derived.goldMult))
    };
    titanCache.set(level, out);
    return out;
}

/** The lands (and the Abyss) that drop `id`, with its share of a land's material drops. */
function landDrops(id) {
    const rows = [];
    ZONES.forEach((z, i) => {
        const total = z.loot.reduce((s, l) => s + l.weight, 0);
        const entry = z.loot.find(l => l.id === id);
        if (!entry) return;
        const from = i * STAGES_PER_ZONE + 1;
        const to = z.id === 'abyss' ? null : from + STAGES_PER_ZONE - 1;
        rows.push({ zone: z, from, to, share: entry.weight / total, qty: 1 + Math.floor(z.tier / 3) });
    });
    return rows;
}

export function buildXref() {
    const sources = {};
    const uses = {};
    const add = (map, id, group, row) => { ((map[id] ||= {})[group] ||= []).push(row); };

    // ---------- skill actions ----------
    for (const [skillId, skill] of Object.entries(SKILLS)) {
        for (const node of skill.nodes) {
            const needs = { ...(node.consumes || {}) };
            const row = { skill: skillId, action: node, needs, fuel: !!node.fuel };
            if (node.produces) add(sources, node.produces, 'actions', row);
            for (const id of Object.keys(needs)) add(uses, id, 'actions', { ...row, takes: needs[id] });
            if (node.bonfireLog) add(uses, node.bonfireLog, 'burn', row);
        }
    }
    for (const r of SMELTING_RECIPES) {
        const row = { skill: 'smithing', action: { ...r, name: `Smelt ${r.name}` }, needs: r.consumes };
        add(sources, r.produces, 'actions', row);
        for (const id of Object.keys(r.consumes)) add(uses, id, 'actions', { ...row, takes: r.consumes[id] });
    }
    for (const c of CROPS) add(sources, c.produces, 'farming', { crop: c });
    // logs are the kitchen's fuel: every dish burns one, the lowest kind first
    for (const r of Object.values(RESOURCES).filter(r => r.category === 'log')) add(uses, r.id, 'fuel', {});
    // tools
    for (const [toolId, tool] of Object.entries(TOOLS)) {
        for (const t of tool.tiers) for (const [id, qty] of Object.entries(t.consumes)) add(uses, id, 'tools', { toolId, tool, tier: t, takes: qty });
    }
    // bars: the copper set is forged; every metal works its gear at the anvil; precious bars set jewellery
    add(uses, 'copper_bar', 'forge', {});
    for (const m of METALS) add(uses, m.bar, 'anvil', { metal: m });
    for (const b of JEWEL_BARS) add(uses, b.bar, 'jewellery', { bar: b });
    for (const g of GEM_TIERS) add(uses, g.gem, 'jewellery', { gem: g });
    // agility obstacles' materials
    AGILITY_SLOTS.forEach((slot, i) => { for (const [id, qty] of Object.entries(slot.materials)) add(uses, id, 'agility', { slot: i, s: slot, takes: qty }); });

    // ---------- the fight ----------
    for (const id of Object.keys(RESOURCES)) for (const d of landDrops(id)) add(sources, id, 'lands', d);
    for (const d of DUNGEONS) {
        const zone = zoneForStage(d.stage);
        const total = zone.loot.reduce((s, l) => s + l.weight, 0);
        for (const l of zone.loot) add(sources, l.id, 'chests', { dungeon: d, share: l.weight / total, qty: 1 + Math.floor(zone.tier / 3) });
        const gem = [...GEM_DROP_TABLE].reverse().find(g => g.tier <= zone.tier) || GEM_DROP_TABLE[0];
        add(sources, gem.id, 'chests', { dungeon: d, gem: true });
    }
    // gems: from rocks of a nearby tier while mining, from monsters of a nearby tier, and the Voidstone
    for (const g of GEM_DROP_TABLE) {
        const rocks = SKILLS.mining.nodes.filter(n => Math.abs(RESOURCES[n.produces].tier - g.tier) <= 1);
        if (rocks.length) add(sources, g.id, 'gems', { kind: 'mining', rocks });
        const lands = ZONES.filter(z => Math.abs(z.tier - g.tier) <= 1);
        if (lands.length) add(sources, g.id, 'gems', { kind: 'monsters', lands });
    }
    add(sources, 'voidstone', 'gems', { kind: 'voidstone' });
    add(sources, 'essence', 'essence', {});
    // the daily crate's gem: the best one of the tier of the land where your best stage is, and a great crate's
    // one of the next tier up besides (systems/daily.js claimDaily)
    const crateGem = z => [...GEM_DROP_TABLE].reverse().find(g => g.tier <= z.tier) || GEM_DROP_TABLE[0];
    const greatGem = z => GEM_DROP_TABLE.find(g => g.tier > crateGem(z).tier) || crateGem(z);
    for (const g of GEM_DROP_TABLE) {
        const lands = ZONES.filter(z => crateGem(z).id === g.id);
        const great = ZONES.filter(z => greatGem(z).id === g.id && crateGem(z).id !== g.id);
        if (lands.length || great.length) add(sources, g.id, 'crate', { lands, great });
    }
    // the Titan's pair of gems, by the Titans that leave them (TITANS_SHOWN of them; the last kind goes on)
    for (let level = 1; level <= TITANS_SHOWN; level++) {
        for (const [id, qty] of titanLeaves(level).gems) {
            const rows = ((sources[id] ||= {}).titan ||= []);
            const last = rows[rows.length - 1];
            if (last && last.to === level - 1 && last.qty === qty) last.to = level;
            else rows.push({ from: level, to: level, qty });
        }
    }
    for (const rows of Object.values(sources).map(s => s.titan).filter(Boolean)) {
        const last = rows[rows.length - 1];
        if (last.to === TITANS_SHOWN) last.to = null;
    }

    // ---------- shops and events ----------
    for (const e of GOLD_SHOP) for (const [id, qty] of Object.entries(e.gives)) add(sources, id, 'shop', { entry: e, qty });
    for (const e of EVENT_SHOP) for (const [id, qty] of Object.entries(e.gives)) add(sources, id, 'events', { entry: e, qty });
    for (const m of EVENT_MILESTONES) for (const [id, qty] of Object.entries(m.reward)) add(sources, id, 'events', { milestone: m, qty });

    return { sources, uses };
}

// ---------- rows as HTML ----------

export const fmtLand = d => `${link(path.zone(d.zone.id), esc(d.zone.name), `mon/${d.zone.boss}`)}<br><small>stages ${d.from}${d.to ? `–${d.to}` : '+'}</small>`;

export function actionRow(r, { show = 'needs' } = {}) {
    const a = r.action;
    const xp = a.xp;
    const perHour = a.interval ? Math.round(xp * 3600000 / a.interval) : null;
    return [
        `${link(`${path.skill(r.skill)}#${actionAnchor(a.id)}`, esc(a.name))}`,
        skillLink(r.skill),
        a.levelReq,
        a.interval ? time(a.interval) : '–',
        fmt(xp),
        perHour !== null ? fmt(perHour) : '–',
        show === 'needs' ? (Object.keys(r.needs || {}).length ? resList(r.needs) : '<span class="muted">nothing</span>') + (r.fuel ? ' <span class="muted">+ a log</span>' : '')
            : res(a.produces || a.bonfireLog, { qty: 1 })
    ];
}

export const ACTION_HEAD = ['Action', 'Skill', 'Level #', 'Time #', 'XP #', 'XP/hour #', 'Needs'];
/** The first stage of an Abyss depth (depth 1 is stages 101–110). */
export const depthStage = depth => (ZONES.length - 1 + depth) * STAGES_PER_ZONE + 1;
export const voidstoneText = `The bosses of the Abyss from depth ${VOIDSTONE_DEPTH} (stage ${depthStage(VOIDSTONE_DEPTH)} on) leave one ${pct(VOIDSTONE_CHANCE, 0)} of the time on their first fall.`;
export const gemChances = { mining: GEM_FIND_CHANCE, monster: BALANCE.rewards.gemDropChance };
export { landDrops, skillLink };
