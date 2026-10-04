// Agility: a course of up to six obstacles, one per slot. Building an obstacle costs gold and
// materials, and its bonus is permanent — it survives prestige, which is what makes the course the
// long-term gold sink next to the run-scoped camp. Prices are fixed and sized to about an hour of
// one run's income at the stage where the slot opens (gold still resets on prestige, so an obstacle
// is bought within a run). Running the course is an action: it takes as long as its obstacles
// together and pays their XP.
//
// Replacing an obstacle is allowed; the old one is torn down without a refund.
//
// Built obstacles can be upgraded to level 5: each level adds the obstacle's bonus again (level 5 =
// five times the bonus) and 25% more XP per run. An upgrade costs gold only — the slot's price times
// 2^level — and needs 7 more agility levels per obstacle level. This is the long, bounded late-game
// gold sink: the last upgrade of the last slot costs 4.8 billion.

import { paceList } from './pace.js';
export const MAX_OBSTACLE_LEVEL = 5;
export const OBSTACLE_LEVEL_STEP = 7;
export function obstacleUpgradeGold(slot, level) {
    return AGILITY_SLOTS[slot].costGold * Math.pow(2, level);
}
export function obstacleUpgradeLevelReq(slot, toLevel) {
    return Math.min(99, AGILITY_SLOTS[slot].levelReq + OBSTACLE_LEVEL_STEP * (toLevel - 1));
}

const GATHER = s => ({ mining: s, woodcutting: s, fishing: s, hunting: s });
const PRODUCE = s => ({ cooking: s, firemaking: s, alchemy: s });
const ALL_SKILLS = s => ({ ...GATHER(s), ...PRODUCE(s), smithing: s, crafting: s, farming: s, agility: s });

export const AGILITY_SLOTS = [
    {
        levelReq: 1, costGold: 20_000, materials: { normal_log: 30, copper_bar: 10 },
        obstacles: [
            { id: 'rope_swing',     name: 'Rope Swing',      icon: '🪢', interval: 3000, xp: 10, desc: '+3% gathering speed',  mods: { skillSpeed: GATHER(0.03) } },
            { id: 'log_balance',    name: 'Log Balance',     icon: '🪵', interval: 3000, xp: 10, desc: '+3% production speed', mods: { skillSpeed: PRODUCE(0.03) } },
            { id: 'stepping_stones', name: 'Stepping Stones', icon: '🪨', interval: 3000, xp: 10, desc: '+5% combat XP',       mods: { combatXpMult: 0.05 } }
        ]
    },
    {
        levelReq: 10, costGold: 200_000, materials: { oak_log: 40, iron_bar: 20 },
        obstacles: [
            { id: 'cargo_net',   name: 'Cargo Net',   icon: '🕸️', interval: 3500, xp: 20, desc: '+3% ATK',    mods: { atkMult: 0.03 } },
            { id: 'monkey_bars', name: 'Monkey Bars', icon: '🐒', interval: 3500, xp: 20, desc: '+3% DEF',    mods: { defMult: 0.03 } },
            { id: 'tightrope',   name: 'Tightrope',   icon: '🎪', interval: 3500, xp: 20, desc: '+3% max HP', mods: { hpMult: 0.03 } }
        ]
    },
    {
        levelReq: 25, costGold: 1_500_000, materials: { willow_log: 50, mithril_bar: 20 },
        obstacles: [
            { id: 'pipe_crawl', name: 'Pipe Crawl', icon: '🕳️', interval: 4000, xp: 38, desc: '+5% gold from combat', mods: { goldMult: 0.05 } },
            { id: 'wall_climb', name: 'Wall Climb', icon: '🧗', interval: 4000, xp: 38, desc: '+5% drop chance',      mods: { dropMult: 0.05 } },
            { id: 'gap_leap',   name: 'Gap Leap',   icon: '🦘', interval: 4000, xp: 38, desc: '+2% crit chance',      mods: { critChance: 0.02 } }
        ]
    },
    {
        levelReq: 40, costGold: 10_000_000, materials: { maple_log: 60, adamant_bar: 20 },
        obstacles: [
            { id: 'zipline', name: 'Zipline', icon: '🚡', interval: 4500, xp: 70, desc: '+1 h offline cap',        mods: { offlineHours: 1 } },
            { id: 'hurdles', name: 'Hurdles', icon: '🏃', interval: 4500, xp: 70, desc: '+5% workshop speed',      mods: { skillSpeed: { smithing: 0.05, crafting: 0.05 } } },
            { id: 'mud_pit', name: 'Mud Pit', icon: '🟤', interval: 4500, xp: 70, desc: '+10% farming yield',      mods: { farmYield: 0.10 } }
        ]
    },
    {
        levelReq: 55, costGold: 60_000_000, materials: { yew_log: 60, runite_bar: 20 },
        obstacles: [
            { id: 'rooftop_run', name: 'Rooftop Run', icon: '🏠', interval: 5000, xp: 120, desc: '+5% XP from all skills', mods: { xpMult: 0.05 } },
            { id: 'waterfall',   name: 'Waterfall',   icon: '🌊', interval: 5000, xp: 120, desc: '+5% attack speed',       mods: { attackSpeed: 0.05 } },
            { id: 'rock_wall',   name: 'Rock Wall',   icon: '🧱', interval: 5000, xp: 120, desc: '+3% dodge',              mods: { dodge: 0.03 } }
        ]
    },
    {
        levelReq: 70, costGold: 300_000_000, materials: { magic_log: 80, runite_bar: 30, diamond: 5 },
        obstacles: [
            { id: 'sky_bridge',    name: 'Sky Bridge',    icon: '🌉', interval: 5500, xp: 200, desc: '+5% ATK and DEF',       mods: { atkMult: 0.05, defMult: 0.05 } },
            { id: 'lava_crossing', name: 'Lava Crossing', icon: '🌋', interval: 5500, xp: 200, desc: '+10% max HP',           mods: { hpMult: 0.10 } },
            { id: 'cloud_walk',    name: 'Cloud Walk',    icon: '☁️', interval: 5500, xp: 200, desc: '+5% speed in every skill', mods: { skillSpeed: ALL_SKILLS(0.05) } }
        ]
    }
];

// Melvor pace: a slot's obstacles give less than their base XP the later the slot opens (data/pace.js).
for (const slot of AGILITY_SLOTS) paceList('agility', slot.obstacles, { levelOf: () => slot.levelReq });

export function obstacleById(id) {
    for (let slot = 0; slot < AGILITY_SLOTS.length; slot++) {
        const obstacle = AGILITY_SLOTS[slot].obstacles.find(o => o.id === id);
        if (obstacle) return { ...obstacle, slot };
    }
    return null;
}
