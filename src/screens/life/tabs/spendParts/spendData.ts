// Данные раздела «Spend & invest» для вкладок Activities и Money.
// Стабильные builders модуля для useCoreView: лист оригинала (spendView) плюс две
// подписи самого листа, которых нет в SpendView, — переводом оригинала по его
// корейскому ключу (openShop, game.en.js 208744): «무료» у бесплатного пункта и
// «돈이 모자라요» у недоступного пункта без причины.
import type { Top } from '../../../../adapters/commands';
import { plain } from '../../../../adapters/text';
import { spendView, type SpendTab, type SpendView } from '../../../../adapters/vm/spend';

export type SpendData = {
  view: SpendView;
  /** «Free» — цена пункта без стоимости. */
  free: string;
  /** «Not enough money» — недоступный пункт без указанной причины. */
  noMoney: string;
};

const L1 = (T: Top, s: string): string => plain(T.L(Object.assign([s], { raw: [s] })));

function spendData(T: Top, tab: SpendTab): SpendData | null {
  const view = spendView(T, tab);
  if (!view) return null;
  return { view, free: L1(T, '무료'), noMoney: L1(T, '돈이 모자라요') };
}

export const activitiesSpend = (T: Top) => spendData(T, 'activities');
export const moneySpend = (T: Top) => spendData(T, 'money');
