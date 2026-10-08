---
path: /skills
keywords: skills, skill, levels, level 99, XP, experience, training, gathering, production, workshop, idle, offline training, pace, Melvor pace, speed
---
Besides fighting, your hero has {{SKILL_IDS.length - 1}} skills to train, each from level 1 to {{MAX_LEVEL}}. They feed each other and the fight: ore becomes bars, bars become tools and reinforce your gear, raw meat and fish become food, herbs become potions. Every level you gain is yours for good: no [[Prestige|prestige]] takes it away.

## How skills work

- **Levels.** Every skill, [[Combat]] included, uses the same [[XP table]], the one from RuneScape and Melvor Idle. Each level asks for more XP than the last: level {{MAX_LEVEL}} takes {{fmt(XP_FOR_MAX_LEVEL, { short: false })}} XP, and level {{[...Array(MAX_LEVEL).keys()].map(i => i + 1).find(l => xpForLevel(l) >= XP_FOR_MAX_LEVEL / 2)}} is only halfway there.
- **One thing at a time.** Your hero does one skill action at a time, or fights. Starting an action takes your hero out of the fight, going back to the fight stops the action, and tapping an action again stops it. [[/skills/farming|Farming]] is the exception: its plots grow on the clock while you do anything else.
- **Actions open with your level.** Each skill's actions open at set levels (the table on each skill's page). Later actions give more XP each and make better things.
- **While you are away.** Whatever your hero was doing goes on while the game is closed, for up to {{BASE.baseOfflineHours}} hours (more with the Endurance perk and the Zipline obstacle). Work stops early if it runs out of what it uses. See [[Offline progress and saves]].
- **Skills open as you go.** Only [[/skills/mining|Mining]] is open from the start; each of the others opens after some work in another skill or some progress in the fight (see [[Places and unlocks]]).

## Kinds of skills

- **Gathering:** [[/skills/mining|Mining]], [[/skills/woodcutting|Woodcutting]], [[/skills/fishing|Fishing]] and [[/skills/hunting|Hunting]] use nothing up and bring in raw materials.
- **Production:** [[/skills/cooking|Cooking]], [[/skills/firemaking|Firemaking]] and [[/skills/alchemy|Alchemy]] turn materials into food, bonfire time and potions.
- **Workshop:** [[/skills/smithing|Smithing]] and [[/skills/crafting|Crafting]] make bars, gear, jewellery and tools.
- **Growing and training:** [[/skills/farming|Farming]] grows crops on the clock, and [[/skills/agility|Agility]] is a course you build, where every obstacle is a bonus for good.

## Getting faster

An action takes its base time divided by one plus all your speed bonuses together. They come from:
- **[[Tools]]:** each tier gives its skill +{{pct(TOOL_SPEED_PER_TIER, 0)}} speed and +{{pct(TOOL_DOUBLE_PER_TIER, 0)}} chance of a double yield. You make the next tier as your levels allow, and it replaces the old one.
- **[[Mastery]]** of the action itself, the skill's [[Pets|pet]], every [[Medals|medal]] (+{{pct(ACHIEVEMENT_GLOBAL_BONUS, 0)}} each), the Forager [[Perks|perk]], agility obstacles and [[Weekend events|weekend events]].
- **Mini-games:** while you gather or produce, a chance to play turns up every {{BALANCE.minigame.opportunityEveryMs.map(ms => ms / 60000).join('–')}} minutes. Win it for +{{pct(BALANCE.minigame.baseBonus, 0)}} to +{{pct(BALANCE.minigame.maxBonus, 0)}} speed in that skill for {{BALANCE.minigame.boostMs / 1000}} seconds; skipping it costs nothing.
- **Focus:** leave the game alone for {{BASE.focusAfterMs / 1000}} seconds and your hero settles in, with +{{pct(BASE.focusSkillSpeed, 0)}} speed in every skill but Farming until your next click or key. It counts while you are away too.

More on the last two in [[Mini-games and Focus]].

## Melvor pace

As in Melvor Idle, the road to {{MAX_LEVEL}} is long, and the late actions are what make it so. An action that opens at level {{PACE_FROM}} or below gives all of its XP; one that opens at level {{PACE_TO}} or above gives its XP divided by its skill's factor, and in between the cut grows evenly. The factors are: {{Object.entries(PACE).filter(([, f]) => f > 1).sort((a, b) => a[1] - b[1]).map(([id, f]) => `${SKILLS[id].name} ÷${f}`).join(', ')}}; Farming has none. A newer action never gives less XP an hour than an older one of its kind, so moving up always pays, and the XP shown in this wiki's tables is the XP you really get. Combat has a pace of its own, by your Combat level (see [[Combat]]).

## Rewards along the way

Skill levels earn [[Medals|medals]], each with a bonus of its own on top of the small one every medal gives:

{{'<ul>' + [...new Set(ACHIEVEMENTS.filter(a => a.req.type === 'skillLevel' && a.req.skill !== 'combat').map(a => a.req.level))].sort((x, y) => x - y).map(l => `<li>Level ${l}: ${ACHIEVEMENTS.filter(a => a.req.type === 'skillLevel' && a.req.skill !== 'combat' && a.req.level === l).map(a => `${a.name} (${SKILLS[a.req.skill].name}: ${a.reward.replace(/^./, c => c.toLowerCase())})`).join(', ')}</li>`).join('') + '</ul>'}}

Each skill also has a [[Pets|pet]] that may find you while you train it, more likely the higher your level. Level {{MAX_LEVEL}} earns the skill's [[/capes|cape]], with a bonus for good, and your first level {{MAX_LEVEL}} earns the medal {{ACHIEVEMENTS.find(a => a.id === 'completionist').name}} ({{ACHIEVEMENTS.find(a => a.id === 'completionist').reward.replace(/^./, c => c.toLowerCase())}}).
