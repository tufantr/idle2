# Fantasy Idle — Development Roadmap

How to take the game from its current state (a working, tested v2 core) to a finished idle RPG. The
phases follow the research report's dependency order
([Roadmap section](reports/Fantasy%20Idle%20game%20design%20research.md#roadmap-six-phases-ordered-by-dependency-each-with-a-measurable-exit)),
updated for what the v2 rewrite already delivered. Each phase has a measurable exit condition — most
of them are checked by the test suite or the balance simulator, not by feel.

**Effort sizes** assume one developer working part-time: **S** = a few days, **M** = 1–3 weeks,
**L** = 1–2 months. **Design details** for everything already built are in [`DESIGN.md`](DESIGN.md).

---

## Where things stand

| Phase | Status |
|---|---|
| 0 — Stop the bleeding | ✅ Done |
| 1 — Core rewrite + simulator | ✅ Done |
| 2 — Retention scaffolding | ✅ Done |
| 3 — Loot and endgame depth | 🟡 Loot, dungeons, uniques, Titan and pets done; mastery and drop-tier alignment open |
| 4 — Skill breadth | ⬜ Not started |
| 5 — Social layer | ⬜ Not started (backend groundwork done) |

Before any of this ships, three owner decisions are open — see [Decisions for the owner](#decisions-for-the-owner).

---

## Phase 0 — Stop the bleeding ✅

Fix every defect that destroyed progress or data. All items are pinned by regression tests in
`test/game.test.mjs` and `test/save.test.mjs`.

- [x] Equipment generation threw on every call (`getRandomRarity`), burning bars for nothing
- [x] Logging out (or any missing token) overwrote the save with a blank one after 10 s
- [x] Hard Reset removed the wrong localStorage key
- [x] Offline progress crashed on load if a workshop action was active
- [x] The daily reward could never fire on saves made after the tutorial bypass
- [x] Achievement rewards were text only
- [x] The Coal Wagon was an infinite gold loop
- [x] Save on tab hide/close; keep corrupted saves under a backup key; survive errors inside a tick
- [x] API: hard-coded JWT secret, tokens that never expire, no input validation
- [x] Committed SQLite database with a real user row, `.DS_Store` files

**Exit (met):** an item is produced from bars; logout preserves the save; hard reset wipes;
workshop offline loads; a failing tick no longer stops saving.

## Phase 1 — Core rewrite + simulator ✅

Rebuild the game as pure functions over data tables so the same code drives the UI, offline replay,
tests and the balance simulator.

- [x] Data-driven modules (`src/data`, `src/core`, `src/systems`) behind a DOM-free `Game` class
- [x] RuneScape/Melvor XP curve; retuned node tables; interval model with additive speed bonuses
- [x] Zones with authored enemies and loot tables; combat XP and levels; wear requirements
- [x] Rating-based defence capped at 90%; food, potions, regen; death retreats to the zone start
- [x] Quality-plus-affix rarity; essence upgrades; crafted tools
- [x] Prestige with held tokens and perks; camp upgrades as the run-scoped gold sink
- [x] Headless simulator (`tools/simulate.mjs`) and pacing table (`tools/pacing.mjs`)
- [x] **Boss timer**: a boss must fall within 30 s of fighting, or you regroup one stage back for
      60 s and the game retries automatically (works offline too)
- [x] **Smithing level offsets per piece** (Weapon +0 … Body +9; Ring +0 … Amulet +4) so each metal
      unlocks piece by piece
- [x] **Smithing pacing**: forging XP ×1.5, coal 1/2/2/3; coal from mining 15. `tools/pacing.mjs` now
      has a mine → smelt → forge row: smithing 50 in 4.6 h, 75 in 34 h, 99 in 275 h

**Exit:** simulator shows Lv 20 ≤ 15 min, Lv 50 in 2–4 h; first prestige within ~2 h with ≥ 4
tokens; a tier-N common beats a tier-(N−1) legendary (test); at least half of deaths on non-boss
stages averaged over 3 seeds. *Current: all met except Lv 20 (10–20 min) — see DESIGN §5.*

## Phase 2 — Retention scaffolding ✅

What a returning player touches first: offline, onboarding, saves, the daily loop, UI comfort.

- [x] Offline replay of any action (gathering, workshop, combat) with the online code, capped
- [x] Predicate-based unlocks with a next-goal hint; developer unlock-all switch
- [x] Achievement multiplier (+1% per achievement) and 20 achievements
- [x] Daily crate (20 h, no streaks)
- [x] Versioned save, prototype-save migration, export/import string
- [x] Mini-games as timed opportunities
- [x] Number formatting (K/M/B), toasts instead of `alert()`, reduced-motion option, mobile tab strip
- [x] **Idle "focus" bonus**: +15% skill and attack speed after 60 s without input, also offline
- [x] **Bankable daily crates**: one ripens every 20 h, up to 3 wait; gold, essence, materials, a gem
      (save format v3 with a migration from v2)
- [x] **Save backups**: three rotating slots every 10 min, plus on load, before prestige and before a
      hard reset or import; restorable from Settings. **Compressed exports** (`FI3:`, deflate)
- [x] **Queued modals** (the offline report is never hidden by the login prompt); Escape closes
- [x] **Advisor panel** ("Next steps" on the combat tab): daily crate, skill points, better gear in the
      bag, the next piece to forge, food, camp, tools, prestige timing, what gates the next metal
- [x] **Render on change** (revision counter; at most every 150 ms, at least every 1 s); keyboard
      activation of cards, focus kept across re-renders, ARIA labels, visible focus rings
- [x] **Offline replay** in 1 s combat steps, silent (no per-hit events); a 12 h replay runs in well
      under a second

**Exit:** offline and online give the same results for the same action and duration (test: ±1 ore
over 10 min); a new save reveals a second tab within 3 min and first gear within 10 min (the
simulator forges its first sword within the first few minutes); export → import round-trips (tests
for both formats). Still open: an active/idle ratio check once the simulator can play mini-games.

## Phase 3 — Loot and endgame depth 🟡

Give combat its own rewards beyond gold and materials, and give the late game goals besides stages.
Depends on Phase 2's versioned saves (items gain new fields).

- [x] **Gear drops**: rare from regular kills, 50% from a boss's first fall in a run; tier = zone
      tier −1 (60%) / same (35%) / +1 (5%); rarity weights better than crafting and rising with zone
      tier. Two **drop-only tiers** above runite: Dragonbone (Skyreach) and Abyssal (the Abyss).
      Crafted gear caps at Rare
- [x] **Boss payouts by health**: a boss pays its bonus (gold ×3, XP ×5, loot table) only when
      beating it moves you on; farming a beaten boss pays like the regular monsters its health is
      worth, so parking on a boss is never the best farm
- [x] **Salvage**: dropped gear → essence (tier × rarity), crafted gear → ~40% of its bars; half of
      upgrade essence refunded. **Reforge** rerolls affixes (cost ×1…×10). **Item lock**
- [x] **Bag of 40** with auto-salvage overflow (the weakest unlocked item goes, never an upgrade) and
      an auto-salvage rarity filter for drops
- [x] **Dungeons** (four): authored elites + a boss with a 60 s timer, gear locked inside, the run
      lost on death/leave/timeout, auto-repeat; the chest holds a fragment, essence, materials, often
      a gem and sometimes boss-quality gear; permanent milestones at 10/50/100 clears. Placed where a
      typical player reaches each unique's tier, and tuned with the simulator to ~1.2× the progress of
      spending the same time fighting on the ladder
- [x] **Uniques** with fixed affixes, assembled from 50 fragments (1 per clear, 3% chance of 3) or a
      0.2% chest drop; a notch above crafted power of their tier, never a tier skip
- [x] **Titan**: an hourly 60-second damage race; each Titan defeated is permanent +2% ATK and HP and
      the next is stronger; a loss pays essence for the damage dealt
- [x] **Pets**: Melvor's formula (`interval_s × level / 25,000,000` per action), one per skill,
      +3% to that skill (combat: ATK and DEF), kept through prestige; a Collection page lists pets
      and uniques
- [ ] **Mastery** per node (Melvor model: doubling, preservation, interval) — M, optional
- [ ] **Drop tiers vs the crafting spine**: with enough combat time drops still out-gear crafting
      (Dragonbone by ~10 h for a combat-heavy player vs ~60 h for a skiller); align zone loot tiers
      with the crafting timeline — part of the next balance pass

**Exit:** simulator shows drops as treats rather than the gear spine for every play style, 0.1–0.5%
capstones, a unique in about an hour of at-level dungeon farming; no drop is ever silently discarded.

## Phase 4 — Skill breadth ⬜

More skills, chosen for how much they interlock per unit of effort (research ranking). Depends on
Phase 3 (dungeons and drops create the demand these skills feed).

- [ ] **Fishing** (S): second food source; fish feed cooking; zone drops add bait
- [ ] **Firemaking** (S): burns logs for XP and a timed global XP bonfire — the log sink
- [ ] **Farming** (S–M): wall-clock plots that grow while another action runs — the first parallel skill;
      grows herbs for alchemy and crops for cooking
- [ ] **Agility** (M): a course of obstacles bought with gold and materials, each granting a permanent
      modifier — the late-game gold sink
- [ ] **Tool chains for the new skills** (rod, tinderbox, hoe)

**Exit:** every resource id has at least one consumer (add a test that scans the data); Farming
progresses while another action runs; gold sinks absorb ≥ 80% of steady-state income in the sim.

## Phase 5 — Social layer ⬜

Last on purpose: the most successful solo-developer idle games (Melvor, Idle Champions) stayed
single-player, and the failures in the research all came from social features that outran their
backend. Everything here must be asynchronous. **Blocked on the owner decisions below.**

- [x] Groundwork: real accounts, bcrypt, expiring JWTs, cloud save with a conflict prompt
- [ ] **Server-side offline time**: the server stamps `receivedAt` on each save; offline gains use it
      instead of the client clock — S
- [ ] **Plausibility checks** on upload (monotonic progress, XP-per-hour ceilings) — flag, don't reject — S
- [ ] **Clan MVP** (M): clans with looking-for flags; one weekly shared-HP boss, 3 attempts per member
      per day, **damage computed on the server** from the stored save (the client never submits a
      number); rewards for participation, top 3, the kill and the last hit; clan-only weekly board;
      polling only while the Clan tab is open (≥ 60 s); a Discord widget instead of in-game chat
- [ ] **Events template** (M once, S per event): start/end window, modifiers, capped daily drops,
      milestone rewards, an event shop
- [ ] **Opt-in weekly leaderboards** on server-computed metrics only, with a consent flow — S–M

**Exit:** no client-submitted damage numbers; under 100k function invocations a month at 100 daily
players (Vercel Hobby budget); privacy consent before the first board.

## Deferred on purpose

Ranged/Magic combat styles with Fletching/Runecrafting (L); Township or Summoning-scale systems;
real-time chat; synchronous party content; gacha pets; any purchasable power.

---

## Decisions for the owner

1. **Set `JWT_SECRET` in Vercel before deploying this branch.** The API now refuses to issue tokens
   without it (the old code silently used a public hard-coded secret). Accounts created with the old
   API keep working — passwords are unchanged, players just log in again, and an old cloud save is
   migrated on load like a local one.
2. **Monetization and hosting.** Vercel's Hobby plan is for non-commercial use. Decide before Phase 5
   whether the game stays free, becomes paid (Melvor's model), or uses cosmetics — the research found
   pay-for-power plus social features to be the combination that forces a server-authoritative rewrite.
3. **`api/node_modules` is still committed** (1,099 files). `.gitignore` keeps it tracked until a
   preview deployment confirms Vercel installs dependencies from `api/package.json`; then remove it
   with `git rm -r --cached api/node_modules`.
4. **Old database row in git history.** `api/fantasy-idle.db` (removed in this change) held a username
   and a bcrypt password hash; it is still in the repository's history. If that password is used
   anywhere else, change it.
5. **Balance intent.** The simulator puts level 99 at ~100–130 h per skill and the 100 authored stages
   at ~20–30 h. If the game should be longer (Melvor-like 99s at 150–400 h), lower late-node XP;
   the knobs are listed in DESIGN §5.4.

## Working on the roadmap

1. Change data or formulas (`src/data/*`, `src/core/formulas.js`).
2. `node --test test/*.test.mjs test/*.test.cjs` — must stay green.
3. `node tools/pacing.mjs` and `node tools/simulate.mjs --hours=150 --seed=1` (and a second seed) —
   compare against the phase's exit numbers and DESIGN §5.
4. Open the game (`npx serve .` or any static server, then `?dev=1` to unlock every tab) and play the
   changed part.
5. Update DESIGN.md if a number in it changed.
