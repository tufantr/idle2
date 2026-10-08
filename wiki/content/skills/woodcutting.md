---
path: /skills/woodcutting
keywords: woodcutting, logs, trees, axe, chop, wood
---
Woodcutting brings in logs, and few things in the game don't need some. It opens soon after you {{UNLOCKS.find(u => u.id === 'woodcutting').task.toLowerCase()}} in [[/skills/smithing|Smithing]].

## What it is for

- **Fuel for [[/skills/cooking|Cooking]].** Every dish burns a log, always the lowest kind you have.
- **[[/skills/firemaking|Firemaking]]**, which burns logs for XP and keeps the bonfire going. It opens soon after you {{UNLOCKS.find(u => u.id === 'firemaking').task.toLowerCase()}}.
- **Handles and bows.** Pickaxes, axes, tinderboxes and hoes each take a log; bows and fishing rods in [[/skills/crafting|Crafting]] are mostly logs (see [[Tools]]).
- **The [[/skills/agility|agility]] course**, whose obstacles take logs by the dozen, and [[Oak Logs]], which brew into the [[Defense Potion]] in [[/skills/alchemy|Alchemy]].

## How it works

Pick a tree and your hero chops on and on, while you are away too; trees never run out. Each chop brings one log, and now and then two: an [[Tools|axe]] (forged in Smithing), the tree's [[Mastery|mastery]] and the [[/capes|Woodcutting cape]] all raise the chance of a double. Monsters drop logs as well, and the [[Shop]] sells plain ones in bundles.

## Training tips

- **Forge an axe early.** The copper axe needs Smithing {{TOOLS.axe.tiers[0].levelReq}}: {{resList(TOOLS.axe.tiers[0].consumes)}}.
- **Keep plain logs for the kitchen.** Cooking always burns the lowest kind of log you have, so a stock of plain [[Logs]] keeps your better logs safe for bows, tools and the bonfire.
- **Better trees, better tools.** Each tier of tool, bow and rod wants the log of its tier, so a new tree often means a new tool.
- **Move up as trees open.** A newer tree never gives less XP an hour than the ones before it, and staying with one for a while builds its mastery.
