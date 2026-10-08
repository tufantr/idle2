---
path: /titan
keywords: titan, titans, the titan, hourly, damage race, challenge, attempt, permanent bonus, titan slayer, titan challenge, hourly titan
aliases: Titan challenge, Hourly Titan
---
Once an hour your hero may challenge a Titan: a race of {{TITAN_TIME_MS / 1000}} seconds to bring down a huge health pool. Each Titan defeated is gone for good and leaves your hero a little stronger for ever, and the next one is stronger too. The table below shows the first Titans.

## When you can fight

The first Titan wakes once your best stage reaches {{TITAN_UNLOCK_STAGE}}, and you challenge it from the Dungeons tab. You get one attempt an hour, and the attempts you don't use wait for you, up to {{TITAN_BANK}}: come back after a few hours and they are there. A gold **!** on the Dungeons tab says the Titan is awake and your hero can beat it.

## The damage race

- Your hero starts at full health, and the fight lasts {{TITAN_TIME_MS / 1000}} seconds of fighting.
- A Titan has {{TITAN_HP_MULT}} times the health of a boss of its stage and {{TITAN_ATK_MULT}} times its attack.
- Strikes help, and so do food and your potion.
- If the time runs out or your hero falls, the Titan stays standing. You get [[Monster Essence|essence]] for the share of its health you took off, and your best try against it is kept on the Dungeons tab.
- **Give up** ends the attempt the same way. Closing the game during the fight ends it too, and the attempt is spent.
- While the fight lasts your hero cannot travel, enter a dungeon or prestige. Challenging the Titan gives up a [[Dungeons|dungeon run]] under way.

The Dungeons tab shows how much of the Titan's health your hero would take off in the time, and how long he would last without food.

## Winning

When the Titan falls in time:

- it is gone for good, and the next Titan stands deeper;
- your hero keeps +{{pct(TITAN_BONUS.atkMult, 0)}} attack and +{{pct(TITAN_BONUS.hpMult, 0)}} health for ever, adding up with every Titan;
- it pays like a boss's first fall (gold, XP and loot), and besides that essence (more for each Titan), a heap of gold priced by your best stage, and a pair of gems.

The first Titan you beat also earns the {{achievementById('titan_slayer').name}} medal: {{achievementById('titan_slayer').reward}} (see [[Medals]]).

## The Titan line

The Titans stand one after another down the stages: Titan 1 at stage {{titanStage(1)}}, Titan 2 at {{titanStage(2)}}, Titan 3 at {{titanStage(3)}}, on to Titan {{TITAN_LATE_FROM}} at stage {{titanStage(TITAN_LATE_FROM)}}. A Titan's strength follows its stage, so each is far tougher than the last. They are the Titans of {{TITAN_NAMES.slice(0, -1).join(', ')}} and {{TITAN_NAMES.at(-1)}}, and then the names come round again with a number.

## The late Titans

From Titan {{TITAN_LATE_FROM + 1}} on, the Titans stand closer together: Titan {{TITAN_LATE_FROM + 1}} at stage {{titanStage(TITAN_LATE_FROM + 1)}}, then one every {{titanStage(TITAN_LATE_FROM + 2) - titanStage(TITAN_LATE_FROM + 1)}} stages. They fall more often deep in the game, and each one leaves half the bonus: +{{pct(TITAN_BONUS.atkMult / 2)}} attack and +{{pct(TITAN_BONUS.hpMult / 2)}} health.
