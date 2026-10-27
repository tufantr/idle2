// The War Tree (data/talents.js): talent points from Combat's levels past 99, learned a rank at a time, unlearned all
// together for essence. The talents themselves are read where they bite (core/modifiers.js for their stats,
// systems/combat.js for their rules); this module says what a hero has and changes it.

import { TALENTS, TALENT_POINTS_MAX, talentById, treeById, talentRank, talentPointsSpent, talentBlock, respecPrice } from '../data/talents.js';
import { combatLevelForXp, MAX_LEVEL } from '../core/xp.js';
import { log } from './progress.js';

export { talentRank, talentPointsSpent, respecPrice };

// (kept in `meta.talents` too, as the forge's levels are: core/state.js; a page running the older game drops `talents`)
const mirror = state => { state.meta.talents = { ranks: { ...state.talents.ranks }, respecs: state.talents.respecs || 0 }; };

/** Combat's levels past 99: the talent points earned (0 below 100). */
export const warLevel = state => Math.max(0, Math.min(TALENT_POINTS_MAX, combatLevelForXp(state.skills?.combat?.xp || 0) - MAX_LEVEL));

/** Talent points earned and not yet spent. */
export const talentPoints = state => Math.max(0, warLevel(state) - talentPointsSpent(state));

/** The War Tree is open once Combat passes level 99 (the disclosure `talents`). */
export const talentsOpen = state => warLevel(state) > 0 || !!state.settings?.devUnlockAll;

/** Why a talent can't take a rank now (data/talents.js talentBlock), or null. */
export const learnBlock = (state, id) => {
    const t = talentById(id);
    return t ? talentBlock(state, t, talentPoints(state)) : 'unknown';
};

const BLOCKED = {
    full: 'That talent is full.',
    points: 'No talent points left: each combat level past 99 brings one.',
    row: 'That row opens with more points in its tree.',
    needs: 'Fill the talent its arrow comes from first.'
};

/** Learn one rank of a talent. True if learned. */
export function learnTalent(game, id) {
    const state = game.state;
    const t = talentById(id);
    if (!t || !talentsOpen(state)) return false;
    const block = talentBlock(state, t, talentPoints(state));
    if (block) { game.emit({ type: 'error', text: BLOCKED[block] }); return false; }
    state.talents.ranks[id] = talentRank(state, id) + 1;
    mirror(state);
    const rank = state.talents.ranks[id];
    game.recompute();
    game.emit({ type: 'talent', id, rank, max: t.max });
    if (rank === t.max && t.row === 7) log(game, `⚔️ ${t.name}: the ${treeById(t.tree).name}'s capstone.`, 'achievement');
    game.markDirty();
    return true;
}

/** Unlearn every talent, all points back, for essence (more each time: data/talents.js RESPEC). True if done. */
export function unlearnTalents(game) {
    const state = game.state;
    if (!talentPointsSpent(state)) return false;
    const price = respecPrice(state);
    if ((state.resources.essence || 0) < price) { game.emit({ type: 'error', text: `Unlearning the War Tree costs ${price.toLocaleString('en-US')} essence.` }); return false; }
    state.resources.essence -= price;
    state.talents.ranks = {};
    state.talents.respecs = (state.talents.respecs || 0) + 1;
    mirror(state);
    game.recompute();
    log(game, `⚔️ The War Tree unlearned for ${price.toLocaleString('en-US')} essence: every point back.`, 'info');
    game.emit({ type: 'talentsReset', price });
    game.markDirty();
    return true;
}

/** Every talent with its rank and what stands in its way: what the War Tree lays out. */
export function talentBoard(state) {
    const points = talentPoints(state);
    return TALENTS.map(t => ({ talent: t, rank: talentRank(state, t.id), block: talentBlock(state, t, points) }));
}
