// The clan boss fight (DESIGN §3.18): a clan attack is a short fight on screen against the week's clan
// boss, in the battle scene like the Titan's. The hero attacks by himself; strikes land only while the
// boss's guard is down (core/power.js CLAN_GUARD). The boss doesn't hit back. The game shows the fight
// and keeps what the player did (the strike times); the server reckons the damage from the stored save
// and those times (core/power.js clanAttackFromSave), so the page never says how much was dealt.

import { clanGuardDown } from '../core/power.js';
import { clanBossFor, CLAN_FIGHT_MS, CLAN_BANNER } from '../data/social.js';
import { spawnEnemy, enterCombat } from './combat.js';
import { failDungeon, returnToStages } from './dungeon.js';
import { doingNow, resumeDoing } from './resume.js';
import { log } from './progress.js';

const MAX_STRIKES = Math.ceil(CLAN_FIGHT_MS / 250) + 1;   // one a strikeGapMs at most (BALANCE.combat)

/** How far into the clan fight it is, in ms (0 outside one). */
export function clanFightElapsed(state) {
    const c = state.combat;
    if (c.mode !== 'clan') return 0;
    return Math.max(0, Math.min(CLAN_FIGHT_MS, CLAN_FIGHT_MS - (c.bossTimeLeft || 0)));
}

/** Is the clan boss's guard down now? Strikes land only then. */
export function clanGuardOpen(state) {
    return state.combat.mode === 'clan' && clanGuardDown(clanFightElapsed(state));
}

/** The week's clan boss as a monster: its look from the week, its health the clan's shared boss's. */
export function clanBossEnemy(state) {
    const fight = state.clanFight;
    const look = clanBossFor(fight?.week);
    const hp = Math.max(1, Math.floor(Number(fight?.hp) || 1));
    const maxHp = Math.max(hp, Math.floor(Number(fight?.maxHp) || hp));
    return {
        name: look.name, baseName: look.name, icon: '🛡️', zoneName: 'Clan boss', zoneTier: 7, stage: Math.max(1, state.combat.bestStage),
        boss: true, clan: true, hp, maxHp, atk: 0, interval: CLAN_FIGHT_MS * 1000, timeLimit: CLAN_FIGHT_MS
    };
}

/**
 * Begin a clan attack against `boss` ({ week, hp, maxHp }, the server's): the hero leaves what he is
 * doing (a dungeon run is given up) and goes back to it when the fight ends. Refused while another
 * special fight is on, or while the last attack's result waits to be sent.
 */
export function startClanFight(game, boss) {
    const state = game.state;
    const c = state.combat;
    if (c.mode === 'clan') return false;
    if (c.mode === 'titan') { game.emit({ type: 'error', text: 'Finish the Titan fight first.' }); return false; }
    if (state.clanResult) { game.emit({ type: 'error', text: 'Your last attack is still on its way to the clan.' }); return false; }
    if (!boss || !(Number(boss.hp) > 0)) { game.emit({ type: 'error', text: "This week's boss is already defeated." }); return false; }
    const before = doingNow(state);
    if (c.mode === 'dungeon') failDungeon(game, 'you left for the clan boss');
    state.clanFight = { week: String(boss.week || ''), hp: Math.floor(Number(boss.hp)), maxHp: Math.floor(Number(boss.maxHp) || Number(boss.hp)), strikes: [], before };
    c.mode = 'clan';
    c.dungeon = null;
    c.regroupLeft = 0;
    spawnEnemy(game);
    enterCombat(game);
    c.hp = game.derived.maxHp;
    c.combo = 0;
    log(game, `🛡️ The clan boss, ${c.enemy.name}: ${CLAN_FIGHT_MS / 1000} seconds. Strike when its guard drops.`, 'combat');
    game.markDirty();
    return true;
}

/** A strike in the clan fight (systems/combat.js clickAttack): its time is kept for the server. */
export function noteClanStrike(state) {
    const fight = state.clanFight;
    if (fight && fight.strikes.length < MAX_STRIKES) fight.strikes.push(Math.round(clanFightElapsed(state)));
}

/**
 * The clan fight is over: `reason` 'time' (its clock ran out), 'felled' (the boss's health ran out
 * here) or 'left' (Give up, or other work). What the player did waits in state.clanResult until the
 * game has sent it (main.js), even across a reload; the hero goes back to what he was doing. Returns
 * whether he fights on.
 *
 * A boss that falls here counts as the whole fight: the server reckons the full fight's damage and so
 * decides whether it really fell. Cutting the fight at the fall sent the time before the killing blow
 * (the clock is counted after a step's attacks), and a boss that fell to the first swing took 1 damage.
 */
export function endClanFight(game, reason = 'time') {
    const state = game.state;
    const c = state.combat;
    const fight = state.clanFight;
    const ms = reason === 'left' ? clanFightElapsed(state) : CLAN_FIGHT_MS;
    const dealt = fight && c.enemy?.clan ? Math.max(0, fight.hp - Math.max(0, c.enemy.hp)) : 0;
    if (fight) state.clanResult = { week: fight.week, strikes: fight.strikes.slice(0, MAX_STRIKES), ms: Math.round(ms), at: game.now };
    state.clanFight = null;
    returnToStages(game);
    const fightsOn = resumeDoing(game, fight?.before);
    game.emit({ type: 'clanFight', reason, dealt, strikes: fight?.strikes.length || 0 });
    game.markDirty();
    return fightsOn;
}

/** Give up the clan fight: it ends now, and what was done so far is the attack. */
export function giveUpClanFight(game) {
    const c = game.state.combat;
    if (c.mode !== 'clan' || !c.active) return false;
    endClanFight(game, 'left');
    return true;
}

/** The server has the attack (or refused it for good): nothing more to send. */
/**
 * The clan's banner as the server says it ({ week, kills }, or null outside a clan): kept in the save, so it counts
 * while away until its week ends. A rise is said once, as a card (main.js).
 */
export function setClanBanner(game, banner) {
    const state = game.state;
    const was = state.clanBanner || { week: '', kills: 0 };
    const next = banner && /^\d{4}-W\d{2}$/.test(String(banner.week)) ? { week: banner.week, kills: Math.max(0, Math.min(CLAN_BANNER.length - 1, Math.floor(Number(banner.kills) || 0))) } : { week: '', kills: 0 };
    if (next.week === was.week && next.kills === was.kills) return false;
    state.clanBanner = next;
    const rose = next.kills > 0 && (next.week !== was.week || next.kills > was.kills);
    if (rose) game.emit({ type: 'clanBanner', kills: next.kills, mult: CLAN_BANNER[next.kills], next: CLAN_BANNER[next.kills + 1] || null, week: next.week });
    game.markDirty();
    return true;
}

export function clearClanResult(game) {
    if (!game.state.clanResult) return false;
    game.state.clanResult = null;
    game.markDirty();
    return true;
}
