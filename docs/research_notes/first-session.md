# The first session: what a new player meets in the first minutes

The owner found the start dull and asked for an opening that is engaging and fun, "especially like Tap
Titans 2" (October 2026). This note has three parts: what the first minutes were, measured; what Tap
Titans 2 and other idle games do in theirs (a research pass, with its sources); and what Fantasy Idle
took from it (DESIGN §3.24 has the rules as built).

## 1. Measured: the first five minutes, before and after

`node tools/opening.mjs` plays a new player's first minutes three ways, over five seeds: one who never
touches the monster but takes what the screen offers (wears an upgrade, buys a camp level), one who
also strikes five times a second, and one who does nothing at all. Medians, in seconds:

| A player who only watches | before | after |
|---|---|---|
| first kill | 7.5 | 4.5 (and a sword) |
| first upgrade bought | 96 | 10.5 |
| first boss beaten | never (5 min) | 48 |
| first fall | 49 (then 25 s at the campfire, again and again) | 257 |
| best stage after five minutes | 8 | 30 |
| longest stretch with nothing new | 82 | 49 |
| places opened in five minutes | 2 | 8, one every 20–60 s |

A player who strikes beat the first boss at 16 s before and at 8 s now; before, ten places opened in
his first seventy seconds, five of them as the first boss appeared (their card covered its fight).

What the numbers came from: a new hero fought unarmed (5 attack) against monsters that wore him down
faster than he killed them; a combat level raised his maximum health but not his health (he reached
stage 11 at 25 of 205); attack was rounded down, so a first +5% (5 to 5.25) changed nothing, and with
no armour the Armour Rack raised 0; the camp opened at 50–60 gold; and nothing on screen said the
monster could be struck.

## 2. The research

### The research in brief

- **Tap Titans 2 (TT2) opens with no story.** There is a titan, and a stream of one-line goals of 10 to 20 taps, each paying gold.
- **The first minute is packed:** a kill, gold, an upgrade, a hero, doubled damage and a timed boss. Every stage ends in a boss.
- **Something new arrives every 4 to 6 stages up to 60:**
  - the pet rescue at stage 8;
  - the first active skill;
  - daily rewards at 40;
  - a skill point at 50;
  - prestige at 60, announced 15 stages ahead.
- **TT2's guidance is mostly text, which the house rules forbid.** What carries over is the structure: a counted micro-goal, a reward, a set piece, loot you tap in the world.
- **The other games start with one action and a purchase within seconds.** They show only the next step or two, and point with dots, glows and alerts on the object.
- **Industry sources agree:**
  - teach by doing;
  - give early wins, and never set the player back;
  - use multipliers that bump;
  - plan a 10 to 20 minute first session that ends with a reason to return.

### 2.1 Tap Titans 2: the first session, step by step

**Sources.**
- The game's own data is the best evidence. A community mirror of its tables includes the tutorial: [rawrzcookie/TT2_CSV](https://github.com/rawrzcookie/TT2_CSV), updated 29 Sep 2026.
- Also used: the [fandom wiki](https://tap-titans-2.fandom.com/wiki/FAQ), [Giant Bomb](https://www.giantbomb.com/tap-titans-2/3030-57373/) and [Pocket Gamer](https://www.pocketgamer.com/tap-titans-2/review/).
- Game Hive shipped a fuller new-player tutorial in v3.7, aiming to get more new players into tournaments and clans ([devlog](https://gamehive.com/blog/tt2-devlog-59-37-preview-2165/)).

**Launch and the first 30 seconds (facts).** No source mentions a story intro; the backstory lives on the [wiki](https://tap-titans-2.fandom.com/wiki/Sword_Master). The [tutorial table](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/TutorialEventInfo.csv) opens with three steps:
1. Tap the titan 10 times.
2. Learn that kills drop gold (20 taps).
3. Attack 10 times on a visible counter, for 20 gold.

A [variant](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/TutorialEventInfo_A.csv) teaches swiping with five times the counts. **Inference:** Game Hive A/B-tests even the first verb.

**First upgrades, in order (facts).**
1. Level the Sword Master once.
2. Hire the first hero for 30 gold. The next line promises that heroes earn gold while you are away.
3. Take the Sword Master to level 10 (+50 gold). That level doubles his damage. Further ×2 steps come at 30, 50, 70, 80, 90 and 100 ([data](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/PlayerImprovementsInfo.csv)).
4. Hire heroes 2, 3 and 4, each named with its price: 180, 800 and 4,000 gold ([data](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/HelperInfo.csv)).

Heroes gain ×2 to ×3 every 20 levels ([wiki](https://tap-titans-2.fandom.com/wiki/Heroes)). Hero 6 costs 22.4 million, a cliff after the tutorial's cheap ladder. Early on, taps are the main damage ([wiki](https://tap-titans-2.fandom.com/wiki/Sword_Master)).

**How it guides (facts, one gap).** The tutorial is a chain of 51 objectives, shown one at a time:
- Each is a short command, often with a live counter.
- Each pays gold, rising from 20 to about 10 billion.
- Every few steps a line of praise clears itself after 10 to 20 more taps, so the chain never stalls.

It is text, but never a modal window. I could not confirm whether a pointing finger is drawn.

Other guidance lives on the object:
- Equipment drops beside the hero and is tapped to collect ([wiki](https://tap-titans-2.fandom.com/wiki/Equipment)).
- Fairies fly across the screen.
- A clan's ship flies in when you join one ([wiki](https://tap-titans-2.fandom.com/wiki/Clans)).

The first Tap Titans did the opposite: it showed locked buttons to make players curious ([analysis](https://gameworldobserver.com/?p=380)).

**Stages and bosses (facts).** Every stage is a run of titans and then a timed boss, and later stages need more titans ([Giant Bomb](https://www.giantbomb.com/tap-titans-2/3030-57373/)). Fail the boss and you drop back to ordinary titans ([Pocket Gamer](https://www.pocketgamer.com/tap-titans-2/review/)), then retry from a Fight Boss button ([BlueStacks](https://www.bluestacks.com/blog/game-guides/tap-titans-2/tt2-beginner-guide-en.html)).

The timer's length is unconfirmed:
- Giant Bomb gives 90 s.
- An artifact adds up to 60 s ([wiki](https://tap-titans-2.fandom.com/wiki/Ward_of_the_Darkness)).
- The first Tap Titans used 30 s ([TouchArcade](https://toucharcade.com/2015/01/02/tap-titans-review-the-clicker-levels-up/)), with ten monsters per level ([analysis](https://wnhub.io/news/analytics/item-2100)).

So the base is probably 30 s. No source gives titans per stage or real time to stages 10, 50 and 100.

**Unlocks by stage (facts).**

| When | What opens or happens |
|---|---|
| Stage 8 | The boss is a cage (1.15K HP) holding the first pet, set as the tutorial's goal. It breaks, the hero leaps, the pet flies to him and circles, an egg hatches ([wiki](https://tap-titans-2.fandom.com/wiki/Nova)). From then on, every 20 taps make the pet strike with lightning; a new egg comes every 4 hours ([wiki](https://tap-titans-2.fandom.com/wiki/Pets)). The diamond shop opens ([wiki](https://tap-titans-2.fandom.com/wiki/Bear_Shop)). |
| Stages 12–25 | Reach-stage goals pay 600 to 10K gold and heroes 3 and 4 arrive (tutorial data). The clan icon appears at 25 ([wiki](https://tap-titans-2.fandom.com/wiki/Clans)). |
| Sword Master level 100 | First active skill, Heavenly Strike. A new spell follows every 50 levels ([data](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/ActiveSkillInfo.csv)). |
| Stages 30–40 | The tutorial points to the shop and to hero skills, and promises equipment at 36. Daily rewards open at 40, on a front-loaded 14-day new-player calendar: 10 equipment on day 2, 5 skill points on day 3, a full set on day 7 ([data](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/NewPlayerLoginRewardsInfo.csv)). |
| Stage 45 | Prestige at 60 is announced. |
| Stage 50 | First skill point ([wiki](https://tap-titans-2.fandom.com/wiki/Skill_Tree)); a milestone pays ×10 stage gold and equipment ([wiki](https://tap-titans-2.fandom.com/wiki/Milestones)). |
| Stage 60 | Prestige unlocks ([wiki](https://tap-titans-2.fandom.com/wiki/Sword_Master)). The tutorial ends: join a clan at 100, then prestige. The subreddit's guide (seen only as a search excerpt) advises a first prestige near 110, then about 100 stages past each previous run ([BlueStacks](https://www.bluestacks.com/blog/game-guides/tap-titans-2/tt2-tips-tricks-en.html)). |

**First-session rewards (facts).**
- Gold for every step.
- Fairy waves every two minutes, carrying gold or a free spell.
- A daily large fairy with a perk.
- For players under stage 5,000, a fairy that brings better gear ([wiki](https://tap-titans-2.fandom.com/wiki/Fairies)).
- Chest titans worth 10× gold, and ambush groups that count as 2 to 4 kills ([wiki](https://tap-titans-2.fandom.com/wiki/Game_Terminology)).
- 5-diamond achievements for 100 kills, 3 heroes, 10 crits or 1,000 taps ([data](https://github.com/rawrzcookie/TT2_CSV/blob/main/csv/AchievementInfo.csv)).

**Juice (facts, thin).** Sources list the pieces, not their tuning:
- damage that doubles at milestones;
- multi-kills marked ×3 and ambush kills +3;
- the rescue scene and the pet's lightning;
- loot on the ground;
- equipment that restyles the hero, with Aura and Slash slots among the five.

I found nothing on shake, crit styling or sound.

**Prestige (facts).** The tutorial warns about it 15 stages early, prestige opens at stage 60, and the tutorial ends by pointing at it. The wiki lists what you keep: pets, artifacts, skill points and equipment.

**Inference.**
- About a minute holds a kill, gold, an upgrade, a hero, a doubling and a boss.
- After that, something new comes every 4 to 6 stages.
- Tapping always matters: it is the main damage and it charges the pet.

### 2.2 Other games' openings

Each line is a fact from the linked page unless marked **Inference**.

**Clicker Heroes**
- **Hook:**
  - The first monster has 10 HP and drops 1 gold; the first hero costs 5 ([wiki](https://clickerheroes.fandom.com/wiki/Cid,_the_Helpful_Adventurer)).
  - **Inference:** that is about 5 kills.
- **Cadence:**
  - Zones are 10 kills, with a boss every 5th zone on a 30 s timer ([wiki](https://clickerheroes.fandom.com/wiki/Zones)).
  - Heroes cost 50, 250, 1K, 4K and so on ([wiki](https://clickerheroes.fandom.com/wiki/Heroes)).
  - At level 10 the first hero can buy a doubling of her click damage for 100 gold.
  - The guide advises ascending after zone 130 ([guide](https://clickerheroes.fandom.com/wiki/Newbie_Guide:_Pre-Transcendence)).
- **Guidance:**
  - Barely any: just click the monsters.
  - Locked skills name the hero that opens them ([patches](https://clickerheroes.fandom.com/wiki/Patch_History)).
  - Gold falls as coins that are collected on hover ([wiki](https://clickerheroes.fandom.com/wiki/Gold)).

**Cookie Clicker**
- **Hook:**
  - One big cookie, and the first click earns an achievement.
  - A Cursor costs 15 cookies, a Grandma 100 ([wiki](https://cookieclicker.wiki.gg/wiki/Building)).
- **Cadence:**
  - A building appears once lifetime cookies reach its price. At most two more show as "???" ([code](https://orteil.dashnet.org/cookieclicker/main.js)).
  - A golden cookie comes every 5 to 15 minutes ([wiki](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)).
  - Prestige needs a trillion cookies, which takes days.
- **Guidance:**
  - No tutorial at all.
  - Affordable items light up.
  - A news ticker narrates your rise.
  - Each click floats "+N", throws crumbs and plays a sound.

**AdVenture Capitalist**
- **Hook:** the first lemonade stand is free and the second costs about $4, so the first purchase comes within seconds ([Pecorella](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)).
- **Cadence:**
  - New businesses at $60, $720, $8,640 and up ([wiki](https://adventure-capitalist.fandom.com/wiki/Businesses)).
  - Speed doubles at 25 and 50 owned.
  - A $1,000 manager keeps a business running offline ([wiki](https://adventure-capitalist.fandom.com/wiki/Managers)).
  - The first reset comes after a day or two ([wiki](https://adventure-capitalist.fandom.com/wiki/Angel_Investors)).
- **Guidance:**
  - An advisor character runs a first-launch tutorial.
  - "New" dots clear once seen; before mid-2015 they stayed until you bought.
  - A business glows green when it unlocks something ([changelog](https://adventure-capitalist.fandom.com/wiki/Changelog)).
  - The developer's advice: let players play, and show where a system unlocks ([interview](https://web.archive.org/web/20250622062038/https://www.globalgamesforum.com/features/idle-game-design-lessons-from-developing-adventure-capitalist)).

**Egg, Inc.**
- **Hook:** one red button. Hold it and chickens run into the hen house ([wiki](https://egg-inc.fandom.com/wiki/Hatchery)).
- **Cadence:**
  - One challenge at a time, with a bar: hatch 200, research 30, earn $500/s ([wiki](https://egg-inc.fandom.com/wiki/Challenges)).
  - Drones fly by about every 23 s for you to tap.
  - Prestige opens with the first Soul Egg ([wiki](https://egg-inc.fandom.com/wiki/Prestige)).
- **Guidance:**
  - Edge alerts for a ready upgrade or a full hen house ([wiki](https://egg-inc.fandom.com/wiki/Alerts)).
  - Future buildings shown as construction sites.

**Melvor Idle**
- **Hook:**
  - Every skill is open from the start.
  - Since v1.0 (November 2021), a new character first lands on Tutorial Island. It takes 10 to 20 minutes and can be skipped ([notes](https://wiki.melvoridle.com/w/V1.0)).
- **Cadence:**
  - Eight tasks of about three actions each, all paying gold and most opening the skill they teach: cut, burn, fish, cook, mine, smith, equip, then fight two plants.
  - Combat stays off for the first six.
- **Guidance:**
  - A task page, and the next skill lit green in the sidebar ([issue](https://github.com/MelvorIdle/melvoridle.github.io/issues/3396)).
  - A level-up pop-up; fireworks only for big milestones.
  - No prestige.

**Idle Slayer**
- **Hook:** the hero runs by himself; you tap to jump for coins, and there are no enemies yet.
- **Cadence:**
  - The first purchase, a sword, costs 6 coins.
  - Enemies arrive at 1,000 coins ([wiki](https://idleslayer.fandom.com/wiki/Upgrades)).
  - Mystery boxes appear every 38 to 120 s ([wiki](https://idleslayer.fandom.com/wiki/Random_Box)).
  - Ascension needs 20 points ([wiki](https://idleslayer.fandom.com/wiki/Ascension)).
- **Guidance:**
  - No tutorial; quests instead.
  - Progress shows on the buy buttons.
  - Bulk-buy appears only after the first ascension ([updates](https://idleslayer.fandom.com/wiki/Update_History)).

**Legends of IdleOn**
- **Hook:** after creating a character, a power-fantasy tutorial ends with you knocked back to level 1 ([lore](https://idleon.wiki/wiki/Lore)).
- **Cadence:**
  - An NPC's quests: kill 5 spores, craft gloves ([wiki](https://idleon.wiki/wiki/Scripticus)).
  - Choose a class at level 10.
  - Start a second character, whose away gains you claim.
- **Guidance:**
  - "!" over quest NPCs.
  - A hint unlocks as you meet each feature ([wiki](https://idleon.wiki/wiki/Hints)).

**AFK Arena**
- **Hook:** stage 1-1 is an auto-battle with a fixed team. Early stages hand out heroes and diamonds, and the forced part ends at 1-4 ([wiki](https://afk-arena.fandom.com/wiki/Ranhorn_City_(Campaign))).
- **Cadence:**
  - New modes every few stages: forest 2-3, labyrinth 2-4, shop 2-8, tower 2-12, guild 2-20, arena 2-28.
  - The idle chest's picture changes at 10, 60, 360 and 600 minutes ([wiki](https://afk-arena.fandom.com/wiki/AFK_Rewards_Chest)).
- **Guidance:**
  - A building's tutorial runs when it unlocks.
  - Almost every early action pays something ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).

**Inference.** Only TT2 and Idle Slayer bring prestige into the first sessions.

### 2.3 What industry sources say

Most talks were read as slides or as reports of the talk.

- **Teach by doing.**
  - Celia Hodent ([write-up](https://celiahodent.com/gamers-brain-ux-onboarding/)):
    - Learning by doing works best.
    - Text shown while the player cannot act is lost; teach at the moment of use.
    - Don't punish early failure: Fortnite players who struggled in onboarding stayed less.
  - George Fan of Plants vs. Zombies ([report](https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan)):
    - Hide the tutorial inside play.
    - Teach with one action and its visible result.
    - Hint only to players who are struggling.
    - Keep on-screen text to about eight words.
  - Idle Miner Tycoon's studio cut churn with contextual nudges at the bottleneck ([case study](https://start.playtestcloud.com/case-studies/kolibri-games)).
- **Early wins, no backsliding.**
  - Idle games have no lose state and constant positive feedback ([Pecorella, GDC 2015](https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367)).
  - Setbacks go against the genre ([2016](https://www.slideshare.net/slideshow/the-rise-and-rise-of-idle-games-68916528/68916528)).
  - Tutorials should end in success ([GameAnalytics](https://www.gameanalytics.com/blog/tips-for-a-great-first-time-user-experience-ftue-in-f2p-games)).
- **Time to first reward.** Seconds, in AdVenture Capitalist. Most games lose 20% of installs within two minutes of first launch ([deltaDNA](https://www.gamedeveloper.com/business/how-first-session-length-impacts-game-performance)).
- **Unlock cadence.**
  - Pecorella ([GDC Europe 2016](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507), [GDC 2016](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260)):
    - Runs should start fast.
    - Multipliers give bumps, and bumpy curves beat smooth ones.
    - Players reset when a reset would pay +50% to +200%.
  - The AdVenture Capitalist developers warn that twelve mechanics in a first session make twelve weak experiences.
- **Text walls.**
  - Players skip instructions, and over-teaching with pop-ups is the commonest mistake ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog//2012/05/5-points-for-killer-first-time-flow.html)).
  - People take in about three new things at once (Hodent).
- **Juice.**
  - Cascades of response to a small input make even crude art feel finished ([Juice it or lose it](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-)).
  - Small hit effects add up: sound, flash, knockback, shake, a freeze of about 20 ms. Let players turn shake off ([Nijman](https://www.gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)).
  - Offline gains turn each return into a celebration (Pecorella).
- **First session and day 1.**
  - deltaDNA, across 275 games:
    - The mean first session was 9 minutes.
    - Games with longer first sessions kept 31% of players on day 1, against 20%. That is a correlation.
    - They advise 10 to 20 minutes, ending on a reason to return.
  - Idle sessions average about 8 minutes, 5.3 times a day ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game)).
  - Day-1 retention, mobile median: about 22% ([benchmarks](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)). Top-10% idle games: about 46%.
  - Wooga lifted day 1 by getting more players through the first-time flow, but an earlier game with a weak core could not be saved by onboarding ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2022/3/27/how-woogas-switchcraft-aced-the-soft-launch)).

### 2.4 Patterns to build

Timings are my suggestions; italics name the games behind each pattern. **Fit** checks the house rules, and some Fit notes compare with the current code (`src/core/formulas.js`, `src/data/camp.js`, `src/data/unlocks.js`).

1. **Open on the fight.** First hit within 3 s of Begin. *TT2, Cookie Clicker, Egg, Inc.* **Fit:** a hand taps the monster until the first hit, then never returns.
2. **One counted micro-goal at a time, each with a reward.** 5 to 15 s each for the first two minutes, then 30 to 60 s. *TT2's chain, Egg, Inc. challenges, Melvor's island.* **Fit:** adapt. Show it as pips filling on the target, not a sentence.
3. **First purchase within about 10 s, second within 30 s.** *AdVenture Capitalist, Clicker Heroes (5 gold), TT2 (30 gold).* **Fit:** the camp token lights up and bobs when affordable.
4. **Upgrades the player can feel.** A ×2 within the first minute, then one every 2 to 3 minutes. *TT2 at levels 10, 30 and 50; AdVenture Capitalist at 25 and 50 owned; Pecorella's bumps.* **Fit:** yes. **Inference:** the camp's +4 to 5% steps are not felt. A doubling at camp level 5, with a burst, would be.
5. **Each early buy adds someone to the scene.** A helper by minute 2, three or four by minute 5. *TT2 heroes, Egg, Inc. chickens, Cookie Clicker grandmas.* **Fit:** yes, each with an entrance.
6. **Taps are the star early.** For the first five minutes, tapping clearly beats the auto-attack. *TT2.* **Fit:** yes. **Inference:** half-damage taps work against this.
7. **A payoff every 15 to 25 taps.** *TT2's pet lightning every 20 taps.* **Fit:** the combo meter on the monster fills and discharges, with a sound.
8. **A boss within the first minute, then a steady rhythm of them.** Tune the first one to be won. *TT2 every stage, Clicker Heroes every 5 zones.* **Fit:** this is already what the stage-10 boss aims for.
9. **Soft failure, retry when the player likes.** *TT2's Fight Boss button; Pecorella on setbacks.* **Fit:** the boss's portrait glows when the hero is ready. **Inference:** a forced 60 s regroup is a setback in a first session.
10. **A scripted set piece at 2 to 4 minutes.** *TT2's caged pet at stage 8.* **Fit:** yes. A cage on the scene breaks under taps and a companion joins.
11. **Something small every 30 to 60 s; a new system every 3 to 5 minutes, never bunched.** Four to six systems in the first session. *TT2, AFK Arena, AdVenture Capitalist's twelve-mechanics warning.* **Fit:** yes, through `disclosure.js`. **Inference:** stage 10 opens five places at once, so spread them out.
12. **One new verb at a time.** The first active skill comes after the basics. *TT2's first spell at level 100, then one every 50 levels.* **Fit:** it appears on the dock, glowing, with its first cast free.
13. **Visitors to catch.** The first within 60 to 120 s, then every 2 to 3 minutes. *TT2 fairies, Idle Slayer boxes, Egg, Inc. drones, Cookie Clicker golden cookies.* **Fit:** yes; the motion does the pointing. **Inference:** a gilded monster at 1 in 150 kills is too rare for minute one.
14. **Loot lands in the world and is tapped to collect.** *TT2 equipment, Clicker Heroes coins.* **Fit:** yes.
15. **Hints only for players who need them.** A hand or glow appears only after a pause: say 5 s without a tap on the monster, or 10 s with an affordable upgrade left alone. *George Fan; the Idle Miner Tycoon nudges.* **Fit:** this is the house rule exactly.
16. **Small achievements early.** The first within 2 to 3 minutes. *TT2 (100 kills, 10 crits), Cookie Clicker's first click.* **Fit:** a toast with a sprite.
17. **Make the idle promise in minute one, and keep it on the first return.** *TT2's second goal, AdVenture Capitalist managers, Pecorella.* **Fit:** the welcome-back report pops its rewards as they land.
18. **Show the next step, never a greyed-out ladder.** *Cookie Clicker's "???", Egg, Inc.'s construction sites.* **Fit:** the game's own one-step-ahead rule.
19. **Foreshadow prestige, and open it when it clearly pays.** Show what a reset would pay about 5 minutes ahead, and open it at +50% or more. *TT2's 15-stage warning, AdVenture Capitalist, Pecorella.* **Fit:** the prestige button shows its payout.
20. **A login calendar that starts strong,** with day 2 visibly richer. *TT2's 14-day new-player calendar, AFK Arena's 7-day event.* **Fit:** the daily crate.
21. **Systems only after the loop is learned.** The skill tree, clans and events come after the first prestige. *TT2, Melvor's island, AFK Arena's stage gates.* **Fit:** yes.
22. **Juice in proportion.** A hit answers within 100 ms, crits look distinct, coins fly to the purse. Save the big effects for bosses, rescues and prestige. *Juice it or lose it, Nijman, Melvor.* **Fit:** already the game-feel rule.
23. **A 10 to 20 minute first session that ends high.** End on a set piece or the first prestige, with offline gains and a timer to come back for. *deltaDNA, GameAnalytics, TT2's 4-hour egg.* **Fit:** yes.

## 3. What Fantasy Idle took

By the patterns above (2.4), as built (DESIGN §3.24 has the details):

- **1, 15. Open on the fight; hint only those who need it.** Begin starts the fight. A white glove
  (`src/ui/guide.js`, drawn in `tools/resource_art.py`) points at the monster if it has not been struck
  within 3 s, until three strikes, giving up after 15 s for a player who would rather watch (it comes
  back for the first boss). The same hand, on the thing itself and without words, points at the
  sword's Equip, at a camp upgrade left untouched for 4 s, at the boss's skull while the hero regroups,
  and at the first vein on the Mining tab.
- **3. First purchase within seconds.** The first monster leaves a Rusty Sword (wearing it doubles a new
  hero's attack); the camp's first levels cost 20 and 15 gold; attack is rounded, not cut, so a +5% shows.
- **6, 22. Taps are the star; juice in proportion.** A strike swings the hero and flashes a light slash,
  with a bigger number; the big effects stay with bosses and rare finds.
- **8. A boss within the first minute, tuned to be won.** The first stages are eased (monsters hit at 30%
  and have 60% of their health at stage 1, full from stage 30, still paying full gold), levels come
  three times as fast at first and each one restores the hero's health. The first boss falls at about
  50 s to a hero the player only watched, and leaves a piece of armour the hero is seen to wear.
- **9. Retry when the player chooses.** After a boss holds out, its skull on the stage path pulses (it
  was always a button: a tap fights it again at once), and the hand points at it.
- **11, 21. Never bunched.** No place opens as the first boss appears; the Shop and the Hall open when
  it falls, then Alchemy (15), Events (18), Dungeons (20), the Clan (25, on its own), Prestige (30) and
  Agility (35). Celebration cards wait while a boss fight is on screen.
- **13. A visitor early.** A new hero meets his first gilded monster at stage 7 (one in 150 kills is too
  rare for the first minutes).
- **16, 17, 18.** Already so: the first medals come with the first boss; the title card promises the
  hero keeps fighting while the player is away, and the welcome-back report keeps the promise; ladders
  show their next rung only.

Left for later, each worth a look: **2** (one counted micro-goal at a time: it would have to be pips on
the target, not a sentence, by the house rules), **4** (felt upgrades: a doubling at camp milestones,
which would need the camp rebalanced), **5** (each early purchase adding someone to the scene), **7** (a
payoff every 15–25 strikes, the combo ring discharging), **10** (a set piece at minutes 2–4, such as a
caged companion freed from a boss: it would need its own art and a pet that does not cut short the
real pets' hunt), **13** (visitors every few minutes, not only the first) and **20** (a daily crate
calendar richer in the first days).
