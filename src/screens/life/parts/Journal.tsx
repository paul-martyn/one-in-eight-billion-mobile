// Блок под плашками (холст LiveCute v411, 17.11): лист и под ним две вкладки по центру — «Журнал» и «Фокус»
// (одно слово, постоянная подпись; значки книжки и мозга). Список у краёв листа мягко растворяется.
// Дневник: записи S.log (через снимок адаптера), новые сверху, карточками концепции В2 (18.11, см. ниже). Выборов
// внутри дневника нет — решения открываются окном.
// Фокус: варианты фокуса движка для стадии жизни (focusOptions) «плашками выбора» дизайн-кода (DcChoice): название,
// строка статов словами со стрелками (FOCUS[k].e) и кнопка «Выбрать»; у текущего — нажатая «В фокусе», плашка
// поднята. Выбор — через адаптер (setFocus), как и раньше.
// Показываются последние 120 записей; более ранние — по кнопке.
import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter } from '../../../adapters/useGame';
import type { JournalEntryVM, LifeVM } from '../../../adapters/viewModels';
import { FxArrows, FxChips, MoneyChip, STAT_PATH } from './StatChips';

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
    <section className={`lb${shown === 'journal' ? ' lb--journal' : ''}`} aria-label={t('life.tabs')}>
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
// Карточки (холст «Жизнь · шаги», концепция В2, вид 3 — 18.11): белая карточка с мягкой тенью на светло-сером листе.
// Шапка: «15 лет» слева и вид записи справа (у обычного события метки нет). Решение и его последствие — одна карточка:
// вопрос, «→ ответ», за пунктиром — что из этого вышло. Деньги — значком в ряду статов; покупка — «чек» (что и за
// сколько); итог года по деньгам — строками «статья — сумма»; статистика (источник) — внизу, приглушённо, за пунктиром.
// Потеря и конец жизни — приглушённым тоном карточки.

/** Элемент ленты: запись и (у решения) её последствие — следующая запись того же года с флагом «ваш выбор». */
type Item = { e: JournalEntryVM; abs: number; out: JournalEntryVM | null; fresh: boolean };

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
  const items: Item[] = [];
  for (let i = total - 1; i >= from; i--) {
    const e = journal[i]!, abs = offset + i, fresh = !reduced && abs >= freshFrom;
    const prev = items[items.length - 1];
    // Новые сверху: последствие записано после решения и стоит над ним — забираем его в карточку решения.
    if (e.kind === 'dec' && prev && !prev.out && prev.e.out && prev.e.age === e.age) {
      items[items.length - 1] = { e, abs, out: prev.e, fresh: fresh || prev.fresh };
    } else items.push({ e, abs, out: null, fresh });
  }
  // Место чтения не прыгает: если игрок отлистал вниз, а сверху пришли новые записи, первая видимая карточка остаётся на
  // своём месте (свой расчёт вместо scroll anchoring браузера — в Safari его нет; у списка overflow-anchor: none). Высоту
  // ленты сравнивать нельзя: в ленте последние 120 записей, и снизу при этом уходит самая старая.
  const topKey = items[0]?.abs ?? -1;
  const anchor = useRef<{ top: number; key: string; dy: number } | null>(null);
  useLayoutEffect(() => {
    const s = scrollRef.current;
    if (!s) return;
    const a = anchor.current;
    if (a && topKey > a.top && s.scrollTop > 4) {
      const el = s.querySelector<HTMLElement>(`[data-k="${a.key}"]`);
      if (el) s.scrollTop = el.offsetTop - a.dy;
    }
    anchor.current = readAnchor(s, topKey);
  });
  useEffect(() => {
    const s = scrollRef.current;
    if (!s) return;
    const onScroll = () => { anchor.current = readAnchor(s, anchor.current?.top ?? topKey); };
    s.addEventListener('scroll', onScroll, { passive: true });
    return () => s.removeEventListener('scroll', onScroll);
  }, [topKey]);
  return (
    <>
      <div ref={scrollRef} id={id} className="lb__scroll lb__scroll--journal" role="tabpanel" aria-labelledby={tab} tabIndex={0}>
        <div className="lb__content">
          {total === 0 && <p className="lb__empty">{t('life.journalEmpty')}</p>}
          <ol className="lc" aria-label={t('life.newestFirst')}>
            {items.map(({ e, abs, out, fresh }) => <Card key={abs} k={abs} e={e} out={out} fresh={fresh} />)}
          </ol>
          {from > 0 && (
            <button type="button" className="lb__more" onClick={() => setLimit({ seq: lifeSeq, n: n + PAGE })}>
              {t('life.showEarlier', { count: from })}
            </button>
          )}
        </div>
      </div>
      <ScrollRail el={scrollRef} />
    </>
  );
}

/** Первая видимая карточка ленты и её расстояние от верха видимой части. */
function readAnchor(s: HTMLElement, top: number): { top: number; key: string; dy: number } | null {
  for (const el of s.querySelectorAll<HTMLElement>('.lc__card')) {
    if (el.offsetTop + el.offsetHeight > s.scrollTop) return { top, key: el.dataset.k ?? '', dy: el.offsetTop - s.scrollTop };
  }
  return null;
}

/**
 * Свой ползунок прокрутки (на iPhone системной полосы нет — видна только во время прокрутки): дорожка в правом поле
 * листа и бегунок по доле видимого. Положение пишется прямо в стиль — без перерисовки React.
 */
function ScrollRail({ el }: { el: { current: HTMLDivElement | null } }) {
  const rail = useRef<HTMLSpanElement | null>(null);
  const thumb = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const s = el.current, r = rail.current, th = thumb.current;
    if (!s || !r || !th) return;
    const draw = () => {
      const H = s.scrollHeight, h = s.clientHeight;
      if (H <= h + 1) { r.style.visibility = 'hidden'; return; }
      r.style.visibility = 'visible';
      const track = r.clientHeight;
      const size = Math.max(36, (track * h) / H);
      th.style.height = `${size}px`;
      th.style.transform = `translateY(${((track - size) * s.scrollTop) / (H - h)}px)`;
    };
    draw();
    s.addEventListener('scroll', draw, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    ro?.observe(s);
    if (s.firstElementChild) ro?.observe(s.firstElementChild);
    return () => { s.removeEventListener('scroll', draw); ro?.disconnect(); };
  }, [el]);
  return <span ref={rail} className="lb__rail" aria-hidden="true"><span ref={thumb} className="lb__thumb" /></span>;
}

/** Вид записи для метки шапки; у обычного события метки нет. */
const kindOf = (e: JournalEntryVM, out: JournalEntryVM | null): string =>
  e.kind === 'dec' || out ? 'dec' : e.shop ? 'shop' : e.out ? 'out' : e.kind;
const KINDS = new Set(['warm', 'bad', 'big', 'dec', 'out', 'shop', 'ledger', 'ms', 'loss', 'note', 'comp', 'death']);
const ageLabel = (age: number) => (age > 0 ? t('life.cardAge', { count: age }) : t('life.cardAgeBaby'));

/** Текст записи, «чек» покупки, значки (статы и деньги) и статистика внизу. */
function EntryBody({ e }: { e: JournalEntryVM }) {
  return (
    <>
      {e.ledger ? (
        <>
          <span className="lc__text lc__text--head">{e.ledger.head}</span>
          {e.ledger.rows.length ? (
            <span className="lc__rows">
              {e.ledger.rows.map((r, j) => (
                <span key={j} className="lc__row"><span>{r.name}</span><b className={r.up ? 'is-up' : 'is-down'}>{r.v}</b></span>
              ))}
            </span>
          ) : null}
        </>
      ) : <span className="lc__text">{e.text}</span>}
      {e.buy ? (
        <span className="lc__buy">
          <BagGlyph />
          {e.buy.name ? <span className="lc__buy-name">{e.buy.name}</span> : null}
          {e.buy.price ? <MoneyChip money={e.buy.price} /> : null}
        </span>
      ) : null}
      <FxChips fx={e.fx} money={e.money} className="lc__fx" />
      {e.fact ? (
        <span className="lc__src">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V11M10 20V5M16 20v-6M21 20H3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <span>{e.fact}</span>
        </span>
      ) : null}
    </>
  );
}

const BagGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="lc__bag">
    <path d="M5 8h14l-1.2 12.2a1.6 1.6 0 0 1-1.6 1.4H7.8a1.6 1.6 0 0 1-1.6-1.4Z" fill="var(--color-cta)" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 10V6.5a3 3 0 0 1 6 0V10" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const Card = memo(function Card({ k, e, out, fresh }: { k: number; e: JournalEntryVM; out: JournalEntryVM | null; fresh: boolean }) {
  const kind = kindOf(e, out);
  const quiet = kind === 'loss' || kind === 'death';
  return (
    <li data-k={k} className={`lc__card${quiet ? ' is-quiet' : ''}${fresh ? ' is-new' : ''}`}>
      <span className="lc__head">
        <span className="lc__age">{ageLabel(e.age)}</span>
        {KINDS.has(kind) ? <span className={`lc__kind lc__kind--${kind}`}>{t(`life.kind.${kind}`)}</span> : null}
      </span>
      <span className="lc__body">
        {e.kind === 'dec' ? (
          <>
            {e.question ? <span className="lc__q">{e.question}</span> : null}
            <span className="lc__a"><b aria-hidden="true">→</b> {e.answer || e.text}</span>
            {out ? <span className="lc__res"><EntryBody e={out} /></span> : null}
          </>
        ) : <EntryBody e={e} />}
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
    <div ref={scrollRef} id={id} className="lb__scroll" role="tabpanel" aria-labelledby={tab} tabIndex={0}>
      <div className="lb__content">
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
    </div>
    <ScrollRail el={scrollRef} />
    </>
  );
}
