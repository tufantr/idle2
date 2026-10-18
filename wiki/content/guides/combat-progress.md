---
path: /guides/combat-progress
title: Getting past a wall
section: Guides
sectionPath: /guides
icon: mon/Orc Warlord
order: 20
summary: What to do when your hero stops climbing: better gear, the camp, food and potions, prestige, farming a stage, dungeons, the Titan, agility, medals and pets.
keywords: stuck, wall, boss timer, can't progress, falling, stronger, power, push, climb
---
Sooner or later every run reaches a stage your hero cannot get past. That is a wall, and it is part of the game: each wall is a nudge to make your hero stronger in some lasting way, or to prestige. Here is what to try, roughly in order. The first steps take seconds.

## First, read the wall

A wall comes in one of two kinds, and they want different fixes.

- **A boss holds out.** A stage boss must fall within {{BALANCE.combat.bossTimeMs / 1000}} seconds of fighting. If it escapes, your hero steps back a stage, regroups for {{BALANCE.combat.regroupMs / 1000}} seconds and tries again. This means your hero deals too little damage: you need **attack**.
- **Your hero keeps falling** on ordinary stages. This means your hero cannot take the hits: you need **defence, health and food**.

Against a boss, your own strikes help: tap the monster (or press Space) to build a combo that raises every hit. To fight a boss again without waiting out the regroup, tap its skull on the stage path.

## 1. Wear better gear

Gear is the base your hero's attack and defence are built on, and armour adds health too: one point for every {{1 / BASE.hpPerDef}} defence. It is the first thing to check.

- **Look in the bag.** When something better is waiting, the fight's dock shows **▲ Equip** and what it would do to your hero (+40% attack, say), and the Inventory marks it with a green ▲. A piece's card says the same under **Worn**.
- **Weapons and armour past copper only drop in the fight.** A boss leaves a piece {{pct(GEAR_DROP_CHANCE.boss, 0)}} of the time on its first fall in a run, an ordinary monster about one kill in {{Math.round(1 / GEAR_DROP_CHANCE.regular)}}, and dungeon chests now and then. Drops are mostly of the place's own gear tier, and lean toward what your hero lacks: a kind for an empty slot is {{DROP_EMPTY_SLOT_MULT}}× as likely, and one for a slot holding an older tier {{DROP_BEHIND_SLOT_MULT}}×.
- **Tier and rarity both count.** Each [[/equipment|tier]] is about {{fmt(GEAR_TIERS[1].power / GEAR_TIERS[0].power)}} times as strong as the one before, and the rarities run from ×1 for a common piece to ×{{RARITIES.at(-1).quality}} for a legendary one, about a tier's worth. A {{RARITIES[2].name.toLowerCase()}} piece of a new tier beats a legendary of the old one; a common one doesn't.
- **Each tier needs a [[/combat|combat]] level** to wear: {{GEAR_TIERS.map(t => `${t.name} ${TIER_WEAR_LEVEL[t.tier]}`).join(', ')}}.
- **The bosses' due.** A boss at your frontier that leaves no upgrade, where the place's gear could still beat what you wear, fills a mark on a gold ring round its stone on the stage path. The {{PITY_MARKS}}th mark brings a sure piece of the place's tier for your weakest slot.
- **Reinforce at the anvil.** From [[/skills/smithing|Smithing]] {{ANVIL_LEVEL_PER_UPGRADE}}, bars and some [[/items/essence|essence]] reinforce the slots of the weapon and armour your hero wears: +{{pct(UPGRADE_STEP, 0)}} to a piece's base attack and defence a level up to +{{MAX_UPGRADE}}, then ×{{FORGE_STEP}} a level, with no top. Each level needs more Smithing (up to 99) and more bars. Bars come from smelting, or from salvaging pieces of that metal.
- **Nothing is wasted.** The anvil's levels belong to the slot, so a better piece of the same kind has them the moment you put it on.
- **Above legendary.** From stage {{MYTHIC.from}} a boss near your best stage can leave a Mythic piece, and from {{PRIMAL.from}} a Primal one (see [[Equipment]]); once a run, the first boss you beat near your best leaves a sure piece from your best stage's depth.
- **Jewellery** (rings, an amulet, earrings) is made in [[/skills/crafting|Crafting]]; only epic and legendary jewellery drops. It is upgraded with essence and gold in the Inventory. See [[/equipment/jewellery|Jewellery]].

## 2. Spend your gold at the camp

The [[/camp|camp]] multiplies your hero's attack (the Whetstone), defence (the Armour Rack) and health (the Hearth). {{CAMP_GOLD.from}} levels of the Whetstone make attack ×{{fmt(campMultiplier(CAMP_UPGRADES[0], CAMP_GOLD.from))}}, and beside those the levels go on without end, at a set price in gold. The camp starts over at each prestige, so it is the first thing to buy in every run. When you are stuck, the gold you earn while waiting is more camp levels. See [[/guides/gold|Gold]].

## 3. Bring food

Against ordinary stages, health is the limit, and food is more health.

- Cook food and keep it on **Auto** in the fight's Food row. Your hero eats when health falls below {{pct(BASE.baseAutoEatThreshold, 0)}}, picking the smallest dish that fills the gap.
- Better food heals more: a Roast Rabbit heals {{pct(RESOURCES.cooked_rabbit.heal, 0)}} of your health, a Shark Fillet {{pct(RESOURCES.cooked_shark.heal, 0)}}. See [[/food|Food]].
- Without food, health comes back slowly while fighting ({{pct(BALANCE.combat.regenInCombat, 1)}} of the maximum a second) and quickly at rest ({{pct(BALANCE.combat.regenResting, 0)}} a second).
- The Gourmet [[/perks|perk]] makes your hero eat sooner and food heal more.

## 4. Drink a potion

[[/skills/alchemy|Alchemy]] brews [[/potions|potions]] of three kinds, each in {{TIERS.length}} tiers. For a wall on the stages, pick a combat potion in the fight's Combat potion row; for a dungeon, a dungeon potion on the Dungeons tab. A bottle lasts {{POTION_MINUTES}} minutes of fighting, the next opens by itself, and a potion multiplies what it raises: the higher the tier, the more.

| Potion | Effect | Good against |
| --- | --- | --- |
| {{POTION_KINDS.combat.name}} | {{RESOURCES.combat_potion_1.desc}} | a boss that holds out, falling, the Titan, the clan boss |
| {{POTION_KINDS.dungeon.name}} | {{RESOURCES.dungeon_potion_1.desc}} | a dungeon boss that holds out, falling in a run |

## 5. Prestige

Often a wall simply means it is time to [[/prestige|prestige]]. Before you have Auto, the Prestige button glows once a run has gone {{BALANCE.prestige.readyStallMs / 60000}} minutes without a new best stage.

- **Tokens** are never spent, so they only add up. Each gives +{{pct(BASE.tokenAtk, 1)}} attack and defence and +{{pct(BASE.tokenHp, 1)}} health. A deeper run pays far more: before any bonuses, stage 50 pays {{tokensForStage(50)}} and stage 100 pays {{tokensForStage(100)}}.
- **Records** make every token stronger: each one multiplies what tokens give by {{BASE.recordMult}}. Every {{BASE.recordStages}} stages of your best stage ever is a record, and so is every dungeon unique you hold and, later, each [[/trials|Trial]] tier you clear.
- **Skill points** buy [[/perks|perks]] that last forever: one per prestige of a run that reached at least {{pct(BALANCE.prestige.fullRunFraction, 0)}} of your best, plus one for every {{BALANCE.prestige.spStageStep}} stages of your best ever. For the fight: {{PERKS.filter(p => ['knight', 'warlord', 'rogue', 'paragon'].includes(p.id)).map(p => `${p.name} (${p.desc})`).join(', ')}}.
- The new run starts at {{pct(BALANCE.prestige.startStageFraction, 0)}} of your best stage, and with the new tokens it usually climbs past the old wall.
- After {{BALANCE.prestige.autoAfter}} prestiges, or {{time(BALANCE.prestige.autoAfterMs)}} after your first, the dock gets an **Auto** switch. It prestiges a run that has gone {{BALANCE.prestige.autoStallMs / 60000}} minutes without a new best stage, even while you are away.

## 6. Stay on a stage and grow

The **Stay on this stage** switch, beside the fight, keeps your hero on the same stage instead of moving on. It appears once you have met a setback or passed the first boss.

- Pick a stage your hero clears without falling, a little below the wall. Kills there still pay combat XP (deeper stages pay more), gold for the camp and the place's materials.
- Each combat level adds {{BASE.hpPerCombatLevel}} health and {{pct(BASE.atkPerCombatLevel, 1)}} attack and defence. From combat level {{BALANCE.rewards.xpPace.from}} on, each kill teaches less, so the late levels take a long time.
- Tap a stone on the stage path to go back to a stage of this place, or use the map to travel to any place reached this run.
- A boss pays its bonus only on its first fall in a run; farmed later, it pays like the ordinary monsters its health is worth. A boss's stage is no better to farm than the one before it.
- While you stay, the climb stops: the Prestige glow and Auto wait until you turn the switch off.

## 7. Run a dungeon

[[/dungeons|Dungeons]] open at stage {{DUNGEONS[0].unlockStage}} with the [[Goblin Warren]]: a row of elite monsters, then a boss with a {{DUNGEON_BOSS_TIME_MS / 1000}}-second timer, fought at full health with the gear you walk in with. The Dungeons tab estimates each boss fight for you.

- Every clear opens a chest: materials, essence, often a gem, now and then a piece of gear, and a fragment of the dungeon's unique item.
- {{FRAGMENTS_PER_UNIQUE}} fragments assemble the [[/uniques|unique]]: the best piece of its tier, with fixed bonuses. Each unique you hold is also a record, so your tokens grow stronger.
- Clear counts bring lasting bonuses, in every dungeon: {{DUNGEON_MILESTONES.map(m => `${m.desc} at ${m.clears} clears`).join(', ')}}.
- After the first clear you choose: **Keep going** (it runs again and again until you leave) or **End the dungeon**.

## 8. Beat the Titan

From stage {{TITAN_UNLOCK_STAGE}}, [[/titan|the Titan]] waits on the Dungeons tab, with a new attempt every {{TITAN_COOLDOWN_MS / 60000}} minutes: a {{TITAN_TIME_MS / 1000}}-second damage race. Attempts you do not use wait for you, up to {{TITAN_BANK}}.

- Each Titan you bring down is gone for good and leaves +{{pct(TITAN_BONUS.atkMult, 0)}} attack and health, forever. After the first {{TITAN_LATE_FROM}}, each leaves +{{pct(TITAN_BONUS.atkMult * (titanBonusUnits(TITAN_LATE_FROM + 1) - titanBonusUnits(TITAN_LATE_FROM)), 0)}}. The next Titan is stronger.
- A loss still pays essence for the damage you dealt. Your strikes count here too.

## 9. Build the agility course

[[/skills/agility|Agility]] obstacles are bonuses that survive prestige. In the second slot, for instance, you choose between {{AGILITY_SLOTS[1].obstacles.map(o => `${o.name} (${o.desc})`).join(', ').replace(/, ([^,]*)$/, ' and $1')}}; later slots bring gold, drops, attack speed, dodge, and more attack, defence and health. Each costs gold and materials, and can be upgraded to level {{MAX_OBSTACLE_LEVEL}}, its bonus counting once per level.

## 10. Collect medals

Every [[/medals|medal]] has its own reward, and each also adds +{{pct(ACHIEVEMENT_GLOBAL_BONUS, 0)}} attack, defence and skill speed. Many come on the way: {{['boss_1', 'slayer_1', 'boss_5', 'veteran', 'titan_slayer'].map(id => ACHIEVEMENTS.find(a => a.id === id)).map(a => `${a.name} (${a.desc.charAt(0).toLowerCase()}${a.desc.slice(1)}: ${a.reward})`).join(', ')}}.

## 11. Find Fang

[[/pets|Pets]] find you while you train. The combat pet, Fang, comes from fighting: {{PETS.find(p => p.id === 'fang').desc}}, for good. The chance grows with your combat level. At combat level {{MAX_LEVEL}} the combat [[/capes|cape]] adds {{CAPES.find(c => c.skill === 'combat').perk.toLowerCase()}} as well.

## Late in the game

From best stage {{TRIALS_FROM}} the prestige dialog offers [[/trials|Trials]], runs under one hard rule whose tiers are records, and from stage {{ASCEND_FROM}} [[/ascension|Ascension]], which trades every token for Stars that make each later prestige pay more.
