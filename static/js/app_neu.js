document.addEventListener("DOMContentLoaded", () => {

    console.log("Wetterstudio Bad Feilnbach AI gestartet");

    // HTML-Elemente
    const karte = document.getElementById("deutschlandkarte");
    const suche = document.getElementById("landkreisSuche");
    const suchErgebnisse = document.getElementById("suchErgebnisse");

    // Abbruch, wenn keine Karte vorhanden ist
    if (!karte) return;
// Leaflet-Karte erstellen
const map = L.map("deutschlandkarte").setView([51.2, 10.4], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);
// Daten laden
Promise.all([
    fetch("/api/warnungen").then(r => r.json()),
    fetch("/static/geojson/landkreise.geojson").then(r => r.json())
])
.then(([datenWarnungen, geojson]) => {

    let warnungen = datenWarnungen;
const geojsonLayer = L.geoJSON(geojson, {

    style: function (feature) {
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

    }

});
});
});