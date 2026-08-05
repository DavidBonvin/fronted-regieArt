import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

export type SupportedLocale = 'en' | 'fr' | 'es';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'fr', 'es'];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const localeLabels: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
} as const;

export type TranslationResources = typeof en;

export { en, fr, es };
