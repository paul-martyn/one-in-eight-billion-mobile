// Сводка о стране (RollCute холста, функция luck): четыре шкалы — срок жизни, доход,
// школа, безопасность — и их среднее, «удача рождения». Каждая шкала — доля детей,
// рождённых сегодня там, где этот показатель ниже (считает планета по таблице стран
// движка: planetCore.js, scalesOf). Здесь — только слова и числа для показа.
import { t, numberLocale } from '../../i18n';

export type ScaleKey = 'life' | 'money' | 'school' | 'safety';
export type TipKey = ScaleKey | 'luck';
export type ThreatKind = 'war' | 'hiv' | 'mal' | 'crime';

/** Страна, на которую села планета (planetCore.js info). */
export type Land = {
  iso: string;
  name: string;
  short: string;
  /** Доля рождений мира. */
  share: number;
  /** Подпись булавки: город и страна. */
  place?: string;
  /**
   * Показатели из таблицы стран движка: [0 люди (тыс.), 1 срок жизни, 2 детей на женщину, 3 доход ($),
   * 4 города %, 5 интернет %, 6 лет в школе, 7 младенческая смертность на 1000, 8 до пяти лет на 1000,
   * 9 Джини, 10 —, 11 война 0–3, 12 убийств на 100 тыс., 13 малярия 0–1,5, 14 ВИЧ % взрослых, …].
   */
  stats: number[] | null;
  scales: Record<ScaleKey | 'luck', number> | null;
};

// Зелёный только от 70; ниже цвет теплеет через жёлтый и оранжевый к красному. [от, ключ, заливка, чернила]
// Заливка клевера — из макета; чернила слов темнее макетных, чтобы мелкий текст читался на панели (контраст ≥ 4,5).
const TIERS: [number, string, string, string][] = [
  [85, 'great', '#5bb54a', '#2f7a1a'], [70, 'good', '#8ccc4a', '#3b7d1f'], [55, 'fair', '#f2b62a', '#855f00'],
  [40, 'average', '#f4823a', '#a8480f'], [25, 'hard', '#f0603e', '#b0381c'], [0, 'veryHard', '#e5483a', '#ad2a1c'],
];
export const SCALE_KEYS: ScaleKey[] = ['life', 'money', 'school', 'safety'];

/** Бледные цвета ступеней — основа силуэта, который заполняется цветом ступени. */
const PALE: Record<string, string> = { great: '#d4edc8', good: '#e1f1ce', fair: '#f8e8b8', average: '#fbdcc4', hard: '#f8d2c8', veryHard: '#f5c8c2' };
/** Ступень числа 0–100: ключ, цвет заливки, бледный цвет основы и чернила слов. */
export function tierOf(n: number): { key: string; fill: string; pale: string; ink: string } {
  const tier = TIERS.find(x => n >= x[0]) ?? TIERS[TIERS.length - 1]!;
  return { key: tier[1], fill: tier[2], pale: PALE[tier[1]] ?? '#e6d6b8', ink: tier[3] };
}

const usd = (x: number) => new Intl.NumberFormat(numberLocale(), {
  style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: x >= 10000 ? 0 : 1,
}).format(x);
const num = (x: number) => x.toLocaleString(numberLocale(), { maximumFractionDigits: 1 });

export type Tip = { title: string; value: string; body: string; more: string };
export type Summary = {
  on: boolean;
  /** Удача рождения 0–100, её слово и цвет. */
  n: number;
  verdict: string;
  fill: string;
  ink: string;
  luck: number;
  scales: Record<ScaleKey, { p: number; value: string; threats: { kind: ThreatKind; label: string }[]; aria: string }>;
  aria: string;
  say: string;
  tip(key: TipKey): Tip;
};

export function summarize(land: Land | null): Summary | null {
  const s = land?.scales, f = land?.stats;
  if (!land || !s || !f) return null;
  const war = f[11] ?? 0, murders = f[12] ?? 0, malaria = f[13] ?? 0, hiv = f[14] ?? 0;
  const life = Math.round(f[1] ?? 0), income = f[3] ?? 0, school = Math.round(f[6] ?? 0);
  const threats = ([
    war > 0 && { kind: 'war', label: t(war >= 1 ? 'sum.war' : 'sum.conflict') },
    hiv >= 5 && { kind: 'hiv', label: t('sum.hiv') },
    malaria >= 0.5 && { kind: 'mal', label: t('sum.malaria') },
    murders >= 10 && { kind: 'crime', label: t('sum.crime') },
  ].filter(Boolean) as { kind: ThreatKind; label: string }[]).slice(0, 3);
  const n = Math.round(s.luck * 100);
  const tier = TIERS.find(x => n >= x[0]) ?? TIERS[TIERS.length - 1]!;
  const verdict = t(`sum.tier.${tier[1]}`);
  const better = (p: number) => {
    const m = Math.round(p * 100);
    return m < 3 ? t('sum.worseAll') : m > 97 ? t('sum.betterAll') : t('sum.better', { n: m });
  };
  const level = s.safety >= 0.6 ? t('sum.high') : s.safety >= 0.3 ? t('sum.medium') : t('sum.low');
  const values: Record<ScaleKey, string> = {
    life: t('sum.years', { n: life }),
    money: usd(income),
    school: t('sum.years', { n: school }),
    safety: threats.length ? '' : level,
  };
  const danger = [
    t(war >= 1 ? 'sum.danger.war' : war > 0 ? 'sum.danger.conflict' : 'sum.danger.noWar'),
    malaria >= 0.5 ? t('sum.danger.malaria') : '',
    hiv >= 5 ? t('sum.danger.hiv', { n: Math.round(hiv) }) : '',
    t('sum.danger.murders', { n: num(murders >= 10 ? Math.round(murders) : murders) }),
  ].filter(Boolean).join(' ');
  const tips: Record<TipKey, Tip> = {
    life: { title: t('sum.tip.life'), value: t('sum.yearsLong', { n: life }), body: t('sum.tip.lifeBody'), more: better(s.life) },
    money: { title: t('sum.tip.money'), value: t('sum.perYear', { v: usd(income) }), body: t('sum.tip.moneyBody', { world: usd(21000) }), more: better(s.money) },
    school: { title: t('sum.tip.school'), value: t('sum.yearsLong', { n: school }), body: t('sum.tip.schoolBody'), more: better(s.school) },
    safety: { title: t('sum.tip.safety'), value: threats.length ? threats.map(x => x.label).join(' · ') : level, body: danger, more: better(s.safety) },
    luck: { title: t('sum.tip.luck'), value: t('sum.tip.luckValue', { n }), body: t('sum.tip.luckBody'), more: t('sum.tip.luckMore') },
  };
  const scales = {} as Summary['scales'];
  for (const k of SCALE_KEYS) {
    const said = k === 'safety' && threats.length ? threats.map(x => x.label).join(', ') : values[k];
    scales[k] = { p: s[k], value: values[k], threats: k === 'safety' ? threats : [], aria: `${tips[k].title}: ${said}. ${better(s[k])} ${t('sum.tapMore')}` };
  }
  return {
    on: true, n, verdict, fill: tier[2], ink: tier[3], luck: s.luck, scales,
    aria: `${tips.luck.title}: ${tips.luck.value}, ${verdict}. ${t('sum.tapMore')}`,
    say: t('sum.say', { place: land.short, n, verdict }),
    tip: key => tips[key],
  };
}
