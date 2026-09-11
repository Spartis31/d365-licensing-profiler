"""Associe chaque tarif du guide a l'application citee juste avant."""
import re
from pathlib import Path

lines = Path("tools/ref/guide.txt").read_text(encoding="utf-8", errors="replace").splitlines()

APPS = [
    "Finance Premium", "Finance",
    "Supply Chain Management Premium", "Supply Chain Management",
    "Commerce", "Project Operations", "Human Resources",
    "Team Members", "Operations - Activity", "Operations \u2013 Activity", "Operations Activity",
]

price_re = re.compile(r"\$\s?(\d{2,4})\s*(?:per\s+)?user")

for i, line in enumerate(lines):
    m = price_re.search(line)
    if not m:
        continue
    # Remonte jusqu'a 12 lignes pour trouver le nom d'application le plus proche.
    context = ""
    for back in range(1, 13):
        if i - back < 0:
            break
        candidate = lines[i - back].strip()
        for app in APPS:
            if app.lower() in candidate.lower():
                context = f"{app}  <-- '{candidate[:70]}'"
                break
        if context:
            break
    print(f"L{i+1:>5}  ${m.group(1):>4}/user   {context or '(?) ' + lines[i-1].strip()[:70]}")
