from pathlib import Path
from datetime import datetime
import requests
import pandas as pd

REGIONEN = {
    "Oberbayern": ("Rosenheim", 47.856, 12.122),
    "Niederbayern": ("Passau", 48.567, 13.431),
    "Oberpfalz": ("Regensburg", 49.014, 12.097),
    "Oberfranken": ("Hof", 50.316, 11.912),
    "Mittelfranken": ("Nürnberg", 49.454, 11.077),
    "Unterfranken": ("Würzburg", 49.792, 9.932),
    "Schwaben": ("Kempten", 47.726, 10.314),
}

def wetterdaten_abrufen():
    alle_daten = []

    for region, (stadt, lat, lon) in REGIONEN.items():
        print(f"Lade {region} ({stadt}) ...", flush=True)

        antwort = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": (
                    "temperature_2m_max,temperature_2m_min,"
                    "precipitation_sum,wind_speed_10m_max,weather_code"
                ),
                "timezone": "Europe/Berlin",
                "forecast_days": 14,
            },
            timeout=30,
        )
        antwort.raise_for_status()
        tage = antwort.json()["daily"]

        for i, datum in enumerate(tage["time"]):
            alle_daten.append({
                "Region": region,
                "Stadt": stadt,
                "Datum": datum,
                "Tmax_C": tage["temperature_2m_max"][i],
                "Tmin_C": tage["temperature_2m_min"][i],
                "Niederschlag_mm": tage["precipitation_sum"][i],
                "Wind_kmh": tage["wind_speed_10m_max"][i],
                "Wettercode": tage["weather_code"][i],
            })

    return pd.DataFrame(alle_daten)


if __name__ == "__main__":
    try:
        daten = wetterdaten_abrufen()

        ordner = Path(__file__).resolve().parent / "daten"
        ordner.mkdir(exist_ok=True)
        datei = ordner / "bayern_14_tage.csv"
        daten.to_csv(datei, index=False, encoding="utf-8-sig")

        print()
        print("WETTERKOMPASS: DATENABRUF ERFOLGREICH!")
        print(f"Aktualisiert: {datetime.now():%d.%m.%Y %H:%M}")
        print(f"Datensaetze: {len(daten)}")
        print(f"Gespeichert: {datei.resolve()}")

    except (requests.RequestException, KeyError, ValueError) as fehler:
        print(f"FEHLER: {fehler}")
