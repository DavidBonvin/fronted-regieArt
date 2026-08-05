import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@regieart/i18n';
import type { SupportedLocale } from '@regieart/i18n';

const LOCALE_STORAGE_KEY = 'regieart_locale';

async function getStoredLocale(): Promise<SupportedLocale> {
  const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

export async function initI18n(): Promise<void> {
  const locale = await getStoredLocale();

  await i18next.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });
}

export async function changeLocale(locale: SupportedLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  await i18next.changeLanguage(locale);
}

export { i18next };
