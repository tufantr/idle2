#!/usr/bin/env python3
"""Pack the game's sprites into one atlas from the Dungeon Crawl Stone Soup tile set (CC0).

    python3 tools/atlas.py /path/to/crawl/crawl-ref/source/rltiles

Writes assets/sprites.png (a grid of 32x32 cells) and src/data/sprites.js (which cell is which).
The mapping below is the art direction: which DCSS tile stands for each monster, each equipment
type and tier, each hero layer and each skill's tool. Tiles larger than a cell are scaled down;
layered monsters (the draconians) are flattened here, so the game only ever draws one cell.
The resources' icons (ores, bars, logs, fish, food, herbs, potions, gems) come from
tools/resource_art.py, which recolors DCSS tiles or draws them in the same manner; so do the perk
badges, the tools, the daily crate, the settings gear and the hero's hoe (build_icons).
"""
import hashlib
import json
import os
import re
import sys

from PIL import Image

from resource_art import build as build_resources, build_extras, build_icons, build_capes, build_late, build_festival_cloaks, build_voidstone

CELL = 32
COLS = 16

# ---------- monsters: the game's monster name -> DCSS tile (relative to rltiles/mon/) ----------
MONSTERS = {
    # Sunlit Meadow
    'Slime': 'amorphous/aspiring_flesh', 'Rat': 'animals/rat', 'Rabbit Bandit': 'animals/quokka',
    'Goblin Scout': 'humanoids/goblin', 'Goblin Chieftain': 'humanoids/hobgoblin',
    # Whispering Forest
    'Wolf': 'animals/wolf', 'Spider': 'animals/jumping_spider', 'Bandit': 'humanoids/humans/human2',
    'Wisp': 'nonliving/will_o_the_wisp', 'Elder Treant': 'fungi_plants/treant',
    # Glimmering Caves
    'Bat': 'animals/bat', 'Skeleton': 'undead/skeletal_warrior', 'Cave Crawler': 'animals/steelbarb_worm',
    'Kobold Miner': 'humanoids/kobold_blastminer', 'Crystal Golem': 'nonliving/crystal_guardian',
    # Fever Marsh
    'Leech': 'animals/tyrant_leech', 'Bog Witch': 'demihumanoids/fenstrider_witch', 'Toad Warrior': 'animals/cane_toad',
    'Ghoul': 'undead/ghoul', 'Marsh Hydra': 'dragons/hydra5',
    # Stormy Highlands
    'Harpy': 'demihumanoids/harpy', 'Orc Raider': 'humanoids/orcs/orc_warrior', 'Mountain Troll': 'humanoids/troll',
    'Griffin': 'animals/hippogriff', 'Orc Warlord': 'humanoids/orcs/orc_warlord',
    # Drowned Ruins
    'Sea Wraith': 'undead/wraith', 'Cursed Knight': 'humanoids/humans/death_knight', 'Siren': 'demihumanoids/merfolk/merfolk_siren',
    'Kraken Spawn': 'aquatic/kraken_head', 'Lich of the Deep': 'undead/lich',
    # Ember Volcano
    'Magma Slime': 'nonliving/fire_vortex1', 'Fire Imp': 'demons/crimson_imp', 'Salamander': 'demihumanoids/salamander',
    'Ash Golem': 'nonliving/blazeheart_golem', 'Ember Drake': 'dragons/fire_dragon',
    # Frozen Wastes
    'Ice Wolf': 'animals/warg', 'Yeti': 'animals/ice_beast', 'Frost Wraith': 'undead/freezing_wraith',
    'Mammoth': 'animals/elephant_dire', 'Ice Titan': 'humanoids/giants/frost_giant',
    # Skyreach Spire
    'Cloud Serpent': 'animals/shock_serpent', 'Storm Elemental': 'nonliving/air_elemental', 'Wyvern': 'dragons/wyvern',
    'Sky Knight': 'humanoids/humans/vault_guard', 'Thunder Roc': 'animals/bennu',
    # The Abyss
    'Void Stalker': 'abyss/lurking_horror', 'Demon': 'demons/red_devil', 'Nightmare': 'demons/shadow_demon',
    'Abyssal Knight': 'humanoids/humans/hell_knight', 'Abyss Warlord': 'demons/brimstone_fiend',
    # Goblin Warren
    'Goblin Sneak': 'humanoids/goblin', 'Goblin Brute': 'humanoids/hobgoblin', 'Goblin Archer': 'humanoids/goblin_rider_good_spear',
    'Goblin Shaman': 'humanoids/gnoll_shaman', 'Goblin Guard': 'humanoids/hobgoblin', 'Goblin King': 'unique/ijyb',
    # Crystal Depths
    'Shard Bat': 'vault/phase_bat', 'Crystal Crawler': 'animals/crystal_echidna', 'Gem Golem': 'nonliving/crystal_guardian',
    'Prism Wisp': 'nonliving/fulminant_prism1', 'Crystal Knight': 'nonliving/ancestor_knight', 'Crystal Wyrm': 'dragons/quicksilver_dragon',
    # Orc Stronghold
    'Orc Grunt': 'humanoids/orcs/orc', 'Orc Archer': 'humanoids/orcs/orc_warrior', 'Warg Rider': 'animals/warg',
    'Orc Shaman': 'humanoids/orcs/orc_priest', 'Troll Bruiser': 'humanoids/iron_troll', 'Orc Champion': 'humanoids/orcs/orc_knight',
    'Orc Overlord': 'unique/saint_roka',
    # Dragon's Lair (the dragonkin are a draconian base with a job overlay)
    'Drake Whelp': 'dragons/swamp_drake', 'Kobold Zealot': 'humanoids/kobold_demonologist', 'Fire Drake': 'dragons/lindwurm',
    'Dragonkin Mage': ['draco/draco-base-red', 'draco/draco-job-scorcher'],
    'Dragonkin Knight': ['draco/draco-base-red', 'draco/draco-job-knight'],
    'Dragon Priest': ['draco/draco-base-yellow', 'draco/draco-job-stormcaller'],
    'Elder Dragon': 'dragons/golden_dragon',
    # Void Citadel
    'Void Acolyte': 'abyss/abyssal_acolyte', 'Starcursed Mass': 'abyss/starcursed_mass', 'Rift Crab': 'abyss/apocalypse_crab',
    'Wretched Star': 'abyss/wretched_star', 'Soul Reaper': 'demons/reaper', 'Tormentor': 'demons/tormentor',
    'Citadel Sentinel': 'demons/hell_sentinel', 'Soul Eater': 'demons/soul_eater', 'Void King': 'abyss/herald_of_the_abyss',
}
# The Titan's five faces, by level (cycling).
TITANS = ['humanoids/giants/stone_giant', 'humanoids/giants/fire_giant', 'humanoids/giants/frost_giant', 'humanoids/giants/iron_giant', 'humanoids/giants/titan']

# ---------- equipment icons: type -> tiles for tiers 1..7 (relative to rltiles/item/) ----------
ITEMS = {
    'Weapon': ['weapon/short_sword1', 'weapon/long_sword1', 'weapon/long_sword2', 'weapon/scimitar2', 'weapon/greatsword2', 'weapon/double_sword2', 'weapon/demon_blade2'],
    'Shield': ['armour/shields/buckler1', 'armour/shields/buckler2', 'armour/shields/kite_shield1', 'armour/shields/kite_shield2', 'armour/shields/kite_shield3', 'armour/shields/tower_shield1', 'armour/shields/tower_shield3'],
    'Head': ['armour/headgear/helmet1', 'armour/headgear/helmet2', 'armour/headgear/helmet3', 'armour/headgear/helmet4', 'armour/headgear/helmet5', 'armour/headgear/helmet_art1', 'armour/headgear/helmet_ego3'],
    'Body': ['armour/leather_armour1', 'armour/ring_mail1', 'armour/scale_mail1', 'armour/chain_mail1', 'armour/plate1', 'armour/golden_dragon_armour', 'armour/shadow_dragon_armour'],
    'Legs': ['armour/barding1', 'armour/barding1', 'armour/barding2', 'armour/barding2', 'armour/barding3', 'armour/barding3', 'armour/barding3'],
    'Boots': ['armour/boots1', 'armour/boots2', 'armour/boots_ego1', 'armour/boots_ego2', 'armour/boots_art1', 'armour/boots_art2', 'armour/boots_art2'],
    'Gloves': ['armour/glove1', 'armour/glove2', 'armour/glove3', 'armour/glove4', 'armour/glove5', 'armour/glove5', 'armour/glove4'],
    'Ring': ['ring/tourmaline', 'ring/tiger_eye', 'ring/gold_blue', 'ring/emerald', 'ring/ruby', 'ring/diamond', 'ring/opal'],
    'Neck': ['amulet/amethyst', 'amulet/citrine', 'amulet/sapphire', 'amulet/emerald', 'amulet/ruby', 'amulet/diamond', 'amulet/zirconium'],
    'Ear': ['ring/pearl', 'ring/coral', 'ring/moonstone', 'ring/jade', 'ring/agate', 'ring/silver', 'ring/gold'],
}
# ---------- pets: pet id -> DCSS tile (relative to rltiles/mon/), or res:<id> for a resource icon ----------
PETS = {
    'pebble': 'animals/boulder_beetle', 'twig': 'fungi_plants/oklob_sapling', 'scout': 'animals/jackal',
    'crumb': 'animals/quokka', 'bubbles': 'animals/blink_frog', 'ember': 'animals/frilled_lizard',
    'glimmer': 'animals/sun_moth', 'fang': 'animals/hound', 'finn': 'res:raw_trout',
    'cinder': 'animals/crystal_echidna', 'sprout': 'animals/torpor_snail', 'hopper': 'animals/bullfrog',
}
UNIQUES = { 'goblin_crown': 'armour/headgear/helmet_art2', 'crystal_heart': 'amulet/fluorescent', 'warlord_cleaver': 'weapon/executioner_axe1', 'dragonheart_plate': 'armour/fire_dragon_armour',
            'void_aegis': 'armour/shields/tower_shield_dd_dk' }
# Added after the first release, and packed after every other cell so the earlier ones keep their place:
# the Abyssal Maw's monsters (src/data/dungeons.js) and its unique.
LATE_MONSTERS = {
    'Starspawn': 'abyss/tentacled_starspawn', 'Thrashing Horror': 'abyss/thrashing_horror', 'Ancient Zyme': 'abyss/ancient_zyme',
    'Executioner': 'demons/executioner', 'Green Death': 'demons/green_death', 'Worldbinder': 'abyss/worldbinder',
    'Star Skull': 'demons/tzitzimitl', 'Devourer': 'unique/mnoleg',
}
LATE_UNIQUES = { 'starless_band': 'ring/randarts/dark' }
# The Abyss's strata (src/data/strata.js), packed after everything else so the cells before keep their place.
STRATA_MONSTERS = {
    # The Weeping Dark
    'Weeping Skull': 'undead/weeping_skull', 'Lost Soul': 'undead/lost_soul', 'Drowned Soul': 'undead/drowned_soul',
    'Flayed Ghost': 'undead/flayed_ghost', 'Dread Lich': 'undead/dread_lich',
    # The Bone Reaches
    'Curse Skull': 'undead/curse_skull', 'Revenant': 'undead/revenant', 'Wight': 'undead/wight',
    'Ancient Champion': 'undead/ancient_champion', 'Bone Dragon': 'undead/bone_dragon',
    # The Ember Pits
    'Hell Hound': 'animals/hell_hound', 'Hell Hog': 'animals/hell_hog', 'Sun Demon': 'demons/sun_demon',
    'Smoke Demon': 'demons/smoke_demon', 'Flame Tyrant': 'demons/balrug',
    # The Frozen Void
    'Frost Imp': 'demons/white_imp', 'Rime Drake': 'dragons/rime_drake', 'Shard Shrike': 'animals/shard_shrike',
    'Frostbound Tome': 'nonliving/frostbound_tome', 'Ice Dragon': 'dragons/ice_dragon',
    # The Writhing Maze
    'Twisted Spawn': 'aberrations/ugly_thing', 'Flesh Cage': 'aberrations/crawling_flesh_cage0', 'Unseen Horror': 'aberrations/unseen_horror',
    'Nameless Horror': 'aberrations/nameless_horror', 'Tentacled Monstrosity': 'aberrations/tentacled_monstrosity',
    # The Shadow Court
    'Shadow Imp': 'demons/shadow_imp', 'Shadow Puppet': 'nonliving/shadow_puppet', 'Vampire Knight': 'undead/vampire_knight',
    'Vampire Mage': 'undead/vampire_mage', 'Blood Prince': 'undead/vampire_bloodprince',
    # The Storm Wastes
    'Ball Lightning': 'nonliving/ball_lightning', 'Spark Wasp': 'animals/spark_wasp', 'Sky Beast': 'animals/sky_beast',
    'Twister': 'nonliving/twister1', 'Storm Dragon': 'dragons/storm_dragon',
    # The Starless Sea
    'Electric Eel': 'aquatic/electric_eel', 'Abyssal Jellyfish': 'aquatic/jellyfish', 'Sludgefish': 'aquatic/roaming_sludgefish0',
    'Marrowcuda': 'undead/marrowcuda', 'Abyssal Hydra': 'unique/lernaean_hydra09',
    # The Iron Halls
    'Iron Mechanist': 'humanoids/ironbound_mechanist', 'Thunderhulk': 'humanoids/ironbound_thunderhulk', 'War Gargoyle': 'nonliving/war_gargoyle',
    'Living Armour': 'undead/undying_armoury', 'Iron Dragon': 'dragons/iron_dragon',
    # The Hollow Throne
    'Ancient Lich': 'undead/ancient_lich', 'Eidolon': 'undead/eidolon', 'Bone Warlock': 'undead/halazid_warlock',
    'Tomb Crawler': 'undead/pharaoh_ant', 'Hollow King': 'undead/guardian_mummy',
    # The Burning Choir
    'Cinder Demon': 'demons/orange_demon', 'Shrieker Demon': 'demons/ufetubus', 'Chaos Spawn': 'demons/neqoxec',
    'Bell Demon': 'demons/ynoxinul', 'Choirmaster': 'demons/zykzyl',
    # The Glass Garden
    'Glass Eye': 'eyes/glass_eye', 'Golden Eye': 'eyes/golden_eye', 'Shining Eye': 'eyes/shining_eye',
    'Eye of Devastation': 'eyes/eye_of_devastation', 'Great Orb of Eyes': 'eyes/great_orb_of_eyes',
    # The Rotting Deep
    'Bloated Husk': 'undead/bloated_husk', 'Bog Body': 'undead/bog_body', 'Cursed Cob': 'undead/death_cob',
    'Death Scarab': 'undead/death_scarab', 'Stoker': 'undead/stoker',
    # The Spatial Rift
    'Spatial Vortex': 'nonliving/spatial_vortex1', 'Planar Tesseract': 'statues/planar_tesseract0', 'Orb of Entropy': 'nonliving/orb_of_entropy',
    'Globe of Annihilation': 'nonliving/globe_of_annihilation_dis1', 'Entropy Weaver': 'demihumanoids/entropy_weaver',
    # Pandemonium
    'Rust Devil': 'demons/rust_devil', 'Sin Beast': 'demons/sin_beast', 'Spark Demon': 'demons/sixfirhy',
    'Night Hag': 'demons/drude', 'Pandemonium Lord': 'panlord/pandemonium_lord',
}
# The two late dungeons (src/data/dungeons.js) and their uniques, packed after the strata.
LATE_DUNGEON_MONSTERS = {
    # Sunken Necropolis
    'Poltergeist': 'undead/poltergeist', 'Grave Hopper': 'undead/jiangshi', 'Marsh Ghast': 'undead/glowmurk_ghast',
    'Soul Wisp': 'undead/soul_wisp', 'Mind Gaunt': 'undead/cognitogaunt', 'Tomb Vampire': 'undead/vampire', 'Sunken King': 'unique/boris',
    # The Hellforge
    'Clockwork Bee': 'nonliving/clockwork_bee', 'Rusted Inspector': 'nonliving/rusted_inspector', 'Thermic Dynamo': 'nonliving/thermic_dynamo1',
    'Sawblade': 'statues/diamond_sawblade', 'Walking Alembic': 'nonliving/walking_alembic', 'Firespitter': 'statues/firespitter_statue',
    'Hellfire Mortar': 'statues/hellfire_mortar', 'Obsidian Colossus': 'statues/obsidian_statue',
}
LATE_DUNGEON_UNIQUES = { 'drowned_greaves': 'armour/artefact/urand_bk_barding', 'hellforged_gauntlets': 'armour/artefact/urand_power_gloves' }
GOLD = 'gold/16'

# ---------- the hero: paperdoll layers (relative to rltiles/player/), by equipment tier 1..7 ----------
HERO = {
    'base': 'base/human_m', 'hair': 'hair/short_brown', 'cloak': 'cloak/red',
    'body': ['body/leather_armour', 'body/ringmail', 'body/scalemail', 'body/chainmail', 'body/plate', 'body/dragonarm_golden', 'body/dragonarm_shadow'],
    'body_none': 'body/shirt_vest',
    'legs': ['legs/leg_armour00', 'legs/leg_armour01', 'legs/leg_armour02', 'legs/leg_armour03', 'legs/leg_armour04', 'legs/leg_armour05', 'legs/metal_gray'],
    'legs_none': 'legs/pants_brown',
    'boots': ['boots/middle_brown', 'boots/middle_brown2', 'boots/middle_gray', 'boots/mesh_black', 'boots/middle_gold', 'boots/middle_purple', 'boots/blue_gold'],
    'gloves': ['gloves/glove_brown', 'gloves/glove_gray', 'gloves/glove_black', 'gloves/gauntlet_blue', 'gloves/glove_gold', 'gloves/glove_purple', 'gloves/glove_red'],
    'head': ['head/cap_black1', 'head/chain', 'head/iron1', 'head/fhelm_gray3', 'head/helm_plume', 'head/full_gold', 'head/full_black'],
    'weapon': ['hand1/short_sword', 'hand1/long_sword_slant', 'hand1/broadsword', 'hand1/heavy_sword', 'hand1/great_sword', 'hand1/double_sword', 'hand1/demonblade'],
    'weapon_unique': { 'warlord_cleaver': 'hand1/axe_executioner' },
    # uniques worn show on him too (the Void King's Aegis is recoloured in resource_art.build_icons)
    'head_unique': { 'goblin_crown': 'head/crown_gold1' },
    'body_unique': { 'dragonheart_plate': 'body/dragonarm_red' },
    'shield': ['hand2/buckler_round', 'hand2/buckler_round2', 'hand2/kite_shield_knight_gray', 'hand2/kite_shield_knight_blue', 'hand2/kite_shield_kite1', 'hand2/tower_shield_gold', 'hand2/tower_shield_green'],
    'tool': { 'mining': 'hand1/pick_axe', 'woodcutting': 'hand1/hand_axe', 'fishing': 'hand1/quarterstaff', 'hunting': 'hand1/bow', 'smithing': 'hand1/hammer', 'alchemy': 'hand1/staff_mage', 'firemaking': 'hand1/club', 'cooking': 'hand1/club_slant' },
}


def hero_looks():
    """The hero's looks as (id, base, hair or ''), read from src/data/looks.js: one list for the game and the atlas."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(root, 'src', 'data', 'looks.js')) as f:
        text = f.read()
    return re.findall(r"\{ id: '(\w+)',\s*base: '(\w+)',\s*hair: (?:'(\w+)'|null)[^}]*\}", text)


def main(rltiles):
    cells = []        # list of (key, [image paths])
    index = {}

    def add(key, paths):
        if key in index:
            return
        if isinstance(paths, str):
            paths = [paths]
        elif isinstance(paths, Image.Image):
            paths = [paths]
        index[key] = len(cells)
        cells.append((key, paths))

    for name, tile in MONSTERS.items():
        add(f'mon/{name}', [f'mon/{t}' for t in (tile if isinstance(tile, list) else [tile])])
    for i, tile in enumerate(TITANS):
        add(f'titan/{i}', f'mon/{tile}')
    for typ, tiles in ITEMS.items():
        for tier, tile in enumerate(tiles, 1):
            add(f'item/{typ}/{tier}', f'item/{tile}')
    for uid, tile in UNIQUES.items():
        add(f'uniq/{uid}', f'item/{tile}')
    add('gold', f'item/{GOLD}')
    resources = build_resources(rltiles)
    for rid, img in resources.items():
        add(f'res/{rid}', img)
    for pid, tile in PETS.items():
        add(f'pet/{pid}', resources[tile[4:]] if tile.startswith('res:') else f'mon/{tile}')
    for key, img in build_extras(rltiles).items():
        add(key, img)
    for layer, value in HERO.items():
        if isinstance(value, str):
            add(f'hero/{layer}', f'player/{value}')
        elif isinstance(value, list):
            for tier, tile in enumerate(value, 1):
                add(f'hero/{layer}/{tier}', f'player/{tile}')
        else:
            for sub, tile in value.items():
                add(f'hero/{layer}/{sub}', f'player/{tile}')
    for key, img in build_icons(rltiles).items():   # perks, tools, obstacles, the crate, the gear, the campfire, the hero's hoe
        add(key, img)
    for look, base, hair in hero_looks():          # the hero's looks (src/data/looks.js): a body and a hairstyle each
        add(f'hero/look/{look}/base', f'player/base/{base}')
        if hair:
            add(f'hero/look/{look}/hair', f'player/hair/{hair}')
    for key, img in build_capes(rltiles).items():   # the skill capes (src/data/capes.js), last of all
        add(key, img)
    for name, tile in LATE_MONSTERS.items():
        add(f'mon/{name}', f'mon/{tile}')
    for uid, tile in LATE_UNIQUES.items():
        add(f'uniq/{uid}', f'item/{tile}')
    for key, img in build_late(rltiles).items():   # the guide's hand
        add(key, img)
    for name, tile in STRATA_MONSTERS.items():     # the Abyss's strata
        add(f'mon/{name}', f'mon/{tile}')
    for name, tile in LATE_DUNGEON_MONSTERS.items():   # the two late dungeons and their uniques, last of all
        add(f'mon/{name}', f'mon/{tile}')
    for uid, tile in LATE_DUNGEON_UNIQUES.items():
        add(f'uniq/{uid}', f'item/{tile}')
    for key, img in build_festival_cloaks(rltiles).items():   # the weekend events' festival cloaks
        add(key, img)
    for key, img in build_voidstone(rltiles).items():   # Crafting's deepest gem, last of all
        add(key, img)

    rows = (len(cells) + COLS - 1) // COLS
    atlas = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    oversized = []
    for n, (key, paths) in enumerate(cells):
        cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        for path in paths:
            if isinstance(path, Image.Image):   # an icon drawn by resource_art.py, already a cell
                cell = Image.alpha_composite(cell, path)
                continue
            file = os.path.join(rltiles, path + '.png')
            if not os.path.exists(file):
                sys.exit(f'missing tile for {key}: {file}')
            img = Image.open(file).convert('RGBA')
            if img.size != (CELL, CELL):
                oversized.append(f'{key} {img.size}')
                img.thumbnail((CELL, CELL), Image.LANCZOS)
            ox = (CELL - img.width) // 2
            oy = CELL - img.height  # stand on the cell's floor
            layer = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            layer.paste(img, (ox, oy), img)
            cell = Image.alpha_composite(cell, layer)
        atlas.paste(cell, ((n % COLS) * CELL, (n // COLS) * CELL))

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(os.path.join(root, 'assets'), exist_ok=True)
    atlas.save(os.path.join(root, 'assets', 'sprites.png'), optimize=True)

    grid = {key: [i % COLS, i // COLS] for key, i in index.items()}
    with open(os.path.join(root, 'assets', 'sprites.png'), 'rb') as f:
        version = hashlib.sha1(f.read()).hexdigest()[:10]   # busts caches when the layout changes
    entries = ',\n'.join(f'    {json.dumps(key, ensure_ascii=False)}: [{x}, {y}]' for key, (x, y) in grid.items())
    js = (
        '// Generated by tools/atlas.py from the Dungeon Crawl Stone Soup tiles (CC0): which 32x32 cell of\n'
        '// assets/sprites.png holds each sprite. Keys: mon/<monster name>, titan/<n>, item/<Type>/<tier>,\n'
        '// uniq/<uniqueId>, hero/<layer>[/<tier or kind>], gold, res/<resource id>, pet/<pet id>, farm/<stage>,\n'
        '// perk/<perk id>, tool/<tool id>, obstacle/<obstacle id>, crate, gear, campfire, crown, token,\n'
        '// hero/cloaks/<rank cloak>, hero/capes/<skill>.\n'
        '// See assets/CREDITS.md.\n\n'
        f'export const ATLAS = {{ url: \'assets/sprites.png?v={version}\', cell: {CELL}, cols: {COLS}, rows: {rows} }};\n\n'
        f'export const SPRITES = {{\n{entries}\n}};\n'
    )
    with open(os.path.join(root, 'src', 'data', 'sprites.js'), 'w') as f:
        f.write(js)
    print(f'{len(cells)} sprites -> assets/sprites.png ({COLS}x{rows} cells, {os.path.getsize(os.path.join(root, "assets", "sprites.png")) // 1024} KB)')
    if oversized:
        print('scaled to fit:', ', '.join(oversized))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
