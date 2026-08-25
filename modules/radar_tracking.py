from pathlib import Path
import cv2
import numpy as np

# Ordner mit den Radarbildern
RADAR_DIR = Path("static/radar")


def lade_radarbild(dateiname: str):
    """
    Lädt ein RADOLAN-Bild als Graustufenbild.
    """
    datei = RADAR_DIR / dateiname

    if not datei.exists():
        raise FileNotFoundError(f"Radarbild nicht gefunden: {datei}")

    bild = cv2.imread(str(datei), cv2.IMREAD_GRAYSCALE)

    if bild is None:
        raise RuntimeError(f"Radarbild konnte nicht geladen werden: {datei}")

    return bild


def lade_zwei_bilder():
    """
    Lädt die letzten beiden RADOLAN-Bilder.
    """
    dateien = sorted(RADAR_DIR.glob("*.png"))

    if len(dateien) < 2:
        raise RuntimeError("Mindestens zwei RADOLAN-Bilder erforderlich.")

    bild_alt = lade_radarbild(dateien[-2].name)
    bild_neu = lade_radarbild(dateien[-1].name)

    return bild_alt, bild_neu

def erkenne_zellen(bild):
    """
    Erkennt zusammenhängende Niederschlagszellen.
    """

    # Schwellwert
    _, maske = cv2.threshold(
        bild,
        80,
        255,
        cv2.THRESH_BINARY
    )

    # kleine Störungen entfernen
    kernel = np.ones((3, 3), np.uint8)
    maske = cv2.morphologyEx(
        maske,
        cv2.MORPH_OPEN,
        kernel
    )

    konturen, _ = cv2.findContours(
        maske,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    zellen = []

    for kontur in konturen:

        flaeche = cv2.contourArea(kontur)

        if flaeche < 30:
            continue

        M = cv2.moments(kontur)

        if M["m00"] == 0:
            continue

        x = int(M["m10"] / M["m00"])
        y = int(M["m01"] / M["m00"])

        zellen.append({
            "x": x,
            "y": y,
            "flaeche": flaeche
        })

    return zellen

if __name__ == "__main__":

    alt, neu = lade_zwei_bilder()

    zellen = erkenne_zellen(neu)

    print(f"{len(zellen)} Gewitterzellen erkannt")

    for z in zellen:
        print(z)