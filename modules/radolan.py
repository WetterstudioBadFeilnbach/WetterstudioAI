"""
RADOLAN-Modul
Wetterstudio Bad Feilnbach AI
Beta 1.1
"""

from pathlib import Path
import requests
import bz2
import shutil
import os
import json
import struct
import numpy as np
from PIL import Image
from pyproj import CRS, Transformer
from modules.radolan_geo import radolan_wgs84

RADOLAN_URL = (
    "https://opendata.dwd.de/weather/radar/radolan/rw/"
    "raa01-rw_10000-latest-dwd---bin.bz2"
)

DOWNLOAD_ORDNER = Path("data/radolan")
DOWNLOAD_DATEI = DOWNLOAD_ORDNER / "latest.bin.bz2"
ENTPACKTE_DATEI = DOWNLOAD_ORDNER / "latest.bin"

def radar_status():
    """
    Prüft, ob die aktuelle RADOLAN-Datei erreichbar ist.
    """

    try:
        response = requests.head(RADOLAN_URL, timeout=15)

        return {
            "status": "OK",
            "status_code": response.status_code,
            "url": RADOLAN_URL,
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "error": str(e),
        }


def download_latest():
    """
    Lädt die aktuelle RADOLAN-Datei herunter.
    """

    DOWNLOAD_ORDNER.mkdir(parents=True, exist_ok=True)

    response = requests.get(RADOLAN_URL, timeout=60)
    response.raise_for_status()

    with open(DOWNLOAD_DATEI, "wb") as f:
        f.write(response.content)

    return str(DOWNLOAD_DATEI)
from datetime import datetime, timezone

def archiviere_latest():
    """
    Speichert latest.bin zusätzlich als
    Zeitstempel-Datei.
    """

    if not ENTPACKTE_DATEI.exists():
        raise FileNotFoundError("latest.bin existiert nicht.")

    zeit = datetime.now(timezone.utc)

    dateiname = zeit.strftime("RW_%Y%m%d_%H%M.bin")

    ziel = DOWNLOAD_ORDNER / dateiname

    shutil.copy2(
        ENTPACKTE_DATEI,
        ziel,
    )

    print(f"Archiv gespeichert: {dateiname}")

    return ziel

def datei_vorhanden():
    """
    Prüft, ob die Datei bereits existiert.
    """

    return DOWNLOAD_DATEI.exists()


def dateigroesse():
    """
    Liefert die Dateigröße in Byte.
    """

    if not DOWNLOAD_DATEI.exists():
        return 0

    return DOWNLOAD_DATEI.stat().st_size
def header_zeitstempel(header):
    """
    Extrahiert den RADOLAN-Zeitstempel aus dem Header.
    Liefert einen String im Format YYYYMMDDHHMM
    oder None.
    """

    import re
    from datetime import datetime

    if header is None:
        return None

    treffer = re.search(r"(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", header)

    if treffer is None:
        return None

    tag = treffer.group(1)
    stunde = treffer.group(2)
    minute = treffer.group(3)
    monat = treffer.group(4)
    jahr = treffer.group(5)

    jahr = "20" + jahr

    try:
        dt = datetime.strptime(
            f"{jahr}{monat}{tag}{stunde}{minute}",
            "%Y%m%d%H%M",
        )
    except ValueError:
        return None

    return dt.strftime("%Y%m%d%H%M")
def entpacken():
    """
    Entpackt die heruntergeladene RADOLAN-Datei.
    Erstellt zusätzlich eine Archivkopie.
    """

    if not DOWNLOAD_DATEI.exists():
        raise FileNotFoundError(
            "RADOLAN-Datei wurde noch nicht heruntergeladen."
        )

    with bz2.open(DOWNLOAD_DATEI, "rb") as quelle:
        with open(ENTPACKTE_DATEI, "wb") as ziel:
            shutil.copyfileobj(quelle, ziel)

    header = header_lesen()

    if header is not None:
        zeit = header_zeitstempel(header)

        if zeit is not None:
            archiv = DOWNLOAD_ORDNER / f"RW_{zeit}.bin"

            shutil.copy2(
                ENTPACKTE_DATEI,
                archiv,
            )

            print(f"Archiv gespeichert: {archiv.name}")
        else:
            print("Kein gültiger Zeitstempel im Header gefunden.")

    archiviere_latest()

    return str(ENTPACKTE_DATEI)
def datei_info():
    """
    Liefert Informationen über die entpackte RADOLAN-Datei.
    """

    if not ENTPACKTE_DATEI.exists():
        return None

    info = {
        "datei": str(ENTPACKTE_DATEI),
        "groesse": ENTPACKTE_DATEI.stat().st_size,
        "geaendert": os.path.getmtime(ENTPACKTE_DATEI),
    }

    return info

def header_lesen():
    """
    Liest den Header der entpackten RADOLAN-Datei.
    """

    if not ENTPACKTE_DATEI.exists():
        return None

    with open(ENTPACKTE_DATEI, "rb") as f:
        header = b""

        while True:
            zeichen = f.read(1)

            if zeichen == b"\x03":
                break

            header += zeichen

    return header.decode("ascii", errors="ignore")
def header_analysieren():
    """
    Zerlegt den RADOLAN-Header in seine bekannten Felder.
    """

    header = header_lesen()

    if header is None:
        return None

    felder = [
        "BY",
        "VS",
        "SW",
        "PR",
        "INT",
        "GP",
        "MS",
    ]

    print("\n===== HEADER =====\n")
    print(header)
    print("\n===== FELDER =====\n")

    for feld in felder:

        pos = header.find(feld)

        if pos >= 0:
            print(f"{feld:4s} Position {pos:3d}")

    return header
def header_laenge(dateipfad=ENTPACKTE_DATEI):
    """
    Ermittelt die Länge des RADOLAN-Headers.
    """

    if not dateipfad.exists():
        return None

    with open(dateipfad, "rb") as f:

        laenge = 0

        while True:

            zeichen = f.read(1)

            laenge += 1

            if zeichen == b"\x03":
                break

    return laenge
def erste_werte(anzahl=10000):
    """
    Analysiert die ersten Radarwerte.
    """

    if not ENTPACKTE_DATEI.exists():
        return None

    offset = header_laenge()

    with open(ENTPACKTE_DATEI, "rb") as f:

        f.seek(offset)

        statistik = {}

        for _ in range(900 * 900):

            rohwert = struct.unpack("<H", f.read(2))[0]
            wert = rohwert & 0x0FFF

            statistik[wert] = statistik.get(wert, 0) + 1

    print("\nErste 10000 Werte analysiert:\n")

    for wert in sorted(statistik):
        print(f"{wert:4d} : {statistik[wert]}")

    return statistik
def graustufenkarte():

    if not ENTPACKTE_DATEI.exists():
        return False

    offset = header_laenge()

    with open(ENTPACKTE_DATEI, "rb") as f:

        f.seek(offset)

        daten = []

        for _ in range(900 * 900):
            rohwert = struct.unpack("<H", f.read(2))[0]

            # Statusbits auswerten
            nodata = bool(rohwert & 0x2000)
            secondary = bool(rohwert & 0x1000)

            wert = rohwert & 0x0FFF

            if nodata:
                wert = 0

            if secondary:
                wert = 0

            daten.append(wert)

    bild = np.array(daten, dtype=np.uint16).reshape((900, 900))

   # Vorläufig kompletter RADOLAN-Raster
# bild = bild[150:900, 80:820]

    maximum = bild.max()

    if maximum > 0:
        bild = np.sqrt(bild / maximum) * 255
        bild = bild.astype(np.uint8)
    else:
        bild = bild.astype(np.uint8)

    hoehe, breite = bild.shape

    farbe = np.zeros((hoehe, breite, 3), dtype=np.uint8)

    farbe[bild == 0] = (0, 0, 0)
    farbe[(bild > 0) & (bild < 80)] = (0, 120, 255)
    farbe[(bild >= 80) & (bild < 170)] = (0, 220, 0)
    farbe[bild >= 170] = (255, 255, 0)

    img = Image.fromarray(farbe)

    from PIL import ImageDraw

    regenbild = lade_regenbild()
    zellen = finde_regenzellen(regenbild)
    lat_array, lon_array = radolan_wgs84()

    zellen_export = []

    for zelle in zellen:
        x = int(zelle["x"])
        y = int(zelle["y"])

        zellen_export.append({
            "x": x,
            "y": y,
            "pixel": int(zelle["pixel"]),
            "lat": float(lat_array[y, x]),
            "lon": float(lon_array[y, x])
        })

    with open("static/data/radarzellen.json", "w", encoding="utf-8") as f:
        json.dump(zellen_export, f, indent=2)

    zeichner = ImageDraw.Draw(img)

    for zelle in zellen:
        if zelle["pixel"] < 30:
            continue

        x = int(zelle["x"])
        y = 899 - int(zelle["y"])

        r = 4

       # zeichner.ellipse(
#     (x - r, y - r, x + r, y + r),
#     outline=(255, 0, 0),
#     width=2,
# )

    # RADOLAN korrekt ausrichten
    # img = img.transpose(Image.FLIP_TOP_BOTTOM)

    img.save("static/img/radolan_grau.png")

    print("Graustufenbild gespeichert: radolan_grau.png")

    return True
def lade_zwei_radolan_bilder(datei_alt, datei_neu):
    """
    Lädt zwei RADOLAN-Bilder als Graustufenbilder.
    Gibt beide Bilder als NumPy-Arrays zurück.
    """

    import cv2

    bild_alt = cv2.imread(datei_alt, cv2.IMREAD_GRAYSCALE)
    bild_neu = cv2.imread(datei_neu, cv2.IMREAD_GRAYSCALE)

    return bild_alt, bild_neu
def pruefe_radolan_groesse(bild_alt, bild_neu):
    """
    Prüft, ob beide RADOLAN-Bilder dieselbe Größe besitzen.
    """

    if bild_alt is None or bild_neu is None:
        return False

    return bild_alt.shape == bild_neu.shape
def berechne_differenzbild(bild_alt, bild_neu):
    """
    Berechnet die absolute Differenz zwischen zwei RADOLAN-Bildern.
    """

    import cv2

    if not pruefe_radolan_groesse(bild_alt, bild_neu):
        return None

    differenz = cv2.absdiff(bild_alt, bild_neu)

    return differenz
def erstelle_bewegungsmaske(differenz, schwellwert=15):
    """
    Erstellt aus dem Differenzbild eine Binärmaske.
    """

    import cv2

    if differenz is None:
        return None

    _, maske = cv2.threshold(
        differenz,
        schwellwert,
        255,
        cv2.THRESH_BINARY,
    )

    return maske
def finde_bewegungsbereiche(maske):
    """
    Findet zusammenhängende Bewegungsbereiche in der Bewegungsmaske.
    """

    import cv2

    if maske is None:
        return []

    konturen, _ = cv2.findContours(
        maske,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    return konturen
def berechne_mittelpunkte(konturen):
    """
    Berechnet die Mittelpunkte aller gefundenen Konturen.
    """

    import cv2

    mittelpunkte = []

    for kontur in konturen:
        m = cv2.moments(kontur)

        if m["m00"] == 0:
            continue

        x = int(m["m10"] / m["m00"])
        y = int(m["m01"] / m["m00"])

        mittelpunkte.append((x, y))

    return mittelpunkte
def berechne_abstand(punkt1, punkt2):
    """
    Berechnet den euklidischen Abstand zwischen zwei Punkten.
    """

    import math

    dx = punkt2[0] - punkt1[0]
    dy = punkt2[1] - punkt1[1]

    return math.hypot(dx, dy)
def ordne_mittelpunkte_zu(mittelpunkte_alt, mittelpunkte_neu):
    """
    Ordnet jedem alten Mittelpunkt den nächstgelegenen neuen Mittelpunkt zu.
    """

    zuordnungen = []

    for alt in mittelpunkte_alt:

        bester_punkt = None
        kleinster_abstand = float("inf")

        for neu in mittelpunkte_neu:

            abstand = berechne_abstand(alt, neu)

            if abstand < kleinster_abstand:
                kleinster_abstand = abstand
                bester_punkt = neu

        if bester_punkt is not None:
            zuordnungen.append((alt, bester_punkt))

    return zuordnungen
# TODO Meilenstein 3:
# Diese Funktion wird zur vollständigen Stormtracking-Pipeline erweitert.
# Nächster Schritt:
# 1. Alte Mittelpunkte berechnen
# 2. Neue Mittelpunkte berechnen
# 3. Zuordnungen erstellen
# 4. Bewegungsdaten erzeugen
# 5. Bewegungsdaten zurückgeben
def analysiere_radolan_bewegung(bild_alt, bild_neu):
    """
    Führt die komplette Bewegungserkennung zwischen zwei RADOLAN-Bildern aus.
    """

    differenz = berechne_differenzbild(bild_alt, bild_neu)

    maske = erstelle_bewegungsmaske(differenz)

    konturen = finde_bewegungsbereiche(maske)

    mittelpunkte = berechne_mittelpunkte(konturen)

    bewegungen = sorted(mittelpunkte, key=lambda p: (p[1], p[0]))

    return bewegungen
def berechne_bewegungswinkel(punkt_alt, punkt_neu):
    """
    Berechnet den Bewegungswinkel zwischen zwei Punkten.
    0° = Osten, 90° = Süden (Bildkoordinaten).
    """

    import math

    dx = punkt_neu[0] - punkt_alt[0]
    dy = punkt_neu[1] - punkt_alt[1]

    winkel = math.degrees(math.atan2(dy, dx))

    if winkel < 0:
        winkel += 360

    return winkel
def erstelle_bewegungsdaten(zuordnungen):
    """
    Erstellt Bewegungsinformationen aus den Zuordnungen.
    """

    bewegungen = []

    for alt, neu in zuordnungen:

        abstand = berechne_abstand(alt, neu)
        winkel = berechne_bewegungswinkel(alt, neu)

        bewegungen.append({
            "start": alt,
            "ziel": neu,
            "abstand": abstand,
            "winkel": winkel,
            "richtung": richtung_aus_winkel(winkel),
            "geschwindigkeit": berechne_geschwindigkeit(abstand),
    })

    return bewegungen

def richtung_aus_winkel(winkel):
    """
    Wandelt einen Winkel in eine Himmelsrichtung um.
    """

    richtungen = [
        "O",
        "SO",
        "S",
        "SW",
        "W",
        "NW",
        "N",
        "NO",
    ]

    index = int(((winkel + 22.5) % 360) / 45)

    return richtungen[index]
def berechne_bewegung(punkt_alt, punkt_neu):
    """
    Berechnet die Bewegung zwischen zwei Punkten.
    """

    abstand = berechne_abstand(punkt_alt, punkt_neu)

    winkel = berechne_bewegungswinkel(
        punkt_alt,
        punkt_neu,
    )

    richtung = richtung_aus_winkel(winkel)

    geschwindigkeit = berechne_geschwindigkeit(abstand)
    ankunftszeit = berechne_ankunftszeit(
    abstand,
    geschwindigkeit
   )
    return {
        "abstand": abstand,
        "winkel": winkel,
        "richtung": richtung,
        "geschwindigkeit": geschwindigkeit,
        "ankunftszeit": ankunftszeit,
    }
def berechne_geschwindigkeit(pixel_abstand, minuten=5, km_pro_pixel=1.0):
    """
    Berechnet die Geschwindigkeit in km/h.
    Standardmäßig wird von 5 Minuten zwischen zwei RADOLAN-Bildern ausgegangen.
    """

    kilometer = pixel_abstand * km_pro_pixel

    stunden = minuten / 60.0

    if stunden == 0:
        return 0.0

    return kilometer / stunden
def berechne_ankunftszeit(entfernung_km, geschwindigkeit):
    """
    Berechnet die Ankunftszeit in Minuten.
    """

    if geschwindigkeit <= 0:
        return None

    stunden = entfernung_km / geschwindigkeit

    return stunden * 60
def lade_regenbild():

    if not ENTPACKTE_DATEI.exists():
        return None

    offset = header_laenge()

    with open(ENTPACKTE_DATEI, "rb") as f:

        f.seek(offset)

        daten = []

        for _ in range(900 * 900):

            rohwert = struct.unpack("<H", f.read(2))[0]

            nodata = bool(rohwert & 0x2000)
            secondary = bool(rohwert & 0x1000)

            wert = rohwert & 0x0FFF

            if nodata:
                wert = 0

            if secondary:
                wert = 0

            daten.append(wert)

    return np.array(daten, dtype=np.uint16).reshape((900, 900))
def lade_regenbild_von_datei(dateipfad):
    offset = header_laenge(dateipfad)

    with open(dateipfad, "rb") as f:
        f.seek(offset)

        daten = []

        for _ in range(900 * 900):
            rohwert = struct.unpack("<H", f.read(2))[0]

            nodata = bool(rohwert & 0x2000)
            secondary = bool(rohwert & 0x1000)

            wert = rohwert & 0x0FFF

            if nodata or secondary:
                wert = 0

            daten.append(wert)

    return np.array(daten, dtype=np.uint16).reshape((900, 900))

def lade_zwei_regenbilder(datei_alt, datei_neu):
    """
    Lädt zwei RADOLAN-Dateien und gibt beide Regenbilder zurück.
    """
    bild_alt = lade_regenbild_von_datei(datei_alt)
    bild_neu = lade_regenbild_von_datei(datei_neu)

    return bild_alt, bild_neu

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
    
import math

def berechne_bewegungsrichtung(dx, dy):
    """
    Berechnet den Bewegungswinkel in Grad.
    0° = Norden, 90° = Osten.
    """
    winkel = (90 - math.degrees(math.atan2(-dy, dx))) % 360
    return winkel
def berechne_pixelgeschwindigkeit(distanz_pixel, minuten):
    """
    Berechnet die Geschwindigkeit in Pixel pro Minute.
    """
    if minuten <= 0:
        return 0.0

    return distanz_pixel / minuten
from datetime import datetime

def lese_radolan_zeitstempel(dateipfad):
    """
    Liest den UTC-Zeitstempel aus einem RADOLAN-Dateinamen.
    Beispiel:
    RW_202607211250 -> 2026-07-21 12:50
    """

    name = Path(dateipfad).stem
    teile = name.split("_")

    try:
        if len(teile) == 3:
            zeit = teile[1] + teile[2]
        elif len(teile) == 2:
            zeit = teile[1]
        else:
            return None

        return datetime.strptime(zeit, "%Y%m%d%H%M")

    except ValueError:
        return None

def berechne_zeitabstand(datei_alt, datei_neu):
        """
        Berechnet den Zeitabstand zwischen zwei RADOLAN-Dateien in Minuten.
        """

        zeit_alt = lese_radolan_zeitstempel(datei_alt)
        zeit_neu = lese_radolan_zeitstempel(datei_neu)

        if zeit_alt is None or zeit_neu is None:
            return None

        return (zeit_neu - zeit_alt).total_seconds() / 60
def ordne_regenzellen_zu(
    zellen_alt,
    zellen_neu,
    minuten,
    max_distanz=25,
):
    """
    Ordnet Regenzellen eindeutig zu und berechnet
    Richtung und Geschwindigkeit.
    """

    zuordnung = []
    benutzt = set()

    for alt in zellen_alt:

        beste = None
        beste_index = None
        kleinste_distanz = max_distanz

        for i, neu in enumerate(zellen_neu):

            if i in benutzt:
                continue

            dx = neu["x"] - alt["x"]
            dy = neu["y"] - alt["y"]

            distanz = (dx * dx + dy * dy) ** 0.5

            if distanz < kleinste_distanz:
                kleinste_distanz = distanz
                beste = neu
                beste_index = i

        if beste is None:
            continue

        benutzt.add(beste_index)

        dx = beste["x"] - alt["x"]
        dy = beste["y"] - alt["y"]

        richtung = berechne_bewegungsrichtung(dx, dy)
        geschwindigkeit = berechne_pixelgeschwindigkeit(
            kleinste_distanz,
            minuten,
        )

        zuordnung.append({
            "alt": alt,
            "neu": beste,
            "dx": dx,
            "dy": dy,
            "distanz": kleinste_distanz,
            "richtung": richtung,
            "geschwindigkeit": geschwindigkeit,
        })

    return zuordnung
def analysiere_bewegung(datei_alt, datei_neu):
    """
    Führt eine komplette Bewegungsanalyse zwischen
    zwei RADOLAN-Dateien durch.
    """

    bild_alt, bild_neu = lade_zwei_regenbilder(
        datei_alt,
        datei_neu,
    )

    zellen_alt = finde_regenzellen(bild_alt)
    zellen_neu = finde_regenzellen(bild_neu)

    minuten = berechne_zeitabstand(
        datei_alt,
        datei_neu,
    )

    if minuten is None:
        raise ValueError(
            "Zeitabstand konnte nicht bestimmt werden."
        )

    bewegungen = ordne_regenzellen_zu(
        zellen_alt,
        zellen_neu,
        minuten=minuten,
    )

    return {
        "zeitabstand": minuten,
        "anzahl_alt": len(zellen_alt),
        "anzahl_neu": len(zellen_neu),
        "bewegungen": bewegungen,
    }
def analysiere_letzte_bewegung():
    """
    Analysiert automatisch die beiden neuesten
    RADOLAN-Dateien im Download-Ordner.
    """

    dateien = sorted(
    DOWNLOAD_ORDNER.glob("RW_20260722_*.bin"),
    key=lambda p: p.stat().st_mtime,
)

    if len(dateien) < 2:
        raise FileNotFoundError(
            "Mindestens zwei RADOLAN-Dateien werden benötigt."
        )

    datei_alt = dateien[-2]
    datei_neu = dateien[-1]

    print()
    print("Vergleiche:")
    print(datei_alt.name)
    print(datei_neu.name)
    print()

    ergebnis = analysiere_bewegung(
    datei_alt,
    datei_neu,
    )

    print("===== Bewegungsanalyse =====")
    print(f"Zeitabstand : {ergebnis['zeitabstand']} Minuten")
    print(f"Alte Zellen : {ergebnis['anzahl_alt']}")
    print(f"Neue Zellen : {ergebnis['anzahl_neu']}")
    print(f"Zuordnungen : {len(ergebnis['bewegungen'])}")
    print()

    print("Top 10 Bewegungen:")

    bewegungen = sorted(
        ergebnis["bewegungen"],
        key=lambda b: b["neu"]["pixel"],
        reverse=True,
    )

    for i, b in enumerate(bewegungen[:10], start=1):
        print(
            f"{i:2d}. "
            f"Pixel={b['neu']['pixel']:5d}  "
            f"Richtung={b['richtung']:6.1f}°  "
            f"Geschwindigkeit={b['geschwindigkeit']:.2f} Pixel/min"
        )
    from pathlib import Path
    import json

    export = []

    for b in ergebnis["bewegungen"]:
        export.append({
            "x1": round(b["alt"]["x"], 1),
            "y1": round(b["alt"]["y"], 1),
            "x2": round(b["neu"]["x"], 1),
            "y2": round(b["neu"]["y"], 1),
            "richtung": round(b["richtung"], 1),
            "geschwindigkeit": round(b["geschwindigkeit"], 2),
        })

    Path("static/data").mkdir(parents=True, exist_ok=True)

    with open(
        "static/data/radarzellen.json",
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(export, f, indent=2)

    return ergebnis

 
def radolan_analyse():

    if not ENTPACKTE_DATEI.exists():
        return False

    offset = header_laenge()

    with open(ENTPACKTE_DATEI, "rb") as f:

        f.seek(offset)

        daten = []

        for _ in range(900 * 900):
            rohwert = struct.unpack("<H", f.read(2))[0]
            wert = rohwert & 0x0FFF

            if wert == 2500:
                wert = 0

            daten.append(wert)

    bild = np.array(daten, dtype=np.uint16).reshape((900, 900))

    print()
    print("Bildgröße:", bild.shape)
    print("Oben links :", bild[0, 0])
    print("Oben rechts:", bild[0, 899])
    print("Unten links:", bild[899, 0])
    print("Unten rechts:", bild[899, 899])

    print()
    print("========== RADOLAN ANALYSE ==========")
    print("Pixel:", bild.size)
    print("Minimum:", bild.min())
    print("Maximum:", bild.max())
    print("Mittelwert:", round(float(bild.mean()), 2))
    print()

    werte, anzahl = np.unique(bild, return_counts=True)

    sortiert = sorted(
        zip(werte, anzahl),
        key=lambda x: x[1],
        reverse=True
    )
    regen = np.argwhere(bild > 0)

    if len(regen) > 0:
        ymin, xmin = regen.min(axis=0)
        ymax, xmax = regen.max(axis=0)

        print()
        print("Regenbereich:")
        print(f"Y: {ymin} bis {ymax}")
        print(f"X: {xmin} bis {xmax}")
        print(f"Breite: {xmax - xmin + 1}")
        print(f"Höhe : {ymax - ymin + 1}")
    print("20 häufigste Werte:\n")

    for wert, menge in sortiert[:20]:
            print(f"{wert:5d} : {menge}")

    return True
def radolan_koordinaten():

    raster = 900
    pixelgroesse = 1000.0  # 1 km

    x0 = -523.4622
    y0 = -4658.645

    x = np.arange(raster) * pixelgroesse + x0
    y = np.arange(raster) * pixelgroesse + y0

    print()
    print("===== RADOLAN-KOORDINATEN =====")
    print(f"Raster: {raster} x {raster}")
    print()
    print(f"X links : {x[0]:.1f} m")
    print(f"X rechts: {x[-1]:.1f} m")
    print(f"Y oben  : {y[0]:.1f} m")
    print(f"Y unten : {y[-1]:.1f} m")

    return True
RADOLAN_CRS = CRS.from_proj4(
    "+proj=stere +lat_0=90 +lat_ts=90 +lon_0=10 "
    "+k=0.93301270189 "
    "+x_0=0 +y_0=0 "
    "+a=6370040 +b=6370040 "
    "+to_meter=1000 +no_defs"
)

WGS84 = CRS.from_epsg(4326)

TRANSFORMER = Transformer.from_crs(
    RADOLAN_CRS,
    WGS84,
    always_xy=True,
)
def pixel_zu_latlon(x_pixel, y_pixel):
    x = -523.4622 + x_pixel
    y = -3758.645 - y_pixel

    lon, lat = TRANSFORMER.transform(x, y)

    return lat, lon