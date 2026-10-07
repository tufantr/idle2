# Session design, retention and player types in idle games, applied to Fantasy Idle

Research note C, 7 October 2026. It builds on two earlier notes and does not repeat them:
`docs/research_notes/Fantasy Idle game design research/active_play_offline_retention.md` (active vs idle
balance; offline rules of Melvor, Cookie Clicker, Trimps, Antimatter Dimensions and others; onboarding;
achievements; daily loops) and `docs/research_notes/first-session.md` (the first minutes, deltaDNA's
first-session data, Tap Titans 2's opening). Where a fact is already there, this note points to it.

**How the evidence was gathered.** Benchmark reports (GameAnalytics), conference slides (Kongregate's
Anthony Pecorella, GDC 2015 and 2016), papers (a 1,972-player survey of Neko Atsume, a 2025 diary
study of idle players, a 2019 analysis of eleven idle games), developer write-ups (Kolibri Games, AFK
Arena), Steam discussions and game data tables. Reddit and fandom wikis could not be read, and the
web-search budget ran out part way, so later sources were fetched by address. Facts seen only in a
search summary are marked **(snippet)**. Two measurements are my own: Steam's public review data for
nine idle games (sections 1 and 4), and runs of a copy of `tools/simulate.mjs` with login schedules
(section 6; the repository was not changed). The scripts and raw results sit beside this note, in
`C_steam/` and `C_sim/` (see `C_sim/README.txt`). **[Inference]** marks my reasoning.

## Summary

1. **Idle players come back often and briefly.** Mobile idle players average 5.3 sessions a day of
   about 8 minutes; the top tenth of idle games get 5.8 sessions and 35 minutes a day. Two thirds of
   Neko Atsume players check it many times a day, often for seconds.
2. **PC is different: fewer, longer sessions, and the game is often left open.** The median PC game
   session is 18 minutes, 1.7 times a day. Among recent Steam reviewers of seven idle games, 5–22% had
   the game open 12 hours a day or more, and 32–59% under an hour a day.
3. **The audience is core gamers who want Completion and Power** (Quantic Foundry: 70% core, 20%
   hardcore). Players differ less in what they want than in when they can act.
4. **A good return shows what changed and offers a decision.** All eleven idle games in one study
   highlight the change on return. Pecorella: with offline progress, every return is a celebration,
   appointment mechanics become unnecessary and even daily rewards go unused.
5. **Offline caps cluster at 8–24 hours, at full rate in RuneScape-likes.** Melvor's cap rose from 12
   to 18 to 24 hours amid complaints; AFK Arena's 12-hour chest is built for two visits a day.
   Pecorella left Egg, Inc. over its 2-hour cap.
6. **Retention.** Top idle games keep 39–46% of players to day 1, against a mobile median near 22%;
   top idle clickers kept 15–20% to day 30 (2017). PC medians are far lower (day 1 about 7%).
7. **Players leave in the mid-game, not the first hour.** In 4,562 negative Steam reviews of nine
   idle games, the top complaint is slow progress, grind or walls (22%), written at a median of 93
   hours. Complaints about events and pay-to-win come from veterans of free-to-play idlers.
8. **Daily loops that bank and never punish are the norm among well-liked idlers.** Long daily lists
   draw complaints that the game has become a chore (IdleOn).
9. **In Fantasy Idle's simulator, the gap between player types comes from the Auto-prestige gate, not
   the offline cap.** Always-online play earns Auto on day 1, three check-ins a day on day 7.5, one
   visit a day never within 14 days. Before Auto, 86–97% of a check-in player's time away is spent at
   the wall.
10. **Recommendations:** seven login schedules in the simulator, with targets; Auto within about
    three days for anyone who visits daily (e.g. after 3–5 prestiges); a 24-hour base cap or an early
    Endurance; an optional order for when the fight stalls; a return screen that leads with decisions.
    Keep the crate as it is.

## 1. Session patterns

**Mobile idle games (facts).**
- GameAnalytics: idle players play **5.3 sessions a day** (hyper-casual 4.6) of **about 8 minutes**,
  with a DAU/MAU of 18% (hyper-casual 10.5%) ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game),
  updated March 2025; first reported December 2020 by [Game World Observer](https://gameworldobserver.com/2020/12/22/gameanalytics-names-benchmark-engagement-metrics-idle-games)).
  Top 25% of idle games: 5.03 sessions, 6-minute sessions, 21 minutes a day; top 10%: 5.82 sessions,
  7 minutes, 34.9 minutes a day. No sample size or period is given.
- All mobile games in 2024 (11,600 games): median session 5–6 minutes (top quarter 8–9), median 4
  sessions a day (mid-core 6–7), median 22 minutes a day ([GameAnalytics 2025 report](https://files.gameindustrylibrary.com/documents/mobile-gaming-benchmarks-2025.pdf)).
  In 2025 the medians were 3.1–3.5 minutes, 3.8–3.9 sessions and about 12 minutes a day
  ([GameAnalytics 2026 report](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)).
- Idle Miner Tycoon sessions last about ten minutes on average ([Kolibri Games, eight lessons](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
  Kolibri's playtests imitated real idle play with three 15-minute sessions two hours apart
  ([PlaytestCloud case study](https://start.playtestcloud.com/case-studies/kolibri-games)).
- Neko Atsume, where progress happens only while the game is closed, surveyed 1,972 players
  (recruited on a forum, so keen players are over-represented): 67.5% check it many times a day, 29.0%
  a couple of times a day, 1.6% once a day, 1.3% every few days. Sessions often last seconds. The
  largest group (33.7%) opens the collection screens only every 3–5 sessions: many quick glances and an
  occasional deeper visit ([Cutting, Gundry and Cairns 2018](https://ray.yorksj.ac.uk/id/eprint/7953/)).
- AFK Arena's chest stops filling at 12 hours, a design that asks for two visits a day, morning and
  evening ([Jesuha 2020](https://gamedeveloper.com/design/flexible-time-session-design-in-afk-arena)).

**PC (facts).**
- The median PC game in 2025: 18-minute sessions, 1.65–1.70 a day, 32–33 minutes a day, DAU/MAU 4–5%
  ([GameAnalytics 2026](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)).
- In a diary study of 40 players (Egg, Inc. on mobile and a farming idle game on PC, against casual
  games), the mobile idle group played longest and its play time grew most over the days. PC players
  (idle and casual) looked for new features from day one and complained of slow progress sooner;
  mobile players set their own goals ([Hwang 2025, UC Santa Cruz](https://escholarship.org/uc/item/0b07v51w)).
- **My measurement: how long Steam idle games stay open.** Steam's public review data gives each
  reviewer's hours in the game over the last two weeks. Among the last 1,000 reviewers of each game who
  had played in those two weeks (fetched 7 October 2026):

| Game | Reviewers active | Median h in 2 weeks | Under 1 h/day | 1–4 h/day | 4–12 h/day | 12 h/day or more |
|---|---|---|---|---|---|---|
| Melvor Idle | 348 | 23 | 41% | 30% | 23% | 7% |
| NGU Idle | 360 | 54 | 32% | 20% | 26% | 22% |
| Legends of IdleOn | 452 | 20 | 44% | 23% | 17% | 17% |
| Cookie Clicker | 694 | 21 | 43% | 31% | 21% | 5% |
| Clicker Heroes | 169 | 5 | 59% | 20% | 15% | 7% |
| Idle Champions | 200 | 24 | 43% | 18% | 18% | 20% |
| Antimatter Dimensions | 141 | 11 | 50% | 26% | 18% | 6% |

  Steam counts the time a game is open, not attended, and reviewers are keener than most players.
  Median lifetime hours among recent reviewers run from 48 (Clicker Heroes) to 734 (NGU Idle).

**Share of progress made offline.** No published measurement was found. Pecorella argues that offline
gains grow linearly while costs grow exponentially, so waiting alone loses value over time, and that
quick check-ins pay because each lifts the growth curve ([GDC 2015 slides](https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367)).
In Fantasy Idle's simulator, a player who checks in three times a day makes 97–100% of kills and
72–93% of skill XP while away (section 6).

**[Inference]** On mobile, a session is a 1–8 minute visit about every three hours of the waking day
(5–6 visits over ~16 hours). On PC, many players leave the game open for hours and glance at it. The
simulator's player, online and deciding all day, matches the 5–22% of Steam players who keep the game
open twelve hours or more, not the plurality who have it open under an hour a day.

## 2. Player archetypes and what each needs

**Facts.**
- Quantic Foundry surveyed players of Clicker Heroes, AdVenture Capitalist and Crusaders of the Lost
  Idols: about 70% call themselves core gamers, 20% hardcore, 10% casual. Their top motivations are
  **Completion and Power**, the lowest Excitement and Fantasy, and they over-index on Diablo III,
  Fallout 4, The Elder Scrolls Online and EVE. The authors read idle clickers as RPG power progression
  with everything else stripped away ([Quantic Foundry 2016](https://quanticfoundry.com/2016/07/06/idle-clickers/)).
  Pecorella's lesson: these players want to collect, complete and grow in power, so make the growth
  felt and build collection into the mechanics ([Quest for Progress, GDC Europe 2016](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)).
- The Neko Atsume survey found four separate kinds of engagement: time spent playing, direct
  sociability, social-media sociability and checking frequency. Social activity was not correlated
  with in-game achievement or with how often players checked; the authors suggest treating idle play as
  a habit ([Cutting et al. 2018](https://ray.yorksj.ac.uk/id/eprint/7953/)).
- Hwang's interviewees liked games with no penalty for being away, yet said that with nothing at stake
  they felt less attached; one recalled a game whose neglected crops died. Players who added their own
  social layer (sharing finds, racing friends) were more engaged ([Hwang 2025](https://escholarship.org/uc/item/0b07v51w)).
- Clicker Heroes supports idle and active builds, and its developer says many players switch between
  them ([Clicker Heroes blog 2025](https://blog.clickerheroes.com/idle-vs-activate-gaming-in-clicker-heroes-which-playstyle-is-best-for-you/)).
- IdleOn shows both ends of a routine: one player values a 30–40 minute morning session and then
  forgetting the game **(snippet)**; another found it a list of daily chores rather than a game
  ([Steam, 2021](https://steamcommunity.com/app/1476970/discussions/0/2953788788212275468/)); a third
  praises it for never forcing daily play ([Steam, 2024](https://steamcommunity.com/app/1476970/discussions/0/4635986619924579483/)).
  Its optimisers rely on community tools, an efficiency site and an auto-review tool ([Steam, 2025](https://steamcommunity.com/app/1476970/discussions/0/603020374162073676/)).
- Melvor players say Township, a passive income system, made 5–7 other skills pointless from the
  mid-game; it was reworked after a review backlash ([Steam](https://steamcommunity.com/app/1267910/discussions/0/3823048293516778888/)).

**Archetypes for Fantasy Idle.** Bartle's four types (achievers, explorers, socialisers, killers) are
the classic frame; for an idle game the useful split is by schedule and by goal.

| Type | Evidence | Needs from a session | Risk to watch |
|---|---|---|---|
| **Check-in player** (3–6 visits a day, 1–8 min) | GameAnalytics, Neko Atsume, AFK Arena | One screen of what changed; one to three decisions; nothing lost by being away for a night | Time away wasted at a wall; chores on every visit |
| **Once-a-day or lapsing player** | Neko Atsume 3.6% (forum sample); Steam's under-an-hour group | A cap that covers a day; banked rewards; no streaks; a catch-up summary | The cap; streaks; a long list of missed things |
| **Tab-open player** (PC, hours open) | Steam: 5–22% open 12 h a day | Something to glance at; offline equal to online; no penalty for not clicking | Online-only rewards that force the tab open |
| **Active player** (clicks, mini-games) | Clicker Heroes active builds; Hwang | Bonuses that are felt but bounded (≤1.5–2× idle, earlier note) | Making active play mandatory |
| **Optimiser** | Community calculators for IdleOn and Clicker Heroes | Visible numbers, previews, depth | Optimal play turning into chores |
| **Collector** | Quantic Foundry's Completion; Neko Atsume's rare cats | Collections that show progress; rare finds | A collection that needs one activity for weeks |
| **Social player** | Neko Atsume's social factor; Hwang | Shared goals that never need a fixed time | Clan goals that punish the absent |

## 3. What makes a 1–5 minute check-in satisfying

**Facts.**
- **The return pattern.** An analysis of eleven idle games (Tap Titans 2, Clicker Heroes, Egg, Inc.,
  Cookie Clicker, Realm Grinder and others) found a cycle of active play, time away and a rewarding
  return. All eleven highlight how the game changed while the player was away. Some add time-limited
  content; some halt progress, as when Clicker Heroes' heroes reach zones too hard for them, which
  pushes players to return often ([Villareale et al. 2019](https://par.nsf.gov/servlets/purl/10188033)).
- **Pecorella on the return.** Offline progress makes each return a celebration, and the longer the
  absence, the bigger the reason to come back; forced appointments become unnecessary and even daily
  rewards go unused ([GDC 2015](https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367)).
  His options for offline design: calculate it the same as online, let players choose online or
  offline play, and let exponential costs act as a soft limit ([Idle Chatter, GDC 2016](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260)).
  Limited offline time creates a point to sell and pressure to be active; unlimited time softens slow
  stretches and makes returns more exciting; moving backwards is very punishing ([The Rise and Rise of Idle Games](https://www.slideshare.net/slideshow/the-rise-and-rise-of-idle-games-68916528/68916528)).
- **Disappointment is the failure mode.** A diary-study player kept a tab open to gather the most and
  was badly let down by how little the collection gave and how little it could buy ([Hwang 2025](https://escholarship.org/uc/item/0b07v51w)).
- **Designs by game.**
  - *Egg, Inc.:* Pecorella called its 2-hour offline cap a mistake: "I churned out myself largely
    because of this" ([Quest for Progress](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)).
    Away time is now stored in silos: one hour each, 2 silos on the standard permit and 10 on the pro
    permit, up to +2 hours a silo from research; the standard permit earns offline at half rate
    **(snippet)** ([wiki](https://egg-inc.fandom.com/wiki/Grain_Silo)).
  - *AFK Arena:* the chest holds 12 hours; one free fast reward a day pays 2 hours at once **(snippet)**
    ([guide](https://gamerempire.net/afk-arena-guide-tips-tricks-strategy/)); daily quests pay 10–20
    points toward a 100-point goal, with more on offer than needed, so each player builds a routine
    ([Jesuha 2020](https://gamedeveloper.com/design/flexible-time-session-design-in-afk-arena)).
  - *Melvor Idle:* up to 24 hours, with no difference from online play except that the action cannot
    be changed, followed by a summary ([Melvor wiki](https://wiki.melvoridle.com/w/Offline_Progression)).
    The cap was 12 hours, 18 by March 2022, 24 now. A March 2022 thread complains that the cap forces a
    daily visit to every save; replies defend it (load time, balance) and call 2–24 hours normal for the
    genre ([Steam](https://steamcommunity.com/app/1267910/discussions/0/3192493998739513526/)).
  - *Others:* Idle Clans 12 hours, up to 24 with upgrades; Milky Way Idle about 10 hours (from a
    competitor's comparison page, which also claims, without data, that unlimited offline time teaches
    players to skip days) ([Tideward](https://tideward.app/offline-progression/)); MergeCiv 12 hours plus
    a speed-up bank that refills one charge every 6 hours ([MergeCiv](https://mergeciv.io/idle-progression)).
    Cookie Clicker's 1 hour at 5% is in the earlier note.
- **How much players complain.** About 6% of negative Steam reviews of nine idle games mention offline
  or AFK limits (Melvor 10%); see section 4.

**[Inference] A satisfying 2-minute check-in has three beats:**
1. *See* (5–10 s): what happened, in pictures: gains, the new best stage, falls, where the run stopped.
2. *Decide* (30–90 s): one to three choices that change the next hours: prestige or not, which skill
   runs next, the Titan, the crate, a ▲ item.
3. *Leave a plan* (10 s): what runs while away, with the promise kept on the next return.

A return should never be empty, and never a list of ten chores. Caps of 8–24 hours at full rate are
the genre norm; below about 8 hours a cap is felt as a chore (Egg, Inc.; Melvor at 12 and 18).

## 4. Retention benchmarks and churn points

**Benchmarks (facts; all in the numbers table at the end).**
- Idle games: day 1 39.4% (top quarter), 45.6% (top tenth) ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game)).
  Top idle clickers in 2017, from AdVenture Capitalist and Kongregate data: day 1 50–70%+, day 7
  30–40%+, day 30 15–20%+ ([Chiu, Casual Connect 2017](https://www.slideshare.net/DavidPChiu/idle-clicker-games-presentation-casual-connect-usa-2017)).
  Idle Miner Tycoon tested at day 1 63–81%, where Kolibri puts most games near 40% ([Kolibri](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
- All mobile games, 2025: day 1 median ~22%, day 7 under 4%, day 30 0.7–0.8%; the top 1% reach
  64–68%, over 25% and 13–15%. PC: day 1 median ~7%, day 7 1.1–1.3%, day 30 0.2–0.25%
  ([GameAnalytics 2026](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)).
- GameAnalytics reads day 1 as onboarding, day 7 as the core loop's appeal and day 28 as content
  pacing, where low numbers mean repetition or stagnation ([2025 report](https://files.gameindustrylibrary.com/documents/mobile-gaming-benchmarks-2025.pdf)).
- Vendor blogs give idle soft-launch bands of 35–45% / 15–20% / 5–10% (days 1 / 7 / 30) without a
  source **(snippet)** ([Game-Ace](https://game-ace.com/blog/idle-game-development/)).

**Churn points (facts).**
- *First session:* see `first-session.md` (deltaDNA: about 20% lost in the first two minutes).
- *The first bottleneck:* Idle Miner Tycoon players who reached the second mine shaft churned far
  less; many stalled before it because they upgraded mines but not the elevator and warehouse.
  Contextual tutorials at the bottleneck cut churn and negative reviews ([PlaytestCloud](https://start.playtestcloud.com/case-studies/kolibri-games)).
- *Going backwards* is very punishing and against the genre ([Pecorella 2016](https://www.slideshare.net/slideshow/the-rise-and-rise-of-idle-games-68916528/68916528)).
- *Nothing new:* PC players in the three-day diary study lost interest early when nothing new
  unlocked; one called the PC idle game fun only while new crops kept arriving ([Hwang 2025](https://escholarship.org/uc/item/0b07v51w)).
- *Caps and obligations:* Pecorella's exit from Egg, Inc.; a Melvor player who stopped because 18 hours
  of offline progress was not reason enough to come back ([Steam](https://steamcommunity.com/app/1267910/discussions/0/3192493998739513526/)).
- *How long people stay:* in the Neko Atsume sample, 38.9% had played 2–4 weeks, 24.9% 1–3 months and
  10.8% over three months ([Cutting et al. 2018](https://ray.yorksj.ac.uk/id/eprint/7953/)).

**My measurement: what negative Steam reviews complain about.** Up to 600 of the most helpful English
negative reviews of each of nine idle games (4,562 in all), sorted into keyword groups. Keyword counts
are crude: a review can fall in several groups, or be missed.

| Complaint (keywords) | Share of negatives | Highest in | Median hours at review |
|---|---|---|---|
| Slow, grind, wall, stuck | 22% | Idle Slayer 35%, Leaf Blower Revolution 32% | 93 |
| Pay-to-win, monetisation | 15% | IdleOn 62%, Idle Champions 27% (others 0–8%) | 1,219 |
| Boring, repetitive | 12% | Antimatter Dimensions 19% | 44 |
| Reset, prestige | 8% | Idle Slayer 17%, Leaf Blower Revolution 15% | 55 |
| Events, FOMO, limited time | 7% | IdleOn 25%, Idle Champions 18% (others 0–4%) | 2,430 |
| Offline, AFK | 6% | Leaf Blower Revolution 11%, Melvor 10% | 125 |
| Must play actively | 6% | Idle Slayer 17%, Melvor 8% | 122 |
| Chores, dailies | 3% | IdleOn, NGU, Idle Champions 4–5% | 196 |

Only 4–18% of each game's negative reviews were written in the first two hours; the median negative
review comes after 30–150 hours (IdleOn after 2,295).

**[Inference]** The first session filters, but the reviews that hurt come from the middle: walls and
grind at tens to a hundred hours, then veteran burnout from events and spending in free-to-play
idlers. Fantasy Idle's likely churn points: the first return (the offline promise must hold), the first
wall before the first prestige, the prestiges before Auto for players who visit rarely (section 6), the
waits for gear tiers, and the slow deep Abyss (about a stage an hour, DESIGN §5.3).

## 5. Daily and weekly loops

**Facts.**
- Among the top 200 grossing US iOS games in 2019, daily gift systems were common in every category
  and set the best performers apart; quest layers were common in mid-core; loops longer than a day
  were almost absent from casual and casino games ([GameRefinery](https://www.gamerefinery.com/keep-your-players-in-game-with-appointment-mechanics/)).
  95% of the top 40 Korean mobile games use login rewards ([Lee et al. 2025](https://arxiv.org/pdf/2504.10714)).
- **Tap Titans 2's data tables:** a 14-day login cycle (gold, diamonds, equipment, eggs, skill points
  on days 9 and 13); extra login rewards on the 8th, 15th, 22nd and 30th login day; and nine active
  daily achievements, among them one prestige, five fairies, one video and 20 equipment drops, each paying
  diamonds or raid tickets ([TT2_CSV](https://github.com/rawrzcookie/TT2_CSV): `DailyRewardsInfo`,
  `PlayerLoginDualTrackRewardsInfo`, `DailyAchievementInfo`).
- **IdleOn:** five gathering mini-game plays a day, about 3 minutes in all ([Steam](https://steamcommunity.com/app/1476970/discussions/0/2953788788212275468/));
  daily timers run on a rolling 24 hours, so a routine drifts until a day must be skipped **(snippet)**.
- **NGU Idle's daily spin** banks 36 hours, up to 7 days with an upgrade (earlier note).
- **Events:** Kolibri updates Idle Miner Tycoon weekly, and its event mines often double a weekend's
  revenue ([Kolibri](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games));
  limited-time events raised AdVenture Capitalist's purchases and ad revenue ([Chiu 2017](https://www.slideshare.net/DavidPChiu/idle-clicker-games-presentation-casual-connect-usa-2017)).
- **Backlash** gathers where events and spending meet: 25% of IdleOn's and 18% of Idle Champions'
  negative reviews mention events or FOMO, against under 5% for Melvor, Antimatter Dimensions, Cookie
  Clicker and Clicker Heroes (section 4). Chores and dailies: 3% overall.
- Pecorella: with offline progress, appointment mechanics are unnecessary and daily rewards go unused
  ([GDC 2015](https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367)).

**[Inference] How often to give a reason to return.** Successful idlers layer clocks: seconds to
minutes (visitors, mini-games; TT2's fairies every ~2 minutes), hours (active skills on cooldowns of
5 minutes to a few hours, per Pecorella; TT2's egg every 4 hours; the offline cap), a day (a crate,
quests), a week (an event). Each layer banks or can be ignored without loss. Fantasy Idle has every
layer: mini-games every 3–6 minutes, the Titan hourly, a 12-hour cap, a crate every 20 hours banking
three, weekend events with a daily token cap. The only clock that punishes absence is the cap, and
section 6 shows the Auto gate punishes it more.

## 6. Measured in Fantasy Idle: the simulator with login schedules

**Method.** A copy of `tools/simulate.mjs` in a scratch folder (the repository is unchanged), with the
same sensible-player policy and the game's own offline replay (`game.tick` across the gap, 12-hour
cap). Each day has a login schedule in UTC; every player arrives at 08:00 on day 0 for at least 20
minutes. On each return the bot claims crates, prestiges if the run pays a fair share (the bot's own
threshold, without its 20-minute stall rule, since the run had hours), takes the Titan if awake, makes
its usual decisions, and before leaving sets the fight running when Auto is on, a run has just started
or the run is below 90% of its best (otherwise it leaves its own task). No clicks or mini-games; Auto
is switched on once earned. Three seeds, 14 days each; ranges are over seeds.

| Schedule | Visits | Online per day |
|---|---|---|
| online | always (the current simulator) | 24 h |
| tab16 | open 08:00–24:00 | 16 h |
| evening | 5 min at 07:30 and 12:30, 2 h from 19:00 | 2.2 h |
| checkin5 | 6 min at 08, 11, 14, 17, 21 (GameAnalytics-like) | 30 min |
| checkin3 | 5 min at 08, 13, 21 | 15 min |
| checkin2 | 10 min at 08 and 20 (AFK Arena rhythm) | 20 min |
| daily1 | 15 min at 20:00 | 15 min |
| alt2 | 20 min every other day | 10 min |

**Result A: pace over 14 days, current rules (Auto after 20 prestiges, 12-hour cap).**

| Schedule | Auto earned (day) | Stage 150 (day) | Stage 200 (day) | Top weapon tier (day) | Best stage, day 14 | Skill levels (sum), day 14 | Hours lost to the cap per day |
|---|---|---|---|---|---|---|---|
| online | 1.0–1.1 | 1.1 | 2.1–2.3 | 2.1–2.3 | 330–339 | 780–782 | 0 |
| tab16 | 1.3–1.4 | 1.3–1.4 | 2.3–2.5 | 2.3–2.4 | 340 | 749–752 | 0 |
| evening | 3.9–4.3 | 3.8 | 4.8–5.3 | 4.3–4.8 | 320–329 | 553–557 | 0 |
| checkin5 | 4.6–4.7 | 3.5–4.5 | 5.3–5.5 | 3.3–4.6 | 300–328 | 479–490 | 0 |
| checkin3 | 7.3–7.5 | 5.5–5.9 | 8.3–8.5 | 4.3–6.3 | 300–309 | 375–395 | 0 |
| checkin2 | 10.3–11.3 | 6.3–6.8 | 11.8–12.3 | 4.8–6.8 | 260–270 | 399–404 | 0 |
| daily1 | never (13–14 prestiges) | 11.8–12.8 | never | 9.8–12.8 | 156–158 | 323–337 | 10.9 |
| alt2 | never (6–7 prestiges) | never | never | not reached | 129–137 | 215–237 | 16.4 |

**Result B: where the time away goes before Auto.** The same schedules with the absence played in
5-minute steps (the rules of the offline replay), to see when the run last reached a new stage; seeds
1–2. After a check-in the run climbs for 20–60 minutes on average (checkin3, checkin2), then holds the
wall:

| Schedule (first 7 days) | Absences with the fight left on | Climbing | At the wall | Lost to the cap |
|---|---|---|---|---|
| checkin3 | 20 | 13–14% | 86–87% | 0 |
| checkin2 | 12 | 3–5% | 95–97% | 0 |
| daily1 | 6 | 2–16% | 41–56% | 43% |
| evening | 12 | 19–29% | 71–81% | 0 |

**Result C: what-ifs** (each a change to the copy, not to the game).

| Change | checkin3 stage 200 (day) | checkin2 stage 200 | daily1 | alt2 best, day 14 |
|---|---|---|---|---|
| Current (Auto after 20, cap 12 h) | 8.3–8.5 | 11.8–12.3 | never (best 156–158) | 129–137 |
| Cap 24 h only | | | never (best 160) | 140 |
| Auto after 3 prestiges | 2.9–3.3 | 4.3–4.8 | day 6.8–7.8 (best 280–310) | 177–238 |
| Auto after 3 and cap 24 h | | | day 4.8–7.8 (best 310–319) | 259–260 |

With Auto after 3 prestiges, checkin5 reaches stage 200 on day 2.3–2.5, the same as the 16-hour tab
player, and earns Auto on day 0.7.

A fourth what-if, a **stall fallback** (current rules; once the fight has gone 30 minutes without a
new stage, the hero leaves it and trains his weakest skill for the rest of the absence; absences
played in 5-minute steps as in Result B, so the "fight left on" rows differ slightly from Result A;
seeds 1–2):

| Schedule | Best stage, day 14 | Skill levels (sum) | Stage 100 (day) | Top weapon tier (day) |
|---|---|---|---|---|
| checkin3, fight left on | 300–309 | 389–397 | 1.9–2.3 | 5.5–7.5 |
| checkin3, fallback | 300 | 543–588 | 3.3–3.5 | 7.9–8.3 |
| checkin2, fight left on | 270 | 398–402 | 1.8 | 4.3 |
| checkin2, fallback | 267–270 | 569–571 | 3.3–3.8 | 11.3 |
| daily1, fight left on | 158–160 | 298–301 | 2.8 | 7.8–11.8 |
| daily1, fallback | 130–139 | 441–518 | 3.8–4.8 | not reached |

Time at the wall is not wasted: since gear comes from the fight, the wall pays the drops and combat XP
that break it. Leaving it buys 40–70% more skill levels and costs a day or two on early stages and up
to a week on the top weapon tier.

**Result D: what a return offers** (share of returns after an absence; current rules unless noted).

| Schedule | Returns | At least one thing to do | Nothing new, nothing to do | Crate ready | Titan awake | Prestige worth taking | Better gear in the bag | New best stage | A medal |
|---|---|---|---|---|---|---|---|---|---|
| checkin5 | 69 | 100% | 0% | 25% | 100% | 28–29% | 72–94% | 28–36% | 12–14% |
| checkin3 | 41 | 100% | 0% | 41% | 100% | 49% | 90–95% | 39–54% | 20% |
| checkin2 | 27 | 100% | 0% | 59% | 100% | 67–70% | 89–96% | 33–48% | 15–19% |
| daily1 | 14 | 100% | 0% | 100% | 100% | 79–86% | 93% | 36–57% | 36–50% |
| checkin3, Auto after 3 | 41 | 100% | 0% | 41% | 100% | 7% | 95–98% | 34–46% | 20–22% |

No return was empty, and no hero stopped for lack of materials (the fight was left running). With
early Auto, a prestige worth taking appears on only 4–21% of returns, because Auto already took it;
the return then rests on the Titan, the crate, gear and the farm. The crate bank works for everyone:
every schedule claimed 17 crates in 14 days, the most the 20-hour clock allows.

**Findings ([Inference] from the measurements).**
1. Players who visit two to five times a day end 14 days at 77–99% of the always-online best stage,
   but reach stages 150 and 200 two to six times later in calendar days, and their skills lag (half to
   two thirds of the summed levels), because only one activity runs while away and the fight takes it.
2. The gate is the problem, not the cap. Auto needs 20 prestiges; a returning player prestiges about
   once a visit, so it takes about 20 visits: a day online, a week at three visits a day, never at one.
   Until then the run stalls 20–60 minutes after each visit and 86–97% of the absence is spent at the
   wall, earning drops but no new stages or tokens. Raising the cap alone changes almost nothing for
   stage; with early Auto, a 24-hour cap helps the once-a-day and every-other-day players.
3. Every return already offers something, but it leans on the hourly Titan and on equipping ▲ gear,
   which is upkeep more than choice.

## 7. Recommendations for Fantasy Idle

### 7.1 Player types to add to the simulator

Add a `--player=<type>` option to `tools/simulate.mjs` that sets a login schedule and a few behaviour
rules (the schedule and return-count code in `C_sim/loop_sessions2.mjs` can be lifted). Keep the
current policy as the always-online reference.

| Type | Schedule (UTC) | On each return | Leaves running | Clicks and mini-games | Why |
|---|---|---|---|---|---|
| `online` (current) | always | decisions every ≤10 min | — | none | The ceiling; Steam's 5–22% |
| `tab` | open 08:00–24:00; decisions every 30 min while open | current policy | the fight | none | PC players who leave a tab open |
| `evening` | 5 min at 07:30 and 12:30; 19:00–21:00 active | current policy; in the evening strikes 3 times a second and plays every mini-game at an 80% win rate | the fight, or a skill if the run is stalled and Auto is off | evening only | The engaged hobbyist; bounds the active advantage |
| `checkin5` | 6 min at 08, 11, 14, 17, 21 | crate, prestige if worth it, Titan if awake, equip, spend, farm, choose | as above | none | GameAnalytics' typical idle player |
| `checkin3` | 5 min at 08, 13, 21 | same | as above | none | Neko Atsume's many-times-a-day checker |
| `daily` | 15 min at 20:00 | same | as above | none | The once-a-day player; tests the cap |
| `lapsing` | 20 min every other day, and a 7-day break in week 2 | same | as above | none | Tests banks, the cap and the comeback |

Optional later: an **optimiser** (`tab` plus prestige timing that maximises tokens per hour) and a
**collector** (`evening`, with tasks that favour uniques, bestiary stars and codex pages). Report for
every type: days to Auto, to stages 100, 150 and 200, to each weapon tier and the first unique; best
stage and summed skill levels at days 3, 7 and 14; the share of time away climbing, at the wall and
lost to the cap; and the return mix (Result D). Seeds 1–3, 14 days.

### 7.2 Targets for each type

These thresholds are my proposals; no published standard exists. They follow the evidence that a
visit about every 12 hours should capture all idle income (AFK Arena, Melvor's equal rates), that
going backwards and wasted waiting drive players away (Pecorella, the Melvor and Egg, Inc.
complaints), and the earlier note's ceiling of about 1.5–2× for active over idle play.

| Target | Measure | Current (measured) | Proposed |
|---|---|---|---|
| T1. Pace for frequent visitors | Days to stage 200, `checkin3` ÷ `tab` | 3.5× (8.3–8.5 vs 2.3–2.5) | ≤ 2× |
| T2. Pace for daily visitors | Days to stage 200, `daily` ÷ `tab` | never in 14 days | ≤ 3× |
| T3. Everyone reaches the automation | Day Auto is earned (it ends the phase when 86–97% of time away is spent at the wall) | 7.5 (`checkin3`), never (`daily`) | ≤ day 3 for any type that visits daily |
| T4. The cap fits a daily rhythm | Hours lost to the cap per day, `daily` | 10.9 | ≤ 4 |
| T5. A return is worth opening | Returns with a decision that is not upkeep (prestige, crate, Titan, a skill choice) | 100% (the Titan carries it) | ≥ 90%, and ≥ 50% with the Titan not counted |
| T6. Active play is a bonus, not a job | `evening` with clicks ÷ without | not measured | ≤ 1.5× on any milestone |
| T7. No style dominates | Best stage on day 14 ÷ `online` | 0.38–1.0 | ≥ 0.75 for `checkin3`, ≥ 0.5 for `daily` |
| T8. Skills keep up | Summed skill levels, day 14, `checkin3` ÷ `tab` | 0.5 (0.72–0.78 with the stall fallback) | ≥ 0.6, if skills should not lag |

### 7.3 Changes to offline and return design, by strength of evidence

1. **Earn Auto by play, not by visits (strongest).** Twenty prestiges cost an always-online player a
   day and a once-a-day player three weeks. Options: Auto after 3–5 prestiges, or after 20 prestiges
   *or* 48 hours since the first prestige, whichever comes first; keep the 10-minute stall rule. The
   what-if with 3 meets T1 and T3 for every type that visits at least twice a day and comes close for
   the daily visitor (Auto on day 2.8–3.8, stage 200 at about 3× the tab player's time). Evidence:
   Results A–C; Pecorella on punishing setbacks. Clicker Heroes halts progress on purpose to bring
   players back, but that pushes visits, which the house rules avoid.
2. **A 24-hour base cap, or Endurance among the first perks (medium).** With early Auto, a 24-hour cap
   lifts the once-a-day player from a best of 280–310 to 310–319 and the every-other-day player from
   177–238 to 259–260, and meets T4. Melvor moved from 12 to 18 to 24 hours under complaint; AFK Arena
   and Idle Clans stop at 12–24. Past the cap, banking the extra time as a later speed-up (Kittens
   Game, Evolve; earlier note) is kinder than raising the cap further.
3. **A return screen that leads with what changed and what to decide (medium).** The welcome-back
   already lists gains. Add, in pictures, where the run stopped and for how long (a bar of climbing
   against time at the wall), then the decisions on the things themselves: the prestige token with its
   payout, the crate, the Titan. Evidence: the state-change pattern in all eleven games (Villareale);
   Hwang's disappointed player. House rule: show facts, not advice.
4. **A second order for when the fight stalls, as a choice (medium to weak).** Let the player leave
   "when the fight stalls, train <skill>", off by default. The what-if shows a real trade, not a free
   win: 40–70% more skill levels (meets T8), but early stages a day or two later and the top weapon
   tier up to a week later, because the wall pays the drops. That makes it a meaningful choice for
   players who care about skills or collections. It needs the offline replay to switch actions once.
   Evidence: Result C; Melvor's one-action limit is its main offline difference from online;
   Pecorella's advice to let players choose how they play.
5. **Bank Titan attempts (weak to medium).** Two or three banked hours, like the crate, so a visitor
   can use the attempts the hours gave them. The Titan is awake on every return, but a 60-second fight
   is half of a 2-minute visit, and daily visitors defeated 11–14 Titans in 14 days against 29–30.
   Evidence: NGU's banked spin, TT2's raid tickets, IdleOn's daily play counts.
6. **Keep the crate exactly as it is.** Twenty hours, three banked, no streak, a great crate every
   seventh opened: every schedule claimed all 17. This matches the evidence on banking and streaks
   (earlier note; Pecorella; the chore complaints).
7. **Keep events bankable.** The weekend's 60-token daily cap means an event never needs more than a
   normal visit; event and FOMO complaints come from games that tie events to spending.
8. **Do not add** streaks, timed offers, online-only rewards (NGU's online-only drops push tabs open)
   or notifications that ask the player to come back. Keep mini-games as opportunities.

### 7.4 Test with people, not only bots

Run a multi-session playtest as Kolibri did: three 15-minute sessions two hours apart, plus a next-day
return. Watch the first return: do players read the welcome-back, find the prestige and the Titan, and
leave a plan? Compare what they do with the `checkin3` return mix.

## Numbers table

| Number | Value | Source |
|---|---|---|
| Idle sessions per day / length | 5.3 / ~8 min (hyper-casual 4.6) | GameAnalytics |
| Idle top 25% / top 10%: sessions, length, minutes a day | 5.03, 6 min, 21 / 5.82, 7 min, 34.9 | GameAnalytics |
| Idle DAU/MAU | 18% (hyper-casual 10.5%) | GameAnalytics |
| Mobile median session, 2024 / 2025 | 5–6 min (top quarter 8–9) / 3.1–3.5 min | GameAnalytics 2025, 2026 |
| Mobile median sessions a day, 2024 / 2025 | 4 (mid-core 6–7) / 3.8–3.9 | GameAnalytics 2025, 2026 |
| PC median: session, per day, minutes a day | 18 min, 1.65–1.70, 32–33 | GameAnalytics 2026 |
| Idle Miner Tycoon session | ~10 min | Kolibri |
| Neko Atsume checks: many a day / a couple / once / every few days | 67.5% / 29.0% / 1.6% / 1.3% | Cutting et al. 2018 (N=1,972) |
| Steam reviewers with the game open ≥12 h a day (2 weeks) | 5–22% (NGU 22%, Melvor 7%) | My measurement |
| Steam reviewers with the game open <1 h a day | 32–59% | My measurement |
| Idle core / hardcore / casual players | 70% / 20% / 10% | Quantic Foundry |
| Idle D1, top 25% / top 10% | 39.4% / 45.6% | GameAnalytics |
| Top idle clickers D1 / D7 / D30 (2017) | 50–70%+ / 30–40%+ / 15–20%+ | Chiu, Casual Connect |
| Idle Miner Tycoon D1 in testing | 63–81% (most games ~40%) | Kolibri |
| All mobile D1 / D7 / D30 medians, 2025 | ~22% / <4% / 0.7–0.8% | GameAnalytics 2026 |
| All mobile top 1% D1 / D7 / D30, 2025 | 64–68% / >25% / 13–15% | GameAnalytics 2026 |
| All mobile D7 top quarter, 2024; D28 | 7–8%; 75% of games under 3% | GameAnalytics 2025 |
| PC D1 / D7 / D30 medians, 2025 | ~7% / 1.1–1.3% / 0.2–0.25% | GameAnalytics 2026 |
| Offline caps | Melvor 24 h at 100% (was 12, then 18); AFK Arena 12 h; Idle Clans 12–24 h; Milky Way ~10 h; MergeCiv 12 h; Egg, Inc. 2 h (2016), now 1 h per silo | Melvor wiki, Steam, Jesuha, Tideward, MergeCiv, Pecorella |
| Negative Steam reviews about slow progress, grind or walls | 22%, median 93 h at review | My measurement (4,562 reviews) |
| Negative reviews written in the first 2 h | 4–18% per game | My measurement |
| Event/FOMO complaints: IdleOn / Idle Champions / others | 25% / 18% / 0–4% | My measurement |
| Fantasy Idle: day Auto is earned, online / checkin3 / daily1 | 1.0 / 7.3–7.5 / never in 14 days | Simulator (section 6) |
| Fantasy Idle: absence at the wall before Auto, checkin3 / checkin2 | 86–87% / 95–97% | Simulator |
| Fantasy Idle: stage 200, online / checkin3 / checkin3 with Auto after 3 | day 2.1–2.3 / 8.3–8.5 / 2.9–3.3 | Simulator |
| Fantasy Idle: share of kills made while away, check-in players | 97–100% | Simulator |

## Gaps

- **No real Fantasy Idle data.** The schedules are assumptions taken from mobile benchmarks and one
  survey. The game has no analytics; an opt-in count of visits per day and session lengths through the
  cloud-save API would replace them.
- **No public numbers on the share of progress made offline, or on how caps change retention.** The
  evidence on caps is complaints and design statements, not experiments.
- **Reddit's r/incremental_games surveys could not be read** (blocked), nor fandom wikis; Egg, Inc.'s
  silo numbers, AFK Arena's fast reward and IdleOn's rolling timers come from search summaries only.
- **Genre retention is thin and old.** GameAnalytics gives idle numbers only for day 1 (top
  quantiles); the day-7 and day-30 idle figures are from 2017 (Chiu) or unsourced vendor blogs. No PC
  idle retention figures were found.
- **The Steam measurements are proxies.** Hours open are not hours attended; reviewers are keener than
  most players; keyword counts miss sarcasm and other languages; the two-week window is at the time of
  fetching, not of the review.
- **The simulator's players are bots.** They never click or play mini-games, so Focus is always on;
  the returning player's prestige and leave rules are mine; the cap, Auto and fallback changes are
  what-ifs run on a copy, not features of the game.
- **Not studied:** notifications (the game has none), comebacks after a long break (the lapsing
  week), and the social player (clans need the server).
