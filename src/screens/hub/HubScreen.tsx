// «9 · Hub between lives» (HubCute холста, версия «как старт»): шестерёнка-значок и
// плашки энергии / долларов / кристаллов (snapshot.meta) сверху, под экраном — общая
// планета (PlanetStage; лица на ней можно ловить: доллар, «счастливое» — кристалл),
// облачко, счётчики от самой планеты, «Be Born!» 196 × 70 с ценой на уголке,
// продолжение сохранённой жизни и нижнее меню Shop / World / Lives (вкладки-папки).
// Экран нарисован в кадре 393 × H; места по высоте считает layHub.
// Тап по стране на планете показывает её карточку; «!» на карточке приближает планету к стране,
// и поверх открывается страница страны (HubCountry холста): та же сводка, что на рулетке,
// «Назад» к планете и «Be born here» — жизнь в этой стране (1 энергия; в макете — за рекламу,
// пока рекламы нет — без неё). Хаб на это время уходит в стороны.
// «Be Born!»: при сохранённой жизни — подтверждение, затем команда startLife,
// затем уход интерфейса (hubLeave), затем рулетка.
// После прожитой жизни — окно наград «A life lived» и Claim (./Rewards.tsx), бейдж
// новых жизней на вкладке Lives (snapshot.meta.unseenLives; открытие вкладки — seeLives).
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import spec from '../../design/motion.json';
import { t, numberLocale } from '../../i18n';
import { useAdapter, useSnapshot } from '../../adapters/useGame';
import { META_RULES } from '../../adapters/meta';
import type { PastLifeVM } from '../../adapters/viewModels';
import { SoftButton } from '../../ui/components';
import { Frame, useFrame } from '../../ui/frame/Frame';
import { CtaButton, CtaCost, Say, Since } from '../../ui/frame/parts';
import { MetaBar, NoEnergyLine } from '../../ui/meta/Meta';
import { planetBus, usePlanetEvents } from '../../ui/planet/bus';
import { useBack } from '../../flow/useBack';
import { gestureId } from '../../adapters/useGame';
import type { Land } from '../roll/luck';
import { Summary } from '../roll/Summary';
import { useCountUpProgress } from '../../ui/meta/useMeta';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { ScreenProps } from '../registry';
import { NewLifeGuard, useBeBorn } from '../start/newLife';
import { RewardFlights, RewardsPopup, useLifeReward } from './Rewards';
import { fmtInt, useContinueLife } from '../start/shared';
import { extrasOf, layHub, layHubCountry } from '../layouts';
import { capFirst } from '../start/shared';
import './hub.css';

type HubTab = 'shop' | 'world' | 'lives';
const A = spec.sequences.hubArrive;
const L = spec.sequences.hubLeave;
/** Макет прячет интерфейс на первые 50 мс, затем запускает появление (HubCute SHOW_MS). */
const SHOW_MS = 50;
const bezier = (k: keyof typeof spec.easing) => `cubic-bezier(${(spec.easing[k] as number[]).join(',')})`;
const ROOT_VARS = {
  '--hub-arrive': bezier('arrive'),
  '--hub-away': bezier('away'),
  '--hub-glide': bezier('screen'),
  '--hub-top-ms': `${A.top.durationMs}ms`,
  '--hub-top-y': `${A.top.translateY[0]}px`,
  '--hub-mid-ms': `${A.counters.durationMs}ms`,
  '--hub-mid-y': `${A.counters.translateY[0]}px`,
  '--hub-mid-in': `${A.counters.delayMs}ms`,
  '--hub-cta-ms': `${A.cta.durationMs}ms`,
  '--hub-cta-scale': String(A.cta.scale[0]),
  '--hub-cta-in': `${A.cta.delayMs}ms`,
  '--hub-nav-ms': `${A.nav.durationMs}ms`,
  '--hub-nav-y': `${A.nav.translateY[0]}px`,
  '--hub-nav-in': `${A.nav.delayMs}ms`,
  '--hub-top-out': `${L.top.delayMs}ms`,
  '--hub-mid-out': `${L.counters.delayMs}ms`,
  '--hub-cta-out': `${L.cta.delayMs}ms`,
  '--hub-nav-out': `${L.nav.delayMs}ms`,
} as CSSProperties;

const TABS: { key: HubTab; color: string; label: string; icon: ReactNode }[] = [
  {
    key: 'shop', color: '#8fd14f', label: 'hub.shop',
    icon: (<><path d="M4.5 8.5h15l-1.3 12H5.8Z" fill="#ffffff" stroke="#5a3418" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5" fill="none" stroke="#5a3418" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 11.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z" fill="#5a3418" /></>),
  },
  {
    key: 'world', color: '#ffd75a', label: 'hub.world',
    icon: (<><circle cx="12" cy="12" r="9" fill="#ffffff" stroke="#5a3418" strokeWidth="1.8" /><path d="M5 8.5c2-.6 3.6.2 3.9 1.6.3 1.5-.9 2.3-2.2 2.6-1 .2-1.5 1.2-2.3 1.6M13 3.4c-.3 1.6.8 2.4 2.3 2.6 1.4.2 2.6 1 2.3 2.6-.2 1.2-1.6 1.5-2 2.6-.4 1.2.6 2.4-.2 3.6M9.5 20.4c.2-1.4 1-2.6 2.4-2.8" fill="none" stroke="#5a3418" strokeWidth="1.6" strokeLinecap="round" /></>),
  },
  {
    key: 'lives', color: '#b48cff', label: 'hub.lives',
    icon: (<><rect x="4.5" y="3" width="15" height="18.5" rx="2.5" fill="#ffffff" stroke="#5a3418" strokeWidth="1.8" /><path d="M8 3.5v17.5" stroke="#5a3418" strokeWidth="1.6" /><path d="M14 9.4c.9-1.6 3.5-1.2 3.5.8 0 1.6-2 2.8-3.5 4-1.5-1.2-3.5-2.4-3.5-4 0-2 2.6-2.4 3.5-.8Z" fill="#ff6b6b" stroke="#5a3418" strokeWidth="1.3" strokeLinejoin="round" /></>),
  },
];

export function HubScreen({ nav, active }: ScreenProps) {
  const snap = useSnapshot();
  const adapter = useAdapter();
  const reduced = useReducedMotion();
  const uid = useId();
  const [tab, setTab] = useState<HubTab>('world');
  const [shown, setShown] = useState(reduced);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frame = useFrame();
  const livesRef = useRef<HTMLButtonElement | null>(null);
  // Команда уже применена; уход интерфейса только показывает начатую жизнь.
  const [bornIn, setBornIn] = useState<string | null>(null);
  const onStarted = useCallback((iso?: string) => {
    // Страна выбрана на планете: планета уже у неё, рулетка не нужна — дальше сразу рождение.
    if (iso) { setBornIn(iso); return; }
    if (reduced) { nav.go({ id: 'roll' }); return; }
    setLeaving(true);
    leaveTimer.current = setTimeout(() => nav.go({ id: 'roll' }), L.navigateAfterMs);
  }, [reduced, nav]);
  const born = useBeBorn(nav, active && !leaving, onStarted);
  const busy = born.busy;
  const onContinue = useContinueLife(nav);
  const countUp = useCountUpProgress(reduced);
  const waitId = useId();
  const ready = snap.status === 'ready';
  const resume = snap.resume;
  const meta = born.meta;
  const reward = useLifeReward({ active, leaving, reduced, rootRef, livesRef });
  const inert = reward.modal || undefined;
  const extras = extrasOf(snap);
  const lay = layHub(frame, extras);
  // Пойманные на планете лица: плашка валюты вздрагивает, когда монета долетела.
  const [caught, setCaught] = useState({ coin: 0, gem: 0 });
  usePlanetEvents((type, payload) => {
    if (type === 'catch' && (payload === 'coin' || payload === 'gem')) setCaught(c => ({ ...c, [payload]: c[payload] + 1 }));
  }, active);

  // Страница страны: планета сообщает страну, когда начинает приближаться, и «dive in / out» в конце.
  const [country, setCountry] = useState<{ land: Land; shown: boolean } | null>(null);
  usePlanetEvents((type, payload) => {
    if (type === 'land') setCountry({ land: payload as Land, shown: false });
    else if (type === 'dive' && payload === 'in') setCountry(c => (c ? { ...c, shown: true } : c));
    else if (type === 'dive' && payload === 'out') setCountry(null);
  }, active);
  const away = !!country;
  const toPlanet = () => { if (country && !bornIn) planetBus.emit('cmd', 'undive'); };
  useBack(() => { if (!country) return false; toPlanet(); }, { layer: 'screen', enabled: active && !!country });
  // «Be born here»: жизнь уже начата в этой стране; когда досчитаны четыре жизни той же секунды — свидетельство.
  useEffect(() => {
    if (!bornIn || !active || snap.lifePhase !== 'birth' || !snap.companionsReady) return;
    if (adapter.revealCertificate(gestureId())) nav.go({ id: 'certificate', filled: false }, 'birth');
  }, [bornIn, active, snap.lifePhase, snap.companionsReady, adapter, nav]);
  const page = layHubCountry(frame, extras);
  const countryName = country ? capFirst(country.land.short) : '';
  const nameSize = Math.max(28, Math.min(52, Math.floor(330 / Math.max(1, [...countryName].length * 0.58))));

  // Появление: интерфейс скрыт первые 50 мс, затем «съезжается» к планете.
  useEffect(() => {
    if (shown) return;
    const id = setTimeout(() => setShown(true), SHOW_MS);
    return () => clearTimeout(id);
  }, [shown]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const onSettings = () => { if (active && !leaving && !busy) nav.go({ id: 'settings' }); };
  const pick = (k: HubTab) => {
    if (leaving) return;
    setTab(k);
    // Открытая вкладка Lives снимает бейдж новых жизней (нажатие пользователя).
    if (k === 'lives' && (adapter.getSnapshot().meta?.unseenLives ?? 0) > 0) adapter.seeLives();
  };
  const open = TABS.find(x => x.key === tab) ?? TABS[1]!;
  const panelId = (k: HubTab) => `${uid}-panel-${k}`;
  const tabId = (k: HubTab) => `${uid}-tab-${k}`;

  return (
    <main className="pscreen over-planet hub" style={ROOT_VARS} data-shown={(shown && !leaving && !away) || undefined} data-leaving={leaving || undefined} data-country={away ? (country!.shown ? 'shown' : 'in') : undefined}>
      <Frame ref={rootRef}>
        <header className="hub__top" style={{ top: lay.bar }} inert={inert}>
          <button type="button" className="hub__gear" onClick={onSettings} disabled={leaving} aria-label={t('hub.settingsOpen')}>
            <GearCute />
          </button>
          {meta && <MetaBar className="hub__meta" meta={meta} progress={countUp} counts={reward.counts} pop={reward.landed} bump={caught} />}
        </header>

        {tab === 'world' && (
          <section key="world" className="hub__world" role="tabpanel" id={panelId('world')} aria-labelledby={tabId('world')} inert={inert}>
            {lay.say != null && <Say className="hub__mid" style={{ top: lay.say }} line={t('start.bubble1')} accent={t('hub.bubble2')} />}
            <Since className="hub__mid" style={{ top: lay.since }} />
            <div className="hub__cta" style={{ top: lay.cta }}>
              <CtaButton
                label={t('hub.bornNew')}
                cost={born.cost != null ? <CtaCost n={born.cost} label={t('hub.meta.cost', { n: born.cost })} /> : undefined}
                onClick={reward.pending ? reward.openNow : () => born.request()}
                disabled={!ready || busy || leaving || !born.canStart}
                aria-busy={busy || undefined}
                aria-describedby={extras.noEnergy ? waitId : undefined}
              />
            </div>
            <div className="below hub__below" style={{ top: lay.below }}>
              {extras.noEnergy && <NoEnergyLine id={waitId} nextRefillAt={meta?.nextRefillAt ?? null} />}
              {extras.resume && resume && (
                <SoftButton className="continue-btn" onClick={onContinue} disabled={!ready || busy || leaving}>
                  <span className="continue-btn__main">
                    {resume.phase === 'birth' ? t('hub.continueNewborn', { name: resume.name }) : t('hub.continue', { name: resume.name, age: resume.age })}
                  </span>
                  <span className="continue-btn__sub">{t('hub.continuePlace', { place: resume.place })}</span>
                </SoftButton>
              )}
            </div>
            <p className="sr-only" role="status">{busy ? t('hub.starting') : ''}</p>
          </section>
        )}
        {tab === 'lives' && (
          <section key="lives" data-hit="" className="hub__panel hub__lives scroll" style={{ top: lay.panelTop, bottom: lay.panelBottom }} role="tabpanel" id={panelId('lives')} aria-labelledby={tabId('lives')} inert={inert}>
            <LivesList lives={snap.pastLives} />
          </section>
        )}
        {tab === 'shop' && (
          <section key="shop" data-hit="" className="hub__panel hub__shop" style={{ top: lay.panelTop, bottom: lay.panelBottom }} role="tabpanel" id={panelId('shop')} aria-labelledby={tabId('shop')} inert={inert}>
            <div className="hub-card">
              <span className="hub-card__icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24">{TABS[0]!.icon}</svg></span>
              <p className="hub-card__eyebrow">{t('hub.shop')}</p>
              <h2 className="hub-card__title">{t('hub.shopTitle')}</h2>
              <p className="hub-card__body">{t('hub.shopBody')}</p>
              <p className="hub-card__note">{t('hub.shopNote', { min: Math.round(META_RULES.refillMs / 60000), max: META_RULES.maxEnergy })}</p>
            </div>
          </section>
        )}

        {/* Страница страны: подпись и название сверху, сводка и кнопки внизу — как на рулетке */}
        <div className="hub-country" aria-hidden={!away || undefined} inert={!away || undefined}>
          <p className="hub-country__label" style={{ top: page.label }}>{t('hub.country.label')}</p>
          <p className="hub-country__name" aria-hidden="true" style={{ top: page.name, fontSize: nameSize, WebkitTextStroke: `${((nameSize / 52) * 5).toFixed(1)}px #5a3418`, textShadow: `0 ${((nameSize / 52) * 4).toFixed(1)}px 0 #5a3418` }}>{countryName}</p>
          <p className="sr-only" role="status">{country?.shown ? t('hub.country.status', { country: country.land.name }) : ''}</p>
          <Summary land={country?.land ?? null} shown={!!country?.shown} fast style={{ bottom: page.summaryBottom }} />
          <button type="button" className="side-btn hub-country__back" style={{ top: page.cta + 3 }} onClick={toPlanet} disabled={!!bornIn || busy} aria-label={t('hub.country.back')}>
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="#5a3418" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <CtaButton
            className="hub-country__born"
            style={{ top: page.cta }}
            label={t('hub.country.born')}
            aria-label={t('hub.country.bornLabel', { n: born.cost ?? 1 })}
            onClick={() => { if (country) born.request(country.land.iso); }}
            disabled={!ready || busy || !!bornIn || !born.canStart || !country?.land.iso}
            aria-busy={busy || !!bornIn || undefined}
            cost={<span className="side-btn__ad hub-country__ad" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 1l7 4-7 4Z" fill="#2f5a17" /></svg>{t('roll.ad')}</span>}
          />
          <p className="hub-country__wait" role="status" style={{ top: page.cta + 76 }}>
            {bornIn ? t('roll.waitComps') : away && !born.canStart ? t('hub.meta.noEnergy') : ''}
          </p>
        </div>

        <nav className="hub__nav" style={{ height: 124 + frame.bottom }} aria-label={t('hub.menu')} inert={inert}>
          <div className="hub__tabs" style={{ bottom: 42 + frame.bottom }} role="tablist" aria-label={t('hub.menu')}>
            {TABS.map(x => {
              const on = x.key === tab;
              return (
                <div key={x.key} className="hub-tab" data-on={on || undefined}>
                  <button
                    ref={x.key === 'lives' ? livesRef : undefined}
                    type="button"
                    role="tab"
                    id={tabId(x.key)}
                    aria-selected={on}
                    aria-controls={on ? panelId(x.key) : undefined}
                    aria-label={t(x.label)}
                    className="hub-tab__btn"
                    style={{ background: x.color }}
                    onClick={() => pick(x.key)}
                  >
                    <svg className="hub-tab__icon" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">{x.icon}</svg>
                    <span className="t-stroke-s hub-tab__label" aria-hidden="true">{t(x.label)}</span>
                    {x.key === 'lives' && reward.badge > 0 && (
                      <>
                        <span className="t-stroke-s hub-tab__badge" data-new={reward.landed || undefined} aria-hidden="true">{reward.badge}</span>
                        <span className="sr-only">{reward.badge === 1 ? t('hub.livesNewOne') : t('hub.livesNew', { n: reward.badge })}</span>
                      </>
                    )}
                  </button>
                  <span className="hub-tab__line" aria-hidden="true" />
                </div>
              );
            })}
          </div>
          <div className="hub__band" style={{ background: open.color, height: 44 + frame.bottom }} aria-hidden="true" />
        </nav>
        {reward.shown && (
          <RewardsPopup key={reward.shown.lifeId} reward={reward.shown} closing={reward.closing} ready={reward.ready} onClaim={reward.claim} sources={reward.sources} />
        )}
        {reward.flying && <RewardFlights key={reward.flying.key} run={reward.flying} />}
        <p className="sr-only" role="status">{reward.said}</p>
      </Frame>
      <NewLifeGuard {...born.guard} />
    </main>
  );
}

/** Шестерёнка-значок настроек (HubCute, 2026-11-04): объёмная, без круглой кнопки под ней. */
const GEAR = 'M14.57 6.92L14.98 3.10L21.02 3.10L21.43 6.92L23.41 7.74L26.40 5.33L30.67 9.60L28.26 12.59L29.08 14.57L32.90 14.98L32.90 21.02L29.08 21.43L28.26 23.41L30.67 26.40L26.40 30.67L23.41 28.26L21.43 29.08L21.02 32.90L14.98 32.90L14.57 29.08L12.59 28.26L9.60 30.67L5.33 26.40L7.74 23.41L6.92 21.43L3.10 21.02L3.10 14.98L6.92 14.57L7.74 12.59L5.33 9.60L9.60 5.33L12.59 7.74Z';
function GearCute() {
  return (
    <svg width="40" height="40" viewBox="0 0 36 36" aria-hidden="true">
      <defs><clipPath id="hub-gear"><path d={GEAR} /></clipPath></defs>
      <path d={GEAR} transform="translate(0 2)" fill="#8d96b8" stroke="#5a3418" strokeWidth="2.2" strokeLinejoin="round" />
      <path d={GEAR} fill="#c3cae3" />
      <g clipPath="url(#hub-gear)"><circle cx="13.5" cy="12.5" r="13" fill="#e4e8f5" /><circle cx="20.5" cy="22" r="13.5" fill="#c3cae3" /></g>
      <path d={GEAR} fill="none" stroke="#5a3418" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="18" cy="18" r="5.2" fill="#fff3d6" stroke="#5a3418" strokeWidth="2.2" />
      <path d="M14.4 17.2a3.8 3.8 0 0 1 7.2 0" fill="none" stroke="#d7bd92" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const INITIAL_BG = ['#ffd2c8', '#cdeaf6', '#d6f0de', '#ffe9a8', '#e6dcff'];
const DATE = { format: (date: number | Date) => new Intl.DateTimeFormat(numberLocale(), { year: 'numeric', month: 'short', day: 'numeric' }).format(date) };

/** Прожитые жизни (one8b.en.lives.v1 через snapshot.pastLives), новые сверху. */
function LivesList({ lives }: { lives: PastLifeVM[] }) {
  const count = lives.length === 1 ? t('hub.livesCountOne') : t('hub.livesCount', { n: fmtInt(lives.length), count: lives.length });
  return (
    <div className="hub-lives">
      <h2 className="hub-lives__head">
        <span>{t('hub.livesTitle')}</span>
        {lives.length > 0 && <span className="hub-lives__count">{count}</span>}
      </h2>
      {lives.length === 0 ? (
        <p className="hub-lives__empty">{t('hub.livesEmpty')}</p>
      ) : (
        <ol className="hub-lives__list">
          {lives.map((l, i) => (
            <li key={`${l.at}-${i}`} className="life-row">
              <span className="initial life-row__face" style={{ background: INITIAL_BG[i % INITIAL_BG.length] }} aria-hidden="true">
                {[...(l.name || '?')][0]}
              </span>
              <div className="life-row__text">
                <p className="life-row__name">{l.name}</p>
                <p className="life-row__meta">{l.country} · {t('hub.lifeAge', { age: l.age })}</p>
                {l.cause && <p className="life-row__line">{t('hub.lifeCause', { cause: l.cause })}</p>}
                {l.job && <p className="life-row__line">{t('hub.lifeJob', { job: l.job })}</p>}
                {Number.isFinite(l.at) && l.at > 0 && <p className="life-row__date">{t('hub.lifeDate', { date: DATE.format(new Date(l.at)) })}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="hub-lives__note">{t('hub.livesNote')}</p>
    </div>
  );
}
