# 032: Trials and dungeons at the hero's frontier, measured (11 November 2026)

The queue's measurements from 013, 015 and 017, with the game's own tools and scratch scripts on a copy of the simulator. Nothing in the repository changed; no
live saves (each needs the owner's OK).

**In short:** deep, the simulator's bot goes into a dungeon only after a death: its stall test can't fire while it fights, so each run waits out an hour at its
wall. Spending 25 minutes of that hour in a dungeon instead (a rule added to the copy) took it from 1,450 to 1,680 by 300 hours (+190 to +270, 12 seeds paired),
with five Seals against two; 50 minutes gave +170, 12 or 110 minutes +10 to +110, and `POLICY.dungeonMin` alone cost 60–170. Past stage 1,000 nothing fells the
hero but Glass Hero's rule and Fasting's lack of healing: no Trial, dungeon or Titan of his own makes him eat, and defence ×0.1 to ×10 or health ×2 changed no
stage reached anywhere. The Blade wins or ties in all eight Trials at every depth; only Brutes has a second build as good. The economy talents never reach the
bot within about 2,100 hours, so with or without them is one game; alone each adds 0 to 2.5 stages to a run, and Second Chance costs a gate.

## What I ran

- **Heroes:** `node tools/simulate.mjs --hours=1500 --seed=1|2 --trials=5 --pacts --charms --ascend=1 --save-at=700,850,1000,1250,1500,1750,2000`: 14 heroes,
  saved as each first reached the mark (700 at 107–112 h, 1,000 at 161–175 h, 1,500 at 321 h, 2,000 at 831–847 h). "The eight heroes" are 700 to 2,000.
- **The copy:** `simulate.mjs` without its `git` call, writing the bot's time by task at each mark, counting what sends it off the wall, with one new policy
  (`POLICY.wallDungeon`). Its seed 1 at 300 h matches 013's batch exactly (best 1,460, 310 prestiges, 7,992,339 tokens): that batch is the baseline.
- **Benches:** fresh runs as `tools/trials.mjs` makes them (a prestige, the fight until 30 min without a new best or 3 h, the camp bought), 500 of his best dish and
  potion unless said; `tools/ledger.mjs`. **Batches:** `tools/batch.mjs --hours=300 --trials=5 --pacts --charms --ascend=1 --set=...`, at most three jobs.

## 1. Dungeons against the clock wall

**What the bot does deep.** The always-on bot goes into a dungeon only after a death, and past stage 700 it rarely dies. Its stall test (15 minutes without a new
best: `tools/simulate.mjs:554`, `:954`) can't fire while it fights: it re-decides every 10 minutes (`:966`), decides to fight on, and starting that fight resets
the clock (`apply`, `:745`). On the copy the test fired 0 times in all 31 runs that counted it; deaths sent the bot off 143 to 421 times a run. So a deep run
waits out its 60-minute long stall at the wall, then prestiges. From 700 to 1,750 the two heroes spent 10.6 and 11.1 of about 385 hours in dungeons (3%,
against 16% of their first 110 hours), with 75 and 70 deaths; the open tier's deepest boss stood 110 stages below them at 700, 610 at 1,500, 510 at 2,000.

**One hour, from the moment he reached a mark** (seeds 1 and 2): his run fought on to the wall (30 min without a new best), then an hour at the stages or in the
bot's dungeon pick (the deepest it clears comfortably that still owes clears or its unique); then the bot's spending, a prestige, and his attack at the new run's
start (the ledger's camp and potion, the same for both), compared in stages at the boss.

| Mark | An hour at the wall: best stage | An hour in the dungeon: clears, milestones | Dungeon over wall | The next Seal: worth, clears left |
|---|---|---|---|---|
| 700 | +10, +10 | 313–314, 4 | +0.2, −7.8 (his new piece: gear ×1.28) | 3.0–3.1 stages; 646–678 (2.1–2.2 h) |
| 850 | +10, 0 | 294–356, 4 | −3.2 (a new piece), +0.1 | 3.0; 646–678 (1.8–2.3 h) |
| 1,000 | 0, 0 | 337–348, 4 | +0.2, +0.1 | 2.9–3.1; 554–678 (1.6–2.0 h) |
| 1,250 | 0, 0 | 369, 4–5, and the Seal | +2.9, +2.9 | made in the hour |
| 1,500 | 0, +5 | 357–369, 4–5 | +0.2, +0.1 | 3.4; 1,697–1,946 (4.8–5.3 h) |
| 1,750 | 0, +10 | 580 with the Seal; 369 | +2.1, −0.7 | made; 3.4, 1,815 (4.9 h) |
| 2,000 | +10, 0 | 369–379, 5 | −24.3 (a new piece: ×2.35), +0.1 | 3.2–3.3; 1,499–1,690 (4.0–4.6 h) |

- **The wall pays in lumps.** In 6 of 14 hours the run passed one more boss (5–10 stages of best), 4 of them a Lord (700, 1,000, 1,500 and 2,000 are Lord
  stages); 3 times a piece found on the way beat what he wore, worth 3 to 24 stages. In the other 8 it added nothing lasting. Its gold is 8 (at 700) to 3×10⁸
  (at 1,500) times a dungeon hour's and buys the run's camp (four camp levels fewer cost a gate: section 4). Fresh runs afterwards were equal for 7 heroes.
- **The dungeon pays a little every time:** 4–7 milestones (+0.1 to +0.2 stages), 8–16 times the wall's combat XP, 10–31 times its essence, no death, no run lost;
  and a Seal (two records and 24 milestones, 2.8–3.4 stages) every 2,000 clears, 5–6 hours of a fresh tier at 350–380 an hour (3 of the 14 hours made one).
  By `tools/ledger.mjs` the four Seals the heroes hold at 2,000 are worth 13.7 stages at the boss, the open tier's milestones 0.1–0.2.

**Over 300 hours,** each paired by seed with the baseline:

| Bot | Best stage | Records | Seals | Prestiges | In dungeons |
|---|---|---|---|---|---|
| As it is (013's batch, 12 seeds) | 1,450 (1,420–1,470) | 154 (152–157) | 2 | 269 (261–312) | 7% |
| `POLICY.dungeonMin:120` (seeds 1–3) | 1,370, 1,360, 1,280: −90, −60, −170 | −8 to −14 | 2 | 230–239 | 11–16% |
| `POLICY.wallDungeon:10`, `dungeonMin:12` (seeds 1–3) | 1,470, 1,480, 1,560: +10, +60, +110 | +4 to +14 | 4 | 256–294 | 11–12% |
| `POLICY.wallDungeon:10`, `dungeonMin:25` (12 seeds) | **1,680 (1,650–1,690): +230 (+190 to +250)** | +24 (+14 to +26) | 5 | 309–331 | 23–26% |
| `POLICY.wallDungeon:10`, `dungeonMin:50` (12 seeds) | 1,620 (1,540–1,630): +170 (+90 to +190) | +16 (+12 to +23) | 5 | 267–299 | 31–34% |
| `POLICY.wallDungeon:10`, `dungeonMin:110` (seeds 1–3) | 1,470, 1,480, 1,490: +10, +60, +40 | +1 to +10 | 4 | 242–275 | 39–42% |

- `POLICY.dungeonMin` is not the lever: it only stretches the visits a death sends him on, most of them early, and longer ones cost 60–170 stages.
- `POLICY.wallDungeon` (the copy only): once a run has stood 10 minutes at its wall, near its best or in a Trial, the bot spends `dungeonMin` in the dungeon it
  would pick, once a run; the long-stall prestige follows as before. With 25 minutes: Seals at about hours 55, 105, 150, 190 and 260 against 56 and 280–290;
  records 177 against 154 at the median (Seals 10 against 4, stages 66 against 58, Trial rungs 71 against 63); 18–19 War Tree points against 11–13, from the
  dungeons' XP. Longer visits cost the wall's push and prestiges (110 minutes: 242–275); shorter ones cost Seals (12 minutes: four).
- **The answer:** yes, the bot leaves the wall for dungeons too late, deep only when it dies, and not because of `dungeonMin`. Of the settings tried, the deepest
  climb is `POLICY.wallDungeon:10;POLICY.dungeonMin:25`: 1,680 against 1,450 (+16%; each of 12 seeds +190 or more). 50 minutes is next (+170, 12 seeds).

## 2. Every Trial at the frontier, build by build

Fresh runs with a 31-point build in place of his own: `ladder31` is the bot's `TALENT_ORDER` to its 31st point; `blade31`, `hunt31`, `bulwark31` are
`tools/talents.mjs`'s; `brutes31` is 015's Brutes tree. Each cell: mean stages over no talents for the 8 heroes (for how many it was best or tied).

| Trial | Its cost (no talents) | ladder31 | blade31 | hunt31 | bulwark31 | brutes31 |
|---|---|---|---|---|---|---|
| Plain | — | +15.0 (8) | +15.0 (8) | +6.3 (1) | +1.3 (0) | +6.3 (1) |
| Brutes | 20–40 | +15.0 (3) | +18.8 (5) | +3.8 (0) | +2.5 (0) | **+21.3 (7)** |
| Thick Hides | 70–90 | +15.0 (7) | +15.0 (7) | +3.8 (0) | −1.3 (0) | +7.5 (2) |
| Glass Hero | 70–110 | +28.0 (0) | **+36.4 (8)** | +5.0 (0) | +3.8 (0) | +24.8 (0) |
| Rusted Gear | 50–60 | +11.3 (5) | +15.0 (8) | +3.8 (0) | 0.0 (0) | +3.8 (1) |
| Swift Bosses | 60–70 | +31.3 (6) | +32.5 (7) | +3.8 (0) | 0.0 (0) | +11.3 (1) |
| No Camp | 120–290 | +10.0 (7) | +11.3 (8) | +10.0 (7) | 0.0 (0) | +2.5 (1) |
| Fasting | 50–70 | +7.5 (4) | +12.5 (8) | +2.5 (1) | +2.5 (2) | +8.8 (6) |
| Faithless | 300–750 | +12.5 (6) | +15.0 (8) | +8.8 (3) | −1.3 (0) | +6.3 (1) |

- **No Trial asks for a different build.** The Blade wins or ties in all eight, at every depth from 700 to 2,000. Brutes is the one with a second build as good:
  the Brutes tree tied or beat the ladder build for all 8 heroes (a gate ahead for 5) and `blade31` for 7 (ahead for 3). `mix51` (51 points, seed 1) added 0 to
  +20 over `blade31` and lost a gate twice. The Bulwark was never alone at the top, and tied in 2 of 72 cells, both Fasting.
- **Food** (his own talents) is eaten only at 700–1,000, where blows still land: plain runs at 700 (60–340 dishes by build), Brutes and Faithless (all 500 for the
  attack builds at 700, with 6–42 deaths; 1–500 at 1,000), Rusted Gear and No Camp at 700. There it bought at most one boss (Brutes at 700: bare 610, food 620,
  potion 660, both 670; at 1,000 both 960–970 against 970 for the potion alone). From 1,500 no Trial made him eat. The Bulwark kept him standing under Brutes
  and Faithless at 700 (0 deaths, 105–371 dishes) but a gate short of the Blade.
- **Defence and health** (seed 1, food and potion): defence ×0.1, defence ×10 and health ×2 changed no stage reached in any of the five, at any depth; defence ×0.1
  only added deaths (Faithless: 37 at 700, 29 at 1,000). Glass Hero felled him 70–330 times a run whatever his defence or health; dodge is its only shield, and
  the dodge line still lost to the Blade there. Fasting's deaths (30–80 a run at 700–1,000, 4–19 at 1,500, none at 2,000) don't move either.
- **The potion is what counts:** bare to potion was +50 to +60 stages in plain runs, +50 to +80 in Brutes, +20 to +60 in Faithless, +30 to +60 in Glass Hero.

## 3. Food and defence in dungeons, at the Titan and at the clan boss

The eight heroes as saved, bare, food, potion or both, with his own talents or `bulwark31`.

- **Dungeons** (the Hellforge for 20 minutes, at his open tier and at the deepest tier his best stage opens): no death, no run lost to a blow and no dish eaten,
  at any depth; without a potion his health never fell below 97%. What fails is the clock: at 1,500, Hellforge V (boss at 1,492, the Relentless rule's 40 s)
  cleared nothing bare and 42–45 runs an hour with the dungeon potion; at 1,000's deepest (Hellforge III) the potion doubled the clears (141–162 an hour to
  315–327). The Bulwark changed the clears by 0 to −7%.
- **The Titan.** His own (the bot kept it 35 to 270 stages below him) never threatened him: won 3 of 3 at 700–1,500 in every condition; at 2,000 won with the
  potion (5 of 6 fights) and dealt 16–28% without; 0–16 blows landed and his health stayed above 99.9%. A Titan at his best stage felled him at 700 and 1,000
  without a potion (0–2% dealt). At 700 food kept him up the whole minute (9–11 dishes, 32–37% dealt, against 6–9% with the potion alone); the Bulwark with the
  potion fell in 5 of 6 (19–34%). At 1,000 the potion alone kept him up (31–34%); from 1,500 nothing fells him (5–7% bare, 22–32% with the potion).
- **The clan boss** never strikes (0 blows: `systems/clanfight.js` gives it no attack), and the server reckons the damage from attack, crits, speed and the
  potion (`core/power.js`): `bulwark31` in place of his talents dealt 0.86–1.02 of his damage, `blade31` 0.99–1.16, the potion ×4.2–4.8. Food and defence: nothing.

## 4. The economy talents over a whole game

- **What the tools allow:** `--set` takes numbers on its roots, not `TALENT_ORDER`, and in that order the first economy talent (Scavenger) is the 41st point. The
  heroes held 0 points at 700, 2–3 at 1,000, 12–13 at 1,500, 19–20 at 1,750 and 28–29 at 2,000 (831–847 h); 013's 300-hour batch ended with Patient Hunter 5,
  Sharpened Edge 5 and Keen Eye 1–3 in all 12 seeds. At 2,000's XP rate (3.8–4.1×10⁵ an hour) the 41st point is about 2,100–2,200 hours in. So a batch with
  them and one that skips them are the same game, seed for seed, for any horizon under about 2,000 hours.
- **What I could do:** each at its top rank added to his own talents, a fresh run from each of the 8 heroes: Gilded Eye +2.5 stages (a gate for 2 of 8, both
  at 700), Treasure Sense and Bounty +1.3 (1 of 8), Scavenger, Essence Drinker, Lord's Due, Tracker, Long Draught and Veteran's Focus 0. **Second Chance −6.3:**
  a gate lost for 5 of 8. With the regroup minute gone he spends the clock wall on the boss instead of farming the stage below, earns 0.29 of the gold, buys 4
  fewer camp levels and stalls lower. An order taking them first wasn't run: by 300 h (11–13 points) it would trade Sharpened Edge and Keen Eye for Scavenger
  and part of Treasure Sense, worth 0 to +1.3 stages here, far inside a 12-seed batch's noise (about ±70 stages).

## What this doesn't settle

- Simulated heroes only; four of the seven marks are Lord stages, so the one-hour table leans to Lords' walls. Fresh runs move in gates (a 2.5-stage mean is a
  gate for a quarter of the heroes); some policies have 3 seeds. `POLICY.wallDungeon` is a bot's habit: whether live players at a clock wall wait is unknown.
- What the economy talents' essence, drops and XP add over many runs; the Titan near his best stage past 2,000 (the bot's own was 35–45 stages short); the
  health ×2 bench's dish counts (his health was scaled from outside the game, so he ate when he didn't need to; its stages stand).

## What it means for the proposals

- **P-023 (survival deep):** confirmed where 013 and 015 hadn't looked. Past 1,000 no Trial, dungeon, Titan of his own or clan fight makes him eat, and defence
  from ×0.1 to ×10 moves nothing; at 700–1,000 food buys a gate at most (Brutes, Faithless) and keeps him up against a Titan at his best stage. "Leave it and say
  so" stays honest; a deep survival test would have to be a rule on the hero (P-106), not on the monsters.
- **P-061 (the Bulwark pays at the clock):** stronger. `bulwark31` was never the best build alone in 72 cells (plain and eight Trials, 8 heroes), added +1.3 stages
  on the ladder, and changed no dungeon or clan result. Size it against the Blade's +15, and the Brutes tree's +21 under Brutes.
- **P-106 (a Trial that bleeds the hero):** no Trial today makes defence count (×0.1 to ×10 moved nothing, Brutes and Faithless included). A bleed of his own
  health would be the first; Brutes already rewards a second build, so a rule can.
- **The dungeons in the dock.** New: **at the wall, the dock offers the dungeon** (Change, S–M): once a run has stood 10 minutes at its wall, the fight's dock offers
  the dungeon the bot would pick, one tap to Enter, with the clears to the next Seal ("1,690 clears: two records"); today the Dungeons badge lights only for a
  Seal, a unique or a beatable Titan (`ui/render.js:151`). Why: the bot that spent 25 minutes of each wall's hour there climbed 16% further in 300 hours
  (12 seeds); past 1,000 the wait mostly adds nothing, the dungeon adds milestones, XP and a Seal every 5–6 hours. Risk: a faster deep climb brings P-024's
  ceiling closer, and the server's climb allowance (§3.17) needs a look.
- New: **Second Chance keeps the regroup's minute** (Change, S): at the clock wall that minute is where the camp's gold comes from, so the talent cost a gate for
  5 of 8 heroes. Let the retry come at once and the minute's farming still pay, or move it off the Hunt's road (`hunt31`, `mix51` and the bot's order hold it).
- New, the tool, not the game (Change, S): the simulator's stall test counts from the run's last new best rather than the last fight begun, and the bot's wall
  habit becomes a choice. DESIGN §3.26, §3.30 and §3.33's deep numbers came from a bot that, past 700, went to a dungeon only when it died.

**For the queue:** the deep balance numbers again with a bot that leaves the wall (300 and 600 h, 12 seeds; P-024's ceiling date); the same policy for the
check-in bot (`--player=checkin3`); the visit's best length between 12 and 50 minutes, or a visit until the Seal's clears are done; the economy talents over a
long game, taken first; a Titan at the hero's best stage, the one fight where food and the Bulwark count; live saves through these benches, with the owner's OK.
