import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { RESOURCES } from './resources';
import { SUPPORTED_LANGUAGES, closestLanguage, isLanguageCode, localeOf } from './languages';
import type { LanguageCode } from './languages';

export { SUPPORTED_LANGUAGES, localeOf, RESOURCES };
export type { LanguageCode };

const STORAGE_KEY = 'd365lic.language';

function detectLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLanguageCode(stored)) return stored;
  return closestLanguage(navigator.language);
}

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => [language.code, { translation: RESOURCES[language.code] }]),
  ),
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(code: LanguageCode): void {
  localStorage.setItem(STORAGE_KEY, code);
  void i18n.changeLanguage(code);
  document.documentElement.lang = code;
}

export function currentLanguage(): LanguageCode {
  return closestLanguage(i18n.language);
}

export default i18n;
