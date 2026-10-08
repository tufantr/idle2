---
path: /equipment
keywords: gear, equipment, weapon, sword, armour, armor, shield, helm, plate, greaves, boots, gauntlets, ring, amulet, earring, slots, rarity, affix, affixes, bonuses, tier, wear level, drop, codex, bag, salvage, auto-salvage, lock, anvil, reinforce, reroll, refit, reforge, sell, pity
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

A piece's attack is {{STAT_UNIT}} × its tier's power × its slot's attack weight × its rarity's quality, give or take a twentieth, and its defence likewise: a common {{GEAR_TIERS[0].name}} {{TYPE_NAMES.Weapon}} has about {{STAT_UNIT * GEAR_TIERS[0].power * SLOT_STATS.Weapon.atk}} attack. The tiers are so far apart that, on base stats, a common piece always beats a legendary one of the tier below. Jewellery carries {{pct(JEWEL_POWER, 0)}} of its tier's power: its worth is in its bonuses.

Defence also gives health, one for every {{1 / BASE.hpPerDef}} defence, and each upgrade level adds {{pct(UPGRADE_STEP, 0)}} to a piece's base attack and defence.

## Rarity and bonuses

A rarer piece carries more bonuses: none on a {{RARITIES[0].name.toLowerCase()}} piece, up to {{RARITIES.at(-1).affixes}} on a {{RARITIES.at(-1).name.toLowerCase()}} one. Each bonus is one of the kinds in the table below, rolled once when the piece is made, and a little larger on higher tiers. The bonuses of everything your hero wears add up, and a few stop at a cap (see [[Combat]]).

## Wear levels

Each tier needs a combat level before your hero can wear it (the table below). You can carry a piece before you can wear it: it shows dimmed in the bag until then.

## Where gear comes from

- **Forged:** Smithing forges a first set of {{GEAR_TIERS[0].name}} gear, and nothing stronger.
- **Dropped:** every stronger weapon and piece of armour drops in the fight, {{pct(GEAR_DROP_CHANCE.regular, 1)}} of the time from an ordinary kill and {{pct(GEAR_DROP_CHANCE.boss, 0)}} from a boss's first fall in a run, and from [[Dungeons|dungeon]] chests. {{GEAR_TIERS.filter(t => t.dropOnly).map(t => link(path.tier(t.name), `${t.name}`)).join(' and ')}} gear only ever drops, deep in the Abyss and in the deepest dungeons.
- **Crafted:** jewellery is made in Crafting. Jewellery that drops is always {{RARITIES[JEWEL_DROP_MIN_RANK].name.toLowerCase()}} or {{RARITIES.at(-1).name.toLowerCase()}}.
- **Unique:** each dungeon has a [[Unique items|unique item]] of its own.

## How a drop is picked

A piece of gear that drops is rolled in four steps:

1. **Its tier:** the land's gear tier {{pct(DROP_TIER_OFFSETS.find(o => o.offset === 0).weight / DROP_TIER_OFFSETS.reduce((a, o) => a + o.weight, 0), 0)}} of the time, one tier below {{pct(DROP_TIER_OFFSETS.find(o => o.offset === -1).weight / DROP_TIER_OFFSETS.reduce((a, o) => a + o.weight, 0), 0)}}, one above {{pct(DROP_TIER_OFFSETS.find(o => o.offset === 1).weight / DROP_TIER_OFFSETS.reduce((a, o) => a + o.weight, 0), 0)}}. Each land's gear tier is on its page ([[Zones]]); in the Abyss it rises with the depth.
2. **Its rarity:** a boss's first fall (and a dungeon chest) rolls far better than an ordinary kill, and epic and legendary pieces grow more likely on higher gear tiers.
3. **Its kind:** what your hero lacks comes more often. A kind with an empty slot is {{DROP_EMPTY_SLOT_MULT}} times as likely, and a kind whose worn piece is of a lower tier than the land's gear {{DROP_BEHIND_SLOT_MULT}} times. A ring, amulet or earring can only come {{RARITIES[JEWEL_DROP_MIN_RANK].name.toLowerCase()}} or {{RARITIES.at(-1).name.toLowerCase()}}: a lower roll is always a weapon or armour.
4. **Its depth:** past depth {{BALANCE.abyss.dropScalingFrom}} of the Abyss every depth makes dropped gear {{BALANCE.abyss.dropGrowth}} times as strong as the depth before, and the piece shows its depth.

The chance of each rarity:

{{(() => {
    const epic = RARITIES.findIndex(r => r.id === 'epic');
    const share = (kind, tier, i) => {
        const scale = 1 + DROP_HIGH_RARITY_PER_TIER * (tier - 1);
        const w = DROP_RARITY_WEIGHTS[kind].map((x, j) => (j >= epic ? x * scale : x));
        return pct(w[i] / w.reduce((a, b) => a + b, 0));
    };
    return table(['Rarity', 'Ordinary kill, gear tier 1 #', `Ordinary kill, gear tier ${MAX_GEAR_TIER} #`, 'Boss or chest, gear tier 1 #', `Boss or chest, gear tier ${MAX_GEAR_TIER} #`], RARITIES.map((r, i) => [r.name, share('regular', 1, i), share('regular', MAX_GEAR_TIER, i), share('boss', 1, i), share('boss', MAX_GEAR_TIER, i)]), { sort: false });
})()}}

## The bosses' due

A boss's first fall in a run that leaves no upgrade marks one on a gold ring round the boss on the stage path, as long as the land's gear could still beat something your hero wears. The {{PITY_MARKS}}th mark brings a sure piece of the land's own tier, at its depth, for the weapon or armour slot that lags furthest behind. An upgrade from a boss wipes the marks.

## The codex

The gear codex in the Hall keeps a page for every kind of gear at every tier: {{CODEX_TYPES.length}} kinds × {{GEAR_TIERS.length}} tiers, {{CODEX_SIZE}} pages. A page fills the first time a piece of its kind and tier reaches you, found, forged or crafted, even if it is salvaged as it lands. The {{achievementById('armourer').name}} medal comes at {{achievementById('armourer').req.value}} pages (see [[Medals]]).

## The bag

The bag holds {{BAG_SIZE}} pieces besides what your hero wears. When it is full and a new piece comes in, the weakest piece that is neither locked nor an upgrade is salvaged, and that may be the new one. If everything left is locked or an upgrade, the bag takes one more rather than lose an upgrade: nothing is ever thrown away behind your back.

A green ▲ marks a piece that beats what your hero wears, and the fight's dock offers the best of them with a one-tap **Equip**. **Salvage commons** and **Sell commons** clear the bag's unlocked common pieces in one go. Gear cannot be changed during a dungeon run.

## Auto-salvage and locking

- **Auto-salvage** salvages dropped gear up to a rarity as it lands: {{AUTO_SALVAGE_OPTIONS.map(o => (o === 'off' ? 'Off' : RARITIES.find(r => r.id === o).name)).join(', ')}}. It starts at Common, and the switch shows under the bag once a few pieces have dropped. It never takes an upgrade, nor anything you made.
- **Locking** a piece (the padlock in its detail) keeps it from being sold or salvaged, by hand or by the bag. The first copy of a unique arrives locked.

## The anvil

From Smithing {{ANVIL_LEVEL_PER_UPGRADE}} the anvil, a step of [[Smithing]], works the weapons and armour your hero wears. It has two jobs:

- **Reinforce:** +{{pct(UPGRADE_STEP, 0)}} base attack and defence a level, up to +{{MAX_UPGRADE}}. Each level needs {{ANVIL_LEVEL_PER_UPGRADE}} more Smithing levels than the last and about {{ANVIL_BAR_GROWTH}} times the bars, plus [[Monster Essence|essence]] that grows with the level and the piece's tier.
- **Reroll:** new bonuses for the piece (not its rarity or base stats), for a piece's worth of bars, and essence that grows with each reroll, up to {{MAX_REFORGE_MULT}} times the first. A common piece has no bonuses to reroll, and a unique's are fixed.

The bars are of the piece's own metal: {{METALS.map(m => res(m.bar)).join(', ')}} for tiers 1 to {{METALS.length}}. {{GEAR_TIERS[5].name}} gear takes {{RESOURCES[anvilMetal(6).bar].name.toLowerCase()}}s, {{anvilBarMult(6)}} times as many, and {{GEAR_TIERS[6].name}} gear {{anvilBarMult(7)}} times as many. The work pays Smithing XP for the bars, and practice with a metal ([[Mastery]]) takes bars off the price. Reinforcing a {{GEAR_TIERS[0].name}} piece, level by level:

{{(() => {
    const groups = [...new Set(Object.values(SMITHING_BAR_COST))].sort((a, b) => a - b).map(bars => SMITHING_TYPES.filter(t => SMITHING_BAR_COST[t] === bars));
    const cost = (t, i) => reinforceCost({ type: t, tier: 1, upgrade: i });
    const head = ['Level', 'Smithing #', ...groups.map(g => `${g.map(t => TYPE_NAMES[t]).join(', ')}: bars #`), 'Essence #'];
    const rows = Array.from({ length: MAX_UPGRADE }, (_, i) => [`+${i + 1}`, cost(groups[0][0], i).level, ...groups.map(g => cost(g[0], i).bars), cost(groups[0][0], i).essence]);
    return table(head, rows, { sort: false });
})()}}

A piece of a higher tier takes the same number of bars of its own metal ({{GEAR_TIERS[5].name}} and {{GEAR_TIERS[6].name}} more, as above) and its tier times the essence.

## The refit

A new weapon or piece of armour put on in place of a reinforced one of the same kind takes over the reinforcing: it gets the old piece's level but one, and the bars that went into it, and the old piece comes off plain. So a better drop never throws your work away, and swapping back and forth only loses a level each time. The ▲, the dock's Equip and the bag's comparison judge a new piece as it would be once refitted.

## Salvaging

Salvage a piece you don't need from its detail, or with **Salvage commons**:

- A dropped piece gives [[Monster Essence]]: more for a higher tier and a rarer piece, from {{salvageEssence({ tier: 1, rarity: 'common' })}} for a common {{GEAR_TIERS[0].name}} piece to {{salvageEssence({ tier: MAX_GEAR_TIER, rarity: 'legendary' })}} for a legendary {{GEAR_TIERS.at(-1).name}} one.
- A dropped weapon or piece of armour also gives bars of its metal: from {{salvageBars({ type: 'Weapon', tier: 1, rarity: 'common', source: 'drop' }).qty}} for a common piece to {{salvageBars({ type: 'Weapon', tier: 1, rarity: 'legendary', source: 'drop' }).qty}} for a legendary one, {{anvilBarMult(6)}} and {{anvilBarMult(7)}} times that for {{GEAR_TIERS[5].name}} and {{GEAR_TIERS[6].name}}.
- A reinforced or upgraded piece gives back half the essence and {{pct(ANVIL_REFUND, 0)}} of the bars that went into it.
- A piece you forged or crafted gives back about {{pct(SALVAGE_MATERIAL_RETURN, 0)}} of its materials instead, in whole bars and gems that come out fair on average.

## Reforging and upgrading jewellery

Jewellery is not worked at the anvil. It is upgraded (+{{pct(UPGRADE_STEP, 0)}} a level, up to +{{MAX_UPGRADE}}) and reforged (new bonuses) with essence and gold from its detail in the Inventory: see [[Jewellery]].

## Selling

Sell a piece for gold from its detail, or with **Sell commons**. The price is set by its tier and rarity, a little more for each level it has been upgraded. A run's kills soon pay far more, and gold goes at the next prestige, so salvaging is usually the better use of a spare piece.
