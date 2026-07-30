"""
Wetterstudio Bad Feilnbach AI
Stormtracking Beta 1.0

Dieses Modul wird später erweitert für:

- Gewitterzellen erkennen
- Zugrichtung berechnen
- Geschwindigkeit berechnen
- ETA (Ankunftszeit)
- Hagelabschätzung
"""

from datetime import datetime

import requests
from pathlib import Path
import numpy as np
from modules.radolan import lade_regenbild, pixel_zu_latlon
from modules.tracking import finde_gleiche_zellen
from modules.test_tracking import TESTMODUS, test_zellen
# Ordner für Radardaten
RADAR_ORDNER = Path("data/radar")
RADAR_ORDNER.mkdir(parents=True, exist_ok=True)

def stormtracking_status():
    """Testfunktion"""

    jetzt = datetime.now()

    return {
        "status": "Stormtracking Beta 1.0 aktiv",
        "zeit": jetzt.strftime("%d.%m.%Y %H:%M:%S")
    }
def radar_download_status():
    """Prüft, ob der Radarordner existiert."""

    return {
        "radar_ordner": str(RADAR_ORDNER),
        "vorhanden": RADAR_ORDNER.exists()
    }
# Radarquelle (vorläufig)
RADAR_URL = "https://www.dwd.de/DWD/wetter/radar/radfilm_brd_akt.gif"


def radar_info():
    """Gibt Informationen zur Radarquelle zurück."""

    return {
        "quelle": "DWD",
        "url": RADAR_URL,
        "zielordner": str(RADAR_ORDNER)
    }
def radar_download():
    """Lädt das aktuelle DWD-Radarbild herunter."""

    datei = RADAR_ORDNER / "radar_akt.gif"

    try:
        antwort = requests.get(RADAR_URL, timeout=20)
        antwort.raise_for_status()

        with open(datei, "wb") as f:
            f.write(antwort.content)

        return {
            "erfolg": True,
            "datei": str(datei),
            "groesse": datei.stat().st_size
        }

    except Exception as fehler:
        return {
            "erfolg": False,
            "fehler": str(fehler)
        }
   


def finde_regenzellen(bild, schwelle=1):
    """
    Erkennt zusammenhängende Regenzellen mittels Flood-Fill.
    Gibt pro Zelle Mittelpunkt, Größe und maximale Intensität zurück.
    """

    hoehe, breite = bild.shape
    besucht = set()
    zellen = []

    nachbarn = [
        (-1, -1), (0, -1), (1, -1),
        (-1,  0),           (1,  0),
        (-1,  1), (0,  1), (1,  1),
    ]

    for y in range(hoehe):
        for x in range(breite):

            if bild[y, x] < schwelle:
                continue

            if (x, y) in besucht:
                continue

            stack = [(x, y)]
            besucht.add((x, y))

            pixel = []
            max_wert = int(bild[y, x])

            while stack:

                px, py = stack.pop()
                pixel.append((px, py))

                if bild[py, px] > max_wert:
                    max_wert = int(bild[py, px])

                for dx, dy in nachbarn:

                    nx = px + dx
                    ny = py + dy

                    if not (0 <= nx < breite):
                        continue

                    if not (0 <= ny < hoehe):
                        continue

                    if (nx, ny) in besucht:
                        continue

                    if bild[ny, nx] < schwelle:
                        continue

                    besucht.add((nx, ny))
                    stack.append((nx, ny))

            anzahl = len(pixel)
            # Kleine Regenflächen ignorieren
            MIN_PIXEL = 40

            if anzahl < MIN_PIXEL:
                continue
           
            summe_x = sum(p[0] for p in pixel)
            summe_y = sum(p[1] for p in pixel)

            mittelpunkt_x = summe_x / anzahl
            mittelpunkt_y = summe_y / anzahl

            zellen.append({
                "x": mittelpunkt_x,
                "y": mittelpunkt_y,
                "zentrum": (mittelpunkt_x, mittelpunkt_y),
                "pixel": anzahl,
                "max_wert": max_wert,
            })

    return zellen
def teste_zellenerkennung():

    bild = lade_regenbild()

    if bild is None:
        print("Keine RADOLAN-Datei gefunden.")
        return False

    zellen = finde_regenzellen(bild, schwelle=10)
    from modules.tracking import letzte_zellen

    zellen = finde_gleiche_zellen(letzte_zellen, zellen)
    print()
    print("===== STORMTRACKING TEST =====")
    print("Gefundene Zellen:", len(zellen))

    if len(zellen) > 0:
       groesste = max(zellen, key=lambda z: z["pixel"]) 
       print("Größte Zelle:", groesste["pixel"], "Pixel")
    info = zellen_info(zellen)

    for zelle in info[:10]:
        print(
        f"Zelle {zelle['nummer']:3d}: "
        f"{zelle['lat']:.3f}°N "
        f"{zelle['lon']:.3f}°E "
        f"({zelle['pixel']} Pixel)"
    )
    return True
def zellen_info(zellen):

    daten = []

    for nummer, zelle in enumerate(zellen, start=1):

      mitte_x = zelle["x"]
      mitte_y = zelle["y"]

      lat, lon = pixel_zu_latlon(mitte_x, mitte_y)

      daten.append({
    "nummer": nummer,
    "pixel": zelle["pixel"],
    "x": mitte_x,
    "y": mitte_y,
    "lat": lat,
    "lon": lon
})
    return daten
def finde_gleiche_zelle(zellen_alt, zellen_neu, max_distanz=30):
    """
    Ordnet Gewitterzellen zwischen zwei Radarbildern zu.
    """

    treffer = []

    for alt in zellen_alt:

        beste = None
        beste_distanz = max_distanz

        for neu in zellen_neu:

            dx = neu["x"] - alt["x"]
            dy = neu["y"] - alt["y"]

            distanz = (dx * dx + dy * dy) ** 0.5

            if distanz < beste_distanz:
                beste_distanz = distanz
                beste = neu

        if beste is not None:
            treffer.append({
    "alt": alt,
    "neu": beste,
    "dx": beste["x"] - alt["x"],
    "dy": beste["y"] - alt["y"]
})

    return treffer

def bewegungsdaten_aus_treffern(treffer):
    """
    Erstellt vollständige Bewegungsdaten aus den gefundenen Zelltreffern.
    """

    daten = []

    for treffer_eintrag in treffer:

        dx = treffer_eintrag["dx"]
        dy = treffer_eintrag["dy"]

        winkel = berechne_richtung(dx, dy)

        daten.append({
            "alt": treffer_eintrag["alt"],
            "neu": treffer_eintrag["neu"],
            "dx": dx,
            "dy": dy,
            "winkel": winkel,
            "richtung": richtung_text(winkel),
            "geschwindigkeit": berechne_geschwindigkeit(dx, dy),
        })

    return daten
import math

def berechne_richtung(dx, dy):
    """
    Berechnet den Bewegungswinkel einer Gewitterzelle.
    0° = Osten
    90° = Norden
    180° = Westen
    270° = Süden
    """
    winkel = math.degrees(math.atan2(-dy, dx))

    if winkel < 0:
        winkel += 360

    return round(winkel, 1)
def richtung_text(winkel):
    richtungen = [
        "O", "NO", "N", "NW",
        "W", "SW", "S", "SO"
    ]

    index = int((winkel + 22.5) // 45) % 8
    return richtungen[index]

def berechne_geschwindigkeit(dx, dy, minuten=5):
    """
    Berechnet eine vorläufige Geschwindigkeit in Pixel pro Stunde.
    Der Umrechnungsfaktor in km/h wird später ergänzt.
    """
    import math

    strecke = math.sqrt(dx * dx + dy * dy)

    if minuten <= 0:
        return 0

    return round(strecke * (60 / minuten), 1)