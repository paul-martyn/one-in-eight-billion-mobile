// Данные экрана «2 · Birth roll». Страна рождения уже выбрана core в
// startNewLife; экран только повторяет результат. Только чтение полей и
// функций оригинала (запускается в песочнице useCoreView).
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type RollVM = {
  /** S.born — код страны рождения. */
  iso: string;
  /** placeTag(BB()) — страна (историческое название для жизней в прошлом). */
  country: string;
  /** Город (S.city) или сельская местность ruralLbl() — как поле «Place of birth» в showCert (game.en.js 200348). */
  place: string;
  urban: boolean;
  /** Полное место, как в CertificateVM.place: cityIn(B.ko, S.city) или «ruralLbl(), страна». */
  placeFull: string;
  /** fmtShare(share(BB())) — доля рождений (или населения в режиме pop). */
  share: string;
  /** Math.round(1 / share) — «примерно 1 из N», как в #certOdds (game.en.js 200390-200399). */
  shareOneIn: number;
  /** UI.prefs.mode === 'pop': доля считается по населению. */
  byPopulation: boolean;
  /** Год рождения для жизни в прошлом (S.era === 'past', как ветка #certOdds), иначе null. */
  pastYear: number | null;
  /** Координаты страны на глобусе из карты оригинала WORLD.at (приближённо, см. worldCellToLatLon). */
  coords: { lat: number; lon: number } | null;
  /**
   * Названия стран для декоративного мелькания и их доли рождений (как ролик
   * оригинала, 199836-199857, который показывал wpick(share)). В UI выбираются
   * через Math.random и на игру не влияют.
   */
  names: { name: string; w: number }[];
};

/**
 * Карта оригинала WORLD (156 × 66 клеток, game.en.js 55470) задаёт страну
 * точкой в клетках карты (WORLD.at[iso]), а не широтой и долготой. Проекция
 * карты в исходнике не указана. Константы ниже подобраны (2026-11-01) так,
 * чтобы маска суши WORLD.land совпала с маской суши глобуса
 * (src/ui/globe/land.ts) в проекции Робинсона: совпадение 77 % клеток против
 * 69 % у равнопромежуточной. Это приближение для маркера на глобусе: ошибка
 * обычно 1–5°, у мелких островных государств больше. Игровых данных оно не меняет.
 */
const ROBINSON = { cellsPerRadX: 28, cellsPerRadY: 32.25, xAtLon0: 78.05, yAtEquator: 36.63 };
// Таблица проекции Робинсона (X, Y) через 5° широты.
const RX = [1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const RY = [0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1];

function latFromY(Y: number): number {
  const s = Math.sign(Y), a = Math.abs(Y);
  if (a >= 1) return s * 90;
  let i = 0;
  while (i < RY.length - 2 && RY[i + 1]! < a) i++;
  const t = (a - RY[i]!) / (RY[i + 1]! - RY[i]!);
  return s * (i + t) * 5;
}
function xScale(lat: number): number {
  const a = Math.min(90, Math.abs(lat)) / 5;
  const i = Math.min(RX.length - 2, Math.floor(a));
  return RX[i]! + (RX[i + 1]! - RX[i]!) * (a - i);
}

/** Клетка карты WORLD → широта/долгота (центр клетки). */
export function worldCellToLatLon(x: number, y: number): { lat: number; lon: number } {
  const P = ROBINSON;
  const lat = latFromY((P.yAtEquator - (y + 0.5)) / (P.cellsPerRadY * 1.3523));
  const lonRad = (x + 0.5 - P.xAtLon0) / (P.cellsPerRadX * 0.8487 * xScale(lat));
  const lon = ((((lonRad * 180) / Math.PI) + 540) % 360) - 180;
  return { lat, lon };
}

export function rollVM(T: Top): RollVM {
  const S = T.S;
  const B = T.BB();
  const sh: number = T.share(B);
  const at = T.WORLD?.at?.[S.born] as [number, number] | undefined;
  const countries = (T.COUNTRIES ?? []) as Record<string, unknown>[];
  return {
    iso: S.born,
    country: plain(T.placeTag(B)),
    place: S.urban && S.city ? plain(S.city) : plain(T.ruralLbl()),
    urban: !!S.urban,
    placeFull: S.urban && S.city ? plain(T.cityIn(B.ko, S.city)) : plain(T.ruralLbl()) + ', ' + plain(T.placeTag(B)),
    share: plain(T.fmtShare(sh)),
    shareOneIn: sh > 0 ? Math.round(1 / sh) : 0,
    byPopulation: T.UI?.prefs?.mode === 'pop',
    pastYear: S.era === 'past' && typeof S.by === 'number' ? S.by : null,
    coords: Array.isArray(at) && at.length >= 2 ? worldCellToLatLon(at[0], at[1]) : null,
    names: countries.map(c => ({ name: plain(T.placeTag(c)), w: Math.max(0, Number(T.share(c)) || 0) })).filter(n => n.name),
  };
}
