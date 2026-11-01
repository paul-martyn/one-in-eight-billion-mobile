// Ленивая загрузка деталей и очередь сборки людей.
// Манифест (~170 КБ) и атласы (по атласу на тип тела) загружаются только когда
// на экране впервые нужен человек этого типа. Сборка идёт по одному человеку
// за задачу, чтобы не задерживать кадры; результат кэшируется по описанию
// внешности. Ничего здесь не трогает игру: только картинки.
import type { PersonLook } from '../../adapters/vm/appearance';
import { Assembler, bustRect } from './assemble';
import { appearanceFor } from './pick';
import type { Manifest, Rect } from './types';

/** Готовый человек: холст генератора, обрезанный по непрозрачной области. */
export type Figure = {
  canvas: HTMLCanvasElement;
  /** Положение обрезанного холста на полном холсте генератора. */
  ox: number;
  oy: number;
  /** Размер полного холста генератора (все люди в одном масштабе, ноги на нижнем крае). */
  fullW: number;
  fullH: number;
  /** Кадр «голова и плечи» в координатах полного холста. */
  bust: Rect;
};
export type FigureState = { status: 'pending' } | { status: 'ready'; fig: Figure } | { status: 'error' };

const atlasUrls: Record<string, string> = {};
for (const [path, url] of Object.entries(import.meta.glob<string>('../../assets/people/*.png', { query: '?url', import: 'default', eager: true }))) {
  atlasUrls[path.slice(path.lastIndexOf('/') + 1)] = url;
}

let manifestP: Promise<Manifest> | null = null;
const loadManifest = () => (manifestP ??= import('./manifest.json').then(
  m => m.default as unknown as Manifest,
  (e: unknown) => { manifestP = null; throw e; },
));

const images = new Map<string, HTMLImageElement>();
const imageP = new Map<string, Promise<HTMLImageElement>>();
function loadAtlas(name: string, M: Manifest): Promise<HTMLImageElement> {
  const hit = imageP.get(name);
  if (hit) return hit;
  const file = name === 'babies' ? M.babyAtlas : M.bodies[name]?.atlas;
  const url = file ? atlasUrls[file] : undefined;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    if (!url) { reject(new Error(`Нет атласа ${name}`)); return; }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { images.set(name, img); resolve(img); };
    img.onerror = () => reject(new Error(`Атлас ${name} не загрузился`));
    img.src = url;
  });
  // Неудачная загрузка не запоминается: следующий запрос попробует снова.
  p.catch(() => { imageP.delete(name); });
  imageP.set(name, p);
  return p;
}

const MAX_FIGURES = 64;
const entries = new Map<string, FigureState>();
const queue: { key: string; look: PersonLook }[] = [];
const listeners = new Set<() => void>();
let version = 0;
let running = false;
let assembler: Assembler | null = null;

export const lookKey = (l: PersonLook) => `${l.band}|${l.sex}|${l.tone}|${l.seed}`;
export const subscribeFigures = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const figuresVersion = () => version;
export const figureState = (key: string): FigureState | undefined => entries.get(key);

function publish(key: string, state: FigureState): void {
  entries.delete(key);
  entries.set(key, state);
  // Самые старые готовые фигуры вытесняются; ждущие в очереди остаются.
  if (entries.size > MAX_FIGURES) {
    for (const [k, v] of entries) {
      if (entries.size <= MAX_FIGURES) break;
      if (v.status !== 'pending') entries.delete(k);
    }
  }
  version += 1;
  listeners.forEach(l => l());
}

/** Поставить человека в очередь сборки (вызывается из эффектов, не из рендера). */
export function requestFigure(look: PersonLook): void {
  const key = lookKey(look);
  const cur = entries.get(key);
  if (cur) {
    if (cur.status !== 'error') { entries.delete(key); entries.set(key, cur); }
    return;
  }
  entries.set(key, { status: 'pending' });
  queue.push({ key, look });
  if (!running) void pump();
}

const nextTask = () => new Promise<void>(r => setTimeout(r, 0));

/** Обрезать холст по непрозрачной области (ноги остаются на нижнем крае). */
function trimmed(full: HTMLCanvasElement): { canvas: HTMLCanvasElement; ox: number; oy: number } {
  const W = full.width, H = full.height;
  const g = full.getContext('2d', { willReadFrequently: true });
  if (!g) return { canvas: full, ox: 0, oy: 0 };
  const a = g.getImageData(0, 0, W, H).data;
  let x0 = W, x1 = -1, y0 = H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a[(y * W + x) * 4 + 3]! > 8) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
    }
  }
  if (x1 < 0) return { canvas: full, ox: 0, oy: 0 };
  const c = document.createElement('canvas');
  c.width = x1 - x0 + 1;
  c.height = H - y0;
  c.getContext('2d')?.drawImage(full, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return { canvas: c, ox: x0, oy: y0 };
}

async function pump(): Promise<void> {
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      try {
        const M = await loadManifest();
        const app = appearanceFor(job.look, M);
        await loadAtlas(app.band === 'baby' ? 'babies' : app.body, M);
        assembler ??= new Assembler(M, name => images.get(name) ?? null);
        const full = assembler.compose(app);
        const t = trimmed(full);
        publish(job.key, { status: 'ready', fig: { canvas: t.canvas, ox: t.ox, oy: t.oy, fullW: M.canvas.w, fullH: M.canvas.h, bust: bustRect(M, app) } });
      } catch (error) {
        console.warn('[people]', error);
        publish(job.key, { status: 'error' });
      }
      await nextTask();
    }
  } finally {
    running = false;
    assembler?.trim();
  }
}
