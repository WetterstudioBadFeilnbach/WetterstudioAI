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

    warnings = daten.get("warnings", {})

    for bundesland in warnings.values():

        for warnung in bundesland:

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

    for kreis in daten.get("warnings", {}).values():

        for warnung in kreis:

            name = warnung.get("regionName")

            if not name:
                continue

            if name not in warnungen:
                warnungen[name] = []

            warnungen[name].append({
                "regionName": name,
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

    return warnungen