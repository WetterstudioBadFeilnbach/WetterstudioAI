        const landkreisIndex = [];

        console.log("Warnungen geladen");
        console.log("Landkreise geladen");


        // --------------------------------------------------
        // Hilfsfunktion:
        // Namen für den Vergleich vereinheitlichen
        // --------------------------------------------------

        function normalisiereLandkreis(name) {

            if (!name) return "";

            return name
                .trim()
                .toLowerCase()

                // DWD-Bezeichnungen vereinheitlichen
                .replace(/^kreis\s+/i, "")
                .replace(/^landkreis\s+/i, "")
                .replace(/^stadt\s+/i, "")
                .replace(/^kreisfreie\s+stadt\s+/i, "")

                // Leerzeichen vereinheitlichen
                .replace(/\s+/g, " ")

                // bekannte Sonderzeichen vereinheitlichen
                .replace(/ä/g, "ae")
                .replace(/ö/g, "oe")
                .replace(/ü/g, "ue")
                .replace(/ß/g, "ss")

                .trim();
        }


        // --------------------------------------------------
        // passende Warnung für einen Landkreis suchen
        // --------------------------------------------------

        function findeWarnung(landkreis) {

            const regionName =
                normalisiereLandkreis(landkreis);

            const alleWarnungen =
                Object.values(warnungen).flat();

            return alleWarnungen.find(w => {

                if (!w.regionName) {
                    return false;
                }

                const warnungsName =
                    normalisiereLandkreis(
                        w.regionName
                    );

                return warnungsName === regionName;

            });

        }


        // --------------------------------------------------
        // Warnsymbole
        // --------------------------------------------------

        const warnsymbolLayer = L.layerGroup();


        // --------------------------------------------------
        // Landkreis-Karte
        // --------------------------------------------------

        const geojsonLayer = L.geoJSON(geojson, {

            style: function(feature) {

                const landkreis =
                    feature.properties.NAME_3 ||
                    feature.properties.NAME ||
                    "Unbekannt";

                const warnung =
                    findeWarnung(landkreis);

                let farbe = "#3ec5ff";

                if (warnung) {

                    switch (warnung.level) {

                        case 2:
                            farbe = "#ffd400";
                            break;

                        case 3:
                            farbe = "#ff9900";
                            break;

                        case 4:
                            farbe = "#ff0000";
                            break;

                        case 5:
                            farbe = "#b300ff";
                            break;

                    }

                }

                return {
                    color: farbe,
                    weight: 1,
                    fillColor: farbe,
                    fillOpacity: 0.08
                };

            },


            onEachFeature: function(feature, layer) {

                const landkreis =
                    feature.properties.NAME_3 ||
                    feature.properties.NAME ||
                    "Unbekannt";

                const warnung =
                    findeWarnung(landkreis);


                // --------------------------------------------------
                // Debug-Ausgabe für Warnungen
                // --------------------------------------------------

                if (warnung) {

                    console.log(
                        "Warnung zugeordnet:",
                        landkreis,
                        "<-",
                        warnung.regionName,
                        warnung.symbol
                    );

                }


                // --------------------------------------------------
                // Warnsymbol auf der Karte
                // --------------------------------------------------

                if (warnung && warnung.symbol) {

                    const mitte =
                        layer.getBounds().getCenter();

                    const symbolIcon = L.divIcon({

                        className: "warnsymbol-marker",

                        html: `
                            <div style="
                                font-size: 28px;
                                line-height: 32px;
                                width: 36px;
                                height: 36px;
                                text-align: center;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                filter: drop-shadow(
                                    0 1px 2px rgba(0,0,0,0.7)
                                );
                            ">
                                ${warnung.symbol}
                            </div>
                        `,

                        iconSize: [36, 36],

                        iconAnchor: [18, 18]

                    });


                    const marker = L.marker(
                        mitte,
                        {
                            icon: symbolIcon,
                            interactive: true,
                            zIndexOffset: 1000
                        }
                    );


                    marker.bindTooltip(
                        `${warnung.symbol} ${warnung.event}`,
                        {
                            direction: "top",
                            offset: [0, -18]
                        }
                    );


                    marker.addTo(warnsymbolLayer);

                }


                // --------------------------------------------------
                // Landkreis-Tooltip
                // --------------------------------------------------

                layer.bindTooltip(
                    landkreis,
                    {
                        sticky: false,
                        permanent: false
                    }
                );

            }

        });