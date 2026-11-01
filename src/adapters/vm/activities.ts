// Вкладка «Activities»: то, что в оригинале есть рядом с выбором фокуса года
// (renderFocus, game.en.js:202323-202351). Только чтение, в песочнице адаптера.
//
// Сам выбор фокуса (варианты, описание, текущий) приходит в снимке (LifeVM.focus).
// Здесь — то, чего в снимке нет:
// - пояснение для младенца: renderFocus показывает его вместо чипов, когда
//   focusOptions() пуст; это шаблон L внутри функции, поэтому перевод берётся
//   тем же путём L0 по исходному корейскому ключу;
// - доля года, прожитая с каждым фокусом: S.fT (tick, 71555). endYear (72117-72121)
//   распределяет действие фокусов года пропорционально этим долям;
// - название листа «Spend & invest» оригинала (L`돈 쓰기 · 투자`) и shopCan() (208713).
//   Сам лист (shopItems) здесь НЕ строится: его построение тянет игровой RNG.
import type { Top } from '../commands';
import { plain } from '../text.ts';

// Исходные корейские шаблоны (ключи перевода оригинала). Массивы — как strings у тегового шаблона.
const KO_BABY = Object.freeze([
  '<span style="color:var(--ink3);font-size:13.5px">아직 아기입니다. 부모님이 키우는 중이에요. 어릴 적 일들이 쌓여 다섯 살 무렵 기질이 자리 잡고, 여섯 살부터 한 해의 초점을 고를 수 있습니다. 이 시기는 8× 배속으로 넘겨도 좋습니다.</span>',
]);
const KO_SHOP = Object.freeze(['돈 쓰기 · 투자']);

export type FocusShareVM = { k: string; name: string; share: number };
export type ActivitiesVM = {
  /** Пояснение оригинала, когда фокус выбирать ещё нельзя (младенец); иначе null. */
  babyNote: string | null;
  /** Как распределился уже прожитый год между фокусами (доли 0–1, сумма 1). */
  yearSoFar: FocusShareVM[];
  /** Доля текущего года, уже прожитая (S.t). */
  yearDone: number;
  /** Лист «Spend & invest» доступен в оригинале на этом этапе жизни. */
  shopOpen: boolean;
  shopLabel: string;
};

const tr = (T: Top, strings: readonly string[]): string => plain(T.L0(strings, []));

export function activitiesView(T: Top): ActivitiesVM {
  const S = T.S;
  const options: string[] = T.focusOptions();
  const fT = (S.fT || {}) as Record<string, number>;
  let total = 0;
  for (const k in fT) total += Number(fT[k]) || 0;
  const yearSoFar: FocusShareVM[] = total > 0
    ? Object.keys(fT)
      .filter(k => (Number(fT[k]) || 0) > 0 && T.FOCUS[k])
      .map(k => ({ k, name: plain(T.FOCUS[k].n), share: (Number(fT[k]) || 0) / total }))
      .sort((a, b) => b.share - a.share)
    : [];
  return {
    babyNote: options.length ? null : tr(T, KO_BABY),
    yearSoFar,
    yearDone: Math.max(0, Math.min(1, Number(S.t) || 0)),
    shopOpen: !!T.shopCan(),
    shopLabel: tr(T, KO_SHOP),
  };
}
