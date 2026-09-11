import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIdentity } from '../auth/identity';
import { SignInModal } from './SignInModal';
import { CATALOG_GUIDE_EDITION, GUIDE_PERMALINK, UPDATE_ROLES_WORKFLOW, checkLatestEdition } from '../data/guide';
import type { GuideCheck } from '../data/guide';

export function GuideCard() {
  const { t } = useTranslation();
  const identity = useIdentity();
  const [showSignIn, setShowSignIn] = useState(false);
  const [check, setCheck] = useState<GuideCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    setCheck(await checkLatestEdition());
    setChecking(false);
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t('guide.title')}</h3>
      <p className="hint" style={{ marginBottom: 12 }}>
        {t('guide.edition', { edition: CATALOG_GUIDE_EDITION })}
      </p>
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <a className="button-link" href={GUIDE_PERMALINK} target="_blank" rel="noopener noreferrer">
          {t('guide.open')}
        </a>
        <button type="button" disabled={checking} onClick={() => void runCheck()}>
          {checking ? t('guide.checking') : t('guide.check')}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!identity) {
              setShowSignIn(true);
              return;
            }
            window.open(UPDATE_ROLES_WORKFLOW, '_blank', 'noopener');
          }}
        >
          {t('guide.updateRoles')}
        </button>
        {!identity && <span className="lock-hint">{t('auth.restricted')}</span>}
        <span className="spacer" />
        {check && (
          <span className={check.status === 'outdated' ? 'hint warn-text' : 'hint'}>
            {check.status === 'unknown'
              ? t('guide.unknown')
              : t(`guide.${check.status}`, { edition: check.edition })}
          </span>
        )}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        {t('guide.updateHint')}
      </p>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
