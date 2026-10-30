# 005: Measurements on Fantasy Idle itself (round two, 30 October 2026)

The checks round one asked for, run on the code as it is (1db03c4), with the game's own tools. No code changed.

## Clans of every size: what fells the boss (`node tools/clanpower.mjs`)

Levels of the week's boss felled in a week, every attack used (three a day, six banked, one kill a day):

| How the attacks are fought | 1 member | 2 | 3 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|---|---|
| Watching (x1.00) | 1 | 1 | 2 | 3 | 6 | 7 | 7 |
| Striking in the openings (x1.33) | 1 | 2 | 3 | 4 | 7 | 7 | 7 |
| Striking + combat potion I (x2.39) | 2 | 3 | 4 | 6 | 7 | 7 | 7 |
| Striking + potion IV (x4.79) | 3 | 5 | 7 | 7 | 7 | 7 | 7 |
| Striking + potion VI (x6.38) | 4 | 6 | 7 | 7 | 7 | 7 | 7 |

- Three members who strike with a potion IV fell all seven levels (the banner's x3); a solo player who does the
  same fells three (x2). How a fight is fought matters more than how many fight.
- The live clans felled 3–4 levels in the week of 30 October, so most attacks are probably watched or fought without
  potions. The boss panel (`clanBossPanel` in `src/ui/render.js`) shows the boss's health, the attacks waiting and the
  refill, not what each level takes nor what striking and a potion multiply.
- This corrects round one's "about 13 fully active members": that counted watching only (003 and P-006 corrected).

## Could the growth check flag an honest player after a sleep? (`api/index.js`, `plausibilityFlags`)

No case found. Each ranked number may grow by what play allows per real hour on the server's clock, from its highest
value and from where the day's window began, plus 30 minutes of slack; offline progress happens inside that real time
(the time away is measured by the server's clock, FAQ), so a laptop that sleeps eight hours uploads eight hours of
growth against eight hours of allowance. Two devices can't both replay the same hours: an upload over a save the page
hasn't seen is refused (409). What a flag does: the account is left out of the boards and of sizing clan bosses for 30
days, and the player isn't told (`flagged` in the upload's answer is not shown). A false flag would be silent, which is
the better failure; the owner sees flags in the database.

## How busy the page keeps the browser

Headless Chromium at 1280 x 860, a hero at stage 150 fighting, ten seconds per view, Chrome's own performance counters
(`scratchpad cpu_measure.mjs`):

| View | Main thread busy | Script | Style and layout |
|---|---|---|---|
| The fight on the whole screen | 12.4% of a core | 1.8% | 3.4% |
| The fight folded into the page | 13.9% | 1.9% | 3.8% |
| Mining with its stage | 12.7% | 1.6% | 2.5% |
| Inventory (the fight going on, no scene) | 9.7% | 1.7% | 1.6% |

- The game's own code is light (under 2% of a core); most of the busy time is painting, which headless Chromium does
  on the main thread in software, so a real browser with a GPU spends less. Even a screen without the scene keeps about
  10% busy, from the glowing and pulsing badges and the per-frame updates.
- A hidden tab can't be measured this way (headless keeps drawing); real browsers stop drawing hidden tabs and slow
  their timers, and the game catches up on return.
- One cost of my own: the new-version pill's glow animates a box shadow, which repaints every frame while the pill is
  showing; an opacity-animated layer would be cheaper. Small, and only while an update waits.
- Players name CPU and battery drain among the genre's complaints (004: 67% of Melvor's complaint weight is
  performance). On a phone the same work costs several times more of a slower core.

## The skip test: is any system best ignored? (`tools/batch.mjs`, 12 seeds, 150 hours)

The simulator's sensible player, always online, with one part of the game left out through its policy (`--set`):

| Variant | Stage 200 (h) | Stage 400 (h) | Best stage at 150 h | Deaths | Time on combat / farming |
|---|---|---|---|---|---|
| Everything (base) | 24.6 | 60.8 | **920** (890–950) | 2,051 | 39% / 13% |
| No food | 27.9 | 69.9 | **930** (890–960) | 3,086 | 28% / 22% |
| No potions | 41.9 | 100 | **640** (610–670) | 3,968 | 21% / 25% |
| No food and no potions | 40.5 | 123 | **479** (440–510) | 6,474 | 10% / 45% |
| No Agility | 25.9 | 61.4 | **740** (720–770) | 3,497 | 45% / 22% |

(Medians, P10–P90 in brackets; twelve-seed medians move about 5% between batches, `batch-noise`.)

- **Potions carry the climb:** without them the best stage at 150 hours falls by 30%; without both supplies, by half.
- **Agility pays:** skipping it costs a fifth of the best stage (920 → 740). Shadeofnight's feeling that building
  nothing is best (001) is wrong in numbers, which makes showing the course's rates (P-002) the fix.
- **Food doesn't beat skipping it, by 150 hours:** a hero without food reaches stage 400 nine hours later (15%) but ends
  at the same stage (930 against 920, within the noise), with half as many deaths again. The time not spent cooking
  goes to farming herbs for potions. The owner asked on 14 October for food and potions to be "crucial" (DESIGN
  §3.28); for potions that holds, for food only in the middle of the climb.
- **The check-in player didn't settle it:** with three visits a day (`--player=checkin3`, no Auto) the runs with and
  without food came out identical to the last number (best stage 147, the same deaths), so that bot never reaches the
  food decision in its short sessions; the knob tested nothing there. Next: the same with `--auto` and a bot that
  stocks food in its sessions, before any change to food is proposed.

## Proposals from this file

- **The boss says what it takes** (P-006, corrected): show on the clan boss the attacks each level takes and what
  striking and a potion multiply.
- **Food that pays for its time late** (Change, S–M, after the check-in measurement): food helps the middle of the
  climb but not the end, so a hero is no worse off skipping it by 150 hours. Options to measure: late dishes that heal
  more, or a dish's lasting bonus (Melvor's perfect cooks), so cooking stays worth its hours deep in the climb.
- **A battery saver** (Add, S–M): a setting, on by default on phones, that draws the scene at a lower frame rate and
  stills the glows once the page has been left alone a while (the game already knows that: Focus starts after a
  minute untouched). Measure the saving on a phone-class CPU (Chrome's 4x throttle) before proposing numbers.
