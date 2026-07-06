document.addEventListener("DOMContentLoaded", () => {

    console.log("🔔 Alarmmodul gestartet");

    const alarm = new Audio("/static/audio/alarm.mp3");
let audioFreigegeben = false;

document.addEventListener("click", () => {
    audioFreigegeben = true;
}, { once: true });
    const bekannteWarnungen = new Set();
    let ersterAufruf = true;

    function pruefeWarnungen() {

        fetch("/api/warnungen")
            .then(r => r.json())
            .then(warnungen => {

                const aktuelleWarnungen = new Set();

                for (const landkreis in warnungen) {

                    warnungen[landkreis].forEach(w => {
                        if (w.identifier) {
                            aktuelleWarnungen.add(w.identifier);
                        }
                    });

                }

                console.log("Bekannte Warnungen:", bekannteWarnungen.size);
                console.log("Aktuelle Warnungen:", aktuelleWarnungen.size);

                let neueWarnung = false;

                aktuelleWarnungen.forEach(id => {
                    if (!bekannteWarnungen.has(id)) {
                        neueWarnung = true;
                    }
                });

                console.log("Neue Warnung:", neueWarnung);
console.log("Bekannte IDs:", [...bekannteWarnungen]);
console.log("Aktuelle IDs:", [...aktuelleWarnungen]);
                // Beim ersten Start keinen Alarm auslösen
                if (ersterAufruf) {

                    aktuelleWarnungen.forEach(id => {
                        bekannteWarnungen.add(id);
                    });

                    console.log("Erster Start - kein Alarm");
                    console.log("Bekannte Warnungen übernommen:", bekannteWarnungen.size);

                    ersterAufruf = false;
                   return;
                }

   // Alarm nur bei wirklich neuer Warnung
if (neueWarnung) {

    if (audioFreigegeben) {

        alarm.play().then(() => {
            console.log("✅ Alarm erfolgreich abgespielt");
        }).catch(err => {
            console.error("❌ Alarm konnte nicht abgespielt werden:", err);
        });

    } else {

        console.log("🔇 Audio noch nicht freigegeben");

    }

    console.log("🔔 Neue DWD-Warnung erkannt - Alarm abgespielt");

}

// Bekannte Warnungen immer mit dem aktuellen DWD-Stand synchronisieren
bekannteWarnungen.clear();

aktuelleWarnungen.forEach(id => {
    bekannteWarnungen.add(id);
});

            })
            .catch(err => {

                console.error("Alarmmodul:", err);

            });

    }

    pruefeWarnungen();

    setInterval(pruefeWarnungen, 120000);
const testButton = document.getElementById("alarm-test");

if (testButton) {

    testButton.addEventListener("click", () => {

        alarm.play().then(() => {
            console.log("✅ Testalarm erfolgreich abgespielt");
        }).catch(err => {
            console.error("❌ Testalarm fehlgeschlagen:", err);
        });

    });

}
});