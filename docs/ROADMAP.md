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
| 3 — Loot and endgame depth | ✅ Done |
| 4 — Skill breadth | ✅ Done |
| 5 — Social layer | ✅ Done |
| 6 — Game feel | ✅ Done |
| 7 — Make it feel like a game | ✅ Done |

The six phases of the original plan are built, including the optional mastery, and a four-part code review (combat,
skilling, saves and API, UI) has been worked through: 28 confirmed bugs fixed, plus several suspected
ones, with regression tests. Phase 6 then gave it the look and feel of a game: a battle scene,
reward moments, a dark fantasy theme, an armory, a world map and a phone hotbar. What is left is content and the owner's
decisions: a new weekend event is one entry in `src/data/events.js`, a new dungeon one entry in
`src/data/dungeons.js` (DESIGN §5.4 lists the balance knobs); the items under
[Deferred on purpose](#deferred-on-purpose) stay out until players ask for them.

Before this ships, a few things need the owner (a deployment setting, a history clean-up) — see [Decisions for the owner](#decisions-for-the-owner).

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
stages averaged over 3 seeds. *Current: met except Lv 20 (10–20 min) and the death split: with the
boss timer, bosses became the DPS check and 6–74% of deaths (by seed) land on regular stages — see
DESIGN §5.3.*

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

## Phase 3 — Loot and endgame depth ✅

Give combat its own rewards beyond gold and materials, and give the late game goals besides stages.
Depends on Phase 2's versioned saves (items gain new fields).

- [x] **Gear drops**: 0.2% of regular kills, 50% of a boss's first fall in a run; tier = the zone's
      gear tier −1 (60%) / same (35%) / +1 (5%); rarity weights better than crafting and rising with
      tier. Two **drop-only tiers** above runite: Dragonbone (Abyss depth 3+) and Abyssal (depth 5+).
      Crafted gear caps at Rare
- [x] **Gear tiers follow the crafting spine**: each zone has a `gearTier` set from when a typical
      player first gets there (prestige outruns smithing), so drops are a tier ahead at most; checked
      with three play styles in the simulator (skiller, AFK pusher, dungeon user)
- [x] **Boss payouts by health**: a boss pays its bonus (gold ×3, XP ×5, loot table) only when
      beating it moves you on; farming a beaten boss pays like the regular monsters its health is
      worth, so parking on a boss is never the best farm
- [x] **Salvage**: dropped gear → essence (tier × rarity), crafted gear → ~40% of its bars; half of
      upgrade essence refunded. **Reforge** rerolls affixes (cost ×1…×10). **Item lock**
- [x] **Bag of 40** with auto-salvage overflow (the weakest unlocked item goes, never an upgrade) and
      an auto-salvage rarity filter for drops
- [x] **Dungeons** (four): authored elites + a boss with a 60 s timer, gear locked inside, the run
      lost on death/leave/timeout, auto-repeat; the chest holds a fragment, essence, materials, often
      a gem and sometimes boss-quality gear; permanent milestones at 25/100/250 clears. Placed where a
      typical player reaches each unique's tier, and tuned with the simulator to ~1.5× the progress of
      spending the same time pushing the ladder
- [x] **Uniques** with fixed affixes, assembled from 50 fragments (1 per clear, 3% chance of 3) or a
      0.2% chest drop; a notch above crafted power of their tier, never a tier skip
- [x] **Titan**: an hourly 60-second damage race; each Titan defeated is permanent +2% ATK and HP and
      the next is stronger; a loss pays essence for the damage dealt
- [x] **Pets**: Melvor's formula (`interval_s × level / 25,000,000` per action), one per skill,
      +3% to that skill (combat: ATK and DEF), kept through prestige; a Collection page lists pets
      and uniques
- [x] **Mastery** per action (Melvor's model without the pool): 77 actions level 1–99 by doing them
      (99 after ~50 h on one action); each level adds speed, double chance and a chance to keep the
      ingredients; three achievements reward total mastery; kept through prestige, replayed offline
- [x] **The stage 200 wall**: every simulated player stopped at the stage 200 boss once gear stopped
      improving (Abyssal at depth 5). Deep-Abyss drops now scale ×1.8 per depth, so the climb slows
      but never stops (stage 234–264 at 150 h, 321–327 at 300 h)
- [x] Fix (found by the mastery pass): a spare unique arrived locked, and a bag full of locked spares
      salvaged every new drop on arrival, upgrades included. Spares now arrive unlocked, and the best
      upgrade for each slot is never auto-salvaged (the bag overflows instead)
- [x] **Late-game pass**: the simulator's player now reaches stage 180–200 in 150 h, farms the
      Dragon's Lair (Dragonheart Plate at 18–55 h) and finds Abyssal gear; the plateau was the bot's
      policy (forging pieces weaker than it wore, farming outgrown dungeons, a fixed prestige
      threshold). Added the Essence Cache (open-ended gold sink) and the Paragon perk (open-ended
      skill-point sink); the prestige screen lists what survives and says to spend gold first

**Exit:** simulator shows drops as treats rather than the gear spine for every play style (met: an
AFK pusher's weapon reaches tier 4 at 14–37 h vs 11–12 h for a skiller); 0.2% capstones (met: a
unique outright per 500 clears, or 50 fragments in about an hour of at-level farming); no drop is
ever silently discarded (met: overflow and filters salvage).

## Phase 4 — Skill breadth ✅

More skills, chosen for how much they interlock per unit of effort (research ranking). Depends on
Phase 3 (dungeons and drops create the demand these skills feed).

- [x] **Fishing** (S): seven spots, a second food line that heals a little more than meat; bait from
      the wetter zones (and the Shop) gives each catch a 50% chance of a second fish
- [x] **Firemaking** (S): burns logs for XP — the log sink — and feeds a wall-clock bonfire worth
      +5–10% XP to every skill for up to an hour
- [x] **Farming** (S–M): six plots that grow on the clock while another action runs (and offline) —
      the first parallel skill; four herbs for Alchemy and four crops for new dishes; flat seed prices
- [x] **Agility** (M): a six-slot course; obstacles cost gold and materials and grant permanent
      bonuses that survive prestige; upgrades to level 5 are the long-term gold sink
- [x] **Tool chains for the new skills**: fishing rods (Crafting), tinderboxes and hoes (Smithing)
- [x] Pets, achievements, mini-games (Fishing, Firemaking), advisor hints and offline-summary lines
      for the new skills
- [x] Fix: the Forager perk's bonus was malformed and did nothing; a test now checks every bonus in
      the data is well-formed

**Exit (met):** every resource id has at least one consumer (`test/skills.test.mjs` scans the data);
Farming progresses while another action runs (plots are timestamps); gold sinks absorb over 90% of
income while the agility course is being built (the first ~50–90 simulated hours). After that, late
Abyss income dwarfs every bounded sink and most gold resets with the run — see DESIGN §5.3.

## Phase 5 — Social layer ✅

Last on purpose: the most successful solo-developer idle games (Melvor, Idle Champions) stayed
single-player, and the failures in the research all came from social features that outran their
backend. Everything here is asynchronous. Owner decisions taken (see below): the game stays free with
nothing for sale, so the Vercel Hobby plan fits; players' numbers are computed on the server only.

- [x] Groundwork: real accounts, bcrypt, expiring JWTs, cloud save with a conflict prompt
- [x] **Server-side offline time**: `/api/load` returns the server's clock and the time of the last
      upload; the client replays that gap instead of trusting its own clock
- [x] **Plausibility checks** on upload: every ranked number may grow only as fast as play could in
      the real time since the last upload, under absolute ceilings — flag, don't reject; flagged
      accounts are left out of leaderboards and clan boss sizing for 30 days
- [x] **Clan MVP**: clans of up to 20 with looking-for lines; a weekly shared-HP boss sized from the
      members' power; 3 attacks per member per day (a unique per-day slot in the database), **damage
      computed on the server** from the stored save; rewards for participation, top 3, the kill and the
      last hit, claimed once; clan-only weekly board; polling only while the Clan tab is open (≥ 60 s);
      an optional Discord link instead of in-game chat
- [x] **Opt-in leaderboards** on server-computed metrics only (best stage, total level, Titans,
      dungeon clears; all time or this week), with a consent line and one-click opt-out
- [x] Data layer in one module (`api/store.js`); API tests run on an in-memory store by default and on
      a real Postgres with `API_TEST_DATABASE_URL` (checked against PostgreSQL 16)
- [x] **Events template** (M once, S per event): four weekend events in rotation (Friday–Monday
      UTC, from the calendar, so no server and no requests), modifiers through the pipeline, Festival
      Tokens capped at 60 a day, milestones at 50 / 100 / 150, an event shop; a new event is one data
      entry, and `?dev=1&event=<id>` runs one for testing

**Exit (met):** no client-submitted damage numbers (attacks ignore anything the client sends); under
100k function invocations a month at 100 daily players (the Clan tab polls once a minute only while
open, saves go up once a minute, events need no requests); privacy consent before the first board.

## Phase 6 — Game feel ✅

Playtesting feedback: the systems work, but the screens read like a spreadsheet, not a game. This
phase is presentation only (no balance changes): show the fight, celebrate rewards, and give the game
one visual identity (dark fantasy: carved serif lettering, stone and bronze, gold accents).

- [x] **Battle scene** (`src/ui/scene.js`): a painted stage above the Combat tab with its own backdrop
      per place (ten zones, the Abyss, dungeon halls, the Titan), the knight against the monster,
      health bars with a damage trail, lunges and knockback, damage and crit numbers, coins that fly
      to the gold counter, loot beams for rare and better drops, boss entrances and victory or defeat
      banners, the combo meter, a campfire while resting, and a stage path whose cleared stones are
      buttons. Built once and driven by game events, so tab re-renders never cut an animation short;
      honours reduced motion and caps effects per frame for background-tab catch-up
- [x] **Reward moments** (`src/ui/rewards.js`): a celebration card with rays and confetti for
      milestone levels (every tenth, 99) and any level that opens something (it names what: "Mining 10 ·
      Iron Vein"), new tabs (which also get a "New" badge until visited), pets, uniques, prestige,
      mastery 99 and event milestones; one card at a time, merged by key, skipped while the tab is
      hidden. The daily crate shakes, bursts open and hands out its loot one line at a time, with a
      button for the next banked crate. The gold counter rolls up to a new total
- [x] **Dark fantasy theme** across every tab: night stone panels with bronze hairlines and gilded
      corner brackets, carved headings (Cinzel), parchment text; bronze for the primary action, gilded
      buttons for spending gold, arcane purple for prestige and perks, war red for going into battle;
      a coin for each currency; skill actions as medallions. About 280 lines of dead prototype CSS
      went with it, and the phone header now fits the purse on one row
- [x] **RPG screens**: the Inventory is an armory. The hero stands among his twelve slots (armour on
      one side, jewellery on the other, weapon and shield below). The bag is a grid of tiles with
      rarity frames, upgrade levels, locks and a ▲ on anything better than what is worn. The item on
      the table (picked, or just hovered on a desktop) shows its stats, affixes, how it compares with
      the piece it would replace, and every action; on a phone it slides up as a sheet. A **world
      map** of the ten zones sits in the combat orders: a zone reached this run is a click away
- [x] **Quest board**: the advisor's suggestions pinned up as parchment notes
- [x] **Work you can see** (`src/ui/actionfx.js`): every finished action pops what it made off the
      card that made it (+2 🪨 in gold for a double, gems, crafted gear in its rarity color) with its
      XP, and the card's medallion takes the hit
- [x] **A phone hotbar**: the fight, the current work, the armory (▲ when an upgrade waits) and the
      daily crate, one thumb away

**Exit:** a new player sees the fight within one click; no layout shift when bosses or banners
appear; every tab passes the overflow and console check at 390 px and 1350 px.

## Phase 7 — Make it feel like a game ✅

Playtest feedback after Phase 6: "too static, word-like". A research pass on game feel
([notes](research_notes/game-feel.md)) set the rules: answer every action in three senses, show
progress as motion, art before words, one stage with a HUD around it.

- [x] **Real sprites, not emoji** (`tools/atlas.py`, `assets/sprites.png`, CC0 tiles from Dungeon
      Crawl Stone Soup): every monster and boss, the Titan's five faces, equipment icons for every
      slot and tier, and the hero as a paperdoll of layers, so he visibly wears what is equipped,
      in the battle scene and the armory alike. One 172 KB atlas, drawn crisp at 3–6×
- [x] **Sound and touch** (`src/ui/sound.js`): every action has a short synthesized sound (Web
      Audio, no files): hits, crits, dodges, coins, drops by rarity, level-ups, unlocks, the boss
      drum, chests, prestige, UI clicks; a phone also buzzes. One setting, a mute button in the
      header, nothing before the first interaction, a cap on sounds per moment
- [x] **The skill stage** (`src/ui/stage.js`): above every skill tab the hero stands in that
      skill's scenery with its tool and works on the chosen node: his swing follows the real
      action progress, a ring fills with it, the work lands on the beat and pops off the target
- [x] **Progress everywhere**: an XP bar under every skill in the sidebar, the next unlock as a filling
      bar in the header (each unlock now measures its own progress), and purse chips that bump when a
      currency changes
- [x] **A text diet**: the long explanations (prestige, forging, jewellery, events, dungeons, cloud save)
      fold into a "How it works" disclosure, so icons and numbers come first
- [x] **Press feel**: every button depresses on click (with its click sound); the active skill card's
      medallion pulses
- [x] **Painted backdrops** (`tools/backdrops.py`, `assets/backdrops/`): every battle place and every
      skill stage is an illustrated landscape instead of CSS silhouettes: three parallax layers (sky,
      far, near) painted from noise, gradients, glow and fog (a sun over the meadow, moonlit pines,
      stalactites and crystals, drowned columns under light shafts, a volcano with lava rivers, snow
      peaks under an aurora, islands in cloud, the Titan's silhouette on the horizon), and tiled CC0
      dungeon floors and walls for the interiors. Fifteen scenes, about 1 MB of WebP in all, drawn by
      a script in a minute with no image model and no downloads

## Phase 8 — Art and polish (in progress)

- [ ] **Hand-painted backdrops** (`docs/art/gemini.md`, `tools/paint.py`): one Gemini painting per
      place (17 prompts in one consistent style) replaces the scripted layers of that place in the
      battle scene and on its skill stages. The pipeline is ready and tested with stand-ins; Claude
      in Chrome can't reach a browser from a cloud session, so the paintings are made by hand or by
      a Claude session on the owner's computer, then imported with one command

- [x] **Pixel-art resources** (`tools/resource_art.py`): all 73 resources have an icon in the
      sprite atlas instead of a shared emoji: DCSS gems, potions, meat, fruit and herbs (recolored
      per tier), and ores, bars, logs, fish and dishes drawn in the same manner, each ore's stone
      and each bar tinted by its metal. They show on skill cards, recipes, the stage, work and
      drop pops, the battle HUD, level-up lists and the daily crate
- [x] **A bank, not a list**: the Materials panel is a grid of tiles with counts (73 materials
      fit in about five rows on a desktop) and the picked one opens below with its uses and Sell
      buttons; on phones that strip sticks above the hotbar

- [x] **Faces instead of symbols**: the world map shows each zone's boss (a lit silhouette until
      reached), dungeon cards their boss, the Titan panel the Titan's face; the twelve pets are DCSS
      creatures (a stone beetle, a sapling, a hound, ...) shown as silhouettes until found, as are
      the unique items; farm plots go from a tilled mound to a sprout to a young plant to the crop

## Deferred on purpose

Ranged/Magic combat styles with Fletching/Runecrafting (L); Township or Summoning-scale systems;
real-time chat; synchronous party content; gacha pets; any purchasable power.

---

## Decisions for the owner

1. **Set `JWT_SECRET` in Vercel before deploying this branch.** The API now refuses to issue tokens
   without it (the old code silently used a public hard-coded secret). Accounts created with the old
   API keep working — passwords are unchanged, players just log in again, and an old cloud save is
   migrated on load like a local one.
2. **Monetization and hosting — decided:** the game stays free with nothing for sale, which fits
   Vercel's Hobby plan (non-commercial). If that changes, the research's warning stands: pay-for-power
   plus social features is the combination that forces a server-authoritative rewrite. Clans and
   leaderboards also need `POSTGRES_URL` (Vercel Postgres) — tables are created on the first request.
3. **`api/node_modules` is still committed** (1,099 files). `.gitignore` keeps it tracked until a
   preview deployment confirms Vercel installs dependencies from `api/package.json`; then remove it
   with `git rm -r --cached api/node_modules`.
4. **Old database row in git history.** `api/fantasy-idle.db` (removed in this change) held a username
   and a bcrypt password hash; it is still in the repository's history. If that password is used
   anywhere else, change it.
5. **Balance intent.** The simulator puts level 99 at ~60–130 h for most skills (Farming ~290 h,
   Agility ~210 h) and the 100 authored stages at ~5–12 h depending on play style. If the game should
   be longer (Melvor-like 99s at 150–400 h), lower late-node XP; the knobs are listed in DESIGN §5.4.

## Working on the roadmap

1. Change data or formulas (`src/data/*`, `src/core/formulas.js`).
2. `node --test test/*.test.mjs test/*.test.cjs` — must stay green.
3. `node tools/pacing.mjs` and `node tools/simulate.mjs --hours=150 --seed=1` (and a second seed) —
   compare against the phase's exit numbers and DESIGN §5.
4. Open the game (`npx serve .` or any static server, then `?dev=1` to unlock every tab) and play the
   changed part.
5. Update DESIGN.md if a number in it changed.
