import json
import requests

DWD_URL = "https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json"


def lade_warnungen():
    try:
        response = requests.get(
            DWD_URL,
            timeout=10,
            headers={
                "User-Agent": "WetterstudioAI/1.0"
            }
        )

        response.raise_for_status()

        text = response.text

        if text.startswith("warnWetter.loadWarnings("):
            text = text[len("warnWetter.loadWarnings("):]

        if text.endswith(");"):
            text = text[:-2]

        daten = json.loads(text)

        return daten

    except Exception as e:
        print(f"DWD-Fehler: {e}")
        return None


def statistik(daten):

    statistik = {
        "gesamt": 0,
        "gelb": 0,
        "orange": 0,
        "rot": 0,
        "violett": 0,
        "gewitter": 0,
        "sturm": 0,
        "starkregen": 0,
        "hitze": 0,
        "tornado": 0,
        "schnee": 0,
    }

    if not daten:
        return statistik

    # Dieselbe DWD-Datenbasis wie die öffentliche Warnkarte:
    # normale Warnungen + Vorabinformationen
    alle_warnungen = []

    for quelle in ("warnings", "vorabInformation"):
        for kreis in daten.get(quelle, {}).values():
            alle_warnungen.extend(kreis)

    for warnung in alle_warnungen:

        # Nur echte DWD-Landkreiswarnungen zählen.
        # Seewetterwarnungen ausschließen.
        if warnung.get("type") == 1:
            continue

        statistik["gesamt"] += 1

        level = warnung.get("level", 0)

        if level == 2:
            statistik["gelb"] += 1
        elif level == 3:
            statistik["orange"] += 1
        elif level == 4:
            statistik["rot"] += 1
        elif level >= 5:
            statistik["violett"] += 1

        ereignis = warnung.get("event", "").lower()

        if "gewitter" in ereignis:
            statistik["gewitter"] += 1

        if "sturm" in ereignis:
            statistik["sturm"] += 1

        if "regen" in ereignis:
            statistik["starkregen"] += 1

        if "hitze" in ereignis:
            statistik["hitze"] += 1

        if "tornado" in ereignis:
            statistik["tornado"] += 1

        if "schnee" in ereignis:
            statistik["schnee"] += 1

    return statistik


def landkreis_warnungen(daten):

    warnungen = {}

    if not daten:
        return warnungen

    for quelle in ("warnings", "vorabInformation"):

        for kreis in daten.get(quelle, {}).values():

            for warnung in kreis:

                name = warnung.get("regionName")

                if not name:
                    continue

                if name not in warnungen:
                    warnungen[name] = []

                warnungen[name].append({
                    "regionName": name,
                    "type": warnung.get("type", -1),
                    "level": warnung.get("level", 0),
                    "event": warnung.get("event", ""),
                    "headline": warnung.get("headline", ""),
                    "identifier": warnung.get("identifier") or (
                        warnung.get("event", "")
                        + "_"
                        + str(warnung.get("start"))
                        + "_"
                        + str(warnung.get("end"))
                    ),
                    "start": warnung.get("start"),
                    "end": warnung.get("end"),
                })
    print("warnings:", len(daten.get("warnings", {})))
    print("vorabInformation:", len(daten.get("vorabInformation", {})))

    return warnungen



