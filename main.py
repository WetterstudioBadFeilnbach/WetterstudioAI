from fastapi import FastAPI, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from modules.dwd import lade_warnungen, statistik, landkreis_warnungen
from modules.openmeteo import aktuelle_wetterdaten
from modules.sonnenfinsternis import berechne_sonnenfinsternis
from modules.stormtracking import (
    stormtracking_status,
    radar_download_status,
    radar_info,
    radar_download
)
from modules.radolan import radar_status
from config import VERSION, FEATURES
from fastapi import Body
from datetime import datetime
import csv
import asyncio
from functools import lru_cache
app = FastAPI(title="Wetterstudio Bad Feilnbach AI")

# Statische Dateien
app.mount("/static", StaticFiles(directory="static"), name="static")

# HTML-Templates
templates = Jinja2Templates(directory="templates")


@app.get("/api/warnungen")
async def api_warnungen():

    daten = lade_warnungen()
    return landkreis_warnungen(daten)
@app.get("/api/stormtracking")
async def api_stormtracking():
    return stormtracking_status()
@app.get("/api/radarstatus")
async def api_radarstatus():
    return radar_download_status()
@app.get("/api/radarinfo")
async def api_radarinfo():
    return radar_info()
@app.get("/api/radardownload")
async def api_radardownload():
    return radar_download()
@app.get("/api/radolanstatus")
async def api_radolanstatus():
    return radar_status()
@lru_cache(maxsize=500)
def sonnenfinsternis_cache(lat: float, lon: float):
    return berechne_sonnenfinsternis(lat, lon)


@app.get("/api/sonnenfinsternis")
async def api_sonnenfinsternis(lat: float, lon: float):
    return await asyncio.to_thread(
        sonnenfinsternis_cache,
        round(lat, 5),
        round(lon, 5)
    )
@app.get("/api/radarzellen")
async def api_radarzellen():
    from modules.test_tracking import TESTMODUS, test_zellen 

    from pathlib import Path
    import json

    datei = Path("static/data/radarzellen.json")

    if not datei.exists():
        return JSONResponse([])

        datei = Path("static/data/radarzellen.json")

    if not datei.exists():
        return JSONResponse([])

    if TESTMODUS:
        return JSONResponse(test_zellen())

    with open(datei, "r", encoding="utf-8") as f:
        daten = json.load(f)

    return JSONResponse(daten)
# Neue Wetter-API
@app.get("/api/wetter")
async def api_wetter(
    lat: float = Query(...),
    lon: float = Query(...),
    landkreis: str = Query("")
):
    wetter = aktuelle_wetterdaten(lat, lon)

    if landkreis:
        wetter["ort"] = landkreis

    return wetter

print(">>> STARTSEITE WIRD AUS MAIN.PY GELADEN <<<")
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
    stormtracking = stormtracking_status()
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
            "ort": wetter["ort"],
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