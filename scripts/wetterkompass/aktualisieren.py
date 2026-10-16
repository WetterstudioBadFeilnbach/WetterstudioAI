from pathlib import Path
import subprocess
import sys

BASE = Path(__file__).resolve().parent

for skript in ("wetterkompass.py", "wettertabelle.py", "halbtransparent.py", "transparenz80.py"):
    print(f"STARTE: {skript}", flush=True)
    subprocess.run([sys.executable, str(BASE / skript)], cwd=BASE, check=True)

print("WETTERKOMPASS: AKTUALISIERUNG ERFOLGREICH!")
