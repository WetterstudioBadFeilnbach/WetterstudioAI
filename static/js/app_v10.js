document.addEventListener("DOMContentLoaded", () => {

    console.log("Wetterstudio Bad Feilnbach AI gestartet");

    const karte = document.getElementById("karte");
    const suche = document.getElementById("landkreisSuche");
    const suchErgebnisse = document.getElementById("suchErgebnisse");

    let ausgewaehlt = -1;

    if (!karte) return;

    const map = L.map("karte").setView([51.2, 10.4], 6);
    window.wetterstudioMap = map;

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap"
        }
    ).addTo(map);


    // --------------------------------------------------
    // Wetter laden
    // --------------------------------------------------

    const wetterCache = {};

    window.ladeWetter = function ladeWetter(lat, lon, landkreis) {

        const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
        const jetzt = Date.now();

        if (
            wetterCache[cacheKey] &&
            jetzt - wetterCache[cacheKey].zeit < 1800000
        ) {

            const wetter = wetterCache[cacheKey].daten;

            document.getElementById("ort").textContent = wetter.ort;

            document.getElementById("temperatur").textContent =
                wetter.temperatur + " °C";

            document.getElementById("wettertext").textContent =
                wetter.wettertext;

            let icon = "❔";

            switch (wetter.wettercode) {

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

            document.getElementById("wettericon").textContent = icon;

            document.getElementById("wind").textContent =
                wetter.wind + " km/h";

            document.getElementById("boeen").textContent =
                wetter.boeen + " km/h";

            document.getElementById("regen").textContent =
                wetter.niederschlag + " mm";

            document.getElementById("luftdruck").textContent =
                wetter.luftdruck != null
                    ? wetter.luftdruck + " hPa"
                    : "—";

            document.getElementById("luftfeuchte").textContent =
                wetter.luftfeuchtigkeit + " %";

            document.getElementById("gefuehlt").textContent =
                wetter.gefuehlt + " °C";

            console.log("Wetter aus Browser-Cache:", landkreis);

            return;

        }


        fetch(
            `/api/wetter?lat=${lat}&lon=${lon}&landkreis=${encodeURIComponent(landkreis)}`
        )

        .then(r => r.json())

        .then(wetter => {

            wetterCache[cacheKey] = {
                zeit: Date.now(),
                daten: wetter
            };

            document.getElementById("ort").textContent =
                wetter.ort;

            document.getElementById("temperatur").textContent =
                wetter.temperatur + " °C";

            document.getElementById("wettertext").textContent =
                wetter.wettertext;

            let icon = "❔";

            switch (wetter.wettercode) {

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

            document.getElementById("wettericon").textContent =
                icon;

            document.getElementById("wind").textContent =
                wetter.wind + " km/h";

            document.getElementById("boeen").textContent =
                wetter.boeen + " km/h";

            document.getElementById("regen").textContent =
                wetter.niederschlag + " mm";

            document.getElementById("luftdruck").textContent =
                wetter.luftdruck != null
                    ? wetter.luftdruck + " hPa"
                    : "—";

            document.getElementById("luftfeuchte").textContent =
                wetter.luftfeuchtigkeit + " %";

            document.getElementById("gefuehlt").textContent =
                wetter.gefuehlt + " °C";

        })

        .catch(error => console.error(error));

    };


    // --------------------------------------------------
    // Radar laden
    // --------------------------------------------------

    function ladeRadar() {

        const radar =
            document.getElementById("radarbild");

        if (!radar) return;

        radar.src =
            "https://www.dwd.de/DWD/wetter/radar/radfilm_brd_akt.gif?" +
            new Date().getTime();

    }


    // --------------------------------------------------
    // Deutschlandkarte
    // --------------------------------------------------

    Promise.all([

        fetch("/api/warnungen").then(r => r.json()),
        fetch("/static/geojson/landkreise.geojson").then(r => r.json())

    ])

    .then(([datenWarnungen, geojson]) => {

        const warnungen = datenWarnungen;

        const landkreisIndex = [];


        // --------------------------------------------------
        // Warnung für Landkreis suchen
        // --------------------------------------------------

        function normalisiereName(name) {

            return (name || "")
                .trim()
                .toLowerCase()
                .replace(
                    /^(kreis|landkreis|stadt|kreisfreie stadt)\s+/i,
                    ""
                )
                .replace(/\s+/g, " ")
                .trim();

        }


        function findeWarnung(landkreis) {

            const regionName =
                normalisiereName(landkreis);

            return Object.values(warnungen)
                .flat()
                .find(w =>
                    w.regionName &&
                    normalisiereName(w.regionName) === regionName
                );

        }


        function findeWarnungen(landkreis) {

            const regionName =
                normalisiereName(landkreis);

            return Object.values(warnungen)
                .flat()
                .filter(w =>
                    w.regionName &&
                    normalisiereName(w.regionName) === regionName
                );

        }


        function formatiereZeit(zeit) {

            if (!zeit) {
                return "Keine Zeitangabe";
            }

            return new Date(zeit).toLocaleString(
                "de-DE",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );

        }


        // --------------------------------------------------
        // Einheitliches Warnungs-Popup
        // --------------------------------------------------

        window.zeigeWarnungen = function zeigeWarnungen(
            warnungenFuerGebiet,
            latlng,
            gebiet
        ) {

            if (
                !warnungenFuerGebiet ||
                !warnungenFuerGebiet.length
            ) {
                return;
            }

            const inhalt =
                warnungenFuerGebiet.map(w => `

                    <div style="
                        margin-bottom: 12px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #ddd;
                    ">

                        <div style="
                            font-size: 18px;
                            font-weight: 700;
                            margin-bottom: 6px;
                        ">

                            ${w.symbol || "⚠️"}
                            ${w.headline || w.event || "Warnung"}

                        </div>

                        <div>

                            <strong>
                                ${w.event || "Keine Bezeichnung"}
                            </strong>

                        </div>

                        <div style="
                            font-size: 12px;
                            margin-top: 6px;
                        ">

                            <strong>Von:</strong>
                            ${formatiereZeit(w.start)}

                            <br>

                            <strong>Bis:</strong>
                            ${formatiereZeit(w.end)}

                        </div>

                    </div>

                `).join("");


            L.popup({
                maxWidth: 420
            })

            .setLatLng(latlng)

            .setContent(`

                <div>

                    <strong>${gebiet}</strong>

                    <div style="
                        margin-top: 10px;
                    ">

                        ${inhalt}

                    </div>

                </div>

            `)

            .openOn(map);

        }


        // --------------------------------------------------
        // Warnsymbole
        // --------------------------------------------------

        const warnsymbolLayer =
            L.layerGroup();


        // --------------------------------------------------
        // Landkreis-Karte
        // --------------------------------------------------

        const geojsonLayer =
            L.geoJSON(geojson, {

                style: function(feature) {

                    const landkreis =
                        feature.properties.NAME_3 ||
                        feature.properties.NAME ||
                        "Unbekannt";

                    const warnung =
                        findeWarnung(landkreis);

                    let farbe = "#7cbf5b";

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


                onEachFeature: function(
                    feature,
                    layer
                ) {

                    const landkreis =
                        feature.properties.NAME_3 ||
                        feature.properties.NAME ||
                        "Unbekannt";

                    const warnung =
                        findeWarnung(landkreis);


                    // --------------------------------------------------
                    // Warnsymbol
                    // --------------------------------------------------

                    if (
                        warnung &&
                        warnung.symbol
                    ) {

                        const mitte =
                            layer.getBounds().getCenter();

                        const symbolIcon =
                            L.divIcon({

                                className:
                                    "warnsymbol-marker",

                                html: `

                                    <div style="
                                        font-size: 28px;
                                        line-height: 28px;
                                        text-align: center;
                                        filter: drop-shadow(
                                            0 1px 2px rgba(0,0,0,0.5)
                                        );
                                    ">

                                        ${warnung.symbol}

                                    </div>

                                `,

                                iconSize: [32, 32],
                                iconAnchor: [16, 16]

                            });


                        L.marker(
                            mitte,
                            {
                                icon: symbolIcon,
                                interactive: true
                            }
                        )

                        .bindTooltip(
                            `${warnung.symbol} ${warnung.event}`,
                            {
                                direction: "top",
                                offset: [0, -15]
                            }
                        )

                        .on("click", function(e) {

                            let warnungenFuerGebiet =
                                findeWarnungen(landkreis);

                            if (
                                warnungenFuerGebiet.length === 0 &&
                                warnung
                            ) {

                                warnungenFuerGebiet =
                                    [warnung];

                            }

                            zeigeWarnungen(
                                warnungenFuerGebiet,
                                e.latlng,
                                landkreis
                            );

                        })

                        .addTo(warnsymbolLayer);

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


                    // --------------------------------------------------
                    // Mouseover
                    // --------------------------------------------------

                    layer.on(
                        "mouseover",
                        function() {

                            this.setStyle({
                                weight: 4,
                                color: "#ffffff",
                                fillColor: "#ffffff",
                                fillOpacity: 0.35
                            });

                        }
                    );


                    // --------------------------------------------------
                    // Mouseout
                    // --------------------------------------------------

                    layer.on(
                        "mouseout",
                        function() {

                            geojsonLayer.resetStyle(this);

                        }
                    );
                    // --------------------------------------------------
                    // Klick auf Landkreis / Warnfläche
                    // --------------------------------------------------

                    layer.on(
                        "click",
                        function(e) {

                            const mitte =
                                layer
                                    .getBounds()
                                    .getCenter();

                            // Popup direkt mit der Warnung öffnen,
                            // die diese Warnfläche erzeugt hat.
                            const popupWarnungen =
                                warnung ? [warnung] : [];

                            if (popupWarnungen.length > 0) {

                                zeigeWarnungen(
                                    popupWarnungen,
                                    e.latlng || mitte,
                                    landkreis
                                );

                            } else {

                                layer.openTooltip();

                            }

                        }
                    );


                    // --------------------------------------------------
                    // Landkreis für Suche merken
                    // --------------------------------------------------

                    landkreisIndex.push({
                        name: landkreis,
                        layer: layer
                    });

                }

            });


        // --------------------------------------------------
        // Karte hinzufügen
        // --------------------------------------------------

        geojsonLayer.addTo(map);
        warnsymbolLayer.addTo(map);

        console.log(
            "Deutschlandkarte eingebunden"
        );

        console.log(
            "Warnsymbole eingebunden"
        );

    })

    .catch(error => {

        console.error(
            "Fehler beim Laden der Deutschlandkarte:",
            error
        );

    });


    // --------------------------------------------------
    // Start
    // --------------------------------------------------

    ladeRadar();

    ladeWetter(
        47.7868,
        12.0094,
        "Bad Feilnbach"
    );

    setInterval(
        ladeRadar,
        120000
    );

});

