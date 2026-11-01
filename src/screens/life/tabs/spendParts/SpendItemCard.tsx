// Пункт листа «Spend & invest»: карточка-кнопка (пункт без вариантов) или карточка
// с кнопками вариантов. Недоступное — «запертым» рядом макета с причиной оригинала.
// Цена, «в долг», доступность и текст подтверждения — из SpendView (оригинал).
import type { SpendItem, SpendOption } from '../../../../adapters/vm/spend';
import { ChevronIcon } from '../../../../ui/icons';
import { LockSmall, NoteIcon } from './spendIcons';

/** Выбор игрока: ключ покупки и всё, что нужно окну подтверждения. */
export type SpendPick = { key: string; itemName: string; optionName: string | null; price: string; credit: boolean; confirm: string | null };

export type CostLabels = { free: string; credit: string; noMoney: string };

export function Cost({ price, credit, labels }: { price: string; credit: boolean; labels: CostLabels }) {
  const gain = price.startsWith('+');
  return (
    <>
      <span className={`spd-cost tabular ${gain ? 'is-gain' : ''}`}><NoteIcon />{price || labels.free}</span>
      {credit && <span className="spd-credit">{labels.credit}</span>}
    </>
  );
}

function pickOf(item: SpendItem, opt: SpendOption | null): SpendPick {
  return opt
    ? { key: opt.key, itemName: item.name, optionName: opt.name, price: opt.price, credit: opt.credit, confirm: opt.confirm }
    : { key: item.key ?? item.id, itemName: item.name, optionName: null, price: item.price, credit: item.credit, confirm: item.confirm };
}

export function SpendItemCard({ item, labels, disabled, onPick }: { item: SpendItem; labels: CostLabels; disabled: boolean; onPick(p: SpendPick): void }) {
  const why = item.avail ? '' : item.why || (item.options.length ? '' : labels.noMoney);

  if (item.options.length === 0) {
    if (!item.avail || !item.key) {
      return (
        <li className="spd-card is-locked">
          <span className="spd-card__name">{item.name}</span>
          {item.desc && <span className="spd-card__desc">{item.desc}</span>}
          <span className="spd-card__chips"><Cost price={item.price} credit={false} labels={labels} /></span>
          {why && <span className="spd-why"><LockSmall />{why}</span>}
        </li>
      );
    }
    return (
      <li>
        <button type="button" className="spd-card spd-card--btn" disabled={disabled} onClick={() => onPick(pickOf(item, null))}>
          <span className="spd-card__main">
            <span className="spd-card__name">{item.name}</span>
            {item.desc && <span className="spd-card__desc">{item.desc}</span>}
            <span className="spd-card__chips"><Cost price={item.price} credit={item.credit} labels={labels} /></span>
          </span>
          <span className="spd-card__go"><ChevronIcon size={14} /></span>
        </button>
      </li>
    );
  }

  // Как в оригинале: группа «выключена», если ни один вариант недоступен;
  // каждый вариант доступен по своему avail.
  const off = !item.options.some(o => o.avail);
  return (
    <li className={`spd-card ${off ? 'is-locked' : ''}`}>
      <span className="spd-card__name">{item.name}</span>
      {item.desc && <span className="spd-card__desc">{item.desc}</span>}
      {why && <span className="spd-why"><LockSmall />{why}</span>}
      <span className="spd-opts" role="group" aria-label={item.name}>
        {item.options.map(o => (
          <button key={o.key} type="button" className="spd-opt" disabled={disabled || !o.avail} onClick={() => onPick(pickOf(item, o))}>
            <span className="spd-opt__name">{o.name}</span>
            <span className="spd-opt__cost"><Cost price={o.price} credit={o.credit} labels={labels} /></span>
          </button>
        ))}
      </span>
    </li>
  );
}
