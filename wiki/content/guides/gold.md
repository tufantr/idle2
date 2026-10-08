---
path: /guides/gold
title: Gold
section: Guides
sectionPath: /guides
icon: gold
order: 40
summary: How you earn gold (kills, bosses, gilded monsters, the daily crate, selling) and where it goes (the camp, the Shop, seeds, agility, jewellery), and why to spend it within the run.
keywords: gold, money, coins, income, spending, gold sink, camp prices, shop prices, sell, gilded
---
Gold is the money of a run. You earn it mostly by fighting, and you spend it on things that make the run, or your hero, stronger. One rule shapes everything else: **gold starts over at every prestige**, so gold left unspent when you prestige is lost.

## Earning gold

**Kills.** Every monster pays {{pct(BALANCE.rewards.goldPerHp, 0)}} of its health in gold, so deeper stages pay far more. On the gentle first stages the monsters are softer than usual, but they still pay as if at full strength.

{{table(['Stage #', 'Gold per kill #'], [10, 25, 50, 100, 150, 200, 300].map(s => [s, fmt(goldPerKillAtStage(s))]), { sort: false })}}

- **Bosses** pay {{BALANCE.rewards.bossGoldMult}} times as much on their first fall in a run, the kill that moves you on, on top of their {{BALANCE.enemy.bossHpMult}} times the health: {{BALANCE.enemy.bossHpMult * BALANCE.rewards.bossGoldMult}} times an ordinary monster of the stage. Farmed after that, a boss pays like the ordinary monsters its health is worth, so there is no point parking on one.
- **Gilded monsters**: about one ordinary monster in {{Math.round(1 / BALANCE.rewards.gildedChance)}} on the stage ladder arrives gilded, with a banner and a chime. It is the same fight for {{BALANCE.rewards.gildedGoldMult}}× the gold and {{BALANCE.rewards.gildedXpMult}}× the XP, plus a gem and some essence for certain.
- **Dungeon** monsters pay like ordinary monsters of the same health. The chest at the end holds materials, essence and fragments rather than gold.
- **The Titan**: each Titan you bring down pays a pile of gold, along with essence and gems.

**Gold bonuses** make every kill pay more: the Fortune [[/perks|perk]] ({{PERKS.find(p => p.id === 'fortune').desc}} a level, up to {{PERKS.find(p => p.id === 'fortune').max}}), the {{AFFIXES.find(a => a.id === 'goldFind').name}} bonus on gear, the [[Goblin King's Crown]] (+{{pct(UNIQUES.goblin_crown.affixes.find(a => a.stat === 'goldMult').value, 0)}}), a dungeon's 100th clear, the Pipe Crawl on the agility course, some weekend events, and medals ({{ACHIEVEMENTS.filter(a => !a.secret && a.mods.goldMult).map(a => `${a.name}: ${a.reward}`).join('; ')}}). None of the game's prices rise with them: the camp, the Shop and jewellery upgrades are priced by your best stage alone.

**The [[/daily-crate|daily crate]]** holds gold worth a good many kills at your best stage, more in a great crate, along with essence, materials and a gem.

**Selling.** In the Inventory you can sell materials (one, ten or all at once) and gear you do not want. Prices are fixed: a {{res('copper_ore')}} sells for {{sellValue('copper_ore')}} gold and a {{res('diamond')}} for {{sellValue('diamond')}}, however deep you are. Selling helps in your first hour; later a single kill is worth more. Gear you do not need is often better salvaged, for essence and bars.

## Spending gold

### The camp

The [[/camp|camp]] is where most of your gold goes, and it is the first thing to buy in every run: the Whetstone, the Armour Rack and the Hearth multiply your hero's attack, defence and health. A first level costs {{campCost(CAMP_UPGRADES.find(u => u.id === 'hearth'), 0)}} or {{campCost(CAMP_UPGRADES.find(u => u.id === 'whetstone'), 0)}} gold, and each level costs {{CAMP_UPGRADES[0].growth}} times the one before, up to {{CAMP_UPGRADES[0].max}} levels.

The camp is packed up at each prestige. Once your best stage passes about {{(() => { let s = 1; while (CAMP_PRICE_KILLS * goldPerKillAtStage(s) <= CAMP_UPGRADES[0].baseCost) s++; return s; })()}}, its prices follow your best stage: all {{CAMP_UPGRADES[0].max}} levels of one upgrade cost about {{Math.round(CAMP_PRICE_KILLS * (Math.pow(CAMP_UPGRADES[0].growth, CAMP_UPGRADES[0].max) - 1) / (CAMP_UPGRADES[0].growth - 1))}} kills' worth of gold there. So each run buys its camp again as it nears its best, and the camp keeps pace with your income.

### The Shop

The [[/shop|Shop]] sells supplies: coal, logs, herbs, rabbits, fishing bait and essence. Each is priced in kills' worth of gold at your best stage, from {{Math.min(...GOLD_SHOP.filter(e => !e.craft).map(e => e.costKills))}} to {{Math.max(...GOLD_SHOP.filter(e => !e.craft).map(e => e.costKills))}} kills, so a pack costs about the same share of your income at any point in the game. The Essence Cache ({{GOLD_SHOP.find(e => e.id === 'buy_essence').gives.essence}} essence for {{GOLD_SHOP.find(e => e.id === 'buy_essence').costKills}} kills) is the one you can always use more of.

Once Crafting is open, the Shop also sells a pouch of gems for the Crafting levels you are at: {{GOLD_SHOP.filter(e => e.craft).map(e => `the ${e.name} (Crafting ${e.craft[1] >= MAX_LEVEL ? `${e.craft[0]} and up` : `${e.craft[0]} to ${e.craft[1]}`}, ${e.costKills} kills)`).join(', ').replace(/, ([^,]*)$/, ' and $1')}}.

### Seeds

[[/skills/farming|Farming]] seeds are bought as you plant, at a flat price: {{CROPS[0].seedGold}} gold for potatoes up to {{fmt(Math.max(...CROPS.map(c => c.seedGold)))}} for starfruit. They cost the same at any stage, so after your first hours they are cheap. The farm is kept through prestige, and so are crops still growing.

### The agility course

[[/skills/agility|Agility]] obstacles are the biggest gold sinks in the game, and their bonuses last forever. The Agility place itself opens at "{{UNLOCKS.find(u => u.id === 'agility').task}}": {{fmt(AGILITY_SLOTS[0].costGold / 2)}} gold in hand is half the price of a first obstacle. Building one costs {{fmt(AGILITY_SLOTS[0].costGold)}} gold in the first slot and {{fmt(AGILITY_SLOTS[AGILITY_SLOTS.length - 1].costGold)}} in the last, plus logs and bars. Each obstacle can then be upgraded to level {{MAX_OBSTACLE_LEVEL}} for gold alone, each level costing {{obstacleUpgradeGold(0, 2) / obstacleUpgradeGold(0, 1)}}× the one before: the final upgrade of the last slot costs {{fmt(obstacleUpgradeGold(AGILITY_SLOTS.length - 1, MAX_OBSTACLE_LEVEL - 1))}}. The whole course at level {{MAX_OBSTACLE_LEVEL}} comes to about {{fmt(AGILITY_SLOTS.reduce((sum, s, i) => { let t = s.costGold; for (let l = 1; l < MAX_OBSTACLE_LEVEL; l++) t += obstacleUpgradeGold(i, l); return sum + t; }, 0))}} gold.

Since gold resets at prestige, an obstacle has to be bought within one run: save up in a run that goes deep.

### Jewellery

Rings, amulets and earrings are upgraded in the Inventory with essence and gold, up to +{{MAX_UPGRADE}}. The gold for each level is {{upgradeCost({ upgrade: 0, tier: 1 }, 1).gold}} kills' worth at your best stage times the level, {{[...Array(MAX_UPGRADE).keys()].reduce((sum, l) => sum + upgradeCost({ upgrade: l, tier: 1 }, 1).gold, 0)}} kills' worth for all ten. Rerolling a piece's bonuses (a reforge) costs {{reforgeCost({ tier: 1 }, 1).gold}} kills' worth and some essence. Weapons and armour are reinforced at the anvil with bars and essence instead, and need no gold. See [[/equipment/jewellery|Jewellery]].

## Spend it within the run

Gold, the camp and your stage start over at each [[/prestige|prestige]]; tokens, gear, materials, essence, the farm and the agility course stay.

- Early in a run, gold goes into the camp: it is what carries the run to its wall.
- Late in a run, the camp is nearly bought and will be lost anyway. Turn the rest into something that lasts: an agility obstacle or its next level, essence or coal from the Shop, or seeds.

> Tip: before you press Prestige, look at your gold. Whatever you have not spent is gone a moment later.
