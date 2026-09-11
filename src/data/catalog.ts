import type { DomainDefinition, LicenceRequirement, ProcessDefinition } from '../types';

/**
 * Standard business-process catalog, transcribed from the reference workbook
 * "Profiling_By_Business Process" (column B = process, column E = base licence).
 *
 * CATALOG_VERSION tracks the Microsoft Dynamics 365 Licensing Guide edition the
 * mapping was last reconciled against. Bump it whenever the guide is updated.
 */
export const CATALOG_VERSION = '2026-09';
export const DOMAINS: DomainDefinition[] = [
  {
    id: 'finance',
    label: { en: 'Finance', fr: 'Finance' },
    processes: [
      { id: 'fin-accounting', label: { en: 'Accounting', fr: 'Comptabilité générale' }, licence: 'finance' },
      { id: 'fin-ar', label: { en: 'Account receivable', fr: 'Comptabilité clients' }, licence: 'finance' },
      { id: 'fin-ap', label: { en: 'Account payable', fr: 'Comptabilité fournisseurs' }, licence: 'finance' },
      { id: 'fin-tax', label: { en: 'Taxes', fr: 'Taxes' }, licence: 'finance' },
      { id: 'fin-cost', label: { en: 'Cost accounting', fr: 'Comptabilité analytique' }, licence: 'finance' },
      { id: 'fin-collection', label: { en: 'Collection & payments', fr: 'Recouvrement et paiements' }, licence: 'finance' },
      { id: 'fin-audit', label: { en: 'Audit', fr: 'Audit' }, licence: 'finance' },
      { id: 'fin-tax-reporting', label: { en: 'Tax reporting', fr: 'Déclarations fiscales' }, licence: 'finance' },
      { id: 'fin-perf', label: { en: 'Accounting process performance', fr: 'Performance des processus comptables' }, licence: 'finance' },
      { id: 'fin-treasury', label: { en: 'Treasury', fr: 'Trésorerie' }, licence: 'finance' },
      {
        id: 'fin-reports',
        label: { en: 'Financial reports: view', fr: 'États financiers : consultation' },
        licence: 'teamMembers',
        source: 'Guide p.81',
      },
      {
        id: 'fin-reports-design',
        label: { en: 'Financial reports: design', fr: 'États financiers : conception' },
        licence: 'finance',
        source: 'Guide p.81',
      },
    ],
  },
  {
    id: 'budgeting',
    label: { en: 'Budgeting', fr: 'Budget' },
    processes: [
      { id: 'bud-plans', label: { en: 'Maintain budget plans in D365 Finance', fr: 'Gérer les plans budgétaires dans D365 Finance' }, licence: 'teamMembers' },
      { id: 'bud-register', label: { en: 'Budget register entries', fr: 'Écritures de registre budgétaire' }, licence: 'activity' },
      { id: 'bud-approve', label: { en: 'Approve budget plans and register entries', fr: 'Approuver les plans budgétaires et les écritures' }, licence: 'activity' },
      { id: 'bud-masterdata', label: { en: 'Budget master data and configuration', fr: 'Données de base et paramétrage budgétaires' }, licence: 'finance' },
      { id: 'bud-review', label: { en: 'Review budget process performance', fr: 'Analyser la performance du processus budgétaire' }, licence: 'finance' },
      {
        id: 'bpp-read',
        label: {
          en: 'Business performance planning (FP&A / xP&A): read only',
          fr: 'Business performance planning (FP&A / xP&A) : lecture seule',
        },
        licence: 'activity',
        source: 'Guide p.36',
      },
      {
        id: 'bpp-input',
        label: {
          en: 'Business performance planning: restricted access & inputs',
          fr: 'Business performance planning : accès restreint et saisies',
        },
        licence: 'activity',
        source: 'Guide p.36',
      },
      {
        id: 'bpp-admin',
        label: {
          en: 'Business performance planning: create plans, budgets, forecasts and financial analysis reports',
          fr: 'Business performance planning : créer plans, budgets, prévisions et rapports d’analyse financière',
        },
        licence: 'financePremium',
        source: 'Guide p.34 et p.36',
      },
      {
        id: 'bpa-read',
        label: {
          en: 'Business performance analytics: read only',
          fr: 'Business performance analytics : lecture seule',
        },
        licence: 'teamMembers',
        source: 'Guide p.36',
      },
      {
        id: 'bpa-reporting',
        label: {
          en: 'Business performance analytics: core reporting and insights',
          fr: 'Business performance analytics : reporting et insights',
        },
        licence: 'finance',
        source: 'Guide p.36',
      },
      {
        id: 'fin-ai',
        label: {
          en: 'AI and machine learning capabilities within D365 Finance',
          fr: 'Capacités IA et machine learning dans D365 Finance',
        },
        licence: 'finance',
        source: 'Guide p.36',
      },
    ],
  },
  {
    id: 'sales',
    label: { en: 'Sales', fr: 'Ventes' },
    processes: [
      { id: 'sal-quotes', label: { en: 'Processing sales quotes', fr: 'Traiter les devis de vente' }, licence: 'activity' },
      { id: 'sal-orders', label: { en: 'Processing sales orders', fr: 'Traiter les commandes client' }, licence: 'activity' },
      {
        id: 'sal-orders-edit',
        label: { en: 'Sales orders: edit only', fr: 'Commandes client : modification seule' },
        licence: 'teamMembers',
        note: {
          en: 'Custom security role required, restricted to editing existing orders',
          fr: 'Rôle de sécurité personnalisé requis, limité à la modification de commandes existantes',
        },
        source: 'Annexe D p.78',
      },
      { id: 'sal-invoicing', label: { en: 'Sales order invoicing', fr: 'Facturation des commandes client' }, licence: 'finance' },
      { id: 'sal-product-view', label: { en: 'Product management: view', fr: 'Gestion des produits : consultation' }, licence: 'teamMembers' },
      { id: 'sal-product-edit', label: { en: 'Product management: creation & update', fr: 'Gestion des produits : création et mise à jour' }, licence: 'supplyChain' },
      { id: 'sal-customer-view', label: { en: 'Customer master data: view', fr: 'Données de base clients : consultation' }, licence: 'teamMembers' },
      { id: 'sal-customer-edit', label: { en: 'Customer master data: creation & update', fr: 'Données de base clients : création et mise à jour' }, licence: 'supplyChain' },
      { id: 'sal-setup', label: { en: 'Maintain sales setup', fr: 'Gérer le paramétrage des ventes' }, licence: 'supplyChain' },
      { id: 'sal-reports', label: { en: 'Reports', fr: 'États et rapports' }, licence: 'teamMembers' },
      { id: 'sal-agreement-edit', label: { en: 'Sales agreements: creation & modification', fr: 'Contrats de vente : création et modification' }, licence: 'supplyChain' },
      { id: 'sal-agreement-view', label: { en: 'Sales agreements: view', fr: 'Contrats de vente : consultation' }, licence: 'teamMembers' },
      { id: 'sal-items', label: { en: 'Item creation', fr: "Création d'articles" }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'purchasing',
    label: { en: 'Purchasing', fr: 'Achats' },
    processes: [
      { id: 'pur-requisitions', label: { en: 'Processing purchase requisitions', fr: "Traiter les demandes d'achat" }, licence: 'teamMembers' },
      { id: 'pur-orders', label: { en: 'Processing purchase orders', fr: 'Traiter les commandes fournisseur' }, licence: 'activity' },
      { id: 'pur-receiving', label: { en: 'Receiving purchase orders', fr: 'Réceptionner les commandes fournisseur' }, licence: 'activity' },
      { id: 'pur-product', label: { en: 'Product management', fr: 'Gestion des produits' }, licence: 'supplyChain' },
      { id: 'pur-supplier-view', label: { en: 'Supplier master data: view', fr: 'Données de base fournisseurs : consultation' }, licence: 'teamMembers' },
      { id: 'pur-supplier-edit', label: { en: 'Supplier master data: creation & update', fr: 'Données de base fournisseurs : création et mise à jour' }, licence: 'supplyChain' },
      { id: 'pur-agreement-edit', label: { en: 'Purchase agreements: creation & modification', fr: "Contrats d'achat : création et modification" }, licence: 'supplyChain' },
      {
        id: 'pur-agreement-approve',
        label: { en: 'Purchase agreements: approve through workflow', fr: "Contrats d'achat : approbation par workflow" },
        licence: 'activity',
        source: 'Annexe G p.84',
      },
      { id: 'pur-agreement-view', label: { en: 'Purchase agreements: view', fr: "Contrats d'achat : consultation" }, licence: 'teamMembers' },
      { id: 'pur-approve', label: { en: 'Approve PR & PO workflows', fr: 'Approuver les workflows DA et CF' }, licence: 'teamMembers' },
      { id: 'pur-invoicing', label: { en: 'Purchase order invoicing', fr: 'Facturation des commandes fournisseur' }, licence: 'finance' },
    ],
  },
  {
    id: 'hr',
    label: { en: 'Human resources', fr: 'Ressources humaines' },
    processes: [
      { id: 'hr-ess', label: { en: 'Employee self-service: time, absence, personal info', fr: 'Libre-service collaborateur : temps, absences, informations personnelles' }, licence: 'teamMembers' },
      {
        id: 'hr-manager-ss',
        label: { en: 'Direct manager: time, absence, leave — creation & approval', fr: 'Manager direct : temps, absences, congés — saisie et approbation' },
        licence: 'teamMembers',
        note: { en: 'Supervisor in a reporting relationship with subordinates', fr: 'Responsable hiérarchique de collaborateurs rattachés' },
      },
      { id: 'hr-employee-info', label: { en: 'Maintain employee information', fr: 'Gérer les informations des collaborateurs' }, licence: 'humanResources' },
      { id: 'hr-performance', label: { en: 'Performance review', fr: 'Entretiens de performance' }, licence: 'humanResources' },
      { id: 'hr-payroll', label: { en: 'Payroll', fr: 'Paie' }, licence: 'humanResources' },
      { id: 'hr-compensation', label: { en: 'Compensation & benefits', fr: 'Rémunération et avantages' }, licence: 'humanResources' },
      { id: 'hr-training', label: { en: 'Training tasks', fr: 'Gestion des formations' }, licence: 'humanResources' },
    ],
  },
  {
    id: 'expenses',
    label: { en: 'Expenses', fr: 'Notes de frais' },
    processes: [
      { id: 'exp-create', label: { en: 'Expense creation', fr: 'Création de notes de frais' }, licence: 'teamMembers' },
      { id: 'exp-approve', label: { en: 'Expense approval', fr: 'Approbation des notes de frais' }, licence: 'teamMembers' },
      { id: 'exp-accounting', label: { en: 'Expense accounting', fr: 'Comptabilisation des notes de frais' }, licence: 'finance' },
      { id: 'exp-setup', label: { en: 'Setup', fr: 'Paramétrage' }, licence: 'finance' },
      { id: 'exp-report', label: { en: 'Expense reporting', fr: 'Reporting des notes de frais' }, licence: 'finance' },
    ],
  },
  {
    id: 'warehousing',
    label: { en: 'Warehousing', fr: 'Logistique / Entrepôt' },
    processes: [
      { id: 'whs-receiving', label: { en: 'Receiving', fr: 'Réception' }, licence: 'activity' },
      { id: 'whs-shipping', label: { en: 'Shipping', fr: 'Expédition' }, licence: 'activity' },
      { id: 'whs-device', label: { en: 'Shared device for the Warehouse Management app', fr: "Terminal partagé pour l'application Warehouse Management" }, licence: 'device', source: 'Guide p.61' },
      { id: 'whs-planning', label: { en: 'Planning', fr: 'Planification' }, licence: 'supplyChain' },
      {
        id: 'demand-planning-read',
        label: { en: 'Demand planning: read only', fr: 'Demand planning : lecture seule' },
        licence: 'supplyChain',
        source: 'Guide p.57',
      },
      {
        id: 'demand-planning-full',
        label: {
          en: 'Demand planning: create plans, forecasts and demand analysis reports',
          fr: 'Demand planning : créer plans, prévisions et rapports d’analyse de la demande',
        },
        licence: 'supplyChainPremium',
        source: 'Guide p.52 et p.57',
      },
      { id: 'whs-data', label: { en: 'Data management', fr: 'Gestion des données' }, licence: 'supplyChain' },
      { id: 'whs-review', label: { en: 'Review processes', fr: 'Analyse des processus' }, licence: 'supplyChain' },
      { id: 'whs-inventory', label: { en: 'Inventory: cost accounting, stock valuation', fr: 'Stocks : comptabilisation des coûts, valorisation' }, licence: 'supplyChain' },
      { id: 'whs-items', label: { en: 'Item creation', fr: "Création d'articles" }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'production',
    label: { en: 'Production', fr: 'Production' },
    processes: [
      { id: 'prd-time-classic', label: { en: 'Time registration (classic interface)', fr: 'Pointage (interface classique)' }, licence: 'teamMembers' },
      { id: 'prd-waves', label: { en: 'Production waves', fr: 'Vagues de production' }, licence: 'teamMembers' },
      { id: 'prd-device', label: { en: 'Shared device for the manufacturing execution interface', fr: "Terminal partagé pour l'interface d'exécution de fabrication" }, licence: 'device', source: 'Guide p.61' },
      { id: 'prd-mes-work', label: { en: 'Work on the manufacturing execution interface', fr: "Travailler sur l'interface d'exécution de fabrication" }, licence: 'activity' },
      {
        id: 'prd-mes-time',
        label: { en: 'Time registration on the manufacturing execution interface', fr: "Pointage sur l'interface d'exécution de fabrication" },
        licence: 'teamMembers',
        note: {
          en: 'Standard role "Time registration user"',
          fr: 'Rôle standard « Time registration user »',
        },
        source: 'Annexe D p.78 / p.54',
      },
      { id: 'prd-process-eng', label: { en: 'Process engineering', fr: 'Industrialisation des procédés' }, licence: 'supplyChain' },
      { id: 'prd-product-design', label: { en: 'Product design', fr: 'Conception produit' }, licence: 'supplyChain' },
      { id: 'prd-bom', label: { en: 'BOM: creation, update & approval', fr: 'Nomenclatures : création, mise à jour et approbation' }, licence: 'supplyChain' },
      { id: 'prd-route', label: { en: 'Route approval & master data', fr: 'Gammes : référentiel et approbation' }, licence: 'supplyChain' },
      { id: 'prd-supervisor', label: { en: 'Production supervisor', fr: 'Superviseur de production' }, licence: 'supplyChain' },
      { id: 'prd-items', label: { en: 'Set up new items', fr: 'Création de nouveaux articles' }, licence: 'supplyChain' },
      { id: 'prd-mrp', label: { en: 'MRP', fr: 'Calcul des besoins (MRP)' }, licence: 'supplyChain' },
      { id: 'prd-planned-orders', label: { en: 'Planned orders', fr: 'Ordres planifiés' }, licence: 'supplyChain' },
      { id: 'prd-planner', label: { en: 'Production planner', fr: 'Planificateur de production' }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'maintenance',
    label: { en: 'Asset management', fr: 'Gestion des actifs' },
    processes: [
      { id: 'mnt-request', label: { en: 'Maintenance request creation', fr: 'Création de demandes de maintenance' }, licence: 'teamMembers' },
      { id: 'mnt-work-orders', label: { en: 'Work order creation & processing', fr: 'Création et traitement des ordres de travail' }, licence: 'activity' },
      { id: 'mnt-budget', label: { en: 'Back office: maintain budget', fr: 'Back-office : gestion du budget' }, licence: 'supplyChain' },
      { id: 'mnt-masterdata', label: { en: 'Back office: maintain master data', fr: 'Back-office : gestion des données de base' }, licence: 'supplyChain' },
      { id: 'mnt-setup', label: { en: 'Back office: maintain setup', fr: 'Back-office : gestion du paramétrage' }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'engineering',
    label: { en: 'Engineering', fr: 'Bureau d’études' },
    processes: [
      { id: 'eng-technical-data', label: { en: 'Technical data', fr: 'Données techniques' }, licence: 'supplyChain' },
      { id: 'eng-product-design', label: { en: 'Product design', fr: 'Conception produit' }, licence: 'supplyChain' },
      { id: 'eng-supervisor', label: { en: 'Production supervisor', fr: 'Superviseur de production' }, licence: 'supplyChain' },
      { id: 'eng-planner', label: { en: 'Production planner', fr: 'Planificateur de production' }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'quality',
    label: { en: 'Quality', fr: 'Qualité' },
    processes: [
      { id: 'qly-inquiries', label: { en: 'Respond to quality control inquiries', fr: 'Répondre aux demandes de contrôle qualité' }, licence: 'teamMembers' },
      { id: 'qly-inspection', label: { en: 'Quality inspection', fr: 'Inspection qualité' }, licence: 'teamMembers' },
      {
        id: 'qly-approve-nonconformance',
        label: { en: 'Approve nonconformance', fr: 'Approuver les non-conformités' },
        licence: 'supplyChain',
        source: 'Annexe G p.84',
      },
      { id: 'qly-masterdata', label: { en: 'Maintain master data and setup', fr: 'Gérer les données de base et le paramétrage' }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'transportation',
    label: { en: 'Transportation', fr: 'Transport' },
    processes: [
      { id: 'trn-planning', label: { en: 'Maintain planning and master data', fr: 'Gérer la planification et les données de base' }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'marketing',
    label: { en: 'Marketing', fr: 'Marketing' },
    processes: [
      { id: 'mkt-campaigns', label: { en: 'Campaigns', fr: 'Campagnes' }, licence: 'supplyChain' },
      { id: 'mkt-contacts', label: { en: 'Contacts', fr: 'Contacts' }, licence: 'supplyChain' },
      { id: 'mkt-leads', label: { en: 'Leads and opportunities', fr: 'Pistes et opportunités' }, licence: 'supplyChain' },
    ],
  },
  {
    id: 'it',
    label: { en: 'IT', fr: 'Informatique' },
    processes: [
      { id: 'it-data', label: { en: 'Data management', fr: 'Gestion des données' }, licence: 'fullCrossApps' },
      { id: 'it-sysadmin', label: { en: 'System administrator', fr: 'Administrateur système' }, licence: 'fullCrossApps' },
      { id: 'it-secadmin', label: { en: 'Security administrator', fr: 'Administrateur de sécurité' }, licence: 'fullCrossApps' },
      { id: 'it-er', label: { en: 'Electronic reporting', fr: 'Reporting électronique (ER)' }, licence: 'fullCrossApps' },
    ],
  },
  {
    id: 'retail',
    label: { en: 'Retail / Commerce', fr: 'Retail / Commerce' },
    processes: [
      { id: 'rtl-backoffice', label: { en: 'Back office', fr: 'Back-office' }, licence: 'commerce' },
      { id: 'rtl-ho-stores', label: { en: 'Head office: configuring stores, registers and staff', fr: 'Siège : paramétrage des magasins, caisses et personnel' }, licence: 'commerce' },
      { id: 'rtl-ho-products', label: { en: 'Head office: maintain and replenish retail products and assortments', fr: 'Siège : gestion et réapprovisionnement des produits et assortiments' }, licence: 'commerce' },
      { id: 'rtl-catalog', label: { en: 'Catalogue creation / publication', fr: 'Création / publication de catalogues' }, licence: 'commerce' },
      { id: 'rtl-store-sales', label: { en: 'Store: sales and purchasing', fr: 'Magasin : ventes et achats' }, licence: 'activity' },
      { id: 'rtl-store-reports', label: { en: 'Store: sales reports, movement reports, stock counts', fr: 'Magasin : rapports de ventes, mouvements, inventaires' }, licence: 'activity' },
      { id: 'rtl-store-whs', label: { en: 'Store warehousing: picking, receiving, stock counting', fr: 'Magasin, logistique : prélèvement, réception, inventaire' }, licence: 'teamMembers' },
      { id: 'rtl-pos-device', label: { en: 'Shared device for the POS', fr: 'Terminal partagé pour le point de vente (POS)' }, licence: 'device', source: 'Guide p.61' },
      {
        id: 'rtl-store-manager-device',
        label: { en: 'Shared store manager device', fr: 'Terminal partagé de responsable de magasin' },
        licence: 'device',
        source: 'Guide p.61',
      },
    ],
  },
  {
    id: 'project',
    label: { en: 'Project', fr: 'Projet' },
    processes: [
      { id: 'prj-creation', label: { en: 'Project creation / administration', fr: 'Création / administration de projets' }, licence: 'projectOperations' },
      { id: 'prj-resources', label: { en: 'Resource management', fr: 'Gestion des ressources' }, licence: 'projectOperations' },
      { id: 'prj-forecast', label: { en: 'Forecasting / budget', fr: 'Prévisions / budget' }, licence: 'projectOperations' },
      { id: 'prj-sales', label: { en: 'Project sales', fr: 'Ventes de projet' }, licence: 'projectOperations' },
      { id: 'prj-invoicing', label: { en: 'Project invoicing', fr: 'Facturation de projet' }, licence: 'projectOperations' },
      { id: 'prj-accounting', label: { en: 'Project accounting', fr: 'Comptabilité de projet' }, licence: 'projectOperations' },
      { id: 'prj-timesheet-mobile', label: { en: 'Project timesheet mobile application', fr: 'Application mobile de feuilles de temps' }, licence: 'teamMembers' },
      { id: 'prj-time-expenses', label: { en: 'Time / expense entry & approval', fr: 'Saisie et approbation des temps et frais' }, licence: 'teamMembers' },
      { id: 'prj-time-approval', label: { en: 'Time approval', fr: 'Approbation des temps' }, licence: 'teamMembers' },
    ],
  },
];

export const CUSTOM_DOMAIN_ID = 'custom';

const PROCESS_INDEX = new Map<string, ProcessDefinition>();
for (const domain of DOMAINS) {
  for (const process of domain.processes) {
    PROCESS_INDEX.set(process.id, process);
  }
}

export function getCatalogProcess(id: string): ProcessDefinition | undefined {
  return PROCESS_INDEX.get(id);
}

export function catalogLicence(id: string): LicenceRequirement | undefined {
  return PROCESS_INDEX.get(id)?.licence;
}
