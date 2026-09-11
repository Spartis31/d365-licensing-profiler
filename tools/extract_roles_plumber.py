"""Extraction of the standard security roles from the Dynamics 365 Licensing Guide.

Actual table layout (pdfplumber, 6 columns):
    [Role, Security Role Description, <licence 1>, <licence 2>, ...]
The header spans 3 physical lines and a role may overflow onto several lines: any
row whose "Role" column is empty is merged into the previous one.

Entitlements are cumulative, so the minimum licence for a role is the first
ticked column.
"""
import json
import re
import sys

import pdfplumber

SRC = "tools/ref/d365-licensing-guide.pdf"
DOT_CHARS = "\u26ab\u2b24\u25cf\u2022"

LICENCE_BY_HEADER = [
    (re.compile(r"hr self service", re.I), "teamMembers", False),
    (re.compile(r"team\s*members", re.I), "teamMembers", False),
    (re.compile(r"(ops|operations)\s*[\u2013\u2014-]?\s*activity", re.I), "activity", False),
    (re.compile(r"finance\s*premium", re.I), "financePremium", True),
    (re.compile(r"(supply chain management|scm)\s*premium", re.I), "supplyChainPremium", True),
    (re.compile(r"^finance$", re.I), "finance", False),
    (re.compile(r"supply chain management|^scm$", re.I), "supplyChain", False),
    (re.compile(r"commerce", re.I), "commerce", False),
    (re.compile(r"human resources", re.I), "humanResources", False),
    (re.compile(r"project operations", re.I), "projectOperations", False),
]


def norm(value):
    return re.sub(r"\s+", " ", (value or "").replace("\n", " ")).strip()


def has_dot(cell):
    return any(ch in DOT_CHARS for ch in (cell or ""))


def classify(header):
    for pattern, licence, premium in LICENCE_BY_HEADER:
        if pattern.search(header):
            return licence, premium
    return None, False


def build_headers(rows, width):
    """The header is spread across the first physical rows."""
    parts = ["" for _ in range(width)]
    used = 0
    for row in rows[:4]:
        if any(has_dot(c) for c in row):
            break
        for i, cell in enumerate(row[:width]):
            text = norm(cell)
            if text:
                parts[i] = (parts[i] + " " + text).strip()
        used += 1
    return parts, used


def merge_rows(rows, width):
    merged = []
    for row in rows:
        cells = [norm(c) for c in row[:width]] + [""] * width
        dots = [has_dot(c) for c in row[:width]] + [False] * width
        if cells[0] or not merged:
            merged.append({"role": cells[0], "desc": cells[1], "dots": dots[:width]})
        else:
            current = merged[-1]
            if cells[1]:
                current["desc"] = (current["desc"] + " " + cells[1]).strip()
            current["dots"] = [a or b for a, b in zip(current["dots"], dots[:width])]
    return merged


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    roles = []
    seen = set()

    with pdfplumber.open(SRC) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                if not table or len(table) < 4:
                    continue
                width = max(len(r) for r in table)
                if width < 4:
                    continue
                headers, consumed = build_headers(table, width)
                joined = " ".join(headers).lower()
                if "role" not in joined or "security role description" not in joined:
                    continue

                columns = []
                for i in range(2, width):
                    licence, premium = classify(headers[i])
                    columns.append((i, licence, premium))
                if not any(licence for _, licence, _ in columns):
                    continue

                group = None
                for entry in merge_rows(table[consumed:], width):
                    if not entry["role"]:
                        continue
                    marked = [(i, l, p) for i, l, p in columns if entry["dots"][i] and l]
                    if not marked:
                        # Row with no dot and no description: group heading.
                        if not entry["desc"]:
                            group = entry["role"]
                        continue
                    index, licence, premium = marked[0]
                    key = entry["role"].lower()
                    if key in seen:
                        continue
                    seen.add(key)
                    roles.append(
                        {
                            "name": entry["role"],
                            "description": entry["desc"],
                            "group": group,
                            "licence": licence,
                            "premiumOnly": premium,
                            "column": headers[index],
                            "page": page_number,
                        }
                    )

    with open("tools/ref/standard_roles.json", "w", encoding="utf-8") as fh:
        json.dump(roles, fh, ensure_ascii=False, indent=2)

    print(f"roles extracted: {len(roles)}")
    counts = {}
    for role in roles:
        counts[role["licence"]] = counts.get(role["licence"], 0) + 1
    print("breakdown:", counts)
    for role in roles[:25]:
        flag = " [PREMIUM]" if role["premiumOnly"] else ""
        print(f"  p{role['page']:>3} {role['licence']:<16}{flag} {role['group']} / {role['name']}")


if __name__ == "__main__":
    main()
