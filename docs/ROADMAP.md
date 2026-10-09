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
| 8 — Art and polish | ✅ Done |

The six phases of the original plan are built, including the optional mastery, and a four-part code review (combat,
skilling, saves and API, UI) has been worked through: 28 confirmed bugs fixed, plus several suspected
ones, with regression tests. Phases 6 and 7 gave it the look and feel of a game: a battle scene,
reward moments, a dark fantasy theme, an armory, sprites, sound and a phone hotbar. Phase 8 paints it
(Gemini paintings for every place and a world map) and makes it simple: the screen grows with the
player instead of showing everything at once, there are no suggestion notes, and the fight fills the
screen with everything a run needs; everything the player handles is a sprite or a pixel glyph, not
an emoji. Its list below keeps growing as polish lands (the hero's looks and name, the codex, the
chronicle, secret medals, great crates, a sixth weekend event, skill capes, a sixth dungeon). The
owner chose Melvor pace: level 99 takes hundreds of hours. What is left is content and the
owner's decisions: a new weekend event is one entry in `src/data/events.js` plus a new era in
`ROTATION_ERAS` (`src/systems/events.js`), a new dungeon one entry in
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

## Phase 8 — Art and polish ✅

- [x] **Hand-painted backdrops** (`docs/art/gemini.md`, `tools/paint.py`, `assets/paint/`): all 17
      places are Gemini paintings in one storybook style, made by a Claude session on the owner's
      computer through Claude in Chrome (a cloud session can't reach a browser) and pushed to an
      `art-inbox` branch. Each replaces its place's scripted layers in the battle scene and on the
      skill stages that use it (smithing now works at a forge, alchemy in a lab) and drifts slowly;
      a shade along the top keeps the zone title readable and a soft pool of shadow sits behind each
      stage's caption. The new player's title card opens on the painted meadow. About 2.4 MB of WebP
      in all; a place loads only when shown

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

- [x] **A title card, not a login form**: a new player's first screen is the game's title over the
      meadow, the hero facing a slime, and one button that starts the first fight. Signing in is a
      link on the card and the header's guest pill, which asks to "Save to cloud" once the first
      boss is down

- [x] **Welcome back, as a haul**: the report after time away shows gold in a pill, each skill's XP
      with its level bar filling (a level-up glows), the materials as tiles popping in one by one,
      finds (pets with their picture, uniques, items, dungeon clears, ready plots, mastery) and what
      was used up; Collect plays the chest sound. Celebrations wait until the dialog is closed

- [x] **A trophy case**: the 32 achievements are medals in a grid (a sword for the slayer medals,
      the zone boss for the stage ones, a skill's best resource for its level medal), gold and lit
      when earned, dark with a progress bar and count until then

- [x] **A loadout, not a form**: auto-eat and the potion are picked from rows of tiles of what you
      carry (icon, count, how much it heals), the chosen one lit, instead of two dropdowns

- [x] **A screen that grows with the player** (DESIGN §3.22, `src/systems/disclosure.js`): a new
      player met 19 tabs (15 padlocked), 4 currencies (3 at zero), 7 combat numbers and six panels
      under the first fight. Now the sidebar lists only the places that are open, plus one "next" slot
      with the place's painting, the task and a bar; a currency shows once you hold some; the camp
      arrives with the gold for its first upgrade, the food row with Cooking, the potion row with
      Alchemy, "Stay on this stage" after the first defeat, the map with the second zone, the jewellery
      slots with Crafting, mastery and the mini-game when they first matter. What has opened is saved
      and never closes; it glows once as it arrives. The first fight is the scene and one small
      panel, at both widths
- [x] **Each thing said once**: the header lost its goal pill and its stats row, and the second
      Enter combat button went from under the scene; the crate has one button (the header, or the
      hotbar on a phone); the hero's numbers moved to the Inventory
- [x] **A camp that takes one line**: on the combat tab the camp is a strip on its painting, the
      title beside the same three tokens the fight's dock uses (the picture with its level, what a
      level gives, the price, all one button; Max beside it when two levels are affordable). About
      84 px tall on a desktop instead of 290
- [x] **Orders on the side**: the stage arrows are gone (the map and the stones on the scene's path
      move between stages); the combat panel and the fight's dock put food and potion first, what
      drops here below them, and Retreat, Map and "Stay on this stage" in a column on the side (under
      them on a phone)
- [x] **Tiles, not sentences, in the loadout**: with no food (or no potions) left, the row ends in
      one more tile, Cook (or Brew), that goes to where they are made, instead of a line of text
- [x] **Perks from anywhere**: the SP chip opens the perks window on every screen, and the combat
      tab's prestige strip has a Perks button like the fight's dock. A perk's button says Learn or
      Upgrade instead of "1 SP" on every row; the cost is said once, above the list
- [x] **No suggestions**: the advisor's notes (the quest board, then a strip under the scene) are
      gone, with `src/systems/advisor.js`. The next unlock is the sidebar's Next card; what is ready
      shows where it lives (a ▲ on better gear, a lit camp upgrade, a glowing Perks button)
- [x] **Cards that are quiet at rest**: an action card shows art, name, what it needs and how long it
      takes; the one being worked opens up with its pile, XP, luck, mastery and the bar. A ladder
      shows what is unlocked and the next rung as a silhouette (mining: 2 cards on day one, not 8;
      the smithy: 3, not 18). Smithing is three steps, Smelt, Forge and Tools, one on screen
- [x] **New places, one card at a time**: an unlock is a card with the place's painting, one line and
      "Take a look"; places that open together share one card of small pictures (the first boss
      opens five), and a tap goes there. A lucky gem no longer opens Crafting before the first bar
- [x] **The painted world map** (`src/ui/worldmap.js`): the ten zones are pins on a Gemini painting
      of the whole road, from the meadow's windmill to the violet rift, opened from the zone's name
      on the scene or the Map button. A pin shows its zone below: stages, boss, drops, and Travel
- [x] **A picture for every place** (`src/ui/features.js`): eight more Gemini paintings (market,
      shrine, trophy hall, festival, clan hall, farm, training course, the map) in the style of the
      backdrops. Shop, Achievements, Events, Clan, Dungeons, Farming and Agility open on a banner;
      every "How it works" paragraph became an About card behind a "?", with the place's painting
      and its rules in a few short points
- [x] **Camp, shop and dungeons as things, not rows**: the camp is three tokens on the camp painting
      ("+5% attack", a level badge, a gold price); supplies and perks are item cards with their
      picture; a dungeon card says in one line whether you are ready, and shows its unique as a bar
      of fragments; prestige is one line with a button. The battle log folds into a drawer
- [x] **Pixel icons in the sidebar and the hotbar** instead of emoji (a sword, an ore, a
      log, a potion, the crown), from the atlas
- [x] **The fight on the whole screen** (DESIGN §3.23): entering combat hides the sidebar and the
      hotbar; the scene fills the window with bigger fighters, and a dock under it holds everything a
      run needs: food and potion, the camp as three tokens, retreat and the map,
      Prestige with what it pays now, Perks in a dialog, and one-tap Equip for the best gear in the
      bag. Prestige walks straight into the next run's first fight, so fight, spend, prestige and
      fight on never leaves the screen. Menu (or Esc) folds it away while the fight goes on
- [x] Fixes found on the way: on phones the food and potion rows stood 300 px tall each (a flex
      basis that became a height in a column); "Cook some" pointed at a locked tab; "Found a
      Amethyst" (and "Forge a Iron Sword") now get the right article, and the gem no longer lands
      in the battle log

### Still to do

- [x] **The phone's Next card in view**: it sat at the end of the scrolling tab strip, off screen,
      so a new player on a phone saw no goal. It is its own slot now: beside the title on a phone
      (the place, the task and the bar), under the tabs on a desktop as before
- [x] **Farm crops as picture tiles**: a bag of seeds (the crops this level can plant as tiles with
      their price, the next one as a silhouette) instead of a dropdown and a Plant button on every
      empty plot. Pick a seed, then tap an empty plot to plant it or a ready one to harvest it;
      "Plant N plots" fills every open plot at once (`plantAll`). Two plots a row on a phone
- [x] **Agility obstacles as picture cards**: a card per slot instead of rows of text. A built
      obstacle shows its picture, level and bonus with Upgrade; an open slot shows its price once
      and three obstacles to pick from as tiles; the next slot is a padlock. Swapping one out is
      behind a ↺ and asks first (no refund, its levels are lost)
- [x] **A painting for each dungeon**, on its card and behind its fight: four more Gemini
      paintings (a goblin warren dug under tree roots, a crystal heart over an underground lake, an
      orc fortress courtyard at dusk, a dragon's hoard among lava falls). A dungeon card opens on its
      painting with the boss in front; the Crystal Depths and the Dragon's Lair no longer borrow the
      caves and the volcano
- [x] **Sprites for the last emoji**: perks wear DCSS spell and god icons in a gold frame (a
      sword, a heart, a runner, a plant, a book, an hourglass, a roast, coins, a crown); the tools
      are a pickaxe, an axe, a bow, a fishing rod, a tinderbox and a hoe (the axe and bow from DCSS,
      the rest drawn in its manner); the daily crate is a DCSS chest, in the header, the hotbar and
      its dialog; Settings is a cog. All from `build_icons` in `tools/resource_art.py`
- [x] **The hero at work on the farm and the course**: Farming and Agility have the skill stage on
      their paintings instead of a banner. On the farm he hoes while anything grows, and the ring is
      the nearest crop's growth; on the course he runs empty-handed, a leap at the end of each lap.
      A resting stage faces the place's own picture instead of an emoji
- [x] **Pictures for the agility obstacles**: each of the eighteen has its own sprite (a coiled
      rope, a log on trestles, stones across a pool, a net, monkey bars, a tightrope, a pipe, a wall
      with a rope, seven-league boots, a zipline, a hurdle, a mud pit, a rooftop, a waterfall, a
      boulder with holds, a rope bridge, stones across lava, a cloud); the resting hero's campfire
      is a sprite too
- [x] **After the Titan, back to what he was doing** (DESIGN §3.12, the owner's report): a hero who left his
      work or his rest for the Titan was left fighting at the stages when it ended. Now his work picks up where
      it stopped, a rest stays a rest, and only a hero who was fighting fights on; a reload or a tab put to
      sleep mid-fight does the same. The fight keeps the screen for its last banner (the win, a fall, or a new
      "Time is up" with the share of health dealt), then the screen goes back to the tab the Titan was
      challenged from; Give up goes back at once. The win's banner and note say the bonus it really left
      (+1% from the 21st Titan on; they always said +2%)
- [x] **The "?" cards say what the code does**: a fall on a zone's first stage goes two stages back, never
      onto a boss; the bonfire holds up to an hour (the card said "1 hours"); a token gives +0.2% health too;
      the anvil takes essence as well as bars; a Titan from the 21st on logs the +1% it leaves (the log always
      said +2%). DESIGN's numbers now match the code: the deep Abyss's drops (×1.45 a depth), the drop tiers,
      the bestiary (183 kinds), the medals (45), the Zipline and when "Stay on this stage" appears
- [x] **Strikes cut down** (DESIGN §3.6, the owner's ask): fast clicking took a hero to stage 100 with no
      prestige, food or potion and cleared dungeons in seconds. A strike is now a tenth of an attack, at most
      four a second, and the combo adds at most +10% (it was +90%, with extra crit, 15% lifesteal and echo
      strikes). Measured as an auto-clicker would play, at every interval between clicks from 1 ms to 2 s:
      at best about 1.5 times an idle hero's damage (6.7 before), and no healing
- [x] **The wiki** (the owner's ask; wiki/README.md): https://fantasy-idle-wiki.vercel.app, its own Vercel
      project. Built from the game's data by `wiki/build.mjs`, so every number is the game's: a page for every
      skill (actions, tools, mastery, pet, cape, medals), item (where it comes from and what it is for),
      monster (its stats at every stage it stands on, its drops), land and stratum of the Abyss, dungeon,
      gear tier (the hero shown in the set), unique, plus prestige, perks, ranks, Trials, Ascension, mastery,
      medals, pets, capes, looks, events, clans, offline progress, formulas and the XP table, and written
      guides (getting started, getting past a wall, training skills, gold, an FAQ). In the game's look, with
      search, a phone menu and sortable tables; the build fails on a broken link or a bad number
- [x] **Cards fit a phone** (DESIGN §3.22): a new medal, a level-up (Combat 10) and a new land still covered
      a third to almost half of a phone's screen, over the fighters' bars. On a phone every card is now a
      banner at the top: the picture at the left, the words beside it, a land's or place's painting behind
      it; 80 to 114 px (12–17% of the screen) instead of 200 to 300. Desktop cards are as they were
- [x] **Dialogs fit a phone** (DESIGN §3.22): on a phone browser every popup took the whole screen. Under
      600 px they are compact cards now: less padding, smaller type, the painting a strip with the title
      on it, Prestige's "starts over" beside "stays", the perks three across, the crate's haul two
      across, none taller than 84% of the screen (a long one scrolls under its buttons). At 390 × 664,
      Prestige covers 73% (it overflowed), the perks 84%, an About card 81%, the crate about 70%
- [x] **The first prestige teaches the loop** (DESIGN §3.24, the owner's ask): Prestige opens once the
      stage-20 boss falls, first of the places waiting (about 4½ minutes in), the first prestige needs no
      ten-minute run, and the hand points at it at once; it pays a few tokens and a skill point, and the
      hand goes on to Perks and the first perk. Later, the Prestige button glows at each wall (three
      minutes without a new best, until Auto is earned). One who watches stands at stage 63 after an
      hour (50 before), one who taps at 110 (100)
- [x] **The first prestige, by the hand** (DESIGN §3.24): the owner's first run went to stage 41 and
      combat level 27 with nothing to say a prestige was the way past the wall. Now, once the Prestige
      place is open and the first run has gone three minutes without a new best, the guide's hand points
      at the dock's Prestige (which glows), then at "Prestige now" in the dialog, then at Perks and the
      first perk to learn. A climb still going is left alone. One who watches now prestiges at about 14
      minutes and stands at stage 40 after an hour (30 before); one who taps, 79 (60). Superseded the
      same day by the teaching prestige above
- [x] **Gem pouches for Crafting** (docs/research_notes/crafting-gems.md): a hero whose fight had gone deep
      found only gems a new crafter cannot cut (the simulated hero held 1,913 Diamonds and was still
      Crafting 1). The shop's Supplies now offer ten Amethysts, Topaz or Sapphires for gold, once Crafting
      is open and one pouch at a time as its level climbs, as Melvor's shop sells Leather; the higher gems
      stay the fight's and the mine's
- [x] **A painting for every stratum and the two late dungeons** (the owner's go-ahead): seventeen Gemini
      paintings in the set's style, so the Abyss's fifteen layers below its first and the Sunken Necropolis
      and the Hellforge each have their own place behind the fight, on their cards and in the bestiary,
      instead of a borrowed painting under a colour grade: a hollow of weeping stone trees, a plain of
      giant bones, stepped lava pits, ice adrift in a black void, living green walls, a gothic throne hall,
      a storm of violet lightning, a black sea with teal glows, iron halls of gears, a golden tomb palace, a
      crimson cathedral of burning organ pipes, a garden of glass and watching stones, a drowned bog of
      shipwrecks, a world in shards, Pandemonium under green hellfire, a flooded city of tombs, a foundry
      pouring molten metal. Each layer's own particles, and the storm's lightning
- [x] **The first places last** (DESIGN §3.24): a new player crossed the map's first three places in two
      minutes, and one who tapped crossed five in a minute. On the first trip through places 2 to 5 each
      stage now holds a pack of three monsters (pips under the stage fill as they fall; bosses stand alone,
      cleared ground is one fight), and a tap hits for a fifth of the hero's attack, not half. The first
      boss still falls within the first minute; a tapper reaches place 3 at about a minute, not 17 seconds
- [x] **Crafting's late job** (DESIGN §3.4, §5.7): crafted jewellery can roll Epic from Crafting 75 and
      Legendary at 99, and a new gem, the Voidstone, left now and then by the Abyss's deep bosses, is cut
      at Crafting 85 into pieces as strong as what drops at the hero's deepest depth
- [x] **A faster deep Abyss** (the owner's choice; DESIGN §5.6): past stage 400 the monsters grow
      ×1.065 a stage in health and ×1.057 in attack (from ×1.085 and ×1.075), so the late climb keeps
      moving: by hour 1,000 the simulated hero stands at stage 620 with Auto (530 before) and 560 without
      (490), and a player without Auto never waits more than 108 hours for a big moment past hour 500
      (168). Nothing changes before stage 400 (hour ~146 with Auto). The leaderboard's allowance for a
      climb was refitted to the game as it is now, with three times the fastest honest climb at every depth
- [x] **The smith refits the reinforcing**: a weapon or piece of armour put on in place of a reinforced
      one takes its anvil levels but one, and the bars in them, so the anvil's work is no longer lost at
      every better drop (the simulated hero ends 150 hours at +8.6 on average, from +7.3, and 10 stages
      deeper). The bag compares a new piece as it will be ("refitted to +6"), its ▲ and the dock's Equip
      count it so, and a toast tells when the smith does it. Swapping back and forth loses a level each time
- [x] **Festival cloaks**: each weekend event sells a cloak of its own colour (a silver hem, where a skill
      cape's is gold), first in its shop for 120 tokens: a look to keep and wear from Settings, a card
      with the hero in it, and a part of the Hall's completion. Six to collect, each back with its event
- [x] **The week's Trial** (the late game's first moment on the calendar; DESIGN §3.26): each week one
      of the eight Trials is the week's, first in the prestige dialog under a "This week" ribbon and open
      even when its tiers are cleared. Beat your best in it for a laurel, a record, once a week, so the
      Trials stay worth a run after hour 300 and the goal grows with the hero. The leaderboards have a
      "Week's Trial" tab: the best stage in it this week, worked out on the server from the cloud save
- [x] **Two more dungeons** (the long-term research, item 2): the Sunken Necropolis at stage 240 (twelve
      undead and the Sunken King) and the Hellforge at 275 (twelve constructs and the Obsidian
      Colossus), with uniques for the two slots none had: Drowned King's Greaves and Hellforged
      Gauntlets, each a record. They borrow the Drowned Ruins' and the Dragon's Lair's paintings under
      their own light until they get their own; their map pins sit by the lake and at the volcano's foot
- [x] **Medals for the deep game**: big moments past hour 300 were days apart, and only three medals
      marked stages (11, 50, 100). Six more: the bottoms of the Ember Pits, the Storm Wastes and the
      Burning Choir (stages 200, 300, 400), Pandemonium's 500, a first Ascension and twenty Trial tiers;
      a stage medal wears the boss of where it is won. The Ascension and Trial medals stay hidden until
      the player has met those
- [x] **The Abyss in strata** (the long-term research, `robust-and-fun/B_longterm_motivation.md` §8.2;
      DESIGN §3.7): past stage 100 the Abyss was one place with the same five monsters forever. It is
      now sixteen named layers of 25 stages, from the Weeping Dark and the Ember Pits to the Glass Garden
      and Pandemonium, each with four monsters and a boss of its own (75 new DCSS sprites, 75 new
      bestiary pages), a card when first reached, its name over the fight and on the map, and its own
      light over the Abyss's painting until each gets a painting of its own (Gemini, with the owner)
- [x] **Ascension** (the long-term research's outer reset; DESIGN §3.27): from best stage 300 the prestige
      dialog offers to ascend: a prestige that also gives every token up for Stars, 10 for each tenfold
      past 1,000 (100,000 tokens: 20), each making every later prestige pay 25% more tokens, for good. It
      asks first, writes a backup, is the biggest card in the game, and rests a day after (else
      ascending every other run would farm Stars). Simulated over 1,000 hours, the bot ascends four times
      (hours 85–215 with Auto) and ends 70–80 stages further (510 against 430 with Auto). It is not yet
      a rhythm: past hour 500 big moments still come about once in 100 hours
- [x] **A completion percentage** (the long-term research; DESIGN §3.14): the Hall's banner says how much
      of the game is done ("7.8% done", a decimal so late sessions show it move), and Records opens on
      its parts as bars: skill levels, mastery, the bestiary's stars, the codex, medals, pets, uniques,
      the first 20 Titans, the Trials and the course, ten of equal weight; only the parts met are named
- [x] **Mastery checkpoints** (the long-term research, `robust-and-fun/B_longterm_motivation.md` §8.2):
      at 10, 25, 50 and 95% of a skill's whole mastery, every action of it gets 2, 3, 5 and 10% faster,
      for good, with a card. The skill header's Mastery pill shows that share as a bar, with a mark at the
      next checkpoint. The simulated fighter passes 16–17 in 400 hours, the first after about 2
- [x] **Ranks past Mythic** (the long-term research, `robust-and-fun/B_longterm_motivation.md` §8.2):
      Exalted at 500 prestiges in a dragon-scale cloak, Eternal at 1,000 in cyan and Immortal at 2,000
      in void purple, each a card with the hero in his new cloak; with Auto they come near hours 240,
      500 and 930. No old cell of the atlas moved
- [x] **The boards' pace by depth** (the last fix of the robustness research's first step, its E11): the
      server let a best stage grow 30 stages plus 60 an hour at any depth, 1,470 in a day where an honest
      late hero gains 20 to 50. It now allows three times the fastest climb in 166 simulated runs from
      each depth (`honestClimb`): from stage 200, 50 stages in an hour or 160 in a day; from 300, 88 in a
      day
- [x] **Trials** (the long-term research's first late-game item, `robust-and-fun/B_longterm_motivation.md`
      §8.2; DESIGN §3.26): from best stage 200 the prestige dialog lays out eight Trials as cards on
      their places' paintings; tick one and the prestige starts a run under its rule: monsters that hit
      four times as hard or have ten times the health, a tenth of the hero's health, gear at a quarter,
      three seconds for a boss, no camp, no food or healing in a fight, or tokens that give nothing.
      Five tiers each, 25 stages apart; each tier cleared is a record (tokens ×1.05), with a card, and the
      fight wears the Trial beside the stage. The rules were sized by `tools/trials.mjs` on simulated
      heroes at best 200, 260 and 320: the first, milder set cost a late run nothing (food heals a fixed
      amount, a boss falls long before its clock, and the tokens are most of a late hero's power). With a
      Trial every fifth prestige, three simulated seeds reached stage 300 at 135–150 hours (183–315
      without) and best 370–380 at 400 hours (320–329), cleared all 40 tiers by 213–296 hours, and had a
      big moment every 11–15 hours between hours 150 and 300 (every 30–50, with gaps of 97–112 hours,
      without). Past 300 hours the game is thin again: that is for the next late-game work.
      The leaderboards and clan bosses compare the hero without the Trial, and the server flags tiers a
      save's best stage could not have cleared. The simulator's bot had stopped prestiging at the wall
      near stage 310: it restarted its stall clock whenever it went back to fighting, and a run there
      paid one token less than its rule asked for, so it sat for a hundred hours; it uses the run's own
      clock now
- [x] **Titans that keep falling, a playtest log** (the long-term research found a Titan falling once in
      30–220 hours late in the game): from the 21st, each Titan stands 5 stages past the last instead of
      10 and leaves +1% instead of +2%, twice as many for the same power; unused attempts bank, up to
      three. Settings can keep a playtest log, a timeline of the moments of play in the save, exported
      as a file for `tools/playtest.mjs` to set beside the simulator. The new robustness suite's
      thousand mangled saves found that a negative camp level loaded and took the hero's health to
      nothing; camp levels are now cleaned on load like the perks
- [x] **For players who check in** (the sessions research, `robust-and-fun/C_sessions_players.md`): a
      player who visited three times a day earned Auto on day 8 and one who came once a day never, his
      runs sitting at their wall most of his time away. Auto now comes with the fifth prestige, or two
      days after the first; offline progress runs for a day (24 hours, was 12; the Endurance perk adds
      up to 12 more); and the welcome-back leads with where the run stopped (climbed to a stage, then
      held it for how long, as a bar) and a row of what is ready, each a tap away: the prestige with its
      payout, crates, the Titan, skill points, better gear
- [x] **Places when they are of use** (the onboarding research, `robust-and-fun/A_onboarding_pacing.md`):
      the breather between places keeps growing (1.5, 3, 4, 5, 7, 10, 15, 20, then 30 minutes) and runs
      only while the player attends (the page in view, or input in the last three minutes), so a tab
      left in the background opens nothing; a return after ten minutes opens the one place that waited,
      named in the welcome-back report (which now also counts Auto's prestiges); none opens during a
      boss fight. What breaks the wall comes first: Hunting, Dungeons, Alchemy, then Prestige (in a run
      old enough to use it), the Shop, the Hall (with five medals), the Clan, the weekend Events (when a
      festival is near) and Agility (with the gold for a first obstacle half in hand). Places earned by
      work answer within 90 s, and ore that monsters drop no longer opens Smithing for a hero who only
      fights. `tools/opening.mjs` plays a skiller and a background tab too, and checks the caps
- [x] **Fixes the robustness research found** (`docs/research_notes/robust-and-fun/`): `?dev=1` and
      `&event=` worked on the live site, opening every dungeon, the Titan and any event's bonuses to
      anyone; they now work only on a local host, a save that picked them up is cleaned, and the server
      flags an upload that carries them. The pity ring compared tiers, and every deep Abyss depth is
      tier 7, so re-climbs filled it with pieces nobody wore (127–229 in 150 h, 4–9% worn); it now counts
      a boss only where its drops could beat something worn, comparing drop power at the place's depth,
      and pays 2–7 times in 150 h. The simulator charged its agility time only when a task ran its full
      half hour, so some seeds trained agility for days at stage 26; it is charged as it passes now
- [x] **Places one at a time** (the owner found that everything opened in seconds; DESIGN §3.14,
      §3.24): a player who taps reached stage 30 in half a minute and opened eight places in 28 s. A
      place reached by climbing now waits for a breather of time played since the last one (1.5, 2.5,
      3.5, 4.5, then 5 minutes); one earned by work in a skill answers within half a minute; the
      weekend events and the clan wait for the first prestige. The first ten minutes bring three places
      (Hunting, the Shop, the Hall), the first half hour six or seven. The Next card shows a place earned
      and waiting as "On its way", its bar filling and its frame warming
- [x] **Camp prices that follow the best stage** (the owner's choice, 3a; DESIGN §3.8): a camp level
      costs its old price or, once higher, 0.008 kills' worth of gold at the best stage (about 50 kills
      for a whole upgrade), growing ×1.36 a level. A new player's camp is as it was until about stage
      85; after that each run buys its camp again as it nears its best, so gold has a late job: half
      of all gold goes to the camp in the simulator (70–85% with Auto), against about 1% before. The
      camp's "?" says so. Measured with everything (DESIGN §5.2, §5.5): stage 200 at 54–56 h by the
      simulator's own prestige rule and 45–48 h with Auto, best 280–300 at 150 h. Two simulator fixes
      on the way: a bot that needed runite bars for an obstacle smelted adamant for fifty hours
      without fighting, and its "stuck an hour" rule prestiged runs it had left at their start; and the
      Auto switch's ten minutes now count only time spent climbing (a hero back from the mine was
      prestiged at once)
- [x] **Records that make tokens stronger, and an Auto switch** (the owner's choice, 2; DESIGN §3.9):
      every 25 stages of the best stage ever and every dungeon unique held multiply what the tokens
      give by 1.05, so a late record lifts the whole stock instead of adding under 1%; a new record is
      a card with the token, and the token chip's tip counts them. After 20 prestiges the dock's
      Prestige button gets an Auto switch, which prestiges a run that has gone ten minutes without a
      new best stage and walks the hero into the next run's first fight (a note says what it paid);
      it says when it will go, keeps off while the hero stays on a stage, and works while away (the
      welcome-back summary counts it). Tokens give 0.4% each (was 0.5%) and the deep Abyss's drops grow
      ×1.45 a depth (×1.6) so the pace holds: simulated, stage 200 at 46–50 h and best 290–298 at
      150 h; with Auto on, stage 200 at 38–40 h and best 310
- [x] **Weapons and armour from the fight** (the owner's choice, 1a; DESIGN §3.25): forging makes a
      copper set and every stronger weapon and piece of armour drops, from bosses, regular monsters,
      chests and the Abyss, which every prestige re-arms. Drops are mostly of the zone's own tier
      (65%, one below 25%, one above 10%) and lean toward the slots the hero lacks (an empty one ×4, one
      of a lower tier ×2); rings, amulets and earrings drop only epic or legendary, the rest is
      Crafting's. A boss at the hero's frontier that leaves no upgrade fills a mark of a gold ring
      round its node on the stage path, and the eighth brings a sure piece of the zone's tier for the
      weakest slot. Smithing has a fourth step, the Anvil (from level 5): each worn weapon and piece of
      armour as a card with Reinforce (+1 to +10) and Reroll, paid in bars of its own metal and essence,
      with a hammer's ring and a flourish; each step needs 5 more Smithing levels and half as many bars
      again, a metal's mastery takes bars off, and salvaging a piece gives its bars back with three
      quarters of what reinforcing it took. Jewellery keeps its essence-and-gold upgrades in the bag;
      a worn weapon there has an Anvil button. An old order to forge iron stops by itself. Simulated
      over three seeds the pace holds (stage 200 at 47–52 h), and the smith wears Abyssal pieces at +4
      to +10 by hour 150
- [x] **Balanced against the mathematics of idle games** (the owner asked for the research to be
      expanded and the game balanced by it; `docs/research_notes/incremental-math.md` with its
      addendum, `docs/research_notes/gear-sources.md`, DESIGN §5.5). Measured first: gear carries ~60%
      of the hero's power and tokens ~25%; worn gear is all dropped by hour 5–10; late prestiges add
      ~0.8% each; and past stage ~170 every hit killed, because the hero's health had no source that
      grew with depth (defence piled up 80–100 times past the point where it counts). Now armour
      carries health, one point for every 20 defence (shown on each piece and in the hero's numbers),
      and the deep Abyss's drops grow ×1.6 a depth (×1.8) to keep stage 200 at ~48 h: the hero takes
      one or two hits at the wall instead of a fraction of one, falls half as often, and food, defence
      and lifesteal matter again. The pace tables in DESIGN §5.2 are measured afresh. Weapons and
      armour from drops only (the owner's idea), late prestiges that count and a late job for gold
      are proposed in §5.5 with their simulations, for the owner to decide
- [x] **A first session worth the first impression** (the owner found the start dull; research on Tap
      Titans 2 and other idle games in `docs/research_notes/first-session.md`, DESIGN §3.24). Measured
      first: a player who only watched fell at stage 5 within a minute and was below stage 10 after
      five, with nothing new for 80 s at a time. Now the first stages are gentle (monsters hit at 30%
      and have 60% of their health at stage 1, full from stage 30, still paying full gold); the first
      monster leaves a Rusty Sword in a gold beam and the first boss a piece of armour the hero is seen
      to wear; the first combat levels come three times as fast and each one restores his health; the
      camp's first levels cost 20 and 15 gold (the Armour Rack waits for defence to raise); places open
      one beat at a time (none as the first boss appears, whose fight no card covers any more); and a
      white glove points, without words and only after a pause, at the one thing to do: the monster,
      the sword's Equip, the first camp upgrade, the boss's skull while regrouping (it now pulses: a
      tap fights the boss again at once), the first vein. A new hero meets his first gilded monster
      at stage 7. Strikes swing the hero and flash a slash. One who only watches now beats the first
      boss at 48 s and reaches stage 30 in five minutes; `node tools/opening.mjs` measures it
- [x] **The menu starts with the Clan**, then the Shop and the Inventory (the owner's order), above the
      Combat and Skills headings; the rest keeps its order. On a phone the strip of places begins the
      same way and slides to the place opened
- [x] **A bug sweep** (four reviews: combat, skills, saves and the server, the screens). Fixed: a
      reload while the hero waited at a dungeon's chest brought the boss back, for endless extra clears
      and fragments; away from the game, medals earned on the way, a mini-game boost (which used to
      last the whole night) and a background tab's minute ticks (which lost up to a tenth of the work)
      now count as they would online, and a replay goes on from the action's progress; the potion after
      the last one is drunk at once (a Health Potion cut the hero's health at every refill); a prestige
      ends "stay on this stage"; boss clocks give the same result whatever the step; a beaten Titan
      leaves no best try against the next; only food can be auto-eaten and only potions drunk; a
      mini-game left open can't be won later; a tool made counts at once; the dock offers no Equip
      inside a dungeon; the tools' cards say "+X% speed" (they claimed a bigger time cut); the farm
      shows yields with their bonuses; "Salvage commons" is no longer counted as automatic; a fall in a
      dungeon or to the Titan says so. Ten regression tests (`test/sweep.test.mjs`). Saves and the
      server: a crafted 114-byte save froze the loader (and the API) for good; a stranger could make a
      clan's weekly boss unbeatable by joining with a huge save just before Monday and leaving (shares
      now leave with them, and no member counts beyond their best stage); logins had no limit on
      guessing; the cheat check read raw fields (now the server's own numbers, against each number's
      high so far, so restoring a backup no longer flags an honest player); a late first cloud sync
      could overwrite local progress without asking; a clock turned back froze the game, and timers
      from a clock set ahead stuck for weeks; a deleted clan handed out fresh attacks; the prototype's
      gear was dropped when its save was migrated, and a damaged save with no version was read as the
      prototype. The screens: the boss's and the Titan's clock fell off the bottom of the full-screen
      fight on any window under about 810 px tall (most laptops): the scene now keeps room for it, a
      short scene puts its title and stage path on one line and draws the fighters smaller rather than
      over their bars, and a boss is one size up only where it fits; on a phone, a tap on an item chip
      or a figure in a card names it without starting or stopping the card's work (the bubble also
      landed in the corner); a Prestige waits for the end of a Titan fight (it spent the hour's
      attempt) or a dungeon run, and says so; the inventory offers no Equip, and no ▲ badge, while gear
      is locked in a dungeon; Crafting opens with the first silver bar once a gem is found (it opened
      hours before anything in it could be made); the looks in Settings and on a medal's card are drawn
      without the gear (a helmet hid what tells them apart); the timing mini-game's marker moves
      smoothly and a tap is judged where it was drawn; a held key presses once; a tall dialog opens at
      its top on a phone, without raising the keyboard; Enter logs in; the phone's tab strip slides to
      the tab opened; the Hall's unique items show the next dungeon's only, unnamed; leaving a dungeon
      by choice no longer says "failed"; "1 prestiges", "+1 skill points", "Salvaged 1 items" and
      "999.7M" reading "1000M" are put right
- [x] **Gear no longer waits days for a level**: a balance pass found that at Melvor pace the first
      Abyssal (tier 7) drop sat in the bag 57–65 hours before combat 90 let the hero wear it, and the
      first Dragonbone 14–21 hours. Tier 6 is now worn from combat 70 and tier 7 from 80 (were 75 and
      90): the waits are 3–7 hours and about 30, so the best gear is still a goal, not a wall
- [x] **The Abyssal Maw's painting**: Gemini painted it in the backdrop set's own chat (the prompt
      logged on 4 October): a cavern like an open maw, black stone fangs at the left and right edges,
      motes of pale light like dying stars and a ring of cold teal light around the bottomless chasm,
      over a flat ledge of cracked basalt with teal veins. A tiny hooded figure on its horizon was
      painted out by hand. It stands behind the Maw's card and its fight, with the void's motes
- [x] **The figures that name themselves**: the owner asked for the same on the card being worked.
      Hovered, its XP says what it is and what the XP bonuses add to the base; its time, the base and
      how much quicker the tools, mastery and bonuses make it; its double chance, what doubles (a
      second Raw Fox, the log burning twice) split into tools-and-bonuses and mastery; its keep
      chance, what is kept; and the mastery bar, what each level gives and when the next comes
- [x] **Requirements that name themselves**: the owner found what an action needs unclear (tiny
      icons, "1× (0)"). Each requirement is now a chip: the item's icon and how many you hold of how
      many it takes ("0/1", red when short, green when met); hovered with the mouse it shows at once
      a tooltip with the item's name, the numbers and where it comes from ("Raw Fox · needs 1, you
      have 11 · from Hunting"), and a tap shows it on a phone. The same goes for the log a dish burns,
      the pile an action has made, and the agility course's prices
- [x] **Auto lights up the food it eats**: the owner asked whether eating was automatic, since the
      food sat in its own unlit box beside a lit Auto. It is: Auto eats from all the food carried.
      Now, under Auto, every food tile in the bag is lit softly with it; under None, or with one food
      picked, the food that won't be eaten is dimmed, and so is a potion that isn't the one picked
- [x] **A livelier sidebar**: the owner found it dull. It now stands on a painting of its own (the
      hall's red banner behind the mark, its trophy cabinet behind the places) instead of plain glass;
      each place is a round medallion ringed in its skill's colour with a crisp full-size sprite, its
      XP bar in that colour under the name, and its level on a gold-rimmed badge in the title type
      (solid gold at 99); group headings carry a small gem. The place the hero is working breathes,
      its tool bobs and its bar shines; the open tab keeps its gold frame. On a phone the strip gets the
      same rings and bars
- [x] **A sixth dungeon, the Abyssal Maw**, for the long game: it opens at stage 210 (about 83 hours
      into the simulator's play; first cleared at about 177), twelve horrors of the deep Abyss (DCSS starspawn, horrors, a zyme, an
      executioner, the green death, a worldbinder, a star-skull) and the Devourer. Its unique, the
      Starless Band (a ring), is worth its affixes: +8% prestige tokens, +15% combat XP, +10% drops,
      +30% crit damage. A gate in the rift's eye on the world map. Also fixed: chest
      gear ignored the dungeon's depth in the Abyss, so the Void Citadel's chests held gear three times
      weaker than its monsters' drops
- [x] **Skill capes**: level 99 in a skill now earns its cape, as in Melvor: a DCSS cloak in the
      cape's own cloth with a gold hem, which the hero puts on at once, and a small bonus to its skill
      for good (a second ore, fish, dish or bar 10% more often; +10% crops; +10% quality for crafting;
      +3% speed everywhere for agility; +5% attack and defence for combat). The 99 card shows the hero
      in it on a gold medallion; Settings gains a row of cloaks once one is earned (the rank's cloak,
      each cape, the next one as a silhouette); each skill's "?" says what its cape gives; the
      chronicle's 99 wears it; the Hall's Records count the capes and the total level (out of 1,188)
- [x] **Melvor pace**: the owner chose a long game. Level 99 in a skill now takes 190–290 hours of
      training with no boosts (it was 60–130), and combat 99 160–210 hours of the simulator's mixed
      play (it was 20–40). The first levels come as quickly as ever: actions that open by level 20
      keep their XP, and those opening later give less, down to their skill's factor at level 75
      (`src/data/pace.js`), though never less per hour than an older action of the same kind. Combat
      slows with the hero's level, from 60 (full XP) to 95 (a twenty-fifth), so a deeper stage always
      pays more (the combat "?" says so). The 100 stages still take about 5–6 hours; tier 6 and 7 gear
      wait for combat 70 and 80 (worn at about 17 and 52 hours; first 75 and 90, lowered after the
      balance pass below). Old saves keep their levels; only the XP still to come is slower.
      Also fixed in the simulator: a ladder-farming bot that met the Titan farmed one stage for good
- [x] **The game's mark**: the sidebar's plain title became a logo: a gold-rimmed seal looking onto the
      painted meadow with the player's own hero in it, as they are now (look, gear, the rank's cloak),
      beside "FANTASY" in polished gold with a light that passes over it now and then and "IDLE"
      between rules, over a filigree line with a gem. On a phone it is a compact seal and name in the
      top bar. No new painting: the seal echoes the app icon, and type stays crisp at this size
- [x] **After a dungeon, back to the Dungeons tab**: ending a dungeon, leaving one, or losing a run
      (after the defeat has shown) returns a watching player to the Dungeons tab instead of the stage
      fight; the hero fights on at the stages in the background (the header's pill shows where). Map
      Travel, the Titan and a prestige still keep the fight on screen
- [x] **Keep going, or end the dungeon**: the owner asked how to win a dungeon that "goes on forever"
      (it was winning, then repeating behind a switch). The switch is gone. After the first clear of a
      visit the hero waits at the open chest, which stands in the boss's place, and a dialog over the
      dungeon's painting shows the clears and the unique's fragments and offers Keep going (it runs
      again and again until you leave, marked ∞) or End the dungeon (back to the stage the hero left).
      Unanswered for 30 s, or while away, it keeps going. During a run the fight's dock leads with the
      run's own panel (clears, fragments with Assemble, the choice and its countdown, Leave dungeon and
      Map), and tapping the chest asks again
- [x] **The chronicle**: the Hall's Records end with the hero's story, newest first: each first with
      its date and picture (the adventure begun, every new land, each pet joining, uniques won, a
      dungeon's first clear, the first Titan, the first prestige and each rank, a skill at 99), noted as
      it happens, also while away. Old saves begin it at their creation date
- [x] **A sixth weekend event, Lucky Paws**: pets are three times as likely to find you, and +10% XP.
      It joins the rotation from 16 October 2026 as a new era (`ROTATION_ERAS`), so no weekend already
      run, nor the one running, changes its event
- [x] **The hero greets you back**: the welcome-back report opens with the hero holding the tool of
      the work done while away (the sword after a fight) and the pet beside them
- [x] **Pick the pet at your side**: a found pet's card in the Collection is a button; the one tapped
      follows the hero into the fight (Fang, or the first found, until one is picked), and to work where the
      skill's own pet hasn't been found yet
- [x] **Looks earned with medals**: six more bodies for the hero (an orc, a gold djinni, a winged
      gargoyle, a mummy, a horned demonspawn, a ghoul), each won with a medal; its card shows the hero
      in the new look, Settings shows the next to earn as a silhouette, and in the Hall such a medal has
      the figure on its rim
- [x] **No blank page after an update**: when a browser keeps an old copy of one of the game's files
      (a plain local server lets it), the game used to stop with an error in the console; it now says
      so, with a Reload button that fetches every file fresh
- [x] **The boss clock ticks**: a soft tick for each of its last five seconds, with the red pulse
- [x] **A volume slider**: under Sound and vibration in Settings (heard at once, saved when let go;
      old saves play at full volume)
- [x] **No developer switch for players**: Settings showed every player a "Developer mode: unlock
      every tab" box (a cheat that also opened the Void Citadel at stage 1); it shows only while it is
      on, as `?dev=1` turns it on
- [x] **Two keys for the fight**: Space strikes the monster (once per press; holding it is no
      auto-clicker) and M opens the world map; the combat rules card says so
- [x] **Tap to see, on a touch screen**: pictures that explain themselves on hover (the prestige
      dialog's keeps, codex pages, a dungeon's lineup, bestiary cards, records, the path's rooms) show
      their words in a bubble when tapped on a phone
- [x] **The mini-games in pictures**: the skill's sprite in the title instead of an emoji, the tool or
      the quarry riding the track's marker (a pickaxe, an axe, the fox, a trout), the time left as a bar
      draining under the prompt, the offer glowing instead of shaking, and fishing strikes instead of
      loosing an arrow
- [x] **A phone on its side**: on a short screen the full-screen fight has a compact title and smaller
      fighters, so they stand inside the scene with their names and stats instead of under the dock
- [x] **The way to the next bestiary star**: a thin gold bar under each met monster's count
- [x] **Who waits in each dungeon**: a dungeon's card shows its lineup as little portraits, room by
      room (an elite never met a silhouette), the boss last in a red ring
- [x] **A boss changes the light**: while a boss stands the place dims and a deep crimson closes in at
      the edges (the low-health red pulse still wins)
- [x] **The gear codex**: the Hall's Collection gains a page for every kind of gear at every tier (ten
      kinds, seven tiers), a silhouette until one has been found, forged or crafted (a drop salvaged as it
      lands counts; old saves count what they carry and wear). A new medal, Armourer, at 40 pages
- [x] **The road on the world map**: the zones joined in order by an inked route, red dashes as far
      as this run has come and faint dots beyond, like a treasure map's
- [x] **A medal is a card**: earning one shows its picture in a gold disc with its name and lasting
      reward ("A secret medal" for the hidden three), instead of a toast; medals earned while away wait
      until the welcome-back report is closed
- [x] **A dungeon run as a row of portraits**: the scene's path shows each room as the monster
      waiting in it (beaten ones grey, a kind never met a silhouette, the boss ringed in red) instead of
      numbers
- [x] **A place's bestiary stars on the map**: a zone's or a dungeon's card under the map shows its
      stars earned of all there are (★ 3/15), once the Hall is open
- [x] **Secret medals**: three medals not shown (nor counted) until earned: Good Companion (pat
      your pet 25 times), Great Expectations (open a great crate) and Unbroken (get back up after 100
      falls); "A secret medal!" says the toast
- [x] **A pat for the pet**: tapping the pet at the hero's feet in the fight makes it hop, a heart
      float up, and its chirp play
- [x] **The hero's look**: ten looks from DCSS's player tiles (men and women of three skin tones, an
      elf pair, a dwarf), tried on with arrows beside the hero on the title card or picked from a row of
      portraits in Settings; gear goes on top, a helmet hides the hair (`src/data/looks.js`, packed by
      `tools/atlas.py`). The text that called the hero "he" says "your hero" now
- [x] **Arriving somewhere fades in**: a new zone, a dungeon or the Titan's ground comes up out of the
      dark instead of swapping at once (not on the first draw, not with reduced motion)
- [x] **The great crate**: every seventh daily crate opened is a great one (three times the gold,
      twice the rest, a better gem), in a golden dialog; seven little crates in the dialog show the way
      to the next. A count, not a streak: a missed day still costs nothing. When the crate waiting is the
      great one, the header's button says "Great crate" in brighter gold ("Great!" on a phone's hotbar)
- [x] **Name your hero on the title card**: an optional field above Begin your adventure (Enter
      starts too); the name is over him in his first fight. The button keeps the focus, so a phone's
      keyboard doesn't jump up
- [x] **Metals, settings and gems as picture tiles**: the Forge's metal and Crafting's setting and gem
      are rows of tiles with how many you hold (the picked one lit, an empty one grey) instead of
      dropdowns; Crafting starts on the best setting you have; the bag's auto-salvage level is a row of
      pills in each rarity's colour
- [x] **The armory answers**: Upgrade rings the anvil and the piece pops with a glow, Reforge chimes
      with a violet glow, Sell commons pours coins, Salvage drops, and putting on gear makes the hero on
      his dais hop (all still with reduced motion, sounds aside)
- [x] **A fall is not the end of the fight**: after a death the hero rests at the campfire until his
      health is full (the scene counts it down) and goes back in by himself from where he retreated;
      the dock's Retreat becomes "Stay at camp" meanwhile, and the fight keeps the screen. The time
      away is replayed the same way: a hero who fell early in a six-hour absence used to come back to
      "0 monsters defeated"; now he fought on (the report says how often he fell and got up)
- [x] **The next land is ready before the hero gets there**: from a zone's eighth stage the next
      zone's painting is fetched, so beating the boss never shows an empty backdrop on a slow line
- [x] **The prestige dialog in pictures**: what is gained leads, big (the tokens and skill points as
      their coins, and a new rank with the hero already in its cloak); then what starts over (a stage
      pip, the gold, the camp) and what stays, as a row of pictures of what this player has met,
      instead of three paragraphs
- [x] **A shorter header on a phone**: the purse, then one row for the rest: the fight's pill says
      just "Stage 59", the event's its picture and time, the cloud button is its icon. Content starts
      about 70 px higher on every tab. The Focus and bonfire pills have short phone wording too, and the
      "what the hero is doing" pill stays off a phone's header (the hotbar shows it)
- [x] **The clan tab before signing in**: instead of an empty hall, three pictures say what a clan
      is (the dragon of the weekly boss, the hero for three attacks a day, essence and a diamond for
      the rewards); the rules stay behind the "?"
- [x] **The hero on the world map**: he stands, bobbing, beside the pin of where he is (his zone, or
      the gate of the dungeon he is in), dressed as he is in the fight
- [x] **No empty strip in a new player's first fight on a phone**: the dock's supplies group, which
      held only the zone's drops (hidden on a phone), is left out until there is food or a potion
- [x] **Glyphs instead of emoji beside numbers**: thirteen small pixel icons (`icon/*` in the atlas,
      `glyph()` in `src/ui/sprites.js`): DCSS status icons blown up crisp (a heart, an hourglass, a
      star, a burst, wind, an up-arrow, a flame, a spark, Zz) and four drawn the same way (a skull,
      a padlock, a die, a turning arrow). They stand by the hero's stats, every card's time and XP,
      a double's and a kept ingredient's chance, the bonfire, Upgrade and Reforge (with essence and
      coins), the boss's pip on the path, the boss clock, the regroup line, the locked course slot,
      the burnt-dish pop and the clan's screen; the hunting game's target is the fox pet
- [x] **The monster's line in pictures**: its attack, the time between its blows and its gold show
      a sword, an hourglass and coins instead of emoji; the Titan's title wears the Titan
- [x] **A new land**: the first step ever into a zone is a card on its painting, with its ruler as a
      silhouette (met at its tenth stage), its stages, what drops there and one line about the place
      (`ZONE_LINES` in `src/ui/features.js`). Once per zone in the
      whole game (not again after a prestige, not for the Abyss's deeper depths)
- [x] **What the chest held**: a dungeon clear's banner names the dungeon and shows the chest's
      contents as pictures that pop out one after another (gear in its rarity's glow, the unique's
      fragments, essence, materials, a gem) instead of "The chest is yours". The bonuses at 25, 100
      and 250 clears are a card on the dungeon's painting with its boss, not just a log line
- [x] **The dungeons on the world map**: each stands on the painting as an arched gate with its boss
      inside (the Warren in the deep woods, the Depths in the crystal mountain, the Stronghold on the
      storm tower, the Lair in the volcano's mouth, the Citadel at the rift), the open ones and the
      next as a silhouette. A gate puts its dungeon under the map (how a run would go, the unique's
      fragments) with Enter; inside a run the map opens on its gate. Also fixed: Travel on the map
      did nothing during a dungeon run; it now leaves the run for the stages
- [x] **The battle log in pictures**: each line starts with a sprite for its kind (a sword, a chest,
      a skeleton, essence), and the emoji saved at the start of old lines is left out
- [x] **Level-up cards on their painting**: a milestone level opens on its skill's place (the cave
      for Mining, the forge for Smithing), with the skill's sprite instead of its emoji
- [x] **Records**: a fourth view in the Hall: the hero's lifetime numbers as big figures with a
      picture each (best stage, monsters, bosses and gilded monsters defeated, gold earned,
      prestiges, Titans, dungeon clears, gear made, fish, crops, mastery, time played, falls)
- [x] **A name for the hero**: set in Settings (one line, up to 20 characters, kept in the save),
      shown over him in the fight ("Aldric · Combat Lv 62", "Lv" on a phone) and on his panel in
      the Inventory
- [x] **A fifth weekend event, Gold Fever**: gilded monsters come three times as often, and +10%
      gold from combat
- [x] **Uniques worn show on the hero**: a gold crown, red dragon armour and a violet tower shield
      join the Warlord's Cleaver, so the loot of the dungeons is seen in every fight
- [x] **The welcome-back report** also counts the gilded monsters defeated and the bestiary stars
      earned while away
- [x] **What waits, on its tab**: a badge in the sidebar when something is ready in a place: the
      count of ripe plots on Farming, a gold "!" on Dungeons when the Titan is awake and can be
      beaten or a unique can be assembled, a ▲ on Inventory for better gear. The browser tab's title
      says what the hero is doing, with a ★ when something waits
- [x] **Pets at the hero's side**: a pet found follows him, Fang (or the first pet found) into the
      fight, standing at his feet, and each skill's pet onto its stage
- [x] **A fifth dungeon, the Void Citadel**: a fortress adrift in the void (a new Gemini painting),
      open from stage 160: ten elites from the Abyss (Void Acolytes, Starcursed Masses, a Rift Crab,
      Wretched Stars, a Soul Reaper, a Tormentor, a Citadel Sentinel, a Soul Eater) and the Void
      King, with chests of the top tier and a unique shield, the Void King's Aegis. The simulator's
      player now stops farming a dungeon that can no longer upgrade it
- [x] **Ranks and cloaks**: prestiges earn the hero a rank, worn as his cloak's colour (red, then
      green, blue, purple, gold, white and black at 1, 5, 15, 40, 100 and 250 prestiges); a badge by
      the hero and on the Prestige panel shows it and the count to the next, and a new rank is a card
      with the hero in his new cloak
- [x] **Gilded monsters**: one regular monster in 150 comes gilded, for five times the gold, twice
      the XP and a sure gem and essence. It turns gold on the scene, with a banner, a chime and a
      shower of coins; a new medal, Gold Rush (25 of them), makes them come more often
- [x] **An app icon, and the game on a home screen**: the hero in his plumed helm on the painted
      meadow (`tools/icons.py`) in the browser tab and on a phone's home screen; `manifest.json`
      lets the game be installed and open full screen like an app
- [x] **The bestiary**: the Achievements tab is a hall in three views (Medals, Bestiary,
      Collection). The bestiary has a portrait of every kind of monster by place, with its count and
      three stars (10, 100 and 1,000 defeats); unmet kinds are silhouettes. Two new medals,
      Naturalist and Monster Scholar, for 25 and 100 stars
- [x] **The event as a reward track**: the three milestones are medals on a bar that fills with
      the event's tokens (the next one lit, with how far there is to go); the event shop's goods are
      item cards with their picture; a festival token (a DCSS voucher, gilded) stands on the count
      and the prices. Also fixed: on a phone the currency chips hid their sprites
- [x] **A picture on every action card**: ninety small Gemini paintings, one per action, across
      the top of its card: each ore in its vein, each tree, each fire, each fish and animal in the
      wild, herbs and crops, potions on the alchemist's table, ingots, the piece on the anvil, each
      tool and jewel, every dish. Painted nine to a sheet and cut by `tools/cards.py`; locked cards
      show theirs in grey, and a planted farm plot shows its crop
- [x] **A painting behind every panel**: nothing is plain brown any more. The page stands in a
      painted guild hall; a skill's panel continues its stage's painting below it, so the cards sit
      in the cave, the forest or the forge; the inventory is an armory (the hero on a dais), the bag
      a velvet-lined chest, the materials a storeroom and a piece of gear a vault's pedestal; perks
      sit in an arcane library, settings in a scribe's study, the fight's food and potions on a
      supply table and its orders on a war table; the shop, achievements, events, clan and dungeons
      reuse their pictures. Nine new Gemini paintings (`ROOMS` in `tools/paint.py`); the cards on
      them let a little of the painting through. Also fixed: in the fight's dock a long food row ran
      across the camp and prestige groups instead of scrolling
- [x] **The last emoji around the edges**: the sound, cloud, map, retreat and resting controls are
      drawn line icons; the weekend events, the title card's button, Enter combat, the bonfire pill,
      the toasts, the celebrations, the welcome-back report, the loot beam, the last achievement
      medals (a campfire, a crown), the bag's Salvage and Sell and the Titan's Challenge use sprites

**Exit:** every place a player sees has a painting or a sprite, not an emoji; a new player's first
screen is one fight and one small panel at 1280 and 390 px; `tools/shots.mjs` passes both modes.

## Deferred on purpose

Ranged/Magic combat styles with Fletching/Runecrafting (L); Township or Summoning-scale systems;
real-time chat; synchronous party content; gacha pets; purchasable power (the owner plans it for
later, not only for the online clan side, the game's most important part: see
[Decisions for the owner](#decisions-for-the-owner), 2).

---

## Decisions for the owner

1. **Set `JWT_SECRET` in Vercel before deploying this branch.** The API now refuses to issue tokens
   without it (the old code silently used a public hard-coded secret). Accounts created with the old
   API keep working — passwords are unchanged, players just log in again, and an old cloud save is
   migrated on load like a local one.
2. **Monetization and hosting.** For now the game is free with nothing for sale, which fits Vercel's
   Hobby plan (non-commercial). The owner's intent for later (October 2026): players will be able to
   spend money to get stronger. The clan (guild) section is the most important part of the game,
   because it is online, but what is sold is not limited to it. Not built yet, and deferred with the
   rest; shipping comes first, later. When it comes, the research's warning stands: paid power plus an
   online side needs that side to be server-authoritative (the server decides fights and rewards,
   since a browser save can be edited), and selling anything needs a commercial hosting plan (Vercel
   Pro or another host). Clans and leaderboards also need `POSTGRES_URL` (Vercel Postgres); tables are
   created on the first request.
3. **`api/node_modules` is still committed** (1,099 files). `.gitignore` keeps it tracked until a
   preview deployment confirms Vercel installs dependencies from `api/package.json`; then remove it
   with `git rm -r --cached api/node_modules`.
4. **Old database row in git history.** `api/fantasy-idle.db` (removed in this change) held a username
   and a bcrypt password hash; it is still in the repository's history. If that password is used
   anywhere else, change it.
5. **Balance intent — decided: Melvor pace** (October 2026). Level 99 takes 190–290 h of training
   for each skill (no boosts) and 160–210 h of mixed play for combat; the 100 authored stages
   still take ~5–6 h, and the Abyss goes on from there. One table of factors per skill
   (`src/data/pace.js`) and one for combat (`BALANCE.rewards.xpPace`) set it; DESIGN §5 has the
   numbers.

## Working on the roadmap

1. Change data or formulas (`src/data/*`, `src/core/formulas.js`).
2. `node --test test/*.test.mjs test/*.test.cjs` — must stay green.
3. `node tools/pacing.mjs` and `node tools/simulate.mjs --hours=150 --seed=1` (and a second seed) —
   compare against the phase's exit numbers and DESIGN §5.
4. Open the game (`python3 tools/serve.py`, then `?dev=1` to unlock every tab) and play the changed
   part. It asks the browser to check every file again, so a plain reload shows the latest code
   (with `python3 -m http.server` the browser keeps old copies: reload with ⌘⇧R or Ctrl+Shift+R).
5. For anything visible, `node tools/shots.mjs` (and `--fresh`) and look at the pictures in `shots/`.
6. Update DESIGN.md if a number or a rule in it changed, and add a line here for each visible change.
