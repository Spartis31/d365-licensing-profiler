import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BaseLicence, Project } from '../types';
import { BASE_LICENCES } from '../types';
import { computeProject } from '../engine/licensing';
import type { LicenceTotals, ProfileResult } from '../engine/licensing';
import { IconWarning } from '../components/icons';
import { LicenceTag } from '../components/LicenceTag';

const ADDITIONAL = ['activity', 'teamMembers', 'device'] as const;

interface Line {
  key: string;
  label: string;
  value: number;
  attach: boolean;
  licence: BaseLicence | (typeof ADDITIONAL)[number];
}

function useLines(totals: LicenceTotals) {
  const { t } = useTranslation();
  return useMemo(() => {
    const base: Line[] = BASE_LICENCES.map((key) => ({
      key: `base-${key}`,
      label: t(`licences.${key}`),
      value: totals.base[key],
      attach: false,
      licence: key,
    }));
    const attach: Line[] = BASE_LICENCES.map((key) => ({
      key: `attach-${key}`,
      label: t(`licencesAttach.${key}`),
      value: totals.attach[key],
      attach: true,
      licence: key,
    }));
    const extra: Line[] = ADDITIONAL.map((key) => ({
      key,
      label: t(`licences.${key}`),
      value: totals[key],
      attach: false,
      licence: key,
    }));
    return { base, attach, extra };
  }, [totals, t]);
}

function Section({ title, lines, max, showZeros }: { title: string; lines: Line[]; max: number; showZeros: boolean }) {
  const visible = showZeros ? lines : lines.filter((line) => line.value > 0);
  if (visible.length === 0) return null;
  return (
    <>
      <tr className="section-row">
        <th colSpan={2}>{title}</th>
      </tr>
      {visible.map((line) => (
        <tr key={line.key} className={line.value === 0 ? 'zero' : ''}>
          <td>{line.label}</td>
          <td className="num">
            <span className="qty">
              <span className="bar">
                <i data-licence={line.licence} style={{ width: max > 0 ? `${(line.value / max) * 100}%` : 0 }} />
              </span>
              <strong>{line.value}</strong>
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}

function describe(result: ProfileResult) {
  const parts: Array<{ licence: BaseLicence | (typeof ADDITIONAL)[number]; attach: boolean; qty: number }> = [];
  for (const key of BASE_LICENCES) {
    if (result.baseByProduct[key] > 0) parts.push({ licence: key, attach: false, qty: result.baseByProduct[key] });
  }
  for (const key of BASE_LICENCES) {
    if (result.attachByProduct[key] > 0) parts.push({ licence: key, attach: true, qty: result.attachByProduct[key] });
  }
  for (const key of ADDITIONAL) {
    if (result[key] > 0) parts.push({ licence: key, attach: false, qty: result[key] });
  }
  return parts;
}

export function ResultsView({ project }: { project: Project }) {
  const { t } = useTranslation();
  const [showZeros, setShowZeros] = useState(false);
  const result = useMemo(() => computeProject(project), [project]);
  const { base, attach, extra } = useLines(result.totals);

  if (project.profiles.length === 0) {
    return (
      <section className="view">
        <header>
          <h2>{t('results.heading')}</h2>
        </header>
        <div className="empty">
          <strong>{t('results.empty')}</strong>
        </div>
      </section>
    );
  }

  // Only the active mode's input counts, so an untouched mode must say so
  // rather than render a table of zeros.
  const hasInput = project.profiles.some((profile) =>
    project.profilingMode === 'roles'
      ? Object.keys(profile.standardRoles ?? {}).length > 0
      : Object.keys(profile.selections).length > 0,
  );

  if (!hasInput) {
    return (
      <section className="view">
        <header>
          <h2>{t('results.heading')}</h2>
        </header>
        <div className="empty">
          <strong>{t(`results.emptyInput_${project.profilingMode}`)}</strong>
        </div>
      </section>
    );
  }

  const namedUsers = result.totals.totalBase + result.totals.activity + result.totals.teamMembers;
  const max = Math.max(...[...base, ...attach, ...extra].map((line) => line.value), 1);
  const fullUsers = result.totals.totalBase;

  return (
    <section className="view">
      <header>
        <h2>{t('results.heading')}</h2>
      </header>

      <div className="notice warn" role="note">
        <IconWarning />
        <div className="notice-body">
          <strong>{t('results.caveatTitle')}</strong>
          <ol>
            <li>{t('results.caveatGuide')}</li>
            <li>{t('results.caveatProduction')}</li>
          </ol>
        </div>
      </div>

      <div className="kpi-row" data-tour="results-summary">
        <div className="kpi accent">
          <span className="kpi-value">{namedUsers}</span>
          <span className="kpi-label">{t('results.totalUsers')}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{fullUsers}</span>
          <span className="kpi-label">{t('results.fullUsers')}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{result.totals.totalAddOn}</span>
          <span className="kpi-label">{t('results.attachTotal')}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{result.totals.device}</span>
          <span className="kpi-label">{t('results.totalDevices')}</span>
        </div>
      </div>

      <div className="toolbar">
        <label className="checkbox">
          <input type="checkbox" checked={showZeros} onChange={(e) => setShowZeros(e.target.checked)} />
          <span>{t('results.showZeros')}</span>
        </label>
      </div>

      <div className="results-columns">
        <div className="table-wrap">
          <table className="grid summary-grid">
            <thead>
              <tr>
                <th>{t('results.licence')}</th>
                <th className="num">{t('results.quantity')}</th>
              </tr>
            </thead>
            <tbody>
              <Section title={t('results.baseLicences')} lines={base} max={max} showZeros={showZeros} />
              <Section title={t('results.attachLicences')} lines={attach} max={max} showZeros={showZeros} />
              <Section title={t('results.additionalLicences')} lines={extra} max={max} showZeros={showZeros} />
            </tbody>
          </table>
        </div>

        <div>
          <div className="table-wrap">
            <table className="grid summary-grid">
              <thead>
                <tr>
                  <th>{t('results.profile')}</th>
                  <th className="num">{t('results.users')}</th>
                  <th>{t('results.result')}</th>
                </tr>
              </thead>
              <tbody>
                {result.profiles.map((profileResult) => {
                  const profile = project.profiles.find((p) => p.id === profileResult.profileId);
                  const parts = describe(profileResult);
                  return (
                    <tr key={profileResult.profileId}>
                      <td>
                        <strong>{profile?.name || t('common.unnamed')}</strong>
                        {profile?.department && <small className="note">{profile.department}</small>}
                      </td>
                      <td className="num">{profileResult.totalUsers}</td>
                      <td>
                        {parts.length === 0 ? (
                          <span className="tag tag-none">{t('results.none')}</span>
                        ) : (
                          <span className="licence-list">
                            {parts.map((part) => (
                              <span key={`${part.licence}-${part.attach}`}>
                                <LicenceTag licence={part.licence} attach={part.attach} /> ×{part.qty}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h3>{t('results.byLegalEntity')}</h3>
      <p className="hint">{t('results.byLegalEntityHint')}</p>
      <div className="table-wrap">
        <table className="grid summary-grid">
          <thead>
            <tr>
              <th>{t('results.licence')}</th>
              {project.legalEntities.map((entity) => (
                <th key={entity.id} className="num">
                  {entity.name || '—'}
                </th>
              ))}
              <th className="num total">{t('results.grandTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {[...base, ...attach, ...extra]
              .filter((line) => showZeros || line.value > 0)
              .map((line) => (
                <tr key={`le-${line.key}`}>
                  <td>{line.label}</td>
                  {project.legalEntities.map((entity) => {
                    const totals = result.byLegalEntity[entity.id];
                    const value = !totals
                      ? 0
                      : line.key.startsWith('base-')
                        ? totals.base[line.licence as BaseLicence]
                        : line.key.startsWith('attach-')
                          ? totals.attach[line.licence as BaseLicence]
                          : totals[line.licence as (typeof ADDITIONAL)[number]];
                    return (
                      <td key={entity.id} className="num">
                        {value}
                      </td>
                    );
                  })}
                  <td className="num total">{line.value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
