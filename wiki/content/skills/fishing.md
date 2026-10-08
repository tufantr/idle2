---
path: /skills/fishing
keywords: fishing, fish, bait, fishing bait, rod, fishing rod, catch, second fish
---
Fishing brings in raw fish for the kitchen. It opens soon after you {{UNLOCKS.find(u => u.id === 'fishing').task.toLowerCase()}} in [[/skills/cooking|Cooking]].

## What it is for

Fish cook into the best [[Food|food]] for their level: each heals a little more than the meat of the same level from [[/skills/hunting|Hunting]]. Fishing feeds only [[/skills/cooking|Cooking]], and Cooking feeds the fight, where your hero eats when health runs low.

## How it works

Pick a spot and your hero fishes on and on, while you are away too; the spots never run dry. Each catch brings one fish, and now and then two: a [[Tools|fishing rod]] (made in [[/skills/crafting|Crafting]]), the spot's [[Mastery|mastery]] and the [[/capes|Fishing cape]] all raise the chance of a double.

**Bait.** Each catch uses one [[Fishing Bait|bait]] if you have any, for a {{pct(BAIT_EXTRA_CHANCE, 0)}} chance of a further fish on top. Bait is used whenever you have it, so a stock of it simply makes every catch better. It comes from:
- monsters in the {{ZONES.filter(z => z.loot.some(l => l.id === 'fishing_bait')).map(z => link(path.zone(z.id), z.name)).join(', ').replace(/, (?=[^,]*$)/, ' and ')}};
- the [[Shop]], {{GOLD_SHOP.find(e => e.id === 'buy_bait').gives.fishing_bait}} at a time;
- the shop of the [[Weekend events|weekend events]], {{EVENT_SHOP.find(e => e.id === 'ev_bait').gives.fishing_bait}} at a time.

## Training tips

- **Bring bait.** More fish for the same time means more food for the same XP, and nothing is lost when you run out: the catches simply go on without it.
- **Make a rod** once Crafting is open: the first needs Crafting {{TOOLS.rod.tiers[0].levelReq}} ({{resList(TOOLS.rod.tiers[0].consumes)}}).
- **Cook what you catch.** A spot's fish cooks into the best food for its level, so fishing and cooking together keep your hero fed deep into the fight.
- **Weekends help.** During the {{EVENTS.find(e => e.id === 'harvest_festival').name}}, fishing is +{{pct(EVENTS.find(e => e.id === 'harvest_festival').mods.skillSpeed.fishing, 0)}} faster, and {{EVENTS.find(e => e.id === 'miners_rush').name}} speeds up every gathering skill.
