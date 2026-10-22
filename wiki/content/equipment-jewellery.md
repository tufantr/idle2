---
path: /equipment/jewellery
keywords: jewellery, jewelry, ring, rings, amulet, earring, earrings, crafting, gem, gems, silver bar, gold bar, setting, voidstone, upgrade, reroll, reforge, bench, jeweller's bench, rarity, amulets
aliases: Jewelry, Rings, Amulets, Earrings
---
Jewellery fills {{CRAFTING_TYPES.reduce((n, t) => n + TYPE_SLOTS[t].length, 0)}} of your hero's slots: two rings, an amulet and two earrings. A piece adds a little attack and defence, and its real worth is in its bonuses. It drops in the fight at every rarity, and you can make it in [[Crafting]] (the table below lists every piece you can craft), whose bench makes what you wear stronger.

## Crafting a piece

A piece is one precious bar set with one gem: a {{res('silver_bar')}} or a {{res('gold_bar')}}, and a gem from {{res(GEM_TIERS[0].gem)}} up to {{res(GEM_TIERS.at(-1).gem)}}. Gems turn up while mining ({{pct(GEM_FIND_CHANCE, 0)}} of the ore you dig brings one), drop in the fight and come in daily crates and dungeon chests, and once Crafting is open the [[Shop]] sells pouches of the first ones ({{GOLD_SHOP.filter(e => e.craft).map(e => res(Object.keys(e.gives)[0])).join(', ')}}), each while your Crafting level suits it.

## Power from the gem

The gem sets the piece's tier and its power: {{res(GEM_TIERS[0].gem)}} makes a tier {{RESOURCES[GEM_TIERS[0].gem].tier}} piece, {{res(GEM_TIERS[1].gem)}} a tier {{RESOURCES[GEM_TIERS[1].gem].tier}} piece, and so on up the gems, with {{pct(JEWEL_POWER, 0)}} of the power of that tier's armour, as for jewellery that drops. The bar is the setting: silver adds nothing, and gold adds {{pct(JEWEL_BARS.find(b => b.bar === 'gold_bar').powerMult - 1, 0)}} more power.

How the power is split between attack and defence depends on the piece: an amulet carries the most, an earring the least (the slot table on [[Equipment]]).

## Crafting levels

Each gem has its Crafting level: {{GEM_TIERS.map(g => `${RESOURCES[g.gem].name} ${g.levelReq}`).join(', ')}}. A ring needs just that, an earring {{CRAFT_SLOT_OFFSET.Ear}} levels more and an amulet {{CRAFT_SLOT_OFFSET.Neck}} more. A gold setting needs at least Crafting {{JEWEL_BARS.find(b => b.bar === 'gold_bar').levelReq}}, plus the same few levels for an earring or an amulet. The table below gives every piece's level.

## The best rarity

A crafted piece rolls its rarity like any made gear, and how rare it can be rises with your Crafting level: up to {{RARITIES.find(r => r.id === CRAFT_MAX_RARITY).name.toLowerCase()}} at first, {{CRAFT_RARITY_LEVELS.slice().sort((a, b) => a[0] - b[0]).map(([lvl, r]) => `${RARITIES.find(x => x.id === r).name.toLowerCase()} from Crafting ${lvl}`).join(' and ')}}. The odds stay the roll's own, so an epic piece comes about {{pct(RARITIES.find(r => r.id === 'epic').weight / RARITIES.reduce((a, r) => a + r.weight, 0))}} of the time and a legendary one about {{pct(RARITIES.find(r => r.id === 'legendary').weight / RARITIES.reduce((a, r) => a + r.weight, 0))}}.

Quality bonuses tilt every roll toward the rarer side: the {{achievementById('blacksmith').name}} and {{achievementById('jeweller').name}} medals, the Crafting cape ([[Skill capes]]) and the {{eventById('guild_fair').name}} weekend.

## The jeweller's bench

From Crafting {{BENCH_LEVEL_PER_UPGRADE}}, the bench (the Crafting tab's second step) works the jewellery your hero wears, as the anvil works weapons and armour:

- **Upgrade:** the levels belong to the **slot**, as the anvil's do, and have no top: every ring, earring or amulet you wear in a slot has its levels, so a better piece never throws your work away. Up to +{{MAX_UPGRADE}} a level adds {{pct(UPGRADE_STEP, 0)}} of a piece's base attack and defence (×{{fmt(forgeMult(MAX_UPGRADE))}} at +{{MAX_UPGRADE}}); past it each multiplies them by {{FORGE_STEP}}, so +20 is ×{{fmt(forgeMult(20))}} and +30 ×{{fmt(forgeMult(30))}}. Each level asks more Crafting ({{BENCH_LEVEL_PER_UPGRADE}} levels up to +{{MAX_UPGRADE}}, one past it, up to 99) and takes {{BENCH_GEM_GROWTH}} times the gems of the one before up to +{{MAX_UPGRADE}}, {{FORGE_BAR_GROWTH}} times past it.
- **Reroll:** new bonuses for the piece, not its rarity or base stats, for a piece's worth of gems and essence that grows with each reroll, up to {{MAX_REFORGE_MULT}} times the first. A common piece has no bonuses to reroll, and a unique's are fixed.

The work takes gems of the best tier the slot has held and [[Monster Essence|essence]], and no gold: {{GEM_TIERS.slice(0, 6).map((g, i) => `${res(g.gem)} for tier ${i + 1}`).join(', ')}}, and twice the diamonds for tier 7. A ring or an earring takes {{BENCH_GEM_COST.Ring}} gem at +1, an amulet {{BENCH_GEM_COST.Neck}}. It pays half the gems' Crafting XP (a piece crafted with them pays all of it; past +{{MAX_UPGRADE}}, the +{{MAX_UPGRADE}} level's) and practice in their jewellery's mastery, whose levels take gems off the price. The work stays with the slot, so a salvaged piece gives back only what it is made of. (Until October 2026 jewellery was upgraded in the Inventory with essence and gold, and for a day at the bench a piece kept its own levels; those levels went to its slot.)

{{table(['Level', 'Crafting #', 'Ring or earring, gems #', 'Amulet, gems #', 'Essence, times the tier #'], [...Array.from({ length: MAX_UPGRADE }, (_, i) => i + 1), 15, 20, 30].map(n => [`+${n}`, benchUpgradeCost('Ring', n - 1, 1).level, fmt(benchUpgradeCost('Ring', n - 1, 1).gems), fmt(benchUpgradeCost('Neck', n - 1, 1).gems), benchUpgradeCost('Ring', n - 1, 1).essence]), { sort: false })}}

## Voidstone pieces

The {{res('voidstone')}} is the deepest gem: tier {{RESOURCES.voidstone.tier}}, cut from Crafting {{GEM_TIERS.find(g => g.gem === 'voidstone').levelReq}}. No rock holds it. From depth {{VOIDSTONE_DEPTH}} of the Abyss (stage {{AUTHORED_STAGES + (VOIDSTONE_DEPTH - 1) * STAGES_PER_ZONE + 1}}), a boss's first fall in a run (and a Titan that deep) leaves one {{pct(VOIDSTONE_CHANCE, 0)}} of the time.

A Voidstone piece is cut to the deepest depth you have ever reached. Past depth {{BALANCE.abyss.dropScalingFrom}} each depth makes it {{BALANCE.abyss.dropGrowth}} times as strong (easing to {{BALANCE.abyss.denseDropGrowth}} times deep down), just like the gear that drops there, so a crafted piece can stand beside the deep Abyss's drops. The piece shows its depth.

## Jewellery that drops

Jewellery drops in the fight at every rarity, as weapons and armour do (until October 2026 it was epic or legendary only; see [[Equipment]]). Some dungeons' [[Unique items|unique items]] are jewellery too: {{Object.values(UNIQUES).filter(u => CRAFTING_TYPES.includes(u.type)).map(u => `the ${link(path.unique(u.id), u.name)} (${TYPE_NAMES[u.type].toLowerCase()})`).join(' and ')}}.
