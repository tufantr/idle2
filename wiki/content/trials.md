---
path: /trials
keywords: trial, trials, challenge, challenge run, tier, tiers, rung, rungs, ladder, pact, pacts, heat, laurel, laurels, weekly trial, week's trial, records, rule
---
A Trial is a run under one hard rule: monsters that hit harder or take longer to kill, a hero who falls to one blow, weaker [[Equipment|gear]], no camp, no [[Food|food]]. Reaching the stages a Trial asks for clears its tiers for good, and every tier cleared is a record that makes all your [[Prestige|prestige tokens]] stronger. Past its first tiers, each Trial's ladder goes on to the last stage, and deep heroes can take several Trials at once.

## When Trials open

From best stage {{TRIALS_FROM}}, the prestige dialog shows a card for every Trial: its rule, its tiers as pips, and the stage the next tier asks for. Tick one and the dialog's button becomes "Prestige into" that Trial. It is a prestige like any other, and then the next run plays under the Trial's rule.

## How a Trial run works

- The rule lasts until your next prestige, by hand or by Auto, which ends the Trial (or starts another one).
- The run earns its tokens like any run, from the stage it reaches under the rule. The rule holds you back, so a Trial run pays fewer tokens than a plain one would: you trade some tokens for records that last.
- While it lasts, the fight shows the Trial beside the stage, with the stage its next tier asks for.

## Tiers and the ladder

Every Trial has {{TRIAL_TIERS}} tiers, {{TRIAL_STEP}} stages apart; the table below gives each tier's stage. Reach that stage in a run of the Trial and the tier is cleared for good, with a card. A run that goes far enough clears several tiers at once. The first tier of each Trial is meant to be within reach of a hero who has just opened the Trials, and the later ones come as your hero grows stronger.

Past the {{TRIAL_TIERS}} tiers the ladder goes on: a **rung** at stage {{fmt(TRIAL_LADDER.from)}}, then one every {{TRIAL_LADDER.step}} stages ({{fmt(TRIAL_LADDER.from + TRIAL_LADDER.step)}}, {{fmt(TRIAL_LADDER.from + 2 * TRIAL_LADDER.step)}} and so on) up to stage {{fmt(trialTarget(TRIALS[0], TRIAL_MAX_TIER))}}. The rungs are the same stages for every Trial. Each one is cleared as a tier is, and counts as one. The card shows the rungs cleared as a number beside its five pips.

## Records

Each tier or rung cleared is a record: every token you hold becomes ×{{BASE.recordMult}} stronger, for good, just as for {{BASE.recordStages}} more stages of best stage or a new [[Unique items|unique item]]. The first five tiers of every Trial make {{TRIALS.length * TRIAL_TIERS}} records, worth ×{{(BASE.recordMult ** (TRIALS.length * TRIAL_TIERS)).toFixed(1)}} together, and every rung after them adds one more. Clearing {{ACHIEVEMENTS.find(a => a.id === 'trial_master').req.value}} of them also earns the medal {{ACHIEVEMENTS.find(a => a.id === 'trial_master').name}} ({{ACHIEVEMENTS.find(a => a.id === 'trial_master').reward}}).

## The rules in practice

Each rule is in the table below. A few of them in more detail:
- **{{TRIALS.find(t => t.id === 'brutes').name}}:** every blow that lands also puts your hero's next swing back {{TRIALS.find(t => t.id === 'brutes').bite.stagger / 1000}} second, up to two swings' worth.
- **{{TRIALS.find(t => t.id === 'thick_hides').name}}:** the tougher monsters still pay the gold and XP of ordinary ones.
- **{{TRIALS.find(t => t.id === 'glass').name}}:** your hero keeps his health, but any blow that lands fells him, however strong he is. A dodged blow does not land, so dodge is what carries you through it.
- **{{TRIALS.find(t => t.id === 'rusted').name}}:** everything your gear gives is cut, its bonuses as well as its attack and defence.
- **{{TRIALS.find(t => t.id === 'swift_bosses').name}}:** a stage boss gives you {{BALANCE.combat.bossTimeMs * TRIALS.find(t => t.id === 'swift_bosses').bite.bossTime / 1000}} seconds instead of {{BALANCE.combat.bossTimeMs / 1000}}.
- **{{TRIALS.find(t => t.id === 'no_camp').name}}:** the [[Camp|camp]] has no levels, and none can be bought.
- **{{TRIALS.find(t => t.id === 'fasting').name}}:** your hero eats nothing, drinks no [[Potions|potion]] and gets no health back while fighting, from regeneration, lifesteal or a level-up. Resting after a fall still heals. The clan boss's fight is not part of the Trial, so your potion works there.
- **{{TRIALS.find(t => t.id === 'faithless').name}}:** your tokens give nothing during the run, though the run still earns tokens. Tokens are most of a late hero's power, which is why its tiers ask for the lowest stages.

## Pacts

From best stage {{fmt(PACTS_FROM)}}, the first rung's stage, you may tick up to {{PACT_MAX}} Trials at once: a **Pact**. The run plays under all their rules together, and the stage it reaches counts on every ladder in it, so one good run can clear rungs on three ladders. The rules add up, so a Pact reaches fewer stages than any one of its Trials alone would: a single Trial still climbs its own ladder furthest.

Once Pacts are open, each card shows its **heat**: how hard its rule is deep in the climb, roughly the stages it costs a deep run in fifties. The dialog adds up the heat of the Trials you tick.

## The week's Trial

Each week, from {{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(WEEKLY_FROM).getUTCDay()]}} 00:00 UTC to the next, one Trial is the week's, in turn through all {{TRIALS.length}}. Its card comes first in the prestige dialog with a "This week" ribbon, and you can play it even when its whole ladder is cleared.

- Beat your best stage in it from before the week began (or its first tier's stage, if that is higher) and you win a **laurel**: a record, for good, just like a tier.
- Alone, one laurel a week. Once Pacts are open, a Pact holding the week's Trial wins **a laurel for each Trial in it**, up to {{PACT_MAX}} a week in all, for beating the same stage under all their rules at once. A laurel already won this week counts against the {{PACT_MAX}}.
- Your best in each Trial is kept, so the goal grows with you, and a Trial you cleared long ago is still worth a run when its week comes round.
- The [[Clans and leaderboards|leaderboards]] have a board of their own for the week's Trial. It ranks this week's best stage in it as a share of each player's own best stage, so a strong Trial run tops it, not simply the deepest hero; the stage is shown beside the share.

> Tip: When the week's Trial comes up, it is usually the one to play: it can win a laurel even after its ladder is cleared, and three in a Pact.
