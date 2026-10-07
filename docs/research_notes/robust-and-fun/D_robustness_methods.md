# Robust and fun: methods for checking Fantasy Idle's systems, and an audit plan

*Research report, 7 October 2026. It builds on `docs/research_notes/incremental-math.md` §7 (twelve measures of growth and pacing) and `docs/DESIGN.md` §5.5 (where the game stands on them) and does not repeat them. Those say what to measure about growth. This note covers how to measure so that the answers can be trusted, which players to simulate, what can stand in for fun, how to bound bad luck, and what to try to break.*

**How to read it.**
- A sentence with a link is a fact from that source. "(snippet)" marks a fact seen only in a search engine's summary.
- **[Inference]** marks my reasoning, judgements and recommendations. **Computed** marks figures worked out from a formula.
- **Measured** marks figures from simulator runs made for this report, with `tools/simulate.mjs` unchanged or with scratch copies (in the session scratchpad) that add an event log, a pity log or a constant override. No repository file was changed.
- Runs: 24 seeds of the standard 150-hour game on commit 9761163. Then, on commit b712b0f, which landed during the work (§1.3): 16 seeds with an event log, 8 with a pity log, and 3 × 16 seeds with one constant changed.

## Summary

1. **Three or four seeds show a direction, not a threshold.** Over 24 seeds, stage 200 came at 55.7 ± 1.9 hours (mean ± SD) and weapon tier 5 at 10.0 ± 2.7 hours. A ±1-hour 95% interval needs 14 seeds for stage 200 and 27 for tier 5. A 10th or 90th percentile needs at least 30 seeds; the unluckiest 1% needs about 300.
2. **"Best stage at 150 h" no longer measures anything.** 21 of 24 seeds ended at exactly 280, a boss wall. Use hours to each stage, treat seeds that never get there as censored (survival analysis), and report the median with P10 and P90.
3. **The same seed is a different game after any change.** A commit that only changed when places open left the averages alone but made seed-by-seed results unrelated (correlations −0.39 to +0.20). One random stream feeds everything; split it by purpose.
4. **Sweep, then screen, then decompose.** One-at-a-time sweeps find tipping points; Morris screening costs r(k+1) runs; Sobol indices cost N(k+2) runs with N in the hundreds or thousands. At the measured ~640 runs an hour on this 8-core Mac, a Morris screen of 25 knobs takes about two hours.
5. **The Abyss drop growth is a knife-edge; the boss gear chance is not.** ±5% on `BALANCE.abyss.dropGrowth` moved the late pace by +25% and −21% (elasticity 4–5) and the best stage at 150 hours from 279 to 299 or 262. +20% on the boss gear chance changed nothing measurable.
6. **Simulate several players.** Ten policies plus one "without system X" run per system. Judge with the asymmetric rule Riot uses for champions: too strong if it over-performs for any player type, too weak if it under-performs for all.
7. **The bot has a bug that looks like balance.** Its agility budget (a quarter of the time) is charged only when an agility task runs its full 30 minutes, but the loop re-decides every 10. Seed 23 spent 28 hours parked at stage 26 and ended at 260. The stall struck 0–3 of every 16 seeds in later runs, more often in a faster variant.
8. **Fun can be proxied, not measured.** Sources support spacing rewards and keeping a near goal in view, and warn against folk rules (easier versions held players longer). Measured: the longest stretch with nothing notable is ~7 minutes in the first hour, ~47 minutes in hours 1–10, ~4.7 hours in hours 10–50 and ~7 hours (worst seed 18) after.
9. **The pity counter fires where it can't help.** 1–3 payouts in the first 10 hours, 117–199 in hours 50–150; 78–83% of them during re-climbs, and only 4–9% ever worn. Its eligibility test compares tiers, and every Abyss depth from 5 on is tier 7.
10. **Two open doors.** `?dev=1` works on the live site (every dungeon and the Titan open, mini-games at will) and `&event=` runs any weekend event's bonuses for good; the server sees neither. Its best-stage allowance, 60 stages per real hour, is 60–100× the honest late pace, so clock cycling passes unflagged. §6 orders eleven experiments; the first six take about two hours of compute.

## 1. Simulation-based balancing

### 1.1 What the practice looks like

- **Schreiber** warns that a small sample can mislead (a Magic: the Gathering deck tuned on a few test hands failed at a tournament) and that statistics show that something happens, not why ([Game Balance Concepts, Level 8](https://gamebalanceconcepts.wordpress.com/2010/08/25/level-8-metrics-and-statistics/)). The book that grew from the course, *Game Balance* (Schreiber & Romero, CRC Press, 2021), teaches spreadsheet methods throughout ([publisher](https://www.taylorfrancis.com/books/9781315156422), snippet).
- **Machinations** runs Monte Carlo simulations of a resource diagram in one click and exports them as CSV (snippet, [Wayline](https://www.wayline.io/machinations-alternative)); designers script player strategies and watch them play the model ([Jaffe et al. 2012](https://cdn.aaai.org/ojs/12513/12513-52-16035-1-2-20201228.pdf)).
- **Research** tunes parameters against simulated play: Top Trumps decks balanced by evolutionary search ([Volz et al. 2016](https://arxiv.org/abs/1603.03795)), a shoot-'em-up tuned with fewer playtests by active learning ([Zook et al.](https://arxiv.org/abs/1908.01417)), the fewest card changes that even out Hearthstone matchups ([de Mesentier Silva et al. 2019](https://arxiv.org/abs/1907.01623)), and difficulty curves from Monte Carlo play and survival analysis, checked against 175 million Flappy Bird sessions ([Isaksen & Nealen 2015](https://doi.org/10.1609/aiide.v11i5.12846)). Nelson lists seven ways to get game metrics without players ([2011](https://doi.org/10.1609/aiide.v7i3.12479)).
- **[Inference]** Fantasy Idle's simulator plays the real code, so every rule and bug is in it; the price is 20–50 seconds a run and one hand-written policy.

### 1.2 How many seeds

**Measured**, 24 seeds, sensible policy, 150 hours (the 16 later seeds agree within noise):

| Measure | Mean | SD | P10 | Median | P90 | Range |
|---|---|---|---|---|---|---|
| Hours to stage 100 | 5.2 | 0.7 | 4.5 | 5.2 | 6.1 | 3.9–6.5 |
| Hours to stage 150 | 17.4 | 1.6 | 15.2 | 17.8 | 19.3 | 14.3–20.0 |
| Hours to stage 200 | 55.7 | 1.9 | 53.5 | 56.0 | 58.1 | 51.9–59.6 |
| Weapon tier 5, hours (23 seeds) | 10.0 | 2.7 | 7.0 | 9.3 | 14.0 | 5.8–14.9 |
| Weapon tier 6, hours | 17.0 | 3.2 | 13.9 | 16.3 | 21.5 | 12.4–23.5 |
| Best stage at 30 h | 169.7 | 0.7 | 169 | 170 | 170 | 167–170 |
| Best stage at 150 h | 279.7 | 4.7 | 280 | 280 | 280 | 260–287 |
| Prestiges in 150 h | 232 | 12 | 229 | 235 | 240 | 178–241 |

With eight runs at once, 24 runs took 2 min 15 s (38–53 s each): about 640 runs an hour.

- **For a mean**, NIST's rule is N ≥ (1.96/δ)²σ² for a 95% interval of ±δ ([NIST/SEMATECH](https://www.itl.nist.gov/div898/handbook/prc/section2/prc222.htm)). **Computed:** stage 200 to ±1 hour needs 14 seeds (±0.5 hour: 55); weapon tier 5 to ±1 hour, 27; stage 100 to ±0.25 hour, 29.
- **For a percentile.** **Computed** from the binomial law of order statistics: with 10 or 20 seeds there is no distribution-free 95% interval for P10 or P90. With 30 seeds, P10 lies between the 1st and 9th sorted seed; with 100, between the 4th and 16th; with 200, between the 12th and 29th.
- **For a worst case.** By Wilks' rule the worst of n runs bounds the γ-quantile with confidence β when 1 − γⁿ ≥ β ([Porter 2019](https://www.osti.gov/biblio/1529145)); nuclear safety work uses 59 runs for 95%/95% (snippet, [arXiv 1701.02373](https://arxiv.org/pdf/1701.02373)). **Computed:** 29 runs cover P10 at 95% confidence, 59 cover P5, 299 cover P1.
- **By stability.** Agent-based modellers add runs until the coefficient of variation settles, or size them by power analysis; there is no universal number ([Lee et al. 2015](https://www.jasss.org/18/4/4.html)).
- **Ceilings.** **Measured:** best stage at a fixed hour piles onto boss stages: 21 of 24 seeds at exactly 280 at 150 hours, all 24 at 167–170 at 30 hours. It moves only when a change carries the hero over a whole wall. **[Inference]** Use hours to each tenth stage instead. When some seeds never arrive, estimate the median with Kaplan–Meier rather than dropping them: in DESIGN §5.2 the skiller reached stage 150 on one seed of three, and a median of the finishers alone is biased.

**[Inference] Seed tiers:** 8 seeds (one batch, about a minute) as a smoke test after any change; 16–30 per setting in sweeps; 100 for a release baseline; 300 for claims about the unluckiest 1%. Always report P10, median and P90.

### 1.3 Comparing two builds

- **Common random numbers** run both configurations on the same random numbers. This narrows the difference only if the runs correlate, and only if the streams stay synchronized, each number serving the same purpose in both runs ([Wikipedia: Variance reduction](https://en.wikipedia.org/wiki/Variance_reduction)).
- **Measured, a natural experiment.** Commit b712b0f ("places open one at a time") landed between my baseline and my later runs. Over 16 seeds the means held (stage 200: 55.5 → 55.8 hours, SE 0.8), but seed-by-seed correlations across nine measures were −0.39 to +0.20.
- **Measured, one constant changed.** Raising the boss gear chance from 0.5 to 0.6 kept early measures correlated (stage 100: r = 0.64; weapon tier 5: r = 0.69), cutting their standard errors by about 40%, but not late ones (stage 200: r = −0.34). Changing the Abyss drop growth draws no extra random numbers, so everything before the deep Abyss stayed identical.
- **[Inference]** `src/core/rng.js` serves everything from one source and the bot's choices depend on outcomes, so one extra roll shifts every later one. Give each purpose its own stream (`rng.stream('drops')`, `'combat'`, `'crates'`) seeded from the run's seed and the name. Until then, compare distributions, size samples for unpaired comparisons, and write the commit hash into every run's output: the baseline here went stale within the hour.

### 1.4 Sensitivity analysis

| Method | Cost in runs | What it gives | Use for Fantasy Idle |
|---|---|---|---|
| Extended one-at-a-time (OAT) | knobs × levels × seeds | The shape of each response, including tipping points | First: 25 knobs × 8 levels × 10 seeds = 2,000 runs, ~3 h |
| Morris elementary effects | r(k+1) points × seeds | μ* (importance), σ (curvature or interaction) | Second: k = 25, r = 10, 5 seeds = 1,300 runs, ~2 h |
| Sobol indices | N(k+2) points × seeds | Each knob's share of output variance, with interactions | Later, on 5–8 knobs, through a surrogate |
| Surrogate and regime classifier | 1,000–4,000 runs | Where the game runs away, holds or stalls | For the knife-edge knobs |

- Ten Broeke et al. recommend extended OAT as the starting point for agent-based models because it shows the tipping points that global methods average away (11 of their parameters had one; 10 replicates per setting). Their Sobol analysis took 17,000 runs and still gave wide intervals and some negative estimates ([JASSS 2016](https://www.jasss.org/19/1/5.html)).
- Morris uses k + 1 runs per trajectory and usually 4–10 trajectories; μ* ranks importance even when effects change sign, and a large σ means non-linearity or interaction ([Wikipedia](https://en.wikipedia.org/wiki/Elementary_effects_method)). First-order and total Sobol indices need N(d+2) runs, N often in the hundreds or thousands ([Wikipedia](https://en.wikipedia.org/wiki/Variance-based_sensitivity_analysis)); SALib's sampler makes N(2D+2) rows with second-order terms (snippet, [SALib](https://salib.readthedocs.io/en/main/api/SALib.sample.html)).
- A follow-up trained surrogate models on 1,000 Latin-hypercube runs (4,100 with adaptive sampling) and found that the parameters that moved the numbers were not those that changed the model's qualitative behaviour ([ten Broeke et al. 2021](https://www.jasss.org/24/2/3.html)).

**Measured: one knife-edge, one dead lever** (16 seeds each, paired by seed, commit b712b0f):

| Change | Stage 150 | Stage 200 | Best at 100 h | Best at 150 h | Late pace (stages/h after 200) | Seeds stalled |
|---|---|---|---|---|---|---|
| Baseline | 16.5 h | 55.8 h | 247 | 279 | 0.84 | 1 |
| Boss gear chance 0.5 → 0.6 (+20%) | +0.6 h, n.s. | +0.2 h, n.s. | +0, n.s. | −0, n.s. | 0.84 | 1 |
| Abyss drop growth 1.45 → 1.52 (+5%) | identical | −0.2 h, n.s. | +15 (SE 2.3) | +20 (SE 2.8) | 1.05 (+25%) | 3 |
| Abyss drop growth 1.45 → 1.38 (−5%) | identical | +1.5 h (SE 0.7) | −10 (SE 1.2) | −17 (SE 1.3) | 0.67 (−21%) | 0 |

"Stalled" is the bot's agility loop (§2.4): 20–40 hours parked at stage 22–27, ending with 110–180 prestiges against 199–249.

**[Inference]**
- With elasticity ε = (Δy/y)/(Δx/x), the drop growth's elasticity on the late pace is 4–5: a 5% slip moves the endgame by a fifth to a quarter. The response bends upward, as a system near its runaway point should (incremental-math §1.4).
- The true effect is larger: the faster variant stalled the bot on 3 seeds, and without them the late pace rose about 30%. A variant that changes how often the bot stalls looks like a balance effect.
- The boss gear chance shows nothing at +20%; the pity, the empty-slot weighting and the drop multiplier already smooth it.
- Neither result shows in the milestone table up to stage 200.

### 1.5 Runaways, walls and knife-edges

**[Inference]** Sort each simulated configuration into a regime and map where the boundaries lie:
- **Runaway:** the climb accelerates (more stages in the last third of the run than in the middle third) or passes a ceiling (say 400 at 150 hours). Incremental-math's gap δ explains why; the sweep shows where.
- **Healthy:** the late pace in its band of 0.5–1 stage an hour (DESIGN §5.5, measure 7).
- **Dead end:** twenty hours of play without a new best stage, tier or meaningful level, and no policy in the panel (§2) escapes when forked from that state.
- **Knife-edge:** |ε| > 2 on a milestone or pace measure, or a regime change within ±10% of the shipped value. A doubling of the spread between seeds deserves a look, but rule out bot stalls first: here every such jump came from them.

Ten Broeke's 2021 recipe finds the boundaries: label each run's regime, train a classifier on the knob values, read off the boundary (§6, E10).

## 2. Agent-based playtesting

### 2.1 What the field does

- **Personas.** Holmgård et al. built "procedural personas" for MiniDungeons 2: tree-search agents with evolved selection rules and their own utility functions (a Runner, a Monster Killer, a Treasure Collector, a Completionist). They played the same level differently and mapped its play space ([IEEE Transactions on Games 2019](https://arxiv.org/abs/1802.06881)).
- **Restricted play.** Jaffe et al. measure an element by what a restricted agent loses: one that may never (or must) use an action, one limited to a search depth (depth 0 is random, depth 1 greedy), one "oblivious" to the state like a fixed build order. Forbidding one monster card in their game cost less than forbidding the others, which flagged it as weak; the tool replaced up to 20 rounds of manual evaluation ([AIIDE 2012](https://cdn.aaai.org/ojs/12513/12513-52-16035-1-2-20201228.pdf)). They also cite automated search that found reliable corner-kick goals in FIFA, and Bungie's playtest finding that Halo 3's sniper rifle crowded out other strategies.
- **Diverse strong play.** MAP-Elites found many ways to play Hearthstone well along chosen behaviour axes ([Fontaine et al. 2019](https://arxiv.org/abs/1904.10656)).
- **Industry.** King predicted Candy Crush level difficulty with a network trained on players' moves, better than tree search and far cheaper (snippet, [Gudmundsson et al. 2018](https://www.Gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)). EA's SEED found exploits with reinforcement learning ([Bergdahl et al. 2020](https://arxiv.org/abs/2103.15819)), covered maps with novelty-seeking agents ([Gordillo et al. 2021](https://arxiv.org/abs/2103.13798)) and added RL to Battlefield 2042's test bots ([Gillberg et al. 2023](https://arxiv.org/abs/2307.11105)); Ubisoft tested Far Cry: New Dawn with RL bots (snippet, [AI Business](https://www.aibusiness.com/ml/how-ubisoft-is-using-ai-in-game-development)). Developers stay sceptical of agents that disrupt their workflow ([Politowski et al. 2022](https://arxiv.org/abs/2202.12777)).

### 2.2 How many players to simulate

No source gives a number. Holmgård used four personas; Riot watches four audiences, from average players to professionals ([Riot](https://www.leagueoflegends.com/en-us/news/dev/dev-balance-framework-update/)); Jaffe uses a ladder of skill. **[Inference]** In an idle game outcomes change with attention (how often the player decides), skill (how well) and taste (what they like doing). Ten policies cover these; five exist:

| # | Policy | Axis | Exists? |
|---|---|---|---|
| P1 | Sensible: dungeons, Titan, skills, the bot's prestige rule | baseline | yes |
| P2 | Sensible with Auto | automation | `--auto` |
| P3 | AFK pusher | low attention | `--farm-ladder=push` |
| P4 | Ladder farmer | caution | `--farm-ladder` |
| P5 | Skiller (no dungeons, no Titan) | taste | `--no-dungeons --no-titan` |
| P6 | Speed prestiger: prestiges as soon as allowed | exploit-seeking | scratch only (incremental-math §9) |
| P7 | Check-in player: five 8-minute sessions a day and a night away, decisions only in sessions | realistic attention | no |
| P8 | Active player: mini-games at a set success rate, strikes, potions | high attention | no |
| P9 | Greedy optimiser: forks the state at each decision, tries each option for an hour, keeps the best | high skill; finds dominant routes | no |
| P10 | 50 random variants of P1's thresholds and orders (prestige share, stall timeout, dungeon minutes, agility share, perk and camp order) | variety; how forgiving the game is | no |

Add restricted versions of P1 and P7 without each system: dungeons, Titan, farming, agility, anvil, camp, perks, crafting, mini-games.

### 2.3 Finding dominant and degenerate strategies

**[Inference]**
- **Dominant:** a policy at least 1.5× faster than P1 at every milestone (DESIGN, measure 10); in the weaker form, faster everywhere for no more attention.
- **Mandatory or dead system:** forbidding it slows some policy by more than 2× (mandatory) or every policy by less than 5% (dead). Riot judges champions with the same asymmetry, nerfing one who over-performs in any of its four audiences and buffing one who under-performs in all four ([Riot](https://www.leagueoflegends.com/en-us/news/dev/dev-balance-framework-update/)).
- **Degenerate loop:** a clearly duller policy (one repeated action, at most a third of P1's decisions an hour) within 10% of P1 at every milestone. Low attention is meant to work in an idle game; the flag is for a specific loop (one dungeon forever, parking on a stage, prestiging every ten minutes) beating the varied play the design wants.
- **Builds:** run 30 random perk orders × 10 seeds. A spread below the seed noise means perk choices don't matter; an order that wins by over ~20% will be found and copied.
- **Regret:** fork the state at a decision (which dungeon, which skill, prestige now or later), play every branch on the same seed, and record what the bot's choice lost. No close calls means no interesting decisions; a wrong call costing hours punishes.

### 2.4 The bot is part of the instrument

**Measured.** Seed 23 is an outlier on every count: best stage 260 (others 278–287), 178 prestiges (others 221–241). Its log repeats "train agility toward 91 … 98" every ten minutes from hour 122.4 to the end, at stage 26, without fighting.
- **Cause.** The bot charges agility time to its quarter-of-the-time budget only when an agility task ends after its full 30 minutes (`tools/simulate.mjs` lines 403 and 413), but the main loop replaces any task after ten (line 582), so most agility time is never charged. Seed 23 spent 49 hours (33%) on agility; a seed without the stall, 35 hours (23%).
- **Frequency.** On the later commit it struck 1 of 16 seeds in the baseline, 1 of 16 with the boss chance raised, 3 of 16 with the drop growth raised and none with it lowered. It bites late, so it bites more often when the bot gets there sooner.

**[Inference]** Charge the time as it passes, as `task.budget === 'agility'` already does for gathering, and check every batch for: time share per kind of task; the longest stretch away from combat while combat could gain a stage; an identical decision repeated with nothing changed; a prestige count within ±25% of the batch median. Treat an outlier seed as a bot bug until shown otherwise.

## 3. Measurable proxies for fun

### 3.1 What the evidence supports

- **Reward spacing.** Schreiber warns against long stretches without a sense of progress and suggests new areas on a slowly rising curve, each a little longer than the last ([Level 7](https://gamebalanceconcepts.wordpress.com/2010/08/18/level-7-advancement-progression-and-pacing/)). Rules of thumb, not measurements.
- **Goal gradient.** In a café reward programme, customers bought coffee more often as the free one neared (time between purchases fell about 20%), slowed after a reward, and finished a 12-stamp card with 2 stamps pre-filled faster than a plain 10-stamp card ([Kivetz, Urminsky & Zheng 2006](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf)). Field evidence, not from games.
- **Challenge.** In experiments with 10,000 and 70,000 players of a maths game, players stayed longer when the game was easier, against the "moderate challenge is best" hypothesis ([Lomas et al., CHI 2013](https://doi.org/10.1145/2470654.2470668)). Yet 85 players of a small arcade game rated it highest when they failed a few times and then won; those who never failed rated it lower ([Juul 2009](https://www.jesperjuul.net/text/fearoffailing/)). Time played and enjoyment are different targets.
- **Decisions.** Sid Meier treats a game as "a series of interesting decisions", with pacing and feedback part of what makes them interesting ([GDC 2012](https://www.gdcvault.com/play/1015756/Interesting)).
- **Measures from self-play.** Browne's Ludi checked self-play statistics against human rankings (per [Jaffe et al.](https://cdn.aaai.org/ojs/12513/12513-52-16035-1-2-20201228.pdf)); its game Yavalath was published and ranks in the top 2.5% of abstract board games ([Browne 2014](https://doi.org/10.1145/2597453.2597454), Crossref abstract).
- **Variable rewards, with a caution.** Unpredictable rewards drive activity (Hopson, in `gear-sources.md` §2.5); in a survey of 7,422 gamers, loot-box spending rose with problem-gambling severity ([Zendle & Cairns 2018](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0206767)).
- **Limits.** Restricted play cannot capture properties rooted in human psychology or look and feel (Jaffe et al.). I found no player-validated target for "a reward every N minutes" or "a new system every N hours" in idle games. The nearest is Tap Titans 2's something new every 4–6 stages up to stage 60, from the game's own data (`first-session.md` §2).

### 3.2 Proxies a simulator can compute

**[Inference]** Each proxy measures the game's schedule, not the player's feelings: it can show that a stretch is empty, not that it is boring.

| Proxy | Definition | Stands for |
|---|---|---|
| Event gaps by phase | Median, P90 and longest gap between "any" and between "notable" events, per phase (0–1, 1–10, 10–50, 50–150 h) | Reward spacing; dead time |
| Novelty cadence | First-time events per hour: a new place, tier, system, pet, unique, dungeon | Something new often enough |
| Goal gradient | Share of play time with a visible goal 70–99% complete (level bar, pity ring, fragments, next obstacle, next tier) | A near goal in view |
| Reward irregularity | Coefficient of variation of the gaps between notable events | Variable-ratio feel, and too much of it |
| Decision density | Decisions an hour whose two best options differ by 1–10% in a forked outcome | Interesting choices |
| Regret | What the policy's choice lost against the best fork | Punishing choices |
| Challenge | Falls and boss timeouts per hour of fighting; hits to fall at the wall (incremental-math, measure 9) | Flow; frustration |
| Check-in value | For P7, the share of sessions that find something new | A reason to return |

*Any event:* a new best stage, any level or mastery level, a bestiary star, gear worn, an unlock, a pet, a unique, an achievement, a record, an obstacle, a dungeon's first clear, a Titan win, a pity drop. *Notable:* a boss beaten for a new best, a skill level divisible by 10 (or 99), gear of a new tier in its slot or of epic rank, an unlock, a pet, a unique, an achievement, a record, an obstacle, a dungeon's first clear, the first Titan win.

### 3.3 Measured cadence

16 seeds of the sensible bot; medians across seeds, the worst seed in brackets.

| Phase | Events: any / notable / gear worn | Longest gap, any | P90 gap, notable | Longest gap, notable | Longest gap between gear upgrades |
|---|---|---|---|---|---|
| 0–1 h | 298 / 42 / 5 | 2.6 min (3.3) | 4.5 min | 7.1 min (8.0) | 30 min (58) |
| 1–10 h | 926 / 100 / 37 | 22 min (30) | 15 min | 47 min (69) | 1.1 h (1.7) |
| 10–50 h | 1,008 / 67 / 40 | 42 min (67) | 1.7 h | 4.7 h (8.2) | 5.8 h (12.1) |
| 50–150 h | 1,018 / 114 / 138 | 1.8 h (4.0) | 2.4 h | 7.0 h (18.0) | 6.3 h (31.1) |

**[Inference]**
- Notable events fall in steps: about 42 in the first hour, 11 an hour in hours 1–10, 1.7 in hours 10–50, 1.1 after.
- Idle players average about 5.3 sessions a day ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game), cited in incremental-math §4.1), roughly one every three waking hours. A P90 notable gap under three hours means most check-ins find something; a hole of 7–18 hours means a day with nothing notable.
- The worst late holes (seed 4: 18 hours; seed 3: 15) coincide with the agility stall and the wall at 280. Fix the bot before blaming the game.

### 3.4 Targets

**[Inference]**, anchored where possible:
- **First hour:** no notable gap over 10 minutes (DESIGN §3.24 already asks for a new place every 20–60 seconds at first).
- **Hours 1–10:** none over an hour.
- **Hours 10–150:** a P90 notable gap of at most 3 hours (one check-in); a longest gap of at most 12 hours on the median seed and 24 on the P90 seed.
- **Check-ins:** P7 finds something new in at least 80% of sessions.

These are alarms that send a person to look, not proof of fun. Only players can validate them: a few think-aloud sessions, or opt-in telemetry of the same events.

## 4. Bad luck and pity

### 4.1 Sources beyond `gear-sources.md` §2.3

That note covers Genshin, Arknights, RuneScape, Old School RuneScape, Hearthstone's 40-pack timer, Diablo III and Lost Ark. New here:
- **Schreiber** suggests making each further failure less likely, so long losing streaks become rare and very long ones impossible, and showing players actual results, not just odds ([Level 5](https://gamebalanceconcepts.wordpress.com/2010/08/04/level-5-probability-and-randomness-gone-horribly-wrong/)).
- **League of Legends** raises critical-strike chance with each non-critical attack on the same target, up to a streak of 5 ([wiki](https://wiki.leagueoflegends.com/en-us/Critical_strike)).
- **Hearthstone** front-loads luck: a legendary is guaranteed within the first 10 packs of any type. Duplicate protection came for legendaries in August 2017 and for every rarity in March 2020 ([wiki](https://hearthstone.wiki.gg/wiki/Card_pack)).
- **WoW Legion:** I found no published formula for its legendary bad-luck protection (§7).

### 4.2 The maths

**Computed**, for a hard cap at N tries on a chance p per try:

| p per try | Mean wait, N = 8 (no pity) | Pity fires in | P99 wait without pity | Unluckiest of 10,000 players, no pity (median) |
|---|---|---|---|---|
| 0.05 | 6.7 (20) | 70% of cycles | 90 | — |
| 0.10 | 5.7 (10) | 48% | 44 | 91 |
| 0.185 | 4.4 (5.4) | 24% | 23 | 47 |
| 0.30 | 3.1 (3.3) | 8% | 13 | — |
| 0.50 | 2.0 (2.0) | 0.8% | 7 | — |

A pseudo-random distribution raises the chance after each failure instead, P(n) = C·n, with C set so the long-run rate stays p. **Computed:** at p = 0.25, C = 0.0847, no streak can pass 11 failures and the P99 wait is 9 (17 for plain random); at p = 0.10, C = 0.0147 and P99 is 23 (44); at p = 0.50, C = 0.302 and P99 is 4 (7). It halves the tail and keeps the average.

**[Inference] Choosing the threshold:**
1. Define the event the player cares about. Fantasy Idle already does: an upgrade, not a drop.
2. Put the bound in time: N chances last N × (time per chance), and that time changes with the phase.
3. Pick the longest tolerable drought (one check-in early, a day late) and set N so the P99 wait without pity is about that. Pity then fires in 5–25% of cycles. If it fires in most cycles the base chance is wrong; if never, it is decoration.
4. Remember the tail: at p = 0.185 the unluckiest of 10,000 players waits about 47 tries without pity.
5. Show the counter (the ring does) and pay where the player is.

### 4.3 Fantasy Idle measured

**The rule** (`pityMark`, `src/systems/combat.js` lines 274–291): a boss's first fall in a run adds a mark when it leaves no upgrade and the hero's weakest weapon or armour is of the place's gear tier or lower; the eighth mark brings a sure piece of that tier for the weakest slot.

**Measured** (16 seeds for counts, 8 with a pity log):
- Payouts per 150 hours: 127–229; 1–3 in hours 0–10, 2–9 in hours 10–50, 117–199 in hours 50–150.
- 78–83% came during re-climbs, below 90% of the best stage.
- 19–41 per run survived auto-salvage; 8–16 were ever worn (4–9% of payouts).
- Longest wait between worn gear upgrades (§3.3): about an hour to hour 10, 5.8 hours in hours 10–50 (worst seed 12), 6.3 after (worst 31).

**[Inference] Diagnosis.** Early, the pity is a quiet safety net that rarely fires. Late, every Abyss depth from 5 on has gear tier 7 (`abyssGearTier`, `src/data/zones.js` line 59), so the test cannot see that a boss at depth 6 drops gear far below what a hero at depth 18 wears (drop power grows ×1.45 a depth). Each re-climb passes a dozen such bosses; the ring fills and pays a piece that is salvaged. Counting only frontier bosses would not help: late, a new one comes every 10–17 hours, so eight take 80–130 hours.

**Options, best first:** (a) count a boss only when its drop could be an upgrade, comparing drop power (tier and depth) with the weakest worn piece, and hide the ring when it can't pay; (b) make the due piece at the run's best depth, whichever boss filled the ring; (c) bound the late wait in time, e.g. a sure upgrade after T hours of fighting within ten stages of the best. Then measure again: pity should fire in 5–25% of cycles, and at least half its payouts should be worn.

## 5. Exploits and degenerate strategies

### 5.1 What Fantasy Idle already guards

- **Clock turned back:** play carries on from the new time and every timer is clamped (`src/game.js` lines 78–84; `clampTimers` in `src/core/state.js`). Cloud saves measure time away on the server's clock (`src/core/save.js` lines 203–212).
- **Auto-clickers:** a strike within 120 ms of the last is ignored (`src/systems/combat.js` line 414).
- **Prestige spam:** a run needs stage 10 and ten minutes; the per-prestige skill point needs half the best stage (`src/systems/prestige.js`).
- **Shared numbers:** the server reads ranked numbers from the save itself, flags growth beyond an hourly allowance and attack beyond what the best stage allows, and drops flagged accounts from the boards (`api/index.js` lines 160–205).
- **Trade loops:** shop prices leave no buy-low, sell-high loop (`src/data/perks.js` line 26); salvage refunds 75% of the bars put in (`ANVIL_REFUND`).

### 5.2 Open items found for this report

1. **Developer switches on the live site.** `withDevFlags` (`src/main.js` lines 136–140) reads `?dev=1` and `&event=` from any URL. `devUnlockAll` opens every dungeon and the Titan whatever the stage (`src/systems/dungeon.js` lines 85, 303), lets a mini-game start with no opportunity (`src/systems/minigame.js` line 76), and stays in the save until unticked. `forceEvent` runs any weekend event's bonuses (`src/systems/events.js` line 37); Titan's Fury gives +20% combat XP and gold and +10% drop chance. The server checks neither. Fix: honour them only on a local host or behind a build flag, and flag uploads that carry them.
2. **Clock cycling.** Forward, back, forward again: each forward jump replays up to the offline cap (12 hours, 24 with Endurance) and ripens crates. For a single-player game that may be acceptable; for the boards it is not, because their allowance is 60 stages an hour plus 30 (`RANKED`, `api/index.js`). **Measured:** honest play gains about 50 stages in the first 0.5–0.8 hours, so the allowance fits the start, but only about 0.6 stages an hour between hours 100 and 150 (247–249 to 279–280). Late, a cycling player can climb 60–100× faster than honest play unflagged. Fix: an allowance by best stage, from the simulator's envelope (§6, E11).
3. **The agility accounting bug** (§2.4), in the simulator rather than the game.

### 5.3 Checklist for a new system

**[Inference]**
1. **Once-only rewards:** can a prestige, a backup restore or re-entering repeat it?
2. **Clock:** 24 hours forward, back, forward again: does the offline replay pay at the online rate, capped?
3. **Cycles:** can its output buy its input through any chain of conversions? The product of rates round every cycle must stay below 1 (a negative-cycle search over −log(rate) finds any that don't).
4. **Inflatable inputs:** does its reward scale with something cheap to raise (a lucky push of the best stage, farm mode, a low stage)?
5. **Restricted play:** how much does each policy lose without it? Over 2× is mandatory, under 5% dead.
6. **Caps and overflow:** what happens at the cap; do numbers stay finite, and exact below 2⁵³ where counted?
7. **Input rate:** does it pay per click or mini-game, at a bounded rate?
8. **Ranked numbers:** does it change one, and is the server's allowance still right?
9. **Debug paths:** is any part reachable through a developer flag on the live site?
10. **Luck:** is the bad case bounded in time, for the event the player cares about?
11. **Offline summary:** does the welcome-back card show what it did?
12. **Old saves:** a migration, bounds in `src/core/state.js`, a fuzzed-save test.

## 6. The audit plan

### 6.1 Tools first (small, in this order)

- **T1 Batch runner:** `tools/batch.mjs` runs `simulate.mjs` in eight processes over a seed range, a policy and overrides, writing one JSON per run outside git (about 640 runs an hour at 150 hours).
- **T2 JSON output:** the commit hash; every milestone (stages every 10 to 300, tiers, uniques); the run log, the event log of §3.2 and the pity log; time per kind of task; gold by sink. This report's scratch patches are a start.
- **T3 Overrides:** `--set=BALANCE.abyss.dropGrowth:1.52`, as in the scratch copy, so sweeps need no code edits. Constants exported as bare numbers (`PITY_MARKS`) must move into objects first.
- **T4 RNG streams** (§1.3) and **policy parameters** (§2.2), so P6–P10 are flags, not copies of the bot.
- **T5 Report builder:** turns the JSON into the report card of §6.3.

### 6.2 Experiments, in priority order

| # | Experiment | Runs (time) | Measures | Pass / fail |
|---|---|---|---|---|
| E1 | **Baseline:** P1 × 100 seeds; P2–P5 × 30 | 220 (~20 min) | Hours to every tenth stage, tiers, uniques, first prestige; prestiges; falls; gold by sink; time by task | P90/median of hours to stage 200 ≤ 1.15 (now 1.04); no unexplained outlier seed |
| E2 | **Bot QA** on E1's logs, after fixing the agility budget | 0 | Time shares per task; longest stretch away from combat; repeated decisions | No seed above 27% agility; no 2-hour stretch away from a winnable fight |
| E3 | **Exploit and robustness suite** (tests, not seeds) | minutes, plus three 1,000-hour soaks | Dev flags gated; clock cycle; offline vs online over 12 hours from one state; 1,000 fuzzed saves load and tick; 1,000-hour soak; conversion cycles; click and mini-game rates; prestige spam | All pass; offline/online 0.9–1.0; no NaN or Infinity; the soak never stalls |
| E4 | **Policy panel and restricted play:** P1–P10, and P1 and P7 without each of 9 systems, 30 seeds each | ~800 (~1.3 h) | Hours to stages 100/150/200/250; decisions an hour; each system's importance | No policy ≥ 1.5× faster than P1 at every milestone; every system costs ≥ 5% for some policy and ≤ 2× for all; no degenerate loop |
| E5 | **Fun cadence** from E1 and E4 | 0 | §3.2 proxies by phase | §3.4 targets |
| E6 | **Luck:** E1's pity and drought logs, plus "cursed" and "blessed" drop streams (rolls from the worst or best quarter), 30 seeds each | 60 (~6 min) | Pity firings by phase; share of payouts worn; droughts (P50, P90, max) | Pity fires in 5–25% of cycles; ≥ 50% of payouts worn; cursed ≤ 1.5× slower to every milestone; blessed doesn't run away |
| E7 | **Extended OAT:** 25 knobs (below) × −50, −20, −10, −5, +5, +10, +20, +50% × 10 seeds | 2,000 (~3 h) | Elasticities of hours to stages 100–250 and the late pace; regime; spread | Flag \|ε\| > 2, a regime change within ±10%, a response that turns back, a spread that doubles (after ruling out bot stalls) |
| E8 | **Choices:** 30 random perk orders and 30 camp orders × 10 seeds; forked regret at five kinds of decision | ~700 (~1.1 h) | Spread across orders against seed noise; best order's edge; regret | Spread above noise; best order ≤ 1.2× the median order |
| E9 | **Morris screening:** k ≈ 25, r = 10, 5 seeds a point | 1,300 (~2 h) | μ*, σ per knob and measure | Ranks the knobs; the top 5–8 go to E10 |
| E10 | **Regime map:** Latin hypercube over the top knobs, 1,000 runs plus adaptive sampling; a runaway/healthy/dead-end classifier; Sobol through the surrogate if wanted | 1,000–4,000 (1.6–6 h) | Regime boundaries; the shipped values' distance from them | Shipped values ≥ 10% from any boundary |
| E11 | **Leaderboard envelope** from all runs | 0 | Most best stages gained in an hour, by band of best stage, across policies (P99.9) | New `RANKED` allowance: 3× the envelope |

**Knobs for E7 and E9** (DESIGN §5.4): monster HP and attack growth in and beyond the authored stages, the boss multipliers and timer; `goldPerHp`, the combat XP pace, the Abyss drop growth; the token exponent, restart fraction and minimum run, attack per token, the record multiplier; health per defence, the boss and regular gear chances, the pity marks, the tier power ladder and wear levels; the anvil's bar growth, dungeon chests and fragments, the Titan's reward, camp growth and caps, the skill pace factors, the mastery divisor. For P7 and P8 only: the offline hours and the mini-game bonus.

E1–E6 take about two hours of compute on this Mac and answer the owner's four questions at the shipped values: runaway, dead ends, dominant strategies, bounded luck. E7–E10 (8–12 hours, overnight) show how close those values sit to trouble.

### 6.3 How to report

**[Inference]** One page per build, generated by T5 and kept beside DESIGN §5.5:
1. Header: commit, date, seeds, policies.
2. Traffic lights for the pass/fail rules above.
3. A fan chart of best stage against hours (P10, median, P90) for P1, with P2–P5 as median lines.
4. The milestone table: median and P10–P90, Kaplan–Meier where seeds fall short, and how many seeds got there.
5. The difference from the last accepted baseline with 95% intervals; a change counts only if its interval excludes zero.
6. When run: a tornado chart of E7's elasticities and E9's μ*/σ plot.
7. The cadence table (§3.3), the luck table (§4.3) and the exploit suite's results.
8. Bot issues found.

Keep every run's JSON for a month and the accepted baseline's summary in the repository.

## 7. Gaps

- **Search budget.** The session's web-search quota ran out partway; later sources came from direct fetches. GDC coverage is thin: I confirmed session pages (Meier 2012), not slides, and found no GDC talk on simulation-driven balance of idle games. Fandom, Liquipedia, the Melvor wiki, ACM and some publishers refused the fetcher, so facts from them are marked (snippet) or left out (among them Dota 2's published pseudo-random constants).
- **Not found:** a published formula for WoW Legion's legendary bad-luck protection; Machinations' guidance on run counts; Supercell's balance thresholds.
- **Unvalidated proxies.** Nothing in §3 has been checked against Fantasy Idle's players; the evidence base is a café, a maths game and a laboratory arcade game. A small playtest is the next step.
- **One bot.** Every measured figure comes from the sensible policy, whose own rules shape it, the agility bug included. The variant experiment covered two knobs; the event and pity logs are prototypes in a scratch copy.
- **Moving code.** A commit landed during the work: the 24-seed table is on 9761163, everything else on b712b0f.
