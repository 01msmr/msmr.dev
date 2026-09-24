#!/usr/bin/env python3
"""Screenshot/Foto -> Halbton als SVG: echte Kreise, Größe nach Helligkeit.

    python3 tools/halftone.py quelle.jpg img/name.svg [--cell 16] [--angle 45]

Helle Stellen bleiben leer, dunkle bekommen große, sich berührende Punkte.
Überwiegend dunkle Bilder werden umgekehrt, damit das Motiv als Punkte erscheint.
"""
import argparse, math
from PIL import Image, ImageOps, ImageStat, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--cell', type=float, default=12.8, help='Rasterweite in px (Breite 1600)')
ap.add_argument('--angle', type=float, default=45, help='Rasterwinkel in Grad')
ap.add_argument('--gamma', type=float, default=.8, help='< 1: Mitteltöne kräftiger')
a = ap.parse_args()

W = 1600
img = ImageOps.autocontrast(Image.open(a.src).convert('L'), cutoff=1)
if ImageStat.Stat(img).mean[0] < 100:
    img = ImageOps.invert(img)
H = round(img.height * W / img.width)
img = img.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(a.cell / 3))
px = img.load()

c, rad = a.cell, math.radians(a.angle)
ux, uy = math.cos(rad) * c, math.sin(rad) * c        # Rasterachsen, gedreht
vx, vy = -math.sin(rad) * c, math.cos(rad) * c
n = int(math.hypot(W, H) / c) + 2
cx0, cy0 = W / 2, H / 2
rmax = c * .72                                        # größte Punkte berühren sich

dots = []
for i in range(-n, n + 1):
    for j in range(-n, n + 1):
        x = cx0 + i * ux + j * vx
        y = cy0 + i * uy + j * vy
        if not (-c < x < W + c and -c < y < H + c):
            continue
        g = px[min(W - 1, max(0, int(x))), min(H - 1, max(0, int(y)))]
        dark = max(0, (1 - g / 255 - .1) / .9) ** a.gamma   # fast Weißes bleibt leer
        r = rmax * math.sqrt(dark)                   # Fläche ∝ Dunkelheit
        if r < .9:
            continue
        dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>')

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
       f'preserveAspectRatio="xMidYMid slice"><g fill="#000">{"".join(dots)}</g></svg>')
open(a.out, 'w').write(svg)
print(a.out, len(dots), 'Punkte', round(len(svg) / 1024), 'KB')
