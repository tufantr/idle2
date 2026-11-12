// The pieces of tools/simulate.mjs that need no run of their own, so tests can import them (the simulator plays a whole
// game on import): the bot's rule for the Titan, and its pool check (P-114, docs/research_notes/research-loop/034 and
// 022): essence, bars and gems booked by source and sink in bands of 50 hours, and what sits past a cap.

import { RESOURCES } from '../src/data/resources.js';
import { TITAN_TIME_MS } from '../src/data/dungeons.js';
import { fightPreview, titanEnemy } from '../src/systems/dungeon.js';
import { CAMP_UPGRADES, campMultiplier } from '../src/data/camp.js';
import { enemyForStage, enemyDamage } from '../src/core/formulas.js';
import { BASE } from '../src/core/modifiers.js';
import { EQUIP_SLOTS } from '../src/data/items.js';

// ---------- the Titan ----------

/**
 * The dungeons tab's badge (src/ui/render.js readyBadge): the game's own preview has the Titan fall within the fight's
 * minute, and before the hero would. The bot fights a banked Titan only then (research-loop 040 §2).
 */
export function titanBeatable(game) {
    const f = fightPreview(game.derived, titanEnemy(game.state));
    return f.killSeconds <= Math.min(TITAN_TIME_MS / 1000, f.surviveSeconds);
}

// ---------- pools ----------

/** A band of `bandHours` in which a resource spends under `floor` of what came in (and `minIncome` or more came in) is a pool. */
export const POOL = { bandHours: 50, floor: 0.1, minIncome: 10 };
/** A band's name in hours, 'a-b', the last one ending at `hours`. */
export const bandName = (i, bandHours, hours = Infinity) => `${i * bandHours}-${Math.min((i + 1) * bandHours, hours)}`;
/** The band of an hour; a run's last moment (`endHours`) belongs to its last band, not to one of its own. */
export const bandOf = (hours, bandHours, endHours = Infinity) => Math.max(0, Math.min(Math.floor(hours / bandHours), Math.ceil(endHours / bandHours) - 1));
/** The resources the pool check books: essence, every bar and every gem. */
export const POOL_IDS = Object.keys(RESOURCES).filter(id => id === 'essence' || ['bar', 'gem'].includes(RESOURCES[id].category));
/** 'essence', 'bars' or 'gems' (null for any other resource). */
export function poolGroup(id) {
    if (id === 'essence') return 'essence';
    const category = RESOURCES[id]?.category;
    return category === 'bar' ? 'bars' : category === 'gem' ? 'gems' : null;
}

/**
 * A book of what goes into and out of the pooled resources: `note(id, delta, label, hours)` puts a change of `delta` to
 * resource `id`, at `hours` into a run of `endHours`, down to `label` (its source when it adds, its sink when it takes).
 * `res[id]` holds { got, spent, bySource, bySink, bands: [[got, spent] for each band] }.
 */
export function createPoolBook(bandHours = POOL.bandHours, endHours = Infinity) {
    const res = {};
    return {
        bandHours, res,
        note(id, delta, label, hours) {
            if (!delta || !Number.isFinite(delta)) return;
            const r = res[id] ||= { got: 0, spent: 0, bySource: {}, bySink: {}, bands: [] };
            const band = bandOf(hours, bandHours, endHours);
            while (r.bands.length <= band) r.bands.push([0, 0]);
            if (delta > 0) {
                r.got += delta;
                r.bySource[label] = (r.bySource[label] || 0) + delta;
                r.bands[band][0] += delta;
            } else {
                r.spent -= delta;
                r.bySink[label] = (r.bySink[label] || 0) - delta;
                r.bands[band][1] -= delta;
            }
        }
    };
}

/**
 * Book every change the game makes to the pooled resources of `state`: its resources object is wrapped in a Proxy that
 * notes each write (`labelOf()` names its source or sink, `hoursOf()` its time) and makes it as before, so the game
 * plays exactly as unwatched. It sees inside the offline replay too.
 */
export function watchPools(state, book, labelOf, hoursOf) {
    const watched = new Set(POOL_IDS);
    state.resources = new Proxy(state.resources, {
        set(target, key, value) {
            if (watched.has(key)) book.note(key, (Number(value) || 0) - (Number(target[key]) || 0), labelOf(), hoursOf());
            target[key] = value;
            return true;
        }
    });
}

/** Totals of a book's resources by group (essence, bars, gems): { got, spent, bySink }. */
export function poolTotals(book) {
    const out = {};
    for (const [id, r] of Object.entries(book.res)) {
        const g = out[poolGroup(id)] ||= { got: 0, spent: 0, bySink: {} };
        g.got += r.got;
        g.spent += r.spent;
        for (const [sink, qty] of Object.entries(r.bySink)) g.bySink[sink] = (g.bySink[sink] || 0) + qty;
    }
    return out;
}

/**
 * The pools: each band in which a booked resource spent under `floor` of its income (with `minIncome` or more in).
 * [{ id, band: 'a-b' (hours; the last one ends at `hours`), got, spent, share }], in the book's order.
 */
export function poolFlags(book, { floor = POOL.floor, minIncome = POOL.minIncome, hours = Infinity } = {}) {
    const flags = [];
    for (const [id, r] of Object.entries(book.res)) {
        r.bands.forEach(([got, spent], i) => {
            if (got >= minIncome && spent < floor * got) flags.push({ id, band: bandName(i, book.bandHours, hours), got, spent, share: spent / got });
        });
    }
    return flags;
}

// ---------- caps ----------

/**
 * What sits past a cap now. The camp: the Armour Rack's levels the hero could do without and still have the boss at his
 * run's wall hit him for the 90% mitigation cap's least (core/formulas.js enemyDamage; the rack is the camp's one upgrade
 * whose stat meets a cap). The worn affixes: the most of a capped stat's affixes (BASE.caps: crit chance, dodge,
 * lifesteal, attack speed; core/modifiers.js deriveStats) that could come off, the smallest first, and leave the stat
 * at its cap. { rack, rackPast, affixes (worn), affixesPast, byStat }.
 */
export function pastCaps(game) {
    const state = game.state;
    const rack = CAMP_UPGRADES.find(u => u.stat === 'def');
    const levels = state.camp?.[rack.id] || 0;
    const wall = enemyForStage(Math.max(10, Math.ceil(Math.max(1, state.combat.maxStage) / 10) * 10));
    const least = enemyDamage(wall.atk, Infinity);
    const def = game.derived.def;
    let rackPast = 0;
    while (rackPast < levels && enemyDamage(wall.atk, def * campMultiplier(rack, levels - rackPast - 1) / campMultiplier(rack, levels)) <= least) rackPast++;
    const worn = EQUIP_SLOTS.flatMap(slot => state.equipped[slot]?.affixes || []);
    const byStat = {};
    let affixesPast = 0;
    for (const [stat, cap] of Object.entries(BASE.caps)) {
        let total = (stat === 'critChance' ? BASE.baseCritChance : 0) + (game.mods[stat] || 0);
        let n = 0;
        for (const value of worn.filter(a => a.stat === stat).map(a => a.value).sort((a, b) => a - b)) {
            if (total - value < cap) break;
            total -= value;
            n++;
        }
        if (n) { byStat[stat] = n; affixesPast += n; }
    }
    return { rack: levels, rackPast, affixes: worn.length, affixesPast, byStat };
}

/**
 * The most past its caps at the samples of each band of a run of `endHours`: `sample(game, hours)`; `bands(hours)` lists
 * them, [{ band, samples, rack, rackPast, affixes, affixesPast, byStat }]: the rack's levels at the sample with the most of
 * them past the cap, the most affixes worn, and the most past their caps with their stats at that sample.
 */
export function createCapLog(bandHours = POOL.bandHours, endHours = Infinity) {
    const list = [];
    return {
        sample(game, hours) {
            const i = bandOf(hours, bandHours, endHours);
            while (list.length <= i) list.push({ samples: 0, rack: 0, rackPast: 0, affixes: 0, affixesPast: 0, byStat: {} });
            const b = list[i];
            const now = pastCaps(game);
            b.samples++;
            if (now.rackPast > b.rackPast || (now.rackPast === b.rackPast && now.rack > b.rack)) { b.rack = now.rack; b.rackPast = now.rackPast; }
            b.affixes = Math.max(b.affixes, now.affixes);
            if (now.affixesPast > b.affixesPast) { b.affixesPast = now.affixesPast; b.byStat = now.byStat; }
        },
        bands: (hours = Infinity) => list.map((b, i) => ({ band: bandName(i, bandHours, hours), ...b }))
    };
}
