/**
 * Languages the application ships in. Kept free of any i18next import so the
 * data catalogs and the Excel export can depend on it without pulling the
 * translation runtime.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-GB' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'da', label: 'Dansk', locale: 'da-DK' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
  { code: 'it', label: 'Italiano', locale: 'it-IT' },
  { code: 'pt', label: 'Português', locale: 'pt-PT' },
  { code: 'sv', label: 'Svenska', locale: 'sv-SE' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

/** Matches a browser language tag such as `pt-BR` to a supported language. */
export function closestLanguage(tag: string): LanguageCode {
  const base = tag.toLowerCase().split('-')[0];
  return isLanguageCode(base) ? base : 'en';
}

export function localeOf(code: LanguageCode): string {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code)?.locale ?? 'en-GB';
}
