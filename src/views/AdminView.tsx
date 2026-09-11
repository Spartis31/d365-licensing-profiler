import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIdentity } from '../auth/identity';
import {
  GOVERNANCE,
  GOVERNANCE_FILE_URL,
  REPO,
  fetchRequests,
  levelOf,
  newRequestUrl,
} from '../data/governance';
import type { ProcessRequest, RequestsResult } from '../data/governance';

const STATUS_TONE: Record<ProcessRequest['status'], string> = {
  pending: 'tag-lic-activity',
  accepted: 'tag-lic-finance',
  acceptedWithChanges: 'tag-lic-commerce',
  rejected: 'tag-lic-projectOperations',
};

export function AdminView() {
  const { t } = useTranslation();
  const identity = useIdentity();
  const level = levelOf(identity);
  const [result, setResult] = useState<RequestsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeText, setFreeText] = useState('');

  const load = async (force = false) => {
    setLoading(true);
    setResult(await fetchRequests(force));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!identity || !level) {
    return (
      <section className="view">
        <header>
          <h2>{t('admin.heading')}</h2>
        </header>
        <div className="empty">
          <strong>{t('auth.restricted')}</strong>
        </div>
      </section>
    );
  }

  const all = result?.status === 'ok' ? result.requests : [];
  // A contributor only sees what they submitted; moderators and admins see everything.
  const visible = level === 'contributor' ? all.filter((r) => r.alias === identity.alias) : all;

  return (
    <section className="view">
      <header>
        <h2>{t('admin.heading')}</h2>
        <p className="intro">{t('admin.intro')}</p>
      </header>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <span className="identity-chip">{t(`admin.level_${level}`)}</span>
          <span className="hint">{t('admin.levelHint')}</span>
          <span className="spacer" />
          <button type="button" disabled={loading} onClick={() => void load(true)}>
            {loading ? t('admin.loading') : t('admin.refresh')}
          </button>
        </div>
      </div>

      {result?.status === 'rateLimited' && (
        <div className="banner warn" role="note">
          <span>{t('admin.rateLimited')}</span>
        </div>
      )}
      {result?.status === 'error' && (
        <div className="banner warn" role="note">
          <span>{t('admin.loadError')}</span>
        </div>
      )}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>{t('admin.request')}</th>
              {level !== 'contributor' && <th>{t('admin.requester')}</th>}
              <th>{t('admin.status')}</th>
              <th>{t('admin.date')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  {t('admin.noRequests')}
                </td>
              </tr>
            )}
            {visible.map((request) => (
              <tr key={request.number}>
                <td>
                  <a href={request.url} target="_blank" rel="noopener noreferrer">
                    #{request.number} — {request.title}
                  </a>
                  {request.needsTranslation && <span className="tag tag-lic-humanResources">{t('admin.translation')}</span>}
                </td>
                {level !== 'contributor' && <td>{request.alias ?? '—'}</td>}
                <td>
                  <span className={`tag ${STATUS_TONE[request.status]}`}>{t(`admin.status_${request.status}`)}</span>
                </td>
                <td>{new Date(request.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t('admin.freeRequest')}</h3>
        <p className="hint" style={{ marginBottom: 12 }}>
          {t('admin.freeRequestHint')}
        </p>
        <div className="compose-row">
          <textarea
            rows={3}
            value={freeText}
            placeholder={t('admin.freeRequestPlaceholder')}
            onChange={(e) => setFreeText(e.target.value)}
          />
          <button
            type="button"
            className="primary"
            disabled={freeText.trim().length === 0}
            onClick={() => {
              window.open(
                newRequestUrl({ identity, processes: [], freeText, wantsTranslation: false }),
                '_blank',
                'noopener',
              );
              setFreeText('');
            }}
          >
            {t('admin.submit')}
          </button>
        </div>
      </div>

      {level !== 'contributor' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('admin.moderation')}</h3>
          <p className="hint">{t('admin.moderationHint')}</p>
          <a
            className="button-link"
            href={`https://github.com/${REPO}/issues?q=is%3Aissue+label%3Ademande-processus`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('admin.openInGitHub')}
          </a>
        </div>
      )}

      {level === 'admin' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('admin.people')}</h3>
          <p className="hint" style={{ marginBottom: 12 }}>
            {t('admin.peopleHint')}
          </p>
          <ul className="entity-list">
            {Object.entries(GOVERNANCE).map(([alias, value]) => (
              <li key={alias}>
                <span className="identity-chip">{alias}</span>
                <span className="hint">{t(`admin.level_${value}`)}</span>
              </li>
            ))}
          </ul>
          <a className="button-link" href={GOVERNANCE_FILE_URL} target="_blank" rel="noopener noreferrer">
            {t('admin.editPeople')}
          </a>
        </div>
      )}
    </section>
  );
}
