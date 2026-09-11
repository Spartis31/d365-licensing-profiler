import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithToken } from '../data/github';

const CREATE_TOKEN_URL =
  'https://github.com/settings/personal-access-tokens/new?target_name=Spartis31&description=D365%20Licensing%20Profiler';

/**
 * Shown only when an action needs write access. A static site cannot obtain a
 * token on its own, so this is asked once per machine and then never again.
 */
export function GitHubTokenModal({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setBusy(true);
    setError(null);
    signInWithToken(value)
      .then(onDone)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.connection')}>
      <div className="modal">
        <h2>{t('admin.connection')}</h2>
        <p className="intro">{t('admin.unlockIntro')}</p>

        <ol className="steps-list">
          <li>
            <a href={CREATE_TOKEN_URL} target="_blank" rel="noopener noreferrer">
              {t('admin.stepCreate')}
            </a>
          </li>
          <li>{t('admin.stepScopes')}</li>
          <li>{t('admin.stepPaste')}</li>
        </ol>

        <label className="field">
          <span>{t('admin.tokenPlaceholder')}</span>
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) submit();
            }}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <p className="hint" style={{ marginTop: 10 }}>
          {t('admin.onceOnly')}
        </p>

        <div className="modal-actions">
            <button type="button" onClick={onCancel}>
            {t('actions.close')}
          </button>
          <button type="button" className="primary" disabled={busy || value.trim().length === 0} onClick={submit}>
            {busy ? t('admin.connecting') : t('admin.connect')}
          </button>
        </div>
      </div>
    </div>
  );
}
