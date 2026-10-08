---
path: /camp
keywords: camp, camp upgrades, whetstone, armour rack, armor rack, hearth, gold, run
aliases: Whetstone, Armour Rack, Hearth, Camp upgrades
---
The camp is where a run's gold goes. Its three upgrades make your hero stronger until your next [[Prestige|prestige]]: the {{campUpgradeById('whetstone').name}} raises his attack, the {{campUpgradeById('armory').name}} his defence and the {{campUpgradeById('hearth').name}} his health (the table below). You find the camp on the Combat tab and in the fight's dock as soon as you have the gold for a first level.

## How the upgrades work

Each level multiplies rather than adds, and the camp is a layer of its own, multiplied on top of everything else. An upgrade stops at level {{[...new Set(CAMP_UPGRADES.map(u => u.max))].join(' or ')}}: a full {{campUpgradeById('whetstone').name}} makes attack ×{{fmt((1 + campUpgradeById('whetstone').bonus) ** campUpgradeById('whetstone').max)}}, and a full {{campUpgradeById('hearth').name}} health ×{{fmt((1 + campUpgradeById('hearth').bonus) ** campUpgradeById('hearth').max)}}: a real push for a run, but a fraction of what better [[Equipment|gear]] gives.

- Tap an upgrade to buy one level. **Max** beside it buys as many levels as your gold allows.
- The health a {{campUpgradeById('hearth').name}} level adds is health your hero has at once, not only room to heal into.
- The {{campUpgradeById('armory').name}} shows up once your hero has some defence for it to raise.

## It resets every prestige

A prestige packs up the camp: every upgrade goes back to nothing, and so does your gold. Every new run is a climb, and the gold of its first stages buys the camp again. The bonuses that last ([[Perks]], [[Medals]], prestige tokens, gear) are elsewhere.

## Prices

Each level costs {{[...new Set(CAMP_UPGRADES.map(u => u.growth))].join(' or ')}} times as much as the last. The first levels are cheap, from {{campUpgradeById('whetstone').baseCost}} gold for the {{campUpgradeById('whetstone').name}}, {{campUpgradeById('armory').baseCost}} for the {{campUpgradeById('armory').name}} and {{campUpgradeById('hearth').baseCost}} for the {{campUpgradeById('hearth').name}}, so the first levels come early in a run.

Later on the prices follow your best stage ever. Once a kill there is worth enough gold (from about stage {{Math.min(...CAMP_UPGRADES.map(u => { let s = 1; while (CAMP_PRICE_KILLS * goldPerKillAtStage(s) <= u.baseCost) s++; return s; }))}}), the price of a level grows with the gold a kill pays at your best stage, and a whole upgrade, all {{campUpgradeById('whetstone').max}} levels, comes to about {{fmt(Math.round(CAMP_PRICE_KILLS * Array.from({ length: campUpgradeById('whetstone').max }, (_, l) => campUpgradeById('whetstone').growth ** l).reduce((a, b) => a + b)))}} kills' worth. So each run buys its camp again as it nears its best, and gold keeps a job late in the game. The table below gives each level's base price.

> Tip: gold bonuses (the Fortune perk, medals, gear) don't change the prices, so they make the camp cheaper.

## The No Camp Trial

In the {{trialById('no_camp').name}} [[Trials|Trial]] the camp stays packed for the whole run: nothing can be bought and no upgrade counts. Its tiers are cleared by climbing without it.
