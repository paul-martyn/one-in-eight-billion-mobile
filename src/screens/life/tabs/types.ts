// Общий контракт вкладок жизни (People, Activities, Money, Odds).
import type { Nav } from '../../../flow/FlowHost';
import type { LifeTab } from '../../../flow/flow';

export type TabProps = {
  /** Вкладка видима и принимает ввод. */
  active: boolean;
  nav: Nav;
  /** Переход на другую вкладку жизни (ссылки «Work ›», «Help your family ›»). */
  openTab(tab: LifeTab): void;
};
