"""Print specific pages from the extracted Licensing Guide text."""
import re
import sys

TEXT = open("tools/ref/guide.txt", encoding="utf-8").read()
parts = re.split(r"===== PAGE (\d+) =====", TEXT)
pages = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}

first, last = int(sys.argv[1]), int(sys.argv[2])
out = []
for n in range(first, last + 1):
    out.append(f"\n===== PAGE {n} =====\n{pages.get(n, '')}")
sys.stdout.reconfigure(encoding="utf-8")
print("".join(out))
