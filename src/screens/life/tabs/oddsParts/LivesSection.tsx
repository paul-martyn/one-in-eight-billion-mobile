// «Other lives»: четыре жизни, начатые в ту же секунду (S.comps). Строка статуса —
// compStatus оригинала на текущий возраст; в раскрытой карточке — смена статусов по
// прожитым годам. Будущее не показывается. Сравнения показателей макета (полосы
// «You 73 / Chen 84») в оригинале нет: у сопутствующих жизней хранятся только
// годовые строки статуса и итог.
import { useId, useState } from 'react';
import type { CompanionVM } from '../../../../adapters/viewModels';
import { companionAppearances, type PersonLook } from '../../../../adapters/vm/appearance';
import type { OddsHistoryStep } from '../../../../adapters/vm/odds';
import { t } from '../../../../i18n';
import { useSharedCoreView } from '../../../../ui/people/hooks';
import { PersonPortrait } from '../../../../ui/people/PersonArt';

const AVATAR_BG = ['#e6dcff', '#ffd2c8', '#cdeaf6', '#d6f0de'];

function Dots({ q }: { q: number }) {
  return (
    <span className="odds-dots" role="img" aria-label={t('odds.tab.lives.fifth', { q })}>
      {[1, 2, 3, 4, 5].map(i => <span key={i} className={`odds-dots__dot ${i <= q ? 'is-on' : ''}`} />)}
    </span>
  );
}

const range = (s: OddsHistoryStep) => (s.from === s.to ? String(s.from) : `${s.from}–${s.to}`);

function LifeCard({ c, i, age, history, open, onToggle, look }: { c: CompanionVM; i: number; age: number; history: OddsHistoryStep[]; open: boolean; onToggle: () => void; look: PersonLook | null }) {
  const panel = useId();
  const initial = (c.given || c.name).trim().charAt(0).toLocaleUpperCase();
  const steps = history.filter(s => !s.died);
  return (
    <div className={`odds-life ${c.died ? 'is-gone' : ''}`}>
      <button type="button" className="odds-life__head" aria-expanded={open} aria-controls={open ? panel : undefined} onClick={onToggle}>
        <span className="odds-life__avatar k-os" style={{ background: AVATAR_BG[i % AVATAR_BG.length] }} aria-hidden="true"><PersonPortrait look={look} fallback={initial} /></span>
        <span className="odds-life__id">
          <span className="odds-life__name">{c.name}</span>
          <span className="odds-life__meta">{t(c.sex === 'F' ? 'odds.tab.lives.girl' : 'odds.tab.lives.boy')} · {c.place}</span>
          <span className="odds-life__now">
            {c.died ? <span>† {c.status}</span> : <><b>{t('odds.tab.lives.at', { age })}</b> {c.status}</>}
          </span>
        </span>
        <span className="odds-life__side">
          {c.quintile ? <Dots q={c.quintile} /> : null}
          <span className="odds-life__mark" aria-hidden="true">{open ? '−' : '+'}</span>
        </span>
      </button>
      {open ? (
        <div className="odds-life__panel" id={panel}>
          <p className="odds-life__heading">{t('odds.tab.lives.years', { name: c.given || c.name })}</p>
          <ol className="odds-years">
            {steps.map(s => (
              <li key={s.from} className="odds-years__row">
                <span className="oat-tag tabular">{t('odds.tab.lives.ages', { ages: range(s) })}</span>
                <span className="odds-years__text">{s.status}</span>
              </li>
            ))}
          </ol>
          {c.family ? <p className="odds-life__family">{t('odds.tab.lives.family', { family: c.family })}</p> : null}
          <p className="oat-note odds-life__foot">{c.died && c.deathAge != null ? t('odds.tab.lives.ended', { age: c.deathAge }) : t('odds.tab.lives.goesOn')}</p>
        </div>
      ) : null}
    </div>
  );
}

export function LivesSection({ companions, history, age, ready }: { companions: CompanionVM[]; history: OddsHistoryStep[][]; age: number; ready: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  // Внешность — из генератора персонажей (пол, возраст и кожа по стране рождения; src/adapters/vm/appearance.ts).
  const looks = useSharedCoreView(companionAppearances);
  return (
    <section className="odds-section odds-section--bare" aria-label={t('odds.tab.sec.lives')}>
      <p className="odds-lives__intro"><b>{t('odds.sameSecond')}.</b> {t('odds.sameSecondNote')}</p>
      {!ready ? (
        <p className="oat-card odds-lives__empty">{t('odds.pending')}</p>
      ) : companions.length === 0 ? (
        <p className="oat-card odds-lives__empty">{t('odds.tab.lives.none')}</p>
      ) : (
        <div className="odds-lives">
          {companions.map((c, i) => (
            <LifeCard key={`${c.name}-${i}`} c={c} i={i} age={age} history={history[i] ?? []} open={open === i} onToggle={() => setOpen(o => (o === i ? null : i))} look={looks?.[i] ?? null} />
          ))}
        </div>
      )}
      {ready && companions.length ? <p className="oat-note">{t('odds.wealthDots')}</p> : null}
    </section>
  );
}
