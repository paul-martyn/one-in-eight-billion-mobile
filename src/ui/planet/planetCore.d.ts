// Типы логики планеты (planetCore.js — перенос GlobeLive холста, без React).
import type { PointerEvent } from 'react';

/** Общая шина планеты и экранов: счётчики вспышек и события планеты. */
export type PlanetBus = {
  /** Рождения и смерти, показанные планетой с её появления. */
  born: number;
  died: number;
  /** Пойманные лица (обычные и «счастливые»). */
  coins: number;
  gems: number;
  on(fn: (type: string, payload: unknown) => void): () => void;
  emit(type: string, payload?: unknown): void;
};

export type PlanetMode = 'free' | 'hub' | 'roll';

export type PlanetProps = {
  /** Размер холста в единицах макета (кадр 393 × H). */
  width: number;
  height: number;
  /** Центр и диаметр планеты; при смене планета перелетает за moveMs. */
  cx: number;
  cy: number;
  size: number;
  moveMs?: number;
  mode: PlanetMode;
  /** Вспышки: только точки (экран языка) или лица. */
  events?: 'dots' | 'icons';
  /** «Страна,Город» первого броска (ISO или название). */
  fate?: string;
  pinLabel?: string;
  /** Сдвиг вида по вертикали, когда планета приближена к стране. */
  diveY?: number;
  /** host — страницу страны рисует экран, а не планета. */
  page?: 'own' | 'host';
  /** Куда летят пойманные монета и кристалл: «x,y». */
  coinAt?: string;
  gemAt?: string;
  bus?: PlanetBus;
  cmd?: string;
  born?: boolean;
  /** Названия стран на языке игры: { ISO: [название, короткое] }. */
  names?: Record<string, [string, string]> | null;
  /** Масштаб кадра: плотность точек холста = devicePixelRatio × pixelScale. */
  pixelScale?: number;
  /** Планета не видна: кадры не рисуются, вспышки не считаются. */
  asleep?: boolean;
  grid?: 'even' | 'old';
  report?: (type: string, payload: unknown) => void;
};

export type PlanetTip = { on: boolean; name: string; size: string; born: string; died: string; d: string; dive: () => void };

export type PlanetView = {
  w: number;
  h: number;
  label: string;
  setCanvas: (el: HTMLCanvasElement | null) => void;
  setTip: (el: HTMLElement | null) => void;
  setTipPath: (el: SVGPathElement | null) => void;
  down: (e: PointerEvent<HTMLCanvasElement>) => void;
  move: (e: PointerEvent<HTMLCanvasElement>) => void;
  up: (e: PointerEvent<HTMLCanvasElement>) => void;
  cancel: (e: PointerEvent<HTMLCanvasElement>) => void;
  tip: PlanetTip;
};

export class PlanetCore {
  props: PlanetProps;
  /** Вызывается, когда планете нужно перерисовать разметку (карточка страны). */
  onChange: (() => void) | null;
  componentDidMount(): void;
  componentWillUnmount(): void;
  componentDidUpdate(prev: PlanetProps): void;
  renderVals(): PlanetView;
}

export const WORLD_RATES: { born: number; died: number };
