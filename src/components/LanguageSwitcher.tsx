import { useTranslation } from 'react-i18next';
import { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import type { LanguageCode } from '../i18n';

// Regional-indicator flag emojis do not render on Windows, so the flags are inline SVG.
function FlagFR() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false">
      <rect width="1" height="2" x="0" fill="#002395" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ed2939" />
    </svg>
  );
}

function FlagUS() {
  const stripeHeight = 14 / 13;
  return (
    <svg viewBox="0 0 26 14" aria-hidden="true" focusable="false">
      <rect width="26" height="14" fill="#ffffff" />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <rect key={index} y={index * 2 * stripeHeight} width="26" height={stripeHeight} fill="#b22234" />
      ))}
      <rect width="10.4" height={stripeHeight * 7} fill="#3c3b6e" />
    </svg>
  );
}

const FLAGS: Record<LanguageCode, () => JSX.Element> = {
  en: FlagUS,
  fr: FlagFR,
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const active: LanguageCode = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return (
    <div className="lang-switch" role="group" aria-label={t('common.language')}>
      {SUPPORTED_LANGUAGES.map((language) => {
        const Flag = FLAGS[language.code];
        const selected = active === language.code;
        return (
          <button
            key={language.code}
            type="button"
            aria-pressed={selected}
            className={selected ? 'active' : ''}
            onClick={() => setLanguage(language.code)}
          >
            <span className="flag">
              <Flag />
            </span>
            <span>{language.label}</span>
          </button>
        );
      })}
    </div>
  );
}
