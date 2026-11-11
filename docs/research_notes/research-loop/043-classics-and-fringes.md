# 043: The classics and the fringes (read 12 November 2026)

Read: Steam's store search, app details, review histograms (all languages), news feeds and the 10 most helpful English reviews of 13 games, and the 10 newest negative ones of two;
SteamCharts; the App Store's search, lookups, three store pages and the 50 most helpful US reviews of four games; Google Play's search pages; GitHub's API and the
[Arctic Shift](https://arctic-shift.photon-reddit.com/) archive for PokeClicker; the tier list's [data.json](https://nullfinch.github.io/incremental-tierlist/data.json) in three reads, then
incrementaldb, galaxy.click, Kongregate and the games' own sites to class its names. Not worked around: the App Store's helpful-review feed for Grow Castle, Bit Heroes Quest and
Fantasy Hike (empty; the Grow Castle and Fantasy Hike pages showed four reviews each), Google Play's app pages (they don't render; its search pages give a rating and a count),
SteamCharts for games out under a month (not listed), one archive title search (422) and PokeClicker's wiki (drawn by script). Theme counts are rough counts by a reading model;
player counts were read on 12 November without a time of day. Fantasy Idle: the worktree's code as at 880cac5 (the two commits since are notes), and 044's live depth by week.
No page held instructions aimed at an AI reader.

## In short

1. **A launch board that newcomers can't top drew the worst reviews.** Mimic2 opened on 28 October with its testers ahead: 6 of its 10 most helpful reviews say so, and 9 of 10 are
   negative (52.3% of 44). Dungeon Crusher's Steam launch had no fresh servers: 3 of 10, and it fell from 78.9% in 2024 to 60.8% in 2026. Fantasy Idle's boards open on all-time
   best stage (`src/main.js:122`). Its This week board already exists, and there a newcomer wins: live players below stage 1,800 gain 600–1,470 stages a week, those above it 60–200
   in this week's first three days (044). Proposal 1.
2. **The classics keep crowds without updates, and the biggest grows with chapters.** Dragon Cliff (88.0% of 7,989) averages 258 playing more than seven years after its last content
   update; Crusaders of the Lost Idols averages 160, four years after its last event. Your Chronicle (80.3% of 3,157) averages 2,581, and its best month and its all-time peak each
   came within a week of a new chapter and its seven-day festival.
3. **What players fault most is clocks and money.** Nonstop Knight 2's slow keys fill about 20 of its 50 most helpful App Store reviews. Bit Heroes' energy is in 6 of its 10 on Steam.
   Your Chronicle's two most helpful negatives (92 and 48 helpful) fault convenience sold for rubies. Grow Castle sells Auto Battle for $4.99 and holds 4.3 of 473,000 Google
   reviews. Evidence for P-115, P-059 and P-057.
4. **A price on one store and free on another fills the top reviews.** Stone Story RPG costs $29.99 on Steam and nothing on iPhone. 6 of its 10 most helpful Steam reviews fault the
   price and 7 of 10 are negative, though it holds 90.5% of 959 overall. A condition for P-072 and P-052.
5. **The fake-MMO family is small and new.** Its five newest games came out from 28 October 2026 or are due in 2027, with 69 reviews between them. The best, MMO Simulator: ASCENSIONS
   (95% of 20), is praised for boss minigames (7 of 10); Fantasy Idle has the clan boss's openings and the Titan. Mimic2 is in fact online. Nothing new beyond Proposal 1's warning.
6. **The sweep:** 410 names; 316 are in no file before this one by a whole-name match, 310 once six read under other names are set aside. 74 of them are RPG-like: 54 with a hero
   or party, 20 with fights but no hero. The largest, Farmer Against Potatoes Idle (94.5% of 8,613, 1,133 playing), lets talents change freely and gives a new class at each
   reincarnation: evidence for P-109. None of the 74 teaches anything bigger.

## The games

### Dragon Cliff (Meta Interaction; $9.99, Windows, May 2018)
- **What:** a semi-idle party RPG. Adventurers from 25 classes, each with a talent tree, fight on a timer while Rage Points fire tactics; nearly 100 skills, gems, reforging, set
  bonuses, 200+ monsters on 7 maps, a town that grows and draws visitors to hire ([store](https://store.steampowered.com/app/758190/)). The last content update was on 14 February 2019,
  the last patch on 9 February 2021; on 7 April 2018 it added a battle log and a damage meter ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=758190&count=50)).
- **Scale:** 88.0% of 7,989: 91% in 2021, 79% in 2025, 75% in 2026 ([histogram](https://store.steampowered.com/appreviewhistogram/758190?l=english&review_score_preference=0)).
  Most are in Simplified Chinese (5,679 against 1,110 in English, by 042's count; 042 reads the Chinese ones). 258 playing on average in October 2026 and 345 in January; peak
  5,953 in May 2018 ([SteamCharts](https://steamcharts.com/app/758190)).
- **Praise and faults:** 9 of its 10 most helpful English reviews recommend it. Praise: depth and builds (4), value without microtransactions (4), Soda Dungeon made bigger (2).
  Faults: a late-game plateau (4), micromanagement (4), unlocks such as reforging left unexplained (3). The one negative (303 hours, July 2025) names power and CPU use
  ([reviews](https://steamcommunity.com/app/758190/reviews/?browsefilter=toprated&filterLanguage=english)). Its 10 newest negatives: grind (5), Auto Tactics broken once Exploration
  opens (2), a cap on damage per hit (1), screen shake in an idle game (1) ([newest](https://steamcommunity.com/app/758190/negativereviews/?browsefilter=mostrecent&filterLanguage=english)).
- **The idea:** a whole party drawn from a town's random visitors. Fantasy Idle has one hero: doesn't carry. The damage meter is evidence for P-022, the CPU review for P-037.

### Crusaders of the Lost Idols (Codename Entertainment; free, October 2015)
- **What:** a formation idle: 120+ crusaders placed in a formation where position drives damage, 10,000+ levels over six-plus campaigns, gear, monthly events, 18 paid packs
  ([store](https://store.steampowered.com/app/402840/)). Events came back each year with a new crusader, and Tier 7 events began in October 2021. The last ran on 7 April 2022; since
  then the feed carries only the studio's next game, Folded Fables (15 October 2026) ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=402840&count=50)).
- **Scale:** 82.7% of 3,276: 84% in 2015, 61% in 2023, and 91% in 2025 (138 of 151, with no update that year)
  ([histogram](https://store.steampowered.com/appreviewhistogram/402840?l=english&review_score_preference=0)). 160 on average in October 2026; peak 4,030 in November 2015
  ([SteamCharts](https://steamcharts.com/app/402840)).
- **Praise and faults:** 8 of 10 recommend it: it runs in the background (7), formations (5), events and active developers (3). The negatives: addictive but not fun, with linear
  scaling, always online and paid speed-ups (5,386 hours, 86 helpful); a game grown greedy, with a season pass (19,906 hours)
  ([reviews](https://steamcommunity.com/app/402840/reviews/?browsefilter=toprated&filterLanguage=english)).
- **The idea:** where each crusader stands. One hero: doesn't carry. Its successor Idle Champions is read (009, 015, 016), and 016's "frequent is not trusted" covers its monthly
  events. The always-online review is evidence for P-008. Nothing new.

### Your Chronicle (Samurai Games; free with rubies, April 2021)
- **What:** a text idle RPG of 3,000+ story actions: a village, dungeon fights that run themselves, summoned monsters to equip, Routines that automate the hero while away, several
  endings; English, Japanese and Simplified Chinese ([store](https://store.steampowered.com/app/1546320/)). Chapters arrive as updates: "New Chronicle" in 2.5.0 (4 June 2025) and
  2.6.0 (24 September 2025), a new area and a new "sin" system in 2.7.0 (25 March 2026), each followed by a seven-day Mimic festival. It posts holiday reward codes, added a Low
  CPU mode (2.6.2) and a touch-screen layout (2.7.16), and in 2.7.7 refunded ruby tickets when it repriced one convenience
  ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1546320&count=50)).
- **Scale:** 80.3% of 3,157; 2025 was its best year (783 positive) ([histogram](https://store.steampowered.com/appreviewhistogram/1546320?l=english&review_score_preference=0)).
  2,581 on average in October 2026. Its best month, October 2025 (3,498), followed 2.6.0; its all-time peak, 4,127 in April 2026, followed 2.7.0
  ([SteamCharts](https://steamcharts.com/app/1546320)).
- **Praise and faults:** 8 of its 10 most helpful reviews recommend it; three name a reason: the spreadsheet-like optimising, the story and its endings, play for someone with physical limits.
  The two negatives (4,186 hours, 92 helpful; 1,107 hours, 48) fault convenience sold for rubies and micromanagement
  ([reviews](https://steamcommunity.com/app/1546320/reviews/?browsefilter=toprated&filterLanguage=english)). Of its 10 newest negatives, 6 name grind, 5 rubies and 5
  micromanagement; one names a Low CPU pop-up that can't be turned off ([newest](https://steamcommunity.com/app/1546320/negativereviews/?browsefilter=mostrecent&filterLanguage=english)).
- **The idea:** automation as the story's reward, each "sin" a new kind of Routine. Fantasy Idle keeps the click, has Auto prestige (DESIGN §3.9), and the Quartermaster is parked:
  doesn't carry. What does: the refund (P-116), not selling convenience (P-057), a festival paired with a chapter (P-107, P-016), a battery saver that doesn't nag (P-037).

### Stone Story RPG (Rex Games and standardcombo; $29.99, Early Access 2019, 1.0 July 2023)
- **What:** an ASCII auto-RPG. The hero walks, fights and loots alone while the player times potions and swaps items, and Stonescript lets the player program the hero
  ([store](https://store.steampowered.com/app/603390/)). Free on iPhone, 4.71 of 1,412 ([App Store](https://itunes.apple.com/search?term=stone+story+rpg&entity=software&country=us)). About
  once a month a "2x loot" event in one location for ten days; StoneJam scripting jams; a sequel, Ascension, funded on Kickstarter within eight hours on 11 February 2026
  ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=603390&count=50)). Steam lists nine accessibility features (colour alternatives, mouse only, playable without
  timed input, adjustable difficulty and five more).
- **Scale:** 90.5% of 959 ([histogram](https://store.steampowered.com/appreviewhistogram/603390?l=english&review_score_preference=0)); 14 on average in October 2026, peak 732 in
  August 2019 ([SteamCharts](https://steamcharts.com/app/603390)).
- **Praise and faults:** 7 of its 10 most helpful reviews are negative. Faults: the price (6), the free phone version (3), repetition (4), mobile-style waits and dailies (3). Praise:
  the ASCII art (5), Stonescript (3) ([reviews](https://steamcommunity.com/app/603390/reviews/?browsefilter=toprated&filterLanguage=english)).
- **The idea:** program the hero. Doesn't carry: the click stays and a mouse macro is fair play. What does: the price against the free version (P-072, P-052) and the accessibility
  list (P-089).

### Wizard and Minion Idle (Oni Gaming, one developer; free, February 2019)
- **What:** train stats, cast spells, raise a minion and assign demons; gear in five tiers, gathering, crafting, fishing, dungeons, bosses; reincarnation with Soul and EXP shops
  ([store](https://store.steampowered.com/app/1011510/)). Its updates are numbered to 162 (28 October 2026). Four seasonal events a year (Easter, Summer, Spooky, Christmas), each
  running about three months until the next replaces it, with two event packs for sale. Update 148 (3 August 2023) was rolled back, and players were told to import their own
  backups ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1011510&count=50)).
- **Scale:** 89.4% of 879 ([histogram](https://store.steampowered.com/appreviewhistogram/1011510?l=english&review_score_preference=0)); 115 on average in October 2026, best month
  February 2020 (538) ([SteamCharts](https://steamcharts.com/app/1011510)).
- **Praise and faults:** 9 of its 10 most helpful reviews recommend it, six of them from players with 2,720–24,059 hours: depth and steady unlocks (7), no paywalls (3), an active
  developer (3). Faults: generic item names and no story (2), late features unexplained (2)
  ([reviews](https://steamcommunity.com/app/1011510/reviews/?browsefilter=toprated&filterLanguage=english)).
- **The idea:** a minion raised beside the hero. Fantasy Idle's pets give skill bonuses (DESIGN §3.13): a lead for the queued "pets and companions with a job". The rollback is
  evidence for P-013, the seasons for P-107. Otherwise nothing new.

### PokeClicker (open source, in the browser; since 2015)
- **What:** a free clicker built on the Pokémon games, saved in the browser with no account ([incrementaldb](https://www.incrementaldb.com/game/pokeclicker),
  [repository](https://api.github.com/repos/pokeclicker/pokeclicker)). Its players' posts are about breeding, Pokérus, EVs, dungeon tokens, shinies, quests and a Halloween event
  ([posts](https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=PokeClicker&limit=100&sort=desc)).
- **Scale:** 726 stars, 405 forks, 509 open issues, last push 29 October 2026 ([GitHub](https://api.github.com/repos/pokeclicker/pokeclicker)); 9,718 on r/PokeClicker
  ([archive](https://arctic-shift.photon-reddit.com/api/subreddits/search?subreddit=pokeclicker)); A in the tier list's one preset ([data](https://nullfinch.github.io/incremental-tierlist/data.json)).
- **Praise and faults:** of its 33 subreddit posts since 11 October, 17 ask how something works, 4 are about grind or efficiency, 4 report bugs, and 3 are lost saves or requests for
  one ([posts](https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=PokeClicker&limit=100&sort=desc)).
- **The idea:** catch every one, then make each stronger. Fantasy Idle's bestiary stars count in completion only (`src/systems/completion.js:31`): P-032, P-040 and P-044 hold the
  evidence. The lost saves are P-069's. Nothing new.

### The phone giants: Almost a Hero, Nonstop Knight 2, Endless Frontier, Grow Castle
- **Almost a Hero** (Deca Games; free, March 2017): 17 comically flawed heroes, artifacts, pets, rings, prestige; offers sold at stages 100 and 500
  ([page](https://apps.apple.com/us/app/almost-a-hero-idle-adventure/id1116630619)). 4.81 of 17,064 US ratings ([search](https://itunes.apple.com/search?term=almost+a+hero&entity=software&country=us));
  4.4 of 181,000 Google reviews ([Google](https://play.google.com/store/search?q=almost%20a%20hero%20idle&c=apps&hl=en)). 40 of its 50 most helpful App Store reviews give 4–5 stars.
  Art and characters lead the praise (about 15); crashes (about 7) and ads that crash or don't pay (4) lead the faults
  ([reviews](https://itunes.apple.com/us/rss/customerreviews/id=1116630619/sortby=mosthelpful/json)). The idea: heroes with voices and jokes. A Lord's fall in Fantasy Idle makes a
  drop card only (`src/main.js:727-737`): evidence for P-027.
- **Nonstop Knight 2** (Flaregames; free, June 2019): an action RPG that fights by itself, with skills to fire and loot in chests opened by slowly refilling silver keys
  ([search](https://itunes.apple.com/search?term=nonstop+knight&entity=software&country=us)). 4.61 of 8,557; 4.2 of 56,500 on Google
  ([Google](https://play.google.com/store/search?q=nonstop%20knight%202&c=apps&hl=en)). About 20 of its 50 most helpful reviews fault the keys, and about 12 call the end pay to win
  ([reviews](https://itunes.apple.com/us/rss/customerreviews/id=1444887980/sortby=mosthelpful/json)). The idea: the run never stops, only the loot does. Nothing new: evidence for
  P-115 and P-059 (the Titan banks three, `src/data/dungeons.js:260`).
- **Endless Frontier** (ekkorr; free, February 2018): an army of units against titans and dragons, guild battles, PvP, offline progress
  ([search](https://itunes.apple.com/search?term=endless+frontier&entity=software&country=us)). 4.49 of 3,211; 4.3 on Google
  ([Google](https://play.google.com/store/search?q=endless%20frontier%20ekkorr&c=apps&hl=en)); a sequel since April 2026, 4.79 of 71. 42 of its 50 most helpful reviews give 4–5 stars,
  for generous free currency (about 18) and guilds (about 9); bugs lead the faults (about 11)
  ([reviews](https://itunes.apple.com/us/rss/customerreviews/id=1339001756/sortby=mosthelpful/json)). Nothing new: an army doesn't carry, and Fantasy Idle sells nothing.
- **Grow Castle** (Raon Games; free, July 2016): heroes and archers on a castle's floors hold off waves; Auto Battle is an in-app purchase at $4.99
  ([page](https://apps.apple.com/us/app/grow-castle/id1133478462)). 4.49 of 2,221 US ratings ([search](https://itunes.apple.com/search?term=grow+castle&entity=software&country=us));
  4.3 of 473,000 Google reviews ([Google](https://play.google.com/store/search?q=grow%20castle%20tower%20defense&c=apps&hl=en)). The four reviews on its page ask for more heroes and a
  castle to dress. The idea: automation for sale. Input for the money options (P-051 to P-056), not a proposal: Fantasy Idle's Auto prestige is earned (DESIGN §3.9).

### Bit Heroes Quest, Tap Heroes and Dungeon Crusher
- **Bit Heroes Quest** (Kongregate; free, 2017): a pixel RPG of dungeons, raids, familiars and guilds. A season every four weeks or so brings a new legendary familiar; heroes can
  be traded only as NFTs (30 August 2026) ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=666860&count=20)). 80.5% of 3,822 on Steam
  ([histogram](https://store.steampowered.com/appreviewhistogram/666860?l=english&review_score_preference=0)); 4.66 of 22,434 US ratings
  ([search](https://itunes.apple.com/search?term=bit+heroes&entity=software&country=us)); 4.3 of 285,000 Google reviews
  ([Google](https://play.google.com/store/search?q=bit%20heroes%20quest&c=apps&hl=en)). 7 of its 10 most helpful Steam reviews are negative: energy (6), gem prices and pay to win
  (6), and a 2025 warning about NFT items ([reviews](https://steamcommunity.com/app/666860/reviews/?browsefilter=toprated&filterLanguage=english)). Nothing new: evidence for P-057
  and P-115.
- **Tap Heroes** (VaragtP; $2.99, June 2015): three heroes with roles in a clicker ([search](https://store.steampowered.com/api/storesearch/?term=Tap%20Heroes&cc=us&l=en)).
  68.4% of 455, 61% in its first seven months ([histogram](https://store.steampowered.com/appreviewhistogram/371570?l=english&review_score_preference=0)). 6 of its 10 most
  helpful reviews are negative: no offline progress at launch (3, added later), a close copy of Clicker Heroes (125 helpful), a price for a game free in browsers (131), and wear on
  the mouse and finger from clicking (2) ([reviews](https://steamcommunity.com/app/371570/reviews/?browsefilter=toprated&filterLanguage=english)). Nothing new: evidence for P-068
  and P-041.
- **Dungeon Crusher** (Towards Mars; free on phones since 2019, on Steam as Soul Hunters since October 2024): one finger, 100,000+ levels, 200+ heroes, clans, PvP
  ([search](https://itunes.apple.com/search?term=dungeon+crusher&entity=software&country=us)). 4.73 of 3,167 US ratings; on Steam 68.5% of 542, from 78.9% in 2024 to 60.8% in 2026
  ([histogram](https://store.steampowered.com/appreviewhistogram/842980?l=english&review_score_preference=0)). 27 of its 50 most helpful App Store reviews give 1–2 stars: support
  that never answers (10), crashes (10), bans and lost accounts (6) ([reviews](https://itunes.apple.com/us/rss/customerreviews/id=1465892600/sortby=mosthelpful/json)). 9 of 10 on
  Steam are negative: pay to win (6), veteran clans and no fresh servers at the Steam launch (3)
  ([reviews](https://steamcommunity.com/app/842980/reviews/?browsefilter=toprated&filterLanguage=english)). The idea: a climb with no top in sight. Evidence for Proposal 1, P-110,
  and P-024 (Fantasy Idle's save stops at stage 10,000, `src/core/state.js:351`).

### Single-player games that act out an MMO
- **MMO Simulator: ASCENSIONS** (Games By Dippy; $6.99, 2 November 2026): 18 zones, 9 classes, 13 bosses with 10 boss minigames, 13 factions, a town and ships that earn while closed,
  and an endless zone, The Ascent, whose stars buy permanent paths; one price, nothing sold ([store](https://store.steampowered.com/app/5058380/)). 95% of 20
  ([histogram](https://store.steampowered.com/appreviewhistogram/5058380?l=english&review_score_preference=0)). 7 of its 10 most helpful reviews praise the boss minigames; three come
  from testers with 883–1,491 hours ([reviews](https://steamcommunity.com/app/5058380/reviews/?browsefilter=toprated&filterLanguage=english)). The idea: each raid boss a small game.
  Covered: the clan boss's openings to strike and the Titan's race (DESIGN §3.12, §3.18).
- **Mimic2 - Idle MMORPG** (free, 28 October 2026) is online, not single-player: maps fought on the server while the PC is off, 95 item slots, 832 quests, a market and boards
  ([store](https://store.steampowered.com/app/5191970/)). 52.3% of 44 ([histogram](https://store.steampowered.com/appreviewhistogram/5191970?l=english&review_score_preference=0)).
  9 of its 10 most helpful reviews are negative: the testers' head start (6, two of them naming the leaderboards), the developer's answers (3), AI-made content (2), gear that expires (2)
  ([reviews](https://steamcommunity.com/app/5191970/reviews/?browsefilter=toprated&filterLanguage=english)). Fights on the server: covered by the replay (`src/systems/offline.js:140`).
  The head start is Proposal 1.
- **MMOAlone** (MadWambo; $1.99, 30 October 2026): 80+ enemies, 200+ items, raids, Steam boards, and a wiki inside the game, in the Escape menu, with chances and costs
  ([store](https://store.steampowered.com/app/5108700/)); 60% of 5 ([histogram](https://store.steampowered.com/appreviewhistogram/5108700?l=english&review_score_preference=0)).
  Evidence for P-074.
- **Game About Botting in an MMORPG** (YaxWorks; Q1 2027, a demo out): grinding by hand, then bot modules that take over fighting, looting and skills
  ([store](https://store.steampowered.com/app/4767390/)); 134 points on Reddit (037). **Solitary Singleplayer Offline MMORPG** (GrimnirDotDev; Q2 2027): run a simulated guild,
  promote leaders to automate, chase server-first raids ([store](https://store.steampowered.com/app/4961370/)). No reviews yet. Automation as the prize doesn't carry.
- **The older two:** World of Talesworth (free, August 2022), 70.9% of 492; 6 of its 10 most helpful reviews say it needs constant attention, 3 that progress stops when it is
  closed ([histogram](https://store.steampowered.com/appreviewhistogram/1177970?l=english&review_score_preference=0),
  [reviews](https://steamcommunity.com/app/1177970/reviews/?browsefilter=toprated&filterLanguage=english)). Tower Walker: MMO Grind Simulator ($9.99, February 2023), 76.8% of 285
  and 54.5% in 2026: thin content (4), bugs (4), no bulk sale or item lock (3), no offline progress (2)
  ([histogram](https://store.steampowered.com/appreviewhistogram/2130060?l=english&review_score_preference=0),
  [reviews](https://steamcommunity.com/app/2130060/reviews/?browsefilter=toprated&filterLanguage=english)). Covered: Fantasy Idle replays up to 24 hours (`src/core/modifiers.js:62`)
  and salvages automatically (DESIGN §3.5).
- **The family:** nostalgia for gear, raids and reputation without other players; Steam's search lists three more (MMOS, MMORPG NPC Simulator, MMO Botfarm Simulator)
  ([search](https://store.steampowered.com/api/storesearch/?term=MMO%20Simulator&cc=us&l=en)). Nothing new beyond Mimic2's warning.

### Fantasy Hike (Forge7 AB; free on iPhone since October 2021)
- **What:** steps from the phone or a watch move a hero from a small home to a volcanic mountain, with friends on the map and "several fantasy characters to compete with"
  ([lookup](https://itunes.apple.com/lookup?id=1557127861&country=us)). Premium from $1.99 to $89.99; since 2.4.0 (30 September 2026) ads raise the daily distance cap
  ([page](https://apps.apple.com/us/app/fantasy-hike/id1557127861)).
- **Scale:** 4.83 of 15,087 US ratings ([lookup](https://itunes.apple.com/lookup?id=1557127861&country=us)).
- **Praise and faults:** the helpful-review feed was empty. The four reviews on its page praise the push to walk (4) and the race against rivals (2), and ask for more story and for
  a rival's projected pace ([page](https://apps.apple.com/us/app/fantasy-hike/id1557127861)).
- **The idea:** a rival who walks at a set pace. Fantasy Idle has none: evidence for P-036, which was thin because no game was found doing it. A rival can be a character on a
  fixed curve, which needs no other players. Steps and ads don't carry.

### Farmer Against Potatoes Idle (Oni Gaming; free, Early Access August 2022, 1.0 September 2024), from the sweep
- **What:** the farmer fights waves of mutated potatoes across five-plus worlds and nine areas of 100 waves; each area has its own gear set; the talent tree is visible from the start
  and its choices change freely; each reincarnation grants permanent bonuses and a class from six, each with its own tree; daily quests, challenges, a whack-a-mole minigame for short
  buffs ([store](https://store.steampowered.com/app/1535560/)).
- **Scale:** 94.5% of 8,613: 97% in 2022, 88% in 2026 ([histogram](https://store.steampowered.com/appreviewhistogram/1535560?l=english&review_score_preference=0)). 1,133 playing, 1,147
  on average in October 2026, peak 8,867 in March 2023 ([SteamCharts](https://steamcharts.com/app/1535560)). On phones, 4.88 of 548 on the App Store
  ([data](https://nullfinch.github.io/incremental-tierlist/data.json)).
- **Praise and faults:** 9 of its 10 most helpful reviews recommend it: design (5), prestige that lasts (3), fair free currency (3). Against: Patreon rewards cut without notice and
  more put on sale (5,833 hours, 45 helpful, the one negative); a leaderboard top that takes spending (2,387 hours, 50)
  ([reviews](https://steamcommunity.com/app/1535560/reviews/?browsefilter=toprated&filterLanguage=english)).
- **The idea:** builds that are free to change. Fantasy Idle's War Tree costs 20,000 essence to unlearn, ×1.5 each time (`src/data/talents.js:31`): evidence for P-109. The Patreon
  review is P-116's. The fully visible tree goes against the disclosure rule (a ladder shows its next rung only): doesn't carry.

### The tier list's 410 names
- **How:** the list's data holds 410 names. A whole-name match against every file in the log (the worktree's and this round's drafts) misses 310; six more hit only as common words
  or inside another name (Fundamental, The Climb, Matter Dimensions, It's Fine, Execute, Check Back), so 316 are in no file before this one (037 counted 317). Six of those are read
  under other names (Idle Champions, Firestone, The Tower, Evolve, Master Healer Kale, the Communitree), so 310 are unread. Each was classed from its store page, incrementaldb,
  galaxy.click or Kongregate ([data](https://nullfinch.github.io/incremental-tierlist/data.json)).
- **Found:** 74 RPG-like names in 69 lines below: 54 with a hero or party, 20 with fights but no hero. Idle Calibur is also in 042's list, unread there. The other 236 are builders,
  miners, fishers, layer trees, clickers and casino games. The largest of them, Mr. Mine (91.6% of 18,707), mines with no fights on its page
  ([store](https://store.steampowered.com/app/1397920/)). Progress Quest, an RPG that plays itself (2001), is named in 024 and so left out.
- **The figures** are the list's own: Steam's share of its count, galaxy.click's rating, votes and play-hours, the App Store's and Google's rating and count. Every tier in the data is
  "?"; its one preset, a single ranker's, puts PokeClicker, Farmer Against Potatoes Idle and Wizard and Minion Idle at A.

**With a hero or party (54 names):**

| Game | Scale | Its one idea | Against Fantasy Idle |
|---|---|---|---|
| [Farmer Against Potatoes Idle](https://store.steampowered.com/app/1535560/) | Steam 94.6% of 8,224; App Store 4.88 of 548; Google 3.94 of 3,405 | A class at each reincarnation; talents changed freely | Read above; P-109 |
| [Tap Ninja](https://store.steampowered.com/app/1891700/) | Steam 85.0% of 9,843; 4.81 of 537; 3.93 of 1,854 | A runner of timed katana slashes; a village earns offline | Idle Slayer's shape (009, 014, 020) |
| [Time Clickers](https://store.steampowered.com/app/385770/) | Steam 87.6% of 5,048 | A hired team of gunners that earns offline | Clicker Heroes' shape: covered |
| [Idle Big Devil](https://store.steampowered.com/app/1158980/) | Steam 81.9% of 3,831 | Heroes merged and copied; an endless tower | A roster: doesn't carry |
| [Grim Clicker](https://store.steampowered.com/app/1160750/) | Steam 78.9% of 2,772 | A Ritual resets the build for strength | Prestige: covered |
| [Idle Calibur](https://store.steampowered.com/app/1674890/) | Steam 86.7% of 1,296 | Battles by hand or not, beside city building | Doesn't carry; also in 042 |
| [Stuck in Time](https://store.steampowered.com/app/1814010/) | Steam 84.9% of 921 | Plan the day's actions, then let the loop run them | The click stays; Idle Loops (029) |
| [Bard Idle](https://store.steampowered.com/app/1803580/) | Steam 69.0% of 839 | Ballads boost a random hero team | Doesn't carry |
| [Incremental Adventures](https://store.steampowered.com/app/1371630/) | Steam 78.2% of 774 | A party that fights alone; the player tunes it | Doesn't carry |
| [DPS IDLE](https://store.steampowered.com/app/1349540/) | Steam 63.3% of 749 | Kills buy chests, each with its own deck of cards | Doesn't carry |
| [Vanguard Galaxy](https://store.steampowered.com/app/3471800/) | Steam 90.7% of 612 | A crew on autopilot, docked at the desktop's bottom edge | The taskbar wave (024): P-105 |
| [Loot Tycoon](https://store.steampowered.com/app/4165310/) | Steam 71.0% of 569 | The merchant who sells the hero's dungeon loot | Doesn't carry |
| [Time Warpers](https://store.steampowered.com/app/676500/) | Steam 81.9% of 493 | Teammates on hoverbikes; co-op convoys | Synchronous co-op is deferred |
| [Tap Wizard 2](https://store.steampowered.com/app/1836550/) | Steam 76.4% of 467; 4.79 of 2,224; 4.56 of 7,348 | Each death rewinds time and keeps what was learned | Prestige: covered |
| [IdleTale](https://store.steampowered.com/app/3196540/) | Steam 57.1% of 452 | Each reset multiplies the next run | Covered |
| [Deskrawl: Idle ARPG](https://store.steampowered.com/app/4623570/) | Steam 73.0% of 415 | Captured enemies become minions that haul the loot | The taskbar wave (024); the companions queue |
| [Hero Tale](https://store.steampowered.com/app/2513240/) | Steam 70.8% of 360; 4.79 of 619; 4.54 of 19,311 | A hero who grows in the background | Covered |
| [Duncrush](https://store.steampowered.com/app/2374670/) | Steam 82.1% of 324 | The click through dungeon runs, with a skill tree | Covered |
| [Idle Awakening: Mages Path](https://store.steampowered.com/app/3678950/) | Steam 75.8% of 186 | A mage's day as reusable action lists | The click stays |
| [Idle Expanse](https://store.steampowered.com/app/891480/) | Steam 55.1% of 147 | Five-mercenary squads with tactics set before they go | Doesn't carry |
| [Mining Survivors](https://store.steampowered.com/app/2322450/) | Steam 74.6% of 138 | Mine in bursts amid hordes; spend the loot between runs | Covered |
| [Idle Reincarnator](https://store.steampowered.com/app/3779340/) | Steam 68.6% of 105 | Rebirths keep boosts across 12 zones | Covered |
| [Now That's a Big Dragon!](https://store.steampowered.com/app/3834590/) | Steam 76.1% of 67; galaxy 3.78 of 44 | An army chips at one dragon that strikes back | The Titan, the clan boss |
| [Idle Superpowers](https://store.steampowered.com/app/1831980/) | Steam 75.8% of 62; 4.76 of 836; 4.54 of 13,748 | Roguelike runs that stack superpowers | Trials: covered |
| [Cradle of the Dark Brood](https://store.steampowered.com/app/4745450/) | Steam 80.0% of 40 | Act only through the creatures you breed | Doesn't carry |
| [Isles of Silence](https://store.steampowered.com/app/3009460/) | Steam 87.9% of 33; galaxy 2.91 of 75 | Hunters learn each monster's patterns and share them | P-044, thin |
| [Progress Knight Multiplayer](https://store.steampowered.com/app/3320070/), [Quest](https://www.incrementaldb.com/game/progress-knight-quest) | Steam 42.9% of 28; 4.74 of 314; 4.38 of 213 | Progress Knight (029) with PvP; Quest runs itself | Covered |
| [Candy Box](https://www.incrementaldb.com/game/candy-box), [Candy Box 2](https://www.incrementaldb.com/game/candy-box-2), [Candy Box U](https://store.steampowered.com/app/4582340/) | Web; U on Steam, 100% of 23 | An adventure that grows out of a box of candy | Short arcs (028) |
| [Rejected Draft](https://galaxy.click/play/733) | galaxy 4.27 of 496, 583,894 play-hours; on Steam since 11 November | A sketch absorbs the traits of what it beats; a story that ends | Short arcs (028) |
| [Gravend](https://store.steampowered.com/app/2779920/) | galaxy 4.41 of 164, 72,501 hours | 250+ items and abilities; three moral paths | Doesn't carry |
| [Multiversal Warrior](https://galaxy.click/play/634) | galaxy 4.17 of 286, 68,388 hours | Break each universe's limit to reach the next | Ascension: covered |
| [Ink Remnant](https://galaxy.click/play/724) | galaxy 4.63 of 494, 20,602 hours | A story-led text RPG | Text: doesn't carry |
| [Cavern Crawler](https://galaxy.click/play/567) | galaxy 4.34 of 302, 15,832 hours | Delve to raise stats and the odds of surviving | Covered |
| [Endless Stairwell](https://galaxy.click/play/11) | galaxy 4.26 of 145, 6,218 hours | A text RPG up an endless stair | The Abyss: covered |
| [Incremancer](https://www.kongregate.com/en/games/JamesG466/incremancer) | Kongregate 4.5, 2.4 million plays | A necromancer's zombies raid towns | Doesn't carry |
| [Idle Sword](https://www.kongregate.com/en/games/laFunk/idle-sword) | Kongregate 4.0 (2015) | Heroes explore random dungeons alone; a Mirror reset | Covered |
| [Idle Sword 2](https://www.kongregate.com/en/games/laFunk/idle-sword-2) | Kongregate 4.2 (2016); App Store 4.25 of 235 | Summon other players' parties, or invade them | A clanmate's saved hero at your side would be new; one old source: not proposed |
| [Undefeated Spider](https://www.kongregate.com/en/games/TheGrandestine/undefeated-spider) | Kongregate 3.8 (2016) | Permadeath duels with one spider; 96 classes | Doesn't carry |
| [Loot Clicker](https://www.kongregate.com/en/games/spotky1004/lootclicker) | Kongregate 3.2 (2020) | Click monsters for loot | Covered |
| [Loot Collector Beta](https://www.kongregate.com/en/games/arispen/loot-collector-beta) | Kongregate 2.9 (2017) | A loot collection with haunted items | Doesn't carry |
| [Monster Box](https://www.incrementaldb.com/game/monster-box) | Web | You upgrade the hero and the monsters piling on him | Doesn't carry |
| [Clickpocalypse II](https://itunes.apple.com/lookup?id=1394442481,1220292838,993117266&country=us) | App Store 4.17 of 203; Google 4.48 of 7,858 | A party explores dungeons by itself | Covered |
| [Tower of Hero](https://itunes.apple.com/lookup?id=1394442481,1220292838,993117266&country=us) | App Store 4.71 of 515; Google 4.27 of 117,300 | 100+ heroes fill a tower's floors | A roster: doesn't carry |
| [Idle Apocalypse](https://itunes.apple.com/lookup?id=1394442481,1220292838,993117266&country=us) | App Store 4.60 of 2,453; Google 4.69 of 149,643 | You send the monsters; each prestige grows the tower | Doesn't carry |
| [PokeIdle](https://pokeidle.net/) | Web | A team across the regions, Kanto to Paldea | With PokeClicker above |
| [Proto23](https://www.incrementaldb.com/game/proto23) | Web | Skills from fighting to sleeping and dying | Doesn't carry |
| [Wizard Banished](https://www.incrementaldb.com/game/wizard-banished) | itch 4.3 of 35 | A wizard stripped of everything rebuilds from a tower | Doesn't carry |
| [Lich Baby](https://www.incrementaldb.com/game/lich-baby) | itch 4.0 of 7; phones | Script a lich infant's day; each cycle restarts | The click stays |
| [DragonScape Idle](https://www.incrementaldb.com/game/dragonscape-idle) | Google 5.0 of 31; web, Android | Skills to 99, dungeons, pets; time away replays with the same drops | Covered (`src/systems/offline.js:140`) |
| [Aurora Blade: Adventurer's Ferry](https://iibattle.com/) | Web; 1 online when read | Five classes in a ring, each beating one | Doesn't carry |
| [Immortal Life](https://play.google.com/store/apps/details?id=com.ZarDM.ImmortalLife) | Google Play; no figures in the list | A cultivation life | For 042 |

**With fights but no hero (20 names):**

| Game | Scale | Its one idea | Against Fantasy Idle |
|---|---|---|---|
| [Sir, We Have An Orc Problem](https://store.steampowered.com/app/4594150/) | Steam 86.5% of 4,710; App Store 3.36 of 56 | Tens of thousands of orcs; every run, won or lost, pays | Prestige: covered |
| [The Perfect Tower II](https://store.steampowered.com/app/1197260/), [The Perfect Tower](https://www.kongregate.com/en/games/XmmmX99/the-perfect-tower) | Steam 86.6% of 4,496; Kongregate | A tower whose AI the player programs in simple commands | Doesn't carry |
| [Outhold](https://store.steampowered.com/app/3767740/) | Steam 86.1% of 1,875; galaxy 4.42 of 351; itch 4.6 of 389 | Tower defence whose upgrade tree refunds freely | P-109 |
| [Click and Conquer](https://store.steampowered.com/app/3267900/) | Steam 92.0% of 1,605 | Bombs dropped through fog of war | Doesn't carry |
| [Idle Pixel Fantasy](https://store.steampowered.com/app/3916620/) | Steam 78.0% of 940 | Units that work together toward a dragon | Doesn't carry |
| [Idle Monster TD](https://store.steampowered.com/app/1482910/) | Steam 72.3% of 815 | Monsters defend the base from robots | Doesn't carry |
| [Dice People](https://store.steampowered.com/app/3373670/) | Steam 93.9% of 294 | Dice rolls become attacking units | Doesn't carry |
| [Castle Woodwarf](https://store.steampowered.com/app/1123300/), [2](https://store.steampowered.com/app/1065580/) | Steam 84.4% of 199; 75.3% of 85 | Dwarves and a dragon egg against waves | Doesn't carry |
| [Soba's Gunpaw](https://store.steampowered.com/app/3899010/) | Steam 92.6% of 136 | A bullet heaven guarding a cat | Doesn't carry |
| [Lone Tower](https://store.steampowered.com/app/4238180/) | Google 4.55 of 14,295; on Steam in 2027 | A roguelite tower; farming and crafting between runs | Doesn't carry |
| [Knights Run](https://www.incrementaldb.com/game/knights-run) | Google 4.25 of 149 | Runner tower defence that avoids big numbers | Doesn't carry |
| [Idle Dungeon Master](https://www.maxgames.com/game/idle-dungeon-master.html) | maxgames 84% | Dig rooms for gold and raise an army | Doesn't carry |
| [Heart of Galaxy Horizons](https://www.incrementaldb.com/game/heart-of-galaxy-horizons) | Web, Android | Raiding planets too fast pays less | Doesn't carry |
| [Prismatic Adventure](https://www.incrementaldb.com/game/prismatic-adventure) | Web | A roguelite of boss battles | Trials: covered |
| [Dragon of Ecology](https://www.kongregate.com/en/games/snowroadgames/dragon-of-ecology) | Kongregate 3.8 | A dragon eats its way to seven bosses | Doesn't carry |
| [Gragyriss, Captor of Princesses](https://www.incrementaldb.com/game/gragyriss-captor-of-princesses) | Web | A dragon's life of conquest | Doesn't carry |
| [Mine Defense](https://www.incrementaldb.com/game/mine-defense) | Web | Defence over a mine, with hidden turns | Doesn't carry |
| [Theresmore](https://www.incrementaldb.com/game/theresmore) | Web, Android | Conquer a world that keeps growing | Doesn't carry |

## Every game read

| Game | Scale, 12 November 2026 | Praise and faults | The one idea | Verdict |
|---|---|---|---|---|
| Dragon Cliff | 88.0% of 7,989, 5,679 in Chinese (042); 75% in 2026; 258 playing, seven years after its last content | Depth, value (4 each); plateau, micromanagement (4 each); newest: grind (5) | A party from a town of random visitors | Doesn't carry; P-022, P-037 |
| Crusaders of the Lost Idols | 82.7% of 3,276; 160 playing, four years after its last event | Background play (7), formations (5); always online (86) | Where each crusader stands | Doesn't carry; P-008 |
| Your Chronicle | 80.3% of 3,157; 2,581 playing; peak 4,127 in April 2026 | Optimising; rubies (92, 48), micromanagement | Automation as the story's reward; chapters with festivals | P-057, P-116, P-107 |
| Stone Story RPG | 90.5% of 959; $29.99, free on iPhone; 14 playing | ASCII art (5); price (6 of 10), the free version (3) | Program the hero | Doesn't carry; P-072, P-089 |
| Wizard and Minion Idle | 89.4% of 879; 115 playing; 162 updates | Depth (7), no paywalls (3); no story (2) | A minion raised beside the hero | P-013, P-107; companions queue |
| PokeClicker | 726 stars, 405 forks; 9,718 subscribers | Questions (17 of 33 posts), lost saves (3) | Catch every one, then make it stronger | P-044, P-069 |
| Almost a Hero | 4.81 of 17,064; 4.4 of 181,000 | Characters (about 15 of 50); crashes (7), ads (4) | Heroes with voices and jokes | P-027 |
| Nonstop Knight 2 | 4.61 of 8,557; 4.2 of 56,500 | Keys (about 20 of 50), pay to win (12) | The run never stops, only the loot | P-115, P-059 |
| Endless Frontier | 4.49 of 3,211; 4.3 on Google; a sequel at 4.79 of 71 | Generosity (about 18), guilds (9); bugs (11) | An army; guild battles | Doesn't carry |
| Grow Castle | 4.49 of 2,221; 4.3 of 473,000 | Feed empty; four reviews ask for more | Auto Battle for sale, $4.99 | Money input (P-051 to P-056) |
| Bit Heroes Quest | 80.5% of 3,822; 4.66 of 22,434; 4.3 of 285,000 | Energy (6 of 10), gems (6), NFT heroes | A season a month with a new familiar | P-057, P-115 |
| Tap Heroes | 68.4% of 455 | No offline at launch (3), a copy (125), clicking strain (2) | Three heroes with roles | P-068, P-041 |
| Dungeon Crusher | 4.73 of 3,167; Steam 68.5% of 542, 60.8% in 2026 | Support (10 of 50), crashes (10); no fresh servers (3 of 10) | 100,000+ levels | Proposal 1; P-110, P-024 |
| MMO Simulator: ASCENSIONS | 95% of 20 in ten days; $6.99 | Boss minigames (7 of 10) | Each raid boss a small game | Covered |
| Mimic2 | 52.3% of 44 since 28 October | Testers' head start (6 of 10), AI content (2) | Battles run on the server | Proposal 1; P-020 |
| MMOAlone | 60% of 5; $1.99 | Too few to code | A wiki in the Escape menu | P-074 |
| Game About Botting; Solitary | Due in 2027 | None yet | Automation as the prize; a simulated guild | Doesn't carry |
| World of Talesworth; Tower Walker | 70.9% of 492; 76.8% of 285 | Needs attention (6 of 10); no offline (2), thin (4) | An MMO's grind alone | Covered |
| Fantasy Hike | 4.83 of 15,087 | Walking (4 of 4), rivals (2) | A rival who walks at a set pace | P-036 |
| Farmer Against Potatoes Idle | 94.5% of 8,613; 1,133 playing | Design (5), prestige (3); Patreon cut (45), paid top (50) | Builds that are free to change | P-109, P-116 |
| The sweep's other 73 | 23 reviews to 9,843 on Steam; up to 149,643 on Google | Store pages only | One line each above | Nothing bigger |

## Held against Fantasy Idle

| Lesson | Fantasy Idle today (checked in the code) | Verdict |
|---|---|---|
| A launch board that newcomers can't top (Mimic2, Dungeon Crusher; Firestone's new servers and merges in 15 of its 59 most helpful, 024) | Boards are opt-in and open on all-time best stage (`src/main.js:122`); This week is one tap away (`src/ui/render.js:2712`) and counts from the player's first upload of the week (`api/index.js:456,1094,1107-1110`); the week's Trial ranks a run by its share of the player's own best (`:1114`) | Proposal 1 |
| A short bank on loot draws the most complaints (Nonstop Knight 2, Bit Heroes) | The Titan banks three (`src/data/dungeons.js:260`) | P-115, P-059 |
| Builds that are free to change (Farmer Against Potatoes Idle; Outhold's free refunds) | Unlearning costs 20,000 essence, ×1.5 each time (`src/data/talents.js:31`, button at `src/ui/render.js:1615`) | P-109 |
| Power and CPU (Dragon Cliff); a Low CPU mode that nags (Your Chronicle) | No battery saver anywhere in `src/`; reduced motion only (`src/main.js:567`) | P-037: on by default on phones, kept per device, never a pop-up |
| Convenience sold for a currency draws the top negatives (Your Chronicle); an Auto Battle sold for $4.99 is tolerated (Grow Castle) | "Free, no ads, nothing to buy" (`index.html:13`); the owner plans to sell power later (ROADMAP, Decisions 2) | P-057; 010's options |
| A weakening change refunded (Your Chronicle 2.7.7), or not (Farmer Against Potatoes Idle) | No rule yet | P-116 |
| A price on one store, free on another (Stone Story) | Free on the web; Steam later, the web staying free (P-072) | P-072, P-052 |
| Always online (Crusaders) | An account plays the server's save | P-008 |
| A wiki inside the game (MMOAlone) | No link to wiki.fantasyidle.com anywhere in `src/` or `index.html` | P-074 |
| Heroes who speak (Almost a Hero) | A Lord's fall makes a drop card (`src/main.js:727-737`); the Chronicle notes no Lord (`src/systems/chronicle.js:10`) | P-027, P-119 |
| A rival at a set pace (Fantasy Hike) | No rival; opt-in boards only | P-036 |
| Clicking wears the hand (Tap Heroes) | The strike is a click, a macro fair play (DESIGN §3.6) | P-041 |
| Local saves lost (PokeClicker); a rollback that needed players' backups (Wizard and Minion Idle) | A guest's save lives in one browser; an account's on the server (DESIGN §3.17); no save history | P-069, P-013 |
| A climb with no top (Dungeon Crusher, 100,000+ levels) | The save stops at stage 10,000 (`src/core/state.js:351`) | P-024 |
| Boss minigames (ASCENSIONS) | The clan boss's openings to strike, the Titan's 60-second race (DESIGN §3.12, §3.18) | Covered |
| Battles on the server while away (Mimic2); time away replayed with the same drops (DragonScape Idle) | The client replays up to 24 hours (`src/core/modifiers.js:62`, `src/systems/offline.js:140`) | Covered |
| A damage meter (Dragon Cliff, April 2018) | A battle log drawer (`src/main.js:85`); no damage by source | P-022 |
| Gear that expires (Mimic2, faulted) | Gear never expires | Keep |

## Proposals from this file

1. **New, no number: the boards open on This week** (Change, under S). `src/main.js:122` opens the boards on all time; open them on This week, with All time one tap away as now
   (`src/ui/render.js:2712`). The server already keeps each opted-in player's first upload of the week (`api/index.js:456`), so a newcomer ranks from their first day. Live players
   below stage 1,800 gain 600–1,470 stages a week, and those above it 60–200 in this week's first three days (044), so a new player's first weeks top the deep ones there. Why: the
   beta's players have climbed since 22 October and will hold every all-time board when P-068's post or P-072's Steam page brings strangers. Mimic2's launch was judged on its
   testers' head start (6 of its 10 most helpful reviews, 9 of 10 negative), and Dungeon Crusher's Steam launch on veterans with no fresh servers (3 of 10, then 78.9% to 60.8%).
   Risk: a deep player's standing moves one tap away, and early on a Monday (UTC) the week's board fills as uploads arrive; if it holds fewer than five names, open on All time.
   No past decision of the owner's is touched.

**Evidence for others** (effort unchanged): P-115 and P-059, Nonstop Knight 2's keys (about 20 of 50) and Bit Heroes' energy (6 of 10). P-109, Farmer Against Potatoes Idle's free
talents and a class per reincarnation (94.5% of 8,613) and Outhold's free refunds (86.1% of 1,875). P-116, Your Chronicle's ruby-ticket refund (2.7.7) and Farmer Against Potatoes
Idle's one negative (5,833 hours) after a cut made without notice. P-037, Dragon Cliff's CPU review (303 hours), Your Chronicle's Low CPU mode and the pop-up a reviewer couldn't turn
off. P-057 and the money options, Your Chronicle's rubies (92 and 48 helpful), Grow Castle's $4.99 Auto Battle, Bit Heroes' NFT heroes, and a leaderboard top that takes spending
(Farmer Against Potatoes Idle, 50). P-072 and P-052, Stone Story: if Steam charges while the web stays free, its page must say what the price adds. P-008, Crusaders' always-online
review (86). P-074, MMOAlone's wiki in the Escape menu. P-089, Stone Story's nine Steam accessibility features and ASCENSIONS' six. P-027, Almost a Hero's characters (about 15 of
50). P-036, no longer thin: Fantasy Hike races its walkers against fantasy characters. P-041, Tap Heroes' clicking strain (2). P-068, Tap Heroes as a copy (125). P-069 and P-013,
PokeClicker's lost saves and Wizard and Minion Idle's rollback. P-107 and P-016, Your Chronicle's best month and peak each a week after a chapter and its festival, and Wizard and
Minion Idle's four seasons a year. P-024, Dungeon Crusher's 100,000+ levels. P-020 and P-068, Mimic2's AI-made content (2 of 10). P-022, Dragon Cliff's damage meter. P-062, a cap
on damage per hit called lazy (Dragon Cliff, 6 helpful). P-082, screen shake questioned in an idle game (Dragon Cliff). P-044, Isles of Silence's hunters who learn each monster, with
Lowmoor's creature mastery (037). P-090, a Your Chronicle reviewer (842 hours) who plays it with physical limits. P-110, Dungeon Crusher's support (10 of 50). For 016: Dragon Cliff
and Crusaders keep 258 and 160 playing years after their last updates, while Dragon Cliff's share fell from 91% to 75%.

**What doesn't carry over:** parties, formations, rosters and random hiring (Dragon Cliff, Crusaders, Almost a Hero, Grow Castle, Tower of Hero); a hero programmed or run from action
lists (Stone Story, Your Chronicle's Routines, Stuck in Time, Idle Awakening, Lich Baby), as the click stays and the Quartermaster is parked; keys and energy; arenas and PvP
(Endless Frontier, Nonstop Knight 2, Dungeon Crusher, Bit Heroes, Progress Knight Multiplayer); NFTs; ads that raise a cap and steps as the clock (Fantasy Hike); simulated
guildmates (Solitary, World of Talesworth); a fully visible talent tree (against the disclosure rule); holiday reward codes (Your Chronicle posts five or six a year, and nothing shows
they bring players back); offers at stage milestones (Almost a Hero); gear that expires.

**For the queue:** Your Chronicle's crowd after its next chapter and festival; Stone Story: Ascension's launch and its price on Steam against phones; Mimic2 a month on (did it reset
its boards?); Game About Botting in an MMORPG (Q1 2027), Solitary Singleplayer Offline MMORPG (Q2 2027), Lone Tower (2027) and Gravend at launch; Endless Frontier 2 once it has
more ratings; Wizard and Minion Idle's minion, Deskrawl's captured minions and Dragon Cliff's adventurers for the queued "pets and companions with a job"; Immortal Life for 042.

**Is the coverage map missing a family?** One small one: idles that fight without a hero, mostly tower defence, 20 of the sweep's names, the largest at 86.5% of 4,710 and 86.6% of
4,496, with only The Tower read (011, 016). What they teach (trees that refund, runs that pay won or lost) Fantasy Idle has in its prestige or in P-109. Low priority.
