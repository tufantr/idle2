---
path: /camp
keywords: camp, camp upgrades, whetstone, armour rack, armor rack, hearth, gold, run
aliases: Whetstone, Armour Rack, Hearth, Camp upgrades
---
The camp is where a run's gold goes. Its three upgrades make your hero stronger until your next [[Prestige|prestige]]: the {{campUpgradeById('whetstone').name}} raises his attack, the {{campUpgradeById('armory').name}} his defence and the {{campUpgradeById('hearth').name}} his health (the table below). You find the camp on the Combat tab and in the fight's dock as soon as you have the gold for a first level.

## How the upgrades work

Each level multiplies rather than adds, and the camp is a layer of its own, multiplied on top of everything else: {{CAMP_GOLD.from}} levels of the {{campUpgradeById('whetstone').name}} make attack ×{{fmt((1 + campUpgradeById('whetstone').bonus) ** CAMP_GOLD.from)}}, and {{CAMP_GOLD.from}} of the {{campUpgradeById('hearth').name}} health ×{{fmt((1 + campUpgradeById('hearth').bonus) ** CAMP_GOLD.from)}}. The levels never end: besides {{CAMP_GOLD.from}} levels priced by your best stage, each upgrade has endless ones in plain gold (below), so the deeper your hero goes, the more of them a run buys, and {{CAMP_GOLD.from * 2}} levels of the {{campUpgradeById('whetstone').name}} make attack ×{{fmt((1 + campUpgradeById('whetstone').bonus) ** (CAMP_GOLD.from * 2))}}.

- Tap an upgrade to buy one level. **Max** beside it buys as many levels as your gold allows.
- The health a {{campUpgradeById('hearth').name}} level adds is health your hero has at once, not only room to heal into.
- The {{campUpgradeById('armory').name}} shows up once your hero has some defence for it to raise.

## It resets every prestige

A prestige packs up the camp: every upgrade goes back to nothing, and so does your gold. Every new run is a climb, and the gold of its first stages buys the camp again. The bonuses that last ([[Perks]], [[Medals]], prestige tokens, gear) are elsewhere.

## Prices

Each upgrade has two kinds of levels, and every level gives the same.

**{{CAMP_GOLD.from}} levels follow your best stage.** Each costs {{[...new Set(CAMP_UPGRADES.map(u => u.growth))].join(' or ')}} times as much as the last. The first are cheap, from {{campUpgradeById('whetstone').baseCost}} gold for the {{campUpgradeById('whetstone').name}}, {{campUpgradeById('armory').baseCost}} for the {{campUpgradeById('armory').name}} and {{campUpgradeById('hearth').baseCost}} for the {{campUpgradeById('hearth').name}}, so the first levels come early in a run. Once a kill at your best stage ever is worth enough gold (from about stage {{Math.min(...CAMP_UPGRADES.map(u => { let s = 1; while (CAMP_PRICE_KILLS * goldPerKillAtStage(s) <= u.baseCost) s++; return s; }))}}), their price grows with the gold a kill pays there, and all {{CAMP_GOLD.from}} of an upgrade come to about {{fmt(Math.round(CAMP_PRICE_KILLS * Array.from({ length: CAMP_GOLD.from }, (_, l) => campUpgradeById('whetstone').growth ** l).reduce((a, b) => a + b)))}} kills' worth. So each run buys its camp again as it nears its best, and gold keeps a job late in the game.

**The other levels never end**, and they cost plain gold, the same at any depth: {{fmt(CAMP_GOLD.base)}} for the first, then {{CAMP_GOLD.growth}} times the last for each one after.

**The cheaper level always comes next**, so a price never drops from one level to the next. Until your best stage passes about {{Math.min(...CAMP_UPGRADES.map(u => { let s = 1; while (Math.max(u.baseCost, CAMP_PRICE_KILLS * goldPerKillAtStage(s)) * u.growth ** (CAMP_GOLD.from - 1) <= CAMP_GOLD.base) s++; return s; }))}}, all {{CAMP_GOLD.from}} best-stage levels cost less than the first plain-gold one, which comes at level {{CAMP_GOLD.from + 1}}. Deeper, the two kinds take turns, and deep in the [[/zones|Abyss]] a kill pays so much gold that the plain-gold levels come first, from early in a run: far down, every {{Math.round(Math.log(CAMP_GOLD.growth) / Math.log(BALANCE.enemy.denseHpGrowth))}} stages deeper buys about one more level of each upgrade in a run. The table below gives each level's price for a new player.

> Tip: gold bonuses (the Fortune perk, medals, gear) don't change the prices, so they make the camp cheaper.

## The No Camp Trial

In the {{trialById('no_camp').name}} [[Trials|Trial]] the camp stays packed for the whole run: nothing can be bought and no upgrade counts. Its tiers are cleared by climbing without it.
