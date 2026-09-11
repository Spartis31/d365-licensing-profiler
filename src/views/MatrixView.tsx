import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectApi } from '../state/useProject';
import { CUSTOM_DOMAIN_ID, DOMAINS } from '../data/catalog';
import type { LicenceRequirement } from '../types';
import { ADDITIONAL_LICENCES, BASE_LICENCES, localize } from '../types';
import { currentLanguage } from '../i18n';
import { LicenceTag } from '../components/LicenceTag';
import { useIdentity } from '../auth/identity';
import { SignInModal } from '../components/SignInModal';
import { newRequestUrl } from '../data/governance';

interface ProcessRow {
  id: string;
  label: string;
  note?: string;
  source?: string;
  licence: LicenceRequirement;
  custom: boolean;
  author?: string;
}

interface DomainBlock {
  id: string;
  label: string;
  processes: ProcessRow[];
}

const LICENCE_OPTIONS: LicenceRequirement[] = [...BASE_LICENCES, ...ADDITIONAL_LICENCES, null];

export function MatrixView({ project, toggleSelection, addCustomProcess, removeCustomProcess }: ProjectApi) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const identity = useIdentity();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [wantsTranslation, setWantsTranslation] = useState(false);
  const [search, setSearch] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCustom, setShowCustom] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftDomain, setDraftDomain] = useState(DOMAINS[0].id);
  const [draftLicence, setDraftLicence] = useState<LicenceRequirement>('finance');

  const blocks = useMemo<DomainBlock[]>(() => {
    const customByDomain = new Map<string, typeof project.customProcesses>();
    for (const custom of project.customProcesses) {
      const list = customByDomain.get(custom.domainId) ?? [];
      list.push(custom);
      customByDomain.set(custom.domainId, list);
    }

    const needle = search.trim().toLowerCase();
    const anySelected = (id: string) => project.profiles.some((p) => p.selections[id]);
    const keep = (label: string, id: string) => {
      if (onlySelected && !anySelected(id)) return false;
      return !needle || label.toLowerCase().includes(needle);
    };

    const result: DomainBlock[] = [];
    for (const domain of DOMAINS) {
      const processes: ProcessRow[] = [];
      for (const process of domain.processes) {
        const label = localize(process.label, lang);
        if (!keep(label, process.id)) continue;
        processes.push({
          id: process.id,
          label,
          note: process.note ? localize(process.note, lang) : undefined,
          source: process.source,
          licence: process.licence,
          custom: false,
        });
      }
      for (const custom of customByDomain.get(domain.id) ?? []) {
        if (!keep(custom.label, custom.id)) continue;
        processes.push({
          id: custom.id,
          label: custom.label,
          licence: custom.licence,
          custom: true,
          author: custom.author,
        });
      }
      if (processes.length > 0) result.push({ id: domain.id, label: localize(domain.label, lang), processes });
    }

    const orphans: ProcessRow[] = (customByDomain.get(CUSTOM_DOMAIN_ID) ?? [])
      .filter((custom) => keep(custom.label, custom.id))
      .map((custom) => ({
        id: custom.id,
        label: custom.label,
        licence: custom.licence,
        custom: true,
        author: custom.author,
      }));
    if (orphans.length > 0) {
      result.push({ id: CUSTOM_DOMAIN_ID, label: t('matrix.customDomain'), processes: orphans });
    }
    return result;
  }, [project.customProcesses, project.profiles, search, onlySelected, lang, t]);

  if (project.profiles.length === 0) {
    return (
      <section className="view">
        <header>
          <h2>{t('matrix.heading')}</h2>
        </header>
        <div className="empty">
          <strong>{t('matrix.noProfiles')}</strong>
        </div>
      </section>
    );
  }

  const totalShown = blocks.reduce((sum, block) => sum + block.processes.length, 0);
  const allCollapsed = blocks.length > 0 && blocks.every((block) => collapsed[block.id]);

  return (
    <section className="view">
      <header>
        <h2>{t('matrix.heading')}</h2>
        <p className="intro">{t('matrix.intro')}</p>
      </header>

      <div className="toolbar">
        <input
          className="grow"
          type="search"
          value={search}
          placeholder={t('matrix.search')}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="checkbox">
          <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />
          <span>{t('actions.onlySelected')}</span>
        </label>
        <button
          type="button"
          onClick={() => setCollapsed(allCollapsed ? {} : Object.fromEntries(blocks.map((b) => [b.id, true])))}
        >
          {allCollapsed ? t('actions.expandAll') : t('actions.collapseAll')}
        </button>
        <span className="spacer" />
        <span className="hint">{t('matrix.shown', { count: totalShown })}</span>
      </div>

      <div className="table-wrap matrix-wrap" data-tour="selection-table">
        <table className="grid matrix-grid">
          <thead>
            <tr>
              <th className="sticky-col process-col">{t('matrix.process')}</th>
              <th className="licence-col">{t('matrix.licence')}</th>
              {project.profiles.map((profile) => (
                <th key={profile.id} className="profile-head">
                  <span className="dept">{profile.department || '—'}</span>
                  <span className="name">{profile.name || t('common.unnamed')}</span>
                  <span className="count">{Object.keys(profile.selections).length}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              const isCollapsed = Boolean(collapsed[block.id]);
              const picked = block.processes.filter((row) =>
                project.profiles.some((p) => p.selections[row.id]),
              ).length;
              return (
                <Fragment key={block.id}>
                  <tr className="domain-row">
                    <th className="sticky-col" colSpan={2}>
                      <button
                        type="button"
                        className={`domain-toggle ${isCollapsed ? 'collapsed' : ''}`}
                        aria-expanded={!isCollapsed}
                        onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !c[block.id] }))}
                      >
                        <span className="chev">▾</span>
                        <span>{block.label}</span>
                        <span className="pill">
                          {picked}/{block.processes.length}
                        </span>
                      </button>
                    </th>
                    {project.profiles.map((profile) => (
                      <td key={profile.id} />
                    ))}
                  </tr>
                  {!isCollapsed &&
                    block.processes.map((row) => (
                      <tr key={row.id}>
                        <td className="sticky-col process-col">
                          <span className="process-cell">
                            <span className="label">
                              {row.custom && (
                                <span className="custom-badge" title={t('matrix.customBadge')}>
                                  <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
                                    <path
                                      fill="currentColor"
                                      d="M8 1l1.9 4.2 4.6.5-3.4 3.1 1 4.5L8 11l-4.1 2.3 1-4.5L1.5 5.7l4.6-.5z"
                                    />
                                  </svg>
                                  {t('matrix.customBadge')}
                                </span>
                              )}
                              {row.label}
                            </span>
                            {row.note && <small className="note">{row.note}</small>}
                            {row.source && <small className="src">{row.source}</small>}
                            {row.author && <small className="src">{t('matrix.customBy', { alias: row.author })}</small>}
                          </span>
                          {row.custom && (
                            <button
                              type="button"
                              className="ghost danger icon"
                              title={t('actions.remove')}
                              onClick={() => removeCustomProcess(row.id)}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                        <td className="licence-col">
                          <LicenceTag licence={row.licence} />
                        </td>
                        {project.profiles.map((profile) => {
                          const checked = Boolean(profile.selections[row.id]);
                          return (
                            <td key={profile.id} className={`cell ${checked ? 'checked' : ''}`}>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                aria-label={`${row.label} — ${profile.name || t('common.unnamed')}`}
                                onClick={() => toggleSelection(profile.id, row.id)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3>
        <button
          type="button"
          className="link"
          onClick={() => {
            // Everyone sees the button; signing in is what the click asks for.
            if (!identity) {
              setShowSignIn(true);
              return;
            }
            setShowCustom((v) => !v);
          }}
        >
          {showCustom ? '−' : '+'} {t('matrix.customProcess')}
        </button>
        {!identity && <span className="lock-hint">{t('auth.restricted')}</span>}
      </h3>
      {showCustom && identity && (
        <div className="card">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <input
              className="grow"
              value={draftLabel}
              placeholder={t('matrix.customProcessName')}
              onChange={(e) => setDraftLabel(e.target.value)}
            />
            <select value={draftDomain} onChange={(e) => setDraftDomain(e.target.value)}>
              {DOMAINS.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {localize(domain.label, lang)}
                </option>
              ))}
              <option value={CUSTOM_DOMAIN_ID}>{t('matrix.customDomain')}</option>
            </select>
            <select
              value={draftLicence ?? 'none'}
              onChange={(e) =>
                setDraftLicence(e.target.value === 'none' ? null : (e.target.value as LicenceRequirement))
              }
            >
              {LICENCE_OPTIONS.map((option) => (
                <option key={option ?? 'none'} value={option ?? 'none'}>
                  {option ? t(`licences.${option}`) : t('licences.none')}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primary"
              disabled={draftLabel.trim().length === 0}
              onClick={() => {
                addCustomProcess({
                  domainId: draftDomain,
                  label: draftLabel.trim(),
                  licence: draftLicence,
                  author: identity.alias,
                });
                setDraftLabel('');
              }}
            >
              {t('actions.add')}
            </button>
          </div>
        </div>
      )}

      <h3>
        <button
          type="button"
          className="link"
          onClick={() => {
            if (!identity) {
              setShowSignIn(true);
              return;
            }
            setShowRequest((v) => !v);
          }}
        >
          {showRequest ? '−' : '+'} {t('request.button')}
        </button>
        {!identity && <span className="lock-hint">{t('auth.restricted')}</span>}
      </h3>
      {showRequest && identity && (
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            {t('request.intro')}
          </p>
          {project.customProcesses.length === 0 ? (
            <p className="hint">{t('request.noCustom')}</p>
          ) : (
            <ul className="entity-list">
              {project.customProcesses.map((custom) => (
                <li key={custom.id}>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(picked[custom.id])}
                      onChange={() => setPicked((p) => ({ ...p, [custom.id]: !p[custom.id] }))}
                    />
                    <span>{custom.label}</span>
                  </label>
                  <LicenceTag licence={custom.licence} />
                </li>
              ))}
            </ul>
          )}

          <label className="checkbox" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={wantsTranslation}
              onChange={(e) => setWantsTranslation(e.target.checked)}
            />
            <span>{t('request.translate')}</span>
          </label>
          <p className="hint">{t('request.translateHint')}</p>

          <button
            type="button"
            className="primary"
            style={{ marginTop: 10 }}
            disabled={!project.customProcesses.some((c) => picked[c.id])}
            onClick={() => {
              const selected = project.customProcesses
                .filter((c) => picked[c.id])
                .map((c) => ({
                  label: c.label,
                  licence: c.licence ? t(`licences.${c.licence}`) : t('licences.none'),
                  domain: localize(DOMAINS.find((d) => d.id === c.domainId)?.label ?? { en: c.domainId }, lang),
                }));
              window.open(
                newRequestUrl({ identity, processes: selected, freeText: '', wantsTranslation }),
                '_blank',
                'noopener',
              );
            }}
          >
            {t('request.submit')}
          </button>
        </div>
      )}

      {showSignIn && (
        <SignInModal
          onClose={() => {
            setShowSignIn(false);
            setShowCustom(true);
          }}
        />
      )}
    </section>
  );
}
