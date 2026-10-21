// The chain (the owner, October 2026): every 20–30 seconds of a fight on screen, five numbered points appear over
// it. Struck in order, 1 to 5, before its clock runs out (BALANCE.chain.ms), they pay a little gold, and one struck
// fast rallies the hero (a little more attack speed for a few seconds). Small by the owner's word: strikes on the
// monster are what matters in a fight (systems/combat.js clickAttack), the chain only a bonus for the player who
// watches. A click anywhere else, or on a point out of turn, does nothing: a player still clicking when they appear
// loses nothing.
//
// What keeps a macro out: the fight counts one click every BALANCE.combat.strikeGapMs, wherever it lands, so a
// tool clicking at random over the fight gets about sixteen counted clicks in a chain's four seconds, each on the
// next point once in twenty or so; five in order come less than once in a thousand chains. The points fall
// anywhere (no grid a tool could learn), apart from one another. The page decides when the fight is on screen
// (ui/scene.js asks for a chain only then), so a chain never waits on a hidden tab or offline.

import { BALANCE, goldPerKillAtStage } from '../core/formulas.js';
import { rng } from '../core/rng.js';
import { bumpStat } from './progress.js';
import { choosingAfterClear } from './dungeon.js';

/** A fight a chain can come to: under way, against a monster, not the clan boss's (it has its openings), not at a chest. */
function chainFight(state) {
    const c = state.combat;
    return !!(c.active && c.enemy && !c.enemy.chest && c.mode !== 'clan' && !choosingAfterClear(state));
}

/** May a chain start now? (The page asks only while the fight is on screen.) */
export function chainReady(state, now) {
    const c = state.combat;
    return chainFight(state) && !c.chain && c.chainAt > 0 && now >= c.chainAt;
}

/**
 * Where the points go, as fractions of the layer's width and height: anywhere inside its margins, each at least
 * BALANCE.chain.spacing (in heights) from the others. `aspect` is the layer's width over its height.
 */
export function placePoints(count = BALANCE.chain.points, aspect = 2, spacing = BALANCE.chain.spacing) {
    const a = Math.max(0.6, Math.min(4, Number(aspect) || 2));
    let gap = spacing;
    for (let round = 0; round < 6; round++, gap *= 0.85) {
        const points = [];
        for (let tries = 0; tries < 400 && points.length < count; tries++) {
            const p = { x: rng.float(0.1, 0.9), y: rng.float(0.16, 0.84) };
            if (points.every(q => Math.hypot((p.x - q.x) * a, p.y - q.y) >= gap)) points.push(p);
        }
        if (points.length === count) return points.map(p => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }));
    }
    return Array.from({ length: count }, (_, i) => ({ x: 0.1 + 0.8 * (i + 0.5) / count, y: 0.5 }));   // (a layer too small to space them)
}

/** The fight's chain clock (the game's tick): the first of a fight is set, one left too long goes, one out of its fight goes. */
export function tickChain(game) {
    const state = game.state;
    const c = state.combat;
    const now = game.now;
    if (!chainFight(state)) {
        if (c.chain) c.chain = null;   // the fight ended or changed: no loss, no find
        return;
    }
    if (!(c.chainAt > 0)) c.chainAt = now + BALANCE.chain.firstMs;
    if (c.chain && now > c.chain.endsAt) {
        c.chain = null;
        c.chainAt = now + rng.int(...BALANCE.chain.everyMs);
        game.emit({ type: 'chainMissed' });
    }
}

/** Five points over the fight (`aspect`: the layer's width over its height). Null if no chain may start. */
export function startChain(game, aspect = 2) {
    const state = game.state;
    const c = state.combat;
    const now = game.now;
    if (!chainReady(state, now)) return null;
    c.chain = { points: placePoints(BALANCE.chain.points, aspect), next: 0, startedAt: now, endsAt: now + BALANCE.chain.ms };
    game.emit({ type: 'chainStart', points: c.chain.points.length });
    return c.chain;
}

/**
 * A click in the fight while a chain is up: on point `index` (0-based), or elsewhere (null). One click counts every
 * strikeGapMs, wherever it lands; the next point in turn moves the chain on, anything else does nothing.
 * Returns true when it struck the next point.
 */
export function chainClick(game, index) {
    const state = game.state;
    const c = state.combat;
    const ch = c.chain;
    const now = game.now;
    if (!ch || now > ch.endsAt) return false;
    if (now - (c.lastClickAt || 0) < BALANCE.combat.strikeGapMs) return false;   // too soon after the last: not counted
    c.lastClickAt = now;
    if (index !== ch.next) return false;
    ch.next++;
    game.emit({ type: 'chainHit', index, of: ch.points.length });
    if (ch.next >= ch.points.length) finishChain(game);
    game.markDirty();
    return true;
}

/** All five in order: gold (a few kills' worth at the stage), a rally if it was quick; the next chain set. */
function finishChain(game) {
    const state = game.state;
    const c = state.combat;
    const b = BALANCE.chain;
    const ms = game.now - c.chain.startedAt;
    const fast = ms <= b.fastMs;
    c.chain = null;
    c.chainAt = game.now + rng.int(...b.everyMs);
    const gold = goldPerKillAtStage(c.stage, game.derived?.goldMult || 1) * b.goldKills;
    state.gold += gold;
    bumpStat(game, 'goldEarned', gold);
    bumpStat(game, 'chains');
    if (fast) {
        c.rallyUntil = game.now + b.rallyMs;
        bumpStat(game, 'chainsFast');
    }
    game.emit({ type: 'chainDone', ms, fast, gold, rallyMs: fast ? b.rallyMs : 0 });
}
