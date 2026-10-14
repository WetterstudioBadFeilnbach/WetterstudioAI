
"""Erstellt und veröffentlicht 14 Bayern-Wetterkarten."""

from pathlib import Path
import shutil

from modules.bayern_karte_wetterstudio_v29 import (
    erstelle_wetterstudio_14_karten,
)

ZIELORDNER = Path("static/wetterkarten")


def main():
    print("Starte Erstellung der 14 Bayern-Wetterkarten ...")

    pfade = [Path(p) for p in erstelle_wetterstudio_14_karten()]

    # Erst alle Ergebnisse kontrollieren.
    if len(pfade) != 14:
        raise RuntimeError(
            f"Erwartet: 14 Wetterkarten, erhalten: {len(pfade)}"
        )

    if len({p.name for p in pfade}) != 14:
        raise RuntimeError("Doppelte Wetterkarten-Dateinamen erkannt.")

    for pfad in pfade:
        if not pfad.is_file() or pfad.stat().st_size == 0:
            raise RuntimeError(f"Wetterkarte fehlt oder ist leer: {pfad}")

        with pfad.open("rb") as datei:
            if datei.read(8) != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError(f"Keine gültige PNG-Signatur: {pfad}")

    # Erst nach erfolgreicher Prüfung veröffentlichen.
    ZIELORDNER.mkdir(parents=True, exist_ok=True)

    for pfad in pfade:
        shutil.copy2(pfad, ZIELORDNER / pfad.name)
        print(f"Bereitgestellt: {pfad.name}")

    print("Fertig: Alle 14 Wetterkarten bereitgestellt.")


if __name__ == "__main__":
    main()
