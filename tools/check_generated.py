"""Quality gate on src/data/standardRoles.ts.

The check targets the generated file rather than the raw JSON: descriptions cut
short by a column break are repaired by DESCRIPTION_OVERRIDES during generation,
so only the final result is authoritative.
"""
import json
import re
import sys

GENERATED = "src/data/standardRoles.ts"
RAW = "tools/ref/standard_roles.json"

source = open(GENERATED, encoding="utf-8").read()
expected = len(json.load(open(RAW, encoding="utf-8")))

descriptions = re.findall(r"^\s*description: '(.*)',$", source, re.MULTILINE)
names = re.findall(r"^\s*name: '(.*)',$", source, re.MULTILINE)

problems = []

if len(descriptions) != expected:
    problems.append(f"{len(descriptions)} descriptions generated for {expected} extracted roles")

empty = [n for n, d in zip(names, descriptions) if not d.strip()]
truncated = [n for n, d in zip(names, descriptions) if re.match(r"^[a-z]", d)]

for name in empty:
    problems.append(f"empty description: {name}")
for name in truncated:
    problems.append(f"truncated description (starts with a lowercase letter): {name}")

edition = re.search(r"ROLES_GUIDE_EDITION = '([^']+)'", source)
if not edition:
    problems.append("ROLES_GUIDE_EDITION missing from the generated file")

print(f"roles    : {len(descriptions)}")
print(f"edition  : {edition.group(1) if edition else '?'}")

if problems:
    print("\nQuality check failed:", file=sys.stderr)
    for problem in problems:
        print(f"  - {problem}", file=sys.stderr)
    sys.exit(1)

print("quality check: OK")
