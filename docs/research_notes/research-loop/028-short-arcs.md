# 028: Short arcs and charm (read 11 November 2026)

Read: Steam's store search, app details, store pages and review histograms (all languages); the 100 most helpful English reviews of 16 games from Steam's community pages
([Digseum's](https://steamcommunity.com/app/3361470/reviews/?browsefilter=toprated&filterLanguage=english), the others alike), counted by keyword (rough); achievement shares from Steam's community pages and its [percentages API](https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=3361470&format=json),
the only place hidden ones show; SteamCharts; galaxy.click; Reddit through [Arctic Shift](https://arctic-shift.photon-reddit.com/) (its title search timed out for five names); Hacker
News through Algolia; Wired and The New Yorker; the code of [A Dark Room](https://github.com/doublespeakgames/adarkroom) and [Universal Paperclips](https://www.decisionproblem.com/paperclips/index2.html).
Held against this worktree's code, with `node tools/opening.mjs 150 3` run on a copy. Steam doesn't say whose share an achievement is; hours on record include idle time; developers'
and journalists' figures are unverified; Booster Pack Heroes' numbers are a day old. No page carried instructions aimed at an AI reader.

## In short

1. **Short arcs get finished.** Where the median top review shows 1–5 hours, 57–92% reach the end; at 6.6–9.8 hours 31–61%; at 18–29 hours 9–44%; 009's long games 3–19%.
   My reading of one sample: each doubling of length costs some 10–20 points of finishers. Of those who finish, 20–80% go on when something follows.
2. **Praise goes to the length and the end; faults to length for the price, a wrong label and a sour ending.** Sixty Four: 52 of its 100 top English reviews are negative,
   about half of them because it is sold as idle and isn't. Asbury Pines: its ending is in 11 of 23 negatives, and its makers are rewriting it.
3. **Charm is a premise in one line and an end that closes it:** an old turtle who wants his hammock back, bills paid by smashing piggy banks.
4. **Reach came from videos, streams and other languages, not awards.** The subreddit's last two Best Presentation winners hold 1,680 and 581 reviews; Shelldiver 17,981, 72% outside English.
5. **For Fantasy Idle:** no new system. Shape notes for P-021, an earlier act for P-028, one word for P-026, evidence for six others, a long-session test.

## Browser classics

- **A Dark Room** (web 2013, free; Steam 2023, $6.99): one button in a cold room grows into a village, a map and a ship that escapes the world.
  [544 points on Hacker News](https://news.ycombinator.com/item?id=5961205); first in the US App Store from 12 April 2014 to the month's end ([New Yorker](https://www.newyorker.com/tech/annals-of-technology/a-dark-room-the-best-selling-game-that-no-one-can-explain));
  the Steam port has [66 reviews, 91%](https://store.steampowered.com/appreviewhistogram/2460660?l=english&review_score_preference=0), no achievements. Townsend tells the story by
  "simply expanding the scope of the world" (the New Yorker). **Idea: names that grow.** The forest tab is A Silent Forest with no hut and A Raucous Village past 14, in the
  browser's title too ([outside.js](https://github.com/doublespeakgames/adarkroom/blob/main/script/outside.js)); the end plays its own track, strips the screen and adds the run's score to a total ([space.js](https://github.com/doublespeakgames/adarkroom/blob/main/script/space.js)).
- **Universal Paperclips** (browser, 2017, free, Frank Lantz): an AI making paperclips in three phases: a business; Earth, once the HypnoDrones are released, which zeroes
  trust and every clipper; then space ([projects.js](https://www.decisionproblem.com/paperclips/projects.js)). 450,000 players in 11 days, most to the end, by [Wired](https://www.wired.com/story/the-way-the-world-ends-not-with-a-bang-but-a-paperclip/);
  [403 points](https://news.ycombinator.com/item?id=33446121) on Hacker News in 2022. The end: seven cards from the Drifters, then Accept (a new universe with a 10% boost) or Reject
  (seven projects take the machine apart); a threnody plays and the credits come as lines in its message log ([main.js](https://www.decisionproblem.com/paperclips/main.js)).
  The fault: a stall before the HypnoDrones; "A lot of people have gotten stuck," Lantz told Wired. **Idea: a phase that changes the screen; an end the player chooses.**
- **Spaceplan** (web 2016, Steam 2017, $2.99): potatoes, a ship's computer and the start of time, through one button. [3,524 reviews, 91%](https://store.steampowered.com/appreviewhistogram/616110?l=english&review_score_preference=0),
  no achievements. Of 97 positive [top reviews](https://steamcommunity.com/app/616110/reviews/?browsefilter=toprated&filterLanguage=english), 44 name the sound (the most here),
  50 the story, 29 the ending; the top negative finds late upgrades barely matter ([42 helpful](https://steamcommunity.com/profiles/76561198005381193/recommended/616110/)). Its
  soundtrack sells apart ([store](https://store.steampowered.com/app/630500/)). **Idea: music and an ending carry a two-hour clicker.**
- **Download RAM Idle 1 and 2** (galaxy.click, 2024 and 2025, free): Antimatter Dimensions' layers under a story that turns to horror in the sequel. [62,040 plays, 4.7 stars from 1,456](https://galaxy.click/play/333);
  [82,507 plays, 4.7 from 1,285](https://galaxy.click/play/501). Its length is 4 hours in the [launch post](https://www.reddit.com/r/incremental_games/comments/1bv67o7/), 5–13 on its page;
  a top comment (60 points) ranks its ending among the genre's best and faults a challenge whose pop-ups cover the buttons. The sequel's top comment (164) is a guide to
  ten Stars hidden in its fake desktop; the next (89) is stuck for want of a hint. **Idea: secrets in the interface draw the most talk; a stall needs a hint.**

## Sold on story and look

- **Asbury Pines** (Early Access since November 2025, $12.99, two hobby developers): a town's mystery across eras, in snippets that resources unlock; the subreddit's Best
  New Game and Best Presentation of 2025 ([results](https://www.reddit.com/r/incremental_games/comments/1qchipt/)). [581 reviews, 91%](https://store.steampowered.com/appreviewhistogram/2212790?l=english&review_score_preference=0);
  its most common achievement 75.6%, the mystery solved 37.7% ([shares](https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=2212790&format=json)).
  Story is in 67 of 77 positive top reviews; the ending, twist or resolution in 11 of 23 negatives against 16 of 77 positives ([review](https://steamcommunity.com/profiles/76561198024505662/recommended/2212790/)).
  The roadmap to 1.0 promises to reimagine the ending ([post](https://www.reddit.com/r/incremental_games/comments/1qt19ej/)). **Idea: the end decides how the whole is remembered.**
- **Sixty Four** (March 2024, $5.99): machines mine a field of cubes, toward the Inverse Chasm; Best Presentation 2024 ([results](https://www.reddit.com/r/incremental_games/comments/1hv0x56/)).
  [1,680 reviews, 73%](https://store.steampowered.com/appreviewhistogram/2659900?l=english&review_score_preference=0); the end 8.9% ([shares](https://steamcommunity.com/stats/2659900/achievements/)).
  52 of the top 100 English reviews are negative, 27 of them naming automation: machines run dry and need clicks ([110 helpful](https://steamcommunity.com/profiles/76561198040986499/recommended/2659900/));
  20 of the 52 still mention the look ([one](https://steamcommunity.com/id/enderprisearchitecture/recommended/2659900/) calls it stunning). **Idea: a look wins awards; a label the game doesn't keep sinks it.**
- **Horripilant** (February 2026, $7.99): an idle dungeon crawl in a dark, Vermis-like style, toward killing a god; a choice ends it. [3,187 reviews, 92%](https://store.steampowered.com/appreviewhistogram/3525970?l=english&review_score_preference=0);
  the last passage 43.9% ([shares](https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=3525970&format=json)). Art is in 30 of 83 positive
  top reviews; the top negative (123 helpful) finds the bosses recoloured regular enemies and the kinds few ([review](https://steamcommunity.com/id/grizzlyadam88/recommended/3525970/));
  another, hours in, watched one sword slash over and over ([35](https://steamcommunity.com/id/xgrove/recommended/3525970/)). **Idea: mood sells the first hours; variety carries the long watch.**
- **Berry Bury Berry** (January 2026, $7.99): in first person, feed berries to an ominous hole until the garden's secret shows; four endings. [9,173 reviews, 98%](https://store.steampowered.com/appreviewhistogram/3370870?l=english&review_score_preference=0);
  the most reached ending 60.5%, the true one 43.1% ([shares](https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=3370870&format=json)); a
  Jerma985 stream sent players ([112 helpful](https://steamcommunity.com/profiles/76561199862185137/recommended/3370870/)). **Idea: a premise a stranger can repeat.**

## Short Steam arcs, 2024–2026

- **Magic Archery** (2024, free, a learning project): train an archer, in about an hour. [8,747 reviews, 98%](https://store.steampowered.com/appreviewhistogram/2905170?l=english&review_score_preference=0);
  The End 91.5%, the highest here ([shares](https://steamcommunity.com/stats/2905170/achievements/)); length in 70 of 99 positives; the most helpful came by the YouTuber Real Civil
  Engineer ([232](https://steamcommunity.com/id/kumorikyou/recommended/2905170/)); no wait passes 10–30 s ([43](https://steamcommunity.com/id/imminiman/recommended/2905170/)). **Idea: never leave the player waiting long.**
- **Digseum** (2024, $2.99): dig relics on a grid players liken to Pokémon's underground ([52](https://steamcommunity.com/id/lwaffleboy/recommended/3361470/)), in 2–3 hours.
  [8,259 reviews, 98%](https://store.steampowered.com/appreviewhistogram/3361470?l=english&review_score_preference=0); the end 82.0% ([shares](https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=3361470&format=json)); length in 54 of 99 positives. **Idea: a familiar verb.**
- **Shelldiver** (November 2025, $4.99): an old turtle sells jellyfish to get back to his hammock. [17,981 reviews, 99%](https://store.steampowered.com/appreviewhistogram/3862670?l=english&review_score_preference=0),
  4,966 in English ([store](https://store.steampowered.com/app/3862670/)) across 13 languages; 1,200 in four days with almost no posts on the subreddit ([thread](https://www.reddit.com/r/incremental_games/comments/1p25mag/)).
  The nap that ends it: 69.3% ([shares](https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=3862670&format=json)); flash and shake in the
  last half hour can't be turned off ([28](https://steamcommunity.com/id/bedbug84/recommended/3862670/)). **Idea: an end that closes the premise.**
- **Bills Must Be Paid** (July 2026, $6.99): smash piggy banks to pay bills. [13,706 reviews in 15 weeks, 97%](https://store.steampowered.com/appreviewhistogram/4421010?l=english&review_score_preference=0);
  all bills paid 69.3% ([shares](https://steamcommunity.com/stats/4421010/achievements/)); length in 9 of 15 negatives, one counting six such games a day ([20](https://steamcommunity.com/profiles/76561198068286142/recommended/4421010/)). **Idea: the hook is the title.**
- **Loot Loop** (April 2026, $4.99): a party through six dungeons, one prestige, an end. [1,847 reviews, 93%](https://store.steampowered.com/appreviewhistogram/3972320?l=english&review_score_preference=0),
  82,000 players by its developer ([post](https://www.reddit.com/r/incremental_games/comments/1vmf34q/)); the end 69.9%, a new game after it 50.7% ([shares](https://steamcommunity.com/stats/3972320/achievements/)).
  Length is in 14 of 26 negatives; its prestige is a flat boost over the same six dungeons ([31](https://steamcommunity.com/id/mogutaru/recommended/3972320/)); the demo's players
  got its VHS filter off by default ([post](https://www.reddit.com/r/incremental_games/comments/1pn9y75/)). **Idea: a prestige that only multiplies is weak even in three hours.**
- **Master Healer Kale** (July 2026, $4.99): heal a party that fights alone, made for about four hours ([store](https://store.steampowered.com/app/4634490/)). [2,221 reviews, 95%](https://store.steampowered.com/appreviewhistogram/4634490?l=english&review_score_preference=0);
  the Demon King 55.8%, in Nightmare 26.8% ([shares](https://steamcommunity.com/stats/4634490/achievements/)); won without casting a spell ([57](https://steamcommunity.com/id/Vanlan/recommended/4634490/));
  its top negative saw 20 GB of memory within an hour, perhaps since fixed ([52](https://steamcommunity.com/id/cdvagabundo/recommended/4634490/)). **Idea: a role in the name; active play optional.**
- **Harvest Dice Profit** (July 2026, $2.99): grow dice and roll them for profit. [80 reviews, 91%](https://store.steampowered.com/appreviewhistogram/4583230?l=english&review_score_preference=0);
  one YouTube video kept it alive, its developer says ([post](https://www.reddit.com/r/incremental_games/comments/1xflexb/)); the first win 31.3%, Hell 6.2% ([shares](https://steamcommunity.com/stats/4583230/achievements/));
  10–30 frames a second late on, in 3 of 61 ([review](https://steamcommunity.com/id/SleepyKoen/recommended/4583230/)). **Idea: a verb for a clip.**
- **Booster Pack Heroes** (10 November 2026, $6.99): packs of foil heroes hold a tower. [273 reviews on day one, 92%](https://store.steampowered.com/appreviewhistogram/4618570?l=english&review_score_preference=0);
  the top negative (128) got the same pulls in the same order as the streamer who sent them ([review](https://steamcommunity.com/id/Raging_Rexx/recommended/4618570/)). **Idea: scripted luck is found out.**

## Held against Fantasy Idle

| Elsewhere | Fantasy Idle today (checked in the code) | Verdict |
|---|---|---|
| One button and one picture first: 89–99.9% reach the first goal | The fight fills the screen; a hand on the monster at 3 s; a sword at 0:05, the one scripted drop (019, `src/systems/combat.js:413`) | Covered |
| No wait past 10–30 s in a one-hour arc | Something new at least every 168 s through 150 minutes (`tools/opening.mjs`) | Fine for a long game |
| One line per place, no exposition; names that grow (A Dark Room) | One line per land and stratum, said once (`src/ui/features.js:151-162`, `src/data/strata.js:14-46`); the tab title says what he does (`src/ui/render.js:315-325`); the Lords say nothing | Covered; P-027 |
| A stall with the means in hand (Paperclips, Download RAM Idle 2) | Talents can be unlearned for essence (`src/data/talents.js:31,208`); the first run's hand stops before the stage-20 boss (019) | P-079 |
| An end that closes the premise; a twist sours one | No end yet; the Hollow Throne's card says a crown waits on an empty throne (`src/data/strata.js:35`) | P-021: answer that line |
| Music and credits at the end (A Dark Room, Paperclips) | No music (020); no credits in `src/`, only a code comment (`src/data/sprites.js:6`) | P-021 with P-012, P-020 |
| Something next: 20–80% of finishers take it | Trials, ladders and Pacts; nothing opens at a close (009) | P-021's ninth Trial |
| Recoloured bosses, one animation (Horripilant) | Past 500 the 15 strata return with a numeral and a 47° hue turn (`src/data/strata.js:49-64`, `src/ui/scene.js:51`); the best live hero, at 2,440, is in round VII | Ask the Discord (025) |
| Flash and shake that can't be turned off; a filter off by default | One Reduce motion switch, all or nothing (020) | P-082 |
| A memory leak; late frame drops | CPU measured (005); memory over a long open session never | For the queue |
| A wrong genre label (Sixty Four) | Offline replays up to 24 h at the online rate (000); the listings promise play while away (`index.html:7,13`) | Covered; keep it true |
| A premise a stranger can repeat | The title card's three verbs include forging, which was removed (`src/ui/render.js:2927`, `:1046`) | P-026, P-068 |

## Every game read

| Game | Reviews, positive; median hours; the end | Best idea | Verdict |
|---|---|---|---|
| A Dark Room | Steam 66, 91%; App Store's first in 2014 | Names that grow; the end strips the screen | Covered; the teardown doesn't carry |
| Universal Paperclips | 450,000 in 11 days (Wired) | Phases that change the screen; Accept or Reject; credits in the log | P-021, P-079 |
| Spaceplan | 3,524, 91% | Music and an ending | P-012, P-021 |
| Download RAM Idle 1 and 2 | 62,040 and 82,507 plays, 4.7 | Hidden secrets; a stated length | Small (three secret medals exist) |
| Asbury Pines | 581, 91%; 24.6 h; 37.7% | Story drip-fed by numbers; the ending decides | P-021 (no twist), P-027 |
| Sixty Four | 1,680, 73%; 18.2 h; 8.9% | A look sells; a wrong label sinks | Keep the idle promise |
| Horripilant | 3,187, 92%; 28.6 h; 43.9% | Mood, then variety | Ask the Discord (025) |
| Berry Bury Berry | 9,173, 98%; 9.8 h; 60.5% | A premise in one sentence | P-068 |
| Magic Archery | 8,747, 98%; 1.2 h; 91.5% | No long waits | Fine (019) |
| Digseum | 8,259, 98%; 2.8 h; 82.0% | A familiar verb | Doesn't carry: mini-games stay small |
| Shelldiver | 17,981, 99%; 4.9 h; 69.3% | An end that closes the premise | P-021, P-042 |
| Bills Must Be Paid | 13,706, 97%; 4.8 h; 69.3% | The hook is the title | P-068 |
| Loot Loop | 1,847, 93%; 3.0 h; 69.9% | A flat prestige faulted; effects off by default | Covered; P-082 |
| Master Healer Kale | 2,221, 95%; 6.6 h; 55.8% | Won without casting | P-021 (won without clicking) |
| Harvest Dice Profit | 80, 91%; 7.0 h; 31.3% | A verb for a clip | The long-session test |
| Booster Pack Heroes | 273 on day one, 92% | Chance is the charm | Covered |

Median hours are of each game's 100 most helpful English reviews. Next modes, as a share of finishers (my arithmetic): Asbury Pines' 100% 80%, Loot Loop's new game 73%,
Berry Bury Berry's true ending 71%, Kale's Nightmare 48%, Harvest Dice's Hell 20%. Found and not read further: [Space Rock Breaker](https://store.steampowered.com/app/4035270/) ([4,963, 96%](https://store.steampowered.com/appreviewhistogram/4035270?l=english&review_score_preference=0);
4.0 h; the end [85.0%](https://steamcommunity.com/stats/4035270/achievements/)), [A Game About Digging A Hole](https://store.steampowered.com/app/3244220/) ([19,604, 89%](https://store.steampowered.com/appreviewhistogram/3244220?l=english&review_score_preference=0);
3.6 h; its treasure [57.3%](https://steamcommunity.com/stats/3244220/achievements/)) and [Q-UP](https://store.steampowered.com/app/3730790/), from Lantz's studio ([1,154, 94%](https://store.steampowered.com/appreviewhistogram/3730790?l=english&review_score_preference=0)).

## Proposals from this file

1. **P-021, three notes on its shape** (Add, M, as before). (a) Answer the line the game already says: the crown waiting on the Hollow Throne becomes the King's, and no twist
   recasts the climb (Asbury Pines' ending is in 11 of 23 negatives and is being rewritten). (b) Its own sound, and the credits as lines in the Battle log (`src/ui/render.js:503-510`) as Paperclips does, which settles
   P-020's credits line; a cue from `src/ui/sound.js` if P-012's music isn't built. (c) The ninth Trial on the same card: 20–80% of finishers take what follows. Why: the ends praised here close a premise.
2. **P-028, an earlier act** (Change, S; indirect evidence). Beside the card at 500, the Abyss Warlord's first fall at stage 100, where the ten authored lands end, gets a card of its own:
   the ten paintings in a row with the Chronicle's dates, and one line that the Abyss goes on. Today that moment is the Abyss Walker medal (`src/data/achievements.js:22`). Why: short arcs
   keep 57–92% to an end one to five hours in; a player who takes every offer reaches the Abyss at 2:28 (two seeds of three) and stands at stage 96 at 2:30, one who strikes five times a
   second at 2:02 and 100 (`tools/opening.mjs 150 3`); five of the 15 accounts active this week stand below 100 (027). Risk: reading as the end, so the line says the stair goes on (009).
3. **P-026, one word** (Change, under S): the title card's `forge your gear` (`src/ui/render.js:2927`) promises what was removed; `index.html:7` already says craft.
4. **Evidence only** (effort unchanged): P-027, story is the praise the charm games name most (Asbury Pines 67 of 77 positives, Spaceplan 50 of 97, Berry Bury Berry 34 of 99); P-079, the
   one fault Paperclips' maker owned was a stall; P-082, Shelldiver's last half hour and Loot Loop's filter; P-012, Spaceplan's sound in 44 of 97 and soundtracks sold apart ([Spaceplan's](https://store.steampowered.com/app/630500/), [Asbury Pines'](https://store.steampowered.com/app/4884580/)); P-042,
   Shelldiver's 72% outside English; P-068, the biggest arcs name their premise in the title.

**Ideas that don't carry over:** shortness and a price per hour: the game is free and endless, and short arcs keep 1.5–7% of their best month a year or more on ([Asbury Pines](https://steamcharts.com/app/2212790),
[Sixty Four](https://steamcharts.com/app/2659900), [Spaceplan](https://steamcharts.com/app/616110), [Digseum](https://steamcharts.com/app/3361470), [Magic Archery](https://steamcharts.com/app/2905170)), as 009 found.
Teardown endings: the climb goes on past the King. Twists and several endings: they need an authored story, and one twist can sour hundreds of hours. Active loops sold as idle: the click
stays optional. Scripted pulls; a mini-game as the core verb; a fake desktop, first person, horror. Dropping prestige, as a [109-point post](https://www.reddit.com/r/incremental_games/comments/1vllf3c/) would: it is the spine here.

**For the queue:** a long-session test, the game open 6–24 hours in Chromium, plain and at Chrome's 4× throttle, heap and frame rate every ten minutes (005 measured CPU only); 025's
question to the Discord on whether the deep rounds read as repeats, now with Horripilant's top negative, and if so one new kind per stratum each round from unused DCSS tiles, after P-108;
Booster Pack Heroes' end share a month on; Asbury Pines at 1.0; Q-UP; the subreddit's best of 2026 in January; the launch threads of Kale, Digseum, Spaceplan, Berry Bury Berry and Paperclips.
