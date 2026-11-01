// Фигура во весь рост и портрет «голова и плечи» из генератора персонажей.
// Пока детали грузятся или если сборка не удалась, показывается fallback
// вызывающего (прежняя заглушка — инициал в круге). Анимаций нет.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { PersonLook } from '../../adapters/vm/appearance';
import { useFigure } from './hooks';
import type { Figure } from './store';
import type { Rect } from './types';
import './people.css';

/** Нарисовать область rect (координаты полного холста) в W×H; большое уменьшение — ступенями по 2×. */
function drawCrop(g: CanvasRenderingContext2D, fig: Figure, rect: Rect, W: number, H: number): void {
  let sx = rect[0] - fig.ox, sy = rect[1] - fig.oy, sw = rect[2], sh = rect[3];
  const kx = W / sw, ky = H / sh;
  let dx = 0, dy = 0;
  if (sx < 0) { dx = -sx * kx; sw += sx; sx = 0; }
  if (sy < 0) { dy = -sy * ky; sh += sy; sy = 0; }
  sw = Math.min(sw, fig.canvas.width - sx);
  sh = Math.min(sh, fig.canvas.height - sy);
  if (sw <= 0 || sh <= 0) return;
  const dw = sw * kx, dh = sh * ky;
  let src: HTMLCanvasElement = fig.canvas;
  while (sw > dw * 2 && sh > dh * 2) {
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.ceil(sw / 2));
    t.height = Math.max(1, Math.ceil(sh / 2));
    const tg = t.getContext('2d');
    if (!tg) break;
    tg.imageSmoothingEnabled = true;
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(src, sx, sy, sw, sh, 0, 0, t.width, t.height);
    src = t; sx = 0; sy = 0; sw = t.width; sh = t.height;
  }
  g.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
}

function CropCanvas({ fig, rect, width, height, className }: { fig: Figure; rect: Rect; width: number | null; height: number | null; className: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // Без явного размера холст занимает родителя (100%) и меряет себя.
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null);
  const fixed = width != null && height != null;
  useLayoutEffect(() => {
    const c = ref.current;
    if (fixed || !c) return;
    const read = () => setMeasured(m => (m && m.w === c.clientWidth && m.h === c.clientHeight ? m : { w: c.clientWidth, h: c.clientHeight }));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(c);
    return () => ro.disconnect();
  }, [fixed]);
  const w = fixed ? width : measured?.w ?? 0;
  const h = fixed ? height : measured?.h ?? 0;
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || w <= 0 || h <= 0) return;
    const dpr = Math.min(3, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if (c.width !== W) c.width = W;
    if (c.height !== H) c.height = H;
    const g = c.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    drawCrop(g, fig, rect, W, H);
  }, [fig, rect[0], rect[1], rect[2], rect[3], w, h]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className={className} style={fixed ? { width: width!, height: height! } : undefined} aria-hidden="true" />;
}

/** Полный рост готовой фигуры. height — высота полного холста генератора в CSS px (общий масштаб для всех возрастов). */
export function FigureView({ fig, height, className = '' }: { fig: Figure; height: number; className?: string }) {
  const k = height / fig.fullH;
  const rect: Rect = [fig.ox, fig.oy, fig.canvas.width, fig.canvas.height];
  return <CropCanvas fig={fig} rect={rect} width={fig.canvas.width * k} height={fig.canvas.height * k} className={`pa-figure ${className}`} />;
}

/** Ширина и высота фигуры в CSS px при данном масштабе. */
export const figureSize = (fig: Figure, height: number) => ({ w: (fig.canvas.width * height) / fig.fullH, h: (fig.canvas.height * height) / fig.fullH });

/**
 * Человек во весь рост, ноги на нижнем крае. height — высота полного холста
 * генератора (взрослый мужчина почти во всю высоту, ребёнок ниже).
 */
export function PersonFigure({ look, height, fallback = null, className }: { look: PersonLook | null | undefined; height: number; fallback?: ReactNode; className?: string }) {
  const st = useFigure(look);
  return st?.status === 'ready' ? <FigureView fig={st.fig} height={height} className={className} /> : <>{fallback}</>;
}

/** Готовый портрет «голова и плечи». Без size заполняет родителя; рамку (круг, скругление) задаёт вызывающий. */
export function PortraitView({ fig, size, className = '' }: { fig: Figure; size?: number; className?: string }) {
  return <CropCanvas fig={fig} rect={fig.bust} width={size ?? null} height={size ?? null} className={`pa-portrait ${size == null ? 'pa-fill' : ''} ${className}`} />;
}

export function PersonPortrait({ look, size, fallback = null, className }: { look: PersonLook | null | undefined; size?: number; fallback?: ReactNode; className?: string }) {
  const st = useFigure(look);
  return st?.status === 'ready' ? <PortraitView fig={st.fig} size={size} className={className} /> : <>{fallback}</>;
}
