export type Params = Record<string, string | number>;
const plurals = new Map<string, Intl.PluralRules>();

export function translate(dict: Record<string, string>, fallback: Record<string, string>, locale: string, key: string, params?: Params): string {
  const count = params?.count ?? params?.n;
  let category = '';
  if (typeof count === 'number') {
    if (!plurals.has(locale)) plurals.set(locale, new Intl.PluralRules(locale));
    category = plurals.get(locale)!.select(count);
  }
  const raw = (category && dict[`${key}.${category}`]) || dict[key] || fallback[key] || `[${key}]`;
  return params ? raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`)) : raw;
}
