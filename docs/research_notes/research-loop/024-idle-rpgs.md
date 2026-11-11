# 024: Idle RPGs and auto-battlers not yet read (read 11 November 2026)

Read: Steam's store data and review histograms (all languages: the histogram ignores its language setting); each Steam game's 60 most helpful English
reviews on steamcommunity.com, counted with a rough word match, so a lean and not a measure (one account that copies others' reviews left out); SteamCharts;
achievement shares; App Store and Google Play; Fandom wikis; galaxy.click and itch.io; Reddit through the [Arctic Shift](https://arctic-shift.photon-reddit.com/) archive, by id.
Demo reviews were counted, not read (Steam's review endpoint redirected). The search budget ran out midway. Fantasy Idle: the worktree's code (6ea4de0's). No page held instructions aimed at an AI.

## In short

1. **A market or paid selling sank 2026's free online idle RPGs:** [TBH: Task Bar Hero](https://store.steampowered.com/app/3678970/) 53% of 50,099 reviews,
   [My Party Is Grinding](https://store.steampowered.com/app/4952980/) 44% of 751, [QuestAway](https://store.steampowered.com/app/5195600/) 29% of 866. The year's short paid arcs: 92–95%.
2. **False bans are the year's loudest idle complaint:** 17 of TBH's 59 most helpful English reviews, 39% of their helpful votes (P-025).
3. **Online loops hold players that reviews don't:** Firestone keeps 77% of its best month two and a half years on, with 50 of 59 top reviews negative.
4. **Dead survival stats are noticed** (Firestone, Legends of Dragaea); content scaled to the player's own heroes is gamed by weakening them (Idle Heroes).
5. **Words that read as machine-made cost a liked game:** 12 of Lowmoor's 17 negative top reviews fault the writing or call it AI (P-020).
6. **The sequels kept the loop and added automation and ease;** Soda Dungeon 2's only complaints from players of the first: the same grind again.
7. **The year's new shape is the idle RPG on the taskbar:** TBH peaked at 545,349 players at once ([SteamCharts](https://steamcharts.com/app/3678970)); two followed it within months. Proposal 1.

## The games asked for

### Idle Heroes (DHGames, phones, 2016)
- **What:** heroes collected and starred, teams of six, two in front and four behind ([wiki](https://idleheroes.fandom.com/wiki/Tower_of_Oblivion)); guilds and many side modes.
- **Scale:** over 10 million installs, 1.07 million Google Play reviews at 4.7 ([Play](https://play.google.com/store/apps/details?id=com.droidhang.ad)); 4.76 of 106,565 on the
  [App Store](https://apps.apple.com/us/app/idle-heroes/id1153461915); 100 [r/IdleHeroes posts](https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=IdleHeroes&after=2025-06-01&limit=100&sort=desc) from 1 to 11 November. Play's three shown reviews: money and grind (thin; see 010).
- **Worth learning:** the [Aspen Dungeon](https://idleheroes.fandom.com/wiki/Aspen_Dungeon), open 48 hours in 96: no health back between waves, a fallen hero sits out, each
  wave pays a chest, a merchant or a potion. The [Brave Trial](https://idleheroes.fandom.com/wiki/Brave_Trial) scales enemies to your six best heroes; the wiki says strip their gear.
- **Held against Fantasy Idle:** Fasting is the run without food, potions or regen (`src/data/trials.js`); all is set by stage, the Titan by kills (`src/systems/dungeon.js:59-65`). Keep it so.

### AFK Arena (Lilith, phones, 2019)
- **What:** heroes in teams, campaign stages that pay while away, towers of fixed teams, guild hunts.
- **Scale:** 3.69 million Google Play reviews at 4.5 ([Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)); 4.71 of 497,733 on the
  [App Store](https://apps.apple.com/us/app/afk-arena/id1375425432). Play's three shown reviews: money, grind, tedium (thin).
- **Loops:** the idle chest fills for 12 hours, longer with VIP ([guide](https://www.appgamer.com/afk-arena/strategy-guide/afk-rewards); VIP hours unverified); [Fast Rewards](https://afk-arena.fandom.com/wiki/Fast_Rewards)
  pay two hours of it, the first each day free; the [Resonating Crystal](https://afk-arena.fandom.com/wiki/Resonating_Crystal) lifts every hero to the five best's level; the
  [Labyrinth](https://afk-arena.fandom.com/wiki/Arcane_Labyrinth) resets every 48 hours, scaled to the top five; one member's rank in the [Twisted Realm](https://afk-arena.fandom.com/wiki/The_Twisted_Realm) pays the guild.
- **Held against Fantasy Idle:** 24 hours at the full rate (`src/core/modifiers.js:62`), a crate every 20 hours, three waiting (`src/systems/daily.js:1-13`), the banner for all: nothing to take.

### Firestone Idle RPG (Holyday Studios, Steam and phones, 2019)
- **What:** five heroes in slots hit 50, 20, 15, 10 and 5% of the time, a leader who casts by hand ([Party](https://firestone-idle-rpg.fandom.com/wiki/Party)); a prestige that turns
  gold into firestones, (gold ÷ 18,000)^0.387, back to stage 1 ([Temple](https://firestone-idle-rpg.fandom.com/wiki/Temple_of_Eternals)); guilds, timed research.
- **Scale:** 77% of 7,575; 71% in 2024, 68% in 2025, 73% in 2026 ([histogram](https://store.steampowered.com/appreviewhistogram/1013320?l=english&review_score_preference=0)). 1,829
  players in October 2026, 77% of its best month, April 2024 ([SteamCharts](https://steamcharts.com/app/1013320)), near Melvor's 79% (009).
- **Praised and hated:** 50 of its 59 most helpful English reviews are negative ([reviews](https://steamcommunity.com/app/1013320/reviews/?browsefilter=toprated&filterLanguage=english)):
  money in 31, new servers and merges in 15, guilds in 14. Two from 2020 say "Armor and HP have been worthless stats" ([one](https://steamcommunity.com/profiles/76561197961314123/recommended/1013320/)).
- **What retains:** [expeditions](https://firestone-idle-rpg.fandom.com/wiki/Expeditions) of 5–60 minutes; a guild [crystal](https://firestone-idle-rpg.fandom.com/wiki/Arcane_Crystal) broken with free pickaxes; the
  [Chaos Rift](https://firestone-idle-rpg.fandom.com/wiki/Chaos_Rift), one god a month for the whole server, 5% more health each fall; at least 26 [servers](https://firestone-idle-rpg.fandom.com/wiki/Servers) since 2019.
- **Held against Fantasy Idle:** one realm; a boss per clan, ranked by the Hydra (`src/data/social.js:60-67`), no fight for everyone (proposal 6).

### Soda Dungeon 1, against 2 (Armor Games, 2017 and 2020)
- **What:** up to five patrons hired at the tavern, three in front and two flanking for +50% physical damage, go down until all flee ([Party](https://sodadungeon.fandom.com/wiki/Party)).
- **Scale:** 94% of 7,070, more than the sequel's 94% of 6,238 ([SD1](https://store.steampowered.com/appreviewhistogram/564710?l=english&review_score_preference=0),
  [SD2](https://store.steampowered.com/appreviewhistogram/946050?l=english&review_score_preference=0)); 61 players in October against 218, 2% and 3% of their best months
  ([SD1](https://steamcharts.com/app/564710), [SD2](https://steamcharts.com/app/946050)). Floor 1,000: 14.3% ([achievements](https://steamcommunity.com/stats/564710/achievements/)); the sequel's end 16.1% (009).
- **Worth learning:** a [dimension](https://sodadungeon.fandom.com/wiki/Dimensions) boss every 100 floors opens a portal: a soft reset that keeps the tavern and essence, gives
  a set relic for one class and a choice of relic sodas, and moves the story on; ten bosses, then a last dimension that cycles them.
- **The sequel:** 16 of its 60 most helpful reviews name the first, most calling it better (scripts, quests, relics); its two negatives say it is the same
  grind again ([one](https://steamcommunity.com/id/psenough/recommended/946050/), [two](https://steamcommunity.com/id/k4108/recommended/946050/)).
- **Held against Fantasy Idle:** Lords every 100 stages from 200, named and silent; an Ascension pays Stars only (009, 016). Evidence for P-027, P-063.

### Magic Research 1, against 2 (one developer; Steam 2023 and 2024)
- **What:** a wizard's school: research schools of magic, explore and fight by themselves, retire to start again stronger.
- **Scale:** 89% of 429 against 93% of 626 ([MR1](https://store.steampowered.com/appreviewhistogram/2311680?l=english&review_score_preference=0),
  [MR2](https://store.steampowered.com/appreviewhistogram/2864890?l=english&review_score_preference=0)); 18 players in October against 59 ([MR1](https://steamcharts.com/app/2311680), [MR2](https://steamcharts.com/app/2864890)).
- **Praised and hated:** the first's two most helpful negatives: the wall is random drops, as gear gates exploration and exploration gear ([46 helpful](https://steamcommunity.com/id/Marshbouy/recommended/2311680/)),
  and a run adds under 5% to the next ([40](https://steamcommunity.com/profiles/76561197974150371/recommended/2311680/)). 12 of the sequel's 60 name the first, all favourably: more ease, a compendium.
- **Held against Fantasy Idle:** sure pieces from the Lords and the anvil's reinforce stand beside the drops (000). Covered.

### My Own Hero Party (Sekhmet Games, Steam, 4 December 2026)
- **What:** a warrior, then recruits, clear rooms in auto-combat with abilities cast by hand at key moments; each expedition's gold goes into a
  permanent tree ([store](https://store.steampowered.com/app/4833220/)). Since August: coins gathered by hovering, a click that sets the target ([news](https://store.steampowered.com/news/app/4833220)).
- **Scale:** a galaxy.click demo since 18 June, 4.3 of 123, 2,355 plays ([galaxy](https://galaxy.click/play/806)); a Steam demo since 29 July, 96% of 54
  ([histogram](https://store.steampowered.com/appreviewhistogram/4991000?l=english&review_score_preference=0)); 2,000 wishlists by 23 August. Review texts unread.
- **Held against Fantasy Idle:** one hero, one monster at a time, and the click strikes. Read again at launch.

### Legendum (Vadeum, Steam, release to be announced)
- **What:** each life runs from youth to old age, the body slowing while skills stay; soul upgrades and heirlooms carry over and deeds change the next
  life's world; the day's tasks cost energy while the character fights hordes unattended ([store](https://store.steampowered.com/app/4512440/)).
- **Scale:** a 90-minute demo since 7 October ([news](https://store.steampowered.com/news/app/4512440)), 11 Steam reviews, all positive; 4.6 of 168 on [itch.io](https://vadeum.itch.io/legendum),
  4.6 of 105 on [galaxy.click](https://galaxy.click/play/892). The itch page is tagged "No generative AI was used". Comments unread (thin).
- **Held against Fantasy Idle:** a prestige is a choice, not a death; the Chronicle keeps firsts. Nothing beyond P-027.

### Ballad of Heroes (Jaghancement, browser, 2023–2024)
- **What:** found in the browser, not on Steam (016 looked there only): a text-led idle RPG of Greek myth, up to two heroes and four gods, chapters
  called Ballads; version 1.01 (15 July 2024) ended the story ([galaxy](https://galaxy.click/play/144)).
- **Scale:** 4.5 of 145 ratings, 35,172 plays, 73,145 play hours; 3.9 on [Kongregate](https://kongregate.com/games/balladofheroes/ballad-of-heroes).
- **Praised and hated:** the launch thread's top comment was lost after five minutes, 14 points ([thread](https://www.reddit.com/r/incremental_games/comments/1520ram/),
  [archive](https://arctic-shift.photon-reddit.com/api/comments/search?link_id=1520ram&limit=100)); galaxy's top one found it slow, 22, so double speed was untied from offline time ([comments](https://galaxy.click/comments/144?sort=top)).
  Then came a log that replays every story scene and a pause at each ([thread](https://www.reddit.com/r/incremental_games/comments/1axzu5h/)).
- **Held against Fantasy Idle:** one line per land, the Lords silent (009): P-027 gains a log to reread.

### Lowmoor (LilChill Games, Steam, free, 7 August 2026)
- **What:** a zero-player idle RPG in a Windows 98-style sheet; 14 class trees and the shared Long Charter, 2,108 skills at launch
  ([thread](https://www.reddit.com/r/incremental_games/comments/1vi0u3h/)), 2,112 [now](https://store.steampowered.com/app/4977360/). The Guild can spend points along a chosen branch; sealed
  letters offer a dice check and the expedition goes on if they stay sealed; since 1.7.3 an ending is planned ahead ([news](https://store.steampowered.com/news/app/4977360)).
- **Scale:** 84% of 120 ([histogram](https://store.steampowered.com/appreviewhistogram/4977360?l=english&review_score_preference=0)); launch post 190 points, 82 comments.
- **Praised and hated:** its debt to Progress Quest (16 of 60) and quiet running; but 12 of its 17 negative top reviews fault the writing (8) or call it AI
  (10) ([reviews](https://steamcommunity.com/app/4977360/reviews/?browsefilter=toprated&filterLanguage=english)). 1.7.5 rewrote the English. The launch post disclosed an LLM's help; the store page today has no AI section.
- **Held against Fantasy Idle:** War Tree points show on a chip (`src/ui/render.js:262`); a dungeon's choice goes on alone after 30 s (`src/data/dungeons.js:18-20`). The lesson is the words (P-020).

## Other idle RPGs of 2025–2026 with a following

From Steam's Idler and RPG tags by reviews ([search](https://store.steampowered.com/search/?tags=615955%2C122&sort_by=Reviews_DESC&category1=998)), best-of results for [2024](https://www.reddit.com/r/incremental_games/comments/1hv0x56/) and
[2025](https://www.reddit.com/r/incremental_games/comments/1qchipt/) (their RPGs are in 009), and galaxy.click's [top 100](https://galaxy.click/explore/top), with Theory of Magic and Booster Pack Heroes unread.

| Game | Scale | What it shows |
|---|---|---|
| TBH (May 2026, free, 8 DLC) | 53% of 50,099; October's players 14% of June's | 17 of 59 top reviews on bans, 18 the Steam Market, 10 forced data collection; 6,180, then 20,406 accounts sanctioned ([news](https://store.steampowered.com/news/app/3678970)); 10 of the 46 positive among its 60 newest praise its quiet place on the taskbar ([recent](https://steamcommunity.com/app/3678970/reviews/?browsefilter=mostrecent&filterLanguage=english)) |
| QuestAway (Oct 2026), My Party Is Grinding (Aug 2026), [Loot of Baal](https://store.steampowered.com/app/3358250/) (2025) | 29% of 866; 44% of 751; 59% of 1,445 | Two followers of TBH and a forerunner, all in a corner of the screen: a cash fee to sell; 9 of 60 call My Party Is Grinding a copy, and it sells automation and market slots ([store](https://store.steampowered.com/search/?term=my+party+is+grinding)) |
| [Master Healer Kale](https://store.steampowered.com/app/4634490/), [Loot Loop](https://store.steampowered.com/app/3972320/), [Horripilant](https://store.steampowered.com/app/3525970/), [Magic Archery](https://store.steampowered.com/app/2905170/) | 95% of 2,221; 93% of 1,847; 92% of 3,187; 98% of 8,746 | Arcs of 1–8 hours; Kale's player heals a party that fights alone, and a review with 57 helpful votes beat it without one spell ([review](https://steamcommunity.com/id/Vanlan/recommended/4634490/)) |
| [Legends of Dragaea](https://store.steampowered.com/app/2712380/) (Nov 2025) | 87% of 1,026 | Its top negatives: nothing at stake, a wallpaper ([93 helpful](https://steamcommunity.com/id/AlwaysaBoss/recommended/2712380/)); no sense of achievement ([69](https://steamcommunity.com/id/drikoz/recommended/2712380/)) |
| [Incremental Epic Hero 2](https://store.steampowered.com/app/1690710/), [Evitania Online](https://store.steampowered.com/app/4119420/) | 73% of 2,084; 79% of 1,162 | Rebirths across many classes grew tedious ([57](https://steamcommunity.com/id/blokkemblokkem/recommended/1690710/)); IdleOn's paywalls copied ([77](https://steamcommunity.com/id/CaelTheDruid/recommended/4119420/)) |
| [Bloobs Adventure Idle](https://store.steampowered.com/app/2942780/), [Path of Idle](https://store.steampowered.com/app/4243990/) (2026) | 88% of 766; 75% of 1,348 | Banked 2× or 3× speed instead of offline progress (14 of 60 discuss it, 5 against); an idle ARPG with seasons |

## Held against Fantasy Idle

| Elsewhere | Fantasy Idle today (checked in the code) | Verdict |
|---|---|---|
| A market or paid selling (29–53%) | No market or trade code in `api/index.js` or `src/systems/` | Keep; P-057 |
| False bans, a hidden one-use appeal ([TBH](https://steamcommunity.com/id/darkshaka/recommended/3678970/)) | A flag's one sign: "Capped" on an attack's card (`src/main.js:1258`); nowhere to answer | P-025 |
| Enemies scaled to the best heroes, gamed by stripping gear | Set by stage, the Titan by kills | Keep; tie any P-023 rule to best stage |
| One god for the whole server, a level up each fall (Chaos Rift) | A boss per clan, ranked by the Hydra | P-039's shape |
| Survival stats called worthless; nothing at stake | Defence past its cap from about stage 180; deep runs don't die (013, 015) | P-023, P-061 |
| Story bosses and a log to reread (Soda Dungeon, Ballad of Heroes) | One line per land, the Lords silent (009) | P-027 |
| Words faulted as AI-made; no AI as a selling line | Nothing in the game says how it was made (a code comment, `src/ui/features.js:4`) | P-020 |
| An idle RPG on the taskbar (TBH, its two followers, Loot of Baal) | The tab's title shows what he does and a star when something waits (`src/ui/render.js:319-325`) | Proposal 1 |

## Proposals from this file

1. **A small window for the fight** (Add, M; evidence medium, all from Steam's desktop games). Where the browser has Document Picture-in-Picture (Chrome 116+
   on desktop, [Chrome](https://developer.chrome.com/docs/web-platform/document-picture-in-picture); limited elsewhere, [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API)), a dock button moves the battle scene into an
   always-on-top window: hero, monster, stage, the strike; closing brings it back. Why: TBH's 50,099 reviews in under six months and 545,349 at once (some
   farming items to sell, unverified), the recent reviews that praise just this, two followers within five months; I found it in no browser idle game (no survey).
   Work: the scene is DOM, not canvas (`src/ui/scene.js`), so it moves whole with its handlers; the stylesheet is copied in; the fighters size for a small
   room; it opens only on a click. A hidden tab ticks about once a minute (`src/game.js:38-39`), stops its frames (`src/main.js:311-339`) and counts the player
   away (`src/main.js:342-344`; attended time paces new places, `src/game.js:41-43`), so loop and attendance must follow the window. Risks: one more view, CPU
   (pair with P-037), nothing for Firefox and Safari; the full-screen fight stays the default (DESIGN §3.23).
2. **P-025, the strongest outside evidence yet** (Change, S–M): the year's biggest idle RPG lost more goodwill to false bans than to anything else,
   through a hidden one-use appeal; Fantasy Idle's own false flags sat unnoticed for days in November.
3. **P-057, three more cases** (Remove, S): a cash fee to sell (QuestAway), automation and market slots sold at launch (My Party Is Grinding),
   paywalls in an online idle (Evitania). Selling trade or automation belongs on the never list.
4. **P-020 gains weight** (Change, S): Lowmoor's text drew most of its negatives; QuestAway disclosed AI and was still called AI-made in 5 of 57;
   Legendum sells itself on none. Beside the credits line: a human pass over the words a new player meets first.
5. **P-023 and P-061, evidence and a caution:** dead survival stats drew complaints from Firestone's long-time players and Dragaea's top negatives. If
   survival is made to matter by a rule tied to the hero (015), tie it to best stage, which he can't lower, never to worn power.
6. **P-039, a shape** (Add, M): a boss for the whole realm in the weekend events, fought by each saved hero as the clan boss is, a level higher after
   each fall, as Firestone's monthly god is (IdleOn's Weekly Battle in 007 is alike). At tens of players and clans of about three (011), one target for
   all works where divisions don't. Off the boards and the clan boss, as the banner is (012).
7. **Evidence for P-027, P-063, P-021, P-072:** Ballad's log and Soda Dungeon's story bosses; a set relic per dimension; Kale won without a spell (P-021's
   winnable without clicking); My Own Hero Party on galaxy.click from 18 June to 2,000 wishlists by 23 August, Legendum on galaxy before its Steam playtest.

**Don't carry over:** parties, slots, formations and level sharing (one hero); heroes to collect (gacha is deferred); new servers; a market; banked speed
instead of offline play (Ballad untied it); auto-spending a tree that gives a few points a day; lives that age and end; 5–60-minute expeditions (014).

**For the queue:** My Own Hero Party at launch (4 December); Legendum's release; Dragon's Tear, Lowmoor's developer's next game ([news](https://store.steampowered.com/news/app/4977360));
Kale, Loot Loop, Horripilant and Magic Archery for the short arcs; Path of Idle's seasons; Theory of Magic, Booster Pack Heroes, Ethos Idle; r/afkarena.
