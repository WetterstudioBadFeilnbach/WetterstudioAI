from fastapi import FastAPI, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from modules.dwd import lade_warnungen, statistik, landkreis_warnungen
from modules.openmeteo import aktuelle_wetterdaten
from config import VERSION, FEATURES
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

    # Open-Meteo
    wetter = aktuelle_wetterdaten()

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "titel": "Wetterstudio Bad Feilnbach AI",

            "landkreise": landkreise,

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
            "features_fertig": sum(1 for wert in FEATURES.values() if wert),
"features_gesamt": len(FEATURES),
        },
    )