#!/usr/bin/env node
// How far a fresh run gets bare, with food, with a combat potion and with both, and why the hero falls
// (DESIGN §3.28). From each saved hero (tools/simulate.mjs --save-at, or a player's save): a prestige, then the
// fight until it goes --stall minutes without a new best (or --hours), buying the camp as the gold comes in.
// Food is the best dish the hero's Cooking makes (--food=<id> for another), --count of it; the potion the best
// combat potion his Alchemy brews. Each fall is told by the blow that did it: from above the eat line, a
// one-shot (more than his whole health), or below the line with food left or without.
//
//   node tools/supplies.mjs runs/hero-150.json runs/hero-250.json [--seeds=3] [--hours=3] [--stall=30] [--count=500]
//   CONDS=bare,both SET="BALANCE.enemy.supply.mult:2;POTION_KINDS.combat.power.2:3" node tools/supplies.mjs ...
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE } from '../src/core/formulas.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';
import { foodsByHealing, RESOURCES } from '../src/data/resources.js';
import { potionsFor, potionLevel, POTION_KINDS } from '../src/data/potions.js';
import { skillLevel, BASE } from '../src/core/modifiers.js';
import { SKILLS } from '../src/data/skills.js';

// SET="BALANCE.enemy.supply.mult:1.6;POTION_KINDS.combat.power.0:0.8": constants changed before the runs (as simulate.mjs --set)
for (const kv of String(process.env.SET || '').split(';').filter(Boolean)) {
    const [path, raw] = kv.split(':');
    const keys = path.split('.');
    let o = { BALANCE, BASE, POTION_KINDS }[keys[0]];
    for (const k of keys.slice(1, -1)) o = o?.[k];
    if (!o || typeof o[keys.at(-1)] !== 'number') { console.error(`SET: unknown ${path}`); process.exit(2); }
    o[keys.at(-1)] = Number(raw);
}
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const HOURS = Number(args.hours || 3);
const STALL_MS = Number(args.stall || 30) * 60000;
const SEEDS = Number(args.seeds || 3);
const STEP = 500;
const FOOD = args.food || null;      // a food id to stock; default: the best the hero's Cooking makes
const FOOD_COUNT = Number(args.count || 2000);

function buyCamp(game) {
    const S = game.state;
    for (let guard = 0; guard < 500; guard++) {
        const pick = CAMP_UPGRADES.map(u => ({ u, cost: (S.camp[u.id] || 0) < u.max ? campPrice(S, u) : Infinity })).sort((a, b) => a.cost - b.cost)[0];
        if (!pick || pick.cost === Infinity || S.gold - pick.cost < 200 || !game.buyCampUpgrade(pick.u.id, 1)) break;
    }
}

const foodTotal = S => foodsByHealing().reduce((n, f) => n + (S.resources[f.id] || 0), 0);

function run(text, cond, seed) {
    rng.setSource(seededRandom(seed));
    const raw = JSON.parse(text);
    let now = Number(raw.meta?.lastActiveAt) || 0;
    const game = new Game(raw, now);
    const S = game.state;
    S.settings.autoPrestige = false;
    if (S.combat.mode !== 'stages') returnToStages(game);
    S.combat.farmMode = false;
    S.prestige.runStartedAt = Math.min(S.prestige.runStartedAt, now - BALANCE.prestige.minRunMs);
    // the condition's stock: food (the best dish the hero's Cooking reaches) and the best combat potion his Alchemy brews
    for (const f of foodsByHealing()) S.resources[f.id] = 0;
    for (const id of potionsFor('combat')) S.resources[id] = 0;
    const cook = skillLevel(S, 'cooking');
    const dish = FOOD || SKILLS.cooking.nodes.filter(n => n.levelReq <= cook).map(n => RESOURCES[n.produces]).sort((a, b) => a.heal - b.heal).pop()?.id || 'cooked_shrimp';
    const potion = [...potionsFor('combat')].reverse().find(id => skillLevel(S, 'alchemy') >= potionLevel(id)) || potionsFor('combat')[0];
    if (cond.food) { S.resources[dish] = FOOD_COUNT; game.setAutoEat('auto'); } else game.setAutoEat('none');
    if (cond.potion) { S.resources[potion] = 500; game.setPotion(potion); } else game.setPotion('none');
    S.combat.potionMs = 0;
    if (!game.prestige()) return null;
    game.enterCombat();

    const out = { reached: S.combat.maxStage, at: 0, deaths: 0, bossTimeouts: 0, eaten: 0, potions: 0,
        kinds: { aboveLine: 0, oneShot: 0, belowLineNoFood: 0, belowLineFood: 0 }, deathStages: {}, timeoutStages: {}, lethal: [] };
    const food0 = foodTotal(S);
    const pot0 = S.resources[potion] || 0;
    const emit = game.emit.bind(game);
    game.emit = ev => {
        if (ev.type === 'enemyHit' && S.combat.hp <= 0 && S.combat.mode === 'stages') {
            const d = game.derived;
            const before = S.combat.hp + ev.dmg;
            const f = foodTotal(S);
            const kind = ev.dmg >= d.maxHp ? 'oneShot' : before >= d.maxHp * d.autoEatThreshold ? 'aboveLine' : f > 0 && S.combat.autoEat !== 'none' ? 'belowLineFood' : 'belowLineNoFood';
            out.kinds[kind]++;
            out.lethal.push({ stage: S.combat.stage, boss: !!S.combat.enemy?.boss, before: before / d.maxHp, hit: ev.dmg / d.maxHp, kind });
        }
        if (ev.type === 'death' && ev.mode === 'stages') { out.deaths++; out.deathStages[ev.stage] = (out.deathStages[ev.stage] || 0) + 1; }
        if (ev.type === 'bossTimeout') { out.bossTimeouts++; out.timeoutStages[ev.stage] = (out.timeoutStages[ev.stage] || 0) + 1; }
        return emit(ev);
    };
    const start = now;
    let best = S.combat.maxStage;
    let riseAt = now;
    while (now - start < HOURS * 3600000 && now - riseAt < STALL_MS) {
        now += STEP;
        game.tick(now);
        game.drainEvents();
        if (!S.combat.active && !S.combat.recovering) game.enterCombat();
        if (S.combat.maxStage > best) { best = S.combat.maxStage; riseAt = now; }
        if (cond.food && out.foodGoneAt === undefined && foodTotal(S) === 0) out.foodGoneAt = (now - start) / 3600000;
        if (now % 60000 < STEP) buyCamp(game);
    }
    out.reached = best;
    out.at = (riseAt - start) / 3600000;
    out.eaten = food0 - foodTotal(S);
    out.potions = pot0 - (S.resources[potion] || 0);
    out.dish = dish; out.potion = potion;
    out.hero = { maxHp: game.derived.maxHp, atk: game.derived.atk, def: game.derived.def, line: game.derived.autoEatThreshold, lifesteal: game.derived.lifesteal, interval: game.derived.attackInterval };
    return out;
}

const CONDS = (process.env.CONDS ? process.env.CONDS.split(',') : null);
const ALL = [
    { name: 'bare', food: false, potion: false },
    { name: 'food', food: true, potion: false },
    { name: 'potion', food: false, potion: true },
    { name: 'both', food: true, potion: true }
];
const SHOWN = CONDS ? ALL.filter(c => CONDS.includes(c.name)) : ALL;
const r2 = x => Math.round(x * 100) / 100;
for (const file of files) {
    const text = readFileSync(file, 'utf8');
    console.log(`\n## ${file}`);
    for (const cond of SHOWN) {
        const runs = [];
        for (let s = 1; s <= SEEDS; s++) runs.push(run(text, cond, 1000 + s));
        const med = key => runs.map(r => r[key]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
        const sum = key => runs.reduce((n, r) => n + r[key], 0);
        const kinds = {};
        for (const r of runs) for (const [k, v] of Object.entries(r.kinds)) kinds[k] = (kinds[k] || 0) + v;
        const lethal = runs.flatMap(r => r.lethal);
        const bossL = lethal.filter(l => l.boss);
        const regL = lethal.filter(l => !l.boss);
        const avg = (arr, k) => arr.length ? r2(arr.reduce((n, l) => n + l[k], 0) / arr.length) : '-';
        console.log(`${cond.name.padEnd(7)} reached ${runs.map(r => r.reached).join('/')} (median ${med('reached')}, by ${r2(med('at'))} h) · deaths ${sum('deaths')} (boss ${bossL.length}, regular ${regL.length}) · boss timeouts ${sum('bossTimeouts')} · eaten ${sum('eaten')} ${runs[0].dish} · potions ${sum('potions')} ${runs[0].potion}`);
        console.log(`        lethal hits: ${JSON.stringify(kinds)} · boss: hit ${avg(bossL, 'hit')} of max from ${avg(bossL, 'before')} · regular: hit ${avg(regL, 'hit')} from ${avg(regL, 'before')} · hero ${JSON.stringify(runs[0].hero)}`);
        const ts = {}; for (const r of runs) for (const [k, v] of Object.entries(r.timeoutStages)) ts[k] = (ts[k] || 0) + v;
        const ds = {}; for (const r of runs) for (const [k, v] of Object.entries(r.deathStages)) ds[k] = (ds[k] || 0) + v;
        const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}×${v}`).join(' ');
        console.log(`        deaths at ${top(ds) || '-'} · timeouts at ${top(ts) || '-'}${cond.food ? ` · food gone at ${runs.map(r => r.foodGoneAt === undefined ? 'never' : r2(r.foodGoneAt) + ' h').join('/')}` : ''}`);
    }
}
