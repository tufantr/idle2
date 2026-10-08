---
path: /tools
keywords: tool, tools, pickaxe, axe, bow, fishing rod, rod, tinderbox, hoe, speed, double, double chance, tier, tool tiers
aliases: Tool tiers, Double chance
---
A tool makes its skill's work faster and now and then doubles what it brings. Each skill that gathers has one, and so do Firemaking and Farming: {{Object.values(TOOLS).map(t => `the ${t.name.toLowerCase()} for ${link(path.skill(t.skill), SKILLS[t.skill].name)}`).join(', ')}}. Every tier of every tool is below.

## What a tool does

Each tier of a tool gives its skill +{{pct(TOOL_SPEED_PER_TIER, 0)}} speed and +{{pct(TOOL_DOUBLE_PER_TIER, 0)}} chance of a double: the best {{TOOLS.bow.name.toLowerCase()}}, of tier {{TOOLS.bow.tiers.length}}, gives +{{pct(TOOLS.bow.tiers.length * TOOL_SPEED_PER_TIER, 0)}} speed and a {{pct(TOOLS.bow.tiers.length * TOOL_DOUBLE_PER_TIER, 0)}} chance of a double. Speed bonuses add up and shorten every action: it takes its time divided by (1 + the bonuses).

What a double is depends on the skill:

- **Mining, Woodcutting, Fishing, Hunting:** a second ore, log, fish or catch. Fishing's bait is separate: each catch uses one, if you have any, for a {{pct(BAIT_EXTRA_CHANCE, 0)}} chance of one more fish (see [[Fishing Bait]]).
- **Firemaking:** the tinderbox's double is a log that burns twice, for twice the XP and twice the time on the bonfire.
- **Farming:** the hoe's speed makes crops grow faster (it counts when you plant), and its double doubles a harvest.

Other bonuses add to the same speed and doubles: [[Mastery]], [[Pets]], [[Perks]], [[Medals]] and [[Skill capes]].

## Who makes them

Pickaxes, axes, tinderboxes and hoes are made in [[Smithing]], in its Tools step; bows and fishing rods are made in [[Crafting]]. Each tier takes bars and logs (the tables below) and pays XP in the skill that makes it.

## A better tool replaces the old one

- A tool is made once, as a short piece of work, and the tiers come in order: make each one before the next.
- A new tier replaces the old one. There is only ever one tool of each kind, the best you have made, and nothing to wear or pick: it works from the moment it is made, whatever your hero is doing.
- Tools are kept for good, through every [[Prestige|prestige]].
