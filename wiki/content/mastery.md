---
path: /mastery
keywords: mastery, mastery level, mastery xp, checkpoint, double chance, preserve, ingredients kept, mastery 99, mastery bar
---
Every action you repeat has a **mastery** of its own, from level 1 to {{MASTERY_MAX_LEVEL}}, and it grows simply by doing that action: mining copper masters the copper vein, grilling trout masters trout. Each level makes that one action a little better, and a skill's mastery as a whole makes all of its actions faster at a few checkpoints. Mastery is kept for good: a [[Prestige|prestige]] or an [[Ascension]] never touches it.

## Which actions have a mastery

- Every spot in [[/skills/mining|Mining]], [[/skills/woodcutting|Woodcutting]], [[/skills/fishing|Fishing]] and [[/skills/hunting|Hunting]].
- Every dish in [[/skills/cooking|Cooking]], every kind of log in [[/skills/firemaking|Firemaking]], and every herb and potion in [[/skills/alchemy|Alchemy]].
- In [[/skills/smithing|Smithing]], every bar you smelt, and one mastery per metal for working its gear: forging copper, and reinforcing or rerolling each metal's gear at the anvil. All the pieces of one metal share it.
- In [[/skills/crafting|Crafting]], one mastery per gem, shared by every ring, earring and amulet set with it.

[[/skills/farming|Farming]], [[/skills/agility|Agility]], making tools and combat have no mastery. The last table below counts the actions of each skill.

## Mastery XP

Each time you complete an action, its mastery gains one mastery XP for every second the action takes at base speed, before any speed bonus. An hour spent on anything is worth the same, and anything that makes you faster (tools, perks, boosts) makes you master faster too. At the anvil, every bar worked counts as a second.

Mastery levels follow the skills' [[XP table]], divided by {{MASTERY_XP_DIVISOR}}. The first levels come in minutes, and level {{MASTERY_MAX_LEVEL}} takes about {{Math.round(xpForLevel(MASTERY_MAX_LEVEL) / MASTERY_XP_DIVISOR / 3600)}} hours on one action at base speed, usually long after the skill itself has reached {{MAX_LEVEL}}. The log notes each action's mastery at {{MASTERY_MILESTONES.join(', ')}}, and the last one gets a card. Mastery grows while you are away too, as your hero keeps working.

## What a mastery level gives

Every level above 1 adds to that one action:
- **Speed:** +{{pct(MASTERY_PER_LEVEL.speed, 1)}} a level, for every action (+{{pct(MASTERY_PER_LEVEL.speed * (MASTERY_MAX_LEVEL - 1), 1)}} at {{MASTERY_MAX_LEVEL}}).
- **Doubles:** +{{pct(MASTERY_PER_LEVEL.double, 2)}} a level chance that the action makes twice as much, for actions that make a resource: gathering, cooking, alchemy and smelting. In Firemaking it is the chance that a log burns twice, for twice the XP and bonfire time.
- **Ingredients kept:** +{{pct(MASTERY_PER_LEVEL.preserve, 1)}} a level chance to use up nothing, for actions with ingredients: a dish's raw food and its log, a potion's herb and second ingredient, ore for smelting, logs for burning, and the bars and gems of forged and crafted pieces. At the anvil, a metal's mastery takes that share of the bars off the price instead.

These add to the speed and double chance your skill already has from [[Tools|tools]], perks, medals, [[/capes|capes]] and the rest. Forging and jewellery make a piece of gear, so they get speed and kept ingredients but no doubles.

## A skill's whole mastery

A skill's whole mastery is the levels gained over all its actions, out of the most they could reach. Once you have a few mastery levels, each skill's header shows it as a Mastery percentage, with the next checkpoint marked. At {{MASTERY_CHECKPOINTS.map(c => pct(c.at, 0)).join(', ')}} of the whole, every action of the skill becomes faster for good, with a card (the table below gives the speed of each). With many actions to share the work, the first checkpoint comes after some steady training, and the last one is the work of hundreds of hours.

## Medals for mastery

Three [[Medals|medals]] count your mastery levels over every skill:
- **{{ACHIEVEMENTS.find(a => a.id === 'practised').name}}:** {{ACHIEVEMENTS.find(a => a.id === 'practised').desc.replace(/^./, c => c.toLowerCase())}}, for {{ACHIEVEMENTS.find(a => a.id === 'practised').reward.replace(/^./, c => c.toLowerCase())}}.
- **{{ACHIEVEMENTS.find(a => a.id === 'polymath').name}}:** {{ACHIEVEMENTS.find(a => a.id === 'polymath').desc.replace(/^./, c => c.toLowerCase())}}, for {{ACHIEVEMENTS.find(a => a.id === 'polymath').reward.replace(/^./, c => c.toLowerCase())}}.
- **{{ACHIEVEMENTS.find(a => a.id === 'grandmaster').name}}:** {{ACHIEVEMENTS.find(a => a.id === 'grandmaster').desc.replace(/^./, c => c.toLowerCase())}}, for {{ACHIEVEMENTS.find(a => a.id === 'grandmaster').reward.replace(/^./, c => c.toLowerCase())}}.

> Tip: Mastery rewards sticking with an action. When two actions give about the same XP, the one you have mastered further is faster, makes more and wastes less.
