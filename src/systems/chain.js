// The chain (the owner, October 2026): every 20–30 seconds of a fight on screen, five numbered points appear over
// it. Struck in order, 1 to 5, before its clock runs out (BALANCE.chain.ms), they pay a little gold, and one struck
// fast rallies the hero (a little more attack speed for a few seconds). Small by the owner's word: strikes on the
// monster are what matters in a fight (systems/combat.js clickAttack), the chain only a bonus for the player who
// watches. A click anywhere else, or on a point out of turn, does nothing: a player still clicking when they appear
// loses nothing. It never gets in the strikes' way (the owner, the same day: clicking didn't feel as before; the
// points covered the monster in nearly every chain, and a tap on one cost the next strike): the points keep off the
// monster (the page says where it stands), a click on the monster is a strike and nothing else, the chain counts
// its clicks on a clock of its own, and striking its points in turn keeps the combo from fading.
//
// What keeps a macro out: the chain counts one click every BALANCE.chain.clickGapMs, wherever it lands in the fight
// (but on the monster), so a tool clicking at random over the fight gets about sixteen counted clicks in a chain's
// four seconds, each on the next point once in twenty or so; five in order come less than once in a thousand
// chains. The points fall anywhere (no grid a tool could learn), apart from one another. The page decides when the
// fight is on screen (ui/scene.js asks for a chain only then), so a chain never waits on a hidden tab or offline.

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
 * The page's boxes to keep the points out of, checked: at most four, each { x0, y0, x1, y1 } finite and not empty, and
 * `soft` if it may give way when there is no room without it.
 */
function keepOut(avoid) {
    if (!Array.isArray(avoid)) return [];
    return avoid.slice(0, 4).map(b => ({ x0: Number(b?.x0), y0: Number(b?.y0), x1: Number(b?.x1), y1: Number(b?.y1), soft: !!b?.soft }))
        .filter(b => [b.x0, b.y0, b.x1, b.y1].every(Number.isFinite) && b.x1 > b.x0 && b.y1 > b.y0);
}

/**
 * Where the points go, as fractions of the layer's width and height: anywhere inside its margins, each at least
 * BALANCE.chain.spacing (in heights) from the others, and none with its middle inside an `avoid` box (fractions of
 * the layer too: the monster, widened by a point's half, so a tap meant for the monster never meets a point; the
 * fighters' bars and names, `soft`). Where there is no room, the spacing narrows, never below `minGap` (a point's
 * width: points never overlap), and then the soft boxes give way, never the others. `aspect` is the layer's width
 * over its height.
 */
export function placePoints(count = BALANCE.chain.points, aspect = 2, spacing = BALANCE.chain.spacing, avoid = [], minGap = 0) {
    const a = Math.max(0.6, Math.min(4, Number(aspect) || 2));
    const all = keepOut(avoid);
    const hard = all.filter(b => !b.soft);
    const floor = Math.max(0, Math.min(spacing, Number(minGap) || 0));
    const outside = boxes => p => boxes.every(b => p.x <= b.x0 || p.x >= b.x1 || p.y <= b.y0 || p.y >= b.y1);
    const apart = (p, q) => Math.hypot((p.x - q.x) * a, p.y - q.y);
    const rounded = p => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });
    for (const boxes of hard.length < all.length ? [all, hard] : [all]) {
        const clear = outside(boxes);
        for (let round = 0, gap = spacing; round < 6; round++, gap *= 0.85) {
            const g = Math.max(gap, floor);
            const points = [];
            for (let tries = 0; tries < 400 && points.length < count; tries++) {
                const p = { x: rng.float(0.1, 0.9), y: rng.float(0.16, 0.84) };
                if (clear(p) && points.every(q => apart(p, q) >= g)) points.push(p);
            }
            if (points.length === count) return points.map(rounded);
            if (g === floor) break;   // (no narrower spacing is allowed)
        }
    }
    // (too little room left to space them at random): spots on a fine grid outside the hard boxes, each the farthest
    // from those taken; a layer the boxes cover all over gets a row across its middle
    const clear = outside(hard);
    const free = [];
    for (let i = 0; i <= 16; i++) for (let j = 0; j <= 12; j++) {
        const p = { x: 0.1 + 0.8 * i / 16, y: 0.16 + 0.68 * j / 12 };
        if (clear(p)) free.push(p);
    }
    if (free.length < count) return Array.from({ length: count }, (_, i) => ({ x: 0.1 + 0.8 * (i + 0.5) / count, y: 0.5 }));
    const taken = free.splice(rng.int(0, free.length - 1), 1);
    while (taken.length < count) {
        let best = 0, far = -1;
        free.forEach((p, k) => { const d = Math.min(...taken.map(q => apart(p, q))); if (d > far) { far = d; best = k; } });
        taken.push(...free.splice(best, 1));
    }
    return taken.map(rounded);
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

/**
 * Five points over the fight (`aspect`: the layer's width over its height; `avoid`: boxes no point may sit in, the
 * monster's, and the fighters' bars and names, soft; `minGap`: a point's width in the layer's heights; placePoints).
 * Null if no chain may start.
 */
export function startChain(game, aspect = 2, avoid = [], minGap = 0) {
    const state = game.state;
    const c = state.combat;
    const now = game.now;
    if (!chainReady(state, now)) return null;
    c.chain = { points: placePoints(BALANCE.chain.points, aspect, BALANCE.chain.spacing, avoid, minGap), next: 0, startedAt: now, endsAt: now + BALANCE.chain.ms, clickAt: 0 };
    game.emit({ type: 'chainStart', points: c.chain.points.length });
    return c.chain;
}

/**
 * A click in the fight while a chain is up: on point `index` (0-based), or elsewhere (null; the page sends none for
 * the monster, whose clicks are strikes). The chain counts one click every clickGapMs, wherever it lands, on a clock
 * of its own (a strike never waits on it, nor it on a strike); the next point in turn moves the chain on and keeps
 * the combo from fading meanwhile, anything else does nothing. Returns true when it struck the next point.
 */
export function chainClick(game, index) {
    const state = game.state;
    const c = state.combat;
    const ch = c.chain;
    const now = game.now;
    if (!ch || now > ch.endsAt) return false;
    if (now - (ch.clickAt || 0) < BALANCE.chain.clickGapMs) return false;   // too soon after its last: not counted
    ch.clickAt = now;
    if (index !== ch.next) return false;
    ch.next++;
    c.lastComboAt = now;   // the hands are on the chain: the combo holds (it fades from the last strike or point struck)
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
