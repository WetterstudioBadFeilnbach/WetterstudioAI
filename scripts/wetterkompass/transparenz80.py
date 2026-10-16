from pathlib import Path
from PIL import Image

ordner = Path(__file__).resolve().parent.parent.parent / "static" / "wetterkompass"
quelle = ordner / "bayern_14_tage_tabelle_halbtransparent.png"
ziel = ordner / "bayern_14_tage_tabelle_80_prozent.png"

bild = Image.open(quelle).convert("RGBA")
pixel = bild.load()

for y in range(bild.height):
    for x in range(bild.width):
        r, g, b, a = pixel[x, y]
        if 0 < a < 255:
            pixel[x, y] = (r, g, b, 204)

bild.save(ziel)
print("ERSTELLT:", ziel)
