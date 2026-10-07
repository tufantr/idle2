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

## Strategy, in order (not yet done)
1. Fixes: dev flags on local hosts only; pity counts only bosses whose drop could be an upgrade (drop power with
   depth) and pays at the best depth; simulator agility budget; leaderboard allowance by best stage.
2. Unlock pacing per A (growing gaps, attended time only, useful-when triggers, wall-breakers first).
3. Tooling: batch runner with JSON, novelty log, `--set` overrides, RNG streams, `--player=<type>` login schedules.
4. Experiments E1–E11 of D §6 (baseline 100 seeds, bot QA, exploit suite, policy panel, cadence, luck, sweeps,
   choices, leaderboard envelope).
5. Changes by strength of evidence: Auto earned by play (after 3–5 prestiges or 48 h); 24 h offline cap;
   welcome-back that leads with where the run stalled and the decisions; banked Titan attempts and Titans tied
   to the best stage; then late content (ranks past Mythic, Abyss strata, two more dungeons, mastery
   checkpoints, an Ascension layer with Trials, a completion percentage).
6. An opt-in playtest log, and a short playtest with people.
