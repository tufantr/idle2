---
path: /skills/alchemy
keywords: alchemy, potions, herbs, forage, foraging, brewing, brew, potion
---
Alchemy makes [[Potions|potions]]. It has two kinds of action: **foraging** herbs, which takes nothing, and **brewing** a herb with a second ingredient into a potion. It opens soon after you {{UNLOCKS.find(u => u.id === 'alchemy').task.toLowerCase()}} in the fight.

## What it is for

Potions make your hero stronger for a while. There are three kinds, each in {{TIERS.length}} tiers, and each is picked where it works: combat potions on the [[Combat]] and Clan tabs, dungeon potions on the [[Dungeons]] tab, skill potions on every skill's tab. A bottle lasts {{POTION_MINUTES}} minutes of that work, and when it runs out the next is opened at once, while you have any (see [[/potions|Potions]]).

| Potion | Gives | Tiers |
| --- | --- | --- |
| {{POTION_KINDS.combat.name}} | {{RESOURCES.combat_potion_1.desc}} | {{potionsFor('combat').map(id => res(id)).join(', ')}} |
| {{POTION_KINDS.dungeon.name}} | {{RESOURCES.dungeon_potion_1.desc}} | {{potionsFor('dungeon').map(id => res(id)).join(', ')}} |
| {{POTION_KINDS.skill.name}} | {{RESOURCES.skill_potion_1.desc}} | {{potionsFor('skill').map(id => res(id)).join(', ')}} |

Each tier is brewed from its herb and one thing from another skill: ore from [[/skills/mining|Mining]] for a combat potion, a cooked dish from [[/skills/cooking|Cooking]] for a dungeon potion, and logs from [[/skills/woodcutting|Woodcutting]] for a skill potion.

## How it works

Pick an action and your hero keeps at it, while you are away too: foraging goes on forever, brewing until the ingredients run out. Herbs also grow in [[/skills/farming|Farming]] plots and drop from monsters. The action's [[Mastery|mastery]] gives a chance of a double (two herbs, or two potions for one brew) and, when brewing, a chance to keep the ingredients; the [[/capes|Alchemy cape]] adds to the doubles. Alchemy has no tool.

Your first {{[...Array(100).keys()].find(n => UNLOCKS.find(u => u.id === 'farming').requires({ stats: { actionsBySkill: { alchemy: n } }, skills: { cooking: { xp: 0 } } }))}} Alchemy actions, foraging included, open Farming.

## Training tips

- **Forage, then brew.** Foraging feeds the brewing, and brewing gives far more XP an action.
- **Grow your herbs.** Once Farming is open, a plot of herbs brings in a handful at each harvest while you do something else.
- **Brew for what you do.** Combat potions for a wall on the stages and for the clan boss, dungeon potions for runs (a second fragment now and then), skill potions for long work.
- At Alchemy {{ACHIEVEMENTS.find(a => a.id === 'alchemist').req.level}}, the [[Medals|medal]] {{ACHIEVEMENTS.find(a => a.id === 'alchemist').name}} makes every potion last longer.
