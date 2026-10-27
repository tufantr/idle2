#!/usr/bin/env node
// What the War Tree's builds are worth (src/data/talents.js; DESIGN §3.33), for heroes the simulator saved:
//
//   node tools/simulate.mjs --hours=300 --seed=1 --save-at=1000,1250 --save=runs/deep-1
//   node tools/talents.mjs runs/deep-1-1000.json runs/deep-1-1250.json [--hours=3] [--stall=30] [--builds=hunt31,blade31]
//
// From each save: one fresh run with no talents and one per build, each begun by a prestige and fought until it goes
// `--stall` minutes without a new best (or `--hours` in all), buying the camp as the gold comes in (as tools/trials.mjs
// does). The table gives the stage each run reached, the stages a build added, and the hours to its best.

import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { xpForCombatLevel } from '../src/core/xp.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!files.length) { console.error('node tools/talents.mjs <save.json>... [--hours=3] [--stall=30] [--builds=hunt31,blade31]'); process.exit(2); }
const HOURS = Number(args.hours || 3);
const STALL_MS = Number(args.stall || 30) * 60000;
const STEP = 500;

// Builds: talents learned in this order, a rank at a time, each to its rank here (data/talents.js). Each 31-point build
// takes its tree to the capstone by the shortest road the rows and arrows allow.
const r = (id, n) => Array(n).fill(id);
export const BUILDS = {
    blade31: [...r('sharpened_edge', 5), ...r('keen_eye', 5), ...r('opening_blow', 3), ...r('precision', 5), ...r('execute', 3), ...r('weak_spot', 3), 'giant_slayer', ...r('savage_blows', 5), 'deathblow'],
    bulwark31: [...r('thick_skin', 5), ...r('iron_hide', 5), ...r('brace', 3), ...r('light_feet', 5), 'second_wind', ...r('lifeblood', 2), ...r('hamstring', 3), 'stalwart', ...r('fortress', 5), 'unbreakable'],
    hunt31: [...r('patient_hunter', 5), ...r('scavenger', 5), ...r('treasure_sense', 5), ...r('essence_drinker', 3), ...r('second_chance', 2), ...r('long_draught', 3), ...r('lords_due', 2), ...r('bounty', 5), 'relentless'],
    // the first seven points of a hero at the old cap (level 106), and a 51-point Blade-and-Hunt build (level 150)
    first7: [...r('patient_hunter', 5), ...r('sharpened_edge', 2)],
    mix51: [...r('patient_hunter', 5), ...r('scavenger', 5), ...r('treasure_sense', 5), ...r('second_chance', 2),
        ...r('sharpened_edge', 5), ...r('keen_eye', 5), ...r('opening_blow', 3), ...r('precision', 5), ...r('execute', 3), ...r('weak_spot', 3), 'giant_slayer', ...r('savage_blows', 5), 'deathblow', ...r('essence_drinker', 3), ...r('long_draught', 3)]
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
