document.addEventListener("DOMContentLoaded", () => {

    console.log("Wetterstudio Bad Feilnbach AI gestartet");

    const karte = document.getElementById("deutschlandkarte");
    const suche = document.getElementById("landkreisSuche");
    const suchErgebnisse = document.getElementById("suchErgebnisse");
    let ausgewaehlt = -1;
    if (!karte) return;

    const map = L.map("deutschlandkarte").setView([51.2, 10.4], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    Promise.all([
        fetch("/api/warnungen").then(r => r.json()),
        fetch("/static/geojson/landkreise.geojson").then(r => r.json())
    ])

    .then(([datenWarnungen, geojson]) => {

    let warnungen = datenWarnungen;

       const geojsonLayer = L.geoJSON(geojson, {

            style: function(feature) {

                const landkreis =
                    feature.properties.NAME_3 ||
                    feature.properties.NAME ||
                    "";
                    let suchname = landkreis;

if (!warnungen[suchname]) {

    suchname = "Kreis " + landkreis;

    if (!warnungen[suchname]) {
        suchname = "Kreis und Stadt " + landkreis;
    }

    if (!warnungen[suchname]) {
        suchname = "Stadt " + landkreis;
    }

    if (!warnungen[suchname]) {
        suchname = "Landeshauptstadt " + landkreis;
    }
}
// console.log(landkreis);
                let farbe = "#3ec5ff";
                let opacity = 0.08;
                           

                    let maxLevel = 0;

                 if (warnungen[suchname]) {

    warnungen[suchname].forEach(w => {

                        if (w.level > maxLevel) {
                            maxLevel = w.level;
                        }

                    });

                    if (maxLevel == 2) {
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

                    else if (maxLevel >= 5) {
                        farbe = "#8E24AA";
                        opacity = 0.70;
                    }

                }

                return {

                    color: farbe,
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
let suchname = landkreis;

if (!warnungen[suchname]) {

    suchname = "Kreis " + landkreis;

    if (!warnungen[suchname]) {
        suchname = "Kreis und Stadt " + landkreis;
    }

    if (!warnungen[suchname]) {
        suchname = "Stadt " + landkreis;
    }

    if (!warnungen[suchname]) {
        suchname = "Landeshauptstadt " + landkreis;
    }
}
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

                layer.on("click", function() {

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
function ladeWetter(lat, lon, landkreis) {

    fetch(`/api/wetter?lat=${lat}&lon=${lon}`)
    .then(r => r.json())
    .then(wetter => {

        document.getElementById("ort").innerHTML =
            landkreis;

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
const mitte = layer.getBounds().getCenter();

console.log(mitte);

ladeWetter(
    mitte.lat,
    mitte.lng,
    landkreis
);
                    layer.bindPopup(html).openPopup();

                });

            }

        });
geojsonLayer.addTo(map);
// ------------------------------
// Live-Suche
// ------------------------------

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
    eintrag.layer.fire("click");
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


const legende = L.control({ position: "bottomright" });

legende.onAdd = function () {

    const div = L.DomUtil.create("div", "info legend");

    div.innerHTML =
    "<div style='background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.3);font-size:14px;line-height:22px'>" +
    "<b>Warnstufen</b><hr style='margin:6px 0'>" +
    "<span style='color:#FFD600;font-weight:bold'>🟡 Gelb – Wetterwarnung</span><br>" +
"<span style='color:#FF9800;font-weight:bold'>🟠 Orange – Markante Wetterwarnung</span><br>" +
"<span style='color:#E53935;font-weight:bold'>🔴 Rot – Unwetterwarnung</span><br>" +
"<span style='color:#8E24AA;font-weight:bold'>🟣 Violett – Extremes Unwetter</span>" +
    "</div>";
        "<div style='background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.3);font-size:14px'>" +
        "<b>Warnstufen</b><br><br>" +
        "🟡 Gelb<br>" +
        "🟠 Orange<br>" +
        "🔴 Rot<br>" +
        "🟣 Violett" +
        "</div>";

    return div;
};

legende.addTo(map);
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
function ladeRadar() {

    const radar = document.getElementById("radarbild");

    if (!radar) return;

    radar.src =
        "https://www.dwd.de/DWD/wetter/radar/radfilm_brd_akt.gif?" +
        new Date().getTime();

}

ladeRadar();

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