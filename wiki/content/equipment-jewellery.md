---
path: /equipment/jewellery
keywords: jewellery, jewelry, ring, rings, amulet, earring, earrings, crafting, gem, gems, silver bar, gold bar, setting, voidstone, upgrade, reforge, rarity, amulets
aliases: Jewelry, Rings, Amulets, Earrings
---
Jewellery fills {{CRAFTING_TYPES.reduce((n, t) => n + TYPE_SLOTS[t].length, 0)}} of your hero's slots: two rings, an amulet and two earrings. A piece adds a little attack and defence, and its real worth is in its bonuses. You make it in [[Crafting]]; the table below lists every piece you can craft.

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

## Upgrading and reforging

Jewellery is upgraded and reforged in the Inventory, from the piece's detail, with [[Monster Essence|essence]] and gold. It is never worked at the anvil.

- **Upgrade:** +{{pct(UPGRADE_STEP, 0)}} base attack and defence a level, up to +{{MAX_UPGRADE}}. The gold is counted in kills at your best stage, so it keeps pace with what a run earns.
- **Reforge:** new bonuses for the piece, not its rarity or base stats, for essence and {{reforgeCost({ tier: 1 }, 1).gold}} kills' worth of gold. The essence grows with each reforge, up to {{MAX_REFORGE_MULT}} times the first. A common piece has no bonuses to reforge, and a unique's are fixed.

A salvaged piece gives back half the essence its upgrades took. The price of each upgrade level:

{{table(['Level', 'Essence, times the tier #', 'Gold, in kills at your best stage #'], Array.from({ length: MAX_UPGRADE }, (_, i) => [`+${i + 1}`, upgradeCost({ tier: 1, upgrade: i }, 1).essence, upgradeCost({ tier: 1, upgrade: i }, 1).gold]), { sort: false })}}

## Voidstone pieces

The {{res('voidstone')}} is the deepest gem: tier {{RESOURCES.voidstone.tier}}, cut from Crafting {{GEM_TIERS.find(g => g.gem === 'voidstone').levelReq}}. No rock holds it. From depth {{VOIDSTONE_DEPTH}} of the Abyss (stage {{AUTHORED_STAGES + (VOIDSTONE_DEPTH - 1) * STAGES_PER_ZONE + 1}}), a boss's first fall in a run (and a Titan that deep) leaves one {{pct(VOIDSTONE_CHANCE, 0)}} of the time.

A Voidstone piece is cut to the deepest depth you have ever reached. Past depth {{BALANCE.abyss.dropScalingFrom}} each depth makes it {{BALANCE.abyss.dropGrowth}} times as strong, just like the gear that drops there, so a crafted piece can stand beside the deep Abyss's drops. The piece shows its depth.

## Jewellery that drops

Jewellery also drops in the fight, but only {{RARITIES[JEWEL_DROP_MIN_RANK].name.toLowerCase()}} or {{RARITIES.at(-1).name.toLowerCase()}} (see [[Equipment]]). Some dungeons' [[Unique items|unique items]] are jewellery too: {{Object.values(UNIQUES).filter(u => CRAFTING_TYPES.includes(u.type)).map(u => `the ${link(path.unique(u.id), u.name)} (${TYPE_NAMES[u.type].toLowerCase()})`).join(' and ')}}.
