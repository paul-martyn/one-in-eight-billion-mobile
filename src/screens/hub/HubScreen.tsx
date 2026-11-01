// «9 · Hub between lives» (HubCute.dc.html): настройки, энергия, доллары и
// кристаллы мобильной версии (snapshot.meta), планета, счётчики, «Be Born!»
// за 1 энергию, продолжение сохранённой жизни и нижнее меню Shop / World / Lives.
// «Be Born!»: при сохранённой жизни — подтверждение, затем команда startLife,
// затем уход интерфейса (hubLeave), затем рулетка.
// После прожитой жизни — окно наград «A life lived» и Claim (./Rewards.tsx), бейдж
// новых жизней на вкладке Lives (snapshot.meta.unseenLives; открытие вкладки — seeLives).
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import spec from '../../design/motion.json';
import { t } from '../../i18n';
import { useAdapter, useSnapshot } from '../../adapters/useGame';
import { META_RULES } from '../../adapters/meta';
import type { PastLifeVM } from '../../adapters/viewModels';
import { SoftButton } from '../../ui/components';
import { GearIcon } from '../../ui/icons';
import { Globe } from '../../ui/globe/Globe';
import { BornButton, MetaBar, NoEnergyLine } from '../../ui/meta/Meta';
import { useCountUpProgress } from '../../ui/meta/useMeta';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { ScreenProps } from '../registry';
import { NewLifeGuard, useBeBorn } from '../start/newLife';
import { RewardFlights, RewardsPopup, useLifeReward } from './Rewards';
import { BrandTitle, fmtInt, useContinueLife, useFitSize, WorldCounters } from '../start/shared';
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
  const rootRef = useRef<HTMLElement | null>(null);
  const livesRef = useRef<HTMLButtonElement | null>(null);
  // Команда уже применена; уход интерфейса только показывает начатую жизнь.
  const onStarted = useCallback(() => {
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
  // После начатой жизни (busy) уходящий экран не показывает «нет энергии».
  const noEnergy = !!meta && !meta.canStartLife && !busy;
  const reward = useLifeReward({ active, leaving, reduced, rootRef, livesRef });
  const inert = reward.modal || undefined;

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
    <main ref={rootRef} className="screen hub" style={ROOT_VARS} data-shown={(shown && !leaving) || undefined} data-leaving={leaving || undefined}>
      <div className="sky-glow hub__glow" aria-hidden="true" />
      <header className="hub__top" inert={inert}>
        <div className="hub__bar">
          <button type="button" className="round-btn hub__gear" onClick={onSettings} disabled={leaving} aria-label={t('hub.settingsOpen')}>
            <GearIcon size={26} />
          </button>
          {meta && <MetaBar className="hub__meta" meta={meta} progress={countUp} counts={reward.counts} pop={reward.landed} />}
        </div>
        <BrandTitle className="hub__title" />
      </header>

      <div className="hub__body" inert={inert}>
        {tab === 'world' && (
          <section key="world" className="hub__panel hub__world" role="tabpanel" id={panelId('world')} aria-labelledby={tabId('world')}>
            <WorldPanelGlobe reduced={reduced} />
            <WorldCounters className="hub__counters" />
            <div className="hub__actions">
              <BornButton
                className="hub__born"
                label={t('hub.bornNew')}
                cost={born.cost}
                onClick={reward.pending ? reward.openNow : born.request}
                disabled={!ready || busy || leaving || !born.canStart}
                aria-busy={busy || undefined}
                aria-describedby={noEnergy ? waitId : undefined}
              />
              {noEnergy && <NoEnergyLine id={waitId} nextRefillAt={meta?.nextRefillAt ?? null} />}
              {resume && (
                <SoftButton className="continue-btn hub__continue" onClick={onContinue} disabled={!ready || busy || leaving}>
                  <span className="continue-btn__main">
                    {resume.phase === 'birth' ? t('hub.continueNewborn', { name: resume.name }) : t('hub.continue', { name: resume.name, age: resume.age })}
                  </span>
                  <span className="continue-btn__sub">{t('hub.continuePlace', { place: resume.place })}</span>
                </SoftButton>
              )}
              <p className="sr-only" role="status">{busy ? t('hub.starting') : ''}</p>
            </div>
          </section>
        )}
        {tab === 'lives' && (
          <section key="lives" className="hub__panel hub__lives scroll" role="tabpanel" id={panelId('lives')} aria-labelledby={tabId('lives')}>
            <LivesList lives={snap.pastLives} />
          </section>
        )}
        {tab === 'shop' && (
          <section key="shop" className="hub__panel hub__shop" role="tabpanel" id={panelId('shop')} aria-labelledby={tabId('shop')}>
            <div className="hub-card">
              <span className="hub-card__icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24">{TABS[0]!.icon}</svg></span>
              <p className="hub-card__eyebrow">{t('hub.shop')}</p>
              <h2 className="hub-card__title">{t('hub.shopTitle')}</h2>
              <p className="hub-card__body">{t('hub.shopBody')}</p>
              <p className="hub-card__note">{t('hub.shopNote', { min: Math.round(META_RULES.refillMs / 60000), max: META_RULES.maxEnergy })}</p>
            </div>
          </section>
        )}
      </div>

      <nav className="hub__nav" aria-label={t('hub.menu')} inert={inert}>
        <div className="hub__tabs" role="tablist" aria-label={t('hub.menu')}>
          {TABS.map(x => {
            const on = x.key === tab;
            return (
              <button
                key={x.key}
                ref={x.key === 'lives' ? livesRef : undefined}
                type="button"
                role="tab"
                id={tabId(x.key)}
                aria-selected={on}
                aria-controls={on ? panelId(x.key) : undefined}
                className="hub-tab"
                style={{ background: x.color }}
                onClick={() => pick(x.key)}
              >
                <svg className="hub-tab__icon" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">{x.icon}</svg>
                <span className="k-os hub-tab__label">{t(x.label)}</span>
                {x.key === 'lives' && reward.badge > 0 && (
                  <>
                    <span className="k-os hub-tab__badge" data-new={reward.landed || undefined} aria-hidden="true">{reward.badge}</span>
                    <span className="sr-only">{reward.badge === 1 ? t('hub.livesNewOne') : t('hub.livesNew', { n: reward.badge })}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="hub__band" style={{ background: open.color }} aria-hidden="true" />
      </nav>
      <NewLifeGuard {...born.guard} />
      {reward.shown && (
        <RewardsPopup key={reward.shown.lifeId} reward={reward.shown} closing={reward.closing} ready={reward.ready} onClaim={reward.claim} sources={reward.sources} />
      )}
      {reward.flying && <RewardFlights key={reward.flying.key} run={reward.flying} />}
      <p className="sr-only" role="status">{reward.said}</p>
    </main>
  );
}

function WorldPanelGlobe({ reduced }: { reduced: boolean }) {
  const [box, size] = useFitSize<HTMLDivElement>(290);
  return (
    <div ref={box} className="hub__globe">
      {size > 0 && <Globe size={size} startLon={-40} reducedMotion={reduced} idleLabel={t('globe.idle')} />}
    </div>
  );
}

const INITIAL_BG = ['#ffd2c8', '#cdeaf6', '#d6f0de', '#ffe9a8', '#e6dcff'];
const DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

/** Прожитые жизни (one8b.en.lives.v1 через snapshot.pastLives), новые сверху. */
function LivesList({ lives }: { lives: PastLifeVM[] }) {
  const count = lives.length === 1 ? t('hub.livesCountOne') : t('hub.livesCount', { n: fmtInt(lives.length) });
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
