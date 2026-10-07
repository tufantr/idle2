# Keeping hours 10 to 1,000 interesting: how long-running idle games pace new things, and what Fantasy Idle should do

*Research report B, 7 October 2026. It builds on `docs/research_notes/incremental-math.md` (with its addendum on prestige currencies, walls and automated resets), `gear-sources.md`, and `combat_scaling_and_prestige.md` and `social_endgame_and_additions.md` in `Fantasy Idle game design research/`. It does not repeat their growth and prestige formulas, retention benchmarks or endgame catalogue.*

**How to read it.**
- A sentence with a link is a fact from that source.
- **(snippet)**: seen only in a search engine's summary, because the page could not be opened. Treat it as weaker.
- **(review summary)**: a machine-written summary of Steam reviews on vaporlens.app; no sample size is given.
- **Steam %**: the share of a game's Steam players holding an achievement, read on 7 October 2026 from the game's global achievements page.
- **HLTB**: HowLongToBeat player polls, read through isthereanydeal.com on 7 October 2026.
- **[Inference]**: my own reasoning, arithmetic or recommendation.
- Statements by players and developers are paraphrased.
- Fantasy Idle numbers come from the repository and from simulator runs made for this report (§7). No repository file was changed.

---

## Summary

1. **New things get further apart, roughly geometrically.** Long idle games deliver something new within minutes at first, within hours on day one, every few days by week two, then every few weeks to months. Examples of the spacing:
   - NGU Idle's first Titans fall 3–10 days apart, and Evil difficulty comes after 2–3 months.
   - Exponential Idle adds a theory every 1–6 days.
   - Idle Slayer's ultra ascensions come about a month apart.
   - Trimps changes activity every few days until about zone 400–500.

   The very late game runs on real-time drips and developer updates: Cookie Clicker's daily sugar lump, Idle Champions' events every ~3 weeks, Melvor's expansions every 9–11 months, IdleOn's worlds 9–21 months apart.
2. **About 60% of players reach each next big layer.** Steam achievement data from nine long-running idle games give a median of 59% of players moving on from one big layer to the next (35 steps; middle half 49–71%). Antimatter Dimensions goes from 48% at Infinity to 22.5% at Eternity, 12.2% at Reality and 6.0% at The End. The steepest losses come at long, bare stretches inside a layer, not at the new layers.
3. **No source states how long players tolerate a wall, but every marker is in days.**
   - Idle Idol players complained after a couple of days of slow progress.
   - A veteran calls 24–48-hour check-ins healthy, and resets that creep past a week a warning sign.
   - AFK Arena players sometimes sit a week at a wall and then clear 30 levels, with idle rewards to collect twice a day in between.
   - The one hard number: clearer goals and a simpler economy took AdVenture Communist's day-30 retention from 3% to 15%.
4. **The patterns with the best evidence** are:
   - one new system at a time;
   - automation of the old layer as the reward of the new one (Antimatter Dimensions, Synergism, Revolution Idle);
   - challenge runs with permanent rewards;
   - real-time drips and events that give stuck players a fresh fast track;
   - collections and named bosses as visible goals.
5. **What fails:**
   - required active play in an idle game (Melvor's Into the Mist);
   - new content behind the hardest old fight (Into the Abyss);
   - chores redone after every reset (Idle Slayer);
   - day-long waits with nothing else to do (Cookie Clicker's lumps, Revolution Idle's 8 of Wands);
   - late resets that are only waiting (NGU's month-long rebirths).
6. **Late resets stay meaningful when each brings a choice or a new rule**, as with Antimatter Dimensions' glyphs and Celestials, Synergism's push-or-reset decision, Trimps' challenges, and Idle Slayer's ultra ascensions that open new systems. They also stay meaningful when an outer layer pays big again, as Clicker Heroes' transcendence does every 3–4 ascensions. Otherwise the game automates them, usually as the next layer begins.
7. **Fantasy Idle, measured over 500–1,000 simulated hours.**
   - Major moments (new places, uniques, records, ranks, medals, pets, 99s) arrive at:

     | Band | Major moments per hour |
     |---|---|
     | 10–50 h | 0.4–0.6 |
     | 50–150 h | 0.16–0.20 |
     | 150–300 h | 0.03–0.04 |
     | after 300 h | 0.005–0.02 |

   - After hour 150 the longest gaps are 53–157 h.
   - Nothing structural opens after the Abyssal Maw (hours 48–60), and ranks end at hours 116–162.
   - With Auto on, the 25-stage records come at 145, 245, 513 and 891 h. Without Auto, the simulator's player sits at stage 310 from hour ~225.
8. **Offline replay covers 12–25 hours, so an engaged player banks 20–24 game hours a day.** Hour 150 is about day 7, and hour 1,000 is week 6–11. Fantasy Idle's late gaps of 3–6 game days therefore mean a week or more of real check-ins with nothing new.
9. **Targets [Inference].**
   - A major moment at least every 4 h in hours 10–50, every 6 h in 50–150, every 24 h in 150–500, and every 48 h in 500–1,000.
   - Longest gaps of 12 h, 24 h, 72 h and one calendar week in those bands.
   - Something ripe at every check-in.
   - Each structural system no more than ~3× later than the last: the Maw at ~50 h, then something by ~150–200 h, ~500 h and ~1,500 h.
10. **Candidates that fit the house rules [Inference]:**
    - named Abyss strata;
    - two more dungeons before stage 300;
    - Titans that keep falling;
    - ranks past Mythic;
    - an outer Ascension layer near stage 300 that opens one new system per ascension and later gets its own Auto;
    - a ladder of Trials;
    - a completion percentage;
    - an end boss.

    Measure them with a novelty log, a check-in model and `--auto` long runs in the simulator.

---

## 1. Units: what "an hour" means here

Steam counts the time a game runs, attended or not. For idle games, HLTB's polled hours and the hours players quote are therefore game-open hours: a player who leaves the game running logs 24 a day. Many community timings are given as calendar days instead.

Fantasy Idle's simulator hours are game-clock hours, offline time included. Offline replay runs the same code as live play. It is capped at 12 hours, plus 2 per Endurance level (up to six) and 1 from the Zipline, so 25 at most (DESIGN §3.16; `BASE.baseOfflineHours` in `src/core/modifiers.js`).

**[Inference] Calendar equivalents.**

| Game hours | Engaged player (2+ check-ins a day, ~20–24 game h a day) | Once-a-day player, 12-h cap (~13 game h a day) |
|---|---|---|
| 50 | day 2–3 | day 4 |
| 150 | day 6–8 | day 12 |
| 500 | day 21–25 | day 38 |
| 1,000 | week 6–7 | week 11 |

So Fantasy Idle's late game arrives within weeks. Its hours 150–1,000 correspond to stretches such as NGU's first Titans up to Evil, Idle Slayer's first two ultra ascensions, or Synergism's run to the first Singularity. Over those stretches, the games below deliver something notable every few days at most.

---

## 2. Question 1: the cadence of new things

### 2.1 Layered incrementals

**Antimatter Dimensions (AD)**
- **Layers.** Its speedrun ladder has 25 steps: Infinity, the challenges, Break Infinity, Eternity, Eternity Challenges, Dilation, Reality, the Black Hole, seven Celestials, and the end ([speedrun-milestones.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/speedrun-milestones.js)).
- **Gates.** Dilation needs Eternity Challenges 11 and 12 done five times. Reality needs 1e4000 EP and 13 rows of achievements ([h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)).
- **Time to Reality.** The first Reality comes after a week to a month (snippet, [BubbaCow's guide](https://antimatter-dimensions.fandom.com/wiki/BubbaCow's_Antimatter_Dimensions_Guide)). Early Reality runs then take minutes to hours ([Steam](https://steamcommunity.com/app/1399720/discussions/0/3762229949250156723)).
- **A late gate on game time.** One upgrade waits for 100 days of game time after the Black Hole ([reality-upgrades.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/reality/reality-upgrades.js)).
- **HLTB:** 778 h across play styles, 865 h for completionists ([ITAD](https://isthereanydeal.com/game/antimatter-dimensions/info/)).
- **Reviews** praise mechanics that keep unlocking and good automation. They criticise slow stretches and time walls ([review summary](https://vaporlens.app/app/1399720/antimatter_dimensions.md)).

**Synergism**
- **Layers.** Prestige → Transcension → Reincarnation → Ascension → cubes, research, talismans, the Anthill, Corruptions → Singularity ([Miraheze](https://incrementalgames.miraheze.org/wiki/Synergism)).
- **Times.** One player reached Reincarnation in 3.7 h ([Steam](https://steamcommunity.com/app/3552310/discussions/0/807975131067675512/)). Early Ascensions take several days each (snippet). Another player took a bit over a month to the first Singularity; by the 21st, a Singularity run took about an hour ([Steam](https://steamcommunity.com/app/3552310/discussions/0/837249796380196679/)).

**Revolution Idle**
- **Layers.** About fifteen systems in a row: Infinity, Eternity, Dilation, Unity, Trials, Minerals, Elements, Tarot, Artifacts and more ([wiki.gg](https://revolutionidle.wiki.gg/wiki/Guide:Eternity)).
- **Times.** Steam hours to Dilation range from under 100 to ~1,750 ([Steam](https://steamcommunity.com/app/2763740/discussions/0/686367878797177461/)). One player put all content as of December 2024 at about two months ([Steam](https://steamcommunity.com/app/2763740/discussions/0/501685433118247288/)).
- **HLTB:** 370 h across play styles ([ITAD](https://isthereanydeal.com/game/revolution-idle/info/)).

**Exponential Idle**
- Theories open one every ee1000 of f(t).
- A guide estimates 1–6 days per theory and up to a year for endgame graduations to pay off ([guide](https://guide.eylanding.com/Theories-1-to-4.html); [endgame](https://guide.eylanding.com/Theory-9-to-endgame.html)).

### 2.2 Classic prestige games

**Clicker Heroes**
- **Ascension and transcendence.** Players ascend when bosses stop falling near zone 130. They transcend from zone 300, then every 3–4 ascensions that still add Ancient Souls ([Steam](https://steamcommunity.com/app/363970/discussions/0/3194742149931985837); [guide mirror](https://steamah.com/clicker-heroes-comprehensive-guide-v-1-0e11/)).
- **Late runs.** Late ascensions took 54–100 h each, about 10 days near zone 1M, and one transcension lasted ~4.5 months ([Steam](https://steamcommunity.com/app/363970/discussions/0/3596571824764661207)).
- **HLTB:** 827 h across play styles, 1,198 h for completionists ([ITAD](https://isthereanydeal.com/game/clicker-heroes/info/)).

**Realm Grinder**
- **Times.** Reincarnations 22 to 30 take 10–20 h of active play. Trophies take 1–12 days each ([Steam](https://steamcommunity.com/app/610080/discussions/0/1500126447398124311); [Steam](https://steamcommunity.com/app/610080/discussions/0/1480982338950917882)). The first Ascension comes after more than a month, and the second Ascension layer runs about 7× slower ([Steam](https://steamcommunity.com/app/610080/discussions/0/2592234299561245643); [Steam](https://steamcommunity.com/app/610080/discussions/0/3211505894108060394)).
- **Intent.** The developer's diary says new content should carry players over several reincarnations ([diary](https://steamcommunity.com/app/610080/discussions/0/1693785669850820845/?l=english)).
- **Retention.** GameAnalytics credits it with some of the best day-180 retention on the web. It also credits the 100+ trophies with hidden requirements with novelty after months ([GameAnalytics](https://www.gameanalytics.com/blog/exploring-motivation-people-play-games-years)).

**Trimps**
- **Cadence.** A veteran says you never do the same thing for more than a few days, until about zone 400–500. Challenge runs last 1–2 days ([Steam](https://steamcommunity.com/app/1877960/discussions/0/3475108282891671030)).
- **Walls.** The Spire II wall holds for many days ([Steam](https://steamcommunity.com/app/1877960/discussions/0/3361398331724243911)).
- **Universe 2** opens near zone 700, and patches kept moving automation earlier ([patch notes](https://raw.githubusercontent.com/Trimps/Trimps.github.io/master/updates.html)).
- **A quitter's view.** A casual player quit after about two weeks, once the reward stopped mattering ([blog](https://bluelander.bearblog.dev/the-trimps-experiment/)).

**Kittens Game.** No play times were found. Layers arrived by version, and repeatable challenges with rewards came in 1.4.8.3 ([changelog](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/changelog.txt)).

### 2.3 Daily-clock games

**Cookie Clicker**
- **Sugar lumps.** One ripens every 20–24 h ([wiki](https://cookieclicker.wiki.gg/wiki/Sugar_Lumps)). The four minigames need one lump each, so they open within about 4–5 days.
- **Ascensions.**
  - First ascensions took players 59 h to 10 days ([Steam](https://steamcommunity.com/app/1454400/discussions/0/2961669453616398504)).
  - One player's second run reached the first run's point 3.4× faster, 24 h against 81 h ([Steam](https://steamcommunity.com/app/1454400/discussions/0/5077247524964965378)).
  - Later ascensions come every ~10–20 h.
- **The long tail.** Level 10 on every building needs about 1,100 lumps, roughly three years. Feature updates have come about once a year ([version history](https://cookieclicker.wiki.gg/wiki/Version_History)).

**Tap Titans 2**
- Tournaments last 20–24 h ([patch notes](https://gamehive.com/blog/tap-titans-2-v210-patch-notes/)).
- After a prestige, Silent March returns the player to their best stage ([DevLog 8](https://gamehive.com/blog/tt2-devlog-8-player-and-active-skill-reworking/)).
- Raid windows were widened so players need no alarm every six hours ([DevLog 38](https://gamehive.com/blog/tt2-devlog-38-so-much-details-on-v30/)).

**Idle Slayer**
- **First ultra ascension.** It needs 5–10 ultra points ([Steam](https://steamcommunity.com/app/1353300/discussions/0/5704366794249610751/)); one player got there about 57 days in (snippet).
- **Second ultra ascension.** Another player was near it about 32 days after the first ([Steam](https://steamcommunity.com/app/1353300/discussions/0/4418676236153552668/)).
- **What each opens.** The first ultra ascension opens the desert. The second opens rage mode, dark divinities and the village ([Steam](https://steamcommunity.com/app/1353300/discussions/0/4354494400349532964/)).
- **HLTB:** 200 h across play styles, 644 h for completionists ([ITAD](https://isthereanydeal.com/game/idle-slayer/info/)).

### 2.4 Idle RPGs

**Melvor Idle**
- **HLTB:** 1,576 h across play styles, 1,670 h for completionists ([ITAD](https://isthereanydeal.com/game/melvor-idle/info/)).
- **Expansions**, about every 9–11 months after 1.0 in November 2021:
  - Throne of the Herald, October 2022: skills to level 120 (snippet, [GamesPress](https://gamespress.com/Melvor-Idle-Throne-of-the-Herald-DLC-Launches-Today));
  - Atlas of Discovery, September 2023;
  - Into the Abyss, June 2024: Abyssal levels, two skills, skill trees (snippet, [Pocket Gamer](https://www.pocketgamer.com/melvor-idle/into-the-abyss-dlc-expansion)). It is entered by beating Bane with Attack 99 ([outof.games](https://outof.games/news/7168-melvor-idles-next-expansion-is-into-the-abyss-and-introduces-the-harvesting-skill/)).
- The earlier notes cover its mastery-pool checkpoints (10/25/50/95%) and the Cape of Completion.

**Legends of IdleOn**
- **Worlds.** Worlds 3–7 came in May 2021, March 2022, December 2022, February 2024 and November 2025. The gaps of 9.5, 9, 14 and 21 months keep growing ([2022](https://idleon.wiki/wiki/Changelog/2022); [2025](https://idleon.wiki/wiki/Changelog/2025)).
- **Patches.** 11–23 a year: every 1–2 weeks for about five months after a world, then 3–4 quiet months.

**NGU Idle**
- **Early pace.** An active player beat Titan 1 in week 1, Titans 2 and 3 three days apart each, Titan 4 ten days later, and reached Evil at 2.5 months ([Steam](https://steamcommunity.com/app/1147690/discussions/0/3184614758375482009)). A passive player took 10–11 months to Evil.
- **Late pace.** The first Evil Titan fell 10–22 days into Evil ([Steam](https://steamcommunity.com/app/1147690/discussions/0/5251727781294067334)). The last rebirths before the final boss took about a month ([Steam](https://steamcommunity.com/app/1147690/discussions/0/3766731645532196363)).
- **HLTB:** 4,024 h across play styles, 6,760 h for completionists ([ITAD](https://isthereanydeal.com/game/ngu-idle/info/)).

**Idle Champions**
- Events come about every three weeks ([Steam](https://steamcommunity.com/app/627690/discussions/0/1754646299858401512)).
- About nine new champions arrive every two months, with weekly Time Gate pieces to catch up; collecting every champion takes about a year ([Steam](https://steamcommunity.com/app/627690/discussions/0/4033599336912591850)).
- The late game becomes scripted gem farming ([Steam](https://steamcommunity.com/app/627690/discussions/0/4755326480160665251)).

### 2.5 [Inference] The shape

- **Gaps grow geometrically.** Each structural layer comes about 3–10× later than the last: AD's Infinity in hours and Reality in weeks; NGU's Titans in days and Evil in months.
- **Small steps fill the space between layers.** Exponential Idle's theories every 1–6 days, Realm Grinder's trophies of 1–12 days, and Trimps' 1–2-day challenge runs keep every few days eventful.
- **The calendar takes over at the end.** Past the authored layers, real-time drips and the developer's release rhythm carry the game.

---

## 3. Question 2: patterns that keep long play fresh

| Pattern | Games | Works when | Fails when |
|---|---|---|---|
| **One new system at a time** (layers, worlds, strata) | AD, Synergism, Revolution Idle, Trimps, Clicker Heroes, IdleOn, Melvor | each layer changes the rules, comes ~3–10× later than the last, and the old layer gets automated | the layer is the old loop with bigger numbers, or sits behind a long bare grind. Revolution Idle's early Eternity has nothing new for a long stretch ([wiki.gg](https://revolutionidle.wiki.gg/wiki/Guide:Eternity)); AD's worst Steam drop is the Eternity Challenge stretch (§4.1) |
| **Automation as the next layer's reward** | AD, Synergism, Revolution Idle, Trimps | it removes a chore done many times by hand, one layer behind (§5.1). About 40% of Revolution Idle's Steam players reach auto-prestige, against 75.5% who prestige once | the tools are half-made (Revolution Idle's macros, [review summary](https://vaporlens.app/app/2763740/revolution_idle.md)), or the late game is only scripts (Idle Champions) |
| **Challenge runs with permanent rewards** | AD (12 + 8 challenges, 12 Eternity Challenges × 5 tiers), Synergism, Trimps, Kittens, Revolution Idle (78 Tarot challenges), NGU, Realm Grinder | runs are short (Trimps' take 1–2 days) and open as a ladder. 34% of AD's Steam players finish all Normal Challenges, 23% all Infinity Challenges | a challenge is a long wait (8 of Wands: 24–30 h, [Steam](https://steamcommunity.com/app/2763740/discussions/0/806848332664214350/)), pays less than plain play (Trimps' Electricity, [Steam](https://steamcommunity.com/app/1877960/discussions/0/603026274222350210)), or wants thousands of repeats (Synergism: 9,001 completions, held by 6.8%) |
| **Real-time drips** | Cookie Clicker lumps, AD's 100-day upgrade, NGU Titans, Trimps' Bone Shrine, Fantasy Idle's crate and Titan | every return is worth something and nothing waits on it alone | a day passes with nothing else to do. An endgame Cookie Clicker player asked for a much shorter lump timer ([Steam](https://steamcommunity.com/app/1454400/discussions/0/3043858334656930791/)) |
| **Rotating events** | Idle Champions (~3 weeks), IdleOn (six a year), Gold & Goblins (six a week), Kolibri (weekly updates), TT2 tournaments, Realm Grinder (seasonal feats), Fantasy Idle (weekends) | they give stalled players a fresh fast track. AppQuantum calls events an alternative progression layer where stuck players start again quickly ([PocketGamer.biz](https://www.pocketgamer.biz/deconstructing-a-100m-idle-game-what-5-years-of-gold-and-goblins-reveals-about-live-ops-and-retention/)); about 80% of active Gold & Goblins players join ([WN Hub](https://wnhub.io/news/other/item-20087)) | they become chores, or brackets feel unfair ([TT2 DevLog 25](https://gamehive.com/blog/tt2-devlog-25-tournament-improvements-are-on-the-way-in-patch-v2100/)) |
| **Collections with a percentage** | Melvor's completion log, IdleOn cards, Idle Slayer's bestiary, Idle Champions' champions, Fantasy Idle's codex and bestiary | they fill through normal play and show a count; Melvor players wear their percentage in Discord names (earlier notes) | the last items are pure grind: 2.5–3.4% of Melvor's Steam players reach 100% items, pets or monsters. Players also report emptiness at 100% ([review summary](https://vaporlens.app/app/1267910/melvor_idle.md)) |
| **Achievements with bonuses** | AD, Cookie Clicker, Synergism, Realm Grinder, Fantasy Idle | hidden ones surprise late (Realm Grinder) | all of them are front-loaded |
| **Long goal ladders** | Melvor 99s and capes (46% of Steam players reach a first 99), NGU's ITOPOD floors, Fantasy Idle's ranks and capes | the next rung is visible and close | rungs are months or years apart (Cookie Clicker building levels: ~3 years) |
| **Named bosses and timed walls** | NGU Titans, Melvor's god dungeons and story bosses, IdleOn's Emperor, Fantasy Idle's Titan and dungeons | the boss is visible in advance, beatable while idle, and pays something permanent | it demands active play, which Melvor veterans disliked in Into the Mist ([Steam](https://steamcommunity.com/app/1267910/discussions/0/3416559828459728016)). Or it is the only door: buyers of Into the Abyss who could not beat the last base dungeon could use none of it ([Steam](https://steamcommunity.com/app/1267910/discussions/0/6471190240002504812)) |
| **Milestones on a count** | AD's 27 Eternity milestones, Melvor's mastery checkpoints, Realm Grinder's trophies | each one changes play: a new autobuyer, offline gains | they only add a number |
| **Narrative** | AD's Celestials, Melvor's story bosses, IdleOn's worlds | it frames new systems | no source measured its effect |
| **Leaderboards and seasons** | TT2 tournaments, Fantasy Idle's weekly boards | brackets are short and players similar | matching is unfair, or players cheat |

**[Inference] Three readings.**
- **Several clocks at once.** Long-lived games run several of these on different clocks, so one is always fast. AppQuantum describes Gold & Goblins this way: when the idle loop slows the puzzle takes over, and when the puzzle stalls an event starts ([PocketGamer.biz](https://www.pocketgamer.biz/the-ins-and-outs-of-retention-in-an-idle-game-with-merge-and-puzzle-elements/)).
- **Cheap patterns last longest.** The patterns that need little new content per hour of play last into the hundreds of hours: challenges, outer layers, collections and drips. Authored zones and expansions run out: Revolution Idle in about 2 months, and IdleOn's quiet stretches last 3–4 months.
- **What punishes is the wait's content, not its length.** Players accept a week-long wall that has other things to do and a big payoff. They reject a day-long wait that blocks everything.

---

## 4. Question 3: walls and stagnation

### 4.1 Steam achievements as a survival curve

| Game | Successive layers (share of Steam players, %) | Ratio, step to step |
|---|---|---|
| [Antimatter Dimensions](https://steamcommunity.com/stats/1399720/achievements) | Infinity 48.2 → Break Infinity 34.0 → Eternity 22.5 → Dilation 12.7 → Reality 12.2 → Singularity 6.6 → The End 6.0 | 0.71, 0.66, 0.56, 0.96, 0.54, 0.91 |
| [NGU Idle](https://steamcommunity.com/stats/1147690/achievements) | Boss 100 23.3 → Normal beaten 12.3 → Evil 10.3 → Sadistic 5.6 → The End 3.0 | 0.53, 0.84, 0.54, 0.54 |
| [Clicker Heroes](https://steamcommunity.com/stats/363970/achievements) | Ascend 50.2 → 10 ascensions 21.2 → Transcend 17.1 → 100 ascensions 8.3 → 250 ascensions 5.7 | 0.42, 0.81, 0.49, 0.69 |
| [Idle Slayer](https://steamcommunity.com/stats/1353300/achievements) | Ascend 65.6 → Ultra ascend 21.4 → 4 ultra ascensions 10.3 | 0.33, 0.48 |
| [Synergism](https://steamcommunity.com/stats/3552310/achievements) | Prestige 82.2 → Transcend 66.7 → Reincarnate 52.5 → Ascend with a 100,000 score 30.9 → Singularity 14.8 → 10 Singularities 8.2 | 0.81, 0.79, 0.59, 0.48, 0.55 |
| [Revolution Idle](https://steamcommunity.com/stats/2763740/achievements) | Prestige 75.5 → Infinity 46.5 → Eternity 27.8 → Dilation 16.4 → Unity 12.9 → Break Unity 7.6 → Sun Rune 4.6 | 0.62, 0.60, 0.59, 0.79, 0.59, 0.61 |
| [IdleOn](https://steamcommunity.com/stats/1476970/achievements) | World 2 19.2 → World 3 9.4 → World 4 6.1 → World 5 3.9 → World 6 3.5 | 0.49, 0.65, 0.64, 0.90 |
| [Realm Grinder](https://steamcommunity.com/stats/610080/achievements) | First gem 46.4 → Reincarnate 21.5 | 0.46 |
| [Melvor Idle](https://steamcommunity.com/stats/1267910/achievements) | First 99 46.0 → Fire Cape 20.1 → Maximum skill level 11.1 → 100% completion 2.3 | 0.44, 0.55, 0.21 |

A few more figures from the same pages:
- In Revolution Idle, 39.9% unlock auto-prestige.
- In IdleOn, 30.1% claim 100 hours of offline gains and 19.3% 2,000 hours (summed over characters).
- In [Cookie Clicker](https://steamcommunity.com/stats/1454400/achievements), 57.8% ascend once and 32.1% ten times. But 40.5% hold the achievement for a year of daily lumps, which suggests imported saves inflate the later steps.

**[Inference] Readings.**
- **About 60% per step.** Across 35 steps the median ratio is 0.59, with the middle half between 0.49 and 0.71: roughly three in five players who reach a major layer reach the next.
- **The worst steps are long, bare stretches.**
  - AD's Eternity → Dilation (0.56) is the Eternity Challenge grind, while Dilation → Reality loses almost nobody (0.96).
  - Idle Slayer's ascension → first ultra ascension (0.33) takes about two months.
  - Melvor's 100% completion (0.21) is the final collection grind.
- **Short steps after a new system lose little:** AD's Reality → The End is 0.91, and IdleOn's World 5 → 6 is 0.90.
- **Caveats.**
  - The denominators include one-session players, especially in free games (AD, IdleOn, Synergism, Revolution Idle).
  - Imported saves raise the later steps.
  - Synergism reached Steam only in February 2026.
  - Taking ratios between steps cancels part of these problems, not all.

### 4.2 How long players put up with a wall

No measured tolerance was found, which confirms `incremental-math.md` A3.1. The closest evidence:

- **Idle Idol.** Players complained after a couple of days that progress felt slow. The cause was the interface: late progress came from passive skills they never touched ([Game Developer](https://www.gamedeveloper.com/design/balancing-tips-how-we-managed-math-on-idle-idol)).
- **A veteran on the Gooboo forum** ([itch.io](https://itch.io/post/8951351)):
  - Good idle games tend toward a 24–48-hour check-in.
  - Resets creeping past a week make players ask whether they hit a wall or the end of the content.
  - Checking in once a week loses their interest.
- **AFK Arena.** A hard boss comes every 5 levels. Players sometimes clear 30 levels after a week stuck. The 12-hour idle chest means two check-ins a day ([Game Developer](https://www.gamedeveloper.com/design/flexible-time-session-design-in-afk-arena)).
- **AdVenture Communist.** The relaunch with a simpler economy and clear goals lifted day-30 retention from 3% to 15% ([Kongregate investor deck, slide 8](https://www.mtg.com/wp-content/uploads/2021/08/7.-Kongregate-Emily-Greer.pdf)).
- **Mobile benchmarks for idle games.**
  - Top-quartile titles reach up to 42% on day 1, 14.5% on day 7 and 5.5% on day 28 ([GameRefinery, GameAnalytics data, 2019](https://www.gamerefinery.com/hyper-casual-vs-idle-the-latest-trends-in-mobile-games/)).
  - The top 10% average 5.82 sessions and ~35 minutes a day ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game)).
  - No idle figure past day 30 was found.

**[Inference]** Every marker is in days. A day or two without anything new is felt. A week is the outer edge, and only with daily rewards and a big payoff. At Fantasy Idle's 20–24 game hours a day, an engaged late player should therefore wait no more than ~48 game hours for a major moment, and never ~150 (a week).

### 4.3 How designers measure it

- **Churn prediction from progress.** A study of the idle game *Maze X Brave* (800 users over 8 months) predicted churn from the highest stage cleared, how fast it changed, and play time, which fell sharply before players quit ([arXiv 2104.05554](https://arxiv.org/abs/2104.05554)).
- **Event spikes.** A jump in activity at each event start shows the core loop has stalled; AppQuantum then shortens the gaps between events (PocketGamer.biz, above).
- **Multi-day playtests.** PlaytestCloud's diary studies look for barriers on days 3, 5 and 7 ([PlaytestCloud](https://www.playtestcloud.com/longitudinal-studies)).
- **Stall metrics.** A vendor lists average stall per gate, change in session frequency, and churn during gates ([Bruin](https://getbruin.com/use-cases/mobile-gaming/progression-wall-identification/)).
- **No late-game target** of the form "something new every X hours" was found.

---

## 5. Question 4: late prestige, meaningful or routine

### 5.1 Each layer automates the one below

**Antimatter Dimensions**
- Normal Challenges give autobuyers, and Break Infinity requires a maxed Big Crunch autobuyer ([normal-challenges.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/challenges/normal-challenges.js)).
- 27 Eternity milestones between 1 and 1,000 Eternities hand the old chores over ([eternity-milestones.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/eternity/eternity-milestones.js)):
  - 2 Eternities: start with the challenges done;
  - 100 Eternities: the Eternity autobuyer;
  - 200 Eternities: offline Eternities.
- A Reality upgrade adds the Reality autobuyer ([reality-autobuyer.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/autobuyers/reality-autobuyer.js)).

**Other games**
- Synergism automates Ascension after Challenge 11 ([Steam](https://steamcommunity.com/app/3552310/discussions/0/757304900494484149/)).
- Revolution Idle's Eternity milestones 2–16 automate the layers below.

### 5.2 Meaningful late resets

- **A choice each time.**
  - In AD, every Reality offers a glyph to pick, and the Celestials are challenge-style realities with their own rules ([wiki.gg](https://antimatterdimensions.wiki.gg/wiki/Celestials)).
  - In Synergism, each Singularity is a decision: push deeper for Golden Quarks, or reset now.
- **A new system each time.**
  - Each Idle Slayer ultra ascension opens areas and systems.
  - Trimps' Universe 2 changes the rules and pushes back Universe 1's Obsidian wall.
- **A big outer payout.**
  - Clicker Heroes' transcendence resets the souls layer for Ancient Souls every 3–4 ascensions.
  - Cookie Clicker's second run went 3.4× faster.
- **Short challenge runs** with permanent rewards: Trimps' runs of 1–2 days, Realm Grinder's trophies, Kittens' repeatable challenges.

### 5.3 Routine late resets

- **Resets so fast they are a blur.** Revolution Idle's late Eternities come one every 0.02 s ([Steam](https://steamcommunity.com/app/2763740/discussions/0/501685433118247288/)). Synergism's Singularities take about an hour by the 21st.
- **Resets that are only waiting.** NGU's rebirths stretch from hours to a day, then a month, and the reviews call them repetitive ([review summary](https://vaporlens.app/app/1147690/ngu_idle.md)). Clicker Heroes' late ascensions take days and run on ruby-bought autoclickers.
- **Resets that run on scripts.** Idle Champions' late adventures are automated.
- **Resets that cost chores.** Idle Slayer players resent redoing every quest after each ultra ascension ([Steam](https://steamcommunity.com/app/1353300/discussions/0/598535552010264938/)).

### 5.4 [Inference] Rules for Fantasy Idle

1. **Routine inner resets are fine once automated.** Auto after 20 prestiges (DESIGN §3.9) already does this.
2. **Late resets need an outer layer that pays big again.** Fantasy Idle's tokens add under 1% a late run (`incremental-math.md` §8.3). The records (×1.05) were meant to keep late resets counting. In the 1,000-hour Auto run they come 100, 270 and 380 h apart after stage 300, so they stop doing that job.
3. **Every outer reset should open something,** as in Idle Slayer and Trimps, and get its own automation one layer later.
4. **No reset should make players redo chores.** Keep skills, gear, mastery, collections and the course, as prestige does now.

---

## 6. Cadence table per game

| Game | Early | Middle | Late | Something notable late every… | HLTB: all styles / completionist | Steam share at the last big layer |
|---|---|---|---|---|---|---|
| Antimatter Dimensions | Infinity in the first hours (time to fun ~2 h, review summary) | Eternity; Eternity Challenges (EC10 over 24 h before Dilation, snippet) | Reality after 1 week–1 month (snippet); 7 Celestials | Reality runs of minutes to hours; each Celestial a new rule set | 778 / 865 h | The End 6.0% |
| Synergism | Reincarnation ~3.7 h (one player) | Ascensions of several days (snippet) | first Singularity after ~1 month | about hourly Singularities by #21 | n/a | Singularity 14.8% |
| Revolution Idle | Prestige, Infinity | Eternity; Dilation at <100 to ~1,750 Steam h | Unity, Minerals, Tarot, Artifacts | all content in ~2 months, then patches | 370 / 598 h | Break Unity 7.6% |
| Exponential Idle | prestige, supremacy | students; theories from ee5k | theories 1–9, custom theories | a theory every 1–6 days | mobile | — |
| Clicker Heroes | ascend near zone 130 | transcend from zone 300 | ascensions of 54–100 h; ~10 days near zone 1M | weeks; a transcension every 3–4 ascensions | 827 / 1,198 h | Transcend 17.1% |
| Realm Grinder | abdications, reincarnations | R22→R30 in 10–20 h | first Ascension after >1 month; A2 ×7 slower | trophies of 1–12 days | 859 / 1,672 h | Reincarnate 21.5% |
| Trimps | Portal at Z20 | challenges of 1–2 days; Spire at Z200 | Spire II wall of many days; Universe 2 near Z700 | a new activity at least every few days until Z400–500 | 1,030 h (one figure) | — |
| Cookie Clicker | first ascension after 59 h–10 days | lumps; minigames ~4–5 days after lumps start | building levels (~3 years) | a lump every 20–24 h; an ascension every ~10–20 h | 453 / 798 h | 10 ascensions 32.1% (inflated) |
| Tap Titans 2 | prestige loop | clan raids | tournaments of 20–24 h | days | mobile | — |
| Idle Slayer | ascension | first ultra ascension at ~2 months (snippet) | ultra ascensions ~1 month apart | monthly, each opening systems | 200 / 644 h | 4 ultra ascensions 10.3% |
| Melvor Idle | first 99s | Fire Cape, god dungeons | expansions every 9–11 months | between expansions, self-set goals | 1,576 / 1,670 h | 100% completion 2.3% |
| IdleOn | Worlds 1–2 | Worlds 3–4 | Worlds 5–7, 9–21 months apart | patches every 1–2 weeks after a world, then 3–4 quiet months | 1,463 / 2,810 h | World 6: 3.5% |
| NGU Idle | Titans 1–4 within ~23 days (active play) | Evil at 2–3 months (active) or 10–11 (passive) | Sadistic; month-long rebirths | Titans 3–10 days apart early, then months | 4,024 / 6,760 h | The End 3.0% |
| Idle Champions | campaigns | patrons, Modron automation | gem-farm routine | an event every ~3 weeks; ~9 champions per 2 months | 1,051 / 5,812 h | — |

---

## 7. Fantasy Idle today, measured

### 7.1 Method

**The runs.** I copied `tools/simulate.mjs` into the scratchpad and added an event log fed by the game's own event stream, with no other change. It ran on the working tree at commit b712b0f, 7 October 2026:
- seeds 1–3 for 500 h each, with the simulator's own prestige rule;
- seed 1 for 1,000 h with `--auto`, so the Auto switch is turned on once earned.

**Event classes [Inference].** They follow DESIGN §3.21's idea of which moments deserve a card.

| Class | Events |
|---|---|
| Major | a new place, zone or dungeon opening; a first dungeon clear; a unique; a 25-stage record; a rank; a medal; a pet; an agility obstacle; a skill at 99; the first drop of a new gear tier |
| Medium | a level that opens a node or recipe; a Titan defeated; a dungeon-clear milestone; a mastery 99 |
| Not counted | other levels; bestiary stars; weekend milestones |

### 7.2 Results

Major events, in game hours:

| Band | Calendar, engaged player | Majors per hour (seeds 1–3, no Auto) | Median gap | Longest gap | Seed 1, 1,000 h with Auto |
|---|---|---|---|---|---|
| 1–10 h | day 1 | 4.3–5.3 | 0.10–0.12 h | 1.1–1.5 h | 4.3 per hour |
| 10–50 h | days 1–2 | 0.38–0.50 | 0.9–1.6 h | 7.2–15.4 h | 0.60 per hour; longest gap 12.8 h |
| 50–150 h | days 2–7 | 0.16–0.20 | 1.7–4.0 h | 27.7–46.2 h | 0.18 per hour; longest gap 24.9 h |
| 150–300 h | days 7–13 | 0.03–0.04 | 12–16 h | 53–98 h | 0.03 per hour; longest gap 94.7 h |
| 300–500 h | days 13–21 | 0.015 (3 events) | 57–87 h | 81–105 h | 1 event; longest gap 104 h |
| 500–1,000 h | weeks 3–6 | — | — | — | 0.016 per hour (8 events); median gap 31 h; longest gap 157 h |

With medium events counted too:

| Band | Events per hour | Longest gap |
|---|---|---|
| 50–150 h | 0.43–0.49 | 11–20 h |
| 150–300 h | 0.07–0.09 | 33–64 h |
| 500–1,000 h | 0.03 | 134 h |

### 7.3 What fills each band, and what is missing

**10–50 h.**
- Dungeons: the Dragon's Lair opens at ~11 h and the Void Citadel at ~22 h.
- Uniques: the Dragonheart Plate at 20–24 h and the Aegis at 47–58 h.
- Records at stages 125, 150, 175 and 200.
- Ranks: Champion at ~16 h and Hero at 29–36 h.
- Agility obstacles 3–5.
- Several medals and the first pet.
- Weapon tiers 6 (~16 h) and 7 (47–55 h).
- A Titan every 1–10 h.

This band meets any reasonable target.

**50–150 h.**
- The Maw opens at 48–60 h and gives the Starless Band at 85–107 h.
- Obstacle 6 at 58–69 h.
- Rank Legend at 53–79 h.
- Records 225–300, 20–50 h apart.
- Farming 99 at 141–145 h.
- The 28–46-h holes fall between the Band (~97–107 h) and record 275 or Farming 99 (~138–148 h).
- After the Maw, no place, zone, dungeon or system opens again.

**150–500 h.**
- Mythic, the last rank, at 116–162 h.
- Record 300 at 145–191 h.
- A pet every ~100–230 h.
- Combat 99 at 253–405 h, and Grandmaster (a mastery 99) at ~404–413 h.
- With Auto, the Titan falls every 30–50 h until ~280 h, then every 70–220 h. Without Auto it stops falling after the 28th, at ~240 h.
- Without Auto, the simulator's player stays at stage 310 from ~225 to 500 h. Its prestige rule no longer finds a run worth taking, and no gold is spent in the second half.
- With Auto, records 325, 350 and 375 come at 245, 513 and 891 h (~0.1 stage an hour), and 91% of gold goes to the camp.
- Paragon is full by 500 h, after which skill points have no use.

**500–1,000 h (with Auto).**
- Cooking 99 at 701 h and Smithing 99 at 858 h.
- Three pets.
- Two records.
- The Polymath medal at ~544 h.
- One stretch of 157 h with nothing major: about a week of real time.

**[Inference] Diagnosis.**
- **Front-loaded content.** The structural content ends near hour 60, day 3 for an engaged player. After that come only numbers, rare pets and 99s.
- **Gaps longer than players tolerate.** From hour ~150 to 1,000 the gaps are 2–6 days of real play. That is past the tolerance markers of §4.2, and it is the kind of long, bare stretch that loses the most players in §4.1.
- **Simulator caveat.** The simulator's player is simple (DESIGN §5.3), and its stall at 310 is partly its own prestige rule.

---

## 8. Recommendations for Fantasy Idle (all [Inference])

### 8.1 Targets by band

| Band (game hours) | Calendar, engaged player | A major moment at least every | Longest gap at most | Today |
|---|---|---|---|---|
| 10–50 | days 1–2 | 4 h | 12 h (one night) | every 2–2.6 h; longest 7–15 h: ✓, borderline on gaps |
| 50–150 | days 2–7 | 6 h | 24 h | every 5–6 h; longest 25–46 h: gaps too long |
| 150–500 | days 7–21 | 24 h | 72 h | every 25–100 h; longest 53–105 h: ✗ |
| 500–1,000 | weeks 3–6 | 48 h | ~150 h (one calendar week) | every ~60 h; longest 157 h: ✗ |

**Standing targets.**
- **Something ripe at every check-in,** about every 3–5 game hours while the player is awake: a crate, crops, a beatable Titan, an anvil step, a perk point, a Trial tier.
- **Log-spaced structure.** Each new system comes no more than ~3× later than the last. The Maw is at ~50–60 h, so the next is due by ~150–200 h, then ~500 h, then ~1,500 h. This is the tight end of the 3–10× of §2.5, because Fantasy Idle's hours pass quickly in calendar terms.
- **Late sessions always show movement,** in the stage, a Trial tier or a completion percentage.

**Why these numbers.** The tolerance markers are in days (§4.2), and comparable games deliver something every few days: NGU's Titans and Exponential Idle's theories every 1–10 days, Trimps' new activities, Realm Grinder's trophies, Cookie Clicker's daily lump. At 20–24 game hours a day, one major moment per 24 game hours is one per calendar day for an engaged player.

### 8.2 What to add, by band

**Hours 50–150: fill the day-long holes with content of the kinds the game already has.**

1. **Named Abyss strata.** Every 25 (or 50) stages from 125, the Abyss gets a named layer with:
   - its own painting;
   - a monster set (new bestiary pages);
   - a zone card (`zoneReached`);
   - a pin on the world map.

   Each record then also becomes a new place, the "new zone" pattern of Trimps and Clicker Heroes. It needs art and data, not a new system. Strata every 25 stages add about 4 majors to hours 50–150 and 3 to hours 150–500.
2. **Two more dungeons between the Maw (210) and stage 300**, at about 240 and 275, each with a unique. Every unique is also a record, so it lifts the tokens ×1.05. At today's pace they open at ~65–90 h and ~105–140 h, with uniques about 40 h later.
3. **Titans that keep falling.** Today 25 Titans fall by ~107–146 h, then one per 30–220 h. Tie Titan strength to the best stage so that one falls every ~10–20 h through hour 300. Make every fifth Titan a named one with its own painting; the ten names in `TITAN_NAMES` already exist.
4. **Ranks past Mythic**, at 500, 1,000 and 2,000 prestiges. With Auto these arrive near hours 240, 505 and 930 (2,161 prestiges by hour 1,000). Each is a cheap cloak and a card.

**Hours 150–500: a new layer and challenges.**

5. **An outer reset, "Ascension".** It opens at stage 300 or at Mythic rank, about hour 145–190.
   - **What it resets:** tokens, the camp and the stage ladder. Like prestige today, it keeps skills, gear, mastery, collections and the course.
   - **What it pays:** a rare unit taken as a log of tokens or of the best stage, as Clicker Heroes' transcendence and AD's Eternity do (`incremental-math.md` §2.6). The first Ascension should multiply power ×2–3, inside Pecorella's +50–200% band. Later ones should pay +20–50%, compounding ×1.05 per unit like the records.
   - **What it opens:** something new with each of the first ~8 Ascensions. Candidates are the Trials, a second perk tree for the skill points left after Paragon, a new Titan line, a harder dungeon tier, a stratum, a look.
   - **Its own automation:** Auto-Ascend after ~10 Ascensions, one layer behind.
   - **Pace:** the climb back to the old best should take ~24–48 game hours. Then Ascension alone gives a major moment every 1–2 days.
6. **Trials: challenge runs with permanent rewards.**
   - **The ladder:** 10–12 Trials, opening one at a time, from stage ~200 or the first Ascension.
   - **The rule:** each changes one thing. Examples: no camp, no food, monsters at ×2 attack, one gear slot, no dungeons, half the boss timer.
   - **The run:** played in the normal fight and finished by reaching a stage target. Tiers rise 25 stages at a time, three to five per Trial, like AD's five tiers per Eternity Challenge.
   - **The reward:** a small permanent bonus or a look for each tier.
   - **The pace:** each tier takes 2–12 game hours, so 30–50 tiers land across hours 150–600 at about one per 12 h.
   - **Idle-friendly:** no click races (§8.4).
7. **Mastery checkpoints per skill.** Melvor's checkpoints at 10/25/50/95% of a skill's mastery would turn the mastery tail (77 actions, ~50 h each to 99) into a medium event every few days for a skiller.

**Hours 500–1,000: completion, an end, and drips that matter.**

8. **A completion percentage in the Hall.**
   - **Built from what exists:** levels, mastery, codex, bestiary stars, pets, medals, uniques, Titans, Trials.
   - **A cape at 100%,** like Melvor's Cape of Completion.
   - **A fair final stretch:** the last 10% should not rest on rare drops alone.
9. **An end boss for current content:** a painted lord of the Abyss at stage ~400, or after ~10 Ascensions. It gives players a visible end-for-now and gives the developer a place to hang the next chapter.
10. **Calendar drips for late players.**
    - **Weekend events:** add an event-only collectible each time (a look, a banner, a pet skin), since essence and diamonds matter less late.
    - **A weekly Trial:** with a board computed on the server, alongside the weekly clan boss.
11. **Late uses for idle currencies.** Skill points after Paragon can buy Ascension perks. Gold, which piles up without Auto, can buy from an Ascension shop or pay Trial entries. Essence can take the anvil past +10 at steep prices. All of these must stay bounded (`incremental-math.md` §8.5).

**Expected effect.**
- Strata, the two dungeons, Titans and ranks add about 12–15 majors to hours 50–500.
- Ascension and the Trials add about one major per 12–24 h from hour ~150.
- Together they should bring every band to §8.1. Check this with §8.5 before trusting it.

### 8.3 Fit with the house rules

| Addition | Where it lives | How it opens (no grey placeholders) | How "ready" shows (no suggestion text) |
|---|---|---|---|
| Abyss strata | the scene, the world map, a zone card | when reached, with a `zoneReached` card; the next stratum is a silhouette pin | the map pin |
| Dungeons 7–8 | the Dungeons tab, map gates | the next one as a silhouette, as now | the gold "!" when the unique can be assembled |
| Named Titans | the Titan's card, the dock | on first defeat | the existing badge when the Titan is awake and beatable |
| Ranks past Mythic | the rank card and badge | the next cloak as a silhouette with a count | — |
| Ascension | the prestige dialog over the fight: it belongs to the fight–spend–prestige loop (DESIGN §3.23) | one card when first available (`disclosure.js`) | the Ascend button glows when an Ascension would pay at least a set share |
| Trials | a ladder in the same dialog | unlocked Trials as cards with art, the next as a silhouette; rules behind a "?" (`features.js`) | a glow when a new tier is within reach |
| Completion % | the Hall | with the Hall | the number; a cape card at milestones |
| End boss | a map gate | a silhouette until reachable | — |

### 8.4 What to avoid

- **Required active play.** Melvor players disliked this in Into the Mist (§3). Trials and the end boss must be winnable while idle.
- **A single door.** Into the Abyss put all its content behind one hard fight. Every gate needs a second way out (pillar 4).
- **Chores after every reset.** This was Idle Slayer's quest redo (§5.3).
- **Day-long waits with nothing else to do.** Revolution Idle's 8 of Wands and Cookie Clicker's lumps did this.
- **A layer that is only the old loop with bigger numbers.** A Trimps quitter left once the reward stopped mattering (§2.2).
- **Slow single-currency grinds.** IdleOn players called World 5's Divinity, at about a point an hour, the longest and most boring grind ([Steam](https://steamcommunity.com/app/1476970/discussions/0/603020374162073676)).
- **Hidden levers.** Idle Idol's stall was an interface problem, and clearer goals lifted AdVenture Communist's day-30 retention five-fold (§4.2).

### 8.5 What to measure in the simulator

1. **A novelty log.** Classify the events as in §7.1. For the bands 0–1, 1–10, 10–50, 50–150, 150–300, 300–500 and 500–1,000 h, report events per hour, the median gap and the longest gap, and compare them with §8.1. The scratch copy does this with about 60–70 lines: `noteEvent(ev)` in the event loop plus a check for dungeons opening. It could go into `tools/simulate.mjs` behind a `--novelty` flag.
2. **Long runs with Auto.** Run three seeds for 1,000 h with `--auto` (about 3.5 minutes each). Alternatively, fix the bot's prestige rule, which left it at stage 310 for 275 hours.
3. **A check-in model.** Five sessions a day at fixed clock times, plus the overnight gap. For each session, count the new major and medium events and the ripe items. Target: at most one empty session in three for hours 150–500, and one in two for 500–1,000.
4. **Layer spacing.** The first time each structural step is reached. The ratio between successive steps should be at most ~3–4.
5. **Late pace.** Records per 100 h, Titans per 100 h, and stages per day, from hour 150.
6. **Dead stocks.** The share of gold, skill points, essence and bars unspent in each band.
7. **Play styles.** A skiller and an AFK pusher should also see major moments after hour 150.
8. **A survival lens.** At ~60% of players per structural step (§4.1), each step should be short and full of small events rather than long and bare.

---

## 9. Gaps

- **Tolerance and retention.** No measured tolerance for walls was found. No idle retention past day 30 was found, and no retention curves for PC or browser idle games.
- **Steam shares.** The denominators include one-session players, and imported saves inflate later steps (Cookie Clicker's year of lumps at 40.5%). Some achievement lists were partial or lacked descriptions (Realm Grinder, Trimps, Kittens Game).
- **HowLongToBeat** hours for idle games include unattended time and drift: Melvor's main-story figure went from 1,281 to 1,395 h between a snippet and the live page.
- **VaporLens summaries** are machine-written.
- **Missing timings:**
  - hours per AD Celestial;
  - days to Clicker Heroes' zone 300;
  - any Kittens Game timing;
  - Tap Titans 2's current tournament and event frequency;
  - developer statements on cadence from Melvor, NGU, IdleOn and Idle Slayer.

  The Prestige Tree, Firestone, Leaf Blower Revolution and Unnamed Space Idle were not covered. Unnamed Space Idle won r/incremental_games' 2024 vote for best events and updates (snippet).
- **Access.** The session's shared web-search budget ran out partway through. Fandom, Reddit, the Melvor wiki and web.archive.org refused automated reads, so many game facts rest on Steam threads, source code and changelogs.
- **Fantasy Idle measurements.**
  - The event classes are my judgement.
  - The simulator's player does not use mini-games, clicks or potions.
  - Other work may have changed the working tree the same day.
  - The additions in §8 are untested; their effects are estimates to check with §8.5.
