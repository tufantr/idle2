// All DOM rendering. Renderers are pure functions of (game, ui) returning HTML strings; the
// active tab is re-rendered on a short interval, and a few live elements (progress bars, HP)
// are patched every frame. Nothing in here mutates game state — handlers call window.FI.

import { SKILLS, SKILL_IDS, NON_COMBAT_SKILLS, GATHERING_SKILLS } from '../data/skills.js';
import { RESOURCES, orderedByTier, foodsByHealing, sellValue } from '../data/resources.js';
import { SMELTING_RECIPES, FORGE_METALS, JEWEL_BARS, GEM_TIERS, TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER } from '../data/workshop.js';
import { anvilCost, onAnvil } from '../systems/anvil.js';
import { SMITHING_TYPES, CRAFTING_TYPES, SMITHING_BAR_COST, TYPE_NAMES, TYPE_ICONS, EQUIP_SLOTS, TYPE_SLOTS, RARITIES, MAX_UPGRADE, UPGRADE_STEP, TIER_WEAR_LEVEL, AUTO_SALVAGE_OPTIONS, GEAR_TIERS, CODEX_TYPES, CODEX_SIZE } from '../data/items.js';
import { PERKS, GOLD_SHOP } from '../data/perks.js';
import { ACHIEVEMENTS, ACHIEVEMENT_GLOBAL_BONUS, medalShown, achievementById } from '../data/achievements.js';
import { isUnlocked, nextGoals, goalProgress } from '../data/unlocks.js';
import { ZONES, zoneForStage, STAGES_PER_ZONE } from '../data/zones.js';
import { levelProgress, levelForXp, MAX_LEVEL } from '../core/xp.js';
import { actionInterval, skillLevel, bonfireBonus, bonfireLit } from '../core/modifiers.js';
import { describeAffix, itemSellValue, tokensForStage, BALANCE } from '../core/formulas.js';
import { canComplete, resolveAction, fuelLog, intervalFor } from '../systems/skilling.js';
import { masteryProgress, skillMastery } from '../systems/mastery.js';
import { MASTERY_SKILLS, MASTERY_MAX_LEVEL } from '../data/mastery.js';
import { MINIGAME_CONFIG, CHALLENGE_MS, hasOpportunity, animatedPosition } from '../systems/minigame.js';
import { goldShopPrice, itemUpgradeCost, itemReforgeCost, canWear, isUpgrade, itemScore, salvagePreview, bagSize, findUpgrade, gearIsLocked } from '../systems/inventory.js';
import { nextCampCost, campPrice } from '../systems/camp.js';
import { achievementProgress } from '../systems/progress.js';
import { DUNGEONS, dungeonById, DUNGEON_MILESTONES, FRAGMENTS_PER_UNIQUE, UNIQUES, TITAN_TIME_MS, TITAN_UNLOCK_STAGE, TITAN_BONUS, DUNGEON_BOSS_TIME_MS, DUNGEON_CHOICE_MS } from '../data/dungeons.js';
import { dungeonUnlocked, titanReady, titanUnlocked, titanLevel, titanEnemy, fightPreview, dungeonPreview, ownsUnique, choosingAfterClear } from '../systems/dungeon.js';
import { PETS, PET_BASE, companionPet } from '../data/pets.js';
import { FARMING_PLOTS, CROPS, cropById } from '../data/farming.js';
import { AGILITY_SLOTS, obstacleById } from '../data/agility.js';
import { plotUnlocked, seedCost, growTime, plotReady } from '../systems/farming.js';
import { obstacleCost, courseDef, obstacleLevel, upgradeInfo } from '../systems/agility.js';
import { BAIT_EXTRA_CHANCE } from '../systems/skilling.js';
import { DISCORD_INVITE } from '../data/social.js';
import { EVENTS, EVENT_DAILY_CAP, EVENT_MILESTONES, EVENT_SHOP } from '../data/events.js';
import { eventStatus } from '../systems/events.js';
import { DAILY_MAX_BANKED, GREAT_CRATE_EVERY, cratesTowardGreat } from '../systems/daily.js';
import { listBackups } from '../core/save.js';
import { BASE } from '../core/modifiers.js';
import { fmt, pct, seconds, duration, escapeHtml as esc } from './format.js';
import { sprite, heroSprite, itemSpriteKey, slotSpriteKey, resIcon, toolIcon, monsterSpriteKey, glyph, coinIcon } from './sprites.js';
import { STAGE_SKILLS } from './stage.js';
import { CARD_ART } from '../data/cardart.js';
import { rankFor, nextRank, RANKS } from '../data/ranks.js';
import { LOOKS, lookOpen, lookForMedal } from '../data/looks.js';
import { CAPES, capeFor, capeEarned, capesEarned, capeWorn } from '../data/capes.js';
import { HERO_NAME_MAX } from '../core/text.js';
import { BESTIARY, BESTIARY_SIZE, BESTIARY_MAX_STARS, KILL_STARS, starsFor, nextStarAt, bestiaryStars } from '../data/bestiary.js';
import { FEATURES, feature, artStyle, aboutButton, DUNGEON_ART, EVENT_ART, paintStyle } from './features.js';
import { seen } from '../systems/disclosure.js';
import { campOnOffer } from '../systems/guide.js';

// The menu's order. The clan comes first (the online side, the heart of the game), then the shop and
// the bag (the owner's order), in a group of their own above the headings; the rest follow by group.
export const TABS = [
    { id: 'clan', name: 'Clan', icon: '🛡️', group: 'TOP' },
    { id: 'shop', name: 'Shop', icon: '🔮', group: 'TOP' },
    { id: 'inventory', name: 'Inventory', icon: '🎒', group: 'TOP' },
    { id: 'combat', name: 'Combat', icon: '⚔️', group: 'COMBAT' },
    { id: 'dungeons', name: 'Dungeons', icon: '🏰', group: 'COMBAT' },
    { id: 'mining', name: 'Mining', icon: '⛏️', group: 'SKILLS', skill: 'mining' },
    { id: 'woodcutting', name: 'Woodcutting', icon: '🌳', group: 'SKILLS', skill: 'woodcutting' },
    { id: 'fishing', name: 'Fishing', icon: '🎣', group: 'SKILLS', skill: 'fishing' },
    { id: 'hunting', name: 'Hunting', icon: '🏹', group: 'SKILLS', skill: 'hunting' },
    { id: 'cooking', name: 'Cooking', icon: '🍳', group: 'SKILLS', skill: 'cooking' },
    { id: 'firemaking', name: 'Firemaking', icon: '🔥', group: 'SKILLS', skill: 'firemaking' },
    { id: 'alchemy', name: 'Alchemy', icon: '🧪', group: 'SKILLS', skill: 'alchemy' },
    { id: 'farming', name: 'Farming', icon: '🌾', group: 'SKILLS', skill: 'farming' },
    { id: 'smithing', name: 'Smithing', icon: '⚒️', group: 'SKILLS', skill: 'smithing' },
    { id: 'crafting', name: 'Crafting', icon: '💍', group: 'SKILLS', skill: 'crafting' },
    { id: 'agility', name: 'Agility', icon: '🤸', group: 'SKILLS', skill: 'agility' },
    { id: 'achievements', name: 'Achievements', icon: '🏆', group: 'MANAGEMENT' },
    { id: 'events', name: 'Events', icon: '🎉', group: 'MANAGEMENT' },
    { id: 'settings', name: 'Settings', icon: '⚙️', group: 'MANAGEMENT' }
];

const rarityColor = id => RARITIES.find(r => r.id === id)?.color || '#e2e8f0';
const res = id => RESOURCES[id];
const resTag = (id, qty = null) => `<span class="res-tag" style="color:${res(id)?.color || '#e2e8f0'}">${resIcon(id)} ${qty !== null ? `${fmt(qty)}× ` : ''}${esc(res(id)?.name || id)}</span>`;

// The two halves of one switch: the fight fills the screen, or sits in the page. Drawn, because the
// one glyph there is for this (⛶) reads as "full screen" both ways.
const ICON_EXPAND = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
const ICON_SHRINK = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"/></svg>';
// The header's and the orders' controls, drawn in the same hand: they are switches, not things.
const svg = d => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="${d}"/></svg>`;
const CLOUD = 'M4.6 12.5h6.9a3 3 0 0 0 .4-6 4 4 0 0 0-7.6-.7 3.4 3.4 0 0 0 .3 6.7z';
const ICON_SOUND_ON = svg('M2 6h3l4-3v10l-4-3H2zM11.3 5.6a3.4 3.4 0 0 1 0 4.8M13.4 3.6a6.2 6.2 0 0 1 0 8.8');
const ICON_SOUND_OFF = svg('M2 6h3l4-3v10l-4-3H2zM11.2 6.2l3.6 3.6M14.8 6.2l-3.6 3.6');
const ICON_CLOUD_UP = svg(`${CLOUD}M8 11V7.6M6.6 9 8 7.6 9.4 9`);
const ICON_CLOUD_OK = svg(`${CLOUD}M6.2 9.4l1.3 1.3 2.5-2.7`);
const ICON_MAP = svg('M1.5 3.6 5.5 2l5 1.6 4-1.6v10.4l-4 1.6-5-1.6-4 1.6zM5.5 2v10.4M10.5 3.6V14');
const ICON_FLAG = svg('M3.5 14.5V2M3.5 2.6h8.4l-2 3 2 3H3.5');
const ICON_MOON = svg('M12.6 10.4A5.6 5.6 0 0 1 5.6 3.4a5.6 5.6 0 1 0 7 7z');
const ICON_CHECK = svg('M3 8.6l3.2 3.2L13 4.6');
// attack and defence beside their numbers: a sword and a shield from the atlas (health is glyph('heart'))
const ATK_ICON = sprite('item/Weapon/3', { scale: 0.5, cls: 'soft res-spr' });
const DEF_ICON = sprite('item/Shield/3', { scale: 0.5, cls: 'soft res-spr' });

/** A weekend event's picture (src/ui/features.js EVENT_ART), small enough for a pill or a line. */
const eventIcon = (e, scale = 0.5) => sprite(EVENT_ART[e.id], { scale, cls: scale < 1 ? 'soft res-spr' : '', fallback: e.icon });

/**
 * Is the fight filling the screen? On the combat tab, while fighting (or resting after a fall, before
 * going on), unless the player folded it away.
 */
export function battleMode(game, ui) {
    const c = game.state.combat;
    return ui.tab === 'combat' && (c.active || c.recovering) && ui.battleFull !== false;
}

// ---------- sidebar ----------

/** A tab's picture: its sprite from the atlas (an emoji where the atlas has none). */
export function tabIcon(id, scale = 0.75) {
    const key = FEATURES[id]?.icon || '';
    const tab = TABS.find(t => t.id === id);
    return key.includes('/') || key === 'gold' || key === 'gear'
        ? sprite(key, { scale, cls: scale < 1 ? 'soft' : '', fallback: tab?.icon || '' })
        : `<span class="nav-emoji" aria-hidden="true">${key || tab?.icon || ''}</span>`;
}

/**
 * What is waiting in a place, shown on its tab (show what is ready where it lives, never as advice):
 * ripe plots on the farm, an awake Titan the hero can beat or a unique ready to assemble in the
 * dungeons, and better gear in the bag.
 */
function readyBadge(game, id) {
    const state = game.state;
    const pill = (text, tip, kind = '') => `<span class="nav-ready ${kind}" title="${esc(tip)}">${text}</span>`;
    if (id === 'farming') {
        const n = state.farming.plots.filter(p => p.crop && plotReady(p, game.now)).length;
        return n ? pill(n, `${n} plot${n > 1 ? 's' : ''} ready to harvest`) : '';
    }
    if (id === 'dungeons') {
        if (titanUnlocked(state) && titanReady(state, game.now)) {   // only when he can be beaten: a badge always on would say nothing
            const f = fightPreview(game.derived, titanEnemy(state));
            if (f.killSeconds <= Math.min(TITAN_TIME_MS / 1000, f.surviveSeconds)) return pill('!', 'The Titan is awake, and you can beat him', 'gold');
        }
        const whole = DUNGEONS.find(d => state.dungeons[d.id]?.fragments >= FRAGMENTS_PER_UNIQUE && !ownsUnique(state, d.unique));
        return whole ? pill('!', `${UNIQUES[whole.unique]?.name || 'A unique'} is ready to assemble`, 'gold') : '';
    }
    if (id === 'inventory') return !gearIsLocked(state) && state.inventory.some(i => canWear(state, i) && isUpgrade(state, i)) ? pill('▲', 'Better gear is in the bag') : '';
    return '';
}

// The sidebar lists the places the player has opened, and nothing else: no padlocks. One slot at
// the end shows the next place to open, with its picture and how far along it is. Group headings
// arrive once the list is long enough to need them.
const NAV_HEADINGS_FROM = 7;

export function renderNav(game, ui) {
    const state = game.state;
    const groups = ['TOP', 'COMBAT', 'SKILLS', 'MANAGEMENT'];
    const action = resolveAction(state);
    const open = TABS.filter(tab => isUnlocked(state, tab.id) || tab.id === 'settings');
    const headings = open.length >= NAV_HEADINGS_FROM;
    let html = '';
    for (const group of groups) {
        const tabs = open.filter(t => t.group === group);
        if (!tabs.length) continue;
        if (headings && group !== 'TOP') html += `<h3>${group}</h3>`;   // the top three need no heading
        for (const tab of tabs) {
            const active = ui.tab === tab.id ? 'active' : '';
            const working = (action && (action.skill === tab.skill)) || (tab.id === 'combat' && state.combat.active) ? 'action-active' : '';
            let badge = '';
            let xpBar = '';
            const levelled = tab.skill || (tab.id === 'combat' ? 'combat' : null);
            if (levelled) {
                const lp = levelProgress(state.skills[levelled].xp);
                badge = `<span class="nav-level${lp.level >= MAX_LEVEL ? ' max' : ''}" title="${lp.level >= MAX_LEVEL ? 'Max level' : `${fmt(lp.xpInto)} / ${fmt(lp.xpNeeded)} XP`}">${lp.level}</span>`;
                xpBar = lp.level >= MAX_LEVEL ? '' : `<i class="nav-xp" style="--p:${(lp.fraction * 100).toFixed(1)}%" aria-hidden="true"></i>`;
            }
            const fresh = ui.fresh?.has(tab.id) ? '<span class="nav-new" title="Just unlocked">New</span>' : '';
            const color = levelled ? SKILLS[levelled]?.color : null;   // the medallion's ring and the XP bar wear the skill's colour
            html += `<button id="nav-${tab.id}" class="nav-btn ${active} ${working}${fresh ? ' fresh' : ''}"${color ? ` style="--c:${color}"` : ''} onclick="FI.switchTab('${tab.id}')"><span class="nav-icon">${tabIcon(tab.id, 1)}</span><span class="nav-name">${tab.name}</span>${readyBadge(game, tab.id)}${fresh || badge}${xpBar}</button>`;
        }
    }
    return html;
}

/**
 * The next place to open: its picture, its name, what to do and how far along. A sidebar card of its
 * own (under the tabs on a desktop; beside the title on a phone, where the tabs are a scrolling strip
 * and the end of it is out of sight).
 */
export function renderNavNext(game) {
    const state = game.state;
    const [goal] = nextGoals(state, 1);
    if (!goal) return '';
    const f = feature(goal.id);
    const where = isUnlocked(state, goal.tab) ? goal.tab : 'combat';
    const coming = goal.requires?.(state);   // earned: it opens when its breather is over (data/unlocks.js)
    return `<button class="nav-next${coming ? ' coming' : ''}" onclick="FI.switchTab('${where}')" title="${esc(coming ? `${f.name} is on its way` : goal.hint)}" style="${artStyle(goal.id)}">
        <span class="nav-next-kicker">Next</span>
        <span class="nav-next-name">${esc(f.name)}</span>
        <span class="nav-next-task">${esc(coming ? 'On its way' : goal.task || goal.hint)}</span>
        <i class="goal-bar" style="--p:${(goalProgress(state, goal) * 100).toFixed(1)}%" aria-hidden="true"></i>
    </button>`;
}

// ---------- phone hotbar ----------

/** Four thumb-sized shortcuts along the bottom of a phone: the fight, the current work, the inventory, the crate. */
export function renderHotbar(game, ui) {
    const state = game.state;
    const action = resolveAction(state);
    const fighting = state.combat.active;
    const banked = state.daily.banked;
    const upgrade = !gearIsLocked(state) && state.inventory.some(i => canWear(state, i) && isUpgrade(state, i));
    const button = (icon, label, onclick, { active = false, live = false, badge = '', disabled = false } = {}) =>
        `<button class="hot-btn${active ? ' active' : ''}${live ? ' live' : ''}" onclick="${onclick}" ${disabled ? 'disabled' : ''}><span class="hot-icon" aria-hidden="true">${icon}</span><span class="hot-label">${label}</span>${badge ? `<b class="hot-badge" aria-label="${badge === '▲' ? 'an upgrade is waiting' : `${badge} waiting`}">${badge}</b>` : ''}</button>`;
    const work = action && SKILLS[action.skill]
        ? button(tabIcon(action.skill, 1), esc(SKILLS[action.skill].name), `FI.switchTab('${action.skill}')`, { active: ui.tab === action.skill, live: true })
        : button(tabIcon('mining', 1), 'Work', "FI.switchTab('mining')", { active: ui.tab === 'mining' });
    return [
        button(tabIcon('combat', 1), fighting ? 'Fighting' : 'Battle', "FI.switchTab('combat')", { active: ui.tab === 'combat', live: fighting }),
        work,
        button(tabIcon('inventory', 1), 'Inventory', "FI.switchTab('inventory')", { active: ui.tab === 'inventory', badge: upgrade ? '▲' : '' }),
        button(sprite('crate', { scale: 1, fallback: '📦' }), banked > 0 ? (cratesTowardGreat(state) === GREAT_CRATE_EVERY - 1 ? 'Great!' : 'Crate') : duration(state.daily.nextAt - game.now), 'FI.claimDaily()', { badge: banked > 0 ? String(banked) : '', disabled: banked < 1 })
    ].join('');
}

// ---------- header ----------

// The header is the purse and a few pills. A currency shows once the player holds some
// (systems/disclosure.js); the status pill only says what is running somewhere else than the tab in
// view; the next goal lives in the sidebar's Next card; the hero's numbers are in the Inventory.
export function renderHeader(game, ui, cloud) {
    const state = game.state;
    const d = game.derived;
    const action = resolveAction(state);
    const chips = [
        `<div class="chip gold" title="Gold: earned in combat, spent at the camp and the shop (a prestige starts it over)"><span>Gold</span><b id="hdr-gold"></b></div>`, // painted every frame by main.js (it rolls up)
        seen(state, 'essence') ? `<div class="chip essence" title="Monster essence: upgrades and reforges equipment"><span>Essence</span><b>${fmt(state.resources.essence)}</b></div>` : '',
        seen(state, 'tokens') ? `<div class="chip tokens" title="Prestige tokens: permanent +${BASE.tokenAtk * 100}% ATK/DEF each${d.records.count ? `, ×${d.records.mult.toFixed(2)} from ${d.records.count} record${d.records.count === 1 ? '' : 's'} (every ${BASE.recordStages} stages of your best, and each dungeon unique)` : ''}"><span>Tokens</span><b>${fmt(state.prestige.tokens)}</b><i>+${d.tokenPowerPct}%</i></div>` : '',
        seen(state, 'skill_points') ? `<button class="chip sp" onclick="FI.openPerks()" title="Skill points: tap to spend them on perks" aria-label="${state.prestige.skillPoints} skill point${state.prestige.skillPoints === 1 ? '' : 's'}: open the perks"><span>SP</span><b>${state.prestige.skillPoints}</b></button>` : ''
    ];
    const banked = state.daily.banked;
    const greatNext = cratesTowardGreat(state) === GREAT_CRATE_EVERY - 1;   // the crate waiting is a great one
    const daily = banked > 0
        ? `<button class="daily-btn ready${greatNext ? ' great' : ''}" onclick="FI.claimDaily()" title="A crate ripens every 20 hours; up to ${DAILY_MAX_BANKED} wait for you. ${banked >= DAILY_MAX_BANKED ? 'The bank is full.' : `Next in ${duration(state.daily.nextAt - game.now)}.`}">${sprite('crate', { scale: 0.75, cls: 'soft', fallback: '📦' })}<span class="daily-word">${greatNext ? 'Great crate' : 'Daily crate'}</span>${banked > 1 ? ` <b>×${banked}</b>` : ''}</button>`
        : '';
    const bonfirePill = bonfireLit(state, game.now)
        ? `<span class="bonfire-pill" title="The bonfire: +${Math.round(bonfireBonus(skillLevel(state, 'firemaking')) * 100)}% XP for ${duration(state.bonfire.until - game.now)} more. Burning logs in Firemaking keeps it going (up to ${BASE.bonfireMaxMs / 3600000} h)">${sprite(FEATURES.firemaking.icon, { scale: 0.5, cls: 'soft res-spr' })} +${Math.round(bonfireBonus(skillLevel(state, 'firemaking')) * 100)}%<span class="pill-long"> XP · ${duration(state.bonfire.until - game.now)}</span></span>`
        : '';
    const ev = eventStatus(state, game.now);
    const eventPill = ev.active && isUnlocked(state, 'events')
        ? `<button class="event-pill" style="--accent:${ev.event.color}" onclick="FI.switchTab('events')" title="${esc(ev.event.name)}: ${esc(ev.event.desc)}" aria-label="${esc(ev.event.name)}, ${duration(ev.endsAt - game.now)} left">${eventIcon(ev.event)} <span class="pill-long">${esc(ev.event.name)} · </span>${duration(ev.endsAt - game.now)}<span class="pill-long"> left</span></button>`
        : '';
    const focusPill = game.derived.focused
        ? `<span class="focus-pill" title="You've left the game alone for a minute: +${Math.round(BASE.focusSkillSpeed * 100)}% skill speed and +${Math.round(BASE.focusAttackSpeed * 100)}% attack speed. Any click or key press ends it.">${glyph('spark')}<span class="pill-long"> Focused</span> +${Math.round(BASE.focusSkillSpeed * 100)}%</span>`
        : '';
    // What the hero is doing, when that is not what the tab in view already shows.
    const here = ui.tab === 'combat' || STAGE_SKILLS.includes(ui.tab); // tabs with a scene or a stage of their own
    let status = '';
    if (action) {
        if (ui.tab !== action.skill) status = `<button class="status-pill working" onclick="FI.switchTab('${action.skill}')">${tabIcon(action.skill, 0.625)} ${esc(action.label)}${state.action?.stalled ? ' — <b class="warn">waiting for materials</b>' : ''}</button>`;
    } else if (state.combat.active) {
        if (ui.tab !== 'combat') status = `<button class="status-pill fighting" onclick="FI.switchTab('combat')">${tabIcon('combat', 0.625)} ${esc(fightingWhere(state))}</button>`;
    } else if (!here) {
        status = `<button class="status-pill idle" onclick="FI.switchTab('combat')">${ICON_MOON} Resting</button>`;
    }
    const nudge = !cloud?.loggedIn && state.combat.bestStage > 10;   // past the first boss: worth keeping
    const user = cloud?.loggedIn ? `<span class="cloud-pill" title="Cloud save">${ICON_CLOUD_OK} ${esc(cloud.username || 'signed in')}</span>`
        : `<button class="cloud-pill local${nudge ? ' nudge' : ''}" onclick="FI.openAuth()" aria-label="Local save only: sign in to keep it in the cloud" title="Local save only: sign in to keep it in the cloud">${ICON_CLOUD_UP}${nudge ? '<span class="cloud-word">Save to cloud</span>' : ''}</button>`;
    const soundOn = state.settings.sound !== false;
    const mute = `<button class="mini-btn icon-btn" onclick="FI.toggleSound()" aria-pressed="${soundOn}" aria-label="${soundOn ? 'Mute sound' : 'Unmute sound'}" title="${soundOn ? 'Sound and vibration on' : 'Sound off'}">${soundOn ? ICON_SOUND_ON : ICON_SOUND_OFF}</button>`;
    // While the fight fills the screen, the sidebar is out of sight. The header carries the way back,
    // said two ways for two habits: Menu (with a dot when a new place is waiting there) and the
    // leave-full-screen button. Both fold the fight back into the page; it goes on.
    const full = battleMode(game, ui);
    const menu = full ? `<button class="mini-btn menu-btn" onclick="FI.battleFull(false)" title="Back to the menu (Esc). The fight goes on.">☰<span class="menu-word"> Menu</span>${ui.fresh?.size ? '<i class="menu-dot" aria-label="a new place is waiting"></i>' : ''}</button>` : '';
    const screen = full ? `<button class="mini-btn icon-btn screen-btn" onclick="FI.battleFull(false)" aria-label="Leave full screen" title="Leave full screen (Esc). The fight goes on.">${ICON_SHRINK}</button>` : '';
    return `
        <div class="header-row">
            ${menu}
            <div class="chips">${chips.join('')}</div>
            <div class="pills">${status}${focusPill}${bonfirePill}${eventPill}</div>
            <div class="header-right">${daily}${screen}${mute}${user}</div>
        </div>`;
}

// ---------- combat ----------

/**
 * The browser tab's title: what the hero is doing, for a player who keeps the game in a background
 * tab, with a ★ when something waits for them (a ripe crate, ripe crops, an awake Titan).
 */
export function pageTitle(game) {
    const state = game.state;
    const action = resolveAction(state);
    const doing = state.combat.active ? fightingWhere(state) : action ? action.label : '';
    const waits = state.daily.banked > 0 || ['farming', 'dungeons'].some(id => isUnlocked(state, id) && readyBadge(game, id));
    return `${waits ? '★ ' : ''}${doing ? `${doing} · ` : ''}Fantasy Idle`;
}

function fightingWhere(state) {
    const c = state.combat;
    if (c.mode === 'titan') return c.enemy?.name || 'the Titan';
    const run = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    if (run) return choosingAfterClear(state) ? `${run.name} cleared` : `${run.name} ${Math.min(c.dungeon.index + 1, run.monsters.length + 1)}/${run.monsters.length + 1}`;
    return `${zoneForStage(c.stage).name} stage ${c.stage}`;
}

/** Food and potion for the fight, picked from tiles of what you carry (a loadout, not a form). Each row arrives with its skill. */
function renderLoadout(game) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const showFood = seen(state, 'food');
    const showPotions = seen(state, 'potions');
    if (!showFood && !showPotions) return '';
    // `state`: '' or 'in-play' (Auto eats it: lit softly) or 'idle' (it won't be used: dimmed)
    const pick = (on, onclick, inner, title, state = '') => `<button class="pick${on ? ' on' : ''}${state ? ` ${state}` : ''}" onclick="${onclick}" title="${esc(title)}" aria-label="${esc(title)}" aria-pressed="${on}">${inner}</button>`;
    const word = w => `<span class="pick-word">${w}</span>`;
    const foods = foodsByHealing().filter(f => state.resources[f.id] > 0 || c.autoEat === f.id);
    const potions = orderedByTier('potion').filter(p => state.resources[p.id] > 0 || c.potion === p.id);
    // With none in the bag, the row ends in one more tile that goes to where they are made.
    const goTile = (tab, word, label) => (isUnlocked(state, tab)
        ? `<button class="pick pick-go" onclick="FI.switchTab('${tab}')" title="${label}" aria-label="${label}">${tabIcon(tab, 1)}<span class="pick-sub">${word}</span></button>`
        : '');
    const noFood = !foods.some(f => state.resources[f.id] > 0);
    const noPotions = !potions.some(p => state.resources[p.id] > 0);
    // Auto eats from every food carried, so those tiles light up with it; food that won't be eaten
    // (None picked, or another food) is dimmed, and so is a potion that isn't the one picked.
    const foodState = f => (c.autoEat === 'auto' ? (state.resources[f.id] > 0 ? 'in-play' : '') : c.autoEat === f.id ? '' : 'idle');
    const foodRow = [
        pick(c.autoEat === 'auto', "FI.setAutoEat('auto')", word('Auto'), 'Auto: eat from all your food, whichever best fits the missing health'),
        pick(c.autoEat === 'none', "FI.setAutoEat('none')", word('None'), 'Never eat automatically'),
        ...foods.map(f => pick(c.autoEat === f.id, `FI.setAutoEat('${f.id}')`,
            `${resIcon(f.id, { scale: 1.25 })}<span class="pick-qty">${shortQty(state.resources[f.id] || 0)}</span><span class="pick-sub">+${Math.round(f.heals * d.foodMult)}</span>`,
            `${f.name}: heals ${Math.round(f.heals * d.foodMult)} HP (${fmt(state.resources[f.id] || 0)} left)${c.autoEat === 'auto' ? '. Auto eats it when it fits best' : '. Pick it to eat only this'}`,
            foodState(f))),
        noFood ? goTile('cooking', 'Cook', 'No food left: cook some') : ''
    ].join('');
    const potionRow = [
        pick(c.potion === 'none', "FI.setPotion('none')", word('None'), 'No potion'),
        ...potions.map(p => pick(c.potion === p.id, `FI.setPotion('${p.id}')`,
            `${resIcon(p.id, { scale: 1.25 })}<span class="pick-qty">${shortQty(state.resources[p.id] || 0)}</span>`,
            `${p.name}: ${p.desc} (${fmt(state.resources[p.id] || 0)} left)`, c.potion === p.id ? '' : 'idle')),
        noPotions ? goTile('alchemy', 'Brew', 'No potions left: brew some') : ''
    ].join('');
    const potionNote = c.potion !== 'none' ? (c.potionCharges > 0 ? `${c.potionCharges} attacks left` : (state.resources[c.potion] > 0 ? 'drinks on the next attack' : 'none left')) : '';
    return `${showFood ? `<div class="loadout">
            <div class="loadout-label">Food <span class="muted small">eaten below ${pct(d.autoEatThreshold)} health</span></div>
            <div class="pick-row">${foodRow}</div>
        </div>` : ''}
        ${showPotions ? `<div class="loadout">
            <div class="loadout-label">Potion${potionNote ? ` <span class="muted small">${potionNote}</span>` : ''}</div>
            <div class="pick-row">${potionRow}</div>
        </div>` : ''}`;
}

/**
 * The camp's three upgrades as tokens: the picture with its level, what a level gives and its price,
 * all one button; Max beside it buys as many levels as the gold allows. The combat tab and the
 * fight's dock show the same tokens.
 */
function campTokens(game) {
    const state = game.state;
    return campOnOffer(state, game.derived).map(u => {   // the Armour Rack once there is defence to raise
        const level = state.camp[u.id] || 0;
        const cost = nextCampCost(state, u.id);
        const can = cost !== null && state.gold >= cost;
        const canTwo = can && level + 1 < u.max && state.gold >= cost + campPrice(state, u, level + 1);
        const total = Math.round((Math.pow(1 + u.bonus, level) - 1) * 100);
        return `<div class="camp-token${can ? ' can' : ''}" data-camp="${u.id}">
            <button class="camp-buy" onclick="FI.buyCamp('${u.id}', 1)" ${can ? '' : 'disabled'} title="${esc(u.name)}: ${esc(u.short)} a level${level ? ` (now +${total}%)` : ''}" aria-label="${cost === null ? `${esc(u.name)} is at its highest level` : `Raise ${esc(u.name)} for ${fmt(cost)} gold: ${esc(u.short)}`}">
                <span class="camp-medal">${sprite(u.art, { scale: 1, fallback: u.icon })}${level ? `<b class="camp-lv">${level}</b>` : ''}</span>
                <span class="camp-token-text"><b>${esc(u.short)}</b><span class="camp-price">${cost === null ? 'Max' : `${sprite('gold', { scale: 0.5, cls: 'soft', fallback: '🪙' })} ${fmt(cost)}`}</span></span>
            </button>
            ${canTwo ? `<button class="mini-btn camp-max" onclick="FI.buyCamp('${u.id}', 'max')" title="Buy as many levels of the ${esc(u.name)} as your gold allows">Max</button>` : ''}
        </div>`;
    }).join('');
}

/** The camp on the combat tab: one strip on its painting. It arrives with the gold for the first upgrade. */
function renderCamp(game) {
    if (!seen(game.state, 'camp')) return '';
    return `<section class="glass-panel camp-panel" style="${artStyle('camp')}">
        <h2>Camp ${aboutButton('camp')}</h2>
        <div class="camp-tokens">${campTokens(game)}</div>
    </section>`;
}

/** What a prestige waits for (a prestige would end it): "Titan fight" or "dungeon run". */
const afterWhat = preview => (preview.blockedBy === 'titan' ? 'Titan fight' : 'dungeon run');

/** Prestige, in one line: what a prestige would pay now, and the button. The rules are behind the "?". */
function renderPrestigeStrip(game) {
    const state = game.state;
    if (!isUnlocked(state, 'prestige')) return '';
    const c = state.combat;
    const preview = game.prestigePreview();
    const line = preview.allowed ? `<b>+${preview.tokens}</b> tokens if you prestige now`
        : c.maxStage < BALANCE.prestige.minStage ? `Reach stage ${BALANCE.prestige.minStage} first`
        : preview.blockedBy ? `After the ${afterWhat(preview)}`
        : `Ready in ${duration(preview.waitMs)}`;
    return `<section class="glass-panel prestige-strip" style="${artStyle('prestige')}">
        <div class="prestige-strip-text">
            <h2>Prestige ${aboutButton('prestige')}</h2>
            <span class="small">${line} <span class="muted">· stage ${Math.ceil((c.maxStage + 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE} pays ${preview.nextZoneTokens}</span></span>
        </div>
        <div class="strip-actions">
            ${seen(state, 'skill_points') ? `<button class="shop-btn${state.prestige.skillPoints > 0 ? ' ready' : ''}" onclick="FI.openPerks()">Perks${state.prestige.skillPoints > 0 ? ` · ${state.prestige.skillPoints} SP` : ''}</button>` : ''}
            <button class="prestige-btn arcane" onclick="FI.openPrestige()" ${preview.allowed ? '' : 'disabled'}>Prestige</button>
        </div>
    </section>`;
}

/** The battle log, folded away: its last line shows, the rest opens on a tap. */
// A log line's picture by its kind; the emoji its saved text may start with is left out.
const LOG_ART = { combat: 'item/Weapon/3', death: 'mon/Skeleton', loot: 'crate', prestige: 'res/essence' };
const LEADING_EMOJI = /^(?:[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]+\s*)+/u;
const logLine = (l, cls) => `<span class="${cls} ${l.type}">${sprite(LOG_ART[l.type] || 'item/Weapon/3', { scale: 0.5, cls: 'soft res-spr' })} ${esc(l.text.replace(LEADING_EMOJI, ''))}</span>`;

function renderBattleLog(state, ui) {
    const lines = [...state.log].reverse().filter(l => ['combat', 'death', 'loot', 'prestige'].includes(l.type)).slice(0, 8);
    if (!lines.length) return '';
    return `<details class="glass-panel log-drawer" ${ui.open?.log ? 'open' : ''} ontoggle="FI.setOpen('log', this.open)">
        <summary><span class="log-title">Battle log</span>${logLine(lines[0], 'log-last')}</summary>
        <div class="log-list">${lines.map(l => logLine(l, 'log-line')).join('')}</div>
    </details>`;
}

/** What this place drops and the tier of its gear (or what a dungeon run or the Titan is about). */
function zoneFacts(game) {
    const state = game.state;
    const c = state.combat;
    const run = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    if (run) return '';   // the run panel (renderRunPanel) has the clears, the fragments and the repeat switch
    if (c.mode === 'titan') return '<div class="muted small">Deal as much damage as you can before the timer runs out. Clicking the Titan helps.</div>';
    const zone = zoneForStage(c.stage);
    return `<div class="zone-facts"><span class="muted small">Drops here</span>${zone.loot.map(l => `<span class="fact" title="${esc(res(l.id).name)}">${resIcon(l.id, { scale: 0.75 })}</span>`).join('')}${seen(state, 'gear') ? `<span class="fact-text muted small" title="Gear that drops here is usually one tier below this, sometimes this tier, rarely one above">· gear tier <b>${zone.gearTier}</b></span>` : ''}</div>`;
}

/** The fight's main column: food and potion first, then what drops here. */
function combatMain(game) {
    const loadout = renderLoadout(game);
    return `${loadout ? `<div class="combat-controls">${loadout}</div>` : ''}${zoneFacts(game)}`;
}

/**
 * The orders, on the side: leave the fight, bring the full screen back, the map, and stay on this
 * stage. Moving between stages is the map's job (and the stones on the scene's path).
 */
function combatOrders(game, ui) {
    const state = game.state;
    const c = state.combat;
    const leave = c.mode === 'dungeon' ? 'Leave dungeon' : c.mode === 'titan' ? 'Give up' : 'Retreat';
    const orders = [
        // at the chest after a clear the run panel offers the two ways on instead
        c.active && !choosingAfterClear(state) ? `<button class="mini-btn retreat-btn" onclick="FI.toggleCombat()">${ICON_FLAG} ${leave}</button>` : '',
        // fallen and resting: he goes back in by himself, unless told to stay
        !c.active && c.recovering ? `<button class="mini-btn retreat-btn" onclick="FI.stayAtCamp()" title="Rest without going back into the fight">${ICON_MOON} Stay at camp</button>` : '',
        // Folded away mid-fight: one button brings the full screen back.
        c.active && !battleMode(game, ui) ? `<button class="mini-btn expand-btn" onclick="FI.battleFull(true)" title="Let the fight fill the screen">${ICON_EXPAND} Full screen</button>` : '',
        c.mode !== 'titan' && seen(state, 'world_map') ? `<button class="mini-btn map-btn" onclick="FI.openMap()">${ICON_MAP} Map</button>` : '',
        c.mode === 'stages' && seen(state, 'stage_nav') ? `<label class="toggle stay-toggle" title="Stay on this stage instead of moving on: for gathering its loot"><input type="checkbox" onchange="FI.toggleFarm(this.checked)" ${c.farmMode ? 'checked' : ''}> Stay on this stage</label>` : ''
    ].filter(Boolean);
    return orders.length ? `<div class="combat-side">${orders.join('')}</div>` : '';
}

export function renderCombat(game, ui) {
    if (battleMode(game, ui)) return renderBattleDock(game, ui);
    const state = game.state;
    // The battle scene above the tab (src/ui/scene.js) shows the fight and starts it; this panel holds the orders.
    return `
    <section class="glass-panel combat-panel ${painted('supplies', 'center 55%')}">
        <div class="combat-main">${combatMain(game)}</div>
        ${combatOrders(game, ui)}
    </section>
    ${renderRunPanel(game, 'glass-panel')}
    ${renderCamp(game)}
    ${renderPrestigeStrip(game)}
    ${renderBattleLog(state, ui)}`;
}

// ---------- the fight on the whole screen ----------

// While the fight fills the screen (battleMode), everything a run needs sits in one dock under the
// scene: the orders, the food and the potion, the camp, prestige, perks and the best piece of gear
// waiting in the bag. A player can fight, spend, prestige and fight on without leaving it.

/**
 * A dungeon run, in the dock (and the combat tab): how many times it has been won and the unique's
 * fragments (Assemble once there are enough). After the first clear of a visit the hero waits at the
 * chest and the panel offers Keep going or End the dungeon, with the time left before keeping going
 * on its own; once the player keeps going, an ∞ says the runs go on until the hero leaves.
 */
function renderRunPanel(game, cls = 'dock-group', orders = '') {
    const state = game.state;
    const c = state.combat;
    const d = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    if (!d) return '';
    const record = state.dungeons[d.id];
    const choosing = choosingAfterClear(state);
    return `<div class="${cls} dock-run${choosing ? ' choosing' : ''} ${painted(DUNGEON_ART[d.id] || 'dungeon', 'center 55%')}">
        <div class="run-clears" title="Each clear opens a chest and gives a fragment">${sprite('crate', { scale: 1 })}<span><b>${fmt(record.clears)}</b> ${record.clears === 1 ? 'clear' : 'clears'}</span>${c.dungeon.repeat ? '<span class="run-loop" title="Runs again after each clear, until you leave">∞</span>' : ''}</div>
        ${uniqueProgress(state, d)}
        ${choosing ? `${runChoiceButtons(game)}${runCountdown(c)}` : ''}
        ${orders ? `<div class="run-orders">${orders}</div>` : ''}
    </div>`;
}

/** A dungeon's unique: its fragments as a bar, and Assemble once there are enough. */
function uniqueProgress(state, d) {
    const record = state.dungeons[d.id];
    const unique = UNIQUES[d.unique];
    const owned = ownsUnique(state, d.unique);
    return `<div class="frag-row" title="${record.fragments} of ${FRAGMENTS_PER_UNIQUE} fragments of the ${esc(unique.name)}">${sprite(`uniq/${unique.id}`, { scale: 1, cls: owned ? '' : 'silhouette', fallback: '🌟' })}
            <span class="frag-bar"><i style="--p:${Math.min(100, record.fragments / FRAGMENTS_PER_UNIQUE * 100).toFixed(1)}%"></i></span><span class="small">${record.fragments}/${FRAGMENTS_PER_UNIQUE}</span></div>
        ${record.fragments >= FRAGMENTS_PER_UNIQUE ? `<button class="prestige-btn run-assemble" onclick="FI.assembleUnique('${d.id}')">${owned ? 'Assemble a spare' : `Assemble the ${esc(unique.name)}`}</button>` : ''}`;
}

/** The choice after a clear: run it again and again, or end the dungeon (back to the stage the hero left). */
function runChoiceButtons(game) {
    const c = game.state.combat;
    const back = `${zoneForStage(c.stage).name}, stage ${c.stage}`;
    return `<div class="run-choice-btns">
        <button class="prestige-btn run-keep" onclick="FI.dungeonKeepGoing()"><b>Keep going</b><span>Again and again, until you leave</span></button>
        <button class="modal-btn btn-cancel run-end" onclick="FI.dungeonEnd()"><b>End the dungeon</b><span>Your hero fights on at ${esc(back)}</span></button>
    </div>`;
}

/** The time left at the chest, a bar that drains (patchLive keeps it moving) before the hero keeps going. */
const runCountdown = c => `<div class="run-countdown" style="--p:${(c.dungeon.choiceLeft / DUNGEON_CHOICE_MS * 100).toFixed(1)}%"><i></i><span>Keeps going on its own in <b>${Math.ceil(c.dungeon.choiceLeft / 1000)}</b> s</span></div>`;

/** After the first clear of a visit: the dungeon won, its clears and the unique's fragments, and the choice. */
export function renderRunChoiceModal(game) {
    const state = game.state;
    const c = state.combat;
    const d = choosingAfterClear(state) ? dungeonById(c.dungeon.id) : null;
    if (!d) return '';
    const record = state.dungeons[d.id];
    return `<div class="modal-content narrow about-card run-choice">
        <div class="about-art" style="${paintStyle(DUNGEON_ART[d.id] || 'dungeon', 'center 55%')}" aria-hidden="true"></div>
        <div class="run-choice-head"><span class="run-kicker">Dungeon cleared</span><div class="modal-header">${esc(d.name)}</div></div>
        <div class="run-choice-facts">
            <div class="run-clears">${sprite('crate', { scale: 1 })}<span><b>${fmt(record.clears)}</b> ${record.clears === 1 ? 'clear' : 'clears'}</span></div>
            ${uniqueProgress(state, d)}
        </div>
        ${runChoiceButtons(game)}
        ${runCountdown(c)}
    </div>`;
}

/** The camp in the fight's dock: the same tokens as the combat tab. */
function renderCampTokens(game) {
    if (!seen(game.state, 'camp')) return '';
    return `<div class="dock-group dock-camp ${painted('camp', 'center 60%')}"><div class="dock-title">Camp ${aboutButton('camp')}</div><div class="camp-tokens">${campTokens(game)}</div></div>`;
}

/** Prestige, perks and the upgrade in the bag: the steps of the loop that used to need another tab. */
function renderLoopActions(game) {
    const state = game.state;
    const c = state.combat;
    const parts = [];
    if (isUnlocked(state, 'prestige')) {
        const preview = game.prestigePreview();
        const line = preview.allowed ? `+${fmt(preview.tokens)} tokens${preview.skillPoints ? `, +${preview.skillPoints} SP` : ''}`
            : c.maxStage < BALANCE.prestige.minStage ? `at stage ${BALANCE.prestige.minStage}`
            : preview.blockedBy ? `after the ${afterWhat(preview)}`
            : `ready in ${duration(preview.waitMs)}`;
        // The earned switch: Auto prestiges a run that has stalled (systems/prestige.js), and says when.
        const autoIn = game.autoPrestigeIn();
        const auto = seen(state, 'auto_prestige')
            ? `<button class="dock-auto${state.settings.autoPrestige ? ' on' : ''}" onclick="FI.setAutoPrestige(${!state.settings.autoPrestige})" aria-pressed="${!!state.settings.autoPrestige}" title="Prestige by itself when a run goes ${BALANCE.prestige.autoStallMs / 60000} minutes without a new best stage">${glyph('away')}<b>Auto</b><span>${state.settings.autoPrestige ? (autoIn === null ? 'on' : `in ${duration(autoIn)}`) : 'off'}</span></button>` : '';
        parts.push(`<div class="dock-prestige-row"><button class="prestige-btn arcane dock-prestige" onclick="FI.openPrestige()" ${preview.allowed ? '' : 'disabled'} title="Start a new run with permanent tokens. Stage ${Math.ceil((c.maxStage + 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE} would pay ${preview.nextZoneTokens}."><b>Prestige</b><span>${line}</span></button>${auto}</div>`);
    }
    if (seen(state, 'skill_points')) {
        const sp = state.prestige.skillPoints;
        parts.push(`<button class="shop-btn dock-perks${sp > 0 ? ' ready' : ''}" onclick="FI.openPerks()" title="Spend skill points on perks that last forever"><b>Perks</b><span>${sp > 0 ? `${sp} SP to spend` : 'no SP now'}</span></button>`);
    }
    const upgrade = gearIsLocked(state) ? null : findUpgrade(state);
    if (upgrade) {
        parts.push(`<button class="mini-btn dock-equip" onclick="FI.equip(${Number(upgrade.item.id)})" title="It beats what you are wearing">${sprite(itemSpriteKey(upgrade.item), { scale: 1, fallback: esc(upgrade.item.icon) })}<span><b>▲ Equip</b><span>${esc(upgrade.item.name)}</span></span></button>`);
    }
    return parts.length ? `<div class="dock-group dock-loop ${painted('shrine', 'center 45%')}">${parts.join('')}</div>` : '';
}

function renderBattleDock(game, ui) {
    const state = game.state;
    const orders = combatOrders(game, ui);
    const inRun = state.combat.mode === 'dungeon' && !!dungeonById(state.combat.dungeon?.id);   // a dungeon's orders go in its own panel
    return `<section class="battle-dock" aria-label="Orders for the fight">
        ${inRun ? renderRunPanel(game, 'dock-group', orders) : ''}
        <div class="dock-group dock-main ${painted('supplies', 'center 55%')}">${combatMain(game)}</div>
        ${renderCampTokens(game)}
        ${renderLoopActions(game)}
        ${orders && !inRun ? `<div class="dock-group dock-orders ${painted('wartable', 'center 50%')}">${orders}</div>` : ''}
    </section>
    ${renderBattleLog(state, ui)}`;
}

// ---------- banners ----------

/** A place's banner: its painting, its name, one line and the "?" (for the tabs without a scene of their own). */
// A panel stands in its place: a painting (assets/paint) behind it, dimmed from the top down so the
// cards and words on it read (CSS .painted). Skill panels continue the painting of their stage above.
// It ends a class attribute and adds the style: class="glass-panel ${painted('market')}".
const painted = (name, focus = 'center 35%') => `painted" style="${paintStyle(name, focus)}`;
const skillPainted = id => painted(FEATURES[id]?.art || 'camp', 'center 22%');

function banner(id, { title = null, sub = null, extra = '' } = {}) {
    const f = feature(id);
    return `<div class="tab-banner" style="${artStyle(id)}">
        <div class="tab-banner-text"><h2>${title ?? esc(f.name)} ${aboutButton(id)}</h2><p>${sub ?? esc(f.blurb)}</p></div>
        ${extra ? `<div class="tab-banner-extra">${extra}</div>` : ''}
    </div>`;
}

// ---------- skills ----------

function xpHeader(game, skillId, extra = '') {
    const state = game.state;
    const skill = SKILLS[skillId];
    const lp = levelProgress(state.skills[skillId].xp);
    let mastery = '';
    if (MASTERY_SKILLS.includes(skillId) && seen(state, 'mastery')) {
        const m = skillMastery(state, skillId);
        mastery = `<button class="mastery-total" onclick="FI.about('mastery')" title="Mastery levels gained across this skill's ${m.actions} actions (${m.maxed} at ${MASTERY_MAX_LEVEL}). Every action levels its own mastery as you do it.">Mastery ${fmt(m.levels)}</button>`;
    }
    return `<div class="panel-header">
        <h2><span class="h-icon">${tabIcon(skillId, 1)}</span>${skill.name} ${aboutButton(skillId)}</h2>
        <div class="skill-info">
            ${extra}${mastery}
            <span class="skill-level" style="color:${skill.color}; background:${skill.color}22">Level ${lp.level}${lp.level >= MAX_LEVEL ? ' ★' : ''}</span>
            <div class="xp-bar-container"><div class="xp-bar-fill" style="width:${(lp.fraction * 100).toFixed(1)}%; background:${skill.color}"></div></div>
            <span class="skill-xp">${lp.level >= MAX_LEVEL ? fmt(state.skills[skillId].xp) + ' XP' : `${fmt(lp.xpInto)} / ${fmt(lp.xpNeeded)} XP`}</span>
        </div>
    </div>`;
}

/** One action's mastery: its level, a thin bar, and (on hover) what it gives. It shows once mastery has opened. */
function masteryRow(state, skillId, mastery, label = 'Mastery') {
    if (!mastery || !seen(state, 'mastery')) return '';
    const p = masteryProgress(state, skillId, mastery.key);
    const maxed = p.level >= MASTERY_MAX_LEVEL;
    const gives = [`+${pct(mastery.speed, 1)} speed`];
    if (mastery.double) gives.push(`+${pct(mastery.double, 1)} double chance`);
    if (mastery.preserve) gives.push(`${pct(mastery.preserve, 1)} chance to keep ${skillId === 'firemaking' ? 'the log' : skillId === 'cooking' ? 'the ingredients and the log' : 'the ingredients'}`);
    const line = `${p.level > 1 ? gives.join(', ') : 'No bonus yet: every level adds a little'}. `
        + (maxed ? 'Mastered!' : p.xpNeeded - p.xpInto < 1 ? 'Next level with the next one.' : `Next level after ${duration((p.xpNeeded - p.xpInto) * 1000)} more practice (at base speed).`);
    return `<div class="mastery-row" ${tipAttrs(`${label} ${p.level}`, line)}><span class="mastery-lvl ${maxed ? 'max' : ''}">${esc(label)} ${p.level}</span><div class="mastery-bar"><div style="width:${(p.fraction * 100).toFixed(1)}%"></div></div></div>`;
}

/** XP and time in an action's card, each naming itself on hover: what it is, and what your bonuses make of it. */
function xpTimeStats(skill, xp, baseXp, interval, baseInterval) {
    const more = baseXp > 0 ? xp / baseXp - 1 : 0;
    const quicker = baseInterval > 0 ? 1 - interval / baseInterval : 0;
    const xpTip = tipAttrs('Experience', `${fmt(xp)} ${SKILLS[skill].name} XP each time${more > 0.005 ? ` (${fmt(baseXp)} at base, +${pct(more)} from your XP bonuses)` : ''}`);
    const timeTip = tipAttrs('Time', `${seconds(interval)} each time${quicker > 0.005 ? ` (${seconds(baseInterval)} at base, ${pct(quicker)} quicker with your tools, mastery and bonuses)` : ''}`);
    return `<span ${xpTip}>${glyph('xp')} ${fmt(xp)} XP</span><span ${timeTip}>${glyph('time')} ${seconds(interval)}</span>`;
}

/** The chance line for an action's stats: doubling (skill + mastery) and keeping ingredients. */
function luckStats(d, def) {
    const doubles = def.kind !== 'smith' && def.kind !== 'craft';
    const fromSkill = doubles ? d.doubleChance[def.skill] || 0 : 0;
    const fromMastery = doubles ? def.mastery?.double || 0 : 0;
    const dbl = fromSkill + fromMastery;
    const keep = def.mastery?.preserve || 0;
    const what = def.output ? `a second ${res(def.output).name}` : def.bonfireLog ? 'the log burning twice' : 'a double';
    const parts = [fromSkill > 0 && `${pct(fromSkill)} from your tools and bonuses`, fromMastery > 0 && `${pct(fromMastery, 1)} from mastery`].filter(Boolean).join(', ');
    const kept = def.bonfireLog ? 'the log' : def.fuel ? 'the ingredients and the log' : 'the ingredients';
    return `${dbl ? `<span ${tipAttrs('Double chance', `${pct(dbl)} chance of ${what}${parts ? ` (${parts})` : ''}`)}>${glyph('dice')} ${pct(dbl)}</span>` : ''}`
        + `${keep ? `<span ${tipAttrs('Keep chance', `${pct(keep, 1)} chance to keep ${kept} (from mastery)`)}>${glyph('keep')} ${pct(keep)}</span>` : ''}`;
}

/** What a tool tier does, in words (the "double" means something different per skill). */
function toolEffect(toolId, tier) {
    const tool = TOOLS[toolId];
    const speed = Math.round(TOOL_SPEED_PER_TIER * tier * 100);
    const dbl = Math.round(TOOL_DOUBLE_PER_TIER * tier * 100);
    if (toolId === 'hoe') return `+${speed}% crop growth speed, +${dbl}% chance of a double harvest`;
    if (toolId === 'tinderbox') return `+${speed}% firemaking speed, +${dbl}% chance a log burns twice`;
    return `+${speed}% ${SKILLS[tool.skill].name} speed, +${dbl}% double yield`;   // a speed bonus, as for the hoe and tinderbox (the time falls by less)
}

/** The tool in hand, once there is one (Smithing's Tools step shows what can be made). */
function toolBadge(game, skillId) {
    const skill = SKILLS[skillId];
    if (!skill.tool) return '';
    const tool = TOOLS[skill.tool];
    const tier = game.state.tools[skill.tool] || 0;
    const def = tool.tiers.find(t => t.tier === tier);
    return def ? `<span class="tool-badge" title="${toolEffect(skill.tool, tier)}">${toolIcon(skill.tool)} ${esc(def.name)}</span>` : '';
}

/** Cooking lists three kinds of dish; group the cards so each line reads as a ladder. */
function nodeGroup(skillId, node) {
    if (skillId !== 'cooking') return null;
    const input = Object.keys(node.consumes || {})[0];
    if (RESOURCES[input]?.category === 'crop') return 'From the farm';
    if (SKILLS.fishing.nodes.some(n => n.produces === input)) return 'Fish';
    return 'Meat';
}
// A kitchen ladder shows once its ingredients can be had: fish with Fishing, crops with Farming.
const GROUP_NEEDS = { Fish: 'fishing', 'From the farm': 'farming' };

function skillExtras(game, skillId) {
    const state = game.state;
    if (skillId === 'firemaking') {
        const lit = bonfireLit(state, game.now);
        const bonus = Math.round(bonfireBonus(skillLevel(state, 'firemaking')) * 100);
        return `<div class="info-strip ${lit ? 'lit' : ''}">${glyph('flame')} ${lit ? `The bonfire burns for <b>${duration(state.bonfire.until - game.now)}</b>: <b>+${bonus}% XP</b> in every skill.` : `The bonfire is out. Burn logs to light it: <b>+${bonus}% XP</b> in every skill.`}</div>`;
    }
    return '';
}

// Where an item comes from, for the tooltips on what an action needs ("from Hunting").
let itemSources = null;
function sourceOf(id) {
    if (!itemSources) {
        itemSources = {};
        for (const skill of Object.values(SKILLS)) for (const n of skill.nodes || []) if (n.produces) itemSources[n.produces] ||= skill.name;
        for (const r of SMELTING_RECIPES) itemSources[r.produces] ||= SKILLS.smithing.name;
        for (const c of CROPS) itemSources[c.produces] ||= SKILLS.farming.name;
    }
    return itemSources[id] || (RESOURCES[id]?.category === 'gem' ? `${SKILLS.mining.name}, now and then` : null);
}

/** A tooltip of the game's own (main.js shows it at once on hover, on a tap on a phone): a name in bold, then a line. */
export const tipAttrs = (title, line) => `data-tip-title="${esc(title)}" data-tip="${esc(line)}" aria-label="${esc(`${title}: ${line}`)}"`;

/** What an action needs, as small chips: the item's icon, then how many you hold of how many it takes (red when short). Hovered, a chip names its item. */
function needChips(state, consumes) {
    return Object.entries(consumes || {}).map(([id, q]) => {
        const have = state.resources[id] || 0;
        const from = sourceOf(id);
        return `<span class="need ${have >= q ? 'ok' : 'missing'}" ${tipAttrs(res(id).name, `Needs ${fmt(q)}, you have ${fmt(have)}${from ? ` · from ${from}` : ''}`)}>${resIcon(id, { scale: 0.75 })}<b>${shortQty(have)}</b><i>/${fmt(q)}</i></span>`;
    }).join(' ');
}

/**
 * One action as a card. At rest it shows only its art, its name, what it needs and how long it takes;
 * the card being worked opens up with its numbers (yield, XP, luck, mastery) and the progress bar.
 * The same numbers sit in the tooltip of the others. A locked card is the next one to earn.
 */
/** An action card's own picture (tools/cards.py), or its workshop's when it has none; null if neither. */
const cardPic = (name, fallback = null) => (CARD_ART.has(name) ? name : CARD_ART.has(fallback) ? fallback : null);
const picBand = pic => (pic ? `<div class="card-pic" style="--pic:url(assets/paint/cards/${pic}.webp)" aria-hidden="true"></div>` : '');

function actionCard(c) {
    const pic = picBand(c.pic);
    if (c.locked) {
        return `<div class="node-card locked${pic ? ' has-pic' : ''}" aria-disabled="true" style="--accent:${c.color}">
            ${pic}<div class="skill-action-art">${c.art}</div>
            <div class="node-name">${esc(c.title)}</div>
            <div class="req">${esc(c.locked)}</div>
        </div>`;
    }
    const bar = c.active
        ? `<div class="action-progress-container"><div class="action-progress-fill" ${c.progressId ? `id="${c.progressId}"` : 'data-progress="1"'} style="width:${c.progress || 0}%; background:${c.stalled ? '#ef4444' : c.color}"></div></div>`
        : '';
    return `<div ${c.id ? `id="${c.id}"` : ''} class="node-card ${c.active ? 'active' : ''} ${c.active && c.stalled ? 'stalled' : ''}${pic ? ' has-pic' : ''}" onclick="${c.onclick}" role="button" tabindex="0" aria-pressed="${!!c.active}" style="--accent:${c.color}" ${c.tip ? `title="${esc(c.tip)}"` : ''}>
        ${pic}<div class="skill-action-art" style="color:${c.color}">${c.art}</div>
        <div class="node-name">${esc(c.title)}</div>
        ${c.note ? `<div class="node-io muted small">${c.note}</div>` : ''}
        ${c.inputs ? `<div class="node-io small">${c.inputs}</div>` : ''}
        ${c.active
            ? `${c.have !== undefined ? `<div class="node-have" ${tipAttrs(c.haveName || c.title, `You have ${fmt(c.have)}`)}>${c.haveIcon || ''}<b>${fmt(c.have)}</b></div>` : ''}<div class="node-stats">${c.stats}</div>${c.mastery || ''}${bar}`
            : `<div class="node-time muted small">${glyph('time')} ${seconds(c.time)}</div>`}
    </div>`;
}

/** The unlocked entries of a ladder plus the next one to earn (the rest stay out of sight). */
function withNext(entries, levelOf, level) {
    const open = entries.filter(e => levelOf(e) <= level);
    const next = entries.filter(e => levelOf(e) > level).sort((a, b) => levelOf(a) - levelOf(b))[0];
    return next ? [...open, next] : open;
}

export function renderSkill(game, ui, skillId) {
    const state = game.state;
    const skill = SKILLS[skillId];
    const level = skillLevel(state, skillId);
    const d = game.derived;
    const action = state.action;
    // Group the nodes (only the kitchen has more than one ladder), and show each ladder up to its next step.
    const ladders = new Map();
    for (const node of skill.nodes) {
        const name = nodeGroup(skillId, node) || '';
        if (!ladders.has(name)) ladders.set(name, []);
        ladders.get(name).push(node);
    }
    let cards = '';
    for (const [name, nodes] of ladders) {
        if (GROUP_NEEDS[name] && !isUnlocked(state, GROUP_NEEDS[name]) && !nodes.some(n => Object.keys(n.consumes || {}).some(id => state.resources[id] > 0))) continue;
        if (name && ladders.size > 1) cards += `<h3 class="section-title grid-span">${esc(name)}</h3>`;
        for (const node of withNext(nodes, n => n.levelReq, level)) {
            const out = res(node.produces || node.bonfireLog);
            const art = resIcon(node.produces || node.bonfireLog, { scale: 1.5 });
            const pic = cardPic(node.id, skillId === 'cooking' ? 'kitchen' : null);
            if (level < node.levelReq) { cards += actionCard({ locked: `Level ${node.levelReq}`, art, pic, title: node.name, color: skill.color }); continue; }
            const active = action?.kind === 'node' && action.skill === skillId && action.id === node.id;
            const def = resolveAction(state, { kind: 'node', skill: skillId, id: node.id });
            const interval = intervalFor(def, d);
            const check = canComplete(state, def);
            let inputs = needChips(state, node.consumes);
            if (node.fuel) {   // a log to cook on: the cheapest one carried
                const log = fuelLog(state);
                const tip = log ? tipAttrs(res(log).name, `Each dish burns one (the cheapest log you carry) · you have ${fmt(state.resources[log])}`) : tipAttrs('A log', `Each dish burns one · from ${SKILLS.woodcutting.name}`);
                inputs += ` <span class="need ${log ? 'ok' : 'missing'}" ${tip}>${resIcon(log || 'normal_log', { scale: 0.75 })}<b>${log ? shortQty(state.resources[log]) : 0}</b><i>/1</i></span>`;
            }
            const xp = Math.round(node.xp * d.xpMult);
            const gives = node.produces ? `${out.name}${skillId === 'mining' ? ', with a 2% chance of a gem' : ''}` : `+${BASE.bonfireSecondsPerLogTier * out.tier} s of bonfire`;
            cards += actionCard({
                id: `node-${skillId}-${node.id}`, art, pic, title: node.name, color: skill.color, inputs, time: interval,
                tip: `${gives} · +${xp} XP · ${seconds(interval)}`,
                active, stalled: active && (action.stalled || !check.ok), onclick: `FI.startNode('${skillId}','${node.id}')`,
                have: node.produces ? state.resources[node.produces] : undefined, haveIcon: node.produces ? resIcon(node.produces) : '', haveName: node.produces ? res(node.produces).name : '',
                stats: `${xpTimeStats(skillId, xp, node.xp, interval, node.interval)}${luckStats(d, def)}`,
                mastery: masteryRow(state, skillId, def.mastery),
                progressId: `progress-${skillId}-${node.id}`, progress: active ? Math.min(100, action.progress / interval * 100) : 0
            });
        }
    }
    const bait = skillId === 'fishing' && state.resources.fishing_bait > 0 ? `<span class="tool-badge" title="Each catch uses one bait for a ${Math.round(BAIT_EXTRA_CHANCE * 100)}% chance of a second fish">${resIcon('fishing_bait')} ${fmt(state.resources.fishing_bait)} bait</span>` : '';
    return `<section class="glass-panel skill-panel ${skillPainted(skillId)}">
        ${xpHeader(game, skillId, bait + toolBadge(game, skillId))}
        ${skillExtras(game, skillId)}
        ${NON_COMBAT_SKILLS.includes(skillId) ? renderMinigame(game, skillId) : ''}
        <div class="node-grid">${cards}</div>
    </section>`;
}

// What rides the mini-game's track: the skill's tool, or what it chases (the fox, a fish).
const MINIGAME_MARKER = { mining: 'tool/pickaxe', woodcutting: 'tool/axe', hunting: 'pet/scout', fishing: 'res/raw_trout' };

/** The mini-game. It arrives with the first chance to play; between chances it is one quiet line. */
export function renderMinigame(game, skillId) {
    const state = game.state;
    if (!seen(state, 'minigames')) return '';
    const conf = MINIGAME_CONFIG[skillId];
    const mg = state.minigame[skillId];
    const now = game.now;
    const boostLeft = Math.max(0, mg.boostUntil - now);
    const training = state.action?.kind === 'node' && state.action.skill === skillId;
    const opportunity = hasOpportunity(state, skillId, now);
    const ch = mg.challenge;
    if (!ch && !opportunity) {
        if (boostLeft > 0) return `<div class="minigame-line live" style="--minigame-accent:${conf.accent}">${glyph('spark')} ${conf.label}: <b>+${Math.round(mg.bonus * 100)}% speed</b> · ${Math.ceil(boostLeft / 1000)}s</div>`;
        if (!training) return '';
        const wait = Math.max(0, (mg.nextOpportunityAt || now) - now);
        return `<div class="minigame-line" style="--minigame-accent:${conf.accent}">${tabIcon(skillId, 0.625)} ${conf.label} <span class="muted">· next chance ${wait < 1000 ? 'in a moment' : `in about ${duration(wait)}`}</span> ${aboutButton('minigames')}</div>`;
    }
    let body;
    if (ch) {
        // the time left, as a bar draining under the prompt
        const left = Math.max(0, Math.min(1, (ch.expiresAt - now) / CHALLENGE_MS));
        const timer = `<i class="mg-time" style="--p:${(left * 100).toFixed(1)}%" aria-label="${Math.max(0, Math.ceil((ch.expiresAt - now) / 1000))} seconds left"></i>`;
        if (ch.type === 'timing' || ch.type === 'moving-target') {
            body = `<div class="minigame-prompt">${ch.type === 'timing' ? 'Tap when the marker is inside the glowing zone.' : conf.desc}</div>${timer}
                <div class="minigame-timing-track"><div class="minigame-timing-zone" style="left:${ch.zoneStart * 100}%; width:${ch.zoneWidth * 100}%; background:${conf.accent}"></div>
                <div class="minigame-timing-marker" id="mg-marker-${skillId}" style="left:${animatedPosition(ch, now) * 100}%; background:${conf.accent}">${MINIGAME_MARKER[skillId] ? sprite(MINIGAME_MARKER[skillId], { scale: 0.75, cls: 'soft' }) : ''}</div></div>
                <div class="minigame-actions"><button class="minigame-action-btn" onclick="FI.resolveMinigame('${skillId}')">${ch.type === 'timing' ? 'Tap now' : skillId === 'fishing' ? 'Strike' : 'Loose arrow'}</button><button class="minigame-secondary-btn" onclick="FI.failMinigame('${skillId}')">Skip</button></div>`;
        } else if (ch.type === 'heat') {
            body = `<div class="minigame-prompt">Tap the flame to keep the heat inside the band, then plate it.</div>${timer}
                <div class="minigame-heat-track"><div class="minigame-timing-zone" style="left:${ch.targetStart * 100}%; width:${ch.targetWidth * 100}%; background:${conf.accent}"></div><div class="minigame-heat-fill" id="mg-heat-${skillId}" style="width:${ch.heat * 100}%; background:${conf.accent}"></div></div>
                <div class="minigame-actions"><button class="minigame-action-btn" onclick="FI.pumpHeat('${skillId}')">${glyph('flame')} Tap heat</button><button class="minigame-start-btn" onclick="FI.resolveMinigame('${skillId}')">Plate it</button></div>`;
        } else {
            body = `<div class="minigame-prompt">Drag the stabiliser into the glowing channel, then lock the brew.</div>${timer}
                <div class="minigame-drag-shell"><div class="minigame-drag-zone" style="left:${ch.targetStart * 100}%; width:${ch.targetWidth * 100}%; background:${conf.accent}"></div>
                <input type="range" min="0" max="1" step="0.01" value="${ch.dragValue.toFixed(2)}" class="minigame-drag-slider" oninput="FI.setDragValue('${skillId}', this.value)"></div>
                <div class="minigame-actions"><button class="minigame-action-btn" onclick="FI.resolveMinigame('${skillId}')">Stabilise</button><button class="minigame-secondary-btn" onclick="FI.failMinigame('${skillId}')">Vent</button></div>`;
        }
    } else {
        body = `<div class="minigame-prompt pulse">A chance appears! <span class="muted">${esc(conf.desc)} (${Math.ceil((mg.opportunityUntil - now) / 1000)}s)</span></div>
            <button class="minigame-action-btn" onclick="FI.startMinigame('${skillId}')">${conf.actionText}</button>`;
    }
    return `<div class="minigame-panel" style="--minigame-accent:${conf.accent}">
        <div class="minigame-header">
            <div class="minigame-title">${tabIcon(skillId, 0.75)} ${conf.label} ${aboutButton('minigames')}</div>
            <div class="minigame-boost-pill ${boostLeft > 0 ? 'live' : ''}">${boostLeft > 0 ? `+${Math.round(mg.bonus * 100)}% speed · ${Math.ceil(boostLeft / 1000)}s` : `Win: +${Math.round(BALANCE.minigame.baseBonus * 100)}–${Math.round(BALANCE.minigame.maxBonus * 100)}% speed`}${mg.streak > 1 ? ` · streak ${mg.streak}` : ''}</div>
        </div>
        ${body}
    </div>`;
}

// ---------- smithing & crafting ----------

/** A recipe (smelting, forging, jewellery, a tool) as an action card. */
function recipeCard({ title, icon, pic = null, color, inputs, note = '', have, haveIcon, haveName = '', skill, xp, baseXp, interval, baseInterval, active, stalled, onclick, disabled, reqText, luck = '', mastery = '', tip = '' }, state) {
    if (disabled) return actionCard({ locked: reqText, art: icon, pic, title, color });
    return actionCard({
        id: `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, art: icon, pic, title, color, note, inputs: needChips(state, Object.fromEntries(inputs)), time: interval,
        tip: tip || `+${xp} XP · ${seconds(interval)}`, active, stalled: active && stalled, onclick, have, haveIcon, haveName,
        stats: `${xpTimeStats(skill, xp, baseXp ?? xp, interval, baseInterval ?? interval)}${luck}`, mastery
    });
}

/** The steps of a workshop as a row of tabs: one step on screen at a time. */
// A view may carry a picture (HTML) to show instead of its step number, when the views are not steps.
function segments(views, current, handler, label) {
    return `<div class="seg" role="group" aria-label="${esc(label)}">${views.map(([id, text, pic], i) =>
        `<button class="seg-btn${current === id ? ' on' : ''}" onclick="${handler}('${id}')" aria-pressed="${current === id}">${pic ? `<span class="seg-pic">${pic}</span>` : `<b>${i + 1}</b>`}${esc(text)}</button>`).join('')}</div>`;
}

export function renderSmithing(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'smithing');
    const action = state.action;
    const anvil = seen(state, 'anvil');
    const view = ['smelt', 'forge', 'tools', ...(anvil ? ['anvil'] : [])].includes(ui.smithView) ? ui.smithView : 'smelt';
    let body = '';
    if (view === 'smelt') {
        body = `<div class="node-grid">${withNext(SMELTING_RECIPES, r => r.levelReq, level).map(r => {
            const def = resolveAction(state, { kind: 'smelt', id: r.id });
            return recipeCard({
                title: r.name, icon: resIcon(r.produces, { scale: 1.5 }), pic: cardPic(r.id, 'smithy'), color: res(r.produces).color, inputs: Object.entries(r.consumes),
                have: state.resources[r.produces], haveIcon: resIcon(r.produces), haveName: res(r.produces).name,
                skill: 'smithing', xp: Math.round(r.xp * d.xpMult), baseXp: r.xp, interval: intervalFor(def, d), baseInterval: r.interval, luck: luckStats(d, def), mastery: masteryRow(state, 'smithing', def.mastery),
                active: action?.kind === 'smelt' && action.id === r.id, stalled: action?.stalled,
                onclick: `FI.smelt('${r.id}')`, disabled: level < r.levelReq, reqText: `Level ${r.levelReq}`
            }, state);
        }).join('')}</div>`;
    } else if (view === 'forge') {
        const metals = FORGE_METALS.filter(m => level >= m.levelReq);
        // The metal on the anvil: the one picked, else the best there are bars for, else the best known.
        const metal = metals.find(m => m.bar === ui.smithMetal) || [...metals].reverse().find(m => state.resources[m.bar] > 0) || metals[metals.length - 1] || FORGE_METALS[0];
        const recipes = SMITHING_TYPES.map(type => ({ type, recipe: resolveAction(state, { kind: 'smith', type, bar: metal.bar }) }));
        const cards = withNext(recipes, r => r.recipe.levelReq, level).sort((a, b) => a.recipe.levelReq - b.recipe.levelReq).map(({ type, recipe }) => recipeCard({
            title: `${metal.name} ${TYPE_NAMES[type]}`, icon: sprite(`item/${type}/${metal.tier}`, { scale: 1.5, fallback: TYPE_ICONS[type] }), pic: cardPic(`forge_${type}`, 'smithy'), color: res(metal.bar).color,
            inputs: Object.entries(recipe.consumes), skill: 'smithing', xp: Math.round(recipe.xp * d.xpMult), baseXp: recipe.xp, interval: intervalFor(recipe, d), baseInterval: recipe.interval, luck: luckStats(d, recipe),
            active: action?.kind === 'smith' && action.type === type && action.bar === metal.bar, stalled: action?.stalled,
            onclick: `FI.smith('${type}','${metal.bar}')`, disabled: level < recipe.levelReq, reqText: `Level ${recipe.levelReq}`
        }, state)).join('');
        const picker = metals.length > 1 ? materialPicks('Metal', metals.map(m => ({ id: m.bar, name: `${m.name} bars`, have: state.resources[m.bar] })), metal.bar, 'FI.selectSmithMetal') : '';
        const mastery = masteryRow(state, 'smithing', resolveAction(state, { kind: 'smith', type: SMITHING_TYPES[0], bar: metal.bar }).mastery, `${metal.name} forging`);
        body = `${picker || mastery ? `<div class="forge-bar">${picker}${mastery}</div>` : ''}
            <div class="node-grid">${cards}</div>`;
    } else if (view === 'anvil') {
        body = renderAnvil(state);
    } else {
        const tools = ['pickaxe', 'axe', 'tinderbox', 'hoe'].filter(id => isUnlocked(state, TOOLS[id].skill) || state.tools[id] > 0);
        body = `<div class="node-grid">${tools.map(toolId => renderToolCard(game, toolId)).join('')}</div>`;
    }
    return `<section class="glass-panel skill-panel ${skillPainted('smithing')}">
        ${xpHeader(game, 'smithing')}
        ${segments([['smelt', 'Smelt'], ['forge', 'Forge'], ...(anvil ? [['anvil', 'Anvil']] : []), ['tools', 'Tools']], view, 'FI.smithView', 'Smithing steps')}
        ${body}
    </section>`;
}

/**
 * The anvil (systems/anvil.js): every weapon and piece of armour the hero wears, with its two jobs,
 * reinforcing (+1) and rerolling its bonuses, and the bars and essence each takes. A job that can be
 * done now glows; one that waits on Smithing names the level.
 */
function renderAnvil(state) {
    const worn = SMITHING_TYPES.map(type => state.equipped[type]).filter(Boolean);
    if (!worn.length) return '<p class="muted small anvil-empty">Wear a weapon or a piece of armour to work it here.</p>';
    return `<div class="anvil-grid">${worn.map(item => anvilCard(state, item)).join('')}</div>`;
}

function anvilCard(state, item) {
    const id = Number(item.id);
    const up = item.upgrade || 0;
    const stat = (value, mult) => fmt(Math.round((value || 0) * mult));
    const now = 1 + UPGRADE_STEP * up;
    const next = 1 + UPGRADE_STEP * (up + 1);
    const job = (kind, art, label, tip) => {
        const cost = anvilCost(state, item, kind);
        if (cost.why === 'none') return '';
        if (cost.why === 'max') return '<span class="anvil-done">Fully reinforced</span>';
        if (cost.why === 'level') return `<span class="req">Smithing ${cost.level}</span>`;
        return `<button class="anvil-btn${cost.ok ? ' ready' : ''}" onclick="FI.${kind}(${id})" ${cost.ok ? '' : 'aria-disabled="true"'} title="${esc(tip)}">
            <span class="anvil-job">${art}<b>${label}</b></span><span class="anvil-cost">${needChips(state, { [cost.bar]: cost.bars, essence: cost.essence })}</span></button>`;
    };
    const lines = [item.atk ? `${ATK_ICON} ${stat(item.atk, now)}${up < MAX_UPGRADE ? ` <i>→ ${stat(item.atk, next)}</i>` : ''}` : '', item.def ? `${DEF_ICON} ${stat(item.def, now)}${up < MAX_UPGRADE ? ` <i>→ ${stat(item.def, next)}</i>` : ''}` : ''].filter(Boolean);
    const bonuses = item.affixes?.length ? item.affixes.map(describeAffix).join(', ') : '';
    return `<div class="anvil-card" id="anvil-${id}" style="--r:${esc(item.color || '#e2e8f0')}">
        <div class="anvil-art">${sprite(itemSpriteKey(item), { scale: 2, fallback: esc(item.icon) })}${up ? `<span class="anvil-plus">+${up}</span>` : ''}</div>
        <div class="anvil-name" title="${esc(bonuses)}">${esc(item.name)}</div>
        <div class="anvil-stats small">${lines.join(' ')}</div>
        <div class="anvil-jobs">
            ${job('reinforce', glyph('up'), `+${up + 1}`, `Reinforce to +${up + 1}: +${Math.round(UPGRADE_STEP * 100)}% base stats`)}
            ${job('reroll', glyph('dice'), 'Reroll', `New bonuses in place of ${bonuses || 'these'}`)}
        </div>
    </div>`;
}

/**
 * Picture tiles to pick a material for the anvil or the bench (a metal, a setting, a gem): each with
 * how many you hold, the picked one lit. Its small label says what is being picked.
 */
function materialPicks(label, options, picked, handler) {
    if (!options.length) return '';
    const tiles = options.map(o => `<button class="pick${o.id === picked ? ' on' : ''}${o.have > 0 ? '' : ' empty'}" onclick="${handler}('${o.id}')" title="${esc(o.name)}: ${fmt(o.have)}" aria-label="${esc(o.name)}: ${fmt(o.have)}" aria-pressed="${o.id === picked}">${resIcon(o.id, { scale: 1.25 })}<span class="pick-sub">${shortQty(o.have)}</span></button>`).join('');
    return `<div class="material-picks"><span class="loadout-label">${label}</span><div class="pick-row" role="group" aria-label="${label}">${tiles}</div></div>`;
}

function renderToolCard(game, toolId) {
    const state = game.state;
    const d = game.derived;
    const tool = TOOLS[toolId];
    const owned = state.tools[toolId] || 0;
    const next = tool.tiers.find(t => t.tier === owned + 1);
    const icon = sprite(`tool/${toolId}`, { scale: 1.5, fallback: tool.icon });
    const best = picBand(cardPic(`tool_${toolId}`, tool.madeBy === 'crafting' ? 'jeweller' : 'smithy'));
    if (!next) return `<div class="node-card locked${best ? ' has-pic' : ''}">${best}<div class="skill-action-art">${icon}</div><div class="node-name">${esc(tool.tiers[tool.tiers.length - 1].name)}</div><div class="muted small">The best there is</div></div>`;
    const level = skillLevel(state, tool.madeBy);
    return recipeCard({
        title: next.name, icon, pic: cardPic(`tool_${toolId}`, tool.madeBy === 'crafting' ? 'jeweller' : 'smithy'), color: '#facc15', inputs: Object.entries(next.consumes), note: toolEffect(toolId, next.tier),
        skill: tool.madeBy, xp: Math.round(next.xp * d.xpMult), baseXp: next.xp, interval: actionInterval(4000, d, tool.madeBy), baseInterval: 4000,
        active: state.action?.kind === 'tool' && state.action.tool === toolId, stalled: state.action?.stalled,
        onclick: `FI.makeTool('${toolId}', ${next.tier})`, disabled: level < next.levelReq, reqText: `${SKILLS[tool.madeBy].name} ${next.levelReq}`
    }, state);
}

export function renderCrafting(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'crafting');
    const action = state.action;
    const bars = JEWEL_BARS.filter(b => level >= b.levelReq);
    const gems = GEM_TIERS.filter(g => level >= g.levelReq);
    const bar = bars.find(b => b.bar === ui.craftBar) || [...bars].reverse().find(b => state.resources[b.bar] > 0) || bars[0] || JEWEL_BARS[0];
    const gem = gems.find(g => g.gem === ui.craftGem) || [...gems].reverse().find(g => state.resources[g.gem] > 0) || gems[gems.length - 1] || GEM_TIERS[0];
    const recipes = CRAFTING_TYPES.map(type => ({ type, recipe: resolveAction(state, { kind: 'craft', type, bar: bar.bar, gem: gem.gem }) }));
    const cards = withNext(recipes, r => r.recipe.levelReq, level).sort((a, b) => a.recipe.levelReq - b.recipe.levelReq).map(({ type, recipe }) => recipeCard({
        title: `${res(gem.gem).name} ${TYPE_NAMES[type]}`, icon: sprite(`item/${type}/${res(gem.gem).tier}`, { scale: 1.5, fallback: TYPE_ICONS[type] }), pic: cardPic(`craft_${type}`, 'jeweller'), color: res(gem.gem).color,
        inputs: Object.entries(recipe.consumes), skill: 'crafting', xp: Math.round(recipe.xp * d.xpMult), baseXp: recipe.xp, interval: intervalFor(recipe, d), baseInterval: recipe.interval, luck: luckStats(d, recipe),
        active: action?.kind === 'craft' && action.type === type && action.bar === bar.bar && action.gem === gem.gem, stalled: action?.stalled,
        onclick: `FI.craft('${type}','${bar.bar}','${gem.gem}')`, disabled: level < recipe.levelReq, reqText: `Level ${recipe.levelReq}`
    }, state)).join('');
    const tools = ['bow', 'rod'].filter(id => isUnlocked(state, TOOLS[id].skill) || state.tools[id] > 0);
    return `<section class="glass-panel skill-panel ${skillPainted('crafting')}">
        ${xpHeader(game, 'crafting')}
        <div class="forge-bar">
            ${materialPicks('Setting', bars.map(b => ({ id: b.bar, name: `${b.name} setting`, have: state.resources[b.bar] })), bar.bar, 'FI.selectCraftBar')}
            ${materialPicks('Gem', gems.map(g => ({ id: g.gem, name: res(g.gem).name, have: state.resources[g.gem] })), gem.gem, 'FI.selectCraftGem')}
            ${masteryRow(state, 'crafting', resolveAction(state, { kind: 'craft', type: CRAFTING_TYPES[0], bar: bar.bar, gem: gem.gem }).mastery, `${res(gem.gem).name} jewellery`)}
        </div>
        <div class="node-grid">${cards}</div>
        ${tools.length ? `<h3 class="section-title">Bows and rods</h3><div class="node-grid">${tools.map(id => renderToolCard(game, id)).join('')}</div>` : ''}
    </section>`;
}

// ---------- inventory ----------

// The inventory is an armory: the hero with a slot for each piece of gear, the bag as a grid of tiles,
// and the item on the table (the one picked, or hovered) with everything that can be done with it.
const SLOT_LABELS = { Ring1: 'Ring', Ring2: 'Ring', Ear1: 'Earring', Ear2: 'Earring' };
// The jewellery slots join the doll once jewellery exists for the player (Crafting, or a first ring).
const DOLL = {
    plain: { left: ['Head', 'Body', 'Legs'], right: ['Gloves', 'Boots'] },
    jewelled: { left: ['Head', 'Neck', 'Body', 'Legs', 'Boots'], right: ['Gloves', 'Ring1', 'Ring2', 'Ear1', 'Ear2'] }
};
const DOLL_HANDS = ['Weapon', 'Shield'];

/** An item anywhere: worn (with its slot) or in the bag. */
function findItem(state, id) {
    if (id === null || id === undefined) return null;
    for (const slot of EQUIP_SLOTS) if (state.equipped[slot]?.id === id) return { item: state.equipped[slot], slot };
    const item = state.inventory.find(i => i.id === id);
    return item ? { item, slot: null } : null;
}

function itemTile(state, item, { slot = null, selected = false } = {}) {
    const id = Number(item.id);
    const up = item.upgrade || 0;
    const rarity = RARITIES.find(r => r.id === item.rarity);
    const wearable = canWear(state, item);
    const better = !slot && wearable && isUpgrade(state, item);
    const label = `${item.name}${up ? ` +${up}` : ''}, ${rarity?.name || item.rarity}${better ? ', better than what you wear' : ''}${item.locked ? ', locked' : ''}`;
    return `<button class="tile r-${esc(item.rarity)}${selected ? ' selected' : ''}${wearable ? '' : ' unwearable'}" style="--r:${esc(item.color || rarity?.color || '#e2e8f0')}" onclick="FI.selectItem(${id})" onmouseenter="FI.previewItem(${id})" onmouseleave="FI.previewItem(null)" aria-label="${esc(label)}" aria-pressed="${selected}">${sprite(itemSpriteKey(item), { scale: 1.5, cls: 'tile-icon', fallback: esc(item.icon) })}${up ? `<b class="tile-up">+${up}</b>` : ''}${item.locked ? '<i class="tile-lock" aria-hidden="true">🔒</i>' : ''}${better ? '<i class="tile-better" aria-hidden="true">▲</i>' : ''}</button>`;
}

function dollSlot(state, slot, selectedId) {
    const item = state.equipped[slot];
    const label = SLOT_LABELS[slot] || slot;
    const tile = item
        ? itemTile(state, item, { slot, selected: item.id === selectedId })
        : `<div class="tile empty" title="${label}: empty">${sprite(slotSpriteKey(slot.replace(/\d$/, '')), { scale: 1.5, cls: 'tile-icon', fallback: TYPE_ICONS[slot.replace(/\d$/, '')] })}</div>`;
    return `<div class="doll-slot">${tile}<span class="doll-label">${label}</span></div>`;
}

/** The item on the table: stats, affixes, how it compares with what is worn, and what can be done with it. */
/** A count that fits in a tile's corner: 240, 4.5K, 12K, 3.10M. */
function shortQty(n) {
    if (n < 1000) return String(Math.floor(n));
    if (n < 1e6) return `${(n / 1000).toFixed(n < 1e4 ? 1 : 0)}K`;
    return fmt(n);
}

/** One material in the bank: its icon and how many. */
function bankTile(id, state, picked) {
    const r = res(id);
    return `<button class="tile bank-tile${picked === id ? ' selected' : ''}" style="--r:${r.color}" onclick="FI.selectRes('${id}')" title="${esc(r.name)}" aria-label="${esc(r.name)}: ${fmt(state.resources[id])}" aria-pressed="${picked === id}">${resIcon(id, { scale: 1.5, cls: 'tile-icon' })}<span class="bank-qty">${shortQty(state.resources[id])}</span></button>`;
}

/** The picked material: what it is, how many, and selling it. */
function bankDetail(id, state) {
    const r = res(id);
    const about = [r.category, r.heals ? `heals ${r.heals}` : '', r.desc ? esc(r.desc) : ''].filter(Boolean).join(' · ');
    const sell = id === 'essence'
        ? '<span class="muted small">Upgrades and reforges gear</span>'
        : `<div class="res-actions"><span class="muted small">${coinIcon()} ${sellValue(id)} each</span><button class="mini-btn" onclick="FI.sellRes('${id}',1)">Sell 1</button><button class="mini-btn" onclick="FI.sellRes('${id}',10)">10</button><button class="mini-btn" onclick="FI.sellRes('${id}',1e9)">All</button></div>`;
    return `<div class="bank-detail" style="--r:${r.color}">
        <div class="bank-detail-art">${resIcon(id, { scale: 2 })}</div>
        <div class="bank-detail-text"><b style="color:${r.color}">${esc(r.name)}</b><span class="muted small">${about}</span><span class="bank-detail-qty">×${fmt(state.resources[id])}</span></div>
        ${sell}
    </div>`;
}

export function renderItemDetail(game, id) {
    const state = game.state;
    const found = findItem(state, id);
    if (!found) {
        return `<div class="detail-empty"><p class="muted">Tap a piece of gear to look at it here.</p></div>`;
    }
    const { item, slot } = found;
    const itemId = Number(item.id);
    const up = item.upgrade || 0;
    const mult = 1 + UPGRADE_STEP * up;
    const rarity = RARITIES.find(r => r.id === item.rarity);
    const wearable = canWear(state, item);
    const locked = gearIsLocked(state);   // inside a dungeon run
    const afford = c => state.resources.essence >= c.essence && state.gold >= c.gold;
    const atk = Math.round((item.atk || 0) * mult);
    const def = Math.round((item.def || 0) * mult);
    const cost = itemUpgradeCost(game, item);
    // Upgrading and reforging cost essence: they show once the player has met essence. Weapons and
    // armour are worked at the anvil instead (a step of Smithing): the worn ones say so.
    const essence = seen(state, 'essence') && !onAnvil(item);
    const anvilBtn = onAnvil(item) && slot && seen(state, 'anvil') && isUnlocked(state, 'smithing')
        ? `<button class="mini-btn" onclick="FI.toAnvil(${itemId})" title="Reinforce it and reroll its bonuses with bars">${glyph('up')} Anvil</button>` : '';
    const upgradeBtn = !essence ? anvilBtn : up < MAX_UPGRADE
        ? `<button class="mini-btn" onclick="FI.upgrade(${itemId})" ${afford(cost) ? '' : 'disabled'} title="+5% base stats per level">${glyph('up')} Upgrade to +${up + 1}: ${resIcon('essence')} ${cost.essence} ${coinIcon()} ${fmt(cost.gold)}</button>`
        : '<span class="muted small">Fully upgraded</span>';
    const reforge = itemReforgeCost(game, item);
    const reforgeBtn = essence && item.affixes?.length && !item.uniqueId
        ? `<button class="mini-btn" onclick="FI.reforge(${itemId})" ${afford(reforge) ? '' : 'disabled'} title="Reroll this item's affixes (the cost rises with each reforge)">${glyph('dice')} Reforge: ${resIcon('essence')} ${reforge.essence} ${coinIcon()} ${fmt(reforge.gold)}</button>`
        : '';
    const salvage = salvagePreview(item);
    const salvageText = [salvage.essence ? `${salvage.essence} essence` : '', ...Object.entries(salvage.materials).map(([mid, q]) => `~${q.toFixed(1)} ${RESOURCES[mid].name}`)].filter(Boolean).join(', ') || 'nothing';
    const source = item.source === 'drop' ? 'dropped' : item.source === 'unique' ? 'unique' : 'crafted';
    let compare = '';
    if (!slot) {
        const worn = (TYPE_SLOTS[item.type] || []).map(sl => state.equipped[sl]).sort((a, b) => itemScore(a) - itemScore(b))[0];
        const wornMult = worn ? 1 + UPGRADE_STEP * (worn.upgrade || 0) : 0;
        const delta = (value, icon) => value ? `<span class="${value > 0 ? 'up' : 'down'}">${icon} ${value > 0 ? '+' : '−'}${fmt(Math.abs(value))}</span>` : '';
        const deltas = delta(atk - Math.round((worn?.atk || 0) * wornMult), ATK_ICON) + delta(def - Math.round((worn?.def || 0) * wornMult), DEF_ICON);
        compare = `<div class="detail-compare">${worn ? `Against your ${esc(worn.name)}${worn.upgrade ? ` +${worn.upgrade}` : ''}` : 'That slot is empty'}: ${deltas || '<span class="muted">same stats</span>'}</div>`;
    }
    return `<div class="detail" style="--r:${esc(item.color || rarity?.color || '#e2e8f0')}">
        <button class="detail-close" onclick="FI.selectItem(null)" aria-label="Close">✕</button>
        <div class="detail-head">
            <div class="detail-art">${sprite(itemSpriteKey(item), { scale: 2, fallback: esc(item.icon) })}</div>
            <div class="detail-title">
                <div class="detail-name">${esc(item.name)}${up ? ` +${up}` : ''}</div>
                <div class="detail-sub">${esc(rarity?.name || item.rarity)} ${esc(TYPE_NAMES[item.type] || item.type)} · tier ${Number(item.tier)}${item.depth ? ` · depth ${Number(item.depth)}` : ''} · ${source}${slot ? ' · worn' : ''}</div>
            </div>
            <button class="lock-btn ${item.locked ? 'on' : ''}" onclick="FI.toggleLock(${itemId})" aria-pressed="${!!item.locked}" aria-label="${item.locked ? 'Unlock' : 'Lock'} ${esc(item.name)}" title="${item.locked ? 'Locked: never sold or salvaged' : 'Lock to protect it from selling and salvage'}">${item.locked ? '🔒' : '🔓'}</button>
        </div>
        <div class="detail-stats">${atk ? `<span class="item-atk">${ATK_ICON} ${fmt(atk)} ATK</span>` : ''}${def ? `<span class="item-def">${DEF_ICON} ${fmt(def)} DEF</span>` : ''}${def * BASE.hpPerDef >= 1 ? `<span class="item-hp" title="Armour adds health: one for every ${Math.round(1 / BASE.hpPerDef)} defence, raised by your health bonuses">${glyph('heart')} +${fmt(Math.floor(def * BASE.hpPerDef))}</span>` : ''}${atk || def ? '' : '<span class="muted">No base stats</span>'}</div>
        ${item.affixes?.length ? `<ul class="detail-affixes">${item.affixes.map(a => `<li>${esc(describeAffix(a))}</li>`).join('')}</ul>` : ''}
        ${compare}
        ${wearable ? '' : `<div class="req">Needs combat level ${TIER_WEAR_LEVEL[item.tier]}</div>`}
        ${locked ? '<div class="req">Gear is locked until the dungeon run ends</div>' : ''}
        <div class="detail-actions">
            ${slot ? `<button class="mini-btn" onclick="FI.unequip('${slot}')" ${locked ? 'disabled' : ''}>Take off</button>` : `<button class="prestige-btn" onclick="FI.equip(${itemId})" ${wearable && !locked ? '' : 'disabled'}>Equip</button>`}
            ${upgradeBtn}${reforgeBtn}
            ${slot ? '' : `<button class="mini-btn" onclick="FI.salvage(${itemId})" ${item.locked ? 'disabled' : ''} title="Salvage for ${esc(salvageText)}">${resIcon('essence')} Salvage</button><button class="sell-btn mini-btn" onclick="FI.sellItem(${itemId})" ${item.locked ? 'disabled' : ''}>${sprite('gold', { scale: 0.5, cls: 'soft res-spr' })} Sell for ${fmt(itemSellValue(item))}</button>`}
        </div>
    </div>`;
}

export function renderInventory(game, ui) {
    const state = game.state;
    const d = game.derived;
    const selectedId = findItem(state, ui.invSelected) ? ui.invSelected : null;
    const shownId = findItem(state, ui.invPreview) ? ui.invPreview : selectedId;
    const items = [...state.inventory].sort((a, b) => itemScore(b) - itemScore(a));
    const size = bagSize();
    const hasGear = items.length > 0 || EQUIP_SLOTS.some(slot => state.equipped[slot]);
    // A new bag shows a row or two of cells; the whole grid comes once the bag is in use.
    const cells = seen(state, 'bag_tools') ? size : Math.min(size, Math.max(8, Math.ceil((items.length + 1) / 8) * 8));
    const bag = items.map(i => itemTile(state, i, { selected: i.id === selectedId })).join('')
        + Array.from({ length: Math.max(0, cells - items.length) }, () => '<div class="tile empty" aria-hidden="true"></div>').join('');
    const owned = Object.keys(RESOURCES).filter(id => state.resources[id] > 0);
    const categories = ['ore', 'bar', 'gem', 'log', 'raw', 'food', 'crop', 'herb', 'potion', 'material'].filter(c => owned.some(id => RESOURCES[id].category === c));
    const filters = owned.length > 12 && categories.length > 1;   // a handful of materials needs no sorting
    const filter = filters && categories.includes(ui.invFilter) ? ui.invFilter : 'all';
    const resources = owned.filter(id => filter === 'all' || RESOURCES[id].category === filter);
    const picked = ui.resSelected && state.resources[ui.resSelected] > 0 ? ui.resSelected : null;
    const auto = state.settings.autoSalvage || 'off';
    const hasCommons = items.some(i => i.rarity === 'common' && !i.locked);
    const doll = seen(state, 'jewellery') ? DOLL.jewelled : DOLL.plain;
    const stat = (icon, value, label, title) => `<span title="${title}">${icon} <b>${value}</b> ${label}</span>`;
    return `<div class="armory${hasGear ? '' : ' bare'}">
        <section class="glass-panel doll-panel ${painted('armory', 'center 62%')}">
            <div class="panel-header"><h2>${esc(state.hero?.name || 'Your hero')}</h2>${rankBadge(state)}<span class="muted small">Combat level ${d.combatLevel}</span></div>
            <div class="doll">
                <div class="doll-col">${doll.left.map(sl => dollSlot(state, sl, selectedId)).join('')}</div>
                <div class="doll-figure">${heroSprite(state, { scale: 6 })}</div>
                <div class="doll-col">${doll.right.map(sl => dollSlot(state, sl, selectedId)).join('')}</div>
                <div class="doll-hands">${DOLL_HANDS.map(sl => dollSlot(state, sl, selectedId)).join('')}</div>
            </div>
            <div class="doll-stats">
                ${stat(ATK_ICON, fmt(d.atk), 'attack', 'Attack: the damage of a hit, before the monster\'s defence')}
                ${stat(DEF_ICON, fmt(d.def), 'defence', 'Defence: taken off every hit you receive')}
                ${stat(glyph('heart'), fmt(d.maxHp), 'health', `Health: from your level, your armour (one for every ${Math.round(1 / BASE.hpPerDef)} defence) and your health bonuses`)}
            </div>
            <div class="doll-stats minor">
                <span title="Critical hits: how often, and how much harder they hit">${glyph('crit')} ${pct(d.critChance, 1)} crit × ${d.critDmg.toFixed(2)}</span>
                <span title="Time between your attacks">${glyph('time')} ${seconds(d.attackInterval)}</span>
                ${d.dodge > 0 ? `<span title="Chance to dodge a hit">${glyph('dodge')} ${pct(d.dodge, 1)}</span>` : ''}
                <span title="How long your hero keeps going while you are away">${glyph('away')} ${Math.round(d.offlineMs / 3600000)}h away</span>
            </div>
        </section>
        ${hasGear ? `<section class="glass-panel detail-panel${shownId !== null ? ' has-item' : ''} ${painted('vault', 'center 55%')}" id="item-detail" aria-live="polite">${renderItemDetail(game, shownId)}</section>` : ''}
        <section class="glass-panel bag-panel ${painted('chest', 'center 50%')}">
            <div class="panel-header"><h2>Bag <span class="muted">${items.length}/${size}</span></h2>
                ${seen(state, 'bag_tools') ? `<div class="btn-row">
                    <button class="mini-btn" onclick="FI.salvageAll('common')" ${hasCommons ? '' : 'disabled'}>${resIcon('essence')} Salvage commons</button>
                    <button class="mini-btn" onclick="FI.sellAll('common')" ${hasCommons ? '' : 'disabled'}>${sprite('gold', { scale: 0.5, cls: 'soft res-spr' })} Sell commons</button>
                </div>` : ''}
            </div>
            <div class="bag-grid">${bag}</div>
            ${items.length ? '' : '<p class="muted small bag-hint">No spare gear yet. Bosses drop some, and a smith can forge it.</p>'}
            ${seen(state, 'auto_salvage') ? `<div class="muted small auto-salvage" title="Dropped gear up to this quality is salvaged for essence as it lands: never an upgrade, never a locked item. When the bag is full the weakest item is salvaged. So far ${state.stats.itemsDropped} items dropped, ${state.stats.itemsSalvaged} salvaged (${state.stats.itemsAutoSalvaged} automatically).">
                <span>${resIcon('essence')} Auto-salvage drops up to</span>
                <span class="rarity-pills" role="group" aria-label="Auto-salvage drops up to">${AUTO_SALVAGE_OPTIONS.map(o => {
                    const r = RARITIES.find(x => x.id === o);
                    return `<button class="rarity-pill${o === auto ? ' on' : ''}" style="--r:${r ? r.color : '#94a3b8'}" onclick="FI.setAutoSalvage('${o}')" aria-pressed="${o === auto}">${o === 'off' ? 'Off' : esc(r.name)}</button>`;
                }).join('')}</span>
            </div>` : ''}
        </section>
    </div>
    <section class="glass-panel ${painted('storeroom', 'center 45%')}">
        <div class="panel-header"><h2>Materials</h2>
            ${filters ? `<div class="filter-row">${['all', ...categories].map(c => `<button class="mini-btn ${filter === c ? 'active' : ''}" onclick="FI.invFilter('${c}')">${c}</button>`).join('')}</div>` : ''}
        </div>
        ${resources.length ? `<div class="bank-grid">${resources.map(id => bankTile(id, state, picked)).join('')}</div>
        ${picked ? bankDetail(picked, state) : '<p class="muted small bank-hint">Tap a material to see it and sell it.</p>'}`
        : '<div class="empty-state">Nothing here yet. What you mine, cut, hunt and win in fights lands here.</div>'}
    </section>`;
}

// ---------- ranks ----------

// The cloak's colour as a dot (the rank names it; the colour is what the hero wears).
const CLOAK_COLORS = { red: '#c0362c', green: '#3fa34d', blue: '#3b6fd8', purple: '#a35ad6', gold: '#e9b23a', white: '#e8e4da', black: '#26222b' };

/** The hero's rank (data/ranks.js), with how far the next one is: a small badge in his cloak's colour. */
function rankBadge(state) {
    const count = state.prestige.count;
    const rank = rankFor(count);
    const next = nextRank(count);
    const tip = `${rank.name}: ${count} prestige${count === 1 ? '' : 's'}${next ? `. ${next.name} at ${next.prestiges}, in a ${next.cloak} cloak` : '. The highest rank'}`;
    return `<span class="rank-badge" style="--cloak:${CLOAK_COLORS[rank.cloak] || '#c0362c'}" title="${esc(tip)}"><i aria-hidden="true"></i>${esc(rank.name)}${next ? ` <span class="rank-next">${count}/${next.prestiges}</span>` : ''}</span>`;
}

// ---------- shop ----------

/** The perks as item cards (the Shop shows them, and so does the dialog opened from the fight). */
// Every perk level costs one skill point, so the price is said once, above the list; a row's button
// says what it does (Learn, then Upgrade) and is lit only while there are points to spend.
function perkList(state) {
    const sp = state.prestige.skillPoints;
    return PERKS.map(p => {
        const level = state.perks[p.id] || 0;
        const action = level >= p.max ? '<span class="perk-max">Max</span>'
            : `<button class="shop-btn" onclick="FI.buyPerk('${p.id}')" ${sp > 0 ? '' : 'disabled'} title="${sp > 0 ? 'Costs 1 skill point' : 'Needs a skill point: every prestige brings more'}">${level ? 'Upgrade' : 'Learn'}</button>`;
        return `<div class="shop-item">
            <div class="perk-art">${sprite(`perk/${p.id}`, { scale: 2, fallback: p.icon })}${level ? `<b class="camp-lv">${level}</b>` : ''}</div>
            <div class="shop-item-info"><span class="shop-item-name">${esc(p.name)} <span class="muted small">${level}/${p.max}</span></span><span class="shop-item-desc">${esc(p.desc)}</span></div>
            ${action}
        </div>`;
    }).join('');
}

/** The line above the perks: how many points there are, and what a level costs. */
function perkPurse(state) {
    const sp = state.prestige.skillPoints;
    return sp > 0
        ? `You have <b class="sp-text">${sp} skill point${sp === 1 ? '' : 's'}</b>. Each perk level costs one, and lasts forever.`
        : 'No skill points now. Every prestige brings more; perks last forever.';
}

/** Perks in a window, opened from the SP chip on any screen, the prestige strip or the fight's dock. */
export function renderPerksModal(game) {
    const state = game.state;
    return `<div class="modal-content perks-modal ${painted('library', 'center 40%')}">
        <div class="modal-header">Perks</div>
        <p class="about-blurb">${perkPurse(state)}</p>
        <div class="shop-list">${perkList(state)}</div>
        <div class="modal-footer"><button class="modal-btn btn-confirm" data-autofocus onclick="FI.closeModal()">Done</button></div>
    </div>`;
}

export function renderShop(game, ui) {
    const state = game.state;
    const d = game.derived;
    const perks = perkList(state);
    const goods = GOLD_SHOP.map(e => {
        const price = goldShopPrice(game, e);
        const [resId] = Object.keys(e.gives);
        return `<div class="shop-item" title="Priced at ${e.costKills} kills' worth of gold at your best stage">
            <div class="shop-art">${resIcon(resId, { scale: 1.5 })}</div>
            <div class="shop-item-info"><span class="shop-item-name">${esc(e.name)}</span><span class="shop-item-desc">${esc(e.desc)}</span></div>
            <button class="gold-btn" onclick="FI.buyShop('${e.id}')" ${state.gold >= price ? '' : 'disabled'}>${sprite('gold', { scale: 0.5, cls: 'soft', fallback: '🪙' })} ${fmt(price)}</button>
        </div>`;
    }).join('');
    const preview = game.prestigePreview();
    return `${banner('shop')}
    <section class="glass-panel ${painted('market', 'center 55%')}">
        <div class="panel-header"><h2>Supplies</h2></div>
        <div class="shop-grid">${goods}</div>
    </section>
    <div class="two-col">
        <section class="glass-panel prestige-panel" style="${artStyle('prestige')}">
            <div class="panel-header"><h2>Prestige ${aboutButton('prestige')}</h2>${rankBadge(state)}</div>
            <div class="prestige-stats">
                <div><b>${fmt(state.prestige.tokens)}</b><span>tokens held: +${d.tokenPowerPct}% attack and defence</span></div>
                <div><b>${state.prestige.skillPoints}</b><span>skill points to spend</span></div>
                <div><b>+${preview.tokens}</b><span>tokens for this run (best stage ${state.combat.maxStage})</span></div>
                <div><b>${preview.startStage}</b><span>is the stage the next run starts at</span></div>
            </div>
            <button class="prestige-btn arcane" onclick="FI.openPrestige()" ${preview.allowed ? '' : 'disabled'}>${preview.allowed ? `Prestige for +${preview.tokens} tokens, +${preview.skillPoints} SP` : state.combat.maxStage < BALANCE.prestige.minStage ? `Reach stage ${BALANCE.prestige.minStage} to prestige` : preview.blockedBy ? `Prestige after the ${afterWhat(preview)}` : `Ready to prestige in ${duration(preview.waitMs)}`}</button>
        </section>
        <section class="glass-panel ${painted('library', 'center 40%')}">
            <div class="panel-header"><h2>Perks</h2></div>
            <p class="small perk-purse" title="+1 skill point per prestige, +1 per 25 stages of your record">${perkPurse(state)}</p>
            <div class="shop-list">${perks}</div>
        </section>
    </div>`;
}

// ---------- achievements ----------

// What each achievement's medal shows: a sprite key (or an emoji) for its kind of deed.
const MEDAL_ART = {
    kills: 'item/Weapon/3', goldEarned: 'gold', itemsCrafted: 'item/Body/4', petsFound: 'pet/fang', uniquesFound: 'uniq/goblin_crown',
    titanKills: 'titan/0', dungeonClears: 'mon/Goblin King', legendariesEquipped: 'item/Neck/7',
    prestiges: 'res/essence', obstaclesBuilt: 'obstacle/hurdles', minigameWins: 'res/topaz', masteryLevels: 'res/diamond', bestiaryStars: 'mon/Griffin', gildedKills: 'gold',
    masteries99: 'uniq/crystal_heart', skills99: 'crown', petPats: 'pet/fang', greatCrates: 'crate', recoveries: 'campfire', codexFound: 'item/Head/5'
};
const SKILL_MEDAL = {
    mining: 'res/runite_ore', woodcutting: 'res/magic_log', hunting: 'res/raw_dragon', fishing: 'res/raw_shark', firemaking: 'campfire',
    farming: 'res/starfruit', agility: 'item/Boots/5', cooking: 'res/cooked_shark', alchemy: 'res/health_potion',
    smithing: 'res/runite_bar', crafting: 'item/Ring/6', combat: 'item/Weapon/7'
};

/** A medal that also brings a look: the hero in it on the disc's rim (a silhouette until the medal is won). */
function medalLook(state, a, won) {
    const look = lookForMedal(a.id);
    if (!look) return '';
    return `<span class="medal-look" title="${esc(`Also a look for your hero: ${look.name}`)}">${heroSprite({ ...state, equipped: {}, hero: { ...state.hero, look: look.id } }, { scale: 1, cls: won ? '' : 'silhouette' })}</span>`;
}

/** A medal's picture: its deed's sprite (`scale` 1.5 in the Hall, 2 on the card that announces it). */
export function medalArt(a, scale = 1.5) {
    let key = a.req.type === 'skillLevel' ? SKILL_MEDAL[a.req.skill] : MEDAL_ART[a.req.key];
    if (a.req.key === 'maxStage') key = `mon/${ZONES[Math.min(ZONES.length - 1, Math.floor((a.req.value - 2) / STAGES_PER_ZONE))]?.boss}`;
    return sprite(key || 'crown', { scale, fallback: '🏆' });
}

/** The hall of trophies: the medals, the bestiary and the collection (pets, unique items), one at a time. */
export function renderHall(game, ui) {
    const view = ['medals', 'bestiary', 'collection', 'records'].includes(ui.hallView) ? ui.hallView : 'medals';
    const pic = key => sprite(key, { scale: 0.75, cls: 'soft' });
    const seg = segments([['medals', 'Medals', pic('crown')], ['bestiary', 'Bestiary', pic('mon/Griffin')], ['collection', 'Collection', pic('pet/scout')], ['records', 'Records', pic('perk/scholar')]], view, 'FI.hallView', 'Hall of trophies');
    const body = view === 'bestiary' ? renderBestiary(game) : view === 'collection' ? renderCollection(game) : view === 'records' ? renderRecords(game) : renderAchievements(game);
    return `${hallBanner(game)}<div class="hall-seg">${seg}</div>${body}`;
}

function hallBanner(game) {
    const done = ACHIEVEMENTS.filter(a => game.state.achievements[a.id]).length;
    const shown = ACHIEVEMENTS.filter(a => medalShown(game.state, a)).length;   // a secret medal counts once found
    return banner('achievements', { extra: `<span class="banner-count" title="Each medal also gives +${Math.round(ACHIEVEMENT_GLOBAL_BONUS * 100)}% attack, defence and skill speed: +${done}% so far"><b>${done}</b> / ${shown}</span>` });
}

// A bestiary star: filled once the kind has fallen 10, 100 or 1,000 times.
const ICON_STAR = '<svg class="star" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2l2.05 4.3 4.7.55-3.47 3.2.95 4.65L8 11.55 3.77 13.9l.95-4.65L1.25 6.05l4.7-.55z"/></svg>';
const starRow = n => `<span class="beast-stars" aria-label="${n} of ${KILL_STARS.length} stars">${KILL_STARS.map((_, i) => `<i class="${i < n ? 'on' : ''}">${ICON_STAR}</i>`).join('')}</span>`;

/**
 * The bestiary: every kind of monster met, by place, with how many have fallen and its stars. The
 * places reached are shown, and the next one as silhouettes; a kind not met yet is a silhouette.
 */
function renderBestiary(game) {
    const state = game.state;
    const best = Math.max(state.combat.bestStage || 1, state.stats.maxStage || 1);
    const kills = state.stats.killsByMonster || {};
    const zonesReached = BESTIARY.filter(g => g.kind === 'zone' && best > g.index * STAGES_PER_ZONE).length;
    const open = DUNGEONS.filter(d => dungeonUnlocked(state, d)).length;
    const shown = BESTIARY.filter(g => (g.kind === 'zone' ? g.index <= zonesReached : DUNGEONS.findIndex(d => d.id === g.id) <= open));
    // Met: one has fallen, or (for saves from before the counts) the hero has stood on its stage.
    const met = (g, m) => (kills[m.name] || 0) > 0 || (g.kind === 'zone'
        ? best >= g.index * STAGES_PER_ZONE + m.at
        : (state.dungeons[g.id]?.clears || 0) > 0);
    let metCount = 0;
    const groups = shown.map(g => {
        const reached = g.kind === 'zone' ? g.index < zonesReached : DUNGEONS.findIndex(d => d.id === g.id) < open;
        let stars = 0;
        const tiles = g.monsters.map(m => {
            const k = kills[m.name] || 0;
            const seen = reached && met(g, m);
            if (seen) metCount++;
            const s = starsFor(k);
            stars += s;
            const next = nextStarAt(k);
            const tip = seen ? `${m.name}: ${fmt(k)} defeated${next ? ` · the next star at ${fmt(next)}` : ' · every star earned'}` : 'Not met yet';
            return `<div class="beast${seen ? '' : ' unmet'}${m.boss ? ' boss' : ''}${s === KILL_STARS.length ? ' gold' : ''}" title="${esc(tip)}">
                <span class="beast-art">${sprite(`mon/${m.name}`, { scale: 2, cls: seen ? '' : 'silhouette', fallback: '👾' })}</span>
                <b class="beast-name">${seen ? esc(m.name) : '???'}</b>
                ${seen ? `${starRow(s)}<span class="beast-kills">${fmt(k)}${next ? `<i class="beast-next" style="--p:${Math.min(100, (k - (KILL_STARS[s - 1] || 0)) / (next - (KILL_STARS[s - 1] || 0)) * 100).toFixed(1)}%"></i>` : ''}</span>` : ''}
            </div>`;
        }).join('');
        const art = g.kind === 'zone' ? g.id : DUNGEON_ART[g.id] || 'dungeon';
        return `<section class="glass-panel bestiary-group${reached ? '' : ' unreached'} ${painted(art, 'center 60%')}">
            <div class="panel-header"><h2>${esc(g.name)}</h2>${reached ? `<span class="beast-sum">${ICON_STAR} ${stars} / ${g.monsters.length * KILL_STARS.length}</span>` : '<span class="muted small">Not reached yet</span>'}</div>
            <div class="beast-grid">${tiles}</div>
        </section>`;
    }).join('');
    const total = bestiaryStars(kills);
    return `<section class="glass-panel bestiary-summary ${painted('library', 'center 45%')}">
        <div class="beast-total"><b>${metCount}</b><span>of ${BESTIARY_SIZE} kinds met</span></div>
        <div class="beast-total"><b>${ICON_STAR} ${total}</b><span>of ${BESTIARY_MAX_STARS} stars: one for 10, 100 and 1,000 of a kind</span></div>
    </section>${groups}`;
}

/** The hero's records: what he has done in all his runs, as big numbers with a picture each. */
function renderRecords(game) {
    const state = game.state;
    const s = state.stats;
    const best = Math.max(s.maxStage || 1, state.combat.bestStage || 1);
    const zone = zoneForStage(best);
    const clears = Object.values(state.dungeons || {}).reduce((sum, d) => sum + (d.clears || 0), 0);
    const hours = (state.meta.playtimeMs || 0) / 3600000;
    const totalLevel = SKILL_IDS.reduce((sum, id) => sum + levelForXp(state.skills[id]?.xp || 0), 0);
    const capes = capesEarned(state);
    const records = [
        [`mon/${zone.boss}`, fmt(best), 'best stage'],
        ['perk/scholar', `${fmt(totalLevel)}/${fmt(SKILL_IDS.length * MAX_LEVEL)}`, 'total level'],
        [`hero/capes/${capeWorn(state)?.skill || capes[0]?.skill || 'combat'}`, `${capes.length}/${CAPES.length}`, 'skill capes'],
        ['item/Weapon/3', fmt(s.kills || 0), 'monsters defeated'],
        ['mon/Goblin Chieftain', fmt(s.bossKills || 0), 'bosses defeated'],
        ['gold', fmt(s.gildedKills || 0), 'gilded monsters'],
        ['res/gold_bar', fmt(s.goldEarned || 0), 'gold earned'],
        ['res/essence', fmt(state.prestige.count || 0), 'prestiges'],
        ['titan/0', fmt(state.titan?.kills || 0), 'Titans felled'],
        ['crate', fmt(clears), 'dungeons cleared'],
        ['item/Body/4', fmt(s.itemsCrafted || 0), 'pieces of gear made'],
        ['item/Head/5', `${fmt(Object.keys(state.codex || {}).length)}/${CODEX_SIZE}`, 'codex pages'],
        ['crate', fmt(state.daily?.claimed || 0), 'daily crates opened'],
        ['res/raw_trout', fmt(s.fishCaught || 0), 'fish caught'],
        ['res/pumpkin', fmt(s.cropsHarvested || 0), 'crops harvested'],
        ['res/diamond', fmt(s.masteryLevels || 0), 'mastery levels'],
        ['perk/endurance', hours >= 1 ? `${fmt(Math.floor(hours))} h` : `${Math.floor(hours * 60)} min`, 'played'],
        ['mon/Skeleton', fmt(s.deaths || 0), 'falls']
    ];
    return `<section class="glass-panel ${painted('library', 'center 50%')}">
        <div class="record-grid">${records.map(([art, value, label]) => `<div class="record">
            <span class="record-art">${sprite(art, { scale: 1.5 })}</span>
            <b class="record-value">${value}</b>
            <span class="record-label">${esc(label)}</span>
        </div>`).join('')}</div>
    </section>
    ${renderChronicle(state)}`;
}

/** What a chronicle entry (systems/chronicle.js) shows: [sprite key, line], or null for one no longer known. */
function chronicleLine(e) {
    switch (e.kind) {
        case 'start': return ['campfire', 'The adventure began'];
        case 'zone': { const z = ZONES.find(x => x.id === e.id); return z ? [`mon/${z.boss}`, `Reached ${z.name}`] : null; }
        case 'pet': { const p = PETS.find(x => x.id === e.id); return p ? [`pet/${p.id}`, `${p.name} joined the hero`] : null; }
        case 'unique': { const u = UNIQUES[e.id]; return u ? [`uniq/${e.id}`, `Won the ${u.name}`] : null; }
        case 'dungeon': { const d = dungeonById(e.id); return d ? [`mon/${d.boss.name}`, `First clear of the ${d.name}`] : null; }
        case 'titan': return ['titan/0', 'Felled the first Titan'];
        case 'prestige': return ['res/essence', 'The first prestige'];
        case 'rank': { const r = RANKS.find(x => x.name === e.id); return r ? [`hero/cloaks/${r.cloak}`, `Rose to ${r.name}`] : null; }
        case 'skill99': return SKILLS[e.id] ? [capeFor(e.id) ? `hero/capes/${e.id}` : FEATURES[e.id]?.icon || 'crown', `${SKILLS[e.id].name} 99, and its cape`] : null;
        default: return null;
    }
}

/** The hero's story, newest first: a date, a picture and a line for each first. */
function renderChronicle(state) {
    const year = new Date().getFullYear();
    const rows = [...(state.chronicle || [])].reverse().map(e => {
        const line = chronicleLine(e);
        if (!line) return '';
        const d = new Date(e.t);
        const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() === year ? {} : { year: 'numeric' }) });
        return `<li><time datetime="${d.toISOString()}">${esc(date)}</time><span class="ch-art">${sprite(line[0], { scale: 1 })}</span><span class="ch-text">${esc(line[1])}</span></li>`;
    }).join('');
    return rows ? `<section class="glass-panel ${painted('study', 'center 40%')}">
        <div class="panel-header"><h2>Chronicle</h2></div>
        <ol class="chronicle">${rows}</ol>
    </section>` : '';
}

export function renderAchievements(game) {
    const state = game.state;
    const medals = ACHIEVEMENTS.filter(a => medalShown(state, a)).map(a => {
        const won = !!state.achievements[a.id];
        const { have, need } = achievementProgress(state, a.req);
        const pct = Math.min(100, (have / Math.max(1, need)) * 100);
        return `<div class="medal${won ? ' won' : ''}" title="${esc(a.desc)}: ${esc(a.reward)}">
            <div class="medal-disc">${medalArt(a)}${medalLook(state, a, won)}</div>
            <div class="medal-name">${esc(a.name)}</div>
            <div class="medal-desc">${esc(a.desc)}</div>
            ${won ? `<div class="medal-reward">${esc(a.reward)}</div>`
                : `<div class="medal-bar"><i style="--p:${pct.toFixed(1)}%"></i></div><div class="medal-count">${fmt(Math.min(have, need))} / ${fmt(need)}</div>`}
        </div>`;
    }).join('');
    return `<section class="glass-panel ${painted('hall', 'center 40%')}">
        <div class="medal-grid">${medals}</div>
    </section>`;
}

// ---------- events ----------

export function renderEvents(game) {
    const state = game.state;
    const status = eventStatus(state, game.now);
    const ev = state.events;
    const e = status.event;
    const sameInstance = status.active && ev.instance === status.instance;
    const earned = sameInstance ? ev.instanceEarned : 0;
    const today = ev.day === new Date(game.now).toISOString().slice(0, 10) ? ev.earnedToday : 0;
    const token = scale => sprite('token', { scale, cls: scale < 1 ? 'soft' : '', fallback: '🎟️' });
    // The milestones as a reward track: three medals on a bar that fills with this event's tokens,
    // the next one lit with how far there is to go.
    const ms = EVENT_MILESTONES;
    const at = ms.findIndex(m => earned < m.tokens);   // the next milestone (-1: all reached)
    const last = at < 0 ? ms.length - 1 : at - 1;      // the last one reached (-1: none yet)
    const fill = last < 0 ? 0 : last >= ms.length - 1 ? 1 : (last + (earned - ms[last].tokens) / (ms[last + 1].tokens - ms[last].tokens)) / (ms.length - 1);
    const nodes = ms.map((m, i) => {
        const done = sameInstance && ev.milestones.includes(m.tokens);
        const next = i === at;
        const from = i ? ms[i - 1].tokens : 0;
        return `<div class="ms-node${done ? ' done' : next ? ' next' : ''}" role="listitem" title="${m.tokens} tokens this event: ${esc(m.desc)}">
            <span class="ms-medal">${Object.keys(m.reward).map(id => resIcon(id, { scale: 1 })).join('')}${done ? `<i class="ms-check">${ICON_CHECK}</i>` : ''}</span>
            <b class="ms-at">${token(0.5)} ${m.tokens}</b>
            <span class="ms-desc">${esc(m.desc)}</span>
            ${next && sameInstance ? `<span class="ms-left"><i style="width:${Math.round((earned - from) / (m.tokens - from) * 100)}%"></i></span>` : ''}
        </div>`;
    }).join('');
    const milestones = `<div class="ms-track" role="list" aria-label="Milestones: ${earned} tokens earned this event" style="--f:${fill.toFixed(3)}">${nodes}</div>`;
    const shop = EVENT_SHOP.map(item => {
        const [resId] = Object.keys(item.gives);
        return `<div class="shop-item">
            <div class="shop-art">${resIcon(resId, { scale: 1.5 })}</div>
            <div class="shop-item-info"><span class="shop-item-name">${esc(item.name)}</span><span class="shop-item-desc">${esc(item.desc)}</span></div>
            <button class="gold-btn token-btn" onclick="FI.buyEventItem('${item.id}')" ${status.active && ev.tokens >= item.cost ? '' : 'disabled'} aria-label="Buy ${esc(item.name)} for ${item.cost} tokens">${token(0.75)} ${item.cost}</button>
        </div>`;
    }).join('');
    const rotation = EVENTS.map(x => `<span class="${x.id === e.id ? 'b' : 'muted'}">${eventIcon(x)} ${esc(x.name)}</span>`).join(' → ');
    return `${banner('events', { title: `${eventIcon(e, 1)} ${esc(e.name)}`, sub: status.active ? `Running now: ends in ${duration(status.endsAt - game.now)}` : `The next event: starts in ${duration(status.startsAt - game.now)}`,
        extra: `<div class="chip festival" title="Festival tokens${status.active ? `: ${today} of ${EVENT_DAILY_CAP} earned today` : ''}">${token(0.75)}<span>Tokens</span><b>${fmt(ev.tokens)}</b></div>` })}
    <section class="glass-panel event-panel painted" style="--accent:${e.color};${paintStyle('festival', 'center 30%')}">
        <p>${esc(e.desc)}</p>
        <p class="muted small event-rotation">${rotation}</p>
    </section>
    <div class="two-col">
        <section class="glass-panel ${painted('festival', 'left 60%')}"><div class="panel-header"><h2>Milestones</h2><span class="muted small">${token(0.5)} ${earned} earned this event</span></div>${milestones}</section>
        <section class="glass-panel ${painted('festival', 'right 60%')}"><div class="panel-header"><h2>Event shop</h2><span class="muted small">${status.active ? 'Open' : 'Opens with the next event'}</span></div><div class="shop-list">${shop}</div></section>
    </div>`;
}

// ---------- farming ----------

// The farm: a bag of seeds as tiles (the crops this level can plant, and the next as a silhouette) and
// the plots. Pick a seed, then tap an empty plot to plant it, or a ready one to harvest it.
export function renderFarming(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'farming');
    const ready = state.farming.plots.filter(p => plotReady(p, game.now)).length;
    const choices = CROPS.filter(c => c.levelReq <= level);
    const picked = cropById(ui.lastCrop);
    const seed = picked && picked.levelReq <= level ? picked : choices[choices.length - 1] || null;
    const price = seed ? seedCost(state, seed) : 0;
    const affordable = seed && state.gold >= price;
    const empty = state.farming.plots.filter((p, i) => !p.crop && plotUnlocked(state, i)).length;
    const coin = sprite('gold', { scale: 0.5, cls: 'soft', fallback: '🪙' });
    const seeds = withNext(CROPS, c => c.levelReq, level).map(c => {
        if (c.levelReq > level) {
            return `<div class="pick seed locked" title="${esc(c.name)} opens at Farming ${c.levelReq}" aria-label="${esc(c.name)} opens at Farming ${c.levelReq}">${resIcon(c.produces, { scale: 1.25, cls: 'silhouette' })}<span class="pick-sub">Lv ${c.levelReq}</span></div>`;
        }
        const tip = `${c.name}: grows in ${duration(growTime(d, c))}, ${Math.round(c.yield[0] * d.farmYield)}–${Math.round(c.yield[1] * d.farmYield)} a harvest, seeds ${fmt(seedCost(state, c))} gold`;
        return `<button class="pick seed${c === seed ? ' on' : ''}" onclick="FI.pickSeed('${c.id}')" title="${esc(tip)}" aria-label="${esc(tip)}" aria-pressed="${c === seed}">${resIcon(c.produces, { scale: 1.25 })}<span class="pick-sub">${fmt(seedCost(state, c))}</span></button>`;
    }).join('');
    const plots = state.farming.plots.map((plot, i) => {
        if (!plotUnlocked(state, i)) {
            if (i > 0 && !plotUnlocked(state, i - 1)) return ''; // only the next plot to earn
            return `<div class="plot-card locked"><div class="plot-art">${sprite('farm/soil', { scale: 1.5, cls: 'silhouette', fallback: '🟫' })}</div><div class="node-name">Plot ${i + 1}</div><div class="req">Level ${FARMING_PLOTS[i]}</div></div>`;
        }
        if (!plot.crop) {
            if (!seed) return `<div class="plot-card empty"><div class="plot-art">${sprite('farm/soil', { scale: 1.5, fallback: '🟫' })}</div><div class="node-name">Plot ${i + 1}</div></div>`;
            return `<button class="plot-card empty" onclick="FI.plant(${i}, '${seed.id}')" ${affordable ? '' : 'disabled'} title="${affordable ? `Plant ${esc(seed.name)} here` : `${esc(seed.name)} seeds cost ${fmt(price)} gold`}">
                <span class="plot-art">${sprite('farm/soil', { scale: 1.5, fallback: '🟫' })}</span>
                <span class="node-name">Plot ${i + 1}</span>
                <span class="plot-do">Plant ${resIcon(seed.produces)} <span class="camp-price${affordable ? '' : ' missing'}">${coin} ${fmt(price)}</span></span>
            </button>`;
        }
        const crop = cropById(plot.crop);
        const pic = picBand(cardPic(crop.produces));   // the crop's own picture once it is in the ground
        const total = Math.max(1, plot.readyAt - plot.plantedAt);
        const done = plotReady(plot, game.now);
        const pctDone = done ? 100 : Math.min(100, (game.now - plot.plantedAt) / total * 100);
        if (done) {
            return `<button class="plot-card ready${pic ? ' has-pic' : ''}" onclick="FI.harvest(${i})" title="Harvest the ${esc(crop.name.toLowerCase())}">
                ${pic}<span class="plot-art">${resIcon(crop.produces, { scale: 1.5 })}</span>
                <span class="node-name">${esc(crop.name)}</span>
                <span class="plot-do">Harvest</span>
            </button>`;
        }
        return `<div class="plot-card growing${pic ? ' has-pic' : ''}">${pic}<div class="plot-art">${sprite(pctDone < 50 ? 'farm/sprout' : 'farm/growing', { scale: 1.5, fallback: '🌱' })}</div>
            <div class="node-name">${esc(crop.name)}</div>
            <div class="muted small">${duration(plot.readyAt - game.now)}</div>
            <div class="action-progress-container"><div class="action-progress-fill" style="width:${pctDone}%; background:${SKILLS.farming.color}"></div></div></div>`;
    }).join('');
    const rows = CROPS.map(c => {
        const unlocked = level >= c.levelReq;
        const avg = (c.yield[0] + c.yield[1]) / 2 * d.farmYield;
        return `<tr class="${unlocked ? '' : 'locked-row'}"><td>${resIcon(c.produces)} ${esc(c.name)}</td><td>${c.levelReq}</td><td>${duration(growTime(d, c))}</td>
            <td>${Math.round(c.yield[0] * d.farmYield)}–${Math.round(c.yield[1] * d.farmYield)}× ${esc(res(c.produces).name)}</td><td>${fmt(Math.round(c.xp * avg * d.xpMult))}</td><td>${fmt(seedCost(state, c))}</td></tr>`;
    }).join('');
    const quick = [
        ready ? `<button class="prestige-btn" onclick="FI.harvestAll()">Harvest ${ready} and replant</button>` : '',
        empty > 1 && seed ? `<button class="prestige-btn" onclick="FI.plantAll('${seed.id}')" ${affordable ? '' : 'disabled'}>Plant ${empty} plots</button>` : ''
    ].join('');
    return `<section class="glass-panel skill-panel ${skillPainted('farming')}">
        ${xpHeader(game, 'farming', toolBadge(game, 'farming'))}
        <div class="seed-bag">
            <div class="loadout-label">Seeds</div>
            <div class="pick-row">${seeds}</div>
        </div>
        ${quick ? `<div class="btn-row">${quick}</div>` : ''}
        <div class="plot-grid">${plots}</div>
        <details class="drawer" ${ui.open?.crops ? 'open' : ''} ontoggle="FI.setOpen('crops', this.open)">
            <summary>All crops</summary>
            <div class="table-wrap"><table class="data-table">
                <thead><tr><th>Crop</th><th>Level</th><th>Grows in</th><th>Harvest</th><th>XP / harvest</th><th>Seeds (gold)</th></tr></thead>
                <tbody>${rows}</tbody></table></div>
        </details>
    </section>`;
}

// ---------- agility ----------

// The course: one card per obstacle slot. A built obstacle shows its picture, level and bonus, with
// Upgrade; an open slot shows its price and the three obstacles to pick from, as tiles; the next slot
// to earn is a padlock. Swapping a built obstacle (no refund) is behind a small ↺ on its card.
export function renderAgility(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'agility');
    const course = courseDef(state);
    const running = state.action?.kind === 'agility';
    const interval = course ? actionInterval(course.interval, d, 'agility') : 0;
    const coin = sprite('gold', { scale: 0.5, cls: 'soft', fallback: '🪙' });
    const medal = (art, lvl = 0) => `<span class="camp-medal obstacle-medal">${art}${lvl ? `<b class="camp-lv">${lvl}</b>` : ''}</span>`;
    const art = o => sprite(`obstacle/${o.id}`, { scale: 1, fallback: o.icon });
    const slots = AGILITY_SLOTS.map((slot, i) => {
        const open = level >= slot.levelReq;
        if (!open) {
            if (i > 0 && level < AGILITY_SLOTS[i - 1].levelReq) return ''; // only the next slot to earn
            return `<div class="course-slot locked">${medal(glyph('lock', { scale: 1 }))}<span class="req">Agility ${slot.levelReq}</span></div>`;
        }
        const built = state.agility.built[i] ? obstacleById(state.agility.built[i]) : null;
        if (built && ui.agilitySwap !== i) {
            const lvl = obstacleLevel(state, i);
            const up = upgradeInfo(state, i);
            const upgrade = !up ? '<span class="perk-max">Max</span>'
                : level >= up.levelReq
                    ? `<button class="gold-btn obstacle-up" onclick="FI.upgradeObstacle(${i})" ${state.gold >= up.gold ? '' : 'disabled'} title="Level ${up.toLevel}: the bonus once more">⬆ ${coin} ${fmt(up.gold)}</button>`
                    : `<span class="req" title="Level ${up.toLevel} needs Agility ${up.levelReq}">${glyph('up')} at Agility ${up.levelReq}</span>`;
            return `<div class="course-slot built">
                <button class="slot-swap" onclick="FI.agilitySwap(${i})" title="Swap for another obstacle (no refund)" aria-label="Swap the ${esc(built.name)} for another obstacle">↺</button>
                ${medal(art(built), lvl)}
                <b class="slot-name">${esc(built.name)}</b>
                <span class="slot-bonus">${esc(built.desc)}${lvl > 1 ? ` ×${lvl}` : ''}</span>
                ${upgrade}
            </div>`;
        }
        const cost = obstacleCost(state, i);
        const affordable = state.gold >= cost.gold && Object.entries(cost.materials).every(([id, q]) => (state.resources[id] || 0) >= q);
        const others = slot.obstacles.filter(o => o.id !== built?.id);
        const picks = others.map(o =>
            `<button class="obstacle-pick" onclick="FI.buildObstacle('${o.id}')" ${affordable ? '' : 'disabled'} title="${esc(o.name)}: ${esc(o.desc)} · ${seconds(o.interval)} and ${o.xp} XP a run" aria-label="Build the ${esc(o.name)}: ${esc(o.desc)}">${medal(art(o))}<span class="slot-bonus">${esc(o.desc)}</span></button>`).join('');
        return `<div class="course-slot open">
            <div class="slot-price"><span class="camp-price${state.gold >= cost.gold ? '' : ' missing'}">${coin} ${fmt(cost.gold)}</span>${needChips(state, cost.materials)}</div>
            <div class="obstacle-picks" style="--n:${others.length}">${picks}</div>
            ${built ? `<button class="mini-btn" onclick="FI.agilitySwap(null)">Keep the ${esc(built.name)}</button>` : ''}
        </div>`;
    }).join('');
    return `<section class="glass-panel skill-panel ${skillPainted('agility')}">
        ${xpHeader(game, 'agility')}
        ${course ? `<div class="course-run ${running ? 'active' : ''}">
            <div><b>Run the course</b><div class="muted small">${seconds(interval)} a run · ${fmt(Math.round(course.xp * d.xpMult))} XP</div></div>
            <button class="prestige-btn" onclick="FI.runCourse()">${running ? 'Stop' : 'Run'}</button>
            ${running ? `<div class="action-progress-container"><div class="action-progress-fill" id="progress-agility-course" style="width:${Math.min(100, state.action.progress / interval * 100)}%; background:${SKILLS.agility.color}"></div></div>` : ''}
        </div>` : ''}
        <div class="course-grid">${slots}</div>
    </section>`;
}

// ---------- dungeons & titan ----------

/** Colour a fight estimate: green if you win comfortably, amber if it's close, red if not. */
function readinessClass(killSeconds, limitSeconds, surviveSeconds) {
    const need = Math.min(limitSeconds, surviveSeconds);
    if (killSeconds <= need * 0.7) return 'ready-good';
    if (killSeconds <= need) return 'ready-close';
    return 'ready-bad';
}

function fmtSeconds(value) {
    if (!Number.isFinite(value) || value > 3600) return 'forever';
    return value < 10 ? `${value.toFixed(1)} s` : `${Math.round(value)} s`;
}

/** Who waits in dungeon `d`, room by room: little portraits (a silhouette for an elite never met), the boss last. */
function dungeonLineup(state, d) {
    const kills = state.stats.killsByMonster || {};
    const face = (name, boss) => {
        const met = boss || (kills[name] || 0) > 0;   // the boss is already on the card's painting
        return `<span class="lineup-face${boss ? ' boss' : ''}" title="${met ? esc(name) : 'Not met yet'}">${sprite(`mon/${name}`, { scale: 0.75, cls: `soft${met ? '' : ' silhouette'}` })}</span>`;
    };
    return `<div class="lineup" aria-label="${d.monsters.length} elites, then the ${esc(d.boss.name)}">${d.monsters.map(m => face(m.name, false)).join('')}${face(d.boss.name, true)}</div>`;
}

/** How a run at dungeon `d` would end at its boss, in words and a colour (an estimate without food). */
export function dungeonVerdict(game, d) {
    const limit = DUNGEON_BOSS_TIME_MS / 1000;
    const fight = dungeonPreview(game.derived, d).bossFight;
    const cls = readinessClass(fight.killSeconds, limit, fight.surviveSeconds);
    const text = cls === 'ready-good' ? (fight.killSeconds < 1 ? 'You are ready: the boss falls in under a second' : `You are ready: the boss falls in ~${fmtSeconds(fight.killSeconds)}`)
        : cls === 'ready-close' ? `It will be close: the boss takes ~${fmtSeconds(fight.killSeconds)} of your ${limit} s`
        : fight.surviveSeconds < limit ? `Too strong for now: you would last ~${fmtSeconds(fight.surviveSeconds)}`
        : `Too tough for now: the boss needs ~${fmtSeconds(fight.killSeconds)}, and you have ${limit} s`;
    return { cls, text };
}

export function renderDungeons(game) {
    const state = game.state;
    const c = state.combat;
    const tl = titanLevel(state);
    const titanFight = fightPreview(game.derived, titanEnemy(state));
    const titanPct = Math.min(1, (TITAN_TIME_MS / 1000) / titanFight.killSeconds);
    const titanCard = !titanUnlocked(state)
        ? `<p class="muted small">Reach stage ${TITAN_UNLOCK_STAGE} to wake the first Titan.</p>`
        : `<div class="titan-row">
            <span class="dungeon-icon titan-face">${sprite(monsterSpriteKey(titanEnemy(state)), { scale: 2, fallback: '🗿' })}</span>
            <div class="titan-text"><b>${esc(titanEnemy(state).name)}</b> · level ${tl}${state.titan.kills ? ` · ${state.titan.kills} defeated: +${Math.round(TITAN_BONUS.atkMult * 100 * state.titan.kills)}% attack and health` : ''}${state.titan.bestPct ? ` · best try ${Math.round(state.titan.bestPct * 100)}%` : ''}
                <div class="small ${readinessClass(titanFight.killSeconds, TITAN_TIME_MS / 1000, titanFight.surviveSeconds)}">You would deal about ${Math.round(titanPct * 100)}% of its health in ${TITAN_TIME_MS / 1000} s${titanFight.surviveSeconds < TITAN_TIME_MS / 1000 ? `, and last about ${Math.round(titanFight.surviveSeconds)} s without food` : ''}.</div></div>
            ${c.mode === 'titan' ? '<span class="status-pill fighting">Fighting now</span>'
                : titanReady(state, game.now) ? `<button class="prestige-btn" onclick="FI.challengeTitan()">${sprite('titan/0', { scale: 0.625, cls: 'soft res-spr' })} Challenge (${TITAN_TIME_MS / 1000} s)</button>`
                : `<button class="mini-btn" disabled>Rests for ${duration(state.titan.readyAt - game.now)}</button>`}
        </div>`;
    const nextDungeon = DUNGEONS.find(d => !dungeonUnlocked(state, d));
    const cards = DUNGEONS.filter(d => dungeonUnlocked(state, d) || d === nextDungeon).map(d => {
        const record = state.dungeons[d.id];
        const open = dungeonUnlocked(state, d);
        const here = c.mode === 'dungeon' && c.dungeon?.id === d.id;
        const next = DUNGEON_MILESTONES.find(m => record.clears < m.clears);
        const done = DUNGEON_MILESTONES.filter(m => record.clears >= m.clears).map(m => m.desc);
        const unique = UNIQUES[d.unique];
        const { cls: ready, text: verdict } = dungeonVerdict(game, d);
        return `<div class="dungeon-card ${open ? '' : 'locked'} ${here ? 'active' : ''}">
            <div class="dungeon-art" style="${paintStyle(DUNGEON_ART[d.id] || 'dungeon')}">
                <span class="dungeon-icon">${sprite(`mon/${d.boss.name}`, { scale: 2, cls: open ? '' : 'silhouette', fallback: d.icon })}</span>
                <div class="dungeon-title"><b>${esc(d.name)}</b><span class="small" title="Like stages ${d.stage}–${d.stage + d.monsters.length}; the chest holds tier ${d.chestTier} loot">${d.monsters.length} elites, then the ${esc(d.boss.name)}</span></div>
            </div>
            <div class="dungeon-body">
            ${open ? `${dungeonLineup(state, d)}<div class="small ${ready}" title="An estimate without food, regeneration, lifesteal or combo">${verdict}</div>
                <div class="frag-row" title="${record.fragments} of ${FRAGMENTS_PER_UNIQUE} fragments of ${esc(unique.name)}">${sprite(`uniq/${unique.id}`, { scale: 1, cls: ownsUnique(state, d.unique) ? '' : 'silhouette', fallback: '🌟' })}
                    <div class="frag-bar"><i style="--p:${Math.min(100, record.fragments / FRAGMENTS_PER_UNIQUE * 100).toFixed(1)}%"></i></div><span class="small">${record.fragments}/${FRAGMENTS_PER_UNIQUE}</span></div>
                <div class="muted small">${record.clears} clear${record.clears === 1 ? '' : 's'}${next ? ` · at ${next.clears}: ${next.desc}` : ' · every bonus earned'}${done.length ? ` · earned: ${done.join('; ')}` : ''}</div>
                <div class="btn-row">
                    ${here ? (choosingAfterClear(state) ? '<button class="prestige-btn" onclick="FI.openRunChoice()">Cleared: keep going?</button>' : '<button class="mini-btn danger" onclick="FI.toggleCombat()">Leave dungeon</button>') : `<button class="prestige-btn" onclick="FI.enterDungeon('${d.id}')">Enter</button>`}
                    ${record.fragments >= FRAGMENTS_PER_UNIQUE ? `<button class="mini-btn" onclick="FI.assembleUnique('${d.id}')" ${ownsUnique(state, d.unique) ? 'title="You already own one: a spare comes unlocked, to salvage for essence"' : ''}>${ownsUnique(state, d.unique) ? 'Assemble a spare' : `Assemble the ${esc(unique.name)}`}</button>` : ''}
                </div>`
                : `<div class="req">Opens at stage ${d.unlockStage}</div>`}
            </div>
        </div>`;
    }).join('');
    return `${banner('dungeons')}
    <section class="glass-panel ${painted('dungeon', 'center 50%')}">
        <div class="dungeon-grid">${cards}</div>
    </section>
    <section class="glass-panel titan-panel" style="${artStyle('titan')}">
        <div class="panel-header"><h2>The Titan ${aboutButton('titan')}</h2></div>
        ${titanCard}
    </section>`;
}

function renderCollection(game) {
    const state = game.state;
    const companion = companionPet(state);
    const pets = PETS.map(p => {
        const found = !!state.pets[p.id];
        const level = Math.max(1, skillLevel(state, p.skill));
        const hours = Math.round(PET_BASE / level / 3600);
        const hint = `~${fmt(hours)} h of ${p.skill} at level ${level} on average; the chance grows with your level (~${Math.round(PET_BASE / 99 / 3600)} h at 99)`;
        const body = `<span class="pet-icon">${sprite(`pet/${p.id}`, { scale: 1.5, cls: found ? '' : 'silhouette', fallback: found ? p.icon : '❔' })}</span><div><b>${found ? esc(p.name) : 'Unknown pet'}</b><div class="muted small">${esc(p.skill)} · ${found ? esc(p.desc) : `~${fmt(hours)} h at Lv ${level}`}</div></div>`;
        if (!found) return `<div class="pet-card" title="${esc(hint)}">${body}</div>`;
        // a found pet is a button: the one tapped follows the hero into the fight
        const at = companion === p.id;
        return `<button type="button" class="pet-card found${at ? ' companion' : ''}" onclick="FI.setCompanion('${p.id}')" aria-pressed="${at}" title="${at ? 'At your side in the fight' : 'Tap to take into the fight'}">${body}${at ? `<span class="pet-at">${glyph('heart')}</span>` : ''}</button>`;
    }).join('');
    // the uniques of the dungeons met, and the next dungeon's as an unnamed silhouette: a ladder shows its next rung only
    const nextDungeon = DUNGEONS.find(d => !dungeonUnlocked(state, d));
    const uniques = DUNGEONS.map(d => {
        const u = UNIQUES[d.unique];
        const owned = [...state.inventory, ...Object.values(state.equipped)].some(i => i && i.uniqueId === u.id);
        const known = owned || dungeonUnlocked(state, d);
        if (!known && d !== nextDungeon) return '';
        return `<div class="pet-card ${owned ? 'found' : ''}"><span class="pet-icon">${sprite(`uniq/${u.id}`, { scale: 1.5, cls: owned ? '' : 'silhouette', fallback: owned ? '🌟' : '❔' })}</span><div><b style="color:#f97316">${known ? esc(u.name) : 'Unknown unique'}</b><div class="muted small">${d.name} · ${known ? `${state.dungeons[d.id].fragments}/${FRAGMENTS_PER_UNIQUE} fragments${owned ? ' · owned' : ''}` : `opens at stage ${d.unlockStage}`}</div></div></div>`;
    }).join('');
    return `<section class="glass-panel ${painted('forest', 'center 45%')}">
        <div class="panel-header"><h2>Pets</h2><span class="muted small">${PETS.filter(p => state.pets[p.id]).length}/${PETS.length} · rare finds while training, kept forever</span></div>
        <div class="pet-grid">${pets}</div>
    </section>
    <section class="glass-panel ${painted('vault', 'center 40%')}">
        <div class="panel-header"><h2>Unique items</h2><span class="muted small">Assembled from dungeon fragments, or found in a chest</span></div>
        <div class="pet-grid">${uniques}</div>
    </section>
    ${renderCodex(state)}`;
}

/** The gear codex: every kind of gear at every tier, a silhouette until one has been found or made. */
function renderCodex(state) {
    const tiers = GEAR_TIERS;
    const rows = CODEX_TYPES.map(type => {
        const jewel = CRAFTING_TYPES.includes(type);
        const cells = tiers.map(t => {
            const found = !!state.codex[`${type}/${t.tier}`];
            const name = `${jewel ? t.jewel : t.name} ${TYPE_NAMES[type] || type}`;
            return `<span class="codex-cell${found ? ' found' : ''}" title="${found ? esc(name) : `Tier ${t.tier} · not found yet`}">${sprite(`item/${type}/${t.tier}`, { scale: 1, cls: found ? '' : 'silhouette', fallback: '?' })}</span>`;
        }).join('');
        return `<div class="codex-row"><span class="codex-type">${esc(TYPE_NAMES[type] || type)}</span>${cells}</div>`;
    }).join('');
    const found = Object.keys(state.codex).length;
    return `<section class="glass-panel ${painted('armory', 'center 45%')}">
        <div class="panel-header"><h2>Gear codex</h2><span class="muted small">${found}/${CODEX_SIZE} · every kind at every tier, found or made</span></div>
        <div class="codex-grid">${rows}</div>
    </section>`;
}

// ---------- settings / clan ----------

/**
 * The looks in Settings: a portrait of each the hero can wear, the worn one lit, and the next earned
 * look as a silhouette (its medal named on hover or a tap): a ladder shows its next rung only.
 */
/**
 * The cloaks in Settings, once a skill cape is earned: the rank's cloak and each cape earned, the worn
 * one lit, and the next cape (the skill nearest 99) as a silhouette.
 */
function capePicks(state) {
    const earned = capesEarned(state);
    if (!earned.length) return '';
    const worn = capeWorn(state)?.skill || '';
    const rank = rankFor(state.prestige?.count || 0);
    const pick = (skill, key, name, tip) => `<button class="cape-pick${worn === skill ? ' on' : ''}" onclick="FI.setHeroCape('${skill}')" aria-label="${esc(name)}" aria-pressed="${worn === skill}" title="${esc(tip)}">${sprite(key, { scale: 2 })}</button>`;
    const picks = [pick('', `hero/cloaks/${rank.cloak}`, `${rank.name}'s cloak`, `The ${rank.cloak} cloak of a ${rank.name}`)];
    for (const c of earned) picks.push(pick(c.skill, `hero/capes/${c.skill}`, `${SKILLS[c.skill].name} cape`, `${SKILLS[c.skill].name} cape: ${c.perk}`));
    const next = CAPES.filter(c => !capeEarned(state, c.skill)).sort((a, b) => state.skills[b.skill].xp - state.skills[a.skill].xp)[0];
    if (next) picks.push(`<span class="cape-pick locked" title="${esc(`${SKILLS[next.skill].name} cape, at level 99 in ${SKILLS[next.skill].name}: ${next.perk}`)}">${sprite(`hero/capes/${next.skill}`, { scale: 2, cls: 'silhouette' })}</span>`);
    return `<div class="cape-picks" role="group" aria-label="Your hero's cloak">${picks.join('')}</div>`;
}

function lookPicks(state) {
    const worn = state.hero?.look || LOOKS[0].id;
    // each look as itself, without the gear worn over it (a helmet would hide the hair that tells them apart)
    const dressed = (id, cls = '') => heroSprite({ ...state, equipped: {}, hero: { ...state.hero, look: id } }, { scale: 3, cls });
    const open = LOOKS.filter(l => lookOpen(state, l)).map((l, i) => {
        const on = worn === l.id;
        return `<button class="look-pick${on ? ' on' : ''}" onclick="FI.setHeroLook('${l.id}')" aria-label="${esc(l.name || `Look ${i + 1}`)}" aria-pressed="${on}">${dressed(l.id)}</button>`;
    });
    const next = LOOKS.find(l => !lookOpen(state, l) && !achievementById(l.medal)?.secret);   // a secret medal's look stays a surprise
    const medal = next && achievementById(next.medal);
    if (medal) open.push(`<span class="look-pick locked" title="${esc(`A look earned with the medal ${medal.name}: ${medal.desc}`)}">${dressed(next.id, 'silhouette')}</span>`);
    return open.join('');
}

export function renderSettings(game, ui, cloud) {
    const state = game.state;
    const played = duration(state.meta.playtimeMs);
    return `<div class="two-col">
        <section class="glass-panel ${painted('study', 'left 45%')}">
            <div class="panel-header"><h2>Cloud save</h2><span class="muted small">${cloud?.loggedIn ? `Signed in as ${esc(cloud.username || '')}` : 'Guest (local only)'}</span></div>
            <p class="muted small">${cloud?.loggedIn ? 'Your save is uploaded every minute and on important events. Another device loads whichever save has more play time.' : 'Sign in to keep your save in the cloud and play from any device. Your local save is kept either way.'}</p>
            ${cloud?.loggedIn ? `<div class="btn-row"><button class="mini-btn" onclick="FI.cloudSaveNow()">Save to cloud now</button><button class="mini-btn danger" onclick="FI.logout()">Log out</button></div>` : `<div class="btn-row"><button class="prestige-btn" onclick="FI.openAuth()">Log in / register</button></div>`}
            <div class="muted small" id="cloud-status">${esc(ui.cloudStatus || '')}</div>
        </section>
        <section class="glass-panel ${painted('study', 'right 45%')}">
            <div class="panel-header"><h2>Save file</h2><span class="muted small">Played ${played}</span></div>
            <div class="btn-row"><button class="mini-btn" onclick="FI.exportSave()">Copy export string</button><button class="mini-btn" onclick="FI.importSavePrompt()">Import string</button></div>
            <textarea id="save-io" class="save-io" placeholder="Paste a save string here, then press Import." rows="3" oninput="FI.setSaveIo(this.value)">${esc(ui.saveIo || '')}</textarea>
            <div class="btn-row"><button class="mini-btn danger" onclick="FI.hardReset()">Hard reset (wipe save)</button></div>
            ${renderBackups()}
        </section>
    </div>
    <section class="glass-panel ${painted('study', 'center 70%')}">
        <div class="panel-header"><h2>Options</h2></div>
        <label class="hero-name-field">Your hero's name <input id="hero-name" class="text-input" maxlength="${HERO_NAME_MAX}" placeholder="You" value="${esc(state.hero?.name || '')}" onchange="FI.setHeroName(this.value)" autocomplete="off" spellcheck="false"></label>
        <div class="look-picks" role="group" aria-label="Your hero's look">${lookPicks(state)}</div>
        ${capePicks(state)}
        <label class="toggle"><input type="checkbox" onchange="FI.setSetting('sound', this.checked)" ${state.settings.sound !== false ? 'checked' : ''}> Sound and vibration</label>
        ${state.settings.sound !== false ? `<label class="volume-row">${ICON_SOUND_ON}<input type="range" min="0" max="1" step="0.05" value="${Number(state.settings.volume ?? 1).toFixed(2)}" aria-label="Volume" oninput="FI.setVolume(this.value)" onchange="FI.setVolume(this.value, true)"></label>` : ''}
        <label class="toggle"><input type="checkbox" onchange="FI.setSetting('reducedMotion', this.checked)" ${state.settings.reducedMotion ? 'checked' : ''}> Reduce motion</label>
        ${state.settings.devUnlockAll ? `<label class="toggle"><input type="checkbox" onchange="FI.setSetting('devUnlockAll', this.checked)" checked> Developer mode: unlock every tab and mini-game</label>` : ''}
        <p class="muted small">Save version ${state.version}</p>
    </section>`;
}

function renderBackups() {
    const backups = listBackups();
    if (!backups.length) return '<p class="muted small">Backups appear here every 10 minutes, on load and before each prestige.</p>';
    return `<h3 class="section-title">Backups</h3><div class="backup-list">${backups.map(b => `<div class="backup-row">
        <div><b>${esc(b.label || b.slot)}</b><div class="muted small">${new Date(b.at).toLocaleString()} · best stage ${b.summary?.bestStage ?? '?'} · ${duration(b.summary?.playtimeMs || 0)} played</div></div>
        <button class="mini-btn" onclick="FI.restoreBackup('${b.slot}')">Restore</button>
    </div>`).join('')}</div>`;
}

export function renderClan(game, ui, cloud) {
    const social = ui.social || {};
    const form = social.form || { name: '', tag: '', description: '', lookingFor: '', search: '' };
    if (!cloud?.loggedIn) {
        // before signing in: what a clan is, in three pictures (the rules are behind the "?")
        const tile = (art, name, line) => `<div class="clan-tile"><span class="clan-tile-art">${art}</span><b>${name}</b><span class="muted small">${line}</span></div>`;
        return `${banner('clan', { extra: `<button class="prestige-btn" onclick="FI.openAuth()">Sign in to join a clan</button>` })}
        <section class="glass-panel ${painted('clanhall', 'center 40%')}">
            <div class="clan-tiles">
                ${tile(sprite('mon/Elder Dragon', { scale: 3, fallback: '🐉' }), 'A boss each week', 'fought by the whole clan')}
                ${tile(heroSprite(game.state, { scale: 3 }), 'Three attacks a day', 'by your saved hero')}
                ${tile(`${resIcon('essence', { scale: 2 })}${resIcon('diamond', { scale: 2 })}`, 'Rewards for all', 'more for the top three')}
            </div>
        </section>`;
    }
    if (cloud.available === false) {
        return `${banner('clan')}<section class="glass-panel ${painted('clanhall')}"><p class="warn">The clan server isn't reachable from here — clans need the game's API (the Vercel deployment).</p></section>`;
    }
    const status = social.error ? `<p class="warn small">${esc(social.error)}</p>` : social.loading && !social.loaded ? '<p class="muted small">Loading…</p>' : '';
    const rewards = (social.rewards || []).length
        ? `<div class="info-strip lit">${sprite('crate', { scale: 0.5, cls: 'soft res-spr' })} ${social.rewards.length} clan reward${social.rewards.length > 1 ? 's' : ''} waiting: ${social.rewards.map(r => esc(r.text || r.kind)).join(' · ')}
            <div class="btn-row"><button class="prestige-btn" onclick="FI.claimRewards()">Claim</button></div></div>`
        : '';
    const discord = DISCORD_INVITE ? `<a class="mini-btn" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener">Clan chat on Discord</a>` : '';
    let body = '';
    if (!social.clan) {
        const rows = (social.clans || []).map(c => `<tr><td class="wrap"><b>${esc(c.name)}</b> <span class="muted">[${esc(c.tag)}]</span><div class="muted small">${esc(c.description || '')}${c.lookingFor ? ` · looking for: ${esc(c.lookingFor)}` : ''}</div></td>
            <td>${Number(c.members)}/${Number(social.maxMembers || 20)}</td><td><button class="mini-btn" onclick="FI.joinClan(${Number(c.id)})" ${c.members >= (social.maxMembers || 20) ? 'disabled' : ''}>Join</button></td></tr>`).join('');
        body = `<div class="two-col">
            <section class="glass-panel ${painted('clanhall', 'left 50%')}"><div class="panel-header"><h2>Find a clan</h2></div>
                <div class="btn-row"><input id="clan-search" class="text-input" placeholder="Name or tag" value="${esc(form.search)}" oninput="FI.clanForm('search', this.value)" onkeydown="if (event.key === 'Enter') FI.searchClans()" aria-label="Search clans">
                <button class="mini-btn" onclick="FI.searchClans()">Search</button></div>
                ${rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Clan</th><th>Members</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted small">No clans found — start one.</p>'}
            </section>
            <section class="glass-panel ${painted('clanhall', 'right 50%')}"><div class="panel-header"><h2>Start a clan</h2></div>
                <label class="small">Name <input id="clan-name" class="text-input" maxlength="32" placeholder="Iron Wolves" value="${esc(form.name)}" oninput="FI.clanForm('name', this.value)"></label>
                <label class="small">Tag <input id="clan-tag" class="text-input" maxlength="5" placeholder="IWF" value="${esc(form.tag)}" oninput="FI.clanForm('tag', this.value)"></label>
                <label class="small">Description <input id="clan-desc" class="text-input" maxlength="200" placeholder="Casual, EU evenings" value="${esc(form.description)}" oninput="FI.clanForm('description', this.value)"></label>
                <label class="small">Looking for <input id="clan-looking" class="text-input" maxlength="100" placeholder="Anyone past stage 50" value="${esc(form.lookingFor)}" oninput="FI.clanForm('lookingFor', this.value)"></label>
                <div class="btn-row"><button class="prestige-btn" onclick="FI.createClan()">Create clan</button></div>
            </section>
        </div>`;
    } else {
        const c = social.clan;
        const boss = social.boss;
        const pct = boss ? Math.max(0, boss.hp / Math.max(1, boss.maxHp) * 100) : 0;
        const board = (social.board || []).map((r, i) => `<tr class="${r.you ? 'you-row' : ''}"><td>${i + 1}</td><td>${esc(r.username)}</td><td>${fmt(Number(r.damage) || 0)}</td><td>${Number(r.attacks) || 0}</td></tr>`).join('');
        const canKick = !!c.isOwner;
        const members = (social.members || []).map(m => `<tr class="${m.you ? 'you-row' : ''}"><td>${m.owner ? `${sprite('crown', { scale: 0.5, cls: 'soft res-spr', title: 'Leader' })} ` : ''}${esc(m.username)}${canKick && !m.you ? ` <button class="mini-btn danger" data-username="${esc(m.username)}" onclick="FI.kickMember(this.dataset.username)" aria-label="Remove ${esc(m.username)} from the clan">Remove</button>` : ''}</td><td>${fmt(Number(m.bestStage) || 0)}</td><td>${fmt(Number(m.totalLevel) || 0)}</td><td>${fmt(Number(m.attackDamage) || 0)}</td></tr>`).join('');
        body = `<section class="glass-panel ${painted('clanhall', 'center 40%')}">
            <div class="panel-header"><div><h2>${DEF_ICON} ${esc(c.name)} <span class="muted">[${esc(c.tag)}]</span></h2><div class="muted small">${esc(c.description || '')}${c.lookingFor ? ` · looking for: ${esc(c.lookingFor)}` : ''}</div></div>
                <div class="btn-row">${discord}<button class="mini-btn danger" onclick="FI.leaveClan()">Leave clan</button></div></div>
            ${boss ? `<div class="clan-boss">
                <div><b>${sprite('mon/Elder Dragon', { scale: 0.75, cls: 'soft res-spr', fallback: '🐉' })} This week's boss</b> <span class="muted small">(${esc(boss.week)} · ${boss.killed ? `defeated${boss.lastHit ? ` — last hit by ${esc(boss.lastHit)}` : ''}` : `ends in ${duration(boss.endsInMs)}`})</span></div>
                <div class="combat-bar"><div class="combat-fill enemy-fill" style="width:${pct}%"></div></div>
                <div class="small">${fmt(boss.hp)} / ${fmt(boss.maxHp)} HP</div>
                <div class="btn-row"><button class="prestige-btn" onclick="FI.clanAttack()" ${social.attacksLeft > 0 && !boss.killed && !social.attacking ? '' : 'disabled'}>${ATK_ICON} Attack (${social.attacksLeft}/${social.attacksPerDay} left today)</button>
                    <span class="muted small">Your hero hits for about ${fmt((social.members || []).find(m => m.you)?.attackDamage || 0)} per attack.</span></div>
            </div>` : ''}
            <div class="two-col">
                <div><h3 class="section-title">This week's damage</h3>${board ? `<div class="table-wrap"><table class="data-table clan-board"><thead><tr><th>#</th><th>Member</th><th>Damage</th><th>Attacks</th></tr></thead><tbody>${board}</tbody></table></div>` : '<p class="muted small">No attacks yet this week.</p>'}</div>
                <div><h3 class="section-title">Members (${(social.members || []).length}/${social.maxMembers || 20})</h3><div class="table-wrap"><table class="data-table clan-members"><thead><tr><th>Member</th><th>Best stage</th><th>Total level</th><th>Per attack</th></tr></thead><tbody>${members}</tbody></table></div></div>
            </div>
        </section>`;
    }
    return `${banner('clan', { extra: `<button class="mini-btn" onclick="FI.refreshSocial()">↻ Refresh</button>` })}
        ${status || rewards ? `<section class="glass-panel ${painted('clanhall', 'center 70%')}">${status}${rewards}</section>` : ''}
        ${body}
        ${renderLeaderboard(social)}`;
}

const BOARD_METRICS = { bestStage: 'Best stage', totalLevel: 'Total level', titanKills: 'Titans', dungeonClears: 'Dungeon clears' };

function renderLeaderboard(social) {
    const board = social.leaderboard;
    const consent = social.optIn
        ? `<p class="small">You are listed by your username with numbers the server works out from your cloud save. <button class="mini-btn" onclick="FI.setLeaderboardConsent(false)">Leave the leaderboards</button></p>`
        : `<p class="small">Leaderboards are opt-in. Joining lists your <b>username</b> with your best stage, total level, Titans and dungeon clears — worked out on the server from your cloud save, never from numbers the game sends. You can leave at any time. <button class="prestige-btn" onclick="FI.setLeaderboardConsent(true)">Join the leaderboards</button></p>`;
    const rows = board ? board.entries.map(e => `<tr class="${e.you ? 'you-row' : ''}"><td>${e.rank}</td><td>${esc(e.username)}</td><td>${fmt(e.value)}</td></tr>`).join('') : '';
    return `<section class="glass-panel ${painted('hall', 'center 60%')}">
        <div class="panel-header"><h2>Leaderboards</h2>
            <div class="btn-row">${Object.entries(BOARD_METRICS).map(([id, label]) => `<button class="mini-btn ${social.metric === id ? 'active' : ''}" onclick="FI.boardMetric('${id}')">${label}</button>`).join('')}
            <button class="mini-btn ${social.period === 'week' ? 'active' : ''}" onclick="FI.boardPeriod('${social.period === 'week' ? 'all' : 'week'}')">${social.period === 'week' ? 'This week' : 'All time'}</button></div></div>
        ${consent}
        ${board ? (rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Player</th><th>${esc(board.label)}${board.period === 'week' ? ' (this week)' : ''}</th></tr></thead><tbody>${rows}</tbody></table></div>${board.me && board.me.rank > 50 ? `<p class="small">You: #${board.me.rank} (${fmt(board.me.value)})</p>` : ''}` : '<p class="muted small">Nobody on this board yet.</p>') : ''}
    </section>`;
}

export function renderPrestigeModal(game) {
    const p = game.prestigePreview();
    const state = game.state;
    const count = state.prestige.count;
    const rank = rankFor(count + 1);
    const newRank = rank !== rankFor(count);
    const campLevels = Object.values(state.camp).reduce((a, b) => a + b, 0);
    // What stays, as pictures of the things this player has met (each with its name on hover).
    const has = id => isUnlocked(state, id);
    const owned = [...state.inventory, ...Object.values(state.equipped)].filter(Boolean);
    const keep = [
        [tabIcon('mining', 1), 'Every skill and level'],
        owned.length ? [sprite(itemSpriteKey(owned[0]) || 'item/Body/1', { scale: 1 }), 'All your gear, its upgrades and your tools'] : null,
        [resIcon('iron_bar', { scale: 1 }), 'Materials, essence, food and potions'],
        has('achievements') ? [sprite('crown', { scale: 1 }), 'Medals'] : null,
        [sprite('perk/knight', { scale: 1 }), 'Perks and tokens'],
        Object.keys(state.pets || {}).some(id => state.pets[id]) ? [sprite('pet/fang', { scale: 1 }), 'Pets'] : null,
        owned.some(i => i.uniqueId) ? [sprite('uniq/goblin_crown', { scale: 1 }), 'Uniques'] : null,
        has('dungeons') ? [sprite('crate', { scale: 1 }), 'Dungeon clears and fragments'] : null,
        titanUnlocked(state) ? [sprite('titan/0', { scale: 1 }), 'Titans defeated'] : null,
        has('agility') ? [sprite('obstacle/rope_swing', { scale: 1 }), 'The agility course'] : null,
        has('farming') ? [sprite('farm/growing', { scale: 1 }), 'The farm'] : null
    ].filter(Boolean).map(([art, name]) => `<span class="pg-keep-item" title="${esc(name)}" aria-label="${esc(name)}">${art}</span>`).join('');
    const nextSp = Math.ceil(BALANCE.prestige.fullRunFraction * state.combat.bestStage);
    return `<div class="modal-content about-card prestige-modal">
        <div class="about-art" style="${artStyle('prestige')}" aria-hidden="true"></div>
        <div class="modal-header">Prestige</div>
        <div class="modal-body">
            <div class="pg-gain">
                <div class="pg-get"><i class="coin-dot tokens" aria-hidden="true"></i><b>+${fmt(p.tokens)} <span>tokens</span></b><small>${fmt(p.tokensAfter)} in all: +${fmt(Math.round(p.tokensAfter * BASE.tokenAtk * game.derived.records.mult * 100))}% attack and defence${game.derived.records.count ? ` (records ×${game.derived.records.mult.toFixed(2)})` : ''}</small></div>
                ${p.skillPoints > 0 ? `<div class="pg-get sp"><i class="coin-dot sp" aria-hidden="true"></i><b>+${p.skillPoints} <span>skill point${p.skillPoints === 1 ? '' : 's'}</span></b><small>for perks that last forever</small></div>` : ''}
                ${newRank ? `<div class="pg-rank">${heroSprite({ ...state, prestige: { ...state.prestige, count: count + 1 }, hero: { ...state.hero, cape: '' } }, { scale: 2 })}<span><small>A new rank</small><b>${esc(rank.name)}</b><small>and a ${esc(rank.cloak)} cloak</small></span></div>` : ''}
                ${p.fullRun ? '' : `<div class="pg-note muted small">A skill point comes with a run that reaches stage ${nextSp}</div>`}
            </div>
            <div class="pg-row"><h4>Starts over</h4>
                <span class="pg-item"><span class="pg-pip">${p.startStage}</span> back to stage ${p.startStage}</span>
                <span class="pg-item">${coinIcon(1)} ${fmt(state.gold)} gold</span>
                ${campLevels ? `<span class="pg-item">${sprite('campfire', { scale: 1 })} the camp (${campLevels} level${campLevels === 1 ? '' : 's'})</span>` : ''}
            </div>
            <div class="pg-row"><h4>Everything else stays</h4><span class="pg-keep">${keep}</span></div>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.closeModal()">Cancel</button><button class="modal-btn btn-confirm" onclick="FI.confirmPrestige()">Prestige now</button></div>
    </div>`;
}

/** An in-page yes/no; confirm() is blocked when the game runs inside another page. */
export function renderConfirmModal(title, text, confirmLabel) {
    return `<div class="modal-content ${painted('study', 'center 40%')}">
        <div class="modal-header">${esc(title)}</div>
        <div class="modal-body"><p>${esc(text)}</p></div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.closeModal()">Cancel</button><button class="modal-btn btn-confirm" onclick="FI.confirmYes()">${esc(confirmLabel)}</button></div>
    </div>`;
}

/**
 * Welcome back: what the hero did while you were away, as a haul to look at rather than a list:
 * each skill's XP with its bar (a level-up stands out), the materials as tiles popping in one by
 * one, gold, finds (pets, uniques, items, dungeon clears) and what was used up.
 */
export function renderWelcomeBack(summary, game) {
    const state = game.state;
    const mins = Math.floor(summary.simulated / 60000);
    const away = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    const story = summary.mode === 'rest' ? 'Your hero rested at camp the whole time: nothing was under way when you left.'
        : summary.mode === 'skill' ? (summary.stalledReason ? `Work stopped early: ${esc(summary.stalledReason)}.` : 'Your hero kept working the whole time.')
        : `${fmt(summary.kills)} monsters defeated${summary.stages > 0 ? `, ${fmt(summary.stages)} stage${summary.stages === 1 ? '' : 's'} gained` : ''}${summary.deaths ? `; ${summary.startedInDungeon ? 'a dungeon run failed, ' : ''}${summary.deaths === 1 ? 'one fall' : `${fmt(summary.deaths)} falls`}, and up again each time` : ''}.`;
    let i = 0;
    const next = () => i++;
    const skills = Object.entries(summary.skills).map(([id, s]) => {
        const lp = levelProgress(state.skills[id]?.xp || 0);
        const up = s.to > s.from;
        return `<div class="wb-skill${up ? ' up' : ''}" style="--i:${next()};--c:${SKILLS[id]?.color || '#d6aa5c'}">
            <span class="wb-skill-icon" aria-hidden="true">${tabIcon(id, 0.75)}</span>
            <span class="wb-skill-name">${esc(SKILLS[id]?.name || id)}</span>
            <span class="wb-skill-xp">+${fmt(s.xp)} XP</span>
            <span class="wb-skill-lv">${up ? `Lv ${s.from} → <b>${s.to}</b>` : `Lv ${s.to}`}</span>
            <i class="wb-bar" style="--p:${(lp.fraction * 100).toFixed(1)}%"></i>
        </div>`;
    }).join('');
    const gains = Object.entries(summary.resources).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
    const used = Object.entries(summary.resources).filter(([, d]) => d < 0);
    const tile = (id, text, cls = '') => `<div class="wb-tile${cls}" style="--i:${next()};--r:${res(id)?.color || '#e2e8f0'}" title="${esc(res(id)?.name || id)}">${resIcon(id, { scale: 1.25 })}<span>${text}</span></div>`;
    const finds = [
        summary.place ? `<div class="wb-find place" style="--i:${next()}">${sprite(feature(summary.place).icon, { scale: 1, fallback: '🔓' })}<span>Ready for you: <b>${esc(feature(summary.place).name)}</b></span></div>` : '',
        summary.prestiges > 0 ? `<div class="wb-find" style="--i:${next()}">${sprite(FEATURES.prestige.icon, { scale: 1 })}<span>Prestiged <b>${summary.prestiges === 1 ? 'once' : `${fmt(summary.prestiges)} times`}</b> on its own: +${fmt(summary.tokens)} tokens</span></div>` : '',
        ...(summary.petIds || []).map(id => { const p = PETS.find(x => x.id === id); return `<div class="wb-find pet" style="--i:${next()}">${sprite(`pet/${id}`, { scale: 1.5, fallback: p?.icon || '🐾' })}<span>A pet found you: <b>${esc(p?.name || id)}</b></span></div>`; }),
        summary.uniques > 0 ? `<div class="wb-find unique" style="--i:${next()}">${sprite(FEATURES.achievements.icon, { scale: 1 })}<span><b>${summary.uniques}</b> unique item${summary.uniques > 1 ? 's' : ''} found</span></div>` : '',
        summary.items > 0 ? `<div class="wb-find" style="--i:${next()}">${sprite(FEATURES.inventory.icon, { scale: 1 })}<span><b>${summary.items}</b> ${summary.items > 1 ? 'items' : 'item'} ${summary.mode === 'combat' ? 'found' : 'made'}${summary.salvaged > 0 ? ` (${summary.salvaged} more salvaged)` : ''}</span></div>`
            : summary.salvaged > 0 ? `<div class="wb-find" style="--i:${next()}">${resIcon('essence', { scale: 1 })}<span><b>${summary.salvaged}</b> items salvaged for essence and bars</span></div>` : '',
        ...(summary.dungeonClears || []).map(d => `<div class="wb-find" style="--i:${next()}">${sprite(FEATURES.dungeons.icon, { scale: 1 })}<span><b>${fmt(d.clears)}</b> ${esc(d.name)} clear${d.clears > 1 ? 's' : ''} (+${d.fragments} fragment${d.fragments === 1 ? '' : 's'})</span></div>`),
        summary.gilded > 0 ? `<div class="wb-find gilded" style="--i:${next()}">${sprite('gold', { scale: 1 })}<span><b>${summary.gilded}</b> gilded monster${summary.gilded > 1 ? 's' : ''} defeated</span></div>` : '',
        summary.stars > 0 ? `<div class="wb-find" style="--i:${next()}">${sprite(FEATURES.achievements.icon, { scale: 1 })}<span><b>${summary.stars}</b> new bestiary star${summary.stars > 1 ? 's' : ''}</span></div>` : '',
        summary.plotsReady ? `<div class="wb-find" style="--i:${next()}">${sprite('farm/growing', { scale: 1, fallback: '🌾' })}<span><b>${summary.plotsReady}</b> farm plot${summary.plotsReady > 1 ? 's are' : ' is'} ready to harvest</span></div>` : '',
        summary.mastery && summary.mastery.to > summary.mastery.from ? `<div class="wb-find" style="--i:${next()}">${sprite(FEATURES.mastery.icon, { scale: 1 })}<span>${esc(summary.mastery.name)} mastery ${summary.mastery.from} → <b>${summary.mastery.to}</b></span></div>` : ''
    ].filter(Boolean).join('');
    // Where the run stopped: it climbed, then held its wall (the share of the time away, as a bar).
    const run = summary.run;
    const wall = run && run.stallMs >= 10 * 60000 && summary.simulated > 0
        ? `<div class="wb-wall"><span>Climbed to stage <b>${fmt(run.stage)}</b>, then held there for <b>${duration(Math.min(run.stallMs, summary.simulated))}</b></span><i class="wb-wall-bar" style="--climb:${(100 * Math.max(0, 1 - run.stallMs / summary.simulated)).toFixed(0)}%" aria-hidden="true"></i></div>` : '';
    // What is ready now, each one a tap away (it closes this and does the thing).
    const ready = [];
    const preview = game.canPrestige() && !state.settings.autoPrestige ? game.prestigePreview() : null;
    if (preview && preview.tokens > 0) ready.push(['FI.openPrestige()', sprite(FEATURES.prestige.icon, { scale: 0.75 }), `Prestige: +${fmt(preview.tokens)} tokens`]);
    if (state.daily?.banked > 0) ready.push(['FI.claimDaily()', sprite('crate', { scale: 0.75 }), `${state.daily.banked > 1 ? `${state.daily.banked} crates` : 'A crate'} to open`]);
    if (game.titanReady()) ready.push(['FI.challengeTitan()', sprite('titan/0', { scale: 0.75 }), 'The Titan is awake']);
    if (state.prestige.skillPoints > 0) ready.push(['FI.openPerks()', sprite('perk/knight', { scale: 0.75 }), `${state.prestige.skillPoints} skill point${state.prestige.skillPoints === 1 ? '' : 's'} to spend`]);
    const upgrade = findUpgrade(state);
    if (upgrade) ready.push([`FI.equip(${Number(upgrade.item.id)})`, sprite(itemSpriteKey(upgrade.item), { scale: 0.75, fallback: esc(upgrade.item.icon) }), `Wear the ${esc(upgrade.item.name)}`]);
    const readyRow = ready.length ? `<div class="wb-ready">${ready.map(([act, art, text]) => `<button class="wb-ready-btn" onclick="FI.collectOffline(); ${act}">${art}<span>${text}</span></button>`).join('')}</div>` : '';
    // the hero who did the work, with the tool of it in hand (the sword after a fight), and the pet
    const pet = companionPet(state);
    const hero = `<div class="wb-hero" aria-hidden="true">${heroSprite(state, { scale: 2, tool: summary.mode === 'skill' ? state.action?.skill || null : null })}${pet ? sprite(`pet/${pet}`, { scale: 1, cls: 'wb-pet' }) : ''}</div>`;
    return `<div class="modal-content welcome-back ${painted('guildhall', 'center 45%')}">
        ${hero}
        <div class="modal-header">Welcome back</div>
        <p class="wb-away">You were away <b>${away}</b>${summary.capped ? ' <span class="muted small">(offline time is capped; Endurance perks extend it)</span>' : ''}</p>
        <p class="wb-story">${story}</p>
        ${wall}
        ${readyRow}
        ${summary.gold > 0 ? `<div class="wb-gold" style="--i:${next()}">${sprite('gold', { scale: 1.25 })}<b>+${fmt(summary.gold)}</b> gold</div>` : ''}
        ${skills ? `<div class="wb-skills">${skills}</div>` : ''}
        ${gains.length ? `<div class="wb-tiles">${gains.map(([id, d]) => tile(id, `+${shortQty(d)}`)).join('')}</div>` : ''}
        ${finds ? `<div class="wb-finds">${finds}</div>` : ''}
        ${used.length ? `<div class="wb-used"><span class="muted small">Used</span>${used.map(([id, d]) => tile(id, `−${shortQty(-d)}`, ' spent')).join('')}</div>` : ''}
        <div class="modal-footer"><button class="modal-btn btn-confirm" onclick="FI.collectOffline()">Collect</button></div>
    </div>`;
}

/** A new player's first screen: the title over the meadow, the hero and a slime, one button to begin. */
export function renderIntroModal(state) {
    const motes = Array.from({ length: 14 }, (_, i) => `<i style="--x:${(i * 53 + 7) % 100}%;--y:${(i * 31 + 11) % 70}%;--d:${(i * 0.7) % 5}s"></i>`).join('');
    return `<div class="intro" aria-labelledby="intro-title">
        <div class="intro-scene">
            <div class="intro-layer sky" aria-hidden="true"></div><div class="intro-layer far" aria-hidden="true"></div><div class="intro-layer near" aria-hidden="true"></div>
            <div class="intro-motes" aria-hidden="true">${motes}</div>
            <div class="intro-hero" aria-hidden="true">${heroSprite(state, { scale: 5 })}</div>
            <button type="button" class="look-turn prev" onclick="FI.turnLook(-1)" aria-label="Another look for your hero">‹</button>
            <button type="button" class="look-turn next" onclick="FI.turnLook(1)" aria-label="Another look for your hero">›</button>
            <div class="intro-foe" aria-hidden="true">${sprite('mon/Slime', { scale: 4 })}</div>
        </div>
        <h1 id="intro-title" class="intro-logo">Fantasy Idle</h1>
        <p class="intro-tag">Fight monsters, gather, forge your gear. Your hero keeps at it while you're away.</p>
        <input id="intro-name" class="text-input intro-name" maxlength="${HERO_NAME_MAX}" placeholder="Name your hero" aria-label="Your hero's name (optional; Settings can change it)" autocomplete="off" spellcheck="false" onkeydown="if (event.key === 'Enter') FI.beginAdventure()">
        <button class="modal-btn btn-confirm intro-go" data-autofocus onclick="FI.beginAdventure()">${sprite('item/Weapon/3', { scale: 0.75, cls: 'soft' })} Begin your adventure</button>
        <button class="intro-login" onclick="FI.openAuth()">Have an account? Sign in</button>
    </div>`;
}

export function renderAuthModal(message = '') {
    return `<div class="modal-content narrow ${painted('study', 'left 45%')}">
        <div class="modal-header">Cloud save</div>
        <div class="modal-body">
            <p class="muted small">Create an account to sync your save across devices, or keep playing as a guest with a local save.</p>
            <div class="auth-error" id="auth-error">${esc(message)}</div>
            <form class="auth-form" onsubmit="event.preventDefault(); FI.auth('login')">
                <input type="text" id="auth-user" placeholder="Username" autocomplete="username" class="text-input">
                <input type="password" id="auth-pass" placeholder="Password" autocomplete="current-password" class="text-input">
                <div class="btn-row"><button type="submit" class="modal-btn btn-confirm">Log in</button><button type="button" class="modal-btn btn-register" onclick="FI.auth('register')">Register</button></div>
            </form>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.closeModal()">Play as guest</button></div>
    </div>`;
}

export function renderConflictModal(local, cloud, suggested = null) {
    const line = s => `${duration(s.meta.playtimeMs)} played · best stage ${s.combat.bestStage} · saved ${new Date(s.meta.savedAt).toLocaleString()}`;
    const more = side => (suggested === side ? ' <span class="keep-text">· more progress</span>' : '');
    return `<div class="modal-content ${painted('study', 'right 45%')}">
        <div class="modal-header">Two saves found</div>
        <div class="modal-body">
            <div class="prestige-box"><h4>This device${more('local')}</h4><span>${line(local)}</span></div>
            <div class="prestige-box"><h4>Cloud${more('cloud')}</h4><span>${line(cloud)}</span></div>
            <p class="muted small">Pick the one to keep. The other is replaced; nothing is uploaded until you choose.</p>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.resolveConflict('local')">Keep this device</button><button class="modal-btn btn-confirm" onclick="FI.resolveConflict('cloud')">Use cloud save</button></div>
    </div>`;
}

// ---------- live patches (every frame) ----------

export function patchLive(game, ui) {
    const state = game.state;
    const d = game.derived;
    const action = resolveAction(state);
    set2('hdr-hp', fmt(state.combat.hp));
    if (choosingAfterClear(state)) {   // the wait at the chest, draining
        const left = state.combat.dungeon.choiceLeft;
        for (const el of document.querySelectorAll('.run-countdown')) {
            el.style.setProperty('--p', `${(left / DUNGEON_CHOICE_MS * 100).toFixed(1)}%`);
            const n = el.querySelector('b');
            if (n) n.textContent = String(Math.ceil(left / 1000));
        }
    }
    if (action && state.action) {
        const interval = intervalFor(action, d);
        const fillId = action.kind === 'node' ? `progress-${action.skill}-${action.id}` : action.kind === 'agility' ? 'progress-agility-course' : null;
        const el = fillId ? document.getElementById(fillId) : document.querySelector('.node-card.active .action-progress-fill');
        if (el) el.style.width = `${Math.min(100, state.action.progress / interval * 100)}%`;
    }
    for (const id of NON_COMBAT_SKILLS) {
        const ch = state.minigame[id]?.challenge;
        if (!ch) continue;
        const marker = document.getElementById(`mg-marker-${id}`);
        if (marker && (ch.type === 'timing' || ch.type === 'moving-target')) marker.style.left = `${animatedPosition(ch, Date.now()) * 100}%`;   // smooth: the clock of this frame, not the last tick's
        const heat = document.getElementById(`mg-heat-${id}`);
        if (heat && ch.type === 'heat') heat.style.width = `${ch.heat * 100}%`;
    }
}
function set2(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

export function renderTab(game, ui, cloud) {
    switch (ui.tab) {
        case 'combat': return renderCombat(game, ui);
        case 'smithing': return renderSmithing(game, ui);
        case 'crafting': return renderCrafting(game, ui);
        case 'inventory': return renderInventory(game, ui);
        case 'shop': return renderShop(game, ui);
        case 'achievements': return renderHall(game, ui);
        case 'dungeons': return renderDungeons(game);
        case 'farming': return renderFarming(game, ui);
        case 'events': return renderEvents(game);
        case 'agility': return renderAgility(game, ui);
        case 'settings': return renderSettings(game, ui, cloud);
        case 'clan': return renderClan(game, ui, cloud);
        default: return NON_COMBAT_SKILLS.includes(ui.tab) ? renderSkill(game, ui, ui.tab) : renderCombat(game, ui);
    }
}
