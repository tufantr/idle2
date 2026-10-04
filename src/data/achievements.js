// Achievements grant real bonuses through the modifier pipeline. Besides its own reward,
// every achievement adds ACHIEVEMENT_GLOBAL_BONUS to ATK, DEF and skill speed.

import { SPEED_SKILLS } from './skills.js';

export const ACHIEVEMENT_GLOBAL_BONUS = 0.01;

const skillLevel = (skill, level) => ({ type: 'skillLevel', skill, level });
const stat = (key, value) => ({ type: 'stat', key, value });
const everySkill = value => Object.fromEntries(SPEED_SKILLS.map(id => [id, value]));

export const ACHIEVEMENTS = [
    { id: 'first_blood',  name: 'First Blood',       desc: 'Defeat 10 monsters',              req: stat('kills', 10),           reward: '+5% Max HP',              mods: { hpMult: 0.05 } },
    { id: 'slayer_1',     name: 'Monster Hunter I',  desc: 'Defeat 500 monsters',             req: stat('kills', 500),          reward: '+5% ATK',                 mods: { atkMult: 0.05 } },
    { id: 'slayer_2',     name: 'Monster Hunter II', desc: 'Defeat 5,000 monsters',           req: stat('kills', 5000),         reward: '+10% ATK',                mods: { atkMult: 0.10 } },
    // The bestiary (data/bestiary.js): a star for 10, 100 and 1,000 defeats of each kind.
    { id: 'naturalist',   name: 'Naturalist',        desc: 'Earn 25 bestiary stars',          req: stat('bestiaryStars', 25),   reward: '+5% gold from combat',    mods: { goldMult: 0.05 } },
    { id: 'monster_lore', name: 'Monster Scholar',   desc: 'Earn 100 bestiary stars',         req: stat('bestiaryStars', 100),  reward: '+5% drop chance',         mods: { dropMult: 0.05 } },
    { id: 'gold_rush',    name: 'Gold Rush',         desc: 'Defeat 25 gilded monsters',       req: stat('gildedKills', 25),     reward: 'Gilded monsters come 50% more often', mods: { gildedChance: 0.5 } },
    { id: 'boss_1',       name: 'Chieftain Slayer',  desc: 'Defeat the Stage 10 boss',        req: stat('maxStage', 11),        reward: '+10% Max HP',             mods: { hpMult: 0.10 } },
    { id: 'boss_5',       name: 'Highland Conqueror',desc: 'Reach Stage 50',                  req: stat('maxStage', 50),        reward: '+10% DEF',                mods: { defMult: 0.10 } },
    { id: 'boss_10',      name: 'Abyss Walker',      desc: 'Reach Stage 100',                 req: stat('maxStage', 100),       reward: '+10% ATK, +10% DEF',      mods: { atkMult: 0.10, defMult: 0.10 } },
    { id: 'excavator',    name: 'The Excavator',     desc: 'Reach Mining level 25',           req: skillLevel('mining', 25),    reward: '+10% Mining speed',       mods: { skillSpeed: { mining: 0.10 } } },
    { id: 'lumberjack',   name: 'Lumberjack',        desc: 'Reach Woodcutting level 25',      req: skillLevel('woodcutting', 25), reward: '+10% Woodcutting speed', mods: { skillSpeed: { woodcutting: 0.10 } } },
    { id: 'tracker',      name: 'Tracker',           desc: 'Reach Hunting level 25',          req: skillLevel('hunting', 25),   reward: '+10% Hunting speed',      mods: { skillSpeed: { hunting: 0.10 } } },
    { id: 'angler',       name: 'Angler',            desc: 'Reach Fishing level 25',          req: skillLevel('fishing', 25),   reward: '+10% Fishing speed',      mods: { skillSpeed: { fishing: 0.10 } } },
    { id: 'pyromaniac',   name: 'Pyromaniac',        desc: 'Reach Firemaking level 25',       req: skillLevel('firemaking', 25), reward: '+10% Firemaking speed', mods: { skillSpeed: { firemaking: 0.10 } } },
    { id: 'green_thumb',  name: 'Green Thumb',       desc: 'Reach Farming level 25',          req: skillLevel('farming', 25),   reward: '+10% farming yield',      mods: { farmYield: 0.10 } },
    { id: 'acrobat',      name: 'Acrobat',           desc: 'Reach Agility level 25',          req: skillLevel('agility', 25),   reward: '+10% Agility speed',      mods: { skillSpeed: { agility: 0.10 } } },
    { id: 'chef',         name: 'Chef',              desc: 'Reach Cooking level 40',          req: skillLevel('cooking', 40),   reward: '+10% food healing',       mods: { foodMult: 0.10 } },
    { id: 'alchemist',    name: 'Alchemist',         desc: 'Reach Alchemy level 40',          req: skillLevel('alchemy', 40),   reward: 'Potions last 25% longer', mods: { potionCharges: 0.25 } },
    { id: 'blacksmith',   name: 'Master Smith',      desc: 'Reach Smithing level 50',         req: skillLevel('smithing', 50),  reward: '+5% quality on forged and crafted gear', mods: { craftQuality: 0.05 } },
    { id: 'jeweller',     name: 'Jeweller',          desc: 'Reach Crafting level 50',         req: skillLevel('crafting', 50),  reward: '+5% quality on forged and crafted gear', mods: { craftQuality: 0.05 } },
    { id: 'veteran',      name: 'Veteran',           desc: 'Reach Combat level 50',           req: skillLevel('combat', 50),    reward: '+5% Max HP, +5% DEF',     mods: { hpMult: 0.05, defMult: 0.05 } },
    { id: 'eternity',     name: 'Eternity',          desc: 'Prestige 5 times',                req: stat('prestiges', 5),        reward: '+10% Prestige Tokens',    mods: { tokenMult: 0.10 } },
    { id: 'capitalist',   name: 'Capitalist',        desc: 'Earn 1,000,000 gold in total',    req: stat('goldEarned', 1000000), reward: '+10% gold from combat',   mods: { goldMult: 0.10 } },
    { id: 'artisan',      name: 'Artisan',           desc: 'Forge or craft 100 items',        req: stat('itemsCrafted', 100),   reward: '+5% workshop speed',      mods: { skillSpeed: { smithing: 0.05, crafting: 0.05 } } },
    { id: 'architect',    name: 'Course Architect',  desc: 'Build all six agility obstacles', req: stat('obstaclesBuilt', 6),   reward: '+5% gold from combat',    mods: { goldMult: 0.05 } },
    { id: 'sharpshooter', name: 'Sharpshooter',      desc: 'Win 50 skill mini-games',         req: stat('minigameWins', 50),    reward: 'Mini-game boosts last 20% longer', mods: { boostDuration: 0.20 } },
    { id: 'practised',    name: 'Well Practised',    desc: 'Gain 500 mastery levels',         req: stat('masteryLevels', 500),  reward: '+5% speed in every skill', mods: { skillSpeed: everySkill(0.05) } },
    { id: 'polymath',     name: 'Polymath',          desc: 'Gain 2,500 mastery levels',       req: stat('masteryLevels', 2500), reward: '+5% double chance in every skill', mods: { doubleChance: everySkill(0.05) } },
    { id: 'grandmaster',  name: 'Grandmaster',       desc: 'Reach mastery 99 in any action',  req: stat('masteries99', 1),      reward: '+5% XP from all skills',  mods: { xpMult: 0.05 } },
    { id: 'legend',       name: 'Living Legend',     desc: 'Equip a Legendary item',          req: stat('legendariesEquipped', 1), reward: '+5% Crit Chance',      mods: { critChance: 0.05 } },
    { id: 'delver',       name: 'Dungeon Delver',    desc: 'Clear 10 dungeons',               req: stat('dungeonClears', 10),   reward: '+5% gold from combat',    mods: { goldMult: 0.05 } },
    { id: 'titan_slayer', name: 'Titan Slayer',      desc: 'Defeat a Titan',                  req: stat('titanKills', 1),       reward: '+5% ATK',                 mods: { atkMult: 0.05 } },
    { id: 'pet_friend',   name: 'Best Friends',      desc: 'Find a pet',                      req: stat('petsFound', 1),        reward: '+5% XP from all skills',  mods: { xpMult: 0.05 } },
    { id: 'collector',    name: 'Collector',         desc: 'Obtain a unique item',            req: stat('uniquesFound', 1),     reward: '+5% drop chance',         mods: { dropMult: 0.05 } },
    { id: 'completionist',name: 'Completionist',     desc: 'Reach level 99 in any skill',     req: stat('skills99', 1),         reward: '+10% XP from all skills', mods: { xpMult: 0.10 } },
    // Secret medals: not shown (nor counted) until earned, for little things found by playing.
    { id: 'companion',    name: 'Good Companion',    desc: 'Pat your pet 25 times',           req: stat('petPats', 25),         reward: '+5% gold from combat',    mods: { goldMult: 0.05 }, secret: true },
    { id: 'great_crate',  name: 'Great Expectations',desc: 'Open a great crate',              req: stat('greatCrates', 1),      reward: '+5% drop chance',         mods: { dropMult: 0.05 }, secret: true },
    { id: 'unbroken',     name: 'Unbroken',          desc: 'Get back up after 100 falls',     req: stat('recoveries', 100),     reward: '+5% Max HP',              mods: { hpMult: 0.05 }, secret: true }
];

/** Is medal `a` shown in the Hall? Every open medal, and a secret one once it is earned. */
export const medalShown = (state, a) => !a.secret || !!state.achievements[a.id];

export function achievementById(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null;
}
