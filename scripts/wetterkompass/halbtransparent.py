from pathlib import Path
from PIL import Image, ImageDraw

ordner = Path(__file__).resolve().parent.parent.parent / "static" / "wetterkompass"
quelle = ordner / "bayern_14_tage_tabelle_4k.png"
ziel = ordner / "bayern_14_tage_tabelle_halbtransparent.png"

bild = Image.open(quelle).convert("RGBA")
pixel = bild.load()

for y in range(bild.height):
    for x in range(bild.width):
        r, g, b, a = pixel[x, y]
        if b > r * 1.15 and b > g * 1.05 and r < 110:
            pixel[x, y] = (r, g, b, 175)

bild.save(ziel)
print("ERSTELLT:", ziel)
