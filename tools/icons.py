#!/usr/bin/env python3
"""Icons für msmr.dev: »msmr« in Hanken Grotesk 600 auf der Form der Seite
(große Radien mit kurzen Geraden, oben links eckig — wie die Karten), je Projektfarbe.

    python3 tools/icons.py

Schreibt nach app-icons/: fav-<n>.svg und fav-<n>-32.png (Browser, nur »m« — bei 16–32 px lesbar), touch-<n>.png
(iOS, 180 px), icon-192-<n>.png / icon-512-<n>.png (Android; site.webmanifest.php wählt per Zufall).
Die Seite wählt beim Laden per Zufall eine Farbe.
"""
import io, math, subprocess, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'app-icons'   # nicht »icons/«: Apache belegt /icons/ für eigene Grafiken
OUT.mkdir(exist_ok=True)

# Projektfarben wie in index.html (oklch 70 % …), Reihenfolge = Zeitleiste
HUES = [(.18, 255), (.22, 5), (.15, 210), (.19, 155), (.2, 305), (.2, 42), (.17, 88)]
INK, PAPER = '#191b1d', '#fafaf8'


def oklch_hex(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_, m_, s_ = L + .3963377774 * a + .2158037573 * b, L - .1055613458 * a - .0638541728 * b, L - .0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    rgb = (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
           -.0041960863 * l - .7034186147 * m + 1.7076147010 * s)
    enc = lambda v: 12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055
    return '#' + ''.join(f'{round(min(1, max(0, enc(max(0, v)))) * 255):02x}' for v in rgb)


def word_path(text, size, tracking=-.065):
    """Umriss von text in Hanken Grotesk 600 als SVG-Pfad, Breite und Höhe (px)."""
    font = TTFont(ROOT / 'fonts/hanken-grotesk-latin.woff2')
    font = instancer.instantiateVariableFont(font, {'wght': 600})
    upm, cmap, gs = font['head'].unitsPerEm, font.getBestCmap(), font.getGlyphSet()
    sc, x, parts = size / upm, 0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x, 0)))   # y nach unten
        parts.append(pen.getCommands())
        x += font['hmtx'][g][0] * sc + tracking * size
    x -= tracking * size
    cap = font['OS/2'].sxHeight * sc                           # x-Höhe: nur Kleinbuchstaben
    return ' '.join(parts), x, cap


def svg(color, size=100, pad=0, paper=None, word='msmr', fill=1.3):
    """Form + Schrift. pad: Rand um die Form, paper: Hintergrund (iOS), fill: Wortbreite relativ zum Radius."""
    R = (size - 2 * pad) / 2
    cx = cy = size / 2
    # Wie die Karten: oben links eckig, sonst große Radien — dazwischen kurze Geraden (16 % der Seite)
    x0, y0, x1, y1 = cx - R, cy - R, cx + R, cy + R
    r = 2 * R * .42
    shape = (f'M{x0} {y0}H{x1 - r}A{r} {r} 0 0 1 {x1} {y0 + r}V{y1 - r}'
             f'A{r} {r} 0 0 1 {x1 - r} {y1}H{x0 + r}A{r} {r} 0 0 1 {x0} {y1 - r}Z')
    d, w, xh = word_path(word, 1)
    fs = R * fill / w                                          # Schriftgröße: Wort ≈ fill/2 der Breite
    d, w, xh = word_path(word, fs)
    tx, ty = cx - w / 2, cy + xh / 2                           # optisch mittig auf der x-Höhe
    bg = f'<rect width="{size}" height="{size}" fill="{paper}"/>' if paper else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">{bg}'
            f'<path d="{shape}" fill="{color}"/>'
            f'<path transform="translate({tx:.2f} {ty:.2f})" d="{d}" fill="{INK}"/></svg>')


def png(svg_text, px, path):
    subprocess.run(['magick', '-background', 'none', '-density', str(96 * px / 100 * 4), 'svg:-',
                    '-resize', f'{px}x{px}', str(path)], input=svg_text.encode(), check=True)


for n, (C, h) in enumerate(HUES):
    col = oklch_hex(.7, C, h)
    fav = svg(col, pad=2, word='m', fill=.95)                  # klein: nur »m«, sonst unlesbar
    (OUT / f'fav-{n}.svg').write_text(fav)
    png(fav, 32, OUT / f'fav-{n}-32.png')
    png(svg(col, pad=18, paper=PAPER), 180, OUT / f'touch-{n}.png')   # iOS rundet selbst ab: Form mit Rand auf Papier
    png(svg(col, pad=18, paper=PAPER), 192, OUT / f'icon-192-{n}.png')   # Android / Manifest
    png(svg(col, pad=18, paper=PAPER), 512, OUT / f'icon-512-{n}.png')
    print(n, col)


