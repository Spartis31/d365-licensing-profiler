"""Genere src/data/standardRoles.ts a partir des roles extraits du Licensing Guide."""
import json
import os
import re

ROLES = json.load(open("tools/ref/standard_roles.json", encoding="utf-8"))

# Injectee par le workflow depuis le nom du PDF telecharge.
EDITION = os.environ.get("GUIDE_EDITION", "September 2026")

APP_BY_PAGE = {
    13: "commerce",
    34: "finance",
    35: "finance",
    36: "finance",
    38: "humanResources",
    39: "humanResources",
    41: "projectOperations",
    42: "projectOperations",
    52: "supplyChain",
    53: "supplyChain",
    54: "supplyChain",
    55: "supplyChain",
}

GROUP_FR = {
    "C-Suite": "Direction générale",
    "Budgeting": "Budget",
    "Financials and Accounting": "Finance et comptabilité",
    "Commerce": "Commerce",
    "General": "Général",
    "Project Management": "Gestion de projet",
    "Project Accounting & Administration": "Comptabilité et administration de projet",
    "Project Sales": "Ventes de projet",
    "Practice Management": "Gestion de practice",
    "Resource Management": "Gestion des ressources",
    "Cost Accounting": "Comptabilité analytique",
    "Customer Service": "Service client",
    "Demand Planning": "Planification de la demande",
    "Engineering": "Bureau d'études",
    "Distribution": "Distribution",
    "Field Service": "Service terrain",
    "Marketing": "Marketing",
    "Manufacturing": "Production",
    "Procurement": "Achats",
    "Quality Control": "Contrôle qualité",
    "Sales": "Ventes",
    "Transportation": "Transport",
    "Asset Management": "Gestion des actifs",
    "Human Resources": "Ressources humaines",
}

APP_FALLBACK_GROUP = {
    "commerce": "Commerce",
    "finance": "Financials and Accounting",
    "humanResources": "Human Resources",
    "projectOperations": "Project Management",
    "supplyChain": "General",
}

# Le tableau Asset Management de la page 52 chevauche une coupure de colonne :
# pdfplumber melange les descriptions. Valeurs relues dans le PDF.
DESCRIPTION_OVERRIDES = {
    "Maintenance requester": "Creates maintenance requests",
    "Maintenance worker": "Documents maintenance events and responds to maintenance inquiries",
    "Maintenance clerk": (
        "Plans and authorizes maintenance events. Maintains maintenance planning master data "
        "and responds to maintenance related inquiries"
    ),
    "Maintenance manager": (
        "Enables and reviews the performance of the maintenance process. Maintains master data "
        "and responds to maintenance related inquiries"
    ),
}


def slug(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return re.sub(r"-+", "-", text)[:60]


def escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def main():
    entries = []
    last_group_by_app = {}
    seen_ids = set()

    for role in ROLES:
        app = APP_BY_PAGE.get(role["page"])
        if app is None:
            continue

        group = role["group"]
        if group:
            last_group_by_app[app] = group
        else:
            group = last_group_by_app.get(app) or APP_FALLBACK_GROUP[app]

        # Les libelles trop longs contiennent une parenthese explicative : on la coupe.
        name = re.sub(r"\s*\(incl\..*?\)", "", role["name"]).strip()
        description = DESCRIPTION_OVERRIDES.get(name) or re.sub(r"\s+", " ", role["description"]).strip()

        identifier = f"{app[:3]}-{slug(name)}"
        suffix = 2
        while identifier in seen_ids:
            identifier = f"{app[:3]}-{slug(name)}-{suffix}"
            suffix += 1
        seen_ids.add(identifier)

        entries.append(
            {
                "id": identifier,
                "name": name,
                "description": description,
                "app": app,
                "group": group,
                "groupFr": GROUP_FR.get(group, group),
                "licence": role["licence"],
                "page": role["page"],
            }
        )

    lines = [
        "import type { LicenceKey } from '../types';",
        "",
        "/**",
        " * Roles de securite standards publies dans le Dynamics 365 Licensing Guide,",
        " * avec la licence minimale requise par role.",
        " *",
        " * Genere par tools/generate_roles_ts.py depuis le PDF officiel. Ne pas editer",
        " * a la main : relancer le script apres chaque nouvelle edition du guide.",
        " *",
        " * Les noms de roles sont conserves en anglais : ce sont les noms des roles de",
        " * securite du produit, pas des libelles traduisibles.",
        " */",
        f"export const ROLES_GUIDE_EDITION = '{EDITION}';",
        "",
        "export type RoleApp = 'finance' | 'supplyChain' | 'commerce' | 'humanResources' | 'projectOperations';",
        "",
        "export interface StandardRole {",
        "  id: string;",
        "  name: string;",
        "  description: string;",
        "  app: RoleApp;",
        "  group: { en: string; fr: string };",
        "  licence: LicenceKey;",
        "  /** Page du Licensing Guide, pour tracabilite. */",
        "  page: number;",
        "}",
        "",
        "export const STANDARD_ROLES: StandardRole[] = [",
    ]

    for entry in entries:
        lines.append(
            "  {\n"
            f"    id: '{entry['id']}',\n"
            f"    name: '{escape(entry['name'])}',\n"
            f"    description: '{escape(entry['description'])}',\n"
            f"    app: '{entry['app']}',\n"
            f"    group: {{ en: '{escape(entry['group'])}', fr: '{escape(entry['groupFr'])}' }},\n"
            f"    licence: '{entry['licence']}',\n"
            f"    page: {entry['page']},\n"
            "  },"
        )

    lines.append("];")
    lines.append("")
    lines.append("const ROLE_INDEX = new Map(STANDARD_ROLES.map((role) => [role.id, role]));")
    lines.append("")
    lines.append("export function getStandardRole(id: string): StandardRole | undefined {")
    lines.append("  return ROLE_INDEX.get(id);")
    lines.append("}")
    lines.append("")

    with open("src/data/standardRoles.ts", "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    report = [f"roles ecrits: {len(entries)}"]
    by_app = {}
    for entry in entries:
        by_app.setdefault(entry["app"], []).append(entry["licence"])
    for app, licences in by_app.items():
        counts = {}
        for licence in licences:
            counts[licence] = counts.get(licence, 0) + 1
        report.append(f"  {app}: {len(licences)} roles {counts}")
    open("tools/ref/generate_report.txt", "w", encoding="utf-8").write("\n".join(report))


if __name__ == "__main__":
    main()
