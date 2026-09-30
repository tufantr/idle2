// Browser bootstrap: load the save, run the loop, render, and expose window.FI for the HTML handlers.

import { Game } from './game.js';
import {
    loadLocal, saveLocal, clearLocal, exportStringCompressed, importStringAsync, CloudClient, chooseSave,
    writeBackup, rotateBackup, restoreBackup, BACKUP_INTERVAL_MS
} from './core/save.js';
import { describeOffline } from './systems/offline.js';
import { renderNav, renderHeader, renderTab, patchLive, renderPrestigeModal, renderOfflineModal, renderAuthModal, renderConflictModal, renderConfirmModal, TABS } from './ui/render.js';
import { isUnlocked } from './data/unlocks.js';
import { fmt } from './ui/format.js';
import { SKILLS } from './data/skills.js';
import { RESOURCES } from './data/resources.js';
import { CLAN_POLL_MS } from './data/social.js';

const TICK_MS = 100;
const MIN_RENDER_GAP_MS = 150;   // re-render at most this often when something changed
const MAX_RENDER_GAP_MS = 1000;  // and at least this often, for countdowns
const AUTOSAVE_MS = 15000;
const CLOUD_SAVE_MS = 60000;

// Browser storage can be blocked (private windows, the game embedded in another page). These are
// conveniences, so failures are ignored; the save itself goes through core/save.js, which checks too.
const prefs = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* not remembered */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* nothing to forget */ } }
};

const ui = {
    tab: prefs.get('fantasyIdle.tab') || 'combat',
    smithMetal: 'copper_bar',
    craftBar: 'silver_bar',
    craftGem: 'amethyst',
    invFilter: 'all',
    cloudStatus: '',
    saveIo: '',          // contents of the export/import box, kept across re-renders
    lastRender: 0,
    renderedRevision: -1,
    modalOpen: false,
    modalQueue: [],
    // Clan tab data, fetched only while that tab is open (at most once a minute). Reset on login/logout.
    social: freshSocial()
};

function freshSocial() {
    return {
        clan: null, clans: [], search: '', rewards: [], leaderboard: null, metric: 'bestStage', period: 'all', optIn: false,
        fetchedAt: 0, loading: false, loaded: false, error: '', seq: 0,
        form: { name: '', tag: '', description: '', lookingFor: '', search: '' } // typed values survive re-renders and errors
    };
}

const cloud = new CloudClient('/api');
const params = new URLSearchParams(location.search);
const loaded = loadLocal(Date.now());
let game = withDevFlags(new Game(loaded, Date.now()));
// When the local save was last written. Offline progress moves the game's clock to now, so the first
// cloud sync compares the cloud copy with this instead (or the local save would always look newer).
let bootSavedAt = loaded ? loaded.meta.savedAt : null;

// ?dev=1 unlocks every tab; ?dev=1&event=<id> runs that weekend event now (never kept without it).
function withDevFlags(g) {
    if (params.has('dev')) g.state.settings.devUnlockAll = true;
    g.state.settings.forceEvent = (params.has('dev') && params.get('event')) || null;
    return g;
}

// ---------- boot ----------

if (loaded) writeBackup(game.serialize(game.state.meta.savedAt), 'load', 'On load (before offline progress)');
const offlineSummary = game.resumeFromSave(Date.now());
if (offlineSummary && (offlineSummary.mode !== 'rest' || offlineSummary.simulated > 5 * 60000)) openModal(renderOfflineModal(describeOffline(offlineSummary)), 'offline');
if (cloud.loggedIn) syncFromCloud();
else if (!prefs.get('fantasyIdle.authSeen') && !game.state.stats.kills) { openModal(renderAuthModal(), 'auth'); prefs.set('fantasyIdle.authSeen', '1'); }

let lastSave = Date.now();
let lastBackup = Date.now();
let lastCloudSave = Date.now();

let tickErrorShown = false;
setInterval(() => {
    const now = Date.now();
    // A bug in one system must not stop saving or rendering (the prototype lost whole ticks this way).
    try {
        const summary = game.tick(now);
        if (summary && summary.mode !== 'rest') openModal(renderOfflineModal(describeOffline(summary)), 'offline');
    } catch (err) {
        console.error('Tick failed', err);
        if (!tickErrorShown) { toast('Something went wrong in the game loop — details in the console.', 'error'); tickErrorShown = true; }
        game.now = now;
    }
    handleEvents(game.drainEvents());
    if (now - lastSave > AUTOSAVE_MS) save(now);
    if (now - lastBackup > BACKUP_INTERVAL_MS) { lastBackup = now; rotateBackup(game.serialize(now), now); }
    if (cloud.loggedIn && !pendingConflict && game.state.settings.cloudSync && now - lastCloudSave > CLOUD_SAVE_MS) cloudSave(false);
    if (ui.tab === 'clan' && cloud.loggedIn && !ui.social.loading && now - ui.social.fetchedAt > CLAN_POLL_MS) refreshSocial();
    const changed = game.revision !== ui.renderedRevision;
    const pressing = pointer.down && now - pointer.downAt < 1000;
    if (!pressing && ((changed && now - ui.lastRender > MIN_RENDER_GAP_MS) || now - ui.lastRender > MAX_RENDER_GAP_MS)) {
        try { render(); } catch (err) { console.error('Render failed', err); }
    }
}, TICK_MS);

function frame() { patchLive(game, ui); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { if (document.hidden) save(Date.now()); });
window.addEventListener('pagehide', () => save(Date.now()));
window.addEventListener('beforeunload', () => save(Date.now()));

// A press in progress: re-rendering now would replace the button under the pointer and lose the click.
const pointer = { down: false, downAt: 0, keyAt: 0 };
document.addEventListener('pointerdown', () => { pointer.down = true; pointer.downAt = Date.now(); }, { capture: true, passive: true });
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => { pointer.down = false; }, { capture: true, passive: true });
// A choice made in a dropdown or checkbox is done: let the tab refresh right away.
document.addEventListener('change', event => {
    if (event.target?.matches?.('select, input[type="checkbox"], input[type="radio"]')) { event.target.blur(); render(); }
});

// Any input ends "focus" (the idle bonus); it comes back after a minute of leaving the game alone.
let lastInputNote = 0;
const noteInput = () => { const now = Date.now(); if (now - lastInputNote > 1000 || game.derived.focused) { lastInputNote = now; game.noteInput(now); } };
document.addEventListener('pointerdown', noteInput, { capture: true, passive: true });
document.addEventListener('keydown', event => {
    noteInput();
    pointer.keyAt = Date.now();
    // Keyboard access for the clickable cards (role="button").
    const target = event.target;
    if ((event.key === 'Enter' || event.key === ' ') && target?.getAttribute?.('role') === 'button') {
        event.preventDefault();
        target.click();
    }
    if (event.key === 'Escape' && ui.modalOpen && ui.modalOpen !== 'conflict') closeModal(); // a conflict needs a choice
}, { capture: true });

// ---------- rendering ----------

/** Replace an element's HTML only when it changed (keeps focus, hover and scroll where nothing moved). */
function setHtml(el, html) {
    if (el.__html === html) return;
    el.innerHTML = html;
    el.__html = html;
}

/** Is the player in the middle of typing, dragging or choosing inside the tab? Then leave it alone. */
function isInteracting(focus, tab) {
    if (!focus || !tab.contains(focus)) return false;
    if (focus.tagName === 'TEXTAREA') return true;
    if (focus.tagName === 'INPUT') return focus.type === 'range' ? pointer.down : !['checkbox', 'radio', 'button', 'submit'].includes(focus.type);
    if (focus.tagName === 'SELECT') return Date.now() - Math.max(pointer.downAt, pointer.keyAt) < 5000; // an open dropdown
    return false;
}

/** A way to find the same control after a re-render: its id, or its (unique) click handler. */
function focusFinder(el) {
    if (!el || el === document.body) return null;
    if (el.id) return () => document.getElementById(el.id);
    const handler = el.getAttribute?.('onclick');
    if (handler) return () => [...document.querySelectorAll('[onclick]')].find(e => e.getAttribute('onclick') === handler);
    return null;
}

function render() {
    ui.lastRender = Date.now();
    ui.renderedRevision = game.revision;
    if (!isUnlocked(game.state, ui.tab) && !['inventory', 'settings'].includes(ui.tab)) ui.tab = 'combat';
    const focus = document.activeElement;
    const findAgain = focusFinder(focus);
    const tab = document.getElementById('tab');
    setHtml(document.getElementById('nav'), renderNav(game, ui));
    setHtml(document.getElementById('header'), renderHeader(game, ui, cloud));
    if (!isInteracting(focus, tab)) setHtml(tab, renderTab(game, ui, cloud)); // don't yank a field out of the player's hands
    if (findAgain && document.activeElement !== focus) findAgain()?.focus({ preventScroll: true });
    document.body.classList.toggle('reduced-motion', !!game.state.settings.reducedMotion);
}

function handleEvents(events) {
    for (const ev of events) {
        switch (ev.type) {
            case 'levelUp': toast(`${SKILLS[ev.skill].icon} ${SKILLS[ev.skill].name} level ${ev.level}!`, 'level'); break;
            case 'achievement': toast(`🏆 ${ev.name} — ${ev.reward}`, 'achievement'); break;
            case 'unlock': toast(`🔓 ${TABS.find(t => t.id === ev.id)?.name || ev.id.charAt(0).toUpperCase() + ev.id.slice(1)} unlocked!`, 'unlock'); break;
            case 'itemCrafted': if (ev.item.rarity !== 'common') toast(`${ev.item.icon} ${ev.item.rarity} ${ev.item.name}!`, 'craft'); break;
            case 'itemDropped': if (['rare', 'epic', 'legendary'].includes(ev.item.rarity)) toast(`${ev.item.icon} ${ev.item.rarity} drop: ${ev.item.name}!`, ev.item.rarity === 'legendary' ? 'achievement' : 'craft'); break;
            case 'toolMade': toast('🛠️ New tool made!', 'craft'); break;
            case 'death': toast(`💀 Defeated at stage ${ev.stage} — retreating`, 'death'); break;
            case 'bossTimeout': toast(`⏳ The boss held out — regrouping for a minute`, 'death'); break;
            case 'prestige': toast(`✨ Prestige! +${ev.tokens} tokens, +${ev.skillPoints} SP`, 'prestige'); save(Date.now()); break;
            case 'minigameReady': if (ui.tab !== ev.skill) toast(`${SKILLS[ev.skill].icon} A ${SKILLS[ev.skill].name} chance appeared!`, 'minigame'); break;
            case 'minigameWin': toast(`Perfect! +${Math.round(ev.bonus * 100)}% speed`, 'minigame'); break;
            case 'error': toast(ev.text, 'error'); break;
            case 'dungeonClear': if (ev.clears <= 3 || ev.clears % 10 === 0) toast(`🎁 Dungeon cleared (${ev.clears})${ev.item ? ` — ${ev.item.name}` : ''}`, 'boss'); break;
            case 'dungeonFail': toast('🕳️ The dungeon run failed', 'death'); break;
            case 'titan': toast(ev.won ? `🗿 Titan defeated! Permanent +2% ATK and HP` : `🗿 The Titan survived — ${Math.round((ev.dealt || 0) * 100)}% damage dealt`, ev.won ? 'achievement' : 'death'); break;
            case 'pet': toast(`🐾 ${ev.pet.icon} ${ev.pet.name} joined you! ${ev.pet.desc}`, 'achievement'); break;
            case 'unique': toast(`🌟 Unique: ${ev.item.name}!`, 'achievement'); break;
            case 'obstacleBuilt': toast(`${ev.obstacle.icon} ${ev.obstacle.name} built — ${ev.obstacle.desc}`, 'achievement'); break;
            case 'eventMilestone': toast(`${ev.event.icon} ${ev.event.name}: ${ev.milestone.desc}!`, 'achievement'); break;
            case 'masteryLevel': if ([50, 75, 99].some(m => ev.from < m && ev.level >= m)) toast(`${SKILLS[ev.skill].icon} ${ev.name}: mastery ${ev.level}!`, ev.level >= 99 ? 'achievement' : 'level'); break;
            case 'kill':
                if (ev.enemy.boss) toast(`👑 ${ev.enemy.name} defeated! +${fmt(ev.gold)} gold`, 'boss');
                if (ui.tab === 'combat') for (const drop of ev.drops) floatText(`+${drop.qty} ${RESOURCES[drop.id]?.icon || ''}`);
                break;
            default: break;
        }
    }
}

function toast(text, kind = 'info') {
    const area = document.getElementById('toast-area');
    if (!area) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.textContent = text;
    area.appendChild(el);
    while (area.children.length > 5) area.removeChild(area.firstChild);
    setTimeout(() => el.classList.add('fade'), 3200);
    setTimeout(() => el.remove(), 3800);
}

function floatText(text) {
    const layer = document.getElementById('enemy-hit-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'enemy-hit-burst drop';
    el.style.left = `${30 + Math.random() * 40}%`;
    el.style.top = `${40 + Math.random() * 30}%`;
    el.textContent = text;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

// Modals queue up instead of replacing each other, so a login prompt can't hide the offline report.
// A key de-duplicates (a second offline report replaces the queued one).
function openModal(html, key = 'modal') {
    if (ui.modalOpen) {
        ui.modalQueue = ui.modalQueue.filter(m => m.key !== key);
        ui.modalQueue.push({ html, key });
        return;
    }
    showModal(html, key);
}
function showModal(html, key) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-overlay active" role="dialog" aria-modal="true">${html}</div>`;
    ui.modalOpen = key;
    root.querySelector('input, button.btn-confirm, button')?.focus();
}
let pendingConfirm = null;
/** Ask before something drastic, in the page (confirm() is blocked when the game is embedded). */
function askConfirm(title, text, confirmLabel, onYes) {
    pendingConfirm = onYes;
    openModal(renderConfirmModal(title, text, confirmLabel), 'confirm');
}
function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    ui.modalOpen = false;
    const next = ui.modalQueue.shift();
    if (next) showModal(next.html, next.key);
}

// ---------- persistence ----------

function save(now) {
    lastSave = now;
    saveLocal(game.serialize(now));
}

async function cloudSave(announce = true) {
    if (!cloud.loggedIn || pendingConflict) return; // never overwrite the cloud while the player is choosing
    lastCloudSave = Date.now();
    try {
        await cloud.push(JSON.parse(game.serialize(Date.now())));
        ui.cloudStatus = `Cloud save OK at ${new Date().toLocaleTimeString()}`;
        if (announce) toast('☁️ Saved to cloud', 'info');
    } catch (err) {
        ui.cloudStatus = `Cloud save failed: ${err.message}`;
        if (announce) toast(ui.cloudStatus, 'error');
    }
}

// ---------- clans, rewards, leaderboards ----------

async function refreshSocial() {
    if (!cloud.loggedIn) return;
    const social = ui.social;
    const seq = ++social.seq;
    const current = () => seq === social.seq && social === ui.social; // a newer refresh, or another account, took over
    social.loading = true;
    social.fetchedAt = Date.now();
    try {
        const [mine, rewards, board] = await Promise.all([cloud.myClan(), cloud.rewards(), cloud.leaderboard(social.metric, social.period)]);
        if (!current()) return;
        social.clan = mine.clan;
        Object.assign(social, { members: mine.members || [], boss: mine.boss || null, board: mine.board || [], attacksLeft: mine.attacksLeft || 0, attacksPerDay: mine.attacksPerDay || 3, maxMembers: mine.maxMembers || 20 });
        social.rewards = rewards.rewards || [];
        social.leaderboard = board;
        social.optIn = !!board.optIn;
        if (!social.clan) {
            const list = await cloud.clans(social.search);
            if (!current()) return;
            social.clans = list.clans || [];
            social.maxMembers = list.maxMembers || 20;
        }
        social.error = '';
        social.loaded = true;
    } catch (err) {
        if (current()) social.error = err.message;
    } finally {
        if (current()) { social.loading = false; render(); }
    }
}

async function socialAction(fn, success) {
    // Leave any clan form field, so the refreshed view isn't held back by the typing guard in render().
    if (document.activeElement && document.getElementById('tab').contains(document.activeElement)) document.activeElement.blur();
    try {
        const result = await fn();
        if (success) toast(typeof success === 'function' ? success(result) : success, 'info');
        await refreshSocial();
        return result;
    } catch (err) {
        toast(err.message, 'error');
        return null;
    }
}

let pendingConflict = null;
async function syncFromCloud() {
    try {
        const { state: remote } = await cloud.pull(Date.now());
        const live = game.state;
        const local = bootSavedAt ? { ...live, meta: { ...live.meta, savedAt: bootSavedAt } } : live;
        bootSavedAt = null;
        const choice = chooseSave(live.stats.kills || live.meta.playtimeMs > 60000 ? local : null, remote);
        if (choice.conflict && remote) {
            pendingConflict = { remote };
            openModal(renderConflictModal(local, remote, choice.pick), 'conflict');
            return;
        }
        if (choice.pick === 'cloud' && remote) {
            adoptState(remote);
            toast('☁️ Cloud save loaded', 'info');
        } else {
            await cloudSave(false);
        }
    } catch (err) {
        ui.cloudStatus = err.message;
        toast(err.message, 'error');
    }
}

function adoptState(stateObject) {
    game = withDevFlags(new Game(stateObject, Date.now()));
    const summary = game.resumeFromSave(Date.now());
    if (summary && summary.mode !== 'rest') openModal(renderOfflineModal(describeOffline(summary)), 'offline');
    save(Date.now());
    render();
}

// ---------- public facade for inline handlers ----------

window.FI = {
    switchTab(id) {
        ui.tab = id;
        prefs.set('fantasyIdle.tab', id);
        if (id === 'clan' && cloud.loggedIn && Date.now() - ui.social.fetchedAt > 5000) refreshSocial();
        render();
    },
    refreshSocial() { refreshSocial(); },
    clanForm(field, value) { if (field in ui.social.form) ui.social.form[field] = String(value || '').slice(0, 200); },
    searchClans() { ui.social.search = ui.social.form.search.slice(0, 32); document.activeElement?.blur(); refreshSocial(); },
    async createClan() {
        const { name, tag, description, lookingFor } = ui.social.form;
        const made = await socialAction(() => cloud.createClan({ name, tag, description, lookingFor }), 'Clan created');
        if (made) ui.social.form = { ...ui.social.form, name: '', tag: '', description: '', lookingFor: '' };
    },
    kickMember(username) {
        askConfirm('Remove this member?', `${username} leaves the clan. Their damage this week stays on the board.`, 'Remove',
            () => socialAction(() => cloud.kickMember(username), `Removed ${username}`));
    },
    joinClan(id) { socialAction(() => cloud.joinClan(id), 'Joined the clan'); },
    leaveClan() { askConfirm('Leave your clan?', 'Your damage this week stays on its board.', 'Leave clan', () => socialAction(() => cloud.leaveClan(), 'You left the clan')); },
    async clanAttack() {
        ui.social.attacking = true;
        render();
        await cloudSave(false); // the server attacks with the stored save, so upload the hero first
        await socialAction(() => cloud.clanAttack(), r => `⚔️ Hit the clan boss for ${fmt(r.damage)}${r.killed ? ' — and brought it down!' : ''}`);
        ui.social.attacking = false;
        render();
    },
    async claimRewards() {
        const ids = ui.social.rewards.map(r => r.id);
        const result = await socialAction(() => cloud.claimRewards(ids));
        for (const reward of result?.rewards || []) toast(`🎁 ${game.applyReward(reward)}`, 'achievement');
        if (result?.rewards?.length) { save(Date.now()); cloudSave(false); }
    },
    boardMetric(metric) { ui.social.metric = metric; refreshSocial(); },
    boardPeriod(period) { ui.social.period = period; refreshSocial(); },
    setLeaderboardConsent(on) { socialAction(() => cloud.setLeaderboardConsent(on).then(r => { ui.social.optIn = r.optIn; return r; }), on ? 'You joined the leaderboards' : 'You left the leaderboards'); },
    startNode(skill, node) { game.startNodeAction(skill, node); render(); },
    stopAction() { game.stopAction(); render(); },
    smelt(id) { game.startSmelting(id); render(); },
    smith(type, bar) { game.startSmithing(type, bar); render(); },
    craft(type, bar, gem) { game.startCrafting(type, bar, gem); render(); },
    makeTool(tool, tier) { game.startToolCraft(tool, tier); render(); },
    selectSmithMetal(bar) { ui.smithMetal = bar; render(); },
    selectCraftBar(bar) { ui.craftBar = bar; render(); },
    selectCraftGem(gem) { ui.craftGem = gem; render(); },

    toggleCombat() { game.toggleCombat(); render(); },
    clickAttack(event) {
        if (!game.clickAttack()) return;
        const flash = document.getElementById('combat-impact-flash');
        if (flash) { flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active'); }
        const sprite = document.getElementById('enemy-sprite');
        if (sprite) { sprite.classList.remove('enemy-struck'); void sprite.offsetWidth; sprite.classList.add('enemy-struck'); }
        const layer = document.getElementById('enemy-hit-layer');
        const target = event?.currentTarget;
        if (layer && target && event && event.clientX !== undefined) {
            const rect = target.getBoundingClientRect();
            const burst = document.createElement('div');
            burst.className = 'enemy-hit-burst';
            burst.style.left = `${event.clientX - rect.left}px`;
            burst.style.top = `${event.clientY - rect.top}px`;
            burst.textContent = game.state.combat.combo >= 10 ? 'CRACK!' : 'HIT!';
            layer.appendChild(burst);
            setTimeout(() => burst.remove(), 450);
        }
    },
    setAutoEat(rule) { game.setAutoEat(rule); },
    setPotion(id) { game.setPotion(id); render(); },
    stageNav(delta) { game.setStage(game.state.combat.stage + delta); render(); },
    toggleFarm(on) { game.setFarmMode(on); },
    buyCamp(id, count) { game.buyCampUpgrade(id, count); render(); },
    enterDungeon(id) { if (game.enterDungeon(id)) window.FI.switchTab('combat'); else render(); },
    setDungeonRepeat(on) { game.setDungeonRepeat(on); render(); },
    assembleUnique(id) { const item = game.assembleUnique(id); if (item) toast(`🌟 ${item.name} assembled!`, 'achievement'); render(); },
    challengeTitan() { if (game.challengeTitan()) window.FI.switchTab('combat'); else render(); },

    plant(plot, crop) { ui.lastCrop = crop; game.plant(plot, crop); render(); },
    buyEventItem(id) { if (game.buyEventItem(id)) toast('🎉 Bought!', 'info'); render(); },
    harvest(plot) { game.harvest(plot); render(); },
    harvestAll() { const r = game.harvestAll({ replant: true }); if (r.harvested) toast(`🌾 Harvested ${r.harvested} plot${r.harvested > 1 ? 's' : ''}${r.replanted ? `, replanted ${r.replanted}` : ''}`, 'info'); render(); },
    buildObstacle(id) { game.buildObstacle(id); render(); },
    upgradeObstacle(slot) { game.upgradeObstacle(slot); render(); },
    runCourse() { if (game.state.action?.kind === 'agility') game.stopAction(); else game.startAgility(); render(); },

    equip(id) { game.equipItem(id); render(); },
    unequip(slot) { game.unequipItem(slot); render(); },
    sellItem(id) { game.sellItem(id); render(); },
    sellAll(rarity) { game.sellAllItems(rarity); render(); },
    upgrade(id) { game.upgradeItem(id); render(); },
    reforge(id) { game.reforgeItem(id); render(); },
    salvage(id) { const g = game.salvageItem(id); if (g) toast(`♻️ +${g.essence} essence${Object.keys(g.materials).length ? ' and materials' : ''}`, 'info'); render(); },
    salvageAll(rarity) { const r = game.salvageAll(rarity); if (r.count) toast(`♻️ Salvaged ${r.count} items (+${r.essence} essence)`, 'info'); render(); },
    toggleLock(id) { game.toggleLock(id); render(); },
    setAutoSalvage(rarity) { game.setAutoSalvage(rarity); render(); },
    sellRes(id, amount) { game.sellResource(id, amount); render(); },
    invFilter(cat) { ui.invFilter = cat; render(); },
    buyShop(id) { game.buyGoldShopItem(id); render(); },
    buyPerk(id) { game.buyPerk(id); render(); },

    openPrestige() { if (game.canPrestige()) openModal(renderPrestigeModal(game), 'prestige'); },
    confirmPrestige() {
        writeBackup(game.serialize(Date.now()), 'prestige', `Before prestige ${game.state.prestige.count + 1}`);
        closeModal();
        game.prestige();
        render();
    },
    closeModal() { closeModal(); },

    startMinigame(skill) { game.startMinigame(skill); render(); },
    resolveMinigame(skill) { game.resolveMinigame(skill); render(); },
    failMinigame(skill) { game.failMinigame(skill); render(); },
    pumpHeat(skill) { game.pumpHeat(skill); },
    setDragValue(skill, value) { game.setDragValue(skill, value); },
    claimDaily() { const r = game.claimDaily(); if (r) toast(`📦 +${fmt(r.gold)} gold, +${r.essence} essence and materials!`, 'daily'); render(); },
    advisorGo(tab, action) {
        if (action === 'claimDaily') return window.FI.claimDaily();
        if (tab) window.FI.switchTab(tab);
    },

    setSetting(key, value) { game.state.settings[key] = value; game.markDirty(); render(); },
    async exportSave() {
        const text = await exportStringCompressed(game.serialize(Date.now()));
        ui.saveIo = text;
        const box = document.getElementById('save-io');
        if (box) box.value = text;
        navigator.clipboard?.writeText(text).then(() => toast('Save string copied to clipboard', 'info')).catch(() => toast('Save string placed in the box below', 'info'));
    },
    setSaveIo(value) { ui.saveIo = value; },
    async importSavePrompt() {
        try {
            const state = await importStringAsync(ui.saveIo || document.getElementById('save-io')?.value || '');
            writeBackup(game.serialize(Date.now()), 'reset', 'Before import');
            ui.saveIo = '';
            adoptState(state);
            toast('Save imported', 'info');
        } catch (err) { toast(err.message, 'error'); }
    },
    restoreBackup(slot) {
        askConfirm('Restore this backup?', 'Your current progress will be replaced. A backup of it is kept.', 'Restore backup', () => {
            try {
                const state = restoreBackup(slot, Date.now());
                writeBackup(game.serialize(Date.now()), slot === 'reset' ? 'auto0' : 'reset', 'Before restoring a backup');
                adoptState(state);
                toast('Backup restored', 'info');
            } catch (err) { toast(err.message, 'error'); }
        });
    },
    hardReset() {
        askConfirm('Wipe your save?', 'The game starts over from the beginning. One backup is kept in Settings in case you change your mind.', 'Wipe save', () => {
            writeBackup(game.serialize(Date.now()), 'reset', 'Before hard reset');
            clearLocal();
            prefs.remove('fantasyIdle.tab');
            game = withDevFlags(new Game(null, Date.now()));
            save(Date.now());
            render();
            toast('Save wiped. Fresh start!', 'info');
        });
    },
    confirmYes() {
        const onYes = pendingConfirm;
        pendingConfirm = null;
        closeModal();
        onYes?.();
    },

    openAuth() { openModal(renderAuthModal(), 'auth'); },
    async auth(kind) {
        const user = document.getElementById('auth-user')?.value.trim();
        const pass = document.getElementById('auth-pass')?.value;
        const err = document.getElementById('auth-error');
        if (!user || !pass) { if (err) err.textContent = 'Username and password are required.'; return; }
        try {
            if (kind === 'login') await cloud.login(user, pass); else await cloud.register(user, pass);
            ui.social = freshSocial(); // nothing from the previous account carries over
            closeModal();
            toast(`☁️ Signed in as ${cloud.username}`, 'info');
            await syncFromCloud();
            render();
        } catch (e) { if (err) err.textContent = e.message; }
    },
    logout() { cloud.logout(); ui.cloudStatus = ''; ui.social = freshSocial(); toast('Logged out — playing locally', 'info'); render(); },
    cloudSaveNow() { cloudSave(true); },
    resolveConflict(pick) {
        closeModal();
        if (!pendingConflict) return;
        const { remote } = pendingConflict;
        pendingConflict = null;
        if (pick === 'cloud') adoptState(remote); else cloudSave(false);
        render();
    },
    game: () => game
};

render();
