// «3a · Your start in life» (OddsCute холста, дубль 2 · A): всё о начале жизни, чего нет
// в записи о рождении. Шапка с кнопкой «назад» и именем не прокручивается; ниже —
// прогноз срока жизни, стартовые показатели, жизнь впереди (доживут до 5, окончат школу,
// доживут до 18, окончат университет, доживут до 65), страна рождения, родившиеся в ту
// же секунду и сравнение со страной игрока. Блоки появляются по очереди, а те, что ниже, —
// когда доезжают до экрана; силуэты заполняются, числа считают. Start life — только на
// свидетельстве. Числа — из snapshot.certificate (CertificateVM) и birthOddsView (функции
// оригинала в песочнице); удача рождения «соседей» — из таблиц планеты (страны движка).
// Появление и отсчёт — только показ.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t, UI_LANG, formatNumber } from '../../i18n';
import { scaleNumbers } from '../../i18n/numbers';
import { useAdapter, useCoreView, useSnapshot } from '../../adapters/useGame';
import { companionAppearances } from '../../adapters/vm/appearance';
import { birthOddsView, type BirthOddsVM, type FactVM, type HomeCompareVM } from '../../adapters/vm/certificate';
import type { CertificateVM } from '../../adapters/viewModels';
import { Frame, useFrame } from '../../ui/frame/Frame';
import { useFontsReady } from '../../ui/frame/fit';
import { useReducedMotion } from '../../ui/motionPrefs';
import { PersonPortrait } from '../../ui/people/PersonArt';
import { BabyGlyph } from '../../ui/planet/glyphs';
import { luckOf } from '../../ui/planet/planetCore.js';
import type { ScreenProps } from '../registry';
import { birthDate, Initial, PORTRAIT_BG, sexLabel } from '../certificate/parts';
import { tierOf } from '../roll/luck';
import { ICON, SIL } from './oddsArt';
import '../certificate/certificate.css';
import './birthOdds.css';

type Block = 'forecast' | 'stats' | 'life' | 'born' | 'same' | 'cmp';
const BLOCKS: Block[] = ['forecast', 'stats', 'life', 'born', 'same', 'cmp'];
// Раньше этого блок не начинается (мс от открытия экрана): первые идут по очереди; блоки,
// доехавшие до экрана вместе, стартуют через GAP друг за другом (OddsCute SLOT / GAP).
const SLOT: Record<Block, number> = { forecast: 160, stats: 290, life: 420, born: 550, same: 0, cmp: 0 };
const GAP = 130, IN_MS = 380, COUNT_MS = 760, STEP_MS = 90;
/** Сколько длится блок вместе со своими строками. */
const LONG: Record<Block, number> = { forecast: 1000, stats: 1000, life: 160 + 4 * STEP_MS + COUNT_MS + 60, born: 1160, same: 160 + 3 * STEP_MS + COUNT_MS + 60, cmp: 100 + 3 * 70 + IN_MS };
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const out3 = (x: number) => 1 - Math.pow(1 - x, 3);
const outBack = (x: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

/**
 * Появление блоков: каждый играет один раз, когда попал на экран (IntersectionObserver),
 * в порядке сверху вниз. p(блок, задержка, длительность) — доля 0–1 части блока.
 */
function useReveal(reduced: boolean) {
  const t0 = useRef(performance.now());
  const seen = useRef<Partial<Record<Block, number>>>({});
  const els = useRef<Partial<Record<Block, Element | null>>>({});
  const io = useRef<IntersectionObserver | null>(null);
  const raf = useRef(0);
  const [now, setNow] = useState(() => performance.now());

  const play = () => {
    if (raf.current) return;
    const tick = () => {
      raf.current = 0;
      const n = performance.now();
      setNow(n);
      if (BLOCKS.some(k => seen.current[k] != null && n < seen.current[k]! + LONG[k])) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const seeAll = (keys: (string | null)[]) => {
    const n = performance.now();
    const fresh = BLOCKS.filter(k => keys.includes(k) && seen.current[k] == null);
    fresh.forEach((k, i) => { seen.current[k] = Math.max(n + i * GAP, t0.current + SLOT[k]); });
    if (fresh.length) play();
  };
  useEffect(() => {
    if (reduced) return;
    if (typeof IntersectionObserver !== 'function') { seeAll(BLOCKS); return; }
    io.current = new IntersectionObserver(list => seeAll(list.filter(e => e.isIntersecting).map(e => e.target.getAttribute('data-block'))), { threshold: 0.2 });
    BLOCKS.forEach(k => { const el = els.current[k]; if (el) io.current!.observe(el); });
    return () => { io.current?.disconnect(); io.current = null; cancelAnimationFrame(raf.current); raf.current = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const watch = (k: Block) => (el: Element | null) => {
    if (el === els.current[k]) return;
    if (els.current[k] && io.current) io.current.unobserve(els.current[k]!);
    els.current[k] = el;
    if (el && io.current) io.current.observe(el);
  };
  const p = (k: Block, delay: number, ms: number) => (reduced ? 1 : seen.current[k] == null ? 0 : clamp01((now - seen.current[k]! - delay) / ms));
  return { watch, p };
}

const rise = (x: number, dx: number, dy: number) => { const e = out3(x); return { opacity: +e.toFixed(3), transform: `translate(${((1 - e) * dx).toFixed(1)}px, ${((1 - e) * dy).toFixed(1)}px)` }; };
/** Первое число в готовой строке оригинала («97 %», «97,3%») как число. */
const firstNumber = (text: string) => { const m = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, '')); return m ? parseFloat(m[0].replace(',', '.')) : 0; };

/** Силуэт, который заполняется снизу вверх: f — доля 0–1; цвета — ступени или собственные. */
function Sil({ name, size, f, tier }: { name: string; size?: number; f: number; tier?: { fill: string; pale: string } }) {
  const a = SIL[name]!;
  const k = (size ?? a.box) / a.box;
  const paint = (svg: string) => svg.replace(/\{off\}/g, tier?.pale ?? a.off).replace(/\{on\}/g, tier?.fill ?? a.on);
  return (
    <span className="od-sil" style={{ width: a.box, height: a.box, transform: k === 1 ? undefined : `scale(${k})`, margin: k === 1 ? undefined : `${(a.box * (k - 1)) / 2}px` }} aria-hidden="true">
      <span dangerouslySetInnerHTML={{ __html: paint(a.base) }} />
      <span className="od-sil__fill" style={{ height: a.b0 + clamp01(f) * a.span }}>
        <span dangerouslySetInnerHTML={{ __html: paint(a.fill) }} />
      </span>
      {a.over && <span className="od-sil__over" dangerouslySetInnerHTML={{ __html: a.over }} />}
    </span>
  );
}
const Icon = ({ name }: { name: string }) => <span className="od-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON[name] ?? '' }} />;

export function BirthOddsScreen({ nav }: ScreenProps) {
  const snap = useSnapshot();
  const cert = snap.certificate;
  const view = useCoreView(birthOddsView);
  const frame = useFrame();
  useFontsReady();
  const back = () => nav.go({ id: 'certificate', filled: true }, 'pop');
  // Шапка: на высоком экране — как в макете (46 сверху), на коротком — ниже отступ.
  const tall = Math.max(0, Math.min(1, (frame.H - 699) / (852 - 699)));
  const headPad = frame.top + Math.round(12 + 34 * tall);

  return (
    <main className="screen od">
      <Frame>
        <div className="od-scroll scroll" style={{ top: headPad + 62 }}>
          {cert ? <OddsContent cert={cert} view={view} /> : <p className="od-wait" role="status">{t('birthOdds.loading')}</p>}
        </div>
        <header className="od-head" style={{ height: headPad + 62, paddingTop: headPad }}>
          <button type="button" className="od-back" aria-label={t('odds.back')} onClick={back}><Icon name="back" /></button>
          {cert && (
            <div className="od-who">
              <span className="od-who__text">
                <b>{cert.name}</b>
                <span>{t('birthOdds.born', { date: birthDate(cert.month, cert.year), place: cert.place })}</span>
              </span>
              <Initial name={cert.given || cert.name} bg={PORTRAIT_BG.baby} className="od-who__face" />
            </div>
          )}
        </header>
      </Frame>
    </main>
  );
}

function OddsContent({ cert, view }: { cert: CertificateVM; view: BirthOddsVM | null }) {
  const reduced = useReducedMotion();
  const locale = useAdapter().formatLocale();
  const looks = useCoreView(companionAppearances);
  const { watch, p } = useReveal(reduced);
  const block = (k: Block) => rise(p(k, 0, IN_MS), 0, 14);
  /** Число в готовой строке растёт от нуля с тем же числом знаков; читалке — исходная строка. */
  const count = (text: string, x: number): ReactNode => (x >= 1 ? text : (<><span aria-hidden="true">{scaleNumbers(text, out3(x), locale)}</span><span className="sr-only">{text}</span></>));
  /** «97 %» — число крупно, знак процента мельче. */
  const percent = (text: string, x: number): ReactNode => {
    const m = /^(.*?)(\s*%)$/.exec(text);
    return m ? <>{count(m[1]!, x)}<span className="od-pct">%</span></> : count(text, x);
  };
  /** «71 год»: число крупно, слово мельче (как в макете). */
  const yearsBig = (n: number, x: number): ReactNode => {
    const text = t('sum.yearsLong', { n }), m = /^(D*d+)(.*)$/.exec(text);
    return m ? <>{count(m[1]!, x)}<span className="od-unit">{m[2]}</span></> : count(text, x);
  };
  const lower = (s: string) => (UI_LANG === 'de' ? s : s.toLocaleLowerCase(UI_LANG));

  // Прогноз: ожидаемый срок жизни; рядом — мир и страна игрока (если она задана и другая).
  const life = cert.lifeExpectancy;
  const kLife = p('forecast', 120, COUNT_MS);
  const home = view?.home && !view.home.same ? view.home : null;
  const aside = [t('odds2.world', { n: 73 }), home ? t('odds2.homeLife', { country: home.home, n: Math.round(home.rows.lifeExpectancy.home) }) : ''].filter(Boolean).join(' · ');

  // Стартовые показатели.
  const kStats = out3(p('stats', 120, COUNT_MS));
  const stats: [string, 'hl' | 'h' | 'sm' | 'so'][] = [['health', 'hl'], ['joy', 'h'], ['mind', 'sm'], ['ties', 'so']];

  // Жизнь впереди: доли поколения страны (не прогноз для игрока).
  const steps = useMemo(() => {
    const rows: { art: string; value: string; label: string; sub?: string }[] = [
      { art: 'age5', value: cert.survival.to5, label: t('birthOdds.reach5'), sub: t('odds2.withYou', { country: cert.country }) },
    ];
    if (view?.edu) rows.push({ art: 'school', value: view.edu.school, label: t(view.edu.oneSecondary ? 'birthOdds.schoolOneSec' : 'birthOdds.school') });
    rows.push({ art: 'age18', value: cert.survival.to18, label: t('birthOdds.reach18') });
    if (view?.edu) rows.push({ art: 'uni', value: view.edu.uni, label: t('birthOdds.uni') });
    rows.push({ art: 'age65', value: cert.survival.to65, label: t('birthOdds.reach65') });
    return rows;
  }, [cert, view]);

  // Где вы родились.
  const bornKey = view?.pastEra ? (view.byPopulation ? 'odds2.bornHerePopPast' : 'odds2.bornHereBirthsPast') : view?.byPopulation ? 'odds2.bornHerePop' : 'odds2.bornHereBirths';
  const facts: [string, FactVM, number][] = view
    ? ([['people', view.facts.population, 180], ['cities', view.facts.urban, 240], ['income', view.facts.gdp, 300]] as [string, FactVM | null, number][]).filter((f): f is [string, FactVM, number] => !!f[1])
    : [];

  return (
    <>
      <section className="od-block" data-block="forecast" ref={watch('forecast')} style={block('forecast')}>
        <h2 className="od-h2">{t('odds2.forecast')}</h2>
        <div className="od-plaque" style={{ transform: `scale(${(0.88 + 0.12 * outBack(p('forecast', 0, 480))).toFixed(3)})` }}>
          <i className="od-stud od-stud--tl" /><i className="od-stud od-stud--tr" /><i className="od-stud od-stud--bl" /><i className="od-stud od-stud--br" />
          <Sil name="hourglass" f={(life / 100) * out3(kLife)} tier={tierOf(life)} />
          <div className="od-plaque__text">
            <span className="od-plaque__lead">{t('odds2.likely')}</span>
            <b className="od-big od-big--26">~{yearsBig(Math.round(life), kLife)}</b>
            <span className="od-plaque__aside">{aside}</span>
          </div>
        </div>
      </section>

      <section className="od-block" data-block="stats" ref={watch('stats')} style={block('stats')}>
        <h2 className="od-h2">{t('odds.startingStats')}</h2>
        <div className="od-card od-stats" role="group" aria-label={t('odds.startingStats')}>
          {stats.map(([art, key]) => (
            <div key={key} className="od-stat" role="meter" aria-label={t(`stat.${key}`)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cert.stats[key])}>
              <Sil name={art} f={(cert.stats[key] / 100) * kStats} />
              <b aria-hidden="true">{Math.round(cert.stats[key] * kStats)}</b>
              <span aria-hidden="true">{lower(t(`stat.${key}`))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="od-block" data-block="life" ref={watch('life')} style={block('life')}>
        <h2 className="od-h2">{t('odds2.lifeAhead')}</h2>
        <div className="od-card od-life">
          <i className="od-life__line" aria-hidden="true" />
          {steps.map((s, i) => {
            const n = firstNumber(s.value), x = p('life', 160 + i * STEP_MS, COUNT_MS);
            return (
              <div key={s.art} className="od-step" style={rise(p('life', 100 + i * STEP_MS, IN_MS), -12, 0)}>
                <span className="od-step__icon"><Sil name={s.art} f={(n / 100) * out3(x)} tier={tierOf(n)} /></span>
                <div className="od-step__text">
                  <div><b className="od-big od-big--22">{percent(s.value, x)}</b><span className="od-step__label">{s.label}</span></div>
                  {s.sub && <span className="od-step__sub">{s.sub}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {view?.edu && <p className="od-note">{t('birthOdds.eduNote', { country: cert.country, source: view.edu.schoolSource })}</p>}
      </section>

      <section className="od-block" data-block="born" ref={watch('born')} style={block('born')}>
        <h2 className="od-h2">{t('odds2.whereBorn')}</h2>
        <div className="od-card od-born">
          <div className="od-born__top">
            <span className="od-born__one" style={{ transform: `scale(${(0.7 + 0.3 * outBack(p('born', 140, 460))).toFixed(3)})` }}><b className="od-big od-big--26">{t('odds2.oneIn', { n: formatNumber(cert.shareOneIn) })}</b></span>
            <span className="od-born__text">{t(bornKey, { country: cert.country, year: cert.year })}</span>
          </div>
          {facts.length > 0 && (
            <dl className="od-facts">
              {facts.map(([icon, f, delay]) => (
                <div key={icon} className="od-fact">
                  <Icon name={icon} />
                  <dd>{count(f.value, p('born', delay, COUNT_MS))}</dd>
                  <dt>{f.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="od-block" data-block="same" ref={watch('same')} style={block('same')}>
        <h2 className="od-h2">{t('odds.sameSecond')}</h2>
        {cert.companions.length ? (
          <>
            <ul className="od-card od-same">
              {cert.companions.slice(0, 4).map((c, i) => {
                const luck = luckOf(c.iso), n = luck == null ? null : Math.round(luck * 100), x = out3(p('same', 160 + i * STEP_MS, COUNT_MS));
                return (
                  <li key={`${c.name}-${i}`} className="od-comp" style={rise(p('same', 100 + i * STEP_MS, IN_MS), -12, 0)} aria-label={`${c.name}, ${sexLabel(c.sex)} · ${c.place}${n == null ? '' : `, ${t('odds2.luck', { n })}`}`}>
                    <span className="od-comp__face" aria-hidden="true"><PersonPortrait look={looks?.[i] ?? null} fallback={<BabyGlyph size={34} />} /></span>
                    <span className="od-comp__text" aria-hidden="true">
                      <b>{c.name}</b>
                      <span>{sexLabel(c.sex)} · {c.place}</span>
                    </span>
                    {n != null && (
                      <span className="od-comp__luck" aria-hidden="true">
                        <Sil name="clover" f={(n / 100) * x} tier={tierOf(n)} />
                        <b>{Math.round(n * x)}</b>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="od-note od-note--icon"><Icon name="cloverNote" /><span>{t('odds2.cloverNote')}</span></p>
            <p className="od-note">{t('odds.sameSecondNote')}</p>
          </>
        ) : (
          <p className="od-note" role="status">{t('odds.pending')}</p>
        )}
      </section>

      {view?.home && (
        <section className="od-block" data-block="cmp" ref={watch('cmp')} style={block('cmp')}>
          <h2 className="od-h2">{t('odds2.comparison')}</h2>
          <Comparison home={view.home} rowStyle={i => rise(p('cmp', 100 + i * 70, IN_MS), 0, 8)} />
        </section>
      )}
    </>
  );
}

/** Сравнение со страной игрока (S.home): где показатель лучше — зелёный со стрелкой вверх, где хуже — красный. */
function Comparison({ home, rowStyle }: { home: HomeCompareVM; rowStyle: (i: number) => { opacity: number; transform: string } }) {
  if (home.same) return <p className="od-card od-plain">{t('birthOdds.homeSame', { country: home.here })}</p>;
  const r = home.rows, yrs = (n: number) => t('sum.years', { n: Math.round(n) });
  const rows: [string, string, string, 'here' | 'home' | 'same'][] = [
    [t('birthOdds.row.le'), yrs(r.lifeExpectancy.here), yrs(r.lifeExpectancy.home), home.better.lifeExpectancy],
    [t('birthOdds.row.u5'), r.under5.here, r.under5.home, home.better.under5],
    [t('birthOdds.row.eys'), String(Math.round(r.schoolYears.here)), String(Math.round(r.schoolYears.home)), home.better.schoolYears],
    [t('birthOdds.row.gdp'), r.gdp.here, r.gdp.home, home.better.gdp],
  ];
  const chip = (text: string, side: 'here' | 'home', better: 'here' | 'home' | 'same') => {
    const state = better === 'same' ? 'same' : better === side ? 'up' : 'down';
    return (
      <td>
        <span className={`od-chip od-chip--${state}`}>
          {state !== 'same' && <Icon name={state} />}
          <span>{text}</span>
          {state !== 'same' && <span className="sr-only">{t(state === 'up' ? 'odds2.better' : 'odds2.worse')}</span>}
        </span>
      </td>
    );
  };
  return (
    <>
      <table className="od-card od-cmp">
        <thead>
          <tr>
            <td />
            <th scope="col"><b>{home.here}</b><span>{t('odds2.bornHereCol')}</span></th>
            <th scope="col"><b>{home.home}</b><span>{t('odds2.yourCountry')}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, here, there, better], i) => (
            <tr key={label} style={rowStyle(i)}>
              <th scope="row">{label}</th>
              {chip(here, 'here', better)}
              {chip(there, 'home', better)}
            </tr>
          ))}
        </tbody>
      </table>
      {home.guessed && <p className="od-note">{t('birthOdds.homeGuessed', { country: home.home })}</p>}
    </>
  );
}
