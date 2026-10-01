#!/usr/bin/env python3
"""Paint the battle scenes' backdrops: layered, parallax-ready landscapes made from noise, gradients
and glow (no image model, no downloads), plus tiled interiors from the DCSS dungeon tiles (CC0).

    python3 tools/backdrops.py [/path/to/rltiles] [--only scene,scene] [--sheet out.png]

Each scene gets up to four WebP layers in assets/backdrops/: <scene>-sky (opaque), <scene>-far,
<scene>-near (transparent where the sky shows) and, for interiors, <scene>-ground (a strip of
floor tiles). The CSS places them (style.css, .battle[data-scene]); the page's own particles,
vignette and fighters go on top. Everything is deterministic: a seed per scene.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1600, 400          # a battle scene layer
GROUND = 76               # the CSS ground strip: the horizon sits just above it
HORIZON = H - GROUND
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'backdrops')


# ---------- small painting toolkit ----------

def hexc(s):
    return np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)


def smooth_noise(h, w, cells, seed):
    """One octave: a small random grid, enlarged smoothly."""
    r = np.random.default_rng(seed)
    gh = max(2, int(cells * h / w) + 1)
    g = r.random((gh, cells + 1)).astype(np.float32)
    img = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255


def fbm(h, w, cells=4, octaves=5, seed=0, gain=0.5):
    total = np.zeros((h, w), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        total += amp * smooth_noise(h, w, cells * 2 ** o, seed + o * 101)
        norm += amp
        amp *= gain
    return total / norm


def ridge1d(w, seed, cells=6, octaves=5, ridged=False):
    """A skyline as 0..1 per column (1 = highest). `ridged` makes sharp peaks."""
    r = np.random.default_rng(seed)
    total = np.zeros(w, np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        c = cells * 2 ** o
        g = r.random(c + 1).astype(np.float32)
        line = np.asarray(Image.fromarray((g[None, :] * 255).astype(np.uint8)).resize((w, 1), Image.BICUBIC), dtype=np.float32)[0] / 255
        if ridged:
            line = 1 - np.abs(line * 2 - 1)
        total += amp * line
        norm += amp
        amp *= 0.5
    return total / norm


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


class Layer:
    """RGB in 0..1 plus alpha in 0..1."""

    def __init__(self, h=H, w=W, rgb=None, alpha=None):
        self.h, self.w = h, w
        self.rgb = np.zeros((h, w, 3), np.float32) if rgb is None else rgb
        self.alpha = np.zeros((h, w), np.float32) if alpha is None else alpha

    def over(self, top):
        """Composite another layer onto this one (premultiplied maths, straight storage)."""
        ta = top.alpha[..., None]
        ba = self.alpha[..., None]
        out_a = ta + ba * (1 - ta)
        safe = np.where(out_a > 0, out_a, 1)
        self.rgb = (top.rgb * ta + self.rgb * ba * (1 - ta)) / safe
        self.alpha = out_a[..., 0]
        return self

    def image(self, opaque=False):
        rgb = np.clip(self.rgb * 255 + 0.5, 0, 255).astype(np.uint8)
        if opaque:
            return Image.fromarray(rgb, 'RGB')
        a = np.clip(self.alpha * 255 + 0.5, 0, 255).astype(np.uint8)
        return Image.fromarray(np.dstack([rgb, a]), 'RGBA')

    @staticmethod
    def from_image(img):
        arr = np.asarray(img.convert('RGBA'), dtype=np.float32) / 255
        return Layer(arr.shape[0], arr.shape[1], arr[..., :3].copy(), arr[..., 3].copy())


def vgradient(stops, h=H, w=W):
    """Opaque sky from (position 0..1, hex) stops, with a little dithering grain so it doesn't band."""
    ys = np.linspace(0, 1, h, dtype=np.float32)
    pos = np.array([p for p, _ in stops], np.float32)
    cols = np.array([hexc(c) for _, c in stops], np.float32)
    rgb = np.stack([np.interp(ys, pos, cols[:, i]) for i in range(3)], axis=-1)  # (h,3)
    rgb = np.repeat(rgb[:, None, :], w, axis=1)
    rgb += (np.random.default_rng(7).random((h, w, 1)).astype(np.float32) - 0.5) / 160
    return Layer(h, w, rgb, np.ones((h, w), np.float32))


def glow(layer, cx, cy, rx, ry, color, strength=1.0, power=2.0):
    """Add light: a soft ellipse of `color` centred at (cx, cy) in pixels."""
    yy, xx = np.mgrid[0:layer.h, 0:layer.w].astype(np.float32)
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    g = np.exp(-d * power) * strength
    layer.rgb = np.clip(layer.rgb + hexc(color) * g[..., None], 0, 1)
    return layer


def disc(layer, cx, cy, r, color, soft=1.5):
    """A sun or moon: a hard disc with a soft edge."""
    yy, xx = np.mgrid[0:layer.h, 0:layer.w].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = 1 - smoothstep(r - soft, r + soft, d)
    layer.rgb = layer.rgb * (1 - a[..., None]) + hexc(color) * a[..., None]
    return layer


def stars(layer, n, seed, color='#ffffff', max_y=None, strength=1.0):
    r = np.random.default_rng(seed)
    max_y = max_y or layer.h
    xs = r.integers(1, layer.w - 1, n)
    ys = r.integers(1, max_y - 1, n)
    br = r.random(n).astype(np.float32) ** 2 * strength
    c = hexc(color)
    for x, y, b in zip(xs, ys, br):
        layer.rgb[y, x] = np.clip(layer.rgb[y, x] + c * b, 0, 1)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            layer.rgb[y + dy, x + dx] = np.clip(layer.rgb[y + dy, x + dx] + c * b * 0.35, 0, 1)
    return layer


def clouds(layer, color, seed, density=0.5, threshold=0.52, top=0.0, bottom=0.6, cells=3, alpha=0.9, soft=0.12):
    """Soft cloud banks over part of the sky."""
    n = fbm(layer.h, layer.w, cells=cells, octaves=5, seed=seed)
    ys = np.linspace(0, 1, layer.h, dtype=np.float32)[:, None]
    band = smoothstep(top - 0.05, top + 0.1, ys) * (1 - smoothstep(bottom - 0.1, bottom + 0.05, ys))
    a = smoothstep(threshold, threshold + soft, n) * band * alpha * density
    shade = 0.75 + 0.25 * smoothstep(threshold, threshold + 0.3, n)  # lighter tops
    top_layer = Layer(layer.h, layer.w, np.repeat((hexc(color) * 1)[None, None, :], layer.h, 0).repeat(layer.w, 1) * shade[..., None], a)
    return layer.over(top_layer)


def hills(skyline, top_color, bottom_color, h=H, w=W, fade_px=None, texture=0.12, seed=0, light=0.18, snow=None, snow_above=None):
    """Fill everything below a skyline (y per column, pixels) with a shaded gradient. Returns a Layer."""
    yy = np.arange(h, dtype=np.float32)[:, None]
    cov = np.clip(yy + 1 - skyline[None, :], 0, 1)
    depth = np.clip((yy - skyline[None, :]) / float(fade_px or (h - skyline.min())), 0, 1)[..., None]
    rgb = hexc(top_color) * (1 - depth) + hexc(bottom_color) * depth
    if light:
        slope = np.gradient(skyline)
        lit = np.clip(0.5 - slope * 0.35, 0, 1)  # the left-facing slopes catch the light
        near = np.exp(-np.clip(yy - skyline[None, :], 0, None) / 60.0)
        rgb = rgb * (1 + (lit[None, :] - 0.5) * 2 * light * near)[..., None]
    if texture:
        rgb = rgb * (1 + (fbm(h, w, cells=12, octaves=3, seed=seed + 7) - 0.5) * texture)[..., None]
    if snow is not None:
        cap = np.exp(-np.clip(yy - skyline[None, :], 0, None) / 26.0)
        if snow_above is not None:
            cap = cap * smoothstep(snow_above + 30, snow_above - 30, skyline)[None, :]
        cap = cap * (0.7 + 0.3 * fbm(h, w, cells=20, octaves=2, seed=seed + 11))
        rgb = rgb * (1 - cap[..., None]) + hexc(snow) * cap[..., None]
    return Layer(h, w, np.clip(rgb, 0, 1), cov)


def haze(layer, sky_color, strength):
    """Atmospheric perspective: fade a layer toward the sky."""
    layer.rgb = layer.rgb * (1 - strength) + hexc(sky_color) * strength
    return layer


def draw_layer(h=H, w=W):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def pines(skyline, seed, color, n=90, hmin=28, hmax=70, h=H, w=W, jitter=0.06):
    img, d = draw_layer(h, w)
    r = np.random.default_rng(seed)
    base = hexc(color)
    for _ in range(n):
        x = int(r.integers(-20, w + 20))
        ht = int(r.integers(hmin, hmax))
        y0 = float(skyline[min(max(x, 0), w - 1)]) + ht * 0.15
        c = tuple(int(v * 255) for v in np.clip(base * (1 + (r.random() - 0.5) * 2 * jitter), 0, 1))
        half = ht * 0.32
        for k, f in enumerate((1.0, 0.72, 0.45)):
            top = y0 - ht * (1 - k * 0.3)
            width = half * f
            d.polygon([(x, top), (x - width, y0 - ht * 0.3 * k * 0.9 + ht * 0.08), (x + width, y0 - ht * 0.3 * k * 0.9 + ht * 0.08)], fill=c)
        d.rectangle([x - 2, y0 - ht * 0.1, x + 2, y0 + 4], fill=c)
    return Layer.from_image(img)


def round_trees(skyline, seed, color, n=60, rmin=14, rmax=34, h=H, w=W, jitter=0.08):
    img, d = draw_layer(h, w)
    r = np.random.default_rng(seed)
    base = hexc(color)
    for _ in range(n):
        x = int(r.integers(0, w))
        rad = int(r.integers(rmin, rmax))
        y0 = float(skyline[x]) + 4
        c = tuple(int(v * 255) for v in np.clip(base * (1 + (r.random() - 0.5) * 2 * jitter), 0, 1))
        d.rectangle([x - 2, y0 - rad, x + 2, y0 + 6], fill=c)
        for k in range(3):
            ox = (k - 1) * rad * 0.55
            d.ellipse([x + ox - rad * 0.75, y0 - rad * 1.45 - (rad * 0.3 if k == 1 else 0), x + ox + rad * 0.75, y0 - rad * 0.2], fill=c)
    return Layer.from_image(img)


def spikes(seed, color, n, from_top, h=H, w=W, lmin=40, lmax=140, wmin=14, wmax=50, base_y=None):
    """Stalactites from the ceiling or stalagmites from a base line."""
    img, d = draw_layer(h, w)
    r = np.random.default_rng(seed)
    c = tuple(int(v * 255) for v in hexc(color))
    for _ in range(n):
        x = int(r.integers(0, w))
        ln = int(r.integers(lmin, lmax))
        wd = int(r.integers(wmin, wmax))
        if from_top:
            d.polygon([(x - wd, -4), (x + wd, -4), (x + r.integers(-4, 4), ln)], fill=c)
        else:
            by = base_y if base_y is not None else h
            d.polygon([(x - wd, by + 4), (x + wd, by + 4), (x + r.integers(-4, 4), by - ln)], fill=c)
    return Layer.from_image(img)


def crystals(seed, colors, n, y_center, y_spread, h=H, w=W, lmin=30, lmax=90, glow_px=18):
    """Clusters of glowing crystal shards."""
    img, d = draw_layer(h, w)
    r = np.random.default_rng(seed)
    for _ in range(n):
        x = int(r.integers(10, w - 10))
        y = int(y_center + (r.random() - 0.5) * 2 * y_spread)
        ln = int(r.integers(lmin, lmax))
        wd = max(6, ln // 5)
        tilt = (r.random() - 0.5) * 0.8
        col = hexc(colors[int(r.integers(0, len(colors)))])
        c = tuple(int(v * 255) for v in col)
        tip = (x + tilt * ln, y - ln)
        d.polygon([(x - wd, y), (x + wd, y), (tip[0] + wd * 0.4, tip[1] + ln * 0.18), tip, (tip[0] - wd * 0.4, tip[1] + ln * 0.18)], fill=c)
        d.line([(x, y), tip], fill=tuple(min(255, int(v * 255 * 1.4)) for v in col), width=2)
    shards = Layer.from_image(img)
    halo = Layer.from_image(img.filter(ImageFilter.GaussianBlur(glow_px)))
    halo.alpha *= 0.55
    out = Layer(h, w).over(halo).over(shards)
    return out


def columns(seed, color, n, base_y, h=H, w=W, hmin=120, hmax=260, wmin=22, wmax=40, broken=0.5):
    img, d = draw_layer(h, w)
    r = np.random.default_rng(seed)
    c = tuple(int(v * 255) for v in hexc(color))
    for _ in range(n):
        x = int(r.integers(30, w - 30))
        ht = int(r.integers(hmin, hmax))
        wd = int(r.integers(wmin, wmax))
        top = base_y - ht
        d.rectangle([x - wd // 2, top, x + wd // 2, base_y + 10], fill=c)
        if r.random() > broken:
            d.rectangle([x - wd // 2 - 6, top - 10, x + wd // 2 + 6, top + 4], fill=c)
        else:
            d.polygon([(x - wd // 2, top), (x + wd // 2, top - r.integers(6, 26)), (x + wd // 2, top + 8), (x - wd // 2, top + 8)], fill=c)
    return Layer.from_image(img)


def shafts(seed, color, h=H, w=W, angle=0.35, freq=0.012, alpha=0.22, fade_to=0.75):
    """Light shafts falling through water or dust."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx * np.cos(angle) + yy * np.sin(angle)
    n = fbm(h, w, cells=3, octaves=3, seed=seed)
    band = smoothstep(0.55, 0.95, (np.sin(u * freq + n * 2.5) + 1) / 2)
    fade = 1 - smoothstep(0.0, fade_to, yy / h)
    a = band * fade * alpha
    img = Layer(h, w, np.repeat(np.repeat(hexc(color)[None, None, :], h, 0), w, 1), a).image()
    return Layer.from_image(img.filter(ImageFilter.GaussianBlur(6)))


def lava_rivers(seed, n, top_y, bottom_y, h=H, w=W, color='#ff8a2a', hot='#ffe9a8'):
    img, d = draw_layer(h, w)
    r = np.random.default_rng(seed)
    for _ in range(n):
        x = float(r.integers(w // 2 - 160, w // 2 + 160))
        pts = []
        y = top_y
        while y < bottom_y:
            pts.append((x, y))
            x += (r.random() - 0.5) * 24
            y += 12
        d.line(pts, fill=tuple(int(v * 255) for v in hexc(color)), width=int(r.integers(2, 4)))
    rivers = Layer.from_image(img)
    halo = Layer.from_image(img.filter(ImageFilter.GaussianBlur(18)))
    halo.alpha *= 1.0
    return Layer(h, w).over(halo).over(rivers)


def aurora(layer, seed, y0=120, spread=55, alpha=0.5):
    h, w = layer.h, layer.w
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    n = fbm(h, w, cells=2, octaves=3, seed=seed)
    wave = np.sin(xx / 170 + n * 4) * 34
    band = np.exp(-((yy - (y0 + wave)) / spread) ** 2)
    t = np.clip((yy - (y0 + wave) + spread) / (2 * spread), 0, 1)[..., None]
    col = hexc('#5efc8d') * (1 - t) + hexc('#b16bff') * t
    a = band * (0.55 + 0.45 * fbm(h, w, cells=6, octaves=2, seed=seed + 3)) * alpha
    img = Layer(h, w, col, a).image().filter(ImageFilter.GaussianBlur(5))
    return layer.over(Layer.from_image(img))


def water(top_y, color_top, color_bottom, h=H, w=W, seed=0, shimmer='#9fd8ff'):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cov = smoothstep(top_y - 1, top_y + 1, yy)
    t = np.clip((yy - top_y) / max(1, h - top_y), 0, 1)[..., None]
    rgb = hexc(color_top) * (1 - t) + hexc(color_bottom) * t
    n = fbm(h, w, cells=40, octaves=2, seed=seed)
    ripple = smoothstep(0.62, 0.72, (np.sin(yy * 0.9 + n * 6) + 1) / 2 * n) * (1 - t[..., 0]) * 0.35
    rgb = np.clip(rgb + hexc(shimmer) * ripple[..., None], 0, 1)
    return Layer(h, w, rgb, cov)


def fog(y0, color, h=H, w=W, seed=0, thickness=60, alpha=0.5):
    yy = np.mgrid[0:h, 0:w][0].astype(np.float32)
    n = fbm(h, w, cells=5, octaves=3, seed=seed)
    a = np.exp(-((yy - y0 - (n - 0.5) * 40) / thickness) ** 2) * alpha * (0.6 + 0.4 * n)
    return Layer(h, w, np.repeat(np.repeat(hexc(color)[None, None, :], h, 0), w, 1), a)


def silhouette_giant(seed, color, cx, base_y, scale=1.0, h=H, w=W):
    """A colossal figure on the horizon: head, shoulders, arms, torso."""
    img, d = draw_layer(h, w)
    c = tuple(int(v * 255) for v in hexc(color))
    s = scale
    d.ellipse([cx - 44 * s, base_y - 330 * s, cx + 44 * s, base_y - 236 * s], fill=c)            # head
    d.rectangle([cx - 24 * s, base_y - 250 * s, cx + 24 * s, base_y - 220 * s], fill=c)          # neck
    d.rounded_rectangle([cx - 130 * s, base_y - 236 * s, cx + 130 * s, base_y - 60 * s], radius=40 * s, fill=c)  # torso
    d.rounded_rectangle([cx - 190 * s, base_y - 226 * s, cx - 120 * s, base_y - 10 * s], radius=28 * s, fill=c)  # arms
    d.rounded_rectangle([cx + 120 * s, base_y - 226 * s, cx + 190 * s, base_y - 10 * s], radius=28 * s, fill=c)
    d.rectangle([cx - 110 * s, base_y - 80 * s, cx + 110 * s, base_y + 20], fill=c)              # legs into the ground
    return Layer.from_image(img)


def tiles_strip(rltiles, names, h, w, scale=2, seed=0):
    """A strip of dungeon tiles (CC0), repeated across the width."""
    r = np.random.default_rng(seed)
    cell = 32 * scale
    strip = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for row in range((h + cell - 1) // cell):
        for col in range((w + cell - 1) // cell):
            name = names[int(r.integers(0, len(names)))]
            tile = Image.open(os.path.join(rltiles, 'dngn', name + '.png')).convert('RGBA').resize((cell, cell), Image.NEAREST)
            strip.paste(tile, (col * cell, row * cell), tile)
    return Layer.from_image(strip)


def darken(layer, factor):
    layer.rgb = layer.rgb * factor
    return layer


def save(layer, name, opaque=False, quality=80):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.webp')
    layer.image(opaque).save(path, 'WEBP', quality=quality, method=6)
    return os.path.getsize(path)


# ---------- the scenes ----------
# Each returns {'sky': Layer, 'far': Layer, 'near': Layer, 'ground': Layer or None}.

def scene_meadow():
    sky = vgradient([(0, '#2e4f86'), (0.45, '#8aa9cf'), (0.78, '#f2b57a'), (1, '#f6cf93')])
    glow(sky, 1250, 95, 260, 180, '#ffd79a', 0.55)
    disc(sky, 1250, 95, 26, '#fff4d6')
    clouds(sky, '#fff1dc', 21, density=0.9, threshold=0.55, top=0.05, bottom=0.55, alpha=0.75)
    far = hills(HORIZON - 150 - ridge1d(W, 3, cells=4, ridged=True) * 110, '#7c93b8', '#55688c', texture=0.1, light=0.12)
    haze(far, '#aebfdb', 0.35)
    far.over(hills(HORIZON - 70 - ridge1d(W, 4, cells=5) * 60, '#6f9a74', '#3f6a45', texture=0.14, light=0.2))
    near = hills(HORIZON - 12 - ridge1d(W, 5, cells=7) * 36, '#79b35e', '#2e5a2f', fade_px=200, texture=0.18, light=0.25)
    near.over(round_trees(HORIZON - 12 - ridge1d(W, 5, cells=7) * 36, 6, '#2c5a2e', n=26, rmin=12, rmax=24))
    flowers, d = draw_layer()
    r = np.random.default_rng(9)
    for _ in range(160):
        x, y = int(r.integers(0, W)), int(r.integers(HORIZON - 6, H - 20))
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 230, 140, 255) if r.random() < 0.6 else (255, 150, 170, 255))
    near.over(Layer.from_image(flowers))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_forest():
    sky = vgradient([(0, '#060d14'), (0.6, '#163a44'), (1, '#2d6c6e')])
    glow(sky, 330, 80, 120, 110, '#bfe4ff', 0.5)
    disc(sky, 330, 80, 20, '#eaf6ff')
    stars(sky, 90, 4, max_y=220, strength=0.9)
    far_line = HORIZON - 120 - ridge1d(W, 11, cells=4) * 70
    far = hills(far_line, '#163a32', '#0d2a22', texture=0.1, light=0.1)
    far.over(pines(far_line, 12, '#143127', n=150, hmin=50, hmax=120))
    haze(far, '#1f4a4c', 0.35)
    far.over(fog(HORIZON - 60, '#79b8a0', seed=13, thickness=36, alpha=0.35))
    near_line = HORIZON - 20 - ridge1d(W, 14, cells=6) * 24
    near = hills(near_line, '#0b1d14', '#060f0a', fade_px=300, texture=0.12, light=0.1)
    near.over(pines(near_line, 15, '#07160e', n=70, hmin=140, hmax=300, jitter=0.1))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_caves(rltiles):
    sky = vgradient([(0, '#07060e'), (0.5, '#161228'), (1, '#1f1a33')])
    glow(sky, 1080, 220, 420, 160, '#5cc8dc', 0.35, power=3)
    far = hills(HORIZON - 110 - ridge1d(W, 21, cells=5, ridged=True) * 120, '#2d2750', '#171330', texture=0.14, light=0.1)
    far.over(spikes(22, '#120f22', 26, True, lmin=70, lmax=200, wmin=18, wmax=60))
    far.over(crystals(23, ['#7ee8fa', '#a78bfa', '#67e8f9'], 22, HORIZON - 40, 50, lmin=30, lmax=80))
    near = hills(HORIZON - 18 - ridge1d(W, 24, cells=8) * 30, '#1a1530', '#0b0915', fade_px=260, texture=0.12)
    near.over(spikes(25, '#0a0812', 14, True, lmin=120, lmax=260, wmin=30, wmax=90))
    near.over(crystals(26, ['#7ee8fa', '#c084fc'], 10, HORIZON - 6, 10, lmin=50, lmax=120, glow_px=24))
    ground = tiles_strip(rltiles, ['floor/crystal_floor0', 'floor/crystal_floor1', 'floor/crystal_floor2', 'floor/crystal_floor3'], GROUND, W, seed=27) if rltiles else None
    return dict(sky=sky, far=far, near=near, ground=ground)


def scene_marsh():
    sky = vgradient([(0, '#0c1410'), (0.55, '#3b4a33'), (1, '#6a7a4e')])
    glow(sky, 420, 110, 150, 120, '#dfe9bb', 0.3)
    disc(sky, 420, 110, 18, '#e9efcf')
    far_line = HORIZON - 90 - ridge1d(W, 31, cells=5) * 40
    far = hills(far_line, '#33452c', '#1a2418', texture=0.14, light=0.12)
    dead, d = draw_layer()
    r = np.random.default_rng(32)
    for _ in range(26):
        x = int(r.integers(0, W))
        y0 = float(far_line[x])
        ht = int(r.integers(60, 150))
        d.line([(x, y0 + 6), (x + r.integers(-10, 10), y0 - ht)], fill=(28, 36, 24, 255), width=int(r.integers(3, 7)))
        for _ in range(3):
            by = y0 - ht * r.random() * 0.8
            d.line([(x, by), (x + r.integers(-40, 40), by - r.integers(10, 40))], fill=(28, 36, 24, 255), width=2)
    far.over(Layer.from_image(dead))
    haze(far, '#55684a', 0.3)
    near = water(HORIZON - 30, '#1f3a2c', '#07120a', seed=33, shimmer='#9fc98a')
    near.over(fog(HORIZON - 36, '#c6d9a8', seed=34, thickness=28, alpha=0.5))
    reeds, d = draw_layer()
    for _ in range(140):
        x = int(r.integers(0, W))
        ht = int(r.integers(30, 90))
        d.line([(x, HORIZON + 8), (x + r.integers(-6, 6), HORIZON + 8 - ht)], fill=(18, 30, 16, 255), width=2)
    near.over(Layer.from_image(reeds))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_highland():
    sky = vgradient([(0, '#101722'), (0.5, '#3a4556'), (1, '#6b7382')])
    clouds(sky, '#2a3240', 41, density=1.0, threshold=0.45, top=0.0, bottom=0.7, alpha=0.9, soft=0.2)
    clouds(sky, '#8f9aab', 42, density=0.6, threshold=0.58, top=0.2, bottom=0.8, alpha=0.5)
    far = hills(HORIZON - 150 - ridge1d(W, 43, cells=3, ridged=True) * 230, '#7d8aa0', '#3b4452', texture=0.14, light=0.3, snow='#eef2f8', snow_above=HORIZON - 250)
    haze(far, '#6b7686', 0.4)
    far.over(hills(HORIZON - 60 - ridge1d(W, 44, cells=5, ridged=True) * 120, '#2e3744', '#171c23', texture=0.16, light=0.25))
    near = hills(HORIZON - 14 - ridge1d(W, 45, cells=9) * 30, '#3d4a35', '#161a12', fade_px=240, texture=0.16, light=0.2)
    rocks, d = draw_layer()
    r = np.random.default_rng(46)
    for _ in range(40):
        x, y = int(r.integers(0, W)), int(HORIZON - r.integers(0, 24))
        s = int(r.integers(6, 22))
        d.polygon([(x - s, y + 6), (x - s * 0.5, y - s), (x + s * 0.6, y - s * 0.8), (x + s, y + 6)], fill=(38, 40, 46, 255))
    near.over(Layer.from_image(rocks))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_ruins():
    sky = vgradient([(0, '#02121a'), (0.5, '#0a3744'), (1, '#0f4d59')])
    glow(sky, 800, -40, 500, 260, '#5fd3e6', 0.35, power=2.5)
    far = columns(51, '#0b2e39', 14, HORIZON - 40, hmin=120, hmax=260, broken=0.5)
    far.over(hills(HORIZON - 50 - ridge1d(W, 52, cells=5) * 40, '#0d3340', '#07202a', texture=0.1, light=0.08))
    haze(far, '#1a5666', 0.35)
    far.over(shafts(53, '#bdf3ff', alpha=0.28))
    near = columns(54, '#041a22', 7, HORIZON + 10, hmin=200, hmax=330, wmin=34, wmax=56, broken=0.6)
    near.over(water(HORIZON - 26, '#0e4a58', '#031419', seed=55, shimmer='#8ee7f0'))
    bubbles, d = draw_layer()
    r = np.random.default_rng(56)
    for _ in range(60):
        x, y, s = int(r.integers(0, W)), int(r.integers(40, H)), int(r.integers(2, 6))
        d.ellipse([x - s, y - s, x + s, y + s], outline=(160, 230, 240, 120), width=1)
    near.over(Layer.from_image(bubbles))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_volcano(rltiles):
    sky = vgradient([(0, '#120303'), (0.5, '#3a0c06'), (1, '#7a2410')])
    clouds(sky, '#2a0906', 61, density=1.0, threshold=0.45, top=0.0, bottom=0.6, alpha=0.9, soft=0.2)
    glow(sky, 800, HORIZON - 150, 420, 200, '#ff6a1a', 0.6, power=2.2)
    cone = HORIZON + 10 - np.clip(230 - np.abs(np.arange(W) - 800) * 0.42, 0, None) - ridge1d(W, 62, cells=12, octaves=3) * 18
    far = hills(cone, '#3a1510', '#160605', texture=0.16, light=0.18)
    far.over(lava_rivers(63, 5, HORIZON - 210, HORIZON + 10))
    glow(far, 800, HORIZON - 212, 130, 44, '#ffb347', 1.2, power=1.6)
    far.over(hills(HORIZON - 70 - ridge1d(W, 64, cells=5, ridged=True) * 70, '#2a0d09', '#120504', texture=0.14, light=0.12))
    near = hills(HORIZON - 16 - ridge1d(W, 65, cells=8) * 28, '#1c0906', '#0a0302', fade_px=240, texture=0.14, light=0.1)
    cracks, d = draw_layer()
    r = np.random.default_rng(66)
    for _ in range(30):
        x, y = int(r.integers(0, W)), int(r.integers(HORIZON - 10, H - 10))
        pts = [(x, y)]
        for _ in range(4):
            pts.append((pts[-1][0] + r.integers(-30, 30), pts[-1][1] + r.integers(-6, 6)))
        d.line(pts, fill=(255, 120, 40, 255), width=2)
    cr = Layer.from_image(cracks)
    halo = Layer.from_image(cracks.filter(ImageFilter.GaussianBlur(8)))
    near.over(halo).over(cr)
    ground = tiles_strip(rltiles, [f'floor/lava{i:02d}' for i in range(12)], GROUND, W, seed=67) if rltiles else None
    return dict(sky=sky, far=far, near=near, ground=ground)


def scene_frost(rltiles):
    sky = vgradient([(0, '#0b1426'), (0.55, '#3b5b8a'), (1, '#9fb7d6')])
    aurora(sky, 71, y0=110, spread=50, alpha=0.5)
    stars(sky, 120, 72, max_y=200, strength=0.8)
    glow(sky, 1230, 90, 120, 110, '#eaf4ff', 0.45)
    disc(sky, 1230, 90, 22, '#f6fbff')
    far = hills(HORIZON - 150 - ridge1d(W, 73, cells=4, ridged=True) * 180, '#dfe9f5', '#7f98ba', texture=0.1, light=0.25, snow='#ffffff', snow_above=HORIZON)
    haze(far, '#8fa9cc', 0.25)
    far.over(hills(HORIZON - 60 - ridge1d(W, 74, cells=6, ridged=True) * 70, '#b9cce4', '#5d7799', texture=0.12, light=0.25))
    near = hills(HORIZON - 14 - ridge1d(W, 75, cells=9) * 26, '#e4eef8', '#8ea4c0', fade_px=220, texture=0.1, light=0.2)
    near.over(pines(HORIZON - 14 - ridge1d(W, 75, cells=9) * 26, 76, '#1e3448', n=46, hmin=40, hmax=110))
    near.over(crystals(77, ['#cfeeff', '#9fd8ff'], 8, HORIZON - 4, 8, lmin=30, lmax=80, glow_px=14))
    ground = tiles_strip(rltiles, ['floor/frozen0', 'floor/frozen1', 'floor/frozen2', 'floor/frozen3', 'floor/frozen4'], GROUND, W, seed=78) if rltiles else None
    return dict(sky=sky, far=far, near=near, ground=ground)


def scene_skyreach():
    sky = vgradient([(0, '#0d1a3f'), (0.5, '#4f74bf'), (1, '#9fbbe6')])
    glow(sky, 1280, 80, 240, 170, '#fff5cf', 0.6)
    disc(sky, 1280, 80, 28, '#fffaf0')
    stars(sky, 40, 81, max_y=120, strength=0.6)
    far = clouds(Layer(), '#f1f5ff', 82, density=1.0, threshold=0.5, top=0.5, bottom=1.1, alpha=0.95, soft=0.15)
    far.over(hills(HORIZON - 170 - ridge1d(W, 83, cells=3, ridged=True) * 150, '#6f86b8', '#3a4f80', texture=0.1, light=0.2))
    haze(far, '#8fa8d8', 0.4)
    near = clouds(Layer(), '#ffffff', 84, density=1.0, threshold=0.46, top=0.62, bottom=1.2, alpha=1.0, soft=0.12)
    isl, d = draw_layer()
    r = np.random.default_rng(85)
    for cx, cy, wd in ((220, HORIZON - 60, 150), (1380, HORIZON - 90, 190), (760, HORIZON - 30, 120)):
        d.ellipse([cx - wd, cy - 14, cx + wd, cy + 14], fill=(58, 112, 74, 255))
        d.polygon([(cx - wd * 0.9, cy), (cx + wd * 0.9, cy), (cx + wd * 0.3, cy + wd * 0.8), (cx - wd * 0.1, cy + wd * 1.0)], fill=(52, 60, 90, 255))
        for _ in range(3):
            tx = cx + int(r.integers(-wd * 0.6, wd * 0.6))
            d.polygon([(tx, cy - 36), (tx - 9, cy - 8), (tx + 9, cy - 8)], fill=(30, 72, 48, 255))
    near.over(Layer.from_image(isl))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_abyss(rltiles):
    sky = vgradient([(0, '#030008'), (0.5, '#1a0730'), (1, '#2a0d44')])
    n = fbm(H, W, cells=2, octaves=5, seed=91)
    swirl = smoothstep(0.5, 0.75, n)
    sky.rgb = np.clip(sky.rgb + hexc('#7c3aed') * swirl[..., None] * 0.35, 0, 1)
    glow(sky, 800, 140, 160, 120, '#f0abfc', 0.55, power=2.5)
    disc(sky, 800, 140, 36, '#2a0d44')
    glow(sky, 800, 140, 44, 44, '#f0abfc', 0.9, power=4)
    stars(sky, 160, 92, max_y=H, color='#e9d5ff', strength=0.7)
    far = hills(HORIZON - 140 - ridge1d(W, 93, cells=5, ridged=True) * 150, '#2b0f4a', '#120524', texture=0.14, light=0.12)
    far.over(crystals(94, ['#c084fc', '#f472b6', '#a78bfa'], 20, HORIZON - 70, 60, lmin=40, lmax=130, glow_px=22))
    haze(far, '#2a0d44', 0.2)
    near = hills(HORIZON - 18 - ridge1d(W, 95, cells=8) * 30, '#140726', '#060210', fade_px=240, texture=0.14, light=0.1)
    near.over(crystals(96, ['#c084fc', '#e879f9'], 10, HORIZON - 4, 10, lmin=60, lmax=150, glow_px=26))
    ground = tiles_strip(rltiles, ['floor/black_cobalt01', 'floor/black_cobalt02', 'floor/black_cobalt03', 'floor/black_cobalt04', 'floor/black_cobalt05'], GROUND, W, seed=97) if rltiles else None
    return dict(sky=sky, far=far, near=near, ground=ground)


def scene_dungeon(rltiles):
    wall_names = [f'wall/brick_dark_3_{i}' for i in range(16)]
    sky = tiles_strip(rltiles, wall_names, H, W, seed=101)
    sky.alpha[:] = 1
    darken(sky, 0.78)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    sky.rgb = sky.rgb * (0.55 + 0.45 * (1 - yy))[..., None]  # darker toward the floor
    glow(sky, 160, 150, 120, 120, '#ff9a3c', 0.3)
    glow(sky, W - 160, 150, 120, 120, '#ff9a3c', 0.3)
    far = Layer()
    pillars, d = draw_layer()
    for cx in (330, 800, 1270):
        d.rectangle([cx - 30, 0, cx + 30, H], fill=(22, 16, 12, 255))
        d.rectangle([cx - 38, 0, cx + 38, 26], fill=(28, 20, 14, 255))
    far.over(Layer.from_image(pillars))
    far.over(fog(HORIZON - 10, '#3a2a1c', seed=102, thickness=40, alpha=0.3))
    near = Layer()
    ground = tiles_strip(rltiles, [f'floor/cobble_blood{i}' for i in range(1, 13)], GROUND, W, seed=103)
    darken(ground, 0.8)
    return dict(sky=sky, far=far, near=near, ground=ground)


def scene_titan():
    sky = vgradient([(0, '#07080c'), (0.55, '#2a2f3b'), (1, '#4a505d')])
    clouds(sky, '#14171d', 111, density=1.0, threshold=0.42, top=0.0, bottom=0.8, alpha=0.95, soft=0.22)
    glow(sky, 800, 60, 500, 200, '#8a93a8', 0.18)
    far = silhouette_giant(112, '#141820', 800, HORIZON + 10, scale=1.0)
    eyes = Layer()
    glow(eyes, 775, HORIZON - 290, 10, 7, '#ef4444', 1.0, power=1.2)
    glow(eyes, 825, HORIZON - 290, 10, 7, '#ef4444', 1.0, power=1.2)
    eyes.alpha = np.clip(eyes.rgb.max(axis=-1) * 1.5, 0, 1)
    far.over(eyes)
    far.over(hills(HORIZON - 60 - ridge1d(W, 113, cells=6, ridged=True) * 60, '#262b36', '#13161c', texture=0.14, light=0.14))
    near = hills(HORIZON - 14 - ridge1d(W, 114, cells=9) * 24, '#1b1f27', '#0b0d11', fade_px=240, texture=0.14, light=0.1)
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_river():
    sky = vgradient([(0, '#2e4f86'), (0.5, '#8fb3d9'), (1, '#dbe9f5')])
    glow(sky, 1200, 90, 220, 160, '#fff1c9', 0.5)
    disc(sky, 1200, 90, 24, '#fff8e6')
    clouds(sky, '#ffffff', 121, density=0.8, threshold=0.56, top=0.0, bottom=0.5, alpha=0.8)
    line = HORIZON - 120 - ridge1d(W, 122, cells=4) * 70
    far = hills(line, '#6f9a74', '#3f6a45', texture=0.12, light=0.2)
    far.over(round_trees(line, 123, '#2f6a3a', n=40, rmin=10, rmax=22))
    haze(far, '#a9c4dd', 0.3)
    near = water(HORIZON - 40, '#3f84b8', '#123a5a', seed=124, shimmer='#dff3ff')
    reeds, d = draw_layer()
    r = np.random.default_rng(125)
    for _ in range(90):
        x = int(r.integers(0, W))
        ht = int(r.integers(26, 70))
        d.line([(x, HORIZON + 8), (x + r.integers(-5, 5), HORIZON + 8 - ht)], fill=(34, 72, 40, 255), width=2)
    near.over(Layer.from_image(reeds))
    return dict(sky=sky, far=far, near=near, ground=None)


def scene_camp():
    """The forest clearing at night, lit by the campfire that the page draws in front."""
    parts = scene_forest()
    glow(parts['sky'], 800, HORIZON - 20, 460, 240, '#ff9a3c', 0.45, power=2.0)
    glow(parts['far'], 800, HORIZON - 10, 400, 170, '#ff8a2a', 0.5, power=2.0)
    glow(parts['near'], 800, HORIZON + 10, 340, 130, '#ff8a2a', 0.7, power=1.8)
    return parts


def scene_workshop(rltiles):
    """A warm wooden hall for the crafting bench."""
    sky = tiles_strip(rltiles, [f'wall/brick_brown{i}' for i in range(8)], H, W, seed=131)
    sky.alpha[:] = 1
    darken(sky, 0.72)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    sky.rgb = sky.rgb * (0.6 + 0.4 * (1 - yy))[..., None]
    glow(sky, 800, 110, 320, 220, '#ffb45a', 0.32)
    far = Layer()
    beams, d = draw_layer()
    for cx in (260, 800, 1340):
        d.rectangle([cx - 26, 0, cx + 26, H], fill=(46, 30, 18, 255))
    d.rectangle([0, 0, W, 22], fill=(46, 30, 18, 255))
    far.over(Layer.from_image(beams))
    far.over(fog(HORIZON - 10, '#5a3a20', seed=132, thickness=40, alpha=0.25))
    ground = tiles_strip(rltiles, [f'floor/limestone{i}' for i in range(8)], GROUND, W, seed=133)
    darken(ground, 0.7)
    return dict(sky=sky, far=far, near=Layer(), ground=ground)


SCENES = {
    'river': lambda t: scene_river(), 'camp': lambda t: scene_camp(), 'workshop': scene_workshop,
    'meadow': lambda t: scene_meadow(), 'forest': lambda t: scene_forest(), 'caves': scene_caves, 'marsh': lambda t: scene_marsh(),
    'highland': lambda t: scene_highland(), 'ruins': lambda t: scene_ruins(), 'volcano': scene_volcano, 'frost': scene_frost,
    'skyreach': lambda t: scene_skyreach(), 'abyss': scene_abyss, 'dungeon': scene_dungeon, 'titan': lambda t: scene_titan(),
}


def composite(parts):
    """What the page will show: sky, far, near and the ground strip (or the CSS ground's colour)."""
    out = Layer(rgb=parts['sky'].rgb.copy(), alpha=np.ones((H, W), np.float32))
    out.over(parts['far']).over(parts['near'])
    if parts.get('ground') is not None:
        g = Layer()
        g.rgb[H - GROUND:] = parts['ground'].rgb
        g.alpha[H - GROUND:] = parts['ground'].alpha
        out.over(g)
    return out


def main():
    args = sys.argv[1:]
    rltiles = next((a for a in args if not a.startswith('--') and os.path.isdir(a)), None)
    only = None
    sheet = None
    for i, a in enumerate(args):
        if a == '--only':
            only = args[i + 1].split(',')
        if a == '--sheet':
            sheet = args[i + 1]
    names = [n for n in SCENES if not only or n in only]
    thumbs = []
    total = 0
    for name in names:
        parts = SCENES[name](rltiles)
        sizes = [save(parts['sky'], f'{name}-sky', opaque=True, quality=82), save(parts['far'], f'{name}-far', quality=80), save(parts['near'], f'{name}-near', quality=80)]
        if parts.get('ground') is not None:
            sizes.append(save(parts['ground'], f'{name}-ground', quality=85))
        total += sum(sizes)
        print(f'{name:9} {" + ".join(f"{s // 1024}K" for s in sizes)}')
        if sheet:
            thumbs.append((name, composite(parts).image(opaque=True).resize((W // 4, H // 4), Image.LANCZOS)))
    print(f'total {total // 1024} KB')
    if sheet:
        cols = 2
        rows = (len(thumbs) + cols - 1) // cols
        board = Image.new('RGB', (cols * (W // 4 + 10), rows * (H // 4 + 24)), (20, 16, 12))
        d = ImageDraw.Draw(board)
        for i, (name, th) in enumerate(thumbs):
            x, y = (i % cols) * (W // 4 + 10), (i // cols) * (H // 4 + 24)
            board.paste(th, (x, y + 18))
            d.text((x + 4, y + 2), name, fill=(240, 220, 180))
        board.save(sheet)


if __name__ == '__main__':
    main()
