---
path: /shop
keywords: shop, supplies, gold shop, buy, prices, coal wagon, firewood bundle, herb pouch, hunter's cache, bait tin, essence cache, gem pouch, amethyst pouch, topaz pouch, sapphire pouch, sell, selling, gem pouches, charms, charm, gem gloves, furnace bellows, chef's gloves, compost sack, charges
aliases: Supplies, Gold shop, Gem pouches, Charms, Gem Gloves, Furnace Bellows, Chef's Gloves, Compost Sack
---
The Shop sells supplies for gold: coal, logs, herbs, meat, bait, essence and, for [[Crafting]], gems. It opens early, after the first boss falls. Once [[Prestige|prestige]] has opened it also holds your prestige panel, and after your first prestige the [[Perks]] you buy with skill points. Later it sells **charms** for essence (below). The table below lists every supply.

## Prices follow your run

Every supply is priced in kills: so many kills' worth of gold at the furthest stage your run has reached (a boss stage prices like its ordinary monsters), and never less than a quarter over what it sells back for. The table below gives each price in kills, and in gold at a few stages.

So prices rise and fall with what your kills pay now: just after a prestige they are cheap, and deep in a run a pack costs about as long in the fight as gathering it would take. Gold bonuses don't raise prices, so they make everything cheaper. (Until October 2026 supplies were priced at your best stage ever, at 25 to 120 kills, which made them dear for most of a run.)

## Gem pouches

Once Crafting is open the Shop also sells gems for it: a pouch of the first gems, one kind at a time as your Crafting level climbs (the table below says which, when). They keep Crafting's first levels open at any point of the game, however deep the fight's own gems have gone. The higher gems are never sold for gold.

## Charms

Charms are kits with charges, bought with [[Monster Essence|essence]]. Each makes one skill's work go further while its charges last, and opens here once that skill meets what it eases:

- **{{CHARMS[0].name}}** ({{fmt(CHARMS[0].essence)}} essence, {{CHARMS[0].charges}} charges): {{CHARMS[0].does.toLowerCase()}} It opens at [[/skills/mining|Mining]] 30 once [[Crafting]] is open.
- **{{CHARMS[1].name}}** ({{fmt(CHARMS[1].essence)}} essence, {{CHARMS[1].charges}} charges): {{CHARMS[1].does.toLowerCase()}} It opens once a weapon or armour slot is reinforced past +10 ([[Smithing]]), where the forge's bars start to eat coal.
- **{{CHARMS[2].name}}** ({{fmt(CHARMS[2].essence)}} essence, {{CHARMS[2].charges}} charges): {{CHARMS[2].does.toLowerCase()}} It opens at [[/skills/cooking|Cooking]] 50.
- **{{CHARMS[3].name}}** ({{fmt(CHARMS[3].essence)}} essence, {{CHARMS[3].charges}} charges): {{CHARMS[3].does.toLowerCase()}} It opens at [[Farming]] 50.

Each piece of a charm's work uses one charge: a rock, a bar that would have taken coal, a dish, a harvest. A purchase adds its charges to any left (a hundred purchases' worth at most), they stay through every [[Prestige|prestige]], and the skill's header shows how many are left while there are any. None of them is needed: a player who mines his own coal never wants the bellows. During a [[/events|weekend event]] its shop also sells every charm you have opened, for {{CHARM_TOKEN_COST}} Festival Tokens a purchase.

## No buying low and selling high

Selling pays a fixed price. Materials sell from the Inventory for a small sum set by their kind and tier ({{res('coal')}} for {{sellValue('coal')}} gold each, say), which never grows with your stage, and every supply costs at least a quarter more than it sells back for. Nothing bought here can be sold back at a profit, and [[Monster Essence]] cannot be sold at all.

Gold is the run's money: it comes from kills and goes at your next prestige, so spend it on supplies and the [[Camp]] while it lasts.
