from fastapi import FastAPI, Request, Query, Body, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from modules.dwd import (
    lade_warnungen,
    statistik,
    landkreis_warnungen
)
from modules.openmeteo import aktuelle_wetterdaten
from modules.stormtracking import (
    stormtracking_status,
    radar_download_status,
    radar_info,
    radar_download
)
from modules.radolan import radar_status
from modules.pegel import lade_pegel
from config import VERSION, FEATURES

from datetime import datetime
from pathlib import Path
import csv
import secrets


app = FastAPI(title="Wetterstudio Bad Feilnbach AI")


# Passwortschutz für den privaten Admin-Bereich
security = HTTPBasic()

ADMIN_BENUTZER = "admin"
ADMIN_PASSWORT = "@@@MarkusMichels!23tpEG25"


# Statische Dateien
app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

app.mount(
    "/data",
    StaticFiles(directory="data"),
    name="data"
)


# HTML-Templates
templates = Jinja2Templates(directory="templates")


@app.get("/api/warnungen")
async def api_warnungen():
    daten = lade_warnungen()
    return landkreis_warnungen(daten)


@app.get("/api/dwd-warnungen")
async def api_dwd_warnungen():
    return lade_warnungen()


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


@app.get("/api/radarzellen")
async def api_radarzellen():

    from modules.test_tracking import TESTMODUS, test_zellen
    import json

    datei = Path("static/data/radarzellen.json")

    if not datei.exists():
        return JSONResponse([])

    if TESTMODUS:
        return JSONResponse(test_zellen())

    with open(
        datei,
        "r",
        encoding="utf-8"
    ) as f:
        daten = json.load(f)

    return JSONResponse(daten)


@app.get("/api/pegel")
async def api_pegel():

    daten = lade_pegel()

    if daten is None:
        return {
            "status": "error",
            "message": "Keine Pegeldaten verfügbar"
        }

    return {
        "status": "ok",
        "daten": daten
    }


# Wetter-API
@app.get("/api/wetter")
async def api_wetter(

    lat: float = Query(...),
    lon: float = Query(...),
    landkreis: str = Query("")

):

    wetter = aktuelle_wetterdaten(
        lat,
        lon
    )

    if landkreis:
        wetter["ort"] = landkreis

    return wetter



@app.get("/test-wetterdaten")
async def test_wetterdaten(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="test_wetterdaten.html",
        context={}
    )
print(">>> STARTSEITE WIRD AUS MAIN.PY GELADEN <<<")


@app.get("/")
async def startseite(request: Request):

    # DWD
    daten = lade_warnungen()

    stats = statistik(daten)

    landkreise = landkreis_warnungen(daten)


    # Tornado-Warnungen
    tornado_warnungen = []

    for kreis in landkreise.values():

        for warnung in kreis:

            if "tornado" in warnung["event"].lower():

                tornado_warnungen.append(
                    warnung
                )


    # Ticker
    ticker_info = (
        "✅ Zurzeit liegen keine neuen Warnmeldungen vor."
    )


    if stats["gewitter"] > 0:

        ticker_info = (
            f"🌩 Neue Gewitterwarnung: Der DWD meldet aktuell "
            f"{stats['gewitter']} Gewitterwarnung(en). "
            f"Bitte die Wetterlage verfolgen."
        )


    elif stats["sturm"] > 0:

        ticker_info = (
            f"💨 Neue Sturmwarnung: Aktuell "
            f"{stats['sturm']} Sturmwarnung(en) aktiv."
        )


    elif stats["starkregen"] > 0:

        ticker_info = (
            "🌧 Neue Starkregenwarnung: "
            "Der DWD warnt derzeit vor Starkregen."
        )


    # Entwicklungsstand
    gesamt = len(FEATURES)

    fertig = sum(
        1
        for status in FEATURES.values()
        if status
    )

    entwicklung = round(
        fertig / gesamt * 100
    )


    # KEIN zusätzlicher Open-Meteo-Aufruf hier.
    # Die aktuellen Wetterdaten werden im Browser
    # über /api/wetter geladen.

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


            # Platzhalter:
            # Die echten Wetterdaten werden über
            # /api/wetter nachgeladen.

            "ort": "Bad Feilnbach",

            "temperatur": "-- °C",

            "wind": "-- km/h",

            "boeen": "-- km/h",

            "regen": "-- mm",

            "luftdruck": "-- hPa",

            "luftfeuchte": "-- %",

            "gefuehlt": "-- °C",

            "weather_code": -1,

            "wettertext": "Wetter wird geladen...",

            "daily": {},


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


# Feedback speichern
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

            datetime.now().strftime(
                "%d.%m.%Y %H:%M:%S"
            ),

            data.get(
                "name",
                ""
            ),

            data.get(
                "feedback",
                ""
            )

        ])


    return {
        "status": "ok"
    }


# Privater Feedback-Bereich
@app.get("/admin/feedback", response_class=HTMLResponse)
async def admin_feedback(
    credentials: HTTPBasicCredentials = Depends(security)
):

    benutzer_ok = secrets.compare_digest(
        credentials.username,
        ADMIN_BENUTZER
    )

    passwort_ok = secrets.compare_digest(
        credentials.password,
        ADMIN_PASSWORT
    )

    if not (
        benutzer_ok
        and passwort_ok
    ):
        raise HTTPException(
            status_code=401,
            detail="Zugriff verweigert",
            headers={
                "WWW-Authenticate": "Basic"
            }
        )


    feedbacks = []

    datei = Path("feedback.csv")

    if datei.exists():

        with open(
            datei,
            "r",
            encoding="utf-8",
            newline=""
        ) as f:

            reader = csv.reader(f)

            for zeile in reader:

                if len(zeile) >= 3:

                    feedbacks.append({
                        "datum": zeile[0],
                        "name": zeile[1],
                        "feedback": zeile[2]
                    })


    feedbacks.reverse()


    html = """
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, initial-scale=1">

        <title>Beta-Feedback – Wetterstudio Bad Feilnbach AI</title>

        <style>

            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 30px;
                background: #f4f6f8;
            }

            h1 {
                margin-top: 0;
            }

            .feedback {
                background: white;
                padding: 20px;
                margin-bottom: 15px;
                border-radius: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }

            .datum {
                color: #666;
                font-size: 14px;
            }

            .name {
                font-weight: bold;
                margin-top: 8px;
            }

            .text {
                margin-top: 10px;
                white-space: pre-wrap;
            }

            .leer {
                background: white;
                padding: 20px;
                border-radius: 10px;
            }

        </style>

    </head>

    <body>

        <h1>🔒 Beta-Feedback</h1>

        <p>
            Wetterstudio Bad Feilnbach AI –
            interner Bereich
        </p>
    """


    if not feedbacks:

        html += """
        <div class="leer">
            Noch kein Feedback vorhanden.
        </div>
        """

    else:

        for eintrag in feedbacks:

            datum = (
                eintrag["datum"]
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )

            name = (
                eintrag["name"]
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )

            text = (
                eintrag["feedback"]
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )

            html += f"""

            <div class="feedback">

                <div class="datum">
                    {datum}
                </div>

                <div class="name">
                    {name}
                </div>

                <div class="text">
                    {text}
                </div>

            </div>
            """


    html += """

    </body>
    </html>
    """


    return HTMLResponse(
        content=html
    )
# Wetterkarten-Testseite
@app.get("/wetterkarten-test")
async def wetterkarten_test(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="wetterkarten_test.html",
        context={
            "titel": "Wetterkarten-Test – Wetterstudio Bad Feilnbach AI"
        }
    )

from modules.bayern_karte import (
    erstelle_bayern_karte
)


@app.post("/api/wetterkarte/bayern")
async def erstelle_bayern_wetterkarte():

    dateipfad = (
        erstelle_bayern_karte()
    )

    return {
        "status": "ok",
        "dateipfad": "/" + dateipfad.replace(
            "\\",
            "/"
        )
    }




