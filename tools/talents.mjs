#!/usr/bin/env node
// What the War Tree's builds are worth (src/data/talents.js; DESIGN §3.33), for heroes the simulator saved:
//
//   node tools/simulate.mjs --hours=300 --seed=1 --save-at=1000,1250 --save=runs/deep-1
//   node tools/talents.mjs runs/deep-1-1000.json runs/deep-1-1250.json [--hours=3] [--stall=30] [--builds=hunt31,blade31]
//
// From each save: one fresh run with no talents and one per build, each begun by a prestige and fought until it goes
// `--stall` minutes without a new best (or `--hours` in all), buying the camp as the gold comes in (as tools/trials.mjs
// does). The table gives the stage each run reached, the stages a build added, and the hours to its best.
//
//   node tools/talents.mjs --clock heroes/*.json [--fights=16] [--talents=berserker,deathblow] [--berserker=0,0.25,0.5]
//
// --clock is the boss bench of research-loop 015: each talent alone, at its full rank, on each hero, against the boss of
// his wall, made unkillable and fought for its whole clock `--fights` times. A talent's worth is the damage it adds in
// that clock, as stages: ln(damage with it ÷ without) over ln(the boss's health growth a stage), so a hero's boss gates
// don't quantize it (a fresh run moves a gate at a time). Execute counts as 1 ÷ (1 − its share), as it ends the fight
// early; Relentless at its +10 s. --berserker repeats Berserker at those shares of the clock (BALANCE.combat.berserkerClock).

import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { xpForCombatLevel } from '../src/core/xp.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';
import { TALENTS, talentById, RELENTLESS } from '../src/data/talents.js';
import { spawnEnemy, tickCombat } from '../src/systems/combat.js';
import { wallJudge, wallStage, wallCampLevels } from '../src/systems/worth.js';

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!files.length) { console.error('node tools/talents.mjs <save.json>... [--hours=3] [--stall=30] [--builds=hunt31,blade31]\n       node tools/talents.mjs --clock <save.json>... [--fights=16] [--talents=a,b] [--berserker=0,0.25,0.5]'); process.exit(2); }
const HOURS = Number(args.hours || 3);
const STALL_MS = Number(args.stall || 30) * 60000;
const STEP = 500;

// Builds: talents learned in this order, a rank at a time, each to its rank here (data/talents.js). Each 31-point build
// takes its tree to the capstone by the shortest road the rows and bridges allow.
const r = (id, n) => Array(n).fill(id);
export const BUILDS = {
    blade31: [...r('sharpened_edge', 5), ...r('keen_eye', 5), ...r('opening_blow', 3), ...r('execute', 3), 'cleave', ...r('weak_spot', 3), ...r('giant_slayer', 5), ...r('savage_blows', 5), 'deathblow'],
    bulwark31: [...r('thick_skin', 5), ...r('iron_hide', 5), ...r('brace', 3), 'second_wind', ...r('lifeblood', 2), ...r('hamstring', 3), 'light_feet', ...r('stalwart', 5), ...r('fortress', 5), 'unbreakable'],
    hunt31: [...r('patient_hunter', 5), ...r('scavenger', 5), ...r('treasure_sense', 5), ...r('essence_drinker', 2), ...r('second_chance', 2), ...r('long_draught', 3), ...r('veterans_focus', 3), ...r('bounty', 5), 'relentless'],
    // the first seven points of a hero at the old cap (level 106), and a 51-point Blade-and-Hunt build (level 150)
    first7: [...r('patient_hunter', 5), ...r('sharpened_edge', 2)],
    mix51: [...r('patient_hunter', 5), ...r('scavenger', 5), ...r('treasure_sense', 5), ...r('second_chance', 2),
        ...r('sharpened_edge', 5), ...r('keen_eye', 5), ...r('opening_blow', 3), ...r('execute', 3), 'cleave', ...r('weak_spot', 3), ...r('giant_slayer', 5), ...r('savage_blows', 5), 'deathblow', ...r('essence_drinker', 3)]
};
const SHOWN = String(args.builds || 'first7,blade31,hunt31,bulwark31,mix51').split(',').filter(b => BUILDS[b]);

/** One run from the save, with `build` learned (null: none): a prestige, then the fight until it stalls. */
function run(text, build) {
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
    S.talents.ranks = {};
    if (build) {
        S.skills.combat.xp = Math.max(S.skills.combat.xp, xpForCombatLevel(99 + build.length));
        game.recompute();
        for (const id of build) if (!game.learnTalent(id)) throw new Error(`can't learn ${id}`);
    }
    if (!game.prestige()) return null;
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
    return { reached: best, hours: (riseAt - start) / 3600000, escapes: S.stats.bossEscapes || 0 };
}

/** The camp, cheapest level first, keeping a little gold back (as tools/simulate.mjs's bot). */
function buyCamp(game) {
    const S = game.state;
    for (let guard = 0; guard < 500; guard++) {
        const pick = CAMP_UPGRADES.map(u => ({ u, cost: (S.camp[u.id] || 0) < u.max ? campPrice(S, u) : Infinity })).sort((a, b) => a.cost - b.cost)[0];
        if (!pick || pick.cost === Infinity || S.gold - pick.cost < 200 || !game.buyCampUpgrade(pick.u.id, 1)) break;
    }
}

// ---------- --clock: what a talent adds in a boss's clock ----------

const CLOCK_TALENTS = String(args.talents || TALENTS.filter(t => t.tree === 'blade').map(t => t.id).concat('patient_hunter', 'relentless').join(',')).split(',').filter(id => talentById(id));
const FIGHTS = Math.max(1, Number(args.fights || 16));

/** The hero of a save, as he stands at his wall (systems/worth.js): the camp of his best, his potion running, settled into Focus. */
function atWall(text, ranks) {
    const raw = JSON.parse(text);
    const now = Number(raw.meta?.lastActiveAt) || 0;
    const game = new Game(raw, now);
    const S = game.state;
    if (S.combat.mode !== 'stages') returnToStages(game);
    S.camp = { ...S.camp, ...wallCampLevels(S) };
    S.talents.ranks = { ...ranks };
    S.meta.lastInputAt = -Infinity;
    const c = S.combat;
    if (c.potion && c.potion !== 'none' && (S.resources[c.potion] || 0) > 0) c.potionMs = Math.max(c.potionMs || 0, 60000);
    Object.assign(c, { farmMode: false, regroupLeft: 0, relentless: null, active: true, recovering: false, stage: wallStage(c.bestStage), combo: 0 });
    c.maxStage = Math.max(c.maxStage, c.stage);
    game.recompute();
    return game;
}

/** The damage dealt to the wall's boss, unkillable, over its whole clock, in one fight. */
function clockFight(text, ranks, seed, relentlessMs = 0) {
    rng.setSource(seededRandom(seed));
    const game = atWall(text, ranks);
    const c = game.state.combat;
    if (relentlessMs) c.relentless = { stage: c.stage, ms: relentlessMs };
    c.hp = game.derived.maxHp;
    spawnEnemy(game);
    const boss = c.enemy;
    boss.hp = boss.maxHp = 1e300;
    let now = game.now;
    let dealt = 0;
    for (let guard = 0; c.enemy === boss && c.active && guard < 10000; guard++) {
        now += 100;
        game.now = now;
        tickCombat(game, 100);
        for (const ev of game.drainEvents()) if (ev.type === 'hit') dealt += ev.dmg;
    }
    return dealt;
}

/** What each talent is worth on one hero, in stages at his wall's boss's clock: { [label]: stages }. */
function clockWorth(text, labelled) {
    const mean = (ranks, relentlessMs) => { let all = 0; for (let i = 0; i < FIGHTS; i++) all += clockFight(text, ranks, 1000 + i, relentlessMs); return all / FIGHTS; };
    const base = mean({});
    const growth = wallJudge(atWall(text, {}).state).wall.gHp;
    const out = {};
    for (const { label, id, share } of labelled) {
        const t = talentById(id);
        const ranks = { [id]: t.max };
        let worth;
        if (id === 'execute') worth = Math.log(1 / (1 - t.fx.execute[t.max - 1])) / Math.log(growth);
        else {
            const was = BALANCE.combat.berserkerClock;
            if (share !== undefined) BALANCE.combat.berserkerClock = share;
            worth = Math.log(mean(ranks, id === 'relentless' ? RELENTLESS.maxMs : 0) / base) / Math.log(growth);
            BALANCE.combat.berserkerClock = was;
        }
        out[label] = worth;
    }
    return out;
}

if (args.clock) {
    const shares = args.berserker === undefined ? [] : String(args.berserker).split(',').map(Number);
    const labelled = [...CLOCK_TALENTS.filter(id => id !== 'berserker' || !shares.length).map(id => ({ label: id, id })),
        ...shares.map(share => ({ label: `berserker@${share}`, id: 'berserker', share }))];
    const rows = [];
    for (const file of files) {
        const text = readFileSync(file, 'utf8');
        rows.push(clockWorth(text, labelled));
        if (args.verbose) console.log(file.split('/').pop(), JSON.stringify(JSON.parse(text).combat?.bestStage), Object.entries(rows.at(-1)).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('  '));
    }
    const stats = xs => { const a = [...xs].sort((p, q) => p - q); return { mean: a.reduce((s, x) => s + x, 0) / a.length, lo: a[0], hi: a.at(-1) }; };
    console.log(`# War Tree: stages' worth of each talent alone, at its full rank, in the boss's clock at each hero's wall (${files.length} heroes, ${FIGHTS} fights each)\n`);
    console.log('| Talent | Points | Stages (mean) | Lowest | Highest | A point |');
    console.log('|---|---|---|---|---|---|');
    for (const { label, id } of labelled) {
        const st = stats(rows.map(r => r[label]));
        const t = talentById(id);
        console.log(`| ${label} | ${t.max} | ${st.mean.toFixed(2)} | ${st.lo.toFixed(2)} | ${st.hi.toFixed(2)} | ${(st.mean / t.max).toFixed(2)} |`);
    }
    process.exit(0);
}

console.log(`# War Tree: the stage a fresh run reaches with each build (stops after ${STALL_MS / 60000} min without a new best, or ${HOURS} h)\n`);
console.log(`| Hero (best) | None | ${SHOWN.map(b => `${b} (${BUILDS[b].length})`).join(' | ')} |`);
console.log(`|---|---|${SHOWN.map(() => '---').join('|')}|`);
for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const best = JSON.parse(text).combat?.bestStage;
    const none = run(text, null);
    const cells = SHOWN.map(b => {
        const x = run(text, BUILDS[b]);
        return x ? `${x.reached} (+${x.reached - none.reached}) ${x.hours.toFixed(1)} h` : 'n/a';
    });
    console.log(`| ${file.split('/').pop()} (${best}) | ${none.reached} ${none.hours.toFixed(1)} h | ${cells.join(' | ')} |`);
}
console.log('\nEach cell: the stage reached, (stages the build added), and the hours to that best.');
