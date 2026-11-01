// Панель показателей: четыре полосы оригинала (S.st) и три плашки —
// возраст, чистые активы, текущее положение (statusLine / jobNow).
import { t } from '../../../i18n';
import type { LifeVM } from '../../../adapters/viewModels';
import { StatMeter, type StatKey } from '../../../ui/components';
import { FaceGlyph, NoteGlyph } from './lifeIcons';

export type StatFlash = { id: number; d: Partial<Record<StatKey, number>> };
const KEYS: StatKey[] = ['hl', 'h', 'sm', 'so'];

/** Короткая подпись положения: выделенная часть statusLine, иначе работа, иначе первая часть строки. */
function shortStatus(life: LifeVM): { short: string; full: string } {
  const full = life.status.map(s => s.text).join('').trim();
  const strong = life.status.find(s => s.strong)?.text.trim();
  const first = full.split(' · ')[0]?.trim() ?? '';
  return { short: strong || life.job || first || full, full: full || life.job };
}

export function StatsPanel({ life, k, flash }: { life: LifeVM; k: number; flash: StatFlash | null }) {
  // Оригинал показывает чистые активы только с 15 лет («—» раньше; renderStats, 201107-201116).
  const nwShown = life.age >= 15;
  const st = shortStatus(life);
  return (
    <section className="lt-stats" aria-label={t('life.stats', { name: life.given })}>
      <div className="lt-stats__meters">
        {KEYS.map(key => (
          <StatMeter key={key} k={key} label={t(`stat.${key}`)} value={life.stats[key]} progress={k} delta={flash?.d[key] ?? null} />
        ))}
      </div>
      <div className="lt-stats__chips">
        <p className="lt-chip">
          <FaceGlyph />
          <span>{t('life.chipAge', { age: life.age })}</span>
        </p>
        <p className="lt-chip">
          <NoteGlyph />
          <span className="sr-only">{nwShown ? t('life.netWorth', { value: life.netWorth }) : t('life.netWorthChild')}</span>
          <span className="lt-chip__text tabular" aria-hidden="true">{nwShown ? life.netWorth : '—'}</span>
        </p>
        <p className="lt-chip lt-chip--status" title={st.full}>
          <span className="lt-chip__dot" aria-hidden="true" />
          <span className="sr-only">{t('life.now', { status: st.full || st.short })}</span>
          <span className="lt-chip__text" aria-hidden="true">{st.short}</span>
        </p>
      </div>
    </section>
  );
}
