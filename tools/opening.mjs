#!/usr/bin/env node
// A new player's first minutes, played three ways, and when each "first" happens (median over seeds):
//   idle     does nothing after Begin
//   watcher  never strikes, but takes what the screen offers: wears an upgrade, buys a camp level
//   tapper   strikes the monster five times a second, and takes the same offers
// Also: when each place opens (the first seed), and the longest stretch with nothing new (a kill of a
// boss, a level, a drop, an unlock, a new zone, a fall). See docs/research_notes/first-session.md.
//
//   node tools/opening.mjs              # five minutes, five seeds
//   node tools/opening.mjs 10 3         # ten minutes, three seeds

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { seen } from '../src/systems/disclosure.js';
import { findUpgrade } from '../src/systems/inventory.js';

const minutes = Number(process.argv[2] || 5);
const seeds = Number(process.argv[3] || 5);
const T0 = 1_700_000_000_000;

function play(policy, seed) {
    rng.setSource(seededRandom(seed));
    const game = new Game(null, T0);
    game.enterCombat();
    const firsts = {};
    const first = (key, now) => { if (!(key in firsts)) firsts[key] = Math.round((now - T0) / 100) / 10; };
    const moments = [];
    const unlocks = [];
    let now = T0;
    for (let i = 0; now < T0 + minutes * 60000; i++) {
        now += 100;
        if (policy === 'tapper' && i % 2 === 0) game.clickAttack();
        game.tick(now);
        if (policy !== 'idle') {
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
            else if (ev.type === 'unlock') { first('unlock', now); unlocks.push(`${ev.id}@${Math.round((now - T0) / 1000)}`); moments.push(now); }
            else if (ev.type === 'itemDropped') { first('gear', now); moments.push(now); }
            else if (ev.type === 'zoneReached') { first('zone 2', now); moments.push(now); }
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

const median = values => { const v = values.filter(x => x !== undefined).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : undefined; };
console.log(`A new player's first ${minutes} minutes (median of ${seeds} seeds, seconds)\n`);
for (const policy of ['idle', 'watcher', 'tapper']) {
    const runs = Array.from({ length: seeds }, (_, s) => play(policy, s + 1));
    const keys = [...new Set(runs.flatMap(r => Object.keys(r.firsts)))].sort((a, b) => median(runs.map(r => r.firsts[a])) - median(runs.map(r => r.firsts[b])));
    const firsts = keys.map(k => { const have = runs.filter(r => k in r.firsts).length; return `${k} ${median(runs.map(r => r.firsts[k]))}${have < seeds ? ` (${have}/${seeds})` : ''}`; });
    console.log(`${policy.padEnd(8)} ${firsts.join(' · ')}`);
    console.log(`${''.padEnd(8)} best stage ${median(runs.map(r => r.best))} · falls ${median(runs.map(r => r.falls))} · longest stretch with nothing new ${median(runs.map(r => r.gap))} s`);
    console.log(`${''.padEnd(8)} places: ${runs[0].unlocks.join(' ') || 'none'}\n`);
}
