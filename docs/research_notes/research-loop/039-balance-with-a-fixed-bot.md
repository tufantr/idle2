# 039: The balance again, with a bot that leaves the wall (11 November 2026)

P-122 and 032's queue, measured with the game's own simulator on a scratch copy; nothing in the repository changed, no live saves.

**In short:** two lines fix the stall test (it reads the game's own `combat.stallMs`), and the always-on bot then leaves the wall
after 15 minutes: 1,670 (1,660–1,690) at hour 300 against 1,450, +220 paired, with 5 Seals against 2: what 032's added rule
gained, so the rule isn't needed. The gain is made between hours 100 and 300 and held (2,050 against 1,850 at 600 h); deep, both
climb 1.3 stages an hour. A 25-minute visit is best (1,700, +30 over the bot's own 30); 50 minutes, or until the clears are done,
lose 30 to 130. The check-in bot doesn't change and the Auto bot hardly; Auto was already the fastest (1,900 at 300 h, seed 1): at
the wall a quick prestige beats a visit, and a visit beats waiting. The fixed bot stands at 2,740 at 1,200 h, climbing 0.8–0.95 an
hour: 6,000 near hour 5,000 to 8,000 by extrapolation. The live best climbs about twice as fast, so P-024's ceiling is 11 to 21
weeks off, not eight, and it is the only ceiling in `RANKED` a hero can meet. 013, 015, 022 and 027 stand; only 032's date for
the economy talents moves (near hour 1,270, not 2,100).

## What I ran

- **The copy.** `tools/simulate.mjs` and `tools/batch.mjs` in a scratch folder, imports pointed at the worktree's `src/`, no `git`
  call; switches on `POLICY` (so `--set` takes them), snapshots every 10 hours, gold by camp upgrade, what sent the bot off the
  fight. Switches off, it repeats 013's batch exactly (seeds 1–3 to 300 h; seed 1: 1,460, 310 prestiges, 7,992,339 tokens).
- **Always on** (`tools/batch.mjs --trials=5 --pacts --charms --ascend=1`): fixed (`--set=POLICY.stallFix:1`) seeds 1–12 to
  600 h, 1–3 of them to 1,200 h; as it is, seeds 1–3 to 600 h, and 013's batch (1–12) to 300 h. Earlier hours are snapshots.
- **Check-in** (`--player=checkin3 --auto --hours=336`): fixed, seeds 1–12; as it is, 013's batch.
- **Visits** (fixed, 300 h): `POLICY.dungeonMin:12|25|50`, and `POLICY.dungeonUntilClears:1` (a visit to a dungeon that owes the
  Seal's 250 clears lasts until it has them, 6 h at most), seeds 1–3; the best, 25 minutes, on seeds 1–12.
- **Checks** (fixed, 300 h): no food (`POLICY.foodStock:0`), seeds 1–2; the Auto bot (`--auto`, the same flags), seed 1; the
  fix's other reading (`POLICY.stallFix:2`: 15 fresh minutes after each detour), seed 1.
- **Not run** (a shared machine; from 01:15 two processes at most, none started after 02:00): 12-minute visits on seeds 4–12, food
  on seeds 3–6, the Auto bot as it is (022's seeds 1–2 stand in), Auto with a dungeon at the wall, `stallFix:2` on seeds 2–3.
- Medians with P10–P90 over seeds (batch.mjs's rule); "paired" is the median of each seed's difference; three seeds show a trend.

## 1. The fix, and the deep numbers again

```js
// tools/simulate.mjs: combatTask() (:554) and the test that sends him off the fight (:954)
-   until: () => !S.combat.active || now - lastStageGainAt > 15 * 60000
+   until: () => !S.combat.active || S.combat.stallMs > 15 * 60000
-   if (task.kind === 'combat' && now - lastStageGainAt > 15 * 60000) needTraining = true;
+   if (task.kind === 'combat' && S.combat.stallMs > 15 * 60000) needTraining = true;
```

- `combat.stallMs` is the game's own clock, the one Auto reads: it runs while he fights at the stages, goes to 0 at a new best in
  the run and at a new run (`systems/combat.js:584`, `:692`; `systems/prestige.js:78`), and no restart touches it. (Wall time since
  the run's best, `lastRunRiseAt`, counts his cooking too: a run still climbing would read as stalled after 25 minutes at the pot.)
- Left alone, the prestige's 20-minute test (`:642`) still reads `lastStageGainAt`, which entering a dungeon restarts: after any
  visit over 20 minutes a stalled run prestiges as he comes back. So at a wall he fights 15 minutes, spends 30 in a dungeon (or 10
  at a skill, then the dungeon) and prestiges, where the old bot waited out 60. With no dungeon cleared comfortably, the 30
  minutes are more fighting at the wall (`farm`).

| Always on | As it is (013's batch; 600 h: seeds 1–3) | Fixed, 12 seeds | Paired (600 h: seeds 1–3) |
|---|---|---|---|
| Best at 100 h | 630 (620–650) | 650 (610–670) | +20 (−10 to +40) |
| Best at 200 h | 1,180 (1,160–1,220) | 1,340 (1,290–1,350) | +150 (+100 to +180) |
| Best at 300 h | 1,450 (1,420–1,470) | 1,670 (1,660–1,690) | **+220 (+200 to +250)** |
| Best at 600 h | 1,850 (1,850–1,860) | 2,050 (2,030–2,070) | +210 (+170 to +210) |
| Prestiges at 300 / 600 h | 269 (261–312) / 459 (412–459) | 314 (308–320) / 532 (526–535) | +45 (+2 to +56) / +73 |
| Records at 300 / 600 h | 154 (152–157) / 186 (184–187) | 173 (172–177) / 207 (206–210) | +20 (+18 to +23) / +23 |
| Seals at 300 / 600 h | 2 / 3 | 5 / 6 | +3 / +3 |
| War Tree points at 300 / 600 h | 12 / 23 | 18 / 28 | +7 / +5 |
| Hours 0–300: fight, dungeon, at the wall, skills, agility | 64, 7, 6, 11, 11% | 42, 25, 10, 13, 11% | |
| Hours 300–600, the same | 94, 4, 0, 2, 0% | 57, 16, 22, 6, 0% | |
| Sent off the fight by the stall test, by a death (0–300 h) | 0, 171 (seeds 1–3) | 268, 306 | |

- **The fix alone does what 032's added rule did:** +220 at 300 h against 032's +230 (`POLICY.wallDungeon:10;dungeonMin:25`),
  with 5 Seals against 2 and a third of the fighting time moved to dungeons. Hour 100 doesn't move: until then deaths send both
  bots off the fight (about 140 times) and the test fires only 3–11 times.
- **The gain is made by hour 300, then held.** From 300 to 600 h both climb 1.3–1.4 stages an hour (+390 fixed, +410 as it is),
  the old bot at the wall 94% of the time, the fixed one in 218 runs to 149, each with one Seal: the open tier's dungeons are no
  longer cleared comfortably (900–1,200 h: 10% in dungeons, 24% at the wall). What lasts is what came before: 3 more Seals, 20
  more records and a fifth Ascension (430 h; none by 600 h as it is).
- **The check-in bot doesn't change** (`--player=checkin3 --auto`, 336 h, 12 seeds): 580 (509–710), 16,248 deaths, 1,021
  prestiges, 0 Seals, 013's numbers exactly. The test fired 0 times: Auto prestiges at 10 minutes of stall; a session lasts 5.
- **The Auto bot hardly changes** (`--auto`, seed 1): the test fired 4 times in 300 h, all before Auto was earned at 6.6 h. It
  reached 1,900 against 022's 1,850 for that seed (not rerun as it is, so whether those detours or chance made the 50 is open). It
  is the fastest bot by far: 800 at hour 100, 534 prestiges and 185 records by 300 h, with 8% of its time in dungeons and 2 Seals.

## 2. How long a visit at the wall

The fixed bot with `POLICY.dungeonMin` set, at 300 h. "Paired" is against its own 30 minutes, seed by seed.

| Visit | Seeds | Best at 300 h | Paired | Prestiges | Records | Dungeon clears | In dungeons |
|---|---|---|---|---|---|---|---|
| 12 minutes | 1–3 | 1,650 (1,650–1,660) | −20 to 0 | 286 | 177 | 12,600 | 23% |
| 25 minutes | 1–12 | **1,700 (1,670–1,710)** | +30 (0 to +50) | 326 | 179 | 14,500 | 23% |
| 30 minutes (the bot's own) | 1–12 | 1,670 (1,660–1,690) | — | 314 | 173 | 15,100 | 25% |
| 50 minutes | 1–3 | 1,630 (1,620–1,630) | −30 to −40 | 279 | 171 | 17,700 | 32% |
| Until the dungeon has the Seal's 250 clears | 1–3 | 1,550 (1,530–1,570) | −80 to −130 | 257 | 167 | 10,700 | 34% |

- A visit past 20 minutes ends the run (section 1), so its length is the run's too: 25 minutes makes the most runs for the same
  share of hours in dungeons; 50 buys 2,600 more clears for 35 fewer runs. A 12-minute visit doesn't trip the prestige: he goes
  between a skill and a dungeon until the hour's long stall, as long in dungeons as with 25 and in fewer runs.
- Staying until the clears are done ties him to the tier's slowest dungeon (one or two visits a run hit the 6-hour cap): fewer
  clears in more time. Every length made 5 Seals by 300 h. **Best: 25 minutes, then 30 and 12.**

## 3. P-024: when he passes 6,000

The fixed always-on bot, seeds 1–3, to 1,200 h:

| Hour | 300 | 600 | 800 | 1,000 | 1,200 |
|---|---|---|---|---|---|
| Best stage | 1,660 (1,650–1,670) | 2,060 (2,030–2,060) | 2,360 (2,350–2,370) | 2,570 (2,540–2,580) | 2,740 (2,730–2,750) |
| Stages an hour, since the column before | 3.4 (200–300 h) | 1.3 | 1.55 | 1.0 | 0.9 (0.8–0.95) |

- Stage 2,000 at hour 562 (561–577), 2,440 at 866 (861–893), 2,500 at 938. The fifth Ascension, the last by 1,200 h, comes at
  428–435 h: with 130 Stars the bot's rule wants about 5×10⁹ tokens for the next, and he holds 1.9×10⁸ at 1,200 h.
- **Not reached by 1,200 h; extrapolated:** at the last 200 hours' 0.8–0.95 an hour he passes 6,000 near hour 5,000 (4,600 to
  5,300); if the climb keeps slowing as from 600 to 1,200 h (best ∝ hours^0.41), near 8,000: 190 to 340 days always on.
- **Against the live best** (2,440 on 11 November, 1,980 a week before): the fixed bot took 318–352 hours for those 460 stages, so
  the live hero climbs about twice as fast there, and stood at 2,440 at 23 to 30 days (552–720 h) where the bot needs 866. At twice
  the bot's slowing pace he passes 6,000 in 11 to 21 weeks (late January to April 2027); P-024's eight weeks needs 460 a week.
- **The ceilings in `RANKED`** (`api/index.js:344`), at 1,200 h: best stage 2,740 of 6,000; tokens 1.9×10⁸ of 10¹² (about
  3×10⁵ more an hour; an Ascension sets them to 0); Stars 130 of 100,000; total XP 1.38×10⁸ of 3.39×10⁸ (13 skills at twice level
  99's: the game has 11, so an honest save tops out at 2.87×10⁸); combat levels past 99: 40 of 200 (the tree fills at 134);
  Titans 518 of 20,000; dungeon clears 23,200 of 10⁸. **The best stage is the first ceiling, and the only one a hero can meet.**

## 4. What changes in the earlier files

- **013, food:** holds (two seeds). Without food (`POLICY.foodStock:0`) the fixed bot reached 1,670 and 1,650 at 300 h, the
  same stages as with it, with 2,840 and 3,040 deaths against 2,465 and 2,107: food spares deaths, not stages.
- **013, why the harder monsters climbed further:** confirmed. Its `denseAtkGrowth:1.035` runs reached 1,665 at 300 h, blows pushing
  the bot into dungeons (19% of its time); with today's monsters and the fix he reaches 1,670 with 25% in dungeons.
- **015, builds:** stand. The War Tree comes with depth: 4 points at 1,000, 10 at 1,300, 16 at 1,600, 28 at 2,000, 32 at 2,300,
  within three of 015's and 032's counts; the benches were fresh runs with their own stop rule, and 015's heroes the Auto bot's.
  What moves is 032's "the economy talents never reach the bot within about 2,100 hours": the 41st point (Scavenger) comes near
  hour 1,270 (40 points at 1,200 h).
- **022, the economy:** holds. At 300 h the fixed bot spends 92% of its gold (94% as it is), the Armour Rack and Hearth take 61% of
  camp gold (64%), and essence piles up faster: 1.1 million held against 0.76 million, from 2.6 times the dungeon clears (15,300 to
  5,950); 2.9 million against 2.0 at 600 h. 022's own figures were the Auto bot's, which the fix hardly reaches.
- **027, live players against the bot:** the always-on bot passes 1,000 at hour 150 fixed, 165 as it is, under a third of 027's
  three weeks; at three weeks (504 h) it stands at 1,930 (1,910–1,950) fixed, 1,770 as it is. The live 2,440, 2,320 and 2,050 are
  past it at any age their accounts can have; the Auto bot is the nearer match (1,900 at 300 h; 015's 2,300 by hour 556 at most).

## What this doesn't settle

- **6,000 is an extrapolation:** three seeds to 1,200 h, a slope of 0.8 to 0.95 an hour at the end, and no way here to tell a
  steady climb from one that goes on slowing. Three seeds to 2,400 h would; so would the Auto bot past 300 h, not measured here.
- **The live comparison** uses sign-up weeks (027), not each hero's hours, and nothing of their Auto, clicks or potions.
- **The fixed bot is still a bot.** Its prestige's 20-minute test keeps the old clock and ends every stalled run right after the
  visit; after a visit he never tries the wall again in that run (`POLICY.stallFix:2`, 15 fresh minutes after each detour: 1,630
  against 1,670 on seed 1). Whether players at a wall wait, visit or prestige is unknown.

## What it means for the proposals

- **P-122 (fix the stall test):** done in the copy, two lines, and worth landing in `tools/simulate.mjs`. The deep figures of the
  always-on bot without Auto (013's, 032's) are 210–220 stages low at hours 300 and 600. The Auto bot's stand: DESIGN §3.26,
  §3.30 and §3.33 were measured with `--auto` (032 counted them as the old bot's), and there the test fired 4 times in 300 h.
- **P-120 (the dock offers the dungeon at the wall):** right against waiting, not against Auto: the fixed bot gains what 032's
  rule did, 25 minutes is the best visit, but the Auto bot, prestiging at 10 minutes, is ahead of both (1,900 at 300 h against
  1,700, seed 1). Offer it to a player without Auto, never in place of a prestige; Auto plus a visit was not run.
- **P-024 (ceilings that keep up):** only the best stage's ceiling can be met: between late January and April 2027 at the live
  best's pace, sooner if 460 a week holds. The others are years away, and the total-XP one can never be met (11 skills, not 13).
- **The growth check (§3.17):** the fixed bot's worst climb in any window of 1 to 48 hours, from the best at each whole hour past
  stage 200, was 38% of `honestClimb` (42% with 25-minute visits), under the 49% DESIGN gives for today's worst. Nothing to refit.
