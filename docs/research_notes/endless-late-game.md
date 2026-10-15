# The endless climb: what moves the best stage, why it stops near 700, and how to make it go on

*Research, 15 October 2026, for the owner's ask: "Things put max stage further too little; dropping weapons,
upgrading them, skill level boosts, etc. A player feels the power by progressing further than the previous
version. Tell me how much each factor contributes to pushing max stage forward, and what your understanding
of the late game is. It should be pretty much endless: players should be able to push thousands of levels
while still finding upgrades, and new upgrades push them even further."*

**Built since** (DESIGN §3.30): the first part of §5's package, with the deep stages eased over 400–700 instead
of at once (the burst in hours 100–150 smoothed); 7 players with Auto reach stage 1,000 at hour 281 and 1,830 at
hour 1,200, still climbing. Gear (a forge without a cap, Mythic) and the deep's Lords and strata are next.

**How to read it.** A sentence with a link is from that source. **[Inference]** is my own reasoning or
arithmetic. Fantasy Idle numbers come from the code at commit 627f21e and from simulator runs made for this
note (§6): 7 players with Auto on, 1,200 hours each, and `tools/ledger.mjs`, written for it: the *power ledger*
(what each source multiplies a hero's attack, defence and health by, in stages) and, with `--flow`, where each
100 stages of a climb came from. It builds on `incremental-math.md` (the gap model, §8) and `robust-and-fun/B_longterm_motivation.md`.

---

## Summary

1. **One doubling of power is worth 8.5 to 12.5 stages, and most bonuses are a few percent.** Monsters get
   6.5–8.5% tougher every stage, so a +5% upgrade is about half a stage, a new weapon from one Abyss depth
   deeper about 3–4, a whole +10 set about 5–6, a record 0.6–0.8, a Knight level 0.1 (§1).
2. **Only two things grow with the climb: deeper gear (about 60–65% of every 100 stages past stage 200) and
   tokens with their records and Stars (35–40%).** Everything else is fixed or capped: the camp (worth 15
   stages), the potion (14), combat levels, perks, medals, Titans, pets, agility and dungeon milestones (a few
   stages together, and nothing more after stage 200). The percent bonuses also share one pool (+360% of attack
   at stage 300, +600% at 600), so each new one is diluted (§1.4).
3. **The late game stops near stage 700.** With Auto on and never stopping: stage 490 at 200 h, 640 at 500 h,
   690 at 1,000 h, 700 at 1,200 h. 100→200 stages took 33 h, then 56, 85, 141, and 600→700 about 700 h (§2.1).
4. **Why:** deeper gear covers only 46% (Abyss) to 59% (past 400) of the monsters' growth; tokens must cover the
   rest, but they pile up at a steady rate while each 100 stages needs about 7× more of them. Each prestige
   adds less (+0.7% late), Ascension stops paying after its fourth time, and runs reach their wall minutes
   after a prestige. Content ends at stage 500 (the last stratum) and the numbers at about 10,000 (§2.2–2.3).
5. **Every endless game I found does the same thing: what the player earns grows almost as fast as the
   monsters** (Clicker Heroes' gold ×1.15 a zone against monster HP ×1.145; Trimps' gear covering ~2/3 of enemy
   growth plus a second per-zone source; Tap Titans 2's gear scaling ×10⁴¹ with depth), so a run climbs a slope
   rather than hitting a wall, prestige pays in proportion to how deep you went, upgrade levels have no cap
   (prices that grow instead), and new quality tiers open at depth milestones (§3).
6. **Recommendation [Inference]** (§5, measured in §4): denser deep stages (a doubling worth 20+ stages); a
   small permanent bonus per prestige (Legacy); a sink without a cap priced in plain gold, so a deeper hero
   affords more (the camp past 25, or a slot-bound forge); gear that keeps dropping better (Mythic and Primal at
   depth milestones, frontier drops on each prestige run, "+N stages" on every card); records on a grid and
   endless strata past 500. Measured, the first three together keep the first 50 hours near today, reach stage
   1,000 at ~220 hours and 2,000 at ~1,180, and still climb at 1,200 hours.

---

## 1. What pushes the best stage today, and by how much

### 1.1 The exchange rate

Past stage ~170 a hero's wall is one of two checks:

- **the boss's clock**: fell a boss in 30 s, which takes attack. Boss health grows like the monsters' health;
- **the blow**: live through the biggest blow, which takes defence and health together. A blow grows with the
  square of the monster's attack (`attack²/(attack + defence)`), so survival needs defence × health to grow
  with attack².

| Stages | Monster health / attack per stage | ×2 attack buys (boss) | ×2 defence and health buys (blow) |
|---|---|---|---|
| 1–100 | ×1.075 / ×1.065 | 9.6 stages | 11.0 |
| 101–400 (the Abyss) | ×1.085 / ×1.075 | 8.5 | 9.6 |
| 401+ (the deep Abyss) | ×1.065 / ×1.057 | 11.0 | 12.5 |

That is the immediate effect. Because gear dropped deeper is stronger, a lasting bonus is worth more once
the hero has farmed the deeper gear it opens: ln(bonus)/gap stages, where the gap is the monsters' growth
minus what going deeper gives by itself (`incremental-math.md` §8.2). With drops ×1.45 a depth the gap is
0.044 a stage in the Abyss and 0.026 past 400, so **×2 is worth 8.5–11 stages at once and 16–27 in the end**.

### 1.2 The stage budget of a hero at his wall

The power ledger, averaged over 7 simulated heroes saved as they reached each mark: what each source
multiplies, as stages at the boss's clock / at the blow (the hero after a prestige, perks spent, the camp
full, Combat Potion III).

| Best stage | Gear (all) | of which weapon | of which armour | Tokens with records | of which records | Camp | Potion | Combat level | Perks | Medals | Titans | Others |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 200 | 90 / 69 | 13 / 0 | 2 / 19 | 60 / 63 | 12 / 14 | 15 / 15 | 14 / 15 | 3 / 9 | 3 / 0 | 2 / 3 | 1 / 1 | ~1 |
| 300 | 147 / 126 | 13 / 0 | 2 / 31 | 94 / 101 | 33 / 37 | 15 / 15 | 14 / 15 | 3 / 3 | 3 / 3 | 2 / 3 | 1 / 1 | ~1 |
| 400 | 196 / 182 | 12 / 0 | 2 / 31 | 137 / 150 | 46 / 52 | 15 / 15 | 14 / 15 | 3 / 3 | 3 / 3 | 2 / 3 | 2 / 2 | ~1 |
| 500 | 317 / 308 | 15 / 0 | 3 / 38 | 211 / 233 | 64 / 72 | 19 / 20 | 17 / 20 | 4 / 4 | 4 / 4 | 3 / 4 | 3 / 3 | ~2 |
| 600 | 381 / 378 | 17 / 0 | 2 / 36 | 243 / 269 | 67 / 77 | 19 / 20 | 17 / 20 | 3 / 4 | 6 / 5 | 2 / 3 | 3 / 2 | ~1 |

(Gear's defence is counted from one point, so its row is large by construction; the comparison that matters
is how the rows *grow*, in §1.3. "Others" is pets, agility and dungeon milestones together.)

The owner's own hero (the save of 14 October, best 177): gear 84 / 64 (weapon 11, armour 13, jewellery 5,
upgrade levels 0: none of it was ever reinforced), tokens 58 / 61 (records 11 / 13), camp 15, potion 14,
combat level 4 / 11, perks 4 / 1, medals 2 / 3, Titans 0.4, pets 0, agility 0.

### 1.3 Where each 100 stages came from

The flow: for each simulated hero, how much each source grew between two marks, in stages.

| Climb | Hours | Gear | Tokens (with records and Stars) | of which records | Everything else |
|---|---|---|---|---|---|
| 200 → 300 | 33 | 56 / 56 | 34 / 38 | 21 / 23 | ~0 |
| 300 → 400 | 56 | 49 / 56 | 43 / 49 | 13 / 15 | ~0.5 |
| 400 → 500 | 85 | 63 / 70 | 33 / 38 | 4 / 4 | ~0.5 |
| 500 → 600 | 141 | 63 / 71 | 33 / 38 | 4 / 4 | ~2 (perks) |
| 600 → 700 | ~700 | 64 / 72 | 32 / 37 | 3 / 4 | ~2 (perks) |

**Past stage 200, the climb is deeper gear and tokens. Nothing else moves.** The camp and the potion are worth
15 stages each, but the same 15 at every depth; combat level stops at 99; perks, medals and Titans add a few
percent into a pool that is already +360–600%; pets and agility add nothing measurable.

### 1.4 What one upgrade is worth

At once (with today's gear), at stage ~250 / ~600 [Inference, from §1.1 and the ledger]:

| Upgrade | What it multiplies | Stages |
|---|---|---|
| +1 reinforce on the weapon (+5% of its base) | attack ×1.03 | 0.35 / 0.45 |
| +10 on every piece (the cap) | everything ×1.5 | 5 / 6.5 |
| A weapon from one depth deeper (×1.45) | attack ×1.27 | 2.9 / 3.8 |
| A legendary weapon for a rare one, same depth (×1.87) | attack ×1.5 | 5 / 6.4 |
| A whole set from one depth deeper | everything ×1.45 | 4.6 / 5.9 |
| One record (25 stages, 50 skill levels, a unique, a Trial tier, a laurel) | tokens' power ×1.05 | 0.6 / 0.8 |
| One prestige at the wall, late (+1–2% tokens) | tokens' power ×1.02 | 0.2 / 0.3 |
| One Knight level (+4% into a +360–600% pool) | attack ×1.006–1.009 | 0.1 / 0.1 |
| One combat level (+1.2% into the pool) | ×1.003 | 0.03 |
| One Titan (+2% attack and health into the pools) | ×1.003–1.005 | 0.05 |
| The camp, full (each run) | ×3.4 / ×3.4 / ×2.7 | 15 / 19 |
| Combat Potion III | ×3 | 14 / 17 |

**So the feeling is right: almost every upgrade is under one stage, and the biggest (a deeper weapon, a
legendary) are 3–6.** The literature's rule of thumb is that a regular big step should carry 80–90% of the
stages it took to earn it ([the math-of-idle-games research below](#3-how-other-games-stay-endless)); a depth of
gear carries about 46–59%.

### 1.5 Why most bonuses feel small: one shared pool

Every "+x% attack" (combat level, Knight, Paragon, medals, Titans, pets, capes, dungeon milestones, agility)
adds into one percentage that then multiplies (DESIGN §4, rule 1). At stage 300 that pool is +362% attack,
+196% defence and +203% health; at 600, +597%, +270% and +390%. A Knight level's +4% is then +0.6–0.9% of
attack. Multiplying layers (camp, potion, tokens, records) are not diluted, which is why they show in the
ledger and the pool's sources don't.

---

## 2. The late game today

### 2.1 The climb to 1,200 hours

Median of 7 simulated players with Auto on, playing without a break (an engaged player banks 20–24 game hours
a day, so 1,000 h is about 6–7 weeks: `B_longterm_motivation.md`):

| Hours | 50 | 100 | 150 | 200 | 300 | 400 | 500 | 600 | 800 | 1,000 | 1,200 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Best stage | 260 | 370 | 460 | 490 | 570 | 610 | 640 | 650 | 680 | 690 | 700 |

Hours to reach 300: 61; 400: 121; 500: 204; 600: 339; 700: about 1,040 (3 of 7 got there by 1,200 h).
The last 100 stages took 5× as long as the 100 before. In the last 200 hours the median gained 10 stages.

### 2.2 Why it stops

- **Gear covers about half of what each stage asks.** Drops grow ×1.45 a depth (10 stages); monsters grow
  ×2.26 (Abyss) or ×1.88 (past 400). In log terms gear covers 46% and 59%.
- **Tokens must cover the rest, and they grow linearly while the need grows exponentially.** A prestige pays
  ((best − 5)/5)^1.5 tokens × the Stars' gain. Held tokens are a sum, so each prestige adds less: the median
  late prestige adds 0.7% (`incremental-math.md` §8.3). To climb 100 stages past 600 the token layer must grow
  about ×7, and at ~37,000 tokens a prestige that is ~2,100 prestiges: about 700 hours.
- **Ascension stops paying.** Stars are 10 per tenfold of the tokens given up; each makes every prestige pay
  +25%. The bot ascends while that would raise the token gain ×1.5 or more. After the fourth Ascension (~97
  Stars, near stage 500) it never would again: Stars grow with the logarithm of tokens, so the Stars layer is
  logarithmic too.
- **Records slow down.** One every 25 stages, plus skills, uniques, Trial tiers and laurels: about 4–5 per 100
  stages past 400, each ×1.05 on the tokens (about 4 stages per 100).
- **Runs reach their wall in minutes.** After a prestige the run climbs from 10% of the best to the wall
  quickly; the camp is full on the way. Nothing inside a run keeps growing, so the run waits at the wall until
  the next prestige.

### 2.3 What ends

- **Content:** 16 named strata end at stage 500 (Pandemonium is the last and goes on forever). Ranks end by
  ~160 h. The roadmap already lists "something to reach past stage 500".
- **Numbers:** monster health passes the largest JavaScript number (1.8×10³⁰⁸) a little past stage 10,000
  (`MAX_STAGE`), sooner if the growth stays at the Abyss's 8.5%.

### 2.4 The model in one line [Inference]

Stages per hour ≈ (relative growth of power per hour from things that don't depend on depth) ÷ (the gap).
Today that growth is tokens, about 1/t (it falls as play goes on), and the gap past 400 is 0.026 a stage. Two
things make a game endless and every upgrade a push: **a small gap** (each bonus buys many stages) and **growth
that doesn't fade** (the pace holds).

---

## 3. How other games stay endless

Four research passes (clicker stage-pushers, idle RPGs with gear, ARPG endgames, the design literature). The
numbers are from the cited pages; "derived" ones are arithmetic on them.

**Clicker Heroes.** Monster HP ×1.145 a zone from zone 140 to 500, then rising by 0.001 every 500 zones
([wiki: Formulas](https://clickerheroes.fandom.com/wiki/Formulas)). Gold grows ×1.15 a zone and hero DPS grows
as about gold^0.82, so in-run power keeps nearly level with the monsters: a run slows over ~100 zones instead
of stopping. Heroes cost ×1.07 a level with ×4 every 25 levels; a new, far stronger hero is always somewhere
deeper (1e40 … 1e142,200 gold) ([Heroes, Gilds](https://clickerheroes.fandom.com/wiki/Gilds)). Prestige (Hero
Souls) grows exponentially with the record zone after Transcendence (∝ (1 + 0.25)^(zone/5)); Ancients have no
cap; Transcendence adds a logarithmic layer (Ancient Souls = 5·log10 of souls). A gild every 10 new zones. The
community's soft cap is ~5.5 million zones.

**Tap Titans 2.** Equipment drops on the first kill of a boss every 20 stages, its level following the max
stage; depth dominates rarity (an all-damage weapon goes ×2.6 → ×1.7×10⁴¹ from level 54 to 90,424; Mythic is
~4× Legendary) ([EquipmentInfo.csv](https://s3.amazonaws.com/tt2-static/info_files/3.2/EquipmentInfo.csv)).
103 artifacts with costs from 1 to 1.35×10⁶⁹ relics, most uncapped. A skill point per 50 new stages. The
stage cap was raised by patches (35k → 75k in a year), now 180k with 100-day seasons beyond.

**Trimps.** Enemy HP ~×2 a zone. Prestige books drop every 5 zones forever; each multiplies a piece's stat ~×10
for a price ×25–45: gear covers ~2/3 of enemy growth, a per-zone Coordination book much of the rest
([main.js](https://github.com/Trimps/Trimps.github.io/blob/master/main.js)). Heirlooms' rarity odds step up at
zone breakpoints; upgrades past the roll's max cost ×1.5 a step (Common) down to ×1.013 (Mutated): soft caps,
no ceiling. A Spire every 100 zones.

**NGU Idle.** The ITOPOD, an endless tower: each floor ×1.05, so ×2 power is ~14 floors; boosts and perk points
scale in 50-floor tiers ([wiki](https://ngu-idle.fandom.com/wiki/ITOPOD)). Items level by merging duplicates.

**Idle Champions.** Gear levels are uncapped (+0.4% each; duplicates add levels). The legendary forge doubles an
effect per level, each level needing five more orders of magnitude of Favor: a steady ×2 per step of progress
([Forge](https://idlechampions.fandom.com/wiki/Forge)).

**Firestone Idle RPG.** Enchant levels (~×2 each) **belong to the slot** and carry over to a better item;
rarity raises the enchant cap from 2 to 16.

**Melvor Idle.** Not endless: when content ends it rescales into a new realm (Into the Abyss: a new damage
type, Abyssal levels to 60, monster levels to 42,989) rather than inflating numbers.

**Diablo III / IV.** Greater Rifts and the Pit grow ~17% a tier, so ×2 is only 4–8 tiers; both stop at 150.
Above legendary: Ancient (~10%, up to +30%) and Primal (perfect rolls, only after a GR70 clear, ~1 in 400).
Legendary gems and Paragon glyphs rank up only by clearing tiers about 10 above their rank, so every new record
funds the next upgrade ([Maxroll](https://maxroll.gg/d3/resources/legendary-gem-mechanics)).

**Last Epoch.** Monolith corruption is endless and roughly *linear* (+60% enemy health and damage at 100,
+505% at 500), so ×2 power roughly doubles the corruption you can face: the only ARPG ladder where "thousands
deep, each upgrade felt" holds by itself ([1.0 notes](https://devtrackers.gg/last-epoch/p/72ec740b-last-epoch-1-0-patch-notes)).

**The design literature** (Pecorella's "Math of Idle Games" and GDC talks, Antimatter Dimensions, break_infinity).
Infinite upgrades with geometric costs turn a currency C into power C^(ln m/ln c); prestige yield is a root or a
log of something that grows exponentially with depth; players reset when it would pay +50–200%; nest prestige
layers; plan numbers past 1e308 early ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii),
[GDC 2016](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507),
[break_infinity.js](https://github.com/Patashu/break_infinity.js)).

**What they share:**

1. **Earnings grow almost as fast as the monsters**: the gap is a few percent a stage, so ×2 buys tens of
   stages and a run ends in a slow creep, not a wall.
2. **Gear power follows depth** and covers a fixed share of enemy growth (Trimps ~2/3, TT2 most of it); rarity
   is a constant factor on top.
3. **No hard caps: prices that grow instead** (Ancients, artifacts, heirlooms, gear levels).
4. **The investment stays when the item changes** (Firestone's slot enchants, Trimps, Idle Champions'
   duplicates, Clicker Heroes' movable gilds).
5. **Prestige pays in proportion to depth** (exponential in the record, then a logarithmic outer layer).
6. **New quality tiers and ranks open at depth milestones** (Primal after GR70, the +10 rule for gems and
   glyphs, Trimps' heirloom breakpoints, TT2's Mythic crafting at stage 2,000).
7. **Records on a grid** (a gild every 10 zones, a skill point every 50 stages, gear from first boss kills).
8. **Labelled steps in difficulty** (Clicker Heroes every 500 zones, D4 after tier 110), each answered by a new
   system, and **the ceiling moves with content** (TT2's cap, seasons).

---

## 4. Experiments

Seven simulated players, Auto on, 1,200 hours each; the median best stage (and hours to reach a stage).

| Experiment | 50 h | 100 h | 300 h | 600 h | 1,000 h | 1,200 h | Stage 1,000 at | 2,000 at |
|---|---|---|---|---|---|---|---|---|
| Today's game | 260 | 370 | 570 | 650 | 690 | 690 | never | never |
| Camp without a cap, priced as today (in kills at the best stage) | 270 | 370 | 580 | 650 | 690 | 700 | never | never |
| 1. Denser stages from 400 | 260 | 370 | 780 | 920 | 990 | 990 | 938 h | never |
| 1 + 2. Legacy, ×1.002 a prestige | 280 | 400 | 910 | 1,160 | 1,290 | 1,410 | 374 h | never |
| 1 + gold camp (no cap, plain gold, ×1.36 a level) | 520 | 1,110 | 1,880 | 2,040 | 2,240 | 2,330 | 89 h | 406 h |
| 1 + 2 + gold camp at ×1.36 | 560 | 1,160 | 2,040 | 2,280 | 2,700 | 2,820 | 78 h | 278 h |
| **1 + 2 + 3: camp past 25 in plain gold at ×1.6 a level (recommended)** | **290** | **440** | **1,210** | **1,590** | **1,820** | **1,990** | **221 h** | **1,181 h** |

- **Denser stages:** `deepHpGrowth` 1.035 and `deepAtkGrowth` 1.03 from stage 400 (today 1.065 and 1.057), drops
  ×1.225 a depth past depth 30 (today ×1.45), the same proportions. It stretches every stage count past 400
  ×1.85 (a doubling of power: 20 stages at once instead of 11) and keeps monster health in range to about stage
  19,500. It does not change the plateau's shape.
- **The camp priced as today does nothing without its cap:** its price follows the gold of the best stage, so a
  run buys only a few more levels whatever the depth.
- **Legacy** gives the late game a steady growth the token sum cannot: +120 stages in the last 200 hours, where
  the game today gains none.
- **A sink priced in plain gold** makes the wall a slope, because a deeper hero earns more gold and affords more
  levels (gold grows with monster health). At ×1.36 a level it runs away from the first hours (stage 520 at
  50 h, double today). Past the 25 levels at ×1.6 a level it leaves the first 50 hours near today (290 against
  260) and gives a burst around hour 100–150 (440 → 780) that wants smoothing when it is built.

---

## 5. Solutions and suggestions [Inference]

### 5.1 Targets

- A doubling of power worth **20+ stages at once** past 400 (today 11), a legendary or a full +10 set about 12.
- **The climb never stops:** still moving at 1,200 hours (today it gains nothing in the last 200).
- **Stage 1,000 within ~300 hours and 2,000 within ~1,200** (about two months of real play); today never.
- **Every prestige a felt step** (a permanent bonus shown on its card), and **an upgrade always findable**.
- Numbers safe far past stage 10,000.

### 5.2 The changes, in order of effect

1. **Denser deep stages** (measured): from stage 400, monsters ×1.035 health and ×1.03 attack a stage; drops ×1.225
   a depth. No live player is past 300, so nobody loses anything. Every bonus is worth ×1.85 more stages there.
2. **Legacy** (measured): every prestige ever made, ×1.002 to attack, defence and health for good, with its total
   on the prestige card. The token sum's growth fades as 1/t; this does not. Alternatively (or as well) pay Stars
   by the best stage at Ascension instead of by the logarithm of tokens, so the outer layer keeps paying.
3. **A sink priced in plain gold** (measured as the camp past 25 at ×1.6 a level): a deeper hero earns more and
   affords more, so a run keeps climbing past the old wall. Its price growth is the strength knob. Only one such
   sink should carry this (two would run away), so choose between the camp (per run) and the forge (proposal 4,
   for good).
4. **Forging without a cap, bound to the slot** (Firestone, Trimps): reinforcing past +10 at prices that grow
   instead of a stop; the levels stay with the slot, so a better piece inherits them (a refit loses one today),
   and salvaged drops feed it. If it is priced in plain gold it can be the sink of proposal 3.
5. **Better gear always somewhere deeper:**
   - quality above legendary at depth milestones: Mythic (×4 a common) from stage 500, Primal (perfect rolls and one
     more bonus) from 1,000, rare as Diablo's (about 1 drop in 400);
   - a prestige run's first bosses drop at 90% of the best stage's depth instead of their own (Tap Titans 2 seeds
     frontier drops on each prestige), so every run has a real chance at an upgrade;
   - every item card and ▲ Equip shows "+N stages" (the exchange rate of §1.1).
6. **Records on a grid and a place past 500:** a Lord every 100 stages with a sure top-quality drop; endless strata
   past Pandemonium (generated names and tints, a painting every few); a labelled step every 500 stages answered by
   something new (Mythic at 500, Primal at 1,000, a new perk at 1,500).
7. **Bonuses that multiply instead of diluting:** Knight, Warlord and Paragon ×1.04 / ×1.01 a level rather than
   adding into the shared pool; late Titans and medals the same. Skill levels keep counting toward records (worth
   1.4 stages each with denser stages).
8. **Numbers past 10³⁰⁸:** denser stages reach about stage 19,500 before monster health overflows; past that a
   log-scale number type for monster health and damage (break_infinity.js does this for Antimatter Dimensions).

### 5.3 Suggested order

- **First, balance:** 1, 2 and 3 as one change, simulated and tuned (the camp's price growth and the hour-100
  burst), then shipped. Nothing changes below stage 400.
- **Second, gear:** 4 and 5.
- **Third, the deep:** 6, 7 and 8.

---

## 6. Method

- Code: commit 627f21e (the gear and drop work of 15 October included). Simulator: `tools/simulate.mjs --auto
  --hours=1200`, seeds 1–7, saving each hero as it first reached 200, 300 … 1,500
  (`--save-at`).
- The ledger (`node tools/ledger.mjs <save.json>`): each hero after a prestige, Knight and Warlord to 25, Rogue to
  15, the rest into Paragon, the camp full, Combat Potion III; each source's share is the hero's attack, defence
  and health with it over without it.
  Stages: ln(attack share)/ln(health growth) at the boss, ln(defence share × health share)/(2 ln attack growth)
  at the blow, at the growth of the hero's best stage.
- The flow (`node tools/ledger.mjs --flow <dir>`): the same, between two marks of the same hero, at the deeper mark's
  growth.
- Experiments: a scratch copy (not in the repository) with settable deep drop growth (`BALANCE.abyss.deepDropFrom`,
  `deepDropGrowth`), a per-prestige bonus (`BASE.legacyPerPrestige`, multiplying attack, defence and health by
  (1 + it)^prestiges), kill-free camp prices (`CAMP_UPGRADES[i].priceKills`) and a plain-gold price past a level
  (`capFree`, `overBase`, `overGrowth`), run with `tools/batch.mjs --seeds=7 --hours=1200 --auto --set=…`.
- External research: four passes over wikis, game data files, patch notes, developer posts and the design
  literature, October 2026. Fandom pages were read in a browser; Reddit was unreachable (some Tap Titans 2 dates
  are from search snippets).
