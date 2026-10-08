---
path: /dungeons
keywords: dungeon, dungeons, dungeon run, elite, elites, boss, boss timer, chest, fragment, fragments, unique, keep going, end the dungeon, milestone, milestones, clears, dungeon runs, dungeon milestones
aliases: Dungeon runs, Chest, Dungeon milestones, Elites
---
A dungeon is a gauntlet: a row of elite monsters and a boss, fought in one go. Every clear opens a chest, and every chest holds a fragment of the dungeon's [[Unique items|unique item]]. Each dungeon opens for good when your best stage ever reaches its stage, the first one, the [[Goblin Warren]], at stage {{DUNGEONS[0].unlockStage}}. The list below has them all.

## How a run works

Enter a dungeon from the Dungeons tab or the world map. Your hero starts at full health and fights the elites one by one, then the boss; the rooms show on the path under the fight.

- **The elites** are as strong as the stage monsters where the dungeon stands, with {{pct(ELITE_HP_MULT - 1, 0)}} more health and {{pct(ELITE_ATK_MULT - 1, 0)}} more attack.
- **The boss** has {{fmt(BALANCE.enemy.bossHpMult * DUNGEON_BOSS_HP_MULT)}} times a stage monster's health and a boss's attack, and must fall within {{DUNGEON_BOSS_TIME_MS / 1000}} seconds of fighting.
- **Your gear is locked:** you fight with what you walked in with, and nothing can be put on or taken off until the run ends. Food and your potion work as usual, and strikes help.
- **The kills pay as usual:** gold, XP and loot as on the stage ladder. The boss pays like the ordinary monsters its health is worth, not as a boss: the chest is the dungeon's own reward.

There are no packs and no gilded monsters in a dungeon, and a [[Prestige|prestige]] waits until the run is over.

## Losing a run

A run is lost, with no chest, when your hero falls, when the boss outlasts its timer, or when you leave: **Leave dungeon**, travelling on the world map, entering another dungeon, challenging [[The Titan]] or starting work in a skill. Your hero goes back to the stage he left, after a rest if he fell (**Leave dungeon** also takes him out of the fight). Whatever the kills paid is kept.

> Tip: the Dungeons tab and the world map tell you how a boss fight would go, from your hero's numbers without food, regeneration, lifesteal or combo: how long the boss would take to fall against its timer, and how long your hero would last. Green is ready, amber is close, red is not yet.

## The chest

Every clear opens a chest:

- a fragment of the dungeon's unique, now and then three;
- a little [[Monster Essence|essence]], more in the richer lands;
- {{CHEST_MATERIAL_ROLLS}} picks from the loot table of the land the dungeon stands in;
- a gem {{pct(CHEST_GEM_CHANCE, 0)}} of the time, the best one of the land's tier;
- a piece of gear {{pct(CHEST_GEAR_CHANCE, 0)}} of the time, rolled like a boss's and of the chest's gear tier, as strong as the dungeon's depth in the Abyss makes it;
- the unique itself, outright, {{pct(DIRECT_UNIQUE_CHANCE, 1)}} of the time.

Drop chance bonuses raise the gem and gear chances. The chests of the deepest dungeons hold {{GEAR_TIERS.filter(t => t.dropOnly).map(t => link(path.tier(t.name), t.name)).join(' and ')}} gear, which nothing can forge.

## Fragments and the unique

{{FRAGMENTS_PER_UNIQUE}} fragments make the dungeon's unique: **Assemble** shows on the Dungeons tab and in the run's panel once you have them. Fragments are kept through every prestige. Another copy assembled later is a spare. See [[Unique items]].

## Keep going or end the dungeon

After the first clear of a visit your hero waits at the open chest, and you choose:

- **Keep going:** the dungeon runs again after every clear, each run starting at full health, until you leave.
- **End the dungeon:** back to the stage he left, fighting on.

With no answer in {{DUNGEON_CHOICE_MS / 1000}} seconds he keeps going, and while you are away he always does, so idle time is never lost. Leaving while he waits at the chest loses nothing: that run is already won.

## Milestones

Each dungeon counts its clears, and some counts bring a bonus that lasts forever. Every dungeon has its own, so the bonuses of different dungeons add up:

{{table(['Clears #', 'Bonus, for good'], DUNGEON_MILESTONES.map(m => [fmt(m.clears), m.desc]), { sort: false })}}

All your clears together count toward the {{achievementById('delver').name}} medal at {{achievementById('delver').req.value}} clears (see [[Medals]]).
