// Типы той части генератора Peepulation, которой пользуется игра (src/ui/peeps/peeps.ts). Сам модуль — копия
// character-art/nemo-peeps/peepulation.js (npm run peeps:sync); этот файл — игры, синхронизация его не трогает.
// Генератор пишет в персонажа и другие поля — игра их не читает.

export type PeepBand = 'baby' | 'child' | 'teen' | 'adult' | 'elder';
export type PeepOrigin = { group: string; profile: string };
export type PeepCharacter = {
  sex: 'f' | 'm';
  skin: number;
  origin?: PeepOrigin | null;
  ageYears?: number;
  state?: { h: number; hl: number };
  dead?: boolean;
  deathH?: number;
  [k: string]: unknown;
};
export type PeepRules = Record<string, unknown>;
export type PeepFrame = { x: number; y: number; w: number; h: number };

export function preload(opts?: { partsRoot?: string; rules?: PeepRules; rulesUrl?: string; cache?: RequestCache }): Promise<void>;
export const RULES: PeepRules | null;
/** Манифест деталей после загрузки; null — детали не загрузились. */
export const V1: unknown;
export function peepsCharacter(sex?: 'f' | 'm', origin?: PeepOrigin, life?: Record<string, unknown>): PeepCharacter;
export function relative(base: PeepCharacter, opts?: { sex?: 'f' | 'm' }): PeepCharacter;
export function originFromGame(o: { group?: string | null; iso?: string | null; ethnic?: string | null }): PeepOrigin;
export function atAge(c: PeepCharacter, band: PeepBand): PeepCharacter;
export const AGES: Record<PeepBand, { label: string; scale: number; head: number }>;
export function heightK(c: PeepCharacter, band: PeepBand): number;
export const GROUND: number;
export function useScale(s: number): void;
export function peepsContent(c: PeepCharacter): string;
export function babyContent(c: PeepCharacter): string;
export const FRAMES: { body: PeepFrame; portrait: PeepFrame };
export function ppCss(): string;
export const ANIM: Record<string, number>;
export function withRandom<T>(rng: () => number, fn: () => T): T;
