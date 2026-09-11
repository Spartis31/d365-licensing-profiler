"""Reperage des sections du Licensing Guide utiles au profilage F&O."""
import re

TEXT = open("tools/ref/guide.txt", encoding="utf-8").read()

KEYWORDS = [
    r"Team Members",
    r"Operations\s*[–-]\s*Activity",
    r"Operations\s*[–-]\s*Device",
    r"Attach",
    r"Base license",
    r"Finance and Operations",
]

pages = re.split(r"===== PAGE (\d+) =====", TEXT)
# pages = ['', '1', body1, '2', body2, ...]
index = {}
for i in range(1, len(pages), 2):
    index[int(pages[i])] = pages[i + 1]

for number, body in index.items():
    hits = [k for k in KEYWORDS if re.search(k, body, re.I)]
    first_line = next((l.strip() for l in body.splitlines() if l.strip()), "")
    if hits:
        print(f"p{number:>3} | {', '.join(hits):<70} | {first_line[:70]}")
