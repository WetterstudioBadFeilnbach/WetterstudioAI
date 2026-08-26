document.addEventListener("DOMContentLoaded", async () => {

    // --------------------------------------------------
    // KARTE
    // --------------------------------------------------

    const karte = L.map("karte", {
        zoomControl: true,
        attributionControl: false,
        preferCanvas: false
    }).setView([51.0, 10.3], 5);

    document.getElementById("karte").style.background = "#d7e3ec";

    // --------------------------------------------------
    // SVG-SCHRAFFUR FÜR VORABINFORMATIONEN
    // --------------------------------------------------

    const vorabPattern =
        '<defs>' +
        '<pattern id="vorabSchraffur" ' +
        'patternUnits="userSpaceOnUse" ' +
        'width="8" height="8">' +
        '<rect width="8" height="8" ' +
        'fill="#FF9800" fill-opacity="0.20"/>' +
        '<line x1="0" y1="0" x2="0" y2="8" ' +
        'stroke="#FF9800" stroke-width="5" stroke-opacity="1"/>' +
        '</pattern>' +
        '</defs>';

    const svgRenderer = L.svg();
    svgRenderer.addTo(karte);

    const svgRoot = svgRenderer._container;

    if (
        svgRoot &&
        !svgRoot.querySelector("#vorabSchraffur")
    ) {
        svgRoot.insertAdjacentHTML(
            "afterbegin",
            vorabPattern
        );
    }

    // --------------------------------------------------
    // DWD-WARNUNGEN UND MAPPING LADEN
    // --------------------------------------------------

    const antwort = await fetch("/api/dwd-warnungen");
    const warnungen = await antwort.json();

    const mappingAntwort =
        await fetch("/static/mapping.json");

    const mapping =
        await mappingAntwort.json();

    // --------------------------------------------------
    // SONDERZUGEBIETE
    // --------------------------------------------------

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

    // --------------------------------------------------
    // NAMEN NORMALISIEREN
    //
    // WICHTIG:
    // "Kreis Plön - Küste" wird zu "PLÖN"
    // "Kreis Rendsburg-Eckernförde - Binnenland"
    // wird zu "RENDSBURG-ECKERNFÖRDE"
    // --------------------------------------------------

    const normalisiereName = n =>
        String(n || "")
            .replace(
                /^(Landkreis|Kreis|Stadt|LK)\s+/i,
                ""
            )
            .replace(
                /\s+-\s+(Binnenland|Küste)\s*$/i,
                ""
            )
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();

    const gehoertZurWarnung = (
        regionName,
        landkreisName
    ) => {

        const region =
            normalisiereName(regionName);

        const landkreis =
            normalisiereName(landkreisName);

        if (region === landkreis) {
            return true;
        }

        const mapped =
            mapping[regionName] ??
            mapping["Landkreis " + regionName];

        if (
            mapped &&
            normalisiereName(mapped) === landkreis
        ) {
            return true;
        }

        if (sonderGebiete[regionName]) {
            return sonderGebiete[regionName]
                .some(name =>
                    normalisiereName(name) === landkreis
                );
        }

        return false;
    };

    // --------------------------------------------------
    // ALLE WARNUNGEN ZUSAMMENFÜHREN
    // --------------------------------------------------

    const alleWarnungen = [
        ...Object.values(
            warnungen.warnings || {}
        ).flat(),

        ...Object.values(
            warnungen.vorabInformation || {}
        ).flat()
    ];

    console.log(
        "DWD-Warnungen geladen:",
        alleWarnungen
    );

    // --------------------------------------------------
    // LANDKREIS-WARNUNGEN FINDEN
    // --------------------------------------------------

    const warnungenFuerLandkreis =
        landkreisName =>

            alleWarnungen.filter(w =>
                gehoertZurWarnung(
                    w.regionName,
                    landkreisName
                )
            );

    // --------------------------------------------------
    // DEUTSCHLAND-LANDKREISE LADEN
    // --------------------------------------------------

    fetch(
        "/static/geojson/landkreise_neu.geojson"
    )
        .then(r => r.json())

        .then(data => {

            const deutschlandGrenzen =
                L.geoJSON(data).getBounds();

            karte.fitBounds(
                deutschlandGrenzen,
                {
                    padding: [10, 10]
                }
            );

            // ----------------------------------------------
            // LANDKREISE ZEICHNEN
            // ----------------------------------------------

            const warnLayer = L.geoJSON(
                data,
                {

                    renderer: svgRenderer,

                    // --------------------------------------
                    // FARBEN
                    // --------------------------------------

                    style: feature => {

                        const landkreis =
                            feature.properties.DWD_NAME ||
                            feature.properties.NAME_3 ||
                            feature.properties.NAME ||
                            "";

                        const daten =
                            warnungenFuerLandkreis(
                                landkreis
                            );

                        const hatVorab =
                            daten.some(w =>
                                String(
                                    w.event || ""
                                )
                                    .toUpperCase()
                                    .startsWith(
                                        "VORABINFORMATION"
                                    )
                            );

                        const hatHitze =
                            daten.some(w =>
                                Number(w.type) === 8
                            );

                        let maxLevel = 0;

                        daten.forEach(w => {

                            if (
                                Number(w.type) !== 8
                            ) {

                                maxLevel =
                                    Math.max(
                                        maxLevel,
                                        Number(
                                            w.level
                                        ) || 0
                                    );
                            }
                        });

                        let fillColor =
                            "#8BC34A";

                        let fillOpacity =
                            0.55;

                        if (hatVorab) {

                            fillColor =
                                "#FF9800";

                            fillOpacity =
                                0.35;

                        } else if (hatHitze) {

                            fillColor =
                                "#C8A2FF";

                            fillOpacity =
                                0.60;

                        } else if (
                            maxLevel === 2
                        ) {

                            fillColor =
                                "#FFD600";

                            fillOpacity =
                                0.55;

                        } else if (
                            maxLevel === 3
                        ) {

                            fillColor =
                                "#FF9800";

                            fillOpacity =
                                0.60;

                        } else if (
                            maxLevel === 4
                        ) {

                            fillColor =
                                "#E53935";

                            fillOpacity =
                                0.65;

                        } else if (
                            maxLevel >= 5
                        ) {

                            fillColor =
                                "#8E24AA";

                            fillOpacity =
                                0.70;
                        }

                        return {

                            color:
                                "#ffffff",

                            weight:
                                0.35,

                            fillColor:
                                hatVorab
                                    ? "url(#vorabSchraffur)"
                                    : fillColor,

                            fillOpacity:
                                fillOpacity
                        };
                    },

                    // --------------------------------------
                    // INTERAKTION
                    // --------------------------------------

                    onEachFeature: (
                        feature,
                        layer
                    ) => {

                        const landkreis =
                            feature.properties.DWD_NAME ||
                            feature.properties.NAME_3 ||
                            feature.properties.NAME ||
                            "Unbekannt";

                        const daten =
                            warnungenFuerLandkreis(
                                landkreis
                            );

                        // ----------------------------------
                        // TOOLTIP
                        // ----------------------------------

                        layer.bindTooltip(
                            landkreis,
                            {
                                sticky: false,
                                permanent: false
                            }
                        );

                        // ----------------------------------
                        // WARNSYMBOL
                        // ----------------------------------

                        if (
                            daten.length > 0
                        ) {

                            const warnung =
                                daten[0];

                            let warnSymbol =
                                "⚠️";

                            const eventName =
                                String(
                                    warnung.event || ""
                                )
                                    .toUpperCase();

                            if (
                                eventName.includes(
                                    "GEWITTER"
                                )
                            ) {

                                warnSymbol =
                                    "🌩️";

                            } else if (
                                eventName.includes(
                                    "STURM"
                                ) ||
                                eventName.includes(
                                    "WIND"
                                ) ||
                                eventName.includes(
                                    "BÖEN"
                                )
                            ) {

                                warnSymbol =
                                    "💨";

                            } else if (
                                eventName.includes(
                                    "REGEN"
                                )
                            ) {

                                warnSymbol =
                                    "🌧️";

                            } else if (
                                eventName.includes(
                                    "SCHNEE"
                                )
                            ) {

                                warnSymbol =
                                    "❄️";

                            } else if (
                                eventName.includes(
                                    "GLÄTTE"
                                )
                            ) {

                                warnSymbol =
                                    "🧊";

                            } else if (
                                eventName.includes(
                                    "NEBEL"
                                )
                            ) {

                                warnSymbol =
                                    "🌫️";

                            } else if (
                                eventName.includes(
                                    "HITZE"
                                )
                            ) {

                                warnSymbol =
                                    "🌡️";
                            }

                            const mittelpunkt =
                                layer
                                    .getBounds()
                                    .getCenter();

                            const symbolIcon =
                                L.divIcon({

                                    className:
                                        "dwd-warnsymbol",

                                    html:
                                        '<div style="' +
                                        'font-size:30px;' +
                                        'line-height:30px;' +
                                        'text-align:center;' +
                                        'filter:drop-shadow(' +
                                        '0 1px 2px ' +
                                        'rgba(0,0,0,0.7)' +
                                        ');' +
                                        '">' +
                                        warnSymbol +
                                        '</div>',

                                    iconSize:
                                        [36, 36],

                                    iconAnchor:
                                        [18, 18]
                                });

                            L.marker(
                                mittelpunkt,
                                {

                                    icon:
                                        symbolIcon,

                                    interactive:
                                        false,

                                    keyboard:
                                        false
                                }
                            ).addTo(
                                karte
                            );
                        }

                        // ----------------------------------
                        // KLICK AUF LANDKREIS
                        // ----------------------------------

                        layer.on(
                            "click",
                            () => {

                                const mittelpunkt =
                                    layer
                                        .getBounds()
                                        .getCenter();

                                if (
                                    typeof
                                    window.ladeWetter ===
                                    "function"
                                ) {

                                    window.ladeWetter(
                                        mittelpunkt.lat,
                                        mittelpunkt.lng,
                                        landkreis
                                    );

                                } else {

                                    fetch(
                                        `/api/wetter?lat=${mittelpunkt.lat}&lon=${mittelpunkt.lng}&landkreis=${encodeURIComponent(landkreis)}`
                                    )

                                        .then(
                                            r => r.json()
                                        )

                                        .then(
                                            wetter => {

                                                const ort =
                                                    document.getElementById(
                                                        "ort"
                                                    );

                                                if (ort) {

                                                    ort.textContent =
                                                        wetter.ort;
                                                }

                                                const temperatur =
                                                    document.getElementById(
                                                        "temperatur"
                                                    );

                                                if (
                                                    temperatur
                                                ) {

                                                    temperatur.textContent =
                                                        wetter.temperatur +
                                                        " °C";
                                                }

                                                const wettertext =
                                                    document.getElementById(
                                                        "wettertext"
                                                    );

                                                if (
                                                    wettertext
                                                ) {

                                                    wettertext.textContent =
                                                        wetter.wettertext;
                                                }

                                                const wind =
                                                    document.getElementById(
                                                        "wind"
                                                    );

                                                if (wind) {

                                                    wind.textContent =
                                                        wetter.wind +
                                                        " km/h";
                                                }

                                                const boeen =
                                                    document.getElementById(
                                                        "boeen"
                                                    );

                                                if (boeen) {

                                                    boeen.textContent =
                                                        wetter.boeen +
                                                        " km/h";
                                                }

                                                const regen =
                                                    document.getElementById(
                                                        "regen"
                                                    );

                                                if (regen) {

                                                    regen.textContent =
                                                        wetter.regen +
                                                        " mm";
                                                }

                                                const luftdruck =
                                                    document.getElementById(
                                                        "luftdruck"
                                                    );

                                                if (
                                                    luftdruck
                                                ) {

                                                    luftdruck.textContent =
                                                        wetter.luftdruck +
                                                        " hPa";
                                                }

                                                const luftfeuchte =
                                                    document.getElementById(
                                                        "luftfeuchte"
                                                    );

                                                if (
                                                    luftfeuchte
                                                ) {

                                                    luftfeuchte.textContent =
                                                        wetter.luftfeuchte +
                                                        " %";
                                                }

                                                const gefuehlt =
                                                    document.getElementById(
                                                        "gefuehlt"
                                                    );

                                                if (
                                                    gefuehlt
                                                ) {

                                                    gefuehlt.textContent =
                                                        wetter.gefuehlt +
                                                        " °C";
                                                }
                                            }
                                        )

                                        .catch(
                                            error =>
                                                console.error(
                                                    "Wetter konnte nicht geladen werden:",
                                                    error
                                                )
                                        );
                                }

                                // --------------------------
                                // POPUP
                                // --------------------------

                                let html =
                                    "<h2 style='margin:0;color:#1565C0'>" +
                                    landkreis +
                                    "</h2>" +
                                    "<hr style='margin:8px 0'>";

                                if (
                                    daten.length === 0
                                ) {

                                    html +=
                                        "✅ Keine Warnungen";

                                } else {

                                    daten.forEach(
                                        w => {

                                            let warnstufe =
                                                "<span style='color:#FFD600;font-weight:bold'>🟡 Gelb</span>";

                                            if (
                                                String(
                                                    w.event || ""
                                                )
                                                    .toUpperCase()
                                                    .startsWith(
                                                        "VORABINFORMATION"
                                                    )
                                            ) {

                                                warnstufe =
                                                    "<span style='color:#FF9800;font-weight:bold'>🟠 Vorabinformation</span>";

                                            } else if (
                                                Number(
                                                    w.type
                                                ) === 8
                                            ) {

                                                warnstufe =
                                                    "<span style='color:#C8A2FF;font-weight:bold'>🟣 Hitzewarnung</span>";

                                            } else if (
                                                Number(
                                                    w.level
                                                ) === 3
                                            ) {

                                                warnstufe =
                                                    "<span style='color:#FF9800;font-weight:bold'>🟠 Orange</span>";

                                            } else if (
                                                Number(
                                                    w.level
                                                ) === 4
                                            ) {

                                                warnstufe =
                                                    "<span style='color:#E53935;font-weight:bold'>🔴 Rot</span>";

                                            } else if (
                                                Number(
                                                    w.level
                                                ) >= 5
                                            ) {

                                                warnstufe =
                                                    "<span style='color:#8E24AA;font-weight:bold'>🟣 Violett</span>";
                                            }

                                            let gueltigBis =
                                                "";

                                            if (w.end) {

                                                gueltigBis =
                                                    "<b>🕒 Gültig bis:</b> " +
                                                    new Date(
                                                        w.end
                                                    )
                                                        .toLocaleString(
                                                            "de-DE",
                                                            {
                                                                day:
                                                                    "2-digit",

                                                                month:
                                                                    "2-digit",

                                                                year:
                                                                    "numeric",

                                                                hour:
                                                                    "2-digit",

                                                                minute:
                                                                    "2-digit"
                                                            }
                                                        );
                                            }

                                            html +=
                                                "<div style='margin-bottom:12px'>" +
                                                "<span style='font-size:22px'>⚠️</span> " +
                                                "<b style='color:#d32f2f'>" +
                                                (
                                                    w.event ||
                                                    "DWD-Warnung"
                                                ) +
                                                "</b><br>" +
                                                "<span style='font-size:14px'>" +
                                                (
                                                    w.headline ||
                                                    ""
                                                ) +
                                                "</span><br>" +
                                                "<small>" +
                                                warnstufe +
                                                "<br>" +
                                                gueltigBis +
                                                "</small>" +
                                                "</div>";
                                        }
                                    );
                                }

                                layer
                                    .bindPopup(
                                        html
                                    )
                                    .openPopup();
                            }
                        );
                    }
                }
            ).addTo(karte);

            window.warnkarte =
                warnLayer;

            console.log(
                "WARNKARTE FERTIG:",
                warnLayer
            );

            setTimeout(
                () => {
                    karte.invalidateSize();
                },
                300
            );
        })

        .catch(
            error => {

                console.error(
                    "Warnkarte konnte nicht geladen werden:",
                    error
                );
            }
        );
});