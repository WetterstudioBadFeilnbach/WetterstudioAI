/* Wetterstudio Bad Feilnbach AI – Deutschlandkarte PNG-Export */
(() => {
    "use strict";

    const QUELLE = "© Wetterstudio Bad Feilnbach AI – Markus Michels";
    const DATEN = "Warndaten: Deutscher Wetterdienst (DWD)";
    const WEB = "wetterstudioai.onrender.com";

    const projektion = (lat, lng) => {
        const p = L.CRS.EPSG3857.project(L.latLng(lat, lng));
        return [p.x, -p.y];
    };

    function geometrieZeichnen(ctx, geometrie, transform) {
        if (!geometrie) return;

        const polygone =
            geometrie.type === "Polygon"
                ? [geometrie.coordinates]
                : geometrie.type === "MultiPolygon"
                    ? geometrie.coordinates
                    : [];

        for (const polygon of polygone) {
            ctx.beginPath();

            for (const ring of polygon) {
                ring.forEach((punkt, i) => {
                    const [x, y] = projektion(punkt[1], punkt[0]);
                    const px = transform.x(x);
                    const py = transform.y(y);

                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });

                ctx.closePath();
            }

            ctx.fill("evenodd");
            ctx.stroke();
        }
    }

    function alleWarnflaechen() {
        const warnkarte = window.warnkarte;
        if (!warnkarte) return [];

        const flaechen = [];
        warnkarte.eachLayer(layer => {
            if (layer.feature?.geometry) flaechen.push(layer);
        });

        return flaechen;
    }

    function alleWarnsymbole() {
        const map = window.wetterstudioMap;
        if (!map) return [];

        const symbole = [];

        map.eachLayer(layer => {
            if (!(layer instanceof L.Marker)) return;

            const icon = layer.options.icon?.options;
            if (icon?.className !== "warnsymbol-marker") return;

            const element = document.createElement("div");
            element.innerHTML = icon.html || "";

            const symbol = element.textContent.trim();
            if (symbol) {
                symbole.push({
                    latlng: layer.getLatLng(),
                    symbol
                });
            }
        });

        return symbole;
    }

    async function exportieren(transparent) {
        const button = document.getElementById(
            "deutschland-download-" +
            (transparent ? "transparent" : "normal")
        );

        const alterText = button?.textContent;

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "⏳ PNG wird erstellt ...";
            }

            const flaechen = alleWarnflaechen();

            if (!flaechen.length) {
                throw new Error(
                    "Die DWD-Warnflächen sind noch nicht geladen. Bitte kurz warten."
                );
            }

            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            for (const layer of flaechen) {
                const bounds = layer.getBounds();
                if (!bounds.isValid()) continue;

                const ecken = [
                    bounds.getSouthWest(),
                    bounds.getNorthEast()
                ];

                for (const ecke of ecken) {
                    const [x, y] = projektion(ecke.lat, ecke.lng);
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }

            if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) {
                throw new Error("Deutschlandgrenzen konnten nicht bestimmt werden.");
            }

            const breite = 1800;
            const rand = 65;
            const fussHoehe = 115;
            const faktor = (breite - 2 * rand) / (maxX - minX);
            const kartenHoehe = Math.ceil((maxY - minY) * faktor);
            const hoehe = kartenHoehe + 2 * rand + fussHoehe;

            const canvas = document.createElement("canvas");
            canvas.width = breite;
            canvas.height = hoehe;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas konnte nicht erstellt werden.");

            if (!transparent) {
                ctx.fillStyle = "#d7e3ec";
                ctx.fillRect(0, 0, breite, hoehe);
            }

            const t = {
                x: x => rand + (x - minX) * faktor,
                y: y => rand + (y - minY) * faktor
            };

            // Deutschland erhält eine geschlossene Grundfläche.
            // Dadurch bleiben die Warnfarben auch im transparenten PNG kräftig.
            for (const layer of flaechen) {
                ctx.fillStyle = "#eef3e8";
                ctx.strokeStyle = "transparent";
                ctx.lineWidth = 0;
                geometrieZeichnen(ctx, layer.feature.geometry, t);
            }

            // Originalfarben und Transparenzen der vorhandenen DWD-Ebene.
            for (const layer of flaechen) {
                const optionen = layer.options || {};
                const schraffiert = String(optionen.fillColor || "")
                    .includes("vorabSchraffur");

                ctx.save();

                ctx.globalAlpha = Number.isFinite(optionen.fillOpacity)
                    ? optionen.fillOpacity
                    : 0.55;

                ctx.fillStyle = schraffiert
                    ? "#ff9800"
                    : (optionen.fillColor || "#8bc34a");

                ctx.strokeStyle = "transparent";
                ctx.lineWidth = 0;
                geometrieZeichnen(ctx, layer.feature.geometry, t);

                ctx.restore();

                if (schraffiert) {
                    ctx.save();
                    ctx.strokeStyle = "rgba(255,152,0,0.7)";
                    ctx.lineWidth = 5;

                    // Schraffur ausschließlich innerhalb des Landkreises.
                    const geometrie = layer.feature.geometry;
                    const polygone = geometrie.type === "Polygon"
                        ? [geometrie.coordinates]
                        : geometrie.type === "MultiPolygon"
                            ? geometrie.coordinates
                            : [];

                    for (const polygon of polygone) {
                        ctx.save();
                        ctx.beginPath();

                        for (const ring of polygon) {
                            ring.forEach((punkt, i) => {
                                const [x, y] = projektion(punkt[1], punkt[0]);
                                if (i === 0) ctx.moveTo(t.x(x), t.y(y));
                                else ctx.lineTo(t.x(x), t.y(y));
                            });
                            ctx.closePath();
                        }

                        ctx.clip("evenodd");

                        const b = layer.getBounds();
                        const sw = projektion(b.getSouth(), b.getWest());
                        const ne = projektion(b.getNorth(), b.getEast());
                        const links = Math.min(t.x(sw[0]), t.x(ne[0]));
                        const rechts = Math.max(t.x(sw[0]), t.x(ne[0]));
                        const oben = Math.min(t.y(sw[1]), t.y(ne[1]));
                        const unten = Math.max(t.y(sw[1]), t.y(ne[1]));

                        for (let x = links - (unten - oben); x < rechts + (unten - oben); x += 15) {
                            ctx.beginPath();
                            ctx.moveTo(x, unten);
                            ctx.lineTo(x + (unten - oben), oben);
                            ctx.stroke();
                        }

                        ctx.restore();
                    }

                    ctx.restore();
                }
            }

            // Feine Landkreisgrenzen.
            ctx.save();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 0.8;
            ctx.fillStyle = "rgba(0,0,0,0)";
            for (const layer of flaechen) {
                geometrieZeichnen(ctx, layer.feature.geometry, t);
            }
            ctx.restore();

            // Warnsymbole aus der bestehenden Leaflet-Karte.
            const symbole = alleWarnsymbole();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';

            for (const eintrag of symbole) {
                const [x, y] = projektion(
                    eintrag.latlng.lat,
                    eintrag.latlng.lng
                );
                ctx.fillText(eintrag.symbol, t.x(x), t.y(y));
            }

            // Städtenamen ausschließlich im PNG-Export.
            const staedte = window.deutschlandExportStaedte || [];

            ctx.save();
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.font = "bold 25px Arial, sans-serif";
            ctx.lineJoin = "round";

            for (const [name, lat, lng] of staedte) {
                const [x, y] = projektion(lat, lng);
                const px = t.x(x);
                const py = t.y(y);

                // Nur Beschriftung verschieben, Stadtpunkt bleibt unverändert.
                const ortsVersatz = {
                    "Frankfurt": [12, -30],
                    "Wiesbaden": [-145, -18],
                    "Mainz": [-90, 28],
                    "Berlin": [15, -28],
                    "Potsdam": [-115, 25]
                };

                const [dx, dy] = ortsVersatz[name] || [9, -9];

                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#172638";
                ctx.fill();

                ctx.lineWidth = 5;
                ctx.strokeStyle = "rgba(255,255,255,0.95)";
                ctx.strokeText(name, px + dx, py + dy);

                ctx.fillStyle = "#172638";
                ctx.fillText(name, px + dx, py + dy);
            }

            ctx.restore();
            // Quellenangaben nur im normalen PNG.
            if (!transparent) {
            const unten = hoehe - fussHoehe;
            if (!transparent) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, unten, breite, fussHoehe);
            }

            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = transparent ? "#172638" : "#16334a";
            ctx.font = "bold 23px Arial, sans-serif";
            ctx.fillText(QUELLE, breite / 2, unten + 35);
            ctx.font = "20px Arial, sans-serif";
            ctx.fillText(DATEN, breite / 2, unten + 66);
            ctx.font = "18px Arial, sans-serif";
            ctx.fillText(
                WEB + " | Bei Weiterveröffentlichung bitte Quelle angeben",
                breite / 2,
                unten + 94
            );

            }

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    datei => datei ? resolve(datei) : reject(
                        new Error("PNG konnte nicht erzeugt werden.")
                    ),
                    "image/png"
                );
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = transparent
                ? "Deutschlandkarte_Wetterstudio_TRANSPARENT.png"
                : "Deutschlandkarte_Wetterstudio.png";

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 10000);

        } catch (fehler) {
            console.error("Deutschland-PNG-Export:", fehler);
            alert("PNG-Export: " + fehler.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = alterText;
            }
        }
    }

    function buttonsAktivieren() {
        for (const typ of ["normal", "transparent"]) {
            const button = document.getElementById(
                "deutschland-download-" + typ
            );

            if (!button) continue;

            button.disabled = false;
            button.title = "Deutschlandkarte als PNG herunterladen";
            button.style.opacity = "1";
            button.style.cursor = "pointer";

            button.addEventListener("click", () => {
                exportieren(typ === "transparent");
            });
        }
    }

    document.addEventListener("DOMContentLoaded", buttonsAktivieren);

    window.deutschlandExport = {
        version: "2.0",
        karteBereit: () => Boolean(
            window.wetterstudioMap && window.warnkarte
        ),
        exportieren
    };

    console.log("Deutschland-PNG-Export geladen.");
})();

