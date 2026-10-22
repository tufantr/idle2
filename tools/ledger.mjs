#!/usr/bin/env node
// The power ledger (docs/research_notes/endless-late-game.md): what each source gives a saved hero, as multipliers on
// his attack, defence and health and as stages at the two walls: the boss's 30 s, which takes attack, and the
// one blow he must live through, which takes defence and health together. The hero as a fresh run finds him at
// his wall: a prestige, the skill points spent (Knight and Warlord to 25, Rogue to 15, then Paragon), the camp
// as a run near its best buys it (25 levels, and past them what a hundred kills' gold there buys), Combat Potion
// III running.
//
//   node tools/ledger.mjs runs/hero-300.json [--json]
//   node tools/ledger.mjs --flow runs/heroes    # heroes saved by simulate.mjs --save-at as <name>-<mark>.json:
//                                               # how much each source grew between two marks of the same hero
import { readFileSync, readdirSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE, enemyBaseStats, goldPerKillAtStage } from '../src/core/formulas.js';
import { CAMP_GOLD } from '../src/data/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';
import { PERKS } from '../src/data/perks.js';
import { migrateState } from '../src/core/state.js';
import { collectModifiers, deriveStats, BASE, recordsOf } from '../src/core/modifiers.js';
import { zoneForStage } from '../src/data/zones.js';
import { EQUIP_SLOTS } from '../src/data/items.js';

/** The ledger of one saved hero: { best, gHp, gAtk, total, parts: [{ name, atk, def, hp, boss, blow, note }] }. */
function ledger(file) {
    const raw0 = JSON.parse(readFileSync(file, 'utf8'));
    rng.setSource(seededRandom(7));
    const raw = JSON.parse(JSON.stringify(migrateState(raw0, raw0.meta?.lastActiveAt || Date.now())));
    const now = raw.meta.lastActiveAt;
    const g = new Game(raw, now);
    const S = g.state;
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

    const d = deriveStats(S);
    /** The hero's attack, defence and health now, over what they would be with `mut` done to a copy. */
    const share = mut => {
        const T = JSON.parse(JSON.stringify(S));
        mut(T);
        const e = deriveStats(T);
        return { atk: d.atk / Math.max(1e-9, e.atk), def: d.def / Math.max(1e-9, e.def), hp: d.maxHp / Math.max(1e-9, e.maxHp) };
    };
    // the monsters' growth a stage where he stands (the deep Abyss eases past BALANCE.enemy.deepFrom)
    const gHp = enemyBaseStats(best + 1).hp / enemyBaseStats(best).hp;
    const gAtk = enemyBaseStats(best + 1).atk / enemyBaseStats(best).atk;
    const mods = collectModifiers(S);
    const rec = recordsOf(S);
    const tokens = S.prestige.tokens || 0;
    const parts = [];
    const add = (name, r, note = '') => parts.push({ name, ...r, boss: Math.log(r.atk) / Math.log(gHp), blow: Math.log(r.def * r.hp) / (2 * Math.log(gAtk)), note });
    const hpBase = BASE.baseHp + BASE.hpPerCombatLevel * (d.combatLevel - 1);
    // gear against none at all: defence is then nothing, so it is counted from one point
    add('gear (all 12 pieces)', { atk: (BASE.unarmedAtk + mods.gearAtk) / BASE.unarmedAtk, def: Math.max(1, mods.gearDef), hp: (hpBase + BASE.hpPerDef * mods.gearDef) / hpBase }, `attack ${Math.round(mods.gearAtk)}, defence ${Math.round(mods.gearDef)} (defence counted from 1 point)`);
    const w = S.equipped.Weapon;
    if (w) add('  of which the weapon', share(T => { T.equipped.Weapon = null; }), `${w.name} ${w.rarity} T${w.tier}${w.depth ? ` d${w.depth}` : ''} +${S.forge?.Weapon?.level || 0}`);
    add('  of which the armour (6)', share(T => { for (const s of ['Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves']) T.equipped[s] = null; }));
    add('  of which the jewellery (5)', share(T => { for (const s of ['Ring1', 'Ring2', 'Neck', 'Ear1', 'Ear2']) T.equipped[s] = null; }));
    add('  of which upgrade levels', share(T => { for (const s of EQUIP_SLOTS) if (T.equipped[s]) T.equipped[s].upgrade = 0; for (const f of [...Object.values(T.forge || {}), ...Object.values(T.bench || {})]) f.level = 0; }), `the forge: ${Object.entries(S.forge || {}).map(([s, f]) => `${s} +${f.level}`).join(', ')}; the bench: ${Object.entries(S.bench || {}).map(([s, f]) => `${s} +${f.level}`).join(', ')}`);
    add('tokens (with records)', share(T => { T.prestige.tokens = 0; }), `${Math.round(tokens)} tokens x records ${rec.mult.toFixed(2)}`);
    const layer = (k, m) => (1 + BASE[k] * tokens * m);
    add('  of which records', { atk: layer('tokenAtk', rec.mult) / layer('tokenAtk', 1), def: layer('tokenDef', rec.mult) / layer('tokenDef', 1), hp: layer('tokenHp', rec.mult) / layer('tokenHp', 1) }, `${rec.count} records: ${rec.stages} stage, ${rec.skills} skill, ${rec.uniques} unique, ${rec.seals} seal, ${rec.trials} trial, ${rec.laurels} laurel`);
    add('camp', share(T => { T.camp = {}; }), `${S.camp.whetstone} levels each`);
    add('Legacy', share(T => { T.prestige.count = 0; }), `${S.prestige.count} prestiges`);
    add('potion (Combat III)', share(T => { T.combat.potion = 'none'; T.combat.potionMs = 0; }));
    add('combat level', share(T => { T.skills.combat.xp = 0; }), `level ${d.combatLevel}`);
    add('perks', share(T => { T.perks = {}; }), Object.entries(S.perks).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', '));
    add('medals', share(T => { T.achievements = {}; }), `${Object.keys(S.achievements).filter(k => S.achievements[k]).length} medals`);
    add('pets', share(T => { T.pets = {}; }));
    add('titans', share(T => { T.titan.kills = 0; }), `${S.titan.kills} titans`);
    add('dungeon milestones', share(T => { for (const k of Object.keys(T.dungeons)) T.dungeons[k].clears = 0; }), `the open tier's; a sealed tier's are with the Seals`);
    add('dungeon Seals', share(T => { T.dungeonTier = 1; }), `tier ${S.dungeonTier || 1}: their records and the sealed tiers' milestones`);
    add('agility', share(T => { T.agility.built = []; }));
    return { file, best, depth: zoneForStage(best).depth, gHp, gAtk, total: { atk: d.atk, def: d.def, hp: d.maxHp }, tokens, records: rec, stars: S.ascension?.stars || 0, hours: (raw0.meta?.playtimeMs || 0) / 3600000, parts };
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
                const pa = a.parts.find(p => p.name === pb.name);
                const p = (s.parts[pb.name] ||= { boss: 0, blow: 0 });
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
    const L = ledger(args[0]);
    if (args.includes('--json')) console.log(JSON.stringify(L));
    else {
        console.log(`${L.file.split('/').pop()}: best ${L.best} (depth ${L.depth}); monsters x${L.gHp} health and x${L.gAtk} attack a stage, so x2 attack = ${(Math.log(2) / Math.log(L.gHp)).toFixed(1)} stages at the boss, x2 defence and health = ${(Math.log(4) / (2 * Math.log(L.gAtk))).toFixed(1)} at the blow`);
        console.log(`  attack ${L.total.atk.toExponential(2)}, defence ${L.total.def.toExponential(2)}, health ${L.total.hp.toExponential(2)}, Stars ${L.stars}`);
        console.log('  source                          x attack  x defence   x health | stages: boss   blow | note');
        for (const p of L.parts) console.log(`  ${p.name.padEnd(28)} ${p.atk.toExponential(1).padStart(10)} ${p.def.toExponential(1).padStart(10)} ${p.hp.toExponential(1).padStart(10)} | ${p.boss.toFixed(1).padStart(12)} ${p.blow.toFixed(1).padStart(6)} | ${p.note}`);
    }
}
