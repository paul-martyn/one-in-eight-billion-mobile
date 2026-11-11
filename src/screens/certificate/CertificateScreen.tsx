// «3 · Birth certificate» (CertCute холста, рождение — дубль Б2): мама и папа быстро
// появляются внизу, от них линии идут к узлу и вверх — туда, где была планета рулетки;
// там появляется малыш, затем «It’s a boy!» и имя. Малыш улетает в фотоуголок
// свидетельства и остаётся там фотографией; регистратор печатает записи, ставится печать.
// Свидетельство — фиксированной высоты, помещается на экран без прокрутки. Тап в любом
// месте ускоряет: до свидетельства — сразу к нему и быстрая печать, во время печати —
// всё остальное сразу. Все записи — из snapshot.certificate (CertificateVM, построен
// функциями оригинала в showCert). Анимация только показывает уже определённое рождение.
// Кнопки: «Your odds», Start life и переброс — новый ребёнок в той же стране
// (adapter.rerollLife с кодом страны; переброс страны целиком — на рулетке).
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import spec from '../../design/motion.json';
import { t } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import type { CertificateVM } from '../../adapters/viewModels';
import type { Nav } from '../../flow/FlowHost';
import { ChunkyButton } from '../../ui/components';
import { Frame, useFrame } from '../../ui/frame/Frame';
import { fitSize, useFontsReady, type Field as FitField } from '../../ui/frame/fit';
import { CtaButton } from '../../ui/frame/parts';
import { useReducedMotion } from '../../ui/motionPrefs';
import { layCert } from '../layouts';
import type { ScreenProps } from '../registry';
import { RerollButton } from '../roll/RerollButton';
import { spendReroll } from '../roll/rerolls';
import { birthDate, graphemes, Initial, PeopleGlyph, PORTRAIT_BG, sexLabel, sexWord, useStartLife } from './parts';
import './certificate.css';

const SEQ = spec.sequences.certificate;
/** Начала этапов: мама, папа, линии, малыш, имя, свидетельство (мс от открытия). */
const PHASES = [SEQ.phasesMs.parents, SEQ.phasesMs.dad, SEQ.phasesMs.tree, SEQ.phasesMs.baby, SEQ.phasesMs.name, SEQ.phasesMs.toCertificate];
const CERT_PHASE = PHASES.length;
const POPQ = 'cubic-bezier(.3,1.5,.5,1)';
const POP = `cubic-bezier(${(spec.easing.pop as number[]).join(',')})`;
const GLIDE = `cubic-bezier(${(spec.easing.glide as number[]).join(',')})`;
/** Задержка начала рождения после перехода с рулетки (screen.birth). */
const LEAD_MS = spec.screenTransitions.find(x => x.id === 'screen.birth')?.durationMs ?? 240;

/**
 * Сколько знаков помещает поле при полном кегле: [кегль, знаков, наименьший кегль] (Courier ≈ 0,6 em
 * на знак). Длиннее — кегль меньше, до наименьшего; дальше поле обрезает многоточием.
 */
const ROOM: Record<string, [number, number, number]> = {
  sign: [25, 15, 18], story: [13, 84, 10.5], name: [17, 31, 13], sex: [14, 11, 11], date: [14, 24, 11], place: [14, 38, 11],
  religion: [14, 18, 11], home: [14, 18, 11], famName: [13, 13, 10], famJob: [12, 14, 9.5],
};
const roomSize = (room: string, text: string) => {
  const r = ROOM[room]!, n = graphemes(text).length;
  return n <= r[1] ? r[0] : Math.max(r[2], Math.floor(((r[0] * r[1]) / n) * 10) / 10);
};
const BABY_NAME_FIT: FitField = [352, 40, 22];
/** Заголовок свидетельства — в одну строку слева от фото; подписи под семейными фото — в ширину колонки. */
const TITLE_FIT: FitField = [228, 22, 14];
const ROLE_FIT: FitField = [84, 9.5, 7.5];

export function CertificateScreen({ screen, nav }: ScreenProps) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const cert = snap.certificate;
  const filled = screen.id === 'certificate' && screen.filled;
  // Переброс ребёнка: пока новая жизнь готовится, экран пуст; затем рождение играет заново.
  const [rerolling, setRerolling] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const firstNo = useRef(cert?.certNo ?? null);
  useEffect(() => {
    if (!rerolling || cert || snap.lifePhase !== 'birth' || !snap.companionsReady) return;
    if (adapter.revealCertificate(gestureId())) setRerolling(false);
  }, [rerolling, cert, snap.lifePhase, snap.companionsReady, adapter]);

  const reroll = async (iso: string) => {
    if (rerolling) return;
    setRerolling(true);
    setReplayed(true);
    const ok = await adapter.rerollLife(gestureId(), adapter.getSnapshot().lifeSeq, iso);
    if (!ok) { setRerolling(false); return; }
    spendReroll();
  };

  if (!cert) return rerolling ? <main className="screen cx" aria-busy="true" /> : <CertificateWaiting />;
  // С рулетки рождение начинается после перехода; после переброса — сразу.
  const lead = !filled && !replayed && cert.certNo === firstNo.current ? LEAD_MS : 0;
  return <CertificateView key={cert.certNo} cert={cert} filled={filled && !replayed} lead={lead} nav={nav} onReroll={() => reroll(cert.iso)} rerolling={rerolling} />;
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

function CertificateView({ cert, filled, lead, nav, onReroll, rerolling }: { cert: CertificateVM; filled: boolean; lead: number; nav: Nav; onReroll: () => void; rerolling: boolean }) {
  const reduced = useReducedMotion();
  const frame = useFrame();
  useFontsReady();
  const L = layCert(frame);
  const { start, busy } = useStartLife(nav);
  const stampId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  // Записи регистратора в порядке печати (как TYPES в макете), только из данных оригинала.
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
  const totalRef = useRef(total);
  totalRef.current = total;

  const startFinal = filled || reduced;
  const [phase, setPhase] = useState(startFinal ? CERT_PHASE : 0);
  const [typed, setTyped] = useState(startFinal ? Number.MAX_SAFE_INTEGER : 0);
  const [instant, setInstant] = useState(true);
  const [fast, setFast] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const count = useRef(0);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; if (typer.current) clearInterval(typer.current); };
  // Регистратор печатает n знаков каждые intervalMs.
  const type = (n: number) => {
    if (typer.current) clearInterval(typer.current);
    typer.current = setInterval(() => {
      count.current = Math.min(totalRef.current, count.current + n);
      setTyped(count.current);
      if (count.current >= totalRef.current && typer.current) clearInterval(typer.current);
    }, SEQ.typing.intervalMs);
  };

  // Шкала времени макета: этапы по таймерам, затем печать. Готовое свидетельство — сразу.
  useEffect(() => {
    timers.current = [setTimeout(() => setInstant(false), 60)];
    if (startFinal) {
      setPhase(CERT_PHASE);
      setTyped(Number.MAX_SAFE_INTEGER);
    } else {
      PHASES.forEach((ms, i) => timers.current.push(setTimeout(() => setPhase(i + 1), ms + lead)));
      timers.current.push(setTimeout(() => type(SEQ.typing.charsPerTick), SEQ.phasesMs.typing + lead));
    }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFinal]);

  const cert6 = phase >= CERT_PHASE;
  const done = typed >= total;
  // Тап: до свидетельства — сразу к нему и быстрая печать; во время печати — остальное сразу.
  const skip = () => {
    if (done) return;
    stop();
    setInstant(false);
    setFast(true);
    if (!cert6) {
      setPhase(CERT_PHASE);
      timers.current = [setTimeout(() => type(SEQ.hurry.charsPerTick), SEQ.hurry.typingAfterMs)];
    } else {
      count.current = totalRef.current;
      setTyped(Number.MAX_SAFE_INTEGER);
    }
  };

  // Сколько знаков каждой записи уже напечатано; каретка — на записи, которая печатается.
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
        <span aria-hidden="true">{v.shown}{v.caret && <span className="cx-caret" />}</span>
        <span className="sr-only">{v.full}</span>
      </>
    );
  };
  const sizeOf = (room: string, k: string): CSSProperties => ({ fontSize: roomSize(room, typedOf[k]?.full ?? '') });

  const dateText = birthDate(cert.month, cert.year);
  const status = cert6
    ? t('certificate.status.cert', { name: cert.name, date: dateText, place: cert.place })
    : phase >= 5
      ? t('certificate.status.born', { name: cert.name, sex: sexWord(cert.sex) })
      : phase >= 1
        ? t('certificate.status.parents', { parents: parents.map(p => t('certificate.parentLine', { name: p.name, age: p.age })).join(t('certificate.and')) })
        : '';

  const tr = (s: string) => (instant ? 'none' : s);
  const p = phase, cy = L.cy, ph = L.photoS;
  // Родители: вдвоём — слева и справа, один — посередине.
  const spots = parents.length === 2 ? [30, 243] : [136.5];
  const who = (on: boolean): CSSProperties => ({
    opacity: on && !cert6 ? 1 : 0,
    transform: `translateY(${on ? 0 : 12}px) scale(${on ? 1 : 0.8})`,
    transition: tr(cert6 ? 'opacity 0.2s ease' : `opacity 0.25s ease, transform 0.4s ${POPQ}`),
  });
  // Полёт малыша заканчивается ровно на фото в углу: карточка повёрнута на −4° (и уменьшена на
  // коротких экранах) вокруг правого верхнего угла (361, верх + 16); середина фото — на 36,18
  // левее и 41,63 ниже него после поворота.
  const bx = 361.54 - 36.18 * ph - 196.5, by = L.certTop + 15.49 + 41.63 * ph - cy, bs = (66 * ph) / 160;
  const flightMs = fast ? SEQ.hurry.flightMs : SEQ.babyFlight.durationMs, flightDelay = fast ? 0 : SEQ.babyFlight.delayMs;
  const slideMs = fast ? SEQ.hurry.slideMs : SEQ.certificateSlide.durationMs, slideDelay = fast ? 0 : SEQ.certificateSlide.delayMs;
  const famOn = (k: string) => (typedOf[k]?.started ? 1 : 0);
  const famBox: CSSProperties = { width: L.famBox, height: L.famBox, fontSize: L.famBox * 0.4 };
  const footStyle = (delayFast: number, delay: number): CSSProperties => ({
    opacity: cert6 ? 1 : 0, visibility: cert6 ? 'visible' : 'hidden',
    transition: tr(cert6 ? `opacity ${fast ? 0.25 : 0.35}s ease ${fast ? delayFast : delay}s` : 'none'),
  });
  const babyName = cert.name;
  const nameSize = fitSize(babyName, BABY_NAME_FIT);

  return (
    <main className="screen cx" data-instant={instant || undefined}>
      <Frame>
        <div className="cx-glow" aria-hidden="true" style={{ top: cy - 230, opacity: p >= 4 && !cert6 ? 1 : 0, transition: tr('opacity 0.8s ease') }} />
        <p role="status" className="sr-only">{status}</p>

        {/* Сцена рождения: подпись и имя сверху (как на рулетке), малыш на месте планеты, родители под ним */}
        <p className="cx-its" aria-hidden="true" style={{ top: L.label, opacity: p >= 5 && !cert6 ? 1 : 0, transform: `scale(${p >= 5 ? 1 : 0.85})`, transition: tr(`opacity 0.25s ease, transform 0.35s ${POPQ}`) }}>{t('cert.itsA', { sex: sexWord(cert.sex) })}</p>
        <p className="cx-babyname" aria-hidden="true" style={{ top: L.name, fontSize: nameSize, WebkitTextStroke: `${((nameSize / 40) * 4.4).toFixed(1)}px #5a3418`, textShadow: `0 ${((nameSize / 40) * 3.5).toFixed(1)}px 0 #5a3418`, opacity: p >= 5 && !cert6 ? 1 : 0, transform: `translateY(${p >= 5 ? 0 : 10}px) scale(${p >= 5 ? 1 : 0.9})`, transition: tr(`opacity 0.3s ease 0.05s, transform 0.4s ${POPQ} 0.05s`) }}>{babyName}</p>
        <p className="cx-born" aria-hidden="true" style={{ top: L.name + 64, opacity: p >= 5 && !cert6 ? 1 : 0, transition: tr('opacity 0.3s ease 0.05s') }}>{t('certificate.bornLine', { date: dateText, place: cert.place })}</p>

        <svg className="cx-tree" width="393" height={frame.H} aria-hidden="true" style={{ opacity: cert6 ? 0 : 1, transition: tr('opacity 0.3s ease') }}>
          {parents.length === 2 && (
            <>
              <path d={`M126 ${cy + 158} H196.5`} pathLength={1} className="cx-line" style={{ strokeDashoffset: p >= 3 ? 0 : 1, transition: tr('stroke-dashoffset 0.25s ease') }} />
              <path d={`M267 ${cy + 158} H196.5`} pathLength={1} className="cx-line" style={{ strokeDashoffset: p >= 3 ? 0 : 1, transition: tr('stroke-dashoffset 0.25s ease') }} />
              <circle cx="196.5" cy={cy + 158} r="6" className="cx-knot" style={{ opacity: p >= 3 ? 1 : 0, transition: tr('opacity 0.2s ease 0.2s') }} />
            </>
          )}
          {parents.length > 0 && (
            <path d={`M196.5 ${parents.length === 2 ? cy + 158 : cy + 118} V${cy + 80}`} pathLength={1} className="cx-line" style={{ strokeDashoffset: p >= 3 ? 0 : 1, transition: tr('stroke-dashoffset 0.35s ease 0.2s') }} />
          )}
        </svg>
        {parents.map((par, i) => (
          <div key={i} className="cx-parent" aria-hidden="true" style={{ left: spots[i], top: cy + 122, ...who(p >= i + 1) }}>
            <Initial name={par.name} bg={par.role === 'mother' ? PORTRAIT_BG.mother : PORTRAIT_BG.father} className="cx-parent__face" />
            <p className="cx-parent__name">{par.name.split(' ')[0]}</p>
            <p className="cx-parent__role">{t('certificate.roleAge', { role: t(par.role === 'mother' ? 'certificate.stageRole.mother' : 'certificate.stageRole.father'), age: par.age })}</p>
          </div>
        ))}

        <article className="cx-cert" aria-label={t('certificate.articleLabel')} style={{ top: L.certTop, bottom: L.certBottom, visibility: cert6 ? 'visible' : 'hidden', transform: `translateY(${cert6 ? 0 : 900}px)`, transition: tr(cert6 ? `transform ${slideMs}ms ${GLIDE} ${slideDelay}ms` : 'none') }}>
          <span className="cx-cert__frame" aria-hidden="true" />
          <span className="cx-photo" aria-hidden="true" style={{ transform: `rotate(-4deg) scale(${ph})`, opacity: cert6 ? 1 : 0, transition: tr(cert6 ? (fast ? 'opacity 0.15s ease 0.25s' : 'opacity 0.2s ease 0.5s') : 'none') }} />
          <div className="cx-top" style={{ minHeight: L.headH }}>
            <p className="cx-registry">{t('cert.registry')}</p>
            <h1 className="cx-title" style={{ fontSize: fitSize(t('cert.title'), TITLE_FIT) }}>{t('cert.title')}</h1>
            <p className="cx-no">{t('cert.no', { no: cert.certNo })}</p>
          </div>
          <svg className="cx-guil" width="100%" height="10" viewBox="0 0 329 10" preserveAspectRatio="none" aria-hidden="true">
            <path d={guil(-4.5)} fill="none" stroke="#e2c595" strokeWidth="1" />
            <path d={guil(4.5)} fill="none" stroke="#e2c595" strokeWidth="1" />
          </svg>
          <p className="cx-story" style={sizeOf('story', 'story')}>{typedText('story')}</p>

          <div className="cx-fields" style={{ gap: L.gap }}>
            <CertField label={t('certificate.field.name')} big style={sizeOf('name', 'name')}>{typedText('name')}</CertField>
            <div className="cx-row cx-row--1-2">
              <CertField label={t('certificate.field.sex')} style={sizeOf('sex', 'sex')}>{typedText('sex')}</CertField>
              <CertField label={t('certificate.field.date')} style={sizeOf('date', 'date')}>{typedText('date')}</CertField>
            </div>
            <CertField label={t('certificate.field.place')} style={sizeOf('place', 'place')}>{typedText('place')}</CertField>
            <div className="cx-row">
              <CertField label={t('certificate.field.religion')} style={sizeOf('religion', 'religion')}>{typedText('religion')}</CertField>
              <CertField label={t('certificate.field.home')} style={sizeOf('home', 'home')}>{typedText('home')}</CertField>
            </div>

            {(parents.length > 0 || sib) && (
              <div className="cx-family">
                <p className="cx-label cx-family__head">
                  <span>{t('cert.family')}</span>
                  {/* Доход семьи (пятая часть страны по доходу): пять точек рядом с заголовком */}
                  <span className="cx-income" role="img" aria-label={t('certificate.incomeDots', { q: cert.quintile })} title={cert.quintileText}>
                    <span aria-hidden="true">{t('certificate.field.income')}</span>
                    {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= cert.quintile ? 'is-on' : ''} />)}
                  </span>
                </p>
                <ul className="cx-family__list">
                  {parents.map((par, i) => (
                    <li key={i}>
                      <span className="cx-frame" style={famBox}>
                        <span style={{ opacity: famOn(`p${i}Name`) }}><Initial name={par.name} bg={par.role === 'mother' ? PORTRAIT_BG.mother : PORTRAIT_BG.father} shape="square" /></span>
                      </span>
                      <span className="cx-fam__name" style={sizeOf('famName', `p${i}Name`)}>{typedText(`p${i}Name`)}</span>
                      <span className="cx-label cx-fam__role">{t(par.role === 'mother' ? 'certificate.role.mother' : 'certificate.role.father')}</span>
                      <span className="cx-fam__job" style={sizeOf('famJob', `p${i}Job`)}>{typedText(`p${i}Job`)}</span>
                    </li>
                  ))}
                  {sib && (
                    <li>
                      <span className="cx-frame" style={famBox}>
                        <span style={{ opacity: famOn('sibName') }}><span className="ph-initial ph-initial--square" style={{ background: PORTRAIT_BG.sibling }} aria-hidden="true"><PeopleGlyph /></span></span>
                      </span>
                      <span className="cx-fam__name" style={sizeOf('famName', 'sibName')}>{typedText('sibName')}</span>
                      <span className="cx-label cx-fam__role" style={{ fontSize: fitSize(sib.role.toLocaleUpperCase(), ROLE_FIT) }}>{sib.role}</span>
                      <span className="cx-fam__job" style={sizeOf('famJob', 'sibJob')}>{typedText('sibJob')}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="cx-foot">
            <div className="cx-sign">
              <p className="cx-sign__name" style={sizeOf('sign', 'sign')}>{typedText('sign')}</p>
              <p className="cx-label cx-sign__line">{t('certificate.signCaption', { country: cert.country })}</p>
            </div>
            <svg className="cx-stamp" width="68" height="68" viewBox="0 0 88 88" role="img" aria-label={t('certificate.stampLabel', { country: cert.country, date: dateText })} style={{ opacity: done ? 0.9 : 0, transform: `rotate(-12deg) scale(${done ? 1 : 1.7})`, transition: tr(done ? `opacity 0.15s ease 0.25s, transform 0.35s ${POP} 0.25s` : 'none') }}>
              <defs><path id={`cx-ring-${stampId}`} d="M44 44 m-31 0 a31 31 0 1 1 62 0 a31 31 0 1 1 -62 0" /></defs>
              <circle cx="44" cy="44" r="42" fill="none" stroke="#e0505e" strokeWidth="2.5" />
              <circle cx="44" cy="44" r="24" fill="none" stroke="#e0505e" strokeWidth="1.5" />
              <text fontSize="8.5" fontWeight="700" letterSpacing="1.8" fill="#e0505e"><textPath href={`#cx-ring-${stampId}`}>{t('certificate.stampRing', { year: cert.year })}</textPath></text>
              <text x="44" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill="#e0505e">{cert.iso}</text>
              <text x="44" y="54" textAnchor="middle" fontSize="6" fontWeight="700" fill="#e0505e">{cert.month.toLocaleUpperCase()}</text>
              <text x="44" y="61" textAnchor="middle" fontSize="6" fontWeight="700" fill="#e0505e">{cert.year}</text>
            </svg>
          </div>
        </article>

        {!done && <button type="button" className="cx-skip" tabIndex={-1} aria-label={t('certificate.skipLabel')} onClick={skip} />}

        <button type="button" className="side-btn cx-odds" style={{ top: L.cta + 3, ...footStyle(0.35, 0.65) }} onClick={() => nav.go({ id: 'birthOdds' })} disabled={busy || rerolling} aria-label={t('cert.odds')}>
          <svg width="34" height="31" viewBox="0 0 24 22" aria-hidden="true">
            <rect x="2" y="10" width="5" height="10" rx="1.5" fill="#6f8cff" stroke="#7b4b2a" strokeWidth="1.6" />
            <rect x="9.5" y="3" width="5" height="17" rx="1.5" fill="#ffc23d" stroke="#7b4b2a" strokeWidth="1.6" />
            <rect x="17" y="7" width="5" height="13" rx="1.5" fill="#ff6f8a" stroke="#7b4b2a" strokeWidth="1.6" />
          </svg>
        </button>
        <CtaButton className="cx-start" style={{ top: L.cta, ...footStyle(0.3, 0.55) }} label={t('cert.start')} onClick={start} disabled={busy || rerolling} />
        <RerollButton className="cx-again" style={{ top: L.cta + 3, ...footStyle(0.35, 0.65) }} onClick={onReroll} disabled={busy || rerolling} />

        {/* Малыш: появляется на месте планеты, улетает в фотоуголок и остаётся там фотографией */}
        <div className="cx-baby" aria-hidden="true" style={{ top: cy - 80, opacity: p >= 4 || cert6 ? 1 : 0, transform: cert6 ? `translate(${bx.toFixed(2)}px, ${by.toFixed(2)}px) rotate(-4deg) scale(${bs.toFixed(4)})` : `scale(${p >= 4 ? 1 : 0.4})`, transition: tr(cert6 ? `opacity 0.2s ease, transform ${flightMs}ms ${GLIDE} ${flightDelay}ms` : `opacity 0.2s ease, transform 0.45s ${POPQ}`) }}>
          <span className="cx-baby__ring" style={{ opacity: p >= 4 ? 0 : 0.8, transform: `scale(${p >= 4 ? 1.9 : 1})`, transition: tr(p >= 4 ? 'opacity 0.9s ease-out, transform 0.9s ease-out' : 'none') }} />
          <span className="cx-baby__face" style={{ borderRadius: cert6 ? 9.7 : 80, transition: tr(`border-radius ${flightMs}ms ${GLIDE} ${flightDelay}ms`) }}>
            <Initial name={cert.given || cert.name} bg={PORTRAIT_BG.baby} shape="square" />
          </span>
        </div>
        <div className="cx-clip" aria-hidden="true" style={{ top: L.certTop + 15.51, transform: `rotate(-4deg) scale(${ph})`, opacity: cert6 ? 1 : 0, transition: tr(cert6 ? (fast ? 'opacity 0.15s ease 0.25s' : 'opacity 0.2s ease 0.5s') : 'none') }}>
          <svg width="14" height="34" viewBox="0 0 16 40"><path d="M5 30 V9 a3.5 3.5 0 0 1 7 0 V31 a5 5 0 0 1 -10 0 V13" fill="none" stroke="#8b9096" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
      </Frame>
    </main>
  );
}

function CertField({ label, big = false, style, children }: { label: string; big?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className="cx-field">
      <p className="cx-label">{label}</p>
      <p className={`cx-value ${big ? 'cx-value--big' : ''}`} style={style}>{children}</p>
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
