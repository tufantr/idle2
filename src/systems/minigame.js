// Skill mini-games as timed opportunities: while you train a skill, a chance to play appears every few minutes
// and waits a minute; a win makes the skill work twice as fast for a short while, and its end says what that
// added. Cadence-limited so that a fully active player earns tens of percent more than an idle one, not
// multiples (see research notes).
//
// October 2026, the owner's go-ahead after the research (DESIGN §3.15): every game can be lost but is easy (the
// heat and the brew are held in a moving band until done, where one tap or a drag used to win every time); each
// zone has a Perfect centre, worth 15 seconds more and always a find; an ordinary win brings a find now and then
// (a gem, a bird's nest, game or bait, dishes, potions, a longer bonfire: things with a use already); and a better
// resource plays harder and pays better, while the levels above it make it easier.

import { NON_COMBAT_SKILLS, SKILLS } from '../data/skills.js';
import { RESOURCES } from '../data/resources.js';
import { GEM_DROP_TABLE } from '../data/zones.js';
import { BALANCE } from '../core/formulas.js';
import { BASE, skillLevel } from '../core/modifiers.js';
import { rng } from '../core/rng.js';
import { bumpStat, log } from './progress.js';

export const CHALLENGE_MS = 10000;   // how long a challenge lasts once started
export const PERFECT_SHARE = 0.4;    // the centre of a timing zone that is Perfect (the middle two fifths)
export const HOLD_MS = 2500;         // the held games: this long inside the band and the dish is done
export const HEAT_TAP = 0.1;         // what a tap adds to the heat

export const MINIGAME_CONFIG = {
    mining:      { icon: '⛏️', label: 'Ore Vein Pulse', desc: 'Tap while the pulse sweeps through the ore seam.', type: 'timing', accent: '#34d399', actionText: 'Pulse the Vein', marker: 'tool/pickaxe' },
    woodcutting: { icon: '🌳', label: 'Perfect Chop',   desc: 'Catch the axe rhythm at the heartwood ring.',     type: 'timing', accent: '#22c55e', actionText: 'Catch the Rhythm', marker: 'tool/axe' },
    hunting:     { icon: '🏹', label: 'Snap Shot',      desc: 'Fire when the prey crosses the kill zone.',       type: 'moving-target', accent: '#f59e0b', actionText: 'Loose an Arrow', marker: 'pet/scout', button: 'Loose arrow' },
    cooking:     { icon: '🍳', label: 'Heat Ride',      desc: 'Tap to keep the pan\'s heat in the moving band until the dish is done.', type: 'heat', accent: '#fb923c', actionText: 'Ride the Heat' },
    alchemy:     { icon: '🧪', label: 'Catalyst Drag',  desc: 'Keep the stabiliser in the drifting channel until the brew settles.', type: 'drag', accent: '#10b981', actionText: 'Stabilise the Mix' },
    // Hunting at a river spot plays the angler's game (Fishing's, before it joined Hunting): not a skill of its own
    river:       { icon: '🎣', label: 'Strike!',        desc: 'Strike when the float dips into the ring.',       type: 'moving-target', accent: '#38bdf8', actionText: 'Strike', marker: 'res/raw_trout', button: 'Strike' },
    firemaking:  { icon: '🔥', label: 'Stoke the Fire', desc: 'Tap to keep the flame in the moving band until it roars.', type: 'heat', accent: '#f97316', actionText: 'Stoke' }
};

/** A skill's mini-game: Hunting at a river spot plays the angler's (MINIGAME_CONFIG.river). */
export function minigameConfig(state, skillId) {
    const a = state?.action;
    if (skillId === 'hunting' && a?.kind === 'node' && a.skill === 'hunting' && SKILLS.hunting.nodes.find(n => n.id === a.id)?.fish) return MINIGAME_CONFIG.river;
    return MINIGAME_CONFIG[skillId];
}

/** The resource the hero works in a skill now (its node), or null. */
function workedNode(state, skillId) {
    const a = state?.action;
    return a?.kind === 'node' && a.skill === skillId ? SKILLS[skillId]?.nodes.find(n => n.id === a.id) || null : null;
}

const clamp01 = x => Math.max(0, Math.min(1, x));

/**
 * How hard a chance plays: `d` the resource's level (0 at level 1, 1 at 99) and `ease` the hero's levels above it
 * (1 at fifty above). A better resource plays faster and narrower, and the levels above it widen it again, as
 * Stardew Valley's fishing bar grows with the fishing level.
 */
export function minigameDifficulty(state, skillId) {
    const req = workedNode(state, skillId)?.levelReq || 1;
    return { d: clamp01((req - 1) / 98), ease: clamp01((skillLevel(state, skillId) - req) / 50) };
}

function scheduleNext(game, skillId, now) {
    const [min, max] = BALANCE.minigame.opportunityEveryMs;
    const mg = game.state.minigame[skillId];
    mg.nextOpportunityAt = now + rng.int(min, max);
    mg.opportunityUntil = 0;
    holdChances(game.state, mg.nextOpportunityAt);
}

/**
 * One clock for every skill's chances: none comes before `at`. With a clock per skill, a player who
 * switched skills found a chance waiting in each and kept a boost up nearly all the time; now a chance
 * comes every few minutes of work, whichever skill it is.
 */
function holdChances(state, at) {
    for (const id of NON_COMBAT_SKILLS) {
        const mg = state.minigame[id];
        if (mg) mg.nextOpportunityAt = Math.max(mg.nextOpportunityAt || 0, at);
    }
}

/** Called each tick for the skill currently being trained. */
export function tickMinigame(game, skillId) {
    if (!NON_COMBAT_SKILLS.includes(skillId)) return;
    const mg = game.state.minigame[skillId];
    const now = game.now;
    if (mg.boostUntil && mg.boostUntil <= now) endBoost(game, skillId, mg);
    if (mg.challenge) {
        if (mg.challenge.expiresAt <= now) { failMinigame(game, skillId, { silent: true }); }
        return;
    }
    if (!mg.nextOpportunityAt) { mg.nextOpportunityAt = now + rng.int(45000, 90000); return; } // first chance comes quickly
    if (mg.opportunityUntil && mg.opportunityUntil <= now) { scheduleNext(game, skillId, now); return; }
    if (!mg.opportunityUntil && now >= mg.nextOpportunityAt) {
        mg.opportunityUntil = now + BALANCE.minigame.opportunityWindowMs;
        holdChances(game.state, now + BALANCE.minigame.opportunityEveryMs[0]);   // the other skills wait their turn
        game.emit({ type: 'minigameReady', skill: skillId });
    }
}

/**
 * Every skill's mini-game on the clock, whatever is being trained (the game's tick and the offline
 * replay): a boost that has run out ends, and a challenge left open past its time is lost.
 */
export function expireMinigames(game) {
    const now = game.now;
    for (const id of NON_COMBAT_SKILLS) {
        const mg = game.state.minigame[id];
        if (!mg) continue;
        if (mg.boostUntil && mg.boostUntil <= now) endBoost(game, id, mg);
        if (mg.challenge && mg.challenge.expiresAt <= now) failMinigame(game, id, { silent: true });
    }
}

/** A boost has run out: say what it added (twice as fast, so half of what was made meanwhile), and clear it. */
function endBoost(game, skillId, mg) {
    const qty = Math.floor((mg.gainQty || 0) / 2);
    const xp = Math.floor((mg.gainXp || 0) / 2);
    if (qty > 0 || xp > 0) game.emit({ type: 'minigameBoostOver', skill: skillId, id: mg.gainId || '', qty, xp });
    mg.boostUntil = 0;
    mg.mult = 0;
    mg.gainId = '';
    mg.gainQty = 0;
    mg.gainXp = 0;
    game.markDirty();
}

/** What a skill action made while its boost ran (systems/skilling.js): the main thing made, and the XP. */
export function noteBoostGain(game, skillId, made, xp) {
    const mg = game.state.minigame[skillId];
    if (!mg || !(mg.boostUntil > game.now)) return;
    if (made?.id && made.qty > 0) {
        if (mg.gainId !== made.id) { mg.gainId = made.id; mg.gainQty = 0; }   // another node: count the new one
        mg.gainQty += made.qty;
    }
    mg.gainXp += Math.max(0, xp || 0);
}

export function hasOpportunity(state, skillId, now) {
    const mg = state.minigame[skillId];
    return !!mg && mg.opportunityUntil > now && !mg.challenge;
}

/**
 * A challenge of the skill's kind, as hard as `diff` (minigameDifficulty) makes it:
 * - timing / moving-target: a marker sweeps back and forth; a tap in the zone wins, in its centre (PERFECT_SHARE)
 *   it is Perfect. A better resource sweeps faster over a narrower zone.
 * - heat: the heat falls by itself and each tap raises it (HEAT_TAP); held inside a slowly moving band for HOLD_MS
 *   the dish is done, and Perfect if it never slipped out once in. A better resource's band is narrower, moves
 *   more and the heat falls faster.
 * - drag: the stabiliser (a slider) is held inside a drifting channel the same way.
 */
export function buildChallenge(type, now, diff = { d: 0, ease: 0 }) {
    const { d, ease } = diff;
    const narrower = (1 - 0.35 * d) * (1 + 0.35 * ease);
    const slower = (1 - 0.3 * d) * (1 + 0.2 * ease);
    const expiresAt = now + CHALLENGE_MS;
    const r3 = x => Math.round(x * 1000) / 1000;
    if (type === 'timing') return { type, zoneStart: r3(0.18 + rng.random() * 0.44), zoneWidth: r3(0.16 * narrower), cycleMs: Math.round((900 + rng.int(0, 500)) * slower), startedAt: now, expiresAt };
    if (type === 'moving-target') return { type, zoneStart: r3(0.38 + rng.random() * 0.18), zoneWidth: r3(0.14 * narrower), cycleMs: Math.round((1000 + rng.int(0, 500)) * slower), startedAt: now, expiresAt };
    const held = { progress: 0, entered: false, slipped: false, startedAt: now, expiresAt, phase: r3(rng.random() * 2 * Math.PI) };
    if (type === 'heat') {
        return { type, ...held, heat: 0.2, bandCenter: r3(0.48 + rng.random() * 0.1), bandWidth: r3(Math.min(0.34, 0.26 * narrower)), drift: r3(0.06 + 0.1 * d),
            periodMs: Math.round((4200 + rng.int(0, 800)) * (1 - 0.25 * d)), decay: r3(0.16 * (1 + 0.4 * d)) };
    }
    return { type: 'drag', ...held, dragValue: r3(0.06 + rng.random() * 0.1), bandCenter: r3(0.52 + rng.random() * 0.12), bandWidth: r3(Math.min(0.28, 0.2 * narrower)), drift: r3(0.14 + 0.12 * d),
        periodMs: Math.round((3600 + rng.int(0, 800)) * (1 - 0.25 * d)) };
}

/** Where a held game's band is at `now`: { lo, hi } on the track (0-1), moving slowly back and forth. */
export function bandAt(ch, now) {
    const w = ch.bandWidth || 0.2;
    const swing = Math.sin(2 * Math.PI * (now - (ch.startedAt || now)) / (ch.periodMs || 4000) + (ch.phase || 0));
    const center = Math.max(w / 2, Math.min(1 - w / 2, (ch.bandCenter ?? 0.5) + (ch.drift || 0) * swing));
    return { lo: center - w / 2, hi: center + w / 2 };
}

export function startMinigame(game, skillId) {
    const state = game.state;
    if (!hasOpportunity(state, skillId, game.now) && !state.settings.devUnlockAll) return false;
    const mg = state.minigame[skillId];
    mg.challenge = buildChallenge(minigameConfig(state, skillId).type, game.now, minigameDifficulty(state, skillId));
    mg.opportunityUntil = 0;
    return true;
}

export function animatedPosition(challenge, now) {
    const elapsed = now - challenge.startedAt;
    const cycle = challenge.cycleMs || 1200;
    const raw = (elapsed % (cycle * 2)) / cycle;
    return raw <= 1 ? raw : 2 - raw;
}

/** Where a timing zone is Perfect: its centre, PERFECT_SHARE of it. */
export function perfectZone(ch) {
    const half = (ch.zoneWidth * PERFECT_SHARE) / 2;
    const mid = ch.zoneStart + ch.zoneWidth / 2;
    return { lo: mid - half, hi: mid + half };
}

export function pumpHeat(game, skillId) {
    const ch = game.state.minigame[skillId]?.challenge;
    if (!ch || ch.type !== 'heat') return;
    ch.heat = Math.min(1, ch.heat + HEAT_TAP);
}

export function setDragValue(game, skillId, value) {
    const ch = game.state.minigame[skillId]?.challenge;
    if (!ch || ch.type !== 'drag') return;
    const v = Number(value);
    if (Number.isFinite(v)) ch.dragValue = clamp01(v);
}

/**
 * A held game runs on (the game's tick, while its skill is worked): the heat falls, the band moves, and the time
 * inside it fills the dish (out of it, the dish cools at half the pace). Full, it is won; Perfect if, once in, it
 * never slipped out. A long step (a tab in the background) counts no more than a quarter second: a game nobody
 * watched is not won by itself.
 */
export function tickChallenge(game, skillId, dt) {
    const mg = game.state.minigame[skillId];
    const ch = mg?.challenge;
    if (!ch || (ch.type !== 'heat' && ch.type !== 'drag') || !(dt > 0)) return;
    if (ch.expiresAt <= game.now) return;   // (it is lost on the clock: expireMinigames)
    const step = Math.min(dt, 250);
    if (ch.type === 'heat') ch.heat = Math.max(0, ch.heat - (step * (ch.decay || 0.16)) / 1000);
    const { lo, hi } = bandAt(ch, game.now);
    const v = ch.type === 'heat' ? ch.heat : ch.dragValue;
    const inside = v >= lo && v <= hi;
    if (inside) {
        ch.entered = true;
        ch.progress = Math.min(1, ch.progress + step / HOLD_MS);
    } else {
        if (ch.entered) ch.slipped = true;
        ch.progress = Math.max(0, ch.progress - step / (2 * HOLD_MS));
    }
    ch.inside = inside;
    if (ch.progress >= 1) rewardMinigame(game, skillId, { perfect: !ch.slipped });
}

/** A tap in a timing game (a held game is won by holding: a tap there does nothing). */
export function resolveMinigame(game, skillId) {
    const mg = game.state.minigame[skillId];
    const ch = mg?.challenge;
    if (!ch) return false;
    if (ch.expiresAt <= game.now) { failMinigame(game, skillId); return false; }   // too late: it can't be won at leisure
    if (ch.type !== 'timing' && ch.type !== 'moving-target') return false;
    const pos = animatedPosition(ch, game.now);
    const success = pos >= ch.zoneStart && pos <= ch.zoneStart + ch.zoneWidth;
    if (!success) { failMinigame(game, skillId); return false; }
    const p = perfectZone(ch);
    rewardMinigame(game, skillId, { perfect: pos >= p.lo && pos <= p.hi });
    return true;
}

function rewardMinigame(game, skillId, { perfect = false } = {}) {
    const b = BALANCE.minigame;
    const mg = game.state.minigame[skillId];
    mg.streak = Math.min(5, mg.streak + 1);
    mg.mult = b.speedMult;
    const boostMs = Math.round((b.boostMs + (mg.streak - 1) * b.streakMs + (perfect ? b.perfectMs : 0)) * game.derived.boostDurationMult);
    if (!(mg.boostUntil > game.now)) { mg.gainId = ''; mg.gainQty = 0; mg.gainXp = 0; }   // a fresh boost counts from nothing
    mg.boostUntil = game.now + boostMs;
    mg.challenge = null;
    bumpStat(game, 'minigameWins');
    if (perfect) bumpStat(game, 'minigamePerfects');
    const find = perfect || rng.chance(b.findChance) ? giveFind(game, skillId) : null;
    scheduleNext(game, skillId, game.now);
    log(game, `${minigameConfig(game.state, skillId).icon} ${perfect ? 'Perfect!' : 'Done!'} ${skillId} works ×${mg.mult} as fast for ${Math.round(boostMs / 1000)}s.`, 'minigame');
    game.emit({ type: 'minigameWin', skill: skillId, mult: mg.mult, ms: boostMs, perfect, find });
    game.markDirty();
}

/** A gem found working rock (or wood) of `tier`: of that tier or one either side, more often at or below it. */
export function rollGem(tier) {
    const candidates = GEM_DROP_TABLE.filter(g => Math.abs(g.tier - tier) <= 1).map(g => ({ ...g, weight: g.tier <= tier ? 3 : 1 }));
    return rng.weighted(candidates.length ? candidates : GEM_DROP_TABLE.map(g => ({ ...g, weight: 1 }))).id;
}

/** About BALANCE.minigame.findSeconds of a resource's work, in what it makes. */
const bundleOf = node => Math.max(1, Math.round((BALANCE.minigame.findSeconds * 1000) / (node.interval || 3000)));

/**
 * What a win brings besides the speed (a Perfect always, an ordinary win now and then), in the skill's own goods,
 * each with a use already: a gem of the vein's tier; a bird's nest of the tree's logs (one in four with a gem);
 * game, or a tin of bait at a river spot; dishes or potions made for nothing (their ingredients aren't spent);
 * bonfire time as if the logs had burnt. About BALANCE.minigame.findSeconds of the work, a gem being rarer.
 * Returns { id?, qty?, gem?, bonfireMs?, kind } or null when nothing is being worked.
 */
export function giveFind(game, skillId) {
    const state = game.state;
    const node = workedNode(state, skillId);
    if (!node) return null;
    const b = BALANCE.minigame;
    const add = (id, qty) => { state.resources[id] = (state.resources[id] || 0) + qty; };
    let find;
    if (skillId === 'mining') {
        const gem = rollGem(RESOURCES[node.produces]?.tier || 1);
        add(gem, 1);
        bumpStat(game, 'gemsFound');
        find = { kind: 'gem', id: gem, qty: 1 };
    } else if (skillId === 'woodcutting') {
        const qty = bundleOf(node);
        add(node.produces, qty);
        find = { kind: 'nest', id: node.produces, qty };
        if (rng.chance(b.nestGemChance)) {
            find.gem = rollGem(RESOURCES[node.produces]?.tier || 1);
            add(find.gem, 1);
            bumpStat(game, 'gemsFound');
        }
    } else if (skillId === 'hunting' && node.fish) {
        add('fishing_bait', b.baitFind);
        find = { kind: 'bait', id: 'fishing_bait', qty: b.baitFind };
    } else if (node.bonfireLog) {
        const now = game.now;
        const ms = bundleOf(node) * BASE.bonfireSecondsPerLogTier * 1000 * (RESOURCES[node.bonfireLog]?.tier || 1);
        const until = Math.min(now + BASE.bonfireMaxMs, Math.max(state.bonfire.until || 0, now) + ms);
        find = { kind: 'bonfire', bonfireMs: Math.max(0, until - Math.max(state.bonfire.until || 0, now)) };
        state.bonfire.until = until;
    } else if (node.produces) {
        const qty = bundleOf(node);
        add(node.produces, qty);
        find = { kind: skillId === 'cooking' ? 'dishes' : skillId === 'alchemy' ? 'brew' : 'game', id: node.produces, qty };
    } else return null;
    bumpStat(game, 'minigameFinds');
    game.markDirty();
    return find;
}

export function failMinigame(game, skillId, { silent = false } = {}) {
    const mg = game.state.minigame[skillId];
    if (!mg) return;
    mg.challenge = null;
    mg.streak = 0;
    scheduleNext(game, skillId, game.now);
    if (!silent) game.emit({ type: 'minigameFail', skill: skillId });
}
