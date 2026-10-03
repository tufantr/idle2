// All DOM rendering. Renderers are pure functions of (game, ui) returning HTML strings; the
// active tab is re-rendered on a short interval, and a few live elements (progress bars, HP)
// are patched every frame. Nothing in here mutates game state — handlers call window.FI.

import { SKILLS, NON_COMBAT_SKILLS, GATHERING_SKILLS } from '../data/skills.js';
import { RESOURCES, orderedByTier, foodsByHealing, sellValue } from '../data/resources.js';
import { SMELTING_RECIPES, METALS, JEWEL_BARS, GEM_TIERS, TOOLS, TOOL_SPEED_PER_TIER, TOOL_DOUBLE_PER_TIER } from '../data/workshop.js';
import { SMITHING_TYPES, CRAFTING_TYPES, SMITHING_BAR_COST, TYPE_NAMES, TYPE_ICONS, EQUIP_SLOTS, TYPE_SLOTS, RARITIES, MAX_UPGRADE, UPGRADE_STEP, TIER_WEAR_LEVEL, AUTO_SALVAGE_OPTIONS } from '../data/items.js';
import { PERKS, GOLD_SHOP } from '../data/perks.js';
import { CAMP_UPGRADES, campCost } from '../data/camp.js';
import { ACHIEVEMENTS, ACHIEVEMENT_GLOBAL_BONUS } from '../data/achievements.js';
import { isUnlocked, nextGoals, goalProgress } from '../data/unlocks.js';
import { ZONES, zoneForStage, STAGES_PER_ZONE } from '../data/zones.js';
import { levelProgress, MAX_LEVEL } from '../core/xp.js';
import { actionInterval, skillLevel, bonfireBonus, bonfireLit } from '../core/modifiers.js';
import { describeAffix, itemSellValue, tokensForStage, BALANCE } from '../core/formulas.js';
import { canComplete, resolveAction, fuelLog, intervalFor } from '../systems/skilling.js';
import { masteryProgress, skillMastery } from '../systems/mastery.js';
import { MASTERY_SKILLS, MASTERY_MAX_LEVEL } from '../data/mastery.js';
import { MINIGAME_CONFIG, hasOpportunity, animatedPosition } from '../systems/minigame.js';
import { goldShopPrice, itemUpgradeCost, itemReforgeCost, canWear, isUpgrade, itemScore, salvagePreview, bagSize } from '../systems/inventory.js';
import { nextCampCost } from '../systems/camp.js';
import { advise } from '../systems/advisor.js';
import { achievementProgress } from '../systems/progress.js';
import { DUNGEONS, dungeonById, DUNGEON_MILESTONES, FRAGMENTS_PER_UNIQUE, UNIQUES, TITAN_TIME_MS, TITAN_UNLOCK_STAGE, TITAN_BONUS, DUNGEON_BOSS_TIME_MS } from '../data/dungeons.js';
import { dungeonUnlocked, titanReady, titanUnlocked, titanLevel, titanEnemy, fightPreview, dungeonPreview, ownsUnique } from '../systems/dungeon.js';
import { PETS, PET_BASE } from '../data/pets.js';
import { FARMING_PLOTS, CROPS, cropById } from '../data/farming.js';
import { AGILITY_SLOTS, obstacleById, MAX_OBSTACLE_LEVEL } from '../data/agility.js';
import { plotUnlocked, seedCost, growTime, plotReady } from '../systems/farming.js';
import { obstacleCost, courseDef, obstacleLevel, upgradeInfo } from '../systems/agility.js';
import { BAIT_EXTRA_CHANCE } from '../systems/skilling.js';
import { DISCORD_INVITE } from '../data/social.js';
import { EVENTS, EVENT_DAILY_CAP, EVENT_MILESTONES, EVENT_SHOP } from '../data/events.js';
import { eventStatus } from '../systems/events.js';
import { DAILY_MAX_BANKED } from '../systems/daily.js';
import { listBackups } from '../core/save.js';
import { BASE } from '../core/modifiers.js';
import { fmt, pct, seconds, duration, escapeHtml as esc } from './format.js';
import { sprite, heroSprite, itemSpriteKey, slotSpriteKey, resIcon, monsterSpriteKey } from './sprites.js';
import { FEATURES, feature, artStyle, aboutButton } from './features.js';
import { seen } from '../systems/disclosure.js';

export const TABS = [
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
    { id: 'inventory', name: 'Inventory', icon: '🎒', group: 'MANAGEMENT' },
    { id: 'shop', name: 'Shop', icon: '🔮', group: 'MANAGEMENT' },
    { id: 'achievements', name: 'Achievements', icon: '🏆', group: 'MANAGEMENT' },
    { id: 'events', name: 'Events', icon: '🎉', group: 'MANAGEMENT' },
    { id: 'settings', name: 'Settings', icon: '⚙️', group: 'MANAGEMENT' },
    { id: 'clan', name: 'Clan', icon: '🛡️', group: 'SOCIAL' }
];

const rarityColor = id => RARITIES.find(r => r.id === id)?.color || '#e2e8f0';
const res = id => RESOURCES[id];
const resTag = (id, qty = null) => `<span class="res-tag" style="color:${res(id)?.color || '#e2e8f0'}">${resIcon(id)} ${qty !== null ? `${fmt(qty)}× ` : ''}${esc(res(id)?.name || id)}</span>`;

// ---------- sidebar ----------

/** A tab's picture: its sprite from the atlas (an emoji where the atlas has none). */
export function tabIcon(id, scale = 0.75) {
    const key = FEATURES[id]?.icon || '';
    const tab = TABS.find(t => t.id === id);
    return key.includes('/') || key === 'gold'
        ? sprite(key, { scale, cls: scale < 1 ? 'soft' : '', fallback: tab?.icon || '' })
        : `<span class="nav-emoji" aria-hidden="true">${key || tab?.icon || ''}</span>`;
}

// The sidebar lists the places the player has opened, and nothing else: no padlocks. One slot at
// the end shows the next place to open, with its picture and how far along it is. Group headings
// arrive once the list is long enough to need them.
const NAV_HEADINGS_FROM = 7;

export function renderNav(game, ui) {
    const state = game.state;
    const groups = ['COMBAT', 'SKILLS', 'MANAGEMENT', 'SOCIAL'];
    const action = resolveAction(state);
    const open = TABS.filter(tab => isUnlocked(state, tab.id) || tab.id === 'settings');
    const headings = open.length >= NAV_HEADINGS_FROM;
    let html = '';
    for (const group of groups) {
        const tabs = open.filter(t => t.group === group);
        if (!tabs.length) continue;
        if (headings) html += `<h3>${group}</h3>`;
        for (const tab of tabs) {
            const active = ui.tab === tab.id ? 'active' : '';
            const working = (action && (action.skill === tab.skill)) || (tab.id === 'combat' && state.combat.active) ? 'action-active' : '';
            let badge = '';
            let xpBar = '';
            const levelled = tab.skill || (tab.id === 'combat' ? 'combat' : null);
            if (levelled) {
                const lp = levelProgress(state.skills[levelled].xp);
                badge = `<span class="nav-level" title="${lp.level >= MAX_LEVEL ? 'Max level' : `${fmt(lp.xpInto)} / ${fmt(lp.xpNeeded)} XP`}">${lp.level}</span>`;
                xpBar = lp.level >= MAX_LEVEL ? '' : `<i class="nav-xp" style="--p:${(lp.fraction * 100).toFixed(1)}%" aria-hidden="true"></i>`;
            }
            const fresh = ui.fresh?.has(tab.id) ? '<span class="nav-new" title="Just unlocked">New</span>' : '';
            html += `<button id="nav-${tab.id}" class="nav-btn ${active} ${working}${fresh ? ' fresh' : ''}" onclick="FI.switchTab('${tab.id}')"><span class="nav-icon">${tabIcon(tab.id)}</span><span class="nav-name">${tab.name}</span>${fresh || badge}${xpBar}</button>`;
        }
    }
    const [goal] = nextGoals(state, 1);
    if (goal) {
        const f = feature(goal.id);
        const where = isUnlocked(state, goal.tab) ? goal.tab : 'combat';
        html += `<button class="nav-next" onclick="FI.switchTab('${where}')" title="${esc(goal.hint)}" style="${artStyle(goal.id)}">
            <span class="nav-next-kicker">Next</span>
            <span class="nav-next-name">${esc(f.name)}</span>
            <span class="nav-next-task">${esc(goal.task || goal.hint)}</span>
            <i class="goal-bar" style="--p:${(goalProgress(state, goal) * 100).toFixed(1)}%" aria-hidden="true"></i>
        </button>`;
    }
    return html;
}

// ---------- phone hotbar ----------

/** Four thumb-sized shortcuts along the bottom of a phone: the fight, the current work, the inventory, the crate. */
export function renderHotbar(game, ui) {
    const state = game.state;
    const action = resolveAction(state);
    const fighting = state.combat.active;
    const banked = state.daily.banked;
    const upgrade = state.inventory.some(i => canWear(state, i) && isUpgrade(state, i));
    const button = (icon, label, onclick, { active = false, live = false, badge = '', disabled = false } = {}) =>
        `<button class="hot-btn${active ? ' active' : ''}${live ? ' live' : ''}" onclick="${onclick}" ${disabled ? 'disabled' : ''}><span class="hot-icon" aria-hidden="true">${icon}</span><span class="hot-label">${label}</span>${badge ? `<b class="hot-badge" aria-label="${badge === '▲' ? 'an upgrade is waiting' : `${badge} waiting`}">${badge}</b>` : ''}</button>`;
    const work = action && SKILLS[action.skill]
        ? button(tabIcon(action.skill, 1), esc(SKILLS[action.skill].name), `FI.switchTab('${action.skill}')`, { active: ui.tab === action.skill, live: true })
        : button(tabIcon('mining', 1), 'Work', "FI.switchTab('mining')", { active: ui.tab === 'mining' });
    return [
        button(tabIcon('combat', 1), fighting ? 'Fighting' : 'Battle', "FI.switchTab('combat')", { active: ui.tab === 'combat', live: fighting }),
        work,
        button(tabIcon('inventory', 1), 'Inventory', "FI.switchTab('inventory')", { active: ui.tab === 'inventory', badge: upgrade ? '▲' : '' }),
        button('📦', banked > 0 ? 'Crate' : duration(state.daily.nextAt - game.now), 'FI.claimDaily()', { badge: banked > 0 ? String(banked) : '', disabled: banked < 1 })
    ].join('');
}

// ---------- header ----------

// The header is the purse and a few pills. A currency shows once the player holds some
// (systems/disclosure.js); the status pill only says what is running somewhere else than the tab in
// view; the next goal lives in the guide and the sidebar; the hero's numbers are in the Inventory.
export function renderHeader(game, ui, cloud) {
    const state = game.state;
    const d = game.derived;
    const action = resolveAction(state);
    const chips = [
        `<div class="chip gold" title="Gold: earned in combat, spent at the camp and the shop (a prestige starts it over)"><span>Gold</span><b id="hdr-gold"></b></div>`, // painted every frame by main.js (it rolls up)
        seen(state, 'essence') ? `<div class="chip essence" title="Monster essence: upgrades and reforges equipment"><span>Essence</span><b>${fmt(state.resources.essence)}</b></div>` : '',
        seen(state, 'tokens') ? `<div class="chip tokens" title="Prestige tokens: permanent +0.5% ATK/DEF each"><span>Tokens</span><b>${fmt(state.prestige.tokens)}</b><i>+${d.tokenPowerPct}%</i></div>` : '',
        seen(state, 'skill_points') ? `<div class="chip sp" title="Skill points: spend them on perks in the Shop"><span>SP</span><b>${state.prestige.skillPoints}</b></div>` : ''
    ];
    const banked = state.daily.banked;
    const daily = banked > 0
        ? `<button class="daily-btn ready" onclick="FI.claimDaily()" title="A crate ripens every 20 hours; up to ${DAILY_MAX_BANKED} wait for you. ${banked >= DAILY_MAX_BANKED ? 'The bank is full.' : `Next in ${duration(state.daily.nextAt - game.now)}.`}">📦 Daily crate${banked > 1 ? ` <b>×${banked}</b>` : ''}</button>`
        : '';
    const bonfirePill = bonfireLit(state, game.now)
        ? `<span class="bonfire-pill" title="Burning logs in Firemaking keeps it going (up to ${BASE.bonfireMaxMs / 3600000} h)">🔥 +${Math.round(bonfireBonus(skillLevel(state, 'firemaking')) * 100)}% XP · ${duration(state.bonfire.until - game.now)}</span>`
        : '';
    const ev = eventStatus(state, game.now);
    const eventPill = ev.active && isUnlocked(state, 'events')
        ? `<button class="event-pill" style="--accent:${ev.event.color}" onclick="FI.switchTab('events')" title="${esc(ev.event.desc)}">${ev.event.icon} ${esc(ev.event.name)} · ${duration(ev.endsAt - game.now)} left</button>`
        : '';
    const focusPill = game.derived.focused
        ? `<span class="focus-pill" title="You've left the game alone for a minute: +${Math.round(BASE.focusSkillSpeed * 100)}% skill speed and +${Math.round(BASE.focusAttackSpeed * 100)}% attack speed. Any click or key press ends it.">🧘 Focused +${Math.round(BASE.focusSkillSpeed * 100)}%</span>`
        : '';
    // What the hero is doing, when that is not what the tab in view already shows.
    const here = ui.tab === 'combat' || NON_COMBAT_SKILLS.includes(ui.tab) || ['smithing', 'crafting'].includes(ui.tab); // tabs with a scene or a stage of their own
    let status = '';
    if (action) {
        if (ui.tab !== action.skill) status = `<button class="status-pill working" onclick="FI.switchTab('${action.skill}')">${tabIcon(action.skill, 0.625)} ${esc(action.label)}${state.action?.stalled ? ' — <b class="warn">waiting for materials</b>' : ''}</button>`;
    } else if (state.combat.active) {
        if (ui.tab !== 'combat') status = `<button class="status-pill fighting" onclick="FI.switchTab('combat')">${tabIcon('combat', 0.625)} ${esc(fightingWhere(state))}</button>`;
    } else if (!here) {
        status = `<button class="status-pill idle" onclick="FI.switchTab('combat')">💤 Resting</button>`;
    }
    const nudge = !cloud?.loggedIn && state.combat.bestStage > 10;   // past the first boss: worth keeping
    const user = cloud?.loggedIn ? `<span class="cloud-pill" title="Cloud save">☁️ ${esc(cloud.username || 'signed in')}</span>`
        : `<button class="cloud-pill local${nudge ? ' nudge' : ''}" onclick="FI.openAuth()" aria-label="Local save only: sign in to keep it in the cloud" title="Local save only: sign in to keep it in the cloud">💾${nudge ? ' Save to cloud' : ''}</button>`;
    const soundOn = state.settings.sound !== false;
    const mute = `<button class="mini-btn icon-btn" onclick="FI.toggleSound()" aria-pressed="${soundOn}" aria-label="${soundOn ? 'Mute sound' : 'Unmute sound'}" title="${soundOn ? 'Sound and vibration on' : 'Sound off'}">${soundOn ? '🔊' : '🔇'}</button>`;
    return `
        <div class="header-row">
            <div class="chips">${chips.join('')}</div>
            <div class="pills">${status}${focusPill}${bonfirePill}${eventPill}</div>
            <div class="header-right">${daily}${mute}${user}</div>
        </div>`;
}

// ---------- the guide (the quest board, as one line under the scene) ----------

/** The advisor's notes: the next unlock with its progress, then what is worth doing now. */
export function renderGuide(game, ui) {
    if (['settings', 'clan'].includes(ui.tab)) return '';
    const tips = advise(game);
    if (!tips.length) return '';
    const notes = tips.map(t => {
        const where = t.tab && isUnlocked(game.state, t.tab) ? t.tab : null;
        const go = where && (where !== ui.tab || t.view);
        const icon = t.goal ? tabIcon(t.goal, 0.75) : where ? tabIcon(where, 0.75) : `<span class="nav-emoji" aria-hidden="true">${t.icon}</span>`;
        const inner = `<span class="quest-icon">${icon}</span><span class="quest-text">${esc(t.text)}</span>${go ? '<span class="quest-go" aria-hidden="true">→</span>' : ''}
            ${t.goal ? `<i class="quest-bar" style="--p:${((t.progress || 0) * 100).toFixed(1)}%" aria-hidden="true"></i>` : ''}`;
        // A note that leads somewhere is a button; one about the tab in view is just a note.
        return go ? `<button class="quest-note${t.goal ? ' goal' : ''}" onclick="FI.advisorGo('${where}', ${t.view ? `'${t.view}'` : 'null'})">${inner}</button>`
            : `<div class="quest-note${t.goal ? ' goal' : ''}">${inner}</div>`;
    }).join('');
    return `<div class="guide" role="group" aria-label="What to do next">${notes}</div>`;
}

// ---------- combat ----------

function fightingWhere(state) {
    const c = state.combat;
    if (c.mode === 'titan') return c.enemy?.name || 'the Titan';
    const run = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    if (run) return `${run.name} ${Math.min(c.dungeon.index + 1, run.monsters.length + 1)}/${run.monsters.length + 1}`;
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
    const pick = (on, onclick, inner, title) => `<button class="pick${on ? ' on' : ''}" onclick="${onclick}" title="${esc(title)}" aria-label="${esc(title)}" aria-pressed="${on}">${inner}</button>`;
    const word = w => `<span class="pick-word">${w}</span>`;
    const foods = foodsByHealing().filter(f => state.resources[f.id] > 0 || c.autoEat === f.id);
    const potions = orderedByTier('potion').filter(p => state.resources[p.id] > 0 || c.potion === p.id);
    const foodRow = [
        pick(c.autoEat === 'auto', "FI.setAutoEat('auto')", word('Auto'), 'Auto: eat whatever best fits the missing health'),
        pick(c.autoEat === 'none', "FI.setAutoEat('none')", word('None'), 'Never eat automatically'),
        ...foods.map(f => pick(c.autoEat === f.id, `FI.setAutoEat('${f.id}')`,
            `${resIcon(f.id, { scale: 1.25 })}<span class="pick-qty">${shortQty(state.resources[f.id] || 0)}</span><span class="pick-sub">+${Math.round(f.heals * d.foodMult)}</span>`,
            `${f.name}: heals ${Math.round(f.heals * d.foodMult)} HP (${fmt(state.resources[f.id] || 0)} left)`))
    ].join('');
    const potionRow = [
        pick(c.potion === 'none', "FI.setPotion('none')", word('None'), 'No potion'),
        ...potions.map(p => pick(c.potion === p.id, `FI.setPotion('${p.id}')`,
            `${resIcon(p.id, { scale: 1.25 })}<span class="pick-qty">${shortQty(state.resources[p.id] || 0)}</span>`,
            `${p.name}: ${p.desc} (${fmt(state.resources[p.id] || 0)} left)`))
    ].join('');
    const potionNote = c.potion !== 'none' ? (c.potionCharges > 0 ? `${c.potionCharges} attacks left` : (state.resources[c.potion] > 0 ? 'drinks on the next attack' : 'none left')) : '';
    const link = (tab, text) => (isUnlocked(state, tab) ? ` <button class="link-btn" onclick="FI.switchTab('${tab}')">${text}</button>` : '');
    return `${showFood ? `<div class="loadout">
            <div class="loadout-label">Food <span class="muted small">eaten below ${pct(d.autoEatThreshold)} health</span></div>
            <div class="pick-row">${foodRow}</div>
            ${foods.length ? '' : `<div class="muted small">No food yet.${link('cooking', 'Cook some')}</div>`}
        </div>` : ''}
        ${showPotions ? `<div class="loadout">
            <div class="loadout-label">Potion${potionNote ? ` <span class="muted small">${potionNote}</span>` : ''}</div>
            <div class="pick-row">${potionRow}</div>
            ${potions.length ? '' : `<div class="muted small">No potions yet.${link('alchemy', 'Brew some')}</div>`}
        </div>` : ''}`;
}

/** The camp: three upgrades as tokens on the camp painting. It arrives with the gold for the first one. */
function renderCamp(game) {
    const state = game.state;
    if (!seen(state, 'camp')) return '';
    const cards = CAMP_UPGRADES.map(u => {
        const level = state.camp[u.id] || 0;
        const cost = nextCampCost(state, u.id);
        const can = cost !== null && state.gold >= cost;
        const canTwo = can && level + 1 < u.max && state.gold >= cost + campCost(u, level + 1);
        const total = Math.round((Math.pow(1 + u.bonus, level) - 1) * 100);
        return `<div class="camp-up${can ? ' can' : ''}" title="${esc(u.desc)}">
            <div class="camp-medal">${sprite(u.art, { scale: 1.5, fallback: u.icon })}${level ? `<b class="camp-lv" aria-label="level ${level} of ${u.max}">${level}</b>` : ''}</div>
            <div class="camp-name">${esc(u.name)}</div>
            <div class="camp-gives">${esc(u.short)}${level ? ` <span class="muted">· now +${total}%</span>` : ''}</div>
            <div class="camp-actions">
                <button class="gold-btn" onclick="FI.buyCamp('${u.id}', 1)" ${can ? '' : 'disabled'} aria-label="${cost === null ? `${esc(u.name)} is at its highest level` : `Raise ${esc(u.name)} for ${fmt(cost)} gold`}">${cost === null ? 'Max' : `${sprite('gold', { scale: 0.5, cls: 'soft', fallback: '🪙' })} ${fmt(cost)}`}</button>
                ${canTwo ? `<button class="mini-btn" onclick="FI.buyCamp('${u.id}', 'max')" title="Buy as many levels as your gold allows">Max</button>` : ''}
            </div>
        </div>`;
    }).join('');
    return `<section class="glass-panel camp-panel" style="${artStyle('camp')}">
        <div class="panel-header"><h2>Camp ${aboutButton('camp')}</h2></div>
        <div class="camp-row">${cards}</div>
    </section>`;
}

/** Prestige, in one line: what a prestige would pay now, and the button. The rules are behind the "?". */
function renderPrestigeStrip(game) {
    const state = game.state;
    if (!isUnlocked(state, 'prestige')) return '';
    const c = state.combat;
    const preview = game.prestigePreview();
    const line = preview.allowed ? `<b>+${preview.tokens}</b> tokens if you prestige now`
        : c.maxStage < BALANCE.prestige.minStage ? `Reach stage ${BALANCE.prestige.minStage} first`
        : `Ready in ${duration(preview.waitMs)}`;
    return `<section class="glass-panel prestige-strip" style="${artStyle('prestige')}">
        <div class="prestige-strip-text">
            <h2>Prestige ${aboutButton('prestige')}</h2>
            <span class="small">${line} <span class="muted">· stage ${Math.ceil((c.maxStage + 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE} pays ${preview.nextZoneTokens}</span></span>
        </div>
        <button class="prestige-btn arcane" onclick="FI.openPrestige()" ${preview.allowed ? '' : 'disabled'}>Prestige</button>
    </section>`;
}

/** The battle log, folded away: its last line shows, the rest opens on a tap. */
function renderBattleLog(state, ui) {
    const lines = [...state.log].reverse().filter(l => ['combat', 'death', 'loot', 'prestige'].includes(l.type)).slice(0, 8);
    if (!lines.length) return '';
    return `<details class="glass-panel log-drawer" ${ui.open?.log ? 'open' : ''} ontoggle="FI.setOpen('log', this.open)">
        <summary><span class="log-title">Battle log</span><span class="log-last ${lines[0].type}">${esc(lines[0].text)}</span></summary>
        <div class="log-list">${lines.map(l => `<div class="log-line ${l.type}">${esc(l.text)}</div>`).join('')}</div>
    </details>`;
}

export function renderCombat(game, ui) {
    const state = game.state;
    const c = state.combat;
    const zone = zoneForStage(c.stage);

    // The battle scene above the tab (src/ui/scene.js) shows the fight and starts it; this panel holds the orders.
    const run = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    const leave = c.mode === 'dungeon' ? 'Abandon run' : c.mode === 'titan' ? 'Give up' : 'Retreat';
    const retreat = c.active ? `<button class="mini-btn retreat-btn" onclick="FI.toggleCombat()">🏳️ ${leave}</button>` : '';
    const far = c.maxStage > STAGES_PER_ZONE; // a jump of ten needs a second zone
    const nav = c.mode === 'stages' && seen(state, 'stage_nav')
        ? `<div class="stage-nav">
                ${far ? `<button class="mini-btn" aria-label="Back 10 stages" onclick="FI.stageNav(-10)" ${c.stage <= 1 ? 'disabled' : ''}>«</button>` : ''}
                <button class="mini-btn" aria-label="Back 1 stage" onclick="FI.stageNav(-1)" ${c.stage <= 1 ? 'disabled' : ''}>‹</button>
                <button class="mini-btn" aria-label="Forward 1 stage" onclick="FI.stageNav(1)" ${c.stage >= c.maxStage ? 'disabled' : ''}>›</button>
                ${far ? `<button class="mini-btn" aria-label="Forward 10 stages" onclick="FI.stageNav(10)" ${c.stage >= c.maxStage ? 'disabled' : ''}>»</button>` : ''}
                <label class="toggle" title="Stay on this stage instead of moving on: for gathering its loot"><input type="checkbox" onchange="FI.toggleFarm(this.checked)" ${c.farmMode ? 'checked' : ''}> Stay on this stage</label>
            </div>`
        : '';
    const map = c.mode === 'stages' && seen(state, 'world_map') ? `<button class="mini-btn map-btn" onclick="FI.openMap()">🗺️ Map</button>` : '';
    const where = run
        ? `<div class="muted small">Dungeon run · ${state.dungeons[run.id].clears} clears · ${c.autoRepeat ? 'repeats after each clear' : 'stops after this clear'} · dying or leaving loses the run</div>`
        : c.mode === 'titan'
            ? '<div class="muted small">Deal as much damage as you can before the timer runs out. Clicking the Titan helps.</div>'
            : `<div class="zone-facts"><span class="muted small">Drops here</span>${zone.loot.map(l => `<span class="fact" title="${esc(res(l.id).name)}">${resIcon(l.id, { scale: 0.75 })}</span>`).join('')}${seen(state, 'gear') ? `<span class="fact-text muted small" title="Gear that drops here is usually one tier below this, sometimes this tier, rarely one above">· gear tier <b>${zone.gearTier}</b></span>` : ''}</div>`;
    const deck = retreat || nav || map ? `<div class="combat-deck">${retreat}${nav}${map}</div>` : '';
    const loadout = renderLoadout(game);

    return `
    <section class="glass-panel combat-panel">
        ${deck}
        ${where}
        ${loadout ? `<div class="combat-controls">${loadout}</div>` : ''}
    </section>
    ${renderCamp(game)}
    ${renderPrestigeStrip(game)}
    ${renderBattleLog(state, ui)}`;
}

// ---------- banners ----------

/** A place's banner: its painting, its name, one line and the "?" (for the tabs without a scene of their own). */
function banner(id, { title = null, sub = null, extra = '' } = {}) {
    const f = feature(id);
    return `<div class="tab-banner" style="${artStyle(id)}">
        <div class="tab-banner-text"><h2>${title ?? esc(f.name)} ${aboutButton(id)}</h2><p>${sub ?? esc(f.blurb)}</p></div>
        ${extra ? `<div class="tab-banner-extra">${extra}</div>` : ''}
    </div>`;
}

// ---------- skills ----------

function xpHeader(game, skillId, extra = '', { title = true } = {}) {
    const state = game.state;
    const skill = SKILLS[skillId];
    const lp = levelProgress(state.skills[skillId].xp);
    let mastery = '';
    if (MASTERY_SKILLS.includes(skillId) && seen(state, 'mastery')) {
        const m = skillMastery(state, skillId);
        mastery = `<button class="mastery-total" onclick="FI.about('mastery')" title="Mastery levels gained across this skill's ${m.actions} actions (${m.maxed} at ${MASTERY_MAX_LEVEL}). Every action levels its own mastery as you do it.">Mastery ${fmt(m.levels)}</button>`;
    }
    return `<div class="panel-header${title ? '' : ' bare'}">
        ${title ? `<h2><span class="h-icon">${tabIcon(skillId, 1)}</span>${skill.name} ${aboutButton(skillId)}</h2>` : ''}
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
    if (mastery.preserve) gives.push(`${pct(mastery.preserve, 1)} chance to keep the ingredients`);
    const title = `${label} ${p.level}: ${p.level > 1 ? gives.join(', ') : 'no bonus yet — every level adds a little'}. `
        + (maxed ? 'Mastered!' : `Next level after ${duration((p.xpNeeded - p.xpInto) * 1000)} more practice (at base speed).`);
    return `<div class="mastery-row" title="${esc(title)}"><span class="mastery-lvl ${maxed ? 'max' : ''}">${esc(label)} ${p.level}</span><div class="mastery-bar"><div style="width:${(p.fraction * 100).toFixed(1)}%"></div></div></div>`;
}

/** The chance line for an action's stats: doubling (skill + mastery) and keeping ingredients. */
function luckStats(d, def) {
    const dbl = (def.kind === 'smith' || def.kind === 'craft') ? 0 : (d.doubleChance[def.skill] || 0) + (def.mastery?.double || 0);
    const keep = def.mastery?.preserve || 0;
    return `${dbl ? `<span title="Chance of a double">🎲 ${pct(dbl)}</span>` : ''}${keep ? `<span title="Chance to keep the ingredients">♻️ ${pct(keep)}</span>` : ''}`;
}

/** What a tool tier does, in words (the "double" means something different per skill). */
function toolEffect(toolId, tier) {
    const tool = TOOLS[toolId];
    const speed = Math.round(TOOL_SPEED_PER_TIER * tier * 100);
    const dbl = Math.round(TOOL_DOUBLE_PER_TIER * tier * 100);
    if (toolId === 'hoe') return `+${speed}% crop growth speed, +${dbl}% chance of a double harvest`;
    if (toolId === 'tinderbox') return `+${speed}% firemaking speed, +${dbl}% chance a log burns twice`;
    return `−${speed}% ${SKILLS[tool.skill].name} time, +${dbl}% double yield`;
}

/** The tool in hand, once there is one (the guide says when one can be made). */
function toolBadge(game, skillId) {
    const skill = SKILLS[skillId];
    if (!skill.tool) return '';
    const tool = TOOLS[skill.tool];
    const tier = game.state.tools[skill.tool] || 0;
    const def = tool.tiers.find(t => t.tier === tier);
    return def ? `<span class="tool-badge" title="${toolEffect(skill.tool, tier)}">${tool.icon} ${esc(def.name)}</span>` : '';
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
        return `<div class="info-strip ${lit ? 'lit' : ''}">🔥 ${lit ? `The bonfire burns for <b>${duration(state.bonfire.until - game.now)}</b>: <b>+${bonus}% XP</b> in every skill.` : `The bonfire is out. Burn logs to light it: <b>+${bonus}% XP</b> in every skill.`}</div>`;
    }
    return '';
}

/** What an action needs, as small chips: how many, the icon, and how many you hold. */
function needChips(state, consumes) {
    return Object.entries(consumes || {}).map(([id, q]) => {
        const have = state.resources[id] || 0;
        return `<span class="need ${have >= q ? 'ok' : 'missing'}" title="${esc(res(id).name)}: needs ${q}, you have ${fmt(have)}">${q}× ${resIcon(id)} <i>(${shortQty(have)})</i></span>`;
    }).join(' ');
}

/**
 * One action as a card. At rest it shows only its art, its name, what it needs and how long it takes;
 * the card being worked opens up with its numbers (yield, XP, luck, mastery) and the progress bar.
 * The same numbers sit in the tooltip of the others. A locked card is the next one to earn.
 */
function actionCard(c) {
    if (c.locked) {
        return `<div class="node-card locked" aria-disabled="true" style="--accent:${c.color}">
            <div class="skill-action-art">${c.art}</div>
            <div class="node-name">${esc(c.title)}</div>
            <div class="req">${esc(c.locked)}</div>
        </div>`;
    }
    const bar = c.active
        ? `<div class="action-progress-container"><div class="action-progress-fill" ${c.progressId ? `id="${c.progressId}"` : 'data-progress="1"'} style="width:${c.progress || 0}%; background:${c.stalled ? '#ef4444' : c.color}"></div></div>`
        : '';
    return `<div ${c.id ? `id="${c.id}"` : ''} class="node-card ${c.active ? 'active' : ''} ${c.active && c.stalled ? 'stalled' : ''}" onclick="${c.onclick}" role="button" tabindex="0" aria-pressed="${!!c.active}" style="--accent:${c.color}" ${c.tip ? `title="${esc(c.tip)}"` : ''}>
        <div class="skill-action-art" style="color:${c.color}">${c.art}</div>
        <div class="node-name">${esc(c.title)}</div>
        ${c.note ? `<div class="node-io muted small">${c.note}</div>` : ''}
        ${c.inputs ? `<div class="node-io small">${c.inputs}</div>` : ''}
        ${c.active
            ? `${c.have !== undefined ? `<div class="node-have" title="You have ${fmt(c.have)}">${c.haveIcon || ''}<b>${fmt(c.have)}</b></div>` : ''}<div class="node-stats">${c.stats}</div>${c.mastery || ''}${bar}`
            : `<div class="node-time muted small">⏱️ ${seconds(c.time)}</div>`}
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
            if (level < node.levelReq) { cards += actionCard({ locked: `Level ${node.levelReq}`, art, title: node.name, color: skill.color }); continue; }
            const active = action?.kind === 'node' && action.skill === skillId && action.id === node.id;
            const def = resolveAction(state, { kind: 'node', skill: skillId, id: node.id });
            const interval = intervalFor(def, d);
            const check = canComplete(state, def);
            let inputs = needChips(state, node.consumes);
            if (node.fuel) { const log = fuelLog(state); inputs += ` <span class="need ${log ? 'ok' : 'missing'}" title="${log ? `Burns one ${esc(res(log).name)} per dish` : 'Needs a log to burn: cut some in Woodcutting'}">1× ${resIcon(log || 'normal_log')}${log ? '' : ' <i>(0)</i>'}</span>`; }
            const xp = Math.round(node.xp * d.xpMult);
            const gives = node.produces ? `${out.name}${skillId === 'mining' ? ', with a 2% chance of a gem' : ''}` : `+${BASE.bonfireSecondsPerLogTier * out.tier} s of bonfire`;
            cards += actionCard({
                id: `node-${skillId}-${node.id}`, art, title: node.name, color: skill.color, inputs, time: interval,
                tip: `${gives} · +${xp} XP · ${seconds(interval)}`,
                active, stalled: active && (action.stalled || !check.ok), onclick: `FI.startNode('${skillId}','${node.id}')`,
                have: node.produces ? state.resources[node.produces] : undefined, haveIcon: node.produces ? resIcon(node.produces) : '',
                stats: `<span>✨ ${xp} XP</span><span>⏱️ ${seconds(interval)}</span>${luckStats(d, def)}`,
                mastery: masteryRow(state, skillId, def.mastery),
                progressId: `progress-${skillId}-${node.id}`, progress: active ? Math.min(100, action.progress / interval * 100) : 0
            });
        }
    }
    const bait = skillId === 'fishing' && state.resources.fishing_bait > 0 ? `<span class="tool-badge" title="Each catch uses one bait for a ${Math.round(BAIT_EXTRA_CHANCE * 100)}% chance of a second fish">${resIcon('fishing_bait')} ${fmt(state.resources.fishing_bait)} bait</span>` : '';
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, skillId, bait + toolBadge(game, skillId))}
        ${skillExtras(game, skillId)}
        ${NON_COMBAT_SKILLS.includes(skillId) ? renderMinigame(game, skillId) : ''}
        <div class="node-grid">${cards}</div>
    </section>`;
}

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
        if (boostLeft > 0) return `<div class="minigame-line live" style="--minigame-accent:${conf.accent}">⚡ ${conf.label}: <b>+${Math.round(mg.bonus * 100)}% speed</b> · ${Math.ceil(boostLeft / 1000)}s</div>`;
        if (!training) return '';
        const wait = Math.max(0, (mg.nextOpportunityAt || now) - now);
        return `<div class="minigame-line" style="--minigame-accent:${conf.accent}">${conf.icon} ${conf.label} <span class="muted">· next chance in about ${duration(wait)}</span> ${aboutButton('minigames')}</div>`;
    }
    let body;
    if (ch) {
        const expires = Math.max(0, Math.ceil((ch.expiresAt - now) / 1000));
        if (ch.type === 'timing' || ch.type === 'moving-target') {
            body = `<div class="minigame-prompt">${ch.type === 'timing' ? 'Tap when the marker is inside the glowing zone.' : 'Fire when the prey crosses the kill zone.'} <span class="muted">(${expires}s)</span></div>
                <div class="minigame-timing-track"><div class="minigame-timing-zone" style="left:${ch.zoneStart * 100}%; width:${ch.zoneWidth * 100}%; background:${conf.accent}"></div>
                <div class="minigame-timing-marker" id="mg-marker-${skillId}" style="left:${animatedPosition(ch, now) * 100}%; background:${conf.accent}">${ch.type === 'moving-target' ? '🦊' : ''}</div></div>
                <div class="minigame-actions"><button class="minigame-action-btn" onclick="FI.resolveMinigame('${skillId}')">${ch.type === 'timing' ? 'Tap now' : 'Loose arrow'}</button><button class="minigame-secondary-btn" onclick="FI.failMinigame('${skillId}')">Skip</button></div>`;
        } else if (ch.type === 'heat') {
            body = `<div class="minigame-prompt">Tap the flame to keep the heat inside the band, then plate it. <span class="muted">(${expires}s)</span></div>
                <div class="minigame-heat-track"><div class="minigame-timing-zone" style="left:${ch.targetStart * 100}%; width:${ch.targetWidth * 100}%; background:${conf.accent}"></div><div class="minigame-heat-fill" id="mg-heat-${skillId}" style="width:${ch.heat * 100}%; background:${conf.accent}"></div></div>
                <div class="minigame-actions"><button class="minigame-action-btn" onclick="FI.pumpHeat('${skillId}')">🔥 Tap heat</button><button class="minigame-start-btn" onclick="FI.resolveMinigame('${skillId}')">Plate it</button></div>`;
        } else {
            body = `<div class="minigame-prompt">Drag the stabiliser into the glowing channel, then lock the brew. <span class="muted">(${expires}s)</span></div>
                <div class="minigame-drag-shell"><div class="minigame-drag-zone" style="left:${ch.targetStart * 100}%; width:${ch.targetWidth * 100}%; background:${conf.accent}"></div>
                <input type="range" min="0" max="1" step="0.01" value="${ch.dragValue.toFixed(2)}" class="minigame-drag-slider" oninput="FI.setDragValue('${skillId}', this.value)"></div>
                <div class="minigame-actions"><button class="minigame-action-btn" onclick="FI.resolveMinigame('${skillId}')">Stabilise</button><button class="minigame-secondary-btn" onclick="FI.failMinigame('${skillId}')">Vent</button></div>`;
        }
    } else {
        body = `<div class="minigame-prompt pulse">A chance appears! <span class="muted">(${Math.ceil((mg.opportunityUntil - now) / 1000)}s)</span></div>
            <button class="minigame-action-btn" onclick="FI.startMinigame('${skillId}')">${conf.actionText}</button>`;
    }
    return `<div class="minigame-panel" style="--minigame-accent:${conf.accent}">
        <div class="minigame-header">
            <div><div class="minigame-title">${conf.icon} ${conf.label} ${aboutButton('minigames')}</div><div class="minigame-desc">${conf.desc}</div></div>
            <div class="minigame-boost-pill ${boostLeft > 0 ? 'live' : ''}">${boostLeft > 0 ? `+${Math.round(mg.bonus * 100)}% speed · ${Math.ceil(boostLeft / 1000)}s` : `Win: +${Math.round(BALANCE.minigame.baseBonus * 100)}–${Math.round(BALANCE.minigame.maxBonus * 100)}% speed`}${mg.streak > 1 ? ` · streak ${mg.streak}` : ''}</div>
        </div>
        ${body}
    </div>`;
}

// ---------- smithing & crafting ----------

/** A recipe (smelting, forging, jewellery, a tool) as an action card. */
function recipeCard({ title, icon, color, inputs, note = '', have, haveIcon, xp, interval, active, stalled, onclick, disabled, reqText, luck = '', mastery = '', tip = '' }, state) {
    if (disabled) return actionCard({ locked: reqText, art: icon, title, color });
    return actionCard({
        id: `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, art: icon, title, color, note, inputs: needChips(state, Object.fromEntries(inputs)), time: interval,
        tip: tip || `+${xp} XP · ${seconds(interval)}`, active, stalled: active && stalled, onclick, have, haveIcon,
        stats: `<span>✨ ${xp} XP</span><span>⏱️ ${seconds(interval)}</span>${luck}`, mastery
    });
}

/** The steps of a workshop as a row of tabs: one step on screen at a time. */
function segments(views, current, handler, label) {
    return `<div class="seg" role="group" aria-label="${esc(label)}">${views.map(([id, text], i) =>
        `<button class="seg-btn${current === id ? ' on' : ''}" onclick="${handler}('${id}')" aria-pressed="${current === id}"><b>${i + 1}</b>${esc(text)}</button>`).join('')}</div>`;
}

export function renderSmithing(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'smithing');
    const action = state.action;
    const view = ['smelt', 'forge', 'tools'].includes(ui.smithView) ? ui.smithView : 'smelt';
    let body = '';
    if (view === 'smelt') {
        body = `<div class="node-grid">${withNext(SMELTING_RECIPES, r => r.levelReq, level).map(r => {
            const def = resolveAction(state, { kind: 'smelt', id: r.id });
            return recipeCard({
                title: r.name, icon: resIcon(r.produces, { scale: 1.5 }), color: res(r.produces).color, inputs: Object.entries(r.consumes),
                have: state.resources[r.produces], haveIcon: resIcon(r.produces),
                xp: Math.round(r.xp * d.xpMult), interval: intervalFor(def, d), luck: luckStats(d, def), mastery: masteryRow(state, 'smithing', def.mastery),
                active: action?.kind === 'smelt' && action.id === r.id, stalled: action?.stalled,
                onclick: `FI.smelt('${r.id}')`, disabled: level < r.levelReq, reqText: `Level ${r.levelReq}`
            }, state);
        }).join('')}</div>`;
    } else if (view === 'forge') {
        const metals = METALS.filter(m => level >= m.levelReq);
        // The metal on the anvil: the one picked, else the best there are bars for, else the best known.
        const metal = metals.find(m => m.bar === ui.smithMetal) || [...metals].reverse().find(m => state.resources[m.bar] > 0) || metals[metals.length - 1] || METALS[0];
        const recipes = SMITHING_TYPES.map(type => ({ type, recipe: resolveAction(state, { kind: 'smith', type, bar: metal.bar }) }));
        const cards = withNext(recipes, r => r.recipe.levelReq, level).sort((a, b) => a.recipe.levelReq - b.recipe.levelReq).map(({ type, recipe }) => recipeCard({
            title: `${metal.name} ${TYPE_NAMES[type]}`, icon: sprite(`item/${type}/${metal.tier}`, { scale: 1.5, fallback: TYPE_ICONS[type] }), color: res(metal.bar).color,
            inputs: Object.entries(recipe.consumes), xp: Math.round(recipe.xp * d.xpMult), interval: intervalFor(recipe, d), luck: luckStats(d, recipe),
            active: action?.kind === 'smith' && action.type === type && action.bar === metal.bar, stalled: action?.stalled,
            onclick: `FI.smith('${type}','${metal.bar}')`, disabled: level < recipe.levelReq, reqText: `Level ${recipe.levelReq}`
        }, state)).join('');
        const picker = metals.length > 1
            ? `<select class="material-select" aria-label="Metal" onchange="FI.selectSmithMetal(this.value)">${metals.map(m => `<option value="${m.bar}" ${m.bar === metal.bar ? 'selected' : ''}>${m.name}</option>`).join('')}</select>`
            : '';
        body = `<div class="forge-bar">${picker}<span class="tool-badge" title="${esc(res(metal.bar).name)}s to forge with">${resIcon(metal.bar)} ${fmt(state.resources[metal.bar])} ${esc(metal.name.toLowerCase())} bars</span>
                ${masteryRow(state, 'smithing', resolveAction(state, { kind: 'smith', type: SMITHING_TYPES[0], bar: metal.bar }).mastery, `${metal.name} forging`)}</div>
            <div class="node-grid">${cards}</div>`;
    } else {
        const tools = ['pickaxe', 'axe', 'tinderbox', 'hoe'].filter(id => isUnlocked(state, TOOLS[id].skill) || state.tools[id] > 0);
        body = `<div class="node-grid">${tools.map(toolId => renderToolCard(game, toolId)).join('')}</div>`;
    }
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, 'smithing')}
        ${segments([['smelt', 'Smelt'], ['forge', 'Forge'], ['tools', 'Tools']], view, 'FI.smithView', 'Smithing steps')}
        ${body}
    </section>`;
}

function renderToolCard(game, toolId) {
    const state = game.state;
    const d = game.derived;
    const tool = TOOLS[toolId];
    const owned = state.tools[toolId] || 0;
    const next = tool.tiers.find(t => t.tier === owned + 1);
    const icon = `<span class="nav-emoji" aria-hidden="true">${tool.icon}</span>`;
    if (!next) return `<div class="node-card locked"><div class="skill-action-art">${icon}</div><div class="node-name">${esc(tool.tiers[tool.tiers.length - 1].name)}</div><div class="muted small">The best there is</div></div>`;
    const level = skillLevel(state, tool.madeBy);
    return recipeCard({
        title: next.name, icon, color: '#facc15', inputs: Object.entries(next.consumes), note: toolEffect(toolId, next.tier),
        xp: Math.round(next.xp * d.xpMult), interval: actionInterval(4000, d, tool.madeBy),
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
    const bar = bars.find(b => b.bar === ui.craftBar) || bars[0] || JEWEL_BARS[0];
    const gem = gems.find(g => g.gem === ui.craftGem) || [...gems].reverse().find(g => state.resources[g.gem] > 0) || gems[gems.length - 1] || GEM_TIERS[0];
    const recipes = CRAFTING_TYPES.map(type => ({ type, recipe: resolveAction(state, { kind: 'craft', type, bar: bar.bar, gem: gem.gem }) }));
    const cards = withNext(recipes, r => r.recipe.levelReq, level).sort((a, b) => a.recipe.levelReq - b.recipe.levelReq).map(({ type, recipe }) => recipeCard({
        title: `${res(gem.gem).name} ${TYPE_NAMES[type]}`, icon: sprite(`item/${type}/${res(gem.gem).tier}`, { scale: 1.5, fallback: TYPE_ICONS[type] }), color: res(gem.gem).color,
        inputs: Object.entries(recipe.consumes), xp: Math.round(recipe.xp * d.xpMult), interval: intervalFor(recipe, d), luck: luckStats(d, recipe),
        active: action?.kind === 'craft' && action.type === type && action.bar === bar.bar && action.gem === gem.gem, stalled: action?.stalled,
        onclick: `FI.craft('${type}','${bar.bar}','${gem.gem}')`, disabled: level < recipe.levelReq, reqText: `Level ${recipe.levelReq}`
    }, state)).join('');
    const pick = (list, value, handler, label, text) => (list.length > 1
        ? `<select class="material-select" aria-label="${label}" onchange="${handler}(this.value)">${list.map(o => `<option value="${text(o).id}" ${text(o).id === value ? 'selected' : ''}>${esc(text(o).name)}</option>`).join('')}</select>`
        : '');
    const tools = ['bow', 'rod'].filter(id => isUnlocked(state, TOOLS[id].skill) || state.tools[id] > 0);
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, 'crafting')}
        <div class="forge-bar">
            ${pick(bars, bar.bar, 'FI.selectCraftBar', 'Setting', b => ({ id: b.bar, name: `${b.name} setting` }))}
            ${pick(gems, gem.gem, 'FI.selectCraftGem', 'Gem', g => ({ id: g.gem, name: res(g.gem).name }))}
            <span class="tool-badge">${resIcon(bar.bar)} ${fmt(state.resources[bar.bar])}</span><span class="tool-badge">${resIcon(gem.gem)} ${fmt(state.resources[gem.gem])}</span>
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
        : `<div class="res-actions"><span class="muted small">${sellValue(id)} 🪙 each</span><button class="mini-btn" onclick="FI.sellRes('${id}',1)">Sell 1</button><button class="mini-btn" onclick="FI.sellRes('${id}',10)">10</button><button class="mini-btn" onclick="FI.sellRes('${id}',1e9)">All</button></div>`;
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
    const afford = c => state.resources.essence >= c.essence && state.gold >= c.gold;
    const atk = Math.round((item.atk || 0) * mult);
    const def = Math.round((item.def || 0) * mult);
    const cost = itemUpgradeCost(game, item);
    // Upgrading and reforging cost essence: they show once the player has met essence.
    const essence = seen(state, 'essence');
    const upgradeBtn = !essence ? '' : up < MAX_UPGRADE
        ? `<button class="mini-btn" onclick="FI.upgrade(${itemId})" ${afford(cost) ? '' : 'disabled'} title="+5% base stats per level">⬆ Upgrade to +${up + 1}: ${cost.essence} ✨ ${fmt(cost.gold)} 🪙</button>`
        : '<span class="muted small">Fully upgraded</span>';
    const reforge = itemReforgeCost(game, item);
    const reforgeBtn = essence && item.affixes?.length && !item.uniqueId
        ? `<button class="mini-btn" onclick="FI.reforge(${itemId})" ${afford(reforge) ? '' : 'disabled'} title="Reroll this item's affixes (the cost rises with each reforge)">🔁 Reforge: ${reforge.essence} ✨ ${fmt(reforge.gold)} 🪙</button>`
        : '';
    const salvage = salvagePreview(item);
    const salvageText = [salvage.essence ? `${salvage.essence} essence` : '', ...Object.entries(salvage.materials).map(([mid, q]) => `~${q.toFixed(1)} ${RESOURCES[mid].name}`)].filter(Boolean).join(', ') || 'nothing';
    const source = item.source === 'drop' ? 'dropped' : item.source === 'unique' ? 'unique' : 'crafted';
    let compare = '';
    if (!slot) {
        const worn = (TYPE_SLOTS[item.type] || []).map(sl => state.equipped[sl]).sort((a, b) => itemScore(a) - itemScore(b))[0];
        const wornMult = worn ? 1 + UPGRADE_STEP * (worn.upgrade || 0) : 0;
        const delta = (value, icon) => value ? `<span class="${value > 0 ? 'up' : 'down'}">${icon} ${value > 0 ? '+' : '−'}${fmt(Math.abs(value))}</span>` : '';
        const deltas = delta(atk - Math.round((worn?.atk || 0) * wornMult), '⚔️') + delta(def - Math.round((worn?.def || 0) * wornMult), '🛡️');
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
        <div class="detail-stats">${atk ? `<span class="item-atk">⚔️ ${fmt(atk)} ATK</span>` : ''}${def ? `<span class="item-def">🛡️ ${fmt(def)} DEF</span>` : ''}${atk || def ? '' : '<span class="muted">No base stats</span>'}</div>
        ${item.affixes?.length ? `<ul class="detail-affixes">${item.affixes.map(a => `<li>${esc(describeAffix(a))}</li>`).join('')}</ul>` : ''}
        ${compare}
        ${wearable ? '' : `<div class="req">Needs combat level ${TIER_WEAR_LEVEL[item.tier]}</div>`}
        <div class="detail-actions">
            ${slot ? `<button class="mini-btn" onclick="FI.unequip('${slot}')">Take off</button>` : `<button class="prestige-btn" onclick="FI.equip(${itemId})" ${wearable ? '' : 'disabled'}>Equip</button>`}
            ${upgradeBtn}${reforgeBtn}
            ${slot ? '' : `<button class="mini-btn" onclick="FI.salvage(${itemId})" ${item.locked ? 'disabled' : ''} title="Salvage for ${esc(salvageText)}">♻️ Salvage</button><button class="sell-btn mini-btn" onclick="FI.sellItem(${itemId})" ${item.locked ? 'disabled' : ''}>💰 Sell for ${fmt(itemSellValue(item))}</button>`}
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
    const categories = ['ore', 'bar', 'gem', 'log', 'raw', 'food', 'herb', 'potion', 'material'].filter(c => owned.some(id => RESOURCES[id].category === c));
    const filters = owned.length > 12 && categories.length > 1;   // a handful of materials needs no sorting
    const filter = filters && categories.includes(ui.invFilter) ? ui.invFilter : 'all';
    const resources = owned.filter(id => filter === 'all' || RESOURCES[id].category === filter);
    const picked = ui.resSelected && state.resources[ui.resSelected] > 0 ? ui.resSelected : null;
    const auto = state.settings.autoSalvage || 'off';
    const hasCommons = items.some(i => i.rarity === 'common' && !i.locked);
    const doll = seen(state, 'jewellery') ? DOLL.jewelled : DOLL.plain;
    const stat = (icon, value, label, title) => `<span title="${title}">${icon} <b>${value}</b> ${label}</span>`;
    return `<div class="armory${hasGear ? '' : ' bare'}">
        <section class="glass-panel doll-panel">
            <div class="panel-header"><h2>Your hero</h2><span class="muted small">Combat level ${d.combatLevel}</span></div>
            <div class="doll">
                <div class="doll-col">${doll.left.map(sl => dollSlot(state, sl, selectedId)).join('')}</div>
                <div class="doll-figure">${heroSprite(state, { scale: 6 })}</div>
                <div class="doll-col">${doll.right.map(sl => dollSlot(state, sl, selectedId)).join('')}</div>
                <div class="doll-hands">${DOLL_HANDS.map(sl => dollSlot(state, sl, selectedId)).join('')}</div>
            </div>
            <div class="doll-stats">
                ${stat('⚔️', fmt(d.atk), 'attack', 'Attack: the damage of a hit, before the monster\'s defence')}
                ${stat('🛡️', fmt(d.def), 'defence', 'Defence: taken off every hit you receive')}
                ${stat('❤️', fmt(d.maxHp), 'health', 'Health')}
            </div>
            <div class="doll-stats minor">
                <span title="Critical hits: how often, and how much harder they hit">🎯 ${pct(d.critChance, 1)} crit × ${d.critDmg.toFixed(2)}</span>
                <span title="Time between your attacks">⚡ ${seconds(d.attackInterval)}</span>
                ${d.dodge > 0 ? `<span title="Chance to dodge a hit">💨 ${pct(d.dodge, 1)}</span>` : ''}
                <span title="How long your hero keeps going while you are away">🌙 ${Math.round(d.offlineMs / 3600000)}h away</span>
            </div>
        </section>
        ${hasGear ? `<section class="glass-panel detail-panel${shownId !== null ? ' has-item' : ''}" id="item-detail" aria-live="polite">${renderItemDetail(game, shownId)}</section>` : ''}
        <section class="glass-panel bag-panel">
            <div class="panel-header"><h2>Bag <span class="muted">${items.length}/${size}</span></h2>
                ${seen(state, 'bag_tools') ? `<div class="btn-row">
                    <button class="mini-btn" onclick="FI.salvageAll('common')" ${hasCommons ? '' : 'disabled'}>♻️ Salvage commons</button>
                    <button class="mini-btn" onclick="FI.sellAll('common')" ${hasCommons ? '' : 'disabled'}>💰 Sell commons</button>
                </div>` : ''}
            </div>
            <div class="bag-grid">${bag}</div>
            ${items.length ? '' : '<p class="muted small bag-hint">No spare gear yet. Bosses drop some, and a smith can forge it.</p>'}
            ${seen(state, 'auto_salvage') ? `<label class="muted small auto-salvage" title="Dropped gear up to this quality is salvaged for essence as it lands: never an upgrade, never a locked item. When the bag is full the weakest item is salvaged. So far ${state.stats.itemsDropped} items dropped, ${state.stats.itemsSalvaged} salvaged (${state.stats.itemsAutoSalvaged} automatically).">Auto-salvage drops up to
                <select class="material-select" onchange="FI.setAutoSalvage(this.value)">${AUTO_SALVAGE_OPTIONS.map(o => `<option value="${o}" ${o === auto ? 'selected' : ''}>${o === 'off' ? 'off' : RARITIES.find(r => r.id === o).name}</option>`).join('')}</select>
            </label>` : ''}
        </section>
    </div>
    <section class="glass-panel">
        <div class="panel-header"><h2>Materials</h2>
            ${filters ? `<div class="filter-row">${['all', ...categories].map(c => `<button class="mini-btn ${filter === c ? 'active' : ''}" onclick="FI.invFilter('${c}')">${c}</button>`).join('')}</div>` : ''}
        </div>
        ${resources.length ? `<div class="bank-grid">${resources.map(id => bankTile(id, state, picked)).join('')}</div>
        ${picked ? bankDetail(picked, state) : '<p class="muted small bank-hint">Tap a material to see it and sell it.</p>'}`
        : '<div class="empty-state">Nothing here yet. What you mine, cut, hunt and win in fights lands here.</div>'}
    </section>`;
}

// ---------- shop ----------

export function renderShop(game, ui) {
    const state = game.state;
    const d = game.derived;
    const perks = PERKS.map(p => {
        const level = state.perks[p.id] || 0;
        const can = state.prestige.skillPoints > 0 && level < p.max;
        return `<div class="shop-item">
            <div class="shop-art"><span class="nav-emoji" aria-hidden="true">${p.icon}</span>${level ? `<b class="camp-lv">${level}</b>` : ''}</div>
            <div class="shop-item-info"><span class="shop-item-name">${esc(p.name)} <span class="muted small">${level}/${p.max}</span></span><span class="shop-item-desc">${esc(p.desc)}</span></div>
            <button class="shop-btn" onclick="FI.buyPerk('${p.id}')" ${can ? '' : 'disabled'}>${level >= p.max ? 'Max' : '1 SP'}</button>
        </div>`;
    }).join('');
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
    <section class="glass-panel">
        <div class="panel-header"><h2>Supplies</h2></div>
        <div class="shop-grid">${goods}</div>
    </section>
    <div class="two-col">
        <section class="glass-panel prestige-panel" style="${artStyle('prestige')}">
            <div class="panel-header"><h2>Prestige ${aboutButton('prestige')}</h2><span class="muted small">${state.prestige.count} so far</span></div>
            <div class="prestige-stats">
                <div><b>${fmt(state.prestige.tokens)}</b><span>tokens held: +${d.tokenPowerPct}% attack and defence</span></div>
                <div><b>${state.prestige.skillPoints}</b><span>skill points to spend</span></div>
                <div><b>+${preview.tokens}</b><span>tokens for this run (best stage ${state.combat.maxStage})</span></div>
                <div><b>${preview.startStage}</b><span>is the stage the next run starts at</span></div>
            </div>
            <button class="prestige-btn arcane" onclick="FI.openPrestige()" ${preview.allowed ? '' : 'disabled'}>${preview.allowed ? `Prestige for +${preview.tokens} tokens, +${preview.skillPoints} SP` : state.combat.maxStage < BALANCE.prestige.minStage ? `Reach stage ${BALANCE.prestige.minStage} to prestige` : `Ready to prestige in ${duration(preview.waitMs)}`}</button>
        </section>
        <section class="glass-panel">
            <div class="panel-header"><h2>Perks</h2><span class="muted small" title="+1 skill point per prestige, +1 per 25 stages of your record">${state.prestige.skillPoints} SP to spend</span></div>
            <div class="shop-list">${perks}</div>
        </section>
    </div>`;
}

// ---------- achievements ----------

// What each achievement's medal shows: a sprite key (or an emoji) for its kind of deed.
const MEDAL_ART = {
    kills: 'item/Weapon/3', goldEarned: 'gold', itemsCrafted: 'item/Body/4', petsFound: 'pet/fang', uniquesFound: 'uniq/goblin_crown',
    titanKills: 'titan/0', dungeonClears: 'mon/Goblin King', legendariesEquipped: 'item/Neck/7',
    prestiges: '🔮', obstaclesBuilt: '🧱', minigameWins: '🎯', masteryLevels: '⭐', masteries99: '🌟', skills99: '👑'
};
const SKILL_MEDAL = {
    mining: 'res/runite_ore', woodcutting: 'res/magic_log', hunting: 'res/raw_dragon', fishing: 'res/raw_shark', firemaking: '🔥',
    farming: 'res/starfruit', agility: 'item/Boots/5', cooking: 'res/cooked_shark', alchemy: 'res/health_potion',
    smithing: 'res/runite_bar', crafting: 'item/Ring/6', combat: 'item/Weapon/7'
};

function medalArt(a) {
    let key = a.req.type === 'skillLevel' ? SKILL_MEDAL[a.req.skill] : MEDAL_ART[a.req.key];
    if (a.req.key === 'maxStage') key = `mon/${ZONES[Math.min(ZONES.length - 1, Math.floor((a.req.value - 2) / STAGES_PER_ZONE))]?.boss}`;
    if (!key) return '🏆';
    return key.includes('/') || key === 'gold' ? sprite(key, { scale: 1.5, fallback: '🏆' }) : `<span class="medal-emoji">${key}</span>`;
}

export function renderAchievements(game) {
    const state = game.state;
    const done = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
    const medals = ACHIEVEMENTS.map(a => {
        const won = !!state.achievements[a.id];
        const { have, need } = achievementProgress(state, a.req);
        const pct = Math.min(100, (have / Math.max(1, need)) * 100);
        return `<div class="medal${won ? ' won' : ''}" title="${esc(a.desc)}: ${esc(a.reward)}">
            <div class="medal-disc">${medalArt(a)}</div>
            <div class="medal-name">${esc(a.name)}</div>
            <div class="medal-desc">${esc(a.desc)}</div>
            ${won ? `<div class="medal-reward">${esc(a.reward)}</div>`
                : `<div class="medal-bar"><i style="--p:${pct.toFixed(1)}%"></i></div><div class="medal-count">${fmt(Math.min(have, need))} / ${fmt(need)}</div>`}
        </div>`;
    }).join('');
    return `${banner('achievements', { extra: `<span class="banner-count" title="Each medal also gives +${Math.round(ACHIEVEMENT_GLOBAL_BONUS * 100)}% attack, defence and skill speed: +${done}% so far"><b>${done}</b> / ${ACHIEVEMENTS.length}</span>` })}
    <section class="glass-panel">
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
    const milestones = EVENT_MILESTONES.map(m => {
        const done = sameInstance && ev.milestones.includes(m.tokens);
        return `<div class="ach-item ${done ? 'done' : ''}"><div><div class="ach-name">${done ? '✅' : '🎯'} ${m.tokens} tokens this event</div></div><div class="ach-reward">${esc(m.desc)}</div></div>`;
    }).join('');
    const shop = EVENT_SHOP.map(item => `<div class="event-shop-item"><div><b>${esc(item.name)}</b><div class="muted small">${esc(item.desc)}</div></div>
        <button class="gold-btn" onclick="FI.buyEventItem('${item.id}')" ${status.active && ev.tokens >= item.cost ? '' : 'disabled'}>🎟️ ${item.cost}</button></div>`).join('');
    const rotation = EVENTS.map(x => `<span class="${x.id === e.id ? 'b' : 'muted'}">${x.icon} ${esc(x.name)}</span>`).join(' → ');
    return `${banner('events', { title: `${e.icon} ${esc(e.name)}`, sub: status.active ? `Running now: ends in ${duration(status.endsAt - game.now)}` : `The next event: starts in ${duration(status.startsAt - game.now)}`,
        extra: `<div class="chip tokens" title="Festival tokens${status.active ? `: ${today} of ${EVENT_DAILY_CAP} earned today` : ''}"><span>Tokens</span><b>${fmt(ev.tokens)}</b></div>` })}
    <section class="glass-panel event-panel" style="--accent:${e.color}">
        <p>${esc(e.desc)}</p>
        <p class="muted small event-rotation">${rotation}</p>
    </section>
    <div class="two-col">
        <section class="glass-panel"><div class="panel-header"><h2>Milestones</h2><span class="muted small">${earned} earned this event</span></div><div class="ach-list">${milestones}</div></section>
        <section class="glass-panel"><div class="panel-header"><h2>Event shop</h2><span class="muted small">${status.active ? 'Open' : 'Opens with the next event'}</span></div><div class="event-shop">${shop}</div></section>
    </div>`;
}

// ---------- farming ----------

export function renderFarming(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'farming');
    const ready = state.farming.plots.filter(p => plotReady(p, game.now)).length;
    const choices = CROPS.filter(c => c.levelReq <= level);
    const lastCrop = ui.lastCrop && cropById(ui.lastCrop) && cropById(ui.lastCrop).levelReq <= level ? ui.lastCrop : choices[choices.length - 1]?.id;
    const plots = state.farming.plots.map((plot, i) => {
        if (!plotUnlocked(state, i)) {
            if (i > 0 && !plotUnlocked(state, i - 1)) return ''; // only the next plot to earn
            return `<div class="plot-card locked"><div class="plot-art">${sprite('farm/soil', { scale: 1.5, cls: 'silhouette', fallback: '🟫' })}</div><div class="node-name">Plot ${i + 1}</div><div class="req">Level ${FARMING_PLOTS[i]}</div></div>`;
        }
        if (!plot.crop) {
            return `<div class="plot-card empty"><div class="plot-art">${sprite('farm/soil', { scale: 1.5, fallback: '🟫' })}</div><div class="node-name">Plot ${i + 1} — empty</div>
                <label class="small">Plant <select class="material-select" id="plot-crop-${i}" aria-label="Crop for plot ${i + 1}">
                    ${choices.map(c => `<option value="${c.id}" ${c.id === lastCrop ? 'selected' : ''}>${c.icon} ${esc(c.name)} — ${fmt(seedCost(state, c))} gold</option>`).join('')}
                </select></label>
                <button class="prestige-btn" onclick="FI.plant(${i}, document.getElementById('plot-crop-${i}').value)">Plant</button></div>`;
        }
        const crop = cropById(plot.crop);
        const total = Math.max(1, plot.readyAt - plot.plantedAt);
        const done = plotReady(plot, game.now);
        const pctDone = done ? 100 : Math.min(100, (game.now - plot.plantedAt) / total * 100);
        return `<div class="plot-card ${done ? 'ready' : 'growing'}"><div class="plot-art">${done ? resIcon(crop.produces, { scale: 1.5 }) : sprite(pctDone < 50 ? 'farm/sprout' : 'farm/growing', { scale: 1.5, fallback: '🌱' })}</div>
            <div class="node-name">Plot ${i + 1} — ${esc(crop.name)}</div>
            <div class="muted small">${done ? 'Ready to harvest' : `Ready in ${duration(plot.readyAt - game.now)}`}</div>
            <div class="action-progress-container"><div class="action-progress-fill" style="width:${pctDone}%; background:${SKILLS.farming.color}"></div></div>
            ${done ? `<button class="prestige-btn" onclick="FI.harvest(${i})">Harvest</button>` : ''}</div>`;
    }).join('');
    const rows = CROPS.map(c => {
        const unlocked = level >= c.levelReq;
        const avg = (c.yield[0] + c.yield[1]) / 2 * d.farmYield;
        return `<tr class="${unlocked ? '' : 'locked-row'}"><td>${resIcon(c.produces)} ${esc(c.name)}</td><td>${c.levelReq}</td><td>${duration(growTime(d, c))}</td>
            <td>${c.yield[0]}–${c.yield[1]}× ${esc(res(c.produces).name)}</td><td>${fmt(Math.round(c.xp * avg * d.xpMult))}</td><td>${fmt(seedCost(state, c))}</td></tr>`;
    }).join('');
    return `${banner('farming')}
    <section class="glass-panel skill-panel">
        ${xpHeader(game, 'farming', toolBadge(game, 'farming'), { title: false })}
        ${ready ? `<div class="btn-row"><button class="prestige-btn" onclick="FI.harvestAll()">Harvest ${ready} and replant</button></div>` : ''}
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

export function renderAgility(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'agility');
    const course = courseDef(state);
    const running = state.action?.kind === 'agility';
    const interval = course ? actionInterval(course.interval, d, 'agility') : 0;
    const slots = AGILITY_SLOTS.map((slot, i) => {
        const built = state.agility.built[i];
        const open = level >= slot.levelReq;
        if (!open && i > 0 && level < AGILITY_SLOTS[i - 1].levelReq) return ''; // only the next slot to earn
        const cost = obstacleCost(state, i);
        const haveMaterials = Object.entries(cost.materials).every(([id, q]) => (state.resources[id] || 0) >= q);
        const affordable = state.gold >= cost.gold && haveMaterials;
        const lvl = obstacleLevel(state, i);
        const up = upgradeInfo(state, i);
        const options = slot.obstacles.map(o => {
            const here = built === o.id;
            const upBtn = here && up
                ? `<button class="mini-btn" onclick="FI.upgradeObstacle(${i})" ${level >= up.levelReq && state.gold >= up.gold ? '' : 'disabled'} title="${level >= up.levelReq ? `Level ${up.toLevel}: ${fmt(up.gold)} gold` : `Needs Agility ${up.levelReq}`}">⬆ Lv ${up.toLevel}: ${fmt(up.gold)}${level >= up.levelReq ? '' : ` (Agility ${up.levelReq})`}</button>`
                : '';
            return `<div class="obstacle ${here ? 'built' : ''}">
                <div><b>${o.icon} ${esc(o.name)}${here ? ` <span class="muted">Lv ${lvl}/${MAX_OBSTACLE_LEVEL}</span>` : ''}</b><div class="small">${esc(o.desc)}${here && lvl > 1 ? ` ×${lvl}` : ''}</div><div class="muted small">${seconds(o.interval)} · ${here ? Math.round(o.xp * (1 + 0.25 * (lvl - 1))) : o.xp} XP per run</div></div>
                ${here ? (upBtn || '<span class="status-pill working">Max</span>') : `<button class="mini-btn" onclick="FI.buildObstacle('${o.id}')" ${open && affordable ? '' : 'disabled'}>${built ? 'Replace' : 'Build'}</button>`}
            </div>`;
        }).join('');
        return `<div class="agility-slot ${open ? '' : 'locked'}">
            <div class="slot-head"><b>Obstacle ${i + 1}</b> <span class="muted small">${open ? `cost: ${fmt(cost.gold)} gold + ${Object.entries(cost.materials).map(([id, q]) => `<span class="${(state.resources[id] || 0) >= q ? 'ok' : 'missing'}">${q}× ${esc(res(id).name)}</span>`).join(', ')}` : `opens at Agility ${slot.levelReq}`}</span></div>
            ${options}
        </div>`;
    }).join('');
    const builtList = state.agility.built.filter(Boolean).map(id => obstacleById(id));
    return `${banner('agility')}
    <section class="glass-panel skill-panel">
        ${xpHeader(game, 'agility', '', { title: false })}
        ${builtList.length ? `<div class="info-strip">${builtList.map(o => `${o.icon} ${esc(o.desc)}`).join(' · ')}</div>` : ''}
        <div class="course-run ${running ? 'active' : ''}">
            <div><b>${course ? esc(course.label) : 'No course yet'}</b>${course ? `<div class="muted small">${seconds(interval)} per run · ${fmt(Math.round(course.xp * d.xpMult))} XP</div>` : ''}</div>
            ${course ? `<button class="prestige-btn" onclick="FI.runCourse()">${running ? 'Stop' : 'Run the course'}</button>` : ''}
            ${running ? `<div class="action-progress-container"><div class="action-progress-fill" id="progress-agility-course" style="width:${Math.min(100, state.action.progress / interval * 100)}%; background:${SKILLS.agility.color}"></div></div>` : ''}
        </div>
        <div class="agility-grid">${slots}</div>
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
                : titanReady(state, game.now) ? `<button class="prestige-btn" onclick="FI.challengeTitan()">🗿 Challenge (${TITAN_TIME_MS / 1000} s)</button>`
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
        const preview = dungeonPreview(game.derived, d);
        const limit = DUNGEON_BOSS_TIME_MS / 1000;
        const fight = preview.bossFight;
        const ready = readinessClass(fight.killSeconds, limit, fight.surviveSeconds);
        const verdict = ready === 'ready-good' ? `You are ready: the boss falls in ~${fmtSeconds(fight.killSeconds)}`
            : ready === 'ready-close' ? `It will be close: the boss takes ~${fmtSeconds(fight.killSeconds)} of your ${limit} s`
            : fight.surviveSeconds < limit ? `Too strong for now: you would last ~${fmtSeconds(fight.surviveSeconds)}`
            : `Too tough for now: the boss needs ~${fmtSeconds(fight.killSeconds)}, and you have ${limit} s`;
        return `<div class="dungeon-card ${open ? '' : 'locked'} ${here ? 'active' : ''}">
            <div class="dungeon-head"><span class="dungeon-icon">${sprite(`mon/${d.boss.name}`, { scale: 1.5, cls: open ? '' : 'silhouette', fallback: d.icon })}</span>
                <div><b>${esc(d.name)}</b><div class="muted small" title="Like stages ${d.stage}–${d.stage + d.monsters.length}; the chest holds tier ${d.chestTier} loot">${d.monsters.length} elites, then the ${esc(d.boss.name)}</div></div></div>
            ${open ? `<div class="small ${ready}" title="An estimate without food, regeneration, lifesteal or combo">${verdict}</div>
                <div class="frag-row" title="${record.fragments} of ${FRAGMENTS_PER_UNIQUE} fragments of ${esc(unique.name)}">${sprite(`uniq/${unique.id}`, { scale: 1, cls: ownsUnique(state, d.unique) ? '' : 'silhouette', fallback: '🌟' })}
                    <div class="frag-bar"><i style="--p:${Math.min(100, record.fragments / FRAGMENTS_PER_UNIQUE * 100).toFixed(1)}%"></i></div><span class="small">${record.fragments}/${FRAGMENTS_PER_UNIQUE}</span></div>
                <div class="muted small">${record.clears} clear${record.clears === 1 ? '' : 's'}${next ? ` · at ${next.clears}: ${next.desc}` : ' · every bonus earned'}${done.length ? ` · earned: ${done.join('; ')}` : ''}</div>
                <div class="btn-row">
                    ${here ? '<button class="mini-btn danger" onclick="FI.toggleCombat()">Abandon run</button>' : `<button class="prestige-btn" onclick="FI.enterDungeon('${d.id}')">Enter</button>`}
                    ${record.fragments >= FRAGMENTS_PER_UNIQUE ? `<button class="mini-btn" onclick="FI.assembleUnique('${d.id}')" ${ownsUnique(state, d.unique) ? 'title="You already own one: a spare comes unlocked, to salvage for essence"' : ''}>${ownsUnique(state, d.unique) ? 'Assemble a spare' : `Assemble the ${esc(unique.name)}`}</button>` : ''}
                </div>`
                : `<div class="req">Opens at stage ${d.unlockStage}</div>`}
        </div>`;
    }).join('');
    return `${banner('dungeons', { extra: `<label class="toggle"><input type="checkbox" onchange="FI.setDungeonRepeat(this.checked)" ${c.autoRepeat ? 'checked' : ''}> Repeat after each clear</label>` })}
    <section class="glass-panel">
        <div class="dungeon-grid">${cards}</div>
    </section>
    <section class="glass-panel titan-panel" style="${artStyle('titan')}">
        <div class="panel-header"><h2>The Titan ${aboutButton('titan')}</h2></div>
        ${titanCard}
    </section>`;
}

function renderCollection(game) {
    const state = game.state;
    const pets = PETS.map(p => {
        const found = !!state.pets[p.id];
        const level = Math.max(1, skillLevel(state, p.skill));
        const hours = Math.round(PET_BASE / level / 3600);
        const hint = `~${fmt(hours)} h of ${p.skill} at level ${level} on average; the chance grows with your level (~${Math.round(PET_BASE / 99 / 3600)} h at 99)`;
        return `<div class="pet-card ${found ? 'found' : ''}" title="${found ? esc(p.desc) : esc(hint)}">
            <span class="pet-icon">${sprite(`pet/${p.id}`, { scale: 1.5, cls: found ? '' : 'silhouette', fallback: found ? p.icon : '❔' })}</span><div><b>${found ? esc(p.name) : 'Unknown pet'}</b><div class="muted small">${esc(p.skill)} · ${found ? esc(p.desc) : `~${fmt(hours)} h at Lv ${level}`}</div></div></div>`;
    }).join('');
    const uniques = DUNGEONS.map(d => {
        const u = UNIQUES[d.unique];
        const owned = [...state.inventory, ...Object.values(state.equipped)].some(i => i && i.uniqueId === u.id);
        return `<div class="pet-card ${owned ? 'found' : ''}"><span class="pet-icon">${sprite(`uniq/${u.id}`, { scale: 1.5, cls: owned ? '' : 'silhouette', fallback: owned ? '🌟' : '❔' })}</span><div><b style="color:#f97316">${esc(u.name)}</b><div class="muted small">${d.name} · ${state.dungeons[d.id].fragments}/${FRAGMENTS_PER_UNIQUE} fragments${owned ? ' · owned' : ''}</div></div></div>`;
    }).join('');
    return `<section class="glass-panel">
        <div class="panel-header"><h2>Pets</h2><span class="muted small">${PETS.filter(p => state.pets[p.id]).length}/${PETS.length} · rare finds while training, kept forever</span></div>
        <div class="pet-grid">${pets}</div>
    </section>
    <section class="glass-panel">
        <div class="panel-header"><h2>Unique items</h2><span class="muted small">Assembled from dungeon fragments, or found in a chest</span></div>
        <div class="pet-grid">${uniques}</div>
    </section>`;
}

// ---------- settings / clan ----------

export function renderSettings(game, ui, cloud) {
    const state = game.state;
    const played = duration(state.meta.playtimeMs);
    return `<div class="two-col">
        <section class="glass-panel">
            <div class="panel-header"><h2>Cloud save</h2><span class="muted small">${cloud?.loggedIn ? `Signed in as ${esc(cloud.username || '')}` : 'Guest (local only)'}</span></div>
            <p class="muted small">${cloud?.loggedIn ? 'Your save is uploaded every minute and on important events. Another device loads whichever save has more play time.' : 'Sign in to keep your save in the cloud and play from any device. Your local save is kept either way.'}</p>
            ${cloud?.loggedIn ? `<div class="btn-row"><button class="mini-btn" onclick="FI.cloudSaveNow()">Save to cloud now</button><button class="mini-btn danger" onclick="FI.logout()">Log out</button></div>` : `<div class="btn-row"><button class="prestige-btn" onclick="FI.openAuth()">Log in / register</button></div>`}
            <div class="muted small" id="cloud-status">${esc(ui.cloudStatus || '')}</div>
        </section>
        <section class="glass-panel">
            <div class="panel-header"><h2>Save file</h2><span class="muted small">Played ${played}</span></div>
            <div class="btn-row"><button class="mini-btn" onclick="FI.exportSave()">Copy export string</button><button class="mini-btn" onclick="FI.importSavePrompt()">Import string</button></div>
            <textarea id="save-io" class="save-io" placeholder="Paste a save string here, then press Import." rows="3" oninput="FI.setSaveIo(this.value)">${esc(ui.saveIo || '')}</textarea>
            <div class="btn-row"><button class="mini-btn danger" onclick="FI.hardReset()">Hard reset (wipe save)</button></div>
            ${renderBackups()}
        </section>
    </div>
    <section class="glass-panel">
        <div class="panel-header"><h2>Options</h2></div>
        <label class="toggle"><input type="checkbox" onchange="FI.setSetting('sound', this.checked)" ${state.settings.sound !== false ? 'checked' : ''}> Sound and vibration</label>
        <label class="toggle"><input type="checkbox" onchange="FI.setSetting('reducedMotion', this.checked)" ${state.settings.reducedMotion ? 'checked' : ''}> Reduce motion</label>
        <label class="toggle"><input type="checkbox" onchange="FI.setSetting('devUnlockAll', this.checked)" ${state.settings.devUnlockAll ? 'checked' : ''}> Developer mode: unlock every tab and mini-game</label>
        <p class="muted small">Version ${state.version} save · ${state.stats.kills} kills · ${state.stats.deaths} deaths · ${state.stats.itemsCrafted} items made · ${state.stats.prestiges} prestiges.</p>
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
        return banner('clan', { extra: `<button class="prestige-btn" onclick="FI.openAuth()">Sign in to join a clan</button>` });
    }
    if (cloud.available === false) {
        return `${banner('clan')}<section class="glass-panel"><p class="warn">The clan server isn't reachable from here — clans need the game's API (the Vercel deployment).</p></section>`;
    }
    const status = social.error ? `<p class="warn small">${esc(social.error)}</p>` : social.loading && !social.loaded ? '<p class="muted small">Loading…</p>' : '';
    const rewards = (social.rewards || []).length
        ? `<div class="info-strip lit">🎁 ${social.rewards.length} clan reward${social.rewards.length > 1 ? 's' : ''} waiting: ${social.rewards.map(r => esc(r.text || r.kind)).join(' · ')}
            <div class="btn-row"><button class="prestige-btn" onclick="FI.claimRewards()">Claim</button></div></div>`
        : '';
    const discord = DISCORD_INVITE ? `<a class="mini-btn" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener">💬 Clan chat on Discord</a>` : '';
    let body = '';
    if (!social.clan) {
        const rows = (social.clans || []).map(c => `<tr><td class="wrap"><b>${esc(c.name)}</b> <span class="muted">[${esc(c.tag)}]</span><div class="muted small">${esc(c.description || '')}${c.lookingFor ? ` · looking for: ${esc(c.lookingFor)}` : ''}</div></td>
            <td>${Number(c.members)}/${Number(social.maxMembers || 20)}</td><td><button class="mini-btn" onclick="FI.joinClan(${Number(c.id)})" ${c.members >= (social.maxMembers || 20) ? 'disabled' : ''}>Join</button></td></tr>`).join('');
        body = `<div class="two-col">
            <section class="glass-panel"><div class="panel-header"><h2>Find a clan</h2></div>
                <div class="btn-row"><input id="clan-search" class="text-input" placeholder="Name or tag" value="${esc(form.search)}" oninput="FI.clanForm('search', this.value)" onkeydown="if (event.key === 'Enter') FI.searchClans()" aria-label="Search clans">
                <button class="mini-btn" onclick="FI.searchClans()">Search</button></div>
                ${rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Clan</th><th>Members</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted small">No clans found — start one.</p>'}
            </section>
            <section class="glass-panel"><div class="panel-header"><h2>Start a clan</h2></div>
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
        const members = (social.members || []).map(m => `<tr class="${m.you ? 'you-row' : ''}"><td>${m.owner ? '👑 ' : ''}${esc(m.username)}${canKick && !m.you ? ` <button class="mini-btn danger" data-username="${esc(m.username)}" onclick="FI.kickMember(this.dataset.username)" aria-label="Remove ${esc(m.username)} from the clan">Remove</button>` : ''}</td><td>${fmt(Number(m.bestStage) || 0)}</td><td>${fmt(Number(m.totalLevel) || 0)}</td><td>${fmt(Number(m.attackDamage) || 0)}</td></tr>`).join('');
        body = `<section class="glass-panel">
            <div class="panel-header"><div><h2>🛡️ ${esc(c.name)} <span class="muted">[${esc(c.tag)}]</span></h2><div class="muted small">${esc(c.description || '')}${c.lookingFor ? ` · looking for: ${esc(c.lookingFor)}` : ''}</div></div>
                <div class="btn-row">${discord}<button class="mini-btn danger" onclick="FI.leaveClan()">Leave clan</button></div></div>
            ${boss ? `<div class="clan-boss">
                <div><b>🐉 This week's boss</b> <span class="muted small">(${esc(boss.week)} · ${boss.killed ? `defeated${boss.lastHit ? ` — last hit by ${esc(boss.lastHit)}` : ''}` : `ends in ${duration(boss.endsInMs)}`})</span></div>
                <div class="combat-bar"><div class="combat-fill enemy-fill" style="width:${pct}%"></div></div>
                <div class="small">${fmt(boss.hp)} / ${fmt(boss.maxHp)} HP</div>
                <div class="btn-row"><button class="prestige-btn" onclick="FI.clanAttack()" ${social.attacksLeft > 0 && !boss.killed && !social.attacking ? '' : 'disabled'}>⚔️ Attack (${social.attacksLeft}/${social.attacksPerDay} left today)</button>
                    <span class="muted small">Your hero hits for about ${fmt((social.members || []).find(m => m.you)?.attackDamage || 0)} per attack.</span></div>
            </div>` : ''}
            <div class="two-col">
                <div><h3 class="section-title">This week's damage</h3>${board ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Member</th><th>Damage</th><th>Attacks</th></tr></thead><tbody>${board}</tbody></table></div>` : '<p class="muted small">No attacks yet this week.</p>'}</div>
                <div><h3 class="section-title">Members (${(social.members || []).length}/${social.maxMembers || 20})</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Member</th><th>Best stage</th><th>Total level</th><th>Per attack</th></tr></thead><tbody>${members}</tbody></table></div></div>
            </div>
        </section>`;
    }
    return `${banner('clan', { extra: `<button class="mini-btn" onclick="FI.refreshSocial()">↻ Refresh</button>` })}
        ${status || rewards ? `<section class="glass-panel">${status}${rewards}</section>` : ''}
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
    return `<section class="glass-panel">
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
    return `<div class="modal-content">
        <div class="modal-header">✨ Prestige</div>
        <div class="modal-body">
            <div class="prestige-box"><h4>You keep</h4><span>All skills and levels · all equipment, upgrades and tools · all materials, essence and potions · achievements, perks and tokens · pets, uniques, dungeon clears, Titans · the agility course and farm</span></div>
            <div class="prestige-box"><h4>You lose</h4><span>Stage progress (restart at stage ${p.startStage}) · ${fmt(state.gold)} gold · camp upgrades (${Object.values(state.camp).reduce((a, b) => a + b, 0)} levels)</span>
                ${state.gold > 0 ? `<div class="muted small">Gold is run currency: spend it first — agility obstacles and upgrades, seeds, gear upgrades, or an Essence Cache in the Shop.</div>` : ''}</div>
            <div class="prestige-box highlight"><h4>You gain</h4><span class="prestige-reward">+${p.tokens} tokens</span> <span class="muted">(→ ${fmt(p.tokensAfter)} total, +${Math.round(p.tokensAfter * 0.5)}% ATK/DEF)</span><br><span class="sp-text">+${p.skillPoints} skill points</span>
                ${p.fullRun ? '' : `<div class="muted small">No skill point for this run: it takes a run that reaches half your best stage (${Math.ceil(BALANCE.prestige.fullRunFraction * state.combat.bestStage)}).</div>`}</div>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.closeModal()">Cancel</button><button class="modal-btn btn-confirm" onclick="FI.confirmPrestige()">Prestige now</button></div>
    </div>`;
}

/** An in-page yes/no; confirm() is blocked when the game runs inside another page. */
export function renderConfirmModal(title, text, confirmLabel) {
    return `<div class="modal-content">
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
export function renderWelcomeBack(summary, state) {
    const mins = Math.floor(summary.simulated / 60000);
    const away = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    const story = summary.mode === 'rest' ? 'Your hero rested at camp. Start a skill or enter combat before you leave to keep progressing.'
        : summary.mode === 'skill' ? (summary.stalledReason ? `Work stopped early: ${esc(summary.stalledReason)}.` : 'Your hero kept working the whole time.')
        : `${fmt(summary.kills)} monsters defeated${summary.stages > 0 ? `, ${fmt(summary.stages)} stages gained` : ''}${summary.died ? (summary.startedInDungeon ? ', then a dungeon run failed' : ', then your hero fell and retreated') : ''}.`;
    let i = 0;
    const next = () => i++;
    const skills = Object.entries(summary.skills).map(([id, s]) => {
        const lp = levelProgress(state.skills[id]?.xp || 0);
        const up = s.to > s.from;
        return `<div class="wb-skill${up ? ' up' : ''}" style="--i:${next()};--c:${SKILLS[id]?.color || '#d6aa5c'}">
            <span class="wb-skill-icon" aria-hidden="true">${SKILLS[id]?.icon || '✨'}</span>
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
        ...(summary.petIds || []).map(id => { const p = PETS.find(x => x.id === id); return `<div class="wb-find pet" style="--i:${next()}">${sprite(`pet/${id}`, { scale: 1.5, fallback: p?.icon || '🐾' })}<span>A pet found you: <b>${esc(p?.name || id)}</b></span></div>`; }),
        summary.uniques > 0 ? `<div class="wb-find unique" style="--i:${next()}"><span class="wb-find-icon">🌟</span><span><b>${summary.uniques}</b> unique item${summary.uniques > 1 ? 's' : ''} found</span></div>` : '',
        summary.items > 0 ? `<div class="wb-find" style="--i:${next()}"><span class="wb-find-icon">🎒</span><span><b>${summary.items}</b> ${summary.items > 1 ? 'items' : 'item'} ${summary.mode === 'combat' ? 'found' : 'made'}${summary.salvaged > 0 ? ` (${summary.salvaged} more salvaged)` : ''}</span></div>`
            : summary.salvaged > 0 ? `<div class="wb-find" style="--i:${next()}"><span class="wb-find-icon">♻️</span><span><b>${summary.salvaged}</b> items salvaged for essence and bars</span></div>` : '',
        ...(summary.dungeonClears || []).map(d => `<div class="wb-find" style="--i:${next()}"><span class="wb-find-icon">🏰</span><span><b>${fmt(d.clears)}</b> ${esc(d.name)} clear${d.clears > 1 ? 's' : ''} (+${d.fragments} fragments)</span></div>`),
        summary.plotsReady ? `<div class="wb-find" style="--i:${next()}">${sprite('farm/growing', { scale: 1, fallback: '🌾' })}<span><b>${summary.plotsReady}</b> farm plot${summary.plotsReady > 1 ? 's are' : ' is'} ready to harvest</span></div>` : '',
        summary.mastery && summary.mastery.to > summary.mastery.from ? `<div class="wb-find" style="--i:${next()}"><span class="wb-find-icon">⭐</span><span>${esc(summary.mastery.name)} mastery ${summary.mastery.from} → <b>${summary.mastery.to}</b></span></div>` : ''
    ].filter(Boolean).join('');
    return `<div class="modal-content welcome-back">
        <div class="modal-header">🌙 Welcome back</div>
        <p class="wb-away">You were away <b>${away}</b>${summary.capped ? ' <span class="muted small">(offline time is capped; Endurance perks extend it)</span>' : ''}</p>
        <p class="wb-story">${story}</p>
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
        <div class="intro-scene" aria-hidden="true">
            <div class="intro-layer sky"></div><div class="intro-layer far"></div><div class="intro-layer near"></div>
            <div class="intro-motes">${motes}</div>
            <div class="intro-hero">${heroSprite(state, { scale: 5 })}</div>
            <div class="intro-foe">${sprite('mon/Slime', { scale: 4 })}</div>
        </div>
        <h1 id="intro-title" class="intro-logo">Fantasy Idle</h1>
        <p class="intro-tag">Fight monsters, gather, forge your gear. Your hero keeps at it while you're away.</p>
        <button class="modal-btn btn-confirm intro-go" onclick="FI.beginAdventure()">⚔️ Begin your adventure</button>
        <button class="intro-login" onclick="FI.openAuth()">Have an account? Sign in</button>
    </div>`;
}

export function renderAuthModal(message = '') {
    return `<div class="modal-content narrow">
        <div class="modal-header">☁️ Cloud save</div>
        <div class="modal-body">
            <p class="muted small">Create an account to sync your save across devices, or keep playing as a guest with a local save.</p>
            <div class="auth-error" id="auth-error">${esc(message)}</div>
            <input type="text" id="auth-user" placeholder="Username" autocomplete="username" class="text-input">
            <input type="password" id="auth-pass" placeholder="Password" autocomplete="current-password" class="text-input">
            <div class="btn-row"><button class="modal-btn btn-confirm" onclick="FI.auth('login')">Log in</button><button class="modal-btn btn-register" onclick="FI.auth('register')">Register</button></div>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.closeModal()">Play as guest</button></div>
    </div>`;
}

export function renderConflictModal(local, cloud, suggested = null) {
    const line = s => `${duration(s.meta.playtimeMs)} played · best stage ${s.combat.bestStage} · saved ${new Date(s.meta.savedAt).toLocaleString()}`;
    const more = side => (suggested === side ? ' <span class="keep-text">· more progress</span>' : '');
    return `<div class="modal-content">
        <div class="modal-header">⚠️ Two saves found</div>
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
        if (marker && (ch.type === 'timing' || ch.type === 'moving-target')) marker.style.left = `${animatedPosition(ch, game.now) * 100}%`;
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
        case 'achievements': return renderAchievements(game) + renderCollection(game);
        case 'dungeons': return renderDungeons(game);
        case 'farming': return renderFarming(game, ui);
        case 'events': return renderEvents(game);
        case 'agility': return renderAgility(game, ui);
        case 'settings': return renderSettings(game, ui, cloud);
        case 'clan': return renderClan(game, ui, cloud);
        default: return NON_COMBAT_SKILLS.includes(ui.tab) ? renderSkill(game, ui, ui.tab) : renderCombat(game, ui);
    }
}
