# 041: The newer proposals against the code (checked 11 November 2026)

An independent check of P-023 to P-122 in `PROPOSALS.md` against the code: the game at 6ea4de0 (the commit 012 read), the API
at 8a53d4d. What other games do was not checked, nor any live number. No tool was re-run. Two small read-only evaluations of the
game's data were made (the Lords' bosses by stage, the strata's cards up to stage 2,440), and completion's arithmetic was done
by hand. Nothing was looked at in a browser. Figures measured in the findings files (013 to 035) are marked "measured" and were not
re-run. P-087 and P-088 don't exist: the numbers jump from P-086 to P-089, so 98 proposals are checked here. The rows 012 already
checked (P-037 to P-046 came from 005, 006 and 007) were checked again at the same lines.

Paths under `src/` leave `src/` off (`ui/render.js`). `api/`, `tools/`, `test/`, `docs/`, `deploy/` and `wiki/` are given in full.
Effort uses the proposals' scale: S a day or less, M a few days, L a week or more.

## The table

| # | Status | Is what it says true? | Realistic effort | Files | Conflict or order |
|---|---|---|---|---|---|
| P-023 Survival deep | Not built: a choice | True where the code shows it. Defence stops at 90% (`core/formulas.js:269-274`). From stage 150 a ladder boss hits as hard as its monsters (`:40`). From 700, health grows ×1.035 a stage and attack ×1.03 (`:30-31`). The owner's ask is the supply comment (`:48-53`). The dish counts, ×38 and ×9,461 are measured (013, 015, 032) | "Say so": S, a line behind the Combat or Cooking "?" (`ui/features.js:36,52`; there is no Food card). The other two answers: M each, with balance runs | `ui/features.js`, or P-061's or P-106's files | Decide it before P-061, P-062, P-075 and P-091: the first two make capped defence pay, the last two say it doesn't. P-122 before any run |
| P-024 Ceilings | Not built | True. `ceiling: 6000` (`api/index.js:346`) flags "beyond any possible save" (`:374`), and medals stand at 7,500 and 10,000 (`data/achievements.js:33-35`). The pace is 027's. Understated: the save itself stops at 10,000 (`core/state.js:351`, clamped on load at `:683-686`), about 16 weeks off if 460 a week held | S: one constant (to `MAX_STAGE`) and a test | `api/index.js`, `test/api.test.cjs` | First, while there are weeks to spare. The ceiling's comment sizes it on simulated hours (`api/index.js:345`), and live heroes are ahead of the bot (P-122). `TRIAL_MAX_TIER` hard-codes 10,000 (`data/trials.js:34`). Merge with P-025 and P-099 |
| P-025 Flagged player told | Not built | True. The save answer's `flagged` (`api/index.js:457`) is read nowhere in `src/`. The only words a player sees are "Capped: …" on a clan attack's card (`main.js:1258`). Clan text is only cleaned (`api/index.js:500`) | S–M, as stated | `main.js`, `ui/render.js`, `ui/features.js`, `api/index.js`, `wiki/` | One pass with P-099 and 012's bug 6 (stored flags outlast a fix, `api/index.js:404-406`). P-110's "Report" link is this report row. Part of P-049 |
| P-026 Small fixes | Not built | True: each is still there (`ui/render.js:483,490,1650,1479,940,1055,1264,2102,2927`; `systems/completion.js:37`). The skill potion's XP is paid at `systems/skilling.js:266`. The parked boss is 014's measure, against `systems/combat.js:345-351`. Missed: raw tokens also at `ui/render.js:679,1653` and `systems/prestige.js:88`, and "forge your gear" on the wiki's home (`wiki/pages/home.mjs:23`) | S for the words and numbers. The parked boss isn't a wording fix: either its payout changes (`systems/combat.js:352-356`, a balance change after P-122) or its comment does | `ui/render.js`, `systems/prestige.js`, `systems/completion.js`, `wiki/pages/home.mjs`, `systems/combat.js` | The Trials bar belongs with P-108: same line |
| P-027 Lords speak | Not built | True. There are 15 Lords from 200 to 1,600, and from 1,700 they repeat (1,700 is the Ember Pits' Flame Tyrant again: `data/zones.js:77-78`, `data/strata.js:53-66`, evaluated). A Lord's fall shows a drop card only (`main.js:727-737`). The Chronicle keeps no Lord (`systems/chronicle.js:10`) | S of code. The 15 lines are the owner's to write | `data/strata.js`, `main.js`, `systems/chronicle.js`, `ui/render.js` | Merge with P-028 and P-119: one pass over the story's moments and the Chronicle |
| P-028 Two acts | Partly | Mostly true. Reaching stage 100 and stage 500 already brings a medal's card (`data/achievements.js:22,29`), and 501 brings a round's card that says "The strata come round again" (`main.js:920`). The stage-100 boss's fall has nothing of its own: 101 makes no card (`systems/combat.js:590-594`) | S | `main.js`, `systems/combat.js`, `ui/rewards.js` | With P-027 and P-119 |
| P-029 First to fell | Not built | Nothing to check before P-021 | S | `api/*` | After P-021 |
| P-030 Boss pets | Not built | True: eight dungeons (`data/dungeons.js:43-125`), twelve pets, all of them skill pets with a bonus (`data/pets.js:9-22`) | S–M plus art. Pets are atlas cells (`tools/resource_art.py`), and a pet without a bonus is new to the code | `data/pets.js`, `systems/dungeon.js`, `tools/resource_art.py`, the atlas | P-108 first. Otherwise eight new pets take every hero's pets part from 12/12 to 12/20 (`systems/completion.js:34`). Merge with P-040 and P-044 |
| P-031 Clan's week skill | Not built | Partly. The server holds the save, but its stored numbers have no XP per skill (`core/power.js:124-151`), and weekly snapshots are kept only for players on the boards (`api/index.js:456`) | M, as stated | `core/power.js`, `api/index.js`, `api/store.js`, `ui/render.js` | Merge into P-004 as one of its quests. Thin with five clans |
| P-032 Hunts | Not built | True. A run starts at a tenth of the best stage (`core/formulas.js:89,317`), so from best stage 1,010 every run starts past stage 100. A hunt by hand already exists: the map and "Stay on this stage" (`ui/render.js:547-548`) | S–M, as stated, the replay included | `systems/combat.js`, `systems/offline.js`, `core/state.js`, `ui/render.js`, `main.js` | On a phone a tap on a `.beast` tile already opens its tip (`main.js:383`), so the hunt needs its own button. Pairs with P-044, which gives the reason to hunt |
| P-033 Pin a goal | Not built | True: after the last goal the Next card is not drawn (`ui/render.js:209-212`) | S | `ui/render.js`, `core/state.js`, `main.js` | Stretches "no suggestions", as it says |
| P-034 Clan level | Partly | Partly wrong. The code has no renown; renown is part of P-004. The hall's stage is already on each clan's row (`ui/render.js:2405`) and on its hall | S for room levels alone | `ui/render.js`, `api/index.js` | Renown waits for P-004: merge into it |
| P-035 Who plays | Not built | True. The list is sorted by member count (`api/store.js:356-366`), and the activity is already stored (`last_saved`, read at `api/index.js:546`) | S | `api/store.js`, `api/index.js`, `ui/render.js`, `test/helpers/memory-store.cjs` | One pass over the clan list with P-009, P-113 and P-025's report row |
| P-036 Rival | Not built | Thin, as it says | S–M | `api/*`, `ui/render.js` | Later |
| P-037 Battery saver | Not built | True (012): `frame()` runs on every frame (`main.js:311-321`) | S–M | `main.js`, `style.css`, `ui/scene.js` | "On by default on phones" belongs in `prefs`, not the save (012 note 6) |
| P-038 Clanmates in the hall | Not built | True (012): `/api/clan` sends no look (`api/index.js:914-915`) | S–M | `core/power.js`, `api/index.js`, `ui/render.js`, `style.css` | Up to 20 heroes at 390 px |
| P-039 Shared event goal | Not built | True (012) | M (012) | `api/*`, `core/modifiers.js`, `systems/events.js`, `core/power.js` | Must stay off the boards and the clan boss. Overlaps P-004's shared goals |
| P-040 Collector goals | Not built | True (012) | S–M (012) | `data/pets.js`, `data/capes.js`, `core/state.js`, `tools/` | Keep it out of completion, or build it after P-108. With P-030, P-044 and P-005 |
| P-041 Hold to strike | Not built | True (012): Space strikes once per press, and holding it does nothing more (`main.js:482-491`) | S | `main.js`, `ui/scene.js`, `ui/render.js` | Reopens "Clicking pays", as it says |
| P-042 Translations | Not built | True (012) | L or more | nearly all of `src/`, `wiki/` | After P-066, as it says |
| P-043 State of the realm | No code | True (012) | S | SQL only | In the owner's words, and a post needs the owner's OK. Can go out through P-111's path |
| P-044 Bestiary sets | Not built | True: stars pay only through medals (`data/achievements.js:17-18`) | S–M; a look needs art or a tint | `data/bestiary.js`, `systems/combat.js`, `ui/render.js`, `data/looks.js` | Pairs with P-032. Out of completion, or after P-108 |
| P-045 Projected gains | Not built | True (012) | M | `systems/offline.js`, `core/rng.js`, `ui/render.js` | Thin |
| P-046 Guest save on the server | Not built | True (012) | L | `api/*`, `core/save.js`, `main.js` | Against the owner's decision. P-065 grows the group it is for |
| P-047 Say the plan | One line | True: `index.html:13`, the link preview's text, says "nothing to buy" | S | `index.html` | After P-048, in the owner's words |
| P-048 Lawyer's questions | No code | Can't be checked from the code | S (a page) | none | Before P-047, P-049 and P-097's wording |
| P-049 Groundwork for a sale | Not built | True: no terms, privacy, refund or contact page, no age question, no table of purchases | M at least. It bundles P-097, P-070, P-025/P-099 and P-094 with new pages and a table | `api/*`, `index.html`, `ui/render.js`, `wiki/` | Only before a sale. Build its parts as their own proposals |
| P-050 Ask the players | No code | — | S | Discord | Thin at tens of voters |
| P-051 Tips | Option | — | S–M | — | The owner's call (ROADMAP Decisions 2) |
| P-052 One price | Option | — | L | — | The owner's call |
| P-053 Expansions | Option | — | L | — | The owner's call |
| P-054 Capped power | Option | — | L | — | Paid power needs the online side to be decided on the server (`docs/ROADMAP.md:1515-1524`) |
| P-055 Clan lift | Option | — | M–L | — | Through the Hall it breaks the Hall's rule of no attack, defence or health (`data/clanhall.js:3-5`). Keep it off the Hydra |
| P-056 Open store | Option | — | L | — | The owner's call |
| P-057 Never sell | A policy line | True as a list. It narrows the owner's plan to sell power | S | `docs/ROADMAP.md` | The owner's call |
| P-058 Lower metals | Not built | True. A reinforce is priced at the best tier the slot has held (`systems/anvil.js:22,37`). Only a reroll uses the piece's own metal. 36,207 rerolls is 001's figure | S–M. Practice with a lower metal mustn't make levels cheaper | `systems/anvil.js`, `data/workshop.js`, `ui/render.js`, a test | None |
| P-059 Titan's bank | Not built | True: one attempt an hour, three banked (`data/dungeons.js:249,258-260`). The 29 against 245 is 014's | S to change, M with balance runs, as stated. Missed: the growth check allows exactly a bank's worth (`flat: 3`, `api/index.js:347-348`). With a day's bank, Titans won in a burst just after a day's window restarts would be flagged unless `flat` changes too | `data/dungeons.js`, `api/index.js`, `test/api.test.cjs` | With P-115 and P-017. "Fought while away" is close to the parked Quartermaster, as it says. P-122 before the runs |
| P-060 Weekend board | Not built | Thin, as it says | M | `data/events.js`, `systems/events.js`, `ui/render.js` | Has the shape of the removed quest board (`docs/DESIGN.md:810-819`) |
| P-061 Bulwark at the clock | Not built | True: the Bulwark has 14 talents (`data/talents.js:77-103`), and Second Wind spares a death, not the clock (`systems/combat.js:332-336`). The −0.1 and +1.3 are 015's and 032's | M plus balance runs | `data/talents.js`, `systems/combat.js`, `wiki/` | After P-023's choice and P-122. The clan fight reads the same stats (`core/power.js:113-119`) |
| P-062 Capped stats pay | Not built | True of the caps: speed at 100%, crit, dodge and lifesteal too (`core/modifiers.js:85,356-367`), mitigation at 90%. Its figures are 015's | Bigger than S–M: four changes (a spill in the pipeline, the drop tables, a reroll that keeps one bonus, refunds by migration), and the server's numbers move with the pipeline (`core/power.js:124-151`). M to M–L | `core/modifiers.js`, `core/formulas.js`, `systems/anvil.js`, `systems/inventory.js`, `core/state.js`, tests | Pulls the other way from P-075 and P-091: pick one direction. The refunds follow P-116's rule. After P-122 |
| P-063 Ascensions I–IV | Not built | True, an open item (`docs/ROADMAP.md:1479`) | M–L: four pieces of S–M each, plus older saves that are already past them | `data/ascension.js`, `systems/ascension.js`, `systems/prestige.js`, `core/state.js`, `ui/render.js` | A ninth Trial needs P-108. "Auto takes the week's Trial" makes an absent player's runs stronger, which is the Quartermaster's objection, and it answers what P-017 answers. Merge P-106 into it |
| P-064 Festival every six weeks | Not built | True: six weekend events take turns (`data/events.js:22-49`), new ones get an era (`systems/events.js:15-18`), and a cloak is a colour (`data/events.js:11`) | S–M each, as stated | `data/events.js`, `systems/events.js`, `wiki/` | P-108 first: each new cloak lowers the cloaks part. Its December idea is P-107, so merge that part |
| P-065 Guest link | Partly | True. Only players in a frame start as guests (`main.js:140-141`), and the address is read only for `dev` and `event` (`main.js:243-244`). The 46 words and 52% are 019's and 027's | S | `main.js`, a test | Merge with P-067: one link parameter. Before P-068. It grows the group P-046 is for |
| P-066 Own fonts | Not built | True (`index.html:29`). Missed: the wiki loads them too (`wiki/lib/site.mjs`), and so does `tools/preview.mjs` | S | `index.html`, `style.css`, `assets/`, `wiki/lib/site.mjs`, `assets/CREDITS.md` | Before P-042 and P-098's CSP |
| P-067 Where accounts come from | Not built | True: a sign-up takes a name, a password and an email only (`api/index.js:210-237`) | S | `main.js`, `core/save.js` (the cloud client, `:188`), `api/index.js`, `api/store.js` | A count per tag, rather than a column on the account, keeps it free of personal data. Merge with P-065 |
| P-068 Second post | No code | True: the README's first line names Melvor (`README.md:3`) | S | `README.md` | After P-065 and P-020. The owner's call and words |
| P-069 Keep a guest's game | Not built | True: `navigator.storage.persist` is called nowhere in `src/`. Partly wrong: the Guest pill has no "?"; it opens the sign-in (`ui/render.js:290-291`) | S | `main.js`, `ui/render.js` | The Safari line goes in the sign-in dialog or Settings |
| P-070 Delete my account | Not built | True: no route deletes an account | S–M at the top end: a route, a web page, and rows in nine tables (membership with the owner handed on, attacks, Hydra fights, gifts, snapshots, rewards, codes) | `api/index.js`, `api/store.js`, `ui/render.js`, `test/` | Deleting an account's rows changes past boards and boss shares, so decide whether to delete them or keep them without the name. Part of P-049 |
| P-071 Push | Not built | True | M | new `sw.js`, `api/*`, `main.js` | After P-008, as it says |
| P-072 Steam | Not built | — | L | — | Later. The full disclosure (P-020) first |
| P-073 Google Play | Not built | True | M. Missed: nginx refuses every path with a dot segment (`deploy/vps/nginx.conf:72`), so `/.well-known/assetlinks.json` would answer 404. A release copies five paths only (`deploy/vps/activate.sh:17`) | `deploy/vps/nginx.conf`, `deploy/vps/activate.sh`, `manifest.json` | P-070 first: the stores require account deletion. P-008 helps |
| P-074 Two promised fixes | Not built | True. The game never links to the wiki; Settings links only the Discord (`ui/render.js:2347-2351`). The hero's panel shows the time between swings (`ui/render.js:1461`) with no mark, though speed stops at 100% (`core/modifiers.js:85,356`) | S | `ui/render.js`, `ui/features.js`, `style.css` | Promised to a player on 1 November |
| P-075 Equip card's wall | Not built | True. `gainStages` counts defence and health with no cap and no threat (`systems/inventory.js:114-124`, against `core/formulas.js:269-274`). The dock's pick ranks by attack plus defence (`systems/inventory.js:78-81,126-135`) | M, not S–M, to do it right. The ▲ (`isUpgrade`), Weaker (`:238-243`), the bag's keep list and its sort all use `itemScore` too. The dock redraws often (`ui/render.js:687`), so work out gains only for the pieces that beat their slot (017) | `systems/inventory.js`, `ui/render.js`, `ui/scene.js`, tests | Before P-076, P-077 and P-091. Clashes with P-062 if capped stats start to pay |
| P-076 Equip all | Not built | True: one Equip at a time (`ui/render.js:687-693`) | S | `systems/inventory.js`, `game.js`, `main.js`, `ui/render.js` | After P-075 |
| P-077 Weaker that stays | Not built | True. Weaker judges only drops as they land (`systems/inventory.js:238-243`). An Equip puts the old piece back in the bag (`:379`). Each automatic salvage of a rare or better piece logs its own line (`:301`) | S | `systems/inventory.js`, `ui/render.js` | After P-075, or Weaker keeps plates that do nothing |
| P-078 Undo | Not built | True: Sell, Salvage and the batch buttons act at once (`main.js:1627-1663`) | S for one sale or salvage; S–M with the batches. Toasts have no button today (`main.js:1026`) | `systems/inventory.js`, `game.js`, `main.js` | A salvage rolls its bars (`systems/inventory.js:295`), so keep exactly what it gave in order to take it back |
| P-079 The hand again | Not built | True. The hand points at Equip only while nothing is worn, and at the camp only before its first level (`systems/guide.js:58-66`). After a boss holds out, it points at the boss (`:67`) | S | `systems/guide.js`, a test | The guide is the agreed exception to "no suggestions". Keep it within `newHero` (`:22`) |
| P-080 Tips on phones | Not built | True. Tap tips cover a fixed list of classes (`main.js:383`). The monster's numbers and the hero's rows have titles only (`ui/scene.js:577`, `ui/render.js:1454-1463`). 121 of 134 was not re-counted (`title="` appears 154 times in `ui/`) | S for pictures and rows. S–M for buttons: a tip on a button can't open by tap without pressing it (`main.js:421`) | `main.js`, `ui/render.js`, `ui/scene.js` | With P-084 |
| P-081 A quiet repeat | Not built | Mostly. Each fall or timeout plays its jingle and shows its banner (`main.js:695`, `ui/scene.js:905-916`), but its toast shows only away from the fight screen (`main.js:859-860`) | S | `main.js`, `ui/scene.js` | None |
| P-082 Effects one by one | Not built | True: one switch for sound and vibration (`ui/render.js:2357`, `ui/sound.js:160`), and one for motion | S. S–M if each switch shows only once met | `ui/render.js`, `ui/sound.js`, `main.js` | Per-device switches belong in `prefs` |
| P-083 Landmarks, work sounds | Not built | True of the sound: every skill's work plays one `action` sound (`main.js:687`). The landmarks weren't checked (no browser) | S | `ui/sound.js`, `main.js`, `style.css` | Thin |
| P-084 Accessibility pass | Not built | True where checked: a `font` shorthand with `inherit` (`style.css:1376`), 19-px stage buttons on phones (`style.css:1658`), focus not held inside dialogs (`main.js:1066-1071`), M and Space with no switch (`main.js:482-491`). Contrast not measured | S | `style.css`, `main.js`, `ui/render.js` | Also fixes P-019's 8.8-px stage numbers |
| P-085 Three flashes | Not built | Not measured. Strikes come at most 250 ms apart (`core/formulas.js:130`) | S | `ui/scene.js` | None |
| P-086 Rarity twice | Not built | Not measured (ΔE) | S | `ui/render.js`, `style.css` | None |
| P-089 Accessibility note | Not built | Partly wrong: Settings has no "?" today. There is no banner, and its About entry is empty (`ui/render.js:2330-2370`, `ui/features.js:128`) | S, the "?" included | `ui/features.js`, `ui/render.js`, `wiki/content/faq.md` | After the switches of P-082 and P-084 exist |
| P-090 Screen readers | Partly | Partly: the battle's banner is already a polite live region (`ui/scene.js:141`) | M | `ui/scene.js`, `ui/render.js`, `main.js` | VoiceOver and TalkBack on a real phone (021) |
| P-091 Camp levels that work | Not built | True of the code: a token shows a level's bonus and its price only (`ui/render.js:444-463`). 51–67% is 022's | S–M once P-075's measure exists | `ui/render.js`, `systems/inventory.js` | After P-075, with the same measure. Against P-062 |
| P-092 Rewards priced like gold | Not built | True: fixed counts in the event's milestones and shop (`data/events.js:56-69`), and crate essence by the land's tier (`systems/daily.js:58`) | S–M | `data/events.js`, `systems/events.js`, `systems/daily.js`, `systems/dungeon.js`, `wiki/` | A balance change: after P-122, sized with P-114 |
| P-093 The hours the cap cut | Not built | True. The report shows the capped time in hours (`ui/render.js:2843-2844,2901`). The real time is already in its summary (`systems/offline.js:142,189`) | Under S | `ui/render.js` | None |
| P-094 Backups off the server | Partly | True: nightly dumps, 14 days, on the same disk (`deploy/vps/provision.sh:77-101`). Still open in the ROADMAP (`docs/ROADMAP.md:1285`) | S–M. The owner makes the bucket and its keys; plus who holds the encryption key, a restore drill and an alert | `deploy/vps/provision.sh`, a new unit, `README.md` | First of the safety items. Before P-013 and before any sale |
| P-095 Patched packages | Built (8a53d4d) | True: `inflate: false` (`api/index.js:11-12`), a 415 for a compressed body (`:1135`), express 5.2.1 | — | — | — |
| P-096 Revocable tokens | Not built | True. Tokens last 30 days (`api/index.js:18`), and only their name is checked (`:77-83`). A reset changes the hash and nothing else (`:283-297`) | S. The name check's 10-minute cache must clear when the version is bumped | `api/index.js`, `api/store.js`, `api/mail.js`, `main.js`, `test/api.test.cjs` | Each mail counts against the day's 100 (P-100) |
| P-097 Privacy page and cleanup | Not built | True. Rows keyed by address and by name are never cleaned out (`api/store.js:793-826`), emails are kept for good, and there is no privacy text | S–M | `api/store.js`, a timer in `deploy/vps/provision.sh`, a page | The wording after P-048 |
| P-098 Security headers | Partly | True. Static files get `nosniff` and a Referrer-Policy (`deploy/vps/nginx.conf:69-70`). There is no HSTS and no CSP, and Express sends X-Powered-By | S for HSTS, X-Powered-By and `frame-ancestors`. A CSP can't guard scripts without a rewrite: there are 185 inline handlers in `ui/` and `main.js`, and an inline script in `index.html:47-65`. `frame-ancestors` must name itch.io's player host and galaxy.click (README "Listings") | `deploy/vps/nginx.conf`, `api/index.js` | After P-066 (the fonts' origins) |
| P-099 Flags that list first | Not built | True: every flag acts at once and lasts 30 days (`api/index.js:404-406`; read at `:546,750,986,1052,1103`) | S–M | `api/index.js`, `api/store.js`, tests | Merge with P-025 and P-024 |
| P-100 Abuse guards | Partly | True. CORS is open to every site (`api/index.js:10`). Limits exist only on sign-in, sign-up and mail (`:142-174`). There is no alert near the mail cap and no Turnstile | S each, S–M together. Turnstile loads a third-party script | `api/index.js`, `deploy/vps/nginx.conf`, `ui/render.js` | Turnstile works against P-066's aim |
| P-101 Common passwords | Not built | True: only the length is checked (`api/index.js:64-71,286`) | S | `api/index.js`, a list file, tests | None |
| P-102 Origin for its own zone | Partly | True: the firewall lets in all of Cloudflare's ranges (`deploy/vps/provision.sh:43-50`). Narrower than it reads: nginx answers 444 to any other host name (`deploy/vps/nginx.conf:13-26`) | S–M | `deploy/vps/nginx.conf`, `deploy/vps/cloudflare.mjs` | None |
| P-103 Small hardening | Partly | Mixed. True: sign-up says when an email already has an account (`api/index.js:232`), though the reset route is careful (`:269-280`); deploys run as root (`deploy/vps/deploy.sh:9`); the README's gift example names a tester (`README.md:58-61`). Understated: the release folder belongs to the app user before `npm ci` runs as that user (`deploy/vps/activate.sh:22,25`), and then root installs the unit file and nginx.conf from it (`:32-33`), while bash is still reading `activate.sh` from it. A package's install script could reach root. Overstated: builders' names are escaped where they show (`ui/render.js:2509`) and can only hold `[A-Za-z0-9_-]` (`api/index.js:19`) | S | `deploy/vps/activate.sh`, `deploy/vps/deploy.sh`, `api/index.js`, `README.md` | None |
| P-104 Hydra like the boss | Not built | True. The Hydra ranks raw damage, capped at twice the plausible (`api/index.js:1036-1039`). The boss counts the fight against the hero's own plain attack (`:977-986`). "Forged gear" means a doctored save's gear: forging is gone | S–M | `api/index.js`, `core/power.js`, `data/social.js`, tests | The owner's call |
| P-105 A window for the fight | Not built | — | M or more. The scene is drawn by the page's `requestAnimationFrame` (`main.js:311-321`) and the game by a 100 ms timer (`main.js:278-309`). A hidden tab's timers are slowed, and long gaps replay as time away (`game.js:40,129-137`). The small window must drive both, and the styles must be copied into it. Chrome on desktop only | `main.js`, `ui/scene.js`, `ui/render.js`, `style.css` | A dock button fits the house rule |
| P-106 A Trial that bleeds | Not built | True: no rule takes a share of health (`data/trials.js:14-19,40-47`) | M: a `bite` key in `systems/combat.js`, a new weekly era (`data/trials.js:102-106`), its first stage measured (`tools/trials.mjs`), the wiki | `data/trials.js`, `systems/combat.js`, `tools/trials.mjs`, `wiki/` | P-108 first. Merge into P-063 as its ninth Trial; build P-109 with it; P-122 before its runs |
| P-107 A winter festival | Not built | True as a gap | M, not S–M. The game runs one event at a time (`systems/events.js:38-49`), so a two-week festival beside the weekend events needs two at once: status, tokens, shop, milestones | `systems/events.js`, `data/events.js`, `ui/render.js`, `core/state.js` | P-108 first. Takes in P-064's December idea |
| P-108 Completion that can't fall | Not built | Mostly. Every part divides by its own content, not just two (`systems/completion.js:29-40`): a new medal, pet, unique, monster or item type lowers it as well. The 1.3 points is the cloaks' case (a seventh). A ninth Trial costs about 1.0, and nothing today for a deep hero, because rungs fill the Trials bar (`:37`, `data/trials.js:92`) | S | `systems/completion.js`, `test/completion.test.mjs` | Before P-030, P-040, P-044, P-063, P-064, P-106 and P-107. Fold in P-026's Trials bar, and decide P-005 and P-117 at the same time |
| P-109 Second War Tree | Not built | True: an Unlearn costs 20,000 essence, ×1.5 each time (`data/talents.js:31`) | S–M | `data/talents.js`, `systems/talents.js`, `core/state.js`, `ui/render.js` | With P-106 |
| P-110 A way to the owner | Not built | True. Mails carry no Reply-To (`api/mail.js:20`), and Settings links only the Discord (`ui/render.js:2347-2351`) | S. Email Routing is set in Cloudflare | `api/mail.js`, `ui/render.js`, `wiki/` | Its clan "Report" link is P-025's report row |
| P-111 Changelog to Discord | Not built | True: a deploy posts nothing (`deploy/vps/deploy.sh`) | S. The webhook is a secret, kept off the repo | `deploy/vps/deploy.sh` | One changelog with P-016. Posts wait for the owner's yes, as it says |
| P-112 Discord for one | No code | — | Under S | the Discord's settings | None |
| P-113 Clan words | Not built | True: the description and "looking for" are set only at creation (`api/index.js:832`), and no route edits them | S | `api/index.js`, `api/store.js`, `ui/render.js`, tests | One pass with P-035 and P-009 |
| P-114 Pool check | Not built | True: the simulator books gold by sink, and nothing else (`tools/simulate.mjs:140,993,1034`) | S | `tools/simulate.mjs`, `tools/batch.mjs` | With P-122 |
| P-115 A day's floor | Not built | True. The Titan banks 3 hours (`data/dungeons.js:258-260`) and the laurel nothing (012). The crate banks 3 days (`systems/daily.js:13`) and clan attacks 2 (`data/social.js:16-17`) | S, but its test fails until P-059 and P-017 land | `docs/DESIGN.md`, a test | Lands with P-059 and P-017 |
| P-116 Refund on a weakening | A policy | True: migrations exist (`core/state.js`) | S each time | `core/state.js` | Needs P-016's card. P-062's refunds are one case of it |
| P-117 Secret medals | Not built | True. All three give power (`data/achievements.js:66-68`) and count in completion (`systems/completion.js:33`). The wiki lists them, marked as secret (`wiki/content/medals.md:28`), and says the Hall doesn't count them, which is true only of the Hall | S | `systems/completion.js`, `test/completion.test.mjs` | With P-108. Whether they keep their power is the owner's call |
| P-118 Next rung only | Not built | True: the Hall shows every open medal (`data/achievements.js:76-77`, `ui/render.js:1892`) | S | `ui/render.js` | The owner's call. It fits the ladder rule |
| P-119 Lines once, a Chronicle | Not built | True. A round's card repeats its stratum's line (`main.js:917-920`); to stage 2,440 that is 78 of 93 cards (evaluated). The Chronicle has no Lord, medal or Ascension kind (`systems/chronicle.js:10`) and drops its oldest entries past 200 (`:38`) | S–M, not S: new kinds, a cap that keeps the start, and old saves' entries | `main.js`, `systems/chronicle.js`, `ui/render.js`, `core/state.js` | With P-027 and P-028 |
| P-120 Dock offers the dungeon | Not built | Partly wrong: the dock has no dungeon button (`ui/render.js:536-551,663-693`). The nearest is its Map, whose pins hold the dungeons (`ui/worldmap.js:77-81,116-127`). The +190 to +270 comes from a copy of the simulator whose stall test P-122 says is broken | S–M: a new dock button, or a glow on Map and the pin, plus a test for "a run at its wall" (`combat.stallMs`, `systems/prestige.js:31-35`) | `ui/render.js`, `ui/worldmap.js`, a pure helper | P-122 first. No reward waits in a dungeon, so a glow there advises a move: that is close to "no suggestions". At the wall Prestige already glows (`systems/prestige.js:31-35`) |
| P-121 Second Chance | Not built | True: its second rank ends the regroup minute (`data/talents.js:115-116`, `systems/combat.js:649-653`). The gold lost is 032's | S | `data/talents.js`, `systems/combat.js`, `wiki/` | It makes a talent stronger, so P-116 asks for no refund |
| P-122 The simulator's stall test | Not built | True. The bot's fight ends after 15 minutes without a gain (`tools/simulate.mjs:554`), it re-decides every 10 minutes (`:966-969`), and each new fight restarts the clock (`:745`). Live heroes back it up: the best stands at 2,440 on a server whose database began fresh in October (027; README "The server"), so within about four weeks, while the bot's heroes reach 2,000 at 831–847 hours (032) | S for the fix; M for the batches it asks for | `tools/simulate.mjs` | Before any balance change, before refitting the growth check's climb (`core/power.js:169-171`, fitted to this bot), and before sizing P-024 |

## Notes

1. **P-120's button isn't there.** The dock (`ui/render.js:663-707`) has the run panel, the supplies, the camp, Prestige, Auto,
   Perks, Equip and the orders (Retreat, Stay at camp, Full screen, Map, Stay on this stage). The dungeons are reached from the Map's
   pins or the Dungeons tab. The sidebar's gold "!" on Dungeons (`ui/render.js:151-160`) is out of sight while the fight fills the
   screen.
2. **P-108 is wider than it says.** Every part's `of` is the size of its content: 54 medals, 12 pets, 8 uniques, the codex, the
   bestiary's stars, mastery's actions and 11 × 99 levels. Only the Titans (20) and the course (6) are fixed. Fixing all of them is
   still S, in one file. The Trials part is the odd one out: the count includes rungs (`data/trials.js:92`), so a deep hero
   fills it with Trials still uncleared, and a ninth Trial wouldn't lower it.
3. **P-024's next wall is the game's own.** `MAX_STAGE` is 10,000 (`core/state.js:351`), and a load clamps the stage there. At
   460 a week the best player would reach 6,000 in about eight weeks and 10,000 in about sixteen, if that pace held deep (it may not).
4. **P-059 and the growth check move together.** `titanKills` allows `flat: 3`, "a full bank of attempts won one after another"
   (`api/index.js:347-348`). The day's window restarts at the first upload after 24 hours (`api/index.js:386-387`), and an open page
   uploads every minute (`main.js:62`). With a bank of 24 and `flat: 3`, a player who comes back and wins banked Titans in a row
   soon after a window restarts would be flagged.
5. **P-075 needs one measure everywhere.** The dock's offer, the ▲ on tiles, Weaker, the bag's "worth keeping" and the sort all
   go through `itemScore` (`systems/inventory.js:78-81`). Change the card alone and the dock still offers a different piece from
   the one Weaker keeps.
6. **P-103's real item is the release folder,** not the names. As written it is listed as small hardening, but it is a path from
   any package's install script to root (`deploy/vps/activate.sh:22-33`).
7. **P-098's CSP can't protect scripts** while the screens are HTML strings with `onclick` handlers (160 `onclick`, 25 others).
   `script-src` would need `'unsafe-inline'`. The useful parts are `frame-ancestors`, `connect-src 'self'` and HSTS.
8. **P-107 and P-105 are bigger than they look.** Weekend events are one window at a time (`systems/events.js:38-49`). The small
   window depends on a loop that a hidden tab slows (`game.js:129-137`).
9. **Partly-built pieces the rows miss:** stage 501's round card already says "The strata come round again" (P-028); the battle's
   banner is already a live region (P-090); the hall's stage is already on each clan's row (P-034); framed players are already
   guests (P-065).
10. **Places the rows point to that don't exist:** renown (P-034), a "?" on the Guest pill (P-069) and a "?" on Settings (P-089).

## What overlaps, and what to merge

- **The flags:** P-024, P-025 and P-099, with 012's bug 6 and P-110's report link. One pass over `api/index.js:344-406` and
  the game's words for a flag.
- **Dead power deep:** P-023 decides. Then either make capped stats pay (P-061, P-062, and P-106 with P-109 through a Trial), or
  say plainly that they don't (P-075, P-091, and P-074's speed mark). The spill (P-062) and the cap-aware card (P-075) can't both
  ship as written.
- **The dock and the bag:** P-075, then P-076, P-077 and P-091, on one measure. P-078 goes with them, in `systems/inventory.js`.
  P-120's glow and P-105's button are new dock pieces. P-079's hand points at the dock's Equip and camp.
- **Completion:** P-108 with P-026's Trials bar, P-117 and P-005's rungs, in one change to `systems/completion.js`. P-030, P-040
  and P-044 then follow its rule: no power, and either fixed totals or kept out.
- **Looks as goals:** P-030, P-040, P-044 and P-005's trim. One art batch (`tools/resource_art.py` and the atlas) and one rule.
- **The story:** P-027, P-028 and P-119. One pass over the cards and the Chronicle, with the owner's lines.
- **Banked clocks:** P-115 is the rule, and P-059 and P-017 are its two cases. P-063's "Auto takes the week's Trial" answers
  the same problem as P-017: pick one.
- **The boss's clock wall:** P-120 (go to a dungeon), P-121 (keep the regroup's farming) and P-061 (the Bulwark at the clock) are
  three answers to the same stall. Measure them together after P-122.
- **Trials:** P-106 is P-063's ninth Trial. P-109 comes with it.
- **Events:** P-064's December festival is P-107. P-039 and P-092 touch the same files. All of them after P-108.
- **The clan list:** P-009, P-035, P-113 and P-025's report row. P-034 and P-031 go into P-004.
- **The Discord and the changelog:** P-016 and P-111 share one changelog, and P-043 can go out the same way. P-112 stands alone.
  P-110 is the door that isn't Discord. P-068 comes after P-065 and P-020.
- **Listings:** P-065 and P-067 are one link parameter.
- **Accounts:** P-096, P-101 and P-103's sign-up answer share the account routes and one test file.
- **The server's front:** P-098, P-100's CORS and P-102 share `deploy/vps/nginx.conf`, `api/index.js` and Cloudflare settings.
- **Privacy and law:** P-048, then P-097, P-070 and P-047's line. P-049 is their sum, plus the pages and the purchase table.
- **Accessibility:** P-084 with P-080, P-085, P-086 and P-082. P-089 then lists their switches.
- **Platforms:** P-008, then P-071 and P-073. P-073 also needs nginx's dot-path rule changed, and P-070 first.

## What must come first

- **P-122 before any balance change:** P-023's two other answers, P-059's runs, P-061, P-062, P-092, P-106, P-120, the parked
  boss's payout (P-026), and any refit of the growth check's climb (`core/power.js:169-171`). P-114 can ride with it.
- **P-108 before** P-030, P-040, P-044, P-063's ninth Trial, P-064, P-106 and P-107.
- **P-075 before** P-076, P-077 and P-091.
- **P-023's choice before** P-061 and P-062, or before P-075 and P-091 in their current wording.
- **P-024 within about eight weeks.** Then plan for `MAX_STAGE`.
- **P-059 with** P-115 and the growth check's `flat` (`api/index.js:348`).
- **P-016 before** P-116, and with P-111.
- **P-066 before** P-042 and before P-098's CSP.
- **P-065 and P-020 before** P-068 (from 21 November).
- **P-048 before** the wording of P-047, P-049 and P-097.
- **P-094 before** P-013 and before any sale.
- **P-008 before** P-071 and P-073; **P-070 before** P-073.
- **P-021 before** P-029; **P-004 before** P-034's renown and P-031.

## If the owner built ten things first

My pick, from what I checked: the most value for the effort and the least risk to players and to past decisions.

1. **P-024**: one constant (`api/index.js:346`), weeks before the best player is flagged, and the two deepest medals already lie past it.
2. **P-094**: every account and every backup sit on one disk. Nothing changes for players.
3. **P-122 with P-114**: tools only. Every deep balance number, and the growth check's climb, rests on this bot.
4. **P-026**: an hour or two of words and numbers, plus the extra raw-token spots and the wiki's "forge". Leave the parked boss for later.
5. **P-093**: one line. The real time away is already in the summary.
6. **P-074**: promised to a player on 1 November. A link and a mark.
7. **P-065 with P-067**: one URL parameter beside the framed-guest rule that already exists (`main.js:140-141`), and a count per tag. It is ready in time for the 21 November post.
8. **P-108**, with P-026's Trials bar: one file and its test, before any new Trial, festival or pet.
9. **P-103's release folder**, with a deploy user: closes the path from a package's install script to root.
10. **P-084**: WCAG A and AA faults, a few lines each, for every phone player.

Next in line: P-096, P-066, P-113 with P-035, P-069, P-016.

## Bugs noticed in passing

1. **More raw token counts** than P-026 lists: `ui/render.js:679` (the dock's Prestige tip), `:1653` (the Shop's button),
   `systems/prestige.js:88` (the log).
2. **"Best stage" that is the run's highest:** the Shop's prestige panel says "tokens for this run (best stage N)" with
   `combat.maxStage` (`ui/render.js:1650`). Everywhere else, "best stage" means `bestStage`.
3. **A script name that doesn't exist:** `deploy/vps/activate.sh:38` tells the operator to run `deploy/vps/cloudflare.sh` first,
   and `deploy/vps/provision.sh:5` and `deploy/vps/nginx.conf:4` name the same file. It is `deploy/vps/cloudflare.mjs` (`README.md:122`).
4. **Stale words outside the game:** the wiki's home says "forge your gear" (`wiki/pages/home.mjs:23`). The README's opening says
   twelve skills (there are eleven), six dungeons (there are eight: `data/dungeons.js:43-125`), "forge your own gear", and points
   Play at the old Vercel site (`README.md:3-13`).
5. **Still open from 012, at the same commit:** stored flags outlast a fix (`api/index.js:404-406`); `settings.numberFormat` is read
   nowhere (`core/state.js:152`); `describeOffline` is used only by a test (`systems/offline.js:200`).
