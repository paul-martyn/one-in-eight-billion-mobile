// «Where you stand»: место рождения и три вывода из функций оригинала (см. src/adapters/vm/odds.ts).
import type { OddsVM } from '../../../../adapters/vm/odds';
import { t, UI_LANG } from '../../../../i18n';

const num = (n: number) => n.toLocaleString(UI_LANG);

function shareText(vm: OddsVM): string {
  const s = vm.share;
  const p = { n: num(s.oneIn), share: s.share, country: s.country, year: s.year ?? '' };
  if (s.mode === 'pop') return t(s.year != null ? 'odds.tab.find.sharePop' : 'odds.tab.find.sharePopNoYear', p);
  return t(s.year != null ? 'odds.tab.find.share' : 'odds.tab.find.shareNoYear', p);
}

function wealthText(vm: OddsVM): string {
  const w = vm.wealth;
  return w.kind === 'income'
    ? t('odds.tab.find.income', { inCountry: w.inCountry, country: w.country, inWorld: w.inWorld })
    : t('odds.tab.find.family', { text: w.text });
}

function survivalText(vm: OddsVM): string {
  const s = vm.survival;
  const who = t(s.sex === 'F' ? 'odds.tab.girls' : 'odds.tab.boys');
  const p = { pct: s.pct, who, country: s.country, year: s.year ?? '', age: s.toAge };
  const key = s.reached
    ? s.year != null ? 'odds.tab.find.survive' : 'odds.tab.find.surviveNoYear'
    : s.year != null ? 'odds.tab.find.surviveTo' : 'odds.tab.find.surviveToNoYear';
  return t(key, p);
}

const FINDINGS: { id: 'share' | 'wealth' | 'survival'; glyph: string; bg: string }[] = [
  { id: 'share', glyph: '1', bg: '#3ec3d2' },
  { id: 'wealth', glyph: '%', bg: '#8fd14f' },
  { id: 'survival', glyph: '♥', bg: '#ff6f8a' },
];

export function WhereYouStand({ vm }: { vm: OddsVM }) {
  const sub = [
    t(vm.urban ? 'odds.tab.hero.city' : 'odds.tab.hero.rural'),
    vm.birthYear != null ? t(vm.sex === 'F' ? 'odds.tab.hero.bornF' : 'odds.tab.hero.bornM', { year: vm.birthYear }) : t(vm.sex === 'F' ? 'odds.tab.hero.girl' : 'odds.tab.hero.boy'),
    vm.quintile ? t('odds.tab.hero.fifth', { q: vm.quintile }) : null,
  ].filter(Boolean).join(' · ');
  const text = { share: shareText(vm), wealth: wealthText(vm), survival: survivalText(vm) };
  return (
    <section className="oat-hero odds-hero" aria-label={t('odds.tab.hero.label')}>
      <div className="odds-hero__top">
        <svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true" className="odds-hero__pin">
          <path d="M12 26s-8.5-7.6-8.5-14.4a8.5 8.5 0 0 1 17 0C20.5 18.4 12 26 12 26Z" fill="#ff6f8a" stroke="#7b4b2a" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="11.5" r="3.2" fill="#ffffff" stroke="#7b4b2a" strokeWidth="1.8" />
        </svg>
        <span className="odds-hero__id">
          <span className="odds-hero__place">{vm.bornPlace}</span>
          <span className="odds-hero__sub">{sub}</span>
          {vm.migrated ? <span className="odds-hero__sub">{t('odds.tab.hero.now', { place: vm.nowPlace })}</span> : null}
        </span>
      </div>
      <ul className="odds-find">
        {FINDINGS.map(f => (
          <li key={f.id} className="odds-find__item">
            <span className="odds-find__badge" style={{ background: f.bg }} aria-hidden="true">{f.glyph}</span>
            <span className="odds-find__text">{text[f.id]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
