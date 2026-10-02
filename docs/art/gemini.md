# Painting the backdrops with Gemini

The battle scene and the skill stages show one backdrop per place. Today a script paints them
(`tools/backdrops.py`). This page swaps them for real paintings made with Gemini: one wide picture
per place, 17 in all. A place you skip keeps its scripted backdrop, so a few at a time is fine.

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

## For Claude, working through Chrome

- Open a new tab at gemini.google.com and use one chat for the whole set, in the order above.
- Look at each picture before moving on. Ask again if it shows a character, an animal or text, if
  the middle of the ground is cluttered, or if it isn't wide.
- Save each picture with Gemini's download button (full size). It lands in the browser's Downloads
  folder. Move the newest download to `art/gemini/<place>.png`.
- When the set is done, run the import with `--sheet art/sheet.png`. Look at the sheet, then check
  the battle scene and a few skill tabs in the game at desktop and phone widths.
- Add the credits line. Then create a branch `art-inbox` from where you are, commit
  `assets/paint/*.webp`, `style.css` and `assets/CREDITS.md` on it (never the PNGs in `art/`), and
  push it with `git push -u origin art-inbox`. Leave `claude/intelligent-einstein-y5i5iq` alone;
  the paintings get merged from `art-inbox`.
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
- It scales the picture to at most 1920 px wide.
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
