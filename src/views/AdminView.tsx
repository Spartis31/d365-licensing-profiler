import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useIdentity } from '../auth/identity';
import {
  GOVERNANCE_PATH,
  REPO,
  REQUEST_LABEL_NAME,
  STATUS_LABELS,
  applyGovernance,
  fetchRequests,
  governanceLevels,
  levelOf,
  loadGovernance,
  newRequestUrl,
} from '../data/governance';
import type { GovernanceLevel, ProcessRequest, RequestsResult, RequestStatus } from '../data/governance';
import {
  addComment,
  currentUser,
  listComments,
  readFile,
  restoreSession,
  signOutGitHub,
  subscribe,
  updateIssue,
  writeFile,
} from '../data/github';
import type { IssueComment } from '../data/github';
import { GitHubTokenModal } from '../components/GitHubTokenModal';

const STATUS_TONE: Record<RequestStatus, string> = {
  pending: 'tag-lic-activity',
  accepted: 'tag-lic-finance',
  acceptedWithChanges: 'tag-lic-commerce',
  rejected: 'tag-lic-projectOperations',
};

const LEVELS: GovernanceLevel[] = ['contributor', 'moderator', 'admin'];

/** Runs an action, asking for write access first if it has never been granted. */
type RequireWrite = (action: () => void) => void;

function useGitHubUser() {
  return useSyncExternalStore(subscribe, currentUser, () => null);
}

function RequestDetail({
  request,
  canModerate,
  requireWrite,
  onChanged,
}: {
  request: ProcessRequest;
  canModerate: boolean;
  requireWrite: RequireWrite;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<IssueComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listComments(request.number)
      .then(setComments)
      .catch(() => setComments([]));
  }, [request.number]);

  const act = (run: () => Promise<unknown>) =>
    requireWrite(() => {
      setBusy(true);
      setError(null);
      run()
        .then(onChanged)
        .catch((cause: Error) => setError(cause.message))
        .finally(() => setBusy(false));
    });

  const setStatus = (status: RequestStatus) =>
    act(async () => {
      const labels = [REQUEST_LABEL_NAME];
      if (status === 'rejected') labels.push(STATUS_LABELS.rejected);
      if (status === 'acceptedWithChanges') labels.push(STATUS_LABELS.acceptedWithChanges);
      if (request.needsTranslation) labels.push('traduction-ia');
      await updateIssue(request.number, {
        labels,
        state: status === 'pending' ? 'open' : 'closed',
      });
    });

  return (
    <div className="request-detail">
      {request.body && <pre className="request-body">{request.body}</pre>}

      <div className="comment-list">
        {comments === null && <p className="hint">{t('admin.loading')}</p>}
        {comments?.length === 0 && <p className="hint">{t('admin.noComments')}</p>}
        {comments?.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-head">
              <img className="gh-avatar" src={comment.avatarUrl} alt="" width={20} height={20} />
              <strong>{comment.author}</strong>
              <span className="hint">{new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>
            <pre>{comment.body}</pre>
          </div>
        ))}
      </div>

      <div className="compose-row" style={{ marginTop: 12 }}>
        <textarea
          rows={2}
          value={draft}
          placeholder={t('admin.commentPlaceholder')}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || draft.trim().length === 0}
          onClick={() =>
            act(async () => {
              await addComment(request.number, draft.trim());
              setDraft('');
              setComments(await listComments(request.number));
            })
          }
        >
          {t('admin.comment')}
        </button>
      </div>

      {canModerate && (
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <span className="hint">{t('admin.decide')}</span>
          {(['pending', 'accepted', 'acceptedWithChanges', 'rejected'] as RequestStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy || request.status === status}
              onClick={() => setStatus(status)}
            >
              {t(`admin.status_${status}`)}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function PeopleCard({
  levels,
  requireWrite,
  onSaved,
}: {
  levels: Record<string, GovernanceLevel>;
  requireWrite: RequireWrite;
  onSaved: (next: Record<string, GovernanceLevel>) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = (next: Record<string, GovernanceLevel>, message: string) =>
    requireWrite(() => {
      setBusy(true);
      setError(null);
      setDone(false);
      void (async () => {
        try {
          const current = await readFile(GOVERNANCE_PATH);
          await writeFile(GOVERNANCE_PATH, `${JSON.stringify(next, null, 2)}\n`, current.sha, message);
          setDone(true);
          onSaved(next);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          setBusy(false);
        }
      })();
    });

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t('admin.people')}</h3>
      <p className="hint" style={{ marginBottom: 12 }}>
        {t('admin.peopleHint')}
      </p>

      <ul className="people-list">
        {Object.entries(levels).map(([alias, level]) => (
          <li key={alias}>
            <span className="identity-chip">{alias}</span>
            <select
              value={level}
              disabled={busy}
              onChange={(e) =>
                save(
                  { ...levels, [alias]: e.target.value as GovernanceLevel },
                  `Gouvernance : ${alias} devient ${e.target.value}`,
                )
              }
            >
              {LEVELS.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.level_${value}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ghost danger icon"
              title={t('actions.remove')}
              disabled={busy || Object.keys(levels).length <= 1}
              onClick={() => {
                const { [alias]: _removed, ...rest } = levels;
                save(rest, `Gouvernance : retrait de ${alias}`);
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="compose-row" style={{ marginTop: 14 }}>
        <input
          placeholder={t('admin.addAliasPlaceholder')}
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || draft.trim().length === 0}
          onClick={() => {
            const alias = draft.trim().toLowerCase().replace(/@microsoft\.com$/, '');
            save({ ...levels, [alias]: 'contributor' }, `Gouvernance : ajout de ${alias}`);
            setDraft('');
          }}
        >
          {t('admin.addPerson')}
        </button>
      </div>

      {done && <p className="hint">{t('admin.saved')}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export function AdminView() {
  const { t } = useTranslation();
  const identity = useIdentity();
  const ghUser = useGitHubUser();
  const [levels, setLevels] = useState<Record<string, GovernanceLevel>>(governanceLevels());
  const [result, setResult] = useState<RequestsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [openRequest, setOpenRequest] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');
  const [pending, setPending] = useState<(() => void) | null>(null);

  // Write access is requested at the moment it is needed, never up front.
  const requireWrite: RequireWrite = (action) => {
    if (currentUser()?.canWrite) action();
    else setPending(() => action);
  };

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setResult(await fetchRequests(force));
    setLoading(false);
  }, []);

  useEffect(() => {
    void restoreSession();
    void loadGovernance().then(setLevels);
    void load();
  }, [load]);

  const level = levelOf(identity);

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
                  <button
                    type="button"
                    className="link"
                    onClick={() => setOpenRequest(openRequest === request.number ? null : request.number)}
                  >
                    #{request.number} — {request.title}
                  </button>
                  {request.needsTranslation && (
                    <span className="tag tag-lic-humanResources">{t('admin.translation')}</span>
                  )}
                  {openRequest === request.number && (
                    <RequestDetail
                      request={request}
                      canModerate={level !== 'contributor'}
                      requireWrite={requireWrite}
                      onChanged={() => void load(true)}
                    />
                  )}
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

      {level === 'admin' && (
        <PeopleCard levels={levels} requireWrite={requireWrite} onSaved={(next) => setLevels(applyGovernance(next))} />
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t('admin.moderation')}</h3>
        <p className="hint">{t('admin.moderationHint')}</p>
        <a
          className="button-link"
          href={`https://github.com/${REPO}/issues?q=is%3Aissue+label%3A${REQUEST_LABEL_NAME}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('admin.openInGitHub')}
        </a>
        {ghUser && (
          <p className="hint" style={{ marginTop: 12 }}>
            {t('admin.signedInAs', { login: ghUser.login })}{' '}
            <button type="button" className="link" onClick={signOutGitHub}>
              {t('admin.disconnect')}
            </button>
          </p>
        )}
      </div>

      {pending && (
        <GitHubTokenModal
          onDone={() => {
            const action = pending;
            setPending(null);
            action();
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
