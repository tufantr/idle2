// The fight's world: Combat, the lands and the Abyss's strata, every monster, the dungeons, the Titan and
// the camp. Monsters' numbers are the game's own (enemyForStage, dungeonEnemy, titanEnemy), stage by stage.

import { ZONES, STAGES_PER_ZONE, zoneForStage, abyssGearTier, isBossStage, GEM_DROP_TABLE } from '../../src/data/zones.js';
import { STRATA, STRATA_FROM, STRATUM_STAGES } from '../../src/data/strata.js';
import { DUNGEONS, UNIQUES, DUNGEON_MILESTONES, ELITE_HP_MULT, ELITE_ATK_MULT, DUNGEON_BOSS_HP_MULT, DUNGEON_BOSS_TIME_MS, FRAGMENTS_PER_UNIQUE, DIRECT_UNIQUE_CHANCE,
    CHEST_GEAR_CHANCE, CHEST_ESSENCE_PER_TIER, CHEST_MATERIAL_ROLLS, CHEST_GEM_CHANCE, TITAN_TIME_MS, TITAN_HP_MULT, TITAN_ATK_MULT, TITAN_BONUS, TITAN_LATE_FROM, TITAN_BANK, TITAN_UNLOCK_STAGE, titanStage } from '../../src/data/dungeons.js';
import { BESTIARY, KILL_STARS } from '../../src/data/bestiary.js';
import { enemyForStage, goldForKill, combatXpForKill, BALANCE } from '../../src/core/formulas.js';
import { BASE } from '../../src/core/modifiers.js';
import { GEAR_TIERS, GEAR_DROP_CHANCE, TIER_WEAR_LEVEL } from '../../src/data/items.js';
import { VOIDSTONE_DEPTH, VOIDSTONE_CHANCE } from '../../src/data/workshop.js';
import { CAMP_UPGRADES, campCost, campMultiplier } from '../../src/data/camp.js';
import { PETS } from '../../src/data/pets.js';
import { CAPES } from '../../src/data/capes.js';
import { dungeonEnemy, titanEnemy } from '../../src/systems/dungeon.js';
import { killPayout } from '../../src/systems/combat.js';
import { ZONE_LINES, DUNGEON_ART } from '../../src/ui/features.js';
import { tierShares, gearBands, depthStage, titanLeaves, TITANS_SHOWN } from '../lib/xref.mjs';
import { petSection, capeSection, medalsSection } from './skills.mjs';
import { path, res, icon, link, table, infobox, section, tiles, navbox, fmt, pct, time, esc, paintStyle, slugify, resIcon } from '../lib/ui.mjs';

const LAST_STAGE = STRATA_FROM + STRATA.length * STRATUM_STAGES - 1;   // the last stratum goes on below this
const XP_LEVEL = 30;   // combat XP shown for a hero between the fast start and the slowdown (levels 10-60)

// ---------- where every monster stands ----------

const STAGES_OF = new Map();   // name -> [stage]
for (let stage = 1; stage <= LAST_STAGE; stage++) {
    const name = enemyForStage(stage).baseName;
    if (!STAGES_OF.has(name)) STAGES_OF.set(name, []);
    STAGES_OF.get(name).push(stage);
}
const DUNGEON_SPOTS = new Map();   // name -> [{ dungeon, index, boss }]
for (const d of DUNGEONS) {
    d.monsters.forEach((m, i) => { if (!DUNGEON_SPOTS.has(m.name)) DUNGEON_SPOTS.set(m.name, []); DUNGEON_SPOTS.get(m.name).push({ dungeon: d, index: i, boss: false }); });
    if (!DUNGEON_SPOTS.has(d.boss.name)) DUNGEON_SPOTS.set(d.boss.name, []);
    DUNGEON_SPOTS.get(d.boss.name).push({ dungeon: d, index: d.monsters.length, boss: true });
}

/** The land or stratum page a stage belongs to. */
function placeOf(stage) {
    if (stage < STRATA_FROM) { const z = ZONES[Math.floor((stage - 1) / STAGES_PER_ZONE)]; return { id: z.id, name: z.name, boss: z.boss }; }
    const i = Math.min(STRATA.length - 1, Math.floor((stage - STRATA_FROM) / STRATUM_STAGES));
    const s = STRATA[i];
    return { id: i === 0 ? 'abyss' : s.id, name: s.name, boss: s.boss };
}
const placeLink = stage => { const p = placeOf(stage); return link(path.zone(p.id), esc(p.name), `mon/${p.boss}`); };
const monLink = name => link(path.monster(name), esc(name), `mon/${name}`, 1);

function stageRow(stage, { place = false } = {}) {
    const e = enemyForStage(stage);
    return [
        `<span class="stage-pip${e.boss ? ' boss' : ''}">${stage}</span>`,
        ...(place ? [placeLink(stage)] : [monLink(e.baseName) + (e.boss ? ' <span class="tag boss">boss</span>' : '')]),
        fmt(e.hp), fmt(e.atk), time(e.interval), fmt(goldForKill(e)), fmt(combatXpForKill(e, 1, XP_LEVEL))
    ];
}
const STAGE_HEAD = ['Stage #', 'Monster', 'Health #', 'Attack #', 'Attacks every #', 'Gold #', 'XP #'];

/** What a dungeon's monster pays a kill: as the regular monsters its health is worth (systems/combat.js killPayout), the boss's XP for each of them. */
function dungeonPay(e) {
    const pay = killPayout({ combat: { mode: 'dungeon' } }, e);
    const paid = { ...e, boss: false };
    return { gold: goldForKill(paid), xp: combatXpForKill(paid, 1, XP_LEVEL) * pay.rolls, rolls: pay.rolls };
}

// ---------- loot of a land ----------

/** The tiers of the gear a place of gear tier `gearTier` drops: "Iron 25%, Mithril 65%, Adamant 10%". */
const gearShares = gearTier => tierShares(gearTier).map(({ tier, share }) => `${link(path.tier(GEAR_TIERS[tier - 1].name), GEAR_TIERS[tier - 1].name)} ${pct(share, 0)}`).join(', ');

/**
 * A place's loot, for its stages `from` to `to`. Deep in the Abyss the gear rises with the depth, so a page
 * whose stages span depths of more than one gear tier gives its gear for each run of stages.
 */
function lootSection(zone, from, to) {
    const total = zone.loot.reduce((s, l) => s + l.weight, 0);
    const qty = 1 + Math.floor(zone.tier / 3);
    const mats = table(['Material', 'Share #', 'Each drop #'], zone.loot.map(l => [res(l.id), pct(l.weight / total), qty]));
    const gems = GEM_DROP_TABLE.filter(g => Math.abs(g.tier - zone.tier) <= 1).map(g => ({ ...g, w: g.tier <= zone.tier ? 3 : 1 }));
    const gw = gems.reduce((s, g) => s + g.w, 0);
    const bands = gearBands(from, to);
    const gearText = bands.length === 1 ? gearShares(bands[0].gearTier) : bands.map(b => `stages ${b.from}–${b.to}: ${gearShares(b.gearTier)}`).join('; ');
    const deeper = zoneForStage(to).depth > BALANCE.abyss.dropScalingFrom ? ` Past depth ${BALANCE.abyss.dropScalingFrom}, every depth makes the gear that drops ${BALANCE.abyss.dropGrowth} times as strong.` : '';
    const voidFrom = depthStage(VOIDSTONE_DEPTH);
    const voidstone = to >= voidFrom ? `<li><strong>${res('voidstone')}</strong>: a boss's first fall leaves one ${pct(VOIDSTONE_CHANCE, 0)} of the time${from < voidFrom ? `, from stage ${voidFrom}` : ''}.</li>` : '';
    return section('Loot', `<p>A monster leaves a material ${pct(BALANCE.rewards.materialDropChance, 0)} of the time, and a boss on its first fall always does:</p>${mats}
        <ul>
            <li><strong>Gems</strong>: ${pct(BALANCE.rewards.gemDropChance, 0)} of kills (a boss's first fall ten times that): ${gems.map(g => `${res(g.id)} ${pct(g.w / gw, 0)}`).join(', ')}.</li>
            ${voidstone}
            <li><strong>Essence</strong>: ${pct(BALANCE.rewards.essenceDropChance, 0)} of kills leave 1–2; a boss's first fall ${BALANCE.rewards.bossEssence[0] * Math.max(1, Math.round(zone.tier / 2))}–${BALANCE.rewards.bossEssence[1] * Math.max(1, Math.round(zone.tier / 2))}.</li>
            <li><strong>Gear</strong>: ${pct(GEAR_DROP_CHANCE.regular, 1)} of kills, half of a boss's first falls: ${gearText}.${deeper}</li>
        </ul>`, { id: 'loot' });
}

/** The dungeons that open in stages `from` to `to`: when each opens. */
function dungeonsSection(from, to) {
    const list = DUNGEONS.filter(d => d.unlockStage >= from && d.unlockStage <= to);
    return list.length ? section('Dungeons', `<p>${list.map(d => `${link(path.dungeon(d.id), esc(d.name), `mon/${d.boss.name}`)} opens when your best stage reaches ${d.unlockStage}.`).join(' ')}</p>`) : '';
}

// ---------- pages ----------

/** The strata below the Abyss as painted tiles, each with its stages. */
const strataTiles = () => tiles(STRATA.slice(1).map((s, i) => {
    const from = STRATA_FROM + (i + 1) * STRATUM_STAGES;
    return { href: path.zone(s.id), title: esc(s.name), pic: icon(`mon/${s.boss}`, 1.5), note: `stages ${from}${i + 2 === STRATA.length ? '+' : `–${from + STRATUM_STAGES - 1}`}`, art: paintStyle(s.id) };
}), 'painted small');

function zonePage(z, index, help) {
    const from = index * STAGES_PER_ZONE + 1;
    const isAbyss = z.id === 'abyss';
    const to = isAbyss ? STRATA_FROM + STRATUM_STAGES - 1 : from + STAGES_PER_ZONE - 1;
    const stages = [];
    for (let s = from; s <= to; s++) stages.push(stageRow(s));
    const prev = ZONES[index - 1];
    const next = ZONES[index + 1] || (isAbyss ? null : null);
    const packs = from <= BALANCE.combat.firstPack.to && to >= BALANCE.combat.firstPack.from;
    const strata = isAbyss ? section('The strata below', `<p>From stage ${STRATA_FROM} the Abyss goes on in strata of ${STRATUM_STAGES} stages, each with its own monsters and boss. The last goes on for ever.</p>${strataTiles()}`) : '';
    return {
        lead: esc(ZONE_LINES[z.id] || ''),
        infobox: infobox({
            title: esc(z.name), image: icon(`mon/${z.boss}`, 3), caption: `Its boss: ${monLink(z.boss)}`,
            rows: [['Stages', `${from}–${isAbyss ? `${from + STAGES_PER_ZONE - 1}, then the strata` : to}`], ['Gear that drops', link(path.tier(GEAR_TIERS[z.gearTier - 1].name), GEAR_TIERS[z.gearTier - 1].name)], ['Wear it from', `combat level ${TIER_WEAR_LEVEL[z.gearTier]}`], ['Richness', `tier ${z.tier}`],
                prev ? ['Before it', link(path.zone(prev.id), esc(prev.name))] : null, next ? ['After it', link(path.zone(next.id), esc(next.name))] : null]
        }),
        body: [
            help.prose(path.zone(z.id)),
            section('Monsters', `<p class="chips">${z.monsters.map(m => `<span class="chip">${monLink(m)}</span>`).join('')}<span class="chip boss">${monLink(z.boss)}</span></p>`),
            section('Stages', `${packs ? `<p>On a first visit, stages ${Math.max(from, BALANCE.combat.firstPack.from)}–${Math.min(to, BALANCE.combat.firstPack.to)} hold a pack of ${BALANCE.combat.firstPack.size} monsters (not the boss); a stage already cleared is one fight.</p>` : ''}<p>Every tenth stage is a boss: it must fall within ${BALANCE.combat.bossTimeMs / 1000} seconds. XP is for a hero between combat levels 10 and 60.</p>${table(STAGE_HEAD, stages, { cls: 'stages', wide: true })}`),
            lootSection(z, from, to),
            dungeonsSection(from, to),
            strata
        ].filter(Boolean).join('\n'),
        navbox: navbox('Lands', [...ZONES.map(x => link(path.zone(x.id), esc(x.name), `mon/${x.boss}`)), ...STRATA.slice(1).map(x => link(path.zone(x.id), esc(x.name), `mon/${x.boss}`))])
    };
}

function stratumPage(s, i, help) {
    const from = STRATA_FROM + i * STRATUM_STAGES;
    const last = i === STRATA.length - 1;
    const to = from + STRATUM_STAGES - 1;
    const stages = [];
    for (let st = from; st <= to; st++) stages.push(stageRow(st));
    const depths = [...new Set(Array.from({ length: STRATUM_STAGES }, (_, k) => zoneForStage(from + k).depth))];
    const gear = [...new Set(depths.map(d => abyssGearTier(d)))].map(t => link(path.tier(GEAR_TIERS[t - 1].name), GEAR_TIERS[t - 1].name)).join(', then ');
    const zone = zoneForStage(from);
    return {
        lead: esc(s.line),
        infobox: infobox({
            title: esc(s.name), image: icon(`mon/${s.boss}`, 3), caption: `Its boss: ${monLink(s.boss)}`,
            rows: [['Stages', `${from}${last ? '+' : `–${to}`}`], ['Abyss depth', `${depths[0]}${depths.length > 1 ? `–${depths[depths.length - 1]}` : ''}${last ? '+' : ''}`], ['Gear that drops', gear],
                i > 1 ? ['Above it', link(path.zone(STRATA[i - 1].id), esc(STRATA[i - 1].name))] : ['Above it', link(path.zone('abyss'), 'The Abyss')],
                !last ? ['Below it', link(path.zone(STRATA[i + 1].id), esc(STRATA[i + 1].name))] : null]
        }),
        body: [
            help.prose(path.zone(s.id)),
            section('Monsters', `<p class="chips">${s.monsters.map(m => `<span class="chip">${monLink(m)}</span>`).join('')}<span class="chip boss">${monLink(s.boss)}</span></p>`),
            section('Stages', `<p>Every tenth stage is a boss on a ${BALANCE.combat.bossTimeMs / 1000}-second timer.${last ? ' Past the stages below, Pandemonium goes on for ever, its monsters ever stronger.' : ''}</p>${table(STAGE_HEAD, stages, { cls: 'stages', wide: true })}`),
            lootSection(zone, from, to),
            dungeonsSection(from, to)
        ].filter(Boolean).join('\n'),
        navbox: navbox('Lands', [...ZONES.map(x => link(path.zone(x.id), esc(x.name), `mon/${x.boss}`)), ...STRATA.slice(1).map(x => link(path.zone(x.id), esc(x.name), `mon/${x.boss}`))])
    };
}

function zonesIndex(help) {
    const lands = tiles(ZONES.map((z, i) => ({ href: path.zone(z.id), title: esc(z.name), pic: icon(`mon/${z.boss}`, 1.5), note: `stages ${i * 10 + 1}–${i * 10 + 10}`, art: paintStyle(z.id) })), 'painted');
    const strata = strataTiles();
    const rows = ZONES.map((z, i) => [link(path.zone(z.id), esc(z.name), `mon/${z.boss}`), `${i * 10 + 1}–${i * 10 + 10}`, monLink(z.boss), link(path.tier(GEAR_TIERS[z.gearTier - 1].name), GEAR_TIERS[z.gearTier - 1].name), z.tier]);
    return { body: `${help.prose('/zones')}\n${section('The ten lands', lands + table(['Land', 'Stages', 'Boss', 'Gear', 'Richness #'], rows))}\n${section('The Abyss', `<p>Stages ${STRATA_FROM}–${STRATA_FROM + STRATUM_STAGES - 1} are ${link(path.zone('abyss'), 'the Abyss')} itself; below it lie the strata:</p>${strata}`)}` };
}


/**
 * A monster's drops, from the loot of the land its stage stands in: the chance a kill leaves each thing. A
 * boss's first fall (`boss`) always leaves a material. A dungeon's boss is paid as the regular monsters its
 * health is worth: its loot is rolled `rolls` times. `voidFrom` is the stage from which a boss also leaves a
 * Voidstone (true: on every stage it stands on).
 */
function dropsSection(stage, boss, places, { intro = '', rolls = 1, voidFrom = null } = {}) {
    const zone = zoneForStage(stage);
    const total = zone.loot.reduce((s, l) => s + l.weight, 0);
    const qty = 1 + Math.floor(zone.tier / 3);
    const r = BALANCE.rewards;
    const rows = zone.loot.map(l => [res(l.id), pct((boss ? 1 : r.materialDropChance) * l.weight / total), qty]);
    const essence = boss ? `${r.bossEssence[0] * Math.max(1, Math.round(zone.tier / 2))}–${r.bossEssence[1] * Math.max(1, Math.round(zone.tier / 2))}, always` : `1–2, ${pct(r.essenceDropChance, 0)}`;
    rows.push([res('essence'), essence.split(', ')[1], essence.split(', ')[0]]);
    rows.push(['a gem', pct(r.gemDropChance * (boss ? 10 : 1), 0), '1']);
    if (voidFrom) rows.push([res('voidstone'), `${pct(VOIDSTONE_CHANCE, 0)}${voidFrom === true ? '' : `, from stage ${voidFrom}`}`, '1']);
    rows.push(['a piece of gear', pct(boss ? GEAR_DROP_CHANCE.boss : GEAR_DROP_CHANCE.regular, 1), '1']);
    const text = intro || (boss ? 'On its first fall in a run (later falls pay like the regular monsters of its stage):' : 'What a kill leaves, before drop chance bonuses:');
    return section('Drops', `<p>${text}</p>${table(['Drop', rolls > 1 ? 'Chance a roll #' : 'Chance a kill #', 'Amount #'], rows, { sort: false })}<p>More in ${places.map(p => link(`${path.zone(p.id)}#loot`, `the loot of ${esc(p.name)}`)).join(' and ')}.</p>`);
}

function monsterPage(name, help) {
    const stages = STAGES_OF.get(name) || [];
    const spots = DUNGEON_SPOTS.get(name) || [];
    const boss = stages.some(s => isBossStage(s)) || spots.some(s => s.boss);
    const places = [...new Map(stages.map(s => [placeOf(s).id, placeOf(s)])).values()];
    const shown = stages.slice(0, 12);
    const rows = shown.map(s => stageRow(s, { place: true }));
    // a boss deep in the Abyss also leaves the Voidstone on its first fall (systems/combat.js rollLoot)
    const deep = stages.filter(s => isBossStage(s) && zoneForStage(s).depth >= VOIDSTONE_DEPTH);
    const voidFrom = deep.length ? (deep.length === stages.length ? true : deep[0]) : null;
    const dungeonRows = spots.map(sp => {
        const e = dungeonEnemy({ id: sp.dungeon.id, index: sp.index });
        const pay = dungeonPay(e);
        return [link(path.dungeon(sp.dungeon.id), esc(sp.dungeon.name), `mon/${sp.dungeon.boss.name}`), sp.boss ? 'the boss' : `${sp.index + 1} of ${sp.dungeon.monsters.length}`, fmt(e.hp), fmt(e.atk), time(e.interval), fmt(pay.gold), fmt(pay.xp)];
    });
    // a monster met only in dungeons: its kill leaves the loot of the land its stage stands in
    const spot = !stages.length && spots[0];
    const dungeonDrops = spot ? (() => {
        const e = dungeonEnemy({ id: spot.dungeon.id, index: spot.index });
        const pay = dungeonPay(e);
        const land = placeOf(e.stage);
        return dropsSection(e.stage, false, [land], { rolls: pay.rolls, intro: `What a kill in ${link(path.dungeon(spot.dungeon.id), esc(spot.dungeon.name))} leaves, before drop chance bonuses: the loot of ${link(path.zone(land.id), esc(land.name))}, where its stage stands${pay.rolls > 1 ? `, rolled ${pay.rolls} times, as the regular monsters its health is worth` : ''}. A clear also opens the dungeon's chest.` });
    })() : '';
    const where = [...places.map(p => link(path.zone(p.id), esc(p.name))), ...[...new Set(spots.map(s => s.dungeon))].map(d => link(path.dungeon(d.id), esc(d.name)))];
    const group = BESTIARY.find(g => g.monsters.some(m => m.name === name));
    return {
        lead: `${esc(name)} is ${boss ? 'a boss' : 'a monster'} of ${where.join(' and ') || 'the world'}.${boss && stages.length ? ` It guards stage${stages.length > 1 ? 's' : ''} ${stages.slice(0, 6).join(', ')}${stages.length > 6 ? '…' : ''}, and must fall within ${BALANCE.combat.bossTimeMs / 1000} seconds.` : ''}`,
        infobox: infobox({
            title: esc(name), image: icon(`mon/${name}`, 3),
            rows: [['Where', where.join('<br>')], stages.length ? ['Stages', `${stages.slice(0, 4).join(', ')}${stages.length > 4 ? ` … ${stages[stages.length - 1]}${stages[stages.length - 1] >= LAST_STAGE - 25 && placeOf(stages[0]).id === 'pandemonium' ? '+' : ''}` : ''}`] : null,
                ['Bestiary stars', `${KILL_STARS.map(k => fmt(k)).join(' · ')} defeats`], boss ? ['Kind', 'Boss'] : null]
        }),
        body: [
            help.prose(path.monster(name)),
            rows.length ? section('Stats', `<p>Its numbers at each stage it stands on${stages.length > shown.length ? ` (the first ${shown.length} of ${stages.length})` : ''}. XP is for a hero between combat levels 10 and 60.</p>${table(['Stage #', 'Land', 'Health #', 'Attack #', 'Attacks every #', 'Gold #', 'XP #'], rows, { cls: 'stages', wide: true })}`) : '',
            dungeonRows.length ? section('In dungeons', `<p>${spots.some(s => !s.boss) ? `As an elite: ${pct(ELITE_HP_MULT - 1, 0)} more health and ${pct(ELITE_ATK_MULT - 1, 0)} more attack than the stage it stands for.` : ''}${spots.some(s => s.boss) ? ` As a dungeon boss: ${pct(DUNGEON_BOSS_HP_MULT - 1, 0)} more health on top of a boss's, and ${DUNGEON_BOSS_TIME_MS / 1000} seconds to beat it.` : ''} A kill pays gold and XP as the regular monsters its health is worth; XP is for a hero between combat levels 10 and 60.</p>${table(['Dungeon', 'Place in the run', 'Health #', 'Attack #', 'Attacks every #', 'Gold #', 'XP #'], dungeonRows, { wide: true })}`) : '',
            stages.length ? dropsSection(stages[0], boss, places, { voidFrom }) : dungeonDrops
        ].filter(Boolean).join('\n'),
        navbox: group ? navbox(esc(group.name), group.monsters.map(m => monLink(m.name))) : ''
    };
}

function monstersIndex(help) {
    const groups = BESTIARY.map(g => section(esc(g.name), tiles(g.monsters.map(m => ({ href: path.monster(m.name), title: esc(m.name), pic: icon(`mon/${m.name}`, 2), note: m.boss ? 'boss' : m.at ? `stage ${m.at}` : '' })), 'small'), { level: 3, id: `in-${g.id.replace(/_/g, '-')}` }));
    const zones = groups.slice(0, ZONES.length).join('\n');
    const strata = groups.slice(ZONES.length, ZONES.length + STRATA.length - 1).join('\n');
    const dungeons = groups.slice(ZONES.length + STRATA.length - 1).join('\n');
    return { body: `${help.prose('/monsters')}\n<h2 id="lands">The lands</h2>\n${zones}\n<h2 id="the-abyss">The Abyss's strata</h2>\n${strata}\n<h2 id="dungeons">The dungeons</h2>\n${dungeons}` };
}

function dungeonPage(d, help) {
    const cells = e => { const pay = dungeonPay(e); return [e.stage, fmt(e.hp), fmt(e.atk), time(e.interval), fmt(pay.gold), fmt(pay.xp)]; };
    const run = d.monsters.map((m, i) => [i + 1, monLink(m.name), ...cells(dungeonEnemy({ id: d.id, index: i }))]);
    run.push([d.monsters.length + 1, `${monLink(d.boss.name)} <span class="tag boss">boss</span>`, ...cells(dungeonEnemy({ id: d.id, index: d.monsters.length }))]);
    const zone = zoneForStage(d.stage);
    const u = UNIQUES[d.unique];
    const total = zone.loot.reduce((s, l) => s + l.weight, 0);
    const gem = [...GEM_DROP_TABLE].reverse().find(g => g.tier <= zone.tier) || GEM_DROP_TABLE[0];
    const art = DUNGEON_ART[d.id] || 'dungeon';
    return {
        infobox: infobox({
            title: esc(d.name), image: icon(`mon/${d.boss.name}`, 3), caption: `Its boss: ${monLink(d.boss.name)}`,
            rows: [['Opens at', `best stage ${d.unlockStage}`], ['Monsters', `${d.monsters.length} elites and a boss`], ['Boss timer', `${DUNGEON_BOSS_TIME_MS / 1000} seconds`], ['Chest gear', link(path.tier(GEAR_TIERS[d.chestTier - 1].name), GEAR_TIERS[d.chestTier - 1].name)],
                ['Unique', link(path.unique(u.id), esc(u.name), `uniq/${u.id}`)]]
        }),
        body: [
            help.prose(path.dungeon(d.id)),
            section('The run', `<p>Fought in one go, with the gear you walked in with. Each elite stands for a stage of the ladder, with ${pct(ELITE_HP_MULT - 1, 0)} more health and ${pct(ELITE_ATK_MULT - 1, 0)} more attack; the boss has ${pct(DUNGEON_BOSS_HP_MULT - 1, 0)} more health than a stage boss and ${DUNGEON_BOSS_TIME_MS / 1000} seconds. Every kill pays gold, XP and loot as the regular monsters its health is worth (XP for a hero between combat levels 10 and 60).</p>${table(['# ', 'Monster', 'Stage #', 'Health #', 'Attack #', 'Attacks every #', 'Gold #', 'XP #'], run, { sort: false, wide: true })}`),
            section('The chest', `<p>Every clear opens a chest:</p><ul>
                <li>${FRAGMENTS_PER_UNIQUE > 1 ? `A fragment of ${link(path.unique(u.id), esc(u.name))} (now and then three)` : ''}: ${FRAGMENTS_PER_UNIQUE} make the piece. A chest can also hold it whole (${pct(DIRECT_UNIQUE_CHANCE, 1)}).</li>
                <li>${Math.round(CHEST_ESSENCE_PER_TIER * zone.tier)} ${res('essence')}.</li>
                <li>${CHEST_MATERIAL_ROLLS} picks of ${esc(zone.name)}'s materials, ${1 + Math.floor(zone.tier / 3)} each: ${zone.loot.map(l => `${res(l.id)} ${pct(l.weight / total, 0)}`).join(', ')}.</li>
                <li>${pct(CHEST_GEM_CHANCE, 0)} of the time a gem: ${res(gem.id)}.</li>
                <li>${pct(CHEST_GEAR_CHANCE, 0)} of the time a piece of ${link(path.tier(GEAR_TIERS[d.chestTier - 1].name), `${GEAR_TIERS[d.chestTier - 1].name} gear`)}, of a boss's quality.</li></ul>`),
            section('Unique item', `<div class="feature-row">${icon(`uniq/${u.id}`, 2)}<div><p><strong>${link(path.unique(u.id), esc(u.name))}</strong>: ${u.affixes.map(a => `+${pct(a.value, 0)} ${esc(a.name)}`).join(', ')}.</p></div></div>`),
            section('Milestones', `<p>Clearing a dungeon again and again earns bonuses for good:</p>${table(['Clears #', 'Bonus'], DUNGEON_MILESTONES.map(m => [m.clears, esc(m.desc)]), { sort: false })}`)
        ].join('\n'),
        art,
        navbox: navbox('Dungeons', DUNGEONS.map(x => link(path.dungeon(x.id), esc(x.name), `mon/${x.boss.name}`)))
    };
}

function dungeonsIndex(help) {
    const rows = DUNGEONS.map(d => [link(path.dungeon(d.id), esc(d.name), `mon/${d.boss.name}`, 1), d.unlockStage, d.monsters.length, monLink(d.boss.name), link(path.tier(GEAR_TIERS[d.chestTier - 1].name), GEAR_TIERS[d.chestTier - 1].name), link(path.unique(d.unique), esc(UNIQUES[d.unique].name), `uniq/${d.unique}`)]);
    const pics = tiles(DUNGEONS.map(d => ({ href: path.dungeon(d.id), title: esc(d.name), pic: icon(`mon/${d.boss.name}`, 1.5), note: `stage ${d.unlockStage}`, art: paintStyle(DUNGEON_ART[d.id] || 'dungeon') })), 'painted');
    return { body: `${pics}\n${help.prose('/dungeons')}\n${section('Every dungeon', table(['Dungeon', 'Opens at #', 'Elites #', 'Boss', 'Chest gear', 'Unique'], rows))}` };
}

function titanPage(help) {
    const rows = Array.from({ length: TITANS_SHOWN }, (_, i) => {
        const level = i + 1;
        const e = titanEnemy({ titan: { kills: i } });
        const late = level > TITAN_LATE_FROM;
        const leaves = titanLeaves(level);
        return [level, esc(e.name), titanStage(level), fmt(e.hp), fmt(e.atk), `+${pct(TITAN_BONUS.atkMult * (late ? 0.5 : 1), 0)} attack and health<br><small>${fmt(leaves.essence)} essence, ${leaves.gems.map(([id, qty]) => res(id, { qty })).join(' ')}</small>`];
    });
    return {
        infobox: infobox({ title: 'The Titan', image: icon('titan/0', 3), rows: [['Opens at', `best stage ${TITAN_UNLOCK_STAGE}`], ['Attempts', `one an hour, up to ${TITAN_BANK} saved`], ['Time', `${TITAN_TIME_MS / 1000} seconds`], ['Health', `${TITAN_HP_MULT} × a boss of its stage`], ['Attack', `${TITAN_ATK_MULT} × a boss's`]] }),
        body: `${help.prose('/titan')}\n${section('The Titans', `<p>Each Titan defeated is gone for good, and the next stands deeper. Here are the first ${TITANS_SHOWN}, and what each leaves when it falls: its lasting bonus, essence and a pair of gems. Each also leaves ${titanLeaves(1).goldKills} kills' worth of gold at your best stage, and its fall pays as a boss's first fall does.</p>${table(['# ', 'Titan', 'Stage #', 'Health #', 'Attack #', 'Leaves'], rows, { sort: false, wide: true })}`)}`
    };
}

function campPage(help) {
    const levels = [1, 2, 3, 5, 10, 15, 20, 25];
    const rows = levels.map(l => [l, ...CAMP_UPGRADES.map(u => fmt(campCost(u, l - 1)))]);
    const info = table(['Upgrade', 'Each level', 'Most levels #', 'At most #'], CAMP_UPGRADES.map(u => [`<span class="act">${icon(u.art, 1)}<span>${esc(u.name)}</span></span>`, esc(u.desc), u.max, `×${campMultiplier(u, u.max).toFixed(2)}`]), { sort: false });
    return {
        infobox: infobox({ title: 'Camp', image: icon('campfire', 3), rows: [['Paid with', 'gold'], ['Resets', 'every prestige'], ['Upgrades', CAMP_UPGRADES.map(u => esc(u.name)).join(', ')]] }),
        body: `${help.prose('/camp')}\n${section('Upgrades', info)}\n${section('Price of each level', `<p>The base price of each level, in gold (later on, prices follow your best stage instead, when that is higher):</p>${table(['Level #', ...CAMP_UPGRADES.map(u => `${esc(u.name)} #`)], rows, { sort: false })}`)}`
    };
}

function combatPage(help) {
    const levels = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
    const lv = table(['Combat level #', 'Attack and defence #', 'Base health #', 'Wears gear up to'], levels.map(l => {
        const tier = Object.entries(TIER_WEAR_LEVEL).filter(([, at]) => l >= at).map(([t]) => Number(t)).pop();
        return [l, `+${pct(BASE.atkPerCombatLevel * (l - 1), 1)}`, fmt(BASE.baseHp + BASE.hpPerCombatLevel * (l - 1)), link(path.tier(GEAR_TIERS[tier - 1].name), GEAR_TIERS[tier - 1].name)];
    }), { sort: false });
    const stages = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 400, 500];
    const xp = table(['Stage #', 'Monster health #', 'Monster attack #', 'Gold #', 'XP #', 'Boss XP #'], stages.map(s => {
        const e = enemyForStage(s);
        const reg = isBossStage(s) ? enemyForStage(s - 1) : e;
        const boss = isBossStage(s) ? e : enemyForStage(Math.ceil(s / 10) * 10);
        return [s, fmt(reg.hp), fmt(reg.atk), fmt(goldForKill(reg)), fmt(combatXpForKill(reg, 1, XP_LEVEL)), fmt(combatXpForKill(boss, 1, XP_LEVEL))];
    }), { sort: false });
    // Combat is a skill too: its pet, its cape and its medals, as on the other skills' pages
    const pet = PETS.find(p => p.skill === 'combat');
    const cape = CAPES.find(c => c.skill === 'combat');
    return {
        infobox: infobox({ title: 'Combat', image: icon('item/Weapon/3', 3), rows: [['Skill levels', '1–99'], ['Every level', `+${pct(BASE.atkPerCombatLevel, 1)} attack and defence, +${BASE.hpPerCombatLevel} health`], ['Boss timer', `${BALANCE.combat.bossTimeMs / 1000} seconds`], ['A strike', `${pct(BALANCE.combat.manualHitMult, 0)} of an attack`],
            pet ? ['Pet', link('/pets', esc(pet.name), `pet/${pet.id}`)] : null, cape ? ['Cape (99)', esc(cape.perk)] : null] }),
        body: [help.prose('/combat'), section('Combat levels', lv), section('Kills by stage', `<p>Regular monsters (the boss of each ten stages in the last column), for a hero between combat levels 10 and 60.</p>${xp}`),
            petSection('combat'), capeSection('combat'), medalsSection('combat')].filter(Boolean).join('\n')
    };
}

export default {
    pages: () => [
        { path: '/combat', title: 'Combat', section: 'Combat', sectionPath: '/combat', icon: 'item/Weapon/3', art: 'meadow', summary: 'How fighting works in Fantasy Idle: stages, bosses, damage, food, drops and combat levels.', aliases: ['Fighting', 'Combat level', 'Boss timer', 'Strikes', 'Combo'], build: combatPage },
        { path: '/zones', title: 'Zones', section: 'Combat', sectionPath: '/combat', icon: 'mon/Goblin Chieftain', art: 'map', summary: 'The ten lands of Fantasy Idle and the strata of the Abyss.', aliases: ['Lands', 'Stages', 'World map', 'The Abyss strata'], build: zonesIndex },
        ...ZONES.map((z, i) => ({ path: path.zone(z.id), title: z.name, section: 'Zones', sectionPath: '/zones', icon: `mon/${z.boss}`, art: z.id, summary: `${z.name}: stages ${i * 10 + 1}–${i * 10 + 10}, its monsters, its boss and its loot.`, keywords: ['zone', 'land'], build: help => zonePage(z, i, help) })),
        ...STRATA.slice(1).map((s, i) => ({ path: path.zone(s.id), title: s.name, section: 'Zones', sectionPath: '/zones', icon: `mon/${s.boss}`, art: s.id, summary: `${s.name}, a stratum of the Abyss: its monsters, boss and loot.`, keywords: ['stratum', 'abyss'], build: help => stratumPage(s, i + 1, help) })),
        { path: '/monsters', title: 'Monsters', section: 'Combat', sectionPath: '/combat', icon: 'mon/Skeleton', summary: 'Every monster in Fantasy Idle, where it stands, and the bestiary.', aliases: ['Bestiary', 'Enemies'], build: monstersIndex },
        ...BESTIARY.flatMap(g => g.monsters).map(m => ({ path: path.monster(m.name), title: m.name, section: 'Monsters', sectionPath: '/monsters', icon: `mon/${m.name}`, summary: `${m.name}: where it stands, its numbers and what it drops.`, keywords: ['monster', m.boss ? 'boss' : 'enemy'], build: help => monsterPage(m.name, help) })),
        { path: '/dungeons', title: 'Dungeons', section: 'Combat', sectionPath: '/combat', icon: 'mon/Goblin King', art: 'dungeon', summary: 'Dungeons: elite runs with a chest, fragments and a unique item.', aliases: ['Fragments', 'Dungeon chest'], build: dungeonsIndex },
        ...DUNGEONS.map(d => ({ path: path.dungeon(d.id), title: d.name, section: 'Dungeons', sectionPath: '/dungeons', icon: `mon/${d.boss.name}`, art: DUNGEON_ART[d.id] || 'dungeon', summary: `${d.name}: its monsters, boss, chest and unique.`, keywords: ['dungeon'], build: help => dungeonPage(d, help) })),
        { path: '/titan', title: 'The Titan', section: 'Combat', sectionPath: '/combat', icon: 'titan/0', art: 'titan', summary: 'The hourly Titan challenge and its permanent bonuses.', aliases: ['Titan', 'Titans'], build: titanPage },
        { path: '/camp', title: 'Camp', section: 'Combat', sectionPath: '/combat', icon: 'campfire', art: 'camp', summary: 'Camp upgrades: attack, defence and health for a run, bought with gold.', aliases: ['Whetstone', 'Armour Rack', 'Hearth', 'Camp upgrades'], build: campPage }
    ]
};
