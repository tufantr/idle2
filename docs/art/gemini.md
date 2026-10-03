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
