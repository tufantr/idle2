// The power ledger (docs/research_notes/endless-late-game.md §1; DESIGN §3.37): what each source gives the hero as he
// stands, as multipliers on his attack, defence and health and as stages at the two walls a climb meets: the boss's
// clock, which takes attack, and the one blow he must live through, which takes defence and health together. A source's
// share is its stages over all the sources' together. tools/ledger.mjs prints this and the hero's panel shows it
// (ui/render.js renderPowerModal), so the two can't disagree. Pure: nothing here changes the state or a number of the game.

import { BASE, collectModifiers, deriveStats, recordsOf } from '../core/modifiers.js';
import { enemyBaseStats } from '../core/formulas.js';
import { EQUIP_SLOTS } from '../data/items.js';
import { potionName } from '../data/potions.js';
import { trialBite } from '../data/trials.js';
import { TALENTS, talentRank } from '../data/talents.js';

const ARMOUR = ['Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves'];
const JEWELLERY = ['Ring1', 'Ring2', 'Neck', 'Ear1', 'Ear2'];

/** The state with these slots empty. (Copies, as all of these: the hero's own state is only read.) */
const unworn = (s, slots) => ({ ...s, equipped: { ...s.equipped, ...Object.fromEntries(slots.map(slot => [slot, null])) } });
/** Each entry of a keyed object with `fields` laid over it. */
const overEach = (group, fields) => Object.fromEntries(Object.entries(group || {}).map(([key, value]) => [key, { ...value, ...fields }]));

// Every source, in the ledger's order: `of` a part of another (counted inside it, not in the shares), `without` the hero
// with it taken away, `note` what the tool says beside it. Gear and records are reckoned from their own formulas.
const SOURCES = [
    { id: 'gear', label: 'gear (all 12 pieces)', name: 'Gear', without: s => unworn(s, EQUIP_SLOTS) },
    { id: 'weapon', of: 'gear', label: '  of which the weapon', name: 'The weapon', when: s => !!s.equipped.Weapon, without: s => unworn(s, ['Weapon']),
        note: s => { const w = s.equipped.Weapon; return `${w.name} ${w.rarity} T${w.tier}${w.depth ? ` d${w.depth}` : ''} +${s.forge?.Weapon?.level || 0}`; } },
    { id: 'armour', of: 'gear', label: '  of which the armour (6)', name: 'The armour', without: s => unworn(s, ARMOUR) },
    { id: 'jewellery', of: 'gear', label: '  of which the jewellery (5)', name: 'The jewellery', without: s => unworn(s, JEWELLERY) },
    { id: 'levels', of: 'gear', label: '  of which upgrade levels', name: 'The forge and the bench',
        without: s => ({ ...s, equipped: Object.fromEntries(Object.entries(s.equipped).map(([slot, item]) => [slot, item && EQUIP_SLOTS.includes(slot) ? { ...item, upgrade: 0 } : item])), forge: overEach(s.forge, { level: 0 }), bench: overEach(s.bench, { level: 0 }) }),
        note: s => `the forge: ${Object.entries(s.forge || {}).map(([slot, f]) => `${slot} +${f.level}`).join(', ')}; the bench: ${Object.entries(s.bench || {}).map(([slot, f]) => `${slot} +${f.level}`).join(', ')}` },
    { id: 'tokens', label: 'tokens (with records)', name: 'Prestige tokens', without: s => ({ ...s, prestige: { ...s.prestige, tokens: 0 } }),
        note: (s, r) => `${Math.round(s.prestige.tokens || 0)} tokens x records ${r.mult.toFixed(2)}` },
    { id: 'records', of: 'tokens', label: '  of which records', name: 'Records',
        note: (s, r) => `${r.count} records: ${r.stages} stage, ${r.skills} skill, ${r.uniques} unique, ${r.seals} seal, ${r.trials} trial, ${r.laurels} laurel` },
    { id: 'camp', label: 'camp', name: 'The camp', without: s => ({ ...s, camp: {} }), note: s => `${s.camp?.whetstone || 0} levels each` },
    { id: 'legacy', label: 'Legacy', name: 'Legacy', without: s => ({ ...s, prestige: { ...s.prestige, count: 0 } }), note: s => `${s.prestige.count} prestiges` },
    { id: 'banner', label: 'clan banner', name: 'The clan banner', without: s => ({ ...s, clanBanner: null }), note: s => `${s.clanBanner?.kills || 0} levels felled` },
    { id: 'potion', label: 'potion', name: 'Your potion', without: s => ({ ...s, combat: { ...s.combat, potion: 'none', potionMs: 0, dungeonPotion: 'none', dungeonPotionMs: 0 } }),
        note: s => potionName(s.combat.mode === 'dungeon' ? s.combat.dungeonPotion : s.combat.potion) },
    { id: 'level', label: 'combat level', name: 'Combat level', without: s => ({ ...s, skills: { ...s.skills, combat: { ...s.skills.combat, xp: 0 } } }), note: (s, r, d) => `level ${d.combatLevel}` },
    { id: 'perks', label: 'perks', name: 'Perks', without: s => ({ ...s, perks: {} }), note: s => Object.entries(s.perks).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') },
    { id: 'talents', label: 'War Tree', name: 'The War Tree', without: s => ({ ...s, talents: { ...s.talents, ranks: {} } }), note: s => `${TALENTS.reduce((n, t) => n + Math.min(t.max, talentRank(s, t.id)), 0)} ranks` },
    { id: 'medals', label: 'medals', name: 'Medals', without: s => ({ ...s, achievements: {} }), note: s => `${Object.keys(s.achievements).filter(k => s.achievements[k]).length} medals` },
    { id: 'pets', label: 'pets', name: 'Pets', without: s => ({ ...s, pets: {} }) },
    { id: 'titans', label: 'titans', name: 'Titans felled', without: s => ({ ...s, titan: { ...s.titan, kills: 0 } }), note: s => `${s.titan?.kills || 0} titans` },
    { id: 'dungeons', label: 'dungeon milestones', name: 'Dungeon clears', without: s => ({ ...s, dungeons: overEach(s.dungeons, { clears: 0 }) }), note: () => "the open tier's; a sealed tier's are with the Seals" },
    { id: 'seals', label: 'dungeon Seals', name: 'Dungeon Seals', without: s => ({ ...s, dungeonTier: 1 }), note: s => `tier ${s.dungeonTier || 1}: their records and the sealed tiers' milestones` },
    { id: 'agility', label: 'agility', name: 'The agility course', without: s => ({ ...s, agility: { ...s.agility, built: [] } }) }
];

/** The ids of the sources whose shares add up to the whole, in the ledger's order. */
export const POWER_SOURCES = SOURCES.filter(p => !p.of).map(p => p.id);
/** The hero with a source taken away (a copy). With every one of POWER_SOURCES gone he has only his bare hands. */
export const withoutSource = (state, id) => SOURCES.find(p => p.id === id).without(state);

/**
 * The hero's attack, defence and health over what they would be without a source. A number he has none of stays at 1. Without
 * armour his defence can be nothing, so the ratio is taken against next to nothing, as a part of the gear only ever is.
 */
const ratioOf = (now, without) => (now > 0 ? now / Math.max(1e-9, without) : 1);

/**
 * The ledger of the hero in `state`: { best, gHp, gAtk, total: { atk, def, hp }, tokens, records, stars, parts }, each part
 * { id, name, label, of, atk, def, hp, boss, blow, stages, share, note }. `boss` is the stages its attack is worth where a
 * boss must fall in time, `blow` the stages its defence and health are worth where he must live through one hit, at the
 * monsters' growth at his best stage; `share` is what its stages are of all the sources' together (a part `of` another
 * is reckoned the same way, and is already in that other's share).
 */
export function powerLedger(state) {
    const S = state;
    const d = deriveStats(S);
    const mods = collectModifiers(S);
    const rec = recordsOf(S);
    const best = Math.max(1, S.combat?.bestStage || 1);
    // the monsters' growth a stage where he stands (the deep Abyss eases past BALANCE.enemy.deepFrom)
    const gHp = enemyBaseStats(best + 1).hp / enemyBaseStats(best).hp;
    const gAtk = enemyBaseStats(best + 1).atk / enemyBaseStats(best).atk;
    const held = S.prestige.tokens || 0;
    const tokens = trialBite(S).noTokens ? 0 : held;   // (nothing in the Faithless Trial)
    const hpBase = BASE.baseHp + BASE.hpPerCombatLevel * (d.combatLevel - 1);
    const layer = (k, m) => 1 + BASE[k] * tokens * m;
    const reckon = {
        // gear against none at all: defence is then nothing, so it is counted from one point
        gear: () => ({ atk: (BASE.unarmedAtk + mods.gearAtk) / BASE.unarmedAtk, def: Math.max(1, mods.gearDef), hp: (hpBase + BASE.hpPerDef * mods.gearDef) / hpBase }),
        records: () => ({ atk: layer('tokenAtk', rec.mult) / layer('tokenAtk', 1), def: layer('tokenDef', rec.mult) / layer('tokenDef', 1), hp: layer('tokenHp', rec.mult) / layer('tokenHp', 1) })
    };
    const parts = SOURCES.filter(p => !p.when || p.when(S)).map(p => {
        let r;
        if (reckon[p.id]) r = reckon[p.id]();
        else {
            const e = deriveStats(p.without(S));
            r = { atk: ratioOf(d.atk, e.atk), def: ratioOf(d.def, e.def), hp: ratioOf(d.maxHp, e.maxHp) };
        }
        const boss = Math.log(r.atk) / Math.log(gHp);
        const blow = Math.log(r.def * r.hp) / (2 * Math.log(gAtk));
        const note = p.id === 'gear' ? `attack ${Math.round(mods.gearAtk)}, defence ${Math.round(mods.gearDef)} (defence counted from 1 point)` : p.note ? p.note(S, rec, d) : '';
        return { id: p.id, name: p.name, label: p.label, ...(p.of ? { of: p.of } : {}), ...r, boss, blow, stages: Math.max(0, boss) + Math.max(0, blow), note };
    });
    const whole = parts.reduce((sum, p) => sum + (p.of ? 0 : p.stages), 0);
    for (const p of parts) p.share = whole > 0 ? p.stages / whole : 0;
    return { best, gHp, gAtk, total: { atk: d.atk, def: d.def, hp: d.maxHp }, tokens: held, records: rec, stars: S.ascension?.stars || 0, parts };
}

/** The sources at work on the hero, biggest share first: what the panel lists. */
export const powerShares = ledger => ledger.parts.filter(p => !p.of && p.share > 0).sort((a, b) => b.share - a.share);
