#!/usr/bin/env node
// The power ledger (docs/research_notes/endless-late-game.md): what each source gives a saved hero, as multipliers on
// his attack, defence and health, as stages at the two walls (the boss's 30 s, which takes attack, and the one blow he
// must live through, which takes defence and health together) and as a share of all the sources' stages. The arithmetic
// is src/systems/powerledger.js, which the hero's panel in the game shows too. By default the hero as a fresh run finds
// him at his wall: a prestige, the skill points spent (Knight and Warlord to 25, Rogue to 15, then Paragon), the camp as
// a run near its best buys it (25 levels, and past them what a hundred kills' gold there buys), Combat Potion III running.
//
//   node tools/ledger.mjs runs/hero-300.json [--json]
//   node tools/ledger.mjs runs/hero-300.json --now [--json]   # the hero as he was saved: what the game's panel shows him
//   node tools/ledger.mjs --flow runs/heroes    # heroes saved by simulate.mjs --save-at as <name>-<mark>.json:
//                                               # how much each source grew between two marks of the same hero
import { readFileSync, readdirSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE, goldPerKillAtStage } from '../src/core/formulas.js';
import { CAMP_GOLD } from '../src/data/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';
import { PERKS } from '../src/data/perks.js';
import { migrateState } from '../src/core/state.js';
import { zoneForStage } from '../src/data/zones.js';
import { powerLedger } from '../src/systems/powerledger.js';

/** The ledger of one saved hero: powerLedger's, with { file, depth, hours }; `now` leaves him as he was saved. */
function ledger(file, { now: asSaved = false } = {}) {
    const raw0 = JSON.parse(readFileSync(file, 'utf8'));
    rng.setSource(seededRandom(7));
    const raw = JSON.parse(JSON.stringify(migrateState(raw0, raw0.meta?.lastActiveAt || Date.now())));
    const now = raw.meta.lastActiveAt;
    const g = new Game(raw, now);
    const S = g.state;
    if (!asSaved) {
        S.settings.autoPrestige = false;
        if (S.combat.mode !== 'stages') returnToStages(g);
        S.prestige.runStartedAt = now - BALANCE.prestige.minRunMs;
        S.resources.combat_potion_3 = 500;
        g.setPotion('combat_potion_3');
        const best = S.combat.bestStage;
        g.prestige();
        const FIRST = { knight: 25, warlord: 25, rogue: 15, forager: 0, scholar: 0, endurance: 0, gourmet: 0, fortune: 0 };
        for (let guard = 0; guard < 2000 && S.prestige.skillPoints > 0; guard++) {
            const p = PERKS.find(p => p.id in FIRST && S.perks[p.id] < FIRST[p.id]) || PERKS.find(p => p.id === 'paragon');
            if (!g.buyPerk(p.id)) break;
        }
        const past = Math.max(0, Math.floor(Math.log(Math.max(1, 100 * goldPerKillAtStage(best) / CAMP_GOLD.base)) / Math.log(CAMP_GOLD.growth)));
        S.camp = { whetstone: CAMP_GOLD.from + past, armory: CAMP_GOLD.from + past, hearth: CAMP_GOLD.from + past };
        S.combat.potionMs = 60000;   // a dose running
        g.recompute();
    }
    const L = powerLedger(S);
    return { file, depth: zoneForStage(L.best).depth, hours: (raw0.meta?.playtimeMs || 0) / 3600000, ...L };
}

const args = process.argv.slice(2);
if (args[0] === '--flow') {
    const dir = args[1] || 'runs';
    const byHero = {};
    for (const f of readdirSync(dir)) { const m = f.match(/^(.+)-(\d+)\.json$/); if (m) (byHero[m[1]] ||= []).push({ mark: Number(m[2]), file: `${dir}/${f}` }); }
    const sums = {};
    for (const list of Object.values(byHero)) {
        list.sort((a, b) => a.mark - b.mark);
        const ls = list.map(x => ledger(x.file));
        for (let i = 1; i < ls.length; i++) {
            const a = ls[i - 1], b = ls[i];
            const s = (sums[`${list[i - 1].mark}-${list[i].mark}`] ||= { n: 0, hours: 0, parts: {} });
            s.n++;
            s.hours += b.hours - a.hours;
            for (const pb of b.parts) {
                const pa = a.parts.find(p => p.id === pb.id);
                if (!pa) continue;   // (a weapon worn at the later mark only)
                const p = (s.parts[pb.label] ||= { boss: 0, blow: 0 });
                p.boss += Math.log(pb.atk / pa.atk) / Math.log(b.gHp);   // measured at the deeper mark's growth
                p.blow += Math.log((pb.def * pb.hp) / (pa.def * pa.hp)) / (2 * Math.log(b.gAtk));
            }
        }
    }
    for (const [band, s] of Object.entries(sums).sort((x, y) => parseInt(x[0]) - parseInt(y[0]))) {
        console.log(`${band}: ${s.n} heroes, ${(s.hours / s.n).toFixed(0)} h. Stages each source added (boss / blow):`);
        for (const [name, p] of Object.entries(s.parts)) console.log(`  ${name.padEnd(28)} ${(p.boss / s.n).toFixed(1).padStart(6)} / ${(p.blow / s.n).toFixed(1)}`);
    }
} else {
    const L = ledger(args[0], { now: args.includes('--now') });
    if (args.includes('--json')) console.log(JSON.stringify(L));
    else {
        console.log(`${L.file.split('/').pop()}: best ${L.best} (depth ${L.depth}); monsters x${L.gHp} health and x${L.gAtk} attack a stage, so x2 attack = ${(Math.log(2) / Math.log(L.gHp)).toFixed(1)} stages at the boss, x2 defence and health = ${(Math.log(4) / (2 * Math.log(L.gAtk))).toFixed(1)} at the blow`);
        console.log(`  attack ${L.total.atk.toExponential(2)}, defence ${L.total.def.toExponential(2)}, health ${L.total.hp.toExponential(2)}, Stars ${L.stars}`);
        console.log('  source                          x attack  x defence   x health | stages: boss   blow | share | note');
        for (const p of L.parts) console.log(`  ${p.label.padEnd(28)} ${p.atk.toExponential(1).padStart(10)} ${p.def.toExponential(1).padStart(10)} ${p.hp.toExponential(1).padStart(10)} | ${p.boss.toFixed(1).padStart(12)} ${p.blow.toFixed(1).padStart(6)} | ${`${(p.share * 100).toFixed(1)}%`.padStart(5)} | ${p.note}`);
    }
}
