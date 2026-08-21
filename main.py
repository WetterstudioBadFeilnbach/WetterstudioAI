from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from modules.dwd import lade_warnungen
app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def startseite(request: Request):
    return templates.TemplateResponse(
    request=request,
    name="index.html",
    context={}
)
@app.get("/api/test")
async def test():

    daten = lade_warnungen()

    return {
        "status": "ok",
        "warnings": len(daten.get("warnings", {}))
    }
@app.get("/api/warnungen")
async def warnungen():

    daten = lade_warnungen()

    return daten

@app.get("/api/testwarnungen")
async def testwarnungen():
    return {
        "time": 1787096060000,
        "warnings": {
            "TEST_ROSENHEIM": [
                {
                    "state": "Bayern",
                    "type": 8,
                    "level": 5,
                    "start": 1787096060000,
                    "regionName": "Rosenheim",
                    "end": 1787099660000,
                    "description": "Dies ist eine künstliche Testwarnung.",
                    "event": "TESTWARNUNG",
                    "headline": "Testwarnung für Rosenheim",
                    "instruction": "Nur für den Funktionstest.",
                    "stateShort": "BY",
                    "altitudeStart": None,
                    "altitudeEnd": None
                }
            ]
        },
        "vorabInformation": { "TEST_ROSENHEIM_VORAB": [ { "state": "Bayern", "type": 0, "level": 0, "start": 1787096060000, "regionName": "Rosenheim", "end": 1787099660000, "description": "Dies ist eine künstliche Vorabinformation zum Funktionstest.", "event": "VORABINFORMATION UNWETTER", "headline": "Vorabinformation für Rosenheim", "instruction": "Nur für den Funktionstest.", "stateShort": "BY", "altitudeStart": None, "altitudeEnd": None } ] },
        "copyright": "TESTDATEN – keine echte DWD-Warnung"
    }



