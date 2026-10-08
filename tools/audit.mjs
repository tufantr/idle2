#!/usr/bin/env node
// The report card of docs/research_notes/robust-and-fun/D_robustness_methods.md §6: reads the batches in
// runs/ (tools/batch.mjs) and checks them against the research's thresholds. Each check reads the
// batch labels the audit's runs use (E1-P1 the baseline, E1-P2-auto, E4-without-<system>, E6-cursed…);
// missing batches are skipped.
//
//   node tools/audit.mjs            # the report card, as Markdown
//   node tools/audit.mjs --json     # the numbers behind it
//   node tools/audit.mjs --runs=<dir>   # batches run from another copy of the game

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const runsArg = process.argv.slice(2).find(a => a.startsWith('--runs='));
const RUNS = runsArg ? runsArg.slice('--runs='.length) : join(ROOT, 'runs');   // --runs=<dir>: batches kept elsewhere

const batch = label => {
    const dir = join(RUNS, label);
    if (!existsSync(dir)) return null;
    return readdirSync(dir).filter(f => /^\d+\.json$/.test(f)).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
};
const pct = (values, p) => {
    const v = values.filter(x => x !== null && x !== undefined && Number.isFinite(x)).sort((a, b) => a - b);
    return v.length ? v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))] : null;
};
const med = values => pct(values, 0.5);
const fmt = (x, d = 1) => (x === null || x === undefined ? '—' : Number(x).toFixed(d));
const stageAt = (runs, m) => runs.map(r => r.stages[m]);
const MILESTONES = [100, 150, 200];

const out = [];
const data = {};
const check = (ok, text) => out.push(`- ${ok === null ? '◻︎' : ok ? '✅' : '❌'} ${text}`);

// ---------- E1: the baseline's spread ----------
const base = batch('E1-P1');
if (base) {
    out.push(`## E1 · the baseline (${base.length} seeds, 150 h, commit ${base[0].commit})\n`);
    out.push('| Stage | Median h | P10 | P90 | P90/median | Reached |\n|---|---|---|---|---|---|');
    for (const m of [50, 100, 150, 200, 250, 300]) {
        const v = stageAt(base, m).filter(x => x !== null);
        if (!v.length) continue;
        out.push(`| ${m} | ${fmt(med(v))} | ${fmt(pct(v, 0.1))} | ${fmt(pct(v, 0.9))} | ${fmt(pct(v, 0.9) / med(v), 2)} | ${v.length}/${base.length} |`);
    }
    const s200 = stageAt(base, 200).filter(x => x !== null);
    data.e1 = { median200: med(s200), p90over: pct(s200, 0.9) / med(s200) };
    out.push('');
    check(data.e1.p90over <= 1.15, `P90 / median of hours to stage 200 is ${fmt(data.e1.p90over, 2)} (at most 1.15)`);
    const firstPrestige = med(base.map(r => r.firstPrestige));
    check(firstPrestige !== null && firstPrestige <= 1.5, `first prestige at ${fmt(firstPrestige, 2)} h (the one the guide teaches; an hour and a half at most)`);
    // ---------- E2: the bot's own health ----------
    out.push('\n## E2 · bot QA\n');
    const agility = base.map(r => (r.taskHours.agility || 0) / r.hours);
    check(Math.max(...agility) <= 0.27, `agility's share of the bot's time at most ${fmt(100 * Math.max(...agility))}% (27% allowed)`);
    const away = base.map(r => r.longestAwayFromFightHours);
    check(Math.max(...away) <= 2, `longest stretch away from a fight that could gain a stage: ${fmt(Math.max(...away), 2)} h (2 h allowed)`);
    const prest = base.map(r => r.final.prestiges);
    const outliers = base.filter(r => Math.abs(r.final.prestiges - med(prest)) > 0.25 * med(prest)).map(r => r.seed);
    check(!outliers.length, `prestige counts within ±25% of the median ${med(prest)}${outliers.length ? ` (outliers: seeds ${outliers.join(', ')})` : ''}`);
}

// ---------- E4: policies and restricted play ----------
const policies = [['E1-P2-auto', 'Auto on'], ['E1-P3-pusher', 'AFK pusher'], ['E1-P4-farmer', 'ladder farmer'], ['E1-P5-skiller', 'skiller'], ['E4-P6-speed', 'speed prestiger'], ['E4-P10-varied', 'varied bots']];
if (base) {
    out.push('\n## E4 · players and systems\n');
    out.push('| Player | Stage 100 | 150 | 200 | Faster than the baseline at every milestone |\n|---|---|---|---|---|');
    data.e4 = {};
    for (const [label, name] of policies) {
        const runs = batch(label);
        if (!runs) continue;
        const ratios = MILESTONES.map(m => med(stageAt(base, m)) / med(stageAt(runs, m)));
        data.e4[label] = ratios;
        const allFaster = ratios.every(r => r !== null && Number.isFinite(r) && r > 1);
        out.push(`| ${name} | ${MILESTONES.map(m => fmt(med(stageAt(runs, m)))).join(' | ')} | ${allFaster ? `×${fmt(Math.min(...ratios), 2)}` : 'no'} |`);
    }
    const dominant = Object.entries(data.e4).filter(([, r]) => r.every(x => Number.isFinite(x) && x >= 1.5));
    check(!dominant.length, `no player is 1.5× faster than the baseline at every milestone${dominant.length ? ` (${dominant.map(([l]) => l).join(', ')})` : ''}`);
    // Stage 250 too: some systems (the anvil's reinforcing) tell only in the deep Abyss.
    const LATE = [150, 200, 250];
    out.push('\n| Without | Stage 150 | 200 | 250 | Slower than the baseline by |\n|---|---|---|---|---|');
    data.without = {};
    for (const sys of ['dungeons', 'titan', 'farming', 'agility', 'anvil', 'camp', 'perks', 'crafting', 'essence']) {
        const runs = batch(`E4-without-${sys}`);
        if (!runs) continue;
        const slow = LATE.map(m => { const a = med(stageAt(runs, m)); const b = med(stageAt(base, m)); return a === null ? Infinity : a / b; });
        data.without[sys] = slow;
        out.push(`| ${sys} | ${LATE.map(m => fmt(med(stageAt(runs, m)))).join(' | ')} | ${slow.map(x => (Number.isFinite(x) ? `×${fmt(x, 2)}` : 'never')).join(', ')} |`);
    }
    for (const [sys, slow] of Object.entries(data.without)) {
        const worst = Math.max(...slow);
        if (worst > 2) check(false, `${sys} is mandatory: without it the bot is ${Number.isFinite(worst) ? `×${fmt(worst, 2)}` : 'never'} slower`);
        else if (worst < 1.05) check(false, `${sys} looks dead for this bot: ${fmt(100 * (worst - 1))}% slower without it`);
        else check(true, `${sys} matters (×${fmt(worst, 2)} slower without it) without being mandatory`);
    }
}

// ---------- E5: big moments against the targets ----------
if (base && base[0].moments) {
    out.push('\n## E5 · big moments (B §8.1 targets)\n');
    const TARGETS = { '10-50': [1 / 4, 12], '50-150': [1 / 6, 24], '150-300': [1 / 24, 72], '300-500': [1 / 24, 72], '500-1000': [1 / 48, 168] };
    out.push('| Band (h) | Per hour (median) | Longest gap: median, P90 seed | Target |\n|---|---|---|---|');
    for (const [band, [rate, gap]] of Object.entries(TARGETS)) {
        const rows = base.map(r => r.moments.major.find(b => b.band === band)).filter(Boolean);
        if (!rows.length) continue;
        const perHour = med(rows.map(b => b.perHour));
        const longest = rows.map(b => b.max);
        out.push(`| ${band} | ${fmt(perHour, 2)} | ${fmt(med(longest))}, ${fmt(pct(longest, 0.9))} | ≥ ${fmt(rate, 3)} an hour, ≤ ${gap} h |`);
        check(perHour >= rate && med(longest) <= gap, `${band} h: ${fmt(perHour, 2)} big moments an hour, longest gap ${fmt(med(longest))} h`);
    }
}

// ---------- E6: luck ----------
const cursed = batch('E6-cursed');
const blessed = batch('E6-blessed');
if (base && cursed && blessed) {
    out.push('\n## E6 · luck (gear drop chance −40% / +40%)\n');
    const slower = MILESTONES.map(m => med(stageAt(cursed, m)) / med(stageAt(base, m)));
    const faster = MILESTONES.map(m => med(stageAt(base, m)) / med(stageAt(blessed, m)));
    check(slower.every(x => x <= 1.5), `cursed drops: ${slower.map(x => `×${fmt(x, 2)}`).join(', ')} slower to stages 100/150/200 (at most ×1.5)`);
    check(faster.every(x => x <= 1.5), `blessed drops: ${faster.map(x => `×${fmt(x, 2)}`).join(', ')} faster (no runaway)`);
    const pity = base.map(r => r.final.pityDrops);
    out.push(`- pity drops in 150 h: median ${med(pity)} (P10–P90 ${pct(pity, 0.1)}–${pct(pity, 0.9)})`);
}

// ---------- E7: one at a time ----------
if (base && existsSync(RUNS)) {
    const labels = readdirSync(RUNS).filter(l => l.startsWith('E7-'));
    if (labels.length) {
        out.push('\n## E7 · sensitivity (elasticity of hours to stage 200, on its steeper side; |ε| > 2 is a knife-edge)\n');
        const levels = [...new Set(labels.map(l => l.match(/-([-0-9.]+)$/)?.[1]).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
        out.push(`| Knob | ${levels.map(f => `${Number(f) > 0 ? '+' : ''}${Math.round(100 * Number(f))}%`).join(' | ')} | ε |\n|---|${levels.map(() => '---|').join('')}---|`);
        const b200 = med(stageAt(base, 200));
        const knobs = [...new Set(labels.map(l => l.replace(/^E7-/, '').replace(/-[-0-9.]+$/, '')))];
        data.e7 = {};
        for (const k of knobs) {
            const row = levels.map(f => { const runs = batch(`E7-${k}-${f}`); return runs && runs.length ? med(stageAt(runs, 200)) : undefined; });
            const e = levels.map((f, i) => [Number(f), row[i]]).filter(([, h]) => h !== undefined && h !== null).map(([f, h]) => (h / b200 - 1) / f);
            const eps = e.length ? e.reduce((w, x) => (Math.abs(x) > Math.abs(w) ? x : w)) : null;   // the steeper side: a knife-edge either way counts
            data.e7[k] = { row, eps };
            out.push(`| ${k} | ${row.map(h => (h === undefined ? '' : h === null ? 'never' : fmt(h))).join(' | ')} | ${fmt(eps, 2)} |`);
        }
        const edges = Object.entries(data.e7).filter(([, v]) => v.eps !== null && Math.abs(v.eps) > 2);
        check(!edges.length, `knife-edges: ${edges.length ? edges.map(([k, v]) => `${k} (ε ${fmt(v.eps, 1)})`).join(', ') : 'none'}`);
    }
}

// ---------- E11: the leaderboard's honest envelope ----------
const all = existsSync(RUNS) ? readdirSync(RUNS).filter(l => /^E1-|^E4-P/.test(l)).flatMap(l => batch(l) || []) : [];
if (all.length && all[0].bestByHour) {
    out.push('\n## E11 · the leaderboard envelope (most best stages gained in an hour, by best stage)\n');
    const bands = [[0, 50], [50, 100], [100, 150], [150, 200], [200, 250], [250, 300], [300, 1e9]];
    data.e11 = [];
    out.push('| Best stage | Hours seen | P99.9 gain an hour | Most |\n|---|---|---|---|');
    for (const [a, b] of bands) {
        const gains = [];
        for (const r of all) for (let h = 0; h + 1 < r.bestByHour.length; h++) if (r.bestByHour[h] >= a && r.bestByHour[h] < b) gains.push(r.bestByHour[h + 1] - r.bestByHour[h]);
        if (!gains.length) continue;
        const top = pct(gains, 0.999);
        data.e11.push({ from: a, to: b, p999: top, max: Math.max(...gains), n: gains.length });
        out.push(`| ${a}–${b === 1e9 ? '…' : b} | ${gains.length} | ${top} | ${Math.max(...gains)} |`);
    }
}

if (args.has('--json')) console.log(JSON.stringify(data, null, 1));
else console.log(out.join('\n'));
