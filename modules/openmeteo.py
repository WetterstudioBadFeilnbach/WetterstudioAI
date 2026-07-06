import requests


def ort_ermitteln(lat, lon):
    try:
        url = (
            "https://nominatim.openstreetmap.org/reverse"
            f"?format=jsonv2&lat={lat}&lon={lon}"
        )

        antwort = requests.get(
            url,
            headers={"User-Agent": "Wetterstudio-Bad-Feilnbach-AI"},
            timeout=10,
        )

        daten = antwort.json()
        adresse = daten.get("address", {})

        return (
            adresse.get("village")
            or adresse.get("town")
            or adresse.get("city")
            or adresse.get("municipality")
            or adresse.get("county")
            or "Unbekannt"
        )

    except Exception:
        return "Unbekannt"


def wettertext(code):
    if code == 0:
        return "☀️ Sonnig"
    elif code in [1, 2]:
        return "🌤️ Heiter"
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
    else:
        return "❔ Unbekannt"


def aktuelle_wetterdaten(lat=48.0, lon=11.8):

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}"
        f"&longitude={lon}"
        "&current=temperature_2m,apparent_temperature,"
        "relative_humidity_2m,precipitation,"
        "wind_speed_10m,wind_gusts_10m,"
        "surface_pressure,weather_code"
        "&daily=weather_code,"
        "temperature_2m_max,"
        "temperature_2m_min,"
        "precipitation_probability_max"
        "&forecast_days=7"
    )

    try:

        antwort = requests.get(url, timeout=10)

        if antwort.status_code != 200:
            raise Exception("Open-Meteo nicht erreichbar")

        daten = antwort.json()

        current = daten.get("current", {})
        daily = daten.get("daily", {})

        code = current.get("weather_code", -1)

        return {
            "ort": ort_ermitteln(lat, lon),
            "temperatur": round(current.get("temperature_2m", 0), 1),
            "gefuehlt": round(current.get("apparent_temperature", 0), 1),
            "luftfeuchte": current.get("relative_humidity_2m", 0),
            "wind": round(current.get("wind_speed_10m", 0), 1),
            "boeen": round(current.get("wind_gusts_10m", 0), 1),
            "regen": round(current.get("precipitation", 0), 1),
            "luftdruck": round(current.get("surface_pressure", 0), 1),
            "weather_code": code,
            "wettertext": wettertext(code),
            "daily": daily,
        }

    except Exception:

        return {
            "ort": "--",
            "temperatur": "--",
            "gefuehlt": "--",
            "luftfeuchte": "--",
            "wind": "--",
            "boeen": "--",
            "regen": "--",
            "luftdruck": "--",
            "weather_code": -1,
            "wettertext": "--",
            "daily": {},
        }