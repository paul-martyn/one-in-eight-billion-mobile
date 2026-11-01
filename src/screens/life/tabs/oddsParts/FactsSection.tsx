// «Facts»: справки (fact), встреченные в журнале жизни, новые сверху.
// В оригинале у записи есть только возраст (и через год рождения — год); месяца нет.
import { useMemo, useState } from 'react';
import type { JournalEntryVM } from '../../../../adapters/viewModels';
import { t } from '../../../../i18n';

const PAGE = 20;

export function FactsSection({ journal }: { journal: JournalEntryVM[] }) {
  const facts = useMemo(() => journal.filter(e => e.fact).reverse(), [journal]);
  const [shown, setShown] = useState(PAGE);
  return (
    <section className="odds-section odds-section--bare" aria-label={t('odds.tab.sec.facts')}>
      {facts.length === 0 ? (
        <p className="oat-card odds-lives__empty">{t('odds.tab.facts.empty')}</p>
      ) : (
        <ul className="odds-facts">
          {facts.slice(0, shown).map(e => (
            <li key={e.i} className="odds-fact">
              <span className="odds-fact__text">{e.fact}</span>
              <span className="oat-tag odds-fact__tag tabular">{e.year != null ? t('odds.tab.facts.metYear', { age: e.age, year: e.year }) : t('odds.tab.facts.met', { age: e.age })}</span>
              {e.text ? <span className="odds-fact__from">{e.text}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {facts.length > shown ? (
        <button type="button" className="oat-more" onClick={() => setShown(n => n + PAGE)}>{t('odds.tab.facts.more', { n: Math.min(PAGE, facts.length - shown) })}</button>
      ) : null}
      <p className="oat-note">{facts.length ? t('odds.tab.facts.noteCount', { n: facts.length }) : t('odds.tab.facts.note')}</p>
    </section>
  );
}
