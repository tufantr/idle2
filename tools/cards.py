#!/usr/bin/env python3
"""A small painting on every action card: Gemini paints them nine to a sheet, this cuts them out.

    python3 tools/cards.py --prompts                    # the message to send Gemini for each sheet
    python3 tools/cards.py art/cards                    # cut every sheet in the folder into its pictures
    python3 tools/cards.py art/cards --sheet out.png    # ... and write a contact sheet to look over
    python3 tools/cards.py --list                       # only rewrite src/data/cardart.js

A sheet is one wide picture holding a 3 x 3 grid of small paintings. SHEETS below lists, for each
sheet, its nine cards in reading order: the card's name and what to paint. The same list writes the
prompts and names the cut-outs, so the two can't drift apart. A file counts for a sheet when its
name holds the sheet's name as a word (cards01.png, 'cards01 final.jpeg'). A file whose name also
says only-<card> gives just that card ('cards01 only-runite_ore.jpeg': an earlier painting of the
sheet that got one picture better); those are cut after the whole sheets, so they win.

Each cell is cut where the grid's dividing lines are (found by looking for the flattest band of
columns and rows near the thirds), trimmed a little and saved as assets/paint/cards/<name>.webp,
480 px wide. Then src/data/cardart.js is written again with the names that have a picture, so the
game only asks for pictures that exist (src/ui/render.js puts them across the top of the cards).
Needs Pillow and numpy.
"""

import argparse
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'paint' / 'cards'
LIST = ROOT / 'src' / 'data' / 'cardart.js'
WIDTH = 480   # a card is at most ~210 px wide, so this is enough for a 2x screen

# Card names: a skill's node id (mining, woodcutting, fishing, hunting, cooking, firemaking, alchemy),
# a smelting recipe's bar, forge_<type>, tool_<tool>, craft_<type>, a farm crop's produce; the last
# three of the workshop sheet stand in for any card that has no picture of its own.
SHEETS = [
    ('cards01', [  # the mine
        ('copper_ore', 'a rough cave rock wall streaked with bright orange copper ore, a pickaxe leaning against it'),
        ('iron_ore', 'a grey rock face with rusty red-brown lumps of iron ore, lit by a lantern'),
        ('coal', 'a seam of glossy black coal in a dark mine wall, a small mine cart beside it'),
        ('silver_ore', 'a cave wall with gleaming white silver veins catching torchlight'),
        ('mithril_ore', 'a deep cavern wall with softly glowing pale blue mithril veins'),
        ('gold_ore', 'a rock face glittering with gold veins and nuggets in warm light'),
        ('adamant_ore', 'a dark rock wall with deep green adamant crystals growing out of it'),
        ('runite_ore', 'a plain rough boulder with bright cyan runite veins glowing through it'),
        ('smithy', "a blacksmith's anvil and hammer beside a glowing forge"),
    ]),
    ('cards02', [  # the forest, and the first fires
        ('normal_log', 'a slender young tree in a sunny forest clearing, a few cut logs at its foot'),
        ('oak_log', 'a huge old oak tree in golden afternoon light'),
        ('willow_log', 'a weeping willow trailing its branches into a quiet pond'),
        ('maple_log', 'a maple tree blazing with red and orange autumn leaves'),
        ('yew_log', 'a dark, gnarled ancient yew tree in a misty glade'),
        ('magic_log', 'a magical tree with glowing violet leaves and floating sparkles at night'),
        ('burn_normal_log', 'a small campfire of plain logs in a ring of stones'),
        ('burn_oak_log', 'a steady fire of thick oak logs with a warm orange glow'),
        ('burn_willow_log', 'a crackling willow-log fire with tall dancing flames'),
    ]),
    ('cards03', [  # the great fires, and the water
        ('burn_maple_log', 'a roaring bonfire of red maple logs throwing sparks'),
        ('burn_yew_log', 'a great pyre of dark yew logs blazing at night'),
        ('burn_magic_log', 'a magical bonfire burning with violet and blue flames'),
        ('raw_shrimp', 'clear shallow water over sand with small pink shrimp and a hand net'),
        ('raw_trout', 'a sparkling mountain stream with a speckled trout leaping'),
        ('raw_salmon', 'a silver salmon leaping up a small rushing waterfall'),
        ('raw_lobster', 'a wicker lobster pot on wet rocks at low tide with a dark blue lobster beside it'),
        ('raw_swordfish', 'a swordfish leaping from bright blue open sea'),
        ('raw_shark', 'a grey shark fin cutting through deep blue waves'),
    ]),
    ('cards04', [  # the wild
        ('raw_leviathan', 'the huge coils of a deep blue sea serpent rising from a stormy sea'),
        ('raw_rabbit', 'a brown rabbit sitting in a sunny meadow of tall grass'),
        ('raw_fox', 'a red fox among golden autumn ferns at the forest edge'),
        ('raw_boar', 'a bristly wild boar in a muddy oak wood'),
        ('raw_deer', 'a red deer stag in a misty forest glade at dawn'),
        ('raw_bear', 'a big brown bear standing in a mountain river'),
        ('raw_drake', 'a small orange fire drake without wings on black volcanic rocks'),
        ('raw_dragon', 'a great purple-red dragon perched on a mountain peak with its wings spread'),
        ('guam_leaf', 'a bright green leafy guam herb growing between mossy rocks'),
    ]),
    ('cards05', [  # herbs and crops
        ('marrentill_leaf', 'a dry, curled brown marrentill herb on a windswept heath'),
        ('tarromin_leaf', 'a cluster of small blue-capped tarromin mushrooms on a mossy log'),
        ('harralander_leaf', 'a sacred lotus flower with golden petals floating on a pond'),
        ('potato', 'a field of leafy potato plants with freshly dug potatoes in the soil'),
        ('cabbage', 'rows of big round green cabbages in a garden bed'),
        ('pumpkin', 'a pumpkin patch with large orange pumpkins on curling vines'),
        ('starfruit', 'a small magical tree hung with glowing golden star-shaped fruit'),
        ('accuracy_potion', "a glass flask of glowing red potion bubbling over a small burner on an alchemist's table"),
        ('defense_potion', "a flask of glowing deep blue potion on an alchemist's table"),
    ]),
    ('cards06', [  # the last potions, and the bars
        ('evasion_potion', "a flask of glowing green potion on an alchemist's table"),
        ('health_potion', "a round bottle of glowing pink potion on an alchemist's table"),
        ('copper_bar', 'a furnace pouring molten copper into ingot moulds, copper ingots stacked beside it'),
        ('iron_bar', 'dark grey iron ingots cooling beside a glowing furnace'),
        ('silver_bar', "shiny silver ingots stacked on a smith's bench"),
        ('mithril_bar', 'pale blue mithril ingots glowing softly in a dim forge'),
        ('gold_bar', 'a stack of gold ingots gleaming in firelight'),
        ('adamant_bar', 'dark green adamant ingots on an anvil'),
        ('runite_bar', 'cyan runite ingots glowing faintly on a dark anvil'),
    ]),
    ('cards07', [  # the forge
        ('forge_Weapon', 'a sword blade glowing hot on an anvil, a hammer and flying sparks'),
        ('forge_Shield', 'a round metal shield on an anvil being hammered, sparks'),
        ('forge_Head', 'a steel helmet resting on an anvil'),
        ('forge_Body', 'a steel breastplate on a wooden armour stand in a forge'),
        ('forge_Legs', 'steel leg armour hanging on a forge wall'),
        ('forge_Boots', 'a pair of steel armoured boots on a workbench'),
        ('forge_Gloves', 'a pair of steel gauntlets on a workbench'),
        ('tool_pickaxe', 'a new iron pickaxe resting on a workbench'),
        ('tool_axe', "a woodcutter's axe stuck in a chopping block"),
    ]),
    ('cards08', [  # the workbenches
        ('tool_tinderbox', 'an open copper tinderbox with flint, steel and a small flame'),
        ('tool_hoe', 'a garden hoe leaning on a wooden fence beside tilled soil'),
        ('tool_bow', 'a new wooden longbow and a quiver of arrows on a workbench'),
        ('tool_rod', 'a fishing rod and a little tackle box on a wooden jetty'),
        ('craft_Ring', "a gold ring set with a red gem held in a jeweller's clamp"),
        ('craft_Neck', 'a gem pendant necklace laid out on dark velvet'),
        ('craft_Ear', 'a pair of gem earrings on a small velvet cushion'),
        ('jeweller', "a jeweller's workbench with a loupe, tweezers and loose gems"),
        ('kitchen', 'a cozy kitchen hearth with a bubbling pot'),
    ]),
    ('cards09', [  # the kitchen
        ('cooked_rabbit', 'golden roasted rabbit legs and pieces on a wooden plate with herbs and a few roast potatoes'),
        ('cooked_fox', 'a spiced meat roast turning on a spit over a campfire'),
        ('cooked_boar', 'sizzling sausages in an iron pan'),
        ('cooked_deer', 'strips of venison jerky drying on a rack'),
        ('cooked_bear', 'a thick bear steak with herbs on a wooden board'),
        ('cooked_drake', 'a fiery red drake steak sizzling on a hot iron skillet'),
        ('cooked_dragon', 'a magnificent dragon roast on a silver platter, glowing faintly'),
        ('cooked_shrimp', 'a bowl of cooked pink shrimp with lemon'),
        ('cooked_trout', 'a grilled trout on a wooden plank'),
    ]),
    ('cards10', [  # the kitchen, the feast
        ('cooked_salmon', 'a grilled salmon fillet with herbs'),
        ('cooked_lobster', 'a bright red cooked lobster on a plate'),
        ('cooked_swordfish', 'a thick grilled swordfish steak with grill marks'),
        ('cooked_shark', 'a large grilled shark steak on a platter'),
        ('cooked_leviathan', 'a huge steaming bowl of rich sea-serpent stew'),
        ('baked_potato', 'baked potatoes split open with butter, by the embers'),
        ('cabbage_soup', 'a steaming pot of green cabbage soup'),
        ('pumpkin_pie', 'an orange pumpkin pie cooling on a windowsill'),
        ('starfruit_tart', 'a golden tart topped with glowing star-shaped fruit slices'),
    ]),
]

FIRST = ("New set, same hand-painted storybook style as the places in this chat: small pictures for the "
         "game's action cards, nine at a time. Rules for this set: each picture is one sheet, wide 16:9, "
         "holding a 3 by 3 grid of nine separate small paintings of exactly the same size, separated by "
         "thin straight dark lines, each painting filling its own cell to the edges; in each painting the "
         "subject sits in the middle, close up and easy to read at a small size, against a soft background "
         "of its place, in warm light; no people, no text, no letters, no numbers, no labels, no frame "
         "around the sheet. First sheet, in reading order, left to right and top to bottom: ")
NEXT = ("Next sheet, same rules (a 3 by 3 grid of nine separate same-size paintings with thin dark lines "
        "between them, no text, and don't paint the list's numbers onto the paintings), in reading order: ")


def prompt(i, cards):
    return (FIRST if i == 0 else NEXT) + '; '.join(f'{n + 1}) {desc}' for n, (_, desc) in enumerate(cards)) + '.'


def dividers(profile, size):
    """The two dividing bands of a 3-way split along one axis: the flattest run of lines near each third."""
    cuts = []
    for third in (1 / 3, 2 / 3):
        lo, hi = int(size * (third - 0.06)), int(size * (third + 0.06))
        window = profile[lo:hi]
        best = np.argmin(window)
        floor = window[best]
        if floor > np.median(profile) * 0.35:    # nothing flat there: no visible line, cut at the third
            cuts.append((int(size * third), int(size * third)))
            continue
        a = b = best
        while a > 0 and window[a - 1] <= floor * 2 + 2:
            a -= 1
        while b < len(window) - 1 and window[b + 1] <= floor * 2 + 2:
            b += 1
        cuts.append((lo + a, lo + b + 1))
    return cuts


def margin(profile):
    """How many flat lines (a plain border round the sheet) there are at each end of a profile."""
    flat = profile < np.median(profile) * 0.35
    a = 0
    while a < len(flat) // 10 and flat[a]:
        a += 1
    b = len(flat)
    while b > len(flat) * 9 // 10 and flat[b - 1]:
        b -= 1
    return a, b


def cells(img, inset=(0.06, 0.075)):
    """The nine cells of a sheet as boxes, in reading order. Gemini sometimes sets each painting in a
    little frame on a plain ground: the plain ground is found and skipped, and `inset` (a share of the
    cell's width and height) trims the frame off."""
    g = np.asarray(img.convert('L'), float)
    h, w = g.shape
    px, py = g.std(axis=0), g.std(axis=1)        # a dividing line is the same all the way along
    xs, ys = dividers(px, w), dividers(py, h)
    (l, r), (t, b) = margin(px), margin(py)
    cols = [(l, xs[0][0]), (xs[0][1], xs[1][0]), (xs[1][1], r)]
    rows = [(t, ys[0][0]), (ys[0][1], ys[1][0]), (ys[1][1], b)]
    boxes = []
    for y0, y1 in rows:
        for x0, x1 in cols:
            ix, iy = round((x1 - x0) * inset[0]), round((y1 - y0) * inset[1])
            boxes.append((x0 + ix, y0 + iy, x1 - ix, y1 - iy))
    return boxes


def sheet_of(path):
    words = set(re.split(r'[^a-z0-9]+', path.stem.lower()))
    return next((name for name, _ in SHEETS if name in words), None)


def only_of(path):
    m = re.search(r'only-([a-z0-9_]+)', path.stem.lower())
    return m.group(1) if m else None


def write_list():
    names = sorted(p.stem for p in OUT.glob('*.webp')) if OUT.exists() else []
    body = ''.join(f"    '{n}',\n" for n in names)
    LIST.write_text(
        "// Generated by tools/cards.py: the action cards that have a picture of their own\n"
        "// (assets/paint/cards/<name>.webp, painted with Gemini nine to a sheet). Don't edit by hand.\n\n"
        f"export const CARD_ART = new Set([\n{body}]);\n")
    print(f'{LIST.relative_to(ROOT)}: {len(names)} card picture(s)')


def contact(pictures, path):
    tw, th, pad = 240, 134, 8
    cols = 9
    rows = (len(pictures) + cols - 1) // cols
    out = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + 22 + pad) + pad), '#14100c')
    d = ImageDraw.Draw(out)
    for i, (name, img) in enumerate(pictures):
        x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + 22 + pad)
        out.paste(img.resize((tw, th), Image.LANCZOS), (x, y + 18))
        d.text((x + 2, y + 3), name, fill='#f3dfb2')
    out.save(path)
    print(f'contact sheet -> {path}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('folder', nargs='?', help='folder with the painted sheets')
    ap.add_argument('--prompts', action='store_true', help='print the message for each sheet')
    ap.add_argument('--sheet', help='also write a contact sheet of the cut pictures here')
    ap.add_argument('--list', action='store_true', help='only rewrite src/data/cardart.js')
    args = ap.parse_args()
    if args.prompts:
        for i, (name, cards) in enumerate(SHEETS):
            print(f'{name}.png\n{prompt(i, cards)}\n')
        return
    if not args.list:
        if not args.folder:
            ap.error('give the folder with the sheets, or --prompts or --list')
        OUT.mkdir(parents=True, exist_ok=True)
        cards = dict(SHEETS)
        done = []
        files = [f for f in Path(args.folder).iterdir() if f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp')]
        for f in sorted(files, key=lambda f: (bool(only_of(f)), f.name)):   # whole sheets first
            name, only = sheet_of(f), only_of(f)
            if not name or (only and only not in [c for c, _ in cards[name]]):
                print(f'skipped {f.name}: name it after a sheet (cards01 ... cards{len(SHEETS):02d}), with only-<card> from it')
                continue
            img = Image.open(f).convert('RGB')
            cut = 0
            for (card, _), box in zip(cards[name], cells(img)):
                if only and card != only:
                    continue
                pic = img.crop(box)
                pic = pic.resize((WIDTH, round(pic.height * WIDTH / pic.width)), Image.LANCZOS)
                pic.save(OUT / f'{card}.webp', quality=82, method=6)
                done = [d for d in done if d[0] != card] + [(card, pic)]
                cut += 1
            print(f'{f.name} -> {cut} picture(s)')
        if args.sheet and done:
            contact(done, args.sheet)
    write_list()


if __name__ == '__main__':
    main()
