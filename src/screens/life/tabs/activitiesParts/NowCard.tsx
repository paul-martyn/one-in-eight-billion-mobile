// Карточка «Now»: строка статуса оригинала (statusLine) и выбор фокуса года
// (focusOptions / FOCUS / focusD, команда setFocus — как чип #focusChips, game.en.js:208415-208425).
import type { LifeVM } from '../../../../adapters/viewModels';
import type { ActivitiesVM } from '../../../../adapters/vm/activities';
import type { Segment } from '../../../../adapters/text';
import { t } from '../../../../i18n';
import { FocusIcon, NowIcon, focusStyle } from './focusIcons';

/** Выделенная часть statusLine — заголовок, остальное — подпись (без ведущих « · »). */
function splitStatus(status: Segment[]): { title: string; sub: string } {
  const strong = status.filter(s => s.strong).map(s => s.text.trim()).filter(Boolean);
  if (!strong.length) return { title: status.map(s => s.text).join('').trim(), sub: '' };
  const rest = status.filter(s => !s.strong).map(s => s.text).join('').replace(/^\s*·\s*/, '').replace(/\s*·\s*$/, '').trim();
  return { title: strong.join(' · '), sub: rest };
}

export function NowCard({ life, vm, disabled, onPick }: { life: LifeVM; vm: ActivitiesVM | null; disabled: boolean; onPick: (k: string) => void }) {
  const { title, sub } = splitStatus(life.status);
  const { options, current } = life.focus;
  const selected = options.find(o => o.k === current) ?? null;
  const cols = options.length <= 4 ? Math.max(1, options.length) : 3;
  const pct = (x: number) => Math.round(x * 100);
  return (
    <section className="oat-hero acts-now" aria-label={t('activities.now.label')}>
      <div className="acts-now__top">
        <NowIcon />
        <span className="acts-now__id">
          <span className="acts-now__eyebrow">{t('activities.now')}</span>
          <span className="acts-now__title">{title || '—'}</span>
          {sub ? <span className="acts-now__sub">{sub}</span> : null}
        </span>
      </div>

      {options.length === 0 ? (
        <p className="acts-baby">{vm?.babyNote ?? ''}</p>
      ) : (
        <>
          <p className="acts-label" id="acts-focus-label">{t('activities.focus.title')}</p>
          <div className="acts-focus" role="group" aria-labelledby="acts-focus-label" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {options.map(o => {
              const on = o.k === current;
              return (
                <button
                  key={o.k}
                  type="button"
                  className="acts-focus__tile"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => onPick(o.k)}
                >
                  <FocusIcon k={o.k} />
                  <span className="acts-focus__name">{o.name}</span>
                  <span className="sr-only">{`, ${o.desc}`}</span>
                </button>
              );
            })}
          </div>
          <p className="acts-effect" aria-live="polite">
            {selected ? (
              <span className="oat-chip"><span className="oat-chip__dot" style={{ background: focusStyle(selected.k).bg }} />{selected.desc}</span>
            ) : (
              <span>{t('activities.focus.none')}</span>
            )}
          </p>
          <p className="acts-hint">{t('activities.focus.note')}</p>
          {vm && vm.yearSoFar.length ? (
            <div className="acts-year">
              <p className="acts-year__head">
                <span className="acts-label acts-label--inline">{t('activities.year.title')}</span>
                <span className="acts-year__meta tabular">{t('activities.year.meta', { pct: pct(vm.yearDone) })}</span>
              </p>
              <div className="acts-year__bar" role="img" aria-label={vm.yearSoFar.map(s => t('activities.year.share', { name: s.name, pct: pct(s.share) })).join(', ')}>
                {vm.yearSoFar.map(s => <span key={s.k} className="acts-year__seg" style={{ flexGrow: s.share, background: focusStyle(s.k).bg }} />)}
              </div>
              <p className="acts-year__legend" aria-hidden="true">
                {vm.yearSoFar.map(s => (
                  <span key={s.k} className="oat-chip"><span className="oat-chip__dot" style={{ background: focusStyle(s.k).bg }} />{t('activities.year.share', { name: s.name, pct: pct(s.share) })}</span>
                ))}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
