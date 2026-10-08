# Gems for Crafting: keeping a production skill trainable (October 2026)

**The question.** The simulator's bot held 1,913 Diamonds and 25 Amethysts at hour 25 and was still
Crafting 1. Gems in Fantasy Idle follow where they are found: a monster's gem leans to its zone's tier and
a rock's to the rock's (`pickGem`, `GEM_DROP_TABLE`), so a hero whose fight has gone deep finds only gems a
new crafter cannot cut (Amethyst at level 1, Topaz 10, Sapphire 25, Emerald 40, Ruby 55, Diamond 70,
Voidstone 85). A player who opens Crafting late meets the same wall. Two fixes were on the table: let a
low-level crafter work the higher gems for little XP, or sell the low gems in the shop.

## What Melvor Idle and Old School RuneScape do

| | Where gems come from | What the shop sells | A gem above your level |
|---|---|---|---|
| **Melvor Idle** | Every Mining action on any ore rock has a 1% chance of a gem, from one table for all rocks: Topaz 50%, Sapphire 17.5%, Ruby 17.5%, Emerald 10%, Diamond 5% (Gem Gloves make it every action) ([Mining](https://wiki.melvoridle.com/w/Mining)) | Crafting's first material, not gems: Leather for 100 GP, Green, Blue and Red Dragonhide for 100 to 350 GP ([Shop, Materials](https://wiki.melvoridle.com/w/Shop)) | Not allowed: Leather Gloves at level 1, Topaz rings at 10, Sapphire 20, Ruby 25, Emerald 50, Diamond 80 ([Crafting](https://wiki.melvoridle.com/w/Crafting)) |
| **Old School RuneScape** | Monsters of all kinds share one gem table: Sapphire 32/128, Emerald 16/128, Ruby 8/128, Diamond 2/128 ([Gem drop table](https://oldschool.runescape.wiki/w/Gem_drop_table)) | A trickle: the Gem Trader sells uncut Sapphire for 25 coins, Emerald 50, Ruby 100, Diamond 200, with one or none in stock and hours to restock ([Gem Trader](https://oldschool.runescape.wiki/w/Gem_Trader)) | Not allowed |

Three things follow:

1. **The lowest gem is the commonest everywhere.** Both games draw every gem from one table that does not
   move with the player's progress, halving or so at each tier. A crafter of any level finds the gems they
   can use, whatever they fight or mine.
2. **No game here lets a crafter use a gem above their level.** Letting a level-1 crafter cut a Diamond
   would have no precedent, and here it would hand them tier-6 jewellery (a crafted piece's power is its
   gem's tier).
3. **A shop keeps the first rungs open.** Melvor sells Crafting's first material for gold without limit;
   RuneScape sells gems, but as a trickle. Neither sells the top gems in bulk.

## The decision

**Sell the low gems in the shop**, shaped like Melvor's Leather: pouches of ten Amethysts, Topaz or
Sapphires among the Supplies, priced like the shop's other goods in kills' worth of gold at the best stage
(50, 80 and 120 kills), each shown once Crafting is open and only for the levels it serves (Amethyst to
level 9, Topaz 10 to 24, Sapphire from 25), as a ladder shows its next rung. The higher gems stay the
fight's and the mine's, as in both games; a deep hero's hoard of them becomes usable from Crafting 40
(Emerald), so the pouches bridge the first forty levels. It is also a sink for late gold.

Not chosen: working the higher gems below their level (no precedent, and too strong); reshaping the drop
tables to Melvor's and RuneScape's (it would also work, but changes every loot table and fills a deep
hero's drops with Amethysts; it stays a possible later step).

The simulator's bot also needed a change to show it: its training went to Mining and Smithing whenever the
anvil's metal for its weapon was out of their reach, which is most of a run. It now gives Crafting one turn
in three once Crafting is open, and buys a pouch when it has no gem it can cut.

## Measured

With `tools/batch.mjs` (30 seeds, 150 hours; and 3 seeds, 1,000 hours with Auto):

- **Crafting can be trained now.** The bot ends 150 hours at Crafting 44 (28 to 51), from 1, buying Sapphire
  pouches when it has no gem to cut, and the gem hoard of a deep hero (Emeralds, Rubies, thousands of
  Diamonds) is there for it from level 40 on.
- **The late Crafting jobs need a crafter.** After 1,000 hours with Auto the bot is still Crafting 44 to 53:
  once Auto runs its fights it trains little at all, and one turn in three of little is a few hours. With
  bars and gems at hand, Crafting 75 (epic rolls) takes 21 hours of crafting and 85 (the Voidstone) about
  48 (`node tools/pacing.mjs`), so a player who crafts reaches them; a player who only fights does not.
  The jewellery the bot wears at the end is dropped, epic and legendary Voidstone pieces from the depth
  it fights at, so a crafted piece earns its place where drops lag behind (jewellery drops are rare) or
  when a roll comes up epic or legendary.
- **The pace:** with Crafting the bot reaches stages 200, 250 and 300 at 54.9, 79.9 and 126 hours, without
  it at 56.9, 83.0 and 132 (the old bot, which never crafted: 56.6, 83.2, 127), about 4% apart, near the
  noise of 30 seeds; no crafted piece is worn at the end in either. Over 1,000 hours both end at stage 620.
