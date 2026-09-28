# Skilling and economy design in Melvor Idle, Old School RuneScape and related skill-based idle games

Access note for the report writer: the network proxy blocked `oldschool.runescape.wiki`, `wiki.melvoridle.com`, `runescape.wiki`, Fandom, Wikipedia, Steam, gamedeveloper.com, gdcvault, idleon.wiki, medium.com and the Melvor CDN. Two workarounds gave primary data:

- **OSRS wiki**: read in full from a GitHub dump of the wiki's raw page text (`Kiyogitpy/osrs-wiki-data`, e.g. https://raw.githubusercontent.com/Kiyogitpy/osrs-wiki-data/master/raw/E/Experience.txt). Citations below give the canonical wiki URL; the text was read from the mirror (pages carry 2025–2026 update notes, so the dump is current).
- **Melvor Idle**: mechanics were read directly from a prettified dump of the game's own client source (https://github.com/ChanceToZoinks/melvor-source, TotH-era ~v1.1: it contains Township and the `hasTotHEntitlement ? 120 : 99` level cap, but no Atlas of Discovery / Into the Abyss code). Per-node *data* (ore/tree XP, intervals, shop prices) lives in `melvorDemo.json`/`melvorFull.json` on the blocked CDN, so those numbers could only be recovered from search-result snippets of the Melvor wiki; every such number is tagged **(snippet)** and should be verified in-game or on the wiki before adoption.
- Findings tagged **(computed)** were calculated by me from the cited formulas with a script; the formulas are cited, the resulting numbers are mine.

## Q1. XP curve: the OSRS/Melvor experience formula, resulting totals, why it paces well, XP per action/intervals early vs late, implied hours to 99

### Takeaway
Both games use the identical RuneScape curve `XP(L) = floor( (1/4) · Σ_{ℓ=1}^{L-1} floor(ℓ + 300·2^(ℓ/7)) )`: 13,034,431 XP at 99, doubling every 7 levels once the exponential term dominates (level 92 = exactly half of 99). Melvor reuses it verbatim (and, with the expansion, extends it to 120 = 104,273,167 XP). Per-action XP grows roughly 10–25× from first to last node while intervals only grow 2–4×, so early levels fly and 99 is a 150–400 real-hour idle grind per skill at un-boosted rates.

### Cited Findings

**Formula and table (OSRS; identical in Melvor)**
- Exact formula: `Experience = ⌊ (1/4) Σ_{ℓ=1}^{L-1} ⌊ ℓ + 300·2^{ℓ/7} ⌋ ⌋`; closed-form approximation ignoring floors `≈ (1/8)(L² − L + 600·(2^{L/7} − 2^{1/7})/(2^{1/7} − 1))`, "always within 14 experience of the true value" — [OSRS Wiki: Experience](https://oldschool.runescape.wiki/w/Experience)
- RuneLite (the main OSRS client) implements exactly this: `XP_FOR_LEVEL[level-1] = xp/4; difference = (int)(level + 300.0 * Math.pow(2.0, level/7.0)); xp += difference`, with `MAX_REAL_LEVEL = 99`, `MAX_VIRT_LEVEL = 126` — [RuneLite Experience.java](https://github.com/runelite/runelite/blob/master/runelite-api/src/main/java/net/runelite/api/Experience.java)
- Melvor's client contains the same calculator: `equate(level) { return Math.floor(level + 300 * Math.pow(2, level / 7)); }` and `level_to_xp` pushes `Math.floor(this.xpSum / 4)` per level; `xpToLevel` uses the estimate `Math.floor(7 * Math.log2(2^(1/7) + ((2^(1/7) − 1)/75) * xp)) − 1` — [Melvor source: utils.js `ExperienceCalculator`](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/utils.js)
- Melvor level cap: `get levelCap() { return cloudManager.hasTotHEntitlement ? 120 : 99; }`; mastery level cap `99` — [Melvor source: skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- "The base game has a maximum skill and Mastery level of 99, with the Throne of the Herald Expansion the skill level maximum is increased to 120"; Into the Abyss adds separate "Abyssal Levels" **(snippet)** — [Melvor Wiki: Experience Table](https://wiki.melvoridle.com/w/Experience_Table)

Total XP at level (from the wiki table; "Exp. Diff" = XP needed to go from L−1 to L; "% to 99" = share of 13,034,431) — [OSRS Wiki: Experience](https://oldschool.runescape.wiki/w/Experience):

| Level | Total XP | XP from previous level | % of 99 |
|---|---|---|---|
| 2 | 83 | 83 | 0.00 |
| 3 | 174 | 91 | 0.00 |
| 10 | 1,154 | 185 | 0.01 |
| 20 | 4,470 | 497 | 0.03 |
| 30 | 13,363 | 1,332 | 0.10 |
| 40 | 37,224 | 3,576 | 0.29 |
| 50 | 101,333 | 9,612 | 0.78 |
| 60 | 273,742 | 25,856 | 2.10 |
| 70 | 737,627 | 69,576 | 5.66 |
| 80 | 1,986,068 | 187,260 | 15.24 |
| 85 | 3,258,594 | 307,221 | 25.00 |
| 90 | 5,346,332 | 504,037 | 41.02 |
| 92 | 6,517,253 | 614,422 | 50.00 |
| 99 | 13,034,431 | 1,228,825 | 100.00 |
| 100 (virtual) | 14,391,160 | 1,356,729 | — |
| 110 (virtual) | 38,737,661 | 3,652,007 | — |
| 120 (Melvor TotH cap) | 104,273,167 | 9,830,430 | — |
| 126 (virtual max) | 188,884,740 | 17,807,283 | — |
| XP cap | 200,000,000 | — | — |

- Why the shape: "The amount of experience needed for the next level is approximately 10% more than the last level… By around level 30, the exponential factor predominates, so that the amount of experience required doubles for each 7th level. Accordingly, level 92 is nearly the exact halfway mark to level 99… and level 85 requires very nearly one quarter" — [OSRS Wiki: Experience](https://oldschool.runescape.wiki/w/Experience)
- "Graphing the same data on a logarithmic scale shows that the function starts being exponential around level 15"; the "X is half of X+7" rule "becomes more accurate the higher the skill level is" — [OSRS Wiki: Experience](https://oldschool.runescape.wiki/w/Experience)
- Storage detail: XP is a signed 32-bit int treated as fixed-point with one decimal place, hence the 200,000,000 cap; fractional XP drops are rounded down to one decimal — [OSRS Wiki: Experience](https://oldschool.runescape.wiki/w/Experience) (citing Mod Ash)
- Verification **(computed)**: my script reproducing the RuneLite loop gives exactly the wiki numbers above; ratio XP(L)/XP(L−7) = 2.12 at L=30, 2.04 at 40, 2.01 at 50, 2.000 from L≥70; ratio of per-level XP requirement at L vs L−7 is 1.995 at 30 and 2.000 from 60 up.

**XP per action and intervals, early vs late**

OSRS (XP per resource; the *time* per resource is a success-roll process, see Q2):
- Logs: normal 25 (lvl 1), oak 37.5 (15), willow 67.5 (30), teak 85 (35), maple 100 (45), mahogany 125 (50), yew 175 (60), magic 250 (75), redwood 380 (90) — [OSRS Wiki: Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting)
- Ores: clay/rune essence 5 (1), copper/tin 17.5 (1), iron 35 (15), silver 40 (20), coal 50 (30), gold 65 (40), mithril 80 (55), adamantite 95 (70), runite 125 (85), amethyst 240 (92) — [OSRS Wiki: Mining](https://oldschool.runescape.wiki/w/Mining)
- Cooked fish: shrimps 30 XP/heals 3 (lvl 1), sardine 40/4 (1), herring 50/5 (5), trout 70/7 (15), salmon 90/9 (25), tuna 100/10 (30), lobster 120/12 (40), swordfish 140/14 (45), monkfish 150/16 (62), shark 210/20 (80), anglerfish 230 (84), manta ray 216.2/22 (91) — [OSRS Wiki: Cooking](https://oldschool.runescape.wiki/w/Cooking)
- Hours-to-99 anchors quoted by the wiki: power-mining iron in the Mining Guild reaches "up to 70k xp/h" — [OSRS Wiki: Iron rocks](https://oldschool.runescape.wiki/w/Iron_rocks); making wine is "one of the fastest methods for reaching 99 Cooking (yielding 400k+ experience per hour if done optimally)" — [OSRS Wiki: Cooking](https://oldschool.runescape.wiki/w/Cooking); High Level Alchemy "1,200 items per hour… 78,000 Magic experience" — [OSRS Wiki: High Level Alchemy](https://oldschool.runescape.wiki/w/High_Level_Alchemy)

Melvor (fixed intervals):
- Woodcutting: "Magic Tree provides 100 XP per 10 seconds, while Yew Tree (a tier lower) provides 80 XP per 6 seconds, and Redwood Tree (a tier higher) provides 180 XP per 7.5 seconds"; "Redwoods are designed for the highest Woodcutting XP/hr but low GP/hr, while Magic Logs are designed for the highest GP/hr but low XP/hr" **(snippet)** — [Melvor Wiki: Woodcutting](https://wiki.melvoridle.com/w/Woodcutting)
- Mining base interval is 3,000 ms (`this.baseInterval = 3000`), rock base HP 5, passive regen every 10,000 ms — [Melvor source: rockTicking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/rockTicking.js)
- Cooking: "Roasting on a Cooking Fire takes anywhere from 2 seconds (Shrimp) to 13 seconds (Mystic Shark)"; "Swordfish… requires level 50 Cooking"; "Low level fish, such as Sardines, heal as much as Snape Grass… both healing 40" **(snippet)** — [Melvor Wiki: Cooking](https://wiki.melvoridle.com/w/Cooking)
- Smithing/Herblore base interval 2,000 ms; Crafting 3,000 ms — [Melvor source: smithing.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/smithing.js), [herblore.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/herblore.js), [crafting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/crafting.js)
- Melvor mithril platebody: "With the Smithing Gloves (50% xp), Firemaking cape (5% xp), and ancient ring of skills (8% xp), you get 407.5 xp per platebody made from mithril bars" **(snippet)** — [Steam discussion "A question with Smithing"](https://steamcommunity.com/app/1267910/discussions/0/5367692919516901056/) (407.5/1.63 = 250 base XP, the same as OSRS's mithril platebody)

**Implied hours to 99 (computed)** from 13,034,431 XP at flat rates: 10k xp/h → 1,303 h; 20k → 652 h; 36k (Melvor magic tree, un-boosted) → 362 h; 48k (Melvor yew) → 272 h; 60k → 217 h; 86.4k (Melvor redwood) → 151 h; 100k → 130 h; 200k → 65 h.

### Inferences
- The curve's pacing virtue is that *every* 7 levels costs about as much as everything before them: the first 50 levels cost 0.78% of 99, levels 92–99 cost 50%. For an idle game this gives a fast tutorial (levels 1–30 in minutes at 3-second actions), a mid-game where each new tier unlock (every ~10–15 levels) is a visible milestone, and a "prestige-like" tail where 99 is a long-term goal. Melvor adopted it unchanged, which strongly suggests it works for a pure idle game.
- Because the curve doubles every 7 levels, designers keep XP/hour roughly doubling every ~15–20 levels via new nodes (OSRS logs: 25→37.5→67.5→100→175→250→380 across 90 levels ≈ ×15) and tool/mastery speedups, so the *time per level* rises much more slowly than the XP per level. If Fantasy Idle keeps 3 s actions and ~15× XP growth across tiers, expect ~150–400 h to 99 per skill; multiply node XP or halve intervals to hit a different target.
- A developer can adopt the table directly (99 rows) or the closed form; the "level from XP" inverse in Melvor (`7·log2(...)` estimate, then a one-step correction) is a cheap O(1) implementation.

### Gaps
- No Melvor per-node XP/interval table for every ore/tree/fish could be fetched (wiki and CDN blocked); only the yew/magic/redwood, shrimp/mystic shark and mithril-platebody numbers above are sourced.
- No developer statement of an intended hours-to-99 or "first 20 hours" target was found for either game (see Q6).

## Q2. Action timing: fixed intervals vs success-chance rolls; tool and mastery effects; Melvor's mastery system and pool formulas

### Takeaway
OSRS gathering is a *roll every N ticks* model (woodcutting every 4 ticks; mining every 8→2.83 ticks depending on pickaxe) with a per-node linear success chance from a (low, high) pair; better axes raise the chance, better pickaxes only raise roll frequency. Melvor is a *fixed interval* model (mining 3 s, smithing 2 s, per-recipe cooking intervals) modified by percentage and flat modifiers with a 250 ms floor, and layers a Mastery system whose per-action XP formula, pool cap (500,000 × actions) and 10/25/50/95% checkpoints are fully reproduced below from the game source.

### Cited Findings

**OSRS success-roll model**
- Skilling success function: `P(Level) = (1 + ⌊ low·(99−Level)/98 + high·(Level−1)/98 + 0.5 ⌋) / 256`, clamped to [0,1]; low/high are per-action constants; at level 1 the chance is `(1+low)/256`, at 99 `(1+high)/256`; input clamped to 99 (visible boosts over 99 ignored, invisible boosts use a similar formula) — [OSRS Wiki: Skilling success rate](https://oldschool.runescape.wiki/w/Skilling_success_rate)
- Worked example from the wiki: raw monkfish low 48 / high 90 → at level 74, `(1 + ⌊12.245 + 67.041 + 0.5⌋)/256 = 80/256 = 0.3125` — [OSRS Wiki: Skilling success rate](https://oldschool.runescape.wiki/w/Skilling_success_rate)
- Game tick is 0.6 s; woodcutting: "Most trees follow the same mechanics when cut, rolling to chop a log every 4 game ticks"; "With a high Woodcutting level and a good axe, a 100% success rate can be achieved when cutting certain lower-level trees" (Mod Ash: for oaks and below an adamant axe reaches 100%, "not the case for willows or above") — [OSRS Wiki: Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting)
- Mining: "Higher-level pickaxes grant more frequent opportunities to obtain an ore from a rock but do not impact the success rate" (Mod Ash: "Your level affects the chance of getting ore each time the game rolls; your pickaxe affects how often that happens") — [OSRS Wiki: Mining](https://oldschool.runescape.wiki/w/Mining)
- Smithing: "Smithing takes place at a time interval of 5 ticks (roughly 3 seconds) per item created, regardless of the items being created or how many bars are being used per item"; each Smiths' Uniform piece gives 20% chance to speed anvil actions by 1 tick — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing)
- Cooking: an inventory (28) "cooked on a range will take approximately 1 minute and 5 seconds"; the 2-tick trick is "around 30–40% faster than afk cooking" — [OSRS Wiki: Cooking](https://oldschool.runescape.wiki/w/Cooking)
- Firemaking success: "65/256 at level 1 and 513/256 at level 99 (with 256/256 being achieved at 43), interpolating linearly in between" (wiki flags this as crowdsourced) — [OSRS Wiki: Firemaking](https://oldschool.runescape.wiki/w/Firemaking)

Woodcutting success (low, high) pairs per axe — [OSRS Wiki: Tree](https://oldschool.runescape.wiki/w/Tree), [Oak tree](https://oldschool.runescape.wiki/w/Oak_tree), [Yew tree](https://oldschool.runescape.wiki/w/Yew_tree), [Magic tree](https://oldschool.runescape.wiki/w/Magic_tree):

| Axe (WC level req.) | Normal tree (lvl 1) | Oak (15) | Yew (60) | Magic (75) |
|---|---|---|---|---|
| Bronze (1) | 64 / 200 | 32 / 100 | 4 / 12 | 2 / 6 |
| Iron (1) | 96 / 300 | 48 / 150 | 6 / 19 | 3 / 9 |
| Steel (6) | 128 / 400 | 64 / 200 | 8 / 25 | 4 / 12 |
| Black (11) | 144 / 450 | 72 / 225 | 9 / 28 | 5 / 13 |
| Mithril (21) | 160 / 500 | 80 / 250 | 10 / 31 | 5 / 15 |
| Adamant (31) | 192 / 600 | 96 / 300 | 12 / 37 | 6 / 18 |
| Rune (41) | 224 / 700 | 112 / 350 | 14 / 44 | 7 / 21 |
| Dragon (61) | 240 / 750 | 120 / 375 | 15 / 47 | 7 / 22 |
| Crystal (71) | 250 / 800 | 125 / 400 | 16 / 50 | 8 / 23 |

- Relative axe strength: dragon axe's chance is 385% of bronze, 128.3% of adamant, 110% of rune; crystal is 104.5% of dragon — [OSRS Wiki: Axe](https://oldschool.runescape.wiki/w/Axe)
- Tree depletion/respawn: trees despawn on a timer starting at first cut (oak 27 s, willow 30 s, maple 60 s, yew 114 s, magic 234 s, redwood 264 s) and respawn after oak 8.4 s, maple 35.4 s, yew 59.4 s, magic/redwood 119.4 s; normal trees give one log and respawn in 36–60 s — [OSRS Wiki: Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting), [Tree](https://oldschool.runescape.wiki/w/Tree)

Mining success (low, high) and respawn per rock — [Iron rocks](https://oldschool.runescape.wiki/w/Iron_rocks), [Coal rocks](https://oldschool.runescape.wiki/w/Coal_rocks), [Mithril rocks](https://oldschool.runescape.wiki/w/Mithril_rocks), [Adamantite rocks](https://oldschool.runescape.wiki/w/Adamantite_rocks), [Runite rocks](https://oldschool.runescape.wiki/w/Runite_rocks):

| Rock | Level | XP | low / high | Respawn |
|---|---|---|---|---|
| Iron | 15 | 35 | 96 / 350 | 5.4 s (2.4 s in Mining Guild) |
| Coal | 30 | 50 | 16 / 100 | 30 s |
| Mithril | 55 | 80 | 4 / 50 | 2 min |
| Adamantite | 70 | 95 | 2 / 25 | 4 min (2 in guild) |
| Runite | 85 | 125 | 1 / 18 | 12 min (6 in guild) |

- Runite worked example from the wiki: at 99 with a rune pickaxe, 19/256 per 3 ticks → expected 24.25 s per ore, median ≈ 16.2 s — [OSRS Wiki: Runite ore](https://oldschool.runescape.wiki/w/Runite_ore)
- Pickaxes: ticks between rolls bronze 8, iron 7, steel 6, black 5, mithril 5, adamant 4, rune 3, dragon 2.83 (3 with a 1/6 chance of 2), crystal 2.75; Mining level req 1/1/6/11/21/31/41/61/71 and Attack level to wield 1/1/5/10/20/30/40/60/70 — [OSRS Wiki: Pickaxe](https://oldschool.runescape.wiki/w/Pickaxe)
- **(computed)** with the formula: yew with dragon axe = 14.1% per roll at 61, 18.8% at 99 (≈49k XP/h at 99 ignoring depletion); magic with dragon axe = 7.4% at 75 → 9.0% at 99 (≈34k XP/h); oak with rune axe hits 100% at 60; coal 16.4% (lvl 30) → 39.5% (99); runite 6.6% (85) → 7.4% (99). The wiki trivia "At level 82 and 89 woodcutting, both the rune axe and the dragon axe have the same chance to successfully chop magic trees" — [OSRS Wiki: Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting) — is consistent with the floor in the formula.

**Melvor fixed-interval model**
- `modifyInterval(interval, action)`: `interval *= 1 + percentModifier/100; interval += flatModifier; interval = roundToTickInterval(interval); return Math.max(interval, 250)` — [Melvor source: skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- Mining: `baseInterval = 3000`, `baseRockHP = 5`, `passiveRegenInterval = 10000`; rock HP = `5 (+10 at pool tier 3) + masteryLevel + modifiers`, min 1; each action removes 1 HP unless the "rock HP preserve" roll succeeds; on depletion `respawnInterval = rock.baseRespawnInterval` (×0.9 at pool tier 1); pool tier 2 gives a flat −200 ms — [Melvor source: rockTicking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/rockTicking.js)
- "Ore and essence rocks passively regenerate HP at a rate of 1 every 10 seconds"; "Rock HP = 5 + Mastery Level + Boosts" **(snippet)** — [Melvor Wiki: Mining](https://wiki.melvoridle.com/w/Mining)
- Pickaxes: "permanent upgrades purchased from the Shop that decrease the amount of time it takes to mine ore by their bonus speed percentage. The later pickaxes also provide a number of other bonuses, and these bonuses are permanently active once purchased" **(snippet)** — [Melvor Wiki: Mining](https://wiki.melvoridle.com/w/Mining)
- The shop's tool chains are implemented as skill-interval modifiers: "Woodcutting: axes (via skillInterval modifiers); Fishing: rods; Mining: pickaxes" plus cooking Fire/Furnace/Pot upgrade chains — [better_idle shop.dart (a Melvor re-implementation that loads the real game JSON)](https://github.com/eseidel/better_idle/blob/main/logic/lib/src/data/shop.dart)
- Cooking passive slots run at 5× the active interval: `getRecipeCookingInterval(recipe) * 5 * (1 − modifier/100)` — [Melvor source: cooking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/cooking.js)
- Community ETA tool (which reads live game data) confirms mining attempt time = `(actionInterval × effectiveRockHP + respawnInterval) / effectiveRockHP`, regen "1 hp every 10s", respawn modifier −10% with pool tier 1, flat −200 ms with pool tier 2 — [gmiclotte melvor-scripts EtaMining.ts](https://github.com/gmiclotte/melvor-scripts/blob/master/ETA/src/EtaMining.ts)

**Melvor Mastery system (from source)**
- Checkpoints: `const masteryCheckpoints = [10, 25, 50, 95];` — [Melvor source: mastery2.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/mastery2.js); `isPoolTierActive(tier) { return this.masteryPoolProgress >= masteryCheckpoints[tier]; }` — [skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- Mastery XP per action:
  `xpToAdd = ( (totalUnlockedMasteryActions × totalCurrentMasteryLevel / trueMaxTotalMasteryLevel) + masteryLevel(action) × (trueTotalMasteryActions / 10) ) × (interval/1000) / 2`, then `× (1 + masteryXPModifier/100)` — [skill.js `getMasteryXPToAddForAction`](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- The `interval` passed is `masteryModifiedInterval`: smithing/herblore/runecrafting 1,700 ms, crafting 1,650 ms, fletching 1,300 ms, cooking `baseInterval × 0.85`, firemaking `baseInterval × 0.6`, mining/woodcutting/fishing = the actual action interval — [smithing.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/smithing.js), [crafting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/crafting.js), [fletching.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/fletching.js), [cooking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/cooking.js), [firemakingTicks.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/firemakingTicks.js), [rockTicking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/rockTicking.js)
- Pool XP per action: `getMasteryXPToAddToPool(xp) { if (this.level >= 99) return xp / 2; return xp / 4; }`; pool cap `trueTotalMasteryActions * 500000` (× a modifier-adjustable percent); mastery levels use the same `exp.level_to_xp` table, capped at 99 — [skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- Mastery token chance per action: `totalUnlockedMasteryActions / 185` percent (× off-item modifiers) — [skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- Same formula independently documented (with realm scoping for the later expansion) in the community ETA script: "baseMasteryXP = average × (interval / 1000)" where average = (skillContribution + actionContribution)/2 — [gmiclotte EtaSkillWithMastery.ts](https://github.com/gmiclotte/melvor-scripts/blob/master/ETA/src/EtaSkillWithMastery.ts); pool: "level ≥ 99 → masteryXp/2 else /4", `poolCheckpoints = [10, 25, 50, 95, Infinity]` — [EtaSkillWithPool.ts](https://github.com/gmiclotte/melvor-scripts/blob/master/ETA/src/EtaSkillWithPool.ts)
- Example **(computed)**: skill with 20 actions (10 unlocked), total current mastery 100, action mastery 30, 3 s interval → 90.8 mastery XP per action; 22.7 to the pool (45.4 at skill level 99); pool cap 10,000,000; 10% checkpoint at 1,000,000.

Per-skill mastery effects (all from the Melvor source; "tier 0–3" = pool 10/25/50/95%):

| Skill | Per-action mastery level effects | Pool checkpoint effects |
|---|---|---|
| Mining | doubling chance `+floor(m/10)` % (+6 at 99); rock HP +1 per level (more ore per respawn) | T0 +5% mastery XP; T1 respawn ×0.9; T2 −200 ms; T3 rock HP +10 — [rockTicking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/rockTicking.js) |
| Woodcutting | doubling `+floor(m/10)×5` %; at 99 −200 ms interval | T0 +5% mastery XP; T1 +5% double; T3 +1 bird nest; tree-cut limit = `1 + increasedTreeCutLimit` modifier — [woodcutting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/woodcutting.js) |
| Fishing | `rollPercentage(masteryLevel × 0.4)` chance to double (guaranteed at 99); m≥50 +3% special-item chance; m≥65 no junk | T0 +5% mastery XP; T1 no junk; T2 +5% double; T3 25% chance of an extra special item — [fishing.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/fishing.js) |
| Cooking | success `70 + 0.6×m` % (cap 100, i.e. 100% at m=50); perfect-cook `floor(m/10)×5` % (+50 at 99) | T0 +5% mastery XP; T1 +5% double; T2 +10% preservation — [cooking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/cooking.js) |
| Smithing | doubling `+floor((m+10)/20)×5` % (+10 at 99); preservation `+floor(m/20)×5` % (+10 at 99) | T0 +5% mastery XP; T1 +5% preservation; T2 +5% preservation; T3 +10% double — [smithing.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/smithing.js) |
| Herblore | potion tier by mastery: `tierMasteryLevels = [1, 20, 50, 90]` (I–IV); preservation `+(m−1)×0.2` % (+5 at 99) | T0 +5% mastery XP; T1 +3% XP; T2 +5% preservation; T3 +10% double — [herblore.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/herblore.js) |
| Crafting | preservation `+(m−1)×0.2` % (+5 at 99) | T0 +5% mastery XP; T1 +5% preservation; T2 −200 ms; T3 +1 item when making jewelry — [crafting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/crafting.js) |
| Fletching | preservation `+0.2×(m−1)` % (+5 at 99) | T0 +5% mastery XP; T2 +1 quantity; T3 −200 ms — [fletching.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/fletching.js) |
| Runecrafting | runes per action `+floor(m/15)` (+4 at 99); rune cost reduction `floor(m/10)×5` % (+15% at 99) | T2 +10% preservation; T3 +5 quantity — [runecrafting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/runecrafting.js) |
| Firemaking | interval −0.1% per mastery level; each log at 99 mastery gives +0.25% global mastery XP | T0 +5% mastery XP; T1 −10% interval; T2 +25% of log sale price as GP; T3 +5% global mastery XP — [firemakingTicks.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/firemakingTicks.js) |

- Wiki confirmation **(snippet)**: "In Woodcutting every 10 levels provide +5% chance to get double the amount of log"; "Checkpoints are reached when the Mastery Pool reaches 10%, 25%, 50%, and 95% filled. These bonuses vary by skill, but are often quite powerful. Checkpoints only remain active as long as the Mastery Pool has enough XP in it to meet the requirement" — [Melvor Wiki: Mastery](https://wiki.melvoridle.com/w/Mastery)
- Skill XP modifiers are additive percentages: `modifyXP(amount) = amount × (1 + getXPModifier/100)` where the modifier sums global, non-combat and per-skill increases — [skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)

### Inferences
- OSRS's (low, high)/256 table is a compact, data-driven way to make level *and* tool both matter without changing intervals: a designer stores two integers per (node, tool) pair. Its weakness for idle play is variance and the need for per-node tuning; Melvor's deterministic interval × modifiers model is simpler to simulate offline and easier for players to reason about, which is why Melvor chose it.
- Melvor separates three growth levers: (a) skill level unlocks nodes, (b) tool purchases cut intervals by a flat percentage, (c) mastery adds yield (double chance), preservation and small interval cuts. Mastery XP scales with action time (`interval/1000`) so slow high-tier actions and fast low-tier actions master at comparable rates, and with how much of the skill is already mastered, so early mastery is slow and later mastery snowballs.
- The mining "rock HP = 5 + mastery" plus a fixed respawn is a clean way to make mastery increase throughput on rare nodes without touching interval, directly applicable to Fantasy Idle nodes.

### Gaps
- Melvor pickaxe/axe/rod upgrade list (names, GP costs, exact % interval reductions) is data-only; not retrievable here.
- The exact modifier granted at Woodcutting pool 50% (widely described as cutting two trees at once) is data, not code; only the `increasedTreeCutLimit` modifier hook is confirmed.
- OSRS (low, high) pairs for willow/maple/teak/mahogany/redwood and copper/tin/silver/gold rocks were not extracted (available on those wiki pages).

## Q3. Cross-skill dependency graph, resource sinks that keep low tiers relevant, herblore secondaries

### Takeaway
OSRS's graph is explicit and deep: mining → smithing (with coal demand scaling 2→4→6→8 per bar), woodcutting → firemaking/fletching/construction, fishing → cooking (which needs a fire/range), farming → herblore (herb + secondary + vial), crafting eats gold/silver bars + gems. Melvor keeps the same skeleton (ore+coal → bars → gear; logs → firemaking/fletching; herbs from farming + secondaries → 4-tier potions) but makes sinks idle-friendly (firemaking converts logs to XP/GP; smithing consumes bars for gear). The strongest late-game sinks for low-tier goods are coal scaling, planks/nails/arrow shafts, and OSRS's 5-bar platebody spam.

### Cited Findings

**Smithing inputs (OSRS)** — [OSRS Wiki: Bar](https://oldschool.runescape.wiki/w/Bar), [Smithing](https://oldschool.runescape.wiki/w/Smithing):

| Bar | Smithing lvl | Ore(s) | Coal | XP |
|---|---|---|---|---|
| Bronze | 1 | 1 tin + 1 copper | 0 | 6.2 |
| Iron | 15 | 1 iron (50% fail w/o ring of forging/Blast Furnace/Superheat) | 0 | 12.5 |
| Silver | 20 | 1 silver | 0 | 13.7 |
| Steel | 30 | 1 iron | 2 | 17.5 |
| Gold | 40 | 1 gold | 0 | 22.5 (56.2 with goldsmith gauntlets) |
| Mithril | 50 | 1 mithril | 4 | 30 |
| Adamant | 70 | 1 adamantite | 6 | 37.5 |
| Runite | 85 | 1 runite | 8 | 50 |

- "Coal is required to smelt all ores above iron (other than gold, silver, lead, and nickel), in increasing amounts"; coal rock respawns in 30 s; coal bag holds 27; Blast Furnace "uses only half the coal"; smithing catalyst halves coal and doubles XP — [OSRS Wiki: Coal](https://oldschool.runescape.wiki/w/Coal), [Bar](https://oldschool.runescape.wiki/w/Bar), [Smithing](https://oldschool.runescape.wiki/w/Smithing)
- Melvor coal scaling **(snippet)**: "Mithril requires 1 Mithril ore + 4 coal to make a bar… Rune takes 8 coal per 1 Rune Ore… dragonite bars require 12 coal"; "Mining/smithing Mithril items gives better exp/hr than adamantite or runite due to the increasing number of coal required diluting the exp earned" — [Steam: "What Do I do with coal ore?"](https://steamcommunity.com/app/1267910/discussions/0/2969523484461718087/), [Melvor Wiki: Smithing/Training](https://wiki.melvoridle.com/w/Smithing/Training). In code, coal is a first-class cost with its own reducers: `if (item.id === "melvorD:Coal_Ore") quantity = applyModifier(quantity, decreasedSmithingCoalCost, 2); quantity -= decreasedFlatSmithingCoalCost` — [Melvor source: smithing.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/smithing.js)

**Logs (OSRS)**
- Firemaking XP per log: normal 40, oak 60, willow 90, teak 105, maple 135, mahogany 157.5, yew 202.5, magic 303.8, redwood 350 (level = the woodcutting level of the log) — [OSRS Wiki: Firemaking](https://oldschool.runescape.wiki/w/Firemaking)
- Fletching: unstrung bows XP shortbow 5 / longbow 10 (logs), oak 16.5/25, willow 33.3/41.5, maple 50/58.3, yew 67.5/75, magic 83.3/91.5; "Normal logs can be fletched into 15 arrow shafts, oak into 30, adding 15 additional shafts for each tier of logs higher" — [OSRS Wiki: Fletching](https://oldschool.runescape.wiki/w/Fletching)
- Construction: planks made at the sawmill for 1 log + coins; regular plank costs 100 coins; the sawmill price list is 100 / 250 / 500 / 1,500 / 2,500 / 5,000 coins by plank type; regular plank = 29 XP, oak plank = 60 XP — [OSRS Wiki: Sawmill operator](https://oldschool.runescape.wiki/w/Sawmill_operator), [Plank](https://oldschool.runescape.wiki/w/Plank), [Construction](https://oldschool.runescape.wiki/w/Construction)
- Cooking needs a heat source: "the player uses a raw, cookable food on a range or fire… If no range is nearby, having an axe and tinderbox on hand can allow the player to cut down a tree and make a fire"; "only meat, fish and stew can be cooked on an open fire" — [OSRS Wiki: Cooking](https://oldschool.runescape.wiki/w/Cooking)
- Melvor firemaking is a pure log sink: XP = `baseExperience × (1 + bonfireBonusXP/100)`, GP only from modifiers or pool tier 2 (`gpToAdd += baseSalePrice × 0.25`) — [Melvor source: firemakingTicks.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/firemakingTicks.js)

**Herblore (OSRS)** — [OSRS Wiki: Herblore](https://oldschool.runescape.wiki/w/Herblore), [Herblore secondaries](https://oldschool.runescape.wiki/w/Herblore_secondaries):
- Requires Druidic Ritual (250 XP → level 3). Pipeline: grimy herb → clean (2.5 XP guam … 15 XP torstol) → herb + vial of water = unfinished potion → + secondary = 3-dose potion; amulet of chemistry 5% (alchemist's amulet 15%) chance of a 4-dose; prescription goggles 10% chance to save the secondary.
- Potion table (level, XP, herb + secondary): Attack 3/25 guam + eye of newt; Antipoison 5/37.5 marrentill + unicorn horn dust; Strength 12/50 tarromin + limpwurt root; Compost 22/60 harralander + volcanic ash; Restore 22/62.5 harralander + red spiders' eggs; Energy 26/67.5 harralander + chocolate dust; Defence 30/75 ranarr + white berries; Agility 34/80 toadflax + toad's legs; Combat 36/84 harralander + goat horn dust; Prayer 38/87.5 ranarr + snape grass; Super attack 45/100 irit + eye of newt; Superantipoison 48/106.3 irit + unicorn horn dust; Fishing 50/112.5 avantoe + snape grass; Super energy 52/117.5 avantoe + mort myre fungus; Hunter 53/120 avantoe + kebbit teeth dust; Super strength 55/125 kwuarm + limpwurt root; Weapon poison 60/137.5 kwuarm + dragon scale dust; Super restore 63/142.5 snapdragon + red spiders' eggs; Super defence 66/150 cadantine + white berries; Antifire 69/157.5 lantadyme + dragon scale dust; Ranging 72/162.5 dwarf weed + wine of zamorak; Magic 76/172.5 lantadyme + potato cactus; Stamina 77/102 (super energy + amylase crystal per dose); Zamorak brew 78/175 torstol + jangerberries; Saradomin brew 81/180 toadflax + crushed nest; Super combat 90/150 (three super potions + torstol).
- Cross-skill sources of secondaries documented on the pages read: crushed bird nests come from Woodcutting (1/256 nest chance, "valuable in their crushed form for use in making Saradomin Brews") — [OSRS Wiki: Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting); volcanic ash is mined at level 22 — [Mining](https://oldschool.runescape.wiki/w/Mining); wine of zamorak is made with 65 Cooking — [Cooking](https://oldschool.runescape.wiki/w/Cooking); amylase, ancient essence (20/dose), Zulrah's scales (5/dose), crystal dust and lava scale shards are "upgrade" secondaries with per-dose counts — [Herblore secondaries](https://oldschool.runescape.wiki/w/Herblore_secondaries); NPC services cost 50 coins to crush and 200 coins to clean/mix — [Herblore](https://oldschool.runescape.wiki/w/Herblore)

**Herblore (Melvor)**
- Each recipe has `potionIDs` for four tiers selected by mastery (`tierMasteryLevels = [1, 20, 50, 90]`); recipe costs are generic `itemCosts` (herb + secondary) — [Melvor source: herblore.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/herblore.js)
- "Each potion requires both an herb and a secondary ingredient. Herbs can be acquired primarily through planting their seeds in Farming, but can also be acquired through Combat and Thieving"; herb seeds from "pickpocketing the farmer (once you reach thieving level 30) to get herb sacks"; "Secondary ingredients are typically associated with the skill the potion is paired with (e.g. Secret Stardust Potion and Stardust)" **(snippet)** — [Melvor Wiki: Herblore](https://wiki.melvoridle.com/w/Herblore), [GameSkinny: Melvor Idle potion crafting](https://www.gameskinny.com/tips/melvor-idle-potion-crafting-from-farm-to-bottle/)

**Crafting / jewellery (OSRS)** — [OSRS Wiki: Crafting](https://oldschool.runescape.wiki/w/Crafting), [Gold bar](https://oldschool.runescape.wiki/w/Gold_bar), [Silver bar](https://oldschool.runescape.wiki/w/Silver_bar):
- "The primary use of gold bars is to create jewellery through the Crafting skill… use a gold bar on a furnace with the proper mould… cut gems" (same for silver). Gem cutting XP: opal 15, jade 20, red topaz 25, sapphire 50, emerald 67.5, ruby 85, diamond 107.5, dragonstone 137.5, onyx 167.5 (semiprecious gems can fail into crushed gem); silver jewellery: opal ring 10 XP (lvl 1), opal necklace 35 (16), opal bracelet 45 (22), opal amulet 55 (27), jade ring 32 (13) … topaz amulet 80 (45).
- Smithing feeds Crafting: gold necklace example — "Grum's Gold Exchange in Port Sarim buys a gold necklace for 315 coins if his stock is zero; the price decreases 9 coins for each gold necklace in stock, dropping to 45 coins at a stock of 30" — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing)

**Skill taxonomy (Jagex)**: Gathering (Farming, Fishing, Hunter, Mining, Woodcutting) "focuses on collecting resources generally to train Production skills"; Production (Cooking, Crafting, Fletching, Herblore, Runecraft, Smithing); "Some skills are 'interlaced'… logs obtained from Woodcutting can be lit for Firemaking, which can then be used to cook food" — [OSRS Wiki: Skills](https://oldschool.runescape.wiki/w/Skills)

### Inferences
- The single most effective "keep coal relevant" rule is the escalating coal-per-bar schedule (0/0/2/4/6/8 in OSRS; Melvor pushes to 12 for dragonite). It makes a level-30 node the bottleneck for level-85 gear and gives the shop something to sell (coal bag, Blast Furnace, catalysts) — a template for Fantasy Idle's smelting.
- OSRS's other durable low-tier sinks are *count-based*: 5 bars per platebody, 15+ arrow shafts per log, 1 log + coins per plank, one vial per potion. Melvor keeps recipes cheap but adds preservation/doubling so sinks scale with mastery instead.
- For Fantasy Idle (no farming), herblore secondaries could mirror Melvor's pattern of sourcing from the skill the potion buffs (mining potion needs ore, woodcutting potion needs logs, combat potions need monster drops), which creates cross-skill demand without a farming skill.

### Gaps
- Melvor's exact secondary-ingredient list per potion (data) could not be fetched.
- OSRS drop/shop sources for eye of newt, white berries, limpwurt roots, red spiders' eggs, unicorn horn, dragon scale dust and potato cactus were not read (item pages not fetched); only the ones listed above are sourced.
- Melvor Township as a resource sink is confirmed to exist as a parallel system (see Q7) but its resource-consumption tables are data, not code.

## Q4. Equipment tiers vs level requirements; stat scaling per tier; bars per item; silver/gold bar uses

### Takeaway
In OSRS the metal tiers sit at Smithing 1/15/30/50/70/85 (bronze→rune) with each item type offset from the tier base (dagger +0, scimitar +5, platebody +18 → 1/33/48/68/88/99), wear requirements at Attack/Defence 1/1/5/20/30/40 (rune) and 60 (dragon), and stats that rise super-linearly (scimitar slash +7/+10/+15/+21/+29/+45/+67, platebody stab defence +15/+21/+32/+46/+65/+82). Bars per item are fixed (1 dagger … 5 platebody) and XP = bars × per-tier XP (12.5→75). Melvor keeps 2 s smithing and data-defined recipes; its gear stats are data (not recovered).

### Cited Findings
- OSRS per-bar smithing XP: "a bronze platebody is 62.5 experience using 5 bars. 1 bar is 12.5 exp, so 5 × 12.5 = 62.5. This works for all bars and all smithing items" — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing). Per-tier XP per bar (from platebody pages: bronze 62.5, iron 125, steel 187.5, mithril 250, adamant 312.5, rune 375 for 5 bars) → 12.5 / 25 / 37.5 / 50 / 62.5 / 75 — [Bronze platebody](https://oldschool.runescape.wiki/w/Bronze_platebody), [Iron platebody](https://oldschool.runescape.wiki/w/Iron_platebody), [Steel platebody](https://oldschool.runescape.wiki/w/Steel_platebody), [Mithril platebody](https://oldschool.runescape.wiki/w/Mithril_platebody), [Adamant platebody](https://oldschool.runescape.wiki/w/Adamant_platebody), [Rune platebody](https://oldschool.runescape.wiki/w/Rune_platebody)
- Bars per item (from the High Alchemy table on the Smithing page): dagger 1, axe 1, mace 1, medium helm 1, sword 1, scimitar 2, longsword 2, full helm 2, square shield 2, warhammer 3, battleaxe 3, chainbody 3, kiteshield 3, two-handed sword 3, platelegs/plateskirt 3, platebody 5 — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing)
- Smithing level per item (sampled): bronze dagger 1, bronze scimitar 5 (2 bars, 25 XP), bronze platebody 18; steel dagger 30, steel scimitar 35; mithril dagger 50, mithril platebody 68; adamant dagger 70, adamant scimitar 75, adamant platebody 88; rune dagger 85, rune mace 87, rune med helm 88, rune scimitar 90, rune longsword 91, rune sq shield 93, rune platebody 99 — item pages: [Bronze scimitar](https://oldschool.runescape.wiki/w/Bronze_scimitar), [Steel dagger](https://oldschool.runescape.wiki/w/Steel_dagger), [Steel scimitar](https://oldschool.runescape.wiki/w/Steel_scimitar), [Mithril dagger](https://oldschool.runescape.wiki/w/Mithril_dagger), [Adamant dagger](https://oldschool.runescape.wiki/w/Adamant_dagger), [Adamant scimitar](https://oldschool.runescape.wiki/w/Adamant_scimitar), [Rune dagger](https://oldschool.runescape.wiki/w/Rune_dagger), [Rune mace](https://oldschool.runescape.wiki/w/Rune_mace), [Rune med helm](https://oldschool.runescape.wiki/w/Rune_med_helm), [Rune scimitar](https://oldschool.runescape.wiki/w/Rune_scimitar), [Rune longsword](https://oldschool.runescape.wiki/w/Rune_longsword), [Rune sq shield](https://oldschool.runescape.wiki/w/Rune_sq_shield) and the platebody pages above
- "Smithing is one of only two skills that unlocks something new at every level; Construction being the other" — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing)
- Wear requirements: "Rune armour requires 40 Defence to wield; weapons require 40 Attack" (rune platebody also needs Dragon Slayer I) — [OSRS Wiki: Rune equipment](https://oldschool.runescape.wiki/w/Rune_equipment); "All dragon weapons require level 60 Attack" and dragon items "cannot be made through the Smithing skill" — [Dragon equipment](https://oldschool.runescape.wiki/w/Dragon_equipment); pickaxes/axes need Attack 1/1/5/10/20/30/40/60/70 to wield — [Pickaxe](https://oldschool.runescape.wiki/w/Pickaxe), [Axe](https://oldschool.runescape.wiki/w/Axe)

Stat scaling per tier (OSRS item infoboxes):

| Tier | Scimitar slash acc / strength | Platebody stab / slash / crush defence | Item "value" (dagger / scimitar / platebody) |
|---|---|---|---|
| Bronze | +7 / +6 | +15 / +14 / +9 | 10 / 32 / 160 |
| Iron | +10 / +9 | +21 / +20 / +12 | 35 / 112 / 560 |
| Steel | +15 / +14 | +32 / +31 / +24 | 125 / 400 / 2,000 |
| Mithril | +21 / +20 | +46 / +44 / +38 | 325 / 1,040 / 5,200 |
| Adamant | +29 / +28 | +65 / +63 / +55 | 800 / 2,560 / 16,640 |
| Rune | +45 / +44 | +82 / +80 / +72 | 8,000 / 25,600 / 65,000 |
| Dragon | +67 / +66 | — | — |

Sources: [Bronze scimitar](https://oldschool.runescape.wiki/w/Bronze_scimitar), [Iron scimitar](https://oldschool.runescape.wiki/w/Iron_scimitar), [Steel scimitar](https://oldschool.runescape.wiki/w/Steel_scimitar), [Mithril scimitar](https://oldschool.runescape.wiki/w/Mithril_scimitar), [Adamant scimitar](https://oldschool.runescape.wiki/w/Adamant_scimitar), [Rune scimitar](https://oldschool.runescape.wiki/w/Rune_scimitar), [Dragon scimitar](https://oldschool.runescape.wiki/w/Dragon_scimitar), platebody pages and dagger pages ([Bronze dagger](https://oldschool.runescape.wiki/w/Bronze_dagger), [Iron dagger](https://oldschool.runescape.wiki/w/Iron_dagger), [Steel dagger](https://oldschool.runescape.wiki/w/Steel_dagger), [Mithril dagger](https://oldschool.runescape.wiki/w/Mithril_dagger), [Adamant dagger](https://oldschool.runescape.wiki/w/Adamant_dagger), [Rune dagger](https://oldschool.runescape.wiki/w/Rune_dagger)). All scimitars have attack speed 4.

- Silver/gold bars: silver bar 20 Smithing / 13.7 XP, gold bar 40 / 22.5 XP; "A Crafting metal. Used to create various silver items"; gold "more valuable than silver, used to create various gold items (but not coins)" — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing); enchanting is a Magic-side use (the jewellery tables list "amulet (u)" unstrung/unenchanted forms) — [Crafting](https://oldschool.runescape.wiki/w/Crafting)
- Melvor: smithing recipes are `SingleProductArtisanSkillRecipe` with `itemCosts` and `baseQuantity`; the bar category is `melvorD:Bars` and ores map to bars via `oreToBarMap`; silver bars have a chance to also yield gold bars (`increasedSeeingGoldChance`, doubled by Seeing Gold potions) — [Melvor source: smithing.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/smithing.js); Crafting recognises `melvorF:Necklaces` and `melvorF:Rings` categories (jewelry preservation, random-gem chance, +1 jewelry at pool 95%) — [crafting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/crafting.js)

### Inferences
- OSRS's level layout is "tier base + item offset": bronze base 1, iron 15, steel 30, mithril 50, adamant 70, rune 85; dagger +0, scimitar +5, mace +2, med helm +3, longsword +6, sq shield +8, platebody +18 (rune capped at 99). Adopting a base-plus-offset table gives Fantasy Idle a new unlock nearly every level with no per-item hand tuning.
- Stat growth is roughly ×1.4–1.5 per tier for weapons (7→10→15→21→29→45→67) with a deliberately large jump at rune and dragon; item value grows ~×3–5 per tier (dagger 10→35→125→325→800→8,000), i.e. faster than stats, so higher tiers are disproportionately expensive to buy but disproportionately lucrative to alch.
- Bars-per-item doubles as the cost lever: platebody (5 bars) at +18 levels is the XP-efficient spam item, daggers (1 bar) the cheap early unlock.

### Gaps
- Melvor's equipment stat tables per tier and its smithing level table (bars per item, dragon/ancient bar sources) are data and were not retrievable.
- OSRS levels for every rune item (full helm, kiteshield, 2h, platelegs, chainbody, battleaxe, warhammer, axe) were not captured by the text grep; they are on the item pages.

## Q5. Economy: gold sources and sinks, NPC sell prices vs crafting cost, Melvor shop pricing (pickaxes, bank slots, capes)

### Takeaway
OSRS injects gold mainly through High Level Alchemy (a fixed 60% of an item's "value", castable every 5 ticks ≈ 1,200/h) and monster drops, and removes it through shops, plank/NPC fees and a steeply escalating bank-space price (9 blocks of 50 slots: 1M, 2M, 5M, 10M… totalling 888M). Crafted-item value scales with tier so smithing-for-alch is a sanctioned money printer. Melvor prices items with a `sellsFor` field, gives GP from combat/thieving/firemaking bonuses, and uses a published bank-slot formula (`floor(2654570·50·L / 142015^(163/(120+L)))`, 5M cap) and shop cost types Fixed / Linear / Glove / BankSlot; pickaxe and cape prices are data and could not be retrieved.

### Cited Findings

**OSRS gold sources**
- High Level Alchemy: 55 Magic, 65 Magic XP per cast, converts an item "into a number of coins equivalent to 60% of the item's value (not the item's Grand Exchange price)… 50% higher yield than Low Level Alchemy"; recast every 5 ticks, "around 1,200 items per hour" — [OSRS Wiki: High Level Alchemy](https://oldschool.runescape.wiki/w/High_Level_Alchemy)
- "Smithing in conjunction with casting High Level Alchemy is responsible for bringing significant amount of coins into the game"; High alch values by tier (bronze/iron/steel/mithril/adamant/rune): dagger 6/21/75/195/480/4,800; scimitar 19/67/240/624/1,536/15,360; platebody 96/336/1,200/3,120/9,984/39,000; "Specialty stores are general stores that purchase items from the player for more coins than most general stores… the buy price at general stores decreases rapidly the more items it has in stock" — [OSRS Wiki: Smithing](https://oldschool.runescape.wiki/w/Smithing)
- Item "value" (alch base) for coal is 45 coins, runite ore 3,200 — [Coal](https://oldschool.runescape.wiki/w/Coal), [Runite ore](https://oldschool.runescape.wiki/w/Runite_ore)
- Early-game money: "Woodcutting is a useful skill for a low-levelled player to make money early in the game" — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting)
- "In the early days, Smithing was considered one of the best skills for making money. As such, Jagex deliberately kept anvils and furnaces far away from each other in an attempt to prevent people from levelling Smithing too quickly" — [Smithing](https://oldschool.runescape.wiki/w/Smithing)

**OSRS gold sinks**
- Tool shops: axes bronze 16, iron 56, steel 200, mithril 520, adamant 1,280, rune 40,960 coins (dragon not sold) — [Axe](https://oldschool.runescape.wiki/w/Axe); pickaxes bronze 1, iron 140, steel 500, mithril 1,300, adamant 3,200, rune 32,000 (black/dragon not sold) — [Pickaxe](https://oldschool.runescape.wiki/w/Pickaxe)
- Bank space: 400 slots F2P / 900 members, +20 each for PIN, authenticator and Jagex account; "Players may also increase their bank space by buying blocks of 50 bank spaces, up to 9 times"; block 1: 1,000,000; block 2: 2,000,000 (3M cumulative); block 3: 5,000,000 (8M); block 4: 10,000,000 (18M) … "The cost of unlocking additional bank spaces roughly doubles after each unlock… for a total cost of 888,000,000" — [OSRS Wiki: Bank](https://oldschool.runescape.wiki/w/Bank)
- Service fees: sawmill 100 coins per regular plank (+1 log), higher planks 250/500/1,500/2,500/5,000; Nardah NPCs 50 coins to crush, 200 to clean or mix; kingdom coal effectively "91.6 GP/coal"; Shilo furnace charges before the elite diary — [Sawmill operator](https://oldschool.runescape.wiki/w/Sawmill_operator), [Herblore](https://oldschool.runescape.wiki/w/Herblore), [Coal](https://oldschool.runescape.wiki/w/Coal), [Smithing](https://oldschool.runescape.wiki/w/Smithing)
- Skill capes (level 99 rewards that act as permanent upgrades): Woodcutting cape +10% bird-nest chance; Mining cape "5% chance of receiving an extra ore while mining ore up to adamantite"; Cooking cape "never burn food again"; Smithing cape = goldsmith gauntlets + 9 extra coal-bag capacity — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting), [Mining](https://oldschool.runescape.wiki/w/Mining), [Cooking gauntlets](https://oldschool.runescape.wiki/w/Cooking_gauntlets), [Smithing](https://oldschool.runescape.wiki/w/Smithing)

**Melvor economy (from source)**
- Every item has `sellsFor` (`this.sellsFor = data.sellsFor`) — [Melvor source: item.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/item.js)
- Shop cost types: `Linear` = `(scaling/2)·(n(n−1) − b(b−1)) + buyQty·initial` (arithmetic growth per unit owned), `Glove` = fixed × 0.9 with Merchant's Permit, `Fixed`, and `BankSlot` — [Melvor source: shop.js `getCurrencyCost`](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/shop.js)
- Bank slot price: `NewNewBankUpgradeCost.equate(level) = Math.floor((2654570 * (50 * level)) / Math.pow(142015, 163 / (120 + level)))`, evaluated at `level = slotsAlreadyBought + 2`, each slot capped at 5,000,000 GP — [shop.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/shop.js); better_idle restates it as `132728500 * (n + 2) / pow(142015, 163 / (122 + n))` clamped to 5,000,000, citing the wiki Bank page — [better_idle shop.dart](https://github.com/eseidel/better_idle/blob/main/logic/lib/src/data/shop.dart). **(computed)** slot #1 34 GP, #2 59, #3 89, #6 226, #11 691, #21 3,557, #31 12,673, #51 90,413, #76 557,642, #101 2,231,229, #121+ 5,000,000 (cap).
- Legacy bank-price classes in the same file reuse the XP curve as a price curve: `BankUpgradeCost.level_to_gp(level) = floor( Σ_{i<level} floor(i + 300·2^{i/7}) / 2 )` and `NewBankUpgradeCost` = the same sum / 3 — [shop.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/shop.js)
- GP from skilling: firemaking gives `baseSalePrice × increasedFiremakingLogGP/100` (+25% of sale price at pool 50%) then GP multipliers — [firemakingTicks.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/firemakingTicks.js); thieving NPC data carries `maxGP` per NPC (e.g. Man 100, Goblin 175, King 1,000 in a 2021 data dump) — [Gist: Melvor ThievingNPCs.JSON](https://gist.github.com/kaidejager/836e274031ec680081e5b1a7d35917c0)
- Sinks in code: Glove charges (`GloveChargesPurchased`), potions consumed per action, Township, and skill-interval tool chains; the ore/bar/potion doubling and preservation percentages above act as *anti*-sinks that mastery buys back.

### Inferences
- OSRS's "sell price = 60% of a fixed value, and value scales ~×3–5 per tier" is the rule that keeps crafting no worse than selling raw: a rune platebody alchs for 39,000 while its 5 runite ores alch for 5 × (3,200 × 0.6) = 9,600 (plus coal). Adopting "crafted value ≥ Σ(input values) × k with k > 1" per recipe would give Fantasy Idle the same property.
- Melvor's linear shop cost (`initial + scaling × n`) is used for repeatables; its bank-slot curve starts trivially cheap (34 GP) and reaches the 5M cap around slot 120, which mirrors the OSRS pattern of "cheap early, doubling later". Both games let the *price of storage* absorb late-game gold.
- The OSRS bank table (1M, 2M, 5M, 10M …, total 888M) and Melvor's cap-at-5M design both show the intent that the last few sinks are aspirational, not required.

### Gaps
- Melvor pickaxe/axe/rod prices and interval bonuses, cooking-fire upgrade prices, skillcape cost/effects and auto-eat prices are data (`melvorFull.json`) and could not be retrieved; the wiki `Template:PickaxeUpgradeTable` exists but was blocked.
- No source was found for Melvor's rule relating `sellsFor` to crafting cost (if any).

## Q6. Offline/idle pacing targets and developer pacing philosophy

### Takeaway
Melvor caps offline progress at 24 hours (`maxOfflineTicks = 20·60·60·24` ticks) and computes it by simulating game ticks; the creator describes the design as RuneScape's progression "stripped down… into an auto form" for players without time to play actively, with progression (not quests) as the sole focus. No official hours-to-max figure was found; player commentary calls the pace "glacial".

### Cited Findings
- Offline cap: `this.maxOfflineTicks = 20 * 60 * 60 * 24;` and `if (ticksToRun > this.maxOfflineTicks) ticksToRun = this.maxOfflineTicks;`; offline progress is computed by `this.runTicks(Math.floor(timeDiff / TICK_INTERVAL))` after loading — [Melvor source: game.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/game.js)
- Offline combat is optional (`enableOfflineCombat` setting) and disabled for locked Slayer areas; thieving is stopped offline if not unlocked — [game.js `processOffline`](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/game.js)
- Creator statements **(snippets of blocked interview pages)**: Brendan Malcolm "took the best elements of RuneScape that he personally enjoyed, stripped them down and put them into an auto form"; being in a full-time job "he didn't have the time to play an active game, so he designed auto games to give players a sense of progression and fun without necessarily having to pay attention to it"; the game "takes RuneScape's core gameplay mechanics and condenses them down into bite-sized moments"; "there are currently no Quests, and the sole focus is on that progression" — [MMORPG.com interview](https://www.mmorpg.com/interviews/interview-digging-deep-into-melvor-idle-with-its-creator-brendan-malcolm-2000123838), [TheGamer interview](https://www.thegamer.com/melvor-idle-interview-jagex/)
- Player framing **(snippet)**: "This is a glacial pace idle game, not meant to be played actively at all" — Steam community discussion (exact thread not identifiable from the search result; general forum: https://steamcommunity.com/app/1267910/discussions/)
- OSRS pacing accelerators: quest XP lumps total Woodcutting 128,387, Mining 240,600, Smithing 201,000, Cooking 57,620, Herblore 171,850 across all quests — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting), [Mining](https://oldschool.runescape.wiki/w/Mining), [Smithing](https://oldschool.runescape.wiki/w/Smithing), [Cooking](https://oldschool.runescape.wiki/w/Cooking), [Herblore](https://oldschool.runescape.wiki/w/Herblore)
- Generic idle-game pacing math (Pecorella, Kongregate) **(snippets; primary pages blocked)**: "costs grow exponentially while production grows at a linear or polynomial rate"; example cost `5 × 1.1^n` with the growth rate raised to the number owned; his GDC talks "The Mechanics and Monetization of Self-Playing Games" (2015) and "Idle Chatter" (2016); the three-part series ran Oct 2016–Feb 2017 — [The Math of Idle Games, Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i), [Part II](https://www.gamedeveloper.com/game-platforms/the-math-of-idle-games-part-ii), [Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii), [Wikipedia: Incremental game](https://en.wikipedia.org/wiki/Incremental_game). A secondary implementation credits him for `cost_next = cost_base × rate_growth^owned` and `production_total = ((production_base × owned) × multipliers) ÷ production_time` — [idle-game-generator README](https://github.com/Fireball19/idle-game-generator-visualization-tool)

### Inferences
- With 24 h offline caps, a 3 s action yields at most 28,800 actions per day; at the Melvor-like 10→180 XP per action that is 0.3–5.2M XP/day, i.e. 99 in 3–45 days of continuous idling per skill depending on tier and boosts. That is consistent with "glacial" but not punitive, and is the natural target band for Fantasy Idle if it copies the curve.
- Melvor's design deliberately has no time-limited content: everything runs on the same tick simulation online or offline, which keeps the balance identical in both modes and is why the 24 h cap is the only pacing knob needed.

### Gaps
- No published Melvor target for "all skills 99" or first-20-hour progression; the interviews are blocked and their snippets don't include numbers.
- Pecorella's growth-rate ranges (e.g. 1.07–1.15) and "wall" guidance could not be verified from the blocked primary articles; only the general exponential-cost principle is sourced.
- The value of `TICK_INTERVAL` was not found in the downloaded source files; the 24 h figure assumes 20 ticks per second, which the `20 * 60 * 60 * 24` expression implies.

## Q7. One-action-at-a-time: how Melvor enforces it and what runs in parallel

### Takeaway
Melvor has exactly one `game.activeAction`; `Skill.start()` calls `game.idleChecker(this)`, which stops whatever else is running (and refuses if it cannot be stopped). Combat and Golbin Raid are registered as active actions too, so combat and skilling are mutually exclusive. Township is the parallel exception: it accrues its own 300-second ticks from wall-clock time regardless of the active action. Idleon's multi-character model could not be sourced.

### Cited Findings
- `idleChecker(action) { if (this.isGolbinRaid) return true; if (this.activeAction === undefined) return false; if (this.activeAction !== action) { return !this.activeAction.stop(); } return false; }` and `stopActiveAction()` — [Melvor source: game.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/game.js)
- `start() { const canStart = !this.game.idleChecker(this); if (canStart) { this.isActive = true; … this.startActionTimer(); this.game.activeAction = this; saveData(); } return canStart; }`; `stop()` requires `canStop`, clears the timer and `this.game.clearActiveAction(false)` — [skill.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/skill.js)
- Combat and the raid are registered in the same registry as skills: `this.activeActions.registerObject(this.combat); this.activeActions.registerObject(this.golbinRaid);` and every skill instance is registered there too — [game.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/game.js)
- Golbin Raid pauses (not stops) the previous action: on load, if `golbinRaid.raidRunning`, `this.pausedAction = this.activeAction; this.activeAction = this.golbinRaid;` and it is restored afterwards — [game.js `onLoad`](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/game.js)
- Township runs on its own clock: `TICK_LENGTH = 300` (seconds), `oneDayInTicks = 86400 / TICK_LENGTH`, `traderTimePeriod = 3600 / TICK_LENGTH`, initial `availableGameTicksToSpend = 144`; `grantOfflineTicks()` adds `floor((now − lastTickAddedDate) / (1000 × TICK_LENGTH))` ticks whenever called — [township.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/township.js)
- Cooking has passive slots that keep cooking other recipes at 5× the active interval while the active recipe runs (`getRecipePassiveCookingInterval`) — [cooking.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/cooking.js); woodcutting can cut `1 + increasedTreeCutLimit` trees in one action — [woodcutting.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/woodcutting.js)
- Interview framing **(snippet)**: "You train one skill at a time and it keeps running while the game is closed, so progress is about choosing what to leave on rather than clicking faster… every action also raises a per action Mastery level" — [EarlyGuides Melvor overview](https://earlyguides.com/melvor-idle) (secondary)
- OSRS is inherently single-action: skills are "trained by repeating actions", and any action is interrupted by combat or level-ups (smithing stops when "the player levels up, or the player is attacked") — [Skills](https://oldschool.runescape.wiki/w/Skills), [Smithing](https://oldschool.runescape.wiki/w/Smithing)

### Inferences
- Pros of Melvor's rule: a single tick loop and a single offline simulation path; balance is expressed per action, not per parallel stream; the "what to leave on" choice is the core decision. Cons: gathering and processing never overlap, so total time-to-goal is the *sum* of all skills' grinds, and players feel forced to alternate. Melvor mitigates this with (a) passive cooking slots, (b) multi-tree cutting, (c) Township as an independent clock, (d) doubling/preservation from mastery rather than concurrency.
- For Fantasy Idle, keeping strict exclusivity but adding one "background" system on its own tick (a Township-like camp, or a passive smelter running at 5× interval) reproduces Melvor's structure with minimal complexity.

### Gaps
- Legends of Idleon's multi-character/one-AFK-task-per-character model is well known but no accessible source could be fetched (idleon.wiki blocked; the Idleon Efficiency README does not describe mechanics).
- Melvor's Atlas of Discovery (v1.2) and later versions may have added further parallel systems not present in the dumped source.

## Q8. Gathering mini-games and active-play bonuses in skilling games

### Takeaway
OSRS has many precedents for rewarding active play on top of an idle-able baseline: tick manipulation (1.5-tick woodcutting, 2-tick cooking ≈ +30–40%), tool special attacks (+3 level boost), invisible boosts in guilds (+7) and at shared trees (+1/player to +10), timed Forestry events (1–3.5 min), the Bloodwood tree's chop/drain cycle, and full minigames (Wintertodt, Tempoross, Giants' Foundry, Mastering Mixology, Blast Furnace). Melvor deliberately has none in gathering; its active-choice layer is buffs you set up (bonfires, potions) rather than timing games.

### Cited Findings
- Tick manipulation: farmed trees "cause the player to stall for one tick, which allows for 1.5-tick woodcutting" — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting); "tick manipulation can be used to bypass the pickaxe mining speed" — [Mining](https://oldschool.runescape.wiki/w/Mining); 2-tick cooking: an inventory in ~40 s vs 65 s, "around 30–40% faster than afk cooking" — [Cooking](https://oldschool.runescape.wiki/w/Cooking)
- Tool specials: dragon/crystal axe "Lumber Up" gives "a visible +3 boost to Woodcutting"; dragon pickaxe "Rock Knocker" +3 Mining; Lightbearer regenerates special energy twice as fast — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting), [Dragon equipment](https://oldschool.runescape.wiki/w/Dragon_equipment)
- Invisible boosts: Woodcutting Guild "+7 boost" (level 60 to enter); "+1 boost… for each player at the tree, up to a maximum of +10"; Mining Guild members' area "+7" and "ores in the members-only section respawn twice as fast" — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting), [Mining](https://oldschool.runescape.wiki/w/Mining)
- Forestry (2023): "a social Woodcutting activity in which players carry a Forestry kit for a chance to spawn special events upon felling trees"; events last 1 min 12 s to 3 min 30 s and train side skills (Farming, Fletching, Construction, Thieving, Hunter); felling axes give +10% XP for a 20% chance of no log; nature offerings 60–80% chance of an extra log — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting)
- Active-only nodes: the Bloodwood tree "requires players to actively pull back their axe and chop the tree and wound it, followed by a draining phase", while the Engorged variant "allows players to enter a mostly hands-off ~3 minute cycle" — [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting)
- Minigames: Giants' Foundry (smith commissions "at precise temperatures… rewarded with smithing experience, coins and Foundry Reputation"), Blast Furnace (half coal), Zalcano (mine/smith/runecraft boss) — [Smithing](https://oldschool.runescape.wiki/w/Smithing), [Mining](https://oldschool.runescape.wiki/w/Mining); Mastering Mixology "offers slower experience than traditional potion-making, but rewards more experience per herb" — [Herblore](https://oldschool.runescape.wiki/w/Herblore); Motherlode Mine (random ores + nuggets shop), Blast mine ("ores that have level requirements up to ten above their current level"), Shooting Stars every ~90 min — [Mining](https://oldschool.runescape.wiki/w/Mining)
- Temporary boosts as the RuneScape-wide pattern: potions raise a skill by e.g. "10% + 3" (attack), "15% + 5" (super); effects "degrade at roughly 1 level per minute" — [Herblore](https://oldschool.runescape.wiki/w/Herblore); ales boost skills (e.g. Dwarven stout +1 Mining/Smithing, Chef's delight +1–5 Cooking) — [Cooking](https://oldschool.runescape.wiki/w/Cooking)
- Melvor's set-and-forget buff layer: bonfires (light a bonfire with logs for `bonfireXPBonus` % extra Firemaking XP for `baseBonfireInterval`; auto-relit with the `freeBonfires` modifier) — [firemakingTicks.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/firemakingTicks.js); potions are consumed as charges per action through a `potionManager` and modify skill modifiers — [herblore.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/herblore.js), [game.js](https://github.com/ChanceToZoinks/melvor-source/blob/main/src/game.js)

### Inferences
- OSRS's active bonuses cluster around +20–50% throughput (2-tick cooking +30–40%; 1.5-tick woodcutting ≈ +60% roll frequency; +3 level boost is worth only a few % per the success formula), which is the same magnitude as Fantasy Idle's +20–49% for 15 s. The precedent is that active play should beat idle by tens of percent, not multiples, or the idle baseline stops feeling worthwhile.
- Melvor shows the alternative: never require attention, but let attentive players stack *pre-set* multipliers (bonfire, potion, mastery pool) so their idle rate is higher. A hybrid (short active mini-game grants a temporary buff that persists into offline time) would be novel relative to both.

### Gaps
- RuneScape 3 active mechanics (e.g. skilling "spotlight"/D&Ds) were not researched (RS3 wiki blocked; out of scope beyond noting they differ).
- No documented precedent was found for a timing mini-game that grants a temporary gathering-speed buff in an *idle* game specifically.
