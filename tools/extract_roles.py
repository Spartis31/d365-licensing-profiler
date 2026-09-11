"""Extraction des matrices "security roles" du Licensing Guide.

Les entitlements etant cumulatifs (une licence superieure couvre les droits des
licences inferieures), les pastilles d'une ligne sont contigues et alignees a
droite : N pastilles sur C colonnes => la licence minimale est la colonne C-N.
"""
import json
import re
import sys

DOT = "\u26ab"
TEXT = open("tools/ref/guide.txt", encoding="utf-8").read()

SECTION_RE = re.compile(r"^(Commerce|Finance|Human Resource|Project Operations|Supply Chain Management) security roles\s*$", re.M)
HEADER_RE = re.compile(r"^Role Security Role Description\s*(.*)$", re.M)
NOISE_RE = re.compile(r"^(Dynamics 365 Licensing Guide|===== PAGE|\s*$)")


def clean(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def parse_columns(raw: str, following: list[str]) -> list[str]:
    """Le libelle des colonnes deborde souvent sur les lignes suivantes."""
    tokens = clean(raw)
    for line in following:
        candidate = clean(line)
        if not candidate or DOT in candidate:
            break
        tokens += " " + candidate
    return tokens


def main():
    lines = TEXT.splitlines()
    sections = []
    for match in SECTION_RE.finditer(TEXT):
        start = TEXT[: match.start()].count("\n")
        sections.append((match.group(1), start))
    sections.append(("__end__", len(lines)))

    result = {}
    for index in range(len(sections) - 1):
        app, start = sections[index]
        end = sections[index + 1][1]
        block = lines[start:end]

        headers = []
        roles = []
        group = None
        for i, line in enumerate(block):
            stripped = line.rstrip()
            if NOISE_RE.match(stripped):
                continue
            header = HEADER_RE.match(stripped)
            if header:
                headers.append(parse_columns(header.group(1), block[i + 1 : i + 4]))
                continue
            if DOT not in stripped:
                text = clean(stripped)
                # Les intitules courts sans pastille sont des sous-titres de groupe.
                if text and len(text) < 45 and not text.endswith(".") and text[0].isupper():
                    group = text
                continue
            dots = stripped.count(DOT)
            label = clean(stripped.replace(DOT, ""))
            roles.append({"group": group, "text": label, "dots": dots})

        result[app] = {"headers": headers, "roles": roles}

    with open("tools/ref/roles_raw.json", "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)

    sys.stdout.reconfigure(encoding="utf-8")
    for app, data in result.items():
        if app == "__end__":
            continue
        print(f"\n########## {app} — {len(data['roles'])} lignes")
        for h in data["headers"][:2]:
            print("  HEADER:", h[:150])
        for role in data["roles"][:8]:
            print(f"  [{role['dots']}] ({role['group']}) {role['text'][:95]}")


if __name__ == "__main__":
    main()
