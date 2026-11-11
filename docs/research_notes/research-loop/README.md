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

- Skilling and MMO-idle: Melvor Idle (002, 014, 015, 017, 018), Old School RuneScape (008, 014), Legends of IdleOn (007, 011,
  014, 015), Milky Way Idle (006, 011, 014, 017), Scapewatch (006, 018), Ensis IDLE (006, 018), Idle Clans (003, 011, 014, 017);
  only glanced at: RuneScape 3 (011), Glenwich, Vanya Online and Guilds of Mountgate (006), Idle Skilling (010); still to read:
  Brighter Shores, Idlescape, the Golbin Raid; after their launches, Lowbar Legends (13 November) and Melvor Idle 2 (17 November)
- Idle RPGs and auto-battlers: Idle Champions (009, 015, 016), Tap Titans 2 (003, 011, 015), Soda Dungeon 2 (009, 015), Magic
  Research 2 and Cauldron (009, 015), Kill the Lich (015), Firestone and AFK Arena (014), AFK Journey (015), Idle Slayer (009, 014);
  still to read: Idle Heroes, Soda Dungeon 1, Legendum, Magic Research 1, My Own Hero Party (Steam, 4 December), Ballad of Heroes, Lowmoor
- Incrementals with long reset ladders: Antimatter Dimensions (009, 016, 017), NGU Idle (009, 014, 016), Trimps (009, 017),
  Unnamed Space Idle (009, 016), Synergism and Revolution Idle (016), The Tower and Egg, Inc. (011, 016), Clicker Heroes 1 and 2
  (009, 015, 016), Increlution (016), CIFI (016); only glanced at: Realm Grinder, Kittens Game, Cookie Clicker, Leaf Blower
  Revolution, Idling to Rule the Gods, Idle Wizard (010, 018); still to read: Prestige Tree, Idle Obelisk Miner, Theory of Magic,
  Exponential Idle, Evolve, Shark Incremental, Shark Game, BIOTOMATA, Midnight Idle, Idle Loops, Progress Knight
- Short arcs and charm: Nodebuster, the Gnorp Apologue, Tower Wizard and Astro Prospector (009, 018), Tiny Terraces (018); still to
  read: Download RAM Idle, Universal Paperclips, A Dark Room, Spaceplan, Asbury Pines, Sixty Four, Rusty's Retirement, Cast n Chill,
  Digseum, Booster Pack Heroes, Harvest Dice Profit
- Outside the genre, for one system each: Path of Exile, Last Epoch and Diablo 4 (015, 017), Grim Dawn and World of Warcraft (015,
  017), Clash of Clans, Clash Royale, Brawl Stars, Boom Beach, Marvel Snap, Destiny 2 and Black Desert (011), Hearthstone and Hypixel
  SkyBlock (014), RAID (017); still to read: Hay Day, Torn, Kingdom of Loathing

**Topics** (files in brackets; none means still to do):

- Design: onboarding; pacing and the hours to each goal (016); prestige layers (016); offline play; combat depth, builds and trees
  (015); gear and loot (015, 017); crafting and the economy; sinks and inflation; collections and completion (008); achievements
  (008); pets (008); tasks and dailies (014); events and seasons (016); ends and finales (009); story and lore (009, a little);
  automation and quality of life (016, 017)
- Presentation: UI and readability; game feel; sound and music; art direction; accessibility; performance and battery (005);
  phones (018); number notation
- Social: clans, boards and co-op (003, 011); markets and trading; chat and moderation; running a community (018, a little)
- Business and operations: money, law and payments (010); stores, launch and growth (010, 018); translations (018); analytics and
  retention; cheating and server authority; save safety and backups; privacy; security
- Players' own words: Steam reviews and Reddit (in most files); Fantasy Idle's Discord (001) and its own numbers (live depths
  in 009 and 013; retention still to do)
- Measurements on Fantasy Idle: the skip test, clan sizes, CPU (005); supplies at depth (013); builds at depth (015); the bag and
  the Equip card (017); the Titan's bank (014); still to do: cross-browser, the bot's patience, live retention, every Trial and dungeon
  at the hero's frontier

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

**Next, measurements on Fantasy Idle itself** (no code changes, tools and browsers only):

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

- [ ] Lowmoor (a zero-player idle RPG with 2,108 nodes) and Tap Titans 2's build talk (015)
- [ ] Egg, Inc.'s Path of Virtue as players took it; Revolution Idle's Minerals update as a disliked layer; CIFI's and Idle
      Obelisk Miner's update logs; Shark Incremental, BIOTOMATA and Kill the Lich, Best Web 2025 (016)
- [ ] Tiny Terraces and Harvest Dice Profit; how Kittens Game wrapped its web game for Steam (018)

- [ ] Cauldron (Best Paid Game 2025), Legendum, Magic Research 2 (Best New Game 2024): heroes, lives, teams
- [ ] Soda Dungeon 2, Idle Champions, Kill the Lich, Terraformental: party rules, formations, time compression,
      remembered routines
- [ ] Short arcs with endings: Nodebuster, the Gnorp Apologue, Tower Wizard, Download RAM Idle, Astro Prospector
- [ ] Presentation and charm: Asbury Pines, Sixty Four, Rusty's Retirement, Cast n Chill, Digseum, Booster Pack Heroes
- [ ] Long-haul structure: Shark Incremental, Shark Game, Prestige Tree, Revolution Idle, CIFI, Idle Obelisk Miner,
      BIOTOMATA, Midnight Idle, Theory of Magic, Ballad of Heroes, My Own Hero Party

- [ ] Firestone Idle RPG, AFK Arena and AFK Journey, Idle Heroes: idle RPG loops, towers, guild bosses, what retains
- [ ] Brighter Shores (RuneScape's creator, 2024): skills and episodes designed anew
- [ ] RuneScape 3: archaeology, relics, daily challenges, and its shop's backlash (what not to do)
- [ ] Idle Loops and Progress Knight: loop games and their automation (Clicker Heroes 2, Idle Champions and Increlution are in 016)
- [ ] The Golbin Raid (Melvor's roguelite side mode): how players took it

**Next, mechanics across games:**

- [ ] Seasons and leagues (OSRS Leagues, Path of Exile leagues, Diablo seasons): a fresh-start layer for an idle RPG
- [ ] Collection logs and completion (the open "cape for 100%" item)
- [ ] Self-made modes and goals: Taskman, share-of-players figures on medals (008); Melvor's lore books against the
      Chronicle (009)
- [ ] Small old communities and other co-op: Torn's factions, Kingdom of Loathing's clan dungeons, Hay Day's Derby,
      Boom Beach's Task Forces (011)
- [ ] Late-game economies: gold inflation, sinks that stay meaningful, number notation
- [ ] Pets and companions with a job (IdleOn, Melvor's Summoning, OSRS)
- [ ] Achievements and medals: design, rewards, secret ones

**Next, players and the community:**

- [ ] Negative Steam reviews of leading idle RPGs, mined deeper than 004's top ten per game
- [ ] The Discord again each few iterations (001 has two passes, the last on 4 November); roles by depth (009), as Unnamed
      Space Idle's bot gives roles by sector (016)
- [ ] r/ScapeLikes' rules; galaxy.click's answer on the submission; referrers in Cloudflare's analytics (the owner's) (018)
- [ ] Developers' heuristics for exit and re-entry (Byers, Gibbs and Nansen, CHI 2026) against the welcome-back report (014)
- [ ] Onboarding in 2024–2026 releases (beyond `first-session.md`)
- [ ] Accessibility: the Game Accessibility Guidelines, held against the game

**Next, technology and platforms:**

- [ ] Server authority and cheating in online idle games

**Next, dated (each is worth a look after its date):**

- [ ] Lowbar Legends (13 November) and Melvor Idle 2 (17 November): launches, prices, what players say; the sequel's
      Slayer, trees, bank, loadouts and automation (006, 010, 014, 015, 017)
- [ ] My Own Hero Party on Steam (4 December) (016)
- [ ] Idle Clans' quest rework a month on, from 20 November; Tap Titans 2's Clan Technology once 8.4 ships (011)
- [ ] The EU's Digital Fairness Act, Turkey's game rating regulation, when published (010)
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

Round three (4 November) folded the proposals of 005, 006 and 007 into `PROPOSALS.md`, and corrected the earlier files where the
code check and new measurements disagreed with them.
