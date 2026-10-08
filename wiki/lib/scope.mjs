// What a {{ expression }} in a written page (wiki/content/*.md) can use: the game's numbers, straight from
// its modules, and the wiki's helpers. A page that says {{BALANCE.combat.bossTimeMs / 1000}} seconds stays
// right when the game changes; a mistyped name stops the build (wiki/build.mjs) with the file it is in.
//
// The names, for writers:
//   BALANCE, enemyForStage(stage), enemyBaseStats(stage), tokensForStage(stage), goldForKill(enemy),
//   combatXpForKill(enemy, xpMult, level), prestigeStartStage(best), skillPointsForStages(best, claimed),
//   goldPerKillAtStage(stage)                                 core/formulas.js
//   BASE, MAX_MITIGATION                                      core/modifiers.js, core/formulas.js
//   xpForLevel(level), MAX_LEVEL                              core/xp.js
//   SKILLS, RESOURCES, ZONES, STRATA, DUNGEONS, UNIQUES, PERKS, GOLD_SHOP, PETS, ACHIEVEMENTS, CAPES, RANKS,
//   TRIALS, EVENTS, EVENT_MILESTONES, EVENT_SHOP, CROPS, FARMING_PLOTS, AGILITY_SLOTS, CAMP_UPGRADES, LOOKS,
//   METALS, SMELTING_RECIPES, TOOLS, GEM_TIERS, JEWEL_BARS, GEAR_TIERS, RARITIES, AFFIXES, TIER_WEAR_LEVEL,
//   PLACE_GAPS_MS, UNLOCKS, and every other constant those data files export (by its own name)
//   fmt(n), pct(x, digits), time(ms), res(id, { qty }), icon(key, scale), link(href, text, iconKey),
//   table(head, rows), callout(kind, html), path.item(id) and the other path helpers   wiki/lib/ui.mjs

import * as formulas from '../../src/core/formulas.js';
import * as modifiers from '../../src/core/modifiers.js';
import * as xp from '../../src/core/xp.js';
import * as resources from '../../src/data/resources.js';
import * as skills from '../../src/data/skills.js';
import * as workshop from '../../src/data/workshop.js';
import * as items from '../../src/data/items.js';
import * as zones from '../../src/data/zones.js';
import * as strata from '../../src/data/strata.js';
import * as dungeons from '../../src/data/dungeons.js';
import * as perks from '../../src/data/perks.js';
import * as pets from '../../src/data/pets.js';
import * as achievements from '../../src/data/achievements.js';
import * as capes from '../../src/data/capes.js';
import * as ranks from '../../src/data/ranks.js';
import * as trials from '../../src/data/trials.js';
import * as ascension from '../../src/data/ascension.js';
import * as events from '../../src/data/events.js';
import * as farming from '../../src/data/farming.js';
import * as agility from '../../src/data/agility.js';
import * as camp from '../../src/data/camp.js';
import * as looks from '../../src/data/looks.js';
import * as mastery from '../../src/data/mastery.js';
import * as bestiary from '../../src/data/bestiary.js';
import * as unlocks from '../../src/data/unlocks.js';
import * as pace from '../../src/data/pace.js';
import * as daily from '../../src/systems/daily.js';
import * as ui from './ui.mjs';

// later modules win a clash of names, so the data files' own names come last
export const scope = Object.freeze({
    ...ui, ...xp, ...formulas, ...modifiers, ...pace, ...resources, ...skills, ...workshop, ...items, ...zones, ...strata,
    ...dungeons, ...perks, ...pets, ...achievements, ...capes, ...ranks, ...trials, ...ascension, ...events,
    ...farming, ...agility, ...camp, ...looks, ...mastery, ...bestiary, ...unlocks, ...daily,
    // two names clash (bestiary's and ascension's starsFor): both kept, by what they count
    bestiaryStarsFor: bestiary.starsFor, ascensionStarsFor: ascension.starsFor, starsFor: undefined
});

const names = Object.keys(scope).filter(k => /^[A-Za-z_$][\w$]*$/.test(k));
const values = names.map(k => scope[k]);

/** Evaluate a {{ }} expression; a failure names the file and the expression. */
export function evaluate(expr, where) {
    try {
        const value = new Function(...names, `"use strict"; return (${expr});`)(...values);
        if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) throw new Error(`gives ${value}`);
        return typeof value === 'number' ? ui.fmt(value) : value;
    } catch (err) {
        throw new Error(`${where}: {{ ${expr} }}: ${err.message}`);
    }
}
