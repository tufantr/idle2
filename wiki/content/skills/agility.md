---
path: /skills/agility
keywords: agility, obstacle course, obstacles, course, slots, upgrades, permanent bonus, gold sink
---
Agility is a course you build, obstacle by obstacle, and every obstacle is a bonus that lasts for good: no [[Prestige|prestige]] takes it away. Training the skill opens more of the course. Agility opens once you reach stage {{[...Array(1000).keys()].find(s => UNLOCKS.find(u => u.id === 'agility').requires({ combat: { bestStage: s }, unlocks: { woodcutting: true, smithing: true }, gold: Infinity }))}} with [[/skills/woodcutting|Woodcutting]] and [[/skills/smithing|Smithing]] open and {{fmt(AGILITY_SLOTS[0].costGold / 2)}} gold in hand, half the price of a first obstacle.

## What it is for

The obstacles' bonuses: gathering or production speed, combat XP, attack, defence and health, gold and drops, crits, more hours of [[Offline progress and saves|offline progress]], workshop speed, farming yield, XP in every skill, attack speed, dodge, and speed in every skill. Agility makes nothing that other skills use: it is where gold and materials become lasting power.

## How it works

- **Slots.** The course has {{AGILITY_SLOTS.length}} slots, each opening at an Agility level. A slot holds one obstacle, chosen from {{AGILITY_SLOTS[0].obstacles.length}}.
- **Building** costs gold and materials, logs and bars from the gathering and workshop skills, the same for every obstacle of a slot. Building a different obstacle in a slot tears down the old one and its upgrades, with no refund.
- **Running the course** is the skill's one action: a lap takes as long as all your obstacles together and pays all of their XP. You need at least one obstacle to run. Laps go on while you are away, like any action.
- **Upgrades.** A built obstacle can be raised to level {{MAX_OBSTACLE_LEVEL}} with gold alone. Its bonus counts once per level, and each level adds a quarter to its XP a lap; each level also needs {{OBSTACLE_LEVEL_STEP}} more Agility levels. The prices climb steeply, so the upgrades are a long, late use for gold.

Agility has no tool and no [[Mastery|mastery]].

## Training tips

- **Build the first obstacle as soon as you can afford it** ({{fmt(AGILITY_SLOTS[0].costGold)}} gold, {{resList(AGILITY_SLOTS[0].materials)}}): the course can't be run without one, and its bonus starts at once.
- **Spend gold before a prestige.** Gold starts over at every prestige, but obstacles stay, so a run's spare gold is best turned into the course before you prestige.
- **Fill every slot.** More obstacles make a lap longer but pay their XP in full, and all {{AGILITY_SLOTS.length}} built earn the [[Medals|medal]] {{ACHIEVEMENTS.find(a => a.id === 'architect').name}} ({{ACHIEVEMENTS.find(a => a.id === 'architect').reward.replace(/^./, c => c.toLowerCase())}}).
- **Choose for your way of playing.** A fighter wants attack, defence and health; a skiller wants speed and yield.
