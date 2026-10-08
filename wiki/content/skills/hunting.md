---
path: /skills/hunting
keywords: hunting, hunt, meat, raw meat, bow, animals, rabbit, fox, boar, deer, bear, drake, dragon
---
Hunting brings in raw meat for the kitchen. It opens soon after you {{UNLOCKS.find(u => u.id === 'hunting').task.toLowerCase()}} in the fight.

## What it is for

- **Meat for [[/skills/cooking|Cooking]]**, which turns it into [[Food|food]] for the fight. Your first animal hunted opens Cooking.
- **[[Raw Fox]]** is also an ingredient: with a herb it brews into the [[Evasion Potion]] in [[/skills/alchemy|Alchemy]].

Hunting and [[/skills/fishing|Fishing]] are the kitchen's two suppliers. Meat heals a little less than the fish of the same level, but the two together give you plenty to cook at every level.

## How it works

Pick an animal and your hero hunts on and on, while you are away too; the animals never run out. Each hunt brings one raw meat, and now and then two: a [[Tools|bow]] (made in [[/skills/crafting|Crafting]]), the animal's [[Mastery|mastery]] and the [[/capes|Hunting cape]] all raise the chance of a double. A hunt takes a little longer than a swing of the pickaxe, and pays more XP for it.

Monsters drop raw meat too, the kind that lives in their land, and the [[Shop]] sells raw rabbits.

## Training tips

- **Make a bow** once Crafting is open: the Shortbow needs Crafting {{TOOLS.bow.tiers[0].levelReq}} ({{resList(TOOLS.bow.tiers[0].consumes)}}). Bows go up to {{TOOLS.bow.tiers.length}} tiers, the last made with [[Magic Logs]].
- **Move up as animals open.** A newer animal never gives less XP an hour than the ones before it, and its meat cooks into better food.
- **Keep foxes for potions.** If you brew Evasion Potions, put some [[Raw Fox]] aside before it all goes into the pan.
