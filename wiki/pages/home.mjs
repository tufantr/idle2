// The main page: the game's meadow and title, then every part of the wiki as pictures to click.

import { SKILLS } from '../../src/data/skills.js';
import { RESOURCES } from '../../src/data/resources.js';
import { BESTIARY_SIZE } from '../../src/data/bestiary.js';
import { DUNGEONS } from '../../src/data/dungeons.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { FEATURES } from '../../src/ui/features.js';
import { SKILL_ORDER, skillIcon } from './nav.mjs';
import { path, icon, tiles, section, esc, paintStyle, hero, sprite } from '../lib/ui.mjs';

function home(help) {
    const page = p => help.site.pages.get(p);
    const tile = (p, art = null, note = '') => { const pg = page(p); return { href: p, title: esc(pg.title), pic: icon(pg.icon, 2), note, art: art || (pg.art ? paintStyle(pg.art, pg.focus || 'center 60%') : '') }; };
    const guides = help.pages().filter(p => p.guide && !p.hidden).sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
    const gameUrl = 'https://fantasy-idle.vercel.app';
    const heroBlock = `<section class="home-hero" style="${paintStyle('meadow', 'center 70%')}">
        <div class="home-figures" aria-hidden="true">${hero(4)}${sprite('mon/Slime', { scale: 3 })}</div>
        <div class="home-text">
            <p class="home-kicker">The wiki of</p>
            <p class="home-title">Fantasy Idle</p>
            <p class="home-tag">Fight monsters, gather, forge your gear. Everything about the game, read from the game itself.</p>
            <p class="home-actions"><a class="btn" href="/guides/getting-started">New here? Start here</a><a class="btn ghost" href="${gameUrl}" rel="noopener">Play the game</a></p>
        </div>
    </section>`;
    const counts = `<p class="home-counts">${SKILL_ORDER.length + 1} skills · ${Object.keys(RESOURCES).length} items · ${BESTIARY_SIZE} monsters · ${DUNGEONS.length} dungeons · ${ACHIEVEMENTS.length} medals · ${help.site.pages.size} pages</p>`;
    return {
        toc: false,
        body: [
            heroBlock,
            counts,
            help.prose('/'),
            guides.length ? section('Guides', tiles(guides.map(g => ({ href: g.path, title: esc(g.title), pic: icon(g.icon, 2), note: esc(g.summary || '') })), 'wide')) : '',
            section('Skills', tiles([...SKILL_ORDER.map(id => ({ href: path.skill(id), title: esc(SKILLS[id].name), pic: icon(skillIcon(id), 2), art: FEATURES[id]?.art ? paintStyle(FEATURES[id].art, FEATURES[id].focus || 'center 60%') : '' })),
                { href: '/combat', title: 'Combat', pic: icon('item/Weapon/3', 2), art: paintStyle('meadow') }], 'painted')),
            section('Combat', tiles(['/combat', '/zones', '/monsters', '/dungeons', '/titan', '/camp'].map(p => tile(p)), 'painted')),
            section('Items', tiles(['/items', '/equipment', '/equipment/jewellery', '/uniques', '/tools', '/food', '/potions'].map(p => tile(p)))),
            section('Progression', tiles(['/prestige', '/perks', '/ranks', '/trials', '/ascension', '/mastery', '/medals', '/pets', '/capes', '/looks'].map(p => tile(p)))),
            section('The world', tiles(['/places', '/daily-crate', '/shop', '/events', '/clans', '/offline', '/mini-games'].map(p => tile(p)))),
            section('Reference', tiles(['/formulas', '/xp-table', '/credits'].map(p => tile(p))))
        ].filter(Boolean).join('\n')
    };
}

export default { pages: () => [{ path: '/', title: 'Fantasy Idle Wiki', section: '', icon: 'item/Weapon/3', summary: 'The Fantasy Idle wiki: skills, items, monsters, zones, dungeons, prestige, guides and formulas, read from the game\'s own data.', toc: false, build: home }] };
