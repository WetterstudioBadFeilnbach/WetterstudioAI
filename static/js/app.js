

function ladeWetter(lat, lon, landkreis) {
   
console.log("ladeWetter gestartet");
console.log("Parameter:", lat, lon, landkreis);
   fetch(`/api/wetter?lat=${lat}&lon=${lon}&landkreis=${encodeURIComponent(landkreis)}`)
    .then(r => r.json())
    .then(wetter => {
console.log("API Wetter:", wetter);
console.log("Ort aus API:", wetter.ort);
        document.getElementById("ort").innerHTML =
    wetter.ort;

        document.getElementById("temperatur").innerHTML =
            wetter.temperatur + " °C";

        document.getElementById("wettertext").innerHTML =
            wetter.wettertext;
   console.log("Weather-Code:", wetter.weather_code);         
let icon = "❔";

switch (wetter.weather_code) {

    case 0:
        icon = "☀️";
        break;

    case 1:
    case 2:
        icon = "🌤️";
        break;

    case 3:
        icon = "☁️";
        break;

    case 45:
    case 48:
        icon = "🌫️";
        break;

    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
        icon = "🌦️";
        break;

    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
        icon = "🌧️";
        break;

    case 71:
    case 73:
    case 75:
    case 77:
        icon = "❄️";
        break;

    case 80:
    case 81:
    case 82:
        icon = "🌦️";
        break;

    case 95:
    case 96:
    case 99:
        icon = "⛈️";
        break;

}

document.getElementById("wettericon").innerHTML = icon;
        document.getElementById("wind").innerHTML =
            wetter.wind + " km/h";

        document.getElementById("boeen").innerHTML =
            wetter.boeen + " km/h";

        document.getElementById("regen").innerHTML =
            wetter.regen + " mm";

        document.getElementById("luftdruck").innerHTML =
            wetter.luftdruck + " hPa";

        document.getElementById("luftfeuchte").innerHTML =
            wetter.luftfeuchte + " %";

        document.getElementById("gefuehlt").innerHTML =
            wetter.gefuehlt + " °C";

    });

}


function ladeRadar() {

    const radar = document.getElementById("radarbild");

    if (!radar) return;

    radar.src =
        "https://www.dwd.de/DWD/wetter/radar/radfilm_brd_akt.gif?" +
        new Date().getTime();

}

function findeWarnname(warnungen, landkreis) {
console.log(">>> NEUE findeWarnname AKTIV <<<");
    // 1. Exakter Treffer
    if (warnungen[landkreis]) {
        return landkreis;
    }

    // 2. Alle DWD-Namen durchsuchen
    for (const dwdName of Object.keys(warnungen)) {

        let geo = landkreis.toLowerCase();
        let dwd = dwdName.toLowerCase();

        // Wörter entfernen, die nur Verwaltungszusätze sind
        geo = geo
            .replace(" landkreis", "")
            .replace(" kreis", "")
            .replace(" stadt", "")
            .replace(" städte", "")
            .replace(" landeshauptstadt", "")
            .replace(/\s+/g, " ")
            .trim();

        dwd = dwd
            .replace(" landkreis", "")
            .replace(" kreis", "")
            .replace(" stadt", "")
            .replace(" städte", "")
            .replace(" landeshauptstadt", "")
            .replace(/\s+/g, " ")
            .trim();

        if (geo === dwd) {
            return dwdName;
        }
    }

    return landkreis;
}


// Alte Deutschlandkarten-Initialisierung entfernt.


// Wiederhergestellte allgemeine Startfunktionen
document.addEventListener("DOMContentLoaded", () => {

    console.log("Allgemeine Startfunktionen werden geladen");

    // Standardort beim Start
    ladeWetter(
        47.7868,
        12.0094,
        "Bad Feilnbach"
    );

    // Radar laden und regelmäßig aktualisieren
    ladeRadar();
    setInterval(ladeRadar, 120000);

    // Fortschrittsbalken
    const balken = document.getElementById("progressBar");

    if (balken) {
        const prozent = Number(balken.dataset.prozent) || 0;

        balken.style.width = prozent + "%";
        balken.textContent = prozent + " %";
    }

});
