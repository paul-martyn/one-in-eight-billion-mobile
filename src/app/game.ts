// Один экземпляр адаптера на страницу: переживает StrictMode, перемонтирование
// экранов и поворот устройства.
import { GameAdapter } from '../adapters/gameAdapter.ts';
import { bootGameCore } from '../adapters/boot.ts';

/** Политика мобильной версии: темп жизни 10 или 30 минут (решение продукта 1 ноября 2026). */
export const PACE_CHOICES = [10, 30];
export const adapter = new GameAdapter({ paceChoices: PACE_CHOICES, defaultPace: 30 });
export const startBoot = () => adapter.boot(bootGameCore);
export const retryBoot = () => adapter.retry(bootGameCore);

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Только для ручной отладки в браузере разработчика.
  (window as unknown as { __game?: GameAdapter }).__game = adapter;
}
export const chooseCurrency = (id: string, key: string) => adapter.setCurrency(id, key, bootGameCore);
