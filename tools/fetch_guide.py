"""Telecharge le Licensing Guide courant et en deduit l'edition.

Le permalien redirige toujours vers le PDF publie ; le nom du fichier cible porte
le mois et l'annee, ce qui evite toute saisie manuelle de la version.
"""
import os
import re
import sys
import urllib.request

PERMALINK = "https://go.microsoft.com/fwlink/?LinkId=866544&clcid=0x409"
DEST = "tools/ref/d365-licensing-guide.pdf"
FILENAME_EDITION = re.compile(r"Dynamics365LicensingGuide([A-Za-z]+)(\d{4})\.pdf", re.IGNORECASE)

os.makedirs("tools/ref", exist_ok=True)

request = urllib.request.Request(PERMALINK, headers={"User-Agent": "d365-licensing-profiler"})
with urllib.request.urlopen(request) as response:
    final_url = response.geturl()
    payload = response.read()

match = FILENAME_EDITION.search(final_url)
if not match:
    print(f"Edition introuvable dans l'URL finale: {final_url}", file=sys.stderr)
    sys.exit(1)

edition = f"{match.group(1)} {match.group(2)}"

if not payload.startswith(b"%PDF"):
    print("Le fichier telecharge n'est pas un PDF.", file=sys.stderr)
    sys.exit(1)

with open(DEST, "wb") as fh:
    fh.write(payload)

print(f"edition   : {edition}")
print(f"source    : {final_url}")
print(f"taille    : {len(payload)} octets")

output = os.environ.get("GITHUB_OUTPUT")
if output:
    with open(output, "a", encoding="utf-8") as fh:
        fh.write(f"edition={edition}\n")
