# Gaps filled: prestige formulas, loot facts, Melvor, Tap Titans 2 and the literature

*Research report E, 7 October 2026. It fills the gaps listed at the end of
`docs/research_notes/incremental-math.md` (§9, A6) and `docs/research_notes/gear-sources.md` ("Gaps"),
and the open points of `docs/research_notes/first-session.md`. It also checks facts those notes had only
from search summaries. It does not repeat what they established.*

**Evidence labels.**
- *code/data*: the game's own source or data files.
- *page*: a live page, read in full.
- *archive*: a web.archive.org copy read in full, with its date. Fandom refuses direct reads, but its
  archived copies open.
- *(snippet)*: seen only in a search summary.
- **[Inference]**: my own reading or arithmetic.

No repository file was changed. Raw downloads are in `scratchpad/research2/E_src/`. The table at the end
gives each gap's answer, its confidence and what it changes.

## Summary

**Filled, from primary sources:**
- **What one prestige unit gives** in four games, each with its reward formula (§1.1):
  - AdVenture Capitalist: +2% per angel.
  - Cookie Clicker before 2.0: +2% per chip.
  - Egg, Inc.: +10% to +150% per soul egg, and ×1.05–1.10 per prophecy egg.
  - Realm Grinder: +2% to +5% per gem.
- **Three games' prestige systems** (§1.2):
  - Trimps' helium per zone: a near-linear base with exponential multipliers that come late.
  - Kittens Game's karma and paragon curves and prices.
  - Exponential Idle's formulas and its auto-prestige.
- **Facts the notes had from search summaries, now checked:** Idle Slayer, NGU Idle, Antimatter
  Dimensions' rate display and autobuyer gate, and Clicker Heroes' souls, relics and transcendence
  (§1.3, §2.5).
- **Tap Titans 2's equipment** (§1.6, §2.5): its data and formula, its drop schedule, and that it
  survives prestige.
- **IdleOn's weapon ladder** (§1.6). **Idle Slayer's Armory gear** survives Ascension (§2.5).
- **Melvor's upgrade chains**, and how Into the Abyss gates gear, from the game's data files (§2.6).
- **Loot rules** (§2.2–2.4, §2.7):
  - Genshin's 1.6%.
  - Diablo III's Torment table and pity timer.
  - World of Warcraft Legion's bad-luck rules, plus a curve datamined from a later expansion.
  - Path of Exile's quantity and rarity.
  - Last Epoch's crafting costs, and The War Within's crafted item levels.
- **The literature, walls and worksheets** (§1.4, §1.5, §1.7):
  - the Kongregate folder's contents and one of its sheets;
  - Khaliq & Purkiss's abstract;
  - a large player survey and a study of six designers, abstracts of other papers, and developers'
    statements;
  - studies of difficulty and churn from neighbouring genres.

**Corrections to the earlier notes.** None overturns a recommendation.
- Clicker Heroes' transcendence takes forge cores too, and its transcendent-power formula changed in
  2017.
- Melvor's smithed gear goes on above Dragon in both expansions.
- Diablo III never published its pity threshold.
- Egg, Inc.'s reward exponent and offline cap have changed since Pecorella wrote.
- Tap Titans 2's equipment drops start at stage 15. The "first prestige near 110" has no source.
- Idle Slayer's Armory chests drop at 0/2/4% depending on the bonus stage.
- NGU's factor at one hour is 1.02.

**Not filled:**
- any published figure for how long idle players tolerate a wall;
- Khaliq & Purkiss's full text;
- the Kongregate sheets other than 1c, including the prestige model in 3a;
- a designer article that states "raise the item level";
- formulas the developers kept private (Legion's protection; Path of Exile's diminishing returns);
- Tap Titans 2's boss timer, titans per stage and tutorial hand.

---

## Part 1. The mathematics note

### 1.1 Per-unit prestige bonuses: AdVenture Capitalist, Cookie Clicker, Egg, Inc., Realm Grinder

**Asked.** §2.1 had "not verified here" for these games' per-unit bonus, and A1 had three of them only
from search summaries.

| Game | Reward on reset | One unit gives | Held or spent | Source |
|---|---|---|---|---|
| AdVenture Capitalist | angels = √(lifetime earnings ÷ 4.44×10¹⁰) − √(earlier sessions' ÷ 4.44×10¹⁰), Pecorella's 150·√(c/10¹⁵); Mars divides by 10¹¹ | +2% profit, additive: 50 angels give ×2, 1,000 give ×21. Some upgrades raise the 2% | held; angels spent on upgrades lose their bonus | archive, [Angel Investors, 1 Dec 2025](https://web.archive.org/web/20251201223540/https://adventure-capitalist.fandom.com/wiki/Angel_Investors) |
| Cookie Clicker 1.x (v1.0466) | chips = ⌊(√(1 + 8C/10¹²) − 1)/2⌋, where C is the cookies of all past runs: the n-th chip costs n trillion more | +2% CpS per chip, times the share five upgrades unlock (5% up to 100%) | held; there was nothing to spend them on | code, [main.js](https://orteil.dashnet.org/cookieclicker/v10466/main.js) |
| Egg, Inc. | soul eggs = research × event × a sum of bands (10⁻⁶x)^p, where x is this run's earnings and p steps 0.15, 0.16 … 0.21 as x passes 10¹², 10²¹ … 10⁶⁰ | a soul egg: +10% earnings, +1 point per Soul Food level (140 levels, so up to +150%). A prophecy egg: ×(1.05 + 0.01 per Prophecy Bonus level, 5 levels), compounding. An egg of truth: ×1.01 | all held | archive, Jun 2025–Feb 2026: [Soul Egg](https://web.archive.org/web/20250608040907/https://egg-inc.fandom.com/wiki/Soul_Egg), [Earnings Bonus](https://web.archive.org/web/20251230144858/https://egg-inc.fandom.com/wiki/Earnings_Bonus), [Prophecy](https://web.archive.org/web/20260210182621/https://egg-inc.fandom.com/wiki/Earnings_Bonus/Eggs_of_Prophecy) |
| Realm Grinder | the n-th gem costs n trillion coins more, so gems ≈ √(max coins ÷ 5×10¹¹) | +2% production with Gem Power; three later upgrades (at 10⁶, 10³⁹ and 10⁶³ gems) add 1% each, up to +5% | held through abdication; reincarnation spends them all | archive, [Gems, Jul 2026](https://web.archive.org/web/20260705213906/https://realm-grinder.fandom.com/wiki/Gems) |

- **Egg, Inc. rations its compounding eggs.** 231 prophecy eggs exist: 163 from contracts, 40 from
  trophies, 24 from the calendar and 4 from seasons. Eggs of truth (490) come from a separate farm mode.
- **Egg, Inc.'s offline cap is one hour per silo.** A free permit allows 2 silos, earning offline at half
  rate; a paid permit allows 10 at full rate. Research raises each silo to 3 hours, so 30 hours at most
  ([Grain Silos, Mar 2026](https://web.archive.org/web/20260311134757/https://egg-inc.fandom.com/wiki/Grain_Silos)).
  Pecorella's "2 hours" was the free start.
- Cookie Clicker 1.x used Realm Grinder's curve. Version 2.0 moved to a cube root and added a separate
  counter that can be spent.

**[Inference]**
- **Doubling Egg, Inc.'s reward** now takes ×101 the earnings in the first band and ×27 in the last.
  Pecorella's exponent of 0.14 gave ×141. The exponent rises as the numbers grow, so late resets pay more
  per order of magnitude.
- **Even so, each reset adds a shrinking share of the stock, about 1/n of it.** The reward is a small
  power of a run's earnings, and earnings grow only in step with the eggs already held.
- **The rationed compounding egg is what keeps late resets meaningful.** Fantasy Idle built the same
  device as records, ×1.05 each.
  - Egg, Inc. rations its eggs by content; Fantasy Idle rations records by progress (one per 25 stages).
  - Records therefore add only ln 1.05/25 ≈ 0.002 per stage to the drift ρ.

### 1.2 Trimps, Kittens Game, Exponential Idle

**Trimps** (code at commit b9edb1d, Mar 2025: [main.js](https://github.com/Trimps/Trimps.github.io/blob/b9edb1dfee270ebf81bef8d934dc71276bf8d963/main.js) and `config.js`). Confidence high.
- **Helium per cell.** A cell's level becomes L = 1.35·round((level − 1900)/100). Helium is
  base·(1.23^√L + L). For a zone's last cell L = 1.35·(Z − 19).
  - Per unit of base: zone 100 gives about 118, zone 200 about 270, zone 500 about 845.
  - **That is close to linear in the zone; there is no 1.35^zone term.**
  - Base amounts: a Blimp gives 1 (from zone 21, after the first portal); an Improbability 5 (10 in
    Corruption); a void-map boss 10.
- **The exponential growth comes later, from outside the base:**
  - corrupted cells, ⌊(Z − start)/3⌋ + 2 of them from zone 181, up to 80;
  - Scientist V, 1.005^Z;
  - Spire rows;
  - 1.1^(Z − 175) in the second universe.
  - Looting adds 5% a level.
- **There is no Auto Portal in the game.**
  - The nearest feature is the Bone Portal: for 100 bones, it grants as much helium as your best run.
  - Players wrote their own in the AutoTrimps script. It portals when this run's helium per hour falls
    below the best by more than a buffer (4% recommended).
- **Helium per hour is on screen**, under the counter: this run's helium divided by this run's hours.
  The stats add the best rate this run and the zone where it came.

**Kittens Game** (code: [game.js](https://github.com/nuclear-unicorn/kittensgame/blob/781e379f79f1e7512d168849cba21ed111502644/game.js), `prestige.js`, `time.js`). Confidence high.
- **Karma** = (√(1 + 8·kk/5) − 1)/2, where kk is the karma kittens summed over resets. So the k-th point
  costs 5k. A first reset at 100 kittens gives 8.1 karma; at 150 kittens, 14.8. Each point is +1%
  happiness.
- **Paragon** (kittens − 70 per reset): +1% production each, linear up to 150. Past that a soft cap
  approaches +200%: 200 paragon give +175%, 300 give +187.5%, 1,000 give +197%. Storage: +10% per 100.
- **Spending paragon lowers the bonus**, because metaphysics upgrades are paid out of the pool. It is a
  sacrifice.
  - Prices run from 5 (Engineering, Diplomacy) to 750 (Renaissance); Golden Ratio is 50, Divine
    Proportion 100 and Vitruvian Feline 250.
  - Ten later upgrades cost 500 to 60,000 each, and each adds 0.05 to the paragon ratio.
- **The reset screen previews its payout as effects**: "+Y% happiness" and "+P% production".

**Exponential Idle** (archive: [Instructions, Jul 2025](https://web.archive.org/web/20250730013525/https://exponential-idle.fandom.com/wiki/Instructions)
and the Supremacy page; community [guides](https://github.com/exponential-idle-guides/exponential-idle-guides)).
This is not game code, but the formulas reproduce prices the guides quote. Confidence medium-high.
- **Prestige.** f grows as e^(b·x·dt), and b is held. A prestige gives db = (log₁₀ f)^0.8/(4×10⁶) and
  dμ = log₁₀ f. μ is spent on two upgrades.
- **Supremacy** resets b to 0.001 and pays dψ = 2^(log₁₀ log₁₀ f/25 − 1) − 0.5.
- **Graduation** pays dσ = (log₁₀ log₁₀ f − 1000)/200 students. Students are assigned to research, and
  can be reassigned freely.
- **Automation is bought with stars.**
  - Auto Prestige costs 500 stars. It fires when db/b passes a set ratio, after a set time, or on a
    typed expression.
  - Auto Supremacy costs 100,000 stars.
  - Players write expressions that maximise ((b + db)/b)^(1/time).

**[Inference]**
- Each outer layer is a log or a double log of the inner currency, as §2.6 said.
- These games add variants to A1.3's five uses of a prestige currency, which stand:
  - Kittens: a soft-capped held bonus beside a sacrifice.
  - Idle Slayer (§1.3): a dual counter.
  - Trimps: a polynomial base with late multipliers.
- Three games time or show a reset by a rate or a gain ratio: Trimps' He/hour, Exponential Idle's db/b
  and Antimatter Dimensions' IP/min (§1.3).

### 1.3 Other facts that rested on search summaries

**Antimatter Dimensions** (code at [5409e32](https://github.com/IvarK/AntimatterDimensionsSourceCode/tree/5409e320cecef96a917cca1dfb68f1f183e499ca)):
- Each normal challenge completed awards an autobuyer or upgrades one.
- Break Infinity opens when the Big Crunch autobuyer's interval is maxed (`BreakInfinityButton.vue`).
- **The crunch button shows the rate** (`BigCrunchButton.vue`):
  - While the peak rate is below 5×10¹¹ it shows "Current: … IP/min" and "Peak: … IP/min at … IP".
  - Above that it colours the IP on offer from red to green, by log(IP gained)/log(IP held) between 0.9
    and 1.1.

**Clicker Heroes** (archive, Dec 2025–Mar 2026). Confirmed:
- +10% DPS per hero soul, and one soul per 2,000 hero levels.
- Primal bosses appear 25% of the time (100% with Atman), and always at zones 110, 120 and 130 and every
  100th zone up to 1,000. Each gives ((zone − 80)/25)^1.3 souls.
- Ancient souls = ⌊5·log₁₀(souls sacrificed)⌋.
- Spending souls on ancients is a sacrifice. Morgulis exists to bank them, at 11% per soul.

**Correction:** transcendent power is now TP = 25 − 23·e^(−0.0003·AS) %. Patch 1.0e10 (Nov 2017)
capped it at 25% ([Transcendence](https://web.archive.org/web/20251209215015/https://clickerheroes.fandom.com/wiki/Transcendence),
[Patch History](https://web.archive.org/web/20260101184048/https://clickerheroes.fandom.com/wiki/Patch_History)).
The 50 − 49·e^(−AS/10000) in §2.6 is the 2016 formula.

**Idle Slayer** (archive, [Ascension, Jan 2026](https://web.archive.org/web/2026/https://idleslayer.fandom.com/wiki/Ascension), FAQ, Strategy):
- A slayer point costs 12 + 4 × (lifetime points) souls, so points ≈ √(souls/2).
- Each point ever earned gives +1% coins per second; two upgrades raise the total ×4.5. Because the bonus
  counts points earned, spending them costs nothing: a dual counter.
- The FAQ's rule is confirmed: ascend when the new points would add 10–20%. The Strategy page instead
  says 1:1 early, about 20% mid-game and about 10% late.

**NGU Idle** (archive, Rebirths, Sep 2025). The rebirth factor is:
- minutes/971,520 at 3 minutes (0.00031%);
- minutes/240 at 15 minutes (6.25%);
- 1 + days/2 from an hour on: **1.02 at one hour** (not 100%), 1.5 at a day.

**Clicker Heroes 2's Automator** ([Pixelpoppers, 2019](https://pixelpoppers.com/2019/07/clicker-heroes-2-is-a-very-interesting-project/)):
- Rules pair a condition with an action ("activate Clickstorm if Energy is at least 90% full"). With
  enough of them, the game "mostly plays itself".
- Gilding wipes the skills in exchange for a damage multiplier. The reviewer found it a chore, the
  multiplier being "the least interesting possible reward".

**Kolibri's case study** ([page](https://start.playtestcloud.com/case-studies/kolibri-games)) is confirmed
as A2.4 summarised it. It gives no figure for the gain.

**[Inference]** Idle Slayer teaches resets at +10–20%, far below Pecorella's +50–200%. A game's threshold
follows how cheap its reset is.

### 1.4 The literature

- **Khaliq & Purkiss (IEEE GEM 2015)**, "A study of interaction in idle games & perceptions on the
  definition of a game" ([DOI](https://doi.org/10.1109/GEM.2015.7377233)). IEEE and DBLP list Imran
  Khaliq first.
  - Only the abstract is available. It defines idle games as left running "by itself with minimum or
    zero player interaction", and compares academic definitions of a game with a player survey.
  - No open copy exists, so the sample and results are unknown.
- **Cutting, Gundry & Cairns (2019)**, *International Journal of Human-Computer Studies*
  ([open copy](https://eprints.whiterose.ac.uk/id/eprint/135461/), read). A survey of Neko Atsume
  players, N = 1,972, recruited from a Reddit community, so mostly keen players.
  - 67.5% check the game "many times a day" and 29.0% "a couple of times"; 25.3% had paid.
  - How often players check is unrelated to how long they have played (r = −0.062).
  - The authors read idle play as a habit.
- **Spiel et al. (2019), "'It Started as a Joke'"**, CHI PLAY ([NSF copy](https://par.nsf.gov/servlets/purl/10174274), read).
  Interviews with six designers: Kittens Game, Tap Titans, Progress Quest, Spaceplan, Universal
  Paperclips and Cow Clicker.
  - Lucas Mills of Tap Titans: after a prestige the early stages pass easily, and then when you hit a
    wall you start planning what to upgrade for the next run.
  - One guideline: "design for plateaus that encourage players to disengage from the game
    temporarily".
- **Read as abstracts only:**
  - Hwang & Melcer (CoG 2024): a diary study found no significant difference in engagement between idle
    and casual games.
  - Villareale et al. (FDG 2019): idle games share a loop of "active participation, inactive progress,
    and return reward".
  - Demaine et al. (2019): optimal play in Cookie Clicker is computationally hard.
  - Keogh & Richardson, Fizek (2018; *Playing at a Distance*, 2022), Deterding (2016) and Buergi (2024)
    are conceptual.
- **No academic telemetry or retention study of idle games was found.**

**Developers.** None of the five teams asked about has published a postmortem. What exists:
- **Trimps' patch notes** ([updates.html](https://github.com/Trimps/Trimps.github.io/blob/b9edb1dfee270ebf81bef8d934dc71276bf8d963/updates.html)):
  - 1.0 put more upgrades in each map, so players need not "grind the same level map 4 times".
  - 5.0.0 (2019) set a deliberate "hard wall at Z701", which progress in the second universe pushes
    back.
  - 5.1.0 added Time Warp: up to 24 hours offline, made up tick for tick.
- **Exponential Idle's patch notes:** 1.3.74 added 20 extra upgrade levels "to help waiting for the
  major update". The offline limit went from 24 hours to 7 days, and was later removed.
- **Pecorella's GDC 2016 talk** [*Idle Chatter*](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260):
  - "Don't have the optimal strategy require clicking constantly".
  - Realm Grinder's reincarnation 16 is "arduous"; "some wait it out", and reaching it brings "an
    entirely new mechanic".
- **Pecorella's [*The Rise and Rise of Idle Games*](https://www.slideshare.net/slideshow/the-rise-and-rise-of-idle-games-68916528/68916528):**
  - "Time is a release valve".
  - Offline limits increase the "pain points of slow growth periods".
  - "Moving backwards is very punishing".
  - Loot-based idle games are "focused on picking best gear".
- **Others:**
  - Orteil ([Polygon, 2013](https://www.polygon.com/2013/9/30/4786780/)): time already sunk keeps players
    playing until a moment of "sudden clarity".
  - Playsaurus ([2017](https://web.archive.org/web/20181231094124/http://www.clickerheroes2.com/paytowin.php)):
    selling power for money limits rebalancing to what "people who just spent money would approve of".
  - Fluffy Fairy: "Some games try to twist the vice until people prestige".

### 1.5 How long players tolerate a wall

**Still no figure for idle games.** Neighbouring genres give correlations (read in full unless marked):
- **EA's match-3 games** (Xue et al. 2017). From level 21, spikes in difficulty match steep drops in the
  number of players. Tuning difficulty to each player raised engagement "up to 9%"
  ([abstract](https://doi.org/10.1145/3041021.3054170)).
- **Rovio's Angry Birds Dream Blast** (Roohi et al., CHI PLAY 2020; 95,266 players, 168 levels).
  - A level's pass rate barely predicts churn (Spearman −0.144).
  - Quitting *in the middle of* a level correlates strongly with its difficulty (−0.586).
- **Ubisoft's The Division and Rayman Legends** (Allart et al., FDG 2017, [HAL](https://hal.science/hal-02436676)).
  Harder play went with *more* retention.
  - In The Division, a player failing 30% of the time had 21% better odds of continuing than one failing
    10%, in the first hours. After 8 hours the gap was 27%.
  - Sharp early rises in difficulty hurt retention in Rayman, where failure comes from skill.
  - They did not hurt in The Division, where the authors attribute failure to the avatar's strength.

**[Inference]**
- **Players accept a wall they can fix by making the hero stronger, if they can see how** (The Division;
  Lucas Mills).
- **Early spikes cost the most** (Rayman, EA).
- **Players leave in the middle of a hard stretch** (Rovio), so a stall needs a visible way out while it
  lasts.
- This supports §7's rule on time per stage band. A3.1's budget stays a working assumption, with no
  source for or against it.

### 1.6 Tap Titans 2's equipment, and IdleOn

**Tap Titans 2** (data: [C_EquipmentInfo.csv](https://github.com/rawrzcookie/TT2_CSV/blob/bffb1948a58c046702fa46aeb193eecec617beb6/csv/C_EquipmentInfo.csv), 1,133 items, Oct 2026)
- **Each item has five numbers:** an amount A, an increment I, exponents 0.9 and 0.58, and a base B of
  1.14–1.16. For All Damage weapons:

  | Rarity | A | I |
  |---|---|---|
  | Common | 1 | 0.056 |
  | Rare | 2 | 0.17 |
  | Legendary | 5 | 1.39 |
  | Mythic | 20 | 5.56 |
  | Unique | 25 | 6.94 |

- **The main bonus = A + I·(L^0.9 + B^(L^0.58)).** L is the internal level (the game shows L/10).
  - This is how the open-source TT2 Master app computes it ([Equipment.cs, line 254](https://github.com/nebula2/tt2-master/blob/3837595d662f542b5d8b5b81320eed21fb1a9d9b/src/TT2Master.Shared/Models/Equipment.cs)).
  - No official table confirms it (medium confidence). The same app's formula for secondary stats does
    match the game's own scaling table to four figures.
- **Level.** An item's level is set by the player's max stage when it is picked up (two community
  guides). No exact formula was found.
- **History.** The 2017 bonus was linear in level. Version 3.0 (2019) made gear "scale stronger with
  increasing stage"; 6.2.0 (2023) added Uniques.
- **Drops.** The first equipment boss is at stage 15, then one every 20 stages ("every 15 stages" was
  wrong). Per run, up to 5 bosses between 80% and 99% of the max stage drop gear, with a cap of 20 a day.
  Confirmed.
- **[Inference] The 2017 variables.** `equipmentStageMin` 56 and `equipmentStageDelta` 20 match the
  older schedule, gear every 20 stages after stage 55 (Fandom). So they set where equipment drops, not
  its level, and A4's guessed level formula should go.
- **[Inference] The curve limits itself.** Beyond L ≈ 1,000 the bonus behaves like exp(ln B·L^0.58).
  - Its growth per level, ln B·0.58·L^(−0.42), shrinks as L rises. A common item gives ×104 at
    L = 1,000 and ×4×10¹⁰ at L = 10,000.
  - Titans grow by a fixed factor each stage, while the item level rises with the max stage. Gear's
    share of the growth per stage therefore falls with depth, and gear cannot overtake the titans.

**IdleOn** ([idleon.wiki](https://idleon.wiki/wiki/Weapons), built from game data)
- **Weapon power grows by addition, gently.** It is 10 at level 4 and 140–152 at level 650, about ×14
  over the whole game, with 1–7 upgrade slots.
- **Each anvil tier consumes the one before.** A Magma Maul needs one of every earlier spear, plus 3,000
  bars.
- **Upgrade stones** succeed from 100% (+1 power) down to 20–30% (+4 to +10). A failed stone normally
  leaves the slot open.
- **Gear never resets.**

### 1.7 Kongregate's worksheets

- **The folder** (archive copies, 2017–2024) holds:
  - a README;
  - 1a, Simple Exponential Growth;
  - 1b, Multibuy Calculation Formula;
  - 1c, Optimal Choice;
  - 1d and 1e, Optimal Choice with global or with individual multipliers;
  - 2a, Simple Derivative Growth Model;
  - 3a, Prestige Patterns;
  - 3b, "[COMING SOON] Meta Prestige Patterns", which was never made;
  - an Excel folder.

  Every file now refuses anonymous access (HTTP 401).
- **Sheet 1c** ([archive, Nov 2020](https://web.archive.org/web/20201112040033/https://docs.google.com/spreadsheets/d/1gmkaI86Bu2df9AKCxPX4lPnpkwReOiGwTWWyirkIKC4/edit))
  models "perfectly optimal gameplay of an idle game with 5 generators". It buys the best item by income
  against cost, waits until it can afford it, and repeats. Its defaults are "the real values from
  AdVenture Capitalist":

  | Generator | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | Income | 1.67 | 20 | 90 | 360 | 2,160 |
  | Cost | 4 | 60 | 720 | 8,640 | 103,680 |
  | Cost growth | 1.07 | 1.15 | 1.14 | 1.13 | 1.12 |

  From generator 2 on, each cost is 12× the one before.
- **Not recovered:** the other sheets. The prestige formula in 3a remains unknown.

---

## Part 2. The gear note

### 2.1 "Raise the item level": not found as a stated principle

- **No article says it outright.** The closest passages:
  - Daniel Cook ([2014](https://www.gamedeveloper.com/design/loot-drop-best-practices)) suggests "a -50%
    weight for all items marked lower than their level".
  - In World of Warcraft Legion, each legendary lowered the chance of the next. Blizzard reversed this so
    that good fortune would not mean "harder times in the future" ([Wowhead 260408](https://www.wowhead.com/news=260408)).
  - Path of Exile's 3.25 notes: harder content should give "more and better loot".
- **Destiny's power-relative drops were not checked.** They are the likeliest place for an explicit
  statement.
- **The gear note's argument therefore stays its own inference.** Its examples are now confirmed:
  Clicker Heroes' relic level = zone/25 (§2.5), and Tap Titans 2's level set by max stage (§1.6).

### 2.2 Bad-luck protection

**World of Warcraft Legion: the rules are public, the formula is not.**
- Ion Hazzikostas (Nov 2016, [Wowhead 257898](https://www.wowhead.com/news=257898)):
  - the chance "improves … a bit each time" an eligible attempt fails;
  - the protection was first capped at 4 legendaries, then made to apply "indefinitely";
  - it "looks at what you've gotten, not what you have".
- A Blizzard post (Feb 2017, [Wowhead 260408](https://www.wowhead.com/news=260408)): from patch 7.1.5 the
  first legendary has the highest chance, the second a "significant bonus".
- Wowhead's guide (2017–18): from 7.2, each specialisation has its own protection.

**A datamined curve from a later expansion.** Fyr'alath (Dragonflight 10.2), as Wowhead read unlabeled
data ([news 337807](https://www.wowhead.com/news=337807)):
- Heroic: 1.5%, plus 0.75 points a kill; 15% at the eighth kill, then plus 3 points a kill; certain on
  the 15th kill.
- Mythic: 5%, plus 1.6 points a kill; certain on the 7th kill.

**Genshin Impact: confirmed.** A copy of the in-game Details text ([traveler.gg](https://traveler.gg/adrift-in-the-harbor/))
gives a 0.600% base and a "consolidated probability (incl. guarantee) = 1.600%", with a 5★ at least once
in 90 pulls. KeqingMains' model gives 62.3 pulls on average, which is 1.605%.

**Diablo III: corrected.** Travis Day of Blizzard ([Jan 2014](https://web.archive.org/web/20140127050055/http://us.battle.net/d3/en/forum/topic/11307900907?page=15)):
- the system "tracks the amount of time you spend fighting creatures without finding a legendary";
- after "a certain period of time" it will "slowly start increasing the legendary drop rate";
- beta data showed "roughly 2 hours per" legendary, and the target was "roughly in the 90 minute range
  for advanced players".

No threshold was ever published. The gear note's "a legendary within about two hours" mixes up the
average rate with the timer.

**[Inference] Fantasy Idle's pity count of 8** sits between Fyr'alath's 7 and 15. It also follows
Blizzard's two lessons: count attempts, and never let past luck lower the next chance.

### 2.3 Path of Exile

- **The mechanics are official.**
  - Quantity raises the chance to drop. A 20% chance becomes 30% at +50% quantity; a certain drop gains
    a second item (Rory, [2011](https://www.pathofexile.com/forum/view-thread/5837)).
  - Rarity rolls for unique first, then rare, then magic. "+IIR is applied to every roll (with
    diminishing returns)". The formula "is a seeeeecret" (Rhys, [2013](https://www.pathofexile.com/forum/view-thread/531619/page/4)).
- **The community's model** (poewiki):
  - Player, area, party and monster bonuses multiply.
  - Only the player's own bonus is diminished: +50% acts like ×1.35, and +200% like ×1.77.
  - Patch 3.25 removed quantity from character items. Patch 3.26 replaced the party's rarity bonus with
    more uniques.
- **[Inference]** Grinding Gear Games damped and hid the player's drop stat, then took quantity off
  gear. This supports the gear note's advice to damp Fantasy Idle's drop multiplier.

### 2.4 Diablo III's Torment table

- **The official table** ([guide, Sep 2019](https://web.archive.org/web/20190919060841/http://us.battle.net/d3/en/game/guide/gameplay/game-difficulty)):

  | Torment | Monster health | Monster damage | Extra gold | Extra XP |
  |---|---|---|---|---|
  | I | 819% | 396% | +300% | +300% |
  | VI | 8,590% | 2,540% | +1,600% | +1,600% |
  | X | 200,082% | 10,194% | +2,900% | +4,000% |
  | XVI | 13,888,770% | 64,725% | +7,000% | +17,000% |

- **No legendary column.**
  - For Torment I–VI, Blizzard said 15% per level, compounding ([forum, Apr 2014](https://web.archive.org/web/20140413015702/http://us.battle.net/d3/en/forum/topic/12471197317)).
    That gives 15–131%, matching the wiki.
  - The wiki's values for VII–XVI (164–1,221%) have no official source.
- **[Inference]** From Torment VII to XIII, each level multiplies monster health ×2.19 (Fantasy Idle's
  Abyss: ×2.26 a depth) and the XP multiplier ×1.27. In log terms the reward grows at 30% of the
  obstacle's rate: the same seesaw as an idle game.

### 2.5 Does gear survive the reset?

**Tap Titans 2: yes** (medium-high confidence; no single line says so).
- The r/TapTitans2 FAQ lists what prestige takes: hero levels, gold and stage. Equipment is not on it.
- A guide advises picking dropped gear up after prestiging.
- Sets stay once owned.
- Transcendence, from stage 180,000, is a separate seasonal layer.

**Idle Slayer: yes.**
- Even Ultra Ascension leaves Armory items, materials and divinities.
- **But kept gear has to be earned back each run to be worn.** An Armory item needs a gear level (200,
  +50 per item level). That level comes from coin-bought gear, which resets.
- **The three snippet claims** (archive, Armory, Jan 2026):
  - The first chest holds a sword: confirmed.
  - The chest odds are 0, 2 and 4% for bonus stages 1, 2 and 3, or 10, 12 and 14% with the badge.
  - Only the later Hardened badge is used up when an item drops.

**Clicker Heroes** ([Relics](https://web.archive.org/web/20251228141023/https://clickerheroes.fandom.com/wiki/Relics)):
- Relic level = zone/25: confirmed.
- Relics appear from zone 99 to about two-thirds of the best zone, once per ascension.
- Four are kept through ascension.
- Salvage pays 10 forge cores per relic level, times 0.5–2.6 by rarity.

**Correction:** transcendence takes relics *and* forge cores. This is in the 1.0 patch notes and on the
Ancient Souls page. The gear note's "forge cores remain" came from a 2025 guide site, not from
Playsaurus.

### 2.6 Melvor: upgrade chains and Into the Abyss

**Sources:** the game's data files ([melvorDemo](https://melvoridle.com/assets/data/melvorDemo.json),
[Full](https://melvoridle.com/assets/data/melvorFull.json), [TotH](https://melvoridle.com/assets/data/melvorTotH.json),
[Expansion2](https://melvoridle.com/assets/data/melvorExpansion2.json), [ItA](https://melvoridle.com/assets/data/melvorItA.json);
3,748 items and 685 upgrades) and the [wiki](https://wiki.melvoridle.com/w/Upgrading_Items).

**The upgrade chains:**

| Chain | Example |
|---|---|
| (S) → (G) trims | Rune Platebody: 400 silver bars + 100k GP gives 91 defence (from 82) and +6 strength. Then 750 gold bars + 200k gives 98 defence, +7 strength and 5% damage reduction |
| (B) → (C) trims (Atlas of Discovery) | Imbued bars and barrier gems. No stat change; only effects against that expansion's enemies |
| (U) | Ranged hides plus more hide: a Green D-hide Body + 50 hides + 10k gives +2% damage reduction. Every Abyssal metal piece plus other skills' materials: Netherite Platebody + 30,000 bars + 30,000 tendrils |
| Slayer, Basic → Mythical | One upgrade kit per step (50k to 10M slayer coins); worn at Slayer 30, 60, 80, 100 and 110 |
| Wands, Basic → Powerful → Elite | 100 duplicates + 25k, then 100 + 1M: a sink for duplicates |

**Into the Abyss (June 2024) gates gear four ways** ([wiki](https://wiki.melvoridle.com/w/Into_the_Abyss_Expansion)):
1. It opens only after the base game's final boss.
2. Every skill gets 60 **Abyssal Levels**.
3. Abyssal monsters deal **abyssal damage**, which only abyssal resistance reduces, and old gear has
   none. The Abyss's depths admit only weapons that deal abyssal damage.
4. Each gear tier needs a **depth completed**. There are eight depths in a chain.

| Platebody | Made at, or found in | Worn at | Melee defence | Strength | Abyssal resistance |
|---|---|---|---|---|---|
| Abyssium | Abyssal Smithing 12 | Abyssal Defence 1 | 162 | 78 (87 as U) | 2 |
| Brumite | 24 | 10, after depth 1 | 186 | 109 | 5 |
| Gloomite | 36 | 20, after depth 2 | 214 | 163 | 8 |
| Witherite | 48 | 30, after depth 3 | 246 | 241 | 11 |
| Netherite | 60 | 40, after depth 4 | 283 | 380 (421 as U) | 14 |
| Tortoise Shell | a monster's drop | 40 | 283 | 464 | 16 |
| Eldritch Reaper | the depth 6 chest | 50 | 311 | 590 | 18 |
| Voidium Entity | the depth 7 chest | 55 | 336 | 638 | 21 |

- Each smithed tier is ×1.4–1.6 the last in strength and ×1.15 in defence. The (U) step adds about 11%
  strength.
- **Correction: "everything above Dragon" was drop-only only in the 2021 base game.**
  - Throne of the Herald (October 2022) added smithed gear from Corundum to Divine, at Smithing 107–120.
    The Divine Platebody has 295 defence, against Dragon's 109.
  - Into the Abyss added the five metals above.
  - The very top still drops, so the pattern holds.
- **Melvor's FAQ is milder than quoted.** It says armour can be found as loot, so Smithing "is not
  technically required". It does not call the skill pointless.

**[Inference]** Into the Abyss is the closest precedent for Fantasy Idle's deep Abyss and anvil. It has:
- a chain of depths;
- gear tiers that each need the previous depth;
- a smithed ladder with an upgrade step that eats materials;
- drop-only pieces, from a monster and the deepest chests, worn at or above the top smithed tier and up
  to two-thirds stronger.

Melvor needs a second level track and a new damage type to stop old gear carrying over. In Fantasy Idle,
the exponential monsters do that on their own.

### 2.7 Last Epoch and World of Warcraft

**Last Epoch** ([0.8.4 dev blog, 2021](https://forum.lastepoch.com/t/crafting-changes-coming-to-eternal-legends-update-0-8-4/45597)):
- "Each craft uses a random amount of Forging Potential, normally around 1 to 15."
- Exalted items drop with "particularly high" Forging Potential. The blog's examples: 15 on a normal
  item, 20 on a magic one, 27 on a rare, 34 and 41 on exalted ones.
- Later patches raised the minimums. Gambled items have about 20% more, and 1.1's Nemesis adds up to +6.
- The drop ranges ("0–23", "up to 28") are still unverified.

**The War Within** (warcraft.wiki.gg):

| Season | Best crafted item level | Top of the Myth track |
|---|---|---|
| 1 | 636 (crest text: "Crafting Quality (623-636)") | 639 |
| 2 | 675 | 678 |
| 3 | 720 | 723 |

Crafting sits one upgrade step below the top drops every season. The snippet is confirmed.

---

## Part 3. The first-session note

- **The boss timer is still unconfirmed.**
  - The data confirm the Ward of the Darkness artifact (`BossTimerDuration`, up to +60 s).
  - Giant Bomb says 90 s.
  - 30 s plus 60 s would reconcile the two, but that is a guess.
- **Titans per stage.**
  - The 2017 variables give a base of 10, an increment of 4 (unit unknown) and a maximum of 30.
  - A guide says two more titans per stage every 500 stages.
  - No source gives real times to stages 10, 50 and 100.
- **Tap Titans 2 tests an easier opening.** [TitanScalingInfo_B.csv](https://github.com/rawrzcookie/TT2_CSV/blob/bffb1948a58c046702fa46aeb193eecec617beb6/csv/TitanScalingInfo_B.csv)
  multiplies titan health by 0.3, 0.4 and 0.475 on stages 1–3, where the default table uses 1.0. Fantasy
  Idle's first stages are eased in the same way.
- **The pointing hand is still unconfirmed.** The tutorial table has no field for a graphic.
- **Juice**, from the patch notes:
  - separate music and sound toggles;
  - a high-quality animation setting;
  - reward animations that can be skipped;
  - damage numbers coloured by their source;
  - taps capped at 20 a second.

  No screen-shake setting was found.
- **The first prestige.**
  - The tutorial ends by asking for a prestige at stage 60.
  - A guide puts that at about 1.5 hours of active play.
  - BlueStacks advises a prestige every 100 stages past the last one.
  - **"Near 110" has no source.**

---

## What this changes

**Nothing built needs undoing, and each of the owner's choices gains precedents.**
- **Records** (×1.05 to the token effect): Egg, Inc.'s prophecy eggs are the same device, at ×1.05–1.10
  each and rationed to 231. Tied to progress, Fantasy Idle's records add only about 0.002 a stage to the
  drift.
- **Auto after 20 prestiges:** automation is earned in Antimatter Dimensions and bought in Exponential
  Idle (500 stars). Trimps never shipped one, so its players wrote their own around helium per hour.
- **Weapons and armour from drops, with Smithing's anvil:** Melvor's two expansions, The War Within and
  Last Epoch all stop crafting one step below the top drops. Into the Abyss is the closest model.
- **The pity count of 8** falls within the published guarantees, which range from 7 to 15 kills (90 pulls
  for a gacha).
- **Gear kept through prestige** matches Tap Titans 2, Idle Slayer, NGU and Clicker Heroes, which keeps
  four relics.

**Gap by gap**

| Gap (note, section) | Found | Confidence | Changes the earlier note? |
|---|---|---|---|
| Per-unit bonuses, AdVenture Capitalist / Cookie Clicker / Egg, Inc. / Realm Grinder (math §2.1, A1) | +2%; +2% (1.x); +10–150%, ×1.05–1.10 per prophecy egg; +2–5% | high | Fill the column. Egg's exponent is now 0.15–0.21, not 0.14 |
| Trimps' helium and Auto Portal (A6) | near-linear base, late exponential multipliers; Auto Portal only in a fan script | high | A3.2's "not verified" is settled |
| Kittens' karma and metaphysics (A6) | triangular root of kittens/5; prices 5–60,000; spending lowers the bonus | high | A1.1: paragon is a sacrifice, not just held |
| Exponential Idle formulas (A6) | μ, ψ, σ formulas; auto-prestige on db/b | medium-high | Supports §2.6 |
| Idle Slayer, NGU, AD, Clicker Heroes (math §2.1–2.6) | confirmed; NGU 1.02 at an hour; Clicker Heroes' transcendent power formula changed | high | Small corrections only |
| Egg, Inc.'s offline cap (math §4.3) | 1–3 h per silo, up to 30 h | high | Correct the table row |
| Academic literature (math §6) | Khaliq & Purkiss abstract; Cutting 2019; Spiel 2019; abstracts | high for what was read | Adds evidence; no change |
| Wall tolerance (math §4.4, A3.1) | no idle figure; correlations from other genres | n/a | No change; supports the band rule |
| Tap Titans 2 equipment formula (A4) | data plus the community formula; 2017 variables are a drop schedule | medium | Drop A4's guessed level formula |
| IdleOn (§9) | additive weapon ladder, tiers consume tiers | high | none |
| Kongregate sheets (A5) | folder list; sheet 1c only | high for 1c | 3a still unknown |
| Raise-the-item-level article (gear §2.1) | none explicit | low (search cut short) | Stays an inference |
| Legion bad-luck formula (gear §2.3) | rules only; Fyr'alath curve | high on rules | none |
| Path of Exile quantity and rarity (gear §2.5) | official mechanics; formula secret | high | Supports damping the drop stat |
| Genshin 1.6%; Diablo III Torment (gear §2.3, §1.2) | confirmed; D3's timer threshold never published | high | Correct "within about two hours" |
| Tap Titans 2 and Idle Slayer gear through reset (gear §1.1) | both kept; Idle Slayer's must be earned back each run to be worn | medium-high / high | Fill "not verified" |
| Melvor chains and Into the Abyss (gear §1.1) | full chains; four gates | high | Correct "everything above Dragon"; FAQ wording |
| Clicker Heroes relics (gear §1.1, §3) | level = zone/25; forge cores lost at transcendence | high / medium-high | Drop Clicker Heroes as the example of a reset that leaves a residue |
| Last Epoch FP; The War Within item levels (gear §1.2) | per-craft cost confirmed; 636/639 confirmed | high | none |
| TT2 first-session points (first-session §2.1) | boss timer, titans, hand unconfirmed; eased-opening test found | low–high | Remove "first prestige near 110"; first equipment at stage 15 |

**Ideas the new evidence suggests.** These are inferences, not recommendations to act now.
1. **Show what a prestige would add as an effect or a rate.** Antimatter Dimensions, Trimps and Kittens
   put the payout's rate or effect on the reset itself.
   - Fantasy Idle already shows the tokens a prestige pays and what the next zone would pay.
   - Adding the effect ("+N tokens: +X% attack") or tokens per hour would let a player who prestiges by
     hand see the point where a run stops paying.
2. **Run the simulator with gapped sessions to test A3.1's first-week budget.** The difficulty studies say
   early walls cost the most and walls the player can fix are tolerated.
3. **Tap Titans 2's curve is an alternative brake for the late Abyss.** If it ever needs a softer brake
   than ×1.45 a depth, that self-limiting gear curve is one option.
4. **Idle Slayer re-arms kept gear another way:** its kept items must be earned back to be worn each run.
   Fantasy Idle already re-arms each run through bosses' first falls, so this is an alternative, not a
   need.

## Remaining gaps

- **A figure for idle-game wall tolerance.** None exists that we could find. Not checked:
  - Debeauvais's thesis "Challenge and Retention in Games" (2016), behind a human-verification page;
  - Hadiji et al. (2014) and Kristensen & Burelli (2019);
  - any data from King or Playrix.
- **Khaliq & Purkiss's full text.** It is behind IEEE's paywall.
- **Kongregate's sheets 1a, 1b, 1d, 1e, 2a and 3a.** Their sharing is restricted and they were never
  archived. Only Kongregate or Pecorella could supply them.
- **A designer's explicit "raise the item level" statement.** Bungie's Destiny posts and GDC loot talks
  were not checked.
- **Formulas never made public:**
  - World of Warcraft Legion's protection;
  - Path of Exile's diminishing returns;
  - Diablo III's timer threshold, and its legendary bonuses for Torment VII–XVI.
- **Tap Titans 2:**
  - official confirmation of the main-bonus formula;
  - the level an item gets per stage;
  - the boss timer's base;
  - titans per stage;
  - whether the tutorial draws a hand.
- **Smaller points:**
  - Last Epoch's Forging Potential on drop;
  - whether Exponential Idle's σ is a total or a gain;
  - whether Clicker Heroes has a souls-per-hour display.
- **Postmortems from the makers of Trimps, Kittens Game, Exponential Idle, Melvor and Clicker Heroes.**
  None is public; only patch notes, interviews and talks.

**Method.** Four helper searches ran beside my own. Two ran out of web-search budget, and archive.org
rate-limited for a few minutes. Every claim that carries a conclusion here was re-checked against the
saved raw files or the source page. Minor details rest on a helper's reading of the cited page.
