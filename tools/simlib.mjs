// The pieces of tools/simulate.mjs that need no run of their own, so tests can import them (the simulator plays a whole
// game on import): the bot's rule for the Titan.

import { TITAN_TIME_MS } from '../src/data/dungeons.js';
import { fightPreview, titanEnemy } from '../src/systems/dungeon.js';

// ---------- the Titan ----------

/**
 * The dungeons tab's badge (src/ui/render.js readyBadge): the game's own preview has the Titan fall within the fight's
 * minute, and before the hero would. The bot fights a banked Titan only then (research-loop 040 §2).
 */
export function titanBeatable(game) {
    const f = fightPreview(game.derived, titanEnemy(game.state));
    return f.killSeconds <= Math.min(TITAN_TIME_MS / 1000, f.surviveSeconds);
}
