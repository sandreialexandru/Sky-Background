"""Draws the Sky Background icon (sun, moon, cloud and rain over a dusk sky).

Run:  python tools/make_icon.py
Writes custom_components/sky_background/brand/{icon,icon@2x,logo,logo@2x}.png and images/icon.png.
Needs Pillow.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

S = 2048  # work at 4x and downsample for smooth edges
ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "custom_components" / "sky_background" / "brand"


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(stops):
    img = Image.new("RGB", (S, S))
    px = img.load()
    for y in range(S):
        t = y / (S - 1)
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                col = lerp(c0, c1, (t - t0) / (t1 - t0))
                break
        for x in range(S):
            px[x, y] = col
    return img


def circle(draw, cx, cy, r, fill):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)


def glow(base, cx, cy, r, color, blur, alpha):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    circle(ImageDraw.Draw(layer), cx, cy, r, color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def build():
    # sky
    sky = vertical_gradient([(0.0, (16, 22, 62)), (0.45, (70, 52, 128)), (0.78, (236, 112, 96)), (1.0, (255, 166, 92))]).convert("RGBA")

    # stars
    d = ImageDraw.Draw(sky)
    for x, y, r, a in [(0.60, 0.15, 7, 230), (0.78, 0.24, 5, 200), (0.46, 0.08, 5, 180), (0.88, 0.12, 6, 210), (0.14, 0.50, 5, 150), (0.38, 0.40, 4, 150)]:
        circle(d, x * S, y * S, r * 2, (255, 255, 255, a))

    # moon (crescent) top-left
    mx, my, mr = 0.27 * S, 0.27 * S, 0.115 * S
    glow(sky, mx, my, mr * 1.35, (200, 210, 255), 70, 90)
    moon = Image.new("L", (S, S), 0)
    circle(ImageDraw.Draw(moon), mx, my, mr, 255)
    cut = Image.new("L", (S, S), 0)
    circle(ImageDraw.Draw(cut), mx + mr * 0.55, my - mr * 0.25, mr * 0.92, 255)
    moon = ImageChops.subtract(moon, cut)
    sky.paste(Image.new("RGBA", (S, S), (246, 244, 255, 255)), (0, 0), moon)

    # sun, partly behind the cloud
    sx, sy, sr = 0.64 * S, 0.47 * S, 0.165 * S
    glow(sky, sx, sy, sr * 2.0, (255, 190, 90), 130, 120)
    glow(sky, sx, sy, sr * 1.35, (255, 214, 120), 60, 150)
    sun = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    circle(ImageDraw.Draw(sun), sx, sy, sr, (255, 214, 79, 255))
    inner = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    circle(ImageDraw.Draw(inner), sx - sr * 0.18, sy - sr * 0.22, sr * 0.78, (255, 236, 150, 255))
    inner = inner.filter(ImageFilter.GaussianBlur(40))
    sun.alpha_composite(inner)
    clip = Image.new("L", (S, S), 0)
    circle(ImageDraw.Draw(clip), sx, sy, sr, 255)
    sun.putalpha(ImageChops.multiply(sun.getchannel("A"), clip))
    sky.alpha_composite(sun)

    # cloud (with a soft shadow)
    def cloud(draw, fill):
        draw.rounded_rectangle((0.20 * S, 0.585 * S, 0.80 * S, 0.745 * S), radius=0.08 * S, fill=fill)
        circle(draw, 0.34 * S, 0.585 * S, 0.105 * S, fill)
        circle(draw, 0.50 * S, 0.53 * S, 0.150 * S, fill)
        circle(draw, 0.665 * S, 0.60 * S, 0.105 * S, fill)

    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cloud(ImageDraw.Draw(shadow), (30, 20, 70, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    sky.alpha_composite(shadow, (0, 26))
    body = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cloud(ImageDraw.Draw(body), (250, 252, 255, 255))
    shade = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shade)
    ds.rounded_rectangle((0.20 * S, 0.675 * S, 0.80 * S, 0.76 * S), radius=0.04 * S, fill=(176, 196, 232, 150))
    shade = shade.filter(ImageFilter.GaussianBlur(24))
    shade.putalpha(ImageChops.multiply(shade.getchannel("A"), body.getchannel("A")))
    body.alpha_composite(shade)
    sky.alpha_composite(body)

    # rain
    rain = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(rain)
    for x in (0.34, 0.50, 0.66):
        dr.line((x * S, 0.79 * S, (x - 0.035) * S, 0.88 * S), fill=(190, 225, 255, 235), width=int(0.028 * S))
        circle(dr, x * S, 0.79 * S, 0.014 * S, (190, 225, 255, 235))
        circle(dr, (x - 0.035) * S, 0.88 * S, 0.014 * S, (190, 225, 255, 235))
    sky.alpha_composite(rain)

    # rounded-square mask
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(0.22 * S), fill=255)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(sky, (0, 0), mask)
    return out


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    (ROOT / "images").mkdir(exist_ok=True)
    big = build()
    for name, size in (("icon.png", 256), ("icon@2x.png", 512), ("logo.png", 256), ("logo@2x.png", 512)):
        big.resize((size, size), Image.LANCZOS).save(BRAND / name, optimize=True)
    big.resize((512, 512), Image.LANCZOS).save(ROOT / "images" / "icon.png", optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
