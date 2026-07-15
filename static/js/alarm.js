document.addEventListener("DOMContentLoaded", () => {

    console.log("🔔 Alarmmodul gestartet");

   const alarm = new Audio("/static/audio/gong.mp3");
   const dwdAnsage = new Audio("/static/audio/dwd_ansage.mp3");
   dwdAnsage.preload = "auto";
let audioFreigegeben = false;

document.addEventListener("click", () => {
    audioFreigegeben = true;
}, { once: true });
    let bekannteWarnungen = new Set();
    let ersterAufruf = true;

    function pruefeWarnungen() {
console.count("pruefeWarnungen");
        fetch("/api/warnungen")
            .then(r => r.json())
            .then(warnungen => {

                const aktuelleWarnungen = new Set();

                for (const landkreis in warnungen) {

                   warnungen[landkreis].forEach(w => {

    const warnID =
        landkreis + "|" +
        w.event + "|" +
        w.start + "|" +
        w.end;

    aktuelleWarnungen.add(warnID);

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
console.log("Bekannte IDs:", Array.from(bekannteWarnungen));
console.log("Aktuelle IDs:", Array.from(aktuelleWarnungen));
console.log("Neue IDs:", Array.from(aktuelleWarnungen).filter(id => !bekannteWarnungen.has(id)));
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
   console.log("Neue Warnung:", neueWarnung);
console.log("Audio freigegeben:", audioFreigegeben);
if (neueWarnung && audioFreigegeben) {

    console.log("🔔 Neue DWD-Warnung erkannt");

    alarm.pause();
    alarm.currentTime = 0;

alarm.play().then(() => {

console.log("✅ Alarm einmal abgespielt");
console.log("Starte DWD-Ansage...");

dwdAnsage.currentTime = 0;

dwdAnsage.play().then(() => {
    console.log("✅ DWD-Ansage erfolgreich");
}).catch(err => {
    console.error("❌ DWD-Ansage Fehler:", err);
});
   
}).catch(err => {
    console.error(err);
});

}

// Bekannte Warnungen immer mit dem aktuellen DWD-Stand synchronisieren
// Bekannte Warnungen exakt mit dem aktuellen DWD-Stand synchronisieren
bekannteWarnungen = new Set(aktuelleWarnungen);

console.log("Bekannte Warnungen synchronisiert:", bekannteWarnungen.size);

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
console.log("Audio:", alarm.src);
console.log("Ansage:", dwdAnsage.src);
        alarm.play().then(() => {
            console.log("✅ Testalarm erfolgreich abgespielt");
            console.log("Starte DWD-Ansage...");
dwdAnsage.play();
        }).catch(err => {
            console.error("❌ Testalarm fehlgeschlagen:", err);
        });

    });

}
});