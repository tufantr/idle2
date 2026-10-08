---
path: /potions
keywords: potion, potions, alchemy, brew, brewing, charges, accuracy potion, defense potion, evasion potion, health potion, alchemist
aliases: Potion charges, Brewing
---
A potion gives your hero a bonus in the fight: more attack, defence, dodge or health (the table below). Potions are brewed in [[Alchemy]], and one works at a time.

## Choosing a potion

Pick a potion in the Potion row on the Combat tab or in the fight's dock. The row shows the potions you carry, and **None** turns them off. It appears once Alchemy is open or you carry a potion.

## Charges, counted in attacks

- Your hero drinks a bottle as he attacks, when no potion is working. A bottle lasts {{BASE.basePotionCharges}} of his own attacks, and its bonus counts only while charges are left. The row shows how many attacks are left.
- When the last charge goes he drinks the next bottle at once, so while you have bottles no attack goes without one.
- Charges count attacks, not time: a faster hero gets through his bottles faster. Your strikes do not use charges.
- Picking another potion, or None, throws away what is left of the bottle at work.
- Potions work the same way in [[Dungeons|dungeon runs]], against [[The Titan]] and while you are away.

> Tip: the Evasion Potion's dodge counts toward the dodge cap of {{pct(BASE.caps.dodge, 0)}} (see [[Combat]]), so it is worth less to a hero who already dodges a lot.

## The Alchemist medal

Reaching Alchemy {{achievementById('alchemist').req.level}} earns the {{achievementById('alchemist').name}} medal: every bottle lasts {{pct(achievementById('alchemist').mods.potionCharges, 0)}} longer, {{Math.round(BASE.basePotionCharges * (1 + achievementById('alchemist').mods.potionCharges))}} attacks instead of {{BASE.basePotionCharges}} (see [[Medals]]).

## Brewing potions

In Alchemy you forage herbs, then brew each herb with a second ingredient into a potion: {{orderedByTier('potion').map(r => res(r.id)).join(', ')}}. Each new potion opens at a higher Alchemy level, and each brew takes one herb and one of its second ingredient (the table below).

Herbs come from Alchemy's own foraging, from the farm ([[Farming]]) and from the fight, where some lands drop them. The [[Shop]]'s {{GOLD_SHOP.find(e => e.gives.guam_leaf).name}} holds {{GOLD_SHOP.find(e => e.gives.guam_leaf).gives.guam_leaf}} {{res('guam_leaf')}}, the first herb.
