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
import { UNLOCKS, isUnlocked, nextGoals } from '../data/unlocks.js';
import { zoneForStage, isBossStage, STAGES_PER_ZONE } from '../data/zones.js';
import { levelProgress, MAX_LEVEL } from '../core/xp.js';
import { actionInterval, skillLevel, bonfireBonus, bonfireLit } from '../core/modifiers.js';
import { describeAffix, itemSellValue, tokensForStage, BALANCE, enemyForStage, goldForKill } from '../core/formulas.js';
import { killPayout } from '../systems/combat.js';
import { canComplete, resolveAction, fuelLog } from '../systems/skilling.js';
import { MINIGAME_CONFIG, hasOpportunity, animatedPosition } from '../systems/minigame.js';
import { goldShopPrice, itemUpgradeCost, itemReforgeCost, canWear, isUpgrade, itemScore, salvagePreview, bagSize } from '../systems/inventory.js';
import { nextCampCost } from '../systems/camp.js';
import { advise } from '../systems/advisor.js';
import { DUNGEONS, dungeonById, DUNGEON_MILESTONES, FRAGMENTS_PER_UNIQUE, UNIQUES, TITAN_TIME_MS, TITAN_UNLOCK_STAGE, TITAN_BONUS, DUNGEON_BOSS_TIME_MS } from '../data/dungeons.js';
import { dungeonUnlocked, titanReady, titanUnlocked, titanLevel, titanEnemy, fightPreview, dungeonPreview } from '../systems/dungeon.js';
import { PETS, PET_BASE } from '../data/pets.js';
import { FARMING_PLOTS, CROPS, cropById } from '../data/farming.js';
import { AGILITY_SLOTS, obstacleById, MAX_OBSTACLE_LEVEL } from '../data/agility.js';
import { plotUnlocked, seedCost, growTime, plotReady } from '../systems/farming.js';
import { obstacleCost, courseDef, obstacleLevel, upgradeInfo } from '../systems/agility.js';
import { BAIT_EXTRA_CHANCE } from '../systems/skilling.js';
import { DISCORD_INVITE } from '../data/social.js';
import { EVENTS, EVENT_DAILY_CAP, EVENT_ACTIONS_PER_TOKEN, EVENT_MILESTONES, EVENT_SHOP } from '../data/events.js';
import { eventStatus } from '../systems/events.js';
import { DAILY_MAX_BANKED } from '../systems/daily.js';
import { listBackups } from '../core/save.js';
import { BASE } from '../core/modifiers.js';
import { fmt, pct, seconds, duration, escapeHtml as esc } from './format.js';

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
    { id: 'shop', name: 'Shop & Prestige', icon: '🔮', group: 'MANAGEMENT' },
    { id: 'achievements', name: 'Achievements', icon: '🏆', group: 'MANAGEMENT' },
    { id: 'events', name: 'Events', icon: '🎉', group: 'MANAGEMENT' },
    { id: 'settings', name: 'Settings', icon: '⚙️', group: 'MANAGEMENT' },
    { id: 'clan', name: 'Clan', icon: '🛡️', group: 'SOCIAL' }
];

const rarityColor = id => RARITIES.find(r => r.id === id)?.color || '#e2e8f0';
const res = id => RESOURCES[id];
const resTag = (id, qty = null) => `<span class="res-tag" style="color:${res(id)?.color || '#e2e8f0'}">${res(id)?.icon || '📦'} ${qty !== null ? `${fmt(qty)}× ` : ''}${esc(res(id)?.name || id)}</span>`;

// ---------- sidebar ----------

export function renderNav(game, ui) {
    const state = game.state;
    const groups = ['COMBAT', 'SKILLS', 'MANAGEMENT', 'SOCIAL'];
    const action = resolveAction(state);
    let html = '';
    for (const group of groups) {
        html += `<h3>${group}</h3>`;
        for (const tab of TABS.filter(t => t.group === group)) {
            const unlocked = isUnlocked(state, tab.id) || ['inventory', 'settings', 'achievements'].includes(tab.id) && (tab.id !== 'achievements' || isUnlocked(state, 'achievements'));
            const def = UNLOCKS.find(u => u.id === tab.id);
            const active = ui.tab === tab.id ? 'active' : '';
            const working = (action && (action.skill === tab.skill)) || (tab.id === 'combat' && state.combat.active) ? 'action-active' : '';
            let badge = '';
            if (tab.skill) {
                const lp = levelProgress(state.skills[tab.skill].xp);
                badge = `<span class="nav-level" title="${fmt(lp.xpInto)} / ${fmt(lp.xpNeeded)} XP">${lp.level}</span>`;
            } else if (tab.id === 'combat') {
                badge = `<span class="nav-level" title="Combat level">${skillLevel(state, 'combat')}</span>`;
            }
            if (!unlocked) {
                html += `<button class="nav-btn locked" title="${esc(def?.hint || '')}"><span>🔒 ${tab.name}</span><span class="nav-hint">${def?.comingSoon ? 'soon' : ''}</span></button>`;
            } else {
                html += `<button id="nav-${tab.id}" class="nav-btn ${active} ${working}" onclick="FI.switchTab('${tab.id}')"><span>${tab.icon} ${tab.name}</span>${badge}</button>`;
            }
        }
    }
    return html;
}

// ---------- header ----------

export function renderHeader(game, ui, cloud) {
    const state = game.state;
    const d = game.derived;
    const goals = nextGoals(state, 1);
    const action = resolveAction(state);
    const chips = [
        `<div class="chip gold" title="Gold: run-scoped combat gold (resets on prestige)"><span>Gold</span><b>${fmt(state.gold)}</b></div>`,
        `<div class="chip tokens" title="Prestige tokens: permanent +0.5% ATK/DEF each"><span>Tokens</span><b>${fmt(state.prestige.tokens)}</b><i>+${d.tokenPowerPct}%</i></div>`,
        `<div class="chip sp" title="Skill points: spend in the Shop"><span>SP</span><b>${state.prestige.skillPoints}</b></div>`,
        `<div class="chip essence" title="Monster essence: upgrades equipment"><span>Essence</span><b>${fmt(state.resources.essence)}</b></div>`
    ];
    const banked = state.daily.banked;
    const nextCrate = banked >= DAILY_MAX_BANKED ? 'bank full' : `next in ${duration(state.daily.nextAt - game.now)}`;
    const daily = banked > 0
        ? `<button class="daily-btn ready" onclick="FI.claimDaily()" title="Crates ripen every 20 h; up to ${DAILY_MAX_BANKED} wait for you">📦 Claim daily crate${banked > 1 ? ` (${banked})` : ''} <span class="muted small">${nextCrate}</span></button>`
        : `<button class="daily-btn" disabled>📦 Next crate in ${duration(state.daily.nextAt - game.now)}</button>`;
    const bonfirePill = bonfireLit(state, game.now)
        ? `<span class="bonfire-pill" title="Burning logs in Firemaking keeps it going (up to ${BASE.bonfireMaxMs / 3600000} h)">🔥 Bonfire +${Math.round(bonfireBonus(skillLevel(state, 'firemaking')) * 100)}% XP · ${duration(state.bonfire.until - game.now)}</span>`
        : '';
    const ev = eventStatus(state, game.now);
    const eventPill = ev.active && isUnlocked(state, 'events')
        ? `<button class="event-pill" style="--accent:${ev.event.color}" onclick="FI.switchTab('events')" title="${esc(ev.event.desc)}">${ev.event.icon} ${esc(ev.event.name)} · ${duration(ev.endsAt - game.now)} left</button>`
        : '';
    const focusPill = game.derived.focused
        ? `<span class="focus-pill" title="You've left the game alone for a minute: +${Math.round(BASE.focusSkillSpeed * 100)}% skill speed and +${Math.round(BASE.focusAttackSpeed * 100)}% attack speed. Any click or key press ends it.">🧘 Focused +${Math.round(BASE.focusSkillSpeed * 100)}%</span>`
        : '';
    const status = action
        ? `<span class="status-pill working">${SKILLS[action.skill]?.icon || '⚙️'} ${esc(action.label)}${state.action?.stalled ? ' — <b class="warn">waiting for materials</b>' : ''}</span>`
        : state.combat.active
            ? `<span class="status-pill fighting">⚔️ Fighting — ${esc(fightingWhere(state))}</span>`
            : `<span class="status-pill idle">💤 Idle — start a skill or enter combat</span>`;
    const goal = goals.length ? `<span class="goal-pill">🎯 ${esc(goals[0].hint)}</span>` : '';
    const user = cloud?.loggedIn ? `<span class="cloud-pill" title="Cloud save">☁️ ${esc(cloud.username || 'signed in')}</span>` : `<span class="cloud-pill local" title="Local save only">💾 guest</span>`;
    return `
        <div class="header-row">
            <div class="chips">${chips.join('')}</div>
            <div class="header-right">${daily}${user}</div>
        </div>
        <div class="header-row second">${status}${focusPill}${bonfirePill}${eventPill}${goal}</div>
        <div class="stats-row">
            <span title="Attack">⚔️ ATK <b>${fmt(d.atk)}</b></span>
            <span title="Defence">🛡️ DEF <b>${fmt(d.def)}</b></span>
            <span title="Hitpoints">❤️ HP <b id="hdr-hp">${fmt(state.combat.hp)}</b> / ${fmt(d.maxHp)}</span>
            <span title="Critical chance / damage">🎯 Crit ${pct(d.critChance, 1)} × ${d.critDmg.toFixed(2)}</span>
            <span title="Attack interval">⚡ ${seconds(d.attackInterval)}</span>
            <span title="Dodge">💨 ${pct(d.dodge, 1)}</span>
            <span title="Offline cap">🌙 ${Math.round(d.offlineMs / 3600000)}h offline</span>
        </div>`;
}

// ---------- combat ----------

function fightingWhere(state) {
    const c = state.combat;
    if (c.mode === 'titan') return c.enemy?.name || 'the Titan';
    const run = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    if (run) return `${run.name} ${Math.min(c.dungeon.index + 1, run.monsters.length + 1)}/${run.monsters.length + 1}`;
    return `${zoneForStage(c.stage).name} stage ${c.stage}`;
}

function hpBar(current, max, cls) {
    const w = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
    return `<div class="combat-bar"><div class="combat-fill ${cls}" style="width:${w}%"></div></div>`;
}

export function renderCombat(game, ui) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const enemy = c.enemy || enemyForStage(c.stage);
    const zone = zoneForStage(c.stage);
    const boss = isBossStage(c.stage);
    const foods = foodsByHealing().filter(f => state.resources[f.id] > 0);
    const potions = orderedByTier('potion');
    const preview = game.prestigePreview();
    const canPrestige = isUnlocked(state, 'prestige') && preview.allowed;
    const recentLog = [...state.log].reverse().filter(l => ['combat', 'death', 'loot', 'prestige'].includes(l.type)).slice(0, 8);
    const comboStacks = Math.floor(c.combo || 0);
    const comboBuffs = comboStacks >= 30 ? '⚡ +10% crit · 🩸 15% lifesteal · ⚔️ echo strikes' : comboStacks >= 20 ? '⚡ +10% crit · 🩸 15% lifesteal' : comboStacks >= 10 ? '⚡ +10% crit' : '';

    const run = c.mode === 'dungeon' ? dungeonById(c.dungeon?.id) : null;
    const title = run
        ? `<h2>${run.icon} ${esc(run.name)} <span class="muted">${Math.min(c.dungeon.index + 1, run.monsters.length + 1)}/${run.monsters.length + 1}</span></h2>
           <div class="muted small">Dungeon run · ${state.dungeons[run.id].clears} clears · ${c.autoRepeat ? 'repeats after each clear' : 'stops after this clear'} · dying or leaving loses the run</div>`
        : c.mode === 'titan'
            ? `<h2>🗿 Titan challenge <span class="muted">level ${titanLevel(state)}</span></h2><div class="muted small">Deal as much damage as you can before the timer runs out — clicking helps.</div>`
            : `<h2>${boss ? '👑 Boss — ' : ''}${esc(zone.name)} <span class="muted" title="Gear that drops here is usually one tier below this, sometimes this tier, rarely one above">loot tier ${zone.gearTier}</span></h2>
               <div class="muted small">Stage <b>${c.stage}</b> · best this run <b>${c.maxStage}</b> · all-time <b>${c.bestStage}</b>${c.regroupLeft > 0 ? ` · <span class="regroup-pill" id="regroup-text">⛺ Regrouping — boss retry in ${Math.ceil(c.regroupLeft / 1000)}s</span>` : ''}</div>`;
    const nav = c.mode !== 'stages'
        ? `<div class="stage-nav"><button class="mini-btn danger" onclick="FI.toggleCombat()">${c.mode === 'dungeon' ? 'Abandon run' : 'Give up'}</button></div>`
        : null;

    return `
    ${renderAdvisor(game)}
    <section class="glass-panel combat-panel">
        <div class="panel-header">
            <div>${title}</div>
            ${nav || `<div class="stage-nav">
                <button class="mini-btn" aria-label="Back 10 stages" onclick="FI.stageNav(-10)" ${c.stage <= 1 ? 'disabled' : ''}>«</button>
                <button class="mini-btn" aria-label="Back 1 stage" onclick="FI.stageNav(-1)" ${c.stage <= 1 ? 'disabled' : ''}>‹</button>
                <button class="mini-btn" aria-label="Forward 1 stage" onclick="FI.stageNav(1)" ${c.stage >= c.maxStage ? 'disabled' : ''}>›</button>
                <button class="mini-btn" aria-label="Forward 10 stages" onclick="FI.stageNav(10)" ${c.stage >= c.maxStage ? 'disabled' : ''}>»</button>
                <label class="toggle" title="Stay on this stage instead of advancing (loot farming)"><input type="checkbox" onchange="FI.toggleFarm(this.checked)" ${c.farmMode ? 'checked' : ''}> Farm this stage</label>
            </div>`}
        </div>

        <div class="combat-arena">
            <div class="combat-entity player-side">
                <div class="entity-name">🧑‍🚀 You <span class="muted small">Combat Lv ${d.combatLevel}</span></div>
                <div class="hp-text"><span id="player-hp-text">${fmt(c.hp)} / ${fmt(d.maxHp)}</span> HP</div>
                <div id="player-hp-bar">${hpBar(c.hp, d.maxHp, 'player-fill')}</div>
                <div class="entity-stats muted small">⚔️ ${fmt(d.atk)} · 🛡️ ${fmt(d.def)} · hits every ${seconds(d.attackInterval)}</div>
                <div class="attack-timer"><div id="player-atk-fill" class="attack-fill"></div></div>
            </div>
            <div class="combat-vs">VS</div>
            <div class="combat-entity enemy-side enemy-click-target" onclick="FI.clickAttack(event)" role="button" tabindex="0" aria-label="Strike the enemy (half damage, builds combo)" title="Click to strike (half damage, builds combo)">
                <div class="impact-flash" id="combat-impact-flash"></div>
                <div class="enemy-hit-layer" id="enemy-hit-layer"></div>
                <div class="enemy-sprite ${enemy.boss ? 'boss' : ''}" id="enemy-sprite">${enemy.icon}</div>
                <div class="entity-name" id="enemy-name">${esc(enemy.name)}</div>
                <div class="hp-text"><span id="enemy-hp-text">${fmt(Math.max(0, enemy.hp))} / ${fmt(enemy.maxHp)}</span> HP</div>
                <div id="enemy-hp-bar">${hpBar(enemy.hp, enemy.maxHp, 'enemy-fill')}</div>
                ${enemy.boss ? `<div class="boss-timer" title="Bosses must fall within ${(enemy.timeLimit || BALANCE.combat.bossTimeMs) / 1000} seconds of fighting"><div id="boss-timer-fill" class="boss-timer-fill" style="width:${Math.max(0, c.bossTimeLeft / (enemy.timeLimit || BALANCE.combat.bossTimeMs) * 100)}%"></div><span id="boss-timer-text">⏳ ${Math.ceil(Math.max(0, c.bossTimeLeft) / 1000)}s</span></div>` : ''}
                <div class="entity-stats muted small">⚔️ ${fmt(enemy.atk)} · hits every ${seconds(enemy.interval)} · 💰 ~${fmt(goldForKill(killPayout(state, enemy).full ? enemy : { ...enemy, boss: false }, d.goldMult))}</div>
            </div>
        </div>

        <div class="combat-controls">
            <button class="prestige-btn big" onclick="FI.toggleCombat()">${c.active ? '🏳️ Leave combat' : '⚔️ Enter combat'}</button>
            <label>Auto-eat <span class="muted small">(below ${pct(d.autoEatThreshold)} HP)</span>
                <select class="material-select" onchange="FI.setAutoEat(this.value)">
                    <option value="auto" ${c.autoEat === 'auto' ? 'selected' : ''}>Auto (best fit)</option>
                    <option value="none" ${c.autoEat === 'none' ? 'selected' : ''}>None</option>
                    ${foodsByHealing().map(f => `<option value="${f.id}" ${c.autoEat === f.id ? 'selected' : ''}>${esc(f.name)} (+${Math.round(f.heals * d.foodMult)} HP) × ${fmt(state.resources[f.id])}</option>`).join('')}
                </select>
                <span class="muted small">Food: ${foods.length ? foods.map(f => `${f.icon}${fmt(state.resources[f.id])}`).join(' ') : 'none — cook some!'}</span>
            </label>
            <label>Potion <span class="muted small">(${d.potionCharges} charges each)</span>
                <select class="material-select" onchange="FI.setPotion(this.value)">
                    <option value="none" ${c.potion === 'none' ? 'selected' : ''}>None</option>
                    ${potions.map(p => `<option value="${p.id}" ${c.potion === p.id ? 'selected' : ''}>${esc(p.name)} — ${p.desc} × ${fmt(state.resources[p.id])}</option>`).join('')}
                </select>
                <span class="muted small">${c.potion !== 'none' ? (c.potionCharges > 0 ? `Active — ${c.potionCharges} charges left` : (state.resources[c.potion] > 0 ? 'Will drink on next attack' : 'Out of potions')) : ''}</span>
            </label>
        </div>

        <div class="combo-meter-container" id="combo-container" style="${comboStacks > 0 ? '' : 'display:none'}">
            <div class="combo-text" id="combo-text">${comboStacks}×</div>
            <div class="combo-label">COMBO</div>
            <div id="combo-buffs" class="combo-buffs">${comboBuffs}</div>
        </div>
    </section>

    <div class="two-col">
        <section class="glass-panel">
            <div class="panel-header"><h2>🏕️ Camp</h2><span class="muted small">Bought with gold, reset on prestige</span></div>
            <div class="camp-grid">
                ${CAMP_UPGRADES.map(u => {
                    const level = state.camp[u.id] || 0;
                    const cost = nextCampCost(state, u.id);
                    return `<div class="camp-card">
                        <div class="camp-title">${u.icon} ${u.name} <span class="muted">Lv ${level}/${u.max}</span></div>
                        <div class="muted small">${u.desc} · now ×${Math.pow(1 + u.bonus, level).toFixed(2)}</div>
                        <div class="camp-actions">
                            <button class="gold-btn" onclick="FI.buyCamp('${u.id}', 1)" ${cost === null || state.gold < cost ? 'disabled' : ''}>${cost === null ? 'Maxed' : `${fmt(cost)} gold`}</button>
                            <button class="mini-btn" onclick="FI.buyCamp('${u.id}', 'max')" ${cost === null || state.gold < cost ? 'disabled' : ''}>Max</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </section>
        <section class="glass-panel">
            <div class="panel-header"><h2>✨ Prestige</h2><span class="muted small">${canPrestige ? `+${preview.tokens} tokens if you prestige now` : `Reach stage ${BALANCE.prestige.minStage} to unlock`}</span></div>
            <p class="muted small">Convert this run's best stage (${c.maxStage}) into permanent tokens (+0.5% ATK/DEF each) and skill points. Gold, camp and stage reset; everything else stays. Next run starts at stage ${preview.startStage}.</p>
            <div class="prestige-row">
                <button class="prestige-btn" onclick="FI.openPrestige()" ${canPrestige ? '' : 'disabled'}>Prestige now</button>
                <span class="muted small">Reach stage ${Math.ceil((c.maxStage + 1) / STAGES_PER_ZONE) * STAGES_PER_ZONE} for ${preview.nextZoneTokens} tokens</span>
            </div>
        </section>
    </div>

    <section class="glass-panel">
        <div class="panel-header"><h2>📜 Combat log</h2><span class="muted small">Zone drops: ${zone.loot.map(l => `${res(l.id).icon} ${esc(res(l.id).name)}`).join(', ')}</span></div>
        <div class="log-list">${recentLog.length ? recentLog.map(l => `<div class="log-line ${l.type}">${esc(l.text)}</div>`).join('') : '<div class="muted small">Nothing yet — enter combat to start.</div>'}</div>
    </section>`;
}

// ---------- advisor ----------

export function renderAdvisor(game) {
    const tips = advise(game, 4);
    if (!tips.length) return '';
    const items = tips.map(t => {
        const go = t.tab || t.action;
        return `<button class="advisor-item" ${go ? `onclick="FI.advisorGo(${t.tab ? `'${t.tab}'` : 'null'}, ${t.action ? `'${t.action}'` : 'null'})"` : 'disabled'}>
            <span class="advisor-icon" aria-hidden="true">${t.icon}</span><span class="advisor-text">${esc(t.text)}</span>${go ? '<span class="advisor-go" aria-hidden="true">→</span>' : ''}</button>`;
    }).join('');
    return `<section class="glass-panel advisor" aria-label="Next steps">
        <div class="panel-header"><h2>🧭 Next steps</h2><span class="muted small">Suggestions update as you play</span></div>
        <div class="advisor-list">${items}</div>
    </section>`;
}

// ---------- skills ----------

function xpHeader(game, skillId, extra = '') {
    const skill = SKILLS[skillId];
    const lp = levelProgress(game.state.skills[skillId].xp);
    return `<div class="panel-header">
        <div><h2>${skill.icon} ${skill.name}</h2><div class="muted small">${esc(skill.desc)}</div></div>
        <div class="skill-info">
            ${extra}
            <span class="skill-level" style="color:${skill.color}; background:${skill.color}22">Level ${lp.level}${lp.level >= MAX_LEVEL ? ' ★' : ''}</span>
            <div class="xp-bar-container"><div class="xp-bar-fill" style="width:${(lp.fraction * 100).toFixed(1)}%; background:${skill.color}"></div></div>
            <span class="skill-xp">${lp.level >= MAX_LEVEL ? fmt(game.state.skills[skillId].xp) + ' XP' : `${fmt(lp.xpInto)} / ${fmt(lp.xpNeeded)} XP`}</span>
        </div>
    </div>`;
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

function toolBadge(game, skillId) {
    const skill = SKILLS[skillId];
    if (!skill.tool) return '';
    const tool = TOOLS[skill.tool];
    const tier = game.state.tools[skill.tool] || 0;
    const def = tool.tiers.find(t => t.tier === tier);
    return `<span class="tool-badge" title="${tier ? toolEffect(skill.tool, tier) : `Make a ${tool.name.toLowerCase()} in ${tool.madeBy}`}">${tool.icon} ${def ? esc(def.name) : `No ${tool.name.toLowerCase()}`}</span>`;
}

/** Cooking lists three kinds of dish; group the cards so each line reads as a ladder. */
function nodeGroup(skillId, node) {
    if (skillId !== 'cooking') return null;
    const input = Object.keys(node.consumes || {})[0];
    if (RESOURCES[input]?.category === 'crop') return 'From the farm';
    if (SKILLS.fishing.nodes.some(n => n.produces === input)) return 'Fish';
    return 'Meat';
}

function skillExtras(game, skillId) {
    const state = game.state;
    if (skillId === 'fishing') {
        return `<div class="info-strip">🪱 <b>${fmt(state.resources.fishing_bait)}</b> bait — each catch uses one, if you have any, for a ${Math.round(BAIT_EXTRA_CHANCE * 100)}% chance of a second fish. Bait drops in the Fever Marsh, Drowned Ruins and Frozen Wastes, or buy a tin in the Shop.</div>`;
    }
    if (skillId === 'firemaking') {
        const lit = bonfireLit(state, game.now);
        const bonus = Math.round(bonfireBonus(skillLevel(state, 'firemaking')) * 100);
        return `<div class="info-strip ${lit ? 'lit' : ''}">🔥 ${lit ? `The bonfire burns for <b>${duration(state.bonfire.until - game.now)}</b>: <b>+${bonus}% XP</b> in every skill, combat included.` : `The bonfire is out. Burning logs lights it: <b>+${bonus}% XP</b> in every skill while it burns.`} Each log adds ${BASE.bonfireSecondsPerLogTier} s × its tier, up to ${BASE.bonfireMaxMs / 3600000} hour; the bonus grows with your Firemaking level.</div>`;
    }
    return '';
}

export function renderSkill(game, ui, skillId) {
    const state = game.state;
    const skill = SKILLS[skillId];
    const level = skillLevel(state, skillId);
    const d = game.derived;
    const action = state.action;
    let cards = '';
    let group = null;
    for (const node of skill.nodes) {
        const nodeGroupName = nodeGroup(skillId, node);
        if (nodeGroupName && nodeGroupName !== group) {
            group = nodeGroupName;
            cards += `<h3 class="section-title grid-span">${esc(group)}</h3>`;
        }
        const unlocked = level >= node.levelReq;
        const active = action?.kind === 'node' && action.skill === skillId && action.id === node.id;
        const interval = actionInterval(node.interval, d, skillId);
        const def = { ...node, skill: skillId };
        const check = canComplete(state, def);
        let inputs = '';
        if (node.consumes) inputs += Object.entries(node.consumes).map(([id, q]) => `<span class="${state.resources[id] >= q ? 'ok' : 'missing'}">${q}× ${res(id).icon} ${esc(res(id).name)} <i>(${fmt(state.resources[id])})</i></span>`).join(' ');
        if (node.fuel) { const log = fuelLog(state); inputs += ` <span class="${log ? 'ok' : 'missing'}">🪵 1 log${log ? ` (${esc(res(log).name)})` : ' (none!)'}</span>`; }
        const out = res(node.produces || node.bonfireLog);
        const gives = node.produces
            ? `${resTag(node.produces)} <i>(${fmt(state.resources[node.produces])})</i>${skillId === 'mining' ? ' · 2% gem' : ''}`
            : `🔥 +${BASE.bonfireSecondsPerLogTier * res(node.bonfireLog).tier} s of bonfire`;
        cards += `<div id="node-${skillId}-${node.id}" class="node-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'} ${active && action.stalled ? 'stalled' : ''}" ${unlocked ? `onclick="FI.startNode('${skillId}','${node.id}')" role="button" tabindex="0" aria-pressed="${active}"` : 'aria-disabled="true"'} style="--accent:${skill.color}">
            <div class="skill-action-art" style="color:${out.color}">${out.icon}</div>
            <div class="node-name">${esc(node.name)}</div>
            ${unlocked ? '' : `<div class="req">Requires level ${node.levelReq}</div>`}
            <div class="node-io muted small">${inputs ? `Needs: ${inputs}<br>` : ''}Gives: ${gives}</div>
            ${unlocked ? `<div class="node-stats"><span>✨ ${Math.round(node.xp * d.xpMult)} XP</span><span>⏱️ ${seconds(interval)}</span>${d.doubleChance[skillId] ? `<span>🎲 ${pct(d.doubleChance[skillId])} double</span>` : ''}</div>
            <div class="action-progress-container"><div class="action-progress-fill" id="progress-${skillId}-${node.id}" style="width:${active ? Math.min(100, action.progress / interval * 100) : 0}%; background:${active && !check.ok ? '#ef4444' : skill.color}"></div></div>` : ''}
        </div>`;
    }
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, skillId, toolBadge(game, skillId))}
        ${skillExtras(game, skillId)}
        ${NON_COMBAT_SKILLS.includes(skillId) ? renderMinigame(game, skillId) : ''}
        <div class="node-grid">${cards}</div>
    </section>`;
}

export function renderMinigame(game, skillId) {
    const state = game.state;
    const conf = MINIGAME_CONFIG[skillId];
    const mg = state.minigame[skillId];
    const now = game.now;
    const boostLeft = Math.max(0, mg.boostUntil - now);
    const training = state.action?.kind === 'node' && state.action.skill === skillId;
    const opportunity = hasOpportunity(state, skillId, now);
    const ch = mg.challenge;
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
    } else if (opportunity) {
        body = `<div class="minigame-prompt pulse">A chance appears! <span class="muted">(${Math.ceil((mg.opportunityUntil - now) / 1000)}s)</span></div>
            <button class="minigame-action-btn" onclick="FI.startMinigame('${skillId}')">${conf.actionText}</button>`;
    } else if (!training) {
        body = `<div class="muted small">Train ${SKILLS[skillId].name} and a chance to play will appear every few minutes.</div>`;
    } else {
        const wait = Math.max(0, (mg.nextOpportunityAt || now) - now);
        body = `<div class="muted small">Next chance in about ${duration(wait)} — keep working.</div>`;
    }
    return `<div class="minigame-panel" style="--minigame-accent:${conf.accent}">
        <div class="minigame-header">
            <div><div class="minigame-title">${conf.icon} ${conf.label}</div><div class="minigame-desc">${conf.desc}</div></div>
            <div class="minigame-boost-pill ${boostLeft > 0 ? 'live' : ''}">${boostLeft > 0 ? `+${Math.round(mg.bonus * 100)}% speed · ${Math.ceil(boostLeft / 1000)}s` : `Win: +${Math.round(BALANCE.minigame.baseBonus * 100)}–${Math.round(BALANCE.minigame.maxBonus * 100)}% speed for ${Math.round(BALANCE.minigame.boostMs / 1000)}s`}</div>
        </div>
        <div class="minigame-meta"><span>Streak ${mg.streak}</span><span>Wins ${state.stats.minigameWins}</span></div>
        ${body}
    </div>`;
}

// ---------- smithing & crafting ----------

function recipeCard({ title, icon, color, inputs, output, xp, interval, active, stalled, onclick, disabled, reqText, footer = '' }, state) {
    const cardId = `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const inputHtml = inputs.map(([id, q]) => `<span class="${(state.resources[id] || 0) >= q ? 'ok' : 'missing'}">${q}× ${res(id).icon} ${esc(res(id).name)} <i>(${fmt(state.resources[id] || 0)})</i></span>`).join(' ');
    return `<div id="${cardId}" class="node-card ${active ? 'active' : ''} ${disabled ? 'locked' : ''} ${active && stalled ? 'stalled' : ''}" ${disabled ? 'aria-disabled="true"' : `onclick="${onclick}" role="button" tabindex="0" aria-pressed="${!!active}"`} style="--accent:${color}">
        <div class="skill-action-art" style="color:${color}">${icon}</div>
        <div class="node-name">${esc(title)}</div>
        ${reqText ? `<div class="req">${esc(reqText)}</div>` : ''}
        <div class="node-io muted small">Needs: ${inputHtml}${output ? `<br>Gives: ${output}` : ''}</div>
        <div class="node-stats"><span>✨ ${xp} XP</span><span>⏱️ ${seconds(interval)}</span></div>
        <div class="action-progress-container"><div class="action-progress-fill" style="width:${active ? '0' : '0'}%; background:${color}" data-progress="1"></div></div>
        ${footer}
    </div>`;
}

export function renderSmithing(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'smithing');
    const action = state.action;
    const def = resolveAction(state);
    const metal = METALS.find(m => m.bar === ui.smithMetal) || METALS[0];
    const smeltCards = SMELTING_RECIPES.map(r => recipeCard({
        title: r.name, icon: res(r.produces).icon, color: res(r.produces).color,
        inputs: Object.entries(r.consumes), output: resTag(r.produces, null) + ` <i>(${fmt(state.resources[r.produces])})</i>`,
        xp: Math.round(r.xp * d.xpMult), interval: actionInterval(r.interval, d, 'smithing'),
        active: action?.kind === 'smelt' && action.id === r.id, stalled: action?.stalled,
        onclick: `FI.smelt('${r.id}')`, disabled: level < r.levelReq, reqText: level < r.levelReq ? `Requires level ${r.levelReq}` : ''
    }, state)).join('');
    const forgeCards = SMITHING_TYPES.map(type => {
        const recipe = resolveAction(state, { kind: 'smith', type, bar: metal.bar });
        return recipeCard({
            title: `${metal.name} ${TYPE_NAMES[type]}`, icon: TYPE_ICONS[type], color: res(metal.bar).color,
            inputs: Object.entries(recipe.consumes), output: `equipment (tier ${metal.tier})`,
            xp: Math.round(recipe.xp * d.xpMult), interval: actionInterval(recipe.interval, d, 'smithing'),
            active: action?.kind === 'smith' && action.type === type && action.bar === metal.bar, stalled: action?.stalled,
            onclick: `FI.smith('${type}','${metal.bar}')`, disabled: level < recipe.levelReq, reqText: level < recipe.levelReq ? `Requires level ${recipe.levelReq}` : ''
        }, state);
    }).join('');
    const toolCards = ['pickaxe', 'axe', 'tinderbox', 'hoe'].map(toolId => renderToolCard(game, toolId)).join('');
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, 'smithing')}
        <h3 class="section-title">1. Smelt ore into bars</h3>
        <div class="node-grid">${smeltCards}</div>
        <h3 class="section-title">2. Forge equipment
            <select class="material-select" onchange="FI.selectSmithMetal(this.value)">${METALS.map(m => `<option value="${m.bar}" ${m.bar === metal.bar ? 'selected' : ''}>${m.name} (lvl ${m.levelReq}) — ${fmt(state.resources[m.bar])} bars</option>`).join('')}</select>
        </h3>
        <p class="muted small">Each piece unlocks a few levels after the metal (swords first, plate bodies last). Forged items roll up to Rare quality — epic and legendary gear only drops in combat. The metal decides the power band, so a lucky copper sword never beats an honest runite one.</p>
        <div class="node-grid">${forgeCards}</div>
        <h3 class="section-title">3. Tools</h3>
        <div class="node-grid">${toolCards}</div>
    </section>`;
}

function renderToolCard(game, toolId) {
    const state = game.state;
    const d = game.derived;
    const tool = TOOLS[toolId];
    const owned = state.tools[toolId] || 0;
    const next = tool.tiers.find(t => t.tier === owned + 1);
    if (!next) return `<div class="node-card locked"><div class="skill-action-art">${tool.icon}</div><div class="node-name">${tool.name}: maxed</div><div class="muted small">${esc(tool.tiers[tool.tiers.length - 1].name)}</div></div>`;
    const level = skillLevel(state, tool.madeBy);
    return recipeCard({
        title: next.name, icon: tool.icon, color: '#facc15', inputs: Object.entries(next.consumes),
        output: toolEffect(toolId, next.tier),
        xp: Math.round(next.xp * d.xpMult), interval: actionInterval(4000, d, tool.madeBy),
        active: state.action?.kind === 'tool' && state.action.tool === toolId, stalled: state.action?.stalled,
        onclick: `FI.makeTool('${toolId}', ${next.tier})`, disabled: level < next.levelReq, reqText: level < next.levelReq ? `Requires ${SKILLS[tool.madeBy].name} ${next.levelReq}` : `Owned: ${owned ? esc(tool.tiers.find(t => t.tier === owned).name) : 'none'}`
    }, state);
}

export function renderCrafting(game, ui) {
    const state = game.state;
    const d = game.derived;
    const level = skillLevel(state, 'crafting');
    const action = state.action;
    const bar = JEWEL_BARS.find(b => b.bar === ui.craftBar) || JEWEL_BARS[0];
    const gem = GEM_TIERS.find(g => g.gem === ui.craftGem) || GEM_TIERS[0];
    const cards = CRAFTING_TYPES.map(type => {
        const recipe = resolveAction(state, { kind: 'craft', type, bar: bar.bar, gem: gem.gem });
        return recipeCard({
            title: `${res(gem.gem).name} ${TYPE_NAMES[type]}`, icon: TYPE_ICONS[type], color: res(gem.gem).color,
            inputs: Object.entries(recipe.consumes), output: `jewellery (tier ${res(gem.gem).tier})`,
            xp: Math.round(recipe.xp * d.xpMult), interval: actionInterval(recipe.interval, d, 'crafting'),
            active: action?.kind === 'craft' && action.type === type && action.bar === bar.bar && action.gem === gem.gem, stalled: action?.stalled,
            onclick: `FI.craft('${type}','${bar.bar}','${gem.gem}')`, disabled: level < recipe.levelReq, reqText: level < recipe.levelReq ? `Requires level ${recipe.levelReq}` : ''
        }, state);
    }).join('');
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, 'crafting')}
        <h3 class="section-title">Jewellery
            <select class="material-select" onchange="FI.selectCraftBar(this.value)">${JEWEL_BARS.map(b => `<option value="${b.bar}" ${b.bar === bar.bar ? 'selected' : ''}>${b.name} bar (lvl ${b.levelReq}) — ${fmt(state.resources[b.bar])}</option>`).join('')}</select>
            <select class="material-select" onchange="FI.selectCraftGem(this.value)">${GEM_TIERS.map(g => `<option value="${g.gem}" ${g.gem === gem.gem ? 'selected' : ''}>${res(g.gem).name} (lvl ${g.levelReq}) — ${fmt(state.resources[g.gem])}</option>`).join('')}</select>
        </h3>
        <p class="muted small">Gems turn up while mining (2% per ore) and drop from monsters. Jewellery gives a little ATK and DEF and is the best source of affixes.</p>
        <div class="node-grid">${cards}</div>
        <h3 class="section-title">Bows</h3>
        <div class="node-grid">${renderToolCard(game, 'bow')}${renderToolCard(game, 'rod')}</div>
    </section>`;
}

// ---------- inventory ----------

function itemCard(game, item, { equippedSlot = null } = {}) {
    const state = game.state;
    const cost = itemUpgradeCost(game, item);
    const up = item.upgrade || 0;
    const mult = 1 + UPGRADE_STEP * up;
    const wearable = canWear(state, item);
    const affixes = (item.affixes || []).map(a => `<span class="affix">${esc(describeAffix(a))}</span>`).join('');
    const stats = [item.atk ? `<span class="item-atk">⚔️ ${Math.round(item.atk * mult)}</span>` : '', item.def ? `<span class="item-def">🛡️ ${Math.round(item.def * mult)}</span>` : ''].filter(Boolean).join(' ');
    const afford = c => state.resources.essence >= c.essence && state.gold >= c.gold;
    const upgradeBtn = up < MAX_UPGRADE
        ? `<button class="mini-btn" onclick="FI.upgrade(${item.id})" ${afford(cost) ? '' : 'disabled'} title="+5% base stats per level">⬆ +${up + 1}: ${cost.essence} ✨ + ${fmt(cost.gold)} 🪙</button>`
        : `<span class="muted small">Max upgrade</span>`;
    const reforge = itemReforgeCost(game, item);
    const reforgeBtn = item.affixes?.length && !item.uniqueId
        ? `<button class="mini-btn" onclick="FI.reforge(${item.id})" ${afford(reforge) ? '' : 'disabled'} title="Reroll this item's affixes (cost rises with each reforge)">🔁 ${reforge.essence} ✨ + ${fmt(reforge.gold)} 🪙</button>`
        : '';
    const salvage = salvagePreview(item);
    const salvageText = [salvage.essence ? `${salvage.essence} essence` : '', ...Object.entries(salvage.materials).map(([id, q]) => `~${q.toFixed(1)} ${RESOURCES[id].name}`)].filter(Boolean).join(', ') || 'nothing';
    const upgradeBadge = !equippedSlot && wearable && isUpgrade(state, item) ? '<span class="badge-upgrade">▲ upgrade</span>' : '';
    const source = item.source === 'drop' ? 'dropped' : item.source === 'unique' ? 'unique' : 'crafted';
    return `<div class="inv-item ${item.locked ? 'locked-item' : ''}" style="border-color:${item.color}55">
        <div class="inv-header">
            <div class="inv-title-wrap"><div class="item-thumb" style="color:${item.color}">${item.icon}</div>
                <div><span class="item-name" style="color:${item.color}">${esc(item.name)}${up ? ` +${up}` : ''}</span> ${upgradeBadge}<div class="inv-type">${RARITIES.find(r => r.id === item.rarity)?.name || item.rarity} · ${item.type} · tier ${item.tier} · ${source}</div></div></div>
            <button class="lock-btn ${item.locked ? 'on' : ''}" onclick="FI.toggleLock(${item.id})" aria-pressed="${!!item.locked}" aria-label="${item.locked ? 'Unlock' : 'Lock'} ${esc(item.name)}" title="${item.locked ? 'Locked: never sold or salvaged' : 'Lock to protect from selling and salvage'}">${item.locked ? '🔒' : '🔓'}</button>
        </div>
        <div class="inv-stats-row"><div>${stats || '<span class="muted">no base stats</span>'}</div><div class="affixes">${affixes}</div></div>
        ${!wearable ? `<div class="req">Needs combat level ${TIER_WEAR_LEVEL[item.tier]}</div>` : ''}
        <div class="inv-actions">
            ${equippedSlot ? `<button class="mini-btn" onclick="FI.unequip('${equippedSlot}')">Unequip</button>` : `<button class="equip-btn" onclick="FI.equip(${item.id})" ${wearable ? '' : 'disabled'}>Equip</button>`}
            ${upgradeBtn}
            ${reforgeBtn}
            ${equippedSlot ? '' : `<button class="mini-btn" onclick="FI.salvage(${item.id})" ${item.locked ? 'disabled' : ''} title="Salvage for ${esc(salvageText)}">♻️ Salvage</button><button class="sell-btn" onclick="FI.sellItem(${item.id})" ${item.locked ? 'disabled' : ''} title="Sell for ${fmt(itemSellValue(item))} gold">💰 ${fmt(itemSellValue(item))}</button>`}
        </div>
    </div>`;
}

export function renderInventory(game, ui) {
    const state = game.state;
    const slots = EQUIP_SLOTS.map(slot => {
        const item = state.equipped[slot];
        const type = slot.replace(/\d$/, '');
        if (item) return itemCard(game, item, { equippedSlot: slot });
        return `<div class="slot drop-slot"><div class="slot-info"><div class="item-thumb empty-thumb">${TYPE_ICONS[type]}</div><span class="slot-name">${slot}</span><span class="muted small">empty</span></div></div>`;
    }).join('');
    const items = [...state.inventory].sort((a, b) => itemScore(b) - itemScore(a));
    const filter = ui.invFilter || 'all';
    const categories = ['ore', 'bar', 'gem', 'log', 'raw', 'food', 'herb', 'potion', 'material'];
    const resources = Object.keys(RESOURCES).filter(id => state.resources[id] > 0 && (filter === 'all' || RESOURCES[id].category === filter));
    const auto = state.settings.autoSalvage || 'off';
    const hasCommons = items.some(i => i.rarity === 'common' && !i.locked);
    return `<div class="two-col">
        <section class="glass-panel">
            <div class="panel-header"><h2>🧍 Equipped</h2><span class="muted small">${fmt(game.derived.atk)} ATK · ${fmt(game.derived.def)} DEF</span></div>
            <div class="slot-list">${slots}</div>
        </section>
        <section class="glass-panel">
            <div class="panel-header"><h2>🎒 Bag (${items.length}/${bagSize()})</h2>
                <div class="btn-row">
                    <button class="mini-btn" onclick="FI.salvageAll('common')" ${hasCommons ? '' : 'disabled'}>♻️ Salvage commons</button>
                    <button class="mini-btn" onclick="FI.sellAll('common')" ${hasCommons ? '' : 'disabled'}>💰 Sell commons</button>
                </div>
            </div>
            <label class="muted small auto-salvage">Auto-salvage drops up to
                <select class="material-select" onchange="FI.setAutoSalvage(this.value)">${AUTO_SALVAGE_OPTIONS.map(o => `<option value="${o}" ${o === auto ? 'selected' : ''}>${o === 'off' ? 'off' : RARITIES.find(r => r.id === o).name}</option>`).join('')}</select>
                <span>— never an upgrade, never locked items. When the bag is full the weakest item is salvaged.</span>
            </label>
            <div class="inv-list">${items.length ? items.map(i => itemCard(game, i)).join('') : '<div class="empty-state">No spare equipment. Forge some in Smithing, or fight: bosses drop gear half the time.</div>'}</div>
            <p class="muted small">${state.stats.itemsDropped} items dropped · ${state.stats.itemsSalvaged} salvaged (${state.stats.itemsAutoSalvaged} automatically)</p>
        </section>
    </div>
    <section class="glass-panel">
        <div class="panel-header"><h2>📦 Materials</h2>
            <div class="filter-row">${['all', ...categories].map(c => `<button class="mini-btn ${filter === c ? 'active' : ''}" onclick="FI.invFilter('${c}')">${c}</button>`).join('')}</div>
        </div>
        <div class="res-grid">${resources.length ? resources.map(id => `<div class="res-card" style="border-color:${res(id).color}44">
            <div class="res-head"><span class="res-icon" style="color:${res(id).color}">${res(id).icon}</span><div><div class="res-name">${esc(res(id).name)}</div><div class="muted small">${res(id).category}${res(id).heals ? ` · heals ${res(id).heals}` : ''}${res(id).desc ? ` · ${res(id).desc}` : ''}</div></div></div>
            <div class="res-qty">×${fmt(state.resources[id])}</div>
            ${id === 'essence' ? '<div class="muted small">Upgrades and reforges gear</div>' : `<div class="res-actions"><span class="muted small">${sellValue(id)} 🪙 each</span><button class="mini-btn" onclick="FI.sellRes('${id}',1)">Sell 1</button><button class="mini-btn" onclick="FI.sellRes('${id}',10)">10</button><button class="mini-btn" onclick="FI.sellRes('${id}',1e9)">All</button></div>`}
        </div>`).join('') : '<div class="empty-state">Nothing here yet. Mine, cut, hunt or fight to collect materials.</div>'}</div>
    </section>`;
}

// ---------- shop ----------

export function renderShop(game, ui) {
    const state = game.state;
    const d = game.derived;
    const perks = PERKS.map(p => {
        const level = state.perks[p.id] || 0;
        return `<div class="shop-item">
            <div class="shop-item-info"><span class="shop-item-name">${p.icon} ${p.name} <span class="muted">Lv ${level}/${p.max}</span></span><span class="shop-item-desc">${esc(p.desc)}</span></div>
            <button class="shop-btn" onclick="FI.buyPerk('${p.id}')" ${state.prestige.skillPoints > 0 && level < p.max ? '' : 'disabled'}>1 SP</button>
        </div>`;
    }).join('');
    const goods = GOLD_SHOP.map(e => {
        const price = goldShopPrice(game, e);
        return `<div class="shop-item">
            <div class="shop-item-info"><span class="shop-item-name">${e.name}</span><span class="shop-item-desc">${esc(e.desc)} <span class="muted">(${e.costKills} kills' worth of gold at your best stage)</span></span></div>
            <button class="gold-btn" onclick="FI.buyShop('${e.id}')" ${state.gold >= price ? '' : 'disabled'}>${fmt(price)} gold</button>
        </div>`;
    }).join('');
    const preview = game.prestigePreview();
    return `<div class="two-col">
        <section class="glass-panel">
            <div class="panel-header"><h2>✨ Prestige</h2><span class="muted small">${state.prestige.count} so far</span></div>
            <div class="prestige-stats">
                <div><b>${fmt(state.prestige.tokens)}</b><span>tokens held → +${d.tokenPowerPct}% ATK/DEF</span></div>
                <div><b>${state.prestige.skillPoints}</b><span>unspent skill points</span></div>
                <div><b>${preview.tokens}</b><span>tokens for this run (best stage ${state.combat.maxStage})</span></div>
                <div><b>${preview.startStage}</b><span>next run starts at stage</span></div>
            </div>
            <p class="muted small">Tokens are never spent — each one is a permanent +0.5% ATK and DEF (+0.25% HP). Skill points buy the perks on the right. Prestige resets your stage, gold and camp; skills, gear and materials stay.</p>
            <button class="prestige-btn" onclick="FI.openPrestige()" ${preview.allowed ? '' : 'disabled'}>${preview.allowed ? `Prestige for +${preview.tokens} tokens, +${preview.skillPoints} SP` : `Reach stage ${BALANCE.prestige.minStage} to prestige`}</button>
        </section>
        <section class="glass-panel">
            <div class="panel-header"><h2>🌟 Perks</h2><span class="muted small">${state.prestige.skillPoints} SP available · +1 per prestige, +1 per 25 stages of your record</span></div>
            <div class="shop-list">${perks}</div>
        </section>
    </div>
    <section class="glass-panel">
        <div class="panel-header"><h2>💰 Supplies</h2><span class="muted small">Prices scale with your best stage</span></div>
        <div class="shop-list two-col">${goods}</div>
    </section>`;
}

// ---------- achievements ----------

export function renderAchievements(game) {
    const state = game.state;
    const done = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
    return `<section class="glass-panel">
        <div class="panel-header"><h2>🏆 Achievements</h2><span class="muted small">${done}/${ACHIEVEMENTS.length} · each one also gives +${Math.round(ACHIEVEMENT_GLOBAL_BONUS * 100)}% ATK, DEF and skill speed (now +${done}%)</span></div>
        <div class="ach-list">${ACHIEVEMENTS.map(a => {
            const ok = !!state.achievements[a.id];
            return `<div class="ach-item ${ok ? 'done' : ''}"><div><div class="ach-name">${ok ? '✅' : '🔒'} ${esc(a.name)}</div><div class="muted small">${esc(a.desc)}</div></div><div class="ach-reward">${esc(a.reward)}</div></div>`;
        }).join('')}</div>
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
    return `<section class="glass-panel event-panel" style="--accent:${e.color}">
        <div class="panel-header"><div><h2>${e.icon} ${esc(e.name)}</h2><div class="muted small">${status.active ? `Running now — ends in ${duration(status.endsAt - game.now)}` : `Next event — starts in ${duration(status.startsAt - game.now)}`}</div></div>
            <div class="chip tokens"><span>Festival tokens</span><b>${fmt(ev.tokens)}</b></div></div>
        <p>${esc(e.desc)}</p>
        <p class="muted small">Every weekend (Friday to Monday, UTC) one event runs, in turn: ${rotation}. While it runs, every ${EVENT_ACTIONS_PER_TOKEN} actions or kills earn a Festival Token (a harvest counts ${5}), up to ${EVENT_DAILY_CAP} a day${status.active ? ` — ${today}/${EVENT_DAILY_CAP} today` : ''}. Tokens keep between events; the shop opens while one runs.</p>
    </section>
    <div class="two-col">
        <section class="glass-panel"><div class="panel-header"><h2>🎯 Milestones</h2><span class="muted small">${earned} earned this event</span></div><div class="ach-list">${milestones}</div></section>
        <section class="glass-panel"><div class="panel-header"><h2>🛍️ Event shop</h2><span class="muted small">${status.active ? 'Open' : 'Opens with the next event'}</span></div><div class="event-shop">${shop}</div></section>
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
            return `<div class="plot-card locked"><div class="plot-art">🔒</div><div class="node-name">Plot ${i + 1}</div><div class="req">Opens at Farming ${FARMING_PLOTS[i]}</div></div>`;
        }
        if (!plot.crop) {
            return `<div class="plot-card empty"><div class="plot-art">🟫</div><div class="node-name">Plot ${i + 1} — empty</div>
                <label class="small">Plant <select class="material-select" id="plot-crop-${i}" aria-label="Crop for plot ${i + 1}">
                    ${choices.map(c => `<option value="${c.id}" ${c.id === lastCrop ? 'selected' : ''}>${c.icon} ${esc(c.name)} — ${fmt(seedCost(state, c))} gold</option>`).join('')}
                </select></label>
                <button class="prestige-btn" onclick="FI.plant(${i}, document.getElementById('plot-crop-${i}').value)">Plant</button></div>`;
        }
        const crop = cropById(plot.crop);
        const total = Math.max(1, plot.readyAt - plot.plantedAt);
        const done = plotReady(plot, game.now);
        const pctDone = done ? 100 : Math.min(100, (game.now - plot.plantedAt) / total * 100);
        return `<div class="plot-card ${done ? 'ready' : 'growing'}"><div class="plot-art">${done ? crop.icon : '🌱'}</div>
            <div class="node-name">Plot ${i + 1} — ${esc(crop.name)}</div>
            <div class="muted small">${done ? 'Ready to harvest' : `Ready in ${duration(plot.readyAt - game.now)}`}</div>
            <div class="action-progress-container"><div class="action-progress-fill" style="width:${pctDone}%; background:${SKILLS.farming.color}"></div></div>
            ${done ? `<button class="prestige-btn" onclick="FI.harvest(${i})">Harvest</button>` : ''}</div>`;
    }).join('');
    const rows = CROPS.map(c => {
        const unlocked = level >= c.levelReq;
        const avg = (c.yield[0] + c.yield[1]) / 2 * d.farmYield;
        return `<tr class="${unlocked ? '' : 'locked-row'}"><td>${c.icon} ${esc(c.name)}</td><td>${c.levelReq}</td><td>${duration(growTime(d, c))}</td>
            <td>${c.yield[0]}–${c.yield[1]}× ${esc(res(c.produces).name)}</td><td>${fmt(Math.round(c.xp * avg * d.xpMult))}</td><td>${fmt(seedCost(state, c))}</td></tr>`;
    }).join('');
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, 'farming', toolBadge(game, 'farming'))}
        <div class="info-strip">🌾 Plots grow on the clock — while you mine, fight or sleep. Seeds are bought when you plant.
            Herbs go to Alchemy; potatoes, cabbages, pumpkins and starfruit to Cooking.</div>
        <div class="btn-row"><button class="prestige-btn" onclick="FI.harvestAll()" ${ready ? '' : 'disabled'}>Harvest ${ready || ''} ready & replant</button></div>
        <div class="plot-grid">${plots}</div>
        <h3 class="section-title">Crops</h3>
        <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Crop</th><th>Level</th><th>Grows in</th><th>Harvest</th><th>XP / harvest</th><th>Seeds (gold)</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
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
    return `<section class="glass-panel skill-panel">
        ${xpHeader(game, 'agility')}
        <div class="info-strip">🤸 Every obstacle you build is a <b>permanent</b> bonus that survives prestige, and can be upgraded to level ${MAX_OBSTACLE_LEVEL} (its bonus counts once per level). Replacing one tears the old one down without a refund.
            ${builtList.length ? `Now: ${builtList.map(o => `${o.icon} ${esc(o.desc)}`).join(' · ')}` : 'Build the first obstacle, then run the course to train.'}</div>
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
            <div><b>Titan level ${tl}</b> · ${state.titan.kills} defeated (now +${Math.round(TITAN_BONUS.atkMult * 100 * state.titan.kills)}% ATK and HP)${state.titan.bestPct ? ` · best try ${Math.round(state.titan.bestPct * 100)}%` : ''}
                <div class="small ${readinessClass(titanFight.killSeconds, TITAN_TIME_MS / 1000, titanFight.surviveSeconds)}">Estimate: you would deal ~${Math.round(titanPct * 100)}% of its health in ${TITAN_TIME_MS / 1000} s${titanFight.surviveSeconds < TITAN_TIME_MS / 1000 ? `, but it would kill you in ~${Math.round(titanFight.surviveSeconds)} s without food` : ''}.</div></div>
            ${c.mode === 'titan' ? '<span class="status-pill fighting">Fighting now</span>'
                : titanReady(state, game.now) ? `<button class="prestige-btn" onclick="FI.challengeTitan()">🗿 Challenge (${TITAN_TIME_MS / 1000} s)</button>`
                : `<button class="mini-btn" disabled>Rests for ${duration(state.titan.readyAt - game.now)}</button>`}
        </div>`;
    const cards = DUNGEONS.map(d => {
        const record = state.dungeons[d.id];
        const open = dungeonUnlocked(state, d);
        const here = c.mode === 'dungeon' && c.dungeon?.id === d.id;
        const next = DUNGEON_MILESTONES.find(m => record.clears < m.clears);
        const done = DUNGEON_MILESTONES.filter(m => record.clears >= m.clears).map(m => m.desc);
        const unique = UNIQUES[d.unique];
        const preview = dungeonPreview(game.derived, d);
        const limit = DUNGEON_BOSS_TIME_MS / 1000;
        return `<div class="dungeon-card ${open ? '' : 'locked'} ${here ? 'active' : ''}">
            <div class="dungeon-head"><span class="dungeon-icon">${d.icon}</span><div><b>${esc(d.name)}</b><div class="muted small">${d.monsters.length} elites + ${esc(d.boss.name)} · like stage ${d.stage}–${d.stage + d.monsters.length} · chest loot tier ${d.chestTier}</div></div></div>
            ${open ? `<div class="small">Clears: <b>${record.clears}</b>${next ? ` · next milestone at ${next.clears}: ${next.desc}` : ' · all milestones earned'}</div>
                ${done.length ? `<div class="muted small">Earned: ${done.join('; ')}</div>` : ''}
                <div class="small">Fragments: <b>${record.fragments}/${FRAGMENTS_PER_UNIQUE}</b> toward <span style="color:#f97316">${esc(unique.name)}</span></div>
                <div class="small ${readinessClass(preview.bossFight.killSeconds, limit, preview.bossFight.surviveSeconds)}" title="Estimate without food, regen, lifesteal or combo">Boss: ~${fmtSeconds(preview.bossFight.killSeconds)} to kill (limit ${limit} s) · you last ~${fmtSeconds(preview.bossFight.surviveSeconds)}</div>
                <div class="btn-row">
                    ${here ? '<button class="mini-btn danger" onclick="FI.toggleCombat()">Abandon run</button>' : `<button class="prestige-btn" onclick="FI.enterDungeon('${d.id}')">Enter</button>`}
                    <button class="mini-btn" onclick="FI.assembleUnique('${d.id}')" ${record.fragments >= FRAGMENTS_PER_UNIQUE ? '' : 'disabled'}>Assemble unique</button>
                </div>`
                : `<div class="req">Opens at stage ${d.unlockStage}</div>`}
        </div>`;
    }).join('');
    return `<section class="glass-panel">
        <div class="panel-header"><h2>🗿 The Titan</h2><span class="muted small">Once an hour: a ${TITAN_TIME_MS / 1000}-second damage race. Each Titan defeated is gone for good and leaves +2% ATK and HP.</span></div>
        ${titanCard}
    </section>
    <section class="glass-panel">
        <div class="panel-header"><h2>🏰 Dungeons</h2>
            <label class="toggle"><input type="checkbox" onchange="FI.setDungeonRepeat(this.checked)" ${c.autoRepeat ? 'checked' : ''}> Repeat after each clear</label>
        </div>
        <p class="muted small">Elite monsters and a boss with a ${DUNGEON_BOSS_TIME_MS / 1000} s timer, fought with the gear you walk in with (it's locked inside). Dying, leaving or running out of time loses the run. Every clear opens a chest: a fragment of the dungeon's unique item, essence and materials, often a gem and sometimes a piece of boss-quality gear. Clear counts unlock permanent bonuses.</p>
        <div class="dungeon-grid">${cards}</div>
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
            <span class="pet-icon">${found ? p.icon : '❔'}</span><div><b>${found ? esc(p.name) : 'Unknown pet'}</b><div class="muted small">${esc(p.skill)} · ${found ? esc(p.desc) : `~${fmt(hours)} h at Lv ${level}`}</div></div></div>`;
    }).join('');
    const uniques = DUNGEONS.map(d => {
        const u = UNIQUES[d.unique];
        const owned = [...state.inventory, ...Object.values(state.equipped)].some(i => i && i.uniqueId === u.id);
        return `<div class="pet-card ${owned ? 'found' : ''}"><span class="pet-icon">${owned ? '🌟' : '❔'}</span><div><b style="color:#f97316">${esc(u.name)}</b><div class="muted small">${d.name} · ${state.dungeons[d.id].fragments}/${FRAGMENTS_PER_UNIQUE} fragments${owned ? ' · owned' : ''}</div></div></div>`;
    }).join('');
    return `<section class="glass-panel">
        <div class="panel-header"><h2>🐾 Pets</h2><span class="muted small">${PETS.filter(p => state.pets[p.id]).length}/${PETS.length} · rare finds while training, kept forever</span></div>
        <div class="pet-grid">${pets}</div>
    </section>
    <section class="glass-panel">
        <div class="panel-header"><h2>🌟 Unique items</h2><span class="muted small">Assembled from dungeon fragments, or found in a chest</span></div>
        <div class="pet-grid">${uniques}</div>
    </section>`;
}

// ---------- settings / clan ----------

export function renderSettings(game, ui, cloud) {
    const state = game.state;
    const played = duration(state.meta.playtimeMs);
    return `<div class="two-col">
        <section class="glass-panel">
            <div class="panel-header"><h2>☁️ Cloud save</h2><span class="muted small">${cloud?.loggedIn ? `Signed in as ${esc(cloud.username || '')}` : 'Guest (local only)'}</span></div>
            <p class="muted small">${cloud?.loggedIn ? 'Your save is uploaded every minute and on important events. Playing on another device loads whichever save has more play time.' : 'Sign in to keep your save in the cloud and play from any device. Your local save is kept either way.'}</p>
            ${cloud?.loggedIn ? `<div class="btn-row"><button class="mini-btn" onclick="FI.cloudSaveNow()">Save to cloud now</button><button class="mini-btn danger" onclick="FI.logout()">Log out</button></div>` : `<div class="btn-row"><button class="prestige-btn" onclick="FI.openAuth()">Log in / register</button></div>`}
            <div class="muted small" id="cloud-status">${esc(ui.cloudStatus || '')}</div>
        </section>
        <section class="glass-panel">
            <div class="panel-header"><h2>💾 Save file</h2><span class="muted small">Played ${played}</span></div>
            <div class="btn-row"><button class="mini-btn" onclick="FI.exportSave()">Copy export string</button><button class="mini-btn" onclick="FI.importSavePrompt()">Import string</button></div>
            <textarea id="save-io" class="save-io" placeholder="Paste a save string here, then press Import." rows="3" oninput="FI.setSaveIo(this.value)">${esc(ui.saveIo || '')}</textarea>
            <div class="btn-row"><button class="mini-btn danger" onclick="FI.hardReset()">Hard reset (wipe save)</button></div>
            ${renderBackups()}
        </section>
    </div>
    <section class="glass-panel">
        <div class="panel-header"><h2>⚙️ Options</h2></div>
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
    const intro = `<p class="muted small">Clans are asynchronous: each week the clan fights one shared boss. Every member gets three attacks a day, and an attack deals what <b>your saved hero</b> would deal in 60 seconds — the server works it out from your cloud save, so the game uploads first. Rewards (essence and diamonds) go to everyone who fought, the top three, the whole clan when the boss falls, and the last hit.</p>`;
    if (!cloud?.loggedIn) {
        return `<section class="glass-panel"><div class="panel-header"><h2>🛡️ Clans</h2></div>${intro}
            <div class="btn-row"><button class="prestige-btn" onclick="FI.openAuth()">Log in / register to join a clan</button></div></section>`;
    }
    if (cloud.available === false) {
        return `<section class="glass-panel"><div class="panel-header"><h2>🛡️ Clans</h2></div>${intro}<p class="warn">The clan server isn't reachable from here — clans need the game's API (the Vercel deployment).</p></section>`;
    }
    const status = social.error ? `<p class="warn small">${esc(social.error)}</p>` : social.loading && !social.loaded ? '<p class="muted small">Loading…</p>' : '';
    const rewards = (social.rewards || []).length
        ? `<div class="info-strip lit">🎁 ${social.rewards.length} clan reward${social.rewards.length > 1 ? 's' : ''} waiting: ${social.rewards.map(r => esc(r.text || r.kind)).join(' · ')}
            <div class="btn-row"><button class="prestige-btn" onclick="FI.claimRewards()">Claim</button></div></div>`
        : '';
    const discord = DISCORD_INVITE ? `<a class="mini-btn" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener">💬 Clan chat on Discord</a>` : '';
    let body = '';
    if (!social.clan) {
        const rows = (social.clans || []).map(c => `<tr><td><b>${esc(c.name)}</b> <span class="muted">[${esc(c.tag)}]</span><div class="muted small">${esc(c.description || '')}${c.lookingFor ? ` · looking for: ${esc(c.lookingFor)}` : ''}</div></td>
            <td>${c.members}/${social.maxMembers || 20}</td><td><button class="mini-btn" onclick="FI.joinClan(${c.id})" ${c.members >= (social.maxMembers || 20) ? 'disabled' : ''}>Join</button></td></tr>`).join('');
        body = `<div class="two-col">
            <section class="glass-panel"><div class="panel-header"><h2>🔎 Find a clan</h2></div>
                <div class="btn-row"><input id="clan-search" class="text-input" placeholder="Name or tag" value="${esc(social.search || '')}" aria-label="Search clans">
                <button class="mini-btn" onclick="FI.searchClans(document.getElementById('clan-search').value)">Search</button></div>
                ${rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Clan</th><th>Members</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted small">No clans found — start one.</p>'}
            </section>
            <section class="glass-panel"><div class="panel-header"><h2>🏳️ Start a clan</h2></div>
                <label class="small">Name <input id="clan-name" class="text-input" maxlength="32" placeholder="Iron Wolves"></label>
                <label class="small">Tag <input id="clan-tag" class="text-input" maxlength="5" placeholder="IWF"></label>
                <label class="small">Description <input id="clan-desc" class="text-input" maxlength="200" placeholder="Casual, EU evenings"></label>
                <label class="small">Looking for <input id="clan-looking" class="text-input" maxlength="100" placeholder="Anyone past stage 50"></label>
                <div class="btn-row"><button class="prestige-btn" onclick="FI.createClan()">Create clan</button></div>
            </section>
        </div>`;
    } else {
        const c = social.clan;
        const boss = social.boss;
        const pct = boss ? Math.max(0, boss.hp / Math.max(1, boss.maxHp) * 100) : 0;
        const board = (social.board || []).map((r, i) => `<tr class="${r.you ? 'you-row' : ''}"><td>${i + 1}</td><td>${esc(r.username)}</td><td>${fmt(r.damage)}</td><td>${r.attacks}</td></tr>`).join('');
        const members = (social.members || []).map(m => `<tr class="${m.you ? 'you-row' : ''}"><td>${m.owner ? '👑 ' : ''}${esc(m.username)}</td><td>${m.bestStage}</td><td>${m.totalLevel}</td><td>${fmt(m.attackDamage)}</td></tr>`).join('');
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
    return `<section class="glass-panel"><div class="panel-header"><h2>🛡️ Clans</h2><button class="mini-btn" onclick="FI.refreshSocial()">↻ Refresh</button></div>${intro}${status}${rewards}</section>
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
        <div class="panel-header"><h2>🏅 Leaderboards</h2>
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
            <div class="prestige-box highlight"><h4>You gain</h4><span class="prestige-reward">+${p.tokens} tokens</span> <span class="muted">(→ ${fmt(p.tokensAfter)} total, +${Math.round(p.tokensAfter * 0.5)}% ATK/DEF)</span><br><span class="sp-text">+${p.skillPoints} skill points</span></div>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.closeModal()">Cancel</button><button class="modal-btn btn-confirm" onclick="FI.confirmPrestige()">Prestige now</button></div>
    </div>`;
}

export function renderOfflineModal(lines) {
    return `<div class="modal-content">
        <div class="modal-header">🌙 Welcome back</div>
        <div class="modal-body"><div class="offline-lines">${lines.map(l => `<div>${esc(l)}</div>`).join('')}</div></div>
        <div class="modal-footer"><button class="modal-btn btn-confirm" onclick="FI.closeModal()">Continue</button></div>
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

export function renderConflictModal(local, cloud) {
    const line = s => `${duration(s.meta.playtimeMs)} played · best stage ${s.combat.bestStage} · saved ${new Date(s.meta.savedAt).toLocaleString()}`;
    return `<div class="modal-content">
        <div class="modal-header">⚠️ Two saves found</div>
        <div class="modal-body">
            <div class="prestige-box"><h4>This device</h4><span>${line(local)}</span></div>
            <div class="prestige-box"><h4>Cloud</h4><span>${line(cloud)}</span></div>
            <p class="muted small">Pick the one to keep. The other will be overwritten on the next cloud save.</p>
        </div>
        <div class="modal-footer"><button class="modal-btn btn-cancel" onclick="FI.resolveConflict('local')">Keep this device</button><button class="modal-btn btn-confirm" onclick="FI.resolveConflict('cloud')">Use cloud save</button></div>
    </div>`;
}

// ---------- live patches (every frame) ----------

export function patchLive(game, ui) {
    const state = game.state;
    const d = game.derived;
    const action = resolveAction(state);
    if (ui.tab === 'combat') {
        const c = state.combat;
        const e = c.enemy;
        const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
        set('player-hp-text', `${fmt(c.hp)} / ${fmt(d.maxHp)}`);
        if (e) set('enemy-hp-text', `${fmt(Math.max(0, e.hp))} / ${fmt(e.maxHp)}`);
        const pf = document.querySelector('#player-hp-bar .combat-fill'); if (pf) pf.style.width = `${Math.max(0, Math.min(100, c.hp / d.maxHp * 100))}%`;
        const ef = document.querySelector('#enemy-hp-bar .combat-fill'); if (ef && e) ef.style.width = `${Math.max(0, Math.min(100, e.hp / e.maxHp * 100))}%`;
        const af = document.getElementById('player-atk-fill'); if (af) af.style.width = c.active ? `${Math.min(100, c.playerTimer / d.attackInterval * 100)}%` : '0%';
        const combo = Math.floor(c.combo || 0);
        const cc = document.getElementById('combo-container'); if (cc) cc.style.display = combo > 0 ? '' : 'none';
        set('combo-text', `${combo}×`);
        const bt = document.getElementById('boss-timer-fill');
        if (bt && e?.boss) { bt.style.width = `${Math.max(0, c.bossTimeLeft / (e.timeLimit || BALANCE.combat.bossTimeMs) * 100)}%`; set('boss-timer-text', `⏳ ${Math.ceil(Math.max(0, c.bossTimeLeft) / 1000)}s`); }
        if (c.regroupLeft > 0) set('regroup-text', `⛺ Regrouping — boss retry in ${Math.ceil(c.regroupLeft / 1000)}s`);
    }
    set2('hdr-hp', fmt(state.combat.hp));
    if (action && state.action) {
        const interval = actionInterval(action.interval, d, action.skill);
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
