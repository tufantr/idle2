// Equipment: how gear works, every tier (with the hero wearing its set), jewellery and the unique items.

import { GEAR_TIERS, TIER_WEAR_LEVEL, SLOT_STATS, STAT_UNIT, TYPE_NAMES, RARITIES, AFFIXES, JEWEL_POWER, SMITHING_TYPES, CRAFTING_TYPES, SMITHING_BAR_COST,
    DROP_TYPE_WEIGHTS, DROP_RARITY_WEIGHTS, DROP_HIGH_RARITY_PER_TIER, GEAR_DROP_CHANCE, JEWEL_DROP_MIN_RANK, DROP_EMPTY_SLOT_MULT, DROP_BEHIND_SLOT_MULT,
    PITY_MARKS, MAX_UPGRADE, UPGRADE_STEP, BAG_SIZE, MAX_REFORGE_MULT, EQUIP_SLOTS, CRAFT_RARITY_LEVELS, CRAFT_MAX_RARITY, MYTHIC, PRIMAL } from '../../src/data/items.js';
import { ZONES, STAGES_PER_ZONE } from '../../src/data/zones.js';
import { DUNGEONS, UNIQUES, FRAGMENTS_PER_UNIQUE } from '../../src/data/dungeons.js';
import { RESOURCES } from '../../src/data/resources.js';
import { GEM_TIERS, JEWEL_BARS, CRAFT_SLOT_OFFSET, METALS, anvilMetal, anvilBarMult, reinforceCost, FORGE_STEP } from '../../src/data/workshop.js';
import { BALANCE } from '../../src/core/formulas.js';
import { depthStage, tierShare, ABYSS_BANDS } from '../lib/xref.mjs';
import { path, res, icon, link, table, infobox, section, tiles, navbox, fmt, pct, esc, heroSprite } from '../lib/ui.mjs';

const sec = { section: 'Equipment', sectionPath: '/equipment' };
const ALL_TYPES = [...SMITHING_TYPES, ...CRAFTING_TYPES];
const LEGENDARY = RARITIES[RARITIES.length - 1];
const pieceName = (type, tier) => (CRAFTING_TYPES.includes(type) ? `${GEAR_TIERS[tier - 1].jewel} ${TYPE_NAMES[type]}` : `${GEAR_TIERS[tier - 1].name} ${TYPE_NAMES[type]}`);
const stat = (type, power, quality, key) => Math.round(STAT_UNIT * power * quality * SLOT_STATS[type][key]);
const tierLink = t => link(path.tier(GEAR_TIERS[t - 1].name), GEAR_TIERS[t - 1].name, `item/Weapon/${t}`);

/**
 * Where gear of `tier` drops, by the game's rule (a place's gear tier moved by an offset: lib/xref.mjs
 * tierShare): every land and every run of the Abyss's depths of one gear tier that drops it, with the share
 * of the place's gear that is of this tier; the places whose own tier it is; the dungeon chests of the tier.
 */
function dropsOf(tier) {
    const lands = ZONES.map((z, i) => ({ zone: z, from: i * STAGES_PER_ZONE + 1, to: (i + 1) * STAGES_PER_ZONE, gearTier: z.gearTier }));
    const depths = ABYSS_BANDS.map(b => ({ band: b, from: depthStage(b.from), to: b.to ? depthStage(b.to + 1) - 1 : null, gearTier: b.gearTier }));
    const places = [...lands, ...depths].map(p => ({ ...p, share: tierShare(p.gearTier, tier) })).filter(p => p.share > 0);
    return { places, own: places.filter(p => p.gearTier === tier), chests: DUNGEONS.filter(d => d.chestTier === tier) };
}
const placeName = p => (p.zone ? link(path.zone(p.zone.id), esc(p.zone.name)) : `${link('/zones', 'The Abyss')}, depth${p.band.to === p.band.from ? ` ${p.band.from}` : p.band.to ? `s ${p.band.from}–${p.band.to}` : `s ${p.band.from}+`}`);
const placeStages = p => `${p.from}${p.to ? `–${p.to}` : '+'}`;

function heroInSet(tier, scale = 3) {
    const equipped = Object.fromEntries(SMITHING_TYPES.map(type => [type, { type, tier }]));
    return heroSprite({ equipped, prestige: { count: 0 }, hero: {} }, { scale });
}

function tierPage(t, help) {
    const metal = anvilMetal(t.tier);
    const mult = anvilBarMult(t.tier);
    const d = dropsOf(t.tier);
    const rows = ALL_TYPES.map(type => {
        const power = CRAFTING_TYPES.includes(type) ? t.power * JEWEL_POWER : t.power;
        const q = [RARITIES[0], LEGENDARY];
        return [`<span class="act">${icon(`item/${type}/${t.tier}`, 1)}<span>${esc(pieceName(type, t.tier))}</span></span>`, ...q.flatMap(r => [stat(type, power, r.quality, 'atk'), stat(type, power, r.quality, 'def')])];
    });
    const anvilRows = SMITHING_TYPES.map(type => {
        const at = n => reinforceCost(type, n - 1, t.tier);
        return [`<span class="act">${icon(`item/${type}/${t.tier}`, 1)}<span>${esc(TYPE_NAMES[type])}</span></span>`, ...[1, 5, 10, 20].map(n => `${fmt(at(n).bars)} bar${at(n).bars === 1 ? '' : 's'}, ${fmt(at(n).essence)} essence`)];
    });
    const where = table(['Place', 'Stages', 'Share of its gear #'], d.places.map(p => [placeName(p), placeStages(p), pct(p.share, 0)]), { sort: false });
    const more = [
        d.chests.length ? `<li>The chests of ${d.chests.map(x => link(path.dungeon(x.id), esc(x.name))).join(', ')}.</li>` : '',
        ''
    ].join('');
    return {
        infobox: infobox({
            title: `${esc(t.name)} gear`, image: heroInSet(t.tier, 3), caption: `Your hero in a full ${esc(t.name.toLowerCase())} set`,
            rows: [['Tier', t.tier], ['Power', `×${t.power}`], ['Wear it from', `combat level ${TIER_WEAR_LEVEL[t.tier]}`], ['Jewellery gem', res(GEM_TIERS[t.tier - 1]?.gem || 'voidstone')],
                ['Anvil bars', `${res(metal.bar)}${mult > 1 ? ` ×${mult}` : ''}`], t.dropOnly ? ['Made', 'only dropped'] : null]
        }),
        body: [
            help.prose(path.tier(t.name)),
            section('Pieces', `<p>Attack and defence of each piece before reinforcing, for a common and a legendary roll (each piece also varies ${pct(0.05, 0)} either way). Deeper than Abyss depth ${BALANCE.abyss.dropScalingFrom}, dropped pieces are stronger still.</p>${table(['Piece', 'Attack, common #', 'Defence, common #', 'Attack, legendary #', 'Defence, legendary #'], rows, { wide: true })}`),
            section('Where it comes from', `<p>Gear drops mostly of the place's own tier, now and then a tier below or above it. Of the gear that drops in each of these places, this share is ${esc(t.name)}:</p>${where}${more ? `<ul>${more}</ul>` : ''}`),
            section('At the anvil', `<p>A slot that has held ${esc(t.name)} gear is reinforced with ${res(metal.bar)}${mult > 1 ? `, ${mult} times as many as for runite` : ''}, and ${esc(t.name)} pieces are rerolled with them. What reinforcing a slot to +1, +5, +10 and +20 costs:</p>${table(['Slot', '+1', '+5', '+10', '+20'], anvilRows, { sort: false })}`)
        ].join('\n'),
        navbox: navbox('Gear tiers', GEAR_TIERS.map(x => tierLink(x.tier)))
    };
}

function overviewPage(help) {
    const tiers = table(['Tier #', 'Gear', 'Power #', 'Wear from level #', 'Mostly drops in', 'Anvil bars'], GEAR_TIERS.map(t => {
        const d = dropsOf(t.tier);
        const where = d.own.map(p => `${placeName(p)} <small>${placeStages(p)}</small>`).join(', ') || '–';
        return [t.tier, tierLink(t.tier), `×${t.power}`, TIER_WEAR_LEVEL[t.tier], where, `${res(anvilMetal(t.tier).bar, { name: false })}${anvilBarMult(t.tier) > 1 ? ` ×${anvilBarMult(t.tier)}` : ''}`];
    }), { sort: false });
    const slots = table(['Piece', 'Slots', 'Attack weight #', 'Defence weight #', 'Bars (forge, anvil) #'], ALL_TYPES.map(type => [`<span class="act">${icon(`item/${type}/3`, 1)}<span>${esc(TYPE_NAMES[type])}</span></span>`, type === 'Ring' || type === 'Ear' ? '2' : '1', SLOT_STATS[type].atk, SLOT_STATS[type].def, SMITHING_BAR_COST[type] ?? '–']), { sort: false });
    const scale = 1 + DROP_HIGH_RARITY_PER_TIER * 6;
    const rarities = table(['Rarity', 'Quality #', 'Bonuses #', 'Forged or crafted #', 'Regular drop #', 'Boss drop #'], RARITIES.map((r, i) => i < DROP_RARITY_WEIGHTS.boss.length
        ? [`<span style="color:${r.color}">${esc(r.name)}</span>`, `×${r.quality}`, r.affixes, r.weight, DROP_RARITY_WEIGHTS.regular[i], DROP_RARITY_WEIGHTS.boss[i]]
        : [`<span style="color:${r.color}">${esc(r.name)}</span>`, `×${r.quality}${r.perfect ? ', rolled high' : ''}`, r.affixes, '–', '–', r.id === 'primal' ? `1 Mythic in ${PRIMAL.odds}, from stage ${PRIMAL.from}` : `${pct(MYTHIC.chance, 0)} of a boss's pieces near your best, from stage ${MYTHIC.from}`]), { sort: false });
    const affixes = table(['Bonus', 'At tier 1', 'At tier 7'], AFFIXES.map(a => [esc(a.name), `${pct(a.min, 0)}–${pct(a.max, 0)}`, `${pct(a.min * 1.48, 1)}–${pct(a.max * 1.48, 1)}`]), { sort: false });
    const kinds = DROP_TYPE_WEIGHTS.reduce((s, k) => s + k.weight, 0);
    const kindRows = table(['Piece', 'Weight #'], DROP_TYPE_WEIGHTS.map(k => [`<span class="act">${icon(`item/${k.type}/2`, 1)}<span>${esc(TYPE_NAMES[k.type])}</span></span>`, pct(k.weight / kinds, 0)]), { sort: false });
    return {
        infobox: infobox({ title: 'Equipment', image: heroInSet(5, 3), caption: 'Your hero in runite', rows: [['Slots', EQUIP_SLOTS.length], ['Tiers', GEAR_TIERS.length], ['Rarities', RARITIES.length], ['Reinforce', 'the slot, no top'], ['Bag', `${BAG_SIZE} pieces`]] }),
        body: [
            help.prose('/equipment'),
            section('Gear tiers', tiers),
            section('Pieces and slots', `<p>A piece's attack and defence are ${STAT_UNIT} × its tier's power × its rarity's quality × its weights below (jewellery at ${pct(JEWEL_POWER, 0)} of the power). Up to +${MAX_UPGRADE} each level of reinforcing or upgrading adds ${pct(UPGRADE_STEP, 0)} of the piece's own figures; past it the anvil's levels multiply them by ${FORGE_STEP} each.</p>${slots}`),
            section('Rarities', `<p>A rarer piece is a little stronger and carries more bonuses. Epic and legendary drops grow likelier where the gear that drops is of a higher tier (up to ×${scale.toFixed(1)} for Abyssal).</p>${rarities}`),
            section('Bonuses', `<p>Each bonus rolls once, in its range, a little higher on better tiers.</p>${affixes}`),
            section('What drops', `<p>A regular monster leaves a piece ${pct(GEAR_DROP_CHANCE.regular, 1)} of the time and a boss on its first fall half the time. The piece is mostly of the land's own tier (sometimes one below or above), and its kind leans to what you lack: a slot you have empty is ${DROP_EMPTY_SLOT_MULT} times as likely, one behind the land's tier twice. Jewellery from the fight is only epic or legendary. A boss whose fall leaves no upgrade marks the gold ring round its node; the ${PITY_MARKS}th mark brings a sure piece for your weakest slot.</p>${kindRows}`),
            section('Upgrades and salvage', `<ul>
                <li><strong>Weapons and armour</strong> are reinforced at the anvil, their slot with no top, and rerolled there: see ${link('/skills/smithing#the-anvil', 'Smithing')} and each tier's page.</li>
                <li><strong>Jewellery</strong> is upgraded with essence (2 × the next level × its tier) and gold, and its bonuses can be reforged (essence that grows each time, up to ${MAX_REFORGE_MULT} times the first).</li>
                <li><strong>Salvaging</strong> gives essence back (more for higher tiers and rarer pieces, and half the essence spent upgrading it), and weapons and armour give bars of their metal.</li></ul>`)
        ].join('\n'),
        navbox: navbox('Gear tiers', GEAR_TIERS.map(x => tierLink(x.tier)))
    };
}

function jewelleryPage(help) {
    const rows = GEM_TIERS.map(g => {
        const gem = RESOURCES[g.gem];
        const p = gem.power * JEWEL_POWER;
        return [res(g.gem), gem.tier, ...['Ring', 'Ear', 'Neck'].map(t => Math.min(99, g.levelReq + CRAFT_SLOT_OFFSET[t])), `${stat('Neck', p, 1, 'atk')} / ${stat('Neck', p, 1, 'def')}`, `${stat('Ring', p, 1, 'atk')} / ${stat('Ring', p, 1, 'def')}`];
    });
    const best = [[1, CRAFT_MAX_RARITY], ...[...CRAFT_RARITY_LEVELS].reverse()].map(([lv, r]) => `from Crafting ${lv}: ${RARITIES.find(x => x.id === r).name.toLowerCase()}`).join('; ');
    return {
        infobox: infobox({ title: 'Jewellery', image: icon('item/Ring/4', 3), rows: [['Slots', '2 rings, an amulet, 2 earrings'], ['Made in', link('/skills/crafting', 'Crafting')], ['Settings', JEWEL_BARS.map(b => res(b.bar)).join(' ')], ['From the fight', 'epic or legendary only']] }),
        body: [
            help.prose('/equipment/jewellery'),
            section('Crafted jewellery', `<p>Crafting levels for each piece, and its attack and defence (common, silver setting; a gold setting adds ${pct(JEWEL_BARS[1].powerMult - 1, 0)}). The best quality a crafted piece can roll: ${best}.</p>${table(['Gem', 'Tier #', 'Ring #', 'Earring #', 'Amulet #', 'Amulet atk / def', 'Ring atk / def'], rows)}`)
        ].join('\n'),
        navbox: navbox('Gear tiers', GEAR_TIERS.map(x => tierLink(x.tier)))
    };
}

function uniquePage(u, help) {
    const d = DUNGEONS.find(x => x.unique === u.id);
    const atk = stat(u.type, u.power, LEGENDARY.quality, 'atk');
    const def = stat(u.type, u.power, LEGENDARY.quality, 'def');
    return {
        infobox: infobox({ title: esc(u.name), image: icon(`uniq/${u.id}`, 3), rows: [['Piece', esc(TYPE_NAMES[u.type])], ['Tier', tierLink(u.tier)], ['Quality', 'Legendary'], ['Attack', `about ${fmt(atk)}`], ['Defence', `about ${fmt(def)}`], ['From', d ? link(path.dungeon(d.id), esc(d.name), `mon/${d.boss.name}`) : '–']] }),
        lead: `A unique ${esc(TYPE_NAMES[u.type].toLowerCase())} from ${d ? link(path.dungeon(d.id), esc(d.name)) : 'a dungeon'}: ${FRAGMENTS_PER_UNIQUE} fragments from its chests make it.`,
        body: [
            help.prose(path.unique(u.id)),
            section('Bonuses', `<ul>${u.affixes.map(a => `<li>+${pct(a.value, 0)} ${esc(a.name)}</li>`).join('')}</ul><p>Its bonuses are fixed: a reroll or a reforge cannot change them. Holding it is also a record, which makes every prestige token stronger (${link('/prestige', 'Prestige')}).</p>`)
        ].join('\n'),
        navbox: navbox('Unique items', Object.values(UNIQUES).map(x => link(path.unique(x.id), esc(x.name), `uniq/${x.id}`)))
    };
}

function uniquesIndex(help) {
    const rows = Object.values(UNIQUES).map(u => {
        const d = DUNGEONS.find(x => x.unique === u.id);
        return [link(path.unique(u.id), esc(u.name), `uniq/${u.id}`, 1), esc(TYPE_NAMES[u.type]), tierLink(u.tier), u.affixes.map(a => `+${pct(a.value, 0)} ${esc(a.name)}`).join(', '), d ? link(path.dungeon(d.id), esc(d.name)) : '–'];
    });
    return { body: `${help.prose('/uniques')}\n${section('Every unique item', table(['Item', 'Piece', 'Tier', 'Bonuses', 'Dungeon'], rows))}` };
}

export default {
    pages: () => [
        { path: '/equipment', title: 'Equipment', section: 'Items', sectionPath: '/items', icon: 'item/Body/3', art: 'armory', summary: 'Weapons, armour and jewellery in Fantasy Idle: tiers, rarities, bonuses, drops, the anvil and salvage.', aliases: ['Gear', 'Weapons', 'Armour', 'Rarity', 'Affixes', 'Salvage', 'Reforge', 'Pity'], build: overviewPage },
        ...GEAR_TIERS.map(t => ({ path: path.tier(t.name), title: `${t.name} gear`, ...sec, icon: `item/Weapon/${t.tier}`, summary: `${t.name} weapons and armour: their numbers, where they drop and what the anvil asks.`, aliases: [`${t.name} set`, `${t.name} armour`, `${t.name} sword`], build: help => tierPage(t, help) })),
        { path: '/equipment/jewellery', title: 'Jewellery', ...sec, icon: 'item/Ring/4', summary: 'Rings, amulets and earrings: crafting them, their numbers and their bonuses.', aliases: ['Rings', 'Amulets', 'Earrings'], build: jewelleryPage },
        { path: '/uniques', title: 'Unique items', ...sec, icon: 'uniq/goblin_crown', summary: 'The dungeons\' unique items and their fixed bonuses.', aliases: ['Uniques'], build: uniquesIndex },
        ...Object.values(UNIQUES).map(u => ({ path: path.unique(u.id), title: u.name, section: 'Unique items', sectionPath: '/uniques', icon: `uniq/${u.id}`, summary: `${u.name}, a unique item: its bonuses and the dungeon it comes from.`, keywords: ['unique'], build: help => uniquePage(u, help) }))
    ]
};
