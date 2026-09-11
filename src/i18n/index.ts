import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { fr } from './fr';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const STORAGE_KEY = 'd365lic.language';

function detectLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
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
  return i18n.language.startsWith('fr') ? 'fr' : 'en';
}

export default i18n;
