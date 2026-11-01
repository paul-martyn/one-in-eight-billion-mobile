// Счётчики работают с разделителями выбранной локали: 1,234.50 / 1 234,50 / 1.234,50.
const formats = new Map<string, { group: string; decimal: string }>();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function separators(locale: string) {
  if (!formats.has(locale)) {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    formats.set(locale, { group: parts.find(p => p.type === 'group')?.value ?? ',', decimal: parts.find(p => p.type === 'decimal')?.value ?? '.' });
  }
  return formats.get(locale)!;
}
export function scaleNumbers(text: string, progress: number, locale: string, firstOnly = false): string {
  if (progress >= 1) return text;
  const { group, decimal } = separators(locale);
  const grouping = /\s/u.test(group) ? '[ \\u00a0\\u202f]' : escape(group);
  const regex = new RegExp(`(?<![\\d.,])\\d+(?:${grouping}\\d{3})*(?:${escape(decimal)}\\d+)?`, firstOnly ? 'u' : 'gu');
  return text.replace(regex, value => {
    const plain = value.replace(new RegExp(grouping, 'gu'), '').replace(decimal, '.');
    const n = Number(plain);
    if (!Number.isFinite(n)) return value;
    const decimals = value.includes(decimal) ? value.split(decimal)[1]!.length : 0;
    return (n * Math.max(0, progress)).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, ...(new RegExp(grouping, 'u').test(value) ? {} : { useGrouping: false }) });
  });
}
