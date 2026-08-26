document.addEventListener("DOMContentLoaded", async () => {

    // --------------------------------------------------
    // KARTE
    // --------------------------------------------------

    const karte = L.map("karte", {
        zoomControl: true,
        attributionControl: false
    }).setView([51.0, 10.3], 5);

    document.getElementById("karte").style.background = "#d7e3ec";


    // --------------------------------------------------
    // DWD-WARNUNGEN LADEN
    // --------------------------------------------------

    const antwort = await fetch("/api/dwd-warnungen");
    const warnungen = await antwort.json();

    const mappingAntwort = await fetch("/static/mapping.json");
    const mapping = await mappingAntwort.json();


    // --------------------------------------------------
    // SONDERGEBIETE
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
    // NAMEN EINHEITLICH NORMALISIEREN
    // --------------------------------------------------

    const normalisiereName = n =>
        String(n || "")
            .replace(/^(Landkreis|Kreis|Stadt|LK)\s+/i, "")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();


    // --------------------------------------------------
    // PRÜFEN, OB DWD-WARNUNG ZUM LANDKREIS GEHÖRT
    // --------------------------------------------------

    const gehoertZurWarnung = (regionName, landkreisName) => {

        const region = normalisiereName(regionName);
        const landkreis = normalisiereName(landkreisName);

        // Direkter Treffer
        if (region === landkreis) {
            return true;
        }

        // Mapping direkt prüfen
        const mapped =
            mapping[regionName] ??
            mapping["Landkreis " + regionName] ??
            null;

        if (
            mapped &&
            normalisiereName(mapped) === landkreis
        ) {
            return true;
        }

        // Mapping auch mit normalisierten Namen durchsuchen
        const mappingTreffer = Object.entries(mapping).some(
            ([dwdRegion, geoName]) => {

                return (
                    normalisiereName(dwdRegion) === region &&
                    normalisiereName(geoName) === landkreis
                );
            }
        );

        if (mappingTreffer) {
            return true;
        }

        // Sondergebiete ebenfalls normalisiert prüfen
        const sonderGebiet = Object.entries(sonderGebiete).find(
            ([gebietName]) =>
                normalisiereName(gebietName) === region
        );

        if (sonderGebiet) {

            return sonderGebiet[1].some(
                gebietLandkreis =>
                    normalisiereName(gebietLandkreis) === landkreis
            );
        }

        return false;
    };


    // --------------------------------------------------
    // ALLE WARNUNGEN ZUSAMMENFÜHREN
    // --------------------------------------------------

    const alleWarnungen = [
        ...Object.values(warnungen.warnings || {}).flat(),
        ...Object.values(warnungen.vorabInformation || {}).flat()
    ];

    console.log(
        "DWD-WARNUNGEN GELADEN:",
        alleWarnungen
    );


    // --------------------------------------------------
    // WARNUNGEN FÜR EINEN LANDKREIS
    // --------------------------------------------------

    const warnungenFuerLandkreis = landkreisName => {

        const treffer = alleWarnungen.filter(w =>
            gehoertZurWarnung(
                w.regionName,
                landkreisName
            )
        );

        return treffer;
    };


    // --------------------------------------------------
    // GEOJSON LADEN UND KARTE ERSTELLEN
    // --------------------------------------------------

    fetch("/static/geojson/landkreise_neu.geojson")

        .then(r => {

            if (!r.ok) {
                throw new Error(
                    "GeoJSON konnte nicht geladen werden: " +
                    r.status
                );
            }

            return r.json();
        })

        .then(data => {

            const deutschlandGrenzen =
                L.geoJSON(data).getBounds();

            karte.fitBounds(
                deutschlandGrenzen,
                {
                    padding: [15, 15]
                }
            );


            // --------------------------------------------------
            // LANDKREISE ZEICHNEN
            // --------------------------------------------------

            const warnLayer = L.geoJSON(data, {

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


                    // --------------------------------------------------
                    // WARNUNGSTYPEN
                    // --------------------------------------------------

                    const hatVorab = daten.some(w =>
                        String(w.event || "")
                            .toUpperCase()
                            .startsWith(
                                "VORABINFORMATION"
                            )
                    );

                    const hatHitze = daten.some(w =>
                        Number(w.type) === 8
                    );


                    let maxLevel = 0;

                    daten.forEach(w => {

                        if (
                            Number(w.type) !== 8
                        ) {

                            maxLevel = Math.max(
                                maxLevel,
                                Number(w.level) || 0
                            );
                        }
                    );


                    // --------------------------------------------------
                    // STANDARD: KEINE WARNUNG
                    // --------------------------------------------------

                    let fillColor = "#b7d99a";
                    let fillOpacity = 0.95;


                    // --------------------------------------------------
                    // DWD-WARNFARBEN
                    // --------------------------------------------------

                    if (hatVorab) {

                        fillColor = "#ff9800";

                    } else if (hatHitze) {

                        fillColor = "#c8a2ff";

                    } else if (maxLevel === 2) {

                        fillColor = "#ffd600";

                    } else if (maxLevel === 3) {

                        fillColor = "#ff9800";

                    } else if (maxLevel === 4) {

                        fillColor = "#e53935";

                    } else if (maxLevel >= 5) {

                        fillColor = "#8e24aa";
                    }


                    return {
                        color: "#ffffff",
                        weight: 0.45,
                        fillColor: fillColor,
                        fillOpacity: fillOpacity
                    };
                },


                // --------------------------------------------------
                // INTERAKTION PRO LANDKREIS
                // --------------------------------------------------

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


                    // Tooltip

                    layer.bindTooltip(
                        landkreis,
                        {
                            sticky: false
                        }
                    );


                    // --------------------------------------------------
                    // KLICK
                    // --------------------------------------------------

                    layer.on(
                        "click",
                        () => {

                            const mittelpunkt =
                                layer
                                    .getBounds()
                                    .getCenter();


                            // Wetterdaten laden

                            if (
                                typeof window.ladeWetter ===
                                "function"
                            ) {

                                window.ladeWetter(
                                    mittelpunkt.lat,
                                    mittelpunkt.lng,
                                    landkreis
                                );
                            }


                            // --------------------------------------------------
                            // POPUP
                            // --------------------------------------------------

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

                                daten.forEach(w => {

                                    let warnstufe =
                                        "🟡 Gelb";


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
                                            "🟠 Vorabinformation";

                                    } else if (
                                        Number(w.type) === 8
                                    ) {

                                        warnstufe =
                                            "🟣 Hitzewarnung";

                                    } else if (
                                        Number(w.level) === 3
                                    ) {

                                        warnstufe =
                                            "🟠 Orange";

                                    } else if (
                                        Number(w.level) === 4
                                    ) {

                                        warnstufe =
                                            "🔴 Rot";

                                    } else if (
                                        Number(w.level) >= 5
                                    ) {

                                        warnstufe =
                                            "🟣 Violett";
                                    }


                                    html +=
                                        "<div style='margin-bottom:12px'>" +

                                        "<b>" +
                                        (
                                            w.event ||
                                            "DWD-Warnung"
                                        ) +
                                        "</b><br>" +

                                        (
                                            w.headline || ""
                                        ) +

                                        "<br><small>" +
                                        warnstufe +
                                        "</small>" +

                                        "</div>";
                                });
                            }


                            layer
                                .bindPopup(html)
                                .openPopup();
                        }
                    );
                }

            }).addTo(karte);


            // --------------------------------------------------
            // GLOBAL SPEICHERN
            // --------------------------------------------------

            window.warnkarte =
                warnLayer;


            console.log(
                "WARNKARTE FERTIG:",
                warnLayer
            );


            // Leaflet-Größe nach Laden korrigieren

            setTimeout(() => {

                karte.invalidateSize();

            }, 300);
        })


        .catch(error => {

            console.error(
                "WARNKARTE KONNTE NICHT GELADEN WERDEN:",
                error
            );
        });

});