---
path: /guides/getting-started
title: Getting started
section: Guides
sectionPath: /guides
icon: item/Weapon/3
order: 10
summary: A new player's first hour in Fantasy Idle, step by step: the first fight, the first boss, the first prestige and the first skills.
keywords: beginner, new player, first hour, how to play, tutorial, start, guide hand, rusty sword, first boss, first prestige
---
Fantasy Idle plays itself, but it helps to know what you are looking at. This page follows a new hero through the first hour, in the order things happen.

## The title card

The game opens on a title card: your hero on a sunny meadow, with a slime waiting nearby.

- **Name your hero**, if you like. Without a name your hero is simply "You". You can change the name any time in Settings.
- **Pick a look** with the arrows beside your hero. {{LOOKS.filter(l => !l.medal).length}} looks are open from the start, and {{LOOKS.filter(l => l.medal).length}} more are earned with medals (see [[/looks|Hero looks]]).
- Press **Begin your adventure** and the first fight starts. If you already play on another device, **Have an account? Sign in** brings your [[/offline|cloud save]] instead.

## The first fight

The fight fills the screen. Your hero and the monster attack on their own timers, so you do not have to do anything: your hero wins the first fights alone.

- **Tap the monster** (or press **Space** on a keyboard) to strike as well. A strike hits for {{pct(BALANCE.combat.manualHitMult, 0)}} of a normal attack and builds a **combo**.
- Each combo stack adds {{pct(BALANCE.combat.comboDmgPerStack, 0)}} damage to every hit, your hero's own attacks included, up to {{BALANCE.combat.comboMax}} stacks. Stop striking for {{BALANCE.combat.comboDecayAfterMs / 1000}} seconds and it starts to fade. A big combo also brings extra critical hits, then lifesteal, and at its top the odd echo strike.
- Each monster you beat moves you on a stage. Every {{STAGES_PER_ZONE}}th stage is a boss, and each run of {{STAGES_PER_ZONE}} stages is a place of its own (see [[/zones|Zones]]).
- The first stages are gentle: the monsters hit softer and have less health, growing to their full strength over the first {{BALANCE.enemy.ease.to}} stages.
- Combat levels come quickly at first, and every combat level refills your hero's health. Each level adds {{BASE.hpPerCombatLevel}} health and {{pct(BASE.atkPerCombatLevel, 1)}} attack and defence.

## The hand that points

Now and then a white glove appears, pressing on something. It points at the one thing worth doing right now:

- the monster, until you have struck it a few times;
- the **Equip** button, when your first piece of gear is waiting in the bag;
- the cheapest camp upgrade, the first time you can afford one;
- the boss's skull on the stage path, after a boss has held out (tap it to fight the boss again at once);
- the first vein on the Mining tab, before you have worked any skill;
- and later, the Prestige button and your first perk.

It waits a few seconds before it comes, so if you were about to do the thing anyway you never see it. It never clicks for you. It is only there for a new hero: once you have prestiged and learned a perk, it is gone for good.

## The Rusty Sword

Your hero starts with bare fists. The first monster you beat leaves a **Rusty Sword**, rising out of it in a beam of light, and a **▲ Equip** button appears in the fight's dock. Tap it: the sword doubles your hero's attack.

From then on the same button appears whenever the bag holds something better than what your hero wears, and a green ▲ marks better gear in the Inventory. The first boss you beat always leaves a piece of armour: a helm, a body or a shield. More on gear in [[/equipment|Equipment]].

## The camp

Every kill pays gold, and gold buys [[/camp|camp]] upgrades. They sit in the dock under the fight:

- the **Whetstone**: {{CAMP_UPGRADES.find(u => u.id === 'whetstone').short}} a level, the first for {{campCost(CAMP_UPGRADES.find(u => u.id === 'whetstone'), 0)}} gold;
- the **Hearth**: {{CAMP_UPGRADES.find(u => u.id === 'hearth').short}} a level, the first for {{campCost(CAMP_UPGRADES.find(u => u.id === 'hearth'), 0)}} gold;
- the **Armour Rack**: {{CAMP_UPGRADES.find(u => u.id === 'armory').short}} a level. It appears once your hero wears some armour, so it has defence to raise.

Each level costs {{CAMP_UPGRADES[0].growth}} times as much as the one before, up to {{CAMP_UPGRADES[0].max}} levels each. An upgrade you can afford lights up. The camp is for this run only: a prestige packs it up, and you buy it again.

## The first boss

Stage {{STAGES_PER_ZONE}} is the first boss, the [[Goblin Chieftain]]. A boss must fall within {{BALANCE.combat.bossTimeMs / 1000}} seconds of fighting, and a timer shows how much is left.

- If the boss holds out, your hero steps back a stage and regroups: {{BALANCE.combat.regroupMs / 1000}} seconds of fighting there, then the boss again, all by itself.
- You need not wait. Tap the boss's skull on the stage path to fight it again at once. A boss is a race against its timer, so this is where your strikes count most.
- Beat it and your hero walks into a new place, the [[Whispering Forest]].

If your hero's health runs out, your hero falls back to the start of the place, rests at the campfire until healed, then goes back into the fight. Nothing is lost but a few stages.

## Packs on new ground

On your first trip through stages {{BALANCE.combat.firstPack.from}} to {{BALANCE.combat.firstPack.to}}, a stage you have never cleared holds a pack of {{BALANCE.combat.firstPack.size}} monsters instead of one. Pips under the stage on the path fill as they fall. A boss always stands alone. Once a stage is cleared it is a single fight again, so later runs climb through quickly.

## New places, one at a time

The sidebar starts small: Combat, Mining, the Inventory and Settings. New places open as you go, and the sidebar's **Next** card shows the next goal and how far along you are.

Places you reach by fighting open one at a time, with a breather between them so you can meet each one: the first after {{PLACE_GAPS_MS[0] / 60000}} minutes of play, and the gaps grow to {{PLACE_GAPS_MS[PLACE_GAPS_MS.length - 1] / 60000}} minutes. When several are ready, they come in this order:

1. [[/skills/hunting|Hunting]]: {{UNLOCKS.find(u => u.id === 'hunting').task.replace(/^./, c => c.toLowerCase())}}.
2. [[/prestige|Prestige]]: {{UNLOCKS.find(u => u.id === 'prestige').task.replace(/^./, c => c.toLowerCase())}}.
3. [[/dungeons|Dungeons]]: {{UNLOCKS.find(u => u.id === 'dungeons').task.replace(/^./, c => c.toLowerCase())}}.
4. [[/skills/alchemy|Alchemy]]: {{UNLOCKS.find(u => u.id === 'alchemy').task.replace(/^./, c => c.toLowerCase())}}.
5. The [[/shop|Shop]]: {{UNLOCKS.find(u => u.id === 'shop').task.replace(/^./, c => c.toLowerCase())}}.
6. Achievements, the hall of [[/medals|medals]]: {{UNLOCKS.find(u => u.id === 'achievements').task.replace(/^./, c => c.toLowerCase())}}.
7. The [[/clans|Clan]], after your first prestige.
8. The [[/events|weekend events]], after your first prestige, when a festival is on or near.
9. [[/skills/agility|Agility]]: {{UNLOCKS.find(u => u.id === 'agility').task.replace(/^./, c => c.toLowerCase())}}.

A place that is ready but waiting its turn shows as **On its way**. The breather only counts while you play with the game in view. Come back after some time away and the place that was waiting opens at once. No place opens during a boss fight.

Places you earn by working open within {{WORK_GAP_MS / 60000}} minutes of the work:

- [[/skills/smithing|Smithing]]: {{UNLOCKS.find(u => u.id === 'smithing').task.replace(/^./, c => c.toLowerCase())}}.
- [[/skills/woodcutting|Woodcutting]]: {{UNLOCKS.find(u => u.id === 'woodcutting').task.replace(/^./, c => c.toLowerCase())}}.
- [[/skills/cooking|Cooking]]: {{UNLOCKS.find(u => u.id === 'cooking').task.replace(/^./, c => c.toLowerCase())}}.
- [[/skills/fishing|Fishing]]: {{UNLOCKS.find(u => u.id === 'fishing').task.replace(/^./, c => c.toLowerCase())}}.
- [[/skills/firemaking|Firemaking]]: {{UNLOCKS.find(u => u.id === 'firemaking').task.replace(/^./, c => c.toLowerCase())}}.
- [[/skills/farming|Farming]]: {{UNLOCKS.find(u => u.id === 'farming').task.replace(/^./, c => c.toLowerCase())}}.
- [[/skills/crafting|Crafting]]: {{UNLOCKS.find(u => u.id === 'crafting').task.replace(/^./, c => c.toLowerCase())}}, once you have found a gem.

The whole list, with what each place is for, is on [[/places|Places and unlocks]].

## The first prestige

Prestige is how a run turns into lasting power. It opens soon after the [[Elder Treant]], the boss at the end of the forest, has fallen, first of the places then waiting.

- Your best stage this run becomes **tokens**. Each token gives +{{pct(BASE.tokenAtk, 1)}} attack and defence and +{{pct(BASE.tokenHp, 1)}} health, for good.
- You earn at least one **skill point** to spend on a [[/perks|perk]].
- Your stage, your gold and the camp start over. Skills, gear, materials and everything else stay.

The first prestige is there to teach the loop, so it needs no waiting. The Prestige button in the dock glows and the hand points at it. The dialog shows what you gain and what starts over: press **Prestige now**. Then the hand points at **Perks**: learn your first one. Prestiging at the start of the [[Glimmering Caves]] pays {{tokensForStage(2 * STAGES_PER_ZONE + 1)}} tokens.

The next run starts at {{pct(BALANCE.prestige.startStageFraction, 0)}} of your best stage and climbs back fast, since ground you have cleared is one fight a stage. After this first one, a run must last {{BALANCE.prestige.minRunMs / 60000}} minutes before it can be prestiged, and the Prestige button glows once a run has gone {{BALANCE.prestige.readyStallMs / 60000}} minutes without a new best stage. That is your wall, and the time to prestige again. More in [[/prestige|Prestige]] and [[/guides/combat-progress|Getting past a wall]].

## Mining and Smithing

[[/skills/mining|Mining]] is open from the start. Tap the **Copper Vein** and your hero digs {{res('copper_ore')}}, one every {{SKILLS.mining.nodes[0].interval / 1000}} seconds at first, even while you are away.

Your hero does one thing at a time. Starting work takes your hero out of the fight, and going back to the fight stops the work.

Mining a few ores opens [[/skills/smithing|Smithing]], which works in steps:

- **Smelt**: ore into bars. A {{res('copper_bar')}} takes one copper ore, and your first bar opens Woodcutting.
- **Forge**: copper bars into a first set of weapons and armour, from a sword at Smithing 1 to a body at Smithing {{smithLevelReq(METALS[0], 'Body')}}. Stronger weapons and armour only drop in the fight.
- **Tools**: a Copper Pickaxe or a Copper Axe, at Smithing {{TOOLS.pickaxe.tiers[0].levelReq}}, from copper bars and a log. Each makes its skill faster.
- **Anvil**: from Smithing {{ANVIL_LEVEL_PER_UPGRADE}}, bars of a piece's own metal (and some essence) reinforce the weapon or armour your hero wears.

Iron comes next: the Iron Vein at Mining {{SKILLS.mining.nodes.find(n => n.id === 'iron_ore').levelReq}}, and iron bars at Smithing {{SMELTING_RECIPES.find(r => r.id === 'iron_bar').levelReq}}. Each iron bar also takes a lump of {{res('coal')}}, which you can mine from Mining {{SKILLS.mining.nodes.find(n => n.id === 'coal').levelReq}}. See [[/guides/training-skills|Training skills]] for how the skills fit together.

## Food and cooking

Hunting is the first place to open by fighting. Hunt a rabbit and [[/skills/cooking|Cooking]] opens: roast {{res('raw_rabbit')}} into {{res('cooked_rabbit')}}. Every dish burns one log as fuel, so keep some logs.

Once you can cook, a **Food** row appears under the fight. Your hero eats when health falls below {{pct(BASE.baseAutoEatThreshold, 0)}}. On **Auto** your hero picks the smallest dish that fills the gap; you can also choose one dish, or **None**. Food keeps your hero standing through long climbs. A few dishes in, [[/skills/fishing|Fishing]] opens: fish cook into food that heals a little more than meat of the same level. More in [[/food|Food]].

## The daily crate

A **Daily crate** button shows when a crate is ready, and your first one is waiting from the start. A new crate ripens every {{DAILY_INTERVAL_MS / 3600000}} hours, and up to {{DAILY_MAX_BANKED}} wait for you, so a missed day costs nothing. Each holds gold, essence, materials and a gem, more the deeper your best stage. Every {{GREAT_CRATE_EVERY}}th crate you open is a **great crate**, with more of everything. See [[/daily-crate|Daily crate]].

> Tip: gold starts over at each prestige, so open a crate when you can spend its gold, early in a run.

## While you are away

Close the game and your hero carries on with whatever was under way, the fight or a skill, for up to {{BASE.baseOfflineHours}} hours. When you come back, a **Welcome back** report shows what happened. [[/skills/farming|Farming]] plots grow on the clock either way.

- Work stops early when its materials run out (cooking needs raw food and logs), so stock up before a long break.
- In the fight your hero eats, falls, rests and fights on, just as if you were watching.
- **Focus**: leave the game alone for {{BASE.focusAfterMs / 1000}} seconds and your hero settles in, with +{{pct(BASE.focusSkillSpeed, 0)}} skill speed and +{{pct(BASE.focusAttackSpeed, 0)}} attack speed until your next click or key. Time away counts as focused too.

More in [[/offline|Offline progress and saves]] and [[/mini-games|Mini-games and Focus]].

## Where to go next

- [[/guides/combat-progress|Getting past a wall]]: what to do when your hero stops climbing.
- [[/guides/training-skills|Training skills]]: how the skills feed each other, and a good order to train them.
- [[/guides/gold|Gold]]: how you earn it and where it goes.
- [[/faq|FAQ]]: short answers to common questions.
- The reference pages: [[/combat|Combat]], [[/prestige|Prestige]], [[/skills|Skills]] and [[/equipment|Equipment]].
