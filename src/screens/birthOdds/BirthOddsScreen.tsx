// «3a · Your odds» (OddsCute.dc.html): всё о начале жизни, чего нет в записи о
// рождении. Числа — из snapshot.certificate (CertificateVM) и из birthOddsView
// (функции оригинала в песочнице). Отсчёт чисел при входе — только показ.
import { useEffect, useState } from 'react';
import spec from '../../design/motion.json';
import { t } from '../../i18n';
import { useCoreView, useSnapshot } from '../../adapters/useGame';
import { birthOddsView, type BirthOddsVM, type FactVM, type HomeCompareVM } from '../../adapters/vm/certificate';
import type { CertificateVM, CompanionVM } from '../../adapters/viewModels';
import { ChunkyButton, RoundButton, STAT_COLOR, type StatKey } from '../../ui/components';
import { BackIcon, StatIcon } from '../../ui/icons';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { ScreenProps } from '../registry';
import { birthDate, Initial, PORTRAIT_BG, sexLabel, useStartLife } from '../certificate/parts';
import '../certificate/certificate.css';
import './birthOdds.css';

const STATS: StatKey[] = ['hl', 'h', 'sm', 'so'];
const ENTER_MS = spec.sequences.countUp.durationMs;

/** Доля появления 0→1 с замедлением easeOutCubic (motion.json sequences.countUp). */
function useEntrance(reduced: boolean): number {
  const [k, setK] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { setK(1); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ENTER_MS);
      setK(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return k;
}

/** Каждое число в готовой строке оригинала растёт от нуля с тем же числом знаков; итог — исходная строка. */
const NUM = /\d[\d,]*(?:\.\d+)?/g;
function countUp(text: string, k: number): string {
  if (k >= 1) return text;
  return text.replace(NUM, m => {
    const dec = (m.split('.')[1] ?? '').length;
    const v = Number(m.replace(/,/g, ''));
    if (!Number.isFinite(v)) return m;
    return (v * k).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: m.includes(',') });
  });
}
function Count({ text, k }: { text: string; k: number }) {
  if (k >= 1) return <>{text}</>;
  return (
    <>
      <span aria-hidden="true">{countUp(text, k)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

export function BirthOddsScreen({ nav }: ScreenProps) {
  const snap = useSnapshot();
  const cert = snap.certificate;
  const view = useCoreView(birthOddsView);
  const reduced = useReducedMotion();
  const k = useEntrance(reduced);
  const { start, busy } = useStartLife(nav);
  const back = () => nav.go({ id: 'certificate', filled: true }, 'pop');

  return (
    <main className="screen bo">
      <header className="bo-head">
        <RoundButton className="bo-back" aria-label={t('odds.back')} onClick={back}><BackIcon size={20} /></RoundButton>
        <h1 className="k-o bo-title">{t('odds.title')}</h1>
        <span aria-hidden="true" />
      </header>

      <div className="bo-scroll scroll">
        {cert ? <OddsContent cert={cert} view={view} k={k} /> : <p className="bo-wait" role="status">{t('birthOdds.loading')}</p>}
      </div>

      <footer className="bo-foot">
        <ChunkyButton className="bo-cta" onClick={start} disabled={busy || !cert}>{t('cert.start')}</ChunkyButton>
      </footer>
    </main>
  );
}

function OddsContent({ cert, view, k }: { cert: CertificateVM; view: BirthOddsVM | null; k: number }) {
  const date = birthDate(cert.month, cert.year);
  return (
    <>
      <div className="bo-id">
        <Initial name={cert.given || cert.name} bg={PORTRAIT_BG.baby} className="bo-id__face" />
        <span className="bo-id__text">
          <span className="bo-id__name">{cert.name}</span>
          <span className="bo-id__meta">{t('birthOdds.born', { date, place: cert.place })}</span>
        </span>
      </div>

      <h2 className="bo-h2">{t('odds.startingStats')}</h2>
      <div className="bo-card bo-stats">
        {STATS.map(s => <OddsMeter key={s} stat={s} label={t(`stat.${s}`)} value={cert.stats[s]} k={k} />)}
      </div>

      <h2 className="bo-h2">{t('odds.yourOdds')}</h2>
      <div className="bo-tiles">
        <Tile k={k} value={cert.survival.to5} caption={t('birthOdds.reach5')} />
        <Tile k={k} value={cert.survival.to18} caption={t('birthOdds.reach18')} />
        <Tile k={k} value={cert.survival.to65} caption={t('birthOdds.reach65')} />
        <Tile k={k} value={cert.lifeExpectancy.toFixed(1)} unit={t('birthOdds.yrs')} caption={t('birthOdds.lifespan')} />
        {view?.edu && (
          <>
            <Tile k={k} value={view.edu.school} caption={t(view.edu.oneSecondary ? 'birthOdds.schoolOneSec' : 'birthOdds.school')} />
            <Tile k={k} value={view.edu.uni} caption={t('birthOdds.uni')} />
          </>
        )}
      </div>
      {view?.edu && <p className="bo-note">{t('birthOdds.eduNote', { country: cert.country, source: view.edu.schoolSource })}</p>}

      <h2 className="bo-h2">{t('odds.bornIn', { country: cert.country })}</h2>
      <ShareBlock cert={cert} view={view} k={k} />
      {view && <Facts facts={view.facts} k={k} />}
      <div className="bo-tile bo-place">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" />
        </svg>
        <p><strong>{t('birthOdds.placeLine', { place: cert.place })}</strong> {t(cert.urban ? 'birthOdds.cityBirth' : 'birthOdds.ruralBirth')} {cert.ruralLine}</p>
      </div>

      <h2 className="bo-h2">{t('odds.sameSecond')}</h2>
      {cert.companions.length ? (
        <>
          <ul className="bo-comps">
            {cert.companions.map((c, i) => <Companion key={`${c.name}-${i}`} c={c} />)}
          </ul>
          <p className="bo-note">{t('odds.wealthDots')}</p>
          <p className="bo-note">{t('odds.sameSecondNote')}</p>
        </>
      ) : (
        <p className="bo-note" role="status">{t('odds.pending')}</p>
      )}

      {view?.home && <HomeCompare home={view.home} sex={cert.sex} k={k} />}
    </>
  );
}

/** Показатель 0–100: полоса растёт преобразованием (scaleX), число — отсчётом; meter сообщает итог. */
function OddsMeter({ stat, label, value, k }: { stat: StatKey; label: string; value: number; k: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="bo-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <p className="bo-meter__label">{label}</p>
      <div className="bo-meter__bar" aria-hidden="true">
        <span className="bo-meter__fill" style={{ background: STAT_COLOR[stat], transform: `scaleX(${(v / 100) * k})` }} />
        <span className="bo-meter__over">
          <StatIcon k={stat} size={16} />
          <span className="k-o tabular bo-meter__num">{Math.round(value * k)}</span>
        </span>
      </div>
    </div>
  );
}

function Tile({ value, unit, caption, k }: { value: string; unit?: string; caption: string; k: number }) {
  return (
    <div className="bo-tile">
      <p className="bo-tile__value tabular"><Count text={value} k={k} />{unit && <span className="bo-tile__unit"> {unit}</span>}</p>
      <p className="bo-tile__caption">{caption}</p>
    </div>
  );
}

function ShareBlock({ cert, view, k }: { cert: CertificateVM; view: BirthOddsVM | null; k: number }) {
  const oneIn = cert.shareOneIn.toLocaleString('en-US');
  const textKey = view?.pastEra
    ? (view.byPopulation ? 'birthOdds.sharePastPop' : 'birthOdds.sharePastBirths')
    : (view?.byPopulation ? 'birthOdds.sharePop' : 'birthOdds.shareBirths');
  const per100 = view ? Math.round(view.share * 100) : null;
  const filled = per100 == null ? 0 : Math.round(per100 * k);
  return (
    <div className="bo-share">
      {per100 != null && (
        <div className="bo-grid" role="img" aria-label={t(view?.byPopulation ? 'birthOdds.gridPop' : 'birthOdds.gridBirths', { n: per100, country: cert.country })}>
          {Array.from({ length: 100 }, (_, i) => <span key={i} className={i < filled ? 'is-on' : ''} />)}
        </div>
      )}
      <p className="bo-share__text">
        <strong className="bo-share__big tabular"><Count text={cert.share} k={k} /></strong>
        <br />
        {t(textKey, { country: cert.country, oneIn, year: cert.year })}
      </p>
    </div>
  );
}

function Facts({ facts, k }: { facts: BirthOddsVM['facts']; k: number }) {
  const list = [facts.population, facts.births, facts.urban, facts.gdp].filter((f): f is FactVM => !!f);
  if (!list.length) return null;
  return (
    <dl className="bo-facts">
      {list.map(f => (
        <div key={f.label} className="bo-fact">
          <dt>{f.label}</dt>
          <dd className="tabular"><Count text={f.value} k={k} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Companion({ c }: { c: CompanionVM }) {
  return (
    <li className="bo-comp">
      <span className="bo-comp__text">
        <span className="bo-comp__name">{c.name}</span>
        <span className="bo-comp__meta">{sexLabel(c.sex)} · {c.place}</span>
      </span>
      <span className="bo-dots" role="img" aria-label={t('birthOdds.wealth', { family: c.family, q: c.quintile })}>
        {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= c.quintile ? 'is-on' : ''} />)}
      </span>
    </li>
  );
}

/** «If you’d been born in …» — только если в жизни задана настоящая страна игрока (S.home). */
function HomeCompare({ home, sex, k }: { home: HomeCompareVM; sex: 'F' | 'M'; k: number }) {
  const r = home.rows;
  const yrs = (n: number) => `${n.toFixed(1)} ${t('birthOdds.yrs')}`;
  const rows: [string, string, string][] = [
    [t('birthOdds.row.le'), yrs(r.lifeExpectancy.here), yrs(r.lifeExpectancy.home)],
    [t('birthOdds.row.u5'), r.under5.here, r.under5.home],
    [t('birthOdds.row.eys'), `${r.schoolYears.here} ${t('birthOdds.yrs')}`, `${r.schoolYears.home} ${t('birthOdds.yrs')}`],
    [t('birthOdds.row.gdp'), r.gdp.here, r.gdp.home],
  ];
  return (
    <section aria-labelledby="bo-home-h">
      <h2 className="bo-h2" id="bo-home-h">{t('odds.ifHome', { country: home.home })}</h2>
      {home.same ? (
        <p className="bo-home-same">{t('birthOdds.homeSame', { country: home.here })}</p>
      ) : (
        <table className="bo-table">
          <thead>
            <tr>
              <th scope="col">{t(sex === 'F' ? 'birthOdds.forSex.F' : 'birthOdds.forSex.M')}</th>
              <th scope="col">{home.here}</th>
              <th scope="col">{home.home}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, here, there]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className="is-here tabular"><Count text={here} k={k} /></td>
                <td className="tabular"><Count text={there} k={k} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {home.guessed && <p className="bo-note">{t('birthOdds.homeGuessed', { country: home.home })}</p>}
    </section>
  );
}
