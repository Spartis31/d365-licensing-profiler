import { PROFILING_MODES, PROJECT_FILE_VERSION } from '../types';
import type { CustomProcess, LegalEntity, Profile, ProfilingMode, Project } from '../types';

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createProfile(): Profile {
  return { id: newId('p'), department: '', name: '', description: '', counts: {}, selections: {}, standardRoles: {} };
}

export function createLegalEntity(name = ''): LegalEntity {
  return { id: newId('le'), name };
}

export function createProject(): Project {
  const now = new Date().toISOString();
  return {
    fileFormat: 'd365-licensing-profiler',
    version: PROJECT_FILE_VERSION,
    meta: {
      name: '',
      customer: '',
      author: '',
      createdAt: now,
      updatedAt: now,
    },
    profilingMode: 'processes',
    legalEntities: [createLegalEntity()],
    profiles: [createProfile()],
    customProcesses: [],
  };
}

/** Narrow, defensive parsing of an untrusted project file. */
export function parseProject(raw: unknown): Project {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid file');
  const source = raw as Record<string, unknown>;
  if (source.fileFormat !== 'd365-licensing-profiler') throw new Error('Not a D365 Licensing Profiler file');
  if (typeof source.version !== 'number' || source.version > PROJECT_FILE_VERSION) {
    throw new Error('This file was produced by a newer version of the tool');
  }

  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const legalEntities = Array.isArray(source.legalEntities) ? source.legalEntities : [];
  const profiles = Array.isArray(source.profiles) ? source.profiles : [];
  const customProcesses = Array.isArray(source.customProcesses) ? source.customProcesses : [];

  const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

  const cleanEntities: LegalEntity[] = legalEntities.map((entry) => {
    const e = entry as Record<string, unknown>;
    return { id: str(e.id, newId('le')), name: str(e.name) };
  });
  const entityIds = new Set(cleanEntities.map((e) => e.id));

  const cleanCustom: CustomProcess[] = customProcesses.map((entry) => {
    const c = entry as Record<string, unknown>;
    return {
      id: str(c.id, newId('cp')),
      domainId: str(c.domainId, 'custom'),
      label: str(c.label),
      licence: (typeof c.licence === 'string' ? c.licence : null) as CustomProcess['licence'],
      // Authorship is metadata only: a customer without it must still reimport.
      author: typeof c.author === 'string' ? c.author : undefined,
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : undefined,
    };
  });

  const cleanProfiles: Profile[] = profiles.map((entry) => {
    const p = entry as Record<string, unknown>;
    const counts: Record<string, number> = {};
    if (typeof p.counts === 'object' && p.counts !== null) {
      for (const [key, value] of Object.entries(p.counts as Record<string, unknown>)) {
        if (!entityIds.has(key)) continue;
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) counts[key] = Math.floor(n);
      }
    }
    const selections: Record<string, boolean> = {};
    if (typeof p.selections === 'object' && p.selections !== null) {
      for (const [key, value] of Object.entries(p.selections as Record<string, unknown>)) {
        if (value === true) selections[key] = true;
      }
    }
    const standardRoles: Record<string, boolean> = {};
    if (typeof p.standardRoles === 'object' && p.standardRoles !== null) {
      for (const [key, value] of Object.entries(p.standardRoles as Record<string, unknown>)) {
        if (value === true) standardRoles[key] = true;
      }
    }
    return {
      id: str(p.id, newId('p')),
      department: str(p.department),
      name: str(p.name),
      description: str(p.description),
      counts,
      selections,
      standardRoles,
    };
  });

  return {
    fileFormat: 'd365-licensing-profiler',
    version: PROJECT_FILE_VERSION,
    meta: {
      name: str(meta.name),
      customer: str(meta.customer),
      author: str(meta.author),
      createdAt: str(meta.createdAt, new Date().toISOString()),
      updatedAt: str(meta.updatedAt, new Date().toISOString()),
    },
    // Files written before the mode existed were process-based.
    profilingMode: PROFILING_MODES.includes(source.profilingMode as ProfilingMode)
      ? (source.profilingMode as ProfilingMode)
      : 'processes',
    legalEntities: cleanEntities.length > 0 ? cleanEntities : [createLegalEntity()],
    profiles: cleanProfiles,
    customProcesses: cleanCustom,
  };
}
