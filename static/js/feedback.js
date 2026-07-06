document.addEventListener("DOMContentLoaded", () => {

    const formular = document.getElementById("feedbackForm");

    if (!formular) return;

    formular.addEventListener("submit", async (e) => {
        console.log("Feedback-Button wurde geklickt");

        e.preventDefault();

        const name = document.getElementById("name").value;
        const feedback = document.getElementById("feedback").value;

        const status = document.getElementById("feedbackStatus");

        status.textContent = "📨 Feedback wird gesendet...";

        try {
console.log("Sende Feedback an Server...");
            const antwort = await fetch("/api/feedback", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    feedback: feedback
                })

            });

            if (antwort.ok) {

                status.textContent =
                    "✅ Vielen Dank für dein Feedback!";

                formular.reset();

            } else {

                status.textContent =
                    "❌ Fehler beim Speichern.";

            }

        } catch (err) {
console.error(err);
            status.textContent =
                "❌ Verbindung zum Server fehlgeschlagen.";

        }

    });

});