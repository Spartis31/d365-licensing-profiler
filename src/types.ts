import type { LanguageCode } from './i18n/languages';

/**
 * Base licences, **ordered by base-allocation priority**.
 *
 * The Licensing Guide (p.6) states that the base licence must be the highest
 * priced application for a given user. List prices in the September 2026 guide:
 * Supply Chain Premium $300, Finance Premium $300, Supply Chain $210,
 * Commerce $210, Finance $210, Project Operations $135, Human Resources $135.
 *
 * Order within a price tier is arbitrary but cost-neutral for the base licence,
 * since tied applications carry the same price. Attach prices are not published
 * in the guide, so ties cannot be broken any further.
 *
 * `fullCrossApps` is not a Microsoft SKU: it flags cross-application
 * administration work (system admin, data management) that requires a full
 * licence whose application depends on what the tenant runs. It ranks last so
 * it never steals the base licence from an identified application.
 */
export const BASE_LICENCES = [
  'supplyChainPremium',
  'financePremium',
  'supplyChain',
  'commerce',
  'finance',
  'projectOperations',
  'humanResources',
  'fullCrossApps',
] as const;

/** Premium editions supersede their standard sibling: the superset absorbs it. */
export const PREMIUM_OF = {
  supplyChainPremium: 'supplyChain',
  financePremium: 'finance',
} as const;

export const ADDITIONAL_LICENCES = ['activity', 'teamMembers', 'device'] as const;

/**
 * The two mutually exclusive ways of profiling a user. Both inputs are kept in
 * the project so the user can switch back and forth, but only the active one
 * feeds the licence computation.
 */
export const PROFILING_MODES = ['processes', 'roles'] as const;
export type ProfilingMode = (typeof PROFILING_MODES)[number];

export type BaseLicence = (typeof BASE_LICENCES)[number];
export type AdditionalLicence = (typeof ADDITIONAL_LICENCES)[number];
export type LicenceKey = BaseLicence | AdditionalLicence;

/** A process row may carry no licence requirement at all (informational rows). */
export type LicenceRequirement = LicenceKey | null;

/** English is mandatory and acts as the fallback for any missing translation. */
export type Localized = { en: string } & Partial<Record<LanguageCode, string>>;

export function localize(value: Localized, lang: LanguageCode): string {
  return value[lang] ?? value.en;
}

export interface ProcessDefinition {
  id: string;
  label: Localized;
  licence: LicenceRequirement;
  note?: Localized;
  /** Reference in the Licensing Guide, for traceability. */
  source?: string;
}

export interface DomainDefinition {
  id: string;
  label: Localized;
  processes: ProcessDefinition[];
}

/** A process added by the user on top of the standard catalog. */
export interface CustomProcess {
  id: string;
  domainId: string;
  label: string;
  licence: LicenceRequirement;
  /** GitHub account of the author; informational, never required to reimport. */
  author?: string;
  createdAt?: string;
}

export interface LegalEntity {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  department: string;
  name: string;
  description: string;
  /** legalEntityId -> number of users */
  counts: Record<string, number>;
  /** processId -> true when the profile performs that process */
  selections: Record<string, boolean>;
  /** Standard security role ids assigned to the profile. */
  standardRoles: Record<string, boolean>;
}

export interface ProjectMeta {
  name: string;
  customer: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_FILE_VERSION = 1;

export interface Project {
  fileFormat: 'd365-licensing-profiler';
  version: number;
  meta: ProjectMeta;
  /** Which of `Profile.selections` / `Profile.standardRoles` drives the result. */
  profilingMode: ProfilingMode;
  legalEntities: LegalEntity[];
  profiles: Profile[];
  customProcesses: CustomProcess[];
}
