// Rewards from the server: the clan boss's, and gifts from the owner (kind 'gift', README "The API").
// The server decides what a reward is; the game only adds it to the save and says so.

import { log, bumpStat } from './progress.js';

/** A whole, positive amount from the server, or 0. */
const amount = value => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Apply one claimed reward ({ gold, essence, diamond, text }). Gold from a gift is this run's, like all
 * gold, and is not counted as earned (the Capitalist medal is for gold won). Returns a short description.
 */
export function applyReward(game, reward) {
    const state = game.state;
    const gift = reward.kind === 'gift';
    const parts = [];
    const gold = amount(reward.gold);
    const essence = amount(reward.essence);
    const diamonds = amount(reward.diamond);
    if (gold) { state.gold += gold; parts.push(`+${gold.toLocaleString('en-US')} gold`); }
    if (essence) { state.resources.essence += essence; parts.push(`+${essence} essence`); }
    if (diamonds) { state.resources.diamond += diamonds; parts.push(`+${diamonds} Diamond${diamonds > 1 ? 's' : ''}`); }
    if (reward.kind === 'lastHit') bumpStat(game, 'clanLastHits');
    if (!gift) bumpStat(game, 'clanRewards');
    const text = `${reward.text || (gift ? 'A gift' : 'Clan reward')}: ${parts.join(', ') || 'nothing'}`;
    log(game, `${gift ? '🎁' : '🛡️'} ${text}.`, 'achievement');
    game.markDirty();
    return text;
}
