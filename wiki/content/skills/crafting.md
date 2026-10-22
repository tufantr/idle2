---
path: /skills/crafting
keywords: crafting, jewellery, jewelry, rings, earrings, amulets, gems, gem pouches, voidstone, plain piece, plain jewellery, no gem, bench, jeweller's bench, upgrade, reroll
---
Crafting makes jewellery and works the jewellery your hero wears (Hunting's bows are bought in the [[/shop|Shop]] now). It opens soon after you have a [[Silver Bar|silver]] or [[Gold Bar|gold bar]] in hand and have found a gem.

## What it is for

- **[[Jewellery]]:** rings, earrings and amulets, each a precious bar set with a gem. A piece adds a little attack and defence, but its bonuses are most of what it is worth. Jewellery drops in the fight too, at every rarity.
- **The bench:** from level {{BENCH_LEVEL_PER_UPGRADE}}, it upgrades the slots of the jewellery your hero wears and rerolls its bonuses, with gems and essence.

It draws on [[/skills/smithing|Smithing]] for bars, and [[/skills/mining|Mining]] and the fight for gems.

## How it works

- **The gem sets the piece:** its tier, its strength and the level it needs (the table below). A [[Gold Bar|gold]] setting adds strength but needs a higher level. Rings come first, then earrings, then amulets.
- **No gem? A plain piece:** the setting alone, a bar and no gem, makes a ring, earring or amulet as weak as an amethyst one. It teaches {{pct(PLAIN_XP_SHARE, 0)}} of the XP of a piece of the best gem you can set ({{plainXp(1, JEWEL_BARS[0])}} at level 1, {{plainXp(70, JEWEL_BARS[0])}} from level 70; a gold setting {{pct(JEWEL_BARS[1].powerMult - 1, 0)}} more), so Crafting goes on when the gems run out. The Gem row starts with it, and it is picked for you while you hold none of the gems you can set.
- **Quality:** a piece rolls its rarity as it is made, and the best it can roll rises with your level, up to legendary at {{MAX_LEVEL}}. The [[Medals|medals]] {{ACHIEVEMENTS.find(a => a.id === 'jeweller').name}} and {{ACHIEVEMENTS.find(a => a.id === 'blacksmith').name}} and the [[/capes|Crafting cape]] tip every roll toward the better ones.
- **Mastery:** each gem has one [[Mastery|mastery]], shared by every piece set with it, and plain pieces have one of their own; it can also keep the bar and gem.
- **The bench** (the tab's second step): a worn piece's slot goes up a level, and every ring, earring or amulet worn there has it, with no top: +{{pct(UPGRADE_STEP, 0)}} of its attack and defence a level up to +{{MAX_UPGRADE}}, ×{{FORGE_STEP}} a level past it, each level asking more Crafting ({{BENCH_LEVEL_PER_UPGRADE}} levels up to +{{MAX_UPGRADE}}, one past it); or a piece's bonuses are rerolled. It takes gems of the best tier the slot has held and essence, and no gold, and pays half the gems' XP (a piece made with them pays it all) and their mastery, which takes gems off the price (the table below; [[Jewellery]] has more).

**Gems** turn up while mining, drop from monsters, and come in [[Daily crate|daily crates]] and [[Dungeons|dungeon]] chests. The [[Shop]] sells pouches of the lowest gems for gold while your level suits them.

**The [[Voidstone]]** is the last gem, and no mine holds it. From depth {{VOIDSTONE_DEPTH}} of the Abyss (stage {{(ZONES.length + VOIDSTONE_DEPTH - 1) * STAGES_PER_ZONE + 1}} on), a boss falling for the first time in a run leaves one {{pct(VOIDSTONE_CHANCE, 0)}} of the time. A Voidstone piece is cut to the deepest depth you have reached, so it keeps pace with the gear that drops there.

## Training tips

- **Use the best gems you have plenty of.** Every piece takes the same time and pays its gem's XP, and a higher gem never pays less; the pouches keep the low ones coming.
- **Keep the good pieces, salvage the rest.** A crafted piece salvaged gives back about {{pct(SALVAGE_MATERIAL_RETURN, 0)}} of its bar and gem.
- **Out of gems, make plain pieces.** They pay less, but a bar is all they take, and their XP climbs with your level.
- **Past the middle levels, gems pay their way.** A piece takes two things, a bar and a gem, so Crafting's late XP is cut less than most skills' ([[Skills|Melvor pace]]).
