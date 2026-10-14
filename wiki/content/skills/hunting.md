---
path: /skills/hunting
keywords: hunting, hunt, meat, raw meat, bow, animals, rabbit, fox, boar, deer, bear, drake, dragon, fishing, fish, river, bait, fishing bait, catch, second fish
aliases: Fishing, River
---
Hunting brings in game from the forest and fish from the river, for the kitchen. It opens soon after you {{UNLOCKS.find(u => u.id === 'hunting').task.toLowerCase()}} in the fight, and its river opens a little later, once you have cooked five dishes. Fishing was a skill of its own until October 2026; it joined Hunting, and a hero kept the higher of the two levels.

## What it is for

- **Meat and fish for [[/skills/cooking|Cooking]]**, which turns them into [[Food|food]] for the fight. Your first animal hunted opens Cooking.
- **Fish heal a little more** than the meat of the same level, so both rows are worth cooking at every level.
- **Cooked game for [[/skills/alchemy|Alchemy]]**: {{['cooked_rabbit', 'cooked_fox', 'cooked_boar', 'cooked_deer'].map(id => res(id)).join(', ')}} brew with a herb into the [[/potions|dungeon potions]].

## How it works

The tab has two rows, the **Forest** and the **River**, opening side by side as your level grows. Pick an animal or a spot and your hero hunts or fishes on and on, while you are away too; neither runs out. Each catch brings one, and now and then two: a [[Tools|bow]] (made in [[/skills/crafting|Crafting]]) serves the whole skill, and the spot's [[Mastery|mastery]], the [[/capes|Hunting cape]] and a burning bonfire ([[/skills/firemaking|Firemaking]]) all raise the chance of a double. At a river spot the skill's stage shows the river, and its mini-game is the angler's: strike when the float dips.

**Bait.** Each catch at a river spot uses one [[Fishing Bait|bait]] if you have any, for a {{pct(BAIT_EXTRA_CHANCE, 0)}} chance of a further fish on top; the forest's game takes none. Bait comes from:
- monsters in the {{ZONES.filter(z => z.loot.some(l => l.id === 'fishing_bait')).map(z => link(path.zone(z.id), z.name)).join(', ').replace(/, (?=[^,]*$)/, ' and ')}};
- the [[Shop]], {{GOLD_SHOP.find(e => e.id === 'buy_bait').gives.fishing_bait}} at a time;
- the shop of the [[Weekend events|weekend events]], {{EVENT_SHOP.find(e => e.id === 'ev_bait').gives.fishing_bait}} at a time.

Monsters drop raw meat and fish too, the kinds that live in their land, and the [[Shop]] sells raw rabbits.

Hunting has two pets to find: {{PETS.filter(p => p.skill === 'hunting').map(p => p.name).join(', then ')}}, each {{PETS.find(p => p.skill === 'hunting').desc.toLowerCase()}} (see [[Pets]]).

## Training tips

- **Make a bow** once Crafting is open: the Shortbow needs Crafting {{TOOLS.bow.tiers[0].levelReq}} ({{resList(TOOLS.bow.tiers[0].consumes)}}). Bows go up to {{TOOLS.bow.tiers.length}} tiers, the last made with [[Magic Logs]].
- **Move up as spots open.** A newer spot never gives less XP an hour than the ones before it, and what it brings cooks into better food. The forest and the river open at the same levels, so pick either.
- **Bring bait to the river.** More fish for the same time means more food for the same XP, and nothing is lost when you run out.
- **Weekends help.** During the {{EVENTS.find(e => e.id === 'harvest_festival').name}}, Hunting is +{{pct(EVENTS.find(e => e.id === 'harvest_festival').mods.skillSpeed.hunting, 0)}} faster, and {{EVENTS.find(e => e.id === 'miners_rush').name}} speeds up every gathering skill.
