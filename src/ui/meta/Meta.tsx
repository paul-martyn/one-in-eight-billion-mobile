// Мета-слой мобильной версии в стиле HubCute: плашки энергии, долларов и
// кристаллов, цена новой жизни, кнопка «Be Born!» с ценой и строка ожидания
// энергии. Все значения — snapshot.meta (src/adapters/meta.ts); компоненты
// ничего не пересчитывают, кроме показа обратного отсчёта и «набегания» чисел.
// Кнопки «+» видны, но недоступны: покупок в этой версии нет.
import type { ButtonHTMLAttributes } from 'react';
import type { MetaView } from '../../adapters/meta';
import { t, formatNumber } from '../../i18n';
import { BanknotesBig, BoltBig, BoltSmall, GemBig, PlusGlyph } from './metaIcons';
import { fmtCountdown, useSecondsLeft } from './useMeta';
import './meta.css';

const NUM = { format: formatNumber };

/** «+» у плашки: показан по макету, но покупок нет (aria-disabled, подсказка). */
function PlusButton({ label }: { label: string }) {
  const note = t('hub.meta.notYet');
  return (
    <button type="button" className="meta-plus" aria-disabled="true" aria-label={t('hub.meta.plusLabel', { action: label, note })} title={note}>
      <PlusGlyph />
    </button>
  );
}

/** Энергия «n/max» (role=meter) и «+1 in mm:ss», пока она восстанавливается. */
export function EnergyPill({ meta, progress = 1 }: { meta: MetaView; progress?: number }) {
  const left = useSecondsLeft(meta.nextRefillAt);
  const shown = Math.round(meta.energy * progress);
  return (
    <div className="meta-slot" data-meta-slot="energy">
      <div
        className="meta-pill"
        role="meter"
        aria-label={t('hub.meta.energy')}
        aria-valuemin={0}
        aria-valuemax={meta.max}
        aria-valuenow={meta.energy}
        aria-valuetext={t('hub.meta.energyValue', { n: meta.energy, max: meta.max })}
      >
        <span className="k-os meta-pill__value" aria-hidden="true">{shown}/{meta.max}</span>
      </div>
      <BoltBig />
      <PlusButton label={t('hub.meta.getEnergy')} />
      {left != null && <span className="meta-refill">{t('hub.meta.refill', { time: fmtCountdown(left) })}</span>}
    </div>
  );
}

/**
 * Доллары или кристаллы: значение из снимка (награды за прожитые жизни).
 * shown — показываемое число во время «досчёта» после Claim (читалке всегда
 * говорится точное значение снимка); pop — плашка подпрыгивает при зачислении.
 */
export function CurrencyPill({ kind, value, progress = 1, shown, pop = false, bump = 0 }: { kind: 'dollars' | 'gems'; value: number; progress?: number; shown?: number; pop?: boolean; bump?: number }) {
  const display = NUM.format(Math.round(shown ?? value * progress));
  const exact = NUM.format(value);
  return (
    <div className={`meta-slot${pop ? ' meta-slot--pop' : bump ? (bump % 2 ? ' meta-slot--bump-a' : ' meta-slot--bump-b') : ''}`} data-meta-slot={kind}>
      <p className="meta-pill">
        <span className="sr-only">{t(kind === 'dollars' ? 'hub.meta.dollarsValue' : 'hub.meta.gemsValue', { n: exact })}</span>
        <span className="k-os meta-pill__value" aria-hidden="true">{display}</span>
      </p>
      {kind === 'dollars' ? <BanknotesBig /> : <GemBig />}
      <PlusButton label={t(kind === 'dollars' ? 'hub.meta.getDollars' : 'hub.meta.getGems')} />
    </div>
  );
}

/**
 * Ряд из трёх плашек верхней панели хаба. counts — показываемые доллары и
 * кристаллы, пока награда «долетает» и досчитывается (null — значения снимка);
 * pop — обе валютные плашки подпрыгивают. Цель полёта — [data-meta-slot] .meta-pill.
 * bump — сколько лиц поймано на планете: плашка вздрагивает при каждом новом.
 */
export function MetaBar({ meta, progress = 1, counts = null, pop = false, bump, className = '' }: {
  meta: MetaView; progress?: number; counts?: { dollars: number; gems: number } | null; pop?: boolean; bump?: { coin: number; gem: number }; className?: string;
}) {
  return (
    <div className={`meta-bar ${className}`} role="group" aria-label={t('hub.meta.bar')}>
      <EnergyPill meta={meta} progress={progress} />
      <CurrencyPill kind="dollars" value={meta.dollars} progress={progress} shown={counts?.dollars} pop={pop} bump={bump?.coin} />
      <CurrencyPill kind="gems" value={meta.gems} progress={progress} shown={counts?.gems} pop={pop} bump={bump?.gem} />
    </div>
  );
}

/** Формат чисел мета-слоя (как в плашках). */
export const fmtMeta = (n: number) => NUM.format(n);

/** Цена новой жизни: молния и число (для читалки — «costs n energy»). */
export function CostBadge({ cost }: { cost: number }) {
  return (
    <span className="meta-cost">
      <BoltSmall />
      <span aria-hidden="true">{cost}</span>
      <span className="sr-only">{t('hub.meta.cost', { n: cost })}</span>
    </span>
  );
}

/** Жёлтая кнопка новой жизни с ценой вместо стрелки (HubCute «Be Born!»). */
export function BornButton({ label, cost, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; cost: number | null }) {
  return (
    <button type="button" className={`chunky chunky--yellow meta-born ${className}`} {...rest}>
      <span className="k-o chunky__label">{label}</span>
      {cost != null && <CostBadge cost={cost} />}
    </button>
  );
}

/** Строка под недоступной кнопкой: когда появится следующая энергия. */
export function NoEnergyLine({ nextRefillAt, id, className = '' }: { nextRefillAt: number | null; id?: string; className?: string }) {
  const left = useSecondsLeft(nextRefillAt);
  return (
    <p className={`meta-wait ${className}`} id={id}>
      <BoltSmall size={16} />
      <span>{left == null ? t('hub.meta.noEnergy') : t('hub.meta.nextEnergy', { time: fmtCountdown(left) })}</span>
    </p>
  );
}
