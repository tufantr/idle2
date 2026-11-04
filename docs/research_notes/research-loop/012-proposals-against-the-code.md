# 012: Every proposal against the code (checked 4 November 2026, 6ea4de0)

An independent check of what P-001 to P-022, and the proposals at the end of 001, 005, 006 and 007, say about the game.
All of it was read from the code at 6ea4de0. What other games do was not checked. Re-run at this commit:
`tools/clanpower.mjs`, `tools/pacing.mjs`, and small evaluations of the game's data. Not re-run: the batches in 005 and the
Faithless figures in 001 (they write to `runs/`). Nothing was looked at in a browser: a look is worked out from the CSS and
the atlas, and says so.

Paths under `src/` leave `src/` off (`ui/render.js`); `api/`, `tools/`, `test/`, `docs/` and `deploy/` are as named. Effort
is on the proposals' scale: S a day or less, M a few days, L a week or more.

## The table

| # | Status | Is what it says true? | Realistic effort | Files | Conflict or risk |
|---|---|---|---|---|---|
| P-001 Crowns | Not built | Partly. The 1st has no tint (`style.css:973-975`) and the ranking's crowns have no title (`ui/render.js:2688`; the clan list's have, `ui/render.js:2646`). "All three look silver" is not what the pixels say (note 1) | S, hours | `style.css`, `ui/render.js` | None. A `title` never shows on a phone, and "Last week" has no number beside its crown: use `tipAttrs` (`ui/render.js:862`) |
| P-002 Rates | Not built | True. Header: mastery, level, bar, `into / needed XP` (`ui/render.js:745-753`); no rate or time to level anywhere in `src/`. Cards: `have/need` chips (`ui/render.js:865-870`); only potions say how long they last (`ui/render.js:393`). Agility: `N s a run · N XP` (`ui/render.js:2102`), an obstacle's time and XP in a `title` (`ui/render.js:2092`) | S–M, not S: S for the header and the worked card, more for every screen. Combat has no such header and no fixed rate, Farming grows on the clock, the anvil pays by the click. Agility is simpler than it reads (note 2) | New pure helper and test beside `systems/skilling.js`; `ui/render.js` `xpHeader`, `actionCard`, `renderAgility` | House rule: a card at rest shows art, name and time, so materials' time goes on the worked card. Text or `data-tip`, no `title`. The helper must count a skill potion's XP (bug 5) |
| P-016 What's new | Not built (the pill only) | True. The pill says "New version" (`ui/render.js:302`). No changelog ships: a release copies `index.html manifest.json style.css src assets` (`deploy/vps/activate.sh:17`), so the ROADMAP is not on the site | S | New `data/changelog.js`, `main.js`, `ui/render.js` | House rule: a new player sees only what they have met. A line on the War Tree spoils it at stage 20, so entries need a disclosure id. The real cost is a line written at every deploy |
| P-003 Clan feed | Partly: a feed of hall gifts only (`api/index.js:909,916`, `ui/render.js:2529`) | True. The uploads don't hold it yet: `powerSummary` has the best stage, not pets, 99s or tiers (`core/power.js:124-151`); the chronicle has firsts only (`systems/chronicle.js:10`) | S–M at its top end: a table, a diff in an upload path that runs every minute per player, rules for a first upload and a flagged save | `api/store.js`, `api/index.js`, `core/power.js`, `test/helpers/memory-store.cjs`, `test/api.test.cjs`, `ui/render.js` | None with the rules. A member back after a month must not flood it. New SQL needs the server's Postgres |
| P-017 Laurels that wait | Not built | True. `syncWeekly` replaces the one `state.trials.weekly` (`systems/trials.js:51-56`) and nothing banks. Three records are 1.05³ = ×1.158 on what the tokens give (`core/modifiers.js:52,319`) | Banked: S–M, as stated. "Open three weeks": M (one weekly object, one badge, the week's board: `core/state.js:735`, `ui/render.js:2801`, `core/power.js:146`, `api/index.js:1105`) | `systems/trials.js`, `data/trials.js`, `core/state.js`, `main.js` `pickTrial`, `ui/render.js`, `test/trials.test.mjs` | The growth check allows 3 laurels a week since the save began (`core/power.js:150`): a new account winning old weeks would be flagged unless they are held to its own weeks |
| P-004 Clan quests and levels | Not built | True that it is open. The Clan Hall is built; no quest, clan XP, level or talent exists | L, not M–L. Progress needs numbers the server doesn't keep (kills, actions), clan tables, the leader's picks, a buff path (`api/index.js:597`) into `collectModifiers`, the wiki, balance runs | `api/*`, `core/power.js`, `core/modifiers.js`, new data and systems files, `ui/render.js`, `ui/features.js`, `wiki/` | Open with the owner (README). A combat buff must stay off the boards and the clan boss as the banner does (`core/power.js:42`); the hall stays off combat by rule (`data/clanhall.js:4-5`) |
| P-005 Cape for 100% | The figure built, no cape | The figure is true: eleven equal parts, only rising (`systems/completion.js:26-42`). A cape at 100% hides a problem: 100% needs the medal for stage 10,000 (note 3) | S for the cape, after a decision on what 100% means. The tint route needs no atlas (`ui/sprites.js:23`) | `data/capes.js`, `systems/completion.js`, `ui/render.js` `capePicks`, test | Open with the owner. `completion.js` imports `capes.js`, so the check belongs outside `capeEarned`, which `core/modifiers.js` reads at every recompute |
| P-021 End boss | Not built | True that it is open (`docs/ROADMAP.md:1476`). Lords every 100 from 200 (`data/zones.js:77`, `systems/combat.js:457`) give it a base. There is no story to end: one-line land cards only (`ui/features.js:151`, `data/strata.js`) | M, as stated, with new art and words; S–M on a Lord's fight and a stratum's painting | `data/zones.js`, `systems/combat.js`, `main.js`, `ui/rewards.js`, `core/state.js` | Open with the owner. It must leave the climb going. Stage 1,000 already holds a medal and the first Primal (`data/achievements.js:33`, `data/items.js:72`) |
| P-006 The boss says | Partly | Mostly. The panel shows health, pips, refill and banner (`ui/render.js:2607-2639`). But the picked potion's multiplier stands under it (`ui/render.js:2437`, `data/potions.js:82`), and the "?" gives level 1's 20 attacks, ×1.2 a level and strikes ×2.5 (`ui/features.js:121,123`). Missing: each level's count, striking's ×1.33. The 005 table re-ran the same; 13 watching, 10 striking, 3 with potion IV hold | S or less | `ui/features.js`, `ui/render.js`, `data/social.js` (×1.33 lives only in `tools/clanpower.mjs:44`), `test/clanfight.test.mjs` | House rules: the table goes behind the "?", a figure on the panel, no "do this" note |
| P-007 Trials show what they pay | Half built | Out of date. The pick line says it in numbers: "A record on each ladder at stage 750: each makes your tokens ×1.05 stronger, for good", laurels, heat (`main.js:1727-1735`). It shows on ticking, not at rest. Faithless says "Your tokens give nothing." (`data/trials.js:47`): true. "Only the ?": true before the pick (`ui/features.js:90`); in the run the dialog lists the Trial under Starts over (`ui/render.js:2758`) | Less than S: one sentence for Faithless. Still unsaid: what the run pays against a plain one, and that several tiers can fall at once (`systems/trials.js:129`) | `data/trials.js`, `main.js`; `rule` also feeds the start card, the log and the wiki (`main.js:879`, `systems/trials.js:92`, `wiki/pages/progression.mjs:67`) | A card at rest stays small: the pay belongs in the line |
| P-020 Credits | Partly: on the wiki and in a file, not in the game | True of the game: nothing in `renderSettings` (`ui/render.js:2330-2366`), and the game never links to the wiki. The wiki's Credits page already says "AI-generated" (`wiki/pages/systems.mjs:133-140`, `wiki/lib/site.mjs:115`); `assets/CREDITS.md` is public. 004's row 30 misses the wiki | S, hours: the words exist | `ui/render.js` | None. The wording is the owner's |
| P-018 Notation | Not built | True. `fmt` has no option: letters from 10⁶, an exponent past UCe (`ui/format.js:11-21`). A leftover `settings.numberFormat: 'short'` is read nowhere (`core/state.js:152`) | S, if "everywhere" is `fmt`. Beside it: `shortQty` (`ui/render.js:1321`), raw tokens (bug 3), `.toLocaleString` in log and error lines (`systems/agility.js:21`, `systems/daily.js:74` and others) | `ui/format.js`, `main.js`, `ui/render.js`, `core/state.js` | `fmt` can't see the state: a switch in the module, set from `main.js`. The row opens once numbers pass 10⁶ (disclosure) |
| P-022 Where the power comes from | Not built | True. The hero's panel shows totals only (`ui/render.js:1454-1465`). Pieces stand elsewhere: tokens and records in the prestige dialog (`ui/render.js:2748`), records and Legacy in the Hall (`ui/render.js:1818,1826`). `tools/ledger.mjs` is a dev tool | S–M, as stated. The ledger clones the state per source (`tools/ledger.mjs:51-52`): work it out on opening, not in `renderInventory`, which can redraw six times a second. `gainStages` gives it a unit (`systems/inventory.js:114`) | New pure module and test in `systems/`, `ui/render.js` | A new panel stands on a painting and lists only the sources met |
| P-008 No server needed | Not built | True: no service worker. The game already plays on when the API fails (`main.js:1387-1424`); only the files are missing | M at its top end: 85 + 220 files, 14 MB, no build step, so the deploy must write the list. Never on a local host (CLAUDE.md: a plain reload shows new code; `tools/shots.mjs`) | New `sw.js`, `deploy/vps/activate.sh`, `main.js`, `ui/update.js`, `test/update.test.mjs` | Stale code, as it says. The pill's `location.reload()` (`main.js:1988`), the boot-fail script in `index.html` and the itch frame all meet it |
| P-009 Last seen | Not built | True. `/api/clan` leaves `lastSaved` out (`api/index.js:913`); `clanMembers` has it (`api/store.js:432`), used only for clan power (`api/index.js:545`). An absent leader stays leader for good; it passes only when they leave (`api/index.js:884`), and only they can kick or change the banner | S | `api/index.js`, `ui/render.js:2431,2441`, `test/api.test.cjs` | Phones already hide a column of that table (`style.css:784`). Clanmates would see when someone plays: rounded days |
| P-010 One table | Not built (own clan's best week only, `ui/render.js:2673`) | True. Divisions by levels felled: Champion 7, Gold 5, Silver 3, Bronze (`data/social.js:68-73`; 003 names three). Ranks restart in each (`api/index.js:755`), empty ones hide (`ui/render.js:2689`). Top three of each are crowned (`api/index.js:781`), so with few clans every ranked clan wears a crown | S at its top end: crowns are per division in `clan_rankings`, then `standingOf`, the "?" card, the wiki, tests; a best week per clan needs one more query beside `api/store.js:715` | `api/index.js`, `api/store.js`, `test/helpers/memory-store.cjs`, `ui/render.js`, `ui/features.js`, `test/clan-ranking.test.mjs` | Not in README's list, but the divisions are the owner's design (`docs/DESIGN.md` §3.18) |
| P-019 Text size | Not built | True. Nearly all type is rem: 362 of 372 `font-size` lines, 3 in px; `html` sets none, so one root value scales it | Code S; the checking makes it S–M. `tools/shots.mjs:38` has no size option; every tab, dialog and the dock at 390 px | `main.js`, `ui/render.js`, `style.css`, `tools/shots.mjs` | No sideways scroll at 390 px. It belongs to a device, not the save (note 6) |
| P-011 Ascend into a Trial | Withdrawn; nothing to build | The mechanics are true: `noTokens` only silences the tokens (`core/modifiers.js:340`), a prestige adds the run's and ends the Trial (`systems/prestige.js:66,82`), +5% a tier. The dialog offers Ascend or a Trial, not both (`main.js:1684-1703`). 1.5–2% not re-measured | None | None | None |
| P-012 Music | Not built | True: all sound is synthesized, no files (`ui/sound.js:1`), one volume (`ui/render.js:2358`) | M, as stated, after the licences. Ten lands of tracks against 14 MB of assets today; loading, a fade by place, hidden tabs | `ui/sound.js`, `main.js`, `ui/render.js`, `core/state.js`, `assets/`, `assets/CREDITS.md` | None |
| P-013 Save history | Not built on the server | True. One save per account, overwritten at each upload (`api/store.js:315-327`). Local backups are written signed in too but shown only to guests (`core/save.js:14-16`, `ui/render.js:2344`). Nightly dumps, 14 days (`deploy/vps/provision.sh:87`): an undo by hand exists now | Owner's restore by SQL: S. A player's button: M or more (note 4) | `api/store.js`, `api/index.js`, `core/save.js`, `main.js`, `test/` | A player's button rubs against README's "save export and import (removed)": the owner removed rollback (`docs/DESIGN.md:919-924`) |
| P-014 Pet luck | Not built | True. `rollPet` keeps no count (`systems/progress.js:130-135`); e⁻² is the 14% | S: a count a skill, a default and migration, a test; the offline replay goes through it | `systems/progress.js`, `data/pets.js`, `core/state.js` | None. Thin, as it says |
| P-015 Newcomer's banner | Not built | True: anyone in the clan has it at once (`api/index.js:603,919`); the Hydra waits (`api/index.js:934,1030`) | S, plus a decision (note 5) | `api/index.js`, `test/api.test.cjs:392-425` | Copied as it stands, a new clan has no banner in its first week, and the banner is the whole reward (`api/index.js:485-486`) |
| 001 No change for guests | Nothing to build | True: sign-in (`ui/render.js:2968`), Settings (`ui/render.js:2337`) | None | None | None |
| 005 Food late | Not built | Can't tell: measured at 1db03c4, not re-run. Its own next step (a check-in bot that stocks food) isn't done | M with that step; the data alone S–M | `data/resources.js`, `systems/combat.js`, `tools/` | None. The owner wants food crucial (`docs/DESIGN.md` §3.28) |
| 005 Battery saver | Not built (`reducedMotion` only) | True: Focus knows the minute (`core/modifiers.js:104`). `frame()` runs every frame unlimited (`main.js:311-321`); 135 `animation:` lines, 73 `infinite`. Not measured on a phone yet | S–M, as stated | `main.js`, `style.css`, `ui/scene.js`, `ui/render.js` | "On by default on phones" can't live in the save (note 6). 005's table says painting costs most, so stilling the CSS matters more than a frame cap |
| 006 Power on sale | Not a build | No payment code exists; the plan is `docs/ROADMAP.md` Decisions 2 | None | None | Argues with the owner's plan (README), and says so |
| 006 Clan trials | Not built; part of P-004 | A snapshot exists for fights (`core/power.js:113`). Nothing reckons skilling from a stored save | M–L alone: not a small shape | `core/power.js`, `api/*` | None: not synchronous |
| 006 Clanmates in the hall | Not built | `/api/clan` sends no look (`api/index.js:913`); `heroLayers` needs gear, look, cape and rank (`ui/sprites.js:106`) | S–M, as stated, if the look goes into the numbers at upload; reading 20 saves a poll won't do | `core/power.js`, `api/index.js`, `ui/render.js`, `style.css` | Up to 20 heroes in the hall's picture at 390 px |
| 006 Shared event meter | Not built | Events need no server by design (`data/events.js:1`, `systems/events.js:2`): this is their first tie to one | M, not S–M: totals from uploads (forgeable), a word back to each game, guests have none, the offline replay | `api/*`, `core/modifiers.js`, `systems/events.js`, `core/power.js` | The boards and clan boss must leave it out, as the banner is (`core/power.js:42`) |
| 006 Collector goals | Not built | True: no shiny or trim | S–M: new state and rules; new cells mean `tools/resource_art.py` and an atlas rebuild, and a filter serves only in part | `data/pets.js`, `data/capes.js`, `core/state.js`, `tools/` | Counted in completion it lowers every figure, which "only ever rises" (`systems/completion.js:7`, `test/completion.test.mjs:23`) |
| 006 Hold to strike | Not built | Today: strikes 250 ms apart (`core/formulas.js:130`, `systems/combat.js:663`), after a 0.42 s drop-in. Space: one press, one strike; held, nothing more (`main.js:482-491`). The mouse: `click` only (`ui/scene.js:622`) | S, as stated | `main.js`, `ui/scene.js`, `ui/render.js`, `core/state.js` | README's rule stands (click and combo stay, a macro is fair); it reopens "Clicking pays" in PROPOSALS. A held mouse sends no new input, so Focus would start under it (`main.js:456-466`). At the clan boss it is perfect play, up to x1.5 against x1.33 (`data/social.js:14`). A phone's long press |
| 006 Translations | Not built | English only: true (`index.html:2`). No text layer: strings stand in `ui/render.js` (3,040 lines), `main.js`, `ui/features.js`, systems' logs, data names | L or more, not M–L | Nearly all of `src/`, `wiki/` | None |
| 006 Rules and reports | Not built | True: clan text is only cleaned (`api/index.js:499`). A flagged player's one sign is "Capped" on an attack's card (`main.js:1258`), with nowhere to answer | S for rules and a report row read by SQL; S–M with a mail to the owner | `api/*`, `ui/render.js`, `wiki/` | None |
| 006 State of the realm | No code | Stage, levels, Titans and clears are in the stored numbers (`core/power.js:124-151`); kills and pets only in `game_state` | S: SQL and the owner's text | None | The owner's post, in the owner's words |
| 006 A guest's save on the server | Not built | Today guests never reach it (`core/save.js:289`), and a first upload is measured from nothing (`api/index.js:401`) | L, not M: an identity where `users` wants a name and a hash (`api/store.js:13-16`), three sign-ups a day an address (`api/index.js:154`), every guest branch in `main.js`, framed guests, the move at sign-up, clean-up | `api/*`, `core/save.js`, `main.js` | Yes: the owner, "opening account should restart the process, not move it" (`docs/DESIGN.md:927`); a deliberate choice in PROPOSALS |
| 007 Bestiary stars | Not built | Almost. Stars add nothing directly, but 25 and 100 of them earn medals, +5% gold and +5% drops, each with its 1% attack, defence and speed (`data/achievements.js:17-18`) | S–M, as stated, plus balance runs; `systems/combat.js:527` must mark the game dirty for a star | `core/modifiers.js`, `systems/combat.js`, `data/bestiary.js`, `ui/render.js` | The owner's felt progress: it must stay small beside tokens |
| 007 Projected gains | Not built | The report exists (`ui/render.js:2841`); the panel says "24h away" (`ui/render.js:1464`). "Before leaving" has no moment: a closing page can't show a line, so it must stand somewhere always | M, not S: the replay changes the state and takes 28,800 steps for 8 hours (`systems/offline.js:163`), so a clone, its own dice, and not on every draw. A rate from the last minutes is S, and wrong for stages | `systems/offline.js`, `core/rng.js`, `ui/render.js` | None. Thin, as it says |

Items for the queue only (a Steam path, Lowbar Legends, a percentile score) say nothing about the game and weren't checked.

## Notes

1. **The crowns.** The `crown` cell (`data/sprites.js:349`, DCSS's Crown of Vainglory, `tools/resource_art.py:1054`) is a red
   and amber band with blue and white gems, not simply "red and white". Its opaque pixels' mean, through each rank's filter by
   the CSS matrices: 1st (130, 84, 79), 2nd (111, 104, 103), 3rd (114, 87, 78). So the 2nd is grey, and the 1st and 3rd are
   nearly the same brown. How three of them read at 16 pixels I didn't see. The fix stands either way.
2. **Agility.** A slot's three obstacles have the same time and XP (`data/agility.js:29-78`), so choosing among them
   changes no rate: one figure a slot will do, not one a pick. Building always pays: 12,000, 16,615, 22,971, 31,680, 42,840,
   57,459 XP an hour for one to six obstacles at base, and 114,918 with all at level 5 (evaluated from `courseDef`,
   `systems/agility.js:78`). The lap goes from 3 s to 25.5 s, as Shadeofnight saw, and the rate rises at every slot. An
   upgrade's +25% XP is said nowhere (`ui/render.js:2078`).
3. **100% is out of reach.** Completion counts all 54 medals (`systems/completion.js:33`), among them Reach Stage 3,000 to
   10,000 (`data/achievements.js:33-34`). Stage 10,000 is the last a save can hold (`core/state.js:351`). The server calls a best
   stage past 6,000 "beyond any possible save" and flags it (`api/index.js:345,373`), and simulated heroes reach 2,000
   at 1,200 hours (`api/index.js:344`). Mastery alone is 96 actions at about 50 hours each at base speed, near 4,800 hours
   (`data/mastery.js:3`, evaluated). So nobody earns this cape, and the one who did would be flagged. Leaving the deep medals out of
   the part raises every figure, so "only rises" holds. The owner's call.
4. **A player's restore gets undone.** A restored save is older than any copy in a browser. On the next look `syncChoice`
   finds the live game "holds all it has" (`core/save.js:294-297,308-313`) and uploads it over the restore, from the same
   device after a reload or from a tab left open. So it needs a mark of generation in the save, and that holds for an
   owner's restore by SQL too. A button also re-rolls pets and crates. Going back alone isn't flagged (`docs/DESIGN.md:1005`).
5. **P-015's trap.** The Hydra's rule, `joinedAt` before Monday (`api/index.js:934`), applied to the banner also takes it from a
   founder and every first member for the clan's first week. It needs a founder's exception or a wait in hours (003's Idle
   Clans has 48).
6. **Settings that belong to a device.** `state.settings` is in the save, and the save travels between devices. Text size
   and a battery saver "on by default on phones" belong in `prefs` (localStorage, `main.js:69`).

## What is out of date in 000-fantasy-idle-today.md

Stale or wrong:

- **The header:** 30 October, 798cc79. The code is at 6ea4de0. Since then, by the ROADMAP (`docs/ROADMAP.md:1448-1461`): War Tree
  bridges, a question over dialogs, looser growth limits, the words over the tree's numbers, the anvil's mastery strip.
- **"190–290 h of training per skill":** `tools/pacing.mjs` now gives, with inputs in the bank and no tools, 191–250 h for
  most, Farming 177, Alchemy 130, Crafting 83–127, and none near 290.
- **"Jewellery at every rarity":** crafted, it stops at Rare, Epic from level 75, Legendary at 99; never Mythic or Primal
  (`data/items.js:44,50-51,60`). Every rarity is true of the drops.
- **"The jeweller's bench (gem slots)":** no sockets. It works the worn jewellery's slots, paying in gems and essence
  (`systems/bench.js:1-5`).
- **"One per skill (twelve)":** twelve pets on eleven skills; Hunting has two (`data/pets.js:12,18`).
- **"A medal every 500":** to 3,000, then 4,000, 5,000, 7,500, 10,000 (`data/achievements.js:33-34`).
- **"The Abyss without end":** a save holds stage 10,000 at most (`core/state.js:351`). No hero is near it.
- **"Gold buys attack and health":** defence too, the Armour Rack (`data/camp.js:13`).
- **"A 40-slot bag":** 40, and +5 up to twelve times (`data/items.js:154,161`).
- **"Achievements: 45":** 54, three of them secret (evaluated, `data/achievements.js`).
- **"Tokens (permanent attack and defence)":** health too (`core/modifiers.js:47`), and Legacy is missing: ×1.002 attack,
  defence and health a prestige (`core/modifiers.js:61`).
- **Trials:** the week's Trial and its laurels are missing, the thing P-017 is about.
- **The War Tree and Mastery:** add the bridges (`data/talents.js:9-11`) and the anvil's strip (`ui/render.js:1086`).

Checked and right:

- **"Uploads every minute":** right (`main.js:62,300`), in the background too, and once on leaving unless one went in the last
  5 s (`main.js:64,345,359`).
- **"A point a level up to 233":** right. 39 talents hold 134 points, and 99 + 134 = 233 (`data/talents.js:138`, `core/xp.js:13`).
- Also right: eleven skills, the bonfire, one-minute doses, mini-games, Focus, four charms; strikes 0.25 s and the 0.42 s
  drop-in; Lords from 200; dungeons, the Titan from stage 20 with three banked; prestige from 10, Trials from 200, Ascension
  from 300; eleven parts of completion; the daily crate; events; 24 hours away with Endurance and the Zipline on top; clans
  of 20, three attacks, six banked, the banner ×1.5 to ×3, the Hydra, the Hall; the pill; nothing for sale.

Can't tell from the code: the Discord's channels, the itch.io and galaxy.click pages' words, "tens of players".

## Bugs noticed in passing

1. **A medal past the server's ceiling** (far off): Reach Stage 7,500 and 10,000 exist (`data/achievements.js:34`), but a best stage
   past 6,000 flags the account (`api/index.js:345,373`): off the boards, attacks capped at 1%.
2. **A hint for what is gone:** an empty bag says "a smith can forge it" (`ui/render.js:1479`); forging is gone (`ui/render.js:1046`).
3. **Raw numbers:** tokens without `fmt` read as long digits deep in the game (`ui/render.js:483,490,1650`).
4. **Completion's Trials bar counts rungs:** `trialTiersCleared` includes them (`data/trials.js:92`) against 40 tiers
   (`systems/completion.js:37`), so rungs can fill it with some Trials uncleared. Small.
5. **Cards understate XP under a skill potion:** the card's `node.xp * d.xpMult` (`ui/render.js:940`, also `:1055,1264,2102`) leaves
   out `skillXpMult`, which the work is paid with (`systems/skilling.js`, `completeAction`).
6. **Stored flags outlast a fix:** `recentlyFlagged` reads flags already stored for 30 days (`api/index.js:403-405`), so new limits
   don't lift them. On 4 November five were cleared by hand, after the limits changed.
7. **Dead code:** `settings.numberFormat` (`core/state.js:152`) is read nowhere; `describeOffline` (`systems/offline.js:200`) is
   used only by a test.
