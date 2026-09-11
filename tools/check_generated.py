"""Barriere qualite sur src/data/standardRoles.ts.

Le controle porte sur le fichier genere, pas sur le JSON brut : les descriptions
coupees par un saut de colonne sont corrigees par DESCRIPTION_OVERRIDES pendant
la generation, donc seul le resultat final fait foi.
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
    problems.append(f"{len(descriptions)} descriptions generees pour {expected} roles extraits")

empty = [n for n, d in zip(names, descriptions) if not d.strip()]
truncated = [n for n, d in zip(names, descriptions) if re.match(r"^[a-z]", d)]

for name in empty:
    problems.append(f"description vide : {name}")
for name in truncated:
    problems.append(f"description tronquee (commence en minuscule) : {name}")

edition = re.search(r"ROLES_GUIDE_EDITION = '([^']+)'", source)
if not edition:
    problems.append("ROLES_GUIDE_EDITION absent du fichier genere")

print(f"roles    : {len(descriptions)}")
print(f"edition  : {edition.group(1) if edition else '?'}")

if problems:
    print("\nControle qualite en echec :", file=sys.stderr)
    for problem in problems:
        print(f"  - {problem}", file=sys.stderr)
    sys.exit(1)

print("controle qualite : OK")
