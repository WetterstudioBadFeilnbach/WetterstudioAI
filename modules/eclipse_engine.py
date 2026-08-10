from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def lade_finsternis(lat, lon, hoehe=500):
    """
    Berechnet die Sonnenfinsternis am 12.08.2026
    für den angegebenen Standort über den Xavier-Jubier
    Solar Eclipse Calculator.

    Der originale JavaScript-Aufruf der Seite ist:
        recalculate('en')
    """

    url = (
        "http://xjubier.free.fr/en/site_pages/"
        "SolarEclipseCalc_Diagram.html"
        "?Eclipse=%2720260812%27"
        f"&Lat={lat}"
        f"&Lng={lon}"
        f"&Alt={hoehe}"
        "&TZ=%27+0200%27"
        "&DST=1"
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        page = browser.new_page()

        print("Xavier-Jubier Solar Eclipse Calculator wird geladen...")

        page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        print("Seite vollständig geladen.")
        page.wait_for_timeout(5000)
        # ---------------------------------------------------------
        # 1. Warten, bis der originale Berechnungsbutton vorhanden ist
        # ---------------------------------------------------------

        calculate_button = page.locator(
            "input[type='button'][value*='Calculate Eclipse Circumstances']"
        )

        calculate_button.wait_for(
            state="visible",
            timeout=30000
        )

        print("Berechnungsbutton gefunden.")

        # ---------------------------------------------------------
        # 2. ORIGINALEN JAVASCRIPT-AUFRUF AUSFÜHREN
        #
        # Die Analyse der geladenen Seite hat exakt ergeben:
        #
        # onclick="recalculate('en')"
        #
        # ---------------------------------------------------------

        print("Starte originale Berechnung: recalculate('en')")

        page.evaluate("recalculate('en')")

        # ---------------------------------------------------------
        # 3. Auf die tatsächlich berechneten Ergebnisse warten
        # ---------------------------------------------------------

        try:
            page.wait_for_function(
                """
                () => {
                    const field = document.getElementById("c1_date");
                    return field && field.value && field.value.trim() !== "";
                }
                """,
                timeout=30000
            )
        except PlaywrightTimeoutError:
            print("FEHLER: Die Berechnung hat keine C1-Daten geliefert.")

            # Zur Kontrolle ausgeben
            print(
                "c1_date =",
                page.locator("#c1_date").input_value()
            )

            print(
                "c1_time =",
                page.locator("#c1_time").input_value()
            )

            print(
                "mid_date =",
                page.locator("#mid_date").input_value()
            )

            print(
                "mid_time =",
                page.locator("#mid_time").input_value()
            )

            browser.close()

            raise RuntimeError(
                "Xavier-Jubier hat die Eclipse-Berechnung "
                "nicht abgeschlossen."
            )

        print("Berechnung erfolgreich abgeschlossen.")

        # ---------------------------------------------------------
        # 4. Ergebnisse aus den ORIGINALEN Feldern auslesen
        # ---------------------------------------------------------

        felder = [
            "c1_date",
            "c1_time",
            "c1_alt",
            "c1_azi",
            "c1_p",
            "c1_v",

            "c2_date",
            "c2_time",
            "c2_alt",
            "c2_azi",
            "c2_p",
            "c2_v",
            "c2_lc",

            "mid_date",
            "mid_time",
            "mid_alt",
            "mid_azi",
            "mid_p",
            "mid_v",

            "c3_date",
            "c3_time",
            "c3_alt",
            "c3_azi",
            "c3_p",
            "c3_v",
            "c3_lc",

            "c4_date",
            "c4_time",
            "c4_alt",
            "c4_azi",
            "c4_p",
            "c4_v",

            "type",
            "duration",
            "durationCorr",
            "coverage",
            "mag",
            "ratio",
            "depth",
            "libl",
            "libb",
            "pac",
        ]

        ergebnis = {}

        for feld in felder:
            element = page.locator(f"#{feld}")

            if element.count() > 0:
                try:
                    ergebnis[feld] = element.input_value()
                except Exception:
                    ergebnis[feld] = ""

        # ---------------------------------------------------------
        # 5. Ergebnis ausgeben
        # ---------------------------------------------------------

        print()
        print("=" * 60)
        print("SONNENFINSTERNIS 12.08.2026")
        print("=" * 60)

        print(f"Standort:       {lat}, {lon}")
        print(f"Höhe:           {hoehe} m")
        print()

        print(f"C1 Datum:       {ergebnis.get('c1_date', '')}")
        print(f"C1 Zeit:        {ergebnis.get('c1_time', '')}")
        print(f"C1 Höhe:        {ergebnis.get('c1_alt', '')}")
        print(f"C1 Azimut:      {ergebnis.get('c1_azi', '')}")

        print()

        print(f"C2 Datum:       {ergebnis.get('c2_date', '')}")
        print(f"C2 Zeit:        {ergebnis.get('c2_time', '')}")

        print()

        print(f"Maximum Datum:  {ergebnis.get('mid_date', '')}")
        print(f"Maximum Zeit:   {ergebnis.get('mid_time', '')}")
        print(f"Max. Höhe:      {ergebnis.get('mid_alt', '')}")
        print(f"Max. Azimut:    {ergebnis.get('mid_azi', '')}")

        print()

        print(f"C3 Datum:       {ergebnis.get('c3_date', '')}")
        print(f"C3 Zeit:        {ergebnis.get('c3_time', '')}")

        print()

        print(f"C4 Datum:       {ergebnis.get('c4_date', '')}")
        print(f"C4 Zeit:        {ergebnis.get('c4_time', '')}")

        print()

        print(f"Eclipse-Typ:    {ergebnis.get('type', '')}")
        print(f"Dauer:          {ergebnis.get('duration', '')}")
        print(f"Bedeckung:      {ergebnis.get('coverage', '')}")
        print(f"Magnitude:      {ergebnis.get('mag', '')}")
        print(f"Ratio:          {ergebnis.get('ratio', '')}")
        print(f"Depth:          {ergebnis.get('depth', '')}")

        print("=" * 60)

        browser.close()

        return ergebnis


if __name__ == "__main__":
    daten = lade_finsternis(
        47.78,
        12.01,
        500
    )

    print()
    print("Eclipse Engine erfolgreich beendet.")




