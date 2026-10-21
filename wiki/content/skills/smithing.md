---
path: /skills/smithing
keywords: smithing, smelting, forging, anvil, reinforce, reroll, salvage, bars, refit, tools, pickaxe, axe, tinderbox, hoe
---
Smithing is the workshop at the heart of the game: it turns ore into bars, bars into tools and a first set of gear, and it makes the gear you find stronger at the anvil. It opens soon after you {{UNLOCKS.find(u => u.id === 'smithing').task.toLowerCase()}} in [[/skills/mining|Mining]].

## What it is for

- **Bars.** Smelting turns ore into bars, with [[Coal]] for the {{SMELTING_RECIPES.filter(r => r.consumes.coal).map(r => r.name.replace(/ Bar$/, '').toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}} bars. Copper, iron, mithril, adamant and runite bars work gear at the anvil and go into tools, bows, rods and the [[/skills/agility|agility]] course; [[Silver Bar|silver]] and [[Gold Bar|gold]] bars are only for jewellery in [[/skills/crafting|Crafting]].
- **Bars for tools.** Pickaxes, axes, tinderboxes, hoes and bows are bought in the [[/shop|Shop]] with bars and logs (see [[Tools]]).
- **A first set of gear.** Copper bars forge a weapon and armour for a new hero. Every stronger piece drops in the fight ([[Equipment]]).
- **The anvil.** From Smithing {{ANVIL_LEVEL_PER_UPGRADE}}, the slots of the weapons and armour you wear can be reinforced, with no top (up to +{{MAX_UPGRADE}} each level adds {{pct(UPGRADE_STEP, 0)}} of a piece's attack and defence; past it each multiplies them by {{FORGE_STEP}}), and a piece's bonuses rerolled. Both take bars of the metal of the best piece the slot has held, and [[Monster Essence|essence]].

## How it works

Smelting and forging are actions like any other: your hero keeps at it until the materials run out. Tools are made once each, a new tier replacing the old. Work at the anvil is one tap a step, and every bar it takes pays its Smithing XP, so reinforcing your gear trains the skill too.

Two rules keep the anvil's work from going to waste:
- **The slot keeps it.** The anvil's levels belong to the slot, not the piece: every weapon or piece of armour you wear there has them at once, and swapping loses nothing. The plate on the slot shows them.
- **Salvaging.** A salvaged weapon or piece of armour gives back bars of its metal, and its essence feeds the forge. Before you can smelt a metal, salvage is where its bars come from.

## Training tips

- Smelt copper from the start, then iron at level {{SMELTING_RECIPES.find(r => r.id === 'iron_bar').levelReq}}, once [[/skills/mining|Mining]] reaches the coal. Smelting is the steady XP.
- Smelt a few copper bars early for a Copper Pickaxe and Axe from the Shop (Mining and Woodcutting {{TOOLS.pickaxe.tiers[0].levelReq}}): faster gathering soon repays them.
- Reinforce freely: the levels stay with the slot, so the next piece of that kind has them too. Past +{{MAX_UPGRADE}} each level asks one Smithing level more (up to 99), more bars and more essence.
- A metal's [[Mastery|mastery]] grows with the bars you work, and takes bars off the anvil's price.
