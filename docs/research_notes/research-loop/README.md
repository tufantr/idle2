# The research loop: everything about similar games, for Fantasy Idle

Started 30 October 2026, at the owner's ask: research similar games and everything relevant on the internet, without
limit, log the findings, and bring improvements for Fantasy Idle: things to add, to change, or to remove. The loop runs
until the owner stops it. `PROPOSALS.md` holds every proposal, ranked; one file per item holds its findings;
`000-fantasy-idle-today.md` is the baseline each finding is held against.

## Rules

- **Research and proposals only.** Nothing is built, changed or deployed from this loop; each proposal waits for the
  owner's pick.
- **The house rules hold** (`CLAUDE.md`), and so do the owner's past decisions. A proposal that goes against one says
  so and why the evidence is worth another look:
  - Keep the core feel: the click on the monster and its combo stay; a mouse macro is fair play; a mini-game's reward
    stays small; no existing mechanic is dropped as a side effect of a new one.
  - The owner judges balance by felt progress (further than before) and pace by Melvor's (DESIGN §5).
  - Refused or parked: a Wardrobe of bought looks ("I want players to see their gear"); the Quartermaster (it would
    make prestiging stronger); boss laws (rules on the walls go unnoticed in an idle game); the clan rulers' habits
    (parked for a better clan idea); the chain over the fight (removed); forging (removed); save export and import
    (removed: everything goes through the server's save).
  - Deferred on purpose (ROADMAP): ranged and magic styles with Fletching and Runecrafting; Township- or
    Summoning-scale systems; real-time chat; synchronous party content; gacha pets; power for sale (the owner plans
    to sell power later, ROADMAP Decisions 2).
  - Open with the owner before this loop: the clan ideas (clan level and talents, clan wars, clan quests), an end
    boss, early Ascensions that each open something new, a cape for 100% completion.
  - The owner's word of 4 November, on the false flags: no announcement, and no attacks given back beyond the one
    player's 4.
- **Players' words are evidence, not orders:** a player's idea goes into the findings; nothing is built without the
  owner's go.
- **Sources:** a link for every claim, numbers over adjectives, quotes short (15 words at most) and few.

## What earlier research covered (go deeper or newer, don't repeat)

- `Fantasy Idle game design research/` (3 October 2026): active vs idle play, offline progress, onboarding,
  achievements, daily loops, saves and UI conventions; combat scaling and prestige (Clicker Heroes, Melvor's combat,
  Tap Titans 2, Idle Slayer, NGU, Realm Grinder, Antimatter Dimensions); loot and itemization (Diablo, Path of Exile,
  Melvor, Idleon); skilling and economy (Melvor, OSRS); clans, raids, events, leaderboards, pets, extra skills.
- `robust-and-fun/` (7 October): onboarding and unlock pacing, hours 10 to 1,000, sessions and player types,
  simulation and audit methods. `incremental-math.md`, `gear-sources.md`, `first-session.md`, `game-feel.md`,
  `crafting-gems.md`, `endless-late-game.md` (15 October).
- The late-game loop of 27 October (Shop variety, late combat and clans, Trials): its notes stayed in a session's
  scratchpad; what came of it is in DESIGN §3.26, §3.33, §3.34, §3.35 and the ROADMAP's parked ideas.

## Method, each iteration

1. Read this file and `PROPOSALS.md`; take the next items in the queue (subagents read the web in parallel).
2. Read the sources: official wikis and patch notes, Steam reviews, Reddit, designers' talks and articles.
3. Hold it against Fantasy Idle as it is (`000-fantasy-idle-today.md`, the code, DESIGN, and the balance tools
   where numbers matter).
4. Write the findings file `NNN-slug.md`: what the game or topic does, what players say, what Fantasy Idle has or
   lacks, and proposals (add, change, remove) with effort and risk.
5. Put what it led to into the queue; update `PROPOSALS.md`.
6. Commit the notes alone, landed by fast-forward; tell the owner the best of it.

## Coverage map: what "complete" means

The owner, 11 November 2026: "every game, every information, everything you need to know to improve the game". The loop
ends when every line below has its file and a round finds nothing new; then one ranked report of improvements goes to the
owner. A game is read for what it teaches Fantasy Idle, not reviewed for its own sake. Lines found along the way are added.

**Games, by family.** The numbers are the files that read a game; a game without one is still to read. Later launches are read
after their dates and added as updates.

- Skilling and MMO-idle: Melvor Idle (002, 014, 015, 017, 018, 019, 020, 022), Old School RuneScape (008, 014), Legends of IdleOn
  (007, 011, 014, 015, 022), Milky Way Idle (006, 011, 014, 017, 022), Scapewatch (006, 018, 019), Ensis IDLE (006, 018), Idle Clans
  (003, 011, 014, 017, 022, 025), RuneScape 3, Brighter Shores, Idlescape, Idle Skilling, Glenwich, Vanya Online, Guilds of Mountgate,
  Evitania Online, Bloobs Adventure Idle and the Golbin Raid (025); after their launches, Lowbar Legends (13 November; 025 read it
  before) and Melvor Idle 2 (17 November; its demo in 017, 019, 020); Idlescape's Steam launch (8 January); Idleforge's Wickhaven
- Idle RPGs and auto-battlers: Idle Champions (009, 015, 016), Tap Titans 2 (003, 011, 015), Soda Dungeon 1 and 2 (009, 015, 024),
  Magic Research 1 and 2 (009, 015, 024), Cauldron (009, 015, 019), Kill the Lich (015), Firestone, AFK Arena and Idle Heroes (014,
  024), AFK Journey (015), Idle Slayer (009, 014, 020), Legendum, My Own Hero Party, Ballad of Heroes, Lowmoor, TBH: Task Bar Hero and
  the taskbar wave, Legends of Dragaea, Incremental Epic Hero 2, Path of Idle (024); after launch, My Own Hero Party (4 December)
- Incrementals with long reset ladders: Antimatter Dimensions (009, 016, 017, 019, 022), NGU Idle (009, 014, 016, 022), Trimps
  (009, 017, 026), Unnamed Space Idle (009, 016, 019, 020), Synergism and Revolution Idle (016), The Tower and Egg, Inc. (011, 016),
  Clicker Heroes 1 and 2 (009, 015, 016), Increlution and CIFI (016), Realm Grinder, Kittens Game, Evolve, Cookie Clicker, Leaf
  Blower Revolution, Idling to Rule the Gods, Idle Wizard, Exponential Idle and Prestige Tree (026), Idle Obelisk Miner, CIFI,
  Theory of Magic, Shark Incremental, Shark Game, BIOTOMATA, Midnight Idle, Idle Loops, Progress Knight, The Point Tree, The
  Communitree, Celestial Incremental, Ethos Idle, Points Progression, Terraformental and Spire Assault (029)
- Short arcs and charm: Nodebuster, the Gnorp Apologue, Tower Wizard and Astro Prospector (009, 018, 019, 020), Tiny Terraces (018),
  Cast n Chill and Rusty's Retirement (020); Download RAM Idle, Universal Paperclips, A Dark Room, Spaceplan, Asbury Pines, Sixty
  Four, Digseum, Booster Pack Heroes, Harvest Dice Profit, Master Healer Kale, Loot Loop, Horripilant, Magic Archery, Shelldiver,
  Bills Must Be Paid and Berry Bury Berry (028)
- Outside the genre, for one system each: Path of Exile, Last Epoch and Diablo 4 (015, 017, 022), Grim Dawn and World of Warcraft
  (015, 017), Clash of Clans, Clash Royale, Brawl Stars, Boom Beach, Marvel Snap, Destiny 2 and Black Desert (011), Hearthstone and
  Hypixel SkyBlock (014), RAID (017), Torn, Kingdom of Loathing, Hay Day and Boom Beach (030)

**Topics** (files in brackets; none means still to do):

- Design: onboarding (019); pacing and the hours to each goal (016, 019); prestige layers (016, 026); offline play (022); combat
  depth, builds and trees (015, 024); gear and loot (015, 017); crafting and the economy, sinks and inflation (022); collections and
  completion (008, 026, 031); achievements and pets (008, 031); tasks and dailies (014, 025, 026); events and seasons (016,
  026); ends and finales (009, 028); story and lore (009, 024, 028, 031); automation and quality of life (016, 017)
- Presentation: UI and readability (019, 021); game feel, sound and music, art direction (020); accessibility (021); performance
  and battery (005, 021); phones (018, 019); number notation (019, 022)
- Social: clans, boards and co-op (003, 011, 025); markets and trading (022, 024, 025: not for this game); chat and moderation
  (006, 023, 030; chat is deferred); running a small community (018, 030)
- Business and operations: money, law and payments (010); stores, launch and growth (010, 018); translations (018); analytics and
  retention (027); cheating and server authority, save safety and backups, privacy, security (023)
- Players' own words: Steam reviews and Reddit (in most files; 1,000 negative reviews coded in 035); Fantasy Idle's Discord (001)
  and its own numbers (027); the design literature (034)
- Measurements on Fantasy Idle: the skip test, clan sizes, CPU (005); supplies at depth and the bot's patience (013); builds at depth
  (015); the bag and the Equip card (017); the Titan's bank (014); the economy's flows (022); accessibility (021); the first hour
  (019); live retention (027); every Trial and dungeon at the hero's frontier, dungeons against the clock wall (032); still to do:
  cross-browser (waits on the owner's OK to download two test browsers), a long session's memory and frames

## Queue

In order; an item done points at its file. Items found along the way are added where they belong.

**Done:**

- [x] Fantasy Idle's own Discord feedback → `001-discord-feedback.md` (second pass 4 November)
- [x] Melvor Idle today, and Melvor Idle 2 (Early Access 17 November 2026) → `002-melvor-idle.md`
- [x] The social side of online idle games → `003-online-social-idle.md`
- [x] What idle players love and hate, the 30-point audit → `004-genre-sentiment.md`
- [x] Measurements: the skip test, clan sizes, CPU, the growth check → `005-measurements.md`
- [x] Ensis IDLE, Scapewatch, Milky Way Idle → `006-look-alikes.md`
- [x] Legends of IdleOn today → `007-idleon.md`
- [x] Old School RuneScape's long-term goals → `008-osrs.md`
- [x] End bosses and raids in idle games; infinite towers → `009-end-bosses.md`
- [x] How idle games sell → `010-money.md`
- [x] Clan wars, clan levels and co-op formats → `011-clan-formats.md`
- [x] Every proposal against the code → `012-proposals-against-the-code.md`
- [x] What food, defence and health do deep in the climb → `013-supplies-at-depth.md`
- [x] Tasks, dailies and bingo boards; Hunts tested against the code → `014-tasks-and-dailies.md`
- [x] Talent trees and build depth; the War Tree measured → `015-trees-and-builds.md`
- [x] How long-haul idle games keep players; their update rhythm → `016-long-haul.md`
- [x] Loot quality of life and automation; the bag and the Equip card measured → `017-loot-and-automation.md`
- [x] How small idle games find players: Reddit, galaxy.click, Steam, phones, translations → `018-finding-players.md`
- [x] Onboarding and readability; the first hour measured → `019-onboarding-and-ui.md`
- [x] Game feel, sound and art → `020-feel-sound-art.md`
- [x] Accessibility, held against the game → `021-accessibility.md`
- [x] The economy and offline play → `022-economy-and-offline.md`
- [x] Cheating, saves, privacy and security → `023-trust-and-safety.md`
- [x] Idle RPGs and auto-battlers not yet read → `024-idle-rpgs.md`
- [x] Skilling and MMO-idle games not yet read → `025-skilling-mmo-idle.md`
- [x] Classic incrementals not yet read → `026-classic-incrementals.md`
- [x] Fantasy Idle's own numbers: retention, depth → `027-live-numbers.md`
- [x] Short arcs and charm → `028-short-arcs.md`
- [x] More incrementals → `029-more-incrementals.md`
- [x] Small communities, and running one alone → `030-small-communities.md`
- [x] Achievements, pets and lore → `031-achievements-pets-lore.md`
- [x] Trials and dungeons at the hero's frontier, measured → `032-trials-and-dungeons-measured.md`
- [x] Melvor Idle 2 before its launch → `033-melvor-idle-2-before-launch.md`
- [x] What the design literature says → `034-design-literature.md`
- [x] Why idle RPG players leave negative reviews → `035-negative-reviews.md`

**Next, measurements on Fantasy Idle itself** (no code changes, tools and browsers only):

- [ ] Every proposal from P-023 on against the code, as 012 did for the first ones: status, claims, effort, overlaps, order,
      and the ten with the best value for the effort (before the final report)
- [ ] The deep balance numbers again once the simulator's stall test works (P-122): 300 and 600 hours, 12 seeds, the check-in bot
      too, the best dungeon visit length, P-024's ceiling date (032)
- [ ] A long session: the game open 6–24 hours in Chromium, heap and frame rate every ten minutes, plain and throttled (028)
- [ ] The Titan's bank and the laurel against a one-day floor with the daily and check-in bots (034, P-059); a Titan at the hero's best (032)
- [ ] Cross-browser: Firefox and Safari (WebKit) through Playwright, which needs those browsers installed (ask the
      owner before downloading them) (004)
- [ ] Why the sensible bot climbs faster when something sends it away from the boss wall (013): is it the bot, or does a
      player at a clock wall lose time?
- [ ] Food and defence under Trials, in dungeons, at the Titan and at the clan boss (013); every Trial and dungeon at the
      hero's frontier, build by build, and a dodge set in Glass Hero or a lifesteal set in Fasting (015, 017)
- [ ] The economy talents over a whole game; XP and essence below the frontier against the War Tree's pace (014, 015)
- [ ] Deep drops: 40 of the drop table's 100 weights carry no attack, and the sure pieces go to the slot that lags (017)
- [ ] How long live players take from stage 1,000 to 2,000; weekly return of clan members against others, knowing the
      bias (009, 011)
- [ ] The battery saver's saving on a phone-class CPU (Chrome's 4x throttle) (005)

**Next, games:**

- [ ] The positive reviews of 035's ten games, coded the same way, to set each theme against praise (035)
- [ ] Last leads: Shelldiver's makers' next, One Trillion Free Draws, Q-UP, WalkScape, Solvendra Idle, Dragon's Tear, Idleforge's Wickhaven (024, 025, 028, 029)
- [ ] Egg, Inc.'s Path of Virtue as players took it; Revolution Idle's Minerals update as a disliked layer; CIFI's and Idle
      Obelisk Miner's update logs; Shark Incremental, BIOTOMATA and Kill the Lich, Best Web 2025 (016)
- [ ] Tiny Terraces and Harvest Dice Profit; how Kittens Game wrapped its web game for Steam (018)

- [ ] Short arcs with endings: Nodebuster, the Gnorp Apologue, Tower Wizard, Download RAM Idle, Astro Prospector
- [ ] Presentation and charm: Asbury Pines, Sixty Four, Rusty's Retirement, Cast n Chill, Digseum, Booster Pack Heroes
- [ ] Long-haul structure: Shark Incremental, Shark Game, Prestige Tree, Revolution Idle, CIFI, Idle Obelisk Miner,
      BIOTOMATA, Midnight Idle, Theory of Magic, Ballad of Heroes, My Own Hero Party

- [ ] Idle Loops and Progress Knight: loop games and their automation (Clicker Heroes 2, Idle Champions and Increlution are in 016)

**Next, mechanics across games:**

- [ ] Seasons and leagues (OSRS Leagues, Path of Exile leagues, Diablo seasons): a fresh-start layer for an idle RPG
- [ ] Collection logs and completion (the open "cape for 100%" item)
- [ ] Self-made modes and goals: Taskman, share-of-players figures on medals (008); Melvor's lore books against the
      Chronicle (009)
- [ ] Pets and companions with a job (IdleOn, Melvor's Summoning, OSRS)
- [ ] Achievements and medals: design, rewards, secret ones

**Next, players and the community:**

- [ ] The Discord again each few iterations (001 has two passes, the last on 4 November); roles by depth (009), as Unnamed
      Space Idle's bot gives roles by sector (016)
- [ ] r/ScapeLikes' rules; galaxy.click's answer on the submission; referrers in Cloudflare's analytics (the owner's) (018)
- [ ] Developers' heuristics for exit and re-entry (Byers, Gibbs and Nansen, CHI 2026) against the welcome-back report (014)
- [ ] A question to the Discord on whether the deep rounds read as repeats (025); a first-hour funnel from the server's saves, with the owner's OK (019)

**Next, technology and platforms:**


**Next, dated (each is worth a look after its date):**

- [ ] Lowbar Legends (13 November) and Melvor Idle 2 (17 November): launches, prices, what players say; the sequel's
      Slayer, trees, bank, loadouts and automation (006, 010, 014, 015, 017)
- [ ] My Own Hero Party on Steam (4 December) (016)
- [ ] Idle Clans' quest rework a month on, from 20 November; Tap Titans 2's Clan Technology once 8.4 ships (011)
- [ ] The EU's Digital Fairness Act, Turkey's game rating regulation, when published (010); the UK's Online Safety Act and the EU's
      Digital Services Act for a small service with player-written clan text (030)
- [ ] Melvor Idle 2 again after 24 November with its launch reviews (033)
- [ ] CIFI's and Idle Obelisk Miner's packs; Idlescape's free Steam launch, 8 January 2027 (010, 018)

## Index

| # | File | Item | Date |
|---|---|---|---|
| 000 | `000-fantasy-idle-today.md` | The baseline: Fantasy Idle as it is | 30 Oct 2026 |
| 001 | `001-discord-feedback.md` | Fantasy Idle's own Discord, 22–30 October | 30 Oct 2026 |
| 002 | `002-melvor-idle.md` | Melvor Idle today, and its sequel | 30 Oct 2026 |
| 003 | `003-online-social-idle.md` | The social side of online idle games | 30 Oct 2026 |
| 004 | `004-genre-sentiment.md` | What idle players love and hate; the 30-point audit | 30 Oct 2026 |
| 005 | `005-measurements.md` | Round two's measurements: clans, the growth check, CPU, the skip test | 30 Oct 2026 |
| 006 | `006-look-alikes.md` | Ensis IDLE, Scapewatch, Milky Way Idle | 30 Oct 2026 |
| 007 | `007-idleon.md` | Legends of IdleOn in 2025–2026 | 30 Oct 2026 |
| 008 | `008-osrs.md` | Old School RuneScape's long-term goals | 4 Nov 2026 |
| 009 | `009-end-bosses.md` | End bosses, finales and endless modes | 4 Nov 2026 |
| 010 | `010-money.md` | How idle games sell | 4 Nov 2026 |
| 011 | `011-clan-formats.md` | Clan levels, quests and wars | 4 Nov 2026 |
| 012 | `012-proposals-against-the-code.md` | Every proposal against the code | 4 Nov 2026 |
| 013 | `013-supplies-at-depth.md` | What food, defence and health do deep in the climb | 4 Nov 2026 |
| 014 | `014-tasks-and-dailies.md` | Tasks, dailies and bingo boards | 11 Nov 2026 |
| 015 | `015-trees-and-builds.md` | Talent trees and build depth | 11 Nov 2026 |
| 016 | `016-long-haul.md` | How long-haul idle games keep players | 11 Nov 2026 |
| 017 | `017-loot-and-automation.md` | Loot quality of life and automation | 11 Nov 2026 |
| 018 | `018-finding-players.md` | How small idle games find players | 11 Nov 2026 |
| 019 | `019-onboarding-and-ui.md` | Onboarding and readability | 11 Nov 2026 |
| 020 | `020-feel-sound-art.md` | Game feel, sound and art | 11 Nov 2026 |
| 021 | `021-accessibility.md` | Accessibility, held against the game | 11 Nov 2026 |
| 022 | `022-economy-and-offline.md` | The economy and offline play | 11 Nov 2026 |
| 023 | `023-trust-and-safety.md` | Cheating, saves, privacy and security | 11 Nov 2026 |
| 024 | `024-idle-rpgs.md` | Idle RPGs and auto-battlers not yet read | 11 Nov 2026 |
| 025 | `025-skilling-mmo-idle.md` | Skilling and MMO-idle games not yet read | 11 Nov 2026 |
| 026 | `026-classic-incrementals.md` | Classic incrementals not yet read | 11 Nov 2026 |
| 027 | `027-live-numbers.md` | Fantasy Idle's own numbers | 11 Nov 2026 |
| 028 | `028-short-arcs.md` | Short arcs and charm | 11 Nov 2026 |
| 029 | `029-more-incrementals.md` | More incrementals | 11 Nov 2026 |
| 030 | `030-small-communities.md` | Small communities, and running one alone | 11 Nov 2026 |
| 031 | `031-achievements-pets-lore.md` | Achievements, pets and lore | 11 Nov 2026 |
| 032 | `032-trials-and-dungeons-measured.md` | Trials and dungeons at the hero's frontier, measured | 11 Nov 2026 |
| 033 | `033-melvor-idle-2-before-launch.md` | Melvor Idle 2 before its launch | 11 Nov 2026 |
| 034 | `034-design-literature.md` | What the design literature says | 11 Nov 2026 |
| 035 | `035-negative-reviews.md` | Why idle RPG players leave negative reviews | 11 Nov 2026 |

Paused cleanly on 11 November after round six, at the owner's word. Round seven (positive reviews, the last game leads,
online-safety law, the balance with a fixed bot, a long session and the banked clocks, and the newer proposals against the code)
had just started and was stopped before it wrote anything; it starts again on resume, then one check for anything new, then the
final ranked report to the owner.

Round three (4 November) folded the proposals of 005, 006 and 007 into `PROPOSALS.md`, and corrected the earlier files where the
code check and new measurements disagreed with them.
