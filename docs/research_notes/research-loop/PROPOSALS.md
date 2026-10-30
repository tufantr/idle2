# Proposals for Fantasy Idle, from the research loop

Every improvement the loop suggests, strongest first. Nothing here is built until the owner picks it.

- **Kind:** Add, Change or Remove.
- **Effort:** S (a day or less), M (a few days), L (a week or more).
- **Status:** new (not yet shown) → shown (put to the owner, with the date) → picked or declined (the owner's word) →
  built (the commit).
- **Evidence:** the findings files and their sources; a proposal with one source is marked thin.

## Ranked

| # | Proposal | Kind | Effort | Evidence | Status |
|---|---|---|---|---|---|
| P-001 | **Crowns that read 1st, 2nd, 3rd**: tint the 1st gold and title the ranking's crowns with the place; today all three look silver | Change (a bug a player reported) | S | 001 | shown 30 Oct |
| P-002 | **Rates on the skill screens**: XP per hour and time to the next level in each skill's header; on a production card, how long the materials last; on Agility's course, XP per hour and what each obstacle changes in it | Add | S | 001, 002 (Melvor's most-installed mods; Melvor Idle 2's praised readouts) | shown 30 Oct |
| P-016 | **What's new, inside the game**: after a new version loads, a small card lists what changed, from a changelog written with each deploy | Add | S | 004 (a developer visibly there), 001 (players who never read the Discord) | shown 30 Oct |
| P-003 | **A clan feed**: the Clan tab lists members' moments, from their uploads (a new best stage past each hundred, a Lord, a 99, a pet, a unique, a Trial tier) | Add | S–M | 003 (OSRS and Scapewatch broadcasts) | shown 30 Oct |
| P-017 | **Laurels that wait**: a missed week's laurel can still be won later (each week's Trial open three weeks, or laurels banked as crates are) | Change | S–M | 004 (FOMO: time-limited permanent power is a top hate); today a missed Pact week costs x1.16 on what the tokens give, for good | shown 30 Oct |
| P-004 | **Clan quests and clan levels together** (the open clan choice): four weekly quests met by playing, each paying clan XP and a buff the clan picks; a small share of members' XP to the clan; levels open clan talents; wars later | Add | M–L | 003 (Idle Clans, IdleOn, Tap Titans 2) | shown 30 Oct; answers the owner's open choice |
| P-005 | **The cape for 100%** (the open ROADMAP item): the Hall's completion percentage already exists (eleven parts, `src/systems/completion.js`); a cape when it reaches 100% | Add | S | 002 (Melvor's Completion Log and capes) | shown 30 Oct (as figure and cape; the figure exists, corrected in round two) |
| P-021 | **An end boss that ends the story, with the climb going on** (the open ROADMAP item): a finale with its own celebration at a deep stage, then endless play | Add | M | 004 (arcs with an ending are loved; "no endgame" is hated) | new |
| P-006 | **The boss says what it takes**: the clan fight and the Clan tab show the attacks each level takes and what striking and a potion multiply, so a small clan sees its way to the top | Change | S | 003 (corrected: three members striking with a potion IV fell all seven; 13 only if they just watch) | shown 30 Oct (as a resize; corrected in round two) |
| P-007 | **Trial cards and Pacts show what they pay** before the choice | Change | S | 001 (a player's "why three?"), 004 (needing Discord is a top hate) | new; check the current pick line first |
| P-020 | **Say in the game how it was made**: a credits line in Settings (paintings made with Gemini, sprites from Dungeon Crawl Stone Soup, sounds synthesized) | Change | S | 004 (AI art is a live grievance on r/incremental_games; disclosure debate, July 2026) | new |
| P-018 | **A notation setting**: letters as today, or scientific everywhere, one switch point | Add | S | 004 (notation fights, forced switches) | new |
| P-022 | **Where the power comes from**: one panel with each source's share (tokens and records, camp, gear, banner, talents, Titans, supplies) | Add | S–M | 004 (breakdowns), 002 (Melvor's modifier sources) | new; check the hero's panel first |
| P-008 | **The game starts without the server**: a service worker keeps the files, network first for the page and `version.json` | Add | M | 002 (Melvor's top complaint) | new; risk of stale files |
| P-009 | **"Last seen", and a leader away 30 days hands over** to the longest-serving active member | Add | S | 003 (OSRS, Idle Clans) | new |
| P-010 | **One ranking table while clans are few** (no divisions below about eight clans), with each clan's own best week | Change | S | 001, 003 | new |
| P-019 | **A text-size setting**: small, normal, large, tested at 390 px | Add | S–M | 004 (Feedback Friday: tiny text, no UI scale) | new |
| P-011 | **Ascend into a Trial** (paseux's idea, which the owner is weighing): Faithless first, a candidate for "Ascensions that each open something new" | Add | M | 001, 004 (prestige that only resets is hated) | new; measure Faithless's tiers first |
| P-012 | **Music**: a quiet track per land with its own volume, from CC0 sources | Add | M | 002 (Melvor refunds over silence; Melvor Idle 2's praised music) | new; licences first |
| P-013 | **Per-account save history** on the server, so lost progress can be undone | Add | S–M | 002, 004 (losing progress is a top hate) | new; overlaps the public roadmap's off-server backups |
| P-014 | **Bad luck protection for pets** after twice the expected time | Change | S | 002 (thin: rarity is part of a pet's worth) | new |
| P-015 | **A newcomer's banner from the next week** | Change | S | 003 (Idle Clans' 48-hour wait; the Hydra's own rule) | new; low priority |

Research the loop will do before proposing (in the queue): a skip test per system with the simulator; a cross-browser
check (Firefox, Safari); the battle scene's CPU and battery use; whether the growth check can flag an honest player
after a sleep; how the Golbin Raid, Melvor's roguelite side mode, was received; task systems; whether to post near
Melvor Idle 2's launch on 17 November 2026 (the owner's call).

## Deliberate choices the research questions (kept unless the owner reopens them)

- **Clicking pays:** a hand or macro at two clicks a second fells about twice an idle hero on easy stages. Players
  dislike idle games that reward sustained clicking (004); the owner keeps the click and calls a macro fair play.
- **A guest's game doesn't move to an account, and saves can't be exported** (001, 004): it keeps unchecked saves off
  the clans and boards; the cost is a player who wants an account later starts over.
- **The camp is bought by hand** (004: manual work should become automation): the Quartermaster is parked by the owner.

## Waiting on the owner from before this loop

- The clan ideas (27 October 2026): clan level and talents, clan wars, clan quests. The Clan Hall, the owner's
  favourite of them, is built (DESIGN §3.35). The owner's roadmap post (28 October, #general) asked players to vote
  between levels and quests; by 30 October it had no votes (001). P-004 suggests both together.
- ROADMAP's long-game items: an end boss (P-021), early Ascensions that each open something new (P-011), a cape for
  100% completion (P-005).

## Declined or parked (kept so they are not proposed again without new evidence)

- A Wardrobe of bought looks (declined 27 October: "I want players to see their gear").
- The Quartermaster, a camp auto-buyer (parked 27 October: it would make prestiging stronger).
- Boss laws, rules that change the bosses (declined 27 October: rules on the walls go unnoticed).
- The clan rulers' habits (parked 27 October for a better clan idea).
