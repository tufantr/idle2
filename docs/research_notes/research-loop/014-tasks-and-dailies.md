# 014: Tasks, dailies and bingo boards (read 11 November 2026)

Read from the games' wikis (Melvor's through its API), patch notes, three papers, Duolingo's posts, Steam discussions, and three subreddits through the
[Arctic Shift](https://arctic-shift.photon-reddit.com/) archive (Reddit can't be fetched directly; points as archived; it refused or timed out most searches, so
Reddit is thin). Steam's review endpoint redirected every request: no reviews mined. Fantasy Idle was read in the code and measured with `tools/simulate.mjs`
(seed 1, one run each, a seed moves about 5%) and scripts parking a saved hero on a stage, scratch files since deleted. Guides and developers' claims say unverified. No page held instructions aimed at me.

**In short:** what players ask for, across these games: tasks that finish themselves, banks of a day or more, counts instead of streaks. What they call work:
dailies that don't build up, big counts, upkeep after an absence. Fantasy Idle already does most of it; the Titan (three hours banked) and the week's laurel
(none) don't. Hunts survive the owner's two refusals only as a button on the bestiary, not as a board. I found no idle game with a bingo board; the weekend
could hold a small one without a server, against the spirit of "No suggestions".

## 1. Task and bounty systems

| Game | How it's built | What it asks of the player's time | What it pays |
|---|---|---|---|
| Melvor's Slayer ([wiki](https://wiki.melvoridle.com/w/Slayer)) | 14–554 kills of one monster by tier and level; a done task renews in its tier for free; another pick costs 0–100,000 coins; Auto Slayer (150,000 coins) fights each next one | Nothing once Auto Slayer is bought: a player idled one tier for a week ([27 points](https://www.reddit.com/r/MelvorIdle/comments/18n3n3w/)) | Coins of 10% of the monster's health, on task only; XP; the areas whose drops combat needs |
| Melvor's Township casual tasks ([wiki](https://wiki.melvoridle.com/w/Township)) | One every 5 hours, 5 held, each doable without training ([since 1.1.2](https://wiki.melvoridle.com/w/V1.1.2)) | 5 × 5 hours covers a day: a daily visit loses none | 9% of a level's XP, gold, coins |
| Idle Clans ([wiki](https://idleclans.wiki/w/Quests)) | 6 daily quests (8 rerolls), 4 weekly (6); a $4.99 token makes it 10 (16) and 6 (12) | Dailies lost unfinished at midnight UTC; since [October 2026](https://www.reddit.com/r/idleclans/comments/1xanhpr/) quests go into a 6–16 task queue that runs offline | Gold 7,500–75,000, items, a pet at 0.1–0.4% |
| IdleOn ([tasks](https://idleon.wiki/wiki/Tasks)) | Per world, about 8 sets of 10 levels (world 1: defeat 2K monsters up to 50M), shared by all characters; 28 daily tasks in world 1 ([page](https://idleon.wiki/wiki/Tasks/Blunder_Hills)) | The sets are lifetime goals; the dailies join the ten-plus check-ins of 007 | Recipe points; merits for bag slots, respawn, boss keys |
| Milky Way Idle ([wiki](https://milkywayidle.wiki.gg/wiki/Tasks)) | A random task every 8 hours (4 with upgrades), never expiring, 8 slots up to 48; rerolls 10,000 coins doubling to 320,000; slots that block a skill | Held, so time away costs little | Coins and tokens; a gift every 50 points |
| Firestone ([quests](https://firestone-idle-rpg.fandom.com/wiki/Quests), [expeditions](https://firestone-idle-rpg.fandom.com/wiki/Expeditions)) | 9 daily quests; 10 weekly, mostly a daily done 5 times; expeditions one at a time, 5 of 20, 5–60 minutes, new ones every 6 hours | Expeditions want a visit within the hour; the weekly 5 of 7 forgives two days | Currencies, chests; 10 guild coins a minute of expedition |
| AFK Arena ([guide, unverified](https://www.bluestacks.com/blog/game-guides/afk-arena/afka-daily-todo-list-en.html); AFK Journey's list I couldn't source) | 11 daily chores (a guild hunt, an arena fight, 3 bounties, a summon ...) worth 100 points | A tap in each of many screens | Chests of diamonds and scrolls |
| NGU Idle ([spin](https://ngu-idle.fandom.com/wiki/Daily_Spin), [AP](https://ngu-idle.fandom.com/wiki/Arbitrary_Points)) | One spin a day; the 24 hours restart at the spin, no bank; the wheel improves at 7, 14, 30 ... 365 spins, counted; 200 AP for a manual save once a day | One click | AP and consumables |

**Players' take:**
- **Tasks should run themselves.** A Melvor Idle 2 demo player found no way to chain Slayer tasks and won't sit watching the counter
  ([8 points](https://www.reddit.com/r/MelvorIdle/comments/1xe6zxf/), October 2026). Idle Clans' October queue takes a player's quests too.
- **Upkeep after an absence is the chore.** A Melvor player with 10–20 minute sessions spends them untangling Township after two days away, and wants to
  "log in, collect, make one or two decisions, and go back to combat" ([12 points, 30 comments](https://www.reddit.com/r/MelvorIdle/comments/1s1gpb6/)).
- **Missed days and big counts.** An Idle Champions player back from a holiday asked for dailies that build up; 30 of the season's 210 earn its main rewards
  ([Steam, 2022](https://steamcommunity.com/app/627690/discussions/0/3481871877432816186/)). Idle Slayer's weekly 180,000 kills was called absurd for a game opened after work ([Steam, 2022](https://steamcommunity.com/app/1353300/discussions/0/5287797783031277967/)).
- **A harder ask brings revolt.** Hearthstone holds three dailies (a fourth is lost). Its weekly quests got harder in April 2024 (5 wins became 15): a statement
  in two days, easing in three, a full revert in November ([wiki](https://hearthstone.wiki.gg/wiki/Daily_quest)).

## 2. Daily and weekly loops that aren't chores

- **One reward, two feelings:** among [178 players](https://research-portal.uu.nl/en/publications/daily-quests-or-daily-pests-the-benefits-and-pitfalls-of-engageme/)
  (Frommel and Mandryk, 2022) the same rewards read as motivation, as FOMO, or as a chore; the full text was blocked to me, and the abstract gives no shares.
  In [seven studies](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions) (Silverman and Barasch,
  2023) a broken streak shown in a log lowered later engagement; a way to repair it softened that.
- **Forgiveness raised returns where tested:** Duolingo's Weekend Amulet made learners 4% likelier to return a week later and 5% less likely to lose the streak
  ([2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)); one lesson keeping the streak, not the day's goal, lifted
  day-14 retention 3.3%, relative ([2020](https://blog.duolingo.com/improving-the-streak)). A learning app, not a game that pays while away.
- **Developers' view:** in [20 interviews](https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/10ec965c-1a6e-4699-baa0-5f56ac8eface/content) (Byers, Gibbs and
  Nansen, CHI 2026) daily challenges and weekly lockouts read as exit points that say it's fine to stop, time pressure tied to sales as exploitative; two
  heuristics fit: say the log-in cadence and how long rewards last; design for exit and re-entry, with catch-up. [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2024/9/23/daily-missions-in-puzzles-why-should-we-see-them-more-often)'s case for missions, an appointment mechanic, has no figures.

**Fantasy Idle's banks, held against a day** (from the code):

| What | Fills | Banks | A once-a-day player |
|---|---|---|---|
| Daily crate (`src/systems/daily.js`) | Every 20 hours | 3 (60 hours); every 7th great, counted, no streak | Loses nothing |
| Clan attacks (000) | 3 a day | 6 (two days) | Loses nothing |
| Festival tokens (`src/data/events.js`) | 1 per 20 kills or actions | Capped at 60 a day; the replay earns them | Gets all 180 |
| The Titan (`src/data/dungeons.js:249-260`) | 1 an hour | 3; fought only by a tap (`src/main.js:1595`), never in the replay | Gets 3 of 24 |
| The week's laurel (P-017) | Once a week | None | A missed week is gone |

Measured over 300 hours: one 15-minute visit a day (`--player=daily1 --auto`) won 29 Titans in 37 tries, the bank's three a day; three short visits 63; always
on, 245. A Titan is +2% attack and health for good, half from the 21st. Without Titans the always-on bot stood 7–10% lower from 100 to 300 hours (1,290 against
1,410 at the end); the daily bot reached 394 without them against 360 with, so its 29 gained it nothing in one seed. The Titans pay those who come every few
hours, the player the code's comment sized the bank for.

**A good reason to come back**, then: something finished while away that wants one decision (a renewed task, a ripe crate, a prestige); a bank of a day or
more; counts, not streaks (NGU's wheel, the seventh crate); a cap that says "done for today" (the festival's 60 tokens); nothing lost at a reset.

## 3. Bingo boards

- **Grid Master** (008 has the frame; [wiki](https://oldschool.runescape.wiki/w/Grid_Master)): 17 easy, 20 medium and 12 hard tasks (100, 350 and 1,000 points); every tile
  paid, every line more. The middle row and column (a 200% XP boost) were finished by 68.4% and 66.4%, rows and columns 3 and 5 by 36.8–41.7%, the other eight lines
  by 9.5–22.1%; the first three finished in 8 days. Jagex promised the board for player-run events after a poll; asked in August ([1 point](https://www.reddit.com/r/2007scape/comments/1vlerpk/)), I found no release.
- **Clan bingos stay player-run** (008 has their reach). The plugin 008 linked runs 4×4 or 5×5 boards, tile races and skill weeks (one of 128 players) so that
  progress shows in the game, not a spreadsheet ([68 points](https://www.reddit.com/r/2007scape/comments/1ug4nuc/)). Posts from June to August report bans of
  accounts holding gold buy-ins for prizes ([one](https://www.reddit.com/r/2007scape/comments/1uf1446/); removed, unverified).
- **Hypixel SkyBlock's Bingo** ([wiki](https://hypixelskyblock.minecraft.wiki/w/Bingo)): the first 7 days of each month, on a fresh profile deleted after; a 5×5 card of 20 personal
  goals and 5 community ones on the diagonal (tier n asks n times tier 1, paid by percentile); 1 point a goal, 5 a line, 160 at most; points buy looks, conveniences, ranks.
- **Idle games:** a search found no board in Melvor, Idle Clans, IdleOn or Milky Way Idle (an absence, so unverified).

**Fit for Fantasy Idle.** *The weekend:* events run on the UTC calendar with no server (`src/systems/events.js`), so a personal board needs none. The weekend
has nothing to aim at but its shop: a deep hero parked where one blow kills makes the day's 1,200 kills in 15 minutes, and the replay makes them while he's
away. A 3×3 of places he has opened (a dungeon cleared, a Titan won, a Lord felled, a gilded kill, a harvest), filled by play and the replay, a line paying
tokens and the board a hem on the festival cloak, would give the three days a shape. Against it: it is a list of things to do, the removed quest board's
shape (`docs/DESIGN.md:810`), untried in any idle game. *Clans:* a shared board is P-004's quests in a grid, needing the kills and actions `powerSummary` lacks
(012); at 5 clans and 15 active players 3×3 is the size, and percentile tiers need a crowd.

## 4. Hunts, tested against the code

**What the code holds:** `killsByMonster` counts every kind (`src/systems/combat.js:520`): 183, 50 in the ten lands, 75 in the strata, 58 in dungeons
(`src/data/bestiary.js`, evaluated); stars at 10, 100 and 1,000, medals at 25 and 100 stars only (`src/data/achievements.js:17-18`). `farmMode` holds him on a
stage, in the replay too, and Auto prestige waits meanwhile (`src/systems/prestige.js:123`). Every run starts at a tenth of the best stage
(`src/core/formulas.js:89,317`). The bestiary shows each count and a bar to the next star (`src/ui/render.js:1762`), and no way there.

**Measured** (always on, with Pacts and Charms; heroes saved as the best stage first reached 1,000, at about 165 hours, and 1,400, at about 275):
- **The lands' stars freeze.** At 1,000 and at 1,400 alike, the 50 land kinds hold no star, one, two and three in 5, 10, 30 and 5 kinds (the meadow's five: 5–8
  kills each), since from best 1,000 every run starts past the lands. By 1,400 the strata have 62 of 75 kinds at three stars (the 13 short are bosses), 445 of
  549 in all. Eight of the 15 active players stand past 1,000, so their runs start at 132–244; that their land stars froze is my inference, no live save read.
- **Going back costs minutes.** Parked, the 1,400 hero fells 4,800 an hour wherever one blow kills, from stage 3 to about 200 below his best, and 600–940 at
  the frontier. The 45 land kinds short of three stars need 36,000 more kills, 7.5 hours parked; the 13 strata bosses 3,600. Against that, the climb gave 80
  stages from hour 230 to 270: 3 records (×1.16 on what the tokens give) and ×1.45 tokens. A 1,000-kill hunt is 12.5 minutes of that.
- **The frontier isn't the best farm.** Parked 200 stages down he earns 1.0M combat XP an hour on a plain stage and 3.0M on a boss's, against 0.15–0.23M at
  the frontier, and 3,000–6,000 essence an hour against 200–630. Gold, the camp's money, is best at the frontier.

**Against the owner's refusals:**
- **"No suggestions."** The advisor and its quest board went to keep the screen simple; what is ready shows on the thing itself (`docs/DESIGN.md:810-820`).
  Three kinds offered by the game, 008's form, would bring the board back. A Hunt started from a kind's tile is the player's own pick, on a page that already
  shows the count and the next star. That form survives.
- **The Quartermaster** was parked because it would make prestiging stronger. Hunts pay no power and leave prestige alone: they survive. Bag rows wouldn't
  move a deep hero: all twelve cost about 520,000 essence (`BAG_UPGRADE`, `src/data/items.js`), and my hero held 295,000 at 1,000 and 663,000 at 1,400.
- **Would a climbing hero leave the climb?** For minutes, yes; below the frontier he even gains XP and essence. But only for something he wants. The 65 stars
  the lands still owe him are about 1% of the completion figure, a weak pull alone; a land's full set paying a look (P-044) pulls harder. A night parked on
  the meadow would cost the climb, as Auto prestige waits, so a hunt must end at its star and send him back up. **To measure:** live heroes' stars by place
  (the owner's OK to read saves); whether live players already park below their best; after a build, who hunts.

## Held against Fantasy Idle (each checked in the code)

| Elsewhere | Fantasy Idle today | Verdict |
|---|---|---|
| Tasks renew and run themselves (Melvor's Auto Slayer, Idle Clans' queue) | Travel and "Stay on this stage"; nothing ends itself | Gap: Hunts on the bestiary |
| Banks that cover a day (Melvor's 5 × 5 hours; Milky Way's 8–48 slots) | Crate 60 hours, clan attacks two days, Titan three hours, laurel none | Titan and laurel are the exceptions |
| Daily lists lost at reset (Idle Clans, Hearthstone's fourth) | None | Keep it so |
| Extra dailies or banking for money (Idle Clans' $4.99 token, [premium to stack boosts](https://www.reddit.com/r/idleclans/comments/1e99zy8/)) | Nothing for sale | Backs P-057 |
| Timers to check (Firestone's expeditions) | The Titan, hourly | The Titan |
| Counts, not streaks (NGU's wheel); a cap that says "done for today" | The seventh crate counted; 60 festival tokens a day | Aligned; nothing to aim at past the cap |
| Bingo boards, with community goals (Grid Master, Hypixel) | None | A weekend board needs no server; a clan board is P-004's shape; P-039 thin at 15 active |

## Proposals from this file

1. **Hunts on the bestiary** (Change P-032 to this smaller form; Add, S–M). Tap a land's or a stratum's kind: the hero travels to its first stage, stays to
   its next star, then climbs again, in the replay too, with Auto prestige held only meanwhile. No marks, no offers of three, no rerolls; the reward is the
   star, and P-044's full land set pays a look. Why: players keep asking for tasks that run themselves (Melvor, Idle Clans); a deep hero can't climb to the
   65 land stars he lacks, and fetching them costs 7.5 hours against the 40 that 80 stages take; no power, no board. A card on tap also brings the next-star
   count, a `title` today (`src/ui/render.js:1785`), to phones.
2. **The Titan's three hours** (Change, S to change, M with balance runs; the owner's call). A daily player wins 29 Titans in 300 hours against 245; they are
   worth 7–10% of the always-on hero's depth. Ways: a bank of a day, at up to 24 one-minute fights a visit; banked Titans fought in the replay when the idle hero
   would win, near the parked Quartermaster in spirit (it automates a power source); or keep it and say the cadence on the Titan's "?". Why: Melvor sizes banks
   to a day, Jagex keeps equal time (008), time-limited permanent power is a top hate (004). The growth check must allow what changes.
3. **A weekend board** (Add, M; thin; the owner's call against "No suggestions"). Section 3's 3×3, personal, no server, looks only. Why: Grid Master and
   Hypixel pay every tile and line, so partial play counts (middle lines 66–68%, the others 9.5–42%). Thin: no idle game has one.

**For earlier proposals:** P-017 (laurels that wait) gains Silverman and Barasch's repair, Byers' catch-up paths and the Idle Champions player's ask; P-044 the
frozen lands; P-004 the grid shape and in-game progress; P-039 Hypixel's community goals; P-057 Idle Clans' paid dailies.

**What doesn't carry over:** daily lists lost at reset; rerolls and block slots (nothing random to fix); timed expeditions; percentile tiers among 15 players;
a fresh profile for a bingo (one save an account, as 008 said of Leagues); proof by screenshot (the server reads uploads); gold buy-ins (no trade here).

**Noticed in passing:** a parked boss pays about three times its stage's plain monster when one blow kills it (3.0M against 1.0M XP an hour, 6,000 against
3,000 essence, stages 1,200 and 1,195), against `killPayout`'s comment that parking on a boss is never the best farm (`src/systems/combat.js:345-351`).

**For the queue:** Melvor Idle 2's Slayer after 17 November; Idle Clans' quests a month after the rework; XP and essence below the frontier against the War Tree's
pace; live heroes' stars by place; Byers et al. against the welcome-back report; the GDC 2025 Teamfight Tactics talk on letting players leave (snippets only, left out).
