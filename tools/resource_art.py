"""Pixel art for the game's 73 resources, one 32x32 cell each, packed by tools/atlas.py.

Where Dungeon Crawl Stone Soup has a fitting tile (CC0) it is used, often recolored: gems, potions,
meat, fruit and vegetables, herbs, the worm for bait. The rest (ores, bars, logs, fish, shrimp,
lobster, bowls, pies) is drawn here in the same manner as those tiles: a dark outline, light from
the top left, a handful of flat tones per material, and per-tier colors taken from the game's own
resource colors so that a mithril bar matches mithril ore everywhere.
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
