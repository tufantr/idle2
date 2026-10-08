"""Pixel art for the game's 73 resources, one 32x32 cell each, packed by tools/atlas.py.

Where Dungeon Crawl Stone Soup has a fitting tile (CC0) it is used, often recolored: gems, potions,
meat, fruit and vegetables, herbs, the worm for bait. The rest (ores, bars, logs, fish, shrimp,
lobster, bowls, pies) is drawn here in the same manner as those tiles: a dark outline, light from
the top left, a handful of flat tones per material, and per-tier colors taken from the game's own
resource colors so that a mithril bar matches mithril ore everywhere.

The game's own things are made here too (build_icons): the perks as DCSS spell and god icons in a
gold frame, the tools (the axe and the bow are DCSS items; the pickaxe, hoe, rod and tinderbox are
drawn), the daily crate, the settings gear and the hoe in the hero's hand, the eighteen obstacles of
the agility course (a few DCSS items, the rest drawn) and the campfire the resting hero sits by.
"""
import math

import numpy as np
from PIL import Image, ImageDraw

CELL = 32
INK = (24, 17, 12, 255)
WHITE = np.array([255.0, 255, 255])
BLACK = np.array([0.0, 0, 0])
YY, XX = np.mgrid[0:CELL, 0:CELL]


# ---------- colour helpers ----------

def rgb(c):
    if isinstance(c, str):
        c = c.lstrip('#')
        return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], float)
    return np.asarray(c, float)[:3]


def mix(a, b, t):
    return rgb(a) + (rgb(b) - rgb(a)) * t


def ramp(color, n=5, lo=0.6, hi=0.5):
    """n tones from dark to light around a base colour (the middle one is the colour itself)."""
    c = rgb(color)
    out = []
    for i in range(n):
        t = i / (n - 1) * 2 - 1
        out.append(mix(c, BLACK, -t * lo) if t < 0 else mix(c, WHITE, t * hi))
    return [tuple(int(round(v)) for v in x) + (255,) for x in out]


def desat(color, t):
    c = rgb(color)
    g = c.mean()
    return c + (np.array([g, g, g]) - c) * t


# ---------- canvas helpers ----------

def blank():
    return np.zeros((CELL, CELL, 4), np.uint8)


def erode(mask):
    m = mask.copy()
    m[1:, :] &= mask[:-1, :]
    m[:-1, :] &= mask[1:, :]
    m[:, 1:] &= mask[:, :-1]
    m[:, :-1] &= mask[:, 1:]
    m[0, :] = m[-1, :] = m[:, 0] = m[:, -1] = False
    return m


def depth(mask):
    d = np.zeros(mask.shape, float)
    m = mask.copy()
    while m.any():
        d += m
        m = erode(m)
    return d


def blocky_noise(seed, block=4):
    rng = np.random.default_rng(seed)
    n = rng.random((CELL // block + 1, CELL // block + 1))
    return np.kron(n, np.ones((block, block)))[:CELL, :CELL]


def lit(mask, palette, noise=0.0, seed=0, light=(-0.55, -0.8, 0.75), round_=1.0, gamma=1.0):
    """Shade a blob as a lump lit from the top left: a height field from the distance to the edge,
    its normals against the light, quantised into the palette (dark to light)."""
    h = np.sqrt(depth(mask)) * round_
    if noise:
        h = h + blocky_noise(seed) * noise + blocky_noise(seed + 1, 2) * noise * 0.35
    gy, gx = np.gradient(h)
    nz = np.ones_like(h)
    lx, ly, lz = np.array(light) / np.linalg.norm(light)
    s = (-gx * lx - gy * ly + nz * lz) / np.sqrt(gx ** 2 + gy ** 2 + nz ** 2)
    vals = s[mask]
    s = np.clip((s - vals.min()) / max(1e-6, vals.max() - vals.min()), 0, 1) ** gamma
    idx = np.clip((s * len(palette)).astype(int), 0, len(palette) - 1)
    out = blank()
    pal = np.array(palette, np.uint8)
    out[mask] = pal[idx[mask]]
    return out


def outline(a, color=INK):
    alpha = a[..., 3] > 0
    grow = alpha.copy()
    grow[1:, :] |= alpha[:-1, :]
    grow[:-1, :] |= alpha[1:, :]
    grow[:, 1:] |= alpha[:, :-1]
    grow[:, :-1] |= alpha[:, 1:]
    a[grow & ~alpha] = color
    return a


def ellipse(cx, cy, rx, ry):
    return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1


def poly_mask(points):
    img = Image.new('L', (CELL, CELL), 0)
    ImageDraw.Draw(img).polygon(points, fill=255)
    return np.array(img) > 0


def put(a, x, y, color):
    if 0 <= x < CELL and 0 <= y < CELL:
        a[y, x] = color


def to_image(a):
    return Image.fromarray(a, 'RGBA')


def from_image(img):
    return np.array(img.convert('RGBA'))


# ---------- recolouring DCSS tiles ----------

def _hsv(img):
    a = np.array(img.convert('RGBA'))
    hsv = np.array(Image.fromarray(a[..., :3], 'RGB').convert('HSV')).astype(float)
    return a, hsv


def _back(a, hsv):
    rgb_ = np.array(Image.fromarray(np.clip(hsv, 0, 255).astype(np.uint8), 'HSV').convert('RGB'))
    out = a.copy()
    out[..., :3] = rgb_
    return Image.fromarray(out, 'RGBA')


def rehue(img, target, select=None, sat=None, val=1.0):
    """Give the saturated pixels (optionally only those whose hue is within `select`, in degrees) the
    hue of `target`; `sat` blends their saturation toward the target's, `val` scales brightness."""
    a, hsv = _hsv(img)
    t = Image.new('RGB', (1, 1), tuple(int(v) for v in rgb(target))).convert('HSV').getpixel((0, 0))
    m = (a[..., 3] > 0) & (hsv[..., 1] > 40)
    if select:
        lo, hi = (select[0] % 360) / 360 * 255, (select[1] % 360) / 360 * 255
        h = hsv[..., 0]
        m &= ((h >= lo) & (h <= hi)) if lo <= hi else ((h >= lo) | (h <= hi))
    hsv[..., 0][m] = t[0]
    if sat is not None:
        hsv[..., 1][m] = hsv[..., 1][m] * (1 - sat) + t[1] * sat
    hsv[..., 2][m] = hsv[..., 2][m] * val
    return _back(a, hsv)


def colorize(img, color, lo=0.7, hi=0.55, keep=0.0):
    """Map every pixel's brightness onto a ramp of `color` (a full tint), keeping `keep` of the original."""
    a = np.array(img.convert('RGBA')).astype(float)
    lum = (a[..., :3] @ np.array([0.3, 0.55, 0.15])) / 255
    c = rgb(color)
    dark, light = mix(c, BLACK, lo), mix(c, WHITE, hi)
    t = lum[..., None]
    tint = np.where(t < 0.5, dark + (c - dark) * (t / 0.5), c + (light - c) * ((t - 0.5) / 0.5))
    a[..., :3] = tint * (1 - keep) + a[..., :3] * keep
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')


def browned(img, color):
    """Roast a meat tile: its meat (the saturated pixels) takes a glazed brown ramp, the bone stays."""
    a, hsv = _hsv(img)
    meat = (a[..., 3] > 0) & (hsv[..., 1] > 40)
    glaze = np.array(colorize(img, color, lo=0.62, hi=0.6))
    out = a.copy()
    out[meat] = glaze[meat]
    return Image.fromarray(out, 'RGBA')


def fit(img):
    """Scale a tile into a cell (most are 32x32 already) and stand it on the cell's floor."""
    img = img.convert('RGBA')
    if img.size != (CELL, CELL):
        img.thumbnail((CELL, CELL), Image.LANCZOS)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    cell.paste(img, ((CELL - img.width) // 2, CELL - img.height), img)
    return cell


# ---------- drawn icons ----------

def ore(vein, rock='#6f655c', seed=1, coal=False):
    """A lumpy boulder with nuggets of the metal in it."""
    mask = np.zeros((CELL, CELL), bool)
    for cx, cy, rx, ry in [(16, 20, 11.5, 8), (10, 18, 6.5, 6.5), (22, 17, 7, 6), (15, 14, 7, 5.5)]:
        mask |= ellipse(cx, cy, rx, ry)
    if coal:
        a = lit(mask, ramp('#3b3b46', 5, lo=0.75, hi=0.55), noise=2.2, seed=seed)
        rng = np.random.default_rng(seed)
        inside = np.argwhere(erode(erode(mask)))
        for y, x in inside[rng.choice(len(inside), 9, replace=False)]:
            put(a, x, y, (176, 184, 204, 255))  # glints on the coal
        return outline(a)
    rock = mix(rock, vein, 0.24)                 # each ore's stone leans toward its metal
    a = lit(mask, ramp(rock, 5, lo=0.7, hi=0.38), noise=1.8, seed=seed, gamma=1.6)
    v = ramp(vein, 4, lo=0.45, hi=0.7)
    rng = np.random.default_rng(seed + 11)
    inner = erode(erode(mask))
    spots = []
    candidates = np.argwhere(inner)
    rng.shuffle(candidates)
    for y, x in candidates:
        if all(abs(x - sx) > 4 or abs(y - sy) > 4 for sx, sy in spots):
            spots.append((x, y))
        if len(spots) == 6:
            break
    for x, y in spots:                       # a nugget: lit corner, body, shaded edge
        for dx, dy, k in [(0, 0, 3), (1, 0, 2), (0, 1, 2), (1, 1, 2), (2, 1, 1), (1, 2, 1), (2, 2, 0)]:
            if inner[min(y + dy, CELL - 1), min(x + dx, CELL - 1)]:
                put(a, x + dx, y + dy, v[k])
        if rng.random() < 0.5:
            put(a, x - 1, y + 1, v[1])
    return outline(a)


def bar(color):
    """An ingot: a light top face and a shaded front with sloped ends."""
    c = ramp(color, 6, lo=0.62, hi=0.6)
    img = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(7, 16), (24, 16), (28, 25), (3, 25)], fill=c[2])     # front face
    d.polygon([(22, 16), (24, 16), (28, 25), (25, 25)], fill=c[1])   # right end, in shade
    d.polygon([(7, 16), (9, 16), (6, 25), (3, 25)], fill=c[3])       # left end, catching light
    d.polygon([(10, 11), (21, 11), (24, 16), (7, 16)], fill=c[4])    # top face
    d.line([(11, 12), (17, 12)], fill=c[5])                          # glint on the top
    d.line([(8, 16), (23, 16)], fill=c[5])                           # the lit front edge
    d.line([(5, 24), (26, 24)], fill=c[1])                           # the shaded foot
    d.line([(11, 19), (19, 19)], fill=c[3])                          # a stamp on the front
    d.line([(11, 20), (19, 20)], fill=c[1])
    a = from_image(img)
    return outline(a)


def log(bark, cut='#e8c38a', magic=False):
    """A log lying from the front left (its cut end, with rings) to the back right."""
    ax, ay, bx, by, r = 9.0, 21.0, 25.0, 11.0, 5.6
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    px, py = -uy, ux                      # across the log, pointing down-right
    t = (XX - ax) * ux + (YY - ay) * uy
    s = (XX - ax) * px + (YY - ay) * py
    body = ((t >= 0) & (t <= L) & (np.abs(s) <= r)) | (((XX - bx) ** 2 + (YY - by) ** 2) <= r * r)
    cap = (s / r) ** 2 + (t / (r * 0.55)) ** 2 <= 1
    b = ramp(bark, 5, lo=0.65, hi=0.35)
    a = blank()
    tone = np.clip(((s / r + 1) / 2 * 4.2).astype(int), 0, 4)   # light on the upper left side
    order = [3, 2, 2, 1, 0]
    for k in range(5):
        a[body & (tone == k)] = b[order[k]]
    rng = np.random.default_rng(int(sum(rgb(bark))))
    for _ in range(11):                  # grooves in the bark, along the log
        s0, t0, n = rng.uniform(-r + 1.2, r - 1.2), rng.uniform(3, L - 2), rng.integers(3, 7)
        for k in range(n):
            x, y = int(round(ax + ux * (t0 + k) + px * s0)), int(round(ay + uy * (t0 + k) + py * s0))
            if 0 <= x < CELL and 0 <= y < CELL and body[y, x]:
                a[y, x] = b[0] if s0 > 0 else b[1]
    w = ramp(cut, 4, lo=0.45, hi=0.35)
    rho = np.sqrt((s / r) ** 2 + (t / (r * 0.55)) ** 2)
    a[cap] = w[2]
    a[cap & (rho > 0.84)] = b[1]                     # the bark rim around the cut
    a[cap & (np.abs(rho - 0.55) < 0.12)] = w[1]      # growth rings
    a[cap & (rho < 0.18)] = w[0]
    a[cap & (rho > 0.25) & (rho < 0.42) & (s < 0)] = w[3]
    if magic:
        for x, y in [(18, 9), (22, 14), (14, 13), (26, 7), (12, 18)]:
            put(a, x, y, (240, 220, 255, 255))
    return outline(a)


def fish(back, belly, x0=4, x1=27, h=6.2, cy=16, spots=None, stripe=None, bill=False, dorsal=1.0, seed=3, eye=(255, 255, 255)):
    """A fish swimming right: tail, body shaded back to belly, a dorsal fin, an eye."""
    a = blank()
    bk, bl = ramp(back, 4, lo=0.5, hi=0.4), ramp(belly, 4, lo=0.4, hi=0.45)
    xs = (XX - x0) / (x1 - x0)
    half = h * np.sin(np.clip(xs, 0, 1) * math.pi) ** 0.7
    half = np.where(xs > 0.55, h * np.sin(np.clip(xs, 0, 1) * math.pi) ** 0.5, half)
    body = (xs >= 0.12) & (xs <= 1) & (np.abs(YY + 0.5 - cy) <= half)
    tail = poly_mask([(x0 + 4, cy), (x0 - 2, cy - 6), (x0, cy), (x0 - 2, cy + 6)])
    fin = poly_mask([(x0 + 9, cy - h + 1), (x0 + 12 + 3 * dorsal, cy - h - 3 * dorsal), (x0 + 16, cy - h + 1)])
    a[tail | fin] = bk[1]
    rel = (YY + 0.5 - cy) / np.maximum(half, 0.1)
    a[body & (rel < -0.45)] = bk[2]
    a[body & (rel < -0.75)] = bk[3]
    a[body & (rel >= -0.45) & (rel < 0.1)] = bk[2]
    a[body & (rel >= 0.1)] = bl[2]
    a[body & (rel >= 0.6)] = bl[1]
    if stripe:
        a[body & (np.abs(rel + 0.05) < 0.18) & (xs > 0.2) & (xs < 0.9)] = ramp(stripe, 3)[1]
    if spots:
        rng = np.random.default_rng(seed)
        for _ in range(9):
            x, y = int(rng.uniform(x0 + 6, x1 - 5)), int(rng.uniform(cy - h + 2, cy))
            if body[y, x]:
                a[y, x] = ramp(spots, 3)[0]
    if bill:
        for k in range(6):
            put(a, x1 + k - 1, cy - 1 - (k > 2), bk[3])
    put(a, x1 - 5, cy - 2, (20, 20, 24, 255))
    put(a, x1 - 6, cy - 3, eye + (255,) if len(eye) == 3 else eye)
    a[body & (np.abs(XX - (x1 - 8)) < 0.6) & (np.abs(rel) < 0.55)] = bk[0]   # the gill line
    return outline(a)


def shrimp(color):
    """A curled shrimp: a thick arc of segments, a tail fan and feelers."""
    c = ramp(color, 5, lo=0.55, hi=0.5)
    a = blank()
    cx, cy = 16.5, 15.5
    ang = (np.degrees(np.arctan2(YY - cy, XX - cx)) + 360) % 360
    rad = np.hypot(XX - cx, YY - cy)
    span = (ang >= 150) | (ang <= 50)           # from the head (upper left) round the right and down
    u = np.where(ang >= 150, ang - 150, ang + 210) / 260   # 0 at the head, 1 at the tail
    thick = 5.2 - 2.6 * u
    body = span & (np.abs(rad - 8.5) <= thick / 2 + 0.5)
    seg = (np.floor(u * 7) % 2 == 0)
    a[body] = c[2]
    a[body & seg] = c[3]
    a[body & (rad < 8.5 - thick / 4)] = c[4]
    a[body & (rad > 8.5 + thick / 4)] = c[1]
    fan = poly_mask([(19, 23), (16, 28), (21, 29), (24, 26)])
    a[fan & ~body] = c[1]
    for k in range(7):                          # feelers from the head
        put(a, 7 - k // 2, 11 - k, c[0])
        put(a, 9 - k // 3, 10 - k, c[1])
    put(a, 10, 12, (20, 20, 24, 255))
    return outline(a)


def lobster(color, claw=None):
    """A lobster from above: claws reaching up, a segmented tail fanning out below."""
    c = ramp(color, 5, lo=0.6, hi=0.45)
    k_ = ramp(claw or color, 5, lo=0.6, hi=0.45)
    a = blank()
    body = ellipse(16, 15, 4.2, 6)
    tail = np.zeros((CELL, CELL), bool)
    for i, w in enumerate([3.8, 3.4, 3.0, 2.6]):
        tail |= ellipse(16, 21.5 + i * 2.1, w, 1.4)
    fan = poly_mask([(16, 28), (11, 31), (21, 31)])
    left = ellipse(8.5, 7.5, 3.6, 4.2) | poly_mask([(11, 12), (9, 10), (12, 9), (14, 11)])
    right = ellipse(23.5, 7.5, 3.6, 4.2) | poly_mask([(21, 12), (23, 10), (20, 9), (18, 11)])
    a[tail | fan] = c[1]
    a[tail & (YY % 2 == 0)] = c[2]
    a[body] = c[2]
    a[body & (XX < 15)] = c[3]
    a[left | right] = k_[2]
    a[(left & (XX < 8)) | (right & (XX < 23))] = k_[3]
    a[ellipse(8.5, 5, 1.2, 1.6) | ellipse(23.5, 5, 1.2, 1.6)] = (0, 0, 0, 0)   # open pincers
    for k in range(8):                          # feelers
        put(a, 14 - k, 9 - k // 2 - 1, c[0])
        put(a, 18 + k, 9 - k // 2 - 1, c[0])
    put(a, 14, 10, (20, 20, 24, 255))
    put(a, 18, 10, (20, 20, 24, 255))
    return outline(a)


def grill(a, light=False):
    """Brown a drawn fish or shellfish and mark it with the grill."""
    img = to_image(a)
    hsv_a, hsv = _hsv(img)
    m = hsv_a[..., 3] > 0
    ink = (hsv_a[..., 0] < 40) & (hsv_a[..., 1] < 40) & (hsv_a[..., 2] < 40)
    tint = colorize(img, '#c9822f' if not light else '#e8964a', lo=0.65, hi=0.5, keep=0.25)
    out = from_image(tint)
    out[ink] = hsv_a[ink]
    body = m & ~ink
    for k in range(3):                          # grill marks, diagonal
        line = np.abs((XX - YY) - (k * 7 - 9)) < 0.8
        out[body & line & erode(body)] = (92, 46, 18, 255)
    return out


def bowl(soup, bits=(), steam=True, wood='#8a5a2e'):
    """A wooden bowl of soup, steaming."""
    w = ramp(wood, 5, lo=0.6, hi=0.4)
    s = ramp(soup, 4, lo=0.45, hi=0.45)
    a = blank()
    under = ellipse(16, 18, 12.5, 9.5) & (YY >= 18)
    rim = ellipse(16, 18, 12.5, 3.6)
    surf = ellipse(16, 18, 10.5, 2.6)
    a[under] = w[2]
    a[under & (XX > 20)] = w[1]
    a[under & (YY > 24)] = w[1]
    a[under & (XX < 10)] = w[3]
    a[rim] = w[3]
    a[surf] = s[2]
    a[surf & (YY < 17)] = s[3]
    a[ellipse(16, 27.5, 5, 1.2)] = w[1]          # the foot
    rng = np.random.default_rng(len(bits) + 5)
    pts = np.argwhere(surf)
    for i, colr in enumerate(bits):
        for y, x in pts[rng.choice(len(pts), 3, replace=False)]:
            put(a, x, y, ramp(colr, 3)[1])
    a = outline(a)
    if steam:
        for x0 in (12, 17, 21):
            for k in range(6):
                put(a, x0 + (1 if (k // 2) % 2 else 0), 13 - k, (236, 236, 236, 150 - k * 18))
    return a


def blob(color, mask, noise=1.0, seed=2, specks=None, lo=0.6, hi=0.45):
    a = lit(mask, ramp(color, 5, lo=lo, hi=hi), noise=noise, seed=seed)
    if specks:
        rng = np.random.default_rng(seed + 3)
        pts = np.argwhere(erode(mask))
        for y, x in pts[rng.choice(len(pts), min(len(pts), 6), replace=False)]:
            put(a, x, y, ramp(specks, 3)[0])
    return a


def potato(baked=False):
    mask = ellipse(16, 19, 11, 7.5) | ellipse(12, 17, 6, 6)
    a = blob('#c58f4f', mask, noise=0.8, seed=4, specks='#6b4423')
    if baked:
        split = mask & (np.abs(YY - (16 + (XX - 16) * 0.12)) < 1.3) & (np.abs(XX - 16) < 7.5)
        a[split] = (250, 236, 190, 255)
        a[split & (YY < 16)] = (255, 250, 228, 255)
        for x, y in [(15, 14), (16, 14), (15, 13), (16, 13)]:
            put(a, x, y, (255, 214, 70, 255))   # butter
    return outline(a)


def cabbage():
    head = ellipse(16, 18, 9.5, 8.5)
    outer = ellipse(9, 20, 6, 6.5) | ellipse(23, 20, 6, 6.5)
    a = blank()
    a[outer] = ramp('#3f8f3a', 5)[1]
    a[outer & (XX < 7)] = ramp('#3f8f3a', 5)[2]
    a[outer & (XX > 25)] = ramp('#3f8f3a', 5)[0]
    inner = lit(head, ramp('#7fd36b', 5, lo=0.55, hi=0.4), noise=0.4, seed=7)
    a[head] = inner[head]
    veins = head & ((np.abs((XX - 16) - (YY - 18) * 0.35) < 0.5) | (np.abs(np.hypot(XX - 12, YY - 25) - 9) < 0.5))
    a[veins] = ramp('#c8f0b8', 3)[1]
    return outline(a)


def pumpkin():
    mask = ellipse(16, 19, 12, 8.5)
    a = blob('#e2771d', mask, noise=0.3, seed=9)
    for x in (10, 16, 22):                      # ribs
        rib = mask & (np.abs(XX - x - (YY - 19) * 0.0) < 0.6) & erode(mask)
        a[rib] = ramp('#e2771d', 5)[0]
    stem = poly_mask([(15, 12), (17, 12), (19, 7), (17, 7)])
    a[stem] = (92, 120, 42, 255)
    put(a, 18, 7, (130, 160, 60, 255))
    return outline(a)


def starfruit():
    pts = []
    for k in range(10):
        ang = -math.pi / 2 + k * math.pi / 5
        r = 12 if k % 2 == 0 else 5.2
        pts.append((16 + r * math.cos(ang), 17.5 + r * math.sin(ang)))
    mask = poly_mask(pts)
    a = lit(mask, ramp('#f2c418', 5, lo=0.5, hi=0.5), seed=5)
    for k in range(5):                          # the seed lines to the centre
        ang = -math.pi / 2 + k * 2 * math.pi / 5
        for rr in (2, 3, 4):
            put(a, int(round(16 + rr * math.cos(ang))), int(round(17.5 + rr * math.sin(ang))), ramp('#f2c418', 5)[1])
    put(a, 16, 17, (120, 90, 20, 255))
    return outline(a)


def nugget(color):
    """A rough gem-like crystal of essence."""
    pts = [(16, 4), (24, 12), (21, 26), (11, 26), (8, 12)]
    mask = poly_mask(pts)
    c = ramp(color, 5, lo=0.55, hi=0.6)
    a = blank()
    a[mask] = c[2]
    a[mask & poly_mask([(16, 4), (8, 12), (14, 15)])] = c[4]
    a[mask & poly_mask([(16, 4), (24, 12), (18, 15)])] = c[3]
    a[mask & poly_mask([(14, 15), (18, 15), (21, 26), (11, 26)])] = c[2]
    a[mask & poly_mask([(18, 15), (24, 12), (21, 26)])] = c[1]
    a[mask & poly_mask([(8, 12), (14, 15), (11, 26)])] = c[3]
    put(a, 13, 9, (255, 255, 255, 255))
    put(a, 12, 10, (255, 255, 255, 200))
    return outline(a)


def soil():
    """A tilled mound of earth: the farm plot, empty."""
    mound = ellipse(16, 23, 14, 6.5)
    a = lit(mound, ramp('#7a5232', 5, lo=0.6, hi=0.35), noise=0.6, seed=12)
    for k, y in enumerate((20, 23, 26)):             # furrows, with a lit ridge above each
        row = mound & (np.abs(YY - y - (XX - 16) ** 2 * 0.004) < 0.6) & erode(mound)
        a[row] = ramp('#7a5232', 5)[0]
        a[np.roll(row, -1, axis=0) & erode(mound)] = ramp('#7a5232', 5)[3]
    return outline(a)


def sprout(tall=False, tiles=None):
    """The plot growing: a sprout on the mound, or (tall) a leafy young plant."""
    base = to_image(soil())
    if tall and tiles:
        plant = Image.open(f'{tiles}/mon/fungi_plants/plant_06.png').convert('RGBA').resize((24, 24), Image.NEAREST)
        base.alpha_composite(plant, (4, 1))
        return base
    a = from_image(base)
    g = ramp('#4caf50', 4, lo=0.45, hi=0.45)
    for y in range(14, 21):                         # the stem
        put(a, 16, y, g[1])
    for x, y, k in [(13, 14, 2), (14, 13, 3), (15, 14, 2), (14, 15, 1), (17, 13, 2), (18, 12, 3), (19, 13, 2), (18, 14, 1), (12, 13, 1), (20, 12, 1)]:
        put(a, x, y, g[k])                          # two leaves
    return outline(a)


def build_extras(tiles):
    """Cells that are not resources: the farm plot, empty and growing."""
    return {'farm/soil': fit(to_image(soil())), 'farm/sprout': fit(to_image(sprout())), 'farm/growing': fit(sprout(tall=True, tiles=tiles))}


# ---------- the game's own things: perk badges, tools, the crate, the settings gear ----------

GOLD_LIGHT, GOLD_MID, GOLD_DARK, GOLD_DEEP = (255, 222, 140, 255), (214, 170, 92, 255), (138, 98, 44, 255), (70, 46, 20, 255)
WOOD = ramp('#a8743a', 4, lo=0.55, hi=0.35)
STEEL = ramp('#9aa3ad', 5, lo=0.6, hi=0.55)
COPPER = ramp('#c47a3c', 5, lo=0.6, hi=0.45)


def gold_frame(a):
    """A bevelled gold frame on the ring 2..29, where DCSS's spell icons have a grey one: lit top and left."""
    for i in range(2, 30):
        a[2, i] = a[i, 2] = GOLD_LIGHT
        a[29, i] = a[i, 29] = GOLD_DARK
    a[2, 29] = a[29, 2] = GOLD_MID
    for i in range(3, 29):                   # and the dark inner line the DCSS frames have
        a[28, i] = a[i, 28] = GOLD_DEEP
    return a


def badge(img):
    """A DCSS spell or god icon as a perk badge: its picture on black in a gold frame. Its own grey
    frame goes, and so do the notched corners of the god icons."""
    src = from_image(img)
    opaque = src[..., 3] > 0
    clear = np.pad(~opaque, 1, constant_values=True)
    near = np.zeros_like(opaque)             # opaque pixels touching the outside, diagonals too
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            near |= clear[1 + dy:CELL + 1 + dy, 1 + dx:CELL + 1 + dx]
    pic = src.copy()
    pic[(opaque & near) | ~opaque] = (0, 0, 0, 255)
    a = blank()
    a[3:29, 3:29] = pic[3:29, 3:29]
    return gold_frame(a)


def badge_item(img, glow, scale=1.0):
    """An item as a perk badge: on a dark ground with a soft glow of `glow` behind it, framed like the spells."""
    r = np.hypot(XX - 15.5, YY - 15.5)
    t = np.clip(1 - r / 15, 0, 1) ** 1.6 * 0.55
    a = blank()
    a[..., :3] = (rgb(glow)[None, None, :] * t[..., None]).astype(np.uint8)
    a[..., 3] = 255
    if scale != 1.0:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    img = img.crop(img.getbbox())
    layer = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    layer.paste(img, ((CELL - img.width) // 2, (CELL - img.height) // 2 + 1), img)
    a = from_image(Image.alpha_composite(to_image(a), layer))
    a[:3, :] = a[29:, :] = 0
    a[:, :3] = a[:, 29:] = 0
    return gold_frame(a)


def item_shadow(a, dx=2, dy=2, alpha=70):
    """The soft shadow down and to the right that DCSS's item tiles carry."""
    m = a[..., 3] > 0
    s = np.zeros_like(m)
    s[dy:, dx:] = m[:-dy, :-dx]
    out = a.copy()
    out[s & ~m] = (0, 0, 0, alpha)
    return out


def haft(a, x0, x1, grip=None, s=32):
    """A wooden haft along x + y = s from x0 to x1, lit on its upper side, with a leather grip."""
    for x in range(x0, x1 + 1):
        put(a, x, s - 1 - x, WOOD[2])
        put(a, x, s - x, WOOD[1])
    for x in range(*(grip or (0, -1))):
        put(a, x, s - 1 - x, (120, 70, 40, 255))
        put(a, x, s - x, (84, 46, 26, 255))
    return a


def metal(mask, palette=STEEL):
    return lit(mask, palette, light=(-0.6, -0.8, 0.7))


def pickaxe():
    """A pick: a crescent of steel across the top of the haft, both points bent toward the grip."""
    a = haft(blank(), 6, 22, grip=(6, 11))
    c, u, v = np.array([22.5, 9.5]), np.array([1, 1]) / math.sqrt(2), np.array([-1, 1]) / math.sqrt(2)
    upper, lower = [], []
    for t in np.linspace(-1, 1, 15):
        p = c + u * t * 11.5 + v * (t ** 2) * 4.2
        half = 1.9 * (1 - abs(t) ** 1.6) + 0.35
        upper.append(tuple(p - v * half))
        lower.append(tuple(p + v * half))
    h = metal(poly_mask(upper + lower[::-1]))
    a[h[..., 3] > 0] = h[h[..., 3] > 0]
    for x, y in ((21, 10), (22, 10), (21, 9)):   # the haft through the eye
        put(a, x, y, WOOD[1])
    return item_shadow(outline(a))


def hoe():
    """A hoe: a flat blade set square to the top of the haft, bent down toward the ground."""
    a = haft(blank(), 5, 21, grip=(5, 10))
    h = metal(poly_mask([(20.5, 10.5), (22.5, 8.5), (28.5, 14.5), (28.5, 20.5), (24.5, 20.5), (24.5, 15.5)]))
    a[h[..., 3] > 0] = h[h[..., 3] > 0]
    return item_shadow(outline(a))


def fishing_rod():
    """A rod with a reel at the grip, its line hanging from the tip to a red and white float."""
    a = blank()
    for x in range(4, 27):                         # long and thin, thicker at the grip
        put(a, x, 31 - x, (196, 150, 92, 255) if x > 11 else (120, 70, 40, 255))
        if x <= 11:
            put(a, x, 32 - x, (84, 46, 26, 255))
    for x, y in ((8, 25), (9, 25), (8, 26), (9, 26), (10, 25)):
        put(a, x, y, (176, 184, 196, 255))
    put(a, 9, 24, (232, 236, 244, 255))
    a = outline(a)
    for y in range(6, 20):
        put(a, 27 + (y > 13), y, (226, 232, 240, 230))
    for x, y, c in ((27, 20, (230, 60, 50)), (28, 20, (230, 60, 50)), (27, 21, (250, 250, 250)), (28, 21, (250, 250, 250)), (27, 22, (200, 40, 40)), (28, 22, (230, 60, 50))):
        put(a, x, y, c + (255,))
    return item_shadow(a)


def tinderbox():
    """A copper tinderbox with its lid thrown open and a flame rising from the tinder."""
    a = blank()
    lid = lit(poly_mask([(8, 15), (25, 15), (27, 6), (11, 6)]), ramp('#a8642e', 5, lo=0.65, hi=0.35), light=(-0.5, -0.9, 0.6))
    a[lid[..., 3] > 0] = lid[lid[..., 3] > 0]
    a = outline(a)
    flame = (ellipse(16.5, 13, 4.2, 6.5) & (YY <= 17)) | poly_mask([(13, 10), (20, 10), (17, 2)])
    core = ((XX - 16.5) / 2.4) ** 2 + ((YY - 13.5) / 4.0) ** 2 <= 1
    a[flame] = (255, 150, 50, 255)
    a[flame & core] = (255, 240, 170, 255)
    for x, y in ((17, 1), (16, 3), (19, 5), (13, 8)):
        put(a, x, y, (255, 120, 40, 255))
    box = lit(poly_mask([(6, 16), (26, 16), (26, 27), (6, 27)]), COPPER, light=(-0.6, -0.8, 0.7), round_=0.6)
    box[(YY == 16) & (XX >= 6) & (XX <= 26)] = COPPER[4]   # the rim
    box[(YY == 21) & (XX >= 6) & (XX <= 26)] = COPPER[1]   # a band round it
    a[box[..., 3] > 0] = box[box[..., 3] > 0]
    put(a, 16, 21, (250, 220, 140, 255))                     # the clasp
    put(a, 16, 22, (180, 120, 60, 255))
    return item_shadow(outline(a))


def gear(tiles):
    """The settings gear: the bronze cog of DCSS's Invent Gizmo ability, out of its frame."""
    src = from_image(Image.open(f'{tiles}/gui/abilities/invent_gizmo.png'))
    hsv = np.array(Image.fromarray(src[..., :3], 'RGB').convert('HSV')).astype(int)
    cog = (src[..., 3] > 0) & (hsv[..., 1] > 90) & (hsv[..., 2] > 60)
    a = blank()
    a[cog] = src[cog]
    return outline(a)


def hoe_in_hand(tiles):
    """The hero's hoe, drawn like the paperdoll's tools (player/hand1): the scythe's haft, held where
    the hero's hand is, with a hoe's blade at the top instead of the scythe's."""
    scythe = from_image(Image.open(f'{tiles}/player/hand1/scythe.png'))
    a = blank()
    a[4:, 5:8] = scythe[4:, 5:8]
    wood = tuple(scythe[10, 6])
    for y in range(1, 4):
        put(a, 5, y, INK)
        put(a, 6, y, wood)
        put(a, 7, y, INK)
    put(a, 6, 0, INK)
    blade = metal(poly_mask([(7.5, 2.5), (10.5, 2.5), (12.5, 5.5), (12.5, 10.5), (10.5, 10.5), (10.5, 5.5), (7.5, 4.5)]))
    blade = outline(blade)
    a[blade[..., 3] > 0] = blade[blade[..., 3] > 0]
    return a


# ---------- the agility course: one picture per obstacle, and the campfire the resting hero sits by ----------

WOOD_POST = ramp('#9a6a36', 5, lo=0.6, hi=0.4)
STONE = ramp('#8a8580', 5, lo=0.65, hi=0.45)
WATER = ramp('#3f86c8', 5, lo=0.55, hi=0.5)
ROPE_LIGHT, ROPE_DARK = (226, 196, 150, 255), (150, 110, 70, 255)


def paste(a, b):
    m = b[..., 3] > 0
    a[m] = b[m]
    return a


def rect(x0, y0, x1, y1):
    return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)


def post(x, y0, y1, w=2):
    return lit(rect(x, y0, x + w - 1, y1), WOOD_POST, round_=0.5)


def pool(mask, texture, bright=1.0):
    """A pool of a DCSS floor texture (mud, lava) filling `mask`, darker at its edge."""
    t = from_image(texture).astype(float)
    t[..., :3] = np.clip(t[..., :3] * bright, 0, 255)
    a = blank()
    a[mask] = t.astype(np.uint8)[mask]
    edge = mask & ~erode(mask)
    a[edge, :3] = (a[edge, :3] * 0.55).astype(np.uint8)
    return outline(a)


def stepping_stones():
    a = lit(ellipse(16, 21, 15, 7.5), WATER, round_=0.4)
    for cx, cy, r in ((8, 20, 3.6), (16, 22, 3.8), (24, 20, 3.6)):
        paste(a, outline(lit(ellipse(cx, cy, r + 0.8, r * 0.62), STONE, noise=0.6, seed=cx)))
    for x, y in ((12, 18), (20, 25), (27, 23), (5, 23)):
        put(a, x, y, (200, 230, 255, 255))
    return outline(a)


def log_balance():
    a = blank()
    for x0 in (7, 22):                                   # two A-frame trestles
        for dy in range(11):
            put(a, x0 - dy // 3, 17 + dy, WOOD_POST[1])
            put(a, x0 + 2 + dy // 3, 17 + dy, WOOD_POST[1])
    a = outline(a)
    bark = ramp('#8a5a2b', 5, lo=0.6, hi=0.35)
    b = lit(rect(3, 12, 28, 16), bark, light=(0, -1, 0.6), round_=0.7)
    for y in (13, 15):
        for x in range(6, 27, 5):
            put(b, x, y, bark[0])
            put(b, x + 1, y, bark[0])
    b[ellipse(3.5, 14, 2.2, 2.6)] = (232, 195, 138, 255)  # the cut end and its rings
    b[ellipse(3.5, 14, 0.9, 1.1)] = (190, 140, 90, 255)
    return paste(a, outline(b))


def monkey_bars():
    a = paste(post(4, 9, 29), post(26, 9, 29))
    paste(a, lit(rect(4, 8, 27, 9) | rect(4, 12, 27, 12), STEEL))
    for x in range(8, 26, 4):
        paste(a, lit(rect(x, 9, x, 12), STEEL))
    return item_shadow(outline(a))


def tightrope():
    a = outline(paste(post(3, 8, 29), post(27, 8, 29)))
    for x in range(5, 27):
        sag = 2.2 * math.sin((x - 5) / 22 * math.pi)
        put(a, x, round(10 + sag), ROPE_LIGHT)
        put(a, x, round(11 + sag), ROPE_DARK)
    for x in (2, 3, 4, 27, 28, 29):
        put(a, x, 7, INK)
    return item_shadow(a)


def pipe_crawl():
    grey = ramp('#7a8590', 5, lo=0.6, hi=0.45)
    a = lit(rect(10, 11, 29, 24), grey, light=(0, -1, 0.5), round_=0.8)
    for x in (17, 24):                                   # the joints
        a[rect(x, 11, x, 24)] = grey[0]
    a[ellipse(10, 17.5, 5.5, 7)] = (110, 120, 130, 255)  # its mouth, dark inside
    a[ellipse(10, 17.5, 4, 5.4)] = (18, 14, 12, 255)
    a[ellipse(9.4, 18.5, 2.4, 3.4)] = (8, 6, 5, 255)
    return item_shadow(outline(a))


def wall_climb():
    brick = ramp('#8a6a58', 5, lo=0.55, hi=0.3)
    wall = rect(4, 6, 27, 29)
    w = lit(wall, brick, round_=0.3)
    for y in range(9, 30, 4):                            # the mortar
        w[rect(4, y, 27, y) & wall] = brick[0]
        for x in range(4 + (0 if (y // 4) % 2 else 3), 28, 6):
            w[rect(x, y - 3, x, y - 1) & wall] = brick[0]
    a = outline(w)
    for y in range(3, 27):                               # a rope over the top, hooked on
        put(a, 16 + (8 < y < 18), y, ROPE_LIGHT)
        put(a, 17 + (8 < y < 18), y, ROPE_DARK)
    for x, y in ((14, 3), (15, 2), (16, 2), (17, 2), (18, 2), (19, 3), (20, 4)):
        put(a, x, y, STEEL[3])
    return item_shadow(a)


def zipline():
    a = blank()
    for x in range(2, 31):
        put(a, x, round(4 + (x - 2) * 0.42), (60, 64, 72, 255))
    paste(a, outline(lit(poly_mask([(14, 7), (19, 9), (18, 12), (13, 10)]), STEEL)))   # the trolley
    for y in range(12, 20):
        put(a, 15, y, (60, 64, 72, 255))
    paste(a, outline(lit(rect(10, 20, 21, 21), ramp('#d04a3a', 4, lo=0.5, hi=0.4))))   # the handle
    return item_shadow(a)


def hurdles():
    a = blank()
    for x in (6, 24):
        paste(a, lit(rect(x, 14, x + 1, 28), STEEL))
        paste(a, lit(rect(x - 2, 28, x + 3, 29), STEEL))
    bar = rect(3, 9, 28, 14)
    shade = lit(bar, ramp('#888888', 5, lo=0.4, hi=0.3), round_=0.6)[..., :3].astype(float) / 160
    stripes = blank()
    for x in range(3, 29):
        stripes[9:15, x] = (236, 236, 236, 255) if (x // 4) % 2 else (214, 58, 48, 255)
    stripes[..., :3] = np.clip(stripes[..., :3] * np.clip(shade, 0.6, 1.25), 0, 255).astype(np.uint8)
    return item_shadow(outline(paste(a, stripes)))


def mud_pit(tiles):
    a = pool(ellipse(16, 20, 14.5, 8.5), Image.open(f'{tiles}/dngn/floor/mud0.png'), bright=1.9)
    for cx, cy in ((11, 19), (20, 22), (17, 17)):        # bubbles
        a[ellipse(cx, cy, 1.6, 1.1)] = (150, 116, 70, 255)
        put(a, cx - 1, cy - 1, (200, 170, 120, 255))
    return a


def lava_crossing(tiles):
    a = pool(ellipse(16, 20, 15, 8.5), Image.open(f'{tiles}/dngn/floor/lava00.png'), bright=1.45)
    for cx, cy in ((11, 20), (21, 19)):                  # two stones to cross on
        paste(a, outline(lit(ellipse(cx, cy, 3.6, 2.2), ramp('#4a4440', 5, lo=0.6, hi=0.5), noise=0.6, seed=cx)))
    return a


def rooftop():
    tile_red = ramp('#b0402e', 5, lo=0.6, hi=0.35)
    a = outline(lit(rect(21, 5, 24, 13), ramp('#9a5040', 5, lo=0.6, hi=0.35)))   # the chimney
    roof = poly_mask([(2, 21), (16, 7), (30, 21)])
    r = lit(roof, tile_red, round_=0.6)
    for y in range(11, 22, 3):
        r[(YY == y) & roof] = tile_red[0]
    paste(a, outline(r))
    paste(a, outline(lit(rect(6, 21, 26, 28), ramp('#d8c8a0', 5, lo=0.55, hi=0.3), round_=0.4)))
    a[rect(13, 23, 16, 26)] = (70, 120, 170, 255)        # a window
    return item_shadow(a)


def waterfall():
    a = blank()
    for x0, x1 in ((2, 10), (22, 30)):                   # the cliffs either side
        cliff = rect(x0, 3, x1, 22) & ~((XX - (x0 + x1) / 2) ** 2 / 30 + (YY - 2) ** 2 / 4 < 1)
        paste(a, outline(lit(cliff, STONE, noise=1.2, seed=x0)))
    for y, x in np.argwhere(rect(11, 3, 21, 24)):        # the fall, streaked with foam
        a[y, x] = (235, 246, 255, 255) if (x * 7 + y * 3 + (x % 3) * 5) % 9 < 3 else WATER[3]
    p = lit(ellipse(16, 25, 14, 5), WATER, round_=0.4)
    for x in range(8, 25, 3):
        put(p, x, 22 + (x % 2), (235, 246, 255, 255))
    return outline(paste(a, p))


def rock_wall():
    a = ore('#7a7068', rock='#7a7068', seed=11)           # a boulder, then holds of every colour
    for x, y, c in ((9, 14, (230, 80, 60)), (16, 11, (250, 200, 60)), (22, 15, (80, 180, 240)), (12, 20, (120, 210, 90)),
                    (20, 21, (230, 80, 60)), (25, 19, (250, 200, 60)), (7, 21, (80, 180, 240)), (16, 17, (230, 120, 200))):
        a[ellipse(x, y, 1.3, 1.0)] = c + (255,)
        put(a, x - 1, y - 1, tuple(min(255, v + 60) for v in c) + (255,))
    return a


def sky_bridge():
    arc = lambda x, base, depth: round(base + depth * math.sin((x - 4) / 24 * math.pi))
    a = paste(post(2, 10, 26), post(28, 10, 26))
    for x in range(4, 28, 3):                            # planks hanging in an arc
        paste(a, lit(rect(x, arc(x, 18, 4), x + 1, arc(x, 18, 4) + 1), WOOD_POST))
    a = outline(a)
    for x in range(4, 28):                               # the hand ropes, tied down to the planks
        put(a, x, arc(x, 11, 3), ROPE_LIGHT)
        if x % 3 == 0:
            for y in range(arc(x, 11, 3) + 1, arc(x, 18, 4)):
                put(a, x, y, ROPE_DARK[:3] + (200,))
    return item_shadow(a)


def cloud_walk():
    m = np.zeros((CELL, CELL), bool)
    for cx, cy, rx, ry in ((16, 19, 12, 6), (11, 16, 6, 6), (19, 13, 7, 7), (25, 18, 5, 4.5), (7, 20, 5, 4)):
        m |= ellipse(cx, cy, rx, ry)
    return outline(lit(m, ramp('#c8d6e8', 5, lo=0.35, hi=0.8), round_=0.9), (70, 84, 110, 255))


def campfire():
    a = blank()
    for x0, y0, x1, y1 in ((5, 27, 25, 21), (7, 21, 27, 27)):    # two crossed logs
        for t in np.linspace(0, 1, 40):
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for dy in (0, 1, 2):
                put(a, round(x), round(y) + dy - 1, ramp('#7a4a26', 4)[dy])
    a = outline(a)
    flame = (ellipse(16, 17, 5.5, 7.5) & (YY <= 22)) | poly_mask([(12, 13), (21, 13), (17, 3)])
    f = blank()
    f[flame] = (255, 140, 40, 255)
    f[flame & ellipse(16, 18.5, 2.8, 4.2)] = (255, 236, 160, 255)
    paste(a, outline(f, (140, 40, 10, 255)))
    for x, y in ((11, 8), (22, 7), (19, 2)):              # sparks
        put(a, x, y, (255, 200, 90, 255))
    return a


def build_obstacles(tiles):
    """obstacle/<id> for the agility course's eighteen obstacles (src/data/agility.js)."""
    tile = lambda p: Image.open(f'{tiles}/{p}.png').convert('RGBA')
    return {f'obstacle/{k}': v for k, v in {
        'rope_swing': from_image(tile('item/weapon/bullwhip')), 'log_balance': log_balance(), 'stepping_stones': stepping_stones(),
        'cargo_net': from_image(rehue(tile('item/weapon/ranged/throwing_net'), '#c8965a', sat=0.6, val=0.85)),
        'monkey_bars': monkey_bars(), 'tightrope': tightrope(), 'pipe_crawl': pipe_crawl(), 'wall_climb': wall_climb(),
        'gap_leap': from_image(tile('item/armour/artefact/urand_seven_league_boots')), 'zipline': zipline(),
        'hurdles': hurdles(), 'mud_pit': mud_pit(tiles), 'rooftop_run': rooftop(), 'waterfall': waterfall(),
        'rock_wall': rock_wall(), 'sky_bridge': sky_bridge(), 'lava_crossing': lava_crossing(tiles), 'cloud_walk': cloud_walk(),
    }.items()}


# perk id -> how its badge is made: a DCSS spell or god icon (rltiles/gui/...), or an item on a glow.
PERK_BADGES = {
    'knight': 'spells/enchantment/sure_blade', 'warlord': 'spells/enchantment/charming', 'rogue': 'spells/enchantment/haste',
    'forager': 'invocations/fedhas_grow_oklob', 'scholar': 'invocations/zin_recite', 'endurance': 'invocations/cheibriados_temporal_distortion',
    'gourmet': ('item/food/chunk', '#e07a3a', 0.8, '#c0743a'), 'fortune': ('item/gold/06', '#7ad04a', 1.0, None),
    'paragon': ('item/armour/artefact/urand_crown_of_vainglory', '#b46cf0', 0.8, None),
}


# ---------- glyphs: the small pictures beside numbers ----------

# icon/<id> from DCSS's status icons (misc/icons), blown up crisp: a heart for health, an hourglass for
# time, a star for experience, a burst for critical hits, wind for dodging, an arrow for an upgrade, a
# flame, a spark for a burst of speed, and Zz for the hours away
GLYPHS = {'heart': 'heart', 'time': 'slowed', 'xp': 'new_stair', 'crit': 'vengeance', 'dodge': 'still_winds',
          'up': 'strong_willed', 'flame': 'sticky_flame', 'spark': 'dazed', 'away': 'sleeping'}

# and the few DCSS has no icon for, drawn pixel by pixel in the same manner: a skull (a boss), a padlock,
# a die showing two (a double) and a green arrow turning back on itself (ingredients kept)
GLYPH_INKS = {'#': (16, 11, 8, 255), 'w': (238, 232, 216, 255), 'g': (160, 152, 140, 255), 'k': (30, 22, 16, 255),
              'y': (242, 192, 72, 255), 'o': (176, 116, 36, 255), 'e': (110, 214, 120, 255), 'd': (44, 136, 72, 255)}
DRAWN_GLYPHS = {
    'skull': ['..#######..', '.#wwwwwww#.', '#wwwwwwwww#', '#wwwwwwwwg#', '#wkkwwwkkg#', '#wkkwwwkkg#',
              '#wwwwkwwwg#', '.#wwwkwwg#.', '..#wwwwg#..', '..#wkwkg#..', '...#####...'],
    'lock': ['..#####..', '.#ggggg#.', '.#g###g#.', '.#g#.#g#.', '#########', '#yyyyyyy#',
             '#yyy#yyy#', '#yyy#yyy#', '#yyyyyyy#', '#ooooooo#', '#########'],
    'dice': ['.########.', '#wwwwwwww#', '#wkkwwwww#', '#wkkwwwww#', '#wwwwwwww#', '#wwwwwwww#',
             '#wwwwwkkw#', '#wwwwwkkw#', '#gggggggg#', '.########.'],
    'keep': ['......#e#....', '....###ee#...', '...#eeeeee#..', '..#eeeeeeee#.', '.#eee##ee##..', '#eee#.#e#....', '#ee#...#..##.',
             '#ee#.....#ee#', '#ee#.....#ee#', '#dee#...#eed#', '.#dee###eed#.', '..#deeeeed#..', '...#ddddd#...', '....#####....'],
}


def blow_up(img):
    """A tiny icon cropped to its pixels, scaled up by the largest whole number that fits, centred."""
    img = img.convert('RGBA')
    img = img.crop(img.getbbox())
    k = max(1, min((CELL - 4) // img.width, (CELL - 4) // img.height))
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    cell.paste(img, ((CELL - img.width) // 2, (CELL - img.height) // 2), img)
    return from_image(cell)


def bitmap(rows):
    img = Image.new('RGBA', (max(len(r) for r in rows), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in GLYPH_INKS:
                img.putpixel((x, y), GLYPH_INKS[ch])
    return img


def build_glyphs(tiles):
    out = {f'icon/{key}': blow_up(Image.open(f'{tiles}/misc/icons/{name}.png')) for key, name in GLYPHS.items()}
    out.update({f'icon/{key}': blow_up(bitmap(rows)) for key, rows in DRAWN_GLYPHS.items()})
    return out


# Skill capes (src/data/capes.js): the DCSS cloak in each skill's own cloth, with a gold hem. Their own
# colours rather than the skills' (four of those are greens and one is white).
CAPE_CLOTH = {
    'combat': '#b3141c', 'mining': '#6b7a99', 'smithing': '#3c3c46', 'woodcutting': '#2f8a3a',
    'farming': '#93bd28', 'alchemy': '#14a39a', 'fishing': '#2a6fdb', 'hunting': '#8a5a2c',
    'cooking': '#e6dfcb', 'firemaking': '#ea5a12', 'agility': '#4f46e5', 'crafting': '#c43fd8'}
CAPE_HEM = (233, 181, 74)
# The weekend events' festival cloaks (src/data/events.js `cloak`, data/capes.js): a silver hem, where a
# skill cape's is gold.
FESTIVAL_CLOTH = {
    'harvest_festival': '#c97a2a', 'titans_fury': '#8f1d1d', 'miners_rush': '#2f6f57',
    'guild_fair': '#a03aa8', 'gold_fever': '#d6b028', 'lucky_paws': '#e07aa8'}
FESTIVAL_HEM = (214, 222, 232)


def skill_cape(cloak, cloth, hem=CAPE_HEM):
    """The red cloak re-dyed `cloth`, its shading kept, and its lowest two rows of cloth gold: the hem
    that shows at the hero's feet and marks a cape from a rank's cloak."""
    a = from_image(cloak).astype(float)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    fabric = (al > 0) & (r > g + 25)
    v = np.maximum(np.maximum(r, g), b)
    shade = np.zeros_like(v)
    shade[fabric] = v[fabric] / v[fabric].max()
    c = np.array(rgb(cloth), float)
    for k in range(3):
        a[..., k][fabric] = np.clip(c[k] * (0.25 + shade[fabric]), 0, 255)
    ys, xs = np.nonzero(fabric)
    for x in np.unique(xs):
        for y in sorted(ys[xs == x])[-2:]:
            for k in range(3):
                a[y, x, k] = min(255, hem[k] * (0.45 + 0.75 * shade[y, x]))
    return a.astype(np.uint8)


def build_icons(tiles):
    """Cells for the game's own things: perk/<id>, tool/<id>, obstacle/<id>, icon/<id> (the glyphs beside
    numbers), the crate, the gear, the campfire, the crown (a medal), the festival token, the hero's hoe
    and his cloaks by rank."""
    tile = lambda p: Image.open(f'{tiles}/{p}.png').convert('RGBA')
    out = {}
    for pid, how in PERK_BADGES.items():
        if isinstance(how, str):
            out[f'perk/{pid}'] = badge(tile(f'gui/{how}'))
        else:
            path, glow, scale, roast = how
            img = browned(tile(path), roast) if roast else tile(path)
            out[f'perk/{pid}'] = badge_item(img, glow, scale)
    out.update({
        'tool/pickaxe': pickaxe(), 'tool/axe': from_image(tile('item/weapon/hand_axe1')), 'tool/bow': from_image(tile('item/weapon/ranged/shortbow1')),
        'tool/rod': fishing_rod(), 'tool/tinderbox': tinderbox(), 'tool/hoe': hoe(),
        'crate': from_image(tile('item/misc/misc_box_of_beasts_inert')), 'gear': gear(tiles),
        'hero/tool/farming': hoe_in_hand(tiles), 'campfire': campfire(),
        'crown': from_image(tile('item/armour/artefact/urand_crown_of_vainglory')),
        'token': from_image(rehue(tile('item/misc/misc_voucher'), '#e9b54a', sat=0.75, val=1.05)),   # a festival token
        # the hero's cloak by rank (src/data/ranks.js): DCSS cloaks, the gold one recoloured from the red
        **{f'hero/cloaks/{name}': from_image(tile(f'player/cloak/{src}')) for name, src in
           (('red', 'red'), ('green', 'green'), ('blue', 'blue'), ('purple', 'magenta'), ('white', 'white'), ('black', 'black'))},
        'hero/cloaks/gold': from_image(rehue(tile('player/cloak/red'), '#efb43c', sat=0.9, val=1.3)),
        'hero/shield_unique/void_aegis': from_image(rehue(tile('player/hand2/tower_shield_teal'), '#8b5cf6', sat=0.9, val=0.85)),
    })
    out.update(build_obstacles(tiles))
    out.update(build_glyphs(tiles))
    return {key: to_image(a) for key, a in out.items()}


# The guide's hand (src/ui/guide.js): a white glove with a gold cuff, the finger up, pointing at the one
# thing to do in a new hero's first minutes. Packed after everything else (tools/atlas.py).
TAP_HAND = ['.....##........', '....#ww#.......', '....#ww#.......', '....#ww#.......', '....#ww###.....',
            '....#ww#ww##...', '....#ww#ww#w##.', '.##.#ww#ww#ww#.', '#ww##ww#ww#ww#.', '#www#wwwwwwwww#',
            '.#wwwwwwwwwwww#', '..#wwwwwwwwwwg#', '..#wwwwwwwwwgg#', '...#wwwwwwwggg#', '....#wwwwwggg#.',
            '....##########.', '....#yyyyyyyy#.', '....#oooooooo#.', '....##########.']


def build_late(tiles):
    """Cells added after the first release, packed after every other cell, in the order added: the
    guide's hand; the cloaks of the ranks past Mythic (src/data/ranks.js): the DCSS dragonskin cloak,
    the cyan one, and the black one dyed the violet of the void."""
    tile = lambda p: Image.open(f'{tiles}/{p}.png').convert('RGBA')
    return {
        'icon/tap': to_image(blow_up(bitmap(TAP_HAND))),
        'hero/cloaks/dragon': to_image(from_image(tile('player/cloak/dragonskin'))),
        'hero/cloaks/cyan': to_image(from_image(tile('player/cloak/cyan'))),
        'hero/cloaks/void': to_image(from_image(rehue(tile('player/cloak/magenta'), '#5b21b6', sat=1.0, val=0.75))),
    }


def build_capes(tiles):
    """The skill capes, hero/capes/<skill> (packed last, so the cells before them keep their place)."""
    cloak = Image.open(f'{tiles}/player/cloak/red.png').convert('RGBA')
    return {f'hero/capes/{skill}': to_image(skill_cape(cloak, cloth)) for skill, cloth in CAPE_CLOTH.items()}


def build_festival_cloaks(tiles):
    """The weekend events' festival cloaks, hero/capes/fest_<event> (packed after everything else)."""
    cloak = Image.open(f'{tiles}/player/cloak/red.png').convert('RGBA')
    return {f'hero/capes/fest_{event}': to_image(skill_cape(cloak, cloth, FESTIVAL_HEM)) for event, cloth in FESTIVAL_CLOTH.items()}


def build_voidstone(tiles):
    """Crafting's deepest gem, res/voidstone: a DCSS gem darkened to the Abyss's violet (packed after everything else)."""
    gem = Image.open(f'{tiles}/item/gem/dungeon_found_whole.png').convert('RGBA')
    return {'res/voidstone': fit(colorize(gem, '#6d28d9', lo=0.8, hi=0.5))}


# ---------- the art direction: resource id -> how its cell is made ----------

def build(tiles):
    """Every resource's 32x32 cell, keyed by resource id."""
    tile = lambda p: Image.open(f'{tiles}/{p}.png').convert('RGBA')
    chunk, steak = tile('item/food/chunk'), tile('item/food/meat_ration')
    meat_raw = {'raw_rabbit': ('#f2b4a8', 1.3), 'raw_fox': ('#f08850', 1.2), 'raw_boar': ('#f590a0', 1.25), 'raw_deer': ('#c8303e', 0.95),
                'raw_bear': ('#9a4030', 0.85), 'raw_drake': ('#ff7a2a', 1.2), 'raw_dragon': ('#c04aae', 1.05)}
    roast = {'cooked_rabbit': '#d49a5a', 'cooked_fox': '#c0743a', 'cooked_bear': '#8a5030', 'cooked_drake': '#d2672c', 'cooked_dragon': '#9a5a86'}
    trout = lambda: fish('#5d7a3e', '#e8d9b8', stripe='#f08a8a', spots='#2c3a1c')
    salmon = lambda: fish('#5f7d96', '#f2b4b4', stripe='#f6a8a0')
    swordfish = lambda: fish('#2f5a9c', '#d4dde8', bill=True, x1=25, dorsal=1.8)
    shark = lambda: fish('#7c8796', '#eef1f4', dorsal=2.4, h=6.6)
    leviathan = lambda: fish('#3b3f9c', '#8fd3e8', h=7.2, x0=3, x1=28, dorsal=1.6, spots='#b8f0ff', eye=(255, 210, 90))
    gem = lambda name: tile(f'item/gem/{name}_found_whole')
    potion = lambda name: tile(f'item/potion/{name}')
    art = {
        # ores and bars, coloured by the game's metal colours
        'copper_ore': lambda: ore('#d9773a', seed=1), 'iron_ore': lambda: ore('#b36a4a', rock='#8b8580', seed=2),
        'coal': lambda: ore(None, seed=3, coal=True), 'silver_ore': lambda: ore('#eef2f7', rock='#7d7a80', seed=4),
        'mithril_ore': lambda: ore('#5b8cff', rock='#6f6a7a', seed=5), 'gold_ore': lambda: ore('#ffcf33', seed=6),
        'adamant_ore': lambda: ore('#2fc27a', rock='#6c7268', seed=7), 'runite_ore': lambda: ore('#22d3ee', rock='#5f6872', seed=8),
        'copper_bar': lambda: bar('#c47a3c'), 'iron_bar': lambda: bar('#9aa3ad'), 'silver_bar': lambda: bar('#d8dee6'),
        'mithril_bar': lambda: bar('#4f7df0'), 'gold_bar': lambda: bar('#f5c02a'), 'adamant_bar': lambda: bar('#1fa86a'),
        'runite_bar': lambda: bar('#14b8d6'),
        # gems: DCSS gems by colour
        'amethyst': lambda: gem('depths'), 'topaz': lambda: gem('orc'), 'sapphire': lambda: gem('shoals'),
        'emerald': lambda: gem('snake'), 'ruby': lambda: gem('tomb'), 'diamond': lambda: gem('spider'),
        # logs
        'normal_log': lambda: log('#8a5a2b'), 'oak_log': lambda: log('#a8742e', cut='#f0cf8e'), 'willow_log': lambda: log('#7d7f3a', cut='#e8dca0'),
        'maple_log': lambda: log('#a4482a', cut='#f2c49a'), 'yew_log': lambda: log('#4f3a2a', cut='#d9a873'),
        'magic_log': lambda: log('#4b3a8c', cut='#c8b8f0', magic=True),
        # meat: the DCSS chunk, recoloured per animal; roasts browned; boar and venison have their own shapes
        **{k: (lambda c=c, v=v: rehue(chunk, c, select=(300, 40), sat=0.5, val=v)) for k, (c, v) in meat_raw.items()},
        **{k: (lambda c=c: browned(chunk, c)) for k, c in roast.items()},
        'cooked_boar': lambda: tile('item/food/sausage'), 'cooked_deer': lambda: tile('item/food/beef_jerky'),
        # fish and shellfish, drawn; cooking browns them and marks them with the grill
        'raw_shrimp': lambda: shrimp('#f4a3a8'), 'raw_trout': trout, 'raw_salmon': salmon,
        'raw_lobster': lambda: lobster('#3f5f7a', claw='#4a6a8a'), 'raw_swordfish': swordfish, 'raw_shark': shark,
        'raw_leviathan': leviathan,
        'cooked_shrimp': lambda: shrimp('#ff8a4a'), 'cooked_trout': lambda: grill(trout()), 'cooked_salmon': lambda: grill(salmon(), light=True),
        'cooked_lobster': lambda: lobster('#e0402a'), 'cooked_swordfish': lambda: grill(swordfish()), 'cooked_shark': lambda: grill(shark(), light=True),
        'cooked_leviathan': lambda: bowl('#c8702e', bits=('#f2d06b', '#8fd3e8', '#7a3a1a')),
        # farm crops and dishes
        'potato': lambda: potato(), 'cabbage': cabbage, 'pumpkin': pumpkin, 'starfruit': starfruit,
        'baked_potato': lambda: potato(baked=True), 'cabbage_soup': lambda: bowl('#8cc45a', bits=('#d8f0b0', '#5a9a3a')),
        'pumpkin_pie': lambda: rehue(tile('item/food/pizza'), '#e8822a', select=(330, 70), sat=0.6),
        'starfruit_tart': lambda: rehue(tile('item/food/pizza'), '#f5cf2a', select=(330, 70), sat=0.7, val=1.1),
        # herbs: a leaf, a root, a spore cap, a lotus
        'guam_leaf': lambda: tile('mon/fungi_plants/plant_07'), 'marrentill_leaf': lambda: tile('mon/fungi_plants/withered_plant2'),
        'tarromin_leaf': lambda: tile('mon/fungi_plants/sleepcap'), 'harralander_leaf': lambda: tile('mon/fungi_plants/sacred_lotus'),
        # potions by colour
        'accuracy_potion': lambda: potion('ruby'), 'defense_potion': lambda: potion('brilliant_blue'),
        'evasion_potion': lambda: potion('emerald'), 'health_potion': lambda: potion('pink'),
        # the rest
        'essence': lambda: nugget('#b46cf0'), 'fishing_bait': lambda: rehue(tile('mon/aquatic/swamp_worm'), '#e89a8c', sat=0.6, val=1.15),
    }
    out = {}
    for rid, make in art.items():
        img = make()
        if isinstance(img, np.ndarray):
            img = to_image(img)
        out[rid] = fit(img)
    return out
