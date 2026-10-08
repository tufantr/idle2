---
path: /prestige
keywords: prestige, reset, rebirth, tokens, prestige tokens, records, skill points, auto prestige, first prestige, wall, glow
---
A prestige ends your run and trades it for power that lasts. Your hero goes back to an early stage, but the best stage of the run becomes **prestige tokens**, which make your hero stronger for good, and often **skill points** for [[Perks]] as well. The next run climbs back quickly and then goes further. When a run stops moving, a prestige is the way past the wall.

## When you can prestige

- The Prestige place opens once you {{UNLOCKS.find(u => u.id === 'prestige').task.toLowerCase()}}. Its button sits in the fight's dock, on the [[Combat]] tab and on the Prestige panel of the [[Shop]].
- **The first prestige** can be made as soon as it opens: it needs no long run. A guiding hand points at the glowing Prestige button, then at "Prestige now" in the dialog, and afterwards at Perks and the first perk your new skill point buys.
- **Every later prestige** needs a run that has reached stage {{BALANCE.prestige.minStage}} and lasted at least {{BALANCE.prestige.minRunMs / 60000}} minutes. Until then the button says how long is left.
- A prestige waits while a [[The Titan|Titan]] fight or a [[Dungeons|dungeon]] run is under way, since it would end it. The button says "after the Titan fight" or "after the dungeon run".

The prestige dialog shows everything before you commit: the tokens and skill points you would get, the stage the next run starts at, and what stays. A backup of your save is kept in Settings before every prestige.

## When to prestige

The Prestige button **glows** when a prestige is a good idea: your hero is climbing the stages and the run has stopped finding new ones. Until you have earned Auto (below), it glows once the run has spent {{BALANCE.prestige.readyStallMs / 60000}} minutes climbing without reaching a new stage; after that, once it has gone as long as Auto would wait. The first prestige glows as soon as it may be made.

> Tip: The button's tooltip, and the line on the Combat tab, say what the run would pay if it reached the next boss. If that boss is within reach, one more push can be worth it; if the run has stalled, take the tokens home.

## What starts over, and what stays

**Starts over:**
- Your stage. The next run begins at {{pct(BALANCE.prestige.startStageFraction, 0)}} of your best stage ever, and at least at stage 1 (the table below shows where).
- Your gold.
- The [[Camp]]: its upgrades are packed up and bought again in the next run.
- A [[Trials|Trial]] under way ends (or a new one begins, if you prestige into one).

**Stays:** everything else. Your skills and their [[Mastery|mastery]], your gear with its reinforcing and upgrades, your [[Tools|tools]], every material, essence, food and potion, your perks and tokens, [[Medals|medals]], [[Pets|pets]] and [[Unique items|unique items]], dungeon clears and fragments, Titans defeated, the agility course and the farm, and your best stage ever.

Ground you have cleared before goes quickly: a stage you have already beaten is a single fight, so a new run soon reaches its old wall, and with the new tokens it can go further.

## Tokens

A prestige pays tokens for the best stage the run reached:

tokens = ⌊((stage − {{BALANCE.prestige.tokenOffset}}) ÷ {{BALANCE.prestige.tokenDivisor}})^{{BALANCE.prestige.tokenExp}}⌋

So a run to stage {{BALANCE.prestige.minStage}} pays {{tokensForStage(BALANCE.prestige.minStage)}}, a run to stage 50 pays {{tokensForStage(50)}} and a run to stage 100 pays {{tokensForStage(100)}}. Some bonuses raise what every prestige pays: the medals {{ACHIEVEMENTS.find(a => a.id === 'eternity').name}} and {{ACHIEVEMENTS.find(a => a.id === 'ascendant').name}} (+{{pct(ACHIEVEMENTS.find(a => a.id === 'eternity').mods.tokenMult, 0)}} each), the [[Starless Band]] (+{{pct(UNIQUES.starless_band.affixes.find(a => a.stat === 'tokenMult').value, 0)}}) and the Stars of [[Ascension]] (+{{pct(STAR_TOKEN_GAIN, 0)}} each).

Tokens are **held, never spent**. Each one you hold gives your hero +{{pct(BASE.tokenAtk, 1)}} attack, +{{pct(BASE.tokenDef, 1)}} defence and +{{pct(BASE.tokenHp, 1)}} health, for good: a hundred tokens are +{{pct(BASE.tokenAtk * 100, 0)}} attack. Tokens are a layer of their own: their bonus multiplies everything else your hero has (gear, levels, perks, the camp) instead of adding to it.

## Records

Records make every token stronger. Each record multiplies what all your tokens give by ×{{BASE.recordMult}}, and you earn one for:
- every {{BASE.recordStages}} stages of your best stage ever;
- each different [[Unique items|unique item]] you hold, in your bag or worn;
- each [[Trials|Trial]] tier you clear;
- each laurel from the week's Trial.

Records multiply together: ten of them make your tokens ×{{(BASE.recordMult ** 10).toFixed(2)}} as strong. Reaching a new {{BASE.recordStages}}-stage record gets a card of its own, and the token chip's tip in the purse counts your records. Late in the game, when one more prestige adds little to a big stock of tokens, a new record lifts the whole stock at once.

## Skill points

A prestige can also pay skill points, spent on [[Perks]]:
- **{{BALANCE.prestige.spPerPrestige}} for a full run**, one that reached at least {{pct(BALANCE.prestige.fullRunFraction, 0)}} of your best stage ever. When the run falls short, the dialog says which stage would have earned it.
- **One more for every {{BALANCE.prestige.spStageStep}} stages** of your best stage ever, each paid once, at the first prestige after you reach it.

So a first prestige at stage {{BALANCE.prestige.spStageStep}} pays {{BALANCE.prestige.spPerPrestige + skillPointsForStages(BALANCE.prestige.spStageStep, 0)}} skill points, while a quick re-run that stops short of half your best pays none.

## Auto prestige

After {{BALANCE.prestige.autoAfter}} prestiges, or {{BALANCE.prestige.autoAfterMs / 3600000}} hours after your first one (whichever comes first), an **Auto** switch appears beside the Prestige button in the fight's dock. It starts off. Turned on:
- a run that has spent {{BALANCE.prestige.autoStallMs / 60000}} minutes climbing without reaching a new stage is prestiged by itself, as soon as a prestige is allowed (stage {{BALANCE.prestige.minStage}} reached, {{BALANCE.prestige.minRunMs / 60000}} minutes run);
- your hero walks straight into the next run's first fight;
- it works while you are away too, and the welcome-back report counts the prestiges it made.

The switch shows when it will go next. Auto only watches a hero who is climbing the stages: it never prestiges while you stay on one stage, fight in a dungeon or at the Titan, or work at a skill. It makes plain prestiges only: it never ascends or starts a Trial, and it ends a Trial run like any prestige does.

## Trials and Ascension

Later on, the prestige dialog offers two more ways to prestige:
- From best stage {{TRIALS_FROM}}, **[[Trials]]**: prestige into a run under one hard rule. Each tier you clear in it is a record.
- From best stage {{ASCEND_FROM}}, **[[Ascension]]**: a prestige that also gives up every token for Stars, which make every later prestige pay more.

## Ranks and more

Every prestige counts toward your hero's [[Ranks|rank]], worn as the colour of the cloak; the dialog says when a prestige earns a new one. Prestiges also earn the medal {{ACHIEVEMENTS.find(a => a.id === 'eternity').name}} ({{ACHIEVEMENTS.find(a => a.id === 'eternity').desc.replace(/^./, c => c.toLowerCase())}}: {{ACHIEVEMENTS.find(a => a.id === 'eternity').reward.replace(/^./, c => c.toLowerCase())}}), and your first one starts the way to the [[/clans|Clan]] and the [[/events|weekend events]] (see [[Places and unlocks]]).
