from fastapi import FastAPI, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from modules.dwd import lade_warnungen, statistik, landkreis_warnungen
from modules.openmeteo import aktuelle_wetterdaten
from config import VERSION, FEATURES
from fastapi import Body
from datetime import datetime
import csv
app = FastAPI(title="Wetterstudio Bad Feilnbach AI")

# Statische Dateien
app.mount("/static", StaticFiles(directory="static"), name="static")

# HTML-Templates
templates = Jinja2Templates(directory="templates")


@app.get("/api/warnungen")
async def api_warnungen():

    daten = lade_warnungen()
    return landkreis_warnungen(daten)


# Neue Wetter-API
@app.get("/api/wetter")
async def api_wetter(
    lat: float = Query(...),
    lon: float = Query(...)
):
    return aktuelle_wetterdaten(lat, lon)


@app.get("/")
async def startseite(request: Request):

    # DWD
    daten = lade_warnungen()
    stats = statistik(daten)
    landkreise = landkreis_warnungen(daten)

    tornado_warnungen = []

    for kreis in landkreise.values():
        for warnung in kreis:
            if "tornado" in warnung["event"].lower():
                tornado_warnungen.append(warnung)

    ticker_info = "✅ Zurzeit liegen keine neuen Warnmeldungen vor."

    if stats["gewitter"] > 0:
        ticker_info = (
            f"🌩 Neue Gewitterwarnung: Der DWD meldet aktuell "
            f"{stats['gewitter']} Gewitterwarnung(en). Bitte die Wetterlage verfolgen."
        )

    elif stats["sturm"] > 0:
        ticker_info = (
            f"💨 Neue Sturmwarnung: Aktuell {stats['sturm']} Sturmwarnung(en) aktiv."
        )

    elif stats["starkregen"] > 0:
        ticker_info = (
            f"🌧 Neue Starkregenwarnung: Der DWD warnt derzeit vor Starkregen."
        )
   

    

    gesamt = len(FEATURES)
    fertig = sum(1 for status in FEATURES.values() if status)
    entwicklung = round(fertig / gesamt * 100)

    # Open-Meteo
    wetter = aktuelle_wetterdaten()

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "titel": "Wetterstudio Bad Feilnbach AI",

            "landkreise": landkreise,
            "tornado_warnungen": tornado_warnungen,
            "warnungen": stats["gesamt"],

            "gewitter": stats["gewitter"],
            "tornados": stats["tornado"],

            "temperatur": f'{wetter["temperatur"]} °C',
            "wind": f'{wetter["wind"]} km/h',
            "boeen": f'{wetter["boeen"]} km/h',
            "regen": f'{wetter["regen"]} mm',
            "luftdruck": f'{wetter["luftdruck"]} hPa',
            "luftfeuchte": f'{wetter["luftfeuchte"]} %',
            "gefuehlt": f'{wetter["gefuehlt"]} °C',
            "weather_code": wetter["weather_code"],
            "wettertext": wetter["wettertext"],
            "daily": wetter["daily"],

            "gelb": stats["gelb"],
            "orange": stats["orange"],
            "rot": stats["rot"],
            "violett": stats["violett"],

            "sturm": stats["sturm"],
            "starkregen": stats["starkregen"],
            "hitze": stats["hitze"],
            "schnee": stats["schnee"],

            "titel_seite": "Wetterstudio Bad Feilnbach AI",

            "features_fertig": fertig,
            "features_gesamt": gesamt,
            "entwicklung": entwicklung,
            "ticker_info": ticker_info,
        },
    )
@app.post("/api/feedback")
async def feedback(data: dict = Body(...)):

    with open(
        "feedback.csv",
        "a",
        newline="",
        encoding="utf-8"
    ) as datei:

        writer = csv.writer(datei)

        writer.writerow([
            datetime.now().strftime("%d.%m.%Y %H:%M:%S"),
            data.get("name", ""),
            data.get("feedback", "")
        ])

    return {
        "status": "ok"
    }