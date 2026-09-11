import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signIn, verifyGitHubAccount } from '../auth/identity';
import type { RejectionReason } from '../auth/identity';

export function SignInModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [login, setLogin] = useState('');
  const [error, setError] = useState<RejectionReason | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = login.trim().length > 0;

  const submit = () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    void verifyGitHubAccount(login).then((result) => {
      setBusy(false);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      signIn(result.identity);
      onClose();
    });
  };

  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') submit();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('auth.title')}>
      <div className="modal">
        <h2>{t('auth.title')}</h2>
        <p className="intro">{t('auth.intro')}</p>

        <label className="field">
          <span>{t('auth.githubLogin')}</span>
          <input
            value={login}
            autoFocus
            placeholder="octocat"
            onChange={(e) => {
              setLogin(e.target.value);
              setError(null);
            }}
            onKeyDown={onEnter}
          />
        </label>

        <div className="banner warn" role="note">
          <span>{t('auth.publicWarning')}</span>
        </div>

        {error && <p className="error-text">{t(`auth.error_${error}`)}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            {t('actions.close')}
          </button>
          <button type="button" className="primary" disabled={!ready || busy} onClick={submit}>
            {busy ? t('auth.checking') : t('auth.signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
