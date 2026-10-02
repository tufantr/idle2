#!/usr/bin/env python3
"""Pack the game's sprites into one atlas from the Dungeon Crawl Stone Soup tile set (CC0).

    python3 tools/atlas.py /path/to/crawl/crawl-ref/source/rltiles

Writes assets/sprites.png (a grid of 32x32 cells) and src/data/sprites.js (which cell is which).
The mapping below is the art direction: which DCSS tile stands for each monster, each equipment
type and tier, each hero layer and each skill's tool. Tiles larger than a cell are scaled down;
layered monsters (the draconians) are flattened here, so the game only ever draws one cell.
The resources' icons (ores, bars, logs, fish, food, herbs, potions, gems) come from
tools/resource_art.py, which recolors DCSS tiles or draws them in the same manner.
"""
import hashlib
import json
import os
import sys

from PIL import Image

from resource_art import build as build_resources

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
UNIQUES = { 'goblin_crown': 'armour/headgear/helmet_art2', 'crystal_heart': 'amulet/fluorescent', 'warlord_cleaver': 'weapon/executioner_axe1', 'dragonheart_plate': 'armour/fire_dragon_armour' }
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
    'shield': ['hand2/buckler_round', 'hand2/buckler_round2', 'hand2/kite_shield_knight_gray', 'hand2/kite_shield_knight_blue', 'hand2/kite_shield_kite1', 'hand2/tower_shield_gold', 'hand2/tower_shield_green'],
    'tool': { 'mining': 'hand1/pick_axe', 'woodcutting': 'hand1/hand_axe', 'fishing': 'hand1/quarterstaff', 'hunting': 'hand1/bow', 'smithing': 'hand1/hammer', 'alchemy': 'hand1/staff_mage', 'firemaking': 'hand1/club', 'cooking': 'hand1/club_slant' },
}


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
    for rid, img in build_resources(rltiles).items():
        add(f'res/{rid}', img)
    for layer, value in HERO.items():
        if isinstance(value, str):
            add(f'hero/{layer}', f'player/{value}')
        elif isinstance(value, list):
            for tier, tile in enumerate(value, 1):
                add(f'hero/{layer}/{tier}', f'player/{tile}')
        else:
            for sub, tile in value.items():
                add(f'hero/{layer}/{sub}', f'player/{tile}')

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
        '// uniq/<uniqueId>, hero/<layer>[/<tier or kind>], gold, res/<resource id>. See assets/CREDITS.md.\n\n'
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
