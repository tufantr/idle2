# 013: What food, defence and health do deep in the climb (measured 4 November 2026, 6ea4de0)

005 found that food doesn't beat skipping it by 150 hours, and left two things open: what food does in a run deep down, and what a
check-in player does. Measured here with the game's own tools, nothing changed in the code. The heroes are the simulator's, saved as
they first reach a mark (`tools/simulate.mjs --save-at`, seeds 1 and 2). Each number below is a fresh run from that save
(`tools/supplies.mjs --hours=3 --stall=30`). Live heroes will differ: they use Trials and talents the simulator's use less.

**In short:** past about stage 700 a fresh run stops dying. From there the only wall is the boss's clock, and only attack moves it. Food buys
nothing at stage 1,000, and a hero's defence has been past its cap since about stage 180. This falls short of what the owner asked for on 14
October ("food and potion should be crucial", DESIGN §3.28): true of potions at every depth, of food only early.

## What each supply buys in a run

Best stage of a fresh run, with deaths in brackets where they show what stops it. Seed 1 up to 300; the two seeds' range from 400.

| Hero saved at | Bare | Food | Potion | Both | What stops him |
|---|---|---|---|---|---|
| 60 | 40 | 40 | 60 | 60 | Blows and the clock; food turns falls into timeouts |
| 100 | 90 | 100 | 107 | 110 | Blows |
| 150 | 130 | 137 | 150 | 150 | Blows |
| 200 | 180 | 189 | 200 | 210 | Blows |
| 300 | 280 | 284 | 300 | 308 | Blows |
| 400 | 370–380 | 390 | 398–400 | 410 | Blows: 118–212 deaths bare, about 100 with food; 720–1,150 dishes a run |
| 700 | 650 | 660 | 700–710 | 700–710 | Both bare (40–50 deaths); with food only the clock (0 deaths, 80–380 dishes) |
| 1,000 | 940 | 940 | 1,000 | 1,000 | Only the clock: 0 deaths, bare or fed, and 0–2 dishes in a whole run |

## Why: a blow gets smaller as the hero goes down

`enemyDamage` (`src/core/formulas.js`) caps mitigation at 90%: a blow is at least a tenth of the monster's attack, whatever the defence. Defence stops counting
once it is nine times the monster's attack. At each hero's bare wall:

| Wall | His defence over the monster's attack | A blow, share of his health | A boss's blow |
|---|---|---|---|
| 90 | 3.6 | 6% | 14% |
| 130 | 5.5 | 23% | 54% |
| 180 | **13.7, past the cap** | 26% | 43% |
| 280 | 19.6 | 46% | 73% |
| 380 | 37 | 21% | 34% |
| 650 | 107 | 6% | 10% |
| 940 | 176–262 | 3–4% | 4–7% |

- **Defence:** from about stage 180 a hero has more than the cap can use, by 20 times or more at stage 1,000. Past that point defence from
  gear, the camp's Armour Rack, tokens, medals and talents does nothing against blows. Only health still counts.
- **Why blows shrink:** a hero's power keeps pace with monsters' health, which is what the clock asks. Past stage 700 monsters' health grows 3.5% a stage and their attack 3%
  (`denseHpGrowth`, `denseAtkGrowth`), so a blow loses about half a percent of his health a stage, for good. The steepest stretch for blows is stages 150 to 400, and the wall leaves after it.
- **Live players:** 7 of the 16 active stand past stage 1,000, so for them this is today's game. `tools/ledger.mjs` agrees from the other side: a saved hero's armour is worth 2.5 stages at
  the boss against the weapon's 23.6.

## Over a whole game

Twelve seeds; medians, P10–P90 in brackets; twelve-seed medians move about 5% (`batch-noise`).

| Player | With food | No food (`POLICY.foodStock:0`) |
|---|---|---|
| Always on, Trials, Pacts, Charms, one Ascension, 300 hours | 1,450 (1,420–1,470), 1,926 deaths | 1,440 (1,420–1,460), 2,940 deaths |
| Three short visits a day with Auto, 336 hours | 580 (509–710), 16,248 deaths | 620 (470–710), 16,516 deaths |

Food makes no measurable difference to the best stage for either. The visiting bot settles nothing about food: it fights 6% of the time.

## If monsters' attack kept pace with their health

`--set=BALANCE.enemy.denseAtkGrowth:1.035` (from 1.03), so blows stop shrinking past stage 700.

| Fresh run of a hero saved at 1,000 | Bare | Food | Potion | Both |
|---|---|---|---|---|
| Today | 940 | 940 | 1,000 | 1,000 |
| 1.035 | 910–930 | 940 | 970–980 | 990–1,000 |
| 1.04 | 880–890 | 910–922 | 930–940 | 954–973 |

- **At 1.035 a supplied hero loses nothing** and a bare one 10–30 stages, and food comes back as about half of a potion's worth, at 1,500–2,400 dishes a run. At 1.04 even a supplied hero loses 30–45 stages, so that is too far for a single step.
- **Over a whole game**, always on for 300 hours: best stage 1,665 (1,630–1,680) with food and 1,645 (1,610–1,660) without, so food is worth about 20 stages, at the edge of the noise. Deaths 4,417 and 5,952, against 1,926 today.
- **The climb went up by 15%**, from 1,450 to 1,665. Harder monsters don't help; the bot behaves differently. It spends 41% of its time in the fight against 64%, 19% in dungeons against 7% and 15.5% on farms against 6%, and makes 332 prestiges against 269 and 445,000 kills against 299,000. My reading: today's bot times out again and again against a boss it can't fell, and blows that hurt send it to do something better. That says more about the bot's patience than about the balance, so don't rely on this number until it's checked (in the queue, `POLICY.stallMin`). A real player at a clock wall may lose time the same way.

## Why the bot climbed further under harder blows (measured 11 November)

The bot's patience isn't it. With `POLICY.stallMin:10;POLICY.longStallMin:30` (it gives up on a stalled run twice as fast), 12 seeds over the same 300 hours
made 1,200 prestiges against 269 and reached 1,020 (918–1,100) against 1,450. What the 1.035 runs gained was records: 173 against 154, with 19% of their time in
dungeons against 7%. Nineteen records are ×2.5 on what the tokens give (×1.05 each), which is the 15%. So at a clock wall, dungeon time pays more than waiting at
the wall, and the bot only leaves the wall when blows push it out. Whether a live player gains the same is in the queue (dungeons against the clock wall).

## What this doesn't settle

- **Live heroes.** The benches use two simulated heroes. A live save through `tools/supplies.mjs` needs the owner's OK each time.
- **Trials.** Not measured. A rule like Faithless takes the tokens' defence and health away, so food and defence may still count there; `tools/trials.mjs` has no supply mode.
- **Dungeons, the Titan and the clan boss.** Not measured. They keep their own multipliers (`bossAtkMult`).

## Proposals from this file

**A second wall past stage 700** (Change; P-023). The owner's call on what the deep game should be. Three ways, none tried on real saves:

1. **Monsters' attack keeps pace** (`denseAtkGrowth` 1.035, S to change, M with balance runs). For a hero at stage 1,000, survival returns at the wall, a supplied hero loses nothing, and food is worth about half a potion. Costs: 1,500–2,400 dishes a run and twice the deaths, and **it can't be done to a live game**. The easing from stage 400 moves too, so monsters would hit ×2.1 harder at 700, ×6.6 at 940, ×38 at 1,300, ×1,124 at 2,000 and ×9,461 at 2,440 (`enemyBaseStats`; corrected 11 November, from 015, which first said about ×3 at 940). Every live hero past about stage 1,300 would be felled at once. A survival wall deep would need a rule tied to the hero, not a change in growth.
2. **Dishes that also give a bonus in the fight** (Melvor's perfect cooks are the nearest; S–M, with balance runs). Food then pays at the clock wall without touching monsters, and it mustn't rival potions.
3. **Leave it, and say so.** The deep climb is an attack race and potions carry it; food is for the first 700 stages. Then the Cooking card's "?" should say so, so nobody cooks for nothing.

**Defence past its cap** goes to the next round's look at builds (015): what talents, affixes and the camp's Armour Rack still do at the depths where players stand.
