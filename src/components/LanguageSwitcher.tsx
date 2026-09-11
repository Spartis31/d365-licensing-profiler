import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { closestLanguage } from '../i18n/languages';
import type { LanguageCode } from '../i18n';

// Regional-indicator flag emojis do not render on Windows, so the flags are inline SVG.
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

function FlagFR() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false">
      <rect width="1" height="2" x="0" fill="#002395" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ed2939" />
    </svg>
  );
}

function FlagDE() {
  return (
    <svg viewBox="0 0 5 3" aria-hidden="true" focusable="false">
      <rect width="5" height="1" y="0" fill="#000000" />
      <rect width="5" height="1" y="1" fill="#dd0000" />
      <rect width="5" height="1" y="2" fill="#ffce00" />
    </svg>
  );
}

function FlagES() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false">
      <rect width="3" height="2" fill="#aa151b" />
      <rect width="3" height="1" y="0.5" fill="#f1bf00" />
    </svg>
  );
}

function FlagIT() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false">
      <rect width="1" height="2" x="0" fill="#008c45" />
      <rect width="1" height="2" x="1" fill="#f4f5f0" />
      <rect width="1" height="2" x="2" fill="#cd212a" />
    </svg>
  );
}

function FlagPT() {
  return (
    <svg viewBox="0 0 6 4" aria-hidden="true" focusable="false">
      <rect width="6" height="4" fill="#da291c" />
      <rect width="2.4" height="4" fill="#046a38" />
      <circle cx="2.4" cy="2" r="0.85" fill="#ffe900" stroke="#046a38" strokeWidth="0.12" />
    </svg>
  );
}

function FlagNL() {
  return (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="2" y="0" fill="#ae1c28" />
      <rect width="9" height="2" y="2" fill="#ffffff" />
      <rect width="9" height="2" y="4" fill="#21468b" />
    </svg>
  );
}

function FlagDA() {
  return (
    <svg viewBox="0 0 37 28" aria-hidden="true" focusable="false">
      <rect width="37" height="28" fill="#c8102e" />
      <rect x="12" width="4" height="28" fill="#ffffff" />
      <rect y="12" width="37" height="4" fill="#ffffff" />
    </svg>
  );
}

function FlagSV() {
  return (
    <svg viewBox="0 0 16 10" aria-hidden="true" focusable="false">
      <rect width="16" height="10" fill="#005293" />
      <rect x="5" width="2" height="10" fill="#fecb00" />
      <rect y="4" width="16" height="2" fill="#fecb00" />
    </svg>
  );
}

const FLAGS: Record<LanguageCode, () => JSX.Element> = {
  en: FlagUS,
  fr: FlagFR,
  da: FlagDA,
  de: FlagDE,
  es: FlagES,
  it: FlagIT,
  nl: FlagNL,
  pt: FlagPT,
  sv: FlagSV,
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const active = closestLanguage(i18n.language);
  const current = SUPPORTED_LANGUAGES.find((language) => language.code === active) ?? SUPPORTED_LANGUAGES[0];
  const ActiveFlag = FLAGS[current.code];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="lang-select" ref={root}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flag">
          <ActiveFlag />
        </span>
        <span className="lang-name">{current.label}</span>
        <span className="lang-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t('common.language')}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const Flag = FLAGS[language.code];
            return (
              <li key={language.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={language.code === active}
                  className={language.code === active ? 'lang-option active' : 'lang-option'}
                  onClick={() => {
                    setLanguage(language.code);
                    setOpen(false);
                  }}
                >
                  <span className="flag">
                    <Flag />
                  </span>
                  <span className="lang-name">{language.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
