// «Survival»: кривая доживания когорты рождения против мира (данные chartSVG оригинала).
// Кривые раскрываются слева направо за 900 мс (ease-out cubic), отметки статичны — как в макете.
import { useId } from 'react';
import type { OddsChartVM, OddsVM } from '../../../../adapters/vm/odds';
import { t } from '../../../../i18n';
import { countText, useEnterProgress } from './enter';

// Геометрия макета: viewBox 329×190, возраст 0→100 по x 34→319, доля 0→1 по y 152→14.
const W = 329, H = 190, X0 = 34, X1 = 319, Y0 = 152, Y1 = 14;
const x = (age: number) => X0 + ((X1 - X0) * Math.max(0, Math.min(100, age))) / 100;
const y = (l: number) => Y0 - (Y0 - Y1) * Math.max(0, Math.min(1, l));
const COLORS: Record<string, string> = { born: '#e0702a', world: '#2593a3', current: '#b48cff' };

const pathOf = (l: number[]) => l.map((v, a) => `${a ? 'L' : 'M'}${x(a).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

function Chart({ chart, k, label, you }: { chart: OddsChartVM; k: number; label: string; you: string }) {
  const clip = `odds-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const mx = x(chart.markAge), my = y(chart.markL);
  const tagW = Math.max(54, Math.round(you.length * 6.2 + 14));
  const tagX = mx + 8 + tagW > X1 ? mx - 8 - tagW : mx + 8;
  const tagY = my + 8 + 20 > Y0 ? my - 28 : my + 8;
  const leX = x(chart.le);
  return (
    <svg className="odds-chart" width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <g stroke="#e2c595" strokeWidth="1">
        {[0, 0.25, 0.5, 0.75, 1].map(v => <path key={v} d={`M${X0} ${y(v)} H${X1}`} />)}
      </g>
      <g className="odds-chart__axis">
        <text x="28" y={y(0) + 3.5} textAnchor="end">0%</text>
        <text x="28" y={y(0.5) + 3.5} textAnchor="end">50%</text>
        <text x="28" y={y(1) + 3.5} textAnchor="end">100%</text>
        {[0, 20, 40, 60, 80, 100].map(a => <text key={a} x={x(a)} y="168" textAnchor="middle">{a}</text>)}
        <text x={X1} y="182" textAnchor="end">{t('odds.tab.surv.age')}</text>
      </g>
      <defs>
        <clipPath id={clip}><rect x="0" y="0" width={30 + (W - 6 - 30) * k} height={H} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {chart.curves.filter(c => c.id === 'world').map(c => <path key={c.id} d={pathOf(c.l)} stroke={COLORS.world} strokeWidth="2.5" strokeDasharray="5 4" />)}
        {chart.curves.filter(c => c.id === 'current').map(c => <path key={c.id} d={pathOf(c.l)} stroke={COLORS.current} strokeWidth="2.5" />)}
        {chart.curves.filter(c => c.id === 'born').map(c => <path key={c.id} d={pathOf(c.l)} stroke={COLORS.born} strokeWidth="3" />)}
      </g>
      <path d={`M${leX} ${Y0} V${Y0 + 6}`} stroke="#7b4b2a" strokeWidth="2" />
      <text x={leX} y={Y0 - 6} textAnchor="middle" className="odds-chart__le">{t('odds.tab.surv.leTick', { le: Math.round(chart.le) })}</text>
      <path d={`M${mx} ${Y1} V${Y0}`} stroke="#7b4b2a" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx={mx} cy={my} r="6" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="2" />
      <g transform={`translate(${tagX} ${tagY})`}>
        <rect width={tagW} height="20" rx="6" fill="#fff3d6" stroke="#7b4b2a" strokeWidth="1.5" />
        <text x={tagW / 2} y="14" textAnchor="middle" className="odds-chart__you">{you}</text>
      </g>
    </svg>
  );
}

export function SurvivalSection({ vm }: { vm: OddsVM }) {
  const k = useEnterProgress();
  const { chart, survival } = vm;
  const who = t(vm.sex === 'F' ? 'odds.tab.girls' : 'odds.tab.boys');
  const born = chart.curves.find(c => c.id === 'born');
  const world = chart.curves.find(c => c.id === 'world');
  const current = chart.curves.find(c => c.id === 'current');
  const you = t('odds.tab.surv.you', { age: vm.age });
  const label = t('odds.tab.surv.aria', { who, country: vm.bornCountry, age: chart.markAge, pct: chart.markPct });
  const le = chart.le.toFixed(1), worldLe = chart.worldLe.toFixed(1);
  return (
    <section className="oat-card odds-section" aria-label={t('odds.tab.sec.survival')}>
      <h2 className="odds-section__title">{t('odds.tab.surv.title')}</h2>
      <p className="odds-legend">
        {born && <span><i className="odds-legend__line" style={{ background: COLORS.born }} />{vm.birthYear != null ? t('odds.tab.surv.legendBorn', { who: capital(who), country: born.country, year: vm.birthYear }) : t('odds.tab.surv.legendBornNoYear', { who: capital(who), country: born.country })}</span>}
        {world && <span><i className="odds-legend__line odds-legend__line--dash" style={{ borderColor: COLORS.world }} />{world.country}</span>}
        {current && <span><i className="odds-legend__line" style={{ background: COLORS.current }} />{t('odds.tab.surv.legendCurrent', { country: current.country })}</span>}
      </p>
      <Chart chart={chart} k={k} label={label} you={you} />
      <div className="odds-tiles">
        <div className="odds-tile">
          <span className="odds-tile__value tabular">{countText(`${le} · ${worldLe}`, k)}</span>
          <span className="odds-tile__label">{t('odds.tab.surv.leLabel', { country: vm.bornCountry })}</span>
        </div>
        <div className="odds-tile">
          <span className="odds-tile__value tabular">{countText(survival.pct, k)}</span>
          <span className="odds-tile__label">{t('odds.tab.surv.reachLabel', { who, age: survival.toAge })}</span>
        </div>
      </div>
      <p className="oat-note odds-section__note">{t(vm.sex === 'F' ? 'odds.tab.surv.noteF' : 'odds.tab.surv.noteM', { name: vm.given || vm.name })}</p>
    </section>
  );
}

const capital = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);
