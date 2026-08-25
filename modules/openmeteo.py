import requests
import time


_WETTER_CACHE = {}
_CACHE_SEKUNDEN = 60


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

        antwort.raise_for_status()

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

    cache_key = (
        round(lat, 4),
        round(lon, 4)
    )

    cached = _WETTER_CACHE.get(cache_key)

    if cached:
        alter = time.time() - cached["zeit"]

        if alter < _CACHE_SEKUNDEN:
            return cached["daten"]

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

        antwort = requests.get(
            url,
            timeout=30,
            headers={
                "User-Agent": "Wetterstudio-Bad-Feilnbach-AI"
            }
        )

        antwort.raise_for_status()

        daten = antwort.json()

        current = daten.get("current", {})
        daily = daten.get("daily", {})

        code = current.get("weather_code", -1)

        ergebnis = {
            "ort": ort_ermitteln(lat, lon),
            "temperatur": round(
                current.get("temperature_2m", 0), 1
            ),
            "gefuehlt": round(
                current.get("apparent_temperature", 0), 1
            ),
            "luftfeuchte": current.get(
                "relative_humidity_2m", 0
            ),
            "wind": round(
                current.get("wind_speed_10m", 0), 1
            ),
            "boeen": round(
                current.get("wind_gusts_10m", 0), 1
            ),
            "regen": round(
                current.get("precipitation", 0), 1
            ),
            "luftdruck": round(
                current.get("surface_pressure", 0), 1
            ),
            "weather_code": code,
            "wettertext": wettertext(code),
            "daily": daily,
        }

        _WETTER_CACHE[cache_key] = {
            "zeit": time.time(),
            "daten": ergebnis,
        }

        return ergebnis

    except Exception as e:

        print(
            "OPENMETEO-FEHLER:",
            repr(e),
            flush=True
        )

        if cached:
            print(
                "OPENMETEO: Verwende zuletzt gespeicherte Wetterdaten.",
                flush=True
            )

            return cached["daten"]

        return {
            "ort": f"FEHLER: {type(e).__name__}",
            "temperatur": str(e),
            "gefuehlt": "--",
            "luftfeuchte": "--",
            "wind": "--",
            "boeen": "--",
            "regen": "--",
            "luftdruck": "--",
            "weather_code": -1,
            "wettertext": repr(e),
            "daily": {},
        }