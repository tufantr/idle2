---
path: /trials
keywords: trial, trials, challenge, challenge run, tier, tiers, laurel, laurels, weekly trial, week's trial, records, rule
---
A Trial is a run under one hard rule: monsters that hit harder or take longer to kill, a frailer hero, weaker gear, no camp, no food. Reaching the stages a Trial asks for clears its tiers for good, and every tier cleared is a record that makes all your [[Prestige|prestige tokens]] stronger.

## When Trials open

From best stage {{TRIALS_FROM}}, the prestige dialog shows a card for every Trial: its rule, its tiers as pips, and the stage the next tier asks for. Tick one and the dialog's button becomes "Prestige into" that Trial. It is a prestige like any other, and then the next run plays under the Trial's rule.

## How a Trial run works

- The rule lasts until your next prestige, by hand or by Auto, which ends the Trial (or starts another one).
- The run earns its tokens like any run, from the stage it reaches under the rule. The rule holds you back, so a Trial run pays fewer tokens than a plain one would: you trade some tokens for records that last.
- While it lasts, the fight shows the Trial beside the stage, with the stage its next tier asks for.
- A Trial with every tier cleared can't be entered again, unless it is the week's Trial (below).

## Tiers

Every Trial has {{TRIAL_TIERS}} tiers, {{TRIAL_STEP}} stages apart; the table below gives each tier's stage. Reach that stage in a run of the Trial and the tier is cleared for good, with a card. A run that goes far enough clears several tiers at once. The first tier of each Trial is meant to be within reach of a hero who has just opened the Trials, and the later ones come as your hero grows stronger.

## Records

Each tier cleared is a record: every token you hold becomes ×{{BASE.recordMult}} stronger, for good, just as for {{BASE.recordStages}} more stages of best stage or a new [[Unique items|unique item]]. There are {{TRIALS.length * TRIAL_TIERS}} tiers in all, and together they make your tokens ×{{(BASE.recordMult ** (TRIALS.length * TRIAL_TIERS)).toFixed(1)}} as strong. Clearing {{ACHIEVEMENTS.find(a => a.id === 'trial_master').req.value}} of them also earns the medal {{ACHIEVEMENTS.find(a => a.id === 'trial_master').name}} ({{ACHIEVEMENTS.find(a => a.id === 'trial_master').reward}}).

## The rules in practice

Each rule is in the table below. A few of them in more detail:
- **{{TRIALS.find(t => t.id === 'thick_hides').name}}:** the tougher monsters still pay the gold and XP of ordinary ones.
- **{{TRIALS.find(t => t.id === 'rusted').name}}:** everything your gear gives is cut, its bonuses as well as its attack and defence.
- **{{TRIALS.find(t => t.id === 'swift_bosses').name}}:** a stage boss gives you {{BALANCE.combat.bossTimeMs * TRIALS.find(t => t.id === 'swift_bosses').bite.bossTime / 1000}} seconds instead of {{BALANCE.combat.bossTimeMs / 1000}}.
- **{{TRIALS.find(t => t.id === 'no_camp').name}}:** the [[Camp|camp]] has no levels, and none can be bought.
- **{{TRIALS.find(t => t.id === 'fasting').name}}:** your hero eats nothing and gets no health back while fighting, from regeneration or lifesteal. Resting after a fall still heals.
- **{{TRIALS.find(t => t.id === 'faithless').name}}:** your tokens give nothing during the run, though the run still earns tokens. Tokens are most of a late hero's power, which is why its tiers ask for the lowest stages.

## The week's Trial

Each week, from {{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(WEEKLY_FROM).getUTCDay()]}} 00:00 UTC to the next, one Trial is the week's, in turn through all {{TRIALS.length}}. Its card comes first in the prestige dialog with a "This week" ribbon, and you can play it even when its tiers are all cleared.

- Beat your best stage in it from before the week began (or its first tier's stage, if that is higher) and you win a **laurel**: a record, for good, just like a tier.
- One laurel a week at most. Your best in each Trial is kept, so the goal grows with you, and a Trial you cleared long ago is still worth a run when its week comes round.
- The [[Clans and leaderboards|leaderboards]] have a board of their own for the week's Trial: the best stages reached in it this week.

> Tip: When the week's Trial comes up, it is usually the one to play: it can win a laurel even after its tiers are gone.
