#!/usr/bin/env node
// How far a run gets under each Trial's rule (src/data/trials.js), for heroes the simulator saved:
//
//   node tools/simulate.mjs --hours=300 --seed=1 --trials=0 --save-at=200,260,320 --save=runs/hero-1
//   node tools/trials.mjs runs/hero-1-200.json runs/hero-1-260.json runs/hero-1-320.json [--hours=3] [--stall=30]
//   [--only=brutes,glass] [--bite=brutes.enemyAtk:8;glass.heroHp:0.1]   (try other strengths)
//
// From each save: one plain run and one run per Trial, each begun by a prestige and fought until it goes
// `--stall` minutes without a new best (or `--hours` in all), buying the camp as the gold comes in, as the
// simulator's bot does. The table gives the stage each run reached and how many of the Trial's tiers that
// clears: what the Trials' first stages are set from (docs/DESIGN.md §3.26).

import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { TRIALS, TRIAL_TIERS, trialTarget } from '../src/data/trials.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!files.length) { console.error('node tools/trials.mjs <save.json>... [--hours=3] [--stall=30]'); process.exit(2); }
const HOURS = Number(args.hours || 3);
const STALL_MS = Number(args.stall || 30) * 60000;
const STEP = 500;
const ONLY = args.only ? new Set(String(args.only).split(',')) : null;
for (const kv of String(args.bite || '').split(';').filter(Boolean)) {
    const [path, raw] = kv.split(':');
    const [id, key] = path.split('.');
    const trial = TRIALS.find(t => t.id === id);
    if (!trial || !key) { console.error(`--bite: no Trial ${id}`); process.exit(2); }
    trial.bite = { ...trial.bite, [key]: raw === 'true' ? true : raw === 'false' ? false : Number(raw) };
}
const SHOWN = TRIALS.filter(t => !ONLY || ONLY.has(t.id));

/** One run from the save: a prestige (into `trialId`, or a plain one), then the fight until it stalls. */
function run(text, trialId) {
    rng.setSource(seededRandom(99));
    const raw = JSON.parse(text);
    let now = Number(raw.meta?.lastActiveAt) || 0;
    const game = new Game(raw, now);
    const S = game.state;
    S.settings.autoPrestige = false;
    if (S.combat.mode !== 'stages') returnToStages(game);
    S.combat.farmMode = false;
    S.prestige.runStartedAt = Math.min(S.prestige.runStartedAt, now - BALANCE.prestige.minRunMs);
    S.combat.maxStage = Math.max(S.combat.maxStage, BALANCE.prestige.minStage);
    if (!(trialId ? game.startTrial(trialId) : game.prestige())) return null;
    game.enterCombat();
    const start = now;
    let best = S.combat.maxStage;
    let riseAt = now;
    while (now - start < HOURS * 3600000 && now - riseAt < STALL_MS) {
        now += STEP;
        game.tick(now);
        game.drainEvents();
        if (!S.combat.active && !S.combat.recovering) game.enterCombat();
        if (S.combat.maxStage > best) { best = S.combat.maxStage; riseAt = now; }
        if (now % 60000 < STEP) buyCamp(game);
    }
    return { reached: best, hours: (riseAt - start) / 3600000 };
}

/** The camp, cheapest level first, keeping a little gold back (as tools/simulate.mjs's bot). */
function buyCamp(game) {
    const S = game.state;
    for (let guard = 0; guard < 500; guard++) {
        const pick = CAMP_UPGRADES.map(u => ({ u, cost: (S.camp[u.id] || 0) < u.max ? campPrice(S, u) : Infinity })).sort((a, b) => a.cost - b.cost)[0];
        if (!pick || pick.cost === Infinity || S.gold - pick.cost < 200 || !game.buyCampUpgrade(pick.u.id, 1)) break;
    }
}

const tiersAt = (trial, stage) => Array.from({ length: TRIAL_TIERS }, (_, i) => trialTarget(trial, i + 1)).filter(t => stage >= t).length;
console.log(`# Trials: the stage a run reaches under each rule (stops after ${STALL_MS / 60000} min without a new best, or ${HOURS} h)\n`);
console.log(`| Hero (best) | Plain | ${SHOWN.map(t => `${t.name} ${JSON.stringify(t.bite).replace(/"/g, '')} (${t.first})`).join(' | ')} |`);
console.log(`|---|---|${SHOWN.map(() => '---').join('|')}|`);
for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const best = JSON.parse(text).combat?.bestStage;
    const plain = run(text, null);
    const cells = SHOWN.map(t => {
        const r = run(text, t.id);
        if (!r) return 'n/a';
        return `${r.reached} (${tiersAt(t, r.reached)}) −${plain.reached - r.reached}`;
    });
    console.log(`| ${file.split('/').pop()} (${best}) | ${plain ? plain.reached : 'n/a'} | ${cells.join(' | ')} |`);
}
console.log('\nEach cell: the stage reached, (tiers that clears), and the stages the rule cost against the plain run.');
