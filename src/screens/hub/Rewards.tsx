// «A life lived» (HubCute.dc.html, rewards: on; PRODUCTION-UI v107, «Хаб после жизни»).
// Награда мета-слоя за прожитую жизнь — snapshot.meta.pendingReward (LifeReward из
// src/adapters/vm/rewards.ts, сохраняется и переживает перезагрузку). Окно открывается
// через 0,8 с после появления хаба, единственная кнопка Claim активна через 0,45 с.
// Claim — команда adapter.claimReward из обработчика нажатия; затем окно гаснет,
// суммы летят к счётчикам, портрет — во вкладку Lives, счётчики досчитываются, на
// вкладке появляется бейдж. Анимация только показывает применённую команду; при
// reduced motion полётов нет и числа меняются сразу.
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion } from 'motion/react';
import { t, UI_LANG } from '../../i18n';
import { gestureId, useAdapter, useCoreView, useSnapshot } from '../../adapters/useGame';
import type { LifeReward, RewardItem, RewardKind } from '../../adapters/vm/rewards';
import { playerAppearance } from '../../adapters/vm/appearance';
import { Ribbon } from '../../ui/components';
import { fmtMeta } from '../../ui/meta/Meta';
import { BanknotesBig, GemBig } from '../../ui/meta/metaIcons';
import { useTweenProgress } from '../../ui/meta/useMeta';
import { PersonPortrait } from '../../ui/people/PersonArt';
import './rewards.css';

// Тайминги HubCute: интерфейс скрыт SHOW_MS, окно — через POPUP_AT после появления,
// Claim — через READY_MS; полёт FLY_MS (окно гаснет первые 40 мс), досчёт LAND_MS.
const SHOW_MS = 50;
const POPUP_AT = 800;
const READY_MS = 450;
const FLY_DELAY_MS = 40;
const FLY_MS = 700;
const LAND_MS = 700;
// Полёт (FLY макета): суммы уменьшаются до 0,6, портрет до 0,3, всё гаснет до 0,25.
const SUM_SCALE = 0.6;
const FACE_SCALE = 0.3;
const FLY_OPACITY = 0.25;
const EASE_SUM: [number, number, number, number] = [0.5, 0, 0.75, 0];
const EASE_FACE: [number, number, number, number] = [0.45, 0, 0.7, 1];

/** Цвет точки строки награды (REWARDS макета). */
const DOT: Record<RewardKind, string> = {
  school: '#6f8cff', firstJob: '#8fd14f', married: '#ff6f8a', debtPaid: '#ffc23d', firstInCountry: '#ff7ad9',
};

/** Название уровня образования оригинала внутри фразы: «Finished high school». */
const inSentence = (s: string) => (UI_LANG === 'en' && /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function itemText(it: RewardItem): string {
  const d = it.detail.trim();
  switch (it.kind) {
    case 'school': return d ? t('rewards.school', { detail: inSentence(d) }) : t('rewards.schoolPlain');
    case 'firstJob': return d ? t('rewards.firstJob', { detail: d }) : t('rewards.firstJobPlain');
    case 'married': return d ? t('rewards.married', { detail: d }) : t('rewards.marriedPlain');
    case 'debtPaid': return t('rewards.debtPaid');
    case 'firstInCountry': return d ? t('rewards.firstInCountry', { detail: d }) : t('rewards.firstInCountryPlain');
  }
}

const gemsText = (n: number) => (n === 1 ? t('rewards.amountGemOne') : t('rewards.amountGems', { n: fmtMeta(n), count: n }));

// ---------------------------------------------------------------- состояние

/** Прямоугольник источника в координатах хаба и смещение к центру цели. */
type Box = { left: number; top: number; width: number; height: number; dx: number; dy: number };
type Flights = { dollars: Box | null; gems: Box | null; face: Box | null };
export type RewardSources = { dollars: HTMLElement | null; gems: HTMLElement | null; face: HTMLElement | null };
/** Показ применённого Claim: step 1 — окно гаснет и всё летит, 3 — счётчики досчитываются. */
type Run = { key: number; reward: LifeReward; from: { dollars: number; gems: number; unseen: number }; flights: Flights; step: 1 | 3 };
export type RewardFlightRun = Pick<Run, 'key' | 'reward' | 'flights'>;

function box(root: DOMRect, k: number, src: HTMLElement | null, dst: Element | null | undefined): Box | null {
  if (!src || !dst) return null;
  const a = src.getBoundingClientRect();
  const b = dst.getBoundingClientRect();
  if (!a.width || !b.width) return null;
  // Размер — без трансформаций (медальон может ещё «подпрыгивать»), центр — по экрану.
  const cx = (a.left + a.width / 2 - root.left) / k;
  const cy = (a.top + a.height / 2 - root.top) / k;
  const w = src.offsetWidth || a.width / k;
  const h = src.offsetHeight || a.height / k;
  return {
    left: cx - w / 2, top: cy - h / 2, width: w, height: h,
    dx: (b.left + b.width / 2 - (a.left + a.width / 2)) / k,
    dy: (b.top + b.height / 2 - (a.top + a.height / 2)) / k,
  };
}

/** Откуда и куда летят суммы и портрет: реальные плашки валют и иконка вкладки Lives. */
function measure(root: HTMLElement | null, src: RewardSources, lives: HTMLElement | null): Flights {
  if (!root) return { dollars: null, gems: null, face: null };
  const r = root.getBoundingClientRect();
  const k = root.offsetWidth > 0 ? r.width / root.offsetWidth || 1 : 1;
  const pill = (kind: 'dollars' | 'gems') => root.querySelector(`[data-meta-slot="${kind}"] .meta-pill`);
  return {
    dollars: box(r, k, src.dollars, pill('dollars')),
    gems: box(r, k, src.gems, pill('gems')),
    face: box(r, k, src.face, lives?.querySelector('.hub-tab__icon') ?? lives),
  };
}

/**
 * Награда за прожитую жизнь в хабе: когда открыть окно, Claim и его показ.
 * counts/landed/badge — то, что показывают плашки валют и вкладка Lives, пока
 * награда «летит»; вне показа это значения снимка.
 */
export function useLifeReward({ active, leaving, reduced, rootRef, livesRef }: {
  active: boolean; leaving: boolean; reduced: boolean;
  rootRef: RefObject<HTMLElement | null>; livesRef: RefObject<HTMLButtonElement | null>;
}) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const meta = snap.meta;
  const pending = meta?.pendingReward ?? null;
  const pendingId = pending?.lifeId ?? null;
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [said, setSaid] = useState('');
  const sources = useRef<RewardSources>({ dollars: null, gems: null, face: null });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const focusLives = useRef(false);
  const seq = useRef(0);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Окно — когда хаб «приехал» (0,8 с после появления); при reduced motion сразу.
  useEffect(() => {
    if (!active || leaving || !pendingId || openFor === pendingId || run) return;
    const id = setTimeout(() => setOpenFor(pendingId), reduced ? 0 : SHOW_MS + POPUP_AT);
    return () => clearTimeout(id);
  }, [active, leaving, pendingId, openFor, run, reduced]);

  // Claim принимается, когда окно встало на место.
  useEffect(() => {
    if (!openFor || readyFor === openFor) return;
    const id = setTimeout(() => setReadyFor(openFor), READY_MS);
    return () => clearTimeout(id);
  }, [openFor, readyFor]);

  const shown: LifeReward | null = run ? (run.step === 1 ? run.reward : null) : pending && openFor === pending.lifeId ? pending : null;
  const modal = shown != null;

  // Окно ушло после Claim: фокус — на вкладку Lives, куда «улетела» жизнь.
  useEffect(() => {
    if (modal || !focusLives.current) return;
    focusLives.current = false;
    livesRef.current?.focus({ preventScroll: true });
  }, [modal, livesRef]);

  /** Нажатие Claim. */
  const claim = useCallback(() => {
    const s = adapter.getSnapshot();
    const before = s.meta;
    const r = before?.pendingReward;
    if (!before || !r || run || openFor !== r.lifeId || readyFor !== r.lifeId) return;
    // Позиции снимаются до команды: окно ещё на месте.
    const flights = reduced ? null : measure(rootRef.current, sources.current, livesRef.current);
    const key = ++seq.current;
    // Показ ставится в тот же пакет обновлений, что и снимок без награды: окно не мигает.
    if (flights) setRun({ key, reward: r, from: { dollars: before.dollars, gems: before.gems, unseen: before.unseenLives }, flights, step: 1 });
    if (!adapter.claimReward(gestureId())) {
      if (flights) setRun(null);
      return;
    }
    focusLives.current = true;
    setSaid(t('rewards.claimed', { dollars: fmtMeta(r.dollars), gems: fmtMeta(r.gems), count: r.gems }));
    // Reduced motion: окно закрывается (награды в снимке больше нет), числа — сразу новые.
    if (!flights) return;
    timers.current.push(
      setTimeout(() => setRun(x => (x && x.key === key ? { ...x, step: 3 } : x)), FLY_DELAY_MS + FLY_MS),
      setTimeout(() => setRun(x => (x && x.key === key ? null : x)), FLY_DELAY_MS + FLY_MS + LAND_MS + 100),
    );
  }, [adapter, run, openFor, readyFor, reduced, rootRef, livesRef]);

  /** «Be Born!» до появления окна: сначала награда. */
  const openNow = useCallback(() => {
    if (pendingId && !run) setOpenFor(pendingId);
  }, [pendingId, run]);

  const land = useTweenProgress(run && run.step === 3 ? run.key : null, LAND_MS);
  const counts = run && meta ? {
    dollars: run.from.dollars + (meta.dollars - run.from.dollars) * land,
    gems: run.from.gems + (meta.gems - run.from.gems) * land,
  } : null;

  return {
    /** Награда ждёт получения (в снимке). */
    pending: pendingId != null,
    /** Награда в окне (и пока окно гаснет после Claim). */
    shown,
    modal,
    closing: run?.step === 1,
    ready: !!shown && !run && readyFor === shown.lifeId,
    claim,
    openNow,
    sources,
    flying: run && run.step === 1 ? (run as RewardFlightRun) : null,
    counts,
    /** Суммы долетели: плашки подпрыгивают, бейдж появляется. */
    landed: run?.step === 3,
    badge: run && run.step === 1 ? run.from.unseen : meta?.unseenLives ?? 0,
    said,
  };
}

// ---------------------------------------------------------------- окно

function initialOf(r: LifeReward): string {
  return [...(r.given || r.name || '?')][0] ?? '?';
}

/** Портрет умершего игрока: reward.look (сохранён при смерти); иначе — из S, пока там эта жизнь; иначе буква. */
function RewardFace({ reward }: { reward: LifeReward }) {
  const letter = <span className="k-o hub-reward__letter" aria-hidden="true">{initialOf(reward)}</span>;
  return reward.look ? <PersonPortrait look={reward.look} fallback={letter} /> : <CoreFace fallback={letter} />;
}
function CoreFace({ fallback }: { fallback: ReactNode }) {
  const snap = useSnapshot();
  const look = useCoreView(playerAppearance);
  return <PersonPortrait look={snap.lifePhase === 'dead' ? look : null} fallback={fallback} />;
}

function SumContent({ kind, n }: { kind: 'dollars' | 'gems'; n: number }) {
  return (
    <>
      {kind === 'dollars' ? <BanknotesBig size={22} className="hub-reward__icon" /> : <GemBig size={20} className="hub-reward__icon" />}
      <span className="k-os">+{fmtMeta(n)}</span>
    </>
  );
}

export function RewardsPopup({ reward, closing, ready, onClaim, sources }: {
  reward: LifeReward; closing: boolean; ready: boolean; onClaim: () => void; sources: RefObject<RewardSources>;
}) {
  const titleId = useId();
  const whoId = useId();
  const claimRef = useRef<HTMLButtonElement | null>(null);
  // Фокус — на единственную кнопку (до готовности она aria-disabled).
  useEffect(() => { claimRef.current?.focus({ preventScroll: true }); }, []);
  // Итог: доллары всегда, кристаллы — если есть.
  const showGems = reward.gems > 0;
  const showDollars = reward.dollars > 0 || !showGems;
  const who = reward.years ? t('rewards.nameYears', { name: reward.name, years: reward.years }) : reward.name;
  return (
    <div className="hub-reward" data-closing={closing || undefined}>
      <div className="hub-reward__dim" aria-hidden="true" />
      <div className="hub-reward__frame">
        <div className="hub-reward__scale">
          <section className="popup hub-reward__card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={whoId}>
            <div className="popup__medallion hub-reward__face" ref={el => { sources.current.face = el; }} aria-hidden="true">
              <RewardFace reward={reward} />
            </div>
            <div className="popup__ribbon"><Ribbon as="h2"><span id={titleId}>{t('rewards.title')}</span></Ribbon></div>
            <div className="popup__body hub-reward__body">
              <p className="hub-reward__who" id={whoId}><span>{who}</span></p>
              <div className="hub-reward__box">
                <h3 className="hub-reward__head">{t('rewards.listTitle')}</h3>
                {reward.items.length > 0 ? (
                  <ul className="hub-reward__list">
                    {reward.items.map((it, i) => (
                      <li key={`${it.kind}-${i}`} className="hub-reward__row" style={{ animationDelay: `${(0.35 + i * 0.1).toFixed(2)}s` }}>
                        <span className="hub-reward__dot" style={{ background: DOT[it.kind] }} aria-hidden="true" />
                        <span className="hub-reward__text">{itemText(it)}</span>
                        <span className="hub-reward__amount">
                          {it.dollars > 0 && (
                            <>
                              <BanknotesBig size={20} className="hub-reward__icon" />
                              <span aria-hidden="true">+{fmtMeta(it.dollars)}</span>
                              <span className="sr-only">{t('rewards.amountDollars', { n: fmtMeta(it.dollars), count: it.dollars })}</span>
                            </>
                          )}
                          {it.gems > 0 && (
                            <>
                              <GemBig size={18} className="hub-reward__icon" />
                              <span aria-hidden="true">+{fmtMeta(it.gems)}</span>
                              <span className="sr-only">{gemsText(it.gems)}</span>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hub-reward__none">{t('rewards.none')}</p>
                )}
                <div className="hub-reward__total">
                  <span className="hub-reward__total-label">{t('rewards.total')}</span>
                  <span className="hub-reward__sums">
                    <span className="sr-only">{t('rewards.totalValue', { dollars: fmtMeta(reward.dollars), gems: fmtMeta(reward.gems), count: reward.gems })}</span>
                    {showDollars && (
                      <span className="hub-reward__sum" aria-hidden="true" ref={el => { sources.current.dollars = el; }}>
                        <SumContent kind="dollars" n={reward.dollars} />
                      </span>
                    )}
                    {showGems && (
                      <span className="hub-reward__sum" aria-hidden="true" ref={el => { sources.current.gems = el; }}>
                        <SumContent kind="gems" n={reward.gems} />
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="hub-reward__actions">
              <button
                ref={claimRef}
                type="button"
                className="chunky chunky--yellow hub-reward__claim"
                aria-disabled={!ready || undefined}
                onClick={onClaim}
              >
                <span className="k-o chunky__label">{t('rewards.claim')}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- полёт

function Flyer({ b, scale, ease, className, children }: { b: Box; scale: number; ease: [number, number, number, number]; className: string; children: ReactNode }) {
  const timing = { delay: FLY_DELAY_MS / 1000, duration: FLY_MS / 1000 };
  return (
    <motion.span
      className={`hub-fly__item ${className}`}
      style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{ x: b.dx, y: b.dy, scale, opacity: FLY_OPACITY }}
      transition={{ ...timing, ease, opacity: { ...timing, ease: 'easeIn' } }}
    >
      {children}
    </motion.span>
  );
}

/** Суммы летят к плашкам валют, портрет — к вкладке Lives (только при обычном движении). */
export function RewardFlights({ run }: { run: RewardFlightRun }) {
  const { dollars, gems, face } = run.flights;
  return (
    <div className="hub-fly" aria-hidden="true">
      {face && <Flyer b={face} scale={FACE_SCALE} ease={EASE_FACE} className="hub-fly__face"><RewardFace reward={run.reward} /></Flyer>}
      {dollars && run.reward.dollars > 0 && <Flyer b={dollars} scale={SUM_SCALE} ease={EASE_SUM} className="hub-reward__sum hub-fly__sum"><SumContent kind="dollars" n={run.reward.dollars} /></Flyer>}
      {gems && run.reward.gems > 0 && <Flyer b={gems} scale={SUM_SCALE} ease={EASE_SUM} className="hub-reward__sum hub-fly__sum"><SumContent kind="gems" n={run.reward.gems} /></Flyer>}
    </div>
  );
}
