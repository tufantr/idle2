// Where every item comes from and what it is for, worked out from the data once: the skill actions that
// make or gather it, the recipes that take it, the lands and chests that drop it, the shops that sell it.
// Each entry is a row for a table on the item's page.

import { RESOURCES } from '../../src/data/resources.js';
import { SKILLS } from '../../src/data/skills.js';
import { SMELTING_RECIPES, TOOLS, METALS, GEM_TIERS, JEWEL_BARS, VOIDSTONE_DEPTH, VOIDSTONE_CHANCE } from '../../src/data/workshop.js';
import { ZONES, STAGES_PER_ZONE, GEM_DROP_TABLE } from '../../src/data/zones.js';
import { DUNGEONS } from '../../src/data/dungeons.js';
import { CROPS } from '../../src/data/farming.js';
import { AGILITY_SLOTS } from '../../src/data/agility.js';
import { GOLD_SHOP } from '../../src/data/perks.js';
import { EVENT_SHOP, EVENT_MILESTONES } from '../../src/data/events.js';
import { BALANCE } from '../../src/core/formulas.js';
import { zoneForStage } from '../../src/data/zones.js';
import { GEM_FIND_CHANCE } from '../../src/systems/skilling.js';
import { path, pct, time, fmt, res, resList, link, esc } from './ui.mjs';
import { skillIcon } from '../pages/nav.mjs';

const skillLink = (id, anchor = '') => link(`${path.skill(id)}${anchor ? `#${anchor}` : ''}`, esc(SKILLS[id].name), skillIcon(id));
export const actionAnchor = id => `action-${id.replace(/_/g, '-')}`;

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
