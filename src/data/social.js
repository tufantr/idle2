// Social settings the owner may fill in. An empty Discord invite hides the link.
import { ZONES } from './zones.js';

// The game's Discord (the owner's, made for the beta, 22 October 2026): feedback of any kind, bug reports, the clans'
// talk. Shown on the Clan tab, in Settings and on the wiki's front page. It never expires and opens on #general.
export const DISCORD_INVITE = 'https://discord.gg/Pxa2bHYcDg';
export const CLAN_POLL_MS = 60 * 1000; // the Clan tab refreshes at most once a minute, and only while open and in view

// Clan attacks (api/index.js): three a day, and those not used wait, up to six. An attack is a fight of
// CLAN_ATTACK_SECONDS against the week's clan boss (systems/clanfight.js); the boss's health is sized
// from what members deal in it without a strike. The boss drops its guard for `open` ms every `every`
// ms from `first`: only then do strikes land (`mult` times a strike in a fight) and build the combo; at
// other times they glance off its guard. So clicking fast in the openings is all an auto-clicker can do
// too: at most about 1.5 times a hero who only watches (test/clanfight.test.mjs), as with strikes in
// any fight (BALANCE.combat).
export const CLAN_ATTACKS_PER_DAY = 3;
export const CLAN_ATTACK_BANK = 6;
export const CLAN_ATTACK_SECONDS = 30;
export const CLAN_FIGHT_MS = CLAN_ATTACK_SECONDS * 1000;
export const CLAN_GUARD = { first: 4000, every: 6000, open: 2000, mult: 2.5 };

// The clan banner (the owner, October 2026: clearing the clan's bosses should make its members stronger, and
// every member, fought or not, so a clan sees to it that its members fight; DESIGN §3.18): each level of the
// week's boss the clan fells raises it, for everyone in the clan, until the week ends (Monday 00:00 UTC), and a
// new week starts it again from nothing. The first kill is the big step, so every clan wants one a week. It
// multiplies attack, defence and health (core/modifiers.js); the boards and the clan boss leave it out.
export const CLAN_BANNER = [1, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

// The boss counted in the clan's attacks (api/index.js): level 1 takes `first` attacks of an average member (a
// whole 30-s fight without a strike or a potion, at clan power 1: CLAN_POWER), each level `growth` times the last,
// `levels` a week at most (one a day). Striking and a combat potion make an attack worth up to six plain ones, so
// twenty members who use every attack fell all seven even if they only watch, two who strike with a strong potion
// five or six, and a player alone one to four (DESIGN §3.18). It was each member's own twelve attacks, twice as many
// each level: a clan of one kept pace with a full one, and level 7 was out of everyone's reach. Level 1 was 30 until
// 26 October 2026, while an attack also counted how much the hero had grown since the day began (its damage over the
// members' average, sized at the day's first look): the active clans felled six levels a week, and 20 keeps that pace.
export const CLAN_BOSS = { first: 20, growth: 1.2, levels: 7 };
// A member's clan power (the owner, October 2026: heroes orders of magnitude apart, and only the strongest member's
// attacks moved the boss): an attack counts by how far the hero has climbed, not by its raw damage. It is the square
// root of the hero's best stage over the clan's (their geometric mean), held between CLAN_POWER.min and .max, and
// scaled so the members average exactly one: an average member's attack is one of the boss's attacks, so a clan whose
// members all fight fells it as fast whoever is strong (tools/clanpower.mjs checks it on random clans). A hero four times as deep counts twice
// as much, sixteen times as deep (or more) four times; the shallowest still counts a quarter of the deepest. How the
// fight went (strikes in the openings, the potion) multiplies it as it always did (api/index.js).
export const CLAN_POWER = { min: 0.5, max: 2 };
const rawPower = (stage, reference) => Math.max(CLAN_POWER.min, Math.min(CLAN_POWER.max, Math.sqrt(Math.max(1, stage) / reference)));
/** The clan power of a hero at best stage `stage` among members at `stages` (those who count): 1 for an average member. */
export function clanPowerOf(stage, stages) {
    const list = (stages || []).map(Number).filter(x => Number.isFinite(x) && x >= 1);
    if (!list.length) return 1;
    const reference = Math.exp(list.reduce((sum, x) => sum + Math.log(x), 0) / list.length);
    const mean = list.reduce((sum, x) => sum + rawPower(x, reference), 0) / list.length;
    return rawPower(Number(stage) || 1, reference) / mean;
}

/** A level's health in thousandths of the clan's average plain attack (the server keeps it so, a whole number). */
export const clanBossHealth = level => Math.round(1000 * CLAN_BOSS.first * Math.pow(CLAN_BOSS.growth, Math.max(1, level) - 1));

// The week's clan ranking (the owner, October 2026; DESIGN §3.18). Clans are put in divisions by the levels of the
// week's boss they felled, and ranked inside each by the Endless Hydra: an eighth boss whose heads grow back, so its
// health never ends, awake for every clan at the weekend (Saturday 00:00 UTC, `opensOnDay` days into the ISO week,
// to the Monday reset). Each member who was in the clan when the week began has `attacks` fights at it and the best
// counts, as depth: how many levels deep the hit reaches into a stack of levels each a fifth tougher than the last
// (`growth`), the first as tough as a new hero's whole fight (`base`). So a hero a thousand times stronger goes about
// 38 levels deeper, not a thousand times as far, and the whole clan counts: its score is its best `counted` members'
// depths together. The top three of each division wear a crown through the next week.
export const ENDLESS = { name: 'The Endless Hydra', look: 'Abyssal Hydra', zone: 'abyss', base: 100, growth: 1.2, attacks: 2, counted: 15, opensOnDay: 5 };
export const CLAN_DIVISIONS = [
    { id: 'champion', name: 'Champion', min: 7 },
    { id: 'gold', name: 'Gold', min: 5 },
    { id: 'silver', name: 'Silver', min: 3 },
    { id: 'bronze', name: 'Bronze', min: 0 }
];
/** The division of a clan that felled `kills` levels of the week's boss. */
export const divisionOf = kills => CLAN_DIVISIONS.find(d => (Number(kills) || 0) >= d.min) || CLAN_DIVISIONS[CLAN_DIVISIONS.length - 1];
/** The damage it takes to reach `depth` into the Endless Hydra: its first `depth` levels together. */
export const endlessDamageAt = depth => ENDLESS.base * (Math.pow(ENDLESS.growth, Math.max(0, depth)) - 1) / (ENDLESS.growth - 1);
/** A clan's depth from its members' deepest fights: the best ENDLESS.counted of them together (to a tenth), and how many counted. */
export function clanDepthScore(depths) {
    const counted = (depths || []).filter(d => Number.isFinite(d) && d > 0).sort((a, b) => b - a).slice(0, ENDLESS.counted);
    return { score: Math.round(counted.reduce((sum, d) => sum + d, 0) * 10) / 10, counted: counted.length };
}
/** How deep a hit of `damage` reaches into the Endless Hydra: its whole levels and the share of the next (1 = its first level). */
export function endlessDepth(damage) {
    const d = Number(damage);
    if (!(d > 0) || !Number.isFinite(d)) return 0;
    return Math.log(1 + d * (ENDLESS.growth - 1) / ENDLESS.base) / Math.log(ENDLESS.growth);
}

/** The ISO-8601 week of a moment in UTC ('2026-W42'), as the server counts the clan's weeks. */
export function isoWeek(ms) {
    const d = new Date(ms);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;   // Monday 0
    date.setUTCDate(date.getUTCDate() - dayNum + 3);   // the week's Thursday
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * The week's clan boss: the ten lands' rulers in turn, one a week (ISO weeks, as the server counts
 * them, '2026-W41'), each fought on its own land's painting. The name is its look; the server keeps
 * only the boss's health.
 */
export function clanBossFor(week) {
    const n = Number(String(week || '').split('-W')[1]) || 0;
    const zone = ZONES[n % ZONES.length];
    return { name: zone.boss, zone: zone.id, zoneName: zone.name };
}
