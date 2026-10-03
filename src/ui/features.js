// What each place in the game is, as a picture and a few words. One entry serves the card shown when
// the place unlocks, the "next" slot in the sidebar, the banner on its tab and the About card behind
// every "?" button (which is where the old "How it works" paragraphs went). Paintings come from
// assets/paint (docs/art/gemini.md); sprites from the atlas.

import { SKILLS } from '../data/skills.js';
import { BALANCE } from '../core/formulas.js';
import { BASE } from '../core/modifiers.js';
import { ACHIEVEMENT_GLOBAL_BONUS } from '../data/achievements.js';
import { DUNGEON_BOSS_TIME_MS, TITAN_TIME_MS, TITAN_BONUS, FRAGMENTS_PER_UNIQUE } from '../data/dungeons.js';
import { EVENT_ACTIONS_PER_TOKEN, EVENT_DAILY_CAP } from '../data/events.js';
import { MAX_OBSTACLE_LEVEL } from '../data/agility.js';
import { BAIT_EXTRA_CHANCE } from '../systems/skilling.js';
import { MASTERY_PER_LEVEL } from '../data/mastery.js';
import { escapeHtml as esc } from './format.js';

const pc = (value, digits = 0) => `${(value * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
const secs = ms => Math.round(ms / 1000);

// `art` is the painting, `focus` where its crop looks (CSS background-position), `icon` a sprite key
// or an emoji for small places, `blurb` one line, `points` the rules in a few short lines.
export const FEATURES = {
    combat: { name: 'Combat', art: 'meadow', icon: 'item/Weapon/3', blurb: SKILLS.combat.desc,
        points: ['Your hero fights on his own. Click the monster to strike as well: half damage, and it builds a combo.', 'Every tenth stage is a boss on a timer. Beat it to reach the next zone.', 'If you fall, you step back a stage and fight on.'] },
    mining: { name: 'Mining', art: 'caves', icon: 'res/copper_ore', blurb: SKILLS.mining.desc,
        points: ['Pick a vein and your hero keeps digging, even while you are away.', 'Ore becomes bars in Smithing. Now and then a gem turns up.'] },
    smithing: { name: 'Smithing', art: 'forge', icon: 'res/copper_bar', blurb: SKILLS.smithing.desc,
        points: ['Smelt: ore becomes bars.', 'Forge: bars become weapons and armour. Each piece opens a few levels after its metal.', 'Forged gear rolls up to Rare. Epic and legendary gear only drops in combat.', 'Tools make gathering faster.'] },
    woodcutting: { name: 'Woodcutting', art: 'forest', icon: 'res/oak_log', blurb: SKILLS.woodcutting.desc, points: ['Logs feed the kitchen fire, tool handles and bows.'] },
    hunting: { name: 'Hunting', art: 'meadow', focus: 'center 62%', icon: 'res/raw_rabbit', blurb: SKILLS.hunting.desc, points: ['Raw meat is cooked into food, and food keeps you alive in long fights.'] },
    cooking: { name: 'Cooking', art: 'camp', icon: 'res/cabbage_soup', blurb: 'Turns raw meat and fish into food that keeps you alive in combat.',
        points: ['Every dish burns one log.', 'In a fight your hero eats on his own when his health runs low.'] },
    fishing: { name: 'Fishing', art: 'river', icon: 'res/raw_trout', blurb: 'Fish for the kitchen: they cook into the best food for their level.',
        points: [`Each catch uses one bait, if you have any, for a ${pc(BAIT_EXTRA_CHANCE)} chance of a second fish.`, 'Bait drops in the Fever Marsh, the Drowned Ruins and the Frozen Wastes. The Shop sells it too.'] },
    firemaking: { name: 'Firemaking', art: 'camp', focus: 'right 70%', icon: 'mon/Magma Slime', blurb: 'Burn logs to light the bonfire.',
        points: [`While the bonfire burns, every skill earns more XP, combat included (from +${pc(BASE.bonfireXp)}, growing with your level).`, `Each log adds ${BASE.bonfireSecondsPerLogTier} seconds times its tier, up to ${BASE.bonfireMaxMs / 3600000} hours.`] },
    alchemy: { name: 'Alchemy', art: 'lab', icon: 'res/health_potion', blurb: SKILLS.alchemy.desc,
        points: ['Forage herbs, then brew them with a second ingredient.', `Pick a potion on the Combat tab: one bottle lasts ${BASE.basePotionCharges} attacks.`] },
    crafting: { name: 'Crafting', art: 'workshop', icon: 'item/Ring/4', blurb: SKILLS.crafting.desc,
        points: ['Jewellery is a precious bar set with a gem. It adds a little attack and defence and carries the most bonuses.', 'Gems turn up while mining and drop from monsters.', 'Bows and rods make hunting and fishing faster.'] },
    farming: { name: 'Farming', art: 'farm', icon: 'farm/growing', blurb: 'Plots grow on the clock while you do something else.',
        points: ['Seeds are bought with gold when you plant.', 'Herbs go to Alchemy; potatoes, cabbages, pumpkins and starfruit to Cooking.', 'A hoe makes crops grow faster.'] },
    agility: { name: 'Agility', art: 'course', icon: 'item/Boots/3', blurb: 'Build an obstacle course, then run it to train.',
        points: ['Every obstacle is a permanent bonus that survives prestige.', `Each can be upgraded to level ${MAX_OBSTACLE_LEVEL}; its bonus counts once per level.`, 'Replacing one tears the old one down without a refund.'] },
    inventory: { name: 'Inventory', art: 'workshop', icon: 'item/Body/3', blurb: 'Your hero, his gear and everything you carry.', points: ['Tap a piece of gear to see it, wear it, upgrade it or sell it.', 'A green arrow marks gear that beats what you wear.'] },
    shop: { name: 'Shop', art: 'market', icon: 'gold', blurb: 'Supplies for gold, perks for skill points.',
        points: ['Supplies are priced by your best stage, so gathering always stays worth it.', 'Perks cost one skill point each and last forever.'] },
    prestige: { name: 'Prestige', art: 'shrine', icon: 'res/essence', blurb: 'Trade a run for permanent power.',
        points: [`Your best stage this run becomes tokens. Each token is +${pc(BASE.tokenAtk, 1)} attack and defence, forever.`, 'Gold, the camp and your stage start over. Skills, gear and materials stay.', `You also earn skill points for perks. A run lasts at least ${BALANCE.prestige.minRunMs / 60000} minutes.`] },
    achievements: { name: 'Achievements', art: 'hall', icon: 'uniq/goblin_crown', blurb: 'A trophy for every deed, with a reward that lasts forever.',
        points: [`Every medal has its own reward, and each one also adds +${pc(ACHIEVEMENT_GLOBAL_BONUS)} attack, defence and skill speed.`, 'Pets and unique items you find are kept here too.'] },
    dungeons: { name: 'Dungeons', art: 'dungeon', icon: 'mon/Skeleton', blurb: 'Elite monsters, a chest at the end and pieces of unique gear.',
        points: [`A row of elites, then a boss with a ${secs(DUNGEON_BOSS_TIME_MS)} second timer, fought with the gear you walk in with.`, 'Dying, leaving or running out of time loses the run.', `Every clear opens a chest with a fragment: ${FRAGMENTS_PER_UNIQUE} fragments make the dungeon's unique item.`, 'Clear counts unlock permanent bonuses.'] },
    titan: { name: 'The Titan', art: 'titan', icon: 'titan/0', blurb: `Once an hour: a ${secs(TITAN_TIME_MS)} second damage race.`,
        points: ['Deal as much damage as you can before the time runs out. Clicking helps.', `Each Titan you bring down is gone for good and leaves +${pc(TITAN_BONUS.atkMult)} attack and health.`] },
    events: { name: 'Events', art: 'festival', icon: 'res/starfruit', blurb: 'A festival every weekend, with its own tokens and shop.',
        points: ['One event runs each weekend, Friday to Monday (UTC), and brings its own bonuses.', `Every ${EVENT_ACTIONS_PER_TOKEN} actions or kills earn a Festival Token, up to ${EVENT_DAILY_CAP} a day.`, 'Tokens keep between events. The event shop opens while one runs.'] },
    clan: { name: 'Clan', art: 'clanhall', icon: 'item/Shield/4', blurb: 'Join a clan and fight a weekly boss together.',
        points: ['Each week the clan fights one shared boss. Every member gets three attacks a day.', 'An attack deals what your saved hero would deal in 60 seconds, worked out on the server from your cloud save.', 'Everyone who fought is rewarded with essence and diamonds, with more for the top three and the last hit.'] },
    settings: { name: 'Settings', icon: '⚙️', blurb: 'Saves, sound and motion.', points: [] },
    camp: { name: 'Camp', art: 'camp', icon: 'mon/Magma Slime', blurb: 'Upgrades for this run, bought with gold.',
        points: ['The whetstone, the armour rack and the hearth multiply your attack, defence and health.', 'The camp is packed up when you prestige, so every run is a climb.'] },
    mastery: { name: 'Mastery', art: 'caves', icon: 'res/diamond', blurb: 'Every action gets better the more you do it.',
        points: [`Each mastery level adds +${pc(MASTERY_PER_LEVEL.speed, 1)} speed to that action.`, `Gathering and cooking also gain +${pc(MASTERY_PER_LEVEL.double, 2)} chance of a double; recipes gain +${pc(MASTERY_PER_LEVEL.preserve, 1)} chance to keep the ingredients.`, 'Mastery is permanent.'] },
    minigames: { name: 'A chance to play', art: 'forest', icon: 'res/topaz', blurb: 'Every few minutes of work, a short game appears.',
        points: [`Win it for +${pc(BALANCE.minigame.baseBonus)} to +${pc(BALANCE.minigame.maxBonus)} speed in that skill for ${secs(BALANCE.minigame.boostMs)} seconds.`, 'A streak of wins raises the bonus. Skipping costs nothing.'] }
};

// The 'prestige' unlock has no tab of its own: it lives in the Shop.
export const FEATURE_TAB = { prestige: 'shop', titan: 'dungeons', camp: 'combat', mastery: null, minigames: null };

export const feature = id => FEATURES[id] || { name: id.charAt(0).toUpperCase() + id.slice(1), icon: '🔓', blurb: '', points: [] };
export const artUrl = id => (FEATURES[id]?.art ? `assets/paint/${FEATURES[id].art}.webp` : '');

/** The inline style that puts a feature's painting behind an element (as --art, with its focus). */
export function artStyle(id) {
    const f = FEATURES[id];
    return f?.art ? `--art:url(${artUrl(id)});--art-at:${f.focus || 'center 70%'}` : '';
}

/** The About card: the painting, the name, one line, and the rules in a few short points. */
export function renderAboutCard(id, { button = 'Got it' } = {}) {
    const f = feature(id);
    return `<div class="modal-content narrow about-card">
        ${f.art ? `<div class="about-art" style="${artStyle(id)}" aria-hidden="true"></div>` : ''}
        <div class="modal-header">${esc(f.name)}</div>
        ${f.blurb ? `<p class="about-blurb">${esc(f.blurb)}</p>` : ''}
        ${f.points?.length ? `<ul class="about-points">${f.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
        <div class="modal-footer"><button class="modal-btn btn-confirm" onclick="FI.closeModal()">${esc(button)}</button></div>
    </div>`;
}

/** The small "?" that opens a feature's About card. */
export function aboutButton(id) {
    return `<button class="about-btn" onclick="event.stopPropagation(); FI.about('${id}')" aria-label="About ${esc(feature(id).name)}" title="How it works">?</button>`;
}
