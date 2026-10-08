---
path: /skills/smithing
keywords: smithing, smelting, forging, anvil, reinforce, reroll, salvage, bars, refit, tools, pickaxe, axe, tinderbox, hoe
---
Smithing is the workshop at the heart of the game: it turns ore into bars, bars into tools and a first set of gear, and it makes the gear you find stronger at the anvil. It opens soon after you {{UNLOCKS.find(u => u.id === 'smithing').task.toLowerCase()}} in [[/skills/mining|Mining]].

## What it is for

- **Bars.** Smelting turns ore (and [[Coal]], from iron up) into bars. Copper, iron, mithril, adamant and runite bars work gear at the anvil; [[Silver Bar|silver]] and [[Gold Bar|gold]] bars are for jewellery in [[/skills/crafting|Crafting]]; and bars of all kinds go into tools, bows, rods and the [[/skills/agility|agility]] course.
- **Tools.** Pickaxes, axes, tinderboxes and hoes are forged here, each tier faster than the last (see [[Tools]]).
- **A first set of gear.** Copper bars forge a weapon and armour for a new hero. Every stronger piece drops in the fight ([[Equipment]]).
- **The anvil.** From Smithing {{ANVIL_LEVEL_PER_UPGRADE}}, the weapons and armour you wear can be reinforced, up to +{{MAX_UPGRADE}} (each level +{{pct(UPGRADE_STEP, 0)}} to the piece's attack and defence), and their bonuses rerolled. Both take bars of the piece's own metal and [[Monster Essence|essence]].

## How it works

Smelting and forging are actions like any other: your hero keeps at it until the materials run out. Tools are made once each, a new tier replacing the old. Work at the anvil is one tap a step, and every bar it takes pays its Smithing XP, so reinforcing your gear trains the skill too.

Two rules keep the anvil's work from going to waste:
- **Refitting.** A new weapon or piece of armour worn in place of a reinforced one of the same kind takes over its anvil levels, all but one, and the old piece comes off plain.
- **Salvaging.** A salvaged weapon or piece of armour gives back bars of its metal, plus {{pct(ANVIL_REFUND, 0)}} of the bars that reinforcing it took. Before you can smelt a metal, salvage is where its bars come from.

## Training tips

- Smelt copper from the start, then iron at level {{SMELTING_RECIPES.find(r => r.id === 'iron_bar').levelReq}}, once [[/skills/mining|Mining]] reaches the coal. Smelting is the steady XP.
- Forge a copper pickaxe and axe early (Smithing {{TOOLS.pickaxe.tiers[0].levelReq}}): faster gathering soon repays them.
- Reinforce the pieces you will wear longest. Thanks to refitting, the work carries over to the next piece of that kind.
- A metal's [[Mastery|mastery]] grows with the bars you work, and takes bars off the anvil's price.
