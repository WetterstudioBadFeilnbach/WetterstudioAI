"""Stundenbasiertes Wetterstudio-Ensemble: Tag 06-18, Nacht 18-06 (Europe/Berlin).
Keine Ersatz- oder Testwerte. Nacht ist dem Abenddatum zugeordnet.
"""
from collections import Counter
from datetime import date, datetime, timedelta
from functools import lru_cache
import time
import requests

MODELLE = {"best_match": .25, "ecmwf_ifs": .40, "icon_global": .35}
URL = "https://api.open-meteo.com/v1/forecast"


def _datum(d):
    return d if isinstance(d, date) else date.fromisoformat(str(d))


@lru_cache(maxsize=256)
def _hole_stunden(lat, lon, modell):
    for versuch in range(1, 4):
        try:
            antwort = requests.get(URL, params={
                "latitude": lat, "longitude": lon, "models": modell,
                "hourly": "temperature_2m,weather_code,precipitation_probability,precipitation",
                "forecast_days": 10, "timezone": "Europe/Berlin",
            }, timeout=30, headers={"User-Agent": "Wetterstudio-Bad-Feilnbach-AI"})
            antwort.raise_for_status()
            break
        except (requests.Timeout, requests.ConnectionError):
            if versuch == 3:
                raise
            wartezeit = 5 * versuch
            print(f"Open-Meteo {modell}: Versuch {versuch} fehlgeschlagen, neuer Versuch in {wartezeit} Sekunden.", flush=True)
            time.sleep(wartezeit)
    daten = antwort.json().get("hourly", {})
    zeiten = daten.get("time", [])
    if not zeiten:
        raise ValueError(f"Keine Stundenwerte für {modell}")
    keys = ("temperature_2m", "weather_code", "precipitation_probability", "precipitation")
    if any(len(daten.get(k, [])) != len(zeiten) for k in keys):
        raise ValueError(f"Unvollständige Stundenreihen für {modell}")
    return {t: {k: daten[k][i] for k in keys} for i, t in enumerate(zeiten)}


def _zeitfenster(ziel_datum, modus):
    tag = _datum(ziel_datum)
    if modus == "Tageswetter":
        beginn = datetime(tag.year, tag.month, tag.day, 6)
        ende = datetime(tag.year, tag.month, tag.day, 18)
    elif modus == "Nachtwetter":
        beginn = datetime(tag.year, tag.month, tag.day, 18)
        folgetag = tag + timedelta(days=1)
        ende = datetime(folgetag.year, folgetag.month, folgetag.day, 6)
    else:
        raise ValueError("modus muss Tageswetter oder Nachtwetter sein")
    return beginn, ende


def _gruppe(code):
    if code in (95, 96, 99): return "gewitter"
    if code in (71, 73, 75, 77, 85, 86): return "schnee"
    if code in (80, 81, 82): return "schauer"
    if code in (61, 63, 65, 66, 67): return "regen"
    if code in (51, 53, 55, 56, 57): return "niesel"
    if code in (45, 48): return "nebel"
    if code == 3: return "bedeckt"
    if code in (1, 2): return "heiter"
    if code == 0: return "klar"
    raise ValueError(f"Unbekannter Wettercode: {code}")


def _repr_code(stunden):
    """Wettercharakter eines Zeitfensters aus echten Stundenwerten.

    Regen, Schauer und Niesel werden getrennt gewertet. Eine kurze nasse
    Phase darf nicht automatisch eine überwiegend trockene Nacht überdecken.
    Dies sind Darstellungsregeln, keine amtlichen Warnschwellen.
    """
    codes = [r["weather_code"] for r in stunden]
    if any(c is None for c in codes):
        raise ValueError("Wettercode fehlt")
    codes = [int(c) for c in codes]
    gruppen = [_gruppe(c) for c in codes]
    anzahl = Counter(gruppen)

    def haeufigster_code(gruppe):
        kandidaten = [c for c in codes if _gruppe(c) == gruppe]
        return Counter(kandidaten).most_common(1)[0][0]

    # Seltene Gewitter/Schneefälle können relevant sein; das Wetterzeichen
    # beschreibt dann ein mögliches Ereignis, nicht die gesamte Zeitdauer.
    for gruppe in ("gewitter", "schnee"):
        if anzahl[gruppe]:
            return haeufigster_code(gruppe)

    nass = ("regen", "schauer", "niesel")
    nasse_stunden = sum(anzahl[g] for g in nass)
    mengen = [max(0.0, float(r.get("precipitation") or 0.0)) for r in stunden]
    gesamtmenge = sum(mengen)

    if nasse_stunden >= 4 or (nasse_stunden >= 2 and gesamtmenge >= 0.5):
        # Bei gleicher Häufigkeit entscheiden die Niederschlagsmengen,
        # nicht eine fest einprogrammierte Bevorzugung von Schauern.
        gruppenmenge = {g: sum(m for m, k in zip(mengen, gruppen) if k == g)
                        for g in nass}
        gruppe = max(nass, key=lambda g: (anzahl[g], gruppenmenge[g]))
        return haeufigster_code(gruppe)

    trocken = Counter(g for g in gruppen if g not in
                      ("regen", "schauer", "niesel", "gewitter", "schnee"))
    if trocken["nebel"] < 3:
        trocken.pop("nebel", None)
    if trocken:
        return haeufigster_code(trocken.most_common(1)[0][0])
    # Bei ausschließlich nassen Stunden bleibt der tatsächlich beobachtete
    # Wettercode erhalten, auch wenn die Niederschlagsmenge gering ist.
    return Counter(codes).most_common(1)[0][0]


def _ein_modell(ziel_datum, lat, lon, modus, modell):
    beginn, ende = _zeitfenster(ziel_datum, modus)
    daten = _hole_stunden(round(float(lat), 5), round(float(lon), 5), modell)
    stunden = [v for t, v in daten.items() if beginn <= datetime.fromisoformat(t) < ende]
    # Vollständiges 12-Stunden-Fenster zwingend; sonst kein scheinbar vollständiger Wert.
    if len(stunden) != 12:
        raise ValueError(f"{modell}: nur {len(stunden)} von 12 Stunden verfügbar ({modus} {ziel_datum})")
    temps = [r["temperature_2m"] for r in stunden]
    if any(t is None for t in temps):
        raise ValueError(f"{modell}: fehlende Temperatur")
    probs = [r["precipitation_probability"] for r in stunden]
    gruppen = [_gruppe(int(r["weather_code"])) for r in stunden]
    nasse_gruppen = ("regen", "schauer", "niesel", "gewitter", "schnee")
    regenstunden = sum(g in nasse_gruppen for g in gruppen)
    mengen = [max(0.0, float(r.get("precipitation") or 0.0)) for r in stunden]
    return {
        "modell": modell, "temperatur_min": min(temps),
        "temperatur_max": max(temps), "weather_code": _repr_code(stunden),
        "niederschlag_wahrscheinlichkeit": max(probs) if all(p is not None for p in probs) else None,
        "niederschlagsstunden": regenstunden,
        "niederschlagsmenge_mm": round(sum(mengen), 2),
        "wettergruppen_stunden": dict(Counter(gruppen)),
    }


def zeitraumvorhersage_ensemble(ziel_datum, lat, lon, modus):
    """Gibt Zeitraum-Min/Max und vorherrschenden Wettercode zurück.
    Mindestens ein erfolgreiches Modell ist nötig; keine Testwerte.
    """
    ergebnisse = []
    for modell in MODELLE:
        try:
            ergebnisse.append(_ein_modell(ziel_datum, lat, lon, modus, modell))
        except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
            print(f"WARNUNG {modell} {ziel_datum} {modus} ({lat}, {lon}): {exc}", flush=True)
    if not ergebnisse:
        raise RuntimeError(f"Keine echten Wetterdaten: {ziel_datum} {modus} ({lat}, {lon})")

    def mittel(feld):
        verfuegbar = [(r[feld], MODELLE[r["modell"]]) for r in ergebnisse if r[feld] is not None]
        return round(sum(wert * gewicht for wert, gewicht in verfuegbar) / sum(gewicht for _, gewicht in verfuegbar), 1) if verfuegbar else None

    # Erst die Wetterart der Einzelmodelle gewichten. Anschließend prüfen,
    # wie viel vom 12-Stunden-Fenster tatsächlich Niederschlag enthält.
    # Best Match ist eine Modellauswahl, keine unabhängige dritte Modellmeinung.
    gruppengewichte = {}
    for r in ergebnisse:
        g = _gruppe(r["weather_code"])
        gruppengewichte[g] = gruppengewichte.get(g, 0.0) + MODELLE[r["modell"]]
    gruppe = max(gruppengewichte, key=gruppengewichte.get)

    gesamtgewicht = sum(MODELLE[r["modell"]] for r in ergebnisse)
    nasse_gruppen = {"regen", "schauer", "niesel"}
    mittlere_nassdauer = sum(MODELLE[r["modell"]] * r["niederschlagsstunden"]
                            for r in ergebnisse) / gesamtgewicht
    mittlere_menge = sum(MODELLE[r["modell"]] * r["niederschlagsmenge_mm"]
                        for r in ergebnisse) / gesamtgewicht
    # Wenige nasse Stunden bei ansonsten trockenem Verlauf nicht als
    # ganztägigen/ganze Nacht anhaltenden Regen darstellen.
    if gruppe in nasse_gruppen and mittlere_nassdauer < 3 and mittlere_menge < 1.0:
        trocken = {g: w for g, w in gruppengewichte.items()
                   if g not in nasse_gruppen and g not in ("gewitter", "schnee")}
        if trocken:
            gruppe = max(trocken, key=trocken.get)

    code = max((r for r in ergebnisse if _gruppe(r["weather_code"]) == gruppe),
               key=lambda r: MODELLE[r["modell"]])["weather_code"]
    return {
        "datum": str(_datum(ziel_datum)), "modus": modus,
        "temperatur_min": mittel("temperatur_min"),
        "temperatur_max": mittel("temperatur_max"),
        "weather_code": code,
        "niederschlag_wahrscheinlichkeit": mittel("niederschlag_wahrscheinlichkeit"),
        "anzahl_modelle": len(ergebnisse),
        "modelle": [r["modell"] for r in ergebnisse],
        # Zusatzinformationen für verständliche Wetterberichte; die Karte
        # verwendet weiterhin weather_code und die beiden Temperaturen.
        "mittlere_niederschlagsstunden": round(mittlere_nassdauer, 1),
        "mittlere_niederschlagsmenge_mm": round(mittlere_menge, 1),
        "modell_details": {r["modell"]: {
            "weather_code": r["weather_code"],
            "niederschlagsstunden": r["niederschlagsstunden"],
            "niederschlagsmenge_mm": r["niederschlagsmenge_mm"],
        } for r in ergebnisse},
        "zeitfenster": "06:00–18:00" if modus == "Tageswetter" else "18:00–06:00 Folgetag",
    }
