// Progression: prestige and its tokens, perks, ranks, Trials, Ascension, mastery, medals, pets, capes and
// the hero's looks. The tables are the game's own numbers.

import { tokensForStage, prestigeStartStage, BALANCE } from '../../src/core/formulas.js';
import { BASE } from '../../src/core/modifiers.js';
import { xpForLevel, XP_FOR_MAX_LEVEL } from '../../src/core/xp.js';
import { PERKS } from '../../src/data/perks.js';
import { RANKS } from '../../src/data/ranks.js';
import { TRIALS, TRIALS_FROM, TRIAL_TIERS, TRIAL_STEP, trialTarget } from '../../src/data/trials.js';
import { ASCEND_FROM, STAR_BASE, STARS_PER_DECADE, STAR_TOKEN_GAIN, ASCEND_REST_MS, starsFor, starGain } from '../../src/data/ascension.js';
import { MASTERY_PER_LEVEL, MASTERY_CHECKPOINTS, MASTERY_XP_DIVISOR, MASTERY_MAX_LEVEL, MASTERY_SKILLS, masteryActions } from '../../src/data/mastery.js';
import { ACHIEVEMENTS, ACHIEVEMENT_GLOBAL_BONUS } from '../../src/data/achievements.js';
import { PETS, PET_BASE, COMBAT_PET_SECONDS } from '../../src/data/pets.js';
import { CAPES, FESTIVAL_CLOAKS } from '../../src/data/capes.js';
import { EVENTS, FESTIVAL_CLOAK_COST } from '../../src/data/events.js';
import { LOOKS, lookForMedal } from '../../src/data/looks.js';
import { SKILLS } from '../../src/data/skills.js';
import { medalArt } from '../../src/ui/render.js';
import { skillIcon } from './nav.mjs';
import { path, icon, link, table, infobox, section, tiles, navbox, fmt, pct, time, esc, heroSprite } from '../lib/ui.mjs';

const sec = { section: 'Progression', sectionPath: '/prestige' };
const skillLink = id => (id === 'combat' ? link('/combat', 'Combat', 'item/Weapon/3') : link(path.skill(id), esc(SKILLS[id].name), skillIcon(id)));
const navAll = () => navbox('Progression', [['/prestige', 'Prestige', 'res/essence'], ['/perks', 'Perks', 'perk/knight'], ['/ranks', 'Ranks', 'hero/cloaks/green'], ['/trials', 'Trials', 'mon/Mountain Troll'], ['/ascension', 'Ascension', 'token'], ['/mastery', 'Mastery', 'res/diamond'], ['/medals', 'Medals', 'crown'], ['/pets', 'Pets', 'pet/fang'], ['/capes', 'Skill capes', 'hero/capes/combat'], ['/looks', 'Hero looks', '']].map(([h, t, i]) => link(h, t, i)));
const heroWith = (extra, scale = 2) => heroSprite({ equipped: {}, prestige: { count: 0 }, hero: {}, ...extra }, { scale });

function prestigePage(help) {
    const stages = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500];
    const step = BALANCE.prestige.spStageStep;
    const rows = stages.map(s => [s, fmt(tokensForStage(s)), prestigeStartStage(s), Math.floor(s / step)]);
    const tokens = [10, 50, 100, 500, 1000, 5000, 10000, 100000];
    const tokenRows = tokens.map(t => [fmt(t), `+${pct(BASE.tokenAtk * t, 1)}`, `+${pct(BASE.tokenHp * t, 1)}`]);
    return {
        infobox: infobox({ title: 'Prestige', image: icon('res/essence', 3), rows: [['Opens', 'after the stage-20 boss'], ['From', `stage ${BALANCE.prestige.minStage}`], ['A run lasts', `${BALANCE.prestige.minRunMs / 60000} minutes (not the first)`], ['Each token', `+${pct(BASE.tokenAtk, 1)} attack and defence`], ['Auto', `after ${BALANCE.prestige.autoAfter} prestiges or ${BALANCE.prestige.autoAfterMs / 3600000} hours`]] }),
        body: [
            help.prose('/prestige'),
            section('Tokens by stage', `<p>What a run that reached each stage pays, where the next run starts, and the skill points that best stage has earned in all (one for every ${step} stages, each paid once, on top of the one each full run brings). Token gain bonuses (medals, Stars, a unique) raise the tokens.</p>${table(['Best stage of the run #', 'Tokens #', 'Next run starts at #', 'Stage skill points #'], rows, { sort: false })}`),
            section('What tokens give', `<p>Tokens are held, never spent. Before records (each multiplies all of it by ${BASE.recordMult}):</p>${table(['Tokens held #', 'Attack and defence #', 'Health #'], tokenRows, { sort: false })}`)
        ].join('\n'),
        navbox: navAll()
    };
}

/** What a perk gives at its most: every number in its line times its levels. */
function perkMax(p) {
    return p.desc.replace(/\+(\d+(?:\.\d+)?)/g, (_, n) => `+${fmt(Number(n) * p.max)}`).replace(/ per level$/, '');
}

function perksPage(help) {
    const rows = PERKS.map(p => [`<span id="${p.id}" class="act">${icon(`perk/${p.id}`, 1)} ${esc(p.name)}</span>`, esc(p.desc), p.max, perkMax(p)]);
    return {
        infobox: infobox({ title: 'Perks', image: icon('perk/knight', 3), rows: [['Cost', 'one skill point a level'], ['Kept', 'for good'], ['Perks', PERKS.length]] }),
        body: `${help.prose('/perks')}\n${section('Every perk', table(['Perk', 'Each level', 'Levels #', 'At most'], rows, { sort: false }))}`,
        navbox: navAll()
    };
}

function ranksPage(help) {
    const rows = RANKS.map(r => [heroWith({ prestige: { count: r.prestiges } }, 2), `<strong>${esc(r.name)}</strong>`, fmt(r.prestiges), esc(r.cloak)]);
    return { body: `${help.prose('/ranks')}\n${section('Every rank', table(['', 'Rank', 'Prestiges #', 'Cloak'], rows, { sort: false, cls: 'tall' }))}`, navbox: navAll() };
}

function trialsPage(help) {
    const rows = TRIALS.map(t => [`<span id="${t.id.replace(/_/g, '-')}" class="act">${icon(t.icon, 1)} ${esc(t.name)}</span>`, esc(t.rule), ...Array.from({ length: TRIAL_TIERS }, (_, i) => trialTarget(t, i + 1))]);
    return {
        infobox: infobox({ title: 'Trials', image: icon('mon/Mountain Troll', 3), rows: [['Open from', `best stage ${TRIALS_FROM}`], ['Tiers', `${TRIAL_TIERS}, ${TRIAL_STEP} stages apart`], ['A tier cleared', `a record (tokens ×${BASE.recordMult})`]] }),
        body: `${help.prose('/trials')}\n${section('Every Trial', `<p>The stage each tier asks you to reach in a run under the Trial's rule:</p>${table(['Trial', 'Rule', ...Array.from({ length: TRIAL_TIERS }, (_, i) => `Tier ${i + 1} #`)], rows)}`)}`,
        navbox: navAll()
    };
}

function ascensionPage(help) {
    const tokens = [STAR_BASE, 2000, 5000, 10000, 30000, 100000, 300000, 1e6, 1e7, 1e8];
    const rows = tokens.map(t => [fmt(t), starsFor(t), `×${starGain(starsFor(t)).toFixed(2)}`]);
    return {
        infobox: infobox({ title: 'Ascension', image: icon('token', 3), rows: [['Opens', `best stage ${ASCEND_FROM}`], ['Gives up', 'every token'], ['Pays', `${STARS_PER_DECADE} Stars a tenfold past ${fmt(STAR_BASE)}`], ['Each Star', `+${pct(STAR_TOKEN_GAIN, 0)} tokens a prestige`], ['Rest', time(ASCEND_REST_MS)]] }),
        body: `${help.prose('/ascension')}\n${section('Stars', `<p>Stars for the tokens given up in a first Ascension, and what they make every prestige pay (Stars add up across Ascensions):</p>${table(['Tokens given up #', 'Stars #', 'Prestiges then pay #'], rows, { sort: false })}`)}`,
        navbox: navAll()
    };
}

function masteryPage(help) {
    const levels = [1, 10, 25, 50, 75, 90, 99];
    const rows = levels.map(l => [l, `+${pct(MASTERY_PER_LEVEL.speed * (l - 1), 1)}`, `+${pct(MASTERY_PER_LEVEL.double * (l - 1), 2)}`, `+${pct(MASTERY_PER_LEVEL.preserve * (l - 1), 1)}`, time(xpForLevel(l) / MASTERY_XP_DIVISOR * 1000)]);
    const check = MASTERY_CHECKPOINTS.map(c => [pct(c.at, 0), `+${pct(c.speed, 0)}`]);
    const skills = MASTERY_SKILLS.filter(id => id !== 'combat').map(id => [skillLink(id), masteryActions(id).length]);
    return {
        infobox: infobox({ title: 'Mastery', image: icon('res/diamond', 3), rows: [['Levels', `1–${MASTERY_MAX_LEVEL}`], ['Per level', `+${pct(MASTERY_PER_LEVEL.speed, 1)} speed`], ['Kept', 'for good']] }),
        body: [
            help.prose('/mastery'),
            section('Bonuses by level', `<p>What one action's mastery gives at each level (the double chance for actions that make something, the saving for actions with ingredients), and how long it takes, counted in that action's own base time:</p>${table(['Mastery level #', 'Speed #', 'Double chance #', 'Ingredients kept #', 'Time spent #'], rows, { sort: false })}`),
            section('Checkpoints', `<p>A skill's mastery is the levels gained over all its actions. At these shares of its whole, every action of the skill gets faster for good:</p>${table(['Share of the whole #', 'Speed #'], check, { sort: false })}`),
            section('Actions with a mastery', table(['Skill', 'Actions #'], skills))
        ].join('\n'),
        navbox: navAll()
    };
}

function medalsPage(help) {
    const rows = ACHIEVEMENTS.map(a => {
        const look = lookForMedal(a.id);
        return [`<span id="${a.id}" class="act">${medalArt(a, 1)} <strong>${esc(a.name)}</strong></span>`, esc(a.desc), esc(a.reward) + (look ? `<br><small>and a look: ${esc(look.name)}</small>` : ''), a.secret ? 'secret' : ''];
    });
    return {
        infobox: infobox({ title: 'Medals', image: icon('crown', 3), rows: [['Medals', ACHIEVEMENTS.length], ['Every medal', `+${pct(ACHIEVEMENT_GLOBAL_BONUS, 0)} attack, defence and skill speed`], ['Secret', ACHIEVEMENTS.filter(a => a.secret).length]] }),
        body: `${help.prose('/medals')}\n${section('Every medal', table(['Medal', 'For', 'Reward', ''], rows))}`,
        navbox: navAll()
    };
}

function petsPage(help) {
    const hours = level => Math.round(PET_BASE / level / 3600);
    const rows = PETS.map(p => {
        const wait = p.skill === 'combat' ? `${fmt(Math.round(PET_BASE / COMBAT_PET_SECONDS / 50))} / ${fmt(Math.round(PET_BASE / COMBAT_PET_SECONDS / 99))} kills`
            : p.skill === 'farming' ? 'per harvest, by growing time' : `${fmt(hours(50))} h / ${fmt(hours(99))} h`;
        return [`<span id="${p.id}" class="act">${icon(`pet/${p.id}`, 2)} <strong>${esc(p.name)}</strong></span>`, skillLink(p.skill), esc(p.desc), wait];
    });
    return {
        infobox: infobox({ title: 'Pets', image: icon('pet/fang', 3), rows: [['Pets', PETS.length], ['Kept', 'for good'], ['Chance', 'seconds × level ÷ 25,000,000']] }),
        body: `${help.prose('/pets')}\n${section('Every pet', `<p>The last column is the average wait at skill level 50 and at 99.</p>${table(['Pet', 'Skill', 'Bonus', 'Average wait'], rows, { cls: 'tall' })}`)}`,
        navbox: navAll()
    };
}

function capesPage(help) {
    const rows = CAPES.map(c => [heroWith({ hero: { cape: c.skill }, skills: { [c.skill]: { xp: XP_FOR_MAX_LEVEL } } }, 2), skillLink(c.skill), esc(c.perk)]);
    const fest = FESTIVAL_CLOAKS.map(c => {
        const ev = EVENTS.find(e => e.id === c.event);
        return [heroWith({ hero: { cape: c.skill }, events: { cloaks: { [c.event]: true } } }, 2), link(`/events#${c.event.replace(/_/g, '-')}`, esc(ev.name)), `${FESTIVAL_CLOAK_COST} festival tokens`];
    });
    return {
        body: `${help.prose('/capes')}\n${section('Skill capes', table(['', 'Skill', 'Bonus'], rows, { cls: 'tall' }))}\n${section('Festival cloaks', `<p>A look only, sold in each weekend event's shop while it runs:</p>${table(['', 'Event', 'Price'], fest, { sort: false, cls: 'tall' })}`)}`,
        navbox: navAll()
    };
}

function looksPage(help) {
    const open = LOOKS.filter(l => !l.medal);
    const earned = LOOKS.filter(l => l.medal);
    const pic = l => heroWith({ hero: { look: l.id } }, 3);
    return {
        body: `${help.prose('/looks')}\n${section('Open to everyone', `<div class="gallery">${open.map(l => `<figure>${pic(l)}</figure>`).join('')}</div>`)}\n${section('Earned with a medal', `<div class="gallery">${earned.map(l => {
            const a = ACHIEVEMENTS.find(x => x.id === l.medal);
            return `<figure>${pic(l)}<figcaption>${esc(l.name)}<br><a href="/medals#${a.id}">${esc(a.name)}</a></figcaption></figure>`;
        }).join('')}</div>`)}`,
        navbox: navAll()
    };
}

export default {
    pages: () => [
        { path: '/prestige', title: 'Prestige', ...sec, icon: 'res/essence', art: 'shrine', summary: 'Prestige in Fantasy Idle: tokens, records, skill points, the first prestige and Auto.', aliases: ['Tokens', 'Prestige tokens', 'Auto prestige', 'Records', 'Skill points'], build: prestigePage },
        { path: '/perks', title: 'Perks', ...sec, icon: 'perk/knight', art: 'library', summary: 'Perks bought with skill points, and what each gives.', aliases: PERKS.map(p => p.name), build: perksPage },
        { path: '/ranks', title: 'Ranks', ...sec, icon: 'hero/cloaks/green', summary: 'The hero\'s ranks and their cloaks, earned by prestiging.', aliases: ['Cloaks', ...RANKS.map(r => r.name)], build: ranksPage },
        { path: '/trials', title: 'Trials', ...sec, icon: 'mon/Mountain Troll', art: 'citadel', summary: 'Trials: runs under one hard rule, for records that last.', aliases: ['Laurels', 'Weekly Trial', ...TRIALS.map(t => t.name)], build: trialsPage },
        { path: '/ascension', title: 'Ascension', ...sec, icon: 'token', art: 'skyreach', summary: 'Ascension: give up every token for Stars that make every prestige pay more.', aliases: ['Stars', 'Ascend'], build: ascensionPage },
        { path: '/mastery', title: 'Mastery', ...sec, icon: 'res/diamond', summary: 'Mastery: every action gets better the more you do it.', aliases: ['Mastery checkpoints'], build: masteryPage },
        { path: '/medals', title: 'Medals', ...sec, icon: 'crown', art: 'hall', summary: 'Every medal in Fantasy Idle and the bonus it brings.', aliases: ['Achievements', 'Hall'], keywords: ACHIEVEMENTS.filter(a => !a.secret).map(a => a.name), build: medalsPage },
        { path: '/pets', title: 'Pets', ...sec, icon: 'pet/fang', summary: 'Every pet, its bonus, and how long it takes to find.', aliases: PETS.map(p => p.name), build: petsPage },
        { path: '/capes', title: 'Skill capes', ...sec, icon: 'hero/capes/combat', summary: 'The cape each skill earns at level 99, and the festival cloaks.', aliases: ['Capes', 'Festival cloaks', 'Skillcapes'], build: capesPage },
        { path: '/looks', title: 'Hero looks', ...sec, icon: 'hero/look/gold/base', summary: 'How your hero can look, and the looks earned with medals.', aliases: ['Looks', 'Appearance'], build: looksPage }
    ]
};
