---
path: /skills/firemaking
keywords: firemaking, bonfire, burn logs, tinderbox, fire, XP bonus
---
Firemaking burns logs. That trains the skill, and every log burnt also feeds the **bonfire**, which gives more XP to every skill while it burns, combat included. Firemaking opens soon after you {{UNLOCKS.find(u => u.id === 'firemaking').task.toLowerCase()}} in [[/skills/woodcutting|Woodcutting]].

## What it is for

- **The bonfire.** While it burns, every skill earns more XP: +{{pct(bonfireBonus(1), 0)}} at Firemaking 1, growing with your level to +{{pct(bonfireBonus(MAX_LEVEL), 0)}} at {{MAX_LEVEL}} (the table below).
- **A use for spare logs**, and XP for them.

Firemaking uses up logs and makes nothing else, so it feeds no other skill: its gift is the bonfire.

## How it works

Pick a kind of log and your hero burns them one by one until they run out. Each log adds {{BASE.bonfireSecondsPerLogTier}} seconds times its tier to the bonfire, which holds at most {{time(BASE.bonfireMaxMs)}}. The bonfire burns down on the clock, whatever you are doing and while you are away, and its bonus counts for everything you train meanwhile, even after you stop burning.

A [[Tools|tinderbox]] (forged in [[/skills/smithing|Smithing]]) makes you faster and gives a chance that a log burns twice: twice the XP and twice the bonfire time, for one log. The log's [[Mastery|mastery]] and the [[/capes|Firemaking cape]] raise that chance too, and mastery can save the log altogether.

## Training tips

- **Light it, then go and do something else.** A full bonfire takes {{BASE.bonfireMaxMs / (BASE.bonfireSecondsPerLogTier * 1000 * RESOURCES.normal_log.tier)}} plain [[Logs]], or {{BASE.bonfireMaxMs / (BASE.bonfireSecondsPerLogTier * 1000 * RESOURCES.magic_log.tier)}} [[Magic Logs]]. Burn a batch, then train or fight for the rest of the hour with the bonus on.
- **Better logs, more fire.** Higher logs give more XP each and more bonfire time per log: one magic log burns as long as {{RESOURCES.magic_log.tier / RESOURCES.normal_log.tier}} plain ones.
- **Keep some plain logs for [[/skills/cooking|Cooking]]**, which burns a log for every dish.
- **Forge a tinderbox** at Smithing {{TOOLS.tinderbox.tiers[0].levelReq}} ({{resList(TOOLS.tinderbox.tiers[0].consumes)}}).
