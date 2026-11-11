# 020: Game feel, sound and art (read 11 November 2026)

Read: designers' talks (GDC Vault, Game Developer), four papers, Steam reviews (the past year's 100 most helpful English reviews of each of ten games,
from each game's review pages, counted by keyword: rough counts), Reddit through the [Arctic Shift](https://arctic-shift.photon-reddit.com/) archive (Reddit can't be fetched),
VaporLens's machine summaries (unverified), Cookie Clicker's and Antimatter Dimensions' own code, the Game Accessibility Guidelines, and Fantasy Idle's code.
Ran: a copy of `tools/shots.mjs` writing to a temporary folder (combat, battle, mining and a new player's first minutes, at 1280 and 390 px), and a count of the
sounds a watched fight makes, on heroes saved by `tools/simulate.mjs`. The web search budget ran out before the end, so itch.io's disclosure rules and
Unnamed Space Idle's audio were not read further. No page carried instructions aimed at an AI reader.

## 1. Feel: what players praise, and what too much is

- **The talks.** Jonasson and Purho took a plain game and made it exciting on stage with particle effects ([GDC Europe 2012](https://gdcvault.com/play/1016487/Juice-It-or-Lose)); Nijman
  made 30 small tweaks to a dull shooter, screen shake among them ([Game Developer, on the 2013 talk](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)).
  Kelly answered that polish which doesn't fit its context (dust where there is no dust, bouncy tweens on hard rock) costs immersion ([GDC Europe 2014](https://gdcvault.com/play/1020861/Don-t-Juice-It-or)).
- **The studies.** Four versions of one action RPG, 3,018 players: both None and Extreme juice cut play time, experience, motivation and performance against Medium and High
  ([Kao 2020](https://doi.org/10.1016/j.entcom.2020.100359)). Louder feedback lowered players' sense of competence, while feedback tied to success raised enjoyment
  ([Kao et al., CHI 2024](https://doi.org/10.1145/3613904.3642656); abstract level, effect sizes unverified). Twelve audio designers: big sounds belong to actions that come
  neither often nor fast, and frequent ones need variation against ear fatigue ([Hicks et al. 2024](https://doi.org/10.1145/3677084)).

| Game (English reviews, positive) | Median hours in sample | Sound or music | Satisfying, juice | Too much |
|---|---|---|---|---|
| [Nodebuster](https://steamcommunity.com/app/3107330/reviews/?browsefilter=trendyear) (10,722, 97%) | 4 | 16 | 15 | 4 of 16 negatives: shake, white flashes, headaches |
| [Cast n Chill](https://steamcommunity.com/app/3483740/reviews/?browsefilter=trendyear) (5,352, 95%) | 27 | 20 | 8 | none; 54 mention the looks, 33 the pixels |
| [Gnorp Apologue](https://steamcommunity.com/app/1473350/reviews/?browsefilter=trendyear) (7,435, 95%) | 29 | 7 | 7 | 2 call the endgame cluttered; 1 faults its mute when unfocused |
| [Idle Slayer](https://steamcommunity.com/app/1353300/reviews/?browsefilter=trendyear) (4,377, 78%) | 60 | 6 | 6 | 1 complains of achievement notices; its zones' music is liked |
| [Leaf Blower Revolution](https://steamcommunity.com/app/1468260/reviews/?browsefilter=trendyear) (22,646, 94%) | 63 | 1 | 1 | none |
| [Soda Dungeon 2](https://steamcommunity.com/app/946050/reviews/?browsefilter=trendyear) (3,139, 93%) | 76 | 1 | 2 | none |
| [Rusty's Retirement](https://steamcommunity.com/app/2666510/reviews/?browsefilter=trendyear) (6,628, 97%) | 93 | 13 | 4 | none; 18 call it relaxing or cozy |
| [Cookie Clicker](https://steamcommunity.com/app/1454400/reviews/?browsefilter=trendyear) (55,219, 96%) | 245 | 2 | 10 | none |
| [Melvor Idle](https://steamcommunity.com/app/1267910/reviews/?browsefilter=trendyear) (8,675, 92%) | 379 | 2 | 4 | none; 2 negatives on silence, one refunded at 0.3 hours |
| [Unnamed Space Idle](https://steamcommunity.com/app/2471100/reviews/?browsefilter=trendyear) (3,027, 92%) | 810 | 0 | 5 | none |

- **Short and cozy games are sold on feel; long-haul ones are reviewed for their systems.** Reviews that mention sound or music have a median of 25 hours on record,
  against 61 for all 1,000. Unnamed Space Idle's reviewers, at a median of 810 hours, never mention sound (one sample: a correlation).
- **Too much shows up even in a four-hour game.** One Nodebuster player had turned the white flashes off and still had a headache; another blamed the screen and sound
  clutter of a full upgrade set. VaporLens weighs effects with performance at 0.09 of its complaints ([summary](https://vaporlens.app/app/3107330/nodebuster)). Gnorp's maker
  wanted excess on purpose, 2,000 gnorps and 20,000 shards on screen ([Game Developer](https://gamedeveloper.com/design/interview-the-gnorp-apologue)); it suits a game that ends in 8–10 hours (004).
- **Long-haul games let each effect be turned down.** Cookie Clicker has 13 switches: fancy graphics, CSS filters, particles, the numbers that pop off the cookie, milk,
  cursors, the wobbly cookie, scary stuff, an alternative click sound, fast notes, music in the background, and two volumes, all sounds and music ([its code](https://orteil.dashnet.org/cookieclicker/main.js)).
  Antimatter Dimensions has an animation switch per reset layer, each shown only once that layer is reached ([its code](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/components/modals/options/AnimationOptionsModal.vue)):
  Fantasy Idle's disclosure rule, applied to settings.
- **Luck has its own sound.** A 562-hour Cookie Clicker reviewer (same sample) remembers the golden cookie's chime above all, and an upgrade unlocks a selector to silence it.
  Fantasy Idle's mini-game chime already has a switch of its own.

## 2. Sound and music

- **Melvor Idle is silent**, and it costs at the door: the refund above, and 7 of 71 negative reviews in 002; VaporLens's heaviest negative theme, at 0.61, is a lack of visual and audio appeal ([summary](https://vaporlens.app/app/1267910/melvor_idle));
  a mod adding Old School RuneScape's sounds and music drew 258 points in October ([post](https://www.reddit.com/r/MelvorIdle/comments/1x492gp/)).
- **Melvor Idle 2** added a custom soundtrack in its alpha ([news, 20 November 2025](https://news.melvoridle.com/what-weve-been-up-to-with-melvor-idle-2/)). The demo's top posts praise its music
  ([189 points](https://www.reddit.com/r/MelvorIdle/comments/1xfokmg/); [162](https://www.reddit.com/r/MelvorIdle/comments/1xcp9r9/), which also lists the animations and a pause button), and an 18-point
  comment in the [demo's launch thread](https://www.reddit.com/r/MelvorIdle/comments/1x9r6aw/) names sound and music as what the first game lacked. The same thread asks for music while the game is minimised
  and for muting all but the music; others turned it off after a while ([thread](https://www.reddit.com/r/MelvorIdle/comments/1xgdw8f/)) or mute music first in every game ([thread](https://www.reddit.com/r/MelvorIdle/comments/1xo58r1/)).
- **Gnorp:** a great soundtrack weighs 0.21 in VaporLens, repetitive music 0.02 ([summary](https://vaporlens.app/app/1473350/the_gnorp_apologue)); one reviewer keeps it off for that.
- **The guidelines:** separate volumes or mutes for effects and music, and a toggle or slider for any haptics, are both at the basic level ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)).
- **Music a small game can use.** Kenney's assets are CC0 ([Kenney](https://kenney.nl/support)); OpenGameArt lists Juhani Junkala's five JRPG packs as CC0 loops ([pack 1](https://opengameart.org/content/jrpg-pack-1-exploration);
  from a search listing, the page refused my fetch: unverified); FreePD calls its music public domain ([FreePD](https://freepd.com/)); Incompetech's free licence needs a credit
  ([licences](https://incompetech.com/music/royalty-free/licenses/)); Pixabay's licence is not CC0 for tracks after 9 January 2019 and bars standalone distribution, a grey area for files any visitor can
  download ([licence](https://pixabay.com/service/license/)). A two-minute loop at 64 kbit/s is about 1 MB (my arithmetic); ten would add ~10 MB to today's 14 MB of assets.
- **Not AI music.** Players who find several AI assets start doubting the rest, even what people made ([Bazzaz and Cooper 2026](https://arxiv.org/abs/2608.11539), their spillover code).

**Fantasy Idle's sound, from the code.** `src/ui/sound.js` builds 38 sounds from Web Audio oscillators and filtered noise: no audio files at all (0 of 14 MB of assets).
Chimes are tuned to notes; drops climb a ladder (drop, upgrade, rare, epic, legendary, mythic); the combo rises in pitch; frequent sounds vary by ±15–120 cents; at most 5
sounds play per 120 ms; a shelf cuts 6 dB above 5 kHz for phone speakers; 15 vibration patterns play on touch screens. Nothing plays before the first gesture or while the page is
hidden; blows, hurts and dodges only while the fight is watched (`main.js:676`, `:774`); skill sounds only on that skill's tab. Settings: one switch for `Sound and vibration`, one volume,
a mute in the header, the mini-game chime (`ui/render.js:2357-2360`). **Lacking:** music or ambience; a second volume; vibration apart from sound; every skill shares one work
sound (`action`; the skill stage only plays the pet's, `ui/stage.js:86`); every land hits and falls alike; no compressor on the master.
**Measured** (simulated heroes, 10–30 minutes each): a watched fight makes 83 and 92 sounds a minute (about 5,000 an hour) near stages 50 and 95, and 86–90% of them are the same
three blows (hit, crit, hurt); kills come 5–7 a minute. That is the ear-fatigue case Hicks's designers describe, softened only by the pitch jitter. **At the wall the routine
becomes the alarm:** a hero saved on first reaching stage 300 fell 57 times in 30 minutes, his 31 dishes soon gone, so the defeat jingle and the red edge (`ui/scene.js:906-907`) came about twice a minute,
and on any other tab each fall is also a red toast (`main.js:859`). Deeper, where the boss clock is the wall, a timeout with its jingle and toast comes every 90 s (a 30 s fight, then
60 s of regrouping, `core/formulas.js:156`).

## 3. Art direction

- **At a glance.** A store capsule's job is to say what the game is, in a nanosecond ([Zukowski, 2020](https://howtomarketagame.com/2020/07/27/five-trends-in-steam-capsule-art/)). The hooks
  seen: Rusty's Retirement lives in the bottom third of the screen, with cute, diorama-like pixel art, about 330,000 copies by August 2024 ([GameDiscoverCo](https://newsletter.gamediscover.co/p/how-rustys-retirement-idle-farmed));
  Gnorp is near monochrome, so colour arrives with progress ([Game Developer](https://gamedeveloper.com/design/interview-the-gnorp-apologue)); Cast n Chill's pixel lake is its pitch (33 of 100 reviews name the pixels).
- **Pixel and painted.** Pixel artists warn against mixing pixel sizes in one picture ([dev diary](https://www.moddb.com/features/guard-duty-a-development-retrospective-dev-diary-4)) but accept it when
  deliberate, as in backgrounds ([essay](https://yari-pixels.github.io/Articles/mixels.html)). Fantasy Idle keeps the fighters at whole scales on a painting without a pixel grid;
  the tiles' dark outlines hold them apart. The same atlas is smoothed below 1× (`style.css:1838`), the one place its pixels blur.
- **AI art, 2025–2026, in numbers.** In 508,192 Steam reviews, games disclosing generative AI are recommended 68.4% against 86.3% for those tagged procedural generation, the baseline; free AI games 50.1% against
  78.9% paid; the Casual gap is smaller (78.4 against 84.8); reviewers who name AI recommend 49.5%; the deficit holds with free play, Early Access and playtime controlled (odds ratio 0.63).
  The main theme is low care; another is trust, where a disclosure that understates draws anger ([Bazzaz and Cooper](https://arxiv.org/abs/2608.11539)). One reviewer found it
  "baffling to use 'AI art' in a genre as low on graphical expectations" as idle games (same paper).
- **More counts.** A census of 53,597 Steam games: an AI-flagged one reaches 100 reviews at about 55% of the rate of others; art is in 72% of the flops' disclosures against 57% of the hits'
  ([Haro, July 2026](https://fragwyz.substack.com/p/three-years-of-ai-on-steam)). 49.9% of October 2026's releases disclosed AI (26.4% a year before), 47% of games with under ten reviews against 14%
  of those past 1,000; 77% positive against 83% (not shown to be causal) ([Power Up Gaming, on a community analysis, unverified](https://powerupgaming.co.uk/2026/11/02/almost-half-of-steams-october-releases-disclosed-ai-use/)).
- **Idle cases and gatekeepers.** Galaxy Idle Clicker went from 70% of 762 positive to 68% of its last 70 negative after an art change reported as AI, August 2025 ([Notebookcheck](https://www.notebookcheck.net/Steam-launch-New-free-to-play-idle-clicker-game-hits-Steam-faces-immediate-backlash-over-artwork.1081692.0.html));
  Revolution Idle dropped its AI art after reviews centred on it (a player's undated review, [IncrementalDB](https://www.incrementaldb.com/community/review/4839)); on r/incremental_games one of 14 posts disclosing AI art or audio passed 20 points (018).
  galaxy.click names heavy use of generative AI among its usual rejections ([verification](https://galaxy.click/docs/verification)); itch.io has added a No-AI search filter (reported 5 November) and gives no
  field to say how AI was used ([Power Up Gaming](https://powerupgaming.co.uk/2026/11/05/itch-io-expands-its-no-ai-filters-as-generative-ai-games-continue-to-flood-the-platform/)).
- **What the paintings do well, fairly.** 161 pictures (63 places and rooms, 98 card tops) hold one style, each set painted in one chat from one style prompt (`docs/art/gemini.md`). The prompts
  ban people, creatures and text, so the tells reviewers cite (extra fingers, faces and bodies that don't hold together) are absent by design. Every land, stratum and dungeon has its own colour, so the climb reads as a
  journey; a boss darkens and saturates it, rest greys it (`style.css:1216-1219`). The hero, monsters and items, the things watched for hours, are DCSS tiles that people drew.
  Commissioned indie backgrounds run about $75–150 each ([r/vndevs](https://www.reddit.com/r/vndevs/comments/1kibwhz/), unverified), so $12,000–24,000 for 161; scripted backdrops still
  exist for the 17 places (`assets/backdrops/`, 51 files). **Against them:** the gap is widest for free games, the genre's gatekeepers name heavy AI use, and in any post the paintings are
  the first thing seen. This is the owner's call; the numbers above are its inputs.

## 4. The game, looked at (1280 and 390 px)

- **Reads well:** the first fight (one painting, two crisp sprites, two bars, little else); the full-screen fight at 1280, its painting calm behind sprites at whole scale; the unlock card's
  painting and one line; the link preview (`assets/og-image.jpg`), which says genre, free and no ads in one look.
- **Reads less well:** on a phone the full-screen fight shows only the middle 28–53% of each painting's width (`background-size: cover`, `center 80%`, `style.css:1938, 2012`), while the
  prompts put the landmarks at the edges: the meadow's windmill and trees and the ruins' columns fall outside, leaving sky or water. On the Combat tab at 390 px the logo, tab strip and
  purse take about 285 of 844 px, and the `Enter combat` button partly covers both fighters' names. Mining at 1280 stacks four paintings (room, panel, card tops, stage); 20 food tiles sit on a
  busy supply-table painting.

## Held against Fantasy Idle

| Evidence | Fantasy Idle today | Verdict |
|---|---|---|
| Juice is best in the middle (Kao); frequent sounds tire the ear (Hicks) | Shake only at a boss's entrance (380 ms, 5 px, `ui/scene.js:615`); caps on fx, coins, pops, toasts, cards | Good |
| Big effects for rare moments | Drops are 0.2% of kills (`data/items.js:131`); fanfares climb with rarity | Good |
| A watched fight is heard for hours | 83–92 sounds a minute, 86–90% the same three blows | The weak spot |
| Big sounds for actions that don't repeat (Hicks) | At a wall: a defeat jingle, red edge and off-tab toast twice a minute, or every 90 s at a boss clock | Gap: a routine treated as a big moment |
| Long-haul games split their switches, shown once met | One `Reduce motion` switch, all or nothing | Gap |
| Haptics need their own toggle (GAG basic) | `Sound and vibration` is one switch | Gap, small |
| Silence costs at the door; music is praised, and also muted | No music; one volume | P-012, with its own volume |
| Players want music while minimised | Everything stops while hidden | Right for effects; an opt-in for music |
| AI art: 68% against 86%, 50% when free; disclosures that understate anger | Disclosed on the listings and wiki, not in the game | P-020 gains weight |
| The tells reviewers cite: extra fingers, faces, bodies | Prompts ban people and creatures; the sprites are human-made | A strength to say plainly |
| A phone sees the painting's middle | Landmarks sit at the edges | Small fix |

## Proposals from this file

1. **Music, as P-012 reshaped** (Add, M): a quiet loop per group of lands (four to six to start, the Abyss its own), human-made CC0 or licensed and credited, never AI-made; its own
   volume (GAG basic), a fade between lands, stopped while hidden unless the player turns on music in the background (Cookie Clicker; Melvor Idle 2's players asked), fetched only once music is
   on. Why: silence cost Melvor at the door, its sequel's music leads its praise, and the paintings' places have no sound of their own.
2. **A wall that repeats goes quiet** (Change, S): the first fall or timeout at a stage keeps its jingle, banner and toast; repeats at that stage within, say, ten minutes play a soft cue, and
   off the fight they fold into one toast that counts them. Why: measured above (twice a minute near stage 300); Hicks's rule; the house rule of big effects for big moments.
3. **P-020, with this evidence** (Change, S): a credits line in Settings that says exactly what Gemini made (the 161 pictures, edited how), what people made (the CC0 sprites), what is
   synthesized and how the code was written. Why: the trust theme punishes a disclosure that understates, and free games fare worst.
4. **Effects that turn down one by one** (Add, S): vibration apart from sound; under Reduce motion, switches for floating numbers, coin flights, confetti and the boss's shake, each
   shown once met; and blows heard at every hit or only for crits and kills. Why: GAG basic for haptics; Cookie Clicker's 13 switches and Antimatter Dimensions' unlocking ones; 5,000 blows an hour.
5. **Thin, from the shots and the code only:** the landmark on a phone (Change, S): `tools/paint.py` writes a focal x per painting for narrow screens, so the windmill or the
   columns stay in view; and a voice per skill (Change, S): a clink for Mining, a chop for Woodcutting, a bubble for Alchemy, in place of the one shared `action`.

**Ideas that don't carry over:** Gnorp's and Nodebuster's excess, screen shake on every hit, flashes and CRT filters (an hours-long watched fight, and Nodebuster's headaches); AI music or
voices (spillover); Melvor Idle 2's day-and-night backdrops (161 paintings twice over); Rusty's bottom-of-the-screen strip (a different game); replacing the paintings (the owner's call; costed above).

**For the queue:** Melvor Idle 2's audio and effects settings after 17 November; the OpenGameArt and FreePD licences read on their own pages before any track is chosen; itch.io's
disclosure fields and Unnamed Space Idle's sound (the search budget ran out); the accessibility pass against the full guidelines; the fight's mix heard on a phone speaker.
