import requests
import re
from html import unescape

HND_URL = "https://www.hnd.bayern.de/pegel/inn/bad-feilnbach-18284504/tabelle?methode=wasserstand&setdiskr=15"

def bestimme_lage(wasserstand):
    if wasserstand >= 190:
        return "Gefährdung durch Ausuferung für Siedlung am Waldweg"
    elif wasserstand >= 180:
        return "Beginnende Gefährdung am Campingplatz südlich Kaiseralm"
    elif wasserstand >= 175:
        return "Beginnende Gefährdung am Campingplatz nordöstlich Kaiseralm"
    elif wasserstand >= 170:
        return "Beginnende Gefährdung durch rechtsseitige Ausuferungen"
    elif wasserstand >= 150:
        return "Beginnende Überflutung an der Staatsstraße 2089"
    else:
        return "Normaler Wasserstand"

def lade_pegel():
    response = requests.get(HND_URL, timeout=10)
    response.raise_for_status()

    rows = re.findall(r"<tr.*?</tr>", response.text, re.S)

    messungen = []

    for row in rows:
        text = re.sub(r"<[^>]+>", " ", row)
        text = unescape(text)
        text = re.sub(r"\s+", " ", text).strip()

        match = re.search(
            r"(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(\d+)",
            text
        )

        if match:
            zeit = f"{match.group(1)} {match.group(2)}"

            messungen.append({
                "zeit": zeit,
                "wasserstand_cm": int(match.group(3))
            })

    if not messungen:
        return None

    aktuell = messungen[0]

    letzte_3 = messungen[:3]
    werte = [m["wasserstand_cm"] for m in letzte_3]

    if len(werte) >= 2:
        if werte[0] > werte[-1]:
            trend = "steigend"
        elif werte[0] < werte[-1]:
            trend = "fallend"
        else:
            trend = "gleichbleibend"
    else:
        trend = "unbekannt"

    wasserstand = aktuell["wasserstand_cm"]

    return {
        "zeit": aktuell["zeit"],
        "wasserstand_cm": wasserstand,
        "trend": trend,
        "lage": bestimme_lage(wasserstand),
        "verlauf": messungen[:12],
        "station": "Bad Feilnbach / Jenbach",
        "messstelle": "18284504",
        "einheit": "cm",
        "quelle": "Hochwassernachrichtendienst Bayern",
        "hochwassermarken": [
            {"wasserstand_cm": 150, "beschreibung": "Beginnende Überflutung an der Staatsstraße 2089"},
            {"wasserstand_cm": 170, "beschreibung": "Beginnende Gefährdung durch rechtsseitige Ausuferungen"},
            {"wasserstand_cm": 175, "beschreibung": "Beginnende Gefährdung am Campingplatz nordöstlich Kaiseralm"},
            {"wasserstand_cm": 180, "beschreibung": "Beginnende Gefährdung am Campingplatz südlich Kaiseralm"},
            {"wasserstand_cm": 190, "beschreibung": "Gefährdung durch Ausuferung für Siedlung am Waldweg"}
        ]
    }

if __name__ == "__main__":
    daten = lade_pegel()
    print(daten)

