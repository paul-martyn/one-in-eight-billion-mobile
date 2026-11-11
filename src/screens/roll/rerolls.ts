// Перебросы рождения (мета-слой, макет RollCute): три бесплатных на каждую купленную
// жизнь, дальше — за рекламу. Рекламы пока нет, поэтому переброс «за рекламу» тоже
// работает бесплатно (решение 11 ноября 2026); значок AD остаётся. Счётчик живёт
// до перезагрузки страницы и обновляется, когда жизнь начинается за энергию.
import { useSyncExternalStore } from 'react';

export const FREE_REROLLS = 3;
let left = FREE_REROLLS;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const rerollsLeft = () => left;
/** Новая жизнь за энергию: снова три бесплатных переброса. */
export function resetRerolls(): void { if (left !== FREE_REROLLS) { left = FREE_REROLLS; emit(); } }
/** Переброс сделан. */
export function spendReroll(): void { if (left > 0) { left -= 1; emit(); } }
export function useRerolls(): number {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, rerollsLeft, rerollsLeft);
}
