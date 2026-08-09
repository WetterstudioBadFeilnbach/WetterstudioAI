from modules.eclipse_engine import lade_finsternis


def berechne_sonnenfinsternis(lat: float, lon: float):
    """
    Liefert die echten Sonnenfinsternis-Daten für einen Standort.

    Die Berechnung erfolgt über die funktionierende
    Xavier-Jubier-Eclipse-Engine.
    """

    daten = lade_finsternis(
        lat=lat,
        lon=lon,
        hoehe=500
    )

    def wert(name, standard="--"):
        value = daten.get(name, "")
        if value is None:
            return standard

        value = str(value).strip()

        if not value:
            return standard

        if value == "== None ==":
            return standard

        return value

    return {
        "beginn": wert("c1_time"),
        "maximum": wert("mid_time"),
        "ende": wert("c4_time"),

        "bedeckung": wert("coverage"),
        "magnitude": wert("mag"),

        "sonnenhoehe": wert("mid_alt"),
        "azimut": wert("mid_azi"),

        "c1_date": wert("c1_date"),
        "c1_time": wert("c1_time"),

        "mid_date": wert("mid_date"),
        "mid_time": wert("mid_time"),

        "c4_date": wert("c4_date"),
        "c4_time": wert("c4_time"),

        "type": wert("type"),
        "duration": wert("duration"),
    }