document.addEventListener("DOMContentLoaded", () => {

    const ticker = document.getElementById("warnTicker");

    if (!ticker) return;

    fetch("/api/warnungen")
        .then(r => r.json())
        .then(warnungen => {

            const meldungen = [];

            for (const landkreis in warnungen) {

                warnungen[landkreis].forEach(w => {

let symbol = "🟡";

if (w.level >= 4) {
    symbol = "🟣";
} else if (w.level === 3) {
    symbol = "🔴";
} else if (w.level === 2) {
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

                });

            }

            if (meldungen.length === 0) {

                ticker.textContent = "✅ Zurzeit keine DWD-Warnungen.";

            } else {

              ticker.innerHTML =
    "<marquee behavior='scroll' direction='left' scrollamount='5'>" +
    meldungen.join(" &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; ") +
    "</marquee>";

            }

        })
        .catch(() => {

            ticker.textContent = "❌ DWD-Warnungen konnten nicht geladen werden.";

        });

});