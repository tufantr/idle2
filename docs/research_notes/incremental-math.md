# The mathematics of incremental games, and what it predicts for Fantasy Idle

*Research report, 5 October 2026. It extends `docs/research_notes/Fantasy Idle game design research/combat_scaling_and_prestige.md` (KQ4 "exponential enemy vs polynomial player", KQ5 "prestige timing") and does not repeat its formula sheet.*

> **Since this note (7 October 2026).** Two findings in §8 have been acted on: armour now carries
> health (one per 20 defence, `BASE.hpPerDef`), which ended the one-hit deaths of §8.4, and the deep
> Abyss's drops grow ×1.6 a depth instead of ×1.8 to hold the late pace with it (DESIGN §5.2–5.3).
> The other levers in §8.8 are proposals in DESIGN §5.5, waiting for the owner. Figures in §8 are
> as measured before those changes. The gaps listed in §9 are filled, where sources allowed, by the
> addendum at the end.


**How to read it.** A sentence with a link is a fact from that source. **[Inference]** marks my own derivations, readings and recommendations. Numbers about Fantasy Idle come from the repository (`src/core/formulas.js`, `src/data/items.js`, `src/data/camp.js`, `src/systems/prestige.js`, `src/core/modifiers.js`) and from `tools/simulate.mjs` runs made for this report (150 h, seeds 1–3). The experiments in §8 used a scratch copy of the simulator that changes constants at start-up. No repository file was changed.

## Summary

- Idle games pair costs or enemies that grow exponentially with income that grows polynomially, so every run stalls. Prestige multiplies the next run and resets it ([Pecorella, Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)).
- **[Inference]** One quantity decides most balance questions: the **gap** δ, the obstacle's growth per stage minus the growth the player gets from progress itself (drops tied to the stage, upgrades bought with gold tied to HP). With δ > 0 there is a wall. A permanent multiplier M moves the wall by ln M / δ stages. Time-based growth r (levels, held prestige currency) moves it at r/δ stages per hour. With δ ≤ 0 the game runs away.
- Prestige formulas take a fractional power or a log of progress. To double the reward you need about 4× more earnings in AdVenture Capitalist, 8× in Cookie Clicker and 128× in Egg, Inc. ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)). Players reset when a reset would pay **+50% to +200%** ([Pecorella, GDC Europe 2016, slides 50–53](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507)). The optimal reset is the marginal value theorem: reset when the marginal rate of gain falls to the average rate ([Charnov 1976](https://en.wikipedia.org/wiki/Marginal_value_theorem)).
- Idle players average about 8-minute sessions, 5.3 a day ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game)). So pacing has to work for a short check-in every few hours plus one long offline gap.
- **[Inference] For Fantasy Idle:**
  - The deep Abyss is near-critical. Drops grow ×1.8 per depth, which is 72% of the monsters' ×2.26 per depth in log terms, so δ ≈ 0.023 per stage. With time-based growth of about 2% per hour, that predicts the measured late pace of ~0.9 stages per hour. It also explains why `dropGrowth` 2.2 and the early exponential token formula ran away.
  - Prestige tokens are a since-reset currency, held and added together, with a linear effect. Each reset adds less: the median gain was +12% for runs 1–20 and +0.7% after run 120. Progress from tokens alone therefore grows like log(time), and late resets are routine rather than decisions.
  - A player who prestiges as soon as the 10-minute rule allows reached stage 200 in 36–38 h, against 50–53 h for the simulator's player.
  - From about stage 170–200 any enemy hit kills the hero. Hero HP has no source that grows with depth, while the 10% damage floor follows the enemy's attack. Defence piles up past the 90% mitigation cap, where it does nothing.
  - The camp matters only while the best stage is below ~110. Above that a re-climb maxes it on the way, and 83–91% of all gold is lost at prestige unspent.

## 1. Growth functions and the cost/production seesaw

### 1.1 The growth ladder

| Class | Form | Where idle games use it |
|---|---|---|
| Linear | a·n | Output of n generators: `production = base × owned × multipliers`. AdVenture Capitalist's lemonade stand makes 1.67/s each ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)) |
| Polynomial | tᵏ | The product of k linear sources; a self-funding run (§1.2) |
| Exponential | bⁿ | Costs: AdCap `4 × 1.07ⁿ`; Clicker Heroes heroes ×1.07 per level; Tap Titans 2 heroes ×1.082 per level. Enemies: Clicker Heroes ×1.55 then ×1.145 per zone; TT2 ×1.39 then ×1.13 per stage (earlier notes, KQ1 and KQ3) |
| Derivative | Σ xⁿ/n! → eˣ | Generators that produce generators. Against exponential costs this stays sub-exponential, which Pecorella calls ideal; Derivative Clicker charges `5 × 1.1ⁿ` ([Part II](https://www.gamedeveloper.com/game-platforms/the-math-of-idle-games-part-ii)) |
| Super-exponential | b(t)ⁿ, b growing | Antimatter Dimensions: each tickspeed upgrade multiplies by ×1.125, by ×1.145 after one galaxy and ×1.165 after two. A galaxy costs 80 + 60n eighth dimensions; past 100 galaxies the increment grows by 2 per galaxy, and past 800 the cost rises another 0.2% per galaxy ([AD wiki](https://antimatterdimensions.wiki.gg/wiki/Antimatter_Galaxies)) |

Pecorella names the genre's engine: any exponential eventually overtakes any polynomial, however large the polynomial's power or small the exponential's base ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)).

### 1.2 Geometric costs, bulk buying and the effect/cost exponent

Closed forms ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)) for a base cost b, growth r and k already owned:

- next cost `b·rᵏ`;
- n more cost `b·rᵏ·(rⁿ − 1)/(r − 1)`;
- the most you can afford with c is `floor(log_r(c·(r − 1)/(b·rᵏ) + 1))`.

For example, AdCap's 11th lemonade stand (10 already owned) costs 7.87.

**[Inference]** The levels you can afford grow only with log(currency). If each level multiplies power by (1 + β), power becomes a power law of currency: **P ∝ Cᵉ with e = ln(1 + β)/ln r**.

- Clicker Heroes gives ×4 per 25 hero levels (×1.057 per level) against ×1.07 cost, so e ≈ 0.82. The wiki's figure that each level is about 0.988 as cost-efficient as the last is 1.057/1.07.
- Fantasy Idle's camp has e = ln 1.05/ln 1.36 = 0.159.
- An upgrade that adds one more generator instead gives P ∝ log C.

**[Inference] A self-funding run is polynomial in time.** Income is proportional to power in a production game. It is also proportional to power in a combat game that pays gold in proportion to enemy HP: kills per second = DPS/HP, so gold per second = DPS/k.

- Then dC/dt ∝ Cᵉ, which gives C ∝ t^(1/(1−e)) and P ∝ t^(e/(1−e)).
- With e < 1 the run is polynomial (Clicker Heroes: P ∝ t^4.6). With e = 1 it is exponential; with e > 1 it explodes in finite time.
- Against an obstacle gˢ, the stage reached is about (e/(1−e))·ln t/ln g: logarithmic in time. That is the wall, and the reason prestige exists.

### 1.3 Why obstacles go on the exponential

The seesaw is deliberate ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)):

- costs are put on an exponential and production on a linear or polynomial curve, so production leads early in a run and costs win later;
- once costs win, a prestige multiplies production, so each run gets further along the cost curve.

Combat idles price income in the obstacle: Clicker Heroes pays HP/15 per kill (up to HP/5 past zone 75) and TT2 pays 0.008·HP (earlier notes, KQ6). Pecorella calls gold a primary exchange currency: generators make DPS, killing converts it into gold, and the exchange rate is a knob.

**[Inference]** An exponential obstacle has three useful properties:

- a multiplier is worth the same number of stages anywhere on the ladder (ln M/ln g);
- stage ≈ log(power), so numbers stay readable;
- multipliers of fixed size can be handed out forever.

A polynomial obstacle would make the same multiplier worth more and more stages late: a built-in runaway.

### 1.4 Power against obstacle: walls in one model

**[Inference]** This generalises KQ4's stall-point formula. Let the requirement at stage s be R(s) = R₀·gˢ and the player's power P = P₀·hˢ·e^(rt). Here hˢ collects the sources that grow with progress (drops scaled to the stage, upgrades bought with HP-linked gold) and e^(rt) the sources that grow with time (levels, held prestige currency, crafted tiers). Write ρ = ln h and the gap **δ = ln g − ρ**.

1. **Per unit of progress:** a wall exists only if δ > 0. With δ ≤ 0 nothing stops the player.
2. **Stall point:** s* = [ln(P₀/R₀) + r·t]/δ. A permanent multiplier M moves the wall ln M/δ stages.
3. **Per unit of time:** the wall recedes at **r/δ stages per hour**; one stage takes δ/r hours.
4. **A discrete step** J (a boss with ×3 HP, a zone's jump) takes ln J/r hours to grind through if nothing else changes.
5. **A source that only grows linearly with time** (a held currency that gains a fixed amount per reset) has r ≈ 1/t. Then s* ≈ ln t/δ: progress is logarithmic, and the time per stage grows in proportion to the time already played.

Gold-funded upgrades are progress-indexed. If gold ∝ obstacle and power ∝ goldᵉ, then ρ = e·ln g and δ = (1 − e)·ln g. For Clicker Heroes' mid-game that is 0.18 × ln 1.145 ≈ 0.024 per zone, so doubling hero souls is worth about 28 zones.

### 1.5 Bumpy versus smooth

- AdCap doubles a generator's output when you own 25 of it and again at 50, which shows up as purchase spikes. Putting the thresholds in different places for each generator makes a different generator the best buy at each point ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)).
- Clicker Heroes multiplies hero damage ×4 every 25 levels (KQ1).
- Pecorella's model shows bursts of buying at 300, 400 and 500 generators. One run stalls from minute 120 until a ×16 multiplier arrives at 500 generators. He wants resets to vary in the same way ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)).
- His talk asks two test questions of every run: is its early part quick, and does the player get noticeably further than last time ([slides](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507))?

**[Inference] How often a bump should come:**

- In AdCap and Clicker Heroes a bump comes every 25 levels, i.e. every ×5.4 of currency (1.07²⁵).
- On a stage ladder that is one bump per one or two zones (×2–5 of obstacle).
- A bump of size B buys ln B/δ stages of fast play. Bumps that come from time-based sources arrive every ln B/r hours.
- The wanted rhythm is waits broken by jumps, never an even crawl.

## 2. Prestige mathematics

### 2.1 Formulas used by real games

| Game | Reward on reset | Depends on | One unit gives | Source |
|---|---|---|---|---|
| AdVenture Capitalist | 150·√(c_L/10¹⁵) angels | lifetime earnings | not verified here | [Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii) |
| Cookie Clicker | ∛(c_L/10¹²) prestige levels | lifetime cookies | not verified here | Part III |
| Realm Grinder | (√(1 + 8·c_M/10¹²) − 1)/2 gems; the n-th gem costs n trillion more | max coins | not verified here | Part III |
| Egg, Inc. | Δp = (c_R/10⁶)^0.14 soul eggs; offline capped at 2 h; a sub-prestige ladder of ~×5 steps | earnings this run | not verified here | Part III |
| Clicker Heroes | Primal bosses: ((z − 80)/25)^1.3 souls before transcendence, 20·(1 + TP)^(z/5 − 20) after; +1 soul per 2,000 hero levels | zone reached | +10% DPS per soul, held | KQ1: [tracker source](https://github.com/dfederm/ClickerHeroesTracker/blob/fe535216fa41111c9b531c189e3d9afae324229b/WebClient/src/components/outsiderSuggestions/outsiderSuggestions.ts); blog figures from search summaries |
| Tap Titans 2 (2017 variables) | ((s − 75)/14)^1.75 relics + 1 per 1,000 hero levels; prestige from stage 600 | stage reached | artifacts (spent) | [ServerVarsModel.py](https://github.com/metxchris/TT2-Sim/blob/ef0e375a8a876b336ac893a1240f5d9baf776533/ServerVarsModel.py) |
| Antimatter Dimensions | IP = 10^(log₁₀AM/308 − 0.75) after Break Infinity, 1 IP before | antimatter this infinity | upgrades (spent) | [src/game.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/5409e320cecef96a917cca1dfb68f1f183e499ca/src/game.js) |
| Idle Slayer | One slayer point costs 12 + 4·(lifetime SP) souls | souls | +1% coins/s per SP ever earned | wiki, search summary only (KQ3) |
| NGU Idle | NUMBER = a product of boss, adventure and time factors. Rebirths under an hour are penalised: 3 min gives 0.00031%, 15 min 6.25%, 60 min 100%, then +50% per extra day | the run | multiplies Basic Training attack and defence | wiki, search summary only (KQ3) |
| Fantasy Idle | floor(((S − 5)/5)^1.5) tokens | best stage this run | +0.5% ATK and DEF, +0.25% HP, held | `src/core/formulas.js`, `src/core/modifiers.js` |

**Gap:** not covered here are Trimps' helium, Kittens Game's karma and paragon, Exponential Idle's layers, and the per-unit bonuses of AdCap, Cookie Clicker, Egg, Inc. and Realm Grinder. A helper agent was still checking them when the work was stopped.

**[Inference] What has to grow to double the reward.** If p ∝ X^α, doubling p needs X × 2^(1/α):

- ×4 for a square root (AdVenture Capitalist, Realm Grinder);
- ×8 for a cube root (Cookie Clicker);
- ×141 for Egg, Inc.'s 0.14 (Pecorella rounds to 128 = 2⁷);
- ×1.49 of the stage above 75 for TT2's 1.75;
- ×1.59 of the stage above 5 for Fantasy Idle's 1.5.

Clicker Heroes after transcendence is exponential in the zone, so a fixed +5·ln 2/ln(1 + TP) zones doubles the souls. Antimatter Dimensions' infinity points are 10^(log₁₀AM/308), so doubling them needs 2³⁰⁸ times the antimatter. That is why AD adds multipliers and a second layer instead.

### 2.2 Lifetime against since-reset

Pecorella sorts prestige currencies into two families ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)):

- **Lifetime-based** (AdVenture Capitalist, Cookie Clicker; Realm Grinder on max coins): resetting again at the same point pays nothing, so each run must go further, and the gain per reset shrinks while the player is stuck.
- **Since-reset** (Egg, Inc., Clicker Heroes): resetting at the same point pays the same again. These need much flatter curves, and they can make it best to farm one point instead of progressing.

Clicker Heroes lives with this because its steep zones are a real wall: earning souls again at about the same zone is what lets players get past it.

**Purposes.** Prestige does two jobs: the ladder-climbing feeling of a big boost, and keeping numbers manageable. Most prestige formulas are fractional powers rather than true logs; Clicker Heroes is the exception. Later systems that compress numbers hard (Realm Grinder's reincarnation, AdCap's Mega Bucks) came afterwards (Part III).

### 2.3 When to reset

**Two encodings of the same rule.**

- **The marginal value theorem**: a forager should leave a patch when the rate it gains there falls to the average rate for the habitat, travel included. Graphically, the optimal stay is where a tangent from the travel time touches the gain curve, and longer travel means longer stays ([Charnov 1976](https://en.wikipedia.org/wiki/Marginal_value_theorem)).
- **Pecorella's rule of thumb** for when players reset: when a reset would pay +50% to +200% ([GDC Europe 2016, slides 50–53](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507)). The slides also say to take a log or a fractional exponent so that players reach a worthwhile reset point regularly.

**Rules recorded in games and guides** (earlier notes, KQ3 and KQ5; search summaries only):

- Idle Slayer's wiki: ascend when the new points would add 10–20% to your lifetime total.
- Clicker Heroes guides: push to zone 130, since primal bosses are certain at 110, 120 and 130.
- NGU Idle: penalises rebirths under 60 minutes.
- Reported but not verified this session: Antimatter Dimensions shows peak IP per minute, and Clicker Heroes calculators track souls per hour.

**[Inference] Applied to prestige.** Call the overhead per reset τ: the re-climb, menus and the minimum run time.

- **A held currency with a linear effect** (Clicker Heroes, Egg, Inc., Fantasy Idle). The long-run currency rate is p(t)/(t + τ). It peaks where p′(t) = p(t)/(t + τ). If p depends only on the best stage and the stage stalls at a wall, the optimum is to reset right at the wall: the marginal gain there is zero.
- **A compounding multiplier.** Maximise Δln M/(t + τ) instead. In a self-similar regime the optimum is a fixed growth factor per reset; the +50–200% band is the range players are observed to choose.
- A per-minute or per-hour display of the currency, if a game shows one, makes this tangent visible to the player.
- **Design consequence:** a big τ (a long re-climb) lengthens optimal runs; a small one makes the minimum-run rule the only brake.

### 2.4 How much multiplier a run must add

**[Inference]** This extends the earlier notes' stall-point model. To push the wall Δ stages further per run, the permanent multiplier must grow by **m = e^(Δ·δ)** per run.

| Gap δ per stage | +5 stages | +10 stages | +20 stages | What +50%..+200% buys |
|---|---|---|---|---|
| 0.072 (×1.075 per stage, no growth inside the run) | ×1.44 | ×2.06 | ×4.25 | 5.6–15 stages |
| 0.023 (Fantasy Idle's Abyss with drops) | ×1.12 | ×1.26 | ×1.58 | 18–48 stages |

- A held currency with a linear effect adds the same Δcurrency each time at a fixed wall. Its per-reset multiplier gain then falls like 1/n, and the wall moves like log(time).
- Keeping a constant Δ per reset needs either a reward that grows exponentially with the stage (dangerous: it adds to ρ, §8.2) or a multiplier that compounds per reset with something to stop it being farmed.

### 2.5 Run lengths over successive resets

**[Inference]**

- In Pecorella's model runs stay at tens of minutes, with occasional long ones that a bump breaks (Part III).
- A lifetime formula makes runs lengthen, because each must go further.
- A since-reset formula against a fixed wall keeps them constant. In Fantasy Idle's simulator the median run is 0.5–0.8 h from the first reset to the 260th.
- A good target: the first resets every 10–30 minutes, lengthening to 1–3 hours over the first ~20, with a few short runs right after a big bump.

### 2.6 Multi-layer prestige

- **Clicker Heroes** (search summaries of the official blog, KQ1): ascension pays hero souls. Transcendence then sacrifices souls, ancients, gilds and relics for ancient souls = floor(5·log₁₀(lifetime souls)), and transcendent power TP = 50 − 49·e^(−AS/10000) %. TP is the base of the souls-per-zone exponential, so the outer layer speeds up the inner one's growth rate.
- **Antimatter Dimensions**: eternity points = 5^(log₁₀(IP)/308 − 0.7) ([src/game.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/5409e320cecef96a917cca1dfb68f1f183e499ca/src/game.js), KQ3), a log of the inner currency again.
- **Number compression**: Realm Grinder's reincarnation and AdCap's Mega Bucks were added later to compress the numbers ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)).
- **Idle Slayer**: an ultra ascension pays points based on lifetime slayer points (search summary, KQ3).
- **Gap:** Realm Grinder's ascension, Trimps, Kittens Game and Exponential Idle were not verified.

**[Inference] Why outer layers take logs.** The inner currency grows exponentially with inner progress, and a log or tiny power of it gives an outer currency that grows linearly. The outer layer can then pay +50–200% per reset again after the inner layer's gains have decayed, and it bounds the numbers. Fantasy Idle has one layer, plus skill points.

## 3. Multiplier architecture

### 3.1 Adding and multiplying

**How games stack bonuses.**

- Clicker Heroes adds its per-soul bonus (+10% per hero soul) to Morgulis's (+11% per level). The total then multiplies achievements, Dark Ritual, all-hero upgrades, the ×4 level milestones and gilds (earlier notes KQ1 and KQ4; [userData.ts](https://github.com/dfederm/ClickerHeroesTracker/blob/fe535216fa41111c9b531c189e3d9afae324229b/WebClient/src/models/userData.ts)).
- Fantasy Idle does the same: percentages add inside a layer, and the layers multiply. The layers are content × tokens (1 + 0.005·T) × camp (DESIGN §4, `src/core/modifiers.js`).

**[Inference] What the two rules do.**

- n additive bonuses of x give 1 + n·x. Each new one is worth relatively less, a built-in diminishing return.
- n multiplicative bonuses give (1 + x)ⁿ, and each is worth the same.
- k independent sources that each grow linearly with time multiply to tᵏ: polynomial, never exponential.
- Exponential power in time needs a compounding source (a multiplier bought with a currency proportional to power, e = 1 in §1.2) or a progress-indexed source that feeds back (drops scaled to the stage, gold ∝ HP). These are also the only sources that move δ.
- Rule of thumb: give a source its own multiplicative layer only if its growth is controlled. Many small bonuses (achievements, perks, pets) belong in an additive layer.

### 3.2 Caps and diminishing returns

| Shape | Formula | Example |
|---|---|---|
| Hard cap | min(x, C) | Fantasy Idle: crit 75%, dodge 60%, lifesteal 30%, attack speed +100%, mitigation 90%. Melvor caps damage reduction at 95% (earlier notes) |
| Asymptotic | linear up to 0.75·L; beyond it, 0.75L + d·(1 − d/(x − 0.75L + d)) with d = 0.25L, which approaches L | Kittens Game's `getLimitedDR` ([game.js](https://github.com/nuclear-unicorn/kittensgame/blob/master/game.js)) |
| Exponential saturation | C·(1 − e^(−kL)) | Clicker Heroes outsiders: Kumawakamaru −8·(1 − e^(−0.025L)), Atman 75·(1 − e^(−0.013L)); transcendent power 50 − 49·e^(−AS/10000) % (KQ1) |
| Power soft cap | above T, T·(x/T)^p | NGU's Infinity Cube: square root above base + equipment stats (earlier loot notes, KQ2) |
| Rating | a/(a + b) | Fantasy Idle's damage taken ATK²/(ATK + DEF): DEF equal to ATK halves damage, and DEF = 9·ATK reaches the 90% cap |
| Cost regime change | cost increments grow | Antimatter Dimensions galaxies (§1.1) |

**[Inference]** A hard cap turns surplus into nothing; a soft cap turns it into less. A hard cap on one side of a race makes the other side's growth decide the race alone. That is what happens to Fantasy Idle's defence in the deep Abyss (§8.4).

### 3.3 Representing the numbers

- JavaScript doubles hold integers exactly up to 2⁵³ − 1 ≈ 9.0e15, and any value up to about 1.8e308 ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)).
- break_infinity.js stores a mantissa and an exponent and reaches about 1e9e15. It trades accuracy for speed: Antimatter Dimensions' script time fell 4.5× when it moved over from decimal.js. break_eternity.js goes on into tetration ([break_infinity.js](https://github.com/Patashu/break_infinity.js)).
- Display conventions (earlier notes): Cookie Clicker prints full digits below 10⁶ and suffixes above; Kittens Game starts suffixes at 9,000; Antimatter Dimensions defaults to mixed scientific.

**[Inference]** Fantasy Idle is safe with doubles for its whole horizon:

- Enemy HP is 4.7e10 at stage 274 and grows ×2.26 per depth.
- HP passes 2⁵³ near stage 420 and the double limit near stage 8,700.
- Lifetime gold counters (1.6–2.4e14 at 150 h) will drop integer precision past ~9e15, which is harmless.
- A library is only needed if the Abyss is meant to go thousands of stages deeper.

## 4. Pacing models

### 4.1 Sessions and returns

- **Idle sessions** ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game), updated March 2025):
  - about 8 minutes on average, 5.3 a day (4.6 for hyper-casual);
  - the top 10% of games: 5.82 sessions and ~35 minutes a day, with day-1 retention of 45.6% (top 25%: 39.4%);
  - stickiness of 18% against 10.5% for hyper-casual.
  - Its levers are timed mechanics, daily to monthly rewards, and reminders.
- **First sessions** (deltaDNA, via the earlier `first-session.md`): the mean is 9 minutes across 275 games, and longer first sessions go with better day-1 retention (31% against 20%, a correlation). The advice is 10–20 minutes, ending on a reason to come back ([Game Developer](https://www.gamedeveloper.com/business/how-first-session-length-impacts-game-performance)).
- **[Inference] Two return beats.** Five sessions a day means a check-in every ~3 hours while awake, plus one overnight gap of 8–10 hours. Design both:
  - a 2–4-hour beat with something ripe on return (a reset worth taking, a forged tier, a crate, crops);
  - an overnight beat that the offline cap covers in full.

### 4.2 Time to the next goal

- **Early**: seconds to the first reward in AdCap. TT2 brings something new every 4–6 stages up to stage 60. Fantasy Idle opens a new place every 20–60 s in the first four minutes (`first-session.md`, DESIGN §3.24).
- **Pecorella's spreadsheet models** estimate progression without playing. They are meant to show where the wait for the next generator becomes too long ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)). The sheets are public at [kon.gg/idle-math-spreadsheets](https://kon.gg/idle-math-spreadsheets); I did not open them. Pecorella warns they are not an accurate simulation, only a rough feel, and that balancing needs a lot of iteration ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)).
- **[Inference] Space goals evenly in log(time)**: ~1 min, 3 min, 10 min, 30 min, 1.5 h, 5 h, 15 h, 2 days. A ratio near 3 matches stage ≈ log(time) (§1.4), so every goal feels about as far as the last.

### 4.3 Offline caps and efficiency (earlier notes, primary sources)

| Game | Offline rule |
|---|---|
| Melvor Idle | Tick-by-tick replay at 100%, capped at 24 h ([game.js](https://github.com/ChanceToZoinks/melvor-source/blob/695f1b1b9f886b6f492958e8182a699563afd9e1/src/game.js)) |
| Trimps | Time Warp at 100% up to 24 h, then a cheaper fallback ([main.js](https://github.com/Trimps/Trimps.github.io/blob/master/main.js)) |
| Cookie Clicker | 5% of production for 1 h, a tenth of that beyond; heavenly upgrades raise it to 91% ([main.js](https://github.com/ozh/cookieclicker/blob/master/main.js)) |
| Egg, Inc. | 2 h ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)) |
| Antimatter Dimensions | Caps the resolution (≤10⁵–10⁶ ticks, ≥33 ms each), not the time |
| Fantasy Idle | Same-code replay at 100%, 12 h; +2 h per Endurance perk up to 24 h, +1 h from the Zipline |

**[Inference]** The cap decides how much a missed check-in costs. 12 h covers a night, but not a night plus a working day; the perk path to 24 h is the right shape.

### 4.4 Walls

- Pecorella's model has one run stall from minute 120 until a ×16 bump. In Clicker Heroes, steep zones make progress slow, and souls earned again at about the same zone carry players past a substantial wall ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)).
- **Gap:** I found no published figure for how long players tolerate a wall.
- **[Inference]** A wall lasts ln J/r hours (§1.4). Keep ordinary walls within one offline cap of play, give each one at least two exits, and reserve multi-day walls for deliberate long goals.

### 4.5 Modelling total playtime

**[Inference]** The time to stage S is the sum of the time per stage. In the stall model it is about ∫ δ/r ds once the wall binds, plus the climb. In practice a policy simulator is better than a spreadsheet, because it captures reset policy, drops and survival. Fantasy Idle already has one; §7 lists what to measure with it.

## 5. Loot and skills as growth sources

**How other games fit gear into the growth model** (facts from the earlier loot notes, KQ2, unless linked):

- **Melvor Idle** has authored, roughly geometric gear tables and no stage exponent.
  - Scimitar strength goes 6 → 9 → 14 → 20 → 28 → 44 → 66 from Bronze to Dragon, ×1.4–1.6 per tier from Mithril on and about 11× over the craftable tiers. Drop-only items add 1.2–2× more ([Items.js](https://github.com/espoire/Melvor-Idle-Combat-Simulator/blob/87a8073f18cefc9a7cb0f490b20ddb6c1155180c/scripts/melvor/Items.js)).
  - Enemy max hits grow about 25× from the first dungeon to the god dungeons. The player closes the gap with damage reduction up to ~80% ([DR compendium](https://github.com/gridster2/Melvor/blob/main/Documents/Compendium%20of%20Damage%20Reduction.md)).
  - Max hit has a level × strength-bonus cross term, so levels and gear multiply (KQ2).
- **NGU Idle**: an item's level (0–100) scales its stats linearly up to 2×. Zone sets provide the tier jumps, consumable boosts add stats, and the Infinity Cube sinks surplus boosts under a square-root soft cap.
- **Clicker Heroes relics** come from zone 99 on, once per ascension. Their power depends on the relic's level, and they add to ancients' bonuses.
- **Tap Titans 2**:
  - Equipment's level, and with it the size of its bonus, is set by the player's max stage when the item is found (search summary only).
  - Relics are `((stage − 75)/14)^1.75` per prestige ([TT2-Sim server variables](https://github.com/metxchris/TT2-Sim/blob/ef0e375a8a876b336ac893a1240f5d9baf776533/ServerVarsModel.py)). The same 2017 file has `equipmentStageMin = 56`, `equipmentStageDelta = 20` and rare/legendary modifiers of 3 and 10, but does not say how they are applied.

**[Inference] Two kinds of source.**

- **Progress-indexed** sources are set by where the player is: TT2 equipment, Fantasy Idle's Abyss drops (×1.8 per depth) and zone gear tiers, NGU zone sets, and any gold-bought upgrade when gold ∝ HP. Only these enter ρ, and their sum must stay below the obstacle's ln g by a chosen margin δ.
- **Time-indexed** sources grow with play time: skill levels, crafted tiers gated by XP, held prestige currency, perks.
- One-off sources (uniques, achievements, pets, Titans) are steps.
- Melvor stays sane without prestige because its obstacles are authored, not exponential. Its gear needs only a ~×1.5 tier ratio.
- In an exponential stage game, a tier ratio converts to stages through ln(tier ratio)/ln g. That is how many stages of obstacle growth one tier covers.

**[Inference] Share of power per source.** No published targets were found. Measure each source's share of the growth of ln(power) over a window, and read it as follows:

- below ~5%, a source is cosmetic (the old skill points were);
- above ~70%, it makes every other system optional;
- a healthy RPG idle has a gear spine plus a prestige layer, each 25–60%, with levels, perks and collections making up the rest.

## 6. Academic and long-form sources

**Read in this session:**

- **Pecorella's three-part *The Math of Idle Games*** on Game Developer: [Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) (13 Oct 2016: costs, production, bulk buying, multipliers), [Part II](https://www.gamedeveloper.com/game-platforms/the-math-of-idle-games-part-ii) (14 Dec 2016: derivative growth), [Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii) (1 Feb 2017: prestige). These are the basis of §1–§2.
- **His GDC Europe 2016 slides** [*Quest for Progress*](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507): the reset rule of thumb, and the finding that idle players' top motivators were completion and power.
- **The marginal value theorem** ([summary](https://en.wikipedia.org/wiki/Marginal_value_theorem); Charnov, *Theoretical Population Biology* 9:129–136, 1976). This is my link, not one the idle-game literature makes in the sources read.

**Cited by the earlier notes, not re-read:**

- Pecorella's GDC 2015 talk ([slides](https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367)) and GDC 2016 *Idle Chatter* ([slides](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260));
- the r/incremental_games post *Linear, Polynomial, Exponential (and more) growth explained*, which Pecorella links.

**Gap: not read.** These were assigned to a helper agent that had not reported when the work was stopped:

- *Playing to Wait: A Taxonomy of Idle Games* (Alharthi et al., CHI 2018);
- Sonia Fizek's papers on idle games;
- Purkiss & Khaliq (IEEE GEM 2015);
- developer postmortems (Antimatter Dimensions, Trimps, Kittens Game, Exponential Idle, Melvor, Clicker Heroes);
- r/incremental_games design threads;
- published data on how long players tolerate walls.

No claims are made here about their content.

## 7. An evaluation recipe

**[Inference]** These are the metrics to compute from `tools/simulate.mjs` after any balance change. The targets come from the sources above where a source exists; the rest are my judgement.

| # | Metric | How to get it | Target |
|---|---|---|---|
| 1 | Hours to milestones: first prestige, stage 50/100/150/200, each gear tier, each dungeon unique | Milestone table | First prestige ~1 h (DESIGN §2). Something new every 20–60 s in the first minutes (DESIGN §3.24; TT2: something every 4–6 stages to 60) |
| 2 | Time per stage per 10-stage band, and its log-slope | Milestones, or best stage in the snapshots | Rises smoothly in log terms. No band more than ~3× the one before. No flat band longer than one offline cap without a second way out |
| 3 | Wall list: where the best stage stalls for 2 h of play or more, and why (boss timer, attrition, one hit) | Stall detector plus death events by stage | Each wall under a day of play, with two or more exits (pillar 4) |
| 4 | Gain per reset: Δln(permanent multiplier), and currency gained against currency held | Run log | +50% to +200% currency when the player resets (Pecorella); if late resets are meant to be decisions, at least +10% power |
| 5 | Lengths of the first 20 runs | Run log | Short at first (10–30 min), getting longer with bumps (Pecorella's 120-minute run) |
| 6 | δ_eff | Double one layer and measure the stage gained at a fixed time: δ_eff = ln 2/Δs | Above ~0.02 per stage on every axis (closer to 0 is near runaway); similar for the attack and survival sides |
| 7 | Time-based growth r and the late pace r/δ | Δln(power)/Δt, minus ln(drop growth) × depth gained | A pace target for 50–150 h, e.g. 0.5–1 stage per hour |
| 8 | Share of log-power by source | Decompose the derived stats into gear, content, token and camp layers | Each major system 25–60%; none under 5% if the UI presents it as progress |
| 9 | Survival at the wall: hits to die, DEF/enemy ATK | Snapshot hook (as in §8.4) | 2–20 hits; DEF/ATK under 9, where Fantasy Idle's cap begins |
| 10 | Policy spread | Sensible, AFK pusher, skiller, speed-prestiger | No policy more than ~1.5× faster to a milestone than the idle sensible player (pillar 3) |
| 11 | Gold spent / earned per run | Sink log | Above the current 8–12% if gold is meant to matter late |
| 12 | A realistic week | 5 sessions of ~8 min a day plus overnight gaps | The offline cap covers the night. Every return finds something ripe: a crate, a crop, a tier to forge, a reset worth taking |

## 8. Applying this to Fantasy Idle

Everything in this section is **[Inference]** except numbers quoted from code or from simulator runs.

### 8.1 The numbers

| Quantity | Value (where) |
|---|---|
| Enemy HP per zone / per Abyss depth | ×2.061 / ×2.261 (`hpGrowth` 1.075, `abyssHpGrowth` 1.085) |
| Enemy ATK per zone / per depth | ×1.877 / ×2.061 |
| Gear tier ratio | ×2.2; power 1 → 112 over seven tiers (`GEAR_TIERS`) |
| Stages of enemy growth one tier covers | 10.9 of HP, 12.5 of ATK (stages 1–100); 9.7 of HP in the Abyss |
| Abyss drop growth | ×1.8 per depth past depth 5 = ×1.0605 per stage, 72% of HP growth and 81% of ATK growth in log terms |
| Camp | ×3.39 ATK, ×3.39 DEF, ×2.67 HP at 25 levels, 333k gold in all; e = 0.159 |
| Tokens per prestige | 27 at stage 50, 82 at 100, 243 at 200, 385 at 270; doubling them needs the wall ×1.59 further |
| Token layer | 1 + 0.005·T (ATK, DEF), 1 + 0.0025·T (HP); T is every token ever earned |
| Simulator, 150 h, seeds 1/2/3 | First prestige at 1.5 h (stage 50–56). Stage 100 at 3.9–5.4 h, 150 at 15.5–21 h, 200 at 48–53 h. Best 274 / 230 / 280. 216–271 prestiges, 49k–80k tokens (layer ×250–×400). Gold spent 8–12%; 83–91% lost at prestige |
| Hours per stage (seed 1) | 0.23 at stages 100–120, 0.41 at 120–150, 0.64 at 150–200, 1.31 at 200–274 |

### 8.2 The deep Abyss is near-critical, and that sets the late pace

**The gap.** ρ = ln 1.8/10 = 0.0588 per stage against ln 1.085 = 0.0816, so δ ≈ 0.023.

**The model reproduces seed 1's late game.** Between 100 h and 150 h, seed 1 gained 45 stages (0.9 per hour) while the hero's attack grew ×40 (7.4% per hour).

- At the wall, power must grow at ln g × the pace: 0.0816 × 0.9 = 7.3% per hour, which matches.
- About 5.3% per hour of that came from going 4.5 depths deeper.
- That leaves time-based growth r ≈ 2% per hour: tokens ~1%, plus Paragon, Titans and combat levels.
- r/δ = 0.02/0.023 ≈ 0.9 stages per hour.

**It explains DESIGN's own observations.**

- `dropGrowth` 2.0 gives δ = 0.012, a ×1.9 faster late game (DESIGN measured 250–334 at 150 h against 238–270).
- 2.2 gives δ = 0.003, a ×8 faster late game: the runaway DESIGN saw (390–470).
- From 2.26 on, δ ≤ 0 and there is no wall at all.
- The report's original token formula (`0.75 × 2^(S/10)` tokens at +1% each, DESIGN §6.1) added up to ln 2/10 = 0.069 per stage of progress-indexed growth once its layer dominated. With the drops that is 0.128, above 0.082: the runaway the simulator showed (10¹¹ tokens and stage 350 in 20 h).
- The polynomial token formula fixed this by making tokens time-indexed.

**Calibrate before trusting it.** Doubling the token layer's effect predicts ln 2/δ ≈ 30 stages. Measured at 150 h it gave +12 (seed 1: 274 → 286) and +17 (seed 3: 280 → 297), while mid-game milestones came ~40% sooner (stage 200 at 31–33 h against 50–53 h). The gear worn lags the wall, and survival also binds (§8.4), so δ_eff is ≈0.04–0.06 for a one-time multiplier.

### 8.3 Tokens are since-reset, held, and linear

In Pecorella's terms ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)), a since-reset currency pays the same again for resetting at the same point. Fantasy Idle's tokens are paid on this run's best stage, summed forever, and act linearly; Clicker Heroes' souls and Egg, Inc.'s soul eggs are the same family. What follows:

1. **The gain per reset falls as 1/n.**
   - At a wall of 270, the n-th reset adds 1/(n + 200/385) to the layer: +193% the first time, +66% the second, +22% the fifth, +10.5% the tenth, +2% the fiftieth.
   - The simulator measured median gains of +12% over runs 1–20 and +0.7% after run 120.
   - Pecorella's +50–200% holds only for the first two or three resets. Late resets are a routine.
2. **Progress from tokens is logarithmic in time.**
   - T grows about linearly with the number of resets, so r_tokens ≈ 1/t, worth (1/δ)·ln(t₂/t₁) stages.
   - That is ~44 stages per e-fold of play, or ~30 per doubling (150 h → 300 h).
3. **The best play is to reset as soon as the rules allow.**
   - Tokens depend only on the run's best stage, and the 10% restart costs one kill per stage (~4 minutes from 27 to 270). The marginal value theorem therefore says: reset as soon as the run is back at its best.
   - A scratch policy did exactly that, with the 10-minute minimum. It reached stage 150 at 10–11 h (17–21 h for the sensible player) and stage 200 at 36–38 h (50–53 h), on seeds 1 and 3. Its first 20 runs had a median length of 0.3 h against 0.7 h.
   - That advantage comes from clicking the prestige button more often, which works against pillar 3 (active play at most ~1.5×).
4. **The exponent 1.5 sets the scale, not the shape.**
   - A higher `tokenExp` (1.75 is TT2's relic exponent) multiplies tokens at stage 270 by 2.7. That is a one-time shift of ln 2.7/δ_eff ≈ 17–25 stages, followed by the same 1/t decay.

### 8.4 Survival drops out of the game past stage ~170–200

**The rules.**

- Damage taken is max(ATK²/(ATK + DEF), 0.1·ATK).
- Both attack timers start at zero when a monster spawns. A monster swings every ≥1.3 s; the hero every ≥0.75 s at the attack-speed cap.
- Enemy attack grows ×2.06 per depth. The hero's HP has no source that grows with depth: only levels, perks, 0.25% per token, Titans and the capped Hearth. So HP's gap is ln 1.075 = 0.072 per stage, three times the attack side's.

**Measured at the best stage on seed 1:**

| Hours | Best stage | Hits to die | DEF / enemy ATK |
|---|---|---|---|
| 10 | 129 | 1.9 | 2.3 |
| 30 | 170 | 1.0 | 4.0 |
| 50 | 199 | 0.9 | 11 |
| 100 | 229 | 0.4 | 53 |
| 150 | 274 | 0.03 | ~80 |

At 150 h the 10% damage floor alone is 7.4e7, against 2.5e6 HP. Past DEF = 9× enemy ATK the 90% cap makes more defence worthless.

**What changes.**

- Past ~stage 200 every fight is a first-strike race: kill the monster before its first swing (~1.3 s), or dodge it (60% at most).
- The boss's 30-second timer stops mattering.
- Food, lifesteal, the Hearth, defence and the defence potion do nothing.
- The 53% of seed 1's deaths that came on regular stages are one-hit deaths, not attrition.
- DESIGN's intent, that bosses check damage and regular stages check survival, holds only to ~stage 170.

**Evidence that survival binds.** With `abyssAtkGrowth` lowered from 1.075 to 1.065 (seed 1), stage 150 came at 13.1 h instead of 20.8 h, stage 200 at 32.4 h instead of 52.9 h, and the best at 150 h rose from 274 to 297.

### 8.5 The camp is an early-game system

**When it is maxed.**

- Climbing one kill per stage, the gold collected reaches the camp's 333k total at about stage 108, whatever the start.
- Below a best of ~110, the camp needs farming at the wall: the climb DESIGN intends.
- Above ~120 it is bought on the way up, before the wall. Its last level costs 0.07 kills at stage 150.
- Seed 1 passed 120 at 8.4 h. After that the camp no longer shapes a run.

**Gold.** Only 8–12% of all gold earned is ever spent; 83–91% vanishes at prestige.

**Uncapped, it would be a runaway risk.** Its power would follow gold^0.159, which adds 0.159 × ln g to ρ.

### 8.6 Gear tiers against the zone ladder

**One tier is about one zone.** ×2.2 per tier against ×2.06 HP per zone is 1.07 zones of HP and 1.25 of enemy attack per tier.

- The seven tiers (×112) cover 47 stages of the first 100 stages' HP growth, which is ×1,289 in all: about 66% in log terms.
- Tokens, camp and levels must cover the rest. That is the right split for a game whose prestige should matter.
- Rarity tops out at ×1.40, 0.43 of a tier in log terms, so a common of tier N always beats a legendary of tier N−1.

**Tiers are the mid-game clock.** In seed 1 the weapon reached tier 5 at 10 h, 6 at 20 h and 7 at 49 h. At ln 2.2 = 0.79 per tier, that is ~8% per hour of time-based growth at 10–20 h and ~2.7% per hour at 20–49 h. After that the Abyss drop growth takes over.

**Shares of the hero's attack**, estimated from seed 1's 150-h build in log terms:

| Source | Share of ln ATK at 150 h | Share of its growth from 10 h to 150 h |
|---|---|---|
| Gear (with depth scaling and +10 upgrades) | ~64% | ~64% |
| Token layer | ~24% | ~30% |
| Content layer (combat level, perks, achievements, Titans) | ~7% | ~6% |
| Camp | ~5% | 0 |

That fits the band in §5.

### 8.7 The 10% restart and the 10-minute run

- **The restart is cheap.** It costs about 0.9 × best kills, roughly a second each far below the wall: ~4 minutes at a best of 270. In marginal-value terms this travel time is small, so the 10-minute minimum is the only brake on resetting.
- **It keeps runs quick at the start**, which is Pecorella's first test, without a full restart's empty early stages.
- **It starves the early climb of gold.** Stage 27 pays ~40 gold a kill, which is why the camp is a climb only below a best of ~110.

### 8.8 Levers and suggested values

Each value is a starting point for the simulator, not a tested result.

| Lever | Now | Suggested | Predicted effect | Check |
|---|---|---|---|---|
| Hero HP that grows with depth | none | Armour adds HP = c × its own DEF to the base HP, so the HP layers multiply it. A first guess is c ≈ 0.05: about 2 hits to die at stage 200 and ~13 at stage 274 on seed 1's build (my estimate) | Survival's gap falls from 0.072 to ~0.014 per stage, and regular stages test survival again past 200 | §7 #9: 2–20 hits to die at the wall up to stage 300 |
| Mitigation cap | 90% | 95% (Melvor's) | Moves the one-hit point ~9.6 stages (ln 2/ln 1.075); helps only with the HP lever | #9 |
| Reset cadence | 10-minute minimum | 20 min, or scale tokens by min(1, run minutes/30), as NGU penalises short rebirths. The length factor is better | Tested at 30 min (seeds 1, 3): the speed-prestiger's lead is gone (stage 200 at 51–54 h against 52–57 h for the sensible player). But the sensible player ends 30–50 stages lower at 150 h (242/232 against 274/280), because its late runs were ~30 min anyway. 20 min is untested | #10: speed-prestiger within ~15% of the sensible player at stages 150 and 200, with no loss at 150 h |
| Late reset weight | +0.7% per late reset | (a) accept it, and add an opt-in auto-prestige ("when back at best and the run ≥ N min"); or (b) a second, log-based layer (Clicker Heroes' transcendence) whose resets pay +50–200% | (a) removes the chore; (b) brings back a decision every few days | #4, #5 |
| Late pace | `dropGrowth` 1.8 (δ 0.023) | 1.8–1.9; never ≥ 2.1 | 1.9 → δ 0.017 (late pace ×1.3); 2.0 → ×1.9; 2.26 → no wall | #6, #7 |
| Abyss attack growth | 1.075 | 1.065–1.07 only with the HP lever, and with `dropGrowth` ~1.7 to hold the pace | Seed 1: stage 200 from 53 h to 32 h | #2, #9 |
| Camp | 25 levels, ×1.36 | (a) leave it as the early game's run layer; or (b) price levels in kills at the best stage, like supplies, so every run is a climb; or (c) levels past 25 at ×2.0 each (e = 0.07; δ 0.023 → 0.017) | (b) gives gold a job each run; (c) gives late gold a job at a ×1.3 late pace | #11 above ~30%; #7 |
| Gear tier ratio | ×2.2 | Keep. If zones are added, keep ln(tier ratio)/ln(zone growth) ≈ 1 | One tier ≈ one zone | #8 |
| Token exponent | 1.5 | Level knob only (1.4–1.75) | Shifts the curve; does not change the 1/t shape | #4 |

## 9. Gaps and method

**Stopped early.** Work was stopped before two helper searches reported, so these are missing:

- the academic literature in §6;
- Trimps, Kittens Game and Exponential Idle (§2.1, §2.6);
- per-unit prestige bonuses for AdCap, Cookie Clicker, Egg, Inc. and Realm Grinder;
- published figures on how long players tolerate a wall;
- Tap Titans 2's equipment formula and IdleOn;
- the contents of Kongregate's worksheets.

**Experiments.** They used a scratch copy of `tools/simulate.mjs` in the session's scratchpad. It sets constants at start-up and adds two things: a speed-prestige policy, and a snapshot hook for hits to die and DEF against enemy attack. Each lever was run on one or two seeds. DESIGN §5.2 calls the late game chaotic, and seeds spread ±20–40 stages at 150 h, so read the late-game differences as directions, not sizes.

**Untested.** The HP-from-armour lever cannot be tried without changing game code; its value is an estimate.

---

## Addendum: prestige currencies, the idle-game literature, walls and automation

*Addendum, 7 October 2026. It fills the gaps listed in that report's §6 and §9 and does not repeat the reward formulas in its §2.1.*

**How to read it.**
- A sentence with a link is a fact from that source.
- **"Code"** means I read the game's own public source.
- **"(search summary)"** means I saw the fact only in a search engine's summary of the linked page, because the page itself was blocked. These facts are weaker.
- **[Inference]** marks my own derivations, readings and suggestions.

**Access.** Fandom wikis (AdCap, Cookie Clicker, Egg, Inc., Trimps, Realm Grinder, Exponential Idle, Antimatter Dimensions) refused the fetcher with HTTP 402. The BreezeWiki mirror asks for a CAPTCHA, which I did not attempt. The hard numbers below therefore come from game code where it is public (Cookie Clicker, Trimps, Kittens Game), and from search summaries otherwise.

### A1. Prestige currencies: what one unit does, and how it is used

#### A1.1 Summary

| Game | Currency | One unit gives | Held or spent | Evidence |
|---|---|---|---|---|
| AdVenture Capitalist | Angel investors | +2% profit at base; some upgrades raise it | Held. Angel upgrades are bought by sacrificing angels, which lose their bonus | search summary |
| Cookie Clicker | Prestige levels and heavenly chips, earned 1:1 | +1% CpS per level, scaled by the share unlocked by five heavenly upgrades (5 + 20 + 25 + 25 + 25 = 100%) | Levels held; chips spent. Spending chips does not lower the level | code |
| Egg, Inc. | Soul eggs (SE); eggs of prophecy (PE) | SE: a % of earnings each, +1 point per level of Soul Food. Each PE multiplies the whole SE bonus by 1.05, compounding (+0.01 per level of Prophecy Bonus) | Both held | search summary |
| Realm Grinder | Gems | +2% production each | Held | search summary |
| Trimps | Helium | Buys perk levels, e.g. +5% attack per level of Power | Spent; level L of most perks costs ⌈L/2 + base·1.3^L⌉ | code |
| Kittens Game | Karma; paragon | Karma: +1 point of happiness each. Paragon: +1% production each under a capped diminishing return (ceiling +200%), plus +0.1% storage | Held. Paragon spending on metaphysics upgrades not verified | code |
| Exponential Idle | μ (prestige), ψ (supremacy), then graduation | not found | Spent on upgrades | search summary |
| Fantasy Idle | Tokens | +0.5% ATK and DEF, +0.25% HP | Held | repository |

#### A1.2 Game by game

**AdVenture Capitalist** (search summary of [Steam discussions](https://steamcommunity.com/app/346900/discussions/0/364039785169128886) and the [wiki's Angel Upgrades page](https://adventure-capitalist.fandom.com/wiki/Angel_Upgrades)):
- Each angel adds 2% to profits at base. Some upgrades raise this to 3% or 4% per angel.
- Angel upgrades cost angels. The angels spent are gone along with their bonus. The upgrades are lost at the next reset and must be bought again.
- Players' rule of thumb: spend no more than about 1% of your angels on an upgrade, unless it multiplies all profit.
- The angel formula is in §2.1.

**Cookie Clicker** (code, the live [main.js](https://orteil.dashnet.org/cookieclicker/main.js), read 7 Oct 2026):
- Prestige level = (cookies baked all time / 10¹²)^(1/HCfactor). The [wiki](https://cookieclicker.wiki.gg/wiki/Ascension) describes this as a cube root.
- Outside Born Again mode, the CpS multiplier gains prestige × 1% × heavenlyPower × heavenly multiplier. The code sets heavenlyPower to 1 and comments that it is the CpS percent per chip.
- The heavenly multiplier adds 0.05 for Heavenly chip secret, 0.20 for Heavenly cookie stand, and 0.25 each for Heavenly bakery, Heavenly confectionery and Heavenly key. The full +1% per level is therefore unlocked in five purchases.
- Chips are gained 1:1 with prestige levels. They are spent on heavenly upgrades that are kept across ascensions. Costs run from 1 chip to tens of millions, about 7.5 × 10¹⁶ for the lot ([wiki](https://cookieclicker.wiki.gg/wiki/Ascension)).
- So the same reward feeds two counters: a held level and a spendable chip balance. Spending never costs passive power.
- How chips worked before version 2.0 was not on the wiki.gg pages I could read, so that remains open.

**Egg, Inc.** (search summary of the wiki's [Egg of Prophecy page](https://egg-inc.fandom.com/wiki/Egg_of_Prophecy?oldid=7373) and guides):
- Each SE gives a percentage bonus to earnings. Each level of the epic research Soul Food adds one percentage point per egg.
- The base per-SE bonus (commonly given as 10%) and Soul Food's level cap were not confirmed this session.
- PEs multiply the SE bonus by ((105 + Prophecy Bonus level)/100)^PE. The bonus compounds.
- Earnings bonus = SE × (per-SE %) × that PE factor. SE earned per prestige is in §2.1.
- **[Inference]** The rare second currency multiplies the per-unit value of the first. A late PE is therefore worth the same ratio (×1.05–1.10) however many SE are held. That keeps late rewards meaningful where a linear stack would not.

**Realm Grinder.** Each gem gives +2% production, and upgrades raise gem power (search summary of the [PC Gamer guide](https://www.pcgamer.com/realm-grinder-guide/) and SuperCheats). Gems are kept, not spent. The gem formula is in §2.1.

**Trimps** (code: [config.js](https://github.com/Trimps/Trimps.github.io/blob/master/config.js), perks at about lines 2520–2995; [main.js](https://github.com/Trimps/Trimps.github.io/blob/master/main.js), `getPortalUpgradePrice`):
- **Ordinary perks.** The next level costs ⌈L/2 + priceBase·g^L⌉ helium, where g = 1.3 unless the perk sets its own growth (Capable uses 10).
- **"II" perks.** These are additive: level L costs priceBase + L·additiveInc.

Values from the code (`modifier` is the per-level effect field). The effect names follow each perk's name; I did not read the tooltips.

| Perk | Base price (He) | Modifier | Max |
|---|---|---|---|
| Power, Toughness, Looting | 1 | 0.05 (+5%) | – |
| Motivation | 2 | 0.05 | – |
| Pheromones / Packrat / Trumps | 3 | 0.1 / 0.2 / 1 | – |
| Agility / Bait / Range | 4 / 4 / 1 | 0.05 / 1 / 2 | 20 / – / 10 |
| Artisanistry / Carpentry | 15 / 25 | 0.05 / 0.1 | – |
| Meditation / Resilience | 75 / 100 | 1 / 0.1 | 7 / – |
| Anticipation | 1,000 | 0.02 | 10 |
| Resourceful / Siphonology / Coordinated | 50,000 / 100,000 / 150,000 | 0.05 / – / 0.98 | – / 3 / – |
| Overkill | 1,000,000 | – | 30 |
| Power II, Toughness II | 20,000 + 500·L | 0.01 | – |
| Motivation II | 50,000 + 1,000·L | 0.01 | – |
| Looting II, Carpentry II | 100,000 + 10,000·L | 0.0025 | – |

**[Inference] What the two cost laws do.**
- With ×1.3 prices, a +5%-per-level perk reaches level L ≈ log₁.₃(0.3·He). Doubling the helium spent adds only log 2/log 1.3 ≈ 2.6 levels (+13%). Power from these perks is logarithmic in helium.
- The II perks' total cost is quadratic in L, so their level grows like √(He/250) for Power II. That is a much gentler curve.
- So Trimps puts late helium surplus into slower-saturating sinks once the ×1.3 tier is unaffordable. It never relies on one held linear stack.
- I did not obtain the helium-per-zone formula.

**Kittens Game** (code: [game.js](https://github.com/nuclear-unicorn/kittensgame/blob/master/game.js), [js/prestige.js](https://github.com/nuclear-unicorn/kittensgame/blob/master/js/prestige.js), [js/village.js](https://github.com/nuclear-unicorn/kittensgame/blob/master/js/village.js)):
- **Karma kittens.** At reset the game adds 1 per kitten above 35, plus 3 more per kitten above 60, 4 above 100, 5 above 150, 10 above 300 and 15 above 750. The Anarchy challenge doubles the kittens counted.
- **Karma.** Each point adds one percentage point of happiness (`getHappinessFromKarma`). The game has a triangular-root helper, (√(1 + 8v/s) − 1)/2, the same shape as Realm Grinder's gems. I did not confirm that it is what converts karma kittens into karma.
- **Paragon.** Each reset pays kittens − 70.
  - Production: +1% per paragon (times a paragon ratio), passed through a limited diminishing-return function whose ceiling is 2 × ratio, so +200% at ratio 1. I did not read that function's body.
  - Storage: +10% per 100 paragon.
  - "Burned" paragon keeps separate production and storage terms.
- **[Inference]** The karma tiers make each extra kitten worth more, so the reward is convex in progress. The paragon cap bounds a held bonus: two devices Fantasy Idle's tokens lack.

**Exponential Idle** (search summary of the [wiki](https://exponential-idle.fandom.com/wiki/Instructions) and [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/YMMV/ExponentialIdle)):
- Prestige pays μ and supremacy pays ψ. Both are spent on upgrades: prestige upgrades boost the regular upgrades, and supremacy upgrades change the equation itself.
- Graduation comes later, then theories.
- No formulas were obtained.

**Developer comments.** The only one found is Hevipelle's interview on where Antimatter Dimensions' layers came from (A2.4). None turned up for AdCap, Cookie Clicker, Egg, Inc., Realm Grinder, Trimps or Kittens Game.

#### A1.3 [Inference] Five ways to use a prestige currency, and what each would do in Fantasy Idle

1. **Held, linear per unit**: Fantasy Idle, Realm Grinder, Cookie Clicker's levels, Egg, Inc.'s SE, Kittens' paragon (capped). With a since-reset reward, the gain per reset decays like 1/n (report §2.4, §8.3: +0.7% late).
2. **Spent on levels with exponential prices** (Trimps' ×1.3). Power becomes logarithmic in currency. Because helium income grows fast with depth, levels still rise steadily with progress, and every reset brings an allocation decision.
3. **Sacrifice** (AdCap's angel upgrades; Clicker Heroes' ancients are usually described the same way, not verified here). Spending lowers the held bonus, so each purchase is a ratio test.
4. **Dual counter** (Cookie Clicker). Earned 1:1: a held level plus a spendable balance. Every reset buys something, and nothing is sacrificed.
5. **A rare multiplier on the per-unit effect** (Egg, Inc.'s PE, ×1.05 compounding). It keeps late units proportional.

For Fantasy Idle (to test with §7 metrics #4 and #8):
- **(a) A dual counter.** Each token also adds a mark to a small perk list priced ×1.3–1.5 per level (Trimps) or additively (Trimps II). Late resets then still buy a visible level even when the held % barely moves. The price law sets the curve: ×1.3 gives log, additive gives √.
- **(b) A rare compounding unit,** for example ×1.05 to the token effect per new 25-stage record or dungeon unique. Records arrive more slowly over time, but each one multiplies the whole stock instead of adding 0.7%.
- **(c) Do not move the main token to Trimps-style spending.** With ×1.3 prices, power ∝ log(tokens) would make late resets weaker still.
- **For scale:** a first reset at best stage 100 pays ⌊19^1.5⌋ = 82 tokens (+41% ATK). At stage 200 it pays 243 (+121.5%).

### A2. The academic and long-form literature

#### A2.1 Alharthi et al., *Playing to Wait: A Taxonomy of Idle Games* (CHI 2018), read in full

[Accepted manuscript](https://par.nsf.gov/servlets/purl/10061230), DOI 10.1145/3173574.3174195.

**Method.**
- Grounded theory over 66 idle games (28 from Kongregate, 24 from Almost Idle, 14 more) and 10 non-idle controls.
- Two researchers played each game and rated interactivity and progress rate on 0–10 scales. The interactivity scale is taken from Purkiss & Khaliq.
- Agreement between raters: weighted κ = 0.70 for interactivity and 0.75 for progress rate.

**Definition.** All five must hold:
- most play happens in the background;
- waiting is playing, often through automation;
- temporal flexibility: little or no penalty for not returning;
- one instance is played over months or years;
- there is no game over.

**Taxonomy.**
- Incremental games split into four kinds:
  - micromanagement (Kittens, CivClicker: many resources, high interactivity, NG+ and slow progress);
  - single-resource (Cookie Clicker, Clicker Heroes: a higher progress rate);
  - derivative (generators of generators);
  - multiplayer.
- An interactivity spectrum runs from clicker through minimalist to zero-player (setup-only, AI play). Games move along it as they progress.

**Design implications that bear on balance** (paraphrased; italics are the paper's section names):
- *Playful idling*: actions cost resources that accumulate slowly but are spent in a few clicks, and costs rise with each purchase. The more one interacts in a session, the fewer options remain; the longer one stays away, the more options wait.
- *Rewarding players for waiting*: social games treat waiting as a penalty to be bought off; idle games make it part of play. Resets give in-game advantages, and the more resets, the faster later runs go. Returning bonuses add to this.
- *Against playbour*: repetitive clicking risks click fatigue. Idle games give more reward for less action as they progress.
- *Playing at planning*: experts interact less than novices, and play turns into planning.
- *Designing for cognitive offloading*: coming back costs memory. Queues let the player leave orders. Kittens' tooltips show how long until a resource covers a cost or fills its cap.
- *Shifting interaction levels*:
  - Timed boss fights that need manual clicks (Clicker Heroes, Tiny Tappers, Tap Adventure) frame clicking as a chance to show prowess. They do not undo the player's upgrades.
  - Short random events (golden cookies, Kittens' astronomical events) give bonuses without penalties. They signal that attention is welcome but not required.
- *Unlocking as usability support*: Trimps and Kittens reveal features gradually while always showing what the next upgrades are and how to get them.

**[Inference] For Fantasy Idle:**
- Full-rate offline replay matches temporal flexibility.
- Kittens' time-to-cost tooltips are the marginal-value tangent display proposed in §2.3: a tokens-per-hour readout.
- The boss timer fits the prowess framing.
- *Unlocking as usability support* backs DESIGN §3.22's rule to show the next rung.

#### A2.2 Fizek, *Interpassivity and the Joy of Delegated Play in Idle Games* (ToDiGRA 3(3), 2018, pp. 137–163)

[Article](https://todigra.org/index.php/todigra/article/view/1754), DOI 10.26503/todigra.v3i3.81. I read pp. 137–142 and 149–156.

- **Argument.** Idle games are interpassive media in Pfaller's and Žižek's sense: the pleasure of playing is delegated to the machine, as a video recorder watches a film for you.
- **Absence matters.** In other games the machine's idle activity while the player is away has no lasting effect (Galloway's "ambience acts"). An idle game is built around that activity, and what happens in the player's absence is permanent and significant: "the game will progress much slower, but it will not stop" (Fizek, p. 141).
- **Cookie Clicker auto-ethnography.** She hands production to buildings and returns to unlock upgrades, read statistics and browse achievements. The golden cookie draws her back to click alongside the automation. The resulting intermittent pattern makes the active moments a winding-up of a machine; she compares the player to a barrel-organ grinder.
- **[Inference]** Active moments should change the machine (buy, configure, reset, choose) rather than out-produce it. That supports the report's §7 #10 rule: no policy more than ~1.5× faster than the idle, sensible player.

#### A2.3 Purkiss & Khaliq (IEEE GEM 2015)

No open copy turned up. It is known here only through Alharthi et al.:
- It defines idle games as games that support leaving the game running by itself for long periods.
- It treats incremental, ambient and clicker as names for the same type, with zero-player games as a sub-type.
- It is the source of the 0–10 interactivity rating.

#### A2.4 Developers and industry

- **Antimatter Dimensions** ([interview with Hevipelle](https://www.incrementaldb.com/community/interview/31), undated; the page says over three years old):
  - Each piece came from another game and was pushed further: the polynomial growth from Derivative Clicker, multiple prestige layers from Realm Grinder, automation from Transport Defender, challenges from Idle Wizard.
  - He calls the opening a press-the-green-button stretch that the rest needs.
  - He was unhappy with Time Dilation just before the first Reality, which the Reality update sped up.
  - He describes a running community split between players wanting more idle play and players wanting more active play.
  - Balancing and performance were hard; the last Celestial was redesigned about four times.
- **Clicker Heroes 2.** Its Automator runs condition→action rules (for example, use a skill when energy is above a threshold). With enough rules the game mostly plays itself (search summary of [Pixelpoppers](https://pixelpoppers.com/2019/07/clicker-heroes-2-is-a-very-interesting-project/) and store pages). I found no Playsaurus design essay.
- **Idle Miner Tycoon (Kolibri)** ([PlaytestCloud case study](https://start.playtestcloud.com/case-studies/kolibri-games), search summary):
  - Long-term retention hinged on building the second mine shaft. Many players stalled before it because progress became slow.
  - A test of 7 players playing three 15-minute sessions two hours apart found the cause: players upgraded mines but neglected the elevator and warehouse, which became a bottleneck.
- **Not found:** postmortems or design essays by the makers of Trimps, Kittens Game, Exponential Idle or Melvor Idle. The Antimatter Dimensions history blog sits on Fandom (blocked).

#### A2.5 [Inference] What this means for balancing

- **Pacing.** Waiting is the play, so returning after a gap must leave the player richer, never punished. Offline at 100% is right; keep caps generous.
- **Walls.** The one industry case puts churn at a stall just before a key early milestone. It was found by testing returns two hours apart, so the simulator should model gapped sessions (§7 #12) as well as continuous play.
- **Resets.** The literature treats the advantage a reset gives as the reward for waiting. It gives no numbers beyond Pecorella's.
- **Automation.** It is a progression reward and a design space (Antimatter Dimensions, Clicker Heroes 2), and queues are a form of offloading (Alharthi).
- **Active play.** It should take the form of optional, penalty-free bonuses or timed fights that show off upgrades. Hevipelle's idle-versus-active split says to serve both camps without letting either dominate.

### A3. Walls and automated resets

#### A3.1 How long players tolerate a wall

- No published figure was found, again. The only evidence is the qualitative Kolibri case and the session benchmarks already in §4.1.
- **[Inference] A working budget, not a sourced number.** At about 5 sessions a day:
  - in the first week, no more than 2–3 sessions in a row without a visible step (a stage, a tier, a token gain the player can see);
  - after that, at most a day of play without one (§4.4).
  - Early walls are the costly ones.

#### A3.2 Automating resets: when and why

Facts:
- **Antimatter Dimensions.** Challenges unlock autobuyers, which are upgraded with infinity points. Maxing the Big Crunch autobuyer unlocks Break Infinity (search summary of a mirror of the game's [how-to page](https://raw.githack.com/jacorb90/IvarK.github.io/master/howto.html)). The reset autobuyer is earned, and upgrading it is the gate to the next layer. Hevipelle names Transport Defender as the source of the game's automation (A2.4).
- **Clicker Heroes 2** makes automation a programmable rule set (A2.4).
- **NGU Idle** penalises short rebirths (report §2.3).
- **Not verified:** Trimps' Auto Portal and any auto-prestige in Exponential Idle.

**[Inference] A rule for Fantasy Idle.**
- **When.** Automate a reset once the decision is routine and the player has made it by hand enough times to understand it: for example, after the 20th manual prestige, or once the median gain per reset falls below ~5%.
- **How.** Earn it (a milestone or challenge, as Antimatter Dimensions does), make it configurable, and make it visible:
  - condition: run ≥ N minutes and back at the best stage, or token gain ≥ X% of tokens held;
  - display: a tokens-per-hour readout.
- **Brakes.** Keep the 10-minute minimum, or §8.8's length factor.
- **Where.** It belongs in the battle dock (DESIGN §3.23).

### A4. Tap Titans 2 equipment

- **No primary source found.** The TT2-Sim repository whose 2017 server variables give `equipmentStageMin = 56` and `equipmentStageDelta = 20` has no equipment model ([repository](https://github.com/metxchris/TT2-Sim)).
- **What searches return** (search summary of a [BlueStacks guide](https://www.bluestacks.com/blog/game-guides/tap-titans-2/tt2-tips-tricks-en.html) and r/TapTitans2 mirrors):
  - an item's level follows the player's max stage when it drops;
  - equipment drops every 15 stages;
  - five pieces drop per prestige once past 80% of the max stage.
- **[Inference]** Level = 1 + ⌊(max stage − 56)/20⌋ would fit the two variable names. This is a guess; do not rely on it.

### A5. Kongregate's idle-math spreadsheets

- [kon.gg/idle-math-spreadsheets](https://kon.gg/idle-math-spreadsheets) redirects (302) to a Google Drive folder that asks for a Google sign-in. I did not sign in, so the files were not read.
- [Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii) describes them as Pecorella's own models, opened up for readers. Its "sheet 3a" is a very simple prestige system with a single generator. The long run in that article, which stalls from minute 120 until a ×16 multiplier at 500 generators, comes from these models.
- Parts I and II cover the cost/production and derivative-growth models (report §4.2).

### A6. Method and remaining gaps

- **Effort.** About 16 searches and 15 page reads, roughly 28 minutes.
- **Blocked.** Fandom (402), BreezeWiki (CAPTCHA) and Google Drive (sign-in).
- **Saving.** Code was read by streaming the public source through a text filter, and nothing was saved. The fetch tool itself cached the two open-access PDFs (the CHI and ToDiGRA papers) in the session's tool-results folder.
- **Still open:**
  - Exponential Idle's formulas;
  - Egg, Inc.'s base SE bonus and Soul Food cap;
  - Kittens' karma conversion and metaphysics prices;
  - Cookie Clicker's chips before version 2.0;
  - Trimps' helium-per-zone formula and Auto Portal;
  - Purkiss & Khaliq's text;
  - the TT2 equipment formula;
  - the spreadsheets themselves;
  - any figure for wall tolerance;
  - postmortems from the makers of Trimps, Kittens Game, Exponential Idle, Melvor Idle and Clicker Heroes.
