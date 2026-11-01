// Вкладка «Odds» (OddsLife.dc.html, «8 · Odds»): жизнь против страны и мира.
// Все числа и тексты — из снимка адаптера и строителя src/adapters/vm/odds.ts
// (функции оригинала в песочнице). Время на вкладке не идёт.
import { useRef, useState, type KeyboardEvent } from 'react';
import { useCoreView, useSnapshot } from '../../../adapters/useGame';
import { oddsView } from '../../../adapters/vm/odds';
import { t } from '../../../i18n';
import type { TabProps } from './types';
import { TabShell } from './oddsParts/TabShell';
import { WhereYouStand } from './oddsParts/WhereYouStand';
import { SurvivalSection } from './oddsParts/SurvivalSection';
import { CountrySection } from './oddsParts/CountrySection';
import { LivesSection } from './oddsParts/LivesSection';
import { FactsSection } from './oddsParts/FactsSection';
import './odds.css';

type Section = 'survival' | 'country' | 'lives' | 'facts';
const SECTIONS: Section[] = ['survival', 'country', 'lives', 'facts'];
/** Выбранный раздел переживает переключение вкладок (вкладка размонтируется). Только UI. */
let lastSection: Section = 'survival';

export function OddsTab(_: TabProps) {
  const snap = useSnapshot();
  const vm = useCoreView(oddsView);
  const life = snap.life;
  const [section, setSection] = useState<Section>(lastSection);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const pick = (s: Section) => {
    if (s === section) return;
    lastSection = s;
    setSection(s);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SECTIONS.indexOf(section);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? SECTIONS.length - 1 : null;
    if (next == null) return;
    e.preventDefault();
    const n = (next + SECTIONS.length) % SECTIONS.length;
    const s = SECTIONS[n];
    if (!s) return;
    pick(s);
    tabs.current[n]?.focus();
  };

  const pill = life ? (life.year != null ? t('odds.tab.paused', { age: life.age, year: life.year }) : t('odds.tab.pausedAge', { age: life.age })) : null;

  if (!life || !vm) {
    return (
      <TabShell title={t('tab.odds')} pill={pill} className="odds-tab">
        <p className="oat__empty">{t('odds.tab.unavailable')}</p>
      </TabShell>
    );
  }

  return (
    <TabShell title={t('tab.odds')} pill={pill} className="odds-tab">
      <WhereYouStand vm={vm} />
      <div className="odds-switch odds-switch--sections" role="tablist" aria-label={t('odds.tab.sections')} onKeyDown={onKey}>
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            ref={el => { tabs.current[i] = el; }}
            id={`odds-tab-${s}`}
            type="button"
            role="tab"
            className={`odds-seg ${s === 'lives' ? 'odds-seg--wide' : ''}`}
            aria-selected={s === section}
            aria-controls={s === section ? `odds-panel-${s}` : undefined}
            tabIndex={s === section ? 0 : -1}
            onClick={() => pick(s)}
          >
            <span className="odds-seg__label">{t(`odds.tab.sec.${s}`)}</span>
          </button>
        ))}
      </div>
      <div id={`odds-panel-${section}`} role="tabpanel" aria-labelledby={`odds-tab-${section}`} className="odds-panel">
        {section === 'survival' && <SurvivalSection key="survival" vm={vm} />}
        {section === 'country' && <CountrySection key="country" countries={vm.countries} />}
        {section === 'lives' && <LivesSection key="lives" companions={life.companions} history={vm.companionHistory} age={life.age} ready={snap.companionsReady} />}
        {section === 'facts' && <FactsSection key="facts" journal={snap.journal} />}
      </div>
    </TabShell>
  );
}
