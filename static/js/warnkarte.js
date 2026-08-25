document.addEventListener("DOMContentLoaded", async () => {

    // Karte erzeugen
    const karte = L.map("karte").setView([51.0, 10.3], 4);

    // OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(karte);

    const vorabPattern = '<defs><pattern id="vorabSchraffur" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="#FF9800" fill-opacity="0.20"/><line x1="0" y1="0" x2="0" y2="8" stroke="#FF9800" stroke-width="5" stroke-opacity="1"/></pattern></defs>';
    // DWD-Warnungen laden
    const svgRenderer = L.svg();
    svgRenderer.addTo(karte);
    const svgRoot = svgRenderer._container;
    if (svgRoot && !svgRoot.querySelector("#vorabSchraffur")) {
        svgRoot.insertAdjacentHTML("afterbegin", vorabPattern);
    }
    const antwort = await fetch("/api/dwd-warnungen");
    const warnungen = await antwort.json();
    const mappingAntwort = await fetch("/static/mapping.json");
    const mapping = await mappingAntwort.json();
    const sonderGebiete = {
        "Kreis und Stadt München": [
            "Stadt München",
            "Landkreis München"
        ],
        "Kreis und Stadt Augsburg": [
            "Stadt Augsburg",
            "Landkreis Augsburg"
        ],
        "Kreis und Stadt Rosenheim": [
            "Stadt Rosenheim",
            "Landkreis Rosenheim"
        ],
        "Alb-Donau-Kreis und Stadt Ulm": [
            "Landkreis Alb-Donau-Kreis",
            "Ulm"
        ],
        "Kreis Nordfriesland - Binnenland": [
            "Landkreis Nordfriesland"
        ],
        "Kreis Nordfriesland - Küste": [
            "Landkreis Nordfriesland"
        ],
        "Kreis Schleswig-Flensburg - Binnenland": [
            "Schleswig-Flensburg"
        ],
        "Kreis Schleswig-Flensburg - Küste": [
            "Schleswig-Flensburg"
        ]
    };

    const gehoertZurWarnung = (regionName, landkreisName) => {
        if (regionName === landkreisName) return true;

        if (sonderGebiete[regionName]) {
            return sonderGebiete[regionName].includes(landkreisName);
        }

        return false;
    };
    const normalisiereNameGlobal = n => String(n || "").replace(/^(Landkreis|Kreis|Stadt|LK)\s+/i, "").replace(/\s+/g, " ").trim().toUpperCase();
    console.log("VORAB-ROHDATEN:", warnungen.vorabInformation);
    console.log("VORAB-ROSENHEIM:", Object.values(warnungen.vorabInformation || {}).flat().filter(w => w.regionName && w.regionName.includes("Rosenheim")));

console.log("Mapping:", mapping);
    console.log("DWD-Warnungen:", warnungen);
    console.log("Anzahl Gruppen:", Object.keys(warnungen.warnings).length);
console.log(warnungen.warnings);
const warnGruppen = Object.values(warnungen.warnings || {});
const ersteWarnGruppe = warnGruppen.find(gruppe => Array.isArray(gruppe) && gruppe.length > 0);

if (ersteWarnGruppe) {
    const beispielWarnung = ersteWarnGruppe.find(() => true);
    console.log("Beispiel-Warnung:", Object.keys(beispielWarnung));
} else {
    console.log("Keine normalen DWD-Warnungen vorhanden.");
}
    // Deutschland-Landkreise laden
    fetch("/static/geojson/landkreise_neu.geojson")
        .then(r => r.json())
        .then(data => {

          // Karte automatisch exakt an die Deutschland-Landkreise anpassen
          const deutschlandGrenzen = L.geoJSON(data).getBounds();
          karte.fitBounds(deutschlandGrenzen, { padding: [10, 10] });

          L.geoJSON(data, {
            renderer: svgRenderer,

    style: function(feature) {

        const name = feature.properties.DWD_NAME;

        const passendeWarnung = Object.values(warnungen.warnings)
    .flat()
    .find(w => {
if (
    w.regionName.includes("Traun") ||
    w.regionName.includes("Berchtes") ||
    w.regionName.includes("Rosenheim") ||
    w.regionName.includes("Mühldorf")
)
    console.log("Traunstein:", w);
        const dwdName = mapping[w.regionName] ?? mapping["Landkreis " + w.regionName];

if (dwdName === name) {
    console.log("TREFFER:", name, w.level, w.event);
}

return dwdName === name ||
       gehoertZurWarnung(w.regionName, name);
    });

const alleWarnungen = Object.values(warnungen.warnings || {}).flat().concat(Object.values(warnungen.vorabInformation || {}).flat()); const normalisiereName = n => String(n || "").replace(/^(Landkreis|Kreis|Stadt|LK)\s+/i, "").replace(/\s+/g, " ").trim().toUpperCase(); const warnungenLandkreis = alleWarnungen.filter(w => { const region = normalisiereName(w.regionName); const dwdName = normalisiereName(mapping[w.regionName] ?? mapping["Landkreis " + w.regionName] ?? w.regionName); return dwdName === normalisiereName(name) ||
       region === normalisiereName(name) ||
       region === normalisiereName(name).replace(/^LANDKREIS\s+/, "") ||
       dwdName === normalisiereName(name).replace(/^LANDKREIS\s+/, "") ||
       gehoertZurWarnung(w.regionName, name); }); const hatVorab = warnungenLandkreis.some(w => w.event && w.event.toUpperCase().startsWith("VORABINFORMATION"));const hatHitze = warnungenLandkreis.some(w => w.type === 8); let maxLevel = 0; warnungenLandkreis.forEach(w => { if (w.type === 0) maxLevel = Math.max(maxLevel, w.level); else if (w.type !== 8) maxLevel = Math.max(maxLevel, w.level); }); let farbe = "#8BC34A"; let opacity = 0.55; if (hatVorab) { farbe = "#FF9800"; opacity = 0.35; } else if (hatHitze) { farbe = "#C8A2FF"; opacity = 0.60; } else if (maxLevel === 2) { farbe = "#FFD600"; opacity = 0.55; } else if (maxLevel === 3) { farbe = "#FF9800"; opacity = 0.60; } else if (maxLevel === 4) { farbe = "#E53935"; opacity = 0.65; } else if (maxLevel >= 5) { farbe = "#8E24AA"; opacity = 0.70; }
return {
            color: "#666",
            weight: 1,
            fillColor: hatVorab ? "url(#vorabSchraffur)" : farbe,
            fillOpacity: hatVorab ? 0.35 : opacity
        };

    },

    onEachFeature: function(feature, layer) {

        const landkreis =
            feature.properties.DWD_NAME ||
            feature.properties.NAME_3 ||
            feature.properties.NAME ||
            "Unbekannt";

        const suchname =
            mapping[landkreis] ||
            landkreis;

        const zielName = normalisiereNameGlobal(landkreis);
        const hatVorabLayer = Object.values(warnungen.vorabInformation || {}).flat().some(w => {
            const region = normalisiereNameGlobal(w.regionName);
            const dwdName = normalisiereNameGlobal(
                mapping[w.regionName] ??
                mapping["Landkreis " + w.regionName] ??
                w.regionName
            );
            const kurzName = zielName.replace(/^LANDKREIS\s+/, "");
            return (
                dwdName === zielName ||
                region === zielName ||
                region === kurzName ||
                dwdName === kurzName
            ) &&
            w.event &&
            w.event.toUpperCase().startsWith("VORABINFORMATION");
        });

        if (landkreis.toUpperCase().includes("ROSENHEIM")) console.log("ROSENHEIM-LAYER:", landkreis, "hatVorabLayer =", hatVorabLayer);
        if (hatVorabLayer) {
            setTimeout(() => {
                const renderer = layer._renderer;
                const svgRoot = renderer && renderer._container;
                const path = layer._path;

                if (!svgRoot || !path) return;

                let defs = svgRoot.querySelector("defs");

                if (!defs) {
                    defs = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "defs"
                    );
                    svgRoot.insertBefore(defs, svgRoot.firstChild);
                }

                let pattern = svgRoot.querySelector("#vorabSchraffur");

                if (!pattern) {
                    pattern = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "pattern"
                    );

                    pattern.setAttribute("id", "vorabSchraffur");
                    pattern.setAttribute("patternUnits", "userSpaceOnUse");
                    pattern.setAttribute("width", "12");
                    pattern.setAttribute("height", "12");

                    const rect = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "rect"
                    );
                    rect.setAttribute("width", "12");
                    rect.setAttribute("height", "12");
                    rect.setAttribute("fill", "#FF9800");
                    rect.setAttribute("fill-opacity", "0.26");

                    const line = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "line"
                    );
                    line.setAttribute("x1", "0");
                    line.setAttribute("y1", "0");
                    line.setAttribute("x2", "0");
                    line.setAttribute("y2", "12");
                    line.setAttribute("stroke", "#FF9800");
                    line.setAttribute("stroke-width", "5");
                    line.setAttribute("stroke-opacity", "1");

                    pattern.appendChild(rect);
                    pattern.appendChild(line);
                    defs.appendChild(pattern);
                }

                path.setAttribute("fill", "url(#vorabSchraffur)");
                path.setAttribute("fill-opacity", "0.35");
                path.setAttribute("stroke", "#FF9800");
                path.setAttribute("stroke-width", "2");
            }, 100);
        }
        // --------------------------------------------------
        // DWD-Warnsymbol in der Mitte des Landkreises
        // --------------------------------------------------
        const alleWarnungenFuerSymbol = Object.values(warnungen.warnings || {})
            .flat()
            .concat(Object.values(warnungen.vorabInformation || {}).flat());

        const passendeWarnungFuerSymbol = alleWarnungenFuerSymbol.find(w => {
            const ziel = normalisiereNameGlobal(landkreis);
            const region = normalisiereNameGlobal(w.regionName);

            const dwdName = normalisiereNameGlobal(
                mapping[w.regionName] ??
                mapping["Landkreis " + w.regionName] ??
                w.regionName
            );

            const kurzName = ziel.replace(/^LANDKREIS\s+/, "");

            return (
                region === ziel ||
                region === kurzName ||
                dwdName === ziel ||
                dwdName === kurzName ||
                gehoertZurWarnung(w.regionName, landkreis)
            );
        });

        if (passendeWarnungFuerSymbol) {

            let warnSymbol = "⚠️";

            const eventName =
                String(passendeWarnungFuerSymbol.event || "").toUpperCase();

            if (eventName.includes("GEWITTER")) {
                warnSymbol = "🌩️";
            } else if (eventName.includes("STURM")) {
                warnSymbol = "💨";
            } else if (
                eventName.includes("REGEN") ||
                eventName.includes("DAUERREGEN")
            ) {
                warnSymbol = "🌧️";
            } else if (eventName.includes("SCHNEE")) {
                warnSymbol = "❄️";
            } else if (eventName.includes("GLÄTTE")) {
                warnSymbol = "🧊";
            } else if (eventName.includes("NEBEL")) {
                warnSymbol = "🌫️";
            } else if (eventName.includes("HITZE")) {
                warnSymbol = "🌡️";
            }

            const mittelpunkt = layer.getBounds().getCenter();

            const symbolIcon = L.divIcon({
                className: "dwd-warnsymbol",
                html: `
                    <div style="
                        font-size: 30px;
                        line-height: 30px;
                        text-align: center;
                        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));
                    ">
                        ${warnSymbol}
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            L.marker(mittelpunkt, {
                icon: symbolIcon,
                interactive: false,
                keyboard: false
            }).addTo(karte);

            console.log(
                "WARNSYMBOL GESETZT:",
                landkreis,
                warnSymbol,
                passendeWarnungFuerSymbol.event
            );
        }
        layer.bindTooltip(landkreis, {
            sticky: false,
            permanent: false
        });

        layer.on("click", function() {

            // Angeclickten Landkreis an den bestehenden Wetterbereich übergeben
            const mittelpunkt = layer.getBounds().getCenter();

            console.log(
                "WETTER-LANDKREIS GEKLICKT:",
                landkreis,
                mittelpunkt.lat,
                mittelpunkt.lng
            );

            if (typeof window.ladeWetter === "function") {
                window.ladeWetter(
                    mittelpunkt.lat,
                    mittelpunkt.lng,
                    landkreis
                );
            } else {
                fetch(`/api/wetter?lat=${mittelpunkt.lat}&lon=${mittelpunkt.lng}&landkreis=${encodeURIComponent(landkreis)}`)
                    .then(r => r.json())
                    .then(wetter => {
                        document.getElementById("ort").textContent = wetter.ort;
                        document.getElementById("temperatur").textContent = wetter.temperatur + " °C";
                        document.getElementById("wettertext").textContent = wetter.wettertext;
                        document.getElementById("wind").textContent = wetter.wind + " km/h";
                        document.getElementById("boeen").textContent = wetter.boeen + " km/h";
                        document.getElementById("regen").textContent = wetter.regen + " mm";
                        document.getElementById("luftdruck").textContent = wetter.luftdruck + " hPa";
                        document.getElementById("luftfeuchte").textContent = wetter.luftfeuchte + " %";
                        document.getElementById("gefuehlt").textContent = wetter.gefuehlt + " °C";
                    })
                    .catch(error => console.error("Wetter konnte nicht geladen werden:", error));
            }

            const alleWarnungen = Object.values(warnungen.warnings || {})
                .flat()
                .concat(Object.values(warnungen.vorabInformation || {}).flat());

            const zielName = normalisiereNameGlobal(landkreis);

            const daten = alleWarnungen.filter(w => {
                const region = normalisiereNameGlobal(w.regionName);

                const dwdName = normalisiereNameGlobal(
                    mapping[w.regionName] ??
                    mapping["Landkreis " + w.regionName] ??
                    w.regionName
                );

                const kurzName = zielName.replace(/^LANDKREIS\s+/, "");

                return (
                    dwdName === zielName ||
                    region === zielName ||
                    region === kurzName ||
                    dwdName === kurzName ||
                    gehoertZurWarnung(w.regionName, landkreis)
                );
            });

            console.log("KLICK-WARNUNGEN:", landkreis, daten);

            let html =
                "<h2 style='margin:0;color:#1565C0'>" +
                landkreis +
                "</h2>" +
                "<hr style='margin:8px 0'>";

            if (daten.length === 0) {

                html += "✅ Keine Warnungen";

            } else {

                daten.forEach(w => {

                    let warnstufe = "<span style='color:#FFD600;font-weight:bold'>🟡 Gelb</span>"; if (w.event && w.event.toUpperCase().startsWith("VORABINFORMATION")) warnstufe = "<span style='color:#FF9800;font-weight:bold'>🟠 Vorabinformation</span>"; else if (w.type === 8) warnstufe = "<span style='color:#C8A2FF;font-weight:bold'>🟣 Hitzewarnung</span>"; else if (w.type === 0 || w.level === 3) warnstufe = "<span style='color:#FF9800;font-weight:bold'>🟠 Orange</span>"; else if (w.level === 4) warnstufe = "<span style='color:#E53935;font-weight:bold'>🔴 Rot</span>"; else if (w.level >= 5) warnstufe = "<span style='color:#8E24AA;font-weight:bold'>🟣 Violett</span>";

                    let gueltigBis = "";

                    if (w.end) {
                        gueltigBis =
                            "<b>🕒 Gültig bis:</b> " +
                            new Date(w.end).toLocaleString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            });
                    }

                    html +=
                        "<div style='margin-bottom:12px'>" +
                        "<span style='font-size:22px'>⚠️</span> " +
                        "<b style='color:#d32f2f'>" +
                        w.event +
                        "</b><br>" +
                        "<span style='font-size:14px'>" +
                        w.headline +
                        "</span><br>" +
                        "<small>" +
                        warnstufe +
                        "<br>" +
                        gueltigBis +
                        "</small>" +
                        "</div>";
                });
            }

            layer.bindPopup(html).openPopup();

        });
    }

}).addTo(karte);

        });

});


