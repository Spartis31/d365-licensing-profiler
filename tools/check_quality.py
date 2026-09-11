"""Controle qualite : reperage des descriptions mal decoupees."""
import json
import re

roles = json.load(open("tools/ref/standard_roles.json", encoding="utf-8"))

suspects = [r for r in roles if r["description"] and re.match(r"^[a-z]", r["description"])]
empty = [r for r in roles if not r["description"]]

lines = [
    f"total roles: {len(roles)}",
    f"descriptions commencant par une minuscule (fuite probable): {len(suspects)}",
    f"descriptions vides: {len(empty)}",
    "",
]
for role in suspects:
    lines.append(f"  p{role['page']} {role['name']} :: {role['description'][:90]}")
for role in empty:
    lines.append(f"  [VIDE] p{role['page']} {role['name']}")

open("tools/ref/quality.txt", "w", encoding="utf-8").write("\n".join(lines))
