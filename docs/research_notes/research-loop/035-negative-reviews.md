# 035: Why idle RPG players leave negative reviews (read 11 November 2026)

**Sample.** Ten games; on each game's Steam community pages, the 50 most helpful negative English reviews of all time
([Melvor's](https://steamcommunity.com/app/1267910/negativereviews/?browsefilter=toprated&filterLanguage=english)), then the 50 most recent not already taken
([Melvor's](https://steamcommunity.com/app/1267910/negativereviews/?browsefilter=mostrecent&filterLanguage=english)); the same two pages for each game below (Soda Dungeon 2:
51 and 49; Unnamed Space Idle: 55 and 45, as the 70 recent ones fetched held too many already taken). 1,000 reviews, 32,381 helpful votes. Hours at
review come from each review's own page; 529 show only the total, as Steam does when no play followed (12 of them show play in the past two weeks, all
posted within them), so the total was used. Review counts are Steam's histograms, which count all languages.

**Coding, and by whom.** A codebook of 19 themes plus "other" and "none", written before reading: several themes a review, one main reason, and whether
the writer says they liked the game or quit. Ten Claude subagents, one per game, read every review in full and coded it by judgment, not keywords. I coded
50 random reviews (five a game) myself: the main reason matched in 46, and the theme sets overlapped 0.89 on average (Jaccard); I had seen the coders'
notes for 12 of them first. From the 184 filed under "other" I split out, by reading their notes, what the codebook lacked: a copy of or worse than another
game (57, plus 12 found by a word search for Melvor, clone, copy, first game and the like, each read), presentation (art, sound, music, writing: 41),
addiction warnings (30), achievement churn (5), no sync across devices (3); 52 stay. Eight reviews tagged English but written in another language count as "none".

**Limits.** Negatives only: a share is what unhappy writers name, not how common a problem is. Steam's helpful order favours older reviews by heavier players
(a median of 190 hours at review in the helpful half, 25 in the recent half), and Steam counts hours a game is left open. No review held instructions aimed at an AI; one
asks Steam readers to ignore and report a day's negatives ([review](https://steamcommunity.com/id/N3tRunn3r/recommended/3224420/)). Fantasy Idle: this round's worktree.

## In short

1. **Money leads:** in 347 of 1,000 reviews, the main reason in 213, in 42% of those written after 100 hours, and in reviews holding 68%
   of all helpful votes. It leads in the five online games with cash shops (IdleOn 77 of 100, Firestone 65, Idle Champions 55, Idle Clans
   44, Milky Way Idle 38); elsewhere it is 8 to 24, and Melvor's 12 are mostly its paid expansions.
2. **After 100 hours, trust:** the developer's conduct is in 23% of those reviews (7% before; 44% of the votes), an update that took
   something away in 17% (0–3% before). 47% of writers had played over 100 hours, 22% over 1,000; 36% of the over-100 writers say they liked the game.
3. **Under 10 hours, the first look:** boring or shallow 29%, money 29%, a copy of another game 12%, no reason 11%, the interface 10%,
   presentation 9%, too much at once 8%. Only 8% of these writers say they liked the game.
4. **Melvor's 2026 is about being online:** 18 of its 100 (13 from 2026); its two most helpful negatives were posted during the 13 August outage
   ([221 votes](https://steamcommunity.com/id/wootishomg/recommended/1267910/): "you can't play the singleplayer idle game unless their
   game server is online"). Fantasy Idle's files come from one server, and nothing keeps them for an outage (P-008).
5. **A copy of Melvor** is Idle Clans' second theme (29 of 100) and in 14 of Milky Way Idle's, written at a median of 3.6 hours played.
   Fantasy Idle's README opens "in the spirit of Melvor Idle" (`README.md:3`).
6. **For Fantasy Idle:** money, server merges, chat and short offline caps are avoided today. It is exposed on being online, flags without an
   answer, changes that weaken what was bought, the first hour on phones, and a Melvor-like pitch.

## The ten games

| Game (negatives read) | Reviews, positive (all; 2026) | Median h at review | Over 100 h | Themes most named (of its 100) |
|---|---|---|---|---|
| [Melvor Idle](https://steamcommunity.com/app/1267910/negativereviews/?browsefilter=toprated&filterLanguage=english) | [15,634, 89%; 83% of 924](https://store.steampowered.com/appreviewhistogram/1267910?l=english&review_score_preference=0) | 88 | 48% | bugs 24, boring 23, online 18, grind 18, UI 14, money 12, presentation 10 |
| [IdleOn](https://steamcommunity.com/app/1476970/negativereviews/?browsefilter=toprated&filterLanguage=english) | [32,379, 80%; 63% of 3,721](https://store.steampowered.com/appreviewhistogram/1476970?l=english&review_score_preference=0) | 2,377 | 81% | money 77, developer 44, not idle 21, bugs 19, worse 15 |
| [Idle Clans](https://steamcommunity.com/app/2103530/negativereviews/?browsefilter=toprated&filterLanguage=english) | [1,836, 75%; 77% of 369](https://store.steampowered.com/appreviewhistogram/2103530?l=english&review_score_preference=0) | 10 | 34% | money 44, copy of Melvor 29, boring 19, bugs 10, grind 10 |
| [Milky Way Idle](https://steamcommunity.com/app/3224420/negativereviews/?browsefilter=toprated&filterLanguage=english) | [2,833, 49%; 67% of 476](https://store.steampowered.com/appreviewhistogram/3224420?l=english&review_score_preference=0) | 80 | 49% | money 38, developer and moderators 35, social 24, copy 14 |
| [Firestone](https://steamcommunity.com/app/1013320/negativereviews/?browsefilter=toprated&filterLanguage=english) | [7,576, 77%; 73% of 616](https://store.steampowered.com/appreviewhistogram/1013320?l=english&review_score_preference=0) | 192 | 55% | money 65, social 38 (new servers, merges), grind 29, developer 19 |
| [NGU Idle](https://steamcommunity.com/app/1147690/negativereviews/?browsefilter=toprated&filterLanguage=english) | [13,919, 95%; 92% of 684](https://store.steampowered.com/appreviewhistogram/1147690?l=english&review_score_preference=0) | 85 | 48% | grind 25, boring 25, addiction 17, presentation (humour, art) 15, none 14 |
| [Idle Champions](https://steamcommunity.com/app/627690/negativereviews/?browsefilter=toprated&filterLanguage=english) | [15,974, 77%; 63% of 376](https://store.steampowered.com/appreviewhistogram/627690?l=english&review_score_preference=0) | 240 | 56% | money 55, grind 33, boring 24, worse 20, wall 16, bugs 15 |
| [Soda Dungeon 2](https://steamcommunity.com/app/946050/negativereviews/?browsefilter=toprated&filterLanguage=english) | [6,238, 94%; 93% of 229](https://store.steampowered.com/appreviewhistogram/946050?l=english&review_score_preference=0) | 19 | 21% | boring 31, grind 25, worse than the first game 23, bugs 18, UI 14 |
| [Idle Slayer](https://steamcommunity.com/app/1353300/negativereviews/?browsefilter=toprated&filterLanguage=english) | [13,395, 81%; 80% of 1,524](https://store.steampowered.com/appreviewhistogram/1353300?l=english&review_score_preference=0) | 48 | 37% | grind 42, not idle 40, boring 25, money 24, developer 18 |
| [Unnamed Space Idle](https://steamcommunity.com/app/2471100/negativereviews/?browsefilter=toprated&filterLanguage=english) | [4,801, 92%; 90% of 892](https://store.steampowered.com/appreviewhistogram/2471100?l=english&review_score_preference=0) | 20 | 38% | grind 40, boring 35, wall 14, money 12, UI 11 |

## Themes, ranked

Reviews naming the theme, of 1,000; then the share within each band of hours at review. * = split out of "other" after coding.

| Theme | Of 1,000 | Main reason | Under 10 h (292) | 10–100 h (241) | Over 100 h (467) | In a game's top three |
|---|---|---|---|---|---|---|
| Money | 347 | 213 | 29% | 28% | 42% | IdleOn, Firestone, Idle Champions, Idle Clans, Milky Way |
| Grind and pace | 247 | 100 | 12% | 34% | 28% | six games |
| Boring or shallow | 219 | 131 | 29% | 31% | 12% | seven games |
| The developer's conduct | 145 | 46 | 7% | 7% | 23% | IdleOn, Milky Way |
| Not idle enough | 123 | 52 | 6% | 13% | 16% | Idle Slayer, IdleOn |
| Bugs and lost saves | 118 | 78 | 7% | 11% | 15% | Melvor |
| An update made it worse | 89 | 30 | 0% | 3% | 17% | |
| Social and clan pressure | 84 | 24 | 3% | 7% | 12% | Firestone, Milky Way |
| UI and readability | 81 | 25 | 10% | 9% | 6% | |
| A wall | 71 | 13 | 2% | 8% | 9% | Unnamed Space Idle |
| A copy of another game* | 69 | 37 | 12% | 7% | 4% | Idle Clans, Soda Dungeon 2 |
| Offline and timers | 60 | 9 | 2% | 5% | 9% | |
| Balance and builds | 54 | 17 | 2% | 6% | 7% | |
| Overwhelm and opacity | 53 | 18 | 8% | 4% | 4% | |
| Online and accounts | 48 | 29 | 5% | 2% | 6% | Melvor |
| Presentation* | 41 | 13 | 9% | 2% | 2% | |
| Abandoned or slow | 36 | 8 | 1% | 2% | 6% | |
| Performance | 34 | 12 | 1% | 2% | 5% | |
| Addiction* | 30 | 21 | 1% | 3% | 4% | NGU |
| Cheating and bans | 22 | 8 | 1% | 2% | 3% | |
| Nothing to do late | 21 | 7 | 0% | 3% | 3% | |
| AI | 6 | 2 | 1% | 1% | 0% | |

No reason given: 79 (11% under 10 hours, 6% over 100). A review names 2.1 themes on average. The helpful half against the recent half:
money 41% against 28%, the developer 21% against 8%, worse 14% against 4%, no reason 3% against 13%.

## What the themes hold

- **Money:** IdleOn's packs and pets, new every week ([34,639 h, 512 votes](https://steamcommunity.com/id/daedricblood/recommended/1476970/)); three of Milky Way Idle's 100
  against its 10-hour offline cap, two adding that more costs money ([0.1 h](https://steamcommunity.com/id/marioanto/recommended/3224420/), [6.6 h](https://steamcommunity.com/id/SpiralKipz/recommended/3224420/)).
- **The developer, and bans:** 19 of IdleOn's 100 name bans or silenced criticism ([8,099 h](https://steamcommunity.com/id/stripperofchicken/recommended/1476970/)); 14 of Milky Way
  Idle's name its moderators. A new flag system banned a couple's six Idle Clans accounts, and the moderators could not say what was gained ([1,510 h](https://steamcommunity.com/id/Idlekers/recommended/2103530/));
  Milky Way Idle gives 10-year bans without appeal ([1,994 h](https://steamcommunity.com/profiles/76561198884634339/recommended/3224420/)); Idle Slayer's hidden autoclicker check handicaps in silence ([1,038 h](https://steamcommunity.com/id/76561197968044094/recommended/1353300/)).
- **Worse after an update:** five of Melvor's 100 name the Township nerfs of its update 1.2 ([446 h](https://steamcommunity.com/id/ResidentCeno/recommended/1267910/)); IdleOn weakened its capes
  and sold them back ([20,502 h](https://steamcommunity.com/profiles/76561198045760457/recommended/1476970/)); an Idle Slayer update forced clicking and shut out a player with hand trouble ([1,419 h, 127 votes](https://steamcommunity.com/profiles/76561198037384323/recommended/1353300/)).
- **Not idle:** 19 of Idle Slayer's 100 say it is not, 7 name autoclickers or macros it blocks or punishes; six IdleOn reviews say it must run all day
  ([8,064 h](https://steamcommunity.com/id/pozoro/recommended/1476970/)); Firestone asks a check-in every 40 minutes ([422 h](https://steamcommunity.com/profiles/76561199146462182/recommended/1013320/)).
- **Online:** Melvor reviews from February 2022 ([1,566 h](https://steamcommunity.com/profiles/76561198026914391/recommended/1267910/)) to October 2026 ([354 h](https://steamcommunity.com/profiles/76561198090785826/recommended/1267910/))
  say it won't start without its servers or a connection; a hardcore character was lost in the August outage ([546 h](https://steamcommunity.com/id/Whiter0/recommended/1267910/)).
- **Copies, looks, addiction:** Idle Clans as Melvor with everything monetised ([89 votes](https://steamcommunity.com/profiles/76561198003079065/recommended/2103530/)), Milky Way Idle as
  "A tofu Melvor Idle clone" ([2 h](https://steamcommunity.com/id/BlueberryPoptart/recommended/3224420/)), Soda Dungeon 2 as its first game again ([154 votes](https://steamcommunity.com/id/psenough/recommended/946050/)); 10 of Melvor's 100
  name silence or plain looks, one refunded at 0.3 hours ([review](https://steamcommunity.com/profiles/76561198039522983/recommended/1267910/)); addiction warnings come from heavy
  players (median 642 hours; 17 are NGU's), often as jokes ([6,000 h](https://steamcommunity.com/profiles/76561199163214997/recommended/1147690/)), with no design lesson of their own.

## Held against Fantasy Idle

| Theme (share) | Fantasy Idle today | Exposed? | Answered by |
|---|---|---|---|
| Money (35%; 42% after 100 h) | Free, "nothing to buy" (`index.html:13`); power for sale is the owner's later plan (ROADMAP, Decisions 2) | Not today; the plan is the exposure | P-057, P-047, P-050; P-054–P-056 carry it |
| Grind and pace (25%) | Melvor's pace by choice: 83–250 h to 99 (000) | By design | the owner's choice (DESIGN §5) |
| Boring or shallow (22%; 29% under 10 h) | A full-screen fight with sound; 52% of accounts back after a day (027) | Partly: half go in a day | P-065, P-079 |
| The developer (15%; 23% after 100 h) | One owner who answers on Discord; November's false flags sat for days (P-025) | On flags | P-025, P-099, P-043 |
| Not idle enough (12%) | 24 h away at the full rate (`src/core/modifiers.js:62`), a macro is fair play (the owner); but a click pays about x2 on easy stages, the Titan is hourly (three banked) | Partly | P-041, P-059 |
| Bugs and lost saves (12%) | The server's save every minute; nightly dumps on the same disk (`README.md:102`), never restored (P-094) | Yes | P-094, P-013 |
| Worse after an update (9%; 17% after 100 h) | No rule for a weakening change: unlearning the War Tree costs 20,000 essence x1.5 a time (`src/data/talents.js:31`); a swapped obstacle refunds nothing (`src/main.js:1611`) | Yes | new (below), P-016 |
| Social pressure (8%) | One realm, no merges, no chat, opt-in boards, clan power keeps members within x0.5–x2 (004) | Mostly avoided | P-010, P-035, P-009 |
| UI (8%; 10% under 10 h) | 121 of 134 hover tips never show on a phone (021) | On phones | P-080, P-019, P-084, P-018 |
| A wall (7%) | A boss clock each tenth stage; a first-run player fell at stage 20 with 658–679 gold unspent (019) | Early | P-079, P-091, P-075 |
| A copy (7%; 12% under 10 h) | `README.md:3`: "in the spirit of Melvor Idle"; Melvor's XP table and pace; nearly all "Melvor-like" posts end at 0–1 points (018) | At the door | P-068, widened |
| Offline and timers (6%) | 24 h at full rate; the hours past it unsaid (P-093); a missed week's laurel lost for good (P-017) | Mostly avoided | P-093, P-017, P-059 |
| Balance (5%) | 51% of worn affixes do nothing past stage 1,300 (015) | Deep | P-062, P-061, P-023 |
| Overwhelm (5%) | Pieces open one at a time (`src/systems/disclosure.js`); Trials' worth needed Discord (001) | Mostly avoided | P-074, P-022 |
| Online (5%; Melvor 18%) | Sign-in first, guest a click away (`src/main.js:136`); a fresh load should fail while the one server is down (files sent `max-age=0, must-revalidate`, `deploy/vps/nginx.conf:67`, no service worker; not tested); an open page plays on and retries every 45 s (`src/main.js:155`) | Yes | P-008, P-065 |
| Presentation, performance (4%, 3%) | Paintings, sprites, synthesized sound, no music; 12–14% of a core while the fight plays (005) | Avoided; partly | P-012, P-037 |
| Cheating and bans (2%) | The growth check; its ceiling at stage 6,000 is about eight weeks off (P-024) | Yes | P-025, P-099, P-024 |
| Late, abandoned (2%, 4%) | Endless stages; in active development | Avoided while it lasts | P-024, P-016 |
| AI (under 1%) | 161 Gemini paintings, not disclosed in the game (P-020) | Yes; this sample predates the tools | P-020 (evidence in 020, 024) |

## Proposals from this file

- **P-057, P-047, P-050** (Remove, Change, Add; S each): money is in 35% of these negatives, 42% after 100 hours and 68% of the votes; Milky Way Idle's
  10-hour offline cap drew three of its 100, two naming the paid extension. Strong new evidence against selling power.
- **P-025 with P-099** (Change; S–M): most ban stories here are bans the player could not foresee or answer: no reason given, no appeal, or a check
  nobody could explain. Say what a flag does, list before acting, and give a way to contest.
- **P-008** (Add; M): Melvor's two most helpful negatives were posted during one outage; by its config, Fantasy Idle would not load during one.
- **P-094, then P-013** (Add; S, then S or M+): bugs and lost saves are 12% of all and 15% after 100 hours.
- **New, for the log to number: a weakening change gives back what it took** (Change; S each time). When an update lowers what a bought thing gives
  (a talent, a perk, a camp level, an obstacle, an anvil level), its price comes back once, through a migration in `src/core/state.js` as gifts already
  come, and the what's-new card (P-016) says so. The theme is 9% of all, 17% after 100 hours, in reviews holding 21% of the votes; no proposal answers it.
- **P-016** (Add; S): changes and their refunds reach players who never open Discord; abandoned or slow is 4%.
- **P-041** (Change; S): an Idle Slayer update that forced clicking shut out a player with hand trouble (127 votes). It reopens a deliberate choice; the
  click and its combo stay.
- **P-065, P-079, P-080, P-019** (Change, Add; S): the under-10-hour themes are boring, money, a copy, the UI and too much at once; one of Melvor's most
  helpful negatives asks only for larger item icons ([194 votes](https://steamcommunity.com/profiles/76561198012144104/recommended/1267910/)).
- **P-068, widened** (Change; S): beside the post, the README's first line and the listings lead with what is the game's own (the fight filling the
  screen, the painted lands, the weekly clan boss), and name Melvor lower down, as an influence.
- **P-059, P-017, P-093** (Change; S–M, S–M, S): timers and caps are 6%; the Titan's bank, the week's laurel and the unsaid hours past 24 are where
  Fantasy Idle is exposed.
- **P-062, P-061** (Change; S–M, M): dead stats and one right build are 5%, 7% after 100 hours. **P-012** (Add; M): silence is 10 of Melvor's 100.
  **P-037** (Add; S–M): performance is 3%, 15 of Idle Champions' 100. **P-020:** little here (6 of 1,000).

**For the queue:** the positive reviews of the same ten games, coded the same way, to set each theme against praise; Melvor's 2026 online requirement and
Idle Clans' 2026 ban system from their patch notes; the first-day return before and after the guest link (P-065).
