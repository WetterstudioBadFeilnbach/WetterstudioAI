import math
letzte_zellen = []

def abstand(x1, y1, x2, y2):
    """
    Berechnet den Abstand zwischen zwei Punkten.
    """
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
def finde_gleiche_zellen(alte_zellen, neue_zellen, max_abstand=40):
    """
    Vergleicht zwei Zelllisten und ordnet gleiche Gewitterzellen zu.
    """

    for neue in neue_zellen:

        beste_zelle = None
        kleinster_abstand = max_abstand

        for alte in alte_zellen:

            d = abstand(
                alte["x"],
                alte["y"],
                neue["x"],
                neue["y"]
            )

            if d < kleinster_abstand:
                kleinster_abstand = d
                beste_zelle = alte

        neue["match"] = beste_zelle

    global letzte_zellen
    letzte_zellen = neue_zellen.copy()

    return neue_zellen

def berechne_richtung(alte_zelle, neue_zelle):
    """
    Berechnet den Bewegungswinkel einer Gewitterzelle.
    """

    dx = neue_zelle["x"] - alte_zelle["x"]
    dy = neue_zelle["y"] - alte_zelle["y"]

    winkel = math.degrees(math.atan2(dy, dx))

    if winkel < 0:
        winkel += 360

    return winkel