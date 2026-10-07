#!/usr/bin/env node
// Reads a playtest log exported from Settings (src/systems/playtest.js) and sets it beside the
// simulator: big moments by band of hours (as tools/simulate.mjs's log of them), the longest stretches
// with nothing big, the sessions (returns, the page in and out of view), and what each return brought.
//
//   node tools/playtest.mjs fantasy-idle-playtest-2026-10-07.json
//   node tools/playtest.mjs log.json --vs=runs/E1-P1/summary.json     # with a batch's medians beside it

import { readFileSync } from 'node:fs';

const [file, ...rest] = process.argv.slice(2);
if (!file) { console.error('node tools/playtest.mjs <exported log.json> [--vs=runs/<label>/summary.json]'); process.exit(2); }
const log = JSON.parse(readFileSync(file, 'utf8'));
if (log.kind !== 'fantasy-idle-playtest') { console.error('not a Fantasy Idle playtest log'); process.exit(2); }
const vsArg = rest.find(a => a.startsWith('--vs='));
const vs = vsArg ? JSON.parse(readFileSync(vsArg.slice(5), 'utf8')) : null;

const events = log.events.slice().sort((a, b) => a.t - b.t);
if (!events.length) { console.log('The log is empty.'); process.exit(0); }
const t0 = events[0].t;
const H = t => (t - t0) / 3600000;
const span = H(events[events.length - 1].t);
const fmt = (x, d = 1) => (x === null || x === undefined ? '—' : Number(x).toFixed(d));

console.log(`# Playtest log: ${events.length} entries over ${fmt(span)} h (best stage ${log.bestStage}, ${log.prestiges} prestiges, ${fmt((log.attendedMs || 0) / 3600000)} h attended)\n`);

const BANDS = [[0, 1], [1, 10], [10, 50], [50, 150], [150, 300], [300, 500], [500, 1000]];
const majors = events.filter(e => e.cls === 'major');
console.log('| Band (h) | Big moments | Per hour | Longest gap (h) | Simulator: per hour, longest |\n|---|---|---|---|---|');
for (const [a, b] of BANDS) {
    if (a >= span) break;
    const end = Math.min(b, span);
    const times = majors.map(e => H(e.t)).filter(h => h >= a && h < end);
    const edges = [a, ...times, end];
    const longest = Math.max(...edges.slice(1).map((h, i) => h - edges[i]));
    const sim = vs?.moments?.find(m => m.band === `${a}-${b}`);
    console.log(`| ${a}-${b} | ${times.length} | ${fmt(times.length / (end - a), 2)} | ${fmt(longest)} | ${sim ? `${fmt(sim.perHour.median, 2)}, ${fmt(sim.longest.median)}` : ''} |`);
}

// Sessions: the stretches with the page in view, and what each return brought.
const returns = events.filter(e => e.kind === 'return');
const shows = events.filter(e => e.kind === 'show').length;
console.log(`\n${returns.length} returns after time away, ${shows} times the page came back into view.`);
if (returns.length) {
    let empty = 0;
    for (let i = 0; i < returns.length; i++) {
        const from = returns[i].t;
        const to = returns[i + 1]?.t ?? Infinity;
        const brought = events.filter(e => e.t >= from && e.t < Math.min(to, from + 10 * 60000) && e.cls !== 'minor');
        if (!brought.length) empty++;
    }
    console.log(`Returns with nothing big or medium in their first ten minutes: ${empty} of ${returns.length}.`);
}
const counts = {};
for (const e of events) counts[e.kind] = (counts[e.kind] || 0) + 1;
console.log(`\nBy kind: ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log('\nThe big moments:');
for (const e of majors) console.log(`  ${fmt(H(e.t), 2).padStart(7)} h  ${e.kind} ${e.what}`);
