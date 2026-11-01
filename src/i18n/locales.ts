export const SUPPORTED_LOCALES = ['en', 'ru', 'es', 'fr', 'de'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const LOCALE_KEY = '1in8b-mobile/v1:mobile.locale';
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', ru: 'Русский', es: 'Español', fr: 'Français', de: 'Deutsch' };
export const isLocale = (s: unknown): s is Locale => SUPPORTED_LOCALES.includes(s as Locale);

/** Явный выбор важнее языка устройства. Неизвестная локаль — английский. */
export function resolveLocale(saved: unknown, languages: readonly string[] = []): Locale {
  if (isLocale(saved)) return saved;
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}
