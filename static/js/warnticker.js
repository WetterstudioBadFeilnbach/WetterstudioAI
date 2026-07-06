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

                for (const landkreis in warnungen) {

                    warnungen[landkreis].forEach(w => {

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

                        infos.push(
                            "🚨 Neue " +
                            w.event +
                            " für " +
                            landkreis +
                            ". Bitte die Wetterentwicklung verfolgen."
                        );

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

                    infoTicker.innerHTML =
                        "<marquee behavior='scroll' direction='left' scrollamount='4'>" +
                        infos.join(" &nbsp;&nbsp;&nbsp; ⭐ &nbsp;&nbsp;&nbsp; ") +
                        "</marquee>";

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