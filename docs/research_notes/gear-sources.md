# Where gear should come from: drops, crafting and prestige in Fantasy Idle

*Research note, 5 October 2026.*

> **Since this note (7 October 2026).** Nothing here has been built yet: the proposal (weapons and
> armour from drops only, Smithing given a new job, ordinary jewellery taken off the drop tables)
> waits for the owner's decision (DESIGN §5.5). Two balance changes made since touch its numbers:
> armour carries health, and the deep Abyss's drops grow ×1.6 a depth instead of ×1.8.


This note builds on three earlier notes: `loot_and_itemization.md`, `skilling_and_economy.md`, and section KQ6 of `combat_scaling_and_prestige.md`. It adds to them rather than repeating them.

**How to read it.**
- Facts carry an inline link to the page that was read.
- **[snippet]** marks a claim seen only in a search engine's summary; the page itself was not opened.
- *Inference* marks my own reasoning.
- **Measured** and **Computed** mark numbers I produced:
  - from the repository at commit `44b8139`;
  - from runs of a scratchpad copy of `tools/simulate.mjs` with experiment flags added (it reproduces the original's milestones exactly; three seeds, 150 hours each);
  - or from formulas.
- Nothing in the repository was changed.
- The project was paused before every research thread finished. What is missing is listed under **Gaps** at the end.

## Summary

**The question.** Should weapons and armour stop being forged, so they come only from combat and dungeon drops (with jewellery left to Crafting), to give repeated prestige runs more meaning?

**The answer (inference): yes, if four things ship with it.**

1. **Keep a short tutorial path.** Either keep copper forging, or guarantee a new hero's first few boss drops as armour pieces.
2. **Give Smithing a new job in the same change.** Smithing should:
   - reinforce dropped gear with bars;
   - smelt unwanted drops back down into bars;
   - take over the reforge (the affix reroll);
   - make at least one product that is used up every run.
3. **Reshape the drop tables.**
   - Change the tier offsets from 60/35/5 to about 25/65/10. (A drop's tier is the zone's gear tier minus one, the same, or plus one, with these weights.)
   - Weight drops toward empty and lagging slots.
   - Add a visible pity counter on frontier bosses.
   - Let dungeon chests favour named slots.
   - Leave the regular drop chance at 0.2%.
4. **Make jewellery Crafting's for real.** Take ordinary jewellery off the drop tables and keep only the unique jewels, as RuneScape 3 did with metal gear. Otherwise crafted jewellery stays as unused as it is today.

**Why.**

- **The game already runs on drops.**
  - **Measured:** forged gear made up 8–78% of the hero's worn gear power at hour 1. It was 0–44% at hour 3, and 0% from hour 5–8 onward, in every seed.
  - **Measured:** no crafted jewellery was ever worn at any snapshot in the first 60 hours.
  - The reason is timing. Forging adamant needs Smithing 55 (about 22 hours in) and runite needs 75 (about 43 hours). Dropped adamant arrives at 2–8 hours, and Dragonbone at 18–20 hours.
- **Prestige already drives the loot.**
  - **Measured:** bosses' first falls gave 56–91% of all gear drops, and every prestige re-arms them. That works out to about 0.85 upgrades per run.
  - Making weapons and armour drop-only turns this into their only route. That is how runs gain meaning in Trimps (gear tiers re-earned on maps every run) and Clicker Heroes (one relic per ascension).
- **The pace barely moves, except at the start.**
  - **Measured:** with no forge at all, stage 50 takes 1.6–2.1 hours instead of 0.8. From stage 120 on, the times match today's.
  - **Measured:** keeping copper forgeable brings the opening back to 0.8 hours. With the reshaped tables, every milestone lands at or slightly ahead of today.
  - **Measured:** tripling regular drops makes the late game run ahead (best stage at 150 hours: 298–310 against 230–280).
- **The genre agrees on the shape.**
  - Bases drop and crafting changes them: Diablo II–IV, Path of Exile, Last Epoch, Grim Dawn.
  - The top tier drops and crafting stops below it: Last Epoch's affix tiers T5 against T6–T7, World of Warcraft, Final Fantasy XIV, RuneScape 3's masterwork armour, Melvor's Dragon gear.
- **The cost is Smithing's purpose, and it is real.**
  - RuneScape 3 found "very few good reasons to train the skills or make anything with them". It fixed this the other way, by taking gear *off* the drop tables.
  - **Measured:** without forging, the simulated player smelted about 31,000 bars it had no use for.

---

## 1. Where gear comes from, and why

The earlier notes already cover:
- Melvor's craft/drop split: 236 of 609 equipment items are craftable; everything above Dragon comes from drops or chests.
- Diablo III's salvage and Kanai's Cube, Path of Exile's essences, and Diablo IV's 2026 masterworking.

### 1.1 Idle games

| Game | Made by a skill or crafting | Drop-only | Kept through a reset? | Design notes |
|---|---|---|---|---|
| **Melvor Idle** | Metal gear up to Dragon; bows; hides; staves | Everything above Dragon | No resets | The developer, Malcs: "Gear better than Dragon can be found in the later dungeons" ([Steam, 2021](https://steamcommunity.com/app/1267910/discussions/0/5350815203295856313)). |
| **NGU Idle** | Nothing | All gear, from zones. Duplicates merge, up to ×2 stats. | Kept through rebirth | From Chocolate World on, drop chance is raised to the power 1/3. A ×3.37 bonus gives only ×1.5 ([Steam, 2020](https://steamcommunity.com/app/1147690/discussions/0/2263564102375539197)). |
| **Clicker Heroes** | Nothing; relics are upgraded with Forge Cores | Relics: one per ascension, between zone 99 and two-thirds of the best zone, at 100% in that window ([Steam, 2015](https://steamcommunity.com/app/363970/discussions/0/523890528708289485/)). Level = zone/25 [snippet]. | Kept through ascension. On Transcendence "Relics are reset, but forge cores remain" ([blog](https://blog.clickerheroes.com/forge-cores-in-clicker-heroes-how-to-upgrade-relics-right/)). | Rarity runs from 60.77% common down to 0.02% transcendent; spare relics salvage into the upgrade currency. |
| **Tap Titans 2** | Mythic sets, crafted from shards won in tournaments | Ordinary equipment, from bosses. Its level follows max stage [snippet]. | Sets are permanent: "You only need to collect each set item once" ([v2.5.0 notes](https://www.taptap.cn/moment/15206518345435182)) | Mythic gear had "an extremely low drop rate", so crafting with "a large amount of bad-luck prevention" became its main source. Mythic sets give "x1.5 relics earned". |
| **Trimps** | Equipment *levels*, bought with resources | Equipment *tiers* drop from maps, a new tier every 5 map levels ([guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2809732346)) | Everything resets on Portal | Each tier multiplies attack by 1.19^13 ≈ 9.6. Later perks drop tiers automatically for zones up to 50/75/90% of the best ([config.js](https://raw.githubusercontent.com/Trimps/Trimps.github.io/master/config.js)). |
| **Idle Slayer** | Armory items, upgraded with Divinity Points; the level needed to wear rises 50 per upgrade ([Steam](https://steamcommunity.com/app/1353300/discussions/0/3194741496635256155/)) | Armory chests: 2–4% per bonus stage; the first is guaranteed to hold a sword [snippet] | Not verified | — |
| **Legends of IdleOn** | Most gear: the anvil, from bars plus monster parts ([wiki](https://idleon.wiki/wiki/Smithing)) | A few pieces, such as the Royal Turban at 1 in 1,500 ([wiki](https://idleon.wiki/wiki/Efaunt)) | No account reset | Combat supplies the scarce part, Smithing the bulk. |
| **Idle Champions** | Nothing | All gear, from chests only. A gold chest guarantees an epic every 10 ([Steam](https://steamcommunity.com/app/627690/discussions/0/5188757896270279245)). | Gear persists through resets ([Steam](https://steamcommunity.com/app/627690/discussions/0/1728701877492237060)) | +0.4% per item level ([Steam](https://steamcommunity.com/app/627690/discussions/0/4336482609599058214)). |
| **AFK Arena / AFK Journey** | AFK Journey: a forge fed by recycled gear | Gear from AFK rewards; upgrade stones from chapter 30 on ([guide](https://afk.guide/gear-upgrade-priority/)) | No reset | "Resonance" raises old gear to a set level, to fix dead drops ([guide](https://afk.guide/?p=10590)). |

### 1.2 Action RPGs and MMOs

| Game | Crafting makes | Drop-only | What the designers said |
|---|---|---|---|
| **Diablo II** | The Horadric Cube works on a *found* magic item plus a jewel, rune and gem. The result's item level is `int(.5·clvl)+int(.5·ilvl)`. It also upgrades normal to exceptional to elite, and runewords go into found socketed bases ([Arreat Summit](http://classic.battle.net/diablo2exp/items/crafteditems.shtml), [cube](http://classic.battle.net/diablo2exp/items/cube.shtml)). | Every base item, every unique and set | Crafting is "a form of Gambling for high level players" |
| **Diablo III** | Blacksmith items; set plans must first be found; Kanai's Cube rerolls dropped legendaries | Forgotten Souls: "You must go out and slay things" ([Blizzard Watch](https://blizzardwatch.com/2015/08/10/crafting-materials-diablo-3s-patch-2-3-0/)) | Josh Mosqueira: finding items should be "the most rewarding, the most satisfying and the best way to get your hands on all items" ([BlizzCon 2013](https://diablo.blizzplanet.com/blog/comments/blizzcon-2013-diablo-iii-reaper-of-souls-preview-panel-transcript/10)) |
| **Diablo IV** | Tempering (its recipes drop), Masterworking, and the 2026 Horadric Cube, which only transforms items already owned ([guide](https://diablobytes.com/diablo-iv/guides/horadric-cube/)) | The items themselves; Greater Affixes only on drops | Season 4: "easier to understand which items are upgrades when they drop"; complexity "moved… to our new crafting systems"; "fewer items will drop overall, but those items will be more likely to be valuable" ([Blizzard](https://news.blizzard.com/en-gb/article/24077223/galvanize-your-legend-in-season-4-loot-reborn)) |
| **Path of Exile** | Currency, essences and the crafting bench, all on *dropped* bases | All bases | Chris Wilson (2021), on Harvest's sure-thing crafts: "Why would I use a regular Exalted/Divine/Annul Orb when I can get one through Harvest that has a deterministic result?"; "not the Path of Exile we set out to make" ([forum](https://www.pathofexile.com/forum/view-thread/3069670)) |
| **Grim Dawn** | Blueprints (which drop) for components, consumables and some gear. Relics are craft-only except one quest relic ([dev post](https://forums.crateentertainment.com/t/grim-misadventure-37-crafting-your-future/28430)). | Legendaries; monster infrequents | The 2025 Inventor rerolls affixes on *dropped* rares, to "cater your loot to your particular needs" ([dev post](https://forums.crateentertainment.com/t/grim-misadventure-190-they-see-me-rerollin/144364/1)) |
| **Last Epoch** | Crafting only on dropped items, up to affix tier 5 ([Maxroll](https://maxroll.gg/last-epoch/resources/beginner-crafting-guide)) | Affix tiers 6–7. T5 drops from level 32, T6 from 55, T7 at 90. | Trasochi (2020): "a little too easy to get near perfect items so quickly. This makes it far less exciting to hunt for gear"; a finished build has "one or two T6 or T7 affixes" ([forum](https://forum.lastepoch.com/t/introducing-tier-6-and-7-item-affixes/22279)) |
| **Old School RuneScape** | Bronze to rune. A rune platebody needs Smithing 99 but is worn at 40 ([wiki](https://oldschool.runescape.wiki/w/Smithing)). Dragon gear is only *assembled* from dropped parts ([wiki](https://oldschool.runescape.wiki/w/Dragon_equipment)). | Dragon and above | Mod Oasis: "right now it doesn't make sense!" Mod Dylan: fixing it means "looking at nearly every drop table in the game" ([Q&A, 2022](https://oldschool.runescape.wiki/w/Update:Q%26A_Summary_09/06/2022)) |
| **RuneScape 3** (Jan 2019 rework) | Smithing level = wearing level, from 1 to 90; +1 to +5 upgrades; masterwork armour ([wiki](https://runescape.wiki/w/Mining_and_Smithing_rework)) | "We are removing all ore, bars and smithable gear from drop tables" ([design docs](https://runescape.wiki/w/Mining_and_Smithing_rework_design_documents)). The aim: "to make smithing the best way to get metal equipment, rather than combat" ([wiki](https://runescape.wiki/w/Salvage)). | 2017 dev blog: "very few good reasons to train the skills or make anything with them" ([blog](https://runescape.wiki/w/Update:Dev_Blog_-_Mining_%26_Smithing)) |
| **World of Warcraft** | Crafted gear capped below the top drops: in Legion, 815→850 with Obliterum ([wiki](https://warcraft.wiki.gg/wiki/Obliterum)); in The War Within, about 636 against 639 [snippet]. In Shadowlands, crafting made the legendary *base* and the power dropped ([wiki](https://warcraft.wiki.gg/wiki/Runecarving)). | The top item levels | Dragonflight: "Earning crafted gear should feel like a bonus, an adventure, and a social experience" ([Blizzard forum](https://us.forums.blizzard.com/en/wow/t/the-future-of-warcraft-announcements-professions-update/1222738/41)) |

Final Fantasy XIV is similar: crafted gear (item level 580) matches normal raids and sits below the hardest raid tier (600) ([The Balance](https://www.thebalanceffxiv.com/guide/endgame-gearing-and-content-unlock-guide/)).

### 1.3 The patterns

1. **Crafting has moved from making items to working on dropped ones.** Diablo IV's stated reason is legibility: a drop is easy to judge as an upgrade, and customisation happens in crafting.
2. **The top tier drops, and crafting stops a step below.** The stated reasons are to keep the hunt exciting and to leave room for unique items.
3. **When a production skill must matter, the same items come off the drop tables.**
   - RuneScape 3 did this.
   - Old School RuneScape's developers name the drop tables as what blocks their fix.
   - Where drops supply the gear, players call the skill pointless for gear: Old School RuneScape, Diablo III's Blacksmith, Melvor's own FAQ [snippet].
4. **Crafting runs on fuel from combat.** Examples: Diablo III's souls, WoW's Sparks, Diablo IV's tempering recipes, Grim Dawn's blueprints, IdleOn's boss parts.
5. **Idle games without crafting lean on other tools.** These are merging (NGU), salvage currencies (Clicker Heroes) and guarantees (Idle Champions).

*Inference:* the proposal (weapons and armour drop, jewellery is crafted, Smithing improves drops) is the mainstream action-RPG shape. Grim Dawn's craft-only relic slot is its closest model. RuneScape 3 is the warning: a production skill with no gear to make needs a new job.

---

## 2. Loot mathematics

### 2.1 How likely is a drop to be an upgrade?

**The record law.** Suppose each drop's power is an independent draw from the same distribution.
- The chance that drop n+1 beats the best of the previous n is **1/(n+1)**, whatever the distribution.
- The expected number of upgrades in n drops is the harmonic number H_n ≈ ln n + 0.577: 2.93 upgrades in 10 drops, 5.19 in 100 and 7.49 in 1,000.
- The expected wait for the second record is infinite.
- Doubling the number of drops brings no new record half the time.

All four results are in [Glick, "Breaking Records and Breaking Boards" (Amer. Math. Monthly, 1978)](https://projects.ral.ucar.edu/extremes/Extremes/nedglick.pdf).

*Inference:* if the best piece arrived at drop m, the chance of no upgrade by drop n is m/n. So the median wait for the next upgrade equals all the drops spent so far.

**Computed** by the loot-math thread: in a single slot holding an item at power c, the chance that the n-th drop upgrades it is (1 − G(c)^n)/n, where G is the distribution of drop power. A Monte Carlo run agrees. The loot table shapes only about the first 20 drops; after that every table decays like 1/n.

*Inference:* with a fixed pool of items, upgrades become exponentially rarer. Every game read here raises the pool instead:
- Diablo II's item level equals the monster's level (earlier notes).
- Last Epoch opens affix tiers by area level (T5 at 32, T6 at 55, T7 at 90).
- Tap Titans 2 sets equipment level by max stage [snippet].
- Clicker Heroes sets relic level at zone/25 [snippet].
- Trimps opens a tier every 5 map levels.
- Fantasy Idle opens a tier per zone, and past Abyss depth 5 each depth makes drops ×1.8 stronger.

So the next upgrade comes from depth, and luck only decides how soon. Fantasy Idle's own figures are in section 5.3: a boss drop has a 37% chance to beat a worn common item of the zone's tier, and only 5% to beat any +10 item.

### 2.2 Waiting times

For a drop with chance p per try ([geometric distribution](https://en.wikipedia.org/wiki/Geometric_distribution); the OSRS wiki gives the same rules on its [drop rate page](https://oldschool.runescape.wiki/w/Drop_rate)). Grey makes the design point that about 60% of players get an item before the average count, and over 10% need twice the average ([Game Developer, 2013](https://www.gamedeveloper.com/design/emotions-and-randomness-loot-drops)).

| Measure | Value |
|---|---|
| Mean wait | 1/p |
| Standard deviation | √(1−p)/p, about 1/p |
| Median | ln 2/p ≈ 0.69/p |
| 90th percentile | ln 10/p ≈ 2.3/p |
| 99th percentile | ln 100/p ≈ 4.6/p |
| Chance of nothing after 1/p tries | e⁻¹ ≈ 37% |

**Collecting a whole set** is the "coupon collector" problem ([Wikipedia](https://en.wikipedia.org/wiki/Coupon_collector%27s_problem)).
- With m equally likely pieces it takes m·H_m tries; seven pieces take 18.2.
- **Computed** by the loot-math thread, for all 12 slots (rings and earrings need two copies): 87.6 drops on average at or above the zone tier (99th percentile 196). At 0.2% per regular kill that is about 43,800 kills.
- With unequal chances p_i it takes E = ∫₀^∞ [1 − Π(1 − e^(−p_i·t))] dt.
- Melvor's god-armour set needs about 91 dungeon clears for a 75% chance and 192 for 95% (earlier notes).
- Fantasy Idle: getting all seven weapon and armour types at or above the zone's tier takes 63 drops on average (section 5.3).

### 2.3 Pity and bad-luck protection

**Found:**
- **Diablo III:** a hidden timer gives a legendary within about two hours. It ramps up gradually and resets when one drops (earlier notes).
- **Lost Ark:** each failed attempt adds rate × 0.465 to a meter, and a full meter guarantees success (earlier notes).
- **Tap Titans 2:** Mythic gear is crafted with "a large amount of bad-luck prevention" (above).
- **Idle Champions:** a gold chest gives an epic every 10 chests.
- **Clicker Heroes:** one relic is guaranteed per ascension, inside a zone window.
- **Idle Slayer:** the first Armory chest is guaranteed, and a badge is used up only when an item drops [snippet].
- **Last Epoch:** replaced a hidden chance of failure with a visible budget, because "players generally feeling unlucky when crafting" ([forum](https://forum.lastepoch.com/t/crafting-changes-coming-to-eternal-legends-update-0-8-4/45597)).
- **Fantasy Idle already has two kinds:** 50 dungeon fragments make a unique, and the first boss a hero ever beats always leaves armour.

**Published pity rules.** The means are **Computed** by the loot-math thread from each rule.

| System | Rule | Mean tries with pity | Mean tries without |
|---|---|---|---|
| Genshin 5★ | 0.6%; from pull 74 the chance rises by 6 points a pull; certain at 90 ([KQM](https://library.keqingmains.com/general-mechanics/gacha)) | 62.3 | 166.7 |
| Arknights 6★ | 2%; after 50 pulls, +2 points a pull ([wiki](https://arknights.wiki.gg/wiki/Headhunting)) | 34.6 | 50 |
| RS3 boss pets | Odds 1/D; every T kills adds 1 to the numerator, capped at 10 ([wiki](https://runescape.wiki/w/Boss_Pets)); Graardor | 2,326 | 5,000 |
| RS3 Pyramid Plunder | 1/480; each failure lowers the denominator by 1 ([wiki](https://runescape.wiki/w/Bad_luck_mitigation)) | 241 | 480 |
| OSRS Vorkath's head | 1/50, guaranteed at kill 50 ([wiki](https://oldschool.runescape.wiki/w/Bad_luck_mitigation)) | 31.8 | 50 |
| Hearthstone | A legendary within 40 packs, an epic within 10; the counter resets when one opens ([wiki](https://hearthstone.wiki.gg/wiki/Card_pack)) | about 1 legendary per 20 packs | — |

- **A designer's scheme.** Daniel Cook's "deck" mode removes an entry from the table each time it rolls, so a guarantee falls out of the table itself ([Lost Garden, 2014](https://lostgarden.com/2014/12/08/loot-drop-tables/)).

**Computed:** a hard cap of N tries on a per-try chance p gives a mean wait of (1 − (1−p)^N)/p. With p = 0.27 and N = 8, that is 3.41 tries against 3.70 with no cap. The cap fires in 11% of cycles and cuts the 99th percentile from 15 tries to 8.

*Inferences:*
- Pity mostly cuts the tail, the unluckiest players' waits. It moves the mean only when the ramp starts early: Genshin starts at 82% of its cap, Arknights at 51%.
- A visible pity counter (marks, a bar, fragments) suits an idle game, because it doubles as a goal on screen.

### 2.4 Smart loot, targeted farming, duplicates and salvage

- **Smart loot.** About 85% of Diablo III drops roll for the finder's class (earlier notes). Fantasy Idle's version would weight drops by slot.
- **Targeted farming.** Examples:
  - Path of Exile's divination cards and Melvor's dungeon chests (earlier notes);
  - Diablo III's cube, which keeps the item type when upgrading a rare (earlier notes);
  - Last Epoch's Circle of Fortune prophecies, which give "35% chance of dropping twice as many items" at rank ([Maxroll](https://maxroll.gg/last-epoch/news/item-factions-preview)).
- **Targeted gambling by slot.** Diablo III's Kadala sells a random item of a chosen slot for 25–100 shards, 10% of them legendary, so a specific armour piece costs about 2,500 shards ([Maxroll](https://maxroll.gg/d3/resources/using-kadala-efficiently)). Choosing the slot is the cleanest cure for a 12-slot collection.
- **Duplicates.**
  - Hearthstone never gives a legendary you already own ([wiki](https://hearthstone.wiki.gg/wiki/Card_pack)). Unwanted cards disenchant for dust at 1/8 (common), 1/5 (rare) and 1/4 (epic and legendary) of the crafting price ([wiki](https://hearthstone.wiki.gg/wiki/Arcane_Dust)). So four unwanted legendaries buy one chosen legendary.
  - Tap Titans 2 counts a set piece once seen, so "each set item does not need to be hoarded".
  - NGU merges duplicates into levels.
  - Diablo IV's cube fuses 3 into 1.
- **Salvage into currency.**
  - Diablo III: a legendary salvages into 1 soul (3 for Ancient, 15 for Primal); a reforge costs 50 (earlier notes).
  - Clicker Heroes: Forge Cores scale with rarity, ×0.5 to ×2.6.
  - Last Epoch: shattering gives 1 shard up to the item's number of affixes.
  - Fantasy Idle: `ceil(0.8 × tier × (rarity rank + 1))` essence, so a tier-7 legendary gives 28. Taking an item to +10 costs 110 × tier essence in total (770 at tier 7).

### 2.5 Drop chance as a stat, and how many drops an hour

- **Drop chance as a stat.**
  - Diablo II's Magic Find gives diminishing returns, MF×250/(MF+250) (earlier notes).
  - NGU applies a cube root (above).
  - **Measured:** Fantasy Idle's drop multiplier grew from 1.0 to 1.6–1.7 by hour 60 (the Fortune perk, achievements, dungeon milestones, agility and the Starless Band). That lifts a boss's first-fall gear chance from 50% to about 85%.
  - *Inference:* if drops become the only route, damp this multiplier, or the Fortune perk becomes mandatory.
- **Drops per hour.**
  - Diablo III's pity timer aimed at about one legendary per 90 minutes of farming ([Fullcleared](https://fullcleared.com/news/diablo-iii-will-internal-legendary-drop-timer/)).
  - Diablo IV chose "fewer items… more likely to be valuable", as Diablo III's Loot 2.0 did (earlier notes).
  - Hopson: "variable ratio schedules produce the highest overall rates of activity" ([Game Developer, 2001](https://www.gamedeveloper.com/design/behavioral-game-design)).
  - In Melvor, half the equipment entries on monster loot tables drop at about 3% per kill or better (earlier notes).
  - **Measured** in Fantasy Idle:

| Hours | Gear drops per hour | Upgrades per hour |
|---|---|---|
| First 3 | 4–13 | 1–5 (to hour 5) |
| 8–30 | 10–20 | 1.5–3 (to hour 45) |
| After 45 | 20–50 | 0.1–1.5 (after hour 80) |

  - About 4–6% of all drops were upgrades.
  - *Inference:* the target is several drops an hour, most of them salvaged, and an upgrade every 20–60 minutes early on. No session should pass without one; that is the pity counter's job.

---

## 3. Gear and prestige

**Facts.**
- **Gear usually survives the shallow reset.**
  - NGU players keep "Forest-tier gear for faster cap reaches after rebirths" ([Steam](https://steamcommunity.com/app/1147690/discussions/0/1744512235609531104/)).
  - So do Clicker Heroes relics, Tap Titans 2's sets and Idle Champions' gear.
- **Deeper resets wipe gear but leave a residue.**
  - Clicker Heroes keeps Forge Cores.
  - Incremental Epic Hero 2's third rebirth "resets equipment levels", but players "keep enchanted equipment" ([Steam](https://steamcommunity.com/app/1690710/discussions/0/3454842785110717952)).
- **Seasonal action RPGs reset everything.** Diablo IV seasons need "a new seasonal character", last about 3 months, and move the character to the permanent realm when they end ([Wikipedia](https://en.wikipedia.org/wiki/Diablo_IV)).
- **Trimps does the reverse.** Gear tiers are re-earned on maps every run, and re-farming the old part of the climb is automated later.
- **Gear power is usually tied to the prestige measure.**
  - Tap Titans 2: max stage [snippet]
  - Clicker Heroes: zone/25, up to two-thirds of the best zone
  - Trimps: map level
  - Idle Slayer: the level needed to wear rises with each upgrade
  - Idle Champions is the exception: a flat +0.4% per item level.
- **Gear and the prestige currency are linked in several ways:**
  - Gear multiplies the currency: Tap Titans 2's Mythic sets give ×1.5 relics.
  - The currency cheapens gear: Trimps' Artisanistry.
  - They compete for the same points: Idle Slayer's Divinity Points.
  - The drop stat is damped: NGU's cube root.
- **Failure modes and the fixes games shipped:**
  - Rarities too rare to farm:
    - Tap Titans 2's Mythic gear, later crafted with pity;
    - Idle Champions' shinies, about 1 per 1,000 chests.
  - Inventory bloat:
    - Tap Titans 2's "need not be hoarded";
    - AFK Arena's Resonance.
  - Runaway drop stacking: NGU's cube root.
  - Chores repeated every run: Trimps' automation.
  - Reset exploits: Clicker Heroes' Quick Ascension did not reset the relic flag ([Steam](https://steamcommunity.com/app/363970/discussions/0/523890528708289485/)).
- **No designer statement was found** saying that keeping farmed gear makes resets "more meaningful".

*Inferences:*
- **Kept gear makes the next run faster, as tokens do.** It makes runs *different* only when the gear chase is re-armed inside each run. Examples: Trimps' map tiers, Clicker Heroes' one relic per ascension, Tap Titans 2's equipment bosses near 80% of max stage [snippet].
- **Fantasy Idle already re-arms:** bosses pay their first-fall bonus again in every run (section 5.1).
- **The risk** is the one Pecorella describes ([Part III](https://github.com/manhonggang/Notes/blob/05a4d8834cf3b04a781c9a480dc58f0898c63ba3/%E8%A7%81%E9%97%BB%E8%B5%84%E6%96%99/The%20Math%20Behind%20Idle%20Games%20(A%20Study%20by%20Kongregate)%20-%20GameAnalytics.md)): if resetting at the same point keeps paying, players farm that point instead of pushing. So:
  - frontier drops should come only from bosses near the hero's own tier;
  - the 10-minute minimum run should stay;
  - the Abyss drop growth (`dropGrowth` 1.8 per depth) should stay below the monsters' growth (×2.26 per depth), so gear never outscales the reset.

---

## 4. What production skills do when gear is not crafted

### 4.1 Twelve jobs, with examples

1. **Consumables used every fight or run.**
   - OSRS's Saradomin brew ([wiki](https://oldschool.runescape.wiki/w/Saradomin_brew)).
   - WoW's oils, sharpening stones and flasks ([Blizzard](https://worldofwarcraft.blizzard.com/en-gb/news/23572862)).
   - Diablo IV's elixirs, made from herbs ([Maxroll](https://maxroll.gg/d4/currency/material-currency-overview)).
2. **Ammunition and reagents.**
   - OSRS cannonballs, 4 per bar ([wiki](https://oldschool.runescape.wiki/w/Cannonball)).
   - Melvor's javelins and runes. Players say Melvor's smithed helmets and platebodies are things "you will only sell", while daggers become Summoning tablets ([Steam](https://steamcommunity.com/app/1267910/discussions/0/3365901132002169133/)).
3. **Upgrade ranks on dropped items.**
   - RuneScape 3's +1 to +5: each step raises the tier while "the levels required to use the item remain the same". Bar costs double; a platebody takes 5, 10, 20, 40, 80 ([wiki](https://runescape.wiki/w/Smithing)).
   - Diablo IV's Masterworking.
   - Last Epoch's crafting up to tier 5, paid from a visible budget of "around 1 to 15" per craft ([forum](https://forum.lastepoch.com/t/crafting-changes-coming-to-eternal-legends-update-0-8-4/45597)).
4. **Choosing or rerolling an affix.**
   - Diablo IV's tempering: "any learned temper affix can be selected specifically" ([Icy Veins](https://wp-prod.icy-veins.com/huge-diablo-4-vendor-crafting-changes-in-season-11/)).
   - Diablo III's Mystic, Path of Exile's bench, Last Epoch's glyphs.
5. **Sockets, gems and materia.**
   - Diablo IV's Scattered Prism adds a socket.
   - Final Fantasy XIV's extra melds succeed 17/10/7/5% of the time ([wiki](https://ffxiv.consolegameswiki.com/wiki/Materia)).
6. **Salvage that makes every drop worth something.**
   - Last Epoch's shattering, RuneScape 3's disassembly.
   - Path of Exile's whole economy: "By having every currency item inherently useful to improve a character, each currency item is its own sink" (Wilson, 2011, [dev diary](https://pathofexile.com/forum/view-thread/55102)).
7. **Combining drops.**
   - Last Epoch's legendaries: a dropped unique plus a dropped exalted item.
   - RuneScape 3's trimmed masterwork, which combines smithed armour "with Torva and malevolent drops to make tier 92 power armour" ([design docs](https://runescape.wiki/w/Mining_and_Smithing_rework_design_documents)).
8. **A rationed crafted floor against bad luck.**
   - WoW 10.1: one Spark every two weeks; crafted gear is item level 382–408 without one and 424–447 with one ([wow-professions](https://www.wow-professions.com/news/dragonflight-patch-10-1-profession-changes)).
   - RuneScape 3's masterwork: "600 bars of each core metal" ([update](https://runescape.wiki/w/Update:Mining_and_Smithing_Rework)), "intentionally complex, time consuming and expensive".
9. **Account-wide stat ladders fed by bulk materials.**
   - IdleOn's vials: level 13 needs 1 billion of one material ([wiki](https://idleon.wiki/wiki/Vials)).
   - RuneScape 3's Archaeology relics ([wiki](https://runescape.wiki/w/Relic_powers)).
10. **Charges for companions.** In Melvor Summoning, a pair "uses 2 tablets because it uses one for its effect and then one for the synergy" ([Steam](https://steamcommunity.com/app/1267910/discussions/0/2957166487935600951)).
11. **A recycling sink that pays experience.**
    - OSRS's Giants' Foundry: 28 bars per sword, about 276,000 XP/h at best ([wiki](https://oldschool.runescape.wiki/w/Giants%27_Foundry)).
    - RuneScape 3's burial of maxed gear ([wiki](https://runescape.wiki/w/Smithing)).
12. **Tools and skilling gear.** Fantasy Idle already does this.

### 4.2 What goes when the gear route goes

- **RuneScape 3** fixed "very few good reasons to train" by moving gear *off* drops. Players welcomed "top tier armor that actually comes from skilling" at launch ([RSBandB, Jan 2019](https://informer.rsbandb.com/?p=10594)), and five months later called it "a little too punishing to passive gameplay" ([RSBandB, Jun 2019](https://informer.rsbandb.com/?p=10857)).
- **Old School RuneScape** added the Giants' Foundry because Smithing and Mining "aren't the most fun skills to train" ([blog](https://oldschool.runescape.wiki/w/Update:Giants%27_Foundry_-_Concept_%26_Rewards)).
- **Diablo III**'s Blacksmith was meant to "help fill a character's potential itemization gaps" ([GosuGamers, 2012](https://www.gosugamers.net/diablo/news/19687-game-design-updates-changes-to-inferno-and-crafting-incoming)), lost to the auction house, and was answered by better drops.
- **Melvor** players call Smithing mastery "something pointless to 99" ([Steam](https://steamcommunity.com/app/1267910/discussions/0/3365901132002169133/)).
- **Diablo IV**'s developers found that ruining ("bricking") items felt punishing, then worried they had removed the excitement ([Icy Veins](https://wp-prod.icy-veins.com/diablo-4-devs-explain-why-tempering-and-masterworking-changed/)).

*Inferences:*
- **What is lost:**
  - the choice of "I can make the piece I need";
  - a guaranteed path, which makes progress feel earned;
  - a reason for the gathering half of the game to exist.
- **Two answers work best together:** a permanent ladder on dropped gear (ranks, a chosen affix), and salvage into that ladder's currency, so bad luck still pays something.
- **Permanent ladders fill up.** In Fantasy Idle gear and skills survive prestige, so a permanent ladder is a one-time sink. Only consumables restart demand every run. For runs that mean more for the skilling half too, Smithing should have at least one product used per run.

---

## 5. Applying this to Fantasy Idle

Everything here is *inference*, except the lines marked **Measured** or **Computed**.

### 5.1 What the code does today

**Measured, from** `src/data/items.js`, `zones.js`, `dungeons.js`, `src/systems/combat.js` and `inventory.js`:

- **Tiers.** Seven tiers, ×2.2 apart. Dragonbone and Abyssal are drop-only. Each tier is worn from combat level 1/10/25/40/60/70/80.
- **Forging.** Metals open at Smithing 1/10/35/55/75. Each piece adds 0 to 9 levels on top. A set costs 19 bars, and forged gear rolls Common to Rare.
- **Drops.**
  - A regular kill drops gear 0.2% of the time; a boss's first fall in a run, 50%.
  - The tier offsets are −1/0/+1 with weights 60/35/5.
  - 72% of drops are weapons or armour.
  - Rarity weights are 50/35/12/2.5/0.5 on regular kills and 20/40/28/9/3 on bosses.
  - Past Abyss depth 5, each depth multiplies drop power by ×1.8.
- **Dungeon chests.** Gear 4% of the time, one fragment per clear (50 make the unique), and the unique itself 0.2%.
- **Upgrades and prestige.**
  - Upgrades go to +10, at +5% each, paid in essence and gold.
  - Prestige resets the stage (the next run starts at 10% of the best), gold and the camp, and keeps gear.
  - Every boss's first-fall bonus is re-armed each run.

**Measured: the mixed model already runs on drops.** Share of worn gear power that came from drops or uniques:

| Hour | 1 | 2 | 3 | 5 | 8 and later |
|---|---|---|---|---|---|
| Seed 1 | 64% | 69% | 100% | 100% | 100% |
| Seed 2 | 22% | 57% | 60% | 97% | 100% |
| Seed 3 | 92% | 55% | 56% | 100% | 100% |

- **Jewellery:** no crafted ring, earring or amulet was worn at any snapshot to hour 60, in any seed. Those slots held drops and the Crystal Heart.
- **Smithing lags drops:**
  - Smithing reaches 50 at 17–19 h, 60 at 29–30 h and 75 at 43 h.
  - Dropped weapons reach tier 4 at 2–8 h, tier 5 at 7.5–10 h, tier 6 at 18–20 h and tier 7 at 47–49 h.
  - The tier-7 time is gated by the combat level needed to wear it.
- **Where drops come from:** bosses' first falls gave 56–91% of 3,800–4,700 drops in 150 hours, re-armed by 216–271 prestiges. Regular ladder kills gave 130–280.
- **Upgrades:** 179–242 drops were upgrades when they landed, 0.83–0.89 per run.

*Inference:* the design pillar says drops run "beside crafting rather than past it" (DESIGN §1). That has drifted. The "Melvor pace" change roughly doubled the skill timeline, while prestige and the Abyss sped combat up. So the proposal changes the opening hours and Smithing's purpose, not the mid- and late-game economy. (The weapon-tier times above are faster than DESIGN §5.2's table, which looks stale.)

### 5.2 What drop-only does to the pace

**Measured:** hours to reach each stage, and best stage at 150 hours, ranged over seeds 1–3. "Slot-aware" weights a slot's drops ×4 when it is empty and ×2 when it is below the zone's tier.

| Variant | Stage 50 | Stage 100 | Stage 120 | Stage 150 | Stage 200 | Best at 150 h |
|---|---|---|---|---|---|---|
| Today (all five metals forged) | 0.8 | 3.9–5.4 | 7.5–8.4 | 15.5–20.8 | 48.2–52.9 | 230–280 |
| Drop-only, today's tables | 1.6–2.1 | 4.1–6.4 | 7.9–10.0 | 14.4–21.6 | 48.0–51.5 | 219–280 |
| Drop-only, offsets 25/65/10 | 1.6–2.1 | 3.6–4.8 | 6.8–7.4 | 13.2–15.1 | 48.9–50.6 | 262–292 |
| Drop-only, boss first fall 100%, slot-aware | 1.1–1.9 | 4.1–5.1 | 7.1–9.1 | 15.2–16.5 | 47.0–49.0 | 250–268 |
| Drop-only, regular drops 0.6%, offsets 25/65/10 | 1.6–2.1 | 4.2–5.3 | 6.6–8.9 | 13.6–20.3 | 47.1–48.2 | 298–310 |
| Copper forgeable only | 0.8 | 5.1–5.8 | 7.7–8.6 | 16.4–18.9 | 50.4–51.0 | 268–270 |
| Copper only, slot-aware, offsets 25/65/10 | 0.8 | 4.4–4.7 | 6.3–7.3 | 14.1–15.2 | 46.1–48.9 | 273–281 |
| Copper and iron forgeable | 0.8 | 3.9–5.6 | 6.6–8.1 | 14.3–19.0 | 45.7–50.5 | 230–258 |

*Inferences:*
1. **The cost is the first two hours.**
   - With no forge, the hero meets the early walls half-dressed: one run had only a weapon, a shield and greaves at hour 2.
   - More drops do not fix this. A deterministic kit does: copper forging restores 0.8 h in every seed.
2. **From stage 120 on, drop-only matches today.** The late game is set by the Abyss drop power and the wear levels.
3. **The safe levers are the offsets and slot targeting.** More regular drops made the late game run ahead.
4. **Smithing loses its purpose.** **Measured:** with no forge, the bot levelled Smithing by smelting and ended with about 31,000 bars smelted (today: about 11,000) and nothing to spend them on.

### 5.3 The loot arithmetic

**Computed** with the game's `itemScore` (drop variance 0.95–1.05) at zone gear tier 4. Each figure is the chance that one drop of the right type beats the worn piece.

| Worn piece | Boss drop, offsets 60/35/5 | Boss drop, offsets 25/65/10 | Regular drop, 60/35/5 |
|---|---|---|---|
| Common, zone tier | 0.37 | 0.69 | 0.31 |
| Rare, zone tier | 0.15 | 0.29 | 0.09 |
| Legendary, zone tier | 0.06 | 0.11 | 0.05 |
| Any rarity, upgraded to +10 | 0.05 | 0.10 | 0.05 |

- **Only the next tier beats a +10 item.** Its chance equals the +1 offset weight. Under drop-only, invested items go "sticky".
- **A full set at the zone tier** (all seven weapon and armour types, coupon collector):
  - 63 drops on average at today's offsets, which is about 127 boss first falls or 31,700 regular kills;
  - 34 drops at offsets 25/65/10;
  - 46 and 24 if jewellery leaves the drop table, because every weapon and armour piece then gets ×1.39 the share.
- **One zone-tier weapon** from boss first falls (p = 2.1% per fall) takes 48 falls on average: median 33, 90th percentile 110.

### 5.4 What would have to change

1. **The opening.**
   - Either keep copper forging (cheap; it keeps Smithing's first levels meaningful),
   - or guarantee every boss's first fall *ever* a piece for an empty slot.
2. **Tier gating by zone.**
   - Offsets about 25/65/10.
   - Re-time each zone's `gearTier` against the drop-only timeline. The comment saying it "follows the crafting timeline" is no longer true.
3. **Slot-aware drops** (Diablo III's smart loot, applied to slots): favour empty slots and those below the zone's tier.
4. **Visible pity on the frontier.**
   - A boss first fall at or above the hero's weakest weapon or armour tier, with no such piece, adds a mark. The 8th mark guarantees a piece in the weakest slot.
   - **Computed:** the chance per fall is 0.5 × 0.72 × 0.40 = 0.14 today, and 0.27 with the new offsets. At 0.27 the cap changes the mean only from 3.7 to 3.4 falls, but no streak passes 8 (the 99th percentile is otherwise 15).
5. **Dungeon chests become targeted farming.**
   - Chest gear goes from 4% to about 10–15%.
   - Each dungeon's chest favours one or two slots, named on its card.
   - This takes the role of Diablo III's bounties, Path of Exile's divination cards and Last Epoch's prophecies.
6. **Regular drops stay at 0.2%.** Damp the drop multiplier (§2.5).
7. **Salvage.**
   - Weapons and armour also give bars of their tier; Dragonbone and Abyssal give runite bars plus essence.
   - Raise the upgrade refund from 50% to 75–100%, or put upgrades on slots (§5.5), so a new drop never fights sunk essence.
8. **Jewellery.**
   - Take ordinary jewellery off the drop table and keep unique jewels (the Crystal Heart, the Starless Band).
   - Or cap dropped jewellery below crafted jewellery of the same tier.
   - Otherwise Crafting keeps a job nobody uses (§5.1).
9. **Bag.** Keep "salvage commons unless an upgrade" as the default, and add a "below my tier" filter.

### 5.5 What Smithing does instead

- **Reinforce** (RuneScape 3's +1 to +5, Diablo IV's masterworking).
  - Today's +1 to +10 upgrade (+5% each) moves to the anvil.
  - Each level costs bars of the item's tier on top of the essence, and Smithing levels open the levels.
  - RuneScape 3 doubles the cost per step. Ten steps want ×1.5: a body costs 5 bars for +1 and 192 for +10. That is about 570 bars for the whole ladder and about 2,150 for a seven-piece set, a few hours of mining and smelting per tier.
  - Dragonbone and Abyssal gear takes runite bars plus essence.
- **Or reinforce the slot** (a variant). Levels live on the equipment slot, so every better drop is a clean upgrade. This removes the stickiness in §5.3 and gives a prestige-proof, deterministic track beside the random one. The cost: items feel less like "yours".
- **Smelt down.** Weapons and armour salvage into bars and essence, so every drop is gear or fuel.
- **Temper.** The reforge moves to the anvil: bars plus essence. Smithing levels unlock "keep one affix", and later "choose an affix from a manual dropped by a boss", as Diablo IV does.
- **Assemble.** Fragments become uniques at the anvil at a Smithing level, as OSRS assembles dragon gear from dropped parts.
- **A per-run product.** Whetstones or armour kits used up in a run. This is the one sink that restarts every prestige (§4.2).
- **Tools stay.**

**Crafting keeps** jewellery, bows and rods. Jewellery stays capped at Rare, with Epic and Legendary jewels drop-only, as with Last Epoch's T5 and Grim Dawn's relics. Sockets could come later: Crafting cuts the gem, Smithing opens the socket.

### 5.6 Risks

1. **A slower first session** without a kit: measured +0.8–1.3 h to stage 50.
2. **Bad-luck streaks** (geometric tails), which need the pity counter.
3. **Mining, coal and Smithing lose their sink** unless Reinforce and Smelt-down ship in the same change.
4. **Sticky +10 items.**
5. **Loot laps.** Prestiging early to re-arm bosses could beat pushing. Keep the 10-minute minimum, and keep only frontier drops worth having.
6. **Gear outscaling tokens.** Keep `dropGrowth` below the monsters' growth.
7. **Text to update:** DESIGN §1 pillar 2, §3.4, §5.1, the `gearTier` comments and the simulator's gear policy.
8. **Old saves.** Forged items stay valid, and nothing needs migrating unless upgrades move to slots.

### 5.7 Recommendation and alternatives

**Recommendation (inference): go ahead, on these conditions.**
- **What changes.** Stop forging weapons and armour from iron (or mithril) up; they come from boss first falls, regular kills and chests.
- **What stays.**
  - Copper forging.
  - Jewellery, crafted and off the drop table, except the uniques.
- **What ships in the same change.**
  - Smithing's new job: Reinforce, Smelt-down, Temper and one per-run product.
  - The drop changes: offsets 25/65/10, slot-aware weights, frontier pity, and targeted chests at 10–15%.
- **How to accept it.** The simulator should stay inside today's bands: stage 50 within 1 h, 100 at 4–6 h, 150 at 14–21 h, 200 at 46–53 h, and a best stage of 230–300 at 150 h.

**Alternatives:**
- **(a) Keep forging, capped below drops of the same tier** (for example −10% base, Rare at most). This keeps the player's choice but not the drift fix.
- **(b) Forge only on dropped bases.** Drops arrive "unworked" and the anvil finishes them, as in Path of Exile, Last Epoch and Diablo II. It gives the most choice but doubles the interface.
- **(c) Forge up to iron or mithril, and drop above.** Simulated with copper and iron: it matches today's pace.
- **(d) Re-time the forge to lead again.** This restores the Melvor spine, but works against the goal of runs that mean more.

---

## Gaps

- **The loot-math thread finished late,** and its results were folded into §2 without further checking. Still missing:
  - a design article that makes the "fixed pool means rarer upgrades, so raise item level" argument explicitly;
  - a published formula for WoW Legion's legendary bad-luck protection (Blizzard confirmed it exists but gave no formula);
  - official Path of Exile quantity and rarity formulas.
  
  Genshin's consolidated 1.6% rate and the Diablo III Torment table rest on snippets.
- **Blocked sources.** Fandom wikis, the Melvor wiki, poewiki, Icy Veins' main site and Wowhead blocked automated reads, and the web-search budget ran out. Many idle-game facts therefore rest on Steam threads, patch-note mirrors and **[snippet]** claims, which should be checked before they are quoted as definitive.
- **Unverified items:**
  - whether ordinary Tap Titans 2 equipment survives prestige;
  - whether Idle Slayer gear survives Ascension;
  - Melvor's upgrade chains (G, U, Elite, Abyssal);
  - Last Epoch's starting Forging Potential;
  - World of Warcraft's exact crafted-gear item levels in The War Within.
- **The simulator's player is simple.** It never clicks, uses no mini-games and buys perks in a fixed order. Its numbers are a floor for an engaged player, and three seeds show wide spreads. The drop-only variants were run with flags on a copy, not with the proposed Smithing, pity or chest mechanics, which would need building and re-simulating.
