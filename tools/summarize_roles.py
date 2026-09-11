"""Summary of the extracted roles, written straight to a file."""
import json
from collections import Counter

roles = json.load(open("tools/ref/standard_roles.json", encoding="utf-8"))

lines = [f"total: {len(roles)}"]
lines.append("by minimum licence: " + str(dict(Counter(r["licence"] for r in roles))))
lines.append("premium only: " + str(sum(1 for r in roles if r["premiumOnly"])))
lines.append("")
for role in roles:
    flag = "PREMIUM " if role["premiumOnly"] else ""
    lines.append(f"p{role['page']:>3} | {role['licence']:<17} | {flag}{role['group']} > {role['name']} :: {role['description'][:70]}")

open("tools/ref/roles_summary.txt", "w", encoding="utf-8").write("\n".join(lines))
