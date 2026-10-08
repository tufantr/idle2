---
path: /skills/farming
keywords: farming, farm, plots, seeds, crops, herbs, harvest, replant, hoe, grow
---
Farming is the one skill that runs alongside everything else: plots grow on the clock while your hero fights, gathers or crafts, and while you are away. It opens soon after your first {{[...Array(100).keys()].find(n => UNLOCKS.find(u => u.id === 'farming').requires({ stats: { actionsBySkill: { alchemy: n } }, skills: { cooking: { xp: 0 } } }))}} [[/skills/alchemy|Alchemy]] actions, or when [[/skills/cooking|Cooking]] reaches level {{[...Array(MAX_LEVEL).keys()].map(i => i + 1).find(l => UNLOCKS.find(u => u.id === 'farming').requires({ stats: { actionsBySkill: { alchemy: 0 } }, skills: { cooking: { xp: xpForLevel(l) } } }))}}, whichever comes first.

## What it is for

- **Crops for [[/skills/cooking|Cooking]]:** [[Potato|potatoes]], [[Cabbage|cabbages]], [[Pumpkin|pumpkins]] and [[Starfruit|starfruit]] cook into dishes of their own.
- **Herbs for [[/skills/alchemy|Alchemy]]:** every herb that brews into a potion, a handful at each harvest.

## How it works

- **Plots** open with your Farming level, up to {{FARMING_PLOTS.length}} (the list below).
- **Planting:** pick a seed, then tap an empty plot. Seeds are bought with gold as you plant, at a fixed price for each crop.
- **Growing:** a crop takes its time on the clock, faster with Farming speed: a [[Tools|hoe]] (forged in [[/skills/smithing|Smithing]]), the farming [[Pets|pet]], [[Medals|medals]] and some [[/skills/agility|agility obstacles]]. The speed counts when you plant, so a better hoe helps the next planting. [[Mini-games and Focus|Focus]] does not apply to Farming.
- **Harvesting:** tap a ready plot. A harvest gives a handful of crops, more with yield bonuses, and the hoe gives a chance to double it. Farming XP is paid for every crop harvested, so a bigger harvest is more XP too. One button harvests every ready plot and plants the same crops again, and another plants every empty plot at once.

There is no mastery in Farming, and no mini-game. Plots and what grows in them are kept through a [[Prestige|prestige]].

## Training tips

- **Plant before you prestige.** A prestige takes your gold, but not your plots: spare gold spent on seeds is never wasted.
- **Plant, then forget.** Crops wait in the plot once they are ready, and the Farming tab shows how many are.
- **Grow what you need.** Herbs keep Alchemy brewing; the later crops make the kitchen's best farm dishes.
- **Raise the yield.** The medal {{ACHIEVEMENTS.find(a => a.id === 'green_thumb').name}} (Farming {{ACHIEVEMENTS.find(a => a.id === 'green_thumb').req.level}}), the Mud Pit obstacle, the [[/capes|Farming cape]] and the {{EVENTS.find(e => e.id === 'harvest_festival').name}} [[Weekend events|weekend event]] all add crops to every harvest.
