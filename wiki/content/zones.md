---
path: /zones
keywords: zones, zone, lands, land, stages, stage, boss, bosses, abyss, strata, stratum, depth, depths, gear tier, richness, loot table, travel, world map, abyss depth
aliases: Lands, Strata, Abyss depth, Depths
---
The fight's stage ladder runs through {{ZONES.length}} lands of {{STAGES_PER_ZONE}} stages each, then down into [[The Abyss]], which never ends. The tables below list every land and every stratum of the Abyss.

## Lands and stages

Each land has {{STAGES_PER_ZONE}} stages of its own monsters, and its last stage is its boss, who must be beaten in time to go on ([[Combat]]). Each land also has:

- **a loot table:** the materials its monsters drop, which feed your skills;
- **a richness tier:** how much material and essence its monsters leave, and which gems;
- **a gear tier:** the tier of the gear that drops there. It follows how far along a hero usually is when he gets there, rather than the land's number, and a drop is now and then a tier below or above it ([[Equipment]]).

Your hero's first step into a new land is greeted with a card: its painting, its ruler and what it holds. The world map shows the lands and the dungeons between them, and takes your hero to any land he has reached this run.

## Depths and strata

The last land, the Abyss, begins at stage {{AUTHORED_STAGES - STAGES_PER_ZONE + 1}} like any other, but it does not end at stage {{AUTHORED_STAGES}}. Past it the Abyss goes on in depths of {{STAGES_PER_ZONE}} stages, depth 1 being stages {{AUTHORED_STAGES + 1}} to {{AUTHORED_STAGES + STAGES_PER_ZONE}}, each ending with a boss, and in strata of {{STRATUM_STAGES}} stages from stage {{STRATA_FROM}}: {{STRATA.length}} named layers, each with {{STRATA[1].monsters.length}} monsters, a boss and a painting of its own. Past the last, [[Pandemonium]] (stages {{STRATA_FROM + (STRATA.length - 1) * STRATUM_STAGES}} to {{STRATA_FROM + STRATA.length * STRATUM_STAGES - 1}}), the strata below the Abyss's own come round again without end, each round with a numeral and its painting cast in new hues: {{stratumAt(STRATA.length).name}} from stage {{STRATA_FROM + STRATA.length * STRATUM_STAGES}}, {{stratumAt(STRATA.length + STRATA.length - 1).name}} after the next round, and so on.

## The Lords

From stage {{LORDS.from}}, the boss of every {{LORDS.every}}th stage is a **Lord**, marked with a crown on the stage path. The first time you ever beat one it leaves a sure piece of gear from its depth, for the weapon or armour slot that lags furthest behind: legendary, and from stage {{MYTHIC.from}} Mythic (a Primal one time in {{PRIMAL.odds}} from stage {{PRIMAL.from}}). After that it is a boss like any other. A save from before the Lords counts those above its best stage as beaten: their due is for new ground.

Every depth keeps the Abyss's loot table and richness. What changes is how hard the monsters are and the gear they drop.

## How the monsters grow

Up to stage {{AUTHORED_STAGES}} a monster's health grows {{pct(BALANCE.enemy.hpGrowth - 1)}} a stage, ×{{fmt(BALANCE.enemy.hpGrowth ** STAGES_PER_ZONE)}} a land. Past stage {{AUTHORED_STAGES}} it grows faster, {{pct(BALANCE.enemy.abyssHpGrowth - 1)}} a stage or ×{{fmt(BALANCE.enemy.abyssHpGrowth ** STAGES_PER_ZONE)}} a depth, so the climb slows in the Abyss. Past stage {{BALANCE.enemy.deepFrom}} it eases again, from {{pct(BALANCE.enemy.deepHpGrowth - 1)}} a stage evenly down to {{pct(BALANCE.enemy.denseHpGrowth - 1)}} (×{{fmt(BALANCE.enemy.denseHpGrowth ** STAGES_PER_ZONE)}} a depth) by stage {{BALANCE.enemy.denseFrom}}, and stays there, so the long climb never stops moving. Attack grows the same way, a little more slowly. From stage {{BALANCE.enemy.supply.from}} both grow further, to ×{{fmt(BALANCE.enemy.supply.mult)}} by stage {{BALANCE.enemy.supply.to}}, which [[Food]] and [[Potions]] make up for; the numbers are on [[Combat]].

## Gear by depth

In the Abyss the gear tier rises with the depth:

{{table(['Gear', 'From depth #', 'From stage #'], [...new Set(Array.from({ length: 50 }, (_, i) => abyssGearTier(i + 1)))].map(t => { let d = 1; while (abyssGearTier(d) < t) d++; return [link(path.tier(GEAR_TIERS[t - 1].name), `${GEAR_TIERS[t - 1].name} gear`, `item/Weapon/${t}`), d, AUTHORED_STAGES + (d - 1) * STAGES_PER_ZONE + 1]; }), { sort: false })}}

There is no tier beyond {{GEAR_TIERS.at(-1).name}}, so past depth {{BALANCE.abyss.dropScalingFrom}} every depth makes the gear that drops {{BALANCE.abyss.dropGrowth}} times as strong as the depth before, easing with the monsters past stage {{BALANCE.enemy.deepFrom}} to {{BALANCE.abyss.denseDropGrowth}} times by stage {{BALANCE.enemy.denseFrom}}; each piece shows the depth it came from. The same goes for the chests of the dungeons that deep and for [[Voidstone]] jewellery, which is cut to the deepest depth you have reached. The Voidstone itself only drops from the bosses of the Abyss (and Titans that deep), from depth {{VOIDSTONE_DEPTH}}.
