// Значки статов по дизайн-коду (холст, страница «Дизайн-код», v350): у значка изменения сначала число, потом значок
// стата; цвет — по знаку (плюс зелёный, минус красный), стат узнаётся по значку, у значка обводка тёмным тоном своего
// цвета. Порядок всегда: здоровье → счастье → знания → отношения. Деньги — не стат: значков денег нет.
import type { Fx } from '../../../adapters/viewModels';
import type { StatKey } from '../../../ui/components';
import { fxText } from './lifeHooks';

/** Силуэты статов — те же, что большие значки наверху (один контур на значок). */
export const STAT_PATH: Record<StatKey, string> = {
  hl: 'M12 21.2C6.2 16.9 2.5 13.4 2.5 9.1 2.5 6 4.9 3.6 7.9 3.6c1.7 0 3.2.8 4.1 2.1.9-1.3 2.4-2.1 4.1-2.1 3 0 5.4 2.4 5.4 5.5 0 4.3-3.7 7.8-9.5 12.1Z',
  h: 'M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z',
  sm: 'M2.5 6.4c3.3-1.6 6.5-1.4 9.5.8 3-2.2 6.2-2.4 9.5-.8v12.7c-3.3-1.4-6.5-1.2-9.5.9-3-2.1-6.2-2.3-9.5-.9Z',
  so: 'M3.2 21.2 C3.2 17.17 5.22 14.28 8.18 12.97 Q9.57 12.36 8.48 11.06 A4.6 4.6 0 1 1 15.52 11.06 Q14.43 12.36 15.82 12.97 C18.78 14.28 20.8 17.17 20.8 21.2 Z',
};
const FILL: Record<StatKey, string> = { hl: 'var(--color-stat-health)', h: 'var(--color-stat-happiness)', sm: 'var(--color-stat-smarts)', so: 'var(--color-stat-ties)' };
const DARK: Record<StatKey, string> = { hl: 'var(--color-stat-health-dark)', h: 'var(--color-stat-joy-dark)', sm: 'var(--color-stat-mind-dark)', so: 'var(--color-stat-ties-dark)' };
const ORDER: StatKey[] = ['hl', 'h', 'sm', 'so'];

/**
 * Значок стата: обводка — слой под заливкой (так линия одной толщины у всех значков). line — цвет обводки:
 * в значках изменений — тёмный тон стата, в плашках фокуса — коричневый, как у больших значков.
 */
export function StatGlyph({ k, size = 16, line }: { k: StatKey; size?: number; line?: string }) {
  const stroke = line ?? DARK[k];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="sc-glyph">
      <path d={STAT_PATH[k]} fill={stroke} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={STAT_PATH[k]} fill={FILL[k]} />
    </svg>
  );
}

/** Ряд значков изменений («+3 ❤»): число и значок, цвет по знаку. */
export function FxChips({ fx, className = '' }: { fx: Fx; className?: string }) {
  const list = ORDER.flatMap(k => fx.filter(f => f.k === k && f.d !== 0));
  if (!list.length) return null;
  return (
    <ul className={`sc-row ${className}`}>
      {list.map(f => (
        <li key={f.k} className={`sc-chip ${f.d > 0 ? 'is-up' : 'is-down'}`} aria-label={fxText(f.k, f.d)}>
          <span aria-hidden="true">{f.d > 0 ? `+${f.d}` : `−${Math.abs(f.d)}`}</span>
          <StatGlyph k={f.k} />
        </li>
      ))}
    </ul>
  );
}
