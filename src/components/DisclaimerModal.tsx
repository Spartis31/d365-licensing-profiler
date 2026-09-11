import { useTranslation } from 'react-i18next';

interface Props {
  onAccept: () => void;
}

export function DisclaimerModal({ onAccept }: Props) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="modal">
        <h2 id="disclaimer-title">{t('disclaimer.heading')}</h2>
        <p className="disclaimer-body">{t('disclaimer.body')}</p>
        <p className="disclaimer-note">{t('disclaimer.note')}</p>
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onAccept}>
            {t('actions.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
