// Browser bootstrap: load the save, run the loop, render, and expose window.FI for the HTML handlers.

import { Game } from './game.js';
import {
    loadLocal, saveLocal, clearLocal, exportStringCompressed, importStringAsync, CloudClient, chooseSave,
    writeBackup, rotateBackup, restoreBackup, BACKUP_INTERVAL_MS
} from './core/save.js';
import { describeOffline } from './systems/offline.js';
import { renderNav, renderHeader, renderTab, patchLive, renderPrestigeModal, renderOfflineModal, renderAuthModal, renderConflictModal, TABS } from './ui/render.js';
import { isUnlocked } from './data/unlocks.js';
import { fmt } from './ui/format.js';
import { SKILLS } from './data/skills.js';
import { RESOURCES } from './data/resources.js';

const TICK_MS = 100;
const MIN_RENDER_GAP_MS = 150;   // re-render at most this often when something changed
const MAX_RENDER_GAP_MS = 1000;  // and at least this often, for countdowns
const AUTOSAVE_MS = 15000;
const CLOUD_SAVE_MS = 60000;

const ui = {
    tab: localStorage.getItem('fantasyIdle.tab') || 'combat',
    smithMetal: 'copper_bar',
    craftBar: 'silver_bar',
    craftGem: 'amethyst',
    invFilter: 'all',
    cloudStatus: '',
    saveIo: '',          // contents of the export/import box, kept across re-renders
    lastRender: 0,
    renderedRevision: -1,
    modalOpen: false,
    modalQueue: []
};

const cloud = new CloudClient('/api');
const params = new URLSearchParams(location.search);
const loaded = loadLocal(Date.now());
let game = new Game(loaded, Date.now());
if (params.has('dev')) game.state.settings.devUnlockAll = true;

// ---------- boot ----------

if (loaded) writeBackup(game.serialize(game.state.meta.savedAt), 'load', 'On load (before offline progress)');
const offlineSummary = game.resumeFromSave(Date.now());
if (offlineSummary && (offlineSummary.mode !== 'rest' || offlineSummary.simulated > 5 * 60000)) openModal(renderOfflineModal(describeOffline(offlineSummary)), 'offline');
if (cloud.loggedIn) syncFromCloud();
else if (!localStorage.getItem('fantasyIdle.authSeen') && !game.state.stats.kills) { openModal(renderAuthModal(), 'auth'); localStorage.setItem('fantasyIdle.authSeen', '1'); }

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
    if (cloud.loggedIn && game.state.settings.cloudSync && now - lastCloudSave > CLOUD_SAVE_MS) cloudSave(false);
    const changed = game.revision !== ui.renderedRevision;
    if ((changed && now - ui.lastRender > MIN_RENDER_GAP_MS) || now - ui.lastRender > MAX_RENDER_GAP_MS) {
        try { render(); } catch (err) { console.error('Render failed', err); }
    }
}, TICK_MS);

function frame() { patchLive(game, ui); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { if (document.hidden) save(Date.now()); });
window.addEventListener('pagehide', () => save(Date.now()));
window.addEventListener('beforeunload', () => save(Date.now()));

// Any input ends "focus" (the idle bonus); it comes back after a minute of leaving the game alone.
let lastInputNote = 0;
const noteInput = () => { const now = Date.now(); if (now - lastInputNote > 1000 || game.derived.focused) { lastInputNote = now; game.noteInput(now); } };
document.addEventListener('pointerdown', noteInput, { capture: true, passive: true });
document.addEventListener('keydown', event => {
    noteInput();
    // Keyboard access for the clickable cards (role="button").
    const target = event.target;
    if ((event.key === 'Enter' || event.key === ' ') && target?.getAttribute?.('role') === 'button') {
        event.preventDefault();
        target.click();
    }
    if (event.key === 'Escape' && ui.modalOpen) closeModal();
}, { capture: true });

// ---------- rendering ----------

function render() {
    ui.lastRender = Date.now();
    ui.renderedRevision = game.revision;
    if (!isUnlocked(game.state, ui.tab) && !['inventory', 'settings'].includes(ui.tab)) ui.tab = 'combat';
    document.getElementById('nav').innerHTML = renderNav(game, ui);
    document.getElementById('header').innerHTML = renderHeader(game, ui, cloud);
    const focus = document.activeElement;
    const tab = document.getElementById('tab');
    const interacting = focus && ['SELECT', 'INPUT', 'TEXTAREA'].includes(focus.tagName) && tab.contains(focus);
    if (interacting) return; // don't yank an open dropdown or a drag out of the user's hands
    const focusedId = focus && tab.contains(focus) ? focus.id : null;
    tab.innerHTML = renderTab(game, ui, cloud);
    if (focusedId) document.getElementById(focusedId)?.focus();
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
    if (!cloud.loggedIn) return;
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

let pendingConflict = null;
async function syncFromCloud() {
    try {
        const { state: remote } = await cloud.pull(Date.now());
        const local = game.state;
        const choice = chooseSave(local.stats.kills || local.meta.playtimeMs > 60000 ? local : null, remote);
        if (choice.pick === 'cloud' && remote) {
            if (choice.conflict) { pendingConflict = { remote }; openModal(renderConflictModal(local, remote), 'conflict'); return; }
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
    game = new Game(stateObject, Date.now());
    const summary = game.resumeFromSave(Date.now());
    if (summary && summary.mode !== 'rest') openModal(renderOfflineModal(describeOffline(summary)), 'offline');
    save(Date.now());
    render();
}

// ---------- public facade for inline handlers ----------

window.FI = {
    switchTab(id) { ui.tab = id; localStorage.setItem('fantasyIdle.tab', id); render(); },
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
        if (!confirm('Restore this backup? Your current progress will be replaced (a backup of it is kept).')) return;
        try {
            const state = restoreBackup(slot, Date.now());
            writeBackup(game.serialize(Date.now()), slot === 'reset' ? 'auto0' : 'reset', 'Before restoring a backup');
            adoptState(state);
            toast('Backup restored', 'info');
        } catch (err) { toast(err.message, 'error'); }
    },
    hardReset() {
        if (!confirm('Wipe your save completely? A single backup is kept in Settings in case you change your mind.')) return;
        writeBackup(game.serialize(Date.now()), 'reset', 'Before hard reset');
        clearLocal();
        localStorage.removeItem('fantasyIdle.tab');
        game = new Game(null, Date.now());
        save(Date.now());
        render();
        toast('Save wiped. Fresh start!', 'info');
    },

    openAuth() { openModal(renderAuthModal(), 'auth'); },
    async auth(kind) {
        const user = document.getElementById('auth-user')?.value.trim();
        const pass = document.getElementById('auth-pass')?.value;
        const err = document.getElementById('auth-error');
        if (!user || !pass) { if (err) err.textContent = 'Username and password are required.'; return; }
        try {
            if (kind === 'login') await cloud.login(user, pass); else await cloud.register(user, pass);
            closeModal();
            toast(`☁️ Signed in as ${cloud.username}`, 'info');
            await syncFromCloud();
            render();
        } catch (e) { if (err) err.textContent = e.message; }
    },
    logout() { cloud.logout(); ui.cloudStatus = ''; toast('Logged out — playing locally', 'info'); render(); },
    cloudSaveNow() { cloudSave(true); },
    resolveConflict(pick) {
        closeModal();
        if (!pendingConflict) return;
        if (pick === 'cloud') adoptState(pendingConflict.remote); else cloudSave(false);
        pendingConflict = null;
        render();
    },
    game: () => game
};

render();
