import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources, DEFAULT_LOCALE } from '@regieart/i18n';
import type { SupportedLocale } from '@regieart/i18n';

const LOCALE_STORAGE_KEY = 'regieart_locale';

export function initI18n(): void {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'translation',
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
        caches: ['localStorage'],
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export function changeLocale(locale: SupportedLocale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  i18next.changeLanguage(locale);
}

export { i18next };
