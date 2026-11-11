# 021: Accessibility, held against the game (read 11 November 2026)

Read: the Game Accessibility Guidelines (GAG), WCAG 2.2, the Xbox Accessibility Guidelines (XAG), AbleGamers' 2024 study of
disabled mobile players, and what Cookie Clicker, Antimatter Dimensions and Trimps ship. Measured: the code at the branch tip
(85c028b, whose code is 6ea4de0's) in headless Chromium (Playwright 1.63), served locally with `?dev=1` and `tools/shots.mjs`'s
late-game save, 13 screens at 1280×900 and at 390×844 as a touch phone; axe-core 4.10.3 (from cdnjs) on WCAG 2.2 A and AA; contrast
from pixels, each run of text against the view with its text hidden, the game paused. Paths leave `src/` off. Not read: Reddit and
Steam threads (the search budget ran out; the Arctic Shift archive would have been a way around it) and Melvor's wiki (403). No
page held instructions aimed at an AI.

## What the guidelines ask, and what matters most here

For hours of play on a phone, sometimes with a macro, in this order: repeated input, touch targets, text size and contrast,
colour alone, flashing and motion, haptics apart from sound, keys and focus, and saying what exists.

- **Repeated input.** GAG's [Avoid repeated inputs](https://gameaccessibilityguidelines.com/avoid-repeated-inputs-button-mashing-quick-time-events/)
  (Intermediate, motor): fast pressing shuts out players with little strength, fatigue or pain. [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
  names Gears 5, where the player may hold instead of tapping; GAG's [macro system](https://gameaccessibilityguidelines.com/provide-a-macro-system/)
  (Intermediate) prefers automation the game controls. Holding is no cure alone: [Avoid buttons held down](https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/)
  (Intermediate) asks for a toggle or an automatic form, at the player's choice.
- **Touch.** [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) (AA): 24×24 CSS px, or a 24-px circle
  that meets no other target. GAG [Basic](https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/):
  0.96 cm on phones, about 58 CSS px on a 390-px iPhone (my arithmetic).
- **Text.** [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) (AA): 4.5:1, or 3:1 at 24 px (18.7 bold),
  disabled controls exempt; [1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) (AA): 200% without loss;
  [1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) (AA): no sideways scroll at 320 px.
- **Colour.** GAG [Basic](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/):
  red-green difficulty in 8–10% of men; a symbol or shape as backup, presets before filters. [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
  (A). [XAG 103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103) takes rarity colours as its example.
- **Flashing and motion.** [WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) (A): at most
  three flashes a second, unless what flashes stays under a quarter of a 10° field (341×256 CSS px, so 21,824 px²) at the largest
  size shown. GAG's [Basic item](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/) also names
  flashing over 5 s. [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) (A) counts real-time games as motion.
- **Haptics** get a [switch of their own](https://gameaccessibilityguidelines.com/include-toggle-slider-for-any-haptics/) (Basic, motor).
- **Keys and focus.** [WCAG 2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html) (A): a one-character
  shortcut can be turned off, remapped, or acts only on focus; [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
  (AA): a focused control is never wholly under a sticky bar.
- **Time.** [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) exempts limits essential to the activity,
  and [XAG 116](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/116) timers that are core mechanics.
- **Saying what exists.** GAG [Basic](https://gameaccessibilityguidelines.com/provide-details-of-accessibility-features-in-game/): players
  don't look for options. Stores ask now: Steam's pages carry declared features such as Adjustable Text Size and Color
  Alternatives ([Steamworks](https://partner.steamgames.com/doc/accessibility_features)); Apple's [Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels)
  (iOS 26, voluntary, later required) include Larger Text, Differentiate Without Color Alone and Reduced Motion. For P-072 and P-073.

## What players and idle games did

- AbleGamers surveyed 21 disabled mobile players (the page also says 144) and interviewed 12, early 2024 ([study](https://accessible.games/mobile-gaming-2024/)):
  "idle games are considered to be accessible by default", needing no quick reactions. Automated battles were liked; streaks and
  check-ins were unrealistic for many; half the interviewed wanted finer audio and visual settings. Thin; the streaks back P-017.
- [Cookie Clicker](https://cookieclicker.wiki.gg/wiki/Options) switches off particles, click numbers, wobble and fancy graphics, splits
  music from effects (Steam), and has a Screen Reader Mode: Tab walks the buildings, a held Enter buys fast.
- [Antimatter Dimensions](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/hotkeys.js) repeats hotkeys while
  held (M buys all); an [option](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/player.js) turns them off,
  beside six animation switches. [Trimps](https://github.com/Trimps/Trimps.github.io/blob/master/ScreenReader.html) ships a
  screen-reader page: a table of zone, cell and health, two live regions. Scapewatch added a HUD size of 50–150% in a month (006).
- Chrome 146 (10 March 2026) reads `<meta name="text-scale" content="scale">`: the root font follows the system's and browser's text
  size, so rem type grows ([notes](https://developer.chrome.com/release-notes/146)). WebKit has no position ([issue 587](https://github.com/WebKit/standards-positions/issues/587)).
  Over a fifth of Dutch phone users enlarge their text ([Appt](https://appt.org/en/stats/font-size), 2023).

## Fantasy Idle, measured

- **Contrast.** 3,014 runs of text; 132 (4.4%) fall under WCAG's ratio against the median of the painting behind. 16 are disabled
  buttons (exempt). 82 are the dock's unpicked food and potions, dimmed to 40% though a tap picks them (`style.css:591`): 3.2–3.9:1
  at 10–11 px. Of the other 34, 14 pass once their shadow counts; 17 fail in six places: Farming's level and XP over a pale sky
  (1.4–1.9:1, seen in a crop), red "Level 50" lines (3.1–3.2), the auto-eat line (3.4–3.7), Farming's "?" and "Lv 55" (3.2–4.1),
  Settings' grey small text (4.3–4.5). Against the painting's worst 5%, 246 (8.2%) fall short. axe could not judge 3,506 over paint.
- **Text size.** At 390 px, 40% of characters are under 12 px, 18% under 11 and 5% under 10; at 1280, 30%, 11% and 3%. The smallest,
  8.8 px, are a phone's stage numbers (`style.css:1658`). With the root at 150%, no phone screen scrolls sideways or cuts a word;
  at 200%, 1–21 labels a screen are cut (the Shop's prices, the hotbar's "Inventory"); at 1280 the sidebar's names are cut from
  150%. All but 3 elements grow with the root. At 320 px nothing scrolls sideways. Pinch zoom works (`index.html:5`).
- **Touch.** Two kinds fail WCAG 2.5.8 even with its spacing rule: the stage path's buttons on a phone, 20×19 px (7 a screen), and
  Settings' 13-px checkboxes in 19-px rows (4). 22–51 targets a screen are under 44 px.
- **Names.** None missing (0 of 30–161 controls a screen); axe's one other fault is 9 prestige keeps, spans with an aria-label and no
  role. Tiles name their rarity (`ui/render.js:1305`), toasts are status or alert (`main.js:1031`), the battle banner is live
  (`ui/scene.js:141`). But a badge is a glyph with a title (`ui/render.js:146`), so a tab reads "Shop▲", as XAG 103 warns; dialogs
  have no name (`main.js:1058`); the fight has no text summary. VoiceOver and TalkBack untried.
- **Keyboard.** Tab reaches 32–47 controls a screen, each with a ring, the monster too (`style.css:166,1439`); Space or Enter on it
  strikes. Space strikes from anywhere but a button, M opens the map, Esc closes (`main.js:480-491`). Faults: focus leaves a dialog (one Tab from
  "Prestige now" on a phone reaches the hotbar behind; ten at 1280), two focused bag tiles sat wholly under the hotbar, and M and
  Space can't be turned off. Sign-in fields carry `autocomplete` (`ui/render.js:2970-2972`), so password managers work.
- **Hands.** Clicking the monster every 250 ms for 10 s: 25 strikes on a desktop (29 at 100 ms), 33 by taps on the phone. A hold
  gives one: a mouse held 2 s 0 or 1, Space held 2 s with its repeats 1, a finger held 1 s 1 (`main.js:475,490`).
- **Flashing.** Each hit brightens the monster 2.4× or 3× for 240–360 ms (`ui/scene.js:64-65`). The hero alone makes at most 2 flashes
  a second; striking four times a second makes 5. Paused at the peak, a flash covered 3,300–8,700 px² on the phone; in the
  full-screen fight at 1280, 6,600–19,600 px² for plain monsters and 16,800 for a boss: 15–90% of WCAG's area. It passes, narrowly
  on big sprites (two bosses measured), and a macro keeps it up a whole boss clock. Reduce motion ends it.
- **Motion.** Reduce motion (the switch or the system's) takes running animations from 30 to 4 (1 on the phone) and pixels changing
  in 0.4 s from 7.7% to 3.5% (5.2% to 0.5%); the main thread's busy time halves, 13.0% to 6.1% of a core at 1280 and 16.5% to 7.8%
  at 390. The frame loop still runs 60 times a second.
- **Sound and haptics.** One switch, "Sound and vibration", one volume (`ui/render.js:2357-2358`). On Android each hit buzzes 8 ms, a
  crit 22 (`ui/sound.js:149`); iOS Safari can't ([caniuse](https://caniuse.com/vibration)). The mini-game chime comes with a toast.
- **Time.** The hero fights the clocks alone. The clan boss's opening keeps a beat, 2 s in every 6 from 4 s (`data/social.js:20`), told
  by a glow, "Strike now!" and a tick (`ui/scene.js:763-767`). Mini-games are optional; the dragging one is a slider (`ui/render.js:1005`).

## Colour

Simulated with Machado, Oliveira and Fernandes' [2009 model](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)
at full severity (dichromacy; the commoner anomalies lose less), as CIEDE2000 differences and on screenshots.

- **Rarity fails.** Rare and Epic fall from ΔE 22.9 to 1.0 for deuteranopes (5.2 protanopes); Common and Primal from 24.5 to 5.7;
  Uncommon and Mythic from 80.9 to 6.3; Uncommon and Legendary to 7.0 (protanopes). The bag's other cue is a glow in three steps
  (none; inset for Rare and Epic; a pulse from Legendary, `style.css:683-684`), so Rare and Epic look alike in the simulated bag.
- **Partly.** The War Tree's frames, green where a point can go and gold when full (`style.css:2696-2699`), fall from 33 to 8.0 and
  13.5, though the ranks (1/3, 3/3) still tell them apart. A stalled card is red only on the card (`style.css:467`). The crowns'
  ranks are tints (P-001). Low health is orange (56 to 11 from green) and a pulse that Reduce motion stops.
- **Told twice:** the bridges (colour and width, `style.css:2705`), the clan boss's opening, the bars (place and numbers), damage
  numbers (sign and place; taken and healed are 4.7 apart for deuteranopes).

## Held against Fantasy Idle

| Guideline | What the game does | Verdict |
|---|---|---|
| GAG repeated inputs, holding (Intermediate); XAG 107 | Strikes pay to 4 a second; a hold gives one; a macro is allowed | Partly: P-041 |
| WCAG 2.3.1 (A) | Up to 5 flashes a second when struck fast, on 15–90% of the area limit; none under Reduce motion | Passes, narrowly |
| WCAG 1.4.3 (AA) | 17 solid failures in six places; 82 unpicked supplies at 40% | Mostly passes |
| WCAG 1.4.1 (A); GAG colour (Basic); XAG 103 | Rarity by colour and three glow steps; Rare and Epic ΔE 1.0 | Fails for rarity |
| WCAG 1.4.4 (AA); GAG text size | No setting; rem type fits at 150% on a phone; Chrome 146 could follow the phone | Partly: P-019 |
| WCAG 1.4.10 (AA) | No sideways scroll at 320 px | Passes |
| WCAG 2.5.8 (AA); GAG touch (Basic) | Stage path 20×19 px on phones; 13-px checkboxes | Fails in two places |
| WCAG 2.1.1, 2.4.7 | Every control reachable, each with a ring | Passes |
| WCAG 2.4.3, 2.4.11 (AA) | Focus leaves dialogs; two tiles under the hotbar | Fails |
| WCAG 2.1.4 (A) | M and Space, no switch | Fails |
| WCAG 2.2.2 (A) | Reduce motion stills 26 of 30 animations, and follows the system | Passes |
| GAG haptics switch (Basic) | Vibration goes only with the sound | Partly |
| WCAG 4.1.2; GAG mobile screen readers (Intermediate) | Every control named; glyph badges; no text of the fight | Partly |
| WCAG 2.2.1; GAG timing | Clocks fought by the hero; the opening on a beat with three cues | Passes (core timers) |
| GAG details in game (Basic) | Two switches in Settings, an FAQ entry on the wiki, no page | Partly |

## Proposals from this file

In the order I'd do them. None reopens a refused item: the click and its combo stay.

1. **The measured faults, in one pass** (Change, S). 24-px stage buttons on phones (`style.css:1658`) and checkboxes; the `font` at
   `:1376` repaired (`inherit` can't stand in a shorthand, so browsers drop it); focus kept in a named dialog; `scroll-padding` under
   the hotbar; a backing for Farming's header; unpicked supplies above 4.5:1; words for badges. Why: WCAG A and AA, a few lines each.
2. **At most three monster flashes a second** (Change, S). A hit within 333 ms of the last flash keeps its number, jab and sound, not
   the brightening. Why: a fast hand makes 5 a second, and a big sprite reached 90% of the area limit.
3. **Rarity told twice** (Change, S). A mark per rarity on the tile, such as pips; the same for the War Tree's ready frame. Why: XAG's
   own example, and ΔE 1.0 between Rare and Epic. Colour presets can follow (M).
4. **Follow the phone's text size** (Add, S). The `text-scale` meta tag, once what 150–200% cuts is fixed. Why: Chrome 146 does the
   rest for rem type. Evidence for **P-019**: 150% already fits a phone; Safari still needs the setting.
5. **Vibration apart from sound** (Change, S). Why: GAG Basic; Android buzzes at every hit, and wanting the sound means the buzz.
6. **Shortcuts that can be turned off** (Change, S). A switch for M and Space. Why: WCAG 2.1.4, Level A; speech input types them.
7. **An accessibility note** (Add, S). The switches and keys, behind Settings' "?" and on the wiki. Why: GAG Basic; store labels later.
8. **The fight for screen readers** (Add, M). A hidden summary of stage, health and monster, as Trimps has, and polite lines for a
   boss, a fall, a level and a rare find; then VoiceOver and TalkBack. Why: GAG Intermediate; only names exist today.

- Evidence for **P-041** (hold to strike): a hold gives one strike against 25–33 by hand in 10 s; GAG and XAG ask for this, and AD
  repeats held keys. GAG warns that holding is hard too: a hold beside the tap, or a toggle, not either alone.
- Evidence for **P-037** (battery saver): Reduce motion already halves the main thread's work; the 60 frames a second remain.

For the queue: Reddit and Steam threads on accessibility in idle games, and Melvor's and IdleOn's settings (not read this round);
VoiceOver and TalkBack on a real phone; the flash at every boss's size; testers with colour blindness, as XAG 103 advises.
