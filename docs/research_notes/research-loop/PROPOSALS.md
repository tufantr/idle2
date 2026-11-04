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
| P-024 | **Ceilings that keep up**: the server calls a best stage past 6,000 impossible and flags it. At today's pace the best live player gets there in about four months. Two medals (7,500 and 10,000), and with them 100% completion, already lie past it | Change | S | 009, 012 | new |
| P-025 | **A flagged player is told, and can answer**: plain words on what a flag does and how to contest it, short rules, a report row for clan names. In November false flags sat unnoticed for days, and the one word in the game was misread | Change | S–M | 001, 006, 010, 012 | new |
| P-026 | **The check's small fixes**: tokens as long raw digits (`ui/render.js:483,490,1650`); an empty bag's "a smith can forge it", with forging gone (`:1479`); cards understating XP under a skill potion (`:940,1055,1264,2102`); completion's Trials bar counting rungs (`systems/completion.js:37`) | Change | S | 012 | new |
| P-007 | **Faithless's card says the tokens come back** at the next prestige. (The pick line already says in numbers what a Trial pays, so this is one sentence) | Change | under S | 001, 004, 012 | half built |
| P-006 | **The boss says what it takes**: each level's attacks and striking's x1.33, behind the "?", which already gives level 1 and the strike's x2.5 | Change | S or less | 003, 005, 012 | shown 30 Oct; partly built |
| P-010 | **One table, three crowns**: no divisions below about eight clans (today four divisions crown the top three of each, so all five clans can wear one); a crown for 1st in levels felled, in depth per member who fought, and in most improved on the clan's own best | Change | S | 001, 003, 011, 012 | extended 4 Nov |
| P-058 | **Lower metals that can still be trained**: a slot works only the best metal it has held, so a lower metal trains by rerolling a worn low piece: 36,207 rerolls of a copper chest piece for mastery 99. The owner told a player "for now, yes" | Change | S–M | 001 | new; a player's question |
| P-002 | **Rates on the skill screens**: XP per hour and time to the next level in each skill's header; on a worked card, how long the materials last; on Agility's course, XP per hour per slot (a slot's three obstacles share time and XP, and every slot raises the rate, 12,000 to 57,459 an hour) | Add | S–M | 001, 002, 012 | shown 30 Oct |
| P-016 | **What's new, inside the game**: after a new version loads, a small card lists what changed; entries need a disclosure id, so a line can't spoil the War Tree at stage 20 | Add | S, plus a line at every deploy | 001, 004, 007 | shown 30 Oct |
| P-020 | **Say in the game how it was made**: a credits line in Settings; the wiki already has the words. Honesty about AI is cheaper before anyone asks (Ensis against Scapewatch). P-021's credits would settle it too | Change | S, hours | 004, 006, 012 | new |
| P-001 | **Crowns that read 1st, 2nd, 3rd**: tint the 1st gold, with the place in a tip a phone can show. The reporter withdrew it after reading the wiki, so this is polish | Change | S, hours | 001, 012 | shown 30 Oct |

### The big choices

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-004 | **Clan quests first, paying into the Hall** (answers the owner's open choice): four weekly quests of work every hero does, fed by uploads, scaled to members who played, capped per member, with no leader's click. Each pays hall work and renown. The five recent builds elsewhere all chose shared goals. A clan level is mostly there already (the Hall); wars need about 16 clans with 5+ active each | Add | M as shaped in 011 (L with buffs and talents) | 003, 006, 008, 011, 012 | shown 30 Oct; reshaped 4 Nov |
| P-021 | **An end boss behind a gate at stage 2,000**, off the ladder: one fixed fight, falling near 2,200, winnable without clicking; credits and a "Go on" button, then a crown, a ninth Trial and Echoes at 3,500 and 5,000. Its phases touch the declined boss laws; 009 gives the evidence and a plain fallback | Add | M | 004, 008, 009, 012 | new |
| P-023 | **Does survival matter deep? A second wall past stage 700**: past about there a fresh run stops dying, food buys nothing (0–2 dishes a run at stage 1,000), and defence has been past its 90% cap since about stage 180. The owner asked on 14 October for food to be crucial throughout. Three ways: monsters' attack keeps pace (a supplied hero loses nothing, food worth half a potion, harder blows at once); dishes that give a fight bonus; or leave it and say so | Change | S to change, M with balance runs | 005, 013 | new; the owner's call |
| P-003 | **A clan feed**: the Clan tab lists members' moments, from their uploads (a new best stage past each hundred, a Lord, a 99, a pet, a unique, a Trial tier). Hall gifts have one already; a member back after a month must not flood it | Add | S–M | 003, 008, 012 | shown 30 Oct; partly built |
| P-017 | **Laurels that wait**: a missed week's laurel can be won later. A missed Pact week costs ×1.16 on what the tokens give, for good; Jagex's "no benefit to logging in today versus tomorrow". Banking is S–M; "open three weeks" is M and must keep within the growth check | Change | S–M | 004, 008, 012 | shown 30 Oct |
| P-005 | **Rungs on the way to completion**: 100% can't be reached today (it needs the stage-10,000 medal, and mastery alone is near 4,800 hours). The owner decides what 100% means, then a trim on the cloak: eight rungs by about 70%, the top at 90%, as OSRS's log ranks are | Change | S–M | 002, 008, 012 | shown 30 Oct as a cape; reshaped 4 Nov |

### Smaller additions

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-027 | **The Lords speak**: a line on each Lord's first fall, told in order, and a page of them in the Hall. Trimps tells its story this way; NGU's blank bosses and Soda Dungeon 2's silent end show the cost. It gives a finale something to end | Add | S | 009 | new |
| P-028 | **Act One at stage 500**: a card of its own for the Pandemonium Lord's first fall, with a line that the stair goes on. Many more players see a first close than the last | Change | S | 009 | new |
| P-034 | **A clan level as a shown number**: room levels plus renown on the header and list, no perks. It answers the owner's poll without a second ladder | Add | S | 011 | new |
| P-035 | **The clan list says who plays**: active members this week on each row, sorted by it, so newcomers find live clans | Change | S | 011 | new |
| P-009 | **"Last seen", and a leader away 30 days hands over** to the longest-serving active member. Today an absent leader stays for good. Rounded days: clanmates would see when someone plays | Add | S | 003, 012 | new |
| P-030 | **Boss pets, for looks only**: a rare companion from each of the eight dungeon bosses, about 100 hours of that boss. 90–97% of level-99 heroes already hold their skill pet, so nothing is left to hunt; OSRS's are hunted for years | Add | S–M | 008 | new |
| P-031 | **The clan's week: a skill to race**: a skill in turn each week, ranked by XP gained, worked out on the server. OSRS's clans build this themselves by the thousand. Thin while clans are small | Add | M | 008 | new |
| P-022 | **Where the power comes from**: one panel with each source's share (`tools/ledger.mjs` reckons it). Worked out on opening, and listing only what the player has met | Add | S–M | 002, 004, 012 | new |
| P-018 | **A notation setting**: letters as today, or scientific, one switch point | Add | S | 004, 012 | new |
| P-019 | **A text-size setting**, kept per device. The code is small (nearly all type is rem); checking every screen at 390 px is the work | Add | S–M | 004, 012 | new |
| P-037 | **A battery saver**, on by default on phones, kept per device: a lower frame rate and still glows once the page has been left alone. Painting costs the most, so the CSS matters more than a frame cap | Add | S–M | 004, 005, 012 | new |
| P-038 | **Clanmates in the hall**: members' heroes, in their looks, in the Hall's painting. Needs the look stored at upload; up to 20 heroes at 390 px | Add | S–M | 006, 012 | new |
| P-041 | **Hold to strike**, as an accessibility setting: holding strikes at the rate a macro gets; the click and its combo stay. Reopens a deliberate choice; at the clan boss it is perfect play | Change | S | 006, 012 | new |
| P-044 | **Bestiary sets that pay**: a land whose kinds all have three stars pays in convenience or looks, as OSRS's diaries do, rather than power | Add | S–M | 007, 008, 012 | new |
| P-043 | **A monthly "state of the realm"**: server totals as a Discord post, in the owner's words | Add | S | 006, 012 | new |
| P-040 | **Collector goals without power**: a rare shiny form of a pet, a trimmed cape. Kept out of the completion figure, which only ever rises | Add | S–M | 006, 012 | new |
| P-039 | **A shared meter in weekend events**: every player's progress raises a small bonus for all. Events' first tie to the server | Add | M | 006, 012 | new |
| P-008 | **The game starts without the server**: a service worker keeps the files. 305 files and no build step, so the deploy must write the list; never on a local host | Add | M | 002, 012 | new; risk of stale files |
| P-012 | **Music**: a quiet track per land with its own volume, from CC0 sources | Add | M | 002 | new; licences first |
| P-013 | **Save history**, so lost progress can be undone. An owner's restore by SQL is S, and nightly dumps exist; a player's button is M or more, since an open game re-uploads over a restore, and it rubs against the removal of rollback | Add | S, or M+ | 002, 004, 012 | new |
| P-015 | **A newcomer's banner from the next week**. As it stands this would take the banner from a new clan's first week, so it needs a founder's exception or a wait in hours | Change | S | 003, 012 | new; low priority |

### Later or thin

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-032 | **Hunts, a Slayer for the idle hero**: pick one of three kinds, a count that runs while away, marks that buy bag rows and looks, never power. It could send a strong hero back to other monsters and feed the 549 bestiary stars. Risk: the climb pays more, so nobody hunts. Design first | Add | L | 008 | new; in the queue's task item |
| P-033 | **Pin a goal in the Next slot**: after the last unlock the card stays blank. The player sets it, so it is no suggestion note, but it stretches the house rule | Add | S | 008 (thin) | new |
| P-036 | **A rival of the week**, on numbers that exist. No game does just this | Add | S–M | 011 (thin) | new; later |
| P-029 | **First to fell**: the server keeps who felled the end boss first | Add | S, after P-021 | 009 (thin) | new |
| P-014 | **Bad luck protection for pets**. Weakened: OSRS has none, and pets here are near sure by 99 | Change | S | 002, 008 (thin) | new |
| P-045 | **Projected gains**: "away 8 hours: about this many stages". A closing page can't show it, and an honest figure needs a replay on a clone | Add | M | 007, 012 (thin) | new |
| P-042 | **Translations**, with a native speaker checking; two-thirds of Milky Way Idle's reviews aren't English. There is no text layer yet | Add | L or more | 006, 012 | new |
| P-046 | **A guest's save on the server**. Not recommended: L, and it reverses the owner's "opening account should restart the process, not move it" | Change | L | 006, 012 | new; against a past decision |

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
