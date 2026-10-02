#!/usr/bin/env python3
"""Puts painted backdrops into the game: one picture per place, made with Gemini (see
docs/art/gemini.md) or any paint program.

    python3 tools/paint.py art/gemini                    # import every <place>.png/.jpg/.webp in the folder
    python3 tools/paint.py art/gemini --sheet sheet.png  # ... and write a contact sheet to look over
    python3 tools/paint.py --css                         # only rewrite the CSS for what is in assets/paint

Each picture loses the bottom 7% (where Gemini puts its sparkle mark; --trim 0 keeps it all), is
scaled to at most 1920 px wide and saved as assets/paint/<place>.webp. Then the block between the
paint markers in style.css is written again, so the battle scene and the skill stages show the
paintings instead of the layers from tools/backdrops.py. A place without a painting keeps those.

A file counts for a place when its name holds the place's name as a word: meadow.png,
02-forest.jpg and Forest final.webp all do. Needs Pillow (pip install pillow).
"""

import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'paint'
CSS = ROOT / 'style.css'
BEGIN = '/* paint:begin'
END = '/* paint:end */'

# Where each place shows. Battle places are the scene's data-scene values (zones, dungeons, the
# titan); the skill stages take the first place in their list that has a painting.
BATTLE = ['meadow', 'forest', 'caves', 'marsh', 'highland', 'ruins', 'volcano', 'frost', 'skyreach', 'abyss', 'dungeon', 'titan']
STAGES = {
    'mining': ['caves'], 'woodcutting': ['forest'], 'fishing': ['river'], 'hunting': ['meadow'],
    'cooking': ['camp'], 'firemaking': ['camp'], 'alchemy': ['lab', 'abyss'], 'smithing': ['forge', 'volcano'],
    'crafting': ['workshop'],
}
PLACES = BATTLE + ['river', 'camp', 'workshop', 'forge', 'lab']
LIGHTNING = {'highland', 'titan'}  # their sky keeps the lightning flicker under the slow drift
# How far down the painting the visible band sits (CSS background-position y). The ground the
# fighters stand on is the bottom quarter of each picture, so the band leans low.
FOCUS = {'skyreach': 72, 'frost': 76}
DEFAULT_FOCUS = 80
MAX_W = 1920


def place_of(path):
    words = set(re.split(r'[^a-z]+', path.stem.lower()))
    hits = [p for p in PLACES if p in words]
    return hits[0] if len(hits) == 1 else None


def import_one(src, place, trim):
    img = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    w, h = img.size
    if trim:
        img = img.crop((0, 0, w, round(h * (1 - trim))))
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f'{place}.webp'
    img.save(dest, 'WEBP', quality=82, method=6)
    note = '' if w / h >= 1.5 else '  (not wide: ask Gemini for 16:9, or it will show as a thin slice)'
    print(f'{src.name} -> {dest.relative_to(ROOT)}  {img.width}x{img.height}, {dest.stat().st_size // 1024} KB{note}')
    return img


def css_block(painted):
    """The CSS for the places that have a painting, in a stable order."""
    lines = [f'{BEGIN}: written by tools/paint.py from assets/paint/; run it again instead of editing here. */']
    battle = [p for p in BATTLE if p in painted]
    stages = {skill: next((p for p in places if p in painted), None) for skill, places in STAGES.items()}
    stages = {skill: p for skill, p in stages.items() if p}
    if battle or stages:
        lines.append('@keyframes paintDrift { from { transform: scale(1.06) translateX(-1.3%); } to { transform: scale(1.06) translateX(1.3%); } }')
    if battle:
        anyof = ', '.join(f'[data-scene="{p}"]' for p in battle)
        lines += [
            f'.battle:is({anyof}) .battle-sky {{ background-position: center {DEFAULT_FOCUS}%; transform-origin: 50% 80%; animation: paintDrift 46s ease-in-out infinite alternate; }}',
            f'.battle:is({anyof}) .battle-far, .battle:is({anyof}) .battle-near {{ display: none; }}',
            f'.battle:is({anyof})::before {{ background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.3)); box-shadow: none; }}',
        ]
        for p in battle:
            extra = f' background-position: center {FOCUS[p]}%;' if p in FOCUS else ''
            if p in LIGHTNING:
                extra += ' animation: lightning 9s linear infinite, paintDrift 46s ease-in-out infinite alternate;'
            lines.append(f'.battle[data-scene="{p}"] .battle-sky {{ background-image: url(assets/paint/{p}.webp);{extra} }}')
    if stages:
        anyof = ', '.join(f'[data-skill="{s}"]' for s in stages)
        lines += [
            f'.stage:is({anyof}) .stage-sky {{ background-position: center {DEFAULT_FOCUS}%; transform-origin: 50% 80%; animation: paintDrift 50s ease-in-out infinite alternate; }}',
            f'.stage:is({anyof}) .stage-far {{ display: none; }}',
            f'.stage:is({anyof}) .stage-ground {{ background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.3)); box-shadow: none; }}',
        ]
        for skill, p in stages.items():
            extra = f' background-position: center {FOCUS[p]}%;' if p in FOCUS else ''
            lines.append(f'.stage[data-skill="{skill}"] .stage-sky {{ background-image: url(assets/paint/{p}.webp);{extra} }}')
    lines.append(END)
    return '\n'.join(lines)


def write_css():
    painted = {p.stem for p in OUT.glob('*.webp') if p.stem in PLACES} if OUT.exists() else set()
    text = CSS.read_text()
    start, end = text.find(BEGIN), text.find(END)
    if start < 0 or end < start:
        sys.exit(f'style.css has no paint markers ({BEGIN} ... {END})')
    CSS.write_text(text[:start] + css_block(painted) + text[end + len(END):])
    print(f'style.css: {len(painted)} painted place(s){": " + ", ".join(sorted(painted)) if painted else ""}')


def contact_sheet(images, path):
    tw, th, pad = 480, 270, 10
    cols = 3
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + 26 + pad) + pad), '#14100c')
    d = ImageDraw.Draw(sheet)
    for i, (place, img) in enumerate(images):
        x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + 26 + pad)
        sheet.paste(ImageOps.fit(img, (tw, th), Image.LANCZOS), (x, y + 26))
        d.text((x + 2, y + 6), place, fill='#f3dfb2')
    sheet.save(path)
    print(f'contact sheet -> {path}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('folder', nargs='?', help='folder with the paintings')
    ap.add_argument('--trim', type=float, default=0.07, help='share of the height to cut off the bottom (default 0.07)')
    ap.add_argument('--sheet', help='also write a contact sheet of the imported paintings here')
    ap.add_argument('--css', action='store_true', help='only rewrite the CSS block')
    args = ap.parse_args()
    if not args.css:
        if not args.folder:
            ap.error('give the folder with the paintings, or --css')
        found, done = {}, []
        for f in sorted(Path(args.folder).iterdir()):
            if f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
                continue
            place = place_of(f)
            if not place:
                print(f'skipped {f.name}: name it after one place ({", ".join(PLACES)})')
            elif place in found:
                print(f'skipped {f.name}: {found[place].name} is already the {place}')
            else:
                found[place] = f
        for place, f in found.items():
            done.append((place, import_one(f, place, args.trim)))
        missing = [p for p in PLACES if p not in found and not (OUT / f'{p}.webp').exists()]
        if missing:
            print(f'still procedural: {", ".join(missing)}')
        if args.sheet and done:
            contact_sheet(done, args.sheet)
    write_css()


if __name__ == '__main__':
    main()
