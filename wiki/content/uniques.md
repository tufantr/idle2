---
path: /uniques
keywords: unique, uniques, unique item, unique items, fragment, fragments, assemble, dungeon, legendary, record, records, spare, unique fragments, seal, tier
aliases: Uniques, Fragments, Unique fragments
---
Every [[Dungeons|dungeon]] guards a unique item: a piece of gear with a name of its own, legendary quality and bonuses that never change. The list below has them all.

## Where uniques come from

- Every clear of a dungeon opens a chest with a fragment of its unique, now and then three. With {{FRAGMENTS_PER_UNIQUE}} fragments, **Assemble** makes the unique: the button shows on the Dungeons tab and in the run's panel during a run.
- A chest also holds the unique outright {{pct(DIRECT_UNIQUE_CHANCE, 1)}} of the time.
- Fragments are kept for good, through every [[Prestige|prestige]], so every clear brings you closer.

## Why they matter

- **Legendary quality** (×{{RARITIES.at(-1).quality}} on base stats) and a little more base power than ordinary gear of their tier: each is the best piece of its tier, not a way to skip one.
- **Fixed bonuses:** {{Math.min(...Object.values(UNIQUES).map(u => u.affixes.length))}} or {{Math.max(...Object.values(UNIQUES).map(u => u.affixes.length))}} strong bonuses chosen for the piece, which no reroll or reforge can change. The deepest uniques are worth their bonuses more than their power, since gear dropped deep in the Abyss grows stronger with every depth.
- **A record each:** each of the eight uniques, once found, is a record that makes all your prestige tokens ×{{BASE.recordMult}} stronger (see [[Prestige]]), for good: kept, salvaged or handed in for a Seal. A spare copy does not count again, nor does the same unique of a deeper tier.
- **Each tier its own:** once the dungeons are sealed and go deeper (see [[Dungeons]]), each has a unique of the new tier, the {{uniqueAt('goblin_crown', 2).name}} and the rest: {{GEAR_TIERS.at(-1).name}}, as strong as the gear its dungeon's boss's depth drops, with the same bonuses. The eight of a tier are the price of its Seal.
- **The {{achievementById('collector').name}} medal** comes with your first: {{achievementById('collector').reward}} (see [[Medals]]).

Some of them, like the [[Goblin King's Crown]], show on your hero when he wears them.

## Spares, upgrades and salvage

- Your first copy of a unique arrives locked, so nothing can sell or salvage it by accident. Another copy, assembled again or found in a chest, is a spare: it arrives unlocked, so a full bag, **Salvage weaker** and the Weaker auto-salvage can salvage it for essence. They leave one copy of each of the open tier's uniques in the bag, because the Seal hands in a copy from the bag before the one your hero wears.
- A unique is worn in a slot like any gear, so it has the levels of the slot: the anvil's for a weapon or piece of armour, the jeweller's bench's for a ring or amulet (see [[Equipment]] and [[Jewellery]]). Only its bonuses are fixed.
- A tier's eight are handed in for its Seal; the records stay.
- Like all gear, uniques are kept when you prestige.
