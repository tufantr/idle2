#!/usr/bin/env node
// What a piece of gear is worth to a saved hero (DESIGN §3.29): fresh runs with one thing about his gear changed,
// each as far as it gets. From each save (tools/simulate.mjs --save-at, or a player's save) brought up to date as a
// load would (old gear rescaled): a prestige, the skill points spent (Knight and Warlord to 25, Rogue to 15, then
// Paragon), Combat Potion III and 500 Pumpkin Pies, the camp bought as the gold comes in, and the fight until it
// goes 20 minutes without a new best. A variant changes the worn pieces first: "weapon legendary" makes the worn
// weapon legendary (the same tier, depth and roll, its stats times the quality step, a legendary's affixes);
// "frontier weapon legendary" puts on a legendary weapon as it drops where his best stage is (its tier and depth).
//
//   node tools/gearbench.mjs runs/hero-250.json ['as worn' 'weapon rare' 'weapon legendary' ...]
//   SEEDS=1 SET="BALANCE.enemy.stageBoss.hp:6;BASE.tokenAtk:0.003" node tools/gearbench.mjs save.json
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BALANCE, generateEquipment, abyssDropMult } from '../src/core/formulas.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { campPrice } from '../src/systems/camp.js';
import { returnToStages } from '../src/systems/dungeon.js';
import { RARITIES, GEAR_TIERS, EQUIP_SLOTS } from '../src/data/items.js';
import { BASE } from '../src/core/modifiers.js';
import { PERKS } from '../src/data/perks.js';
import { migrateState } from '../src/core/state.js';
import { zoneForStage } from '../src/data/zones.js';

// SET="BALANCE.enemy.stageBoss.hp:6;BASE.tokenAtk:0.003": constants changed before the runs (as simulate.mjs --set)
for (const kv of String(process.env.SET || '').split(';').filter(Boolean)) {
    const [path, raw] = kv.split(':');
    const keys = path.split('.');
    let o = { BALANCE, BASE }[keys[0]];
    for (const k of keys.slice(1, -1)) o = o?.[k];
    if (!o || typeof o[keys.at(-1)] !== 'number') { console.error(`SET: unknown ${path}`); process.exit(2); }
    o[keys.at(-1)] = Number(raw);
}
const [file, ...only] = process.argv.slice(2);
if (!file) { console.error('usage: node tools/gearbench.mjs <save.json> [variant ...]'); process.exit(2); }
const SEEDS = Number(process.env.SEEDS || 2);
const quality = id => RARITIES.find(r => r.id === id)?.quality || 1;

/** The worn piece as another rarity: the same tier, depth and roll, its stats times the quality step, that rarity's affixes. */
function asRarity(item, rarityId, nextId) {
    if (!item) return null;
    const r = RARITIES.find(x => x.id === rarityId);
    const fresh = generateEquipment({ type: item.type, tier: item.tier, power: GEAR_TIERS[item.tier - 1].power, rarity: r, source: 'drop' }, nextId);
    const k = r.quality / quality(item.rarity);
    return { ...fresh, atk: Math.round(item.atk * k), def: Math.round(item.def * k), upgrade: item.upgrade || 0, name: `${r.name} ${item.name}` };
}
/** A piece as it drops at the hero's best stage: the place's gear tier and Abyss depth, of this rarity. */
function frontier(S, type, rarityId, nextId) {
    const zone = zoneForStage(S.combat.bestStage);
    const g = GEAR_TIERS[zone.gearTier - 1];
    const mult = abyssDropMult(zone.depth || 0);
    const item = generateEquipment({ type, tier: g.tier, power: g.power * mult, materialName: g.name, rarity: RARITIES.find(r => r.id === rarityId), source: 'drop' }, nextId);
    if (mult > 1) item.depth = zone.depth;
    return item;
}
const ARMOUR = ['Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves'];
const JEWELS = ['Ring1', 'Ring2', 'Neck', 'Ear1', 'Ear2'];
const each = (slots, rarity, base) => S => { for (const slot of slots) S.equipped[slot] = asRarity(S.equipped[slot], rarity, base + EQUIP_SLOTS.indexOf(slot)); };
const VARIANTS = {
    'as worn': () => {},
    'weapon rare': each(['Weapon'], 'rare', 990000),
    'weapon epic': each(['Weapon'], 'epic', 990010),
    'weapon legendary': each(['Weapon'], 'legendary', 990020),
    'body rare': each(['Body'], 'rare', 990030),
    'body legendary': each(['Body'], 'legendary', 990040),
    'armour rare': each(ARMOUR, 'rare', 990100),
    'armour legendary': each(ARMOUR, 'legendary', 990200),
    'jewels rare': each(JEWELS, 'rare', 990300),
    'jewels legendary': each(JEWELS, 'legendary', 990400),
    'all rare': each(EQUIP_SLOTS, 'rare', 990500),
    'all legendary': each(EQUIP_SLOTS, 'legendary', 990600),
    'frontier weapon rare': S => { S.equipped.Weapon = frontier(S, 'Weapon', 'rare', 990700); },
    'frontier weapon legendary': S => { S.equipped.Weapon = frontier(S, 'Weapon', 'legendary', 990701); },
    'no weapon': S => { S.equipped.Weapon = null; },
    'no armour': S => { for (const slot of ARMOUR) S.equipped[slot] = null; },
    'no gear': S => { for (const slot of EQUIP_SLOTS) S.equipped[slot] = null; }
};

function buyCamp(game) {
    const S = game.state;
    for (let guard = 0; guard < 500; guard++) {
        const pick = CAMP_UPGRADES.map(u => ({ u, cost: (S.camp[u.id] || 0) < u.max ? campPrice(S, u) : Infinity })).sort((a, b) => a.cost - b.cost)[0];
        if (!pick || pick.cost === Infinity || S.gold - pick.cost < 200 || !game.buyCampUpgrade(pick.u.id, 1)) break;
    }
}

const raw0 = JSON.parse(readFileSync(file, 'utf8'));
rng.setSource(seededRandom(7));
const current = JSON.parse(JSON.stringify(migrateState(raw0, raw0.meta?.lastActiveAt || Date.now())));
for (const [name, change] of Object.entries(VARIANTS)) {
    if (only.length && !only.includes(name)) continue;
    const reached = [];
    let stats = null;
    for (let seed = 1; seed <= SEEDS; seed++) {
        const raw = JSON.parse(JSON.stringify(current));
        rng.setSource(seededRandom(7));
        change(raw);
        rng.setSource(seededRandom(100 + seed));
        let now = raw.meta.lastActiveAt;
        const g = new Game(raw, now);
        const S = g.state;
        S.settings.autoPrestige = false;
        if (S.combat.mode !== 'stages') returnToStages(g);
        S.combat.farmMode = false;
        S.prestige.runStartedAt = now - BALANCE.prestige.minRunMs;
        S.resources.combat_potion_3 = 500; g.setPotion('combat_potion_3');
        S.resources.pumpkin_pie = 500; g.setAutoEat('auto');
        g.prestige();
        const FIRST = { knight: 25, warlord: 25, rogue: 15, forager: 0, scholar: 0, endurance: 0, gourmet: 0, fortune: 0 };
        for (let guard = 0; guard < 500 && S.prestige.skillPoints > 0; guard++) {
            const p = PERKS.find(p => p.id in FIRST && S.perks[p.id] < FIRST[p.id]) || PERKS.find(p => p.id === 'paragon');
            if (!g.buyPerk(p.id)) break;
        }
        g.enterCombat();
        let best = S.combat.maxStage, riseAt = now;
        const start = now;
        while (now - start < 3 * 3600000 && now - riseAt < 20 * 60000) {
            now += 500;
            g.tick(now);
            g.drainEvents();
            if (!S.combat.active && !S.combat.recovering) g.enterCombat();
            if (S.combat.maxStage > best) { best = S.combat.maxStage; riseAt = now; }
            if (now % 60000 < 500) buyCamp(g);
        }
        if (!stats) { g.recompute(); stats = `atk ${g.derived.atk.toExponential(2)} def ${g.derived.def.toExponential(2)} hp ${g.derived.maxHp.toExponential(2)}`; }
        reached.push(best);
    }
    console.log(`${name.padEnd(26)} ${reached.join(' / ').padEnd(10)} (${stats})`);
}
