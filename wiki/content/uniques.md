---
path: /uniques
keywords: unique, uniques, unique item, unique items, fragment, fragments, assemble, dungeon, legendary, record, records, spare, unique fragments
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
- **A record each:** every unique you hold, worn or in the bag, is a record that makes all your prestige tokens ×{{BASE.recordMult}} stronger (see [[Prestige]]). A spare copy of one you hold does not count again.
- **The {{achievementById('collector').name}} medal** comes with your first: {{achievementById('collector').reward}} (see [[Medals]]).

Some of them, like the [[Goblin King's Crown]], show on your hero when he wears them.

## Spares, upgrades and salvage

- Your first copy of a unique arrives locked, so nothing can sell or salvage it by accident. Another copy, assembled again or found in a chest, is a spare: it arrives unlocked, and a full bag can salvage it for essence.
- A unique weapon or piece of armour can be reinforced at the anvil, and a unique ring or amulet upgraded with essence and gold, like any gear (see [[Equipment]] and [[Jewellery]]). Only its bonuses are fixed.
- Like all gear, uniques are kept when you prestige.
