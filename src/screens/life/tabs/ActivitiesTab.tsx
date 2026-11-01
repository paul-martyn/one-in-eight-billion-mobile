// Вкладка «Activities» (ActivitiesCute.dc.html, «6 · Activities»).
// Фокус года оригинала (focusOptions / FOCUS / focusD, команда setFocus) и часть
// листа «Spend & invest» оригинала, относящаяся к занятиям: поездки, курсы, встречи,
// поиск работы, планы, питание и автопривычки (spendView(T, 'activities'),
// spendParts/SpendSection). Вход во вкладку открывает лист (openSpend) —
// это делает обработчик стикер-меню в LifeScreen. Время на вкладке не идёт.
import { gestureId, useAdapter, useCoreView, useSnapshot } from '../../../adapters/useGame';
import { activitiesView } from '../../../adapters/vm/activities';
import { t } from '../../../i18n';
import type { TabProps } from './types';
import { TabShell } from './oddsParts/TabShell';
import { NowCard } from './activitiesParts/NowCard';
import { SpendSection } from './spendParts/SpendSection';
import { activitiesSpend } from './spendParts/spendData';
import './activities.css';

export function ActivitiesTab({ active }: TabProps) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const vm = useCoreView(activitiesView);
  const spend = useCoreView(activitiesSpend);
  const life = snap.life;
  const canPick = snap.lifePhase === 'life';

  // Команда применяется сразу; выбранная плитка подсвечивается по новому снимку.
  // Повторное касание уже выбранного варианта (в том числе до перерисовки) команду не шлёт.
  const onPick = (k: string) => {
    const now = adapter.getSnapshot();
    if (now.lifePhase !== 'life' || !now.life || now.life.focus.current === k) return;
    adapter.setFocus(gestureId(), k);
  };

  const pill = life ? (life.year != null ? t('activities.paused', { age: life.age, year: life.year }) : t('activities.pausedAge', { age: life.age })) : null;

  return (
    <TabShell title={t('tab.activities')} pill={pill} className="acts-tab">
      {life ? (
        <>
          <NowCard life={life} vm={vm} disabled={!canPick} onPick={onPick} />
          <SpendSection tab="activities" data={spend} title={t('spend.activities.title')} active={active} />
        </>
      ) : (
        <p className="oat__empty">{t('activities.unavailable')}</p>
      )}
    </TabShell>
  );
}
