---
path: /equipment
keywords: gear, equipment, weapon, sword, armour, armor, shield, helm, plate, greaves, boots, gauntlets, ring, amulet, earring, slots, rarity, affix, affixes, bonuses, tier, wear level, drop, codex, bag, salvage, auto-salvage, lock, anvil, reinforce, reroll, refit, reforge, sell, pity, weapons, reinforcing, gear codex
aliases: Gear, Weapons, Armour, Anvil, Reinforcing, Salvage, Auto-salvage, Gear codex, Bag
---
Gear is most of your hero's strength. He wears up to {{EQUIP_SLOTS.length}} pieces: weapons and armour come from the fight and are worked at the anvil in [[Smithing]], and jewellery is made in [[Crafting]]. Gear is kept when you prestige. The tables below give the tiers, the slots, the rarities and the bonuses.

## Slots

- **Weapons and armour:** {{SMITHING_TYPES.map(t => TYPE_NAMES[t].toLowerCase()).join(', ')}}, one of each.
- **Jewellery:** two rings, an amulet and two earrings (see [[Jewellery]]).

Each slot splits a piece between attack and defence in its own way: the sword is all attack, most armour all defence, and gauntlets and jewellery a little of both (the table below).

## A piece's attack and defence

Three things set a piece's attack and defence:

- its **tier**, the metal (or, for jewellery, the gem) it is made of. Each tier is about {{fmt(GEAR_TIERS[1].power / GEAR_TIERS[0].power)}} times as strong as the one before;
- its **slot**, which splits that strength between attack and defence;
- its **rarity**, a quality bonus that stops at ×{{RARITIES.at(-1).quality}} for a {{RARITIES.at(-1).name.toLowerCase()}} piece.

A piece's attack is {{STAT_UNIT}} × its tier's power × its slot's attack weight × its rarity's quality, give or take a little, and its defence likewise: a common {{GEAR_TIERS[0].name}} {{TYPE_NAMES.Weapon}} has about {{STAT_UNIT * GEAR_TIERS[0].power * SLOT_STATS.Weapon.atk}} attack. A {{RARITIES.at(-1).name.toLowerCase()}} piece has {{RARITIES.at(-1).quality}} times a common one's stats, about a tier's worth: it beats a common piece of the tier above, a {{RARITIES[2].name.toLowerCase()}} one of that tier beats it, and nothing reaches two tiers up. Jewellery carries {{pct(JEWEL_POWER, 0)}} of its tier's power: its worth is in its bonuses.

Defence also gives health, one for every {{1 / BASE.hpPerDef}} defence, and each upgrade level adds {{pct(UPGRADE_STEP, 0)}} to a piece's base attack and defence.

## Rarity and bonuses

A rarer piece carries more bonuses: none on a {{RARITIES[0].name.toLowerCase()}} piece, up to {{RARITIES.at(-1).affixes}} on a {{RARITIES.at(-1).name.toLowerCase()}} one. Each bonus is one of the kinds in the table below, rolled when the piece is made (a reroll rolls them again), and a little larger on higher tiers. The bonuses of everything your hero wears add up, and a few stop at a cap (see [[Combat]]).

## Wear levels

Each tier needs a combat level before your hero can wear it (the table below). You can carry a piece before you can wear it: it shows dimmed in the bag until then.

## Where gear comes from

- **Dropped:** every weapon and piece of armour drops in the fight (nothing is forged since October 2026), {{pct(GEAR_DROP_CHANCE.regular, 1)}} of the time from an ordinary kill and {{pct(GEAR_DROP_CHANCE.boss, 0)}} from a boss's first fall in a run, and from [[Dungeons|dungeon]] chests. {{GEAR_TIERS.filter(t => t.dropOnly).map(t => link(path.tier(t.name), `${t.name}`)).join(' and ')}} gear only ever drops, deep in the Abyss and in the deepest dungeons.
- **Crafted:** jewellery is also made in Crafting; it drops at every rarity too.
- **Unique:** each dungeon has a [[Unique items|unique item]] of its own.

## How a drop is picked

A piece of gear that drops is rolled in four steps:

1. **Its tier:** the land's gear tier {{pct(DROP_TIER_OFFSETS.find(o => o.offset === 0).weight / DROP_TIER_OFFSETS.reduce((a, o) => a + o.weight, 0), 0)}} of the time, one tier below {{pct(DROP_TIER_OFFSETS.find(o => o.offset === -1).weight / DROP_TIER_OFFSETS.reduce((a, o) => a + o.weight, 0), 0)}}, one above {{pct(DROP_TIER_OFFSETS.find(o => o.offset === 1).weight / DROP_TIER_OFFSETS.reduce((a, o) => a + o.weight, 0), 0)}}. Each land's gear tier is on its page ([[Zones]]); in the Abyss it rises with the depth.
2. **Its rarity:** a boss's first fall (and a dungeon chest) rolls far better than an ordinary kill (the Rarities table below), and epic and legendary pieces grow more likely with the land's gear tier, about {{fmt(1 + DROP_HIGH_RARITY_PER_TIER * (MAX_GEAR_TIER - 1))}} times as likely on the top tier as on the first.
3. **Its kind:** what your hero lacks comes more often. A weapon or armour kind with an empty slot is {{DROP_EMPTY_SLOT_MULT}} times as likely (an empty jewellery slot draws no more jewellery), and a kind whose worn piece is of a lower tier than the land's gear {{DROP_BEHIND_SLOT_MULT}} times.
4. **Its depth:** past depth {{BALANCE.abyss.dropScalingFrom}} of the Abyss every depth makes dropped gear {{BALANCE.abyss.dropGrowth}} times as strong as the depth before (easing to {{BALANCE.abyss.denseDropGrowth}} times by stage {{BALANCE.enemy.denseFrom}}, with the monsters), and the piece shows its depth.

## Above legendary

From stage {{MYTHIC.from}}, a piece left by a boss of the stage ladder within {{MYTHIC.near}} stages of your best stage, and the frontier's piece (below), is **Mythic** {{pct(MYTHIC.chance, 0)}} of the time: {{fmt(RARITIES.find(r => r.id === 'mythic').quality)}} times a common piece, with {{RARITIES.find(r => r.id === 'mythic').affixes}} bonuses. From stage {{PRIMAL.from}} a Mythic is **Primal** one time in {{PRIMAL.odds}}: its stats and bonuses rolled as high as they go, and a {{RARITIES.find(r => r.id === 'primal').affixes}}th bonus. Neither can be crafted, and a boss far behind your best never leaves one, so they come to those who push.

## The frontier's piece

Once a run, from a best stage of {{FRONTIER_DROP.from}}, the first boss of the stage ladder you beat at {{pct(FRONTIER_DROP.share, 0)}} of your best stage or deeper leaves a sure piece of gear from your best stage's depth, at a boss's odds (Mythic included). Every run has a real chance at an upgrade.

## The bosses' due

A boss's first fall in a run that leaves no upgrade marks one on a gold ring round the boss on the stage path, as long as the land's gear could still beat something your hero wears. The {{PITY_MARKS}}th mark brings a sure piece of the land's own tier, at its depth, for the weapon or armour slot that lags furthest behind. An upgrade from a boss wipes the marks.

## The codex

The gear codex in the Hall keeps a page for every kind of gear at every tier: {{CODEX_TYPES.length}} kinds × {{GEAR_TIERS.length}} tiers, {{CODEX_SIZE}} pages. A page fills the first time a piece of its kind and tier reaches you, found or crafted, even if it is salvaged as it lands. The {{achievementById('armourer').name}} medal comes at {{achievementById('armourer').req.value}} pages (see [[Medals]]).

## The bag

The bag holds {{BAG_SIZE}} pieces besides what your hero wears, and {{BAG_UPGRADE.slots}} more for each bag upgrade you buy with gold, the button by the bag's tools (up to {{BAG_SIZE + BAG_UPGRADE.slots * BAG_UPGRADE.max}}; each costs more than the last, and its price follows your best stage, like the Shop's). When it is full and a new piece comes in, the weakest piece that is neither locked nor an upgrade is salvaged, and that may be the new one. If everything left is locked or an upgrade, the bag takes one more rather than lose an upgrade: nothing is ever thrown away behind your back.

A green ▲ marks a piece that beats what your hero wears, and the fight's dock offers the best of them with a one-tap **Equip**. **Salvage commons** and **Sell commons** clear the bag's unlocked common pieces in one go. Gear cannot be changed during a dungeon run.

## Auto-salvage and locking

- **Auto-salvage** salvages dropped gear up to a rarity as it lands, or with Weaker any drop weaker than what you wear, whatever its rarity: {{AUTO_SALVAGE_OPTIONS.map(o => (o === 'off' ? 'Off' : o === 'weaker' ? 'Weaker' : RARITIES.find(r => r.id === o).name)).join(', ')}}. It starts at Common, and the switch shows under the bag once a few pieces have dropped. It never takes an upgrade, nor anything you made.
- **Locking** a piece (the padlock in its detail) keeps it from being sold or salvaged, by hand or by the bag. The first copy of a unique arrives locked.

## The anvil

From Smithing {{ANVIL_LEVEL_PER_UPGRADE}} the anvil, a step of [[Smithing]], works the weapons and armour your hero wears. It has two jobs:

- **Reinforce:** the anvil's levels belong to the **slot**, not the piece, and have no top. Up to +{{MAX_UPGRADE}} each level adds {{pct(UPGRADE_STEP, 0)}} of the piece's base attack and defence (×{{fmt(forgeMult(MAX_UPGRADE))}} at +{{MAX_UPGRADE}}); past it each level multiplies them by {{FORGE_STEP}}, so +20 is ×{{fmt(forgeMult(20))}} and +30 ×{{fmt(forgeMult(30))}}. Each level needs more Smithing ({{ANVIL_LEVEL_PER_UPGRADE}} levels a step up to +{{MAX_UPGRADE}}, one a step past it, up to 99) and more bars, {{ANVIL_BAR_GROWTH}} times as many a level up to +{{MAX_UPGRADE}} and {{FORGE_BAR_GROWTH}} times past it, plus [[Monster Essence|essence]] that grows with the level and the tier.
- **Reroll:** new bonuses for the piece (not its rarity or base stats), for a piece's worth of bars, and essence that grows with each reroll, up to {{MAX_REFORGE_MULT}} times the first. A common piece has no bonuses to reroll, and a unique's are fixed.

The bars are of the metal of the best piece the slot has held: {{METALS.map(m => res(m.bar)).join(', ')}} for tiers 1 to {{METALS.length}}. {{GEAR_TIERS[5].name}} gear takes {{RESOURCES[anvilMetal(6).bar].name.toLowerCase()}}s, {{anvilBarMult(6)}} times as many, and {{GEAR_TIERS[6].name}} gear {{anvilBarMult(7)}} times as many. The work pays Smithing XP for the bars up to +10; past it the price keeps climbing but each level pays the XP of the +10 one. Practice with a metal ([[Mastery]]) takes bars off the price. Reinforcing a slot that has held {{GEAR_TIERS[0].name}} gear, level by level:

{{(() => {
    const groups = [...new Set(Object.values(SMITHING_BAR_COST))].sort((a, b) => a - b).map(bars => SMITHING_TYPES.filter(t => SMITHING_BAR_COST[t] === bars));
    const cost = (t, i) => reinforceCost(t, i, 1);
    const head = ['Level', 'Smithing #', ...groups.map(g => `${g.map(t => TYPE_NAMES[t]).join(', ')}: bars #`), 'Essence #'];
    const levels = [...Array.from({ length: MAX_UPGRADE }, (_, i) => i + 1), 15, 20, 30, 40];
    const rows = levels.map(l => [`+${l}`, cost(groups[0][0], l - 1).level, ...groups.map(g => fmt(cost(g[0], l - 1).bars)), fmt(cost(groups[0][0], l - 1).essence)]);
    return table(head, rows, { sort: false });
})()}}

A slot that has held a higher tier takes the same number of bars of that metal ({{GEAR_TIERS[5].name}} and {{GEAR_TIERS[6].name}} more, as above) and the tier times the essence.

## The slot keeps its levels

Every weapon or piece of armour you wear in a slot has that slot's levels at once: a better drop never throws your work away, and swapping pieces loses nothing. The plate on the slot (+14) shows them, even when the slot is empty, and a new piece put on says so ("+14 kept"). The ▲, the dock's Equip and the bag's comparison judge pieces by what they are, since any of them would have the slot's levels. Saves from before the forge moved to the slots gave each slot the levels of the best reinforced piece of its kind.

## Salvaging

Salvage a piece you don't need from its detail, or with **Salvage commons**:

- A dropped piece gives [[Monster Essence]]: more for a higher tier and a rarer piece, from {{salvageEssence({ tier: 1, rarity: 'common' })}} for a common {{GEAR_TIERS[0].name}} piece to {{salvageEssence({ tier: MAX_GEAR_TIER, rarity: 'legendary' })}} for a legendary {{GEAR_TIERS.at(-1).name}} one and {{salvageEssence({ tier: MAX_GEAR_TIER, rarity: 'primal' })}} for a Primal. The forge needs it.
- A dropped weapon or piece of armour also gives bars of its metal: from {{salvageBars({ type: 'Weapon', tier: 1, rarity: 'common', source: 'drop' }).qty}} for a common piece to {{salvageBars({ type: 'Weapon', tier: 1, rarity: 'legendary', source: 'drop' }).qty}} for a legendary one, {{anvilBarMult(6)}} and {{anvilBarMult(7)}} times that for {{GEAR_TIERS[5].name}} and {{GEAR_TIERS[6].name}}.
- The anvil's and the bench's work stays with the slot, so a weapon, piece of armour or jewellery gives back only what it is made of (one still carrying its own reinforcing from before the slots gives back {{pct(ANVIL_REFUND, 0)}} of those bars).
- A piece you crafted gives back about {{pct(SALVAGE_MATERIAL_RETURN, 0)}} of its materials instead, in whole bars and gems that come out fair on average.

## Upgrading and rerolling jewellery

Jewellery is worked at the jeweller's bench in [[/skills/crafting|Crafting]], from Crafting {{BENCH_LEVEL_PER_UPGRADE}}: its slot upgraded (the levels belong to the slot, as the anvil's do, with no top: +{{pct(UPGRADE_STEP, 0)}} a level up to +{{MAX_UPGRADE}}, ×{{FORGE_STEP}} past it) and its bonuses rerolled, with gems and essence. A worn piece's detail has a **Bench** button that goes there. See [[Jewellery]].

## Selling

Sell a piece for gold from its detail, or with **Sell commons**. The price is set by its tier and rarity, a little more for each level it has been upgraded. A run's kills soon pay far more, and gold goes at the next prestige, so salvaging is usually the better use of a spare piece.
