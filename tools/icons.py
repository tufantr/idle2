#!/usr/bin/env python3
"""The game's icons: the hero in his plumed helm, drawn crisp from the sprite atlas, standing on the
painted meadow (the first place a player sees).

    python3 tools/icons.py

Writes assets/icons/: icon-32.png (the browser tab: the hero alone, at 1x), icon-180.png (an iPhone's
home screen), icon-192.png and icon-512.png (the install manifest) and maskable-512.png (Android's
round and squircle masks crop the edges, so the hero is smaller there). Run it again after
tools/atlas.py or tools/paint.py change the hero or the meadow. Needs Pillow.
"""
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons'
CELL = 32
TIER = 5   # the plumed helm, plate and a gold-and-black kite shield read best at every size
LAYERS = ['hero/cloak', 'hero/base', 'hero/boots/{t}', 'hero/legs/{t}', 'hero/body/{t}', 'hero/gloves/{t}',
          'hero/head/{t}', 'hero/weapon/{t}', 'hero/shield/{t}']


def hero():
    atlas = Image.open(ROOT / 'assets' / 'sprites.png').convert('RGBA')
    cells = {k: (int(x), int(y)) for k, x, y in re.findall(r'"([^"]+)": \[(\d+), (\d+)\]', (ROOT / 'src' / 'data' / 'sprites.js').read_text())}
    img = Image.new('RGBA', (CELL, CELL))
    for layer in LAYERS:
        x, y = cells[layer.format(t=TIER)]
        img.alpha_composite(atlas.crop((x * CELL, y * CELL, x * CELL + CELL, y * CELL + CELL)))
    return img


def meadow(size):
    """A square of the meadow painting: the trees, the road and the village roofs behind it."""
    paint = Image.open(ROOT / 'assets' / 'paint' / 'meadow.webp').convert('RGBA')
    w, h = paint.size
    left = (w - h) // 2 + 120
    square = paint.crop((left, 0, left + h, h)).resize((size, size), Image.LANCZOS)
    return Image.alpha_composite(square, Image.new('RGBA', (size, size), (10, 7, 4, 70)))


def icon(size, figure, k, feet):
    """The hero at `k` times his pixels, his feet at `feet` (a share of the height), with a shadow."""
    img = meadow(size)
    h = figure.resize((CELL * k, CELL * k), Image.NEAREST)
    x, y = (size - h.width) // 2, round(size * feet) - CELL * k
    shadow = Image.new('RGBA', (size, size))
    rx, ry = CELL * k * 0.3, CELL * k * 0.05
    ImageDraw.Draw(shadow).ellipse((size / 2 - rx, y + h.height - ry * 2.6, size / 2 + rx, y + h.height - ry * 0.6), fill=(0, 0, 0, 140))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(max(1, size // 64))))
    img.alpha_composite(h, (x, y))
    return img.convert('RGB')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    figure = hero()
    figure.save(OUT / 'icon-32.png')                       # the tab: the sprite itself, crisp
    for size in (180, 192, 512):
        icon(size, figure, max(1, int(size * 0.75) // CELL), 0.95).save(OUT / f'icon-{size}.png', optimize=True)
    icon(512, figure, 9, 0.80).save(OUT / 'maskable-512.png', optimize=True)   # inside the masks' safe circle
    print('icons ->', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))


if __name__ == '__main__':
    main()
