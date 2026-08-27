import requests


def wettertext(code, is_day=1):

    if code == 0:
        return "☀️ Sonnig" if is_day else "🌙 Klar"

    elif code in [1, 2]:
        return "🌤️ Heiter" if is_day else "🌙 Leicht bewölkt"

    elif code == 3:
        return "☁️ Bewölkt"

    elif code in [45, 48]:
        return "🌫️ Nebel"

    elif code in [51, 53, 55, 56, 57]:
        return "🌦️ Nieselregen"

    elif code in [61, 63, 65, 66, 67]:
        return "🌧️ Regen"

    elif code in [71, 73, 75, 77]:
        return "❄️ Schnee"

    elif code in [80, 81, 82]:
        return "🌦️ Regenschauer"

    elif code in [95, 96, 99]:
        return "⛈️ Gewitter"

    return "❔ Unbekannt"


def tagesvorhersage_mit_wettermodell(
    ziel_datum,
    lat,
    lon,
    modell="best_match"
):

    print(
        "OPENMETEO-MODELL:",
        modell
    )

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}"
        f"&longitude={lon}"
        "&daily=weather_code,"
        "temperature_2m_max,"
        "temperature_2m_min,"
        "precipitation_probability_max"
        f"&models={modell}"
        "&forecast_days=10"
        "&timezone=Europe%2FBerlin"
    )

    print(
        "OPENMETEO-MODELL-ANFRAGE:",
        url,
        flush=True
    )

    antwort = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Wetterstudio-Bad-Feilnbach-AI"
        }
    )

    antwort.raise_for_status()

    daten = antwort.json()

    daily = daten.get(
        "daily",
        {}
    )

    tage = daily.get(
        "time",
        []
    )

    if ziel_datum not in tage:

        raise ValueError(
            f"Datum nicht in der Vorhersage verfügbar: {ziel_datum}"
        )

    index = tage.index(
        ziel_datum
    )

    temperatur_min = daily[
        "temperature_2m_min"
    ][index]

    temperatur_max = daily[
        "temperature_2m_max"
    ][index]

    weather_code = daily[
        "weather_code"
    ][index]

    niederschlag = daily.get(
        "precipitation_probability_max",
        []
    )

    niederschlag_wahrscheinlichkeit = (
        niederschlag[index]
        if index < len(niederschlag)
        else None
    )

    return {
        "datum": ziel_datum,
        "temperatur_min": round(
            temperatur_min,
            1
        ),
        "temperatur_max": round(
            temperatur_max,
            1
        ),
        "weather_code": weather_code,
        "niederschlag_wahrscheinlichkeit":
            niederschlag_wahrscheinlichkeit,
        "wettertext": wettertext(
            weather_code,
            1
        ),
        "modell": modell
    }
def aktuelle_wetterdaten(lat, lon):

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}"
        f"&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,"
        "apparent_temperature,is_day,precipitation,"
        "weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure"
        "&timezone=Europe%2FBerlin"
    )

    antwort = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Wetterstudio-Bad-Feilnbach-AI"
        }
    )

    antwort.raise_for_status()

    current = antwort.json().get("current", {})

    weather_code = current.get("weather_code", 0)
    is_day = current.get("is_day", 1)

    return {
        "temperatur": current.get("temperature_2m"),
        "gefuehlt": current.get("apparent_temperature"),
        "luftfeuchtigkeit": current.get("relative_humidity_2m"),
        "niederschlag": current.get("precipitation"),
        "wind": current.get("wind_speed_10m"),
        "boeen": current.get("wind_gusts_10m"),
        "luftdruck": current.get("surface_pressure"),
        "wettercode": weather_code,
        "wettertext": wettertext(
            weather_code,
            is_day
        )
    }

