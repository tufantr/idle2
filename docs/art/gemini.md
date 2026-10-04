# Painting the backdrops with Gemini

The battle scene and the skill stages show one backdrop per place. Today a script paints them
(`tools/backdrops.py`). This page swaps them for real paintings made with Gemini: one wide picture
per place, 17 in all. A place you skip keeps its scripted backdrop, so a few at a time is fine.
Eight more paintings in the same style are pictures for cards and banners and the world map; they
are at the end, under [Cards, banners and the world map](#cards-banners-and-the-world-map).

## The quick way: Claude on your computer

Claude can only reach your Chrome from a session on your own computer, not from a cloud session.
You need Claude Code and the Claude in Chrome extension, and Chrome signed in to Gemini. In a
terminal, in your `idle2` folder, get the latest code and start Claude with Chrome:

```bash
git checkout claude/intelligent-einstein-y5i5iq && git pull
claude --chrome
```

Then paste this:

```text
Follow docs/art/gemini.md and paint the backdrops with my Gemini in Chrome. When they are imported and look right, commit them on a new branch called art-inbox and push it.
```

Inside a session, `/chrome` checks the connection. The paintings arrive on the `art-inbox` branch,
apart from other work on the main branch; tell the Claude working on the game that they are there
and it merges them in.

The Claude Desktop app works too. Turn on Claude in Chrome under Settings → Connectors, then open
the `idle2` folder in its Code tab.

## By hand

1. Open [gemini.google.com](https://gemini.google.com) and start a new chat. The Pro image model gives
   the best pictures.
2. Send the **first message** below. Gemini paints the meadow.
3. For every other place, send its prompt from **The places** in the same chat, so the style stays
   the same.
4. Download each picture at full size and name it after its place, for example `meadow.png` or
   `forest.png`.
5. Put the pictures in `art/gemini/` inside the game folder, then run:

   ```bash
   pip install pillow                                   # once
   python3 tools/paint.py art/gemini --sheet art/sheet.png
   ```

   That folder is git-ignored, so the big PNGs never get committed. Each picture becomes
   `assets/paint/<place>.webp`, and the game switches to it.
6. Open the game and look. Then commit `assets/paint/`, `style.css` and the credits line (see
   **Credits**).

No Python on your computer? Upload the pictures to GitHub instead:

1. Open the branch `claude/intelligent-einstein-y5i5iq` on GitHub.
2. Choose **Add file → Upload files**.
3. When you commit, pick **Create a new branch** and call it `art-inbox`. Skip the pull request
   GitHub suggests.
4. Ask Claude to import them. File names don't matter that way; Claude can tell the places apart.

Some pictures need a nudge:

- If one comes out square, reply "Make it wide, 16:9".
- If something stands in the middle of the ground, ask Gemini to clear it, because two fighters
  stand there.
- If one drifts in style, say "Closer to the first picture's style".

## First message

```text
I'm making a 2D fantasy idle RPG and need a set of matching background paintings, one per place. Keep one style for the whole set:
- hand-painted digital art, soft visible brushwork, storybook fantasy, rich but natural colors, gentle haze toward the horizon;
- side view at eye level, like the background of a 2D side-scrolling game, wide 16:9;
- the bottom quarter is flat, open ground running straight across the whole picture, with nothing standing on it in the middle (two small fighters will be drawn there, one on the left and one on the right);
- the interesting scenery is in the distance, in the sky and at the left and right edges;
- no people, no creatures, no animals, no text, no logos, no frame.

First picture, Sunlit Meadow: rolling green hills full of wildflowers on a bright summer morning, soft white clouds, a few round oak trees at the left edge, a distant windmill and red village roofs on the far hills at the right; a dirt road across the bottom.
```

Save it as `meadow.png`.

## The places

Send each one in the same chat, then save the picture under the name shown.

`forest.png`
```text
Same style and rules. Next, Whispering Forest: an ancient mossy forest at golden hour, huge old trunks framing both edges, sunbeams slanting through the canopy, ferns and softly glowing blue mushrooms; a mossy clearing across the bottom.
```

`caves.png`
```text
Same style and rules. Next, Glimmering Caves: a vast underground cavern lit by glowing cyan and violet crystal clusters on the walls and ceiling, stalactites, a thin waterfall far in the back, deep shadow above; a flat stone cave floor across the bottom.
```

`marsh.png`
```text
Same style and rules. Next, Fever Marsh: a sickly green swamp at twilight, twisted dead trees hung with moss, still dark water with lily pads, low drifting fog, a pale moon behind haze; a muddy bank across the bottom.
```

`highland.png`
```text
Same style and rules. Next, Stormy Highlands: windswept rocky highlands under a dark storm sky, a fork of lightning on the far horizon, jagged grey mountains, heather and boulders, a ruined watchtower on a distant ridge; a rocky plateau across the bottom.
```

`ruins.png`
```text
Same style and rules. Next, Drowned Ruins: half-sunken white marble temple ruins at the edge of a dark sea under a full moon, broken columns and arches crusted with seaweed and shells, teal moonlight on the waves; wet cracked flagstones across the bottom.
```

`volcano.png`
```text
Same style and rules. Next, Ember Volcano: an erupting volcano under a black and crimson sky full of ash, rivers of glowing orange lava down the slopes, black obsidian rocks, floating embers; scorched black basalt across the bottom.
```

`frost.png`
```text
Same style and rules. Next, Frozen Wastes: an icy tundra at blue hour, snow-covered peaks and blue glacier cliffs, a green aurora across the sky, light snowfall; smooth packed snow across the bottom.
```

`skyreach.png`
```text
Same style and rules. Next, Skyreach Spire: high above a sea of clouds in bright sunlight, floating rock islands with small waterfalls, a slender white tower in the distance; a white stone bridge across the bottom.
```

`abyss.png`
```text
Same style and rules. Next, The Abyss: a nightmare void realm, a purple-black sky with a giant swirling violet rift, floating broken rocks, jagged obsidian spires, glowing violet runes; dark cracked ground with a faint violet glow across the bottom.
```

`dungeon.png`
```text
Same style and rules. Next, Dungeon Hall: a torch-lit stone dungeon hall, heavy dark stone walls, an iron-barred door, hanging chains, two wall torches casting warm orange light, a tattered banner; worn flagstones across the bottom.
```

`titan.png`
```text
Same style and rules. Next, Titan's Field: a vast ruined battlefield at dusk under heavy storm clouds, the enormous dark silhouette of a stone colossus far away on the horizon with two faint red eyes, broken giant statues and torn banners; cracked ash-grey ground across the bottom.
```

`river.png`
```text
Same style and rules. Next, Riverside: a calm river bend on a fresh morning, clear blue water with gentle ripples, reeds and cattails, a small wooden jetty at the left edge, weeping willows, distant blue hills; a grassy bank across the bottom.
```

`camp.png`
```text
Same style and rules. Next, Campsite: a traveler's camp in a pine-forest clearing at night under a starry sky, a canvas tent and a log bench at the left edge, a cooking pot on a tripod at the right edge, warm firelight on everything (the fire itself is just out of view); bare earth across the bottom.
```

`workshop.png`
```text
Same style and rules. Next, Crafter's Workshop: a cozy timber workshop, workbenches and tools hanging on the walls, shelves of leather, cloth and jars, warm lantern light and a window with soft daylight; a wooden plank floor across the bottom.
```

`forge.png`
```text
Same style and rules. Next, Smithy: a blacksmith's forge, a glowing furnace and bellows, racks of hammers, tongs and swords on dark stone walls, sparks and warm orange light, an anvil at the right edge; a stone floor across the bottom.
```

`lab.png`
```text
Same style and rules. Next, Alchemist's Lab: a candle-lit alchemy room in a stone tower, shelves of glowing potion bottles in many colors, bubbling glass flasks and copper stills, old books, a round window onto a starry night; a wooden floor across the bottom.
```

## The dungeons

One painting per dungeon, a backdrop like the places (`tools/paint.py` lists them in `BATTLE`; the
game maps dungeons to them in `DUNGEON_ART`, `src/ui/features.js`). They show behind the dungeon's
fight and at the top of its card. After the world map, the chat needs reminding which set it is in:

`warren.png` (the Goblin Warren)
```text
Back to the backdrop set: same style and rules as the place backdrops (side view, wide 16:9, flat open ground across the bottom quarter, nothing standing in the middle, no people, no creatures, no text). Next, Goblin Warren: a cramped goblin warren dug deep into earth under tree roots, crooked wooden supports and rickety ladders, crude goblin totems with feathers and painted wooden masks, piles of stolen crates, sacks and pots at the left and right edges, tallow candles and a warm fire glow, dark tunnels leading off into the back; a packed dirt floor across the bottom.
```

`depths.png` (the Crystal Depths)
```text
Same style and rules. Next, Crystal Depths: deeper and grander than the earlier caves, an enormous crystal cavern around a still underground lake, gigantic amethyst and teal crystal spires rising at the left and right edges, a great glowing crystal heart far in the back casting beams of refracted light, sparkling dust in the air, deep violet shadows above; a flat stone floor veined with small glowing crystals across the bottom.
```

`stronghold.png` (the Orc Stronghold)
```text
Same style and rules. Next, Orc Stronghold: the inner courtyard of a brutal orc fortress at dusk under a red sky, tall spiked palisade walls of dark timber bound with iron at the left and right edges, ragged war banners in red and black, iron braziers burning with orange flames, a great iron-studded gate shut in the back, war drums and racks of crude spears and axes along the walls; a trampled earth courtyard across the bottom.
```

`lair.png` (the Dragon's Lair)
```text
Same style and rules. Next, Dragon's Lair: a vast cavern deep inside a volcano, great heaps of gold coins, goblets, crowns and treasure chests piled at the left and right edges, slow rivers of glowing lava in the background, huge ancient dragon skulls carved into the rock walls, scorch marks and drifting embers, a high broken stone archway at the back; a flat scorched stone floor across the bottom.
```

`citadel.png` (the Void Citadel)
```text
Back to the backdrop set: same style and rules as the place backdrops (side view at eye level, wide 16:9, the bottom quarter flat open ground running straight across with nothing standing on it in the middle, the scenery in the distance and at the left and right edges, no people, no creatures, no text). Next, Void Citadel: the inner courtyard of a black obsidian fortress adrift in the violet void, jagged dark towers and broken battlements at the left and right edges lit by cold violet fire in iron braziers, a great sealed gate in the back wall, floating shards of rock and a starry violet nebula in the sky, thin glowing violet cracks in the walls; dark polished flagstones with a faint violet glow across the bottom.
```

`maw.png` (the Abyssal Maw). **Not painted yet** (logged on 4 October 2026 while the owner was away;
until it is imported the Maw borrows `abyss`):
```text
Back to the backdrop set: same style and rules as the place backdrops (side view at eye level, wide 16:9, the bottom quarter flat open ground running straight across with nothing standing on it in the middle, the scenery in the distance and at the left and right edges, no people, no creatures, no text). Next, Abyssal Maw: the deepest pit of the Abyss, a colossal cavern shaped like an open maw, curved black stone fangs the size of towers rising from below and hanging from above at the left and right edges, a vast starless dark in the back with a faint ring of cold teal light around a bottomless chasm, drifting motes of pale light like dying stars, thin strands of dark mist; a flat ledge of cracked black basalt with faint teal veins across the bottom.
```
Once it is in `art/`: add `'maw'` after `'citadel'` in `BATTLE` (`tools/paint.py`) and import it, then
set `abyssal_maw: 'maw'` in `DUNGEON_ART` (`src/ui/features.js`) and give `maw` the `void` particles in
`PARTICLES` (`src/ui/scene.js`).

## Cards, banners and the world map

These are not backdrops of a fight. `src/ui/features.js` shows them on the card of a newly opened
place, on the banner of its tab and on its About card; the map is the board of `src/ui/worldmap.js`.
Paint them in the same chat as the places, so the style holds, and import them the same way.

`market.png` (the Shop)
```text
Same style and rules. Next, Merchant's Stall: a merchant's market stall on a cobbled town square at dusk, a striped red and cream awning over a wooden counter, shelves and crates of potions, sacks, rope and tools, barrels at the left edge, hanging brass lanterns glowing warm, a small open strongbox of gold coins on the counter, timber-framed houses and a clock tower behind; worn cobblestones across the bottom.
```

`shrine.png` (Prestige)
```text
Same style and rules. Next, Shrine of Rebirth: an ancient hilltop shrine at dawn, a ring of weathered standing stones carved with softly glowing violet runes around a stone altar holding a large glowing violet crystal, a thin spiral of light rising from it into a pink and gold sky, distant misty mountains, wind-bent grass and small white flowers; a flat stone terrace across the bottom.
```

`hall.png` (Achievements)
```text
Same style and rules. Next, Trophy Hall: a grand stone hall of trophies in warm afternoon light, tall arched windows casting sunbeams through dust, golden cups, medals on ribbons and laurel wreaths on carved wooden pedestals and shelves along the back wall, crossed swords, round shields and long plain banners hanging between stone pillars, a red carpet runner at the left edge; a polished stone floor across the bottom.
```

`festival.png` (Events)
```text
Same style and rules. Next, Festival Grounds: a village fair on a green at early evening, striped tents and game booths at the left and right edges, strings of colorful bunting flags and paper lanterns between tall poles, a maypole with ribbons in the distance, fireworks bursting in a deep blue and orange sky, hay bales and barrels; trampled grass and a dirt path across the bottom.
```

`clanhall.png` (Clan)
```text
Same style and rules. Next, Clan Hall: the inside of a great timber longhall at night, heavy carved beams, a huge stone hearth with a roaring fire at the left edge, a long oak feast table with benches along the back wall, round shields and crossed axes on the walls, long plain banners in deep red and blue hanging from the rafters, iron chandeliers with candles, fur rugs; a wide wooden plank floor across the bottom.
```

`farm.png` (Farming)
```text
Same style and rules. Next, Farmstead: a small farm at sunrise, neat tilled plots with rows of young green crops, cabbages and orange pumpkins in the middle distance, a wooden fence and a wheelbarrow at the left edge, a thatched barn and a windmill on a low hill at the right, golden mist over the fields, a pale pink and blue sky; a bare earth path across the bottom.
```

`course.png` (Agility)
```text
Same style and rules. Next, Training Course: an obstacle course in a sunny forest clearing, a rope bridge between two wooden platforms at the left edge, a climbing net on a timber frame, balance logs and stepping posts of different heights, a rope swing hanging from a big oak, a low stone wall, bright flags on poles, pine trees and hazy hills behind; packed earth across the bottom.
```

`map.png` (the world map)
```text
One last picture, of a different kind but in the same hand-painted storybook style: the world map of this game, painted like an illustrated fantasy map on old parchment, seen from high above at a slight tilt, wide 16:9. A single winding dirt road crosses the whole map from the left edge to the right edge, zigzagging gently up and down, and passes through ten small landscapes in this order, each with its own clear space: 1 a sunny green meadow with a windmill, 2 a dark old forest, 3 a rocky hill with a cave mouth and glowing blue crystals, 4 a murky green swamp, 5 stormy grey highlands with a ruined watchtower, 6 white marble ruins half sunk at a sea coast, 7 an erupting volcano with lava, 8 snowy frozen wastes with glaciers, 9 a tall white spire on floating rocks above clouds, 10 a dark swirling violet rift at the end of the road. Worn parchment edges. Absolutely no text, no letters, no labels, no numbers, no compass rose, no banners, no people and no creatures.
```

## Rooms behind the menus

The panels of the menus stand in a place too (`painted()` in `src/ui/render.js`): a skill's panel
continues its stage's painting, and the shop, the trophy hall, the festival and the clan hall reuse
their cards. These nine are for everything else, and `tools/paint.py` lists them in `ROOMS`. The
guild hall stands behind the whole page. They were painted in the same chat after the dungeons;
this set's first message carries its own rules, because cards and words are laid over them:

`guildhall.png` (behind the page)
```text
New set, same hand-painted storybook style as the places in this chat, but these are backgrounds for the game's menus: panels that hold buttons, cards and text. Rules for this set: wide 16:9 with the same soft visible brushwork and rich natural colors; dim, cozy light (candles, lanterns, firelight or moonlight) and fairly low contrast, so text laid on top stays readable; the details sit at the left and right edges and along the top, while the middle of the picture is a calm, fairly plain surface (a wall, a floor or a tabletop) because cards will be laid over it; no people, no creatures, no animals, no text, no letters, no logos, no frame. First, Guild Hall: the great hall of an adventurers' guild at night, seen from inside, dark timber walls and stone pillars at the left and right edges hung with old maps, round shields and crossed swords, a big stone fireplace glowing low at the far left, iron candle chandeliers along the top, a quiet wall of dark wood panels across the middle, barrels and a weapon rack at the right edge, a worn wooden floor.
```

`armory.png` (the Inventory's hero)
```text
Same style and rules as the Guild Hall. Next, Armory: a small stone armory lit by two wall torches, racks of swords, spears and axes and a row of round shields on the walls at the left and right edges, chainmail and a helmet on wooden stands at the edges, and in the middle of the floor an empty round wooden dais with a worn red rug on it, because the hero will be drawn standing there; dark flagstone floor.
```

`chest.png` (the bag)
```text
Same style and rules. Next, Treasure Chest: looking straight down into a big open wooden treasure chest from above, so its inside fills the picture; the inside is lined with plain deep red velvet, smooth and empty across the whole middle (the bag's slots will be drawn over it), the chest's dark wooden walls and iron corner bands frame the edges, the open lid with brass studs along the top edge, warm candlelight from one side.
```

`storeroom.png` (materials)
```text
Same style and rules as the Guild Hall and the Armory (not top-down this time). Next, Storeroom: a cellar storeroom by lantern light, tall wooden shelves at the left and right edges stacked with clay jars, sacks of grain, bundles of dried herbs, small crates of ore and stacked firewood, barrels and a ladder at the edges, a plain whitewashed stone back wall in the middle, a packed earth floor.
```

`vault.png` (a piece of gear, the unique items, the daily crate)
```text
Same style and rules. Next, Treasure Vault: a dark stone vault, a single carved stone pedestal in the middle lit by a soft beam of light falling from a small high window, its flat top empty (one item will be drawn on it), heavy iron-banded doors, closed chests and a few gold coins half in shadow at the left and right edges, dust floating in the light.
```

`library.png` (perks)
```text
Same style and rules. Next, Arcane Library: a tall arcane library at night, towering dark bookshelves with ladders at the left and right edges, candles and a few softly glowing violet runes floating in the air, a big round window full of stars at the top, and in the middle a faint glowing constellation of connected stars hanging in the dark air like a skill tree, above a dark wooden floor with a worn rug.
```

`study.png` (settings, sign-in and other questions)
```text
Same style and rules. Next, Scribe's Study: a quiet study at night, a wooden desk along the bottom with an open ledger, rolled scrolls tied with ribbon, a quill in an inkpot, a brass candlestick and a small locked chest, shelves of old books and a globe at the left edge, a leaded window with moonlight at the right edge, a plain wood-panelled wall in the middle.
```
The first study came with a white torn-paper border; "paint it again without the white paper border:
the painting must fill the whole picture right to the edges" fixed it, and the last two prompts ask
for that up front.

`supplies.png` (food and potions, on the Combat tab and in the fight's dock)
```text
Same style and rules, filling the picture to the edges. Next, Supply Table: a sturdy wooden table inside a canvas camp tent by lantern light, at the left edge loaves of bread, a roast, a wheel of cheese and apples on wooden boards, at the right edge rows of corked potion bottles glowing red, blue, green and pink on a little rack, a rolled blanket and a waterskin hanging from the tent pole, the middle of the tabletop bare and the canvas wall behind it plain.
```

`wartable.png` (the fight's orders: retreat, the map)
```text
Same style and rules, filling the picture to the edges. Next, War Table: a commander's war table inside a dark tent by candlelight, seen a little from above, an old parchment map of hills and rivers spread across the table with no writing on it, small carved wooden figurines and tiny flags standing at the left and right edges of the map, a dagger, a brass compass and a candle at the corners, a glowing brazier at the far left and dark hanging banners at the right, the middle of the map calm and empty.
```

Import them like the rest; a separate folder keeps the earlier pictures from being encoded again:
`python3 tools/paint.py art/rooms --trim 0`.

## Action cards

Every action card has a small picture across its top (the ore, the tree, the fish, the dish, the
piece on the anvil...). There are ninety, so Gemini paints them nine to a sheet: a 3 by 3 grid on
one wide picture, which `tools/cards.py` cuts into `assets/paint/cards/<card>.webp`. The tool holds
the list (`SHEETS`: each card's name and what to paint) and writes the messages from it, so the
order of the paintings and the names can't drift apart:

```bash
python3 tools/cards.py --prompts                          # the ten messages, one per sheet
python3 tools/cards.py art/cards --sheet art/cards.png    # cut the sheets, write src/data/cardart.js
```

Send the messages in the same chat as the places, in order, and save each sheet as
`art/cards/cards01.png` ... `cards10.png`. Look at every cell before going on: Gemini sometimes
paints the wrong metal (the first silver came out gold) or carves letters into a rune stone (the
first wording, "rune-carved", asked for it). "Keep this sheet exactly as it is, but repaint the
second one..." fixes a cell or two without touching the rest. When an earlier version of a sheet had
one picture right, save it as `cards01 only-runite_ore.png`: the tool takes just that card from it.
Gemini sets the paintings in little frames or on paper with borders; the tool finds the grid's lines
and trims each cell, so either way works.

Once Chrome started dropping the full-size downloads (Gemini said "Image downloaded", nothing
arrived). The full-size picture still reaches the page: wrapping `window.fetch` to keep any image
response over 500 KB catches it when the download button is pressed. Drawn into a canvas a quarter at
a time (1376 x 768) at half its size in CSS pixels, each quarter is saved at full detail with a zoomed
screenshot (`save_to_disk`, scale 1); four quarters stitch back into the 2752 x 1536 sheet.

The map's pins are placed by eye: `ZONE_PINS` in `src/ui/worldmap.js` holds each zone's spot in
percent of the picture's width and height. A new map painting needs new numbers there: open the
map in the game (`?dev=1`, then the Map button on the Combat tab) and move each pin beside its
landmark, not on top of it.

## For Claude, working through Chrome

- Open a new tab at gemini.google.com and use one chat for the whole set, in the order above.
- Look at each picture before moving on. Ask again if it shows a character, an animal or text, if
  the middle of the ground is cluttered, or if it isn't wide.
- Save each picture with Gemini's download button (full size). It lands in the browser's Downloads
  folder as `Gemini_Generated_Image_<id>`, up to a minute after the click, so wait for the file
  instead of clicking again. Move the newest one to `art/gemini/<place>.png` (or `.jpeg`; the
  importer reads both). The page shifts while a picture loads: press the button by its label
  ("Download full size image", the last one on the page) rather than by where it was on screen.
- Look at a corner of the first download. A full-size download from a paid account carries no
  sparkle mark; then import with `--trim 0`, as the first set was (1920 × 1072).
- Chrome can hold a download unfinished (as a hidden `.com.google.Chrome.*` file in Downloads,
  waiting on its download bar). The image inside is complete once it opens as a 2752 × 1536 JPEG:
  copy it to `art/gemini/` and discard the download in Chrome later.
- Once a full-size download never arrived at all, though Gemini said "Image downloaded" (the war
  table). The picture shown in the chat is a 1024 px blob: drawn into a canvas, shown at its natural
  size in an overlay at the top left of the page, and saved with a zoomed screenshot
  (`save_to_disk`) it comes out at 1456 px, plenty for a panel. Remove the overlay afterwards.
- To add to the set later, continue the same chat ("Sunlit Meadow Background Generation"), so the
  style holds.
- When the set is done, run the import with `--sheet art/sheet.png`. Look at the sheet, then check
  the battle scene and a few skill tabs in the game at desktop and phone widths.
- Add the credits line. Then create a branch `art-inbox` from where you are, commit
  `assets/paint/*.webp`, `style.css` and `assets/CREDITS.md` on it (never the PNGs in `art/`), and
  push it with `git push -u origin art-inbox`. Leave `claude/intelligent-einstein-y5i5iq` alone;
  the paintings get merged from `art-inbox`. (When the session painting is also the one working on
  the game, as `CLAUDE.md` describes, commit them on the working branch with the code that uses them.)
- `tools/paint.py` needs Pillow: `pip install pillow` (or `python -m pip install pillow` on
  Windows) if the import says it is missing.
- If Gemini asks you to sign in, refuses a prompt, or the download button does nothing twice in a
  row, stop and ask instead of working around it.

## Credits

Add this to `assets/CREDITS.md` once paintings are in:

> `paint/*.webp` are AI-generated with Google Gemini from the prompts in `docs/art/gemini.md`,
> then trimmed and scaled by `tools/paint.py`.

## How the game uses them

`tools/paint.py` prepares each picture:

- It cuts off the bottom 7%, where Gemini puts its sparkle mark (`--trim 0` keeps everything).
- It scales the picture to at most 1920 px wide (the world map to 1400).
- It writes `assets/paint/<place>.webp`.
- It rewrites the paint block at the end of `style.css`. Rerun it with `--css` after deleting a
  painting.

Where each picture shows:

- **Battle:** the ten zones, the dungeons (the hall, the caves and the volcano) and the Titan.
- **Skill stages:**

  | Skill | Place |
  |---|---|
  | Mining | caves |
  | Woodcutting | forest |
  | Fishing | river |
  | Hunting | meadow |
  | Cooking, Firemaking | camp |
  | Alchemy | lab, or the abyss if there is no lab painting |
  | Smithing | forge, or the volcano if there is no forge painting |
  | Crafting | workshop |

In the game:

- A painting replaces the place's three scripted layers and drifts slowly.
- The particles, the vignette, the danger glow and the Highlands' lightning stay.
- The fighters stand on the bottom band. Each place has a vertical focus in `FOCUS` in
  `tools/paint.py` that sets which band shows. Lower it if a painting's ground sits higher up.
