// Browser bootstrap: load the save, run the loop, render, and expose window.FI for the HTML handlers.

import { Game } from './game.js';
import { loadLocal, saveLocal, clearLocal, exportString, importString, CloudClient, chooseSave, LOCAL_KEY } from './core/save.js';
import { describeOffline } from './systems/offline.js';
import { renderNav, renderHeader, renderTab, patchLive, renderPrestigeModal, renderOfflineModal, renderAuthModal, renderConflictModal, TABS } from './ui/render.js';
import { isUnlocked } from './data/unlocks.js';
import { fmt } from './ui/format.js';
import { SKILLS } from './data/skills.js';
import { RESOURCES } from './data/resources.js';

const TICK_MS = 100;
const RENDER_MS = 250;
const AUTOSAVE_MS = 15000;
const CLOUD_SAVE_MS = 60000;

const ui = {
    tab: localStorage.getItem('fantasyIdle.tab') || 'combat',
    smithMetal: 'copper_bar',
    craftBar: 'silver_bar',
    craftGem: 'amethyst',
    invFilter: 'all',
    cloudStatus: '',
    modal: null,
    lastRender: 0,
    navDirty: true
};

const cloud = new CloudClient('/api');
const params = new URLSearchParams(location.search);
let game = new Game(loadLocal(Date.now()), Date.now());
if (params.has('dev')) game.state.settings.devUnlockAll = true;

// ---------- boot ----------

const offlineSummary = game.resumeFromSave(Date.now());
if (offlineSummary && (offlineSummary.mode !== 'rest' || offlineSummary.simulated > 5 * 60000)) openModal(renderOfflineModal(describeOffline(offlineSummary)));
if (cloud.loggedIn) syncFromCloud();
else if (!localStorage.getItem('fantasyIdle.authSeen') && !game.state.stats.kills) { openModal(renderAuthModal()); localStorage.setItem('fantasyIdle.authSeen', '1'); }

let lastSave = Date.now();
let lastCloudSave = Date.now();

setInterval(() => {
    const now = Date.now();
    const summary = game.tick(now);
    if (summary && summary.mode !== 'rest') openModal(renderOfflineModal(describeOffline(summary)));
    handleEvents(game.drainEvents());
    if (now - lastSave > AUTOSAVE_MS) save(now);
    if (cloud.loggedIn && game.state.settings.cloudSync && now - lastCloudSave > CLOUD_SAVE_MS) cloudSave(false);
    if (now - ui.lastRender > RENDER_MS) render();
}, TICK_MS);

function frame() { patchLive(game, ui); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { if (document.hidden) save(Date.now()); });
window.addEventListener('beforeunload', () => save(Date.now()));

// ---------- rendering ----------

function render() {
    ui.lastRender = Date.now();
    if (!isUnlocked(game.state, ui.tab) && !['inventory', 'settings'].includes(ui.tab)) ui.tab = 'combat';
    const nav = document.getElementById('nav');
    nav.innerHTML = renderNav(game, ui);
    document.getElementById('header').innerHTML = renderHeader(game, ui, cloud);
    const focus = document.activeElement;
    const interacting = focus && ['SELECT', 'INPUT', 'TEXTAREA'].includes(focus.tagName) && document.getElementById('tab').contains(focus);
    if (interacting) return; // don't yank an open dropdown or a drag out of the user's hands
    document.getElementById('tab').innerHTML = renderTab(game, ui, cloud);
    document.body.classList.toggle('reduced-motion', !!game.state.settings.reducedMotion);
}

function handleEvents(events) {
    for (const ev of events) {
        switch (ev.type) {
            case 'levelUp': toast(`${SKILLS[ev.skill].icon} ${SKILLS[ev.skill].name} level ${ev.level}!`, 'level'); break;
            case 'achievement': toast(`🏆 ${ev.name} — ${ev.reward}`, 'achievement'); break;
            case 'unlock': toast(`🔓 ${TABS.find(t => t.id === ev.id)?.name || ev.id} unlocked!`, 'unlock'); ui.navDirty = true; break;
            case 'itemCrafted': if (ev.item.rarity !== 'common') toast(`${ev.item.icon} ${ev.item.rarity} ${ev.item.name}!`, 'craft'); break;
            case 'toolMade': toast(`🛠️ New tool made!`, 'craft'); break;
            case 'death': toast(`💀 Defeated at stage ${ev.stage} — retreating`, 'death'); break;
            case 'prestige': toast(`✨ Prestige! +${ev.tokens} tokens, +${ev.skillPoints} SP`, 'prestige'); save(Date.now()); break;
            case 'minigameReady': if (ui.tab !== ev.skill) toast(`${SKILLS[ev.skill].icon} A ${SKILLS[ev.skill].name} chance appeared!`, 'minigame'); break;
            case 'minigameWin': toast(`Perfect! +${Math.round(ev.bonus * 100)}% speed`, 'minigame'); break;
            case 'error': toast(ev.text, 'error'); break;
            case 'kill': if (ev.enemy.boss) toast(`👑 ${ev.enemy.name} defeated! +${fmt(ev.gold)} gold`, 'boss'); if (ui.tab === 'combat') for (const drop of ev.drops) floatText(`+${drop.qty} ${RESOURCES[drop.id]?.icon || ''}`); break;
            case 'hit': if (ui.tab === 'combat' && ev.manual) { /* handled in clickAttack */ } break;
            default: break;
        }
    }
}

const toastArea = () => document.getElementById('toast-area');
function toast(text, kind = 'info') {
    const area = toastArea();
    if (!area) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
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

function openModal(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-overlay active">${html}</div>`;
    ui.modal = true;
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; ui.modal = null; }

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
            if (choice.conflict) { pendingConflict = { local: JSON.parse(game.serialize()), remote }; openModal(renderConflictModal(local, remote)); return; }
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
    if (summary && summary.mode !== 'rest') openModal(renderOfflineModal(describeOffline(summary)));
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
        if (layer && target && event) {
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

    equip(id) { game.equipItem(id); render(); },
    unequip(slot) { game.unequipItem(slot); render(); },
    sellItem(id) { game.sellItem(id); render(); },
    sellAll(rarity) { game.sellAllItems(rarity); render(); },
    upgrade(id) { game.upgradeItem(id); render(); },
    sellRes(id, amount) { game.sellResource(id, amount); render(); },
    invFilter(cat) { ui.invFilter = cat; render(); },
    buyShop(id) { game.buyGoldShopItem(id); render(); },
    buyPerk(id) { game.buyPerk(id); render(); },

    openPrestige() { if (game.canPrestige()) openModal(renderPrestigeModal(game)); },
    confirmPrestige() { closeModal(); game.prestige(); render(); },
    closeModal() { closeModal(); },

    startMinigame(skill) { game.startMinigame(skill); render(); },
    resolveMinigame(skill) { game.resolveMinigame(skill); render(); },
    failMinigame(skill) { game.failMinigame(skill); render(); },
    pumpHeat(skill) { game.pumpHeat(skill); },
    setDragValue(skill, value) { game.setDragValue(skill, value); },
    claimDaily() { const r = game.claimDaily(); if (r) toast(`📦 +${fmt(r.gold)} gold and materials!`, 'daily'); render(); },

    setSetting(key, value) { game.state.settings[key] = value; game.markDirty(); render(); },
    exportSave() {
        const text = exportString(game.serialize(Date.now()));
        const box = document.getElementById('save-io');
        if (box) box.value = text;
        navigator.clipboard?.writeText(text).then(() => toast('Save string copied to clipboard', 'info')).catch(() => toast('Save string placed in the box below', 'info'));
    },
    importSavePrompt() {
        const box = document.getElementById('save-io');
        try {
            const state = importString(box?.value || '');
            adoptState(state);
            toast('Save imported', 'info');
        } catch (err) { toast(err.message, 'error'); }
    },
    hardReset() {
        if (!confirm('Wipe your save completely? This cannot be undone.')) return;
        clearLocal();
        localStorage.removeItem('fantasyIdle.tab');
        game = new Game(null, Date.now());
        save(Date.now());
        render();
        toast('Save wiped. Fresh start!', 'info');
    },

    openAuth() { openModal(renderAuthModal()); },
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
