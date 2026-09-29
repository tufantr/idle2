// Rewards from the social layer (clan boss). The server decides what a reward is; the game only adds
// it to the save and says so.

import { log, bumpStat } from './progress.js';

/** Apply one claimed reward ({ essence, diamond, text }). Returns a short description. */
export function applyReward(game, reward) {
    const state = game.state;
    const parts = [];
    const essence = Math.max(0, Math.floor(Number(reward.essence) || 0));
    const diamonds = Math.max(0, Math.floor(Number(reward.diamond) || 0));
    if (essence) { state.resources.essence += essence; parts.push(`+${essence} essence`); }
    if (diamonds) { state.resources.diamond += diamonds; parts.push(`+${diamonds} Diamond${diamonds > 1 ? 's' : ''}`); }
    if (reward.kind === 'lastHit') bumpStat(game, 'clanLastHits');
    bumpStat(game, 'clanRewards');
    const text = `${reward.text || 'Clan reward'}: ${parts.join(', ') || 'nothing'}`;
    log(game, `🛡️ ${text}.`, 'achievement');
    game.markDirty();
    return text;
}
