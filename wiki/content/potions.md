---
path: /potions
keywords: potion, potions, alchemy, brew, brewing, dose, fight potion, work potion, accuracy potion, defense potion, evasion potion, health potion, fortune draught, gatherer's draught, scholar's tonic, alchemist
aliases: Brewing, Work potions, Fight potions
---
A potion makes your hero stronger for a while. **Fight potions** work while he fights: more attack, defence, health or gold and drops, or a chance to dodge. **Work potions** work while he works at a skill: faster work, or more XP. Potions are brewed in [[Alchemy]], and one of each kind works at a time.

## Choosing a potion

- **A fight potion** is picked in the Potion row under the fight, on the Combat tab or in the fight's dock. It appears once Alchemy is open or you carry a potion.
- **A work potion** is picked in the Work potion row on a skill's tab. It appears once you carry one.

**None** turns a row off. Picking another potion throws away what is left of the bottle at work.

## A bottle lasts {{POTION_MINUTES}} minutes

- Your hero drinks a bottle as the work starts: a fight potion as he fights, a work potion as he works. A bottle lasts {{POTION_MINUTES}} minutes of that work, and its clock stops while he does something else: a fight potion keeps while he rests or works, a work potion while he fights.
- When a bottle runs out he drinks the next at once, so while you have bottles no moment goes without one. The row shows how long is left.
- Potions work the same way in [[Dungeons|dungeon runs]], against [[The Titan]] and while you are away. None works against the clan boss.

## Stronger with Alchemy

A potion's effect grows with your Alchemy level: from what it gives at the level it is brewed at to its most at level 99 (the table below). A fight potion multiplies what it raises, after every other bonus: an Accuracy Potion's ×{{(1 + POTIONS.accuracy_potion.base).toFixed(2)}} turns 1,000 attack into {{fmt(Math.round(1000 * (1 + POTIONS.accuracy_potion.base)))}}. A work potion's speed multiplies too, on top of a [[Mini-games and Focus|mini-game's]] boost; its XP is the skill's only.

> Tip: the Evasion Potion's dodge counts toward the dodge cap of {{pct(BASE.caps.dodge, 0)}} (see [[Combat]]), so it is worth less to a hero who already dodges a lot.

## The Alchemist medal

Reaching Alchemy {{achievementById('alchemist').req.level}} earns the {{achievementById('alchemist').name}} medal: every bottle lasts {{pct(achievementById('alchemist').mods.potionDuration, 0)}} longer, {{POTION_MINUTES * (1 + achievementById('alchemist').mods.potionDuration)}} minutes instead of {{POTION_MINUTES}} (see [[Medals]]).

## Brewing potions

In Alchemy you forage herbs, then brew each herb with a second ingredient into a potion: {{SKILLS.alchemy.nodes.filter(n => POTIONS[n.produces]).map(n => res(n.produces)).join(', ')}}. Each new potion opens at a higher Alchemy level, and each brew takes its herbs and its second ingredient (the table below).

Herbs come from Alchemy's own foraging, from the farm ([[Farming]]) and from the fight, where some lands drop them. The [[Shop]]'s {{GOLD_SHOP.find(e => e.gives.guam_leaf).name}} holds {{GOLD_SHOP.find(e => e.gives.guam_leaf).gives.guam_leaf}} {{res('guam_leaf')}}, the first herb.
