# Game feel: what makes an idle RPG look and play like a game

Notes from a short research pass (October 2026) before the Phase 7 UI work, plus what the best idle
and action games do. Each rule ends with how it applies here.

## 1. Juice: every action answers in three senses

"Juice" is the layer of feedback (animation, particles, sound, shake) that changes how an action
*feels* without changing the rules. It is the cheapest way to raise how good a game feels. The
rules of thumb that recur across sources:

- **Multi-sensory.** Eyes, ears and hands at once: a hit flashes, thumps and (on a phone) vibrates.
  A silent game feels like a spreadsheet no matter how it looks. → Add synthesized sound to every
  action (hit, crit, coin, level, chest, click) and haptics on phones. Mute is one tap away.
- **Short and sharp.** A screen shake that ends in 4 frames feels crisp; the same shake over 20
  frames feels sick-making. Exaggerate the size, not the length. → Hit reactions ≤ 250 ms, shake
  ≤ 400 ms, numbers fly for about a second.
- **Squash and stretch, anticipation, follow-through** (Disney's principles, applied to UI). Rigid
  things feel fake. → Sprites bob, lunge and recoil; buttons depress; counters bump when they change.
- **Restraint.** Too much juice hides information ("the juice problem"). → Big effects only for big
  moments (boss, legendary, level); small ones stay small and never cover numbers the player reads.

## 2. Idle games are visual metaphors for momentum

- Players must *see* progress: bars filling, piles growing, things unlocking. The next reward
  should always feel close. → Progress rings on the thing being worked, an XP bar on every skill
  in the sidebar, a "next unlock" bar in the header, counters that tick instead of jump.
- The dopamine of an idle game is *checking back*: what grew while I was away? → The welcome-back
  report stays a moment; the resources it mentions pop as they land.
- Variable rewards and milestones: rare drops, doubles, gems, pets. → Each gets a distinct sound
  and look so the player learns to recognise luck.
- Pacing: slow down just enough to nudge toward the next upgrade, never a dead wait. → Already in
  the balance; the UI's job is to make the upgrade visible (the ▲ on gear, the quest board).

## 3. What the UI of a game looks like (versus a web page)

From the comparisons (Melvor 1 → Melvor 2, Idleon, Idle Champions): dated idle UIs are walls of
text and numbers; the liked ones show *things* — item art, monster art, a scene — with the numbers
small beside them.

- **Art, not words.** A monster is a picture, an item is an icon with a rarity frame, a skill is a
  place. Emoji read as text. → Real sprites (CC0 pixel art, drawn crisp at 2–3×) for monsters, the
  hero, equipment and resources; icons first, names second, descriptions on hover or tap.
- **One stage, a HUD around it.** The game is the scene; the controls frame it. → The battle scene
  is the top of the Combat tab; skill tabs get their own scene with the worker animating at the
  node; the header is a HUD (purse, HP, goal), the sidebar a rail of icons with progress.
- **Hierarchy by size.** The number that matters is big; everything else is small. → Damage, gold
  gained, level: large and bold; costs and descriptions: small.
- **Consistent frames.** Rarity colors, one border style, one corner style. → Already the dark
  fantasy theme; sprites get the same bronze frame as the slots.

## 4. Sound, specifically

- Small UI sounds raise the perceived quality of the whole product (the itch.io write-up puts it
  plainly: "small sounds increase the perception of quality").
- Satisfying click sounds make players look forward to the next click (Zuma's shot).
- Keep them short (40–200 ms), pitched up on repeats (a combo climbs), and layered: a hit is a
  thud plus a tick; a coin is a bright ping; a level-up is a three-note rising chime.
- Respect the browser: sound starts only after the first interaction; a mute setting is remembered.

## Sources

- [Making a game feel "juicy" with simple effects](https://resprawn.medium.com/when-you-play-a-great-game-it-feels-good-d23761b6eccf)
- [Squeezing more juice out of your game design (Game Developer)](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- [The "Juice" problem: how exaggerated feedback is harming game design](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design)
- [Juice in game design: making your games feel amazing](https://www.bloodmooninteractive.com/articles/juice.html)
- [Disney's 12 animation principles applied to games](https://gamejuice.co.uk/articles/disney-12-animation-principles-games)
- [How to make your game feel good: game feel and juice](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- [The psychology of idle games: why they work](https://dinogame.gg/blog/psychology-of-idle-games/)
- [Idle game design: systems, mechanics and progression](https://missionszanx.com/guides/idle-game-design-systems-mechanics-and-progression)
- [Casual game loops explained](https://gdevelop.io/blog/casual-game-loops)
- [Melvor Idle 2 vs Melvor Idle: every difference](https://tideward.app/melvor-idle-2-vs-melvor-idle/)
- [Legends of Idleon review (on its UI)](https://www.leetdom.com/reviews/legends-of-idleon)
- [Best practices for game UI sounds](https://sfxengine.com/blog/best-practices-for-game-ui-sounds)
- [Small sounds increase the perception of quality (itch.io)](https://itch.io/blog/1640623/small-sounds-increase-the-perception-of-quality)
- [Aaron Marks: the function of game sound effects](https://designingsound.org/2010/10/15/aaron-marks-special-function-of-game-sound-effects/)
