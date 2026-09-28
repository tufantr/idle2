// Prestige: convert this run's best stage into permanent tokens and skill points.

import { tokensForStage, prestigeStartStage, skillPointsForStages, BALANCE } from '../core/formulas.js';
import { PERKS } from '../data/perks.js';
import { spawnEnemy, leaveCombat } from './combat.js';
import { resetCamp } from './camp.js';
import { log, bumpStat } from './progress.js';

export function canPrestige(state) {
    return state.combat.maxStage >= BALANCE.prestige.minStage;
}

export function prestigePreview(game) {
    const state = game.state;
    const tokens = tokensForStage(state.combat.maxStage, game.derived.tokenMult);
    const sp = BALANCE.prestige.spPerPrestige + skillPointsForStages(state.combat.bestStage, state.prestige.spClaimedStage);
    return {
        allowed: canPrestige(state),
        tokens,
        skillPoints: sp,
        startStage: prestigeStartStage(state.combat.bestStage),
        tokensAfter: state.prestige.tokens + tokens,
        nextZoneTokens: tokensForStage(Math.ceil((state.combat.maxStage + 1) / 10) * 10, game.derived.tokenMult)
    };
}

export function doPrestige(game) {
    const state = game.state;
    if (!canPrestige(state)) return false;
    const preview = prestigePreview(game);
    leaveCombat(game);
    state.prestige.tokens += preview.tokens;
    state.prestige.skillPoints += preview.skillPoints;
    state.prestige.spClaimedStage = Math.max(state.prestige.spClaimedStage, state.combat.bestStage);
    state.prestige.count += 1;
    bumpStat(game, 'prestiges');
    state.combat.stage = preview.startStage;
    state.combat.maxStage = preview.startStage;
    state.combat.combo = 0;
    state.gold = 0;          // combat gold is run-scoped, like the camp it buys
    resetCamp(state);
    game.recompute();
    state.combat.hp = game.derived.maxHp;
    spawnEnemy(game);
    log(game, `✨ Prestige ${state.prestige.count}: +${preview.tokens} tokens, +${preview.skillPoints} skill points. Starting at stage ${preview.startStage}.`, 'prestige');
    game.emit({ type: 'prestige', ...preview });
    game.markDirty();
    return true;
}

export function buyPerk(game, perkId) {
    const state = game.state;
    const perk = PERKS.find(p => p.id === perkId);
    if (!perk) return false;
    if (state.prestige.skillPoints < 1) { game.emit({ type: 'error', text: 'No skill points. Prestige to earn more.' }); return false; }
    if ((state.perks[perkId] || 0) >= perk.max) { game.emit({ type: 'error', text: `${perk.name} is maxed out.` }); return false; }
    state.prestige.skillPoints -= 1;
    state.perks[perkId] = (state.perks[perkId] || 0) + 1;
    game.markDirty();
    return true;
}
