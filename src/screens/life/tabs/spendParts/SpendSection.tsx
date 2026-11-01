// Раздел «Spend & invest» оригинала на вкладке Activities или Money (openShop,
// game.en.js 208723-208891, разложенный по вкладкам в adapters/vm/spend.ts):
// «Worth doing now» → остальное под «More (N)» → «Ways of living» (настройки и
// автопривычки). Рискованные пункты (SHOP_ASK) — через окно подтверждения;
// результат покупки — окно со строками журнала (snapshot.lastSpend).
// Команды — только из обработчиков касаний, с gestureId() в самом обработчике.
import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gestureId, useAdapter, useSnapshot } from '../../../../adapters/useGame';
import type { GameAdapter } from '../../../../adapters/gameAdapter';
import type { SpendItem, SpendSetting, SpendTab } from '../../../../adapters/vm/spend';
import { Eyebrow } from '../../../../ui/components';
import { useReducedMotion } from '../../../../ui/motionPrefs';
import { t } from '../../../../i18n';
import type { SpendData } from './spendData';
import { SpendItemCard, type CostLabels, type SpendPick } from './SpendItemCard';
import { HabitList, SettingBlock } from './SpendWays';
import { ConfirmDialog, ResultDialog, useDialogLayer, type SpendResult } from './SpendDialogs';
import { MoreChevron } from './spendIcons';
import './spend.css';

/** Раскрыт ли список «More (N)» — помнится между посещениями вкладки (как UI.shopMore оригинала). */
const moreOpen: Record<SpendTab, boolean> = { activities: false, money: false };

/** Оповещение 'spend' дублирует окно результата — убираем его в том же касании. */
function dropSpendNotices(adapter: GameAdapter) {
  for (const n of adapter.getSnapshot().notices) if (n.kind === 'spend') adapter.dismissNotice(n.id);
}

function applySetting(adapter: GameAdapter, s: SpendSetting, v: string) {
  const g = gestureId();
  switch (s.id) {
    case 'invest': adapter.setInvest(g, v); break;
    case 'gift': if (v === 'full' || v === 'some' || v === 'none') adapter.setGift(g, v); break;
    case 'insurance': if (v === 'base' || v === 'more') adapter.setInsurance(g, v); break;
    case 'surname': if (v === 'f' || v === 'm') adapter.setSurname(g, v); break;
    case 'diet': if (v === 'usual' || v === 'good' || v === 'out') adapter.setDiet(g, v); break;
  }
}

export function SpendSection({ tab, data, title, active }: { tab: SpendTab; data: SpendData | null; title: string; active: boolean }) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  const [anchor, layer] = useDialogLayer();
  const uid = useId();
  const [more, setMore] = useState(() => moreOpen[tab]);
  const [ask, setAsk] = useState<SpendPick | null>(null);
  const [bought, setBought] = useState<{ key: string; what: string } | null>(null);

  const last = snap.lastSpend;
  const result = useMemo<SpendResult | null>(
    () => (last ? { what: bought && bought.key === last.key ? bought.what : null, entries: last.entries } : null),
    [last, bought],
  );

  if (!data) return null;
  const { view } = data;
  const labels: CostLabels = { free: data.free, credit: view.labels.credit, noMoney: data.noMoney };
  const canAct = snap.lifePhase === 'life' && !snap.life?.pending;

  const ready = () => {
    const now = adapter.getSnapshot();
    return now.lifePhase === 'life' && !now.life?.pending && !now.lastSpend;
  };
  const buyNow = (p: SpendPick) => {
    if (!ready()) return;
    setBought({ key: p.key, what: p.optionName ? `${p.itemName} · ${p.optionName}` : p.itemName });
    adapter.buy(gestureId(), p.key);
    dropSpendNotices(adapter);
  };
  const onPick = (p: SpendPick) => {
    if (!ready()) return;
    if (p.confirm) setAsk(p);
    else buyNow(p);
  };
  const onConfirm = () => {
    const p = ask;
    setAsk(null);
    if (p) buyNow(p);
  };
  const onSet = (s: SpendSetting, v: string) => {
    if (!ready() || s.disabled || v === s.value) return;
    applySetting(adapter, s, v);
  };
  const onToggle = (id: string) => {
    if (!ready()) return;
    adapter.toggleHabit(gestureId(), id);
  };
  const toggleMore = () => {
    moreOpen[tab] = !more;
    setMore(!more);
  };

  const top = view.items.filter(i => i.top);
  const rest = view.items.filter(i => !i.top);
  const habits = view.habits;
  const hasWays = view.settings.length > 0 || habits.length > 0;
  const card = (i: SpendItem) => <SpendItemCard key={i.id} item={i} labels={labels} disabled={!canAct} onPick={onPick} />;
  const titleId = `${uid}-title`;
  const restId = `${uid}-more`;

  return (
    <section ref={anchor} className="spd" aria-labelledby={titleId}>
      <Eyebrow meta={view.available ? view.head : undefined}><span id={titleId}>{title}</span></Eyebrow>

      {!view.available ? (
        <p className="spd-closed">{t('spend.closed', { title: view.title })}</p>
      ) : (
        <>
          {view.income && <p className="spd-income">{t('spend.income', { amount: view.income })}</p>}

          {view.items.length === 0 && !hasWays && <p className="spd-closed">{t('spend.empty')}</p>}

          {top.length > 0 && (
            <>
              <p className="spd-label">{view.labels.worthNow}</p>
              <ul className="spd-list">{top.map(card)}</ul>
            </>
          )}

          {rest.length > 0 && (top.length > 0 ? (
            <>
              <button type="button" className="spd-more" aria-expanded={more} aria-controls={restId} onClick={toggleMore}>
                <span>{view.labels.more}</span>
                <MoreChevron open={more} />
              </button>
              <AnimatePresence initial={false}>
                {more && (
                  <motion.ul
                    key="more"
                    id={restId}
                    className="spd-list spd-list--more"
                    initial={reduced ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.12 } }}
                    transition={{ duration: 0.2 }}
                  >
                    {rest.map(card)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </>
          ) : (
            <ul className="spd-list">{rest.map(card)}</ul>
          ))}

          {hasWays && (
            <>
              <Eyebrow>{view.labels.ways}</Eyebrow>
              <div className="spd-ways">
                {view.settings.map(s => <SettingBlock key={s.id} s={s} disabled={!canAct} onSet={onSet} />)}
                {habits.length > 0 && <HabitList title={view.labels.onItsOwn} note={view.labels.habitsNote} habits={habits} disabled={!canAct} onToggle={onToggle} />}
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog layer={layer} ask={active ? ask : null} labels={labels} onCancel={() => setAsk(null)} onConfirm={onConfirm} />
      <ResultDialog layer={layer} result={active && !ask ? result : null} onDone={() => adapter.dismissLastSpend()} />
    </section>
  );
}
