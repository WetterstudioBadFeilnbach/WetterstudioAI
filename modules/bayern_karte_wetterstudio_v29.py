import geopandas as gpd
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, PathPatch, FancyBboxPatch
from matplotlib.path import Path as MplPath
from matplotlib.offsetbox import AnnotationBbox, DrawingArea
from matplotlib.text import Text
from matplotlib import patheffects
import numpy as np
from datetime import date, timedelta
from pathlib import Path

from modules.wetter_zeitraum import zeitraumvorhersage_ensemble

from modules.wetterkarte_orte import (
    WETTERKARTE_ORTE
)


BAYERN_KARTENBEREICH = {
    "longitude_min": 8.8,
    "longitude_max": 14.2,
    "latitude_min": 47.0,
    "latitude_max": 50.8
}


ORT_TEXT_POSITIONEN = {
    "Aschaffenburg": (-12, 6, "right", "bottom"),
    "Schweinfurt": (8, 10, "left", "bottom"),
    "Coburg": (-8, 10, "right", "bottom"),
    "Hof": (8, 8, "left", "bottom"),

    "Bayreuth": (8, -14, "left", "top"),

    "Nürnberg": (-10, 10, "right", "bottom"),
    "Ansbach": (-10, -12, "right", "top"),
    "Amberg": (10, 8, "left", "bottom"),

    "Regen": (-10, -14, "right", "top"),
    "Straubing": (10, 8, "left", "bottom"),

    "Ingolstadt": (-12, 8, "right", "bottom"),
    "Augsburg": (-12, 8, "right", "bottom"),

    "München": (-12, -12, "right", "top"),
    "Landshut": (10, 8, "left", "bottom"),
    "Altötting": (10, -12, "left", "top"),

    "Passau": (-12, 8, "right", "bottom"),

    "Rosenheim": (10, 8, "left", "bottom"),
    "Berchtesgaden": (-12, -12, "right", "top"),

    "Kempten": (-12, 8, "right", "bottom"),

    "Garmisch-Partenkirchen": (
        -12,
        -12,
        "right",
        "top"
    )
}


def wettercode_zu_typ(weather_code):

    if weather_code == 0:
        return "sonne"

    if weather_code in [1, 2]:
        return "wolkig"

    if weather_code == 3:
        return "bedeckt"

    if weather_code in [45, 48]:
        return "nebel"

    if weather_code in [51, 53, 55, 56, 57]:
        return "niesel"

    if weather_code in [80, 81, 82]:
        return "schauer"

    if weather_code in [
        61, 63, 65, 66, 67
    ]:
        return "regen"

    if weather_code in [
        71, 73, 75, 77
    ]:
        return "schnee"

    if weather_code in [
        95, 96, 99
    ]:
        return "gewitter"

    return "bedeckt"


def zeichne_wettersymbol(achse, longitude, latitude, wetter_typ, groesse=0.075, nacht=False, offset=(0, 0), bildposition=None):
    """Wettersymbol in festen Bildschirmpunkten, nicht in Geo-Grad."""
    symbol_faktor = 1.04
    da = DrawingArea(86, 72, 0, 0)
    def sk(p):
        return p * symbol_faktor
    def kreis(x, y, r, farbe, rand="#29211d", dicke=2.1):
        da.add_artist(Circle((sk(x), sk(y)), sk(r), facecolor=farbe, edgecolor=rand, linewidth=dicke))
    def linie(xs, ys, farbe, breite=2.6):
        from matplotlib.lines import Line2D
        da.add_artist(Line2D([sk(x) for x in xs], [sk(y) for y in ys], color=farbe, linewidth=breite, solid_capstyle="round"))
    ist_sonne = wetter_typ in ("sonne", "wolkig", "regen_wolkig", "schauer")
    if ist_sonne:
        if nacht:
            # V16: Nur die obere Mondsichel bleibt sichtbar.
            # Die untere Spitze liegt vollstaendig hinter der Wolke.
            # Die Wolke wird anschliessend davor gezeichnet.
            from matplotlib.patches import Polygon
            mond_vertices = [
                (33, 60),
                (18, 57), (12, 45), (14, 34),  # Aussenseite oben/links
                (16, 19), (30, 18), (36, 23),  # Unterkante hinter der Wolke
                (38, 26), (27, 27), (27, 43),  # Innenseite nach oben
                (28, 51), (31, 57), (33, 60),
                (33, 60),
            ]
            mond_codes = ([MplPath.MOVETO] + [MplPath.CURVE4] * 12
                          + [MplPath.CLOSEPOLY])
            da.add_artist(PathPatch(
                MplPath([(sk(x), sk(y)) for x, y in mond_vertices], mond_codes),
                facecolor="#ffe48b", edgecolor="#29211d",
                linewidth=2.0, joinstyle="round"))
            # Kleiner, vierzackiger Rautenstern; unveraenderte Position.
            stern = [(49, 55), (51, 50), (56, 48), (51, 46),
                     (49, 41), (47, 46), (42, 48), (47, 50)]
            da.add_artist(Polygon(
                [(sk(x), sk(y)) for x, y in stern], closed=True,
                facecolor="#fff2a1", edgecolor="#29211d", linewidth=1.45))
        else:
            kreis(27, 33, 14, "#ffbc3b")
            import math
            for a in range(0, 360, 45):
                t=math.radians(a)
                linie([27+18*math.cos(t), 27+23*math.cos(t)],
                      [33+18*math.sin(t), 33+23*math.sin(t)], "#29211d", 2)
    if wetter_typ != "sonne":
        if wetter_typ == "nebel":
            for y in (17, 26, 35):
                linie([13, 53], [y, y], "#59616a", 3)
        else:
            # Eine einzige geschlossene Wolkenkontur: keine inneren Ovale.
            punkte = [
                (17, 15), (11, 18), (11, 27), (18, 31),
                (21, 34), (26, 35), (31, 32),
                (36, 43), (50, 43), (53, 32),
                (63, 32), (65, 20), (57, 15),
                (45, 12), (29, 12), (17, 15)
            ]
            codes = [MplPath.MOVETO] + [MplPath.CURVE4] * 15
            da.add_artist(PathPatch(MplPath([(sk(x), sk(y)) for x, y in punkte], codes),
                facecolor="white", edgecolor="#29211d", linewidth=2.2,
                joinstyle="round"))
            if wetter_typ in ("regen", "regen_wolkig", "schauer", "niesel", "gewitter"):
                # V20: Drei enger beieinanderliegende Regenstriche,
                # nach rechts unten geneigt (Wetterblick-Vergleich).
                # DrawingArea: y=0 liegt unten; daher x am unteren Ende +4.
                for x in ((33, 44) if wetter_typ == "niesel" else (29, 38, 47)):
                    linie([x, x+2 if wetter_typ == "niesel" else x+3],
                          [13, 9 if wetter_typ == "niesel" else 6],
                          "#078fe0", 2.0 if wetter_typ == "niesel" else 2.8)
            if wetter_typ == "schnee":
                # V23: Groessere, klar erkennbare Schneeflocken direkt unter der Wolke.
                # Drei Flocken mit jeweils sechs Armen, ohne die Temperaturbox zu beruehren.
                import math
                for cx in (26, 39, 52):
                    cy = 7.5
                    for winkel in (0, 60, 120):
                        t = math.radians(winkel)
                        dx, dy = 4.3 * math.cos(t), 4.3 * math.sin(t)
                        linie([cx-dx, cx+dx], [cy-dy, cy+dy], "#078fe0", 2.35)
            if wetter_typ == "gewitter":
                # V23: Blitz breiter und laenger, vollstaendig sichtbar unter der Wolke.
                from matplotlib.patches import Polygon
                da.add_artist(Polygon([(sk(x),sk(y)) for x,y in
                    [(36,20),(30,10),(37,10),(34,1),(49,15),(41,14),(45,20)]],
                    closed=True, facecolor="#ffd12b", edgecolor="#29211d",
                    linewidth=1.35, joinstyle="round"))
    box = AnnotationBbox(da, bildposition if bildposition is not None else (longitude, latitude), xybox=offset,
                         xycoords="axes fraction" if bildposition is not None else "data", boxcoords="offset points",
                         frameon=False, box_alignment=(0.5,0.5), pad=0, zorder=18)
    achse.add_artist(box)


def zeichne_temperaturen(achse, longitude, latitude, temperatur_min,
                         temperatur_max, modus, offset_x, offset_y, bildposition=None):
    """V26 Wetterstudio: Alpinblau/Gold, abgerundet, gleiche Gesamtgroesse wie V25."""
    breite, hoehe = 42, 25
    flaeche = DrawingArea(2 * breite, hoehe, 0, 0)
    for x, wert, farbe, schriftfarbe in (
        (0, temperatur_min, "#143C83", "#FFFFFF"),
        (breite, temperatur_max, "#FFBA38", "#642B00"),
    ):
        flaeche.add_artist(FancyBboxPatch(
            (x + 0.5, 0.5), breite - 1, hoehe - 1,
            boxstyle="round,pad=0,rounding_size=4.5",
            facecolor=farbe, edgecolor="#FFFFFF", linewidth=0.8,
        ))
        flaeche.add_artist(Text(x=x + breite / 2, y=hoehe / 2,
                                text=f"{wert:.0f}°C", color=schriftfarbe,
                                fontsize=15.0, fontweight="heavy",
                                ha="center", va="center"))
    achse.add_artist(AnnotationBbox(
        flaeche, bildposition if bildposition is not None else (longitude, latitude),
        xycoords="axes fraction" if bildposition is not None else "data",
        xybox=(0, 0) if bildposition is not None else (offset_x, offset_y - 31), boxcoords="offset points",
        box_alignment=(0.5, 0.5), frameon=False, pad=0, zorder=25))


# V26: Nur Temperaturfelder Alpinblau/Gold, abgerundet, weisser Rand; Layout unveraendert.
# V25: Hof besser lesbar; zwei winzige GeoJSON-Loch-Artefakte oberhalb der Temperaturfelder kaschiert.
# V24: Hof-Name minimal ins Karteninnere; nur Amberg/Rosenheim/Kempten-Symbole feinjustiert.
# V19: Niederschlags-Abstaende gezielt verkleinert, Schrift und Layout beibehalten.
# V18: Groessere fette Temperaturziffern; Abstand bei Regen/Schnee/Gewitter.
# V17: Schrift lesbarer; minimale Positionskorrekturen. Mond und alle Wettersymbole unveraendert.
# V14: Glatte Bezier-Mondsichel, korrigierte Ortsgruppen.
# V13: Mondpfad repariert; Temperaturfelder wieder lesbar vergroessert.
# V12: Kompaktere Temperaturfelder, Positionen und Mondsichel ueberarbeitet.
# V11: Schweinfurt-Gruppe enger, Temperaturfelder schmaler und hoeher.
# V9: Angepasstes Layout, abgelesen aus der bereitgestellten Wetterblick-Referenz.
# Koordinaten in Referenzbild-Pixeln (1200 x 1230), NICHT geografische Orte.
# Ortskoordinaten fuer die Wetterdaten bleiben unveraendert.
REFERENZ_BREITE = 1200.0
REFERENZ_HOEHE = 1230.0
# V14: Positionskorrekturen anhand der transparenten Ueberlagerung.
# Eintraege: (Ortsname, Wettersymbol, Temperatur), auf 1200x1230 normiert.
REFERENZ_LAYOUT = {
    'Aschaffenburg': ((86, 206), (86, 263), (92, 327)),
    'Schweinfurt': ((302, 147), (320, 199), (322, 257)),
    'Coburg': ((501, 95), (503, 138), (508, 199)),
    'Hof': ((725, 66), (754, 116), (754, 173)),
    'Bayreuth': ((642, 191), (650, 225), (650, 286)),
    'Nürnberg': ((522, 407), (536, 456), (536, 512)),
    'Ansbach': ((384, 448), (384, 488), (384, 550)),
    'Amberg': ((708, 385), (713, 429), (713, 490)),
    'Regen': ((1020, 514), (1020, 557), (1020, 616)),
    'Straubing': ((890, 594), (911, 641), (911, 701)),
    'Ingolstadt': ((620, 646), (625, 695), (625, 758)),
    'Augsburg': ((474, 760), (467, 808), (467, 870)),
    'München': ((641, 848), (642, 891), (642, 952)),
    'Landshut': ((760, 731), (790, 773), (790, 834)),
    'Altötting': ((923, 844), (940, 900), (940, 961)),
    'Passau': ((1093, 726), (1094, 769), (1094, 827)),
    'Rosenheim': ((797, 954), (795, 1003), (795, 1064)),
    'Berchtesgaden': ((990, 1038), (991, 1090), (991, 1150)),
    'Kempten': ((335, 1022), (329, 1072), (329, 1132)),
    'Garmisch-Partenkirchen': ((550, 1024), (550, 1095), (550, 1157)),
}



def bildpunkt(p):
    """Referenz-Bildpunkt zu Matplotlib-Achsenanteilen (Ursprung unten links)."""
    return (p[0] / REFERENZ_BREITE, 1.0 - p[1] / REFERENZ_HOEHE)


def erstelle_bayern_karte(
    ziel_datum=None,
    modus="Gesamt",
    wetter_symbole=True,
    dateipfad=None,
    symboltest=False
):

    print()
    print(
        "===== ERSTELLE BAYERN WETTERKARTE ====="
    )

    if ziel_datum is None:

        ziel_datum = (
            date.today()
            + timedelta(days=1)
        ).isoformat()

    print(
        "Vorhersage für:",
        ziel_datum
    )

    print(
        "Modus:",
        modus
    )

    deutschland = gpd.read_file(
        "data/geo/deutschland_bundeslaender.geojson"
    )

    bayern = deutschland[
        deutschland["name"] == "Bayern"
    ]

    fig, achse = plt.subplots(
        figsize=(12, 12.3)
    )

    fig.patch.set_alpha(0)

    achse.set_facecolor("none")

    # V28: Bayerisches Eisblau statt Alpen-Sand, alle anderen Gestaltungselemente unveraendert.
    # Bayern-Fläche
    bayern.plot(
        ax=achse,
        color="#B9DCEB",
        edgecolor="white",
        linewidth=1.6,
        zorder=1
    )

    # Landkreisgrenzen, falls die passende GeoJSON lokal vorhanden ist.
    # Keine Daten werden heruntergeladen oder erfunden.
    import glob
    kandidaten = []
    for muster in ("data/geo/*landkreis*.geojson", "static/geojson/*landkreis*.geojson",
                   "data/geo/*kreis*.geojson", "static/geojson/*kreis*.geojson"):
        kandidaten.extend(glob.glob(muster))
    for quelle in kandidaten:
        try:
            kreise = gpd.read_file(quelle)
            if kreise.crs is not None and bayern.crs is not None:
                kreise = kreise.to_crs(bayern.crs)
            kreise = gpd.clip(kreise, bayern)
            if not kreise.empty:
                kreise.boundary.plot(ax=achse, color="white", linewidth=0.65, zorder=3)
                print("Landkreisgrenzen:", quelle)
                break
        except Exception as fehler:
            print("Hinweis: Landkreisdatei nicht nutzbar:", quelle, fehler)

    # Die Geografie wird auf den sichtbaren Bayern-Umriss zugeschnitten.
    # Dadurch passt der Kartenausschnitt besser zum Referenzbild.
    minx, miny, maxx, maxy = bayern.total_bounds
    # V6: Bild und Kartenflaeche fuellen dieselbe feste 1200:1230-Leinwand.
    # Keine nachtraegliche Bounding-Box-Aenderung, die Ortspositionen verschiebt.
    breite, hoehe = maxx - minx, maxy - miny
    achse.set_xlim(minx - breite * 0.012, maxx + breite * 0.012)
    achse.set_ylim(miny - hoehe * 0.008, maxy + hoehe * 0.008)
    achse.set_aspect("auto")
    achse.set_position([0, 0, 1, 1])

    # V25: Zwei winzige schwarze/weiße Löcher im GeoJSON-Bayernpolygon
    # (NICHT Teile der Wettersymbole!) oberhalb der Temperaturfelder.
    # Nur diese beiden sehr kleinen Stellen in der Kartenfarbe abdecken.
    # Die Referenzkoordinaten sind 1200 x 1230 (Ursprung oben links).
    # Alle Orts-, Symbol- und Temperaturpositionen bleiben unverändert.
    for px, py, w, h in (
        (366, 1107, 12, 13),  # Kempten: kleines Loch über 12°C
        (802, 1051, 13, 14),  # Rosenheim: schräger Strich über 12°C
    ):
        achse.add_patch(Rectangle(
            ((px - w / 2) / 1200, 1 - (py + h / 2) / 1230),
            w / 1200, h / 1230,
            transform=achse.transAxes, facecolor="#B9DCEB",
            edgecolor="none", zorder=12, clip_on=False
        ))

    # V21: Verschiedene Symboltypen ohne Wetterdatenabruf testen.
    # Keine dieser Testtemperaturen ist eine Wettervorhersage.
    TEST_SYMBOLE = {
        "Aschaffenburg": "sonne", "Schweinfurt": "wolkig",
        "Coburg": "regen", "Hof": "schnee", "Bayreuth": "gewitter",
        "Nürnberg": "gewitter", "Ansbach": "schnee", "Amberg": "regen_wolkig",
        "Regen": "wolkig", "Straubing": "regen", "Ingolstadt": "sonne",
        "Augsburg": "gewitter", "München": "schnee", "Landshut": "regen",
        "Altötting": "wolkig", "Passau": "gewitter", "Rosenheim": "schnee",
        "Berchtesgaden": "regen_wolkig", "Kempten": "sonne",
        "Garmisch-Partenkirchen": "gewitter",
    }
    for original_ort in WETTERKARTE_ORTE:
        # Regen im Bayerischen Wald ersetzt Regensburg. Koordinaten werden
        # VOR der Modellabfrage gesetzt, damit keine Regensburger Werte erscheinen.
        ort = dict(original_ort)
        if ort["name"] == "Bamberg":
            continue  # Bamberg nicht auf der Karte und keine Datenabfrage
        if ort["name"] == "Regensburg":
            ort.update(name="Regen", latitude=48.971, longitude=13.128)
        if symboltest:
            # Absichtlich fiktive Werte: ausschliesslich Layouttest.
            vorhersage = {"temperatur_min": 3, "temperatur_max": 12,
                          "weather_code": 3, "anzahl_modelle": 1}
        else:
            if modus not in ("Tageswetter", "Nachtwetter"):
                raise ValueError("Für echte Wetterdaten Tageswetter oder Nachtwetter wählen")
            vorhersage = zeitraumvorhersage_ensemble(
                ziel_datum, lat=ort["latitude"], lon=ort["longitude"], modus=modus
            )
            if vorhersage is None or vorhersage.get("anzahl_modelle", 0) == 0:
                print("WARNUNG: Keine Vorhersage für", ort["name"])
                continue

        name = ort["name"]
        if name not in REFERENZ_LAYOUT:
            print("WARNUNG: Kein Referenzlayout für", name)
            continue
        text_p, symbol_p, temp_p = REFERENZ_LAYOUT[name]
        # Die Elemente bleiben pro Ort als geschlossene Gruppe zusammen.
        # Nur die Namenspositionen werden gesondert auf Ueberlappungen abgestimmt.
        # V17: Feinkorrekturen stehen in REFERENZ_LAYOUT.
        # V24: Nur Hof minimal weiter in die gruene Kartenflaeche.
        namens_korrektur = {"Hof": (0, 15), "Regen": (-23, 0), "Berchtesgaden": (-24, 0)}
        dx, dy = namens_korrektur.get(name, (0, 0))
        text_p = (text_p[0] + dx, text_p[1] + dy)
        lon, lat = ort["longitude"], ort["latitude"]

        # Drei unabhängig platzierbare Elemente, jeweils FEST nach Referenz.
        # Kein automatisches Verschieben oder nachtraegliches Stapeln.
        textname = name
        if name == "Garmisch-Partenkirchen":
            textname = "Garmisch-\nPartenkirchen"
        if name == "Aschaffenburg":
            textname = "Aschaffen-\nburg"
        achse.text(*bildpunkt(text_p), textname,
                   transform=achse.transAxes, ha="center", va="center",
                   fontsize=16.1, fontfamily="DejaVu Sans", fontstretch="condensed",
                   fontweight="heavy", color="black",
                   linespacing=1.05, zorder=30, clip_on=False)

        # V19: Niederschlag bleibt zwischen Ortsname und Temperaturfeld.
        # Kein starkes Verschieben mehr: der V18-Abstand von +40 Pixeln
        # liess Temperaturfelder teils weit unter die Bayern-Karte rutschen.
        # y steigt in den Referenzkoordinaten nach unten.
        wetter_typ = (TEST_SYMBOLE.get(name, "wolkig") if symboltest
                      else wettercode_zu_typ(vorhersage["weather_code"]))
        niederschlag = wetter_typ in ("regen", "regen_wolkig", "schauer", "niesel", "schnee", "gewitter")
        if wetter_symbole and niederschlag:
            # V23: Nur das Wettersymbol um 5 Referenzpixel nach oben.
            # Die Temperaturposition bleibt exakt wie in V22 (+11).
            symbol_p = (symbol_p[0], symbol_p[1] - 5)
            temp_p = (temp_p[0], temp_p[1] + 11)
        # V24: Amberger Mondsichel aus dem Ortsnamen nehmen, ohne
        # Name oder Temperatur zu verschieben.
        if name == "Amberg" and wetter_symbole:
            symbol_p = (symbol_p[0], symbol_p[1] + 7)
        # V24: Winzige Niederschlagsreste an der Oberkante des
        # Temperaturfelds vermeiden; ausschliesslich Symbolkorrektur.
        if name in ("Rosenheim", "Kempten") and wetter_symbole:
            symbol_p = (symbol_p[0], symbol_p[1] - 4)
        if wetter_symbole:
            zeichne_wettersymbol(
                achse, lon, lat, wetter_typ,
                nacht=(modus == "Nachtwetter"),
                bildposition=bildpunkt(symbol_p)
            )
        zeichne_temperaturen(
            achse, lon, lat, vorhersage["temperatur_min"],
            vorhersage["temperatur_max"], modus, 0, 0,
            bildposition=bildpunkt(temp_p)
        )

    achse.set_axis_off()

    # Achse bleibt exakt an der Bildkante, auch bei der Speicherung.
    achse.set_position([0, 0, 1, 1])

    if dateipfad is None:
        dateipfad = "data/bayern_wetterkarte.png"
    dateipfad = str(dateipfad)
    Path(dateipfad).parent.mkdir(parents=True, exist_ok=True)

    plt.savefig(
        dateipfad,
        dpi=180,
        bbox_inches=None,
        pad_inches=0,
        transparent=True
    )

    plt.close()

    print()
    print(
        "Bayern-Wetterkarte erstellt:",
        dateipfad
    )
    if symboltest:
        print("ACHTUNG: SYMBOLTEST MIT FIKTIVEN TEMPERATUREN – KEINE VORHERSAGE")

    return dateipfad

def erstelle_sieben_tage(start_datum=None, modus="Gesamt", wetter_symbole=True):
    """Erzeugt sieben einzelne Karten ab dem gewaehlten Startdatum (inklusive)."""
    if start_datum is None:
        start = date.today()
    elif isinstance(start_datum, str):
        start = date.fromisoformat(start_datum)
    elif isinstance(start_datum, date):
        start = start_datum
    else:
        raise TypeError("start_datum muss YYYY-MM-DD oder ein date-Objekt sein")

    ergebnisse = []
    for tage in range(7):
        tag = start + timedelta(days=tage)
        datum = tag.isoformat()
        ausgabe = Path("data") / "wetterkarten" / f"bayern_{datum}.png"
        print(f"\n--- Karte {tage + 1}/7: {datum} ---")
        ergebnisse.append(erstelle_bayern_karte(
            ziel_datum=datum,
            modus=modus,
            wetter_symbole=wetter_symbole,
            dateipfad=ausgabe,
        ))
    return ergebnisse


def erstelle_wetterstudio_14_karten(start_datum=None):
    """7 Tage, jeweils eine Tages- und Nachtkarte mit beiden Temperaturwerten."""
    if start_datum is None:
        start = date.today()
    elif isinstance(start_datum, str):
        start = date.fromisoformat(start_datum)
    else:
        start = start_datum
    pfade = []
    for i in range(7):
        datum = (start + timedelta(days=i)).isoformat()
        for modus, typ in (("Tageswetter", "tag"), ("Nachtwetter", "nacht")):
            pfad = Path("data") / "wetterkarten" / f"bayern_{datum}_{typ}.png"
            pfade.append(erstelle_bayern_karte(
                ziel_datum=datum, modus=modus, wetter_symbole=True, dateipfad=pfad))
    return pfade


def erstelle_symboltest_v22(dateipfad="data/wetterkarten/test_v22_symbole.png"):
    """V22: Kompakte Niederschlagssymbole; alle Orts- und Temperaturpositionen wie V21."""
    return erstelle_bayern_karte(ziel_datum="2026-10-12", modus="Nachtwetter",
                                dateipfad=dateipfad, symboltest=True)

# Kompatibilitaet fuer vorhandene Aufrufe
def erstelle_symboltest_v21(dateipfad="data/wetterkarten/test_v21_symbole.png"):
    return erstelle_symboltest_v22(dateipfad=dateipfad)

# Rückwärtskompatibilität für bestehende Skripte
erstelle_wetterblick_14_karten = erstelle_wetterstudio_14_karten
