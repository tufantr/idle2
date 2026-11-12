# 040: A long session, and the banked clocks (11 November 2026)

Two measurements on the research worktree's code (the game as 021 found it, 6ea4de0's; later commits touched docs and the API).
Nothing in the repository changed; scratch copies, scripts and runs lived in a scratchpad folder, deleted afterwards. The Mac was
loaded throughout (load average 15–164 on 8 cores: the owner's video encoding and other agents' simulators), so my simulators ran
at `nice 10`, at most two at a time and then one, as the coordinator asked, and the browser at normal priority.

**In short:**
- **Nothing grows without bound in three hours of a fight left alone:** the heap holds at 4.0–4.7 MB from minute 30, the DOM at
  about 1,000 nodes, the battle log at 22 nodes, the toasts at none; the save grows to 33 KB as the bag fills, then holds.
- **The cost is the frame, and steady:** 60 a second, each with a layout and a style recalculation; 15% of a core on the main thread,
  59% across Chromium's processes. Under a 4× CPU throttle, 46–69% busy at 56–59 frames, then 30. Hidden, Chrome stopped the game
  for half an hour; one late tick replayed the gap and left "welcome back, away 33m" in a tab the player never left.
- **The Titan's bank costs the daily bot's hero a fifth to a quarter of his Titans at equal depth:** 35.5 in two weeks, where the
  always-on bot had 45–48 at the same stage (460). A bank of 8, with a bot that takes only beatable Titans, gave 60; 24 gave 60.5;
  the replay at today's bank 52.5. Three short visits keep level already (73.5 against 63–66). The always-on run at 24 matched the
  run at 3 bit for bit. Banks past a visit's minutes trap the simulator's own bot (stuck at stage 40 in 12 of 18 runs).
- **The climb doesn't show the Titans by 336 hours** (runs without one end as deep), and **the week's laurel is missed in Pact
  weeks:** the daily bot lost a week's three in 2 of 3 seeds, the check-in bot in 1 of 3.

## 1. A long session in Chromium

**What I ran.** Chrome for Testing 153 (Playwright 1.63's build 1243), new headless, over raw CDP: Playwright keeps pages visible
and focused (its probe page kept 60 frames and 10 timer ticks a second behind another tab; over raw CDP it went hidden). The
worktree served as `tools/shots.mjs` serves it; 1280×900, `?dev=1`, `shots.mjs`'s late-game save (best stage 64, 420 tokens, 24
prestiges, Auto on), the fight on the whole screen, never touched (sound locked, Focus on): he went from best 64 to 90 in 16
prestiges and 1,960 kills, with no page error. Every 5 minutes: `Performance.getMetrics` over 10 s (TaskDuration as main-thread
busy), frames and a 100 ms timer's ticks in that window, long tasks; `Runtime.getHeapUsage` around `HeapProfiler.collectGarbage`;
the Nodes and JSEventListeners metrics, a tree walk, `window`'s and `document`'s listeners; the battle log's and toast area's nodes;
the save; each process's CPU (`SystemInfo.getProcessInfo`). A: 140 minutes plain; B: 45 under `Emulation.setCPUThrottlingRate` 4;
C: 40 hidden (a blank tab in front, 60-second windows); R: in front again. The first script hung on a reply once the game was
hidden; a second client took C and R.

| Phase (samples) | Main-thread busy | Frames a second | Renderer / GPU process CPU | Heap after GC | Nodes after GC | Listeners |
|---|---|---|---|---|---|---|
| A plain (29) | 15.4% (P10–P90 12.8–18.6): script 2.1, layout 1.0, style 2.6 | 60 (59.3–60.1) | 24% / 34% | 4.1 MB (3.4–4.5) | 1,017 (1,001–1,577) | 95 (94–185) |
| B 4×, minutes 0–20 (5) | 56% (46–69): script 7.0, layout 4.0, style 9.5 | 58.7 (55.8–59.4) | spins (~97%) / 36% | 4.1–4.7 | 1,035–1,867 | 95–197 |
| B 4×, minutes 25–35 (3) | 21–34% | 30 | spins / 17–27% | 4.2–4.4 | 1,017–1,353 | 95–136 |
| B 4×, the last sample (1) | 56%, 47 long tasks (5.6 s of 17.5) | 6.6 | 62% / 31% | 4.7 | 2,077 | 214 |
| C hidden (7) | 0.1% (0.02–4.6) | 0 | 0.05–0.21% / 0.02–0.05% | 4.15–4.17 | 1,067–1,377 | 101–113 |
| R in front again (2) | 15.5–16.1% | 59.1–60 | 25% / 37–40% | 4.2 | 1,266–1,287 | 99–101 |

- **Nothing accumulates.** Per hour over the plain phase (least squares): heap +0.20 MB (+0.03 over its last 80 minutes), nodes −1,
  tree +3, listeners −5, the save +7.3 KB until the bag was full, then flat. Before each collection the Nodes metric read
  2,500–3,400: the re-renders (`setHtml`, `src/main.js:497-501`, at least once a second, `:306`) leave detached nodes the collector
  takes. Listeners follow what is drawn; `window` kept 6 and `document` 12 throughout.
- **The caps hold.** Battle log 22 nodes, 8 lines of the 60 kept (`src/ui/render.js:506`, `src/systems/progress.js:15-20`); toasts 0
  at every sample (5 at most, gone in 3.8 s, `src/main.js:1034-1037`); effects 0–10 nodes; the save 15 → 33 KB as the bag reached
  40 (a full bag salvages its worst, `src/systems/inventory.js:246-257`), then 32.5–33.2 KB; localStorage 146–149 KB with backups.
- **The cost is the frame.** 594 layouts and 684 style recalculations per 10 seconds, one each a frame, with about 31 animations
  running; busy time drifted up about 1.5 points an hour while those counts held, so the drift is the machine's load. A
  legendary drop's sticky card waited for a tap from minute 125 to the end, through 60 and 30 frames alike.
- **The throttle.** On a CPU four times slower the fight alone takes half a core; from minute 25 Chrome drew 30 frames. The last
  sample's 47 long tasks I couldn't tie to an event. The renderer reads ~97% under the throttle (it spins): only busy time counts.
- **Hidden.** Frames stopped at once; the game's last tick came about four minutes in, then none for half an hour: its clock fell
  5 to 30 minutes behind, kills unchanged, while the page still answered DevTools. One tick about 37 minutes in replayed the gap as
  time away (`OFFLINE_GAP_MS`, `src/game.js:40,129-136`: 354 kills, two prestiges) and opened the welcome-back report, "You were
  away 33m", in the hidden tab; then the clock stopped again. In front: 10 ticks and 60 frames at once, the report waiting. On the
  ticks it gets, `render()` rebuilds the DOM unseen (`src/main.js:306`, no `document.hidden` check), cheap under the throttling.

## 2. The Titan's bank

**What I ran.** A copy of `src/` and `tools/`: `TITAN_BANK` read from the environment (`src/data/dungeons.js:260`); in the replay's
fight loop (`src/systems/offline.js:158-176`) a ready Titan fought when the game's own badge says he can win (`fightPreview`,
killSeconds ≤ min(60 s, surviveSeconds), `src/ui/render.js:154`); each day's best stage, Titans and laurels noted, inside the replay
too; the `git` call taken out. `simulate.mjs --hours=336 --auto`, `--player=daily1` (15 minutes at 20:00), `--player=checkin3`
(5 minutes at 08:00, 13:00, 21:00) and always on; seeds 1–6, always on 1–3. Medians, the seeds' range in brackets.

**The simulator's bot as it is** tries every banked Titan whenever one is awake (`tools/simulate.mjs:962-965`):

| Visits | Bank | Titans won | Tries | Best at 168 h | Best at 336 h |
|---|---|---|---|---|---|
| Daily | 3 (today) | 35.5 (29–36) | 43 | 260 (230–267) | 464 (397–520) |
| Daily | 8 | 54 (33–58) | 113 | 258 (239–270) | 414 (347–464) |
| Daily | 24 | 5.5 (5–31) | 220 (212–255) | 40 (38–40) | 40 (38–270) |
| Check-in | 3 (today) | 73 (58–86) | 124 | 310 (290–340) | 590 (458–910) |
| Check-in | 8 | 35 (4–100) | 240 (208–280) | 145 (40–310) | 250 (40–670) |
| Check-in | 24 | 6 (4–39) | 216 (208–321) | 40 (39–40) | 40 (40–360) |
| Always on | 3 | 286 (285–296) | 337 | 1,370 (1,350–1,380) | 1,920 (1,880–1,920) |
| Always on | 24 (seed 1) | 286 | 337 | 1,350 | 1,920 |

- **The always-on run at 24 was the run at 3, bit for bit** (seed 1): he never had more than three attempts waiting. Fought in the
  replay, this bot won 54.5 Titans on the daily schedule (28.5 away) and 70.5 on the check-in one (15 away).
- **The trap.** At 24 for the daily visit, and at 8 or 24 for the check-ins, every visit is Titan fights, most of them lost; a
  visit ending mid-fight sends the hero back, after it, to the work the first Titan interrupted, all the time away
  (`challengeTitan` keeps it, `src/systems/dungeon.js:425`; `leaveBehind`'s `enterCombat` does nothing during the fight,
  `tools/simulate.mjs:892-895`). In 12 of 18 runs the hero never passed stage 40 (two prestiges), 3 more stayed there to hours
  240–288. A player would stop at the fights the hero can win; what the game shares is the minute each: 24 tries outlast either visit.

**A sensible bot** (in the copy): it fights a banked Titan only when the badge says he can win it, and a fight under way as a visit
ends goes back to the fight afterwards, not to the work.

| Visits | Bank | Titans won | Tries | Best at 168 h | Best at 336 h |
|---|---|---|---|---|---|
| Daily | 3 | 34.5 (33–38) | 34.5 | 240 (239–250) | 430 (377–490) |
| Daily | 8 | 60 (55–62) | 62 (55–70) | 240 (238–250) | 410 (387–470) |
| Daily | 24 | 60.5 (49–74) | 61 (50–92) | 240 (238–250) | 400 (369–440) |
| Daily | 3, fought in the replay | 52.5 (47–60) | 58 (49–68), 24.5 away | 240 (230–260) | 414 (370–500) |
| Daily | no Titans (`--without=titan`) | 0 | 0 | 239 (229–257) | 412 (368–460) |
| Check-in | 3 | 73.5 (65–93) | 78.5 (65–93) | 315 (290–330) | 680 (489–890) |
| Check-in | 8 | 89 (68–101) | 95 (68–105) | 314 (289–330) | 640 (480–670) |
| Check-in | 24 | 93.5 (68–107) | 94.5 (68–110) | 314 (289–330) | 620 (480–698) |
| Check-in | 3, fought in the replay | 84.5 (68–87) | 87 (68–104), 18 away | 320 (300–320) | 605 (510–670) |
| Check-in | no Titans | 0 | 0 | 310 (290–320) | 650 (480–790) |

- **A bank of 8 is enough.** It lifts the daily bot's hero from 34.5 Titans to 60 (+74%) and the check-in bot's from 73.5 to 89
  (+21%); 24 adds 0.5 and 4.5. At 60 his next Titan stands at stage 415 (`titanStage`), at his best: the hero is then the limit,
  not the clock. The replay at today's bank gives 52.5 and 84.5, and spends no visit minutes on the ones won away.
- **At equal depth, not equal time.** The always-on bot gains about a Titan an hour: 45–48 when it first reached stage 460 (hours
  59–66), 63–66 at 600 (hours 78–84). So 014's 29 against 245 is mostly depth (the daily hero is four times shallower); what the
  three-hour bank costs him is 35.5 against 45–48 at his own depth, closed at 8. The check-in hero, 590–680 with 73.5, is level.
- **The climb doesn't show it by 336 hours.** Best stages move within the seeds' spread (the same bank gives 464 or 430 by the
  picky rule alone) and runs without any Titan end as deep (412, 650). Near stage 430 a stage asks ×1.06 health and ×1.055 attack
  (`enemyBaseStats`); 35 Titans give ×1.55 attack and health (+2% each, +1% from the 21st), some 7 stages, 25 more about 2–3.
  014's 7–10% belongs to the always-on hero with 245–296.

## 3. The week's laurel

**How the simulator plays it.** `--trials=5` (the default) sends every fifth prestige into a Trial once they open (best 200), the
week's first while its laurel is to win, three tries a week (`tools/simulate.mjs:442-452`); with Auto on, a visiting bot starts one
only when its run stands within 90% of its best (`:635-639`). A laurel beats the week's Trial's best from before the week
(`weeklyGoal`, `checkTrial`, `src/systems/trials.js`): one a week alone, three in a Pact from best 500 (`--pacts`), each a record,
×1.05 on the tokens' power (`src/core/modifiers.js:52`). The simulated weeks turn at hours 96, 264, 432, 600.

- **Without Pacts** (the 336-hour runs above) every bot won the one laurel of every full week with its Trials open: daily and
  check-in in week 2, 6 of 6 seeds; always on, all three weeks in 3 of 3.
- **With Pacts** (672 hours, seeds 1–3), laurels by week: daily [0,1,1,0,0], [0,1,3,3,3], [0,1,1,0,3] (Pacts from hours 456, 336,
  360); check-in [0,1,3,3,3], [1,1,0,3,3], [0,1,3,3,3] (from 336, 264, 384); 5 (2–10) and 10 (8–10) laurels in 28 days. A Pact
  week went three or none: the daily bot lost one in 2 of 3 seeds, the check-in bot in 1 of 3. The daily bot played 6–15 Trial
  runs to the check-in bot's 23–42: one visit seldom finds his run near its best.
- Each lost Pact week is ×1.16 on the tokens' power for good, P-017's cost, for players who never missed a day. A laurel that
  waited one week would have given back 2 of the 3 lost weeks (the next week was won). The always-on bot with Pacts wasn't run.

## What I could not settle

- **A real phone and battery:** headless Chromium paints in software here (the GPU process ~34% of a core); a phone's GPU, Safari's
  throttling and a battery were out of reach. Busy times carry the machine's load (15–164); frames and layout counts don't.
- **Why the hidden timers stopped altogether** after four minutes (freezing, or the background budget; Chrome documents one wake-up
  a second, one a minute after five), and why the throttled page settled at 30 frames: a trace would tell. No Safari, no Firefox.
- **The Titans' worth to the climb:** six seeds (always on three) fix the counts, not stage effects under ±15%; 336 hours only;
  P-122's stall-test bias is in every run; the badge's preview ignores food, regeneration, lifesteal and the combo.
- **The laurel:** three seeds; part of each miss is the bot's 90% rule; no bot takes a week off; no waiting laurel in the copy.
- **Not run** (one simulator at a time from the coordinator's word, and the deadline): always on at bank 8 (stopped once 24 matched
  3), seeds 4–6 at every bank, with Pacts, and with the sensible bot.

## For the proposals

- **P-059:** 8 is the bank measured to bring the daily bot's hero level at his depth by two weeks; 24 adds nothing yet (a longer
  horizon may want more). A fight costs a minute, so tries past a visit's minutes should resolve in the replay when the badge says
  he'd win; the replay alone at today's bank gets 52.5 of the 60 and touches no one else. The growth check must allow 8 at a return.
- **P-115:** the Titan needs a third of a day, not a day, by this measure; the laurel fails the floor in fact (lost Pact weeks), not
  only in principle. **P-017:** evidence beyond holidays, from bots that never missed a visit.
- **P-037:** in view, the cost is the frame (60 a second, a layout and a style recalculation each), so a lower frame rate once
  untouched cuts it in proportion; hidden, the browser already stops the game. Small (S): `render()` could skip while hidden.
- **New, the tool (Change, S):** the simulator's bot should fight only the Titans it can beat and go back to the fight after a
  Titan that outlasts a visit, as the copy did, before any bank is balanced with it.
