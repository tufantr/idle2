---
path: /skills/cooking
keywords: cooking, food, cook, dishes, fuel, logs, auto-eat, healing, kitchen
---
Cooking turns raw meat, fish and crops into food, and food keeps your hero alive in long fights. It opens soon after you {{UNLOCKS.find(u => u.id === 'cooking').task.toLowerCase()}} in [[/skills/hunting|Hunting]].

## What it is for

- **[[Food]] for the fight.** In combat your hero eats by itself whenever health falls low, picking the dish that best fills the gap. Better dishes heal more.
- **[[Roast Boar]]** also brews, with a herb, into the Health Potion in [[/skills/alchemy|Alchemy]].

Cooking takes from [[/skills/hunting|Hunting]] (meat), [[/skills/fishing|Fishing]] (fish), [[/skills/farming|Farming]] (crops) and [[/skills/woodcutting|Woodcutting]] (the fuel). Your first {{[...Array(100).keys()].find(n => UNLOCKS.find(u => u.id === 'fishing').requires({ stats: { actionsBySkill: { cooking: n } } }))}} dishes open Fishing, and reaching Cooking {{[...Array(MAX_LEVEL).keys()].map(i => i + 1).find(l => UNLOCKS.find(u => u.id === 'farming').requires({ stats: { actionsBySkill: { alchemy: 0 } }, skills: { cooking: { xp: xpForLevel(l) } } }))}} is one of the two ways to open Farming.

## How it works

Pick a dish and your hero cooks on and on until the ingredients run out, while you are away too.
- **Every dish burns a log.** The fuel is always the lowest kind of log you have, so keep plain [[Logs]] in stock: without any log at all, the cooking stops.
- **Ingredients:** one raw meat or fish per dish; the farm dishes take one [[Potato|potato]] or two of the other crops.
- **Doubles and savings:** the dish's [[Mastery|mastery]] gives a chance of two dishes for one, and a chance to keep the ingredients and the log. The [[/capes|Cooking cape]] adds to the doubles.

Cooking has no tool.

## Training tips

- **Cook what you gather.** Hunting and fishing side by side give the kitchen two kinds of food at every level, and the higher dishes give more XP each.
- **Mind the logs.** A long cooking session can burn through a stack of logs; plain logs are cheap to cut, and the [[Shop]] sells them in bundles.
- **Eat well.** At Cooking {{ACHIEVEMENTS.find(a => a.id === 'chef').req.level}}, the [[Medals|medal]] {{ACHIEVEMENTS.find(a => a.id === 'chef').name}} makes all food heal more, and the Gourmet [[Perks|perk]] adds more still.
