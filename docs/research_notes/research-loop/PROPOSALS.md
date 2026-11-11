# Proposals for Fantasy Idle, from the research loop

Every improvement the loop suggests, strongest first. Nothing here is built until the owner picks it.

- **Kind:** Add, Change or Remove.
- **Effort:** S (a day or less), M (a few days), L (a week or more). Checked against the code on 4 November (`012-proposals-against-the-code.md`).
- **Status:** new (not yet shown) → shown (put to the owner, with the date) → picked or declined (the owner's word) →
  built (the commit).
- **Evidence:** the findings files and their sources; a proposal with one source is marked thin.

## Ranked

### Fixes: sure, small, worth doing whatever else is chosen

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-024 | **Ceilings that keep up**: the server calls a best stage past 6,000 impossible and flags it. The best live player went from 1,980 to 2,440 in the week to 11 November: at that pace 6,000 is about eight weeks off. Two medals (7,500 and 10,000), and with them 100% completion, already lie past it | Change | S | 009, 012, 016 | shown 4 Nov; more pressing 11 Nov |
| P-025 | **A flagged player is told, and can answer**: plain words on what a flag does and how to contest it, short rules, a report row for clan names. In November false flags sat unnoticed for days, and the one word in the game was misread | Change | S–M | 001, 006, 010, 012 | new |
| P-026 | **The check's small fixes**: tokens as long raw digits (`ui/render.js:483,490,1650`); an empty bag's "a smith can forge it", with forging gone (`:1479`); cards understating XP under a skill potion (`:940,1055,1264,2102`); completion's Trials bar counting rungs (`systems/completion.js:37`); a parked boss pays about three times a plain stage, against `killPayout`'s comment (014) | Change | S | 012, 014 | new |
| P-074 | **The two fixes promised to a player on 1 November**: a link to the wiki in the game, and a mark when attack speed reaches its cap. Every one of twelve simulated deep heroes sat 7 to 48 points past it, so the affix, Focus's +15% and the top of Rogue were adding nothing (015) | Change | S | 001, 015 | new; promised "this week" |
| P-108 | **Completion that new content can't lower**: the Trials part divides by every Trial's tiers and the cloaks part by every festival, so a ninth Trial or a seventh festival would take about 1.3 points from a hero who has everything. Keep each part's total fixed and let new things fill it. P-063, P-064, P-106 and P-107 need it first | Change | S | 026 | new |
| P-093 | **The welcome-back report names the hours the cap cut**: 30 hours away reads "24h 0m" and "capped", with the six lost hours nowhere; Melvor and Cookie Clicker say them | Change | S | 022 | new |
| P-091 | **The camp says which levels still work**: past stage 1,000, 51–67% of camp gold buys Armour Rack and Hearth levels past the defence cap and past any threat. Each token shows its next level's worth in stages at the wall that binds, as items do. Moving that gold would add only 3.3 stages: honesty on the button, not power | Change | S–M | 013, 015, 022 | new |
| P-075 | **The Equip card counts the wall that binds**: past about stage 700 it credits armour with stages it doesn't give (a legendary plate: +19 said, 0 got, at 1,000), and the dock offers that plate before a sword. Count defence only below the 90% cap and health only while blows still threaten | Change | S–M | 013, 015, 017 | new |
| P-007 | **Faithless's card says the tokens come back** at the next prestige. (The pick line already says in numbers what a Trial pays, so this is one sentence) | Change | under S | 001, 004, 012 | half built |
| P-006 | **The boss says what it takes**: each level's attacks and striking's x1.33, behind the "?", which already gives level 1 and the strike's x2.5 | Change | S or less | 003, 005, 012 | shown 30 Oct; partly built |
| P-010 | **One table, three crowns**: no divisions below about eight clans (today four divisions crown the top three of each, so all five clans can wear one); a crown for 1st in levels felled, in depth per member who fought, and in most improved on the clan's own best | Change | S | 001, 003, 011, 012 | extended 4 Nov |
| P-058 | **Lower metals that can still be trained**: a slot works only the best metal it has held, so a lower metal trains by rerolling a worn low piece: 36,207 rerolls of a copper chest piece for mastery 99. The owner told a player "for now, yes" | Change | S–M | 001 | new; a player's question |
| P-002 | **Rates on the skill screens**: XP per hour and time to the next level in each skill's header; on a worked card, how long the materials last; on Agility's course, XP per hour per slot (a slot's three obstacles share time and XP, and every slot raises the rate, 12,000 to 57,459 an hour) | Add | S–M | 001, 002, 012 | shown 30 Oct |
| P-016 | **What's new, inside the game**: after a new version loads, a small card lists what changed; entries need a disclosure id, so a line can't spoil the War Tree at stage 20 | Add | S, plus a line at every deploy | 001, 004, 007 | shown 30 Oct |
| P-020 | **Say in the game how it was made**: a credits line in Settings saying exactly what Gemini made (the 161 pictures, edited how), what people made (the CC0 sprites), what is synthesized and how the code was written; the wiki already has the words. On Steam, games disclosing AI are recommended 68% against 86%, free ones 50%, and a disclosure that understates draws anger. Beside it, a human pass over the words a new player meets first | Change | S, hours | 004, 006, 012, 018, 020, 024, 025 | new |
| P-001 | **Crowns that read 1st, 2nd, 3rd**: tint the 1st gold, with the place in a tip a phone can show. The reporter withdrew it after reading the wiki, so this is polish | Change | S, hours | 001, 012 | shown 30 Oct |

### The big choices

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-004 | **Clan quests first, paying into the Hall** (answers the owner's open choice): four weekly quests of work every hero does, fed by uploads, scaled to members who played, capped per member, with no leader's click. Each pays hall work and renown. The five recent builds elsewhere all chose shared goals. A clan level is mostly there already (the Hall); wars need about 16 clans with 5+ active each | Add | M as shaped in 011 (L with buffs and talents) | 003, 006, 008, 011, 012, 014 | shown 30 Oct; reshaped and shown 4 Nov |
| P-063 | **Ascensions I to IV each open one piece** (the ROADMAP's open item): one thing new with each of the four that pay, shown on the Ascension card; saves already past get them at once; from V on, Stars only. Candidates for the owner's pick: Auto may take the week's Trial while its laurel is open, or a ninth and tenth Trial. Unnamed Space Idle's first Reinforces each paid a set piece; Synergism, AD and Revolution Idle open challenges with each layer | Change | M | 016 | new |
| P-021 | **An end boss behind a gate at stage 2,000**, off the ladder: one fixed fight, falling near 2,200, winnable without clicking; credits and a "Go on" button, then a crown, a ninth Trial and Echoes at 3,500 and 5,000. Its phases touch the declined boss laws; 009 gives the evidence and a plain fallback | Add | M | 004, 008, 009, 012 | shown 4 Nov |
| P-023 | **Does survival matter deep?** Past about stage 700 a fresh run stops dying, food buys nothing (0–2 dishes a run at stage 1,000), and defence has been past its 90% cap since about stage 180; 015 found the same to stage 2,300. The owner asked on 14 October for food to be crucial throughout. Making monsters' attack keep pace is off the table: it would make them hit ×38 harder at 1,300 and ×9,461 at 2,440, felling every deep live hero at once. Left: dishes that also give a fight bonus, the Bulwark paying at the clock (P-061), or leave it and say so | Change | S–M | 005, 013, 015 | shown 4 Nov; the owner's call |
| P-061 | **The Bulwark pays at the boss's clock**: 12 of its 14 talents add nothing at the wall past stage 1,300, and a 31-point Bulwark build scores −0.1 stages. Defence past the cap, health or a dodge could add attack or give clock time back (Second Wind could hold the clock 3 s once a boss). Size it near the Blade's 14 for 31 points; check stage 800, so defence doesn't become the best stat | Change | M | 013, 015 | new |
| P-106 | **A Trial that bleeds the hero**: each blow also takes a share of his max health that armour can't floor, as Trimps' Bogged does. Most of the Bulwark would then pay (Fortress, Second Wind, Rally, Lifeblood, the dodge line with its counters, Hamstring). A shape for P-063's ninth Trial and an answer to P-023 and P-061 that is a Trial the player picks, not a law on a boss | Add | M | 015, 026 | new |
| P-107 | **One festival on the calendar, started when the player chooses**: a two-week winter festival from about 18 December with its own cloak, which each player starts in its first week (as in Idling to Rule the Gods); the weekend rotation goes on around it. After P-108 | Change | S–M | 016, 026 | new |
| P-059 | **The Titan's three-hour bank**: a once-a-day player wins 29 Titans in 300 hours against an always-on player's 245, and Titans are worth 7–10% of the climb. A bank of a day; banked Titans fought while away (near the parked Quartermaster in spirit); or keep it and say the cadence on its "?" | Change | S to change, M with balance runs | 014 | new; the owner's call |
| P-064 | **A new festival every six weeks**: by week seven a player has met all six festivals and can own all six cloaks. One `EVENTS` entry and a new cloak each turn; no combat stats; optionally a December festival that opens a piece a day | Add | S–M each | 016 | new |
| P-003 | **A clan feed**: the Clan tab lists members' moments, from their uploads (a new best stage past each hundred, a Lord, a 99, a pet, a unique, a Trial tier). Hall gifts have one already; a member back after a month must not flood it | Add | S–M | 003, 008, 012 | shown 30 Oct; partly built |
| P-017 | **Laurels that wait**: a missed week's laurel can be won later. A missed Pact week costs ×1.16 on what the tokens give, for good; Jagex's "no benefit to logging in today versus tomorrow". Banking is S–M; "open three weeks" is M and must keep within the growth check | Change | S–M | 004, 008, 012 | shown 30 Oct |
| P-005 | **Rungs on the way to completion**: 100% can't be reached today (it needs the stage-10,000 medal, and mastery alone is near 4,800 hours). The owner decides what 100% means, then a trim on the cloak: eight rungs by about 70%, the top at 90%, as OSRS's log ranks are | Change | S–M | 002, 008, 012 | shown 30 Oct as a cape; reshaped and shown 4 Nov |

### Smaller additions

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-032 | **Hunts on the bestiary**: tap a kind's tile and the hero goes there, stays to its next star, then climbs again, in the replay too. From best stage 1,000 every run starts past the ten lands, so their 50 kinds' stars freeze; fetching all of them costs about 7.5 hours parked. No marks, no offers of three, no board: it survives the owner's "No suggestions" and the Quartermaster refusal | Add | S–M | 008, 014 | reshaped 11 Nov |
| P-062 | **Capped stats spill into damage**, deep drops without dead affixes, a reroll that keeps one bonus, and refunds for perks that do nothing deep: 51% of 490 worn affixes do nothing past stage 1,300, every deep hero is past the attack-speed cap, and Warlord's 275 skill points would be worth about 9.5 stages in Paragon. Diablo 3 and 4 took useless stats off loot. Keep dodge: Brutes, Glass Hero and the counters use it | Change | S–M | 015 | new |
| P-092 | **Rewards in materials priced like gold**: where the game pays a fixed count of essence, diamonds or bars (event milestones and shop, the crate, the Titan), pay a share of the hero's next forge or bench level. At hour 300 the event shop's 10 runite bars are 0.15% of the weapon's next level, with 2M essence unspent | Change | S–M | 022 | new |
| P-105 | **A small window for the fight**: where the browser has Document Picture-in-Picture (Chrome on desktop), a dock button moves the battle scene into an always-on-top window. Taskbar idle RPGs drew 50,099 reviews in under six months (TBH) | Add | M | 024 (medium) | new |
| P-076 | **Equip all**: once two pieces wait, one tap puts on the best for every slot. About six kinds of upgrade wait at nearly every return. After P-075 | Add | S | 017 | new |
| P-077 | **Weaker that stays**: with Weaker on, an Equip also takes what it made weaker; the pill glows once the bag first fills; automatic salvage gathers into a line a minute in the log. The bag is full from hour 10 to 39 and stays full unless swept by hand | Change | S | 017 | new |
| P-078 | **Undo the last sale or salvage**, a few seconds on the toast. Melvor's Undo Sell mod has 29,579 subscribers, and the sequel's players asked for a buy-back | Add | S | 017 | new |
| P-027 | **The Lords speak**: a line on each Lord's first fall, told in order, and a page of them in the Hall. Trimps tells its story this way; NGU's blank bosses and Soda Dungeon 2's silent end show the cost. It gives a finale something to end | Add | S | 009 | new |
| P-028 | **Act One at stage 500**: a card of its own for the Pandemonium Lord's first fall, with a line that the stair goes on. Many more players see a first close than the last | Change | S | 009 | new |
| P-034 | **A clan level as a shown number**: room levels plus renown on the header and list, no perks. It answers the owner's poll without a second ladder | Add | S | 011 | new |
| P-035 | **The clan list says who plays**: active members this week on each row, sorted by it, so newcomers find live clans | Change | S | 011 | new |
| P-009 | **"Last seen", and a leader away 30 days hands over** to the longest-serving active member. Today an absent leader stays for good. Rounded days: clanmates would see when someone plays | Add | S | 003, 012 | new |
| P-030 | **Boss pets, for looks only**: a rare companion from each of the eight dungeon bosses, about 100 hours of that boss. 90–97% of level-99 heroes already hold their skill pet, so nothing is left to hunt; OSRS's are hunted for years | Add | S–M | 008 | new |
| P-031 | **The clan's week: a skill to race**: a skill in turn each week, ranked by XP gained, worked out on the server. OSRS's clans build this themselves by the thousand. Thin while clans are small | Add | M | 008 | new |
| P-022 | **Where the power comes from**: one panel with each source's share (`tools/ledger.mjs` reckons it). Worked out on opening, and listing only what the player has met | Add | S–M | 002, 004, 012 | new |
| P-018 | **A notation setting**: letters as today, mixed (letters to 1e30, then 1.23e33, Antimatter Dimensions' default) or scientific. New saves could start on mixed; old saves keep letters. At stage 2,440 a monster's health reads 295QaDc today | Add | S | 004, 012, 019, 022 | new |
| P-019 | **Text size**: an 11 px floor on phones first (the stage numbers are 8.8 px; 34–63% of a phone's words are under 12 px), then a setting kept per device, and Chrome's `text-scale` tag so rem type follows the phone (150% already fits at 390 px) | Add | S, then S–M | 004, 012, 019, 021 | new |
| P-037 | **A battery saver**, on by default on phones, kept per device: a lower frame rate and still glows once the page has been left alone. Painting costs the most, so the CSS matters more than a frame cap | Add | S–M | 004, 005, 012 | new |
| P-038 | **Clanmates in the hall**: members' heroes, in their looks, in the Hall's painting. Needs the look stored at upload; up to 20 heroes at 390 px | Add | S–M | 006, 012 | new |
| P-041 | **Hold to strike**, as an accessibility setting: holding strikes at the rate a macro gets; the click and its combo stay. Reopens a deliberate choice; at the clan boss it is perfect play | Change | S | 006, 012 | new |
| P-044 | **Bestiary sets that pay**: a land whose kinds all have three stars pays in convenience or looks, as OSRS's diaries do, rather than power | Add | S–M | 007, 008, 012 | new |
| P-043 | **A monthly "state of the realm"**: server totals as a Discord post, in the owner's words | Add | S | 006, 012 | new |
| P-040 | **Collector goals without power**: a rare shiny form of a pet, a trimmed cape. Kept out of the completion figure, which only ever rises | Add | S–M | 006, 012 | new |
| P-039 | **A shared goal in weekend events**: every player's progress raises a small bonus for all, each player's share capped (one Idle Clans player gave 14% of a 77.5-billion meter); or one boss for the whole realm, fought by each saved hero as the clan boss is, a level higher after each fall (Firestone's monthly god). Off the boards and the clan boss | Add | M | 006, 012, 024, 025 | new |
| P-008 | **The game starts without the server**: a service worker keeps the files. 305 files and no build step, so the deploy must write the list; never on a local host | Add | M | 002, 012 | new; risk of stale files |
| P-012 | **Music**: a quiet loop per group of lands, human-made (CC0 or licensed and credited, never AI), its own volume, a fade between lands, stopped while hidden unless the player turns on music in the background. Melvor's silence cost it at the door; Melvor Idle 2's music leads its demo's praise | Add | M | 002, 020 | new; licences first |
| P-013 | **Save history**, so lost progress can be undone. An owner's restore by SQL is S, and nightly dumps exist; a player's button is M or more, since an open game re-uploads over a restore, and it rubs against the removal of rollback | Add | S, or M+ | 002, 004, 012 | new |
| P-015 | **A newcomer's banner from the next week**. As it stands this would take the banner from a new clan's first week, so it needs a founder's exception or a wait in hours | Change | S | 003, 012 | new; low priority |

### Later or thin

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-060 | **A weekend board**: a 3×3 of things the hero has opened, filled by play and the replay, a line paying tokens, the board a hem on the festival cloak. No server. Against it: it is a list of things to do, the removed quest board's shape, and no idle game has one | Add | M | 014 (thin) | new; the owner's call |
| P-033 | **Pin a goal in the Next slot**: after the last unlock the card stays blank. The player sets it, so it is no suggestion note, but it stretches the house rule | Add | S | 008 (thin) | new |
| P-036 | **A rival of the week**, on numbers that exist. No game does just this | Add | S–M | 011 (thin) | new; later |
| P-029 | **First to fell**: the server keeps who felled the end boss first | Add | S, after P-021 | 009 (thin) | new |
| P-014 | **Bad luck protection for pets**. Weakened: OSRS has none, and pets here are near sure by 99 | Change | S | 002, 008 (thin) | new |
| P-045 | **Projected gains**: "away 8 hours: about this many stages". A closing page can't show it, and an honest figure needs a replay on a clone | Add | M | 007, 012 (thin) | new |
| P-042 | **Translations**, Simplified Chinese first, with a native speaker checking: the median idle game on Steam has 34% of its reviews in other languages, Chinese the largest. There is no text layer yet, and the fonts must come from the game's own server first (P-066) | Add | L or more | 006, 012, 018 | new |
| P-046 | **A guest's save on the server**. Not recommended: L, and it reverses the owner's "opening account should restart the process, not move it" | Change | L | 006, 012 | new; against a past decision |

### Readability, feel and accessibility

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-084 | **The measured accessibility faults, in one pass**: 24-px stage buttons on phones and larger checkboxes, a broken `font` rule repaired, focus kept inside dialogs, nothing focused under the hotbar, a backing for Farming's header, unpicked supplies above 4.5:1, words for badges, and a switch for the M and Space shortcuts (WCAG A and AA) | Change | S | 021 | new |
| P-080 | **Every tip a phone can open**: 121 of 134 hover tips never show on a phone, the monster's three numbers among them; the chips, pills, the monster's line and the hero's stat rows join the tap targets | Change | S | 019, 021 | new |
| P-079 | **The hand points again at the first wall**: in a first run, after a fall or a boss that held out, the hand points at a waiting Equip, then a camp level, before the boss. A player who pressed only where the hand pointed fell at the stage-20 boss with 658–679 gold unspent | Change | S | 019 | new |
| P-081 | **A wall that repeats goes quiet**: the first fall or timeout at a stage keeps its jingle, banner and toast; repeats within ten minutes play a soft cue and fold into one counted toast. At stage 300 a hero fell about twice a minute, each with a defeat jingle and a red edge | Change | S | 020 | new |
| P-085 | **At most three monster flashes a second**: striking four times a second makes five, on up to 90% of WCAG's area limit on big sprites | Change | S | 021 | new |
| P-086 | **Rarity told twice**: a mark per rarity on the tile, as pips; for deuteranopes Rare and Epic look the same (ΔE 1.0). The War Tree's ready frame too | Change | S | 021 | new |
| P-082 | **Effects that turn down one by one**: vibration apart from sound (a basic guideline), and under Reduce motion switches for floating numbers, coin flights, confetti and the boss's shake, each shown once met; blows heard at every hit or only for crits and kills. A watched fight makes 83–92 sounds a minute | Add | S | 020, 021 | new |
| P-089 | **An accessibility note**: the switches and keys behind Settings' "?" and on the wiki; stores will ask for it (Steam's features, Apple's labels) | Add | S | 021 | new |
| P-090 | **The fight for screen readers**: a hidden summary of stage, health and monster, as Trimps has, and polite lines for a boss, a fall, a level and a rare find | Add | M | 021 | new |
| P-083 | **Thin, from the shots and the code**: each painting's landmark kept in view on phones (a focal point per painting), and a work sound per skill in place of the one shared sound | Change | S | 020 (thin) | new |

### Safety and operations

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-095 | **The API on patched packages**, compressed bodies refused | Change | S | 023 | built 11 Nov (8a53d4d), on the owner's word |
| P-094 | **Backups off the server, encrypted and tested**: every account and every nightly dump sits on one disk, and no restore has been tried. A nightly encrypted copy to object storage (Cloudflare R2's free tier covers it), a monthly restore into a scratch database, an alert when a night is missed | Add | S | 023 | new; the first to do |
| P-096 | **Tokens that can be revoked**: a 30-day token survives a password reset today. A version per account in each token, bumped by a reset and a "Sign out everywhere"; a mail when the password changes | Change | S | 023 | new |
| P-097 | **A privacy page and a cleanup job**: emails and IP-keyed counters are kept with no privacy text, no retention rule and no deletion. The law asks for the notice at collection, sale or not; the wording waits for P-048's lawyer | Add | S–M | 010, 023 | new |
| P-098 | **Security headers**: HSTS through Cloudflare, a CSP with `frame-ancestors` for the listings and `connect-src 'self'`, `X-Powered-By` off | Change | S | 023 | new |
| P-100 | **Abuse guards**: CORS limited to the game's origin; Turnstile on sign-up and reset; an alert near the 100-mails-a-day cap; a per-address request limit on the API | Change | S | 023 | new |
| P-099 | **Flags that list before they act**: only the ceilings act at once; a save that grows fast within the limits goes on a weekly list for the owner. Players elsewhere resent silent fixed limits most (IdleOn) | Change | S–M | 023, 024 | new; with P-025 |
| P-101 | **Refuse common passwords** at sign-up and reset (NIST asks for a blocklist) | Change | S | 023 | new |
| P-102 | **An origin that answers only its own zone**: authenticated origin pulls or a tunnel, as the firewall admits all of Cloudflare's ranges | Change | S–M | 023 | new |
| P-103 | **Small hardening**: one answer at sign-up whether an email is used or not; the release folder kept root's while packages install; a deploy user; builders' names escaped; a placeholder name in the README's gift example | Change | S | 023 | new |
| P-104 | **The Hydra counted like the boss**: depth from how the fight went against the hero's own plain attack, so forged gear stops counting there. Against: gear would stop counting at the Hydra, which may be its point | Change | S–M | 023 | new; the owner's call |

### Finding players

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-065 | **A link that starts as a guest**, for posts and listings: straight into the fight, the account one click away, while the bare address keeps the sign-in first. The beta post's top comment was "Instant downvote for needing an account"; galaxy.click refuses email walls; CrazyGames puts guests first. Today 46 words and three fields stand before the first blow, and only 52% of accounts came back after a day (027) | Change | S | 018, 019, 027 | new |
| P-066 | **Serve the two fonts from the game's own server**: one blocking request to Google gone, which is also unreliable in mainland China and drew a court award in Munich | Change | S | 018 | new |
| P-069 | **Keep a guest's game on phones**: ask the browser to persist the save, and say on the Guest pill's "?" that Safari clears a site's data after seven days away unless it's on the Home Screen | Add | S | 018 | new |
| P-067 | **Count where accounts come from**: a tag on each listing's link, counted at sign-up with no personal data. At 45 accounts nobody can tell which channel works | Add | S | 018 | new |
| P-068 | **A second post from 21 November** (the sub allows one in 30 days): the guest link, a title naming free browser and phone play and the clan boss, a clip of the fight, one question, the full disclosure (P-020). Melvor Idle 2 opens on Steam only, and its players asked about phones and browsers | Change | S | 018 | new; the owner's call |
| P-070 | **Delete my account**, in Settings and by a web page. Both app stores require it, and so does P-049's groundwork | Add | S–M | 018 | new |
| P-071 | **Opt-in push** for a full bank of crates and full offline time, accounts only, after P-008 | Add | M | 018 (thin demand) | new |
| P-073 | **Google Play as a Trusted Web Activity**, the same site; a closed test of 12 testers for 14 days first. The App Store last | Add | M | 018 | new |
| P-072 | **Steam later**: a Playtest to try a shell, then a page for Next Fest in June 2027. The web stays free | Add | L | 010, 018 | new |

## Money: the owner's later plan

The evidence is in `010-money.md`; it is input to the owner's decision (ROADMAP, Decisions 2), not a recommendation to sell or not to. At 43 accounts money is negligible in any model, so it supports stating the plan now and charging at a store launch or a larger size.

**Whatever is chosen:**

| # | Proposal | Kind | Effort | Status |
|---|---|---|---|---|
| P-048 | **One page of questions to a lawyer and an accountant.** In Turkey, game-platform duties took effect on 1 November 2026, including for natural persons, with no size floor on the rating duty; no source says whether a developer's own site counts. If it does, the duty applies with nothing on sale | Add | S | new; the most time-sensitive here |
| P-047 | **Say the plan in public**: `index.html` says "nothing to buy". Melvor's one sour note when it began charging was an old promise | Change | S | new |
| P-049 | **Groundwork before any sale**: terms, privacy, refund and contact pages; an age question, spending off for minors; flags with an appeal (P-025); purchases in a server table with revocation; backups off the server | Add | M | new |
| P-050 | **Ask the players** what may be sold, as OSRS and Milky Way Idle did. Thin at tens of voters | Add | S | new |
| P-057 | **Never sell**: offline hours, random items, a tradable currency, one hero's extra clan attacks or potions. Each has a named cost in 006, 007 and 010 | Remove | S | new |

**The options, least risk first:**

| # | Option | Brings (estimates, unverified) | Risk | Effort |
|---|---|---|---|---|
| P-051 | A: tips or a supporter badge | Tens to hundreds of dollars a month at best | Almost none | S–M |
| P-052 | B: one price at a store launch, a free tier, existing accounts keep all | $137,000 in six weeks (Scapewatch) to millions over years (Melvor), less the store's 30% | Where the free tier stops in a clan game; Steam's Wallet rule | L |
| P-053 | C: paid expansions | Melvor's yearly $4.99 | Judged by content; new power behind a price | L |
| P-054 | D: capped power that play can also earn (the owner's plan in its mildest form with a record, in solo games only) | Unknown here; such games score 92–95% | Compounding, buyers' standing, balance changes bound by what was sold | L |
| P-055 | E: a capped buy that lifts the whole clan, through the Hall (Clicker Heroes, at 89%) | Unknown | Clans pressing members to pay; must stay out of the Hydra ranking | M–L |
| P-056 | F: an open store of gems, passes and packs | The most money at scale; the evidence doesn't support it at this size | IdleOn's 26%, Milky Way Idle's dispute, regulators; needs phones and an audience | L |

## Research the loop will do before proposing

In the queue (`README.md`): a cross-browser check (Firefox, Safari); why the sensible bot climbs faster when sent away from the boss wall (013); how the Golbin Raid, Melvor's roguelite side mode, was received; task systems and a design for Hunts; whether to post near Melvor Idle 2's launch on 17 November 2026 (the owner's call).

## Deliberate choices the research questions (kept unless the owner reopens them)

- **Clicking pays:** a hand or macro at two clicks a second fells about twice an idle hero on easy stages. Players
  dislike idle games that reward sustained clicking (004); the owner keeps the click and calls a macro fair play.
- **A guest's game doesn't move to an account, and saves can't be exported** (001, 004): it keeps unchecked saves off
  the clans and boards; the cost is a player who wants an account later starts over.
- **The camp is bought by hand** (004: manual work should become automation): the Quartermaster is parked by the owner.

## Waiting on the owner from before this loop

- The clan ideas (27 October 2026): clan level and talents, clan wars, clan quests. The Clan Hall, the owner's
  favourite of them, is built (DESIGN §3.35). The owner's roadmap post (28 October, #general) asked players to vote
  between levels and quests; by 30 October it had no votes (001). P-004 now recommends quests first.
- ROADMAP's long-game items: an end boss (P-021), early Ascensions that each open something new, a cape for 100%
  completion (P-005).
- An in-game wiki link and a mark at attack speed's cap: the owner told a player on 1 November both would come "this
  week" (001). Not built.

## Declined or parked (kept so they are not proposed again without new evidence)

- A Wardrobe of bought looks (declined 27 October: "I want players to see their gear").
- The Quartermaster, a camp auto-buyer (parked 27 October: it would make prestiging stronger).
- Boss laws, rules that change the bosses (declined 27 October: rules on the walls go unnoticed). P-021 brings back one
  case, and says so.
- The clan rulers' habits (parked 27 October for a better clan idea).
- Ascend into a Trial (P-011, a player's idea): withdrawn 1 November. Faithless lasts one run and the tokens come back at
  the next prestige, so any prestige works.
- An announcement about the false flags, and giving back attacks beyond the one player's 4 (declined 4 November).
