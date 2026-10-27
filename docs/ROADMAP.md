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
| 9 — Live, and the long game | 🚧 Now: [what is next](#phase-9--live-and-the-long-game) |

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

**The game is live** at https://fantasy-idle.vercel.app since 8 October 2026 (a phone can install it),
with the player wiki at https://fantasy-idle-wiki.vercel.app since the 9th and online play (accounts,
cloud saves, clans, leaderboards) since the 11th, on Vercel's free plan with a free Neon database in
Frankfurt. What is next, keeping it running and the long game's last pieces, is
[Phase 9](#phase-9--live-and-the-long-game); a few things are the owner's (a history clean-up, a domain,
paid power later): see [Decisions for the owner](#decisions-for-the-owner).

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
- [x] Versioned save, prototype-save migration, export/import string (the strings were removed in Phase 9)
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

### Landed after the first pass

The phase's last seven to-do items come first; after them, everything that landed since, newest first.

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
- [x] **Online play is on** (the owner's ask, README "The API"): accounts, cloud saves, clans and the
      leaderboards work on the live game. A free Neon database in Frankfurt, added from the Vercel project's
      Storage tab for Production and Preview, and the API moved to Frankfurt beside it; `/api/health` says
      whether the database, the signing secret and the game's code are all there. Played end to end in a
      browser on a local server first: register, cloud save, a reload, a clan with two players, the boss,
      the boards, a wrong password turned away
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
- [x] **The game is live** (the owner's go-ahead; README "Deploy"): https://fantasy-idle.vercel.app, the Vercel
      project `fantasy-idle`, deployed with the Vercel CLI from a `git archive` of the branch (so `art/`, `runs/`
      and `shots/` never go up), first from 2f1ab7e on 8 October 2026 and on the owner's word after each change
      since; a phone can install it from the browser (`manifest.json`)
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

---

## Phase 9 — Live, and the long game

The game went live on 8 October 2026, the wiki on the 9th and online play on the 11th (Phase 8's list has
each). What is left: keeping it running for real players, one rule to settle, and the long game's last
pieces from the research (`docs/research_notes/robust-and-fun/README.md`, DESIGN §5.6).

### Still to do

Keeping it running:

- [x] **Cloud saves less often** (the owner's ask, for up to five testers; DESIGN §3.17): a logged-in game
      uploaded every minute from every open page, and each upload woke the free database (100 compute-hours a
      month, about 17 days awake). Now it uploads every ten minutes while the player is around (the page in
      view and touched in the last ten minutes) and once on leaving the page (a request that outlives a
      closing page); a page left open in the background uploads nothing more, and the Clan tab polls only in
      view. Checked in a browser with its clock driven: one upload at sign-in, one ten minutes on with the
      player there, none for twenty idle minutes or an hour hidden, one on leaving
- [x] **The clan attack is a fight on screen** (the owner's ask, after the Tap Titans 2 research; DESIGN §3.18):
      "Fight the boss" takes the hero into a 30-second fight against the week's clan boss, full screen like
      the Titan's, on the boss's own land (the ten lands' rulers take turns). The boss drops its guard for two
      seconds in every six: it glows, "Strike now!", and only then do strikes land, harder, and build the
      combo; at other times they are blocked, so an auto-clicker gets no more than a player clicking in the
      openings (×1.3 to ×2 of watching). No cards or raid levels. The server works out the damage from the
      stored hero and the strike times (a forged list deals no more than a perfect one), and a card shows
      it with the member's place in the clan. Three attacks a day, banked up to six; afterwards the hero goes
      back to what he was doing and the screen to the Clan tab. Played in a browser at 1280 and 390 px.
      Fixed the same night (the owner's report): a boss nearly down fell on screen to the first swing, and the
      fight was sent as the time before that swing, so the server took 1 health off; a boss that falls on
      screen now counts as the whole fight, and the server decides. And: two attacks given back by hand
      took the numbers of the morning's, so the server refused them and the game said "Sending…" for good;
      each attack now takes the next free number of the day
- [x] **Gifts from the owner** (README "The API"): one row of SQL gives a player gold, essence or diamonds;
      the save and load answers say a gift waits, the game claims it once and shows a card ("A gift from
      tufan, +12,000,000 gold"). Gifts never show in the clan's reward list, so a page still running older
      code can't claim one and lose it
- [x] **The bug sweep** (the owner's ask, 12 October 2026: every line, every connection): eleven reviewers
      read the game part by part and one played it in a browser at 1280 and 390 px; each finding was
      reproduced before it was fixed, and `test/bugsweep.test.mjs` and the end of `test/api.test.cjs` keep
      them fixed. What changed, by the player's eye:
      - Saves: no two tabs, no stale device and no login can put an older game over a newer one any more.
        The game uploads only once it has compared itself with the cloud (a failed check is tried again,
        never followed by a blind upload); the server refuses an upload made over a cloud save the game
        hadn't seen, and the game then asks which to keep; a tab opened later takes the save over and the
        older one says so ("Play here"). The boot's welcome-back waits for that check, so it never acts on
        the other game. A save that can't be read keeps a copy and points at the backups (it used to fall
        back to the prototype's save); an export string of anything else is refused; a hand-made or
        shared save can no longer stop the game loading or turn its numbers to NaN. A hard reset while
        signed in resets the cloud save too (it came back on the next load), and says so.
      - Medals: Trial Master and Ascendant count across reloads (their counts were dropped on every load),
        and old saves get the counts back from what they hold.
      - Fights: a Swift Bosses boss that comes on mid-step keeps its 3 seconds in a background tab (it had
        about 10); the regroup's minute is timed per attack; the first boss's armour comes with its first
        real fall; the clan fight on screen is the hero the server reckons (no potion, Focus or Trial in
        it); Fasting's level-ups bring no health back; a Titan fight the page closed on pays for its
        damage.
      - Gear and skills: moving a reinforcement to a piece of another metal keeps the bars and essence as
        they went in (salvage turned copper into runite and essence before); a piece forged into a full
        bag that is salvaged at once says so; bait can't be sold away for nothing; a mini-game chance comes
        on one clock for all the skills (switching skills kept a boost up nearly all the time); a missed
        mini-game is heard; clicking work whose materials are short no longer stops the fight; a day of
        firemaking away replays in a fifth of a second (it took seconds).
      - Screens: the Shop shows Prestige and the perks only once they have opened; the welcome-back offers
        only what can be done; Space strikes in the fight even after a click on a button; toasts go under
        a card on a phone; a boss's head no longer covers its health bar; coins and work pops stay under
        dialogs; cards wait while the page is hidden; the Records show the Abyss's depths; the top three
        ranks' badges have their colours; the lock is the atlas's glyph, not an emoji.
      - The server: login and registration limits count each try before checking it (a burst of parallel
        tries all got in), and ten wrong guesses from elsewhere no longer lock a player out; a name is one
        account whatever its case; leaving and coming back doesn't shrink the week's boss, and a stranger
        who hits it once and leaves takes their part away; the boss is sized from each member's best attack
        of the week; a clan fight sent twice is one attack; a member stranded in a deleted clan is let out;
        rewards are paid before a week is marked settled; "this week" boards count from where the player
        stood when the week began; the Clan tab polls only while someone is there; a body that isn't JSON
        gets a JSON answer; the health check asks the database every time.
      The wiki was checked the same way after the game (three reviewers: the written pages, the skills, guides
      and FAQ, and the generated tables with the site in a browser at 1280 and 390 px). Its pages now say
      what the game does after the sweep, and older slips are gone: Farming's XP is a harvest's (a crop's,
      shown before, read 6 to 8 times too low an hour), each gear tier names where it really drops (the
      Abyss's bands included), numbers past a million are written as the game writes them (2.23Qi, not
      2230Q), dungeon monsters show their gold, XP and drops, deep bosses their Voidstone, the Titan's
      table what each one pays, search finds "abyss", "titan" or "knight" first, no page opens scrolled
      down, and no table hides a column on a laptop. In the game, a dungeon chest's gear is of the chest's
      tier, as DESIGN §3.11 says (it was a tier either side, like a monster's drop). The wiki's test now
      checks its pictures, its numbers against the game's, Farming's XP an hour and the search index.
      Not done, for later: a crafting tool in the hero's hands at the Crafting stage (an atlas cell to draw),
      and claiming gifts and clan rewards in two steps (an answer lost in the network loses them today)
- [x] **A cap on clan damage** (the owner's report, 13 October 2026: a forged save felled the week's boss
      with one attack of 100T, and the tab said nothing of when the next would come; DESIGN §3.18): one
      attack takes at most a seventh of the boss's health, whatever the save says, so every boss takes at
      least seven attacks, more than anyone can bank. No bans: the best fight an honest player can fight
      stays under it, even alone in a clan, and the attack card says "Capped" when one hits it. Other
      games were looked at first (bans and reports in Tap Titans 2, numbers clamped by the server, a
      ceiling on a hit as in RuneScape's 200 or Guild Wars's guild lords); the owner chose the cap alone. A
      boss that has fallen shows how long until the next (Monday, 00:00 UTC). That week's boss was brought
      back to full health by hand
- [x] **The clan boss comes back stronger: one kill a day** (the owner's design, 13 October 2026; DESIGN
      §3.18): the week's boss, sized on Monday morning, fell that evening, since heroes grew 5 to 80 times in
      a day. Now a felled boss is down until midnight UTC, then back as the next level at twice the health
      (1× Monday … 64× Sunday); one not felled stays as it is; Monday starts over at level 1. Each level's
      kill pays those who fought it. Monday's boss counts only members who played that past week. The cap
      of a seventh is lifted (it hid honest players' real damage): an account flagged for impossible numbers
      deals at most 1% of the boss an attack instead. Other games' guild bosses were looked at first (Hero
      Wars, Clicker Heroes, Tap Titans 2, Raid: Shadow Legends, AFK Arena)
- [x] **The server's save is the game** (the owner's ask, 13 October 2026: "just like any normal online
      game"; DESIGN §3.17): signed in, the game plays the server's save and never asks. "Two saves found"
      is gone; it came up on a plain reload, because the upload a page sends as it closes is a second newer
      than its last local save. This device's game is kept only when it is the server's carried on (the
      server's unchanged since this device saw it, or this game holding all it has); otherwise the
      server's wins, whatever the play time, and a page that finds another device played on carries on
      from there with a toast. Export and import strings are gone from Settings, and a signed-in player's
      Settings show no local backups (a restore rolled the server's game back); a guest keeps them
- [x] **An account is required** (the owner's call, 13 October 2026; DESIGN §3.17): on the live site a
      sign-in stands in front of the game, with no guest button. A new player sees the title card first;
      its Begin asks for an account (Enter registers), and the first fight starts once it is made. Logging
      out uploads the game first and leaves a fresh one in the browser, so an account registered there next
      starts its own game, not a copy. A local host still plays as a guest, for the tools and screenshots.
      Checked in a browser under a made-up hostname and on 127.0.0.1
- [x] **Food and potions that matter** (the owner's ask, 13 October 2026, after a look at the numbers: the best
      food healed 2% of a stage-160 hero, a potion lasted 17 seconds; DESIGN §3.6): food heals a share of max
      health (12% to 46%), eaten below a quarter of it; a potion lasts 5 minutes of its work, multiplies what
      it raises and grows with Alchemy (×1.25 when first brewed, ×2.5 at 99). Work potions on the skill tabs:
      the Gatherer's Draught (faster work in every skill but Farming) and the Scholar's Tonic (skill XP), and
      a Fortune Draught for the fight (gold and drops); their icons are Dungeon Crawl's potions, and their
      card pictures stand-ins, other potion paintings recoloured, until Gemini paints them. Sized with the
      simulator over 30 seeds: a player who brews and cooks reaches stage 100 about 30% sooner than one who
      makes neither, stage 120 about 20% and stage 150 about 12%; one who makes neither plays as before
- [x] **Perks cost more as they climb** (the owner's ask): levels 1-5 cost 1 point, 6-10 cost 2, up to 5;
      a 25-level perk costs 75, and the button shows the next level's price. Levels already bought stay
- [x] **A bigger bag for gold** (the owner's ask: the bag sat at 40/40): +5 slots a purchase, up to 100,
      each dearer than the last; and a Weaker auto-salvage, with a "Salvage weaker" button, for anything
      that wouldn't improve what is worn (never a unique)
- [x] **A mini-game's win is felt** (the owner: "I don't feel anything"): ×2 speed for 45 seconds (5 s more
      a streak win), multiplying every other bonus; the working card glows with a ×2 and its bar shines, and
      the boost's end says what it added ("+14 copper ore, +340 XP"). Playing one keeps Focus
- [x] **When the next clan attacks come**: the Clan tab always says it by the attack pips, "+3 in 5h 12m",
      or with all six waiting "Full · refill in 5h 12m" (a full bank's next ones would be lost), counting
      down between the tab's refreshes; with none left the button says when they come
- [x] **A dungeon run is fought on the Dungeons tab** (the owner: mid-run the tab showed the list as if no
      run were on, and the fight was under Combat; DESIGN §3.23): while a run lasts the Dungeons tab is its
      fight, and Combat, the hotbar and the header's pill lead there; the list and the stages come back
      once the run is over. Checked in a browser at both widths, folded and full, a reload mid-run included
- [x] **The Titan too** (the owner: a Titan felled took the screen to Combat): challenged from the Dungeons
      tab, it is fought there, and after it the tab shows the list again while the hero goes back to his
      stage fight under Combat. **Clears and fragments told apart** on the dungeon cards (the owner read
      "221/50" beside "251 clears" as wrong clears): "251 clears" beside the chest, "33/50 fragments" or
      "221 fragments" beside the unique, the same in the run's panel and on the map; the clear counter
      itself was checked against the boss kills (130 of 130)
- [x] **Skilling that the fight needs** (the owner: lifesteal left no need for food or potions, and players
      fought without ever training; DESIGN §3.6, §3.9). Measured first: 5% of lifesteal healed 1.4 times
      what a stage-140 hero took (monsters have about twenty times his health), and in the simulator food
      changed nothing past stage 100, while a player who never trained ended level with one who did.
      **Lifesteal's ceiling**: it heals only from damage a monster really took, at most 3% of max health a
      second. **Skill records**: every 50 levels of the skills together is a record (×1.05 tokens), with
      a card, and the Hall's Records shows the next. **Dishes say what they heal** on Cooking's cards and
      in the bag ("+23% · 556"), and the Inventory shows lifesteal. Over 20 simulated players: one who
      skills reaches stage 100 in 3.1 h (3.3 before), 120 in 6.2 h (6.1) and 150 in 15.5 h (13.7), the same
      best stage by hour 40 (180); one who never skills takes 24.4 h to stage 150 (16.8 before) and ends
      at 160
- [x] **Fishing joined Hunting** (the owner's idea, 13-14 October 2026; the skill keeps the name Hunting;
      DESIGN §3.10): the two were mirror images, so Fishing's seven spots are now Hunting's River row
      beside the Forest, opening after five dishes. At a river spot the stage shows the river, the rod
      and Finn, bait gives a second fish, and the mini-game is the angler's "Strike!". The bow serves the
      whole skill. Old saves keep the higher of the two levels, both masteries and counts, and the better
      of bow and rod. The wiki's Fishing page became part of Hunting's
- [x] **Three potions that grow** (the owner's idea; DESIGN §3.6): the Combat, Dungeon and Skill Potion,
      four tiers each, one a herb, brewed with ore, a cooked dish or logs. **A potion pick in every place**
      (the owner: there was none on the skill, dungeon or clan tabs): the Combat and Clan tabs and the
      fight's dock take a combat potion, which now works against the clan boss too (the server counts it);
      the Dungeons tab and a run's dock a dungeon potion, or a combat potion at half its strength; every
      skill tab a skill potion, with a tile to Alchemy when there is none. A dungeon potion can bring a
      second fragment. The seven old potions became these by their herb's tier. Over 20 simulated players:
      stage 100 in 3.25 h, 120 in 5.2 h, 150 in 12.7 h, against 3.7, 6.8 and 16.7 h without potions (the
      live game before: 3.1, 6.2, 15.5 h)
- [x] **The potion cards painted, and the skill potion a chip** (the owner's asks): Gemini painted the three
      kinds' cards (a sheet of three tries at each, the best kept: the red flask by a sword and shield, the
      purple by a chest and its key, the green by a pickaxe and an axe). The skill potion's row on the skill
      tabs became a small chip in the header beside the tool ("II · 5m 32s"), opening a tray of the bottles
      carried, and its Brew tile went. Like a slot it is there once Alchemy is open, an empty flask with none
      picked (at first it hid with none carried, and the owner looked for it). Checked at 1280 and 375 px
- [x] **The bonfire raises output** (the owner's idea): while it burns, every gathering and production action
      may make two, 5% at Firemaking 1 to 20% at 99, beside its XP; the pill says "12% doubles"
- [x] **Food and potions that carry the fight** (the owner at stage 177: a run with food and a potion reached the
      same best stage as one without, and food seemed eaten late; DESIGN §3.28). Measured on the owner's own
      save and the simulator's heroes at stages 60-300: eating was never late, but the hero fell from above the
      eat line with food in the bag, a blow at the wall taking a third of his health or more. **Auto-eat before
      a felling blow** while the run climbs (not for a blow past his whole health, a boss that can't fall in
      time, or once held at a wall), and at once after a blow below the line, with a green "+heal" and a bite's
      sound. **The supplies**: from stage 60 the monsters grow to ×1.6 by stage 150 (dungeons and the Titan too;
      gold and loot unchanged), and the potions grew with them (combat ×1.8-3.6, dungeon ×2-4.5); the clan boss
      is sized for it. The owner's hero in a fresh run: bare 170, with food 180, with a potion 188, with both
      198 (before: 180, 180, 188, 190). Over 12 simulated players and 100 hours: with both, best stage 300
      (290 before); without food 268 (267), without potions 250 (259), with neither 220 (237). The simulator's
      bot no longer loops training Cooking on a dish it can't make
- [x] **Each dish burns its own log** (the owner: every dish was cooked on the plainest logs, and better food should
      take better logs): a dish's log is one of its ingredients, the best log at or below its Cooking level (plain
      logs for Roast Rabbit and Shrimp up to magic logs for Drake, Shark, Dragon and Leviathan), shown on its
      card; the cook no longer takes the lowest log carried. Over 12 simulated players and 100 hours the pace
      held (best stage 300; stage 150 in 13.5 h, 12.7 before) with a little more time gathering (18%, 16%)
- [x] **Deeper perks** (feedback to the owner: perks max out too early; with Auto on, a player earns 60-80 skill
      points a day in the simulator): Knight and Warlord to 50 levels, Forager and Scholar to 30, Rogue and
      Fortune to 20, a level's price rising every five levels up to 10 points (5 before), and Paragon's without
      end (40 points at level 200). Every perk but Paragon takes 874 points (269 before): about two weeks with
      Auto on (five days before), and Paragon 4,100 more, months. Over 12 simulated players the pace held, with
      Auto (200 hours) and without (150): the deeper levels only come after the old ones are full, and add
      about what Paragon's levels did
- [x] **A perk reset for everyone** (the owner's ask, with the deeper perks): every save gets its perk levels back
      as skill points, once, on its next load, to spend at today's prices (the more of the levels owned and
      what its prestiges and best stage have paid); the game log says so
- [x] **Gear that matters** (a player: wearing gear or not hardly changed the best stage; the owner: all gear must
      be significant, and a legendary weapon should make the hero stronger at once and push him further; DESIGN
      §3.29). Measured on the owner's save, the tester's and 42 simulated heroes: a legendary weapon for a rare one
      gained 0.3 stages on average, as the walls were blows only armour answered and a legendary was ×1.4. **Rarity
      is a real step**, ×1 / 1.2 / 1.5 / 2 / 2.8 (old gear raised once to match, the log says so); **the ladder's
      bosses test attack**, from stage 60 growing to ×7 health by stage 150 and hitting as their monsters do (gold
      as before); and **each piece says what it does**: "+80% attack, +2.5% health" on the fight's ▲ Equip and an
      item's card, and in gold over the hero as it goes on. Now a legendary weapon for a rare one gains 3.1 stages
      (one dropped at the best stage, 4.7, moving 86% of heroes), a legendary set 9.8 (4.9); the owner's hero
      190 with a rare weapon, 200 with a legendary one (198 either way before). The late pace held over 12
      simulated players (stage 300 at 88.6 h, 92.6 before); stage 150 comes at 11.4 h (13.5). `tools/gearbench.mjs`
- [x] **Drops you feel** (the owner: a rare drop animation, for the feeling of finding something good while
      farming; DESIGN §3.21). The old beam was all but invisible on a bright land, alike for rare, epic and
      legendary, and said nothing of whether the piece was any good. Now a piece worth seeing pops out of the
      falling monster (which flashes in its colour), bounces, and glows by rarity: a ring and a flare, a purple
      pillar, a tall gold pillar with a halo, rays and "Legendary"; an upgrade shows "▲ +38% attack". It then
      flies into the fight's ▲ Equip (which keeps a glow) or the hero's hands. A legendary upgrade adds gold
      at the screen's edges, a held breath, and a card with what it does and an Equip button. Epic has its own
      chime, a plainer upgrade a bright one, and the welcome-back report shows the best piece found while away.
      The legendary card stays until it is tapped (the owner's ask)
- [x] **The endless climb, first part: the balance** (the owner: the late game should be pretty much endless,
      thousands of stages, each new upgrade a push; research in `docs/research_notes/endless-late-game.md`,
      DESIGN §3.30). From stage 400 a stage grows ever more gently, down to ×1.035 health and ×1.03 attack by
      stage 700, and the deep drops ease with them; every prestige adds ×1.002 attack, defence and health to a
      **Legacy** that lasts (an Ascension keeps it; the prestige dialog shows it); the camp's levels go on past
      25 at a price in plain gold, so a deeper run buys more of them. Nothing changes below stage 400. Seven
      simulated players with Auto: stage 1,000 at hour 281 and 1,830 at hour 1,200, still climbing (690, stopped,
      before); 420 at hour 100 (370). Numbers past 10^33 keep their names (Dc, UDc … Ce), the
      leaderboard's allowance for a fast climb was refitted, and its ceilings raised
- [x] **The endless climb, second part: gear** (DESIGN §3.31; how the forge is shown agreed with the owner first). The
      anvil's levels belong to the slot and have no top (+5% of a piece's base a level to +10, ×1.05 past it): every
      piece worn there has them, shown as a plate on the slot, "+14 kept" when a piece goes on, a card the first time,
      "Weapon slot +14 → +15: +5% attack" on the anvil, and "Salvage: +34 essence for the forge". **Mythic** (×4 a common,
      five bonuses) from stage 500 near the best stage, **Primal** (rolled as high as it goes, a sixth bonus) from
      1,000; once a run the first boss at 90% of the best leaves **a piece from the best stage's depth**; item cards
      and ▲ Equip say about **how many stages** a piece is worth. Seven simulated players with Auto reach stage 2,000 at
      hour 1,161 (1,830 by hour 1,200 before), the forge +40 to +51 by then, and a Mythic about once every 21 hours of
      play past stage 500
- [x] **The endless climb, third part: the deep** (DESIGN §3.32). A **Lord** every 100 stages from 200, crowned on the
      path, whose first defeat ever leaves a sure legendary (Mythic from 500); past Pandemonium **the strata come round**
      again without end, numbered and cast in new hues, each with its card; **a medal every 500 stages** from 1,000 (×1.1
      attack, defence and health); Knight, Warlord and Paragon **multiply** instead of adding into the pool of percents
      (×1.025, ×1.025 and ×1.01 a level). Seven simulated players with Auto: stage 1,000 at hour 221, 2,000 at hour 821,
      2,290 by hour 1,200 and still climbing (690, stopped, before the endless climb)
- [x] **The clan banner** (the owner's design, 15 October 2026; DESIGN §3.18): felling the week's clan boss makes
      every member stronger, fought or not, instead of a crate. Each level felled raises the banner, ×1.5 at the first
      and a quarter more a level to ×3 at seven, on attack, defence and health until Monday; it shows under the hero,
      on the boss's panel and on a card as it rises, and the boards leave it out. The boss is counted in the clan's
      attacks: level 1 takes 30 plain attacks at the clan's average strength, each level a fifth more (it was twice),
      so twenty members who use their attacks fell all seven even watching, ten five (seven with a potion), five
      three, and one alone none without a potion; a member joining or leaving moves the average, not the boss. No
      essence or diamonds any more (rewards from before still claim). Seven simulated players with Auto, 600 hours:
      stage 1,870 with one level a week, 1,900 with five, 1,800 alone
- [x] **Back to the Clan tab after an attack** (the owner's report, 16 October 2026): an attack begun while the hero
      fought the stages ended on the stages' fight. The clan boss is now fought on the Clan tab, like the Titan on the
      Dungeons tab: when it is over, its banner shows a moment and the tab shows the clan again, ready for the next
      attack, while the hero goes back to the stages (or his work) behind it. Checked in a browser at both widths
- [x] **Reinforcing past +10 pays the +10 level's Smithing XP** (the owner's report, 16 October 2026: upgrading gear
      gave too much Smithing XP). The XP followed the bars, which grow ×1.15 a level past +10 without a top: a click at
      +40 on Abyssal body armour paid 2.25M XP (several levels in the 90s), at +50 9.1M. The price still climbs; the XP
      stays the +10 level's (34,161 for that piece)
- [x] **Mini-games worth playing** (the owner's go-ahead, 17 October 2026, after the research; DESIGN §3.15): every
      game can be lost but is easy (the heat and the brew are held in a moving band until done, where one tap or a
      drag won every time), each zone has a gold Perfect centre (15 s more and always a find), an ordinary win
      brings a find one time in three (a gem, a bird's nest of logs, game or bait, dishes, potions, bonfire time),
      better resources play harder and pay better while levels make them easier, and a chance waits a minute,
      with a chime Settings can turn off. Checked in a browser at both widths
- [x] **The game on its own server, at fantasyidle.com** (the owner's VPS and domain, 18 October 2026, a fresh
      start; README "The server"): Ubuntu 24.04 behind Cloudflare, SSH by key only, a firewall letting the web in only
      from Cloudflare, fail2ban, security updates by themselves; nginx, the API under systemd, a local PostgreSQL 16 and
      a nightly backup; the wiki at wiki.fantasyidle.com; `deploy/vps/deploy.sh` ships a commit and switches back if
      its API doesn't answer. The old Vercel site stays as it was
- [x] **The API's queries on a real Postgres** (S): the whole API suite (36 tests) passed against the server's
      PostgreSQL 16 on 18 October 2026, every query in `api/store.js` with it
- [x] **Saves every minute** (the owner, 18 October 2026, once the game had its own server: "traffic is not an
      issue"): the game uploads every minute while its page is open, in the background too, and on leaving unless it
      just did (it was every ten minutes and only while the player was around, for the free database on Vercel)
- [ ] **Backups off the server** (S): the nightly backups stay on the VPS for now (14 days); a copy elsewhere
      (Cloudflare R2, or the owner's Mac) and a restore tried once
- [x] **Sign-up by email** (the owner's ask, 18 October 2026, with Resend): a sign-up gives an email, and the account
      plays once the 6-digit code mailed there is entered; "Forgot your password?" sets a new one with a code. One
      account an email; codes last 15 minutes and take 5 tries; the mail comes from noreply@fantasyidle.com (DESIGN
      §3.17). Checked in a browser at both widths, and against the server's real PostgreSQL
- [x] **A camp level never costs less than the one before** (the owner's report, 18 October 2026: "at certain levels
      (i found it on 25) the cost resets"): from best stage 128 the 25th level, the first in plain gold, cost less than
      the 24th, priced by the best stage. Every level gives the same, so the camp now sells the cheaper of its two kinds
      first (DESIGN §3.30). Nothing changes below best stage 128; deeper, the plain-gold levels come early in a run,
      and a deep run climbs faster for it, the owner's choice (stage 780 at hour 150 instead of 560; with Auto, 1,000 at
      hour 153 instead of 201). The camp's "?" card and the wiki say the new rule; checked in a browser at both widths
- [x] **A clan attack is the hero at his best of the week** (the owner, 20 October 2026: a member hit the boss for
      626M in one attack against 78M in three, attacking at a run's end with the camp full; "making it only about
      max stage"; the week's best attack was suggested instead, and taken): an attack is the hero's best plain attack of the past seven days, wherever in a run it is made, with
      this fight's strikes and potion on top, and the fight on screen hits as hard; the boss is sized again each UTC
      day from the members as they are, and the week's board keeps each attack as it was dealt (DESIGN §3.18). Tested
      against the server's real PostgreSQL too
- [x] **The chain over the fight** (the owner's numbered points, 21 October 2026): every 20–30 seconds of a fight on
      screen, five numbered points; struck in order within 4 s, a little gold, and within 2 s a short rally of attack
      speed. A wrong click does nothing; random clicking almost never finishes one; the guide's hand shows the first
      chain (DESIGN §3.6). Strikes on the monster stay as they were: the first version (a flurry, combo, finds, and
      no strikes outside the clan fight) was taken back the next day at the owner's word, "clicking is the important
      aspect". Checked in a browser at both widths
- [x] **Tools in the Shop** (the owner, 21 October 2026: tools are purchases, not skill work): pickaxes, axes,
      tinderboxes, hoes and bows bought in the Shop's Tools panel for the bars and logs they always took, each tier
      once the skill it serves reaches its level; the Shop's button shows ▲ when one is ready. Smithing's Tools step
      and Crafting's bows are gone (DESIGN §3.3)
- [x] **No forging** (the owner, 21 October 2026, after the measurement: copper forging kept stage 100 at 2.5 h
      against 4.4 h without it, and the owner chose to let it go): every weapon and piece of armour drops; Smithing
      is smelting and the anvil; an old order to forge is dropped (DESIGN §3.4)
- [x] **Cheaper supplies** (the owner, 21 October 2026: 25 coal is mined in seconds, but a Coal Wagon cost minutes of
      fighting): priced at the furthest stage of the run instead of the best ever, at 4–6 kills a pack (25–40
      before), essence 30 (80), gem pouches 8 / 12 / 18 (50 / 80 / 120), never under a quarter over the resale (DESIGN §3.8)
- [x] **A felled Titan or a clan attack goes straight back to its tab** (the owner's report, 21 October 2026: the hero
      went on farming the stages on screen for seconds first): the fight's last moment holds 1.5 s, frozen (it was 2.4 s,
      drawing the stage fight the hero was already back at), then the Dungeons or Clan tab shows its page. Checked in a
      browser at both widths, against the live version that showed the stages
- [x] **The anvil shows the bonuses** (the owner, 21 October 2026: rerolling meant guessing what came): each card lists
      its piece's bonuses, and after a reroll the new ones glow, marked "new", for a few seconds. Checked in a browser
      at both widths
- [x] **The chain keeps out of the strikes' way, and off an auto-clicker's** (the owner, 21 October 2026: clicking
      didn't feel as before, and an auto-clicker froze the computer): the points never sit on the monster (they did in
      nearly every chain, every one on a phone), a click on the monster is always a strike, the chain counts its clicks
      on its own clock, striking its points keeps the combo; a press on a point takes no focus and plays no click
      (an auto-clicker on one moved the focus 2,000 times a second). Mashing through chains lands as many strikes as
      before the chain. Checked in a browser at both widths, with a simulated auto-clicker (DESIGN §3.6). Then (as the
      chain's design said, and wasn't done) the points keep off the health bars and names too, where there is room
      (on a phone they give way), and never overlap one another
- [x] **Crafting levels like a skill again** (the owner, 21 October 2026: "levelling up crafting feels too hard"; the
      options were given that morning and waited for a pick; "why didn't you do your recommendations"): **plain
      pieces**, a ring, earring or amulet from the setting alone (a bar, no gem) for 70% of the XP of the best gem the
      jeweller can set, picked for you while you hold no gems; Crafting's late XP paced at 2 instead of 4. With the
      cheaper gem pouches above, a crafter who mines and smelts their own bars reaches 75 in about 48 h (270–510 h
      before the pouches, 90–150 h after them) and 99 in about 414 h. The climb is unchanged in the simulator. Also
      fixed: text left from moving the tools to the Shop and from the end of forging (bows "made in Crafting",
      tools "forged in Smithing", "past copper", "forged or crafted") in the help cards, medals and wiki (DESIGN §3.4,
      §5.1). Checked in a browser at both widths
- [x] **The chain over the fight is gone** (the owner, 21 October 2026: "mouse macro still freezes the game, remove
      minigame if needed"; "there is nothing wrong with using mouse macro"): with macros fair play the chain had no
      purpose, and in real Chrome under ~2,000 clicks a second only the builds with it stalled. The fight is as it was
      before it, and a click inside the strike's quarter second costs nothing now (DESIGN §3.6)
- [x] **The jeweller's bench** (the owner, 21 October 2026: "do jewellery bench"): Crafting's second step, from level
      5, upgrades the jewellery the hero wears (+5% a level to +10) and rerolls its bonuses with gems of its tier and
      essence, and no gold, for half the gems' Crafting XP and their mastery; the Inventory's gold upgrade and reforge for jewellery
      are gone (their levels stay). Jewellery drops at every rarity (an empty jewellery slot takes no ×4 tilt). Checked
      in a browser at both widths (DESIGN §3.4, §3.5, §3.25)
- [x] **The bench's levels belong to the slot, like the anvil's** (the owner, 22 October 2026, on "anvil upgrades are
      for the item slot, bench upgrades are for the items": "I like all your recommendations"): every ring, earring or
      amulet worn in a slot has its levels, with no top (×1.05 a level past +10, gems ×1.15), so a better piece loses
      nothing; rerolling stays the piece's. Saves fold each piece's own levels into its slot (DESIGN §3.4)
- [x] **Dungeon tiers and the Seal; uniques are records once found** (the owner, 22 October 2026: "Dungeons end too
      early"; "I like all your recommendations"): with 250 clears in every dungeon and the tier's eight uniques in
      hand, Make the Seal hands them in (no bag slot, two records) and opens the next tier: the same eight 300 stages
      deeper, a numeral and new hues, a rule for their monsters in turn (Swift, Stout, Savage, Relentless), uniques of
      their own at their depth, clears, fragments and milestones from nothing. Every unique found stays a record, so
      none has to sit in the bag. Checked in a browser at both widths (DESIGN §3.11)
- [x] **Alchemy past 68, and potions that run out** (the same day: "newer things should open and creation and usage
      balance"): tiers V and VI of the three potions (Combat V 75 to Dungeon VI 94) from two new herbs, Ranarr (70)
      and Torstol (85), foraged and farmed; a bottle lasts a minute instead of five, and from tier IV a brew takes two
      herbs and about five seconds, so an hour of brewing lasts 15-17 hours of use instead of 135-250. The pick, the
      fight's dock and the skill chip show how long the bottles carried will last (DESIGN §3.6)
- [x] **A custom domain** (the owner's purchase): fantasyidle.com, its DNS on Cloudflare (proxied, origin certificate,
      SSL Full strict)
- [x] **The beta's Discord** (22 October 2026): a link in Settings ("The beta") and on the Clan tab, and on the
      wiki's home page; the wiki points at fantasyidle.com
- [x] **A link preview** (22 October 2026): a shared link shows the game's own fight under its title
      (`assets/og-image.jpg`, made by `tools/preview.mjs`)
- [x] **Guest play** (the owner's call, 22 October 2026, after a tester played by taking the sign-in off the page:
      "opening account should restart the process, not move it"; DESIGN §3.17): the sign-in has **Play as
      guest**, and a guest's game stays in that browser, with a Guest pill in the header. An account made or
      signed into later plays its own game, the server's or a new one from the title card; the guest's is put
      aside among the backups, never uploaded. The account's own game, signed in again after its 30 days, is
      kept. Checked in a browser under a made-up hostname with a local API: a guest, an account made from a
      guest's game, a log-in from one, a session run out, a game played with the sign-in taken away, and a first
      visit straight to an account, at both widths
- [x] **A guest at once inside another site's frame** (the owner's "you do it", 22 October 2026, ahead of a
      galaxy.click listing): framed, Begin goes straight into the fight, the account one click away. Checked in a
      frame with galaxy.click's own sandbox and permissions at its size (about 1500×600) and at 390 wide
- [x] **Listed on galaxy.click and itch.io** (the owner's asks, 22-23 October 2026; README "Listings"): both show the
      live game in a frame; itch.io's page plays `deploy/itch/index.html`, with a 630×500 cover and six screenshots,
      and is public since 24 October (https://impotentrage.itch.io/fantasy-idle)
- [x] **The bonfire's time on a phone** (a tester's ask, 24 October 2026): the header's bonfire pill shows the time it
      has left there too, as the event's pill does, instead of only its bonus (still in its title, and on wider screens)
- [x] **The week's clan ranking** (the owner's eighth boss, 25-26 October 2026; DESIGN §3.18): divisions by the levels
      felled (Champion, Gold, Silver, Bronze), ranked inside each by the Endless Hydra, a boss that never falls, awake
      from Saturday 00:00 UTC to the Monday reset: two fights for each member who was in the clan when the week began,
      the deepest counting as depth, a clan's best 15 together. Crowns for last week's top three, and the clan's best
      week. Checked in a browser with the server's clock moved: asleep, awake and fought, and the crowns the next Monday
- [x] **Clan power** (the owner's report, 26 October 2026: only the strongest member's attacks moved the clan boss;
      DESIGN §3.18): an attack counts how it was fought times the member's clan power, from their best stage against
      the clan's (the square root, between half and double, the members averaging one), so a stage-1,000 hero beside a
      stage-200 one deals about 69% of the damage instead of all of it, and a clan that fights together fells the boss
      as fast. Level 1 is 20 attacks (was 30), so active clans keep the pace they had. Each member sees the boss in their
      own hits; the week's board shows shares, and the members' table drops the damage per attack. The rule is behind
      the Clan's "?"; `tools/clanpower.mjs` checks it
- [x] **A new monster drops in** (the owner's question on auto-clickers, 27 October 2026; DESIGN "Clicks and combo"): for
      0.42 s, its entrance on screen, no strike reaches it, so on easy stages and in easy dungeons an auto-clicker fells
      about twice an idle hero's monsters instead of four to five times, the same as a hand at two clicks a second; the
      hero's own swings never wait, and real fights, idle play, the Titan and the clan boss are as they were
- [x] **The bag's room for essence too** (the owner's go, 27 October 2026; DESIGN "Bag and lock"): each +5 slots can be
      bought with gold as before or with essence (2,000, half as much again each time), since from the fourth on the
      gold came to more than a late run's whole gold; and three "?" texts brought up to date (supplies priced by the
      run's furthest stage, perks' rising prices, jewellery at the bench)
- [x] **Trials without end** (the owner's go, 27 October 2026; DESIGN §3.26): past the five tiers each Trial's ladder
      goes on, a rung at stage 500 and one every 250 to 10,000, each a record (all forty tiers had fallen by hour 65);
      from best stage 500 a run may take up to three Trials at once, a **Pact**: their rules together, the stage counting
      on each ladder, each card's heat on its icon; the week's Trial in a Pact wins a laurel for each Trial in it, up to
      three a week; the week's board ranks a run by its share of the player's own best stage. Glass Hero now falls to
      the first blow that lands, a Brute's blow staggers, and Fasting takes the potion too (deep, the three had cost
      nothing); Glass Hero's and Fasting's first tiers came down to 170. The simulator's bot enters Trials with Auto on
      (`--pacts` for Pacts): the rungs speed a deep climb by about 13% and fill the late waits, Pacts by 1% more; the
      server's climb allowance was refitted (the honest climb had come to 76% of it)
- [x] **The War Tree** (the owner's go, 27 October 2026; DESIGN §3.33): Combat's levels go on past 99, each a talent point
      (a hero at the old cap has seven), in three trees of seven rows like WoW Classic's: Blade, Bulwark and Hunt, a row
      opening with five more points in its tree, arrows to the talents that wait for another, a capstone at 31 points
      (Deathblow, Unbreakable, Relentless). A tab in the perks dialog with the points in the purse and the dock; unlearning
      costs essence, more each time. Paced as shown to the owner: level 120 five days after the old cap, the first
      capstone about two weeks; a capstone build adds 10 to 20 stages to a run, and the tree about 3.5% to the best
      stage at hour 600
- [x] **Charms** (the owner's go, 27 October 2026; DESIGN §3.34): kits with charges for essence in a Charms panel of the
      Shop, on its own Gemini painting (the Charm Maker's Bench): Gem Gloves (a gem with every rock), Furnace Bellows
      (bars without coal), Chef's Gloves (every dish two), the Compost Sack (harvests half again), each opening as its
      skill meets what it eases, kept through prestige, its charges shown in its skill's header; a weekend event's shop
      sells them for 40 Festival Tokens too. Also: a save's camp levels are capped where gold could ever reach (a forged
      1e300 made attack Infinity), and the War Tree's ranks and the charms are mirrored in `meta` against older pages
- [x] **The Clan Hall** (the owner's go, 27 October 2026; DESIGN §3.35): members give bars, ores, logs, raw meat and fish,
      food, herbs, potions, crops, gems and essence to six rooms, counted in the work they take to make, three hours of
      work a member a week; each room's five levels give every member a small bonus to skilling or supplies; the hall
      grows from a Camp to a Citadel on five Gemini paintings of one clearing, opening colours and emblems for the banner
      its owner picks; from the Great Hall, ten hours given wear the clan's cloak, the rank cloak in the banner's colour.
      A Hall column in the members table, the stage on the clan list, a card for each room's level, stage and the cloak
- [ ] **A playtest with people** (the owner's): the playtest log (Settings) exported for `tools/playtest.mjs`

A rule to settle (the owner's call):

- [x] **Retreat during a boss** (S; settled by the owner, 16 October 2026: "my hero's hp regens but the enemy's
      doesn't"): leaving a fight at the stages (Retreat, work, a prestige) makes the monster whole again, a boss's
      clock starts over and a pack starts whole, as after a fall; the same monster, so no new roll for a gilded
      one. A boss says so in the battle log (DESIGN §3.6)

The long game (the research's last items):

- [x] **Something to reach past stage 500** (M): past it only the records and the calendar were left. Now a
      Lord every 100 stages, the strata coming round past Pandemonium, and a medal every 500 (the endless climb,
      third part, below)
- [ ] **An end boss** (M)
- [ ] **Early Ascensions that each open something new** (M)
- [ ] **A cape for 100% completion** (S)

Parked ideas (the owner: logged, not now):

- [ ] **The Quartermaster** (S; parked by the owner, 27 October 2026: "it would make prestiging even stronger"): a
      one-time hire in the Shop, about 100 kills of gold at the best stage once Auto prestige is earned, who keeps the
      camp bought, its cheapest level first, while the hero fights, while the player is away and after an Auto
      prestige (never in No Camp; a switch on the camp turns him off). Today nothing buys the camp while the player is
      away, so a player who checks in three times a day spends 7% of the gold earned. Measured with a test buyer in
      the offline replay (12 seeds, three visits a day, Auto, 300 h): best stage 530 -> 850, gold spent 7% -> 96%; a
      player who stays online buys his camp already and doesn't change
- [ ] **The clan rulers' habits** (S-M; parked by the owner, 27 October 2026, who wants a better clan idea and a
      research loop for clans later): each of the ten rulers who take turns as the week's clan boss would fight in its
      own rhythm (Goblin Chieftain short openings often, Abyss Warlord three openings worth x4.2, Elder Treant weaker
      swings outside the openings and stronger inside, Thunder Roc openings at uneven times), each tuned so a fight
      fought perfectly is worth what it is today and a hero who only watches counts the same (the clan's balance holds),
      every opening glowing half a second ahead; and the weekend's Endless Hydra two of six heads with their own twist

**Exit:** a month of real players with no lost save, the free database within its month, and a big
moment at least every 48 hours of play past stage 500.

## Deferred on purpose

Ranged/Magic combat styles with Fletching/Runecrafting (L); Township or Summoning-scale systems;
real-time chat; synchronous party content; gacha pets; purchasable power (the owner plans it for
later, not only for the online clan side, the game's most important part: see
[Decisions for the owner](#decisions-for-the-owner), 2).

---

## Decisions for the owner

1. **`JWT_SECRET` in Vercel: done** (11 October 2026, Production and Preview, a Secret). The API refuses
   to issue tokens without it (the old code silently used a public hard-coded secret). Changing it signs
   every player out.
2. **Monetization and hosting.** For now the game is free with nothing for sale, which fits Vercel's
   Hobby plan (non-commercial). The owner's intent for later (October 2026): players will be able to
   spend money to get stronger. The clan (guild) section is the most important part of the game,
   because it is online, but what is sold is not limited to it. Not built yet, and deferred with the
   rest; shipping comes first, later. When it comes, the research's warning stands: paid power plus an
   online side needs that side to be server-authoritative (the server decides fights and rewards,
   since a browser save can be edited), and selling anything needs a commercial hosting plan (Vercel
   Pro or another host). Clans and leaderboards run on a free Neon database since 11 October 2026 (README
   "The API"); its limits are in Phase 9.
3. **`api/node_modules` is still committed** (1,099 files), and can go now: every production build
   shows Vercel installing the API's packages from `api/package.json` itself (the CLI never uploads
   `node_modules`; a deploy sends 288 files). Remove it with `git rm -r --cached api/node_modules`; the
   tests then need `npm ci --prefix api` once. It also slows git on the owner's iCloud-synced disk.
4. **Old database row in git history.** `api/fantasy-idle.db` (removed in this change) held a username
   and a bcrypt password hash; it is still in the repository's history. If that password is used
   anywhere else, change it.
5. **Balance intent — decided: Melvor pace** (October 2026). Level 99 takes 190–290 h of training
   for each skill (no boosts; Crafting, two inputs a piece, 83 h with them in the bank, since 21 October 2026) and 160–210 h of mixed play for combat; the 100 authored stages
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
