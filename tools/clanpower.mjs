#!/usr/bin/env node
// The clan boss's balance (src/data/social.js CLAN_POWER, CLAN_BOSS; api/index.js counts the attacks):
//   node tools/clanpower.mjs
// 1. The clan power on 20,000 random clans of 1-20 members, best stages 25 to 5,000 spread every way: the members
//    average exactly 1 (so a clan whose members all fight fells the boss as fast whoever is strong), the deepest counts
//    at most CLAN_POWER.max / .min times the shallowest, and deeper never counts less. Then a few clans by name.
// 2. Levels felled in a week, by clan size and how the attacks are fought, with every attack used: three a day,
//    banked up to six, one kill a day (the next level comes at the next UTC midnight). An attack counts the fight
//    (striking in the openings ×1.33, a combat potion its strength) times the member's power, here 1.
import { CLAN_POWER, clanPowerOf, CLAN_BOSS, CLAN_ATTACKS_PER_DAY, CLAN_ATTACK_BANK } from '../src/data/social.js';
import { POTION_KINDS, TIERS } from '../src/data/potions.js';

const random = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(12345);
let worstMean = 0, worstRatio = 0, monotone = true;
const CLANS = 20000;
for (let trial = 0; trial < CLANS; trial++) {
    const size = 1 + Math.floor(random() * 20);
    const spread = [1.5, 4, 20, 200][trial % 4];
    const low = 25 * Math.pow(200, random());
    const stages = Array.from({ length: size }, () => Math.round(Math.min(5000, low * Math.pow(spread, random()))));
    const power = stages.map(s => clanPowerOf(s, stages));
    worstMean = Math.max(worstMean, Math.abs(power.reduce((a, b) => a + b, 0) / size - 1));
    worstRatio = Math.max(worstRatio, Math.max(...power) / Math.min(...power));
    const order = stages.map((s, i) => [s, power[i]]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < order.length; i++) if (order[i][1] < order[i - 1][1] - 1e-12) monotone = false;
}
console.log(`${CLANS} random clans: members average 1 to within ${worstMean.toExponential(1)}; the deepest counts at most ${worstRatio.toFixed(2)}x the shallowest (limit ${CLAN_POWER.max / CLAN_POWER.min}); deeper never counts less: ${monotone}`);
const show = stages => stages.map(s => `${s}: ${clanPowerOf(s, stages).toFixed(2)}`).join(', ');
for (const stages of [[200, 1000], [1090, 1260], [30, 480], [25, 3000], [76, 90, 90, 104, 200, 422, 482, 977], [500, 500, 500]]) console.log(`  ${show(stages)}`);

const LEVELS = CLAN_BOSS.levels;
function levelsFelled(members, quality) {
    let level = 1, hp = CLAN_BOSS.first, killedOn = -1;
    const charges = Array(members).fill(0);
    for (let day = 0; day < 7; day++) {
        if (killedOn >= 0) { if (level === LEVELS) return LEVELS; level++; hp = CLAN_BOSS.first * Math.pow(CLAN_BOSS.growth, level - 1); killedOn = -1; }
        for (let i = 0; i < members; i++) charges[i] = Math.min(CLAN_ATTACK_BANK, charges[i] + CLAN_ATTACKS_PER_DAY);
        for (let i = 0; hp > 1e-9 && charges.some(c => c > 0); i = (i + 1) % members) if (charges[i] > 0) { charges[i]--; hp -= quality; }
        if (hp <= 1e-9) killedOn = day;
    }
    return killedOn >= 0 ? level : level - 1;
}
const SIZES = [1, 2, 3, 5, 10, 15, 20];
const STRIKING = 1.33;
const fights = [['watching', 1], ['striking', STRIKING], ...[0, 3, 5].map(t => [`striking + potion ${TIERS[t]}`, (1 + POTION_KINDS.combat.power[t]) * STRIKING])];
console.log(`\nLevels felled in a week (level 1 = ${CLAN_BOSS.first} attacks, x${CLAN_BOSS.growth} a level), every attack used:`);
console.log('members'.padEnd(30) + SIZES.map(n => String(n).padStart(4)).join(''));
for (const [name, q] of fights) console.log(`${name} (x${q.toFixed(2)})`.padEnd(30) + SIZES.map(n => String(levelsFelled(n, q)).padStart(4)).join(''));
