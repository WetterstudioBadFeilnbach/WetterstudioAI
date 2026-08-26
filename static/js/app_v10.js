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
            document.getElementById("temperatur").textContent = wetter.temperatur + " °C";
            document.getElementById("wettertext").textContent = wetter.wettertext;

            let icon = "❔";

            switch (wetter.weather_code) {
                case 0: icon = "☀️"; break;
                case 1:
                case 2: icon = "🌤️"; break;
                case 3: icon = "☁️"; break;
                case 45:
                case 48: icon = "🌫️"; break;
                case 51:
                case 53:
                case 55:
                case 56:
                case 57: icon = "🌦️"; break;
                case 61:
                case 63:
                case 65:
                case 66:
                case 67: icon = "🌧️"; break;
                case 71:
                case 73:
                case 75:
                case 77: icon = "❄️"; break;
                case 80:
                case 81:
                case 82: icon = "🌦️"; break;
                case 95:
                case 96:
                case 99: icon = "⛈️"; break;
            }

            document.getElementById("wettericon").textContent = icon;
            document.getElementById("wind").textContent = wetter.wind + " km/h";
            document.getElementById("boeen").textContent = wetter.boeen + " km/h";
            document.getElementById("regen").textContent = wetter.regen + " mm";
            document.getElementById("luftdruck").textContent = wetter.luftdruck + " hPa";
            document.getElementById("luftfeuchte").textContent = wetter.luftfeuchte + " %";
            document.getElementById("gefuehlt").textContent = wetter.gefuehlt + " °C";

            console.log("Wetter aus Browser-Cache:", landkreis);
            return;
        }

        console.log("ladeWetter:", landkreis);

        fetch(`/api/wetter?lat=${lat}&lon=${lon}&landkreis=${encodeURIComponent(landkreis)}`)
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

                document.getElementById("wettericon").textContent = icon;
                document.getElementById("wind").textContent = wetter.wind + " km/h";
                document.getElementById("boeen").textContent = wetter.boeen + " km/h";
                document.getElementById("regen").textContent = wetter.regen + " mm";
                document.getElementById("luftdruck").textContent = wetter.luftdruck + " hPa";
                document.getElementById("luftfeuchte").textContent = wetter.luftfeuchte + " %";
                document.getElementById("gefuehlt").textContent = wetter.gefuehlt + " °C";

            })
            .catch(error => console.error(error));

    }


    // --------------------------------------------------
    // Radar laden
    // --------------------------------------------------

    function ladeRadar() {

        const radar = document.getElementById("radarbild");

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

        console.log(
            "DWD-Warnungen:",
            JSON.stringify(warnungen, null, 2)
        );

        const landkreisIndex = [];

        console.log("Warnungen geladen");
        console.log("Landkreise geladen");


        // --------------------------------------------------
        // Hilfsfunktion:
        // passende Warnung für einen Landkreis suchen
        // --------------------------------------------------

        function findeWarnung(landkreis) {

            function normalisiereName(name) {
                return (name || "")
                    .trim()
                    .toLowerCase()
                    .replace(/^(kreis|landkreis|stadt|kreisfreie stadt)\s+/i, "")
                    .replace(/\s+/g, " ")
                    .trim();
            }

            const regionName = normalisiereName(landkreis);

            return Object.values(warnungen)
                .flat()
                .find(
                    w =>
                        w.regionName &&
                        normalisiereName(w.regionName) === regionName
                );
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

                const warnung = findeWarnung(landkreis);

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


            onEachFeature: function(feature, layer) {

                const landkreis =
                    feature.properties.NAME_3 ||
                    feature.properties.NAME ||
                    "Unbekannt";

                const warnung = findeWarnung(landkreis);


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
                                line-height: 28px;
                                text-align: center;
                                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
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

                    .addTo(warnsymbolLayer);

                }


                // --------------------------------------------------
                // Landkreis-Tooltip
                // --------------------------------------------------

                layer.bindTooltip(landkreis, {
                    sticky: false,
                    permanent: false
                });


                // --------------------------------------------------
                // Mouseover
                // --------------------------------------------------

                layer.on("mouseover", function () {

                    this.setStyle({
                        weight: 4,
                        color: "#ffffff",
                        fillColor: "#ffffff",
                        fillOpacity: 0.35
                    });

                });


                // --------------------------------------------------
                // Mouseout
                // --------------------------------------------------

                layer.on("mouseout", function () {

                    geojsonLayer.resetStyle(this);

                });


                // --------------------------------------------------
                // Klick auf Landkreis
                // --------------------------------------------------

                layer.on("click", function () {

                    const mitte =
                        layer.getBounds().getCenter();

                    ladeWetter(
                        mitte.lat,
                        mitte.lng,
                        landkreis
                    );

                    map.fitBounds(
                        layer.getBounds(),
                        {
                            padding: [20, 20]
                        }
                    );

                    layer.openTooltip();

                });


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

        console.log("Deutschlandkarte eingebunden");
        console.log("Warnsymbole eingebunden");


        // Karte global merken

        window.geojsonLayer = geojsonLayer;
        window.warnungen = warnungen;
        window.warnsymbolLayer = warnsymbolLayer;


        // --------------------------------------------------
        // Live-Suche
        // --------------------------------------------------

        if (suche) {

            suche.addEventListener("input", function () {

                const text =
                    this.value.trim().toLowerCase();

                suchErgebnisse.innerHTML = "";

                suchErgebnisse.style.maxHeight =
                    "320px";

                suchErgebnisse.style.overflowY =
                    "auto";

                suchErgebnisse.style.display =
                    "block";


                const treffer =
                    landkreisIndex.filter(
                        eintrag =>
                            eintrag.name
                                .toLowerCase()
                                .includes(text)
                    );


                if (text.length < 2) return;


                if (treffer.length === 0) {

                    suchErgebnisse.innerHTML =
                        "<div style='padding:8px;color:#888;'>Kein Landkreis gefunden</div>";

                    return;

                }


                if (
                    treffer.length === 1 &&
                    text === treffer[0].name.toLowerCase()
                ) {

                    treffer[0].layer.fire("click");

                    return;

                }


                treffer
                    .slice(0, 10)
                    .forEach(eintrag => {

                        const div =
                            document.createElement("div");

                        div.textContent =
                            eintrag.name;

                        div.style.cursor =
                            "pointer";

                        div.style.padding =
                            "8px 10px";

                        div.style.borderBottom =
                            "1px solid #ddd";


                        div.addEventListener(
                            "mouseenter",
                            () => {

                                div.style.background =
                                    "#eaf4ff";

                            }
                        );


                        div.addEventListener(
                            "mouseleave",
                            () => {

                                div.style.background =
                                    "";

                            }
                        );


                        suchErgebnisse.appendChild(div);


                        div.addEventListener(
                            "click",
                            () => {

                                suche.value =
                                    eintrag.name;

                                suchErgebnisse.innerHTML =
                                    "";


                                const mitte =
                                    eintrag.layer
                                        .getBounds()
                                        .getCenter();


                                ladeWetter(
                                    mitte.lat,
                                    mitte.lng,
                                    eintrag.name
                                );


                                window.geojsonLayer.eachLayer(l => {

                                    window.geojsonLayer
                                        .resetStyle(l);

                                });


                                eintrag.layer.setStyle({

                                    weight: 4,

                                    color: "#ff9800",

                                    fillColor: "#ff9800",

                                    fillOpacity: 0.30

                                });


                                map.fitBounds(
                                    eintrag.layer.getBounds(),
                                    {
                                        padding: [20, 20]
                                    }
                                );


                                eintrag.layer.openTooltip();

                                suche.blur();

                                suchErgebnisse.innerHTML =
                                    "";

                            }
                        );

                    });

            });

        }

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

    setInterval(ladeRadar, 120000);

});


