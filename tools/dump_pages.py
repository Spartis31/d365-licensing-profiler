"""Ecrit des pages du guide dans un fichier UTF-8 (evite l'UTF-16 de PowerShell)."""
import re
import sys

TEXT = open("tools/ref/guide.txt", encoding="utf-8").read()
parts = re.split(r"===== PAGE (\d+) =====", TEXT)
pages = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}

first, last, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
body = "".join(f"\n===== PAGE {n} =====\n{pages.get(n, '')}" for n in range(first, last + 1))
open(out, "w", encoding="utf-8").write(body)
