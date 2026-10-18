// Browser bootstrap: load the save, run the loop, render, and expose window.FI for the HTML handlers.

import { Game } from './game.js';
import {
    loadLocal, saveLocal, clearLocal, CloudClient, syncChoice,
    writeBackup, rotateBackup, restoreBackup, BACKUP_INTERVAL_MS, localLoadProblem, LOCAL_KEY
} from './core/save.js';
import { renderNav, renderNavNext, renderHeader, renderTab, renderHotbar, patchLive, renderPrestigeModal, renderPerksModal, renderWelcomeBack, renderAuthModal, renderIntroModal, renderConfirmModal, renderItemDetail, renderRunChoiceModal, battleMode, tabIcon, pageTitle, medalArt, TABS } from './ui/render.js';
import { choosingAfterClear } from './systems/dungeon.js';
import { achievementById } from './data/achievements.js';
import { renderAboutCard, FEATURES, EVENT_ART, DUNGEON_ART, ZONE_LINES, paintStyle, fightTab } from './ui/features.js';
import { renderWorldMapModal, renderZoneInfo, renderDungeonInfo } from './ui/worldmap.js';
import { createScene } from './ui/scene.js';
import { createRewards, levelCelebration, unlockCelebration, renderCrateModal } from './ui/rewards.js';
import { createActionFx } from './ui/actionfx.js';
import { createSound } from './ui/sound.js';
import { createStage } from './ui/stage.js';
import { createGuide } from './ui/guide.js';
import { ATLAS, sprite, heroSprite, heroLayers, resIcon, toolIcon, itemSpriteKey, monsterSpriteKey, glyph } from './ui/sprites.js';
import { rankFor } from './data/ranks.js';
import { isUnlocked } from './data/unlocks.js';
import { fmt, escapeHtml, gainMarkup, stagesWords, duration } from './ui/format.js';
import { withArticle } from './core/text.js';
import { isUpgrade, canWear, equipGain, gainStages } from './systems/inventory.js';
import { SKILLS } from './data/skills.js';
import { CLAN_POLL_MS, clanBossFor } from './data/social.js';
import { AGILITY_SLOTS } from './data/agility.js';
import { dungeonById } from './data/dungeons.js';
import { cratesTowardGreat } from './systems/daily.js';
import { seen } from './systems/disclosure.js';
import { nextLook, lookForMedal } from './data/looks.js';
import { capeFor, festivalCloak } from './data/capes.js';
import { ZONES, STAGES_PER_ZONE } from './data/zones.js';
import { RESOURCES } from './data/resources.js';
import { RARITIES, MYTHIC, PRIMAL } from './data/items.js';
import { playtestExport } from './systems/playtest.js';
import { trialById, TRIAL_TIERS } from './data/trials.js';
import { STRATUM_STAGES, stratumById } from './data/strata.js';
import { nextTrialTarget, weeklyGoal } from './systems/trials.js';
import { BASE } from './core/modifiers.js';

const BASE_RECORD_MULT = BASE.recordMult;

const TICK_MS = 100;
const MIN_RENDER_GAP_MS = 150;   // re-render at most this often when something changed
const MAX_RENDER_GAP_MS = 1000;  // and at least this often, for countdowns
const DEFEAT_HOLD_MS = 2400;     // a lost dungeon run stays on screen this long before the list of dungeons comes back
const AUTOSAVE_MS = 15000;
// Cloud saves: every minute while the page is open, in the background too, and once on leaving it (the
// owner, October 2026, once the game had its own server: "traffic is not an issue"). On Vercel's free Neon
// database, which slept after five minutes without a request, it was every ten minutes and only while the
// player was around; a page in the background uploaded nothing.
const CLOUD_SAVE_MS = 60000;
const CLOUD_AWAY_MS = 10 * 60000;    // back after this long away: another device may have played meanwhile
const CLOUD_LEAVE_GAP_MS = 5000;     // leaving within seconds of an upload sends no other
const TITAN_HOLD_MS = 2400;      // the Titan's fight keeps the screen this long after it ends (its last banner)

// Browser storage can be blocked (private windows, the game embedded in another page). These are
// conveniences, so failures are ignored; the save itself goes through core/save.js, which checks too.
const prefs = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* not remembered */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* nothing to forget */ } }
};

const ui = {
    auth: null,          // the account dialog's step: { mode, username, email (as shown), resetEmail } (showAuth)
    tab: (t => (t === 'fishing' ? 'hunting' : t))(prefs.get('fantasyIdle.tab') || 'combat'),   // (Fishing joined Hunting)
    fresh: loadFresh(),  // tabs unlocked but not visited yet: a "New" badge in the sidebar
    smithView: 'smelt',  // the step of Smithing on screen: smelt, forge, anvil or tools
    potionMenu: false,   // the skill potion's tray, open under its chip in a skill's header
    hallView: 'medals',  // the view of the hall of trophies: medals, bestiary or collection
    smithMetal: null,    // null: the best metal there are bars for
    craftBar: null,
    craftGem: null,
    open: {},            // drawers the player has opened (the battle log, the crop table)
    battleFull: prefs.get('fantasyIdle.battleFull') !== '0', // the fight fills the screen while it lasts; false once the player folds it away (until the next fight)
    battleHoldUntil: 0,  // a fight that ended keeps the screen until then (its last banner shows), when the hero goes back to work
    dungeonHoldUntil: 0, // a fight on the Dungeons tab that ended keeps that tab on it until then (fightTab in ui/features.js)
    clanHoldUntil: 0,    // a clan boss fight that ended while watched keeps the Clan tab on it until then (fightTab in ui/features.js)
    invFilter: 'all',
    resSelected: null,
    invSelected: null,   // the item on the table in the inventory (an item id)
    invPreview: null,    // the item under the pointer, shown instead while hovered
    cloudStatus: '',
    beginAfterSignIn: false,   // the title card's Begin asked for an account: its first fight starts once it is made
    lastRender: 0,
    renderedRevision: -1,
    modalOpen: false,
    modalQueue: [],
    // Clan tab data, fetched only while that tab is open (at most once a minute). Reset on login/logout.
    social: freshSocial()
};

function loadFresh() {
    try {
        const ids = JSON.parse(prefs.get('fantasyIdle.fresh') || '[]');
        return new Set(Array.isArray(ids) ? ids.filter(id => TABS.some(t => t.id === id)) : []);
    } catch { return new Set(); }
}
function markFresh(id, on) {
    if (on === ui.fresh.has(id)) return;
    if (on) ui.fresh.add(id); else ui.fresh.delete(id);
    prefs.set('fantasyIdle.fresh', JSON.stringify([...ui.fresh]));
}

function freshSocial() {
    return {
        clan: null, clans: [], search: '', rewards: [], leaderboard: null, metric: 'bestStage', period: 'all', optIn: false,
        fetchedAt: 0, loading: false, loaded: false, error: '', seq: 0,
        form: { name: '', tag: '', description: '', lookingFor: '', search: '' } // typed values survive re-renders and errors
    };
}

const cloud = new CloudClient('/api');
const params = new URLSearchParams(location.search);
// A local development host (tools/serve.py, the screenshot and test tools): dev flags work there, and the
// game plays as a guest. Anywhere else the game needs an account (the owner's call, October 2026: the
// server's save is the game, as in any online game), and a sign-in stands in front of it until there is one.
const DEV_HOST = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(location.hostname);
const SIGN_IN_REQUIRED = !DEV_HOST;
const needsSignIn = () => SIGN_IN_REQUIRED && !cloud.loggedIn;
// Signed in, the server's save is the game (syncChoice in core/save.js): nothing goes up until a sync has
// looked at it and chosen (an upload before that put a guest's or a stale game over the account's). A
// failed sync is tried again.
let cloudReady = false;
let synced = false;           // this page has played a game it looked up on the server: one taken later is another device's play
let syncing = false;
let syncRetryAt = 0;
let heldReport = null;       // the boot's welcome-back, held until the sync has chosen which game is played
const SYNC_RETRY_MS = 45000;
let syncFailNoted = false;
let loaded = loadLocal(Date.now());
// A save that can't be read (save.js keeps a copy) or can't be run: the game starts fresh, the automatic
// backups are left alone, and the player is shown where the backups are.
let loadProblem = !!localLoadProblem();
let game;
try {
    game = withDevFlags(new Game(loaded, Date.now()));
} catch (err) {
    console.error('The save could not be started; kept a copy', err);
    try { localStorage.setItem(`${LOCAL_KEY}.corrupt.${Date.now()}`, localStorage.getItem(LOCAL_KEY) || ''); } catch { /* storage full */ }
    loaded = null;
    loadProblem = true;
    game = withDevFlags(new Game(null, Date.now()));
}

// One tab plays the save: a tab opened later takes it over, and the older one stops. Two tabs used to
// save their own games over each other's, and whichever wrote last won, often the forgotten one.
const TAB_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
const OWNER_KEY = 'fantasyIdle.owner';
let passive = false;
try { localStorage.setItem(OWNER_KEY, TAB_ID); } catch { /* no storage: this tab is all there is */ }
function ownsSave() {
    try { const owner = localStorage.getItem(OWNER_KEY); return !owner || owner === TAB_ID; } catch { return true; }
}
function becomePassive() {
    if (passive) return;
    passive = true;
    ui.modalQueue = [];
    showModal(`<div class="modal-content"><div class="modal-header">Playing in another tab</div>
        <div class="modal-body"><p>The game was opened in another tab or window, and it plays there now. This one has stopped, so the two can't save over each other.</p></div>
        <div class="modal-footer"><button class="modal-btn btn-confirm" onclick="location.reload()">Play here</button></div></div>`, 'elsewhere');
}
window.addEventListener('storage', event => { if (event.key === OWNER_KEY && event.newValue && event.newValue !== TAB_ID) becomePassive(); });

// The battle stage above the combat tab: built once, animated from game events (src/ui/scene.js).
const scene = createScene(document.getElementById('scene'), {
    strike: () => { advance(Date.now()); return game.clickAttack(); }, // on the real clock, not the last tick's
    toggle: () => window.FI.toggleCombat(),
    stage: n => { game.setStage(n); render(); },
    map: () => window.FI.openMap(),
    sound: name => sound.play(name),
    pat: () => game.patPet(),
    chest: () => window.FI.openRunChoice()
});

// Layers above the page: celebrations for the big moments (src/ui/rewards.js), the work popping off
// skill cards (src/ui/actionfx.js), and the phone hotbar.
const layer = (tag, id) => document.body.appendChild(Object.assign(document.createElement(tag), { id }));
// A boss fight in view: its clock and its health are what the player watches, so cards wait until it ends.
const bossOnScreen = () => { const c = game.state.combat; return ui.tab === fightTab(game, ui) && c.active && !!c.enemy?.boss && !c.farmMode; };
const rewards = createRewards(layer('div', 'celebrate'), { blocked: () => !!ui.modalOpen || bossOnScreen(), go: tab => window.FI.switchTab(tab) }); // cards wait behind dialogs and boss fights
const actionFx = createActionFx(layer('div', 'work-fx'));
const hotbar = layer('nav', 'hotbar');
hotbar.setAttribute('aria-label', 'Shortcuts');
// Sound and haptics (src/ui/sound.js): one setting, unlocked by the first click or key.
const sound = createSound(() => game.state.settings.sound !== false, () => game.state.settings.volume ?? 1);
// The sprite atlas (its versioned URL and its size), for the CSS that cuts cells out of it.
document.documentElement.style.setProperty('--atlas', `url(${ATLAS.url})`); // versioned, so a new layout never meets an old cached sheet
document.documentElement.style.setProperty('--atlas-w', `${ATLAS.cell * ATLAS.cols}px`);
document.documentElement.style.setProperty('--atlas-h', `${ATLAS.cell * ATLAS.rows}px`);

// The skill stage above each skill tab: the hero at work (src/ui/stage.js).
const stage = createStage(document.getElementById('stage'), { sound: name => sound.play(name), pat: () => game.patPet() });
// A new hero's first minutes: a hand on the one thing to do (src/ui/guide.js).
const guide = createGuide(document.body);

// ?dev=1 unlocks every tab; ?dev=1&event=<id> runs that weekend event now (never kept without it).
// Only on a local development host (tools/serve.py, the screenshot tool): on the live site they would
// open every dungeon, the Titan and any event's bonuses to anyone, so there they are ignored, and a save
// that picked them up before is cleaned (the server also flags an upload that has them on).
function withDevFlags(g) {
    g.setAttending(!document.hidden);   // every game made here starts knowing whether the page is in view
    if (!DEV_HOST) {
        g.state.settings.devUnlockAll = false;
        g.state.settings.forceEvent = null;
        return g;
    }
    if (params.has('dev')) g.state.settings.devUnlockAll = true;
    g.state.settings.forceEvent = (params.has('dev') && params.get('event')) || null;
    return g;
}

// ---------- boot ----------

if (loaded) writeBackup(game.serialize(game.state.meta.savedAt), 'load', 'On load (before offline progress)');
const offlineSummary = game.resumeFromSave(Date.now());
const bootReport = offlineSummary && (offlineSummary.mode !== 'rest' || offlineSummary.simulated > 5 * 60000) ? offlineSummary : null;
// Signed in, the cloud may hold a newer game: this one's report waits until the sync has chosen (shown at
// once, it stayed up over the cloud's game, and its buttons acted on that game's items).
if (bootReport && (cloud.loggedIn || SIGN_IN_REQUIRED)) heldReport = bootReport;
else if (bootReport) openModal(renderWelcomeBack(bootReport, game), 'offline');
if (loadProblem && !cloud.loggedIn && !SIGN_IN_REQUIRED) setTimeout(() => askConfirm('Your save could not be read', 'A copy of it was kept, and the game started fresh. Your backups are in Settings: restore one to carry on where you were.', 'Open Settings', () => window.FI.switchTab('settings')), 0);
if (cloud.loggedIn) syncFromCloud();
// A new player meets the game first, not a login form: a title card, then straight into a fight.
// Signing in stays one click away (on the card, and in the header once there is progress to keep).
else if (!prefs.get('fantasyIdle.introSeen') && !prefs.get('fantasyIdle.authSeen') && !game.state.stats.kills) { openModal(renderIntroModal(game.state), 'intro'); prefs.set('fantasyIdle.introSeen', '1'); }
if (needsSignIn() && !ui.modalOpen) openSignIn();   // a returning player meets the sign-in (a new one, the title card first)

let lastSave = Date.now();
let lastBackup = Date.now();
let lastCloudSave = Date.now();
let lastPresenceAt = Date.now();   // the player's last touch, or the page coming back into view
const playerAround = now => !document.hidden && now - lastPresenceAt < CLOUD_AWAY_MS;

/** Run the game up to `now`. A long gap (a sleeping laptop, a background tab) is replayed as offline progress and reported. */
function advance(now) {
    const summary = game.tick(now);
    if (summary && summary.mode !== 'rest') openModal(renderWelcomeBack(summary, game), 'offline');
}

let tickErrorShown = false;
setInterval(() => {
    if (passive) return;   // the game plays in another tab now
    const now = Date.now();
    // The clock turned back: the save clocks start again from now (they waited for it to catch up).
    if (now < lastSave - 5000) lastSave = lastBackup = lastCloudSave = now;
    // A bug in one system must not stop saving or rendering (the prototype lost whole ticks this way).
    try {
        advance(now);
    } catch (err) {
        console.error('Tick failed', err);
        if (!tickErrorShown) { toast('Something went wrong in the game loop — details in the console.', 'error'); tickErrorShown = true; }
        game.now = now;
    }
    try { handleEvents(game.drainEvents()); } catch (err) { console.error('Events failed', err); }   // never at the cost of the save below
    if (game.state.clanResult && cloud.loggedIn && cloudReady) sendClanResult();   // a clan attack fought, not yet sent
    if (needsSignIn() && !ui.modalOpen) openSignIn();   // signed out, or a session that expired: the game waits for an account
    if (now - lastSave > AUTOSAVE_MS) save(now);
    // (not while a save that couldn't be read waits to be restored: these would write over its backups)
    if (now - lastBackup > BACKUP_INTERVAL_MS && !loadProblem) { lastBackup = now; rotateBackup(game.serialize(now), now); }
    // the sync that failed, tried again (until it has chosen, nothing is uploaded)
    if (cloud.loggedIn && !cloudReady && !syncing && !document.hidden && now >= syncRetryAt) syncFromCloud();
    if (cloud.loggedIn && cloudReady && game.state.settings.cloudSync && now - lastCloudSave > CLOUD_SAVE_MS) cloudSave(false);
    // the Clan tab's board, only while someone is there (an untouched page kept the free database awake)
    if (ui.tab === 'clan' && playerAround(now) && cloud.loggedIn && !ui.social.loading && now - ui.social.fetchedAt > CLAN_POLL_MS) refreshSocial();
    const changed = game.revision !== ui.renderedRevision;
    const pressing = pointer.down && now - pointer.downAt < 1000;
    if (!pressing && ((changed && now - ui.lastRender > MIN_RENDER_GAP_MS) || now - ui.lastRender > MAX_RENDER_GAP_MS)) {
        try { render(); } catch (err) { console.error('Render failed', err); }
    }
}, TICK_MS);

function frame(now) {
    // (the next frame is asked for first: a frame that throws must not stop the scene for the session)
    requestAnimationFrame(frame);
    try {
        patchLive(game, ui);
        scene.frame(game);
        stage.frame(game);
        guide.frame({ modal: !!ui.modalOpen, card: !!document.querySelector('#celebrate .celebration') });
        paintGold(now);
    } catch (err) { console.error('Frame failed', err); }
}

// The gold counter rolls up to a new total instead of jumping (and drops at once when gold is spent).
let goldShown = null;
let goldPaintedAt = 0;
function paintGold(now = performance.now()) {
    const node = document.getElementById('hdr-gold');
    if (!node) return;
    const target = game.state.gold;
    const dt = Math.min(250, Math.max(0, now - (goldPaintedAt || now)));
    goldPaintedAt = now;
    const still = document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (goldShown === null || target < goldShown || still) goldShown = target;
    else goldShown += (target - goldShown) * Math.min(1, dt / 220);
    if (target - goldShown <= Math.max(1, target * 1e-4)) goldShown = target;
    const text = fmt(goldShown);
    if (node.textContent !== text) node.textContent = text;
}
requestAnimationFrame(frame);

let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
    if (passive) return;
    game.setAttending(!document.hidden);
    if (document.hidden) { hiddenAt = Date.now(); save(Date.now()); cloudSaveOnLeave(); return; }
    lastPresenceAt = Date.now();
    if (giftsWaiting) claimGifts();   // noticed while the page was hidden
    // Back after a long while: another device may have played meanwhile. Look before uploading again.
    if (cloud.loggedIn && cloudReady && hiddenAt && Date.now() - hiddenAt >= CLOUD_AWAY_MS) syncFromCloud();
});
// The full-screen fight sizes its fighters by the room it has: a resized window draws them again.
let resizeQueued = false;
window.addEventListener('resize', () => {
    if (resizeQueued || !document.body.classList.contains('battle-full')) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; render(); });
});
window.addEventListener('pagehide', () => { save(Date.now()); cloudSaveOnLeave(); });
window.addEventListener('beforeunload', () => save(Date.now()));

// A press in progress: re-rendering now would replace the button under the pointer and lose the click.
const pointer = { down: false, downAt: 0, keyAt: 0 };
document.addEventListener('pointerdown', event => {
    pointer.down = true;
    pointer.downAt = Date.now();
    sound.unlock();
    // Every button answers with a click; the monster has its own strike sound.
    const button = event.target?.closest?.('button, [role="button"]');
    if (button && !button.disabled && !button.classList.contains('foe') && !button.closest('.foe')) sound.play('click');
}, { capture: true, passive: true });
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => { pointer.down = false; }, { capture: true, passive: true });
// A button clicked with the mouse or a finger lets the focus go once its click is done: kept, Space (the
// fight's strike key) and Enter pressed it again, and a click on a camp upgrade bought three more. A
// press from the keyboard (a click with no count) keeps the focus where the keys are.
// (the button now focused: a render in the click may have put the focus on the button drawn in its place)
document.addEventListener('click', event => {
    if (event.detail > 0 && event.target?.closest?.('button')) document.activeElement?.closest?.('button')?.blur();
});

// A touch screen has no hover: a tap on a picture that explains itself in its title shows that as a
// bubble over it (the prestige dialog's keeps, the codex, a dungeon's lineup, the bestiary, records).
const TIP_TARGETS = '.codex-cell, .lineup-face, .beast, .pet-card, .pg-keep-item, .map-stars, .stage-path b, .fact, .record, .rank-badge, .medal, .crate-way, .look-pick.locked, .cape-pick.locked, [data-tip]';
let tipNode = null;
let tipTimer = 0;
/** The game's own tooltip over `el`: `title` in bold above `text`. It goes after a moment, or with the pointer when `stay`. */
function showTip(el, text, { title = '', stay = false } = {}) {
    tipNode?.remove();
    clearTimeout(tipTimer);
    const node = document.createElement('div');
    node.className = 'tap-tip';
    node.setAttribute('role', 'tooltip');
    if (title) { const name = document.createElement('b'); name.className = 'tip-title'; name.textContent = title; node.append(name); }
    node.append(document.createTextNode(text));
    document.body.appendChild(node);
    const box = el.getBoundingClientRect();
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const x = Math.max(8 + w / 2, Math.min(window.innerWidth - 8 - w / 2, box.left + box.width / 2));
    const above = box.top - h - 8 >= 8;
    node.style.left = `${x - w / 2}px`;   // x is the bubble's centre
    node.style.top = `${above ? box.top - h - 8 : box.bottom + 8}px`;
    tipNode = node;
    if (!stay) tipTimer = setTimeout(() => { node.remove(); if (tipNode === node) tipNode = null; }, 2600);
}
// A tap on a chip or figure inside a card (an item a recipe needs, its XP or time) names it, and does not
// also start or stop the card's action; the bubble is placed before anything is drawn again.
document.addEventListener('click', event => {
    if (!window.matchMedia?.('(hover: none)').matches) return;
    const el = event.target?.closest?.('[data-tip]');
    if (!el || !el.parentElement?.closest('[role="button"]') || el.closest('button, a')) return;
    event.stopPropagation();
    event.preventDefault();
    showTip(el, el.dataset.tip, { title: el.dataset.tipTitle || '' });
}, { capture: true });
document.addEventListener('click', event => {
    if (!window.matchMedia?.('(hover: none)').matches) return;
    const el = event.target?.closest?.(TIP_TARGETS);
    if (!el || (el.closest('button, a') && !el.matches('.pg-keep-item'))) { tipNode?.remove(); tipNode = null; return; }
    const text = el.getAttribute('title') || el.dataset.tip || el.getAttribute('aria-label');
    if (text) showTip(el, text, { title: el.getAttribute('title') ? '' : el.dataset.tipTitle || '' });
});
// On a mouse, anything with a data-tip (an item an action needs, say) names itself at once in the same
// bubble, for as long as the pointer stays on it; the browser's slower tooltip of the card under it
// is held back meanwhile, so two never show at once.
let hoverTip = null;
function endHoverTip() {
    if (!hoverTip) return;
    for (const [node, title] of hoverTip.held) node.setAttribute('title', title);
    if (tipNode === hoverTip.node) { tipNode.remove(); tipNode = null; }
    hoverTip = null;
}
document.addEventListener('pointerover', event => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const el = event.target?.closest?.('[data-tip]');
    if (el && el === hoverTip?.el) return;
    endHoverTip();
    if (!el) return;
    const held = [];
    for (let n = el.parentElement?.closest('[title]'); n; n = n.parentElement?.closest('[title]')) { held.push([n, n.getAttribute('title')]); n.removeAttribute('title'); }
    showTip(el, el.dataset.tip, { title: el.dataset.tipTitle || '', stay: true });
    hoverTip = { el, held, node: tipNode };
});
document.addEventListener('pointerdown', endHoverTip, { capture: true });
window.addEventListener('scroll', endHoverTip, { capture: true, passive: true });
// A choice made in a dropdown or checkbox is done: let the tab refresh right away.
document.addEventListener('change', event => {
    if (event.target?.matches?.('select, input[type="checkbox"], input[type="radio"]')) { event.target.blur(); render(); }
});

// Any input ends "focus" (the idle bonus); it comes back after a minute of leaving the game alone. Not a
// mini-game's: playing one took Focus's +15% away for a minute, and ate into what the win gave.
let lastInputNote = 0;
const noteInput = event => {
    const now = Date.now();
    lastPresenceAt = now;
    if (event?.target?.closest?.('.minigame-panel')) return;
    if (now - lastInputNote > 1000 || game.derived.focused) {
        lastInputNote = now;
        advance(now); // the first click after a long absence still gets its welcome-back report
        game.noteInput(now);
    }
};
document.addEventListener('pointerdown', noteInput, { capture: true, passive: true });
document.addEventListener('keydown', event => {
    noteInput(event);
    sound.unlock();
    pointer.keyAt = Date.now();
    // Keyboard access for the clickable cards (role="button"). A key held down presses once: held, it
    // would start and stop an action over and over, or buy again and again.
    const target = event.target;
    const press = event.key === 'Enter' || event.key === ' ';
    if (press && event.repeat && target?.closest?.('button, [role="button"]')) { event.preventDefault(); return; }
    if (press && target?.getAttribute?.('role') === 'button') {
        event.preventDefault();
        target.click();
    }
    if (event.key === 'Escape' && ui.modalOpen && !['elsewhere', 'signin'].includes(ui.modalOpen)) closeModal(); // another tab plays; the game needs an account
    else if (event.key === 'Escape' && !ui.modalOpen && battleMode(game, ui)) window.FI.battleFull(false); // Esc folds the full-screen fight
    // Two keys for the fight: M opens the map (and closes it again), Space strikes the monster (a press each:
    // holding it does nothing more).
    if (event.ctrlKey || event.metaKey || event.altKey || target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (ui.modalOpen) { if ((event.key === 'm' || event.key === 'M') && ui.modalOpen === 'map') { event.preventDefault(); closeModal(); } return; }
    const c = game.state.combat;
    if ((event.key === 'm' || event.key === 'M') && c.mode !== 'titan' && c.mode !== 'clan' && seen(game.state, 'world_map')) { event.preventDefault(); window.FI.openMap(); }
    else if (event.key === ' ' && ui.tab === fightTab(game, ui) && c.active && !target?.closest?.('button, a, [role="button"]')) {
        event.preventDefault();
        if (!event.repeat) document.querySelector('#scene .foe')?.click();
    }
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

// The purse's chips bump when their number changes (gold rolls instead, see paintGold).
let lastPurse = null;
/** The seal in the game's mark: the hero as they are now (look, gear, rank's cloak), redrawn only when that changes. */
let brandKey = '';
function paintBrand() {
    const seal = document.querySelector('.brand-seal');
    if (!seal) return;
    const phone = !!window.matchMedia?.('(max-width: 900px)').matches;
    const key = `${phone}|${heroLayers(game.state).join(',')}`;
    if (key === brandKey) return;
    brandKey = key;
    seal.innerHTML = heroSprite(game.state, { scale: phone ? 1 : 2 });   // whole-number scales: a bust on a desktop, the whole hero on a phone
}

function bumpPurse() {
    const s = game.state;
    const purse = { tokens: s.prestige.tokens, sp: s.prestige.skillPoints, essence: s.resources.essence };
    const still = document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (lastPurse && !still) {
        for (const [key, value] of Object.entries(purse)) {
            if (value === lastPurse[key]) continue;
            document.querySelector(`.chip.${key}`)?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.14)', boxShadow: '0 0 18px rgba(251, 191, 36, 0.55)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
        }
    }
    lastPurse = purse;
}

function render() {
    ui.lastRender = Date.now();
    ui.renderedRevision = game.revision;
    if (!isUnlocked(game.state, ui.tab) && !['inventory', 'settings'].includes(ui.tab)) ui.tab = 'combat';
    if (ui.tab === 'combat') ui.tab = fightTab(game);   // a dungeon run or the Titan is fought on the Dungeons tab, the clan boss on the Clan tab
    const focus = document.activeElement;
    const findAgain = focusFinder(focus);
    const tab = document.getElementById('tab');
    document.body.classList.toggle('battle-full', battleMode(game, ui)); // before the scene syncs: it sizes the fighters by it
    setHtml(document.getElementById('nav'), renderNav(game, ui));
    if (ui.tab !== navShownTab) { navShownTab = ui.tab; revealNavTab(); }
    setHtml(document.getElementById('nav-next'), renderNavNext(game));
    setHtml(document.getElementById('header'), renderHeader(game, ui, cloud));
    bumpPurse();
    setHtml(hotbar, renderHotbar(game, ui));
    const title = pageTitle(game);
    if (document.title !== title) document.title = title;
    if (!isInteracting(focus, tab)) setHtml(tab, renderTab(game, ui, cloud)); // don't yank a field out of the player's hands
    if (findAgain && document.activeElement !== focus) findAgain()?.focus({ preventScroll: true });
    document.body.classList.toggle('reduced-motion', !!game.state.settings.reducedMotion);
    scene.sync(game, ui);
    stage.sync(game, ui);
    guide.sync(game, { battle: ui.tab === fightTab(game, ui), tab: ui.tab, modal: ui.modalOpen || null, now: game.now });
    rewards.resume();   // cards held back by a boss fight show once it is over
    paintGold();
    paintBrand();
    glowArrivals();
    refreshPerks();
}

// On a phone the tabs are a strip that scrolls sideways: a tab opened from elsewhere (the hotbar, a
// card) slides into sight.
let navShownTab = null;
function revealNavTab() {
    const nav = document.getElementById('nav');
    const btn = document.getElementById(`nav-${ui.tab}`);
    if (!nav || !btn || nav.scrollWidth <= nav.clientWidth + 1) return;
    const strip = nav.getBoundingClientRect();
    const tab = btn.getBoundingClientRect();
    if (tab.left >= strip.left && tab.right <= strip.right) return;
    const still = document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    nav.scrollBy({ left: tab.left - strip.left - (strip.width - tab.width) / 2, behavior: still ? 'auto' : 'smooth' });
}

/** The perks dialog stays current while it is open (a perk bought, a skill point spent). */
function refreshPerks() {
    if (ui.modalOpen !== 'perks') return;
    const overlay = document.querySelector('#modal-root .modal-overlay');
    const html = renderPerksModal(game);
    if (!overlay || overlay.__html === html) return;
    const scroll = overlay.querySelector('.modal-content')?.scrollTop || 0;
    setHtml(overlay, html);
    const content = overlay.querySelector('.modal-content');
    if (content) content.scrollTop = scroll;
}

// A piece of the interface that has just opened (systems/disclosure.js) glows once where it appears.
const ARRIVALS = {
    essence: '.chip.essence', tokens: '.chip.tokens', skill_points: '.chip.sp', camp: '.camp-panel, .dock-camp', stage_nav: '.stay-toggle', world_map: '.map-btn',
    food: '.combat-controls', potions: '.combat-controls', gear: '.fact-text', jewellery: '.doll', bag_tools: '.bag-panel .btn-row',
    auto_salvage: '.auto-salvage', mastery: '.mastery-total', minigames: '.minigame-panel, .minigame-line', anvil: '.seg-btn[onclick*="anvil"]', auto_prestige: '.dock-auto', trials: '.pg-trials', ascension: '.pg-ascend', stars: '.chip.stars'
};
const arrivals = new Set();

/** A fight on the Dungeons tab is over (a run, the Titan's): the tab, where it was watched, shows the list again (fightTab). */
function backToDungeons() {
    ui.dungeonHoldUntil = 0;
    ui.battleHoldUntil = 0;
    render();
}

/**
 * The clan boss's fight is over: the Clan tab, where it was fought, shows the clan again (fightTab), whatever the
 * hero went back to (a fight at the stages goes on under Combat).
 */
function backToClan() {
    if (game.state.combat.mode === 'clan') return;   // another attack already began
    ui.clanHoldUntil = 0;
    ui.battleHoldUntil = 0;
    render();
}

/** A quick pop with a glow on something just drawn: the answer to a press on the armory's buttons. */
function flourish(selector, glow = 'rgba(253, 230, 138, 0.9)') {
    if (document.body.classList.contains('reduced-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelector(selector)?.animate?.([
        { transform: 'none', filter: 'none' },
        { transform: 'translateY(-6px) scale(1.12)', filter: `drop-shadow(0 0 12px ${glow}) brightness(1.35)`, offset: 0.35 },
        { transform: 'none', filter: 'none' }
    ], { duration: 560, easing: 'cubic-bezier(.3,1.4,.6,1)' });
}

function glowArrivals() {
    if (!arrivals.size) return;
    const still = document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for (const id of arrivals) {
        const node = ARRIVALS[id] && document.querySelector(ARRIVALS[id]);
        if (!node) continue; // not on this tab: it glows when the player gets there
        arrivals.delete(id);
        if (!still) node.animate?.([{ boxShadow: '0 0 0 0 rgba(252, 211, 77, 0)', filter: 'brightness(1)' }, { boxShadow: '0 0 0 3px rgba(252, 211, 77, 0.7), 0 0 26px rgba(252, 211, 77, 0.5)', filter: 'brightness(1.25)', offset: 0.3 }, { boxShadow: '0 0 0 0 rgba(252, 211, 77, 0)', filter: 'brightness(1)' }], { duration: 1400, easing: 'ease-out' });
    }
}

/** Which sound an event makes (null for none): the fight is heard only while it is watched. */
/** What a mini-game's find was, in words and a picture, for its toast (null for none). */
function findWords(find) {
    if (!find) return null;
    const name = id => RESOURCES[id]?.name || id;
    if (find.kind === 'gem') return { text: `Found ${withArticle(name(find.id))}!`, icon: resIcon(find.id) };
    if (find.kind === 'nest') return { text: `A bird's nest: +${fmt(find.qty)} ${name(find.id)}${find.gem ? `, and ${withArticle(name(find.gem))}` : ''}`, icon: resIcon(find.gem || find.id) };
    if (find.kind === 'bait') return { text: `A tin of bait: +${fmt(find.qty)} bait`, icon: resIcon('fishing_bait') };
    if (find.kind === 'bonfire') return { text: `The bonfire roars: +${duration(find.bonfireMs)}`, icon: glyph('flame') };
    return { text: `+${fmt(find.qty)} ${name(find.id)}, for nothing`, icon: resIcon(find.id) };
}

function soundFor(ev, onCombat) {
    switch (ev.type) {
        case 'hit': return ev.manual ? ['combo', Math.floor(game.state.combat.combo || 0)] : [ev.crit ? 'crit' : 'hit'];
        case 'enemyHit': return onCombat ? ['hurt'] : null;
        case 'dodge': return onCombat ? ['dodge'] : null;
        case 'eat': return onCombat ? ['eat'] : null;
        case 'kill': return [ev.enemy.boss ? 'victory' : ev.enemy.gilded ? 'gold' : 'kill'];
        case 'itemDropped': return [lootSound(ev.item)];
        case 'itemCrafted': return [['rare', 'epic', 'legendary'].includes(ev.item.rarity) ? ev.item.rarity : 'craft'];
        case 'actionComplete': return ui.tab === ev.skill ? [ev.made?.gem ? 'gem' : ev.made?.item ? 'craft' : (ev.made?.qty || 1) > 1 ? 'double' : 'action'] : null;
        case 'toolMade': return ['unlock'];
        case 'levelUp': return ['levelUp'];
        case 'unlock': case 'zoneReached': return ['unlock'];
        case 'achievement': case 'eventMilestone': case 'dungeonMilestone': case 'trialTier': case 'laurel': return ['achievement'];
        case 'masteryLevel': return ev.from < 99 && ev.level >= 99 ? ['achievement'] : [50, 75].some(m => ev.from < m && ev.level >= m) ? ['gold'] : null;
        case 'masteryCheckpoint': return ['achievement'];
        case 'festivalCloak': return ['legendary'];
        case 'death': case 'bossTimeout': return ['defeat'];
        case 'dungeonFail': return ev.lost ? ['defeat'] : null;   // leaving by choice is no defeat
        case 'prestige': return ev.ascend ? null : ['prestige'];
        case 'ascend': return ['legendary'];
        case 'pet': return ['pet'];
        case 'unique': return ['legendary'];
        case 'dungeonClear': return ['chest'];
        case 'titan': return [ev.won ? 'victory' : 'defeat'];
        case 'glance': return onCombat ? ['dodge'] : null;   // a strike off the clan boss's guard
        case 'minigameReady': return game.state.settings.minigameChime !== false ? ['chance'] : null;   // (Settings can turn it off)
        case 'minigameWin': return [ev.perfect ? 'perfect' : 'gold'];
        case 'minigameFail': return ['dodge'];
        case 'harvest': return ['drop'];
        case 'obstacleBuilt': return ['unlock'];
        case 'bestiaryStar': return isUnlocked(game.state, 'achievements') ? ['gold'] : null;
        case 'error': return ['error'];
        default: return null;
    }
}

/** A drop's sound: its rarity's, or for a plainer piece that beats what he wears a bright step up. */
function lootSound(item) {
    if (['rare', 'epic', 'legendary'].includes(item.rarity)) return item.rarity;
    if (['mythic', 'primal'].includes(item.rarity)) return 'mythic';
    return canWear(game.state, item) && isUpgrade(game.state, item) ? 'upgrade' : 'drop';
}

/**
 * A legendary (or better) that beats what he wears: its card once it has landed in the fight (scene.js playLoot), with
 * what it would do and an Equip on it, staying until it is tapped (the owner, October 2026: a legendary drop should be a moment).
 */
function legendaryCard(item, lord = false) {
    const rarity = RARITIES.find(r => r.id === item.rarity) || RARITIES[4];
    const worth = equipGain(game.state, item);
    const stages = stagesWords(gainStages(game.state, worth));
    const gain = gainMarkup(worth) + (stages ? ` · <b class="up">${escapeHtml(stages)}</b>` : '');
    const still = document.body.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
        if (!game.state.inventory.some(i => i.id === item.id)) return;   // put on, or gone, meanwhile
        if (document.hidden) { toast(`${rarity.name} drop: ${item.name}!`, 'achievement', pic(itemSpriteKey(item), escapeHtml(item.icon || ''))); return; }   // (no card for a page out of sight)
        rewards.celebrate({
            key: `loot:${item.id}`, kind: `legend-drop r-${rarity.id}`, kicker: lord ? `A Lord's due: ${rarity.name}` : `${rarity.name} drop`, title: item.name, sticky: true,   // until tapped (the owner's ask)
            icon: `<span class="cel-loot">${sprite(itemSpriteKey(item), { scale: 3, fallback: escapeHtml(item.icon || '') })}</span>`,
            lines: [gain ? `Worn: ${gain}` : '', `Tier ${item.tier}${item.depth ? ` · depth ${item.depth}` : ''}`].filter(Boolean),
            act: { label: 'Equip', run: () => window.FI.equip(item.id) }
        });
    }, still ? 0 : 1150);
}

const REVEAL_TOASTS = {
    mastery: 'Mastery: every action gets better the more you do it',
    world_map: 'The map is yours: travel between the zones you have reached'
};
// A toast's picture: a sprite, small (the text beside it is plain text).
const pic = (key, fallback = '') => sprite(key, { scale: 0.625, cls: 'soft', fallback });

function handleEvents(events) {
    // a fight on the Dungeons tab that just ended while watched (a run lost, the Titan's) keeps its screen a moment, for its end to show
    const ended = ui.tab === 'dungeons' && events.find(ev => (ev.type === 'dungeonFail' && ev.lost) || (ev.type === 'titan' && ev.reason !== 'left'));
    if (ended) ui.dungeonHoldUntil = game.now + (ended.type === 'titan' ? TITAN_HOLD_MS : DEFEAT_HOLD_MS) + 1000;
    // so does the clan boss's on the Clan tab ("Time is up · To the clan…"), and then the tab shows the clan again
    if (ui.tab === 'clan' && events.some(ev => ev.type === 'clanFight' && ev.reason !== 'left')) {
        ui.clanHoldUntil = ui.battleHoldUntil = game.now + TITAN_HOLD_MS;
        setTimeout(backToClan, TITAN_HOLD_MS);
    }
    const onCombat = ui.tab === fightTab(game, ui); // the battle scene shows these itself
    // Places that open in the same moment share one card (and one sound), so nothing queues up.
    const unlocked = events.filter(ev => ev.type === 'unlock').map(ev => ev.id);
    if (unlocked.length) {
        // (Prestige is in the Shop: it is marked new there, if the Shop is open; a dot for a closed Shop led nowhere)
        for (const id of unlocked) if (id !== 'prestige' || isUnlocked(game.state, 'shop')) markFresh(id === 'prestige' ? 'shop' : id, true);
        rewards.celebrate(unlockCelebration(unlocked));
        sound.play('unlock');
    }
    for (const ev of events) {
        scene.event(ev, game);
        const heard = ev.type === 'unlock' ? null : soundFor(ev, onCombat);
        if (heard && (onCombat || !['hit'].includes(ev.type))) sound.play(heard[0], heard[1]);
        switch (ev.type) {
            case 'reveal':
                arrivals.add(ev.id);
                if (REVEAL_TOASTS[ev.id]) toast(REVEAL_TOASTS[ev.id], 'level', pic(FEATURES[ev.id]?.icon || 'res/diamond'));
                break;
            case 'actionComplete': actionFx.actionComplete(ev, ui.tab, stage.anchor()); break;
            case 'levelUp': {
                const card = levelCelebration(ev);
                const cape = ev.level >= 99 && ev.from < 99 ? capeFor(ev.skill) : null;   // 99 brings the skill's cape, worn at once
                if (card && cape) {   // the picture is the hero in it
                    card.icon = `<span class="cel-hero">${heroSprite(game.state, { scale: 2 })}</span>`;
                    card.lines.unshift(`The ${escapeHtml(SKILLS[ev.skill].name)} cape: ${escapeHtml(cape.perk.charAt(0).toLowerCase() + cape.perk.slice(1))}`);
                    card.ms = 5200;
                }
                if (card) rewards.celebrate(card);
                else toast(`${SKILLS[ev.skill].name} level ${ev.level}!`, 'level', tabIcon(ev.skill, 0.625));
                break;
            }
            case 'achievement': { // a medal: a card with its picture, the reward it brings for good
                const a = achievementById(ev.id);
                if (ui.tab !== 'achievements' && isUnlocked(game.state, 'achievements')) markFresh('achievements', true);   // "New" on the Hall until visited
                const look = lookForMedal(ev.id);   // some medals bring a look for the hero
                const lines = [escapeHtml(a?.reward || '')];
                if (look) lines.push(`<span class="cel-look">${heroSprite({ ...game.state, equipped: {}, hero: { ...game.state.hero, look: look.id } }, { scale: 1 })}</span> A new look: ${escapeHtml(look.name)}`);
                if (a) rewards.celebrate({ key: `medal:${a.id}`, kind: 'medal', icon: `<span class="cel-medal">${medalArt(a, 2)}</span>`, kicker: ev.secret ? 'A secret medal' : 'A new medal', title: a.name, lines, ms: look ? 4800 : 3600 });
                else toast(`${ev.name} — ${ev.reward}`, 'achievement', tabIcon('achievements', 0.625));
                break;
            }
            case 'itemCrafted': if (ev.item.rarity !== 'common') toast(`${ev.item.rarity} ${ev.item.name}!`, 'craft', pic(itemSpriteKey(ev.item), escapeHtml(ev.item.icon))); break;
            case 'itemDropped': {
                const rank = RARITIES.findIndex(r => r.id === ev.item.rarity);
                const better = rank >= 4 && canWear(game.state, ev.item) && isUpgrade(game.state, ev.item);   // legendary and above
                if (better) legendaryCard(ev.item, !!ev.lord);   // its card says it
                else if (rank >= 2) toast(`${ev.lord ? 'A Lord\'s due: ' : ev.frontier ? 'From the frontier: ' : ''}${RARITIES[rank].name} drop: ${ev.item.name}!`, rank >= 4 ? 'achievement' : 'craft', pic(itemSpriteKey(ev.item), escapeHtml(ev.item.icon)));
                break;
            }
            case 'toolMade': toast('New tool made!', 'craft', toolIcon(ev.tool)); break;
            case 'clanBanner': {   // the clan felled a level of its boss: the banner rises for everyone in it until the week ends
                const look = clanBossFor(ev.week);
                rewards.celebrate({ key: `banner:${ev.week}:${ev.kills}`, kind: 'legend', art: paintStyle(look.zone), icon: tabIcon('clan', 2),
                    kicker: `Your clan felled level ${ev.kills}`, title: `Clan banner ×${ev.mult}`,
                    lines: ['Attack, defence and health, for everyone in the clan until the week ends', ev.next ? `The next level: ×${ev.next}` : 'The week\'s last level'], ms: 5200 });
                sound.play('levelUp');
                break;
            }
            case 'equip':   // the first piece to take a slot's forge levels: how the forge works, said once (systems/inventory.js)
                if (ev.firstForge) {
                    const kind = ev.slot === 'Weapon' ? 'weapon' : 'piece of armour';
                    rewards.celebrate({ key: 'forge-slots', kind: 'legend', icon: `<span class="cel-loot">${sprite(itemSpriteKey(ev.item), { scale: 2, fallback: escapeHtml(ev.item.icon || '') })}</span>`,
                        kicker: 'The forge', title: `+${ev.forge} kept`, lines: ['Forge levels belong to the slot.', `Every ${kind} you wear there gets your +${ev.forge}.`], ms: 5200 });
                }
                break;
            case 'death': if (!onCombat) toast(ev.mode === 'dungeon' ? 'Defeated in the dungeon: the run is lost' : ev.mode === 'titan' ? 'The Titan won this time' : `Defeated at stage ${ev.stage}: retreating`, 'death'); break;
            case 'bossTimeout': if (!onCombat) toast(`The boss held out — regrouping for a minute`, 'death'); break;
            case 'prestige': {
                const count = game.state.prestige.count;
                const rank = rankFor(count);
                const paid = `+${fmt(ev.tokens)} tokens · +${ev.skillPoints} skill point${ev.skillPoints === 1 ? '' : 's'}`;
                const trial = trialById(ev.trial);   // prestiged into a Trial (systems/trials.js)
                if (ev.ascend && rank === rankFor(count - 1)) { save(Date.now()); break; }   // an Ascension: its own card below ('ascend')
                if (ev.auto && rank === rankFor(count - 1)) {   // the switch's own: a note, and the fight goes on
                    toast(`Auto-prestige: ${paid}`, 'prestige', pic(FEATURES.prestige.icon));
                } else if (rank !== rankFor(count - 1)) {   // a new rank: the hero shows off his new cloak
                    rewards.celebrate({ kind: 'legend', icon: heroSprite({ ...game.state, hero: { ...game.state.hero, cape: '' } }, { scale: 3 }), kicker: 'A new rank', title: rank.name,   // the new cloak, even over a cape
                        lines: [`A ${rank.cloak} cloak, for ${count} prestige${count === 1 ? '' : 's'}`, paid] });
                    if (trial) toast(`Trial: ${trial.name}. ${trial.rule}`, 'prestige', pic(trial.icon));
                } else if (trial) {
                    rewards.celebrate({ key: `trial:${trial.id}`, kind: 'prestige', icon: sprite(trial.icon, { scale: 2 }), kicker: 'A Trial begins', title: trial.name,
                        lines: [trial.rule, nextTrialTarget(game.state, trial) !== null ? `Stage ${nextTrialTarget(game.state, trial)} for a record` : `Stage ${weeklyGoal(game.state, Date.now()).target} for this week's laurel`, paid] });
                } else {
                    rewards.celebrate({ kind: 'prestige', icon: sprite(FEATURES.prestige.icon, { scale: 2 }), kicker: 'Prestige', title: `+${fmt(ev.tokens)} tokens`,
                        lines: [`+${ev.skillPoints} skill point${ev.skillPoints === 1 ? '' : 's'}`, `A new run begins at stage ${ev.startStage}`] });
                }
                save(Date.now());
                break;
            }
            case 'minigameReady': if (ui.tab !== ev.skill) toast(`A ${SKILLS[ev.skill].name} chance appeared!`, 'minigame', tabIcon(ev.skill, 0.625)); break;
            case 'minigameWin': {   // the boost, a Perfect said so, and the find (systems/minigame.js giveFind) with its own sound
                toast(`${ev.perfect ? 'Perfect! ' : ''}×${ev.mult} speed for ${Math.round(ev.ms / 1000)}s`, 'minigame');
                const found = findWords(ev.find);
                if (found) { toast(found.text, 'minigame', found.icon); sound.play(ev.find.kind === 'gem' || ev.find.gem ? 'gem' : 'pickup'); }
                actionFx.minigameWin(ev, ui.tab, stage.anchor());
                break;
            }
            case 'minigameBoostOver': {   // what the ×2 added, in the skill's own goods
                const what = [ev.qty > 0 && RESOURCES[ev.id] ? `+${fmt(ev.qty)} ${RESOURCES[ev.id].name}` : '', ev.xp > 0 ? `+${fmt(ev.xp)} XP` : ''].filter(Boolean).join(', ');
                if (what) toast(`The ×2 brought ${what}`, 'minigame', ev.qty > 0 && RESOURCES[ev.id] ? resIcon(ev.id) : tabIcon(ev.skill, 0.625));
                break;
            }
            case 'minigameFail': toast('Missed: the streak starts again', 'minigame'); break;
            case 'error': toast(ev.text, 'error'); break;
            case 'dungeonClear':   // the first clear of a visit asks (dungeonChoice); while it repeats, a note every tenth
                if (game.state.combat.dungeon?.repeat && ev.clears % 10 === 0) toast(`Dungeon cleared (${ev.clears})${ev.item ? ` — ${ev.item.name}` : ''}`, 'boss', pic('crate'));
                break;
            case 'dungeonChoice':   // the hero waits at the open chest: once the boss's fall and the chest have shown, ask
                setTimeout(() => window.FI.openRunChoice(), 1500);
                break;
            case 'dungeonChosen': if (ui.modalOpen === 'runChoice') closeModal(); break;
            case 'dungeonFail':
                toast(ev.lost ? 'The dungeon run failed' : 'You left the dungeon: the run ends here', ev.lost ? 'death' : 'info');
                // lost (a fall, or the boss's timer): once the defeat has shown, back to the dungeons
                if (ev.lost) setTimeout(() => { if (game.state.combat.mode !== 'dungeon') backToDungeons(); }, DEFEAT_HOLD_MS);
                break;
            case 'zoneReached': { // the first step ever into a land: its painting, its ruler (unmet), what it holds
                if (ev.stratum) {   // a stratum of the Abyss (data/strata.js): its painting (a round's cast in new hues), its line
                    const s = stratumById(ev.zone);
                    if (!s) break;
                    const hue = s.cycle ? `;filter:hue-rotate(${((s.cycle - 1) * 47) % 360}deg)` : '';
                    rewards.celebrate({ key: `zone:${s.id}`, kind: 'unlock', art: paintStyle(s.paint) + hue, icon: sprite(`mon/${s.boss}`, { scale: 2, cls: 'silhouette', fallback: '⚔️' }),
                        kicker: s.cycle ? 'The strata come round again' : 'Deeper into the Abyss', title: s.name, note: s.line, lines: [`Stages ${ev.stage}–${ev.stage + STRATUM_STAGES - 1}`], ms: 5000 });
                    break;
                }
                const zone = ZONES.find(z => z.id === ev.zone);
                if (!zone) break;
                const last = ev.stage + STAGES_PER_ZONE - 1;
                const abyss = zone === ZONES[ZONES.length - 1];
                rewards.celebrate({ key: `zone:${zone.id}`, kind: 'unlock', art: paintStyle(zone.id), icon: sprite(`mon/${zone.boss}`, { scale: 2, cls: 'silhouette', fallback: '⚔️' }),
                    kicker: 'A new land', title: zone.name, note: ZONE_LINES[zone.id] || '', lines: [abyss ? `Stages ${ev.stage}+, without end` : `Stages ${ev.stage}–${last}`, zone.loot.map(l => resIcon(l.id)).join(' ')], ms: 5000 });
                break;
            }
            case 'dungeonMilestone': { // 25, 100 or 250 clears: a bonus for good, on the dungeon's painting
                const d = dungeonById(ev.dungeon);
                if (d) rewards.celebrate({ key: `dungeon:${d.id}:${ev.clears}`, kind: 'unlock', art: paintStyle(DUNGEON_ART[d.id] || 'dungeon'), icon: sprite(`mon/${d.boss.name}`, { scale: 2, fallback: escapeHtml(d.icon) }),
                    kicker: `${d.name} · ${fmt(ev.clears)} clears`, title: ev.desc, lines: ['Yours for good, through every prestige'] });
                break;
            }
            case 'titan': {
                toast(ev.won ? `Titan defeated! Permanent +${+((ev.bonus || 0) * 100).toFixed(1)}% ATK and HP` : `The Titan survived — ${Math.round((ev.dealt || 0) * 100)}% damage dealt`, ev.won ? 'achievement' : 'death', pic('titan/0'));
                // fought on the Dungeons tab: while watched, its banner keeps the screen a moment (the hold above), and
                // then the tab shows the list again; the hero is back at what he did before (a stage fight is under Combat)
                if ((ui.dungeonHoldUntil || 0) > game.now) {
                    ui.battleHoldUntil = game.now + TITAN_HOLD_MS;
                    setTimeout(() => { if (game.state.combat.mode !== 'titan' && game.state.combat.mode !== 'dungeon') backToDungeons(); }, TITAN_HOLD_MS);
                }
                break;
            }
            case 'clanFight':   // the clan fight is over: what was done is sent; the Clan tab shows the clan again (the hold above)
                sendClanResult(true);
                break;
            case 'pet': rewards.celebrate({ key: `pet:${ev.pet.id}`, kind: 'pet', icon: sprite(`pet/${ev.pet.id}`, { scale: 2, fallback: ev.pet.icon }), kicker: 'A companion joins you', title: ev.pet.name, lines: [escapeHtml(ev.pet.desc)] }); break;
            case 'ascend':   // tokens given up for Stars: the biggest card there is
                rewards.celebrate({ key: `ascend:${ev.count}`, kind: 'legend', icon: '<i class="coin-dot stars big" aria-hidden="true"></i>', kicker: `Ascension ${ev.count}`, title: `+${fmt(ev.stars)} Stars`,
                    lines: [`Every prestige pays ×${ev.gain.toFixed(2)} tokens`, `${fmt(ev.tokensGiven)} tokens given up`] });
                save(Date.now());
                break;
            case 'festivalCloak': {   // a weekend event's cloak bought (data/capes.js): the hero in it
                const cloak = festivalCloak(ev.cape);
                if (cloak) rewards.celebrate({ key: `cloak:${ev.event}`, kind: 'legend', icon: heroSprite({ ...game.state, hero: { ...game.state.hero, cape: ev.cape } }, { scale: 3 }), kicker: 'A festival cloak', title: cloak.name,
                    lines: ['Yours to keep: wear it from Settings'] });
                break;
            }
            case 'masteryCheckpoint':   // a checkpoint of a skill's whole mastery: its actions faster for good
                if (!seen(game.state, 'mastery')) break;   // (said once mastery itself has been met)
                rewards.celebrate({ key: `mastery:${ev.skill}:${ev.at}`, kind: 'level', icon: tabIcon(ev.skill, 2), kicker: 'Mastery checkpoint', title: `${SKILLS[ev.skill].name} ${Math.round(ev.at * 100)}%`,
                    lines: [`+${Math.round(ev.speed * 100)}% speed in ${SKILLS[ev.skill].name}, for good`] });
                break;
            case 'laurel': {   // the week's Trial beaten (systems/trials.js): a record
                const trial = trialById(ev.id);
                if (!trial) break;
                rewards.celebrate({ key: `laurel:${ev.laurels}`, kind: 'legend', icon: sprite(trial.icon, { scale: 2 }), kicker: "This week's Trial", title: 'A laurel',
                    lines: [`${trial.name}: stage ${fmt(ev.stage)}, past your best`, `A record: your tokens are ×${BASE_RECORD_MULT} stronger`] });
                break;
            }
            case 'trialTier': {   // a Trial's tier cleared: a record, and the next rung
                const trial = trialById(ev.id);
                if (!trial) break;
                const target = nextTrialTarget(game.state, trial);
                rewards.celebrate({ key: `trial:${ev.id}:${ev.tier}`, kind: ev.last ? 'legend' : 'medal', icon: sprite(trial.icon, { scale: 2 }), kicker: ev.last ? 'Trial cleared to the top' : `Trial · tier ${ev.tier} of ${TRIAL_TIERS}`, title: trial.name,
                    lines: [`A record: your tokens are ×${BASE_RECORD_MULT} stronger`, ...(target ? [`Next: stage ${target}`] : [])] });
                break;
            }
            case 'record': {   // every 25 stages of all-time best: the tokens grow stronger (once there are tokens to strengthen)
                // the steps of the deep say what opens there (data/items.js MYTHIC, PRIMAL)
                const opens = ev.stage === MYTHIC.from ? 'From here a boss near your best can leave Mythic gear'
                    : ev.stage === PRIMAL.from ? 'From here a Mythic piece can come Primal' : '';
                if (seen(game.state, 'tokens')) rewards.celebrate({ key: `record:${ev.stage}`, kind: 'legend', icon: sprite('token', { scale: 2, fallback: '✨' }), kicker: 'A new record', title: `Stage ${fmt(ev.stage)}`,
                    lines: [`Your tokens are ×${BASE_RECORD_MULT} stronger`, `×${ev.records.mult.toFixed(2)} from ${ev.records.count} records`, opens].filter(Boolean), ms: opens ? 5200 : undefined });
                break;
            }
            case 'skillRecord':   // every 50 levels of the skills together: the tokens grow stronger too (core/modifiers.js recordsOf)
                if (seen(game.state, 'tokens')) rewards.celebrate({ key: `skillRecord:${ev.levels}`, kind: 'legend', icon: sprite('perk/scholar', { scale: 2, fallback: '📜' }), kicker: 'A new record', title: `${fmt(ev.levels)} skill levels`,
                    lines: [`Your tokens are ×${BASE_RECORD_MULT} stronger`, `×${ev.records.mult.toFixed(2)} from ${ev.records.count} records`] });
                break;
            case 'unique':
                if (ev.item.locked) rewards.celebrate({ kind: 'legend', icon: sprite(itemSpriteKey(ev.item), { scale: 2, fallback: '🌟' }), kicker: 'Unique item', title: ev.item.name, lines: ['In your bag: equip it from the Inventory', ...(seen(game.state, 'tokens') ? [`A record: your tokens are ×${BASE_RECORD_MULT} stronger`] : [])] });
                else toast(`A spare ${ev.item.name}: salvage it for essence`, 'achievement', pic(itemSpriteKey(ev.item)));
                break;
            case 'obstacleBuilt': toast(`${ev.obstacle.name} built — ${ev.obstacle.desc}`, 'achievement', tabIcon('agility', 0.625)); break;
            case 'bestiaryStar': // a kind of monster fell for the 10th, 100th or 1,000th time (once the bestiary can be seen)
                if (isUnlocked(game.state, 'achievements')) toast(`${ev.name} ${'★'.repeat(ev.stars)} — ${fmt(ev.kills)} defeated`, 'level', pic(`mon/${ev.name}`));
                break;
            case 'eventMilestone': rewards.celebrate({ kind: 'unlock', icon: sprite(EVENT_ART[ev.event.id], { scale: 2, fallback: ev.event.icon }), kicker: ev.event.name, title: ev.milestone.desc }); break;
            case 'masteryLevel':
                if (ev.from < 99 && ev.level >= 99) rewards.celebrate({ key: `mastery:${ev.skill}:${ev.key}`, kind: 'legend', icon: tabIcon(ev.skill, 2), kicker: 'Mastery 99', title: ev.name });
                else if ([50, 75].some(m => ev.from < m && ev.level >= m)) toast(`${ev.name}: mastery ${ev.level}!`, 'level', tabIcon(ev.skill, 0.625));
                break;
            case 'kill': if (ev.enemy.boss && !onCombat) toast(`${ev.enemy.name} defeated! +${fmt(ev.gold)} gold`, 'boss', pic(monsterSpriteKey(ev.enemy))); break;
            default: break;
        }
    }
}

/** A short note in the corner: plain `text`, with a picture (`icon`, sprite HTML) before it if given. */
function toast(text, kind = 'info', icon = '') {
    const area = document.getElementById('toast-area');
    if (!area) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    if (icon) el.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span>`;
    el.append(text);
    area.appendChild(el);
    while (area.children.length > 5) area.removeChild(area.firstChild);
    setTimeout(() => el.classList.add('fade'), 3200);
    setTimeout(() => el.remove(), 3800);
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
    // The focus goes where a key would act (the map opens on its Close button, not on its first pin) without
    // scrolling a tall dialog down to it, and on a touch screen not into a field: that would raise the keyboard.
    const touch = !!window.matchMedia?.('(hover: none)').matches;
    // (one selector at a time: a list matched the first button in the dialog, and Enter on the welcome-back opened Prestige)
    const first = root.querySelector('[data-autofocus]') || (!touch && root.querySelector('input')) || root.querySelector('button.btn-confirm') || root.querySelector('button');
    first?.focus({ preventScroll: true });
    for (const box of root.querySelectorAll('.modal-overlay, .modal-content')) box.scrollTop = 0;
}
/** A new hero's first fight, from the title card (or the account made from it). */
function startAdventure() {
    sound.play('unlock');
    if (!game.state.combat.active && !game.state.action) { game.toggleCombat(); setBattleFull(true); }
    render();
}
/** The sign-in the game waits behind (SIGN_IN_REQUIRED): no guest button, and Escape leaves it up. */
function openSignIn(register = false) {
    ui.auth = { mode: register ? 'register' : 'login' };
    if (ui.modalOpen !== 'signin') openModal(renderAuthModal('', { required: true, register }), 'signin');
}
/** The account dialog at a step (renderAuthModal's `mode`), in place of the one open. */
function showAuth(message = '', ctx = {}) {
    ui.auth = { ...ctx };
    const key = ui.modalOpen === 'auth' ? 'auth' : 'signin';
    showModal(renderAuthModal(message, { required: key === 'signin', ...ui.auth }), key);
}
function authError(text) {
    const err = document.getElementById('auth-error');
    if (err) err.textContent = text;
}
/** Signed in (a login, a code, a new password): the account's game is looked at before anything goes up. */
async function signedIn() {
    ui.social = freshSocial(); // nothing from the previous account carries over
    cloudReady = false;        // nothing goes up before the sync below has looked at the account's save
    synced = false;
    ui.auth = null;
    closeModal();
    toast(`Signed in as ${cloud.username}`, 'info');
    await syncFromCloud();
    // from the title card: a new account's hero goes into the first fight (an account with a save plays it)
    if (ui.beginAfterSignIn && !game.state.stats.kills) startAdventure();
    ui.beginAfterSignIn = false;
    render();
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
    else rewards.resume();
}

// ---------- persistence ----------

function save(now) {
    if (passive) return;
    if (!ownsSave()) { becomePassive(); return; }   // another tab took the save (its storage event may not have come)
    lastSave = now;
    saveLocal(game.serialize(now));
}

/**
 * Upload the game. Only once a sync has chosen it over the server's (`sync` is that sync's own upload),
 * one at a time. The server refuses an upload made over a save this page hasn't seen (another device's):
 * then the game looks at the server again, and plays its save unless this one already holds all it has.
 */
let pushing = false;
let giftsWaiting = false;   // an upload's answer said gifts wait: claimed when the page is in view (their card shows)
async function cloudSave(announce = true, { keepalive = false, sync = false } = {}) {
    if (!cloud.loggedIn || passive || pushing) return;
    if (!cloudReady && !sync) { if (announce) toast('Checking the cloud save first…', 'info'); return; }
    pushing = true;
    lastCloudSave = Date.now();
    try {
        const answer = await cloud.push(JSON.parse(game.serialize(Date.now())), { keepalive });
        ui.cloudStatus = `Cloud save OK at ${new Date().toLocaleTimeString()}`;
        if (announce) toast('Saved to cloud', 'info');
        giftsWaiting = answer?.gifts > 0;
        if (giftsWaiting) claimGifts();
        if (answer && 'banner' in answer) game.setClanBanner(answer.banner);   // a kill by a clanmate shows up within an upload
    } catch (err) {
        if (err.status === 409) {   // another device saved meanwhile: look at the server again before anything goes up
            cloudReady = false;
            syncRetryAt = 0;
            return;
        }
        ui.cloudStatus = `Cloud save failed: ${err.message}`;
        if (announce) toast(ui.cloudStatus, 'error');
    } finally {
        pushing = false;
    }
}

/** Leaving the page (another tab, the phone's home screen, closing it): one upload, unless one went just now. */
function cloudSaveOnLeave() {
    if (!cloud.loggedIn || !cloudReady || passive || !game.state.settings.cloudSync || Date.now() - lastCloudSave < CLOUD_LEAVE_GAP_MS) return;
    cloudSave(false, { keepalive: true });
}

/** Gifts waiting on the server (the owner's, README "The API"): claimed once, added to the save, shown as a card. */
let claimingGifts = false;
async function claimGifts() {
    // (not into a game the sync may yet replace, nor while hidden: its card would show to nobody)
    if (claimingGifts || !cloud.loggedIn || !cloudReady || passive || document.hidden) return;
    claimingGifts = true;
    try {
        const { gifts = [] } = await cloud.claimGifts();
        for (const gift of gifts) {
            const text = game.applyReward(gift);
            const gold = Math.floor(Number(gift.gold) || 0);
            rewards.celebrate({ key: `gift:${gift.id}`, kind: 'unlock', icon: sprite(gold > 0 ? 'gold' : 'crate', { scale: 2 }),
                kicker: gift.text || 'A gift', title: text.slice(text.lastIndexOf(': ') + 2), ms: 5000 });   // what came, after the gift's own words (which may hold a colon); the card escapes them
        }
        giftsWaiting = false;
        if (gifts.length) { save(Date.now()); cloudSave(false); render(); }
    } catch (err) {
        ui.cloudStatus = err.message;   // it waits on the server for the next save
    } finally {
        claimingGifts = false;
    }
}

// ---------- clans, rewards, leaderboards ----------

/**
 * Send the clan attack fought (game.state.clanResult) to the server, which reckons its damage from the
 * stored hero and the strikes; show what it did. On a lost connection it waits and goes again; when the
 * server refuses it for good (no attacks waiting, the boss already down, no clan any more) it is dropped.
 */
let sendingClan = false;
let clanRetryAt = 0;
async function sendClanResult(now = false) {
    const result = game.state.clanResult;
    if (!result || sendingClan || !cloud.loggedIn || !cloudReady || passive || (!now && Date.now() < clanRetryAt)) return;
    sendingClan = true;
    try {
        // the fight's own mark goes with it: sent again after a lost answer, the server counts it once
        const answer = await cloud.clanAttack({ strikes: result.strikes, ms: result.ms, at: result.at });
        game.clearClanResult();
        if (answer.banner) game.setClanBanner(answer.banner);
        save(Date.now());
        if (ui.social.boss) Object.assign(ui.social.boss, { hp: answer.hp, maxHp: answer.maxHp, killed: !!answer.killed }, Number.isFinite(answer.kills) ? { kills: answer.kills } : {});
        ui.social.attacksLeft = answer.attacksLeft;
        ui.social.fetchedAt = 0;   // the Clan tab brings its board up to date when it is next shown
        const look = clanBossFor(answer.week || result.week);
        const lines = [answer.killed ? 'The boss is down! It comes back at midnight UTC, a level stronger' : '', answer.rank ? `#${answer.rank} of ${answer.of} in the clan this week` : '',
            answer.strikes ? `${answer.strikes} strike${answer.strikes === 1 ? '' : 's'} through its guard` : '',
            answer.capped ? 'Capped: this account\'s save showed impossible numbers' : ''].filter(Boolean);
        rewards.celebrate({ key: `clan:${result.at}`, kind: answer.killed ? 'legend' : 'unlock', art: paintStyle(look.zone), icon: sprite(`mon/${look.name}`, { scale: 2, fallback: '🐉' }),
            kicker: `Clan boss · ${look.name}`, title: `${fmt(answer.damage)} damage`, lines: lines.map(escapeHtml), ms: 4200 });
        sound.play(answer.killed ? 'victory' : 'chest');
        render();
    } catch (err) {
        if (err.status >= 400 && err.status < 500) { game.clearClanResult(); toast(err.message, 'info'); render(); }   // refused for good
        else clanRetryAt = Date.now() + 30000;   // the connection, or the server busy: again in a while
    } finally {
        sendingClan = false;
    }
}

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
        Object.assign(social, { members: mine.members || [], boss: mine.boss || null, bossAt: Date.now(), board: mine.board || [], attacksLeft: mine.attacksLeft || 0, attacksPerDay: mine.attacksPerDay || 3, attackBank: mine.attackBank || 6, maxMembers: mine.maxMembers || 20 });
        game.setClanBanner(mine.clan ? mine.banner : null);
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

/** The boot's welcome-back, held while the sync chose: this game is the one played, so it shows now. */
function showHeldReport() {
    const report = heldReport;
    heldReport = null;
    if (report) openModal(renderWelcomeBack(report, game), 'offline');
}
/**
 * Look at the server's save and play it: the server's save is the game, as in any online game, and the
 * player is never asked. This one is kept (and uploaded) only when it is the server's carried on
 * (syncChoice). Until it has chosen nothing goes up; a failed one is tried again (the loop), never
 * followed by a blind upload.
 */
async function syncFromCloud() {
    if (syncing || !cloud.loggedIn) return;
    syncing = true;
    const before = synced;
    // the server's save as this device last saw it: this page's look, or (at load) the one noted last time
    const known = cloud.base ?? cloud.knownBase()?.at ?? null;
    cloudReady = false;
    try {
        const { state: remote, lastSaved, gifts, banner } = await cloud.pull(Date.now());
        if (syncChoice(game.state, remote, lastSaved, known) === 'cloud') {
            heldReport = null;
            cloudReady = true;
            adoptState(remote);
            if (before) toast('Your game was played on another device: carrying on from there', 'info');
            game.setClanBanner(banner);   // the clan's banner this week, as the server says it
        } else {
            game.setClanBanner(banner);
            showHeldReport();
            cloudReady = true;
            await cloudSave(false, { sync: true });
        }
        synced = true;
        syncRetryAt = 0;
        syncFailNoted = false;
        giftsWaiting = gifts > 0;
        if (giftsWaiting) claimGifts();
    } catch (err) {
        ui.cloudStatus = err.message;
        syncRetryAt = Date.now() + SYNC_RETRY_MS;   // again in a while; nothing goes up meanwhile
        showHeldReport();
        if (!syncFailNoted) toast(`${err.message} The cloud save is checked again shortly.`, 'error');
        syncFailNoted = true;
    } finally {
        syncing = false;
    }
}

function adoptState(stateObject) {
    game = withDevFlags(new Game(stateObject, Date.now()));
    const summary = game.resumeFromSave(Date.now());
    if (summary && summary.mode !== 'rest') openModal(renderWelcomeBack(summary, game), 'offline');
    save(Date.now());
    render();
}

/** The fight fills the screen, or is folded into the page; a fold is remembered until the next fight. */
function setBattleFull(on) {
    ui.battleFull = !!on;
    if (on) prefs.remove('fantasyIdle.battleFull'); else prefs.set('fantasyIdle.battleFull', '0');
}

// ---------- public facade for inline handlers ----------

window.FI = {
    switchTab(id) {
        if (id === 'combat') id = fightTab(game);   // a run or the Titan is fought on the Dungeons tab, the clan boss on the Clan tab: Combat waits until it is over
        ui.dungeonHoldUntil = 0;   // a lost run's moment on screen ends with the player's next step
        ui.clanHoldUntil = 0;
        ui.potionMenu = false;
        ui.tab = id;
        prefs.set('fantasyIdle.tab', id);
        markFresh(id, false);
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
    /**
     * A clan attack: the hero fights the week's clan boss on screen (systems/clanfight.js), and when it
     * is over the game sends what the player did (sendClanResult). The server fights with the stored
     * hero, so he goes up first.
     */
    async clanFight() {
        if (!cloud.loggedIn || ui.social.attacking || game.state.combat.mode === 'clan') return;
        if (!cloudReady) { toast('Checking the cloud save first…', 'info'); return; }   // the server fights with the stored hero
        ui.social.attacking = true;
        render();
        try {
            if (game.state.clanResult) await sendClanResult(true);   // the last attack first
            if (game.state.clanResult) return;                        // still not sent: it is retried, and this waits
            await cloudSave(false);
            const mine = await cloud.myClan();
            Object.assign(ui.social, { clan: mine.clan, members: mine.members || [], boss: mine.boss || null, bossAt: Date.now(), board: mine.board || [], attacksLeft: mine.attacksLeft || 0,
                attacksPerDay: mine.attacksPerDay || 3, attackBank: mine.attackBank || 6 });
            const boss = mine.boss;
            if (!mine.clan || !boss) { toast('Join a clan first.', 'info'); return; }
            if (boss.killed) { toast("This week's boss is already defeated.", 'info'); return; }
            if (!(mine.attacksLeft > 0)) { toast(`No attacks waiting: ${ui.social.attacksPerDay} more come each day.`, 'info'); return; }
            if (!game.startClanFight({ week: boss.week, hp: boss.hp, maxHp: boss.maxHp })) return;
            ui.battleHoldUntil = 0;
            setBattleFull(true);
            window.FI.switchTab('clan');   // fought on the Clan tab, which shows the clan again when it is over (fightTab)
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            ui.social.attacking = false;
            render();
        }
    },
    async claimRewards() {
        const ids = ui.social.rewards.map(r => r.id);
        const result = await socialAction(() => cloud.claimRewards(ids));
        for (const reward of result?.rewards || []) toast(game.applyReward(reward), 'achievement', pic('crate'));
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
    smithView(view) { ui.smithView = view; render(); },
    hallView(view) { ui.hallView = view; render(); },
    selectSmithMetal(bar) { ui.smithMetal = bar; render(); },
    selectCraftBar(bar) { ui.craftBar = bar; render(); },
    selectCraftGem(gem) { ui.craftGem = gem; render(); },

    /** Enter or leave the fight. Entering it lets it fill the screen. */
    toggleCombat() {
        const c = game.state.combat;
        const fighting = c.active;
        const inDungeon = c.mode === 'dungeon';
        const special = c.mode === 'titan' || c.mode === 'clan' ? c.mode : null;
        game.toggleCombat();
        if (!fighting && c.active) setBattleFull(true);
        if (inDungeon && c.mode !== 'dungeon') { backToDungeons(); return; }   // Leave dungeon: back to the list of them
        if (special && c.mode !== special) ui.battleHoldUntil = ui.clanHoldUntil = 0;   // Give up: its tab shows its page again (fightTab)
        render();
    },
    /** After a fall: rest without going back into the fight. */
    stayAtCamp() { game.leaveCombat(); render(); },
    /** Fold the full-screen fight back into the page (it goes on), or let it fill the screen again. */
    battleFull(on) { setBattleFull(on); render(); },
    /** Perks in a dialog over the fight: skill points are spent without leaving it. */
    openPerks() {
        const html = renderPerksModal(game);
        openModal(html, 'perks');
        const overlay = document.querySelector('#modal-root .modal-overlay');
        if (overlay && ui.modalOpen === 'perks') overlay.__html = html;
    },
    setAutoEat(rule) { game.setAutoEat(rule); render(); },
    setPotion(id) { game.setPotion(id); render(); },
    setDungeonPotion(id) { game.setDungeonPotion(id); render(); },
    setWorkPotion(id) { game.setWorkPotion(id); ui.potionMenu = false; render(); },
    togglePotionMenu() { ui.potionMenu = !ui.potionMenu; render(); },
    goZone(stage) { game.setStage(stage); render(); },
    toggleFarm(on) { game.setFarmMode(on); },
    buyCamp(id, count) { if (game.buyCampUpgrade(id, count) !== false) sound.play('buy'); render(); },
    enterDungeon(id) { if (game.enterDungeon(id)) { setBattleFull(true); window.FI.switchTab('dungeons'); } else render(); },
    /** After the first clear of a visit: the choice, in a dialog over whatever is on screen. */
    openRunChoice() { if (choosingAfterClear(game.state) && !ui.modalOpen) openModal(renderRunChoiceModal(game), 'runChoice'); },
    dungeonKeepGoing() { if (game.dungeonKeepGoing()) sound.play('unlock'); if (ui.modalOpen === 'runChoice') closeModal(); render(); },
    dungeonEnd() {
        const ended = game.dungeonEnd();
        if (ui.modalOpen === 'runChoice') closeModal();
        if (ended) backToDungeons(); else render();
    },
    assembleUnique(id) { game.assembleUnique(id); render(); }, // the unique event celebrates it
    challengeTitan() {
        if (!game.challengeTitan()) { render(); return; }
        ui.battleHoldUntil = 0;
        setBattleFull(true);
        window.FI.switchTab('dungeons');   // fought where it is challenged, and the tab shows the list again after it (fightTab)
    },

    plant(plot, crop) { ui.lastCrop = crop; game.plant(plot, crop); render(); },
    /** The seed the farm plants: picked from the bag of seeds, used by every empty plot. */
    pickSeed(crop) { ui.lastCrop = crop; render(); },
    plantAll(crop) { ui.lastCrop = crop; if (game.plantAll(crop) > 0) sound.play('drop'); render(); },
    buyEventItem(id) { if (game.buyEventItem(id)) toast('Bought!', 'info'); render(); },
    buyFestivalCloak() { game.buyFestivalCloak(); render(); },
    harvest(plot) { game.harvest(plot); render(); },
    harvestAll() { const r = game.harvestAll({ replant: true }); if (r.harvested) toast(`Harvested ${r.harvested} plot${r.harvested > 1 ? 's' : ''}${r.replanted ? `, replanted ${r.replanted}` : ''}`, 'info', tabIcon('farming', 0.625)); render(); },
    /** Build an obstacle; swapping out a built one (no refund, its levels lost) asks first. */
    buildObstacle(id) {
        const slot = AGILITY_SLOTS.findIndex(s => s.obstacles.some(o => o.id === id));
        const old = slot >= 0 && game.state.agility.built[slot] ? AGILITY_SLOTS[slot].obstacles.find(o => o.id === game.state.agility.built[slot]) : null;
        const build = () => { if (game.buildObstacle(id)) { ui.agilitySwap = null; sound.play('unlock'); } render(); };
        if (!old) { build(); return; }
        const fresh = AGILITY_SLOTS[slot].obstacles.find(o => o.id === id);
        askConfirm('Swap obstacles?', `The ${old.name} is torn down with no refund, and its levels are lost. The ${fresh.name} goes up in its place.`, 'Swap', build);
    },
    /** Show a built obstacle's slot with the other two to pick from (null: back to the obstacle). */
    agilitySwap(slot) { ui.agilitySwap = slot; render(); },
    upgradeObstacle(slot) { game.upgradeObstacle(slot); render(); },
    runCourse() { if (game.state.action?.kind === 'agility') game.stopAction(); else game.startAgility(); render(); },

    equip(id) { if (game.equipItem(id) !== false) { sound.play('equip'); render(); flourish('.doll-figure .hero-doll'); } else render(); },
    unequip(slot) { game.unequipItem(slot); sound.play('equip'); render(); },
    sellItem(id) { game.sellItem(id); sound.play('coin'); render(); },
    sellAll(rarity) { const before = game.state.gold; game.sellAllItems(rarity); if (game.state.gold > before) sound.play('gold'); render(); },
    upgrade(id) { const ok = game.upgradeItem(id); if (ok) sound.play('craft'); render(); if (ok) flourish('#item-detail .detail-art'); },
    setAutoPrestige(on) { if (game.setAutoPrestige(on)) sound.play(on ? 'unlock' : 'click'); render(); },
    reinforce(id) { const ok = game.reinforceItem(id); sound.play(ok ? 'anvil' : 'error'); render(); if (ok) flourish(`#anvil-${Number(id)} .anvil-art`); },
    reroll(id) { const ok = game.rerollItem(id); sound.play(ok ? 'rare' : 'error'); render(); if (ok) flourish(`#anvil-${Number(id)} .anvil-art`, 'rgba(196, 165, 255, 0.95)'); },
    toAnvil() { ui.smithView = 'anvil'; ui.invSelected = null; window.FI.switchTab('smithing'); },
    reforge(id) { const ok = game.reforgeItem(id); if (ok) sound.play('rare'); render(); if (ok) flourish('#item-detail .detail-art', 'rgba(196, 165, 255, 0.95)'); },
    salvage(id) {
        const g = game.salvageItem(id);
        if (g) {
            sound.play('drop');
            const got = [g.essence ? `${g.essence} essence` : '', ...Object.entries(g.materials).map(([res, qty]) => `${qty} ${RESOURCES[res].name}${qty === 1 ? '' : 's'}`)].filter(Boolean);
            toast(got.length ? `+${got.join(', ')}` : 'Salvaged', 'info', resIcon(Object.keys(g.materials)[0] || 'essence'));
        }
        render();
    },
    salvageAll(rarity) { const r = game.salvageAll(rarity); if (r.count) toast(`Salvaged ${r.count} item${r.count === 1 ? '' : 's'} (+${r.essence} essence)`, 'info', resIcon('essence')); render(); },
    salvageWeaker() { const r = game.salvageWeaker(); if (r.count) toast(`Salvaged ${r.count} item${r.count === 1 ? '' : 's'} weaker than what you wear (+${r.essence} essence)`, 'info', resIcon('essence')); render(); },
    buyBagUpgrade() { if (game.buyBagUpgrade()) { sound.play('buy'); toast('Five more slots in the bag', 'info'); } render(); },
    toggleLock(id) { game.toggleLock(id); render(); },
    setAutoSalvage(rarity) { game.setAutoSalvage(rarity); render(); },
    sellRes(id, amount) { game.sellResource(id, amount); render(); },
    invFilter(cat) { ui.invFilter = cat; render(); },
    selectRes(id) { ui.resSelected = ui.resSelected === id ? null : id; render(); },
    selectItem(id) { ui.invSelected = id === null || ui.invSelected === id ? null : id; ui.invPreview = null; render(); },
    /** Hovering a tile shows it on the table without a full re-render; leaving shows the picked item again. */
    previewItem(id) {
        if (window.matchMedia?.('(hover: none)').matches) return; // touch screens pick with a tap
        ui.invPreview = id;
        const panel = document.getElementById('item-detail');
        if (!panel) return;
        const shown = id ?? ui.invSelected;
        panel.innerHTML = renderItemDetail(game, shown);
        panel.classList.toggle('has-item', panel.querySelector('.detail') !== null);
    },
    buyShop(id) { if (game.buyGoldShopItem(id) !== false) sound.play('buy'); render(); },
    buyPerk(id) { if (game.buyPerk(id) !== false) sound.play('buy'); render(); },

    openPrestige() { if (isUnlocked(game.state, 'prestige') && game.canPrestige()) openModal(renderPrestigeModal(game), 'prestige'); },
    confirmPrestige() {
        const trial = document.querySelector('.prestige-modal input[name="trial"]:checked')?.value;   // a Trial picked in the dialog
        writeBackup(game.serialize(Date.now()), 'prestige', `Before prestige ${game.state.prestige.count + 1}`);
        closeModal();
        if (trial) game.startTrial(trial);
        else game.prestige({ resume: true }); // a hero who was fighting walks into the new run's first fight
        render();
    },
    /** The prestige dialog's Ascend: it gives every token up, so it asks first, in a dialog of its own. */
    askAscend() {
        const a = game.ascendPreview();
        if (!a.allowed) return;
        closeModal();
        askConfirm('Ascend?', `Your ${fmt(a.tokens)} tokens become ${fmt(a.stars)} Stars, and the tokens start again from nothing. Every prestige after pays ×${a.gainAfter.toFixed(2)} tokens. Your best stage, gear, skills and perks stay.`, 'Ascend', () => {
            writeBackup(game.serialize(Date.now()), 'prestige', `Before Ascension ${game.state.ascension.count + 1}`);
            game.ascend();
            render();
        });
    },
    /** A Trial card in the prestige dialog, ticked or unticked: one at most, and the button says which. */
    pickTrial(input) {
        const modal = input.closest('.prestige-modal');
        if (!modal) return;
        for (const other of modal.querySelectorAll('input[name="trial"]')) if (other !== input) other.checked = false;
        const t = input.checked ? input.dataset : null;
        const button = modal.querySelector('.btn-confirm');
        if (button) button.textContent = t ? `Prestige into ${t.name}` : 'Prestige now';
        const line = modal.querySelector('.trial-pick-line');
        if (line) line.textContent = !t ? ''
            : t.target ? `Reach stage ${t.target} in this run for a record${t.laurel ? `, and stage ${t.laurel} for this week's laurel` : ''}: your tokens ×${BASE_RECORD_MULT} stronger each, for good.`
            : `Reach stage ${t.laurel} in this run for this week's laurel: a record, your tokens ×${BASE_RECORD_MULT} stronger, for good.`;
        sound.play(t ? 'equip' : 'click');
    },
    closeModal() { closeModal(); },

    startMinigame(skill) { game.startMinigame(skill); render(); },
    resolveMinigame(skill) { advance(Date.now()); game.resolveMinigame(skill); render(); },   // judged at the moment of the tap, as the marker was drawn
    failMinigame(skill) { game.failMinigame(skill); render(); },
    pumpHeat(skill) { game.pumpHeat(skill); },
    setDragValue(skill, value) { game.setDragValue(skill, value); },
    claimDaily() {
        const crate = game.claimDaily();
        if (crate) {
            sound.play(crate.great ? 'legendary' : 'chest');
            if (ui.modalOpen === 'crate') closeModal(); // "open the next": the new crate replaces this one
            openModal(renderCrateModal(crate, game.state.daily.banked, cratesTowardGreat(game.state)), 'crate');
        }
        render();
    },
    /** The "?" on a panel: what this place is, with its picture. */
    about(id) { openModal(renderAboutCard(id), 'about'); },
    /** A drawer was opened or closed; remember it, so a re-render keeps it that way. */
    setOpen(key, open) { ui.open[key] = !!open; },
    openMap() { openModal(renderWorldMapModal(game), 'map'); },
    /** A pin on the map was tapped (a zone's index or a dungeon's id): show it under the map, which stays put. */
    mapSelect(key) {
        const info = document.querySelector('.map-info');
        if (!info) return;
        info.innerHTML = typeof key === 'number' ? renderZoneInfo(game, key) : renderDungeonInfo(game, key);
        for (const pin of document.querySelectorAll('.map-pin')) pin.classList.toggle('picked', pin.dataset.pick === String(key));
    },
    mapTravel(stage) { closeModal(); game.travel(stage); if (ui.tab !== 'combat') window.FI.switchTab('combat'); else render(); },
    mapDungeon(id) { closeModal(); window.FI.enterDungeon(id); },

    setSetting(key, value) { game.state.settings[key] = value; game.markDirty(); render(); },
    setPlaytestLog(on) { game.setPlaytestLog(on); render(); },
    /** The playtest log as a file to keep or send (systems/playtest.js). */
    exportPlaytest() {
        const blob = new Blob([playtestExport(game.state, Date.now())], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fantasy-idle-playtest-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    /** The volume slider: heard at once, saved when let go. */
    setVolume(value, done = false) {
        game.state.settings.volume = Math.max(0, Math.min(1, Number(value) || 0));
        if (done) { game.markDirty(); sound.play('coin'); }
    },
    setHeroName(name) { game.setHeroName(name); render(); },
    toggleSound() {
        game.state.settings.sound = game.state.settings.sound === false;
        game.markDirty();
        if (game.state.settings.sound) { sound.unlock(); sound.play('click'); }
        render();
    },
    restoreBackup(slot) {
        if (cloud.loggedIn) return;   // signed in, the server's save is the game: no rolling it back from here
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
        // Signed in, the fresh game goes to the server too: the old one came back from there on the next load.
        const what = cloud.loggedIn ? 'The game starts over from the beginning, on the server too. This cannot be undone.'
            : 'The game starts over from the beginning. One backup is kept in Settings in case you change your mind.';
        askConfirm('Wipe your save?', what, 'Wipe save', () => {
            writeBackup(game.serialize(Date.now()), 'reset', 'Before hard reset');
            clearLocal();
            prefs.remove('fantasyIdle.tab');
            for (const id of [...ui.fresh]) markFresh(id, false);   // no "new" marks from the old game
            game = withDevFlags(new Game(null, Date.now()));
            save(Date.now());
            if (cloud.loggedIn) cloudSave(false);
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

    openAuth() {
        if (ui.modalOpen === 'intro') closeModal();
        if (SIGN_IN_REQUIRED) openSignIn(); else { ui.auth = { mode: 'login' }; openModal(renderAuthModal(), 'auth'); }
    },
    collectOffline() { closeModal(); sound.unlock(); sound.play('chest'); },
    /** The title card's arrows: the next or the previous look, tried on at once. */
    turnLook(step) {
        game.setHeroLook(nextLook(game.state.hero.look, step, game.state));
        const hero = document.querySelector('.intro-hero');
        if (hero) hero.innerHTML = heroSprite(game.state, { scale: 5 });
        flourish('.intro-hero .hero-doll');
    },
    setHeroLook(id) { game.setHeroLook(id); sound.play('equip'); render(); },
    setHeroCape(skill) { if (game.setHeroCape(skill)) { sound.play('equip'); render(); } },
    setCompanion(id) { if (game.setCompanion(id)) sound.play('pet'); render(); },
    beginAdventure() {
        const name = document.getElementById('intro-name')?.value || '';
        if (name.trim()) game.setHeroName(name);   // optional: without one he is "You"
        closeModal();
        sound.unlock();
        if (needsSignIn()) { ui.beginAfterSignIn = true; openSignIn(true); return; }   // an account first; the fight once it is made
        startAdventure();
    },
    /** Log in, or make an account: a new one waits for the code mailed to its address (FI.verifyCode). */
    async auth(kind) {
        const user = document.getElementById('auth-user')?.value.trim();
        const pass = document.getElementById('auth-pass')?.value;
        const email = document.getElementById('auth-email')?.value.trim() || '';
        ui.auth = { mode: kind, username: user || '' };
        if (!user || !pass) return authError('Username and password are required.');
        if (kind === 'register' && !email) return authError('An email address is needed: the game sends a code there.');
        try {
            if (kind === 'login') { await cloud.login(user, pass); await signedIn(); return; }
            const data = await cloud.register(user, pass, email);
            if (cloud.loggedIn) { await signedIn(); return; }   // (a server from before codes)
            showAuth('', { mode: 'verify', username: data.username || user, email: data.email || email });
        } catch (e) {
            // made, or with the right password, but the address not confirmed yet: to the code
            if (e.data?.pending) return showAuth(e.message, { mode: 'verify', username: e.data.username || user, email: e.data.email || email });
            authError(SIGN_IN_REQUIRED && cloud.available === false ? "The game's server can't be reached. Try again in a moment." : e.message);
        }
    },
    /** Another step of the account dialog: 'login', 'register', 'forgot'. */
    authMode(mode) { showAuth('', { mode, username: ui.auth?.username || document.getElementById('auth-user')?.value.trim() || '' }); },
    async verifyCode() {
        const code = document.getElementById('auth-code')?.value.trim();
        if (!code) return authError('Enter the 6-digit code from the email.');
        try { await cloud.verify(ui.auth?.username, code); await signedIn(); } catch (e) { authError(e.message); }
    },
    async resendCode() {
        try {
            const data = await cloud.resendCode(ui.auth?.username);
            showAuth(`A new code is on its way to ${data.email || 'your email'}.`, { ...ui.auth });
        } catch (e) { authError(e.message); }
    },
    /** A code to set a new password; `again` sends another to the same address. */
    async forgotPassword(again = false) {
        const email = again ? ui.auth?.resetEmail : document.getElementById('auth-email')?.value.trim();
        if (!email) return authError('Enter your account\'s email address.');
        try {
            const data = await cloud.forgotPassword(email);
            showAuth(again ? 'If an account has this address, another code is on its way.' : '', { mode: 'reset', resetEmail: email, email: data.email || email });
        } catch (e) { authError(e.message); }
    },
    async resetPassword() {
        const code = document.getElementById('auth-code')?.value.trim();
        const pass = document.getElementById('auth-pass')?.value;
        if (!code || !pass) return authError('The code and a new password are both needed.');
        try { await cloud.resetPassword(ui.auth?.resetEmail, code, pass); toast('Password changed', 'info'); await signedIn(); } catch (e) { authError(e.message); }
    },
    async logout() {
        if (cloudReady) await cloudSave(false);   // the latest play goes up first: this browser keeps none of it
        cloud.logout();
        cloudReady = false;
        synced = false;
        heldReport = null;
        game.clearClanResult();   // an attack not sent belongs to that account (it went to the next one to sign in)
        ui.cloudStatus = '';
        ui.social = freshSocial();
        if (SIGN_IN_REQUIRED) {
            // A fresh game behind the sign-in: an account registered here next starts its own, not a copy of this one.
            clearLocal();
            prefs.remove('fantasyIdle.tab');
            for (const id of [...ui.fresh]) markFresh(id, false);
            game = withDevFlags(new Game(null, Date.now()));
            save(Date.now());
            openSignIn();
        } else toast('Logged out — playing locally', 'info');
        render();
    },
    cloudSaveNow() { cloudSave(true); },
    game: () => game
};

render();
