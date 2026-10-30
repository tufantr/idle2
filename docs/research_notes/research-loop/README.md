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

**Done (iteration 1, 30 October 2026):**

- [x] Fantasy Idle's own Discord feedback so far → `001-discord-feedback.md`
- [x] Melvor Idle today, and Melvor Idle 2 (Early Access 17 November 2026) → `002-melvor-idle.md`
- [x] The social side of online idle games → `003-online-social-idle.md`
- [x] What idle players love and hate, the 30-point audit → `004-genre-sentiment.md`

**Next, measurements on Fantasy Idle itself** (found by iteration 1; no code changes, tools and browsers only):

- [ ] A skip test per system with the simulator: is any system best ignored? (002)
- [ ] Cross-browser: Firefox and Safari (WebKit) through Playwright, which needs those browsers installed (ask the
      owner before downloading them) (004)
- [ ] CPU and battery: the battle scene and the skill stage, in view and in a background tab (004)
- [ ] The growth check after a laptop's sleep: can an honest player be flagged? (004)
- [ ] Clan sizes: what `tools/clanpower.mjs` says about clans of one to eight active members (P-006)

**Next, games:**

- [ ] Ensis IDLE (galaxy.click, March 2026): a direct dark-fantasy look-alike; its players' asks
- [ ] Scapewatch: Idle MMO (Steam, 25 September 2026, 88%): clans with broadcasts, raids, no market
- [ ] Milky Way Idle: skilling with party combat, guilds, a market; chat moderation
- [ ] Cauldron (Best Paid Game 2025), Legendum, Magic Research 2 (Best New Game 2024): heroes, lives, teams
- [ ] The Tower (tournaments in 30-player brackets, guilds since 2025) and Egg, Inc. (timed co-op contracts)
- [ ] Unnamed Space Idle (Best F2P 2024 and 2025): ten linked systems at a steady pace, free quality-of-life
- [ ] Synergism and Advent Incremental: an update rhythm, and an event as an advent calendar
- [ ] Soda Dungeon 2, Idle Champions, Kill the Lich, Terraformental: party rules, formations, time compression,
      remembered routines
- [ ] Short arcs with endings: Nodebuster, the Gnorp Apologue, Tower Wizard, Download RAM Idle, Astro Prospector
- [ ] Presentation and charm: Asbury Pines, Sixty Four, Rusty's Retirement, Cast n Chill, Digseum, Booster Pack Heroes
- [ ] Long-haul structure: Shark Incremental, Shark Game, Prestige Tree, Revolution Idle, CIFI, Idle Obelisk Miner,
      BIOTOMATA, Midnight Idle, Theory of Magic, Ballad of Heroes, My Own Hero Party

- [ ] Old School RuneScape: the collection log, combat achievements, clue scrolls, achievement diaries, quests,
      minigames, pets, Leagues and other seasonal modes, Ironman
- [ ] Legends of IdleOn today: account-wide systems across characters, worlds, cards, stamps, the event calendar
- [ ] Firestone Idle RPG, AFK Arena and AFK Journey, Idle Heroes: idle RPG loops, towers, guild bosses, what retains
- [ ] Brighter Shores (RuneScape's creator, 2024): skills and episodes designed anew
- [ ] RuneScape 3: archaeology, relics, daily challenges, and its shop's backlash (what not to do)
- [ ] Clicker Heroes 2, Idle Champions, Increlution, Idle Loops, Progress Knight: loops and automation
- [ ] The Golbin Raid (Melvor's roguelite side mode): how players took it

**Next, mechanics across games:**

- [ ] Seasons and leagues (OSRS Leagues, Path of Exile leagues, Diablo seasons): a fresh-start layer for an idle RPG
- [ ] Collection logs and completion (the open "cape for 100%" item)
- [ ] Task and bounty systems: Slayer, clue scrolls, daily and weekly tasks, quests (the open quests-or-clan-levels
      question)
- [ ] End bosses and raids in idle games (the open "end boss" item); infinite towers
- [ ] Clan wars, clan levels and co-op formats (the open clan ideas): Clash of Clans, Brawl Stars, Tap Titans,
      AFK games
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

- [ ] The Discord again each few iterations (001 is the first pass)
- [ ] Negative Steam reviews of leading idle RPGs, mined deeper than 004's top ten per game
- [ ] Whether and where to tell players about Fantasy Idle near Melvor Idle 2's launch (the owner's call)
- [ ] Onboarding in 2024–2026 releases (beyond `first-session.md`)
- [ ] Accessibility: the Game Accessibility Guidelines, held against the game
- [ ] How small indie idle games grew: galaxy.click, Reddit, Steam, Discord, YouTube, translations

**Next, technology and platforms:**

- [ ] Web push notifications and the installed web app (crate ready, offline cap reached), iOS's limits
- [ ] Bringing a web game to Steam (wrappers, achievements, cloud) and to phone stores
- [ ] Server authority and cheating in online idle games
- [ ] Translations: which languages idle players play in

**Next, money (the owner's later plan):**

- [ ] How idle games sell: one-time purchase (Melvor), gems (IdleOn), supporter packs, cosmetics, battle passes, time
      skips, paid power; what players accept and what they leave over; what selling needs (hosting, law, payments)

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

Paused on 30 October after round two (the owner's word). Not yet folded into PROPOSALS.md: the proposals at the end of
005, 006 and 007. Old School RuneScape's long-term goals (the round's fourth item) was stopped unfinished.
