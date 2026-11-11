# 031: Achievements, pets and lore (read 11 November 2026)

Read: Steam's global achievement pages for 15 idle games (retired goals left out), the store's prices and review histograms and Steamworks' documentation; the wikis of Antimatter Dimensions (AD), Cookie Clicker,
Melvor, OSRS, IdleOn, Tap Titans 2 and Trimps through their APIs; Reddit through the Arctic Shift archive, which rate-limited me midway, so some threads went unread; papers through Crossref, OpenAlex and Semantic
Scholar; Hecker's GDC 2010 talk page (archived) and Blair's 2011 article. Fantasy Idle: the worktree's code (df38cf1) and two 400-hour runs of `tools/simulate.mjs` (seed 1, `--auto --pacts --charms`; always on, and
`--player=checkin3`, three visits a day). Steam's shares are of its own count of players, base not public (009), and imported web saves inflate later steps (026). Comment tallies are rough word matches. No page held
instructions aimed at an AI.

## In short

1. **Good curves start steep, run a long middle and end near 2–6%:** in Melvor and AD the most-held goal has 96–98%, the median 15–17%, the last 2–6%, none under 1%; under 1% piles up only in lists of hundreds.
2. **The best-loved incrementals pay nothing for secret goals** (AD's 32, Cookie Clicker's 17). Fantasy Idle's three pay power, count in completion, and its own wiki lists them.
3. **Open goals that pay are what players ask for** (36 of 74 top-level comments), if they mark progress; time played, clicks by the million, dates, luck and ads are called pointless, and Fantasy Idle has none.
4. **Pets are small bonuses or looks** (Melvor's 101, OSRS's 71) **or a system with a job** (Summoning, Krumblor, IdleOn's pulls: reviews at 26% that month); Fantasy Idle has the first kind but nothing rare (P-030).
5. **Players want little story, in short lines at big moments, kept where it can be reread.** AD's last Celestial speaks in lines of median 7 words; Melvor's 1,000-word books often go unfound.
6. **Fantasy Idle repeats its lines and loses its story:** 78 of 93 stratum cards to 2,440 repeat a line; the Chronicle keeps no Lord, medal or Ascension and will drop its start from about stage 3,100–4,100.

## 1. Achievements

**The curve on Steam** (each game's global page, 11 November; shares in %; hidden are Steam's spoiler goals; US prices from the store):

| Game | Price | Goals | Most held | Median | ≥50% | <1% | Least held | Hidden: median vs open |
|---|---|---|---|---|---|---|---|---|
| [Melvor Idle](https://steamcommunity.com/stats/1267910/achievements/) | $9.99 | 86 | 98.2 | 14.7 | 4 | 0 | 2.0 | none |
| [Antimatter Dimensions](https://steamcommunity.com/stats/1399720/achievements/) | free | 100 | 96.0 | 16.8 | 6 | 0 | 5.9 | 7: 6.2 vs 20.5 |
| [NGU Idle](https://steamcommunity.com/stats/1147690/achievements/) | free | 61 | 68.7 | 15.0 | 6 | 0 | 3.0 | 17: 9.2 vs 16.6 |
| [Clicker Heroes](https://steamcommunity.com/stats/363970/achievements/) | free | 111 | 90.6 | 16.1 | 20 | 0 | 2.7 | none |
| [Cookie Clicker](https://steamcommunity.com/stats/1454400/achievements/) | $4.99 | 637 | 99.9 | 36.6 | 78 | 0 | 5.6 | 14: 11.4 vs 36.6 |
| [Idle Slayer](https://steamcommunity.com/stats/1353300/achievements/) | free | 651 | 81.6 | 24.4 | 93 | 0 | 1.1 | 2: 7.4 vs 24.5 |
| [Soda Dungeon 2](https://steamcommunity.com/stats/946050/achievements/) | free | 32 | 87.4 | 35.1 | 11 | 0 | 4.0 | 3: 9.0 vs 35.9 |
| [Realm Grinder](https://steamcommunity.com/stats/610080/achievements/) | free | 14 | 90.1 | 34.5 | 4 | 0 | 5.2 | 3: 16.7 vs 46.4 |
| [Firestone](https://steamcommunity.com/stats/1013320/achievements/) | free | 75 | 89.8 | 7.5 | 3 | 0 | 2.5 | 6: 8.9 vs 7.4 |
| [Unnamed Space Idle](https://steamcommunity.com/stats/2471100/achievements/) | free | 360 | 83.1 | 5.0 | 7 | 9 | 0.1 | none |
| [IdleOn](https://steamcommunity.com/stats/1476970/achievements/) | free | 276 | 41.8 | 3.0 | 0 | 16 | 0.3 | 23: 2.6 vs 3.1 |
| [Idle Champions](https://steamcommunity.com/stats/627690/achievements/) | free | 867 | 59.9 | 0.9 | 2 | 455 | 0.1 | none |

- **Reading it:** the most-held goal has 69–100% in ten of twelve; IdleOn, Idle Champions and [Trimps](https://steamcommunity.com/stats/1877960/achievements/) (23.7%) start lower, as many installs never get going
  (my reading). The share then halves within a few goals: Melvor 98 → 82 → 62 → 53 (a character, a level, a pet, a mastery 99). The middle sits at 15–37% in Melvor, AD, Clicker Heroes, Cookie Clicker and Soda
  Dungeon 2; the last goal is the end: Melvor's Hardcore gods 2.0%, AD's ending 5.9%, NGU's 3.0%. Cookie Clicker's middle is a plateau (deciles 56 down to 27%), likely imported web saves (unverified).
- **Shares on the goal:** OSRS's wiki [gives each](https://oldschool.runescape.wiki/w/Combat_Achievements/All_tasks) of 655 Combat Achievements a Comp%, crowdsourced from players with any task: median 18.2%, none
  under 1%, tier medians 47.7% (Easy), 41.3, 32.7, 22.1, 9.7 and 3.6% (Grandmaster); speed tasks are the rarest kind (5.6%). Steamworks [calls its global
  page](https://partner.steamgames.com/doc/features/achievements) fun for players and a check on whether hard goals are too hard. In a two-year study of Xbox players,
  [Jakobsson](http://gamestudies.org/1101/articles/jakobsson) found visible records both justify extra effort and breed resentment.
- **Fantasy Idle's spacing** (`src/data/achievements.js`, 54 medals): the always-on bot won 2 by hour 1, 11 by 5, 20 by 10, 28 by 24, 38 by 100 and 44 by 400 (stage 2,040); after hour 75, six came 46 hours apart.
  The three-visits bot had 33 at hour 400 (stage 640). Of 15 accounts active this week, 14 stand past stage 11, 10 past 500, 8 past 1,000, 6 past 1,500 and 3 past 2,000 (027): Steam's shape, among the keen.
- **Secret goals:** Steam renamed hidden goals [spoiler achievements](https://partner.steamgames.com/doc/features/achievements/ach_guide), unseen until won or until the player chooses to reveal them. In 7 of the
  table's 8 games with both kinds the hidden median is lower (Firestone and Trimps are not), though many sit late anyway. AD's 32 secret achievements [carry no reward and skip the row
  multiplier](https://antimatter-dimensions.fandom.com/wiki/Achievements); Cookie Clicker's 17 shadow ones [give no milk and stay uncounted until earned](https://cookieclicker.fandom.com/wiki/Achievement). IdleOn's
  hidden ones reward oddities, one for reading upgrade flavour text (4.4%). One player [hates secret achievements](https://www.reddit.com/r/incremental_games/comments/8s3ucv/) (7 points; thin). Fantasy Idle's three
  (25 pats, a great crate, 100 falls) pay +1% attack, defence and speed each, plus +5% gold, drops or health; the wiki lists them; completion counts them in its 54, the Hall's count doesn't.
- **Goals that teach:** 17 of AD's 18 rows are [designed to be possible before](https://antimatter-dimensions.fandom.com/wiki/Achievements) a named milestone.
  [Blair](https://www.gamedeveloper.com/design/the-cake-is-not-a-lie-how-to-design-effective-achievements) advises rewards for dull tasks and, for interesting ones, *attentional* goals that point at a strategy.
  Fantasy Idle's medals follow the climb; the hand teaches (019).
- **Pay power or nothing:** AD gives ×1.03 a goal and ×1.25 a full row, and 80 of the 148 goals in its wiki table carry their own reward (my parse); Cookie Clicker gives [4% milk a
  goal](https://cookieclicker.fandom.com/wiki/Milk); Melvor's pay nothing in the game (as far as I found); OSRS pays convenience (008). In four r/incremental_games threads
  ([2023](https://www.reddit.com/r/incremental_games/comments/109ebha/), [2023](https://www.reddit.com/r/incremental_games/comments/18nd71t/), [2025](https://www.reddit.com/r/incremental_games/comments/1nsog1y/),
  [2026](https://www.reddit.com/r/incremental_games/comments/1s2ezuk/)), 36 of 74 top-level comments ask for a reward or a meaningful milestone; the first thread's top answer (54 points) wants real buffs, not
  counters. Research cuts both ways: badges raised activity in a trading service's [field experiment](https://doi.org/10.1016/j.chb.2015.03.036) (Hamari 2017, from its summary), yet a [meta-analysis of 128
  studies](https://doi.org/10.1037/0033-2909.125.6.627) found expected, completion-contingent rewards cut free-choice motivation (d = −0.36) and positive feedback raised it (d = 0.33), which [Hecker's
  talk](https://web.archive.org/web/2023/http://chrishecker.com/Achievements_Considered_Harmful%3F) rests on. Jakobsson's casual players want goals that matter enough to keep playing, not so much that they feel
  forced; Blair adds that a reward sets a ceiling at its threshold. [Hamari and Eranti](https://doi.org/10.26503/dl.v2011i1.545) split a goal into a sign, a completion logic and a reward.
- **Grindy or pointless, say players:** time played (a 2026 thread's top answer, 48 points), clicks in the millions, dates and missable goals, pure luck ([Idle
  Slayer](https://steamcommunity.com/profiles/76561198032227212/recommended/1353300/), 81 helpful, 1,386 hours), goals behind ads ([603 points](https://www.reddit.com/r/incremental_games/comments/grbmjs/)). In a
  photo service users [feared](https://doi.org/10.1145/1621841.1621859) achievements would reward the wrong use (Montola et al. 2009). Fantasy Idle has none such; kill counts come while idle.

## 2. Pets and companions

- **Melvor:** [101 pets](https://wiki.melvoridle.com/w/Pets) (59 combat, 35 skilling, 7 other), each a small permanent bonus, all active; the skill pets use Fantasy Idle's formula. Dungeon pets come at 1 in 350
  clears (low dungeons) to 1 in 150 (the gods), a few sure after 1 or 5 clears; event pets with no bonus aren't needed for 100%. A first pet is its third most-held Steam goal
  ([61.5%](https://steamcommunity.com/stats/1267910/achievements/)). Its subreddit's pet posts are mostly dry streaks ([48 points](https://www.reddit.com/r/MelvorIdle/comments/1njex9d/),
  [33](https://www.reddit.com/r/MelvorIdle/comments/1gkzfz3/), [22](https://www.reddit.com/r/MelvorIdle/comments/1f3imti/)) and [first finds](https://www.reddit.com/r/MelvorIdle/comments/1kkc0oz/) (51).
- **Melvor's Summoning** ([June 2021](https://wiki.melvoridle.com/w/Summoning)): familiars as tablets with charges, two in a loadout, pair synergies, marks found in other skills: a pet with a job is a whole skill.
- **OSRS** (008): 71 pets, nearly all look-only, hunted for years, insured by Jagex.
- **Cookie Clicker's [Krumblor](https://cookieclicker.fandom.com/wiki/Krumblor):** a dragon trained by sacrifices (mostly 100 of a building) for each aura; after a heavenly upgrade each pet has a 5% chance to drop
  one of four upgrades, one for each quarter of the hour.
- **Tap Titans 2:** [pets deal damage](https://tap-titans-2.fandom.com/wiki/Pets) and carry a bonus; one is active, the rest give 5% of theirs per 5 levels and all of it at 100, after which the pick stops mattering.
  An egg every four hours, levels sold for diamonds, ten [tokens a day](https://tap-titans-2.fandom.com/wiki/Critter_Haven) for a pet puzzle and more for diamonds.
- **IdleOn:** [pets](https://idleon.wiki/wiki/Pets) (once Companions) give account-wide bonuses: a free pull a day, more for crystals sold in packs, tradeable, one sure within 200 treats. The month they came, Steam
  reviews fell to [26% of 1,380](https://store.steampowered.com/appreviewhistogram/1476970?l=english&review_score_preference=0) (007); [the top thread](https://www.reddit.com/r/idleon/comments/14d8sw9/) (110 points)
  called it predatory, and a big spender closed their wallet.
- **Fantasy Idle** (`src/data/pets.js`, `src/core/modifiers.js`): 12 pets on 11 skills at +3% each, all active; the one at the hero's side is picked in the Collection and is for show; a pat makes it hop (25 pats: a
  secret medal); an unfound pet shows its hours at his level. The always-on bot found 2 in 400 hours (farming at 27, combat at 50): Melvor's kind, small and fair, arriving with the 99s (90–97% by then, 008).

## 3. Lore and story

- **How much players want:** in two r/incremental_games threads ([2022](https://www.reddit.com/r/incremental_games/comments/ygjse6/), 110 points; [2023](https://www.reddit.com/r/incremental_games/comments/109gwhd/),
  89), of 85 top-level comments about a third want story and an eighth skip all of it; the top answers want it optional and woven into the mechanics, and the first (55) prefers a game with none but names A Dark Room
  and Universal Paperclips. Melvor's players often never find its lore: "There is lore?" ([2022](https://www.reddit.com/r/MelvorIdle/comments/zdnraf/); also
  [2026](https://www.reddit.com/r/MelvorIdle/comments/1xcqsw7/)). The sequel's [six-minute lore animation](https://www.reddit.com/r/MelvorIdle/comments/1wyqa77/) drew 310 points, three times the next post on its
  lore (105; one data point).
- **Short lines at the beats:** Trimps tells its story in the [message log](https://trimps.fandom.com/wiki/Story), 321 lines at 194 zones from 1 to 801 (median 31 words), drily: "Another day, another Blimp at the
  end of the Zone." Its beats are called bombshells (009). AD's last Celestial [speaks](https://antimatter-dimensions.fandom.com/wiki/Pelle/Quotes) at 13 moments in 162 lines of median 7 words, the ending reviewers
  cried at (009). A Dark Room's reviewers call it [narrative-rich](https://steamcommunity.com/profiles/76561198071414927/recommended/2460660/) and find it leaves [room to
  imagine](https://steamcommunity.com/id/rainwarrior/recommended/2460660/) (66 Steam reviews, 91%). Soda Dungeon's dimension bosses carry its story; its sequel's silent end was faulted (009, 024).
- **Walls, logs and machine-made words:** Melvor's lore sits in [16 books](https://wiki.melvoridle.com/w/Lore), mostly opened by first clears and readable any time from a Lore page; the expansion's 11 run a median
  1,028 words. AD's [news ticker](https://antimatter-dimensions.fandom.com/wiki/News) holds about 2,000 lines on phones. Ballad of Heroes [added a log](https://www.reddit.com/r/incremental_games/comments/1axzu5h/)
  that replays every scene (024). 12 of Lowmoor's 17 negative top reviews fault its writing or call it AI (024; P-020).
- **Fantasy Idle:** 25 lines, one per land (`ZONE_LINES`, `src/ui/features.js`) and stratum (`src/data/strata.js`), on the card at the first step in. Past stage 500 each round's card repeats its stratum's line
  (`stratumAt` copies it, `src/main.js` shows it): 93 stratum cards to stage 2,440, 78 of them repeats. The Lords are named in the fight and the log, silent on their card, which names the drop. They are 15 bosses,
  one at each hundred from 200 to 1,600, then the same 15 again every 1,500 stages (my check of `stratumForStage`). The Chronicle (`src/systems/chronicle.js`) notes lands, every round's strata, pets, uniques, first
  clears, Seals, the first Titan and prestige, ranks and 99s, but no Lord, medal, Ascension or laurel. At stage 2,440, 93 of its 135–160 entries are strata, and its cap of 200 starts dropping the oldest (the start,
  then the first lands) from about stage 3,100–4,100 (my arithmetic).

## Held against Fantasy Idle (checked in the code at df38cf1)

| Elsewhere | Fantasy Idle today | Verdict |
|---|---|---|
| A steep start, a middle of 15–37%, an end near 2–6% (Melvor, AD) | 28 medals in a day always on, 44 by hour 400; live shares fall from 14 of 15 to 3 | Good shape; nothing to add |
| Secret goals that pay nothing and count nowhere (AD, Cookie Clicker) | 3 secrets pay power, sit on the wiki, count in completion's total | Proposal 1 |
| Every goal shown (Steam, OSRS, Melvor) | From the Hall's first opening 49 medals show, the stage ladder to 10,000 among them | Proposal 2 (the house rule) |
| A share on each goal (Steam, OSRS's wiki) | None; the server holds every account's save | Thin at 45 accounts; queue |
| Goals that pay are wanted; time, clicks, dates, luck and ads are not | All pay; none of those | Keep |
| Rows designed for a stage (AD), attentional goals (Blair) | Medals follow the climb; the hand teaches | Covered |
| Small-bonus pets with rare boss pets (Melvor); look-only pets (OSRS) | 12 skill pets at +3%; nothing rare after the 99s | P-030, P-040 |
| Pets with a job (Summoning, Krumblor, Tap Titans 2, IdleOn) | One at his side for show, a pat | Doesn't carry over |
| Short lines at beats (Trimps, Pelle) | 25 lines at first steps; 15 silent Lords | Proposal 4 (P-027) |
| Each line once; a log to reread (Melvor, Ballad, Trimps) | 78 repeated stratum lines; a Chronicle without Lords, medals or Ascensions that will drop its start | Proposal 3 |
| Words that read as machine-made cost (Lowmoor) | How the words were made isn't said in the game | P-020 |

## Proposals from this file

1. **Secret medals for fun, not power** (Change, S). (a) Take the three secrets out of completion's medals part, so a new secret can't lower anyone's figure (P-108's rule). (b) The owner's call: drop their power,
   keep each card and Unbroken's look, and give the other two a look if wanted. Why: AD and Cookie Clicker keep secrets power-free; a secret that pays sends players to the wiki, which lists them; unexpected,
   informational rewards carry none of the cost of expected ones (the meta-analysis above). Cost to a deep hero: about 1% of attack (my estimate from `src/core/modifiers.js`) and 5% of gold, drops and health.
2. **The stage medals show their next rung** (Change, S; the owner's call). The Hall's grid and count show stage medals up to the lowest one not won; the rest appear one at a time (completion still counts them).
   Why: the house rule that a ladder shows its next rung, kept already by the looks in Settings and the uniques in the Collection; effort rises as the share of the distance left falls ([Kivetz, Urminsky and Zheng
   2006](https://doi.org/10.1509/jmkr.43.1.39)), and a new player's bar toward 10,000 can't move. Against: Steam, OSRS and Melvor show every goal, and completists plan by full lists (Jakobsson).
3. **Each line said once; a Chronicle that keeps the story** (Change, S). A stratum's line on its first round only; a later round's card keeps its name, numeral and turned painting. The Chronicle notes each Lord's
   first fall with its sprite, each medal, each Ascension and the first laurel; folds a later round of the strata into one entry; and its cap never drops the start or the ten lands. Old saves keep their entries.
   Why: the house rule; Melvor, Ballad and Trimps keep story where it can be reread; today the strata crowd out the hero's own story, and the deepest live heroes reach the cap within weeks (027).
4. **P-027, reshaped** (Add, S, and the owner's writing). Fifteen lines, not nineteen: one at each Lord's first fall from 200 to 1,600, under its sprite on its card, said once and kept in the Chronicle (3); a second
   line when each returns from 1,700, then silence. About 7 words each, as Pelle's, in the Lords' voice, written or edited by the owner (Lowmoor's cost; P-020). For P-021: the Hollow King already falls as the Lord
   of stages 1,500 and 3,000.

**For earlier proposals:** P-030 (boss pets) gets Melvor's calibration, 1 in 150–350 clears with a few sure after 1 or 5, and Melvor's dry-streak posts: choose between OSRS's hours and Melvor's clears with P-014
(pity) in mind. P-040 gains Melvor's no-bonus event pets kept out of 100% and Kittens Game's starred, harder variants of goals ([Kittens](https://steamcommunity.com/stats/1097410/achievements/)). P-005 gains Cookie
Clicker's milk, which changes colour every 25 achievements with no power added: a look for each rung. P-044 gains AD's ×1.25 for a full row. P-108 gains the medals part (proposal 1).

## What does not carry over

- **Pets with a job** (Summoning's tablets, Krumblor's sacrifices, Tap Titans 2's egg ladder, IdleOn's pulls): Summoning-scale systems and gacha pets are deferred (README), and IdleOn's month at 26% is the warning.
  **A pat that drops things** would pay for clicking; **a pick that doubles one pet's bonus** stops mattering once all are owned, as in Tap Titans 2.
- **News tickers and 1,000-word books:** words in motion or in walls, against art before words; Melvor's players don't find theirs. **Celestials that bend the rules:** boss laws were declined (README).
- **Shares on each medal, today:** at 45 accounts one hero moves a share by 2.2 points, and guests aren't counted. **Time-played, date-bound, luck-only and ad-gated goals:** the genre's own complaints.

**For the queue:** medal shares from the server's saves (read-only, counts with no names, with the owner's OK) to find medals no one gets, as Steamworks suggests; how Melvor's players took Summoning (the archive
refused me); Bailey and Miyata's [study of Steam completion rates](https://doi.org/10.1016/j.entcom.2019.100299) and the 2026 book *Trophy Cases* (both unread); Melvor Idle 2's story chapters after 17 November.
