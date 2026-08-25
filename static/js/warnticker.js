document.addEventListener("DOMContentLoaded", () => {

    const ticker = document.getElementById("warnTicker");
    const infoTicker = document.getElementById("infoTicker");

    if (!ticker) return;

    function ladeWarnticker() {

        fetch("/api/warnungen")
            .then(response => response.json())
            .then(warnungen => {

                const meldungen = [];
                const infos = [];
let neuesteWarnung = null;
                for (const landkreis in warnungen) {

                    warnungen[landkreis].forEach(w => {
                        let prioritaet = 0;

if (w.event.includes("TORNADO")) prioritaet = 100;
else if (w.event.includes("GEWITTER")) prioritaet = 90;
else if (w.event.includes("STARKREGEN")) prioritaet = 80;
else if (w.event.includes("STURM")) prioritaet = 70;
else if (w.event.includes("SCHNEE")) prioritaet = 60;
else if (w.event.includes("GLATTEIS")) prioritaet = 60;
else if (w.event.includes("HITZE")) prioritaet = 10;
if (
    !neuesteWarnung ||
    prioritaet > neuesteWarnung.prioritaet ||
    (
        prioritaet === neuesteWarnung.prioritaet &&
        new Date(w.start) > new Date(neuesteWarnung.start)
    )
) {
    neuesteWarnung = {
        landkreis: landkreis,
        warnung: w,
        start: w.start,
        prioritaet: prioritaet
    };
}
                        let symbol = "🟡";

                        if (w.level >= 5) {
                            symbol = "🟣";
                        } else if (w.level === 4) {
                            symbol = "🔴";
                        } else if (w.level === 3) {
                            symbol = "🟠";
                        }

                        meldungen.push(
                            symbol + " " +
                            landkreis +
                            " – " +
                            w.event +
                            " – gültig bis " +
                            new Date(w.end).toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit"
                            })
                        );

                       if (
    neuesteWarnung &&
    neuesteWarnung.warnung === w
) {
    infos.push(
        "🚨 Neue " +
        w.event +
        " für " +
        landkreis +
        ". Bitte die Wetterentwicklung verfolgen."
    );
}

                    });

                }

                if (meldungen.length === 0) {

                    ticker.innerHTML =
                        "<marquee behavior='scroll' direction='left' scrollamount='5'>✅ Zurzeit keine DWD-Warnungen.</marquee>";

                    if (infoTicker) {
                        infoTicker.innerHTML =
                            "<marquee behavior='scroll' direction='left' scrollamount='4'>ℹ️ Zurzeit liegen keine neuen Warnmeldungen vor.</marquee>";
                    }

                    return;
                }

                ticker.innerHTML =
                    "<marquee behavior='scroll' direction='left' scrollamount='5'>" +
                    meldungen.join(" &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; ") +
                    "</marquee>";

       if (infoTicker) {

    if (neuesteWarnung) {

        infoTicker.innerHTML =
            "<marquee behavior='scroll' direction='left' scrollamount='4'>" +
            "🚨 " +
            neuesteWarnung.warnung.headline +
            " – " +
            neuesteWarnung.landkreis +
            "</marquee>";

    } else {

        infoTicker.innerHTML =
            "<marquee behavior='scroll' direction='left' scrollamount='4'>" +
            "ℹ️ Zurzeit liegen keine neuen DWD-Warnungen vor." +
            "</marquee>";

    }

}

            })
            .catch(error => {

                console.error("Warnticker:", error);

                ticker.innerHTML =
                    "<marquee behavior='scroll' direction='left'>❌ DWD-Warnungen konnten nicht geladen werden.</marquee>";

                if (infoTicker) {
                    infoTicker.innerHTML =
                        "<marquee behavior='scroll' direction='left'>ℹ️ Wetterstudio AI momentan nicht verfügbar.</marquee>";
                }

            });

    }

    ladeWarnticker();

    setInterval(ladeWarnticker, 120000);

});