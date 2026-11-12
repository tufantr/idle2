# 047: The measurements left: survival off the ladder, a deep drop's worth, the boot's replay (12 November 2026)

The loop's last measurement items: P-023, P-106 and P-126 (survival deep), P-062 and P-075 (deep drops), P-123 (the boot), with the
game's own API on a scratch copy. Nothing in the repository changed; no live saves.

**In short:** deep, survival decides nothing anywhere the game sends a hero. From stage 1,300, food, defence ×0.1 to ×10 and health
×0.5 to ×2 changed no stage reached in the plain climb or the eight Trials (beyond a gate on one seed), no clear in the Hellforge at
the deepest tier he opens, no Titan he beats and no clan attack (the clan boss has no attack); they change only how often Glass Hero
and Fasting fell him, where food can't help. At 700 food is worth a gate under Brutes and Faithless, and against a Titan at his best
stage it turns a fall in seconds into a full minute and 3 to 26 times the damage, though he wins neither way. P-106's bleed, tried on
the copy at 1–3% a blow, adds falls but no stages deep: lifesteal refills 3% of his health a second. A deep drop is worth what it
adds to damage: a mythic weapon 15–29 stages, jewellery and gloves 2–15, the four kinds without attack (40 of the drop table's 100)
−1.5 to +1.7, where the Equip card says +5 to +23; the sure pieces go to the armour that lags and are worth 0.4–3.7. Only attack
speed is past its cap deep (1.6–3.5 stages if it spilled); half of what a deep drop rolls does nothing in a fight. The boot: a guest
back after a day, with Auto prestige on, sees only the sidebar's title until the replay ends: 1.6 s plain and 6.8–7.4 s at Chrome's
4× throttle for the 1,300 hero, 2.4 s and 10.7–11.0 s for the 2,000 one, in one task that answers nothing. With Auto off the same day
is a fifth of it, and with no time away 0.3–0.8 s; Auto is what makes the replay dear (55 prestiges and 54,000 kills in the day).

## What I ran

- **Heroes:** `tools/simulate.mjs --auto --trials=5 --pacts --charms --ascend=1 --save-at=...` with 039's stall fix, on a copy with
  imports pointed at the worktree's `src/` and no `git` call. Seed 1 saved at 700 (82.5 h), 1,300 (155.6 h) and 2,000 (358.9 h); seed
  2 at 700 (83.4 h) and 1,300 (157.1 h). The 2,000 hero holds 313 Titan kills and two Seals; no talent point before 1,300.
- **Survival** (a scratch script on `src/game.js`, the tools' own loops): fresh runs as `tools/trials.mjs` and `tools/supplies.mjs`
  make them (a prestige, into the Trial if any; the fight until 30 minutes without a new best, or 3 hours; the camp bought as gold
  comes), plain and under each of the eight Trials. Four supplies: bare, food (2,000 of the best dish his Cooking makes, which heals
  34–40% of his health; auto-eat at his line, 25%), potion (500 of the best combat potion his Alchemy brews), both. Three seeds.
  Defence ×0.1 or ×10 and health ×0.5 or ×2 on the stats the fight reads, bare and with both. The Hellforge for 20 minutes at his
  open tier and at the deepest tier his best stage opens (two seeds). His own Titan, one 100 stages below his best, one at his best,
  and the deepest he beats in all three seeds, each condition. The clan attack as the server reckons it (`core/power.js`
  `clanAttackFromSave`). P-106 on the copy: each blow that lands also takes 1% or 3% of his health, which armour can't floor.
- **Drops** (a second scratch script): the hero at his wall as `tools/ledger.mjs` finds him; a frontier piece is the game's own drop
  (`generateDrop`) of his best stage's place (Abyssal, its depth), kind and rarity fixed, as a Lord's due or the bosses' due makes
  it; 300 rolls a cell; its worth in stages at the boss is ln(damage a second with it ÷ without) over ln(a boss's health growth a
  stage, ×1.035), damage a second counting crits and swing time. Beside it what the Equip card says (`gainStages`), and fresh runs as
  `tools/gearbench.mjs` makes them for six kinds at legendary and mythic (one roll, two seeds).
- **The boot:** the worktree's `python3 tools/serve.py` on a free port, in the background; Playwright's Chromium (build 1243,
  headless, 1280×900, a fresh profile each run); the 1,300 hero as a guest save in localStorage, every clock in it moved so it was
  saved 24 hours before, Google Fonts left out. From navigation: first paint, the game drawn (the first frame after its sidebar
  fills) and interactive (the first mouse move after that the page handled within 50 ms; one every 50 ms from the start). Three runs
  plain and three at `Emulation.setCPUThrottlingRate` 4; controls with Auto prestige off and with no time away, and the 2,000 hero,
  two runs or one each; and `Game.resumeFromSave` in Node for the three seed-1 heroes, with and without Auto.
- **Not run:** seed 2 to 2,000 (stopped at hour 40, when the machine's load passed 270); the bleed and the dodge under the other
  Trials; P-126's tribulation on the copy (its arithmetic is below); fresh-run checks for every kind and rarity (six kinds at
  legendary and mythic only); the boot on a phone, signed in (a server save that wins replays twice), or mid-dungeon.

## 1. Survival outside the plain climb

**Every Trial.** Best stage of a fresh run, bare · food · potion · both, three seeds (the range where they differ); seed 2's hero in
brackets (700 and 1,300; four of the rules there). Falls a run, bare, where he fell; "0" means no fall in any condition.

| Rule | Hero at 700 | Falls | At 1,300 | Falls | At 2,000 | Falls |
|---|---|---|---|---|---|---|
| Plain | 660 · 660 · 700–710 · 710 (670 · 670 · 720 · 710–720) | 13–42, fed 0 | 1,260 · 1,260 · 1,310 · 1,310 (the same) | 0 | 1,950 · 1,950 · 2,010 · 2,010 | 0 |
| Brutes | 610–620 · **630** · 660–670 · **680** (630–640 · **640–650** · 680 · 680–690) | 41–101, fed 0 | 1,220 · 1,220 · 1,270–1,280 · same (1,230–1,240 · same · 1,290 · 1,290) | 0 | 1,920–1,930 · same · 1,980 · 1,980 | 0 |
| Thick Hides | 590 · 590 · 630 · 630 | 0 | 1,170 · 1,170 · 1,220–1,230 · same | 0 | 1,860 · 1,860 · 1,920 · 1,920 | 0 |
| Glass Hero | 580 · 580 · 630–640 · same (590–600 · same · 630–640 · same) | 83–166 | 1,160 · 1,160 · 1,220–1,230 · same (1,170–1,190 · same · 1,230–1,245 · same) | 90–272 | 1,867–1,871 · same · 1,927–1,934 · same | 213–311 |
| Rusted Gear | 610 · 610 · 650 · 650 (610 · 610 · 650 · 650–660) | 15–95, fed 0 | 1,190–1,200 · same · 1,250–1,260 · same (1,200 · 1,200 · 1,260 · 1,260) | 0 | 1,880–1,890 · same · 1,940–1,950 · same | 0 |
| Swift Bosses | 610 · 610 · 650 · 650 | 0 | 1,190–1,200 · same · 1,240–1,250 · same | 0 | 1,900–1,910 · same · 1,960 · 1,960 | 0 |
| No Camp | 550 · 550 · 580 · 580 (560 · 560 · 580 · 580) | 7–10, fed 0 | 1,050 · 1,050 · 1,090–1,100 · same (1,050–1,060 · same · 1,100 · 1,100) | 0 | 1,680 · 1,680 · 1,720 · 1,720 | 0 |
| Fasting (no food or potion by its rule) | 640–650 (650–660) | 33–92 | 1,260 (1,260) | 13–20 | 1,950 | 0 |
| Faithless | 370–376 · **380** · 390 · **400** (380 · 380 · 399–400 · 400) | 29–78, fed 0 | 670 · 670 · 720 · 720 (680 · 680 · 720 · 720) | 0 | 1,210 · 1,210 · 1,260–1,270 · same | 0 |

- **Food moved a stage reached in two rules, at 700 only:** Brutes by 10–20 (seed 2: 10) and Faithless by 4–10 (seed 2: 0), the same
  gate 032 found. It moved no Trial rung anywhere: past stage 500 the rungs stand 250 apart (`data/trials.js` `TRIAL_LADDER`), and
  the potion crossed one where food crossed none: Brutes and Rusted Gear at 1,300 (Swift Bosses on one seed), Faithless at 2,000.
- **From 1,300 nothing makes him eat.** Food ran out in no run, and with his own defence and health no run ate more than three dishes
  (one is the top-up as the potion's health comes in). A blow's share of his health, at most: 1.2% plain, 2.7% under Brutes and 5.4%
  in Faithless at 1,300; 0.06%, 0.12% and 0.46% at 2,000. What stops him is the boss's clock: 18–76 timeouts a run in every rule but
  Glass Hero.
- **Two rules still fell him deep, and neither by blows food could answer.** Glass Hero fell him 90–311 times a run at 1,300 and
  2,000, every fall a first blow, so food, defence and health can't count (`systems/combat.js:324`); dodge and the potion's faster
  kills are its only shields: dodge raised from 0.12–0.13 to 0.3 or to its cap, 0.6, added 0 to +40 stages bare and +10 to +20 with
  both at 700 and 1,300 (0 to +10 at 2,000), and he still fell 86–311 times a run. Fasting fell him 13–20 times at 1,300 and never at
  2,000: no health comes back, lifesteal included (`systems/combat.js:278`), and his last 18% lasts the run, so 017's lifesteal set
  for Fasting would do nothing.
- **The potion is worth 20–70 stages in every rule at every depth** (40–60 in most), as in 013's and 032's runs.

**Defence and health.** The same runs with defence ×0.1 or ×10 and health ×0.5 or ×2, bare and with both (9 rules × 4 × 2, three
seeds). Only the cells that changed:

| Hero | Changed a stage reached | Changed only the falls |
|---|---|---|
| 700 | Health ×0.5, bare: −0 to −10 plain, −10 Brutes (seed 2), −10 to −20 Rusted Gear, −10 Fasting. Health ×2, bare: +0 to +10 Brutes, +4 to +10 Faithless (seed 2: 0), +0 to +20 Fasting. Defence ×0.1: −10 Faithless (with both; seed 2 bare) | Health ×2 took the plain bare falls from 13–42 to 0; defence ×0.1 raised them in Brutes (57–119) and Faithless (39–103) |
| 1,300 | None of 72 (seed 2, four rules: −0 to −10 in Brutes bare at half health, +0 to +10 in Fasting at double) | Fasting's 13–20 falls: 24–38 at half health, 7–12 at double; Brutes bare at half health 7–28; Faithless bare 15–22 (defence ×0.1) and 33–47 (half health) |
| 2,000 | None of 72 | Fasting at half health: one fall a run, against none |

- **Defence ×10 changed nothing anywhere,** and defence ×0.1 almost nothing: the 90% cap uses nine times the monsters' attack and he
  holds far more, so at 700 a tenth of it raised the biggest plain blow only from 9.9% to 11.8% of his health, and at 1,300 it
  changed no blow's size.

**Dungeons, the Titan, the clan boss.**

| Hero | The Hellforge, 20 min: open tier · deepest tier he opens (clears bare / potion) | His own Titan · 100 below his best | A Titan at his best stage: bare · food · potion · both (share dealt) | The deepest Titan he beats: bare or fed · potion |
|---|---|---|---|---|
| 700 | II (boss 592): 88–89 / 94 · the same (seed 2: 92 / 97) | 470 · 600: won in every condition | fell at 0.4–1.0% · **stood the minute, 10.8–11.7%** (38–42 dishes) · fell at 1.6–4.3% · **38.9–42.2%** (8–9 dishes); seed 2 alike | 635 · 670 (seed 2: 640 · 675) |
| 1,300 | III (892): 123 / 123 · IV (1,192): 69 / 123 (seed 2, a Seal fewer: II 123 / 123 · IV 108–109 / 123) | 780 · 1,200: won | 8.1–9.9% · same · 34.0–41.5% · same; no fall, no dish (seed 2: 10.6–12.3% · same · 44.6–51.6%) | 1,225 · 1,265 (1,230 · 1,275) |
| 2,000 | III (892): 123 / 123 · VI (1,792): 123 / 123 | 1,680 · 1,900: won | 6.5–7.3% · same · 31.2–35.0% · same | 1,915 · 1,965 |

- **Dungeons:** no fall, no run lost, no dish, blows at most 1.1% of his health, at any depth; defence and health ×0.1 to ×10 left
  every clear count as it was. At 1,300 the dungeon potion is what clears the deeper tier (69 to 123); at 2,000 he one-shots
  Hellforge VI bare. The Auto bot holds two Seals at 2,000, so its open tier is three to four below what his best opens.
- **The Titan at his best stage is where food changes the most, and only at 700:** without it a blow is 29–45% of his health and he
  falls in seconds; with it he stands the minute and deals 3 to 26 times as much (the attempt's essence goes by the share dealt). He
  wins neither way. Food moved the deepest Titan he beats by nothing at full health; at half health by 2–4 levels (10–20 stages).
  From 1,300 a Titan at his best never fells him (a blow 4.4–5.4% of his health at 1,300, 0.34% at 2,000): only half his health fell
  him there (1,300, bare), and food held him up again (5 dishes, the same share dealt).
- **His own Titan stands far below him:** 230 stages at 700, 520 at 1,300, 320 at 2,000 (313 kills). It climbs 5 stages a kill, one
  an hour at most (the bot made 0.85–0.9 an hour), against a best that climbs 1–4 an hour deep, so a Titan at the best stage is where
  a long-playing hero arrives: the always-on bot's stood within 40 stages of its best at 1,200 h (039: 518 kills, best 2,740).
- **The clan boss has no attack** (`systems/clanfight.js:46`: `atk: 0`), and the server's reckoning reads attack, crits and swing
  time only (`core/power.js:73-92`). Taking off the shield, helm, plate and greaves cost 6–22% of the damage, through their crit
  damage bonuses, not their defence (seed 2: ×5.18 and ×5.57 striking with the potion, ×4.82 and ×5.25 without them):

| Hero | Watching, potion | Striking at every opening | Striking, potion | The same without the four armour pieces |
|---|---|---|---|---|
| 700 | ×3.60 | ×1.45 | ×5.24 | ×4.72 |
| 1,300 | ×4.20 | ×1.33 | ×5.60 | ×4.99 |
| 2,000 | ×4.80 | ×1.33 | ×6.37 | ×4.99 |

**P-106 on the copy: a bleed.** Each blow that lands also takes 1% or 3% of his health, which armour can't floor (two seeds):

| Hero | Plain, bare · food · potion · both | Brutes, the same |
|---|---|---|
| 700 | 1%: 660 · 660 · 700 · 710; 3%: 650 · 660 · 700 · 710. Bare 47–59 falls, fed none (190–340 dishes) | 1% and 3%: 610–620 · 630 · 650–660 · 680. Bare 46–100 falls, fed none |
| 1,300 | as without a bleed (1,260 · 1,260 · 1,310 · 1,310); no fall, his health never under 92% | 1%: as without. 3%: 1,210 · 1,220 · 1,270–1,280 · same; bare 20–25 falls, fed none (58–112 dishes) |
| 2,000 | as without (1,950 · 1,950 · 2,010 · 2,010); no fall, never under 96% | 1%: as without. 3%: 1,920 · 1,920 · 1,980–1,990 · 1,980; bare 12–13 falls, fed none (30–35 dishes) |

- **Why a small bleed does nothing deep:** lifesteal heals a share of the damage dealt, up to 3% of his health a second
  (`BASE.lifestealPerSecond`, `systems/combat.js:276-283`), and deep his damage is many times his health, so the ceiling is all that
  limits it; regen adds 0.1% a second. A bleed slower than about 3% a second is healed before it counts. At 3% a blow Brutes' blows
  outrun it: bare he falls 12–25 times a run, fed never, and the stage moves by 0–10.
- **So a bleed has to beat that ceiling** (or turn lifesteal off, as Fasting does) before food counts; past it a dish (34–40% of his
  health) answers it at once. Defence can't count by construction, and nor can health, since the bleed is a share of it.

## 2. What a deep drop is worth

**A frontier piece, kind by kind.** Stages at the boss, by damage a second, mean of 300 rolls, legendary · mythic; the Equip card's
figure in brackets. Seed 2's hero after "s2" where it differs by more than two stages.

| Kind (its drop weight of 100) | Hero at 700 | At 1,300 | At 2,000 |
|---|---|---|---|
| Weapon (12) | 18.5 · 26.5 [18.1 · 25.7]; s2 21.2 · 28.9 | 16.5 · 24.3 [16.4 · 24.0]; s2 (a legendary worn) 7.6 · 15.2 | 13.7 · 21.4 [13.4 · 20.9] |
| Shield (10) | −1.2 · −0.9 [15.9 · 22.5]; s2 0.2 · 0.5 | −0.2 · 0.0 [12.0 · 17.6] | −0.4 · −0.2 [6.7 · 11.2] |
| Head (10) | 1.2 · 1.6 [10.4 · 14.8] | 0.8 · 1.1 [6.8 · 10.7] | −1.5 · −1.2 [1.6 · 4.7] |
| Body (10) | 1.2 · 1.6 [16.2 · 22.0]; s2 0.2 · 0.5 | −0.4 · −0.2 [10.5 · 15.6] | −1.4 · −1.1 [2.2 · 6.4] |
| Legs (10) | 0.7 · 1.0 [11.6 · 16.1] | 0.8 · 1.1 [7.8 · 11.8]; s2 0.3 · 0.5 | 0.1 · 0.4 [5.2 · 8.1] |
| Boots (10) | 2.2 · 4.0 [5.3 · 9.5] | 2.2 · 3.7 [6.4 · 9.6] | 0.6 · 2.2 [3.2 · 5.6] |
| Gloves (10) | 7.1 · 10.3 [6.1 · 9.1]; s2 2.2 · 5.8 | 5.9 · 8.9 [5.1 · 7.8]; s2 2.9 · 5.4 | 5.3 · 8.3 [4.4 · 7.1] |
| Ring (10) | 8.3 · 11.8 [7.2 · 10.4]; s2 5.6 · 9.2 | 4.8 · 7.2 [4.0 · 6.1]; s2 2.9 · 4.8 | 3.3 · 4.9 [2.4 · 3.7] |
| Neck (8) | 10.2 · 14.9 [9.0 · 13.3] | 5.3 · 8.6 [4.5 · 7.6] | −0.5 · 1.9 [−0.6 · 1.5] |
| Ear (10) | 6.6 · 9.4 [6.2 · 8.8] | 2.1 · 4.1 [2.0 · 3.7]; s2 3.0 · 4.5 | 1.9 · 3.2 [1.7 · 2.7] |
| **Any kind, by weight** | 5.7 · 8.2 [10.8 · 15.5]; s2 5.5 · 8.1 | 4.0 · 6.2 [7.8 · 11.8]; s2 2.5 · 4.5 [5.5 · 9.2] | 2.4 · 4.4 [4.3 · 7.6] |
| The slot that lags, where a Lord's due and the bosses' due go | plate (s2 greaves): 1.2 · 1.6 (1.3 · 1.7) | boots (s2 greaves): 2.2 · 3.7 (0.3 · 0.5) | greaves: 0.1 · 0.4 |

- **The four kinds without attack** (shield, helm, plate, greaves: 40 of the table's 100) are worth −1.5 to +1.7 stages even as a
  mythic, all of it from their bonuses; the card says +5 to +23 for a mythic one. A rare is worth 0.7 at most. Fresh runs agree: a
  frontier shield or plate, legendary or mythic, moved the best stage by 0 at 700 and 2,000 and by −10 to +10 at 1,300 (two seeds); a
  weapon by +10 to +40; gloves, a ring or an amulet by 0 to +20.
- **The weapon is worth more than any two other kinds:** a mythic one 15–29 stages (the less, the better the one he wears). Jewellery
  and gloves come next, 2–15 as a mythic, less the deeper he stands; boots 2–5.
- **The sure pieces go where they are worth least.** `laggingSlot` (`systems/inventory.js:56`) ranks the weapon and armour by score,
  attack plus defence, so the armour that falls behind wins it: the plate or the greaves at 700, the boots or the greaves at 1,300,
  the greaves at 2,000. A Lord's Mythic there is worth 0.4 to 3.7 stages, where a mythic weapon would be worth 15 to 29.
- **The card is right for the weapon, jewellery and gloves** (within 2 stages) and wrong for every piece that carries defence: it
  takes the larger of attack's stages and defence-and-health's (`gainStages`), and past the cap the second is only a number.
- **Below legendary a deep drop is worth little:** a random rare is worth 1.9–2.0 stages at 700, −0.1 to 1.0 at 1,300 and −0.3 at
  2,000; an epic 3.5–3.6, 1.0–2.3 and 0.8; commons and uncommons lose stages from 1,300 on.
- **A random frontier drop is worth less the deeper he stands:** 8.1–8.2 stages as a mythic at 700, 4.4–6.2 at 1,300 and 2,000, half
  of what the card says; at 2,000 a legendary of any kind beats what he wears in 59% of rolls by damage and 92% by score.

**Affixes past their caps.** The uncapped totals the hero holds at his wall, and what each of a roll's eight bonuses does for him
(each is equally likely on a roll): damage, dead past its cap, survival only (dodge, lifesteal, health: section 1 finds they change
no outcome deep, Glass Hero's dodge aside), or gold and XP.

| Hero | Attack speed (cap 1.0) | Crit chance (cap 0.75) | Dodge (0.6) · lifesteal (0.3) | The pool's eight: damage · dead · survival · gold or XP | His worn bonuses, the same | The excess as damage |
|---|---|---|---|---|---|---|
| 700, seeds 1 and 2 | 0.65, 0.68 | 0.23, 0.25 | 0.13–0.15 · 0.10–0.14 | 3 · 0 · 3 · 2 | 8 · 0 · 15 · 5 of 28; 12 · 0 · 13 · 7 of 32 | 0 |
| 1,300 | 1.11 | 0.21 | 0.12 · 0.13 | 2 · 1 · 3 · 2 | 8 · 4 · 12 · 6 of 30 | attack speed 1.6 stages |
| 1,300, seed 2 | 1.26 | 0.19 | 0.17 · 0.17 | 2 · 1 · 3 · 2 | 7 · 4 · 16 · 9 of 36 | attack speed 3.5 stages |
| 2,000 | 1.20 | 0.33 | 0.13 · 0.22 | 2 · 1 · 3 · 2 | 13 · 3 · 17 · 10 of 43 | attack speed 2.8 stages |

- **One bonus of eight is dead past its cap at 1,300 and 2,000** (attack speed), none at 700. With the three that only keep him
  alive, half of what a deep drop rolls does nothing in the fight, and a quarter is gold or XP; a quarter is damage (crit chance and
  crit damage). Of his worn bonuses 47–56% do nothing deep (16 of 30, 20 of 36, 20 of 43), against 015's 51% of 490.
- **What the spill would give is small:** attack speed past the cap counted as damage is worth 1.6–3.5 stages at 1,300 and 2.8 at
  2,000. Crit chance stands at a quarter to under half of its cap. The dead weight is the survival bonuses, not the capped ones.

## 3. The boot's replay of a day away

**In Chromium.** The 1,300 hero (and the 2,000 one) as a guest, saved 24 hours before; milliseconds from navigation, median (range)
of three runs, two for the controls. "The boot's task" is the longest main-thread task, which holds the replay and the first render;
in all but three runs it was the only long task (the others had one more, of 55–81 ms).

| | First paint (the sidebar's title) | Modules in | The boot's task | The game drawn | Interactive |
|---|---|---|---|---|---|
| Plain, Auto on (as the bot plays him) | 388 (76–4,896) | 102 (79–207) | 1,515 (1,486–1,619) | 1,642 (1,614–4,909) | 1,642 (1,614–4,924) |
| **4×, Auto on** | 120 (88–184) | 247 (152–316) | **6,753 (6,593–6,919)** | **7,087 (6,797–7,359)** | 7,115 (6,802–7,363) |
| Plain, Auto off | 80 | 287–302 | 296–346 | 628–702 | 628–702 |
| 4×, Auto off | 132–160 | 194–339 | 1,216–1,306 | 1,470–1,741 | 1,496–1,743 |
| Plain, no time away (one run) | 80 | 198 | 57 | 299 | 299 |
| 4×, no time away (one run) | 200 | 472 | 292 | 813 | 818 |
| The 2,000 hero, Auto on, plain (two runs) | 76–88 | 185–228 | 2,104–2,166 | 2,346–2,409 | 2,346–2,429 |
| **The 2,000 hero, 4×** (two runs) | 180–240 | 356–448 | **9,989–10,381** | **10,677–11,006** | 10,735–11,032 |

- **Until the boot's task ends the page shows the sidebar's title and answers nothing.** The modules are in by 0.1–0.3 s; then the
  replay and the first render run as one task, 1.5 s plain and 6.6–6.9 s at 4× for the 1,300 hero (2.1–2.2 s and 10.0–10.4 s for the
  2,000 one), and the game appears a frame later with the welcome-back report (24 h 0 m away, 53,500–54,600 monsters, 55 prestiges
  "on its own"). No long task followed it, so the game answers from the frame it is drawn. The first run's first paint came at 4.9 s
  although its task ended at 1.8 s: the browser's cold start on a loaded machine, not seen again.
- **Auto prestige is most of the cost.** The same day with Auto off is a fifth of the task (0.30–0.35 s plain, 1.2 s at 4×): the hero
  waits at his wall, 2,400 kills, where with Auto he climbs again 55 times, 54,000 kills.

**In Node** (`Game.resumeFromSave` as `src/main.js` calls it, a fresh process each run, one core of the M3 at load 18–66; CPU time):

| Hero | Auto on: CPU · wall | Prestiges · kills in the day | Auto off: CPU · wall | Kills |
|---|---|---|---|---|
| 700 (seeds 1 and 2) | 4.2–6.1 s · 4.2–6.9 s | 68–70 · 38,600–39,200 | 1.3–1.9 s · 0.9–1.6 s | 4,200–4,600 |
| 1,300 (seeds 1 and 2) | 4.3–6.9 s · 3.6–10.7 s | 54–55 · 53,700–54,600 | 0.8–1.2 s · 0.5–1.3 s | 2,400 |
| 2,000 | 5.8–8.0 s · 5.7–10.2 s | 42–43 · 64,500–65,000 | 0.9–1.2 s · 0.5–1.1 s | 2,000 |

- Node 20 runs the same replay about three times slower than Chromium's newer V8 (4.3–6.9 s against 1.5 s for the 1,300 hero), so
  037's 0.6–2.6 s, measured in Node on heroes without Auto, stands for a hero who waits at his wall. Under the machine's heaviest
  load (100–270) the Node replay took 9–45 s.
- Both agree on the ratio: a day away costs 3–7 times as much with Auto on (in Chromium about five), more the deeper he stands.

## What this doesn't settle

- **Simulated heroes from the Auto bot only:** two seeds at 700 and 1,300, one at 2,000. Live heroes hold other talents and gear;
  this one has no talent point before 1,300, and its open dungeon tier stands three to four below what its best opens. Live saves
  through these benches need the owner's OK each time.
- **Fresh runs move in gates:** a boss every ten stages, so a gain under ten shows as 0 or 10. The drop figures are the analytic
  ones; the fresh runs agree with them in sign and size for every piece tried.
- **The Titan at his best stage was set by hand** (his kills). A live hero gets there only after long play; past 2,000 not measured.
- **The bleed is the copy's, not P-106's design:** a hook on each blow that lands, on plain runs and Brutes only; no talent reads it
  (Fortress, Second Wind and Rally don't touch it).
- **Drops at the place's own tier:** one frontier piece in four comes a tier lower (`DROP_TIER_OFFSETS`) and is worth less. Uniques
  and Seal copies are left out; the anvil's and the bench's levels stay with the slot, as in the game.
- **The boot:** headless Chromium on a shared M3 at load 13–66; the CPU throttle slows the main thread four times, not a phone's GPU,
  memory or storage, and no phone was measured. A guest's path only: signed in, a server save that wins replays again (037). One save
  at 1,300 (and the 2,000 hero's two runs); a hero away mid-dungeon or mid-Titan not tried.

## What it means for the proposals

- **P-023 (survival deep):** answered for every fight the game has. From 1,300, food, defence ×0.1 to ×10 and health ×0.5 to ×2
  change no outcome beyond a gate on one seed in the plain climb, the eight Trials, the Hellforge at the deepest tier he opens, his
  own Titan or one at his best stage, or the clan boss, which can't strike; at most they change the falls, in Fasting and Glass Hero,
  where food can't be eaten or can't help. At 700 food is worth a gate under Brutes and Faithless, and a full minute against a Titan
  at his best stage. So 013's three choices stand, and "leave it and say so" is honest past 1,000 everywhere, not only on the ladder;
  a survival test deep has to be a rule on the hero (P-106, P-126), as 032 said.
- **P-106 (a Trial that bleeds):** a bleed of 1% a blow does nothing deep, and 3% only adds falls under Brutes: lifesteal refills up
  to 3% of his health a second, and his damage always fills it. Sized to beat that ceiling, or with lifesteal off as in Fasting, food
  answers it at once (a dish is 34–40%), and Rally, Lifeblood and Hearty Meals with it; defence and health can't count by
  construction. So it would be a food-and-sustain Trial, not a defence one, its strength set against `BASE.lifestealPerSecond` and
  sized with the simulator.
- **P-126 (a tribulation at a Lord's first fall):** strikes as a share of his health that armour can't floor leave defence and health
  out, as the bleed does; before the fight no swing lands, so lifesteal gives nothing and regen 0.1% a second. With auto-eat at 25%
  and a dish of 34–40%, five at a time at most (`tryEat`, `systems/combat.js:204`), a fed hero falls only to one strike larger than
  what he holds, a bare one to strikes that add up past his health. The count and the share alone decide, the same at stage 500 and
  5,000: deep it would be the one place food counts, and its numbers would say exactly how much.
- **P-062 (capped stats spill into damage):** deep, the only cap that binds is attack speed (1.11–1.26 against 1.0), and spilling its
  excess would be worth 1.6–3.5 stages. The larger dead weight is the three survival bonuses and the armour's defence: 47–56% of worn
  bonuses do nothing deep, and a mythic shield, helm, plate or greaves is worth −1.5 to +1.7 stages. "Deep drops without dead
  affixes" pays more than the spill; keep dodge for Glass Hero, and lifesteal if P-106 comes.
- **P-075 (the Equip card counts the wall that binds):** confirmed on the game's own drops at 700, 1,300 and 2,000. The card says +5
  to +23 for a mythic piece without attack that is worth −1.5 to +1.7; for the weapon, jewellery and gloves it is within two stages.
  Counting attack alone once a boss's blow is under a tenth of his health would make it right for the 40 no-attack weights of 100.
  The same figure could rank `laggingSlot`, which now sends a Lord's due and the bosses' due to the armour that lags by score (a
  mythic there is worth 0.4–3.7 stages, against 15–29 for the weapon), and the dock's pick (`findUpgrade`, 017).
- **P-123 (the boot):** measured, and it matters more than 037 thought. At Chrome's 4× throttle a returning guest with Auto prestige
  on (earned after five prestiges or two days) looks at the sidebar's title for 6.8–7.4 s (the 1,300 hero) or 10.7–11.0 s (the 2,000
  one) before the game draws, with no bar and no answer to a tap; plain, 1.6 s and 2.4 s. Seven of 16 active players stand past 1,000
  (013). The replay is nearly all of it (no time away: 0.3–0.8 s), and Auto makes it about five times dearer (three to seven in Node,
  more the deeper). Signed in, a winning server save pays it twice. A slice of an hour a frame would still be 0.28 s a frame at 4×
  (6.75 s over 24 hours); about ten game minutes a slice keeps a frame near 50 ms. The replay's events and their order must not
  change (037). Worth building, S–M.
