#!/usr/bin/env node
// Many simulator runs at once, summarised: the median and the 10th and 90th percentiles over seeds,
// as docs/research_notes/robust-and-fun/D_robustness_methods.md §1 asks (3–4 seeds show a direction;
// percentiles want 30 or more). Every option it does not know goes to tools/simulate.mjs.
//
//   node tools/batch.mjs --seeds=30 --hours=150                     # seeds 1–30
//   node tools/batch.mjs --seeds=31-60 --hours=150 --auto --label=auto
//   node tools/batch.mjs --seeds=10 --player=checkin3 --hours=336
//   node tools/batch.mjs --seeds=10 --set=BALANCE.abyss.dropGrowth:1.52 --label=dg152
//   node tools/batch.mjs --seeds=30 --vary=seed --label=varied                  # a different sensible bot per seed
//
// Writes one JSON per run and summary.json to runs/<label>/ (git-ignored), and prints the report.
// --jobs=N sets how many run at once (default: the cores less one).

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const OWN = new Set(['seeds', 'jobs', 'label', 'out', 'quiet', 'skip-existing']);
const pass = Object.entries(args).filter(([k]) => !OWN.has(k)).map(([k, v]) => (v === true ? `--${k}` : `--${k}=${v}`));
const [lo, hi] = String(args.seeds || 10).includes('-') ? String(args.seeds).split('-').map(Number) : [1, Number(args.seeds || 10)];
const seeds = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const label = String(args.label || [args.player || 'online', args.auto ? 'auto' : '', args.hours ? `${args.hours}h` : ''].filter(Boolean).join('-'));
const OUT = String(args.out || join(ROOT, 'runs', label));
const JOBS = Number(args.jobs || Math.max(1, cpus().length - 1));
mkdirSync(OUT, { recursive: true });

/** Run the seeds, JOBS at a time. */
async function runAll() {
    let next = 0;
    let todo = seeds;
    let done = 0;
    const started = Date.now();
    const one = seed => new Promise(resolve => {
        const file = join(OUT, `${seed}.json`);
        // --vary=seed: each seed plays its own variant of the bot's thresholds (simulate.mjs POLICY)
        const own = pass.map(a => (a === '--vary=seed' ? `--vary=${seed}` : a));
        const child = spawn(process.execPath, [join(ROOT, 'tools/simulate.mjs'), `--seed=${seed}`, '--snapshot=1000000', `--json=${file}`, ...own], { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        child.stderr.on('data', d => { err += d; });
        child.on('close', code => {
            done++;
            if (code !== 0) console.error(`seed ${seed} failed (${code}): ${err.slice(0, 400)}`);
            if (!args.quiet) process.stderr.write(`\r${done}/${todo.length} runs, ${((Date.now() - started) / 1000).toFixed(0)} s   `);
            resolve();
        });
    });
    // --skip-existing: seeds already run (a batch stopped part-way) are not run again
    todo = args['skip-existing'] ? seeds.filter(seed => !existsSync(join(OUT, `${seed}.json`))) : seeds;
    await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, async () => { while (next < todo.length) await one(todo[next++]); }));
    if (!args.quiet) process.stderr.write('\n');
}

const pct = (values, p) => {
    const v = values.filter(x => x !== null && x !== undefined && Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return null;
    return v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))];
};
const fmt = x => (x === null || x === undefined ? '—' : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2));
/** Median with P10–P90, and how many runs got there at all. */
function spread(values) {
    const got = values.filter(x => x !== null && x !== undefined);
    return { median: pct(got, 0.5), p10: pct(got, 0.1), p90: pct(got, 0.9), reached: got.length, of: values.length };
}
const cell = s => (s.reached ? `${fmt(s.median)} (${fmt(s.p10)}–${fmt(s.p90)})${s.reached < s.of ? ` ${s.reached}/${s.of}` : ''}` : `— 0/${s.of}`);

function summarise(runs) {
    const sum = { label, seeds: runs.map(r => r.seed), commit: runs[0]?.commit, args: pass, n: runs.length };
    sum.stages = Object.fromEntries(Object.keys(runs[0].stages).map(m => [m, spread(runs.map(r => r.stages[m]))]));
    sum.weaponTier = Object.fromEntries(Object.keys(runs[0].weaponTier).map(t => [t, spread(runs.map(r => r.weaponTier[t]))]));
    sum.firstPrestige = spread(runs.map(r => r.firstPrestige));
    sum.autoEarned = spread(runs.map(r => r.autoEarned));
    for (const k of ['bestStage', 'prestiges', 'records', 'deaths', 'titanKills', 'pityDrops', 'skillLevels', 'obstacles', 'medals', 'pets']) sum[k] = spread(runs.map(r => r.final[k]));
    sum.runHours = spread(runs.map(r => r.runs.medianHours));
    sum.goldSpentShare = spread(runs.map(r => (r.gold.earned > 0 ? r.gold.spent / r.gold.earned : 0)));
    sum.longestAwayFromFight = spread(runs.map(r => r.longestAwayFromFightHours));
    const kinds = [...new Set(runs.flatMap(r => Object.keys(r.taskHours)))];
    sum.taskShare = Object.fromEntries(kinds.map(k => [k, spread(runs.map(r => (r.taskHours[k] || 0) / r.hours))]));
    if (runs[0].moments) {
        sum.moments = runs[0].moments.major.map((b, i) => ({
            band: b.band,
            perHour: spread(runs.map(r => r.moments.major[i]?.perHour)),
            p90: spread(runs.map(r => r.moments.major[i]?.p90)),
            longest: spread(runs.map(r => r.moments.major[i]?.max))
        }));
    }
    if (runs[0].returns) {
        sum.returns = Object.fromEntries(['something', 'nothing', 'crate', 'titan', 'prestige', 'gear', 'newBest', 'medal', 'autoPrestige'].map(k => [k, spread(runs.map(r => r.returns[k] / Math.max(1, r.returns.n)))]));
        sum.offlineCappedHours = spread(runs.map(r => r.returns.offlineCappedHours));
    }
    return sum;
}

function report(sum) {
    const lines = [];
    lines.push(`## ${sum.label}: ${sum.n} runs (seeds ${sum.seeds[0]}–${sum.seeds.at(-1)}), commit ${sum.commit || '?'}${sum.args.length ? `, ${sum.args.join(' ')}` : ''}`);
    lines.push('Median (P10–P90) over seeds; "k/n" when only k of the n runs got there.\n');
    lines.push('| Stage | Hours |\n|---|---|');
    for (const [m, s] of Object.entries(sum.stages)) if (s.reached) lines.push(`| ${m} | ${cell(s)} |`);
    lines.push('\n| Measure | Value |\n|---|---|');
    lines.push(`| First prestige (h) | ${cell(sum.firstPrestige)} |`);
    lines.push(`| Auto earned (h) | ${cell(sum.autoEarned)} |`);
    lines.push(`| Weapon tier 5 / 7 (h) | ${cell(sum.weaponTier[5])} / ${cell(sum.weaponTier[7])} |`);
    for (const k of ['bestStage', 'prestiges', 'records', 'deaths', 'titanKills', 'pityDrops', 'skillLevels', 'obstacles', 'medals', 'pets']) lines.push(`| ${k} at the end | ${cell(sum[k])} |`);
    lines.push(`| Median run (h) | ${cell(sum.runHours)} |`);
    lines.push(`| Gold spent / earned | ${cell(sum.goldSpentShare)} |`);
    lines.push(`| Longest away from a winnable fight (h) | ${cell(sum.longestAwayFromFight)} |`);
    lines.push(`| Time by task | ${Object.entries(sum.taskShare).map(([k, s]) => `${k} ${fmt(100 * s.median)}%`).join(', ')} |`);
    if (sum.moments) {
        lines.push('\n| Band (h) | Big moments an hour | P90 gap (h) | Longest gap (h) |\n|---|---|---|---|');
        for (const b of sum.moments) lines.push(`| ${b.band} | ${cell(b.perHour)} | ${cell(b.p90)} | ${cell(b.longest)} |`);
    }
    if (sum.returns) {
        lines.push('\n| Returns with… | Share |\n|---|---|');
        for (const [k, s] of Object.entries(sum.returns)) lines.push(`| ${k} | ${cell(s)} |`);
        lines.push(`| Hours past the offline cap, in all | ${cell(sum.offlineCappedHours)} |`);
    }
    return lines.join('\n');
}

await runAll();
const runs = seeds.map(seed => join(OUT, `${seed}.json`)).filter(f => existsSync(f)).map(f => JSON.parse(readFileSync(f, 'utf8')));
if (!runs.length) { console.error('no runs finished'); process.exit(1); }
const sum = summarise(runs);
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(sum, null, 1));
console.log(report(sum));
