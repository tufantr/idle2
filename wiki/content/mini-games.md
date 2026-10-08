---
path: /mini-games
keywords: mini-game, mini-games, minigame, minigames, chance to play, boost, streak, sharpshooter, focus, idle, afk, bonfire, firemaking, xp bonus, a chance to play
aliases: Mini-games, Focus, Bonfire, Minigames, A chance to play
---
Three things reward the way you play: mini-games for when you are watching, Focus for when you leave the game alone, and the bonfire for the logs you burn.

## Mini-games

While your hero works at a gathering or production skill ({{NON_COMBAT_SKILLS.map(id => link(path.skill(id), SKILLS[id].name)).join(', ')}}), a chance to play turns up on that skill's tab now and then: the first one soon after you start, then one every {{BALANCE.minigame.opportunityEveryMs[0] / 60000}} to {{BALANCE.minigame.opportunityEveryMs[1] / 60000}} minutes or so while you work at it. A chance waits {{BALANCE.minigame.opportunityWindowMs / 1000}} seconds for you to start it, and then you have a few seconds to play. Each skill has its own game, of four kinds:

- **Mining and Woodcutting:** tap when the marker sweeps through the glowing zone.
- **Hunting and Fishing:** loose the arrow or strike when the target crosses the zone.
- **Cooking and Firemaking:** tap the flame to keep the heat inside the band, then finish.
- **Alchemy:** drag the stabiliser into the glowing channel, then lock the brew.

A win makes that skill +{{pct(BALANCE.minigame.baseBonus, 0)}} faster for {{BALANCE.minigame.boostMs / 1000}} seconds. Every win in a row adds {{pct(BALANCE.minigame.streakBonus, 0)}} more, up to +{{pct(BALANCE.minigame.maxBonus, 0)}} on a streak of {{1 + Math.round((BALANCE.minigame.maxBonus - BALANCE.minigame.baseBonus) / BALANCE.minigame.streakBonus)}}. A miss, or giving up a game you started, ends the streak; letting a chance pass by costs nothing at all.

- The boost is for that skill only, and it runs on the clock: switch skills or leave, and it still ends on time.
- Chances only come while you are there, never during [[/offline|offline progress]].
- The {{achievementById('sharpshooter').name}} medal, for {{achievementById('sharpshooter').req.value}} wins, makes boosts last {{pct(achievementById('sharpshooter').mods.boostDuration, 0)}} longer (see [[Medals]]).

## Focus

After {{BASE.focusAfterMs / 1000}} seconds without a click, a tap or a key press, your hero settles in:

- +{{pct(BASE.focusSkillSpeed, 0)}} speed in every skill but [[Farming]];
- +{{pct(BASE.focusAttackSpeed, 0)}} attack speed in the fight.

Your next click, tap or key press ends it, until you leave the game alone again. Striking a monster is input too, so in a long fight Focus and strikes take turns. Focus also works through offline progress, where nobody clicks at all, so leaving the game alone has a reward of its own.

## The bonfire

Every log your hero burns in [[Firemaking]] feeds the bonfire: {{BASE.bonfireSecondsPerLogTier}} seconds for each tier of the log, so a better log burns longer, and a log that burns twice (the tinderbox's double, see [[Tools]]) counts twice. It holds at most {{time(BASE.bonfireMaxMs)}} of fire. Once lit it burns on the clock, whatever your hero does next and while you are away; a pill at the top of the screen shows the time left.

While it burns, every skill earns more XP, combat included, by your Firemaking level: +{{pct(bonfireBonus(1), 0)}} at level 1, +{{pct(bonfireBonus(50))}} at 50 and +{{pct(bonfireBonus(MAX_LEVEL), 0)}} at {{MAX_LEVEL}}.

{{table(['Log', 'Seconds on the bonfire #'], orderedByTier('log').map(r => [res(r.id), fmt(BASE.bonfireSecondsPerLogTier * r.tier)]), { sort: false })}}
