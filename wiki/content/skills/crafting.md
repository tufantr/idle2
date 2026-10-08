---
path: /skills/crafting
keywords: crafting, jewellery, jewelry, rings, earrings, amulets, gems, bows, fishing rods, gem pouches, voidstone
---
Crafting makes jewellery, and the bows and fishing rods of the gathering skills. It opens soon after you have a [[Silver Bar|silver]] or [[Gold Bar|gold bar]] in hand and have found a gem.

## What it is for

- **[[Jewellery]]:** rings, earrings and amulets, each a precious bar set with a gem. A piece adds a little attack and defence, but its bonuses are most of what it is worth. Jewellery from the fight only drops {{RARITIES[JEWEL_DROP_MIN_RANK].name.toLowerCase()}} or better, so most of what your hero wears there is made here.
- **Tools:** bows for [[/skills/hunting|Hunting]] and rods for [[/skills/fishing|Fishing]], of logs and a bar, from Crafting {{TOOLS.bow.tiers[0].levelReq}} (see [[Tools]]).

It draws on [[/skills/smithing|Smithing]] for bars, [[/skills/mining|Mining]] and the fight for gems, and [[/skills/woodcutting|Woodcutting]] for logs.

## How it works

- **The gem sets the piece:** its tier, its strength and the level it needs (the table below). A [[Gold Bar|gold]] setting adds strength but needs a higher level. Rings come first, then earrings, then amulets.
- **Quality:** a piece rolls its rarity as it is made, and the best it can roll rises with your level, up to legendary at {{MAX_LEVEL}}. The [[Medals|medals]] {{ACHIEVEMENTS.find(a => a.id === 'jeweller').name}} and {{ACHIEVEMENTS.find(a => a.id === 'blacksmith').name}} and the [[/capes|Crafting cape]] tip every roll toward the better ones.
- **Mastery:** each gem has one [[Mastery|mastery]], shared by every piece set with it, which can also keep the bar and gem.
- **Upgrades** to jewellery are made in the Inventory, with essence and gold, not at the anvil.

**Gems** turn up while mining, drop from monsters, and come in [[Daily crate|daily crates]] and [[Dungeons|dungeon]] chests. The [[Shop]] sells pouches of the lowest gems for gold while your level suits them.

**The [[Voidstone]]** is the last gem, and no mine holds it. From depth {{VOIDSTONE_DEPTH}} of the Abyss (stage {{(ZONES.length + VOIDSTONE_DEPTH - 1) * STAGES_PER_ZONE + 1}} on), a boss falling for the first time in a run leaves one {{pct(VOIDSTONE_CHANCE, 0)}} of the time. A Voidstone piece is cut to the deepest depth you have reached, so it keeps pace with the gear that drops there.

## Training tips

- **Use the best gems you have plenty of.** Every piece takes the same time and pays its gem's XP, so higher gems level you faster; the pouches keep the low ones coming.
- **Keep the good pieces, salvage the rest.** A crafted piece salvaged gives back about {{pct(SALVAGE_MATERIAL_RETURN, 0)}} of its bar and gem.
- **Be patient past the middle levels.** Crafting's late gems take the biggest XP cut of any skill ([[Skills|Melvor pace]]).
