---
path: /combat
keywords: fight, fighting, battle, stage, stages, boss, boss timer, regroup, death, fall, health, regeneration, attack, defence, damage, attack speed, critical hit, crit, dodge, lifesteal, strike, chain, rally, combo, focus, gold, xp, loot, drops, gilded, pity, bosses' due, stay on this stage, retreat, world map, travel, strikes, gilded monsters
aliases: Fighting, Battle, Combo, Strikes, Gilded monsters, Boss timer, Bosses' due
---
Your hero fights by himself. He and the monster in front of him attack on their own timers, and when the monster falls the next one steps up. You can simply watch, help with strikes, and spend what the fight brings. The same fight runs the stage ladder, [[Dungeons|dungeon runs]] and [[The Titan]], and it goes on while you are away ([[/offline|offline progress]]).

## Stages and lands

The fight is a ladder of stages. Each kill moves your hero one stage on, and every {{STAGES_PER_ZONE}} stages make a land with its own monsters and loot: {{ZONES.length}} lands, the last of them [[The Abyss]], which goes on without end past stage {{AUTHORED_STAGES}} (see [[Zones]]). Every {{STAGES_PER_ZONE}}th stage is a boss.

The first time through stages {{BALANCE.combat.firstPack.from}} to {{BALANCE.combat.firstPack.to}}, a stage you have never cleared holds a pack of {{BALANCE.combat.firstPack.size}} monsters, one after another, and the stage only moves on when the last one falls (pips under the stage on the path count them). A boss always stands alone, and ground you have cleared before is one fight a stage, so a run after a [[Prestige|prestige]] climbs as fast as ever. There are no packs in a [[Trials|Trial]] or while you stay on a stage.

The first stages are gentle: at stage 1 a monster hits with {{pct(BALANCE.enemy.ease.atk, 0)}} of its attack and has {{pct(BALANCE.enemy.ease.hp, 0)}} of its health, rising evenly to its full figures by stage {{BALANCE.enemy.ease.to + 1}}. It still pays gold on its full health.

## Bosses and the boss timer

A boss has {{BALANCE.enemy.bossHpMult}} times the health and {{BALANCE.enemy.bossAtkMult}} times the attack of the monsters of its stage, and it must fall within {{BALANCE.combat.bossTimeMs / 1000}} seconds of fighting. The clock only runs while your hero fights, so it works the same while you are away.

From stage {{BALANCE.enemy.stageBoss.from}} the bosses grow tougher and hit softer, evenly, until from stage {{BALANCE.enemy.stageBoss.to}} a boss has {{BALANCE.enemy.stageBoss.hp}} times its monsters' health and hits as hard as they do. Living through its blows is no longer the hard part: felling it in time is, and that takes attack. A better weapon is what gets your hero past a boss that keeps holding out. A boss still pays for {{BALANCE.enemy.bossHpMult}} times its monsters' health.

If the boss holds out, your hero steps back one stage to regroup. He fights on there without moving on for {{time(BALANCE.combat.regroupMs)}} of fighting, then tries the boss again by himself. Tap the boss on the stage path to try again at once: beating it ends the wait.

A boss pays its bonus only the first time it falls in a run, the kill that moves you on: {{BALANCE.rewards.bossGoldMult}} times the gold, {{BALANCE.rewards.bossXpMult}} times the XP and far better loot (see Drops below). A boss beaten again later in the run, or one you stay on, pays like the ordinary monsters its health is worth, so parking on a boss is never the best way to farm.

## When your hero falls

On the stage ladder a fall sends your hero back to the first stage of the land he is in. If he fell on that first stage he goes back one stage more, but never onto the boss of the land before. He gets up with {{pct(BALANCE.combat.deathHpFraction, 0)}} of his health, rests at the campfire until it is full (about {{time(1000 * (1 - BALANCE.combat.deathHpFraction) / BALANCE.combat.regenResting)}}), then fights on from there by himself. Your best stage this run is kept: the stage path and the map take you back.

While he rests, **Stay at camp** keeps him out of the fight; starting work in a skill does the same.

In a [[Dungeons|dungeon]] a fall loses the run: he rests, then fights on at the stage he left. At [[The Titan]] a fall ends the attempt, and he goes back to what he was doing when you challenged it: his work, his rest, or (after a rest) the fight at the stage he left.

## Health and regeneration

Your hero's health is {{BASE.baseHp}} at combat level 1 and {{BASE.hpPerCombatLevel}} more for every level after (the table below), plus one for every {{1 / BASE.hpPerDef}} defence his gear carries. Health bonuses then multiply it: [[Perks]], [[Medals]], the [[Camp]]'s Hearth, the Health Potion, prestige tokens and more.

Health does not refill between monsters. While he fights your hero regains {{pct(BALANCE.combat.regenInCombat)}} of his health a second. Out of the fight (resting, retreated or working in a skill) he regains {{pct(BALANCE.combat.regenResting, 0)}} a second, from empty to full in {{time(1000 / BALANCE.combat.regenResting)}}. A combat level-up fills his health at once (not while fighting in the Fasting [[Trials|Trial]]). [[Food]] and lifesteal do the rest in a long fight.

## Attack, defence and damage

Attack is {{BASE.unarmedAtk}} (his fists) plus what his [[Equipment|gear]] gives, multiplied by his bonuses: each combat level adds {{pct(BASE.atkPerCombatLevel)}} (the table below), and perks, medals, pets, the camp's Whetstone, prestige tokens and potions add more. Defence comes from gear alone (armour, and a little from jewellery) and is multiplied the same way.

Each of your hero's hits deals his attack, give or take a little, and a critical hit more. Monsters have no defence. A monster's hit is softened by your defence: it deals its attack × its attack ÷ (its attack + your defence), at least 1. Defence equal to the monster's attack halves its hits, and no amount of defence takes off more than {{pct(MAX_MITIGATION, 0)}}:

{{table(['Your defence', 'Of its hit you take #'], [['none', 0], ['half its attack', 0.5], ['equal to its attack', 1], ['three times its attack', 3], [`${fmt(MAX_MITIGATION / (1 - MAX_MITIGATION))} times its attack or more`, MAX_MITIGATION / (1 - MAX_MITIGATION)]].map(([label, k]) => [label, pct(enemyDamage(1e6, k * 1e6) / 1e6, 0)]), { sort: false })}}

## Attack speed

Your hero attacks every {{fmt(BASE.baseAttackInterval / 1000)}} seconds. Attack speed bonuses divide that time: the Rogue perk, gear bonuses, unique items, the Waterfall obstacle of [[/skills/agility|Agility]] and Focus. The bonus stops at +{{pct(BASE.caps.attackSpeed, 0)}}, an attack every {{fmt(BASE.baseAttackInterval / (1 + BASE.caps.attackSpeed) / 1000)}} seconds.

After {{time(BASE.focusAfterMs)}} without a click or a key press your hero settles into [[/mini-games|Focus]]: +{{pct(BASE.focusAttackSpeed, 0)}} attack speed until your next input. A strike is input, so striking ends Focus.

A monster attacks every {{fmt(BALANCE.enemy.baseInterval / 1000)}} seconds at stage 1, {{BALANCE.enemy.intervalPerStage}} milliseconds sooner each stage, and never faster than every {{fmt(BALANCE.enemy.minInterval / 1000)}} seconds (from stage {{Math.ceil((BALANCE.enemy.baseInterval - BALANCE.enemy.minInterval) / BALANCE.enemy.intervalPerStage)}} on).

## Critical hits, dodge and lifesteal

- **Critical hits:** at first {{pct(BASE.baseCritChance, 0)}} of your hero's hits are critical and deal {{BASE.baseCritDmg}} times the damage. Gear bonuses, unique items, the Living Legend medal and the Gap Leap obstacle raise the chance; gear bonuses and uniques raise the damage.
- **Dodge:** a chance to avoid a monster's hit completely. It comes from gear bonuses, unique items and the Rock Wall obstacle.
- **Lifesteal:** each of your hero's hits heals him a share of the damage it deals. It comes from gear bonuses and unique items. It heals at most {{pct(BASE.lifestealPerSecond, 0)}} of his health a second, all of it together, and only from damage a monster really takes (the rest of a killing blow heals nothing): enough to keep him going in easy fights, not to carry him where monsters hit hardest, where [[Food|food]] and [[Potions|potions]] do. The Inventory shows his lifesteal beside his other numbers. There is none in the Fasting Trial.

The totals are capped (critical damage is not):

| Bonus | Cap |
| --- | ---: |
| Critical chance | {{pct(BASE.caps.critChance, 0)}} |
| Dodge | {{pct(BASE.caps.dodge, 0)}} |
| Lifesteal | {{pct(BASE.caps.lifesteal, 0)}} |
| Attack speed | +{{pct(BASE.caps.attackSpeed, 0)}} |

## Strikes and the combo

Tap the monster (or press Space) to strike: a hit for {{pct(BALANCE.combat.manualHitMult, 0)}} of your hero's attack, on top of his own attacks. Strikes count at most {{fmt(1000 / BALANCE.combat.strikeGapMs)}} times a second: clicking faster adds nothing.

Each strike builds the combo, up to {{BALANCE.combat.comboMax}}; each one adds a little less as it grows. Every point of combo makes all your hero's hits, his own and your strikes, deal {{pct(BALANCE.combat.comboDmgPerStack, 0)}} more: +{{pct(BALANCE.combat.comboMax * BALANCE.combat.comboDmgPerStack, 0)}} at full combo. Strikes matter most against a boss on its timer and in the Titan's race.

The combo starts to fall {{fmt(BALANCE.combat.comboDecayAfterMs / 1000)}} seconds after your last strike, faster the higher it is, and it is gone when your hero leaves the fight or falls.

## The chain

Every {{BALANCE.chain.everyMs[0] / 1000}} to {{BALANCE.chain.everyMs[1] / 1000}} seconds of a fight you are watching, {{BALANCE.chain.points}} numbered points appear over it. Strike them in order, 1 to {{BALANCE.chain.points}}, within {{BALANCE.chain.ms / 1000}} seconds, and they pay {{BALANCE.chain.goldKills}} kills' worth of gold at your stage. Finish within {{BALANCE.chain.fastMs / 1000}} seconds and your hero **rallies** too: +{{pct(BASE.rallyAttackSpeed, 0)}} attack speed for {{BALANCE.chain.rallyMs / 1000}} seconds.

A click on the wrong number, or anywhere else, does nothing and costs nothing; the chain counts one click every {{BALANCE.chain.clickGapMs / 1000}} seconds at most. The points never sit on the monster, and a click on the monster is always a strike, so you can keep striking while a chain is up; striking its points in turn keeps your combo from fading. When the time runs out the points go, and the next chain comes as usual. The chain only comes while the fight is on your screen, and clicking it doesn't end [[Mini-games and Focus|Focus]]. It is a small bonus for watching: your strikes are what count in a fight.

## Food and potions

Below {{pct(BASE.baseAutoEatThreshold, 0)}} of his health your hero eats, and just before a blow that would fell him while the run climbs. With **Auto** he picks the smallest food that fills the gap. See [[Food]].

A [[Potions|potion]] picked on the Combat tab is drunk as the fight starts, and one bottle lasts {{POTION_MINUTES}} minutes of fighting; what it raises it multiplies, after every other bonus.

## What a kill pays

- **Gold:** {{pct(BALANCE.rewards.goldPerHp, 0)}} of the monster's full health, {{BALANCE.rewards.bossGoldMult}} times that for a boss's first fall, raised by gold bonuses (the Fortune perk, medals, gear). Gold is the run's money: it buys [[Camp]] upgrades and [[Shop|supplies]], and it is gone at the next prestige.
- **Combat XP:** {{BALANCE.rewards.xpBase}} × the stage to the power {{BALANCE.rewards.xpExp}}, {{BALANCE.rewards.bossXpMult}} times that for a boss's first fall, so deeper stages teach more (the table below). XP bonuses multiply it: Combat XP gear bonuses, [[/mini-games|the bonfire]], medals.
  - **A fast start:** at combat level 1 a kill teaches {{1 + BALANCE.rewards.fastStart.extra}} times as much, the bonus shrinking evenly to nothing at level {{BALANCE.rewards.fastStart.below}}.
  - **The slowdown:** from combat level {{BALANCE.rewards.xpPace.from}} each kill teaches less the higher you rise, down to 1/{{BALANCE.rewards.xpPace.slow}} as much from level {{BALANCE.rewards.xpPace.to}}, so level {{MAX_LEVEL}} is a long road.
- **The bestiary:** every kind of monster you defeat is counted, with a star at {{KILL_STARS.slice(0, -1).map(n => fmt(n)).join(', ')}} and {{fmt(KILL_STARS.at(-1))}} defeats of a kind (see [[Monsters]]).
- **A pet:** each kill is a small chance that {{PETS.find(p => p.skill === 'combat').name}}, the fight's pet, finds you (see [[Pets]]).

## Drops

Each kill rolls for loot from the land it is in. A boss's first fall in a run is the big one:

| Drop | An ordinary kill | A boss's first fall |
| --- | --- | --- |
| A material from the land's loot table | {{pct(BALANCE.rewards.materialDropChance, 0)}} | always |
| A gem of about the land's tier | {{pct(BALANCE.rewards.gemDropChance, 0)}} | far more likely |
| [[Monster Essence]] | {{pct(BALANCE.rewards.essenceDropChance, 0)}}, a little | always, {{BALANCE.rewards.bossEssence[0]}} to {{BALANCE.rewards.bossEssence[1]}}, more in richer lands |
| A piece of gear | {{pct(GEAR_DROP_CHANCE.regular, 1)}} | {{pct(GEAR_DROP_CHANCE.boss, 0)}} |

- Materials come one at a time in the first lands and several at a time in the richer ones. Each land's loot table is on its page ([[Zones]]).
- A gem is of the land's tier or one either side of it, the lower ones likelier.
- From depth {{VOIDSTONE_DEPTH}} of the Abyss (stage {{AUTHORED_STAGES + (VOIDSTONE_DEPTH - 1) * STAGES_PER_ZONE + 1}}), a boss's first fall (and a Titan that deep) also leaves a [[Voidstone]] {{pct(VOIDSTONE_CHANCE, 0)}} of the time. Nothing else gives one.
- Drop chance bonuses (the Fortune perk, medals, dungeon milestones, weekend events) raise these chances.
- Which piece of gear drops, and how its tier, rarity and kind are picked, is on [[Equipment]].
- A new hero's first kill leaves him a sword, and the first boss he beats to move on (not one he stays on) always leaves a piece of armour.

## Gilded monsters

Now and then an ordinary monster of the stage ladder comes gilded, one in {{1 / BALANCE.rewards.gildedChance}}, with a gold glow and a chime. It is the same fight for {{BALANCE.rewards.gildedGoldMult}} times the gold and {{BALANCE.rewards.gildedXpMult}} times the XP, and it always leaves a gem and {{BALANCE.rewards.gildedEssence[0]}} to {{BALANCE.rewards.gildedEssence[1]}} essence (more in richer lands). Bosses, dungeon monsters and the Titan are never gilded, and a new hero meets his first one early on.

The Gold Rush medal makes them come {{pct(achievementById('gold_rush').mods.gildedChance, 0)}} more often, and the {{eventById('gold_fever').name}} weekend makes them {{1 + eventById('gold_fever').mods.gildedChance}} times as common.

## The bosses' due

Bosses are where gear comes from, and a run of bad luck has an end. A boss's first fall in a run that leaves no upgrade marks one on the gold ring round the boss on the stage path, as long as the land's gear could still beat something your hero wears. The {{PITY_MARKS}}th mark brings a sure piece of the land's own tier for his weakest weapon or armour slot. An upgrade from a boss wipes the marks, and they carry over from one run to the next.

## Staying, retreating and travelling

- **Stay on this stage** (a switch beside the fight) keeps your hero on the stage he is on instead of moving on: to gather a land's loot, or to hold where he wins. A boss you stay on pays like ordinary monsters, no packs form, and the Auto prestige waits while you stay.
- **Retreat** takes your hero out of the fight. He rests and regains health quickly, and goes back in when you start the fight again. The monster he left gets its breath back too: it is whole again, a boss's timer starts over, and a pack starts again from its first monster, so retreating to rest never wears a boss down. Starting work in a skill does the same. In a dungeon the button says **Leave dungeon** (the run is lost), and at the Titan **Give up** (the attempt ends, and your hero goes back to what he was doing before it).
- The **stage path** under the fight shows the {{STAGES_PER_ZONE}} stages of the land you are in. Tap any stage you have reached this run to go there.
- The **world map** (the Map button, or the M key) shows the lands and the dungeons. **Travel** takes your hero to the first stage of any land reached this run (in the Abyss, to the deepest depth reached), and a dungeon's **Enter** starts a run there. Travelling gives up a dungeon run under way; a Titan fight has to end first.

## How monsters grow

A monster at stage 1 has {{BALANCE.enemy.baseHp}} health and {{BALANCE.enemy.baseAtk}} attack (before the gentle start), and every stage adds to both:

| Stages | Health | Attack |
| --- | --- | --- |
| 1 to {{AUTHORED_STAGES}} | +{{pct(BALANCE.enemy.hpGrowth - 1)}} a stage, ×{{fmt(BALANCE.enemy.hpGrowth ** STAGES_PER_ZONE)}} a land | +{{pct(BALANCE.enemy.atkGrowth - 1)}} a stage |
| {{AUTHORED_STAGES + 1}} to {{BALANCE.enemy.deepFrom}}, the Abyss | +{{pct(BALANCE.enemy.abyssHpGrowth - 1)}} a stage, ×{{fmt(BALANCE.enemy.abyssHpGrowth ** STAGES_PER_ZONE)}} a depth | +{{pct(BALANCE.enemy.abyssAtkGrowth - 1)}} a stage |
| {{BALANCE.enemy.deepFrom + 1}} to {{BALANCE.enemy.denseFrom}}, the deep Abyss | from +{{pct(BALANCE.enemy.deepHpGrowth - 1)}} a stage evenly down to +{{pct(BALANCE.enemy.denseHpGrowth - 1)}} | from +{{pct(BALANCE.enemy.deepAtkGrowth - 1)}} down to +{{pct(BALANCE.enemy.denseAtkGrowth - 1)}} |
| past {{BALANCE.enemy.denseFrom}} | +{{pct(BALANCE.enemy.denseHpGrowth - 1)}} a stage, ×{{fmt(BALANCE.enemy.denseHpGrowth ** STAGES_PER_ZONE)}} a depth | +{{pct(BALANCE.enemy.denseAtkGrowth - 1)}} a stage |

The Abyss grows faster than the lands above it, so the climb slows there; past stage {{BALANCE.enemy.deepFrom}} the growth eases off, and the gear that drops eases with it more slowly, so the long climb keeps moving without end. A boss has the multiples above on top.

**Supplies:** from stage {{BALANCE.enemy.supply.from}} every monster's health and attack grow further, evenly, to ×{{fmt(BALANCE.enemy.supply.mult)}} by stage {{BALANCE.enemy.supply.to}} and from then on, in the [[Dungeons]] and against [[The Titan]] too. The [[Potions|fight potions]] grew by as much, so a hero who drinks one fares as before, and one without food and potions falls well behind. Gold and loot keep the old figures. The table below gives a monster's health, attack and pay at stages along the way.
