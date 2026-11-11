# 017: Loot quality of life and automation (read 11 November 2026)

Read by four subagents from developers' pages and patch notes, GGG's filter ladder, mod.io (through the requests its own site makes), GitHub,
Steam's community review pages and wikis; the Melvor, NGU, IdleOn, Milky Way, Realm Grinder and Idle Champions wikis are player-edited, so their
figures are unverified. Reddit was read through the Arctic Shift archive. I re-checked the filter ladder, Diablo 4's filter, Last Epoch's rule cap,
Melvor Idle 2's store page, Idle Clans' combat loadouts, the mod.io counts and the Reddit quote. Then held against the code in this round's worktree
(f6d4074) and measured on a scratch copy of the simulator with counters added; nothing in the repository changed. No page held instructions for an AI.

**In short:** elsewhere, filters tighten as the player goes, loadouts come late and pay only where content wants other gear, and automation is
earned by doing, then modded or sold where a game won't give it. Fantasy Idle already gives free the loot, eat and salvage automation Melvor's players
script for. Two things measured here are off. Past about stage 700 the Equip card credits armour with stages it doesn't give (a legendary plate: +19
said, 0 got), and the dock offers that plate before a sword. And unless swept by hand the bag is full from hour 10 to 39 on, while about six kinds of
upgrade wait at each return, one tap apiece.

## What other games do

**Loot filters tighten as the player goes.**
- **Path of Exile:** NeverSink's filter has seven levels, which its author ties to progress: Regular or Semi-Strict in a new league, Strict for the endgame, Very Strict once geared, Uber for speed farming ([forum](https://www.pathofexile.com/forum/view-thread/1246208)).
  GGG's ladder counts followers, not players: Regular 1,030,503, Semi-Strict 745,247, Strict 717,784, Very Strict 624,754, Uber 523,460, Uber-Plus 412,303 ([ladder](https://www.pathofexile.com/item-filter/ladder/follower)).
  Path of Exile 2 opened in December 2024 without NeverSink's filter, though its director had hoped new players would need none ([Maxroll](https://maxroll.gg/poe/news/pax-west-path-of-exile-2-interview-with-jonathan-rogers)); NeverSink's first came two days later ([GitHub](https://github.com/NeverSinkDev/NeverSink-Filter-for-PoE2)).
- **Last Epoch** built one in (October 2020), with 75 rules by 2021 and 200 since March 2026 ([forum](https://forum.lastepoch.com/t/loot-filters-in-last-epoch/24302), [notes](https://forum.lastepoch.com/t/last-epoch-shattered-omens-patch-notes/80571)); 17 of its 596 newest English reviews name it, all as a strength ([Steam](https://steamcommunity.com/app/899770/reviews/)).
- **Diablo 4** first answered clutter with fewer, better drops (May 2024, [Kotaku](https://kotaku.com/diablo-4-loot-reborn-season-4-release-date-patch-notes-1851449174)), then gave everyone a filter with 3.0.0 in late April 2026: 1 to 25 rules, ten conditions, gear only ([Blizzard](https://news.blizzard.com/en-us/article/24267729/)).
  The top ask since: salvage hidden items by themselves (582 points, [Reddit](https://www.reddit.com/r/diablo4/comments/1tuwvja/)).

**Banks and bags in idle games.**
- **Melvor** (wiki): 20 bank slots at the start (12 until November 2023), each bought one dearer, up to 5M gold ([Bank](https://wiki.melvoridle.com/w/Bank)); tabs add no room; combat loot waits in a container of 100;
  auto-loot comes from a 4.55% amulet drop, though the developer called looting the most suggested change ever ([V1.0](https://wiki.melvoridle.com/w/V1.0)).
  Early posts are about room and gold ([51 points](https://www.reddit.com/r/MelvorIdle/comments/q3xl0e/)), late ones about sets and presets ([60 points](https://www.reddit.com/r/MelvorIdle/comments/j61cys/)).
- **Melvor's mods** ([mod.io](https://mod.io/g/melvoridle): 846 mods, 4.69M subscriptions): SEMI Core 208,901 (the base of SEMI's automation mods), SEMI Auto Farming 160,816, Unlimited Offline 151,098,
  SEMI Drop Chances 143,692, Show Item Sources And Uses 127,469, SEMI Auto Master 123,802, Speedup 120,292, ETA 117,729, SEMI Auto Loot 116,842. As the subagent sorted the top 40, automation leads by
  subscribers (12 mods, a third) and readouts by downloads; bank tools are few (Undo Sell 29,579, AutoSort 26,345). The developer is fine with mods while the game is single-player ([AMA, 2020](https://www.reddit.com/r/MelvorIdle/comments/jn2gbl/_/gb2q6eb/)).
- **Melvor Idle 2** (17 November) promises placeholders, item tags, named tabs and sets, equipping from combat and hourly rates ([Steam](https://store.steampowered.com/app/3218350/)).
  Demo players (unverified) report auto-eat and auto-loot from the start, and asked for stat comparison in the bank ([97 points](https://www.reddit.com/r/MelvorIdle/comments/1xc0k52/)) and a buy-back after selling 95 amulets by mistake ([Steam](https://steamcommunity.com/app/3218350/discussions/0/574931289648584343/)).
- **Others:** IdleOn sells auto-loot in a $4.99 pack ([wiki](https://idleon.wiki/wiki/Gem_Shop)), and some players bought nothing else (114 points, [Reddit](https://www.reddit.com/r/idleon/comments/1kt9izg/)). Idle Clans added a task queue in October 2026 ([notes](https://www.reddit.com/r/idleclans/comments/1xanhpr/)).
  Milky Way Idle forbids automation that plays ([rules](https://www.milkywayidle.com/game_rules)) and sells queue and loadout slots ([wiki](https://milkywayidle.wiki.gg/wiki/Cowbell_Store)).

**Loadouts come late, earned or bought, and are used where a swap pays.** NGU's from May 2018, 10 slots, 7 bought with AP ([wiki](https://ngu-idle.fandom.com/wiki/Inventory)); Melvor's sets from February 2020,
8 at most, 30M gold to swap inside a dungeon ([wiki](https://wiki.melvoridle.com/w/Extra_Equipment_Set)); Diablo 4's Armory 19 months after launch, 5 a character ([Blizzard](https://news.blizzard.com/en-us/article/24162193/the-2-1-ptr-what-you-need-to-know));
World of Warcraft's in 2009, after addons such as Outfitter (4.37M downloads, [CurseForge](https://www.curseforge.com/wow/addons/outfitter)). Old School RuneScape has no gear loadouts of its own, and RuneLite's Inventory Setups
shows 238,910 installs ([plugin hub](https://runelite.net/plugin-hub/)). Idle Clans puts up to 50 combat loadouts on by enemy, by itself only with a $3.99 token ([update](https://www.incrementaldb.com/update/89c7b8fa-e5dd-4917-8dea-a3490688936a));
Milky Way's guild trials fight with a saved loadout ([wiki](https://milkywayidle.wiki.gg/wiki/Guilds)). Where one build does everything, players skip them: a Diablo 4 thread on ignoring the Armory drew
174 points and 316 comments ([Reddit](https://www.reddit.com/r/diablo4/comments/1ipjklk/)).

**Showing an upgrade.** Diablo 4's first arrows went by item power alone and were attacked for it ([forum](https://us.forums.blizzard.com/en/d4/t/greenred-arrows-on-items-ruin-decision-making/14189)); players
say its Toughness figure (December 2025) doesn't tell what it is enough for ([Icy Veins](https://wp-prod.icy-veins.com/?p=106561)); RAID's Auto-Equip is "not recommended for endgame", by its own maker
([Plarium](https://forum.plarium.com/raid-shadow-legends/843_news/43671_update-highlights-11-50-0/)). Path of Exile gives no verdict, and Path of Building has about 6.1M release downloads
([GitHub](https://github.com/PathOfBuildingCommunity/PathOfBuilding)). One number in the player's own unit is worth having, while it follows what the content tests.

**Automation is earned by doing, then gets out of the way.**
- **Antimatter Dimensions:** the autobuyers are won from challenges, the reset ones after 16 Infinities and 100 Eternities, a scripting Automator in Reality; the shop sells none ([source](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/secret-formula/challenges/normal-challenges.js)).
  **Trimps:** all earned in play. Players wrote AutoTrimps in 2016 ([Reddit](https://www.reddit.com/r/Trimps/comments/46y2ok/)); the game built its parts in over 2017–2019, AutoEquip at zone 350
  ([updates](https://github.com/Trimps/Trimps.github.io/blob/master/updates.html)), and its Steam build loads the script ([developer](https://www.reddit.com/r/Trimps/comments/u3mzw0/comment/i4qj092/)).
- **Bought in play:** Melvor's Auto Eat at 1M, 5M and 20M gold, Auto Slayer 150,000 coins ([wiki](https://wiki.melvoridle.com/w/Shop)). **Earned and sold:** Unnamed Space Idle's AI points come from achievements and for money
  ([App Store](https://apps.apple.com/us/app/unnamed-space-idle/id6483933995)); its developer keeps moving automation into the free game (2025, 2026) and since July 2026 holds it back until onboarding
  ends ([news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2471100)).
- **Players:** "I like when you do it manually for a while, then unlock automation" (top comment, 37 points, [Reddit](https://www.reddit.com/r/incremental_games/comments/1rqz87n/)). A study of 66 idle games
  recommends queues ([CHI 2018](https://par.nsf.gov/servlets/purl/10061230)); Fizek, after Žižek, separates a machine that takes a chore from one that takes the enjoyment ([ToDiGRA, 2018](https://todigra.org/index.php/todigra/article/view/1754)).
  Against: one player deletes a game once it has run a week untouched ([Reddit](https://www.reddit.com/r/incremental_games/comments/1sgwho8/comment/of9rg2j/)). No retention figure for automation was found.

## Fantasy Idle today (from the code)

- **Automatic:** drops go to the bag; auto-eat from the start (`core/state.js:84`); potions drink themselves (`systems/potions.js`); auto-salvage, Common by default (`core/state.js:152`), shown after
  10 drops (`systems/disclosure.js:59`); a dungeon goes on unless told (`systems/dungeon.js:183`); the Titan and clan fights hand back the work (`systems/resume.js`); one tap harvests and replants;
  Auto prestige after 5 prestiges or two days.
- **By hand:** the camp (parked), each Equip (the dock offers one piece, `ui/render.js:687`), Titan attempts, clan attacks, switching skills. No queue, stop condition or loadout; slot levels make a
  swap free but for the taps (`data/workshop.js:35`).
- **The bag:** 40 slots, +5 up to twelve times, sorted by score (`ui/render.js:1423`). Sell, Salvage and a stack's All act at once, with no undo (`main.js:1627-1666`). The dock and the ▲ judge by
  attack plus defence (`systems/inventory.js:78-135`); "+N stages" (`gainStages`) is the larger of an attack term and a defence-and-health term.

## Measured on the scratch copy

**The Equip card at depth.** The simulator's hero saved as he first reached each mark (seed 1). "Says" is the card's sum for one change; "gives" is the best stage of a fresh run with it, against the
run as worn (two seeds, `tools/gearbench.mjs`'s loop with frontier pieces added). Bosses every ten stages round a gain to tens. No run at 700 or 1,000 had a death.

| Saved at | A blow at the next stage | Legendary plate: says / gives | Legendary sword | All six armour pieces |
|---|---|---|---|---|
| 300 | 84% of his health | +10 / +5 to +6 | +7 / +3 to +4 | +23 / +15 to +16 |
| 700 | 6% | +14 / **0** | +23 / +30 | +38 / +10 |
| 1,000 | 4.5% | +19 / **0** | +15 / +20 | +48 / +10 |

- At 300 the card is right in sign and order: blows still kill there. From about 700 his defence is 13 to 21 times what the 90% cap can use and he no longer dies, so only attack moves the wall; the
  six pieces' +10 is their gloves' and boots' attack. This round's 015 finds the same at stages 1,300 to 2,300: no deaths, a boss's blow 0.04 to 3.2% of health.
- With a legendary plate and a rare sword in the bag, the dock offers the plate first at all three marks: `findUpgrade` ranks by raw score, where a plate's defence outweighs a sword's attack.
  8 of the 15 active players stand past stage 1,000.

**The bag.** Counters on `addItem`; the always-on bot to stage 1,000 (seed 1, about 165 hours) and the bot that visits three times a day with Auto (seeds 1 and 2, 150 hours). Neither buys room.

| | Always on | Three visits a day |
|---|---|---|
| Bag first full | 10.5 h | 38.7–39.1 h |
| Drops that met a full bag | 79% of 6,649 | 79–80% of about 6,100 |
| Taken as they landed (the Common default) | 18% | 19% |
| Rare or better pushed out by the full bag | 2,918, 20 of them Mythic | 2,532–2,550 |
| At the end | 40/40, 32 weaker than worn | 40/40, 35 weaker |

- Nothing is lost: each piece pushed out pays its essence and bars, and an upgrade of each kind stays. But the bag reads 40/40 of pieces he won't wear, and the log names each rare or better one,
  about 20 an hour.
- With Weaker from the start (always on, seed 1), 6% of drops met a full bag, yet it still ended 40/40 with 32 weaker: Weaker judges a piece only as it lands, so yesterday's upgrades go stale in the
  bag, and jewellery made while training Crafting skips it (2,432 of 2,478 pieces went the moment they were made, the bag being full).
- At 18 of 19 returns the visiting bot found upgrades waiting for 6.3–6.4 of the ten kinds (median 6–7), the sword among them 11–13 times. Equipping them as they land (a switch tried on the copy)
  led by 8–27 stages on days 1–3 (at 24 hours 67 against 40, 70 against 60) and by nothing from day 4 (at 150 hours 280 against 300, 307 against 300).

## Held against Fantasy Idle

| Elsewhere | Fantasy Idle today | Verdict |
|---|---|---|
| Filters tighten as players go (NeverSink's levels; Diablo 4's top ask) | Common by default; Weaker judges a drop only as it lands | Gap: Weaker that stays |
| Rule editors (Last Epoch 200 rules, Diablo 4 25); bank tabs and search | One rule; 40–100 pieces sorted by score | Doesn't carry over |
| One number in the player's unit; item-power arrows attacked | "+N stages": right at 300, wrong for armour past about 700 | Gap: the Equip card |
| Loadouts (Melvor 8, NGU 10, Diablo 4 5) | One set; a swap costs only taps | Not needed on the ladder; Trials unmeasured |
| Several pieces on at once (sets, Idle Clans' token) | One Equip per piece; about six kinds wait at a return | Gap: Equip all |
| Undo Sell (29,579 subscribers); the sequel's buy-back ask | No undo | Small gap: Undo |
| Auto-loot as a rare drop (Melvor) or for $4.99 (IdleOn) | Every drop goes to the bag | Covered, free |
| Automation earned by doing (Antimatter Dimensions, Trimps) | Auto prestige earned; the rest from the start | Aligned |
| A work queue (Idle Clans, the sequel's demo) | None | The owner's call |

## Proposals from this file

1. **The Equip card counts the wall that binds** (Change, S–M; new). Count defence only below the 90% cap (`enemyDamage`), and health only while a blow at the best stage still threatens (say a
   boss's blow over a tenth of his health: 260% at 300, 8% at 700); otherwise attack alone. Rank the dock's pick and the ▲ by the same figure, worked out only for the few pieces that beat their
   slot, since the bag redraws often (012). Why: the table above, for 8 of 15 active players; elsewhere a number that ignores what the content tests is the one players stop trusting. It stays
   right if P-023 brings survival back deep. Test it under Trials too: in Glass Hero health is worth nothing.
2. **Equip all** (Add, S; new): once two pieces wait, one tap in the dock and the bag puts on the best for every slot, each with its rise over the hero as now. Why: about six kinds wait at nearly every
   return, and sets, auto-equip tokens and the sequel's equipping from combat all answer that chore. It adds nothing a player can't tap today and keeps the moment of putting a legendary on, which
   the owner asked to be felt (§3.29); an automatic switch would take it, and measured it only speeds the paced days 1–3. Build after 1.
3. **Weaker that stays** (Change, S; new): with Weaker on, an Equip also takes what it made weaker (never a lock or a Seal copy), as Salvage weaker does; the pill glows once the bag first fills;
   the log gathers automatic salvage into a line a minute. Why: the bag fills by hour 10 to 39 and stays full unless swept by hand, Weaker alone still leaves it full, and filters elsewhere
   tighten as the player goes. Build after 1, or plates that do nothing stay as upgrades. A piece kept for a Trial needs a lock, as today.
4. **Undo the last sale or salvage** (Add, S; new): a few seconds' Undo on the toast after Sell, Salvage, Salvage weaker or a stack's All. Why: Melvor's Undo Sell has 29,579 subscribers and the
   sequel's players asked for a buy-back; here all four act at once.

- **Evidence for existing proposals:** P-002 (rates): ETA, 117,729 subscribers and 924,801 downloads; the sequel builds hourly rates in. P-022 (where the power comes from): Show Skill Modifiers,
  55,605 and 605,315; Show Item Sources And Uses, 127,469. 010 and P-057: five of the games read here sell automation or the currency that buys it (IdleOn, Idle Clans, Milky Way, NGU, Unnamed Space Idle).
- **The owner's calls, not proposed:** a work queue or stop condition (brew 200 doses, then fight) has broad support, but potions carry the deep climb (013), so it would make an absent hero's runs
  stronger: the Quartermaster's objection. A second set for Trials: one set is enough on the ladder; Glass Hero (dodge, capped at 60%), Fasting (lifesteal, 30%) and Brutes (defence and health)
  might want another, and a lock already keeps one. Measure first.
- **What doesn't carry over:** rule editors (no ground loot, tens of drops an hour, and Weaker says the one rule that matters); bank tabs and search (Melvor needs them for thousands of items; the bag
  holds 100 at most); scripting automators (a run has few decisions, and Auto prestige takes the reset); selling automation (it would sell what is free today; the evidence goes to 010).

**For the queue:** a dodge set in Glass Hero and a lifesteal set in Fasting, measured with `tools/trials.mjs`; deep drops, where 40 of the drop table's 100 weights (shield, helm, plate, greaves)
carry no attack and a Lord's Mythic due and the bosses' due go to the slot that lags by score, so most sure pieces deep are armour that moves nothing (with 013's defence past its cap); Melvor Idle 2's
bank, loadouts and automation at its launch (the dated item); convenience sales for 010's options.
