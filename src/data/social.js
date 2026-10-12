// Social settings the owner may fill in. An empty Discord invite hides the link.
import { ZONES } from './zones.js';

export const DISCORD_INVITE = '';
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
