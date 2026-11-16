// Блок под плашками (холст LiveCute v411, 17.11): лист и под ним две вкладки по центру — «Журнал» и «Фокус»
// (одно слово, постоянная подпись; значки книжки и мозга). Список у краёв листа мягко растворяется.
// Дневник: записи S.log (через снимок адаптера), новые сверху, карточками (вариант F1, схема E): слева корешок
// «Возраст» над числом, справа текст одним стилем, подпись источника и значки изменений по знаку. Решение — карточка
// с пунктирной рамкой «вопрос · Решение: ответ». Выборов внутри дневника нет — решения открываются окном.
// Фокус: варианты фокуса движка для стадии жизни (focusOptions) «плашками выбора» дизайн-кода (DcChoice): название,
// строка статов словами со стрелками (FOCUS[k].e) и кнопка «Выбрать»; у текущего — нажатая «В фокусе», плашка
// поднята. Выбор — через адаптер (setFocus), как и раньше.
// Показываются последние 120 записей; более ранние — по кнопке.
import { memo, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter } from '../../../adapters/useGame';
import type { JournalEntryVM, LifeVM } from '../../../adapters/viewModels';
import { FxArrows, FxChips, STAT_PATH } from './StatChips';

const PAGE = 120;
type Tab = 'journal' | 'focus';

export function Journal({ journal, offset, freshFrom, reduced, lifeSeq, over = false, life, enabled }: {
  journal: JournalEntryVM[]; offset: number; freshFrom: number; reduced: boolean; lifeSeq: number;
  /** Жизнь закончилась: остаётся только дневник, он возвращается к началу, где последняя запись. */
  over?: boolean;
  life: LifeVM; enabled: boolean;
}) {
  const [tab, setTab] = useState<Tab>('journal');
  const shown: Tab = over ? 'journal' : tab;
  const id = useId();
  return (
    <section className="lb" aria-label={t('life.tabs')}>
      <div className="lb__box">
        {shown === 'journal'
          ? <JournalList id={`${id}-pj`} tab={`${id}-j`} journal={journal} offset={offset} freshFrom={freshFrom} reduced={reduced} lifeSeq={lifeSeq} over={over} />
          : <FocusList id={`${id}-pf`} tab={`${id}-f`} life={life} enabled={enabled} />}
      </div>
      <div className="lb__tabs" role="tablist" aria-label={t('life.tabs')}>
        <TabButton id={`${id}-j`} panel={`${id}-pj`} on={shown === 'journal'} onClick={() => setTab('journal')}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d={STAT_PATH.sm} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>
          <span>{t('life.tab.journal')}</span>
        </TabButton>
        {!over && (
          <TabButton id={`${id}-f`} panel={`${id}-pf`} on={shown === 'focus'} onClick={() => setTab('focus')}>
            {BRAIN}
            <span>{t('life.tab.focusNone')}</span>
          </TabButton>
        )}
      </div>
    </section>
  );
}

/** Мозг схематично (холст 17.11): контур двух полушарий и средняя линия, в стиле книжки журнала. */
const BRAIN = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
    <path d="M12 5.2C10.9 3.6 8.4 3.5 7.3 5.2 5.2 5.1 3.9 7 4.6 8.9 3 10 2.9 12.6 4.4 13.7 3.8 15.9 5.3 18 7.5 17.9 8.4 19.9 10.9 20.3 12 18.7 13.1 20.3 15.6 19.9 16.5 17.9 18.7 18 20.2 15.9 19.6 13.7 21.1 12.6 21 10 19.4 8.9 20.1 7 18.8 5.1 16.7 5.2 15.6 3.5 13.1 3.6 12 5.2Z" />
    <path d="M12 5.2V18.7" />
  </svg>
);

function TabButton({ id, panel, on, onClick, children }: { id: string; panel: string; on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" id={id} aria-controls={panel} aria-selected={on} tabIndex={on ? 0 : -1} className={`lb__tab ${on ? 'is-on' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

// ---- Дневник ----

function JournalList({ id, tab, journal, offset, freshFrom, reduced, lifeSeq, over }: {
  id: string; tab: string; journal: JournalEntryVM[]; offset: number; freshFrom: number; reduced: boolean; lifeSeq: number; over: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (over) scrollRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [over, reduced]);
  const [limit, setLimit] = useState({ seq: lifeSeq, n: PAGE });
  const n = limit.seq === lifeSeq ? limit.n : PAGE;
  const total = journal.length;
  const from = Math.max(0, total - n);
  const items: { e: JournalEntryVM; abs: number }[] = [];
  for (let i = total - 1; i >= from; i--) items.push({ e: journal[i]!, abs: offset + i });
  return (
    <div ref={scrollRef} id={id} className="lb__scroll" role="tabpanel" aria-labelledby={tab} tabIndex={0}>
      {total === 0 && <p className="lb__empty">{t('life.journalEmpty')}</p>}
      <ol className="lc" aria-label={t('life.newestFirst')}>
        {items.map(({ e, abs }) => <Card key={abs} e={e} fresh={!reduced && abs >= freshFrom} />)}
      </ol>
      {from > 0 && (
        <button type="button" className="lb__more" onClick={() => setLimit({ seq: lifeSeq, n: n + PAGE })}>
          {t('life.showEarlier', { count: from })}
        </button>
      )}
    </div>
  );
}

const Card = memo(function Card({ e, fresh }: { e: JournalEntryVM; fresh: boolean }) {
  const dec = e.kind === 'dec';
  return (
    <li className={`lc__card${dec ? ' is-dec' : ''}${fresh ? ' is-new' : ''}`}>
      <span className="lc__cap">
        <small>{t('life.card.age')}</small>
        <b>{e.age}</b>
      </span>
      <span className="lc__body">
        <span className="lc__text">{dec && e.question ? `${e.question} · ${e.text}` : e.text}</span>
        {e.fact && <span className="lc__src">{e.fact}</span>}
        <FxChips fx={e.fx} className="lc__fx" />
      </span>
    </li>
  );
});

// ---- Фокус ----

/** Подпись кнопки «Выбрать» подгоняется под кнопку 85 px: длинное слово — мельче. */
const btnFit = (label: string) => (label.length > 9 ? ' is-xs' : label.length > 7 ? ' is-s' : '');

function FocusList({ id, tab, life, enabled }: { id: string; tab: string; life: LifeVM; enabled: boolean }) {
  const adapter = useAdapter();
  const opts = life.focus.options;
  // Прошлый фокус: его плашка опускается с приседанием (.was). Пружинка и приседание — только после выбора игроком
  // (is-live), а не при входе на вкладку.
  const [live, setLive] = useState<{ prev: string | null } | null>(null);
  const pick = (key: string) => {
    const now = adapter.getSnapshot();
    if (!enabled || now.lifePhase !== 'life' || !now.life || now.life.focus.current === key) return;
    setLive({ prev: now.life.focus.current });
    adapter.setFocus(gestureId(), key);
  };
  const make = t('life.focus.make');
  return (
    <div id={id} className="lb__scroll" role="tabpanel" aria-labelledby={tab} tabIndex={0}>
      {opts.length ? (
        <ol className={`lfc${live ? ' is-live' : ''}`} aria-label={t('activities.focus.title')}>
          {opts.map(o => {
            const on = life.focus.current === o.k;
            const was = !on && !!live && live.prev === o.k;
            return (
              <li key={o.k} className={`lfc__row${on ? ' is-on' : ''}${was ? ' was' : ''}`} title={o.desc}>
                <span className="lfc__main">
                  <b className="lfc__name">{o.name}</b>
                  <FxArrows fx={o.fx} />
                </span>
                {on ? (
                  <button type="button" className="lfc__btn lfc__btn--on" disabled aria-pressed="true">
                    {t('life.focus.on')}
                  </button>
                ) : (
                  <button type="button" className={`lfc__btn${btnFit(make)}`} disabled={!enabled} aria-label={t('life.focus.makeAria', { name: o.name })} onClick={() => pick(o.k)}>
                    <span className="k-os">{make}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="lb__empty">{t('life.focusFamily')}</p>
      )}
    </div>
  );
}
