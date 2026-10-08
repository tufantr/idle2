# Robust and fun throughout: research (7 October 2026)

The owner asked whether the research was wide enough to make the game robust and fun throughout, and asked
for it to be finished before planning and doing. Five studies, each with sources and simulator runs on copies
of `tools/simulate.mjs` (no game code changed by them):

- `A_onboarding_pacing.md`: how games space new places in the first hour and day; a schedule for ours.
- `B_longterm_motivation.md`: what keeps hours 10–1,000 interesting; our late game measured over 500–1,000 h.
- `C_sessions_players.md`: check-in sessions, player types, retention; our pace for players who visit 1–5 times a day.
- `D_robustness_methods.md`: seeds, sweeps, bot playstyles, fun proxies, pity maths, exploits; an audit plan.
- `E_gaps_filled.md`: the gaps earlier notes left open, filled or confirmed open.

## Main findings
- Unlock pacing (fixed in b712b0f) should keep growing: gaps of 1.5, 3, 4, 5, 7, 10, 15, 20, 30 min of attended
  play; places earned by skilling 90 s apart; one place per return; each place when it is useful (A).
- After hour ~60 nothing structural opens; from hour 150 the longest waits for a major moment are 53–157 game
  hours (2–6 days of real play). Targets: a major moment every 4 / 6 / 24 / 48 h in hours 10–50 / 50–150 /
  150–500 / 500–1,000 (B).
- Players who check in 3 times a day reach stage 200 around day 8 (online: day 2); once a day never earns
  Auto. The gate is Auto's 20 prestiges, not the 12-hour cap (C).
- Bugs found: `?dev=1` and `&event=` work on the live site; the pity ring pays mostly junk late (every deep
  Abyss depth counts as tier 7); the leaderboard allows 60 stages per hour against an honest 0.6; the
  simulator's agility budget leaks (D).
- 3–4 seeds show directions only: use 30+ seeds, hours-to-stage percentiles, separate RNG streams (D).

## Strategy, in order, and where it stands (8 October 2026)
1. **Fixes: done.** Dev flags work on local hosts only (a save that carries them is flagged); the pity
   ring counts only bosses whose drop could beat something worn, by drop power at depth; the simulator's
   agility budget no longer leaks; the leaderboard lets a best stage grow by its depth (three times the
   fastest of 166 simulated runs: 160 stages a day from stage 200, not 1,470).
2. **Unlock pacing: done** per A (growing breathers in attended time, useful-when triggers, wall-breakers
   first, one place per return); `tools/opening.mjs` checks the caps for five kinds of new player.
3. **Tooling: done.** `tools/batch.mjs`, `tools/audit.mjs`, `--set`, `--player`, `--vary`, `--without`,
   `--json`, `--save-at`, `tools/trials.mjs`, the robustness suite (parity, a thousand mangled saves, no
   arbitrage). The simulator's bot also had two blind spots found on the way: it reset its stall clock
   with every fight (so it never prestiged again at a late wall) and never left a Trial run.
4. **Experiments: done**, as a report card (`tools/audit.mjs`, DESIGN §5.7). E1 (100 seeds and four play
   styles, 150 hours): every band to hour 150 meets its target (DESIGN §5.6). E11 set the leaderboard's
   allowance (1). The card found the anvil's work lost at every better drop (now refitted), the bot
   looping a dungeon while it meant to climb (fixed), `tokenExp` the one knife-edge, dungeons mandatory
   by design, and Crafting without a job once epic jewellery drops (the owner's choice).
5. **Changes by evidence: done**, except what needs new paintings or a choice. Auto after 5 prestiges or
   two days; 24 h offline; a welcome-back that leads with where the run stopped; banked Titans that
   keep falling; then the late content: Trials (eight, five tiers each, each tier a record), ranks past
   Mythic (500, 1,000, 2,000), mastery checkpoints, a completion percentage, Ascension (Stars, a day's
   rest), sixteen named strata in the Abyss and six medals for the deep game, two more dungeons (240
   and 275), and moments on the calendar: the week's Trial with its laurel and board, and a festival
   cloak each event weekend. Then the deep Abyss eased past stage 400 (the owner's choice): the late
   climb moves 1.6 to 2 times as fast, and a player without Auto waits at most 108 hours for a big
   moment past hour 500 (it was a week). Every band to hour 1,000 now meets its longest-wait target;
   with Auto the big moments still come less often than asked in hours 300–500 (every 29 hours against
   24) and past hour 500 (every 71 against 48), where only the records and the calendar are left (DESIGN
   §5.6). **Still to do:** paintings for each
   stratum and the two new dungeons (the prompts are in `docs/art/gemini.md`), something to reach past
   stage 500, an end boss, each early Ascension opening something new, a cape for 100%. Crafting's late
   job stays as it is (the owner's choice; the recommendation is in DESIGN §5.7).
6. **Playtest log: done** (Settings, exported for `tools/playtest.mjs`). A short playtest with people is
   the owner's.
