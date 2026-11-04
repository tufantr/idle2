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

**Next, measurements on Fantasy Idle itself** (no code changes, tools and browsers only):

- [ ] Cross-browser: Firefox and Safari (WebKit) through Playwright, which needs those browsers installed (ask the
      owner before downloading them) (004)
- [ ] Why the sensible bot climbs faster when something sends it away from the boss wall (013): is it the bot, or does a
      player at a clock wall lose time?
- [ ] Food and defence under Trials, in dungeons, at the Titan and at the clan boss (013)
- [ ] How long live players take from stage 1,000 to 2,000; weekly return of clan members against others, knowing the
      bias (009, 011)
- [ ] The battery saver's saving on a phone-class CPU (Chrome's 4x throttle) (005)

**Next, games:**

- [ ] Cauldron (Best Paid Game 2025), Legendum, Magic Research 2 (Best New Game 2024): heroes, lives, teams
- [ ] The Tower (tournaments in 30-player brackets, guilds since 2025, milestone pushes) and Egg, Inc. (timed co-op contracts)
- [ ] Unnamed Space Idle (Best F2P 2024 and 2025): ten linked systems at a steady pace, free quality-of-life
- [ ] Synergism and Advent Incremental: an update rhythm, and an event as an advent calendar
- [ ] Soda Dungeon 2, Idle Champions, Kill the Lich, Terraformental: party rules, formations, time compression,
      remembered routines
- [ ] Short arcs with endings: Nodebuster, the Gnorp Apologue, Tower Wizard, Download RAM Idle, Astro Prospector
- [ ] Presentation and charm: Asbury Pines, Sixty Four, Rusty's Retirement, Cast n Chill, Digseum, Booster Pack Heroes
- [ ] Long-haul structure: Shark Incremental, Shark Game, Prestige Tree, Revolution Idle, CIFI, Idle Obelisk Miner,
      BIOTOMATA, Midnight Idle, Theory of Magic, Ballad of Heroes, My Own Hero Party

- [ ] Firestone Idle RPG, AFK Arena and AFK Journey, Idle Heroes: idle RPG loops, towers, guild bosses, what retains
- [ ] Brighter Shores (RuneScape's creator, 2024): skills and episodes designed anew
- [ ] RuneScape 3: archaeology, relics, daily challenges, and its shop's backlash (what not to do)
- [ ] Clicker Heroes 2, Idle Champions, Increlution, Idle Loops, Progress Knight: loops and automation
- [ ] The Golbin Raid (Melvor's roguelite side mode): how players took it

**Next, mechanics across games:**

- [ ] Seasons and leagues (OSRS Leagues, Path of Exile leagues, Diablo seasons): a fresh-start layer for an idle RPG
- [ ] Collection logs and completion (the open "cape for 100%" item)
- [ ] Task and bounty systems: Slayer in Melvor and other idle games, daily and weekly tasks; a design for Hunts (008),
      and a rare sealed map as a later layer on it
- [ ] Bingo boards as a clan or festival format: Grid Master, Jagex's planned Bingo System, clan tools (008)
- [ ] Self-made modes and goals: Taskman, share-of-players figures on medals (008); Melvor's lore books against the
      Chronicle (009)
- [ ] Small old communities and other co-op: Torn's factions, Kingdom of Loathing's clan dungeons, Hay Day's Derby,
      Boom Beach's Task Forces (011)
- [ ] Inventory and loot quality of life: loot filters (Path of Exile, Last Epoch), bank tabs, search, equipment
      sets and loadouts
- [ ] Talent and passive trees (WoW classic, Path of Exile, Last Epoch, Grim Dawn): what keeps a tree interesting
      for hundreds of hours (the War Tree)
- [ ] Late-game economies: gold inflation, sinks that stay meaningful, number notation
- [ ] Automation unlocks: what to automate, when, and what that does to play
- [ ] Daily and weekly loops that are not chores; login rewards; streaks
- [ ] Combat depth in auto-battlers: active skills, auto-casting, styles, builds
- [ ] Pets and companions with a job (IdleOn, Melvor's Summoning, OSRS)
- [ ] Achievements and medals: design, rewards, secret ones

**Next, players and the community:**

- [ ] Negative Steam reviews of leading idle RPGs, mined deeper than 004's top ten per game
- [ ] Whether and where to tell players about Fantasy Idle near Melvor Idle 2's launch (the owner's call)
- [ ] The Discord again each few iterations (001 has two passes, the last on 4 November); roles by depth (009)
- [ ] Onboarding in 2024–2026 releases (beyond `first-session.md`)
- [ ] Accessibility: the Game Accessibility Guidelines, held against the game
- [ ] How small indie idle games grew: galaxy.click, Reddit, Steam, Discord, YouTube, translations

**Next, technology and platforms:**

- [ ] Web push notifications and the installed web app (crate ready, offline cap reached), iOS's limits
- [ ] Bringing a web game to Steam (wrappers, achievements, cloud) and to phone stores
- [ ] Server authority and cheating in online idle games
- [ ] Translations: which languages idle players play in

**Next, dated (each is worth a look after its date):**

- [ ] Lowbar Legends (13 November) and Melvor Idle 2 (17 November): launches, prices, what players say (006, 010)
- [ ] Idle Clans' quest rework a month on, from 20 November; Tap Titans 2's Clan Technology once 8.4 ships (011)
- [ ] The EU's Digital Fairness Act, Turkey's game rating regulation, when published (010)
- [ ] CIFI's and Idle Obelisk Miner's packs; Idlescape's Steam launch, January 2027 (010)

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

Round three (4 November) folded the proposals of 005, 006 and 007 into `PROPOSALS.md`, and corrected the earlier files where the
code check and new measurements disagreed with them.
