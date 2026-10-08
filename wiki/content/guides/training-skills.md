---
path: /guides/training-skills
title: Training skills
section: Guides
sectionPath: /guides
icon: tool/pickaxe
order: 30
summary: How the skills feed each other, a sensible early order, tools, mastery, pets and capes, Focus, mini-games and the bonfire, and training while you are away.
keywords: skilling, skills, training, gathering, production, tools, mastery, pets, capes, focus, bonfire, mini-games, forager, scholar, afk
---
Your hero has {{SKILL_IDS.length}} [[/skills|skills]]. Combat levels come from fighting; the rest you train by picking an action and letting your hero work. Only one thing happens at a time: starting work takes your hero out of the fight, and going back to the fight stops the work. [[/skills/farming|Farming]] is the exception: its plots grow on the clock while your hero does anything else.

## How the skills feed each other

Almost everything one skill makes, another skill uses.

- **[[/skills/mining|Mining]]** digs ore and {{res('coal')}}. **[[/skills/smithing|Smithing]]** smelts them into bars: copper bars forge a first set of weapons and armour, and bars of each metal make tools and reinforce your hero's gear at the anvil. Silver and gold bars go to Crafting.
- **[[/skills/woodcutting|Woodcutting]]** cuts logs. They are the fuel for Cooking (a log for each dish), the bonfire in **[[/skills/firemaking|Firemaking]]**, the handles of tools, bows and fishing rods, and part of every agility obstacle.
- **[[/skills/hunting|Hunting]]** and **[[/skills/fishing|Fishing]]** bring raw meat and fish. **[[/skills/cooking|Cooking]]** turns them into [[/food|food]] for the fight.
- **[[/skills/alchemy|Alchemy]]** forages herbs and brews them with a second ingredient into [[/potions|potions]]: {{SKILLS.alchemy.nodes.filter(n => n.consumes).map(n => `${n.name} (${Object.keys(n.consumes).map(id => RESOURCES[id].name).join(' + ')})`).join(', ')}}.
- **[[/skills/farming|Farming]]** grows crops for Cooking (potatoes, cabbages, pumpkins and starfruit) and herbs for Alchemy ({{CROPS.filter(c => RESOURCES[c.produces].category === 'herb').map(c => c.name).join(', ')}}).
- **[[/skills/crafting|Crafting]]** sets a gem in a silver or gold bar to make [[/equipment/jewellery|jewellery]], and makes bows for Hunting and rods for Fishing.
- **[[/skills/agility|Agility]]** builds a course of lasting bonuses from gold, logs and bars, and you train it by running the course.
- **The fight** feeds the skills back. Each place drops materials of its own (ore, logs, meat, fish, herbs, fishing bait), and monsters leave gems and essence.

## A sensible early order

The places open one after another as you work (see [[/guides/getting-started|Getting started]]), and this order follows them.

1. **Mine copper.** {{UNLOCKS.find(u => u.id === 'smithing').task}} and Smithing opens.
2. **Smelt copper bars.** The first bar opens Woodcutting: cut some logs.
3. **Make tools.** At Smithing {{TOOLS.pickaxe.tiers[0].levelReq}}, a Copper Pickaxe and a Copper Axe, each from copper bars and a log. Forge copper armour for any slot your hero has empty.
4. **Hunt and cook.** Hunting opens as you climb in the fight. Your first hunt opens Cooking: a stack of food makes the climb easier. {{UNLOCKS.find(u => u.id === 'firemaking').task}} and Firemaking opens: burn spare logs to keep the bonfire lit.
5. **Go for iron.** The Iron Vein opens at Mining {{SKILLS.mining.nodes.find(n => n.id === 'iron_ore').levelReq}} and coal at Mining {{SKILLS.mining.nodes.find(n => n.id === 'coal').levelReq}}. Iron bars (Smithing {{SMELTING_RECIPES.find(r => r.id === 'iron_bar').levelReq}}) reinforce the iron gear the fight drops, and with oak logs (Woodcutting {{SKILLS.woodcutting.nodes.find(n => n.id === 'oak_log').levelReq}}) make the next tools at Smithing {{TOOLS.pickaxe.tiers[1].levelReq}}.
6. **Brew.** When Alchemy opens, forage Guam and, from Alchemy {{SKILLS.alchemy.nodes.find(n => n.id === 'accuracy_potion').levelReq}}, brew it with copper ore into Accuracy Potions.
7. **Silver and a gem.** Silver ore (Mining {{SKILLS.mining.nodes.find(n => n.id === 'silver_ore').levelReq}}, or from the [[Glimmering Caves]]) smelts into silver bars at Smithing {{SMELTING_RECIPES.find(r => r.id === 'silver_bar').levelReq}}. A silver bar and a gem open Crafting.

Keep the skills fairly close together: each one's output is another's input, and a skill that falls far behind holds up the others.

## Tools

Each [[/tools|tool]] tier gives its skill +{{pct(TOOL_SPEED_PER_TIER, 0)}} speed and +{{pct(TOOL_DOUBLE_PER_TIER, 0)}} chance of a double.

| Tool | Helps | Made in |
| --- | --- | --- |
| Pickaxe | Mining | Smithing |
| Axe | Woodcutting | Smithing |
| Tinderbox | Firemaking: a log sometimes burns twice | Smithing |
| Hoe | Farming: crops grow faster, and a harvest sometimes doubles | Smithing |
| Bow | Hunting | Crafting |
| Fishing Rod | Fishing | Crafting |

Each tier is made from bars and logs, in order, starting at level {{TOOLS.pickaxe.tiers[0].levelReq}} of the skill that makes it. Tools are kept for good: a prestige never takes them.

## Mastery

Every action has its own [[/mastery|mastery]], from 1 to {{MASTERY_MAX_LEVEL}}, earned by doing it. An hour on any action is worth the same, and faster actions master faster.

- Each mastery level makes that action {{pct(MASTERY_PER_LEVEL.speed, 1)}} faster ({{pct(MASTERY_PER_LEVEL.speed * (MASTERY_MAX_LEVEL - 1), 1)}} at {{MASTERY_MAX_LEVEL}}).
- Gathering, cooking, brewing, smelting and burning also gain {{pct(MASTERY_PER_LEVEL.double, 2)}} chance of a double a level. Actions that use ingredients gain {{pct(MASTERY_PER_LEVEL.preserve, 1)}} chance a level to keep them.
- At {{MASTERY_CHECKPOINTS.map(c => pct(c.at, 0)).join(', ')}} of a skill's whole mastery, every action of that skill gets faster for good: {{MASTERY_CHECKPOINTS.map(c => '+' + pct(c.speed, 0)).join(', ')}}.
- Mastery is permanent. You will reach level {{MAX_LEVEL}} in a skill long before its best action is mastered, so mastery is the long tail of skilling.

## Pets and capes

Each skill has a [[/pets|pet]], {{PETS.length}} in all, found at random while you train it. The chance on each action grows with your level in the skill and with the length of the action: at level {{MAX_LEVEL}}, a pet comes after about {{time(PET_BASE / MAX_LEVEL * 1000)}} of training on average, sooner with faster actions. A pet is kept forever and gives a small bonus to its skill, such as {{PETS.find(p => p.id === 'pebble').desc}} from Pebble, the mining pet.

Level {{MAX_LEVEL}} in a skill earns its [[/capes|cape]]: a lasting bonus to that skill (for Mining, {{CAPES.find(c => c.skill === 'mining').perk.charAt(0).toLowerCase() + CAPES.find(c => c.skill === 'mining').perk.slice(1)}}) and a cloak your hero can wear. Level {{(() => { let l = 1; while (xpForLevel(l) < xpForLevel(MAX_LEVEL) / 2) l++; return l; })()}} is about halfway to {{MAX_LEVEL}} in XP; see the [[/xp-table|XP table]].

## Focus, mini-games and the bonfire

- **Focus.** Leave the game alone for {{BASE.focusAfterMs / 1000}} seconds and your hero settles in: +{{pct(BASE.focusSkillSpeed, 0)}} speed in every skill but Farming, until your next click or key. It counts while you are away, too.
- **A chance to play.** While you train {{NON_COMBAT_SKILLS.map(id => SKILLS[id].name).join(', ').replace(/, ([^,]*)$/, ' or $1')}}, a short mini-game turns up every {{BALANCE.minigame.opportunityEveryMs[0] / 60000}} to {{BALANCE.minigame.opportunityEveryMs[1] / 60000}} minutes and waits {{BALANCE.minigame.opportunityWindowMs / 1000}} seconds. Win it for +{{pct(BALANCE.minigame.baseBonus, 0)}} speed in that skill for {{BALANCE.minigame.boostMs / 1000}} seconds; a streak of wins raises it to +{{pct(BALANCE.minigame.maxBonus, 0)}}. Skipping costs nothing. See [[/mini-games|Mini-games and Focus]].
- **The bonfire.** Every log burnt in Firemaking adds {{BASE.bonfireSecondsPerLogTier}} seconds times the log's tier to the bonfire, up to {{BASE.bonfireMaxMs / 60000}} minutes. While it burns, every skill earns +{{pct(BASE.bonfireXp, 0)}} XP, combat included, rising to +{{pct(BASE.bonfireXpAt99, 0)}} at Firemaking {{MAX_LEVEL}}. It burns down on the clock, so fill it up before a session of other work, not before a long break.

## Training while you are away

The action your hero is working on carries on while the game is closed, up to the offline limit ({{BASE.baseOfflineHours}} hours to start). The **Welcome back** report says what was made and used.

- Work stops when its inputs run out. Cooking needs raw food and a log for every dish; smelting needs ore, and coal for most bars; brewing needs both its ingredients. A gathering skill needs nothing, so it is a safe choice for a long break.
- Before you leave, stock up on whatever your action uses.
- Farming plots grow on the clock whatever you do, and the report says how many are ready to harvest.

More in [[/offline|Offline progress and saves]].

## Perks for skillers

Two [[/perks|perks]], bought with skill points from prestige, are made for skilling:

- **Forager**: {{PERKS.find(p => p.id === 'forager').desc}} a level, up to {{PERKS.find(p => p.id === 'forager').max}} levels. It speeds up {{NON_COMBAT_SKILLS.map(id => SKILLS[id].name).join(', ').replace(/, ([^,]*)$/, ' and $1')}}, but not Smithing, Crafting, Farming or Agility.
- **Scholar**: {{PERKS.find(p => p.id === 'scholar').desc}} a level, up to {{PERKS.find(p => p.id === 'scholar').max}} levels, combat included.

**Endurance** ({{PERKS.find(p => p.id === 'endurance').desc}} a level) lets your hero work longer while you are away.

## Medals for skillers

Many [[/medals|medals]] reward skilling, and each also adds +{{pct(ACHIEVEMENT_GLOBAL_BONUS, 0)}} to every skill's speed. Level {{ACHIEVEMENTS.find(a => a.id === 'excavator').req.level}} in a gathering skill earns one with a speed bonus in it ({{['excavator', 'lumberjack'].map(id => ACHIEVEMENTS.find(a => a.id === id)).map(a => `${a.name}: ${a.reward}`).join('; ')}}), and mastery has its own: {{['practised', 'polymath', 'grandmaster'].map(id => ACHIEVEMENTS.find(a => a.id === id)).map(a => `${a.name} (${a.desc.charAt(0).toLowerCase()}${a.desc.slice(1)}: ${a.reward})`).join(', ')}}.
