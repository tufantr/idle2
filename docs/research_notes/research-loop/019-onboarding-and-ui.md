# 019: Onboarding and readability (read 11 November 2026)

Read: Steam's achievement pages and the 420 most helpful English reviews of nine idle games (steamcommunity.com; `appreviews` still
redirects), store data, four r/MelvorIdle threads on Melvor Idle 2's demo (via [Arctic Shift](https://arctic-shift.photon-reddit.com/),
as Reddit can't be fetched), Apple's, NN/g's and the W3C's guidance, two games' number code, and Fantasy Idle's code. Measured:
`node tools/opening.mjs 60 3`, and a new visitor's first 5.5 minutes in Chromium at 1280 and 390 px on a host that isn't local, so the
sign-in shows as live. `tools/shots.mjs` has no output option and writes into the worktree, so a script like it ran from a temporary
folder (deleted), counting what is on screen. The search budget ran out partway; no study on number names or on motion per screen was
read. Steam doesn't say whose share an achievement percentage is (owners or players who launched; unverified); first achievements at
97–99.5% suggest the latter. No text aimed at an AI reader was seen.

## 1. First sessions, by Steam's achievement shares

| Game (price, Steam release) | How it starts | Early goals: share of players | Later |
|---|---|---|---|
| [Nodebuster](https://steamcommunity.com/stats/3107330/achievements) ($2.99, Aug 2024) | Runs of breaking nodes, then an upgrade tree ([store](https://store.steampowered.com/app/3107330)) | First run 99.4%; Milestones 89.8%; 50 runs 84.8% | Its last, hidden one 75.4%; done in about four hours ([review](https://steamcommunity.com/id/mythraxus/recommended/3107330/)) |
| [Gnorp Apologue](https://steamcommunity.com/stats/1473350/achievements) ($6.99, Dec 2023) | Strike a rock for shards; gnorps fetch them ([store](https://store.steampowered.com/app/1473350)) | First gnorp 97.3%; first prestige 92.8%; first compression 92.5%, 41.4% within five minutes | Finale 39.2% |
| [Cauldron](https://steamcommunity.com/stats/2619650/achievements) ($14.99, May 2025) | Brew, then minigames feed a turn-based party ([store](https://store.steampowered.com/app/2619650)) | First brew 99.5%; first apple, rock, fish 94.0–94.7%; autobattle 76.0% | Every hero 69.0%; Standard mode 31.1% |
| [Magic Research 2](https://steamcommunity.com/stats/2864890/achievements) ($5.99, May 2024) | A wizard's runs, mostly text ([store](https://store.steampowered.com/app/2864890)) | Exploration 84.7%; first retirement (its prestige) 65.6% | An ending 18.5% |
| [Unnamed Space Idle](https://steamcommunity.com/stats/2471100/achievements) (free, Jul 2023) | A ship against waves; systems unfold ([store](https://store.steampowered.com/app/2471100)) | 100 kills 83.1%; sector 5 57.1% | Sector 18 35.3% |
| [Melvor Idle](https://steamcommunity.com/stats/1267910/achievements) ($9.99, Nov 2021) | Every skill open; a skippable island of 10–20 minutes (`first-session.md`) | A character 98.2%; first level-up 82.5% | First pet 61.5%; first 99 46.1% |
| [Scapewatch](https://steamcommunity.com/stats/4671380/achievements) ($14.99, Sep 2026) | Queued tasks drawn at random; 30 skills (006) | Welcome 98.1%; first item equipped 84.3%; first quest 65.9% | Total level 500 46.0% |
| [Idle Clans](https://steamcommunity.com/stats/2103530/achievements) (free, Apr 2023) | A tutorial, then skills and clans ([store](https://store.steampowered.com/app/2103530)) | Tutorial 90.6%; first level-up 80.7% | Joined a clan 31.7% |

- **Left out:** [Milky Way Idle](https://steamcommunity.com/stats/3224420/achievements) (25.6% at its first milk, 23.2% at its tutorial:
  a base unlike the rest, unexplained). Melvor Idle 2's demo (19 October; 50,000+ downloads, 7,200 at peak, 002): demos have no
  achievements. Lowbar Legends, a free strip over the Windows taskbar, opens 13 November; Steam's search showed no demo on 11 November
  ([store](https://store.steampowered.com/app/5011370)). Ensis IDLE, browser-only: slow resets before automation, hidden unlocks (006).
- **What the shares say (inference):** games that open on one picture and one verb keep 89–95% to their first real goal, Gnorp 93%
  to its first prestige. The two RuneScape-likes lose 14–16 points before a first level-up or a first equipped item, minutes in
  (timing unverified). Magic Research 2 loses 19 points between its first unlock and its first prestige.

## 2. What players say about the first hour

- **The sample:** 40 reviews a game (Unnamed Space Idle 100; Steam's cursor gave no more), median 129 hours played, 25 under two hours.
  Keyword matches (rough): a wiki or guide 16, a slow start 11, lost 10, overwhelm 8, a tutorial 4, tooltips 2, notation 1.
- **The 25 under two hours:** 16 are about money (Scapewatch's paid offline time, 8 of 9; Idle Clans' premium, 6 of 7; Milky Way Idle,
  2). One refunded Melvor for no music, no sound and little art ([0.5 h](https://steamcommunity.com/profiles/76561197970765250/recommended/1267910/)).
  None names a tutorial. Those who stayed rarely write about their first hour; the table measures it better.
- **Hard start, then hooked:** "Overwhelming at first... but give it a few hours" ([Scapewatch, 614 h](https://steamcommunity.com/profiles/76561198044019685/recommended/4671380/));
  a term unexplained even after its tutorials ([208 h](https://steamcommunity.com/profiles/76561198151352147/recommended/4671380/)); an
  unrewarding start that pays after hours ([Unnamed Space Idle, 3,166 h](https://steamcommunity.com/id/Anti8871/recommended/2471100/)).
- **Praised:** new layers once the old feel easy ([USI, 4,280 h](https://steamcommunity.com/id/RatherGaming/recommended/2471100/)); a stats
  screen showing which option goes unused ([USI, 774 h](https://steamcommunity.com/id/RedMinjo/recommended/2471100/)). **Sent to guides:**
  Magic Research 2's late hints ([23.6 h](https://steamcommunity.com/profiles/76561198039808402/recommended/2864890/)); Melvor, hard to
  play without the wiki it links ([3,214 h](https://steamcommunity.com/profiles/76561198135231659/recommended/1267910/)); Idle Clans,
  much unexplained ([1,873 h](https://steamcommunity.com/profiles/76561198012328047/recommended/2103530/)).
- **Melvor Idle 2's demo:** one player couldn't find combat in a sidebar that lists even locked skills with their requirements
  ([thread](https://www.reddit.com/r/MelvorIdle/comments/1xj4dva/)); one wanted combat, bank and quests out of the top bar's small icons
  ([thread](https://www.reddit.com/r/MelvorIdle/comments/1xbm7hl/)); one praised each skill's time and average gains
  ([thread](https://www.reddit.com/r/MelvorIdle/comments/1xjcok0/), behind P-002 already).

## 3. Readability

- **Guidance:** tooltips come from hovering, so touch screens normally lack them ([NN/g](https://www.nngroup.com/articles/tooltip-guidelines/)).
  iOS text is 17 pt by default and 11 pt at least; macOS 13 and 10 ([Apple](https://developer.apple.com/design/human-interface-guidelines/typography)).
  Text needs 4.5:1 contrast, large text 3:1 ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)); motion that
  starts itself and lasts over five seconds needs a way to stop it ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- **Players:** Gnorp's interface is praised as clean and tangible, its tooltips for stirring curiosity ([13 h](https://steamcommunity.com/id/ballisticannon/recommended/1473350/));
  Magic Research 2's is called one of the worse ([40.5 h](https://steamcommunity.com/id/9zmuuh58yfuhep/recommended/2864890/)); Idle Clans
  is faulted for a phone-only layout ([3.6 h](https://steamcommunity.com/id/koekienator/recommended/2103530/)); Scapewatch added a 50–150%
  HUD size in its first month (006).
- **Fantasy Idle, measured** (the browser runs, fight screen, first 5.5 minutes):
  - 38–104 words on screen at 1280 px, 38–88 at 390 px (up to 167 under a card); 19–37 numbers; 7–26 controls as pieces open.
  - **Small text on phones:** 34–63% of the words under 12 px (41% at 40 s); 12 of 64 under Apple's 11 pt: the stage path's numbers
    at 8.8 px (`style.css:1658`) and the monster's attack, time between blows and gold at 10.6 px. Desktop: 3 of 77 under 11 px.
  - **Hover-only meaning:** the monster's three numbers name themselves only in a `title` (`src/ui/scene.js:573-577`), and a tap opens a
    title on 15 kinds of element only (`src/main.js:383`). Of 134 `title` tips in `render.js`, `scene.js` and `worldmap.js`, 13 open with
    a tap; 121 never show on a phone: 50 on buttons or links, where a tap acts, and about 70 elsewhere, the Gold and Essence chips,
    the Focus pill and the hero's crit, attack time and dodge among them (static count).
  - **Contrast** on flat panels passes: muted text 6.6:1, main 14.6:1 on `--panel` (`style.css:8-17`); over paintings, unmeasured.
  - **Motion:** 24–36 things move at rest, 17–18 of them fireflies or motes; 40–73 when a card arrives. Reduced motion, the game's or
    the system's, stops all of it (`style.css:1081-1082`).

## 4. Fantasy Idle's first hour, measured

**Before the first blow.** `index.html` is an empty shell; the script shows a title card: the hero, a slime, a 14-word line, an
optional name and Begin (`src/ui/render.js:2915-2938`). Off a local host, Begin opens "Make your account": 32 words, three fields,
Register, Log in instead, and Play as guest third (`src/main.js:135-136,1905-1911`, `src/ui/render.js:2941-2981`). A guest fights after
two clicks, an account after three fields and an emailed six-digit code. A framed page skips the form (`src/main.js:140`); a visitor
back without having chosen meets it first (`src/main.js:262`). That is 46 words of prose before the first blow; George Fan advised
about eight on screen (`first-session.md`).

| Time | Takes every offer (simulated watcher, median of 3) | Presses only where the hand points (browser, one run) | Never clicks (simulated; browser to 5.5 min) |
|---|---|---|---|
| 0:03 | The fight fills the screen; a hand on the monster after 3 s | Same | Same |
| 0:05 | First kill drops a Rusty Sword; Equip; camp at 0:10 | Same, the hand on each | The sword stays in the bag, the hand on Equip |
| 0:48 | First boss falls, a medal, the second land | Before 1:00 | 1:28 |
| 1:30 | Hunting opens | Hunting | Hunting |
| 4:30 | Prestige at stage 23; the hand points through it and at a first perk | Has fallen to the stage-20 boss with 658–679 gold unspent and better armour waiting; Dungeons opens | Alchemy |
| 8:30–30 | Dungeons 8:30, Alchemy 13:30, second prestige 15:50, Shop 20:30, Clan 30:30 | (not run) | Shop 8:30, Dungeons 14:45 |
| 60:00 | Stage 70, 14 falls, the Hall at 57:32; at most 168 s without anything new | (not run) | Stage 20, 21 falls; at most 147 s |

One who strikes five times a second reaches stage 85; the tool's skiller (mine, smelt, hunt, cook) opens only Smithing and
Woodcutting and stays at stage 1, as Hunting waits for stage 5. Every pacing check passed (at most 3 places in ten minutes).

**Where it may lose them:** (1) the form, before anything moves (018's top comment; P-065). (2) The stage-20 boss, for one who waits
to be shown: the hand points at the first piece and the first camp level only (`src/systems/guide.js:57-66`), and Prestige needs that
boss beaten (`src/data/unlocks.js:44`); in Scapewatch one player in seven never equips a first item. (3) A watcher who never clicks:
a wall at stage 20 and 21 falls in the first hour. (4) On a phone, the 8.8 px stage numbers and a monster line explained only on hover.

## 5. Number notation

- **Fantasy Idle:** digits with commas to 999,999, then three figures and a letter: M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc (10^33), UDc,
  DDc … NoNog (10^300), Ce, UCe (`src/ui/format.js:3-21`). No switch: `settings.numberFormat` is read nowhere (`src/core/state.js:152`).
  Tiles say 1.2K–999K where the rest says digits (`src/ui/render.js:1321-1325`).
- **At depth** (`enemyForStage`, `src/core/formulas.js:229`, evaluated): a monster has 1.01Oc health at stage 1,000; 882DDc health and
  179Dc attack at 2,000; 3.30QiDc and 79.7DDc at 2,440, the best live depth (P-024); 294DQig at 10,000. Ranking 882DDc against 179Dc
  needs knowing that DDc is 10^39 and Dc 10^33.
- **The genre:** Antimatter Dimensions starts on Mixed scientific, letters below 10^33 and scientific above, one of 21 notations
  ([player.js:775](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/player.js), [code](https://github.com/antimatter-dimensions/notations/blob/master/src/mixed-scientific.ts),
  [list](https://github.com/antimatter-dimensions/notations)). Cookie Clicker spells words (1.23 million) unless Short numbers is on
  ([main.js](https://orteil.dashnet.org/cookieclicker/main.js)). Cauldron's letters (1Qu to 1Dc) turn scientific past a decillion
  ([review](https://steamcommunity.com/id/HolyCowie/recommended/2619650/)). Unnamed Space Idle writes exponents (1e5, 1e7); its players
  asked for engineering, one finding scientific shows high or low at a glance ([thread](https://steamcommunity.com/app/2471100/discussions/0/600765572565761276/)).

## Held against Fantasy Idle

| Evidence | Fantasy Idle today | Verdict |
|---|---|---|
| Picture-led short arcs keep 89–95% to a first goal; RuneScape-likes lose 14–16 points in minutes | Opens on the fight; a sword at 4.5 s, a boss at 48 s, a first prestige at 4:30 | A strong start; its own share is unknown |
| A sign-up wall was the beta post's top complaint (018) | 32 words and three fields before the first blow; guest third | P-065 |
| First-hour reviews are about money (16 of 25) | Free, nothing to buy | Keep (P-057) |
| One Scapewatch player in seven never equips an item | The hand shows the first piece and camp level only; its follower fell at stage 20 | The hand at the first wall |
| Tooltips need a hover (NN/g) | 121 of 134 title tips never show on a phone, the monster's line among them | Every tip a phone can open |
| Apple's 11 pt floor; Scapewatch's 50–150% HUD | 12 of 64 words under 11 px in the phone's fight; no size setting | P-019 |
| 4.5:1 contrast; a way to stop motion | 6.6:1 and 14.6:1 on panels; reduced motion stops all | Fine; paintings unmeasured |
| Antimatter Dimensions and Cauldron turn scientific at 10^33 | Letters to 10^306, no switch; live play near 10^48 | P-018, reshaped |
| Melvor links its wiki from the game | No link to wiki.fantasyidle.com in `src/` | P-074, promised |
| Layers once the old feel easy (USI); late hints send players to guides (Magic Research 2) | One place at a time, a breather apart; the Next card | Keep |

## Proposals from this file

1. **P-065, a link that starts as a guest** (Change, S; evidence added): the bare address puts 32 words and three fields between Begin
   and the first blow, where other games already lose 14–16 points of players in minutes without one. Optionally the form's words cut
   to one line, the rest behind its "?" (the owner's wording).
2. **The hand at the first wall** (Change, S; new): in a hero's first run (`newHero`), after a fall or a boss that held out, the hand
   points at a waiting Equip, then an affordable camp level, before the boss's skull. Why: the follower stalled with gold and armour in
   hand; teach at the moment of use (`first-session.md`). No words, on the thing, after a pause; once a fall, so it doesn't nag.
3. **Every tip a phone can open** (Change, S; new): the header's chips, the Focus and bonfire pills, the monster's line, the hero's
   stat rows and the tool badges join the tap targets (`src/main.js:383`); what a button's title says moves into the button or its
   "?". Why: 121 of 134 tips can't show on a phone; 004 lists hover-only details among the genre's complaints.
4. **P-019, text size, an 11 px floor on phones first** (Change, S for the floor, S–M with the setting; evidence added): the stage
   numbers and the monster's line first. Why: Apple's floor, a third to three-fifths of the phone's words under 12 px, Scapewatch's setting.
5. **P-018, notation, reshaped** (Add, S; evidence added): one switch, letters (today), mixed (letters to No, then 3.30e48) or
   scientific; new saves start on mixed, as Antimatter Dimensions does, old saves keep letters so no live screen changes unasked;
   `shortQty` follows it. The default for new saves is the owner's call.

**Ideas that don't carry over:** a sidebar of locked places with requirements (Melvor Idle 2's demo) breaks "hidden, not locked";
text tutorials and quest chains (Milky Way Idle, Idle Clans) are the refused suggestion notes, where the hand teaches without words;
a minigame-led start (Cauldron), as mini-game rewards stay small; Steam's funnels, off Steam; paid offline time (Scapewatch).

**For the queue:** Fantasy Idle's own first-hour funnel from the server's saves, with the owner's OK (accounts past the first boss,
the first prestige, stage 30 and a second day, by sign-up week; guests unseen); Melvor Idle 2's and Lowbar Legends' first sessions,
and their shares a month on; a real touch phone at 390 px, tip by tip; studies on large-number names and motion, once search works.
