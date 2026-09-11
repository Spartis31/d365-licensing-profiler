import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomProcess, LegalEntity, Profile, ProfilingMode, Project } from '../types';
import { createLegalEntity, createProfile, createProject, newId, parseProject } from './project';

const STORAGE_KEY = 'd365lic.project';

function loadFromStorage(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createProject();
    return parseProject(JSON.parse(raw));
  } catch {
    return createProject();
  }
}

export function useProject() {
  const [project, setProject] = useState<Project>(loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Quota exceeded or storage disabled: the user can still export a file.
    }
  }, [project]);

  const patch = useCallback((updater: (draft: Project) => Project) => {
    setProject((current) => {
      const next = updater(current);
      return { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const api = useMemo(
    () => ({
      replace: (next: Project) => setProject(next),
      reset: () => setProject(createProject()),

      updateMeta: (changes: Partial<Project['meta']>) =>
        patch((p) => ({ ...p, meta: { ...p.meta, ...changes } })),

      // Switching mode never clears the other mode's data.
      setProfilingMode: (profilingMode: ProfilingMode) => patch((p) => ({ ...p, profilingMode })),

      addLegalEntity: () => patch((p) => ({ ...p, legalEntities: [...p.legalEntities, createLegalEntity()] })),

      updateLegalEntity: (id: string, changes: Partial<LegalEntity>) =>
        patch((p) => ({
          ...p,
          legalEntities: p.legalEntities.map((e) => (e.id === id ? { ...e, ...changes } : e)),
        })),

      removeLegalEntity: (id: string) =>
        patch((p) => ({
          ...p,
          legalEntities: p.legalEntities.filter((e) => e.id !== id),
          profiles: p.profiles.map((profile) => {
            const { [id]: _removed, ...counts } = profile.counts;
            return { ...profile, counts };
          }),
        })),

      addProfile: () => patch((p) => ({ ...p, profiles: [...p.profiles, createProfile()] })),

      duplicateProfile: (id: string) =>
        patch((p) => {
          const source = p.profiles.find((profile) => profile.id === id);
          if (!source) return p;
          const copy: Profile = {
            ...source,
            id: newId('p'),
            counts: { ...source.counts },
            selections: { ...source.selections },
            standardRoles: { ...source.standardRoles },
          };
          const index = p.profiles.findIndex((profile) => profile.id === id);
          const profiles = [...p.profiles];
          profiles.splice(index + 1, 0, copy);
          return { ...p, profiles };
        }),

      updateProfile: (id: string, changes: Partial<Profile>) =>
        patch((p) => ({ ...p, profiles: p.profiles.map((x) => (x.id === id ? { ...x, ...changes } : x)) })),

      setCount: (profileId: string, entityId: string, value: number) =>
        patch((p) => ({
          ...p,
          profiles: p.profiles.map((x) =>
            x.id === profileId ? { ...x, counts: { ...x.counts, [entityId]: value } } : x,
          ),
        })),

      toggleSelection: (profileId: string, processId: string) =>
        patch((p) => ({
          ...p,
          profiles: p.profiles.map((x) => {
            if (x.id !== profileId) return x;
            const selections = { ...x.selections };
            if (selections[processId]) delete selections[processId];
            else selections[processId] = true;
            return { ...x, selections };
          }),
        })),

      toggleStandardRole: (profileId: string, roleId: string) =>
        patch((p) => ({
          ...p,
          profiles: p.profiles.map((x) => {
            if (x.id !== profileId) return x;
            const standardRoles = { ...x.standardRoles };
            if (standardRoles[roleId]) delete standardRoles[roleId];
            else standardRoles[roleId] = true;
            return { ...x, standardRoles };
          }),
        })),

      removeProfile: (id: string) => patch((p) => ({ ...p, profiles: p.profiles.filter((x) => x.id !== id) })),
      addCustomProcess: (process: Omit<CustomProcess, 'id' | 'createdAt'>) =>
        patch((p) => ({
          ...p,
          customProcesses: [
            ...p.customProcesses,
            { ...process, id: newId('cp'), createdAt: new Date().toISOString() },
          ],
        })),

      removeCustomProcess: (id: string) =>
        patch((p) => ({
          ...p,
          customProcesses: p.customProcesses.filter((x) => x.id !== id),
          profiles: p.profiles.map((profile) => {
            const { [id]: _removed, ...selections } = profile.selections;
            return { ...profile, selections };
          }),
        })),
    }),
    [patch],
  );

  return { project, ...api };
}

export type ProjectApi = ReturnType<typeof useProject>;
