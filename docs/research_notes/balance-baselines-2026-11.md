# Balance baselines, November 2026: the fixed tools

The figures the patch's balance changes are measured against (R24's Practise, R25's Second Chance, R16's sure piece from a
Lord, R29's Titan bank), taken with the balance tools fixed first (R3). **Partial:** paused on 12 November at the owner's word,
after the daily visit's run; the three-visit, always-on and Auto baselines are still to run (commands below).

- **Tools:** 5f43172, the stall test reads the game's own `combat.stallMs` (P-122, research-loop 039; `--set=POLICY.stallFix:0`
  is the old test); 101231f, the bot fights a banked Titan only when the dungeons tab's badge says it can win (`fightPreview`,
  through `tools/simlib.mjs` `titanBeatable`) and a visit that ends in a Titan fight sees it out, so the hero then fights rather
  than going back to the work the Titan interrupted (040 §2; `POLICY.titanFix:0` is the old bot); a2e284c, the pool check
  (P-114): essence, bars and gems by source and sink in 50-hour bands, the bands that spend under a tenth of their income, and
  the Armour Rack's levels and worn affixes past their caps.
- **Game:** 004babc's code, the same as 039's and 040's (nothing under `src/` changed since 6ea4de0).
- **Machine:** shared (load average 40 to 390 on 8 cores); one simulator at a time, under `nice -n 10`. Outputs in `runs/`
  (git-ignored): `runs/daily1-auto-336h/` (the run's JSON and report, the batch summary).

## The tools' own checks

- **Switches off, nothing else moves:** 50 hours always on, seed 1 (`--trials=5 --pacts --charms --ascend=1`), with
  `--set="POLICY.stallFix:0;POLICY.titanFix:0"`: the JSON and the report are 004babc's simulator's exactly but for the new fields
  (best 303, 54 prestiges, 32 Titans in 50 tries). The pool book's Proxy and the cap samples change nothing the game does.
- **The Titan rule** (`--player=checkin3 --auto`, seed 1, 96 h): 17 Titans won in 17 tries, against the old bot's 18 in 34; best
  220 either way. The badge's preview leaves out food, regeneration, lifesteal and the combo, so it passes over a few Titans the
  old bot won (its first three came at hour 24, the new bot's at 29).
- **A visit that ends in a Titan fight** (a scratch copy that started one 20 seconds before each visit's end, daily, 100 h): the
  one begun while the hero smelted was seen out, and the absence after it replayed as a fight (5,679 kills), not as smelting.

## The daily visit (`--player=daily1 --auto`, seed 1, 336 h)

| | Fixed tools, seed 1 | 040's picky bot, bank 3 (seeds 1–6) | 040's bot as it was, bank 3 |
|---|---|---|---|
| Titans won / tries | **35 / 35** | 34.5 (33–38) / 34.5 | 35.5 (29–36) / 43 |
| Best stage near hour 168 | 240 (at the visit of hour 180; 210 at hour 156's) | 240 (239–250) | 260 (230–267) |
| Best stage at hour 336 | **450** | 430 (377–490) | 464 (397–520) |
| First prestige, Auto earned | 12 h, 60 h | | |
| Prestiges, deaths, records | 888, 16,607, 49 | | |
| Seals, War Tree levels, Ascensions | 0, 5, 2 (hours 276 and 300) | | |
| Visits that saw a Titan fight out | 0 of 14 | | |

- **It matches 040's picky bot:** a Titan won at every try, as many as its six seeds' median (and as the old bot's median, which
  took 43 tries), and bests within their spread. 040 ran with the old stall test; whether the fix moves the daily bot was not run apart (seed 1 with
  `--set=POLICY.stallFix:0` would tell). 040 noted the best inside the replay; here the hours of an absence carry the best found at
  the next visit (`bestByHour`), and hour 336's is after the last replay.
- **Pools:** essence came in at 753k (fights 705k, dungeons 41k, Titans 5.7k) and 1.7% went out, all to the anvil (740k held),
  under a tenth in every band. Bars: 78k in, 77% out (the anvil). Gems: 150k in, none out (137k diamonds held): the bot never
  crafts on a 15-minute visit. Pooled in some band: essence, every gem, and copper, iron, mithril and adamant bars. Gold: 1% spent,
  98% left at prestiges Auto makes while away (022's figure for visiting bots).
- **Caps:** from hour 50 every Armour Rack level bought sat past the 90% mitigation cap at the samples (26 of 26 at hours 50–100,
  35 of 35 to hour 200, 63 of 63 and 67 of 67 from 250; 0 of 4 before), and 3–4 attack speed affixes of the 36–39 worn sat past
  the +100% cap from hour 250. The cap log samples only in visits, outside a Trial: hours 200–250 had no sample (both visits in
  Trial runs; the report prints the band as 0/0, the JSON says `samples: 0`).

## Still to run, and what to hold them to

```bash
nice -n 10 node tools/batch.mjs --jobs=1 --seeds=1-3 --hours=300 --trials=5 --pacts --charms --ascend=1          # runs/online-300h
nice -n 10 node tools/batch.mjs --jobs=1 --seeds=1-3 --hours=300 --trials=5 --pacts --charms --ascend=1 --auto   # runs/online-auto-300h
nice -n 10 node tools/simulate.mjs --hours=336 --seed=1 --player=checkin3 --auto --json=runs/checkin3-auto-336h/1.json
node tools/audit.mjs   # the report card's pool check (E12) over every batch above
```

- **Always on:** 039's fixed bot at hour 300, 1,670 (1,660–1,690) over 12 seeds, 1,660 (1,650–1,670) over seeds 1–3, 1,670 on
  seed 1; 314 prestiges, 173 records, 5 Seals, 18 War Tree points; its time 42% fighting, 25% in dungeons, 10% at the wall, 13%
  at skills, 11% agility. Seed 1 with `--set=POLICY.titanFix:0` is 039's own bot and should give its 1,670 exactly.
- **Auto:** 039, seed 1, 1,900 at hour 300 (800 at 100), 534 prestiges, 185 records, 8% in dungeons, 2 Seals.
- **Three visits:** 040's picky bot, bank 3: 73.5 (65–93) Titans in 78.5 tries, best 680 (489–890) at hour 336; 039 (the old
  Titan bot, the stall fix): 580 (509–710), 16,248 deaths, 1,021 prestiges, 0 Seals over 12 seeds.
- **How they were run:** each batch's seeds one at a time with the batch's own arguments (`node tools/simulate.mjs --seed=N
  --snapshot=1000000 --json=runs/<label>/N.json <arguments>`, its report kept beside it), then the same `tools/batch.mjs` line with
  `--skip-existing` writes the summary without running anything again; the machine's simulators counted before each. On this
  machine 50 hours always on took 5–6 minutes, the daily 336 hours 13.
