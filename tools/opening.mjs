#!/usr/bin/env node
// A new player's first minutes, played five ways, and when each "first" happens (median over seeds):
//   idle        does nothing after Begin
//   watcher     never strikes, but takes what the screen offers: wears an upgrade, buys a camp level
//   tapper      strikes the monster five times a second, and takes the same offers
//   skiller     mines, then smelts, hunts and cooks as those places open (and takes the offers)
//   background  begins, then leaves the game in a background tab: nobody looks, nothing is clicked
// Also: when each place opens (the first seed), the longest stretch with nothing new (a kill of a
// boss, a level, a drop, an unlock, a new zone, a fall), and the pacing checks of
// docs/research_notes/robust-and-fun/A_onboarding_pacing.md §5.7: places by minutes 3, 10, 20 and 60
// against the caps, the most in any ten minutes, the smallest gap, none during a boss fight, none
// while nobody attends. See docs/research_notes/first-session.md.
//
//   node tools/opening.mjs              # five minutes, five seeds
//   node tools/opening.mjs 60 3         # an hour, three seeds

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { seen } from '../src/systems/disclosure.js';
import { findUpgrade } from '../src/systems/inventory.js';
import { UNLOCKS } from '../src/data/unlocks.js';

const minutes = Number(process.argv[2] || 5);
const seeds = Number(process.argv[3] || 5);
const T0 = 1_700_000_000_000;
const PACED = new Set(UNLOCKS.filter(u => u.pace).map(u => u.id));
// Caps by minute (A §5.2): a player who only fights, and any player.
const CAPS = [[3, 1, 2], [10, 3, 4], [20, 5, 6], [60, 7, 8]];

/** The skiller's next job: mine, smelt what was mined, hunt, cook what was hunted. */
function skillerWork(game) {
    const s = game.state;
    const doing = s.action ? `${s.action.kind}:${s.action.id}` : '';
    let want;
    if (s.unlocks.cooking && s.resources.raw_rabbit >= 5) want = ['node', 'cooking', 'cooked_rabbit'];
    else if (s.unlocks.hunting && s.resources.raw_rabbit < 10 && (s.stats.actionsBySkill.hunting || 0) < 30) want = ['node', 'hunting', 'raw_rabbit'];
    else if (s.unlocks.smithing && s.resources.copper_ore >= 5) want = ['smelt', 'copper_bar'];
    else want = ['node', 'mining', 'copper_ore'];
    const key = want[0] === 'smelt' ? `smelt:${want[1]}` : `node:${want[2]}`;
    if (doing === key && !s.action?.stalled) return;
    if (want[0] === 'smelt') game.startSmelting(want[1]); else game.startNodeAction(want[1], want[2]);
}

function play(policy, seed) {
    rng.setSource(seededRandom(seed));
    const game = new Game(null, T0);
    game.enterCombat();
    if (policy === 'background') { game.setAttending(false); game.state.meta.lastInputAt = T0 - 3600_000; }
    const firsts = {};
    const first = (key, now) => { if (!(key in firsts)) firsts[key] = Math.round((now - T0) / 100) / 10; };
    const moments = [];
    const unlocks = [];
    let now = T0;
    for (let i = 0; now < T0 + minutes * 60000; i++) {
        now += 100;
        if (policy === 'tapper' && i % 2 === 0) game.clickAttack();
        if (policy === 'skiller' && i % 300 === 0) skillerWork(game);
        game.tick(now);
        const bossOn = !!(game.state.combat.active && game.state.combat.enemy?.boss);   // a place is decided at the end of the tick
        if (policy !== 'idle' && policy !== 'background') {
            const up = findUpgrade(game.state);
            if (up && game.equipItem(up.item.id)) { first('equip', now); moments.push(now); }
            if (seen(game.state, 'camp')) {
                for (const u of CAMP_UPGRADES) if (game.state.gold >= campPrice(game.state, u) && game.buyCampUpgrade(u.id, 1)) first('camp', now);
            }
        }
        for (const ev of game.drainEvents()) {
            if (ev.type === 'kill') { first('kill', now); if (ev.enemy.boss) { first('boss', now); moments.push(now); } }
            else if (ev.type === 'death') { first('fall', now); moments.push(now); }
            else if (ev.type === 'bossTimeout') first('boss held out', now);
            else if (ev.type === 'unlock') {
                first('unlock', now);
                unlocks.push({ id: ev.id, at: (now - T0) / 1000, boss: bossOn, attended: game.attending || now - game.state.meta.lastInputAt < 180_000 });
                moments.push(now);
            }
            else if (ev.type === 'itemDropped') { first('gear', now); moments.push(now); }
            else if (ev.type === 'zoneReached') { if (!ev.stratum) first(`zone ${Math.floor((ev.stage - 1) / 10) + 1}`, now); moments.push(now); }
            else if (ev.type === 'levelUp') moments.push(now);
        }
        if (game.state.combat.stage >= 10) first('stage 10', now);
    }
    moments.sort((a, b) => a - b);
    let gap = 0;
    let prev = T0;
    for (const m of moments) { gap = Math.max(gap, m - prev); prev = m; }
    gap = Math.max(gap, now - prev);
    return { firsts, unlocks, best: game.state.combat.bestStage, falls: game.state.stats.deaths, gap: Math.round(gap / 1000) };
}

/** The pacing checks for one run: problems found, as text. */
function checks(policy, run) {
    const problems = [];
    const at = run.unlocks.map(u => u.at);
    for (const [minute, fightOnly, any] of CAPS) {
        if (minute > minutes) continue;
        const n = at.filter(t => t <= minute * 60).length;
        const cap = policy === 'skiller' ? any : fightOnly;
        if (n > cap) problems.push(`${n} places by minute ${minute} (cap ${cap})`);
    }
    for (let i = 1; i < run.unlocks.length; i++) {
        const [a, b] = [run.unlocks[i - 1], run.unlocks[i]];
        if (b.at - a.at < 90) problems.push(`${b.id} ${Math.round(b.at - a.at)} s after ${a.id}`);
    }
    const climbing = run.unlocks.filter(u => PACED.has(u.id));
    for (let i = 2; i < climbing.length; i++) if (climbing[i].at - climbing[i - 1].at < 180) problems.push(`${climbing[i].id} ${Math.round(climbing[i].at - climbing[i - 1].at)} s after ${climbing[i - 1].id}`);
    for (const u of run.unlocks) {
        if (u.boss) problems.push(`${u.id} during a boss fight`);
        if (!u.attended) problems.push(`${u.id} while nobody attended`);
    }
    return problems;
}

const median = values => { const v = values.filter(x => x !== undefined).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : undefined; };
const mostInTen = times => Math.max(0, ...times.map(t => times.filter(u => u >= t && u < t + 600).length));
console.log(`A new player's first ${minutes} minutes (median of ${seeds} seeds, seconds)\n`);
let failed = 0;
for (const policy of ['idle', 'watcher', 'tapper', 'skiller', 'background']) {
    const runs = Array.from({ length: seeds }, (_, s) => play(policy, s + 1));
    const keys = [...new Set(runs.flatMap(r => Object.keys(r.firsts)))].sort((a, b) => median(runs.map(r => r.firsts[a])) - median(runs.map(r => r.firsts[b])));
    const firsts = keys.map(k => { const have = runs.filter(r => k in r.firsts).length; return `${k} ${median(runs.map(r => r.firsts[k]))}${have < seeds ? ` (${have}/${seeds})` : ''}`; });
    console.log(`${policy.padEnd(10)} ${firsts.join(' · ')}`);
    console.log(`${''.padEnd(10)} best stage ${median(runs.map(r => r.best))} · falls ${median(runs.map(r => r.falls))} · longest stretch with nothing new ${median(runs.map(r => r.gap))} s`);
    console.log(`${''.padEnd(10)} places: ${runs[0].unlocks.map(u => `${u.id}@${Math.round(u.at)}`).join(' ') || 'none'} · most in any ten minutes ${median(runs.map(r => mostInTen(r.unlocks.map(u => u.at))))}`);
    const problems = [...new Set(runs.flatMap(r => checks(policy, r)))];
    failed += problems.length;
    console.log(`${''.padEnd(10)} pacing: ${problems.length ? problems.join('; ') : 'ok'}\n`);
}
process.exit(failed ? 1 : 0);
