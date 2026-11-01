// Тексты нового интерфейса (не игровые тексты core — те приходят из оригинала).
// Сейчас есть только английский — язык макетов. Ключи стабильны и разложены
// по файлам экранов (src/i18n/en/*.json); переводы для остальных 18 языков
// оригинала ещё не сделаны.
const files = import.meta.glob<Record<string, string>>('./en/*.json', { eager: true, import: 'default' });
const dict: Record<string, string> = Object.assign({}, ...Object.values(files));

export type UiKey = string;

/** Подстановка {name} в строку. Отсутствующий ключ виден как [key], а не скрывается. */
export function t(key: UiKey, params?: Record<string, string | number>): string {
  const raw = dict[key] ?? `[${key}]`;
  return params ? raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`)) : raw;
}

export const UI_LANG = 'en';
export const UI_DIR: 'ltr' | 'rtl' = 'ltr';
