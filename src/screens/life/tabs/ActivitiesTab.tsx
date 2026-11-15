// Вкладка «Activities» (ActivitiesCute.dc.html, «6 · Activities»).
// Часть листа «Spend & invest» оригинала, относящаяся к занятиям: поездки, курсы, встречи,
// поиск работы, планы, питание и автопривычки (spendView(T, 'activities'),
// spendParts/SpendSection). Вход во вкладку открывает лист (openSpend) —
// это делает обработчик стикер-меню в LifeScreen. Время на вкладке не идёт.
// Фокус года выбирается на вкладке «Жизнь» (вкладка «Фокус» под плашками); карточка фокуса
// отсюда убрана до переделки экрана (просьба 15 ноября 2026).
import { useCoreView, useSnapshot } from '../../../adapters/useGame';
import { t } from '../../../i18n';
import type { TabProps } from './types';
import { TabShell } from './oddsParts/TabShell';
import { SpendSection } from './spendParts/SpendSection';
import { activitiesSpend } from './spendParts/spendData';

export function ActivitiesTab({ active }: TabProps) {
  const snap = useSnapshot();
  const spend = useCoreView(activitiesSpend);
  const life = snap.life;

  const pill = life ? (life.year != null ? t('activities.paused', { age: life.age, year: life.year }) : t('activities.pausedAge', { age: life.age })) : null;

  return (
    <TabShell title={t('tab.activities')} pill={pill} className="acts-tab">
      {life ? (
        <SpendSection tab="activities" data={spend} title={t('spend.activities.title')} active={active} />
      ) : (
        <p className="oat__empty">{t('activities.unavailable')}</p>
      )}
    </TabShell>
  );
}
