---
path: /skills/mining
keywords: mining, ore, mine, pickaxe, coal, gems, vein, rock
---
Mining is where most of the game's materials begin, and it is open from your very first minute.

## What it is for

- **Ore for [[/skills/smithing|Smithing]].** Every bar starts as ore: bars for tools, for reinforcing your gear at the anvil, for bows, rods and jewellery, and for the [[/skills/agility|agility]] course. [[Coal]] goes into every bar from iron up.
- **Gems for [[/skills/crafting|Crafting]].** Each ore has a {{pct(GEM_FIND_CHANCE, 0)}} chance of bringing a gem with it, of about the rock's own tier, a lower one more often than a higher one: copper gives [[Amethyst|amethysts]] and the odd [[Topaz|topaz]], and only the best rock can give a [[Diamond|diamond]].
- **[[Copper Ore]] for [[/skills/alchemy|Alchemy]]**, which brews it into the [[Accuracy Potion]].

Monsters drop ore too, but only Mining opens [[/skills/smithing|Smithing]]: it opens soon after you {{UNLOCKS.find(u => u.id === 'smithing').task.toLowerCase()}}.

## How it works

Pick a vein and your hero keeps digging, swing after swing, until you give other orders, and goes on while you are away. Veins never run out. Each swing brings one ore, and now and then two: a [[Tools|pickaxe]] (forged in Smithing), the vein's [[Mastery|mastery]] and the [[/capes|Mining cape]] all raise the chance of a double. While you mine, a [[Mini-games and Focus|mini-game]] turns up every few minutes; win it for a burst of speed.

## Training tips

- **Mine coal early.** Iron bars take {{SMELTING_RECIPES.find(r => r.id === 'iron_bar').consumes.coal}} coal each, mithril and adamant {{SMELTING_RECIPES.find(r => r.id === 'mithril_bar').consumes.coal}}, runite {{SMELTING_RECIPES.find(r => r.id === 'runite_bar').consumes.coal}}. The Coal Seam opens at level {{SKILLS.mining.nodes.find(n => n.id === 'coal').levelReq}}, and the [[Shop]] sells coal by the wagon when you are short.
- **Get a pickaxe.** The copper one needs Smithing {{TOOLS.pickaxe.tiers[0].levelReq}}: {{resList(TOOLS.pickaxe.tiers[0].consumes)}}. Each tier is +{{pct(TOOL_SPEED_PER_TIER, 0)}} speed and +{{pct(TOOL_DOUBLE_PER_TIER, 0)}} doubles.
- **Silver and gold are for jewellery.** [[Silver Ore]] and [[Gold Ore]] only become precious bars for Crafting, so mine them when you want rings and amulets.
- **Move up as veins open.** Late veins give less XP than their base ([[Skills|Melvor pace]]), but never less XP an hour than the veins before them, so the newest vein is always worth a try. Sticking with one vein for a while also builds its mastery.
- **Mining feeds everything.** When a skill further down the line stalls for want of materials, a stretch of mining is usually the cure.
