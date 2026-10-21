// The chain (the owner, October 2026): every 20–30 seconds of a fight on screen, five numbered points appear over
// it. Struck in order, 1 to 5, before its clock runs out (BALANCE.chain.ms), they land a flurry of the hero's
// attacks and a chunk of combo, and now and then leave a small find; a fast chain always does. A click anywhere
// else, or on a point out of turn, does nothing: a player still clicking when they appear loses nothing. Clicking
// the monster no longer strikes it (a strike was a tenth of an attack, and an auto-clicker got 1.5 times an idle
// hero's damage from it); the clan boss's openings keep their strikes (systems/clanfight.js).
//
// What keeps a macro out: the fight counts one click every BALANCE.combat.strikeGapMs, wherever it lands, so a
// tool clicking at random over the fight gets about sixteen counted clicks in a chain's four seconds, each on the
// next point once in twenty or so; five in order come less than once in a thousand chains. The points fall
// anywhere (no grid a tool could learn), apart from one another. The page decides when the fight is on screen
// (ui/scene.js asks for a chain only then), so a chain never waits on a hidden tab or offline.

import { BALANCE, goldPerKillAtStage } from '../core/formulas.js';
import { rng } from '../core/rng.js';
import { POTIONS } from '../data/potions.js';
import { foodsByHealing } from '../data/resources.js';
import { bumpStat } from './progress.js';
import { choosingAfterClear } from './dungeon.js';
import { flurryStrike } from './combat.js';

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

/** All five in order: the flurry, the combo, perhaps a find; the next chain set. */
function finishChain(game) {
    const state = game.state;
    const c = state.combat;
    const b = BALANCE.chain;
    const ms = game.now - c.chain.startedAt;
    const fast = ms <= b.fastMs;
    c.chain = null;
    c.chainAt = game.now + rng.int(...b.everyMs);
    c.combo = Math.min(BALANCE.combat.comboMax, (c.combo || 0) + b.combo);
    c.lastComboAt = game.now;
    bumpStat(game, 'chains');
    if (fast) bumpStat(game, 'chainsFast');
    const dmg = flurryStrike(game, b.flurry);
    const find = fast || rng.chance(b.findChance) ? giveChainFind(game) : null;
    game.emit({ type: 'chainDone', ms, fast, dmg, find });
}

/**
 * A chain's find: gold (a few kills at the stage) most often; essence once it has turned up, a bottle of the fight's
 * potion when one is picked, a few of the best dish when he has one. Small by design: it is there for the player
 * who plays, not to make the fight.
 */
export function giveChainFind(game) {
    const state = game.state;
    const c = state.combat;
    const b = BALANCE.chain;
    const potion = c.mode === 'dungeon' ? c.dungeonPotion : c.potion;
    const dish = foodsByHealing().filter(f => state.resources[f.id] > 0).pop() || null;
    const kinds = [['gold', 4]];
    if ((state.stats.essenceFound || 0) > 0 || (state.resources.essence || 0) > 0) kinds.push(['essence', 2]);
    if (potion && POTIONS[potion]) kinds.push(['potion', 1]);
    if (dish) kinds.push(['food', 1]);
    let roll = rng.float(0, kinds.reduce((sum, [, w]) => sum + w, 0));
    const kind = (kinds.find(([, w]) => (roll -= w) < 0) || kinds[0])[0];
    let find;
    if (kind === 'gold') {
        const qty = goldPerKillAtStage(c.stage, game.derived?.goldMult || 1) * b.findGoldKills;
        state.gold += qty;
        bumpStat(game, 'goldEarned', qty);
        find = { kind, id: 'gold', qty };
    } else if (kind === 'essence') {
        state.resources.essence = (state.resources.essence || 0) + b.findEssence;
        bumpStat(game, 'essenceFound', b.findEssence);
        find = { kind, id: 'essence', qty: b.findEssence };
    } else if (kind === 'potion') {
        state.resources[potion] = (state.resources[potion] || 0) + 1;
        find = { kind, id: potion, qty: 1 };
    } else {
        state.resources[dish.id] = (state.resources[dish.id] || 0) + b.findFood;
        find = { kind, id: dish.id, qty: b.findFood };
    }
    bumpStat(game, 'chainFinds');
    game.markDirty();
    return find;
}
