// The War Tree (DESIGN §3.33; the owner's go, 27 October 2026): talents for the combat levels past 99. Combat XP no
// longer stops at twice level 99's: the levels go on along the same table (core/xp.js), and each one past 99 is a talent
// point, so a hero at the old cap (level 106) has seven at once. The table doubles every seven levels, so each point takes
// longer than the last: the owner asked for "very slow additional progress" for a game farmed without end, in the shape of
// WoW Classic's talents and League of Legends' old masteries.
//
// Three trees: Blade (his attack), Bulwark (staying up) and Hunt (the boss's clock, the loot, the climb), seven rows
// each. A row opens once ROW_POINTS more points are spent in its tree (the seventh at 30, so its capstone is the 31st), a
// talent with `needs` once that one is full (an arrow in the tree). Talents never speed the prestige loop itself (the
// owner turned the Quartermaster down for that): a run starts where it did.
//
// Each talent's numbers are per rank: `mods` add to the modifier pipeline as a perk's do and `mult` multiplies as Knight's
// does (core/modifiers.js); `fx` are its rules, read in the fight (systems/combat.js, through talentFx), each an array of
// the value at ranks 1, 2, ... `text(rank)` says what a rank does, in the tree's detail line. The rules stay out of the clan
// boss's fight, which the server reckons (core/power.js), as a Trial's do.

/** Points in a tree that open its next row; the seventh row (the capstone) opens at 6 × this. */
export const ROW_POINTS = 5;
export const ROWS = 7;

/** Unlearning every talent costs essence, more each time: `essence` × `growth` to the times done before. */
export const RESPEC = { essence: 20000, growth: 1.5 };

/** How long Second Wind waits before it can catch the hero again, and Relentless's step and most. */
export const SECOND_WIND_MS = 60000;
export const RELENTLESS = { stepMs: 2000, maxMs: 10000 };

export const TREES = [
    { id: 'blade', name: 'Blade', icon: 'item/Weapon/6', blurb: 'His attack: harder, sharper, and the killing blow.' },
    { id: 'bulwark', name: 'Bulwark', icon: 'item/Shield/6', blurb: 'Staying up: health, armour, and blows turned aside.' },
    { id: 'hunt', name: 'Hunt', icon: 'tool/bow', blurb: "The boss's clock, the loot, and the climb." }
];

const per = (ranks, step) => Array.from({ length: ranks }, (_, i) => +(step * (i + 1)).toFixed(4));
const pct = v => `${Math.round(v * 100)}%`;
const sec = ms => `${+(ms / 1000).toFixed(1)} s`;

export const TALENTS = [
    // ---- Blade ----
    { id: 'sharpened_edge', tree: 'blade', row: 1, col: 1, max: 5, name: 'Sharpened Edge', icon: 'item/Weapon/3',
        mult: { atk: 1.01 }, text: r => `×${(1.01 ** r).toFixed(3)} attack` },
    { id: 'keen_eye', tree: 'blade', row: 1, col: 3, max: 5, name: 'Keen Eye', icon: 'icon/crit',
        mods: { critDmg: 0.05 }, text: r => `+${pct(0.05 * r)} critical damage` },
    { id: 'opening_blow', tree: 'blade', row: 2, col: 1, max: 3, name: 'Opening Blow', icon: 'item/Weapon/5',
        fx: { openingBlow: [1.5, 2, 3] }, text: r => `his first swing at a boss deals ×${[1.5, 2, 3][r - 1]}` },
    { id: 'precision', tree: 'blade', row: 2, col: 3, max: 5, name: 'Precision', icon: 'item/Gloves/4',
        mods: { critChance: 0.01 }, text: r => `+${pct(0.01 * r)} critical chance` },
    { id: 'execute', tree: 'blade', row: 3, col: 1, max: 3, needs: 'opening_blow', name: 'Execute', icon: 'icon/skull',
        fx: { execute: [0.02, 0.04, 0.06] }, text: r => `a boss below ${pct([0.02, 0.04, 0.06][r - 1])} of its health falls` },
    { id: 'cleave', tree: 'blade', row: 3, col: 2, max: 3, name: 'Cleave', icon: 'uniq/warlord_cleaver',
        fx: { cleave: [0.2, 0.4, 0.6] }, text: r => `${pct([0.2, 0.4, 0.6][r - 1])} of a killing blow's spare damage carries to the next monster` },
    { id: 'weak_spot', tree: 'blade', row: 4, col: 1, max: 3, name: 'Weak Spot', icon: 'mon/Cursed Knight',
        fx: { weakSpot: [0.04, 0.08, 0.12] }, text: r => `critical hits on a boss deal +${pct([0.04, 0.08, 0.12][r - 1])}` },
    { id: 'flurry', tree: 'blade', row: 4, col: 3, max: 3, needs: 'precision', name: 'Flurry', icon: 'icon/spark',
        fx: { flurry: [0.08, 0.16, 0.25] }, text: r => `after a critical hit, his next swing comes ${pct([0.08, 0.16, 0.25][r - 1])} sooner` },
    { id: 'giant_slayer', tree: 'blade', row: 5, col: 2, max: 5, name: 'Giant Slayer', icon: 'mon/Mountain Troll',
        fx: { giantSlayer: per(5, 0.02) }, text: r => `+${pct(0.02 * r)} damage to bosses` },
    { id: 'berserker', tree: 'blade', row: 5, col: 3, max: 2, name: 'Berserker', icon: 'mon/Orc Warlord',
        fx: { berserker: [0.1, 0.2] }, text: r => `+${pct(0.1 * r)} damage while under half his health` },
    { id: 'savage_blows', tree: 'blade', row: 6, col: 2, max: 5, name: 'Savage Blows', icon: 'item/Weapon/7',
        mult: { atk: 1.01 }, text: r => `×${(1.01 ** r).toFixed(3)} attack` },
    { id: 'swift_kill', tree: 'blade', row: 6, col: 3, max: 2, name: 'Swift Kill', icon: 'item/Boots/5',
        fx: { swiftKill: [0.25, 0.5] }, text: r => `a kill readies his next swing ${pct(0.25 * r)} sooner` },
    { id: 'deathblow', tree: 'blade', row: 7, col: 2, max: 1, needs: 'savage_blows', name: 'Deathblow', icon: 'uniq/hellforged_gauntlets',
        fx: { deathblow: [2] }, text: () => 'every tenth swing deals double' },

    // ---- Bulwark ----
    { id: 'thick_skin', tree: 'bulwark', row: 1, col: 1, max: 5, name: 'Thick Skin', icon: 'item/Body/3',
        mult: { hp: 1.02 }, text: r => `×${(1.02 ** r).toFixed(3)} health` },
    { id: 'iron_hide', tree: 'bulwark', row: 1, col: 3, max: 5, name: 'Iron Hide', icon: 'item/Shield/3',
        mult: { def: 1.02 }, text: r => `×${(1.02 ** r).toFixed(3)} defence` },
    { id: 'brace', tree: 'bulwark', row: 2, col: 1, max: 3, name: 'Brace', icon: 'item/Shield/5',
        fx: { brace: [0.07, 0.14, 0.2] }, text: r => `a blow of over 30% of his health is cut by ${pct([0.07, 0.14, 0.2][r - 1])}` },
    { id: 'light_feet', tree: 'bulwark', row: 2, col: 3, max: 5, name: 'Light Feet', icon: 'icon/dodge',
        mods: { dodge: 0.01 }, text: r => `+${pct(0.01 * r)} dodge` },
    { id: 'second_wind', tree: 'bulwark', row: 3, col: 1, max: 1, needs: 'brace', name: 'Second Wind', icon: 'icon/heart',
        fx: { secondWind: [1] }, text: () => `once a minute, a blow that would fell him leaves him standing, and he eats` },
    { id: 'hearty_meals', tree: 'bulwark', row: 4, col: 2, max: 3, name: 'Hearty Meals', icon: 'res/cooked_shark',
        mods: { foodMult: 0.1 }, text: r => `food heals +${pct(0.1 * r)}` },
    { id: 'lifeblood', tree: 'bulwark', row: 3, col: 2, max: 2, name: 'Lifeblood', icon: 'mon/Leech',
        mods: { lifesteal: 0.01 }, fx: { lifestealCeiling: [0.005, 0.01] }, text: r => `+${pct(0.01 * r)} lifesteal, and it heals up to ${+(0.5 * r).toFixed(1)}% more of his health a second` },
    { id: 'hamstring', tree: 'bulwark', row: 4, col: 1, max: 3, name: 'Hamstring', icon: 'item/Boots/3',
        fx: { hamstring: [0.05, 0.1, 0.15] }, text: r => `a boss swings ${pct([0.05, 0.1, 0.15][r - 1])} slower` },
    { id: 'riposte', tree: 'bulwark', row: 4, col: 3, max: 3, needs: 'light_feet', name: 'Riposte', icon: 'item/Weapon/2',
        fx: { riposte: [0.33, 0.66, 1] }, text: r => `a dodge strikes back with ${pct([0.33, 0.66, 1][r - 1])} of a swing` },
    { id: 'stalwart', tree: 'bulwark', row: 5, col: 1, max: 5, name: 'Stalwart', icon: 'item/Head/6',
        mult: { def: 1.015, hp: 1.015 }, text: r => `×${(1.015 ** r).toFixed(3)} defence and health` },
    { id: 'rally', tree: 'bulwark', row: 5, col: 2, max: 3, name: 'Rally', icon: 'campfire',
        fx: { rally: [0.01, 0.02, 0.03] }, text: r => `a kill heals ${pct(0.01 * r)} of his health` },
    { id: 'fortress', tree: 'bulwark', row: 6, col: 2, max: 5, name: 'Fortress', icon: 'uniq/dragonheart_plate',
        fx: { fortress: per(5, 0.03) }, text: r => `blows hurt ${pct(0.03 * r)} less` },
    { id: 'vengeance', tree: 'bulwark', row: 6, col: 3, max: 2, needs: 'riposte', name: 'Vengeance', icon: 'mon/Abyss Warlord',
        fx: { vengeance: [0.25, 0.5] }, text: r => `after a dodge, his next swing deals +${pct(0.25 * r)}` },
    { id: 'unbreakable', tree: 'bulwark', row: 7, col: 2, max: 1, needs: 'fortress', name: 'Unbreakable', icon: 'uniq/void_aegis',
        fx: { unbreakable: [1 / 3] }, text: () => 'no blow takes more than a third of his health' },

    // ---- Hunt ----
    { id: 'patient_hunter', tree: 'hunt', row: 1, col: 1, max: 5, name: 'Patient Hunter', icon: 'icon/time',
        fx: { patientMs: per(5, 1000) }, text: r => `+${r} s on a boss's clock` },
    { id: 'scavenger', tree: 'hunt', row: 1, col: 3, max: 5, name: 'Scavenger', icon: 'gold',
        mods: { goldMult: 0.05 }, text: r => `+${pct(0.05 * r)} gold` },
    { id: 'treasure_sense', tree: 'hunt', row: 2, col: 2, max: 5, name: 'Treasure Sense', icon: 'crate',
        mods: { dropMult: 0.04 }, text: r => `+${pct(0.04 * r)} drop chance` },
    { id: 'essence_drinker', tree: 'hunt', row: 2, col: 3, max: 3, name: 'Essence Drinker', icon: 'res/essence',
        fx: { essence: [0.15, 0.3, 0.45] }, text: r => `+${pct(0.15 * r)} essence from kills` },
    { id: 'second_chance', tree: 'hunt', row: 3, col: 1, max: 2, needs: 'patient_hunter', name: 'Second Chance', icon: 'icon/away',
        fx: { regroupCut: [30000, 60000] }, text: r => (r >= 2 ? 'a boss that held out is tried again at once' : `a boss that held out is tried again ${sec(30000 * r)} sooner`) },
    { id: 'gilded_eye', tree: 'hunt', row: 3, col: 3, max: 3, name: 'Gilded Eye', icon: 'item/Ring/4',
        mods: { gildedChance: 0.2 }, text: r => `gilded monsters come ${pct(0.2 * r)} more often` },
    { id: 'long_draught', tree: 'hunt', row: 4, col: 1, max: 3, name: 'Long Draught', icon: 'res/combat_potion_4',
        mods: { potionDuration: 0.15 }, text: r => `a potion's dose lasts ${pct(0.15 * r)} longer` },
    { id: 'lords_due', tree: 'hunt', row: 4, col: 3, max: 3, name: "Lord's Due", icon: 'crown',
        fx: { lordsDue: [0.15, 0.3, 0.5] }, text: r => `a Lord's first fall leaves a second piece ${pct([0.15, 0.3, 0.5][r - 1])} of the time` },
    { id: 'veterans_focus', tree: 'hunt', row: 5, col: 1, max: 3, name: "Veteran's Focus", icon: 'icon/keep',
        fx: { focusCut: [15000, 30000, 45000] }, text: r => `Focus settles in after ${sec(60000 - 15000 * r)} instead of a minute` },
    { id: 'tracker', tree: 'hunt', row: 5, col: 3, max: 5, name: 'Tracker', icon: 'icon/xp',
        mods: { combatXpMult: 0.04 }, text: r => `+${pct(0.04 * r)} combat XP` },
    { id: 'bounty', tree: 'hunt', row: 6, col: 2, max: 5, name: 'Bounty', icon: 'mon/Griffin',
        fx: { bounty: per(5, 0.2) }, text: r => `a boss's first fall pays +${pct(0.2 * r)} gold and XP` },
    { id: 'relentless', tree: 'hunt', row: 7, col: 2, max: 1, needs: 'bounty', name: 'Relentless', icon: 'mon/Marsh Hydra',
        fx: { relentless: [1] }, text: () => `each time a boss holds out, its next try gives ${sec(RELENTLESS.stepMs)} more, up to ${sec(RELENTLESS.maxMs)}` }
];

const BY_ID = new Map(TALENTS.map(t => [t.id, t]));
export const talentById = id => BY_ID.get(id) || null;
export const treeById = id => TREES.find(t => t.id === id) || null;

/** Every rank of every talent: the points that fill the whole War Tree. */
export const TALENT_POINTS_MAX = TALENTS.reduce((n, t) => n + t.max, 0);

/** A talent's rank in this save (0 when not learned). */
export const talentRank = (state, id) => Math.max(0, Math.floor(Number(state?.talents?.ranks?.[id]) || 0));

/** Points spent in one tree, or (no tree) in all three. */
export function talentPointsSpent(state, tree = null) {
    return TALENTS.reduce((n, t) => n + (!tree || t.tree === tree ? Math.min(t.max, talentRank(state, t.id)) : 0), 0);
}

/** The points a tree needs for a row to open (row 1: none). */
export const rowOpensAt = row => ROW_POINTS * (row - 1);

/**
 * Why a talent can't take its next rank, given `points` free (null when it can): a full talent, no point, a row not yet
 * open, or the talent its arrow comes from not full.
 */
export function talentBlock(state, t, points) {
    const rank = talentRank(state, t.id);
    if (rank >= t.max) return 'full';
    if (points < 1) return 'points';
    if (talentPointsSpent(state, t.tree) < rowOpensAt(t.row)) return 'row';
    if (t.needs && talentRank(state, t.needs) < talentById(t.needs).max) return 'needs';
    return null;
}

/**
 * Is this set of ranks a tree a hero could have learned in order? Each talent's row open with the points below it, each
 * arrow's talent full. (A save is checked with it: one that isn't is unlearned, its points given back.)
 */
export function talentsValid(ranks) {
    const state = { talents: { ranks } };
    for (const t of TALENTS) {
        const rank = talentRank(state, t.id);
        if (!rank) continue;
        if (rank > t.max) return false;
        if (t.needs && talentRank(state, t.needs) < talentById(t.needs).max) return false;
        const below = TALENTS.reduce((n, o) => n + (o.tree === t.tree && o.row < t.row ? Math.min(o.max, talentRank(state, o.id)) : 0), 0);
        if (below < rowOpensAt(t.row)) return false;
    }
    return true;
}

const NO_FX = Object.freeze({});

/** What the learned talents' rules come to (`fx`, each at its rank): read in the fight. Empty when none are learned. */
export function talentFx(state) {
    const ranks = state?.talents?.ranks;
    if (!ranks) return NO_FX;
    let fx = null;
    for (const t of TALENTS) {
        if (!t.fx) continue;
        const rank = Math.min(t.max, talentRank(state, t.id));
        if (!rank) continue;
        fx = fx || {};
        for (const [key, values] of Object.entries(t.fx)) fx[key] = values[rank - 1];
    }
    return fx || NO_FX;
}

/** The essence the next unlearning costs (RESPEC: more each time). */
export const respecPrice = state => Math.round(RESPEC.essence * RESPEC.growth ** Math.max(0, Math.floor(Number(state?.talents?.respecs) || 0)));
