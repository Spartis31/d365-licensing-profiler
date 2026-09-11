import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectApi } from '../state/useProject';
import { ROLES_GUIDE_EDITION, STANDARD_ROLES } from '../data/standardRoles';
import type { RoleApp, StandardRole } from '../data/standardRoles';
import { localize } from '../types';
import { currentLanguage } from '../i18n';
import { LicenceTag } from '../components/LicenceTag';
import { GuideCard } from '../components/GuideCard';

type Row = { kind: 'group'; id: string; label: string } | { kind: 'role'; role: StandardRole };

const APPS: RoleApp[] = ['finance', 'supplyChain', 'commerce', 'humanResources', 'projectOperations'];

export function RolesView({ project, toggleStandardRole }: ProjectApi) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const [search, setSearch] = useState('');
  const [app, setApp] = useState<RoleApp | 'all'>('all');

  const rows = useMemo<Row[]>(() => {
    const needle = search.trim().toLowerCase();
    const result: Row[] = [];

    for (const currentApp of APPS) {
      if (app !== 'all' && app !== currentApp) continue;
      const roles = STANDARD_ROLES.filter(
        (role) =>
          role.app === currentApp &&
          (!needle ||
            role.name.toLowerCase().includes(needle) ||
            role.description.toLowerCase().includes(needle)),
      );
      if (roles.length === 0) continue;

      let group: string | null = null;
      const buffer: Row[] = [];
      for (const role of roles) {
        const label = localize(role.group, lang);
        if (label !== group) {
          group = label;
          buffer.push({ kind: 'group', id: `${currentApp}-${label}`, label: `${t(`licences.${currentApp}`)} — ${label}` });
        }
        buffer.push({ kind: 'role', role });
      }
      result.push(...buffer);
    }
    return result;
  }, [search, app, lang, t]);

  if (project.profiles.length === 0) {
    return (
      <section className="view">
        <header>
          <h2>{t('roles.heading')}</h2>
        </header>
        <div className="empty">
          <strong>{t('matrix.noProfiles')}</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      <header>
        <h2>{t('roles.heading')}</h2>
        <p className="intro">{t('roles.intro')}</p>
        <p className="hint">{t('roles.sourceNote', { edition: ROLES_GUIDE_EDITION })}</p>
      </header>

      <div className="toolbar">
        <input
          className="grow"
          type="search"
          value={search}
          placeholder={t('roles.search')}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={app} onChange={(e) => setApp(e.target.value as RoleApp | 'all')}>
          <option value="all">{t('roles.allApps')}</option>
          {APPS.map((item) => (
            <option key={item} value={item}>
              {t(`licences.${item}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap matrix-wrap" data-tour="selection-table">
        <table className="grid matrix-grid">
          <thead>
            <tr>
              <th className="sticky-col process-col">{t('roles.role')}</th>
              <th className="licence-col">{t('matrix.licence')}</th>
              {project.profiles.map((profile) => (
                <th key={profile.id} className="profile-head">
                  <span className="dept">{profile.department || '—'}</span>
                  <span className="name">{profile.name || t('common.unnamed')}</span>
                  <span className="count">{Object.keys(profile.standardRoles ?? {}).length}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.kind === 'group' ? (
                <tr key={row.id} className="domain-row">
                  <th className="sticky-col" colSpan={2}>
                    <span className="domain-toggle">{row.label}</span>
                  </th>
                  {project.profiles.map((profile) => (
                    <td key={profile.id} />
                  ))}
                </tr>
              ) : (
                <tr key={row.role.id}>
                  <td className="sticky-col process-col">
                    <span className="process-cell">
                      <span className="label">{row.role.name}</span>
                      <small className="note">{row.role.description}</small>
                    </span>
                  </td>
                  <td className="licence-col">
                    <LicenceTag licence={row.role.licence} />
                    <small className="src">p.{row.role.page}</small>
                  </td>
                  {project.profiles.map((profile) => {
                    const checked = Boolean(profile.standardRoles?.[row.role.id]);
                    return (
                      <td key={profile.id} className={`cell ${checked ? 'checked' : ''}`}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`${row.role.name} — ${profile.name || t('common.unnamed')}`}
                          onClick={() => toggleStandardRole(profile.id, row.role.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <GuideCard />
    </section>
  );
}
