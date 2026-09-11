import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useIdentity } from '../auth/identity';
import type { ContributorIdentity } from '../auth/identity';
import {
  GOVERNANCE_PATH,
  REPO,
  REQUEST_LABEL_NAME,
  STATUS_LABELS,
  applyGovernance,
  approvalRequestUrl,
  canModerate,
  canOpenConsole,
  canRequest,
  fetchRequests,
  governanceLevels,
  levelIn,
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
import { COPILOT_URL, labelsFromBody, translationPrompt } from '../data/translationPrompt';
import { GitHubTokenModal } from '../components/GitHubTokenModal';

const STATUS_TONE: Record<RequestStatus, string> = {
  pending: 'tag-lic-activity',
  accepted: 'tag-lic-finance',
  acceptedWithChanges: 'tag-lic-commerce',
  rejected: 'tag-lic-projectOperations',
};

/** The base level is never assigned: it is what everyone is until approved. */
const ASSIGNABLE: GovernanceLevel[] = ['approved', 'moderator', 'admin'];
const LEVELS: GovernanceLevel[] = ['user', ...ASSIGNABLE];

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
  const [copied, setCopied] = useState(false);
  const proposed = labelsFromBody(request.body);

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

      {proposed.length > 0 && (
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(translationPrompt(proposed));
              setCopied(true);
            }}
          >
            {t('admin.copyPrompt')}
          </button>
          <a className="button-link" href={COPILOT_URL} target="_blank" rel="noopener noreferrer">
            {t('admin.openCopilot')}
          </a>
          {copied && <span className="hint">{t('admin.promptCopied')}</span>}
        </div>
      )}

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

/** Public profile names, read from GitHub so the repository stores no personal data. */
function useGitHubNames(logins: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = logins.join(',');

  useEffect(() => {
    let cancelled = false;
    const wanted = key ? key.split(',') : [];
    void Promise.all(
      wanted.map(async (login) => {
        try {
          const response = await fetch(`https://api.github.com/users/${login}`, {
            headers: { Accept: 'application/vnd.github+json' },
          });
          if (!response.ok) return [login, ''] as const;
          const user = (await response.json()) as { name: string | null };
          return [login, user.name ?? ''] as const;
        } catch {
          return [login, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (!cancelled) setNames(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return names;
}

function PeopleCard({
  levels,
  requireWrite,
  onSaved,
  seen,
  currentLogin,
}: {
  levels: Record<string, GovernanceLevel>;
  requireWrite: RequireWrite;
  onSaved: (next: Record<string, GovernanceLevel>) => void;
  /** GitHub accounts that posted a request; anyone signing in is a contributor by default. */
  seen: string[];
  currentLogin: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const names = useGitHubNames([...Object.keys(levels), ...seen]);
  const label = (login: string) => (names[login] ? `${login} | ${names[login]}` : login);
  const adminCount = Object.values(levels).filter((value) => value === 'admin').length;

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
        {Object.entries(levels).map(([alias, level]) => {
          const isSelf = alias === currentLogin;
          // Demoting or removing the last administrator would lock everyone out.
          const isLastAdmin = level === 'admin' && adminCount <= 1;
          const blocked = isLastAdmin ? t('admin.lastAdmin') : isSelf ? t('admin.notYourself') : '';
          return (
            <li key={alias}>
              <span className="identity-chip">{label(alias)}</span>
              <select
                value={level}
                disabled={busy || isLastAdmin}
                title={isLastAdmin ? blocked : undefined}
                onChange={(e) =>
                  save(
                    { ...levels, [alias]: e.target.value as GovernanceLevel },
                    `Governance: ${alias} becomes ${e.target.value}`,
                  )
                }
              >
                {(level === 'user' ? LEVELS : ASSIGNABLE).map((value) => (
                  <option key={value} value={value}>
                    {t(`admin.level_${value}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ghost danger icon"
                title={blocked || t('actions.remove')}
                disabled={busy || isSelf || isLastAdmin}
                onClick={() => {
                  const { [alias]: _removed, ...rest } = levels;
                  save(rest, `Governance: remove ${alias}`);
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      {seen.filter((alias) => !(alias in levels)).length > 0 && (
        <>
          <h4 style={{ margin: '18px 0 4px' }}>{t('admin.seenPeople')}</h4>
          <p className="hint" style={{ marginBottom: 10 }}>
            {t('admin.seenPeopleHint')}
          </p>
          <ul className="people-list">
            {seen
              .filter((alias) => !(alias in levels))
              .map((alias) => (
                <li key={alias}>
                  <span className="identity-chip">{label(alias)}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      save({ ...levels, [alias]: 'approved' }, `Governance: approve ${alias}`)
                    }
                  >
                    {t('admin.approveContributor')}
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}

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
            const login = draft.trim();
            save({ ...levels, [login]: 'approved' }, `Governance: approve ${login}`);
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

function FreeRequestCard({ identity }: { identity: ContributorIdentity }) {
  const { t } = useTranslation();
  const [freeText, setFreeText] = useState('');

  return (
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

  const level = levelIn(levels, identity);

  if (!identity || !canOpenConsole(level)) {
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

  // An unapproved user sees their status, and nothing else.
  if (!canRequest(level)) {
    return (
      <section className="view">
        <header>
          <h2>{t('admin.heading')}</h2>
        </header>

        <div className="card">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <span className="identity-chip">{t(`admin.level_${level}`)}</span>
            <span className="hint">{t('admin.levelHint')}</span>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('admin.pendingTitle')}</h3>
          <p className="hint" style={{ marginBottom: 12 }}>
            {t('admin.pendingBody')}
          </p>
          <a
            className="button-link"
            href={approvalRequestUrl(identity)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('admin.requestApproval')}
          </a>
        </div>

        <FreeRequestCard identity={identity} />
      </section>
    );
  }

  const all = result?.status === 'ok' ? result.requests : [];
  const visible = canModerate(level) ? all : all.filter((r) => r.author === identity.login);

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
              {canModerate(level) && <th>{t('admin.requester')}</th>}
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
                      canModerate={canModerate(level)}
                      requireWrite={requireWrite}
                      onChanged={() => void load(true)}
                    />
                  )}
                </td>
                {canModerate(level) && <td>{request.author ?? '—'}</td>}
                <td>
                  <span className={`tag ${STATUS_TONE[request.status]}`}>{t(`admin.status_${request.status}`)}</span>
                </td>
                <td>{new Date(request.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FreeRequestCard identity={identity} />

      {level === 'admin' && (
        <PeopleCard
          levels={levels}
          requireWrite={requireWrite}
          onSaved={(next) => setLevels(applyGovernance(next))}
          currentLogin={identity.login}
          seen={[
            ...new Set(
              all.map((request) => request.author).filter((login): login is string => Boolean(login)),
            ),
          ]}
        />
      )}

      {canModerate(level) && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('admin.moderation')}</h3>
          <p className="hint">{t('admin.moderationHint')}</p>
          <a
            className="button-link"
            href={`https://github.com/${REPO}/issues?q=is%3Aissue`}
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
      )}

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
