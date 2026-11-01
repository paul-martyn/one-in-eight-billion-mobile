// Поправки только текстов: эталон и тело производного core остаются неизменными.
export const RUSSIAN_TEXT_OVERRIDES: Readonly<Record<string, string>> = {
  '26erjxxjg4h': 'В {0} ((год|года|лет)) вам начали платить пенсию.',
  '12ibzr3593i': 'Пенсия начинается раньше {0} ((года|лет|лет)), поэтому она соответственно меньше.',
  'gk7i2sed7w': 'Этого с запасом хватит, чтобы жить как сейчас до пенсии в {0} ((год|года|лет)).',
  'yck81mo6it': 'С {0} ((года|лет|лет)) пенсия составит {1} в год ({2} в месяц по ценам России).',
  '6peg9poyez': 'Свободное время↑ доход↓ · пенсия с {0} ((года|лет|лет))',
};

/** Подмена словаря до начала жизни, без изменения состояния или потока RNG. */
export function installRussianTextOverrides(top: Record<string, any>): void {
  if (top.LANG !== 'ru') return;
  for (const key of Object.keys(RUSSIAN_TEXT_OVERRIDES)) {
    if (!Object.hasOwn(top.I18N_T, key)) throw new Error(`Нет русского ключа core: ${key}`);
  }
  Object.assign(top.I18N_T, RUSSIAN_TEXT_OVERRIDES);
}
