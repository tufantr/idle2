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

The perk badges are DCSS spell and god icons (CC0, as above: Sure Blade, Charming, Haste, Fedhas's
Grow Oklob, Zin's Recite, Cheibriados's Temporal Distortion) and DCSS items (a meat chunk, browned; a
gold pile; the Crown of Vainglory) set in a gold frame drawn by `tools/resource_art.py`. The axe, the
bow and the daily crate (the Box of Beasts) are DCSS items, the settings cog is cut from the Invent
Gizmo ability icon, and the hero's hoe keeps the haft of the DCSS scythe. The pickaxe, hoe, fishing
rod and tinderbox icons are drawn by the same script and are original to this project.

Of the agility obstacles, the rope swing (the DCSS bullwhip), the cargo net (the throwing net,
recolored), the gap leap (the Seven-League Boots), and the textures of the mud pit and the lava
crossing (DCSS floor tiles) come from DCSS; the other obstacles and the campfire are drawn by
`tools/resource_art.py` and are original to this project.

The small glyphs beside numbers (`icon/*`) are DCSS status icons (CC0, as above: the heart, Slowed's
hourglass, the new-stair star, Vengeance, Still Winds, Strong Willed, Sticky Flame, Dazed and
Sleeping) blown up at whole scales; the skull, the padlock, the die and the turning arrow are drawn
pixel by pixel in `tools/resource_art.py` and are original to this project.

`backdrops/*.webp` are painted by `tools/backdrops.py` from noise, gradients and glow; the interiors
(caves, volcano, frost, abyss, dungeon, workshop) also tile DCSS floor and wall tiles (CC0, as above).

`paint/*.webp` are AI-generated with Google Gemini from the prompts in `docs/art/gemini.md`,
then scaled by `tools/paint.py`: the seventeen backdrops, the five dungeons (warren, depths,
stronghold, lair, citadel), the pictures for cards and banners (market, shrine, hall, festival, clanhall,
farm, course; the farm and the course are also the Farming and Agility stages), the world map, and
the nine rooms behind the menus' panels (guild hall, armory, chest, storeroom, vault, library,
study, supply table, war table).

`paint/cards/*.webp`, the ninety pictures on the action cards, are AI-generated with Google Gemini
too, nine to a sheet from the prompts in `tools/cards.py`, and cut out and scaled by that script.

Everything else in the interface (scenery drawn in CSS, icons) is original to this project.
