"""Quality check: spot descriptions that were split incorrectly."""
import json
import re

roles = json.load(open("tools/ref/standard_roles.json", encoding="utf-8"))

suspects = [r for r in roles if r["description"] and re.match(r"^[a-z]", r["description"])]
empty = [r for r in roles if not r["description"]]

lines = [
    f"total roles: {len(roles)}",
    f"descriptions starting with a lowercase letter (likely overflow): {len(suspects)}",
    f"empty descriptions: {len(empty)}",
    "",
]
for role in suspects:
    lines.append(f"  p{role['page']} {role['name']} :: {role['description'][:90]}")
for role in empty:
    lines.append(f"  [EMPTY] p{role['page']} {role['name']}")

open("tools/ref/quality.txt", "w", encoding="utf-8").write("\n".join(lines))
