# Fantasy Idle — audit of the current game (repository `/home/user/idle2`, HEAD `f3e5f7e`, 2026-03-27)

Sources: the repository files `index.html` (475 lines), `main.js` (2,270 lines), `style.css` (871 lines), `api/index.js`, `api/database.js`, `vercel.json`, git history; plus two scripts written for this audit and run with Node v22.22.2 (nothing in the repository was modified):

- SIM = [audit-sim.mjs](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs) — re-implements the formulas copied verbatim from `main.js` and prints the tables pasted below (full output: [audit-sim-output.md](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim-output.md)).
- HARNESS = [verify-bugs.mjs](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/verify-bugs.mjs) — loads the *real* `main.js` into a Node `vm` context with a stub DOM/localStorage/clock and executes specific code paths; 26/26 checks pass plus two measurement runs ([verify-bugs-output.txt](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/verify-bugs-output.txt)). "(HARNESS Tn)" below means the claim was executed, not just read.

Links of the form `main.js:NNN` point at the repository file and line. The headline finding, which every later section has to be read against: **in the shipped build no piece of equipment can ever be created** (`getRandomRarity` throws a `ReferenceError` on every call — see Q7 bug #1), so the "with gear" numbers in Q3–Q4 describe what the formulas *would* do once that one line is fixed.

---

## Q1. Systems map — every system, its inputs/outputs/formulas, and what feeds what

### Takeaway
The game is one global `state` object mutated by a 50 ms `setInterval`; there are 21 identifiable systems, of which 6 are non-functional or purely decorative (equipment generation, achievements rewards, daily reward, clan, auth/API, tutorial). Combat and gathering are mutually exclusive (one `state.action` at a time), the only progression currency that moves between systems is gear stats → combat stage → prestige tokens → +10%/level multipliers, and that chain is currently severed at the gear step.

### Cited Findings

**Core state & loop**
- Single global `state` with keys `resources` (52 ids incl. `gold`), `inventory[]`, `equipped` (12 slots: Head, Body, Legs, Boots, Gloves, Weapon, Shield, Ring1, Ring2, Neck, Ear1, Ear2), `stats`, `achievements[]`, `skills` (7), `action`, `combat`, `unlocks`, `flags`, `shop.upgrades`, `shop.skills`, `activePlay`, `inventoryOrder[]`, `idCounter` — [main.js:2-88](../../../main.js#L2).
- Game loop: `setInterval(..., 50)`; per tick it advances the active action, runs combat, autosaves every 10,000 ms, re-renders minigame panels every 250 ms, decays cooking heat, forces all unlocks, checks achievements and the daily reward — [main.js:1272-1410](../../../main.js#L1272).
- The loop is registered before `loadGame()` is called (last line of the file), and `saveGame()` is only ever called from the loop — [main.js:1272](../../../main.js#L1272), [main.js:2270](../../../main.js#L2270), [main.js:1388-1392](../../../main.js#L1388), grep: single call site.

**Resources & gathering skills (mining, woodcutting, hunting, cooking, alchemy)**
- Node tables (`SKILLS_DATA`): 14 mining nodes (copper Lv1 2,000 ms 5 XP … diamond Lv85 60,000 ms 800 XP), 6 woodcutting, 7 hunting, 7 cooking (each consumes 1 raw meat), 8 alchemy (4 forage + 4 brews) — [main.js:143-211](../../../main.js#L143). Every node produces `amount: 1`.
- Starting a node requires `skills[skill].level ≥ node.levelReq` — [main.js:636-644](../../../main.js#L636). Only one action exists at a time; starting any action switches combat off, and entering combat clears the action — [main.js:259-270](../../../main.js#L259), [main.js:957-967](../../../main.js#L957).
- Action duration: `actualTime = baseTime / speedMult`, `speedMult = (1 + 0.10·miningSpeed + 0.05·rogue) × (isWorkshop ? 1 : minigameBoost)`; progress accumulates real `dt`, one completion per tick — [main.js:1285-1303](../../../main.js#L1285).
- Consumable nodes stall (progress bar turns red) when inputs are missing — [main.js:1289-1297](../../../main.js#L1289), [main.js:1337-1341](../../../main.js#L1337).
- XP: `xp += amount; while xp ≥ nextXp: xp -= nextXp; level++; nextXp = floor(nextXp × 1.5)`, starting `nextXp = 100` — [main.js:646-661](../../../main.js#L646), [main.js:28-34](../../../main.js#L28).

**Active-play minigames (one per gathering skill)**
- Config: mining/woodcutting "timing" (zone width 0.16, cycle 900-1,400 ms), hunting "moving-target" (zone 0.14, cycle 1,000-1,500 ms), cooking "heat" (start 0.35, +0.12 per tap, decay 0.00008/ms, target start 0.42-0.54, width 0.18), alchemy "drag" (visible target 0.48-0.64, width 0.16, slider input) — [main.js:219-225](../../../main.js#L219), [main.js:300-344](../../../main.js#L300), [main.js:395-408](../../../main.js#L395), [main.js:1400-1404](../../../main.js#L1400).
- Reward: `streak = min(5, streak+1)`, `bonus = min(maxBonus, baseBonus + (streak-1)·0.05)` (mining 0.20→0.45, cooking/alchemy 0.24→0.49), boost lasts 15,000-18,000 ms; failure or a 10 s expiry zeroes streak and bonus — [main.js:352-369](../../../main.js#L352), [main.js:285-291](../../../main.js#L285). The bonus multiplies gathering speed only (`getNonCombatBoostMultiplier`) — [main.js:280-283](../../../main.js#L280).

**Workshop (smelting → smithing / crafting)**
- Smelting recipes: copper←1 copper; iron←1 iron+1 coal; silver←1 silver_ore; gold←1 gold_ore; mithril←1+2 coal; adamant←1+3 coal; runite←1+4 coal; 2,000 ms, 15 smithing XP — [main.js:132-140](../../../main.js#L132), [main.js:1803-1821](../../../main.js#L1803).
- Smithing: 5 bars of the selected type → one item of the chosen slot, 4,000 ms, 50 XP; no level requirement — [main.js:1823-1838](../../../main.js#L1823). Crafting: 1 bar + 1 gem → Ring/Neck/Ear, 5,000 ms, 75 XP; the bar dropdown offers only Silver and Gold bars — [main.js:1840-1857](../../../main.js#L1840), [index.html:298-301](../../../index.html#L298).
- Workshop completions run in the same loop branch (`isWorkshop`), so token/Rogue speed applies to them, the minigame boost does not — [main.js:1280-1324](../../../main.js#L1280).

**Procedural equipment & rarity**
- Materials: `BARS` power copper 1, iron 3, silver 2, gold 2, mithril 8, adamant 20, runite 50; `GEMS` power amethyst 1, topaz 2, sapphire 6, emerald 15, ruby 35, diamond 80 — [main.js:91-108](../../../main.js#L91). Slot multipliers (`EQUIP_MULTIPLIERS`): Weapon 3/0, Shield 0/3, Head 0/1.5, Body 0/2.5, Legs 0/2, Boots 0/1, Gloves 0.5/1, Ring 1.5/1.5, Neck 2.5/1, Ear 1/1.5 (atk/def) — [main.js:110-116](../../../main.js#L110).
- Rarities: common w100 ×1, uncommon w40 ×1.5, rare w15 ×2.5, epic w5 ×4, legendary w1 ×8 (total weight 161) — [main.js:1708-1714](../../../main.js#L1708).
- Smithed item: `pwr = power × rarity.mult; variance ∈ [0.9, 1.1); baseAtk = round(pwr × mult.atk × variance)`; stored `atk = floor(baseAtk × rarity.mult)` — rarity applied a second time; `value = round(pwr × 15 × variance)`; level text `max(1, floor(pwr/5) + rand(0..2))` — [main.js:1726-1759](../../../main.js#L1726). Secondary stats only for non-common: 50% chance each of crit ≤0.02·mult, critDmg ≤0.1·mult, dodge ≤0.01·mult, weapon speed ≤100·mult ms — [main.js:1738-1744](../../../main.js#L1738).
- Jewelry: `pwr = (bar.power + gem.power) × rarity.mult`, same double application, `value = round(pwr × 25 × variance)`, 70% chance of each secondary (crit ≤0.03·mult, critDmg ≤0.15·mult, dodge ≤0.02·mult), 50% speed ≤50·mult — [main.js:1761-1796](../../../main.js#L1761).
- Rarity roll `getRandomRarity()` is written `RARITIES.reduce((sum, r => sum + r.weight), 0)` and throws `ReferenceError: sum is not defined` on every call — [main.js:1716-1724](../../../main.js#L1716); executed: HARNESS T0a-c, T9.

**Equipment slots & stat aggregation**
- Equip logic: type must match slot; rings/earrings fill Ring1→Ring2 / Ear1→Ear2 then replace slot 1; no level or skill check — [main.js:550-587](../../../main.js#L550) (HARNESS T4d).
- Aggregation (`updateUI`): `critChance = min(0.8, 0.05 + Σ)`, `critDmg = 1.5 + Σ`, `dodge = min(0.75, Σ)`, `attackSpeed = max(500, 1500 − Σspeed)`, `atk = floor(Σatk × (1 + 0.1·atkMultiplier) × (1 + 0.05·knight))`, `def = floor(Σdef × (1 + 0.1·defMultiplier))` — [main.js:2045-2067](../../../main.js#L2045).
- Max HP: `floor((100 + def×10) × (1 + 0.1·warlord [+0.5 while a health potion is active]))` — [main.js:835-842](../../../main.js#L835).

**Combat, stages, bosses**
- `spawnEnemy`: `hp = floor(10 × 1.15^(stage−1))`, `atk = floor(1.1^(stage−1))`; boss when `stage % 10 == 0`: HP×5, ATK×2, attack interval 2,000 ms (else `1800 − min(600, stage×5)` ms), `dodgeChance = min(0.2, stage×0.005)` (never read); timers reset and **player HP set to max on every spawn** — [main.js:844-869](../../../main.js#L844) (HARNESS T6b).
- Player attack every `max(500, attackSpeed)` ms, enemy every `max(800, enemy.attackSpeed)` ms, player resolved first within a tick — [main.js:1356-1376](../../../main.js#L1356).
- Player hit: `dmg = max(1, atk[×1.2 accuracy])`, crit `×critDmg`, `× (1 + 0.05·combo) × manualMultiplier`; kill → `stage++`, `maxStage = max`; no gold, loot or XP — [main.js:1120-1162](../../../main.js#L1120) (HARNESS T6a).
- Enemy hit: dodge roll, `dmg = max(0, floor(enemyAtk[×0.85 evasion]) − def[×1.2 defense])`; death → `stage−1` (min 1), `isActive = false`, respawn — [main.js:1164-1186](../../../main.js#L1164).

**Combo / click system**
- Click on the enemy: `combo += 1/(1 + combo/40)`; fires a 0.5× attack — [main.js:1008-1039](../../../main.js#L1008). Thresholds: ≥10 +10% crit chance, ≥20 heal 15% of damage dealt, ≥30 20% chance of an extra 0.5× "echo" on auto-attacks — [main.js:1124-1153](../../../main.js#L1124). Decay begins 1,500 ms after the last click at `0.05 + combo/100` per 50 ms tick; combo resets when combat is toggled — [main.js:1346-1354](../../../main.js#L1346), [main.js:961](../../../main.js#L961), [main.js:1382-1385](../../../main.js#L1382). No cap on combo (HARNESS T10 measured peak 260).

**Food & potions**
- `FOOD_HP`: raw rabbit 5 … raw dragon 400; cooked rabbit 25 … cooked dragon 2,000 — [main.js:124-127](../../../main.js#L124). Auto-eat consumes 1 unit when `playerHp < maxHp/2` — [main.js:1082-1092](../../../main.js#L1082).
- Potion: consumed when `potionTimer ≤ 0` → timer 10, decremented once per player auto-attack (≈15 s per potion); accuracy ×1.2 ATK, defense ×1.2 DEF, evasion enemy dmg ×0.85, health +50% max HP — [main.js:1094-1110](../../../main.js#L1094), [main.js:1121-1127](../../../main.js#L1121), [main.js:1170-1174](../../../main.js#L1170), [main.js:838-840](../../../main.js#L838).

**Prestige, tokens, skill points**
- `tokens = floor( floor(((maxStage−1)/10)^1.5) × (1 + 0.2·bookOfShadows) )` — [main.js:871-875](../../../main.js#L871).
- `prestige()`: records `highestPrestigeStage`, grants 1 SP per 50 stages above the all-time `lastSpStage`, adds tokens, `prestigeCount++`, sets `stage = maxStage = max(1, floor(0.10 × max(highestPrestigeStage, maxStage)))`, **sets gold to 0**, stops combat; inventory, gear, skills and resources are untouched — [main.js:926-955](../../../main.js#L926), [main.js:916-919](../../../main.js#L916) (HARNESS T4f).
- Token shop: atkMultiplier (+10% ATK/level, cost 1×2^lvl), defMultiplier (+10% DEF, 1×2^lvl), miningSpeed "Ring of Gathering" (+10% speed, 2×2^lvl), bookOfShadows (+20% tokens, 5×2.5^lvl) — [main.js:1189-1199](../../../main.js#L1189). Skill points: knight +5% ATK, warlord +10% max HP, rogue +5% gathering/workshop speed — [main.js:1212-1220](../../../main.js#L1212), [main.js:2066](../../../main.js#L2066), [main.js:837](../../../main.js#L837), [main.js:1285](../../../main.js#L1285).

**Gold economy**
- Gold sources: `sellResource` (flat per-category values: bars 12, gems 18, potions 22, cooked 8, raw 4, wood 4, leaf 5, ores 6, else 3) and `sellItem` (item.value) — [main.js:476-487](../../../main.js#L476), [main.js:626-633](../../../main.js#L626), [main.js:1955-1964](../../../main.js#L1955); plus the (gated) daily reward — [main.js:1687-1690](../../../main.js#L1687).
- Gold sinks: Coal Wagon 250 → 100 coal, Iron Shipment 500 → 50 iron, Healing Potion 250 → full HP — [main.js:1222-1237](../../../main.js#L1222), [index.html:383-403](../../../index.html#L383).

**Achievements & daily reward**
- 5 achievements with string `reward` fields; `checkAchievements` only pushes the id and sets a "(!)" marker; `reward` is used solely in the render — [main.js:1631-1680](../../../main.js#L1631) (grep: no other reader of `.reward`).
- Daily reward every 86,400,000 ms: `50 × max(1, maxStage)` gold and `max(1, floor(highestPrestigeStage × 0.5))` tokens, gated on `flags.tutorialStep ≥ 2` — [main.js:1682-1706](../../../main.js#L1682).

**Tutorial / unlocks, offline, save/load, auth, clan**
- `updateTutorialUnlocks` now force-sets every `unlocks.*` to true and hides the banner every tick (developer override) — [main.js:810-827](../../../main.js#L810); the original staged tutorial (stage 3 → mining, mining Lv3 → smithing …) was deleted in commit 664f56b — [git history](../../../.git/logs/HEAD) (`git show 664f56b -- main.js`).
- Offline: `parseOfflineProgress` simulates only the active gathering node (see Q8) — [main.js:754-807](../../../main.js#L754).
- Save: whole `state` to `localStorage['fantasyIdleSaveLocal']` every 10 s — [main.js:665-668](../../../main.js#L665). Load: requires `localStorage['fantasy_jwt']`, merges the local save, expires boosts, then offline/spawn/render — [main.js:670-729](../../../main.js#L670).
- Auth: `handleAuth` writes a fake token `"mock." + base64({username}) + ".mock"` and reloads; password never read; no network call in the client (grep: zero `fetch`), the cloud calls were removed in commit 57b65fc — [main.js:2217-2231](../../../main.js#L2217), [git history](../../../.git/logs/HEAD). The Express API (`/api/register|login|save|load`, bcrypt + JWT, Postgres `users.game_state TEXT`) exists but is unreferenced — [api/index.js:25-92](../../../api/index.js#L25), [api/database.js:5-12](../../../api/database.js#L5), [vercel.json](../../../vercel.json).
- Clan: static markup only ("Placeholder System", fake players/clans/chat) — [index.html:135-151](../../../index.html#L135), [index.html:323-356](../../../index.html#L323); `unlocks.clan` is forced true but nothing reads it — [main.js:812](../../../main.js#L812).

**Dependency graph actually present in code (A → B means A's output is consumed by B)**
- mining → ores (copper, iron, coal, silver_ore, gold_ore, mithril, adamant, runite) → smelting → bars → smithing (5 bars) → armour/weapon; mining → gems → crafting (1 silver/gold bar + 1 gem) → jewelry — [main.js:132-140](../../../main.js#L132), [main.js:1835](../../../main.js#L1835), [main.js:1854](../../../main.js#L1854).
- gear → `stats.atk/def` → combat → `maxStage` → prestige tokens & SP → token shop / SP → `stats`, gathering speed, token yield — [main.js:2066-2067](../../../main.js#L2066), [main.js:871-875](../../../main.js#L871).
- hunting → raw meat → cooking → cooked meat → auto-eat; raw fox → evasion potion; cooked rabbit → health potion; woodcutting → oak_wood → defense potion (the only wood consumer); alchemy forage → herbs (+ copper ore) → potions → combat buffs — [main.js:189-208](../../../main.js#L189).
- everything sellable → gold → coal / iron / heal — [main.js:1222-1237](../../../main.js#L1222). Gold → "Capitalist" achievement only — [main.js:1636](../../../main.js#L1636).

### Inferences
- Because combat and gathering share one `state.action`, the "idle" part of the game is strictly either/or: a player cannot farm ore while fighting, and the offline engine only ever credits the gathering half (Q8).
- With the gear step broken (Q7 #1), the live dependency graph collapses to: gathering → sell → gold → (coal/iron/heal), and naked combat → maxStage ≤ 10-30 → 0-4 tokens → nothing useful to buy (ATK/DEF multipliers of 0 stay 0).

### Gaps
- No design document, changelog or comments explain intended values (e.g. why silver/gold bars have power 2 or why rarity is applied twice); everything above is read from code.

---

## Q2. XP curve and time-to-level

### Takeaway
`nextXp = floor(nextXp × 1.5)` from 100 is a 50%-per-level geometric curve; reaching level 20 takes ~25 hours of continuous best-node play, level 30 ~46 days, level 40 ~6 years, level 50 ~322 years, and the level-75/85/90 unlocks (Runite, Magic Tree, Diamond, Dragon, Roast Dragon) are 10^6-10^9 years away — none of them is reachable in a human lifetime, and stacking every speed bonus in the game (×2.465) does not change that conclusion.

### Cited Findings
- Curve source: [main.js:646-661](../../../main.js#L646); all values below computed by [SIM §1a-1b](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs) using the same `Math.floor(x*1.5)` double arithmetic as the game.

XP required (cumulative XP to *reach* level L = Σ nextXp of levels 1..L−1):

| Level L | XP for L→L+1 (nextXp) | Total XP to reach L |
| --- | --- | --- |
| 5 | 505 | 812 |
| 10 | 3,829 | 7,464 |
| 20 | 220,753 | 441,320 |
| 25 | 1,676,337 | 3,352,492 |
| 30 | 12,729,678 | 25,459,178 |
| 40 | 734,057,349 | 1,468,114,526 (1.47e9) |
| 50 | 42,329,445,661 | 84,658,891,157 (8.47e10) |
| 60 | 2.44e12 | 4.88e12 |
| 75 | 1.07e15 | 2.14e15 |
| 85 | 6.16e16 | 1.23e17 |
| 90 | 4.68e17 | 9.36e17 |
| 99 | 1.80e19 | 3.60e19 |

- Best XP/s per node (pure `xp/baseTime`): mining tops out at diamond 13.33 XP/s (48,000 XP/h); below Lv85 the best is ruby 9.72 XP/s (Lv60), emerald 8.33 (Lv35), sapphire 6.67 (Lv25), topaz 5.0 (Lv10), iron 3.75 (Lv5), amethyst 3.33 (Lv1). Woodcutting max 14.29 (magic, Lv75); hunting 18.75 (dragon, Lv90); cooking 41.67 (dragon, Lv90); alchemy best below 60 is brew_def 8.0 XP/s — [SIM §1b-iv](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs), data [main.js:147-208](../../../main.js#L147).

Hours of continuous play to reach each level, best available node at every level, no speed bonuses (cooking/alchemy "pure" = node time only; "+inputs" adds the time to gather the consumed raw meat/herbs/copper/oak):

| Level | mining | woodcutting | hunting | cooking (pure / +inputs) | alchemy (pure / +inputs) |
| --- | --- | --- | --- | --- | --- |
| 5 | 4.1 min | 4.1 min | 2.8 min | 1.7 / 3.8 min | 2.7 / 3.6 min |
| 10 | 33.6 min | 37.4 min | 24.9 min | 15.6 / 34.3 min | 21.7 / 32 min |
| 20 | 24.7 h | 24.7 h | 16.5 h | 10.3 / 22.7 h | 21 / 25.4 h |
| 30 | 46.1 days | 41.9 days | 33.6 days | 20.3 / 45.5 days | 37.1 / 56.6 days |
| 40 | 5.8 years | 6.2 years | 5.2 years | 3.1 / 7 years | 5.8 / 7.2 years |
| 50 | 322 years | 280 years | 242 years | 161 / 355 years | 269 / 374 years |
| 60 | 18,564 years | 15,482 years | 13,924 years | 9,282 / 20,421 years | 15,471 / 20,748 years |
| 75 | 6.97e6 years | 5.42e6 years | 5.08e6 years | 3.39e6 / 7.45e6 years | 6.05e6 / 7.96e6 years |
| 85 | 4.02e8 years | 2.74e8 years | 2.21e8 years | 1.38e8 / 3.15e8 years | 3.49e8 / 4.59e8 years |
| 90 | 2.33e9 years | 2.08e9 years | 1.67e9 years | 1.04e9 / 2.38e9 years | 2.65e9 / 3.48e9 years |
| 99 | 8.56e10 years | 7.98e10 years | 6.09e10 years | 2.77e10 / 6.46e10 years | 1.02e11 / 1.34e11 years |

- Named unlocks: Diamond Block (mining 85) 4.0e8 years; Runite Spire (mining 75) 7.0e6 years; Adamantite (mining 50) 322 years; Mithril (mining 30) 46.1 days; Silver (mining 20) 24.7 h; Magic Tree (woodcutting 75) 5.4e6 years; Hunt Dragon (hunting 90) 1.7e9 years; Roast Dragon (cooking 90) 1.0e9 years pure; Health Potion (alchemy 60) 15,471 years; achievement "The Excavator" (mining 25) 7.8 days — [SIM §1b-vi](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- With every speed bonus stacked (Ring of Gathering Lv5 +50%, Rogue ×4 +20%, minigame streak +45% → ×2.465 speed): mining 30 in 18.7 days, 50 in 131 years, 75 in 2.8e6 years, 85 in 1.6e8 years — [SIM §1b-vii](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- `nextXp` exceeds 2^53 at level 81, so `skills.xp` (a double) would stop accumulating small XP amounts exactly around level 98; irrelevant given the times above — [SIM §7](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).

### Inferences
- The practically reachable content is: mining ≤ ~25 (iron, coal, topaz, silver, sapphire), woodcutting ≤ ~25, hunting ≤ ~25 (boar), cooking ≤ ~25, alchemy ≤ ~20 (defense potion). Everything from mithril (Lv30, 46 days) upward is effectively locked; 8 of 14 mining nodes, 3 of 6 trees, 4 of 7 prey, 4 of 7 recipes and 4 of 8 alchemy nodes are unreachable content.
- Because node XP grows roughly linearly with tier while requirements grow ×1.5 per level, the best-node XP/s only rises from 3.3 to 13.3 (×4) over 85 levels against a ×10^15 XP requirement; no re-tuning of node XP can rescue a 1.5× curve — the exponent itself must change.

### Gaps
- No telemetry exists to say how far real players got; the only data point is the developer's committed test save (mining level 4, see Q7 #1).

---

## Q3. Combat scaling, gear stat ceilings, and wall stages

### Takeaway
Enemy HP grows 15%/stage and ATK 10%/stage with a ×5 HP / ×2 ATK boss every 10 stages; player stats are static within a run, so every idle wall in the simulation lands on a boss stage: a naked player dies at Boss 10 (verified in the real loop), full common iron gear at Boss 40, common mithril/gold at Boss 50, common adamant at Boss 60, common runite at Boss 70, and legendary sets (which are 64× commons, not 8×, because rarity is applied twice) reach 70-100 before the 10-minute kill-time limit. Token ATK/DEF levels move a common-gear wall by at most one boss bracket (40→50) before their doubling cost outruns the effect.

### Cited Findings
- Enemy formulas — [main.js:846-862](../../../main.js#L846); tables from [SIM §2a](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs):

| Stage | boss | HP | ATK | attack interval |
| --- | --- | --- | --- | --- |
| 1 | | 10 | 1 | 1,795 ms |
| 10 | yes | 175 | 4 | 2,000 ms |
| 25 | | 286 | 9 | 1,675 ms |
| 50 | yes | 47,115 | 212 | 2,000 ms |
| 75 | | 310,198 | 1,156 | 1,425 ms |
| 100 | yes | 51,057,105 | 25,054 | 2,000 ms |
| 150 | yes | 5.53e10 | 2,941,304 | 2,000 ms |
| 200 | yes | 6.00e13 | 345,282,320 | 2,000 ms |

- Non-boss attack interval bottoms out at 1,200 ms (stage ≥120); the loop's 800 ms floor never binds — [main.js:861](../../../main.js#L861), [main.js:1360](../../../main.js#L1360).

Player stat ceilings for a full 12-slot set (7 smithed pieces of the bar + 5 jewelry made of silver/gold bar (power 2, the only UI options) + the best gem reachable at that bar's mining level). "typ" = variance 1.0, "best" = variance → 1.1; formulas [main.js:1726-1796](../../../main.js#L1726), [main.js:2045-2067](../../../main.js#L2045), [main.js:836](../../../main.js#L836); table [SIM §2b](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs):

| Bar (mining lvl) | jewelry gem | rarity | ATK typ | DEF typ | HP typ | ATK best | DEF best | HP best |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Copper (1) | amethyst | common | 28 | 35 | 450 | 28 | 35 | 450 |
| Copper (1) | amethyst | legendary | 1,664 | 2,048 | 20,580 | 1,824 | 2,264 | 22,740 |
| Iron (5) | amethyst | common | 35 | 57 | 670 | 36 | 59 | 690 |
| Iron (5) | amethyst | legendary | 2,112 | 3,456 | 34,660 | 2,320 | 3,808 | 38,180 |
| Silver (20) | topaz | common | 37 | 50 | 600 | 41 | 55 | 650 |
| Silver (20) | topaz | legendary | 2,368 | 3,200 | 32,100 | 2,608 | 3,528 | 35,380 |
| Mithril (30) | sapphire | common | 88 | 144 | 1,540 | 96 | 158 | 1,680 |
| Mithril (30) | sapphire | legendary | 5,632 | 9,216 | 92,260 | 6,192 | 10,144 | 101,540 |
| Gold (40) | emerald | common | 136 | 143 | 1,530 | 149 | 154 | 1,640 |
| Gold (40) | emerald | legendary | 8,608 | 9,024 | 90,340 | 9,472 | 9,920 | 99,300 |
| Adamant (50) | emerald | common | 199 | 341 | 3,510 | 218 | 373 | 3,830 |
| Adamant (50) | emerald | legendary | 12,640 | 21,696 | 217,060 | 13,904 | 23,856 | 238,660 |
| Runite (75) | ruby | common | 454 | 811 | 8,210 | 498 | 889 | 8,990 |
| Runite (75) | ruby | legendary | 28,960 | 51,776 | 517,860 | 31,856 | 56,944 | 569,540 |

- Per-slot examples (typical variance): iron common Weapon 9/0, Shield 0/9, Head 0/5, Body 0/8, Legs 0/6, Boots 0/3, Gloves 2/3; iron legendary Weapon 576/0; runite common Weapon 150/0; runite legendary Weapon 9,600/0; gold+diamond common Ring 123/123, legendary Ring 7,872/7,872 — [SIM §2b-iii](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs); the 576 and 7,872 values were reproduced by executing the real generator on a locally patched copy (HARNESS T4b, T4c).
- Effective rarity multipliers on stats (mult applied at [main.js:1730](../../../main.js#L1730) and again at [main.js:1752-1753](../../../main.js#L1752)): common ×1, uncommon ×2.25, rare ×6.25, epic ×16, legendary ×64; roll odds 62.1% / 24.8% / 9.3% / 3.1% / 0.62% (expected 161 crafts per legendary) — [SIM §2b-ii](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).

Wall stage = first stage where the player dies before the kill, or the kill takes > 10 min. Deterministic (no crit/dodge), 1,500 ms player attacks, enemy interval from the formula, 50 ms tick order as in the loop (player first), HP refilled every spawn; the analytic resolver was cross-checked against a tick-by-tick simulation (SIM, 5 cases all match) and against the real `main.js` loop (HARNESS T7: naked → maxStage 10; T8: common iron set → Boss 40). Token levels (atk, def) via [main.js:2066-2067](../../../main.js#L2066); table [SIM §2c](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs):

| Set (best variance) | ATK/DEF/HP | wall @ tokens 0/0 | @ 3/3 | @ 5/5 | @ 10/10 | why (at 0/0) |
| --- | --- | --- | --- | --- | --- | --- |
| Naked (ATK 0 → 1 dmg/hit) | 0/0/100 | **10** | n/a | n/a | n/a | Boss 10 ATK 4 kills 100 HP in 50 s; player needs 262 s |
| Copper common | 28/35/450 | 40 | 40 | 40 | 40 | Boss 40 ATK 82−35 = 47/hit, dead in 20 s vs 624 s to kill |
| Iron common | 36/59/690 | 40 | 40 | 49 | 50 | Boss 40: 23/hit, dead 60 s vs 486 s |
| Silver common | 41/55/650 | 40 | 40 | 49 | 50 | Boss 40: 27/hit, dead 50 s vs 428 s |
| Mithril common | 96/158/1,680 | 50 | 58 | 59 | 60 | Boss 50: 54/hit, dead 64 s vs 737 s |
| Gold common | 149/154/1,640 | 50 | 50 | 59 | 60 | Boss 50: 58/hit, dead 58 s vs 476 s |
| Adamant common | 218/373/3,830 | 60 | 60 | 60 | 60 | Boss 60: 179/hit, dead 44 s vs 1,313 s |
| Runite common | 498/889/8,990 | 70 | 70 | 70 | 70 | Boss 70: 545/hit, dead 34 s vs 2,324 s |
| Copper legendary | 1,824/2,264/22,740 | 70 | 80 | 80 | 80 | stage 70 kill time 10.6 min |
| Iron legendary | 2,320/3,808/38,180 | 80 | 80 | 80 | 80 | Boss 80 kill 33.6 min |
| Silver legendary | 2,608/3,528/35,380 | 80 | 80 | 80 | 80 | Boss 80 ATK 3,724−3,528 = 196/hit, dead 362 s vs 1,796 s |
| Mithril legendary | 6,192/10,144/101,540 | 80 | 90 | 90 | 90 | Boss 80 kill 12.6 min |
| Gold legendary | 9,472/9,920/99,300 | 90 | 90 | 90 | 90 | Boss 90 kill 33.3 min |
| Adamant legendary | 13,904/23,856/238,660 | 90 | 90 | 90 | 90 | Boss 90 kill 22.7 min |
| Runite legendary | 31,856/56,944/569,540 | 100 | 100 | 100 | 100 | Boss 100 kill 40.1 min |

- With diamond jewelry (mining 85) instead: every common set walls at 69-70, every legendary set at 100 (Boss 100 needs 25-32 min to kill) — [SIM §2c-ii](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Token sensitivity for common iron: ATK-only levels 1-20 never move the wall (stays 40); DEF-only reaches 49 at level 5 (31 tokens) and 50 at level 8 (255 tokens) and stays 50 through level 20 (1,048,575 tokens) — [SIM §2c-iv](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Boss 50 requirement: kill within 10 min needs ≥118 ATK; surviving 10 min needs DEF ≥ 205 (`300·(212−d) ≤ 100+10d`) — [SIM §2c-iii](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Clicking: combo after n clicks ≈ `40·(√(1+n/20) − 1)` (41 clicks → 30, 200 → 93); at 5 clicks/s and combo 30 click DPS is 6.25·ATK/s vs idle 0.667·ATK/s — [SIM §2d](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs). Measured in the real loop, a naked clicker reaches maxStage 20 at 5 clicks/s (peak combo 161, 1.6 min of combat) and maxStage 30 at 10 clicks/s (peak combo 260) (HARNESS T10).

### Inferences
- Bosses are the walls because the ×2 boss ATK equals ln2/ln1.1 = 7.3 regular stages of ATK growth in one step, while DEF is a flat subtraction: a set that is immune to stage 39 (ATK 37 < DEF 59) takes 23/hit from Boss 40 (ATK 82).
- +10% DEF ≈ +1 stage of immunity and +10% ATK ≈ +0.68 stages of HP headroom (ln1.1/ln1.15); with costs doubling per level, the token shop cannot cross a boss bracket that needs ×2-3 DEF (e.g. Boss 50 for iron needs DEF ≈205 = level 24 ≈ 16.7M tokens).
- The double rarity multiplier makes rarity dominate material: a legendary copper set (1,824 ATK) out-stats a common runite set (498) by 3.7×; the intended ×8 would have made them roughly equal (copper ×8 = 224 vs runite 498).
- HP refilling on every spawn means food matters only within a single fight and the gold-shop "Healing Potion" is redundant.
- Expected time for a full 12-slot legendary set if the generator worked: 1,932 expected crafts (7×161 + 5×161), 6,440 bars + 805 gems; ≈20.5 h of gathering for iron/amethyst, 34 h mithril, 88 h runite (gathering time only; runite's Lv75 requirement is unreachable per Q2) — [SIM §5](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).

### Gaps
- Crit (5% base, ×1.5) and item secondary stats (crit/dodge/speed) were excluded from the wall model; they add ≈2.5% expected DPS at base and up to +100 ms attack speed per weapon, which could shift a kill-time wall by ~1 stage but not a survival wall.

---

## Q4. Prestige economics

### Takeaway
Tokens scale with maxStage^1.5 (0 below stage 11, 10 at 50, 31 at 100, 88 at 200) while every upgrade level doubles in cost and buys ≤1 stage; a fixed-gear player plateaus within 3-6 prestiges (iron: 40→49→50 and stuck; mithril: 50→58→60 and stuck; legendary iron: 80 forever). The loop is not self-reinforcing: token income is sub-exponential in stage and the wall is gear-bound, so tokens accumulate unspent.

### Cited Findings
- Formula [main.js:871-875](../../../main.js#L871); SP [main.js:938-943](../../../main.js#L938); start stage [main.js:916-919](../../../main.js#L916); costs [main.js:1196-1199](../../../main.js#L1196). Tables from [SIM §3a-3e](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).

| maxStage | tokens (BoS 0) | BoS 1 | BoS 3 | BoS 5 | cumulative SP | next-run start stage |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 0 | 0 | 0 | 0 | 0 | 1 |
| 11 | 1 | 1 | 1 | 2 | 0 | 1 |
| 20 | 2 | 2 | 3 | 4 | 0 | 2 |
| 30 | 4 | 4 | 6 | 8 | 0 | 3 |
| 40 | 7 | 8 | 11 | 14 | 0 | 4 |
| 50 | 10 | 12 | 16 | 20 | 1 | 5 |
| 60 | 14 | 16 | 22 | 28 | 1 | 6 |
| 70 | 18 | 21 | 28 | 36 | 1 | 7 |
| 80 | 22 | 26 | 35 | 44 | 1 | 8 |
| 90 | 26 | 31 | 41 | 52 | 1 | 9 |
| 100 | 31 | 37 | 49 | 62 | 2 | 10 |
| 120 | 41 | 49 | 65 | 82 | 2 | 12 |
| 150 | 57 | 68 | 91 | 114 | 3 | 15 |
| 200 | 88 | 105 | 140 | 176 | 4 | 20 |

- Upgrade cost per level / cumulative to own level n: atk & def `2^n` / `2^n − 1` (lv5 = 31, lv8 = 255, lv10 = 1,023, lv15 = 32,767); gathering `2·2^n` / `2(2^n−1)` (lv5 = 62, lv10 = 2,046); Book of Shadows `floor(5·2.5^n)` / cumulative 5, 17, 48, 126, 321 (lv5), 809, 2,029, 5,080, 12,709, 31,782 (lv10) — [SIM §3b](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Prestiges to afford atk level 5 (+50% ATK, 31 tokens) / level 10 (+100%, 1,023 tokens) at a constant maxStage: 20 → 16 / 512; 30 → 8 / 256; 46 → 4 / 114; 50 → 4 / 103; 100 → 1 / 33; 200 → 1 / 12 — [SIM §3c](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Greedy loop simulation (fixed gear, push to the wall, buy the cheaper of atk/def whenever affordable) — [SIM §3d](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs):
  - Common iron: prestige 1 → maxStage 40 (7 tokens); 2-5 → 40; 6 → 49 (10 tokens); 16 → 50; 17-25 → 50 with 45 tokens unspent at atk 7 / def 6 (next def level costs 64, then 128 …). Δstage after prestige 16 is 0.
  - Common mithril: 50, 50, 58, 59 ×8, 60 from prestige 12 onward; 79 unspent at prestige 25 (atk 7 / def 7). Allowing BoS in the greedy buy raises income to 25 tokens/run but the wall is still 60.
  - Legendary iron: 80 on every one of 25 prestiges (22 tokens each; kill-time wall at Boss 80 needs ×3.4 ATK ≈ atk level 24 ≈ 16.7M tokens).
- Marginal values: +10% ATK ≈ 0.68 stages of HP headroom; +10% DEF ≈ 1.0 stage vs regular enemies but bosses add a 7.3-stage ATK jump; `d(tokens)/d(stage)` ≈ 0.26 at stage 30, 0.33 at 50, 0.47 at 100, 0.67 at 200 tokens per extra stage — [SIM §3e](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- The daily reward, when its gate passes (legacy saves only, Q7 #5), pays `max(1, floor(highestPrestigeStage × 0.5))` tokens per day — 23/day at highestPrestigeStage 46 versus 9 tokens for a full prestige at 46 — [main.js:1688](../../../main.js#L1688), [SIM §4c](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Prestige also resets gold to 0 and restarts at 10% of the best stage (e.g. 40 → 4, 100 → 10) — [main.js:947-951](../../../main.js#L947) (HARNESS T4f: maxStage 60 → 14 tokens, 1 SP, gold 0, stage 6).

### Inferences
- Show the math for "plateau": at iron/stage 50, income is 10 tokens/prestige; the next useful purchase (def level 7 → 8 → … to ≈24 for Boss 50) costs 128, 256, … 2^24 tokens, i.e. 13, 26, … 1.7 million prestiges, while each level yields 0 stages until the bracket is crossed. Since a prestige takes the player back to stage 5 and ~15-30 min of re-climbing, the loop's return per hour goes to zero after the 6th prestige.
- The loop would be self-reinforcing only if stage gains per level were ≥ the stage-equivalent of doubling cost, i.e. if tokens grew ≥ ×2 per ~1 stage; the formula gives ×2 per ~+59% stage (stage^1.5), so the economy is structurally convergent at every scale.
- Skill points are effectively 1-4 per account lifetime (1 per 50 all-time stages; 4 at stage 200), so knight/warlord/rogue are cosmetic at real progression levels (+5% ATK / +10% HP / +5% speed each).

### Gaps
- Real prestige cadence (time to re-climb 5→50 with a given set) was not simulated; it depends on crit/click behaviour and would only shorten the "no further progress" verdict, not change it.

---

## Q5. Economy — where gold comes from and where it goes

### Takeaway
Gold enters only through selling (flat per-category prices, 3-22 gold) and leaves only through three shop buttons worth 1,000 gold in total; amethyst mining at level 1 is the best gold activity in the game (21,600 gold/h) because higher-tier resources sell for the same flat price but take longer, combat produces nothing, and the Coal Wagon can be resold at a 140% profit for unlimited gold.

### Cited Findings
- Sell prices [main.js:476-487](../../../main.js#L476); `sellResource` [main.js:626-633](../../../main.js#L626) (UI exposes only "Sell 1" and "Sell 10" — [main.js:2201-2202](../../../main.js#L2201)); `sellItem` [main.js:1955-1964](../../../main.js#L1955); sinks [main.js:1222-1237](../../../main.js#L1222).
- Combat produces no gold or loot: `executePlayerAttack` only mutates enemy HP, player HP (lifesteal), `stage`/`maxStage` and respawns; `spawnEnemy` builds the enemy object only — [main.js:1120-1162](../../../main.js#L1120), [main.js:844-869](../../../main.js#L844); executed: after a kill gold = 0 and inventory empty (HARNESS T6a).
- Gold/hour from selling raw output, no speed bonuses — [SIM §4a](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs):

| Activity (level) | gold each | actions/h | gold/h |
| --- | --- | --- | --- |
| Mining amethyst (1) | 18 | 1,200 | 21,600 |
| Mining topaz (10) | 18 | 720 | 12,960 |
| Mining copper (1) | 6 | 1,800 | 10,800 |
| Cooking rabbit (1) — cooked 8 each, but each needs a 3 s hunt | 8 | 1,440 (pure) | 11,520 pure / 5,236 incl. hunting |
| Mining sapphire (25) | 18 | 400 | 7,200 |
| Alchemy accuracy potion (2) incl. 4 s guam + 2 s copper | 22 | 300 | 6,600 |
| Mining iron or coal (5) | 6 | 900 | 5,400 |
| Woodcutting normal (1) / hunting rabbit (1) | 4 | 1,200 | 4,800 |
| Mining silver ore (20) / emerald (35) | 6 / 18 | 600 / 200 | 3,600 |

- Item values: common item = `round(power × 15)` (copper 15, iron 45, mithril 120, adamant 300, runite 750), legendary ×8 (iron 360, runite 6,000); jewelry `pwr × 25` (gold+diamond common 2,050, legendary 16,400) — [main.js:1736](../../../main.js#L1736), [main.js:1772](../../../main.js#L1772). Smithing commons for sale yields 2,250 gold/h (copper) to 11,066 gold/h (runite) including material time; for copper/silver/gold/iron selling the bars directly is better (10,800 / 5,400 / 3,600 / 4,320 gold/h) — [SIM §4b](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Coal Wagon: 250 gold → 100 coal → resells at 6 each = 600 gold, net +350 per cycle (11 clicks); Iron Shipment: 500 → 50 iron → 300, net −200; Healing Potion: 250 for full HP that every spawn already grants — [main.js:1226-1231](../../../main.js#L1226), [main.js:485](../../../main.js#L485), [main.js:867](../../../main.js#L867); executed (HARNESS T4a: 250 → 600).
- "Capitalist" (100,000 gold) via the wagon loop: 286 cycles ≈ 3,146 clicks; via amethyst mining: 4.6 h — [SIM §4c](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs).
- Gold is wiped on prestige — [main.js:951](../../../main.js#L951).

### Inferences
- Total meaningful gold demand per run is ≤ 750 gold (one iron shipment + one wagon), so gold has no role in progression; the flat price table inverts the tier ladder (a 60 s diamond sells for the same 18 gold as a 3 s amethyst).
- Because prestige zeroes gold but not resources, the rational move is to never hold gold — sell only when about to spend.

### Gaps
- None: the entire gold graph is enumerable from three functions.

---

## Q6. Cross-system dependencies: code vs UI implication, and dead-end resources

### Takeaway
The only real consumer chains are ore→bar→gear, bar+gem→jewelry, raw meat→cooked meat→auto-eat, and herb+(copper | oak | raw fox | cooked rabbit)→potion; five of six woods, silver/gold bars as armour, and the smithing/crafting skill levels are dead ends, and several UI labels promise interactions that do not exist.

### Cited Findings
- Cooking consumes exactly 1 raw meat per cook, 1:1 by tier — [main.js:189-195](../../../main.js#L189). Alchemy: accuracy ← guam + copper ore; defense ← marrentill + oak_wood; evasion ← tarromin + raw_fox; health ← harralander + cooked_rabbit — [main.js:202-208](../../../main.js#L202). Smithing 5 bars — [main.js:1824-1835](../../../main.js#L1824). Crafting 1 bar + 1 gem — [main.js:1841-1854](../../../main.js#L1841).
- Wood: `oak_wood` is the only wood referenced by any recipe; normal, willow, maple, yew and magic wood appear only in `state.resources` and the sell table (4 gold) — grep of `_wood` in main.js: [main.js:12](../../../main.js#L12), [main.js:166-171](../../../main.js#L166), [main.js:204](../../../main.js#L204), [main.js:483](../../../main.js#L483).
- Silver and gold bars have power 2 (below iron's 3) — [main.js:94-95](../../../main.js#L94); the smithing dropdown lists all seven bars — [main.js:1888-1891](../../../main.js#L1888) — so silver/gold armour is strictly worse than iron; their only non-dominated use is as the jewelry bar (the crafting dropdown offers nothing else) — [index.html:298-301](../../../index.html#L298). In jewelry the bar contributes 2 of `(2 + gem)` power, so gem choice is 33-98% of the item — [main.js:1766](../../../main.js#L1766).
- Coal is consumed only by smelting (1/2/3/4 per iron/mithril/adamant/runite bar) — [main.js:134-139](../../../main.js#L134). Gems are consumed only by crafting. Potions are consumed only in combat — [main.js:1096-1099](../../../main.js#L1096). Meat is consumed only by auto-eat (+ raw fox / cooked rabbit in two brews).
- Smithing and crafting XP are granted ([main.js:1314-1322](../../../main.js#L1314)) but no element displays them (no `smithing-level-display` / `crafting-level-display` in index.html; grep) and no recipe checks them (grep for `levelReq` / `.level <` shows only gathering nodes at [main.js:638](../../../main.js#L638)).
- "Ring of Gathering: +10% Gathering Speed" (`miningSpeed`) and Rogue apply to gathering *and* workshop actions and to offline gathering — [main.js:1285](../../../main.js#L1285), [main.js:767](../../../main.js#L767).
- UI-only implications: "Cooking (Requires Raw Meat)" is true — [index.html:241](../../../index.html#L241); "Alchemy (Brew Potions)" hides the ore/wood/meat inputs; the combat tab's "Auto-Eat Food" header select lists shrimp/trout/salmon/lobster/shark that exist nowhere in `state.resources` or `FOOD_HP` — [index.html:73-77](../../../index.html#L73), [main.js:124-127](../../../main.js#L124) (HARNESS T4e: selecting one never eats).

### Inferences
- Dead-end resources (only sellable): normal/willow/maple/yew/magic wood, silver/gold ore beyond jewelry needs, every gem above the tier you can mine at Lv≤25 (emerald+ unreachable anyway), and all potions/food in the shipped build (no gear → combat is capped at naked stages where a 25-HP cooked rabbit is the only relevant heal).
- Woodcutting as a skill exists for one potion ingredient; 5 of its 6 nodes have no purpose beyond XP for its own level.

### Gaps
- Whether silver/gold bars were *intended* for jewelry only cannot be determined from code or history.

---

## Q7. Bugs, dead code, placeholders, and UI/behaviour mismatches (with line numbers)

### Takeaway
Two defects break the core loop outright — equipment generation throws on every call (since the first commit) and a logout or missing token silently overwrites the save after 10 s — and a further ~30 items range from a wrong localStorage key to placeholder clan UI and achievement rewards that are never applied.

### Cited Findings
Severity tags: **[S1]** breaks core progression or destroys data; **[S2]** wrong behaviour; **[S3]** dead code / cosmetic mismatch.

1. **[S1] No equipment can ever be created.** `getRandomRarity()` is `RARITIES.reduce((sum, r => sum + r.weight), 0)`; the first argument is a comma expression that evaluates the undeclared identifier `sum` → `ReferenceError` before `reduce` runs — [main.js:1717](../../../main.js#L1717). No `sum` is defined anywhere in the client (grep). Both generators call it — [main.js:1728](../../../main.js#L1728), [main.js:1764](../../../main.js#L1764). Present unchanged since the first commit e508fcd (`git log -S`). In the loop the 5 bars are consumed at [main.js:1305-1309](../../../main.js#L1305) *before* the throw at [main.js:1316](../../../main.js#L1316), so each 4 s cycle burns materials, aborts the tick (skipping combat/autosave for that tick), grants no XP and no item; the action stays active and repeats. Executed: HARNESS T0a-c, T9 (10 iron bars → 5 → 0, 0 items, 0 XP). Corroboration: the developer's own save committed in [api/fantasy-idle.db](../../../api/fantasy-idle.db) has `"inventory":[]`, `"maxStage":10`, `"stage":9` — exactly the naked wall (Q3).
2. **[S1] Save overwritten after logout / missing token.** `loadGame` returns before merging the local save when `fantasy_jwt` is absent — [main.js:671-676](../../../main.js#L671); the interval registered at [main.js:1272](../../../main.js#L1272) keeps running and `saveGame()` at [main.js:1388-1392](../../../main.js#L1388) writes the pristine default `state` over `fantasyIdleSaveLocal` 10 s later. `logout()` removes the token and reloads — [main.js:749-752](../../../main.js#L749). Executed: HARNESS T1a-c (mining 40 / 12,345 gold → level 1 / 0 gold after one 10 s tick on the login screen).
3. **[S2] `wipeSave` removes the wrong key** (`fantasyIdleSave`) while saves are written/read as `fantasyIdleSaveLocal` — [main.js:744](../../../main.js#L744) vs [main.js:667](../../../main.js#L667), [main.js:690](../../../main.js#L690). "Hard Reset Save" only reloads the page (HARNESS T3).
4. **[S2] `parseOfflineProgress` throws for workshop actions.** `SKILLS_DATA[state.action.type].nodes` with type `smelting|smithing|crafting` → `TypeError: Cannot read properties of undefined (reading 'nodes')` — [main.js:764](../../../main.js#L764); it runs inside `loadGame` after the auth modal is hidden and before `spawnEnemy()`/`updateUI()` — [main.js:723-728](../../../main.js#L723) — so the page loads with unrendered panels and no offline credit, and the `async` function's rejection is unhandled. The loop itself guards with `?.` — [main.js:1282](../../../main.js#L1282). Executed: HARNESS T2a-c.
5. **[S2] Daily reward can never fire for saves created after commit 664f56b.** Gate `state.flags.tutorialStep >= 2` — [main.js:1686](../../../main.js#L1686); `tutorialStep` is only initialised to 0 — [main.js:63](../../../main.js#L63) (grep: no writer); the code that advanced it was removed in 664f56b — [git history](../../../.git/logs/HEAD). Legacy saves with `tutorialStep ≥ 2` (the committed DB dump has `"tutorialStep":2`) do receive it. Executed: HARNESS T5a-b. The modal calls them "Artifact Tokens" — [main.js:1694](../../../main.js#L1694).
6. **[S2] Achievement rewards are text only.** "+10%/+25% Max HP", "+15% Global Mining Speed", "+20% more Prestige Tokens", "+5% Shop Discount" — [main.js:1632-1636](../../../main.js#L1632) — are rendered at [main.js:1672](../../../main.js#L1672) and read nowhere else (grep `reward`); the tab promises "Permanent multipliers granted by your legendary feats" — [index.html:362](../../../index.html#L362).
7. **[S2] Rogue "(+Speed)" is gathering/workshop speed, not attack speed** — button [index.html:182](../../../index.html#L182); uses [main.js:1285](../../../main.js#L1285), [main.js:767](../../../main.js#L767), [main.js:1427](../../../main.js#L1427); `attackSpeed` depends only on item `speedBonus` — [main.js:2064](../../../main.js#L2064). Executed: HARNESS T6c-d (rogue ×4: attackSpeed 1,500 ms unchanged; 36 instead of 30 copper per offline minute).
8. **[S2] Duplicate `id="auto-eat-select"`** — [index.html:71](../../../index.html#L71) and [index.html:92](../../../index.html#L92). JS never calls `getElementById('auto-eat-select')` (grep); both selects write `state.combat.autoEatRule` through `onchange` — [main.js:969-971](../../../main.js#L969). The `<label for>` at [index.html:70](../../../index.html#L70) binds to the first (header) select, whose options `cooked_shrimp|trout|salmon|lobster|shark` do not exist in `state.resources` ([main.js:3-19](../../../main.js#L3)) or `FOOD_HP` ([main.js:124-127](../../../main.js#L124)); choosing one silently never eats (HARNESS T4e). Neither select (nor `active-potion-select`) is synced from the saved value on load, so after a reload the dropdowns show "None" while the saved rule is still active.
9. **[S2] Authentication is a mock.** `handleAuth` ignores `type`, never reads `#auth-pass` (grep: only in index.html:460), stores `mock.<base64>.mock` and reloads — [main.js:2217-2231](../../../main.js#L2217); the modal says "Fantasy Idle Cloud — Authenticating with the central database" — [index.html:455-457](../../../index.html#L455). The client contains no `fetch`/XHR (grep); `/api/*` is never called; the mock token would fail the server's `jwt.verify` (→ 403) if it were — [api/index.js:13-23](../../../api/index.js#L13).
10. **[S2] "Combat Lv" changes meaning after the first prestige.** `getCombatLevel()` returns `highestPrestigeStage` when > 0, else `1 + floor((atk+def)/5)` — [main.js:877-882](../../../main.js#L877), shown at [index.html:80](../../../index.html#L80); after prestiging at stage 40 the label reads "Combat Lv: 40" forever regardless of gear.
11. **[S2] Coal Wagon is an infinite-gold loop** (+350 gold per 250 spent) — [main.js:1226-1228](../../../main.js#L1226), [main.js:485](../../../main.js#L485) (HARNESS T4a).
12. **[S2] Prestige wipes all gold** — [main.js:951](../../../main.js#L951) — while the modal says only "All Current Combat Gold" is lost and "All Non-Combat Skill Levels & Resources" are kept — [index.html:419-423](../../../index.html#L419); there is no combat gold (Q5).
13. **[S2] Gold-shop "Healing Potion — Instantly restores all HP"** is redundant: HP is refilled on every spawn and when re-entering combat at ≤0 HP — [main.js:867](../../../main.js#L867), [main.js:963-965](../../../main.js#L963), [index.html:399-402](../../../index.html#L399).
14. **[S2] Rarity multiplier applied twice** (stats ×64 for legendary, values ×8) — [main.js:1730](../../../main.js#L1730), [main.js:1752-1753](../../../main.js#L1752), [main.js:1766](../../../main.js#L1766), [main.js:1789-1790](../../../main.js#L1789) (HARNESS T4b-c).
15. **[S3] Item "(Lv N)" is cosmetic**: computed at [main.js:1746](../../../main.js#L1746) / [main.js:1783](../../../main.js#L1783), never checked on equip (HARNESS T4d: a Lv 4 legendary sword equips at combat level 1).
16. **[S3] Boss `dodgeChance` is written and never read** — [main.js:862](../../../main.js#L862); the only dodge roll uses the player's stat — [main.js:1167](../../../main.js#L1167).
17. **[S3] Smithing/crafting levels are dead** (granted, never displayed, never gate) — [main.js:1314-1322](../../../main.js#L1314); index.html has no display elements (grep).
18. **[S3] `.locked-tab` has no CSS rule** (grep style.css) and the tutorial banner text "Goal: Defeat 3 Stages in Combat to unlock Mining!" — [index.html:46](../../../index.html#L46) — is hidden every tick — [main.js:815-816](../../../main.js#L815); `unlocks.*` are forced true every 50 ms — [main.js:812-813](../../../main.js#L812).
19. **[S3] Clan placeholders**: sidebar "Clan" tab with fictitious applicants/clans/chat — [index.html:24](../../../index.html#L24), [index.html:323-356](../../../index.html#L323); "Clan Combat — Placeholder System / Clan War Raid … Titan Gate / Ember Drake / Warlord Core" on the combat tab — [index.html:135-151](../../../index.html#L135). No logic anywhere (grep `clan` in main.js: only the unlock key).
20. **[S3] Naming drift**: "Prestige Tokens" ([index.html:427](../../../index.html#L427)), "Tokens" ([index.html:82](../../../index.html#L82)), "Artifact Tokens"/"Artifact Upgrades" ([main.js:1694](../../../main.js#L1694), [index.html:423](../../../index.html#L423)); stat tooltips "Includes Token Multipliers" on HP ([index.html:49](../../../index.html#L49)) though HP uses only the Warlord SP; initial enemy "Goblin" at [main.js:45](../../../main.js#L45) vs stage-1 "Slime (Lv 1)" from the name table [main.js:850-856](../../../main.js#L850) and the HTML placeholder "Monster Lv 1" [index.html:167](../../../index.html#L167).
21. **[S3] README claims "rebuilt with Node.js and PostgreSQL"** — [README.md](../../../README.md) — while persistence is localStorage only.
22. **[S2] Autosave only every 10 s from the loop; nothing on `beforeunload`/`visibilitychange`** (grep) — up to 10 s of progress (including a prestige or a purchase) is lost on tab close — [main.js:1388-1392](../../../main.js#L1388).
23. **[S3] Minigame DOM churn**: `renderMinigamePanels` rebuilds all five panels' `innerHTML` every 250 ms — [main.js:1394-1398](../../../main.js#L1394), [main.js:1515-1628](../../../main.js#L1515) — including the alchemy `<input type="range">` — [main.js:1592](../../../main.js#L1592) — and `setDragValue`/`pumpHeat` call the full `updateUI()` on every input event — [main.js:395-408](../../../main.js#L395).
24. **[S3] Uncaught-exception fragility**: any throw inside the interval callback (bugs #1, #4-adjacent) aborts the remainder of that tick, including autosave and combat — [main.js:1272-1410](../../../main.js#L1272).
25. **[S3] Repository hygiene**: `api/node_modules` is tracked (1,099 files; `.gitignore` lists the stale path `server/node_modules/`) — [.gitignore](../../../.gitignore); `.DS_Store` files are tracked; `api/fantasy-idle.db` is a committed SQLite database containing a real username, a bcrypt password hash and a full game state (left over from before the Postgres migration in 4f0d4fc) — [api/fantasy-idle.db](../../../api/fantasy-idle.db); the API falls back to a hard-coded JWT secret and issues tokens without expiry — [api/index.js:11](../../../api/index.js#L11), [api/index.js:38](../../../api/index.js#L38), [api/index.js:58](../../../api/index.js#L58); `/api/save` stores any JSON body up to 5 MB without validation — [api/index.js:9](../../../api/index.js#L9), [api/index.js:65-80](../../../api/index.js#L65).
26. **[S3] Errors via `alert()`/`confirm()`** — [main.js:1208](../../../main.js#L1208), [main.js:1218](../../../main.js#L1218), [main.js:1233](../../../main.js#L1233), [main.js:1809](../../../main.js#L1809), [main.js:1826](../../../main.js#L1826), [main.js:1844](../../../main.js#L1844), [main.js:743](../../../main.js#L743), [main.js:929](../../../main.js#L929).
27. **[S3] `state.stats` (derived) and `state.combat.enemy` are persisted** and then recomputed/replaced on load — [main.js:667](../../../main.js#L667), [main.js:2045-2067](../../../main.js#L2045), [main.js:727](../../../main.js#L727); `combo`/`lastComboTime` are added to `state.combat` dynamically — [main.js:1011-1015](../../../main.js#L1011).
28. **[S3] Google Fonts is the only external request** — [index.html:8](../../../index.html#L8).

### Inferences
- With #1 unfixed, the reachable game is: gather/sell, naked combat to Boss 10 idle (Boss 20-30 with sustained clicking), 0-4 tokens per prestige, and a token shop whose ATK/DEF multipliers act on 0. The developer's committed save being stuck at stage 9/10 with 1 token (from the legacy daily reward) is consistent with this.
- Bug #2 plus the shared, un-namespaced save key (`fantasyIdleSaveLocal`, no username scoping — [main.js:667](../../../main.js#L667)) means "accounts" are purely cosmetic: every username on a device shares one save, and switching users destroys it.
- Item #23 is inferred from the code path (an `<input type=range>` replaced up to 4×/s and on every `input` event will lose the drag); it was not verified in a browser.

### Gaps
- Browser-only behaviours (drag-and-drop ordering, the slider interruption, background-tab timer throttling → the loop completes at most one action per tick and drains the backlog at 20/s on refocus, [main.js:1302-1303](../../../main.js#L1302)) were reasoned from code, not executed in a browser.

---

## Q8. Offline progress

### Takeaway
Only the currently selected gathering node is simulated (`floor(elapsed / actualTime)` actions, capped by consumable inputs, with token/Rogue speed but no minigame boost); workshop actions crash the loader, combat is never simulated, and there is no cap on elapsed time — 30 days on Copper Vein yields 1,296,000 copper, 6.48 M XP (mining 1 → 26) and 7.8 M gold if sold.

### Cited Findings
- Entry condition `timeDiff ≥ 60,000 ms`; message counts minutes — [main.js:757-759](../../../main.js#L757).
- Gathering only: `actualTime = baseTime / (1 + 0.10·miningSpeed + 0.05·rogue)` (no minigame boost, unlike online [main.js:1285](../../../main.js#L1285)); `maxActions = floor(timeDiff / actualTime)`, reduced to `floor(resource/qty)` for each consumed input, then inputs deducted, output and XP granted in one `grantXp` call — [main.js:762-795](../../../main.js#L762). The saved fractional `progress` is ignored.
- Not simulated: workshop (crashes — Q7 #4), combat (the `isActive` flag persists and combat simply resumes on the next tick against a freshly spawned enemy — [main.js:727](../../../main.js#L727), [main.js:1345](../../../main.js#L1345)), minigame boosts (expired on load — [main.js:714-720](../../../main.js#L714)), potions/food, daily-reward accrual beyond one claim.
- No upper bound on `timeDiff`; the clock is the client's `Date.now()` — [main.js:755-756](../../../main.js#L755). Numbers — [SIM §6](file:///tmp/claude-0/-home-user-idle2/822a3f17-4006-5034-be72-45cc3ca07351/scratchpad/audit-sim.mjs):

| days away | node | actions / resources | XP | mining level from 1 | gold if sold |
| --- | --- | --- | --- | --- | --- |
| 1 | copper | 43,200 | 216,000 | 18 | 259,200 |
| 1 | amethyst | 28,800 | 288,000 | 18 | 518,400 |
| 7 | amethyst | 201,600 | 2,016,000 | 23 | 3,628,800 |
| 30 | copper | 1,296,000 | 6,480,000 | 26 | 7,776,000 |
| 30 | amethyst | 864,000 | 8,640,000 | 27 | 15,552,000 |
| 30 | ruby (Lv60) | 72,000 | 25,200,000 | 29 | 1,296,000 |
| 365 | amethyst | 10,512,000 | 105,120,000 | 33 | 189,216,000 |

- Verified in the real code: 60 s offline on copper with Rogue ×4 credits 36 copper (HARNESS T6d).

### Inferences
- Offline gathering is strictly more efficient than online idling for the same node only in that it needs no tab; it is worse than active play because minigame boosts (+20-49%) don't apply — a small "active premium" of at most ×1.49.
- Advancing the system clock is an unlimited exploit (no server time, no cap); after 30 days away the welcome modal reports a seven-digit resource count and the inventory renders one stack card per resource, so no UI breakage is expected, but the XP jump (levels 1→26 in one `grantXp` loop) skips every intermediate unlock without notification.

### Gaps
- Real-browser timer throttling when the tab is merely backgrounded (not closed) was not measured.

---

## Q9. Save format and what is missing for a server-authoritative design

### Takeaway
The save is the raw `state` object serialised to one localStorage key (~5-10 KB), unversioned, un-namespaced per user, containing derived values and absolute client timestamps; the dormant API would accept and return that blob verbatim, so nothing today validates, simulates or scopes progress on a server.

### Cited Findings
- Write: `localStorage.setItem('fantasyIdleSaveLocal', JSON.stringify(state))` after stamping `flags.lastSaveTime = Date.now()` — [main.js:665-668](../../../main.js#L665). Read/merge: `mergeState` deep-assigns objects and overwrites arrays/primitives; adds missing skills, `unlocks.achievements`, `prestigeCount`, `inventoryOrder` — [main.js:688-721](../../../main.js#L688), [main.js:731-740](../../../main.js#L731).
- Exact shape (keys and types as initialised at [main.js:2-88](../../../main.js#L2), plus dynamically added fields):

```
{
  resources: { gold:int, <51 resource ids>:int },            // ids at main.js:4-18
  inventory: [ { id:int, name:str, type:'Weapon'|'Shield'|'Head'|'Body'|'Legs'|'Boots'|'Gloves'|'Ring'|'Neck'|'Ear',
                 atk:int, def:int, critChance:num, critDmg:num, dodgeChance:num, speedBonus:int,
                 value:int, costType:'smithing'|'crafting', color:str } ],   // main.js:1748-1758, 1785-1795
  equipped: { Head, Body, Legs, Boots, Gloves, Weapon, Shield, Ring1, Ring2, Neck, Ear1, Ear2 : item|null },
  stats: { atk, def, critChance, critDmg, dodgeChance, attackSpeed },   // derived, recomputed by updateUI
  achievements: [ 'slayer1'|'slayer2'|'miner1'|'prestige1'|'rich1' ],
  skills: { mining|woodcutting|hunting|cooking|alchemy|smithing|crafting : { level:int, xp:num, nextXp:num } },
  action: { type:str|null, id:str|null, progress:ms, [baseTime, consumes, produces, xp, barId, gemId] },  // workshop fields main.js:1813-1856
  combat: { isActive:bool, highestPrestigeStage:int, stage:int, maxStage:int, tokens:int, playerHp:num,
            playerAttackTimer:ms, enemyAttackTimer:ms,
            enemy: { name, baseName, hp, maxHp, atk, attackSpeed, dodgeChance },   // derived, replaced by spawnEnemy on load
            autoEatRule:str, activePotion:str, potionTimer:int, skillPoints:int, lastSpStage:int,
            [combo:num, lastComboTime:epoch_ms] },
  unlocks: { mining, shop, smithing, woodcutting, crafting, hunting, cooking, alchemy, achievements, clan : bool },  // all forced true
  flags: { lastSaveTime:epoch_ms, lastDailyClaim:epoch_ms, tutorialStep:int(always 0 for new saves), prestigeCount:int },
  shop: { upgrades: { atkMultiplier, defMultiplier, miningSpeed, bookOfShadows : int },
          skills: { knight, warlord, rogue : int } },
  activePlay: { <5 gathering skills>: { boostUntil:epoch_ms, bonus:num, streak:int, challenge:obj|null } },
  inventoryOrder: [ 'eq:<id>' | 'res:<resourceId>' ],
  idCounter: int
}
```

- User-visible keys: `localStorage['fantasyIdleSaveLocal']` (the save) and `localStorage['fantasy_jwt']` (mock token; only `payload.username` is read for the sidebar) — [main.js:671-683](../../../main.js#L671). Both are plain, editable, and not scoped by username.
- Server side as written: `users(id, username UNIQUE, password_hash, game_state TEXT, last_saved BIGINT)` — [api/database.js:6-12](../../../api/database.js#L6); `/api/save` writes `JSON.stringify(req.body.state)` and `Date.now()`; `/api/load` parses and returns it — [api/index.js:65-92](../../../api/index.js#L65). No schema, no versioning, no anti-cheat, no rate limit, open CORS — [api/index.js:8](../../../api/index.js#L8).

### Inferences
- Missing for a server-authoritative design (each is absent from the code cited above): a `schemaVersion`; server-issued timestamps (offline credit currently trusts `Date.now()` on the client); per-user scoping of the local cache; separation of *authoritative* fields (resources, inventory, skills xp/level, combat.maxStage, tokens, SP, shop levels, flags) from *derived* ones (`stats`, `combat.enemy`, `inventoryOrder`, `activePlay.challenge`, `action.progress`); an append-only action/event log or at least server-side recomputation of offline gains and item rolls (item stats are rolled client-side with `Math.random`, so any item can be forged by editing localStorage); token expiry and a real secret on the API; and validation of the `/api/save` body.
- The mock token format (`mock.<b64>.mock`) is incompatible with the server's `jwt.verify`, so re-enabling the removed `fetch` calls without changing `handleAuth` would produce 403s on every save.

### Gaps
- No migration history exists beyond the three ad-hoc patches in `loadGame` (lines 696-700, 708-712, 721), so the set of save variants in the wild (pre-664f56b saves with `tutorialStep` 1-5, pre-57b65fc cloud saves) is unknown.
