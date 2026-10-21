---
path: /skills/woodcutting
keywords: woodcutting, logs, trees, axe, chop, wood
---
Woodcutting brings in logs, and few things in the game don't need some. It opens soon after you {{UNLOCKS.find(u => u.id === 'woodcutting').task.toLowerCase()}} in [[/skills/smithing|Smithing]].

## What it is for

- **Fuel for [[/skills/cooking|Cooking]].** Every dish burns a log of its own kind, the better the dish the better the log: plain logs for the first dishes, magic logs for the finest.
- **[[/skills/firemaking|Firemaking]]**, which burns logs for XP and keeps the bonfire going. It opens soon after you {{UNLOCKS.find(u => u.id === 'firemaking').task.toLowerCase()}}.
- **Handles and bows.** The tools sold in the [[/shop|Shop]] take logs: a log for each pickaxe, axe, tinderbox and hoe, three for a bow (see [[Tools]]).
- **The [[/skills/agility|agility]] course**, whose obstacles take logs by the dozen, and logs for [[/skills/alchemy|Alchemy]], which brews them with a herb into [[/potions|skill potions]].

## How it works

Pick a tree and your hero chops on and on, while you are away too; trees never run out. Each chop brings one log, and now and then two: an [[Tools|axe]] (bought in the [[/shop|Shop]]), the tree's [[Mastery|mastery]] and the [[/capes|Woodcutting cape]] all raise the chance of a double. Monsters drop logs as well, and the [[Shop]] sells plain ones in bundles.

## Training tips

- **Buy an axe early** in the [[/shop|Shop]]. The copper axe needs Woodcutting {{TOOLS.axe.tiers[0].levelReq}} and costs {{resList(TOOLS.axe.tiers[0].consumes)}}.
- **Cut the kitchen's logs.** The better dishes burn the better logs (maple for Roast Venison, magic for a Shark Fillet), so Woodcutting keeps pace with Cooking.
- **Better trees, better tools.** Each tier of tool and bow wants the log of its tier, so a new tree often means a new tool.
- **Move up as trees open.** A newer tree never gives less XP an hour than the ones before it, and staying with one for a while builds its mastery.
