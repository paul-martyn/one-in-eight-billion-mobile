// «Country»: строки countryRows оригинала. Шесть главных — плитками, остальные — списком.
// Если человек переехал, есть переключатель «страна рождения / страна, где живёт» (как #ctySwitch).
import { useState } from 'react';
import type { OddsCountryVM } from '../../../../adapters/vm/odds';
import { t } from '../../../../i18n';
import { countText, useEnterProgress } from './enter';

function titleOf(c: OddsCountryVM): string {
  if (c.year == null) return t('odds.tab.country.title', { country: c.country });
  return t(c.projection ? 'odds.tab.country.titleProjection' : 'odds.tab.country.titleYear', { country: c.country, year: c.year });
}

function CountryBody({ c }: { c: OddsCountryVM }) {
  const k = useEnterProgress();
  return (
    <>
      <h2 className="odds-section__title">{titleOf(c)}</h2>
      <div className="odds-tiles odds-tiles--country">
        {c.tiles.map(r => (
          <div key={r.label} className="odds-tile">
            <span className="odds-tile__value tabular">{countText(r.value, k)}</span>
            <span className="odds-tile__label">{r.label}</span>
          </div>
        ))}
      </div>
      {c.rows.length ? (
        <>
          <h3 className="odds-sub">{t('odds.tab.country.more')}</h3>
          <dl className="odds-rows">
            {c.rows.map(r => (
              <div key={r.label} className="odds-rows__row">
                <dt>{r.label}</dt>
                <dd className="tabular">{r.value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </>
  );
}

export function CountrySection({ countries }: { countries: OddsCountryVM[] }) {
  const [which, setWhich] = useState<'born' | 'current'>('born');
  const c = countries.find(x => x.key === which) ?? countries[0];
  if (!c) return null;
  return (
    <section className="oat-card odds-section" aria-label={t('odds.tab.sec.country')}>
      {countries.length > 1 ? (
        <div className="odds-switch" role="group" aria-label={t('odds.tab.country.switch')}>
          {countries.map(x => (
            <button key={x.key} type="button" className="odds-seg" aria-pressed={x.key === c.key} onClick={() => setWhich(x.key)}>
              <span className="odds-seg__label">{t(x.key === 'born' ? 'odds.tab.country.born' : 'odds.tab.country.current', { country: x.country })}</span>
            </button>
          ))}
        </div>
      ) : null}
      <CountryBody key={c.key} c={c} />
      <p className="oat-note odds-section__note">{t('odds.tab.country.note')}</p>
    </section>
  );
}
