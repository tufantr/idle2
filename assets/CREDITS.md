# Art credits

`sprites.png` is packed by `tools/atlas.py` from the tile set of **Dungeon Crawl Stone Soup**
(https://github.com/crawl/crawl, `crawl-ref/source/rltiles`), whose tiles and artwork are released
under the **CC0 1.0 Universal** public-domain dedication (see the project's LICENSE: "Public
Domain|CC0: most of tiles"; details at https://github.com/crawl/tiles). Some of those tiles derive
from the public-domain **RLTiles** set (http://rltiles.sf.net).

The mapping from this game's monsters, equipment and hero layers to DCSS tiles is in
`tools/atlas.py`. The draconian "dragonkin" are flattened from a DCSS base and job layer.

The resource icons in the same sheet come from `tools/resource_art.py`. Gems, potions, meat, fruit,
herbs and the bait worm are DCSS tiles (CC0, as above), several recolored per tier. Ores, bars,
logs, fish, shrimp, lobster, bowls and the crops are drawn pixel by pixel by that script, in the
tiles' manner, and are original to this project. The pets are DCSS creatures (one, the fish, is the
drawn trout), and the farm plot's mound and sprout are drawn by the same script.

`backdrops/*.webp` are painted by `tools/backdrops.py` from noise, gradients and glow; the interiors
(caves, volcano, frost, abyss, dungeon, workshop) also tile DCSS floor and wall tiles (CC0, as above).

`paint/*.webp` are AI-generated with Google Gemini from the prompts in `docs/art/gemini.md`,
then scaled by `tools/paint.py`.

Everything else in the interface (scenery drawn in CSS, icons) is original to this project.
