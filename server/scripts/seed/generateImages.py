"""Draws a flat-lay catalogue photo for every product in products.json.

The shop's catalogue photos are 4:5 with the product name printed along the bottom.
The price-tag card only shows the band from 10% to 82% of the height, so the garment
sits inside that band and the name sits below it.

    python3 generateImages.py        # writes images/<slug>.png
"""

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
OUT = HERE / "images"

W, H = 1000, 1250  # design space (4:5)
S = 2  # drawn at 2x, then scaled down for smooth edges
GROUND = "#e6e0d3"  # the tag's photo ground (paper-dim)
INK = "#1a1a1a"
MUTE = "#6e685e"
CATEGORY_NAMES = {"Tshirt": "T-SHIRT", "Sweat Shirt": "SWEATSHIRT", "Joggers": "JOGGERS"}

HELVETICA = "/System/Library/Fonts/HelveticaNeue.ttc"


def font(size, index=1):
    # HelveticaNeue.ttc: 1 = Bold, 9 = Condensed Black, 10 = Medium
    return ImageFont.truetype(HELVETICA, size * S, index=index)


def hex_rgb(color):
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))


def shade(color, amount):
    """amount < 1 darkens, > 1 lightens towards white."""
    r, g, b = hex_rgb(color)
    if amount <= 1:
        return tuple(int(c * amount) for c in (r, g, b))
    t = amount - 1
    return tuple(int(c + (255 - c) * t) for c in (r, g, b))


def pts(points):
    return [(x * S, y * S) for x, y in points]


def mirror(points):
    return [(W - x, y) for x, y in points]


# ---------------------------------------------------------------- garment shapes
# Each returns the pieces to fill (in order) and the seam lines to draw on top.


def tee_shapes(fit):
    widths = {"regular": 170, "boxy": 185, "oversized": 200, "crop": 160, "longline": 170}
    hems = {"regular": 940, "boxy": 880, "oversized": 960, "crop": 780, "longline": 1000}
    half, hem = widths[fit], hems[fit]
    drop = 40 if fit in ("oversized", "boxy", "longline") else 0
    sleeve_len = 150 if fit in ("oversized", "boxy") else 125
    l = 500 - half
    body = [
        (430, 175), (l + 15, 200 + drop // 3), (l, 240 + drop),
        (l, hem), (1000 - l, hem),
        (1000 - l, 240 + drop), (1000 - l - 15, 200 + drop // 3), (570, 175),
    ]
    sleeve = [
        (l + 15, 200 + drop // 3), (l - sleeve_len, 300 + drop), (l - sleeve_len + 55, 430 + drop),
        (l, 380 + drop),
    ]
    return body, [sleeve, mirror(sleeve)], (l, hem, drop)


def sweat_shapes(fit):
    half = 200 if fit == "oversized" else 180
    hem = 800 if fit == "crop" else 880
    drop = 40 if fit == "oversized" else 0
    l = 500 - half
    body = [
        (430, 180), (l + 10, 205 + drop // 3), (l, 245 + drop),
        (l, hem), (1000 - l, hem),
        (1000 - l, 245 + drop), (1000 - l - 10, 205 + drop // 3), (570, 180),
    ]
    puff = 25 if fit == "crop" else 0
    sleeve = [
        (l + 10, 205 + drop // 3), (l - 95 - puff, 330 + drop), (l - 135 - puff, 770),
        (l - 45, 782), (l, 430 + drop),
    ]
    cuff = [(l - 135 - puff, 770), (l - 45, 782), (l - 50, 860), (l - 135, 850)]
    return body, [sleeve, mirror(sleeve)], [cuff, mirror(cuff)], (l, hem)


def jogger_shapes(fit):
    top, crotch = 235, 470
    if fit == "wide":
        leg = [(330, top), (500, top), (500, crotch - 30), (478, 980), (296, 980), (318, 460)]
        cuff = None
    else:
        hem = 900
        out_hem, in_hem = {"tapered": (365, 470), "relaxed": (345, 478)}[fit]
        leg = [(330, top), (500, top), (500, crotch), (in_hem, hem), (out_hem, hem), (316, 460)]
        cuff = [(out_hem, hem), (in_hem, hem), (in_hem - 3, 975), (out_hem + 3, 975)]
    return leg, cuff, top, crotch


# ---------------------------------------------------------------- drawing helpers


def rib(draw, poly, color, step=14, vertical=True):
    """Ribbed-knit band: a darker fill with fine lines across it."""
    draw.polygon(pts(poly), fill=shade(color, 0.86))
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    mask = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(mask).polygon(pts(poly), fill=255)
    lines = Image.new("L", (W * S, H * S), 0)
    ld = ImageDraw.Draw(lines)
    if vertical:
        for x in range(int(min(xs)), int(max(xs)), step):
            ld.line([(x * S, min(ys) * S), ((x + 6) * S, max(ys) * S)], fill=255, width=2 * S)
    else:
        for y in range(int(min(ys)), int(max(ys)), step // 2):
            ld.line([(min(xs) * S, y * S), (max(xs) * S, y * S)], fill=255, width=2 * S)
    lines = ImageChops.multiply(lines, mask)
    draw._image.paste(shade(color, 0.78), mask=lines)


def marl(layer, mask, seed):
    """Heathered grey: speckle the fabric with lighter and darker flecks."""
    rnd = random.Random(seed)
    speck = Image.new("L", layer.size, 0)
    sd = ImageDraw.Draw(speck)
    for _ in range(9000):
        x, y = rnd.randrange(layer.size[0]), rnd.randrange(layer.size[1])
        sd.line([(x, y), (x + rnd.randint(2, 7) * S, y)], fill=rnd.choice((40, 70)), width=S)
    speck = ImageChops.multiply(speck, mask)
    layer.paste((255, 255, 255), mask=speck.point(lambda v: 60 if v == 40 else 0))
    layer.paste((70, 70, 70), mask=speck.point(lambda v: 50 if v == 70 else 0))


def seam(draw, a, b, color, width=3):
    draw.line(pts([a, b]), fill=shade(color, 0.8), width=width * S)


def centered_text(draw, text, y, fnt, fill, tracking=0):
    """Text centred on the page, with optional letter spacing (in design px)."""
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + tracking * S * (len(text) - 1)
    x = (W * S - total) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y * S), ch, font=fnt, fill=fill)
        x += w + tracking * S


def fit_font(draw, text, max_width, size, index):
    while size > 12:
        fnt = font(size, index)
        if draw.textlength(text, font=fnt) <= max_width * S:
            return fnt
        size -= 2
    return font(size, index)


# ---------------------------------------------------------------- prints


def draw_print(draw, spec, cx, top, garment_color):
    if not spec:
        return
    kind, color = spec["type"], spec.get("color", INK)
    if kind == "text":
        fnt = fit_font(draw, spec["text"], 230, 88, 9)
        centered_text(draw, spec["text"], top + 90, fnt, color, tracking=4)
    elif kind == "chest":
        fnt = font(26, 1)
        draw.text(((cx + 45) * S, (top + 70) * S), spec["text"], font=fnt, fill=color)
    elif kind == "pocket":
        box = [(cx + 45, top + 70), (cx + 130, top + 70), (cx + 130, top + 165), (cx + 87, top + 178), (cx + 45, top + 165)]
        draw.polygon(pts(box), fill=shade(garment_color, 0.9))
        draw.line(pts(box + [box[0]]), fill=shade(garment_color, 0.75), width=3 * S)
        draw.line(pts([(cx + 45, top + 84), (cx + 130, top + 84)]), fill=shade(garment_color, 0.75), width=2 * S)
    elif kind == "stripes":
        for y in range(top + 20, top + 760, 44):
            draw.rectangle(pts([(0, y), (W, y + 14)]), fill=color)
    elif kind == "blot":
        rnd = random.Random(7)
        cx0, cy0 = 500, top + 190
        draw.ellipse(pts([(cx0 - 95, cy0 - 80), (cx0 + 95, cy0 + 85)]), fill=color)
        for _ in range(16):
            r = rnd.randint(10, 38)
            dx, dy = rnd.randint(-150, 150), rnd.randint(-120, 130)
            draw.ellipse(pts([(cx0 + dx - r, cy0 + dy - r), (cx0 + dx + r, cy0 + dy + r)]), fill=color)
    elif kind == "grid":
        for x in range(0, W, 38):
            draw.line(pts([(x, 0), (x, H)]), fill=color, width=S)
        for y in range(0, H, 38):
            draw.line(pts([(0, y), (W, y)]), fill=color, width=S)
    elif kind == "patch":
        x0, y0 = cx - 150, top + 560
        draw.polygon(pts([(x0, y0), (x0 + 70, y0), (x0 + 70, y0 + 50), (x0 + 50, y0 + 70), (x0, y0 + 70)]), fill=color)
        draw.polygon(pts([(x0 + 70, y0 + 50), (x0 + 50, y0 + 50), (x0 + 50, y0 + 70)]), fill=shade(color, 0.85))


# ---------------------------------------------------------------- garments


def paint_garment(product):
    art = product["art"]
    color = art["color"]
    layer = Image.new("RGB", (W * S, H * S), color)
    mask = Image.new("L", (W * S, H * S), 0)
    md = ImageDraw.Draw(mask)
    d = ImageDraw.Draw(layer)
    edge = shade(color, 0.72)
    outline = art.get("outline")

    if art["kind"] == "tee":
        body, sleeves, (l, hem, drop) = tee_shapes(art["fit"])
        for piece in [body, *sleeves]:
            md.polygon(pts(piece), fill=255)
        # Stripes or grids run across the whole fabric; the mask trims them to shape.
        if art.get("print", {}) and art["print"]["type"] in ("stripes",):
            draw_print(d, art["print"], 500, 200, color)
        if art.get("marl"):
            marl(layer, mask, product["slug"])
        for s in sleeves:
            seam(d, s[0], s[-1], color)
        # Sleeve hems and the body hem.
        for s in sleeves:
            d.line(pts([s[1], s[2]]), fill=edge, width=10 * S)
        d.line(pts([(l, hem - 4), (1000 - l, hem - 4)]), fill=edge, width=8 * S)
        if art.get("print") and art["print"]["type"] != "stripes":
            draw_print(d, art["print"], 500, 250 + drop, color)
        neck(d, color, 175)
    elif art["kind"] == "sweat":
        body, sleeves, cuffs, (l, hem) = sweat_shapes(art["fit"])
        sleeve_color = art.get("sleeveColor", color)
        for piece in [body, *sleeves, *cuffs]:
            md.polygon(pts(piece), fill=255)
        if art.get("print") and art["print"]["type"] == "grid":
            draw_print(d, art["print"], 500, 200, color)
        if art.get("marl"):
            marl(layer, mask, product["slug"])
        for s in sleeves:
            d.polygon(pts(s), fill=hex_rgb(sleeve_color) if sleeve_color != color else None)
            seam(d, s[0], s[-1], color)
        for c in cuffs:
            rib(d, c, sleeve_color, step=12)
        band = [(l, hem), (1000 - l, hem), (1000 - l - 4, hem + 72), (l + 4, hem + 72)]
        md.polygon(pts(band), fill=255)
        rib(d, band, color, step=12)
        if art.get("print") and art["print"]["type"] != "grid":
            draw_print(d, art["print"], 500, 250, color)
        neck(d, color, 180, width=26)
    else:
        leg, cuff, top, crotch = jogger_shapes(art["fit"])
        legs = [leg, mirror(leg)]
        for piece in legs:
            md.polygon(pts(piece), fill=255)
        waist = [(322, 165), (678, 165), (672, top + 5), (328, top + 5)]
        md.polygon(pts(waist), fill=255)
        if art.get("marl"):
            marl(layer, mask, product["slug"])
        if art.get("rib"):
            for x in range(320, 690, 16):
                d.line(pts([(x, top), (x, 1000)]), fill=shade(color, 0.9), width=2 * S)
        seam(d, (500, top), (500, crotch), color)
        # Slanted side pockets.
        d.line(pts([(340, top + 20), (385, top + 170)]), fill=edge, width=4 * S)
        d.line(pts([(660, top + 20), (615, top + 170)]), fill=edge, width=4 * S)
        if art.get("stripe"):
            for l_ in legs:
                a, b = l_[-1], l_[-2]
                start = l_[0]
                d.line(pts([(start[0] + (8 if start[0] < 500 else -8), start[1]), (a[0] + (8 if a[0] < 500 else -8), a[1])]), fill=art["stripe"], width=16 * S)
                d.line(pts([(a[0] + (8 if a[0] < 500 else -8), a[1]), (b[0] + (10 if b[0] < 500 else -10), b[1] - 4)]), fill=art["stripe"], width=16 * S)
        if art.get("cargo"):
            for x0 in (318, 682 - 105):
                box = [(x0, 470), (x0 + 105, 470), (x0 + 105, 610), (x0, 610)]
                d.polygon(pts(box), fill=shade(color, 0.92))
                d.line(pts(box + [box[0]]), fill=edge, width=3 * S)
                d.polygon(pts([(x0 - 4, 462), (x0 + 109, 462), (x0 + 109, 505), (x0 - 4, 505)]), fill=shade(color, 0.85))
        if cuff:
            for c in (cuff, mirror(cuff)):
                md.polygon(pts(c), fill=255)
                rib(d, c, color, step=12)
        else:
            for l_ in legs:
                d.line(pts([l_[3], l_[4]]), fill=edge, width=10 * S)
        rib(d, waist, color, step=10)
        # Drawstrings with metal tips.
        for x0, x1 in ((485, 462), (515, 540)):
            d.line(pts([(x0, 215), (x1, 390)]), fill="#f3efe6", width=7 * S)
            d.line(pts([(x1, 390), (x1 + (x1 - x0) * 0.12, 420)]), fill="#9a9a98", width=8 * S)
        d.ellipse(pts([(476, 205), (494, 223)]), fill=shade(color, 0.6))
        d.ellipse(pts([(506, 205), (524, 223)]), fill=shade(color, 0.6))

    if outline:
        edges = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(5))
        layer.paste(shade(color, 0.72), mask=edges)
    return layer, mask


def neck(d, color, y, width=18):
    # Inside of the back neck, then the ribbed collar along the front curve.
    d.polygon(pts([(430, y), (570, y), (555, y + 22), (500, y + 32), (445, y + 22)]), fill=shade(color, 0.62))
    d.arc(pts([(428, y - 45), (572, y + 62)]), start=10, end=170, fill=shade(color, 0.84), width=width * S)
    d.line(pts([(430, y), (570, y)]), fill=shade(color, 0.84), width=int(width * 0.7) * S)


def render(product):
    img = Image.new("RGB", (W * S, H * S), GROUND)
    garment, mask = paint_garment(product)

    # A soft contact shadow under the garment.
    shadow = mask.filter(ImageFilter.GaussianBlur(22 * S)).point(lambda v: int(v * 0.28))
    img.paste((70, 60, 45), (0, 14 * S), mask=shadow)
    img.paste(garment, (0, 0), mask=mask)

    d = ImageDraw.Draw(img)
    name = product["name"].upper()
    centered_text(d, name, 1080, fit_font(d, name, 860, 50, 9), INK, tracking=2)
    sub = f"CLIPBOARD  ·  {CATEGORY_NAMES[product['category']]}"
    centered_text(d, sub, 1158, font(22, 10), MUTE, tracking=5)
    return img.resize((W, H), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    products = json.loads((HERE / "products.json").read_text())
    for product in products:
        render(product).save(OUT / f"{product['slug']}.png", optimize=True)
        print("drew", product["slug"])


if __name__ == "__main__":
    main()
