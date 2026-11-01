import { useSyncExternalStore } from 'react';
import { isLocale, LOCALE_KEY, resolveLocale, type Locale } from './locales';
import { translate } from './messages';
export { isLocale, LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from './locales';

const files = import.meta.glob<Record<string, string>>('./*/*.json', { eager: true, import: 'default' });
const dictionaries: Record<string, Record<string, string>> = {};
for (const [path, strings] of Object.entries(files)) {
  const lang = path.split('/')[1]!;
  Object.assign(dictionaries[lang] ??= {}, strings);
}
function initialLocale(): Locale {
  let saved: string | null = null;
  try { saved = localStorage.getItem(LOCALE_KEY); } catch { /* приватный режим */ }
  return resolveLocale(saved, typeof navigator === 'undefined' ? [] : navigator.languages);
}
export let UI_LANG: Locale = initialLocale();
export const UI_DIR = 'ltr' as const;
const listeners = new Set<() => void>();
export const getLocale = () => UI_LANG;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useLocale = () => useSyncExternalStore(subscribe, getLocale, getLocale);

/** Предпросмотр без потери экранного состояния; сохранение — после применения core. */
export function setLocale(locale: Locale, persist = false): void {
  if (!isLocale(locale)) return;
  UI_LANG = locale;
  if (persist) { try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* работает до закрытия страницы */ } }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = UI_DIR;
    document.title = t('app.title');
  }
  listeners.forEach(l => l());
}

export type UiKey = string;

export function t(key: UiKey, params?: Record<string, string | number>): string {
  return translate(dictionaries[UI_LANG] ?? {}, dictionaries.en!, UI_LANG, key, params);
}

export const numberLocale = () => UI_LANG === 'en' ? 'en-US' : UI_LANG;
export const formatNumber = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(numberLocale(), opts);
