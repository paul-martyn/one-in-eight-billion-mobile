// «3 · Birth certificate» (CertCute.dc.html): поэтапная анимация рождения и
// свидетельство о рождении. Все записи — из snapshot.certificate (CertificateVM,
// построен функциями оригинала в showCert). Анимация только показывает уже
// определённое рождение; пропуск и повтор не трогают состояние игры.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import spec from '../../design/motion.json';
import { t } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import type { CertificateVM } from '../../adapters/viewModels';
import type { Nav } from '../../flow/FlowHost';
import { ChunkyButton, RoundButton, SoftButton } from '../../ui/components';
import { BarsIcon, ReplayIcon } from '../../ui/icons';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { ScreenProps } from '../registry';
import { birthDate, graphemes, Initial, PeopleGlyph, PORTRAIT_BG, sexLabel, sexWord, useStartLife } from './parts';
import './certificate.css';

const SEQ = spec.sequences.certificate;
/** Начала этапов: мама, папа, линии, малыш, имя, свидетельство (мс от открытия). */
const PHASES = [SEQ.phasesMs.parents, SEQ.phasesMs.dad, SEQ.phasesMs.tree, SEQ.phasesMs.baby, SEQ.phasesMs.name, SEQ.phasesMs.toCertificate];
const CERT_PHASE = PHASES.length;
const bezier = (k: keyof typeof spec.easing) => `cubic-bezier(${(spec.easing[k] as number[]).join(',')})`;
const ROOT_VARS = {
  '--cs-pop': bezier('pop'),
  '--cs-glide': bezier('glide'),
  '--cs-flight-ms': `${SEQ.babyFlight.durationMs}ms`,
  '--cs-flight-delay': `${SEQ.babyFlight.delayMs}ms`,
  '--cs-slide-ms': `${SEQ.certificateSlide.durationMs}ms`,
  '--cs-slide-delay': `${SEQ.certificateSlide.delayMs}ms`,
  '--cs-stamp-ms': `${SEQ.stamp.durationMs}ms`,
  '--cs-stamp-delay': `${SEQ.stamp.delayMs}ms`,
  '--cs-caret-ms': `${SEQ.typing.caretBlinkMs}ms`,
} as CSSProperties;

export function CertificateScreen({ screen, nav }: ScreenProps) {
  const snap = useSnapshot();
  const cert = snap.certificate;
  const filled = screen.id === 'certificate' && screen.filled;
  if (!cert) return <CertificateWaiting />;
  return <CertificateView key={cert.certNo} cert={cert} filled={filled} nav={nav} />;
}

/** Свидетельства ещё нет (сопутствующие жизни досчитываются): короткое честное ожидание. */
function CertificateWaiting() {
  const adapter = useAdapter();
  const snap = useSnapshot();
  // До revealCertificate адаптер ещё не публикует фазу рождения; саму возможность проверяет команда.
  const canReveal = snap.status === 'ready' && snap.lifeSeq > 0 && snap.companionsReady && snap.lifePhase !== 'life' && snap.lifePhase !== 'dead';
  return (
    <main className="screen cs cs--waiting" aria-busy={!canReveal}>
      <div className="cs-wait">
        <Initial name="?" bg={PORTRAIT_BG.baby} className="cs-wait__face" />
        <p className="cs-wait__text" role="status">{canReveal ? t('certificate.ready') : t('certificate.loading')}</p>
        {canReveal && <ChunkyButton onClick={() => adapter.revealCertificate(gestureId())}>{t('certificate.reveal')}</ChunkyButton>}
      </div>
    </main>
  );
}

type Field = { key: string; text: string };
type Parent = NonNullable<CertificateVM['mother']>;
type Flight = { x: number; y: number; s: number };

function CertificateView({ cert, filled, nav }: { cert: CertificateVM; filled: boolean; nav: Nav }) {
  const reduced = useReducedMotion();
  const { start, busy } = useStartLife(nav);
  const stampId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  // Записи регистратора в порядке печати (как TYPE в макете), только из данных оригинала.
  const parents = useMemo(() => [cert.mother, cert.father].filter((p): p is Parent => !!p), [cert]);
  const sib = useMemo(() => siblingsText(cert.siblings), [cert]);
  const fields = useMemo<Field[]>(() => {
    const out: Field[] = [
      { key: 'story', text: cert.story },
      { key: 'name', text: cert.name },
      { key: 'sex', text: sexLabel(cert.sex) },
      { key: 'date', text: birthDate(cert.month, cert.year) },
      { key: 'place', text: cert.place },
      { key: 'religion', text: cert.religion },
      { key: 'home', text: cert.home },
      { key: 'income', text: cert.quintileText },
    ];
    parents.forEach((p, i) => {
      out.push({ key: `p${i}Name`, text: t('certificate.parentLine', { name: p.name, age: p.age }) });
      out.push({ key: `p${i}Job`, text: p.job });
    });
    if (sib) {
      out.push({ key: 'sibName', text: sib.main });
      out.push({ key: 'sibJob', text: sib.detail });
    }
    out.push({ key: 'sign', text: t('certificate.signature') });
    return out;
  }, [cert, parents, sib]);
  const split = useMemo(() => fields.map(f => graphemes(f.text)), [fields]);
  const total = split.reduce((n, g) => n + g.length, 0);

  const startFinal = filled || reduced;
  const [mode, setMode] = useState<'play' | 'final'>(startFinal ? 'final' : 'play');
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState(startFinal ? CERT_PHASE : 0);
  const [typed, setTyped] = useState(startFinal ? Number.MAX_SAFE_INTEGER : 0);
  const [instant, setInstant] = useState(true);
  const [flight, setFlight] = useState<Flight | null>(null);
  const totalRef = useRef(total);
  totalRef.current = total;

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const photoRef = useRef<HTMLSpanElement | null>(null);
  const babyRef = useRef<HTMLDivElement | null>(null);

  const final = mode === 'final';
  const cert6 = phase >= CERT_PHASE;
  const done = final || typed >= total;

  // Шкала времени макета (5.5): этапы по таймерам, затем печать по 5 символов каждые 40 мс.
  useEffect(() => {
    if (mode !== 'play') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let typer: ReturnType<typeof setInterval> | undefined;
    let count = 0;
    timers.push(setTimeout(() => setInstant(false), 60));
    PHASES.forEach((ms, i) => timers.push(setTimeout(() => setPhase(i + 1), ms)));
    timers.push(setTimeout(() => {
      typer = setInterval(() => {
        count = Math.min(totalRef.current, count + SEQ.typing.charsPerTick);
        setTyped(count);
        if (count >= totalRef.current && typer) clearInterval(typer);
      }, SEQ.typing.intervalMs);
    }, SEQ.phasesMs.typing));
    return () => {
      timers.forEach(clearTimeout);
      if (typer) clearInterval(typer);
    };
  }, [mode, run]);

  // Приход с экрана шансов (filled) или включение сокращённого движения — сразу готовое свидетельство.
  useEffect(() => {
    if (startFinal && mode === 'play') skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFinal]);

  // Полёт малыша в фотоуголок: смещение считается по реальной раскладке (ширины 320–430).
  useLayoutEffect(() => {
    if (mode !== 'play' || phase !== CERT_PHASE || flight) return;
    const baby = babyRef.current, photo = photoRef.current, body = bodyRef.current;
    if (!baby || !photo || !body) return;
    const b = baby.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    let x = 0, y = 0;
    for (let el: HTMLElement | null = photo; el && el !== body; el = el.offsetParent as HTMLElement | null) {
      x += el.offsetLeft;
      y += el.offsetTop;
    }
    const tx = br.left + x - body.scrollLeft + photo.offsetWidth / 2;
    const ty = br.top + y - body.scrollTop + photo.offsetHeight / 2;
    setFlight({ x: tx - (b.left + b.width / 2), y: ty - (b.top + b.height / 2), s: baby.offsetWidth ? photo.offsetWidth / baby.offsetWidth : 0.5 });
  }, [mode, phase, flight]);

  // Во время печати поле с кареткой держится в видимой части (только своя область прокрутки).
  useEffect(() => {
    if (done || !cert6) return;
    const body = bodyRef.current;
    const el = body?.querySelector<HTMLElement>('[data-typing="true"]');
    if (!body || !el) return;
    const er = el.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    if (er.bottom > br.bottom - 8) body.scrollTop += er.bottom - br.bottom + 24;
  }, [typed, done, cert6]);

  function skip() {
    setMode('final');
    setInstant(true);
    setPhase(CERT_PHASE);
    setTyped(Number.MAX_SAFE_INTEGER);
  }
  function replay() {
    if (reduced) return;
    setInstant(true);
    setFlight(null);
    setPhase(0);
    setTyped(0);
    setMode('play');
    setRun(r => r + 1);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }

  // Сколько символов каждой записи уже напечатано; каретка — на записи, которая печатается.
  const typedOf = useMemo(() => {
    const map: Record<string, { shown: string; full: string; caret: boolean; started: boolean }> = {};
    let off = 0;
    fields.forEach((f, i) => {
      const g = split[i] ?? [];
      const n = done ? g.length : Math.max(0, Math.min(g.length, typed - off));
      map[f.key] = { shown: g.slice(0, n).join(''), full: f.text, caret: !done && typed > off && typed < off + g.length, started: done || typed > off };
      off += g.length;
    });
    return map;
  }, [fields, split, typed, done]);

  // Печатаемый текст: видимая часть скрыта от чтения с экрана, полный текст — для него.
  const typedText = (k: string): ReactNode => {
    const v = typedOf[k];
    if (!v) return null;
    if (done) return v.full;
    return (
      <>
        <span aria-hidden="true" data-typing={v.caret || undefined}>{v.shown}{v.caret && <span className="cs-caret" />}</span>
        <span className="sr-only">{v.full}</span>
      </>
    );
  };

  const dateText = birthDate(cert.month, cert.year);
  const status = cert6
    ? t('certificate.status.cert', { name: cert.name, date: dateText, place: cert.place })
    : phase >= 5
      ? t('certificate.status.born', { name: cert.name, sex: sexWord(cert.sex) })
      : phase >= 1
        ? t('certificate.status.parents', { parents: parents.map(p => t('certificate.parentLine', { name: p.name, age: p.age })).join(t('certificate.and')) })
        : '';

  const stageOn = (p: number) => !cert6 && phase >= p;
  const babyStyle: CSSProperties | undefined = cert6 && flight ? { transform: `translate(${flight.x}px, ${flight.y}px) rotate(-4deg) scale(${flight.s})` } : undefined;
  const famOn = (k: string) => (typedOf[k]?.started ? 'is-on' : '');

  return (
    <main className={`screen cs ${cert6 ? 'is-cert' : ''} ${done ? 'is-done' : ''}`} data-instant={instant || undefined} style={ROOT_VARS}>
      <p role="status" className="sr-only">{status}</p>

      <header className="cs-head">
        <p className="cs-eyebrow cs-late">{t('cert.eyebrow')}</p>
        {done ? (
          !reduced && <RoundButton className="cs-replay cs-late" aria-label={t('cert.replay')} onClick={replay}><ReplayIcon size={18} /></RoundButton>
        ) : (
          <button type="button" className="cs-skip" onClick={skip} aria-label={t('certificate.skipLabel')}>{t('cert.skip')}</button>
        )}
      </header>

      <div className={`cs-body scroll ${cert6 ? '' : 'is-locked'}`} ref={bodyRef}>
        <article ref={articleRef} className="cs-cert" aria-label={t('certificate.articleLabel')} onClick={done ? undefined : skip}>
          <span className="cs-cert__frame" aria-hidden="true" />
          <span className="cs-photo" aria-hidden="true">
            <span className="cs-photo__img" ref={photoRef}><Initial name={cert.given || cert.name} bg={PORTRAIT_BG.baby} shape="square" /></span>
            <svg className="cs-photo__clip" width="14" height="34" viewBox="0 0 16 40"><path d="M5 30 V9 a3.5 3.5 0 0 1 7 0 V31 a5 5 0 0 1 -10 0 V13" fill="none" stroke="#8b9096" strokeWidth="2" strokeLinecap="round" /></svg>
          </span>
          <div className="cs-cert__top">
            <p className="cs-registry">{t('cert.registry')}</p>
            <h1 className="cs-title">{t('cert.title')}</h1>
            <p className="cs-no">{t('cert.no', { no: cert.certNo })}</p>
          </div>
          <svg className="cs-guil" width="100%" height="10" viewBox="0 0 329 10" preserveAspectRatio="none" aria-hidden="true">
            <path d={guil(-4.5)} fill="none" stroke="#e2c595" strokeWidth="1" />
            <path d={guil(4.5)} fill="none" stroke="#e2c595" strokeWidth="1" />
          </svg>
          <p className="cs-story">{typedText('story')}</p>

          <div className="cs-fields">
            <CertField label={t('certificate.field.name')} big>{typedText('name')}</CertField>
            <div className="cs-row cs-row--1-2">
              <CertField label={t('certificate.field.sex')}>{typedText('sex')}</CertField>
              <CertField label={t('certificate.field.date')}>{typedText('date')}</CertField>
            </div>
            <CertField label={t('certificate.field.place')}>{typedText('place')}</CertField>
            <div className="cs-row">
              <CertField label={t('certificate.field.religion')}>{typedText('religion')}</CertField>
              <CertField label={t('certificate.field.home')}>{typedText('home')}</CertField>
            </div>
            <CertField label={t('certificate.field.income')}>
              <span className="cs-dots" role="img" aria-label={t('certificate.incomeDots', { q: cert.quintile })}>
                {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= cert.quintile ? 'is-on' : ''} />)}
              </span>
              {typedText('income')}
            </CertField>

            {(parents.length > 0 || sib) && (
              <div className="cs-family">
                <p className="cs-label">{t('cert.family')}</p>
                <ul className="cs-family__list">
                  {parents.map((p, i) => (
                    <li key={i}>
                      <span className={`cs-frame ${famOn(`p${i}Name`)}`}>
                        <Initial name={p.name} bg={p.role === 'mother' ? PORTRAIT_BG.mother : PORTRAIT_BG.father} shape="square" />
                      </span>
                      <span className="cs-fam__name">{typedText(`p${i}Name`)}</span>
                      <span className="cs-label">{t(p.role === 'mother' ? 'certificate.role.mother' : 'certificate.role.father')}</span>
                      <span className="cs-fam__job">{typedText(`p${i}Job`)}</span>
                    </li>
                  ))}
                  {sib && (
                    <li>
                      <span className={`cs-frame ${famOn('sibName')}`}>
                        <span className="ph-initial ph-initial--square" style={{ background: PORTRAIT_BG.sibling }} aria-hidden="true"><PeopleGlyph /></span>
                      </span>
                      <span className="cs-fam__name">{typedText('sibName')}</span>
                      <span className="cs-label">{sib.role}</span>
                      <span className="cs-fam__job">{typedText('sibJob')}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="cs-sign">
            <p className="cs-sign__name">{typedText('sign')}</p>
            <p className="cs-label cs-sign__line">{t('certificate.signCaption', { country: cert.country })}</p>
          </div>

          <svg className="cs-stamp" width="76" height="76" viewBox="0 0 88 88" role="img" aria-label={t('certificate.stampLabel', { country: cert.country, date: dateText })}>
            <defs><path id={`cs-ring-${stampId}`} d="M44 44 m-31 0 a31 31 0 1 1 62 0 a31 31 0 1 1 -62 0" /></defs>
            <circle cx="44" cy="44" r="42" fill="none" stroke="#e0505e" strokeWidth="2.5" />
            <circle cx="44" cy="44" r="24" fill="none" stroke="#e0505e" strokeWidth="1.5" />
            <text fontSize="8.5" fontWeight="700" letterSpacing="1.8" fill="#e0505e"><textPath href={`#cs-ring-${stampId}`}>{t('certificate.stampRing', { year: cert.year })}</textPath></text>
            <text x="44" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill="#e0505e">{cert.iso}</text>
            <text x="44" y="54" textAnchor="middle" fontSize="6" fontWeight="700" fill="#e0505e">{cert.month.toLocaleUpperCase()}</text>
            <text x="44" y="61" textAnchor="middle" fontSize="6" fontWeight="700" fill="#e0505e">{cert.year}</text>
          </svg>
        </article>
      </div>

      <footer className="cs-foot cs-late" inert={!cert6 || undefined}>
        <SoftButton className="cs-odds" onClick={() => nav.go({ id: 'birthOdds' })} disabled={busy}>
          <BarsIcon size={22} />
          <span>{t('cert.odds')}</span>
        </SoftButton>
        <ChunkyButton className="cs-start" onClick={start} disabled={busy}>{t('cert.start')}</ChunkyButton>
      </footer>

      <Stage
        cert={cert}
        parents={parents}
        phase={phase}
        cert6={cert6}
        stageOn={stageOn}
        babyRef={babyRef}
        babyStyle={babyStyle}
        dateText={dateText}
        onSkip={skip}
      />
    </main>
  );
}

function CertField({ label, big = false, children }: { label: string; big?: boolean; children: ReactNode }) {
  return (
    <div className="cs-field">
      <p className="cs-label">{label}</p>
      <p className={`cs-value ${big ? 'cs-value--big' : ''}`}>{children}</p>
    </div>
  );
}

/** Этапы 1–5: родители, линии семейного дерева, малыш и его имя. */
function Stage({ cert, parents, phase, cert6, stageOn, babyRef, babyStyle, dateText, onSkip }: {
  cert: CertificateVM;
  parents: Parent[];
  phase: number;
  cert6: boolean;
  stageOn: (p: number) => boolean;
  babyRef: RefObject<HTMLDivElement | null>;
  babyStyle: CSSProperties | undefined;
  dateText: string;
  onSkip: () => void;
}) {
  const parentState = (i: number) => (cert6 ? 'is-gone' : phase >= i + 1 ? 'is-on' : '');
  const born = phase >= 4;
  return (
    <div className={`cs-stage ${cert6 ? 'is-cert' : ''}`} aria-hidden="true" onClick={cert6 ? undefined : onSkip}>
      <p className={`cs-stage__eyebrow ${stageOn(1) ? 'is-on' : ''}`}>{t('cert.parents')}</p>
      <div className="cs-tree">
        <div className={`cs-parents ${phase >= 3 ? 'is-linked' : ''} ${cert6 ? 'is-gone' : ''}`} data-count={parents.length}>
          {parents.map((p, i) => (
            <div key={i} className={`cs-parent ${parentState(i)}`}>
              <Initial name={p.name} bg={p.role === 'mother' ? PORTRAIT_BG.mother : PORTRAIT_BG.father} className="cs-parent__face" />
              <p className="cs-parent__name">{p.name}</p>
              <p className="cs-parent__role">{t('certificate.roleAge', { role: t(p.role === 'mother' ? 'certificate.stageRole.mother' : 'certificate.stageRole.father'), age: p.age })}</p>
            </div>
          ))}
          {parents.length === 2 && (
            <>
              <span className="cs-couple cs-couple--l" />
              <span className="cs-couple cs-couple--r" />
              <span className="cs-knot" />
            </>
          )}
          {parents.length > 0 && <span className="cs-descent" />}
        </div>
        <div className="cs-babywrap">
          <span className={`cs-glow ${born && !cert6 ? 'is-on' : ''}`} />
          <div ref={babyRef} className={`cs-baby ${born ? 'is-born' : ''} ${cert6 ? 'is-flying' : ''}`} style={babyStyle}>
            <span className="cs-bloom" />
            <Initial name={cert.given || cert.name} bg={PORTRAIT_BG.baby} className="cs-baby__face" />
          </div>
        </div>
      </div>
      <div className={`cs-name ${stageOn(5) ? 'is-on' : ''} ${cert6 ? 'is-gone' : ''}`}>
        <p className="cs-name__sex"><span className="cs-name__dot" />{t('cert.itsA', { sex: sexWord(cert.sex) })}</p>
        <p className="k-big cs-name__full">{cert.name}</p>
        <p className="cs-name__meta">{t('certificate.bornLine', { date: dateText, place: cert.place })}</p>
      </div>
    </div>
  );
}

/** Братья и сёстры при рождении: в данных оригинала есть только пол и разница в возрасте. */
function siblingsText(list: CertificateVM['siblings']): { role: string; main: string; detail: string } | null {
  if (!list.length) return null;
  const diff = (d: number) => t(d >= 0 ? 'certificate.sibOlder' : 'certificate.sibYounger', { n: Math.abs(d) });
  if (list.length === 1) {
    const s = list[0]!;
    return { role: t(s.sex === 'F' ? 'certificate.role.sister' : 'certificate.role.brother'), main: diff(s.diff), detail: '' };
  }
  const sisters = list.filter(s => s.sex === 'F').length;
  const brothers = list.length - sisters;
  const parts = [
    brothers ? t(brothers === 1 ? 'certificate.brothers.one' : 'certificate.brothers.many', { n: brothers }) : '',
    sisters ? t(sisters === 1 ? 'certificate.sisters.one' : 'certificate.sisters.many', { n: sisters }) : '',
  ].filter(Boolean);
  const signed = list.map(s => (s.diff >= 0 ? `+${s.diff}` : `−${Math.abs(s.diff)}`)).join(', ');
  return { role: t('certificate.role.siblings'), main: parts.join(', '), detail: t('certificate.sibDiffs', { list: signed }) };
}

/** Гильош: две зеркальные синусоиды (период 16, амплитуда 4.5), как в макете. */
const guil = (a: number) => `M0 5 q8 ${a} 16 0` + ' t16 0'.repeat(20);
