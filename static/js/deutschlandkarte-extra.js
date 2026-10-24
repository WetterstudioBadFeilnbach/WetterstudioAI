document.addEventListener("DOMContentLoaded", () => {
    const bereich = document.getElementById("deutschlandkarte-section");
    const karte = document.getElementById("karte");
    const suche = bereich?.querySelector(".such-container");

    if (!bereich || !karte || !suche) return;

    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.textContent = "⛶ Vollbild";
    knopf.style.cssText =
        "padding:10px 18px;margin:0 0 15px;background:#087bd3;" +
        "color:white;border:0;border-radius:8px;cursor:pointer;font-weight:bold;";

    suche.insertAdjacentElement("afterend", knopf);

    knopf.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement === bereich) {
                await document.exitFullscreen();
            } else {
                await bereich.requestFullscreen();
            }
        } catch (fehler) {
            console.error("Vollbild konnte nicht aktiviert werden:", fehler);
        }
    });

    document.addEventListener("fullscreenchange", () => {
        const aktiv = document.fullscreenElement === bereich;

        knopf.textContent = aktiv ? "⛶ Vollbild verlassen" : "⛶ Vollbild";
        bereich.classList.toggle("deutschland-vollbild", aktiv);

        if (window.wetterstudioMap) {
            setTimeout(() => window.wetterstudioMap.invalidateSize(), 100);
        }
    });
});

/* Deutschlandkarte: PNG-Download-Buttons */
document.addEventListener("DOMContentLoaded", () => {
    const bereich = document.getElementById("deutschlandkarte-section");
    const suche = bereich?.querySelector(".such-container");

    if (!bereich || !suche) return;

    const leiste = document.createElement("div");
    leiste.id = "deutschland-download-leiste";
    leiste.style.cssText =
        "display:flex;gap:10px;flex-wrap:wrap;margin:0 0 15px;";

    const downloads = [
        ["normal", "📥 Deutschlandkarte PNG"],
        ["transparent", "📥 Deutschlandkarte transparent PNG"]
    ];

    downloads.forEach(([typ, beschriftung]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.id = "deutschland-download-" + typ;
        button.textContent = beschriftung;
        button.disabled = true;
        button.title = "PNG-Export wird vorbereitet";
        button.style.cssText =
            "padding:10px 16px;background:#087bd3;color:white;" +
            "border:0;border-radius:8px;font-weight:bold;" +
            "opacity:0.55;cursor:not-allowed;";

        leiste.appendChild(button);
    });

    suche.insertAdjacentElement("afterend", leiste);
});
