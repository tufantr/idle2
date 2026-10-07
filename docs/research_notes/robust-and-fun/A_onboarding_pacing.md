# Onboarding and feature-unlock pacing (research A)

October 2026. The owner's problem: places opened far too fast. A player who taps the monster opened 8 places in
28 seconds, and one who only watched opened 8 in under 4 minutes. This note builds on
`docs/research_notes/first-session.md` (Tap Titans 2's first session, Pecorella, deltaDNA, patterns 11 and 21),
`game-feel.md` and `active_play_offline_retention.md`. It does not repeat them; where it leans on them it says so.

**How this was done.**
- Fandom wikis block plain page reads, but their MediaWiki API answered. The unlock tables come from the wikis'
  source text: AFK Arena, NGU Idle, Raid, Shop Titans, Melvor, Egg, Inc., IdleOn and Clash Royale.
- The papers were read in full.
- The web-search budget ran out partway. Two facts come only from search snippets and are marked "(snippet)".
- Reddit was not reachable, and archive.org worked for one page only.

While this research ran, the owner committed a queue for places (`PLACE_GAPS_MS`, commit b712b0f). Section 5
measures it and reviews it against the evidence.

---

## Summary

1. **Successful games open a burst of features, then slow down sharply.**
   - AFK Arena opens about 13 things in its first 40 campaign stages, then about one every one to three chapters.
   - NGU Idle opens features at bosses 4, 17, 30 and 37, within the short early runs its guide advises (about 30
     minutes each). The next ones wait until boss 58.
   - Raid spreads nine features over six account-level gates, from level 2 to 40.
2. **Their gates hold against fast players because they measure something that takes real time.**

   | Game | What the gate measures |
   |---|---|
   | Raid | Energy |
   | Shop Titans | Crafting timers |
   | AFK Arena | Power that grows from idle loot |
   | Melvor's Adventure mode | Rising prices: 10,000 to 25 million gold for the first ten skills |
   | Egg, Inc. | Soul Eggs, earned mainly by prestiging |
   | **Fantasy Idle before b712b0f** | **Stages. No brake: tapping reached stage 30 in 28 seconds** |
3. **People hold about four new things in mind at once** (Cowan).
   - People learn better in segments they pace themselves, and when they know the key concepts first. Mayer and
     Pilegard report median effect sizes of 0.79 and 0.75.
   - Successful puzzle games bring in one skill at a time, at a calm moment, with practice before the next
     (Linehan et al.).
4. **Players learn by trying.** In a study of 45,000 players, tutorials helped only the most complex game, with
   29% more play time. They made no difference in the two simpler games (Andersen et al.).
5. **Showing the next unlock pulls players toward it.**
   - AdVenture Capitalist marked where events would unlock, and far more players pushed to reach it.
   - People speed up as a goal nears. Café customers' gaps between purchases shrank by 20% on the way to a free
     coffee.
   - Effort drops right after a reward (Kivetz et al.). So the next goal should show as soon as a place opens.
6. **"Earned but arriving" has a model and a warning.**
   - Model: Animal Crossing: New Horizons builds an earned shop or museum and opens it a day or two later.
   - Warning: Clash Royale made players wait on timers for chests they had already won. It dropped that queue in
     March 2025.
7. **The owner's queue fixes the burst.** It allows 90, 150, 210 and 270 seconds of play between places, then 300.
   - Every player now gets Hunting at 1.5 minutes.
   - A tapper meets 8 places in 30 minutes, not in 28 seconds.
   - The first 12 minutes match the evidence.
8. **Three problems remain.**
   - The gap stops growing at 5 minutes, so 7 or 8 places still open in the first half hour.
   - A background tab counts as play, so places can open while nobody is looking.
   - Some places open hours before they are useful. Agility's first obstacle costs 20,000 gold plus materials, and
     the simulator builds it at 3.5 to 4.8 hours.
9. **Recommended ladder.**
   - Gaps of 1.5, 3, 4, 5, 7, 10 and 15 minutes of attended play, then 20 to 30 minutes, with at most one place
     per return.
   - Places earned by skilling come at least 90 seconds apart and count on the same ladder.
   - At most 3 places by minute 10, 5 by minute 20 and 7 by minute 60.
10. **Open each place when it is useful, in this order:**
    1. What breaks the first wall: Hunting, Dungeons, Alchemy.
    2. Prestige.
    3. The Shop and the Hall.
    4. After the first prestige: the Clan, and Events when a festival is near.
    5. Agility, when its first obstacle is within reach.

---

## 1. Unlock timelines in successful games

`first-session.md` already gives Tap Titans 2's stage list, Melvor's Tutorial Island and AFK Arena's early modes.
This section adds what comes after, and how each game's gates are built.

### 1.1 AFK Arena: campaign stages only

From the wiki: [chapter 1](https://afk-arena.fandom.com/wiki/Ranhorn_City_(Campaign)),
[chapter 2](https://afk-arena.fandom.com/wiki/Bastion_of_the_Elements), [Ranhorn](https://afk-arena.fandom.com/wiki/Ranhorn),
[Dark Forest](https://afk-arena.fandom.com/wiki/Dark_Forest).

| Campaign stage | What opens |
|---|---|
| Tutorial and chapter 1 (12 stages; 1-1 to 1-4 use a fixed team) | The town of Ranhorn, with the Tavern (summons), Temple of Ascension, Rickety Cart, Barracks store and Wishlist |
| 2-3, 2-4, 2-8 | Dark Forest; Arcane Labyrinth; Store |
| 2-12, 2-16, 2-20, 2-28 | King's Tower; Library; Guild; Arena of Heroes (player against player) |
| 3-12 | Bounty Board |
| 4-36, end of chapter 4 | Resonating Crystal and Wall of Legends; Oak Inn (fully usable at chapter 17) |
| 6-4, 6-20 | Peaks of Time; Voyage of Wonders |
| 8-40, 11-40, 12-40 | Elder Tree; Field of Stars; Twisted Realm |
| 15-40, 19-40 | Abyssal Expedition; Hunting Fields and Temporal Rift |

- **One kind of gate.** AFK Arena opens features only through campaign progress, never by player level, and almost
  every early action pays ([Deconstructor of Fun, June 2019](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).
- **No energy.** An idle chest fills for up to 12 hours, which nudges players toward two visits a day
  ([Jesuha, 2020](https://www.gamedeveloper.com/design/flexible-time-session-design-in-afk-arena)).
- **The first week drips through events:** a task event beside a daily login event
  ([wiki guide](https://afk-arena.fandom.com/wiki/A_beginners_guide_for_free_to_play_players)).
- **No source gives the minutes** to reach these stages.

**[Inference]** The shape is a burst of about 13 openings in 40 stages, then a thinning tail. Stages are gated by
power, which grows from idle loot over hours, so a fast player cannot pull the tail forward.

### 1.2 NGU Idle: bosses, re-earned in each early run

Parsed from the wiki ([Boss Fights](https://ngu-idle.fandom.com/wiki/Boss_Fights),
[New Player Guide](https://ngu-idle.fandom.com/wiki/New_Player_Guide_(Truth))):

| Boss beaten | 4 | 17 | 30 | 37 | 58 | 66 | 132 |
|---|---|---|---|---|---|---|---|
| Opens | Adventure, Inventory | Augmentations | Time Machine | Magic, Blood Magic | Titan 1, Challenges | Titan 2 | The Beast |

- **Short early runs.** The guide advises 30-minute rebirths at first, then one-hour runs.
- **Features return each run.** Features opened by bosses must be won again in each rebirth. Later ones, from
  Wandoos on, stay open from a run's start.
- **Help on the spot.** Every new feature has an in-game explanation button.
- **A known wall.** The "Mega Lands wall" usually takes a few days.

### 1.3 Raid: Shadow Legends: account level

From the wiki ([Player Levels](https://raid-shadow-legends.fandom.com/wiki/Player_Levels)):

| Level | 2 | 6 | 15 | 18 | 35 | 40 |
|---|---|---|---|---|---|---|
| Opens | Gem Mine | Tavern, Classic Arena, Great Hall | Guardian Ring | Market | Tag Team Arena, Advanced Quests | Doom Tower |

Battles spend energy, which refills over time. **[Inference]** So the level, and each unlock with it, follows the
clock more than the player's speed.

### 1.4 Shop Titans: merchant level, unlocks the player buys

On the wiki ([Shopkeeper](https://shop-titans.fandom.com/wiki/Shopkeeper)), each merchant level offers things to
buy with gold:

| Merchant level | What is offered |
|---|---|
| 3 | Carpenter, a second hero slot |
| 4 | Avatar editor |
| 5 | Apothecary |
| 10 | A third crafting slot |
| 12 | Three hero classes |
| 15 | Quest slot, hero slot, shop expansion |
| 16 | Collection book |

- **The levels get longer.** XP per level grows from 600 at level 2 to 14,300 at level 10, 160,100 at level 20 and
  926,100 at level 30 ([Experience](https://shop-titans.fandom.com/wiki/Experience)).
- **The XP is slowed by real time.** It comes from selling crafted items, and crafting takes real time.
- **The player chooses the moment**, because each unlock is a purchase.

### 1.5 Melvor Idle: all open, or bought one by one

- **Standard mode** has no restrictions ([Game Mode](https://wiki.melvoridle.com/w/Game_Mode)). Every skill is
  open, and a skippable tutorial island leads a new player through about eight of them (`first-session.md`).
- **Adventure mode** starts with melee only ([Adventure](https://wiki.melvoridle.com/w/Adventure_Mode)).
  - Skills are bought with gold. The prices: 10K, 25K, 50K, 200K, 250K, 400K, 1M, 2.5M, 10M, 25M, up to 500M.
  - Non-combat skills cannot level past the combat level.
  - The wiki's [guide](https://wiki.melvoridle.com/w/Adventure/Guide) names the trade-off: fewer early choices help
    a new player, but hide how the skills connect.

### 1.6 Social and co-op systems come after the loop

- **Egg, Inc.** Co-op contracts need 1,000 Soul Eggs, earned mainly by prestiging. A tutorial contract is offered
  to players with 1,000 to 10,000 ([Contracts](https://egg-inc.fandom.com/wiki/Contracts)).
- **Tap Titans 2.** The tutorial announces prestige at stage 60, then advises a clan at stage 100, after the first
  prestige ([tutorial table](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/TutorialEventInfo.csv), steps 41–48).
- **IdleOn.**
  - Stamps and Bribes open at class level 12, from a character in town ([Stamps](https://idleon.wiki/wiki/Stamps)).
  - The Post Office opens through a World 2 quest ([Post Office](https://idleon.wiki/wiki/Post_Office)).
- **Idle Heroes.** The Prophet Tree opens at level 25 and the Tavern at 28
  ([BlueStacks](https://www.bluestacks.com/blog/game-guides/idle-heroes/idle-heroes-buildings-guide-en.html), snippet).
- **Clicker Heroes.** The first run before ascending often takes a day or two
  ([guide](https://gamerofpassion.com/clicker-heroes-when-to-ascend/), snippet).

### 1.7 Fantasy Idle, measured

`node tools/opening.mjs` is read-only: it simulates and writes nothing. Each entry is a place and the second of play
it opened.

**Before the queue** (10 minutes, 3 seeds):

| Player | Places |
|---|---|
| Tapper | Hunting 3, Shop 7, Hall 7, Alchemy 10, Events 12, Dungeons 14, Clan 21, Prestige 28, Agility 41 |
| Watcher | Hunting 14, Shop 48, Hall 48, Alchemy 68, Events 87, Dungeons 102, Clan 159, Prestige 224 |

**After the queue** (b712b0f; 45 minutes, seed 1):

| Player | Places | Best stage | Falls | Longest stretch with nothing new |
|---|---|---|---|---|
| Idle | Hunting 90, Smithing 180, Shop 390, Hall 660, Dungeons 960, Alchemy 1260 | 20 | 16 | 146 s |
| Watcher | Hunting 90, Shop 240, Hall 450, Smithing 634, Dungeons 934, Alchemy 1234, Prestige 1534 | 30 | 15 | 131 s |
| Tapper | Hunting 90, Smithing 120, Shop 330, Hall 600, Dungeons 900, Alchemy 1200, Prestige 1500, Agility 1800 | 69 | 28 | 92 s |

- **The tool's limits.** Its players never prestige, cook, brew or enter a dungeon. So the Clan and Events never
  appear, and part of the watcher's wall is the tool's own.
- **The watcher's wall.** Even so, the watcher sits at stage 30 from minute 4 to minute 45. The places that would
  help him past it arrive late: Dungeons (gear) at minute 15.5 and Alchemy (potions) at 20.5.
- **The longer view.** The whole-game simulator's sensible player first prestiges at 0.7 to 1.6 hours, at stage 40
  to 58 (DESIGN §5.2).

### 1.8 What the timelines share [Inference]

- **A burst, then a thinning tail.** The burst comes in the first chapter or tutorial. After it, the gap keeps
  growing; it never settles at a fixed rhythm.
- **Systems that need other people come after the core loop.** AFK Arena's guild and arena come at the end of
  chapter 2. Tap Titans 2 advises a clan after the first prestige. Egg, Inc.'s co-op needs prestige currency.
  Raid's early arena is the exception.
- **Each gate measures something that grows at a pace set by time,** not taps.
- **Fast measures add things to one screen.** Where taps do drive progress (Tap Titans 2, Cookie Clicker), the new
  things are heroes and buildings on the same screen, not new places.

---

## 2. Mechanisms that pace unlocks regardless of player speed

| Mechanism | Examples | Strength | Weakness |
|---|---|---|---|
| **Progress gate on a fast measure** (stage, kills) | Tap Titans 2, AFK Arena; Fantasy Idle before b712b0f | Easy to read ("reach stage 30") | A fast player floods himself |
| **Progress gate on a slow measure** (energy, timers, idle loot) | Raid's level, Shop Titans' XP, AFK Arena's power | Nearly the same pace for everyone | Waiting |
| **A rising price the player chooses to pay** | Melvor Adventure; Shop Titans' offers | The player feels he chose; the gap grows by itself | Needs predictable income |
| **Gate behind the first reset** | Egg, Inc.'s contracts; Tap Titans 2's clan | The loop is learned first | Players who never reset never see it |
| **Gate re-earned each run** | NGU Idle's early bosses | Each run re-teaches | Features that vanish confuse; Fantasy Idle rightly keeps places |
| **Real-time drip** (next day, login calendar) | Animal Crossing's buildings; Tap Titans 2's 14-day login rewards; AFK Arena's first-week login event | Spreads novelty over days; a reason to return | Feels arbitrary if long or empty |
| **Queue in time played** | Fantasy Idle's `PLACE_GAPS_MS` | Same cadence for tapper and watcher | Depends on what counts as "played" (5.3) |
| **Two keys: progress and time** | Fantasy Idle's prestige (stage 10 and a 10-minute run); AFK Arena's Oak Inn (chapter 4 to enter, 17 for full use) | Stops rushing and early misuse | Harder to explain |
| **Experienced players skip ahead** | Melvor's skippable island; Trimps moves veterans on (`active_play_offline_retention.md`) | Respects genre veterans | None, if opt-in and out of sight |

**How fast players are handled.** In most of these games, playing fast barely moves the unlocks, because the gate's
measure is bounded by time. AFK Arena has no tap at all. Where taps drive progress, the game has few separate
screens. I found no game that lets fast tapping open many screens in a burst. A queue in time played is the fix for
exactly that case.

---

## 3. Cognitive load, learning and early churn

### 3.1 How much a new player can take in

- **About four things at once.** Short-term memory has a central limit of about four chunks, within three to five.
  Miller's "seven" was a rough figure ([Cowan 2001](https://doi.org/10.1017/S0140525X01003922)).
- **Load depends on what must be held together.**
  - Learning costs the most when many elements must be held in mind together. Clumsy presentation adds more.
  - A novice has no stored patterns to lean on, so every element counts
    ([Sweller 1988](https://doi.org/10.1207/s15516709cog1202_4);
    [Sweller, van Merriënboer and Paas 2019](https://doi.org/10.1007/s10648-019-09465-5)).
  - **[Inference]** A place that reuses a known pattern is cheap: Fishing works like Mining. A place with new rules
    costs more: Dungeons, Prestige, the Clan.
- **Segments, and key concepts first.** From a review of multimedia-learning experiments
  ([Mayer and Pilegard 2014](https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pretraining-and-modality-principles/DD24C2F48B9B1277CE59F78276110258)):
  - People learn more deeply from segments they pace themselves: 10 of 10 tests, median effect size 0.79.
  - They learn more deeply when they already know the names and traits of the main concepts: 13 of 16 tests,
    median effect size 0.75.
- **Spaced beats massed.** A meta-analysis covered 839 assessments in 317 experiments. Spaced study beat massed
  study, and the best gap grows with how long the learning must last
  ([Cepeda et al. 2006](https://doi.org/10.1037/0033-2909.132.3.354)).
- **More choices, slower choices.** Choice time grows roughly with the logarithm of the number of alternatives
  ([Hick 1952](https://doi.org/10.1080/17470215208416600)).
- **Hide in stages, not too deep.** Progressive disclosure keeps novices on what matters. Nielsen advises rarely
  using more than two levels of it ([NN/g, 2006](https://www.nngroup.com/articles/progressive-disclosure/)).

### 3.2 How successful games teach

- **Puzzle games: one skill at a time.** Linehan and colleagues charted Portal, Portal 2's co-op mode, Braid and
  Lemmings puzzle by puzzle ([CHI PLAY 2014](https://cora.ucc.ie/items/9a2cde12-6c3b-420f-9d4c-10ad2d66de3f)).
  - Each main skill arrives alone, in a simple puzzle at a dip in difficulty.
  - The player practises it with earlier skills.
  - Difficulty climbs until the next skill arrives.
  - Lemmings, the oldest, shows nearly all its skills in its first seven levels, then practises them for 23. The
    authors expect a modern design would differ.
- **Tutorials: only the complex game gained**
  ([Andersen et al., CHI 2012](https://grail.cs.washington.edu/wp-content/uploads/2015/08/andersen2012tio.pdf)).
  The study ran eight tutorial designs in three games, with over 45,000 players.
  - **Foldit (complex).** In-context tutorials brought 75% more levels and 29% more play time than none.
    Compared with an up-front manual, they brought 40% more levels and 16% more time.
  - **Refraction and Hello Worlds (simpler).** Tutorials made no significant difference. In Hello Worlds, about 3.5
    points fewer players returned with in-context tutorials.
  - **Forcing the shown action** gave no benefit.
  - **An on-demand help button** cost Refraction 12% of levels and 15% of play time. Only 31% of players used it.
  - The authors conclude that players learned more by experimenting than by reading.
- **AdVenture Capitalist's studio.** Rimmy Spanjer, Hyper Hippo's managing director of games, gave an interview in
  April 2021 ([archived](https://web.archive.org/web/20250622062038/https://www.globalgamesforum.com/features/idle-game-design-lessons-from-developing-adventure-capitalist)).
  `first-session.md` already has his warning about twelve mechanics in one session. New here:
  - Idle players fear having seen everything in 15 minutes. Systems are worth more as visible goals than as early
    lessons.
  - After rank 10, something at rank 20 should be worth working toward.
  - Don't place a feature where most players have already left. Unlocking at day 14 makes little sense when only
    20% remain at day 7.
- **Active play shrinks.** An idle player plays actively for 15 to 60 minutes at first. Then he checks in hourly,
  then a couple of times a day, then weekly ([Eric Guan, June 2025](https://ericguan.substack.com/p/idle-game-design-principles)).

### 3.3 Data linking load and pacing to early churn

- **Tutorials paid off only where trying was not enough** (Andersen, above).
- **An earlier forced break kept slightly more players.** In Cookie Cats, a mobile puzzle game, gates make players
  wait or pay. An A/B test across 90,189 players moved the first gate from level 30 to level 40
  ([analysis](https://github.com/archie-cm/A-B-Testing-Mobile-Games)).
  - With the gate at 30: 44.8% stayed at day 1 and 19.0% at day 7.
  - With the gate at 40: 44.2% and 18.2%.
  - The analysis reports strong evidence that day 7 was better with the earlier gate.
- **Speeding up toward a goal predicts staying.** Café customers who sped up more toward their first reward were
  more likely to stay, and came back faster. Purchases dropped after each reward, then rose toward the next
  ([Kivetz, Urminsky and Zheng 2006](https://doi.org/10.1509/jmkr.43.1.39)).
- **deltaDNA's numbers are in `first-session.md`:** 20% of installs lost within two minutes, and a first session
  of 10 to 20 minutes advised.

### 3.4 What this means for Fantasy Idle [Inference]

**The first two minutes already hold four new concepts:**
- the fight and the strike;
- gold buying camp upgrades;
- gear;
- the boss.

That fills the budget. Each new place adds one to three more: a verb, a resource and a rule. So the first session
should bring:
- one place at a time;
- a few minutes of use before the next;
- places that reuse a known pattern sooner than places with new rules.

The first-session note's "a system every 3 to 5 minutes, four to six in the first session" fits. Nothing supports
a fixed 5-minute rhythm after that. Spacing, the shrinking of active play and Spanjer's "rank 10, then rank 20" all
point to gaps that keep growing.

---

## 4. Teasers, anticipation and "earned but arriving"

### 4.1 Showing the next step

**Evidence that teasers work:**
- **AdVenture Capitalist** marked where events would unlock. The number of players who pushed to reach that point
  rose sharply, because they wanted something new (interview above).
- **Tap Titans 2's tutorial** names coming unlocks and their stages: the first pet at stage 8, daily rewards at 40,
  and prestige at 60, announced at stage 45
  ([data](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/TutorialEventInfo.csv)).
- **The goal gradient** (Kivetz, above).
  - The time between purchases shrank by 20% (0.7 days) as the free coffee came near.
  - A 12-stamp card with two stamps already filled was completed faster than a plain 10-stamp card. Both needed ten
    purchases.
- **A head start.** Artificial progress toward a goal raises completion and speeds it
  ([Nunes and Drèze 2006](https://doi.org/10.1086/500480)). In their car-wash test, 34% of customers with two free
  stamps finished the card, against 19% without (snippet).
- **Curiosity needs a specific gap.** Curiosity arises when attention falls on a gap in what one knows
  ([Loewenstein 1994](https://doi.org/10.1037/0033-2909.116.1.75)). **[Inference]** One named, pictured next place
  makes that gap. A wall of padlocks only adds choices (Hick) and layers (NN/g).

**What this adds to the house rule.** The sidebar's Next card already shows one step ahead: painting, task and
bar. The evidence adds two points:
- Show the next goal at once after each unlock, because effort sags after a reward.
- A bar that starts partly full pulls harder than an empty one.

### 4.2 A place that is earned but still on its way

**How others present it:**
- **Animal Crossing: New Horizons** ([TheGamer's guide](https://www.thegamer.com/animal-crossing-new-horizons-building-unlock-guide/)):
  - After 15 donations, the museum opens about two days later.
  - Nook's Cranny opens the day after its materials are handed in.
  - The tailors' shop opens after two days of building.
  - Resident Services opens two days after three villagers have moved in.
  - New places spread over the first week or more, and the player watches each one being built.
- **Clash Royale.** Chests a player had already won waited in slots and unlocked on timers. An update on 31 March
  2025 removed the queue ([Chests](https://clashroyale.fandom.com/wiki/Chests)). **[Inference]** Waiting for what
  is already yours wears thin when the wait is long and empty.
- **Fantasy Idle (b712b0f).** The Next card shows an earned place waiting its turn, its bar filling with the
  breather.

**[Inference] What makes a wait feel like an arrival:**
1. The wait is short and full of play.
2. It looks like building, not locking.
3. There is no countdown in seconds, which would read as a gate.
4. Only the next place shows, never the whole queue.
5. A wait that spans the end of a session pays off at the start of the next. That is Animal Crossing's "built
   overnight", and the reason to return that deltaDNA says a first session should end on.

---

## 5. Recommendations for Fantasy Idle

### 5.1 Keep

- Places stay open for good.
- One place at a time, queued in time played, with offline time not counted.
- The Next card shows the place on its way, filling with the breather.
- Cards wait out boss fights. This is Linehan's "introduce at a dip".
- The Clan and Events come after the first prestige.

### 5.2 Let the gap keep growing

Gaps are in minutes of **attended** play (5.3). "Opens at" assumes every place is already earned, as for the tapper,
who is the player the queue binds.

| Place | Now (b712b0f) | Recommended gap | Opens at | Why |
|---|---|---|---|---|
| 1 | 1.5 | **1.5**, after the first boss falls | 1.5 | The core loop is four concepts (Cowan; Mayer's key concepts first); a watcher beats the first boss at about 48 s |
| 2 | 2.5 | **3** | 4.5 | No two places within 3 minutes once play has begun (pattern 11: 3–5 minutes) |
| 3 | 3.5 | **4** | 8.5 | |
| 4 | 4.5 | **5** | 13.5 | Four places in a 10–20 minute first session (deltaDNA, pattern 11) |
| 5 | 5 | **7** | 20.5 | Spacing should grow (Cepeda); AFK Arena and Tap Titans 2 thin out after their burst |
| 6 | 5 | **10** | 30.5 | Rank 10, then rank 20 (Spanjer) |
| 7 | 5 | **15** | 45.5 | Around the first prestige (simulator: 0.7–1.6 h) |
| 8 | 5 | **20** | 65.5 | Later sessions are short and spread out (Guan) |
| 9 on | 5 | **30**, and at most one per return | 95.5 and on | A reason to come back (deltaDNA, Animal Crossing) |

In code: `PLACE_GAPS_MS = [90, 180, 240, 300, 420, 600, 900, 1200, 1800]` seconds.
- **The first 15 minutes barely change.** Places open at 1.5, 4.5, 8.5 and 13.5 minutes, against 1.5, 4, 7.5 and 12
  now.
- **The tail changes.** Places 5 to 9 open at 20.5, 30.5, 45.5, 65.5 and 95.5 minutes, against 17, 22, 27, 32 and 37.

**Caps, counting places earned by climbing and by skilling alike:**

| By minute | A player who only fights | Any player |
|---|---|---|
| 3 | 1 | 2 |
| 10 | 3 | 4 |
| 20 | 5 | 6 |
| 60 | 7 | 8 |

**Places earned by skilling.** Raise `WORK_GAP_MS` from 30 to **90 seconds**, and keep counting them on the ladder.
- Melvor's tutorial island opens about eight skills in 10 to 20 minutes, 1.5 to 2.5 minutes each.
- `game-feel.md` warns that a new piece every ten seconds is noise.
- With 30 seconds, a player who mines first could see Smithing open at about 0:40 and Woodcutting at about 1:10:
  two cards before he has learned the fight.

### 5.3 Count only attended play, and open one place per return

- **What happens now.** `playtimeMs` counts every tick, including a background tab's once-a-minute ticks. Only a
  tab silent for 5 minutes becomes offline time (`src/game.js`). A new player who leaves the game in another tab for
  an hour, while his hero climbs, could return to five or six new places at once.
- **Proposal.** Advance the breather only while the player attends: an input in the last 2 to 5 minutes
  (`meta.lastInputAt` exists), or the page visible, a signal the UI would pass in.
- **On return, open at most one place.** If a place was waiting when the last session ended, open it at the start
  of the next, with its card in the welcome-back report. That is "built overnight", and it ends each session on a
  reason to return.

### 5.4 Open each place when it is useful

The owner's fix for Crafting already follows this rule: "once both are in hand, not hours before"
(`src/data/unlocks.js`). Applied to the rest:

| Place | Trigger now | Recommended trigger | Why |
|---|---|---|---|
| Hunting | Stage 5 | Same | It leads to Cooking, and food answers the first wall, about 4 minutes in |
| Dungeons | Stage 20 | Stage 20 **and** the first wall (a fall at the frontier, or a boss that held out), or 10 minutes past stage 20 | Help at the moment of need beat up-front help (Andersen) |
| Alchemy | Stage 15 | Same | Foraging works on arrival; potions help at the wall |
| Prestige | Stage 30 | Stage 30 **and** a run at least 10 minutes old; teased in the Next card about 5 minutes before | Usable the moment it opens; Tap Titans 2 announces prestige 15 stages ahead |
| Shop | First boss | When its goods have a use: a skill that uses them is open, or there is a skill point | Before that it sells coal, logs, herbs, rabbits and bait to a player who only fights (`GOLD_SHOP`) |
| Hall | First boss | After about 5 medals | Medals announce themselves; the Hall is for looking back |
| Clan | First prestige | Same, ideally at the start of the next session | Social systems after the loop (Tap Titans 2, Egg, Inc.) |
| Events | First prestige | First prestige **and** a festival running or due within a day | Otherwise it opens to an empty place mid-week |
| Agility | Stage 35 | Stage 35, Woodcutting and Smithing open, and half of the first obstacle's 20,000 gold in hand | The simulator builds the first obstacle at 3.5–4.8 h; at minute 27 it is an empty place for hours |

**When several places wait, open them in this order:**
1. What breaks the current wall: Hunting, Dungeons, Alchemy.
2. What changes the loop: Prestige.
3. Conveniences: the Shop, the Hall.
4. Social and weekly places: the Clan, Events.
5. Long-horizon places: Agility.

Today a watcher stuck at stage 30 gets the Shop at minute 4 and the Hall at 7.5, but Dungeons only at 15.5.

### 5.5 The resulting schedule (minutes of attended play)

| Window | New places | Typical set |
|---|---|---|
| Start | (3 open) | Combat, Inventory, Mining |
| 0–5 min | 1, or 2 for a miner | Hunting at 1.5 (Smithing for a miner) |
| 5–15 min | 2–3 | Cooking from the first hunt; Dungeons at the wall; Alchemy |
| 15–30 min | 1–2 | Prestige (teased 5 minutes before); the Shop once a skill can use it |
| 30–60 min | 1–2 | The first prestige; the Hall; Woodcutting or Fishing from work |
| After the first prestige | 1 per return | The Clan at the next session; Events when a festival is near |
| Days 1–3 | 1–2 per day | Agility when within reach; Farming, Crafting and Firemaking as work earns them |

### 5.6 How an arriving place should look

- **One step only.** A tapper who has earned three places sees one on its way.
- **Building, not locked.** The place's painting is being made ready, with a bar that fills with play and no
  countdown.
- **Little text.** Tapping the Next card shows the painting and one line. The rules wait behind the "?" until the
  place opens.
- **The next goal at once.** When a place opens, its card plays and the place glows once. Then the Next card moves
  straight on to the next goal.
- **A head start.** The next bar starts partly filled wherever that is honest, for example with progress already
  made toward a stage.

### 5.7 How to check it

Extend `tools/opening.mjs`.

**New players to simulate:**
- a skiller, who mines, smelts, hunts and cooks;
- a player who leaves the tab in the background for an hour.

**What to report:**
- places opened by minutes 3, 10, 20 and 60;
- the most places opened in any 10-minute window;
- the smallest gap between two places;
- places opened during a boss fight;
- places opened while nobody attended.

**Targets:**
- the caps in 5.2;
- no two places less than 90 seconds apart, and no two climbing places less than 3 minutes apart after the first;
- none during a boss fight, and none while unattended;
- a watcher's longest stretch with nothing new under 60 seconds in the first 10 minutes (it is 62 now). Gear, zones
  and bosses count as new, not only places.

---

## Numbers table

| Number | What it is | Source |
|---|---|---|
| 8 places in 28 s; 8 in 224 s | Tapper and watcher, before the queue | `tools/opening.mjs` |
| 90, 150, 210, 270, then 300 s | The owner's breather between places | b712b0f |
| 8 places in 30 min (tapper), 7 in 25.6 min (watcher) | After the queue | `tools/opening.mjs 45 1` |
| 0.7–1.6 h, stage 40–58 | First prestige of the sensible player | DESIGN §5.2 |
| About 13 openings in 40 stages | AFK Arena, tutorial to stage 2-28 | AFK Arena wiki |
| Bosses 4, 17, 30, 37, then 58 | NGU's feature gates; early runs about 30 min | NGU wiki |
| Levels 2, 6, 15, 18, 35, 40 | Raid's feature gates | Raid wiki |
| 600, 14,300, 160,100, 926,100 XP | Shop Titans, levels 2, 10, 20, 30 | Shop Titans wiki |
| 10K, 25K, 50K ... 25M, up to 500M | Melvor Adventure skill prices, mostly ×2 to ×4 a step | Melvor wiki |
| 1,000 Soul Eggs | Egg, Inc. co-op contracts | Egg, Inc. wiki |
| About 4 (3–5) | Chunks in working memory | Cowan 2001 |
| 10/10, d = 0.79; 13/16, d = 0.75 | Learner-paced segments; key concepts first | Mayer and Pilegard 2014 |
| 839 assessments, 317 experiments | Spacing beats massing; the best gap grows | Cepeda et al. 2006 |
| +75% levels, +29% time | In-context tutorials, complex game only | Andersen et al. 2012 |
| −12% levels, −15% time; 31% used it | On-demand help in Refraction | same |
| 44.8%/19.0% vs 44.2%/18.2% | Day-1 and day-7 retention, gate at 30 vs 40 (90,189 players) | Cookie Cats analysis |
| 20% (0.7 days) | Shorter gaps between purchases near a reward | Kivetz et al. 2006 |
| 34% vs 19% | Card completion with and without a head start (snippet) | Nunes and Drèze 2006 |
| 1–2 days | From an earned building to its opening | Animal Crossing guide |
| 20,000 gold; 3.5–4.8 h | Agility's first obstacle; when the simulator builds it | `src/data/agility.js`, DESIGN §5.2 |
| **1.5, 3, 4, 5, 7, 10, 15, 20, 30 min** | **Recommended gaps between places** | 5.2 |
| **At most 3, 5, 7 places by minutes 10, 20, 60** | **Recommended caps for a player who only fights** | 5.2 |
| **90 s** | **Recommended gap for places earned by skilling** | 5.2 |

---

## Gaps

- **No minutes for other games' gates.** No source gives the time to reach AFK Arena's stages, Raid's levels or Tap
  Titans 2's stages. The shapes in section 1 are solid; their minutes are not.
- **No public A/B test of unlock pacing in an idle game.** The nearest evidence:
  - Cookie Cats tests a waiting gate in a puzzle game.
  - Andersen tests tutorials in three 2010-era browser games.
  - The AdVenture Capitalist interview is qualitative.
- **The psychology comes from outside games:** memory tasks, lessons, loyalty cards. It sets limits and directions,
  not minutes. The recommended gaps are reasoned from it, and need checking with 5.7 and, ideally, real players.
- **Hodent's 2016 talk on onboarding** ([GDC Vault](https://gdcvault.com/play/1022951/The-Gamer-s-Brain-Part)) could
  not be read. It is known only through the write-up in `first-session.md`.
- **Two facts are snippets:** Idle Heroes' level gates and Clicker Heroes' "a day or two".
- **No data on background tabs.** How long browser idle players leave a game open unattended is unknown. The
  attended-time rule in 5.3 is a judgement.

## Sources

**Games**
- AFK Arena wiki: [Ranhorn City (Campaign)](https://afk-arena.fandom.com/wiki/Ranhorn_City_(Campaign)), [Bastion of the Elements](https://afk-arena.fandom.com/wiki/Bastion_of_the_Elements), [Ranhorn](https://afk-arena.fandom.com/wiki/Ranhorn), [Dark Forest](https://afk-arena.fandom.com/wiki/Dark_Forest), [beginner's guide](https://afk-arena.fandom.com/wiki/A_beginners_guide_for_free_to_play_players)
- NGU Idle wiki: [Boss Fights](https://ngu-idle.fandom.com/wiki/Boss_Fights), [New Player Guide](https://ngu-idle.fandom.com/wiki/New_Player_Guide_(Truth))
- [Raid: Shadow Legends, Player Levels](https://raid-shadow-legends.fandom.com/wiki/Player_Levels)
- Shop Titans wiki: [Shopkeeper](https://shop-titans.fandom.com/wiki/Shopkeeper), [Experience](https://shop-titans.fandom.com/wiki/Experience)
- Melvor wiki: [Adventure Mode](https://wiki.melvoridle.com/w/Adventure_Mode), [Adventure/Guide](https://wiki.melvoridle.com/w/Adventure/Guide), [Game Mode](https://wiki.melvoridle.com/w/Game_Mode)
- [Egg, Inc., Contracts](https://egg-inc.fandom.com/wiki/Contracts)
- IdleOn wiki: [Stamps](https://idleon.wiki/wiki/Stamps), [Post Office](https://idleon.wiki/wiki/Post_Office)
- [Tap Titans 2 tutorial table](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/TutorialEventInfo.csv)
- [Clash Royale, Chests](https://clashroyale.fandom.com/wiki/Chests)
- [Animal Crossing: New Horizons building unlock guide (TheGamer)](https://www.thegamer.com/animal-crossing-new-horizons-building-unlock-guide/)
- Snippets: [Idle Heroes buildings (BlueStacks)](https://www.bluestacks.com/blog/game-guides/idle-heroes/idle-heroes-buildings-guide-en.html), [Clicker Heroes: when to ascend](https://gamerofpassion.com/clicker-heroes-when-to-ascend/)

**Industry**
- [Rimmy Spanjer on AdVenture Capitalist, Gamesforum, April 2021 (archived)](https://web.archive.org/web/20250622062038/https://www.globalgamesforum.com/features/idle-game-design-lessons-from-developing-adventure-capitalist)
- [Deconstructor of Fun on AFK Arena, June 2019](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)
- [Florian Jesuha, session design in AFK Arena, June 2020](https://www.gamedeveloper.com/design/flexible-time-session-design-in-afk-arena)
- [Eric Guan, idle game design principles, June 2025](https://ericguan.substack.com/p/idle-game-design-principles)
- [Cookie Cats gate A/B test analysis](https://github.com/archie-cm/A-B-Testing-Mobile-Games)
- [Jakob Nielsen, Progressive Disclosure, NN/g, 2006](https://www.nngroup.com/articles/progressive-disclosure/)

**Research**
- Andersen, O'Rourke, Liu, Snider, Lowdermilk, Truong, Cooper and Popović (2012). *The impact of tutorials on games of varying complexity.* CHI. [PDF](https://grail.cs.washington.edu/wp-content/uploads/2015/08/andersen2012tio.pdf), [doi](https://doi.org/10.1145/2207676.2207687)
- Linehan, Bellord, Kirman, Morford and Roche (2014). *Learning curves: analysing pace and challenge in four successful puzzle games.* CHI PLAY. [CORA](https://cora.ucc.ie/items/9a2cde12-6c3b-420f-9d4c-10ad2d66de3f), [doi](https://doi.org/10.1145/2658537.2658695)
- Cowan (2001). *The magical number 4 in short-term memory.* Behavioral and Brain Sciences 24, 87–114. [doi](https://doi.org/10.1017/S0140525X01003922)
- Sweller (1988). *Cognitive load during problem solving.* Cognitive Science 12, 257–285. [doi](https://doi.org/10.1207/s15516709cog1202_4). Sweller, van Merriënboer and Paas (2019), Educational Psychology Review 31, 261–292. [doi](https://doi.org/10.1007/s10648-019-09465-5)
- Mayer and Pilegard (2014). *Principles for managing essential processing in multimedia learning.* Cambridge Handbook of Multimedia Learning. [Cambridge](https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pretraining-and-modality-principles/DD24C2F48B9B1277CE59F78276110258)
- Cepeda, Pashler, Vul, Wixted and Rohrer (2006). *Distributed practice in verbal recall tasks.* Psychological Bulletin 132, 354–380. [doi](https://doi.org/10.1037/0033-2909.132.3.354)
- Hick (1952). *On the rate of gain of information.* Quarterly Journal of Experimental Psychology 4, 11–26. [doi](https://doi.org/10.1080/17470215208416600)
- Kivetz, Urminsky and Zheng (2006). *The goal-gradient hypothesis resurrected.* Journal of Marketing Research 43, 39–58. [doi](https://doi.org/10.1509/jmkr.43.1.39)
- Nunes and Drèze (2006). *The endowed progress effect.* Journal of Consumer Research 32, 504–512. [doi](https://doi.org/10.1086/500480)
- Loewenstein (1994). *The psychology of curiosity.* Psychological Bulletin 116, 75–98. [doi](https://doi.org/10.1037/0033-2909.116.1.75)
