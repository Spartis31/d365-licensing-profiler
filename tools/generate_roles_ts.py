"""Generate src/data/standardRoles.ts from the roles extracted from the Licensing Guide."""
import json
import os
import re

ROLES = json.load(open("tools/ref/standard_roles.json", encoding="utf-8"))

# Injected by the workflow from the name of the downloaded PDF.
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

LANGUAGES = ("fr", "da", "de", "es", "it", "nl", "pt", "sv")

# Group headings are the only translatable part of the role catalog: role names and
# descriptions stay in English because they are the product's own security role names.
GROUPS = {
    "C-Suite": ("Direction générale", "Direktion", "Geschäftsleitung", "Alta dirección", "Direzione generale", "Directie", "Direção-geral", "Företagsledning"),
    "Budgeting": ("Budget", "Budgettering", "Budgetierung", "Presupuestos", "Budget", "Budgettering", "Orçamentação", "Budgetering"),
    "Financials and Accounting": ("Finance et comptabilité", "Økonomi og regnskab", "Finanzen und Buchhaltung", "Finanzas y contabilidad", "Finanza e contabilità", "Financiën en boekhouding", "Finanças e contabilidade", "Ekonomi och redovisning"),
    "Commerce": ("Commerce", "Commerce", "Commerce", "Commerce", "Commerce", "Commerce", "Commerce", "Commerce"),
    "General": ("Général", "Generelt", "Allgemein", "General", "Generale", "Algemeen", "Geral", "Allmänt"),
    "Project Management": ("Gestion de projet", "Projektstyring", "Projektmanagement", "Gestión de proyectos", "Gestione progetti", "Projectbeheer", "Gestão de projetos", "Projektledning"),
    "Project Accounting & Administration": ("Comptabilité et administration de projet", "Projektregnskab og administration", "Projektbuchhaltung und -verwaltung", "Contabilidad y administración de proyectos", "Contabilità e amministrazione progetti", "Projectboekhouding en -administratie", "Contabilidade e administração de projetos", "Projektredovisning och administration"),
    "Project Sales": ("Ventes de projet", "Projektsalg", "Projektvertrieb", "Ventas de proyectos", "Vendite di progetto", "Projectverkoop", "Vendas de projetos", "Projektförsäljning"),
    "Practice Management": ("Gestion de practice", "Practice-styring", "Practice-Management", "Gestión de práctica profesional", "Gestione della practice", "Practice-beheer", "Gestão de práticas", "Practice-hantering"),
    "Resource Management": ("Gestion des ressources", "Ressourcestyring", "Ressourcenmanagement", "Gestión de recursos", "Gestione risorse", "Resourcebeheer", "Gestão de recursos", "Resurshantering"),
    "Cost Accounting": ("Comptabilité analytique", "Omkostningsregnskab", "Kostenrechnung", "Contabilidad de costes", "Contabilità industriale", "Kostenboekhouding", "Contabilidade analítica", "Kostnadsredovisning"),
    "Customer Service": ("Service client", "Kundeservice", "Kundenservice", "Servicio al cliente", "Servizio clienti", "Klantenservice", "Serviço ao cliente", "Kundtjänst"),
    "Demand Planning": ("Planification de la demande", "Efterspørgselsplanlægning", "Bedarfsplanung", "Planificación de la demanda", "Pianificazione della domanda", "Vraagplanning", "Planeamento da procura", "Efterfrågeplanering"),
    "Engineering": ("Bureau d'études", "Konstruktion", "Konstruktion", "Ingeniería", "Ufficio tecnico", "Engineering", "Engenharia", "Konstruktion"),
    "Distribution": ("Distribution", "Distribution", "Distribution", "Distribución", "Distribuzione", "Distributie", "Distribuição", "Distribution"),
    "Field Service": ("Service terrain", "Field Service", "Außendienst", "Servicio de campo", "Assistenza sul campo", "Field Service", "Serviço no terreno", "Fältservice"),
    "Marketing": ("Marketing", "Marketing", "Marketing", "Marketing", "Marketing", "Marketing", "Marketing", "Marknadsföring"),
    "Manufacturing": ("Production", "Produktion", "Fertigung", "Fabricación", "Produzione", "Productie", "Produção", "Tillverkning"),
    "Procurement": ("Achats", "Indkøb", "Beschaffung", "Aprovisionamiento", "Approvvigionamento", "Inkoop", "Aprovisionamento", "Inköp"),
    "Quality Control": ("Contrôle qualité", "Kvalitetskontrol", "Qualitätskontrolle", "Control de calidad", "Controllo qualità", "Kwaliteitscontrole", "Controlo de qualidade", "Kvalitetskontroll"),
    "Sales": ("Ventes", "Salg", "Vertrieb", "Ventas", "Vendite", "Verkoop", "Vendas", "Försäljning"),
    "Transportation": ("Transport", "Transport", "Transport", "Transporte", "Trasporti", "Transport", "Transporte", "Transport"),
    "Asset Management": ("Gestion des actifs", "Aktivstyring", "Anlagenverwaltung", "Gestión de activos", "Gestione cespiti", "Activabeheer", "Gestão de ativos", "Tillgångsförvaltning"),
    "Human Resources": ("Ressources humaines", "Menneskelige ressourcer", "Personalwesen", "Recursos humanos", "Risorse umane", "Personeelszaken", "Recursos humanos", "Personal"),
}

APP_FALLBACK_GROUP = {
    "commerce": "Commerce",
    "finance": "Financials and Accounting",
    "humanResources": "Human Resources",
    "projectOperations": "Project Management",
    "supplyChain": "General",
}

# The Asset Management table on page 52 straddles a column break: pdfplumber
# mixes the descriptions up. Values re-read from the PDF.
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

        # Overly long labels contain an explanatory parenthesis: strip it.
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
                "groupLabels": dict(zip(LANGUAGES, GROUPS[group])) if group in GROUPS else {},
                "licence": role["licence"],
                "page": role["page"],
            }
        )

    lines = [
        "import type { LicenceKey, Localized } from '../types';",
        "",
        "/**",
        " * Standard security roles published in the Dynamics 365 Licensing Guide,",
        " * together with the minimum licence each role requires.",
        " *",
        " * Generated by tools/generate_roles_ts.py from the official PDF. Do not edit",
        " * by hand: re-run the script after every new edition of the guide.",
        " *",
        " * Role names are kept in English: they are the product's security role names,",
        " * not translatable labels.",
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
        "  group: Localized;",
        "  licence: LicenceKey;",
        "  /** Licensing Guide page, for traceability. */",
        "  page: number;",
        "}",
        "",
        "export const STANDARD_ROLES: StandardRole[] = [",
    ]

    for entry in entries:
        group_parts = [f"en: '{escape(entry['group'])}'"]
        group_parts += [f"{code}: '{escape(label)}'" for code, label in entry["groupLabels"].items()]
        lines.append(
            "  {\n"
            f"    id: '{entry['id']}',\n"
            f"    name: '{escape(entry['name'])}',\n"
            f"    description: '{escape(entry['description'])}',\n"
            f"    app: '{entry['app']}',\n"
            f"    group: {{ {', '.join(group_parts)} }},\n"
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

    report = [f"roles written: {len(entries)}"]
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
