// Items: every material, food and potion, each with what it is, where it comes from and what it is for
// (lib/xref.mjs), and the Food and Potions pages.

import { RESOURCES, sellValue, foodsByHealing } from '../../src/data/resources.js';
import { POTIONS, POTION_KINDS, POTION_MINUTES, TIERS, doseWords, potionEffectText, potionLevel } from '../../src/data/potions.js';
import { SKILLS } from '../../src/data/skills.js';
import { GEM_TIERS, METALS, JEWEL_BARS, TOOLS, ANVIL_LEVEL_PER_UPGRADE } from '../../src/data/workshop.js';
import { GEAR_TIERS } from '../../src/data/items.js';
import { CHEST_MATERIAL_ROLLS, CHEST_GEM_CHANCE } from '../../src/data/dungeons.js';
import { BALANCE } from '../../src/core/formulas.js';
import { BASE } from '../../src/core/modifiers.js';
import { BAIT_EXTRA_CHANCE } from '../../src/systems/skilling.js';
import { buildXref, actionRow, ACTION_HEAD, fmtLand, voidstoneText, gemChances, skillLink, actionAnchor, harvestXp, titanLeaves } from '../lib/xref.mjs';
import { path, res, resList, resIcon, icon, link, table, infobox, section, tiles, navbox, fmt, pct, time, esc, callout } from '../lib/ui.mjs';

const sec = { section: 'Items', sectionPath: '/items' };
export const CATEGORIES = [
    ['ore', 'Ores', 'Mined in Mining, and dropped in the fight. Smelted into bars.'],
    ['bar', 'Bars', 'Smelted in Smithing. Copper bars forge the first gear; every metal works gear at the anvil; silver and gold set jewellery.'],
    ['gem', 'Gems', 'Found while mining, dropped by monsters and in chests. Set into jewellery in Crafting.'],
    ['log', 'Logs', 'Cut in Woodcutting. Burnt in Cooking (each dish its own kind) and Firemaking; tool handles and bows.'],
    ['raw', 'Raw food', 'Hunted, fished and dropped. Cooked into food.'],
    ['food', 'Food', 'Cooked in Cooking. Your hero eats it in a fight.'],
    ['crop', 'Crops', 'Grown on the farm. Cooked into dishes.'],
    ['herb', 'Herbs', 'Foraged in Alchemy, grown on the farm, dropped in the fight. Brewed into potions.'],
    ['potion', 'Potions', `Brewed in Alchemy: combat, dungeon and skill potions, ${TIERS.length} tiers of each.`],
    ['material', 'Combat materials', 'Dropped in the fight: essence for upgrades, bait for the river.']
];
const catName = id => CATEGORIES.find(c => c[0] === id)?.[1] || id;
const catAnchor = id => catName(id).toLowerCase().replace(/\s+/g, '-');

let X = null;
const xref = () => (X ||= buildXref());

/** One line about an item, made from where it comes from and what it is for. */
function lead(r) {
    const s = xref().sources[r.id] || {};
    const gathered = (s.actions || []).filter(a => !Object.keys(a.needs || {}).length).map(a => `${SKILLS[a.skill].name} (level ${a.action.levelReq})`);
    const made = (s.actions || []).filter(a => Object.keys(a.needs || {}).length).map(a => `${SKILLS[a.skill].name} (level ${a.action.levelReq})`);
    const parts = [];
    if (gathered.length) parts.push(`gathered in ${[...new Set(gathered)].join(', ')}`);
    if (made.length) parts.push(`made in ${[...new Set(made)].join(', ')}`);
    if (s.farming) parts.push('grown on the farm');
    if (s.lands) parts.push(`dropped in ${s.lands.length === 1 ? 'one land' : `${s.lands.length} lands`}`);
    if (s.essence) parts.push('left by monsters and dungeon chests', 'salvaged from gear');
    if (s.gems) parts.push(s.gems.some(g => g.kind === 'mining') ? 'found while mining and in the fight' : 'found in the fight');
    if (s.shop) parts.push('sold in the Shop');
    if (parts.length > 1) parts.push(`and ${parts.pop()}`);
    const what = r.desc && r.category !== 'potion' ? `${esc(r.desc)}. ` : '';   // a potion's says what it gives, below
    return `${what}${esc(r.name)} ${r.category === 'food' ? `heals ${pct(r.heal, 0)} of your hero's health. It is ` : r.category === 'potion' ? `gives ${esc(r.desc || '')}. It is ` : 'is '}${parts.length ? parts.join(parts.length > 2 ? ', ' : ' ') : 'found in the fight'}.`;
}

function sourcesHtml(r) {
    const s = xref().sources[r.id] || {};
    const out = [];
    if (s.actions) out.push(section('Gathered and made', table(ACTION_HEAD, s.actions.map(a => actionRow(a)))));
    if (s.farming) {
        out.push(section('Grown', table(['Crop', 'Farming level #', 'Grows in #', 'Harvest', 'XP a harvest #', 'Seeds #'],
            s.farming.map(({ crop: c }) => [link(`${path.skill('farming')}#crop-${c.id}`, esc(c.name)), c.levelReq, time(c.growMs), `${c.yield[0]}–${c.yield[1]}`, fmt(Math.round(harvestXp(c))), `${fmt(c.seedGold)} gold`]))));
    }
    if (s.lands) {
        out.push(section('Dropped in the fight', `<p>A monster leaves a material ${pct(BALANCE.rewards.materialDropChance, 0)} of the time (more with drop chance bonuses), and a boss on its first fall always does. In these lands, ${esc(r.name)} is this share of the materials:</p>`
            + table(['Land', 'Share of drops #', 'Chance a kill #', 'Each drop #'], s.lands.map(d => [fmtLand(d), pct(d.share), pct(d.share * BALANCE.rewards.materialDropChance), `${d.qty}`]))));
    }
    if (s.chests) {
        const rows = s.chests.map(c => [link(path.dungeon(c.dungeon.id), esc(c.dungeon.name), `mon/${c.dungeon.boss.name}`), c.gem ? `the chest's gem, ${pct(CHEST_GEM_CHANCE, 0)} of the time` : `${pct(c.share)} of each of ${CHEST_MATERIAL_ROLLS} picks`, c.gem ? '1' : `${c.qty}`]);
        out.push(section('Dungeon chests', table(['Dungeon', 'Chance', 'Amount #'], rows)));
    }
    if (s.gems) {
        const lands = (list, last = ', ') => list.map(z => link(path.zone(z.id), esc(z.name))).join(', ').replace(/, (?!.*, )/, last);
        const lines = s.gems.map(g => g.kind === 'mining'
            ? `<li><strong>While mining</strong>: each ore has a ${pct(gemChances.mining, 0)} chance of a gem, of a tier near the rock's: ${g.rocks.map(n => res(n.produces)).join(', ')}.</li>`
            : g.kind === 'monsters'
                ? `<li><strong>From monsters</strong>: each kill has a ${pct(gemChances.monster, 0)} chance of a gem (a boss's first fall ten times that), of a tier near the land's: ${lands(g.lands)}.</li>`
                : `<li><strong>The deep Abyss</strong>: ${voidstoneText}</li>`);
        for (const c of s.crate || []) {
            const when = [c.lands.length ? `one in every crate while your best stage is in ${lands(c.lands, ' or ')}` : '', c.great.length ? `one more in a great crate while it is in ${lands(c.great, ' or ')}` : ''].filter(Boolean).join('; ');
            lines.push(`<li><strong>The ${link('/daily-crate', 'daily crate')}</strong>: ${when}.</li>`);
        }
        for (const t of s.titan || []) lines.push(`<li><strong>${link('/titan', 'The Titan')}</strong>: ${t.qty} when Titan ${t.from}${t.to === null ? ' or any after it' : t.to > t.from ? `${t.to === t.from + 1 ? ' or' : ' to'} ${t.to}` : ''} falls.</li>`);
        out.push(section('Found', `<ul>${lines.join('')}</ul>`));
    }
    if (s.essence) {
        const rw = BALANCE.rewards;
        out.push(section('Found', `<ul>
            <li><strong>Monsters</strong>: ${pct(rw.essenceDropChance, 0)} of kills leave 1–2; a boss's first fall leaves ${rw.bossEssence[0]}–${rw.bossEssence[1]} and a gilded monster ${rw.gildedEssence[0]}–${rw.gildedEssence[1]}, each times half the land's tier.</li>
            <li><strong>Salvaging</strong> gear you don't need (see [[Equipment]]).</li>
            <li><strong>${link('/titan', 'The Titan')}</strong>: ${titanLeaves(1).essence} when the first falls, more for each after it, and some for the damage dealt when it stands.</li>
            <li><strong>Dungeon chests</strong>, the <strong>daily crate</strong>, the <strong>Shop</strong> and the <strong>weekend events</strong>.</li></ul>`.replace('[[Equipment]]', link('/equipment', 'Equipment'))));
    }
    if (s.shop) out.push(section('Bought', table(['Supply', 'Gives #', 'Price'], s.shop.map(({ entry: e, qty }) => [link('/shop', esc(e.name)), fmt(qty), `${e.costKills} kills' worth of gold at your run's furthest stage`]))));
    if (s.events) {
        out.push(section('Weekend events', `<ul>${s.events.map(e => (e.entry ? `<li>The event shop: ${esc(e.entry.name)}, ${fmt(e.qty)} for ${e.entry.cost} festival tokens.</li>` : `<li>The ${e.milestone.tokens}-token milestone of every event: ${fmt(e.qty)}.</li>`)).join('')}</ul><p>${link('/events', 'Weekend events')}</p>`));
    }
    if (s.lands) out.push(`<p class="muted">The ${link('/daily-crate', 'daily crate')} also holds materials of the land where your best stage is.</p>`);
    return out.join('\n');
}

function usesHtml(r) {
    const u = xref().uses[r.id] || {};
    const out = [];
    if (u.actions) {
        // how many of this one action takes, and what it makes (a log burnt makes bonfire time)
        const makes = a => (a.produces ? res(a.produces) : a.bonfireLog ? `${BASE.bonfireSecondsPerLogTier * RESOURCES[a.bonfireLog].tier} s of bonfire` : '–');
        const rows = u.actions.map(a => [...actionRow(a, { show: 'makes' }).slice(0, 6), a.takes, makes(a.action)]);
        out.push(section('Used to make', table(['Action', 'Skill', 'Level #', 'Time #', 'XP #', 'XP/hour #', 'Takes #', 'Makes'], rows, { wide: true })));
    }
    if (u.burn) out.push(section('Burned', `<p>${skillLink('firemaking')}: burning one gives ${fmt(u.burn[0].action.xp)} XP (level ${u.burn[0].action.levelReq}) and keeps the bonfire lit ${BASE.bonfireSecondsPerLogTier * r.tier} seconds longer (${BASE.bonfireSecondsPerLogTier} seconds a tier).</p>`));
    if (u.anvil) {
        const m = u.anvil[0].metal;
        const tiers = GEAR_TIERS.filter(t => Math.min(METALS.length, t.tier) === m.tier);
        out.push(section('At the anvil', `<p>${skillLink('smithing', 'the-anvil')}: ${esc(r.name)}s reinforce and reroll ${tiers.map(t => link(path.tier(t.name), `${t.name} gear`)).join(' and ')}${m.tier === METALS.length ? ' (Dragonbone takes twice as many bars, Abyssal three times)' : ''}. The anvil opens at Smithing ${ANVIL_LEVEL_PER_UPGRADE}.</p>`));
    }
    if (u.jewellery) {
        const j = u.jewellery[0];
        out.push(section('Jewellery', j.bar
            ? `<p>${link('/equipment/jewellery', 'Jewellery')}: a ${esc(j.bar.name.toLowerCase())} setting, from Crafting ${j.bar.levelReq}${j.bar.powerMult > 1 ? `, adds ${pct(j.bar.powerMult - 1, 0)} to the piece's power` : ''}.</p>`
            : `<p>${link('/equipment/jewellery', 'Jewellery')}: set into a ring, earring or amulet from Crafting ${j.gem.levelReq} (${fmt(j.gem.xp)} XP each). The gem decides the piece's tier and power.</p>`));
    }
    if (u.tools) out.push(section('Tools', `<p>Bought in the ${link('/shop', 'Shop')}.</p>` + table(['Tool', 'For', 'Level #', 'Costs'], u.tools.map(t => [link(`/tools#${t.toolId}`, esc(t.tier.name), `tool/${t.toolId}`), skillLink(t.tool.skill), t.tier.levelReq, resList(t.tier.consumes)]))));
    if (u.agility) out.push(section('Agility', table(['Obstacle slot', 'Agility level #', 'Needs'], u.agility.map(a => [link(`${path.skill('agility')}#slot-${a.slot + 1}`, `Slot ${a.slot + 1}`), a.s.levelReq, `${fmt(a.s.costGold)} gold, ${resList(a.s.materials)}`]))));
    if (r.category === 'food') out.push(section('Eaten', `<p>Your hero eats food in a fight when health falls below the auto-eat line: ${esc(r.name)} heals ${pct(r.heal, 0)} of his max health. See ${link('/food', 'Food')}.</p>`));
    if (POTIONS[r.id]) out.push(section('Drunk', `<p>${potionWhere(r.id)}, it gives ${potionEffectText(r.id)}${POTIONS[r.id].kind === 'combat' ? ` (in a dungeon run, picked there: ${potionEffectText(r.id, 'dungeon')})` : ''}, for ${POTION_MINUTES} minutes of ${POTIONS[r.id].kind === 'skill' ? 'work' : 'fighting'} a bottle. See ${link('/potions', 'Potions')}.</p>`));
    if (r.id === 'essence') out.push(section('Used for', `<ul><li>Reinforcing and rerolling weapons and armour at the anvil (${link('/skills/smithing#the-anvil', 'Smithing')}).</li><li>Upgrading jewellery and reforging its bonuses (${link('/equipment', 'Equipment')}).</li></ul>`));
    if (r.id === 'fishing_bait') out.push(section('Used for', `<p>Each catch at a river spot in ${skillLink('hunting')} uses one bait, if you have any, for a ${pct(BAIT_EXTRA_CHANCE, 0)} chance of a second fish.</p>`));
    return out.join('\n');
}

function itemPage(r) {
    const s = xref().sources[r.id] || {};
    const madeBy = [...new Set((s.actions || []).map(a => a.skill))].map(id => skillLink(id));
    const gem = GEM_TIERS.find(g => g.gem === r.id);
    const metal = METALS.find(m => m.bar === r.id);
    const jewelBar = JEWEL_BARS.find(b => b.bar === r.id);
    const sameKind = Object.values(RESOURCES).filter(x => x.category === r.category);
    return {
        infobox: infobox({
            title: esc(r.name),
            image: resIcon(r.id, { scale: 3 }),
            rows: [
                ['Kind', link(`/items#${catAnchor(r.category)}`, catName(r.category))],
                ['Tier', r.tier],
                r.heal ? ['Heals', `${pct(r.heal, 0)} of max health`] : null,
                POTIONS[r.id] ? ['Effect', `${potionEffectText(r.id)}, ${POTION_MINUTES} min`] : null,
                gem ? ['Jewellery', `Crafting ${gem.levelReq}`] : null,
                metal ? ['Gear', `${metal.name}, Smithing ${metal.levelReq}`] : null,
                jewelBar ? ['Jewellery', `${jewelBar.name} settings, Crafting ${jewelBar.levelReq}`] : null,
                madeBy.length ? ['Made in', madeBy.join(', ')] : null,
                ['Sells for', sellValue(r.id) ? `${icon('gold', 0.5, 'soft res-spr')} ${fmt(sellValue(r.id))} gold` : 'cannot be sold']
            ]
        }),
        lead: lead(r),
        body: `${sourcesHtml(r) ? `<h2 id="sources">Where it comes from</h2>${sourcesHtml(r).replace(/<h2 /g, '<h3 ').replace(/<\/h2>/g, '</h3>')}` : ''}
            ${usesHtml(r) ? `<h2 id="uses">What it is for</h2>${usesHtml(r).replace(/<h2 /g, '<h3 ').replace(/<\/h2>/g, '</h3>')}` : ''}`,
        navbox: navbox(catName(r.category), sameKind.map(x => link(path.item(x.id), esc(x.name), `res/${x.id}`)))
    };
}

function indexPage(help) {
    const body = CATEGORIES.map(([id, name, text]) => {
        const list = Object.values(RESOURCES).filter(r => r.category === id).sort((a, b) => a.tier - b.tier);
        return section(name, `<p>${text}</p>${tiles(list.map(r => ({ href: path.item(r.id), title: esc(r.name), pic: resIcon(r.id, { scale: 1.5 }), note: r.heal ? `heals ${pct(r.heal, 0)}` : `tier ${r.tier}` })), 'small')}`, { id: catAnchor(id) });
    }).join('\n');
    return { body: `${help.prose('/items')}\n${body}\n${section('Gear', `<p>Weapons, armour and jewellery are not stacked like these: see ${link('/equipment', 'Equipment')}, ${link('/equipment/jewellery', 'Jewellery')}, ${link('/uniques', 'Unique items')} and ${link('/tools', 'Tools')}.</p>`)}` };
}

function foodPage(help) {
    const cooked = foodsByHealing().map(r => {
        const made = (xref().sources[r.id]?.actions || [])[0];
        return [res(r.id), pct(r.heal, 0), made ? `${skillLink(made.skill)} ${made.action.levelReq}` : '–', made ? resList(made.needs) : '–'];
    });
    return {
        body: `${help.prose('/food')}\n${section('Every food', table(['Food', 'Heals (of max health)', 'Cooked at', 'From'], cooked))}`,
        infobox: infobox({ title: 'Food', image: resIcon('cooked_boar', { scale: 3 }), rows: [['Eats below', `${pct(BASE.baseAutoEatThreshold, 0)} health`], ['Made in', skillLink('cooking')]] })
    };
}

/** Where a potion is picked (data/potions.js): its kind's place. */
const potionWhere = id => ({ combat: 'Picked on the Combat or Clan tab, or in the fight\'s dock', dungeon: 'Picked on the Dungeons tab, or in a run\'s dock', skill: 'Picked on a skill\'s tab' })[POTIONS[id].kind];

function potionsPage(help) {
    const rows = Object.values(RESOURCES).filter(r => r.category === 'potion').sort((a, b) => potionLevel(a.id) - potionLevel(b.id)).map(r => {
        const made = xref().sources[r.id]?.actions?.[0];
        return [res(r.id), POTION_KINDS[POTIONS[r.id].kind].name.replace(' Potion', ''), potionEffectText(r.id), made ? made.action.levelReq : '–', made ? resList(made.needs) : '–', fmt(made?.action.xp || 0)];
    });
    return {
        body: `${help.prose('/potions')}\n${section('Every potion', table(['Potion', 'Kind', 'Effect', 'Alchemy level #', 'Brewed from', 'XP #'], rows))}`,
        infobox: infobox({ title: 'Potions', image: resIcon('combat_potion_3', { scale: 3 }), rows: [['A bottle lasts', `${doseWords()} of its work`], ['Brewed in', skillLink('alchemy')]] })
    };
}

export default {
    pages: () => [
        { path: '/items', title: 'Items', ...sec, icon: 'res/copper_ore', summary: 'Every material, food and potion in Fantasy Idle, with where it comes from and what it is for.', aliases: ['Resources', 'Materials', 'Bank'], build: indexPage },
        ...Object.values(RESOURCES).map(r => ({
            path: path.item(r.id), title: r.name, ...sec, icon: `res/${r.id}`,
            summary: `${r.name}: where it comes from and what it is for in Fantasy Idle.`,
            keywords: [catName(r.category), r.category],
            build: () => itemPage(r)
        })),
        { path: '/food', title: 'Food', ...sec, icon: 'res/cooked_boar', summary: 'Food, healing and auto-eat in Fantasy Idle.', aliases: ['Healing', 'Auto-eat'], build: foodPage },
        { path: '/potions', title: 'Potions', ...sec, icon: 'res/combat_potion_3', summary: 'Combat, dungeon and skill potions, their tiers and what they do.', build: potionsPage }
    ]
};
