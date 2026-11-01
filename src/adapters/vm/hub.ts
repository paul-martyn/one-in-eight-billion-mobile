// Данные «Since you opened» для экранов Start и Hub. Только чтение констант
// оригинала (запускается в песочнице adapter.view).
import type { Top } from '../commands';

export type WorldRatesVM = { birthsPerSec: number; deathsPerSec: number; approximate: boolean };

/**
 * Скорости счётчиков, как в tickCounters (game.en.js 199715-199724):
 * рождения = TOTAL_BIRTHS / SEC_YEAR × 1.005, смерти = DEATHS_PER_YEAR / SEC_YEAR.
 */
export function worldRates(T: Top): WorldRatesVM {
  return {
    birthsPerSec: (Number(T.TOTAL_BIRTHS) / Number(T.SEC_YEAR)) * 1.005,
    deathsPerSec: Number(T.DEATHS_PER_YEAR) / Number(T.SEC_YEAR),
    approximate: false,
  };
}

/**
 * Запасной вариант, пока у core нет жизни: adapter.view() возвращает null без S,
 * поэтому константы оригинала прочитать нельзя. Значения — приближённые мировые
 * средние из комментария макета (StartCute.dc.html: «About 4.2 births and 2 deaths
 * every second worldwide»); оригинал даёт ≈4,20 и ≈1,96 в секунду.
 */
export const APPROX_WORLD_RATES: WorldRatesVM = { birthsPerSec: 4.2, deathsPerSec: 2, approximate: true };
