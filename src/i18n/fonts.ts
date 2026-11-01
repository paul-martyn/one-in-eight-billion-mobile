import type { Locale } from './locales';

let russianFonts: Promise<unknown> | undefined;

/** Отдельный локальный набор кириллицы загружается только для русского языка. */
export function loadLocaleFonts(locale: Locale): void {
  if (locale !== 'ru' || russianFonts) return;
  russianFonts = import('@fontsource-variable/nunito/index.css').catch(error => {
    russianFonts = undefined;
    console.warn('Не удалось загрузить русский шрифт; используется системный.', error);
  });
}
