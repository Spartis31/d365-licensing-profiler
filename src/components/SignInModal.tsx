import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { identityFromEmail, signIn } from '../auth/identity';
import type { RejectionReason } from '../auth/identity';

export function SignInModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<RejectionReason | null>(null);

  const submit = () => {
    const result = identityFromEmail(email, 'local');
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    signIn(result.identity);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('auth.title')}>
      <div className="modal">
        <h2>{t('auth.title')}</h2>
        <p className="intro">{t('auth.intro')}</p>

        <div className="banner warn" role="note">
          <span>{t('auth.localModeWarning')}</span>
        </div>

        <label className="field">
          <span>{t('auth.email')}</span>
          <input
            type="email"
            value={email}
            autoFocus
            placeholder="alias@microsoft.com"
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </label>
        {error && <p className="error-text">{t(`auth.error_${error}`)}</p>}

        <div className="modal-actions">
            <button type="button" onClick={onClose}>
            {t('actions.close')}
          </button>
          <button type="button" className="primary" disabled={email.trim().length === 0} onClick={submit}>
            {t('auth.signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
