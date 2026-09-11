"""Locate the Premium sections in the Licensing Guide."""
import re

TEXT = open("tools/ref/guide.txt", encoding="utf-8").read()
parts = re.split(r"===== PAGE (\d+) =====", TEXT)
pages = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}

out = []
for number, body in sorted(pages.items()):
    hits = len(re.findall(r"Premium", body))
    if hits >= 3:
        first = next((l.strip() for l in body.splitlines() if l.strip() and "Licensing Guide" not in l), "")
        out.append(f"p{number:>3} | {hits:>3} occurrences | {first[:90]}")

open("tools/ref/premium_scan.txt", "w", encoding="utf-8").write("\n".join(out))
