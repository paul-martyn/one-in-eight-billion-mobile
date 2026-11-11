// Раскладки экранов нового флоу по высоте кадра. Макет нарисован в кадре
// 393 × 852; у телефона кадр по высоте другой (примерно 700–900 единиц), и
// разницу забирают «гибкие» промежутки: сначала отступы, потом планета.
// Одни и те же функции считают и место элементов экрана, и место общей
// планеты под ним (src/flow/PlanetStage.tsx), поэтому они всегда совпадают.
import type { FrameBox } from '../ui/frame/Frame';
import type { ScreenId } from '../flow/flow';

/**
 * Часть колонки: size — размер в макете; min/max — пределы сжатия и роста;
 * tier — очередь сжатия (0 сжимается первой).
 */
type Part = { size: number; min?: number; max?: number; tier?: number };

/** Раскладывает колонку по высоте H: верх и размер каждой части; short — чего не хватило. */
export function stack(H: number, parts: Part[]): { at: number[]; size: number[]; short: number } {
  const size = parts.map(p => p.size);
  let diff = H - size.reduce((a, b) => a + b, 0);
  if (diff < 0) {
    let need = -diff;
    for (const tier of [0, 1, 2, 3]) {
      if (need <= 0) break;
      const caps = parts.map(p => ((p.tier ?? -1) === tier ? Math.max(0, p.size - (p.min ?? p.size)) : 0));
      const total = caps.reduce((a, b) => a + b, 0);
      if (!total) continue;
      const take = Math.min(need, total);
      caps.forEach((cap, i) => { size[i]! -= (take * cap) / total; });
      need -= take;
    }
    diff = -need;
  } else if (diff > 0) {
    // Рост: части с конечным пределом — пропорционально запасу; остаток — «пружинам» (max: Infinity).
    const room = parts.map(p => (p.max != null && Number.isFinite(p.max) ? Math.max(0, p.max - p.size) : 0));
    const springs = parts.map(p => (p.max === Infinity ? 1 : 0));
    const nSprings = springs.reduce<number>((a, b) => a + b, 0);
    const totalRoom = room.reduce((a, b) => a + b, 0);
    // Пружины берут половину прироста, пока у остальных есть запас.
    const toRoom = Math.min(totalRoom, nSprings ? diff / 2 : diff);
    if (totalRoom) room.forEach((r, i) => { size[i]! += (toRoom * r) / totalRoom; });
    const rest = diff - toRoom;
    if (nSprings) springs.forEach((s, i) => { size[i]! += (rest * s) / nSprings; });
    diff = 0;
  }
  const at: number[] = [];
  let y = 0;
  size.forEach(s => { at.push(y); y += s; });
  return { at, size, short: Math.max(0, -diff) };
}

export type Place = { cx: number; cy: number; size: number };
const CX = 196.5;
const round = (n: number) => Math.round(n * 2) / 2;

/**
 * Необязательные части экранов, от которых зависит раскладка: кнопка «Continue …»
 * и строка ожидания энергии под основной кнопкой, пояснение на экране языка.
 */
export type Extras = { resume?: boolean; noEnergy?: boolean; langNote?: boolean };
const belowHeight = (b: Extras) => (b.resume ? 54 : 0) + (b.noEnergy ? 40 : 0);

type SnapLike = { lifePhase: string; resume: unknown; pastLives: { length: number }; meta: { canStartLife: boolean } | null };
let lastExtras: Extras = {};
/**
 * Необязательные части по снимку игры. Пока новая жизнь только что начата
 * (экран уходит к рулетке), раскладка не меняется: возвращается прежнее значение.
 */
export function extrasOf(snap: SnapLike): Extras {
  if (snap.lifePhase === 'birth') return lastExtras;
  const next: Extras = { resume: !!snap.resume, noEnergy: !!snap.meta && !snap.meta.canStartLife, langNote: snap.pastLives.length > 0 || !!snap.resume };
  if (next.resume !== lastExtras.resume || next.noEnergy !== lastExtras.noEnergy || next.langNote !== lastExtras.langNote) lastExtras = next;
  return lastExtras;
}

/** «1 · Start»: заголовок, планета 280, облачко, счётчики, Be Born! (StartCute). */
export function layStart(f: FrameBox, extras: Extras = {}) {
  const p = stack(f.H, [
    { size: 58, min: Math.max(14, f.top + 8), max: 96, tier: 0 },
    { size: 70 },
    { size: 22, min: 6, max: 30, tier: 0 },
    { size: 280, min: 200, tier: 2 },
    { size: 4 },
    { size: 86 },
    { size: 18, min: 10, max: 24, tier: 1 },
    { size: 106 },
    { size: 54, min: 16, max: 90, tier: 0 },
    { size: 70 },
    { size: belowHeight(extras) },
    { size: 84, min: 18 + f.bottom, max: Infinity, tier: 0 },
  ]);
  return {
    title: round(p.at[1]!),
    planet: { cx: CX, cy: round(p.at[3]! + p.size[3]! / 2), size: round(p.size[3]!) } as Place,
    say: round(p.at[5]!),
    since: round(p.at[7]!),
    cta: round(p.at[9]!),
    below: round(p.at[10]!),
  };
}

/** Высота нижнего меню хаба: вкладки-папки над полосой. */
export const HUB_NAV_H = 124;

/** «9 · Hub»: шестерёнка и плашки, планета 280, облачко, счётчики, Be Born!, меню (HubCute). */
export function layHub(f: FrameBox, extras: Extras = {}) {
  const parts = (say: boolean): Part[] => [
    { size: 46, min: Math.max(10, f.top + 6), max: 60, tier: 0 },
    { size: 46 },
    { size: 16, min: 10, max: 24, tier: 0 },
    { size: 280, min: 196, tier: 2 },
    { size: say ? 4 : 0 },
    { size: say ? 86 : 0 },
    { size: 18, min: 8, max: 24, tier: 1 },
    { size: 106 },
    { size: 34, min: 12, max: 60, tier: 0 },
    { size: 70 },
    { size: belowHeight(extras) },
    { size: 22, min: 10, max: Infinity, tier: 0 },
    { size: HUB_NAV_H + f.bottom },
  ];
  // Если места не хватает даже с самой маленькой планетой, облачко уступает место.
  let say = true;
  let p = stack(f.H, parts(true));
  if (p.short > 0) { say = false; p = stack(f.H, parts(false)); }
  return {
    bar: round(p.at[1]!),
    planet: { cx: CX, cy: round(p.at[3]! + p.size[3]! / 2), size: round(p.size[3]!) } as Place,
    say: say ? round(p.at[5]!) : null,
    since: round(p.at[7]!),
    cta: round(p.at[9]!),
    below: round(p.at[10]!),
    /** Верх области вкладок Lives / Shop (под плашками) и её низ (над меню). */
    panelTop: round(p.at[2]! + 8),
    panelBottom: HUB_NAV_H + f.bottom - 46,
  };
}

/** «0 · Language»: планета 210, «Привет!», 19 языков в три колонки, Continue (LangCute). */
export function layLanguage(f: FrameBox, extras: Extras = {}) {
  const p = stack(f.H, [
    { size: 58, min: Math.max(12, f.top + 6), max: 84, tier: 0 },
    { size: 210, min: 150, tier: 2 },
    { size: 12, min: 4, max: 18, tier: 1 },
    { size: 88 },
    { size: 16, min: 8, max: 22, tier: 1 },
    { size: 288 },
    { size: 26, min: 12, max: 48, tier: 0 },
    { size: extras.langNote ? 36 : 0 },
    { size: 70 },
    { size: 84, min: 16 + f.bottom, max: Infinity, tier: 0 },
  ]);
  return {
    top: round(p.at[1]!),
    planet: { cx: CX, cy: round(p.at[1]! + p.size[1]! / 2), size: round(p.size[1]!) } as Place,
    hello: round(p.at[3]!),
    chips: round(p.at[5]!),
    note: round(p.at[7]!),
    cta: round(p.at[8]!),
  };
}

/** Экраны, под которыми живёт общая планета. */
export const PLANET_SCREENS: ReadonlySet<ScreenId> = new Set<ScreenId>(['language', 'start', 'hub']);
export const hasPlanet = (id: ScreenId) => PLANET_SCREENS.has(id);

/** Место планеты под экраном. */
export function planetPlace(id: ScreenId, f: FrameBox, extras: Extras): Place {
  if (id === 'language') return layLanguage(f, extras).planet;
  if (id === 'hub') return layHub(f, extras).planet;
  return layStart(f, extras).planet;
}
