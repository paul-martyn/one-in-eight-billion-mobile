// Экран жизни: хост пяти вкладок со стикер-меню (LiveCute.dc.html, menu=stickers),
// окна решения и паузы, всплывающие сообщения, «Skip to the end» и окно смерти
// (frames pause/died, v107). Состояние игры живёт в адаптере; здесь только
// выбор вкладки (во flow), правило часов и показ окон.
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import spec from '../../design/motion.json';
import { t } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import { StickerBar, type TabId } from '../../ui/components';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { LifeTab as LifeTabId } from '../../flow/flow';
import type { ScreenProps } from '../registry';
import type { TabProps } from './tabs/types';
import { PeopleTab } from './tabs/PeopleTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { MoneyTab } from './tabs/MoneyTab';
import { OddsTab } from './tabs/OddsTab';
import { LifeTab } from './LifeTab';
import { DecisionDialog } from './parts/DecisionDialog';
import { PauseDialog } from './parts/PauseDialog';
import { LifeToasts } from './parts/LifeToasts';
import { DeathLayer, LifeOverBar } from './parts/DeathLayer';
import { SkipLayer } from './parts/SkipLayer';
import { useDocumentVisible } from './parts/lifeHooks';
import './life.css';

const TABS: Record<LifeTabId, ComponentType<TabProps>> = {
  people: PeopleTab,
  activities: ActivitiesTab,
  life: LifeTab,
  money: MoneyTab,
  odds: OddsTab,
};
const TAB_MS = spec.screenTransitions.find(x => x.id === 'screen.tab')?.durationMs ?? 220;
const TAB_EASE = spec.easing.ease as [number, number, number, number];

export function LifeScreen({ screen, nav, active }: ScreenProps) {
  const tab: LifeTabId = screen.id === 'life' ? screen.tab : 'life';
  const adapter = useAdapter();
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  const visible = useDocumentVisible();
  const life = snap.life;

  const dead = snap.lifePhase === 'dead';
  const skipping = snap.skipping;

  // Правило часов: время идёт только на вкладке «Жизнь» видимого экрана, пока
  // не открыт ответ на решение и вкладка браузера видима. Решение и пауза
  // замораживают время внутри core сами (S.pending, S.paused). Во время
  // «Skip to the end» время двигает сам адаптер — часы экрана выключены.
  // Уходящая копия экрана (active=false) часы не трогает.
  const clockOn = active && tab === 'life' && !snap.lastChoice && visible && snap.lifePhase === 'life' && !skipping;
  useEffect(() => {
    if (active) adapter.setClockActive(clockOn);
  }, [adapter, active, clockOn]);
  useEffect(() => {
    if (!active) return;
    return () => adapter.setClockActive(false);
  }, [adapter, active]);

  // Переключение вкладок: смена экрана во flow без перехода хоста (kind 'none');
  // перекрёстное появление вкладки (screen.tab, 220 мс) делает сам экран, без
  // второй копии всего экрана жизни.
  const openTab = useCallback((to: LifeTabId) => nav.go({ id: 'life', tab: to }, 'none'), [nav]);

  // Две панели на время перехода: уходящая под новой, новая проявляется.
  const [panes, setPanes] = useState<{ cur: LifeTabId; prev: LifeTabId | null; switched: boolean }>({ cur: tab, prev: null, switched: false });
  if (panes.cur !== tab) setPanes({ cur: tab, prev: reduced ? null : panes.cur, switched: true });
  useEffect(() => {
    if (!panes.prev) return;
    const id = setTimeout(() => setPanes(p => ({ ...p, prev: null })), TAB_MS);
    return () => clearTimeout(id);
  }, [panes.prev, panes.cur]);
  const shown = panes.prev && panes.prev !== panes.cur ? [panes.prev, panes.cur] : [panes.cur];

  const pending = life?.pending ?? null;
  // После смерти окна решения и паузы не показываются: экран замирает и
  // накрывается окном смерти (LiveCute frame «died»).
  const decisionOpen = active && !!life && !dead && !skipping && (!!pending || !!snap.lastChoice);
  const pauseOpen = active && !!life && tab === 'life' && life.paused && !pending && !snap.lastChoice && snap.lifePhase === 'life' && !skipping;
  const dialogOpen = decisionOpen || pauseOpen;
  const blocked = dialogOpen || dead || skipping;
  const lookBack = useCallback(() => nav.go({ id: 'ended' }), [nav]);

  const labels: Record<TabId, string> = {
    people: t('tab.people'), activities: t('tab.activities'), life: t('tab.life'), money: t('tab.money'), odds: t('tab.odds'),
  };

  return (
    <main className={`screen lf ${dead ? 'is-over' : ''}`} data-tab={tab}>
      <div className="lf__body" inert={blocked || undefined}>
        <div className="lf__stage">
          {shown.map(id => {
            const Tab = TABS[id];
            const current = id === panes.cur;
            return (
              <motion.div
                key={id}
                className={`lf__pane ${current ? 'is-current' : 'is-leaving'}`}
                aria-hidden={current ? undefined : true}
                inert={current ? undefined : true}
                initial={panes.switched && current && !reduced ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: TAB_MS / 1000, ease: TAB_EASE }}
              >
                <Tab active={active && current && !blocked} nav={nav} openTab={openTab} />
              </motion.div>
            );
          })}
        </div>
        {dead ? (
          // Когда жизнь закончилась, меню уступает место пути к её итогам.
          <LifeOverBar onLookBack={lookBack} />
        ) : (
          <StickerBar
            active={tab}
            labels={labels}
            onSelect={to => {
              // Переход на Activities или Money открывает лист «Spend & invest» оригинала (openShop).
              if ((to === 'activities' || to === 'money') && to !== tab) adapter.openSpend(gestureId());
              openTab(to);
            }}
          />
        )}
      </div>
      {active && life && (
        <>
          <DecisionDialog open={decisionOpen} life={life} lastChoice={snap.lastChoice} lifeSeq={snap.lifeSeq} />
          <PauseDialog open={pauseOpen} life={life} nav={nav} />
        </>
      )}
      <AnimatePresence>
        {active && skipping && life ? <SkipLayer key="skip" life={life} /> : null}
      </AnimatePresence>
      {/* Окно смерти читает только снимок; новая жизнь — новая последовательность.
          Уходящая под итоги копия экрана держит окно неподвижным (settled). */}
      {dead && !skipping ? <DeathLayer key={snap.lifeSeq} onLookBack={lookBack} settled={!active} /> : null}
      {active && <LifeToasts notices={snap.notices} ended={snap.lifePhase === 'dead'} />}
    </main>
  );
}
