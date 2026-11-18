// Значки статов по дизайн-коду (холст, страница «Дизайн-код», v350): у значка изменения сначала число, потом значок
// стата; цвет — по знаку (плюс зелёный, минус красный), стат узнаётся по значку, у значка обводка тёмным тоном своего
// цвета. Порядок всегда: здоровье → счастье → знания → отношения. Деньги — не стат: значков денег нет.
import { Fragment } from 'react';
import { t } from '../../../i18n';
import type { Fx, MoneyVM } from '../../../adapters/viewModels';
import type { StatKey } from '../../../ui/components';
import { fxText, STAT_LABEL } from './lifeHooks';
// Стрелки пользователя (холст 17.11, production-ui/icons/arrows v2): зелёная вверх, красная вниз.
import arrowUp from './arrows/arrow-up.png';
import arrowDown from './arrows/arrow-down.png';

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

/**
 * Строка фокуса (холст 17.11): куда ведёт стат за год — словами со стрелками, без чисел: «Счастье ↓ · Знания ↑↑».
 * ↑ / ↓ — на 1–2 в год, ↑↑ / ↓↓ — на 3 и больше (FOCUS[k].e движка). Порядок статов — как в дизайн-коде. Для экранного
 * диктора — те же изменения числом (скрытый текст), стрелки и слова скрыты.
 */
export function FxArrows({ fx }: { fx: Fx }) {
  const list = ORDER.flatMap(k => fx.filter(f => f.k === k && f.d !== 0));
  if (!list.length) return null;
  return (
    <span className="sa-line">
      <span className="sr-only">{list.map(f => fxText(f.k, f.d)).join(', ')}</span>
      {list.map((f, i) => (
        <Fragment key={f.k}>
          {/* Точка — отдельно от стата: при переносе остаётся в конце строки, стат целиком уходит на следующую. */}
          {i > 0 && <span className="sa-sep" aria-hidden="true">·</span>}
          <span className="sa-item" aria-hidden="true">
            <span>{t(STAT_LABEL[f.k])}</span>
            <span className="sa-arrows">
              {Array.from({ length: Math.abs(f.d) >= 3 ? 2 : 1 }, (_, j) => <img key={j} className="sa-arrow" src={f.d > 0 ? arrowUp : arrowDown} alt="" />)}
            </span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** Значок денег — банкноты, как на плашке денег под сценой. */
export const MoneyGlyph = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="sc-glyph">
    <rect x="5" y="4.5" width="16.5" height="10" rx="2" fill="#6fbf3a" stroke="var(--color-ink)" strokeWidth="1.5" />
    <rect x="2.5" y="9.5" width="16.5" height="10" rx="2" fill="var(--color-cta-green)" stroke="var(--color-ink)" strokeWidth="1.5" />
    <circle cx="10.75" cy="14.5" r="2.4" fill="#e1f1ce" stroke="var(--color-ink)" strokeWidth="1.3" />
  </svg>
);

/** Значок суммы денег («+3,1 Br» с банкнотами), цвет по знаку — как у значков статов (журнал, 18.11). */
export function MoneyChip({ money }: { money: MoneyVM }) {
  return (
    <span className={`sc-chip sc-chip--money ${money.up ? 'is-up' : 'is-down'}`} aria-label={t('life.card.money', { v: money.v })}>
      <span aria-hidden="true">{money.v}</span>
      <MoneyGlyph />
    </span>
  );
}

/** Ряд значков изменений («+3 ❤»): число и значок, цвет по знаку; в конце — деньги, если есть. */
export function FxChips({ fx, money = null, className = '' }: { fx: Fx; money?: MoneyVM | null; className?: string }) {
  const list = ORDER.flatMap(k => fx.filter(f => f.k === k && f.d !== 0));
  if (!list.length && !money) return null;
  return (
    <ul className={`sc-row ${className}`}>
      {list.map(f => (
        <li key={f.k} className={`sc-chip ${f.d > 0 ? 'is-up' : 'is-down'}`} aria-label={fxText(f.k, f.d)}>
          <span aria-hidden="true">{f.d > 0 ? `+${f.d}` : `−${Math.abs(f.d)}`}</span>
          <StatGlyph k={f.k} />
        </li>
      ))}
      {money ? <li className="sc-li"><MoneyChip money={money} /></li> : null}
    </ul>
  );
}
