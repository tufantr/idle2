// The side navigation: the wiki's groups and the pages in them, each with its picture.

import { SKILLS } from '../../src/data/skills.js';
import { FEATURES } from '../../src/ui/features.js';

export const SKILL_ORDER = ['mining', 'smithing', 'woodcutting', 'firemaking', 'fishing', 'cooking', 'hunting', 'alchemy', 'farming', 'crafting', 'agility'];

export function NAV(site) {
    const page = path => {
        const p = site.pages.get(path);
        if (!p) throw new Error(`The navigation names a missing page: ${path}`);
        return { path, title: p.navTitle || p.title, icon: p.icon };
    };
    const guides = [...site.pages.values()].filter(p => p.guide && !p.hidden).sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
    return [
        { title: 'Start here', links: [page('/'), ...guides.map(g => ({ path: g.path, title: g.navTitle || g.title, icon: g.icon }))] },
        { title: 'Combat', links: ['/combat', '/zones', '/monsters', '/dungeons', '/titan', '/camp'].map(page) },
        { title: 'Skills', links: [page('/skills'), ...SKILL_ORDER.map(id => page(`/skills/${id}`))] },
        { title: 'Items', links: ['/items', '/equipment', '/equipment/jewellery', '/uniques', '/tools', '/food', '/potions'].map(page) },
        { title: 'Progression', links: ['/prestige', '/perks', '/ranks', '/trials', '/ascension', '/mastery', '/medals', '/pets', '/capes', '/looks'].map(page) },
        { title: 'The world', links: ['/places', '/daily-crate', '/shop', '/events', '/clans', '/offline', '/mini-games'].map(page) },
        { title: 'Reference', links: ['/formulas', '/xp-table', '/credits'].map(page) }
    ];
}

/** A skill's page title and picture (the game's own, as on its tab). */
export const skillIcon = id => FEATURES[id]?.icon || '';
export const skillName = id => SKILLS[id]?.name || id;
