// Журнал жизни: записи S.log (через снимок адаптера), новые сверху, по годам
// жизни «Age N · YEAR». У записей оригинала нет месяца — вместо месяца метка вида.
// Показываются последние 120 записей; более ранние — по кнопке.
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { t } from '../../../i18n';
import type { JournalEntryVM } from '../../../adapters/viewModels';
import { BookGlyph, kindStyle } from './lifeIcons';
import { fxColor, fxText } from './lifeHooks';

const PAGE = 120;
const KINDS = new Set(['ev', 'big', 'bad', 'warm', 'loss', 'death', 'ms', 'dec', 'note', 'comp', 'ledger', 'hist']);
const kindLabel = (kind: string) => t(`life.kind.${KINDS.has(kind) ? kind : 'ev'}`);

type Group = { age: number; year: number | null; items: { e: JournalEntryVM; abs: number }[] };

export function Journal({ journal, offset, freshFrom, reduced, lifeSeq, over = false }: {
  journal: JournalEntryVM[]; offset: number; freshFrom: number; reduced: boolean; lifeSeq: number;
  /** Жизнь закончилась: журнал возвращается к началу, где последняя запись. */
  over?: boolean;
}) {
  const headId = useId();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (over) scrollRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [over, reduced]);
  const [limit, setLimit] = useState({ seq: lifeSeq, n: PAGE });
  const n = limit.seq === lifeSeq ? limit.n : PAGE;
  const total = journal.length;
  const from = Math.max(0, total - n);
  const groups = useMemo(() => {
    const out: Group[] = [];
    for (let i = total - 1; i >= from; i--) {
      const e = journal[i]!;
      const g = out[out.length - 1];
      if (g && g.age === e.age) g.items.push({ e, abs: offset + i });
      else out.push({ age: e.age, year: e.year, items: [{ e, abs: offset + i }] });
    }
    return out;
  }, [journal, total, from, offset]);

  return (
    <section className="lj">
      <span className="lj__paper" aria-hidden="true" />
      <h2 className="lj__tab" id={headId}><BookGlyph />{t('life.journal')}</h2>
      <div ref={scrollRef} className="lj__scroll scroll" role="region" tabIndex={0} aria-labelledby={headId}>
        {total === 0 && <p className="lj__empty">{t('life.journalEmpty')}</p>}
        {groups.map(g => (
          <div className="lj__year" key={`a${g.age}`}>
            <h3 className="lj__head">
              <span aria-hidden="true" className="lj__rule" />
              {g.year != null ? t('life.ageYear', { age: g.age, year: g.year }) : t('life.age', { age: g.age })}
              <span aria-hidden="true" className="lj__rule" />
            </h3>
            <ol className="lj__list">
              {g.items.map(({ e, abs }) => <JournalItem key={abs} e={e} fresh={!reduced && abs >= freshFrom} />)}
            </ol>
          </div>
        ))}
        {from > 0 && (
          <button type="button" className="lj__more" onClick={() => setLimit({ seq: lifeSeq, n: n + PAGE })}>
            {t('life.showEarlier', { count: from })}
          </button>
        )}
      </div>
    </section>
  );
}

const JournalItem = memo(function JournalItem({ e, fresh }: { e: JournalEntryVM; fresh: boolean }) {
  const ks = kindStyle(e.kind);
  return (
    <li className={`lj__item lj--${KINDS.has(e.kind) ? e.kind : 'ev'}${e.mine ? ' is-mine' : ''}${fresh ? ' is-new' : ''}`}>
      <span className="lj__kind" style={{ background: ks.bg }} role="img" aria-label={e.mine && e.kind !== 'dec' ? `${kindLabel(e.kind)} · ${t('life.mine')}` : kindLabel(e.kind)}>
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">{ks.node}</svg>
      </span>
      <div className="lj__body">
        {e.kind === 'dec' && e.question && <p className="lj__q">{e.question}</p>}
        <p className="lj__text">{e.text}</p>
        {e.fact && <p className="lj__fact">{e.fact}</p>}
        {e.fx.length > 0 && (
          <ul className="lj__fx">
            {e.fx.map(f => (
              <li key={f.k} className="lj__fxchip"><span className="lj__fxdot" style={{ background: fxColor(f.k) }} aria-hidden="true" />{fxText(f.k, f.d)}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
});
