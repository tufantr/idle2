---
path: /potions
keywords: potion, potions, alchemy, brew, brewing, dose, tier, tiers, combat potion, dungeon potion, skill potion, clan boss, fragment, alchemist, accuracy potion, defense potion, evasion potion, health potion, fortune draught, gatherer's draught, scholar's tonic
aliases: Brewing, Combat potions, Dungeon potions, Skill potions, Fight potions, Work potions
---
A potion makes your hero stronger for a while. There are three kinds, each brewed in [[Alchemy]] in {{TIERS.length}} tiers, {{TIERS[0]}} to {{TIERS[TIERS.length - 1]}}: the better the herb, the stronger the potion.

- **{{POTION_KINDS.combat.name}}:** more attack, defence and health in the fight: on the stages, against [[The Titan]] and against the clan boss.
- **{{POTION_KINDS.dungeon.name}}:** more of all three in a [[Dungeons|dungeon run]], and a chance of a second [[Unique items|fragment]] from each chest. It does nothing outside a run.
- **{{POTION_KINDS.skill.name}}:** faster work and more XP at every skill but Farming.

{{table(['Tier', POTION_KINDS.combat.name, POTION_KINDS.dungeon.name, POTION_KINDS.skill.name], TIERS.map((t, i) => [t, potionEffectText(`combat_potion_${i + 1}`), potionEffectText(`dungeon_potion_${i + 1}`), potionEffectText(`skill_potion_${i + 1}`)]), { sort: false })}}

A potion multiplies what it raises, after every other bonus: a {{potionName('combat_potion_2')}}'s ×{{(1 + POTION_KINDS.combat.power[1]).toFixed(1)}} turns 1,000 attack into {{fmt(Math.round(1000 * (1 + POTION_KINDS.combat.power[1])))}}. A skill potion's speed multiplies on top of a [[Mini-games and Focus|mini-game's]] boost, and its XP is the skill's only.

## Picking a potion

Each place has its own pick, and each pick holds one potion:

- **The Combat tab and the fight's dock:** a combat potion. The **Clan** tab shows the same pick, as the clan boss is fought with it, and the clan counts it in your attack.
- **The Dungeons tab and a run's dock:** a dungeon potion, or a combat potion, which works in a run at {{pct(OUT_OF_PLACE, 0)}} of its strength.
- **Every skill's tab:** a skill potion.

**None** empties a pick, and choosing another potion throws away what is left of the bottle at work. With no bottle of a kind left, its row ends in a tile that takes you to Alchemy. The tiles show each bottle's tier.

## A bottle lasts {{POTION_MINUTES}} minutes

- Your hero drinks a bottle as its work starts: a combat potion as he fights on the stages, the Titan or the clan boss, a dungeon potion as he fights a run, a skill potion as he works. A bottle lasts {{POTION_MINUTES}} minutes of that work, and its clock stops while he does anything else.
- When a bottle runs out he drinks the next at once, so while you have bottles no moment goes without one. The row shows how long is left.
- Potions work the same way while you are away.

## The Alchemist medal

Reaching Alchemy {{achievementById('alchemist').req.level}} earns the {{achievementById('alchemist').name}} medal: every bottle lasts {{pct(achievementById('alchemist').mods.potionDuration, 0)}} longer, {{POTION_MINUTES * (1 + achievementById('alchemist').mods.potionDuration)}} minutes instead of {{POTION_MINUTES}} (see [[Medals]]).

## Brewing potions

In Alchemy you forage herbs, then brew each tier from its herb and one thing from another skill: ore from [[/skills/mining|Mining]] for a combat potion, a cooked dish from [[/skills/cooking|Cooking]] for a dungeon potion, logs from [[/skills/woodcutting|Woodcutting]] for a skill potion. Each new tier opens at a higher Alchemy level (the table below).

Herbs come from Alchemy's own foraging, from the farm ([[Farming]]) and from the fight, where some lands drop them. The [[Shop]]'s {{GOLD_SHOP.find(e => e.gives.guam_leaf).name}} holds {{GOLD_SHOP.find(e => e.gives.guam_leaf).gives.guam_leaf}} {{res('guam_leaf')}}, the first herb.

## The potions before these

Until October 2026 Alchemy brewed seven potions, each raising one thing. A save from before turned their bottles into the new ones by the tier of their herb: the Accuracy, Defense, Evasion and Health Potions into combat potions {{TIERS.join(', ')}}, the Fortune Draught into a {{potionName('dungeon_potion_3')}}, and the Gatherer's Draught and the Scholar's Tonic into skill potions {{TIERS[0]}} and {{TIERS[1]}}.
