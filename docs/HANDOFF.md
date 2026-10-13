# Handoff: Hunting with its river, three potions that grow, bonfire doubles (work in progress)

*Saved 13 October 2026, when the owner ran low on tokens ("save everything properly where you can continue
when I command"). Delete this file in the commit that lands the work.*

## Where the work is

- **Not deployed.** The live game and wiki are at `6d6acff` (lifesteal's ceiling, skill records).
- The work is committed on the branch **`claude/wip-hunting-potions`** (pushed to origin), one commit on top
  of `6d6acff`. The main checkout (`/Users/tufanakarirmak/Documents/idle2`, branch
  `claude/intelligent-einstein-y5i5iq`) may also still hold the same changes uncommitted.
- To resume in a fresh checkout or worktree: `git fetch origin claude/wip-hunting-potions` and work from
  it. When done, fast-forward `claude/intelligent-einstein-y5i5iq` to the finished commit (commit with
  plumbing: `git status` hangs on this iCloud folder), push, deploy.

## What the owner decided (13 October 2026)

1. **Fishing joins Hunting**, and the skill keeps the name **Hunting** (not "Hunting & Fishing").
2. **Three potions, simply named**: Combat Potion, Dungeon Potion, Skill Potion, four tiers each (I-IV),
   one tier a herb. The combat potion is strong in combat (the stages, the Titan *and the clan boss*:
   "the player should use combat potion in clan"); the dungeon potion is strong in dungeons; a combat
   potion also works in a dungeon run, "just worse" (half: `OUT_OF_PLACE`). **A potion pick in every
   place**: the Combat tab and the fight's dock (combat), the Dungeons tab and a run's dock (dungeon), the
   Clan tab (combat), every skill tab (skill).
3. **The bonfire raises output** too: a chance of a double, 5% at Firemaking 1 to 20% at 99.
4. "Start. **Finish all and deploy.**" (deploy the game and the wiki when it is done and checked).

## Done (tests: 323 of 328 pass; the 5 failing are the wiki's, see below)

**A. Bonfire doubles.** `BASE.bonfireDouble` / `bonfireDoubleAt99`, `bonfireDouble(level)` in
`src/core/modifiers.js`, added to `doubleChance` of every skill but Firemaking, Farming and Agility while
the bonfire burns. The header pill ("+8% XP · 12% doubles · 42m"), Firemaking's strip and About card and
the skill's description say so. Test in `test/brews.test.mjs`.

**B. Fishing became Hunting's river.**
- `src/data/skills.js`: `fishing` removed from `SKILL_IDS` / `GATHERING_SKILLS`; its seven spots are
  Hunting nodes with `fish: true` (grouped "Forest" and "River" on the tab: `nodeGroup` in render.js).
- The Bow serves the whole skill (the Rod is gone from `TOOLS`); Finn is a Hunting pet (`petToFind`:
  Scout, then Finn); the Angler medal is Hunting 50; the fishing cape is gone; events, agility, pace,
  perks and unlocks updated (the Fishing unlock is gone; the river opens through the disclosure
  `river`: five dishes cooked, a fish caught or carried).
- Bait and `fishCaught` go with `def.fish` (`systems/skilling.js`); the river's mini-game is
  `MINIGAME_CONFIG.river` via `minigameConfig()` (`systems/minigame.js`); the skill stage shows the
  river, the rod and Finn at a river spot (`ui/stage.js`).
- Old saves: `foldFishingIntoHunting` in `src/core/state.js` (the higher level, both masteries and
  counts, the better of bow and rod, the action, the cape, the river opened); a remembered "fishing" tab
  opens Hunting (`main.js`).
- Wiki: the Fishing page merged into `wiki/content/skills/hunting.md` (aliases Fishing, River); links
  and pages updated. Tests updated (`skills`, `capes`).

**C. Three potions that grow** (most of it).
- `src/data/potions.js` rewritten: `POTION_KINDS` (combat power 0.15/0.3/0.5/0.75; dungeon power
  0.25/0.5/0.8/1.2 and fragment chance 0.1-0.4; skill speed 0.1-0.5 and XP 0.1-0.4), `OUT_OF_PLACE`,
  `potionName`, `potionsFor(kind)`, `potionsForSlot(slot)`, `potionPower(id, place)`,
  `potionFragmentChance`, `potionEffectText(id, place)`.
- Twelve resources `combat_potion_1..4`, `dungeon_potion_1..4`, `skill_potion_1..4`
  (`src/data/resources.js`); Alchemy's recipes (`src/data/skills.js`): each tier's herb with ore
  (combat), a cooked dish (dungeon) or logs (skill).
- Slots: `combat.potion`/`potionMs` (stages, Titan, clan), new `combat.dungeonPotion`/`dungeonPotionMs`
  (runs), `workPotion` (skills) in `src/systems/potions.js` (`setPotion`, `setDungeonPotion`,
  `setWorkPotion`, `fitsSlot`); `potionEffects(state)` in modifiers.js by place (the clan fight takes
  the combat potion; a bottle left counts there, for the server).
- The server: `stableState(raw, now, { clan: true })` in `src/core/power.js` keeps the combat potion for
  a clan attack; the boards and boss sizing stay potion-free.
- A dungeon potion's second fragment: `completeDungeon` in `src/systems/dungeon.js`
  (stat `potionFragments`).
- Old saves: `OLD_POTIONS` / `convertOldPotions` in state.js (by herb tier; the Fortune Draught becomes
  the dungeon pick).
- UI: one `potionPicker(game, slot)` in render.js, used by the fight's loadout (dungeon slot in a run),
  the Dungeons tab, the Clan tab and every skill tab (disclosure `work_potions` now opens with Alchemy);
  tier marks on the tiles (`.pick-tier`); the scene shows the place's potion; Alchemy's About card.
- Art: 12 icons appended to the atlas (`TIERED_POTIONS` in tools/atlas.py; no old cell moved); three
  stand-in card pictures `combat_potion`, `dungeon_potion`, `skill_potion` (tools/cards.py `RECOLOURS`),
  shared by each kind's four tiers (render.js and test/cardart.test.mjs).
- The simulator brews and drinks the best of each kind (`tools/simulate.mjs`).
- Tests: `test/brews.test.mjs` (combat, clan with the server, dungeon with half combat and the fragment,
  skill, old saves), `test/sweep.test.mjs`, `test/bugsweep.test.mjs`.

## Left to do, in order

1. **Wiki pages still naming the old potions** (the build stops at the first; `node wiki/build.mjs --out
   <scratch dir>` shows which): `wiki/content/guides/combat-progress.md` (table rows 54-57),
   `wiki/content/skills/alchemy.md` (table rows 13-16 and its text), `wiki/content/potions.md` (rewrite:
   three kinds, four tiers, a pick in each place, half strength in a run, the clan boss, the fragment),
   `wiki/content/guides/training-skills.md` line 35 (`n.id === 'accuracy_potion'`), the Firemaking page
   (the bonfire's doubles). Grep `wiki/content` for `_potion`, `Potion]]`, `draught`, `tonic`,
   `Evasion`, `Fortune`. Then `node --test test/wiki.test.mjs`.
2. **Credits**: a line in `assets/CREDITS.md` for the twelve potion icons (DCSS potion tiles, CC0) and the
   three stand-in card pictures (recoloured Gemini paintings).
3. **Docs**: `docs/DESIGN.md` (the potions paragraph in §3.6, the skills lists naming Fishing, the
   bonfire, the potion picks per place, the clan fight's potion), `docs/ROADMAP.md` Phase 9: tick the
   three "Still to do" items (Fishing and Hunting as one skill; Alchemy's three potions; the bonfire
   raises output) with what landed, and a line for the potion pick on every tab.
4. **Balance**: from a scratch copy (`cp -R src tools <scratch>`), `node tools/batch.mjs --seeds=20
   --hours=40 --quiet --label=new` and `--without=potions`; compare with the last numbers (stage 100 in
   3.06 h, 120 in 6.22 h, 150 in 15.5 h). Target: potions speed a push about 15-30%, never required.
   Tune `POTION_KINDS` if needed.
5. **Browser checks** (`.claude/launch.json` "game", `?dev=1`): Hunting's Forest and River rows, the
   river stage (rod, river, Finn) and its "Strike!" mini-game; the potion picks on the Combat tab and
   dock, the Dungeons tab and a run's dock (a combat potion marked half), the Clan tab, every skill tab
   (the Brew tile with none); tier marks; Alchemy's cards; an old save converting. Then
   `node tools/shots.mjs` (no sideways scroll at 1280 and 390).
6. `node --test --test-timeout=120000 test/*.test.mjs test/*.test.cjs` all green; commit, push, deploy
   the game and the wiki (memory "live-deploy"), check `/api/health` and that the live page loads;
   remove this file in that commit; tell the owner, with the simulator numbers.
