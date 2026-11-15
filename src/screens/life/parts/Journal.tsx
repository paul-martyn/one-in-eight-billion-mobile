// Блок под плашками (холст LiveCute v336–354): две вкладки на всю ширину — «Дневник жизни» и «Фокус: <текущий>».
// Дневник: записи S.log (через снимок адаптера), новые сверху, карточками (вариант F1, схема E): слева корешок
// «Возраст» над числом, справа текст одним стилем, подпись источника и значки изменений по знаку. Решение — карточка
// с пунктирной рамкой «вопрос · Решение: ответ». Выборов внутри дневника нет — решения открываются окном.
// Фокус: варианты фокуса движка для стадии жизни (focusOptions) строками действия: значок, название, значки
// изменений за год, кнопка «Сделать фокусом»; у текущего — нажатая «В фокусе», строка подсвечена.
// Показываются последние 120 записей; более ранние — по кнопке.
import { memo, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter } from '../../../adapters/useGame';
import type { JournalEntryVM, LifeVM } from '../../../adapters/viewModels';
import { FxChips, STAT_PATH, StatGlyph } from './StatChips';
import { WorkIcon } from './Plates';

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
  const focusName = life.focus.options.find(o => o.k === life.focus.current)?.name ?? '';
  return (
    <section className="lb" aria-label={t('life.tabs')}>
      <div className="lb__tabs" role="tablist" aria-label={t('life.tabs')}>
        <TabButton id={`${id}-j`} panel={`${id}-pj`} on={shown === 'journal'} onClick={() => setTab('journal')}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d={STAT_PATH.sm} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>
          <span>{t('life.journal')}</span>
        </TabButton>
        {!over && (
          <TabButton id={`${id}-f`} panel={`${id}-pf`} on={shown === 'focus'} onClick={() => setTab('focus')}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></svg>
            <span>{focusName ? t('life.tab.focus', { name: focusName }) : t('life.tab.focusNone')}</span>
          </TabButton>
        )}
      </div>
      <div className="lb__box">
        {shown === 'journal'
          ? <JournalList id={`${id}-pj`} tab={`${id}-j`} journal={journal} offset={offset} freshFrom={freshFrom} reduced={reduced} lifeSeq={lifeSeq} over={over} />
          : <FocusList id={`${id}-pf`} tab={`${id}-f`} life={life} enabled={enabled} />}
      </div>
    </section>
  );
}

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

const LINE = 'var(--color-ink)';
/** Значок в плашке: нарисован как значки статов — обводка слоем под заливкой. */
const twoLayer = (d: string, fill: string) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill={LINE} stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <path d={d} fill={fill} />
  </svg>
);
const HOUSE = 'M3.5 11.2 12 4l8.5 7.2V20a1 1 0 0 1-1 1h-4.8v-5.6H9.3V21H4.5a1 1 0 0 1-1-1Z';
const MOON = 'M19.5 15.2A8.6 8.6 0 0 1 8.8 4.5a8.6 8.6 0 1 0 10.7 10.7Z';
const TARGET = (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="var(--color-cta)" stroke={LINE} strokeWidth="1.5" />
    <circle cx="12" cy="12" r="4.6" fill="var(--color-white)" stroke={LINE} strokeWidth="1.5" />
    <circle cx="12" cy="12" r="1.5" fill={LINE} />
  </svg>
);
const CASH = (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.5" y="6.5" width="19" height="11" rx="2.2" fill="var(--color-cta-green)" stroke={LINE} strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.7" fill="#e1f1ce" stroke={LINE} strokeWidth="1.3" />
  </svg>
);
/** Значки фокусов (FOCUS оригинала). Школьные пять — как на холсте; остальные — по смыслу из тех же значков. */
const FOCUS_ICON: Record<string, ReactNode> = {
  study: <StatGlyph k="sm" size={24} line={LINE} />, learn: <StatGlyph k="sm" size={24} line={LINE} />, mind: <StatGlyph k="sm" size={24} line={LINE} />,
  play: <StatGlyph k="so" size={24} line={LINE} />, family: <StatGlyph k="so" size={24} line={LINE} />, faith: <StatGlyph k="so" size={24} line={LINE} />,
  sport: <StatGlyph k="hl" size={24} line={LINE} />, health: <StatGlyph k="hl" size={24} line={LINE} />,
  hobby: <StatGlyph k="h" size={24} line={LINE} />,
  help: twoLayer(HOUSE, 'var(--color-cta)'), rest: twoLayer(MOON, '#9fb2ff'),
  work: <WorkIcon />, career: <WorkIcon />, parttime: CASH, balance: TARGET,
};

function FocusList({ id, tab, life, enabled }: { id: string; tab: string; life: LifeVM; enabled: boolean }) {
  const adapter = useAdapter();
  const opts = life.focus.options;
  const pick = (key: string) => {
    const now = adapter.getSnapshot();
    if (!enabled || now.lifePhase !== 'life' || !now.life || now.life.focus.current === key) return;
    adapter.setFocus(gestureId(), key);
  };
  return (
    <div id={id} className="lb__scroll" role="tabpanel" aria-labelledby={tab} tabIndex={0}>
      {opts.length ? (
        <ol className="lf" aria-label={t('activities.focus.title')}>
          {opts.map(o => {
            const on = life.focus.current === o.k;
            return (
              <li key={o.k} className={`lf__row ${on ? 'is-on' : ''}`} title={o.desc}>
                <span className="lf__tile" aria-hidden="true">{FOCUS_ICON[o.k] ?? TARGET}</span>
                <span className="lf__main">
                  <b className="lf__name">{o.name}</b>
                  <FxChips fx={o.fx} />
                </span>
                {on ? (
                  <button type="button" className="lf__btn lf__btn--on" disabled aria-pressed="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    {t('life.focus.on')}
                  </button>
                ) : (
                  <button type="button" className="lf__btn" disabled={!enabled} aria-label={t('life.focus.makeAria', { name: o.name })} onClick={() => pick(o.k)}>
                    <span className="k-os">{t('life.focus.make')}</span>
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
