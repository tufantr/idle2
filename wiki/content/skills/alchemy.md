---
path: /skills/alchemy
keywords: alchemy, potions, herbs, forage, foraging, brewing, brew, potion
---
Alchemy makes [[Potions|potions]] for the fight. It has two kinds of action: **foraging** herbs, which takes nothing, and **brewing** a herb with a second ingredient into a potion. It opens soon after you {{UNLOCKS.find(u => u.id === 'alchemy').task.toLowerCase()}} in the fight.

## What it is for

Potions make your hero stronger in combat for a while. Pick one on the [[Combat]] tab: a bottle lasts {{BASE.basePotionCharges}} of your hero's own attacks (your strikes don't use it up), and when it runs out the next bottle is opened at once, while you have any.

| Potion | Gives |
| --- | --- |
| [[Accuracy Potion]] | {{RESOURCES.accuracy_potion.desc}} |
| [[Defense Potion]] | {{RESOURCES.defense_potion.desc}} |
| [[Evasion Potion]] | {{RESOURCES.evasion_potion.desc}} |
| [[Health Potion]] | {{RESOURCES.health_potion.desc}} |

Brewing draws on other skills for its second ingredient: [[Copper Ore]] from [[/skills/mining|Mining]], [[Oak Logs]] from [[/skills/woodcutting|Woodcutting]], [[Raw Fox]] from [[/skills/hunting|Hunting]] and [[Roast Boar]] from [[/skills/cooking|Cooking]].

## How it works

Pick an action and your hero keeps at it, while you are away too: foraging goes on forever, brewing until the ingredients run out. Herbs also grow in [[/skills/farming|Farming]] plots and drop from monsters. The action's [[Mastery|mastery]] gives a chance of a double (two herbs, or two potions for one brew) and, when brewing, a chance to keep the ingredients; the [[/capes|Alchemy cape]] adds to the doubles. Alchemy has no tool.

Your first {{[...Array(100).keys()].find(n => UNLOCKS.find(u => u.id === 'farming').requires({ stats: { actionsBySkill: { alchemy: n } }, skills: { cooking: { xp: 0 } } }))}} Alchemy actions, foraging included, open Farming.

## Training tips

- **Forage, then brew.** Foraging feeds the brewing, and brewing gives far more XP an action.
- **Grow your herbs.** Once Farming is open, a plot of herbs brings in a handful at each harvest while you do something else.
- **Pick the potion for the wall.** Attack for a boss that outlasts its timer; defence, health or evasion for one that hits too hard.
- At Alchemy {{ACHIEVEMENTS.find(a => a.id === 'alchemist').req.level}}, the [[Medals|medal]] {{ACHIEVEMENTS.find(a => a.id === 'alchemist').name}} makes every potion last longer.
