// The world around the fight and the skills: places and unlocks, the daily crate, the Shop, the weekend
// events, clans, offline progress, mini-games; the reference pages (formulas, the XP table, credits); the
// guides' index; and the page for a link that lands nowhere.

import { UNLOCKS, PLACE_GAPS_MS, WORK_GAP_MS } from '../../src/data/unlocks.js';
import { GOLD_SHOP } from '../../src/data/perks.js';
import { EVENTS, EVENT_MILESTONES, EVENT_SHOP, EVENT_ACTIONS_PER_TOKEN, EVENT_DAILY_CAP, FESTIVAL_CLOAK_COST, EVENT_START_DAY, EVENT_LENGTH_HOURS } from '../../src/data/events.js';
import { DAILY_INTERVAL_MS, DAILY_MAX_BANKED, GREAT_CRATE_EVERY, CRATE_GOLD_KILLS, CRATE_PICKS, CRATE_PICK_QTY, CRATE_ESSENCE_PER_TIER, GREAT_CRATE_GOLD_MULT, GREAT_CRATE_REST_MULT } from '../../src/systems/daily.js';
import { enemyForStage, goldPerKillAtStage, tokensForStage, combatXpForKill, goldForKill, BALANCE, MAX_MITIGATION } from '../../src/core/formulas.js';
import { BASE } from '../../src/core/modifiers.js';
import { xpForLevel, MAX_LEVEL } from '../../src/core/xp.js';
import { sellValue } from '../../src/data/resources.js';
import { STAT_UNIT } from '../../src/data/items.js';
import { PET_BASE } from '../../src/data/pets.js';
import { MASTERY_XP_DIVISOR } from '../../src/data/mastery.js';
import { CAMP_PRICE_KILLS } from '../../src/data/camp.js';
import { FEATURES, EVENT_ART } from '../../src/ui/features.js';
import { path, res, resList, icon, link, table, infobox, section, tiles, navbox, fmt, pct, time, esc, paintStyle } from '../lib/ui.mjs';

const world = { section: 'The world', sectionPath: '/places' };
const ref = { section: 'Reference', sectionPath: '/formulas' };
const PLACE_PAGE = { combat: '/combat', inventory: '/equipment', prestige: '/prestige', dungeons: '/dungeons', shop: '/shop', achievements: '/medals', clan: '/clans', events: '/events' };
const placePage = id => PLACE_PAGE[id] || path.skill(id);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function placesPage(help) {
    const rows = UNLOCKS.map(u => [link(placePage(u.id), esc(FEATURES[u.id]?.name || u.id), FEATURES[u.id]?.icon), u.always ? 'open from the start' : esc(u.hint), u.always ? '' : u.pace ? 'in turn, after a breather' : `within ${time(WORK_GAP_MS)} of the work`]);
    const gaps = table(['Places open so far #', 'Breather before the next #'], PLACE_GAPS_MS.map((ms, i) => [i === PLACE_GAPS_MS.length - 1 ? `${i}+` : i, time(ms)]), { sort: false });
    return {
        body: `${help.prose('/places')}\n${section('Every place', table(['Place', 'How it opens', 'When'], rows, { sort: false }))}\n${section('Breathers', `<p>A place reached by climbing waits for a breather of attended time since the last place; a place earned by work answers within ${time(WORK_GAP_MS)}.</p>${gaps}`)}`
    };
}

function cratePage(help) {
    return {
        infobox: infobox({ title: 'Daily crate', image: icon('crate', 3), rows: [['A new crate', `every ${time(DAILY_INTERVAL_MS)}`], ['Waiting at most', DAILY_MAX_BANKED], ['Great crate', `every ${GREAT_CRATE_EVERY}th opened`]] }),
        body: `${help.prose('/daily-crate')}\n${section('Crate contents', table(['', 'A crate', 'A great crate'], [
            ['Gold', `${CRATE_GOLD_KILLS} kills' worth at your best stage`, `${GREAT_CRATE_GOLD_MULT} times as much`],
            ['Materials', `${CRATE_PICKS} picks of your best stage's land, ${CRATE_PICK_QTY} each`, `${GREAT_CRATE_REST_MULT} times as many`],
            ['Essence', `${CRATE_ESSENCE_PER_TIER} × the land's richness tier`, `${GREAT_CRATE_REST_MULT} times as much`],
            ['Gem', 'the best gem of the land\'s tier', 'and one of the next tier']
        ], { sort: false }))}`
    };
}

function shopPage(help) {
    const stages = [10, 50, 100, 200, 300];
    const rows = GOLD_SHOP.map(e => [link(`/shop#${e.id}`, esc(e.name)), resList(e.gives), e.costKills, ...stages.map(s => fmt(Math.ceil(e.costKills * goldPerKillAtStage(s)))), e.craft ? `Crafting ${e.craft[0]}–${e.craft[1]}` : 'always']);
    const anchors = GOLD_SHOP.map(e => `<span id="${e.id}"></span>`).join('');
    return {
        infobox: infobox({ title: 'Shop', image: icon('gold', 3), rows: [['Prices', 'kills\' worth of gold at your best stage'], ['Also', link('/perks', 'Perks')]] }),
        body: `${help.prose('/shop')}\n${section('Supplies', `${anchors}<p>The price in gold at a few best stages:</p>${table(['Supply', 'Gives', 'Kills #', ...stages.map(s => `Stage ${s} #`), 'Shown'], rows)}`)}`
    };
}

function eventsPage(help) {
    const rows = EVENTS.map(e => [`<span id="${e.id.replace(/_/g, '-')}" class="act">${icon(EVENT_ART[e.id], 1)} <strong>${esc(e.name)}</strong></span>`, esc(e.desc), `<span class="swatch" style="background:${e.cloak}"></span>`]);
    const ms = table(['Tokens earned in the event #', 'Reward'], EVENT_MILESTONES.map(m => [m.tokens, resList(m.reward)]), { sort: false });
    const shop = table(['Item', 'Gives', 'Tokens #'], [...EVENT_SHOP.map(e => [esc(e.name), resList(e.gives), e.cost]), ['The event\'s cloak', 'a look for your hero', FESTIVAL_CLOAK_COST]], { sort: false });
    return {
        infobox: infobox({ title: 'Weekend events', image: icon('res/starfruit', 3), rows: [['When', `${DAYS[EVENT_START_DAY]} 00:00 UTC, for ${EVENT_LENGTH_HOURS} hours`], ['A festival token', `every ${EVENT_ACTIONS_PER_TOKEN} actions or kills`], ['At most', `${EVENT_DAILY_CAP} a day`]] }),
        body: `${help.prose('/events')}\n${section('The festivals', table(['Event', 'Bonuses', 'Cloak'], rows, { sort: false }))}\n${section('Milestones', ms)}\n${section('The event shop', shop)}`
    };
}

function formulasPage(help) {
    const e = BALANCE.enemy;
    const r = BALANCE.rewards;
    const p = BALANCE.prestige;
    const stages = [1, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000];
    const enemy = table(['Stage #', 'Health #', 'Attack #', 'Attacks every #', 'Boss health #', 'Gold a kill #'], stages.map(s => {
        const m = enemyForStage(s % 10 === 0 ? s - 1 : s);
        const b = enemyForStage(Math.ceil(s / 10) * 10);
        return [s, fmt(m.hp), fmt(m.atk), time(m.interval), fmt(b.hp), fmt(goldForKill(m))];
    }), { sort: false });
    const f = (title, lines) => `<h3>${title}</h3><pre class="formula">${lines.map(esc).join('\n')}</pre>`;
    return {
        body: [
            help.prose('/formulas'),
            section('Monsters', f('Health and attack', [
                `health(stage) = ${e.baseHp} × ${e.hpGrowth}^(stage − 1)                 up to stage 100`,
                `              then × ${e.abyssHpGrowth} a stage to ${e.deepFrom}, then × ${e.deepHpGrowth} a stage`,
                `attack(stage) = ${e.baseAtk} × ${e.atkGrowth}^(stage − 1)                  (× ${e.abyssAtkGrowth}, then × ${e.deepAtkGrowth}, likewise)`,
                `a boss: × ${e.bossHpMult} health, × ${e.bossAtkMult} attack`,
                `attacks every max(${e.minInterval}, ${e.baseInterval} − ${e.intervalPerStage} × stage) ms`,
                `stages 1–${e.ease.to}: a gentler start (attack from ${pct(e.ease.atk, 0)}, health from ${pct(e.ease.hp, 0)} of the figures, rising evenly)`
            ]) + enemy),
            section('Damage', f('A hit', [
                `damage taken = attack² ÷ (attack + defence), at least ${pct(1 - MAX_MITIGATION, 0)} of the attack`,
                `your attack = (${BASE.unarmedAtk} + gear attack) × (1 + attack bonuses) × tokens × camp`,
                `your health = (${BASE.baseHp} + ${BASE.hpPerCombatLevel} × (combat level − 1) + ${BASE.hpPerDef} × gear defence) × (1 + health bonuses) × tokens × camp`,
                `attacks every ${BASE.baseAttackInterval} ms ÷ (1 + attack speed), never faster than ${BASE.minAttackInterval} ms`,
                `crit: ${pct(BASE.baseCritChance, 0)} chance, × ${BASE.baseCritDmg} damage, plus bonuses (caps: crit ${pct(BASE.caps.critChance, 0)}, dodge ${pct(BASE.caps.dodge, 0)}, lifesteal ${pct(BASE.caps.lifesteal, 0)}, attack speed +${pct(BASE.caps.attackSpeed, 0)})`,
                `a strike: ${pct(BALANCE.combat.manualHitMult, 0)} of an attack; the combo adds ${pct(BALANCE.combat.comboDmgPerStack, 0)} a stack, up to ${BALANCE.combat.comboMax} stacks`
            ])),
            section('Rewards', f('A kill', [
                `gold = the monster's health × ${r.goldPerHp} (a boss × ${r.bossGoldMult}, a gilded monster × ${r.gildedGoldMult})`,
                `combat XP = ${r.xpBase} × stage^${r.xpExp} (a boss × ${r.bossXpMult}), tripled at combat level 1 and back to normal by level ${r.fastStart.below},`,
                `            divided from level ${r.xpPace.from} on, up to ÷${r.xpPace.slow} at ${r.xpPace.to}`
            ]) + f('A prestige', [
                `tokens = floor(((best stage of the run − ${p.tokenOffset}) ÷ ${p.tokenDivisor})^${p.tokenExp})`,
                `each token: +${pct(BASE.tokenAtk, 1)} attack and defence, +${pct(BASE.tokenHp, 1)} health, × ${BASE.recordMult} for each record`,
                `next run starts at floor(best stage × ${p.startStageFraction})`,
                `skill points: ${p.spPerPrestige} for a run reaching ${pct(p.fullRunFraction, 0)} of your best, plus 1 for every ${p.spStageStep} stages of your best (each once)`
            ])),
            section('Skills and items', f('Skills', [
                `XP for level L = floor(¼ × Σ (l + 300 × 2^(l/7))) for l = 1 … L − 1   (the RuneScape table: see the XP table)`,
                `action time = base time ÷ (1 + speed bonuses), at least 0.25 s`,
                `mastery level L needs the XP of skill level L ÷ ${MASTERY_XP_DIVISOR}, earned at one mastery XP a second of base action time`,
                `a pet's chance per action = action seconds × skill level ÷ ${fmt(PET_BASE)}`
            ]) + f('Gear and prices', [
                `a piece's attack or defence = ${STAT_UNIT} × tier power × rarity quality × slot weight (± 5%)`,
                `the camp: a level costs base × growth^level, or ${CAMP_PRICE_KILLS} × a kill's gold at your best stage × growth^level when that is higher`,
                `the Shop: kills × a kill's gold at your best stage`,
                `selling: a category's base price × 1.6^(tier − 1) (an ore ${sellValue('copper_ore')} gold at tier 1)`
            ]))
        ].join('\n')
    };
}

function xpTablePage(help) {
    const rows = [];
    for (let l = 1; l <= MAX_LEVEL; l++) rows.push([l, fmt(xpForLevel(l)), l < MAX_LEVEL ? fmt(xpForLevel(l + 1) - xpForLevel(l)) : '–']);
    return { body: `${help.prose('/xp-table')}\n<p>The same table for every skill, combat included. Level 92 is about half the XP of level 99.</p>\n${table(['Level #', 'Total XP #', 'XP to the next level #'], rows, { sort: false, cls: 'compact' })}`, toc: false };
}

function creditsPage() {
    return {
        body: `<p>Fantasy Idle is a browser game; this wiki is made from its own data and pictures.</p>
        ${section('Pictures', `<ul>
            <li>The pixel art (monsters, items, the hero and his looks, pets) is the tile set of <a href="https://github.com/crawl/crawl" rel="noopener">Dungeon Crawl Stone Soup</a>, released into the public domain (CC0 1.0), some of it from the public-domain <a href="http://rltiles.sf.net" rel="noopener">RLTiles</a>. Ores, bars, logs, fish, crops, some tools, obstacles and small icons are drawn in the same manner for the game.</li>
            <li>The paintings of the places, dungeons, the Abyss's strata, the world map and the action cards are made with Google Gemini (AI-generated) for the game.</li></ul>`)}
        ${section('Type and sound', `<ul><li>The type is <a href="https://fonts.google.com/specimen/Cinzel" rel="noopener">Cinzel</a> and <a href="https://fonts.google.com/specimen/Outfit" rel="noopener">Outfit</a>, from Google Fonts (SIL Open Font License).</li><li>The game's sounds are made in the browser as it plays; there are no sound files.</li></ul>`)}`
    };
}

function guidesIndex(help) {
    const guides = help.pages().filter(p => p.guide && !p.hidden).sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
    return { body: `${help.prose('/guides')}\n${tiles(guides.map(g => ({ href: g.path, title: esc(g.title), pic: icon(g.icon, 2), note: esc(g.summary || '') })), 'wide')}`, toc: false };
}

function notFound() {
    return { body: `<p>There is no page here. Try the search box above, or start from one of these:</p>${tiles([
        { href: '/', title: 'The main page', pic: icon('item/Weapon/3', 2) }, { href: '/skills', title: 'Skills', pic: icon('tool/pickaxe', 2) },
        { href: '/items', title: 'Items', pic: icon('res/copper_ore', 2) }, { href: '/zones', title: 'Zones', pic: icon('mon/Goblin Chieftain', 2) }])}`, toc: false };
}

export default {
    pages: () => [
        { path: '/places', title: 'Places and unlocks', ...world, icon: 'item/Shield/2', art: 'map', summary: 'When each place of the game opens, and why they come one at a time.', aliases: ['Unlocks', 'Places', 'Unlock order'], build: placesPage },
        { path: '/daily-crate', title: 'Daily crate', ...world, icon: 'crate', art: 'vault', summary: 'The daily supply crate: how often it comes and what is inside.', aliases: ['Crate', 'Great crate', 'Daily reward'], build: cratePage },
        { path: '/shop', title: 'Shop', ...world, icon: 'gold', art: 'market', summary: 'The Shop\'s supplies and their prices.', aliases: ['Supplies', 'Gold shop', 'Gem pouches'], build: shopPage },
        { path: '/events', title: 'Weekend events', ...world, icon: 'res/starfruit', art: 'festival', summary: 'The weekend festivals: their bonuses, tokens, milestones, shop and cloaks.', aliases: ['Events', 'Festivals', 'Festival tokens', ...EVENTS.map(e => e.name)], build: eventsPage },
        { path: '/clans', title: 'Clans and leaderboards', ...world, icon: 'item/Shield/4', art: 'clanhall', summary: 'Clans, the weekly clan boss and the leaderboards.', aliases: ['Clans', 'Clan', 'Leaderboards', 'Clan boss'] },
        { path: '/offline', title: 'Offline progress and saves', ...world, icon: 'icon/away', summary: 'What your hero does while you are away, and how the game saves.', aliases: ['Offline progress', 'Saves', 'Cloud save', 'Welcome back'] },
        { path: '/mini-games', title: 'Mini-games and Focus', ...world, icon: 'res/topaz', summary: 'The mini-games, Focus and the bonfire.', aliases: ['Mini-games', 'Focus', 'Idle bonus'] },
        { path: '/formulas', title: 'Formulas', ...ref, icon: 'icon/dice', summary: 'The formulas behind Fantasy Idle: monsters, damage, rewards, prestige, skills and prices.', aliases: ['Math', 'Damage formula'], build: formulasPage },
        { path: '/xp-table', title: 'XP table', ...ref, icon: 'icon/xp', summary: 'The XP needed for every level from 1 to 99.', aliases: ['Experience table', 'Levels', 'XP'], build: xpTablePage },
        { path: '/credits', title: 'Credits', ...ref, icon: 'crown', summary: 'Where the pictures, type and sounds come from.', toc: false, build: creditsPage },
        { path: '/guides', title: 'Guides', section: 'Guides', sectionPath: '/guides', icon: 'tool/rod', summary: 'Guides for new and returning players.', build: guidesIndex },
        { path: '/404', title: 'Page not found', section: '', icon: '', summary: 'This page does not exist.', hidden: true, toc: false, build: notFound }
    ]
};
