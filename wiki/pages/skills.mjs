// The skills: an index, a page for each (its actions, tools, mastery, pet, cape and medals, from the data)
// and the Tools page.

import { SKILLS, GATHERING_SKILLS, PRODUCTION_SKILLS } from '../../src/data/skills.js';
import { RESOURCES } from '../../src/data/resources.js';
import { SMITH_INTERVAL, CRAFT_INTERVAL, SMELTING_RECIPES, METALS, TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER, GEM_TIERS, JEWEL_BARS, CRAFT_SLOT_OFFSET, SMITH_SLOT_OFFSET, smithLevelReq, reinforceCost, ANVIL_LEVEL_PER_UPGRADE, ANVIL_BAR_GROWTH, ANVIL_REFUND, VOIDSTONE_DEPTH } from '../../src/data/workshop.js';
import { SMITHING_TYPES, SMITHING_BAR_COST, TYPE_NAMES, SLOT_STATS, STAT_UNIT, MAX_UPGRADE, JEWEL_POWER, CRAFT_RARITY_LEVELS, CRAFT_MAX_RARITY, RARITIES } from '../../src/data/items.js';
import { CROPS, FARMING_PLOTS } from '../../src/data/farming.js';
import { AGILITY_SLOTS, MAX_OBSTACLE_LEVEL, obstacleUpgradeGold, obstacleUpgradeLevelReq } from '../../src/data/agility.js';
import { PETS, PET_BASE, COMBAT_PET_SECONDS } from '../../src/data/pets.js';
import { CAPES } from '../../src/data/capes.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { masteryActions, MASTERY_PER_LEVEL } from '../../src/data/mastery.js';
import { GOLD_SHOP } from '../../src/data/perks.js';
import { CARD_ART } from '../../src/data/cardart.js';
import { BASE, bonfireBonus } from '../../src/core/modifiers.js';
import { XP_FOR_MAX_LEVEL } from '../../src/core/xp.js';
import { FEATURES } from '../../src/ui/features.js';
import { medalArt } from '../../src/ui/render.js';
import { SKILL_ORDER, skillIcon } from './nav.mjs';
import { actionAnchor } from '../lib/xref.mjs';
import { path, res, resList, resIcon, icon, link, table, infobox, section, tiles, navbox, fmt, pct, time, esc, heroSprite, paintStyle } from '../lib/ui.mjs';

const sec = { section: 'Skills', sectionPath: '/skills' };
const KIND = id => (GATHERING_SKILLS.includes(id) ? 'Gathering' : PRODUCTION_SKILLS.includes(id) ? 'Production' : ['smithing', 'crafting'].includes(id) ? 'Workshop' : id === 'farming' ? 'Growing' : 'Training');
const FEEDS = {
    mining: ['smithing', 'crafting', 'alchemy'], woodcutting: ['cooking', 'firemaking', 'smithing', 'crafting', 'alchemy', 'agility'], fishing: ['cooking'], hunting: ['cooking', 'alchemy'],
    cooking: ['alchemy'], firemaking: [], alchemy: [], farming: ['cooking', 'alchemy'], smithing: ['crafting', 'agility'], crafting: [], agility: []
};

const card = id => (CARD_ART.has(id) ? `<span class="card-thumb" style="background-image:url(/assets/paint/cards/${id}.webp)" aria-hidden="true"></span>` : '');
const xpHour = (xp, ms) => fmt(Math.round(xp * 3600000 / ms));
const skillLink = id => link(path.skill(id), esc(SKILLS[id].name), skillIcon(id));
const capeHero = skill => heroSprite({ equipped: {}, prestige: { count: 0 }, hero: { cape: skill }, skills: { [skill]: { xp: XP_FOR_MAX_LEVEL } } }, { scale: 2 });

/** The actions of a node skill as a table, a row per action (each with an anchor of its own). */
function actionsTable(id) {
    const nodes = [...SKILLS[id].nodes].sort((a, b) => a.levelReq - b.levelReq);
    const food = id === 'cooking';
    const head = ['Action', 'Level #', 'Time #', 'XP #', 'XP/hour #', 'Needs', 'Makes', ...(food ? ['Heals #'] : [])];
    const rows = nodes.map(n => {
        const makes = n.produces ? res(n.produces) : n.bonfireLog ? `${BASE.bonfireSecondsPerLogTier * RESOURCES[n.bonfireLog].tier} s of bonfire` : '–';
        const needs = Object.keys(n.consumes || {}).length ? resList(n.consumes) : '<span class="muted">nothing</span>';
        return [`<span id="${actionAnchor(n.id)}" class="act">${card(n.id)}<span>${esc(n.name)}</span></span>`, n.levelReq, time(n.interval), fmt(n.xp), xpHour(n.xp, n.interval),
            `${needs}${n.fuel ? ' <span class="muted">+ a log</span>' : ''}`, makes, ...(food ? [fmt(RESOURCES[n.produces]?.heals || 0)] : [])];
    });
    return table(head, rows, { cls: 'actions' });
}

function toolsFor(skillId) {
    const out = [];
    for (const [toolId, tool] of Object.entries(TOOLS)) {
        if (tool.skill !== skillId && tool.madeBy !== skillId) continue;
        const rows = tool.tiers.map(t => [link(`/tools#${toolId}`, esc(t.name), `tool/${toolId}`), `${esc(SKILLS[tool.madeBy].name)} ${t.levelReq}`, resList(t.consumes), `+${pct(TOOL_SPEED_PER_TIER * t.tier, 0)}`, `+${pct(TOOL_DOUBLE_PER_TIER * t.tier, 0)}`]);
        const title = tool.skill === skillId ? `Tool: ${tool.name.toLowerCase()}` : `Tools made here: ${tool.name.toLowerCase()}s`;
        out.push(section(title, `<p>${tool.skill === skillId ? `A ${tool.name.toLowerCase()} makes ${esc(SKILLS[skillId].name)} faster and doubles the yield now and then; a better one replaces the old. It is made in ${skillLink(tool.madeBy)}.` : `${tool.name}s for ${skillLink(tool.skill)}.`}</p>`
            + table(['Tool', 'Made at', 'Needs', 'Speed #', 'Double chance #'], rows), { id: `tool-${toolId}` }));
    }
    return out.join('\n');
}

function masterySection(id) {
    const actions = masteryActions(id);
    if (!actions.length) return '';
    const produces = ['mining', 'woodcutting', 'fishing', 'hunting', 'cooking', 'alchemy', 'firemaking', 'smithing'].includes(id);
    const recipes = ['cooking', 'alchemy', 'firemaking', 'smithing'].includes(id);
    return section('Mastery', `<p>Each of the ${actions.length} actions below has its own ${link('/mastery', 'mastery')}, from 1 to 99, earned by doing it. Every level adds ${pct(MASTERY_PER_LEVEL.speed, 1)} speed${produces ? `, ${pct(MASTERY_PER_LEVEL.double, 2)} chance of a double` : ''}${recipes ? ` and ${pct(MASTERY_PER_LEVEL.preserve, 1)} chance to keep the ingredients` : ''}.</p>`
        + `<p class="chips">${actions.map(a => `<span class="chip">${esc(a.name)} <small>${a.levelReq}</small></span>`).join('')}</p>`);
}

function petSection(id) {
    const pet = PETS.find(p => p.skill === id);
    if (!pet) return '';
    const hours = level => fmt(Math.round(PET_BASE / level / 3600));
    const when = id === 'farming'
        ? `A pet finds you as you harvest: each harvest's chance is its crop's growing time in seconds × your Farming level ÷ ${fmt(PET_BASE)}, so slow crops are likelier.`
        : `A pet finds you while you train: on average after ${hours(50)} hours of ${esc(SKILLS[id].name)} at level 50, or ${hours(99)} hours at 99.`;
    return section('Pet', `<div class="feature-row">${icon(`pet/${pet.id}`, 2)}<div><p><strong>${esc(pet.name)}</strong>: ${esc(pet.desc)}, for good.</p><p>${when} See ${link('/pets', 'Pets')}.</p></div></div>`);
}

function capeSection(id) {
    const cape = CAPES.find(c => c.skill === id);
    if (!cape) return '';
    return section('Skill cape', `<div class="feature-row">${capeHero(id)}<div><p>Level 99 earns the ${esc(SKILLS[id].name)} cape: <strong>${esc(cape.perk.charAt(0).toLowerCase() + cape.perk.slice(1))}</strong>, for good. Your hero puts it on at once. See ${link('/capes', 'Skill capes')}.</p></div></div>`);
}

function medalsSection(id) {
    const list = ACHIEVEMENTS.filter(a => a.req.type === 'skillLevel' && a.req.skill === id || (id === 'smithing' || id === 'crafting') && a.id === 'artisan' || id === 'agility' && a.id === 'architect');
    if (!list.length) return '';
    return section('Medals', table(['Medal', 'For', 'Reward'], list.map(a => [`<span class="act">${medalArt(a, 1)} <a href="/medals#${a.id}">${esc(a.name)}</a></span>`, esc(a.desc), esc(a.reward)]), { sort: false }));
}


/** The level calculator (wiki.js): the skill's actions as data, XP and base time each. */
function calculator(id) {
    let list = [];
    if (SKILLS[id].nodes.length) list = SKILLS[id].nodes.map(n => ({ n: n.name, xp: n.xp, ms: n.interval, lv: n.levelReq }));
    if (id === 'smithing') list = [...SMELTING_RECIPES.map(r => ({ n: `Smelt ${r.name}`, xp: r.xp, ms: r.interval, lv: r.levelReq })),
        ...SMITHING_TYPES.map(type => ({ n: `Forge Copper ${TYPE_NAMES[type]}`, xp: METALS[0].xpPerBar * SMITHING_BAR_COST[type], ms: SMITH_INTERVAL, lv: smithLevelReq(METALS[0], type) }))];
    if (id === 'crafting') list = GEM_TIERS.map(g => ({ n: `${RESOURCES[g.gem].name} ring`, xp: g.xp, ms: CRAFT_INTERVAL, lv: g.levelReq + CRAFT_SLOT_OFFSET.Ring }));
    if (!list.length) return '';
    list.sort((a, b) => a.lv - b.lv);
    return section('Level calculator', `<div class="calc" data-actions="${esc(JSON.stringify(list))}">
        <label>From level <input class="calc-from" type="number" min="1" max="98" value="1" inputmode="numeric"></label>
        <label>To level <input class="calc-to" type="number" min="2" max="99" value="${Math.min(99, list[0].lv + 20)}" inputmode="numeric"></label>
        <label class="calc-wide">Doing <select class="calc-act"></select></label>
        <label>Speed bonus % <input class="calc-speed" type="number" min="0" max="1000" value="0" inputmode="numeric"></label>
        <output class="calc-out" aria-live="polite"></output>
    </div><p class="muted">Base XP and time; add your speed bonuses (tools, mastery, perks, Focus) for a closer figure. XP bonuses (the bonfire, Scholar) shorten it further.</p>`);
}

// ---------- the special skills ----------

function smithingSections() {
    const smelt = table(['Bar', 'Level #', 'Time #', 'XP #', 'XP/hour #', 'Needs'], SMELTING_RECIPES.map(r => [`<span id="${actionAnchor(r.id)}" class="act">${card(r.id)}${res(r.produces)}</span>`, r.levelReq, time(r.interval), fmt(r.xp), xpHour(r.xp, r.interval), resList(r.consumes)]), { cls: 'actions' });
    const copper = METALS[0];
    const forge = table(['Piece', 'Level #', 'Copper bars #', 'XP #', 'Attack #', 'Defence #'], SMITHING_TYPES.map(type => {
        const base = STAT_UNIT * RESOURCES.copper_bar.power;
        return [`<span class="act">${icon(`item/${type}/1`, 1)}<span>Copper ${esc(TYPE_NAMES[type])}</span></span>`, smithLevelReq(copper, type), SMITHING_BAR_COST[type], fmt(copper.xpPerBar * SMITHING_BAR_COST[type]), Math.round(base * SLOT_STATS[type].atk), Math.round(base * SLOT_STATS[type].def)];
    }));
    const steps = Array.from({ length: MAX_UPGRADE }, (_, i) => i + 1);
    const anvil = table(['Reinforce to', 'Smithing level #', ...SMITHING_TYPES.map(t => `${esc(TYPE_NAMES[t])} bars #`), 'Essence (× tier) #'], steps.map(n => {
        const costs = SMITHING_TYPES.map(type => reinforceCost({ type, tier: 1, upgrade: n - 1 }));
        return [`+${n}`, costs[0].level, ...costs.map(c => c.bars), Math.ceil(2 * n)];
    }), { sort: false });
    const metals = table(['Metal', 'Smelted at #', 'Works gear of', 'XP per bar #'], METALS.map(m => [res(m.bar), SMELTING_RECIPES.find(r => r.produces === m.bar)?.levelReq ?? '–', m.tier < METALS.length ? link(path.tier(m.name), `${m.name}`) : `${link(path.tier('Runite'), 'Runite')}, ${link(path.tier('Dragonbone'), 'Dragonbone')} (×2), ${link(path.tier('Abyssal'), 'Abyssal')} (×3)`, fmt(m.xpPerBar)]));
    return [
        section('Smelting', `<p>Ore (and coal, from iron on) becomes bars.</p>${smelt}`),
        section('Forging', `<p>Copper bars forge a first set of weapons and armour. Every stronger piece drops in the fight (${link('/equipment', 'Equipment')}). A forged piece rolls its quality: common to rare.</p>${forge}`),
        section('The anvil', `<p>From Smithing ${ANVIL_LEVEL_PER_UPGRADE}, the anvil works the weapons and armour you wear, with bars of the piece's own metal: <strong>reinforce</strong> it (+1 to +${MAX_UPGRADE}, each level adds to its attack and defence) or <strong>reroll</strong> its bonuses. Each step of reinforcing takes ${ANVIL_BAR_GROWTH} times the bars of the last and ${ANVIL_LEVEL_PER_UPGRADE} more Smithing levels; the essence grows with the piece's tier. Dragonbone and Abyssal pieces take runite bars, two and three times as many. Mastery of a metal takes bars off the work.</p>${anvil}<p class="muted">Bars shown for one piece; multiply the essence by the piece's tier.</p>`),
        section('Metals', `<p>Working a metal at the anvil pays its XP per bar, and grows that metal's mastery.</p>${metals}`),
        section('Salvage', `<p>A weapon or piece of armour you salvage gives bars of its metal back: one for a common piece up to five for a legendary, and ${pct(ANVIL_REFUND, 0)} of the bars reinforcing it took. A forged copper piece gives back part of what it was made from.</p>`)
    ].join('\n');
}

function craftingSections() {
    const pieces = ['Ring', 'Ear', 'Neck'];
    const rows = GEM_TIERS.map(g => {
        const gem = RESOURCES[g.gem];
        return [`<span id="${actionAnchor(`jewel_${g.gem}`)}" class="act">${res(g.gem)}</span>`, ...pieces.map(t => Math.min(99, g.levelReq + CRAFT_SLOT_OFFSET[t])), fmt(g.xp), gem.tier, fmt(Math.round(STAT_UNIT * gem.power * JEWEL_POWER * SLOT_STATS.Neck.atk))];
    });
    const jewels = table(['Gem', 'Ring #', 'Earring #', 'Amulet #', 'XP #', 'Tier #', 'Amulet attack #'], rows);
    const best = [[1, CRAFT_MAX_RARITY], ...[...CRAFT_RARITY_LEVELS].reverse()].map(([lv, r]) => `<li>From level ${lv}: up to <strong>${esc(RARITIES.find(x => x.id === r).name)}</strong></li>`).join('');
    const pouches = GOLD_SHOP.filter(e => e.craft).map(e => `<li>${link('/shop', esc(e.name))}: ${resList(e.gives)}, while Crafting is ${e.craft[0]}–${e.craft[1]}</li>`).join('');
    return [
        section('Jewellery', `<p>A ring, earring or amulet is a precious bar set with a gem: ${JEWEL_BARS.map(b => `${res(b.bar)} from level ${b.levelReq}${b.powerMult > 1 ? ` (+${pct(b.powerMult - 1, 0)} power)` : ''}`).join(', ')}. The gem sets the piece's tier and power; rings come first, amulets last. A Voidstone piece is cut to the depth of the Abyss you have reached (from depth ${VOIDSTONE_DEPTH} it grows with it).</p>${jewels}
            <p>The best quality a piece can roll rises with your level:</p><ul>${best}</ul>`, { id: 'jewellery' }),
        section('Gem pouches', `<p>So that Crafting can be trained at any point, the Shop sells the low gems for gold, one pouch at a time as your level climbs:</p><ul>${pouches}</ul>`)
    ].join('\n');
}

function farmingSections() {
    const plots = FARMING_PLOTS.map((lv, i) => `<span class="chip">Plot ${i + 1} <small>level ${lv}</small></span>`).join('');
    const rows = CROPS.map(c => [`<span id="crop-${c.id}" class="act">${card(c.id) || resIcon(c.produces, { scale: 1 })}<span>${esc(c.name)}</span></span>`, c.levelReq, time(c.growMs), `${c.yield[0]}–${c.yield[1]} ${res(c.produces, { name: true })}`, fmt(c.xp), fmt(c.seedGold), xpHour(c.xp, c.growMs)]);
    return [
        section('Plots', `<p>Plots open with your Farming level:</p><p class="chips">${plots}</p>`),
        section('Crops', `<p>Seeds are bought with gold as you plant. A crop grows on the clock, while you do anything else and while you are away.</p>${table(['Crop', 'Level #', 'Grows in #', 'Harvest', 'XP #', 'Seeds (gold) #', 'XP/hour a plot #'], rows)}`)
    ].join('\n');
}

function agilitySections() {
    const slots = AGILITY_SLOTS.map((s, i) => section(`Slot ${i + 1}`, `<p>Opens at Agility ${s.levelReq}. Building any obstacle here costs ${fmt(s.costGold)} gold and ${resList(s.materials)}.</p>`
        + table(['Obstacle', 'Bonus', 'Time #', 'XP #'], s.obstacles.map(o => [`<span id="${o.id.replace(/_/g, '-')}" class="act">${icon(`obstacle/${o.id}`, 1)} ${esc(o.name)}</span>`, esc(o.desc), time(o.interval), fmt(o.xp)]), { sort: false }), { level: 3, id: `slot-${i + 1}` })).join('\n');
    const levels = Array.from({ length: MAX_OBSTACLE_LEVEL - 1 }, (_, i) => i + 2);
    const upgrades = table(['Slot', ...levels.map(l => `Level ${l}`)], AGILITY_SLOTS.map((s, i) => [`Slot ${i + 1}`, ...levels.map(l => `${fmt(obstacleUpgradeGold(i, l - 1))} gold<br><small>Agility ${obstacleUpgradeLevelReq(i, l)}</small>`)]), { sort: false });
    return [
        section('The course', `<p>The course has ${AGILITY_SLOTS.length} slots, one obstacle in each. Every obstacle built is a bonus for good: it stays through prestige. Running the course takes as long as its obstacles together and pays their XP.</p>${slots}`),
        section('Upgrades', `<p>A built obstacle can be raised to level ${MAX_OBSTACLE_LEVEL}: its bonus counts once per level. An upgrade costs gold only, and needs Agility levels:</p>${upgrades}`)
    ].join('\n');
}

function firemakingSections() {
    const rows = [1, 25, 50, 75, 99].map(lv => [lv, `+${pct(bonfireBonus(lv), 1)}`]);
    return section('The bonfire', `<p>Every log burnt feeds the bonfire: ${BASE.bonfireSecondsPerLogTier} seconds times the log's tier, up to ${time(BASE.bonfireMaxMs)}. While it burns, every skill earns more XP, combat too:</p>${table(['Firemaking level #', 'XP bonus #'], rows, { sort: false })}`);
}

// ---------- pages ----------

function skillPage(id, help) {
    const f = FEATURES[id] || {};
    const pet = PETS.find(p => p.skill === id);
    const cape = CAPES.find(c => c.skill === id);
    const tool = Object.entries(TOOLS).find(([, t]) => t.skill === id);
    const special = { smithing: smithingSections, crafting: craftingSections, farming: farmingSections, agility: agilitySections }[id];
    const actions = SKILLS[id].nodes.length ? section('Actions', actionsTable(id), { id: 'actions' }) : '';
    return {
        infobox: infobox({
            title: esc(SKILLS[id].name),
            image: icon(skillIcon(id), 3),
            caption: esc(SKILLS[id].desc),
            rows: [
                ['Kind', KIND(id)],
                FEEDS[id]?.length ? ['Feeds', FEEDS[id].map(skillLink).join(', ')] : null,
                tool ? ['Tool', link(`/tools#${tool[0]}`, esc(tool[1].name), `tool/${tool[0]}`)] : null,
                pet ? ['Pet', link('/pets', esc(pet.name), `pet/${pet.id}`)] : null,
                cape ? ['Cape (99)', esc(cape.perk)] : null
            ]
        }),
        body: [help.prose(path.skill(id)), actions, special ? special() : '', id === 'firemaking' ? firemakingSections() : '', calculator(id), toolsFor(id), masterySection(id), petSection(id), capeSection(id), medalsSection(id)].filter(Boolean).join('\n'),
        navbox: navbox('Skills', [...SKILL_ORDER.map(s => link(path.skill(s), esc(SKILLS[s].name), skillIcon(s))), link('/combat', 'Combat', 'item/Weapon/3')])
    };
}

function indexPage(help) {
    const grid = tiles([...SKILL_ORDER.map(id => ({ href: path.skill(id), title: esc(SKILLS[id].name), pic: icon(skillIcon(id), 2), note: KIND(id), art: FEATURES[id]?.art ? paintStyle(FEATURES[id].art, FEATURES[id].focus || 'center 60%') : '' })),
        { href: '/combat', title: 'Combat', pic: icon('item/Weapon/3', 2), note: 'Fighting', art: paintStyle('meadow') }], 'painted');
    const rows = SKILL_ORDER.map(id => {
        const tool = Object.entries(TOOLS).find(([, t]) => t.skill === id);
        const pet = PETS.find(p => p.skill === id);
        return [skillLink(id), KIND(id), tool ? link(`/tools#${tool[0]}`, esc(tool[1].name), `tool/${tool[0]}`) : '–', pet ? link('/pets', esc(pet.name), `pet/${pet.id}`) : '–', esc(CAPES.find(c => c.skill === id)?.perk || '–')];
    });
    return { body: `${grid}\n${help.prose('/skills')}\n${section('At a glance', table(['Skill', 'Kind', 'Tool', 'Pet', 'Cape at 99'], rows))}`, toc: false };
}

function toolsPage(help) {
    const body = Object.entries(TOOLS).map(([toolId, tool]) => section(`${icon(`tool/${toolId}`, 1)} ${esc(tool.name)}`, `<p>For ${skillLink(tool.skill)}, made in ${skillLink(tool.madeBy)}.</p>`
        + table(['Tier #', 'Tool', 'Level #', 'Needs', 'XP #', 'Speed #', 'Double chance #'], tool.tiers.map(t => [t.tier, esc(t.name), t.levelReq, resList(t.consumes), fmt(t.xp), `+${pct(TOOL_SPEED_PER_TIER * t.tier, 0)}`, `+${pct(TOOL_DOUBLE_PER_TIER * t.tier, 0)}`]), { sort: false }), { id: toolId })).join('\n');
    return { body: `${help.prose('/tools')}\n${body}` };
}

export default {
    pages: () => [
        { path: '/skills', title: 'Skills', ...sec, icon: 'tool/pickaxe', summary: 'Every skill in Fantasy Idle: what it does, how to train it, and what it feeds.', build: indexPage },
        ...SKILL_ORDER.map(id => ({
            path: path.skill(id), title: SKILLS[id].name, ...sec, icon: skillIcon(id), art: FEATURES[id]?.art || '', focus: FEATURES[id]?.focus || '',
            summary: `${SKILLS[id].name} in Fantasy Idle: ${SKILLS[id].desc}`,
            aliases: { smithing: ['Smelting', 'Anvil', 'Forging', 'Reinforcing'], firemaking: ['Bonfire'], crafting: ['Jewellery crafting'], agility: ['Obstacles', 'Agility course'], farming: ['Crops', 'Plots', 'Seeds'] }[id] || [],
            build: help => skillPage(id, help)
        })),
        { path: '/tools', title: 'Tools', section: 'Items', sectionPath: '/items', icon: 'tool/axe', summary: 'Pickaxes, axes, bows, rods, tinderboxes and hoes: what each tier gives and costs.', aliases: ['Pickaxe', 'Axe', 'Bow', 'Fishing rod', 'Tinderbox', 'Hoe'], build: toolsPage }
    ]
};
