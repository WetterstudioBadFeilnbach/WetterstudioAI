

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


function ladeSonnenfinsternis(lat, lon, ort) {

    fetch(`/api/sonnenfinsternis?lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then(daten => {

            document.getElementById("eclipseInfo").innerHTML = `
                <h3>📍 ${ort}</h3>

                <p>🌅 Beginn: ${daten.beginn}</p>
                <p>🌘 Maximum: ${daten.maximum}</p>
                <p>🌇 Ende: ${daten.ende}</p>

                <hr>

                <p>🌗 Bedeckung: ${daten.bedeckung}</p>
                <p>📏 Magnitude: ${daten.magnitude}</p>
                <p>☀️ Sonnenhöhe: ${daten.sonnenhoehe}</p>
                <p>🧭 Azimut: ${daten.azimut}</p>
            `;

        })
        .catch(error => {
            console.error("Fehler Sonnenfinsternis:", error);
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
document.addEventListener("DOMContentLoaded", () => {

    console.log("Wetterstudio Bad Feilnbach AI gestartet");
    console.log("APP VERSION TEST 15.07");
ladeWetter(
    47.7868,
    12.0094,
    "Bad Feilnbach"
);
    const karte = document.getElementById("deutschlandkarte");
    const suche = document.getElementById("landkreisSuche");
    const suchErgebnisse = document.getElementById("suchErgebnisse");
    let ausgewaehlt = -1;
    if (!karte) return;

    const map = L.map("deutschlandkarte").setView([51.2, 10.4], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);
// ============================================================
// 🌑 SONNENFINSTERNIS 12.08.2026 – NASA ECLIPSE LAYER
// ============================================================

fetch("/static/data/eclipse_2026_path.json")
    .then(response => {
        if (!response.ok) {
            throw new Error(
                "Eclipse-Datei konnte nicht geladen werden: " +
                response.status
            );
        }

        return response.json();
    })
    .then(eclipse => {

        console.log(
            "🌑 Eclipse-Daten geladen:",
            eclipse.rows.length,
            "Zeitpunkte"
        );

        const north = eclipse.north || [];
        const south = eclipse.south || [];
        const center = eclipse.center || [];
        const rows = eclipse.rows || [];

        // ----------------------------------------------------
        // 🔵 NÖRDLICHE GRENZE
        // ----------------------------------------------------

        const eclipseNorth = L.polyline(north, {
            color: "#00d9ff",
            weight: 2,
            opacity: 0.9,
            dashArray: "8,6"
        }).addTo(map);

        // ----------------------------------------------------
        // 🔵 SÜDLICHE GRENZE
        // ----------------------------------------------------

        const eclipseSouth = L.polyline(south, {
            color: "#00d9ff",
            weight: 2,
            opacity: 0.9,
            dashArray: "8,6"
        }).addTo(map);

        // ----------------------------------------------------
        // 🔴 ZENTRALLINIE
        // ----------------------------------------------------

        const eclipseCenter = L.polyline(center, {
            color: "#ff2020",
            weight: 4,
            opacity: 0.95,
            lineJoin: "round"
        }).addTo(map);

        // ----------------------------------------------------
        // 🟣 BEREICH ZWISCHEN DEN GRENZEN
        // ----------------------------------------------------

        if (north.length > 1 && south.length > 1) {

            const corridorPoints = [
                ...north,
                ...[...south].reverse()
            ];

            L.polygon(corridorPoints, {
                color: "#7c4dff",
                weight: 1,
                opacity: 0.5,
                fillColor: "#7c4dff",
                fillOpacity: 0.14,
                interactive: false,
            }).addTo(map);
        }
// 🌑 FINSTERNISPFAD - ZOOM-BUTTON
const eclipseControl = L.control({ position: "topleft" });

eclipseControl.onAdd = function () {
    const div = L.DomUtil.create("div", "leaflet-bar");

    div.innerHTML = `
        <button
            type="button"
            title="Finsternispfad anzeigen"
            style="
                background:#ffffff;
                border:0;
                padding:8px 10px;
                font-size:14px;
                font-weight:bold;
                cursor:pointer;
            "
        >
            🌑
        </button>
    `;

    div.onclick = function (event) {
        event.stopPropagation();

        const allePunkte = [
            ...north,
            ...south,
            ...center
        ];

        if (allePunkte.length > 1) {
            map.fitBounds(allePunkte, {
                padding: [30, 30]
            });
        }
    };

    return div;
};

eclipseControl.addTo(map);
        // ----------------------------------------------------
        // 🖱️ KLICK AUF DIE ZENTRALLINIE
        // ----------------------------------------------------

        eclipseCenter.on("click", async function(event) {
console.log("SONNENFINSTERNIS-LINIE ANGEKLICKT");
            const clicked = event.latlng;

            let nearestIndex = 0;
            let nearestDistance = Infinity;

            center.forEach((point, index) => {

                const distance =
                    Math.pow(clicked.lat - point[0], 2) +
                    Math.pow(clicked.lng - point[1], 2);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            const point = center[nearestIndex];
            const row = rows[nearestIndex];
const eclipseResponse = await fetch(`/api/sonnenfinsternis?lat=${point[0]}&lon=${point[1]}`);
const eclipse = await eclipseResponse.json();
const eclipseLocation = document.getElementById("eclipseLocation");

if (eclipseLocation) {
    eclipseLocation.textContent =
        `📍 Position: ${point[0].toFixed(4)}° ${point[0] >= 0 ? "N" : "S"} / ${Math.abs(point[1]).toFixed(4)}° ${point[1] >= 0 ? "E" : "W"}`;
}
const beginEl = document.getElementById("eclipseBegin");
const maximumEl = document.getElementById("eclipseMaximum");
const endEl = document.getElementById("eclipseEnd");
const coverageEl = document.getElementById("eclipseCoverage");
const magnitudeEl = document.getElementById("eclipseMagnitude");
const altitudeEl = document.getElementById("eclipseAltitude");
const azimuthEl = document.getElementById("eclipseAzimuth");
if (beginEl) {
    beginEl.textContent = `🌞 Beginn: ${eclipse.beginn || eclipse.c1_time || "--:--"} Uhr`;
}

if (maximumEl) {
    maximumEl.textContent = `🌒 Maximum: ${eclipse.maximum || eclipse.mid_time || "--:--"} Uhr`;
}

if (endEl) {
    endEl.textContent = `🌅 Ende: ${eclipse.ende || eclipse.c4_time || "--:--"} Uhr`;
}
if (coverageEl) {
    coverageEl.textContent =
        `🌘 Bedeckung: ${String(eclipse.bedeckung ?? "--").replace("%", "").trim()} %`;
}

if (magnitudeEl) {
    magnitudeEl.textContent = `📐 Magnitude: ${eclipse.magnitude ?? "--"}`;
}

if (altitudeEl) {
    altitudeEl.textContent = `☀️ Sonnenhöhe: ${eclipse.sonnenhoehe ?? "--"}`;
}

if (azimuthEl) {
    azimuthEl.textContent = `🧭 Azimut: ${eclipse.azimut ?? "--"}`;
}
            const utcTime =
                row && row.utc
                    ? row.utc + " UTC"
                    : "nicht verfügbar";

            const popupContent = `
<div style="
    min-width:430px;
    max-width:460px;
    font-family:Arial,sans-serif;
    line-height:1.35;
    color:#222;
">
<div style="
    background:#1565C0;
    color:white;
    padding:9px 12px;
    margin:-8px -8px 10px -8px;
    border-radius:8px 8px 0 0;
    font-size:15px;
    font-weight:bold;
    text-align:center;
">
    🌦️ Wetterstudio Bad Feilnbach AI · © Markus Michels
</div>
    <div style="
        font-size:15px;
        font-weight:bold;
        margin-bottom:6px;
        color:#111;
    ">
        🌑 Sonnenfinsternis – 12. August 2026
    </div>

    <div style="
        background:#f4f4f4;
        border-bottom:1px solid #aaa;
        padding:5px 7px;
        margin-bottom:8px;
        font-size:12px;
    ">
        <strong>📍 Position:</strong>
        ${point[0].toFixed(4)}°
        ${point[0] >= 0 ? "N" : "S"}
        &nbsp; / &nbsp;
        ${Math.abs(point[1]).toFixed(4)}°
        ${point[1] >= 0 ? "E" : "W"}
    </div>

    <div style="
        background:#fff;
        border:1px solid #d0d0d0;
        padding:7px;
        margin-bottom:8px;
    ">
        <div style="font-weight:bold;margin-bottom:5px;">
            🔵 TEST WETTERSTUDIO – Partielle Sonnenfinsternis
        </div>

        <div>
            <strong>Beginn (C1):</strong>
            ${eclipse.c1_date || "12.08.2026"}
            ${eclipse.c1_time || eclipse.beginn || "nicht verfügbar"} UTC
        </div>

        <div>
            <strong>Maximum:</strong>
            ${eclipse.mid_date || "12.08.2026"}
            ${eclipse.mid_time || eclipse.maximum || "nicht verfügbar"} UTC
        </div>

        <div>
            <strong>Ende (C4):</strong>
            ${eclipse.c4_date || "12.08.2026"}
            ${eclipse.c4_time || eclipse.ende || "nicht verfügbar"} UTC
        </div>
    </div>

    <table style="
        width:100%;
        border-collapse:collapse;
        font-size:11px;
        margin-top:5px;
    ">
        <thead>
            <tr style="background:#e7b800;color:#111;">
                <th style="padding:4px;border:1px solid #ccc;">Ereignis</th>
                <th style="padding:4px;border:1px solid #ccc;">Datum</th>
                <th style="padding:4px;border:1px solid #ccc;">Zeit (UTC)</th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <td style="padding:4px;border:1px solid #ccc;">
                    Start der partiellen Finsternis (C1)
                </td>
                <td style="padding:4px;border:1px solid #ccc;">
                    ${eclipse.c1_date || "12.08.2026"}
                </td>
                <td style="padding:4px;border:1px solid #ccc;">
                    ${eclipse.c1_time || eclipse.beginn || "n/a"}
                </td>
            </tr>

            <tr style="background:#f3f3f3;">
                <td style="padding:4px;border:1px solid #ccc;">
                    Maximum
                </td>
                <td style="padding:4px;border:1px solid #ccc;">
                    ${eclipse.mid_date || "12.08.2026"}
                </td>
                <td style="padding:4px;border:1px solid #ccc;">
                    ${eclipse.mid_time || eclipse.maximum || "n/a"}
                </td>
            </tr>

            <tr>
                <td style="padding:4px;border:1px solid #ccc;">
                    Ende der partiellen Finsternis (C4)
                </td>
                <td style="padding:4px;border:1px solid #ccc;">
                    ${eclipse.c4_date || "12.08.2026"}
                </td>
                <td style="padding:4px;border:1px solid #ccc;">
                    ${eclipse.c4_time || eclipse.ende || "n/a"}
                </td>
            </tr>
        </tbody>
    </table>

    <div style="
        margin-top:8px;
        padding:6px;
        background:#f8f8f8;
        border-top:1px solid #ccc;
        font-size:12px;
    ">
        <div>
            🌑 <strong>Bedeckung:</strong>
            ${eclipse.bedeckung || "n/a"}
        </div>

        <div>
            📐 <strong>Magnitude:</strong>
            ${eclipse.magnitude || "n/a"}
        </div>

        <div>
            ☀️ <strong>Sonnenhöhe beim Maximum:</strong>
            ${eclipse.sonnenhoehe || "n/a"}
        </div>

        <div>
            🧭 <strong>Azimut beim Maximum:</strong>
            ${eclipse.azimut || "n/a"}
        </div>

        <div>
            ⏱️ <strong>Dauer:</strong>
            ${eclipse.duration || "n/a"}
        </div>

        <div>
            🌒 <strong>Typ:</strong>
            ${eclipse.type || "Partial"}
        </div>
    </div>

    <div style="
        font-size:11px;
        color:#777;
        margin-top:8px;
    ">
        Quelle: NASA GSFC / Eclipse Path
    </div>
<div style="
    margin-top:10px;
    padding:7px 8px;
    background:#1565C0;
    color:#ffffff;
    border-radius:5px;
    text-align:center;
    font-size:11px;
    font-weight:bold;
">
    © Markus Michels – Wetterstudio Bad Feilnbach
</div>
</div>
`;
console.log("BRANDING VORHANDEN:", popupContent.includes("Markus Michels"));
            L.popup({
                maxWidth: 380,
                closeButton: true
            })
            .setLatLng(clicked)
            
            .setContent(popupContent)
            .openOn(map);
        });

        // ----------------------------------------------------
        // 🌑 ECLIPSE-LAYER GLOBAL SPEICHERN
        // ----------------------------------------------------

        window.eclipseLayer = {
            north: eclipseNorth,
            south: eclipseSouth,
            center: eclipseCenter
        };

        console.log(
            "🌑 Eclipse-Layer erfolgreich auf der Karte aktiviert."
        );
    })
    .catch(error => {

        console.error(
            "❌ Fehler beim Laden des Eclipse-Layers:",
            error
        );

    });
    Promise.all([
        fetch("/api/warnungen").then(r => r.json()),
        fetch("/static/geojson/landkreise.geojson").then(r => r.json())
    ])

    .then(([datenWarnungen, geojson]) => {
console.log("Promise.all erfolgreich");
console.log("Warnungen:", datenWarnungen);
console.log("GeoJSON Features:", geojson.features.length);
    let warnungen = datenWarnungen;
console.log("===== VORAB TEST =====");

Object.entries(warnungen).forEach(([name, liste]) => {
    if (liste.some(w => w.event && w.event.startsWith("VORABINFORMATION"))) {
        console.log(name, liste);
    }
});
       const geojsonLayer = L.geoJSON(geojson, {

            style: function(feature) {

                const landkreis =
                    feature.properties.NAME_3 ||
                    feature.properties.NAME ||
                    "";
                    console.log("NAME_3 =", feature.properties.NAME_3, "NAME =", feature.properties.NAME);
                    const mapping = {
    "Aachen Städte": "Stadt Aachen",
    "Augsburg Städte": "Stadt Augsburg",
    "Baden-Baden Städte": "Stadt Baden-Baden",
    "Ansbach Städte": "Stadt Ansbach",
    "Amberg Städte": "Stadt Amberg",
    "Alb-Donau": "Alb-Donau-Kreis"
};
let suchname = mapping[landkreis] || findeWarnname(warnungen, landkreis);

console.log("LANDKREIS =", landkreis);
console.log("SUCHNAME =", suchname);
console.log("WARNUNGEN =", warnungen[suchname]);
// console.log(landkreis);
if (!warnungen[suchname]) console.log("NICHT GEFUNDEN:", landkreis, "→", suchname);
                let farbe = "#3ec5ff";
                let opacity = 0.08;
                           

          let maxLevel = 0;
          let hatHitze = false;
          let hatVorab = false;

          if (warnungen[suchname]) {

    warnungen[suchname].forEach(w => {
if (w.event && w.event.startsWith("VORABINFORMATION")) {
    console.log("VORAB GEFUNDEN:", landkreis, w.event);
}
        console.log(
            "Warnung:",
            landkreis,
            "Typ:",
            w.type,
            "Level:",
            w.level,
            "Ereignis:",
            w.event
        );
console.log("DEBUG:", landkreis, "Typ=", w.type, "Event=", w.event);
       // Gewitter immer mindestens orange darstellen
if (w.type === 0) {
    maxLevel = Math.max(maxLevel, 3);
}

// Vorabinformation Unwetter
else if (
    w.event &&
    w.event.toUpperCase().startsWith("VORABINFORMATION")
) {
    hatVorab = true;
}

// Hitzewarnung
else if (w.type === 8) {
    hatHitze = true;
}

else {
    maxLevel = Math.max(maxLevel, w.level);
}
    });

}

console.log("Landkreis:", landkreis, "maxLevel:", maxLevel);          

// Vorabinformation hat höchste Priorität
if (hatVorab) {
    farbe = "#FF9800";
    opacity = 0.35;
}

// Hitzewarnung wie beim DWD
else if (hatHitze) {
    farbe = "#C8A2FF";
    opacity = 0.60;
}

else if (maxLevel == 2) {

    farbe = "#FFD600";
    opacity = 0.55;

}

else if (maxLevel == 3) {

    farbe = "#FF9800";
    opacity = 0.60;

}

else if (maxLevel == 4) {

    farbe = "#E53935";
    opacity = 0.65;

}

else if (maxLevel == 5) {

    farbe = "#8E24AA";
    opacity = 0.70;

}

else if (maxLevel == 6) {

    // Vorabinformation
    farbe = "#FF9800";
    opacity = 0.35;

}
return {
                
                

    color: "#6b7280",
    weight: 1,
    fillColor: farbe,
    fillOpacity: opacity

};

            },
                        onEachFeature: function(feature, layer) {

                const landkreis =
                    feature.properties.NAME_3 ||
                    feature.properties.NAME ||
                    "Unbekannt";
                    console.log("NAME_3 =", feature.properties.NAME_3, "NAME =", feature.properties.NAME);
const mapping = {
    "Aachen Städte": "Stadt Aachen",
    "Augsburg Städte": "Stadt Augsburg",
    "Baden-Baden Städte": "Stadt Baden-Baden",
    "Ansbach Städte": "Stadt Ansbach",
    "Amberg Städte": "Stadt Amberg",
    "Alb-Donau": "Alb-Donau-Kreis"
};

let suchname = mapping[landkreis] || findeWarnname(warnungen, landkreis);
layer.bindTooltip(landkreis, {
    sticky: false,
    permanent: false
});
  layer.on("mouseover", function () {

    this.setStyle({
        weight: 4,
        color: "#ffffff",
        fillColor: "#ffffff",
        fillOpacity: 0.35
    });

    //this.bringToFront();

});

layer.on("mouseout", function () {

    geojsonLayer.resetStyle(this);

});

                layer.on("click", async function() {

                  let daten = warnungen[suchname];
if (!daten) {
    daten = [];
}
                    if (!daten || daten.length === 0) {

                        layer.bindPopup(
                            "<b>" + landkreis + "</b><br><br>✅ Keine Warnungen"
                        ).openPopup();

                      // return;
                    }

                   let html =
    "<h2 style='margin:0;color:#1565C0'>" + landkreis + "</h2>" +
    "<hr style='margin:8px 0'>";

                    daten.forEach(w => {
let warnstufe = "<span style='color:#FFD600;font-weight:bold'>🟡 Gelb</span>";

if (w.level == 3)
    warnstufe = "<span style='color:#FF9800;font-weight:bold'>🟠 Orange</span>";

if (w.level == 4)
    warnstufe = "<span style='color:#E53935;font-weight:bold'>🔴 Rot</span>";

if (w.level >= 5)
    warnstufe = "<span style='color:#8E24AA;font-weight:bold'>🟣 Violett</span>";
let countdown = "";

const ende = new Date(w.end);
const jetzt = new Date();

const diff = ende - jetzt;
if (diff > 0) {

    const stunden = Math.floor(diff / 3600000);
    const minuten = Math.floor((diff % 3600000) / 60000);

    countdown = "⏳ endet in " + stunden + " Std. " + minuten + " Min.";

} else {

    countdown = "⛔ Warnung abgelaufen";

}
html +=

    "<div style='margin-bottom:12px'>" +
    "<span style='font-size:22px'>⚠️</span> <b style='color:#d32f2f'>" + w.event + "</b><br>" +
    "<span style='font-size:14px'>" + w.headline + "</span><br>" +
"<small>" +
warnstufe + "<br>" +
countdown + "<br>" +
"<b>🕒 Gültig bis:</b> " +
    new Date(w.end).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
})+
    "</small>" +
    "</div>";
    "</div>";

                    });
    console.log("Landkreis geklickt");

const mitte = layer.getBounds().getCenter();

console.log(mitte);

ladeWetter(
    mitte.lat,
    mitte.lng,
    landkreis
);
ladeSonnenfinsternis(
    mitte.lat,
    mitte.lng,
    landkreis
);
                    // Karte auf den angeklickten Landkreis zoomen
map.flyTo(mitte, 8, {
    duration: 1.2
});

// Sonnenfinsternis-Popup direkt auf der Karte
try {
    const eclipseResponse = await fetch(
        `/api/sonnenfinsternis?lat=${mitte.lat}&lon=${mitte.lng}`
    );

    const eclipse = await eclipseResponse.json();

    const popupHtml = `
        <div style="
            min-width:430px;
            max-width:460px;
            font-family:Arial,sans-serif;
            line-height:1.35;
            color:#222;
        ">

            <div style="
                font-size:16px;
                font-weight:bold;
                margin-bottom:8px;
            ">
                🌑 Sonnenfinsternis – 12. August 2026
            </div>

            <div style="
                background:#f4f4f4;
                border-bottom:1px solid #aaa;
                padding:6px 8px;
                margin-bottom:8px;
                font-size:13px;
            ">
                📍 <strong>${landkreis}</strong><br>
                Position:
                ${mitte.lat.toFixed(4)}°
                ${mitte.lat >= 0 ? "N" : "S"}
                /
                ${Math.abs(mitte.lng).toFixed(4)}°
                ${mitte.lng >= 0 ? "E" : "W"}
            </div>

            <div style="
                background:#e8f1ff;
border-left:4px solid #1565c0;
                padding:6px 8px;
                margin-bottom:8px;
                font-size:13px;
            ">
                🌑 <strong>Partielle Sonnenfinsternis</strong><br>
                Beginn: ${eclipse.begin ?? eclipse.c1_time ?? "--:--"} UTC<br>
                Maximum: ${eclipse.maximum ?? eclipse.mid_time ?? "--:--"} UTC<br>
                Ende: ${eclipse.ende ?? eclipse.c4_time ?? "--:--"} UTC
            </div>

            <div style="font-size:13px;">
                🌑 <strong>Bedeckung:</strong>
                ${eclipse.bedeckung ?? "--"} %<br>

                📐 <strong>Magnitude:</strong>
                ${eclipse.magnitude ?? "--"}<br>

                ☀️ <strong>Sonnenhöhe:</strong>
                ${eclipse.sonnenhoehe ?? "--"}°<br>

                🧭 <strong>Azimut:</strong>
                ${eclipse.azimut ?? "--"}°
            </div>

            <div style="
                margin-top:10px;
                padding-top:6px;
                border-top:1px solid #ccc;
                font-size:11px;
                color:#777;
            ">
                Quelle: NASA GSFC / Eclipse Path
            </div>
<div style="
    margin-top:10px;
    padding:7px 8px;
    background:#1565c0;
    color:#fff;
    border-radius:5px;
    text-align:center;
    font-size:11px;
    font-weight:bold;
">
    © Markus Michels – Wetterstudio Bad Feilnbach
</div>
        </div>
    `;

    L.popup({
        maxWidth: 480,
        closeButton: true
    })
    .setLatLng(mitte)
    .setContent(popupHtml)
    .openOn(map);

} catch (error) {
    console.error(
        "Sonnenfinsternis-Popup Fehler:",
        error
    );
}

                });

            }

        });
geojsonLayer.addTo(map);
// ------------------------------
// Live-Suche
// ------------------------------
// ------------------------------
// DWD-Legende
// ------------------------------

const legende = L.control({ position: "bottomright" });

legende.onAdd = function () {

  const div = L.DomUtil.create("div");
div.className = "dwd-legende";
div.style.background = "#1f2937";
div.style.color = "white";
div.style.padding = "10px";
div.style.border = "2px solid #ffd700";
div.style.borderRadius = "8px";
div.innerHTML = `
<h4>📖 DWD-Warnstufen</h4>

<div class="stufe">
    <span class="farbe gelb"></span>
    Wetterwarnung
</div>

<div class="stufe">
    <span class="farbe orange"></span>
    Markante Wetterwarnung
</div>

<div class="stufe">
    <span class="farbe rot"></span>
    Unwetterwarnung
</div>

<div class="stufe">
    <span class="farbe violett"></span>
    Extremes Unwetter
</div>
`;

    return div;
};
console.log(">>> DWD-Legende wird hinzugefügt");
legende.addTo(map);
const layerListe = [];

geojsonLayer.eachLayer(layer => {

    const landkreis =
        layer.feature.properties.NAME_3 ||
        layer.feature.properties.NAME ||
        "";

    layerListe.push({
        name: landkreis,
        layer: layer
    });

});

suche.addEventListener("input", function () {

    const text = this.value.toLowerCase().trim();

    suchErgebnisse.innerHTML = "";
    ausgewaehlt = -1;

    if (text.length < 2) {

        suchErgebnisse.style.display = "none";
        return;

    }

   const treffer = layerListe
    .filter(l =>
        l.name.toLowerCase().includes(text)
    )
    .sort((a, b) => {

        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Exakte Treffer zuerst
        if (aName === text && bName !== text) return -1;
        if (bName === text && aName !== text) return 1;

        // Treffer am Wortanfang bevorzugen
        const aStarts = aName.startsWith(text);
        const bStarts = bName.startsWith(text);

        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // Danach alphabetisch
        return aName.localeCompare(bName, "de");

    });

    if (treffer.length === 0) {

        suchErgebnisse.style.display = "none";
        return;

    }

    suchErgebnisse.style.display = "block";
const trefferElemente = [];
    treffer.forEach((eintrag) => {

        const div = document.createElement("div");

        div.className = "suchTreffer";
        trefferElemente.push({
    div: div,
    eintrag: eintrag
});
        div.textContent = eintrag.name;

        div.onclick = function () {

  map.flyToBounds(eintrag.layer.getBounds(), {
    padding: [40, 40],
    duration: 1.2
});

setTimeout(() => {
    eintag.layer.fire("click", { latlng: eintag.layer.getBounds().getCenter() });
}, 1200);

            suchErgebnisse.style.display = "none";
            suche.value = eintrag.name;

        };

        suchErgebnisse.appendChild(div);

    });

});
document.addEventListener("click", function (e) {

    if (!suche.contains(e.target) &&
        !suchErgebnisse.contains(e.target)) {

        suchErgebnisse.style.display = "none";

    }

});
document.addEventListener("keydown", function (e) {

    if (e.key === "Escape") {

        suchErgebnisse.style.display = "none";

        suche.blur();

    }

});




setInterval(() => {

    fetch("/api/warnungen")
        .then(r => r.json())
        .then(neueWarnungen => {

            warnungen = neueWarnungen;

            geojsonLayer.eachLayer(layer => {

                geojsonLayer.resetStyle(layer);

            });

        });

}, 120000);
   
// Radarbild laden


ladeRadar();


// Wetter wird vorerst über den Kartenklick geladen.
// Startaufruf wird im nächsten Schritt korrekt eingebaut.
// alle 5 Minuten aktualisieren
setInterval(ladeRadar, 120000);
// Fortschrittsbalken
const balken = document.getElementById("progressBar");

if (balken) {
    const prozent = Number(balken.dataset.prozent) || 0;

    balken.style.width = prozent + "%";
    balken.textContent = prozent + " %";
}
    })
    .catch(error => console.error(error));

});